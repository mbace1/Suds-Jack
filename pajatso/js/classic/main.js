// PAJATSO — the classic machine: boot, the loop, the lever, and the wiring
// between the game (rules and physics), the view (the machine on a wall), the
// HUD and the speakers.

import { Pajatso, START_COINS } from './game.js?v=3';
import { View } from './view.js?v=3';
import { JACKPOT } from './layout.js?v=3';
import { t, mk, getLang, setLang, LANGS } from './lang.js?v=3';
import { sfx, initAudio, setMuted, isMuted } from '../audio.js?v=3';
import { watchPad } from '../../../hub/pad.js?v=9';   // the SAME token shell.js asks for: one reader on the page

const params = new URLSearchParams(location.search);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: nothing kept */ } },
};
const BEST = 'pajatso.best';
const $ = id => document.getElementById(id);
const buzz = p => { try { if (!isMuted() && navigator.vibrate) navigator.vibrate(p); } catch { /* not a phone */ } };

const seed = () => (params.get('seed') ? Number(params.get('seed')) : Date.now() % 1e9) >>> 0;
let game = new Pajatso({ seed: seed() });
const view = new View($('gl'), game.L);
setMuted(store.get('pajatso.muted', false));
$('mute').textContent = isMuted() ? '×' : '♪';

let started = params.has('skip'), paused = false;
let best = store.get(BEST, 0);
let power = 0;                 // where the knob is, 0..1
let pulling = null;            // what is holding the lever: 'touch' | 'key' | 'pad' | 'trigger'
let lastPull = store.get('pajatso.last', null);

// ── first-time lines: each one once per browser, never twice ────────────
const seen = new Set(store.get('pajatso.tips', []));
const TIPS = { pull: 'tipPull', windows: 'tipWindows', again: 'tipAgain', potti: 'tipPotti', right: 'tipRight' };
let tipTimer = 0;
function tip(id) {
  if (seen.has(id) || !started) return;
  seen.add(id); store.set('pajatso.tips', [...seen]);
  const el = $('tip');
  el.innerHTML = `${t(TIPS[id], { n: mk(game.pottiNow) })}<span class="x">${t('close')}</span>`;
  el.hidden = false;
  tipTimer = 9;
}
$('tip').addEventListener('pointerup', () => { $('tip').hidden = true; });

// ── the lever ──────────────────────────────────────────────────────────
const lever = $('lever');
function drawLever() {
  const r = lever.getBoundingClientRect();
  const span = Math.max(1, r.height - 80);
  lever.querySelector('.knob').style.top = `${40 + power * span}px`;
  lever.querySelector('.fill').style.height = `${power * span}px`;
  const gh = lever.querySelector('.ghost');
  if (lastPull != null) { gh.hidden = false; gh.style.top = `${40 + lastPull * span}px`; }
  lever.setAttribute('aria-valuenow', String(Math.round(power * 100)));
  lever.classList.toggle('busy', !game.canPull);
  $('pow').textContent = `${Math.round(power * 100)}%`;
  $('last').textContent = lastPull == null ? '—' : `${Math.round(lastPull * 100)}%`;
  view.lever = power;
}
function release(p) {
  if (!started || paused) return;
  initAudio();
  if (game.pull(p)) {
    lastPull = p; store.set('pajatso.last', p);
    if (p > 0.8) setTimeout(() => tip('right'), 1500);
  } else if (game.phase === 'broke') showBroke();
  power = 0;
}

let touchStart = null;
lever.addEventListener('pointerdown', ev => {
  if (!started || paused) return;
  ev.preventDefault();
  touchStart = { y: ev.clientY, t: performance.now(), moved: false, id: ev.pointerId };
  pulling = 'touch';
  try { lever.setPointerCapture(ev.pointerId); } catch { /* a capture can throw; the press still counts */ }
  initAudio();
});
lever.addEventListener('pointermove', ev => {
  if (pulling !== 'touch' || !touchStart) return;
  const r = lever.getBoundingClientRect();
  const dy = ev.clientY - touchStart.y;
  if (Math.abs(dy) > 6) touchStart.moved = true;
  if (!touchStart.moved) return;
  // the knob starts at the top: where the finger is IS the pull
  power = Math.max(0, Math.min(1, (ev.clientY - r.top - 40) / Math.max(1, r.height - 80)));
  if (power > 0.02 && Math.random() < 0.3) sfx.windmill();
});
const letGo = ev => {
  if (pulling !== 'touch' || !touchStart) return;
  const moved = touchStart.moved;
  touchStart = null; pulling = null;
  if (moved) release(power);
  else if (lastPull != null) release(lastPull);        // a tap: the same pull again
  else { power = 0; tip('pull'); }
};
lever.addEventListener('pointerup', letGo);
lever.addEventListener('pointercancel', () => { touchStart = null; pulling = null; power = 0; });

// keys: hold SPACE (or ↓) to pull, let go to fire; ENTER pulls the same again
addEventListener('keydown', ev => {
  if (ev.key === 'Escape' || ev.key === 'p' || ev.key === 'P') { togglePause(); return; }
  if (ev.key === 'm' || ev.key === 'M') { toggleMute(); return; }
  if (!started || paused) { if (ev.key === 'Enter' && !started) begin(); return; }
  if ((ev.key === ' ' || ev.key === 'ArrowDown') && !ev.repeat) { ev.preventDefault(); pulling = 'key'; power = 0; initAudio(); }
  if (ev.key === 'Enter' && lastPull != null) { ev.preventDefault(); release(lastPull); }
});
addEventListener('keyup', ev => {
  if ((ev.key === ' ' || ev.key === 'ArrowDown') && pulling === 'key') { pulling = null; release(power); }
});

// the pad: hold A to pull and let go, or squeeze RT like the lever itself;
// Y pulls the same again; Start pauses (a HOLD on Start is the shell's way home)
let trigPeak = 0;
watchPad({
  press(i) {
    if (!started) { if (i === 0 || i === 9) begin(); return; }
    if (i === 9) { togglePause(); return; }
    if (paused) { if (i === 0) resume(); return; }
    if ($('broke').hidden === false) { if (i === 0) refill(); return; }
    if (i === 0) { pulling = 'pad'; power = 0; initAudio(); }
    if (i === 3 && lastPull != null) release(lastPull);
  },
  release(i) { if (i === 0 && pulling === 'pad') { pulling = null; release(power); } },
});
function pollTrigger() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) {
    if (!p || !p.connected) continue;
    const v = p.buttons[7]?.value ?? 0;
    if (v > 0.06 && started && !paused) { pulling = 'trigger'; power = v; trigPeak = Math.max(trigPeak, v); }
    else if (pulling === 'trigger' && v <= 0.06) { pulling = null; release(trigPeak); trigPeak = 0; }
    return;
  }
}

// ── the HUD ────────────────────────────────────────────────────────────
function hud() {
  $('coins').querySelector('b').textContent = mk(game.coins);
  $('pot').querySelector('b').textContent = mk(game.pottiNow);
  if (game.coins > best) { best = game.coins; store.set(BEST, best); }
  $('best').querySelector('b').textContent = mk(best);
}
let toastT = 0;
function toast(text, sub = '', cls = '', ms = 1400) {
  const t = $('toast');
  t.className = `show ${cls}`;
  t.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
  toastT = ms / 1000;
}
function pop(x, y, text) {
  const [sx, sy] = view.toScreen(x, y);
  const p = document.createElement('div'); p.className = 'pop'; p.textContent = text;
  p.style.left = `${sx}px`; p.style.top = `${sy}px`;
  $('pops').appendChild(p); setTimeout(() => p.remove(), 1300);
}

// The arcade's corner: HOME and, under a thumb, Toko beside it. Measured, the
// lesson v1 paid for on the live site.
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
  // upright, the coin count floats over the sign rather than pushing the face down
  else view.setInsets(0, innerHeight - pr.top + 6, 0, 0);
}
addEventListener('resize', () => { view.resize(); corner(); layout(); });

// ── what happened in the machine, as sound and light ───────────────────
function onEvent(ev) {
  switch (ev.t) {
    case 'insert': sfx.clink(); break;
    case 'launch': sfx.launch(); buzz(8); break;
    case 'tick': sfx.tick(ev.v, ev.x); break;
    case 'rattle': sfx.rattle(); break;
    case 'win': {
      view.pop(ev.cup); view.catch(ev.x, ev.y);
      // the POTTI's column coins spill out of the pot on their own; the rest
      // of any win comes down the chute
      view.payout(Math.ceil(ev.pay - ev.column));
      pop(ev.x, ev.y + 2, ev.kind === 'R' ? 'R' : `+${mk(ev.pay)}`);
      for (let i = 0; i < Math.min(Math.ceil(ev.pay), 14); i++) setTimeout(() => sfx.spill(1), 300 + i * 80);
      if (ev.kind === JACKPOT) { sfx.fever(); buzz([60, 40, 60, 40, 120]); toast(t('pottiToast'), t('pottiSub', { n: mk(ev.pay) }), 'star', 2800); }
      else if (ev.kind === 'R') { sfx.beep(); buzz(16); }
      else { sfx.win(ev.pay > 1 ? 'bell' : 'cherry'); buzz(24); }
      break;
    }
    case 'lost': sfx.miss(); if (ev.kept) view.toPot(ev.column, ev.height); break;
    case 'foul': sfx.foul(); toast(t('foul'), t('foulSub'), '', 1600); break;
    case 'returned': sfx.beep(); toast(t('returned'), t('returnedSub'), '', 1400); break;
    case 'ready': if (game.stats.shots === 1) tip('windows'); else if (game.stats.shots === 3) tip('again'); else if (game.stats.shots === 6) tip('potti'); break;
    case 'broke': setTimeout(showBroke, 900); break;
  }
}

function showBroke() {
  if (!$('broke').hidden || game.phase !== 'broke') return;
  const s = game.stats;
  $('brokeSheet').innerHTML = `
    <h1 style="font-size:clamp(40px, 11vw, 64px)">${t('broke')}</h1>
    <div class="sub">${t('brokeSub')}</div>
    <div class="stats">
      <span>${t('sPulls')} <b>${s.shots}</b></span><span>${t('sWon')} <b>${mk(s.won)}</b></span>
      <span>${t('sBiggest')} <b>${mk(s.biggest)}</b></span><span>${t('sPeak')} <b>${mk(s.peak)}</b></span>
      <span>${t('sPotti')} <b>${s.pottis}</b></span><span>${t('sBack')} <b>${s.backs}</b></span>
    </div>
    <p>${t('yourBest', { n: mk(best) })}</p>
    <div class="btns">
      <button class="big" id="more">${t('more', { n: START_COINS })}</button>
      <a class="big alt" href="pit.html">${t('kuoppaShort')}</a>
    </div>`;
  $('broke').hidden = false;
  $('more').addEventListener('click', refill);
  $('more').focus();
}
function refill() {
  game.refill();
  view.clearTray();
  $('broke').hidden = true;
  hud();
}

// ── the words, in the language chosen ─────────────────────────────────
function applyLang() {
  document.documentElement.lang = getLang();
  for (const el of document.querySelectorAll('[data-i]')) el.innerHTML = t(el.dataset.i, { n: START_COINS });
  for (const el of document.querySelectorAll('[data-il]')) el.setAttribute('aria-label', t(el.dataset.il));
  for (const box of document.querySelectorAll('.langs')) {
    box.replaceChildren(...LANGS.map(([code, label]) => {
      const b = document.createElement('button');
      b.textContent = label; b.lang = code; b.dataset.lang = code;
      b.setAttribute('aria-pressed', String(code === getLang()));
      b.addEventListener('click', () => { setLang(code); applyLang(); });
      return b;
    }));
  }
}
applyLang();

// ── start, pause, sound ────────────────────────────────────────────────
let wake = null;
async function stayAwake() { try { if (!wake && navigator.wakeLock) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener?.('release', () => { wake = null; }); } } catch { wake = null; } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && started) stayAwake(); });
function begin() {
  started = true; $('title').hidden = true;
  initAudio(); stayAwake();
  setTimeout(() => tip('pull'), 400);
}
$('start').addEventListener('click', begin);
if (started) $('title').hidden = true;
function pause() { if (!started) return; paused = true; pulling = null; power = 0; $('paused').hidden = false; $('resume').focus(); }
function resume() { paused = false; $('paused').hidden = true; }
function togglePause() { paused ? resume() : pause(); }
function toggleMute() { setMuted(!isMuted()); store.set('pajatso.muted', isMuted()); $('mute').textContent = isMuted() ? '×' : '♪'; }
$('pause').addEventListener('click', togglePause);
$('mute').addEventListener('click', toggleMute);
$('resume').addEventListener('click', resume);
$('restart').addEventListener('click', () => {
  game = new Pajatso({ seed: seed() + Math.floor(Math.random() * 1e6) });
  view.L = game.L; view.clearTray(); view.shown = null; resume(); hud();
});

// ── the loop ───────────────────────────────────────────────────────────
let lastT = performance.now(), time = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  pollTrigger();
  if (!paused) {
    time += dt;
    // a held key or button pulls the lever down at a steady rate
    if ((pulling === 'key' || pulling === 'pad') && game.canPull) power = Math.min(1, power + dt * 0.75);
    game.update(dt);
    for (const ev of game.drain()) onEvent(ev);
  }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  if (tipTimer > 0) { tipTimer -= dt; if (tipTimer <= 0) $('tip').hidden = true; }
  layout();
  drawLever();
  hud();
  view.update(game, dt, time);
  view.render();
}
corner();
layout();
requestAnimationFrame(frame);

// ── the seam the browser gate drives ───────────────────────────────────
window.__pj = {
  get game() { return game; },
  view,
  pause, resume,
  get paused() { return paused; },
  get started() { return started; },
  get power() { return power; },
  get lastPull() { return lastPull; },
  debug: {
    begin,
    pull: p => release(p),
    // run the machine forward without waiting for frames
    advance(s) { const step = 1 / 30; for (let t = 0; t < s; t += step) { game.update(step); for (const ev of game.drain()) onEvent(ev); } },
    setCoins(n) { game.coins = n; if (n >= 1 && game.phase === 'broke') game.phase = 'idle'; },
    setLang(l) { setLang(l); applyLang(); },
  },
};
