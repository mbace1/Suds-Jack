import * as THREE from 'three';

/**
 * Enemy projectiles (Returnal-style bullet-hell orbs): glowing dark-red
 * spheres that fly flat and slow enough to read. Jump over the low rings,
 * strafe the volleys, or dash straight through — the dash phases through
 * orbs (never through bodies).
 *
 * Rendering is one InstancedMesh for the whole field (toko-drop's v189
 * pattern): each pooled orb is a scene-less Object3D dummy whose matrix is
 * committed per frame, so a 150-orb barrage costs 1 draw call, not 150.
 */
export class OrbPool {
  constructor(scene, cap = 150) {
    this.pool = [];
    this.active = [];
    const geo = new THREE.SphereGeometry(0.22, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(2.6, 0.2, 0.2) });
    this.mat = mat; // shared by every orb — retinted live by the contrast option
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; // instances span the arena; cull per-frame is wrong here
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

  fire(pos, vel) {
    const m = this.pool.pop();
    if (!m) return;
    m.position.copy(pos);
    m.scale.setScalar(1);
    this.active.push({ m, vel: vel.clone(), life: 7, age: Math.random() * 6 });
    this._commit();
  }

  update(dt, cullR) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      o.m.position.addScaledVector(o.vel, dt);
      o.age += dt;
      o.m.scale.setScalar(1 + 0.16 * Math.sin(o.age * 9)); // menacing breathe
      o.life -= dt;
      const p = o.m.position;
      if (o.life <= 0 || p.x * p.x + p.z * p.z > cullR * cullR) {
        this.pool.push(o.m);
        this.active.splice(i, 1);
      }
    }
    this._commit();
  }

  recycle(i) {
    const o = this.active[i];
    this.pool.push(o.m);
    this.active.splice(i, 1);
    this._commit(); // instant visual removal (dash-through, player hit)
  }

  reset() {
    while (this.active.length) this.pool.push(this.active.pop().m);
    this._commit();
  }
}
