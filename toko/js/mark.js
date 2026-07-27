// TOKO MIDORI — the marks.
//
// Toko never shows a face, so the mask IS the face: a 24×24 pixel grid, one
// green, two black slits, a vermilion nick between the brows and a crack that
// was never repaired. It is drawn as string art — the same idiom hyperdagger
// builds its voxel enemies from — so the logo is legible as source code,
// editable in a text editor, and impossible to lose to a missing binary.
//
// Three deliverables come out of one grid: the canvas mark (for screens and
// games), the SVG (for anywhere a real logo file is wanted) and the 16×16
// reduction (favicons, credits lines, anywhere the 24 would turn to mud).

import { rng, shade, textRows, textWidth, GLYPH_H } from './pixel.js';
import { TOKO, REGISTER, VOICE } from './palette.js';

// ── the mask, 24×24 ──────────────────────────────────────────────────────
//   .  air      #  shell / brow      +  face      %  crown light
//   o  slit     *  the nick
//
// The brows are the shell colour, not the light: dark brow over dark slit
// over dark mouth is what makes a mask read as a mask rather than as a face
// with features drawn on it. The one light is a streak angled down the upper
// left — lacquer catching a room. It was a band across the whole crown first
// and read as a headband; light has a direction or it is a hat.
export const MASK24 = [
  '........................',
  '.....##############.....',
  '...###+%%%%+++++++###...',
  '..##+%%%%%++++++++++##..',
  '..#+%%%%+++++++++++++#..',
  '..#+######++++######+#..',
  '..#++++++++++++++++++#..',
  '..#+oooooo++++oooooo+#..',
  '..#+oooooo++++oooooo+#..',
  '..#++oooo++++++oooo++#..',
  '..#++++++++++++++++++#..',
  '..#++++++++**++++++++#..',
  '..#++++++++++++++++++#..',
  '..#++++oooooooooo++++#..',
  '..#++++++++++++++++++#..',
  '..#++++++++++++++++++#..',
  '...#++++++++++++++++#...',
  '...##++++++++++++++##...',
  '....##++++++++++++##....',
  '.....##++++++++++##.....',
  '......##++++++++##......',
  '.......##++++++##.......',
  '........########........',
  '........................',
];

// ── the mask, pressed to 16×16 ───────────────────────────────────────────
// Not a scaled-down 24. Redrawn, because a reduction that is merely resampled
// stops being a mask and becomes a smudge. This is the favicon.
// The crown light and the crack are both dropped here — at this size they
// only silt up the grid. The brow survives, because without it the reduction
// stops reading as a mask and starts reading as a smiley.
export const MASK16 = [
  '................',
  '...##########...',
  '..#++++++++++#..',
  '..#+##++++##+#..',
  '..#+oo++++oo+#..',
  '..#+oo++++oo+#..',
  '..#++++++++++#..',
  '..#++++**++++#..',
  '..#++++++++++#..',
  '..#++oooooo++#..',
  '..#++++++++++#..',
  '...#++++++++#...',
  '....#++++++#....',
  '.....#++++#.....',
  '......####......',
  '................',
];

export const MASK_W = 24, MASK_H = 24;

// the crack: Toko's mask has been broken and not repaired. Hand-plotted so it
// is the same crack every time — a signature, not a random fracture. It runs
// OFF centre; a fracture down the midline reads as a manufacturing seam, and
// a seam is the opposite of what this is saying.
const CRACK = [
  [12, 2], [11, 3], [11, 4], [12, 5], [11, 6], [11, 7], [12, 8], [11, 9],
  [11, 10], [10, 11], [11, 12], [10, 13], [10, 14], [11, 15], [10, 16],
  [10, 17], [9, 18], [10, 19], [9, 20],
];

function paletteFor(reg) {
  const R = typeof reg === 'string' ? (REGISTER[reg] || REGISTER.LIVE) : (reg || REGISTER.LIVE);
  return {
    '#': R.shell, '+': R.face, '%': R.lux, 'o': R.eye, '*': R.mark,
    _reg: R,
  };
}

// ── canvas ───────────────────────────────────────────────────────────────

// Draw the mask at (x,y). `scale` is art-pixels per grid cell, so scale 1 is
// a 24×24 mark and scale 3 is 72×72 with no resampling anywhere.
export function drawMask(g, x, y, opts = {}) {
  const { scale = 1, reg = 'LIVE', small = false, crack = true } = opts;
  const map = paletteFor(reg);
  const rows = small ? MASK16 : MASK24;
  g.art(rows, x, y, map, scale);
  if (crack && !small) {
    const c = shade(map._reg.face, 0.45);
    for (const [cx, cy] of CRACK) g.p(x + cx * scale, y + cy * scale, scale, scale, c);
  }
  return { w: rows[0].length * scale, h: rows.length * scale };
}

// ── the seal ─────────────────────────────────────────────────────────────
// A hanko: red field, the mask knocked out of it. The border is chipped —
// a stamp that has been used, on a press that was never serviced.
export const SEAL = 22;

export function drawSeal(g, x, y, opts = {}) {
  const { scale = 1, color = TOKO.VERMILION, knock = TOKO.VOID, seed = 7, chips = true } = opts;
  const P = (gx, gy, w = 1, h = 1, c = color) => g.p(x + gx * scale, y + gy * scale, w * scale, h * scale, c);

  P(0, 0, SEAL, SEAL, color);                              // the field
  // the mask, knocked out, 16×16 centred in the 22 field (3px margin)
  const map = { '#': knock, '+': knock, '%': knock, 'o': color, '*': color };
  g.art(MASK16, x + 3 * scale, y + 3 * scale, map, scale);

  if (chips) {
    // the same chips every impression — the press is broken in one way
    const r = rng(seed);
    for (let i = 0; i < 9; i++) {
      const edge = Math.floor(r() * 4);
      const t = 1 + Math.floor(r() * (SEAL - 2));
      const d = 1 + Math.floor(r() * 2);
      if (edge === 0) P(t, 0, d, 1, knock);
      else if (edge === 1) P(t, SEAL - 1, d, 1, knock);
      else if (edge === 2) P(0, t, 1, d, knock);
      else P(SEAL - 1, t, 1, d, knock);
    }
    P(0, 0, 1, 1, knock); P(SEAL - 1, SEAL - 1, 1, 1, knock);  // two corners gone
  }
  return { w: SEAL * scale, h: SEAL * scale };
}

// ── the wordmark ─────────────────────────────────────────────────────────
// Hand-cut 5×7. Letterspaced hard — it is a name stencilled onto a crate,
// not a logotype drawn to be liked.
export function drawWordmark(g, x, y, opts = {}) {
  const { scale = 1, color = TOKO.BONE, text = VOICE.name, track = 2 } = opts;
  const w = g.text(text, x, y, color, scale, track);
  return { w, h: GLYPH_H * scale };
}

// name over rule over tagline — the block that goes on a title screen
export function drawStack(g, x, y, opts = {}) {
  const { scale = 1, color = TOKO.BONE, accent = TOKO.MIDORI, tag = VOICE.cry } = opts;
  const a = drawWordmark(g, x, y, { scale, color, track: 2 });
  g.p(x, y + (GLYPH_H + 2) * scale, a.w, scale, accent);
  const b = drawWordmark(g, x, y + (GLYPH_H + 5) * scale, { scale, color: accent, text: tag, track: 1 });
  return { w: Math.max(a.w, b.w), h: (GLYPH_H * 2 + 5) * scale };
}

// ── the lockup ───────────────────────────────────────────────────────────
// How Toko sits beside a game: the mask, a hairline, the name, and the game
// underneath it in the GAME's own colour. Toko never takes the game's accent
// and the game never takes the green.
export function drawLockup(g, x, y, opts = {}) {
  const { scale = 1, game = '', accent = TOKO.PHOSPHOR, reg = 'LIVE' } = opts;
  const m = drawMask(g, x, y, { scale, reg });
  const tx = x + m.w + 5 * scale;
  drawWordmark(g, tx, y + 4 * scale, { scale, color: TOKO.BONE, track: 2 });
  g.p(tx, y + 13 * scale, textWidth(VOICE.name, scale, 2), scale, TOKO.LINE);
  if (game) drawWordmark(g, tx, y + 16 * scale, { scale, color: accent, text: game, track: 1 });
  return { w: m.w + 5 * scale + textWidth(VOICE.name, scale, 2), h: m.h };
}

// ── SVG ──────────────────────────────────────────────────────────────────
// The same grids, emitted as rects merged along each row. This is the file
// you hand someone who asks for "the logo" — and it is generated from the
// identical source the screen draws, so the two can never drift apart.
function svgBody(rows, map, px, ox = 0, oy = 0) {
  let out = '';
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      const col = map[row[c]];
      if (!col) { c++; continue; }
      let n = 1;
      while (c + n < row.length && map[row[c + n]] === col) n++;
      out += `<rect x="${(ox + c) * px}" y="${(oy + r) * px}" width="${n * px}" height="${px}" fill="${col}"/>`;
      c += n;
    }
  }
  return out;
}

function wrap(w, h, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" `
    + `shape-rendering="crispEdges" role="img" aria-label="${title}">`
    + `<title>${title}</title>${body}</svg>`;
}

export function svgMask({ reg = 'LIVE', px = 1, small = false, bg = null, crack = true } = {}) {
  const map = paletteFor(reg);
  const rows = small ? MASK16 : MASK24;
  const n = rows.length;
  let body = bg ? `<rect width="${n * px}" height="${n * px}" fill="${bg}"/>` : '';
  body += svgBody(rows, map, px);
  if (crack && !small) {
    const c = shade(map._reg.face, 0.45);
    for (const [cx, cy] of CRACK) body += `<rect x="${cx * px}" y="${cy * px}" width="${px}" height="${px}" fill="${c}"/>`;
  }
  return wrap(n * px, n * px, body, 'Toko Midori mask');
}

export function svgSeal({ px = 1, color = TOKO.VERMILION, bg = null } = {}) {
  // rasterise the seal once through the pen, then read the grid back out —
  // cheaper than duplicating the chip logic in two languages
  const grid = Array.from({ length: SEAL }, () => new Array(SEAL).fill('.'));
  const fake = {
    p(gx, gy, w, h, c) {
      for (let yy = gy; yy < gy + h; yy++) for (let xx = gx; xx < gx + w; xx++) {
        if (grid[yy] && grid[yy][xx] !== undefined) grid[yy][xx] = (c === color ? '#' : '.');
      }
    },
    art(rows, ax, ay, map, s) {
      for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
        const col = map[rows[r][c]];
        if (col) this.p(ax + c * s, ay + r * s, s, s, col);
      }
    },
  };
  drawSeal(fake, 0, 0, { scale: 1, color, knock: 'KNOCK' });
  const rows = grid.map(r => r.join(''));
  let body = bg ? `<rect width="${SEAL * px}" height="${SEAL * px}" fill="${bg}"/>` : '';
  body += svgBody(rows, { '#': color }, px);
  return wrap(SEAL * px, SEAL * px, body, 'Toko Midori seal');
}

export function svgWordmark({ text = VOICE.name, color = TOKO.BONE, px = 1, track = 2, bg = null } = {}) {
  const rows = textRows(text, track);
  const w = rows[0].length, h = rows.length;
  let body = bg ? `<rect width="${w * px}" height="${h * px}" fill="${bg}"/>` : '';
  body += svgBody(rows, { '#': color }, px);
  return wrap(w * px, h * px, body, `Toko Midori wordmark: ${text}`);
}

// the favicon, as a data URI — one line to paste into any <link rel="icon">
export function faviconHref() {
  return 'data:image/svg+xml,' + encodeURIComponent(
    svgMask({ reg: 'LIVE', small: true, px: 1, bg: TOKO.VOID }));
}
