import { Screen } from './screen.js';
import { Input } from './input.js';

// Animation-only reference lab. Each drawing is a complete silhouette described
// by body landmarks. No old Flash Prince hero, rig, environment or animation
// code is used here. Timing is intentionally low-FPS/uneven: contacts hold,
// passing poses flash quickly, and transitions consume visible time.
const PAL=['#05070a','#111820','#26323b','#141b22','#202932','#0d1218','#9aa7ae','#343d44','#090c10','#66747d','#c3ccd0','#b78368','#344969','#b8c1c8','#15171b','#b54b43'];
const C={BG:0,FAR:2,FLOOR:7,EDGE:6,DARK:8,SKIN:11,PANTS:12,SHIRT:13,HAIR:14};
const FLOOR=170;
const pose=(pel,sho,head,nk,nf,fk,ff,ne,nh,fe,fh)=>({pel,sho,head,nk,nf,fk,ff,ne,nh,fe,fh});
// compact torso + long legs. Coordinates are offsets from the planted baseline.
const IDLE=[pose([0,-19],[0,-34],[1,-44],[-2,-10],[-2,0],[3,-10],[4,0],[-5,-29],[-4,-19],[5,-28],[5,-18])];
const WALK=[
pose([-2,-19],[0,-34],[2,-44],[8,-10],[13,0],[-7,-12],[-10,0],[-8,-29],[-12,-20],[7,-28],[11,-19]),
pose([-1,-20],[1,-35],[3,-45],[6,-9],[10,0],[-5,-15],[-7,-4],[-6,-30],[-10,-21],[6,-29],[10,-20]),
pose([0,-21],[2,-36],[4,-46],[3,-9],[6,0],[-2,-17],[-5,-7],[-3,-31],[-7,-21],[3,-30],[8,-20]),
pose([1,-21],[3,-36],[5,-46],[0,-10],[1,0],[2,-17],[7,-7],[2,-31],[7,-21],[-2,-30],[-8,-20]),
pose([2,-19],[4,-34],[6,-44],[-8,-12],[-10,0],[7,-10],[13,0],[8,-28],[12,-19],[-7,-29],[-11,-20]),
pose([1,-20],[3,-35],[5,-45],[-5,-15],[-7,-4],[6,-9],[10,0],[6,-29],[10,-20],[-6,-30],[-10,-21]),
pose([0,-21],[2,-36],[4,-46],[-2,-17],[-5,-7],[3,-9],[6,0],[3,-30],[8,-20],[-3,-31],[-7,-21]),
pose([-1,-21],[1,-36],[3,-46],[2,-17],[7,-7],[0,-10],[1,0],[-2,-30],[-8,-20],[2,-31],[7,-21])];
const RUN=[
pose([-1,-20],[5,-35],[8,-45],[11,-10],[18,0],[-10,-9],[-18,-2],[-12,-30],[-20,-20],[12,-28],[20,-18]),
pose([0,-22],[7,-37],[10,-47],[9,-7],[15,0],[-8,-14],[-14,-5],[-9,-32],[-16,-22],[11,-30],[18,-20]),
pose([2,-24],[9,-39],[12,-49],[5,-6],[10,0],[-4,-18],[-10,-8],[-5,-33],[-11,-23],[8,-32],[15,-21]),
pose([4,-25],[11,-40],[14,-50],[1,-8],[3,0],[2,-18],[9,-8],[2,-33],[9,-23],[-2,-33],[-10,-22]),
pose([4,-26],[11,-41],[14,-51],[-5,-11],[-11,-3],[7,-16],[14,-5],[7,-33],[14,-22],[-7,-33],[-14,-23]),
pose([2,-24],[9,-39],[12,-49],[-9,-15],[-16,-5],[10,-11],[18,-2],[12,-31],[20,-20],[-10,-33],[-18,-24]),
pose([-1,-20],[5,-35],[8,-45],[-10,-9],[-18,-2],[11,-10],[18,0],[12,-28],[20,-18],[-12,-30],[-20,-20]),
pose([0,-22],[7,-37],[10,-47],[-8,-14],[-14,-5],[9,-7],[15,0],[11,-30],[18,-20],[-9,-32],[-16,-22]),
pose([2,-24],[9,-39],[12,-49],[-4,-18],[-10,-8],[5,-6],[10,0],[8,-32],[15,-21],[-5,-33],[-11,-23]),
pose([4,-25],[11,-40],[14,-50],[2,-18],[9,-8],[1,-8],[3,0],[-2,-33],[-10,-22],[2,-33],[9,-23]),
pose([4,-26],[11,-41],[14,-51],[7,-16],[14,-5],[-5,-11],[-11,-3],[-7,-33],[-14,-23],[7,-33],[14,-22]),
pose([2,-24],[9,-39],[12,-49],[10,-11],[18,-2],[-9,-15],[-16,-5],[-10,-33],[-18,-24],[12,-31],[20,-20])];
const STOP=[RUN[0],pose([2,-21],[8,-35],[10,-45],[13,-8],[20,0],[-7,-12],[-12,-1],[-13,-29],[-20,-19],[8,-29],[14,-20]),pose([3,-18],[7,-31],[9,-41],[14,-5],[20,0],[-5,-10],[-9,0],[-12,-26],[-18,-18],[7,-26],[12,-18]),pose([2,-17],[4,-31],[6,-41],[10,-7],[14,0],[-3,-10],[-5,0],[-9,-26],[-13,-18],[6,-26],[9,-18]),IDLE[0]];
const TURN=[pose([0,-20],[4,-35],[6,-45],[7,-10],[11,0],[-6,-11],[-9,0],[9,-29],[14,-20],[-9,-29],[-14,-20]),pose([0,-17],[1,-31],[2,-41],[5,-7],[7,0],[-5,-7],[-7,0],[12,-27],[17,-18],[-12,-27],[-17,-18]),pose([0,-15],[0,-29],[0,-39],[3,-5],[4,0],[-3,-5],[-4,0],[14,-25],[19,-17],[-14,-25],[-19,-17]),pose([0,-16],[-2,-31],[-3,-41],[-6,-8],[-9,0],[5,-8],[7,0],[-12,-27],[-17,-18],[11,-27],[16,-18])];
const TAKE=[pose([0,-16],[2,-29],[4,-39],[8,-6],[12,0],[-6,-7],[-9,0],[-9,-24],[-14,-16],[9,-24],[14,-16]),pose([1,-20],[6,-35],[8,-45],[9,-12],[15,-5],[-7,-12],[-13,-5],[7,-32],[14,-36],[-5,-29],[-12,-25]),pose([2,-24],[9,-39],[11,-49],[6,-17],[13,-11],[-4,-16],[-11,-10],[14,-37],[20,-33],[-9,-33],[-16,-29])];
const AIR=[pose([2,-26],[9,-41],[11,-51],[2,-17],[10,-12],[1,-17],[-7,-12],[11,-35],[18,-29],[-10,-35],[-17,-29]),pose([1,-25],[7,-40],[9,-50],[-2,-15],[6,-9],[4,-15],[-4,-9],[9,-34],[16,-28],[-9,-34],[-16,-28]),pose([0,-22],[4,-37],[6,-47],[-5,-12],[3,-5],[7,-12],[-1,-5],[3,-30],[10,-23],[-4,-30],[-11,-23])];
const LAND=[pose([1,-18],[5,-32],[7,-42],[10,-8],[15,0],[-5,-9],[-8,0],[-9,-27],[-14,-18],[10,-27],[15,-19]),pose([1,-14],[5,-27],[7,-37],[12,-5],[17,0],[-4,-6],[-7,0],[-9,-22],[-14,-15],[12,-23],[17,-16]),pose([0,-13],[4,-25],[6,-35],[11,-4],[16,0],[-3,-5],[-6,0],[-8,-20],[-13,-13],[12,-21],[16,-14]),pose([0,-17],[2,-31],[3,-41],[6,-8],[8,0],[0,-9],[-2,0],[-4,-26],[-7,-18],[7,-26],[10,-18]),IDLE[0]];
const clips={idle:[IDLE,[60]],walk:[WALK,[5,3,3,2,5,3,3,2]],run:[RUN,[3,2,2,1,2,2,3,2,2,1,2,2]],stop:[STOP,[2,3,4,4,8]],turn:[TURN,[4,4,4,6]],take:[TAKE,[4,3,3]],air:[AIR,[5,5,99]],land:[LAND,[2,3,4,4,8]]};
function frame(name,t){const [a,d]=clips[name];let z=(name==='idle'||name==='walk'||name==='run')?t%d.reduce((s,n)=>s+n,0):t;for(let i=0;i<a.length;i++){if(z<d[i])return a[i];z-=d[i]}return a[a.length-1]}
function p(x,y,f,a){return [x+a[0]*f,y+a[1]]}
function limb(s,a,b,w0,w1,c){s.limb(a[0],a[1],b[0],b[1],w0,w1,c)}
function drawMan(s,x,y,f,q){const pel=p(x,y,f,q.pel),sho=p(x,y,f,q.sho),head=p(x,y,f,q.head),nk=p(x,y,f,q.nk),nf=p(x,y,f,q.nf),fk=p(x,y,f,q.fk),ff=p(x,y,f,q.ff),ne=p(x,y,f,q.ne),nh=p(x,y,f,q.nh),fe=p(x,y,f,q.fe),fh=p(x,y,f,q.fh);limb(s,pel,fk,3.3,2.3,C.DARK);limb(s,fk,ff,2.5,1.7,C.DARK);limb(s,sho,fe,2.5,1.7,C.PANTS);limb(s,fe,fh,1.8,1.1,C.PANTS);const dx=sho[0]-pel[0],dy=sho[1]-pel[1],L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L;s.poly([pel[0]+nx*3,pel[1]+ny*3,pel[0]-nx*3,pel[1]-ny*3,sho[0]-nx*5,sho[1]-ny*5,sho[0]+nx*5,sho[1]+ny*5],C.SHIRT);limb(s,pel,nk,3.7,2.7,C.PANTS);limb(s,nk,nf,2.8,1.8,C.PANTS);limb(s,sho,ne,2.8,1.9,C.SHIRT);limb(s,ne,nh,1.9,1.2,C.SKIN);const boot=a=>s.poly([a[0]-3*f,a[1]-2,a[0]+4*f,a[1]-2,a[0]+7*f,a[1],a[0]+4*f,a[1]+2,a[0]-3*f,a[1]+2],C.DARK);boot(ff);boot(nf);s.poly([head[0]-3*f,head[1]-5,head[0]+2*f,head[1]-5,head[0]+4*f,head[1]-2,head[0]+3*f,head[1]+3,head[0]-2*f,head[1]+4],C.SKIN);s.poly([head[0]-4*f,head[1]-5,head[0]+2*f,head[1]-5,head[0]+1*f,head[1]-2,head[0]-4*f,head[1]],C.HAIR)}
class Lab{constructor(){this.s=new Screen(document.querySelector('#screen'));this.s.setPalette(PAL);this.i=new Input(this.s);this.x=64;this.y=FLOOR;this.face=1;this.state='idle';this.t=0;this.vx=0;this.vy=0;this.held=0;this.last=performance.now();this.acc=0;requestAnimationFrame(t=>this.loop(t))}go(n){this.state=n;this.t=0}step(){this.i.poll();const d=this.i.dir;this.t++;if(this.state==='idle'){if(this.i.jumpPress){this.go('take');this.vx=0}else if(d){this.face=d;this.held=0;this.go('walk')}}else if(this.state==='walk'){this.x+=.62*this.face;this.held++;if(this.i.jumpPress){this.go('take');this.vx=.8*this.face}else if(d===-this.face)this.go('turn');else if(!d)this.go('stop');else if(this.held>24)this.go('run')}else if(this.state==='run'){this.x+=1.55*this.face;if(this.i.jumpPress){this.go('take');this.vx=1.55*this.face}else if(d===-this.face)this.go('turn');else if(!d)this.go('stop')}else if(this.state==='stop'){if(this.t>20)this.go(d?'walk':'idle')}else if(this.state==='turn'){if(this.t===9)this.face*=-1;if(this.t>17){this.held=0;this.go(d?'walk':'idle')}}else if(this.state==='take'){this.x+=this.vx;if(this.t===9){this.vy=-3.35;this.go('air')}}else if(this.state==='air'){this.x+=this.vx;this.y+=this.vy;this.vy+=.18;if(this.y>=FLOOR){this.y=FLOOR;this.vy=0;this.go('land')}}else if(this.state==='land'){if(this.t>20){this.held=0;this.go(d?'walk':'idle')}}this.x=Math.max(28,Math.min(292,this.x));this.i.flush()}paint(){const s=this.s;s.clear(C.BG);s.rect(0,0,320,FLOOR,C.FAR);s.rect(0,FLOOR,320,22,C.FLOOR);s.rect(0,FLOOR,320,2,C.EDGE);for(let x=16;x<320;x+=32)s.rect(x,FLOOR+8,1,4,C.DARK);const clip=this.state==='take'?'take':this.state==='air'?'air':this.state;drawMan(s,this.x,this.y,this.face,frame(clip,this.t));s.text(this.state.toUpperCase(),8,8,C.EDGE,7);s.text('ANIMATION REFERENCE LAB v2',8,18,C.EDGE,6);s.present()}loop(now){this.acc+=Math.min(80,now-this.last);this.last=now;while(this.acc>=1000/60){this.step();this.acc-=1000/60}this.paint();requestAnimationFrame(t=>this.loop(t))}}new Lab();