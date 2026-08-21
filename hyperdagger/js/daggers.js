import * as THREE from 'three';
import { TUNING as T } from './tuning.js?v=63';

const _v = new THREE.Vector3();
const _t = new THREE.Vector3();
const _n = new THREE.Vector3();
const _best = new THREE.Vector3();
const _c = new THREE.Vector3();

/** Object-pooled dagger projectiles. Straight flight (or homing at weapon
 *  level 3), short life, white glow.
 *
 *  The whole stream renders as one InstancedMesh (toko-drop's v189 pattern):
 *  pooled scene-less Object3D dummies keep the lookAt/roll math and the
 *  {prev → position} collision segments identical, and their matrices are
 *  committed per frame — a 300-dagger stream is 1 draw call. */
export class DaggerPool {
  constructor(scene, cap = 300) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    const geo = new THREE.ConeGeometry(0.045, 0.22, 4);
    geo.rotateX(Math.PI / 2); // point down local +Z; Object3D.lookAt owns aim
    // One hot colour family from fingertip to impact. White streaks made the
    // weapon disappear into bone enemies; ember-orange stays legible on both
    // the skulls and the void and blooms only at the projectile itself.
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(3.2, 0.38, 0.07) });
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    for (let i = 0; i < cap; i++) this.pool.push(new THREE.Object3D());
  }

  _commit() {
    for (let i = 0; i < this.active.length; i++) {
      const m = this.active[i].m;
      m.updateMatrix();
      this.mesh.setMatrixAt(i, m.matrix);
    }
    this.mesh.count = this.active.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  fire(origin, dir, speed = T.weapon.streamSpeed, homing = false, damage = 1) {
    const m = this.pool.pop();
    if (!m) return;
    m.position.copy(origin);
    m.lookAt(_v.copy(origin).add(dir));
    m.rotateZ(Math.random() * Math.PI);
    this.active.push({
      m,
      vel: dir.clone().multiplyScalar(speed),
      prev: origin.clone(),
      life: 1.5,
      homing,
      damage,
    });
    this._commit();
  }

  /** Advance daggers; homing ones steer toward the best target in a ~37° cone.
   *  Caller does collision using {prev → m.position} segments. */
  update(dt, targets = []) {
    const steerK = 1 - Math.exp(-T.weapon.homingSteer * dt);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const d = this.active[i];
      if (d.homing && targets.length) {
        _n.copy(d.vel).normalize();
        let bestDot = T.weapon.homingDot, found = false;
        for (const e of targets) {
          if (!e.alive) continue;
          e.center(_c);
          _t.copy(_c).sub(d.m.position);
          const dist = _t.length();
          if (dist > T.weapon.homingRange || dist < 0.5) continue;
          _t.divideScalar(dist);
          const dot = _n.dot(_t);
          if (dot > bestDot) { bestDot = dot; _best.copy(_t); found = true; }
        }
        if (found) {
          const sp = d.vel.length();
          _n.lerp(_best, steerK).normalize();
          d.vel.copy(_n).multiplyScalar(sp);
          d.m.lookAt(_t.copy(d.m.position).add(d.vel));
        }
      }
      d.prev.copy(d.m.position);
      d.m.position.addScaledVector(d.vel, dt);
      d.life -= dt;
      if (d.life <= 0 || d.m.position.y < -0.2) {
        this.pool.push(d.m);
        this.active.splice(i, 1);
      }
    }
    this._commit();
  }

  recycle(i) {
    const d = this.active[i];
    this.pool.push(d.m);
    this.active.splice(i, 1);
    this._commit(); // instant removal on impact — no one-frame ghost at the hit point
  }

  reset() {
    while (this.active.length) this.pool.push(this.active.pop().m);
    this._commit();
  }
}
