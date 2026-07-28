// TOKO MIDORI GAMES — the counter.
//
// A slim bar that sits at the top of the arcade and, when you click it, opens
// into a conversation with Toko in the old Sierra idiom: a portrait on the
// left, text that types itself out, and a numbered list of things you are
// allowed to say. Police Quest at the front desk.
//
// One line to mount it:
//
//   <script type="module">
//     import { mountChat } from './toko/js/chat.js';
//     mountChat(document.querySelector('header'));   // inserted after it
//   </script>
//
// Self-contained on purpose — it injects its own styles, scoped under
// `.toko-chat`, reading the brand's custom properties where a page has set
// them and falling back to literals where it has not. Drop it on any page in
// the workshop and it looks right without touching that page's CSS.
//
// It is keyboard-first, because the games it sits above are: 1–9 pick a topic,
// ENTER skips the typing, ESC leaves. Nothing here traps you.

import { Surface } from './surface.js';
import { TOKO, VOICE } from './palette.js';
import { drawHead, drawBadge, svgBadge } from './face.js';
import { glance, drift } from './util.js';
import { TOPICS, ASIDES, menu, greeting } from './dialogue.js';

// He keeps three things between visits and nothing else: how many times you
// have come to the counter, the last thing you asked, and whether you wanted
// the tick. No identity, no profile, no account — the whole workshop is built
// on not having one, and all three fit in a sentence you could read aloud.
const KEY = 'tokoCounter';
const store = {
  read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
  write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ } },
};

const STYLE_ID = 'toko-chat-style';
const CSS = `
.toko-chat {
  --tc-ink: var(--toko-paper, #fff);
  --tc-dim: var(--toko-smoke, #9a9aa2);
  --tc-hot: var(--toko-magenta, #f0027f);
  --tc-bg:  var(--panel, #101014);
  --tc-line: var(--line, #2a2a30);
  font: 13px/1.55 'Courier New', ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--tc-ink);
  margin: 18px 0;
}
.toko-chat * { box-sizing: border-box; }

/* ── the closed counter: one bar, one invitation ── */
.toko-chat .tc-bar {
  display: flex; align-items: center; gap: 14px; width: 100%;
  min-height: 56px; padding: 8px 16px 8px 8px;
  background: var(--tc-bg); border: 2px solid var(--tc-line);
  color: var(--tc-ink); cursor: pointer; text-align: left;
  font: inherit; letter-spacing: .12em; text-transform: uppercase;
}
.toko-chat .tc-bar:hover { border-color: var(--tc-hot); }
.toko-chat .tc-bar .tc-say { flex: 1; }
.toko-chat .tc-bar .tc-cue { color: var(--tc-hot); font-weight: bold; }
.toko-chat .tc-bar .tc-blip {
  width: 8px; height: 14px; background: var(--tc-hot);
  animation: tc-blink 1.1s steps(1) infinite;
}
@keyframes tc-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }

/* ── the open panel ── */
.toko-chat .tc-panel {
  border: 2px solid var(--tc-hot); background: var(--tc-bg);
  overflow: hidden;
  display: grid; grid-template-columns: auto 1fr;
  /* minmax(0, 1fr), not 1fr: an auto grid row sizes to its content and then
     overflows a max-height container rather than letting the child scroll,
     which is what clipped the bottom of the menu on a phone */
  grid-template-rows: minmax(0, 1fr);
  /* the animation: the counter grows into a room */
  max-height: 0; opacity: 0; transform: scaleY(.86); transform-origin: top;
  transition: max-height .32s cubic-bezier(.2,.7,.3,1), opacity .2s linear,
              transform .32s cubic-bezier(.2,.7,.3,1);
}
.toko-chat.is-open .tc-panel { max-height: 520px; opacity: 1; transform: none; }
.toko-chat.is-open .tc-bar { display: none; }

.toko-chat .tc-portrait {
  padding: 16px; border-right: 2px solid var(--tc-line);
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  background: #000;
}
.toko-chat .tc-portrait .tc-name {
  font-size: 10px; letter-spacing: .26em; color: var(--tc-hot);
}
/* min-height 0 on both, or the flex children refuse to shrink below their
   content and the menu spills straight out through the panel's clipped edge —
   which on a phone hid the bottom four topics AND the way out.
   (No back-ticks in this block, ever: the whole sheet is a template literal
   and one of them ends the string mid-rule.) */
.toko-chat .tc-body { display: flex; flex-direction: column; min-width: 0; min-height: 0; }

.toko-chat .tc-log {
  padding: 16px; min-height: 132px; max-height: 232px; overflow-y: auto;
  flex: 1; white-space: pre-wrap; word-break: break-word;
}
.toko-chat .tc-log .tc-you { color: var(--tc-hot); margin-top: 12px; }
.toko-chat .tc-log .tc-you::before { content: '> '; }
.toko-chat .tc-log .tc-me { color: var(--tc-ink); }
.toko-chat .tc-log p:first-child { margin-top: 0; }
.toko-chat .tc-caret::after {
  content: '\\2588'; color: var(--tc-hot);
  animation: tc-blink 1.1s steps(1) infinite;
}

/* Two columns where there is room. Stacked, seven topics at the 44px tap
   floor make a panel nearly 600px tall, and this thing sits ABOVE the
   cabinets on the arcade — it must not push the games below the fold. */
.toko-chat .tc-menu {
  border-top: 2px solid var(--tc-line); padding: 10px 10px 12px;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2px 10px; align-content: start;
  /* it scrolls rather than squashing: the 44px floor is not negotiable, and a
     menu that runs past the bottom of a phone still has to be reachable */
  min-height: 0; overflow-y: auto; overscroll-behavior: contain;
}
.toko-chat .tc-foot { flex: none; }
.toko-chat .tc-menu button {
  font: inherit; text-align: left; background: none; border: 0;
  color: var(--tc-dim); cursor: pointer; padding: 7px 8px;
  min-height: 44px; letter-spacing: .04em;
}
.toko-chat .tc-menu button:hover,
.toko-chat .tc-menu button:focus-visible { color: var(--tc-ink); background: #ffffff12; }
.toko-chat .tc-menu button b { color: var(--tc-hot); font-weight: bold; }
.toko-chat .tc-menu[hidden] { display: none; }

/* the cabinet he picks, as a real link in the transcript */
.toko-chat .tc-log .tc-go {
  color: var(--tc-hot); font-weight: bold; text-decoration: none;
  border-bottom: 2px solid var(--tc-hot);
}
.toko-chat .tc-log .tc-go:hover { color: var(--tc-ink); border-color: var(--tc-ink); }

/* the sticker he draws for you, handed over as a real download */
.toko-chat .tc-log .tc-gift {
  display: inline-flex; align-items: center; gap: 10px;
  margin-top: 10px; padding: 8px 14px 8px 8px; min-height: 44px;
  border: 2px solid var(--tc-hot); color: var(--tc-hot);
  text-decoration: none; letter-spacing: .12em;
}
.toko-chat .tc-log .tc-gift:hover { background: var(--tc-hot); color: #000; }
.toko-chat .tc-log .tc-gift img { width: 28px; height: 28px; display: block; }

/* when HE is asking, the menu is your mouth, not his */
.toko-chat .tc-menu.is-yours button { color: var(--tc-ink); }
.toko-chat .tc-menu.is-yours button b { color: var(--tc-ink); }

.toko-chat .tc-spacer { flex: 1; }
.toko-chat .tc-foot {
  display: flex; align-items: center; gap: 10px;
  border-top: 2px solid var(--tc-line); padding: 6px 10px;
  font-size: 10.5px; letter-spacing: .18em; color: var(--tc-dim);
}
.toko-chat .tc-foot button {
  font: inherit; letter-spacing: .18em; background: none; cursor: pointer;
  border: 2px solid var(--tc-line); color: var(--tc-dim);
  min-height: 44px; padding: 0 12px;
}
.toko-chat .tc-foot button:hover { border-color: var(--tc-hot); color: var(--tc-ink); }

.toko-chat :focus-visible { outline: 2px solid var(--tc-hot); outline-offset: 2px; }

@media (max-width: 560px) {
  .toko-chat .tc-panel { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
  .toko-chat .tc-portrait { flex-direction: row; border-right: 0; border-bottom: 2px solid var(--tc-line); padding: 8px 16px; }
  /* The head is a canvas laid out at 120x158 — on a phone that is a third of
     the panel spent on a portrait, so it comes down and the menu gets it.
     !important because Surface sizes its canvas with an INLINE style, which
     a plain rule here loses to. */
  .toko-chat .tc-portrait canvas { width: 74px !important; height: 97px !important; }
  /* one column means nine topics is 400px of menu, so the transcript gives
     way first — you can scroll back through what he said, but you cannot
     scroll to a topic you cannot see */
  .toko-chat .tc-log { min-height: 92px; max-height: 150px; overflow-y: auto; }
}
@media (prefers-reduced-motion: reduce) {
  .toko-chat .tc-panel { transition: none; }
  .toko-chat .tc-blip, .toko-chat .tc-caret::after { animation: none; }
}
`;

// A tick per character — the one sound the counter makes, and it is off until
// somebody asks for it. Lazily built, because an AudioContext created before a
// gesture just sits there suspended and logs a warning for its trouble.
function makeTick() {
  let ctx = null, last = 0;
  return () => {
    try {
      if (!ctx) ctx = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      if (now - last < 0.02) return;          // never stack on a fast line
      last = now;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 1180 + Math.random() * 90;
      g.gain.setValueAtTime(0.035, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
      o.connect(g).connect(ctx.destination);
      o.start(now); o.stop(now + 0.025);
    } catch { /* no audio here; the counter is not worth an error */ }
  };
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = CSS;
  document.head.appendChild(s);
}

const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};

export function mountChat(anchor, opts = {}) {
  const {
    where = 'after',           // 'after' the anchor, or 'in' it
    cue = 'TOKO IS AT THE COUNTER',
    // The tempo (see BRAND.md §7): Toko is never in a hurry. 34ms a character
    // with a long beat between lines, and a longer one before the first —
    // he has to come back from wherever he was before he answers you.
    speed = 34,                // ms per character
    openOnLoad = false,
  } = opts;

  injectStyle();

  const still = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const root = el('div', 'toko-chat');
  root.setAttribute('aria-label', `Talk to ${VOICE.artistRomaji}`);

  // ── the closed bar ─────────────────────────────────────────────────────
  const bar = el('button', 'tc-bar');
  bar.type = 'button';
  bar.setAttribute('aria-expanded', 'false');
  const barArt = el('span');
  bar.appendChild(barArt);
  const say = el('span', 'tc-say');
  say.append(cue + ' — ', Object.assign(el('span', 'tc-cue'), { textContent: 'TALK' }));
  bar.appendChild(say);
  bar.appendChild(el('span', 'tc-blip'));
  root.appendChild(bar);

  // ── the open panel ─────────────────────────────────────────────────────
  const panel = el('div', 'tc-panel');
  const portrait = el('div', 'tc-portrait');
  const body = el('div', 'tc-body');
  const log = el('div', 'tc-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  const list = el('div', 'tc-menu');
  const foot = el('div', 'tc-foot');
  const hint = el('span', null, '1–9 PICK · ENTER SKIP · ESC LEAVE');
  const sound = el('button', 'tc-snd');
  sound.type = 'button';
  const leave = el('button', null, 'LEAVE');
  leave.type = 'button';
  foot.append(hint, el('span', 'tc-spacer'), sound, leave);
  body.append(log, list, foot);
  panel.append(portrait, body);
  root.appendChild(panel);

  portrait.appendChild(el('span', 'tc-name', VOICE.artist));

  if (where === 'in') anchor.appendChild(root);
  else anchor.insertAdjacentElement('afterend', root);

  // ── the two canvases ───────────────────────────────────────────────────
  // the badge on the closed bar, and the head that does the talking
  const badge = new Surface(barArt, 40, 40);
  const head = new Surface(portrait, 120, 158, { label: `${VOICE.artistRomaji}` });
  portrait.insertBefore(head.canvas, portrait.firstChild);

  let speaking = false;

  const startBadge = () => badge.loop((t) => {
    badge.clear();
    const k = glance(t, { every: 11, offset: 1.3 });
    drawBadge(badge.ctx, 20, 20, 20, {
      ground: TOKO.MAGENTA, ink: TOKO.PAPER, face: { open: k },
    });
  });
  startBadge();

  const startHead = () => head.loop((t) => {
    head.clear();
    // Eyes shut and smiling at rest; OPEN while he is answering you, because
    // that is the one moment he is actually looking at somebody. The mouth is
    // a stroked arc, so "talking" is just its radius breathing — slowly. At
    // 22 rad/s it chattered like a puppet.
    drawHead(head.ctx, 6, 4, 108, {
      ground: TOKO.MAGENTA, ink: TOKO.PAPER,
      faceOpts: {
        open: speaking ? 1 : glance(t, { every: 11, offset: 0.7 }),
        grin: 1 + (speaking ? Math.sin(t * 11) * 0.05 : drift(t) * 0.012),
      },
    });
  });

  // ── state ──────────────────────────────────────────────────────────────
  const unlocked = new Set(TOPICS.filter(t => !t.locked).map(t => t.id));
  const asked = new Set();
  let typing = null;            // { lines, li, ci, node, done }
  let open = false;
  let fresh = null;             // ids the last answer opened — they sort first
  let pending = null;           // HIS question: the menu is your answers now
  let asides = 0;               // unprompted lines spent this visit
  let idle = 0;                 // the timer that produces them

  // The hour where the reader is, not where a server is. It gates one topic
  // and one greeting, and it is the only thing here that looks at a clock.
  const hour = () => new Date().getHours();

  const line = (cls, text = '') => {
    const p = el('p', cls, text);
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  };

  // Ends the typing wherever it is and runs whatever was supposed to happen
  // afterwards. The `after` hook has to fire from HERE rather than from the
  // animation loop: skipping the goodbye line would otherwise leave the counter
  // open forever, because the close was hanging off an animation nobody
  // watched to the end.
  function finishTyping() {
    if (!typing) return;
    const { lines, node, after, raf } = typing;
    if (raf) cancelAnimationFrame(raf);
    node.textContent = lines.join('\n');
    node.classList.remove('tc-caret');
    typing = null;
    speaking = false;
    log.scrollTop = log.scrollHeight;
    renderMenu();
    if (after) after();
  }

  // The typewriter is TIME-DRIVEN, not a chain of per-character timeouts.
  // A setTimeout chain pays the timer's minimum resolution on every single
  // character, so an 18ms-per-character line measured out at nearly 70 —
  // the greeting took 2.6 seconds to say eleven words. Here every character
  // gets a due time up front and one rAF walks the schedule, which is both
  // accurate and one callback instead of forty.
  function type(lines, after) {
    const node = line('tc-me');
    node.classList.add('tc-caret');

    if (still) {                       // no typing animation for reduced motion
      node.textContent = lines.join('\n');
      node.classList.remove('tc-caret');
      log.scrollTop = log.scrollHeight;
      renderMenu();
      if (after) after();
      return;
    }

    const schedule = [];
    let due = speed * 9;               // a long beat before Toko starts at all
    lines.forEach((l, li) => {
      for (let ci = 1; ci <= l.length; ci++) schedule.push({ li, ci, due: (due += speed) });
      due += speed * 13;               // and a long one at the end of each line
    });

    speaking = true;
    list.hidden = true;
    typing = { lines, node, after, i: 0, raf: 0, start: performance.now() };

    const step = (now) => {
      if (!typing) return;
      const t = now - typing.start;
      while (typing.i < schedule.length && t >= schedule[typing.i].due) typing.i++;
      if (typing.i >= schedule.length) { finishTyping(); return; }
      const { li, ci } = schedule[Math.max(0, typing.i - 1)];
      if (ticking && typing.i !== typing.lastI) { tick(); typing.lastI = typing.i; }
      node.textContent = lines.slice(0, li).concat(lines[li].slice(0, ci)).join('\n');
      log.scrollTop = log.scrollHeight;
      typing.raf = requestAnimationFrame(step);
    };
    typing.raf = requestAnimationFrame(step);
  }

  function renderMenu() {
    list.hidden = false;
    list.textContent = '';
    // `pending` means Toko asked YOU something and the menu is your mouth for
    // one turn. Same keys, same nine slots — only the direction changes.
    const all = pending || menu(unlocked, asked, { hour: hour(), fresh });
    list.classList.toggle('is-yours', !!pending);
    // Nine slots, because the keys are 1–9. The way out gets one of them
    // reserved: the tree outgrew the menu and goodbye fell off the bottom,
    // which turns a counter you can walk away from into one you cannot.
    const outs = all.filter(t => t.end);
    const items = [...all.filter(t => !t.end).slice(0, 9 - outs.length), ...outs];
    items.forEach((t, i) => {
      const b = el('button');
      b.type = 'button';
      b.appendChild(Object.assign(el('b'), { textContent: (i + 1) + '. ' }));
      b.appendChild(document.createTextNode(t.q));
      b.addEventListener('click', () => (pending ? answer(t) : ask(t)));
      list.appendChild(b);
    });
    armIdle();
  }

  // ── he says something unprompted ───────────────────────────────────────
  // A Sierra front desk was never silent. He gets a few of these a visit and
  // then he lets it be quiet, because a counter that keeps talking at you is
  // a shop.
  function armIdle() {
    clearTimeout(idle);
    if (still || asides >= 3 || !open) return;
    idle = setTimeout(() => {
      if (typing || !open || list.hidden) return;
      type(ASIDES[asides % ASIDES.length]);
      asides++;
    }, 24000);
  }

  // The floor, if the page happens to be the arcade. The counter never
  // requires it — dropped on a game page there is no catalogue and the topic
  // simply says so rather than erroring.
  function pickGame() {
    const hub = globalThis.__hub;
    const all = (hub && (hub.active || hub.games)) || [];
    const live = all.filter(g => g && g.path && g.live !== false && g.status !== 'archived');
    if (!live.length) return null;
    // stable for the day: asking twice in a minute gets the same answer, which
    // is the point of the line he says while giving it
    const day = Math.floor(Date.now() / 864e5);
    return live[day % live.length];
  }

  // The sticker. Not a link to a file — there is no file, and there is no
  // image asset anywhere in this brand. `svgBadge` emits the same arcs the
  // canvas strokes, so what he hands you and what you are looking at are the
  // same object. Built on the spot, handed over as a data URI.
  function giveSticker() {
    const svg = svgBadge({ ground: TOKO.MAGENTA, ink: TOKO.PAPER, px: 20 });
    const href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const a = el('a', 'tc-gift');
    a.href = href;
    a.download = 'toko-midori.svg';
    const img = el('img');
    img.src = href;
    img.alt = '';
    a.append(img, document.createTextNode('TAKE THE STICKER'));
    const p = el('p');
    p.appendChild(a);
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }

  // Your half of the one topic that runs the other way.
  function answer(o) {
    if (typing) { finishTyping(); return; }
    pending = null;
    line('tc-you', o.q);
    if (o.opens) { fresh = new Set(o.opens); o.opens.forEach(id => unlocked.add(id)); }
    list.hidden = true;
    type(o.a);
  }

  function ask(t) {
    if (typing) { finishTyping(); return; }
    line('tc-you', t.q);
    asked.add(t.id);
    fresh = t.opens ? new Set(t.opens) : null;
    if (t.opens) t.opens.forEach(id => unlocked.add(id));
    list.hidden = true;
    // what he greets you with next time — the last thing you were curious
    // about, and nothing else about you
    store.write({ ...store.read(), last: t.id });

    let after = t.end ? () => setTimeout(close, 900) : null;
    if (t.gift) {
      const prev = after;
      after = () => { giveSticker(); if (prev) prev(); };
    }
    if (t.asks) {
      const prev = after;
      after = () => { pending = t.asks; renderMenu(); if (prev) prev(); };
    }
    if (t.pick) {
      const g = pickGame();
      const prev = after;
      after = () => {
        const p = el('p', 'tc-me');
        if (g) {
          const a = el('a', 'tc-go');
          a.href = g.path;
          a.textContent = '▸ ' + (g.title || g.id).toUpperCase();
          p.appendChild(a);
          if (g.lineage) p.appendChild(document.createTextNode('  — ' + g.lineage));
        } else {
          p.textContent = 'THOUGH FROM HERE I CANNOT SEE THE FLOOR.';
        }
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
        if (prev) prev();
      };
    }
    type(t.a, after);
  }

  // ── open / close ───────────────────────────────────────────────────────
  function openChat() {
    if (open) return;
    open = true;
    root.classList.add('is-open');
    bar.setAttribute('aria-expanded', 'true');
    badge.stop();
    startHead();
    if (!log.childElementCount) {
      const st = store.read();
      const visits = (st.visits || 0) + 1;
      store.write({ ...st, visits });
      type(greeting({ visits, hour: hour(), last: st.last }));
    }
    else renderMenu();
    addEventListener('keydown', onKey);
    // move focus into the room, but only for keyboard users — a tap should
    // not raise a focus ring on a button the thumb is already over
    const first = list.querySelector('button') || leave;
    if (lastInputWasKey) first.focus();
  }

  function close() {
    if (!open) return;
    open = false;
    root.classList.remove('is-open');
    bar.setAttribute('aria-expanded', 'false');
    if (typing) { typing.after = null; finishTyping(); }
    clearTimeout(idle);
    head.stop();
    startBadge();
    removeEventListener('keydown', onKey);
    if (lastInputWasKey) bar.focus();
  }

  let lastInputWasKey = false;
  const sawKey = () => { lastInputWasKey = true; };
  const sawTap = () => { lastInputWasKey = false; };
  addEventListener('keydown', sawKey, true);
  addEventListener('pointerdown', sawTap, true);

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Enter' && typing) { e.preventDefault(); finishTyping(); return; }
    if (/^[1-9]$/.test(e.key)) {
      const b = list.querySelectorAll('button')[+e.key - 1];
      if (b && !list.hidden) { e.preventDefault(); b.click(); }
    }
  }

  // the tick, remembered between visits
  const tick = makeTick();
  let ticking = !!store.read().tick;
  const paintSound = () => {
    sound.textContent = ticking ? '♪ ON' : '♪ OFF';
    sound.setAttribute('aria-pressed', String(ticking));
    sound.setAttribute('aria-label', ticking ? 'Typing sound on' : 'Typing sound off');
  };
  paintSound();
  sound.addEventListener('click', () => {
    ticking = !ticking;
    store.write({ ...store.read(), tick: ticking });
    paintSound();
    if (ticking) tick();                       // and prove it, on the gesture
  });

  bar.addEventListener('click', openChat);
  leave.addEventListener('click', close);
  // clicking the text while it types skips to the end — the same rule the
  // sting follows: never make somebody wait for an animation
  log.addEventListener('click', () => { if (typing) finishTyping(); });

  if (openOnLoad) openChat();

  return {
    el: root,
    open: openChat,
    close,
    isOpen: () => open,
    // For tests and for anyone poking at it from a console. `say` walks the
    // tree by id the way a click does, so a gate can dig to the back of the
    // shop without twenty-four clicks and a stopwatch.
    say(id) {
      const t = TOPICS.find(x => x.id === id);
      if (t) ask(t);
      return !!t;
    },
    menu: () => menu(unlocked, asked, { hour: hour(), fresh }).map(t => t.id),
    asking: () => !!pending,
    destroy() {
      if (typing) { typing.after = null; finishTyping(); }
      clearTimeout(idle);
      removeEventListener('keydown', onKey);
      removeEventListener('keydown', sawKey, true);
      removeEventListener('pointerdown', sawTap, true);
      badge.destroy(); head.destroy(); root.remove();
    },
  };
}
