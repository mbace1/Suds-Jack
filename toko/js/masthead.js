// TOKO MIDORI GAMES — the masthead.
//
// The primary lockup, alive: face, three lines, ™. It blinks every few
// seconds and does nothing else. The restraint is the point — this sits at the
// top of the arcade, above the games, and the games are the thing moving.
//
//   import { startMasthead } from '../toko/js/masthead.js';
//   const head = startMasthead(document.querySelector('header'));
//   // head.stop() wherever the page re-renders — otherwise the loop leaks
//   // against a detached canvas (a bug the Game of Life hub already paid for)

import { Surface } from './surface.js';
import { TOKO, VOICE } from './palette.js';
import { drawFace, bounds, GEO } from './face.js';
import { drawLogotype } from './lockup.js';
import { blink, drift } from './util.js';

export function startMasthead(parent, opts = {}) {
  const {
    w = 560, h = 150,
    ink = TOKO.PAPER,
    ground = TOKO.INK,
    blinkEvery = 7.5,
    tagline = VOICE.cry,
    fluid = true,
  } = opts;

  const scr = new Surface(parent, w, h, {
    fluid,
    label: `${VOICE.company} — ${VOICE.cry}`,
  });

  const b = bounds();

  scr.loop((t) => {
    const ctx = scr.ctx;
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, w, h);

    const faceH = h * 0.62;
    const boxW = faceH * (GEO.box / b.h);
    const faceW = boxW * (b.w / GEO.box);
    const x = h * 0.14, y = (h - faceH) / 2;

    // one slow blink, and — because the mouth is a stroked arc and nothing
    // else — a breath of a grin riding under it on a nine-second period
    const k = blink(t, { every: blinkEvery, offset: 1.4 });
    drawFace(ctx, x - (b.x / GEO.box) * boxW, y - (b.y / GEO.box) * boxW, boxW, {
      color: ink,
      squash: 1 - k * 0.92,
      grin: 1 + drift(t) * 0.007,
    });

    const size = faceH / 3.2;
    const tx = x + faceW + h * 0.13;
    drawLogotype(ctx, tx, y, size, { color: ink });

    if (tagline) {
      ctx.save();
      ctx.fillStyle = TOKO.MAGENTA;
      ctx.font = `700 ${size * 0.36}px ${getComputedStyle(document.documentElement)
        .getPropertyValue('--toko-type') || 'sans-serif'}`;
      ctx.fillText(tagline, tx, y + faceH + size * 0.42);
      ctx.restore();
    }
  });

  return { surface: scr, stop: () => scr.stop(), destroy: () => scr.destroy() };
}
