// Radio Free Helsinki — the picture half of a post.
// Portrait panels. Two kinds:
//   GRAPHICS — charts / diagrams that DECODE mutates
//   B-ROLL   — low-poly Helsinki news footage
// Face shots are handled in codec.js (large masked Toko), not here.

import { PAL } from './palette.js?v=12';
import { mix, shade, bayer } from './screen.js?v=12';

export const PANEL_W = 128, PANEL_H = 152;
const W = PANEL_W, H = PANEL_H;

function field(scr, decode, grid = true) {
  scr.clear(mix(PAL.PANEL, '#1a1206', decode * 0.5));
  if (!grid) return;
  const g = mix(PAL.GREEN_LO, PAL.AMBER_DIM, decode * 0.7);
  for (let x = 0; x < W; x += 8) scr.px(x, 0, 1, H, shade(g, 0.5));
  for (let y = 0; y < H; y += 8) scr.px(0, y, W, 1, shade(g, 0.5));
}

const ink = (decode) => mix(PAL.GREEN, PAL.AMBER, decode);
const inkLo = (decode) => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, decode);

const GLYPH = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
  '%': ['101', '001', '010', '100', '101'], '?': ['111', '001', '011', '000', '010'],
  '+': ['000', '010', '111', '010', '000'], '-': ['000', '000', '111', '000', '000'],
  '.': ['000', '000', '000', '000', '100'], ' ': ['000', '000', '000', '000', '000'],
  '=': ['000', '111', '000', '111', '000'], 'x': ['000', '101', '010', '101', '000'],
};

export function num(scr, x, y, text, color) {
  let cx = x;
  for (const ch of String(text)) {
    const g = GLYPH[ch] ?? GLYPH['?'];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
      if (g[r][c] === '1') scr.px(cx + c, y + r, 1, 1, color);
    }
    cx += 4;
  }
}

function chart(scr, t, d) {
  field(scr, d);
  const cols = 13, rows = 20, cut = 92;
  const lit = ink(d * 0.2), gone = mix(PAL.GREEN_LO, PAL.AMBER, d);
  for (let i = 0; i < cols * rows; i++) {
    const x = 9 + (i % cols) * 9, y = 6 + Math.floor(i / cols) * 7;
    const isCut = i >= cols * rows - cut;
    const wave = Math.sin(t * 2 + i * 0.4) * 0.5 + 0.5;
    if (isCut && d > 0.15) {
      if (wave > 0.75 - d * 0.5) scr.px(x, y, 4, 4, shade(gone, 0.4));
      else scr.px(x + 1, y + 1, 1, 1, gone);
    } else {
      scr.px(x, y, 4, 4, wave > 0.8 ? PAL.GREEN_HOT : lit);
    }
  }
  num(scr, 9, H - 9, d > 0.4 ? '-92' : '260', ink(d));
}

function chart2(scr, t, d) {
  field(scr, d);
  const vals = [72, 70, 69, 71, 74, 78, 82, 88, 94, 99];
  const base = 68 - d * 68;
  const top = 104;
  const bw = 10, x0 = 18, floor = H - 18, ceil = 22;
  scr.px(x0 - 5, ceil - 6, 1, floor - ceil + 6, inkLo(d));
  scr.px(x0 - 5, floor, W - x0, 1, inkLo(d));
  vals.forEach((v, i) => {
    const k = (v - base) / (top - base);
    const h = Math.max(1, Math.round(k * (floor - ceil)));
    const grow = Math.min(1, Math.max(0, t * 1.6 - i * 0.08));
    const hh = Math.round(h * grow);
    const c = i === vals.length - 1 ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d) : ink(d * 0.85);
    scr.px(x0 + i * bw, floor - hh, bw - 3, hh, c);
    scr.px(x0 + i * bw, floor - hh, bw - 3, 1, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  });
  num(scr, 3, floor - 4, d > 0.5 ? '0' : '68', inkLo(d));
  num(scr, 3, ceil - 2, '99', inkLo(d));
  num(scr, W - 30, 8, d > 0.5 ? '+4%' : '+40%', ink(d));
}

function mesh(scr, t, d) {
  field(scr, d);
  const a = { x: 64, y: 42, r: 14 }, b = { x: 64, y: 110, r: 22 };
  const pulse = Math.sin(t * 3) * 0.5 + 0.5;
  scr.disc(b.x, b.y, b.r - Math.round(d * 2), mix(PAL.GREEN_LO, PAL.AMBER_DIM, d), ink(d));
  scr.disc(a.x, a.y, Math.max(3, a.r - Math.round(d * 8)), mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.4), ink(d * 0.4));
  for (let y = a.y + a.r; y < b.y - b.r; y += 3) {
    const on = ((y + Math.floor(t * 22)) % 9) < 5;
    scr.px(a.x, y, 1, 2, on ? ink(d) : inkLo(d));
  }
  if (d > 0.25) {
    const tipy = b.y - b.r - 4 - pulse * 3;
    scr.line(a.x, tipy, a.x - 4, tipy + 6, PAL.AMBER_HOT);
    scr.line(a.x, tipy, a.x + 4, tipy + 6, PAL.AMBER_HOT);
  }
  num(scr, a.x + a.r + 6, a.y - 2, '41', ink(d));
  num(scr, b.x + b.r + 4, b.y - 2, d > 0.4 ? '100%' : '50%', ink(d));
}

function crowd(scr, t, d) {
  field(scr, d);
  scr.px(22, 12, 84, 3, inkLo(d));
  for (let i = 0; i < 4; i++) {
    const x = 34 + i * 20, bob = Math.sin(t * 2 + i) * 1;
    scr.disc(x, 28 + bob, 3, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
    scr.px(x - 3, 32 + bob, 7, 8, ink(d));
  }
  scr.px(8, 46, W - 16, 1, inkLo(d));
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 11; c++) {
      const x = 12 + c * 10, y = 56 + r * 10;
      const seatOn = d < 0.3 || ((r * 11 + c) % 19 === 0);
      if (seatOn) {
        scr.disc(x, y, 2, ink(d * 0.5));
        scr.px(x - 2, y + 3, 5, 4, inkLo(d));
      } else if (d > 0.3) {
        scr.px(x - 2, y + 3, 5, 1, shade(inkLo(d), 0.5));
      }
    }
  }
  num(scr, 6, H - 9, d > 0.4 ? '4' : '900', ink(d));
}

function heat(scr, t, d) {
  field(scr, d);
  scr.rect(14, 16, 56, 52, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.6), ink(d));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const on = ((Math.floor(t * 3) + r * 3 + c) % 5) !== 0;
    scr.px(20 + c * 16, 22 + r * 12, 11, 7, on ? ink(d) : inkLo(d));
  }
  for (let i = 0; i < 6; i++) {
    const y = 74 + i * 10, off = Math.sin(t * 4 - i * 0.8) * 2;
    scr.px(40 + off, y, 3, 8, mix(PAL.GAMING, PAL.AMBER_HOT, d));
  }
  for (let i = 0; i < 3; i++) {
    scr.rect(66 + (i % 2) * 20, 108 + i * 14, 16, 12, inkLo(d), ink(d * 0.6));
  }
  if (d > 0.2) {
    const drawH = Math.round(d * 60);
    scr.px(94, 68 - drawH, 5, drawH, PAL.AMBER_HOT);
    num(scr, 90, 74, '96%', PAL.AMBER_HOT);
    num(scr, 40, H - 9, '4%', PAL.AMBER);
  }
}

function crane(scr, t, d) {
  field(scr, d);
  scr.px(0, 108, W, 2, inkLo(d));
  const bx = 26;
  scr.px(bx, 26, 3, 82, ink(d)); scr.px(bx + 62, 26, 3, 82, ink(d));
  scr.px(bx - 6, 22, 78, 4, ink(d));
  const tx = bx + 8 + ((t * 16) % 48);
  scr.px(tx, 26, 4, 10, ink(d));
  const drop = 52 + Math.sin(t * 1.6) * 14;
  scr.px(tx + 1, 36, 1, drop - 36, inkLo(d));
  scr.px(tx - 5, drop, 12, 8, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  scr.rect(bx + 4, 44, 11, 10, PAL.PANEL_LO, ink(d));
  if (d < 0.35) scr.px(bx + 8, 47, 4, 4, PAL.GREEN_HOT);
  for (let i = 0; i < 4; i++) {
    scr.rect(14 + i * 26, 96, 22, 12, inkLo(d), ink(d * 0.5));
  }
  if (d > 0.35) {
    scr.rect(30, 122, 68, 20, PAL.PANEL_LO, PAL.AMBER);
    for (let i = 0; i < 6; i++) {
      const on = ((Math.floor(t * 4) + i) % 4) !== 0;
      scr.px(36 + i * 10, 130, 6, 6, on ? PAL.AMBER_HOT : PAL.AMBER_DIM);
    }
  }
}

function tower(scr, t, d) {
  field(scr, d);
  const mx = 42, apex = 18, base = 136;
  if (d < 0.3) {
    for (let i = 0; i < 3; i++) {
      const r = ((t * 22 + i * 26) % 78);
      const c = shade(PAL.GREEN, 1 - r / 92);
      for (let a = -1.25; a < 1.25; a += 0.05) {
        scr.px(mx + Math.cos(a) * r, apex + 4 + Math.sin(a) * r, 1, 1, c);
      }
    }
  }
  scr.line(mx, base, mx - 12, apex, ink(d));
  scr.line(mx, base, mx + 12, apex, ink(d));
  for (let y = apex + 6; y < base; y += 10) {
    const half = 12 * (y - apex) / (base - apex);
    scr.px(mx - half, y, half * 2, 1, inkLo(d));
  }
  scr.px(mx - 2, apex - 8, 4, 10, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  if (d >= 0.3) {
    const steps = ['3', '1', '1'];
    for (let i = 0; i < 3; i++) {
      const y = 28 + i * 40;
      scr.rect(68, y, 52, 18, PAL.PANEL_LO, PAL.AMBER);
      num(scr, 74, y + 7, steps[i], PAL.AMBER_HOT);
      for (let b = 0; b < +steps[i]; b++) scr.px(88 + b * 8, y + 6, 5, 6, PAL.AMBER_DIM);
      if (i < 2) {
        const k = (t * 26 + i * 14) % 14;
        scr.px(94, y + 18 + k, 1, 4, PAL.AMBER_HOT);
        scr.px(93, y + 36, 3, 1, PAL.AMBER_DIM);
      }
    }
  }
}

function coin(scr, t, d) {
  field(scr, d);
  const cx = 64, rows = 18;
  for (let i = 0; i < rows; i++) {
    const y = H - 14 - i * 7;
    const grow = Math.min(1, Math.max(0, t * 2 - i * 0.1));
    if (grow <= 0) continue;
    const w = Math.round(52 * grow);
    const paid = i === 0;
    const c = paid ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d)
                   : (d > 0.3 ? shade(PAL.AMBER_DIM, 0.7) : PAL.GREEN_DIM);
    if (d > 0.3 && !paid) {
      scr.rect(cx - w / 2, y, w, 6, PAL.PANEL, c);
    } else {
      scr.rect(cx - w / 2, y, w, 6, c, shade(c, 0.6));
    }
  }
  num(scr, 10, 12, d > 0.4 ? '24' : '400', ink(d));
  num(scr, 10, 20, d > 0.4 ? '6%' : '100%', inkLo(d));
}

function sea(scr, t, d) {
  field(scr, d, false);
  for (let y = 22; y < 116; y += 2) {
    for (let x = 0; x < W; x += 2) {
      const u = (y - 22) / 94 + Math.sin(x * 0.06 + t) * 0.04;
      if (bayer(x >> 1, y >> 1) < 0.62 - u * 0.5) scr.px(x, y, 2, 2, mix('#0d3242', '#2a1f0d', d));
    }
  }
  const hx = 24 + ((t * 9) % 92);
  scr.px(hx - 14, 12, 28, 6, ink(d));
  scr.px(hx - 4, 6, 6, 6, inkLo(d));
  scr.px(0, 116, W, H - 116, mix('#123033', '#302408', d));
  for (let x = 0; x < W; x += 4) scr.px(x, 116 + (x % 8 === 0 ? 1 : 0), 4, 1, inkLo(d));
  scr.px(0, 124, W, 3, mix(PAL.GAMING, PAL.AMBER_HOT, d));
  if (d > 0.2) {
    scr.line(hx, 18, hx - 30, 120, PAL.AMBER_DIM);
    for (let x = hx - 34; x < hx - 6; x += 3) scr.px(x, 120 + Math.sin(x) * 1, 2, 2, PAL.AMBER_HOT);
    scr.px(hx - 34, 120, 34, 1, PAL.AMBER);
  } else {
    scr.px(54, 121, 18, 6, PAL.PANEL_LO);
    num(scr, 60, 134, '?', PAL.GREEN);
  }
}

function sat(scr, t, d) {
  field(scr, d);
  for (let i = 0; i < 3; i++) {
    const a = t * 0.4 + i * 2.1;
    const x = 64 + Math.cos(a) * 46, y = 22 + Math.sin(a) * 10;
    scr.px(x - 4, y, 9, 3, ink(d)); scr.px(x - 1, y - 3, 3, 9, inkLo(d));
  }
  const px_ = 14 + ((t * 12) % 104);
  scr.px(px_, 66, 12, 3, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  scr.px(px_ + 5, 62, 2, 10, ink(d));
  scr.px(0, 134, W, H - 134, mix('#10281f', '#2a1d08', d));
  const sx = d > 0.3 ? 98 : 64;
  for (let y = 134; y > 40; y -= 3) {
    const spread = (134 - y) * 0.42;
    for (let x = sx - spread; x < sx + spread; x += 4) {
      if (bayer(x >> 1, y >> 1) < 0.35 + Math.sin(t * 5 + y) * 0.1) {
        scr.px(x, y, 2, 2, d > 0.3 ? PAL.AMBER : PAL.GREEN_LO);
      }
    }
  }
  if (d > 0.3) { scr.px(sx - 5, 131, 11, 5, PAL.AMBER_HOT); num(scr, sx - 2, 140, '?', PAL.AMBER_HOT); }
}

function engine(scr, t, d) {
  field(scr, d, false);
  const HZ = 54, VX = 64;
  scr.px(0, HZ, W, 1, inkLo(d));
  const scroll = (t * 0.55) % 1;
  for (let r = 0; r < 10; r++) {
    const z = r + scroll;
    const y = HZ + 2 + (H - HZ - 6) * (z / 10) ** 2.1;
    if (y > H - 2) continue;
    const near = (y - HZ) / (H - HZ);
    scr.px(0, y, W, 1, near > 0.45 ? ink(d) : inkLo(d));
  }
  for (let i = -7; i <= 7; i++) {
    const spread = i * 30;
    scr.line(VX + spread * 0.06, HZ + 2, VX + spread, H, i === 0 ? ink(d) : inkLo(d));
  }
  for (let x = 0; x < W; x += 2) {
    const h = 5 + Math.sin(x * 0.09) * 3 + Math.sin(x * 0.31 + 1.7) * 2;
    scr.px(x, HZ - h, 2, h, mix(PAL.PANEL_LO, '#241a08', d));
    scr.px(x, HZ - h, 2, 1, inkLo(d));
  }
  if (d > 0.25) {
    const bx = 44 + Math.sin(t * 0.9) * 24, by = 92 + Math.cos(t * 1.3) * 16;
    scr.px(bx - 9, by - 9, 19, 1, PAL.AMBER_HOT); scr.px(bx - 9, by + 9, 19, 1, PAL.AMBER_HOT);
    scr.px(bx - 9, by - 9, 1, 19, PAL.AMBER_HOT); scr.px(bx + 9, by - 9, 1, 19, PAL.AMBER_HOT);
    scr.px(bx - 14, by, 7, 1, PAL.AMBER); scr.px(bx + 8, by, 7, 1, PAL.AMBER);
    num(scr, bx + 13, by - 4, '1', PAL.AMBER_HOT);
  }
}

function crowd2(scr, t, d) {
  field(scr, d);
  const N = 44, TX = 70, TY = 48, NX = 40, NY = 116;
  for (let i = 0; i < N; i++) {
    const a = i * 2.399 + t * 0.16;
    const bot = i % 4 !== 0;
    const rad = 20 + (i % 5) * 6;
    const ox = TX + Math.cos(a) * rad * 0.95;
    const oy = TY + Math.sin(a) * rad * 0.95;
    const pull = bot ? Math.min(1, d * 1.4) : 0;
    const ringA = i * 1.7;
    const nx = NX + Math.cos(ringA) * (11 + (i % 3) * 5);
    const ny = NY + Math.sin(ringA) * (9 + (i % 3) * 4);
    const x = ox + (nx - ox) * pull, y = oy + (ny - oy) * pull;
    const c = pull > 0.4 ? PAL.AMBER : ink(d * 0.3);
    if (pull > 0.4) scr.line(x, y, NX, NY, shade(PAL.AMBER_DIM, 0.85));
    else scr.line(x, y, TX, TY, shade(inkLo(d), 0.9));
    scr.px(x - 1, y - 1, 3, 3, c);
  }
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  scr.disc(TX, TY, 8, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d));
  scr.disc(TX, TY, 5 + pulse * 2, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  if (d > 0.4) {
    scr.disc(NX, NY, 6, PAL.AMBER_DIM);
    scr.disc(NX, NY, 4, PAL.AMBER_HOT);
    num(scr, NX - 7, NY + 16, '400', PAL.AMBER_HOT);
  }
  num(scr, W - 22, 8, d > 0.4 ? '500' : '900', ink(d));
}

function signoff(scr, t, d) {
  field(scr, 0, false);
  const bars = [PAL.GREEN, PAL.GAMING, PAL.INDUSTRY, PAL.DEFENCE, PAL.AMBER, PAL.GREEN_DIM];
  const bw = W / bars.length;
  bars.forEach((c, i) => scr.px(i * bw, 8, Math.ceil(bw), 44, c));
  scr.px(0, 52, W, 1, PAL.PANEL_LO);
  const cx = 64, cy = 86, r = 26;
  for (let a = 0; a < Math.PI * 2; a += 0.03) {
    scr.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1, PAL.GREEN_DIM);
    scr.px(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8), 1, 1, PAL.GREEN_LO);
  }
  scr.px(cx - r - 6, cy, r * 2 + 12, 1, PAL.GREEN_LO);
  scr.px(cx, cy - r - 6, 1, r * 2 + 12, PAL.GREEN_LO);
  ['87.60', '104.40', '141.12'].forEach((f, i) => {
    num(scr, 44, 122 + i * 8, f, i === 2 ? PAL.DEFENCE : PAL.GREEN_DIM);
  });
  const y = (t * 18) % (H + 20) - 10;
  scr.ctx.globalAlpha = 0.14;
  scr.px(0, y, W, 7, PAL.GREEN_HOT);
  scr.ctx.globalAlpha = 1;
}

function border(scr, t, d) {
  field(scr, d, false);
  const spec = 1 - Math.min(1, d * 1.6);
  scr.px(0, 0, 74, H, mix('#0b1a1c', '#1d1508', d));
  scr.px(80, 0, W - 80, H, mix('#080f12', '#150f06', d));
  for (let y = 0; y < H; y += 6) scr.px(76, y, 2, 4, mix(PAL.GREEN_DIM, PAL.AMBER, d));
  for (let i = 0; i < 4; i++) {
    const x = 10 + (i % 2) * 26, y = 22 + i * 30;
    scr.rect(x, y, 20, 14, mix(PAL.PANEL_LO, '#241a08', d), ink(d * 0.6));
    const on = ((Math.floor(t * 2) + i) % 4) !== 0;
    scr.px(x + 3, y + 4, 5, 3, on ? ink(d) : inkLo(d));
    scr.px(x + 11, y + 4, 5, 3, on ? inkLo(d) : ink(d));
  }
  if (spec > 0.02) {
    for (let i = 0; i < 7; i++) {
      const y0 = 14 + i * 19, sway = Math.sin(t * 1.2 + i) * 5;
      for (let x = 120; x > 20; x -= 5) {
        const y = y0 + (120 - x) * 0.12 + sway;
        if (bayer(x >> 1, y >> 1) < spec * 0.9) scr.px(x, y, 3, 1, PAL.GREEN_LO);
      }
      scr.px(20, y0 + 12 + sway, 3, 3, shade(PAL.GREEN, spec));
    }
  }
  const marks = [[52, 30, 1], [96, 58, 0], [38, 78, 0], [104, 104, 1], [64, 132, 0]];
  for (const [x, y, real] of marks) {
    if (!real && spec < 0.35) continue;
    const c = real ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d) : shade(PAL.GREEN_DIM, spec);
    scr.px(x - 3, y, 7, 1, c);
    scr.px(x, y - 3, 1, 7, c);
    if (real && d > 0.3) scr.disc(x, y, 2, PAL.AMBER_HOT);
  }
  num(scr, 6, H - 10, d > 0.4 ? '2' : '5', ink(d));
}

// ── Helsinki B-roll ────────────────────────────────────────────────

function esplanadi(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 70, [mix('#0c1820', '#1a1408', d), mix('#122430', '#241a0c', d)]);
  for (let x = 0; x < W; x += 6) {
    const h = 18 + ((x * 5) % 11);
    scr.px(x, 70 - h, 6, h, mix('#0e2818', '#2a1c08', d));
  }
  scr.px(0, 88, W, H - 88, mix('#121820', '#1e160c', d));
  scr.px(20, 88, W - 40, 2, inkLo(d));
  for (let i = 0; i < 5; i++) {
    const x = ((t * 18 + i * 28) % (W + 20)) - 10;
    scr.px(x, 100 + (i % 3) * 8, 8, 3, mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d * 0.4));
  }
  const drones = [
    [30 + Math.sin(t * 0.7) * 20, 28 + Math.cos(t * 0.9) * 6],
    [70 + Math.cos(t * 0.5) * 16, 22 + Math.sin(t * 1.1) * 5],
    [100 + Math.sin(t * 0.9) * 12, 34 + Math.cos(t * 0.6) * 4],
  ];
  drones.forEach(([x, y], i) => {
    scr.px(x - 3, y, 7, 2, ink(d));
    scr.px(x - 1, y - 2, 3, 2, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
    if (d > 0.35) {
      scr.px(x - 4, y + 4, 9, 1, PAL.AMBER_DIM);
      num(scr, x - 2, y + 7, String(i + 1), PAL.AMBER_HOT);
    }
  });
  if (d > 0.4) num(scr, 4, H - 10, '3', PAL.AMBER_HOT);
}

function kamppi(scr, t, d) {
  field(scr, d, false);
  scr.px(0, 0, W, H, mix('#060a10', '#140e06', d));
  for (let i = 0; i < 4; i++) {
    const x = 8 + i * 30, h = 50 + (i % 3) * 18;
    scr.rect(x, H - 20 - h, 24, h, mix('#0c1820', '#1e160a', d), inkLo(d));
    for (let wy = 0; wy < h - 8; wy += 8) {
      const on = ((Math.floor(t * 2) + i + wy) % 5) !== 0;
      scr.px(x + 4, H - 20 - h + 6 + wy, 4, 3, on ? ink(d * 0.6) : shade(inkLo(d), 0.5));
      scr.px(x + 14, H - 20 - h + 6 + wy, 4, 3, on ? inkLo(d) : shade(inkLo(d), 0.4));
    }
  }
  scr.px(0, H - 20, W, 20, mix('#0a1218', '#1a1208', d));
  for (let i = 0; i < 18; i++) {
    const x = 6 + (i * 17 + Math.floor(t * 8)) % (W - 12);
    const y = H - 16 + (i % 3) * 4;
    const keep = d < 0.35 || i % 5 === 0;
    if (keep) scr.px(x, y, 2, 3, ink(d * 0.5));
  }
  if (d > 0.4) num(scr, 4, 8, d > 0.5 ? '12' : '90', ink(d));
}

function harbour(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 60, [mix('#0a1820', '#1a1208', d), mix('#0e2430', '#22180c', d)]);
  for (let y = 90; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (bayer(x >> 1, y >> 1) < 0.45 + Math.sin(x * 0.1 + t) * 0.08)
        scr.px(x, y, 2, 2, mix('#0c2838', '#2a1c0a', d));
    }
  }
  scr.px(0, 80, W, 12, mix('#121820', '#1e160c', d));
  for (let i = 0; i < 5; i++) {
    const x = 6 + i * 24;
    scr.rect(x, 62, 20, 18, inkLo(d), ink(d * 0.5));
  }
  const sx = 40 + Math.sin(t * 0.3) * 4;
  scr.px(sx, 70, 50, 8, ink(d));
  scr.px(sx + 10, 58, 30, 12, inkLo(d));
  if (d > 0.35) {
    scr.rect(8, 8, 40, 14, PAL.PANEL_LO, PAL.AMBER);
    num(scr, 12, 12, 'REM', PAL.AMBER_HOT);
  }
}

function gulf(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 55, [mix('#08141c', '#181008', d), mix('#0c2030', '#22180c', d)]);
  for (let i = 0; i < 12; i++) {
    const x = 4 + i * 10;
    const h = 8 + ((i * 7) % 14);
    scr.px(x, 55 - h, 8, h, mix('#0e1c24', '#1e160a', d));
    if ((Math.floor(t) + i) % 4 === 0) scr.px(x + 2, 55 - h + 3, 2, 2, inkLo(d));
  }
  for (let y = 70; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (bayer(x >> 1, y >> 1) < 0.5 + Math.sin(x * 0.08 + t * 1.2) * 0.1)
        scr.px(x, y, 2, 2, mix('#0a2838', '#281c0a', d));
    }
  }
  scr.px(0, 64, W, 8, mix('#121820', '#1e160c', d));
  if (d > 0.3) {
    scr.px(50, 100, W - 50, 2, PAL.AMBER);
    num(scr, 54, 108, 'CAB', PAL.AMBER_HOT);
  }
}

function cathedral(scr, t, d) {
  field(scr, d, false);
  const drift = Math.sin(t * 0.28) * 2;
  scr.bands(0, 0, W, 52, [mix('#0c1820', '#1a1408', d), mix('#122430', '#241a0c', d)]);
  const cx = 64 + drift;
  scr.ellipse(cx, 36, 30, 18, mix('#d0d8dc', '#c0a068', d));
  scr.ellipse(cx, 34, 26, 14, mix('#e0e8ec', '#d0b078', d));
  scr.ellipse(cx - 22, 42, 8, 6, mix('#c8d0d4', '#b89860', d));
  scr.ellipse(cx + 22, 42, 8, 6, mix('#c8d0d4', '#b89860', d));
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * 9;
    scr.px(x - 1, 50, 3, 32, mix('#c0c8cc', '#b09058', d));
  }
  scr.px(cx - 32, 50, 64, 4, mix('#a8b0b4', '#a08050', d));
  for (let s = 0; s < 6; s++) {
    const y = 84 + s * 5;
    const w = 72 + s * 7;
    scr.px(cx - w / 2, y, w, 4, mix('#9898a0', '#907040', d));
  }
  scr.px(0, 114, W, H - 114, mix('#101820', '#1c160c', d));
  for (let i = 0; i < 12; i++) {
    const x = 10 + ((t * 14 + i * 17) % (W - 20));
    const y = 118 + (i % 3) * 5 + Math.sin(t * 1.4 + i) * 0.5;
    if (d < 0.4 || i % 3 === 0) scr.px(x, y, 2, 3, ink(d * 0.5));
  }
  const fx = 18 + drift;
  scr.px(fx, 22, 2, 20, inkLo(d));
  const fy = 20 + Math.sin(t * 2.4) * 2.5;
  const flap = Math.sin(t * 3.1) * 2;
  scr.px(fx + 2, fy, 11 + flap, 7, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  if (d > 0.35) {
    scr.rect(4, 4, 34, 11, PAL.PANEL_LO, PAL.AMBER);
    num(scr, 8, 6, 'OBS', PAL.AMBER_HOT);
  }
}

function katu(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 38, [mix('#0a141c', '#181008', d), mix('#101c28', '#20160c', d)]);
  for (let i = 0; i < 6; i++) {
    const x = i * 22 + Math.sin(t * 0.2) * 0.5;
    const h = 26 + ((i * 13) % 16);
    scr.px(x, 38 - h, 20, h, mix('#0e1c24', '#1e160a', d));
    for (let wy = 0; wy < h - 6; wy += 7) {
      const on = ((Math.floor(t * 1.7) + i + wy) % 4) !== 0;
      scr.px(x + 4, 38 - h + 4 + wy, 3, 3, on ? inkLo(d) : shade(inkLo(d), 0.35));
      scr.px(x + 12, 38 - h + 4 + wy, 3, 3, on ? shade(inkLo(d), 0.65) : shade(inkLo(d), 0.3));
    }
  }
  scr.px(0, 86, W, H - 86, mix('#101418', '#1a140c', d));
  scr.px(0, 94, W, 2, inkLo(d));
  const tx = ((t * 22) % (W + 55)) - 28;
  scr.px(tx, 76, 40, 13, mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d * 0.45));
  scr.px(tx + 3, 70, 11, 6, mix(PAL.GREEN, PAL.AMBER, d * 0.35));
  const blink = Math.floor(t * 4) % 3 !== 0;
  scr.px(tx + 36, 78, 3, 3, blink ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d) : shade(inkLo(d), 0.4));
  scr.px(tx + 2, 80, 7, 5, mix('#1a282c', '#2a1e10', d));
  scr.px(tx + 13, 80, 7, 5, mix('#1a282c', '#2a1e10', d));
  scr.px(tx + 24, 80, 7, 5, mix('#1a282c', '#2a1e10', d));
  for (let i = 0; i < 4; i++) {
    const cx = ((t * 16 + i * 42) % (W + 28)) - 14;
    scr.px(cx, 106 + (i % 2) * 9, 13, 5, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.3));
  }
  for (let i = 0; i < 4; i++) {
    const lx = 14 + i * 32;
    scr.px(lx, 48, 2, 36, inkLo(d));
    const pulse = 0.55 + 0.45 * Math.sin(t * 2.8 + i);
    scr.px(lx - 2, 46, 6, 3, mix(shade(PAL.GREEN_HOT, pulse), PAL.AMBER_HOT, d));
  }
  if (d > 0.35) num(scr, 4, 6, '4T', PAL.AMBER_HOT);
}

function mannerheim(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 30, [mix('#060e14', '#140e08', d), mix('#0a1620', '#1a120a', d)]);
  for (let i = 0; i < 5; i++) {
    const x = i * 28 - 4;
    const h = 40 + ((i * 17) % 22);
    scr.px(x, 30 - h, 26, h, mix('#0c1a22', '#1c140a', d));
    for (let wy = 0; wy < h - 8; wy += 9) {
      for (let wx = 4; wx < 22; wx += 8) {
        const on = ((Math.floor(t * 1.5) + i + wy + wx) % 5) !== 0;
        scr.px(x + wx, 30 - h + 6 + wy, 4, 4, on ? inkLo(d) : shade(inkLo(d), 0.3));
      }
    }
  }
  scr.px(0, 78, W, H - 78, mix('#0e1418', '#1a140c', d));
  scr.px(52, 78, 2, H - 78, inkLo(d));
  scr.px(74, 78, 2, H - 78, inkLo(d));
  // tram approaches: grows then resets
  const cycle = (t * 0.35) % 1;
  const approach = cycle < 0.85 ? cycle / 0.85 : 1;
  const tw = 18 + approach * 14;
  const ty = 120 - approach * 28 + Math.sin(t * 1.1) * 1.5;
  scr.px(64 - tw / 2, ty, tw, 10 + approach * 8, mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d * 0.4));
  scr.px(64 - tw / 2 + 3, ty + 3, tw - 6, 5 + approach * 3, mix('#1a282c', '#2a1e10', d));
  const hl = Math.floor(t * 5) % 2 === 0;
  scr.px(62, ty - 3, 4, 3, hl ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d) : inkLo(d));
  for (let i = 0; i < 7; i++) {
    const x = 8 + ((t * 14 + i * 26) % (W - 16));
    const y = 112 + (i % 3) * 8;
    scr.px(x, y, 10, 4, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.25));
  }
  for (let i = 0; i < 5; i++) {
    const lx = 8 + i * 28;
    scr.px(lx, 40, 2, 38, inkLo(d));
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + i);
    scr.px(lx - 3, 38, 8, 3, mix(shade(PAL.GREEN_HOT, pulse), PAL.AMBER_HOT, d));
    const rx = W - 10 - i * 28;
    scr.px(rx, 40, 2, 38, inkLo(d));
    scr.px(rx - 3, 38, 8, 3, mix(shade(PAL.GREEN_HOT, pulse), PAL.AMBER_HOT, d));
  }
  if (d > 0.35) num(scr, 4, 6, 'M10', PAL.AMBER_HOT);
}

function station(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 28, [mix('#08141c', '#181008', d), mix('#0c1c28', '#20160c', d)]);
  const tx = 64;
  scr.px(tx - 11, 6, 22, 56, mix('#1a282c', '#2a1e10', d));
  scr.px(tx - 13, 4, 26, 4, mix('#2a383c', '#3a2e18', d));
  scr.disc(tx, 26, 9, mix('#d0d8dc', '#c8a870', d));
  scr.disc(tx, 26, 7, mix('#e8f0f4', '#d8b880', d));
  // proper clock hands
  const angH = (t * 0.08) % (Math.PI * 2);
  const angM = (t * 0.55) % (Math.PI * 2);
  scr.line(tx, 26, tx + Math.cos(angH - Math.PI / 2) * 4, 26 + Math.sin(angH - Math.PI / 2) * 4, ink(d));
  scr.line(tx, 26, tx + Math.cos(angM - Math.PI / 2) * 6, 26 + Math.sin(angM - Math.PI / 2) * 6, inkLo(d));
  scr.px(6, 38, 42, 28, mix('#121e22', '#1e160c', d));
  scr.px(80, 38, 42, 28, mix('#121e22', '#1e160c', d));
  for (const side of [10, 84]) {
    for (let wy = 0; wy < 20; wy += 8) {
      for (let wx = 0; wx < 34; wx += 10) {
        const on = ((Math.floor(t * 1.4) + wy + wx) % 5) !== 0;
        scr.px(side + wx, 44 + wy, 5, 4, on ? inkLo(d) : shade(inkLo(d), 0.35));
      }
    }
  }
  scr.px(0, 68, W, H - 68, mix('#0e1418', '#1a1208', d));
  for (let i = 0; i < 14; i++) {
    const x = 6 + ((t * 11 + i * 13) % (W - 12));
    const y = 74 + (i % 4) * 6 + Math.sin(t * 1.3 + i) * 0.5;
    if (d < 0.35 || i % 3 === 0) scr.px(x, y, 2, 3, ink(d * 0.5));
  }
  const tr = ((t * 9) % (W + 40)) - 20;
  scr.px(tr, 128, 34, 7, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.35));
  scr.px(tr + 3, 124, 8, 4, inkLo(d));
  if (d > 0.35) num(scr, 4, 6, d > 0.5 ? 'LATE' : 'ON', ink(d));
}

// Suomenlinna fortress islands silhouette over water
function suomenlinna(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 58, [mix('#08141c', '#181008', d), mix('#0c2030', '#22180c', d)]);
  // island mass
  for (let x = 8; x < 120; x += 4) {
    const h = 10 + Math.sin(x * 0.12) * 6 + ((x * 3) % 7);
    scr.px(x, 58 - h, 4, h, mix('#121c20', '#1e160a', d));
  }
  // fort walls / bastions
  scr.px(28, 40, 22, 14, mix('#1a262a', '#2a1e10', d));
  scr.px(70, 36, 18, 18, mix('#1a262a', '#2a1e10', d));
  scr.px(48, 32, 8, 8, mix('#222e32', '#322818', d)); // tower
  // water with slow wave
  for (let y = 70; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (bayer(x >> 1, y >> 1) < 0.48 + Math.sin(x * 0.07 + t * 0.9) * 0.09)
        scr.px(x, y, 2, 2, mix('#0a2838', '#281c0a', d));
    }
  }
  // distant ferry
  const fx = 20 + ((t * 6) % (W + 30)) - 15;
  scr.px(fx, 64, 22, 5, inkLo(d));
  scr.px(fx + 6, 60, 8, 4, ink(d * 0.5));
  if (d > 0.35) num(scr, 4, 6, 'SL', PAL.AMBER_HOT);
}

// Katajanokka waterfront / Uspenski silhouette
function katajanokka(scr, t, d) {
  field(scr, d, false);
  scr.bands(0, 0, W, 48, [mix('#0a141c', '#181008', d), mix('#101c28', '#20160c', d)]);
  // brick-ish waterfront buildings
  for (let i = 0; i < 5; i++) {
    const x = 4 + i * 25;
    const h = 28 + ((i * 11) % 14);
    scr.px(x, 48 - h, 22, h, mix('#1a1410', '#2a1c0c', d));
    for (let wy = 0; wy < h - 6; wy += 6) {
      const on = ((Math.floor(t * 1.6) + i + wy) % 4) !== 0;
      scr.px(x + 4, 48 - h + 4 + wy, 4, 3, on ? inkLo(d) : shade(inkLo(d), 0.3));
      scr.px(x + 12, 48 - h + 4 + wy, 4, 3, on ? shade(inkLo(d), 0.7) : shade(inkLo(d), 0.25));
    }
  }
  // onion-dome suggestion (Uspenski)
  const ux = 100;
  scr.px(ux - 6, 18, 12, 22, mix('#3a2018', '#4a2810', d));
  scr.ellipse(ux, 16, 7, 6, mix('#4a3020', '#5a3818', d));
  scr.px(ux - 1, 6, 2, 8, inkLo(d));
  // quay
  scr.px(0, 58, W, 6, mix('#121820', '#1e160c', d));
  for (let y = 70; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (bayer(x >> 1, y >> 1) < 0.5 + Math.sin(x * 0.09 + t) * 0.08)
        scr.px(x, y, 2, 2, mix('#0c2838', '#2a1c0a', d));
    }
  }
  // slow boat
  const bx = ((t * 8) % (W + 40)) - 20;
  scr.px(bx, 66, 28, 6, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.35));
  scr.px(bx + 8, 62, 10, 4, inkLo(d));
  if (d > 0.35) num(scr, 4, 6, 'KJ', PAL.AMBER_HOT);
}

const PANELS = {
  signoff, border, chart, chart2, mesh, crowd, heat, crane, tower, coin,
  sea, sat, engine, crowd2,
  esplanadi, kamppi, harbour, gulf,
  cathedral, katu, mannerheim, station,
  suomenlinna, katajanokka,
};

export const PANEL_KEYS = Object.keys(PANELS);
export const BROLL_KEYS = [
  'esplanadi', 'kamppi', 'harbour', 'gulf',
  'cathedral', 'katu', 'mannerheim', 'station',
  'suomenlinna', 'katajanokka',
];

export function drawVisual(key, scr, t, decode) {
  const fn = PANELS[key] || chart;
  fn(scr, t, decode);
  scr.scanlines(PAL.INK, 3);
}
