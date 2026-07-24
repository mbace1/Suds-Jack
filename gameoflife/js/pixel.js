// The Game of Life — low-res pixel canvas helper.
// Draws into a small offscreen-resolution canvas that CSS upscales with hard
// pixels (image-rendering: pixelated), same trick as dropcabal's 220px render.

// darken (f<1) or lighten (f>1) a #rrggbb hex — used for crisp section seams
// and outline edges so shapes read as defined pixel blocks, not soft washes
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const cl = v => Math.max(0, Math.min(255, Math.round(v)));
  const r = cl(((n >> 16) & 255) * f), g = cl(((n >> 8) & 255) * f), b = cl((n & 255) * f);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export class PixelScreen {
  constructor(parent, w = 192, h = 128) {
    this.w = w; this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.className = 'pixel-screen';
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
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

  // filled rect with an optional 1px darker outline — the workhorse for
  // "defined sections": edge defaults to a shade of the fill unless given
  rect(x, y, w, h, color, edge) {
    this.px(x, y, w, h, color);
    if (edge === undefined) return;
    const e = edge === true ? shade(color, 0.62) : edge;
    this.px(x, y, w, 1, e);
    this.px(x, y + h - 1, w, 1, e);
    this.px(x, y, 1, h, e);
    this.px(x + w - 1, y, 1, h, e);
  }

  // vertical gradient as chunky bands — smooth gradients read as "modern",
  // banding keeps the pixel-art promise. A 1px darker seam between bands now
  // gives every sky/ground crisp, defined sections (seam=false to opt out).
  bands(x, y, w, h, colors, seam = true) {
    const bh = h / colors.length;
    colors.forEach((c, i) => {
      this.px(x, y + i * bh, w, Math.ceil(bh), c);
      if (seam && i < colors.length - 1) this.px(x, y + (i + 1) * bh - 1, w, 1, shade(c, 0.82));
    });
  }

  disc(cx, cy, r, color, edge) {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      this.px(cx - dx, cy + dy, dx * 2 + 1, 1, color);
    }
    if (edge === undefined) return;
    // a crisp 1px rim: the outermost pixel of each row, plus the poles
    const e = edge === true ? shade(color, 0.55) : edge;
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      this.px(cx - dx, cy + dy, 1, 1, e);
      this.px(cx + dx, cy + dy, 1, 1, e);
    }
    this.px(cx, cy - r, 1, 1, e);
    this.px(cx, cy + r, 1, 1, e);
  }

  // pointer event → pixel coordinates in canvas space
  toPixel(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * this.w,
      y: (e.clientY - r.top) / r.height * this.h,
    };
  }

  destroy() { this.canvas.remove(); }
}
