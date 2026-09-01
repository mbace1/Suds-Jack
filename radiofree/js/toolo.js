// Radio Free Helsinki — Töölö tram street.
// Quieter stone blocks, trees, tram rails and park-edge rhythm.
import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
import { drawTram } from './tram.js?v=38';
const W=128,H=152; const ink=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d);
export function drawToolo(scr,t,d=0){
  scr.bands(0,0,W,60,[mix('#081119','#181107',d),mix('#11212a','#2a1d0b',d)]);
  const drift=Math.floor((t*.42)%170);
  for(const wrap of [0,170]){const x=-25-drift+wrap; scr.px(x,31,48,48,mix('#1b272d','#342513',d)); scr.px(x+58,23,51,56,mix('#202a30','#392817',d));
    // Pitched roof/chimney rhythm.
    scr.line(x,31,x+13,20,shade(ink(d),.4)); scr.line(x+13,20,x+27,31,shade(ink(d),.4)); scr.px(x+8,17,4,7,shade(ink(d),.34));
    for(let wx=x+6;wx<x+104;wx+=11){scr.px(wx,43,4,5,shade(ink(d),.27));scr.px(wx,58,4,5,shade(ink(d),.22));}
  }
  scr.px(0,79,W,H-79,mix('#0a1216','#1c160e',d));
  // Tree row / park edge.
  for(const [x,p] of [[9,0],[29,2],[106,4],[121,1]]){const sway=Math.round(Math.sin(t*.5+p)); scr.px(x,57,2,35,shade(ink(d),.42)); scr.px(x-7+sway,48,15,13,shade(ink(d),.25));}
  scr.line(36,79,22,H,shade(ink(d),.65)); scr.line(53,79,48,H,shade(ink(d),.8)); scr.line(74,79,79,H,shade(ink(d),.8)); scr.line(91,79,108,H,shade(ink(d),.65));
  // restrained catenary.
  for(const x of [18,99]) scr.px(x,38,2,57,shade(ink(d),.5)); scr.line(18,43,99,49,shade(ink(d),.32));
  drawTram(scr,((t*10)%(W+82))-66,77,t,d);
  const bike=((t*12)%(W+20))-15; scr.px(bike,120,7,2,shade(ink(d),.5)); scr.px(bike+1,123,2,2,shade(ink(d),.38)); scr.px(bike+6,123,2,2,shade(ink(d),.38));
}