// The Game of Life — low-res pixel canvas helper.
// Draws into a small offscreen-resolution canvas that CSS upscales with hard
// pixels (image-rendering: pixelated), same trick as dropcabal's 220px render.

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

  // vertical gradient as chunky bands — smooth gradients read as "modern",
  // banding keeps the pixel-art promise
  bands(x, y, w, h, colors) {
    const bh = h / colors.length;
    colors.forEach((c, i) => this.px(x, y + i * bh, w, Math.ceil(bh), c));
  }

  disc(cx, cy, r, color) {
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      this.px(cx - dx, cy + dy, dx * 2 + 1, 1, color);
    }
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
