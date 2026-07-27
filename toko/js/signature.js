// TOKO MIDORI — the signature.
//
// The one line a game adds to be signed:
//
//   <script type="module">
//     import { sign } from '../toko/js/signature.js';
//     sign();
//   </script>
//
// It stamps the seal into a corner, sits still, and glitches for a third of a
// second every eight seconds or so. It never takes input unless you give it an
// `href`, it never covers the HUD, and it draws nothing at all when the reader
// has asked for reduced motion beyond a single still frame.
//
// Rules it enforces so nobody has to remember them:
//   · the mark is 44px minimum whenever it is clickable (tap-target floor)
//   · it sits UNDER the game's HUD (z-index 4) and over the game canvas
//   · it honours the safe-area insets, so it is never under a phone notch

import { Screen } from './pixel.js';
import { TOKO, VOICE } from './palette.js';
import { drawSeal, drawMask, SEAL } from './mark.js';
import { hit, pulse } from './glitch.js';

const MARKS = {
  seal: { w: SEAL, h: SEAL, draw: (g, o) => drawSeal(g, 0, 0, { scale: 1, color: o.color, knock: o.bg }) },
  mask: { w: 24, h: 24, draw: (g, o) => drawMask(g, 0, 0, { scale: 1, reg: o.reg }) },
};

let _current = null;

export function sign(opts = {}) {
  const {
    corner = 'bottom-left',
    mark = 'seal',
    scale = 2,
    href = null,
    color = TOKO.VERMILION,
    bg = TOKO.VOID,
    reg = 'LIVE',
    opacity = 0.62,
    every = 8,
    inset = 10,
    parent = document.body,
    label = `${VOICE.name} — ${VOICE.cry}`,
  } = opts;

  unsign();

  const spec = MARKS[mark] || MARKS.seal;
  const host = document.createElement(href ? 'a' : 'div');
  host.className = 'toko-signature';
  if (href) {
    host.href = href;
    host.title = label;
    host.setAttribute('aria-label', label);
  }

  const [vert, horiz] = corner.split('-');
  Object.assign(host.style, {
    position: 'fixed',
    zIndex: '4',
    lineHeight: '0',
    opacity: String(opacity),
    pointerEvents: href ? 'auto' : 'none',
    // 44px floor on anything clickable — the same bar the arcade hub holds
    display: 'grid', placeItems: 'center',
    minWidth: href ? '44px' : '0', minHeight: href ? '44px' : '0',
    [vert === 'top' ? 'top' : 'bottom']: `max(${inset}px, env(safe-area-inset-${vert === 'top' ? 'top' : 'bottom'}))`,
    [horiz === 'right' ? 'right' : 'left']: `max(${inset}px, env(safe-area-inset-${horiz === 'right' ? 'right' : 'left'}))`,
  });
  parent.appendChild(host);

  const scr = new Screen(host, spec.w, spec.h, scale, href ? {} : { label });
  const o = { color, bg, reg };

  const paint = (t) => {
    scr.clear();
    spec.draw(scr.g, o);
    const k = pulse(t, { every, len: 0.30, offset: 1.7 });
    // no scanlines at this size: on a 22px mark one line lands on every other
    // logo pixel and stripes the seal instead of glassing it
    if (k > 0) hit(scr.ctx, spec.w, spec.h, k * 0.85, { seed: 5, t, scan: false });
  };

  scr.loop(paint);           // Screen.loop paints one still frame under
                             // prefers-reduced-motion and never starts a rAF

  _current = {
    el: host, screen: scr,
    destroy() { scr.destroy(); host.remove(); if (_current === this) _current = null; },
  };
  return _current;
}

export function unsign() {
  if (_current) _current.destroy();
}

// Paint the seal straight into a canvas the caller already owns — for games
// that draw their own UI layer and would rather not carry a second element.
// `t` drives the same idle pulse, so an in-canvas signature behaves exactly
// like a DOM one.
export function paintSignature(ctx, x, y, opts = {}) {
  const { scale = 1, color = TOKO.VERMILION, knock = TOKO.VOID, t = 0, every = 8 } = opts;
  const g = {
    p: (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, y + py, w, h); },
    art: (rows, ax, ay, map, s) => {
      for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
        const col = map[rows[r][c]];
        if (col) { ctx.fillStyle = col; ctx.fillRect(x + ax + c * s, y + ay + r * s, s, s); }
      }
    },
  };
  const k = pulse(t, { every, len: 0.3, offset: 1.7 });
  drawSeal(g, 0, 0, { scale, color: k > 0.5 ? TOKO.BONE : color, knock });
  return { w: SEAL * scale, h: SEAL * scale };
}
