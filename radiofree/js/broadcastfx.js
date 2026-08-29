// Radio Free Helsinki — reusable broadcast-direction overlays.
// These are deliberately tiny fixed-grid interventions: human foreground life,
// transmission cuts and DECODE analysis marks. They sit above environment art.

import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';

const W = 128, H = 152;

const WALK = [
  { bob: 0, armL: -1, armR: 1, legL: -1, legR: 1, footL: -1, footR: 1 },
  { bob: 1, armL: 0, armR: 0, legL: 0, legR: 0, footL: -1, footR: 1 },
  { bob: 0, armL: 1, armR: -1, legL: 1, legR: -1, footL: 1, footR: -1 },
  { bob: 1, armL: 0, armR: 0, legL: 0, legR: 0, footL: 1, footR: -1 },
  { bob: 0, armL: -1, armR: 1, legL: -1, legR: 1, footL: -1, footR: 1 },
  { bob: 0, armL: 1, armR: -1, legL: 1, legR: -1, footL: 1, footR: -1 },
];

function person(scr, x, y, phase, d, scale = 1, facing = 1) {
  const c = shade(mix('#071015', '#211508', d), 0.94);
  const f = WALK[((phase % WALK.length) + WALK.length) % WALK.length];
  const yy = y + f.bob * scale;
  const dir = facing >= 0 ? 1 : -1;
  const leftX = x + scale;
  const rightX = x + 2 * scale;

  // Head and torso stay stable enough to read as a person while limbs carry motion.
  scr.px(x + scale, yy, 2 * scale, 3 * scale, c);
  scr.px(x, yy + 3 * scale, 4 * scale, 6 * scale, c);

  // Arms oppose the leg cycle. One-pixel offsets are enough at this scale.
  scr.px(x + (dir > 0 ? -1 : 4) * scale, yy + (4 + f.armL) * scale, scale, 4 * scale, c);
  scr.px(x + (dir > 0 ? 4 : -1) * scale, yy + (4 + f.armR) * scale, scale, 4 * scale, c);

  // Two distinct leg contacts prevent the old left-right toggle from looking like a shuffle.
  scr.px(leftX + f.legL * scale, yy + 9 * scale, scale, 4 * scale, c);
  scr.px(rightX + f.legR * scale, yy + 9 * scale, scale, 4 * scale, c);
  scr.px(leftX + (f.legL + f.footL) * scale, yy + 13 * scale, 2 * scale, scale, c);
  scr.px(rightX + (f.legR + f.footR) * scale, yy + 13 * scale, 2 * scale, scale, c);
}

export function drawPassersby(scr, t, d, laneY = 113) {
  // Sparse, readable pedestrians. Each gets its own phase and direction so the
  // layer feels inhabited without becoming a looping crowd animation.
  const phase1 = Math.floor(t * 6);
  const x1 = Math.floor(W + 18 - ((t * 7) % (W + 42)));
  person(scr, x1, laneY, phase1, d, 1, -1);

  if ((Math.floor(t / 8) & 1) === 0) {
    const phase2 = Math.floor(t * 5 + 2);
    const x2 = Math.floor(-24 + ((t * 4.5) % (W + 55)));
    person(scr, x2, laneY + 6, phase2, d, 1, 1);
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
