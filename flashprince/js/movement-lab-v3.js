import { Screen, W, H } from './screen.js';
import { paletteAt, C } from './palette.js';
import { MovementHeroV3 } from './movement-hero-v3.js';
import { Input } from './input.js';
import { drawFigure } from './figure.js';

const T = 16, RW = 20, RH = 12;
const LABS = [
  {
    name: '01 JUNGLE ARRIVAL', note: 'ROTOSCOPE 3.0 · STEP > RUN > BRAKE > PIVOT', spawn: [40,176],
    map: ['                    ','                    ','                    ','                    ','                    ','                    ','                    ','                    ','                    ','                    ','                    ','####################'],
  },
  {
    name: '02 BROKEN TRANSIT', note: '3-TILE RUNNING GAP · LEDGE IMPACT + SWING', spawn: [40,144],
    map: ['                    ','                    ','                    ','                    ','                    ','                    ','              ######','              ######','######   ###########','######   ###########','######   ###########','######   ###########'],
  },
  {
    name: '03 REACTOR SHAFT', note: 'FALL SILHOUETTE · LAND / HARD LAND RECOVERY', spawn: [40,80],
    map: ['                    ','                    ','                    ','                    ','                    ',' #####              ',' #####              ',' #####   #####      ',' #####   #####   ###',' #####   #####   ###',' #####   #####   ###','####################'],
  },
  {
    name: '04 PALACE RUIN', note: 'CROUCH · LOW MANTLE · CLIMB-DOWN · SHIMMY', spawn: [40,176],
    map: ['                    ','                    ','                    ','                    ','                    ','                    ','                    ','                    ','                    ','                    ','        ##          ','############    ####'],
  },
];

class World {
  constructor(){ this.load(0); }
  load(i){ this.i=(i+LABS.length)%LABS.length; this.lab=LABS[this.i]; this.g=this.lab.map.map(r=>[...r]); }
  tile(x,y){ return x<0||x>=RW||y<0||y>=RH?' ':this.g[y][x]; }
  solidTile(x,y){ return this.tile(x,y)==='#'; }
  boxSolid(x,y,w,h){
    const x0=Math.floor(x/T),x1=Math.floor((x+w-1)/T),y0=Math.floor(y/T),y1=Math.floor((y+h-1)/T);
    for(let yy=y0;yy<=y1;yy++) for(let xx=x0;xx<=x1;xx++) if(this.solidTile(xx,yy)) return true;
    return false;
  }
  ledgeAhead(x,y,face){
    const tx=Math.floor((x+face*7)/T),target=y-26;
    for(let ty=Math.floor((target-11)/T);ty<=Math.floor((target+11)/T);ty++){
      if(!this.solidTile(tx,ty)||this.solidTile(tx,ty-1)||this.solidTile(tx-face,ty)) continue;
      const lipY=ty*T; if(Math.abs(lipY-target)>10) continue;
      const hx=tx*T+(face>0?-5:T+5); if(!this.boxSolid(hx-4,lipY+3,8,22)) return {x:hx,y:lipY,face};
    }
    return null;
  }
  ledgeBehind(x,y,face){
    const tx=Math.floor((x-face*7)/T),ty=Math.floor((y+2)/T);
    if(!this.solidTile(tx,ty)||this.solidTile(tx,ty-1)) return null;
    const lipY=ty*T; if(Math.abs(lipY-y)>6) return null;
    const edge=face>0?(tx+1)*T:tx*T,hx=edge+face*5;
    return this.boxSolid(hx-4,lipY+3,8,22)?null:{x:hx,y:lipY,face:-face};
  }
  draw(s,clock){
    backdrop(s,this.i,clock);
    for(let y=0;y<RH;y++) for(let x=0;x<RW;x++) if(this.solidTile(x,y)){
      const open=!this.solidTile(x,y-1);
      const ci=this.i===0?C.DARK:this.i===1?C.NEAR:this.i===2?C.SOLID:C.NEAR;
      s.rect(x*T,y*T,T,T,ci);
      if(open){ s.rect(x*T,y*T,T,2,C.EDGE); if(this.i===3&&((x+y)&1)===0) s.rect(x*T+4,y*T+5,7,2,C.DARK); }
    }
    foreground(s,this.i,clock);
  }
}

function backdrop(s,i,clock){
  s.clear(C.VOID);
  // hard colour bands and large polygon masses: intentionally no gradients.
  s.rect(0,0,W,42,C.SKY_HI); s.rect(0,42,W,42,C.SKY_LO); s.rect(0,84,W,108,C.FAR);
  if(i===0){
    s.disc(244,34,15,C.LUX2); s.disc(273,47,7,C.LUX);
    s.poly([0,122,38,94,77,108,116,82,168,105,212,76,270,101,320,74,320,192,0,192],C.MID);
    for(const [x,h,w] of [[24,132,8],[88,112,6],[158,150,9],[232,126,7],[302,145,9]]){
      s.poly([x-w,176,x+w,176,x+w*.35,176-h,x-w*.25,176-h],C.NEAR);
      const y=176-h; for(let k=0;k<5;k++){ const a=-2.7+k*.72, L=27+(k%2)*13; s.poly([x,y,x+Math.cos(a)*L,y+Math.sin(a)*L,x+Math.cos(a+.18)*L*.72,y+Math.sin(a+.18)*L*.72],C.NEAR); }
    }
    s.poly([184,148,220,138,249,141,269,154,225,160],C.SOLID); s.rect(221,143,20,8,C.LUX);
    for(let p=0;p<10;p++){ const x=(p*41+clock*.08)%340-10,y=44+((p*29)%90)+Math.sin(clock*.01+p)*5; s.rect(x,y,1,1,p%3?C.LUX:C.LUX2); }
  } else if(i===1){
    s.poly([0,118,50,92,111,103,154,71,211,96,262,80,320,103,320,192,0,192],C.MID);
    for(let x=8;x<320;x+=64){ s.rect(x,60,10,116,C.NEAR); s.rect(x-5,57,20,5,C.EDGE); }
    s.poly([0,102,86,92,118,98,161,89,208,96,320,84,320,118,0,118],C.FAR);
    s.rect(118,72,92,8,C.SOLID); s.rect(132,80,7,54,C.SOLID); s.rect(190,80,7,54,C.SOLID);
    for(let k=0;k<5;k++) s.rect(140+k*10,84+(k&1)*5,6,2,C.LUX);
  } else if(i===2){
    s.rect(0,0,W,H,C.DARK); s.rect(32,0,256,H,C.FAR);
    for(let y=16;y<176;y+=28) s.rect(32,y,256,3,C.NEAR);
    for(let x=48;x<288;x+=48) s.rect(x,0,4,H,C.NEAR);
    s.disc(160,83,51,C.NEAR); s.disc(160,83,41,C.MID); s.disc(160,83,27,C.DARK); s.disc(160,83,13,C.LUX);
    const a=clock*.018; for(let k=0;k<8;k++){ const q=a+k*Math.PI/4; s.line(160+Math.cos(q)*30,83+Math.sin(q)*30,160+Math.cos(q)*48,83+Math.sin(q)*48,C.EDGE,2); }
    const scan=(clock*1.1)%220-20; s.veil([32,scan,288,scan,288,scan+8,32,scan+8],C.LUX,0.18);
  } else {
    s.disc(57,28,11,C.LUX); s.disc(53,25,9,C.SKY_HI);
    s.poly([0,112,45,88,93,104,137,72,188,98,235,77,320,100,320,192,0,192],C.MID);
    for(let x=14;x<320;x+=62){ s.rect(x,52,42,124,C.NEAR); s.rect(x-3,47,48,7,C.EDGE); s.disc(x+21,81,18,C.MID); s.rect(x+3,81,36,95,C.MID); }
    for(let v=0;v<9;v++){ const x=9+v*38, L=28+(v%4)*12; s.poly([x,0,x+3,0,x+8+(v%2)*9,L,x+6+(v%2)*9,L,x+1,L*.55],C.VOID); }
  }
}

function foreground(s,i,clock){
  if(i===0){ s.poly([0,0,20,0,15,H,0,H],C.VOID); s.poly([W,0,W-18,0,W-12,H,W,H],C.VOID); }
  if(i===1){ s.poly([0,0,44,0,24,28,0,31],C.VOID); s.poly([W,0,W-52,0,W-27,30,W,34],C.VOID); }
  if(i===2){ s.rect(0,0,26,H,C.VOID); s.rect(W-26,0,26,H,C.VOID); }
  if(i===3){ s.rect(0,0,9,H,C.VOID); s.rect(W-9,0,9,H,C.VOID); }
}

class Lab {
  constructor(){
    this.s=new Screen(document.getElementById('screen')); this.s.setPalette(paletteAt(2.15));
    this.input=new Input(this.s); this.world=new World(); this.flash=0; this.frozen=false; this.stepOnce=false; this.debug=false; this.clock=0; this.load(0);
    addEventListener('keydown',e=>{
      if(e.code==='Digit1')this.load(0); if(e.code==='Digit2')this.load(1); if(e.code==='Digit3')this.load(2); if(e.code==='Digit4')this.load(3);
      if(e.code==='KeyR')this.reset(); if(e.code==='KeyH')this.debug=!this.debug;
      if(e.code==='KeyF'){this.frozen=!this.frozen;this.stepOnce=false;} if(e.code==='Period'&&this.frozen)this.stepOnce=true;
    });
    this.last=performance.now(); this.acc=0; requestAnimationFrame(t=>this.frame(t));
  }
  load(i){this.world.load(i);this.s.setPalette(paletteAt(1.1+i*1.15));this.reset();}
  reset(){const[x,y]=this.world.lab.spawn;this.hero=new MovementHeroV3(x,y);this.hero.health=3;this.hero.hasGun=false;this.hero.go('stand');}
  kill(){if(this.hero.dead)return;this.hero.dead=true;this.hero.health=0;this.hero.go('dead');this.flash=8;}
  hurt(n){this.hero.health-=n;this.flash=5;if(this.hero.health<=0)this.kill();}
  zones(){const z=[{name:'left',x:8,y:150,w:32,h:32},{name:'right',x:44,y:150,w:32,h:32},{name:'down',x:80,y:150,w:32,h:32},{name:'jump',x:260,y:144,w:52,h:38}];this.input.setZones(z);return z;}
  step(){this.clock++;this.input.poll();if(!this.hero.dead){this.hero.update(this.world,this.input,this);if(this.hero.y>H+40)this.kill();}else if(this.input.anyPress)this.reset();if(this.flash>0)this.flash--;this.input.flush();}
  paint(){
    const s=this.s; this.world.draw(s,this.clock);
    // contact shadow grounds the polygon figure without introducing soft rendering.
    if(this.hero.y<H+8) s.veil([this.hero.x-9,this.hero.y-2,this.hero.x+11,this.hero.y-2,this.hero.x+7,this.hero.y+1,this.hero.x-7,this.hero.y+1],C.VOID,0.42);
    drawFigure(s,this.hero.x,this.hero.y,this.hero.face,this.hero.pose(),{far:C.SUIT,body:C.SUIT_HI,legs:C.SUIT,arms:C.SUIT_HI,skin:C.SKIN,hair:C.HAIR,eye:C.LUX2,gun:C.HAIR});
    const l=this.world.lab,m=this.hero.move;
    s.text(l.name,8,7,C.LUX2,8); s.text(l.note,8,18,C.EDGE,6);
    if(this.debug){s.text(`STATE ${this.hero.state.toUpperCase()} F ${this.hero.f}  A${m.anticipate??0} C${m.commit??0} T${m.transition??0}`,8,30,C.LUX,6);s.text(`X ${this.hero.x.toFixed(1)} Y ${this.hero.y.toFixed(1)} HP ${this.hero.health} JBUF ${this.input.buffer.jump}`,8,39,C.LUX,6);}
    s.text('1-4 SCENES  ·  R RESET  ·  H ANALYSIS',8,181,C.NEAR,6);
    for(const z of this.zones()){s.veil([z.x,z.y,z.x+z.w,z.y,z.x+z.w,z.y+z.h,z.x,z.y+z.h],C.DARK,0.22);}
    if(this.flash)s.veil([0,0,W,0,W,H,0,H],C.ALERT,0.18); s.present();
  }
  frame(t){const dt=Math.min(100,t-this.last);this.last=t;const tick=1000/60;if(!this.frozen){this.acc+=dt;while(this.acc>=tick){this.step();this.acc-=tick;}}else{this.acc=0;if(this.stepOnce){this.step();this.stepOnce=false;}}this.paint();requestAnimationFrame(n=>this.frame(n));}
}
new Lab();
