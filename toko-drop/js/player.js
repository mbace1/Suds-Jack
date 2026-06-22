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

    const eyeGeo = new THREE.SphereGeometry(0.13, 8, 6);
    this._eyeL = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
    this._eyeR = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
    this._eyeL.scale.set(0.55, 1.15, 0.4);
    this._eyeR.scale.set(0.55, 1.15, 0.4);
    const reflGeo = new THREE.SphereGeometry(0.042, 5, 4);
    const reflMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [this._eyeL, this._eyeR].forEach(e => {
      const r = new THREE.Mesh(reflGeo, reflMat);
      r.position.set(0.04, 0.05, -0.025);
      e.add(r);
    });
    scene.add(this._eyeL);
    scene.add(this._eyeR);
    this._eyesOn = true;
  }

  get invincible() { return this._dashTime > 0 || this._mercyT > 0; }
  get dashing()    { return this._dashTime > 0; }
  get position()   { return this.mesh.position; }

  grantInvincibility(dur) { this._mercyT = Math.max(this._mercyT, dur); }
  grantFireRateBoost(dur) { this._fireRateBoost = dur; }

  reset() {
    this.alive    = true;
    this.hp       = MAX_HP;
    this._mercyT  = 0;
    this._flashT  = 0;
    this._dashTime = 0;
    this._dashCD   = 0;
    this._fireT    = 0;
    this._ghostT   = 0;
    this._fireRateBoost = 0;
    this.mat.emissive.setHex(0x222222);
    this.mat.transparent = false;
    this.mat.opacity = 1;
    this.mesh.visible = true;
    this.mesh.position.set(0, PLAYER_RADIUS, 0);
    for (const g of this._ghosts) { g.life = 0; g.mesh.visible = false; }
    this._eyeL.visible = true;
    this._eyeR.visible = true;
  }

  hit() {
    if (this.invincible || !this.alive) return;
    this.hp--;
    if (this.hp <= 0) { this.die(); return; }
    this._flashT = 0.25;
    this._mercyT = MERCY_DURATION;
    this._dashTime = 0;
  }

  dash(aimDir) {
    if (this._dashTime > 0 || this._dashCD > 0) return;
    this._dashDir = aimDir.valid
      ? { x: aimDir.x, z: aimDir.z }
      : { x: this._lastAim.x, z: this._lastAim.z };
    this._dashTime = DASH_DUR;
    this._ghostT   = 0;
  }

  update(dt, moveDir, aimDir, bullets, halfSize) {
    if (!this.alive) return;

    if (this._dashCD > 0) this._dashCD -= dt;
    if (this._fireT  > 0) this._fireT  -= dt;
    if (this._fireRateBoost > 0) this._fireRateBoost -= dt;

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
        this.mat.transparent = this._mercyT > 0;
        this.mat.opacity = 1;
      }
    } else {
      this.mesh.position.x += moveDir.x * SPEED * dt;
      this.mesh.position.z += moveDir.z * SPEED * dt;
    }

    if (this._mercyT > 0) {
      this._mercyT -= dt;
      this.mat.transparent = true;
      this.mat.opacity = 0.3 + 0.7 * Math.abs(Math.sin(this._mercyT * 12));
      if (this._mercyT <= 0) {
        this.mat.transparent = false;
        this.mat.opacity = 1;
        this.mat.emissive.setHex(0x222222);
      }
    }

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

    const effectiveFireRate = this._fireRateBoost > 0 ? FIRE_RATE * 0.4 : FIRE_RATE;
    if (aimDir.valid && this._fireT <= 0) {
      this._lastAim = { x: aimDir.x, z: aimDir.z };
      const ox = this.mesh.position.x + aimDir.x * (PLAYER_RADIUS + 0.3);
      const oz = this.mesh.position.z + aimDir.z * (PLAYER_RADIUS + 0.3);
      bullets.spawnDir(ox, oz, aimDir.x, aimDir.z, true);
      this._fireT = effectiveFireRate;
      this.onShoot?.();
    }

    if (this._eyesOn) {
      const ax = this._lastAim.x, az = this._lastAim.z;
      const px = -az, pz = ax;
      const ed = 0.4, es = 0.14;
      const ey = this.mesh.position.y + 0.16;
      this._eyeL.position.set(
        this.mesh.position.x + ax * ed + px * es, ey,
        this.mesh.position.z + az * ed + pz * es);
      this._eyeR.position.set(
        this.mesh.position.x + ax * ed - px * es, ey,
        this.mesh.position.z + az * ed - pz * es);
      const ang = Math.atan2(ax, az);
      this._eyeL.rotation.y = ang;
      this._eyeR.rotation.y = ang;
      this._eyeL.visible = this.alive;
      this._eyeR.visible = this.alive;
    }
  }

  die() {
    this.alive = false;
    this.mesh.visible = false;
    for (const g of this._ghosts) { g.life = 0; g.mesh.visible = false; }
    this._eyeL.visible = false;
    this._eyeR.visible = false;
  }

  toggleEyes() {
    this._eyesOn = !this._eyesOn;
    this._eyeL.visible = this._eyesOn && this.alive;
    this._eyeR.visible = this._eyesOn && this.alive;
  }
}
