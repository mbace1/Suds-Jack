import * as THREE from 'three';
import { TUNING as T } from './tuning.js?v=83';

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
    this.shape = null;
  }

  /** v41: a season's weapon profile re-shapes the projectile. `shape` is
   *  {r, len} for the cone, `color` an HDR triple; null puts the dagger back. */
  setShape(shape = null, color = null) {
    // v51b: a season's projectile is a SHAPE of its own, not just a size —
    // 'cone' (the dagger and the nail), 'shard' (season 2's obsidian: a long
    // four-sided crystal), 'missile' (season 3: a turned body with a nose
    // and a flared tail). Every one points its tip down +z, as lookAt wants.
    const r = shape?.r ?? 0.045, len = shape?.len ?? 0.22;
    let geo;
    if (shape?.kind === 'shard') {
      geo = new THREE.OctahedronGeometry(r, 0);
      geo.scale(1, 1, len / (2 * r));
    } else if (shape?.kind === 'missile') {
      const h = len / 2;
      geo = new THREE.LatheGeometry([
        new THREE.Vector2(0.001, -h), new THREE.Vector2(r * 1.25, -h), new THREE.Vector2(r * 0.8, -h * 0.6),
        new THREE.Vector2(r, -h * 0.4), new THREE.Vector2(r, h * 0.3), new THREE.Vector2(r * 0.55, h * 0.65),
        new THREE.Vector2(0.001, h),
      ], 6);
      geo.rotateX(Math.PI / 2);
    } else {
      geo = new THREE.ConeGeometry(r, len, 4);
      geo.rotateX(Math.PI / 2);
    }
    this.mesh.geometry.dispose();
    this.mesh.geometry = geo;
    if (color) this.mesh.material.color.setRGB(color[0], color[1], color[2]);
    else this.mesh.material.color.setRGB(3.2, 0.38, 0.07);
    this.shape = shape ? { ...shape } : null;
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

  /** `opts` (v51): { target, turn, life } — a MISSILE. It steers at one
   *  enemy with its own turn rate (season 3's gaze sets both from how long
   *  the look was held), and falls back to cone homing if the target dies. */
  fire(origin, dir, speed = T.weapon.streamSpeed, homing = false, damage = 1, opts = null) {
    const m = this.pool.pop();
    if (!m) return;
    m.position.copy(origin);
    m.lookAt(_v.copy(origin).add(dir));
    m.rotateZ(Math.random() * Math.PI);
    this.active.push({
      m,
      vel: dir.clone().multiplyScalar(speed),
      prev: origin.clone(),
      life: opts?.life ?? 1.5,
      homing,
      damage,
      target: opts?.target ?? null,
      turn: opts?.turn ?? 0,
    });
    this._commit();
  }

  /** Advance daggers; homing ones steer toward the best target in a ~37° cone.
   *  Caller does collision using {prev → m.position} segments. */
  update(dt, targets = []) {
    const steerK = 1 - Math.exp(-T.weapon.homingSteer * dt);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const d = this.active[i];
      if (d.target) {
        if (d.target.alive) {
          // a missile: one target, its own turn rate — a held look turns hard
          d.target.center(_c);
          _t.copy(_c).sub(d.m.position).normalize();
          const sp = d.vel.length();
          _n.copy(d.vel).normalize().lerp(_t, 1 - Math.exp(-d.turn * dt)).normalize();
          d.vel.copy(_n).multiplyScalar(sp);
          d.m.lookAt(_t.copy(d.m.position).add(d.vel));
        } else {
          d.target = null; d.homing = true;   // its body is gone: find another
        }
      } else if (d.homing && targets.length) {
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
