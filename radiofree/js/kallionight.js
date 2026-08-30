// Radio Free Helsinki — Kallio / Hämeentie night street.
// Fixed-grid urban scene: stone blocks, tram corridor, shop light, wet street.
import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
import { drawTram } from './tram.js?v=38';

const W=128,H=152;
const ink=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d);

function blocks(scr,t,d){
  const drift=Math.floor((t*.28)%10);
  scr.px(0,0,W,H,mix('#050b12','#140d07',d));
  const bs=[[-9,35,38,61],[28,26,31,70],[59,32,34,64],[93,23,43,73]];
  for(let i=0;i<bs.length;i++){
    const [bx,by,bw,bh]=bs[i],x=bx-drift;
    const wall=mix(i&1?'#15212a':'#111c25',i&1?'#2b1d0d':'#24190c',d);
    scr.px(x,by,bw,bh,wall);
    // Helsinki/Kallio pitched roof and chimney rhythm.
    scr.line(x,by,x+Math.floor(bw/2),by-7,shade(wall,.9));
    scr.line(x+Math.floor(bw/2),by-7,x+bw,by,shade(wall,.9));
    for(let c=5;c<bw-3;c+=11) for(let r=9;r<bh-9;r+=12){
      const lit=((c+r+i*7+Math.floor(t*.35))%5)===0;
      scr.px(x+c,by+r,4,4,lit?shade(ink(d),.55):mix('#091116','#181007',d));
    }
    if(i===1||i===3){scr.px(x+bw-8,by-11,4,7,shade(wall,.72));scr.px(x+bw-9,by-12,6,2,shade(wall,.65));}
  }
}

function shops(scr,t,d){
  const pulse=.68+Math.sin(t*.8)*.08;
  scr.px(0,88,W,15,mix('#0a1116','#1a1108',d));
  for(const x of [7,36,69,101]){
    scr.px(x,90,19,9,shade(ink(d),.18));
    scr.px(x+2,92,15,5,shade(mix(PAL.GREEN_HOT,PAL.AMBER_HOT,d),pulse*.42));
  }
}

function street(scr,t,d){
  scr.px(0,103,W,H-103,mix('#071015','#171008',d));
  const seam=Math.floor((t*7)%15);
  for(let y=111-seam;y<H;y+=15)scr.px(0,y,W,1,shade(ink(d),.12));
  // Hämeentie tram rails converge into the street.
  scr.line(43,103,23,H,shade(ink(d),.68));
  scr.line(76,103,101,H,shade(ink(d),.68));
  scr.line(47,103,31,H,shade(ink(d),.24));
  scr.line(72,103,93,H,shade(ink(d),.24));
}

function wires(scr,t,d){
  const bob=Math.round(Math.sin(t*.55));
  scr.line(0,39+bob,W,44-bob,shade(ink(d),.30));
  scr.line(0,50-bob,W,47+bob,shade(ink(d),.20));
  for(const x of [18,84]){scr.px(x,39,2,69,shade(ink(d),.48));scr.px(x-5,49,12,1,shade(ink(d),.34));}
}

function reflections(scr,t,d){
  for(let i=0;i<5;i++){
    const x=10+i*26+Math.round(Math.sin(t*.7+i)*2);
    const h=10+(i*7)%19;
    for(let y=116;y<116+h;y+=3)scr.px(x+((y+i)&1),y,2,1,shade(mix(PAL.GREEN_HOT,PAL.AMBER_HOT,d),.22));
  }
}

function foreground(scr,t,d){
  const x=142-((t*10)%184);
  scr.px(x,54,3,88,shade(ink(d),.72));
  scr.px(x-7,57,17,2,shade(ink(d),.48));
  // Tram-stop sign silhouette, intentionally no baked text.
  scr.px(x-3,66,9,12,mix('#0b151a','#201509',d));
  scr.rect(x-3,66,9,12,mix('#0b151a','#201509',d),shade(ink(d),.42));
}

export function drawKallioNight(scr,t,d=0){
  blocks(scr,t,d); shops(scr,t,d); street(scr,t,d); wires(scr,t,d);
  drawTram(scr,((t*11)%(W+92))-74,69,t,d);
  reflections(scr,t,d); foreground(scr,t,d);
}
