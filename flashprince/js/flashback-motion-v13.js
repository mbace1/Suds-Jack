import { Hero } from './hero.js';
import { P } from './figure.js';

// Flashback-reference motion pass. These are complete authored poses sampled as
// held frames, not interpolated limb targets. The reference baseline is the
// LuigiBlood SNES Conrad sheet (1088x2928); we reproduce the motion language
// with our own simplified body drawing rather than shipping the original art.
const hold=(frames,t)=>{let n=t;for(const [p,d] of frames){if(n<d)return p;n-=d;}return frames[frames.length-1][0];};
const loop=(frames,t)=>{const total=frames.reduce((s,x)=>s+x[1],0);return hold(frames,((t%total)+total)%total);};

const WALK=[
 [P(26,4,-18,30,-20,28,22,24,7,-2,1,-1,0),4],
 [P(18,12,-12,38,-14,34,16,30,8,-2,0,0,0),3],
 [P(8,28,-4,26,-6,36,8,34,8,-2,-1,1,0),2],
 [P(-4,34,8,14,6,32,-4,36,7,-2,-1,1,0),2],
 [P(-18,30,26,4,22,24,-20,28,7,-2,1,-1,0),4],
 [P(-12,38,18,12,16,30,-14,34,8,-2,0,0,0),3],
 [P(-4,26,8,28,8,34,-6,36,8,-2,-1,1,0),2],
 [P(8,14,-4,34,-4,36,6,32,7,-2,-1,1,0),2],
];
const TURN=[
 [P(16,12,-12,22,24,28,-20,26,8,4,2,0,0),3],
 [P(10,20,-8,28,34,36,-30,32,3,8,4,0,0),3],
 [P(2,28,-2,30,44,48,-42,44,-2,12,6,0,0),3],
 [P(-2,30,2,28,-42,44,44,48,-2,12,6,0,0),3],
 [P(-8,28,10,20,-30,32,34,36,3,8,4,0,0),3],
 [P(-12,22,16,12,-20,26,24,28,8,4,2,0,0),3],
];
const GATHER=[[P(38,62,34,68,-34,42,-28,38,22,-5,7,0,0),3],[P(48,78,42,82,-42,50,-36,46,28,-6,9,0,0),3],[P(20,34,36,54,42,34,28,42,21,-7,2,0,0),2]];
const AIR=[
 [P(16,30,40,56,62,34,36,50,20,-8,-3,0,0),3],
 [P(28,50,-10,34,60,48,18,56,17,-7,-3,1,0),4],
 [P(38,66,-4,46,44,60,2,58,11,-5,-2,1,0),5],
 [P(30,58,8,52,24,58,-10,52,7,-3,-1,0,0),5],
 [P(18,34,-20,24,-16,42,-30,36,5,0,0,0,0),99],
];
const LAND=[
 [P(42,66,34,70,18,58,12,54,22,-4,8,0,0),2],
 [P(56,82,48,86,28,66,22,62,28,-5,11,0,0),2],
 [P(38,62,30,66,18,54,12,50,21,-4,8,0,0),2],
 [P(18,34,8,28,12,34,2,30,11,-3,4,0,0),2],
 [P(2,12,-2,10,8,20,-4,18,6,-2,1,0,0),3],
];
const HANG=[
 [P(8,22,-8,18,164,12,158,18,-5,4,0,0,0),8],
 [P(24,34,6,24,166,8,160,14,-9,6,1,0,0),8],
 [P(12,26,-2,20,162,16,156,22,-6,5,0,0,0),8],
];
const PULL=[
 [P(12,26,-4,18,164,12,158,18,-4,4,0,0,0),4],
 [P(30,46,16,34,154,38,150,34,4,3,2,0,0),5],
 [P(48,68,26,50,142,62,138,58,14,1,4,1,0),5],
 [P(66,86,36,64,122,76,118,72,24,-1,6,2,0),5],
 [P(78,94,46,72,96,88,92,84,34,-2,7,3,0),5],
 [P(60,78,34,58,70,70,66,66,28,-3,6,3,0),5],
 [P(38,58,20,42,42,50,36,46,18,-4,4,2,0),5],
 [P(8,18,-2,12,16,24,-8,20,8,-2,1,0,0),6],
];

const basePose=Hero.prototype.pose;
Hero.prototype.pose=function(){
  const s=this.state,f=Math.max(0,this.f-1);
  if(s==='step') return hold(WALK,Math.min(21,f));
  if(s==='turn') return hold(TURN,Math.min(17,f));
  if(s==='gather'||s==='gatherRun') return hold(GATHER,Math.min(7,f));
  if(s==='air') return hold(AIR,f);
  if(s==='fall') return AIR[AIR.length-1][0];
  if(s==='land') return hold(LAND,Math.min(10,f));
  if(s==='hang') return loop(HANG,f);
  if(s==='pullUp') return hold(PULL,Math.min(39,f));
  return basePose.call(this);
};
