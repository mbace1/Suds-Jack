// Plasticine pressed and smeared flat onto a board, and lit by one raking lamp.
//
// The picture is a HEIGHT FIELD plus an albedo: every object is a shape whose
// clay is pushed up into a rounded relief (a distance transform from its edge),
// then dragged over with finger smears — each smear thick where the finger
// landed, thinning along the drag, with the finger's ridges running along it
// and a lip where the clay was pushed aside. The light does the rest: normals
// from the field, a march toward the lamp for the cast shadows, a cavity term.
// Everything is in design pixels (1080×1920) scaled by `ss`.

import { MASTER, SHAPES, masterBounds } from './master.js';

export function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash2 = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
export const fbm = (x, y, s = 0) => vnoise(x, y, s) * 0.6 + vnoise(x * 2.1, y * 2.1, s + 1) * 0.28 + vnoise(x * 4.3, y * 4.3, s + 2) * 0.12;

const srgb2lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [srgb2lin(((n >> 16) & 255) / 255), srgb2lin(((n >> 8) & 255) / 255), srgb2lin((n & 255) / 255)];
}
export const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

export class Relief {
  constructor(ss = 1) {
    this.ss = ss;
    this.W = Math.round(1080 * ss); this.H = Math.round(1920 * ss);
    const N = this.W * this.H;
    this.h = new Float32Array(N); this.r = new Float32Array(N); this.g = new Float32Array(N); this.b = new Float32Array(N);
    this.er = new Float32Array(N); this.eg = new Float32Array(N); this.eb = new Float32Array(N);
    this.spec = new Float32Array(N).fill(1);
  }

  /** rasterise a path drawn in design coords into a bbox mask + distance field */
  mask(draw, bbox) {
    const s = this.ss, pad = 4;
    const x0 = Math.max(0, Math.floor(bbox[0] * s) - pad), y0 = Math.max(0, Math.floor(bbox[1] * s) - pad);
    const x1 = Math.min(this.W, Math.ceil(bbox[2] * s) + pad), y1 = Math.min(this.H, Math.ceil(bbox[3] * s) + pad);
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.setTransform(s, 0, 0, s, -x0, -y0);
    g.fillStyle = '#fff';
    draw(g);
    const id = g.getImageData(0, 0, w, h).data;
    const a = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) a[i] = id[i * 4 + 3] / 255;
    // chamfer distance to the outside, in px
    const d = new Float32Array(w * h);
    const INF = 1e9;
    for (let i = 0; i < w * h; i++) d[i] = a[i] > 0.5 ? INF : 0;
    const D1 = 1, D2 = 1.4142;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (d[i] === 0) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + D1); else v = Math.min(v, D1);
      if (y > 0) { v = Math.min(v, d[i - w] + D1); if (x > 0) v = Math.min(v, d[i - w - 1] + D2); if (x < w - 1) v = Math.min(v, d[i - w + 1] + D2); } else v = Math.min(v, D1);
      d[i] = v;
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x; if (d[i] === 0) continue;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + D1); else v = Math.min(v, D1);
      if (y < h - 1) { v = Math.min(v, d[i + w] + D1); if (x < w - 1) v = Math.min(v, d[i + w + 1] + D2); if (x > 0) v = Math.min(v, d[i + w - 1] + D2); } else v = Math.min(v, D1);
      d[i] = v;
    }
    return { x0, y0, w, h, a, d };
  }

  /**
   * Press an object of clay. o: { draw, bbox, color | colorAt(x,y), base, relief, round,
   *   strokes: { n, len, w, dir(x,y), amp, ridges, colorVar, tint(x,y) }, emit: [r,g,b], spec }
   */
  press(o) {
    const m = this.mask(o.draw, o.bbox);
    if (!m) return;
    const s = this.ss, W = this.W;
    const base = (o.base ?? 0) * s, relief = (o.relief ?? 0) * s, round = Math.max(1, (o.round ?? 10) * s);
    const col0 = o.color ? hex(o.color) : null;
    const seed = o.seed ?? 1;
    const nv = o.noiseVar ?? 0.08, nf = (o.noiseF ?? 0.012) / s;
    const bulgeAt = new Float32Array(m.w * m.h);
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x, a = m.a[i];
      if (a <= 0) continue;
      const k = Math.min(m.d[i] / round, 1), prof = Math.sqrt(1 - (1 - k) * (1 - k));
      const X = m.x0 + x, Y = m.y0 + y, j = Y * W + X;
      if (o.fill === false) { bulgeAt[i] = this.h[j]; continue; }   // strokes only, laid on what is there
      const bh = base + relief * prof + (o.lumps ?? 0) * s * fbm(X * nf * 0.7, Y * nf * 0.7, seed + 9);
      bulgeAt[i] = bh;
      const c = o.colorAt ? o.colorAt(X / s, Y / s) : col0;
      const n = 1 + nv * fbm(X * nf, Y * nf, seed);
      this.h[j] = this.h[j] * (1 - a) + bh * a;
      this.er[j] *= 1 - a; this.eg[j] *= 1 - a; this.eb[j] *= 1 - a;   // clay over a lit window puts it out
      this.r[j] = this.r[j] * (1 - a) + c[0] * n * a;
      this.g[j] = this.g[j] * (1 - a) + c[1] * n * a;
      this.b[j] = this.b[j] * (1 - a) + c[2] * n * a;
      if (o.emit) { this.er[j] += o.emit[0] * a; this.eg[j] += o.emit[1] * a; this.eb[j] += o.emit[2] * a; }
      if (o.spec !== undefined) this.spec[j] = this.spec[j] * (1 - a) + o.spec * a;
    }
    if (o.strokes) this.smear(o, m, bulgeAt);
  }

  smear(o, m, bulgeAt) {
    const s = this.ss, W = this.W, st = o.strokes, r = rng((o.seed ?? 1) * 7919 + 13);
    const area = m.a.reduce((p, v) => p + (v > 0.5 ? 1 : 0), 0);
    const len = st.len * s, wid = st.w * s;
    const n = st.n ?? Math.ceil(area / (len * wid * 2) * (st.density ?? 1.6));
    const col0 = o.color ? hex(o.color) : null;
    for (let k = 0; k < n; k++) {
      // a start inside the shape
      let sx, sy, tries = 0;
      do { sx = m.x0 + r() * m.w; sy = m.y0 + r() * m.h; tries++; } while (m.a[((sy - m.y0) | 0) * m.w + ((sx - m.x0) | 0)] < 0.5 && tries < 30);
      if (tries >= 30) continue;
      const L = len * (0.6 + r() * 0.8), w0 = wid * (0.7 + r() * 0.6);
      // follow the direction field
      const pts = [[sx, sy]]; let x = sx, y = sy;
      const steps = 8, flip = st.both && r() < 0.5 ? Math.PI : 0;
      for (let i = 0; i < steps; i++) {
        const a = st.dir(x / s, y / s, r) + flip + (r() - 0.5) * (st.jitter ?? 0.15);
        x += Math.cos(a) * L / steps; y += Math.sin(a) * L / steps; pts.push([x, y]);
      }
      // the clay this finger carried
      let c = o.colorAt ? o.colorAt(sx / s, sy / s) : col0;
      if (st.tint) c = st.tint(sx / s, sy / s, r, c);
      const cv = st.colorVar ?? 0.08, f = 1 + (r() - 0.5) * 2 * cv;
      c = [c[0] * f, c[1] * f * (1 + (r() - 0.5) * cv * 0.5), c[2] * f];
      this.stroke(pts, w0, (st.amp ?? 3) * s * (0.7 + r() * 0.6), c, m, bulgeAt, st, r);
    }
  }

  stroke(pts, w0, amp, c, m, bulgeAt, st, r) {
    const W = this.W, H = this.H;
    // cumulative arc length
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const Ltot = cum[cum.length - 1] || 1;
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const [x, y] of pts) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
    const pad = w0 + 2;
    const X0 = Math.max(m.x0, Math.floor(bx0 - pad)), Y0 = Math.max(m.y0, Math.floor(by0 - pad));
    const X1 = Math.min(m.x0 + m.w - 1, Math.ceil(bx1 + pad)), Y1 = Math.min(m.y0 + m.h - 1, Math.ceil(by1 + pad));
    const ridges = st.ridges ?? 5, ph = r() * 6.28, press = st.press ?? 0.55, op = st.opacity ?? 0.92;
    const tailNoise = r() * 100;
    for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
      // nearest point on the polyline
      let best = 1e9, bs = 0, bt = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
        let t = ((X - ax) * dx + (Y - ay) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = ax + dx * t - X, py = ay + dy * t - Y, d2 = px * px + py * py;
        if (d2 < best) { best = d2; bs = (cum[i] + t * (cum[i + 1] - cum[i])) / Ltot; bt = (dx * (Y - ay) - dy * (X - ax)) >= 0 ? 1 : -1; }
      }
      bt *= Math.sqrt(best);   // true distance: round ends, not square ones
      const w = w0 * (1 - 0.4 * bs);
      const tt = Math.abs(bt) / w;
      if (tt >= 1) continue;
      const mi = (Y - m.y0) * m.w + (X - m.x0), ma = m.a[mi];
      if (ma <= 0) continue;
      // the drag: thick where the finger landed, thinning, breaking up at the tail
      const thick = (1 - 0.7 * bs) + 0.5 * Math.exp(-((bs / 0.07) ** 2));
      const cross = Math.sqrt(1 - tt * tt) + 0.45 * Math.max(0, 1 - Math.abs(tt - 0.82) / 0.14);
      const ridge = 1 + 0.22 * Math.sin(bt / w0 * Math.PI * ridges + ph);
      const tail = Math.min(1, Math.max(0, (1 - bs) / 0.3)) * (0.75 + 0.25 * vnoise(bs * 12 + tailNoise, tt * 3, 3));
      const edge = Math.min(1, (1 - tt) / 0.3); const soft = edge * edge * (3 - 2 * edge);
      const al = ma * soft * Math.min(1, tail * 1.4);
      if (al <= 0) continue;
      const j = Y * W + X;
      const hs = bulgeAt[mi] + amp * thick * cross * ridge;
      // pressing flattens what was there; the smear sits on the flattened clay
      const k = al * press;
      this.h[j] = this.h[j] * (1 - k) + hs * k;
      const ca = al * op * (0.55 + 0.45 * (1 - bs));
      this.r[j] += (c[0] - this.r[j]) * ca; this.g[j] += (c[1] - this.g[j]) * ca; this.b[j] += (c[2] - this.b[j]) * ca;
    }
  }

  /** a soft glow painted INTO the clay's colour (light the clay is pretending to be) */
  glow(cx, cy, rad, color, amt = 1) {
    const s = this.ss, c = hex(color), R = rad * s, W = this.W;
    const X0 = Math.max(0, (cx * s - R) | 0), X1 = Math.min(W - 1, (cx * s + R) | 0), Y0 = Math.max(0, (cy * s - R) | 0), Y1 = Math.min(this.H - 1, (cy * s + R) | 0);
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      const d = Math.hypot(x - cx * s, y - cy * s) / R; if (d >= 1) continue;
      const k = amt * (1 - d) * (1 - d), j = y * W + x;
      this.r[j] += (c[0] - this.r[j]) * k; this.g[j] += (c[1] - this.g[j]) * k; this.b[j] += (c[2] - this.b[j]) * k;
    }
  }

  /** light it: one raking key with cast shadows, a cool ambient with cavities, a waxy sheen */
  shade({ az = Math.PI * 1.13, el = 0.42, key = [1.25, 1.15, 1.0], amb = [0.18, 0.2, 0.26], spec = 0.12, shininess = 22, shadowLen = 160, aoRad = 22, aoAmt = 0.03, bloom = 1.0, exposure = 1.0, vignette = 0.4, grain = 0.03, fillDir = 0, fill = [0, 0, 0] } = {}) {
    const W = this.W, H = this.H, N = W * H, s = this.ss, h = this.h;
    const lx = Math.cos(az), ly = Math.sin(az), tz = Math.tan(el);
    const L = [Math.cos(el) * lx, Math.cos(el) * ly, Math.sin(el)];
    const Hh = [L[0], L[1], L[2] + 1]; const hl = Math.hypot(...Hh); Hh[0] /= hl; Hh[1] /= hl; Hh[2] /= hl;
    // cavity term: height against its blurred self
    const blur = boxBlur(h, W, H, Math.max(2, aoRad * s | 0), 2);
    const out = new Float32Array(N * 3);
    const step = 1.5 * s, maxSteps = Math.ceil(shadowLen * s / step);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const j = y * W + x;
      const hx = (h[y * W + Math.min(W - 1, x + 1)] - h[y * W + Math.max(0, x - 1)]) * 0.5;
      const hy = (h[Math.min(H - 1, y + 1) * W + x] - h[Math.max(0, y - 1) * W + x]) * 0.5;
      let nx = -hx, ny = -hy, nz = 1; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
      const ndl = nx * L[0] + ny * L[1] + nz * L[2];
      let diff = Math.max(0, (ndl + 0.15) / 1.15);
      // march toward the lamp
      let vis = 1;
      if (diff > 0) {
        const h0 = h[j];
        for (let i = 1; i <= maxSteps; i++) {
          const d = i * step, px = (x + lx * d) | 0, py = (y + ly * d) | 0;
          if (px < 0 || py < 0 || px >= W || py >= H) break;
          const over = h[py * W + px] - (h0 + d * tz);
          if (over > 0) { vis = Math.min(vis, Math.max(0, 1 - over / (0.6 + d * 0.05))); if (vis <= 0) break; }
        }
      }
      const ao = Math.max(0.35, Math.min(1.05, 1 - (blur[j] - h[j]) * aoAmt / s));
      const ndh = Math.max(0, nx * Hh[0] + ny * Hh[1] + nz * Hh[2]);
      const sp = spec * this.spec[j] * Math.pow(ndh, shininess) * vis;
      const fd = fillDir ? Math.max(0, nx * Math.cos(fillDir) * 0.8 + ny * Math.sin(fillDir) * 0.8 + nz * 0.6) : 0;
      for (let c = 0; c < 3; c++) {
        const al = c === 0 ? this.r[j] : c === 1 ? this.g[j] : this.b[j];
        out[j * 3 + c] = al * (key[c] * diff * vis + amb[c] * ao * (0.6 + 0.4 * nz) + fill[c] * fd * ao) + sp * key[c];
      }
      out[j * 3] += this.er[j]; out[j * 3 + 1] += this.eg[j]; out[j * 3 + 2] += this.eb[j];
    }
    // bloom from what is brighter than paper
    if (bloom > 0) {
      const q = 4, bw = Math.ceil(W / q), bh = Math.ceil(H / q);
      const br = [new Float32Array(bw * bh), new Float32Array(bw * bh), new Float32Array(bw * bh)];
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const j = Math.min(H - 1, y * q) * W + Math.min(W - 1, x * q);
        for (let c = 0; c < 3; c++) br[c][y * bw + x] = Math.max(0, out[j * 3 + c] - 0.9);
      }
      const b1 = br.map(a => boxBlur(a, bw, bh, Math.max(2, 6 * s | 0), 3));
      const b2 = br.map(a => boxBlur(a, bw, bh, Math.max(4, 24 * s | 0), 3));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const j = y * W + x, k = ((y / q) | 0) * bw + ((x / q) | 0);
        for (let c = 0; c < 3; c++) out[j * 3 + c] += (b1[c][k] * 0.6 + b2[c][k] * 0.5) * bloom;
      }
    }
    // grade and write
    const img = new ImageData(W, H), d = img.data, r = rng(5);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const j = y * W + x;
      const vx = (x / W - 0.5), vy = (y / H - 0.5) * 1.1;
      const vg = 1 - vignette * Math.min(1, Math.max(0, (Math.hypot(vx, vy) - 0.25) / 0.55)) ** 1.5;
      const gr = (r() + r() - 1) * grain;
      for (let c = 0; c < 3; c++) {
        let v = out[j * 3 + c] * exposure * vg;
        v = aces(v);
        v = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
        d[j * 4 + c] = Math.max(0, Math.min(255, (v + gr) * 255));
      }
      d[j * 4 + 3] = 255;
    }
    return img;
  }
}

function aces(x) { return Math.max(0, Math.min(1, (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14))); }

export function boxBlur(src, W, H, rad, passes = 2) {
  let a = Float32Array.from(src), b = new Float32Array(src.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) {
      let acc = 0; const row = y * W;
      for (let x = -rad; x <= rad; x++) acc += a[row + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        b[row + x] = acc / (2 * rad + 1);
        acc += a[row + Math.min(W - 1, x + rad + 1)] - a[row + Math.max(0, x - rad)];
      }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let y = -rad; y <= rad; y++) acc += b[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = acc / (2 * rad + 1);
        acc += b[Math.min(H - 1, y + rad + 1) * W + x] - b[Math.max(0, y - rad) * W + x];
      }
    }
  }
  return a;
}

/** the Toko face as a canvas path, the ink box centred at (cx, cy), disc radius r, rotated */
export function tokoPath(g, cx, cy, r, rot = 0, ink = 1.33) {
  const b = masterBounds(), sc = (r * ink) / b.w, c = MASTER.size / 2;
  g.save(); g.translate(cx, cy); g.rotate(rot);
  g.beginPath();
  for (const k of SHAPES) {
    const p = MASTER[k];
    for (let i = 0; i < p.length; i += 2) { const x = (p[i] - c) * sc, y = (p[i + 1] - c) * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath();
  }
  g.fill('nonzero');
  g.restore();
}
