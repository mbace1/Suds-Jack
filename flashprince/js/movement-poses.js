// Flash Prince — Rotoscope 2.0 laboratory keys.
//
// These poses deliberately live beside figure.js until the movement laboratory
// passes. They use the exact same 13-angle skeleton, but are authored as
// transition frames rather than asking stand/run/skid poses to do double duty.
// The silhouette should explain the force: load, plant, push, catch, absorb.

import { P } from './figure.js';

export const R = {
  // run start: weight travels ahead of the rear foot before the first stride.
  startLoad: P( 20, 32, -12, 22, -28, 38,  24, 32, 18, -5,  4,  1, 0),
  startPush: P( 34, 16, -24, 38, -42, 46,  38, 38, 22, -6,  1,  1, 0),
  startFly:  P( 10, 48, -12, 16, -18, 58,  22, 50, 18, -5, -2,  0, 0),

  // braking: hips stay forward while the planting leg moves ahead to catch mass.
  brakeReach: P( 38, 18, -18, 30, -38, 30, -26, 30, -8,  3,  2,  1, 0),
  brakePlant: P( 48, 10,  -8, 26, -30, 28, -32, 26,-14,  6,  5,  0, 0),
  brakeSettle:P( 24, 16,  -6, 16, -12, 24, -16, 22, -4,  3,  3,  0, 0),

  // pivot: centre of mass settles over one planted foot, then shoulders lead out.
  pivotLoad: P( 18, 26, -12, 28,  24, 40, -22, 38, -2,  8,  5,  0, 0),
  pivotPlant:P(  4, 30,  -4, 30,  38, 46, -34, 44, -5, 12,  6,  0, 0),
  pivotPush: P(-18, 20,  24, 18,  42, 34, -40, 36, 14, -5,  2,  0, 0),

  // landing: hands and chest counterbalance before the body regains height.
  landCatch: P( 50, 72,  42, 76,  34, 66,  28, 62, 28, -6, 10,  1, 0),
  landRise:  P( 26, 44,  20, 46,  22, 46,  16, 44, 15, -4,  5,  1, 0),

  // ledge catch: impact first, then the hanging body swings underneath the hands.
  catchHit:  P( 22, 34,   8, 24, 170, 10, 166, 12, 10, -3, -2,  0, 0),
  catchDrop: P( 38, 48,  20, 34, 166, 12, 162, 14, -9,  5,  2,  0, 0),

  // climb finish: one knee owns the ledge before the torso comes upright.
  mantleKnee:P( 82, 96,  34, 64,  92, 82,  86, 78, 38, -3,  7,  3, 0),
  mantleRise:P( 42, 60,  20, 42,  42, 48,  34, 44, 20, -4,  5,  2, 0),
};
