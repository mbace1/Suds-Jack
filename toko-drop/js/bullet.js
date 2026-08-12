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

// ── Instanced rendering (v189) ────────────────────────────────────────────────
// Every bullet used to be three live Meshes (additive halo + white core child +
// drop shadow), so a full 300-bullet field cost ~900 draw calls — the ceiling
// that capped dense curtains, boss fans and CLOSE COMBAT revenge rings. The pool
// now draws the whole field in THREE InstancedMeshes (halo / core / shadow) and
// each Bullet keeps a scene-less Object3D as `mesh` purely as a position+scale
// holder, so every external reader (collision loops read `b.mesh.position`) is
// untouched. Geometry radii are baked so a per-instance scalar of b.mesh.scale.x
// reproduces the old parent/child sizing exactly:
//   old halo  = SphereGeometry(0.15) at parent scale        → geo 0.15,  scale s
//   old core  = SphereGeometry(0.15) child at 0.5×, ×parent → geo 0.075, scale s
//   old shadow= CircleGeometry(1) at shadowR                → geo 1,     scale shadowR
class Bullet {
  constructor() {
    // Scene-less holder: carries position + scale for the sim and for the many
    // main.js collision loops that read `b.mesh.position.{x,z}`. Never added to
    // the scene and never rendered on its own — the InstancedMeshes draw it.
    this.mesh = new THREE.Object3D();
    this.mesh.position.set(0, 0.3, 0);

    this.vx = 0; this.vz = 0;
    this.alive = false;
    this.isPlayer = false;
    this.lifetime = 0;
    this.fat = false;
    this.speed = ENEMY_BULLET_SPEED;
    this.originType = null; // enemy type that fired this bullet (null = player / gate / dash-boom)
    this.homing = false;    // Homing pod (v70): steers toward the nearest enemy each frame
    this.turnRate = 0;
    this._phase = 0;
    this._baseScale = 1;
    this._color = new THREE.Color(0xffffff); // per-bullet halo tint
  }
}

export class BulletPool {
  constructor(scene) {
    this._pool = Array.from({ length: POOL_SIZE }, () => new Bullet());
    this.active = [];

    // Halo — saturated additive glow, per-instance colour (player cyan-green /
    // enemy hot orange-red / event colours). Core stays pure white so every
    // bullet keeps a crisp readable centre; shadow is the floating depth cue.
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.96, depthWrite: false,
    });
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false,
    });

    this._halo   = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 10, 8), haloMat, POOL_SIZE);
    this._core   = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 8, 6), coreMat, POOL_SIZE);
    // Shadow disc: bake the flat orientation into the geometry so the per-instance
    // matrix only carries position + radius (no rotation bookkeeping per frame).
    const shadowGeo = new THREE.CircleGeometry(1, 8);
    shadowGeo.rotateX(-Math.PI / 2);
    this._shadow = new THREE.InstancedMesh(shadowGeo, shadowMat, POOL_SIZE);

    for (const inst of [this._halo, this._core, this._shadow]) {
      inst.frustumCulled = false;                       // bullets span the whole arena
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      inst.count = 0;
      scene.add(inst);
    }
    // Prime the halo's per-instance colour buffer so setColorAt is allocated.
    this._halo.setColorAt(0, new THREE.Color(0xffffff));

    this._dummy = new THREE.Object3D();
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
    b._color.set(resolvedColor);
    b.vx = dx * speed; b.vz = dz * speed;
    b.alive = true; b.isPlayer = isPlayer; b.originType = originType;
    b.homing = homing; b.turnRate = turnRate;
    b.lifetime = 4;
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
      } else if (!b.isPlayer && !b.fat) {
        // Enemy bullets gently pulse so the threats you must dodge stay easy to track.
        const pulse = 1 + 0.15 * Math.sin(performance.now() * 0.012 + b._phase);
        b.mesh.scale.setScalar(b._baseScale * pulse);
      }
    }
    this._render();
  }

  // Writes the whole active field into the three InstancedMeshes. count is set to
  // the live bullet total so recycled slots never leave ghosts; every active slot
  // is fully repainted each frame (matrix + halo colour), so no clearing needed.
  _render() {
    const n = this.active.length;
    const d = this._dummy;
    for (let i = 0; i < n; i++) {
      const b = this.active[i];
      const p = b.mesh.position;
      const s = b.mesh.scale.x;

      d.position.set(p.x, p.y, p.z);
      d.scale.setScalar(s);
      d.rotation.set(0, 0, 0);
      d.updateMatrix();
      this._halo.setMatrixAt(i, d.matrix);
      this._core.setMatrixAt(i, d.matrix);
      this._halo.setColorAt(i, b._color);

      // Shadow: flat disc on the floor, sized independently of the bullet pulse.
      const shadowR = b.fat ? 0.5 : 0.18;
      d.position.set(p.x, 0.02, p.z);
      d.scale.setScalar(shadowR);
      d.updateMatrix();
      this._shadow.setMatrixAt(i, d.matrix);
    }
    this._halo.count = n;
    this._core.count = n;
    this._shadow.count = n;
    this._halo.instanceMatrix.needsUpdate = true;
    this._core.instanceMatrix.needsUpdate = true;
    this._shadow.instanceMatrix.needsUpdate = true;
    if (this._halo.instanceColor) this._halo.instanceColor.needsUpdate = true;
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
    b.mesh.scale.setScalar(1);
    b.fat = false;
    b.originType = null;
    b.homing = false;
    this.active.splice(i, 1);
    this._pool.push(b);
  }

  clear() {
    while (this.active.length) this.recycleAt(0);
    this._halo.count = 0;
    this._core.count = 0;
    this._shadow.count = 0;
  }
}
