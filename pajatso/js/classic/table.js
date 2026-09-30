// The table both Pajatso pages stand at: the lever under a thumb, a key and a
// pad; the HUD's toasts, floating numbers and first-time lines; the arcade's
// corner; the language switch; pause, sound and the frame loop. The base
// machine (main.js) and KUOPPA (../kuoppa/main.js) each mount one and bring
// only what is theirs — the rules, the events, the sheets between rounds.

import { t, mk, getLang, setLang, LANGS } from './lang.js?v=11';
import { sfx, initAudio, setMuted, isMuted, roll } from '../audio.js?v=11';
import { BOARD } from '../board.js?v=11';
import { watchPad } from '../../../hub/pad.js?v=9';   // the SAME token shell.js asks for: one reader on the page

export const params = new URLSearchParams(location.search);
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: nothing kept */ } },
};
export const $ = id => document.getElementById(id);
export const buzz = p => { try { if (!isMuted() && navigator.vibrate) navigator.vibrate(p); } catch { /* not a phone */ } };
export const seedFrom = () => (params.get('seed') ? Number(params.get('seed')) : Date.now() % 1e9) >>> 0;

// o: { game(): the machine now, view, tips: {id: key}, tipVars(): {}, words(): {} for data-i,
//      onEvent(ev), hud(), onBegin(), blocked(): an overlay owns the input,
//      padPress(i): true if it took the button, key(ev): true if it took the key,
//      onRelease(p, pulled) }
export function mountTable(o) {
  const view = o.view;
  const game = () => o.game();
  setMuted(store.get('pajatso.muted', false));
  $('mute').textContent = isMuted() ? '×' : '♪';

  const st = {
    started: params.has('skip'), paused: false,
    power: 0,                   // where the knob is, 0..1
    pulling: null,              // 'touch' | 'key' | 'pad' | 'trigger'
    lastPull: store.get('pajatso.last', null),
    time: 0,
    // THE LEVER'S MEMORY: the last pulls, each a dot beside the slot at the
    // power it was pulled at, coloured by what that coin did. A spring this
    // loose has no honest "this spot is that window" — so the lever shows you
    // where YOUR pulls went, and the map is the one you draw yourself.
    marks: store.get(o.marksKey ?? 'pajatso.marks', []),
    marksDirty: true,
  };
  const MARKS = 14;
  const saveMarks = () => { st.marksDirty = true; store.set(o.marksKey ?? 'pajatso.marks', st.marks); };
  const live = () => st.started && !st.paused && !o.blocked?.();

  // ── first-time lines: each once per browser, never twice ─────────────
  const seen = new Set(store.get('pajatso.tips', []));
  let tipTimer = 0;
  function tip(id) {
    if (seen.has(id) || !st.started) return;
    seen.add(id); store.set('pajatso.tips', [...seen]);
    const el = $('tip');
    el.innerHTML = `${t(o.tips[id], o.tipVars?.() ?? {})}<span class="x">${t('close')}</span>`;
    el.hidden = false;
    tipTimer = 9;
  }
  $('tip').addEventListener('pointerup', () => { $('tip').hidden = true; });

  // ── the lever ─────────────────────────────────────────────────────────
  const lever = $('lever');
  function drawLever() {
    const r = lever.getBoundingClientRect();
    const span = Math.max(1, r.height - 80);
    lever.querySelector('.knob').style.top = `${40 + st.power * span}px`;
    lever.querySelector('.fill').style.height = `${st.power * span}px`;
    const gh = lever.querySelector('.ghost');
    if (st.lastPull != null) { gh.hidden = false; gh.style.top = `${40 + st.lastPull * span}px`; }
    if (st.marksDirty || st.marksSpan !== span) {
      st.marksDirty = false; st.marksSpan = span;
      const box = lever.querySelector('.marks');
      box.replaceChildren(...st.marks.map((m, i) => {
        const d = document.createElement('i');
        d.className = `m ${m.r ?? 'wait'}`;
        d.style.top = `${40 + m.p * span}px`;
        d.style.opacity = String(0.3 + 0.7 * ((i + 1) / st.marks.length));
        return d;
      }));
    }
    lever.setAttribute('aria-valuenow', String(Math.round(st.power * 100)));
    lever.classList.toggle('busy', !game().canPull);
    for (const [id, v] of [['pow', `${Math.round(st.power * 100)}%`], ['last', st.lastPull == null ? '—' : `${Math.round(st.lastPull * 100)}%`]]) { const el = $(id); if (el) el.textContent = v; }
    // before the first pull of a visit, a knob that has sat still a few
    // seconds tugs itself down: this is the way it goes
    lever.classList.toggle('hint', st.started && !st.paused && !st.pulledOnce && st.power === 0 && st.time - (st.beganAt ?? 0) > 4);
    view.lever = st.power;
  }
  function release(p) {
    if (!live()) return;
    initAudio();
    const pulled = game().pull(p);
    if (pulled) {
      st.pulledOnce = true;
      // a first-time line gives way to the coin it was about
      if (tipTimer > 0) { tipTimer = Math.min(tipTimer, 1.2); }
      st.lastPull = p; store.set('pajatso.last', p);
      st.marks.push({ p: Math.round(p * 1000) / 1000, r: null });
      while (st.marks.length > MARKS) st.marks.shift();
      saveMarks();
      view.clearMark?.();
      if (p > 0.8) setTimeout(() => tip('right'), 1500);
    }
    o.onRelease?.(p, pulled);
    st.power = 0;
  }

  let touchStart = null;
  lever.addEventListener('pointerdown', ev => {
    if (!live()) return;
    ev.preventDefault();
    touchStart = { y: ev.clientY, t: performance.now(), moved: false, id: ev.pointerId };
    st.pulling = 'touch';
    try { lever.setPointerCapture(ev.pointerId); } catch { /* a capture can throw; the press still counts */ }
    initAudio();
  });
  lever.addEventListener('pointermove', ev => {
    if (st.pulling !== 'touch' || !touchStart) return;
    const r = lever.getBoundingClientRect();
    if (Math.abs(ev.clientY - touchStart.y) > 6) touchStart.moved = true;
    if (!touchStart.moved) return;
    // the knob starts at the top: where the finger is IS the pull
    st.power = Math.max(0, Math.min(1, (ev.clientY - r.top - 40) / Math.max(1, r.height - 80)));
    if (st.power > 0.02 && Math.random() < 0.3) sfx.windmill();
  });
  lever.addEventListener('pointerup', () => {
    if (st.pulling !== 'touch' || !touchStart) return;
    const moved = touchStart.moved;
    touchStart = null; st.pulling = null;
    if (moved) release(st.power);
    else if (st.lastPull != null) release(st.lastPull);        // a tap: the same pull again
    else { st.power = 0; tip('pull'); }
  });
  lever.addEventListener('pointercancel', () => { touchStart = null; st.pulling = null; st.power = 0; });

  // THE NUDGE: a tap on the machine while a coin is out on the face shoves it
  // toward the finger; ← → do the same from a keyboard, LB / RB from a pad
  function nudgeToward(sx, sy) {
    const c = game().board.coins[0];
    if (!c || !live()) return false;
    const [cx, cy] = view.toScreen(c.x, c.y);
    if (game().nudge(sx - cx, cy - sy)) { buzz(18); return true; }
    return false;
  }
  function nudgeSide(dir) { if (live()) game().nudge(dir, 0.35); }
  $('gl').addEventListener('pointerdown', ev => { if (nudgeToward(ev.clientX, ev.clientY)) ev.preventDefault(); });

  // keys: hold SPACE (or ↓) to pull, let go to fire; ENTER pulls the same again
  addEventListener('keydown', ev => {
    if (ev.key === 'Escape' || ev.key === 'p' || ev.key === 'P') { togglePause(); return; }
    if (ev.key === 'm' || ev.key === 'M') { toggleMute(); return; }
    if (o.key?.(ev)) return;
    if (!st.started || st.paused) { if (ev.key === 'Enter' && !st.started) begin(); return; }
    if (o.blocked?.()) return;
    if ((ev.key === ' ' || ev.key === 'ArrowDown') && !ev.repeat) { ev.preventDefault(); st.pulling = 'key'; st.power = 0; initAudio(); }
    if ((ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') && !ev.repeat) { ev.preventDefault(); nudgeSide(ev.key === 'ArrowLeft' ? -1 : 1); }
    if (ev.key === 'Enter' && st.lastPull != null) { ev.preventDefault(); release(st.lastPull); }
  });
  addEventListener('keyup', ev => {
    if ((ev.key === ' ' || ev.key === 'ArrowDown') && st.pulling === 'key') { st.pulling = null; release(st.power); }
  });

  // the pad: hold A to pull and let go, or squeeze RT like the lever itself;
  // Y pulls the same again; Start pauses (a HOLD on Start is the shell's way home)
  let trigPeak = 0;
  watchPad({
    press(i) {
      if (!st.started) { if (i === 0 || i === 9) begin(); return; }
      if (i === 9) { togglePause(); return; }
      if (st.paused) { if (i === 0) resume(); return; }
      if (o.padPress?.(i)) return;
      if (o.blocked?.()) return;
      if (i === 0) { st.pulling = 'pad'; st.power = 0; initAudio(); }
      if (i === 3 && st.lastPull != null) release(st.lastPull);
      if (i === 4 || i === 5) nudgeSide(i === 4 ? -1 : 1);
    },
    release(i) { if (i === 0 && st.pulling === 'pad') { st.pulling = null; release(st.power); } },
  });
  function pollTrigger() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const v = p.buttons[7]?.value ?? 0;
      if (v > 0.06 && live()) { st.pulling = 'trigger'; st.power = v; trigPeak = Math.max(trigPeak, v); }
      else if (st.pulling === 'trigger' && v <= 0.06) { st.pulling = null; release(trigPeak); trigPeak = 0; }
      return;
    }
  }

  // ── the HUD's voices ──────────────────────────────────────────────────
  let toastT = 0;
  function toast(text, sub = '', cls = '', ms = 1400) {
    const el = $('toast');
    el.className = `show ${cls}`;
    el.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
    toastT = ms / 1000;
  }
  function pop(x, y, text, cls = '') {
    const [sx, sy] = view.toScreen(x, y);
    const p = document.createElement('div'); p.className = `pop ${cls}`; p.textContent = text;
    p.style.left = `${sx}px`; p.style.top = `${sy}px`;
    $('pops').appendChild(p); setTimeout(() => p.remove(), 1300);
  }

  // The arcade's corner: HOME and, under a thumb, Toko beside it. Measured.
  function corner() {
    let right = 0;
    for (const b of document.querySelectorAll('.arcade-home, .arcade-toko')) {
      const r = b.getBoundingClientRect();
      if (r.width && r.top < 90) right = Math.max(right, r.right);
    }
    if (right) document.documentElement.style.setProperty('--corner', `${Math.ceil(right) + 12}px`);
    else document.documentElement.style.removeProperty('--corner');
  }
  new MutationObserver(corner).observe(document.body, { childList: true });
  addEventListener('toko:seat', () => requestAnimationFrame(corner));

  // What the HUD covers, handed to the view so the machine fits the rest.
  function layout() {
    const wide = innerWidth / innerHeight >= 1.1;
    document.body.classList.toggle('wide', wide);
    document.body.classList.toggle('tall', !wide);
    const top = $('top').getBoundingClientRect().bottom + 6;
    const pr = $('panel').getBoundingClientRect();
    if (wide) view.setInsets(top, 8, innerWidth - pr.left + 8, 0);
    // upright the purse floats over the case's top — unless something up there
    // has to be read (KUOPPA's reels), and then the machine starts under it
    else view.setInsets(o.clearTop ? top : 0, innerHeight - pr.top + 6, 0, 0);
  }
  addEventListener('resize', () => { view.resize(); corner(); layout(); });

  // ── the words ─────────────────────────────────────────────────────────
  function applyLang() {
    document.documentElement.lang = getLang();
    const vars = o.words?.() ?? {};
    for (const el of document.querySelectorAll('[data-i]')) el.innerHTML = t(el.dataset.i, vars);
    for (const el of document.querySelectorAll('[data-il]')) el.setAttribute('aria-label', t(el.dataset.il));
    for (const box of document.querySelectorAll('.langs')) {
      box.replaceChildren(...LANGS.map(([code, label]) => {
        const b = document.createElement('button');
        b.textContent = label; b.lang = code; b.dataset.lang = code;
        b.setAttribute('aria-pressed', String(code === getLang()));
        b.addEventListener('click', () => { setLang(code); applyLang(); o.onLang?.(); });
        return b;
      }));
    }
  }
  applyLang();

  // ── start, pause, sound ───────────────────────────────────────────────
  let wake = null;
  async function stayAwake() { try { if (!wake && navigator.wakeLock) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener?.('release', () => { wake = null; }); } } catch { wake = null; } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && st.started) stayAwake(); });
  function begin() {
    st.started = true; st.beganAt = st.time; $('title').hidden = true;
    initAudio(); stayAwake();
    setTimeout(() => tip('pull'), 400);
    o.onBegin?.();
  }
  $('start').addEventListener('click', begin);
  if (st.started) $('title').hidden = true;
  function pause() { if (!st.started) return; st.paused = true; st.pulling = null; st.power = 0; $('paused').hidden = false; $('resume').focus(); }
  function resume() { st.paused = false; $('paused').hidden = true; }
  function togglePause() { st.paused ? resume() : pause(); }
  function toggleMute() { setMuted(!isMuted()); store.set('pajatso.muted', isMuted()); $('mute').textContent = isMuted() ? '×' : '♪'; }
  $('pause').addEventListener('click', togglePause);
  $('mute').addEventListener('click', toggleMute);
  $('resume').addEventListener('click', resume);

  // ── the loop ──────────────────────────────────────────────────────────
  // what each coin did, for the lever's memory and the arrow over the row
  function result(ev) {
    const m = st.marks[st.marks.length - 1];
    let r = null, x = ev.x;
    if (ev.t === 'win') r = ev.kind === 'potti' ? 'potti' : ev.kind === 'R' ? 'back' : 'win';
    else if (ev.t === 'lost' || ev.t === 'tilt') r = 'pot';
    else if ((ev.t === 'foul' || ev.t === 'returned') && m && m.r == null) { st.marks.pop(); saveMarks(); return; }
    if (!r) return;
    if (x != null) view.mark?.(x, r);
    if (m && m.r == null) { m.r = r; saveMarks(); }
  }
  const drain = () => { for (const ev of game().drain()) { result(ev); o.onEvent(ev); } };
  // every coin that lands in the tray is heard, and under a thumb felt
  view.onLand = small => { sfx.tray(small); buzz(small ? 4 : 6); };
  // a coin hitting the top of a full stack and bouncing on to the next
  view.onBounce = () => sfx.clack(14);
  // the coin on the rail: one held voice following its speed
  const { C, R } = BOARD;
  function rolling() {
    const c = game().board.coins[0];
    if (!c || st.paused) return roll(0);
    const d = Math.hypot(c.x - C.x, c.y - C.y);
    const onArc = c.y > C.y - 2 && Math.abs(d - (R - c.r)) < 0.5;
    const inLane = c.x < -game().L.Rin;
    roll(onArc || inLane ? Math.hypot(c.vx, c.vy) : 0);
  }
  let lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    pollTrigger();
    if (!st.paused) {
      st.time += dt;
      // a held key or button pulls the lever down at a steady rate
      if ((st.pulling === 'key' || st.pulling === 'pad') && game().canPull) st.power = Math.min(1, st.power + dt * 0.75);
      game().update(dt);
      drain();
    }
    rolling();
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
    if (tipTimer > 0) { tipTimer -= dt; if (tipTimer <= 0) $('tip').hidden = true; }
    layout();
    drawLever();
    o.hud();
    view.update(game(), dt, st.time);
    view.render();
  }
  corner();
  layout();
  requestAnimationFrame(frame);

  return {
    st, tip, toast, pop, begin, pause, resume, applyLang, release, nudgeToward, nudgeSide,
    // run the machine forward without waiting for frames (the gates)
    advance(s) { const step = 1 / 30; for (let x = 0; x < s; x += step) { game().update(step); drain(); } },
    setLang(l) { setLang(l); applyLang(); o.onLang?.(); },
  };
}

export { t, mk, sfx, initAudio };
