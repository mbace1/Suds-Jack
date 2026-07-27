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
import { drawHead, drawBadge } from './face.js';
import { pulse } from './util.js';
import { GREETING, TOPICS, menu } from './dialogue.js';

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
.toko-chat .tc-body { display: flex; flex-direction: column; min-width: 0; }

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
}
.toko-chat .tc-menu button {
  font: inherit; text-align: left; background: none; border: 0;
  color: var(--tc-dim); cursor: pointer; padding: 7px 8px;
  min-height: 44px; letter-spacing: .04em;
}
.toko-chat .tc-menu button:hover,
.toko-chat .tc-menu button:focus-visible { color: var(--tc-ink); background: #ffffff12; }
.toko-chat .tc-menu button b { color: var(--tc-hot); font-weight: bold; }
.toko-chat .tc-menu[hidden] { display: none; }
/* the feedback branch lists every project, which is more than the seven topics
   this menu was sized for — let it scroll rather than push the cabinets down */
.toko-chat .tc-menu { max-height: 236px; overflow-y: auto; }

/* The composer is the tallest thing this panel ever holds, and the panel is
   capped at 520px because it sits ABOVE the cabinets — going taller pushes the
   games below the fold, which is the one thing this component must not do. So
   the room comes out of the log instead: while you are writing, the transcript
   shrinks to its floor and scrolls. */
.toko-chat.is-writing .tc-log { max-height: 132px; }

/* ── the composer: where you talk back ── */
.toko-chat .tc-write {
  border-top: 2px solid var(--tc-line); padding: 10px;
  display: flex; flex-direction: column; gap: 8px;
}
.toko-chat .tc-write[hidden] { display: none; }
.toko-chat .tc-write textarea {
  font: inherit; width: 100%; min-height: 68px; resize: vertical;
  background: #000; color: var(--tc-ink);
  border: 2px solid var(--tc-line); padding: 8px;
}
.toko-chat .tc-write textarea:focus { border-color: var(--tc-hot); outline: none; }
.toko-chat .tc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.toko-chat .tc-chips button {
  font: inherit; font-size: 11.5px; letter-spacing: .04em;
  background: none; border: 1px solid var(--tc-line); color: var(--tc-dim);
  cursor: pointer; min-height: 44px; padding: 0 10px; text-align: left;
}
.toko-chat .tc-chips button:hover { color: var(--tc-ink); border-color: var(--tc-hot); }
.toko-chat .tc-chips button::before { content: '+ '; color: var(--tc-hot); }
.toko-chat .tc-write .tc-send-row { display: flex; gap: 8px; align-items: center; }
.toko-chat .tc-write .tc-send-row button {
  font: inherit; letter-spacing: .16em; background: none; cursor: pointer;
  border: 2px solid var(--tc-line); color: var(--tc-dim);
  min-height: 44px; padding: 0 14px;
}
.toko-chat .tc-write .tc-send-row .tc-primary { border-color: var(--tc-hot); color: var(--tc-ink); }
.toko-chat .tc-write .tc-send-row button:hover { border-color: var(--tc-hot); color: var(--tc-ink); }

.toko-chat .tc-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
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
  .toko-chat .tc-panel { grid-template-columns: 1fr; }
  .toko-chat .tc-portrait { flex-direction: row; border-right: 0; border-bottom: 2px solid var(--tc-line); }
}
@media (prefers-reduced-motion: reduce) {
  .toko-chat .tc-panel { transition: none; }
  .toko-chat .tc-blip, .toko-chat .tc-caret::after { animation: none; }
}
`;

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
    speed = 18,                // ms per character
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
  const write = el('div', 'tc-write');
  write.hidden = true;
  const foot = el('div', 'tc-foot');
  const hint = el('span', null, '1–9 PICK · ENTER SKIP · ESC LEAVE');
  const leave = el('button', null, 'LEAVE');
  leave.type = 'button';
  foot.append(hint, leave);
  body.append(log, list, write, foot);
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
    const k = pulse(t, { every: 5.5, len: 0.16, offset: 1.3 });
    drawBadge(badge.ctx, 20, 20, 20, {
      ground: TOKO.MAGENTA, ink: TOKO.PAPER, face: { squash: 1 - k * 0.92 },
    });
  });
  startBadge();

  const startHead = () => head.loop((t) => {
    head.clear();
    // blinking at rest; while a line is being typed the mouth works — the
    // mouth is a stroked arc, so "talking" is just its radius breathing
    const k = speaking ? 0 : pulse(t, { every: 5, len: 0.16, offset: 0.7 });
    drawHead(head.ctx, 6, 4, 108, {
      ground: TOKO.MAGENTA, ink: TOKO.PAPER,
      faceOpts: {
        squash: 1 - k * 0.92,
        grin: speaking ? 1 + Math.sin(t * 22) * 0.055 : 1,
      },
    });
  });

  // ── state ──────────────────────────────────────────────────────────────
  const unlocked = new Set(TOPICS.filter(t => !t.locked).map(t => t.id));
  const asked = new Set();
  let typing = null;            // { lines, li, ci, node, done }
  let open = false;

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
    let due = speed * 4;               // a beat before Toko starts
    lines.forEach((l, li) => {
      for (let ci = 1; ci <= l.length; ci++) schedule.push({ li, ci, due: (due += speed) });
      due += speed * 10;               // and a beat at the end of each line
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
      node.textContent = lines.slice(0, li).concat(lines[li].slice(0, ci)).join('\n');
      log.scrollTop = log.scrollHeight;
      typing.raf = requestAnimationFrame(step);
    };
    typing.raf = requestAnimationFrame(step);
  }

  function renderMenu() {
    write.hidden = true;
    root.classList.remove('is-writing');
    list.hidden = false;
    list.textContent = '';
    hint.textContent = '1–9 PICK · ENTER SKIP · ESC LEAVE';
    // A branch takes the menu over — same list, different question. Everything
    // beyond the ninth still clicks; only the number shortcut runs out.
    const items = branch ? branchItems()
      : menu(unlocked, asked).map(t => ({ q: t.q, go: () => ask(t) }));
    items.forEach((it, i) => {
      const b = el('button');
      b.type = 'button';
      if (i < 9) b.appendChild(Object.assign(el('b'), { textContent: (i + 1) + '. ' }));
      b.appendChild(document.createTextNode(it.q));
      b.addEventListener('click', it.go);
      list.appendChild(b);
    });
  }

  function ask(t) {
    if (typing) { finishTyping(); return; }
    line('tc-you', t.q);
    asked.add(t.id);
    if (t.opens) t.opens.forEach(id => unlocked.add(id));
    list.hidden = true;
    if (t.mode === 'feedback') { startFeedback(t); return; }
    type(t.a, t.end ? () => setTimeout(close, 900) : null);
  }

  // ── talking back ───────────────────────────────────────────────────────
  // The counter's actual job. Everything else on the menu is a thing Toko says;
  // this is the one where the person on the other side gets to say something,
  // and it takes the menu over rather than opening a box on top of the
  // conversation: which project, then what kind of note, then the words.
  //
  // The categories and their per-project ordering come from the SAME
  // hub/topics.js the panel under each cover art uses. That is the whole reason
  // to do it here at all — a note left at the counter and a note left under a
  // cabinet have to be the same shape or they cannot be counted together.
  //
  // Loaded on demand and allowed to fail: this file is meant to be droppable on
  // any page in the workshop, so a missing hub folder should cost the feedback
  // branch and not the whole counter.
  let kit = null;
  let branch = null;                 // { step: 'project'|'kind'|'write', game, kind }

  async function loadKit() {
    if (kit) return kit;
    try {
      const [topics, post, cat] = await Promise.all([
        import('../../hub/topics.js?v=1'),
        import('../../hub/feedback.js?v=5'),
        import('../../hub/games.js?v=8'),
      ]);
      kit = { topics, post, games: cat.GAMES };
    } catch {
      kit = { broken: true };
    }
    return kit;
  }

  const NEVER = { q: 'NEVER MIND.', go: () => cancelBranch() };

  function branchItems() {
    if (branch.step === 'project') {
      return [...kit.topics.projectChoices(kit.games).map(p => ({
        q: p.label.toUpperCase(),
        go: () => pickProject(p),
      })), NEVER];
    }
    return [...kit.topics.kindsFor(branch.game).map(k => ({
      q: k.label.toUpperCase(),
      go: () => pickKind(k),
    })), NEVER];
  }

  async function startFeedback(t) {
    await loadKit();
    if (kit.broken) { type(['THE BOOK IS NOT ON THE COUNTER RIGHT NOW.']); return; }
    branch = { step: 'project' };
    type(t.a);
  }

  function pickProject(p) {
    line('tc-you', p.label.toUpperCase());
    branch = { step: 'kind', game: p.id, label: p.label };
    list.hidden = true;
    type([`${p.label.toUpperCase()}. WHAT KIND OF NOTE?`]);
  }

  function pickKind(k) {
    line('tc-you', k.label.toUpperCase());
    branch = { ...branch, step: 'write', kind: k.id, kindLabel: k.label };
    list.hidden = true;
    type(['IN YOUR OWN WORDS.'], openComposer);
  }

  function openComposer() {
    list.hidden = true;
    write.hidden = false;
    root.classList.add('is-writing');
    // the log just got shorter under it; keep the last thing Toko said in view
    log.scrollTop = log.scrollHeight;
    write.textContent = '';
    hint.textContent = 'CTRL+ENTER SEND · ESC BACK';

    const ta = el('textarea');
    ta.rows = 3;
    ta.placeholder = 'TYPE IT HERE';
    ta.setAttribute('aria-label', `Your note about ${branch.label}`);

    // The suggestions FILL THE BOX rather than send. A one-tap answer you
    // cannot then argue with is a leading question, and the argument is the
    // part worth reading.
    const chips = el('div', 'tc-chips');
    for (const s of kit.topics.chipsFor(branch.game, branch.kind)) {
      const c = el('button', null, s);
      c.type = 'button';
      c.addEventListener('click', () => {
        ta.value = ta.value.trim() ? `${ta.value.replace(/\s+$/, '')} ${s}` : s;
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      });
      chips.appendChild(c);
    }

    const row = el('div', 'tc-send-row');
    const send = el('button', 'tc-primary', 'SEND');
    send.type = 'button';
    const back = el('button', null, 'NEVER MIND');
    back.type = 'button';
    row.append(send, back);
    if (!kit.post.configured()) row.appendChild(el('span', null, 'KEPT ON THIS DEVICE'));
    write.append(ta, chips, row);

    send.addEventListener('click', () => sendNote(ta.value.trim(), send));
    back.addEventListener('click', () => cancelBranch());
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send.click(); }
    });
    if (lastInputWasKey) ta.focus();
  }

  const SAID = {
    sent: ['GOT IT. THAT IS IN THE WORKSHOP NOW.'],
    // an opaque no-cors POST cannot be confirmed; say only what is true
    'sent-blind': ['IT LEFT. THAT FORM DOES NOT ANSWER BACK,', 'SO THAT IS ALL I CAN HONESTLY TELL YOU.'],
    queued: ['THE INBOX DID NOT ANSWER. I AM HOLDING IT.', 'IT GOES OUT NEXT TIME YOU COME IN.'],
    off: ['KEPT ON THIS DEVICE. NO INBOX IS SET YET.'],
  };

  async function sendNote(text, send) {
    send.disabled = true;
    const { game, kind, label, kindLabel } = branch;
    // Words are not required — the category alone says which project and which
    // area, which is real signal. But it is worth saying that it is thinner.
    line('tc-you', text ? text.toUpperCase() : `${label} — ${kindLabel}`.toUpperCase());
    write.hidden = true;
    root.classList.remove('is-writing');
    branch = null;
    const how = await kit.post.send({ game, kind, text, ts: Date.now(), source: 'counter' });
    type(text ? (SAID[how] ?? SAID.off)
      : [...(SAID[how] ?? SAID.off), 'WORDS WOULD HAVE HELPED MORE.']);
  }

  function cancelBranch() {
    branch = null;
    write.hidden = true;
    root.classList.remove('is-writing');
    renderMenu();
  }

  // ── open / close ───────────────────────────────────────────────────────
  function openChat() {
    if (open) return;
    open = true;
    root.classList.add('is-open');
    bar.setAttribute('aria-expanded', 'true');
    badge.stop();
    startHead();
    if (!log.childElementCount) type(GREETING);
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
    branch = null;
    write.hidden = true;
    root.classList.remove('is-writing');
    root.classList.remove('is-open');
    bar.setAttribute('aria-expanded', 'false');
    if (typing) { typing.after = null; finishTyping(); }
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
    // Esc backs out of the feedback branch before it leaves the counter — one
    // key, one step, the way a Sierra menu behaves
    if (e.key === 'Escape') {
      e.preventDefault();
      if (branch || !write.hidden) { cancelBranch(); return; }
      close();
      return;
    }
    // while the composer has the caret, digits are words
    if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
    if (e.key === 'Enter' && typing) { e.preventDefault(); finishTyping(); return; }
    if (/^[1-9]$/.test(e.key)) {
      const b = list.querySelectorAll('button')[+e.key - 1];
      if (b && !list.hidden) { e.preventDefault(); b.click(); }
    }
  }

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
    destroy() {
      if (typing) { typing.after = null; finishTyping(); }
      removeEventListener('keydown', onKey);
      removeEventListener('keydown', sawKey, true);
      removeEventListener('pointerdown', sawTap, true);
      badge.destroy(); head.destroy(); root.remove();
    },
  };
}
