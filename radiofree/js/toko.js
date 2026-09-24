// Toko, the codec portrait: the owner's approved mark — the face in white on
// magenta, as a badge — and nothing else, because the face is the only
// original art of him (see anchor.js). The mouth is driven by the same value
// that types the bulletin; in DECODE the picture goes amber and tears.

import { PAL } from './palette.js?v=70';
import { bayer, mix } from './screen.js?v=70';
import { drawMasterBadge } from '../../toko/js/master.js';
import { WAYS, STICKER } from '../../toko/js/palette.js';


export class Toko {
  constructor() {
    this.mouth = 0;        // 0..1, set by the reader each frame
    this.blink = 0;        // seconds left in a blink
    this.nextBlink = 2.4;
    this.glitch = 0;       // decode tearing, 0..1
    this.t = 0;
  }

  update(dt, mouth, decoding) {
    this.t += dt;
    this.mouth += (mouth - this.mouth) * Math.min(1, dt * 22);   // no snapping
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blink = 0.12; this.nextBlink = 1.8 + Math.random() * 3.4; }
    if (this.blink > 0) this.blink -= dt;
    const want = decoding ? 1 : 0;
    this.glitch += (want - this.glitch) * Math.min(1, dt * 5);
  }

  // the codec's video half. `signal` (0..1) fades the picture up on connect.
  // `full` true = face shot fills the upper panel (larger, no booth clutter).
  //
  // The approved badge — the same mark the anchor shot draws. The teal gel
  // and the hooded figure that sat here before were not his.
  draw(scr, signal = 1, full = false) {
    const g = this.glitch;
    const c = scr.ctx;
    scr.px(0, 0, scr.w, scr.h, mix('#050507', '#1a1208', g * 0.7));
    const r = scr.w * (full ? 0.36 : 0.34);
    const cx = scr.w / 2;
    const cy = scr.h * 0.5 + Math.sin(this.t * 1.4) * 1.2;
    const glow = c.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.2);
    glow.addColorStop(0, 'rgba(240,2,127,0.34)');
    glow.addColorStop(1, 'rgba(240,2,127,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, scr.w, scr.h);
    drawMasterBadge(c, cx, cy, r, {
      ground: g > 0.5 ? STICKER.YELLOW : WAYS.SIGN.ground, ink: WAYS.SIGN.ink,
      squash: this.blink > 0 ? 0.08 : 1, grin: 1 + this.mouth * 0.07,
    });
    this.grain(scr, signal, g);
    this.sweep(scr);
    scr.scanlines(PAL.INK, 3);
    if (g > 0.05) this.tear(scr, g);
  }

  grain(scr, signal, g) {
    const amount = (1 - signal) * 0.7 + 0.035 + g * 0.05;
    if (amount <= 0.02) return;
    const speck = mix(PAL.STATIC, PAL.AMBER_DIM, g);
    for (let y = 0; y < scr.h; y += 2) {
      for (let x = 0; x < scr.w; x += 2) {
        if (bayer(x >> 1, y >> 1) < amount * (0.5 + Math.random() * 0.5)) {
          scr.px(x, y, 2, 2, Math.random() < 0.5 ? speck : PAL.INK);
        }
      }
    }
  }

  sweep(scr) {
    const y = (this.t * 26) % (scr.h + 24) - 12;
    scr.ctx.globalAlpha = 0.16;
    scr.px(0, y, scr.w, 6, PAL.GREEN_HOT);
    scr.ctx.globalAlpha = 1;
    scr.px(0, y + 6, scr.w, 1, PAL.GREEN_LO);
  }

  tear(scr, g) {
    const bands = 1 + Math.floor(g * 3);
    for (let i = 0; i < bands; i++) {
      const y = Math.floor((Math.sin(this.t * 3.1 + i * 2.3) * 0.5 + 0.5) * (scr.h - 8));
      const h = 2 + ((i * 3) % 5);
      const dx = Math.round(Math.sin(this.t * 9 + i) * 5 * g);
      if (dx === 0) continue;
      const img = scr.ctx.getImageData(0, y, scr.w, h);
      scr.ctx.putImageData(img, dx, y);
    }
  }
}
