import * as THREE from 'three';

const _v = new THREE.Vector3();

/** Object-pooled dagger projectiles. Straight flight, short life, gold glow. */
export class DaggerPool {
  constructor(scene, cap = 260) {
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

  fire(origin, dir, speed = 58) {
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
    });
  }

  /** Advance daggers; caller does collision using {prev → m.position} segments. */
  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const d = this.active[i];
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
