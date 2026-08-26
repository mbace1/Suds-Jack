// Radio Free Helsinki — atmospheric cutaways.
// These are deliberately NOT wire art keys. They are broadcast texture chosen
// by codec.js between story-specific shots, so adding one cannot make a daily
// wire fail validation. Story.visual and story.broll remain the factual image.

import { PAL } from './palette.js?v=37';
import { mix, shade, bayer } from './screen.js?v=37';

export const AMBIENT_KEYS = ['metro', 'raintram', 'rooftops', 'nightferry'];

const W = 128, H = 152;
const ink = (d) => mix(PAL.GREEN, PAL.AMBER, d);
const inkLo = (d) => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d);

function sky(scr, d, top = '#07121b', bottom = '#102737') {
  scr.bands(0, 0, W, H, [mix(top, '#171006', d), mix(bottom, '#2a1c0a', d)]);
}

function metro(scr, t, d) {
  sky(scr, d, '#05090d', '#0b171d');
  // tunnel mouth and tiled platform
  scr.rect(9, 22, 72, 62, mix('#071014', '#171006', d), inkLo(d));
  scr.rect(14, 28, 62, 51, '#020406', shade(inkLo(d), 0.45));
  for (let y = 90; y < H; y += 6) scr.px(0, y, W, 1, shade(inkLo(d), 0.45));
  for (let x = 0; x < W; x += 12) scr.px(x, 86, 1, H - 86, shade(inkLo(d), 0.38));
  scr.px(0, 84, W, 4, mix('#283238', '#493715', d));
  scr.px(0, 103, W, 2, mix('#d5c95d', '#a77b22', d));

  // train pushes in from the tunnel and briefly fills the frame
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

  // sparse passengers; no crowd spectacle
  for (let i = 0; i < 7; i++) {
    const x = 8 + i * 17 + Math.sin(t * 0.4 + i) * 1.5;
    const y = 114 + (i % 2) * 9;
    scr.disc(x, y, 2, inkLo(d));
    scr.px(x - 2, y + 3, 5, 8, shade(ink(d * 0.25), 0.72));
  }
}

function raintram(scr, t, d) {
  sky(scr, d, '#08121b', '#152733');
  // wet apartment canyon
  for (let i = 0; i < 6; i++) {
    const x = i * 23 - 5;
    const h = 48 + ((i * 17) % 31);
    scr.px(x, 72 - h, 21, h, mix('#10191f', '#24180b', d));
    for (let wy = 0; wy < h - 8; wy += 9) {
      const on = ((Math.floor(t * 1.2) + i + wy) % 4) !== 0;
      scr.px(x + 5, 72 - h + 5 + wy, 4, 3, on ? shade(inkLo(d), 0.8) : shade(inkLo(d), 0.3));
      scr.px(x + 13, 72 - h + 5 + wy, 4, 3, on ? shade(inkLo(d), 0.58) : shade(inkLo(d), 0.25));
    }
  }
  scr.px(0, 73, W, H - 73, mix('#0b1115', '#1d160d', d));
  scr.line(47, 73, 32, H, shade(inkLo(d), 0.72));
  scr.line(80, 73, 96, H, shade(inkLo(d), 0.72));

  // reflected lights stretch across the wet street
  for (let i = 0; i < 6; i++) {
    const x = 10 + i * 22;
    const pulse = 0.35 + 0.65 * (0.5 + Math.sin(t * 1.7 + i) * 0.5);
    scr.px(x, 95, 2, 50, shade(mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d), pulse));
  }

  // tram passes close, then clears the shot
  const tr = ((t * 16) % (W + 82)) - 64;
  scr.rect(tr, 68, 60, 36, mix('#26333a', '#3d2d16', d), inkLo(d));
  scr.px(tr, 68, 60, 4, mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d));
  for (let i = 0; i < 4; i++) scr.px(tr + 7 + i * 13, 76, 9, 12, mix('#0a161b', '#21180d', d));
  scr.px(tr + 51, 96, 5, 3, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));

  // rain, intentionally irregular
  for (let i = 0; i < 46; i++) {
    const x = (i * 31 + Math.floor(t * 34)) % W;
    const y = (i * 47 + Math.floor(t * 58)) % H;
    if (bayer(i & 3, (i >> 2) & 3) < 0.78) scr.px(x, y, 1, 4, shade(inkLo(d), 0.55));
  }
}

function rooftops(scr, t, d) {
  sky(scr, d, '#050b13', '#102536');
  // distant city layers
  for (let layer = 0; layer < 3; layer++) {
    const base = 72 + layer * 18;
    const c = mix(['#0a151d', '#0b1117', '#070b10'][layer], '#21170b', d);
    for (let x = -8; x < W; x += 15 + layer * 3) {
      const h = 12 + ((x * 7 + layer * 13) & 15);
      scr.px(x, base - h, 16 + layer * 3, h, c);
    }
  }
  scr.px(0, 118, W, H - 118, mix('#070b0e', '#171006', d));

  // antenna farm — the pirate-radio visual anchor
  const masts = [[18, 72, 42], [48, 64, 54], [92, 70, 46], [112, 80, 32]];
  for (let i = 0; i < masts.length; i++) {
    const [x, y, h] = masts[i];
    scr.px(x, y - h, 2, h, inkLo(d));
    for (let yy = y - h + 8; yy < y; yy += 10) {
      const half = Math.round((yy - (y - h)) * 0.13);
      scr.line(x, yy, x - half, yy + 7, shade(inkLo(d), 0.65));
      scr.line(x, yy, x + half, yy + 7, shade(inkLo(d), 0.65));
    }
    const blink = (Math.floor(t * 1.8 + i) % 3) === 0;
    scr.px(x - 1, y - h - 3, 4, 3, blink ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d) : shade(inkLo(d), 0.25));
  }

  // slow radio sweep; ambient, so it never turns amber just because DECODE is on
  const sweep = 18 + ((t * 7) % 96);
  scr.px(sweep, 20, 1, 82, shade(PAL.GREEN_DIM, 0.42));
  for (let y = 25; y < 95; y += 13) scr.px(sweep - 3, y, 7, 1, shade(PAL.GREEN_DIM, 0.28));

  // single lit attic, keeps the station homemade rather than military
  const glow = 0.65 + Math.sin(t * 0.8) * 0.18;
  scr.rect(56, 104, 22, 14, mix('#10161a', '#24190c', d), inkLo(d));
  scr.px(62, 108, 9, 5, shade(mix(PAL.GREEN, PAL.AMBER_DIM, d * 0.2), glow));
}

function nightferry(scr, t, d) {
  sky(scr, d, '#07111a', '#132536');
  // horizon and water
  for (let x = 0; x < W; x += 5) {
    const h = 5 + ((x * 7) % 13);
    scr.px(x, 55 - h, 6, h, mix('#0a1218', '#1c1409', d));
  }
  for (let y = 62; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const wave = Math.sin(x * 0.11 + y * 0.05 + t * 0.8) * 0.07;
      if (bayer(x >> 1, y >> 1) < 0.48 + wave) scr.px(x, y, 2, 2, mix('#0a2736', '#281c0b', d));
    }
  }

  // ferry moves slowly enough to read as a place, not an action shot
  const fx = ((t * 5) % (W + 80)) - 50;
  scr.px(fx, 69, 74, 10, mix('#202d34', '#362814', d));
  scr.px(fx + 9, 52, 50, 18, mix('#2a3a42', '#433219', d));
  scr.px(fx + 18, 44, 22, 8, mix('#33464f', '#513b1c', d));
  for (let i = 0; i < 8; i++) {
    const on = ((Math.floor(t * 1.1) + i) % 5) !== 0;
    scr.px(fx + 13 + i * 6, 58, 3, 3, on ? shade(inkLo(d), 0.85) : shade(inkLo(d), 0.25));
  }
  scr.px(fx + 67, 72, 4, 3, mix('#ba423e', '#a56020', d));

  // sodium-like harbour glows, still desaturated so amber remains DECODE's language
  for (let i = 0; i < 5; i++) {
    const lx = 10 + i * 27;
    const pulse = 0.36 + Math.sin(t * 0.55 + i) * 0.08;
    scr.px(lx, 48, 2, 14, shade(PAL.GREEN_DIM, pulse));
    scr.px(lx - 2, 47, 6, 2, shade(PAL.GREEN, pulse));
  }
}

const SCENES = { metro, raintram, rooftops, nightferry };

export function drawAmbient(key, scr, t, decode = 0) {
  const fn = SCENES[key] || rooftops;
  // Ambient shots are atmosphere, not evidence. Decode tint is deliberately
  // capped so the story graphic owns the full amber reveal.
  fn(scr, t, Math.min(0.28, decode * 0.28));
  scr.scanlines(PAL.INK, 3);
}
