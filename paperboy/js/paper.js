import * as THREE from 'three';
import { COL } from './palette.js?v=3';
import { DELIVER_X } from './world.js?v=3';

const POOL      = 40;
const THROW_VX  = 19;    // fast, flat lateral throw toward the target side
const FLY_Y     = 0.95;  // travels level at mailbox height (no arc / no fall)

// A newspaper that zips out flat to one side and hits the mailbox line — like
// the original Paperboy's quick toss, not a lobbed arc.
export class PaperPool {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.BoxGeometry(0.36, 0.14, 0.22);
    const mat = new THREE.MeshLambertMaterial({ color: COL.paper });
    this.mat = mat;
    this.items = Array.from({ length: POOL }, () => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true; m.visible = false;
      scene.add(m);
      return { m, live: false, x: 0, y: 0, z: 0, vx: 0, vz: 0,
               side: 1, spin: 0, landed: false, resolved: false, _rest: 0 };
    });
  }

  // Throw from (x,z) toward side (-1 left / +1 right), with a touch of forward lead.
  throw_(x, z, side, forwardSpeed) {
    const p = this.items.find(it => !it.live);
    if (!p) return;
    p.live = true; p.landed = false; p.resolved = false; p.side = side; p._rest = 0;
    p.x = x; p.y = FLY_Y; p.z = z;
    p.vx = side * THROW_VX;
    p.vz = -forwardSpeed * 0.15;            // slight forward lead, stays flat
    p.spin = (Math.random() < 0.5 ? -1 : 1) * 22;
    p.m.visible = true;
    p.m.position.set(p.x, p.y, p.z);
    p.m.rotation.set(0, 0, 0);
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.live) continue;
      if (!p.landed) {
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        // Reaches the kerb / mailbox line → that's where it's resolved.
        if (Math.abs(p.x) >= DELIVER_X) {
          p.x = p.side * DELIVER_X;
          p.landed = true;
        }
        p.m.rotation.y += p.spin * dt;       // spins flat as it flies
      } else {
        p._rest += dt;
        if (p._rest > 0.45) { p.live = false; p.m.visible = false; p._rest = 0; }
      }
      p.m.position.set(p.x, p.y, p.z);
    }
  }

  // Papers that just reached the mailbox line and need a hit-test against the world.
  freshLandings() {
    const out = [];
    for (const p of this.items) {
      if (p.live && p.landed && !p.resolved) { p.resolved = true; out.push(p); }
    }
    return out;
  }

  clear() {
    for (const p of this.items) { p.live = false; p.m.visible = false; p._rest = 0; }
  }
}
