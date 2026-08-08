// The arcade shell — one line in a game's index.html and it gets a way home.
//
//   <script type="module" src="../hub/shell.js?v=21"></script>
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

import { watchPad } from './pad.js?v=9';
import { GAMES } from './games.js?v=25';
import { attachPad, holdKey } from './padkeys.js?v=9';

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

/* The on-screen action button. Only on a touchscreen: a game that says "hold
   anywhere" is discoverable with a mouse the moment you click, but under a
   thumb there is nothing to tell you the screen is the button. It sits in the
   bottom-right where a thumb already is, and it is deliberately large — this
   is the whole control, not a corner affordance. */
.arcade-touch {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(20px, env(safe-area-inset-bottom));
  z-index: 2147482999;
  display: none;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  /* this is injected into twelve pages that style their own buttons, and a
     bare button rule in the host page (min-width: 190px, in tiny2d) turned
     this circle into an ellipse. State the box completely, inherit nothing. */
  box-sizing: border-box;
  width: 92px; height: 92px;
  min-width: 0; min-height: 0; padding: 0; margin: 0;
  border-radius: 50%;
  border: 2px solid rgba(180, 200, 210, .45);
  background: rgba(6, 7, 10, .42);
  color: #e8ecef;
  font: 13px/1 'Courier New', ui-monospace, Menlo, monospace;
  letter-spacing: .12em;
  text-transform: uppercase;
  -webkit-tap-highlight-color: transparent;
  touch-action: none;
  user-select: none;
}
.arcade-touch .sub { font-size: 9px; opacity: .7; letter-spacing: .06em; }
.arcade-touch.down { background: rgba(53, 232, 216, .3); border-color: #35e8d8; }
/* coarse pointer AND no hover: a touchscreen, not a laptop trackpad */
@media (hover: none) and (pointer: coarse) {
  .arcade-touch.on { display: flex; }
}
`;
document.head.appendChild(style);

const home = document.createElement('a');
home.className = 'arcade-home';
home.href = HOME;
home.setAttribute('aria-label', 'Back to the arcade');
home.innerHTML = '<span class="fill"></span><span class="glyph" aria-hidden="true">⌂</span><span>Hub</span>';

// Some games swallow every touch that is not in their own UI — toko-drop
// preventDefaults touchstart outside #overlay so a stray thumb never nudges
// the ship — and a defaultPrevented touchstart means the browser never
// synthesises the click a tap would normally produce. The button worked with a
// mouse and did nothing under a thumb.
//
// Pointer events are a separate stream and survive that, so navigate on
// pointerup over the button rather than waiting for a click. The href stays:
// it is still a link, so middle-click and open-in-new-tab keep working.
// Cancelling touchstart does not merely suppress the click: the pointer stream
// is cancelled with it, so the element gets pointercancel and never pointerup.
// touchend still arrives, so listen for both and take whichever comes.
let leaving = false;
function goHome(e) {
  if (leaving) return;
  if (e.type === 'pointerup' && e.button > 0) return;   // middle/right are the browser's
  leaving = true;
  e.preventDefault();
  location.href = HOME;
}
home.addEventListener('pointerup', goHome);
home.addEventListener('touchend', goHome);
home.addEventListener('click', e => { if (leaving) e.preventDefault(); });

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

// ── the on-screen button, for games whose whole control is one press ───
// Declared per game in the catalogue as `touch: { label, key, sub }`. It holds
// the same key the pad's A button holds, so the thumb and the controller are
// the same code path. CSS decides whether it is ever seen: touchscreens only.
let touchBtn = null;
if (entry?.touch?.key) {
  touchBtn = document.createElement('button');
  touchBtn.className = 'arcade-touch on';
  touchBtn.type = 'button';
  touchBtn.setAttribute('aria-label', entry.touch.label ?? 'Hold');
  touchBtn.innerHTML = `<span>${entry.touch.label ?? 'Hold'}</span>` +
    (entry.touch.sub ? `<span class="sub">${entry.touch.sub}</span>` : '');

  const set = down => {
    touchBtn.classList.toggle('down', down);
    holdKey(entry.touch.key, down);
  };
  // the button is the control, so it must not ALSO reach the game's canvas
  const grab = e => { e.preventDefault(); e.stopPropagation(); set(true); };
  const drop = e => { e.preventDefault(); e.stopPropagation(); set(false); };
  touchBtn.addEventListener('pointerdown', grab);
  touchBtn.addEventListener('touchstart', grab, { passive: false });
  for (const t of ['pointerup', 'pointercancel', 'pointerleave', 'touchend', 'touchcancel']) {
    touchBtn.addEventListener(t, drop, { passive: false });
  }
  const putBtn = () => document.body.appendChild(touchBtn);
  if (document.body) putBtn();
  else document.addEventListener('DOMContentLoaded', putBtn, { once: true });
}

// let a game know the shell is there, in case it wants to hide it during a
// cutscene or move it out of the way of its own HUD
window.__arcadeShell = { home, HOME, game: entry?.id ?? null, pad: padCfg ?? null, bridged, touchBtn };
