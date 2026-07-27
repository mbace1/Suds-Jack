// TOKO MIDORI — the masthead.
//
// The living header for the arcade hub: the mask on the left, the name and
// the cry stacked to the right of it, a carrier band rolling down the glass,
// and every eight seconds the whole thing loses its grip for a third of a
// second. Same idiom as the Game of Life's hub scene — a small painted canvas
// that tells you the place is switched on.
//
// Drop-in, from anywhere on the site:
//
//   import { startMasthead } from '../toko/js/masthead.js';
//   const head = startMasthead(document.querySelector('header'));
//   // head.stop() wherever the page re-renders — otherwise the loop leaks
//   // against a detached canvas (a bug the Game of Life hub already paid for)

import { Screen, textWidth } from './pixel.js';
import { TOKO, VOICE } from './palette.js';
import { drawMask, drawWordmark } from './mark.js';
import { hit, pulse, scanlines, carrier } from './glitch.js';

const AW = 224, AH = 56;

export function startMasthead(parent, opts = {}) {
  const {
    scale = 3,
    accent = TOKO.MIDORI,
    tag = VOICE.cry,
    sub = VOICE.terse,
    every = 8.5,
    bg = TOKO.VOID,
    fluid = true,
  } = opts;

  const scr = new Screen(parent, AW, AH, scale, {
    fluid,
    label: `${VOICE.name} — ${VOICE.gloss}. ${tag}`,
  });

  const maskS = 2, maskX = 6, maskY = 4;   // 48×48 — the mask has to hold the
  const tx = maskX + 24 * maskS + 12;      // left of the block against 150px
                                           // of wordmark, so it is drawn big

  const paint = (t) => {
    const { g } = scr;
    g.p(0, 0, AW, AH, bg);

    // a slow field of vertical rules behind everything — the workshop wall
    for (let x = (t * 6) % 14; x < AW; x += 14) g.p(x, 0, 1, AH, TOKO.LINE);

    drawMask(g, maskX, maskY, { scale: maskS, reg: 'LIVE' });

    drawWordmark(g, tx, 12, { scale: 2, color: TOKO.BONE, track: 2 });
    g.p(tx, 28, textWidth(VOICE.name, 2, 2), 1, accent);
    drawWordmark(g, tx, 32, { scale: 1, color: accent, text: tag, track: 1 });
    drawWordmark(g, tx, 42, { scale: 1, color: TOKO.ASH, text: sub, track: 1 });

    const k = pulse(t, { every, len: 0.36 });
    if (k > 0) hit(scr.ctx, AW, AH, k, { seed: 3, t, scan: false });

    carrier(scr.ctx, AW, AH, { y: (t * 26) % (AH + 10), height: 2, alpha: 0.13 });
    scanlines(scr.ctx, AW, AH, { darkness: 0.10, gap: 2, phase: t * 7 });
  };

  scr.loop(paint);
  return { screen: scr, stop: () => scr.stop(), destroy: () => scr.destroy() };
}
