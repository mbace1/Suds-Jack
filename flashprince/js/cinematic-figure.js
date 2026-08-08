// Authored cinematic-platformer body frames.
// Screen-space body drawings: physics owns the root/feet, this file owns silhouette.
// v3: denser locomotion based on cinematic-platformer motion phases — distinct
// contact, recoil, pass, high and flight drawings instead of interpolated stick poses.

const P=(pel,sho,head,kn,fn,kf,ff,en,hn,ef,hf)=>({pel,sho,head,kn,fn,kf,ff,en,hn,ef,hf});

const F={
  stand:P([0,-16],[0,-27],[1,-34],[-2,-8],[-2,0],[3,-8],[4,0],[-4,-22],[-3,-15],[4,-22],[4,-15]),

  // 8 authored walk drawings: long planted contacts, low knee lift, visible weight transfer.
  walk0:P([-1,-16],[0,-27],[1,-34],[6,-9],[9,0],[-6,-9],[-7,0],[-6,-23],[-9,-17],[6,-22],[8,-16]),
  walk1:P([-1,-17],[0,-28],[1,-35],[5,-8],[8,0],[-4,-11],[-5,-1],[-5,-23],[-8,-17],[5,-23],[7,-17]),
  walk2:P([0,-18],[1,-29],[2,-36],[3,-8],[5,0],[-1,-13],[-3,-3],[-3,-24],[-6,-17],[3,-24],[6,-17]),
  walk3:P([1,-17],[2,-28],[3,-35],[0,-8],[1,0],[3,-12],[6,-2],[1,-24],[4,-17],[-1,-24],[-4,-17]),
  walk4:P([1,-16],[2,-27],[3,-34],[-6,-9],[-7,0],[6,-9],[9,0],[6,-22],[8,-16],[-6,-23],[-9,-17]),
  walk5:P([1,-17],[2,-28],[3,-35],[-4,-11],[-5,-1],[5,-8],[8,0],[5,-23],[7,-17],[-5,-23],[-8,-17]),
  walk6:P([0,-18],[1,-29],[2,-36],[-1,-13],[-3,-3],[3,-8],[5,0],[3,-24],[6,-17],[-3,-24],[-6,-17]),
  walk7:P([-1,-17],[0,-28],[1,-35],[3,-12],[6,-2],[0,-8],[1,0],[-1,-24],[-4,-17],[1,-24],[4,-17]),

  // 12-frame run. Each half-stride has contact -> recoil -> pass -> high -> flight -> reach.
  // The pelvis describes a real vertical arc instead of sitting at one height.
  run0:P([0,-16],[5,-27],[7,-34],[8,-9],[13,0],[-8,-7],[-13,-1],[-8,-23],[-13,-17],[9,-22],[14,-15]),
  run1:P([1,-17],[6,-28],[8,-35],[7,-7],[11,0],[-5,-11],[-10,-3],[-6,-24],[-11,-17],[8,-23],[13,-15]),
  run2:P([2,-18],[7,-29],[9,-36],[4,-6],[7,0],[-2,-14],[-7,-5],[-3,-25],[-8,-17],[6,-24],[11,-16]),
  run3:P([3,-19],[8,-30],[10,-37],[1,-7],[2,0],[2,-14],[7,-5],[1,-25],[6,-17],[-2,-25],[-7,-17]),
  run4:P([3,-20],[8,-31],[10,-38],[-3,-9],[-7,-2],[5,-12],[10,-3],[5,-25],[10,-17],[-5,-25],[-10,-17]),
  run5:P([2,-19],[7,-30],[9,-37],[-6,-11],[-11,-3],[7,-9],[12,-1],[8,-24],[13,-16],[-7,-25],[-12,-18]),
  run6:P([0,-16],[5,-27],[7,-34],[-8,-7],[-13,-1],[8,-9],[13,0],[9,-22],[14,-15],[-8,-23],[-13,-17]),
  run7:P([1,-17],[6,-28],[8,-35],[-5,-11],[-10,-3],[7,-7],[11,0],[8,-23],[13,-15],[-6,-24],[-11,-17]),
  run8:P([2,-18],[7,-29],[9,-36],[-2,-14],[-7,-5],[4,-6],[7,0],[6,-24],[11,-16],[-3,-25],[-8,-17]),
  run9:P([3,-19],[8,-30],[10,-37],[2,-14],[7,-5],[1,-7],[2,0],[-2,-25],[-7,-17],[1,-25],[6,-17]),
  run10:P([3,-20],[8,-31],[10,-38],[5,-12],[10,-3],[-3,-9],[-7,-2],[-5,-25],[-10,-17],[5,-25],[10,-17]),
  run11:P([2,-19],[7,-30],[9,-37],[7,-9],[12,-1],[-6,-11],[-11,-3],[-7,-25],[-12,-18],[8,-24],[13,-16]),

  gather:P([0,-12],[3,-22],[4,-29],[5,-5],[7,0],[-4,-5],[-6,0],[-7,-18],[-10,-12],[8,-18],[11,-12]),
  jump:P([0,-18],[6,-29],[9,-35],[6,-12],[12,-7],[-5,-11],[-10,-6],[10,-27],[15,-27],[-5,-23],[-10,-20]),
  fall:P([0,-17],[1,-28],[2,-35],[5,-8],[7,-1],[-5,-8],[-7,-1],[-7,-21],[-11,-16],[7,-21],[11,-16]),
  land:P([0,-12],[4,-21],[5,-28],[7,-4],[10,0],[-4,-5],[-7,0],[-6,-17],[-10,-13],[9,-18],[12,-14]),
  hang:P([0,-5],[0,-16],[1,-23],[4,5],[5,13],[-3,5],[-5,13],[-6,-28],[-5,-36],[6,-28],[5,-36]),
};

const WALK=['walk0','walk1','walk2','walk3','walk4','walk5','walk6','walk7'];
const RUN=['run0','run1','run2','run3','run4','run5','run6','run7','run8','run9','run10','run11'];
// Uneven exposure is intentional: contact/recoil read longer than pass/flight.
const RUN_EXPOSURE=[3,2,2,2,1,2,3,2,2,2,1,2];
const WALK_EXPOSURE=[4,3,3,3,4,3,3,3];
function exposed(seq,holds,f){
  let total=0; for(const h of holds) total+=h;
  let t=((f%total)+total)%total;
  for(let i=0;i<seq.length;i++){ if(t<holds[i]) return seq[i]; t-=holds[i]; }
  return seq[0];
}
function key(hero){
  const s=hero.state,f=hero.f||0;
  if(s==='run'||s==='runStart'||s==='runStop'||s==='pivot'||s==='landRun') return exposed(RUN,RUN_EXPOSURE,f);
  if(s==='step') return exposed(WALK,WALK_EXPOSURE,f);
  if(s==='gather'||s==='gatherRun'||s==='crouch'||s==='crouchIdle') return 'gather';
  if(s==='air') return 'jump';
  if(s==='fall') return 'fall';
  if(s==='land'||s==='landHard') return 'land';
  if(s==='hang'||s==='ledgeCatch'||s==='shimmy'||s==='climbDown'||s==='pullUp') return 'hang';
  return 'stand';
}

export function drawCinematicFigure(scr,hero,col){
  const q=F[key(hero)]||F.stand, face=hero.face||1, ox=hero.x, oy=hero.y;
  const pt=a=>({x:ox+a[0]*face,y:oy+a[1]});
  const pel=pt(q.pel),sho=pt(q.sho),head=pt(q.head),kn=pt(q.kn),fn=pt(q.fn),kf=pt(q.kf),ff=pt(q.ff),en=pt(q.en),hn=pt(q.hn),ef=pt(q.ef),hf=pt(q.hf);
  const limb=(a,b,w0,w1,c)=>scr.limb(a.x,a.y,b.x,b.y,w0,w1,c);
  limb(pel,kf,3.4,2.7,col.far); limb(kf,ff,2.7,1.9,col.far);
  limb(sho,ef,2.7,2.1,col.far); limb(ef,hf,2.1,1.5,col.far);
  const vx=sho.x-pel.x,vy=sho.y-pel.y,L=Math.hypot(vx,vy)||1,nx=-vy/L,ny=vx/L;
  scr.poly([pel.x+nx*3.4,pel.y+ny*3.4,pel.x-nx*3.4,pel.y-ny*3.4,sho.x-nx*4.2,sho.y-ny*4.2,sho.x+nx*4.2,sho.y+ny*4.2],col.body);
  limb(pel,kn,3.6,2.8,col.legs); limb(kn,fn,2.8,2.0,col.legs);
  limb(sho,en,2.8,2.1,col.arms); limb(en,hn,2.1,1.6,col.skin);
  const foot=(p,c)=>scr.poly([p.x-2*face,p.y-1,p.x+5*face,p.y-1,p.x+6*face,p.y+1.5,p.x-2*face,p.y+1.5],c);
  foot(ff,col.far); foot(fn,col.legs);
  scr.poly([head.x-3.2*face,head.y-4,head.x+2.2*face,head.y-4,head.x+4*face,head.y-1,head.x+3.2*face,head.y+3.5,head.x-2.6*face,head.y+3.7,head.x-4*face,head.y],col.skin);
  scr.poly([head.x-3.5*face,head.y-4.2,head.x+2.5*face,head.y-4.1,head.x+1.3*face,head.y-1.8,head.x-3.8*face,head.y+1.0],col.hair);
  scr.disc(hn.x,hn.y,1.5,col.skin); scr.disc(hf.x,hf.y,1.4,col.far);
}
