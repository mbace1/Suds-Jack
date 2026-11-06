// slam.js — how a giant's slam looks (v112; sim/slam.js is what it does). While it gathers, a ring on the floor at
// exactly its reach, filling in as the moment comes (a sign of where it will land, not a light: no glow, v104);
// when it lands, the ring jumps out and fades, and the giant's own goo is thrown round it (actors.spray).
// Reads the world, never writes it.
import * as THREE from 'three/webgpu';
import { TUNING } from '../tuning.js?v=119';
import { reach } from '../sim/slam.js?v=119';

const T = TUNING, MAX = 6;

export class SlamView {
  constructor(scene, actors) {
    this.scene = scene; this.actors = actors; this.bursts = [];
    const ring = new THREE.RingGeometry(0.93, 1, 72).rotateX(-Math.PI / 2), disc = new THREE.CircleGeometry(0.93, 72).rotateX(-Math.PI / 2);
    const mat = (c, o) => new THREE.MeshBasicNodeMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
    this.rings = Array.from({ length: MAX }, () => {
      const g = new THREE.Group(), r = new THREE.Mesh(ring, mat(0xff5530, 0)), d = new THREE.Mesh(disc, mat(0xff5530, 0));
      r.renderOrder = d.renderOrder = 2; g.add(d, r); g.visible = false; scene.add(g);
      return { g, r, d };
    });
  }
  reset() { for (const R of this.rings) R.g.visible = false; this.bursts.length = 0; }
  onEvent(e) {
    if (e.type !== 'slam') return;
    this.bursts.push({ x: e.x, z: e.z, r: e.r, t: 0 });
    // the giant's goo, thrown round it as it lands
    this.actors.spray?.(e.x, e.z, 10, e.color ?? 0xffffff, [0.08, 0.16]);
  }
  sync(w, alpha, time) {
    const dt = this._t === undefined ? 1 / 60 : Math.max(0, Math.min(0.1, time - this._t));
    this._t = time;
    let k = 0;
    const L = T.sizes.slam;
    for (const g of w?.gels ?? []) {
      if (k >= MAX) break;
      if (!g.alive || g.slam?.phase !== 'warn') continue;
      const R = this.rings[k++], p = 1 - g.slam.t / L.warn;
      R.g.visible = true; R.g.position.set(g.slam.x, 0.035, g.slam.z); R.g.scale.setScalar(reach(g));
      R.r.material.opacity = 0.35 + 0.55 * p; R.d.material.opacity = 0.05 + 0.2 * p * p;
    }
    // the slams that just landed: the ring jumps out a little and fades
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const B = this.bursts[i]; B.t += dt;
      if (B.t > 0.35 || k >= MAX) { this.bursts.splice(i, 1); continue; }
      const R = this.rings[k++], q = B.t / 0.35;
      R.g.visible = true; R.g.position.set(B.x, 0.035, B.z); R.g.scale.setScalar(B.r * (1 + 0.18 * q));
      R.r.material.opacity = 0.9 * (1 - q); R.d.material.opacity = 0.25 * (1 - q) * (1 - q);
    }
    for (; k < MAX; k++) this.rings[k].g.visible = false;
  }
}
