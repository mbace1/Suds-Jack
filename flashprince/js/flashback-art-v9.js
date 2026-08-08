import { W, H } from './screen.js';
import { C } from './palette.js';

// v9 presentation detail. The v8 rooms establish the large composition; this
// pass adds the small authored pixel information Flashback relies on: clustered
// foliage, chipped edges, cabling, panel seams, tiny practical lights and hard
// dither instead of smooth effects. No textures or gradients are used.
const seed=(n)=>()=>((n=Math.imul(n^n>>>15,1|n)),(n^=n+Math.imul(n^n>>>7,61|n)),((n^n>>>14)>>>0)/4294967296);

function dither(scr,x,y,w,h,a,b,phase=0,step=4){
  for(let yy=y;yy<y+h;yy+=step) for(let xx=x;xx<x+w;xx+=step){
    if((((xx/step)|0)+((yy/step)|0)+phase)&1) scr.rect(xx,yy,1,1,a);
    else if(step<=3) scr.rect(xx+1,yy,1,1,b);
  }
}

function rockNoise(scr,room){
  const r=seed(0x9e3779b9^(room*733));
  for(let i=0;i<54;i++){
    const x=(r()*W)|0,y=(94+r()*92)|0,len=2+((r()*10)|0);
    scr.line(x,y,x+len,y-(r()*3|0),i%4?C.FAR:C.EDGE,1);
  }
}

function leafCluster(scr,x,y,flip,ci,scale=1){
  const p=(dx,dy)=>[x+dx*flip*scale,y+dy*scale];
  scr.poly([...p(0,0),...p(7,-5),...p(15,-3),...p(10,1),...p(16,4),...p(7,4)],ci);
  scr.poly([...p(2,2),...p(5,8),...p(13,12),...p(8,13),...p(3,10)],ci);
}

function jungleDetail(scr,room,clock){
  const r=seed(9127+room*193);
  // A second foliage scale breaks the v8 palm silhouettes into a dense jungle.
  for(let i=0;i<18;i++){
    const x=(r()*W)|0,y=58+(r()*86)|0,sc=.45+r()*.55;
    leafCluster(scr,x,y,r()>.5?1:-1,i%4===0?C.EDGE:C.NEAR,sc);
  }
  // Hanging vines with leaf nodes and tiny gaps so they read as organic, not bars.
  for(let i=0;i<9;i++){
    const x=12+i*38+(room*7)%19,len=24+((i*17+room*11)%52);
    let px=x,py=0;
    for(let k=1;k<=6;k++){
      const t=k/6,nx=x+Math.sin(k*1.7+i)*4,ny=t*len;
      scr.line(px,py,nx,ny,C.FAR,1);
      if(k===2||k===4) leafCluster(scr,nx,ny,(i+k)&1?1:-1,C.NEAR,.35);
      px=nx;py=ny;
    }
  }
  // Firefly/spore layer: deliberately sparse and one-pixel.
  for(let i=0;i<12;i++){
    const x=((i*61+room*29+clock*.08)%(W+14))-7;
    const y=42+((i*31+room*13)%104)+Math.sin(clock*.012+i)*4;
    scr.rect(x|0,y|0,1,1,i%5===0?C.LUX:C.EDGE);
  }
}

function techDetail(scr,room,clock){
  // Buried machinery starts as archaeological fragments and becomes explicit.
  const strength=Math.max(0,room-1);
  if(!strength) return;
  for(let i=0;i<3+strength;i++){
    const x=36+i*58+(room%2)*11,y=104-(i%2)*13;
    scr.rect(x,y,34,3,C.NEAR);
    scr.line(x+4,y+4,x+4,y+17,C.FAR,1);
    scr.line(x+10,y+4,x+10,y+11,C.FAR,1);
    scr.disc(x+27,y+8,1,(i+room)%3===0?C.ALERT:C.LUX,.9);
    if(i&1) scr.line(x+15,y+5,x+29,y+15,C.EDGE,1);
  }
  // Cable bundles curve only through short angular segments — pixel art, not SVG.
  for(let b=0;b<2+room;b++){
    const x=52+b*67,y=74+(b%2)*12;
    scr.line(x,y,x+8,y+12,C.FAR,1); scr.line(x+8,y+12,x+24,y+15,C.FAR,1);
    scr.line(x+24,y+15,x+30,y+28,C.EDGE,1);
  }
  if(room>=3){
    const pulse=((clock>>4)&1)?C.LUX:C.EDGE;
    for(let y=70;y<137;y+=14){scr.rect(267,y,9,2,C.NEAR);scr.rect(270,y,2,2,pulse);}
  }
}

function foregroundClutter(scr,room){
  // Small floor objects make the traversable plane feel inhabited and scaled.
  const xs=room===0?[88,113,201]:room===1?[72,168,228]:room===2?[58,146,214]:room===3?[91,188,244]:[70,137,218];
  xs.forEach((x,i)=>{
    const y=173-(i%2)*2;
    if(room<2){ leafCluster(scr,x,y,i&1?1:-1,C.DARK,.45); }
    else {
      scr.poly([x-4,y,x+5,y,x+7,y-5,x+2,y-8,x-5,y-6],C.DARK);
      scr.line(x-2,y-5,x+3,y-6,C.EDGE,1);
    }
  });
}

function sceneSpecific(scr,room,clock){
  if(room===0){
    // Pod wake room: broken status strip and impact furrow.
    scr.line(2,169,81,160,C.FAR,1); scr.line(6,173,88,164,C.NEAR,1);
    for(let x=31;x<56;x+=5) scr.rect(x,154,2,1,(x+clock>>4)&1?C.ALERT:C.EDGE);
  } else if(room===1){
    // Beacon: hard cone of signal light, dithered rather than transparent gradient.
    scr.poly([244,115,320,77,320,99,246,118],C.FAR,.35);
    dither(scr,251,87,66,29,C.EDGE,C.FAR,(clock>>4)&1,5);
  } else if(room===2){
    // Panel room: a buried terminal gives the eye a readable destination.
    scr.rect(239,108,47,23,C.DARK); scr.rect(242,111,41,17,C.NEAR);
    scr.rect(246,115,21,7,C.SOLID); dither(scr,247,116,19,5,C.LUX,C.EDGE,(clock>>5)&1,3);
    for(let x=271;x<280;x+=4) scr.rect(x,118,2,2,x===275?C.ALERT:C.LUX);
  } else if(room===3){
    // Cable room: exposed floor conduit with repeating clamps.
    scr.line(18,167,287,159,C.FAR,2);
    for(let x=30;x<285;x+=28){scr.rect(x,160,5,4,C.NEAR);scr.rect(x+1,160,1,3,C.EDGE);}
  } else if(room===4){
    // Door room: luminous vertical language on the final machine threshold.
    for(let y=84;y<139;y+=9){
      const on=((y/9+(clock>>5))|0)%4===0;
      scr.rect(272,y,1,5,on?C.LUX:C.EDGE); scr.rect(276,y+2,4,1,on?C.LUX:C.NEAR);
    }
  }
}

export function drawFlashbackDetailBack(scr,room,clock){
  rockNoise(scr,room);
  jungleDetail(scr,room,clock);
  techDetail(scr,room,clock);
  sceneSpecific(scr,room,clock);
  // Distance dither is intentionally restrained; it should read as VGA-era
  // hand shading, not a full-screen checkerboard filter.
  dither(scr,0,72,W,35,C.FAR,C.NEAR,room,6);
}

export function drawFlashbackDetailFront(scr,room){
  foregroundClutter(scr,room);
  // Deep black edge leaves sell the same foreground framing as the reference.
  if(room<3){leafCluster(scr,-2,42,1,C.VOID,1.6);leafCluster(scr,W+3,63,-1,C.VOID,1.45);}
}
