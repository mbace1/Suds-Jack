// Debris, shots, and the screen flinching.
//
// Kept deliberately thin. Another World's whole effects budget was a handful of
// polygons going outwards and the palette going white for two frames, and on a
// flat 16-colour screen that is still the strongest thing available: there is
// no glow to lean on, so an impact has to be read as SHAPE and TIMING.

import { C } from './palette.js';

export class Fx {
  constructor() {
    this.bits = [];
    this.shots = [];
    this.shake = 0;
    this.flash = 0;
  }

  burst(x, y, ci, n = 10, spread = 2.4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 0.4 + Math.random() * spread;
      this.bits.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
        life: 18 + Math.random() * 22, ci, g: 0.16, sz: 1 + (Math.random() * 2 | 0),
      });
    }
    this.shake = Math.min(6, this.shake + 2.4);
  }

  dust(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      this.bits.push({
        x: x + (Math.random() - 0.5) * 10, y, vx: (Math.random() - 0.5) * 1.1,
        vy: -Math.random() * 0.7, life: 12 + Math.random() * 12, ci: C.EDGE, g: 0.02, sz: 1,
      });
    }
  }

  shoot(x, y, vx, vy, from, slow = false) {
    this.shots.push({ x, y, px: x, py: y, vx, vy, from, slow, life: 150 });
  }

  update() {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 0.42);
    if (this.flash > 0) this.flash--;
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const b = this.bits[i];
      b.x += b.vx; b.y += b.vy; b.vy += b.g; b.life--;
      if (b.life <= 0) this.bits.splice(i, 1);
    }
  }

  clear() { this.bits.length = 0; this.shots.length = 0; }

  draw(scr) {
    for (const b of this.bits) scr.rect(b.x, b.y, b.sz, b.sz, b.ci);
    for (const s of this.shots) {
      if (s.slow) {
        scr.disc(s.x, s.y, 3, C.LUX);
        scr.disc(s.x, s.y, 1.5, C.LUX2);
      } else {
        // a bolt is a streak, because a dot travelling at 3.4px a frame is
        // invisible and an unreadable shot is an unfair one
        const c = s.from === 'me' ? C.LUX2 : C.ALERT;
        scr.rect(Math.min(s.x, s.x - s.vx * 3), s.y - 1, Math.abs(s.vx * 3) + 2, 2, c);
        scr.rect(s.x - 1, s.y - 1, 3, 2, C.EDGE);
      }
    }
  }
}
