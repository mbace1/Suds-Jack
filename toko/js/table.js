// TOKO MIDORI GAMES — the table.
//
// The counter, opened INSIDE a game. The signature in a game's corner has
// always said it is "the way to say something about the game you are standing
// in, from inside it" — and then navigated away, so the run you wanted to
// complain about was gone before you could. This keeps you at the table: the
// game pauses underneath, Toko opens over it, Esc or BACK puts you back in
// the run you left.
//
//   import { openTable } from '../toko/js/table.js';
//   const t = openTable({ game: { id, title, path }, cue: 'THE SERPENT GOT YOU AT 41.2S' });
//   t.close();
//
// Two rules, both the counter's own, kept here so a game cannot forget them:
//
//   · He is LAZY. chat.js and its dialogue packs are imported on the first
//     open, never on boot — a game's module graph does not grow twelve
//     modules for a feature most runs never touch. Offline on a first open he
//     is simply out, and the table says so instead of hanging.
//   · He needs the arcade's seams and this is not the arcade. chat.js reads
//     `__hub.games` for the rack, `__hub.feedback` to file a note and
//     `__hub.lang` for the language. A game has none of them, so the table
//     shims exactly those three — the REAL feedback transport (hub/feedback.js,
//     the same file the arcade ships), a rack of one, the page's own <html
//     lang>. A note taken here lands in the same local archive and the same
//     outbox as one taken on the floor, filed under this game's id.

const CSS = `
.toko-table {
  position: fixed; inset: 0; z-index: 20;
  display: grid; grid-template-rows: minmax(0, 1fr) auto; justify-items: center;
  gap: 10px; padding: max(14px, env(safe-area-inset-top)) 16px max(14px, env(safe-area-inset-bottom));
  /* dark enough that the screen underneath is a memory, not a second menu:
     at .72 the whole options grid read through him and BACK sat on a row */
  background: rgba(2, 2, 2, .93);
  font: 13px/1.55 'Courier New', ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--toko-paper, #fff);
}
.toko-table .tt-panel { width: min(720px, 100%); min-height: 0; overflow: auto; align-self: center; }
.toko-table .toko-chat { margin: 0; }
.toko-table .tt-out {
  border: 2px solid var(--toko-magenta, #f0027f); padding: 18px; text-align: center;
  letter-spacing: .08em;
}
.toko-table .tt-back {
  font: inherit; letter-spacing: .18em; min-height: 44px; min-width: 44px; padding: 0 22px;
  background: none; color: var(--toko-paper, #fff); border: 1px solid var(--toko-magenta, #f0027f);
  cursor: pointer;
}
.toko-table .tt-back:hover, .toko-table .tt-back:focus-visible { background: rgba(240, 2, 127, .18); outline: none; }
`;

let styled = false;
function injectStyle() {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = CSS;
  document.head.appendChild(s);
}

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

// The arcade's seams, shimmed for a page that is not the arcade. Done once and
// left in place: a second open reuses it, and on the arcade itself (where
// `__hub` is real) nothing here runs at all.
async function ensureHub(game) {
  const hub = globalThis.__hub;
  if (hub && hub.feedback) return;
  let feedback = null;
  // ../../: this file lives in toko/js/, the transport in hub/
  try { feedback = await import('../../hub/feedback.js'); } catch { feedback = null; }
  globalThis.__hub = Object.assign(hub || {}, {
    games: game ? [game] : [],
    feedback,
    lang: () => document.documentElement.lang || 'en',
  });
}

export function openTable(opts = {}) {
  const { game = null, cue = null, onClose = null, parent = document.body } = opts;
  injectStyle();

  const root = el('div', 'toko-table');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Toko');
  const panel = el('div', 'tt-panel');
  const back = el('button', 'tt-back', '[ BACK ]');
  back.type = 'button';
  root.append(panel, back);
  parent.appendChild(root);

  let chat = null;
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    removeEventListener('keydown', onKey);
    if (chat) { try { chat.destroy(); } catch { /* already gone */ } }
    root.remove();
    if (typeof onClose === 'function') onClose();
  };

  // The counter takes Esc first (one steps out of the field, the next closes
  // him); once he is closed the same key closes the table. Registered in
  // bubble order after his, so his preventDefault has already happened and
  // isOpen() is already false by the time this reads it.
  const onKey = (e) => { if (e.key === 'Escape' && (!chat || !chat.isOpen())) close(); };
  addEventListener('keydown', onKey);

  // pointerup AND touchend, never click — the same trap hub/shell.js and the
  // signature paid for: these games cancel touch events on the window, and a
  // cancelled touch takes the synthesised click with it.
  let leaving = false;
  const go = (e) => { if (leaving) return; leaving = true; e.preventDefault(); close(); };
  back.addEventListener('pointerup', go);
  back.addEventListener('touchend', go);

  const ready = (async () => {
    await ensureHub(game);
    try {
      const { mountChat } = await import('./chat.js?v=21');
      if (closed) return null;
      chat = mountChat(panel, { where: 'in', openOnLoad: true, cue, from: game });
      // when he closes himself (Esc, LEAVE), the table goes with him
      const leave = panel.querySelector('.toko-chat .tc-leave');
      if (leave) leave.addEventListener('click', () => setTimeout(close, 0));
      return chat;
    } catch (err) {
      if (closed) return null;
      panel.appendChild(el('p', 'tt-out',
        "HE'S OUT. THE COUNTER NEEDS THE NETWORK THE FIRST TIME YOU OPEN IT."));
      console.warn('[toko-table] counter unavailable:', err && err.message);
      return null;
    }
  })();

  return { close, ready, chat: () => chat, el: root };
}
