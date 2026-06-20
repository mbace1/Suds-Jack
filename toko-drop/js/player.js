import * as THREE from 'three';

const SPEED          = 6;
const DASH_SPEED     = 26;
const DASH_DUR       = 0.18;
const DASH_CD        = 0.75;
const FIRE_RATE      = 0.09;
const MAX_HP         = 3;
const MERCY_DURATION = 1.2;

const GHOST_COUNT    = 7;
const GHOST_INTERVAL = 0.03;
const GHOST_LIFE     = 0.28;

export const PLAYER_RADIUS = 0.5;

export class Player {
  constructor(scene) {
    this.maxHp = MAX_HP;
    this.hp    = MAX_HP;
    this.alive = false;

    this._mercyT  = 0;
    this._flashT  = 0;
    this._dashDir  = { x: 0, z: 0 };
    this._dashTime = 0;
    this._dashCD   = 0;
    this._fireT    = 0;
    this._lastAim  = { x: 1, z: 0 };
    this._ghostT   = 0;
    this.onShoot   = null;

    const geo = new THREE.SphereGeometry(PLAYER_RADIUS, 14, 10);
    this.mat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x222222 });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    this._ghosts = Array.from({ length: GHOST_COUNT }, () => {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 0, depthWrite: false }),
      );
      m.visible = false;
      scene.add(m);
      return { mesh: m, life: 0 };
    });
  }

  // Invincible during dash OR mercy frames after a hit
  get invincible() { return this._dashTime > 0 || this._mercyT > 0; }

  get position() { return this.mesh.position; }

  reset() {
    this.alive    = true;
    this.hp       = MAX_HP;
    this._mercyT  = 0;
    this._flashT  = 0;
    this._dashTime = 0;
    this._dashCD   = 0;
    this._fireT    = 0;
    this._ghostT   = 0;
    this.mat.emissive.setHex(0x222222);
    this.mat.transparent = false;
    this.mat.opacity = 1;
    this.mesh.visible = true;
    this.mesh.position.set(0, PLAYER_RADIUS, 0);
    for (const g of this._ghosts) { g.life = 0; g.mesh.visible = false; }
  }

  hit() {
    if (this.invincible || !this.alive) return;
    this.hp--;
    if (this.hp <= 0) { this.die(); return; }
    this._flashT = 0.25;
    this._mercyT = MERCY_DURATION;
    this._dashTime = 0; // cancel dash on hit
  }

  dash(aimDir) {
    if (this._dashTime > 0 || this._dashCD > 0) return;
    this._dashDir = aimDir.valid
      ? { x: aimDir.x, z: aimDir.z }
      : { x: this._lastAim.x, z: this._lastAim.z };
    this._dashTime = DASH_DUR;
    this._ghostT   = 0;
    // dash doesn't set invincible directly; the getter handles it via _dashTime
  }

  update(dt, moveDir, aimDir, bullets, halfSize) {
    if (!this.alive) return;

    if (this._dashCD > 0) this._dashCD -= dt;
    if (this._fireT  > 0) this._fireT  -= dt;

    // Hit flash (red emissive)
    if (this._flashT > 0) {
      this._flashT -= dt;
      this.mat.emissive.setHex(0xff1100);
    } else if (this._mercyT <= 0) {
      this.mat.emissive.setHex(0x222222);
    }

    if (this._dashTime > 0) {
      this._dashTime -= dt;
      this.mesh.position.x += this._dashDir.x * DASH_SPEED * dt;
      this.mesh.position.z += this._dashDir.z * DASH_SPEED * dt;

      this.mat.transparent = true;
      this.mat.opacity = 0.35 + 0.65 * Math.abs(Math.sin(this._dashTime * 55));

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
        this.mat.transparent = false;
        this.mat.opacity = 1;
      }
    } else if (this._mercyT > 0) {
      // Mercy i-frame flicker (different from dash — slower, more chaotic)
      this._mercyT -= dt;
      this.mat.transparent = true;
      this.mat.opacity = 0.3 + 0.7 * Math.abs(Math.sin(this._mercyT * 12));
      if (this._mercyT <= 0) {
        this.mat.transparent = false;
        this.mat.opacity = 1;
        this.mat.emissive.setHex(0x222222);
      }
    } else {
      this.mesh.position.x += moveDir.x * SPEED * dt;
      this.mesh.position.z += moveDir.z * SPEED * dt;
    }

    // Ghost fade
    for (const g of this._ghosts) {
      if (g.life > 0) {
        g.life -= dt;
        if (g.life <= 0) {
          g.mesh.visible = false;
        } else {
          const t = g.life / GHOST_LIFE;
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
      this.onShoot?.();
    }
  }

  die() {
    this.alive = false;
    this.mesh.visible = false;
    for (const g of this._ghosts) { g.life = 0; g.mesh.visible = false; }
  }
}
