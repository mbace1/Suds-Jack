// Radio Free Helsinki — the footage plates, full frame.
//
// Built to the owner's reference art (2026-07-28). Three things changed from
// the flat plates these replace, and all three are why the file is this long:
//
//   1. They fill the WHOLE post — 144×276, the same canvas the codec draws —
//      instead of sitting in a 128×152 window above an anchor. The reference
//      frames carry the camera HUD across the top of that exact size, so the
//      picture is the post.
//   2. Depth is drawn, not implied. Converging rails and lane lines, buildings
//      stepping back in tone, hundreds of individual lit windows and car
//      lights. The old plates read as diagrams of a street; these read as a
//      photograph of one.
//   3. Every one of them moves. A still frame in a feed reads as a broken
//      image, so each plate keeps a live layer: clouds drift, lamps breathe,
//      the tram closes, beacons blink, the crowd shifts.
//
// PERFORMANCE. A full-frame dithered sky is ~40k fillRect calls, which is far
// too much per frame. Each plate paints its static half ONCE into an offscreen
// canvas (`base()`), blits that, and draws only the moving parts live. Keep new
// work on the right side of that line — anything that changes every frame must
// live outside the cached callback or it will not animate, and anything that
// does not must stay inside it or the plate will crawl.
//
// WARM LIGHT. Street lamps, tram windows and headlights are warm, because the
// references are. They are kept dim and desaturated on purpose, the same rule
// the booth bulbs follow: amber has exactly one job in this app — "the spin is
// showing" — and a saturated orange lamp would spend that vocabulary on
// scenery. Nothing here approaches PAL.AMBER_HOT.

import { PAL } from './palette.js?v=27';
import { mix, shade, bayer } from './screen.js?v=27';

export const PLATE_W = 144, PLATE_H = 276;
const W = PLATE_W, H = PLATE_H;

// ── tiny drawing kit ───────────────────────────────────────────────
// A hash, because modular arithmetic is not scatter. `(i * 41) % 100` walks a
// ramp, so a hundred cars placed with it land on a straight diagonal and read
// as a dashed line rather than as traffic. This was drawn twice before anyone
// noticed the boulevard had a ruler in it.
const rnd = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };

const P = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); };

// a dithered vertical gradient — the only kind of smooth this app has
function ramp(c, y0, y1, top, bot, x0 = 0, x1 = W) {
  const span = Math.max(1, y1 - y0);
  for (let y = y0; y < y1; y++) {
    const k = (y - y0) / span;
    const lo = mix(top, bot, Math.max(0, k - 0.06));
    const hi = mix(top, bot, Math.min(1, k + 0.06));
    for (let x = x0; x < x1; x += 2) {
      P(c, x, y, 2, 1, bayer(x >> 1, y) < k * 0.55 + 0.22 ? hi : lo);
    }
  }
}

// A soft light halo. The falloff is quantised into a few alpha bands and each
// band drawn as one pass — so the glow stays round and every pixel stays hard,
// without the 4x4 tiling an ordered dither shows at the low alphas a light
// wash needs. The first version bayer'd it and put a checkerboard under the
// tram's headlights.
function halo(c, cx, cy, r, col, peak = 0.5) {
  const BANDS = 5;
  for (let b = BANDS; b >= 1; b--) {
    const a = (b / BANDS) * peak;
    if (a < 0.03) continue;
    c.globalAlpha = a / BANDS * 1.9;
    c.fillStyle = col;
    const rr = r * (1 - (b - 1) / BANDS);
    for (let y = -rr; y <= rr; y++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, rr * rr - y * y)));
      if (dx <= 0) continue;
      c.fillRect((cx - dx) | 0, (cy + y) | 0, dx * 2, 1);
    }
  }
  c.globalAlpha = 1;
}

// a grid of lit windows on a facade, deterministic per building
function windows(c, x, y, w, h, cols, rows, lit, dim, seed, onFrac = 0.62) {
  const gw = w / cols, gh = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < cols; i++) {
      const n = ((i * 7 + r * 13 + seed * 31) % 100) / 100;
      if (n > onFrac) continue;
      const ww = Math.max(1, gw * 0.45), hh = Math.max(1, gh * 0.4);
      P(c, x + i * gw + gw * 0.28, y + r * gh + gh * 0.3, ww, hh, n < onFrac * 0.45 ? lit : dim);
    }
  }
}

// ── the static-half cache ──────────────────────────────────────────
// One offscreen canvas per plate, painted on first use and blitted after.
const CACHE = new Map();
function base(key, paint) {
  let c = CACHE.get(key);
  if (c) return c;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  paint(ctx);
  CACHE.set(key, cv);
  return cv;
}

// ── palettes, straight off the reference frames ────────────────────
const NIGHT = { sky0: '#0a1512', sky1: '#1d3a32', haze: '#2b5147' };
const STONE = ['#a8b9ad', '#c8d6cb', '#e2ece3', '#f4f9f3'];   // floodlit: the
// building is the brightest thing in the reference by a wide margin, and a
// grey one just reads as another block in the skyline
const DOME  = ['#22483a', '#2f5c49', '#3d7059', '#4d8a6c'];
const GOLD  = '#b8944a', GOLD_HI = '#dcc07e', ROOF_T = '#2c3a33';
const LAMP  = '#c9843a', LAMP_HI = '#e8b877';
const RAIL  = '#5d6f63';

// ── CATHEDRAL — Tuomiokirkko over Senate Square ────────────────────
function cathedralBase(c, o = {}) {
  ramp(c, 0, 150, NIGHT.sky0, NIGHT.sky1);
  P(c, 0, 150, W, H - 150, NIGHT.sky1);

  // cloud banks, flat dithered slabs low in the sky
  for (const [cy, ch, k] of [[52, 16, 0.30], [82, 12, 0.22], [110, 20, 0.38], [132, 10, 0.18]]) {
    for (let y = cy; y < cy + ch; y++) {
      for (let x = 0; x < W; x += 2) {
        const n = Math.sin(x * 0.07 + cy) * 0.5 + 0.5;
        if (bayer(x >> 1, y) < k * n) P(c, x, y, 2, 1, mix(NIGHT.sky1, NIGHT.haze, 0.55));
      }
    }
  }
  // the far shore, a flat silhouette so the building has something to sit in front of
  for (let x = 0; x < W; x++) {
    const h = 6 + Math.sin(x * 0.08) * 3 + Math.sin(x * 0.021) * 4;
    P(c, x, 176 - h, 1, h + 4, shade(NIGHT.sky0, 1.25));
  }

  const cx = 70;
  // ── the mass, back to front ──
  P(c, cx - 52, 196, 104, 34, STONE[0]);                        // side wings
  P(c, cx - 52, 196, 104, 2, STONE[2]);
  for (const sx of [-1, 1]) {                                   // corner pavilions
    P(c, cx + sx * 40 - 11, 178, 22, 22, STONE[1]);
    P(c, cx + sx * 40 - 11, 178, 22, 2, STONE[2]);
    P(c, cx + sx * 40 - 8, 166, 16, 13, DOME[1]);               // small green domes
    P(c, cx + sx * 40 - 6, 163, 12, 4, DOME[2]);
    P(c, cx + sx * 40 - 1, 156, 2, 8, GOLD);                    // their finials
    P(c, cx + sx * 40 - 2, 154, 4, 2, GOLD_HI);
  }

  P(c, cx - 34, 186, 68, 46, STONE[1]);                         // the body
  P(c, cx - 34, 186, 68, 2, STONE[3]);
  P(c, cx - 30, 172, 60, 15, STONE[2]);                         // attic
  P(c, cx - 30, 172, 60, 2, STONE[3]);

  // the drum: colonnade, then dome
  P(c, cx - 20, 128, 40, 44, STONE[2]);
  P(c, cx - 20, 128, 40, 2, STONE[3]);
  for (let i = 0; i < 9; i++) {                                 // drum columns
    P(c, cx - 18 + i * 4.4, 132, 2, 36, STONE[3]);
    P(c, cx - 18.6 + i * 4.4, 130, 3, 2, STONE[3]);
  }
  for (let i = 0; i < 4; i++) {                                 // drum windows
    P(c, cx - 13 + i * 8, 140, 4, 16, shade(STONE[0], 0.5));
  }
  if (o.tower) {                       // station: a clock tower, not a dome
    P(c, cx - 13, 74, 26, 56, STONE[2]); P(c, cx - 15, 70, 30, 5, STONE[3]);
    P(c, cx - 9, 86, 18, 18, shade(STONE[0], 0.45));
    for (let a = 0; a < 12; a++) {     // the clock face
      const an = a / 12 * Math.PI * 2;
      P(c, cx + Math.sin(an) * 7, 95 - Math.cos(an) * 7, 1, 1, GOLD_HI);
    }
    P(c, cx - 1, 62, 2, 12, ROOF_T);
  } else if (o.onion) {                // katajanokka: Uspenski, brick and onions
    for (const [ox, oy, orr] of [[0, 118, 13], [-19, 140, 7], [19, 140, 7], [0, 146, 6]]) {
      for (let i = 0; i < 7; i++) {
        const k = i / 7, rw = Math.round(orr * Math.sin((1 - k) * 2.2));
        P(c, cx + ox - rw, oy - i * 2.6, rw * 2, 3, GOLD);
      }
      P(c, cx + ox - 1, oy - 22, 2, 7, GOLD_HI);
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const k = i / 9, rw = Math.round(21 * Math.cos(k * 1.35));
      P(c, cx - rw, 128 - i * 3.2, rw * 2, 4, DOME[Math.min(3, 1 + (i > 5 ? 1 : 0) + (i > 7 ? 1 : 0))]);
    }
  }
  P(c, cx - 5, 96, 10, 6, DOME[3]);                             // lantern base
  P(c, cx - 3, 88, 6, 9, GOLD);                                 // lantern
  P(c, cx - 4, 86, 8, 2, GOLD_HI);
  P(c, cx - 1, 74, 2, 13, GOLD);                                // spire
  P(c, cx - 4, 78, 8, 2, GOLD);                                 // cross arm

  // the portico
  P(c, cx - 30, 200, 60, 4, STONE[3]);                          // entablature
  for (let i = 0; i < 8; i++) P(c, cx - 27 + i * 7.4, 204, 4, 28, STONE[3]);   // columns
  for (let i = 0; i < 8; i++) P(c, cx - 28 + i * 7.4, 202, 6, 2, STONE[3]);
  // pediment
  for (let i = 0; i < 12; i++) P(c, cx - 32 + i * 1.4, 200 - i * 1.1, 64 - i * 2.8, 2, STONE[2]);

  // the steps — the thing that puts the building up on a hill
  const NSTEPS = o.steps !== undefined ? o.steps : 20;
  for (let i = 0; i < NSTEPS; i++) {
    const y = 232 + i * 1.9, w = 66 + i * 5.2;
    P(c, cx - w / 2, y, w, 2, i % 2 ? shade(STONE[0], 0.48) : shade(STONE[0], 0.4));
  }
  if (o.quay) {                        // katajanokka / suomenlinna: water below
    P(c, 0, 246, W, H - 246, '#10222a');
    for (let y = 246; y < H; y += 2)
      for (let x = 0; x < W; x += 2)
        if (bayer(x >> 1, y >> 1) < 0.28) P(c, x, y, 2, 1, '#1d3c48');
  } else P(c, 0, 270, W, H - 270, '#0d1512');                     // the square

  // flagpoles, right
  P(c, 116, 196, 1, 62, shade(STONE[0], 0.7));
  P(c, 128, 202, 1, 56, shade(STONE[0], 0.6));
  // the kiosk on the square
  P(c, 92, 248, 22, 18, '#141d19');
  P(c, 90, 244, 26, 5, '#1b2621');
}

function cathedral(scr, t, d, o = {}) {
  scr.ctx.drawImage(base('cath:' + (o.label || 'x'), (c) => cathedralBase(c, o)), 0, 0);
  const c = scr.ctx;

  // drifting cloud veil — the sky is never quite still
  for (let i = 0; i < 3; i++) {
    const y = 60 + i * 26, off = (t * (4 + i * 2)) % (W + 60) - 30;
    for (let x = 0; x < 46; x += 2) {
      const a = Math.sin((x / 46) * Math.PI);
      if (bayer((x + (off | 0)) >> 1, y) < a * 0.22) P(c, off + x, y + (i % 2), 2, 1, NIGHT.haze);
    }
  }
  // the lantern light, breathing
  const lk = 0.55 + 0.45 * Math.sin(t * 1.3);
  halo(c, 70, 91, 7, mix(GOLD, GOLD_HI, lk), 0.5 * lk);
  P(c, 69, 89, 2, 2, mix(GOLD_HI, '#ffffff', lk * 0.4));

  // the flag, waving
  for (let i = 0; i < 11; i++) {
    const wv = Math.sin(t * 3 + i * 0.55) * 1.6 * (i / 11);
    P(c, 117 + i, 198 + wv, 1, 7, i > 3 && i < 7 ? '#8fb6c8' : '#d8e4ea');
  }
  // the crowd on the steps: silhouettes that shift, never a still photograph
  for (let i = 0; i < 46; i++) {
    const bx = 4 + rnd(i) * 136;
    // spread up the flight, not piled in a line at the bottom edge
    const by = 238 + rnd(i + 60) * 34;
    const sway = Math.sin(t * 0.7 + i) * 0.8;
    const hh = 3 + Math.round(rnd(i + 120) * 3) + (by > 262 ? 2 : 0);
    P(c, bx + sway, by, 2, hh, '#080d0b');
    P(c, bx + sway, by - 2, 2, 2, '#0b120f');
  }
  amberWash(c, d);
}

// ── KATU — the narrow street, warm lamps, tram head-on ─────────────
function katuBase(c, o = {}) {
  ramp(c, 0, 120, '#0b1a18', '#1b3b34');
  P(c, 0, 120, W, H - 120, '#12241f');

  // facades either side, stepping in toward the vanishing point
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const inset = i * 13;
      const x = sx < 0 ? -4 + inset : W - 40 + inset;
      const wdt = 44 - i * 6;
      const top = 18 + i * 20;
      const bot = 200 - i * 12;
      P(c, x, top, wdt, bot - top, shade('#241a14', 1 - i * 0.12));
      P(c, sx < 0 ? x + wdt - 1 : x, top, 1, bot - top, '#3a2a1e');
      windows(c, x + 2, top + 6, wdt - 6, bot - top - 16, 3, 7 - i, '#c9a35e', '#6b5330', i + (sx > 0 ? 5 : 0));
    }
  }
  // the road, and the pavement kerbs
  P(c, 0, 196, W, H - 196, '#16221d');
  for (let y = 196; y < H; y++) {
    const k = (y - 196) / (H - 196);
    for (let x = 0; x < W; x += 2) {
      if (bayer(x >> 1, y) < k * 0.3) P(c, x, y, 2, 1, '#1d2f27');
    }
  }
  // rails, converging on the vanishing point
  const VX = 72, VY = 198;
  for (const off of [-9, -4, 4, 9]) {
    for (let y = VY; y < H; y++) {
      const k = (y - VY) / (H - VY);
      const x = VX + off * (0.12 + k * k * 5.6);
      P(c, x, y, Math.abs(off) > 6 ? 2 : 1, 1, mix('#2a3a30', RAIL, k));
    }
  }
  // distant blocks down the street
  for (let i = 0; i < 5; i++) {
    const x = 46 + i * 11, h = 26 + ((i * 13) % 22);
    P(c, x, 168 - h, 10, h, shade('#16241f', 1 + i * 0.08));
    windows(c, x + 1, 170 - h, 8, h - 4, 2, 6, '#9ec9a6', '#3f5c46', i, 0.5);
  }
  // trees, dark masses either side of the tram
  const TREES = o.trees ? [[30, 182, 15], [112, 180, 16], [44, 172, 11], [100, 170, 12],
                          [56, 164, 8], [88, 163, 8], [64, 158, 6], [80, 157, 6]]
                        : [[38, 176, 13], [104, 174, 14], [52, 168, 8], [92, 166, 9]];
  for (const [tx, ty, r] of TREES) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r) continue;
      if (bayer(tx + x, ty + y) < 0.72) P(c, tx + x, ty + y, 1, 1, y < -r * 0.3 ? '#2c4a33' : '#1c3122');
    }
  }
  // catenary poles
  for (const [px, py, ph] of [[26, 140, 58], [118, 138, 60], [46, 158, 34], [98, 156, 36]]) {
    P(c, px, py, 2, ph, '#141d19');
  }
}

function katu(scr, t, d, o = {}) {
  scr.ctx.drawImage(base('katu:' + (o.label || 'x'), (c) => katuBase(c, o)), 0, 0);
  const c = scr.ctx;

  // stars, and the receiver's own data dashes across the sky
  for (let i = 0; i < 40; i++) {
    const x = (i * 53) % W, y = (i * 29) % 96;
    if ((Math.floor(t * 1.5) + i) % 7 === 0) continue;
    P(c, x, y, 1, 1, shade('#bcd8cf', 0.8));
  }
  for (let i = 0; i < 7; i++) {
    const y = 14 + i * 13;
    const off = ((t * (9 + i * 3) + i * 40) % (W + 70)) - 35;
    const len = 12 + ((i * 17) % 28);
    for (let x = 0; x < len; x += 3) P(c, off + x, y, 2, 1, PAL.GREEN);
  }
  // catenary wires, sagging and swaying
  for (const [x0, x1, y0] of [[0, W, 104], [0, W, 122]]) {
    for (let x = x0; x < x1; x++) {
      const k = (x - x0) / (x1 - x0);
      const sag = Math.sin(k * Math.PI) * 5 + Math.sin(t * 0.8 + k * 3) * 0.8;
      P(c, x, y0 + sag, 1, 1, '#0d1512');
    }
  }
  P(c, 71, 0, 2, 132, '#0d1512');                                // the centre dropper

  // street lamps — dim, desaturated warm. Amber keeps its one job.
  for (const [lx, ly] of [[27, 138], [117, 136], [47, 156], [97, 154]]) {
    const k = 0.72 + 0.28 * Math.sin(t * 2.1 + lx);
    P(c, lx - 6, ly, 14, 2, '#141d19');
    halo(c, lx, ly + 3, 13, mix(LAMP, LAMP_HI, k), 0.34 * k);
    P(c, lx - 2, ly + 2, 5, 3, mix(LAMP_HI, '#fff6e0', k * 0.5));
  }

  if (o.tram === false) { amberWash(c, d); return; }   // esplanadi: an avenue, not a route
  // the tram, closing slowly then looping back down the street
  const app = (t * 0.05) % 1;
  const sc = 0.62 + app * 0.5;         // arrives, but stays mid-distance
  const ty = 168 + app * 34;
  const tw = Math.round(30 * sc), th = Math.round(34 * sc);
  const tx = 72 - tw / 2;
  P(c, tx - 1, ty - 1, tw + 2, th + 2, '#0c1411');
  P(c, tx, ty, tw, th, '#d9c9a2');                               // the lit body
  P(c, tx + 2, ty + 3, tw - 4, th * 0.42, mix('#f2e3bd', '#ffffff', 0.25));  // the windscreen
  for (let i = 0; i < 4; i++) P(c, tx + 3 + i * (tw - 6) / 4, ty + 4, 2, th * 0.34, '#8a7a55');
  P(c, tx + 1, ty + th * 0.62, tw - 2, 2, '#7e6f4e');
  // headlights + their wash on the road
  const hk = 0.8 + 0.2 * Math.sin(t * 5);
  for (const hx of [tx + 3, tx + tw - 6]) {
    halo(c, hx + 1, ty + th - 4, 13, mix(LAMP_HI, '#fff4dc', hk), 0.55 * hk);
    P(c, hx, ty + th - 6, 4, 3, '#fff8e6');
  }
  // the beam it throws down the street — the road in front of a tram is lit
  // Alpha bands, not a bayer threshold. At the low alphas a light wash needs,
  // an ordered dither tiles its 4x4 matrix visibly and the beam reads as a
  // checkerboard rug on the road.
  for (let y = 0; y < 34; y++) {
    const k = 1 - y / 34;
    const spread = tw * 0.42 + y * 0.9;
    c.globalAlpha = k * k * 0.30 * hk;
    P(c, 72 - spread, ty + th + y, spread * 2, 1, mix('#4a4130', LAMP_HI, k * 0.6));
    c.globalAlpha = 1;
  }
  P(c, 71, 0, 2, 8, '#0d1512');
  // pantograph
  P(c, tx + tw / 2 - 1, ty - 7 * sc, 2, 7 * sc, '#2a3a30');

  // parked cars, tail lights breathing
  for (const [cx2, cy2, cw, dir] of [[6, 232, 26, -1], [116, 226, 24, 1], [18, 208, 18, -1], [110, 204, 17, 1]]) {
    P(c, cx2, cy2, cw, 11, '#16211c');
    P(c, cx2 + 2, cy2 - 4, cw - 5, 5, '#1d2b24');
    const bk = 0.6 + 0.4 * Math.sin(t * 1.7 + cx2);
    P(c, dir < 0 ? cx2 + cw - 3 : cx2, cy2 + 3, 3, 2, mix('#7a2a22', '#d8503c', bk));
  }
  // wet reflection of the tram, shimmering
  for (let y = 0; y < 22; y++) {
    const k = 1 - y / 22;
    for (let x = tx; x < tx + tw; x += 2) {
      const j = Math.sin(t * 4 + y * 0.7 + x * 0.2) * 1.4;
      if (bayer((x + j) >> 1, y) < k * 0.34) P(c, x + j, ty + th + y, 2, 1, mix('#6d6045', '#c9b489', k));
    }
  }
  amberWash(c, d);
}

// ── MANNERHEIM — the wide boulevard, green monochrome ──────────────
function mannerheimBase(c, o = {}) {
  ramp(c, 0, 96, '#050a08', '#16281f');
  P(c, 0, 96, W, H - 96, '#16281f');

  // towers, tallest at the sides, stepping down toward the axis
  const blocks = o.low
    ? [[-4, 128, 30, 32], [30, 134, 22, 26], [58, 138, 18, 22], [82, 132, 22, 28], [112, 126, 34, 34]]
    : [[-4, 30, 34, 128], [24, 74, 22, 86], [44, 96, 16, 62], [62, 108, 14, 52],
       [82, 92, 18, 68], [98, 60, 20, 100], [118, 22, 30, 138]];
  blocks.forEach(([x, y, w, h], i) => {
    P(c, x, y, w, h, shade('#1c3227', 1 - Math.abs(i - 3) * 0.06));
    P(c, x, y, w, 1, '#2c4a39');
    windows(c, x + 1, y + 3, w - 2, h - 8, Math.max(2, w / 6 | 0), Math.max(4, h / 9 | 0),
            '#a9dcbc', '#3f6a51', i, 0.66);
  });
  // the road, widening toward the camera
  P(c, 0, 158, W, H - 158, o.water ? '#12262e' : '#1a2f26');
  if (o.water) {                       // harbour / gulf: swell, not tarmac
    for (let y = 160; y < H; y += 2) {
      const k = (y - 160) / (H - 160);
      for (let x = 0; x < W; x += 2) {
        if (bayer(x >> 1, y >> 1) < 0.2 + k * 0.3) P(c, x, y, 2, 1, mix('#12262e', '#2b5566', k));
      }
    }
  }
  if (o.marker) {                      // gulf: a channel marker, and nothing else
    P(c, 100, 128, 3, 32, '#3f6350');
    P(c, 96, 122, 11, 8, '#2b4a3a');
    P(c, 30, 150, 2, 10, '#3f6350'); P(c, 27, 146, 8, 5, '#2b4a3a');
  }
  if (o.plaza) {                       // kamppi: a bus interchange, not a void
    P(c, 0, 168, W, 26, '#16281f'); P(c, 0, 168, W, 2, '#33553f');           // the canopy
    for (let i = 0; i < 7; i++) P(c, 8 + i * 20, 170, 2, 24, '#0f1d17');     // its columns
    for (let i = 0; i < 6; i++) {                                            // buses under it
      const bx = 6 + i * 23;
      P(c, bx, 178, 18, 11, '#2a4636'); P(c, bx + 2, 180, 14, 5, '#96c4a6');
    }
    for (let i = 0; i < 26; i++) {                                           // paving
      const py = 200 + (i % 7) * 11;
      P(c, (i * 37) % W, py, 26, 1, '#20372b');
    }
  }
  if (o.fort) {                        // ramparts on a low island
    for (let i = 0; i < 3; i++) {
      const fx = 12 + i * 46, fw = 38 - i * 4;
      P(c, fx, 140, fw, 18, '#41604e'); P(c, fx, 140, fw, 2, '#6d9781');
      for (let k = 0; k < fw; k += 6) P(c, fx + k, 135, 4, 5, '#547a63');   // crenellations
      for (let k = 3; k < fw; k += 11) P(c, fx + k, 146, 3, 5, '#1d2f26');  // embrasures
    }
    P(c, 58, 146, 26, 12, '#16241d');                                        // the gate
    P(c, 58, 146, 26, 2, '#6d9781');
  }
  if (o.cranes) {                      // gantries over the quay
    for (let i = 0; i < 3; i++) {
      const gx = 18 + i * 44, gy = 84 - i * 4, gh = 66 - i * 6;
      P(c, gx, gy, 3, gh, '#3f6350'); P(c, gx + 22, gy, 3, gh, '#3f6350');   // legs
      P(c, gx - 6, gy - 3, 36, 4, '#598872');                                  // the boom
      P(c, gx + 9, gy - 20, 3, 20, '#3f6350');                                 // the mast
      P(c, gx + 4, gy + 10, 16, 7, '#2b4a3a');                                 // the cab
      P(c, gx - 6, gy - 3, 36, 1, '#7fb198');                                  // a lit edge
      for (let k = 0; k < gh; k += 9) P(c, gx, gy + k, 25, 1, '#2b4a3a');      // lattice
    }
  }
  for (let y = 158; y < H; y++) {
    const k = (y - 158) / (H - 158);
    for (let x = 0; x < W; x += 2) {
      if (bayer(x >> 1, y) < 0.18 + k * 0.2) P(c, x, y, 2, 1, mix('#1a2f26', '#274536', 0.6));
    }
  }
  // lane lines and rails, all on one vanishing point
  const VX = 72, VY = 160;
  const LANES = o.rails === false ? [] : [[-26, '#5e8a6f', 2], [-14, '#7fae8d', 1], [-5, '#9fc9ac', 2],
                                 [5, '#9fc9ac', 2], [14, '#7fae8d', 1], [26, '#5e8a6f', 2]];
  for (const [off, col, wdt] of LANES) {
    for (let y = VY; y < H; y++) {
      const k = (y - VY) / (H - VY);
      P(c, VX + off * (0.1 + k * k * 4.6), y, wdt, 1, mix('#24402f', col, k * 0.9));
    }
  }
  // kerb blocks
  P(c, 0, 156, W, 3, '#0f1b16');
}

function mannerheim(scr, t, d, o = {}) {
  scr.ctx.drawImage(base('mann:' + (o.label || 'x'), (c) => mannerheimBase(c, o)), 0, 0);
  const c = scr.ctx;

  // aviation beacons on the towers, out of phase
  for (const [bx, by, ph] of [[10, 28, 0], [128, 20, 1.7], [106, 58, 3.1], [30, 72, 4.4]]) {
    if (Math.floor(t * 1.1 + ph) % 2 === 0) {
      P(c, bx, by, 2, 2, '#d0402c');
      halo(c, bx, by, 4, '#d0402c', 0.35);
    }
  }
  // overhead wires, crossing the frame, swaying
  for (const wy of [118, 134, 150]) {
    for (let x = 0; x < W; x++) {
      const s = Math.sin(t * 0.6 + x * 0.05 + wy) * 0.9;
      P(c, x, wy + s, 1, 1, '#0c1611');
    }
  }
  for (const px of [14, 44, 100, 130]) P(c, px, 112, 2, 52, '#0c1611');

  // the traffic mass down the boulevard — the busiest thing in frame
  const NCARS = o.traffic !== undefined ? o.traffic : 120;
  for (let i = 0; i < NCARS; i++) {
    // pow() bunches them at the far end, which is where a boulevard's traffic
    // reads as a mass of light rather than as countable cars
    const k = Math.pow((rnd(i) + t * 0.03) % 1, 2.1);
    const lane = (rnd(i + 200) - 0.5) * 7;
    const y = 161 + k * 104;
    const x = 72 + lane * (1.4 + k * k * 30);
    if (x < 2 || x > W - 2) continue;
    const near = k > 0.62;
    const warm = rnd(i + 400) < 0.28;
    P(c, x, y, near ? 2 : 1, 1, warm ? '#c03a28' : mix('#9fc4ab', '#f2fbf4', k));
    if (near) halo(c, x, y, 2, warm ? '#c03a28' : '#cfe8d6', 0.2);
  }

  if (o.tram === false) { amberWash(c, d); return; }
  // the tram, coming on the centre pair
  const app = (t * 0.045) % 1;
  const sc = 0.45 + app * 0.45;
  const ty = 178 + app * 48;
  const tw = Math.round(26 * sc), th = Math.round(30 * sc);
  const tx = 72 - tw / 2;
  P(c, tx - 1, ty - 1, tw + 2, th + 2, '#0a120e');
  P(c, tx, ty, tw, th, '#cfe0d2');
  P(c, tx + 2, ty + 2, tw - 4, th * 0.4, '#eef7f0');
  P(c, tx, ty + th - 5, tw, 5, '#c0402e');                    // the red skirt
  for (const hx of [tx + 2, tx + tw - 5]) {
    halo(c, hx + 1, ty + th - 7, 7, '#eaf6ec', 0.42);
    P(c, hx, ty + th - 8, 3, 2, '#ffffff');
  }
  P(c, tx + tw / 2 - 1, ty - 6 * sc, 2, 6 * sc, '#25382c');

  amberWash(c, d);
}

// ── DECODE ─────────────────────────────────────────────────────────
// Every shot type mutates under DECODE (hard rule #5). The plates do it with a
// wash and a scanline tear rather than by redrawing: the picture is the same
// picture, seen through a receiver that has stopped agreeing with it.
function amberWash(c, d) {
  if (d <= 0.01) return;
  c.globalAlpha = d * 0.26;
  P(c, 0, 0, W, H, PAL.AMBER_DIM);
  c.globalAlpha = 1;
  for (let y = 0; y < H; y += 3) {
    if (bayer(y, y) > d * 0.5) continue;
    const img = c.getImageData(0, y, W, 2);
    c.putImageData(img, Math.round(Math.sin(y * 0.4) * d * 4), y);
  }
}


// ── VARIANTS ───────────────────────────────────────────────────────
// Grok photographed the cathedral, the narrow street and the boulevard. Those
// three subjects are HIS; drawing them as well would put the same location on
// screen twice in one feed. So the drawn plates are re-aimed at seven other
// Helsinki subjects, built from the same three kits with the defining features
// swapped. Helsinki accuracy still applies (rule #10) — a plate is named for
// what it actually shows.

// the park avenue: katu's street, limes instead of facades, no tram
function esplanadi(scr, t, d) {
  katu(scr, t, d, { tram: false, trees: 6, lampWarm: 0.8, label: 'esplanadi' });
}
// the plaza: mannerheim's blocks, no rails, a canopy line
function kamppi(scr, t, d) {
  mannerheim(scr, t, d, { rails: false, tram: false, traffic: 40, plaza: true, label: 'kamppi' });
}
// the clock tower: cathedral's massing, a tower instead of a dome
function station(scr, t, d) {
  cathedral(scr, t, d, { tower: true, steps: 6, label: 'station' });
}
// the port: mannerheim's depth, cranes over water
function harbour(scr, t, d) {
  mannerheim(scr, t, d, { rails: false, tram: false, traffic: 18, water: true, cranes: true, label: 'harbour' });
}
// open water and a far shore
function gulf(scr, t, d) {
  mannerheim(scr, t, d, { rails: false, tram: false, traffic: 6, water: true,
                          cranes: false, low: true, marker: true, label: 'gulf' });
}
// the fortress islands — water and low ramparts, NOT the cathedral with fewer
// steps, which is what the first attempt was and is precisely the duplicate
// the photographs already cover
function suomenlinna(scr, t, d) {
  mannerheim(scr, t, d, { rails: false, tram: false, traffic: 10, water: true,
                          low: true, fort: true, label: 'suomenlinna' });
}
// the waterfront under Uspenski
function katajanokka(scr, t, d) {
  cathedral(scr, t, d, { onion: true, steps: 3, quay: true, label: 'katajanokka' });
}

const PLATES = { esplanadi, kamppi, station, harbour, gulf, suomenlinna, katajanokka };
export const PLATE_KEYS = Object.keys(PLATES);

export function drawPlate(key, scr, t, decode) {
  (PLATES[key] || esplanadi)(scr, t, decode);
  scr.scanlines(PAL.INK, 3);
}
