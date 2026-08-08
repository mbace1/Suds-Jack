import { P } from './figure.js';

// The remake pose sheet is authored around classic cinematic-platformer
// silhouette rules: long planted contacts, strong counter-swing, low pelvis,
// visible weight transfer, and brief passing poses. These are intentionally
// more extreme than the old procedural keys so the motion reads at 320x192.
export const R = {
  // careful walk — heel/plant/pass/toe rather than three generic step poses
  walkHeel: P( 30,  2, -18, 20, -24,26,  22,20,  5,-2, 1,0,0),
  walkPlant:P( 16, 12,  -8, 28, -16,24,  14,22,  3,-1, 2,0,0),
  walkPass: P( -2, 34,   8,  6,   4,18,  -4,18,  1, 0, 0,0,0),
  walkToe:  P(-18, 22,  28,  4,  22,20, -22,26,  4,-2, 1,0,0),

  // eight-key run — contact/compression/push/flight, mirrored. The pelvis
  // visibly drops on impact and rises through flight; arms counter hard.
  runC1: P( 44,  0, -30, 48, -46,42,  52,34, 18,-5,  2,0,0),
  runD1: P( 26, 22, -18, 58, -34,54,  42,44, 16,-4,  4,0,0),
  runP1: P(  4, 54,   8, 20, -10,70,  18,58, 15,-4, -1,0,0),
  runF1: P(-18, 34,  34,  6,  38,38, -42,48, 17,-6, -4,0,0),
  runC2: P(-30, 48,  44,  0,  52,34, -46,42, 18,-5,  2,0,0),
  runD2: P(-18, 58,  26, 22,  42,44, -34,54, 16,-4,  4,0,0),
  runP2: P(  8, 20,   4, 54,  18,58, -10,70, 15,-4, -1,0,0),
  runF2: P( 34,  6, -18, 34, -42,48,  38,38, 17,-6, -4,0,0),

  startLoad: P( 30,46,  12,40, -38,36,  30,30, 26,-6, 8,1,0),
  startPush: P( 42,14, -28,46, -54,46,  48,38, 24,-7, 2,1,0),
  startFly:  P( -6,54,  20,12,  18,62, -22,58, 18,-6,-4,0,0),

  brakeReach:P( 52, 4, -24,34, -38,30, -30,28,-10, 4, 3,1,0),
  brakePlant:P( 58, 0, -12,30, -24,26, -34,24,-16, 7, 5,0,0),
  brakeSettle:P(26,14,  -4,18, -10,22, -14,20, -5, 3, 3,0,0),

  pivotLoad:P( 20,34,-12,30,  28,44,-26,42,-2, 8, 6,0,0),
  pivotPlant:P(  2,38, -2,38,  44,48,-42,48,-6,12, 7,0,0),
  pivotPush:P(-22,20, 28,18,  50,36,-46,38,16,-5, 2,0,0),

  jumpLoad: P( 52,78, 46,80, -46,42,-50,40,32,-6,11,0,0),
  jumpReach:P( 12,28, 34,44,  78,24, 54,34,24,-9,-5,0,0),
  runTake:  P( 38,10,-28,44,  70,28, 18,52,28,-9,-4,0,0),

  landCatch:P(58,78, 48,80,  42,68, 34,64,34,-7,11,1,0),
  landRun: P( 48,62, 16,40, -26,54, 34,46,28,-8, 7,2,0),
  landRise:P( 28,46, 20,48,  24,48, 18,46,16,-4, 5,1,0),

  catchHit: P(22,36,  8,26,172, 8,168,10,12,-3,-2,0,0),
  catchDrop:P(42,54, 20,38,168,12,164,14,-12,6, 3,0,0),
  shimmyReach:P(30,40,12,26,170,10,154,24,-9,5,1,2,0),
  shimmyPass:P(12,28,30,42,154,24,170,10,-5,3,2,-2,0),

  downTurn:P(34,56,20,46, 52,62,40,56,24,4,6,0,0),
  downSit:P(66,92,56,90,118,56,110,62,40,-2,13,2,0),
  downHands:P(48,68,30,56,160,26,156,28,14,2,8,1,0),

  crouchStepA:P(64,96,44,90,36,68,24,62,30,-7,12,1,0),
  crouchStepB:P(44,88,66,98,22,62,36,68,28,-7,12,1,0),
  lowPlant:P(56,80,18,40,30,54,20,48,26,-4,7,1,0),
  lowDrive:P(32,54,44,66,-20,46,32,44,28,-5,4,3,0),
  lowStand:P(10,24,18,30,8,28,-4,24,10,-3,1,2,0),
  mantleKnee:P(84,98,36,66,96,84,90,80,40,-3,7,3,0),
  mantleRise:P(44,62,22,44,44,50,36,46,22,-4,5,2,0),
};
