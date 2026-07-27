// Radio Free Helsinki — the other half of the screen.
//
// Where MGS puts the second portrait, this puts the picture: a small animated
// panel per bulletin, drawn in code. Every one of them takes `decode` and
// changes under it, because the framing is never only in the words — the
// truncated axis, the friendly unit, the arrow pointing the flattering way are
// all part of the same job. Decoding the text without decoding the chart would
// teach half the lesson.

import { PAL } from './palette.js?v=1';
import { mix, shade, bayer } from './screen.js?v=1';

const W = 128, H = 96;

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
  const cols = 20, rows = 13, cut = 92;
  const lit = ink(d * 0.2), gone = mix(PAL.GREEN_LO, PAL.AMBER, d);
  for (let i = 0; i < cols * rows; i++) {
    const x = 6 + (i % cols) * 6, y = 5 + Math.floor(i / cols) * 6;
    const isCut = i >= cols * rows - cut;
    // before the decode they are all just staff; after it, the last 92 empty
    const wave = Math.sin(t * 2 + i * 0.4) * 0.5 + 0.5;
    if (isCut && d > 0.15) {
      if (wave > 0.75 - d * 0.5) scr.px(x, y, 3, 3, shade(gone, 0.4));
      else scr.px(x + 1, y + 1, 1, 1, gone);
    } else {
      scr.px(x, y, 3, 3, wave > 0.8 ? PAL.GREEN_HOT : lit);
    }
  }
  num(scr, 6, H - 8, d > 0.4 ? '-92' : '260', ink(d));
}

// the truncated axis. Decode drops the baseline to zero and the mountain
// becomes the bump it always was.
function chart2(scr, t, d) {
  field(scr, d);
  const vals = [72, 70, 69, 71, 74, 78, 82, 88, 94, 99];
  const base = 68 - d * 68;                     // 68 -> 0 as it decodes
  const top = 104;
  const bw = 9, x0 = 14, floor = H - 14;
  scr.px(x0 - 4, 10, 1, floor - 10, inkLo(d));   // y axis
  scr.px(x0 - 4, floor, W - x0, 1, inkLo(d));    // x axis
  vals.forEach((v, i) => {
    const k = (v - base) / (top - base);
    const h = Math.max(1, Math.round(k * (floor - 14)));
    const grow = Math.min(1, Math.max(0, t * 1.6 - i * 0.08));
    const hh = Math.round(h * grow);
    const c = i === vals.length - 1 ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d) : ink(d * 0.85);
    scr.px(x0 + i * bw, floor - hh, bw - 2, hh, c);
    scr.px(x0 + i * bw, floor - hh, bw - 2, 1, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  });
  num(scr, 2, floor - 4, d > 0.5 ? '0' : '68', inkLo(d));
  num(scr, 2, 12, '99', inkLo(d));
  num(scr, W - 26, 6, d > 0.5 ? '+4%' : '+40%', ink(d));
}

// two organisations and an arrow. Decode points the arrow.
function mesh(scr, t, d) {
  field(scr, d);
  const a = { x: 34, y: 44, r: 13 }, b = { x: 94, y: 44, r: 20 };
  const pulse = Math.sin(t * 3) * 0.5 + 0.5;
  scr.disc(b.x, b.y, b.r - Math.round(d * 2), mix(PAL.GREEN_LO, PAL.AMBER_DIM, d), ink(d));
  scr.disc(a.x, a.y, Math.max(3, a.r - Math.round(d * 7)), mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.4), ink(d * 0.4));
  // the link: a neutral line until decode, then an arrow eating leftward
  for (let x = a.x + a.r; x < b.x - b.r; x += 3) {
    const on = ((x + Math.floor(t * 22)) % 9) < 5;
    scr.px(x, a.y, 2, 1, on ? ink(d) : inkLo(d));
  }
  if (d > 0.25) {
    const tipx = b.x - b.r - 4 - pulse * 3;
    scr.line(tipx, a.y, tipx + 6, a.y - 4, PAL.AMBER_HOT);
    scr.line(tipx, a.y, tipx + 6, a.y + 4, PAL.AMBER_HOT);
  }
  num(scr, a.x - 10, a.y + 26, '41', ink(d));
  num(scr, b.x - 6, b.y + 26, d > 0.4 ? '100%' : '50%', ink(d));
}

// an auditorium. Decode empties it down to the four people on the stage.
function crowd(scr, t, d) {
  field(scr, d);
  scr.px(20, 12, 88, 3, inkLo(d));                       // the screen behind them
  for (let i = 0; i < 4; i++) {                          // the stage
    const x = 32 + i * 18, bob = Math.sin(t * 2 + i) * 1;
    scr.disc(x, 26 + bob, 3, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
    scr.px(x - 3, 30 + bob, 7, 7, ink(d));
  }
  scr.px(8, 40, W - 16, 1, inkLo(d));
  for (let r = 0; r < 5; r++) {                          // the room
    for (let c = 0; c < 14; c++) {
      const x = 10 + c * 8, y = 48 + r * 9;
      const seatOn = d < 0.3 || ((r * 14 + c) % 17 === 0);
      if (seatOn) {
        scr.disc(x, y, 2, ink(d * 0.5));
        scr.px(x - 2, y + 3, 5, 4, inkLo(d));
      } else if (d > 0.3) {
        scr.px(x - 2, y + 3, 5, 1, shade(inkLo(d), 0.5));   // an empty seat back
      }
    }
  }
  num(scr, 4, H - 8, d > 0.4 ? '4' : '900', ink(d));
}

// the data hall and what it gives back. Decode draws the intake next to it.
function heat(scr, t, d) {
  field(scr, d);
  scr.rect(8, 30, 40, 40, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d * 0.6), ink(d));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {   // racks blinking
    const on = ((Math.floor(t * 3) + r * 3 + c) % 5) !== 0;
    scr.px(13 + c * 12, 35 + r * 9, 8, 5, on ? ink(d) : inkLo(d));
  }
  for (let i = 0; i < 5; i++) {                                // the heat pipe
    const x = 50 + i * 12, off = Math.sin(t * 4 - i * 0.8) * 2;
    scr.px(x, 48 + off, 10, 3, mix(PAL.GAMING, PAL.AMBER_HOT, d));
  }
  for (let i = 0; i < 3; i++) {                                // the homes
    scr.rect(96 + (i % 2) * 14, 40 + i * 12, 12, 10, inkLo(d), ink(d * 0.6));
  }
  if (d > 0.2) {                                               // what it draws
    const drawH = Math.round(d * 26);
    scr.px(4, 28 - drawH, 3, drawH, PAL.AMBER_HOT);
    num(scr, 2, H - 8, '96%', PAL.AMBER_HOT);
    num(scr, 100, H - 8, '4%', PAL.AMBER);
  }
}

// gantry cranes. Decode empties the cabins and lights a console.
function crane(scr, t, d) {
  field(scr, d);
  scr.px(0, 74, W, 2, inkLo(d));
  for (let i = 0; i < 2; i++) {
    const bx = 20 + i * 52;
    scr.px(bx, 20, 2, 54, ink(d)); scr.px(bx + 34, 20, 2, 54, ink(d));
    scr.px(bx - 4, 18, 44, 3, ink(d));
    const tx = bx + 4 + ((t * 14 + i * 20) % 30);
    scr.px(tx, 21, 3, 8, ink(d));                       // trolley + load
    const drop = 30 + Math.sin(t * 1.6 + i) * 8;
    scr.px(tx - 1, 29, 1, drop - 29, inkLo(d));
    scr.px(tx - 4, drop, 9, 6, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
    // the cabin: a lit operator, or empty after the decode
    scr.rect(bx + 2, 34, 8, 7, PAL.PANEL_LO, ink(d));
    if (d < 0.35) scr.px(bx + 5, 36, 3, 3, PAL.GREEN_HOT);
  }
  if (d > 0.35) {                                        // the remote console
    scr.rect(46, 80, 36, 12, PAL.PANEL_LO, PAL.AMBER);
    for (let i = 0; i < 5; i++) {
      const on = ((Math.floor(t * 4) + i) % 4) !== 0;
      scr.px(50 + i * 6, 84, 4, 4, on ? PAL.AMBER_HOT : PAL.AMBER_DIM);
    }
  }
}

// a mast throwing rings. Decode replaces the rings with the money chain.
function tower(scr, t, d) {
  field(scr, d);
  const mx = 30;
  scr.line(mx, 78, mx - 8, 20, ink(d));
  scr.line(mx, 78, mx + 8, 20, ink(d));
  for (let y = 24; y < 78; y += 8) scr.px(mx - 7 + (y - 20) * 0.02, y, 14, 1, inkLo(d));
  scr.px(mx - 2, 14, 4, 8, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  if (d < 0.3) {
    for (let i = 0; i < 3; i++) {                        // broadcast rings
      const r = ((t * 20 + i * 22) % 66);
      const c = shade(PAL.GREEN, 1 - r / 80);
      scr.disc(mx, 18, r, PAL.PANEL);                    // erase inside first
      for (let a = -1.2; a < 1.2; a += 0.06) {
        scr.px(mx + Math.cos(a) * r, 18 + Math.sin(a) * r, 1, 1, c);
      }
    }
  } else {
    // the chain the claim came down: three operators pay one consultancy,
    // which publishes one report, which becomes the news
    const steps = ['3', '1', '1'];
    for (let i = 0; i < 3; i++) {
      const y = 22 + i * 22;
      scr.rect(62, y, 44, 14, PAL.PANEL_LO, PAL.AMBER);
      num(scr, 68, y + 5, steps[i], PAL.AMBER_HOT);
      for (let b = 0; b < +steps[i]; b++) scr.px(80 + b * 6, y + 5, 4, 5, PAL.AMBER_DIM);
      if (i < 2) {
        const k = (t * 26 + i * 14) % 8;
        scr.px(84, y + 14 + k, 1, 3, PAL.AMBER_HOT);
        scr.px(83, y + 20, 3, 1, PAL.AMBER_DIM);
      }
    }
  }
}

// a valuation. Decode shows how much of the tower was actually bought.
function coin(scr, t, d) {
  field(scr, d);
  const cx = 64, rows = 12;
  for (let i = 0; i < rows; i++) {
    const y = H - 12 - i * 6;
    const grow = Math.min(1, Math.max(0, t * 2 - i * 0.12));
    if (grow <= 0) continue;
    const w = Math.round(38 * grow);
    const paid = i === 0;                                 // the slice really sold
    const c = paid ? mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d)
                   : (d > 0.3 ? shade(PAL.AMBER_DIM, 0.7) : PAL.GREEN_DIM);
    if (d > 0.3 && !paid) {
      scr.rect(cx - w / 2, y, w, 5, PAL.PANEL, c);        // hollow: not real money
    } else {
      scr.rect(cx - w / 2, y, w, 5, c, shade(c, 0.6));
    }
  }
  num(scr, 8, 10, d > 0.4 ? '24' : '400', ink(d));
  num(scr, 8, 18, d > 0.4 ? '6%' : '100%', inkLo(d));
}

// the gulf in cross-section: a hull above, a cable below, an anchor track.
function sea(scr, t, d) {
  field(scr, d, false);
  for (let y = 14; y < 70; y += 2) {                      // dithered water column
    for (let x = 0; x < W; x += 2) {
      const u = (y - 14) / 56 + Math.sin(x * 0.06 + t) * 0.04;
      // sampled at the CELL index: at even pixel coordinates the 4x4 matrix
      // only ever offers four of its sixteen thresholds and the stipple
      // collapses into a regular dot grid
      if (bayer(x >> 1, y >> 1) < 0.62 - u * 0.5) scr.px(x, y, 2, 2, mix('#0d3242', '#2a1f0d', d));
    }
  }
  const hx = 20 + ((t * 9) % 100);
  scr.px(hx - 12, 10, 24, 5, ink(d));                     // the vessel
  scr.px(hx - 3, 5, 5, 5, inkLo(d));
  scr.px(0, 70, W, 26, mix('#123033', '#302408', d));     // the seabed
  for (let x = 0; x < W; x += 4) scr.px(x, 70 + (x % 8 === 0 ? 1 : 0), 4, 1, inkLo(d));
  scr.px(0, 76, W, 2, mix(PAL.GAMING, PAL.AMBER_HOT, d)); // the cable
  if (d > 0.2) {                                          // the drag
    scr.line(hx, 15, hx - 26, 74, PAL.AMBER_DIM);
    for (let x = hx - 30; x < hx - 6; x += 3) scr.px(x, 74 + Math.sin(x) * 1, 2, 2, PAL.AMBER_HOT);
    scr.px(hx - 30, 74, 30, 1, PAL.AMBER);
  } else {
    scr.px(56, 74, 14, 4, PAL.PANEL_LO);                  // "damage", unexplained
    num(scr, 60, 84, '?', PAL.GREEN);
  }
}

// satellites, an aircraft, and a cone of interference from somewhere.
function sat(scr, t, d) {
  field(scr, d);
  for (let i = 0; i < 3; i++) {                           // the constellation
    const a = t * 0.4 + i * 2.1;
    const x = 64 + Math.cos(a) * 44, y = 20 + Math.sin(a) * 8;
    scr.px(x - 3, y, 7, 3, ink(d)); scr.px(x - 1, y - 2, 3, 7, inkLo(d));
  }
  const px_ = 16 + ((t * 12) % 100);                      // the aircraft
  scr.px(px_, 46, 10, 2, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  scr.px(px_ + 4, 43, 2, 8, ink(d));
  scr.px(0, 84, W, 12, mix('#10281f', '#2a1d08', d));     // ground
  // the cone: unattributed green haze, or an amber source on the ground
  const sx = d > 0.3 ? 100 : 64;
  for (let y = 84; y > 30; y -= 3) {
    const spread = (84 - y) * 0.5;
    for (let x = sx - spread; x < sx + spread; x += 4) {
      if (bayer(x >> 1, y >> 1) < 0.35 + Math.sin(t * 5 + y) * 0.1) {
        scr.px(x, y, 2, 2, d > 0.3 ? PAL.AMBER : PAL.GREEN_LO);
      }
    }
  }
  if (d > 0.3) { scr.px(sx - 4, 82, 9, 4, PAL.AMBER_HOT); num(scr, sx - 2, 88, '?', PAL.AMBER_HOT); }
}

// a game engine's terrain, seen the way an engine shows it: a perspective grid
// running to a horizon. Decode drops the client's overlay onto it.
//
// The first pass drew each row as an independent wobbling polyline and the
// panel came out as scribble — with no shared vanishing point and no verticals
// there was nothing for the eye to read as ground.
function engine(scr, t, d) {
  field(scr, d, false);
  const HZ = 34;                                   // horizon
  const VX = 64;                                   // vanishing point
  scr.px(0, HZ, W, 1, inkLo(d));
  // depth lines: spacing grows toward the viewer, scrolling forward
  const scroll = (t * 0.55) % 1;
  for (let r = 0; r < 9; r++) {
    const z = r + scroll;
    const y = HZ + 2 + (H - HZ - 6) * (z / 9) ** 2.1;
    if (y > H - 2) continue;
    const near = (y - HZ) / (H - HZ);
    scr.px(0, y, W, 1, near > 0.45 ? ink(d) : inkLo(d));
  }
  // rails converging on the vanishing point
  for (let i = -7; i <= 7; i++) {
    const spread = i * 30;
    scr.line(VX + spread * 0.06, HZ + 2, VX + spread, H, i === 0 ? ink(d) : inkLo(d));
  }
  // a low ridge on the horizon, so it is terrain rather than graph paper
  for (let x = 0; x < W; x += 2) {
    const h = 3 + Math.sin(x * 0.09) * 2 + Math.sin(x * 0.31 + 1.7) * 1.5;
    scr.px(x, HZ - h, 2, h, mix(PAL.PANEL_LO, '#241a08', d));
    scr.px(x, HZ - h, 2, 1, inkLo(d));
  }
  if (d > 0.25) {                                          // the overlay
    const bx = 40 + Math.sin(t * 0.9) * 22, by = 52 + Math.cos(t * 1.3) * 10;
    scr.px(bx - 8, by - 8, 17, 1, PAL.AMBER_HOT); scr.px(bx - 8, by + 8, 17, 1, PAL.AMBER_HOT);
    scr.px(bx - 8, by - 8, 1, 17, PAL.AMBER_HOT); scr.px(bx + 8, by - 8, 1, 17, PAL.AMBER_HOT);
    scr.px(bx - 12, by, 6, 1, PAL.AMBER); scr.px(bx + 7, by, 6, 1, PAL.AMBER);
    num(scr, bx + 12, by - 4, '1', PAL.AMBER_HOT);
  }
}

// accounts around a topic, each spoked to it. Decode pulls the young accounts
// back to the one node that made them, and the crowd turns out to be a fan.
//
// An earlier pass scattered loose dots with no spokes and collapsed them onto
// the source: it read as random pixels moving, not as a network with a shape.
function crowd2(scr, t, d) {
  field(scr, d);
  const N = 44, TX = 74, TY = 38;                     // the topic
  const NX = 26, NY = 74;                             // the nursery
  for (let i = 0; i < N; i++) {
    const a = i * 2.399 + t * 0.16;
    const bot = i % 4 !== 0;                          // three in four are new
    const rad = 20 + (i % 5) * 5;
    const ox = TX + Math.cos(a) * rad * 1.25;
    const oy = TY + Math.sin(a) * rad * 0.78;
    const pull = bot ? Math.min(1, d * 1.4) : 0;
    // pulled to a ring around the nursery, not onto it — a pile on top of the
    // source hides the source
    const ringA = i * 1.7;
    const nx = NX + Math.cos(ringA) * (9 + (i % 3) * 4);
    const ny = NY + Math.sin(ringA) * (7 + (i % 3) * 3);
    const x = ox + (nx - ox) * pull, y = oy + (ny - oy) * pull;
    const c = pull > 0.4 ? PAL.AMBER : ink(d * 0.3);
    // the spoke: to the topic, or (once decoded) back to whatever made it
    if (pull > 0.4) scr.line(x, y, NX, NY, shade(PAL.AMBER_DIM, 0.85));
    else scr.line(x, y, TX, TY, shade(inkLo(d), 0.9));
    scr.px(x - 1, y - 1, 3, 3, c);
  }
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  scr.disc(TX, TY, 7, mix(PAL.GREEN_LO, PAL.AMBER_DIM, d));
  scr.disc(TX, TY, 4 + pulse * 2, mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d));
  if (d > 0.4) {
    scr.disc(NX, NY, 5, PAL.AMBER_DIM);
    scr.disc(NX, NY, 3, PAL.AMBER_HOT);
    num(scr, NX - 7, NY + 14, '400', PAL.AMBER_HOT);
  }
  num(scr, W - 20, 6, d > 0.4 ? '500' : '900', ink(d));
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
