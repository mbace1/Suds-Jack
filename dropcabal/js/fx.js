// Drop Cabal — juice: instanced gel-debris pool + expanding boom shells.

import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export class DebrisPool {
  constructor(scene, count = 240) {
    this.count = count;
    const geo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < count; i++) this.mesh.setColorAt(i, _c.setHex(0x000000));
    this.slots = [];
    for (let i = 0; i < count; i++) {
      this.slots.push({
        alive: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Euler(),
        rv: new THREE.Vector3(),
        life: 0, maxLife: 1, size: 1,
      });
    }
    this._cursor = 0;
    scene.add(this.mesh);
  }

  burst(x, y, z, color, n = 10, power = 8) {
    _c.setHex(color);
    for (let k = 0; k < n; k++) {
      const idx = this._cursor;
      const s = this.slots[idx];
      this._cursor = (this._cursor + 1) % this.count;
      s.alive = true;
      s.pos.set(x, Math.max(0.2, y), z);
      const a = Math.random() * Math.PI * 2;
      const up = 3 + Math.random() * power * 0.7;
      const out = (0.3 + Math.random() * 0.7) * power;
      s.vel.set(Math.cos(a) * out, up, Math.sin(a) * out * 0.7);
      s.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      s.rv.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
      s.maxLife = s.life = 0.7 + Math.random() * 0.5;
      s.size = 0.6 + Math.random() * 0.9;
      this.mesh.setColorAt(idx, _c);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    for (let i = 0; i < this.count; i++) {
      const s = this.slots[i];
      if (!s.alive) {
        _m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, _m);
        continue;
      }
      s.life -= dt;
      if (s.life <= 0) { s.alive = false; continue; }
      s.vel.y -= 30 * dt;
      s.pos.addScaledVector(s.vel, dt);
      if (s.pos.y < 0.12 && s.vel.y < 0) {
        s.pos.y = 0.12;
        s.vel.y *= -0.35;
        s.vel.x *= 0.7;
        s.vel.z *= 0.7;
      }
      s.rot.x += s.rv.x * dt;
      s.rot.y += s.rv.y * dt;
      s.rot.z += s.rv.z * dt;
      const shrink = Math.min(1, s.life / 0.3);
      _q.setFromEuler(s.rot);
      _s.setScalar(s.size * shrink);
      _m.compose(s.pos, _q, _s);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class BoomPool {
  constructor(scene, count = 10) {
    this.items = [];
    const geo = new THREE.SphereGeometry(1, 12, 10);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffcc66, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      this.items.push({ mesh: m, t: 0, dur: 0.3, r: 5, alive: false });
    }
    this._cursor = 0;
  }

  spawn(x, y, z, r = 5, color = 0xffcc66, dur = 0.3) {
    const it = this.items[this._cursor];
    this._cursor = (this._cursor + 1) % this.items.length;
    it.alive = true;
    it.t = 0;
    it.dur = dur;
    it.r = r;
    it.mesh.material.color.setHex(color);
    it.mesh.position.set(x, y, z);
    it.mesh.visible = true;
  }

  update(dt) {
    for (const it of this.items) {
      if (!it.alive) continue;
      it.t += dt;
      const k = it.t / it.dur;
      if (k >= 1) { it.alive = false; it.mesh.visible = false; continue; }
      const s = 0.2 + k * it.r;
      it.mesh.scale.setScalar(s);
      it.mesh.material.opacity = 0.9 * (1 - k);
    }
  }
}
