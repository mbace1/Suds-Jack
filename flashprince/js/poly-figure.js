// Flash Prince live character renderer — authored 2D frames, no angle rig.
// Each frame is a traced-style set of screen-space joints measured from the feet.
// The locomotion silhouette is therefore authored directly rather than inferred
// from thirteen rotating bones.

const F = (hip,shoulder,head,kf,ff,kb,fb,ef,hf,eb,hb) => ({hip,shoulder,head,kf,ff,kb,fb,ef,hf,eb,hb});

// Coordinates: +x forward, +y down from the foot origin. Standing head is ~-36.
const WALK = [
  F([0,-17],[1,-28],[2,-35],[5,-9],[10,0],[-5,-10],[-7,0],[-5,-23],[-10,-17],[7,-24],[11,-18]),
  F([1,-18],[2,-29],[3,-36],[3,-9],[6,0],[-2,-10],[-5,0],[-3,-24],[-7,-17],[5,-24],[9,-18]),
  F([1,-18],[2,-29],[3,-36],[0,-8],[2,0],[2,-9],[5,0],[0,-24],[-3,-17],[3,-24],[6,-18]),
  F([0,-17],[1,-28],[2,-35],[-5,-10],[-7,0],[5,-9],[10,0],[7,-24],[11,-18],[-5,-23],[-10,-17]),
  F([0,-18],[1,-29],[2,-36],[-2,-10],[-5,0],[3,-9],[6,0],[5,-24],[9,-18],[-3,-24],[-7,-17]),
  F([0,-18],[1,-29],[2,-36],[2,-9],[5,0],[0,-8],[2,0],[3,-24],[6,-18],[0,-24],[-3,-17]),
];

// Eight distinct run keys: contact, compression, passing, flight, mirrored.
const RUN = [
  F([0,-17],[3,-29],[5,-36],[7,-9],[12,0],[-7,-11],[-11,0],[-8,-24],[-14,-16],[10,-23],[16,-16]),
  F([1,-16],[4,-28],[6,-35],[4,-8],[8,0],[-5,-9],[-8,-1],[-6,-24],[-11,-17],[8,-22],[13,-16]),
  F([2,-18],[5,-30],[7,-37],[0,-7],[2,0],[-1,-11],[-4,-1],[-3,-25],[-7,-18],[5,-23],[9,-17]),
  F([2,-20],[5,-31],[7,-38],[-3,-8],[-6,-1],[4,-10],[8,-2],[1,-26],[-2,-19],[1,-23],[3,-18]),
  F([0,-17],[3,-29],[5,-36],[-7,-11],[-11,0],[7,-9],[12,0],[10,-23],[16,-16],[-8,-24],[-14,-16]),
  F([1,-16],[4,-28],[6,-35],[-5,-9],[-8,-1],[4,-8],[8,0],[8,-22],[13,-16],[-6,-24],[-11,-17]),
  F([2,-18],[5,-30],[7,-37],[-1,-11],[-4,-1],[0,-7],[2,0],[5,-23],[9,-17],[-3,-25],[-7,-18]),
  F([2,-20],[5,-31],[7,-38],[4,-10],[8,-2],[-3,-8],[-6,-1],[1,-23],[3,-18],[1,-26],[-2,-19]),
];

const JUMP = [
  F([0,-14],[2,-25],[3,-32],[6,-6],[7,0],[-3,-7],[-4,0],[-7,-18],[-10,-12],[8,-19],[12,-13]),
  F([1,-19],[4,-31],[6,-38],[5,-11],[7,-3],[-4,-12],[-7,-4],[-2,-27],[2,-32],[6,-26],[11,-30]),
  F([2,-21],[5,-32],[7,-39],[2,-9],[7,-5],[-4,-10],[-8,-6],[3,-28],[8,-31],[0,-27],[3,-31]),
  F([1,-20],[4,-31],[6,-38],[-2,-8],[-5,-3],[4,-9],[7,-4],[5,-24],[9,-20],[-4,-25],[-8,-21]),
  F([0,-15],[2,-26],[3,-33],[5,-6],[6,0],[-1,-7],[-2,0],[7,-20],[10,-14],[-6,-21],[-9,-15]),
];

const HANG = [
  F([0,-11],[0,-22],[1,-29],[3,-4],[6,3],[-4,-5],[-7,2],[1,-29],[2,-38],[-2,-29],[-3,-38]),
  F([1,-10],[1,-21],[2,-28],[5,-3],[9,3],[-2,-6],[-4,2],[2,-28],[3,-38],[-1,-28],[-2,-38]),
];

const CROUCH = [
  F([0,-11],[2,-20],[3,-27],[6,-5],[9,0],[-2,-6],[-4,0],[-4,-16],[-8,-11],[6,-17],[9,-12]),
];

function mix(a,b,t){const o={};for(const k of Object.keys(a))o[k]=[a[k][0]+(b[k][0]-a[k][0])*t,a[k][1]+(b[k][1]-a[k][1])*t];return o}
function cycle(frames,f,hold=3){const p=(f/hold)%frames.length,i=Math.floor(p),t=p-i;return mix(frames[i],frames[(i+1)%frames.length],t)}
function one(frames,f,dur){const p=Math.max(0,Math.min(frames.length-1,(f/Math.max(1,dur))*frames.length));const i=Math.min(frames.length-1,Math.floor(p)),j=Math.min(frames.length-1,i+1);return mix(frames[i],frames[j],p-i)}

function frameFor(hero){
  const s=hero.state;
  if(s==='run') return cycle(RUN,hero.f,2.5);
  if(s==='runStart') return one(RUN,Math.max(0,hero.f-1),9);
  if(s==='runStop') return one([...RUN].reverse(),hero.f,20);
  if(s==='step') return cycle(WALK,hero.f,3.5);
  if(s==='gather'||s==='gatherRun'||s==='air'||s==='fall'||s==='land'||s==='landRun'||s==='landHard') return one(JUMP,hero.f,(hero.move?.dur||24));
  if(s==='hang'||s==='ledgeCatch'||s==='shimmy'||s==='climbDown'||s==='pullUp') return cycle(HANG,hero.f,18);
  if(s==='crouch'||s==='crouchIdle'||s==='crouchWalk'||s==='roll') return CROUCH[0];
  if(s==='pivot') return one(WALK,hero.f,16);
  return WALK[2];
}

export function drawPolyFigure(scr,hero,col){
  const q=frameFor(hero),face=hero.face||1,x=hero.x,y=hero.y;
  const P=p=>({x:x+p[0]*face,y:y+p[1]});
  const hip=P(q.hip),sh=P(q.shoulder),hd=P(q.head),kf=P(q.kf),ff=P(q.ff),kb=P(q.kb),fb=P(q.fb),ef=P(q.ef),hf=P(q.hf),eb=P(q.eb),hb=P(q.hb);
  // far limbs first
  scr.limb(hip.x,hip.y,kb.x,kb.y,3.2,2.4,col.far); scr.limb(kb.x,kb.y,fb.x,fb.y,2.5,1.8,col.far);
  scr.limb(sh.x,sh.y,eb.x,eb.y,2.5,2.0,col.far); scr.limb(eb.x,eb.y,hb.x,hb.y,2.0,1.5,col.far);
  // long tapered torso, deliberately less blocky than the old rig
  scr.poly([hip.x-3*face,hip.y,hip.x+3*face,hip.y,sh.x+4*face,sh.y,sh.x-4*face,sh.y],col.body);
  // neck/head silhouette
  scr.limb(sh.x,sh.y,hd.x,hd.y+3,2.1,1.6,col.skin);
  scr.poly([hd.x-3*face,hd.y-3,hd.x+2.5*face,hd.y-3.5,hd.x+4*face,hd.y,hd.x+2.8*face,hd.y+4,hd.x-2.8*face,hd.y+4,hd.x-4*face,hd.y],col.skin);
  scr.poly([hd.x-3.8*face,hd.y-3.2,hd.x+1.8*face,hd.y-4,hd.x+3*face,hd.y-1.6,hd.x-1*face,hd.y-1.2,hd.x-4.2*face,hd.y+1.2],col.hair);
  // near limbs
  scr.limb(hip.x,hip.y,kf.x,kf.y,3.4,2.6,col.legs); scr.limb(kf.x,kf.y,ff.x,ff.y,2.6,1.9,col.legs);
  scr.poly([ff.x-1.5*face,ff.y-1,ff.x+5*face,ff.y-1,ff.x+5.5*face,ff.y+1.5,ff.x-1.5*face,ff.y+1.5],col.legs);
  scr.limb(sh.x,sh.y,ef.x,ef.y,2.6,2.1,col.arms); scr.limb(ef.x,ef.y,hf.x,hf.y,2.1,1.6,col.skin); scr.disc(hf.x,hf.y,1.7,col.skin);
}
