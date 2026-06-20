import * as THREE from 'three';

export const Pattern = { RING: 0, SPIRAL: 1, SPREAD: 2, ALTERNATING: 3 };

const CFG = {
  [Pattern.RING]:        { color: 0xff6600, interval: 2.0, bulletColor: 0xff8833 },
  [Pattern.SPIRAL]:      { color: 0xaa00ff, interval: 0.08, bulletColor: 0xcc44ff },
  [Pattern.SPREAD]:      { color: 0x0088ff, interval: 1.5, bulletColor: 0x44aaff },
  [Pattern.ALTERNATING]: { color: 0x00cc44, interval: 1.1, bulletColor: 0x00ff66 },
};

const ENEMY_SPEED  = 1.8;
export const ENEMY_RADIUS = 0.8;

export class Enemy {
  constructor(scene, pattern, x, z) {
    this.pattern = pattern;
    this.alive = true;

    const geo = new THREE.SphereGeometry(ENEMY_RADIUS, 14, 10);
    const mat = new THREE.MeshPhongMaterial({ color: CFG[pattern].color });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, ENEMY_RADIUS, z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    this._t = 0;
    this._spiralAngle = 0;
    this._altPhase = 0;
  }

  get position() { return this.mesh.position; }

  update(dt, playerPos, bullets) {
    // Slow deliberate movement toward player
    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1.5) {
      this.mesh.position.x += (dx / dist) * ENEMY_SPEED * dt;
      this.mesh.position.z += (dz / dist) * ENEMY_SPEED * dt;
    }

    this._t += dt;
    this._tick(playerPos, bullets);
  }

  _tick(playerPos, bullets) {
    const { interval, bulletColor } = CFG[this.pattern];
    const x = this.mesh.position.x;
    const z = this.mesh.position.z;

    switch (this.pattern) {
      case Pattern.RING:
        if (this._t >= interval) {
          this._t = 0;
          this._ring(x, z, 10, bulletColor, bullets);
        }
        break;

      case Pattern.SPIRAL:
        if (this._t >= interval) {
          this._t = 0;
          bullets.spawnDir(x, z, Math.cos(this._spiralAngle), Math.sin(this._spiralAngle), false, bulletColor);
          this._spiralAngle += 0.38;
        }
        break;

      case Pattern.SPREAD:
        if (this._t >= interval) {
          this._t = 0;
          const dx = playerPos.x - x, dz = playerPos.z - z;
          const len = Math.hypot(dx, dz);
          if (len > 0) {
            const base = Math.atan2(dz, dx);
            for (let i = -2; i <= 2; i++) {
              const a = base + i * (Math.PI / 12); // 15° steps across 60° cone
              bullets.spawnDir(x, z, Math.cos(a), Math.sin(a), false, bulletColor);
            }
          }
        }
        break;

      case Pattern.ALTERNATING:
        if (this._t >= interval) {
          this._t = 0;
          if (this._altPhase === 0) {
            this._ring(x, z, 8, bulletColor, bullets);
          } else {
            const dx = playerPos.x - x, dz = playerPos.z - z;
            const len = Math.hypot(dx, dz);
            if (len > 0) bullets.spawnDir(x, z, dx / len, dz / len, false, 0xffff44);
          }
          this._altPhase ^= 1;
        }
        break;
    }
  }

  _ring(x, z, count, color, bullets) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      bullets.spawnDir(x, z, Math.cos(a), Math.sin(a), false, color);
    }
  }

  destroy() {
    this.alive = false;
    this.mesh.visible = false;
  }

  removeFrom(scene) {
    scene.remove(this.mesh);
  }
}
