// Toko, the anchor. The gel from Toko Drop sat down in front of a microphone.
//
// Drawn, never sprited: a teal blob that wobbles like set gelatin (rx and ry
// breathe in opposite phase, which is what sells jelly), a specular dot, two
// dark eyes that blink, and a mouth driven by the same value that types the
// bulletin — so the face is lip-synced to the words rather than flapping on a
// timer. In DECODE the picture goes amber and starts tearing: the anchor has
// stopped reading the official copy.

import { PAL } from './palette.js?v=3';
import { bayer, mix, shade } from './screen.js?v=3';

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
  draw(scr, signal = 1) {
    // teal lerped only part-way to amber lands on olive, which reads as a
    // rendering fault rather than a mood — the decode tint has to commit
    const g = this.glitch;
    const body = mix(PAL.GEL, PAL.AMBER, g * 0.92);
    const deep = mix(PAL.GEL_DEEP, PAL.AMBER_DIM, g * 0.92);
    const rim  = mix(PAL.GEL_RIM, PAL.AMBER_HOT, g * 0.92);

    scr.clear(PAL.PANEL_LO);
    this.booth(scr, g);

    // the wobble: volume is conserved, so wide means short
    const w = Math.sin(this.t * 2.1) * 0.06 + Math.sin(this.t * 3.7) * 0.02;
    const rx = R * (1 + w), ry = R * (1 - w);
    const bob = Math.sin(this.t * 1.4) * 1.6;
    const cy = CY + bob;

    // shoulders first, so the head sits in front of them
    scr.ellipse(CX, cy + 30, 24, 12, deep);
    scr.ellipse(CX, cy + 29, 22, 10, shade(body, 0.72));

    // the head: deep core, lighter face, bright rim on the upper left
    scr.ellipse(CX, cy, rx, ry, deep);
    scr.ellipse(CX, cy + 1, rx - 1, ry - 1, body);
    for (let dy = -ry; dy <= 0; dy++) {                 // gel rim light
      const k = 1 - (dy * dy) / (ry * ry);
      if (k <= 0) continue;
      const dx = Math.floor(rx * Math.sqrt(k));
      scr.px(CX - dx + 1, cy + dy, 3, 1, rim);
    }
    scr.ellipse(CX - 9, cy - 11, 4, 3, PAL.SPECULAR);   // the specular dot
    scr.px(CX - 3, cy - 15, 2, 2, PAL.SPECULAR);

    this.face(scr, cy, g);
    this.mic(scr, cy);

    // video treatment: grain, then the codec's slow sweep, then scanlines
    this.grain(scr, signal, g);
    this.sweep(scr);
    scr.scanlines(PAL.INK, 3);
    if (g > 0.05) this.tear(scr, g);
  }

  // a suggestion of a broadcast booth behind the anchor: foam wall squares and
  // a mast light, dark enough to stay background
  booth(scr, g) {
    const back = mix('#0d2229', '#241a0e', g * 0.85);
    scr.px(0, 0, scr.w, scr.h, back);
    // acoustic foam: wide, low-contrast wedges. An earlier pass used 6px tiles
    // at high contrast and the wall read as static rather than as a room.
    const tile = shade(back, 1.14);
    for (let y = 2; y < 76; y += 12) {
      for (let x = 2; x < scr.w - 2; x += 12) {
        if (((x / 12 | 0) + (y / 12 | 0)) % 2) scr.px(x, y, 10, 10, tile);
      }
    }
    scr.px(0, 76, scr.w, 1, shade(back, 1.4));            // the desk edge behind
    // the on-air lamp, breathing
    const on = 0.6 + 0.4 * Math.sin(this.t * 2.2);
    scr.px(scr.w - 12, 6, 8, 4, mix('#331111', PAL.DEFENCE, on));
    scr.px(scr.w - 12, 10, 8, 1, '#220c0c');
  }

  face(scr, cy, g) {
    const shut = this.blink > 0;
    const eye = mix(PAL.GEL_EYE, '#2a1400', g * 0.5);
    for (const sx of [-1, 1]) {
      const ex = CX + sx * 9;
      if (shut) {
        scr.px(ex - 3, cy - 3, 7, 1, eye);
      } else {
        scr.ellipse(ex, cy - 4, 3, 4, eye);
        scr.px(ex - 1, cy - 6, 2, 2, PAL.SPECULAR);     // catchlight
      }
    }
    // the mouth: a gel slot that opens downward. Shape follows the amplitude,
    // so a long vowel gapes and a consonant barely parts it.
    const open = Math.max(0, this.mouth);
    const mw = 5 + open * 4;
    const mh = 1 + open * 6;
    scr.ellipse(CX, cy + 9 + mh * 0.3, mw, mh, mix(PAL.GEL_EYE, '#3a1005', g * 0.6));
    if (open > 0.35) scr.ellipse(CX, cy + 10 + mh * 0.4, Math.max(1, mw - 3), Math.max(1, mh - 2), '#5b1f14');
    scr.px(CX - mw, cy + 8, mw * 2, 1, shade(PAL.GEL_DEEP, 0.8));
  }

  // headset and boom mic — the prop that turns a blob into an announcer.
  // The capsule has to stay clear of the mouth: parked on top of it, it read
  // as a tongue and killed the lip-sync the whole portrait is built on.
  mic(scr, cy) {
    scr.px(CX + 23, cy - 7, 4, 12, '#1d2a2e');                  // ear cup
    scr.px(CX + 22, cy - 9, 6, 3, '#33474d');
    scr.px(CX + 24, cy - 12, 2, 4, '#33474d');                  // headband stub
    for (let i = 0; i < 9; i++) {                               // boom, out and down
      scr.px(CX + 24 - i * 1.1, cy + 5 + i * 1.05, 2, 2, '#2b3a3f');
    }
    scr.disc(CX + 15, cy + 15, 4, '#162023');                   // the capsule
    scr.disc(CX + 15, cy + 15, 3, '#3d5a63');
    scr.px(CX + 13, cy + 13, 2, 2, '#84a6ae');                  // its highlight
  }

  // dithered video noise. Heavier while the signal is still coming up, and
  // heavier again in decode.
  grain(scr, signal, g) {
    // enough to say "video feed", not enough to eat the face. The decode is
    // signalled by the tear and the colour, not by burying the picture.
    const amount = (1 - signal) * 0.7 + 0.035 + g * 0.05;
    if (amount <= 0.02) return;
    // the speckle has to follow the tint too — teal grain left over an amber
    // picture reads as two pictures fighting rather than as one noisy feed
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

  // horizontal displacement bands — the picture coming apart under the decode
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
