import * as THREE from 'three';

export const Pattern = { RING: 0, SPIRAL: 1, SPREAD: 2, ALTERNATING: 3 };

const CFG = {
  // Ring: pulses hard, moves faster — offset by slower fire rate
  [Pattern.RING]:        { color: 0xff6600, interval: 1.8, bulletColor: 0xff8833, speed: 2.4 },
  // Spiral: anchor enemy — slowest mover, continuous stream
  [Pattern.SPIRAL]:      { color: 0xaa00ff, interval: 0.08, bulletColor: 0xcc44ff, speed: 1.0 },
  // Spread: medium speed, aimed bursts
  [Pattern.SPREAD]:      { color: 0x0088ff, interval: 1.3, bulletColor: 0x44aaff, speed: 2.0 },
  // Alternating: aggressive combo
  [Pattern.ALTERNATING]: { color: 0x00cc44, interval: 1.0, bulletColor: 0x00ff66, speed: 2.2 },
};

const MAX_HP = 3;
export const ENEMY_RADIUS = 0.8;

export class Enemy {
  constructor(scene, pattern, x, z, speedMult = 1, intervalMult = 1) {
    this.pattern  = pattern;
    this.alive    = true;
    this.hp       = MAX_HP;
    this._dying   = false;
    this._deathT  = 0;
    this._flashT  = 0;
    this._speedMult    = speedMult;
    this._intervalMult = intervalMult;

    const geo = new THREE.SphereGeometry(ENEMY_RADIUS, 14, 10);
    this.mat = new THREE.MeshPhongMaterial({ color: CFG[pattern].color });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.set(x, ENEMY_RADIUS, z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    this._t = 0;
    this._spiralAngle = 0;
    this._altPhase    = 0;
  }

  get position() { return this.mesh.position; }
  get color()    { return CFG[this.pattern].color; }
  get hpFrac()   { return this.hp / MAX_HP; }

  hit() {
    if (!this.alive) return false;
    this.hp--;
    this._flashT = 0.12;
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  update(dt, playerPos, bullets) {
    if (!this.alive) return;

    const speed = CFG[this.pattern].speed * this._speedMult;
    const dx = playerPos.x - this.mesh.position.x;
    const dz = playerPos.z - this.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1.5) {
      this.mesh.position.x += (dx / dist) * speed * dt;
      this.mesh.position.z += (dz / dist) * speed * dt;
    }

    // Hit flash
    if (this._flashT > 0) {
      this._flashT -= dt;
      this.mat.emissive.setHex(0xffffff);
    } else {
      this.mat.emissive.setHex(0x000000);
    }

    this._t += dt;
    this._tick(playerPos, bullets);
  }

  // Called every frame even after alive=false, for the death pop animation
  updateDeath(dt) {
    if (!this._dying) return;
    this._deathT -= dt;
    const t = 1 - Math.max(this._deathT, 0) / 0.22; // 0→1
    this.mesh.scale.setScalar(1 + t * 2.2);
    this.mat.opacity = 1 - t;
    if (this._deathT <= 0) {
      this._dying = false;
      this.mesh.visible = false;
    }
  }

  _tick(playerPos, bullets) {
    const baseInterval = CFG[this.pattern].interval;
    const interval = this.pattern === Pattern.SPIRAL
      ? baseInterval  // spiral interval doesn't compress — it's already tiny
      : baseInterval * this._intervalMult;
    const { bulletColor } = CFG[this.pattern];
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
          // Rotation speed increases with wave scaling
          this._spiralAngle += 0.38 / this._intervalMult;
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
              const a = base + i * (Math.PI / 12);
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
    this.alive   = false;
    this._dying  = true;
    this._deathT = 0.22;
    this.mat.transparent = true;
    this.mat.depthWrite  = false;
    this.mat.emissive.setHex(0xffffff);
    this.mesh.scale.setScalar(1);
    this.mesh.visible = true;
  }

  removeFrom(scene) {
    this.mesh.visible = false;
    scene.remove(this.mesh);
  }
}
