// TOKO MIDORI GAMES — the table.
//
// The counter, opened INSIDE a game. The signature in a game's corner has
// always said it is "the way to say something about the game you are standing
// in, from inside it" — and then navigated away, so the run you wanted to
// complain about was gone before you could. This keeps you at the table: the
// game stops underneath, Toko opens over it, Esc or BACK puts you back.
//
// A game says one line and nothing else:
//
//   sign({ corner: 'bottom-left', counter: true, table: true });
//   sign({ ..., table: { pause: () => __xx.pause(), resume: () => __xx.resume(),
//                        cue: () => 'WAVE 4. SAY WHAT YOU THINK' } });
//
// Everything a game would otherwise have to remember is done here, because the
// first integration (Hyper Dagger, v48) paid for every one of these and none
// of them is that game's business:
//
//   · WHICH GAME THIS IS is read off the path against the arcade's own
//     catalogue, so nobody types an id or a title that can go stale.
//   · THE GAME NEVER SEES THE TABLE'S INPUT. Every pointer, mouse, touch, key
//     and wheel event that starts inside the table stops there instead of
//     bubbling on to the window, where these games all listen. That single
//     rule is what stops a tap at the table resuming a paused run, and what
//     stops `touchend` being preventDefault'ed out from under his buttons.
//   · HIS KEYS ARE BOUND TO THE TABLE (`keysOn`), not the window, so "3" picks
//     his third topic without also being whatever 3 does in that game. The
//     table takes focus on open, because a key only passes through this
//     element on its way out if the focus is inside it.
//   · POINTER LOCK IS RELEASED. A locked page sends every real mouse event to
//     the canvas at (0, 0) no matter where the pointer is, so a click on his
//     menu is a click on the floor of the game.
//   · HE IS LAZY. chat.js and the dialogue packs are imported on the first
//     open, never on boot, so a game's module graph does not grow twelve
//     modules for a feature most runs never touch. Offline on a first open he
//     is simply out, and the table says so instead of hanging.
//   · THE ARCADE'S SEAMS ARE SHIMMED. The counter reads `__hub.games` for the
//     rack, `__hub.feedback` to file a note and `__hub.lang` for the language.
//     A game has none of them, so the table supplies the real catalogue and
//     the REAL transport (hub/feedback.js, the file the arcade itself ships) —
//     a note taken at the table lands in the same local archive and the same
//     outbox as one taken on the floor, filed under this game.
//
// What it deliberately does NOT do is stop the game simulating. A game that
// can pause passes `pause`/`resume`; one that cannot is still safe, because
// its input is isolated — it simply keeps running behind him.

const CSS = `
.toko-table {
  position: fixed; inset: 0; z-index: 20;
  display: grid; grid-template-rows: minmax(0, 1fr) auto; justify-items: center;
  gap: 10px; padding: max(14px, env(safe-area-inset-top)) 16px max(14px, env(safe-area-inset-bottom));
  /* dark enough that the screen underneath is a memory, not a second menu:
     at .72 a game's own paused UI read straight through him */
  background: rgba(2, 2, 2, .93);
  font: 13px/1.55 'Courier New', ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--toko-paper, #fff);
}
.toko-table:focus { outline: none; }
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

// Which cabinet is this? Read off the path against the arcade's own catalogue,
// the same question chat.js asks of a referrer — so a game never types its own
// id, and a game that is renamed on the floor is renamed here with it.
// THE SITE ROOT, not this page. A catalogue path is `paperboy/`, written from
// the root the way the arcade's own page reads it — and resolving it against
// `document.baseURI` inside a game gives `/paperboy/paperboy/`, which matches
// nothing. That is not a cosmetic miss: with no cabinet resolved he opens on a
// generic hello and a note files under "the counter" rather than under the
// game you are standing in. This module lives at <root>/toko/js/, so its own
// URL is the one thing on the page that always knows where the root is.
const SITE_ROOT = new URL('../../', import.meta.url);

function whereAmI(games) {
  for (const g of games) {
    if (!g || !g.path) continue;
    let p;
    try { p = new URL(g.path, SITE_ROOT).pathname; } catch { continue; }
    const hit = p.endsWith('/') ? location.pathname.startsWith(p) : location.pathname === p;
    if (hit) return g;
  }
  return null;
}

// The arcade's seams, for a page that is not the arcade. Done once and left in
// place; on the arcade itself (where `__hub` is real) none of this runs.
async function ensureHub(game) {
  const hub = globalThis.__hub;
  if (hub && hub.feedback && hub.games && hub.games.length) return hub;
  let feedback = null, games = game ? [game] : [];
  // ../../: this file lives in toko/js/, the arcade in hub/. The module's
  // namespace IS the transport — hub.js passes it around the same way — so it
  // is used whole rather than reaching for a default export it does not have.
  try { feedback = await import('../../hub/feedback.js'); } catch { feedback = null; }
  try {
    const cat = await import('../../hub/games.js');
    if (Array.isArray(cat.GAMES) && cat.GAMES.length) games = cat.GAMES;
  } catch { /* the catalogue is a nicety here; the game we were given is enough */ }
  return (globalThis.__hub = Object.assign(hub || {}, {
    games, feedback,
    lang: () => document.documentElement.lang || 'en',
  }));
}

export async function whichGame() {
  try {
    const cat = await import('../../hub/games.js');
    return whereAmI(cat.GAMES || []);
  } catch { return null; }
}

// A game publishes its own seams on `globalThis.__tokoTable` and then says
// `sign({ table: true })` and nothing else — the same line in every game. It
// is a plain object rather than an argument because the page that signs and
// the module that knows how to pause are different files, and threading a
// closure from one to the other is how eight games end up with eight slightly
// different integrations.
//
//   window.__tokoTable = {
//     pause:  () => { paused = true; },
//     resume: () => { paused = false; last = performance.now(); },
//     cue:    () => `WAVE ${wave}. SAY WHAT YOU THINK`,   // or null for his own line
//   };
export function openTable(opts = {}) {
  const seams = globalThis.__tokoTable || {};
  const { game = null, cue = opts.cue ?? seams.cue ?? null,
    // `recap(lang)` → a line or lines about the run you were just in, in the
    // GAME's own words: it knows its enemies and its clock; the table only
    // knows how to hand them to him. Optional, and allowed to throw.
    recap = opts.recap ?? seams.recap ?? null,
    pause = opts.pause ?? seams.pause ?? null,
    resume = opts.resume ?? seams.resume ?? null,
    onClose = null, parent = document.body } = opts;
  injectStyle();

  const root = el('div', 'toko-table');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Toko');
  root.tabIndex = -1;                    // so a key has this element in its path
  const panel = el('div', 'tt-panel');
  const back = el('button', 'tt-back', '[ BACK ]');
  back.type = 'button';
  root.append(panel, back);

  // THE ISOLATION. Every one of these starts inside the table and must not
  // reach the window, where the game is listening: a pointerdown that would
  // resume the run, a touchend the game preventDefaults (which kills the
  // synthesised click and makes every button in here dead under a thumb), a
  // key that is his menu shortcut and also the game's control. His own
  // handlers are INSIDE this element, so they have already run.
  for (const type of ['pointerdown', 'pointerup', 'pointermove', 'pointercancel',
    'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu',
    'touchstart', 'touchmove', 'touchend', 'touchcancel',
    'keydown', 'keyup', 'keypress', 'wheel']) {
    root.addEventListener(type, e => e.stopPropagation());
  }

  // He needs a cursor. A game holding pointer lock gets every real mouse event
  // on its canvas at (0, 0) whatever the pointer is doing.
  if (document.pointerLockElement) document.exitPointerLock();

  parent.appendChild(root);
  root.focus({ preventScroll: true });

  let chat = null;
  let closed = false;
  let paused = false;
  try { if (pause) { pause(); paused = true; } } catch (err) { console.warn('[toko-table] pause failed:', err && err.message); }

  const close = () => {
    if (closed) return;
    closed = true;
    if (chat) { try { chat.destroy(); } catch { /* already gone */ } }
    root.remove();
    if (paused && resume) { try { resume(); } catch (err) { console.warn('[toko-table] resume failed:', err && err.message); } }
    if (typeof onClose === 'function') onClose();
  };

  // His Escape closes him first (one step out of the field, the next out of the
  // counter); once he is shut the same key closes the table. Bound HERE and not
  // on the window, for the reason in the header.
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (!chat || !chat.isOpen())) { e.preventDefault(); close(); }
  });

  // pointerup AND touchend, never click — the same trap hub/shell.js and the
  // signature paid for.
  let leaving = false;
  const go = (e) => { if (leaving) return; leaving = true; e.preventDefault(); close(); };
  back.addEventListener('pointerup', go);
  back.addEventListener('touchend', go);

  const ready = (async () => {
    const hub = await ensureHub(game);
    const here = game || whereAmI(hub.games || []);
    try {
      const { mountChat } = await import('./chat.js?v=23');
      if (closed) return null;
      // A cue is a nicety and a game's own code: if it throws, he still opens
      // and falls back to his own line about the cabinet you are standing in.
      let said = null;
      try { said = typeof cue === 'function' ? cue() : cue; }
      catch (err) { console.warn('[toko-table] the cue threw:', err && err.message); }
      let opening = null;
      try {
        const r = typeof recap === 'function' ? recap(document.documentElement.lang || 'en') : recap;
        if (r) opening = (Array.isArray(r) ? r : [r]).map(String).filter(Boolean);
      } catch (err) { console.warn('[toko-table] the recap threw:', err && err.message); }
      chat = mountChat(panel, {
        where: 'in', openOnLoad: true, keysOn: root, cue: said, from: here, opening,
      });
      // what the table decided, for a gate and for a console — the id it
      // resolved from the path is the one a note will file under
      globalThis.__tokoLastTable = { from: here ? here.id : null, cue: said, opening };
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

  return { close, ready, chat: () => chat, el: root, isOpen: () => !closed };
}
