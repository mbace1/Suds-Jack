// paint.js — the painting. Every splat and settled chunk is drawn into one
// canvas laid over the slab, and nothing ever clears it until the next night
// (DIRECTION: "by sunrise the slab is a painting of how you played"). It is a
// plain 2D canvas because the results screen will want to SHARE it as an
// image, and a canvas already is one.
import * as THREE from 'three/webgpu';
import { TUNING } from '../tuning.js?v=3';

const T = TUNING;
const W = T.driveway.slab.width, D = T.driveway.slab.depth;
const PX = T.paint.pxPerUnit;

export class Paint {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(W * PX); this.canvas.height = Math.round(D * PX);
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.dirty = false;
  }

  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); this.dirty = true; }

  // world (x, z) → canvas px; the canvas top edge is the garage (z = −D/2)
  _at(x, z) { return [(x + W / 2) * PX, (z + D / 2) * PX]; }

  // `drops` is how many flung drops ring the puddle: a kill throws a few, a
  // chunk settling where it landed throws none (they were what turned the
  // slab into gravel by the second hour).
  splat(x, z, r, hex, alpha = 0.8, drops = 2 + Math.floor(Math.random() * 3)) {
    const [cx, cy] = this._at(x, z), ctx = this.ctx, R = r * PX;
    const c = new THREE.Color(hex).multiplyScalar(T.paint.darken);
    const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
    ctx.fillStyle = `rgba(${rgb},${alpha})`;
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * (0.75 + Math.random() * 0.3), Math.random() * Math.PI, 0, Math.PI * 2); ctx.fill();
    // flung drops: a splat is a puddle and the drops it threw
    for (let i = 0; i < drops; i++) {
      const a = Math.random() * Math.PI * 2, d = R * (1.05 + Math.random() * 0.7), s = R * (0.1 + Math.random() * 0.14);
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 0, Math.PI * 2); ctx.fill();
    }
    // a wet sheen, lighter, off-centre
    ctx.fillStyle = `rgba(255,255,255,${0.08 * alpha})`;
    ctx.beginPath(); ctx.ellipse(cx - R * 0.25, cy - R * 0.25, R * 0.35, R * 0.2, -0.6, 0, Math.PI * 2); ctx.fill();
    this.dirty = true;
  }

  update() { if (this.dirty) { this.texture.needsUpdate = true; this.dirty = false; } }
}
