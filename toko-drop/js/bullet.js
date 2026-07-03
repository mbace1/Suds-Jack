import * as THREE from 'three';

const POOL_SIZE           = 300;
const ENEMY_BULLET_SPEED  = 7;
const PLAYER_BULLET_SPEED = 24;
export const BULLET_CONFIG = { enemySpeed: ENEMY_BULLET_SPEED, playerBulletScale: 1.0 };

// Visual-only readability boost for player bullets. playerBulletScale also
// drives the player-bullet HITBOX (collision in main.js + the "bigger bullets"
// upgrade), so we must NOT change that to make bullets look chunkier — this
// factor enlarges only the rendered halo/core, leaving the hitbox untouched.
const PLAYER_BULLET_VISUAL_BOOST = 1.3;

export const BULLET_R     = 0.15;
export const FAT_BULLET_R = 0.45;

class Bullet {
  constructor(scene) {
    // Bullet-hell projectile: a crisp solid-white core ringed by a saturated
    // additive halo. The hard white centre + glowing rim reads as a discrete
    // "bullet" — visually distinct from the matte goo splatter chunks (which are
    // opaque colour blobs that fall and squash on the floor).
    const haloGeo = new THREE.SphereGeometry(0.15, 10, 8);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(haloGeo, this.mat);
    this.mesh.visible = false;
    scene.add(this.mesh);

    // Solid bright core — child of the halo so it inherits position + pulse.
    this.coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.96, depthWrite: false,
    });
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), this.coreMat);
    this.core.scale.setScalar(0.5);
    this.mesh.add(this.core);

    // Drop shadow — depth cue so bullets read as floating, not floor splatter.
    const shadowGeo = new THREE.CircleGeometry(1, 8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false,
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.visible = false;
    scene.add(this.shadow);

    this.vx = 0; this.vz = 0;
    this.alive = false;
    this.isPlayer = false;
    this.lifetime = 0;
    this.fat = false;
    this.speed = ENEMY_BULLET_SPEED;
    this.originType = null; // enemy type that fired this bullet (null = player / gate / dash-boom)
    this.homing = false;    // Homing pod (v70): steers toward the nearest enemy each frame
    this.turnRate = 0;
  }
}

export class BulletPool {
  constructor(scene) {
    this._pool = Array.from({ length: POOL_SIZE }, () => new Bullet(scene));
    this.active = [];
  }

  spawnDir(x, z, dx, dz, isPlayer, color, fat = false, originType = null, homing = false, turnRate = 6, speedMult = 1) {
    const b = this._pool.pop();
    if (!b) return;
    const speed = (isPlayer ? PLAYER_BULLET_SPEED : (fat ? 3.5 : BULLET_CONFIG.enemySpeed)) * speedMult;
    b.speed = speed;
    b.fat = fat;
    b.mesh.position.set(x, 0.3, z);
    // Saturated halo colour: player bright cyan-green, enemy hot orange-red. The
    // white core stays white so every bullet keeps a readable bright centre.
    const resolvedColor = color ?? (isPlayer ? 0x66ffcc : 0xff5533);
    b.mat.color.set(resolvedColor);
    b.vx = dx * speed; b.vz = dz * speed;
    b.alive = true; b.isPlayer = isPlayer; b.originType = originType;
    b.homing = homing; b.turnRate = turnRate;
    b.lifetime = 4;
    b.mesh.visible = true;
    b._phase = Math.random() * Math.PI * 2;
    // Enemy bullets run a touch larger so the threats you must dodge read clearly.
    b._baseScale = fat ? 3.0
      : (isPlayer ? BULLET_CONFIG.playerBulletScale * PLAYER_BULLET_VISUAL_BOOST : 1.6);
    b.mesh.scale.setScalar(b._baseScale);
    this.active.push(b);
  }

  update(dt, halfSize, enemies = null, playerPos = null) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      if (b.homing) {
        // Player homing bullets chase the nearest enemy; enemy homing bullets
        // (BOTFLY, v88) chase the player.
        if (b.isPlayer && enemies) this._steerHoming(b, dt, enemies);
        else if (!b.isPlayer && playerPos) this._steerToward(b, dt, playerPos.x, playerPos.z);
      }
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.z += b.vz * dt;
      b.lifetime -= dt;
      const p = b.mesh.position;
      if (b.lifetime <= 0 || Math.abs(p.x) > halfSize + 2 || Math.abs(p.z) > halfSize + 2) {
        this.recycleAt(i);
      } else {
        // Update shadow
        const shadowR = b.fat ? 0.5 : 0.18;
        b.shadow.position.set(p.x, 0.02, p.z);
        b.shadow.scale.setScalar(shadowR);
        b.shadow.visible = true;

        // Enemy bullets gently pulse so the threats you must dodge stay easy to track.
        if (!b.isPlayer && !b.fat) {
          const pulse = 1 + 0.15 * Math.sin(performance.now() * 0.012 + b._phase);
          b.mesh.scale.setScalar(b._baseScale * pulse);
        }
      }
    }
  }

  // Rotates the bullet's velocity a fraction of the way toward the nearest
  // alive enemy each frame — a turn, not a snap, so it reads as "homing" and
  // stays dodgeable rather than becoming a guaranteed hit.
  _steerHoming(b, dt, enemies) {
    let nearest = null, nearestD2 = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.position.x - b.mesh.position.x, dz = e.position.z - b.mesh.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < nearestD2) { nearestD2 = d2; nearest = e; }
    }
    if (!nearest) return;
    this._steerToward(b, dt, nearest.position.x, nearest.position.z);
  }

  // Shared limited-rate turn toward a world point (used by both homing kinds).
  _steerToward(b, dt, x, z) {
    const dx = x - b.mesh.position.x, dz = z - b.mesh.position.z;
    const len = Math.hypot(dx, dz) || 1;
    const tx = (dx / len) * b.speed, tz = (dz / len) * b.speed;
    const turn = Math.min(1, b.turnRate * dt);
    b.vx += (tx - b.vx) * turn;
    b.vz += (tz - b.vz) * turn;
  }

  recycleAt(i) {
    const b = this.active[i];
    b.alive = false;
    b.mesh.visible = false;
    b.mesh.scale.setScalar(1);
    b.shadow.visible = false;
    b.fat = false;
    b.originType = null;
    b.homing = false;
    this.active.splice(i, 1);
    this._pool.push(b);
  }

  clear() {
    while (this.active.length) this.recycleAt(0);
  }
}
