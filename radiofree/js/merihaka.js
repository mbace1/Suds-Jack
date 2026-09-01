// Radio Free Helsinki — Merihaka concrete waterfront.
// Sparse brutalist towers, raised pedestrian deck, water edge and Hakaniemi-side infrastructure.
import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
const W=128,H=152; const ink=d=>mix(PAL.GREEN_DIM,PAL.AMBER_DIM,d);
export function drawMerihaka(scr,t,d=0){
  scr.bands(0,0,W,66,[mix('#071019','#171006',d),mix('#10212b','#291c0a',d)]);
  const drift=Math.floor((t*.22)%180);
  for(const wrap of [0,180]){const x=-20-drift+wrap;
    // Tall slab silhouettes and repetitive balconies are the anchor.
    scr.px(x,15,25,69,mix('#1c282e','#342512',d)); scr.px(x+33,29,31,55,mix('#17232a','#30200f',d)); scr.px(x+77,8,27,76,mix('#202c32','#392713',d));
    for(const bx of [x+4,x+10,x+16,x+37,x+45,x+53,x+81,x+88,x+95]) for(let y=24;y<78;y+=9) scr.px(bx,y,4,2,shade(ink(d),.28));
  }
  // Raised concrete deck.
  scr.px(0,79,W,10,mix('#202a2d','#3a2a18',d)); for(let x=8;x<W;x+=24) scr.px(x,88,4,30,shade(ink(d),.34));
  // Water foreground, separate moving reflection bars.
  scr.px(0,113,W,39,mix('#071218','#17130d',d)); const phase=Math.floor(t*8)%17; for(let y=119;y<151;y+=8) for(let x=-phase;x<W;x+=25) scr.px(x,y,11,1,shade(ink(d),.2));
  // Shore rail/road motion.
  const car=((t*15)%(W+25))-20; scr.px(car,101,13,4,shade(ink(d),.55)); scr.px(car+2,105,3,1,shade(ink(d),.32)); scr.px(car+9,105,3,1,shade(ink(d),.32));
  // Close lamp/pole gives foreground speed.
  const fg=142-((t*5.5)%175); scr.px(fg,48,3,76,shade(ink(d),.68)); scr.px(fg-5,49,11,2,shade(ink(d),.48));
}