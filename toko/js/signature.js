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
import { drawBadge } from './face.js';
import { glance, pulse } from './util.js';
import { hit } from './glitch.js';

let _current = null;

export function sign(opts = {}) {
  const {
    corner = 'bottom-left',
    size = 44,
    counter = false,           // link the badge to the counter on the hub
    href = counter ? new URL('../#toko', location.href).href : null,
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
  const live = !!href && cursor;

  const host = document.createElement(live ? 'a' : 'div');
  host.className = 'toko-signature';
  if (live) {
    host.href = href;
    host.title = label;
    host.setAttribute('aria-label', label);
    // Navigate on pointerup, not click — the same trap hub/shell.js hit.
    // These games preventDefault every touch outside their own UI, and a
    // cancelled touchstart takes the synthesised click with it. The href
    // stays: middle-click and open-in-new-tab keep working.
    let leaving = false;
    const go = (e) => {
      if (leaving || (e.type === 'pointerup' && e.button > 0)) return;
      leaving = true;
      e.preventDefault();
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
    drawBadge(scr.ctx, px / 2, px / 2, px / 2, {
      ground, ink,
      face: { open: glance(t, { every: blinkEvery + 3.5, offset: 2.1 }) },
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
  drawBadge(ctx, cx, cy, r, {
    ground, ink, face: { open: glance(t, { every: blinkEvery + 3.5, offset: 2.1 }) },
  });
}
