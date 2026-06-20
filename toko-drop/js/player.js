import * as THREE from 'three';

const SPEED       = 6;
const DASH_SPEED  = 26;
const DASH_DUR    = 0.18;
const DASH_CD     = 0.75;  // was 0.9
const FIRE_RATE   = 0.09;  // was 0.11

const GHOST_COUNT    = 7;
const GHOST_INTERVAL = 0.03; // seconds between ghost spawns during dash
const GHOST_LIFE     = 0.28;

export const PLAYER_RADIUS = 0.5;

export class Player {
  constructor(scene) {
    this._scene = scene;
    this.alive = false;
    this.invincible = false;

    const geo = new THREE.SphereGeometry(PLAYER_RADIUS, 14, 10);
    this.mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x222222 });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // Ghost trail pool
    this._ghosts = Array.from({ length: GHOST_COUNT }, () => {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 0, depthWrite: false }),
      );
      m.visible = false;
      scene.add(m);
      return { mesh: m, life: 0 };
    });
    this._ghostT = 0;

    this._dashDir  = { x: 0, z: 0 };
    this._dashTime = 0;
    this._dashCD   = 0;
    this._fireT    = 0;
    this._lastAim  = { x: 1, z: 0 };
  }

  get position() { return this.mesh.position; }

  reset() {
    this.alive = true;
    this.invincible = false;
    this._dashTime = 0;
    this._dashCD   = 0;
    this._fireT    = 0;
    this._ghostT   = 0;
    this.mat.transparent = false;
    this.mat.opacity = 1;
    this.mesh.visible = true;
    this.mesh.position.set(0, PLAYER_RADIUS, 0);
    for (const g of this._ghosts) { g.life = 0; g.mesh.visible = false; }
  }

  dash(aimDir) {
    if (this._dashTime > 0 || this._dashCD > 0) return;
    this._dashDir = aimDir.valid
      ? { x: aimDir.x, z: aimDir.z }
      : { x: this._lastAim.x, z: this._lastAim.z };
    this._dashTime = DASH_DUR;
    this._ghostT   = 0;
    this.invincible = true;
  }

  update(dt, moveDir, aimDir, bullets, halfSize) {
    if (!this.alive) return;

    if (this._dashCD > 0) this._dashCD -= dt;
    if (this._fireT  > 0) this._fireT  -= dt;

    if (this._dashTime > 0) {
      this._dashTime -= dt;
      this.mesh.position.x += this._dashDir.x * DASH_SPEED * dt;
      this.mesh.position.z += this._dashDir.z * DASH_SPEED * dt;

      // Flicker
      this.mat.transparent = true;
      this.mat.opacity = 0.35 + 0.65 * Math.abs(Math.sin(this._dashTime * 55));

      // Spawn ghost copies
      this._ghostT -= dt;
      if (this._ghostT <= 0) {
        this._ghostT = GHOST_INTERVAL;
        const g = this._ghosts.find(g => g.life <= 0);
        if (g) {
          g.mesh.position.copy(this.mesh.position);
          g.mesh.scale.setScalar(1);
          g.life = GHOST_LIFE;
          g.mesh.visible = true;
        }
      }

      if (this._dashTime <= 0) {
        this._dashCD = DASH_CD;
        this.invincible = false;
        this.mat.transparent = false;
        this.mat.opacity = 1;
      }
    } else {
      this.mesh.position.x += moveDir.x * SPEED * dt;
      this.mesh.position.z += moveDir.z * SPEED * dt;
    }

    // Update ghost fades
    for (const g of this._ghosts) {
      if (g.life > 0) {
        g.life -= dt;
        if (g.life <= 0) {
          g.mesh.visible = false;
        } else {
          const t = g.life / GHOST_LIFE; // 1 → 0
          g.mesh.material.opacity = t * 0.45;
          g.mesh.scale.setScalar(0.6 + 0.4 * t);
        }
      }
    }

    const h = halfSize - PLAYER_RADIUS;
    this.mesh.position.x = Math.max(-h, Math.min(h, this.mesh.position.x));
    this.mesh.position.z = Math.max(-h, Math.min(h, this.mesh.position.z));

    if (aimDir.valid && this._fireT <= 0) {
      this._lastAim = { x: aimDir.x, z: aimDir.z };
      const ox = this.mesh.position.x + aimDir.x * (PLAYER_RADIUS + 0.3);
      const oz = this.mesh.position.z + aimDir.z * (PLAYER_RADIUS + 0.3);
      bullets.spawnDir(ox, oz, aimDir.x, aimDir.z, true);
      this._fireT = FIRE_RATE;
    }
  }

  die() {
    this.alive = false;
    this.mesh.visible = false;
    for (const g of this._ghosts) { g.life = 0; g.mesh.visible = false; }
  }
}
