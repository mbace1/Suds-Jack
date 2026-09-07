// Radio Free Helsinki — Helsinki rooftop signal scene.
// Fixed 128x152 grid. Sparse, local roof geometry; motion comes from beacon,
// aerial sway and distant aircraft, not from filling the skyline with effects.

import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
import { drawFarCity } from './retrocity.js?v=38';

const W = 128, H = 152;
const inkLo = d => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d);

function sky(scr, d) {
  scr.bands(0, 0, W, H, [mix('#050a10', '#160f07', d), mix('#0b1a26', '#261908', d)]);
  drawFarCity(scr, 0, 55);
}

function distantLandmarks(scr, d) {
  const dim = shade(inkLo(d), .34);
  // Simplified Helsinki silhouette cues: cathedral dome/spires and tower mass.
  scr.px(12, 52, 18, 2, dim);
  scr.px(18, 45, 6, 7, dim);
  scr.px(20, 41, 2, 4, dim);
  scr.px(17, 43, 1, 3, dim);
  scr.px(24, 43, 1, 3, dim);
  scr.px(99, 39, 5, 17, dim);
  scr.px(100, 34, 3, 5, dim);
  scr.px(101, 30, 1, 4, dim);
}

function roofMasses(scr, d) {
  const wall = mix('#0a0f13', '#1d1409', d);
  const roof = mix('#111920', '#2a1b0b', d);
  const edge = shade(inkLo(d), .34);

  scr.px(0, 101, 48, 51, wall);
  scr.line(0, 101, 20, 91, edge);
  scr.line(20, 91, 48, 101, edge);
  scr.px(6, 98, 35, 4, roof);

  scr.px(45, 107, 49, 45, wall);
  scr.line(45, 107, 70, 95, edge);
  scr.line(70, 95, 94, 107, edge);
  scr.px(52, 103, 36, 4, roof);

  scr.px(91, 99, 37, 53, wall);
  scr.line(91, 99, 111, 88, edge);
  scr.line(111, 88, 128, 98, edge);
  scr.px(96, 96, 27, 4, roof);

  for (const [x,y,h] of [[10,88,13],[31,89,11],[58,91,10],[81,94,10],[103,82,15],[119,87,12]]) {
    scr.px(x, y, 4, h, mix('#171c1e', '#35230e', d));
    scr.px(x-1, y, 6, 2, edge);
  }
  scr.rect(66, 100, 12, 9, mix('#12191e', '#2b1d0c', d), edge);
  for (let x=4;x<124;x+=14) scr.px(x,112,8,1,shade(inkLo(d),.17));
}

function aerials(scr, t, d) {
  const c = shade(inkLo(d), .72);
  const hot = mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d);
  const sway = Math.round(Math.sin(t*.45));

  for (const [x,base,h] of [[26,94,28],[74,99,36],[108,88,27]]) {
    scr.px(x, base-h, 1, h, c);
    scr.line(x-7, base-h+7, x+7, base-h+7+sway, shade(c,.7));
    scr.line(x-5, base-h+12, x+5, base-h+12-sway, shade(c,.55));
  }

  const mx=50, base=103, top=50;
  scr.px(mx, top, 2, base-top, c);
  for(let y=58;y<99;y+=9){
    const half=Math.max(2,Math.round((y-top)*.11));
    scr.line(mx,y,mx-half,y+6,shade(c,.65));
    scr.line(mx+1,y,mx+1+half,y+6,shade(c,.65));
  }
  const blink = (Math.floor(t*1.7)%4)===0;
  scr.px(mx-1, top-3, 4, 3, blink ? hot : shade(inkLo(d),.18));
}

function life(scr, t, d) {
  const c = shade(inkLo(d), .28);
  const ax = Math.floor((t*3.2) % (W+20)) - 10;
  const ay = 25 + Math.round(Math.sin(t*.35)*2);
  scr.px(ax, ay, 2, 1, c);

  const steamX = 34 + Math.round(Math.sin(t*.55));
  for (let i=0;i<3;i++) {
    const yy = 84 - i*4 - ((Math.floor(t*3)+i)%3);
    scr.px(steamX+i, yy, 2, 2, shade(inkLo(d), .10 + i*.05));
  }
}

function foreground(scr, t, d) {
  const c = shade(inkLo(d), .5);
  const x = Math.floor(138 - ((t*4.2) % 180));
  scr.px(x, 58, 3, 94, c);
  scr.px(x-5, 70, 13, 2, shade(c,.7));
}

export function drawRooftops(scr, t, d = 0) {
  sky(scr, d);
  distantLandmarks(scr, d);
  roofMasses(scr, d);
  aerials(scr, t, d);
  life(scr, t, d);
  foreground(scr, t, d);
}
