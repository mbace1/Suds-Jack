// The screen — 320×192, filled polygons, and sixteen colours coming out the far
// end whatever went in.
//
// Another World is not pixel art. There is not a sprite in it: every frame of
// it, background and character alike, is a list of filled polygons rasterised
// at 320×200 into a 16-colour buffer. That is why it still looks like nothing
// else — flat colour masses with hard edges, no texture, no shading ramp, no
// outline, the whole read carried by silhouette.
//
// So this draws polygons, and then takes the antialiasing back out. Canvas has
// no way to turn AA off, so the last thing done each frame is a pass that snaps
// every pixel to the nearest of the current sixteen. Edges go hard, the halo of
// in-between greys along a frond disappears, and the framebuffer is genuinely
// 16-colour rather than merely painted with sixteen colours.
//
// The nearest-colour table is filled lazily — an entry costs sixteen distance
// tests the first time that exact RGB is seen and a typed-array read every
// frame after. A room's worth of edge blends is a few hundred entries, so the
// pass settles into one array lookup per pixel within a frame of arriving.

export const W = 320, H = 192;

export class Screen {
  constructor(display) {
    this.display = display;
    this.dctx = display.getContext('2d');
    this.buf = document.createElement('canvas');
    this.buf.width = W; this.buf.height = H;
    this.ctx = this.buf.getContext('2d', { willReadFrequently: true });
    this.ctx.imageSmoothingEnabled = false;
    this.hex = [];
    this.rgb = new Uint32Array(16);
    // Zero means "not worked out yet". It cannot collide with a real answer:
    // every colour in here is packed with alpha 255, so no answer is ever zero.
    //
    // This was an Int32Array tested with `< 0`, which never once hit — a packed
    // ABGR value has the top bit set, so every cached answer read back negative
    // and every pixel recomputed its sixteen distance tests from scratch, every
    // frame. It also meant the fixed points below were thrown away the moment
    // they were looked up.
    this.lut = new Uint32Array(32768);
    this.keep = [];                   // colours the quantise pass must not touch
    this.cacheMap = new Map();
    this.pure = true;                 // the quantise pass; off = plain canvas AA
    // CLASSIC fills the available display. 4X keeps every source pixel an
    // exact square at an integer scale, so the same authored frame can be
    // inspected without uneven browser resampling. The picture data never
    // changes; this is presentation only.
    let savedScale = '';
    try { savedScale = window.localStorage?.getItem('flashPrinceScale') ?? ''; } catch { /* private/embed mode */ }
    this.scaleMode = savedScale === 'integer4' ? 'integer4' : 'fit';
    this.scale = 1; this.ox = 0; this.oy = 0;
    this.img = this.ctx.createImageData(W, H);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  // A room's palette. Changing it throws the whole nearest-colour table away,
  // which is correct and costs nothing: it happens once per screen, and Another
  // World changed palette per screen too.
  setPalette(hex) {
    if (hex.length === this.hex.length && hex.every((c, i) => c === this.hex[i])) return;
    this.hex = hex.slice();
    this.cacheMap.clear();          // a cached room is cached in its own colours
    for (let i = 0; i < 16; i++) {
      const h = hex[i] || '#000000';
      const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
      this.rgb[i] = (255 << 24) | (b << 16) | (g << 8) | r;   // little-endian ABGR
    }
    this.lut.fill(0);
    this.seedKeep();
  }

  // Colours that must come out of the quantise pass unchanged.
  //
  // The hero is not drawn from the room's sixteen — he is blitted out of a
  // sprite sheet with fourteen of his own (see sprite.js). Seeding the
  // nearest-colour table with those fourteen as FIXED POINTS is all it takes:
  // the pass still snaps every other pixel to the room's palette, and his land
  // on themselves. Cheaper and more exact than lifting him out of the pass,
  // and it leaves him in the draw order where he belongs — under the
  // foreground, over the wall.
  keepColours(hex) {
    this.keep = hex.slice();
    this.seedKeep();
  }

  seedKeep() {
    for (const h of this.keep) {
      const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
      this.lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
  }

  // Held upright, the controls go UNDER the picture rather than on top of it.
  //
  // A thumb on a phone held in portrait covers the bottom third of the glass,
  // and in a game where the thing that kills you is usually at your feet that
  // is the third you most need to see. So portrait gives the picture the top of
  // the screen and hands the rest over to a real control panel; the game is
  // never behind a finger. Landscape has room for both, so there the pad goes
  // back over the picture where a thumb already rests — and only on a
  // touchscreen, because a mouse does not need a d-pad drawn for it.
  resize() {
    const dw = innerWidth, dh = innerHeight;
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.display.width = Math.floor(dw * dpr);
    this.display.height = Math.floor(dh * dpr);
    this.display.style.width = `${dw}px`;
    this.display.style.height = `${dh}px`;
    const DW = this.display.width, DH = this.display.height;

    this.portrait = DH > DW * 1.12;
    if (this.portrait) {
      // fit the width, but never let the picture eat the panel: a control band
      // under about 30% of the height stops being tappable
      const fit = Math.min(DW / W, (DH * 0.60) / H);
      const s = this.scaleMode === 'integer4' ? Math.max(1, Math.min(4, Math.floor(fit))) : fit;
      this.scale = s;
      this.ox = Math.floor((DW - W * s) / 2);
      this.oy = Math.floor(Math.min(DH * 0.06, (DH - H * s) * 0.25));
      const top = this.oy + H * s;
      this.band = { x: 0, y: Math.round(top), w: DW, h: Math.round(DH - top) };
    } else {
      const fit = Math.min(DW / W, DH / H);
      const s = this.scaleMode === 'integer4' ? Math.max(1, Math.min(4, Math.floor(fit))) : fit;
      this.scale = s;
      this.ox = Math.floor((DW - W * s) / 2);
      this.oy = Math.floor((DH - H * s) / 2);
      this.band = null;
    }
    this.dctx.imageSmoothingEnabled = false;
  }

  setScaleMode(mode) {
    this.scaleMode = mode === 'integer4' ? 'integer4' : 'fit';
    try { window.localStorage?.setItem('flashPrinceScale', this.scaleMode); } catch { /* private/embed mode */ }
    this.resize();
  }

  // a pointer in client space → a point in the 320×192 picture
  toPicture(cx, cy) {
    const r = this.display.getBoundingClientRect();
    const dpr = this.display.width / r.width;
    return {
      x: ((cx - r.left) * dpr - this.ox) / this.scale,
      y: ((cy - r.top) * dpr - this.oy) / this.scale,
    };
  }

  // …and → a point on the display canvas, which is where the controls live.
  // They are drawn in real pixels rather than picture pixels on purpose: a
  // button is chrome, not part of the sixteen-colour world, and at a 3x upscale
  // a picture-space button is a blurry lump with letters four pixels tall.
  toDisplay(cx, cy) {
    const r = this.display.getBoundingClientRect();
    const dpr = this.display.width / r.width;
    return { x: (cx - r.left) * dpr, y: (cy - r.top) * dpr };
  }

  // a rect in picture space → the same rect on the display canvas
  pictureRect(x, y, w, h) {
    return {
      x: this.ox + x * this.scale, y: this.oy + y * this.scale,
      w: w * this.scale, h: h * this.scale,
    };
  }

  // ── the primitives. everything the game draws is one of these ──────
  clear(ci = 0) { this.ctx.fillStyle = this.hex[ci]; this.ctx.fillRect(0, 0, W, H); }

  rect(x, y, w, h, ci) {
    this.ctx.fillStyle = this.hex[ci];
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // pts is a flat [x0,y0, x1,y1, …]. Flat arrays because a polygon a frame for
  // eleven limbs across a dozen actors is the one place here that allocates.
  poly(pts, ci, alpha = 1) {
    const c = this.ctx;
    c.globalAlpha = alpha;
    c.fillStyle = this.hex[ci];
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
  }

  // A polygon laid over what is already there at half strength. Another World
  // had exactly one of these — a blend mode used for water, shadow and the
  // glow off a beam — and after the quantise pass it lands on a real palette
  // colour rather than on a translucent smear, same as the original did.
  veil(pts, ci, alpha = 0.5) { this.poly(pts, ci, alpha); }

  disc(cx, cy, r, ci, alpha = 1) {
    const c = this.ctx;
    c.globalAlpha = alpha;
    c.fillStyle = this.hex[ci];
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  }

  line(x0, y0, x1, y1, ci, w = 1) {
    const c = this.ctx;
    c.strokeStyle = this.hex[ci];
    c.lineWidth = w;
    c.beginPath();
    c.moveTo(x0, y0); c.lineTo(x1, y1);
    c.stroke();
  }

  // a limb: a quad that tapers from w0 at one end to w1 at the other
  limb(x0, y0, x1, y1, w0, w1, ci) {
    const dx = x1 - x0, dy = y1 - y0;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    this.poly([
      x0 + nx * w0, y0 + ny * w0, x1 + nx * w1, y1 + ny * w1,
      x1 - nx * w1, y1 - ny * w1, x0 - nx * w0, y0 - ny * w0,
    ], ci);
  }

  // A sprite, straight into the framebuffer at whole pixels and no scaling, so
  // what lands is exactly what was in the sheet.
  blit(img, sx, sy, sw, sh, dx, dy, flip) {
    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    if (flip) {
      c.save();
      c.translate(dx + sw, dy);
      c.scale(-1, 1);
      c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      c.restore();
    } else {
      c.drawImage(img, sx, sy, sw, sh, dx, dy, sw, sh);
    }
  }

  text(str, x, y, ci, size = 8) {
    const c = this.ctx;
    c.fillStyle = this.hex[ci];
    c.font = `${size}px "Courier New", monospace`;
    c.textBaseline = 'top';
    c.fillText(str, Math.round(x), Math.round(y));
  }

  textW(str, size = 8) {
    this.ctx.font = `${size}px "Courier New", monospace`;
    return this.ctx.measureText(str).width;
  }

  // Anything that does not move gets painted once and blitted after that. A
  // room's rock, sky and colonnade is a few hundred polygons and it is the same
  // few hundred polygons for as long as you are standing in it; only the man
  // and what is trying to kill him are redrawn per frame.
  cached(key, draw) {
    let c = this.cacheMap.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = W; c.height = H;
      const prev = this.ctx;
      this.ctx = c.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      draw();
      this.ctx = prev;
      if (this.cacheMap.size > 8) this.cacheMap.delete(this.cacheMap.keys().next().value);
      this.cacheMap.set(key, c);
    }
    this.ctx.drawImage(c, 0, 0);
  }

  dropCache() { this.cacheMap.clear(); }

  // ── out to the glass ───────────────────────────────────────────────
  present() {
    if (this.pure) this.quantise();
    const d = this.dctx;
    d.fillStyle = '#000';
    d.fillRect(0, 0, this.display.width, this.display.height);
    d.imageSmoothingEnabled = false;
    d.drawImage(this.buf, this.ox, this.oy, W * this.scale, H * this.scale);
  }

  quantise() {
    const img = this.ctx.getImageData(0, 0, W, H);
    const px = new Uint32Array(img.data.buffer);
    const lut = this.lut, rgb = this.rgb;
    for (let i = 0; i < px.length; i++) {
      const v = px[i];
      const r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255;
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let out = lut[key];
      if (!out) {
        let best = 0, bd = 1e9;
        for (let c = 0; c < 16; c++) {
          const cr = rgb[c] & 255, cg = (rgb[c] >> 8) & 255, cb = (rgb[c] >> 16) & 255;
          const dr = r - cr, dg = g - cg, db = b - cb;
          const d = dr * dr * 3 + dg * dg * 4 + db * db * 2;   // eyes are not linear
          if (d < bd) { bd = d; best = c; }
        }
        out = lut[key] = rgb[best];
      }
      px[i] = out;
    }
    this.ctx.putImageData(img, 0, 0);
  }
}
