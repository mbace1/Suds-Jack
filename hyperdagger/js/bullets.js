import * as THREE from 'three';

/**
 * Enemy projectiles (Returnal-style bullet-hell orbs): glowing dark-red
 * spheres that fly flat and slow enough to read. Jump over the low rings,
 * strafe the volleys, or dash straight through — the dash phases through
 * orbs (never through bodies).
 */
export class OrbPool {
  constructor(scene, cap = 150) {
    this.pool = [];
    this.active = [];
    const geo = new THREE.SphereGeometry(0.22, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(2.6, 0.2, 0.2) });
    this.mat = mat; // shared by every orb — retinted live by the contrast option
    for (let i = 0; i < cap; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      this.pool.push(m);
    }
  }

  fire(pos, vel) {
    const m = this.pool.pop();
    if (!m) return;
    m.position.copy(pos);
    m.scale.setScalar(1);
    m.visible = true;
    this.active.push({ m, vel: vel.clone(), life: 7, age: Math.random() * 6 });
  }

  update(dt, cullR) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.m.position.addScaledVector(o.vel, dt);
      o.age += dt;
      o.m.scale.setScalar(1 + 0.16 * Math.sin(o.age * 9)); // menacing breathe
      o.life -= dt;
      const p = o.m.position;
      if (o.life <= 0 || p.x * p.x + p.z * p.z > cullR * cullR) this.recycle(i);
    }
  }

  recycle(i) {
    const o = this.active[i];
    o.m.visible = false;
    this.pool.push(o.m);
    this.active.splice(i, 1);
  }

  reset() {
    for (let i = this.active.length - 1; i >= 0; i--) this.recycle(i);
  }
}
