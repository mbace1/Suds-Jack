// Drop Cabal — pooled projectiles.
// TracerPool: player bullets flying INTO the scene toward the crosshair point (the
// layered-shooting core — each tracer keeps `prev` so main can segment-test every
// depth row it crosses in a frame). OrbPool: slow readable enemy shots flying OUT
// toward the player plane. GrenadePool: fixed-time arcs to the crosshair ground point.

import * as THREE from 'three';

const ORB_G = 10;   // gravity for lobbed enemy shots
const NADE_G = 22;  // grenade arc gravity

export class TracerPool {
  constructor(scene, count = 48, color = 0xfff1b0) {
    this.active = [];
    this.free = [];
    const geo = new THREE.BoxGeometry(0.14, 0.14, 1.0);
    const mat = new THREE.MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.free.push({ mesh, vel: new THREE.Vector3(), prev: new THREE.Vector3(), life: 0 });
    }
    this._look = new THREE.Vector3();
  }

  spawn(from, target, speed = 90) {
    const t = this.free.pop() || this.active.shift();
    if (!t) return;
    t.mesh.position.copy(from);
    t.prev.copy(from);
    t.vel.copy(target).sub(from).normalize().multiplyScalar(speed);
    t.life = 1.2;
    t.mesh.visible = true;
    this._look.copy(from).add(t.vel);
    t.mesh.lookAt(this._look);
    this.active.push(t);
  }

  recycleAt(i) {
    const t = this.active[i];
    this.active.splice(i, 1);
    t.mesh.visible = false;
    this.free.push(t);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      t.prev.copy(t.mesh.position);
      t.mesh.position.addScaledVector(t.vel, dt);
      t.life -= dt;
      if (t.life <= 0) this.recycleAt(i);
    }
  }
}

export class OrbPool {
  constructor(scene, count = 64) {
    this.active = [];
    this.free = [];
    const geo = new THREE.SphereGeometry(0.3, 10, 8);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      mesh.visible = false;
      scene.add(mesh);
      this.free.push({ mesh, vel: new THREE.Vector3(), grav: false, t: 0 });
    }
  }

  spawn(from, vel, color, grav = false) {
    const o = this.free.pop() || this.active.shift();
    if (!o) return;
    o.mesh.position.copy(from);
    o.vel.copy(vel);
    o.grav = grav;
    o.t = 0;
    o.mesh.material.color.setHex(color);
    o.mesh.visible = true;
    this.active.push(o);
  }

  recycleAt(i) {
    const o = this.active[i];
    this.active.splice(i, 1);
    o.mesh.visible = false;
    this.free.push(o);
  }

  clear() {
    for (let i = this.active.length - 1; i >= 0; i--) this.recycleAt(i);
  }

  update(dt, maxZ) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.t += dt;
      if (o.grav) o.vel.y -= ORB_G * dt;
      o.mesh.position.addScaledVector(o.vel, dt);
      if (o.mesh.position.y < 0.3) {
        o.mesh.position.y = 0.3;
        o.vel.y = Math.abs(o.vel.y) * 0.15;   // lobs skid along the ground, stay dodgeable
        o.grav = false;
      }
      // pulse so slow orbs read as danger at low res
      const p = 1 + Math.sin(o.t * 14) * 0.18;
      o.mesh.scale.setScalar(p);
      if (o.mesh.position.z > maxZ) this.recycleAt(i);
    }
  }
}

export class GrenadePool {
  constructor(scene, count = 8, color = 0x222233) {
    this.active = [];
    this.free = [];
    const geo = new THREE.SphereGeometry(0.32, 8, 8);
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
      mesh.visible = false;
      scene.add(mesh);
      this.free.push({ mesh, vel: new THREE.Vector3(), t: 0, T: 1 });
    }
    this._booms = [];
  }

  throwTo(from, target, T = 0.8) {
    const g = this.free.pop();
    if (!g) return false;
    g.mesh.position.copy(from);
    g.vel.set(
      (target.x - from.x) / T,
      (target.y - from.y) / T + 0.5 * NADE_G * T,
      (target.z - from.z) / T,
    );
    g.t = 0;
    g.T = T;
    g.mesh.visible = true;
    this.active.push(g);
    return true;
  }

  freshBooms() {
    if (!this._booms.length) return null;
    const b = this._booms;
    this._booms = [];
    return b;
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const g = this.active[i];
      g.t += dt;
      g.vel.y -= NADE_G * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      g.mesh.rotation.x += dt * 9;
      const blink = Math.floor(g.t * 12) % 2 === 0;
      g.mesh.scale.setScalar(blink ? 1.15 : 0.95);
      if (g.t >= g.T || g.mesh.position.y <= 0.1) {
        const p = g.mesh.position;
        this._booms.push({ x: p.x, y: Math.max(0.3, p.y), z: p.z });
        this.active.splice(i, 1);
        g.mesh.visible = false;
        this.free.push(g);
      }
    }
  }
}
