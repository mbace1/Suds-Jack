// Flash Prince — Rotoscope 3.0 presentation pass.
//
// MovementHero owns the collision and root-motion contract. This layer changes
// only the silhouette sampling: more traced keys at the moments the eye notices
// most (stride contact/pass, take-off, landing, braking and ledge impact).

import { MovementHero } from './movement-hero.js';
import { POSE as Q, P, sample } from './figure.js';
import { R } from './movement-poses.js';
import { StateMachine } from '../../game-core/state-machine.js';
import { MOVEMENT_TRANSITIONS } from './movement-state-contract.js';

const V = {
  walkContact: P( 28,  5, -22, 27, -23, 26,  23, 22,  7, -3,  1, 0, 0),
  walkPass:    P(  7, 26,  -8, 11,  -8, 24,  10, 20,  8, -3,  1, 0, 0),
  walkReach:   P(-22, 13,  25,  7,  20, 22, -20, 20,  6, -3,  1, 0, 0),

  runA: P( 39,  6, -34, 49, -43, 49,  43, 37, 18, -5,  0, 0, 0),
  runB: P( 24, 25, -23, 36, -31, 57,  34, 46, 19, -5, -1, 0, 0),
  runC: P(  4, 54,  -9, 13, -13, 67,  17, 54, 17, -5, -3, 0, 0),
  runD: P(-24, 35,  24, 24,  32, 47, -30, 58, 18, -5, -1, 0, 0),
  runE: P(-34, 49,  39,  6,  43, 37, -43, 49, 18, -5,  0, 0, 0),
  runF: P(-23, 36,  24, 25,  34, 46, -31, 57, 19, -5, -1, 0, 0),
  runG: P( -9, 13,   4, 54,  17, 54, -13, 67, 17, -5, -3, 0, 0),
  runH: P( 24, 24, -24, 35, -30, 58,  32, 47, 18, -5, -1, 0, 0),

  jumpStretch: P(  7, 18,  35, 48,  72, 27,  48, 39, 23, -9, -5, 0, 0),
  jumpFloat:   P( 34, 62, -10, 42,  44, 63,  -8, 56, 10, -5, -1, 0, 0),
  fallReach:   P( 16, 33, -24, 26, -18, 44, -34, 38,  5,  1,  0, 0, 0),
  landSquash:  P( 55, 78,  46, 80,  39, 70,  31, 66, 31, -7, 11, 1, 0),

  brake1: P( 43, 16, -18, 31, -42, 31, -31, 31, -10, 4, 3, 1, 0),
  brake2: P( 52,  8,  -7, 27, -33, 29, -35, 27, -16, 7, 6, 0, 0),
  brake3: P( 26, 17,  -5, 17, -13, 25, -17, 23,  -5, 4, 3, 0, 0),

  catchShock: P( 28, 39,  10, 27, 174,  8, 169, 10, 15, -4, -3, 0, 0),
  catchSwing: P( 43, 52,  24, 38, 168, 11, 163, 13,-12,  6,  3, 0, 0),
};

const CLIP = {
  step:      [[V.walkContact,5],[V.walkPass,6],[V.walkReach,5],[Q.step3,6]],
  runStart:  [[R.startLoad,2],[R.startPush,2],[R.startFly,2],[V.runA,3]],
  run:       [[V.runA,3],[V.runB,2],[V.runC,3],[V.runD,2],[V.runE,3],[V.runF,2],[V.runG,3],[V.runH,2]],
  runStop:   [[V.brake1,5],[V.brake2,7],[V.brake3,5],[Q.stand,3]],
  pivot:     [[R.pivotLoad,4],[R.pivotPlant,4],[R.pivotPush,4],[R.startPush,4]],
  gather:    [[R.jumpLoad,5],[V.jumpStretch,3]],
  gatherRun: [[R.runTake,2],[V.jumpStretch,3]],
  air:       [[V.jumpStretch,6],[Q.rise,7],[V.jumpFloat,10],[V.fallReach,40]],
  fall:      [[V.fallReach,48]],
  land:      [[V.landSquash,4],[R.landCatch,4],[R.landRise,3],[Q.stand,2]],
  landRun:   [[V.landSquash,3],[R.landRun,3],[R.landRise,3],[V.runA,2]],
  ledgeCatch:[[V.catchShock,3],[V.catchSwing,5],[Q.hang,4]],
};

export class MovementHeroV3 extends MovementHero {
  go(state, f = 0) {
    if (!this.stateMachine) {
      this.transitionFaults = 0;
      this.stateMachine = new StateMachine({
        initial: this.state || state,
        transitions: MOVEMENT_TRANSITIONS,
        strict: false,
        onTransition: e => { this.lastTransition = e; },
      });
    }
    // The inherited Hero reset path sets `state` directly. Keep the validator
    // synchronized, then let every gameplay transition pass through one gate.
    if (this.stateMachine.state !== this.state) this.stateMachine.state = this.state;
    if (!this.stateMachine.go(state, { localFrame: this.f })) this.transitionFaults++;
    super.go(state, f);
  }

  update(world, input, game) {
    this.stateMachine?.tick();
    return super.update(world, input, game);
  }

  pose() {
    const clip = CLIP[this.state];
    if (!clip) return super.pose();
    return sample(clip, this.f, this.state === 'run');
  }
}