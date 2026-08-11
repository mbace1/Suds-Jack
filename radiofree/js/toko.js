// Toko, the anchor. Male Japanese gel from Toko Drop, always masked.
//
// Drawn, never sprited: a teal blob that wobbles like set gelatin (rx and ry
// breathe in opposite phase), a specular dot, two dark eyes that blink, and a
// mouth driven by the same value that types the bulletin — lip-synced, not
// flapping on a timer. The mask never comes off. In DECODE the picture goes
// amber and starts tearing: the anchor has stopped reading the official copy.

import { PAL } from './palette.js?v=43';
import { bayer, mix, shade } from './screen.js?v=43';

const CX = 48, CY = 52, R = 26;

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
  draw(scr, signal = 1, full = false) {
    const g = this.glitch;
    const body = mix(PAL.GEL, PAL.AMBER, g * 0.92);
    const deep = mix(PAL.GEL_DEEP, PAL.AMBER_DIM, g * 0.92);
    const rim  = mix(PAL.GEL_RIM, PAL.AMBER_HOT, g * 0.92);

    scr.clear(PAL.PANEL_LO);
    if (!full) this.booth(scr, g);
    else {
      // face-shot backdrop: pure dark with a faint phosphor wash
      scr.px(0, 0, scr.w, scr.h, mix('#050c10', '#1a1208', g * 0.7));
    }

    const scale = full ? 1.55 : 1;
    const cx = full ? scr.w / 2 : CX;
    const baseCy = full ? scr.h * 0.48 : CY;
    const r = R * scale;

    const w = Math.sin(this.t * 2.1) * 0.06 + Math.sin(this.t * 3.7) * 0.02;
    const rx = r * (1 + w), ry = r * (1 - w);
    const bob = Math.sin(this.t * 1.4) * 1.6 * scale;
    const cy = baseCy + bob;

    // shoulders
    scr.ellipse(cx, cy + 30 * scale, 24 * scale, 12 * scale, deep);
    scr.ellipse(cx, cy + 29 * scale, 22 * scale, 10 * scale, shade(body, 0.72));

    // head
    scr.ellipse(cx, cy, rx, ry, deep);
    scr.ellipse(cx, cy + 1, rx - 1, ry - 1, body);
    for (let dy = -ry; dy <= 0; dy++) {
      const k = 1 - (dy * dy) / (ry * ry);
      if (k <= 0) continue;
      const dx = Math.floor(rx * Math.sqrt(k));
      scr.px(cx - dx + 1, cy + dy, 3, 1, rim);
    }
    const screenLit = mix('#7fd8ea', PAL.AMBER_HOT, g * 0.85);
    for (let dy = Math.floor(ry * 0.4); dy <= ry; dy++) {
      const k = 1 - (dy * dy) / (ry * ry);
      if (k <= 0) continue;
      const dx = Math.floor(rx * Math.sqrt(k));
      scr.px(cx + dx - 2, cy + dy, 2, 1, shade(screenLit, 0.55));
      scr.px(cx - dx, cy + dy, 2, 1, shade(screenLit, 0.4));
    }
    scr.ellipse(cx - 9 * scale, cy - 11 * scale, 4 * scale, 3 * scale, PAL.SPECULAR);
    scr.px(cx - 3 * scale, cy - 15 * scale, 2, 2, PAL.SPECULAR);

    this.face(scr, cx, cy, scale, g);
    this.mask(scr, cx, cy, scale, g);
    this.mic(scr, cx, cy, scale);

    if (!full) {
      for (let y = scr.h - 10; y < scr.h; y++) {
        const up = (scr.h - y) / 10;
        for (let x = 0; x < scr.w; x += 2) {
          if (bayer(x >> 1, y >> 1) < (1 - up) * 0.5) {
            scr.px(x, y, 2, 1, shade(mix('#5aa0b4', PAL.AMBER_DIM, g * 0.8), 0.8));
          }
        }
      }
    }

    this.grain(scr, signal, g);
    this.sweep(scr);
    scr.scanlines(PAL.INK, 3);
    if (g > 0.05) this.tear(scr, g);
  }

  booth(scr, g) {
    const back = mix('#0a1418', '#1a1208', g * 0.85);
    scr.px(0, 0, scr.w, scr.h, back);

    const unit = mix('#101d21', '#1d150b', g * 0.8);
    for (let x = 0; x < scr.w; x += 16) {
      scr.px(x, 26, 15, 22, unit);
      scr.px(x, 26, 15, 1, shade(unit, 1.4));
    }
    const strip = mix('#9fd8e0', '#d8c08a', g * 0.6);
    scr.px(4, 49, scr.w - 8, 1, strip);
    for (let x = 4; x < scr.w - 4; x += 2) {
      if (bayer(x >> 1, 12) < 0.5) scr.px(x, 50, 2, 3, shade(strip, 0.3));
    }
    scr.px(0, 54, scr.w, 16, shade(unit, 0.7));
    scr.px(0, 54, scr.w, 1, shade(unit, 1.15));

    const bulbs = [[10, 15], [30, 21], [52, 17], [72, 23], [90, 13]];
    let prev = [0, 9];
    for (const [bx, by] of [...bulbs, [scr.w - 1, 11]]) {
      scr.line(prev[0], prev[1], bx, by, '#241f16');
      prev = [bx, by];
    }
    for (const [bx, by] of bulbs) {
      const k = 0.55 + 0.45 * Math.sin(this.t * 1.4 + bx * 0.3);
      const warm = mix('#5c3f1e', '#8a6533', k);
      scr.px(bx, by, 2, 3, warm);
      scr.px(bx - 1, by + 3, 4, 1, shade(warm, 0.5));
    }
  }

  face(scr, cx, cy, scale, g) {
    const shut = this.blink > 0;
    const eye = mix(PAL.GEL_EYE, '#2a1400', g * 0.5);
    for (const sx of [-1, 1]) {
      const ex = cx + sx * 9 * scale;
      if (shut) {
        scr.px(ex - 3 * scale, cy - 3 * scale, 7 * scale, 1, eye);
      } else {
        scr.ellipse(ex, cy - 4 * scale, 3 * scale, 4 * scale, eye);
        scr.px(ex - 1 * scale, cy - 6 * scale, 2, 2, PAL.SPECULAR);
      }
    }
    // mouth still moves under the mask (amplitude drives the mask flex)
    const open = Math.max(0, this.mouth);
    const mw = (5 + open * 4) * scale;
    const mh = (1 + open * 6) * scale;
    // drawn faintly so the mask sits on top; still feeds lip-sync feel via mask
    scr.ellipse(cx, cy + 9 * scale + mh * 0.3, mw, mh, mix(PAL.GEL_EYE, '#3a1005', g * 0.4));
  }

  // Always on. Covers nose and mouth; flexes slightly with speech amplitude.
  mask(scr, cx, cy, scale, g) {
    const open = Math.max(0, this.mouth);
    const flex = open * 2 * scale;
    const maskBody = mix('#1a2428', '#2a1e10', g * 0.85);
    const maskEdge = mix('#2e3c42', '#4a3820', g * 0.85);
    const strap = mix('#0e1416', '#1a1208', g * 0.7);

    // ear straps
    scr.px(cx - 28 * scale, cy - 2 * scale, 8 * scale, 2, strap);
    scr.px(cx + 20 * scale, cy - 2 * scale, 8 * scale, 2, strap);
    scr.px(cx - 26 * scale, cy + 6 * scale, 6 * scale, 2, strap);
    scr.px(cx + 20 * scale, cy + 6 * scale, 6 * scale, 2, strap);

    // main panel over nose/mouth
    const top = cy + 2 * scale;
    const h = (16 + flex) * scale;
    scr.ellipse(cx, top + h * 0.45, 18 * scale, h * 0.55, maskBody);
    scr.px(cx - 16 * scale, top, 32 * scale, 3, maskEdge);

    // pleat lines (surgical / tech mask)
    for (let i = 0; i < 3; i++) {
      const y = top + 5 * scale + i * (3.5 * scale) + flex * 0.3 * i;
      scr.px(cx - 14 * scale, y, 28 * scale, 1, shade(maskEdge, 0.7));
    }

    // small brand mark / filter badge on the side
    scr.px(cx + 10 * scale, top + 6 * scale, 4 * scale, 4 * scale, mix('#3a5058', PAL.AMBER_DIM, g * 0.5));
  }

  mic(scr, cx, cy, scale) {
    scr.px(cx + 23 * scale, cy - 7 * scale, 4 * scale, 12 * scale, '#1d2a2e');
    scr.px(cx + 22 * scale, cy - 9 * scale, 6 * scale, 3 * scale, '#33474d');
    scr.px(cx + 24 * scale, cy - 12 * scale, 2 * scale, 4 * scale, '#33474d');
    for (let i = 0; i < 9; i++) {
      scr.px(cx + (24 - i * 1.1) * scale, cy + (5 + i * 1.05) * scale, 2, 2, '#2b3a3f');
    }
    scr.disc(cx + 15 * scale, cy + 15 * scale, 4 * scale, '#162023');
    scr.disc(cx + 15 * scale, cy + 15 * scale, 3 * scale, '#3d5a63');
    scr.px(cx + 13 * scale, cy + 13 * scale, 2, 2, '#84a6ae');
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
