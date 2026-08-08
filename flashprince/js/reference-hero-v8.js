import { ReferenceHero } from './reference-hero.js';
import { R } from './movement-poses.js';

// Reference-density timing pass. Keep the original drawings, but expose them as
// more discrete animation moments with shorter holds so locomotion reads as a
// photographed/rotoscoped sequence rather than a handful of poses.
const DENSE={
 step:{dur:24,anticipate:3,commit:14,transition:17,root:[.03,.06,.10,.17,.26,.38,.52,.66,.78,.86,.90,.88,.82,.72,.60,.48,.36,.27,.20,.14,.09,.05,.02,0],clip:[[R.walkHeel,3],[R.walkHeel,3],[R.walkPlant,3],[R.walkPlant,4],[R.walkPass,2],[R.walkPass,3],[R.walkToe,3],[R.walkToe,3]]},
 runStart:{dur:12,anticipate:2,commit:8,transition:10,root:[.12,.24,.40,.62,.86,1.10,1.30,1.46,1.58,1.66,1.68,1.68],clip:[[R.startLoad,2],[R.startLoad,1],[R.startPush,2],[R.startPush,2],[R.startFly,2],[R.runC1,3]]},
 run:{dur:999,loop:true,transition:0,speed:1.68,clip:[[R.runC1,2],[R.runC1,2],[R.runD1,2],[R.runD1,1],[R.runP1,2],[R.runF1,2],[R.runC2,2],[R.runC2,2],[R.runD2,2],[R.runD2,1],[R.runP2,2],[R.runF2,2]]},
 landRun:{dur:14,anticipate:3,commit:6,transition:10,root:[1.22,1.08,.94,.80,.67,.55,.45,.36,.28,.21,.15,.10,.06,.03],clip:[[R.landRun,2],[R.landRun,2],[R.landRise,2],[R.landRise,2],[R.runC1,2],[R.runC1,4]]}
};
export class ReferenceHeroV8 extends ReferenceHero{get move(){return DENSE[this.state]||super.move}}
