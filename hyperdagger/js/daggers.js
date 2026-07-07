import * as THREE from 'three';

const _v = new THREE.Vector3();
const _t = new THREE.Vector3();
const _n = new THREE.Vector3();
const _best = new THREE.Vector3();
const _c = new THREE.Vector3();

/** Object-pooled dagger projectiles. Straight flight (or homing at weapon
 *  level 3), short life, gold glow. */
export class DaggerPool {
  constructor(scene, cap = 300) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    const geo = new THREE.BoxGeometry(0.07, 0.07, 0.55);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(2.1, 1.6, 0.5) });
    for (let i = 0; i < cap; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      this.pool.push(m);
    }
  }

  fire(origin, dir, speed = 58, homing = false) {
    const m = this.pool.pop();
    if (!m) return;
    m.position.copy(origin);
    m.visible = true;
    m.lookAt(_v.copy(origin).add(dir));
    m.rotateZ(Math.random() * Math.PI);
    this.active.push({
      m,
      vel: dir.clone().multiplyScalar(speed),
      prev: origin.clone(),
      life: 1.5,
      homing,
    });
  }

  /** Advance daggers; homing ones steer toward the best target in a ~37° cone.
   *  Caller does collision using {prev → m.position} segments. */
  update(dt, targets = []) {
    const steerK = 1 - Math.exp(-7 * dt);
    for (let i = this.active.length - 1; i >= 0; i--) {
      const d = this.active[i];
      if (d.homing && targets.length) {
        _n.copy(d.vel).normalize();
        let bestDot = 0.8, found = false;
        for (const e of targets) {
          if (!e.alive) continue;
          e.center(_c);
          _t.copy(_c).sub(d.m.position);
          const dist = _t.length();
          if (dist > 30 || dist < 0.5) continue;
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
      if (d.life <= 0 || d.m.position.y < -0.2) this.recycle(i);
    }
  }

  recycle(i) {
    const d = this.active[i];
    d.m.visible = false;
    this.pool.push(d.m);
    this.active.splice(i, 1);
  }

  reset() {
    for (let i = this.active.length - 1; i >= 0; i--) this.recycle(i);
  }
}
