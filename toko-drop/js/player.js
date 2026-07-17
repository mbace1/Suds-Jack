import * as THREE from 'three';
import { makeSatinMat, CABINET_STYLE, VIS } from './enemy.js?v=127';

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
    this._invincBoost   = 0;
    this._fireRateBoost = 0;
    this._sq  = 1.0;
    this._sqV = 0.0;
    // Movement stretch (v31): velocity-driven directional lunge via goo shader
    this._prevX = 0; this._prevZ = 0;
    this._velX = 0; this._velZ = 0;
    this._stretch = 0;
    this.onShoot   = null;
    this._weaponMode   = 'SINGLE';
    this._burstQueue   = [];
    this._speedMult    = 1.0;
    this._fireRateMult = 1.0;
    this._dashCDMult   = 1.0;

    const geo = new THREE.SphereGeometry(PLAYER_RADIUS, 14, 10);
    // v107: same satin gel material as the enemies (registers in SATIN_MATS, so
    // pause-menu LOOK presets restyle the player too). Physical mats keep FX
    // uniforms on .gooU; emissive/opacity are native material properties.
    this.mat = makeSatinMat(0xffffff, 'blob', PLAYER_RADIUS);
    this.mat.transparent = true;   // dash/mercy flicker drives opacity every frame
    this.mat.opacity = 0.98;
    this._gu = this.mat.uniforms ?? this.mat.gooU;
    this._gu.uWobble.value = 0.6;  // gentler than enemy blobs — the hero reads calm
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

    // Eyes — Kirby-style black ovals with white reflections
    const eyeGeo = new THREE.SphereGeometry(0.13, 8, 6);
    this._eyeL = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
    this._eyeR = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
    this._eyeL.scale.set(0.55, 1.15, 0.4);
    this._eyeR.scale.set(0.55, 1.15, 0.4);
    // White reflection dots as children
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

    // Muzzle flash — a brief additive pop at the gun barrel on each shot
    this._muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0xaaffcc, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    this._muzzle.visible = false;
    scene.add(this._muzzle);
    this._muzzleT = 0;
  }

  // Cabinet style (v151): the player exists before any cabinet starts, so it
  // swaps materials live. makeSatinMat reads CABINET_STYLE at call time, so
  // calling it here inside a cabinet returns that cabinet's variant; null
  // restores the original satin mat (kept, never disposed).
  setCabinetStyle(mode) {
    if (!this._satinMat) this._satinMat = this.mat;   // first call: remember home
    if (this._cabShell) { this.mesh.remove(this._cabShell); this._cabShell.material.dispose(); this._cabShell = null; }
    if (!mode) {
      this.mat = this._satinMat;
    } else {
      this.mat = makeSatinMat(
        mode === 'tokotron' ? 0xe8f6ff : mode === 'gaundrop' ? 0xfcfcfc
          : mode === 'loadout' ? 0xd8e8c8 : mode === 'kaikki' ? 0x9aa0a8
          : mode === 'nexdeus' ? 0xf6eaff : 0xf0e0d8,
        'blob', PLAYER_RADIUS);
      if (mode === 'tokotron') {
        this._cabShell = new THREE.Mesh(this.mesh.geometry, new THREE.MeshBasicMaterial({
          color: 0x00ffff, side: THREE.BackSide,
          blending: THREE.AdditiveBlending, depthWrite: false,
          transparent: true, opacity: 0.9,
        }));
        this._cabShell.scale.setScalar(1.09);
        this.mesh.add(this._cabShell);
      }
    }
    this.mat.transparent = true;
    this.mat.opacity = 0.98;
    this._gu = this.mat.uniforms ?? this.mat.gooU;
    this._gu.uWobble.value = 0.6;
    this.mesh.material = this.mat;
    // dash ghosts wear the cabinet's neon
    const ghostCol = mode === 'tokotron' ? 0x00ffff
                   : mode === 'gaundrop' ? 0xfcfcfc
                   : mode === 'binding'  ? 0xcc4466
                   : mode === 'loadout'  ? 0x99ff44
                   : mode === 'kaikki'   ? 0xcc3333
                   : mode === 'nexdeus'  ? 0xff44ff : 0x88bbff;
    for (const g of this._ghosts) {
      g.mesh.material.color.setHex(ghostCol);
      g.mesh.material.blending = mode === 'tokotron' ? THREE.AdditiveBlending : THREE.NormalBlending;
      g.mesh.material.needsUpdate = true;
    }
  }

  get invincible() { return this._dashTime > 0 || this._mercyT > 0 || this._invincBoost > 0; }
  get dashing()   { return this._dashTime > 0; }
  get position()  { return this.mesh.position; }

  grantInvincibility(t)  { this._invincBoost   = Math.max(this._invincBoost, t); }
  grantFireRateBoost(t)  { this._fireRateBoost = Math.max(this._fireRateBoost, t); }

  // Same adapter pattern as enemy.js: legacy goo ShaderMaterials carry these as
  // uniforms; the satin physical material uses native emissive/opacity.
  _setEmissive(hex) {
    if (this.mat.uniforms) this.mat.uniforms.uEmissive.value.setHex(hex);
    else this.mat.emissive.setHex(hex);
  }
  _setOpacity(val) {
    if (this.mat.uniforms) this.mat.uniforms.uOpacity.value = val;
    else this.mat.opacity = val;
  }

  reset() {
    this.alive    = true;
    this.hp       = MAX_HP;
    this._mercyT  = 0;
    this._flashT  = 0;
    this._dashTime = 0;
    this._dashCD   = 0;
    this._fireT    = 0;
    this._ghostT        = 0;
    this._invincBoost   = 0;
    this._fireRateBoost = 0;
    this._sq  = 1.0;
    this._sqV = 0.0;
    this._prevX = 0; this._prevZ = 0;
    this._velX = 0; this._velZ = 0;
    this._stretch = 0;
    this._gu.uStretch.value = 0;
    this.maxHp         = MAX_HP;
    this._weaponMode   = 'SINGLE';
    this._burstQueue   = [];
    this._speedMult    = 1.0;
    this._fireRateMult = 1.0;
    this._dashCDMult   = 1.0;
    this._setEmissive(0x000000);
    this._setOpacity(0.98);
    this.mesh.scale.setScalar(1);
    this.mesh.visible = true;
    this.mesh.position.set(0, PLAYER_RADIUS, 0);
    for (const g of this._ghosts) { g.life = 0; g.mesh.visible = false; }
    this._muzzleT = 0;
    if (this._muzzle) this._muzzle.visible = false;
    this._eyeL.visible = true;
    this._eyeR.visible = true;
  }

  hit() {
    if (this.invincible || !this.alive) return;
    this.hp--;
    if (this.hp <= 0) { this.die(); return; }
    this._flashT = 0.25;
    this._mercyT = MERCY_DURATION;
    this._dashTime = 0; // cancel dash on hit
    this._sqV -= 0.9;   // squash on impact
  }

  dash(aimDir) {
    if (this._dashTime > 0 || this._dashCD > 0) return;
    this._dashDir = aimDir.valid
      ? { x: aimDir.x, z: aimDir.z }
      : { x: this._lastAim.x, z: this._lastAim.z };
    this._dashTime = DASH_DUR;
    this._ghostT   = 0;
    this._sqV += 0.6; // elongate at dash start
  }

  update(dt, moveDir, aimDir, bullets, halfX, halfZ) {
    if (!this.alive) return;

    if (this._dashCD        > 0) this._dashCD        -= dt;
    if (this._fireT         > 0) this._fireT         -= dt;
    if (this._invincBoost   > 0) this._invincBoost   -= dt;
    if (this._fireRateBoost > 0) this._fireRateBoost -= dt;

    // Hit flash (red emissive)
    if (this._flashT > 0) {
      this._flashT -= dt;
      this._setEmissive(0xff1100);
    } else if (this._mercyT <= 0) {
      this._setEmissive(0x000000);
    }

    if (this._dashTime > 0) {
      this._dashTime -= dt;
      this.mesh.position.x += this._dashDir.x * DASH_SPEED * dt;
      this.mesh.position.z += this._dashDir.z * DASH_SPEED * dt;

      this._setOpacity(VIS.hz
        ? (Math.floor(this._dashTime * VIS.hz) % 2 ? 0.35 : 0.98)   // v151: square 12Hz blink
        : 0.35 + 0.65 * Math.abs(Math.sin(this._dashTime * 55)));

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
        this._dashCD = DASH_CD * this._dashCDMult;
        if (this._mercyT <= 0) this._setOpacity(0.98);
      }
    } else {
      // Normal movement always applies — even during mercy i-frames
      this.mesh.position.x += moveDir.x * SPEED * this._speedMult * dt;
      this.mesh.position.z += moveDir.z * SPEED * this._speedMult * dt;
    }

    // Mercy i-frame flicker — independent of movement
    if (this._mercyT > 0) {
      this._mercyT -= dt;
      this._setOpacity(0.3 + 0.7 * Math.abs(Math.sin(this._mercyT * 12)));
      if (this._mercyT <= 0) {
        this._setOpacity(0.98);
        this._setEmissive(0x000000);
      }
    }

    // Ghost fade
    for (const g of this._ghosts) {
      if (g.life > 0) {
        g.life -= dt;
        if (g.life <= 0) {
          g.mesh.visible = false;
        } else {
          let t = g.life / GHOST_LIFE;
          if (VIS.hz) t = Math.ceil(t * VIS.hz * GHOST_LIFE) / (VIS.hz * GHOST_LIFE);  // v151: chunky frames
          g.mesh.material.opacity = t * 0.45;
          g.mesh.scale.setScalar(0.6 + 0.4 * t);
        }
      }
    }

    // Muzzle flash fade (quick expand-and-vanish)
    if (this._muzzleT > 0) {
      this._muzzleT -= dt;
      const mt = Math.max(0, this._muzzleT / 0.05);
      this._muzzle.visible = true;
      this._muzzle.material.opacity = mt * 0.9;
      this._muzzle.scale.setScalar(0.6 + (1 - mt) * 0.8);
    } else if (this._muzzle.visible) {
      this._muzzle.visible = false;
    }

    // Spring squash
    this._sqV = (this._sqV - (this._sq - 1.0) * 0.28) * 0.84;
    this._sq  = Math.max(0.55, Math.min(1.55, this._sq + this._sqV));
    const _psx = 1 / Math.sqrt(Math.max(this._sq, 0.1));
    this.mesh.scale.set(_psx, this._sq, _psx);

    const hx = halfX - PLAYER_RADIUS;
    const hz = halfZ - PLAYER_RADIUS;
    this.mesh.position.x = Math.max(-hx, Math.min(hx, this.mesh.position.x));
    this.mesh.position.z = Math.max(-hz, Math.min(hz, this.mesh.position.z));

    // ── Movement stretch (v31): subtle lunge while walking, strong on dash ────
    {
      const invDt = 1 / Math.max(dt, 1e-4);
      const ivx = (this.mesh.position.x - this._prevX) * invDt;
      const ivz = (this.mesh.position.z - this._prevZ) * invDt;
      this._prevX = this.mesh.position.x;
      this._prevZ = this.mesh.position.z;
      this._velX += (ivx - this._velX) * 0.4;
      this._velZ += (ivz - this._velZ) * 0.4;
      const sp = Math.hypot(this._velX, this._velZ);
      const target = Math.min(sp * 0.025, 0.45);   // walk ≈0.15, dash ≈0.45
      this._stretch += (target - this._stretch) * 0.35;
      this._gu.uStretch.value = this._stretch;
      if (sp > 0.3) this._gu.uStretchDir.value.set(this._velX / sp, this._velZ / sp);
    }

    for (let i = this._burstQueue.length - 1; i >= 0; i--) {
      this._burstQueue[i].t -= dt;
      if (this._burstQueue[i].t <= 0) {
        const { dx, dz } = this._burstQueue[i];
        const ox = this.mesh.position.x + dx * (PLAYER_RADIUS + 0.3);
        const oz = this.mesh.position.z + dz * (PLAYER_RADIUS + 0.3);
        bullets.spawnDir(ox, oz, dx, dz, true);
        this.onShoot?.();
        this._burstQueue.splice(i, 1);
      }
    }

    if (aimDir.valid && this._fireT <= 0) {
      this._lastAim = { x: aimDir.x, z: aimDir.z };
      const ox = this.mesh.position.x + aimDir.x * (PLAYER_RADIUS + 0.3);
      const oz = this.mesh.position.z + aimDir.z * (PLAYER_RADIUS + 0.3);
      const baseRate = FIRE_RATE * this._fireRateMult * (this._fireRateBoost > 0 ? 0.4 : 1);
      const mode = this._weaponMode;
      if (mode === 'SPREAD' || mode === 'SPREAD2') {
        const offsets = mode === 'SPREAD2' ? [-3, -2, -1, 0, 1, 2, 3] : [-2, -1, 0, 1, 2];
        const step    = mode === 'SPREAD2' ? Math.PI / 10 : Math.PI / 9;
        for (const offset of offsets) {
          const a = offset * step;
          const c = Math.cos(a), s = Math.sin(a);
          bullets.spawnDir(ox, oz, aimDir.x * c - aimDir.z * s, aimDir.x * s + aimDir.z * c, true);
        }
        this.onShoot?.();
      } else if (mode === 'BURST' || mode === 'BURST2') {
        bullets.spawnDir(ox, oz, aimDir.x, aimDir.z, true);
        if (mode === 'BURST2') {
          this._burstQueue.push(
            { t: 0.10, dx: aimDir.x, dz: aimDir.z }, { t: 0.20, dx: aimDir.x, dz: aimDir.z },
            { t: 0.30, dx: aimDir.x, dz: aimDir.z }, { t: 0.40, dx: aimDir.x, dz: aimDir.z },
          );
        } else {
          this._burstQueue.push({ t: 0.12, dx: aimDir.x, dz: aimDir.z }, { t: 0.24, dx: aimDir.x, dz: aimDir.z });
        }
        this.onShoot?.();
      } else if (mode === 'HOMING' || mode === 'HOMING2') {
        // Homing pod (v70): fires a bullet that gradually steers toward the
        // nearest enemy; Lv2 locks on tighter (higher turn rate).
        bullets.spawnDir(ox, oz, aimDir.x, aimDir.z, true, undefined, false, null, true,
          mode === 'HOMING2' ? 10 : 6);
        this.onShoot?.();
      } else {
        // SINGLE, LASER, LASER2, RAPID, RAPID2
        bullets.spawnDir(ox, oz, aimDir.x, aimDir.z, true);
        this.onShoot?.();
      }
      this._fireT = (mode === 'RAPID') ? baseRate * 0.45 :
                    (mode === 'RAPID2') ? baseRate * 0.28 :
                    (mode === 'HOMING2') ? baseRate * 0.75 : baseRate;
      // Muzzle flash at the barrel — shown immediately (fade handled next frames)
      this._muzzleT = 0.05;
      this._muzzle.position.set(
        this.mesh.position.x + aimDir.x * (PLAYER_RADIUS + 0.35),
        0.3,
        this.mesh.position.z + aimDir.z * (PLAYER_RADIUS + 0.35));
      this._muzzle.visible = true;
      this._muzzle.material.opacity = 0.9;
      this._muzzle.scale.setScalar(0.6);
    }

    // ── Eyes ──────────────────────────────────────────────────────────────────
    if (this._eyesOn) {
      const ax = this._lastAim.x, az = this._lastAim.z;
      const px = -az, pz = ax; // perpendicular
      const ed = 0.4, es = 0.14; // eye distance from center, lateral separation
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
    if (this._muzzle) this._muzzle.visible = false;
    this._eyeL.visible = false;
    this._eyeR.visible = false;
  }

  toggleEyes() {
    this._eyesOn = !this._eyesOn;
    this._eyeL.visible = this._eyesOn && this.alive;
    this._eyeR.visible = this._eyesOn && this.alive;
  }
}
