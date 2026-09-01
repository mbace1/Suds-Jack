// Radio Free Helsinki — Sörnäinen / Kalasatama transition.
// Fixed-grid Helsinki east-side cue: older industrial edge, metro/road infrastructure,
// new high-rise masses and open construction gaps. Weather/broadcast overlays stay external.
import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
const W=128,H=152; const ink=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d), hot=d=>mix(PAL.GREEN_HOT,PAL.AMBER_HOT,d);
export function drawKalasatama(scr,t,d=0){
  scr.bands(0,0,W,59,[mix('#071019','#171006',d),mix('#10212b','#291c0a',d)]);
  const drift=Math.floor((t*.28)%190);
  for(const wrap of [0,190]){const x=-34-drift+wrap;
    // Old Sörnäinen industrial wall.
    scr.px(x,38,49,42,mix('#172229','#30200f',d));
    scr.px(x+6,29,7,10,shade(ink(d),.36)); scr.px(x+27,24,4,15,shade(ink(d),.31));
    // Kalasatama high-rise silhouettes behind it.
    scr.px(x+67,10,22,70,mix('#202c34','#392715',d));
    scr.px(x+96,20,27,60,mix('#1b2730','#342412',d));
    for(let y=20;y<70;y+=9){scr.px(x+72,y,11,2,shade(ink(d),.26));scr.px(x+101,y+3,16,2,shade(ink(d),.2));}
  }
  // Elevated infrastructure band / metro-road edge.
  scr.px(0,77,W,9,mix('#1b252b','#342513',d));
  for(let x=7;x<W;x+=29)scr.px(x,85,4,25,shade(ink(d),.33));
  scr.px(0,109,W,H-109,mix('#091116','#1a140c',d));
  // Service road and construction seams.
  const seam=Math.floor(t*7)%15; for(let x=-seam;x<W;x+=15)scr.px(x,128,8,1,shade(ink(d),.18));
  // Metro train passing on the infrastructure line.
  const mx=((t*19)%(W+72))-64; scr.px(mx,67,55,13,mix('#25333a','#443019',d)); scr.px(mx+4,70,41,4,shade(ink(d),.32)); scr.px(mx+49,70,3,4,hot(d));
  // Construction crane: sparse, recognizable, not a skyline forest.
  const sway=Math.round(Math.sin(t*.45)); scr.px(108,22,2,68,shade(ink(d),.46)); scr.px(79,26+sway,38,1,shade(ink(d),.38)); scr.px(85,27+sway,1,19,shade(ink(d),.25));
  // Foreground chain fence / pole layer.
  const fg=146-((t*8)%184); scr.px(fg,82,3,66,shade(ink(d),.68)); scr.px(fg-8,91,19,1,shade(ink(d),.38));
}