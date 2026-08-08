import { Screen, W } from './screen.js';
import { Input } from './input.js';

// Animation reboot: no legacy hero/figure/movement classes. This file exists
// only to solve the character motion from first principles against classic
// rotoscoped cinematic-platformer reference.
const PAL=['#000000','#24333d','#5f8792','#16232a','#24373b','#152328','#b8c89c','#34433c','#07100f','#79bca8','#d9e7b2','#c58f72','#394e78','#aebbd0','#171a20','#d14b42'];
const C={VOID:0,SKY:2,FAR:3,MID:4,GROUND:7,EDGE:6,DARK:8,SKIN:11,PANTS:12,SHIRT:13,HAIR:14,RED:15};
const GROUND=170;
const P=(pel,sho,head,kn,fn,kf,ff,en,hn,ef,hf)=>({pel,sho,head,kn,fn,kf,ff,en,hn,ef,hf});

// Every frame is a full authored silhouette. These are not interpolated bones.
// The important thing is frame-to-frame body-shape change: pelvis height,
// shoulder angle, head lead/lag, foot contact and counter-swing all move.
const STAND=[
 P([0,-16],[0,-28],[1,-36],[-2,-8],[-2,0],[3,-8],[4,0],[-5,-23],[-4,-15],[5,-22],[5,-15]),
 P([0,-17],[0,-29],[1,-37],[-2,-9],[-2,0],[3,-9],[4,0],[-5,-24],[-4,-16],[5,-23],[5,-16])
];
const WALK=[
 P([-1,-16],[1,-28],[2,-36],[7,-9],[11,0],[-7,-10],[-9,0],[-7,-24],[-11,-17],[7,-23],[10,-16]),
 P([-1,-17],[1,-29],[2,-37],[6,-8],[10,0],[-5,-12],[-7,-2],[-6,-25],[-10,-18],[6,-24],[9,-17]),
 P([0,-18],[2,-30],[3,-38],[4,-8],[7,0],[-2,-14],[-5,-4],[-4,-26],[-8,-18],[4,-25],[8,-17]),
 P([1,-18],[3,-30],[4,-38],[1,-9],[2,0],[2,-14],[6,-4],[1,-26],[5,-18],[-2,-25],[-7,-18]),
 P([1,-17],[3,-29],[4,-37],[-7,-10],[-9,0],[7,-9],[11,0],[7,-23],[10,-16],[-7,-24],[-11,-17]),
 P([1,-18],[3,-30],[4,-38],[-5,-12],[-7,-2],[6,-8],[10,0],[6,-24],[9,-17],[-6,-25],[-10,-18]),
 P([0,-18],[2,-30],[3,-38],[-2,-14],[-5,-4],[4,-8],[7,0],[4,-25],[8,-17],[-4,-26],[-8,-18]),
 P([-1,-17],[1,-29],[2,-37],[2,-14],[6,-4],[1,-9],[2,0],[-2,-25],[-7,-18],[1,-26],[5,-18])
];
const RUN=[
 P([0,-17],[6,-29],[8,-37],[9,-9],[15,0],[-9,-7],[-15,-1],[-10,-25],[-16,-17],[11,-23],[17,-15]),
 P([1,-18],[7,-30],[9,-38],[8,-7],[13,0],[-7,-11],[-12,-3],[-8,-26],[-14,-18],[10,-24],[16,-16]),
 P([2,-19],[8,-31],[10,-39],[5,-6],[9,0],[-3,-15],[-9,-5],[-4,-27],[-10,-19],[7,-25],[13,-17]),
 P([3,-20],[9,-32],[11,-40],[1,-7],[3,0],[2,-15],[8,-5],[1,-27],[7,-19],[-2,-27],[-9,-18]),
 P([3,-21],[9,-33],[11,-41],[-4,-9],[-9,-2],[6,-13],[12,-3],[6,-27],[12,-18],[-6,-27],[-12,-19]),
 P([2,-20],[8,-32],[10,-40],[-7,-12],[-13,-3],[8,-10],[14,-1],[10,-26],[16,-17],[-8,-27],[-14,-20]),
 P([0,-17],[6,-29],[8,-37],[-9,-7],[-15,-1],[9,-9],[15,0],[11,-23],[17,-15],[-10,-25],[-16,-17]),
 P([1,-18],[7,-30],[9,-38],[-7,-11],[-12,-3],[8,-7],[13,0],[10,-24],[16,-16],[-8,-26],[-14,-18]),
 P([2,-19],[8,-31],[10,-39],[-3,-15],[-9,-5],[5,-6],[9,0],[7,-25],[13,-17],[-4,-27],[-10,-19]),
 P([3,-20],[9,-32],[11,-40],[2,-15],[8,-5],[1,-7],[3,0],[-2,-27],[-9,-18],[1,-27],[7,-19]),
 P([3,-21],[9,-33],[11,-41],[6,-13],[12,-3],[-4,-9],[-9,-2],[-6,-27],[-12,-19],[6,-27],[12,-18]),
 P([2,-20],[8,-32],[10,-40],[8,-10],[14,-1],[-7,-12],[-13,-3],[-8,-27],[-14,-20],[10,-26],[16,-17])
];
const TURN=[
 P([0,-17],[3,-29],[4,-37],[5,-8],[7,0],[-5,-8],[-7,0],[8,-24],[12,-17],[-8,-24],[-12,-17]),
 P([0,-15],[1,-27],[2,-35],[4,-6],[5,0],[-4,-6],[-5,0],[11,-23],[15,-16],[-11,-23],[-15,-16]),
 P([0,-14],[0,-25],[1,-33],[3,-5],[4,0],[-3,-5],[-4,0],[12,-22],[16,-15],[-12,-22],[-16,-15]),
 P([0,-14],[0,-25],[-1,-33],[-3,-5],[-4,0],[3,-5],[4,0],[-12,-22],[-16,-15],[12,-22],[16,-15]),
 P([0,-16],[-3,-28],[-4,-36],[-6,-8],[-9,0],[5,-8],[7,0],[-10,-24],[-15,-17],[9,-24],[14,-17])
];
const JUMP=[
 P([0,-13],[3,-24],[4,-32],[7,-5],[10,0],[-6,-5],[-9,0],[-9,-19],[-13,-13],[10,-19],[14,-13]),
 P([1,-16],[7,-28],[9,-36],[8,-10],[14,-4],[-6,-10],[-12,-4],[7,-26],[13,-30],[-4,-23],[-10,-20]),
 P([2,-20],[9,-32],[11,-40],[5,-14],[12,-9],[-3,-13],[-10,-8],[13,-30],[18,-27],[-8,-26],[-15,-23]),
 P([2,-22],[8,-34],[10,-42],[1,-14],[8,-10],[1,-14],[-6,-10],[10,-29],[16,-24],[-9,-29],[-15,-24]),
 P([1,-22],[6,-34],[8,-42],[0,-13],[7,-9],[3,-13],[-5,-9],[8,-28],[14,-23],[-8,-28],[-14,-23]),
 P([0,-20],[3,-31],[5,-39],[-4,-11],[3,-5],[6,-11],[-1,-5],[1,-24],[7,-19],[-2,-24],[-8,-19])
];
const LAND=[
 P([1,-15],[5,-25],[6,-33],[9,-6],[13,0],[-4,-7],[-7,0],[-8,-21],[-12,-15],[10,-21],[14,-16]),
 P([1,-12],[5,-22],[6,-30],[10,-4],[14,0],[-3,-5],[-6,0],[-8,-18],[-12,-13],[11,-19],[15,-14]),
 P([0,-11],[4,-20],[5,-28],[9,-3],[13,0],[-2,-4],[-5,0],[-7,-16],[-11,-11],[11,-17],[14,-12]),
 P([0,-14],[2,-25],[3,-33],[5,-7],[7,0],[1,-8],[-1,0],[-3,-21],[-6,-14],[6,-21],[9,-14]),
 P([0,-16],[0,-28],[1,-36],[-2,-8],[-2,0],[3,-8],[4,0],[-5,-23],[-4,-15],[5,-22],[5,-15])
];
const HANG=[
 P([0,-5],[0,-17],[1,-25],[5,6],[7,14],[-4,5],[-6,13],[-7,-30],[-6,-39],[7,-30],[6,-39]),
 P([1,-4],[1,-16],[2,-24],[7,8],[9,16],[-2,4],[-4,12],[-6,-30],[-5,-39],[8,-30],[7,-39])
];
const PULL=[
 HANG[0],
 P([1,-8],[2,-19],[3,-27],[7,2],[9,10],[-1,4],[-3,12],[-7,-30],[-4,-37],[7,-29],[6,-36]),
 P([2,-12],[4,-23],[5,-31],[10,-2],[12,6],[3,2],[1,10],[-6,-27],[-2,-32],[8,-26],[10,-31]),
 P([3,-15],[6,-26],[7,-34],[11,-5],[13,3],[7,-1],[6,7],[-4,-24],[1,-28],[9,-23],[12,-27]),
 P([2,-17],[5,-29],[6,-37],[8,-8],[10,0],[4,-8],[5,0],[0,-23],[4,-16],[5,-23],[8,-16])
];
const clips={stand:[STAND,[45,45]],walk:[WALK,[4,3,3,3,4,3,3,3]],run:[RUN,[3,2,2,2,1,2,3,2,2,2,1,2]],turn:[TURN,[3,3,3,3,4]],jump:[JUMP,[4,3,3,4,4,99]],land:[LAND,[2,2,3,3,5]],hang:[HANG,[42,42]],pull:[PULL,[5,6,7,8,10]]};
function frameOf(name,f){const [a,h]=clips[name];let total=h.reduce((x,y)=>x+y,0),t=(name==='stand'||name==='walk'||name==='run'||name==='hang')?f%total:Math.min(f,total-1);for(let i=0;i<a.length;i++){if(t<h[i])return a[i];t-=h[i]}return a[a.length-1]}
function pt(x,y,face,a){return{x:x+a[0]*face,y:y+a[1]}}
function body(s,x,y,face,q){
 const pel=pt(x,y,face,q.pel),sho=pt(x,y,face,q.sho),head=pt(x,y,face,q.head),kn=pt(x,y,face,q.kn),fn=pt(x,y,face,q.fn),kf=pt(x,y,face,q.kf),ff=pt(x,y,face,q.ff),en=pt(x,y,face,q.en),hn=pt(x,y,face,q.hn),ef=pt(x,y,face,q.ef),hf=pt(x,y,face,q.hf);
 s.limb(pel.x,pel.y,kf.x,kf.y,3.4,2.4,C.DARK);s.limb(kf.x,kf.y,ff.x,ff.y,2.5,1.8,C.DARK);s.limb(sho.x,sho.y,ef.x,ef.y,2.6,1.8,C.PANTS);s.limb(ef.x,ef.y,hf.x,hf.y,1.9,1.2,C.PANTS);
 const dx=sho.x-pel.x,dy=sho.y-pel.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;
 s.poly([pel.x+nx*3,pel.y+ny*3,pel.x-nx*3,pel.y-ny*3,sho.x-nx*5.2,sho.y-ny*5.2,sho.x+nx*5.2,sho.y+ny*5.2],C.SHIRT);
 s.poly([pel.x-4*face,pel.y-3,pel.x+4.5*face,pel.y-3,pel.x+4*face,pel.y+3,pel.x-4*face,pel.y+3],C.PANTS);
 s.limb(pel.x,pel.y,kn.x,kn.y,3.8,2.8,C.PANTS);s.limb(kn.x,kn.y,fn.x,fn.y,2.9,1.9,C.PANTS);s.limb(sho.x,sho.y,en.x,en.y,2.9,2,C.SHIRT);s.limb(en.x,en.y,hn.x,hn.y,2,1.3,C.SKIN);
 const boot=(p,c)=>s.poly([p.x-3*face,p.y-2,p.x+4*face,p.y-2,p.x+7*face,p.y,p.x+5*face,p.y+2,p.x-3*face,p.y+2],c);boot(ff,C.DARK);boot(fn,C.PANTS);
 s.poly([head.x-3*face,head.y-5,head.x+2*face,head.y-5,head.x+4*face,head.y-2,head.x+3*face,head.y+3,head.x+1*face,head.y+4,head.x-3*face,head.y+3],C.SKIN);s.poly([head.x-4*face,head.y-5,head.x+2*face,head.y-5,head.x+1*face,head.y-2,head.x-4*face,head.y],C.HAIR);
}
class Lab{
 constructor(){this.s=new Screen(document.getElementById('screen'));this.s.setPalette(PAL);this.input=new Input(this.s);this.x=60;this.y=GROUND;this.face=1;this.state='stand';this.f=0;this.vx=0;this.vy=0;this.hold=0;this.last=performance.now();this.acc=0;requestAnimationFrame(t=>this.loop(t))}
 go(s){this.state=s;this.f=0}
 step(){this.input.poll();const d=this.input.dir;this.f++;
  if(this.state==='stand'){if(this.input.jumpPress){this.go('jump');this.vx=0;this.vy=-3.25}else if(d){this.face=d;this.hold=1;this.go('walk')}}
  else if(this.state==='walk'){this.x+=.72*this.face;this.hold=d===this.face?this.hold+1:0;if(this.input.jumpPress){this.go('jump');this.vx=.85*this.face;this.vy=-3.3}else if(d===-this.face)this.go('turn');else if(!d)this.go('stand');else if(this.hold>18)this.go('run')}
  else if(this.state==='run'){this.x+=1.72*this.face;if(this.input.jumpPress){this.go('jump');this.vx=1.75*this.face;this.vy=-3.45}else if(d===-this.face)this.go('turn');else if(!d)this.go('land')}
  else if(this.state==='turn'){if(this.f===9)this.face*=-1;if(this.f>15)this.go(d? 'walk':'stand')}
  else if(this.state==='jump'){this.x+=this.vx;this.y+=this.vy;this.vy+=.18;if(this.y>=GROUND){this.y=GROUND;this.vx=0;this.vy=0;this.go('land')}}
  else if(this.state==='land'){if(this.f>14)this.go(d?'walk':'stand')}
  if(this.input.up && this.x>211&&this.x<252&&this.y===GROUND){this.x=221;this.y=142;this.go('hang')}
  if(this.state==='hang'&&this.input.up){this.go('pull')}
  if(this.state==='pull'){this.y-=.55;if(this.f>35){this.y=118;this.x=230;this.go('stand')}}
  this.x=Math.max(18,Math.min(W-18,this.x));this.input.flush();}
 draw(){const s=this.s;s.clear(C.VOID);s.rect(0,0,320,192,C.SKY);s.rect(0,96,320,96,C.FAR);s.rect(0,GROUND,320,22,C.GROUND);s.rect(0,GROUND,320,2,C.EDGE);s.rect(210,118,58,52,C.GROUND);s.rect(210,118,58,2,C.EDGE);s.line(20,150,190,150,C.MID,1);s.text('ANIMATION REBOOT / MOTION ONLY',10,10,C.EDGE,7);s.text('hold left/right: walk -> run   jump: up/space',10,20,C.EDGE,6);s.text('up at raised block: hang / pull-up',10,29,C.EDGE,6);const clip=this.state==='jump'?'jump':this.state;body(s,this.x,this.y,this.face,frameOf(clips[clip]?clip:'stand',this.f));s.present()}
 loop(t){this.acc+=Math.min(100,t-this.last);this.last=t;while(this.acc>=1000/60){this.step();this.acc-=1000/60}this.draw();requestAnimationFrame(n=>this.loop(n))}}
new Lab();
