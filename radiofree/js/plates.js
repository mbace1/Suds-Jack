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

import { PAL } from './palette.js?v=41';
import { mix, shade, bayer } from './screen.js?v=41';

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


// ── LIGHT ──────────────────────────────────────────────────────────
//
// The one thing that separates a shot from a diagram, and the thing every
// plate here was missing. Three moves, cheap, in this order:
//
//   sky()        a graded ground with a HOT band at the horizon, so the frame
//                has a bright end. Everything used to live between 10% and 30%
//                brightness in the same green, which is why nothing had focus:
//                the eye goes to the brightest thing, and there wasn't one.
//   rim()        a 1–2px near-white edge on the lit side of a subject. It costs
//                two fillRects and it is the difference between an object in a
//                scene and a rectangle on a background.
//   fg()         a PURE BLACK foreground shape, out of focus by virtue of
//                having no detail at all. Black in front, lit in the middle,
//                graded behind: that is depth, and no amount of correct
//                perspective substitutes for it.
const PAPER = '#f2f8f4', BONE = '#c3d4cc', COAL = '#000000';

// a lit horizon: dark at the top, hot at the band, dark again below
function sky(c, y0, y1, band, top, hot, bot) {
  ramp(c, y0, band, top, hot);
  ramp(c, band, y1, hot, bot);
}

// the rim: `side` is -1 for light from the left, +1 from the right
function rim(c, x, y, w, h, side, col = PAPER) {
  P(c, side < 0 ? x : x + w - 1, y, 1, h, col);
  P(c, x, y, w, 1, shade(col, 0.75));
}

// a black cut-out along one edge — a roofline, a railing, a shoulder of rock
function fg(c, edge, depth, seedN, bite = 0.55) {
  for (let x = 0; x < W; x += 3) {
    const h2 = depth * (0.45 + rnd(x * 0.37 + seedN) * bite);
    if (edge === 'bottom') P(c, x, H - h2, 3, h2, COAL);
    else P(c, x, 0, 3, h2, COAL);
  }
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


// ── BEACH — Hietaniemi in July, and the machine counting it ────────
// The only daylight plate on the wire. Everything else here is night, so this
// one carries its own palette rather than borrowing the three kits.
const SAND = ['#d9c48f', '#c9b077'], SEA = ['#3d86a0', '#1f5a72'];

function beachBase(c) {
  ramp(c, 0, 96, '#8fc6d8', '#cfe6ea');                // the sky
  ramp(c, 96, 150, SEA[0], SEA[1]);                    // the water
  P(c, 0, 94, W, 2, '#e6f2f4');
  P(c, 16, 88, 44, 4, '#2e5c58');                      // the far shore
  P(c, 92, 89, 38, 3, '#2e5c58');
  ramp(c, 150, 214, SAND[0], SAND[1]);                 // the sand
  ramp(c, 214, H, '#3c6b34', '#20401d');               // the grass
  // the pines that hold both edges of the reference frame
  for (const [x0, w2] of [[0, 26], [W - 26, 26]]) {
    P(c, x0 + w2 / 2 - 3, 0, 6, H, '#1d3018');
    for (let y = 6; y < H; y += 13) {
      const spread = 10 + Math.sin(y * 0.4) * 4;
      P(c, x0 + w2 / 2 - spread, y, spread * 2, 8, '#264a20');
      P(c, x0 + w2 / 2 - spread, y + 7, spread * 2, 1, '#16300f');
    }
  }
  // towels and people on the sand — a hash, never a modular ramp
  for (let i = 0; i < 90; i++) {
    const x = 30 + rnd(i * 1.31) * (W - 62), y = 154 + rnd(i * 2.77) * 56;
    if (rnd(i * 5.1) < 0.34) P(c, x, y, 4, 2, ['#c8484a', '#3c6fb0', '#e0c24a'][i % 3]);
    else { P(c, x, y, 2, 4, '#3b3128'); P(c, x, y - 2, 2, 2, '#c9a882'); }
  }
  for (let i = 0; i < 12; i++) {                        // swimmers
    const x = 34 + rnd(i * 3.9) * (W - 68);
    P(c, x, 120 + rnd(i * 7.3) * 24, 2, 2, '#c9a882');
  }
}

function beach(scr, t, d) {
  const c = scr.ctx;
  c.drawImage(base('beach', beachBase), 0, 0);
  // the water is the live layer — a cached plate still has to move on its
  // first screen, or the post reads as a broken page
  for (let y = 98; y < 148; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (bayer(x >> 1, y >> 1) < 0.10 + Math.sin(x * 0.09 + t * 1.3 + y * 0.2) * 0.06) {
        P(c, x, y, 2, 1, '#bfe0e8');
      }
    }
  }
  // the drones, and the one cone that saw anything
  for (let i = 0; i < 3; i++) {
    const dx = 34 + ((t * 8 + i * 46) % 84), dy = 30 + Math.sin(t * 1.2 + i) * 5;
    P(c, dx - 7, dy, 15, 3, '#1a2a26');
    P(c, dx - 2, dy - 3, 4, 7, '#33504a');
    if ((t * 3 + i) % 2 < 1) P(c, dx + 7, dy - 1, 2, 2, '#e8564e');
    if (d > 0.15 && i === 1) {
      halo(c, dx, dy + 40, 34, PAL.AMBER_DIM, 0.3 * d);
      P(c, dx - 26, 208, 52, 2, PAL.AMBER);
    }
  }
  amberWash(c, d);
}

// ── MOON — blue hour over the ridge, and the chimney beside it ─────
function moonBase(c) {
  ramp(c, 0, 190, '#0d4f8f', '#2f8ec9');
  P(c, 70, 108, 16, 84, '#d8dee2');                     // the plant chimney
  P(c, 68, 103, 20, 6, '#eef2f4');
  P(c, 70, 108, 3, 84, '#f2f6f8');
  for (let i = 0; i < 18; i++) {                        // the coaster arc
    const a = Math.PI * (0.12 + i / 26);
    P(c, 26 + Math.cos(a) * 30, 176 - Math.sin(a) * 58, 3, 3, '#33566d');
  }
  for (let x = 0; x < W; x += 3) {                      // the treeline
    const h2 = 26 + Math.sin(x * 0.27) * 9 + Math.sin(x * 0.09) * 7;
    P(c, x, 190 - h2, 3, h2 + 14, '#123a22');
  }
  P(c, 0, 204, W, 22, '#0c2718');
  for (let i = 0; i < 5; i++) {                         // the car park
    const cx = -10 + i * 34;
    P(c, cx, 240, 36, 24, '#25333d');
    P(c, cx + 6, 226, 24, 15, '#37485a');
    P(c, cx + 8, 228, 20, 8, '#4d6478');
    P(c, cx + 30, 250, 4, 3, '#c8484a');
  }
  // the maple that overhangs the top of the reference frame
  for (let i = 0; i < 26; i++) {
    P(c, 4 + rnd(i * 2.3) * 78, 2 + rnd(i * 4.7) * 26, 7, 5, '#0b1d15');
  }
}

function moon(scr, t, d) {
  const c = scr.ctx;
  c.drawImage(base('moon', moonBase), 0, 0);
  const mx = 96, my = 150 + Math.sin(t * 0.25) * 1.5;
  halo(c, mx, my, 26, '#f0a03c', 0.42);
  for (let dy = -15; dy <= 15; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, 225 - dy * dy)));
    P(c, mx - dx, my + dy, dx * 2 + 1, 1, '#ffd07a');
  }
  P(c, mx - 6, my - 4, 4, 4, '#e8b45c');
  P(c, mx + 3, my + 5, 6, 3, '#e8b45c');
  P(c, mx - 2, my + 9, 4, 2, '#e8b45c');
  for (let i = 0; i < 2; i++) {                          // the drones
    const dx = 40 + ((t * 7 + i * 62) % 70), dy = 52 + Math.sin(t + i * 2.2) * 6;
    P(c, dx - 6, dy, 13, 3, '#0e1e2c');
    P(c, dx - 2, dy - 3, 4, 6, '#20384c');
  }
  if (d > 0.25) {
    // the same moon, with nothing beside it to lend it a scale
    halo(c, 40, 62, 26, PAL.AMBER_DIM, 0.4);
    for (let dy = -15; dy <= 15; dy++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, 225 - dy * dy)));
      P(c, 40 - dx, 62 + dy, dx * 2 + 1, 1, PAL.AMBER_HOT);
    }
    P(c, 24, 80, 33, 2, PAL.AMBER);
    P(c, mx - 16, my + 20, 33, 2, PAL.AMBER);
  }
  amberWash(c, d);
}


// ── WINTERHALL — a data hall on a frozen field, steaming ───────────
function winterhallBase(c) {
  ramp(c, 0, 120, '#0a1c33', '#1c3f5e');                  // winter night sky
  for (let i = 0; i < 40; i++) {                          // stars
    P(c, rnd(i * 1.9) * W, rnd(i * 4.1) * 100, 1, 1, '#9fc4d8');
  }
  for (let i = 0; i < 3; i++) {                           // a low aurora band
    const y = 34 + i * 9;
    for (let x = 0; x < W; x += 2) {
      const k = Math.sin(x * 0.05 + i) * 6;
      P(c, x, y + k, 2, 3 - i, i ? '#1c5c4a' : '#2f8a68');
    }
  }
  ramp(c, 120, 176, '#25455f', '#3b6480');                // the frozen bay
  P(c, 0, 118, W, 2, '#5f8ba4');
  ramp(c, 176, H, '#c9d9e4', '#e8f0f5');                  // snow
  for (let i = 0; i < 60; i++) {                          // drift texture
    P(c, rnd(i * 2.7) * W, 180 + rnd(i * 5.3) * 90, 6, 2, '#b3c6d4');
  }
  // the hall: long, low, and almost windowless, which is what they look like
  P(c, 14, 128, 116, 44, '#39505f');
  P(c, 14, 126, 116, 4, '#5a7789');
  for (let x = 20; x < 126; x += 9) P(c, x, 140, 5, 4, '#7fd0b4');
  for (let x = 18; x < 128; x += 26) P(c, x, 158, 18, 10, '#2b3d49');
  P(c, 14, 170, 116, 3, '#1d2c36');
  P(c, 118, 104, 8, 26, '#495f6e');                       // the stack
  P(c, 117, 101, 10, 4, '#68808f');
}

function winterhall(scr, t, d) {
  const c = scr.ctx;
  c.drawImage(base('winterhall', winterhallBase), 0, 0);
  // steam off the stack and the roof line — the live layer
  for (let i = 0; i < 26; i++) {
    const a = (t * 14 + i * 11) % 110;
    const x = 122 + Math.sin((a + i) * 0.12) * 9 - a * 0.06;
    P(c, x, 100 - a * 0.7, 5 + a * 0.05, 3, i % 3 ? '#7d97a8' : '#a9c0cc');
  }
  for (let i = 0; i < 10; i++) {
    const a = (t * 9 + i * 17) % 60;
    P(c, 24 + i * 11, 124 - a * 0.5, 4, 2, '#6d8595');
  }
  if (d > 0.15) { halo(c, 72, 150, 46, PAL.AMBER_DIM, 0.3 * d); }
  amberWash(c, d);
}

// ── PACKICE — the winter gulf, floes, and a ship that is not moving ─
function packiceBase(c) {
  ramp(c, 0, 104, '#123a52', '#c98a52');                  // a low winter sun
  ramp(c, 104, H, '#7f9db0', '#c2d6e2');                  // the ice sheet
  P(c, 0, 102, W, 3, '#e8c48c');
  for (let i = 0; i < 80; i++) {                          // floes, hashed
    const x = rnd(i * 1.7) * W, y = 108 + rnd(i * 3.9) * 160;
    const w2 = 8 + rnd(i * 6.1) * 22;
    P(c, x, y, w2, 3 + rnd(i * 8.3) * 4, '#eef5fa');
    P(c, x, y + 4, w2, 2, '#6f8b9e');
  }
  P(c, 84, 92, 34, 12, '#0d2a3c');                        // the far shore
}

function packice(scr, t, d) {
  const c = scr.ctx;
  c.drawImage(base('packice', packiceBase), 0, 0);
  const sx = 46, sy = 150 + Math.sin(t * 0.5) * 1;        // she is not going far
  P(c, sx, sy, 54, 14, '#2b3b46');                        // hull
  P(c, sx + 54, sy + 2, 8, 10, '#2b3b46');                // bow
  P(c, sx + 12, sy - 14, 20, 15, '#e8ecef');              // superstructure
  P(c, sx + 15, sy - 11, 5, 4, '#ffd07a');
  P(c, sx + 24, sy - 11, 5, 4, '#ffd07a');
  P(c, sx + 34, sy - 22, 5, 23, '#c8484a');               // funnel
  P(c, sx - 4, sy + 12, 66, 3, '#16242c');
  for (let i = 0; i < 14; i++) {                          // stack smoke
    const a = (t * 10 + i * 9) % 66;
    P(c, sx + 34 + Math.sin((a + i) * 0.15) * 7 - a * 0.05, sy - 24 - a * 0.7,
      4 + a * 0.05, 3, i % 3 ? '#5c6d78' : '#8ba0ac');
  }
  if (d > 0.2) {
    P(c, sx - 10, sy + 20, 74, 2, PAL.AMBER);             // she has not moved
    P(c, sx - 10, sy + 18, 2, 6, PAL.AMBER_HOT);
    P(c, sx + 62, sy + 18, 2, 6, PAL.AMBER_HOT);
  }
  amberWash(c, d);
}


// ── CHASE — the helicopter shot, and the road moving under it ──────
//
// The first ACTION plate, and it changes what a plate is: the others cache a
// static base and keep one live layer over it, but here the camera itself is
// moving, so the road cannot be cached. Everything is fillRects — a few hundred
// a frame — because a per-pixel pass over 144×276 sixty times a second is a
// different kind of program.
function chase(scr, t, d) {
  const c = scr.ctx;
  const scroll = t * 150;                                  // the tracking shot
  ramp(c, 0, H, '#0a1218', '#131d24');
  P(c, 0, 0, 22, H, '#101c14');                            // verges
  P(c, 122, 0, 22, H, '#101c14');
  P(c, 22, 0, 100, H, '#20262b');                          // tarmac

  // lane markings, scrolling. The road is what tells you the camera is moving;
  // hold it still and the cars read as parked and vibrating.
  for (const lx of [55, 88]) {
    for (let y = -40 + (scroll % 40); y < H; y += 40) P(c, lx, y, 3, 22, '#c8cdd0');
  }
  P(c, 24, 0, 2, H, '#7d868c');
  P(c, 118, 0, 2, H, '#7d868c');
  // speed streaks — the cheapest possible motion blur, and the most legible
  for (let i = 0; i < 26; i++) {
    const y = ((i * 37 + scroll * 1.6) % (H + 40)) - 20;
    P(c, 26 + rnd(i * 3.1) * 90, y, 2, 12 + rnd(i * 5.7) * 10, '#2c343a');
  }
  // the traffic that got out of the way, on the shoulder
  for (let i = 0; i < 4; i++) {
    const y = ((i * 90 + scroll * 0.55) % (H + 60)) - 30;
    const x = i % 2 ? 26 : 106;
    P(c, x, y, 11, 20, i % 2 ? '#3d4a52' : '#4a3f38');
    P(c, x + 1, y + 3, 9, 7, '#1a2126');
    P(c, x, y + 18, 11, 2, '#8a3a34');
  }

  const lx = 72 + Math.sin(t * 1.5) * 26;                  // the one being chased
  const px = 72 + Math.sin(t * 1.5 - 0.85) * 26;           // the one chasing

  // the searchlight, locked on the lead car and always a little late
  halo(c, lx + 5, 150, 34, '#e8e0c0', 0.30);
  const car = (x, y, body, roof) => {
    P(c, x, y, 12, 22, body);
    P(c, x + 1, y + 4, 10, 8, roof);
    P(c, x + 1, y + 20, 4, 2, '#c8484a');
    P(c, x + 7, y + 20, 4, 2, '#c8484a');
    P(c, x + 1, y, 4, 2, '#ffe9b0');
    P(c, x + 7, y, 4, 2, '#ffe9b0');
  };
  car(lx, 140, '#c9ccce', '#20272c');
  car(px, 196, '#1f2a33', '#0e161c');
  // the bar on the roof — two blocks, alternating, never both
  const blue = (t * 6) % 2 < 1;
  P(c, px + 1, 202, 5, 3, blue ? '#4aa8ff' : '#123048');
  P(c, px + 6, 202, 5, 3, blue ? '#182838' : '#ff5a4a');

  if (d > 0.2) {
    // widen the light and the road is empty in both directions: a wave of two
    halo(c, 72, 150, 96, PAL.AMBER_DIM, 0.34 * d);
    P(c, 26, 120, 92, 2, PAL.AMBER);
    P(c, 26, 224, 92, 2, PAL.AMBER);
    P(c, 26, 120, 2, 106, PAL.AMBER);
    P(c, 116, 120, 2, 106, PAL.AMBER);
  }
  amberWash(c, d);
}

// ── APPROACH — a heavy on short finals, from underneath ────────────
//
// The slow one. It crosses the frame in eleven seconds and the whole effect is
// that it takes its time: a wide-body directly overhead barely seems to move,
// which is exactly why standing under an approach path is worth doing.
function approachBase(c) {
  ramp(c, 0, 214, '#1c4d78', '#7fa8c4');
  for (let i = 0; i < 5; i++) {                            // cloud shelves
    const y = 26 + i * 30, w2 = 40 + rnd(i * 3.7) * 60;
    P(c, rnd(i * 9.1) * (W - w2), y, w2, 7, '#9dbdd2');
    P(c, rnd(i * 9.1) * (W - w2), y + 6, w2, 3, '#7a9db4');
  }
  for (let x = 0; x < W; x += 3) {                         // the treeline
    const h2 = 16 + Math.sin(x * 0.33) * 6 + Math.sin(x * 0.12) * 5;
    P(c, x, 214 - h2, 3, h2 + 20, '#16301d');
  }
  P(c, 0, 234, W, H - 234, '#0f2416');
  for (let x = 6; x < W; x += 22) {                        // approach lights
    P(c, x, 244, 12, 2, '#e0e8ec');
    P(c, x + 4, 246, 4, 8, '#3b4a52');
  }
}

function approach(scr, t, d) {
  const c = scr.ctx;
  c.drawImage(base('approach', approachBase), 0, 0);

  // It comes over you and settles away toward the runway: big and low at the
  // bottom of the frame, small and far at the top. Eleven seconds, linear,
  // because an aircraft on finals does not ease.
  const u = ((t * 0.09) % 1);
  const y = H + 34 - u * (H + 90);
  const k = 1.55 - u * 1.2;                                 // it recedes
  const cx = 70 + Math.sin(t * 0.25) * 3;
  const S = (a) => Math.max(1, Math.round(a * k));

  const body = '#dfe6ea', shade2 = '#9aa9b2', dark = '#39464e';
  // wing, engines under it, then the fuselage over the top
  P(c, cx - S(46), y - S(4), S(92), S(9), body);
  P(c, cx - S(46), y + S(4), S(92), S(3), shade2);
  for (const ex of [-30, -16, 16, 30]) {
    P(c, cx + S(ex) - S(5), y + S(5), S(10), S(11), dark);
    P(c, cx + S(ex) - S(4), y + S(6), S(8), S(3), '#7f8f99');
  }
  P(c, cx - S(8), y - S(34), S(16), S(64), body);
  P(c, cx - S(8), y + S(14), S(16), S(16), shade2);
  P(c, cx - S(3), y - S(38), S(6), S(6), body);            // nose
  P(c, cx - S(20), y + S(30), S(40), S(7), body);          // tailplane
  P(c, cx - S(2), y + S(28), S(4), S(14), shade2);         // fin, seen end-on
  if (k > 0.9) {                                           // gear, while it is close
    P(c, cx - S(12), y - S(22), S(4), S(6), dark);
    P(c, cx + S(8), y - S(22), S(4), S(6), dark);
    P(c, cx - S(2), y + S(6), S(4), S(6), dark);
  }
  // navigation lights: red to port, green to starboard, and one white strobe
  P(c, cx - S(47), y - S(3), S(4), S(4), '#ff4a3a');
  P(c, cx + S(43), y - S(3), S(4), S(4), '#3aff7a');
  if ((t * 1.4) % 1 < 0.12) {
    P(c, cx - S(47), y - S(3), S(5), S(5), '#ffffff');
    P(c, cx + S(43), y - S(3), S(5), S(5), '#ffffff');
  }
  if (k > 1.15) {                                          // wingtip vapour
    for (let i = 0; i < 8; i++) {
      const a = (t * 20 + i * 9) % 40;
      P(c, cx - S(48) - a * 0.3, y + S(2) + a, 3, 2, '#c9d8e0');
      P(c, cx + S(44) + a * 0.3, y + S(2) + a, 3, 2, '#c9d8e0');
    }
  }
  if (d > 0.2) {
    halo(c, cx, y, Math.round(70 * k), PAL.AMBER_DIM, 0.3 * d);
    P(c, 8, 250, 128, 2, PAL.AMBER);
    P(c, 8, 246, 2, 10, PAL.AMBER_HOT);
    P(c, 134, 246, 2, 10, PAL.AMBER_HOT);
  }
  amberWash(c, d);
}

// ── CABLESHIP — working a repair, at night, on the Gulf ────────────
//
// The stern shot: a cable running off the sheave into black water, deck lights
// burning, the swell going through under it. Decoded, the seabed is drawn —
// the cable as a straight amber line with the break marked — because the point
// of that bulletin is that the sentence never says where it went.
// COMPOSED FOR THE TOP HALF. The copy sits over the bottom 45% of every post,
// so a plate whose subject is centred puts its subject under the lower third
// and reads as an empty sky with a caption. Horizon high, ship in the upper
// third, and only the cable is allowed to run down behind the words.
function cableshipBase(c) {
  // THE REFERENCE BUILD for the light rules above. Same subject as before, but
  // the frame now runs black → paper: a moonlit band on the horizon, the ship
  // rim-lit against it, and a pure-black foreground swell in front of her.
  sky(c, 0, 62, 44, '#000509', '#5f7f86', '#0a1418');
  // the moon, low and small, and the only white in the sky
  halo(c, 104, 30, 26, '#dfeef2', 0.45);
  P(c, 101, 27, 7, 7, PAPER);
  for (let i = 0; i < 30; i++) {                            // stars, hashed
    const sx = rnd(i * 2.7) * W, sy = rnd(i * 5.3) * 40;
    if (Math.hypot(sx - 104, sy - 30) < 34) continue;       // not through the halo
    P(c, sx, sy, 1, 1, i % 4 ? '#3d5a60' : '#9fc0c6');
  }
  P(c, 0, 58, W, 4, '#01080b');                             // the far shore
  for (let i = 0; i < 16; i++) P(c, rnd(i * 7.7) * W, 56, 2, 2, '#e8d8a8');
  ramp(c, 62, H, '#061014', '#000305');                     // the water
  // the moon path on the water: broken, bright, and the only route the eye has
  for (let y = 64; y < H; y += 2) {
    const spread = 3 + (y - 64) * 0.26;
    for (let x = 104 - spread; x < 104 + spread; x += 2) {
      if (rnd(x * 3.1 + y * 1.7) < 0.30) {
        P(c, x, y, 2, 1, mix('#7d9aa2', '#0a1418', (y - 64) / (H - 64)));
      }
    }
  }
}

function cableship(scr, t, d) {
  const c = scr.ctx;
  c.drawImage(base('cableship', cableshipBase), 0, 0);

  // the swell, live, in 2px CELLS — sampling at even pixels only reaches four
  // of bayer's sixteen values and the sea collapses into blobs
  for (let y = 64; y < H; y += 2) {
    const k = (y - 64) / (H - 64);
    for (let x = 0; x < W; x += 2) {
      const wave = Math.sin(x * 0.09 + t * 1.1 + y * 0.16) * 0.06;
      if (bayer(x >> 1, y >> 1) < 0.08 + k * 0.10 + wave) P(c, x, y, 2, 1, '#16333c');
    }
  }

  const hull = 74 + Math.sin(t * 0.7) * 2;                  // she rides the swell
  // The ship, stern-on, LIT FROM THE MOON SIDE. Dark body, one bright edge:
  // that edge is what makes her an object rather than a hole in the water.
  P(c, 32, hull, 80, 22, '#0b1114');                        // hull, near black
  P(c, 32, hull + 20, 80, 3, COAL);
  rim(c, 32, hull, 80, 22, 1, '#8fa9b0');
  P(c, 38, hull - 20, 40, 20, '#111a1d');                   // house
  rim(c, 38, hull - 20, 40, 20, 1, '#7f979d');
  for (let i = 0; i < 5; i++) P(c, 42 + i * 7, hull - 15, 4, 5, '#ffe6ac');   // windows
  // the waterline and a broken reflection, so she floats
  for (let x = 32; x < 112; x += 2) {
    if (bayer(x >> 1, (hull + 24) >> 1) < 0.42) P(c, x, hull + 23, 2, 1, '#3f5d66');
  }
  for (let i = 0; i < 22; i++) {
    const rx = 34 + rnd(i * 2.3) * 74, ry = hull + 26 + rnd(i * 4.1) * 14;
    if (Math.sin(t * 2 + i) > -0.2) P(c, rx, ry, 3, 1, '#2f545c');
  }

  P(c, 82, hull - 32, 4, 34, '#0d1417');                    // mast
  P(c, 80, hull - 36, 8, 4, '#1b2529');
  P(c, 92, hull - 24, 4, 26, '#131c20');                    // the A-frame
  P(c, 110, hull - 24, 4, 26, '#131c20');
  P(c, 92, hull - 26, 22, 4, '#222e33');
  const sheave = 103;
  halo(c, sheave, hull - 6, 24, '#ffeec0', 0.42);           // the working light
  P(c, sheave - 4, hull - 22, 8, 8, '#4c5a5f');
  P(c, sheave - 4, hull - 22, 8, 1, PAPER);

  // the cable, catenary-sagging into the dark
  for (let y = hull - 14; y < H; y += 2) {
    const sag = Math.sin(y * 0.05 + t * 0.9) * 2;
    P(c, sheave + sag + (y - hull) * 0.06, y, 2, 2, y < hull + 40 ? '#9fb0b6' : '#4a575c');
  }

  const blink = (t * 0.8) % 1 < 0.16;                       // the mark buoy
  P(c, 26, 130, 4, 6, '#0a1114');
  P(c, 26, 126, 4, 4, blink ? '#ffd27a' : '#3b3527');
  if (blink) halo(c, 28, 128, 12, '#ffd27a', 0.34);

  // BLACK IN FRONT. A near swell across the bottom of the frame with no
  // detail in it at all — the cheapest depth cue there is, and the one every
  // plate in this file was missing.
  fg(c, 'bottom', 44, 3.7, 0.7);
  for (let x = 0; x < W; x += 2) {                          // one lit crest on it
    const h2 = 44 * (0.45 + rnd(x * 0.37 + 3.7) * 0.7);
    if (rnd(x * 5.5) < 0.25) P(c, x, H - h2 - 1, 2, 1, '#2b4a52');
  }

  if (d > 0.2) {
    P(c, 0, 150, W, 2, PAL.AMBER_DIM);                      // the seabed
    P(c, 6, 146, 60, 2, PAL.AMBER);
    P(c, 78, 146, 60, 2, PAL.AMBER);
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    P(c, 66, 142 + pulse * 2, 12, 10, PAL.AMBER_HOT);       // where it stopped
  }
  amberWash(c, d);
}

// ── SWARM — a formation crossing the city, after midnight ──────────
//
// The action plate for anything about networks. Twenty-two machines holding a
// lattice and drifting across the frame; decoded, every one of them is joined
// to a single van on the ground, because a swarm is one operator with good
// spacing.
// Same rule as cableship: the roofline sits at 120 and the street at 138, so
// the whole scene — sky, city, van — lands above the lower third.
function swarmBase(c) {
  // Same light rules as cableship: a graded sky with a hot band low down, the
  // city as a PURE BLACK silhouette against it, and the machines lit from
  // above so they read as objects rather than as icons.
  sky(c, 0, 122, 96, '#01040a', '#3d5f74', '#0a1218');
  for (let i = 0; i < 44; i++) {
    const sx = rnd(i * 3.1) * W, sy = rnd(i * 6.9) * 84;
    P(c, sx, sy, 1, 1, i % 5 ? '#26414e' : '#a8c4d0');
  }
  // the city: black, no detail, only windows punched out of it
  for (let i = 0; i < 16; i++) {
    const x = i * 10 - 4, h2 = 16 + rnd(i * 4.3) * 30;
    P(c, x, 122 - h2, 11, h2 + 16, COAL);
    for (let wy = 122 - h2 + 4; wy < 136; wy += 6) {
      for (let wx = x + 2; wx < x + 9; wx += 4) {
        if (rnd(wx * wy) < 0.38) P(c, wx, wy, 2, 3, rnd(wx + wy) < 0.25 ? '#ffe6ac' : '#8fa7a0');
      }
    }
  }
  P(c, 0, 138, W, H - 138, '#02060a');                      // the street
  for (let x = 8; x < W; x += 26) {
    P(c, x, 142, 2, 12, '#0a1216');
    halo(c, x + 1, 141, 13, '#ffe6ac', 0.30);               // sodium, warm, dim
    P(c, x - 6, 154, 14, 2, '#2b2a1e');                     // the pool it throws
  }
}

function swarm(scr, t, d) {
  const c = scr.ctx;
  c.drawImage(base('swarm', swarmBase), 0, 0);

  const N = 22, VAN = { x: 104, y: 150 };
  const drift = (t * 9) % (W + 60) - 30;
  for (let i = 0; i < N; i++) {
    // a lattice, not a hash: they are holding station, which is the whole tell
    const col = i % 6, row = (i / 6) | 0;
    const x = drift + col * 17 + row * 6;
    const y = 26 + row * 20 + Math.sin(t * 1.3 + i) * 2;
    if (x < -8 || x > W + 8) continue;
    P(c, x - 5, y, 11, 2, '#0d1418');                       // the arms, in shadow
    P(c, x - 5, y, 11, 1, BONE);                            // lit along the top
    P(c, x - 1, y - 2, 3, 5, '#1b2429');
    P(c, x - 1, y - 2, 3, 1, PAPER);
    const on = ((t * 2.2 + i * 0.31) % 1) < 0.5;
    P(c, x - 6, y - 1, 2, 2, on ? '#ff5a4a' : '#2a1512');
    P(c, x + 5, y - 1, 2, 2, on ? '#3aff7a' : '#132a1a');
    if (d > 0.25) {
      c.globalAlpha = 0.45;
      c.strokeStyle = PAL.AMBER_DIM;
      c.beginPath(); c.moveTo(x, y + 2); c.lineTo(VAN.x, VAN.y); c.stroke();
      c.globalAlpha = 1;
    }
  }

  if (d > 0.25) {
    P(c, VAN.x - 12, VAN.y - 8, 24, 12, '#141a1e');         // the van
    rim(c, VAN.x - 12, VAN.y - 8, 24, 12, -1, PAL.AMBER_HOT);
    P(c, VAN.x - 12, VAN.y + 3, 24, 3, COAL);
    halo(c, VAN.x, VAN.y - 2, 20, PAL.AMBER, 0.42 * d);
    P(c, VAN.x - 2, VAN.y - 20, 3, 12, PAL.AMBER_DIM);
    P(c, VAN.x - 6, VAN.y - 22, 11, 3, PAL.AMBER_HOT);
  }

  // black in front: a roofline across the bottom of the frame, no detail
  fg(c, 'bottom', 34, 8.1, 0.5);
  amberWash(c, d);
}

// ── SWITCHYARD — where the bill is made, at night ──────────────────
//
// Busbars, insulator stacks, a lattice tower and a transformer that hums a
// little brighter every few seconds. Decoded, the load meter grows a second
// bar beside it: what was drawn, and what was billed.
function switchyardBase(c) {
  // a sodium haze low on the horizon: the yard lights the sky, not the sky the
  // yard, which is what a substation at night actually looks like
  sky(c, 0, 104, 100, '#01050a', '#3f3c30', '#0a0f0e');
  for (let i = 0; i < 34; i++) P(c, rnd(i * 4.9) * W, rnd(i * 8.1) * 80, 1, 1, '#334f5c');
  P(c, 0, 104, W, H - 104, '#05090a');                      // the yard
  for (let x = 0; x < W; x += 4) P(c, x, 104, 4, 1, '#141c1b');
  // the lattice tower, stage left, cropped by the frame
  // the tower is BLACK against the haze, with one lit edge
  for (let y = 10; y < 132; y += 8) {
    P(c, 12 + (y - 10) * 0.055, y, 3, 8, COAL);
    P(c, 40 - (y - 10) * 0.055, y, 3, 8, COAL);
    P(c, 12 + (y - 10) * 0.055, y, 1, 8, '#5d6b62');
    P(c, 14, y + 4, 26, 1, '#0c1210');
  }
  P(c, 6, 10, 44, 4, COAL);
  P(c, 6, 10, 44, 1, '#6b7a71');
  // three insulator stacks — discs, because that is what makes them read
  for (const bx of [70, 96, 122]) {
    P(c, bx - 2, 62, 5, 64, '#0e1513');
    for (let y = 62; y < 122; y += 7) {
      P(c, bx - 7, y, 15, 3, '#2b3833');                    // the disc, in shadow
      P(c, bx - 7, y, 15, 1, '#93a49b');                    // and its lit lip
    }
  }
  // the transformer block, black, rim-lit from the yard light
  P(c, 58, 126, 52, 26, COAL);
  rim(c, 58, 126, 52, 26, -1, '#7e8e85');
  for (let i = 0; i < 9; i++) P(c, 60 + i * 6, 130, 3, 18, '#0a100e');
  P(c, 56, 152, 56, 4, COAL);
}

function switchyard(scr, t, d) {
  const c = scr.ctx;
  c.drawImage(base('switchyard', switchyardBase), 0, 0);

  // the busbars sag between the stacks and breathe with the load
  const load = 0.5 + 0.5 * Math.sin(t * 0.6);
  for (const [x0, x1] of [[16, 70], [70, 96], [96, 122]]) {
    for (let x = x0; x < x1; x++) {
      const k = (x - x0) / Math.max(1, x1 - x0);
      const sag = Math.sin(k * Math.PI) * 7;
      P(c, x, 58 + sag, 1, 2, '#aab9b0');   // the busbar catches the light
    }
  }
  // corona: a few cells of light on the stack tops, never the same two frames
  for (let i = 0; i < 6; i++) {
    const bx = [70, 96, 122][i % 3];
    if (((t * 7 + i * 2.3) % 5) > 1.1) continue;
    P(c, bx - 4 + (i % 2) * 6, 56 - (i % 3), 2, 2, '#bfe8ff');
  }
  halo(c, 84, 128, 34, '#ffe6ac', 0.26 + load * 0.12);      // the yard light
  fg(c, 'bottom', 26, 5.3, 0.4);                            // black in front

  // the load meter, top right, filling — the number the bill is made from
  const gx = 100, gy = 14, gw = 36, gh = 12;
  P(c, gx - 1, gy - 1, gw + 2, gh + 2, '#0d1714');
  P(c, gx, gy, gw, gh, '#101d18');
  P(c, gx, gy, Math.round(gw * (0.55 + load * 0.35)), gh, mix('#4fd18f', PAL.AMBER, d));
  for (let i = 1; i < 4; i++) P(c, gx + i * 9, gy, 1, gh, '#0b1512');

  if (d > 0.25) {
    // drawn against billed: same yard, two bars, one of them new
    const bx = 8, by = 14;
    P(c, bx - 1, by - 1, 38, gh + 2, '#1a1408');
    P(c, bx, by, 36, gh, '#20180a');
    P(c, bx, by, 36, gh, PAL.AMBER);                        // billed: all of it
    P(c, bx, by + gh + 4, 8, 4, PAL.AMBER_HOT);             // drawn: a fraction
    halo(c, bx + 18, by + 6, 20, PAL.AMBER_DIM, 0.30 * d);
  }
  amberWash(c, d);
}

const PLATES = { esplanadi, kamppi, station, harbour, gulf, suomenlinna, katajanokka,
                 cableship, swarm, switchyard,
                 beach, moon, winterhall, packice, chase, approach };
export const PLATE_KEYS = Object.keys(PLATES);

export function drawPlate(key, scr, t, decode) {
  (PLATES[key] || esplanadi)(scr, t, decode);
  scr.scanlines(PAL.INK, 3);
}
