// Radio Free Helsinki — Pasila rail canyon.
// Fixed-grid cue scene: station deck, office masses, converging rails and commuter trains.
import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
const W=128,H=152;
const ink=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d), hot=d=>mix(PAL.GREEN_HOT,PAL.AMBER_HOT,d);
export function drawPasila(scr,t,d=0){
  scr.bands(0,0,W,55,[mix('#071019','#171006',d),mix('#10212b','#291c0a',d)]);
  const drift=Math.floor((t*.35)%170);
  for(const wrap of [0,170]){const x=-25-drift+wrap; scr.px(x,22,38,45,mix('#17232a','#30200f',d)); scr.px(x+48,13,31,55,mix('#1b2830','#352411',d)); scr.px(x+91,28,45,40,mix('#142027','#291d0e',d)); for(let wx=x+5;wx<x+128;wx+=10) scr.px(wx,36,4,3,shade(ink(d),.25));}
  // Pasila's elevated station/deck compresses the horizon.
  scr.px(0,61,W,10,mix('#182229','#312312',d)); scr.px(31,55,68,7,mix('#202c32','#3a2914',d));
  scr.px(0,71,W,H-71,mix('#091116','#1a140c',d));
  for(const [a,b] of [[10,43],[28,54],[54,66],[75,79],[101,92],[120,103]]) scr.line(a,72,b,H,shade(ink(d),.48));
  // Platforms.
  scr.line(37,75,22,H,shade(ink(d),.22)); scr.line(48,75,39,H,shade(ink(d),.3)); scr.line(82,75,91,H,shade(ink(d),.3)); scr.line(93,75,108,H,shade(ink(d),.22));
  // Commuter train sliding through the canyon.
  const x=((t*17)%(W+70))-60; scr.px(x,91,52,15,mix('#26343a','#463019',d)); scr.px(x+3,94,42,5,shade(ink(d),.34)); scr.px(x+47,94,3,5,hot(d));
  // Signal gantry and tiny animated aspects.
  scr.px(15,54,2,52,shade(ink(d),.55)); scr.px(15,57,94,2,shade(ink(d),.42)); for(const sx of [34,64,96]){scr.px(sx,60,3,5,mix('#071019','#171006',d)); if((Math.floor(t*1.2)+sx)%3===0) scr.px(sx+1,61,1,1,hot(d));}
  const fg=148-((t*7)%185); scr.px(fg,45,4,101,shade(ink(d),.7));
}