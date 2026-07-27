// Radio Free Helsinki — the picture half of a post.
//
// The feed is vertical (TikTok-shaped), so these panels are **portrait**: a
// horizontal card inside a vertical post reads as something filmed for another
// format and cropped in. Each bulletin gets one, drawn in code, and every one of
// them takes `decode` and changes under it — because the framing is never only
// in the words. The truncated axis, the friendly unit, the arrow pointing the
// flattering way are all part of the same job, and decoding the text without
// decoding the chart would teach half the lesson.

import { PAL } from './palette.js?v=2';
import { mix, shade, bayer } from './screen.js?v=2';

// portrait: the post is 9:16-ish and this fills its upper two thirds
export const PANEL_W = 128, PANEL_H = 152;
const W = PANEL_W, H = PANEL_H;

// shared: the panel these all sit in. `grid` is off for the scenes that fill
// the frame with their own texture — a graticule under a dithered water column
// or a wireframe terrain turns both of them into noise.
function field(scr, decode, grid = true) {
  scr.clear(mix(PAL.PANEL, '#1a1206', decode * 0.5));
  if (!grid) return;
  const g = mix(PAL.GREEN_LO, PAL.AMBER_DIM, decode * 0.7);
  for (let x = 0; x < W; x += 8) scr.px(x, 0, 1, H, shade(g, 0.5));
  for (let y = 0; y < H; y += 8) scr.px(0, y, W, 1, shade(g, 0.5));
}

const ink = (decode) => mix(PAL.GREEN, PAL.AMBER, decode);
const inkLo = (decode) => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, decode);

// tiny 3x5 digits, so the panels can carry real numbers
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

// ── the panels ─────────────────────────────────────────────────────

// 92 of 260 dots go dark. The number in the headline, made countable.
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

// the truncated axis. Decode drops the baseline to zero and the mountain
// becomes the bump it always was.
function chart2(scr, t, d) {
  field(scr, d);
  const vals = [72, 70, 69, 71, 74, 78, 82, 88, 94, 99];
  const base = 68 - d * 68;                     // 68 -> 0 as it decodes
  const top = 104;
  const bw = 10, x0 = 18, floor = H - 18, ceil = 22;
  scr.px(x0 - 5, ceil - 6, 1, floor - ceil + 6, inkLo(d));   // y axis
  scr.px(x0 - 5, floor, W - x0, 1, inkLo(d));                // x axis
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

// two organisations, stacked. Decode points the arrow and one eats the other.
function mesh(scr, t, d) {
  field(scr, d);
  const a = { x: 64, y: 42, r: 14 }, b = { x: 64, y: 110, r: 22 };
  const pulse = Math.sin(t * 3) * 0.5 + 0.5;
  scr.disc(b.x, b.y, b.r - Math.round(d * 2), mix(PAL.GREEN_LO, PAL.AMBER_DIM, d), ink(d));
  scr.disc(a.x, a.y, Math.max(3, a.r - Math.round(d * 8)), mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.4), ink(d * 0.4));
  for (let y = a.y + a.r; y < b.y - b.r; y += 3) {          // the link
    const on = ((y + Math.floor(t * 22)) % 9) < 5;
    scr.px(a.x, y, 1, 2, on ? ink(d) : inkLo(d));
  }
  if (d > 0.25) {                                          // which way it goes
    const tipy = b.y - b.r - 4 - pulse * 3;
    scr.line(a.x, tipy, a.x - 4, tipy + 6, PAL.AMBER_HOT);
    scr.line(a.x, tipy, a.x + 4, tipy + 6, PAL.AMBER_HOT);
  }
  num(scr, a.x + a.r + 6, a.y - 2, '41', ink(d));
  num(scr, b.x + b.r + 4, b.y - 2, d > 0.4 ? '100%' : '50%', ink(d));
}

// an auditorium, seen from the back. Decode empties it down to the four
// people who were on the stage.
function crowd(scr, t, d) {
  field(scr, d);
  scr.px(22, 12, 84, 3, inkLo(d));                       // the screen behind them
  for (let i = 0; i < 4; i++) {                          // the stage
    const x = 34 + i * 20, bob = Math.sin(t * 2 + i) * 1;
    scr.disc(x, 28 + bob, 3, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
    scr.px(x - 3, 32 + bob, 7, 8, ink(d));
  }
  scr.px(8, 46, W - 16, 1, inkLo(d));
  for (let r = 0; r < 9; r++) {                          // the room
    for (let c = 0; c < 11; c++) {
      const x = 12 + c * 10, y = 56 + r * 10;
      const seatOn = d < 0.3 || ((r * 11 + c) % 19 === 0);
      if (seatOn) {
        scr.disc(x, y, 2, ink(d * 0.5));
        scr.px(x - 2, y + 3, 5, 4, inkLo(d));
      } else if (d > 0.3) {
        scr.px(x - 2, y + 3, 5, 1, shade(inkLo(d), 0.5));   // an empty seat back
      }
    }
  }
  num(scr, 6, H - 9, d > 0.4 ? '4' : '900', ink(d));
}

// the data hall and what it gives back. Decode draws the intake beside it.
function heat(scr, t, d) {
  field(scr, d);
  scr.rect(14, 16, 56, 52, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.6), ink(d));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {   // racks blinking
    const on = ((Math.floor(t * 3) + r * 3 + c) % 5) !== 0;
    scr.px(20 + c * 16, 22 + r * 12, 11, 7, on ? ink(d) : inkLo(d));
  }
  for (let i = 0; i < 6; i++) {                                // the heat pipe
    const y = 74 + i * 10, off = Math.sin(t * 4 - i * 0.8) * 2;
    scr.px(40 + off, y, 3, 8, mix(PAL.GAMING, PAL.AMBER_HOT, d));
  }
  for (let i = 0; i < 3; i++) {                                // the homes
    scr.rect(66 + (i % 2) * 20, 108 + i * 14, 16, 12, inkLo(d), ink(d * 0.6));
  }
  if (d > 0.2) {                                               // what it draws
    const drawH = Math.round(d * 60);
    scr.px(94, 68 - drawH, 5, drawH, PAL.AMBER_HOT);
    num(scr, 90, 74, '96%', PAL.AMBER_HOT);
    num(scr, 40, H - 9, '4%', PAL.AMBER);
  }
}

// a gantry crane. Decode empties the cabin and lights a remote console.
function crane(scr, t, d) {
  field(scr, d);
  scr.px(0, 108, W, 2, inkLo(d));
  const bx = 26;
  scr.px(bx, 26, 3, 82, ink(d)); scr.px(bx + 62, 26, 3, 82, ink(d));
  scr.px(bx - 6, 22, 78, 4, ink(d));
  const tx = bx + 8 + ((t * 16) % 48);
  scr.px(tx, 26, 4, 10, ink(d));                         // trolley
  const drop = 52 + Math.sin(t * 1.6) * 14;
  scr.px(tx + 1, 36, 1, drop - 36, inkLo(d));
  scr.px(tx - 5, drop, 12, 8, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  scr.rect(bx + 4, 44, 11, 10, PAL.PANEL_LO, ink(d));    // the cabin
  if (d < 0.35) scr.px(bx + 8, 47, 4, 4, PAL.GREEN_HOT);
  for (let i = 0; i < 4; i++) {                          // stacked boxes
    scr.rect(14 + i * 26, 96, 22, 12, inkLo(d), ink(d * 0.5));
  }
  if (d > 0.35) {                                        // the remote console
    scr.rect(30, 122, 68, 20, PAL.PANEL_LO, PAL.AMBER);
    for (let i = 0; i < 6; i++) {
      const on = ((Math.floor(t * 4) + i) % 4) !== 0;
      scr.px(36 + i * 10, 130, 6, 6, on ? PAL.AMBER_HOT : PAL.AMBER_DIM);
    }
  }
}

// a mast throwing rings — the panel the vertical format suits best.
// Decode replaces the broadcast with the chain the claim came down.
function tower(scr, t, d) {
  field(scr, d);
  const mx = 42, apex = 18, base = 136;
  if (d < 0.3) {
    for (let i = 0; i < 3; i++) {                        // broadcast rings
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
    // three operators pay one consultancy, which publishes one report
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

// a valuation, stacked. Decode hollows out everything that was not sold.
function coin(scr, t, d) {
  field(scr, d);
  const cx = 64, rows = 18;
  for (let i = 0; i < rows; i++) {
    const y = H - 14 - i * 7;
    const grow = Math.min(1, Math.max(0, t * 2 - i * 0.1));
    if (grow <= 0) continue;
    const w = Math.round(52 * grow);
    const paid = i === 0;                                 // the slice really sold
    const c = paid ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d)
                   : (d > 0.3 ? shade(PAL.AMBER_DIM, 0.7) : PAL.GREEN_DIM);
    if (d > 0.3 && !paid) {
      scr.rect(cx - w / 2, y, w, 6, PAL.PANEL, c);        // hollow: not real money
    } else {
      scr.rect(cx - w / 2, y, w, 6, c, shade(c, 0.6));
    }
  }
  num(scr, 10, 12, d > 0.4 ? '24' : '400', ink(d));
  num(scr, 10, 20, d > 0.4 ? '6%' : '100%', inkLo(d));
}

// the gulf in cross-section: a hull on top, a cable on the floor, and — once
// decoded — the anchor track that crossed it. Vertical suits this one.
function sea(scr, t, d) {
  field(scr, d, false);
  for (let y = 22; y < 116; y += 2) {                     // dithered water column
    for (let x = 0; x < W; x += 2) {
      const u = (y - 22) / 94 + Math.sin(x * 0.06 + t) * 0.04;
      // sampled at the CELL index: at even pixel coordinates the 4x4 matrix
      // only ever offers four of its sixteen thresholds and the stipple
      // collapses into a regular dot grid
      if (bayer(x >> 1, y >> 1) < 0.62 - u * 0.5) scr.px(x, y, 2, 2, mix('#0d3242', '#2a1f0d', d));
    }
  }
  const hx = 24 + ((t * 9) % 92);
  scr.px(hx - 14, 12, 28, 6, ink(d));                     // the vessel
  scr.px(hx - 4, 6, 6, 6, inkLo(d));
  scr.px(0, 116, W, H - 116, mix('#123033', '#302408', d));   // the seabed
  for (let x = 0; x < W; x += 4) scr.px(x, 116 + (x % 8 === 0 ? 1 : 0), 4, 1, inkLo(d));
  scr.px(0, 124, W, 3, mix(PAL.GAMING, PAL.AMBER_HOT, d));    // the cable
  if (d > 0.2) {                                          // the drag
    scr.line(hx, 18, hx - 30, 120, PAL.AMBER_DIM);
    for (let x = hx - 34; x < hx - 6; x += 3) scr.px(x, 120 + Math.sin(x) * 1, 2, 2, PAL.AMBER_HOT);
    scr.px(hx - 34, 120, 34, 1, PAL.AMBER);
  } else {
    scr.px(54, 121, 18, 6, PAL.PANEL_LO);                 // "damage", unexplained
    num(scr, 60, 134, '?', PAL.GREEN);
  }
}

// satellites above, ground below, and a cone of interference between them.
function sat(scr, t, d) {
  field(scr, d);
  for (let i = 0; i < 3; i++) {                           // the constellation
    const a = t * 0.4 + i * 2.1;
    const x = 64 + Math.cos(a) * 46, y = 22 + Math.sin(a) * 10;
    scr.px(x - 4, y, 9, 3, ink(d)); scr.px(x - 1, y - 3, 3, 9, inkLo(d));
  }
  const px_ = 14 + ((t * 12) % 104);                      // the aircraft
  scr.px(px_, 66, 12, 3, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  scr.px(px_ + 5, 62, 2, 10, ink(d));
  scr.px(0, 134, W, H - 134, mix('#10281f', '#2a1d08', d));   // ground
  // the cone: unattributed haze, or an amber source somebody could name
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

// a game engine's terrain, seen the way an engine shows it: a perspective grid
// running to a horizon. Decode drops the client's overlay onto it.
//
// The first pass drew each row as an independent wobbling polyline and the
// panel came out as scribble — with no shared vanishing point and no verticals
// there was nothing for the eye to read as ground.
function engine(scr, t, d) {
  field(scr, d, false);
  const HZ = 54;                                   // horizon
  const VX = 64;                                   // vanishing point
  scr.px(0, HZ, W, 1, inkLo(d));
  const scroll = (t * 0.55) % 1;
  for (let r = 0; r < 10; r++) {                   // depth lines, spacing grows
    const z = r + scroll;
    const y = HZ + 2 + (H - HZ - 6) * (z / 10) ** 2.1;
    if (y > H - 2) continue;
    const near = (y - HZ) / (H - HZ);
    scr.px(0, y, W, 1, near > 0.45 ? ink(d) : inkLo(d));
  }
  for (let i = -7; i <= 7; i++) {                  // rails converging
    const spread = i * 30;
    scr.line(VX + spread * 0.06, HZ + 2, VX + spread, H, i === 0 ? ink(d) : inkLo(d));
  }
  for (let x = 0; x < W; x += 2) {                 // a ridge, so it is terrain
    const h = 5 + Math.sin(x * 0.09) * 3 + Math.sin(x * 0.31 + 1.7) * 2;
    scr.px(x, HZ - h, 2, h, mix(PAL.PANEL_LO, '#241a08', d));
    scr.px(x, HZ - h, 2, 1, inkLo(d));
  }
  if (d > 0.25) {                                  // the overlay
    const bx = 44 + Math.sin(t * 0.9) * 24, by = 92 + Math.cos(t * 1.3) * 16;
    scr.px(bx - 9, by - 9, 19, 1, PAL.AMBER_HOT); scr.px(bx - 9, by + 9, 19, 1, PAL.AMBER_HOT);
    scr.px(bx - 9, by - 9, 1, 19, PAL.AMBER_HOT); scr.px(bx + 9, by - 9, 1, 19, PAL.AMBER_HOT);
    scr.px(bx - 14, by, 7, 1, PAL.AMBER); scr.px(bx + 8, by, 7, 1, PAL.AMBER);
    num(scr, bx + 13, by - 4, '1', PAL.AMBER_HOT);
  }
}

// accounts around a topic, each spoked to it. Decode pulls the young accounts
// back to the one node that made them, and the crowd turns out to be a fan.
//
// An earlier pass scattered loose dots with no spokes and collapsed them onto
// the source: it read as random pixels moving, not as a network with a shape.
function crowd2(scr, t, d) {
  field(scr, d);
  const N = 44, TX = 70, TY = 48;                     // the topic
  const NX = 40, NY = 116;                            // the nursery
  for (let i = 0; i < N; i++) {
    const a = i * 2.399 + t * 0.16;
    const bot = i % 4 !== 0;                          // three in four are new
    const rad = 20 + (i % 5) * 6;
    const ox = TX + Math.cos(a) * rad * 0.95;
    const oy = TY + Math.sin(a) * rad * 0.95;
    const pull = bot ? Math.min(1, d * 1.4) : 0;
    // pulled to a ring around the nursery, not onto it — a pile on top of the
    // source hides the source
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

const PANELS = { chart, chart2, mesh, crowd, heat, crane, tower, coin, sea, sat, engine, crowd2 };

// drawVisual falls back rather than throwing, so a mistyped key would ship the
// wrong picture beside the right words in total silence. The key list is
// exported so the gate can check every story against it.
export const PANEL_KEYS = Object.keys(PANELS);

export function drawVisual(key, scr, t, decode) {
  const fn = PANELS[key] || chart;
  fn(scr, t, decode);
  scr.scanlines(PAL.INK, 3);
}
