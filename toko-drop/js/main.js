import * as THREE from 'three';
import { InputManager } from './input.js?v=48';
import { BulletPool, BULLET_R, FAT_BULLET_R, BULLET_CONFIG } from './bullet.js?v=48';
import { Player, PLAYER_RADIUS } from './player.js?v=48';
import { Enemy, EnemyType, GOO_TIME, makeGooMat } from './enemy.js?v=48';
import { audio } from './audio.js?v=48';
import { initDesigner } from './designer.js?v=48';
import { t, getLang, setLang, langs } from './lang.js?v=48';
import { TUNING } from './tuning.js?v=48';

// Arena dimensions are swappable between portrait and landscape modes.
const ARENA_PRESETS = {
  portrait:  { halfX: 11, halfZ: 18, camRest: [0, 27, 21], camLook: [0, 0, -3], label: 'PORTRAIT' },
  landscape: { halfX: 19, halfZ: 11, camRest: [0, 27, 14], camLook: [0, 0, -2], label: 'LANDSCAPE · STEAM DECK' },
};
let HALF_X      = ARENA_PRESETS.portrait.halfX;   // arena half-width
let HALF_Z      = ARENA_PRESETS.portrait.halfZ;   // arena half-depth
const GRID_CELL = 1.286;                          // world units per grid cell (keeps cells square)
const ROUND_DUR = 20; // seconds per wave

// ── Seeded PRNG (mulberry32) ───────────────────────────────────────────────────
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let runSeed = 0;
let rng = Math.random.bind(Math);

// ── Wave scaling (Nex Machina pacing) ─────────────────────────────────────────────
// Difficulty climbs to ~8/10 by wave 10 (the "knee"), then plateaus with a slow
// creep toward 9/10 — tuned for competitive 5–10 min runs.
function getWaveScale(wave) {
  const ramp = Math.min(wave, 10) - 1;   // 0..9 across waves 1-10
  const post = Math.max(0, wave - 10);   // 0,1,2… after wave 10
  return {
    speedMult:    Math.min(1.1 + ramp * 0.09 + post * 0.02, 2.4),
    intervalMult: Math.max(1.0 - ramp * 0.055 - post * 0.010, 0.35),
  };
}

// Wave rhythm — creates intensity pulses across waves (swarm beats + breather lulls).
function waveKind(w) {
  if (w % 8 === 0)           return 'boss';   // every 8th: big guaranteed enemy
  if (w % 4 === 0)           return 'spike';  // every 4th (not boss): heavy budget
  if (w >= 3 && w % 3 === 0) return 'swarm';  // every 3rd (not spike/boss): rush of bodies
  return 'normal';
}

// Returns the spawn list [{type, t: spawnDelaySecs, count?}] for a wave.
// Spawn delays are tight so the arena fills fast (supports instant wave-end + dense pressure).
// Enemy pool: [type, minWave, budget-cost]. Unlocked types grow with wave number.
// getEnemySchedule uses rng (seeded per run) so every run plays differently.
function getEnemySchedule(wave) {
  const { GLOBBO, SPITTOR, FANNER, WEEVA, SPLITTA,
          YELA_CUBE, ORANGE_CUBE, SLUDGE_CUBE, REDD_CUBE, PURP_CUBE, TORO, BAMBU, PYRA, OMEGA, BOTFLY } = EnemyType;
  const POOL = [
    // [type, minWave, cost]
    [GLOBBO,      1, 1], [YELA_CUBE,  1, 1], [SPITTOR,    1, 2], [FANNER,     1, 2],
    [ORANGE_CUBE, 2, 2], [WEEVA,      2, 3],
    [SLUDGE_CUBE, 3, 2], [BAMBU,      3, 3], [SPLITTA,    3, 3],
    [REDD_CUBE,   4, 3],
    [PURP_CUBE,   5, 3], [PYRA,       5, 4], [BOTFLY,     5, 4],
    [TORO,        6, 5],
  ];
  const available = POOL.filter(([, min]) => wave >= min);

  const kind       = waveKind(wave);
  const isBoss     = kind === 'boss';
  const isSpike    = kind === 'spike';
  const isSwarm    = kind === 'swarm';
  // A normal wave directly after any intense wave runs lighter — the breather/lull.
  const isBreather = kind === 'normal' && waveKind(wave - 1) !== 'normal';

  // Budget grows slowly in early waves so the ramp feels earned, not punishing.
  // Knee at wave 10; kind multipliers are gentler than before so even spike/swarm
  // waves in the first few rounds don't wall the player.
  const rampB  = Math.min(wave, 10);
  const postB  = Math.max(0, wave - 10);
  const base   = 5 + rampB * 1.8 + postB * 0.8;
  const mod    = isBoss ? 2.0 : isSpike ? 1.4 : isSwarm ? 1.25 : isBreather ? 0.6 : 1.0;
  const budget = Math.floor(base * mod);

  // Swarm waves favour bodies (groups/twins of cheap fast enemies); others use the full mix.
  const VARIANTS = isSwarm
    ? ['group', 'group', 'twin', 'normal']
    : ['normal', 'normal', 'normal', 'elite', 'elitelite', 'twin', 'group'];
  const swarmPool = available.filter(([, , c]) => c <= 2);
  const drawPool  = (isSwarm && swarmPool.length) ? swarmPool : available;

  const list = [];
  let spent = 0, t = 0;
  // Cap grows with wave number so early waves stay sparse; later waves can fill the arena.
  const cap = isSwarm
    ? Math.min(22, 5 + Math.floor(wave * 1.4))
    : Math.min(14, 4 + wave);

  // Boss wave: guaranteed boss up front. OMEGA (v71) is boss-exclusive — it
  // never appears in POOL, so every boss wave gets a purpose-built enemy
  // instead of an existing regular type just scaled up.
  if (isBoss) {
    list.push({ type: OMEGA, t: 0, boss: true });
    spent += Math.ceil(4 * 2.5);
    t = 4;
  }

  while (spent < budget && list.length < cap) {
    const [type, , cost] = drawPool[Math.floor(rng() * drawPool.length)];
    const variant = VARIANTS[Math.floor(rng() * VARIANTS.length)];
    let entry, entryCost;
    if (variant === 'elite') {
      entryCost = Math.ceil(cost * 1.6);
      entry = { type, t, elite: true };
    } else if (variant === 'elitelite') {
      entryCost = Math.ceil(cost * 1.25);
      entry = { type, t, elitelite: true };
    } else if (variant === 'twin') {
      entryCost = Math.ceil(cost * 1.6);
      entry = { type, t, count: 2 };
    } else if (variant === 'group') {
      const cheaper = available.filter(([, , c]) => c <= 2);
      const pick = cheaper.length ? cheaper[Math.floor(rng() * cheaper.length)] : [type, 0, cost];
      const cnt = 3 + Math.floor(rng() * 2);
      entryCost = pick[2] * cnt;
      entry = { type: pick[0], t, count: cnt };
    } else {
      entryCost = cost;
      entry = { type, t };
    }
    if (spent + entryCost > budget + 3) break;
    list.push(entry);
    // Tight spawn cadence so most of the budget is on-field before the player can
    // clear it (prevents instant wave-end from trivialising waves). Swarms burst faster.
    t += isSwarm ? (0.08 + rng() * 0.28) : (0.18 + rng() * 0.5);
    spent += entryCost;
  }
  return list.length ? list : [{ type: GLOBBO, t: 0 }];
}

// ── Renderer ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('canvas-game'),
  antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.setSize(innerWidth, innerHeight);

// ── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);
scene.fog = new THREE.Fog(0x0d0d1a, 42, 80);

// ── Camera ────────────────────────────────────────────────────────────────
const CAM_REST = new THREE.Vector3(0, 27, 21);
const CAM_LOOK = new THREE.Vector3(0, 0, -3);
const camera   = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 120);
camera.position.copy(CAM_REST);
camera.lookAt(CAM_LOOK);

// ── Screen shake ───────────────────────────────────────────────────────────
let shakeTrauma = 0;
function addShake(trauma) {
  if (reduceMotion) return; // Settings: reduce-motion skips camera shake entirely
  shakeTrauma = Math.min(shakeTrauma + trauma, 1);
}
function updateShake(dt) {
  if (shakeTrauma <= 0) {
    camera.position.copy(CAM_REST);
    camera.lookAt(CAM_LOOK);
    return;
  }
  shakeTrauma = Math.max(0, shakeTrauma - dt * 2.8);
  const mag = shakeTrauma * shakeTrauma;
  const t   = performance.now() / 1000;
  camera.position.set(
    CAM_REST.x + Math.sin(t * 41) * mag * 1.8,
    CAM_REST.y + Math.sin(t * 37) * mag * 1.2,
    CAM_REST.z + Math.sin(t * 43) * mag * 1.2,
  );
  camera.lookAt(CAM_LOOK);
}

// ── Lights ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(8, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// ── Arena ───────────────────────────────────────────────────────────────────
const FLOOR_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FLOOR_FRAG = `
  precision highp float;
  uniform float uTime;
  uniform float uGridX;
  uniform float uGridZ;
  varying vec2 vUv;
  void main() {
    vec3 base = vec3(0.079, 0.079, 0.169);
    // Frequencies (set from arena dims) keep grid cells square on the non-square floor
    float gx = abs(fract(vUv.x * uGridX) - 0.5);
    float gz = abs(fract(vUv.y * uGridZ) - 0.5);
    float grid = max(0.0, 1.0 - min(gx, gz) * 50.0);
    float pulse = 0.7 + 0.3 * sin(uTime * 1.2);
    vec3 gridColor = mix(vec3(0.13, 0.07, 0.38), vec3(0.0, 0.55, 0.50), grid);
    vec3 col = mix(base, gridColor, grid * pulse * 0.7);
    gl_FragColor = vec4(col, 1.0);
  }
`;
const floorUniforms = {
  uTime:  { value: 0 },
  uGridX: { value: (HALF_X * 2) / GRID_CELL },
  uGridZ: { value: (HALF_Z * 2) / GRID_CELL },
};
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(HALF_X * 2, HALF_Z * 2),
  new THREE.ShaderMaterial({ vertexShader: FLOOR_VERT, fragmentShader: FLOOR_FRAG, uniforms: floorUniforms }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const border = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(HALF_X * 2, 0.05, HALF_Z * 2)),
  new THREE.LineBasicMaterial({ color: 0x5555cc }),
);
border.position.y = 0.02;
scene.add(border);

// Swap arena dimensions, camera framing, floor + border geometry, and grid uniforms.
function applyArenaMode(landscape) {
  const p = landscape ? ARENA_PRESETS.landscape : ARENA_PRESETS.portrait;
  HALF_X = p.halfX; HALF_Z = p.halfZ;
  CAM_REST.set(...p.camRest);
  CAM_LOOK.set(...p.camLook);
  camera.position.copy(CAM_REST);
  camera.lookAt(CAM_LOOK);
  floor.geometry.dispose();
  floor.geometry = new THREE.PlaneGeometry(HALF_X * 2, HALF_Z * 2);
  border.geometry.dispose();
  border.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(HALF_X * 2, 0.05, HALF_Z * 2));
  floorUniforms.uGridX.value = (HALF_X * 2) / GRID_CELL;
  floorUniforms.uGridZ.value = (HALF_Z * 2) / GRID_CELL;
}

// ── Death FX: chunks + puddles ────────────────────────────────────────────────
// Pooled death chunks — one InstancedMesh (1 draw call, zero per-spawn alloc).
// Replaces the old per-chunk Mesh churn that spiked GC during dense swarm clears.
const CHUNK_POOL = 256;
class ChunkPool {
  // Default geometry is the deliberately low-poly (5×3) sphere — it reads as an
  // angular nugget, right for cube-family debris and hard shards. Pass a denser
  // sphere for smooth goo droplets (blob-family deaths must NOT look like cubes).
  constructor(sc, geo = new THREE.SphereGeometry(1, 5, 3)) {
    const mat = new THREE.MeshBasicMaterial();              // opaque; instanceColor multiplies
    this.mesh = new THREE.InstancedMesh(geo, mat, CHUNK_POOL);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sc.add(this.mesh);
    // Per-instance state (typed arrays — no per-frame allocation)
    this.x  = new Float32Array(CHUNK_POOL); this.y  = new Float32Array(CHUNK_POOL); this.z = new Float32Array(CHUNK_POOL);
    this.vx = new Float32Array(CHUNK_POOL); this.vy = new Float32Array(CHUNK_POOL); this.vz = new Float32Array(CHUNK_POOL);
    this.life = new Float32Array(CHUNK_POOL);
    this.size = new Float32Array(CHUNK_POOL);
    this.sq   = new Float32Array(CHUNK_POOL);
    this.sqV  = new Float32Array(CHUNK_POOL);
    this.active = new Uint8Array(CHUNK_POOL);
    this._m   = new THREE.Matrix4();
    this._p   = new THREE.Vector3();
    this._q   = new THREE.Quaternion();
    this._s   = new THREE.Vector3();
    this._col = new THREE.Color();
    for (let i = 0; i < CHUNK_POOL; i++) this._hide(i);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  _hide(i) {
    this._m.makeScale(0, 0, 0);
    this.mesh.setMatrixAt(i, this._m);
  }
  _findSlot() {
    for (let i = 0; i < CHUNK_POOL; i++) if (!this.active[i]) return i;
    // Pool full — reuse the slot with the least life remaining.
    let min = 0, minLife = Infinity;
    for (let i = 0; i < CHUNK_POOL; i++) if (this.life[i] < minLife) { minLife = this.life[i]; min = i; }
    return min;
  }
  spawn(x, y, z, vx, vy, vz, color, size = 0.18) {
    const i = this._findSlot();
    this.x[i] = x; this.y[i] = y; this.z[i] = z;
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.life[i] = 1.4; this.size[i] = size;
    this.sq[i] = 1.0; this.sqV[i] = 0.0; this.active[i] = 1;
    this._col.set(color);
    this.mesh.setColorAt(i, this._col);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    let dirty = false;
    for (let i = 0; i < CHUNK_POOL; i++) {
      if (!this.active[i]) continue;
      dirty = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.active[i] = 0; this._hide(i); continue; }
      this.vy[i] -= 14 * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.z[i] += this.vz[i] * dt;
      if (this.y[i] <= 0.01 && this.vy[i] < 0) {
        this.y[i] = 0;
        this.sqV[i] -= Math.abs(this.vy[i]) * 0.4; // squash on landing
        this.vy[i] = 0; this.vx[i] *= 0.35; this.vz[i] *= 0.35;
      }
      // Spring squash
      this.sqV[i] = (this.sqV[i] - (this.sq[i] - 1.0) * 0.32) * 0.80;
      this.sq[i]  = Math.max(0.55, Math.min(1.4, this.sq[i] + this.sqV[i]));
      const sq   = this.sq[i];
      const sx   = 1 / Math.sqrt(Math.max(sq, 0.1));
      const fade = Math.min(1, this.life[i] / 0.3);  // shrink-to-zero in place of alpha fade
      const f    = this.size[i] * fade;
      this._p.set(this.x[i], this.y[i], this.z[i]);
      this._s.set(sx * f, sq * f, sx * f);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() {
    for (let i = 0; i < CHUNK_POOL; i++) { this.active[i] = 0; this._hide(i); }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// Pooled motion-trail afterimages — translucent ghost spheres dropped by fast
// movers (blobs + TORO). One InstancedMesh; shrink-to-zero fade over ~0.45 s.
const TRAIL_POOL = 256;
class TrailPool {
  constructor(sc) {
    const geo = new THREE.SphereGeometry(1, 5, 3);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, TRAIL_POOL);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sc.add(this.mesh);
    this.x = new Float32Array(TRAIL_POOL); this.y = new Float32Array(TRAIL_POOL); this.z = new Float32Array(TRAIL_POOL);
    this.life = new Float32Array(TRAIL_POOL);
    this.size = new Float32Array(TRAIL_POOL);
    this.active = new Uint8Array(TRAIL_POOL);
    this._m = new THREE.Matrix4();
    this._p = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._col = new THREE.Color();
    for (let i = 0; i < TRAIL_POOL; i++) this._hide(i);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  _hide(i) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); }
  _findSlot() {
    for (let i = 0; i < TRAIL_POOL; i++) if (!this.active[i]) return i;
    let min = 0, minLife = Infinity;
    for (let i = 0; i < TRAIL_POOL; i++) if (this.life[i] < minLife) { minLife = this.life[i]; min = i; }
    return min;
  }
  spawn(x, y, z, color, size = 0.4) {
    const i = this._findSlot();
    this.x[i] = x; this.y[i] = y; this.z[i] = z;
    this.life[i] = 0.45; this.size[i] = size; this.active[i] = 1;
    this._col.set(color);
    this.mesh.setColorAt(i, this._col);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    let dirty = false;
    for (let i = 0; i < TRAIL_POOL; i++) {
      if (!this.active[i]) continue;
      dirty = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.active[i] = 0; this._hide(i); continue; }
      const f = this.size[i] * (this.life[i] / 0.45); // shrink-to-zero fade
      this._p.set(this.x[i], this.y[i], this.z[i]);
      this._s.set(f, f, f);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() {
    for (let i = 0; i < TRAIL_POOL; i++) { this.active[i] = 0; this._hide(i); }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

class Puddle {
  constructor(sc, x, z, color, radius) {
    this._life = 5;
    this._sq   = 0.0;
    this._sqV  = 0.0;
    this.mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 14), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(x, 0.01, z);
    this.mesh.scale.setScalar(0); // splat in from 0
    sc.add(this.mesh);
  }
  update(dt) {
    this._life -= dt;
    // Spring splat from 0 to 1 with overshoot
    this._sqV = (this._sqV - (this._sq - 1.0) * 0.55) * 0.74;
    this._sq  = Math.max(0, this._sq + this._sqV);
    this.mesh.scale.setScalar(Math.max(0, Math.min(1.5, this._sq)));
    this.mat.opacity = 0.55 * Math.max(0, this._life / 5);
    return this._life > 0;
  }
  remove(sc) { sc.remove(this.mesh); }
}

class PoisonZone {
  constructor(sc, x, z, radius) {
    this._life = 3.5;
    this._t = 0;
    this.radius = radius;
    // Toxic fill.
    this.mat = new THREE.MeshBasicMaterial({
      color: 0x88cc00, transparent: true, opacity: 0.5, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(x, 0.015, z);
    sc.add(this.mesh);
    // Warning rim — a bright pulsing outline on the lethal edge while the zone
    // is active, so the player can read exactly where (and when) it hurts.
    this.rimMat = new THREE.MeshBasicMaterial({
      color: 0xccff33, transparent: true, opacity: 0.8,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.rim = new THREE.Mesh(new THREE.RingGeometry(radius * 0.8, radius, 32), this.rimMat);
    this.rim.rotation.x = -Math.PI / 2;
    this.rim.position.set(x, 0.02, z);
    sc.add(this.rim);
  }
  get isDangerous() { return this._life > 1.0; }
  update(dt) {
    this._life -= dt;
    this._t += dt;
    if (this._life > 1.0) {
      // Active hazard — saturated, pulsing fill + bright pulsing rim.
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(this._t * 6));
      this.mat.color.setHex(0x88cc00);
      this.mat.opacity = 0.38 + 0.22 * pulse;
      this.rim.visible = true;
      this.rimMat.opacity = 0.45 + 0.45 * pulse;
      this.rim.scale.setScalar(1 + 0.05 * pulse);
    } else {
      // Spent — desaturate to a dull grey-green and drop the rim: reads as safe.
      this.rim.visible = false;
      this.mat.color.setHex(0x556644);
      this.mat.opacity = 0.22 * (this._life / 1.0);
    }
    return this._life > 0;
  }
  remove(sc) {
    sc.remove(this.mesh); sc.remove(this.rim);
    this.mesh.geometry.dispose(); this.rim.geometry.dispose();
    this.mat.dispose(); this.rimMat.dispose();
  }
}

class SlimeTrail {
  constructor(sc, x, z, radius) {
    this._life = 2.0;
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xddee00,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 8), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(x, 0.013, z);
    sc.add(this.mesh);
  }
  update(dt) {
    this._life -= dt;
    this.mat.opacity = 0.45 * Math.max(0, this._life / 2.0);
    return this._life > 0;
  }
  remove(sc) { sc.remove(this.mesh); }
}

class SludgeRibbon {
  constructor(sc, enemy) {
    this._enemy     = enemy;
    this._fading    = false;
    this._fadeLife  = 2.0;
    const maxPts    = 12;
    this._geo       = new THREE.BufferGeometry();
    this._posArr    = new Float32Array(maxPts * 2 * 3);
    this._geo.setAttribute('position', new THREE.BufferAttribute(this._posArr, 3));
    const idx = [];
    for (let i = 0; i < maxPts - 1; i++) {
      const a = i*2, b = i*2+1, c = (i+1)*2, d = (i+1)*2+1;
      idx.push(a, b, c,  b, d, c);
    }
    this._geo.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({
      color: 0x88cc00, transparent: true, opacity: 0.4,
      depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this._geo, this.mat);
    this.mesh.position.y = 0.015;
    sc.add(this.mesh);
  }
  update(dt) {
    if (!this._enemy.alive && !this._fading) this._fading = true;
    if (this._fading) {
      this._fadeLife -= dt;
      this.mat.opacity = 0.4 * Math.max(0, this._fadeLife / 2.0);
      if (this._fadeLife <= 0) return false;
    }
    const pts = this._enemy._trailPositions;
    const n   = pts ? pts.length : 0;
    if (n >= 2) {
      const hw = 0.4;
      for (let i = 0; i < n; i++) {
        let tx, tz;
        if (i < n - 1) { tx = pts[i+1].x - pts[i].x; tz = pts[i+1].z - pts[i].z; }
        else            { tx = pts[i].x - pts[i-1].x; tz = pts[i].z - pts[i-1].z; }
        const tl = Math.hypot(tx, tz) || 1;
        const px = -tz / tl * hw, pz = tx / tl * hw;
        const b = i * 6;
        this._posArr[b]   = pts[i].x + px; this._posArr[b+1] = 0; this._posArr[b+2] = pts[i].z + pz;
        this._posArr[b+3] = pts[i].x - px; this._posArr[b+4] = 0; this._posArr[b+5] = pts[i].z - pz;
      }
      for (let i = n; i < 12; i++) {
        const b = i * 6;
        this._posArr[b]   = pts[n-1].x; this._posArr[b+1] = 0; this._posArr[b+2] = pts[n-1].z;
        this._posArr[b+3] = pts[n-1].x; this._posArr[b+4] = 0; this._posArr[b+5] = pts[n-1].z;
      }
    } else {
      this._posArr.fill(0);
    }
    this._geo.attributes.position.needsUpdate = true;
    return true;
  }
  remove(sc) { sc.remove(this.mesh); this._geo.dispose(); }
}

class Gate {
  constructor(sc) {
    const x = (Math.random() - 0.5) * HALF_X * 1.5;
    const z = (Math.random() - 0.5) * HALF_Z * 1.5;
    const angle = Math.random() * Math.PI;
    this._x = x; this._z = z; this._angle = angle;
    this.alive = true;
    this._dmgCooldown = 0;

    const postMat = new THREE.MeshPhongMaterial({ color: 0x888899, shininess: 60 });
    const postGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.8, 8);
    const halfSep = 2;
    const dx = Math.cos(angle + Math.PI/2) * halfSep;
    const dz = Math.sin(angle + Math.PI/2) * halfSep;
    this._p1 = new THREE.Mesh(postGeo, postMat);
    this._p1.position.set(x + dx, 0.9, z + dz);
    this._p2 = new THREE.Mesh(postGeo, postMat);
    this._p2.position.set(x - dx, 0.9, z - dz);
    sc.add(this._p1); sc.add(this._p2);

    this._laserMat = new THREE.MeshBasicMaterial({
      color: 0x44ff88, transparent: true, opacity: 0.7, depthWrite: false,
    });
    this._laser = new THREE.Mesh(new THREE.BoxGeometry(4, 0.25, 0.5), this._laserMat);
    this._laser.position.set(x, 0.9, z);
    // Posts run along (-sin a, cos a); three.js Y-rotation maps local +X to
    // (cos θ, -sin θ), so the beam must rotate by -(angle + π/2) to line up
    // with the posts (a plain +angle mirrors the z-axis and crosses them).
    this._laser.rotation.y = -(angle + Math.PI / 2);
    sc.add(this._laser);

    // Glow beam — a thicker additive halo around the core, reads as an energy barrier
    this._glowMat = new THREE.MeshBasicMaterial({
      color: 0x44ff88, transparent: true, opacity: 0.28, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this._glow = new THREE.Mesh(new THREE.BoxGeometry(4, 0.7, 1.1), this._glowMat);
    this._glow.position.copy(this._laser.position);
    this._glow.rotation.y = this._laser.rotation.y;
    sc.add(this._glow);
  }
  update(dt, t) {
    if (!this.alive) return;
    const pulse = 0.5 + 0.4 * Math.sin(t * 8);
    this._laserMat.opacity = pulse;
    this._glowMat.opacity  = 0.12 + 0.18 * pulse;
    if (this._dmgCooldown > 0) this._dmgCooldown -= dt;
  }
  deactivate(sc) {
    this.alive = false;
    sc.remove(this._laser);
    sc.remove(this._glow);
  }
  remove(sc) {
    sc.remove(this._p1); sc.remove(this._p2); sc.remove(this._laser); sc.remove(this._glow);
  }
  // Returns true if point (px, pz) intersects the laser beam (approximate capsule check)
  hitsPoint(px, pz, radius) {
    if (!this.alive) return false;
    const dx = px - this._x, dz = pz - this._z;
    // Project onto laser axis (laser runs along post-to-post direction: -sin, cos)
    const ax = -Math.sin(this._angle), az = Math.cos(this._angle);
    const para  = dx * ax + dz * az;
    const perpX = dx - para * ax, perpZ = dz - para * az;
    const perpDist = Math.hypot(perpX, perpZ);
    return Math.abs(para) < 2.0 && perpDist < 0.2 + radius;
  }
}

// Boss identity (v59): a flat pulsing ground ring marks the every-8th-wave boss.
// It follows the enemy each frame and turns red when the boss enrages (<35% HP).
function makeBossAura(enemy) {
  const r = enemy.radius * 1.7;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(r * 0.82, r, 40),
    new THREE.MeshBasicMaterial({
      color: 0xffcc33, transparent: true, opacity: 0.6,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  const p = enemy.position;
  ring.position.set(p.x, 0.04, p.z);
  scene.add(ring);
  return { enemy, ring, baseColor: 0xffcc33 };
}

// ── Weapon pod system ─────────────────────────────────────────────────────────
// Each entry: the player._weaponMode to set, display glyph, orb color, rarity level.
const WEAPON_PODS = {
  S:  { mode: 'SPREAD',  color: 0xffcc44, level: 1 },
  S2: { mode: 'SPREAD2', color: 0xffee11, level: 2 },
  B:  { mode: 'BURST',   color: 0x44ffcc, level: 1 },
  B2: { mode: 'BURST2',  color: 0x11ffee, level: 2 },
  L:  { mode: 'LASER',   color: 0xff3355, level: 1 },
  L2: { mode: 'LASER2',  color: 0xff1133, level: 2 },
  R:  { mode: 'RAPID',   color: 0xaa55ff, level: 1 },
  R2: { mode: 'RAPID2',  color: 0xcc22ff, level: 2 },
  H:  { mode: 'HOMING',  color: 0x44ddff, level: 1 },
  H2: { mode: 'HOMING2', color: 0x22aaff, level: 2 },
};
// v88: H/H2 removed from the drop pools — homing is enemy-exclusive now
// (BOTFLY fires homing shots). The HOMING firing modes stay implemented in
// case a pod is ever re-added.
const LV1_WEAPONS = ['S', 'B', 'L', 'R'];
const LV2_WEAPONS = ['S2', 'B2', 'L2', 'R2'];
const NON_WEAPON_COLORS = { hp: 0xff4466, invincible: 0xffffff, firerate: 0xff88aa, scoremult: 0xffdd22, score: 0x88ff88 };

function randomWeaponPodId(lv2Allowed = false) {
  if (lv2Allowed && Math.random() < 0.28) return LV2_WEAPONS[Math.floor(Math.random() * LV2_WEAPONS.length)];
  return LV1_WEAPONS[Math.floor(Math.random() * LV1_WEAPONS.length)];
}

function makeGlyphTexture(text, colorHex) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx2d = c.getContext('2d');
  const col = '#' + colorHex.toString(16).padStart(6, '0');
  ctx2d.strokeStyle = col;
  ctx2d.lineWidth = 2;
  ctx2d.beginPath(); ctx2d.arc(32, 32, 26, 0, Math.PI * 2); ctx2d.stroke();
  ctx2d.fillStyle = col;
  ctx2d.font = `bold ${text.length > 1 ? 22 : 28}px monospace`;
  ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
  ctx2d.fillText(text, 32, 33);
  return new THREE.CanvasTexture(c);
}

function equipWeapon(podId) {
  const def = WEAPON_PODS[podId];
  if (!def) return;
  player._weaponMode = def.mode;
  // Laser modes pierce; all others remove pierce (unless pierce card was taken)
  if (def.mode !== 'LASER' && def.mode !== 'LASER2') BULLET_CONFIG.playerWeaponPierce = false;
  else BULLET_CONFIG.playerWeaponPierce = true;
}

class Powerup {
  constructor(sc, x, z, type, driftX = 0, driftZ = 0) {
    this._life = 9.0;
    this.x = x; this.z = z;
    this._driftX = driftX; this._driftZ = driftZ;
    this._magTrailT = 0;
    this.collected = false;
    this._type = type;

    const wpDef = WEAPON_PODS[type];
    const orbColor = wpDef ? wpDef.color : (NON_WEAPON_COLORS[type] ?? 0xffffff);
    this.mat = new THREE.MeshBasicMaterial({ color: orbColor, transparent: true, opacity: 0.9 });
    const orbR = wpDef ? (wpDef.level === 2 ? 0.45 : 0.38) : 0.38;
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(orbR, 8, 6), this.mat);
    this.mesh.position.set(x, 0.6, z);
    sc.add(this.mesh);

    this._sprite = null;
    if (wpDef) {
      const tex = makeGlyphTexture(type, wpDef.color);
      const spMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      this._sprite = new THREE.Sprite(spMat);
      this._sprite.scale.setScalar(wpDef.level === 2 ? 1.1 : 0.9);
      this._sprite.position.set(x, 1.5, z);
      sc.add(this._sprite);
    }
  }
  update(dt, t) {
    this._life -= dt;
    this.x += this._driftX * dt;
    this.z += this._driftZ * dt;
    const y = 0.6 + Math.sin(t * 3) * 0.15;
    this.mesh.position.set(this.x, y, this.z);
    this.mat.opacity = 0.5 + 0.4 * Math.sin(t * 5);
    if (this._sprite) this._sprite.position.set(this.x, y + 0.9, this.z);
    return this._life > 0 && !this.collected;
  }
  remove(sc) {
    sc.remove(this.mesh);
    if (this._sprite) {
      this._sprite.material.map.dispose();
      this._sprite.material.dispose();
      sc.remove(this._sprite);
    }
  }
}

class CargoCluster {
  constructor(sc) {
    const count = 3 + Math.floor(rng() * 3);
    const edge  = Math.floor(rng() * 4);
    let sx, sz, dx, dz;
    if      (edge === 0) { sx = (rng()-0.5)*HALF_X*1.5; sz = -(HALF_Z+3); dx = 0;  dz =  1; }
    else if (edge === 1) { sx = (rng()-0.5)*HALF_X*1.5; sz =   HALF_Z+3;  dx = 0;  dz = -1; }
    else if (edge === 2) { sx = -(HALF_X+3); sz = (rng()-0.5)*HALF_Z*1.5; dx =  1; dz = 0;  }
    else                 { sx =   HALF_X+3;  sz = (rng()-0.5)*HALF_Z*1.5; dx = -1; dz = 0;  }
    this._dx = dx; this._dz = dz;
    this._speed = 5.5 + rng() * 2;
    const px = -dz, pz = dx; // perpendicular unit vector
    this._px = px; this._pz = pz;

    // Always a sinusoidal sweep — amp and freq vary per convoy
    this._curveAmp  = 3 + rng() * 5;
    this._curveFreq = 0.7 + rng() * 1.0;
    this._curvePhase = rng() * Math.PI * 2;
    this._cx = sx; this._cz = sz; // formation centre (advances each frame)
    this._elapsed = 0;

    this._drones = [];
    for (let i = 0; i < count; i++) {
      const basePerp = (i - (count - 1) / 2) * 1.4;
      // Goo moth: golden goo-shader body + translucent wing planes
      const bodyR = 0.32;
      const mat = makeGooMat(0xffdd55, 0.92, 1.0, bodyR);
      const body = new THREE.Mesh(new THREE.SphereGeometry(bodyR, 10, 8), mat);
      const mkWing = () => new THREE.Mesh(
        new THREE.PlaneGeometry(0.52, 0.28),
        new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.6, side: THREE.DoubleSide }),
      );
      const wL = mkWing(); wL.position.set(-0.40, 0.06, 0);
      const wR = mkWing(); wR.position.set( 0.40, 0.06, 0);
      const container = new THREE.Object3D();
      container.add(body, wL, wR);
      container.position.set(sx + px * basePerp, 0.8, sz + pz * basePerp);
      sc.add(container);
      this._drones.push({ container, body, mat, wL, wR, alive: true, escaped: false, basePerp });
    }
    this._killedCount = 0;
    this._done = false;
  }

  update(dt, t) {
    if (this._done) return 'done';
    this._elapsed += dt;
    this._cx += this._dx * this._speed * dt;
    this._cz += this._dz * this._speed * dt;
    const curveOff = Math.sin(this._curveFreq * this._elapsed + this._curvePhase) * this._curveAmp;
    let anyInArena = false;
    for (let i = 0; i < this._drones.length; i++) {
      const d = this._drones[i];
      if (!d.alive) continue;
      const perp = d.basePerp + curveOff;
      d.container.position.x = this._cx + this._px * perp;
      d.container.position.z = this._cz + this._pz * perp;
      // Wing flap + body spin
      const flap = Math.sin(t * 12 + i * 0.8) * 0.75;
      d.wL.rotation.z =  flap;
      d.wR.rotation.z = -flap;
      d.body.rotation.y = t * 1.5 + i * 0.5;
      const p = d.container.position;
      if (Math.abs(p.x) > HALF_X + 5 || Math.abs(p.z) > HALF_Z + 5) {
        d.escaped = true; d.alive = false;
      } else {
        anyInArena = true;
      }
    }
    if (!anyInArena) {
      this._done = true;
      return 'done';
    }
    return 'alive';
  }

  remove(sc) {
    for (const d of this._drones) sc.remove(d.container);
  }
}

class DamageNumber {
  constructor(worldX, worldY, worldZ) {
    this.pos   = new THREE.Vector3(worldX, worldY, worldZ);
    this._life = 0.6;
  }
  update(dt) { this._life -= dt; this.pos.y += 2.5 * dt; return this._life > 0; }
}

// ── Melee types ───────────────────────────────────────────────────────────────
const MELEE_TYPES = new Set([
  EnemyType.GLOBBO, EnemyType.SPLITTA,
  EnemyType.YELA_CUBE, EnemyType.SLUDGE_CUBE, EnemyType.REDD_CUBE, EnemyType.PURP_CUBE,
  EnemyType.REDD_MINI, EnemyType.PURP_MINI,
  EnemyType.TORO,
]);
const BLOB_TYPES = new Set([
  EnemyType.GLOBBO, EnemyType.SPITTOR, EnemyType.FANNER, EnemyType.WEEVA, EnemyType.SPLITTA,
]);
const CUBE_TYPES_FX = new Set([
  EnemyType.YELA_CUBE, EnemyType.ORANGE_CUBE, EnemyType.SLUDGE_CUBE,
  EnemyType.REDD_CUBE, EnemyType.PURP_CUBE, EnemyType.REDD_MINI, EnemyType.PURP_MINI,
]);

// ── Game objects ──────────────────────────────────────────────────────────────
const input   = new InputManager();
const bullets = new BulletPool(scene);
const player  = new Player(scene);
let enemies      = [];
const chunkPool  = new ChunkPool(scene);                                   // angular: cube debris, hard shards
const gooChunkPool = new ChunkPool(scene, new THREE.SphereGeometry(1, 9, 7)); // smooth droplets: goo splatter
// Cube-looking death particles only come from cube enemies; everything else
// (blobs, TORO, BAMBU, PYRA, OMEGA, pickups, moths) bursts into round goo bits.
const chunksFor = type => CUBE_TYPES_FX.has(type) ? chunkPool : gooChunkPool;
const trailPool  = new TrailPool(scene);
let puddles      = [];
let poisonZones  = [];
let slimeTrails  = [];
let sludgeRibbons = [];
let gates         = [];
let powerups      = [];
let bossAuras     = [];
let damageNumbers = [];
let cargoCluster    = null;
let clusterTimer    = 0;
let clusterSpawnAt  = 0; // seconds into wave to spawn cluster (0 = none this wave)
let convoyTrailT    = 0; // v38: cadence for the convoy's golden trail ribbon
let wave         = 0;
let waveTimer    = 0;
let waveDuration = ROUND_DUR;
let pendingSpawns = [];
let _prevDashing = false;

// ── Score ─────────────────────────────────────────────────────────────────────
let score        = 0;
let streak       = 0;
let runTimer     = 0;

// ── Hit telemetry (v41) ───────────────────────────────────────────────────────
let collectedUpgrades = []; // upgrade ids applied this run (roguelike)
let hitEventLog       = []; // one entry per HP-loss event this run
const STREAK_FLASH_DUR = 0.4;
let streakFlashT = 0;
let scoreMultT = 0; // Score Multiplier powerup (v72): ×2 score on kill while active
// ── Personal bests (local; structured for a future online leaderboard) ───────
const PB_KEY = 'tokoDropPB';
function loadPB() {
  try {
    const raw = JSON.parse(localStorage.getItem(PB_KEY));
    if (raw && raw.v === 1) {
      raw.runs = Array.isArray(raw.runs) ? raw.runs : [];
      return raw;
    }
  } catch { /* fall through to legacy migration */ }
  const legacy = parseInt(localStorage.getItem('tokoDropHi') || '0');
  return { v: 1, bestScore: legacy, bestTime: 0, bestWave: 0, lastRun: null, runs: [] };
}
let pb = loadPB();
let _runBests = { isBestScore: false, isBestTime: false, isBestWave: false };

// Build the leaderboard-shaped record for the current run.
function makeRunRecord() {
  return {
    v: 1,
    score, time: Math.round(runTimer), wave, seed: runSeed,
    mode: roguelikeMode ? 'roguelike' : 'arcade',
    orientation: landscapeMode ? 'landscape' : 'portrait',
    date: new Date().toISOString(),
  };
}

// Record a finished run: update bests, persist, return which bests were newly set.
function recordRun() {
  const rec = makeRunRecord();
  const flags = {
    isBestScore: rec.score > pb.bestScore,
    isBestTime:  rec.time  > pb.bestTime,
    isBestWave:  rec.wave  > pb.bestWave,
  };
  pb.bestScore = Math.max(pb.bestScore, rec.score);
  pb.bestTime  = Math.max(pb.bestTime,  rec.time);
  pb.bestWave  = Math.max(pb.bestWave,  rec.wave);
  pb.lastRun   = rec;
  pb.runs = [...pb.runs, rec].sort((a, b) => b.score - a.score).slice(0, 10);
  try {
    localStorage.setItem(PB_KEY, JSON.stringify(pb));
    localStorage.setItem('tokoDropHi', String(pb.bestScore)); // keep legacy key in sync
  } catch { /* storage may be unavailable; bests still live in memory */ }
  return flags;
}

// Format whole seconds as "Xm Ys" (or "Ys" under a minute).
function fmtTime(secs) {
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

let hiScore = pb.bestScore;
// Roguelike mode (default on): show upgrade cards between waves. Off = plain arcade run.
let roguelikeMode = false;

// Orientation: respect an explicit player choice; otherwise default by device.
// A gamepad (Steam Deck) defaults to landscape so it "just works" without touching the toggle.
let orientUserSet = localStorage.getItem('tokoDropOrientSet') === '1';
function anyGamepadPresent() {
  if (!navigator.getGamepads) return false;
  for (const p of navigator.getGamepads()) { if (p) return true; }
  return false;
}
let landscapeMode = orientUserSet
  ? localStorage.getItem('tokoDropLandscape') === '1'
  : anyGamepadPresent();
applyArenaMode(landscapeMode);

// Settings (v75): audio volume + reduce-motion (screen shake), both persisted.
let audioVolume = (() => {
  const raw = parseFloat(localStorage.getItem('tokoDropVolume'));
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1.0;
})();
let reduceMotion = localStorage.getItem('tokoDropReduceMotion') === '1';
audio.setVolume(audioVolume);

// A pad that connects later (common — browsers reveal pads only after input) flips an
// un-chosen orientation to landscape live while still on the title screen.
window.addEventListener('gamepadconnected', () => {
  if (!orientUserSet && !landscapeMode && gameState === 'title') {
    landscapeMode = true;
    applyArenaMode(true);
    showTitle();  // re-render toggle chip + arena to reflect the switch
  }
});

function onKill(e) {
  streak++;
  score += 100 * streak * (scoreMultT > 0 ? 2 : 1);
  streakFlashT = STREAK_FLASH_DUR;
  addShake(0.07 + e.radius * 0.13);  // heavier enemies kick the camera harder
  const _cat = BLOB_TYPES.has(e.type) || e.type === EnemyType.BOTFLY ? 'blob'
    : e.type === EnemyType.TORO  ? 'toro'
    : e.type === EnemyType.BAMBU ? 'bambu'
    : e.type === EnemyType.PYRA  ? 'pyra' : 'cube';
  audio.enemyDieType(_cat);
  // Spawn death FX from chunk data populated by e.destroy()
  for (const cd of e.chunks) {
    chunksFor(e.type).spawn(cd.x, cd.y, cd.z, cd.vx, cd.vy, cd.vz, e.color, cd.size);
  }
  puddles.push(new Puddle(scene, e.position.x, e.position.z, e.color, e.radius * 1.5));
}

function onPlayerHit() {
  streak = 0;
  streakFlashT = 0;
  addShake(0.38);
  audio.playerHit();
}

function tryHitPlayer(source = 'bullet', attackerType = null) {
  if (player._shield) {
    player._shield = false;
    addShake(0.15);
    audio.playerHit();
    return false;
  }
  const hpBefore = player.hp;
  _hitFlashT = 0.32;
  player.hit();
  onPlayerHit();
  recordHitEvent(source, hpBefore, attackerType);
  return !player.alive;
}

// v41: capture a snapshot of game state at the moment player takes HP damage.
const _ET_NAMES = Object.fromEntries(Object.entries(EnemyType).map(([k, v]) => [v, k]));
let _lastHitTime = -1; // runTimer at the previous hit event (for gap tracking)
function recordHitEvent(source, hpBefore, attackerType) {
  const typeCounts = {};
  for (const e of enemies) {
    if (!e.alive) continue;
    const name = _ET_NAMES[e.type] ?? String(e.type);
    typeCounts[name] = (typeCounts[name] || 0) + 1;
  }
  const t = Math.round(runTimer);
  hitEventLog.push({
    wave, kind: waveKind(wave),
    time: t,
    waveTimeSecs: Math.round(waveTimer),
    hpBefore, hpAfter: player.hp,
    source,
    attacker: attackerType !== null ? (_ET_NAMES[attackerType] ?? String(attackerType)) : null,
    dashReady: player._dashCD <= 0 && !player.dashing,
    enemyCount: enemies.filter(e => e.alive).length,
    enemyTypes: typeCounts,
    bulletCount: bullets.active.filter(b => !b.isPlayer).length,
    timeSinceLastHit: _lastHitTime < 0 ? null : t - _lastHitTime,
    upgrades: [...collectedUpgrades],
    score,
  });
  _lastHitTime = t;
}

function saveHitLog() {
  if (hitEventLog.length === 0) return;
  const KEY = 'tokoDropHitLog';
  const sessions = JSON.parse(localStorage.getItem(KEY) || '[]');
  sessions.unshift({
    seed: runSeed, mode: roguelikeMode ? 'roguelike' : 'arcade',
    waveReached: wave, date: new Date().toISOString(),
    events: hitEventLog,
  });
  if (sessions.length > 20) sessions.length = 20;
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

function generateHitReport(sessions) {
  if (!sessions || sessions.length === 0) return 'No hit data yet. Play some runs first.';
  const allEv = sessions.flatMap(s => s.events);
  if (allEv.length === 0) return 'No hit events recorded.';

  const tally = obj => Object.entries(obj).sort((a, b) => b[1] - a[1]);
  const pct   = (n, tot) => `${(n / tot * 100).toFixed(0)}%`;

  const byKind = {}, byType = {}, bySrc = {}, byAttacker = {};
  let totalBullets = 0, dashDownHits = 0, clusterHits = 0;
  const gapsBetweenHits = [];
  for (const ev of allEv) {
    byKind[ev.kind]   = (byKind[ev.kind]   || 0) + 1;
    bySrc[ev.source]  = (bySrc[ev.source]  || 0) + 1;
    totalBullets += ev.bulletCount;
    if (ev.dashReady === false) dashDownHits++;
    if (ev.attacker) byAttacker[ev.attacker] = (byAttacker[ev.attacker] || 0) + 1;
    for (const [t, c] of Object.entries(ev.enemyTypes || {}))
      byType[t] = (byType[t] || 0) + c;
    if (ev.timeSinceLastHit !== null && ev.timeSinceLastHit <= 3) clusterHits++;
    if (ev.timeSinceLastHit !== null) gapsBetweenHits.push(ev.timeSinceLastHit);
  }
  const avgBullets = (totalBullets / allEv.length).toFixed(1);
  const deaths     = allEv.filter(e => e.hpAfter === 0).length;
  const withShield = allEv.filter(e => (e.upgrades || []).includes('shield')).length;
  const avgHitT    = (allEv.reduce((s, e) => s + e.time, 0) / allEv.length).toFixed(0);
  const avgGap     = gapsBetweenHits.length
    ? (gapsBetweenHits.reduce((a, b) => a + b, 0) / gapsBetweenHits.length).toFixed(1)
    : 'n/a';

  let r = `=== TOKO DROP HIT REPORT (${allEv.length} events · ${sessions.length} sessions) ===\n\n`;

  r += `DAMAGE SOURCE:\n`;
  for (const [src, n] of tally(bySrc)) r += `  ${src.padEnd(8)} ${n}  (${pct(n, allEv.length)})\n`;
  if (Object.keys(byAttacker).length) {
    r += `  by attacker type:\n`;
    for (const [t, n] of tally(byAttacker)) r += `    ${t.padEnd(16)} ${n}  (${pct(n, allEv.length)})\n`;
  }

  r += `\nWAVE KIND AT HIT:\n`;
  for (const [k, n] of tally(byKind)) r += `  ${k.padEnd(10)} ${n} hits\n`;

  r += `\nENEMY TYPES ON FIELD AT HIT (summed appearances):\n`;
  for (const [t, n] of tally(byType).slice(0, 8)) r += `  ${t.padEnd(14)} ${n}\n`;

  r += `\nSTATS:\n`;
  r += `  Avg enemy bullets on field at hit:  ${avgBullets}\n`;
  r += `  Hits while dash on cooldown:        ${dashDownHits} / ${allEv.length}  (${pct(dashDownHits, allEv.length)})\n`;
  r += `  Cluster hits (≤3s apart):           ${clusterHits}\n`;
  r += `  Avg gap between consecutive hits:   ${avgGap}s\n`;
  r += `  Killing hits (HP → 0):              ${deaths} / ${allEv.length}\n`;
  r += `  Hits without shield upgrade:        ${pct(allEv.length - withShield, allEv.length)}\n`;
  r += `  Avg time into run when hit:         ${avgHitT}s\n`;

  r += `\nTUNING NOTES:\n`;
  const topKind = tally(byKind)[0];
  if (topKind) r += `  · ${topKind[0].toUpperCase()} waves cause the most damage — budget or speed may need a trim\n`;
  const topType = tally(byType)[0];
  if (topType) r += `  · ${topType[0]} appears most at hit moments — it may outpace counterplay\n`;
  if (parseFloat(avgBullets) > 10)
    r += `  · High bullet density at hits (avg ${avgBullets}) — bullet patterns may need spread reduction\n`;
  if (dashDownHits / allEv.length > 0.5)
    r += `  · Dash cooldown is blocking escape in ${pct(dashDownHits, allEv.length)} of hits — consider shorter dash CD or more iframes\n`;
  if (clusterHits > allEv.length * 0.25)
    r += `  · ${clusterHits} cluster hits (≤3s gap) — a "blender" moment is killing runs; look at bullet clear / mercy timing\n`;
  const shieldlessPct = parseInt(pct(allEv.length - withShield, allEv.length));
  if (shieldlessPct > 65)
    r += `  · ${shieldlessPct}% of hits without shield — offering shield earlier would help survivability\n`;
  r += `  · Most hits happen at ~${avgHitT}s — powerups offered before this point help most\n`;

  return r;
}

window._hitReport = () => {
  const sessions = JSON.parse(localStorage.getItem('tokoDropHitLog') || '[]');
  const report = generateHitReport(sessions);
  console.log(report);
  return report;
};

window._hitLog = () => JSON.parse(localStorage.getItem('tokoDropHitLog') || '[]');

window._hitExport = () => {
  const sessions = JSON.parse(localStorage.getItem('tokoDropHitLog') || '[]');
  if (sessions.length === 0) { console.warn('No hit data to export.'); return; }
  const COLS = [
    'session_date','seed','mode','wave_reached',
    'event_wave','event_kind','time_in_run','time_in_wave',
    'hp_before','hp_after','source','attacker','dash_ready',
    'enemy_count','bullet_count','time_since_last_hit','upgrades','score',
    'enemy_types',
  ];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [COLS.join(',')];
  for (const s of sessions) {
    for (const ev of s.events) {
      rows.push([
        esc(s.date), esc(s.seed), esc(s.mode), esc(s.waveReached),
        esc(ev.wave), esc(ev.kind), esc(ev.time), esc(ev.waveTimeSecs),
        esc(ev.hpBefore), esc(ev.hpAfter), esc(ev.source), esc(ev.attacker ?? ''),
        esc(ev.dashReady ?? ''), esc(ev.enemyCount), esc(ev.bulletCount),
        esc(ev.timeSinceLastHit ?? ''), esc((ev.upgrades || []).join('+')), esc(ev.score),
        esc(Object.entries(ev.enemyTypes || {}).map(([t, n]) => `${t}:${n}`).join(' ')),
      ].join(','));
    }
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `toko_hits_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  console.log(`Exported ${rows.length - 1} rows across ${sessions.length} sessions.`);
};

// ── Player feedback ──────────────────────────────────────────────────────────
// Human-readable names for the death-screen "what went wrong" prompts.
const ENEMY_LABEL = {
  [EnemyType.GLOBBO]:      'teal globbo',
  [EnemyType.SPITTOR]:     'red spittor',
  [EnemyType.FANNER]:      'pink fanner',
  [EnemyType.WEEVA]:       'blue weeva',
  [EnemyType.SPLITTA]:     'green splitta',
  [EnemyType.YELA_CUBE]:   'yellow cube',
  [EnemyType.ORANGE_CUBE]: 'orange cube',
  [EnemyType.SLUDGE_CUBE]: 'sludge cube',
  [EnemyType.REDD_CUBE]:   'red cube',
  [EnemyType.PURP_CUBE]:   'purple cube',
  [EnemyType.REDD_MINI]:   'red mini',
  [EnemyType.PURP_MINI]:   'purple mini',
  [EnemyType.TORO]:        'Toro charger',
  [EnemyType.BAMBU]:       'Bambu lobber',
  [EnemyType.PYRA]:        'Pyra spinner',
  [EnemyType.OMEGA]:       'Omega boss',
};
const _cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// Build the quick-pick "reason" chips for the death screen. The first few are
// derived from this run's hit telemetry (the actual culprits), then a handful of
// always-available generic reasons. Each: { id, label }.
function buildFeedbackReasons() {
  const ev = hitEventLog;
  const out = [];
  const push = (id, label) => out.push({ id, label });
  if (ev.length) {
    const atk = {};
    for (const e of ev) if (e.attacker) atk[e.attacker] = (atk[e.attacker] || 0) + 1;
    const topAtk = Object.entries(atk).sort((a, b) => b[1] - a[1])[0];
    if (topAtk) {
      const label = ENEMY_LABEL[EnemyType[topAtk[0]]] ?? topAtk[0];
      push(`atk:${topAtk[0]}`, t('fbHit', _cap(label)));
    }
    const field = {};
    for (const e of ev) for (const [ty, c] of Object.entries(e.enemyTypes || {})) field[ty] = (field[ty] || 0) + c;
    const topField = Object.entries(field).sort((a, b) => b[1] - a[1])[0];
    if (topField && (!topAtk || topField[0] !== topAtk[0])) {
      const label = ENEMY_LABEL[EnemyType[topField[0]]] ?? topField[0];
      push(`field:${topField[0]}`, t('fbMany', label));
    }
    const dashDown = ev.filter(e => e.dashReady === false).length;
    if (dashDown / ev.length > 0.4) push('dash', t('fbDash'));
    const avgB = ev.reduce((s, e) => s + e.bulletCount, 0) / ev.length;
    if (avgB > 8) push('bullets', t('fbBullets'));
    const cluster = ev.filter(e => e.timeSinceLastHit !== null && e.timeSinceLastHit <= 3).length;
    if (cluster / ev.length > 0.25) push('blender', t('fbBlender'));
  }
  push('too_fast', t('fbTooFast'));
  push('unfair',   t('fbUnfair'));
  push('unclear',  t('fbUnclear'));
  // De-dup by id, cap at 4 (telemetry-derived reasons come first, so they win).
  const seen = new Set(); const reasons = [];
  for (const r of out) { if (seen.has(r.id)) continue; seen.add(r.id); reasons.push(r); if (reasons.length >= 4) break; }
  return reasons;
}

// Positive-feedback options — what the player enjoyed this run.
function buildPositiveReasons() {
  return [
    { id: 'like:weapons', label: t('likeWeapons') },
    { id: 'like:bosses',  label: t('likeBosses') },
    { id: 'like:feel',    label: t('likeFeel') },
    { id: 'like:dodging', label: t('likeDodging') },
  ];
}

// Persist one feedback entry. Stored under tokoDropFeedback (last 100), with a
// compact run summary so it's useful even without the full hit log.
function saveFeedback(selectedIds, selectedLabels, comment, likedIds = [], likedLabels = []) {
  if (!selectedIds.length && !likedIds.length && !comment) return;
  const KEY = 'tokoDropFeedback';
  const list = JSON.parse(localStorage.getItem(KEY) || '[]');
  const atk = {};
  for (const e of hitEventLog) if (e.attacker) atk[e.attacker] = (atk[e.attacker] || 0) + 1;
  // Hidden: a comment containing "fix" is also filed to an actionable fix list.
  const isFix = !!comment && comment.toLowerCase().includes('fix');
  list.unshift({
    date: new Date().toISOString(),
    seed: runSeed, mode: roguelikeMode ? 'roguelike' : 'arcade',
    wave, time: Math.round(runTimer), score,
    reasons: selectedLabels, reasonIds: selectedIds,
    liked: likedLabels, likedIds,
    comment: comment || '', isFix,
    hits: hitEventLog.length,
    topAttacker: Object.entries(atk).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  });
  if (list.length > 100) list.length = 100;
  localStorage.setItem(KEY, JSON.stringify(list));

  if (isFix) {
    const FIX_KEY = 'tokoDropFixList';
    const fixes = JSON.parse(localStorage.getItem(FIX_KEY) || '[]');
    fixes.unshift({ date: new Date().toISOString(), wave, comment, done: false });
    if (fixes.length > 200) fixes.length = 200;
    localStorage.setItem(FIX_KEY, JSON.stringify(fixes));
  }
}

window._feedback = () => {
  const list = JSON.parse(localStorage.getItem('tokoDropFeedback') || '[]');
  console.log(`=== TOKO DROP FEEDBACK (${list.length} entries) ===`);
  const likedTally = {};
  for (const f of list) for (const r of (f.liked || [])) likedTally[r] = (likedTally[r] || 0) + 1;
  if (Object.keys(likedTally).length) {
    console.log('LIKED:');
    for (const [r, n] of Object.entries(likedTally).sort((a, b) => b[1] - a[1]))
      console.log(`  ${n}×  ${r}`);
  }
  const reasonTally = {};
  for (const f of list) for (const r of (f.reasons || [])) reasonTally[r] = (reasonTally[r] || 0) + 1;
  if (Object.keys(reasonTally).length) {
    console.log('WENT WRONG:');
    for (const [r, n] of Object.entries(reasonTally).sort((a, b) => b[1] - a[1]))
      console.log(`  ${n}×  ${r}`);
  }
  const comments = list.filter(f => f.comment).map(f => `  [w${f.wave}] ${f.comment}`);
  if (comments.length) { console.log('\nCOMMENTS:'); comments.forEach(c => console.log(c)); }
  return list;
};

// Actionable fix list — comments containing "fix" are collected here so they
// can be reviewed and worked through. Share this output to have them acted on.
window._fixlist = () => {
  const fixes = JSON.parse(localStorage.getItem('tokoDropFixList') || '[]');
  console.log(`=== TOKO DROP FIX LIST (${fixes.length}) ===`);
  fixes.forEach((f, i) => console.log(`  ${i + 1}. ${f.done ? '[done] ' : ''}[w${f.wave}] ${f.comment}`));
  return fixes;
};
window._fixlistClear = () => { localStorage.removeItem('tokoDropFixList'); console.log('Fix list cleared.'); };

window._feedbackExport = () => {
  const list = JSON.parse(localStorage.getItem('tokoDropFeedback') || '[]');
  if (list.length === 0) { console.warn('No feedback to export.'); return; }
  const COLS = ['date', 'seed', 'mode', 'wave', 'time', 'score', 'hits', 'top_attacker', 'reasons', 'comment'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [COLS.join(',')];
  for (const f of list) {
    rows.push([
      esc(f.date), esc(f.seed), esc(f.mode), esc(f.wave), esc(f.time), esc(f.score),
      esc(f.hits), esc(f.topAttacker ?? ''), esc((f.reasons || []).join(' | ')), esc(f.comment),
    ].join(','));
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `toko_feedback_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  console.log(`Exported ${rows.length - 1} feedback entries.`);
};

// ── Game state ───────────────────────────────────────────────────────────────
// 'title' | 'playing' | 'paused' | 'gameover'
let gameState    = 'title';
let _hitFlashT   = 0;
let waveClearFlashT = 0; // v74: brief white pulse marking the instant a wave clears

// ── UI canvas ─────────────────────────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx      = uiCanvas.getContext('2d');
const overlay  = document.getElementById('overlay');
const _proj    = new THREE.Vector3();

const designer = initDesigner({
  onResume: () => { gameState = 'playing'; },
  // Settings page (v81) — volume + reduce-motion live in the pause menu now;
  // state and persistence stay here, the menu just reads/writes through these.
  settings: {
    getVolume: () => audioVolume,
    setVolume: v => {
      audioVolume = v;
      audio.setVolume(v);
      localStorage.setItem('tokoDropVolume', String(v));
    },
    getReduceMotion: () => reduceMotion,
    setReduceMotion: on => {
      reduceMotion = on;
      localStorage.setItem('tokoDropReduceMotion', on ? '1' : '0');
    },
  },
});

function toScreen(worldPos) {
  _proj.copy(worldPos).project(camera);
  return { x: (_proj.x + 1) / 2 * uiCanvas.width, y: (-_proj.y + 1) / 2 * uiCanvas.height };
}
const _hpAnchor = new THREE.Vector3(); // scratch for HP-bar world anchors

function hexToCSS(hex) { return '#' + hex.toString(16).padStart(6, '0'); }

function drawStick(stick, defaultX, defaultY) {
  const bx = stick.active ? stick.ox : defaultX;
  const by = stick.active ? stick.oy : defaultY;
  const R = 60, kr = 28;
  ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle   = 'rgba(255,255,255,0.05)'; ctx.fill();
  const clamp = v => Math.max(-R, Math.min(R, v));
  ctx.beginPath(); ctx.arc(bx + clamp(stick.dx), by + clamp(stick.dy), kr, 0, Math.PI * 2);
  ctx.fillStyle = stick.active ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.13)';
  ctx.fill();
}

// sans-serif fallback so CJK (Japanese) HUD labels render — monospace often
// lacks CJK glyphs; canvas falls back per-glyph across the family list.
const HUD_FONT = 'bold 14px monospace, sans-serif';

function drawHUD() {
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);

  // Hit-damage vignette
  if (_hitFlashT > 0) {
    const alpha = (_hitFlashT / 0.32) * 0.55;
    const cx = uiCanvas.width / 2, cy = uiCanvas.height / 2;
    const r0 = Math.min(cx, cy) * 0.35, r1 = Math.max(cx, cy) * 1.05;
    const vgrd = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    vgrd.addColorStop(0, `rgba(255,0,0,0)`);
    vgrd.addColorStop(1, `rgba(255,0,0,${alpha.toFixed(2)})`);
    ctx.fillStyle = vgrd;
    ctx.fillRect(0, 0, uiCanvas.width, uiCanvas.height);
  }

  // Wave-clear flash (v74): a brief bright pulse marking the instant the last
  // enemy dies — waves already end instantly (v22) but had no visual beat.
  if (waveClearFlashT > 0) {
    const alpha = (waveClearFlashT / 0.4) * 0.3;
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.fillRect(0, 0, uiCanvas.width, uiCanvas.height);
  }

  if (gameState !== 'playing' && gameState !== 'paused' && gameState !== 'upgrade') return;

  // Sticks
  if (!input.usingGamepad) {
    drawStick(input.left,  uiCanvas.width * 0.22, uiCanvas.height * 0.78);
    drawStick(input.right, uiCanvas.width * 0.78, uiCanvas.height * 0.78);
  }

  // Pause button (top centre)
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('❝❝', uiCanvas.width / 2, 36);
  ctx.textAlign = 'left';

  // Wave + score (top row)
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = HUD_FONT;
  ctx.fillText(`${t('wave')} ${wave}`, 16, 24);

  // Wave progress bar
  const _prog = Math.min(1, waveTimer / waveDuration);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(16, 30, 100, 3);
  ctx.fillStyle = _prog >= 1 ? '#44ff88' : '#ffaa22';
  ctx.fillRect(16, 30, 100 * _prog, 3);

  ctx.textAlign = 'right';
  ctx.fillText(`${score}`, uiCanvas.width - 16, 24);
  if (streak > 1) {
    const flashScale = 1 + Math.max(0, streakFlashT / STREAK_FLASH_DUR) * 0.4;
    ctx.font = `bold ${Math.round(14 * flashScale)}px monospace, sans-serif`;
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`×${streak} ${t('hudStreak')}`, uiCanvas.width - 16, 44);
    ctx.font = HUD_FONT;
  }
  ctx.textAlign = 'left';

  // Player HP dots
  const dotR = 9, dotGap = 24, dotY = 48;
  for (let i = 0; i < player.maxHp; i++) {
    ctx.beginPath();
    ctx.arc(16 + dotR + i * dotGap, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i < player.hp ? '#ff3355' : 'rgba(255,255,255,0.15)';
    ctx.fill();
  }

  // Weapon mode indicator — show the pod letter and colour
  if (player._weaponMode !== 'SINGLE') {
    const podId = Object.keys(WEAPON_PODS).find(k => WEAPON_PODS[k].mode === player._weaponMode);
    const podColor = podId ? '#' + WEAPON_PODS[podId].color.toString(16).padStart(6, '0') : '#00ccaa';
    const dotAreaW = player.maxHp * dotGap;
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = podColor;
    ctx.fillText(`[${podId ?? player._weaponMode}]`, 16 + dotAreaW + 8, dotY + 5);
    ctx.font = HUD_FONT;
  }

  // Shield indicator
  if (player._shield) {
    ctx.font = 'bold 11px monospace, sans-serif';
    ctx.fillStyle = '#5599ff';
    ctx.fillText(`✶ ${t('hudShld')}`, 16, dotY + 22);
    ctx.font = HUD_FONT;
  }

  // Score Multiplier indicator (v72)
  if (scoreMultT > 0) {
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace, sans-serif';
    ctx.fillStyle = `rgba(255,221,34,${0.6 + 0.4 * Math.sin(performance.now() * 0.01)})`;
    ctx.fillText(`×2 ${t('hudScoreMult')}`, uiCanvas.width - 16, 78);
    ctx.font = HUD_FONT;
    ctx.textAlign = 'left';
  }

  // Damage numbers
  ctx.textAlign = 'center';
  for (const dn of damageNumbers) {
    const s = toScreen(dn.pos);
    const alpha = Math.max(0, dn._life / 0.6);
    ctx.fillStyle = `rgba(255,255,100,${alpha.toFixed(2)})`;
    ctx.font = 'bold 13px monospace';
    ctx.fillText('-1', s.x, s.y);
  }
  ctx.textAlign = 'left';

  // Enemy HP bars (world→screen projection). Anchor at mid-body height via
  // fxY — blob dome origins sit at the floor (v82), not the body center.
  for (const e of enemies) {
    if (!e.alive && !e._dying) continue;
    _hpAnchor.set(e.position.x, e.fxY, e.position.z);
    const s = toScreen(_hpAnchor);
    const barW = 36, barH = 5;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(s.x - barW / 2, s.y - 44, barW, barH);
    ctx.fillStyle = hexToCSS(e.color);
    ctx.fillRect(s.x - barW / 2, s.y - 44, barW * e.hpFrac, barH);
  }

  // Hi-score
  if (hiScore > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '12px monospace, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${t('hudHi')} ${hiScore}`, uiCanvas.width - 16, 60);
    ctx.textAlign = 'left';
  }

  // FPS meter (bottom-left, above version — green/amber/red for at-a-glance health)
  {
    const fps = Math.round(fpsEMA);
    const rgb = fps >= 55 ? '90,255,140' : fps >= 30 ? '255,200,80' : '255,90,90';
    ctx.fillStyle = `rgba(${rgb},0.3)`;
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${fps} FPS`, 16, uiCanvas.height - 26);
  }

  // Version (bottom-left)
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('v94', 16, uiCanvas.height - 12);

  // Seed (bottom-right, very faint — for sharing runs)
  if (runSeed > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = '10px monospace, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${t('seed')} ${runSeed.toString(16).toUpperCase().padStart(6,'0')}`, uiCanvas.width - 16, uiCanvas.height - 12);
    ctx.textAlign = 'left';
  }

}

// ── Overlay helpers ────────────────────────────────────────────────────────────────
function showTitle() {
  // Inject title animation keyframes once
  if (!document.getElementById('toko-style')) {
    const s = document.createElement('style');
    s.id = 'toko-style';
    s.textContent = `
      @keyframes tokoGlow {
        0%   { text-shadow: 0 0 18px #5533ff, 0 0 36px #2211cc; }
        100% { text-shadow: 0 0 44px #cc55ff, 0 0 88px #6622ee; }
      }
      @keyframes tokoFadeUp {
        from { opacity:0; transform:translateY(12px); }
        to   { opacity:1; transform:translateY(0); }
      }
    `;
    document.head.appendChild(s);
  }
  overlay.style.display = 'block';
  overlay.innerHTML =
    `<div style="font-size:clamp(34px,11vw,58px);font-weight:bold;letter-spacing:4px;` +
    `animation:tokoGlow 1.6s ease-in-out infinite alternate,tokoFadeUp 0.5s ease both">TOKO DROP</div>` +
    `<div style="font-size:13px;opacity:0.5;margin:8px 0 22px;animation:tokoFadeUp 0.5s 0.1s ease both">` +
    `${t('subtitle')}</div>` +
    (pb.bestScore > 0
      ? `<div style="font-size:13px;color:#ffdd44;opacity:0.85;margin-bottom:14px;letter-spacing:1px;` +
        `animation:tokoFadeUp 0.5s 0.15s ease both">` +
        `${t('best')} &nbsp;${pb.bestScore} ${t('pts')} &nbsp;·&nbsp; ${t('wave')} ${pb.bestWave} &nbsp;·&nbsp; ${fmtTime(pb.bestTime)}</div>`
      : ``) +
    `<div style="font-size:16px;opacity:0.85;animation:tokoFadeUp 0.5s 0.2s ease both">${t('tapStart')}</div>` +
    `<div id="orient-toggle-slot" style="margin-top:18px;animation:tokoFadeUp 0.5s 0.28s ease both"></div>` +
    `<div id="rogue-toggle-slot" style="margin-top:14px;animation:tokoFadeUp 0.5s 0.3s ease both"></div>` +
    `<div id="settings-slot" style="margin-top:14px;animation:tokoFadeUp 0.5s 0.32s ease both"></div>` +
    `<div style="font-size:9.5px;opacity:0.32;margin:14px auto 0;line-height:1.6;text-align:center;` +
    `max-width:230px;animation:tokoFadeUp 0.5s 0.4s ease both">` +
    `${t('ctrlMove')} &nbsp;·&nbsp; ${t('ctrlMoveH')}<br>` +
    `${t('ctrlAim')} &nbsp;·&nbsp; ${t('ctrlAimH')}<br>` +
    `${t('ctrlDash')} &nbsp;·&nbsp; ${t('ctrlDashH')}<br>` +
    `${t('ctrlPause')} ${t('ctrlPauseH')} &nbsp;·&nbsp; ${t('ctrlEyes')} ${t('ctrlEyesH')}</div>` +
    `<div id="lang-toggle-slot" style="margin-top:22px;display:flex;gap:8px;justify-content:center;` +
    `animation:tokoFadeUp 0.5s 0.5s ease both"></div>`;

  // Language picker — all three options shown at once at the bottom; tap to select.
  {
    const lslot = document.getElementById('lang-toggle-slot');
    const active = getLang();
    for (const { code, label } of langs()) {
      const on   = code === active;
      const chip = document.createElement('div');
      chip.textContent = label;
      chip.style.cssText =
        'pointer-events:auto;cursor:pointer;user-select:none;' +
        'font-size:13px;font-weight:bold;padding:7px 14px;border-radius:8px;' +
        'background:rgba(0,0,0,0.35);transition:all 0.12s;' +
        `border:2px solid ${on ? '#6688ff' : '#445'};` +
        `color:${on ? '#aaccff' : '#7777aa'};` +
        `text-shadow:${on ? '0 0 12px #4466ff' : 'none'};`;
      const pick = e => {
        e.stopPropagation();
        e.preventDefault();
        if (code !== getLang()) { setLang(code); showTitle(); }
      };
      chip.addEventListener('pointerdown', pick);
      chip.addEventListener('touchend', e => e.stopPropagation());
      lslot.appendChild(chip);
    }
  }

  // Orientation toggle — switches arena between portrait and landscape (Steam Deck).
  {
    const oslot = document.getElementById('orient-toggle-slot');
    const obtn  = document.createElement('div');
    const ohint = document.createElement('div');
    ohint.style.cssText = 'font-size:11px;opacity:0.45;margin-top:6px';
    const orender = () => {
      const land = landscapeMode;
      obtn.textContent = `${t('orientation')}: ${land ? t('landscape') : t('portrait')}`;
      obtn.style.cssText =
        'display:inline-block;pointer-events:auto;cursor:pointer;user-select:none;' +
        'font-size:14px;font-weight:bold;padding:8px 18px;border-radius:8px;' +
        'background:rgba(0,0,0,0.35);transition:all 0.12s;' +
        `border:2px solid ${land ? '#ffaa33' : '#445'};` +
        `color:${land ? '#ffcc66' : '#7777aa'};` +
        `text-shadow:${land ? '0 0 12px #ffaa33' : 'none'};`;
      ohint.textContent = land ? t('orientLandH') : t('orientPortH');
    };
    orender();
    const otoggle = e => {
      e.stopPropagation();
      e.preventDefault();
      landscapeMode = !landscapeMode;
      orientUserSet = true;  // explicit choice from now on — overrides device default
      localStorage.setItem('tokoDropLandscape', landscapeMode ? '1' : '0');
      localStorage.setItem('tokoDropOrientSet', '1');
      applyArenaMode(landscapeMode);  // live-update the title-screen arena
      orender();
    };
    obtn.addEventListener('pointerdown', otoggle);
    obtn.addEventListener('touchend', e => e.stopPropagation());
    oslot.appendChild(obtn);
    oslot.appendChild(ohint);
  }

  // Roguelike toggle — a clickable chip inside the (pointer-events:none) overlay.
  const slot = document.getElementById('rogue-toggle-slot');
  const btn  = document.createElement('div');
  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;opacity:0.45;margin-top:6px';
  const render = () => {
    const on = roguelikeMode;
    btn.textContent = `${t('rogue')}: ${on ? t('on') : t('off')}`;
    btn.style.cssText =
      'display:inline-block;pointer-events:auto;cursor:pointer;user-select:none;' +
      'font-size:14px;font-weight:bold;padding:8px 18px;border-radius:8px;' +
      'background:rgba(0,0,0,0.35);transition:all 0.12s;' +
      `border:2px solid ${on ? '#00ccaa' : '#445'};` +
      `color:${on ? '#00ffcc' : '#7777aa'};` +
      `text-shadow:${on ? '0 0 12px #00ccaa' : 'none'};`;
    hint.textContent = on ? t('rogueOnH') : t('rogueOffH');
  };
  render();
  const toggle = e => {
    e.stopPropagation();
    e.preventDefault();
    roguelikeMode = !roguelikeMode;
    localStorage.setItem('tokoDropRogue2', roguelikeMode ? '1' : '0');
    render();
  };
  btn.addEventListener('pointerdown', toggle);
  // Stop the chip's own touch from bubbling to the window tap-to-start handler.
  btn.addEventListener('touchend', e => e.stopPropagation());
  slot.appendChild(btn);
  slot.appendChild(hint);

  // v81: volume + reduce-motion moved into the pause menu's SETTINGS page —
  // the title keeps only the run-history link and a faint pointer to where
  // the settings went.
  {
    const sslot = document.getElementById('settings-slot');
    sslot.style.cssText += ';display:flex;flex-direction:column;align-items:center;gap:10px';

    // Run History button (v76) — opens a panel over data already recorded
    // in pb.runs (top 10 by score, maintained by recordRun()).
    const rhBtn = document.createElement('div');
    rhBtn.textContent = t('runHistory');
    rhBtn.style.cssText =
      'display:inline-block;pointer-events:auto;cursor:pointer;user-select:none;' +
      'font-size:12px;letter-spacing:1px;opacity:0.5;padding:4px 10px;text-decoration:underline;';
    rhBtn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); showRunHistory(); });
    rhBtn.addEventListener('touchend', e => e.stopPropagation());
    sslot.appendChild(rhBtn);

    const sHint = document.createElement('div');
    sHint.textContent = t('settingsHint');
    sHint.style.cssText = 'font-size:10px;opacity:0.3;letter-spacing:1px';
    sslot.appendChild(sHint);
  }
}

// Run History panel (v76): lists the top runs already tracked in pb.runs —
// no new tracking needed, just a view over data recordRun() already saves.
function showRunHistory() {
  // Panel is a document.body sibling of #overlay (like the upgrade-card panel),
  // so switch gameState away from 'title' while it's open — otherwise the
  // title screen's tap-to-start touchend handler (which only excludes taps
  // inside #overlay) would also fire on every tap inside this panel,
  // including CLOSE, immediately starting a run underneath it.
  gameState = 'runhistory';
  const panel = document.createElement('div');
  panel.id = 'runhistory-panel';
  panel.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;background:rgba(0,0,0,0.8);z-index:65;' +
    'font-family:monospace,sans-serif;color:#fff;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:20px;font-weight:bold;margin-bottom:18px;letter-spacing:2px;text-shadow:0 0 16px #6688ff;';
  title.textContent = t('runHistory');
  panel.appendChild(title);

  if (!pb.runs.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:13px;opacity:0.6;margin-bottom:20px';
    empty.textContent = t('noRuns');
    panel.appendChild(empty);
  } else {
    const list = document.createElement('div');
    list.style.cssText =
      'display:flex;flex-direction:column;gap:6px;max-height:60vh;overflow-y:auto;' +
      'width:min(440px,86vw);margin-bottom:20px;padding:4px';
    const header = document.createElement('div');
    header.style.cssText =
      'display:grid;grid-template-columns:28px 1fr 1fr 1fr 1fr;gap:8px;' +
      'font-size:10px;opacity:0.45;letter-spacing:1px;padding:0 10px;';
    header.innerHTML = `<span>#</span><span>${t('rhScore')}</span><span>${t('rhWave')}</span>` +
      `<span>${t('rhTime')}</span><span>${t('rhMode')}</span>`;
    list.appendChild(header);
    pb.runs.forEach((r, i) => {
      const row = document.createElement('div');
      row.style.cssText =
        'display:grid;grid-template-columns:28px 1fr 1fr 1fr 1fr;gap:8px;align-items:center;' +
        `background:rgba(255,255,255,${i % 2 === 0 ? 0.04 : 0.0});border-radius:6px;` +
        'font-size:12px;padding:6px 10px;';
      row.innerHTML =
        `<span style="opacity:0.5">${i + 1}</span>` +
        `<span style="color:#ffdd44">${r.score}</span>` +
        `<span>${r.wave}</span>` +
        `<span>${fmtTime(r.time)}</span>` +
        `<span style="opacity:0.6;font-size:10px">${r.mode === 'roguelike' ? 'ROGUE' : 'ARCADE'}</span>`;
      list.appendChild(row);
    });
    panel.appendChild(list);
  }

  const closeBtn = document.createElement('div');
  closeBtn.textContent = t('close');
  closeBtn.style.cssText =
    'cursor:pointer;user-select:none;font-size:13px;font-weight:bold;letter-spacing:1px;' +
    'padding:8px 22px;border-radius:8px;border:2px solid #6688ff;color:#aaccff;' +
    'background:rgba(0,0,0,0.35);text-shadow:0 0 10px #4466ff;';
  closeBtn.addEventListener('pointerdown', () => { panel.remove(); gameState = 'title'; });
  panel.appendChild(closeBtn);

  document.body.appendChild(panel);
}

function showGameOver() {
  overlay.style.display = 'block';
  overlay.style.pointerEvents = 'auto';
  const seedHex = runSeed.toString(16).toUpperCase().padStart(6, '0');
  const badges = [];
  if (_runBests.isBestScore) badges.push(t('bestScore'));
  if (_runBests.isBestTime)  badges.push(t('bestTime'));
  if (_runBests.isBestWave)  badges.push(t('bestWave'));
  overlay.innerHTML =
    `<div style="font-size:52px;font-weight:bold">${t('youDied')}</div>` +
    `<div style="font-size:15px;opacity:0.6;margin-top:10px;letter-spacing:2px">` +
      `${t('wave')} ${wave} &nbsp;·&nbsp; ${fmtTime(runTimer)} &nbsp;·&nbsp; ${score} ${t('pts')}` +
    `</div>` +
    (badges.length
      ? `<div style="font-size:16px;color:#ffdd44;margin-top:8px;letter-spacing:1px">${badges.join('&nbsp;&nbsp;')}</div>`
      : ``) +
    `<div style="font-size:12px;opacity:0.3;margin-top:10px">${t('seed')} ${seedHex}</div>` +
    `<div id="feedback-slot" style="margin-top:18px"></div>`;

  buildFeedbackPanel(document.getElementById('feedback-slot'));
}

// Death-screen feedback panel: quick-pick reason chips (some predicted from this
// run's telemetry) + a free-text box, saved to localStorage on continue.
function buildFeedbackPanel(slot) {
  if (!slot) return;
  const liked     = new Set();  // positives
  const selected  = new Set();  // negatives
  const labelById = {};

  // Reusable labeled chip row. accent 'pos' → green, 'neg' → red.
  const addChipRow = (heading, reasons, set, accent) => {
    const onCol = accent === 'pos'
      ? { border: '#44cc88', bg: 'rgba(60,220,150,0.20)', col: '#aaffcc', glow: '0 0 10px #33cc77' }
      : { border: '#ff6644', bg: 'rgba(255,90,60,0.22)',  col: '#ffbbaa', glow: '0 0 10px #ff5533' };
    const title = document.createElement('div');
    title.textContent = heading;
    title.style.cssText = 'font-size:12px;letter-spacing:2px;opacity:0.55;margin-bottom:10px';
    slot.appendChild(title);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:440px;margin:0 auto 14px';
    for (const r of reasons) {
      labelById[r.id] = r.label;
      const chip = document.createElement('div');
      chip.className = 'fb-chip';
      chip.textContent = r.label;
      const paint = () => {
        const on = set.has(r.id);
        chip.style.cssText =
          'pointer-events:auto;cursor:pointer;user-select:none;font-size:12px;' +
          'padding:7px 13px;border-radius:16px;transition:all 0.1s;' +
          `border:1.5px solid ${on ? onCol.border : '#445'};` +
          `background:${on ? onCol.bg : 'rgba(0,0,0,0.3)'};` +
          `color:${on ? onCol.col : '#8888aa'};` +
          `text-shadow:${on ? onCol.glow : 'none'};`;
      };
      paint();
      chip.addEventListener('click', e => {
        e.stopPropagation();
        if (set.has(r.id)) set.delete(r.id); else set.add(r.id);
        paint();
      });
      row.appendChild(chip);
    }
    slot.appendChild(row);
  };

  addChipRow(t('fbEnjoy'), buildPositiveReasons(), liked, 'pos');
  addChipRow(t('fbWrong'), buildFeedbackReasons(), selected, 'neg');

  const box = document.createElement('textarea');
  box.placeholder = t('fbElse');
  box.rows = 2;
  box.style.cssText =
    'pointer-events:auto;user-select:text;display:block;width:min(440px,80vw);margin:0 auto 14px;' +
    'background:rgba(0,0,0,0.4);border:1.5px solid #445;border-radius:8px;color:#ccd;' +
    'font-family:monospace,sans-serif;font-size:13px;padding:8px 10px;resize:none;outline:none';
  box.addEventListener('keydown', e => e.stopPropagation());
  slot.appendChild(box);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center';
  const mkBtn = (text, accent, onClick) => {
    const b = document.createElement('div');
    b.className = 'fb-btn';
    b.textContent = text;
    b.style.cssText =
      'pointer-events:auto;cursor:pointer;user-select:none;font-size:12px;font-weight:bold;' +
      `padding:8px 17px;border-radius:7px;letter-spacing:1px;transition:all 0.12s;` +
      `border:2px solid ${accent ? '#44cc88' : '#445'};` +
      `background:rgba(0,0,0,0.35);color:${accent ? '#88ffbb' : '#8888aa'};` +
      `text-shadow:${accent ? '0 0 12px #44cc88' : 'none'};`;
    b.addEventListener('click', e => { e.stopPropagation(); onClick(); });
    return b;
  };
  btnRow.appendChild(mkBtn(t('fbSend'), true, () => {
    saveFeedback(
      [...selected], [...selected].map(id => labelById[id]), box.value.trim(),
      [...liked],    [...liked].map(id => labelById[id]),
    );
    returnToTitle();
  }));
  btnRow.appendChild(mkBtn(t('fbSkip'), false, returnToTitle));
  slot.appendChild(btnRow);
}

function announceWave() {
  overlay.style.display = 'block';
  overlay.innerHTML = `<div style="font-size:22px;opacity:0.75">${t('wave')} ${wave}</div>`;
  setTimeout(() => { if (gameState === 'playing') overlay.style.display = 'none'; }, 450);
}

// ── Wave / restart helpers ──────────────────────────────────────────────────────────
function clearFX() {
  chunkPool.clear();
  gooChunkPool.clear();
  trailPool.clear();
  for (const p of puddles)       p.remove(scene); puddles       = [];
  for (const z of poisonZones)   z.remove(scene); poisonZones   = [];
  for (const s of slimeTrails)   s.remove(scene); slimeTrails   = [];
  for (const r of sludgeRibbons) r.remove(scene); sludgeRibbons = [];
  for (const g of gates)        g.remove(scene); gates         = [];
  for (const p of powerups)     p.remove(scene); powerups      = [];
  clearBossAuras();
  damageNumbers = [];
  if (cargoCluster) { cargoCluster.remove(scene); cargoCluster = null; }
  clusterTimer = 0; clusterSpawnAt = 0;
}

function clearBossAuras() {
  for (const a of bossAuras) {
    scene.remove(a.ring);
    a.ring.geometry.dispose();
    a.ring.material.dispose();
  }
  bossAuras = [];
}

function spawnWave() {
  for (const e of enemies) e.removeFrom(scene);
  enemies = [];
  clearBossAuras();
  for (const p of powerups) p.remove(scene); powerups = [];
  wave++;
  const { speedMult, intervalMult } = getWaveScale(wave);
  const list   = getEnemySchedule(wave);
  waveDuration = ROUND_DUR;
  waveTimer    = 0;
  const total  = list.length;
  pendingSpawns = [];
  list.forEach((entry, i) => {
    const cnt       = entry.count || 1;
    const baseAngle = (i / total) * Math.PI * 2;
    const isGroup   = cnt >= 3;  // 3+ = a coordinated group; 2 = twins (stay paired)
    for (let k = 0; k < cnt; k++) {
      let angle = baseAngle, clusterOffset = null;
      if (isGroup) {
        // Fan members across a wide arc so the group arrives on a broad front and
        // pincers the player from several directions — not a single dodge-able clump.
        const SPREAD = 1.5; // radians (~86°)
        angle = baseAngle + (k / (cnt - 1) - 0.5) * SPREAD;
      } else {
        clusterOffset = k > 0 ? { x: (rng()-0.5)*3, z: (rng()-0.5)*3 } : null;
      }
      pendingSpawns.push({
        type: entry.type,
        delay: entry.t + (isGroup ? k * 0.12 : 0),     // light stagger → rolling advance
        angle,
        clusterOffset,
        speedMult: speedMult * (isGroup ? 1.2 : 1),     // groups push in with intent
        intervalMult,
        boss: entry.boss || false,
        elite: entry.elite || false,
        elitelite: entry.elitelite || false,
      });
    }
  });
  if (player._hasShield) player._shield = true;
  if (wave >= 3) {
    if (gates.length >= 2) { gates[0].remove(scene); gates.shift(); }
    gates.push(new Gate(scene));
  }
  // Schedule one cargo convoy per wave (starts mid-wave, seeded position)
  clusterTimer = 0;
  clusterSpawnAt = 3 + rng() * 5; // 3-8 s into the wave — always overlaps live enemies
}

// ── Upgrade cards ─────────────────────────────────────────────────────────────
// Text lives in lang.js under c_<id> / c_<id>_d and is looked up at render time.
const UPGRADE_POOL = [
  { id: 'hp' }, { id: 'speed' }, { id: 'firerate' }, { id: 'bigbullets' },
  { id: 'dashcd' }, { id: 'nuke' }, { id: 'pierce' }, { id: 'magnet' },
  { id: 'shield' }, { id: 'dashboom' },
];

function applyUpgrade(id) {
  collectedUpgrades.push(id);
  if (id === 'hp') {
    player.maxHp++;
    player.hp = Math.min(player.hp + 1, player.maxHp);
  } else if (id === 'speed') {
    player._speedMult *= 1.2;
  } else if (id === 'firerate') {
    player._fireRateMult *= 0.8;
  } else if (id === 'bigbullets') {
    BULLET_CONFIG.playerBulletScale = Math.min(3.0, BULLET_CONFIG.playerBulletScale * 1.3);
  } else if (id === 'dashcd') {
    player._dashCDMult = Math.max(0.2, player._dashCDMult - 0.15);
  } else if (id === 'nuke') {
    for (let i = bullets.active.length - 1; i >= 0; i--) {
      if (!bullets.active[i].isPlayer) bullets.recycleAt(i);
    }
  } else if (id === 'pierce') {
    BULLET_CONFIG.playerPiercing = true;
  } else if (id === 'magnet') {
    player._magnet = true;
  } else if (id === 'shield') {
    player._hasShield = true;
    player._shield    = true;
  } else if (id === 'dashboom') {
    player._dashBoom = true;
  }
}

function showUpgradeCards() {
  gameState = 'upgrade';
  overlay.style.display = 'none';

  const pool = [...UPGRADE_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
  const panel = document.createElement('div');
  panel.id = 'upgrade-panel';
  panel.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);z-index:60;font-family:monospace,sans-serif;color:#fff;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:24px;font-weight:bold;margin-bottom:24px;text-shadow:0 0 20px #aa00ff;';
  title.textContent = t('chooseUpgrade');
  panel.appendChild(title);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;justify-content:center;';
  panel.appendChild(row);

  for (const card of pool) {
    const btn = document.createElement('div');
    btn.style.cssText = 'background:#1a1a2e;border:2px solid #5555cc;border-radius:8px;padding:20px 24px;min-width:140px;max-width:180px;text-align:center;cursor:pointer;';
    btn.innerHTML = `<div style="font-size:16px;font-weight:bold;margin-bottom:8px">${t('c_' + card.id)}</div><div style="font-size:12px;opacity:0.65">${t('c_' + card.id + '_d')}</div>`;
    btn.addEventListener('pointerover', () => { btn.style.borderColor = '#00ccaa'; });
    btn.addEventListener('pointerout',  () => { btn.style.borderColor = '#5555cc'; });
    btn.addEventListener('pointerdown', () => {
      panel.remove();
      applyUpgrade(card.id);
      gameState = 'playing';
      spawnWave();
    });
    row.appendChild(btn);
  }

  document.body.appendChild(panel);
}

function startGame() {
  overlay.style.display = 'none';
  document.getElementById('upgrade-panel')?.remove();
  input.reset();
  applyArenaMode(landscapeMode);
  score  = 0; streak = 0; wave = 0; runTimer = 0; scoreMultT = 0; waveClearFlashT = 0;
  collectedUpgrades = []; hitEventLog = []; _lastHitTime = -1;
  BULLET_CONFIG.playerBulletScale  = 1.0;
  BULLET_CONFIG.playerPiercing     = false;
  BULLET_CONFIG.playerWeaponPierce = false;
  runSeed = (Math.random() * 0xFFFFFF | 0) >>> 0;
  rng = mulberry32(runSeed);
  player.reset();
  player._magnet    = false;
  player._hasShield = false;
  player._shield    = false;
  player._dashBoom  = false;
  _prevDashing  = false;
  _hitFlashT    = 0;
  bullets.clear();
  clearFX();
  spawnWave();
  gameState = 'playing';
}

// Tear down the finished run and go back to the title screen. Called by the
// death-screen feedback buttons (the screen no longer auto-dismisses, so the
// player has time to leave feedback) and by Space / Start as a quick skip.
function returnToTitle() {
  if (gameState !== 'gameover') return;
  clearFX();
  for (const e of enemies) e.removeFrom(scene);
  enemies = [];
  bullets.clear();
  overlay.style.pointerEvents = '';
  showTitle();
  gameState = 'title';
}

function triggerGameOver() {
  gameState = 'gameover';
  saveHitLog();
  _runBests = recordRun();
  hiScore = pb.bestScore;
  addShake(0.9);
  audio.playerDie();
  showGameOver();
}

// ── Input wiring ────────────────────────────────────────────────────────────────
input.onDash  = () => {
  if (gameState === 'playing') {
    const move = input.getMoveDir();
    const dir = { x: move.x, z: move.z, valid: move.x !== 0 || move.z !== 0 };
    player.dash(dir);
  } else if (gameState === 'title') {
    startGame();  // A / bumper / trigger starts the game from the title
  }
};
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused';  designer.show(); }
  else if (gameState === 'paused')  { gameState = 'playing'; designer.hide(); }
  else if (gameState === 'title')   startGame();
  else if (gameState === 'gameover') returnToTitle();  // Start skips feedback
};

// Space also starts from title on desktop (keyup so the same keyup doesn't also trigger dash)
window.addEventListener('keyup', e => {
  // Don't hijack keys while the player is typing feedback.
  const tag = e.target?.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT') return;
  if (e.code === 'Space' && gameState === 'title') startGame();
  if (e.code === 'Space' && gameState === 'gameover') returnToTitle();  // skip feedback
  if (e.code === 'KeyE') player.toggleEyes();
});
// Tap anywhere (outside overlay UI elements) starts from title on mobile
window.addEventListener('touchend', (e) => {
  if (gameState !== 'title') return;
  // Ignore taps that landed on interactive elements inside the overlay (e.g. roguelike toggle)
  if (e.target?.closest?.('#overlay') && e.target?.id !== 'overlay') return;
  startGame();
}, { once: false });

player.onShoot = () => audio.shoot();

// ── Mouse aim ───────────────────────────────────────────────────────────────────
const raycaster   = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit        = new THREE.Vector3();
const _ndc        = new THREE.Vector2();

function mouseAimDir() {
  _ndc.set((input.mouse.x / innerWidth) * 2 - 1, -(input.mouse.y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  if (!raycaster.ray.intersectPlane(groundPlane, _hit)) return { x: 0, z: 0, valid: false };
  const dx = _hit.x - player.position.x;
  const dz = _hit.z - player.position.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.5) return { x: 0, z: 0, valid: false };
  return { x: dx / len, z: dz / len, valid: input.mouse.down };
}

// ── Main loop ───────────────────────────────────────────────────────────────────
let prev = performance.now();
let fpsEMA = 0;
showTitle();

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const raw = (now - prev) / 1000;            // unclamped, for the FPS meter
  const dt  = Math.min(raw, 0.05);
  prev = now;
  if (raw > 0) fpsEMA = fpsEMA ? fpsEMA * 0.9 + (1 / raw) * 0.1 : 1 / raw;

  input.pollGamepad();
  updateShake(dt);

  // Title / paused / run-history — just render the scene, no game logic
  if (gameState === 'title' || gameState === 'paused' || gameState === 'upgrade' || gameState === 'runhistory') {
    renderer.render(scene, camera);
    drawHUD();
    return;
  }

  if (gameState === 'gameover') {
    // No auto-return — the death screen stays up so the player can leave
    // feedback. returnToTitle() (feedback buttons / Space / Start) dismisses it.
    for (const e of enemies) e.updateDeath(dt);
    chunkPool.update(dt);
    gooChunkPool.update(dt);
    trailPool.update(dt);
    renderer.render(scene, camera);
    drawHUD();
    return;
  }

  // ── Playing ──────────────────────────────────────────────────────────────────
  const moveDir = input.getMoveDir();
  let aimDir    = input.getAimDir();
  if (aimDir.useMouse) aimDir = mouseAimDir();

  // Trickle spawn pending enemies
  waveTimer += dt;
  runTimer  += dt;
  while (pendingSpawns.length > 0 && waveTimer >= pendingSpawns[0].delay) {
    const s = pendingSpawns.shift();
    const bx = Math.cos(s.angle) * HALF_X * 0.85;
    const bz = Math.sin(s.angle) * HALF_Z * 0.85;
    const ox = s.clusterOffset ? s.clusterOffset.x : 0;
    const oz = s.clusterOffset ? s.clusterOffset.z : 0;
    const en = new Enemy(scene, s.type, bx + ox, bz + oz, s.speedMult, s.intervalMult);
    if (s.boss) {
      if (en.type !== EnemyType.BAMBU && en.type !== EnemyType.PYRA) {
        en.hp = Math.ceil(en.hp * 3); en._hpMult = 3;
      }
      en.mesh.scale.multiplyScalar(1.5); en._radiusMult = 1.5;
      en.setBoss(en.hp);
      bossAuras.push(makeBossAura(en));
    } else if (s.elite) {
      if (en.type !== EnemyType.BAMBU && en.type !== EnemyType.PYRA) {
        en.hp = Math.ceil(en.hp * 2); en._hpMult = 2;
      }
      en.mesh.scale.multiplyScalar(1.2); en._radiusMult = 1.2;
    } else if (s.elitelite) {
      if (en.type !== EnemyType.BAMBU && en.type !== EnemyType.PYRA) {
        en.hp = Math.ceil(en.hp * 1.5); en._hpMult = 1.5;
      }
    }
    enemies.push(en);
  }

  player.update(dt, moveDir, aimDir, bullets, HALF_X, HALF_Z);

  // Dash boom: radial explosion on dash start
  if (player._dashBoom && player.dashing && !_prevDashing) {
    const _bx = player.position.x, _bz = player.position.z;
    for (let _di = 0; _di < 12; _di++) {
      const _a = (_di / 12) * Math.PI * 2;
      bullets.spawnDir(_bx, _bz, Math.cos(_a), Math.sin(_a), true, 0xff8844);
    }
    addShake(0.18);
  }
  _prevDashing = player.dashing;
  if (_hitFlashT > 0) _hitFlashT -= dt;
  if (waveClearFlashT > 0) waveClearFlashT -= dt;

  for (const e of enemies) { e.update(dt, player.position, bullets, HALF_X, HALF_Z); e.updateDeath(dt); }

  // Separation: push overlapping enemies apart so they never fully stack.
  // Two passes per frame smooth out chain-reaction bunching without noticeable jitter.
  for (let _pass = 0; _pass < 2; _pass++) {
    for (let _i = 0; _i < enemies.length; _i++) {
      const _a = enemies[_i];
      if (!_a.alive) continue;
      for (let _j = _i + 1; _j < enemies.length; _j++) {
        const _b = enemies[_j];
        if (!_b.alive) continue;
        const _dx = _a.position.x - _b.position.x;
        const _dz = _a.position.z - _b.position.z;
        const _d  = Math.hypot(_dx, _dz);
        const _min = _a.radius + _b.radius + 0.25;
        if (_d < _min && _d > 0.001) {
          const _over = (_min - _d) * 0.5;
          const _nx = _dx / _d, _nz = _dz / _d;
          _a.position.x += _nx * _over; _a.position.z += _nz * _over;
          _b.position.x -= _nx * _over; _b.position.z -= _nz * _over;
          // Keep flopping-cube animation in sync with the nudged position
          if (_a._flopActive) { _a._flopX0 += _nx * _over; _a._flopZ0 += _nz * _over; }
          if (_b._flopActive) { _b._flopX0 -= _nx * _over; _b._flopZ0 -= _nz * _over; }
          // Clamp both to arena
          _a.position.x = Math.max(-HALF_X + _a.radius, Math.min(HALF_X - _a.radius, _a.position.x));
          _a.position.z = Math.max(-HALF_Z + _a.radius, Math.min(HALF_Z - _a.radius, _a.position.z));
          _b.position.x = Math.max(-HALF_X + _b.radius, Math.min(HALF_X - _b.radius, _b.position.x));
          _b.position.z = Math.max(-HALF_Z + _b.radius, Math.min(HALF_Z - _b.radius, _b.position.z));
        }
      }
    }
  }

  bullets.update(dt, Math.max(HALF_X, HALF_Z), enemies, player.position);

  // Update / cull death FX
  chunkPool.update(dt);
  gooChunkPool.update(dt);
  trailPool.update(dt);
  for (let i = puddles.length - 1; i >= 0; i--) {
    if (!puddles[i].update(dt)) { puddles[i].remove(scene); puddles.splice(i, 1); }
  }
  for (let i = poisonZones.length - 1; i >= 0; i--) {
    if (!poisonZones[i].update(dt)) { poisonZones[i].remove(scene); poisonZones.splice(i, 1); }
  }
  for (let i = slimeTrails.length - 1; i >= 0; i--) {
    if (!slimeTrails[i].update(dt)) { slimeTrails[i].remove(scene); slimeTrails.splice(i, 1); }
  }

  // Sludge poison emission
  for (const e of enemies) {
    if (!e._poisonReady) continue;
    e._poisonReady = false;
    poisonZones.push(new PoisonZone(scene, e.position.x, e.position.z, e.radius * 1.8));
  }

  // YELA_CUBE slime trail emission
  for (const e of enemies) {
    if (!e._trailReady) continue;
    e._trailReady = false;
    slimeTrails.push(new SlimeTrail(scene, e.position.x, e.position.z, 0.5));
  }

  // Motion-trail afterimages — pooled ghost spheres, per-type size signature (v36)
  for (const e of enemies) {
    if (!e._motionTrailReady) continue;
    e._motionTrailReady = false;
    const p = e.position;
    trailPool.spawn(p.x, e.fxY, p.z, e.color, e.radius * e._trailMult);
  }

  // BAMBU lob splashdowns (Part 5); drain hitChunks for all enemies
  for (const e of enemies) {
    if (e.type === EnemyType.BAMBU && e._lobLanded) {
      const { x: lx, z: lz } = e._lobLanded;
      e._lobLanded = null;
      // Splashdown: droplet burst + splat decal + damage if caught in the ring
      for (let j = 0; j < 10; j++) {
        const a  = (j / 10) * Math.PI * 2 + Math.random() * 0.6;
        const sp = 2.5 + Math.random() * 3;
        gooChunkPool.spawn(lx, 0.4, lz, Math.cos(a) * sp, 2 + Math.random() * 3, Math.sin(a) * sp, 0xddbb44, 0.11);
      }
      puddles.push(new Puddle(scene, lx, lz, 0xddbb44, 1.1));
      addShake(0.12);
      if (!player.invincible) {
        const pdx = player.position.x - lx, pdz = player.position.z - lz;
        if (Math.hypot(pdx, pdz) < TUNING.bambu.landingRing.outer + PLAYER_RADIUS) {
          if (tryHitPlayer('lob', EnemyType.BAMBU)) { triggerGameOver(); break; }
        }
      }
    }
    if (e._hitChunks && e._hitChunks.length > 0) {
      for (const cd of e._hitChunks) {
        chunksFor(e.type).spawn(cd.x, cd.y, cd.z, cd.vx, cd.vy, cd.vz, cd.color, cd.size);
      }
      e._hitChunks.length = 0;
    }
  }

  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    if (!damageNumbers[i].update(dt)) damageNumbers.splice(i, 1);
  }
  if (streakFlashT > 0) streakFlashT -= dt;
  if (scoreMultT   > 0) scoreMultT   -= dt;

  // SLUDGE_CUBE ribbon: create on first sight, update every frame
  for (const e of enemies) {
    if (e.type === EnemyType.SLUDGE_CUBE && !e._ribbon) {
      e._ribbon = new SludgeRibbon(scene, e);
      sludgeRibbons.push(e._ribbon);
    }
  }
  for (let i = sludgeRibbons.length - 1; i >= 0; i--) {
    if (!sludgeRibbons[i].update(dt)) {
      sludgeRibbons[i].remove(scene);
      sludgeRibbons.splice(i, 1);
    }
  }

  // Boss auras — follow their boss, pulse, redden on enrage, dispose on death.
  for (let i = bossAuras.length - 1; i >= 0; i--) {
    const a = bossAuras[i];
    if (!a.enemy.alive) {
      scene.remove(a.ring);
      a.ring.geometry.dispose();
      a.ring.material.dispose();
      bossAuras.splice(i, 1);
      continue;
    }
    const p = a.enemy.position;
    a.ring.position.set(p.x, 0.04, p.z);
    a.ring.material.opacity = 0.45 + 0.3 * Math.sin(performance.now() * 0.005);
    a.ring.material.color.setHex(a.enemy._enraged ? 0xff2200 : a.baseColor);
    a.ring.scale.setScalar(a.enemy._enraged ? 1.15 + 0.1 * Math.sin(performance.now() * 0.02) : 1.0);
  }

  // Check for children to spawn (SPLITTA, REDD_CUBE, PURP_CUBE)
  const toSpawn = [];
  for (const e of enemies) {
    if (!e._childrenReady) continue;
    e._childrenReady = false;
    const count     = e._childCount || (2 + Math.floor(Math.random() * 2));
    const childType = e._childType  || EnemyType.GLOBBO;
    const freeform  = e._childFreeform || false;
    for (let j = 0; j < count; j++) {
      const a = freeform
        ? Math.random() * Math.PI * 2
        : (j / count) * Math.PI * 2 + Math.random() * 0.3;
      const r = 1.2 + Math.random() * 1.5;
      toSpawn.push({
        type: childType,
        x: e.position.x + Math.cos(a) * r,
        z: e.position.z + Math.sin(a) * r,
        sm: e._speedMult, im: e._intervalMult,
      });
    }
  }
  for (const s of toSpawn) {
    enemies.push(new Enemy(scene, s.type, s.x, s.z, s.sm, s.im));
  }

  // Collision: player bullets → enemies
  for (let i = bullets.active.length - 1; i >= 0; i--) {
    const b = bullets.active[i];
    if (!b.isPlayer) continue;
    let hit = false;
    for (const e of enemies) {
      if (!e.alive) continue;
      const _piercing = BULLET_CONFIG.playerPiercing || BULLET_CONFIG.playerWeaponPierce;
      if (_piercing && b._hitIds && b._hitIds.has(e)) continue;
      const dx = b.mesh.position.x - e.position.x;
      const dz = b.mesh.position.z - e.position.z;
      if (Math.hypot(dx, dz) < BULLET_R * BULLET_CONFIG.playerBulletScale + e.radius) {
        const died = e.hit(b.mesh.position.x, b.mesh.position.z);
        if (_piercing) {
          if (!b._hitIds) b._hitIds = new Set();
          b._hitIds.add(e);
        } else {
          bullets.recycleAt(i);
          hit = true;
        }
        if (died) {
          onKill(e);
          if (e.type === EnemyType.SPLITTA) {
            for (let j = 0; j < 12; j++) {
              const a = (j / 12) * Math.PI * 2;
              bullets.spawnDir(e.position.x, e.position.z, Math.cos(a), Math.sin(a), false, 0xaaff44, false, EnemyType.SPLITTA);
            }
          }
        } else {
          audio.enemyHit();
          addShake(0.035); // light kick on a non-fatal hit (trauma caps, so rapid fire won't over-shake)
          damageNumbers.push(new DamageNumber(e.position.x, e.fxY + e.radius, e.position.z));
          // Impact spark: a small spat of goo flung outward from the contact point
          const nlen = Math.hypot(dx, dz) || 1;
          const baseA = Math.atan2(dz, dx);
          for (let j = 0; j < 3; j++) {
            const a  = baseA + (Math.random() - 0.5) * 1.4;
            const sp = 2.5 + Math.random() * 3;
            chunksFor(e.type).spawn(b.mesh.position.x, e.fxY + 0.1, b.mesh.position.z,
              Math.cos(a) * sp, 1.5 + Math.random() * 2.5, Math.sin(a) * sp, e.color, 0.09);
          }
        }
        if (!_piercing) break;
      }
    }
    if (hit) continue;
  }

  // Collision: player bullets → cargo drones
  if (cargoCluster) {
    for (let bi = bullets.active.length - 1; bi >= 0; bi--) {
      const b = bullets.active[bi];
      if (!b.isPlayer) continue;
      for (const d of cargoCluster._drones) {
        if (!d.alive) continue;
        const ddx = b.mesh.position.x - d.container.position.x;
        const ddz = b.mesh.position.z - d.container.position.z;
        if (Math.hypot(ddx, ddz) < BULLET_R * BULLET_CONFIG.playerBulletScale + 0.32) {
          d.alive = false; d.container.visible = false;
          cargoCluster._killedCount++;
          bullets.recycleAt(bi);
          addShake(0.08);
          audio.enemyDieType('blob');
          const kx = d.container.position.x, kz = d.container.position.z;
          for (let fi = 0; fi < 5; fi++) {
            const a = (fi / 5) * Math.PI * 2;
            gooChunkPool.spawn(kx, 0.8, kz,
              Math.cos(a) * 3.5, 1.0, Math.sin(a) * 3.5, 0xffdd55, 0.1);
          }
          // Drop loot. Clearing every moth before any escape guarantees a
          // weapon pod (single, v92 — the 2-choice pair was more UI than fun)
          // with a generous pickup window.
          const lv2Ok = wave >= 4;
          const allKilled = cargoCluster._drones.every(d => !d.alive) &&
                            !cargoCluster._drones.some(d => d.escaped);
          if (allKilled) {
            const pu = new Powerup(scene, kx, kz, randomWeaponPodId(lv2Ok));
            pu._life = 12.0;
            powerups.push(pu);
          } else {
            // Single drop drifting from the kill position. Moths carry more
            // than weapons (v89): mostly pods, sometimes pure score or a
            // score-multiplier orb.
            const roll = Math.random();
            const dropType = roll < 0.55 ? randomWeaponPodId(lv2Ok)
                           : roll < 0.80 ? 'score' : 'scoremult';
            const driftAngle = Math.random() * Math.PI * 2;
            const driftSpeed = 0.8 + Math.random() * 0.6;
            const pu = new Powerup(scene, kx, kz, dropType,
              Math.cos(driftAngle) * driftSpeed, Math.sin(driftAngle) * driftSpeed);
            pu._life = 7.0;
            powerups.push(pu);
          }
          break;
        }
      }
    }
  }

  // Collision: enemy bullets → player
  if (!player.invincible) {
    for (let i = bullets.active.length - 1; i >= 0; i--) {
      const b = bullets.active[i];
      if (b.isPlayer) continue;
      const dx = b.mesh.position.x - player.position.x;
      const dz = b.mesh.position.z - player.position.z;
      const br = b.fat ? FAT_BULLET_R : BULLET_R;
      if (Math.hypot(dx, dz) < br + PLAYER_RADIUS) {
        const _origin = b.originType; // capture before recycle clears it
        bullets.recycleAt(i);
        if (tryHitPlayer('bullet', _origin)) { triggerGameOver(); break; }
        break;
      }
    }
  }

  // Contact damage: melee-type enemies
  if (!player.invincible) {
    for (const e of enemies) {
      if (!MELEE_TYPES.has(e.type) || !e.alive) continue;
      const dx = player.position.x - e.position.x;
      const dz = player.position.z - e.position.z;
      if (Math.hypot(dx, dz) < e.radius + PLAYER_RADIUS) {
        const died = tryHitPlayer('melee', e.type);
        if (!died && e.type === EnemyType.TORO && e._state === 'dashing') addShake(0.27);
        if (died) { triggerGameOver(); break; }
        break;
      }
    }
  }

  // Gate + powerup updates
  const _t = performance.now() / 1000;
  for (const g of gates) g.update(dt, _t);
  for (let i = powerups.length - 1; i >= 0; i--) {
    if (!powerups[i].update(dt, _t)) { powerups[i].remove(scene); powerups.splice(i, 1); }
  }

  // Cargo convoy: spawn silently + update
  if (!cargoCluster && clusterSpawnAt > 0) {
    clusterTimer += dt;
    if (clusterTimer >= clusterSpawnAt) {
      cargoCluster = new CargoCluster(scene);
      clusterSpawnAt = 0;
    }
  }
  if (cargoCluster) {
    if (cargoCluster.update(dt, _t) === 'done') {
      cargoCluster.remove(scene); cargoCluster = null;
    } else {
      // Golden trail ribbon — each living moth streaks as the convoy sweeps (more presence)
      convoyTrailT -= dt;
      if (convoyTrailT <= 0) {
        convoyTrailT = 0.05;
        for (const d of cargoCluster._drones) {
          if (d.alive) {
            const p = d.container.position;
            trailPool.spawn(p.x, p.y, p.z, 0xffdd55, 0.28);
          }
        }
      }
    }
  }

  // Gate interactions
  if (gates.length > 0) {
    const px = player.position.x, pz = player.position.z;
    for (const g of gates) {
      if (!g.alive) continue;
      if (g.hitsPoint(px, pz, PLAYER_RADIUS)) {
        if (player.dashing) {
          g.deactivate(scene);
          // Burst of teal shards at gate centre
          for (let _gi = 0; _gi < 14; _gi++) {
            const _ga = (_gi / 14) * Math.PI * 2;
            chunkPool.spawn(g._x, 0.9, g._z,
              Math.cos(_ga) * 5.5, 1.2 + Math.random() * 1.0, Math.sin(_ga) * 5.5,
              (_gi % 2 === 0) ? 0x44ff88 : 0x88ffcc, 0.13);
          }
          addShake(0.14);
          audio.pickup();
          const gateTypes = ['hp', 'invincible', 'firerate', 'scoremult'];
          powerups.push(new Powerup(scene, g._x, g._z, gateTypes[Math.floor(Math.random() * gateTypes.length)]));
        }
      }
      // Enemies hitting laser take damage (once per 0.5s)
      if (g._dmgCooldown <= 0) {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (g.hitsPoint(e.position.x, e.position.z, e.radius * 0.5)) {
            const died = e.hit();
            if (died) onKill(e);
            else audio.enemyHit();
            g._dmgCooldown = 0.5;
            break;
          }
        }
      }
    }
  }

  // Magnet: attract nearby powerups toward player
  if (player._magnet) {
    for (const pu of powerups) {
      if (pu.collected) continue;
      const _mdx = player.position.x - pu.x, _mdz = player.position.z - pu.z;
      const _md = Math.hypot(_mdx, _mdz);
      if (_md < 9 && _md > 0.1) {
        const _spd = 1 + 5 * (1 - _md / 9);
        pu._driftX = (_mdx / _md) * _spd;
        pu._driftZ = (_mdz / _md) * _spd;
        // Pull-streak: leave a glowing trail as the pickup zips toward the player
        pu._magTrailT -= dt;
        if (pu._magTrailT <= 0) {
          pu._magTrailT = 0.05;
          trailPool.spawn(pu.x, 0.6, pu.z, pu.mat.color.getHex(), 0.25);
        }
      }
    }
  }

  // Powerup collection
  for (const pu of powerups) {
    if (pu.collected) continue;
    const dx = player.position.x - pu.x, dz = player.position.z - pu.z;
    if (Math.hypot(dx, dz) < 0.8 + PLAYER_RADIUS) {
      pu.collected = true;
      if (WEAPON_PODS[pu._type]) {
        equipWeapon(pu._type);
      } else if (pu._type === 'invincible') {
        player.grantInvincibility(3.0);
      } else if (pu._type === 'hp') {
        player.hp = Math.min(player.maxHp, player.hp + 1);
      } else if (pu._type === 'firerate') {
        player.grantFireRateBoost(8.0);
      } else if (pu._type === 'score') {
        // Instant score nugget (v89) — worth more in later waves, doubled by
        // an active Score Multiplier.
        score += (250 + wave * 25) * (scoreMultT > 0 ? 2 : 1);
      } else if (pu._type === 'scoremult') {
        scoreMultT = 10.0;
      }
      audio.pickup();
      // Collection pop: radial burst of goo bits in the pickup's colour
      const _pc = pu.mat.color.getHex();
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2;
        const sp = 3 + Math.random() * 3;
        gooChunkPool.spawn(pu.x, 0.6, pu.z, Math.cos(a) * sp, 2 + Math.random() * 3, Math.sin(a) * sp, _pc, 0.12);
      }
      addShake(0.12);
    }
  }

  // Poison zone player collision
  if (!player.invincible) {
    for (const z of poisonZones) {
      if (!z.isDangerous) continue;
      const dx = player.position.x - z.mesh.position.x;
      const dz = player.position.z - z.mesh.position.z;
      if (Math.hypot(dx, dz) < z.radius + PLAYER_RADIUS) {
        if (tryHitPlayer('poison', EnemyType.SLUDGE_CUBE)) { triggerGameOver(); break; }
        break;
      }
    }
  }

  // All living enemies dead → end wave immediately; flush any queued spawns
  if (gameState === 'playing' &&
      enemies.length > 0 &&
      enemies.every(e => !e.alive && !e._dying)) {
    pendingSpawns = [];
    score += wave * 500;
    waveClearFlashT = 0.4;
    audio.waveClear();
    if (roguelikeMode) showUpgradeCards();
    else               spawnWave();
  }

  const _now = performance.now() / 1000;
  GOO_TIME.value            = _now;
  floorUniforms.uTime.value = _now;
  renderer.render(scene, camera);
  drawHUD();
}

// ── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  if (camera) { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  uiCanvas.width = innerWidth; uiCanvas.height = innerHeight;
}
window.addEventListener('resize', resize);
// Some phones fire `resize` before rotation dimensions settle, leaving the
// canvas at the old size (dead strip on one edge). Re-run after rotation
// settles, and track the visual viewport where available.
window.addEventListener('orientationchange', () => {
  resize();
  setTimeout(resize, 250);
  setTimeout(resize, 600);
});
window.visualViewport?.addEventListener('resize', resize);
resize();
loop();
