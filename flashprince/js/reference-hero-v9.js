import { ReferenceHeroV8 } from './reference-hero-v8.js';
import { R } from './movement-poses.js';
import { POSE as Q } from './figure.js';

// v9 completes the secondary locomotion density pass. v8 already covered the
// careful walk and run; these states were still visibly older/sparser beside it.
const DENSE={
  crouch:{dur:10,anticipate:3,commit:5,transition:8,low:true,clip:[[R.landRise,2],[R.crouchStepA,3],[Q.crouch,5]]},
  crouchIdle:{dur:999,loop:true,low:true,transition:0,clip:[[Q.crouch,42],[Q.crouchLo,18],[Q.crouch,42]]},
  crouchWalk:{dur:20,loop:true,low:true,transition:0,
    root:[.10,.14,.19,.24,.29,.33,.36,.38,.36,.32,.26,.20,.14,.12,.15,.20,.26,.31,.28,.18],
    clip:[[R.crouchStepA,3],[R.crouchStepA,2],[Q.crouch,2],[R.crouchStepB,3],[R.crouchStepB,2],[Q.crouch,2],[R.crouchStepA,3],[R.crouchStepB,3]]},
  roll:{dur:30,anticipate:4,commit:18,transition:24,low:true,
    root:[.28,.48,.76,1.08,1.42,1.76,2.02,2.16,2.22,2.20,2.12,1.98,1.80,1.60,1.39,1.18,.98,.80,.64,.50,.38,.28,.20,.14,.09,.06,.04,.02,.01,0],
    clip:[[Q.crouch,3],[Q.tuck,3],[Q.tuck,4],[Q.tuck,4],[Q.tuck,4],[Q.tuck,4],[R.crouchStepB,3],[Q.crouch,5]]},
  lowMantle:{dur:24,anticipate:4,commit:13,transition:20,
    root:[.08,.13,.20,.30,.42,.56,.70,.84,.96,1.04,1.08,1.06,.98,.86,.72,.58,.44,.32,.22,.14,.08,.04,.02,0],
    clip:[[R.lowPlant,3],[R.lowPlant,3],[R.lowDrive,3],[R.lowDrive,4],[R.mantleKnee,3],[R.lowStand,4],[R.lowStand,4]]},
  standUp:{dur:14,anticipate:3,commit:7,transition:11,clip:[[Q.crouch,3],[R.landRise,3],[R.lowStand,4],[Q.stand,4]]}
};

export class ReferenceHeroV9 extends ReferenceHeroV8{
  get move(){return DENSE[this.state]||super.move}
}
