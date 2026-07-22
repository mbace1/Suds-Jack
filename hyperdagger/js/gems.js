import * as THREE from 'three';

const _d = new THREE.Vector3();
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);

const GRAVITY = -22;
const MAGNET_R = 5.5;
const COLLECT_R = 0.95;
const LIFETIME = 25;

/** Devil-Daggers-style gems: dropped by heavy kills, bounce out physically,
 *  hover in place, magnet to the player when close. Collecting them levels
 *  the dagger stream up.
 *
 *  One InstancedMesh renders every gem (toko-drop's v189 pattern); the
 *  expiry blink writes a zero-scale matrix on off frames instead of
 *  toggling visibility. */
export class GemPool {
  constructor(scene, cap = 80) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    const geo = new THREE.OctahedronGeometry(0.17);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(2.4, 0.15, 0.15) });
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    for (let i = 0; i < cap; i++) this.pool.push(new THREE.Object3D());
  }

  _commit() {
    for (let i = 0; i < this.active.length; i++) {
      const g = this.active[i];
      if (g.blinkOff) {
        this.mesh.setMatrixAt(i, _zero);
      } else {
        g.m.updateMatrix();
        this.mesh.setMatrixAt(i, g.m.matrix);
      }
    }
    this.mesh.count = this.active.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  spawn(pos) {
    const m = this.pool.pop();
    if (!m) return;
    m.position.copy(pos);
    m.scale.setScalar(1);
    this.active.push({
      m,
      vel: new THREE.Vector3((Math.random() - 0.5) * 5, 3 + Math.random() * 4, (Math.random() - 0.5) * 5),
      life: LIFETIME,
      bobT: Math.random() * Math.PI * 2,
      blinkOff: false,
    });
    this._commit();
  }

  /** Returns how many gems the player collected this frame. */
  update(dt, playerPos) {
    let collected = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const g = this.active[i];
      g.life -= dt;
      g.bobT += dt * 3;
      g.m.rotation.y += dt * 4;
      // glint pulse; gems about to expire blink hard so you notice them
      const glint = 1 + 0.2 * Math.sin(g.bobT * 2.7);
      g.m.scale.setScalar(g.life < 3 ? glint * (0.55 + 0.45 * Math.sin(g.life * 14)) : glint);
      if (g.life <= 0) { this.pool.push(g.m); this.active.splice(i, 1); continue; }

      _d.copy(playerPos).sub(g.m.position);
      const dist = _d.length();
      if (dist < COLLECT_R) { collected++; this.pool.push(g.m); this.active.splice(i, 1); continue; }
      if (dist < MAGNET_R) {
        // magnet: fly at the player, overriding ballistics
        g.vel.addScaledVector(_d.divideScalar(dist), 60 * dt);
        if (g.vel.length() > 16) g.vel.setLength(16);
        g.m.position.addScaledVector(g.vel, dt);
      } else {
        g.vel.y += GRAVITY * dt;
        g.m.position.addScaledVector(g.vel, dt);
        if (g.m.position.y < 0.5) {
          g.m.position.y = 0.5;
          g.vel.y *= -0.35;
          g.vel.x *= 0.7; g.vel.z *= 0.7;
          if (Math.abs(g.vel.y) < 0.8) g.vel.set(0, 0, 0); // settled → hover
        }
        if (g.vel.lengthSq() < 0.01) g.m.position.y = 0.5 + Math.sin(g.bobT) * 0.1;
      }
      // blink out over the last 3 seconds
      g.blinkOff = !(g.life > 3 || (g.life * 6 | 0) % 2 === 0);
    }
    this._commit();
    return collected;
  }

  recycle(i) {
    const g = this.active[i];
    this.pool.push(g.m);
    this.active.splice(i, 1);
    this._commit();
  }

  reset() {
    while (this.active.length) this.pool.push(this.active.pop().m);
    this._commit();
  }
}
