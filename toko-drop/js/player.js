import * as THREE from 'three';

const SPEED       = 6;
const DASH_SPEED  = 26;
const DASH_DUR    = 0.18;
const DASH_CD     = 0.9;
const FIRE_RATE   = 0.11;

export const PLAYER_RADIUS = 0.5;

export class Player {
  constructor(scene) {
    this.alive = false;
    this.invincible = false;

    const geo = new THREE.SphereGeometry(PLAYER_RADIUS, 14, 10);
    this.mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x222222 });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

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
    this.mat.transparent = false;
    this.mat.opacity = 1;
    this.mesh.visible = true;
    this.mesh.position.set(0, PLAYER_RADIUS, 0);
  }

  dash(aimDir) {
    if (this._dashTime > 0 || this._dashCD > 0) return;
    this._dashDir = aimDir.valid
      ? { x: aimDir.x, z: aimDir.z }
      : { x: this._lastAim.x, z: this._lastAim.z };
    this._dashTime = DASH_DUR;
    this.invincible = true;
  }

  update(dt, moveDir, aimDir, bullets, halfSize) {
    if (!this.alive) return;

    if (this._dashCD  > 0) this._dashCD  -= dt;
    if (this._fireT   > 0) this._fireT   -= dt;

    if (this._dashTime > 0) {
      this._dashTime -= dt;
      this.mesh.position.x += this._dashDir.x * DASH_SPEED * dt;
      this.mesh.position.z += this._dashDir.z * DASH_SPEED * dt;
      // Flicker effect
      this.mat.transparent = true;
      this.mat.opacity = 0.4 + 0.6 * Math.abs(Math.sin(this._dashTime * 50));
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
  }
}
