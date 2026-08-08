import { MovementHero } from './movement-hero.js';
import { R } from './movement-poses.js';

const REF = {
  step: {
    dur: 24, anticipate: 3, commit: 14, transition: 17,
    root: [0.03,0.06,0.10,0.17,0.26,0.38,0.52,0.66,0.78,0.86,0.90,0.88,0.82,0.72,0.60,0.48,0.36,0.27,0.20,0.14,0.09,0.05,0.02,0],
    clip: [[R.walkHeel,6],[R.walkPlant,7],[R.walkPass,5],[R.walkToe,6]],
  },
  runStart: {
    dur: 10, anticipate: 2, commit: 6, transition: 8,
    root: [0.16,0.30,0.52,0.78,1.05,1.30,1.48,1.60,1.66,1.68],
    clip: [[R.startLoad,3],[R.startPush,3],[R.startFly,2],[R.runC1,2]],
  },
  run: {
    dur: 999, loop: true, transition: 0, speed: 1.68,
    // Contact frames hold. Passing/flight frames flash by. This is the visual
    // rhythm of rotoscoped cinematic platformers rather than an even sprite loop.
    clip: [[R.runC1,4],[R.runD1,3],[R.runP1,2],[R.runF1,2],[R.runC2,4],[R.runD2,3],[R.runP2,2],[R.runF2,2]],
  },
  landRun: {
    dur: 12, anticipate: 3, commit: 5, transition: 8,
    root: [1.22,1.03,0.84,0.68,0.54,0.43,0.34,0.27,0.20,0.14,0.09,0.04],
    clip: [[R.landRun,4],[R.landRise,4],[R.runC1,4]],
  },
};

export class ReferenceHero extends MovementHero {
  get move() { return REF[this.state] || super.move; }
}
