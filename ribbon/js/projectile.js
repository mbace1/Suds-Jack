import * as THREE from 'three';
import { C, INK } from './shared.js?v=2';

// Object-pooled projectiles for both the player and enemies. Player shots travel
// flat across the arena and can crit / pierce / lifesteal; enemy shots hurt the player.
const CAP = 400;

export class ProjectilePool {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.free = [];
    const geo = new THREE.SphereGeometry(0.18, 8, 6);
    this._geo = geo;
    for (let i = 0; i < CAP; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: C.player });
      const mesh = new THREE.Mesh(geo, mat);
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: INK }));
      mesh.add(edge); mesh.visible = false; scene.add(mesh);
      this.free.push({ mesh, mat });
    }
  }

  spawn(x, z, dx, dz, opts) {
    const p = this.free.pop();
    if (!p) return null;
    p.x = x; p.z = z; p.dx = dx; p.dz = dz;
    p.speed = opts.speed; p.life = opts.life ?? 2.2;
    p.fromPlayer = !!opts.fromPlayer;
    p.damage = opts.damage; p.pierce = opts.pierce || 0; p.crit = !!opts.crit;
    p.hitSet = null;
    p.r = opts.r || 0.3;
    p.mat.color.setHex(opts.color ?? (opts.fromPlayer ? C.player : C.enemy));
    p.mesh.scale.setScalar(p.crit ? 1.5 : 1);
    p.mesh.position.set(x, opts.y ?? 1.0, z);
    p.mesh.visible = true;
    this.active.push(p);
    return p;
  }

  recycle(i) {
    const p = this.active[i];
    p.mesh.visible = false;
    this.active.splice(i, 1);
    this.free.push(p);
  }

  // moves all projectiles; collision is resolved by the caller via this.active.
  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.x += p.dx * p.speed * dt; p.z += p.dz * p.speed * dt;
      p.mesh.position.x = p.x; p.mesh.position.z = p.z;
      p.life -= dt;
      if (p.life <= 0 || Math.abs(p.x) > 80 || Math.abs(p.z) > 80) this.recycle(i);
    }
  }

  clear() { for (let i = this.active.length - 1; i >= 0; i--) this.recycle(i); }
}
