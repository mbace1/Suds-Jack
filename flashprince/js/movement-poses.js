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

  // standing jump: deeper preparation than a running takeoff. The body first
  // compresses vertically, then reaches; it does not borrow a running contact.
  jumpLoad:  P( 44, 68,  38, 72, -38, 36, -42, 34, 28, -5,  9,  0, 0),
  jumpReach: P( 16, 24,  30, 42,  72, 28,  48, 38, 22, -8, -4,  0, 0),
  runTake:   P( 28, 18, -22, 40,  62, 34,  18, 48, 24, -8, -3,  0, 0),

  // landing: hands and chest counterbalance before the body regains height.
  landCatch: P( 50, 72,  42, 76,  34, 66,  28, 62, 28, -6, 10,  1, 0),
  landRun:   P( 44, 58,  18, 38, -18, 50,  28, 44, 24, -7,  7,  2, 0),
  landRise:  P( 26, 44,  20, 46,  22, 46,  16, 44, 15, -4,  5,  1, 0),

  // ledge catch: impact first, then the hanging body swings underneath the hands.
  catchHit:  P( 22, 34,   8, 24, 170, 10, 166, 12, 10, -3, -2,  0, 0),
  catchDrop: P( 38, 48,  20, 34, 166, 12, 162, 14, -9,  5,  2,  0, 0),

  // shimmy: the hands remain high while hips and feet travel sideways beneath.
  shimmyReach:P( 28, 38,  10, 24, 168, 12, 154, 22, -8,  5,  1,  2, 0),
  shimmyPass: P( 12, 26,  26, 38, 154, 22, 168, 12, -4,  3,  2, -2, 0),

  // climbing down from the top: turn the chest toward the wall, sit the hips
  // behind the lip, then transfer the body's weight from feet to hands.
  downTurn:  P( 30, 52,  18, 44,  46, 58,  34, 52, 22,  4,  6,  0, 0),
  downSit:   P( 62, 88,  54, 86, 112, 58, 106, 62, 38, -2, 12,  2, 0),
  downHands: P( 44, 64,  28, 52, 158, 28, 154, 30, 12,  2,  7,  1, 0),

  // crouch locomotion: knees stay loaded; each small step shifts the pelvis
  // rather than unfolding into a roll.
  crouchStepA:P( 62, 94,  42, 88,  34, 66,  22, 60, 28, -7, 12,  1, 0),
  crouchStepB:P( 42, 86,  64, 96,  20, 60,  34, 66, 26, -7, 12,  1, 0),

  // low mantle/step-up: one foot owns the low block before the hips rise over it.
  lowPlant:  P( 54, 78,  18, 38,  28, 52,  18, 46, 24, -4,  7,  1, 0),
  lowDrive:  P( 30, 52,  42, 64, -18, 44,  30, 42, 26, -5,  4,  3, 0),
  lowStand:  P( 10, 24,  18, 30,   8, 28,  -4, 24, 10, -3,  1,  2, 0),

  // climb finish: one knee owns the ledge before the torso comes upright.
  mantleKnee:P( 82, 96,  34, 64,  92, 82,  86, 78, 38, -3,  7,  3, 0),
  mantleRise:P( 42, 60,  20, 42,  42, 48,  34, 44, 20, -4,  5,  2, 0),
};
