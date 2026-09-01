// Radio Free Helsinki — Kauppatori / Esplanadi harbour edge.
// Open market-square geometry, waterfront, low classical facades and terminal silhouettes.
import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
const W=128,H=152; const ink=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d), hot=d=>mix(PAL.GREEN_HOT,PAL.AMBER_HOT,d);
export function drawKauppatori(scr,t,d=0){
  scr.bands(0,0,W,63,[mix('#081119','#181107',d),mix('#12222b','#2b1d0b',d)]);
  const drift=Math.floor((t*.18)%175);
  for(const wrap of [0,175]){const x=-24-drift+wrap;
    // Low continuous historic waterfront wall.
    scr.px(x,39,64,39,mix('#202a2f','#392817',d));
    scr.px(x+72,31,56,47,mix('#1b262c','#342412',d));
    for(let wx=x+5;wx<x+124;wx+=11){scr.px(wx,48,4,5,shade(ink(d),.24));scr.px(wx,61,4,5,shade(ink(d),.2));}
    // Sparse roofline and cupola-like accents rather than invented skyscrapers.
    scr.line(x+72,31,x+88,22,shade(ink(d),.35)); scr.line(x+88,22,x+103,31,shade(ink(d),.35));
    scr.px(x+86,17,5,6,shade(ink(d),.32));
  }
  // Broad market square.
  scr.px(0,78,W,38,mix('#101619','#241a10',d));
  const seam=Math.floor(t*3)%17; for(let y=84-seam;y<116;y+=17)scr.px(0,y,W,1,shade(ink(d),.11));
  // Market stalls: low and intermittent.
  for(const [x,p] of [[13,0],[39,2],[73,4],[101,1]]){const bob=(Math.floor(t*.7+p)%8===0)?1:0; scr.px(x,91+bob,13,4,shade(ink(d),.33)); scr.line(x,91+bob,x+6,84+bob,shade(ink(d),.31)); scr.line(x+12,91+bob,x+6,84+bob,shade(ink(d),.31));}
  // Harbour water foreground with separate reflections.
  scr.px(0,116,W,36,mix('#071218','#17130d',d)); const phase=Math.floor(t*8)%21; for(let y=123;y<151;y+=7)for(let x=-phase;x<W;x+=27)scr.px(x,y,12,1,shade(ink(d),.18));
  // Small ferry / commuter vessel only in actual harbour context.
  const fx=((t*8.5)%(W+46))-38; scr.px(fx,111,29,7,mix('#26343a','#463019',d)); scr.px(fx+5,106,12,5,shade(ink(d),.42)); scr.px(fx+25,113,2,2,hot(d));
  // Flag/lamp foreground rhythm.
  const fg=145-((t*5)%177); scr.px(fg,46,3,75,shade(ink(d),.64)); scr.px(fg-6,48,13,1,shade(ink(d),.43));
}