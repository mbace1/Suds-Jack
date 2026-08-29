// Radio Free Helsinki — Helsinki Metro platform, fixed-grid layered scene.
// Refinement of the existing formula: sparse architecture, orange train identity,
// animated approach, platform life and signal light. No baked weather or DECODE.

import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';

const W = 128, H = 152;
const wall = d => mix('#10191c', '#24190d', d);
const dark = d => mix('#05090b', '#171006', d);
const line = d => shade(mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d), .48);

function tunnel(scr, d) {
  scr.px(0, 0, W, H, dark(d));
  scr.px(0, 24, W, 66, wall(d));
  scr.px(6, 31, 116, 56, '#020405');
  scr.px(12, 38, 104, 49, dark(d));
  for (let x = 8; x < W; x += 22) scr.px(x, 15, 2, 72, shade(line(d), .34));
  scr.px(0, 20, W, 2, shade(line(d), .30));
  scr.px(0, 27, W, 1, shade(line(d), .18));
}

function platform(scr, t, d) {
  scr.px(0, 88, W, H - 88, mix('#141b1d', '#2a2012', d));
  scr.px(0, 88, W, 3, mix('#455055', '#5a431a', d));
  scr.px(0, 101, W, 2, mix('#d09a28', '#c88820', d));
  const seam = Math.floor((t * 3.5) % 18);
  for (let y = 110 - seam; y < H; y += 18) scr.px(0, y, W, 1, shade(line(d), .18));
  for (let x = 10; x < W; x += 24) scr.px(x, 91, 1, H - 91, shade(line(d), .12));
}

function train(scr, t, d) {
  const cycle = (t * .11) % 1;
  const a = Math.min(1, cycle / .78);
  const x = Math.round(79 - a * 80);
  const y = Math.round(49 - a * 6);
  const w = Math.round(31 + a * 76);
  const h = Math.round(25 + a * 30);
  const shell = mix('#8f3b20', '#8a4d1c', d);
  const shellHi = mix('#c95d2b', '#b76825', d);
  const glass = mix('#071317', '#21180d', d);

  scr.px(x, y, w, h, shell);
  scr.px(x + 2, y + 2, Math.max(4, w - 4), 3, shellHi);
  scr.px(x, y + h - 6, w, 6, mix('#48241c', '#523019', d));

  const bays = Math.max(3, Math.floor(w / 18));
  const step = Math.max(12, Math.floor((w - 10) / bays));
  for (let i = 0; i < bays; i++) {
    const wx = x + 6 + i * step;
    const ww = Math.max(5, Math.min(10, step - 4));
    scr.px(wx, y + 8, ww, Math.max(7, Math.floor(h * .34)), glass);
    if ((i + Math.floor(t * 1.2)) % 5 !== 0) scr.px(wx + 2, y + 10, 2, 2, shade(PAL.GREEN_DIM, .34));
  }

  if (a > .42) {
    scr.px(x + 4, y + h - 14, Math.max(4, Math.floor(w * .11)), 3, shade(PAL.GREEN_HOT, .42));
    const blink = (Math.floor(t * 2.2) & 1) === 0;
    scr.px(x + 3, y + h - 9, 3, 3, blink ? shade(PAL.GREEN_HOT, .86) : shade(PAL.GREEN_DIM, .35));
  }
}

function furniture(scr, t, d) {
  scr.px(88, 32, 29, 8, wall(d));
  scr.rect(89, 33, 27, 6, dark(d), shade(line(d), .48));
  const pulse = .32 + .28 * (.5 + Math.sin(t * 1.1) * .5);
  scr.px(93, 35, 8, 2, shade(PAL.GREEN_DIM, pulse));
  scr.px(105, 35, 7, 2, shade(PAL.GREEN_DIM, .26));
  scr.px(12, 111, 28, 3, shade(line(d), .48));
  scr.px(15, 114, 2, 11, shade(line(d), .38));
  scr.px(35, 114, 2, 11, shade(line(d), .38));
  scr.px(61, 54, 4, 79, shade(line(d), .52));
}

function signal(scr, t, d) {
  const on = (Math.floor(t * 1.5) % 3) !== 0;
  scr.px(118, 51, 3, 15, shade(line(d), .44));
  scr.px(116, 48, 7, 6, dark(d));
  scr.px(118, 50, 3, 3, on ? shade(PAL.GREEN_HOT, .78) : shade(PAL.GREEN_DIM, .24));
}

export function drawMetro(scr, t, d = 0) {
  tunnel(scr, d);
  train(scr, t, d);
  platform(scr, t, d);
  furniture(scr, t, d);
  signal(scr, t, d);
}
