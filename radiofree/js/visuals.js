// Radio Free Helsinki — the picture half of a post.
// Portrait panels. Two kinds:
//   GRAPHICS — charts / diagrams that DECODE mutates
//   B-ROLL   — low-poly Helsinki news footage
// Face shots are handled in codec.js (large masked Toko), not here.

import { PAL } from './palette.js?v=43';
import { mix, shade, bayer } from './screen.js?v=43';

export const PANEL_W = 128, PANEL_H = 152;
const W = PANEL_W, H = PANEL_H;

// A hash, for scatter. (i * 41) % 100 looks like scatter and draws a straight
// diagonal — that trap has been paid for once already, on the poly plates.
const rnd = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

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


// THE PANELS ARE GONE. There were fifteen of them — the truncated bar chart
// that re-based to zero, the valuation tower that went hollow, the auditorium
// that emptied to four people — and every one existed to MUTATE UNDER DECODE.
// With the second layer removed they were fifteen charts nobody could read a
// reason for, so they went with it. The sign-off test card above is the only
// panel left, and `drawPlate` in plates.js draws everything else.

const PANELS = { signoff };
export const PANEL_KEYS = Object.keys(PANELS);
export const BROLL_KEYS = [
  'esplanadi', 'kamppi', 'harbour', 'gulf',
  'cathedral', 'katu', 'mannerheim', 'station',
  'suomenlinna', 'katajanokka',
  'beach', 'moon', 'winterhall', 'packice', 'chase', 'approach',
  'cableship', 'swarm', 'switchyard', 'studiofloor', 'enginewire', 'boardroom',
];

export function drawVisual(key, scr, t, decode) {
  (PANELS[key] || signoff)(scr, t, decode);
  scr.scanlines(PAL.INK, 3);
}
