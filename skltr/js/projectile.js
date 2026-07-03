import * as THREE from 'three';
import { C } from './shared.js?v=9';

// 3D object-pooled neon projectiles, shared by player and enemies. Velocity is a
// full 3D direction so shots travel any way (up at flyers, down from them).
const CAP = 600;

export class ProjectilePool {
  constructor(scene) {
    this.scene = scene; this.active = []; this.free = [];
    const geo = new THREE.SphereGeometry(0.16, 8, 6);
    for (let i = 0; i < CAP; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: C.shot });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false; scene.add(mesh);
      this.free.push({ mesh, mat });
    }
  }

  spawn(x, y, z, dx, dy, dz, o) {
    const p = this.free.pop(); if (!p) return null;
    p.x = x; p.y = y; p.z = z; p.px = x; p.py = y; p.pz = z; p.dx = dx; p.dy = dy; p.dz = dz;
    p.speed = o.speed; p.life = o.life ?? 3;
    p.fromPlayer = !!o.fromPlayer; p.damage = o.damage; p.r = o.r || 0.35;
    p.pierce = o.pierce || 0; p.crit = !!o.crit; p.hitSet = null;
    p.mat.color.setHex(o.color ?? (o.fromPlayer ? C.shot : C.eshot));
    p.mesh.scale.setScalar((o.scale || 1) * (p.crit ? 1.5 : 1));
    p.mesh.position.set(x, y, z); p.mesh.visible = true;
    this.active.push(p); return p;
  }

  recycle(i) { const p = this.active[i]; p.mesh.visible = false; this.active.splice(i, 1); this.free.push(p); }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.px = p.x; p.py = p.y; p.pz = p.z;                    // for swept collision
      p.x += p.dx * p.speed * dt; p.y += p.dy * p.speed * dt; p.z += p.dz * p.speed * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      p.life -= dt;
      if (p.life <= 0 || p.y < -25 || Math.abs(p.x) > 140 || Math.abs(p.z) > 140) this.recycle(i);
    }
  }
  clear() { for (let i = this.active.length - 1; i >= 0; i--) this.recycle(i); }
}
