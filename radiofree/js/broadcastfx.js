// Radio Free Helsinki — reusable broadcast-direction overlays.
// These are deliberately tiny fixed-grid interventions: human foreground life,
// transmission cuts and DECODE analysis marks. They sit above environment art.

import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';

const W = 128, H = 152;

function person(scr, x, y, phase, d, scale = 1) {
  const c = shade(mix('#071015', '#211508', d), 0.94);
  const step = phase & 1 ? 1 : -1;
  scr.px(x + scale, y, 2 * scale, 3 * scale, c);
  scr.px(x, y + 3 * scale, 4 * scale, 7 * scale, c);
  scr.px(x + step * scale, y + 10 * scale, scale, 5 * scale, c);
  scr.px(x + 3 * scale - step * scale, y + 10 * scale, scale, 5 * scale, c);
}

export function drawPassersby(scr, t, d, laneY = 113) {
  // Rare, readable silhouettes rather than a crowd layer.
  const phase = Math.floor(t * 4);
  const x1 = Math.floor(W + 18 - ((t * 7) % (W + 42)));
  person(scr, x1, laneY + (phase & 1), phase, d, 1);
  if ((Math.floor(t / 8) & 1) === 0) {
    const x2 = Math.floor(-24 + ((t * 4.5) % (W + 55)));
    person(scr, x2, laneY + 6, phase + 1, d, 1);
  }
}

export function drawDecodeAnalysis(scr, t, decode) {
  if (decode < 0.08) return;
  const c = mix(PAL.AMBER_DIM, PAL.AMBER_HOT, decode);
  const a = 0.22 + decode * 0.55;
  const scan = Math.floor((t * 19) % H);
  scr.px(0, scan, W, 1, shade(c, a * 0.45));

  // Moving measurement brackets imply the station is analysing the picture,
  // without adding labels or turning the scene into a dashboard.
  const x = 12 + Math.floor((t * 7) % 67);
  const y = 24 + Math.floor((t * 3) % 43);
  const bw = 26, bh = 20, k = 5;
  scr.px(x, y, k, 1, shade(c, a));
  scr.px(x, y, 1, k, shade(c, a));
  scr.px(x + bw - k, y, k, 1, shade(c, a));
  scr.px(x + bw - 1, y, 1, k, shade(c, a));
  scr.px(x, y + bh - 1, k, 1, shade(c, a));
  scr.px(x, y + bh - k, 1, k, shade(c, a));
  scr.px(x + bw - k, y + bh - 1, k, 1, shade(c, a));
  scr.px(x + bw - 1, y + bh - k, 1, k, shade(c, a));
}

export function drawTransmissionCut(scr, t) {
  // A short analogue acquisition tear at the start of each five-second scene beat.
  const p = t % 5;
  if (p > 0.18) return;
  const y = 18 + Math.floor((p / 0.18) * 105);
  scr.px(0, y, W, 2, shade(PAL.GREEN_DIM, 0.42));
  scr.px(9, y + 3, W - 22, 1, shade(PAL.INK, 0.34));
}

export function drawBroadcastFX(scr, t, decode = 0) {
  drawTransmissionCut(scr, t);
  drawDecodeAnalysis(scr, t, decode);
}