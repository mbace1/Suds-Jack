// Radio Free Helsinki — tram / metro interior cutaway.
// Native fixed-grid carriage geometry with window parallax, doors, poles and seated silhouettes.
import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
const W=128,H=152; const ink=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d), hot=d=>mix(PAL.GREEN_HOT,PAL.AMBER_HOT,d);
export function drawTransitInterior(scr,t,d=0){
  scr.px(0,0,W,H,mix('#091116','#1a140c',d));
  // Ceiling and floor perspective.
  scr.px(0,0,W,18,mix('#172229','#30200f',d));
  scr.line(0,18,20,70,shade(ink(d),.3)); scr.line(W,18,108,70,shade(ink(d),.3));
  scr.px(0,117,W,35,mix('#101619','#241a10',d));
  // Windows show cheap horizontal city motion.
  const phase=Math.floor(t*21)%64;
  for(const wx of [8,47,86]){
    scr.rect(wx,31,33,49,mix('#071019','#171006',d),shade(ink(d),.42));
    for(let i=-phase;i<70;i+=24){scr.px(wx+i,51,12,18,shade(ink(d),.16));scr.px(wx+i+5,42,7,9,shade(ink(d),.11));}
    scr.px(wx,61,33,1,shade(ink(d),.22));
  }
  // Door pair and route light.
  scr.rect(48,27,32,70,mix('#152128','#2e2111',d),shade(ink(d),.48)); scr.px(63,28,2,68,shade(ink(d),.4));
  if(Math.floor(t*.8)%5===0) scr.px(60,22,8,3,hot(d)); else scr.px(60,22,8,3,shade(ink(d),.3));
  // Vertical poles / hanging geometry.
  for(const x of [23,104]){scr.px(x,19,2,98,shade(ink(d),.56));scr.px(x-7,24,16,1,shade(ink(d),.34));}
  // Seated silhouettes.
  for(const [x,p] of [[10,0],[35,2],[84,1],[109,3]]){const bob=(Math.floor(t*1.2+p)%7===0)?1:0; const c=shade(ink(d),.58); scr.px(x,91+bob,3,4,c);scr.px(x-2,95+bob,7,10,c);scr.px(x-3,105+bob,5,4,c);}
  // One standing passenger shifts weight, enough to sell life without full animation cost.
  const sway=Math.round(Math.sin(t*1.3)); const c=shade(ink(d),.7); scr.px(68+sway,86,3,4,c);scr.px(66+sway,90,7,16,c);scr.px(67+sway,106,2,11,c);scr.px(71+sway,106,2,11,c);scr.line(67+sway,94,61,82,shade(ink(d),.55));
  // Floor light seams.
  const seam=Math.floor(t*5)%15; for(let y=122-seam;y<151;y+=15)scr.px(0,y,W,1,shade(ink(d),.12));
}