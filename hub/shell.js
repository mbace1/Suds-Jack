// The arcade shell — one line in a game's index.html and it gets a way home.
//
//   <script type="module" src="../hub/shell.js?v=1"></script>
//
// It adds a HOME button in the top-left corner and a controller binding for
// the same thing, and does nothing else: it installs no key handlers and no
// pointer handlers outside its own button, because every game on this site
// already owns the keyboard, the mouse and the screen.
//
// The pad binding is a HOLD, not a press. Start is the pause button in half
// these games; taking it outright would break them. Hold Start (or Back) for
// three quarters of a second and the button fills up as confirmation before it
// takes you back — long enough that it cannot be hit by accident mid-run,
// short enough that you do not have to wonder whether it is working.

import { watchPad } from './pad.js?v=5';
import { GAMES } from './games.js?v=5';
import { attachPad } from './padkeys.js?v=5';

const HOLD_MS = 750;
const START = 9, BACK = 8;

// the hub is one level up from every game folder; resolve it properly rather
// than assuming, so this also works from a deeper page or a file:// checkout
const HOME = new URL('../', location.href).href;

const style = document.createElement('style');
style.textContent = `
.arcade-home {
  position: fixed;
  top: max(10px, env(safe-area-inset-top));
  left: max(10px, env(safe-area-inset-left));
  z-index: 2147483000;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 10px 13px;
  font: 12px/1 'Courier New', ui-monospace, Menlo, monospace;
  letter-spacing: .14em;
  text-transform: uppercase;
  text-decoration: none;
  color: #cfe4ea;
  background: rgba(6, 7, 10, .62);
  border: 1px solid rgba(180, 200, 210, .3);
  border-radius: 9px;
  backdrop-filter: blur(3px);
  /* dim until wanted: it is a way out, not part of the game */
  opacity: .42;
  transition: opacity .15s, border-color .15s;
  overflow: hidden;
}
.arcade-home:hover, .arcade-home:focus-visible { opacity: 1; border-color: #35e8d8; color: #fff; }
.arcade-home:focus-visible { outline: 2px solid #35e8d8; outline-offset: 3px; }
.arcade-home .glyph { font-size: 14px; line-height: 1; }
/* the hold, made visible: the button fills from the left while Start is down */
.arcade-home .fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  background: rgba(53, 232, 216, .28);
  pointer-events: none;
}
.arcade-home.holding { opacity: 1; border-color: #35e8d8; }
@media print { .arcade-home { display: none; } }
`;
document.head.appendChild(style);

const home = document.createElement('a');
home.className = 'arcade-home';
home.href = HOME;
home.setAttribute('aria-label', 'Back to the arcade');
home.innerHTML = '<span class="fill"></span><span class="glyph" aria-hidden="true">⌂</span><span>Hub</span>';

const put = () => document.body.appendChild(home);
if (document.body) put();
else document.addEventListener('DOMContentLoaded', put, { once: true });

const fill = () => home.querySelector('.fill');

watchPad({
  holdButtons: [START, BACK],
  holdMs: HOLD_MS,
  hold(i, held) {
    const pct = Math.min(1, held / HOLD_MS);
    home.classList.add('holding');
    fill().style.width = `${pct * 100}%`;
    if (pct >= 1) location.href = HOME;
  },
  press() {
    // any press that was not a completed hold clears the fill again
    home.classList.remove('holding');
    fill().style.width = '0%';
  },
});

// ── the pad, for games that never learned to read one ──────────────
// Which cabinet is this? The catalogue already knows every game's folder, so
// match on the path rather than making each page declare itself.
const here = location.pathname.replace(/\/index\.html$/, '/').replace(/([^/])$/, '$1/');
const entry = GAMES.find(g => here.endsWith(`/${g.path}`));
const padCfg = entry && entry.pad !== 'native' ? entry.pad : null;
const bridged = attachPad(padCfg);

// let a game know the shell is there, in case it wants to hide it during a
// cutscene or move it out of the way of its own HUD
window.__arcadeShell = { home, HOME, game: entry?.id ?? null, pad: padCfg ?? null, bridged };
