// Radio Free Helsinki — Mannerheimintie in rain.
// Real-world cues: broad central tram reservation, dense catenary, stone street walls,
// wet rails and separated traffic edges. Fixed-grid 128×152, no baked labels.
import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
import { drawTram } from './tram.js?v=38';

const W=128,H=152;
const ink=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d);
const hot=d=>mix(PAL.GREEN_HOT,PAL.AMBER_HOT,d);

function sky(scr,d){scr.bands(0,0,W,H,[mix('#071018','#171006',d),mix('#12242d','#2b1b0b',d)]);}

function streetWalls(scr,t,d){
  const far=mix('#16242d','#2a1d0e',d), near=mix('#1a2730','#33220f',d);
  // Mannerheimintie reads as a long, broad corridor with continuous stone façades.
  scr.px(0,41,34,56,far); scr.px(94,34,34,63,far);
  scr.px(7,29,29,68,near); scr.px(92,24,36,73,near);
  for(const side of [[9,30,25],[95,25,29]]){
    const [x0,y0,w]=side;
    for(let y=y0+9,row=0;y<90;y+=11,row++) for(let x=x0+5;x<x0+w-3;x+=9){
      const lit=((x+y+row+Math.floor(t*.18))%7)===0;
      scr.px(x,y,4,4,lit?shade(ink(d),.42):mix('#081117','#1a1108',d));
    }
  }
  // Sparse ground-floor commercial glow, not signage.
  for(const x of [8,98,110]){scr.px(x,83,14,8,shade(hot(d),.14));scr.px(x+2,85,10,4,shade(hot(d),.30));}
}

function reservation(scr,d){
  // Wide road and raised central tram reservation.
  scr.px(0,97,W,H-97,mix('#091116','#1c140b',d));
  scr.px(35,96,58,H-96,mix('#10191e','#25190d',d));
  scr.px(35,96,58,2,shade(ink(d),.36));
  // Parallel rails remain broad and readable instead of exaggerated perspective smear.
  scr.line(47,96,34,H,shade(ink(d),.78));
  scr.line(58,96,51,H,shade(ink(d),.78));
  scr.line(70,96,76,H,shade(ink(d),.78));
  scr.line(81,96,94,H,shade(ink(d),.78));
  // Traffic lanes at edges.
  scr.line(20,103,7,H,shade(ink(d),.13));
  scr.line(108,103,122,H,shade(ink(d),.13));
}

function catenary(scr,t,d){
  const wire=shade(ink(d),.40), pole=shade(ink(d),.52);
  for(const x of [17,43,86,113]){scr.px(x,28,2,74,pole);scr.px(x-6,39,14,1,shade(ink(d),.30));}
  const bob=Math.round(Math.sin(t*.45));
  scr.line(0,34+bob,W,39-bob,wire);
  scr.line(0,47-bob,W,43+bob,shade(ink(d),.28));
  scr.line(43,39,58,57,shade(ink(d),.24));
  scr.line(86,39,70,57,shade(ink(d),.24));
}

function stops(scr,t,d){
  // Compact island-stop silhouettes with tiny green-roof cue from the renewed corridor.
  for(const x of [39,79]){
    scr.px(x,74,2,24,shade(ink(d),.54));
    scr.px(x-5,74,12,2,shade(ink(d),.42));
    scr.px(x-4,72,10,2,shade(PAL.GREEN_DIM,.35));
    const blink=(Math.floor(t*.7+x)%5)===0;
    scr.px(x-2,78,6,7,blink?shade(hot(d),.28):shade(ink(d),.16));
  }
}

function cars(scr,t,d){
  // Side-lane cars only; tram owns the centre visually.
  const left=128-((t*8)%170), right=-28+((t*6.5)%176);
  for(const [x,y,dir] of [[left,111,-1],[right,126,1]]){
    scr.px(x,y,15,6,mix('#152027','#2b1c0d',d));
    scr.px(x+2,y-3,10,4,mix('#1d2a31','#352311',d));
    const lx=dir<0?x+1:x+12;
    scr.px(lx,y+2,2,2,shade(hot(d),.62));
  }
}

function reflections(scr,t,d){
  for(let i=0;i<7;i++){
    const x=7+i*19+Math.round(Math.sin(t*.6+i)*2);
    const h=10+((i*9)%28), a=.16+.12*((i+1)%3);
    for(let y=111;y<111+h;y+=3)scr.px(x+((y+i)&1),y,2,1,shade(hot(d),a));
  }
}

function rain(scr,t,d,amount=28,speed=62,len=4,a=.42){
  for(let i=0;i<amount;i++){
    const x=(i*29+Math.floor(t*speed*.43))%W;
    const y=(i*43+Math.floor(t*speed))%H;
    scr.px(x,y,1,len,shade(ink(d),a));
  }
}

export function drawMannerheimRain(scr,t,d=0){
  sky(scr,d); streetWalls(scr,t,d); catenary(scr,t,d); reservation(scr,d); stops(scr,t,d);
  // Two tram directions across a broad central reservation, staggered enough to avoid clutter.
  drawTram(scr,((t*12)%(W+92))-78,68,t,d);
  if(((t*.08)%1)>.47) drawTram(scr,150-((t*9)%(W+100)),78,t+1.7,d);
  cars(scr,t,d); reflections(scr,t,d); rain(scr,t,d,22,38,2,.20); rain(scr,t,d,28,72,5,.43);
}
