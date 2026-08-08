import { Screen, W, H } from './screen.js';
import { paletteAt, C } from './palette.js';
import { MovementHero } from './movement-hero.js';
import { Input } from './input.js';
import { drawFigure } from './figure.js';

const T = 16, RW = 20, RH = 12;
const LABS = [
  {
    name: '01 FLOW / ROTOSCOPE 2.0', note: 'STEP > RUN-START > RUN > BRAKE > PIVOT · BUFFER JUMP LATE',
    spawn: [40, 176],
    map: [
      '                    ','                    ','                    ','                    ',
      '                    ','                    ','                    ','                    ',
      '                    ','                    ','                    ','####################',
    ],
  },
  {
    name: '02 GAP + LEDGE CATCH', note: '3-TILE RUNNING GAP · HIGH LIP · WATCH IMPACT > DROP > HANG',
    spawn: [40, 144],
    map: [
      '                    ','                    ','                    ','                    ',
      '                    ','                    ','                    ','              ######',
      '              ######','######   ###########','######   ###########','######   ###########',
    ],
  },
  {
    name: '03 FALL + LANDING', note: 'DROP · LAND-CATCH > RISE · ONE STOREY FREE · TWO HURT · THREE KILL',
    spawn: [40, 80],
    map: [
      '                    ','                    ','                    ','                    ',
      '                    ',' #####              ',' #####              ',' #####   #####      ',
      ' #####   #####   ###',' #####   #####   ###',' #####   #####   ###','####################',
    ],
  },
];

class World {
  constructor() { this.load(0); }
  load(i) { this.i = (i + LABS.length) % LABS.length; this.lab = LABS[this.i]; this.g = this.lab.map.map(r => [...r]); }
  tile(x, y) { return x < 0 || x >= RW || y < 0 || y >= RH ? ' ' : this.g[y][x]; }
  solidTile(x, y) { return this.tile(x, y) === '#'; }
  boxSolid(x, y, w, h) {
    const x0 = Math.floor(x/T), x1 = Math.floor((x+w-1)/T), y0 = Math.floor(y/T), y1 = Math.floor((y+h-1)/T);
    for (let yy=y0; yy<=y1; yy++) for (let xx=x0; xx<=x1; xx++) if (this.solidTile(xx,yy)) return true;
    return false;
  }
  ledgeAhead(x, y, face) {
    const tx = Math.floor((x + face*7)/T), target = y - 26;
    for (let ty=Math.floor((target-11)/T); ty<=Math.floor((target+11)/T); ty++) {
      if (!this.solidTile(tx,ty) || this.solidTile(tx,ty-1) || this.solidTile(tx-face,ty)) continue;
      const lipY = ty*T; if (Math.abs(lipY-target)>10) continue;
      const hx = tx*T + (face>0 ? -5 : T+5);
      if (!this.boxSolid(hx-4,lipY+3,8,22)) return {x:hx,y:lipY,face};
    }
    return null;
  }
  ledgeBehind(x, y, face) {
    const tx=Math.floor((x-face*7)/T), ty=Math.floor((y+2)/T);
    if (!this.solidTile(tx,ty) || this.solidTile(tx,ty-1)) return null;
    const lipY=ty*T; if (Math.abs(lipY-y)>6) return null;
    const edge=face>0?(tx+1)*T:tx*T, hx=edge+face*5;
    return this.boxSolid(hx-4,lipY+3,8,22) ? null : {x:hx,y:lipY,face:-face};
  }
  draw(s) {
    s.clear(C.VOID);
    for (let x=0;x<=W;x+=T) s.line(x,0,x,H,C.FAR,0.35);
    for (let y=0;y<=H;y+=T) s.line(0,y,W,y,C.FAR,0.35);
    for (let y=0;y<RH;y++) for (let x=0;x<RW;x++) if (this.solidTile(x,y)) {
      s.rect(x*T,y*T,T,T,C.SOLID);
      if (!this.solidTile(x,y-1)) s.rect(x*T,y*T,T,2,C.EDGE);
    }
  }
}

class Lab {
  constructor() {
    this.s = new Screen(document.getElementById('screen')); this.s.setPalette(paletteAt(2.15));
    this.input = new Input(this.s); this.world = new World(); this.flash=0; this.load(0);
    addEventListener('keydown', e => {
      if (e.code==='Digit1') this.load(0); if (e.code==='Digit2') this.load(1); if (e.code==='Digit3') this.load(2);
      if (e.code==='KeyR') this.reset();
    });
    this.last=performance.now(); this.acc=0; requestAnimationFrame(t=>this.frame(t));
  }
  load(i) { this.world.load(i); this.reset(); }
  reset() { const [x,y]=this.world.lab.spawn; this.hero=new MovementHero(x,y); this.hero.health=3; this.hero.hasGun=false; this.hero.go('stand'); }
  kill() { if (this.hero.dead) return; this.hero.dead=true; this.hero.health=0; this.hero.go('dead'); this.flash=8; }
  hurt(n) { this.hero.health-=n; this.flash=5; if (this.hero.health<=0) this.kill(); }
  zones() {
    const z=[
      {name:'left',x:8,y:150,w:32,h:32},{name:'right',x:44,y:150,w:32,h:32},
      {name:'down',x:80,y:150,w:32,h:32},{name:'jump',x:260,y:144,w:52,h:38},
    ]; this.input.setZones(z); return z;
  }
  step() {
    this.input.poll();
    if (!this.hero.dead) { this.hero.update(this.world,this.input,this); if (this.hero.y>H+40) this.kill(); }
    else if (this.input.anyPress) this.reset();
    if (this.flash>0) this.flash--; this.input.flush();
  }
  paint() {
    const s=this.s; this.world.draw(s);
    drawFigure(s,this.hero.x,this.hero.y,this.hero.face,this.hero.pose(),{
      far:C.SUIT,body:C.SUIT_HI,legs:C.SUIT,arms:C.SUIT_HI,skin:C.SKIN,hair:C.HAIR,eye:null,gun:C.HAIR,
    });
    const l=this.world.lab, m=this.hero.move;
    s.text(l.name,8,6,C.LUX2,8); s.text(l.note,8,17,C.EDGE,6);
    s.text(`STATE ${this.hero.state.toUpperCase()}  F ${this.hero.f}`,8,29,C.SUIT_HI,6);
    s.text(`PHASE A${m.anticipate??0} C${m.commit??0} T${m.transition??0} / ${m.dur}`,8,38,C.LUX,6);
    s.text(`X ${this.hero.x.toFixed(1)} Y ${this.hero.y.toFixed(1)} HP ${this.hero.health}  J-BUF ${this.input.buffer.jump}`,8,47,C.LUX,6);
    s.text('1/2/3 LAB · R RESET · ARROWS/WASD · SPACE/UP JUMP',8,57,C.NEAR,6);
    s.line(310,80,310,128,C.ALERT,1); s.line(306,80,314,80,C.ALERT,1); s.line(306,128,314,128,C.ALERT,1); s.text('48',296,100,C.ALERT,6);
    for (const z of this.zones()) { s.rect(z.x,z.y,z.w,z.h,C.DARK); s.rect(z.x+1,z.y+1,z.w-2,1,C.EDGE); }
    if (this.flash) s.veil([0,0,W,0,W,H,0,H],C.ALERT,0.18);
    s.present();
  }
  frame(t) {
    this.acc += Math.min(100,t-this.last); this.last=t; const tick=1000/60;
    while (this.acc>=tick) { this.step(); this.acc-=tick; }
    this.paint(); requestAnimationFrame(n=>this.frame(n));
  }
}
new Lab();
