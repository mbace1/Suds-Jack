import * as THREE from 'three';
import { COL } from './palette.js';

const POOL      = 40;
const GRAV      = 26;
const THROW_VY  = 7.5;   // upward arc
const THROW_VX  = 7.7;   // lateral toward the target side
const GROUND_Y  = 0.06;

// A small spinning gold newspaper that arcs out to one side and lands.
export class PaperPool {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.BoxGeometry(0.34, 0.1, 0.24);
    const mat = new THREE.MeshPhysicalMaterial({
      color: COL.paper, emissive: 0x4a3600, emissiveIntensity: 0.5,
      roughness: 0.35, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.2,
    });
    this.mat = mat;
    this.items = Array.from({ length: POOL }, () => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true; m.visible = false;
      scene.add(m);
      return { m, live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
               side: 1, spin: 0, landed: false, resolved: false };
    });
  }

  // Throw from (x,z) toward side (-1 left / +1 right), inheriting forward speed.
  throw_(x, z, side, forwardSpeed) {
    const p = this.items.find(it => !it.live);
    if (!p) return;
    p.live = true; p.landed = false; p.resolved = false; p.side = side;
    p.x = x; p.y = 0.7; p.z = z;
    p.vx = side * THROW_VX;
    p.vy = THROW_VY;
    p.vz = -forwardSpeed * 0.18 - 0.6;     // lands roughly beside the bike
    p.spin = (Math.random() * 2 - 1) * 18;
    p.m.visible = true;
    p.m.position.set(p.x, p.y, p.z);
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.live) continue;
      p.vy -= GRAV * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y <= GROUND_Y && !p.landed) { p.y = GROUND_Y; p.landed = true; }
      p.m.position.set(p.x, p.y, p.z);
      p.m.rotation.x += p.spin * dt;
      p.m.rotation.y += p.spin * 0.4 * dt;
      // Cull once it has rested a moment after landing.
      if (p.landed) { p.vx *= 0.86; p.vz *= 0.86; p._rest = (p._rest || 0) + dt;
        if (p._rest > 0.4) { p.live = false; p.m.visible = false; p._rest = 0; } }
    }
  }

  // Papers that just landed and still need a hit-test against the world.
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
