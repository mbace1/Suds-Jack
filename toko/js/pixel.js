// TOKO MIDORI — the smallest possible pixel surface.
//
// Deliberately standalone: the brand kit imports nothing, not even from
// gameoflife/, so a single copy of toko/ can be dropped beside any game
// (or onto the gh-pages site root) and just work. No build step, no CDN.
//
// Everything the brand draws is painted in code at a low resolution and
// upscaled with hard pixels. There are no image assets in this identity —
// that is a brand rule, not an implementation detail (see BRAND.md).

// darken (f<1) / lighten (f>1) a #rrggbb — for seams and pressed-in edges
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const cl = v => Math.max(0, Math.min(255, Math.round(v)));
  const r = cl(((n >> 16) & 255) * f), g = cl(((n >> 8) & 255) * f), b = cl((n & 255) * f);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// mix two #rrggbb by u (0 = a, 1 = b)
export function mix(a, b, u) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const ch = s => Math.round((((A >> s) & 255) * (1 - u)) + (((B >> s) & 255) * u));
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

// deterministic RNG — a glitch you cannot reproduce is a bug, not a look
export function rng(seed) {
  let s = (seed | 0) || 1;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── the hand-cut alphabet ────────────────────────────────────────────────
// 5×7, one pixel of air between glyphs. Cut by hand so the brand owns its
// letterforms outright: no font file to license, load, or fail to load.
const FONT = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#..##', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  4: ['#..#.', '#..#.', '#..#.', '#####', '...#.', '...#.', '...#.'],
  5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  6: ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  9: ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '..##.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '·': ['.....', '.....', '.....', '..#..', '.....', '.....', '.....'],
  '×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

export const GLYPH_W = 5, GLYPH_H = 7, TRACK = 1;

// width in pixels of `str` at `scale`, including the tracking between glyphs
// (but not after the last one)
export function textWidth(str, scale = 1, track = TRACK) {
  if (!str.length) return 0;
  return (str.length * (GLYPH_W + track) - track) * scale;
}

// Lay a string out as string-art rows (7 rows of '#'/'.'), which is what the
// SVG exporter eats — so the wordmark that ships as a logo file is byte-for-
// byte the same letterforms the canvas draws.
export function textRows(str, track = TRACK) {
  const s = String(str).toUpperCase();
  const out = new Array(GLYPH_H).fill('');
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]] || FONT['?'];
    for (let r = 0; r < GLYPH_H; r++) {
      out[r] += g[r] + (i < s.length - 1 ? '.'.repeat(track) : '');
    }
  }
  return out;
}

// ── the pen ──────────────────────────────────────────────────────────────
// Every drawing helper the brand needs, bound to one 2D context. Same shape
// as the pen the arcade hub uses for its marquees, so art moves between them.
export function pen(ctx) {
  const p = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0));
  };
  const disc = (cx, cy, r, c) => {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      p(cx - dx, cy + dy, dx * 2 + 1, 1, c);
    }
  };
  const line = (x0, y0, x1, y1, c) => {
    const n = Math.max(1, Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
    for (let i = 0; i <= n; i++) p(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, 1, 1, c);
  };
  const frame = (x, y, w, h, c, t = 1) => {
    p(x, y, w, t, c); p(x, y + h - t, w, t, c);
    p(x, y, t, h, c); p(x + w - t, y, t, h, c);
  };

  // paint a string-art block: rows of chars, `map` gives char → colour
  // ('.' and any unmapped char are left transparent)
  const art = (rows, x, y, map, scale = 1) => {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const col = map[row[c]];
        if (col) p(x + c * scale, y + r * scale, scale, scale, col);
      }
    }
  };

  // the hand-cut type. Returns the advance width so callers can chain.
  const text = (str, x, y, c, scale = 1, track = TRACK) => {
    const s = String(str).toUpperCase();
    let cx = x;
    for (const ch of s) {
      const g = FONT[ch] || FONT['?'];
      art(g, cx, y, { '#': c }, scale);
      cx += (GLYPH_W + track) * scale;
    }
    return cx - x - track * scale;
  };

  return { ctx, p, disc, line, frame, art, text };
}

// ── the surface ──────────────────────────────────────────────────────────
export class Screen {
  // w,h are the REAL pixels of the art. `scale` is how many screen pixels
  // each art pixel occupies — the canvas is sized up in CSS only, so the
  // art stays exactly as many pixels as it was drawn with.
  constructor(parent, w, h, scale = 4, opts = {}) {
    this.w = w; this.h = h; this.scale = scale;
    const cv = this.canvas = document.createElement('canvas');
    cv.width = w; cv.height = h;
    if (opts.fluid) {
      // for headers that have to survive a narrow phone: the art still has
      // exactly w×h pixels, CSS just stops it overflowing the column
      cv.style.width = '100%';
      cv.style.maxWidth = (w * scale) + 'px';
      cv.style.height = 'auto';
    } else {
      cv.style.width = (w * scale) + 'px';
      cv.style.height = (h * scale) + 'px';
    }
    cv.style.imageRendering = 'pixelated';
    cv.style.display = 'block';
    // the mark is decoration wherever it appears; the words beside it are
    // the channel a screen reader should follow
    if (opts.label) cv.setAttribute('role', 'img'), cv.setAttribute('aria-label', opts.label);
    else cv.setAttribute('aria-hidden', 'true');
    if (parent) parent.appendChild(cv);
    this.ctx = cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.g = pen(this.ctx);
    this._cache = new Map();
    this._raf = 0;
  }

  clear(c) { if (c) this.g.p(0, 0, this.w, this.h, c); else this.ctx.clearRect(0, 0, this.w, this.h); }

  // Draw a layer ONCE and blit it after that. Glitch work is per-pixel and
  // expensive; anything that is not actually moving belongs in here.
  cached(key, draw) {
    let e = this._cache.get('__');
    if (!e || e.key !== key) {
      const cv = document.createElement('canvas');
      cv.width = this.w; cv.height = this.h;
      const c2 = cv.getContext('2d');
      c2.imageSmoothingEnabled = false;
      const realCtx = this.ctx, realG = this.g;
      this.ctx = c2; this.g = pen(c2);
      draw(this);
      this.ctx = realCtx; this.g = realG;
      e = { key, cv };
      this._cache.set('__', e);
    }
    // a cached layer is always the whole surface, so it replaces rather than
    // stacks — otherwise last frame's glitch residue survives underneath it
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.ctx.drawImage(e.cv, 0, 0);
  }

  // rAF loop with a real dt. Under prefers-reduced-motion it paints one
  // frame at t=0 and stops — a brand that will not hold still is unusable.
  loop(fn) {
    this.stop();
    const still = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) { fn(0, 0); return this; }
    let last = performance.now(), t = 0;
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      fn(t, dt);
      this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
    return this;
  }

  stop() { if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; }

  destroy() { this.stop(); this.canvas.remove(); this._cache.clear(); }
}
