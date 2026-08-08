import { Screen, W, H } from './screen.js';
import { paletteAt, C } from './palette.js';
import { ReferenceHero } from './reference-hero.js';
import { Input } from './input.js';
import { drawCinematicFigureV5 } from './cinematic-actions-v5.js';

const T=16,RW=20,RH=12;
const LABS=[
 {spawn:[32,176],map:['                    ','                    ','                    ','                    ','                    ','                    ','                    ','                    ','                    ','                    ','             ###    ','#########   ########']},
 {spawn:[28,176],map:['                    ','                    ','                    ','                    ','                    ','                    ','              ####  ','              ####  ','         ###  ####  ','         ###  ####  ','    ###  ###  ####  ','########     ########']},
 {spawn:[28,160],map:['                    ','                    ','                    ','                    ','                    ','             #####  ','             #####  ','       ####  #####  ','       ####  #####  ',' ####  ####  #####  ',' ####  ####  #####  ','######    ##########']},
 {spawn:[28,176],map:['                    ','                    ','                    ','                    ','                    ','                    ','                    ','             ####   ','             ####   ','       ###   ####   ','   ##  ###   ####   ','#######    #########']},
];
function vine(s,x,y,len,ci){let px=x,py=y;for(let i=0;i<5;i++){const nx=x+Math.sin(i*1.7+x*.07)*5,ny=y+i*len/4;s.line(px,py,nx,ny,ci,.8);if(i>0)s.poly([nx,ny,nx+5,ny+2,nx+1,ny+5],ci);px=nx;py=ny}}
function frond(s,x,y,flip,ci){for(let i=0;i<5;i++){const yy=y+i*3;s.poly([x,yy,x+flip*(18-i*2),yy-5,x+flip*(8-i),yy+2],ci)}}
function trunk(s,x,base,w,h,lean,ci){s.poly([x-w,base,x+w,base,x+lean+w*.45,base-h,x+lean-w*.45,base-h],ci);frond(s,x+lean,base-h,1,ci);frond(s,x+lean,base-h,-1,ci)}
class World{
 constructor(){this.load(0)}
 load(i){this.i=(i+LABS.length)%LABS.length;this.lab=LABS[this.i];this.g=this.lab.map.map(r=>[...r])}
 tile(x,y){return x<0||x>=RW||y<0||y>=RH?' ':this.g[y][x]}
 solidTile(x,y){return this.tile(x,y)==='#'}
 boxSolid(x,y,w,h){const x0=Math.floor(x/T),x1=Math.floor((x+w-1)/T),y0=Math.floor(y/T),y1=Math.floor((y+h-1)/T);for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++)if(this.solidTile(xx,yy))return true;return false}
 ledgeAhead(x,y,face){const tx=Math.floor((x+face*7)/T),target=y-26;for(let ty=Math.floor((target-11)/T);ty<=Math.floor((target+11)/T);ty++){if(!this.solidTile(tx,ty)||this.solidTile(tx,ty-1)||this.solidTile(tx-face,ty))continue;const lipY=ty*T;if(Math.abs(lipY-target)>10)continue;const hx=tx*T+(face>0?-5:T+5);if(!this.boxSolid(hx-4,lipY+3,8,22))return{x:hx,y:lipY,face}}return null}
 ledgeBehind(x,y,face){const tx=Math.floor((x-face*7)/T),ty=Math.floor((y+2)/T);if(!this.solidTile(tx,ty)||this.solidTile(tx,ty-1))return null;const lipY=ty*T;if(Math.abs(lipY-y)>6)return null;const edge=face>0?(tx+1)*T:tx*T,hx=edge+face*5;return this.boxSolid(hx-4,lipY+3,8,22)?null:{x:hx,y:lipY,face:-face}}
 draw(s){s.clear(C.VOID);s.rect(0,0,W,H,C.DARK);s.disc(254,30,18,C.FAR,.42);s.disc(254,30,10,C.NEAR,.22);s.poly([0,68,38,49,74,61,112,42,151,59,194,38,236,55,278,40,320,57,320,116,0,116],C.FAR,.72);for(let x=8;x<330;x+=38)trunk(s,x,137,4,58+(x%27),((x/19)%3-1)*7,C.NEAR);s.veil([0,92,W,82,W,138,0,145],C.SUIT_HI,.06);for(let x=18;x<W;x+=53)vine(s,x,0,25+(x%18),C.EDGE);if(this.i===0){s.poly([18,158,34,149,53,153,57,164,48,169,25,168],C.SOLID);s.line(30,153,47,155,C.EDGE,1);s.disc(48,158,2,C.ALERT,.8)}if(this.i===1){s.line(198,127,244,118,C.EDGE,1);s.disc(245,118,2,C.ALERT,.8);s.line(245,118,257,109,C.FAR,.7)}if(this.i===2){s.poly([252,91,269,85,278,91,272,101,255,101],C.SOLID);s.line(258,93,271,91,C.ALERT,.8)}if(this.i===3){s.line(112,150,128,138,C.EDGE,1);s.line(128,138,144,143,C.EDGE,1);s.disc(128,138,2,C.ALERT,.8)}for(let y=0;y<RH;y++)for(let x=0;x<RW;x++)if(this.solidTile(x,y)){s.rect(x*T,y*T,T,T,C.SOLID);if(!this.solidTile(x,y-1)){s.rect(x*T,y*T,T,2,C.EDGE);s.rect(x*T,y*T+2,T,2,C.NEAR);if((x+this.i)%2===0)frond(s,x*T+8,y*T-1,(x%2?1:-1),C.NEAR)}if((x+y)%3===0)s.rect(x*T+2,y*T+8,7,1,C.FAR)}trunk(s,-3,H+18,8,92,11,C.VOID);trunk(s,W+5,H+20,9,105,-13,C.VOID);frond(s,8,154,1,C.VOID);frond(s,314,143,-1,C.VOID)}
}
class Lab{
 constructor(){this.s=new Screen(document.getElementById('screen'));this.s.setPalette(paletteAt(2.15));this.input=new Input(this.s);this.world=new World();this.flash=0;this.load(0);addEventListener('keydown',e=>{if(/^Digit[1-4]$/.test(e.code))this.load(Number(e.code.slice(-1))-1);if(e.code==='KeyR')this.reset()});this.last=performance.now();this.acc=0;requestAnimationFrame(t=>this.frame(t))}
 load(i){this.world.load(i);this.reset()}
 reset(){const[x,y]=this.world.lab.spawn;this.hero=new ReferenceHero(x,y);this.hero.health=3;this.hero.hasGun=false;this.hero.go('stand')}
 kill(){if(this.hero.dead)return;this.hero.dead=true;this.hero.health=0;this.hero.go('dead');this.flash=8}
 hurt(n){this.hero.health-=n;this.flash=5;if(this.hero.health<=0)this.kill()}
 step(){this.input.poll();if(!this.hero.dead){this.hero.update(this.world,this.input,this);if(this.hero.y>H+40)this.kill()}else if(this.input.anyPress)this.reset();if(this.flash>0)this.flash--;this.input.flush()}
 paint(){const s=this.s;this.world.draw(s);drawCinematicFigureV5(s,this.hero,{far:C.SUIT,body:C.SUIT_HI,legs:C.SUIT,arms:C.SUIT_HI,skin:C.SKIN,hair:C.HAIR});if(this.flash)s.veil([0,0,W,0,W,H,0,H],C.ALERT,.18);s.present()}
 frame(t){this.acc+=Math.min(100,t-this.last);this.last=t;const tick=1000/60;while(this.acc>=tick){this.step();this.acc-=tick}this.paint();requestAnimationFrame(n=>this.frame(n))}
}
new Lab();