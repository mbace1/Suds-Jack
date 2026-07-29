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
// Dynamic, so the ?v= this module was loaded with reaches the dialogue tree
// and the language packs. A static import cannot carry it, which meant the
// hub's cache-buster only ever busted THIS file — see the note in
// dialogue.js. Top-level await keeps mountChat() synchronous for callers:
// the module simply finishes loading before anyone can call it.
const {
  TOPICS, CRY, SCOREBOARD, L, u, say, sayOption, setLang, getLang, VERSION,
  menu, greeting, find, nameWords, askedWords,
  FAVOURITES, FAVE_UNKNOWN,
} = await import('./dialogue.js' + new URL(import.meta.url).search);

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

/* The note you write him. Its OWN row under the transcript, never inside it:
   in the log it scrolled away with the conversation and the send button went
   below the clipped fold. flex: none so it keeps its height when the panel is
   tight. */
.toko-chat .tc-note-row {
  flex: none; border-top: 2px solid var(--tc-line); padding: 10px 12px 12px;
  background: #ffffff08;
}
.toko-chat .tc-note-row[hidden] { display: none; }
.toko-chat .tc-note { display: flex; flex-wrap: wrap; gap: 8px; }
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
.toko-chat .tc-log .tc-tell {
  font: inherit; letter-spacing: .1em; margin-top: 8px;
  min-height: 44px; padding: 0 12px; cursor: pointer;
  background: none; border: 2px solid var(--tc-line); color: var(--tc-dim);
}
.toko-chat .tc-log .tc-tell:hover { border-color: var(--tc-hot); color: var(--tc-ink); }
.toko-chat .tc-log .tc-score { color: var(--tc-dim); }
.toko-chat .tc-log .tc-you-quiet { color: var(--tc-hot); }
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
/* the release number, stated quietly. Same dim as the hint beside it, which
   is already measured for contrast. */
.toko-chat .tc-ver { color: var(--tc-dim); }
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
    cue = null,                // null = the pack's own line
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
  root.setAttribute('aria-label', u('TALK_TO', { x: VOICE.artistRomaji }));

  // ── the closed bar ─────────────────────────────────────────────────────
  const bar = el('button', 'tc-bar');
  bar.type = 'button';
  bar.setAttribute('aria-expanded', 'false');
  const barArt = el('span');
  bar.appendChild(barArt);
  // NOT named `say`: that shadowed the imported say() this whole file now
  // calls to get a topic's words, and shadowing it turns every topic into a
  // "say is not a function".
  const cueEl = el('span', 'tc-say');
  bar.appendChild(cueEl);
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
  parse.setAttribute('aria-label', u('SAY_TO', { x: VOICE.artistRomaji }));
  parse.autocomplete = 'off';
  sayRow.append(Object.assign(el('span', 'tc-prompt'), { textContent: '>' }), parse);

  const foot = el('div', 'tc-foot');
  const hint = el('span');
  const sound = el('button', 'tc-snd');
  sound.type = 'button';
  const leave = el('button');
  leave.type = 'button';
  // The counter has a version like every other project on the floor. It is
  // read from dialogue.js rather than fetched, so it is still right with the
  // signal off — hub/versions.json is the same number, built from
  // toko/VERSIONS.md at deploy time.
  const ver = el('span', 'tc-ver', 'V' + VERSION);
  ver.title = `${VOICE.company} v${VERSION}`;
  foot.append(hint, el('span', 'tc-spacer'), ver, sound, leave);
  // The compose box gets a row of its OWN, not a paragraph in the transcript.
  // Inside .tc-log it scrolled with the conversation, and since that element
  // is capped and clipped the SEND button ended up below the fold — present,
  // focusable, and invisible. Somebody wrote a note and could not find the
  // way to send it, which is the worst possible place for this to break.
  const noteRow = el('div', 'tc-note-row');
  noteRow.hidden = true;
  body.append(log, noteRow, list, sayRow, foot);
  panel.append(portrait, body);
  root.appendChild(panel);

  portrait.appendChild(el('span', 'tc-name', VOICE.artist));

  // Every string that is not in the transcript, repainted on a language
  // change. `cue` overrides the default when a page passes one, so a host
  // that supplied its own line keeps it in every language.
  function paintBar() {
    cueEl.textContent = '';
    // The bar names the cabinet you just left, so knowing where you came from
    // is visible BEFORE you open him. A cue passed by the host still wins.
    const said = cue
      || (from ? u('CUE_FROM', { x: gameName(from) }) : u('CUE'));
    cueEl.append(said + ' \u2014 ',
      Object.assign(el('span', 'tc-cue'), { textContent: u('TALK') }));
    parse.placeholder = u('PARSE_PH');
    parse.setAttribute('aria-label', u('SAY_TO', { x: VOICE.artistRomaji }));
    hint.textContent = u('HINT');
    leave.textContent = u('LEAVE');
    root.setAttribute('aria-label', u('TALK_TO', { x: VOICE.artistRomaji }));
    if (painted) paintSound();   // the tick block is wired further down
  }
  let painted = false;

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
  let lastTopic = null;         // what he was talking about — rides on a note

  // The hour where the reader is, not where a server is. It gates one topic
  // and one greeting, and it is the only thing here that looks at a clock.
  const hour = () => new Date().getHours();

  // ── the language ───────────────────────────────────────────────────────
  // The counter follows the PAGE. On the arcade that is `__hub.lang()`, which
  // the language buttons in the header already drive; on a page that has no
  // opinion it falls back to <html lang>, and then to English.
  //
  // What it does NOT do is re-type the transcript. A conversation you already
  // had happened in the language you had it in, and rewriting somebody's own
  // past questions under them reads like a machine correcting them. The menu,
  // the greeting and everything said from here on follow the switch; what is
  // above the fold stays as it was said.
  function pageLang() {
    const hub = globalThis.__hub;
    try { if (hub && typeof hub.lang === 'function') return hub.lang(); } catch { /* */ }
    return (document.documentElement.lang || 'en').slice(0, 2);
  }
  setLang(pageLang());

  function syncLang() {
    const want = pageLang();
    if (want === getLang()) return;
    setLang(want);
    paintBar();
    if (open && !typing && !list.hidden) renderMenu();
  }
  // The hub re-renders on a language change rather than firing an event, so
  // this watches the one thing that is guaranteed to move: <html lang>.
  const langWatch = new MutationObserver(syncLang);
  langWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

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
      b.appendChild(document.createTextNode(pending ? t.q : say(t).q));
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
      const a = L('ASIDES');
      type(a[asides % a.length]);
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

  // ── where you came from ────────────────────────────────────────────────
  // The badge in a game's corner links here, so most of the time the counter
  // can know which cabinet you just walked off — the browser says so in the
  // referrer. He opens on THAT game rather than on a generic hello, and the
  // note that follows files under it.
  //
  // Deliberately quiet about failing: no referrer (a bookmark, a typed
  // address, a no-referrer policy, file://) simply means the ordinary
  // greeting. It is a nicety, not a mechanism, and it must never be the
  // reason the counter does not open.
  function cameFrom() {
    let ref;
    try { ref = new URL(document.referrer); } catch { return null; }
    if (ref.origin !== location.origin) return null;
    // a reload of the hub itself is not an arrival from anywhere
    const bare = u => u.replace(/#.*$/, '');
    if (bare(ref.href) === bare(location.href)) return null;
    for (const g of cabinets()) {
      let p;
      // baseURI, NOT location: /AnotherHUB/ is the same page one level down
      // with a <base href="../">, so the catalogue's relative paths only
      // resolve to the real cabinets through the base tag.
      try { p = new URL(g.path, document.baseURI).pathname; } catch { continue; }
      const hit = p.endsWith('/') ? ref.pathname.startsWith(p) : ref.pathname === p;
      if (hit) return g;
    }
    return null;
  }
  const from = cameFrom();
  const gameName = g => String(g.title || g.id).toUpperCase();

  // A cabinet by name, for the parser: "tell me about hyper dagger". Matched
  // on the id and on the title's words, so "DAGGER" alone is enough and a
  // one-word title cannot be hit by a single stray word of a longer sentence.
  function matchGame(text) {
    const said = new Set(nameWords(text));
    if (!said.size) return null;
    // A word Toko already uses in a question of his own is not distinctive
    // enough to name a cabinet BY ITSELF. "WHAT MAKES A GOOD GAME?" was
    // answered with the cabinet *The Game of Life*, because GAME is in its
    // title and one title word used to be enough.
    const common = askedWords();
    let best = null, score = 0;
    for (const g of cabinets()) {
      let s = 0;
      for (const w of nameWords(g.title || g.id || '')) {
        if (said.has(w)) s += common.has(w) ? 1 : 2;
      }
      if (said.has(String(g.id || '').toUpperCase())) s += 3;
      if (s > score) { score = s; best = g; }
    }
    // two ordinary title words, or one distinctive one, or the id
    return score >= 2 ? best : null;
  }

  // The games he did not make. Same shape as the cabinet rack, minus the
  // link — there is nowhere on this floor to send you for somebody else's
  // game, and pretending otherwise would be a shop move.
  function faves() {
    const p = L('FAVOURITES');
    return Array.isArray(p) && p.length ? p : FAVOURITES;
  }

  function matchFave(text) {
    const said = new Set(nameWords(text));
    if (!said.size) return null;
    const common = askedWords();
    let best = null, score = 0;
    for (const f of faves()) {
      let s = 0;
      for (const w of nameWords(f.name)) if (said.has(w)) s += common.has(w) ? 1 : 2;
      if (said.has(String(f.id || '').toUpperCase())) s += 3;
      if (s > score) { score = s; best = f; }
    }
    return score >= 2 ? best : null;
  }

  function talkFave(f) {
    lastTopic = 'fave:' + f.id;
    const said = f.a && f.a.length ? f.a : FAVE_UNKNOWN;
    type(said, () => {
      if (!f.when) return;
      log.appendChild(el('p', 'tc-score', '  ' + f.when));
      log.scrollTop = log.scrollHeight;
    });
  }

  // His line about one cabinet, followed by the way in. Written per game in
  // GAME_NOTES; a cabinet with no line yet falls back to the catalogue's own
  // tagline, so one added tomorrow can still be asked about tonight.
  function talkAbout(g) {
    const said = L('GAME_NOTES')[g.id]
      || (g.tagline ? [String(g.tagline).toUpperCase()] : L('ABOUT_UNKNOWN'));
    lastTopic = 'about:' + g.id;
    type(said, () => {
      const p = el('p', 'tc-me');
      const a = el('a', 'tc-go');
      a.href = g.path;
      a.textContent = '▸ ' + (g.title || g.id).toUpperCase();
      p.appendChild(a);
      if (g.lineage) p.appendChild(document.createTextNode('  — ' + g.lineage));
      log.appendChild(p);
      offerTell(g);
    });
  }

  // The routing step. Standing in front of one cabinet is the moment a player
  // actually has something to say about it, and a note taken here files under
  // that game rather than under "the counter".
  function offerTell(g) {
    const tell = el('button', 'tc-tell');
    tell.type = 'button';
    tell.textContent = u('TELL');
    tell.addEventListener('click', () => { tell.remove(); takeNote(g); });
    const q = el('p');
    q.appendChild(tell);
    log.append(q);
    log.scrollTop = log.scrollHeight;
  }

  // ── what you have already told him ─────────────────────────────────────
  // Read back off your own machine. Feedback you cannot see again is a
  // suggestion box with a lock on it.
  function readNotes() {
    const fb = globalThis.__hub && globalThis.__hub.feedback;
    let all = [];
    try { all = (fb && fb.archive && fb.archive()) || []; } catch { all = []; }
    const mine = all.filter(n => n && n.note);
    if (!mine.length) { type(u('EMPTY_BOX')); return; }
    for (const n of mine.slice(0, 5)) {
      const p = el('p', 'tc-score');
      const when = n.ts ? new Date(n.ts).toISOString().slice(0, 10) : '';
      p.append(document.createTextNode('  ' + when + '  '),
        Object.assign(el('b'), { textContent: String(n.note) }));
      log.appendChild(p);
    }
    if (mine.length > 5) log.appendChild(el('p', 'tc-score', u('MORE', { n: mine.length - 5 })));
    log.scrollTop = log.scrollHeight;
  }

  // ── what changed ───────────────────────────────────────────────────────
  // The other half of the note box. A suggestion box nobody ever answers
  // stops getting used, so this reads out the hand-kept log of what actually
  // got fixed — and, where you left a note about that same cabinet, says so.
  //
  // That last part is the only claim it makes about you, and it is checkable:
  // it compares the `game` on the log entry against the `game` on the notes
  // already on your machine. The log itself never says "you asked for this",
  // because most entries nobody asked for and a counter that flatters you is
  // back to being a shop.
  function myGames() {
    const fb = globalThis.__hub && globalThis.__hub.feedback;
    let all = [];
    try { all = (fb && fb.archive && fb.archive()) || []; } catch { all = []; }
    return new Set(all.filter(n => n && n.note && n.game).map(n => n.game));
  }

  function readChanged() {
    const entries = L('CHANGED');
    if (!entries.length) { type(L('CHANGED_NONE')); return; }
    const mine = myGames();
    const games = cabinets();
    const titleOf = id => {
      const g = games.find(x => x.id === id);
      return (g && (g.title || g.id) || id).toUpperCase();
    };
    // ONCE per game, on its most recent entry. Said against every line it
    // stops being an acknowledgement and turns into flattery, which is the
    // one register this counter is not for.
    const flagged = new Set();
    for (const e of entries.slice(0, 6)) {
      const head = el('p', 'tc-score');
      head.append(document.createTextNode('  ' + (e.when || '') + '  '),
        Object.assign(el('b'), { textContent: e.game === 'hub' ? 'THE ARCADE' : titleOf(e.game) }));
      log.appendChild(head);
      for (const l of e.what) log.appendChild(el('p', 'tc-me', '    ' + l));
      if (mine.has(e.game) && !flagged.has(e.game)) {
        flagged.add(e.game);
        log.appendChild(el('p', 'tc-you-quiet', '    ' + L('CHANGED_YOURS')));
      }
    }
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
    a.append(img, document.createTextNode(u('STICKER')));
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
  const SAID = () => ({
    sent: u('SENT'), 'sent-blind': u('SENT_BLIND'),
    queued: u('QUEUED'), off: u('OFF'),
  });

  // `about` is a cabinet, when the note is about one. It is what turns a pile
  // of notes into something you can act on: `game` is the field every other
  // feedback surface in this workshop already files under, so a note left at
  // the counter about Hyper Dagger lands in the same bucket as one left on
  // Hyper Dagger's own form.
  function takeNote(about) {
    const wrap = el('div', 'tc-note');
    const box = el('textarea');
    const who = about ? (about.title || about.id).toUpperCase() : null;
    box.setAttribute('aria-label',
      who ? u('NOTE_LABEL_ABOUT', { x: who }) : u('NOTE_LABEL'));
    box.placeholder = who ? u('NOTE_PH_ABOUT', { x: who.toLowerCase() }) : u('NOTE_PH');
    box.maxLength = 2000;
    const send = el('button', null, u('SEND'));
    send.type = 'button';
    wrap.append(box, send);
    noteRow.textContent = '';
    noteRow.appendChild(wrap);
    noteRow.hidden = false;
    list.hidden = true;                    // one thing to do at a time
    log.scrollTop = log.scrollHeight;
    box.focus();                           // it is the only reason it is open

    send.addEventListener('click', async () => {
      const text = box.value.trim();
      noteRow.hidden = true;
      noteRow.textContent = '';
      // Saying nothing records nothing. The hub holds the same rule, and it
      // is the difference between asking for feedback and harvesting it.
      if (!text) { type(u('NOTHING_SAID')); return; }
      line('tc-you', text.toUpperCase());
      send.disabled = true;
      let status = 'off';
      try {
        const fb = globalThis.__hub && globalThis.__hub.feedback;
        status = fb && fb.send
          ? await fb.send({
            // filed under the cabinet when there is one, so it sorts with
            // everything else said about that game
            game: about ? about.id : 'toko-counter',
            kind: 'counter',
            note: text,
            // what he was talking about when you wrote it. A note that says
            // "this is broken" is worth nothing without it.
            // from the CABINET when there is one. `lastTopic` drifts: a
            // TELL button stays in the transcript, so clicking one from
            // further up is legitimate and must not be labelled with
            // whatever he happens to be talking about now.
            topic: about ? 'about:' + about.id : (lastTopic || null),
            ts: Date.now(),
          })
          : 'off';
      } catch { status = 'off'; }
      // he brings it up next time, once
      store.write({ ...store.read(), noted: true });
      const s = SAID();
      type(s[status] || s.off);
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
    if (!found.length) { type(L('SEEN_NOTHING')); return; }
    type(L('SEEN_SOMETHING'), () => {
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
    if (CRY.test(raw)) { line('tc-you', raw.toUpperCase()); type(L('CRY_A')); return; }
    // A cabinet by name beats a topic. "TELL ME ABOUT HYPER DAGGER" should
    // get the cabinet, not the general TELL ME ABOUT ONE OF THEM.
    const g = matchGame(raw);
    if (g) { line('tc-you', raw.toUpperCase()); list.hidden = true; talkAbout(g); return; }
    const f = matchFave(raw);
    if (f) { line('tc-you', raw.toUpperCase()); list.hidden = true; talkFave(f); return; }
    const t = find(raw);
    if (t) { unlocked.add(t.id); ask(t, raw.toUpperCase()); return; }
    line('tc-you', raw.toUpperCase());
    list.hidden = true;
    const m = L('MISSES');
    type(m[misses++ % m.length]);
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
    if (o.fave) { talkFave(o.fave); return; }
    type(o.a);
  }

  // `asWritten` is what the player actually typed, when they typed it —
  // echoing the menu's wording back at somebody who used their own words
  // reads like a machine correcting them.
  function ask(t, asWritten) {
    if (typing) { finishTyping(); return; }
    line('tc-you', asWritten || say(t).q);
    asked.add(t.id);
    fresh = t.opens ? new Set(t.opens) : null;
    if (t.opens) t.opens.forEach(id => unlocked.add(id));
    list.hidden = true;
    if (t.torn) tornUntil = performance.now() + 1400;
    lastTopic = t.id;
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
    if (t.changed) {
      const prev = after;
      after = () => { readChanged(); if (prev) prev(); };
    }
    if (t.askFaves) {
      const rack = faves().slice(0, 8)
        .map(f => ({ id: 'f:' + f.id, q: f.name, fave: f }));
      const prev = after;
      after = () => { pending = rack; renderMenu(); if (prev) prev(); };
    }
    if (t.askGames) {
      // the rack: eight at most, because the menu has nine slots and one of
      // them is always the way out
      const rack = cabinets().slice(0, 8)
        .map(g => ({ id: 'g:' + g.id, q: (g.title || g.id).toUpperCase(), game: g }));
      const prev = after;
      after = () => {
        if (!rack.length) { type([u('NO_FLOOR')]); return; }
        pending = rack;
        renderMenu();
        if (prev) prev();
      };
    }
    if (t.asks) {
      const prev = after;
      after = () => {
        // localised HERE rather than at draw time, so an option carries its
        // own words the same way a cabinet on the rack does
        pending = t.asks.map((o, i) => ({ ...o, ...sayOption(t, i) }));
        renderMenu();
        if (prev) prev();
      };
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
          p.textContent = u('NO_FLOOR');
        }
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
        if (prev) prev();
      };
    }
    type(say(t).a, after);
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
      // Coming off a cabinet replaces the greeting rather than being added to
      // it — two lines is the ceiling here (see LATE in dialogue.js), and
      // somebody who has just played something already has a subject. The one
      // thing that outranks it is an unacknowledged note: he owes you that.
      if (from && !st.noted) {
        type(L('BACK_FROM').map(l => l.replaceAll('{x}', gameName(from))),
          () => offerTell(from));
      } else {
        type(greeting({ visits, hour: hour(), last: st.last, noted: !!st.noted }));
      }
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
    sound.textContent = ticking ? u('SND_ON') : u('SND_OFF');
    sound.setAttribute('aria-pressed', String(ticking));
    sound.setAttribute('aria-label', ticking ? u('SND_LABEL_ON') : u('SND_LABEL_OFF'));
  };
  painted = true;
  paintBar();
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
    // the cabinet the referrer says you just left, or null
    from: () => (from ? from.id : null),
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
