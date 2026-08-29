// Radio Free Helsinki — atmospheric cutaways assembled from cheap moving layers.

import { PAL } from './palette.js?v=37';
import { mix, shade, bayer } from './screen.js?v=37';
import { drawFarCity } from './retrocity.js?v=38';
import { drawTram } from './tram.js?v=38';
import { drawCentralStation } from './centralstation.js?v=39';

export const AMBIENT_KEYS = ['metro', 'raintram', 'centralstation', 'rooftops', 'nightferry'];
const W = 128, H = 152;
const ink = d => mix(PAL.GREEN, PAL.AMBER, d);
const inkLo = d => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d);

function sky(scr, d, top = '#07121b', bottom = '#102737') {
  scr.bands(0, 0, W, H, [mix(top, '#171006', d), mix(bottom, '#2a1c0a', d)]);
}

function rain(scr, t, d, amount = 42, speed = 58, len = 4, alpha = 0.5) {
  for (let i = 0; i < amount; i++) {
    const x = (i * 31 + Math.floor(t * speed * 0.58)) % W;
    const y = (i * 47 + Math.floor(t * speed)) % H;
    if (bayer(i & 3, (i >> 2) & 3) < 0.78) scr.px(x, y, 1, len, shade(inkLo(d), alpha));
  }
}

function drawNearBlocks(scr, t, d) {
  const drift = Math.floor((t / 2.7) % 42);
  const blocks = [
    { x: -20, y: 55, w: 34, h: 29, roof: 3 },
    { x: 47, y: 50, w: 27, h: 34, roof: 0 },
    { x: 106, y: 58, w: 31, h: 26, roof: 2 },
  ];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    for (const wrap of [0, 170]) {
      const x = b.x - drift + wrap;
      scr.px(x, b.y, b.w, b.h, mix('#121a20', '#24180b', d));
      if (b.roof) scr.px(x + 3, b.y - b.roof, b.w - 7, b.roof, mix('#0c1419', '#1c1309', d));
      for (let wy = b.y + 6, row = 0; wy < b.y + b.h - 4; wy += 9, row++) {
        const wx = x + 5 + ((row + i) & 1) * 8;
        scr.px(wx, wy, 4, 3, shade(inkLo(d), 0.45));
        if ((row + i) % 3 === 0) scr.px(wx + 9, wy, 4, 3, shade(inkLo(d), 0.22));
      }
    }
  }
}

function drawTramInfrastructure(scr, t, d) {
  const phase = Math.floor((t * 3.2) % 44);
  for (const base of [16 - phase, 83 - phase, 150 - phase]) {
    scr.px(base, 26, 2, 61, shade(inkLo(d), 0.5));
    scr.px(base - 6, 37, 15, 1, shade(inkLo(d), 0.32));
  }
  const bob = Math.round(Math.sin(t * 0.7));
  scr.line(0, 31 + bob, W, 36 - bob, shade(inkLo(d), 0.35));
  scr.line(0, 42 - bob, W, 46 + bob, shade(inkLo(d), 0.22));
}

function drawWetRails(scr, t, d) {
  scr.px(0, 84, W, H - 84, mix('#0b1115', '#1d160d', d));
  const seam = Math.floor((t * 8) % 14);
  for (let y = 92 - seam; y < H; y += 14) scr.px(0, y, W, 1, shade(inkLo(d), 0.18));
  scr.line(45, 84, 27, H, shade(inkLo(d), 0.76));
  scr.line(81, 84, 101, H, shade(inkLo(d), 0.76));
  scr.line(49, 84, 34, H, shade(inkLo(d), 0.28));
  scr.line(77, 84, 94, H, shade(inkLo(d), 0.28));
}

function drawReflections(scr, t, d) {
  for (let i = 0; i < 6; i++) {
    const x = 8 + i * 22 + Math.round(Math.sin(t * 0.55 + i) * 2);
    const pulse = 0.25 + 0.52 * (0.5 + Math.sin(t * 1.35 + i * 0.9) * 0.5);
    const len = 14 + ((i * 13) % 27);
    for (let yy = 103; yy < 103 + len; yy += 3) {
      const wobble = ((yy + i) & 3) - 1;
      scr.px(x + wobble, yy, 2 + ((yy + i) & 1), 1, shade(mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d), pulse));
    }
  }
}

function drawForeground(scr, t, d) {
  const fg = Math.floor((t * 11) % 88);
  for (const x0 of [24 - fg, 112 - fg]) {
    scr.px(x0, 48, 3, 85, shade(inkLo(d), 0.72));
    scr.px(x0 - 7, 49, 17, 2, shade(inkLo(d), 0.5));
  }
  const sx = 138 - ((t * 9) % 190);
  scr.rect(sx, 67, 22, 42, mix('#0b1217', '#20160b', d), shade(inkLo(d), 0.38));
  scr.px(sx + 3, 72, 16, 27, shade(mix('#142932', '#31220d', d), 0.62));
}

function metro(scr, t, d) {
  sky(scr, d, '#05090d', '#0b171d');
  scr.rect(9, 22, 72, 62, mix('#071014', '#171006', d), inkLo(d));
  scr.rect(14, 28, 62, 51, '#020406', shade(inkLo(d), 0.45));
  for (let y = 90; y < H; y += 6) scr.px(0, y, W, 1, shade(inkLo(d), 0.45));
  scr.px(0, 84, W, 4, mix('#283238', '#493715', d));
  scr.px(0, 103, W, 2, mix('#d5c95d', '#a77b22', d));
  const cycle = (t * 0.12) % 1;
  const approach = Math.min(1, cycle / 0.74);
  const tx = 67 - approach * 50;
  const tw = 36 + approach * 48;
  const th = 25 + approach * 23;
  const ty = 52 - approach * 7;
  scr.rect(tx, ty, tw, th, mix('#25353d', '#3d2d15', d), ink(d * 0.45));
  scr.px(tx, ty + th - 5, tw, 5, mix('#b43b38', '#97551d', d));
  for (let i = 0; i < 4; i++) {
    const wx = tx + 6 + i * Math.max(8, tw / 5);
    scr.px(wx, ty + 6, Math.max(5, tw / 8), Math.max(5, th / 3), mix('#0a161b', '#21180d', d));
  }
  const head = Math.floor(t * 4) % 2 === 0;
  scr.px(tx + 3, ty + th - 10, 3, 3, head ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d) : inkLo(d));
}

function raintram(scr, t, d) {
  sky(scr, d, '#08121b', '#152733');
  drawFarCity(scr, t, 48);
  drawNearBlocks(scr, t, d);
  drawTramInfrastructure(scr, t, d);
  drawWetRails(scr, t, d);
  const tramX = ((t * 15) % (W + 86)) - 68;
  drawTram(scr, tramX, 68, t, d);
  rain(scr, t, d, 25, 34, 2, 0.28);
  drawReflections(scr, t, d);
  drawForeground(scr, t, d);
  rain(scr, t, d, 32, 70, 5, 0.52);
}

function centralstation(scr, t, d) {
  drawCentralStation(scr, t, d);
  // Atmospheric rain remains a shared overlay, not part of the station art.
  rain(scr, t, d, 18, 30, 2, 0.22);
  rain(scr, t, d, 20, 64, 4, 0.42);
}

function rooftops(scr, t, d) {
  sky(scr, d, '#050b13', '#102536');
  drawFarCity(scr, t * 0.6, 54);
  scr.px(0, 118, W, H - 118, mix('#070b0e', '#171006', d));
  const masts = [[18,72,42],[48,64,54],[92,70,46],[112,80,32]];
  for (let i = 0; i < masts.length; i++) {
    const [x,y,h] = masts[i];
    scr.px(x, y - h, 2, h, inkLo(d));
    for (let yy = y - h + 8; yy < y; yy += 10) {
      const half = Math.round((yy - (y - h)) * 0.13);
      scr.line(x, yy, x - half, yy + 7, shade(inkLo(d), 0.65));
      scr.line(x, yy, x + half, yy + 7, shade(inkLo(d), 0.65));
    }
    const blink = (Math.floor(t * 1.8 + i) % 3) === 0;
    scr.px(x - 1, y - h - 3, 4, 3, blink ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d) : shade(inkLo(d), 0.25));
  }
  const sweep = 18 + ((t * 7) % 96);
  scr.px(sweep, 20, 1, 82, shade(PAL.GREEN_DIM, 0.42));
}

function nightferry(scr, t, d) {
  sky(scr, d, '#07111a', '#132536');
  drawFarCity(scr, t * 0.45, 49);
  for (let y = 80; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const wave = Math.sin(x * 0.11 + y * 0.05 + t * 0.8) * 0.07;
      if (bayer(x >> 1, y >> 1) < 0.48 + wave) scr.px(x, y, 2, 2, mix('#0a2736', '#281c0b', d));
    }
  }
  const fx = ((t * 5) % (W + 80)) - 50;
  scr.px(fx, 76, 74, 10, mix('#202d34', '#362814', d));
  scr.px(fx + 9, 59, 50, 18, mix('#2a3a42', '#433219', d));
  for (let i = 0; i < 8; i++) {
    const on = ((Math.floor(t * 1.1) + i) % 5) !== 0;
    scr.px(fx + 13 + i * 6, 65, 3, 3, on ? shade(inkLo(d), 0.85) : shade(inkLo(d), 0.25));
  }
}

const SCENES = { metro, raintram, centralstation, rooftops, nightferry };

export function drawAmbient(key, scr, t, decode = 0) {
  const fn = SCENES[key] || rooftops;
  fn(scr, t, Math.min(0.28, decode * 0.28));
  scr.scanlines(PAL.INK, 3);
}
