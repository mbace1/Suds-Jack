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
// Rules it enforces so nobody has to remember them:
//   · 44px minimum whenever it is clickable (tap-target floor)
//   · z-index 4 — under the game's HUD, over the game canvas
//   · safe-area insets, so it is never tucked under a phone notch

import { Surface } from './surface.js';
import { TOKO, VOICE } from './palette.js';
import { drawBadge } from './face.js';
import { blink, pulse } from './util.js';
import { hit } from './glitch.js';

let _current = null;

export function sign(opts = {}) {
  const {
    corner = 'bottom-left',
    size = 44,
    href = null,
    ground = TOKO.MAGENTA,
    ink = TOKO.PAPER,
    opacity = 0.9,
    blinkEvery = 7.5,
    glitch = false,        // opt-in: most pages want the mark to just sit there
    inset = 12,
    parent = document.body,
    label = `${VOICE.company} — ${VOICE.cry}`,
  } = opts;

  unsign();

  const host = document.createElement(href ? 'a' : 'div');
  host.className = 'toko-signature';
  if (href) {
    host.href = href;
    host.title = label;
    host.setAttribute('aria-label', label);
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
    pointerEvents: href ? 'auto' : 'none',
    display: 'grid', placeItems: 'center',
    [vert === 'top' ? 'top' : 'bottom']: `max(${inset}px, env(safe-area-inset-${vert === 'top' ? 'top' : 'bottom'}))`,
    [horiz === 'right' ? 'right' : 'left']: `max(${inset}px, env(safe-area-inset-${horiz === 'right' ? 'right' : 'left'}))`,
  });
  parent.appendChild(host);

  const scr = new Surface(host, px, px, href ? {} : { label });

  scr.loop((t) => {
    scr.clear();
    // The blink: the eyes squash shut for a beat. It is the whole animation,
    // because a logo in the corner of somebody's game should be alive and
    // should not be asking for anything — and this one takes its time about it.
    const b = blink(t, { every: blinkEvery, offset: 2.1 });
    drawBadge(scr.ctx, px / 2, px / 2, px / 2, {
      ground, ink,
      face: { squash: 1 - b * 0.92 },
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
  const b = blink(t, { every: blinkEvery, offset: 2.1 });
  drawBadge(ctx, cx, cy, r, { ground, ink, face: { squash: 1 - b * 0.92 } });
}
