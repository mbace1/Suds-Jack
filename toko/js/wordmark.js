// TOKO MIDORI GAMES — the logotype, drawn.
//
// The logotype is ARTWORK, not type. It only ever says three words, so those
// three words are drawn here as outlines rather than set in a font — which is
// how a logotype is supposed to work anyway, and it keeps the kit's promise:
// no font file to license, to load, or to fail to load.
//
// The face it is drawn after is a condensed squarish grotesque: flat-sided
// bowls, square counters, a large x-height, tight fitting, one stem weight.
//
// Each glyph is a set of SOLIDS unioned together, and a set of HOLES punched
// out of them. That split matters: the first cut of this file filled every
// glyph with `evenodd`, and where two solids overlapped — a d's stem crossing
// its bowl, an s's bars meeting its spines — the overlap CANCELLED and left a
// white notch through the letter. Solids union (nonzero); holes are removed
// afterwards, on an offscreen, so a counter is transparent rather than
// painted in the background colour.
//
// Coordinates are in a 100-unit cap height, baseline at y = 100.

export const M = {
  cap: 100,
  x: 74,             // x-height — this face runs it high
  stem: 20,          // one weight throughout
  bowl: 7,           // corner radius on a bowl. Small: the sides are FLAT
  track: 6,          // between glyphs. Tight.
  space: 24,         // a word space
};

const XT = M.cap - M.x;                       // 26 — top of a lowercase letter
const R = (x, y, w, h) => ({ r: [x, y, w, h] });
const P = (...pts) => ({ p: pts });
const RR = (x, y, w, h, r = M.bowl) => ({ rr: [x, y, w, h, r] });

// ── the glyphs ───────────────────────────────────────────────────────────
// Only the twelve letters "Toko Midori Games" needs. Deliberately not an
// alphabet: an alphabet would be a typeface, and a typeface is not ours to
// redraw. A logotype is a drawing of three particular words.
export const GLYPHS = {
  T: { w: 60, s: [R(0, 0, 60, M.stem), R(20, 0, M.stem, M.cap)] },

  // splayed M — the outer stems lean, which is this face's one bit of drama
  M: {
    w: 84,
    s: [
      P([0, M.cap], [3, 0], [23, 0], [22, M.cap]),
      P([84, M.cap], [81, 0], [61, 0], [62, M.cap]),
      P([19, 0], [31, 0], [42, 52], [53, 0], [65, 0], [48, 74], [36, 74]),
    ],
  },

  // a C with a spur closing the bottom right — the clipped corner of the face
  G: {
    w: 64,
    s: [RR(0, 0, 64, M.cap, 8), R(28, 50, 36, 18), R(44, 50, M.stem, 50)],
    h: [RR(M.stem, M.stem, 24, 60, 3), R(44, 0, 24, 50)],
  },

  o: { w: 56, s: [RR(0, XT, 56, M.x)], h: [RR(M.stem, XT + M.stem, 16, 34, 2)] },

  k: {
    w: 54,
    s: [
      R(0, 0, M.stem, M.cap),
      P([16, 74], [40, XT], [54, XT], [26, 70]),          // the arm
      P([16, 58], [30, 54], [54, M.cap], [38, M.cap]),    // the leg
    ],
  },

  i: { w: 20, s: [R(0, XT, M.stem, M.x), R(0, 0, M.stem, 16)] },   // square dot

  d: {
    w: 56,
    s: [RR(0, XT, 56, M.x), R(36, 0, M.stem, M.cap)],
    h: [RR(M.stem, XT + M.stem, 16, 34, 2)],
  },

  r: { w: 38, s: [R(0, XT, M.stem, M.x), R(M.stem, XT, 18, M.stem), R(30, XT, 8, 22)] },

  a: {
    w: 54,
    s: [
      R(0, XT, 54, M.stem),                    // top bar
      R(34, XT, M.stem, M.x),                  // right stem, full height
      R(0, 56, M.stem, 44),                    // left stem, lower half only
      R(0, M.cap - M.stem, 54, M.stem),        // bottom bar
    ],
  },

  m: {
    w: 86,
    s: [R(0, XT, M.stem, M.x), R(0, XT, 86, M.stem),
        R(33, XT, M.stem, M.x), R(66, XT, M.stem, M.x)],
  },

  e: {
    w: 54,
    s: [RR(0, XT, 54, M.x), R(0, 50, 54, 16)],
    // the counter above the bar, and the aperture that opens the mouth —
    // without that second hole it is a theta, not an e
    h: [RR(M.stem, XT + M.stem, 14, 12, 2), R(34, 66, 20, 14)],
  },

  s: {
    w: 52,
    s: [
      R(0, XT, 52, M.stem),                    // top bar
      R(0, XT, M.stem, 32),                    // upper left spine
      R(0, 50, 52, M.stem),                    // middle bar
      R(32, 50, M.stem, 30),                   // lower right spine
      R(0, M.cap - M.stem, 52, M.stem),        // bottom bar
    ],
  },
};

// ── paths ────────────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y); ctx.quadraticCurveTo(x + w, y, x + w, y + k);
  ctx.lineTo(x + w, y + h - k); ctx.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  ctx.lineTo(x + k, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - k);
  ctx.lineTo(x, y + k); ctx.quadraticCurveTo(x, y, x + k, y);
  ctx.closePath();
}

function shape(ctx, sh) {
  if (sh.r) { ctx.rect(...sh.r); return; }
  if (sh.rr) { roundRect(ctx, ...sh.rr); return; }
  if (sh.p) { sh.p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }
}

export function widthOf(text) {
  let w = 0;
  for (const ch of text) {
    if (ch === ' ') { w += M.space; continue; }
    const g = GLYPHS[ch];
    if (g) w += g.w + M.track;
  }
  return Math.max(0, w - M.track);
}

// ── drawing ──────────────────────────────────────────────────────────────
// Rendered on an offscreen so the holes can be punched with destination-out.
// Done straight onto the target, a counter would erase the background rather
// than the letter.
const _cache = new Map();

export function drawWord(ctx, text, x, y, size, color = '#000') {
  const w = widthOf(text), k = size / M.cap;
  if (!text || w <= 0) return 0;
  const key = `${text}|${size}|${color}`;
  let cv = _cache.get(key);
  if (!cv) {
    const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
    cv = document.createElement('canvas');
    cv.width = Math.ceil(w * k * dpr) + 2;
    cv.height = Math.ceil(M.cap * k * dpr) + 2;
    const c = cv.getContext('2d');
    c.scale(dpr * k, dpr * k);
    c.fillStyle = color;
    let cx = 0;
    for (const ch of text) {
      if (ch === ' ') { cx += M.space; continue; }
      const g = GLYPHS[ch];
      if (!g) continue;
      c.save(); c.translate(cx, 0);
      c.beginPath();
      for (const sh of g.s) shape(c, sh);
      c.fill();                                    // nonzero: solids UNION
      if (g.h) {
        c.save();
        c.globalCompositeOperation = 'destination-out';
        c.beginPath();
        for (const sh of g.h) shape(c, sh);
        c.fill();
        c.restore();
      }
      c.restore();
      cx += g.w + M.track;
    }
    if (_cache.size > 40) _cache.clear();
    _cache.set(key, cv);
  }
  const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
  ctx.drawImage(cv, x, y - size, cv.width / dpr, cv.height / dpr);
  return w * k;
}

// ── SVG ──────────────────────────────────────────────────────────────────
// Holes go through a mask rather than a fill rule, because the solids overlap
// and no fill rule can both union them and subtract the counters.
function svgShape(sh) {
  if (sh.r) { const [x, y, w, h] = sh.r; return `M${x} ${y}H${x + w}V${y + h}H${x}Z`; }
  if (sh.p) return 'M' + sh.p.map(([x, y]) => `${x} ${y}`).join('L') + 'Z';
  if (sh.rr) {
    const [x, y, w, h, r] = sh.rr;
    const k = Math.max(0, Math.min(r, w / 2, h / 2));
    return `M${x + k} ${y}H${x + w - k}Q${x + w} ${y} ${x + w} ${y + k}`
      + `V${y + h - k}Q${x + w} ${y + h} ${x + w - k} ${y + h}`
      + `H${x + k}Q${x} ${y + h} ${x} ${y + h - k}V${y + k}Q${x} ${y} ${x + k} ${y}Z`;
  }
  return '';
}

export function svgWord(text, { color = '#000', px = 1, id = 'tm' } = {}) {
  let cx = 0, solid = '', holes = '';
  for (const ch of text) {
    if (ch === ' ') { cx += M.space; continue; }
    const g = GLYPHS[ch];
    if (!g) continue;
    solid += `<g transform="translate(${cx} 0)">`
      + g.s.map(s => `<path d="${svgShape(s)}"/>`).join('') + '</g>';
    if (g.h) holes += `<g transform="translate(${cx} 0)">`
      + g.h.map(s => `<path d="${svgShape(s)}" fill="#000"/>`).join('') + '</g>';
    cx += g.w + M.track;
  }
  const w = widthOf(text);
  const mask = holes
    ? `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${M.cap}">`
      + `<rect width="${w}" height="${M.cap}" fill="#fff"/>${holes}</mask>`
    : '';
  const body = `<g fill="${color}"${holes ? ` mask="url(#${id})"` : ''}>${solid}</g>`;
  return {
    w, h: M.cap, body, defs: mask,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${M.cap}" `
      + `width="${(w * px).toFixed(0)}" height="${(M.cap * px).toFixed(0)}" `
      + `role="img" aria-label="${text}"><title>${text}</title>${mask}${body}</svg>`,
  };
}
