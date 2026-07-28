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
import { hit } from './glitch.js';
import {
  TOPICS, ASIDES, MISSES, CRY, SCOREBOARD, SEEN_NOTHING, SEEN_SOMETHING,
  GAME_NOTES, ABOUT_UNKNOWN, menu, greeting, find,
} from './dialogue.js';

// He keeps four things between visits and nothing else: how many times you
// have come to the counter, the last thing you asked, whether you left him a
// note he has not acknowledged yet, and whether you wanted the tick. No
// identity, no profile, no account — the whole workshop is built on not
// having one, and all four fit in a sentence you could read aloud.
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

/* the note you write him, and the scoreboard he reads back */
.toko-chat .tc-note { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
.toko-chat .tc-note textarea {
  flex: 1 1 220px; min-height: 66px; resize: vertical;
  font: inherit; color: var(--tc-ink); background: #00000060;
  border: 2px solid var(--tc-line); padding: 8px 10px;
}
.toko-chat .tc-note textarea:focus { border-color: var(--tc-hot); outline: none; }
.toko-chat .tc-note button {
  font: inherit; letter-spacing: .14em; min-height: 44px; padding: 0 16px;
  background: none; border: 2px solid var(--tc-hot); color: var(--tc-hot); cursor: pointer;
}
.toko-chat .tc-note button:hover { background: var(--tc-hot); color: #000; }
.toko-chat .tc-note button[disabled] { opacity: .45; cursor: default; }
.toko-chat .tc-log .tc-score { color: var(--tc-dim); }
.toko-chat .tc-log .tc-score b { color: var(--tc-ink); font-weight: normal; }

/* the parser: the reason this thing is shaped like Police Quest */
.toko-chat .tc-say-row {
  display: flex; align-items: stretch; gap: 0;
  border-top: 2px solid var(--tc-line);
}
.toko-chat .tc-say-row .tc-prompt {
  display: flex; align-items: center; padding: 0 4px 0 12px;
  color: var(--tc-hot); font-weight: bold;
}
.toko-chat .tc-say-row input {
  flex: 1; min-width: 0; min-height: 44px; padding: 0 10px;
  font: inherit; letter-spacing: .06em; text-transform: uppercase;
  background: none; border: 0; color: var(--tc-ink); outline: none;
}
.toko-chat .tc-say-row input::placeholder { color: var(--tc-dim); text-transform: none; letter-spacing: .04em; }
.toko-chat .tc-say-row input:focus { background: #ffffff0a; }

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

  // The parser line. The menu is the safe path; this is the one that makes it
  // a Sierra game — you can type at him, and he answers or admits he did not
  // understand. Still no language model: word overlap against a lookup.
  const sayRow = el('div', 'tc-say-row');
  const parse = el('input');
  parse.type = 'text';
  parse.placeholder = 'or type something…';
  parse.setAttribute('aria-label', `Say something to ${VOICE.artistRomaji}`);
  parse.autocomplete = 'off';
  sayRow.append(Object.assign(el('span', 'tc-prompt'), { textContent: '>' }), parse);

  const foot = el('div', 'tc-foot');
  const hint = el('span', null, '1–9 PICK · TYPE TO TALK · ESC LEAVE');
  const sound = el('button', 'tc-snd');
  sound.type = 'button';
  const leave = el('button', null, 'LEAVE');
  leave.type = 'button';
  foot.append(hint, el('span', 'tc-spacer'), sound, leave);
  body.append(log, list, sayRow, foot);
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
  let tornUntil = 0;            // wall-clock end of the current tear

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
    // A glitch is an EVENT, not a state: it runs while he answers the topics
    // that are ABOUT the seam, and it fades out over its own window rather
    // than sitting on the portrait as a permanent texture.
    if (!still && tornUntil) {
      const left = (tornUntil - performance.now()) / 1400;
      if (left <= 0) { tornUntil = 0; return; }
      // DEVICE pixels, not CSS ones. The glitch kit works through
      // getImageData, which ignores the context transform — handed this
      // Surface's CSS size it tore a quarter of the portrait at half scale
      // and read as a hairline down the middle.
      hit(head.ctx, head.canvas.width, head.canvas.height,
        Math.min(0.9, left * 0.8),
        { seed: 7, t, hole: TOKO.INK, scan: false, scale: head.canvas.width / 44 });
    }
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

  // Every live cabinet, for the topics that turn the menu into a rack.
  function cabinets() {
    const hub = globalThis.__hub;
    const all = (hub && (hub.games || hub.active)) || [];
    return all.filter(g => g && g.path && g.live !== false);
  }

  // A cabinet by name, for the parser: "tell me about hyper dagger". Matched
  // on the id and on the title's words, so "DAGGER" alone is enough and a
  // one-word title cannot be hit by a single stray word of a longer sentence.
  function matchGame(text) {
    const said = new Set((text.toUpperCase().match(/[A-Z0-9]+/g) || []));
    let best = null, score = 0;
    for (const g of cabinets()) {
      const own = (g.title || g.id || '').toUpperCase().match(/[A-Z0-9]+/g) || [];
      let s = 0;
      for (const w of own) if (w.length > 2 && said.has(w)) s++;
      if (said.has((g.id || '').toUpperCase())) s += 2;
      if (s > score) { score = s; best = g; }
    }
    return score >= 1 ? best : null;
  }

  // His line about one cabinet, followed by the way in. Written per game in
  // GAME_NOTES; a cabinet with no line yet falls back to the catalogue's own
  // tagline, so one added tomorrow can still be asked about tonight.
  function talkAbout(g) {
    const said = GAME_NOTES[g.id]
      || (g.tagline ? [String(g.tagline).toUpperCase()] : ABOUT_UNKNOWN);
    type(said, () => {
      const p = el('p', 'tc-me');
      const a = el('a', 'tc-go');
      a.href = g.path;
      a.textContent = '▸ ' + (g.title || g.id).toUpperCase();
      p.appendChild(a);
      if (g.lineage) p.appendChild(document.createTextNode('  — ' + g.lineage));
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    });
  }

  // ── what you have already told him ─────────────────────────────────────
  // Read back off your own machine. Feedback you cannot see again is a
  // suggestion box with a lock on it.
  function readNotes() {
    const fb = globalThis.__hub && globalThis.__hub.feedback;
    let all = [];
    try { all = (fb && fb.archive && fb.archive()) || []; } catch { all = []; }
    const mine = all.filter(n => n && n.note);
    if (!mine.length) { type(['NOTHING YET. THE BOX IS EMPTY.']); return; }
    for (const n of mine.slice(0, 5)) {
      const p = el('p', 'tc-score');
      const when = n.ts ? new Date(n.ts).toISOString().slice(0, 10) : '';
      p.append(document.createTextNode('  ' + when + '  '),
        Object.assign(el('b'), { textContent: String(n.note) }));
      log.appendChild(p);
    }
    if (mine.length > 5) log.appendChild(el('p', 'tc-score', `  …AND ${mine.length - 5} MORE.`));
    log.scrollTop = log.scrollHeight;
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

  // ── the note you leave him ─────────────────────────────────────────────
  // The counter's whole reason for existing: everything else is Toko talking,
  // and this is the one place the traffic runs the other way.
  //
  // It reuses the ARCADE's transport (`window.__hub.feedback`) rather than
  // shipping a second one — same endpoint, same local archive, same outbox
  // retried on the next visit. Dropped on a page that has no hub, the note is
  // still written down locally and he says exactly that. What he must never
  // do is claim a delivery that did not happen: an opaque no-cors POST
  // reports 'sent-blind', and the line he says for it is different.
  const SAID = {
    sent: ['IT LANDED. THANK YOU.'],
    'sent-blind': ['IT LEFT.', 'I CANNOT SEE THE OTHER END FROM HERE,',
      'SO THAT IS ALL I CAN HONESTLY TELL YOU.'],
    queued: ['THE NETWORK SAID NO.', 'IT IS IN THE OUTBOX. IT GOES NEXT TIME.'],
    off: ['THERE IS NOWHERE TO SEND IT TODAY,', 'SO IT IS WRITTEN DOWN ON YOUR MACHINE.'],
  };

  function takeNote() {
    const wrap = el('div', 'tc-note');
    const box = el('textarea');
    box.setAttribute('aria-label', 'Your note to Toko');
    box.placeholder = 'broken, boring, wrong — all useful';
    box.maxLength = 2000;
    const send = el('button', null, 'SEND');
    send.type = 'button';
    wrap.append(box, send);
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    if (lastInputWasKey) box.focus();

    send.addEventListener('click', async () => {
      const text = box.value.trim();
      wrap.remove();
      // Saying nothing records nothing. The hub holds the same rule, and it
      // is the difference between asking for feedback and harvesting it.
      if (!text) { type(['YOU SAID NOTHING, SO I WROTE NOTHING DOWN.']); return; }
      line('tc-you', text.toUpperCase());
      send.disabled = true;
      let status = 'off';
      try {
        const fb = globalThis.__hub && globalThis.__hub.feedback;
        status = fb && fb.send
          ? await fb.send({ game: 'toko-counter', kind: 'counter', note: text })
          : 'off';
      } catch { status = 'off'; }
      // he brings it up next time, once
      store.write({ ...store.read(), noted: true });
      type(SAID[status] || SAID.off);
    });
  }

  // ── what the cabinets left on this machine ─────────────────────────────
  // Read locally, shown once, sent nowhere — which is exactly what the topic
  // he says over it claims, and the claim is only worth making because the
  // code is this short.
  function readScores() {
    const found = [];
    for (const [key, name, fmt] of SCOREBOARD) {
      let v = null;
      try { v = localStorage.getItem(key); } catch { /* private mode */ }
      if (v == null || v === '' || +v === 0 || Number.isNaN(+v)) continue;
      found.push([name, fmt(v)]);
    }
    if (!found.length) { type(SEEN_NOTHING); return; }
    type(SEEN_SOMETHING, () => {
      for (const [name, val] of found) {
        const p = el('p', 'tc-score');
        p.append(document.createTextNode('  ' + name + '  '),
          Object.assign(el('b'), { textContent: val }));
        log.appendChild(p);
      }
      log.scrollTop = log.scrollHeight;
    });
  }

  // ── the parser ─────────────────────────────────────────────────────────
  // Type at him and he answers, or admits he did not understand. It can reach
  // LOCKED topics, which is the reward for typing rather than picking: ask
  // about the mask before anybody offers it and he takes the question.
  function said(text) {
    const raw = text.trim();
    if (!raw) return;
    parse.value = '';
    if (typing) finishTyping();
    if (CRY.test(raw)) { line('tc-you', raw.toUpperCase()); type(CRY.a); return; }
    // A cabinet by name beats a topic. "TELL ME ABOUT HYPER DAGGER" should
    // get the cabinet, not the general TELL ME ABOUT ONE OF THEM.
    const g = matchGame(raw);
    if (g) { line('tc-you', raw.toUpperCase()); list.hidden = true; talkAbout(g); return; }
    const t = find(raw);
    if (t) { unlocked.add(t.id); ask(t, raw.toUpperCase()); return; }
    line('tc-you', raw.toUpperCase());
    list.hidden = true;
    type(MISSES[misses++ % MISSES.length]);
  }
  let misses = 0;

  // Your half of the topics that run the other way — his question, and the
  // cabinet rack. An option carrying a `game` is a cabinet; everything else
  // is a written answer.
  function answer(o) {
    if (typing) { finishTyping(); return; }
    pending = null;
    line('tc-you', o.q);
    if (o.opens) { fresh = new Set(o.opens); o.opens.forEach(id => unlocked.add(id)); }
    list.hidden = true;
    if (o.game) { talkAbout(o.game); return; }
    type(o.a);
  }

  // `asWritten` is what the player actually typed, when they typed it —
  // echoing the menu's wording back at somebody who used their own words
  // reads like a machine correcting them.
  function ask(t, asWritten) {
    if (typing) { finishTyping(); return; }
    line('tc-you', asWritten || t.q);
    asked.add(t.id);
    fresh = t.opens ? new Set(t.opens) : null;
    if (t.opens) t.opens.forEach(id => unlocked.add(id));
    list.hidden = true;
    if (t.torn) tornUntil = performance.now() + 1400;
    // what he greets you with next time — the last thing you were curious
    // about, and nothing else about you
    store.write({ ...store.read(), last: t.id });

    let after = t.end ? () => setTimeout(close, 900) : null;
    if (t.gift) {
      const prev = after;
      after = () => { giveSticker(); if (prev) prev(); };
    }
    if (t.note) {
      const prev = after;
      after = () => { takeNote(); if (prev) prev(); };
    }
    if (t.scores) {
      const prev = after;
      after = () => { readScores(); if (prev) prev(); };
    }
    if (t.notes) {
      const prev = after;
      after = () => { readNotes(); if (prev) prev(); };
    }
    if (t.askGames) {
      // the rack: eight at most, because the menu has nine slots and one of
      // them is always the way out
      const rack = cabinets().slice(0, 8)
        .map(g => ({ id: 'g:' + g.id, q: (g.title || g.id).toUpperCase(), game: g }));
      const prev = after;
      after = () => {
        if (!rack.length) { type(['THOUGH FROM HERE I CANNOT SEE THE FLOOR.']); return; }
        pending = rack;
        renderMenu();
        if (prev) prev();
      };
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
      // `noted` is spent as it is read: he acknowledges a note ONCE, because
      // the second time it stops being an acknowledgement and starts being
      // a receipt.
      store.write({ ...st, visits, noted: false });
      type(greeting({ visits, hour: hour(), last: st.last, noted: !!st.noted }));
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

  // Anything the player is typing INTO owns its own keys. Without this the
  // number shortcuts fire while you are writing him a note, so typing "3
  // CRASHES" picks topic three and throws the sentence away.
  const isTyping = () => {
    const a = document.activeElement;
    return a && (a === parse || a.tagName === 'TEXTAREA' || a.tagName === 'INPUT');
  };

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      // one Escape steps out of the field, the next one leaves the counter
      if (isTyping()) { e.target.blur(); return; }
      close();
      return;
    }
    if (isTyping()) return;
    if (e.key === 'Enter' && typing) { e.preventDefault(); finishTyping(); return; }
    if (/^[1-9]$/.test(e.key)) {
      const b = list.querySelectorAll('button')[+e.key - 1];
      if (b && !list.hidden) { e.preventDefault(); b.click(); }
    }
  }

  parse.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    said(parse.value);
  });

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
  log.addEventListener('click', (e) => {
    // not while you are aiming at something in the transcript — the sticker
    // link and the note box both live in there
    if (e.target.closest('a, button, textarea, input')) return;
    if (typing) finishTyping();
  });

  // `#toko` opens the counter, so a link can point at the conversation and
  // not just the page it sits on. It only ever OPENS: the hash is not written
  // back, because the arcade's own address should stay the plain one.
  const fromHash = () => {
    if (location.hash.toLowerCase() === '#toko') openChat();
  };
  addEventListener('hashchange', fromHash);
  fromHash();

  if (openOnLoad) openChat();

  return {
    el: root,
    open: openChat,
    close,
    isOpen: () => open,
    // For tests and for anyone poking at it from a console. `say` walks the
    // tree by id the way a click does, so a gate can dig to the back of the
    // shop without twenty-four clicks and a stopwatch; `type` puts words in
    // the parser the way a keyboard does.
    say(id) {
      const t = TOPICS.find(x => x.id === id);
      if (t) ask(t);
      return !!t;
    },
    type(text) { said(text); },
    menu: () => menu(unlocked, asked, { hour: hour(), fresh }).map(t => t.id),
    asking: () => !!pending,
    // still mid-sentence. A caller that picks a topic while he is talking
    // only skips the typing (that is the rule for players too), so a test
    // driving the tree has to wait this out or skip on purpose.
    busy: () => !!typing,
    skip: () => finishTyping(),
    destroy() {
      if (typing) { typing.after = null; finishTyping(); }
      clearTimeout(idle);
      removeEventListener('keydown', onKey);
      removeEventListener('hashchange', fromHash);
      removeEventListener('keydown', sawKey, true);
      removeEventListener('pointerdown', sawTap, true);
      badge.destroy(); head.destroy(); root.remove();
    },
  };
}
