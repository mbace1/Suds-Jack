// Kindling — the low-res drawing surface.
//
// A 192×128 canvas upscaled by CSS with hard pixels (image-rendering:
// pixelated), the same trick every pixel project on this site uses. This is a
// deliberate COPY of the useful half of gameoflife/js/pixel.js rather than an
// import: that project precaches a list scoped to its own folder and asserts
// zero network requests offline, so reaching across into it would quietly break
// its offline promise. What is not copied is the CRT — the fire in this room is
// the light source, and a scanlined tube on top of it fought the one thing the
// picture is trying to say.

import { shade } from './palette.js?v=9';

// 4×4 ordered (Bayer) matrix as a 0..1 threshold per pixel. Firelight is a
// gradient, and a gradient painted flat reads as modern; stippled through this
// it stays pixel art. Sample it at the CELL index when drawing in 2px cells
// (bayer(x >> 1, y >> 1)) — sampling only even coordinates reaches four of the
// sixteen values, all low, and the stipple collapses into blobs.
const BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export function bayer(x, y) { return (BAYER4[(y & 3)][(x & 3)] + 0.5) / 16; }

// pick from a dark→light ramp at u (0..1), dithered at (x,y) so neighbouring
// steps stipple into each other instead of banding
export function rampDither(ramp, u, x, y) {
  const f = Math.max(0, Math.min(1, u)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 1, Math.floor(f + bayer(x, y)));
  return ramp[i];
}

export class PixelScreen {
  constructor(parent, w = 320, h = 180) {
    this.w = w; this.h = h;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.className = 'pixel-screen';
    // the picture is the reward, but the followable channel is the line of text
    // under it (aria-live) — do not announce an unlabelled canvas beside it
    c.setAttribute('aria-hidden', 'true');
    this.canvas = c;
    this.ctx = c.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    parent.appendChild(c);
  }

  clear(color) { this.px(0, 0, this.w, this.h, color); }

  // Blit a cut asset. The whole reason this exists is `assets.js`: a scene
  // plane is either a bitmap or a function, and the caller should not care
  // which. Smoothing stays off — a cut PNG is already at the native grid, so
  // any resampling here would undo the pipeline's whole point.
  img(bmp, dx = 0, dy = 0, sx, sy, w, h) {
    if (!bmp) return false;
    if (sx === undefined) this.ctx.drawImage(bmp, Math.round(dx), Math.round(dy));
    else this.ctx.drawImage(bmp, sx, sy, w, h, Math.round(dx), Math.round(dy), w, h);
    return true;
  }

  px(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  // filled rect with an optional 1px outline — the workhorse for defined
  // sections. `edge === true` takes a darker shade of the fill.
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
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      this.px(cx - dx, cy + dy, dx * 2 + 1, 1, color);
    }
    if (edge === undefined) return;
    const e = edge === true ? shade(color, 0.55) : edge;
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      this.px(cx - dx, cy + dy, 1, 1, e);
      this.px(cx + dx, cy + dy, 1, 1, e);
    }
    this.px(cx, cy - r, 1, 1, e);
    this.px(cx, cy + r, 1, 1, e);
  }

  // a soft-edged disc: solid core, dithered feather. Every glow in the room is
  // one of these — the hearth's, the creature's rim, a found object catching
  // the light. Painted in 2px cells to stay cheap on a phone.
  softDisc(cx, cy, r, color, feather = 8) {
    const inner = r - feather;
    for (let dy = -r; dy <= r; dy += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        if (d <= inner || bayer((cx + dx) >> 1, (cy + dy) >> 1) < (r - d) / feather) {
          this.px(cx + dx, cy + dy, 2, 2, color);
        }
      }
    }
  }

  // chunky vertical gradient with a 1px seam between bands
  bands(x, y, w, h, colors, seam = true) {
    const bh = h / colors.length;
    colors.forEach((c, i) => {
      this.px(x, y + i * bh, w, Math.ceil(bh), c);
      if (seam && i < colors.length - 1) this.px(x, y + (i + 1) * bh - 1, w, 1, shade(c, 0.84));
    });
  }

  // Draw a layer ONCE and blit it afterwards.
  //
  // The room is mostly static: the wall, the floor, the shelf, the window
  // frame, the things you have brought home. All of it is dithered, which costs
  // one fillRect per cell, so it is painted into an offscreen canvas and
  // re-painted only when `key` changes. Every helper works unchanged inside the
  // callback because the context is simply retargeted for its duration.
  //
  // The discipline that matters: key on what actually changes (the light level,
  // quantised; the number of objects on the shelf) and lift every moving part —
  // the flame, the creature, the sparks — OUT of the callback. A scene whose
  // first screen is frozen reads as a broken page.
  cached(key, drawFn) {
    if (this._key !== key) {
      if (!this._off) {
        this._off = document.createElement('canvas');
        this._off.width = this.w; this._off.height = this.h;
        this._offCtx = this._off.getContext('2d');
        this._offCtx.imageSmoothingEnabled = false;
      }
      this._offCtx.clearRect(0, 0, this.w, this.h);
      const live = this.ctx;
      this.ctx = this._offCtx;
      try { drawFn(); } finally { this.ctx = live; }
      this._key = key;
    }
    this.ctx.drawImage(this._off, 0, 0);
  }

  // throw the cache away — the palette of the room changes with the light, so
  // callers that know they have changed it can force the repaint
  invalidate() { this._key = null; }

  // pointer event → pixel coordinates
  toPixel(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * this.w,
      y: (e.clientY - r.top) / r.height * this.h,
    };
  }

  destroy() { this.canvas.remove(); }
}

// One shared rAF for the whole app, reduced-motion aware. A loop left running
// against a detached canvas is the bug this repo has had more than once, so
// there is exactly one loop and it is stopped by name.
export function loop(step) {
  let raf = 0, last = performance.now(), alive = true;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const frame = now => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt, now / 1000);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    still,
    stop() { alive = false; cancelAnimationFrame(raf); },
  };
}
