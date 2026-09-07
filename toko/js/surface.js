// TOKO MIDORI GAMES — a smooth canvas.
//
// The mark is curves, not pixels, so it needs a device-pixel-ratio surface with
// antialiasing left ON. (`pixel.js` is the opposite surface — hard pixels, for
// the games' own art. Both live here; neither is the other's fallback.)

export class Surface {
  constructor(parent, w, h, opts = {}) {
    this.w = w; this.h = h;
    const dpr = this.dpr = Math.min(3, (globalThis.devicePixelRatio || 1));
    const cv = this.canvas = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    if (opts.fluid) {
      cv.style.width = '100%';
      cv.style.maxWidth = w + 'px';
      cv.style.height = 'auto';
    } else {
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
    }
    cv.style.display = 'block';
    if (opts.label) { cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', opts.label); }
    else cv.setAttribute('aria-hidden', 'true');
    if (parent) parent.appendChild(cv);
    const ctx = this.ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    this._raf = 0;
  }

  clear(color) {
    if (color) { this.ctx.fillStyle = color; this.ctx.fillRect(0, 0, this.w, this.h); }
    else this.ctx.clearRect(0, 0, this.w, this.h);
  }

  // rAF with a real dt. Under prefers-reduced-motion it paints one frame at
  // t = 0 and stops — a logo that will not hold still is unusable, and for
  // some readers it is worse than unusable.
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
  destroy() { this.stop(); this.canvas.remove(); }
}
