// TOKO MIDORI GAMES — the signature.
//
// The one line a game adds to be signed:
//
//   <script type="module">
//     import { sign } from '../toko/js/signature.js';
//     sign();
//   </script>
//
// It puts the badge in a corner and leaves it alone: still, with a blink every
// few seconds. It never takes input unless you give it an `href`, it never
// covers the HUD, and under prefers-reduced-motion it paints one still frame
// and stops.
//
// `counter: true` is the one every signed game uses: the badge becomes a link
// to the counter at the top of the arcade (`../#toko`), so the signature is
// not just a stamp — it is the way to say something about the game you are
// standing in, from inside it.
//
// Rules it enforces so nobody has to remember them:
//   · 44px minimum whenever it is clickable (tap-target floor)
//   · z-index 4 — under the game's HUD, over the game canvas
//   · safe-area insets, so it is never tucked under a phone notch
//   · A LINK ONLY WHERE THERE IS A CURSOR. Under a thumb the badge stays
//     inert, because bottom-left is where half these games put the left
//     stick, and a 44px anchor sitting on it would eat the touch that starts
//     a run. Touch already has a way out — the HOME button hub/shell.js puts
//     in the opposite corner — and a shortcut is not worth breaking movement
//     for. `(pointer: fine)` is the test: a cursor in a corner is not a
//     thumb on one.

import { Surface } from './surface.js';
import { TOKO, VOICE } from './palette.js';
// THE FACE IS THE OWNER'S MASTER (toko/master/, traced in master.js), not the
// GEO measurement face.js still carries for the brand board. BRAND.md §2c: the
// master has no pupils — it is the face at rest, eyes shut, smiling — so the
// badge acts only the way the mark does: a BLINK (the eyes squash to their
// foot) every few seconds. The old "glance up" has nothing to open.
import { drawMasterBadge } from './master.js';
import { glance, pulse } from './util.js';
// a blink: glance()'s smooth in-hold-out, at the speed of an eyelid (0.08s
// down, 0.05s shut, 0.12s up); 0.15 of the arch is left, so the eye is a
// line and not gone
const blink = (t, every, offset) =>
  1 - 0.85 * glance(t, { every, open: 0.08, hold: 0.05, shut: 0.12, offset });
import { hit } from './glitch.js';

let _current = null;

export function sign(opts = {}) {
  const {
    corner = 'bottom-left',
    size = 44,
    counter = false,           // link the badge to the counter on the hub
    href = counter ? new URL('../#toko', location.href).href : null,
    // `open`: a function, and the badge opens the counter IN PLACE instead
    // of leaving — the game keeps its run. The href stays on the anchor, so
    // middle-click and open-in-new-tab still go to the arcade's counter. The
    // thumb rule below is unchanged: under touch the badge is still a
    // picture, and a game that wants him on a phone puts a line on its own
    // pause screen, where a tap cannot collide with the stick.
    open = null,
    // `table: true` is `open` without the game writing any of it: the badge
    // seats Toko at the table over this game, and toko/js/table.js works out
    // which game that is from the path. Pass an object to hand it the game's
    // own seams — `{ pause, resume, cue }` — where it has them. The module is
    // imported on the FIRST PRESS, never on boot, so a game that is never
    // asked pays nothing; a failure to load leaves the badge as a picture
    // rather than as a button that does nothing.
    table = null,
    ground = TOKO.MAGENTA,
    ink = TOKO.PAPER,
    opacity = 0.9,
    blinkEvery = 7.5,
    glitch = false,        // opt-in: most pages want the mark to just sit there
    inset = 12,
    parent = document.body,
    label = counter
      ? `${VOICE.artistRomaji} — ${VOICE.company}`
      : `${VOICE.company} — ${VOICE.cry}`,
  } = opts;

  unsign();

  // A cursor, not a thumb. See the note at the top: on a touchscreen the
  // badge stays a picture, because the corner it sits in belongs to the game.
  const cursor = typeof matchMedia !== 'function' || matchMedia('(pointer: fine)').matches;

  // The table is opened rather than navigated to, so it does not need the href
  // — but it DOES still need a cursor. Bottom-left is where half these games
  // put the left stick, and a 44px control sitting on it would eat the touch
  // that starts a run; touch reaches him through the game's own screens.
  let seat = open;
  if (!seat && table) {
    const cfg = table === true ? {} : table;
    seat = () => import('./table.js?v=5')
      .then(m => m.openTable(cfg))
      .catch(err => console.warn('[toko] the table is unavailable:', err && err.message));
  }
  // Published, because the badge is inert under a thumb by design and a
  // touchscreen still deserves a way to him: hub/shell.js reads this and puts a
  // TOKO button beside HOME on coarse pointers. A global rather than an export
  // for the same reason __tokoTable is one — the page that signs and the shell
  // that offers are different files loaded in no particular order.
  if (seat) {
    globalThis.__tokoSeat = seat;
    try { dispatchEvent(new CustomEvent('toko:seat')); } catch { /* old browser */ }
  }
  const live = (!!href || !!seat) && cursor;

  const host = document.createElement(live ? 'a' : 'div');
  host.className = 'toko-signature';
  if (live) {
    if (href) host.href = href;
    host.title = label;
    host.setAttribute('aria-label', label);
    // Navigate on pointerup, not click — the same trap hub/shell.js hit.
    // These games preventDefault every touch outside their own UI, and a
    // cancelled touchstart takes the synthesised click with it. The href
    // stays: middle-click and open-in-new-tab keep working.
    let leaving = false;
    const go = (e) => {
      if (leaving || (e.type === 'pointerup' && e.button > 0)) return;
      e.preventDefault();
      if (typeof seat === 'function') { seat(e); return; }   // stays; can open again
      leaving = true;
      location.href = href;
    };
    host.addEventListener('pointerup', go);
    host.addEventListener('touchend', go);
    host.addEventListener('click', (e) => { if (leaving) e.preventDefault(); });
  }

  const [vert, horiz] = corner.split('-');
  const px = Math.max(44, size);           // the floor applies whether or not
                                           // it is clickable — below it the
                                           // face's slots close up anyway
  Object.assign(host.style, {
    position: 'fixed',
    zIndex: '4',
    lineHeight: '0',
    opacity: String(opacity),
    pointerEvents: live ? 'auto' : 'none',
    display: 'grid', placeItems: 'center',
    [vert === 'top' ? 'top' : 'bottom']: `max(${inset}px, env(safe-area-inset-${vert === 'top' ? 'top' : 'bottom'}))`,
    [horiz === 'right' ? 'right' : 'left']: `max(${inset}px, env(safe-area-inset-${horiz === 'right' ? 'right' : 'left'}))`,
  });
  parent.appendChild(host);

  const scr = new Surface(host, px, px, live ? {} : { label });

  scr.loop((t) => {
    scr.clear();
    // He rests with his eyes shut — that IS the logo — and every so often
    // looks up. It is the whole animation, because a mark in the corner of
    // somebody else's game should be alive without asking for anything.
    drawMasterBadge(scr.ctx, px / 2, px / 2, px / 2, {
      ground, ink,
      squash: blink(t, blinkEvery, 2.1),
    });
    if (glitch) {
      const k = pulse(t, { every: blinkEvery * 2, len: 0.28, offset: 5 });
      if (k > 0) hit(scr.ctx, px, px, k * 0.7, { seed: 5, t, scan: false });
    }
  });

  _current = {
    el: host, surface: scr,
    destroy() { scr.destroy(); host.remove(); if (_current === this) _current = null; },
  };
  return _current;
}

export function unsign() { if (_current) _current.destroy(); }

// Paint the badge straight into a canvas the caller already owns — for games
// that draw their own UI layer and would rather not carry a second element.
export function paintSignature(ctx, cx, cy, r, opts = {}) {
  const { t = 0, blinkEvery = 7.5, ground = TOKO.MAGENTA, ink = TOKO.PAPER } = opts;
  drawMasterBadge(ctx, cx, cy, r, {
    ground, ink, squash: blink(t, blinkEvery, 2.1),
  });
}
