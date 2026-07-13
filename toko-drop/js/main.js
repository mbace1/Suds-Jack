import * as THREE from 'three';
import { InputManager } from './input.js?v=98';
import { BulletPool, BULLET_R, FAT_BULLET_R, BULLET_CONFIG } from './bullet.js?v=98';
import { Player, PLAYER_RADIUS } from './player.js?v=98';
import { Enemy, EnemyType, GOO_TIME, makeSatinMat, applySatinValues, WARDEN_AURA } from './enemy.js?v=98';
import { audio } from './audio.js?v=98';
import { initDesigner } from './designer.js?v=98';
import { t, getLang, setLang, langs } from './lang.js?v=98';
import { TUNING } from './tuning.js?v=98';

// Arena dimensions are swappable between portrait and landscape modes.
const ARENA_PRESETS = {
  portrait:  { halfX: 11, halfZ: 18, camRest: [0, 27, 21], camLook: [0, 0, -3], label: 'PORTRAIT' },
  // Landscape camera (v111/v112): camRest defines the view RAY (direction +
  // baseline distance, symmetric top/bottom margins at 16:9); the actual
  // camera position is fitted per-viewport by fitPresetCamera() — wider
  // screens have side headroom, so the camera dollies in and the arena fills
  // more of the screen. Portrait keeps its fixed framing.
  landscape: { halfX: 19, halfZ: 11, camRest: [0, 20.5, 13.5], camLook: [0, 0, 2.5], label: 'LANDSCAPE · STEAM DECK' },
  // SMASH TV room (v115): ONE fixed studio-room size in both orientations,
  // shaped like the show's rooms (wider than deep, ~4:3). The camera fits it
  // to whatever screen you hold — portrait just views it from farther out.
  smash: { halfX: 15, halfZ: 11, camRest: [0, 20.5, 13.5], camLook: [0, 0, 2.5], label: 'SMASH TV' },
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
  // Gentler on-ramp (v95): waves 1-5 shave a little enemy speed, fading out
  // linearly so wave 6+ rejoins the original curve exactly. Fire rates and
  // the post-10 curve are untouched.
  const earlyEase = wave < 6 ? (6 - wave) * 0.012 : 0;
  return {
    speedMult:    Math.min(1.1 + ramp * 0.09 + post * 0.02 - earlyEase, 2.4),
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
          YELA_CUBE, ORANGE_CUBE, SLUDGE_CUBE, REDD_CUBE, PURP_CUBE, TORO, BAMBU, PYRA, OMEGA, BOTFLY, WARDEN, BULWARK, SIREN, CLOAKER, MAGNA } = EnemyType;
  const POOL = [
    // [type, minWave, cost]
    [GLOBBO,      1, 1], [YELA_CUBE,  1, 1], [SPITTOR,    1, 2], [FANNER,     1, 2],
    [ORANGE_CUBE, 2, 2], [WEEVA,      2, 3],
    [SLUDGE_CUBE, 3, 2], [BAMBU,      3, 3], [SPLITTA,    3, 3],
    [REDD_CUBE,   4, 3],
    [PURP_CUBE,   5, 3], [PYRA,       5, 4], [BOTFLY,     5, 4],
    [TORO,        6, 5],
    [WARDEN,      7, 5],  // v124: shield-bearer — cost keeps it rare, one per wave-ish
    [BULWARK,     6, 4],  // v140: plate walker — front is bulletproof, flank it
    [SIREN,       8, 5],  // v141: screamer — surges the pack, kill it first
    [CLOAKER,     9, 4],  // v143: ambusher — shimmer-flanks, telegraphed burst
    [MAGNA,      10, 5],  // v144: magnet — pulls you off your line, dash breaks it
  ];
  // TEST MODE (v142): every enemy type is unlocked from wave 1 so new
  // designs can be met within seconds of pressing start.
  const available = POOL.filter(([, min]) => testMode || wave >= min);

  // SMASH TV (v115): the room's kind was chosen at the exit door; otherwise
  // fall back to the wave rhythm.
  const kind       = (smashMode && smashRoomKind) ? smashRoomKind : waveKind(wave);
  const isBoss     = kind === 'boss';
  const isSpike    = kind === 'spike';
  const isSwarm    = kind === 'swarm';
  const isPrize    = kind === 'prize';
  // A normal wave directly after any intense wave runs lighter — the breather/lull.
  const isBreather = kind === 'normal' && waveKind(wave - 1) !== 'normal';

  // Budget grows slowly in early waves so the ramp feels earned, not punishing.
  // Knee at wave 10; kind multipliers are gentler than before so even spike/swarm
  // waves in the first few rounds don't wall the player.
  const rampB  = Math.min(wave, 10);
  const postB  = Math.max(0, wave - 10);
  const base   = 5 + rampB * 1.8 + postB * 0.8;
  const mod    = isBoss ? 2.0 : isSpike ? 1.4 : isSwarm ? 1.25 : isPrize ? 0.8 : isBreather ? 0.6 : 1.0;
  let budget = Math.floor(base * mod);
  // Gentler on-ramp (v95): waves 1-5 spawn a bit less (−15% at wave 1,
  // fading to 0 by wave 6); caps, rhythm, and unlock gates are unchanged.
  if (wave < 6) budget = Math.floor(budget * (0.85 + 0.03 * (wave - 1)));
  // SMASH TV (v109): the show wants bodies — 40% more budget on every wave.
  if (smashMode) budget = Math.floor(budget * 1.4);
  // TEST MODE (v142): early waves get a wave-8-sized budget floor so the
  // expensive late types (WARDEN 5, SIREN 5…) actually fit from wave 1.
  if (testMode) budget = Math.max(budget, 24);

  // Composed waves (v116): melee mobs FLOOD the arena (groups/twins — the
  // fodder you mow through), while ranged enemies are placed DELIBERATELY —
  // few of them, capped, spread apart in arrival time and position so each
  // shooter is a tactical problem to prioritise, not part of the noise.
  const SHOOTERS  = new Set([SPITTOR, FANNER, WEEVA, ORANGE_CUBE, PURP_CUBE, BAMBU, PYRA, BOTFLY, CLOAKER]);
  const meleePool = available.filter(([ty]) => !SHOOTERS.has(ty));
  const shootPool = available.filter(([ty]) =>  SHOOTERS.has(ty));

  // Mob variants: swarm waves favour bodies; SMASH TV leans toward door-rush groups.
  const VARIANTS = isSwarm
    ? ['group', 'group', 'twin', 'normal']
    : smashMode
      ? ['normal', 'normal', 'normal', 'elite', 'elitelite', 'twin', 'group', 'group', 'group']
      : ['normal', 'normal', 'normal', 'elite', 'elitelite', 'twin', 'group'];
  const swarmPool = meleePool.filter(([, , c]) => c <= 2);
  const drawPool  = (isSwarm && swarmPool.length) ? swarmPool : (meleePool.length ? meleePool : available);

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
    // Boss escorts (v125): from the 2nd boss on, OMEGA arrives under a WARDEN
    // umbrella (two from the 3rd) — later bosses scale in TACTICS, not just HP:
    // break the shield line first or fight the boss unhurt-able.
    const escorts = Math.min(2, Math.floor(wave / 8) - 1);
    for (let k = 0; k < escorts; k++) {
      list.push({ type: WARDEN, t: 2.0 + k * 1.5 });
      spent += 5;
    }
  }

  // Deliberate shooters: 1 at wave 1 growing to 5 by wave 12 (swarms allow
  // only 1, boss waves 2 — OMEGA is already the ranged threat). They arrive
  // spaced ~3s apart and spawnWave assigns them maximally separated positions
  // (spread angles / different doors) so they form crossfires to be prioritised.
  {
    let shooterCap = Math.min(1 + Math.floor(wave / 3), 5);
    if (isSwarm) shooterCap = 1;
    if (isBoss)  shooterCap = Math.min(shooterCap, 2);
    const shooterBudget = Math.floor(budget * 0.35);
    let sSpent = 0, k = 0, st = 0.8;
    while (shootPool.length && k < shooterCap && sSpent < shooterBudget) {
      const [type, , cost] = shootPool[Math.floor(rng() * shootPool.length)];
      if (sSpent + cost > shooterBudget + 2) break;
      list.push({ type, t: st, shooter: true, slot: k });
      sSpent += cost;
      st += 2.5 + rng() * 1.5;
      k++;
    }
    spent += sSpent;
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
      const cheaper = swarmPool.length ? swarmPool : meleePool;
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
  // SMASH TV (v114): re-pace the MOB flood like the show — bursts of ~3 every
  // couple of seconds for the whole wave, each burst from ONE door, walking
  // around the room. Shooters keep their own spaced schedule but get spread
  // across DIFFERENT doors, so their crossfire comes from separate walls.
  if (smashMode && list.length) {
    const mobs = list.filter(e => !e.shooter && !e.boss);
    const pulseT = [0];
    for (let pi = 1; pi <= Math.ceil(mobs.length / 3); pi++) {
      pulseT.push(pulseT[pi - 1] + 2.0 + rng() * 1.0);
    }
    mobs.forEach((entry, i) => {
      const pi = Math.floor(i / 3);
      entry.t    = pulseT[pi] + (i % 3) * 0.15;
      entry.door = pi % 4;
    });
    const doorOff = Math.floor(rng() * 4);
    for (const e of list) if (e.shooter) e.door = (doorOff + e.slot) % 4;
    // v135: never pour the opening seconds through the door the player is
    // stepping in from — remap those spawns to the opposite wall. (The spawn
    // angle derives from e.door later, so this moves bodies AND telegraph.)
    if (_entryDoor != null) {
      for (const e of list) {
        if (e.door === _entryDoor && e.t < 4) e.door = (e.door + 2) % 4;
      }
    }
  }
  list.sort((a, b) => a.t - b.t);  // spawn drain expects delays in order
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

// Aspect-aware zoom (v112, generalized v115): dolly the camera along the
// preset's view ray until the arena's four corners just fit the current
// viewport (|x| ≤ 0.96 half-widths, |y| ≤ 0.93). Wider screens get a closer
// camera; the SMASH TV room uses this in BOTH orientations (portrait fits
// vertically from farther out).
function fitPresetCamera(p) {
  const look = new THREE.Vector3(...p.camLook);
  const dir  = new THREE.Vector3(...p.camRest).sub(look).normalize();
  const aspect = innerWidth / Math.max(1, innerHeight);
  const t = Math.tan(Math.PI / 6); // half of the 60° vertical FOV
  const up = new THREE.Vector3(0, 1, 0);
  const cam = new THREE.Vector3(), f = new THREE.Vector3(),
        r = new THREE.Vector3(), u = new THREE.Vector3(), d = new THREE.Vector3();
  const fits = (dist) => {
    cam.copy(look).addScaledVector(dir, dist);
    f.copy(look).sub(cam).normalize();
    r.crossVectors(f, up).normalize();
    u.crossVectors(r, f);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        d.set(sx * p.halfX, 0, sz * p.halfZ).sub(cam);
        const z = d.dot(f);
        if (z <= 0) return false;
        if (Math.abs(d.dot(r) / (z * t * aspect)) > 0.96) return false;
        if (Math.abs(d.dot(u) / (z * t)) > 0.93) return false;
      }
    }
    return true;
  };
  let lo = 10, hi = 45;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid; else lo = mid;
  }
  return cam.copy(look).addScaledVector(dir, hi);
}

// Swap arena dimensions, camera framing, floor + border geometry, and grid
// uniforms. SMASH TV mode overrides orientation entirely: one fixed room,
// camera fitted to whichever way the screen is held.
function applyArenaMode(landscape) {
  const p = smashMode ? ARENA_PRESETS.smash
          : landscape ? ARENA_PRESETS.landscape : ARENA_PRESETS.portrait;
  HALF_X = p.halfX; HALF_Z = p.halfZ;
  CAM_LOOK.set(...p.camLook);
  if (smashMode || landscape) CAM_REST.copy(fitPresetCamera(p));
  else                        CAM_REST.set(...p.camRest);
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

// Poison hazard (v100): pure damage data — no meshes. The SLUDGE trail is
// drawn as ONE continuous ribbon (SludgeRibbon below) instead of a chain of
// filled circles; these invisible zones just carry the lingering damage.
class PoisonZone {
  constructor(sc, x, z, radius) {
    this._life = 3.5;
    this.x = x; this.z = z;
    this.radius = radius;
  }
  get isDangerous() { return this._life > 1.0; }
  update(dt) { this._life -= dt; return this._life > 0; }
  remove(sc) {}
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
    // v132: 18 segments (was 8 — the octagon read as a square splat) plus a
    // slight irregular squash so pools look organic, not stamped.
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 18), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.rotation.z = Math.random() * Math.PI * 2;
    this.mesh.scale.set(0.85 + Math.random() * 0.3, 0.85 + Math.random() * 0.3, 1);
    this.mesh.position.set(x, 0.013, z);
    sc.add(this.mesh);
  }
  update(dt) {
    this._life -= dt;
    this.mat.opacity = 0.45 * Math.max(0, this._life / 2.0);
    // Lazy fizz: the odd bubble rises off a live pool.
    if (this._life > 0.5 && Math.random() < dt * 1.5) {
      bubblePool.spawn(this.mesh.position.x + (Math.random() - 0.5) * 0.6,
                       this.mesh.position.z + (Math.random() - 0.5) * 0.6, 0xccee66);
    }
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
    this._t = 0;
    sc.add(this.mesh);
  }
  update(dt) {
    this._t += dt;
    if (!this._enemy.alive && !this._fading) this._fading = true;
    if (this._fading) {
      this._fadeLife -= dt;
      this.mat.opacity = 0.4 * Math.max(0, this._fadeLife / 2.0);
      if (this._fadeLife <= 0) return false;
    } else {
      // The ribbon IS the hazard visual now (v100): saturated pulse while the
      // trail is being laid (its zones are lethal), fade handled above.
      this.mat.opacity = 0.35 + 0.2 * Math.abs(Math.sin(this._t * 5));
    }
    const pts = this._enemy._trailPositions;
    // Expire points older than the poison zones' lethal window (v105) so a
    // resting SLUDGE's old ribbon doesn't outlive its actual hazard.
    if (pts && pts.length && this._enemy.alive) {
      const now = this._enemy._wobbleT;
      while (pts.length && now - (pts[0].t ?? now) > 3.0) pts.shift();
    }
    const n = pts ? pts.length : 0;
    if (n >= 2) {
      // Width matches the poison hitbox (zones spawn at enemy.radius * 1.8).
      const hw = this._enemy.radius * 1.5;
      let lpx = 0, lpz = hw; // fallback perpendicular for degenerate segments
      for (let i = 0; i < n; i++) {
        let tx, tz;
        if (i < n - 1) { tx = pts[i+1].x - pts[i].x; tz = pts[i+1].z - pts[i].z; }
        else            { tx = pts[i].x - pts[i-1].x; tz = pts[i].z - pts[i-1].z; }
        const tl = Math.hypot(tx, tz);
        // v132: undulating width — the straight-edged quad strip read as a
        // square band; a per-point sway makes it a poured organic streak.
        const ww = hw * (0.72 + 0.28 * Math.sin(i * 1.9 + this._t * 2.2));
        let px, pz;
        if (tl < 1e-4) { px = lpx; pz = lpz; } // coincident points: keep last direction
        else           { px = -tz / tl * ww; pz = tx / tl * ww; lpx = px; lpz = pz; }
        const b = i * 6;
        this._posArr[b]   = pts[i].x + px; this._posArr[b+1] = 0; this._posArr[b+2] = pts[i].z + pz;
        this._posArr[b+3] = pts[i].x - px; this._posArr[b+4] = 0; this._posArr[b+5] = pts[i].z - pz;
      }
      // Fumes (v132): faint bubbles rise off the live trail.
      if (!this._fading && Math.random() < dt * 5) {
        const p = pts[Math.floor(Math.random() * n)];
        bubblePool.spawn(p.x + (Math.random() - 0.5) * hw, p.z + (Math.random() - 0.5) * hw, 0xaadd44);
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
  // v136: 96px canvas (was 64) + heavier ring — crisper badges at play distance.
  const c = document.createElement('canvas');
  c.width = 96; c.height = 96;
  const ctx2d = c.getContext('2d');
  const col = '#' + colorHex.toString(16).padStart(6, '0');
  ctx2d.strokeStyle = col;
  ctx2d.lineWidth = 4;
  ctx2d.beginPath(); ctx2d.arc(48, 48, 40, 0, Math.PI * 2); ctx2d.stroke();
  ctx2d.fillStyle = col;
  ctx2d.font = `bold ${text.length > 1 ? 34 : 44}px monospace`;
  ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
  ctx2d.fillText(text, 48, 50);
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

// Floor valuables (v118): shared geometries so swapping a Powerup's look
// leaks nothing — cash reads as a flat bill stack, prizes as a gift box.
const CASH_GEO  = new THREE.BoxGeometry(0.55, 0.2, 0.4);
const PRIZE_GEO = new THREE.BoxGeometry(0.62, 0.62, 0.62);
// v132: glyph badges for the non-weapon pickups (weapon pods show their id).
const NON_WEAPON_GLYPHS = {
  hp: '+', invincible: '★', firerate: '»', scoremult: '×2', score: '$',
};

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
    // v132: EVERY pickup carries a glyph badge, not just weapon pods —
    // non-weapon types get a smaller, lower one so the field stays readable.
    const glyph = wpDef ? type : (NON_WEAPON_GLYPHS[type] ?? null);
    if (glyph) {
      const tex = makeGlyphTexture(glyph, orbColor);
      const spMat = new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false,
        depthTest: false,   // v136: badges draw over everything — never hidden
      });
      this._sprite = new THREE.Sprite(spMat);
      this._sprite.renderOrder = 5;
      this._sprite.scale.setScalar(wpDef ? (wpDef.level === 2 ? 1.1 : 0.9) : 0.8);
      this._spriteLift = wpDef ? 0.9 : 0.62;
      this._sprite.position.set(x, 0.6 + this._spriteLift, z);
      sc.add(this._sprite);
    }
  }
  update(dt, t) {
    this._life -= dt;
    this.x += this._driftX * dt;
    this.z += this._driftZ * dt;
    const y = 0.6 + Math.sin(t * 3) * 0.15;
    this.mesh.position.set(this.x, y, this.z);
    this.mesh.rotation.y += dt * 1.6;  // slow spin — sells boxes/prizes, invisible on orbs
    this.mat.opacity = 0.5 + 0.4 * Math.sin(t * 5);
    // v135: expiry warning — the last 2.5 s blink hard so "grab it or lose
    // it" reads at a glance. Room-long floor loot (_life 999) never blinks.
    let blink = 1;
    if (this._life < 2.5) blink = Math.sin(this._life * 16) > 0 ? 1 : 0.12;
    this.mat.opacity *= blink;
    if (this._sprite) {
      this._sprite.position.set(this.x, y + this._spriteLift, this.z);
      this._sprite.material.opacity = blink;
    }
    return this._life > 0 && !this.collected;
  }
  remove(sc) {
    sc.remove(this.mesh);
    // v129: the per-instance sphere + material leaked GPU-side on every pod
    // collected/expired. Valuables swap in the SHARED cash/prize geometries —
    // those must survive; everything per-instance gets disposed.
    if (this.mesh.geometry !== CASH_GEO && this.mesh.geometry !== PRIZE_GEO) {
      this.mesh.geometry.dispose();
    }
    this.mat.dispose();
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
      const mat = makeSatinMat(0xffdd55, 'blob', bodyR); // moths join the satin gel family (v96)
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
  // Generic floating text (v118): defaults keep the classic "-1" hit marker;
  // loot pickups pass their value ("+150") in gold.
  constructor(worldX, worldY, worldZ, text = '-1', rgb = '255,255,100') {
    this.pos   = new THREE.Vector3(worldX, worldY, worldZ);
    this._life = 0.6;
    this.text  = text;
    this.rgb   = rgb;
  }
  update(dt) { this._life -= dt; this.pos.y += 2.5 * dt; return this._life > 0; }
}

// ── Melee types ───────────────────────────────────────────────────────────────
const MELEE_TYPES = new Set([
  EnemyType.GLOBBO, EnemyType.SPLITTA, EnemyType.BULWARK,
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

// ── Bubble pool (v132) ────────────────────────────────────────────────────────
// Tiny rising, fading spheres — minimalist fumes over poison trails and pools
// (and any future "fizzing" surface). Instanced like ChunkPool; no gravity, no
// bounce, just drift up and pop.
const BUBBLE_POOL = 48;
class BubblePool {
  constructor(sc) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 6, 5),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false }),
      BUBBLE_POOL);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sc.add(this.mesh);
    this.x = new Float32Array(BUBBLE_POOL); this.y = new Float32Array(BUBBLE_POOL);
    this.z = new Float32Array(BUBBLE_POOL);
    this.life = new Float32Array(BUBBLE_POOL);
    this.size = new Float32Array(BUBBLE_POOL);
    this.active = new Uint8Array(BUBBLE_POOL);
    this._m = new THREE.Matrix4();
    this._c = new THREE.Color();
    for (let i = 0; i < BUBBLE_POOL; i++) this._hide(i);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  _hide(i) { this._m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this._m); }
  spawn(x, z, color) {
    let s = -1;
    for (let i = 0; i < BUBBLE_POOL; i++) if (!this.active[i]) { s = i; break; }
    if (s < 0) return;                       // full — bubbles are droppable FX
    this.x[s] = x; this.y[s] = 0.08; this.z[s] = z;
    this.life[s] = 0.9 + Math.random() * 0.5;
    this.size[s] = 0.07 + Math.random() * 0.08;
    this.active[s] = 1;
    this._c.set(color);
    this.mesh.setColorAt(s, this._c);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    let dirty = false;
    for (let i = 0; i < BUBBLE_POOL; i++) {
      if (!this.active[i]) continue;
      dirty = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.active[i] = 0; this._hide(i); continue; }
      this.y[i] += 0.9 * dt;                 // gentle rise
      this.x[i] += Math.sin(this.y[i] * 9 + i) * 0.15 * dt;  // lazy wiggle
      const k = this.size[i] * Math.min(1, this.life[i] * 3); // pop = shrink out
      this._m.makeScale(k, k, k).setPosition(this.x[i], this.y[i], this.z[i]);
      this.mesh.setMatrixAt(i, this._m);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() {
    for (let i = 0; i < BUBBLE_POOL; i++) { this.active[i] = 0; this._hide(i); }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
const bubblePool = new BubblePool(scene);

// ── Secondary objectives (v133) ──────────────────────────────────────────────
// BOUNTY: every 3rd wave one arrival is marked gold for 8 s — kill it inside
// the window for big cash + a guaranteed weapon pod. Miss it and it's just an
// enemy again. A prioritization problem layered onto the wave, the way gates
// reward a positioning detour.
let bountyEnemy = null, bountyT = 0, bountyArm = false;
const bountyRing = new THREE.Mesh(
  new THREE.RingGeometry(1.05, 1.3, 26),
  new THREE.MeshBasicMaterial({ color: 0xffcc33, transparent: true, opacity: 0.8,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
bountyRing.rotation.x = -Math.PI / 2;
bountyRing.position.y = 0.05;
bountyRing.visible = false;
scene.add(bountyRing);
function clearBounty() { bountyEnemy = null; bountyT = 0; bountyRing.visible = false; }

// CLEANSE zone: the anti-hazard — a foam pool you WANT to stand in. Hold your
// ground inside for ~1.2 s and it detonates a full-screen bullet cleanse and
// pays per bullet cleared. Standing still in a bullet-hell IS the price.
// Appears every 4th wave from wave 6; expires if ignored.
let foamZones = [];
// SIREN scream rings (v141): one-shot expanding ring marking the surge radius.
let screamRings = [];
class ScreamRing {
  constructor(sc, x, z) {
    this._t = 0;
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xbb66ff, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.RingGeometry(0.82, 1.0, 40), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(x, 0.05, z);
    sc.add(this.mesh);
  }
  update(dt) {
    this._t += dt;
    const k = this._t / 0.55;
    this.mesh.scale.setScalar(1 + k * (SIREN_RADIUS - 1));
    this.mat.opacity = 0.7 * (1 - k);
    return k < 1;
  }
  remove(sc) { sc.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}
const SIREN_RADIUS = 7;  // scream surge reach
const MAGNA_REACH = 11;  // pull range (v144)
const MAGNA_PULL  = 1.1; // pull strength, u/s per magna (player runs ~3.5)
let magnaImmuneT = 0;    // dash-granted pull immunity
class FoamZone {
  constructor(sc, x, z) {
    this.x = x; this.z = z;
    this.radius  = 2.2;
    this._life   = 12;
    this._charge = 0;
    this._done   = false;
    this._burstT = 0;
    this.mat = new THREE.MeshBasicMaterial({ color: 0x99eeff, transparent: true, opacity: 0.16, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(this.radius, 26), this.mat);
    this.mesh.rotation.x = -Math.PI / 2; this.mesh.position.set(x, 0.02, z);
    this.rimMat = new THREE.MeshBasicMaterial({ color: 0xbbf4ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    this.rim = new THREE.Mesh(new THREE.RingGeometry(this.radius - 0.12, this.radius, 32), this.rimMat);
    this.rim.rotation.x = -Math.PI / 2; this.rim.position.set(x, 0.025, z);
    // Charge disc: grows from the center as the player holds their ground.
    this.fillMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false });
    this.fill = new THREE.Mesh(new THREE.CircleGeometry(this.radius, 26), this.fillMat);
    this.fill.rotation.x = -Math.PI / 2; this.fill.position.set(x, 0.03, z);
    this.fill.scale.setScalar(0.001);
    sc.add(this.mesh); sc.add(this.rim); sc.add(this.fill);
  }
  update(dt) {
    if (this._done) {   // burst: quick expand + fade, then gone
      this._burstT -= dt;
      const k = 1 - Math.max(0, this._burstT) / 0.3;
      this.fill.scale.setScalar(1 + k * 1.6);
      this.fillMat.opacity = 0.35 * (1 - k);
      this.rimMat.opacity  = 0.5  * (1 - k);
      this.mat.opacity     = 0.16 * (1 - k);
      return this._burstT > 0;
    }
    this._life -= dt;
    if (this._life <= 0) return false;
    const inside = player.alive &&
      Math.hypot(player.position.x - this.x, player.position.z - this.z) < this.radius;
    this._charge = Math.max(0, Math.min(1.2, this._charge + (inside ? dt : -dt * 1.5)));
    this.fill.scale.setScalar(Math.max(0.001, this._charge / 1.2));
    this.rimMat.opacity = 0.3 + (inside ? 0.4 : 0.12) * Math.abs(Math.sin(performance.now() * 0.006));
    this.mat.opacity = 0.16 * Math.min(1, this._life / 1.5);  // fade out if ignored
    if (Math.random() < dt * 4) {
      bubblePool.spawn(this.x + (Math.random() - 0.5) * this.radius * 1.4,
                       this.z + (Math.random() - 0.5) * this.radius * 1.4, 0xccf6ff);
    }
    if (this._charge >= 1.2) this._cleanse();
    return true;
  }
  _cleanse() {
    this._done = true; this._burstT = 0.3;
    let n = 0;
    for (let i = bullets.active.length - 1; i >= 0; i--) {
      const b = bullets.active[i];
      if (b.isPlayer) continue;
      gooChunkPool.spawn(b.mesh.position.x, 0.5, b.mesh.position.z,
        (Math.random() - 0.5) * 3, 2.5, (Math.random() - 0.5) * 3, 0xccf6ff, 0.07);
      bullets.recycleAt(i); n++;
    }
    const r = (500 + n * 10) * (scoreMultT > 0 ? 2 : 1);  // pays per bullet cleared
    score += r;
    damageNumbers.push(new DamageNumber(this.x, 1.2, this.z, `+${r}`, '187,244,255'));
    milestoneT = 1.1; milestoneText = 'CLEANSED!';
    addShake(0.18);
    audio.cleanse();
    audio.announce('clear');
  }
  remove(sc) {
    sc.remove(this.mesh); sc.remove(this.rim); sc.remove(this.fill);
    this.mesh.geometry.dispose(); this.mat.dispose();
    this.rim.geometry.dispose();  this.rimMat.dispose();
    this.fill.geometry.dispose(); this.fillMat.dispose();
  }
}
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
let clusterSpawnAt  = []; // seconds-into-wave queue of convoy spawns (empty = none left); SMASH TV gets two per wave
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
// Live scoring feedback (v124): mid-action milestone popups — score thresholds
// and streak tiers — one shared channel (rare events, latest wins).
let milestoneT = 0, milestoneText = '';
let nextMilestone = 25000;
let grazeCount = 0;  // v125: bullets skimmed past while vulnerable (+25 each)
let shieldBlockCount = 0;  // v126: player shots eaten by WARDEN auras this run
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
// SMASH TV mode (v109): enemies pour in bursts from 4 arena-edge "doors",
// waves run bigger and burstier, and moths/convoys drop more prizes.
let smashMode = localStorage.getItem('tokoDropSmash') === '1';
// DAILY RUN (v130, roadmap M3): everyone who flips the chip plays the same
// UTC-date-derived seed that day — no server needed. Whatever mode toggles
// you bring are yours; the run is tagged DAILY (death screen, share, feedback
// payload) and a separate per-day local best is kept.
let dailyMode = localStorage.getItem('tokoDropDaily') === '1';
let _dailyRun = null;   // 'YYYY-MM-DD' while the current/last run was a daily
function dailyBestGet() {
  try { return JSON.parse(localStorage.getItem('tokoDropDailyBest') || '{}'); }
  catch (_) { return {}; }
}
// SMASH TV room graph (v115): rooms live on a 2D lattice. Clearing a room
// opens EXIT doors; each leads to a neighbor whose kind is knowable in
// advance (minimap), and you enter the next room from the opposing wall.
let roomX = 0, roomY = 0;
let visitedRooms = new Set();
let smashRoomKind = null;   // kind chosen via the exit taken; null = derive from wave rhythm
let exitPhase = false;      // room cleared, doors open, player walking out
let exitDoors = [];         // [{ door: 0-3, kind }]
let roomTallyT = 0;         // bonus tally card timer
let roomFadeT  = 0;         // v120: black dip while walking through an exit door
let _roomSwap  = null;      // exit taken, waiting for the fade peak to swap rooms
let _entryDoor = null;      // door index the player enters the NEXT room through
let _cameFromDoor = null;   // wall the player entered THIS room through (no backtracking)
// Risk-priced room kinds (v120): the exit choice is a trade, not a freebie —
// HEAVY rooms pay double floor loot (+1 item), PRIZE$ rooms drop fewer weapon
// pods from moths (loot-rich but firepower-poor), SWARM feeds kill streaks.
const ROOM_KINDS = {
  normal: { label: 'MOBS',   color: '#aab4ff' },
  swarm:  { label: 'SWARM',  color: '#66ffcc' },
  spike:  { label: 'HEAVY 2×$', color: '#ffaa44' },
  prize:  { label: 'PRIZE$', color: '#ffdd44' },
  boss:   { label: 'BOSS!',  color: '#ff5566' },
};
// Deterministic per-run room kind for lattice cell (x, y). The 8th room of a
// run is always the boss (mirrors the wave rhythm), so every exit says BOSS!.
function roomKindAt(x, y) {
  if ((wave + 1) % 8 === 0) return 'boss';
  const h = mulberry32((runSeed ^ (x * 73856093) ^ (y * 19349663)) | 0)();
  return h < 0.45 ? 'normal' : h < 0.65 ? 'swarm' : h < 0.85 ? 'spike' : 'prize';
}
// door index ↔ lattice direction (matches the DOORS spawn angles):
// 0 = +x (east), 1 = +z (south / near edge), 2 = −x (west), 3 = −z (north / far)
const DOOR_DX = [1, 0, -1, 0];
const DOOR_DY = [0, 1, 0, -1];
function smashDoorPos(i) {
  return [[HALF_X, 0], [0, HALF_Z], [-HALF_X, 0], [0, -HALF_Z]][i];
}
// 2-3 exit doors per cleared room, never the wall you came in through; each
// carries the (knowable) kind of the room behind it — that's the choice.
function pickSmashExits() {
  const cands = [0, 1, 2, 3].filter(d => d !== _cameFromDoor);
  for (let i = cands.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cands[i], cands[j]] = [cands[j], cands[i]];
  }
  return cands.slice(0, 2 + (rng() < 0.5 ? 1 : 0)).map(d => ({
    door: d,
    kind: roomKindAt(roomX + DOOR_DX[d], roomY + DOOR_DY[d]),
  }));
}
// Announcer (v109): game-show commentary via speech synthesis.
let announcerOn = localStorage.getItem('tokoDropAnnouncer') === '1';
audio.setAnnouncer(announcerOn);
// TEST MODE (v142): a playtest workbench run — all enemy types unlock from
// wave 1 and the run leaves NO records (no PB, no daily best, no leaderboard;
// feedback records are tagged test). For meeting new enemies fast.
let testMode = localStorage.getItem('tokoDropTest') === '1';
// v137: announcer volume slider (independent of master — speech caps at 1.0).
let announcerVol = (() => {
  const raw = parseFloat(localStorage.getItem('tokoDropAnnVol') ?? '1');
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1.0;
})();
audio.setAnnouncerVolume(announcerVol);
// Recorded title intro voice (v122): its OWN toggle, on by default, separate
// from the announcer commentary. `!== '0'` → defaults on unless turned off.
let introVoiceOn = localStorage.getItem('tokoDropIntroVoice') !== '0';
audio.setIntroVoice(introVoiceOn);
let _titleIntroPlayed = false;  // recorded intro plays once per title visit

// Orientation (v110): the arena ALWAYS matches the screen — wide viewport,
// wide arena. The old manual toggle let a stale saved choice pin a vertical
// map onto a landscape screen (and vice versa), so it's gone: viewport aspect
// is the single source of truth, re-checked at the title and at run start.
// Old tokoDropLandscape / tokoDropOrientSet saves are deliberately ignored.
let landscapeMode = innerWidth > innerHeight;
applyArenaMode(landscapeMode);

// Settings (v75): audio volume + reduce-motion (screen shake), both persisted.
let audioVolume = (() => {
  const raw = parseFloat(localStorage.getItem('tokoDropVolume'));
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1.0;
})();
let reduceMotion = localStorage.getItem('tokoDropReduceMotion') === '1';
audio.setVolume(audioVolume);

// Performance mode (v97): halves render resolution (pixelRatio 2 → 1.25) and
// zeroes material transmission so three.js skips its transmission render pass
// entirely — the two big GPU costs on weaker phones. Reversible live.
let perfMode = localStorage.getItem('tokoDropPerf') === '1';
let _perfSavedTrans = null;
function applyPerfMode() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, perfMode ? 1.25 : 2));
  // v129: the 1024² shadow pass is the third big GPU cost — drop it too.
  // (three re-selects programs automatically when a light's castShadow flips.)
  sun.castShadow = !perfMode;
  const M = TUNING.material;
  if (perfMode) {
    if (!_perfSavedTrans) {
      _perfSavedTrans = {
        base: M.transmission,
        fams: Object.fromEntries(Object.entries(M.families).map(([k, v]) => [k, v.transmission])),
      };
    }
    M.transmission = 0;
    for (const f of Object.values(M.families)) if (f.transmission !== undefined) f.transmission = 0;
  } else if (_perfSavedTrans) {
    M.transmission = _perfSavedTrans.base;
    for (const [k, v] of Object.entries(M.families)) {
      if (_perfSavedTrans.fams[k] !== undefined) v.transmission = _perfSavedTrans.fams[k];
    }
    _perfSavedTrans = null;
  }
  applySatinValues();
}
applyPerfMode();

// Re-derive orientation while on the title screen: rotating the device flips
// the arena live. A running game never flips (bounds swapping mid-fight would
// teleport the battle); the next run picks up the new orientation instead.
function syncAutoOrientation() {
  if (gameState !== 'title') return;
  const want = innerWidth > innerHeight;
  if (want !== landscapeMode) {
    landscapeMode = want;
    applyArenaMode(want);
    showTitle();  // re-render the title over the re-framed arena
  } else if (smashMode || landscapeMode) {
    // Same orientation but the aspect may have changed (window resize, URL
    // bar) — refit the zoom. Camera-only, no geometry churn.
    CAM_REST.copy(fitPresetCamera(smashMode ? ARENA_PRESETS.smash : ARENA_PRESETS.landscape));
    camera.position.copy(CAM_REST);
    camera.lookAt(CAM_LOOK);
  }
}

function onKill(e) {
  streak++;
  score += 100 * streak * (scoreMultT > 0 ? 2 : 1);
  if (streak > 0 && streak % 5 === 0) audio.announce('streak');
  // BOUNTY claim (v133): marked target down inside the window — big cash and
  // a guaranteed weapon pod at the body. Works from any kill source (bullets,
  // gate lasers, dash boom) since everything funnels through onKill.
  if (e === bountyEnemy && bountyT > 0) {
    const r = (1500 + wave * 100) * (scoreMultT > 0 ? 2 : 1);
    score += r;
    milestoneT = 1.2; milestoneText = `BOUNTY +${r}!`;
    damageNumbers.push(new DamageNumber(
      e.position.x, e.fxY + e.radius + 0.4, e.position.z, `+${r}`, '255,204,51'));
    const pod = new Powerup(scene, e.position.x, e.position.z, randomWeaponPodId(wave >= 4));
    pod._life = 10.0;
    powerups.push(pod);
    audio.milestone();
    audio.announce('money');
    clearBounty();
  }
  // Streak-tier popup (v124): a beat of celebration at 10/20/30… without
  // interrupting play (classic mode stays uninterrupted by design).
  if (streak >= 10 && streak % 10 === 0) {
    milestoneT = 1.1;
    milestoneText = `STREAK ×${streak}!`;
  }
  // SMASH TV (v114): kills sometimes drop cash that lies on the floor — walk
  // over it before it fades. Big money. Big prizes.
  if (smashMode && Math.random() < 0.15 && powerups.length < 14) {
    const pu = new Powerup(scene, e.position.x, e.position.z, 'score',
      (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6);
    pu._life = 6.0;
    powerups.push(pu);
  }
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
  if (player.alive) audio.announce('ouch');  // death gets the gameover line instead
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
  [EnemyType.BOTFLY]:      'pink Botfly',
  [EnemyType.WARDEN]:      'teal Warden',
  [EnemyType.BULWARK]:     'steel Bulwark',
  [EnemyType.SIREN]:       'violet Siren',
  [EnemyType.CLOAKER]:     'ice Cloaker',
  [EnemyType.MAGNA]:       'amber Magna',
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
  // v126: ask about the new systems when this run actually touched them.
  if (shieldBlockCount >= 6) push('warden', t('fbWarden'));
  if (smashMode) push('doors', t('fbDoors'));
  push('too_fast', t('fbTooFast'));
  push('unfair',   t('fbUnfair'));
  push('unclear',  t('fbUnclear'));
  // De-dup by id, cap at 4 (telemetry-derived reasons come first, so they win).
  const seen = new Set(); const reasons = [];
  for (const r of out) { if (seen.has(r.id)) continue; seen.add(r.id); reasons.push(r); if (reasons.length >= 4) break; }
  return reasons;
}

// Positive-feedback options — what the player enjoyed this run. Mode-aware
// since v126 so the chips ask about the systems this run actually had:
// SMASH TV probes rooms + floor loot; classic swaps in graze once it happened.
function buildPositiveReasons() {
  if (smashMode) return [
    { id: 'like:rooms', label: t('likeRooms') },
    { id: 'like:loot',  label: t('likeLoot') },
    { id: 'like:graze', label: t('likeGraze') },
    { id: 'like:feel',  label: t('likeFeel') },
  ];
  return [
    { id: 'like:weapons', label: t('likeWeapons') },
    { id: 'like:bosses',  label: t('likeBosses') },
    { id: 'like:feel',    label: t('likeFeel') },
    grazeCount > 0 ? { id: 'like:graze',   label: t('likeGraze') }
                   : { id: 'like:dodging', label: t('likeDodging') },
  ];
}

// Remote feedback (v117/v118): the SEND & CONTINUE record is POSTed to an
// inbox so playtest feedback reaches the developer directly. Explicit consent
// by design — it fires ONLY on the SEND action (SKIP sends nothing), and it's
// fire-and-forget: offline, ad-blocked, or over-quota all fail silently
// without touching the local save.
//
// Two sinks (v118):
//  - SHEET_ENDPOINT: Google Apps Script web app (scripts/feedback-sheet.gs
//    has the server code + 3-minute setup steps) — rows land in a Google
//    Sheet, no submission limit. Paste the deployment's /exec URL here and
//    it takes over as primary.
//  - Formspree fallback (~50 submissions/month free) while SHEET_ENDPOINT
//    is empty.
const SHEET_ENDPOINT     = '';  // e.g. 'https://script.google.com/macros/s/XXXX/exec'
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdarbpve';
// Daily leaderboard (v131, roadmap M3): scripts/leaderboard-sheet.gs, same
// 3-minute Apps Script setup as the feedback sink but its own deployment.
// EMPTY = the death screen shows no leaderboard UI at all.
const LEADERBOARD_ENDPOINT = '';  // e.g. 'https://script.google.com/macros/s/YYYY/exec'
let _lbPosted = false;  // one POST per death, reset each run
function postFeedback(record) {
  const payload = JSON.stringify({
    ...record,
    game: 'toko-drop',
    build: new URL(import.meta.url).searchParams.get('v') ?? '?',
    smash: smashMode,
    announcer: announcerOn,
    lang: getLang(),
    screen: `${innerWidth}x${innerHeight}`,
    ua: navigator.userAgent,
  });
  try {
    if (SHEET_ENDPOINT) {
      // Apps Script can't answer CORS preflights — text/plain + no-cors keeps
      // the POST "simple" (no OPTIONS round-trip); the opaque response is fine
      // for fire-and-forget.
      fetch(SHEET_ENDPOINT, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload,
      }).catch(() => {});
    } else {
      fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: payload,
      }).catch(() => {});
    }
  } catch (_) {}
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
    grazes: grazeCount,
    shieldBlocks: shieldBlockCount,
    daily: _dailyRun,
    test: testMode,
    topAttacker: Object.entries(atk).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  });
  if (list.length > 100) list.length = 100;
  localStorage.setItem(KEY, JSON.stringify(list));
  postFeedback(list[0]);

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
let waveGapT = 0; // v136: classic-mode breather between waves — play continues, next wave waits
// v138: gates teach themselves — a DASH! tag hangs over every gate until the
// player has detonated one, ever. Persisted; the mechanic only needs teaching once.
let gateUsed = localStorage.getItem('tokoDropGateUsed') === '1';

// ── UI canvas ─────────────────────────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx      = uiCanvas.getContext('2d');
const overlay  = document.getElementById('overlay');
const _proj    = new THREE.Vector3();

const designer = initDesigner({
  // The same panel serves as the mid-run pause menu and the title's OPTIONS
  // screen — resume back to whichever state opened it. Returning to the title
  // is a gesture (RESUME tap), so it's a safe moment to fire the intro voice.
  onResume: () => {
    const backToTitle = gameState === 'options';
    gameState = backToTitle ? 'title' : 'playing';
    // The device may have rotated while the panel was open (sync early-returns
    // outside the title state), so re-check the arena fit on the way back.
    if (backToTitle) { syncAutoOrientation(); playTitleIntro(); }
  },
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
    getPerf: () => perfMode,
    setPerf: on => {
      perfMode = on;
      localStorage.setItem('tokoDropPerf', on ? '1' : '0');
      applyPerfMode();
    },
    getSmash: () => smashMode,
    setSmash: on => {
      smashMode = on;
      localStorage.setItem('tokoDropSmash', on ? '1' : '0');
      // The mode has its own fixed room size (v115) — re-frame the title arena
      // immediately when toggled from the title's OPTIONS panel.
      if (gameState === 'title' || gameState === 'options') applyArenaMode(landscapeMode);
    },
    getTest: () => testMode,
    setTest: on => {
      testMode = on;
      localStorage.setItem('tokoDropTest', on ? '1' : '0');
    },
    getAnnVol: () => announcerVol,
    setAnnVol: v => {
      announcerVol = v;
      audio.setAnnouncerVolume(v);
      localStorage.setItem('tokoDropAnnVol', String(v));
    },
    getAnnouncer: () => announcerOn,
    setAnnouncer: on => {
      announcerOn = on;
      localStorage.setItem('tokoDropAnnouncer', on ? '1' : '0');
      audio.setAnnouncer(on);
      if (on) audio.announce('start');  // mic check — inside the click gesture
    },
    getIntroVoice: () => introVoiceOn,
    setIntroVoice: on => {
      introVoiceOn = on;
      localStorage.setItem('tokoDropIntroVoice', on ? '1' : '0');
      audio.setIntroVoice(on);
      // Turning it on plays the clip right now (inside the click gesture) so you
      // hear exactly what it is; mark it played so returning to the title won't double it.
      if (on) { _titleIntroPlayed = true; audio.introJingle(); }
      else    { _titleIntroPlayed = false; }
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

// SMASH TV traversal minimap (v115): a zoomed 3×3 view of the room lattice,
// shown while the exit doors are open. Center = this room (live player dot);
// neighbors behind open exits show their KIND so the pick is an informed one;
// already-visited neighbors are marked. North (top) = the arena's far wall.
function drawSmashMinimap() {
  const cell = Math.max(40, Math.min(62, Math.floor(uiCanvas.width * 0.065)));
  const pad  = 8;
  const size = cell * 3 + pad * 2;
  // Top-right, under the score readout — clear of both touch sticks.
  const mx = uiCanvas.width - size - 14;
  const my = 46;
  ctx.save();
  ctx.fillStyle = 'rgba(6,6,24,0.85)';
  ctx.strokeStyle = 'rgba(130,140,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.fillRect(mx, my, size, size);
  ctx.strokeRect(mx, my, size, size);
  ctx.textAlign = 'center';
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx !== 0 && dy !== 0) continue;          // 4-connected lattice — skip corners
      const cx = mx + pad + (dx + 1) * cell;
      const cy = my + pad + (dy + 1) * cell;
      const w = cell - 6, o = 3;
      if (dx === 0 && dy === 0) {
        // Current room + live player dot (so you can line up your exit walk)
        ctx.strokeStyle = '#aaccff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx + o, cy + o, w, w);
        const px = cx + o + w / 2 + (player.position.x / HALF_X) * (w / 2 - 3);
        const py = cy + o + w / 2 + (player.position.z / HALF_Z) * (w / 2 - 3);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      const door = DOOR_DX.findIndex((v, i) => v === dx && DOOR_DY[i] === dy);
      const exit = exitDoors.find(ed => ed.door === door);
      const key  = `${roomX + dx},${roomY + dy}`;
      if (exit) {
        const k = ROOM_KINDS[exit.kind];
        ctx.strokeStyle = '#33ff88';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx + o, cy + o, w, w);
        ctx.fillStyle = k.color;
        ctx.font = `bold ${Math.floor(cell * 0.2)}px monospace, sans-serif`;
        ctx.fillText(k.label, cx + cell / 2, cy + cell / 2 + 4);
        // doorway notch between this cell and the center cell
        ctx.fillStyle = '#33ff88';
        const nx = cx + cell / 2 - dx * (cell / 2 - 1), ny = cy + cell / 2 - dy * (cell / 2 - 1);
        ctx.fillRect(nx - (dy !== 0 ? 5 : 2), ny - (dx !== 0 ? 5 : 2), dy !== 0 ? 10 : 4, dx !== 0 ? 10 : 4);
      } else if (visitedRooms.has(key)) {
        ctx.strokeStyle = 'rgba(120,120,160,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + o, cy + o, w, w);
        ctx.fillStyle = 'rgba(150,150,190,0.6)';
        ctx.font = `bold ${Math.floor(cell * 0.26)}px monospace, sans-serif`;
        ctx.fillText('✓', cx + cell / 2, cy + cell / 2 + 5);
      } else {
        ctx.strokeStyle = 'rgba(70,70,110,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx + o, cy + o, w, w);
      }
    }
  }
  // Rooms until the floor boss (v118) — every 8th room; when it's next, all
  // exits already say BOSS!, this just lets you see it coming.
  const toBoss = 8 - (wave % 8);
  ctx.font = 'bold 11px monospace, sans-serif';
  ctx.fillStyle = toBoss <= 1 ? '#ff5566' : 'rgba(190,190,230,0.85)';
  ctx.fillText(toBoss <= 1 ? 'BOSS NEXT!' : `BOSS IN ${toBoss}`, mx + size / 2, my + size + 15);
  ctx.restore();
}

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

  // Room-traversal black dip (v120): peak at roomFadeT = 0.3, where the swap fires.
  if (roomFadeT > 0) {
    const a = roomFadeT > 0.3 ? (0.55 - roomFadeT) / 0.25 : roomFadeT / 0.3;
    ctx.fillStyle = `rgba(5,5,16,${Math.max(0, Math.min(1, a)).toFixed(2)})`;
    ctx.fillRect(0, 0, uiCanvas.width, uiCanvas.height);
  }

  // Mid-action milestone popup (v124): score thresholds + streak tiers.
  // Sits below the wave banner's line so the two never overlap.
  if (milestoneT > 0 && gameState === 'playing') {
    const a = Math.min(1, milestoneT * 4, (1.2 - milestoneT) * 6);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px monospace, sans-serif';
    ctx.shadowColor = '#ffcc33';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffee88';
    ctx.fillText(milestoneText, uiCanvas.width / 2, uiCanvas.height * 0.40);
    ctx.restore();
  }

  // Wave-start banner (v114 SMASH room card / v123 classic rhythm banner):
  // big color-coded wave title, quick fade in/out.
  if (waveIntroT > 0 && gameState === 'playing') {
    const a = Math.min(1, waveIntroT * 3, (waveIntroDur - waveIntroT) * 5);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px monospace, sans-serif';
    ctx.shadowColor = waveIntroColor;
    ctx.shadowBlur = 26;
    ctx.fillStyle = waveIntroColor;
    ctx.fillText(waveIntroText, uiCanvas.width / 2, uiCanvas.height * 0.30);
    ctx.restore();
  }

  // First-run tutorial hints (v127): low on the screen, clear of the wave
  // banner (0.30) and milestone (0.40) lines. Fade in fast, out gently.
  if (tutorialHints && gameState === 'playing') {
    const last = tutorialHints[tutorialHints.length - 1];
    if (runTimer > last.at + last.dur) {
      tutorialHints = null;
      localStorage.setItem('tokoDropHintsSeen', '1');
    } else {
      for (const h of tutorialHints) {
        const ht = runTimer - h.at;
        if (ht < 0 || ht > h.dur) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ht / 0.4, (h.dur - ht) / 0.8)) * 0.92;
        ctx.textAlign = 'center';
        ctx.font = 'bold 16px monospace, sans-serif';
        ctx.shadowColor = '#66bbff';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#cceeff';
        ctx.fillText(h.text, uiCanvas.width / 2, uiCanvas.height * 0.70);
        ctx.restore();
      }
    }
  }

  // SMASH TV room-clear tally + traversal UI (v115)
  if (exitPhase && gameState === 'playing') {
    // Bonus tally card (first couple of seconds)
    if (roomTallyT > 0) {
      const a = Math.min(1, roomTallyT * 3, (2.2 - roomTallyT) * 5);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.textAlign = 'center';
      ctx.font = 'bold 38px monospace, sans-serif';
      ctx.shadowColor = '#33cc77';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#aaffcc';
      ctx.fillText('ROOM CLEAR!', uiCanvas.width / 2, uiCanvas.height * 0.26);
      ctx.font = 'bold 20px monospace, sans-serif';
      ctx.fillText(`BONUS +${wave * 500}`, uiCanvas.width / 2, uiCanvas.height * 0.26 + 34);
      ctx.restore();
    }
    drawSmashMinimap();
    // EXIT labels floating over the open doors (drawn after the minimap so a
    // door near the panel keeps its label legible)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px monospace, sans-serif';
    for (const ed of exitDoors) {
      const [dx, dz] = smashDoorPos(ed.door);
      const p = toScreen({ x: dx, y: 2.9, z: dz });
      ctx.shadowColor = '#33ff88';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#aaffcc';
      ctx.fillText('EXIT', p.x, p.y);
      ctx.shadowBlur = 0;
      ctx.font = 'bold 11px monospace, sans-serif';
      ctx.fillStyle = ROOM_KINDS[ed.kind].color;
      ctx.fillText(ROOM_KINDS[ed.kind].label, p.x, p.y + 14);
      ctx.font = 'bold 15px monospace, sans-serif';
    }
    ctx.restore();
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
    // Streak heat tiers (v124): the meter visibly escalates — gold → orange
    // (10+) → red-hot with glow (20+) — so the scoring depth reads at a glance.
    const flashScale = 1 + Math.max(0, streakFlashT / STREAK_FLASH_DUR) * 0.4;
    const heat = streak >= 20 ? { c: '#ff5566', glow: 16 }
               : streak >= 10 ? { c: '#ffaa44', glow: 10 }
               : streak >= 5  ? { c: '#ffdd44', glow: 6 }
               :                { c: '#ffdd44', glow: 0 };
    ctx.font = `bold ${Math.round((14 + Math.min(6, streak * 0.2)) * flashScale)}px monospace, sans-serif`;
    if (heat.glow) { ctx.shadowColor = heat.c; ctx.shadowBlur = heat.glow; }
    ctx.fillStyle = heat.c;
    ctx.fillText(`×${streak} ${t('hudStreak')}`, uiCanvas.width - 16, 44);
    ctx.shadowBlur = 0;
    ctx.font = HUD_FONT;
  }
  // Active 2× score multiplier (v124): pulsing tag + a draining time bar, so
  // you know to cash in kills before it expires.
  if (scoreMultT > 0) {
    const pulse = 0.7 + 0.3 * Math.sin(performance.now() * 0.012);
    ctx.font = 'bold 13px monospace, sans-serif';
    ctx.fillStyle = `rgba(255,204,51,${pulse.toFixed(2)})`;
    ctx.fillText('2×', uiCanvas.width - 16, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(uiCanvas.width - 76, 70, 60, 3);
    ctx.fillStyle = '#ffcc33';
    ctx.fillRect(uiCanvas.width - 76 + 60 * (1 - Math.min(1, scoreMultT / 10)), 70,
                 60 * Math.min(1, scoreMultT / 10), 3);
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

  // Shooter entrance pings (v120): pulsing "!" over freshly arrived shooters
  ctx.textAlign = 'center';
  for (const e of enemies) {
    if (!e._pingT || e._pingT <= 0 || !e.alive) continue;
    const p = toScreen({ x: e.position.x, y: e.fxY + e.radius * 2 + 0.8, z: e.position.z });
    const a = Math.min(1, e._pingT * 2);
    const pulse = 1 + 0.18 * Math.sin(performance.now() * 0.02);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `bold ${Math.round(20 * pulse)}px monospace, sans-serif`;
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffdd44';
    ctx.fillText('!', p.x, p.y);
    ctx.restore();
  }

  // Gate teaching tag (v138): until the player has ever dashed a gate, every
  // live gate advertises the move — pulsing, dash-colored, impossible to miss.
  if (!gateUsed && gameState === 'playing') {
    for (const g of gates) {
      if (!g.alive) continue;
      const p = toScreen({ x: g._x, y: 2.1, z: g._z });
      ctx.save();
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(performance.now() * 0.006);
      ctx.font = 'bold 13px monospace, sans-serif';
      ctx.shadowColor = '#44ff88';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#aaffcc';
      ctx.fillText('DASH THROUGH!', p.x, p.y);
      ctx.restore();
    }
  }

  // BOUNTY tag (v133): gold label + countdown shadowing the marked enemy.
  if (bountyEnemy && bountyEnemy.alive && bountyT > 0 && gameState === 'playing') {
    const p = toScreen({
      x: bountyEnemy.position.x,
      y: bountyEnemy.fxY + bountyEnemy.radius * 2 + 1.3,
      z: bountyEnemy.position.z,
    });
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px monospace, sans-serif';
    ctx.shadowColor = '#ffcc33';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffdd66';
    ctx.fillText(`BOUNTY ${Math.ceil(bountyT)}`, p.x, p.y);
    ctx.restore();
  }

  // Damage numbers / loot value popups
  ctx.textAlign = 'center';
  for (const dn of damageNumbers) {
    const s = toScreen(dn.pos);
    const alpha = Math.max(0, dn._life / 0.6);
    ctx.fillStyle = `rgba(${dn.rgb},${alpha.toFixed(2)})`;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(dn.text, s.x, s.y);
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
  ctx.fillText('v144', 16, uiCanvas.height - 12);

  // Seed (bottom-right, very faint — for sharing runs)
  if (runSeed > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = '10px monospace, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${testMode && gameState !== 'title' ? 'TEST · ' : ''}${_dailyRun && gameState !== 'title' ? 'DAILY · ' : ''}${t('seed')} ${runSeed.toString(16).toUpperCase().padStart(6,'0')}`, uiCanvas.width - 16, uiCanvas.height - 12);
    ctx.textAlign = 'left';
  }

}

// ── Overlay helpers ────────────────────────────────────────────────────────────────
// Recorded title intro voice (v122): play once per title visit, gesture-safe.
// Called from showTitle() and when returning to the title from OPTIONS / a run.
function playTitleIntro() {
  if (!introVoiceOn || _titleIntroPlayed) return;
  _titleIntroPlayed = true;
  const p = audio.introJingle();
  if (p && p.catch) p.catch(() => { _titleIntroPlayed = false; });  // autoplay-blocked → retry next gesture
}

function showTitle() {
  // v121/v122: recorded intro voice, once per title visit (reset in startGame),
  // gated by its own INTRO VOICE toggle. If autoplay blocks it on a cold load
  // (no gesture yet), un-set the flag so a later title re-render — after any
  // tap on a chip/toggle — plays it.
  playTitleIntro();
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
  // v106: interactive on the title too, so short screens (landscape phones) can
  // scroll the column. Tap-to-start still works — the window touchend handler
  // keys off [data-ui] elements, not the overlay. startGame() resets this.
  overlay.style.pointerEvents = 'auto';
  overlay.innerHTML =
    // Logo width: also capped by height (aspect 1.64 → 43vh ≈ 26vh tall) so a
    // short landscape viewport doesn't spend half its height on the logo.
    `<div style="position:relative;width:min(72vw,340px,43vh);margin:0 auto;animation:tokoFadeUp 0.5s ease both">` +
    // Soft oval neon wash behind the lettering — a radial gradient that fades
    // to nothing (the old rectangular drop-shadow read as a pink box).
    `<div style="position:absolute;inset:-34% -22%;pointer-events:none;` +
    `background:radial-gradient(ellipse 52% 48% at 50% 50%,rgba(255,68,34,0.50),rgba(170,0,255,0.30) 55%,rgba(170,0,255,0) 74%)"></div>` +
    `<img src="logo.png" alt="TOKO DROP" style="position:relative;width:100%;display:block;` +
    `filter:drop-shadow(0 0 8px rgba(255,68,34,0.8))">` +
    `</div>` +
    `<div class="t-sub" style="font-size:13px;opacity:0.5;margin:8px 0 22px;animation:tokoFadeUp 0.5s 0.1s ease both">` +
    `${t('subtitle')}</div>` +
    (pb.bestScore > 0
      ? `<div style="font-size:13px;color:#ffdd44;opacity:0.85;margin-bottom:14px;letter-spacing:1px;` +
        `animation:tokoFadeUp 0.5s 0.15s ease both">` +
        `${t('best')} &nbsp;${pb.bestScore} ${t('pts')} &nbsp;·&nbsp; ${t('wave')} ${pb.bestWave} &nbsp;·&nbsp; ${fmtTime(pb.bestTime)}</div>`
      : ``) +
    `<div style="font-size:16px;opacity:0.85;animation:tokoFadeUp 0.5s 0.2s ease both">${t('tapStart')}</div>` +
    `<div id="rogue-toggle-slot" style="margin-top:18px;animation:tokoFadeUp 0.5s 0.3s ease both"></div>` +
    `<div id="settings-slot" style="margin-top:14px;animation:tokoFadeUp 0.5s 0.32s ease both"></div>` +
    `<div class="t-help" style="font-size:9.5px;opacity:0.32;margin:14px auto 0;line-height:1.6;text-align:center;` +
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
      chip.dataset.ui = '1';  // excluded from tap-to-start
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

  // (The old ORIENTATION toggle is gone — v110: the arena always follows the
  // screen, so there's nothing to choose and no way to save a mismatch.)

  // Roguelike toggle — a clickable chip inside the (pointer-events:none) overlay.
  const slot = document.getElementById('rogue-toggle-slot');
  const btn  = document.createElement('div');
  btn.dataset.ui = '1';
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

  // DAILY RUN chip (v130) — same styling family as the roguelike chip, gold.
  const dbtn  = document.createElement('div');
  dbtn.dataset.ui = '1';
  const dhint = document.createElement('div');
  dhint.style.cssText = 'font-size:11px;opacity:0.45;margin-top:6px';
  const drender = () => {
    const on = dailyMode;
    dbtn.textContent = `${t('daily')}: ${on ? t('on') : t('off')}`;
    dbtn.style.cssText =
      'display:inline-block;pointer-events:auto;cursor:pointer;user-select:none;' +
      'font-size:14px;font-weight:bold;padding:8px 18px;border-radius:8px;' +
      'background:rgba(0,0,0,0.35);transition:all 0.12s;margin-top:10px;' +
      `border:2px solid ${on ? '#ffcc33' : '#445'};` +
      `color:${on ? '#ffdd66' : '#7777aa'};` +
      `text-shadow:${on ? '0 0 12px #ffaa00' : 'none'};`;
    const db = dailyBestGet();
    const todayBest = on && db.date === new Date().toISOString().slice(0, 10)
      ? ` — ${t('dailyBest')} ${db.score}` : '';
    dhint.textContent = (on ? t('dailyOnH') : t('dailyOffH')) + todayBest;
  };
  drender();
  const dtoggle = e => {
    e.stopPropagation();
    e.preventDefault();
    dailyMode = !dailyMode;
    localStorage.setItem('tokoDropDaily', dailyMode ? '1' : '0');
    drender();
  };
  dbtn.addEventListener('pointerdown', dtoggle);
  dbtn.addEventListener('touchend', e => e.stopPropagation());
  slot.appendChild(dbtn);
  slot.appendChild(dhint);

  // v81: volume + reduce-motion moved into the pause menu's SETTINGS page —
  // the title keeps only the run-history link and a faint pointer to where
  // the settings went.
  {
    const sslot = document.getElementById('settings-slot');
    sslot.style.cssText += ';display:flex;flex-direction:column;align-items:center;gap:10px';

    // Run History button (v76) — opens a panel over data already recorded
    // in pb.runs (top 10 by score, maintained by recordRun()).
    const rhBtn = document.createElement('div');
    rhBtn.dataset.ui = '1';
    rhBtn.textContent = t('runHistory');
    rhBtn.style.cssText =
      'display:inline-block;pointer-events:auto;cursor:pointer;user-select:none;' +
      'font-size:12px;letter-spacing:1px;opacity:0.5;padding:4px 10px;text-decoration:underline;';
    rhBtn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); showRunHistory(); });
    rhBtn.addEventListener('touchend', e => e.stopPropagation());
    sslot.appendChild(rhBtn);

    // OPTIONS (v109) — opens the pause menu right from the title (settings +
    // SMASH TV / announcer toggles + enemy tester) instead of a passive hint.
    const optBtn = document.createElement('div');
    optBtn.dataset.ui = '1';
    optBtn.textContent = t('options');
    optBtn.style.cssText =
      'display:inline-block;pointer-events:auto;cursor:pointer;user-select:none;' +
      'font-size:12px;letter-spacing:1px;opacity:0.5;padding:4px 10px;text-decoration:underline;';
    optBtn.addEventListener('pointerdown', e => {
      e.stopPropagation();
      e.preventDefault();
      // Same pattern as showRunHistory(): leave 'title' while the panel is up
      // so the window tap-to-start handler can't fire underneath it.
      gameState = 'options';
      designer.show(t('options'));
    });
    optBtn.addEventListener('touchend', e => e.stopPropagation());
    sslot.appendChild(optBtn);
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
  closeBtn.id = 'rh-close';
  closeBtn.dataset.ui = '1';
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
  // Daily best (v130): per-day, separate from the all-time PB above.
  if (_dailyRun) {
    const db = dailyBestGet();
    if (db.date !== _dailyRun || score > (db.score || 0)) {
      localStorage.setItem('tokoDropDailyBest',
        JSON.stringify({ date: _dailyRun, score, wave }));
      badges.push(`★ ${t('dailyBest')}`);
    }
  }
  overlay.innerHTML =
    `<div class="d-title" style="font-size:52px;font-weight:bold">${t('youDied')}</div>` +
    `<div class="d-sub" style="font-size:15px;opacity:0.6;margin-top:10px;letter-spacing:2px">` +
      `${t('wave')} ${wave} &nbsp;·&nbsp; ${fmtTime(runTimer)} &nbsp;·&nbsp; ${score} ${t('pts')}` +
      (grazeCount > 0 ? ` &nbsp;·&nbsp; ${grazeCount} ${t('graze')}` : ``) +
    `</div>` +
    (badges.length
      ? `<div class="d-sub" style="font-size:16px;color:#ffdd44;margin-top:8px;letter-spacing:1px">${badges.join('&nbsp;&nbsp;')}</div>`
      : ``) +
    `<div class="d-sub" style="font-size:12px;opacity:0.3;margin-top:10px">${t('seed')} ${seedHex}` +
      (_dailyRun ? ` &nbsp;·&nbsp; <span style="color:#ffdd66">DAILY ${_dailyRun}</span>` : ``) +
    `</div>` +
    `<div id="lb-slot"></div>` +
    `<div id="feedback-slot" style="margin-top:18px"></div>`;

  buildDailyLeaderboard(document.getElementById('lb-slot'));
  buildFeedbackPanel(document.getElementById('feedback-slot'));
}

// Daily leaderboard panel (v131): DAILY runs only, and only once
// LEADERBOARD_ENDPOINT is configured. GET fills the day's top 10 (fails
// silent offline); POST is explicit — initials + a tap — and once per death.
// The POST is no-cors/text/plain like the feedback sink, so the response is
// opaque: the player's row is inserted locally, optimistically.
function buildDailyLeaderboard(slot) {
  if (!slot || !LEADERBOARD_ENDPOINT || !_dailyRun) return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin:16px auto 0;width:min(300px,80vw)';
  wrap.innerHTML =
    `<div style="font-size:12px;letter-spacing:2px;color:#ffdd66;margin-bottom:8px">` +
    `${t('lbTitle')} — ${_dailyRun}</div>`;
  const list = document.createElement('div');
  list.style.cssText = 'font-size:12px;line-height:1.7;margin-bottom:10px;min-height:17px;opacity:0.85';
  list.textContent = '…';
  wrap.appendChild(list);

  const renderRows = rows => {
    list.innerHTML = '';
    if (!rows.length) { list.textContent = t('lbNone'); return; }
    rows.slice(0, 10).forEach((r, i) => {
      const row = document.createElement('div');
      row.style.cssText =
        'display:flex;gap:10px;justify-content:space-between;padding:0 8px;' +
        (r._mine ? 'color:#ffdd66;text-shadow:0 0 8px #ffaa00;' : '');
      row.innerHTML = `<span>${i + 1}. ${r.initials}</span>` +
        `<span>${r.score} ${t('pts')} · W${r.wave}</span>`;
      list.appendChild(row);
    });
  };

  let rows = [];
  fetch(`${LEADERBOARD_ENDPOINT}?daily=${_dailyRun}`)
    .then(res => res.json())
    .then(top => { rows = Array.isArray(top) ? top : []; renderRows(rows); })
    .catch(() => { list.textContent = ''; });

  const form = document.createElement('div');
  form.style.cssText = 'display:flex;gap:8px;justify-content:center;align-items:center';
  const ini = document.createElement('input');
  ini.maxLength = 3;
  ini.placeholder = 'AAA';
  ini.value = localStorage.getItem('tokoDropInitials') || '';
  ini.style.cssText =
    'pointer-events:auto;width:56px;text-align:center;text-transform:uppercase;' +
    'background:rgba(0,0,0,0.4);border:1.5px solid #445;border-radius:7px;color:#ffdd66;' +
    'font-family:monospace,sans-serif;font-size:14px;font-weight:bold;padding:6px 4px;outline:none';
  ini.addEventListener('keydown', e => e.stopPropagation());
  const postBtn = document.createElement('div');
  postBtn.dataset.ui = '1';
  postBtn.textContent = _lbPosted ? t('lbPosted') : t('lbPost');
  postBtn.style.cssText =
    'pointer-events:auto;cursor:pointer;user-select:none;font-size:12px;font-weight:bold;' +
    'padding:7px 14px;border-radius:7px;letter-spacing:1px;border:2px solid #ffcc33;' +
    'background:rgba(0,0,0,0.35);color:#ffdd66;text-shadow:0 0 10px #ffaa00;';
  postBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (_lbPosted) return;
    const initials = ini.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (!initials) { ini.focus(); return; }
    localStorage.setItem('tokoDropInitials', initials);
    _lbPosted = true;
    fetch(LEADERBOARD_ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        initials, score, wave, daily: _dailyRun,
        seed: runSeed.toString(16).toUpperCase().padStart(6, '0'),
        mode: `${roguelikeMode ? 'roguelike' : 'arcade'}${smashMode ? '+smash' : ''}`,
        build: new URL(import.meta.url).searchParams.get('v') ?? '?',
      }),
    }).catch(() => {});
    postBtn.textContent = t('lbPosted');
    rows = [...rows, { initials, score, wave, _mine: true }]
      .sort((a, b) => b.score - a.score);
    renderRows(rows);
  });
  form.appendChild(ini);
  form.appendChild(postBtn);
  wrap.appendChild(form);
  slot.appendChild(wrap);
}

// Death-screen feedback panel: quick-pick reason chips (some predicted from this
// run's telemetry) + a free-text box, saved to localStorage on continue.
function buildFeedbackPanel(slot) {
  if (!slot) return;
  const liked     = new Set();  // positives
  const selected  = new Set();  // negatives
  const labelById = {};
  // v139: one button instead of three — its label says whether continuing
  // will send ("SEND & CONTINUE" once anything is picked/typed, else
  // "CONTINUE"), so there's never doubt about whether feedback went out.
  let sendBtn = null, boxRef = null;
  const refreshSendLabel = () => {
    if (!sendBtn) return;
    const dirty = liked.size || selected.size || (boxRef && boxRef.value.trim());
    sendBtn.textContent = dirty ? t('fbSend') : t('fbContinue');
  };

  // Reusable labeled chip row. accent 'pos' → green, 'neg' → red.
  const addChipRow = (heading, reasons, set, accent) => {
    const onCol = accent === 'pos'
      ? { border: '#44cc88', bg: 'rgba(60,220,150,0.20)', col: '#aaffcc', glow: '0 0 10px #33cc77' }
      : { border: '#ff6644', bg: 'rgba(255,90,60,0.22)',  col: '#ffbbaa', glow: '0 0 10px #ff5533' };
    const title = document.createElement('div');
    title.className = 'fb-head';
    title.textContent = heading;
    title.style.cssText = 'font-size:12px;letter-spacing:2px;opacity:0.55;margin-bottom:10px';
    slot.appendChild(title);
    const row = document.createElement('div');
    row.className = 'fb-row';
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
        refreshSendLabel();
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
  box.addEventListener('input', () => refreshSendLabel());
  boxRef = box;
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
  // v139: CONTINUE always leaves the screen; it sends only when there is
  // something to send (saveFeedback no-ops on empty input), and the label
  // says which will happen. SKIP is gone — Space / Start / B still skip.
  sendBtn = mkBtn(t('fbContinue'), true, () => {
    saveFeedback(
      [...selected], [...selected].map(id => labelById[id]), box.value.trim(),
      [...liked],    [...liked].map(id => labelById[id]),
    );
    returnToTitle();
  });
  btnRow.appendChild(sendBtn);
  // SHARE (v127, roadmap M2): native share sheet where it exists (mobile),
  // clipboard fallback on desktop. Doesn't dismiss the screen — feedback can
  // still be sent afterwards. Share-sheet cancel / clipboard denial: no drama.
  const shareBtn = mkBtn(t('fbShare'), false, async () => {
    const seedHex = runSeed.toString(16).toUpperCase().padStart(6, '0');
    const text = `TOKO DROP — ${score} ${t('pts')} · ${t('wave')} ${wave}` +
                 (smashMode ? ' · SMASH TV' : '') +
                 (_dailyRun ? ` · DAILY ${_dailyRun}` : '') +
                 ` · ${t('seed')} ${seedHex}`;
    const url = location.href.split(/[?#]/)[0];
    try {
      if (navigator.share) { await navigator.share({ text: `${text}\n${url}` }); return; }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      shareBtn.textContent = t('fbCopied');
      setTimeout(() => { shareBtn.textContent = t('fbShare'); }, 1500);
    } catch (_) {}
  });
  btnRow.appendChild(shareBtn);
  slot.appendChild(btnRow);
}

// Classic-mode wave banner (v123): the game already picks a wave RHYTHM
// (normal / swarm / spike / boss) but never told the player — now each wave
// opens with a brief color-coded banner naming the incoming pressure, so the
// rhythm is readable and you can plan the next 20 seconds.
const WAVE_BANNER = {
  normal: { suffix: '',          color: '#ffdd44' },
  swarm:  { suffix: ' — SWARM',  color: '#66ffcc' },
  spike:  { suffix: ' — HEAVY',  color: '#ffaa44' },
  boss:   { suffix: ' — BOSS!',  color: '#ff5566' },
};

// ── First-run tutorial hints (v127, roadmap M2) ──────────────────────────────
// Fading callouts over a brand-new player's first two waves: move, aim, dash,
// and the graze rule. Non-interrupting by design (GDD §2 boundary) — text only,
// no pauses, no input. Marked seen once the full sequence has played, so a
// player who dies mid-sequence gets them again on the next run. Canvas HUD
// stays English deliberately (see lang.js header).
let tutorialHints = null;   // active schedule [{ at, dur, text }], or null
function scheduleTutorialHints() {
  if (localStorage.getItem('tokoDropHintsSeen')) { tutorialHints = null; return; }
  const touch = navigator.maxTouchPoints > 0 && !input.usingGamepad;
  tutorialHints = touch ? [
    { at: 0.8,  dur: 4.5, text: 'LEFT THUMB — MOVE' },
    { at: 6.0,  dur: 4.5, text: 'RIGHT THUMB — AIM & FIRE' },
    { at: 11.5, dur: 4.5, text: 'RELEASE RIGHT THUMB — DASH' },
    { at: 17.0, dur: 5.0, text: "NEAR-MISSES PAY SCORE — DASHES DON'T GRAZE" },
  ] : [
    { at: 0.8,  dur: 4.5, text: 'WASD / LEFT STICK — MOVE' },
    { at: 6.0,  dur: 4.5, text: 'MOUSE / RIGHT STICK — AIM & FIRE' },
    { at: 11.5, dur: 4.5, text: 'SPACE / A — DASH THROUGH BULLETS' },
    { at: 17.0, dur: 5.0, text: "NEAR-MISSES PAY SCORE — DASHES DON'T GRAZE" },
  ];
}

// ── Wave / restart helpers ──────────────────────────────────────────────────────────
// ── SMASH TV doors (v114) ─────────────────────────────────────────────────────
// Four glowing doorways at the arena edge midpoints (matching the DOORS spawn
// angles). Dim while idle; a door flares up in the ~0.9s before a burst pours
// through it — the show's "they're coming through THAT wall" telegraph.
let smashDoorFX = [];
let waveIntroT = 0, waveIntroDur = 1.5, waveIntroText = '', waveIntroColor = '#ffdd44';
function buildSmashDoors() {
  clearSmashDoors();
  if (!smashMode) return;
  // Order matches DOORS = [0, π/2, π, 3π/2] under the (cos·HALF_X, sin·HALF_Z)
  // spawn projection: +x wall, +z wall, −x wall, −z wall.
  const defs = [
    { x:  HALF_X, z: 0,       ry: Math.PI / 2 },
    { x: 0,       z:  HALF_Z, ry: 0 },
    { x: -HALF_X, z: 0,       ry: Math.PI / 2 },
    { x: 0,       z: -HALF_Z, ry: 0 },
  ];
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x2a2a55 });
  const postGeo   = new THREE.BoxGeometry(0.4, 2.3, 0.4);
  const lintelGeo = new THREE.BoxGeometry(5.4, 0.4, 0.4);
  for (const d of defs) {
    // Real doorway geometry (v115): two posts + a lintel form a wall gap the
    // enemies pour through; the inner glow quad carries the telegraph/exit state.
    const g = new THREE.Group();
    const pL = new THREE.Mesh(postGeo, frameMat); pL.position.set(-2.5, 1.15, 0);
    const pR = new THREE.Mesh(postGeo, frameMat); pR.position.set( 2.5, 1.15, 0);
    const li = new THREE.Mesh(lintelGeo, frameMat); li.position.set(0, 2.45, 0);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 2.2),
      new THREE.MeshBasicMaterial({
        color: 0xff3366, transparent: true, opacity: 0.10,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
    glow.position.set(0, 1.1, 0);
    g.add(pL, pR, li, glow);
    g.position.set(d.x, 0, d.z);
    g.rotation.y = d.ry;
    scene.add(g);
    // Floor chevron (v135): a red arrow on the floor just inside the doorway,
    // pointing into the room — the "they're coming through HERE" telegraph you
    // can read without looking up at the wall glow.
    const warnGeo = new THREE.BufferGeometry();
    warnGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      1.1, 0, 0,   -0.5, 0, 0.85,   -0.5, 0, -0.85,
    ]), 3));
    const warn = new THREE.Mesh(warnGeo, new THREE.MeshBasicMaterial({
      color: 0xff3355, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
    const il = Math.hypot(d.x, d.z);
    const ix = -d.x / il, iz = -d.z / il;         // inward unit vector
    warn.position.set(d.x + ix * 2.1, 0.03, d.z + iz * 2.1);
    warn.rotation.y = Math.atan2(-iz, ix);        // point the chevron inward
    scene.add(warn);
    smashDoorFX.push({ group: g, glow, warn });
  }
}
function clearSmashDoors() {
  for (const { group, warn } of smashDoorFX) {
    scene.remove(group);
    for (const c of group.children) { c.geometry.dispose(); c.material.dispose(); }
    if (warn) { scene.remove(warn); warn.geometry.dispose(); warn.material.dispose(); }
  }
  smashDoorFX = [];
}
function updateSmashDoors() {
  if (!smashDoorFX.length) return;
  // v135: telegraph window widened 0.9 → 1.4 s so there's time to react.
  const soon = [false, false, false, false];
  for (const s of pendingSpawns) {
    if (s.door == null) continue;
    const eta = s.delay - waveTimer;
    if (eta >= -0.15 && eta <= 1.4) soon[s.door] = true;
  }
  const pulse = 0.55 + 0.25 * Math.sin(performance.now() * 0.022);
  const warnPulse = 0.5 + 0.4 * Math.abs(Math.sin(performance.now() * 0.012));
  for (let i = 0; i < 4; i++) {
    const { glow, warn } = smashDoorFX[i];
    let target = 0.10, color = 0xff3366;
    if (exitPhase) {
      // Cleared room: EXIT doors glow inviting green; the rest go dark.
      const isExit = exitDoors.some(ed => ed.door === i);
      color  = isExit ? 0x33ff88 : 0xff3366;
      target = isExit ? pulse : 0.04;
    } else if (soon[i]) {
      target = pulse;  // spawn telegraph: this wall is about to pour
    }
    glow.material.color.setHex(color);
    glow.material.opacity += (target - glow.material.opacity) * 0.25;
    // Floor chevron (v135): pulses hard while its door is telegraphing,
    // breathes toward the room center; hidden during the exit walk.
    const wTarget = (!exitPhase && soon[i]) ? warnPulse : 0;
    warn.material.opacity += (wTarget - warn.material.opacity) * 0.3;
    warn.scale.setScalar(1 + 0.25 * Math.abs(Math.sin(performance.now() * 0.012)));
  }
}

function clearFX() {
  clearSmashDoors();
  waveIntroT = 0;
  roomTallyT = 0;
  roomFadeT  = 0;
  _roomSwap  = false;
  exitPhase  = false;
  exitDoors  = [];
  chunkPool.clear();
  gooChunkPool.clear();
  bubblePool.clear();
  trailPool.clear();
  for (const p of puddles)       p.remove(scene); puddles       = [];
  for (const z of poisonZones)   z.remove(scene); poisonZones   = [];
  for (const s of slimeTrails)   s.remove(scene); slimeTrails   = [];
  for (const r of sludgeRibbons) r.remove(scene); sludgeRibbons = [];
  for (const f of foamZones)    f.remove(scene); foamZones     = [];
  for (const r of screamRings)  r.remove(scene); screamRings   = [];
  clearBounty();
  for (const g of gates)        g.remove(scene); gates         = [];
  for (const p of powerups)     p.remove(scene); powerups      = [];
  clearBossAuras();
  damageNumbers = [];
  if (cargoCluster) { cargoCluster.remove(scene); cargoCluster = null; }
  clusterTimer = 0; clusterSpawnAt = [];
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
  // SMASH TV (v109): everything enters through 4 "doors" at the edge midpoints
  // (the spawn projection maps angle 0/π to the side walls, ±π/2 to top/bottom),
  // so waves pour in like arena-show contestants instead of surrounding evenly.
  const DOORS = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  // Shooters (v116) get maximally separated entry angles so their fire lanes
  // cross the arena from different sides — positioning problems, not spam.
  const nShoot = list.reduce((n, e) => n + (e.shooter ? 1 : 0), 0);
  const shooterBase = rng() * Math.PI * 2;
  list.forEach((entry, i) => {
    const cnt       = entry.count || 1;
    const baseAngle = smashMode
      ? DOORS[(entry.door ?? i) % 4] + (rng() - 0.5) * 0.24
      : entry.shooter
        ? shooterBase + entry.slot * (Math.PI * 2 / Math.max(1, nShoot))
        : (i / total) * Math.PI * 2;
    const isGroup   = cnt >= 3;  // 3+ = a coordinated group; 2 = twins (stay paired)
    for (let k = 0; k < cnt; k++) {
      let angle = baseAngle, clusterOffset = null;
      if (isGroup) {
        // Fan members across a wide arc so the group arrives on a broad front and
        // pincers the player from several directions — not a single dodge-able
        // clump. SMASH TV keeps the group tight so it pours out of ONE door.
        const SPREAD = smashMode ? 0.5 : 1.5; // radians (~29° vs ~86°)
        angle = baseAngle + (k / (cnt - 1) - 0.5) * SPREAD;
      } else {
        clusterOffset = k > 0 ? { x: (rng()-0.5)*3, z: (rng()-0.5)*3 } : null;
      }
      pendingSpawns.push({
        type: entry.type,
        delay: entry.t + (isGroup ? k * 0.12 : 0),     // light stagger → rolling advance
        angle,
        door: entry.door,                               // SMASH TV: which wall door (telegraph FX)
        shooter: entry.shooter || false,                // v120: entrance ping on tactical shooters
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
  // Schedule cargo convoys (start mid-wave, seeded position). SMASH TV runs a
  // second prize convoy per wave — big money, big prizes.
  const kind = (smashMode && smashRoomKind) ? smashRoomKind : waveKind(wave);
  // Secondary objectives (v133): an unclaimed bounty dies with its wave; every
  // 3rd wave (from 4, never boss waves) arms a new one for the spawn drain to
  // mark. CLEANSE foam appears every 4th wave from 6 — seeded, so daily runs
  // get identical placements.
  clearBounty();
  bountyArm = wave >= 4 && wave % 3 === 1 && kind !== 'boss';
  if (wave >= 6 && wave % 4 === 2) {
    foamZones.push(new FoamZone(scene,
      (rng() * 2 - 1) * (HALF_X - 4), (rng() * 2 - 1) * (HALF_Z - 4)));
  }
  clusterTimer = 0;
  clusterSpawnAt = [3 + rng() * 5]; // 3-8 s into the wave — always overlaps live enemies
  if (smashMode) clusterSpawnAt.push(12 + rng() * 5);
  if (smashMode && kind === 'prize') clusterSpawnAt.push(7 + rng() * 3); // PRIZE room: 3rd convoy

  // SMASH TV valuables (v116): cash piles and the odd big prize scattered on
  // the room floor — walk over them. Rarely, a score-multiplier orb glitters
  // among them. Cleared with the room (spawnWave wipes powerups).
  if (smashMode) {
    const heavy = kind === 'spike';                     // v120: HEAVY rooms pay 2×$
    const n = 3 + Math.floor(rng() * 4) + (heavy ? 1 : 0);
    for (let i = 0; i < n; i++) {
      let vx = (rng() * 2 - 1) * (HALF_X - 3);
      let vz = (rng() * 2 - 1) * (HALF_Z - 3);
      const roll = rng();
      const isPrizeItem = roll <= 0.96 && roll > 0.82;
      if (isPrizeItem) {
        // Greed placement (v120): big prizes sit NEAR a door — the walls that
        // pour enemies. Grabbing the golden gift box is a risk you choose.
        const [gx, gz] = smashDoorPos(Math.floor(rng() * 4));
        vx = gx * 0.8 + (rng() - 0.5) * 3;
        vz = gz * 0.8 + (rng() - 0.5) * 3;
      }
      const pu = new Powerup(scene, vx, vz, roll > 0.96 ? 'scoremult' : 'score');
      pu._life = 999;  // floor loot lasts the whole room
      if (pu._type === 'score') {
        pu.mesh.geometry.dispose();  // v129: the swapped-out sphere leaked
        if (isPrizeItem) {
          // Big prize — a TV, a toaster, a golden duck. Gift-box mesh, worth more.
          pu._value = (1000 + wave * 50) * (heavy ? 2 : 1);
          pu.mesh.geometry = PRIZE_GEO;
          pu.mat.color.setHex(0xffcc33);
          pu.mesh.scale.setScalar(1.25);
        } else {
          pu._value = (150 + wave * 10) * (heavy ? 2 : 1);  // everyday cash pile
          pu.mesh.geometry = CASH_GEO;
          pu.mat.color.setHex(0x99ee66);
        }
      }
      powerups.push(pu);
    }
  }

  // Wave-start banner (v114 SMASH / v123 classic): name the incoming pressure.
  if (smashMode) {
    // SMASH TV: game-show room intro card, named + colored by room kind.
    waveIntroT     = waveIntroDur = 1.5;
    waveIntroText  = kind === 'normal' ? `WAVE ${wave}` : `WAVE ${wave} — ${ROOM_KINDS[kind].label}`;
    waveIntroColor = ROOM_KINDS[kind]?.color ?? '#ffdd44';
    clusterSpawnAt.sort((a, b) => a - b);
    // Enter the new room through the opposing wall from the exit just taken:
    // spawn at that door's mouth, step in with a moment of mercy.
    if (_entryDoor != null) {
      const ex = Math.cos(DOORS[_entryDoor]) * (HALF_X - PLAYER_RADIUS * 2);
      const ez = Math.sin(DOORS[_entryDoor]) * (HALF_Z - PLAYER_RADIUS * 2);
      player.mesh.position.set(ex, PLAYER_RADIUS, ez);
      player.grantInvincibility(1.2);
      _entryDoor = null;
    }
  } else {
    // Classic: color-coded wave banner naming the rhythm (v123).
    const b = WAVE_BANNER[kind] ?? WAVE_BANNER.normal;
    waveIntroT     = waveIntroDur = kind === 'boss' ? 2.0 : 1.4;  // boss lingers a beat longer
    waveIntroText  = `WAVE ${wave}${b.suffix}`;
    waveIntroColor = b.color;
  }
  // Boss klaxon (v123): a real audio cue for the boss wave in BOTH modes, even
  // with the spoken announcer off — you always get the "here comes the boss" beat.
  if (kind === 'boss') audio.bossHorn();
  audio.announce(kind === 'boss' ? 'boss' : 'wave', wave);
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
    btn.dataset.ui = '1';
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
  overlay.style.pointerEvents = '';  // back to CSS default (none) for gameplay HUD
  document.getElementById('upgrade-panel')?.remove();
  input.reset();
  // Re-derive from the live viewport at run start — the run then keeps this
  // arena even if the device rotates mid-fight (no mid-run bound swaps).
  landscapeMode = innerWidth > innerHeight;
  applyArenaMode(landscapeMode);
  score  = 0; streak = 0; wave = 0; runTimer = 0; scoreMultT = 0; waveClearFlashT = 0; waveGapT = 0;
  milestoneT = 0; nextMilestone = 25000; grazeCount = 0; shieldBlockCount = 0;
  collectedUpgrades = []; hitEventLog = []; _lastHitTime = -1; _lbPosted = false;
  scheduleTutorialHints();
  BULLET_CONFIG.playerBulletScale  = 1.0;
  BULLET_CONFIG.playerPiercing     = false;
  BULLET_CONFIG.playerWeaponPierce = false;
  if (dailyMode && !testMode) {   // a test run is never a daily (v142)
    // Same seed for everyone today: hash the UTC date through the PRNG once
    // so consecutive days land far apart in seed space.
    _dailyRun = new Date().toISOString().slice(0, 10);
    runSeed = (mulberry32(Number(_dailyRun.replaceAll('-', '')))() * 0xFFFFFF | 0) >>> 0;
  } else {
    _dailyRun = null;
    runSeed = (Math.random() * 0xFFFFFF | 0) >>> 0;
  }
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
  // SMASH TV room lattice: every run starts a fresh studio floor at (0,0).
  roomX = 0; roomY = 0;
  visitedRooms = new Set(['0,0']);
  smashRoomKind = null;
  _entryDoor = null; _cameFromDoor = null;
  buildSmashDoors();  // no-op unless SMASH TV mode is on
  _titleIntroPlayed = false;  // v121: arm the recorded intro for the next title visit
  audio.announce('start');
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
  _runBests = testMode ? {} : recordRun();   // test runs leave no records (v142)
  hiScore = pb.bestScore;
  addShake(0.9);
  audio.playerDie();
  audio.announce('gameover');
  showGameOver();
}

// ── Input wiring ────────────────────────────────────────────────────────────────
// ── Gamepad menu navigation (v134) ───────────────────────────────────────────
// Every DOM menu (title chips, death-screen feedback, pause/OPTIONS panel,
// run history, upgrade cards) becomes stick/d-pad navigable: move focus with
// d-pad or left stick, A activates, B backs out. Focus is drawn as a gold
// outline. The layer self-gates on menu states and only reacts to a real pad,
// so mouse/touch behavior is untouched.
const NAV_STATES = new Set(['title', 'gameover', 'paused', 'options', 'runhistory', 'upgrade']);
const NAV_SEL = '[data-ui], .fb-chip, .fb-btn, .dit, #dsgn button, #dsgn input[type=range]';
let navEl = null, _navPrevOutline = '', _navPrevOffset = '';
let _navDirHeld = false, _navRepeatT = 0, _navPrevA = false, _navPrevB = false;

function navVisible(el) {
  if (!el.isConnected) return false;
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight;
}
function navTargets() { return [...document.querySelectorAll(NAV_SEL)].filter(navVisible); }
function navClear() {
  if (navEl) { navEl.style.outline = _navPrevOutline; navEl.style.outlineOffset = _navPrevOffset; }
  navEl = null;
}
function navSet(el) {
  navClear();
  navEl = el;
  _navPrevOutline = el.style.outline;
  _navPrevOffset  = el.style.outlineOffset;
  el.style.outline = '3px solid #ffdd44';
  el.style.outlineOffset = '2px';
  el.scrollIntoView?.({ block: 'nearest' });
}
// Geometric focus move: nearest element whose center lies in the pressed
// direction, penalizing sideways drift — robust across every panel layout.
function navMove(dx, dy) {
  const els = navTargets();
  if (!els.length) { navClear(); return; }
  if (!navEl || !els.includes(navEl)) { navSet(els[0]); return; }
  const r0 = navEl.getBoundingClientRect();
  const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of els) {
    if (el === navEl) continue;
    const r = el.getBoundingClientRect();
    const vx = r.left + r.width / 2 - cx, vy = r.top + r.height / 2 - cy;
    const along = vx * dx + vy * dy;
    if (along < 4) continue;
    const score = along + (Math.abs(vx * dy) + Math.abs(vy * dx)) * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) navSet(best);
}
function navActivate() {
  const el = navEl;
  if (!el) return;
  // Non-bubbling on purpose: handlers sit on the elements themselves, and a
  // bubbled synthetic tap must never reach the window tap-to-start handler.
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: false, cancelable: true }));
  el.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: true }));
  // Chip handlers rewrite style.cssText (selection styling), wiping the focus
  // outline — re-apply if the element survived the activation.
  if (el.isConnected && navVisible(el)) navSet(el); else navClear();
}
function navBack() {
  if (gameState === 'paused')  { gameState = 'playing'; designer.hide(); navClear(); }
  else if (gameState === 'options') { gameState = 'title'; designer.hide(); navClear(); }
  else if (gameState === 'runhistory') {
    // the CLOSE button listens to pointerdown, not click
    document.getElementById('rh-close')
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: false }));
    navClear();
  }
  else if (gameState === 'gameover') returnToTitle();
  else if (gameState === 'title') navClear();  // unfocus → A starts the run again
}
function updateMenuNav(dt) {
  if (!NAV_STATES.has(gameState)) { if (navEl) navClear(); return; }
  if (!navigator.getGamepads) return;
  let pad = null;
  for (const p of navigator.getGamepads()) { if (p) { pad = p; break; } }
  if (!pad) return;
  const lx = pad.axes[0] || 0, ly = pad.axes[1] || 0;
  const dirX = (pad.buttons[15]?.pressed || lx >  0.55) ? 1 : (pad.buttons[14]?.pressed || lx < -0.55) ? -1 : 0;
  const dirY = (pad.buttons[13]?.pressed || ly >  0.55) ? 1 : (pad.buttons[12]?.pressed || ly < -0.55) ? -1 : 0;
  const a = !!pad.buttons[0]?.pressed;
  const b = !!pad.buttons[1]?.pressed;
  if (dirX || dirY || a || b) input.usingGamepad = true;

  _navRepeatT -= dt;
  if (dirX || dirY) {
    if (!_navDirHeld || _navRepeatT <= 0) {
      _navRepeatT = _navDirHeld ? 0.14 : 0.38;  // initial delay, then key-repeat
      if (navEl?.tagName === 'INPUT' && navEl.type === 'range' && dirX && !dirY) {
        // Focused slider: left/right adjusts instead of moving focus.
        const step = parseFloat(navEl.step) || 1;
        navEl.value = Math.min(parseFloat(navEl.max),
          Math.max(parseFloat(navEl.min), parseFloat(navEl.value) + step * dirX));
        navEl.dispatchEvent(new Event('input'));
      } else {
        navMove(dirX, dirY);
      }
    }
    _navDirHeld = true;
  } else { _navDirHeld = false; _navRepeatT = 0; }

  if (a && !_navPrevA && navEl && navVisible(navEl)) navActivate();
  _navPrevA = a;
  if (b && !_navPrevB) navBack();
  _navPrevB = b;
}

input.onDash  = () => {
  if (gameState === 'playing') {
    const move = input.getMoveDir();
    const dir = { x: move.x, z: move.z, valid: move.x !== 0 || move.z !== 0 };
    player.dash(dir);
  } else if (gameState === 'title' && !navEl) {
    startGame();  // A / bumper / trigger starts from the title — unless the
                  // pad is focused on a menu chip (then A activates the chip)
  }
};
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused';  designer.show(); }
  else if (gameState === 'paused')  { gameState = 'playing'; designer.hide(); }
  else if (gameState === 'options') { gameState = 'title';   designer.hide(); }
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
// Tap anywhere (outside interactive [data-ui] elements) starts from title on
// mobile. The overlay itself is pointer-events:auto on the title (v106) so it
// can scroll on short screens — so the guard must (a) key off [data-ui], not
// the whole overlay, and (b) tell a scroll drag apart from a tap by distance.
let _tapX = 0, _tapY = 0;
window.addEventListener('touchstart', (e) => {
  _tapX = e.touches[0]?.clientX ?? 0;
  _tapY = e.touches[0]?.clientY ?? 0;
});
window.addEventListener('touchend', (e) => {
  if (gameState !== 'title') return;
  // Ignore taps that landed on interactive elements (toggles, chips, links)
  if (e.target?.closest?.('[data-ui]')) return;
  const tp = e.changedTouches?.[0];
  if (tp && Math.hypot(tp.clientX - _tapX, tp.clientY - _tapY) > 12) return;  // scroll, not tap
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

// Auto perf-mode (v129, roadmap M2 sweep): if the player has NEVER touched the
// PERFORMANCE toggle and mid-run FPS stays low, flip it on for them once and
// persist — the toggle in OPTIONS reverses it (and any explicit choice, on or
// off, ends the auto behavior for good since the key then exists).
let _autoPerfLowT = 0;
let _autoPerfDone = localStorage.getItem('tokoDropPerf') !== null;

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const raw = (now - prev) / 1000;            // unclamped, for the FPS meter
  const dt  = Math.min(raw, 0.05);
  prev = now;
  // Frames longer than 250 ms are tab-switches/hidden throttling, not game
  // perf — feeding them to the EMA would poison the meter (and could false-
  // trigger auto perf-mode) for seconds after coming back.
  if (raw > 0 && raw < 0.25) fpsEMA = fpsEMA ? fpsEMA * 0.9 + (1 / raw) * 0.1 : 1 / raw;

  if (!_autoPerfDone && gameState === 'playing' && raw > 0 && raw < 0.25) {
    _autoPerfLowT = (fpsEMA && fpsEMA < 42) ? _autoPerfLowT + raw : 0;
    if (_autoPerfLowT > 6 && runTimer > 5) {   // sustained, and past load jank
      _autoPerfDone = true;
      perfMode = true;
      localStorage.setItem('tokoDropPerf', '1');
      applyPerfMode();
      milestoneT = 1.2; milestoneText = 'PERF MODE AUTO-ON — SEE OPTIONS';
    }
  }

  input.pollGamepad();
  updateMenuNav(dt);   // gamepad menu focus (v134) — self-gates on menu states
  updateShake(dt);

  // Title / paused / options / run-history — just render the scene, no game logic
  if (gameState === 'title' || gameState === 'paused' || gameState === 'upgrade' ||
      gameState === 'runhistory' || gameState === 'options') {
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
    bubblePool.update(dt);
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
    // SMASH TV: spawn right at the doorway mouth so enemies visibly step THROUGH
    // the door frame into the room, instead of materialising inside it.
    const edge = smashMode ? 0.99 : 0.85;
    const bx = Math.cos(s.angle) * HALF_X * edge;
    const bz = Math.sin(s.angle) * HALF_Z * edge;
    const ox = s.clusterOffset ? s.clusterOffset.x : 0;
    const oz = s.clusterOffset ? s.clusterOffset.z : 0;
    const en = new Enemy(scene, s.type, bx + ox, bz + oz, s.speedMult, s.intervalMult);
    // v120: shooters are the tactical objects (v116) — announce their entrance
    // with a brief "!" ping + alert blip so the player can start prioritising.
    // v124: WARDENs get the same treatment; the shield-bearer IS a priority call.
    if (s.shooter || s.type === EnemyType.WARDEN || s.type === EnemyType.SIREN ||
        s.type === EnemyType.MAGNA) {
      en._pingT = 1.6;
      audio.shooterPing();
    }
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
    // BOUNTY mark (v133): the first non-boss arrival of an armed wave carries
    // the gold ring — 8 s on the clock from the moment it steps in.
    if (bountyArm && !s.boss) {
      bountyArm = false;
      bountyEnemy = en;
      bountyT = 8;
      bountyRing.visible = true;
      en._pingT = Math.max(en._pingT || 0, 1.6);
      audio.shooterPing();
      audio.announce('bounty');
    }
    enemies.push(en);
  }

  player.update(dt, moveDir, aimDir, bullets, HALF_X, HALF_Z);

  // MAGNA pull (v144): every living magna within reach drags the player
  // toward it. Dashing grants ~1.2 s of immunity (momentum breaks the hold),
  // total pull is capped, and the tether visual mirrors exactly this state.
  if (player.alive) {
    if (player.dashing) magnaImmuneT = 1.2;
    else if (magnaImmuneT > 0) magnaImmuneT -= dt;
    let pullX = 0, pullZ = 0;
    for (const e of enemies) {
      if (!e.alive || e.type !== EnemyType.MAGNA) continue;
      const mx = e.position.x - player.position.x;
      const mz = e.position.z - player.position.z;
      const md = Math.hypot(mx, mz);
      const held = magnaImmuneT <= 0 && md < MAGNA_REACH && md > 1.2;
      e._pullActive = held;
      if (held) { pullX += (mx / md) * MAGNA_PULL; pullZ += (mz / md) * MAGNA_PULL; }
    }
    const pl = Math.hypot(pullX, pullZ);
    if (pl > 2.0) { pullX *= 2.0 / pl; pullZ *= 2.0 / pl; }  // stacked magnas cap out
    if (pl > 0) {
      player.mesh.position.x = Math.max(-HALF_X + PLAYER_RADIUS,
        Math.min(HALF_X - PLAYER_RADIUS, player.mesh.position.x + pullX * dt));
      player.mesh.position.z = Math.max(-HALF_Z + PLAYER_RADIUS,
        Math.min(HALF_Z - PLAYER_RADIUS, player.mesh.position.z + pullZ * dt));
    }
  }

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

  for (const e of enemies) {
    e.update(dt, player.position, bullets, HALF_X, HALF_Z);
    if (e._screamReady) {        // SIREN scream (v141): surge the pack
      e._screamReady = false;
      for (const w of enemies) {
        if (!w.alive || w === e || w._isBoss || w.type === EnemyType.SIREN) continue;
        if (Math.hypot(w.position.x - e.position.x, w.position.z - e.position.z) < SIREN_RADIUS) {
          w._surgeT = 3;
        }
      }
      screamRings.push(new ScreamRing(scene, e.position.x, e.position.z));
      audio.sirenScream();
    }
    if (e._phaseJustChanged) {   // boss act change (v136): sound + popup
      e._phaseJustChanged = false;
      milestoneT = 1.1; milestoneText = `BOSS PHASE ${e._bossPhase}!`;
      addShake(0.3);
      audio.phaseShift();
    }
    e.updateDeath(dt);
    if (e._pingT > 0) e._pingT -= dt;
  }

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
  bubblePool.update(dt);
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
  for (let i = foamZones.length - 1; i >= 0; i--) {
    if (!foamZones[i].update(dt)) { foamZones[i].remove(scene); foamZones.splice(i, 1); }
  }
  for (let i = screamRings.length - 1; i >= 0; i--) {
    if (!screamRings[i].update(dt)) { screamRings[i].remove(scene); screamRings.splice(i, 1); }
  }

  // BOUNTY tick (v133): the ring shadows its target; the window closing
  // un-marks the enemy without ceremony — it's just an enemy again.
  if (bountyEnemy) {
    if (!bountyEnemy.alive || (bountyT -= dt) <= 0) {
      clearBounty();
    } else {
      bountyRing.position.set(bountyEnemy.position.x, 0.05, bountyEnemy.position.z);
      bountyRing.scale.setScalar(Math.max(0.8, bountyEnemy.radius) *
        (1 + 0.1 * Math.sin(performance.now() * 0.012)));
      bountyRing.material.opacity = 0.45 + 0.35 * Math.abs(Math.sin(performance.now() * 0.008));
    }
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

  // BOTFLY homing launch chirp (v108) — the shot was silent, so the first
  // warning a player got was the projectile already on their tail.
  for (const e of enemies) {
    if (!e._shotReady) continue;
    e._shotReady = false;
    audio.botShot();
  }

  // Motion-trail afterimages — pooled ghost spheres, per-type size signature (v36)
  for (const e of enemies) {
    if (!e._motionTrailReady) continue;
    e._motionTrailReady = false;
    // Spawn one body-radius behind the mover along its velocity (v100) — at
    // the mover's own position the ghost was hidden inside/under the body.
    const p  = e.position;
    const vs = Math.hypot(e._velX, e._velZ) || 1;
    trailPool.spawn(
      p.x - (e._velX / vs) * e.radius * 1.1,
      e.fxY,
      p.z - (e._velZ / vs) * e.radius * 1.1,
      e.color, e.radius * e._trailMult);
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
      audio.lobSplash();  // v108: the splashdown was silent
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
  if (waveIntroT   > 0) waveIntroT   -= dt;
  if (milestoneT   > 0) milestoneT   -= dt;
  // Score milestone (v124): every 25k, a popup + sparkle — score is checked
  // here once per frame so every scoring path (kills, loot, bonuses) counts.
  if (score >= nextMilestone) {
    milestoneT = 1.2;
    milestoneText = `${nextMilestone.toLocaleString('en-US')}!`;
    nextMilestone += 25000;
    audio.milestone();
  }
  if (roomTallyT   > 0) roomTallyT   -= dt;
  updateSmashDoors();

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
        // BULWARK plate (v140): shots landing on the FRONT arc (~±60° of its
        // facing) are shrugged off — flank it. Blocks even piercing shots;
        // rides the same shieldBlocks telemetry as the warden.
        if (e.type === EnemyType.BULWARK && e._faceX !== undefined) {
          const hx = b.mesh.position.x - e.position.x;
          const hz = b.mesh.position.z - e.position.z;
          const hl = Math.hypot(hx, hz) || 1;
          if ((hx / hl) * e._faceX + (hz / hl) * e._faceZ > 0.5) {
            bullets.recycleAt(i);
            hit = true;
            shieldBlockCount++;
            audio.plateTink();
            for (let j = 0; j < 3; j++) {
              const a2 = Math.atan2(hz, hx) + (Math.random() - 0.5) * 1.6;
              gooChunkPool.spawn(b.mesh.position.x, e.fxY + 0.15, b.mesh.position.z,
                Math.cos(a2) * 4, 2 + Math.random() * 2, Math.sin(a2) * 4, 0xc7d4f2, 0.08);
            }
            break;
          }
        }
        // WARDEN shield (v124): enemies inside a living warden's aura shrug
        // bullets off — kill the warden first. Wardens never shield each other
        // or themselves, so the priority target is always killable.
        if (e.type !== EnemyType.WARDEN && enemies.some(w =>
              w.alive && w.type === EnemyType.WARDEN &&
              Math.hypot(w.position.x - e.position.x, w.position.z - e.position.z) < WARDEN_AURA)) {
          bullets.recycleAt(i);   // shields stop even piercing shots
          hit = true;
          shieldBlockCount++;
          audio.shieldTink();
          // cyan deflection spark so "no damage" reads as SHIELDED, not a whiff
          for (let j = 0; j < 3; j++) {
            const a = Math.atan2(dz, dx) + (Math.random() - 0.5) * 1.6;
            gooChunkPool.spawn(b.mesh.position.x, e.fxY + 0.15, b.mesh.position.z,
              Math.cos(a) * 4, 2 + Math.random() * 2, Math.sin(a) * 4, 0x33ffdd, 0.08);
          }
          break;
        }
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
            // score-multiplier orb. SMASH TV leans harder into prizes, and
            // PRIZE$ rooms (v120) are loot-rich but firepower-poor: pods are
            // rare there — the trade for the lighter wave and extra convoys.
            const roll = Math.random();
            const rk = smashMode ? (smashRoomKind || waveKind(wave)) : null;
            // [pod, score] bands; the rest is scoremult. prize 20/45/35,
            // smash 40/30/30 (v116), classic 55/25/20 (v89).
            const [podC, scoreC] = rk === 'prize' ? [0.20, 0.45]
                                 : smashMode      ? [0.40, 0.30] : [0.55, 0.25];
            const dropType = roll < podC ? randomWeaponPodId(lv2Ok)
                           : roll < podC + scoreC ? 'score' : 'scoremult';
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

  // Collision: enemy bullets → player (+ GRAZE, v125)
  if (!player.invincible) {
    for (let i = bullets.active.length - 1; i >= 0; i--) {
      const b = bullets.active[i];
      if (b.isPlayer) continue;
      const dx = b.mesh.position.x - player.position.x;
      const dz = b.mesh.position.z - player.position.z;
      const br = b.fat ? FAT_BULLET_R : BULLET_R;
      const d  = Math.hypot(dx, dz);
      if (d < br + PLAYER_RADIUS) {
        const _origin = b.originType; // capture before recycle clears it
        bullets.recycleAt(i);
        if (tryHitPlayer('bullet', _origin)) { triggerGameOver(); break; }
        break;
      }
      // GRAZE (v125): a bullet skimming past while you're VULNERABLE pays
      // score — weaving through fire is worth points, dashing through (i-frames)
      // is not, so the reward tracks real risk. Once per bullet.
      if (!b._grazed && d < br + PLAYER_RADIUS + 0.55) {
        b._grazed = true;
        grazeCount++;
        score += 25 * (scoreMultT > 0 ? 2 : 1);
        audio.grazeTick();
        gooChunkPool.spawn(b.mesh.position.x, 0.5, b.mesh.position.z,
          -dx * 3, 2.5, -dz * 3, 0xffffff, 0.06);
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
  if (!cargoCluster && clusterSpawnAt.length > 0) {
    clusterTimer += dt;
    if (clusterTimer >= clusterSpawnAt[0]) {
      cargoCluster = new CargoCluster(scene);
      clusterSpawnAt.shift();
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
          if (!gateUsed) { gateUsed = true; localStorage.setItem('tokoDropGateUsed', '1'); }
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
        audio.announce('prize');
      } else if (pu._type === 'invincible') {
        player.grantInvincibility(3.0);
      } else if (pu._type === 'hp') {
        player.hp = Math.min(player.maxHp, player.hp + 1);
      } else if (pu._type === 'firerate') {
        player.grantFireRateBoost(8.0);
      } else if (pu._type === 'score') {
        // Instant score nugget (v89) — worth more in later waves, doubled by
        // an active Score Multiplier. Floor valuables (v116) carry their own
        // value: small cash piles, big prizes.
        const gained = (pu._value ?? (250 + wave * 25)) * (scoreMultT > 0 ? 2 : 1);
        score += gained;
        damageNumbers.push(new DamageNumber(pu.x, 1.2, pu.z, `+${gained}`, '255,221,68'));
        audio.announce('money');
      } else if (pu._type === 'scoremult') {
        scoreMultT = 10.0;
        damageNumbers.push(new DamageNumber(pu.x, 1.2, pu.z, 'x2!', '255,170,255'));
        audio.announce('mult');
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
      const dx = player.position.x - z.x;
      const dz = player.position.z - z.z;
      if (Math.hypot(dx, dz) < z.radius + PLAYER_RADIUS) {
        if (tryHitPlayer('poison', EnemyType.SLUDGE_CUBE)) { triggerGameOver(); break; }
        break;
      }
    }
  }

  // Wave breather tick (v136): when it runs out, the next wave rolls in.
  if (waveGapT > 0 && gameState === 'playing') {
    waveGapT -= dt;
    if (waveGapT <= 0) spawnWave();
  }

  // All living enemies dead → end wave immediately; flush any queued spawns.
  // SMASH TV: the room isn't cleared while door bursts are still queued — the
  // doors keep pouring (clearing between pulses just buys a breather).
  if (gameState === 'playing' && !exitPhase && waveGapT <= 0 &&
      enemies.length > 0 &&
      enemies.every(e => !e.alive && !e._dying) &&
      (!smashMode || pendingSpawns.length === 0)) {
    pendingSpawns = [];
    score += wave * 500;
    waveClearFlashT = 0.4;
    audio.waveClear();
    if (smashMode) {
      // SMASH TV (v115): the room doesn't chain straight into the next wave —
      // EXIT doors open, the tally card shows, the minimap comes up, and the
      // player WALKS OUT through a door of their choosing.
      exitPhase  = true;
      exitDoors  = pickSmashExits();
      roomTallyT = 2.2;
      audio.applause();
      audio.announce('exit');
    } else {
      audio.announce('clear');
      // Roguelike pacing (v101): a card every 3rd cleared wave — every wave was
      // way too frequent with instant wave-ends chaining fast.
      if (roguelikeMode && wave % 3 === 0) showUpgradeCards();
      else {
        // v136: breather — a beat to exhale and grab leftover drops instead of
        // the next wave slamming in on the same frame. Non-interrupting: play
        // continues, nothing to click; the CLEAR banner bridges the gap.
        waveGapT = 1.5;
        waveIntroT = waveIntroDur = 1.0;
        waveIntroText  = `WAVE ${wave} CLEAR`;
        waveIntroColor = '#66ffcc';
      }
    }
  }

  // SMASH TV exit walk: touching an open EXIT door commits the choice — next
  // room's kind is what the door advertised, entered from the opposing wall.
  // The swap happens under a quick black dip (v120) so traversal reads as
  // walking THROUGH the door, not a teleport. (Upgrade-card rooms skip the
  // fade — the card panel is its own transition.)
  if (exitPhase && gameState === 'playing') {
    for (const ed of exitDoors) {
      const [dx, dz] = smashDoorPos(ed.door);
      if (Math.hypot(player.position.x - dx, player.position.z - dz) < 2.2) {
        exitPhase = false; roomTallyT = 0;
        roomX += DOOR_DX[ed.door]; roomY += DOOR_DY[ed.door];
        visitedRooms.add(`${roomX},${roomY}`);
        smashRoomKind = ed.kind;
        _entryDoor    = (ed.door + 2) % 4;
        _cameFromDoor = _entryDoor;
        if (roguelikeMode && wave % 3 === 0) {
          showUpgradeCards();
        } else {
          roomFadeT = 0.55;      // fade in… (swap fires at the 0.3 peak below)
          _roomSwap = true;
        }
        break;
      }
    }
  }
  if (roomFadeT > 0) {
    roomFadeT -= dt;
    if (_roomSwap && roomFadeT <= 0.3) {
      _roomSwap = false;
      spawnWave();               // …swap behind the black, then fade back out
    }
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
  syncAutoOrientation();  // rotation on the title re-picks the arena preset
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

// ── Offline PWA (v128, roadmap M2) ───────────────────────────────────────────
// Register after load so it never competes with game boot. The SW caches the
// ?v=-tokened module graph cache-first (immutable per release; the registration
// URL's own token rotates each release, updating the worker). Silently absent
// on unsupported/file: contexts — the game runs identically without it.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=98').catch(() => {});
  });
}
