import { ReferenceHeroV9 } from './reference-hero-v9.js';
import { R } from './movement-poses.js';
import { POSE as Q } from './figure.js';

// v10 prioritises the actions that define cinematic-platformer feel in motion:
// braking, reversal, jump preparation and recovery. More exposure changes than
// v9, with deliberately long planted contacts and short passing silhouettes.
const MOVES={
 runStop:{dur:22,anticipate:3,commit:13,transition:18,root:[1.48,1.34,1.18,1.01,.84,.68,.53,.40,.30,.22,.16,.11,.07,.04,.02,0,0,0,0,0,0,0],clip:[[R.brakeReach,3],[R.brakeReach,2],[R.brakePlant,4],[R.brakePlant,3],[R.brakeSettle,4],[Q.stand,6]]},
 pivot:{dur:18,anticipate:4,commit:11,transition:15,root:[.36,.28,.20,.12,.05,0,-.05,-.12,-.22,-.35,-.50,-.64,-.76,-.84,-.88,-.90,-.90,-.90],clip:[[R.pivotLoad,4],[R.pivotPlant,5],[R.pivotPlant,2],[R.pivotPush,3],[R.startPush,2],[R.runC1,2]]},
 gather:{dur:12,anticipate:5,commit:8,transition:10,root:[.04,.03,.02,.01,0,0,.02,.05,.09,.12,.14,.14],clip:[[Q.stand,2],[R.jumpLoad,3],[R.jumpLoad,3],[R.jumpReach,2],[R.jumpReach,2]]},
 gatherRun:{dur:9,anticipate:3,commit:6,transition:8,root:[1.18,.94,.70,.54,.62,.82,1.08,1.30,1.42],clip:[[R.runC1,2],[R.runTake,3],[R.runTake,2],[R.jumpReach,2]]},
 land:{dur:17,anticipate:3,commit:9,transition:14,root:[.32,.24,.16,.09,.04,0,0,0,0,0,0,0,0,0,0,0,0],clip:[[R.landCatch,3],[R.landCatch,3],[R.landRise,3],[R.landRise,3],[Q.stand,5]]},
 landHard:{dur:25,anticipate:4,commit:13,transition:20,root:[.20,.14,.08,.03,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],clip:[[R.landCatch,4],[R.crouchStepA,5],[Q.crouch,5],[R.landRise,5],[Q.stand,6]]}
};
export class ReferenceHeroV10 extends ReferenceHeroV9{get move(){return MOVES[this.state]||super.move}}
