// Authored cinematic-platformer body frames.
// These are screen-space traced-style joint layouts, not the old 13-angle rig.
// Physics owns the feet/root; this file owns only the silhouette.

const P=(pel,sho,head,kn,fn,kf,ff,en,hn,ef,hf)=>({pel,sho,head,kn,fn,kf,ff,en,hn,ef,hf});

const F={
 stand:P([0,-16],[0,-27],[1,-34],[-2,-8],[-2,0],[3,-8],[4,0],[-4,-22],[-3,-15],[4,-22],[4,-15]),
 walk0:P([-1,-16],[0,-27],[1,-34],[5,-9],[8,0],[-6,-9],[-6,0],[-5,-23],[-8,-17],[5,-22],[7,-16]),
 walk1:P([0,-17],[1,-28],[2,-35],[2,-9],[4,0],[-3,-10],[-1,0],[-3,-23],[-5,-17],[5,-23],[7,-17]),
 walk2:P([1,-16],[2,-27],[3,-34],[-5,-9],[-6,0],[6,-9],[9,0],[5,-23],[8,-17],[-5,-22],[-7,-16]),
 walk3:P([0,-17],[1,-28],[2,-35],[-2,-10],[0,0],[3,-9],[5,0],[3,-23],[5,-17],[-4,-23],[-6,-17]),
 run0:P([0,-17],[4,-28],[6,-35],[7,-10],[12,0],[-7,-8],[-11,-1],[-7,-24],[-11,-18],[8,-23],[12,-17]),
 run1:P([1,-18],[5,-29],[7,-36],[4,-8],[8,0],[-2,-13],[-7,-4],[-3,-25],[-7,-17],[6,-22],[10,-14]),
 run2:P([2,-17],[6,-28],[8,-35],[-1,-7],[-3,0],[4,-13],[8,-5],[4,-24],[9,-17],[-6,-24],[-10,-16]),
 run3:P([1,-19],[5,-30],[7,-37],[-5,-11],[-10,-2],[5,-10],[10,-1],[8,-23],[12,-16],[-5,-25],[-9,-18]),
 run4:P([0,-17],[4,-28],[6,-35],[-7,-8],[-11,-1],[7,-10],[12,0],[8,-23],[12,-17],[-7,-24],[-11,-18]),
 run5:P([1,-18],[5,-29],[7,-36],[-2,-13],[-7,-4],[4,-8],[8,0],[6,-22],[10,-14],[-3,-25],[-7,-17]),
 run6:P([2,-17],[6,-28],[8,-35],[4,-13],[8,-5],[-1,-7],[-3,0],[-6,-24],[-10,-16],[4,-24],[9,-17]),
 run7:P([1,-19],[5,-30],[7,-37],[5,-10],[10,-1],[-5,-11],[-10,-2],[-5,-25],[-9,-18],[8,-23],[12,-16]),
 gather:P([0,-12],[3,-22],[4,-29],[5,-5],[7,0],[-4,-5],[-6,0],[-7,-18],[-10,-12],[8,-18],[11,-12]),
 jump:P([0,-18],[6,-29],[9,-35],[6,-12],[12,-7],[-5,-11],[-10,-6],[10,-27],[15,-27],[-5,-23],[-10,-20]),
 fall:P([0,-17],[1,-28],[2,-35],[5,-8],[7,-1],[-5,-8],[-7,-1],[-7,-21],[-11,-16],[7,-21],[11,-16]),
 land:P([0,-12],[4,-21],[5,-28],[7,-4],[10,0],[-4,-5],[-7,0],[-6,-17],[-10,-13],[9,-18],[12,-14]),
 hang:P([0,-5],[0,-16],[1,-23],[4,5],[5,13],[-3,5],[-5,13],[-6,-28],[-5,-36],[6,-28],[5,-36]),
};

const RUN=['run0','run1','run2','run3','run4','run5','run6','run7'];
const WALK=['walk0','walk1','walk2','walk3'];
function key(hero){
  const s=hero.state,f=hero.f||0;
  if(s==='run'||s==='runStart'||s==='runStop'||s==='pivot'||s==='landRun') return RUN[Math.floor(f/3)%RUN.length];
  if(s==='step') return WALK[Math.floor(f/6)%WALK.length];
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
  // far limbs first: deliberately broad flat shapes like traced polygon animation.
  limb(pel,kf,3.4,2.7,col.far); limb(kf,ff,2.7,1.9,col.far);
  limb(sho,ef,2.7,2.1,col.far); limb(ef,hf,2.1,1.5,col.far);
  // torso as an authored tapered slab, not a generated bone capsule.
  const vx=sho.x-pel.x,vy=sho.y-pel.y,L=Math.hypot(vx,vy)||1,nx=-vy/L,ny=vx/L;
  scr.poly([pel.x+nx*3.4,pel.y+ny*3.4,pel.x-nx*3.4,pel.y-ny*3.4,sho.x-nx*4.2,sho.y-ny*4.2,sho.x+nx*4.2,sho.y+ny*4.2],col.body);
  limb(pel,kn,3.6,2.8,col.legs); limb(kn,fn,2.8,2.0,col.legs);
  limb(sho,en,2.8,2.1,col.arms); limb(en,hn,2.1,1.6,col.skin);
  // elongated feet and angular head produce the classic readable silhouette.
  const foot=(p,c)=>scr.poly([p.x-2*face,p.y-1,p.x+5*face,p.y-1,p.x+6*face,p.y+1.5,p.x-2*face,p.y+1.5],c);
  foot(ff,col.far); foot(fn,col.legs);
  scr.poly([head.x-3.2*face,head.y-4,head.x+2.2*face,head.y-4,head.x+4*face,head.y-1,head.x+3.2*face,head.y+3.5,head.x-2.6*face,head.y+3.7,head.x-4*face,head.y],col.skin);
  scr.poly([head.x-3.5*face,head.y-4.2,head.x+2.5*face,head.y-4.1,head.x+1.3*face,head.y-1.8,head.x-3.8*face,head.y+1.0],col.hair);
  scr.disc(hn.x,hn.y,1.5,col.skin); scr.disc(hf.x,hf.y,1.4,col.far);
}
