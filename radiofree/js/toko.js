// Toko, the anchor. The gel from Toko Drop sat down in front of a microphone.
//
// Drawn, never sprited: a teal blob that wobbles like set gelatin (rx and ry
// breathe in opposite phase, which is what sells jelly), a specular dot, two
// dark eyes that blink, and a mouth driven by the same value that types the
// bulletin — so the face is lip-synced to the words rather than flapping on a
// timer. In DECODE the picture goes amber and starts tearing: the anchor has
// stopped reading the official copy.

import { PAL } from './palette.js?v=7';
import { bayer, mix, shade } from './screen.js?v=7';

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
    // the screen is the key light: a cold rim along the underside of the head,
    // and its spill up from the bottom of the frame. In the reference the room
    // is dark and the laptop is doing all the work on the face.
    const screenLit = mix('#7fd8ea', PAL.AMBER_HOT, g * 0.85);
    for (let dy = Math.floor(ry * 0.4); dy <= ry; dy++) {
      const k = 1 - (dy * dy) / (ry * ry);
      if (k <= 0) continue;
      const dx = Math.floor(rx * Math.sqrt(k));
      scr.px(CX + dx - 2, cy + dy, 2, 1, shade(screenLit, 0.55));
      scr.px(CX - dx, cy + dy, 2, 1, shade(screenLit, 0.4));
    }
    scr.ellipse(CX - 9, cy - 11, 4, 3, PAL.SPECULAR);   // the specular dot
    scr.px(CX - 3, cy - 15, 2, 2, PAL.SPECULAR);

    this.face(scr, cy, g);
    this.mic(scr, cy);
    for (let y = scr.h - 10; y < scr.h; y++) {          // screen spill, off-frame
      const up = (scr.h - y) / 10;
      for (let x = 0; x < scr.w; x += 2) {
        if (bayer(x >> 1, y >> 1) < (1 - up) * 0.5) {
          scr.px(x, y, 2, 1, shade(mix('#5aa0b4', PAL.AMBER_DIM, g * 0.8), 0.8));
        }
      }
    }

    // video treatment: grain, then the codec's slow sweep, then scanlines
    this.grain(scr, signal, g);
    this.sweep(scr);
    scr.scanlines(PAL.INK, 3);
    if (g > 0.05) this.tear(scr, g);
  }

  // Not a studio — a flat after dark.
  //
  // The reference for this station is one person on a sofa with a laptop and a
  // handheld, warm bulbs strung across the ceiling and a kitchen behind them.
  // That room is what makes it pirate: a newsroom would mean somebody signs off
  // on the copy. It was acoustic foam before, which told the opposite story.
  booth(scr, g) {
    const back = mix('#0a1418', '#1a1208', g * 0.85);
    scr.px(0, 0, scr.w, scr.h, back);

    // the kitchen behind: upper cabinets, then the counter under them
    const unit = mix('#101d21', '#1d150b', g * 0.8);
    for (let x = 0; x < scr.w; x += 16) {
      scr.px(x, 26, 15, 22, unit);
      scr.px(x, 26, 15, 1, shade(unit, 1.4));
    }
    // the one real light back there: the cool strip under the cabinets, and
    // its spill down onto the worktop
    const strip = mix('#9fd8e0', '#d8c08a', g * 0.6);
    scr.px(4, 49, scr.w - 8, 1, strip);
    for (let x = 4; x < scr.w - 4; x += 2) {
      if (bayer(x >> 1, 12) < 0.5) scr.px(x, 50, 2, 3, shade(strip, 0.3));
    }
    scr.px(0, 54, scr.w, 16, shade(unit, 0.7));
    scr.px(0, 54, scr.w, 1, shade(unit, 1.15));

    // The bulb string. This is the only warm light in the app that is not the
    // decode, so it is kept dim and low-saturation on purpose — amber has one
    // job here and it is not "room lighting".
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

// ── the wide shot ──────────────────────────────────────────────────
// The master. Same room, camera pulled back: the desk, the laptop she is
// reading off, the bulb string, her small in the frame. Cutting to this from
// the close portrait is what makes the post read as an edited package rather
// than a fixed two-frame codec — it is a different shot of the same person,
// not the same shot twice.
export function drawWide(scr, toko, signal = 1) {
  const g = toko.glitch;
  const body = mix(PAL.GEL, PAL.AMBER, g * 0.92);
  const deep = mix(PAL.GEL_DEEP, PAL.AMBER_DIM, g * 0.92);
  const back = mix('#0a1418', '#1a1208', g * 0.85);
  const W = scr.w, H = scr.h;

  scr.clear(back);

  // the kitchen along the back wall, further away than in the close-up
  const unit = mix('#101d21', '#1d150b', g * 0.8);
  for (let x = 0; x < W; x += 20) {
    scr.px(x, 40, 19, 26, unit);
    scr.px(x, 40, 19, 1, shade(unit, 1.4));
  }
  const strip = mix('#9fd8e0', '#d8c08a', g * 0.6);
  scr.px(6, 67, W - 12, 1, strip);
  for (let x = 6; x < W - 6; x += 2) {
    if (bayer(x >> 1, 20) < 0.5) scr.px(x, 68, 2, 3, shade(strip, 0.28));
  }
  scr.px(0, 72, W, 14, shade(unit, 0.7));

  // the bulb string, wider and slacker at this distance
  const bulbs = [[14, 18], [42, 26], [70, 20], [98, 27], [120, 16]];
  let prev = [0, 12];
  for (const [bx, by] of [...bulbs, [W - 1, 14]]) {
    scr.line(prev[0], prev[1], bx, by, '#241f16');
    prev = [bx, by];
  }
  for (const [bx, by] of bulbs) {
    const k = 0.55 + 0.45 * Math.sin(toko.t * 1.4 + bx * 0.3);
    const warm = mix('#5c3f1e', '#8a6533', k);
    scr.px(bx, by, 2, 3, warm);
    scr.px(bx - 1, by + 3, 4, 1, shade(warm, 0.5));
  }

  // her, small, behind the table
  const cx = 54, cy = 96, r = 15;
  const w = Math.sin(toko.t * 2.1) * 0.05;
  scr.ellipse(cx, cy + 20, 15, 8, deep);                    // shoulders
  scr.ellipse(cx, cy, r * (1 + w), r * (1 - w), deep);
  scr.ellipse(cx, cy + 1, r * (1 + w) - 1, r * (1 - w) - 1, body);
  const shut = toko.blink > 0;
  for (const sx of [-1, 1]) {
    if (shut) scr.px(cx + sx * 5 - 2, cy - 2, 4, 1, PAL.GEL_EYE);
    else scr.ellipse(cx + sx * 5, cy - 2, 2, 2, PAL.GEL_EYE);
  }
  const open = Math.max(0, toko.mouth);
  scr.ellipse(cx, cy + 6, 3 + open * 2, 1 + open * 3, mix(PAL.GEL_EYE, '#3a1005', g * 0.6));
  scr.px(cx - 5, cy - 7, 2, 2, PAL.SPECULAR);
  scr.px(cx + 14, cy - 3, 3, 7, '#1d2a2e');                  // the headset, at range

  // the table, and the laptop she is reading off — the key light in the room
  scr.px(0, 118, W, 34, shade(back, 0.55));
  scr.px(0, 118, W, 1, shade(back, 1.7));
  const lidX = cx + 4;
  scr.px(lidX - 16, 104, 32, 15, '#161d21');                 // the open lid, from behind
  scr.px(lidX - 14, 106, 28, 11, mix('#2a4a52', PAL.AMBER_DIM, g * 0.7));
  scr.px(lidX - 18, 119, 38, 3, '#1d262a');                  // the keyboard deck
  // What is on the table. The wide has to say "flat, not studio" in one look,
  // and the room alone cannot — a bare surface reads as a set. A mug, a tangle
  // of cable and a face-down phone do it, sitting in silhouette against the
  // laptop so they cost nothing but an outline.
  const prop = shade(back, 0.3), lip = shade(back, 1.5);
  scr.px(18, 124, 9, 10, prop); scr.px(18, 124, 9, 1, lip);   // the mug
  scr.px(27, 127, 3, 4, prop);                                 // its handle
  scr.px(96, 130, 16, 5, prop); scr.px(96, 130, 16, 1, lip);   // the phone, face down
  scr.line(38, 138, 60, 133, prop);                            // cable, coiled off the deck
  scr.line(60, 133, 78, 140, prop);
  scr.px(0, 143, W, 9, shade(back, 0.18));                     // the near edge, in shadow

  // its glow, up onto her and out across the table
  for (let y = 96; y < 122; y++) {
    const up = 1 - (122 - y) / 26;
    for (let x = lidX - 26; x < lidX + 26; x += 2) {
      if (bayer(x >> 1, y >> 1) < up * 0.34) {
        scr.px(x, y, 2, 1, shade(mix('#5aa0b4', PAL.AMBER_DIM, g * 0.8), 0.7));
      }
    }
  }

  // the same video treatment as the close-up, so the cut stays inside one feed
  toko.grain(scr, signal, g);
  toko.sweep(scr);
  scr.scanlines(PAL.INK, 3);
  if (g > 0.05) toko.tear(scr, g);
}
