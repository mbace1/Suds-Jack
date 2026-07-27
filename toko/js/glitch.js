// TOKO MIDORI — the glitch toolkit.
//
// The glitch is not decoration. Toko's whole position is that the machine is
// a tool with a seam in it, and the seam should show: every mark is allowed
// to tear, drop out and split, and none of it is ever hidden. So the glitch
// lives here as a small set of honest, deterministic operations on a canvas —
// seeded, so the same hit lands the same way twice. A glitch you cannot
// reproduce is a bug wearing a costume.
//
// Everything operates on ART pixels (the small canvas), never on the upscaled
// one, so a tear is always a whole number of fat pixels.

import { rng } from './pixel.js';
import { TOKO } from './palette.js';

// one scratch surface for the whole kit — glitching runs every frame and
// allocating a canvas per frame is how a 24×24 logo starts dropping frames
let _s = null;
function scratch(w, h) {
  if (!_s) { _s = document.createElement('canvas'); _s.ctx = _s.getContext('2d'); }
  if (_s.width !== w || _s.height !== h) { _s.width = w; _s.height = h; }
  _s.ctx.imageSmoothingEnabled = false;
  _s.ctx.clearRect(0, 0, w, h);
  return _s;
}

// ── tear ─────────────────────────────────────────────────────────────────
// Horizontal bands slid sideways and wrapped, the way a signal loses hold of
// a line. The single most Toko operation in the kit.
export function tear(ctx, w, h, opts = {}) {
  const { bands = 4, amount = 3, seed = 1, bias = 0 } = opts;
  if (amount <= 0 || bands <= 0) return;
  const img = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const d = img.data;
  const r = rng(seed);
  for (let b = 0; b < bands; b++) {
    const y0 = Math.floor(r() * h);
    const bh = 1 + Math.floor(r() * Math.max(1, h / 6));
    const dx = Math.round((r() * 2 - 1) * amount + bias);
    if (!dx) continue;
    for (let y = y0; y < Math.min(h, y0 + bh); y++) {
      for (let x = 0; x < w; x++) {
        const sx = ((x - dx) % w + w) % w;
        const di = (y * w + x) * 4, si = (y * w + sx) * 4;
        d[di] = src[si]; d[di + 1] = src[si + 1]; d[di + 2] = src[si + 2]; d[di + 3] = src[si + 3];
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ── split ────────────────────────────────────────────────────────────────
// Channel separation. Alpha takes the widest of the three samples so the
// fringes bleed OUTSIDE the silhouette — the mark grows edges it did not have.
export function split(ctx, w, h, opts = {}) {
  const { dx = 1, dy = 0 } = opts;
  if (!dx && !dy) return;
  const img = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const d = img.data;
  const at = (x, y, c) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return 0;
    return src[(y * w + x) * 4 + c];
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    d[i]     = at(x - dx, y - dy, 0);
    d[i + 1] = at(x, y, 1);
    d[i + 2] = at(x + dx, y + dy, 2);
    d[i + 3] = Math.max(at(x - dx, y - dy, 3), at(x, y, 3), at(x + dx, y + dy, 3));
  }
  ctx.putImageData(img, 0, 0);
}

// ── dropout ──────────────────────────────────────────────────────────────
// Blocks that simply stop being there. `color` null punches a hole through
// to whatever is behind the canvas.
export function dropout(ctx, w, h, opts = {}) {
  const { n = 3, seed = 2, color = null, max = 6 } = opts;
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const bw = 1 + Math.floor(r() * max), bh = 1 + Math.floor(r() * Math.max(1, max / 2));
    const x = Math.floor(r() * w), y = Math.floor(r() * h);
    if (color) { ctx.fillStyle = color; ctx.fillRect(x, y, bw, bh); }
    else ctx.clearRect(x, y, bw, bh);
  }
}

// ── shuffle ──────────────────────────────────────────────────────────────
// Blocks lifted and put back down in the wrong place. Use sparingly: it is
// the operation that most easily destroys legibility.
export function shuffle(ctx, w, h, opts = {}) {
  const { n = 2, seed = 3, dist = 4, size = 7 } = opts;
  const s = scratch(w, h);
  s.ctx.drawImage(ctx.canvas, 0, 0);
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const bw = 2 + Math.floor(r() * size), bh = 2 + Math.floor(r() * size);
    const x = Math.floor(r() * (w - bw)), y = Math.floor(r() * (h - bh));
    const nx = Math.max(0, Math.min(w - bw, x + Math.round((r() * 2 - 1) * dist)));
    const ny = Math.max(0, Math.min(h - bh, y + Math.round((r() * 2 - 1) * dist)));
    ctx.clearRect(nx, ny, bw, bh);
    ctx.drawImage(s, x, y, bw, bh, nx, ny, bw, bh);
  }
}

// ── scanlines ────────────────────────────────────────────────────────────
// The glass the whole workshop is seen through. `phase` drifts them so the
// mark never looks like a static screenshot.
export function scanlines(ctx, w, h, opts = {}) {
  const { darkness = 0.22, gap = 2, phase = 0 } = opts;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${darkness})`;
  for (let y = Math.floor(phase) % gap; y < h; y += gap) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}

// ── carrier ──────────────────────────────────────────────────────────────
// One bright band rolling down the frame — a head sweep. Give it the
// phosphor, never the green: it belongs to the machine, not to Toko.
export function carrier(ctx, w, h, opts = {}) {
  const { y = 0, height = 2, color = TOKO.PHOSPHOR, alpha = 0.35 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = color;
  ctx.fillRect(0, Math.round(y) % (h + height) - height, w, height);
  ctx.restore();
}

// ── noise ────────────────────────────────────────────────────────────────
export function noise(ctx, w, h, opts = {}) {
  const { density = 0.08, seed = 4, colors = [TOKO.MIDORI, TOKO.BONE, TOKO.VERMILION] } = opts;
  const r = rng(seed);
  const n = Math.round(w * h * density);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    ctx.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
  }
}

// ── the hit ──────────────────────────────────────────────────────────────
// The one call anything outside this file should normally need: everything
// above, dialled by a single 0..1 intensity.
//
// The curve matters. Below ~0.25 the mark should look CLEAN — a logo that is
// permanently broken reads as a rendering fault, and nobody trusts a rendering
// fault. The glitch is an event that happens TO the mark, so most of the time
// it is not happening.
export function hit(ctx, w, h, intensity = 0, opts = {}) {
  const k = Math.max(0, Math.min(1, intensity));
  if (k <= 0.001) return;
  const seed = (opts.seed ?? 1) | 0;
  const t = opts.t ?? 0;

  split(ctx, w, h, { dx: Math.round(k * 3), dy: k > 0.75 ? 1 : 0 });
  tear(ctx, w, h, { bands: Math.round(1 + k * 5), amount: Math.round(1 + k * 6), seed: seed + 11 });
  if (k > 0.35) shuffle(ctx, w, h, { n: Math.round(k * 3), seed: seed + 23, dist: Math.round(k * 5) });
  if (k > 0.2) dropout(ctx, w, h, { n: Math.round(k * 4), seed: seed + 37, color: opts.hole ?? null });
  if (k > 0.6) noise(ctx, w, h, { density: (k - 0.6) * 0.22, seed: seed + 53 });
  if (opts.scan !== false) scanlines(ctx, w, h, { darkness: 0.1 + k * 0.16, phase: t * 14 });
}

// ── the pulse ────────────────────────────────────────────────────────────
// The resting behaviour of every Toko mark on a page: still, then a fast
// stutter, then still again. Returns 0..1 for a given time.
//
// `every` seconds between hits, `len` seconds of hit. The stutter inside the
// hit is a square wave, not a fade — CRTs do not ease.
export function pulse(t, { every = 6.5, len = 0.34, offset = 0 } = {}) {
  const u = ((t + offset) % every) / every;
  const win = len / every;
  if (u > win) return 0;
  const p = u / win;                      // 0..1 across the hit
  const env = 1 - p * p;                  // decays fast
  const stutter = Math.floor(p * 7) % 2 === 0 ? 1 : 0.35;
  return env * stutter;
}
