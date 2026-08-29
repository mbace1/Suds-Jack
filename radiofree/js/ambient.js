// Radio Free Helsinki — atmospheric cutaways.
// Each scene is assembled from cheap moving layers rather than a flattened
// illustration. Story visuals remain factual; these are broadcast atmosphere.

import { PAL } from './palette.js?v=37';
import { mix, shade, bayer } from './screen.js?v=37';
import { drawFarCity } from './retrocity.js?v=38';

export const AMBIENT_KEYS = ['metro', 'raintram', 'rooftops', 'nightferry'];

const W = 128, H = 152;
const ink = d => mix(PAL.GREEN, PAL.AMBER, d);
const inkLo = d => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d);

function sky(scr, d, top = '#07121b', bottom = '#102737') {
  scr.bands(0, 0, W, H, [mix(top, '#171006', d), mix(bottom, '#2a1c0a', d)]);
}

function rain(scr, t, d, amount = 42, speed = 58) {
  for (let i = 0; i < amount; i++) {
    const x = (i * 31 + Math.floor(t * speed * 0.58)) % W;
    const y = (i * 47 + Math.floor(t * speed)) % H;
    if (bayer(i & 3, (i >> 2) & 3) < 0.78) scr.px(x, y, 1, 4, shade(inkLo(d), 0.5));
  }
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
    scr.px(wx, ty + 6, Math.max(5, tw / 8), Math.max(5, th / 3), mix('#0a171d', '#24190c', d));
  }
  const head = Math.floor(t * 4) % 2 === 0;
  scr.px(tx + 3, ty + th - 10, 3, 3, head ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d) : inkLo(d));
}

function raintram(scr, t, d) {
  sky(scr, d, '#08121b', '#152733');

  // L0: actual-art far city. Almost static: one pixel every six seconds.
  drawFarCity(scr, t, 48);

  // L1: sparse nearer blocks, deliberately less dense than the old canyon.
  const drift = Math.floor((t / 3.5) % 28);
  const blocks = [[-8,52,30,33],[38,58,24,27],[78,49,31,36],[118,60,26,25]];
  for (let i = 0; i < blocks.length; i++) {
    const [bx, by, bw, bh] = blocks[i];
    const x = bx - drift;
    for (const xx of [x, x + 156]) {
      scr.px(xx, by, bw, bh, mix('#10191f', '#24180b', d));
      for (let wy = by + 6; wy < by + bh - 4; wy += 9)
        scr.px(xx + 5 + ((wy / 9) & 1) * 8, wy, 4, 3, shade(inkLo(d), 0.52));
    }
  }

  // L2/L3: infrastructure and ground move independently.
  scr.px(0, 84, W, H - 84, mix('#0b1115', '#1d160d', d));
  const railPhase = Math.floor((t * 7) % 16);
  for (let y = 91 - railPhase; y < H; y += 16) scr.px(0, y, W, 1, shade(inkLo(d), 0.26));
  scr.line(45, 84, 27, H, shade(inkLo(d), 0.72));
  scr.line(81, 84, 101, H, shade(inkLo(d), 0.72));
  const wireBob = Math.round(Math.sin(t * 0.8));
  scr.line(0, 31 + wireBob, W, 37 - wireBob, shade(inkLo(d), 0.35));
  scr.line(14, 0, 14, 84, shade(inkLo(d), 0.42));
  scr.line(111, 0, 111, 84, shade(inkLo(d), 0.42));

  // L4: rigid tram body, with motion from position + tiny suspension bob.
  const tr = ((t * 15) % (W + 82)) - 64;
  const bob = Math.floor(t * 5) % 2;
  scr.rect(tr, 68 + bob, 60, 36, mix('#26333a', '#3d2d16', d), inkLo(d));
  scr.px(tr, 68 + bob, 60, 4, mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d));
  for (let i = 0; i < 4; i++) scr.px(tr + 7 + i * 13, 76 + bob, 9, 12, mix('#0a161b', '#21180d', d));
  scr.px(tr + 51, 96 + bob, 5, 3, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));

  // L7/L9: reflections and emissive pulses are masks, not baked into ground.
  for (let i = 0; i < 5; i++) {
    const x = 9 + i * 25;
    const pulse = 0.33 + 0.55 * (0.5 + Math.sin(t * 1.5 + i) * 0.5);
    const len = 18 + ((i * 11) % 25);
    scr.px(x, 102, 2, len, shade(mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d), pulse));
  }

  // L6/L8: near rain moves fastest and therefore sells depth cheaply.
  rain(scr, t, d, 46, 62);
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

const SCENES = { metro, raintram, rooftops, nightferry };

export function drawAmbient(key, scr, t, decode = 0) {
  const fn = SCENES[key] || rooftops;
  fn(scr, t, Math.min(0.28, decode * 0.28));
  scr.scanlines(PAL.INK, 3);
}
