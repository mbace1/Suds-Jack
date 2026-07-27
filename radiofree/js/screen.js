// Radio Free Helsinki — low-res pixel canvas, same trick as the sibling demos:
// draw small, let CSS upscale with image-rendering: pixelated. Everything on
// this broadcast (Toko's face, every story visual) is drawn in code — there are
// no image assets, so the whole app works offline and re-tints in one edit.

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const cl = v => Math.max(0, Math.min(255, Math.round(v)));
  const r = cl(((n >> 16) & 255) * f), g = cl(((n >> 8) & 255) * f), b = cl((n & 255) * f);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const l = (sh) => {
    const x = (pa >> sh) & 255, y = (pb >> sh) & 255;
    return Math.round(x + (y - x) * k);
  };
  return '#' + ((1 << 24) | (l(16) << 16) | (l(8) << 8) | l(0)).toString(16).slice(1);
}

// 4x4 ordered dither — the codec's video grain and every soft falloff on the
// screen come from this rather than from alpha, so the pixels stay hard
const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export function bayer(x, y) { return (BAYER4[(y & 3)][(x & 3)] + 0.5) / 16; }

export class PixelScreen {
  // parent may be null: the portrait and the story panel are drawn into
  // detached buffers and blitted into the codec screen, so the whole codec is
  // one canvas and the two frames can never drift out of alignment when the
  // page scales them
  constructor(parent, w, h) {
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.className = 'pixel';
    // the bulletin text is the channel a screen reader can follow; an
    // unlabelled canvas alongside it is noise
    this.canvas.setAttribute('aria-hidden', 'true');
    if (parent) parent.appendChild(this.canvas);
    // willReadFrequently: the portrait's decode tear reads the buffer back
    // every frame to displace bands of the picture
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.ctx.imageSmoothingEnabled = false;
  }

  clear(color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  px(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  rect(x, y, w, h, color, edge) {
    this.px(x, y, w, h, color);
    if (edge === undefined) return;
    const e = edge === true ? shade(color, 0.6) : edge;
    this.px(x, y, w, 1, e);
    this.px(x, y + h - 1, w, 1, e);
    this.px(x, y, 1, h, e);
    this.px(x + w - 1, y, 1, h, e);
  }

  disc(cx, cy, r, color, edge) {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      this.px(cx - dx, cy + dy, dx * 2 + 1, 1, color);
    }
    if (edge === undefined) return;
    const e = edge === true ? shade(color, 0.55) : edge;
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      this.px(cx - dx, cy + dy, 1, 1, e);
      this.px(cx + dx, cy + dy, 1, 1, e);
    }
  }

  // an ellipse, because a gel head is wider than it is tall when it settles
  ellipse(cx, cy, rx, ry, color, edge) {
    for (let dy = -ry; dy <= ry; dy++) {
      const k = 1 - (dy * dy) / (ry * ry);
      if (k < 0) continue;
      const dx = Math.floor(rx * Math.sqrt(k));
      this.px(cx - dx, cy + dy, dx * 2 + 1, 1, color);
      if (edge !== undefined) {
        const e = edge === true ? shade(color, 0.55) : edge;
        this.px(cx - dx, cy + dy, 1, 1, e);
        this.px(cx + dx, cy + dy, 1, 1, e);
      }
    }
  }

  // Bresenham. The endpoints are rounded FIRST: stepping from rounded
  // coordinates while computing the slope from unrounded ones lets the walk
  // miss its target entirely and run on to the guard limit, which is how the
  // account graph grew two long rays across the whole panel.
  line(x0, y0, x1, y1, color) {
    let x = Math.round(x0), y = Math.round(y0);
    const ex = Math.round(x1), ey = Math.round(y1);
    const dx = Math.abs(ex - x), dy = Math.abs(ey - y);
    const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let err = dx - dy;
    for (let guard = 0; guard <= dx + dy + 1; guard++) {
      this.px(x, y, 1, 1, color);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  // horizontal CRT scan bands, drawn INTO the pixel buffer so they scale with
  // the art instead of floating over it as a CSS layer
  scanlines(alphaColor = '#000000', step = 3) {
    this.ctx.globalAlpha = 0.22;
    for (let y = 0; y < this.h; y += step) this.px(0, y, this.w, 1, alphaColor);
    this.ctx.globalAlpha = 1;
  }

  // A rect filled with equal horizontal bands — a stepped gradient, which is
  // the only kind this app has: a smooth one would dither itself into noise at
  // this resolution. Every night-shot sky in the footage is one of these.
  bands(x, y, w, h, colors) {
    const bh = h / colors.length;
    colors.forEach((c, i) => this.px(x, y + i * bh, w, Math.ceil(bh), c));
  }

  destroy() { this.canvas.remove(); }
}
