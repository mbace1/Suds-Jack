import * as THREE from 'three';

export const EnemyType = { BLOB: 0, SPITTER: 1, FANNER: 2, WEAVER: 3, SPLITTER: 4 };

const CFG = {
  [EnemyType.BLOB]:     { color: 0x00ccaa, radius: 0.55, speed: 2.8, hp: 1, bulletColor: null,     fireInterval: null },
  [EnemyType.SPITTER]:  { color: 0xffaa00, radius: 0.9,  speed: 1.6, hp: 3, bulletColor: 0xffcc44, fireInterval: 2.2  },
  [EnemyType.FANNER]:   { color: 0xff00aa, radius: 0.75, speed: 1.4, hp: 3, bulletColor: 0xff66cc, fireInterval: 1.5  },
  [EnemyType.WEAVER]:   { color: 0xaa44ff, radius: 0.8,  speed: 0.6, hp: 3, bulletColor: 0xcc88ff, fireInterval: 0.08 },
  [EnemyType.SPLITTER]: { color: 0x88ff22, radius: 1.1,  speed: 1.0, hp: 5, bulletColor: 0xaaff44, fireInterval: null },
};

export const ENEMY_RADIUS = 0.9; // conservative max; per-type radius exposed via e.radius

export class Enemy {
  constructor(scene, type, x, z, speedMult = 1, intervalMult = 1) {
    this.type          = type;
    this.alive         = true;
    this.hp            = CFG[type].hp;
    this._dying        = false;
    this._deathT       = 0;
    this._flashT       = 0;
    this._hitWobble    = 0;
    this._wobbleT      = Math.random() * Math.PI * 2; // random phase so enemies don't pulse in sync
    this._speedMult    = speedMult;
    this._intervalMult = intervalMult;
    this._t            = Math.random() * 0.5;         // stagger initial fire
    this._isTelegraphing = false;
    this._telegraphT   = 0;
    this._telegraphMax = 0;
    this._spiralAngle  = 0;
    this._spiralAccel  = 0;
    this._strafeDir    = 1;
    this._strafeTimer  = 1.5 + Math.random();
    this._childrenReady = false;
    this.chunks        = []; // populated on death for main.js to consume

    const cfg = CFG[type];
    const geo = new THREE.SphereGeometry(cfg.radius, 14, 10);
    this.mat  = new THREE.MeshPhongMaterial({
      color:       cfg.color,
      emissive:    0x000000,
      transparent: true,
      opacity:     0.82,
      shininess:   80,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.set(x, cfg.radius, z);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
  }

  get position() { return this.mesh.position; }
  get color()    { return CFG[this.type].color; }
  get radius()   { return CFG[this.type].radius; }
  get hpFrac()   { return this.hp / CFG[this.type].hp; }

  hit() {
    if (!this.alive) return false;
    this.hp--;
    this._flashT    = 0.12;
    this._hitWobble = 0.35;
    if (this.hp <= 0) { this.destroy(); return true; }
    return false;
  }

  update(dt, playerPos, bullets) {
    if (!this.alive) return;

    const cfg  = CFG[this.type];
    const ex   = this.mesh.position.x, ez = this.mesh.position.z;
    const ddx  = playerPos.x - ex, ddz = playerPos.z - ez;
    const dist = Math.hypot(ddx, ddz) || 0.001;
    const spd  = cfg.speed * this._speedMult;

    // ── Movement ──────────────────────────────────────────────────────────────
    switch (this.type) {
      case EnemyType.BLOB:
      case EnemyType.SPLITTER:
        if (dist > 1.2) {
          this.mesh.position.x += (ddx / dist) * spd * dt;
          this.mesh.position.z += (ddz / dist) * spd * dt;
        }
        break;

      case EnemyType.SPITTER: {
        const want = 10;
        if (dist > want + 1) {
          this.mesh.position.x += (ddx / dist) * spd * dt;
          this.mesh.position.z += (ddz / dist) * spd * dt;
        } else if (dist < want - 1) {
          this.mesh.position.x -= (ddx / dist) * spd * dt;
          this.mesh.position.z -= (ddz / dist) * spd * dt;
        }
        break;
      }

      case EnemyType.FANNER: {
        const want  = 8;
        const perpX = -ddz / dist, perpZ = ddx / dist;
        this._strafeTimer -= dt;
        if (this._strafeTimer <= 0) {
          this._strafeDir   = -this._strafeDir;
          this._strafeTimer = 2.5 + Math.random();
        }
        const radial = dist > want + 1.5 ? 1 : dist < want - 1.5 ? -1 : 0;
        this.mesh.position.x += (ddx / dist * radial + perpX * this._strafeDir) * spd * dt;
        this.mesh.position.z += (ddz / dist * radial + perpZ * this._strafeDir) * spd * dt;
        break;
      }

      case EnemyType.WEAVER:
        // Lissajous drift — no direct pursuit
        this.mesh.position.x += Math.sin(this._wobbleT * 0.7) * spd * 0.5 * dt;
        this.mesh.position.z += Math.cos(this._wobbleT * 0.5) * spd * 0.5 * dt;
        break;
    }

    // ── Flash / emissive ──────────────────────────────────────────────────────
    if (this._flashT > 0) {
      this._flashT -= dt;
      this.mat.emissive.setHex(0xffffff);
    } else if (this._isTelegraphing) {
      this.mat.emissive.setHex(this.type === EnemyType.SPITTER ? 0x442200 : 0x440022);
    } else {
      this.mat.emissive.setHex(0x000000);
    }

    // ── Wobble / scale (gelatin idle breathe + hit squash) ───────────────────
    this._wobbleT += dt;
    if (this._hitWobble > 0) this._hitWobble = Math.max(0, this._hitWobble - dt * 2.0);
    const isSplitter = this.type === EnemyType.SPLITTER;
    const amp     = isSplitter ? 0.10 : 0.04;
    const freq    = isSplitter ? 4.0  : 2.8;
    const breathe = amp * Math.sin(this._wobbleT * freq);
    // SPITTER telegraph overrides scale in _tick(); skip wobble while telegraphing
    if (!this._isTelegraphing || this.type !== EnemyType.SPITTER) {
      const sy  = Math.max(0.1, 1 + breathe - this._hitWobble);
      const sxz = Math.max(0.1, 1 - breathe * 0.5 + this._hitWobble * 0.5);
      this.mesh.scale.set(sxz, sy, sxz);
    }

    // ── Fire ──────────────────────────────────────────────────────────────────
    this._t += dt;
    this._tick(playerPos, bullets, dt);
  }

  _tick(playerPos, bullets, dt) {
    const cfg = CFG[this.type];
    if (!cfg.fireInterval) return;

    const interval = this.type === EnemyType.WEAVER
      ? cfg.fireInterval
      : cfg.fireInterval * this._intervalMult;

    const ex = this.mesh.position.x, ez = this.mesh.position.z;

    switch (this.type) {
      case EnemyType.SPITTER:
        if (!this._isTelegraphing && this._t >= interval) {
          this._t              = 0;
          this._telegraphT     = 0.6;
          this._telegraphMax   = 0.6;
          this._isTelegraphing = true;
        }
        if (this._isTelegraphing) {
          this._telegraphT -= dt;
          const frac = Math.max(0, this._telegraphT / this._telegraphMax);
          this.mesh.scale.setScalar(1 + 0.35 * (1 - frac));
          if (this._telegraphT <= 0) {
            this._isTelegraphing = false;
            this._ring(ex, ez, 8, cfg.bulletColor, bullets);
          }
        }
        break;

      case EnemyType.FANNER:
        if (!this._isTelegraphing && this._t >= interval) {
          this._t              = 0;
          this._telegraphT     = 0.4;
          this._telegraphMax   = 0.4;
          this._isTelegraphing = true;
        }
        if (this._isTelegraphing) {
          this._telegraphT -= dt;
          if (this._telegraphT <= 0) {
            this._isTelegraphing = false;
            const adx = playerPos.x - ex, adz = playerPos.z - ez;
            const len = Math.hypot(adx, adz);
            if (len > 0) {
              const base  = Math.atan2(adz, adx);
              const count = 6;
              const span  = Math.PI * 0.6; // 108° total spread
              for (let j = 0; j < count; j++) {
                const a = base - span / 2 + j * (span / (count - 1));
                bullets.spawnDir(ex, ez, Math.cos(a), Math.sin(a), false, cfg.bulletColor);
              }
            }
          }
        }
        break;

      case EnemyType.WEAVER: {
        const rotSpeed = (0.38 + this._spiralAccel) / this._intervalMult;
        if (this._t >= cfg.fireInterval) {
          this._t = 0;
          bullets.spawnDir(ex, ez, Math.cos(this._spiralAngle), Math.sin(this._spiralAngle), false, cfg.bulletColor);
          this._spiralAngle += rotSpeed;
          this._spiralAccel  = Math.min(this._spiralAccel + 0.002, 0.4);
        }
        break;
      }
    }
  }

  _ring(x, z, count, color, bullets) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      bullets.spawnDir(x, z, Math.cos(a), Math.sin(a), false, color);
    }
  }

  updateDeath(dt) {
    if (!this._dying) return;
    this._deathT -= dt;
    const t = 1 - Math.max(this._deathT, 0) / 0.28;
    this.mesh.scale.setScalar(1 + t * 2.2);
    this.mat.opacity = (1 - t) * 0.82;
    if (this._deathT <= 0) {
      this._dying = false;
      this.mesh.visible = false;
      if (this.type === EnemyType.SPLITTER) this._childrenReady = true;
    }
  }

  destroy() {
    this.alive   = false;
    this._dying  = true;
    this._deathT = 0.28;
    this.mat.emissive.setHex(0xffffff);
    this.mat.transparent = true;
    this.mat.depthWrite  = false;
    this.mesh.scale.setScalar(1);
    this.mesh.visible = true;

    // Chunk spawn data for main.js
    const count = 5 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const hspd  = 3 + Math.random() * 4;
      this.chunks.push({
        x:  this.mesh.position.x,
        y:  this.mesh.position.y,
        z:  this.mesh.position.z,
        vx: Math.cos(angle) * hspd,
        vy: 3 + Math.random() * 5,
        vz: Math.sin(angle) * hspd,
      });
    }
  }

  removeFrom(scene) {
    this.mesh.visible = false;
    scene.remove(this.mesh);
  }
}
