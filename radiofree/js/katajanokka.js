// Radio Free Helsinki — Katajanokka harbour layered scene.
// Sparse fixed-grid geometry inspired by the real harbour: terminal masses,
// ferry traffic, cranes, water and foreground quay elements move independently.

import { PAL } from './palette.js?v=37';
import { mix, shade, bayer } from './screen.js?v=37';

const W = 128, H = 152;
const ink = d => mix(PAL.GREEN, PAL.AMBER, d);
const inkLo = d => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d);

function water(scr, t, d) {
  scr.px(0, 82, W, H - 82, mix('#07141d', '#1b140a', d));
  for (let y = 86; y < H; y += 4) {
    const phase = Math.floor((t * (1.2 + (y - 82) * 0.025)) + y) % 9;
    for (let x = -phase; x < W; x += 9) {
      if (bayer((x >> 1) & 3, (y >> 1) & 3) < 0.62)
        scr.px(x, y, 5, 1, shade(inkLo(d), 0.22 + (y - 82) / 220));
    }
  }
}

function skyline(scr, t, d) {
  // L0/L1: low harbour profile rather than a dense skyline.
  const drift = Math.floor((t / 7) % 24);
  for (const wrap of [0, 152]) {
    const x = -drift + wrap;
    scr.px(x, 58, 34, 24, mix('#101920', '#24190b', d));
    scr.px(x + 39, 64, 29, 18, mix('#0d171d', '#21170a', d));
    scr.px(x + 79, 55, 36, 27, mix('#121b21', '#281b0c', d));
    // sparse terminal lights
    for (const lx of [8, 18, 49, 88, 101])
      scr.px(x + lx, 69 + ((lx >> 3) & 1) * 5, 3, 2, shade(inkLo(d), 0.42));
  }
}

function cranes(scr, t, d) {
  // L2: only two cranes; slow independent sway in the booms.
  const sway = Math.round(Math.sin(t * 0.35));
  for (const [x, h, dir] of [[23, 39, 1], [103, 34, -1]]) {
    const y = 81 - h;
    scr.px(x, y, 2, h, shade(inkLo(d), 0.5));
    scr.line(x, y + 5, x + dir * (24 + sway), y + 9, shade(inkLo(d), 0.42));
    scr.line(x, y + 5, x - dir * 8, y + 12, shade(inkLo(d), 0.32));
  }
}

function ferry(scr, t, d) {
  // L4: rigid ferry body plus separately animated windows, wake and mast light.
  const x = 148 - ((t * 5.5) % 210);
  const bob = Math.round(Math.sin(t * 1.6));
  const y = 70 + bob;
  scr.px(x, y + 17, 70, 9, mix('#233039', '#3a2a14', d));
  scr.px(x + 8, y + 6, 49, 12, mix('#2e3c43', '#46331a', d));
  scr.px(x + 18, y + 1, 29, 6, mix('#26353c', '#3c2c16', d));
  scr.px(x + 32, y - 8, 2, 10, shade(inkLo(d), 0.5));
  const blink = (Math.floor(t * 2) & 1) === 0;
  scr.px(x + 31, y - 10, 4, 2, blink ? shade(ink(d), 0.82) : shade(inkLo(d), 0.24));
  for (let i = 0; i < 7; i++) {
    const on = ((Math.floor(t * 1.3) + i) % 5) !== 0;
    scr.px(x + 13 + i * 6, y + 10, 3, 2, on ? shade(inkLo(d), 0.68) : shade(inkLo(d), 0.18));
  }
  // Wake is its own moving layer.
  for (let i = 0; i < 4; i++) scr.px(x - 14 - i * 8, y + 26 + i * 2, 12, 1, shade(inkLo(d), 0.25));
}

function reflections(scr, t, d) {
  // L7: broken vertical masks, not baked into ferry or terminal art.
  for (let i = 0; i < 6; i++) {
    const x = 12 + i * 21 + Math.round(Math.sin(t * 0.45 + i) * 2);
    const pulse = 0.18 + 0.36 * (0.5 + Math.sin(t * 1.1 + i) * 0.5);
    const len = 10 + ((i * 9) % 24);
    for (let yy = 92; yy < 92 + len; yy += 3)
      scr.px(x + ((yy + i) & 2), yy, 2, 1, shade(mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d), pulse));
  }
}

function foreground(scr, t, d) {
  // L8: quay bollards and a passing railing segment move faster than the harbour.
  const shift = Math.floor((t * 8) % 74);
  for (const x0 of [13 - shift, 86 - shift, 159 - shift]) {
    scr.px(x0, 102, 4, 34, shade(inkLo(d), 0.62));
    scr.px(x0 - 2, 102, 8, 3, shade(inkLo(d), 0.72));
  }
  const rail = 150 - ((t * 10) % 192);
  scr.px(rail, 116, 42, 2, shade(inkLo(d), 0.5));
  for (let x = rail; x < rail + 42; x += 10) scr.px(x, 108, 2, 24, shade(inkLo(d), 0.42));
}

export function drawKatajanokka(scr, t, d = 0) {
  scr.bands(0, 0, W, H, [mix('#061019', '#171006', d), mix('#102433', '#2a1d0b', d)]);
  skyline(scr, t, d);
  cranes(scr, t, d);
  water(scr, t, d);
  ferry(scr, t, d);
  reflections(scr, t, d);
  foreground(scr, t, d);
}
