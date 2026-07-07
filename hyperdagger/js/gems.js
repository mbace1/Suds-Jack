import * as THREE from 'three';

const _d = new THREE.Vector3();

const GRAVITY = -22;
const MAGNET_R = 5.5;
const COLLECT_R = 0.95;
const LIFETIME = 25;

/** Devil-Daggers-style gems: dropped by heavy kills, bounce out physically,
 *  hover in place, magnet to the player when close. Collecting them levels
 *  the dagger stream up. */
export class GemPool {
  constructor(scene, cap = 40) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
    const geo = new THREE.OctahedronGeometry(0.17);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(2.4, 0.15, 0.15) });
    for (let i = 0; i < cap; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      this.pool.push(m);
    }
  }

  spawn(pos) {
    const m = this.pool.pop();
    if (!m) return;
    m.position.copy(pos);
    m.visible = true;
    this.active.push({
      m,
      vel: new THREE.Vector3((Math.random() - 0.5) * 5, 3 + Math.random() * 4, (Math.random() - 0.5) * 5),
      life: LIFETIME,
      bobT: Math.random() * Math.PI * 2,
    });
  }

  /** Returns how many gems the player collected this frame. */
  update(dt, playerPos) {
    let collected = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const g = this.active[i];
      g.life -= dt;
      g.bobT += dt * 3;
      g.m.rotation.y += dt * 4;
      if (g.life <= 0) { this.recycle(i); continue; }

      _d.copy(playerPos).sub(g.m.position);
      const dist = _d.length();
      if (dist < COLLECT_R) { collected++; this.recycle(i); continue; }
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
      g.m.visible = g.life > 3 || (g.life * 6 | 0) % 2 === 0;
    }
    return collected;
  }

  recycle(i) {
    const g = this.active[i];
    g.m.visible = false;
    this.pool.push(g.m);
    this.active.splice(i, 1);
  }

  reset() {
    for (let i = this.active.length - 1; i >= 0; i--) this.recycle(i);
  }
}
