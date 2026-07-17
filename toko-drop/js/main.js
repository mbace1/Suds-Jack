import * as THREE from 'three';
import { InputManager } from './input.js?v=134';
import { BulletPool, BULLET_R, FAT_BULLET_R, BULLET_CONFIG } from './bullet.js?v=134';
import { Player, PLAYER_RADIUS } from './player.js?v=134';
import { Enemy, EnemyType, GOO_TIME, makeSatinMat, applySatinValues, WARDEN_AURA,
         CABINET_STYLE, VIS } from './enemy.js?v=134';
import { RetroPass } from './retro.js?v=134';
import { audio } from './audio.js?v=134';
import { initDesigner } from './designer.js?v=134';
import { t, getLang, setLang, langs } from './lang.js?v=134';
import { TUNING } from './tuning.js?v=134';

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
// v162 (user direction — mode structure taxonomy): SCROLLING-ARENA cabinets
// (gaundrop / loadout / kaikki, like their references) play in a world
// arenaScale× bigger than the screen; the camera follows the player and the
// cabinet fog makes the world OPEN UP as you walk toward the edge.
// Room-traversal (smash / binding) and fixed-single-screen (tokotron /
// classic) modes keep arenaScale = 1.
let arenaScale  = 1;
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
          YELA_CUBE, ORANGE_CUBE, SLUDGE_CUBE, REDD_CUBE, PURP_CUBE, TORO, BAMBU, PYRA, OMEGA, BOTFLY, WARDEN, BULWARK, SIREN, CLOAKER, MAGNA, DRAPER, PRISM } = EnemyType;
  const AFFIXES = ['volatile', 'swift', 'anchored'];
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
    [DRAPER,      7, 5],  // v171: wall-weaver — looms marching bullet curtains
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
  // v178: each SMASH floor raises the stakes on top of the show's +40%
  if (smashMode) budget = Math.floor(budget * 1.4 * (1 + 0.12 * Math.max(0, smashFloor - 1)));
  // TEST MODE (v142): early waves get a wave-8-sized budget floor so the
  // expensive late types (WARDEN 5, SIREN 5…) actually fit from wave 1.
  if (testMode) budget = Math.max(budget, 24);
  // v179: RICH DAY — bigger crowds pay for the bigger loot
  if (dailyMod === 'rich') budget = Math.floor(budget * 1.4);

  // Composed waves (v116): melee mobs FLOOD the arena (groups/twins — the
  // fodder you mow through), while ranged enemies are placed DELIBERATELY —
  // few of them, capped, spread apart in arrival time and position so each
  // shooter is a tactical problem to prioritise, not part of the noise.
  const SHOOTERS  = new Set([SPITTOR, FANNER, WEEVA, ORANGE_CUBE, PURP_CUBE, BAMBU, PYRA, BOTFLY, CLOAKER, DRAPER]);
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
    // v174: the headliner ALTERNATES per boss cycle — OMEGA's lone crystal or
    // the TWIN PRISMS pair (two half-size shards trading volleys; the survivor
    // enrages instantly). The run seed picks who opens, so daily runs share a
    // schedule and consecutive bosses in one run always differ.
    const bossCycle = Math.floor(wave / 8);
    if ((bossCycle + (runSeed % 2)) % 2 === 0) {
      list.push({ type: PRISM, t: 0,   boss: true });
      list.push({ type: PRISM, t: 0.4, boss: true });
    } else {
      list.push({ type: OMEGA, t: 0, boss: true });
    }
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
      // Elite affixes (v145): every elite carries one behavior modifier with
      // a readable tell — not just bigger/more HP. Seeded, so dailies match.
      entry = { type, t, elite: true, affix: AFFIXES[Math.floor(rng() * AFFIXES.length)] };
    } else if (variant === 'elitelite') {
      entryCost = Math.ceil(cost * 1.25);
      entry = { type, t, elitelite: true,
                affix: rng() < 0.5 ? AFFIXES[Math.floor(rng() * AFFIXES.length)] : null };
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
const _FOG = scene.fog;              // v151: cabinets recolor/remove and restore
const retro = new RetroPass();       // v151: cabinet post pipeline (idle until used)

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
// v162: scroll-follow offset — lerps after the player, clamped so the view
// window never leaves the (arenaScale×) world. Zero when arenaScale is 1.
const _camOff  = new THREE.Vector3();
const _camLook = new THREE.Vector3();
function updateShake(dt) {
  if (arenaScale > 1) {
    const p = (smashMode || tokotronMode || nexdeusMode) ? ARENA_PRESETS.smash
            : landscapeMode ? ARENA_PRESETS.landscape : ARENA_PRESETS.portrait;
    const mx = Math.max(0, HALF_X - p.halfX);
    const mz = Math.max(0, HALF_Z - p.halfZ);
    const tx = Math.max(-mx, Math.min(mx, player.position.x));
    const tz = Math.max(-mz, Math.min(mz, player.position.z));
    const k = Math.min(1, dt * 4);
    _camOff.x += (tx - _camOff.x) * k;
    _camOff.z += (tz - _camOff.z) * k;
  } else if (_camOff.x !== 0 || _camOff.z !== 0) {
    _camOff.set(0, 0, 0);
  }
  _camLook.copy(CAM_LOOK).add(_camOff);
  if (shakeTrauma <= 0) {
    camera.position.copy(CAM_REST).add(_camOff);
    camera.lookAt(_camLook);
    return;
  }
  shakeTrauma = Math.max(0, shakeTrauma - dt * 2.8);
  const mag = shakeTrauma * shakeTrauma;
  const t   = performance.now() / 1000;
  camera.position.set(
    CAM_REST.x + _camOff.x + Math.sin(t * 41) * mag * 1.8,
    CAM_REST.y + Math.sin(t * 37) * mag * 1.2,
    CAM_REST.z + _camOff.z + Math.sin(t * 43) * mag * 1.2,
  );
  camera.lookAt(_camLook);
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

// v167 parity pass: the references have GROUND. Tiny procedural canvas tiles
// (no assets, no CDN) — stone slabs, floorboards, concrete, asphalt — on one
// huge shared plane under the cabinet worlds. Tokotron keeps its authentic
// void; classic keeps the neon grid. NearestFilter keeps the pixel-era read.
function makeGroundTex(base, accent, style) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = accent; g.fillStyle = accent;
  if (style === 'tiles') {              // gaundrop: stone slabs + mortar
    g.lineWidth = 2;
    for (const [x, y] of [[0, 0], [32, 0], [0, 32], [32, 32]]) g.strokeRect(x + 1, y + 1, 30, 30);
    for (let i = 0; i < 26; i++) g.fillRect(Math.random() * 63, Math.random() * 63, 1.5, 1.5);
  } else if (style === 'boards') {      // binding: grimy basement boards
    g.lineWidth = 1;
    for (let y = 0; y < 64; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(64, y); g.stroke(); }
    for (let i = 0; i < 34; i++) g.fillRect(Math.random() * 63, Math.random() * 63, 2, 1);
  } else if (style === 'concrete') {    // loadout: cracked slab
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 63, Math.random() * 63, 1.5, 1.5);
    g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      const x0 = Math.random() * 64, y0 = Math.random() * 64;
      g.moveTo(x0, y0); g.lineTo(x0 + (Math.random() - 0.5) * 40, y0 + (Math.random() - 0.5) * 40);
      g.stroke();
    }
  } else {                              // kaikki: wet asphalt grain
    for (let i = 0; i < 70; i++) g.fillRect(Math.random() * 63, Math.random() * 63, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.repeat.set(100, 100);             // one 64px tile ≈ 4 world units
  return tex;
}
const CAB_GROUND_TEX = {
  gaundrop: makeGroundTex('#241608', '#1a0f05', 'tiles'),
  binding:  makeGroundTex('#241a16', '#181110', 'boards'),
  loadout:  makeGroundTex('#181c10', '#0e100a', 'concrete'),
  kaikki:   makeGroundTex('#141416', '#0c0c0e', 'asphalt'),
  nexdeus:  makeGroundTex('#0c0018', '#1e0836', 'tiles'),   // v173: void-glass tiles
};
const cabGround = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshBasicMaterial({ color: 0xffffff }));
cabGround.rotation.x = -Math.PI / 2;
cabGround.position.y = -0.02;
cabGround.visible = false;
scene.add(cabGround);
let _cabGroundName = null;
function fitCabGround() {
  // sized to the CURRENT world so the void returns beyond the bounds — the
  // references' rooms/streets end where the world ends. Tile ≈ 4 units.
  cabGround.scale.set((HALF_X * 2) / 400, (HALF_Z * 2) / 400, 1);
  if (cabGround.material.map) {
    cabGround.material.map.repeat.set((HALF_X * 2) / 4, (HALF_Z * 2) / 4);
  }
}
function setCabGround(name) {
  _cabGroundName = name;
  cabGround.visible = !!name;
  if (name) {
    cabGround.material.map = CAB_GROUND_TEX[name];
    cabGround.material.needsUpdate = true;
    fitCabGround();
  }
}

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
  const p = (smashMode || tokotronMode || nexdeusMode) ? ARENA_PRESETS.smash
          : landscape ? ARENA_PRESETS.landscape : ARENA_PRESETS.portrait;
  HALF_X = p.halfX * arenaScale; HALF_Z = p.halfZ * arenaScale;   // v162
  CAM_LOOK.set(...p.camLook);
  if (smashMode || tokotronMode || nexdeusMode || landscape) CAM_REST.copy(fitPresetCamera(p));
  else                        CAM_REST.set(...p.camRest);
  camera.position.copy(CAM_REST);
  camera.lookAt(CAM_LOOK);
  floor.geometry.dispose();
  floor.geometry = new THREE.PlaneGeometry(HALF_X * 2, HALF_Z * 2);
  border.geometry.dispose();
  border.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(HALF_X * 2, 0.05, HALF_Z * 2));
  floorUniforms.uGridX.value = (HALF_X * 2) / GRID_CELL;
  floorUniforms.uGridZ.value = (HALF_Z * 2) / GRID_CELL;
  if (_cabGroundName) fitCabGround();   // v167: ground tracks the world size
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
  // v175 (M5b gates, round 2): `risk` gates alternate green/red on a readable
  // 1.6 s cycle — dash on green pays double, red is a harmless dud. `drift`
  // gates wander slowly, so the late-game route keeps changing.
  constructor(sc, risk = false, drift = false) {
    const x = (Math.random() - 0.5) * HALF_X * 1.5;
    const z = (Math.random() - 0.5) * HALF_Z * 1.5;
    const angle = Math.random() * Math.PI;
    this._x = x; this._z = z; this._angle = angle;
    this.alive = true;
    this._dmgCooldown = 0;
    this._risk = risk;
    this._green = true;
    if (drift) {
      const da = Math.random() * Math.PI * 2;
      this._driftX = Math.cos(da) * 0.4; this._driftZ = Math.sin(da) * 0.4;
    }

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
    if (this._risk) {
      // green/red on a strict clock — the read is the whole game
      this._green = Math.floor(t / 1.6) % 2 === 0;
      const col = this._green ? 0x44ff88 : 0xff4455;
      this._laserMat.color.setHex(col);
      this._glowMat.color.setHex(col);
    }
    if (this._driftX !== undefined) {
      // slow wander, bouncing well inside the walls
      this._x += this._driftX * dt; this._z += this._driftZ * dt;
      if (Math.abs(this._x) > HALF_X - 3) this._driftX *= -1;
      if (Math.abs(this._z) > HALF_Z - 3) this._driftZ *= -1;
      const dx = Math.cos(this._angle + Math.PI / 2) * 2;
      const dz = Math.sin(this._angle + Math.PI / 2) * 2;
      this._p1.position.set(this._x + dx, 0.9, this._z + dz);
      this._p2.position.set(this._x - dx, 0.9, this._z - dz);
      this._laser.position.set(this._x, 0.9, this._z);
      this._glow.position.set(this._x, 0.9, this._z);
    }
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

// ── Living arena objectives (v175, M5b) ─────────────────────────────────────────
// VAULT CRATE: an armored box — ~8 hits to crack, big loot inside, and every
// hit PINGS the room: nearby enemies surge at you. Loud greed, your choice.
class VaultCrate {
  constructor(sc, x, z) {
    this.x = x; this.z = z; this.hp = 8;
    this._flashT = 0;
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.1, 1.5),
      new THREE.MeshPhongMaterial({ color: 0x8899aa, shininess: 90 }));
    this.mesh.position.set(x, 0.55, z);
    this.ring = new THREE.Mesh(
      new THREE.BoxGeometry(1.66, 1.2, 1.66),
      new THREE.MeshBasicMaterial({ color: 0xffcc33, wireframe: true }));
    this.ring.position.copy(this.mesh.position);
    sc.add(this.mesh); sc.add(this.ring);
  }
  update(dt) {
    this.ring.rotation.y += dt * 0.5;
    if (this._flashT > 0) {
      this._flashT -= dt;
      this.mesh.material.emissive.setHex(Math.sin(performance.now() * 0.05) > 0 ? 0x664400 : 0x000000);
    } else this.mesh.material.emissive.setHex(0x000000);
  }
  remove(sc) {
    sc.remove(this.mesh); sc.remove(this.ring);
    this.mesh.geometry.dispose(); this.mesh.material.dispose();
    this.ring.geometry.dispose(); this.ring.material.dispose();
  }
}
// ESCORT BOT: a little soap-bot trundles wall to wall; deliver it alive and
// it gifts a weapon pod. Enemies never chase it — but stray fire and bodies
// kill it, so protecting it is pure positioning.
class EscortBot {
  constructor(sc) {
    this.hp = 2;
    this._flashT = 0;
    const westward = Math.random() < 0.5;
    this.x = (westward ? 1 : -1) * (HALF_X - 1.5);
    this.z = (Math.random() * 2 - 1) * (HALF_Z - 4);
    this._tx = -this.x;
    this._spd = (HALF_X * 2 - 3) / 14;     // the crossing takes ~14 s
    this.group = new THREE.Group();
    this._bodyMat = new THREE.MeshPhongMaterial({ color: 0xf4f7ff, shininess: 80 });
    this._trimMat = new THREE.MeshBasicMaterial({ color: 0x44ddff });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.5, 10), this._bodyMat);
    body.position.y = 0.3;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), this._bodyMat);
    dome.position.y = 0.55;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), this._trimMat);
    eye.position.set((this._tx > this.x ? 1 : -1) * 0.22, 0.6, 0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), this._trimMat);
    mast.position.y = 0.9;
    this.group.add(body, dome, eye, mast);
    this.group.position.set(this.x, 0, this.z);
    sc.add(this.group);
  }
  update(dt) {
    const dir = Math.sign(this._tx - this.x);
    this.x += dir * this._spd * dt;
    this.group.position.set(this.x, 0.04 * Math.abs(Math.sin(performance.now() * 0.008)), this.z);
    this.group.rotation.z = -dir * 0.06 * Math.sin(performance.now() * 0.01);
    if (this._flashT > 0) {
      this._flashT -= dt;
      this._bodyMat.emissive.setHex(0x661111);
    } else this._bodyMat.emissive.setHex(0x000000);
    return dir > 0 ? this.x >= this._tx : this.x <= this._tx;
  }
  remove(sc) {
    sc.remove(this.group);
    for (const c of this.group.children) c.geometry.dispose();
    this._bodyMat.dispose(); this._trimMat.dispose();
  }
}
let vaultCrate = null;
let escortBot  = null;
let gateChainT = 0, gateChainN = 0;   // v175: dash gates back-to-back for a bonus
function clearArenaObjectives() {
  if (vaultCrate) { vaultCrate.remove(scene); vaultCrate = null; }
  if (escortBot)  { escortBot.remove(scene);  escortBot  = null; }
  gateChainT = 0; gateChainN = 0;
}

// ── Living arena hazards (v176, M5b) ────────────────────────────────────────────
// The floor is a player too — and every hazard hurts enemies as well, so
// luring is always a legal tactic.
// STEAM VENT: a floor grate that glows amber for ~1 s, then erupts — damage
// + knockback to ANYTHING standing on it.
class SteamVent {
  constructor(sc, x, z) {
    this.x = x; this.z = z;
    this.state = 'idle';
    this.t = 3 + Math.random() * 5;
    this.justErupted = false;
    this._grateMat = new THREE.MeshPhongMaterial({ color: 0x333940, shininess: 30 });
    this.grate = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.1, 12), this._grateMat);
    this.grate.position.set(x, 0.05, z);
    this._ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.5, 26), this._ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.set(x, 0.03, z);
    sc.add(this.grate); sc.add(this.ring);
  }
  update(dt) {
    this.t -= dt;
    if (this.state === 'idle') {
      this._ringMat.opacity = 0;
      if (this.t <= 0) { this.state = 'warm'; this.t = 1.0; }
    } else if (this.state === 'warm') {
      // the amber second: readable, escapable, weaponizable
      this._ringMat.color.setHex(0xffaa33);
      this._ringMat.opacity = 0.25 + 0.55 * Math.abs(Math.sin(performance.now() * (this.t < 0.4 ? 0.03 : 0.012)));
      if (this.t <= 0) {
        this.state = 'erupt'; this.t = 0.45;
        this.justErupted = true;
        for (let j = 0; j < 14; j++) {
          const a = (j / 14) * Math.PI * 2;
          gooChunkPool.spawn(this.x, 0.3, this.z,
            Math.cos(a) * (2 + Math.random() * 2), 5 + Math.random() * 3,
            Math.sin(a) * (2 + Math.random() * 2), 0xeef4f8, 0.10);
        }
        audio.ventBlast();
      }
    } else {
      this._ringMat.color.setHex(0xffffff);
      this._ringMat.opacity = 0.7 * (this.t / 0.45);
      if (this.t <= 0) { this.state = 'idle'; this.t = 4 + Math.random() * 5; }
    }
  }
  remove(sc) {
    sc.remove(this.grate); sc.remove(this.ring);
    this.grate.geometry.dispose(); this._grateMat.dispose();
    this.ring.geometry.dispose(); this._ringMat.dispose();
  }
}
// DRAIN: a whirlpool — visible swirl, a gentle pull on every body, and it
// EATS any bullet that crosses it (both sides). Cover that moves the fight.
class Drain {
  constructor(sc, x, z) {
    this.x = x; this.z = z; this.radius = 2.4;
    this._discMat = new THREE.MeshBasicMaterial({ color: 0x0a1a2a, transparent: true, opacity: 0.72, depthWrite: false });
    this.disc = new THREE.Mesh(new THREE.CircleGeometry(this.radius, 30), this._discMat);
    this.disc.rotation.x = -Math.PI / 2;
    this.disc.position.set(x, 0.02, z);
    this._swirlMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.swirls = [];
    for (let i = 0; i < 2; i++) {
      const sw = new THREE.Mesh(
        new THREE.RingGeometry(0.5 + i * 0.85, 0.75 + i * 0.85, 24, 1, 0, Math.PI * 1.35),
        this._swirlMat);
      sw.rotation.x = -Math.PI / 2;
      sw.rotation.z = i * 2.2;
      sw.position.set(x, 0.035, z);
      sc.add(sw);
      this.swirls.push(sw);
    }
    sc.add(this.disc);
  }
  update(dt) {
    for (let i = 0; i < this.swirls.length; i++) this.swirls[i].rotation.z -= dt * (1.6 + i * 0.9);
    if (Math.random() < dt * 3) {
      bubblePool.spawn(this.x + (Math.random() - 0.5) * this.radius,
                       this.z + (Math.random() - 0.5) * this.radius, 0x88ddff);
    }
  }
  remove(sc) {
    sc.remove(this.disc);
    this.disc.geometry.dispose(); this._discMat.dispose();
    for (const sw of this.swirls) { sc.remove(sw); sw.geometry.dispose(); }
    this._swirlMat.dispose();
  }
}
let steamVents = [];
let drainZone  = null;
// SUDS SURGE (v176, SMASH TV): the show's commercial-break spectacle — the
// floor lights a lane, then a foam wall sweeps it: enemies brushed hard
// aside (and hurt), the player damaged only on a direct hit.
let sudsArmed = false, sudsAt = 0, sudsWarnT = 0;
let sudsWall = null;   // { mesh, mat, axis, dir, pos, warnMesh }
function clearHazards() {
  for (const v of steamVents) v.remove(scene);
  steamVents = [];
  if (drainZone) { drainZone.remove(scene); drainZone = null; }
  if (sudsWall) {
    scene.remove(sudsWall.mesh);
    sudsWall.mesh.geometry.dispose(); sudsWall.mat.dispose();
    sudsWall = null;
  }
  sudsArmed = false; sudsWarnT = 0;
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
const NON_WEAPON_COLORS = { hp: 0xff4466, invincible: 0xffffff, firerate: 0xff88aa, scoremult: 0xffdd22, score: 0x88ff88, item: 0xff88bb, key: 0xffd700, potion: 0x66d9ff };

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
// v169 parity: SHAPED pickups — a key that looks like a key, a flask that
// looks like a flask, a haunch of suds-meat. Tiny hand-merged geometries
// (positions/normals/uvs concatenated; no external utils).
function mergeGeos(parts) {
  const pos = [], norm = [], uv = [];
  for (const part of parts) {
    const g = part.geo.toNonIndexed();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(part.x || 0, part.y || 0, part.z || 0),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(part.rx || 0, part.ry || 0, part.rz || 0)),
      new THREE.Vector3().setScalar(part.s || 1));
    g.applyMatrix4(m);
    pos.push(...g.attributes.position.array);
    norm.push(...g.attributes.normal.array);
    if (g.attributes.uv) uv.push(...g.attributes.uv.array);
    else for (let i = 0; i < g.attributes.position.count * 2; i++) uv.push(0);
    g.dispose();
    part.geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}
const KEY_GEO = mergeGeos([
  { geo: new THREE.TorusGeometry(0.16, 0.055, 6, 12), y: 0.26 },          // bow
  { geo: new THREE.BoxGeometry(0.09, 0.42, 0.07), y: -0.05 },             // shaft
  { geo: new THREE.BoxGeometry(0.17, 0.06, 0.07), x: 0.09, y: -0.2 },     // tooth
  { geo: new THREE.BoxGeometry(0.13, 0.06, 0.07), x: 0.07, y: -0.08 },    // tooth
]);
const POTION_GEO = mergeGeos([
  { geo: new THREE.SphereGeometry(0.22, 10, 8) },                          // bulb
  { geo: new THREE.CylinderGeometry(0.07, 0.07, 0.18, 8), y: 0.24 },       // neck
  { geo: new THREE.SphereGeometry(0.065, 6, 5), y: 0.36 },                 // cork
]);
const FOOD_GEO = mergeGeos([
  { geo: new THREE.SphereGeometry(0.2, 10, 8), x: 0.08 },                  // haunch
  { geo: new THREE.CylinderGeometry(0.045, 0.045, 0.3, 6), x: -0.16, rz: Math.PI / 2 },  // bone
  { geo: new THREE.SphereGeometry(0.06, 6, 5), x: -0.32, z: 0.045 },       // knuckle
  { geo: new THREE.SphereGeometry(0.06, 6, 5), x: -0.32, z: -0.045 },
]);
// v132: glyph badges for the non-weapon pickups (weapon pods show their id).
const NON_WEAPON_GLYPHS = {
  hp: '+', invincible: '★', firerate: '»', scoremult: '×2', score: '$', item: '?', key: 'K', potion: '✦',
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
  EnemyType.GRUNT, EnemyType.BRUTE,                 // v155 tokotron
  EnemyType.GHOST, EnemyType.WRAITH,                // v156 gaundrop
  EnemyType.FLIT, EnemyType.CHARGER, EnemyType.HOPPER,  // v157 binding
  EnemyType.THUG,                                       // v169 kaikki
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
// v171 (user: "walls of bullets, curtains even"): the ARENA CURTAIN — an
// arena-spanning wall of slow bullets that sweeps from one wall to the
// other with two dash-or-weave gaps. Warned a beat ahead; classic + SMASH
// only (wave 6+, never boss waves, ~55% of eligible waves).
let curtainArmed = false;
let curtainAt    = 0;
let curtainWarnT = 0;
// v177 curtain variations: 'wall' (v171 classic), 'diag' (the sheet shears —
// full-width wall sliding at a slant), 'cross' (a second sheet follows from
// the adjacent wall one beat later — find the moving intersection of gaps).
let curtainStyle = 'wall';
let curtainColor = 0xff66aa;
let curtainCross = null;     // pending second sheet { t, side }
function fireArenaCurtain(style = 'wall', forceSide = null) {
  const side  = forceSide ?? Math.floor(Math.random() * 4);
  const horiz = side === 1 || side === 3;               // from a ±z wall
  const span  = horiz ? HALF_X : HALF_Z;
  const edge  = side === 0 ? HALF_X : side === 1 ? HALF_Z : side === 2 ? -HALF_X : -HALF_Z;
  let dirX  = side === 0 ? -1 : side === 2 ? 1 : 0;
  let dirZ  = side === 1 ? -1 : side === 3 ? 1 : 0;
  if (style === 'diag') {
    const lat = Math.random() < 0.5 ? 0.6 : -0.6;
    if (horiz) dirX = lat; else dirZ = lat;
    const L = Math.hypot(dirX, dirZ);
    dirX /= L; dirZ /= L;
  }
  const n     = Math.floor((span * 2 - 1) / 0.9);
  const g1    = 2 + Math.floor(Math.random() * Math.max(1, n - 10));
  let   g2    = 2 + Math.floor(Math.random() * Math.max(1, n - 10));
  if (Math.abs(g2 - g1) < 5) g2 = ((g1 + Math.floor(n / 2)) % Math.max(1, n - 4)) + 2;
  for (let i = 0; i <= n; i++) {
    if ((i >= g1 && i < g1 + 3) || (i >= g2 && i < g2 + 3)) continue;   // the ways through
    const o  = -span + 0.5 + i * 0.9;
    const bx = horiz ? o : edge;
    const bz = horiz ? edge : o;
    bullets.spawnDir(bx, bz, dirX, dirZ, false, curtainColor, false, null, false, 6, 0.62);
  }
  return side;
}
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
    mode: nexdeusMode ? 'nexdeus' : kaikkiMode ? 'kaikki' : loadoutMode ? 'loadout' : bindingMode ? 'binding' : gaundropMode ? 'gaundrop' : tokotronMode ? 'tokotron' : roguelikeMode ? 'roguelike' : 'arcade',
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
// Roguelike mode: show upgrade cards every 3rd wave. Variant B (v146) adds a
// third RARE card to every card screen: the BONUS GAUNTLET — a goal-oriented
// SMASH-style room run (tier 1: 4 rooms + boss; tier 2+: 2 brutal rooms +
// boss + mega-boss) with a pinball score multiplier that climbs per room.
// Clearing a gauntlet pays a RARE upgrade pick. Dying in one ends the run.
let roguelikeMode = localStorage.getItem('tokoDropRogue2') === '1';
let rogueB        = localStorage.getItem('tokoDropRogueB') === '1';
if (rogueB) roguelikeMode = true;
let gauntlet      = null;   // { tier, rooms, roomIdx, mult, mega } while inside
let gauntletTier  = 1;      // next gauntlet offer's tier (per run)
let _gSavedSmash  = null;   // smashMode to restore when the gauntlet ends
// Cabinet bonus quests (v154, Roguelike B): the gold rare card rotates
// through ALL the arcade cabinets — each a short scripted excursion (clear N
// waves / find the exit / run N missions / clear N rooms) with the gauntlet's
// pinball multiplier and a RARE pick on completion. Declining keeps the same
// offer for the next card screen.
let cabQuest = null;   // { mode, goal, done, mult } while inside a quest
let _lastQuestOffer = null;   // v166: no identical back-to-back offers
const QUEST_ORDER = ['gauntlet', 'tokotron', 'gaundrop', 'loadout', 'binding', 'kaikki'];
// SMASH TV mode (v109): enemies pour in bursts from 4 arena-edge "doors",
// waves run bigger and burstier, and moths/convoys drop more prizes.
let smashMode = localStorage.getItem('tokoDropSmash') === '1';
// v178 (M6): SMASH TV floor structure — the boss room ends a FLOOR. Each
// floor re-lights the studio (palette shift), toughens the lattice (budget
// scales), and opens with a BONUS ROOM: pure loot, doors already open.
let smashFloor = 1;
const SMASH_FLOOR_LOOKS = [
  { bg: 0x0d0d1a, border: 0x5555cc },   // floor 1 — the studio default
  { bg: 0x0d1a17, border: 0x44ccaa },   // floor 2 — teal stage
  { bg: 0x1a150d, border: 0xcc9944 },   // floor 3 — amber stage
  { bg: 0x1a0d10, border: 0xcc4455 },   // floor 4 — crimson stage
  { bg: 0x140d1a, border: 0x9955cc },   // floor 5+ — violet stage, then cycle
];
function applySmashFloorLook() {
  if (bindingMode || gauntlet || inCabinet()) return;   // they own their looks
  const lk = smashMode
    ? SMASH_FLOOR_LOOKS[(smashFloor - 1) % SMASH_FLOOR_LOOKS.length]
    : SMASH_FLOOR_LOOKS[0];
  scene.background.setHex(lk.bg);
  border.material.color.setHex(lk.border);
  _FOG.color.setHex(lk.bg);
}
// DAILY RUN (v130, roadmap M3): everyone who flips the chip plays the same
// UTC-date-derived seed that day — no server needed. Whatever mode toggles
// you bring are yours; the run is tagged DAILY (death screen, share, feedback
// payload) and a separate per-day local best is kept.
let dailyMode = localStorage.getItem('tokoDropDaily') === '1';
// v179 (M6): DAILY MODIFIERS — pure date math picks the day's twist, so
// every player worldwide gets the same one (no seed handshake needed).
// 4-day rotation: a classic day, then GLASS / SURGE DAY / RICH DAY.
const DAILY_MODS = {
  glass: { label: 'GLASS',     color: '#aaeeff' },
  surge: { label: 'SURGE DAY', color: '#ff8866' },
  rich:  { label: 'RICH DAY',  color: '#ffcc33' },
};
function todaysMod() {
  const d = new Date();
  const day = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000);
  return [null, 'glass', 'surge', 'rich'][day % 4];
}
let dailyMod = null;   // active modifier for THIS run (null off-daily / classic day)
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
  item:   { label: 'ITEM',   color: '#ff88bb' },   // Binding of Toko (v150)
  hazard: { label: 'HAZARD 2×$', color: '#ff8866' },   // v176: vent-heavy, loot-rich
  bonus:  { label: 'BONUS!', color: '#66ffaa' },       // v178: the floor's breather
  vault:  { label: 'VAULT$', color: '#ffcc33' },       // v176: the crate + guards
};
// Deterministic per-run room kind for lattice cell (x, y). The 8th room of a
// run is always the boss (mirrors the wave rhythm), so every exit says BOSS!.
function roomKindAt(x, y) {
  if ((wave + 1) % 8 === 0) return 'boss';
  const h = mulberry32((runSeed ^ (x * 73856093) ^ (y * 19349663)) | 0)();
  // v176: HAZARD and VAULT venues join the show from wave 5
  if (wave >= 5) {
    return h < 0.38 ? 'normal' : h < 0.56 ? 'swarm' : h < 0.72 ? 'spike'
         : h < 0.82 ? 'prize' : h < 0.92 ? 'hazard' : 'vault';
  }
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
// TOKOTRON (v148, roadmap M5 cabinet #1 — Robotron: 2084 tribute): a single
// fixed dark room, no grid, shiny vector-bright bounds, waves that flood in
// around you, and civilians to rescue by touch before the swarm gets them.
// Launched from its own title chip; forces the pixel renderer for the run
// and restores every toggle it borrowed when the run ends.
let tokotronMode = false;
let civilians = [];
let rescueChain = 0;
// v168 (Robotron parity): ELECTRODES — the reference's static furniture.
// One shot destroys them (+25), grunts that touch them die, the player
// takes a hit. BRUTEs bulldoze them for free.
let tkElectrodes = [];   // { mesh, x, z }
function clearElectrodes() {
  for (const el of tkElectrodes) {
    scene.remove(el.mesh);
    el.mesh.geometry.dispose();
    el.mesh.material.dispose();
  }
  tkElectrodes = [];
}
let _tkSavedPixel = null, _tkSavedSmash = null;
function setTokotronLook(on) {
  scene.background.setHex(on ? 0x030309 : 0x0d0d1a);
  floor.visible = !on;                                   // dark void, no grid
  border.material.color.setHex(on ? 0x44eeff : 0x5555cc); // shiny vector bounds
  scene.fog = on ? null : _FOG;                          // vector black runs deep
  CABINET_STYLE.mode = on ? 'tokotron' : null;
  player.setCabinetStyle(on ? 'tokotron' : null);
  audio.setCabinetSound(on ? 'tokotron' : null);   // v164: the gun changes voice
}
function startTokotron() {
  tokotronMode = true;
  _tkSavedSmash = smashMode; smashMode = false;
  _tkSavedPixel = pixelMode; pixelMode = true;
  applyPerfMode();
  setTokotronLook(true);
  startGame();
}
function exitTokotron() {
  tokotronMode = false;
  clearElectrodes();
  smashMode = _tkSavedSmash;
  pixelMode = _tkSavedPixel;
  applyPerfMode();
  setTokotronLook(false);
  applyArenaMode(landscapeMode);
}
class Civilian {
  // v155 family variety: 0 = kid (small, quick, panicky), 1 = tall (steady),
  // 2 = elder (slow amble). v160 (user direction): they read as PEOPLE now —
  // skin, shirt, swinging arms and legs, a waving hand, and a gold rescue
  // halo on the floor. Rescues pay the same chain; the family is the reason.
  constructor(sc, x, z, kind = 1) {
    this.alive = true;
    this.kind = kind;
    this.x = x; this.z = z;
    this._dir = Math.random() * Math.PI * 2;
    this._turnT = 0;
    this._waveT = 1 + Math.random() * 3;   // periodically stops to wave for help
    this._speed = kind === 0 ? 2.0 : kind === 2 ? 0.8 : 1.3;
    const scale = kind === 0 ? 0.7 : kind === 2 ? 0.95 : 1.15;
    this.mat = new THREE.MeshBasicMaterial({
      color: kind === 0 ? 0x44ccff : kind === 2 ? 0xff8844 : 0xffee66 });   // the shirt
    this._skinMat = new THREE.MeshBasicMaterial({ color: 0xffd9b0 });
    this._legMat  = new THREE.MeshBasicMaterial({ color: 0x334455 });
    this._haloMat = new THREE.MeshBasicMaterial({
      color: 0xffdd66, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.group = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.2), this.mat);
    torso.position.y = 0.5;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), this._skinMat);
    head.position.y = 0.82;
    this._armL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), this.mat);
    this._armL.position.set(-0.22, 0.52, 0);
    this._armR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.08), this.mat);
    this._armR.position.set(0.22, 0.52, 0);
    this._legL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), this._legMat);
    this._legL.position.set(-0.08, 0.15, 0);
    this._legR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), this._legMat);
    this._legR.position.set(0.08, 0.15, 0);
    this._halo = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 20), this._haloMat);
    this._halo.rotation.x = -Math.PI / 2;
    this._halo.position.y = 0.03;
    this.group.add(torso, head, this._armL, this._armR, this._legL, this._legR, this._halo);
    this.group.scale.setScalar(scale);
    this.group.position.set(x, 0, z);
    sc.add(this.group);
  }
  update(dt) {
    this._turnT -= dt;
    this._waveT -= dt;
    const waving = this._waveT <= 0;
    if (waving && this._waveT < -1.1) this._waveT = 2.5 + Math.random() * 3;
    if (this._turnT <= 0) {
      this._turnT = (this.kind === 0 ? 0.5 : 0.8) + Math.random() * 1.4;
      this._dir = Math.random() * Math.PI * 2;
    }
    if (!waving) {   // stops in place to wave — a person asking for help
      this.x = Math.max(-HALF_X + 0.6, Math.min(HALF_X - 0.6, this.x + Math.cos(this._dir) * this._speed * dt));
      this.z = Math.max(-HALF_Z + 0.6, Math.min(HALF_Z - 0.6, this.z + Math.sin(this._dir) * this._speed * dt));
    }
    const ph = performance.now() * 0.011 + this.x * 3;
    const swing = waving ? 0 : Math.sin(ph) * 0.55;
    this._legL.rotation.x = swing;
    this._legR.rotation.x = -swing;
    this._armL.rotation.x = -swing * 0.7;
    if (waving) {   // one arm high, waving side to side
      this._armR.rotation.z = 2.6 + Math.sin(performance.now() * 0.02) * 0.35;
      this._armR.rotation.x = 0;
    } else {
      this._armR.rotation.z = 0;
      this._armR.rotation.x = swing * 0.7;
    }
    this._halo.material.opacity = 0.3 + 0.2 * Math.abs(Math.sin(ph * 1.6));
    this.group.rotation.y = -this._dir + Math.PI / 2;
    this.group.position.set(this.x, 0.02 + 0.04 * Math.abs(Math.sin(ph * 2)), this.z);
  }
  remove(sc) {
    sc.remove(this.group);
    for (const c of this.group.children) c.geometry.dispose();
    this.mat.dispose();
    this._skinMat.dispose();
    this._legMat.dispose();
    this._haloMat.dispose();
  }
}

// GAUNDROP (v149, roadmap M5 cabinet #2 — Gauntlet tribute): torchlit 8-bit
// dungeon levels (Conan-palette: bronze, rust, dark stone), maze walls that
// block everything, enemy GENERATORS that pour bodies until destroyed, suds
// food, treasure, and a glowing exit tile — escape is always legal. Levels
// descend forever; the drop only ends when the blob does.
let gaundropMode = false;
let gdWalls = [];        // { mesh, x, z, hx, hz } axis-aligned blockers
let gdGenerators = [];
let gdExit = null;
let gdKeys = 0;           // v168 (Gauntlet parity): keys are an INVENTORY
let gdDoors = [];         // v168: locked internal doors — a key opens each
let gdHungerT = 0;        // v156: Gauntlet-style drain — suds food resets it
let _gdSavedPixel = null, _gdSavedSmash = null;
const inCabinet = () => tokotronMode || gaundropMode || bindingMode || loadoutMode || kaikkiMode || nexdeusMode;
function setGaundropLook(on) {
  setCabGround(on ? 'gaundrop' : null);   // v167: the reference has GROUND
  scene.background.setHex(on ? 0x140a04 : 0x0d0d1a);   // torchlit dark
  floor.visible = !on;
  border.material.color.setHex(on ? 0xcc8833 : 0x5555cc); // bronze bounds
  _FOG.color.setHex(on ? 0x140a04 : 0x0d0d1a);
  _FOG.near = on ? 28 : 42; _FOG.far = on ? 58 : 80;   // v162: the crawl reveal
  scene.fog = _FOG;
  CABINET_STYLE.mode = on ? 'gaundrop' : null;
  player.setCabinetStyle(on ? 'gaundrop' : null);
  audio.setCabinetSound(on ? 'gaundrop' : null);   // v164: the gun changes voice
}
function startGaundrop() {
  gaundropMode = true;
  arenaScale = 2.0;   // v162: the dungeon scrolls — twice the world per level
  _gdSavedSmash = smashMode; smashMode = false;
  _gdSavedPixel = pixelMode; pixelMode = true;
  applyPerfMode();
  setGaundropLook(true);
  startGame();
}
function exitGaundrop() {
  gaundropMode = false;
  arenaScale = 1;
  smashMode = _gdSavedSmash;
  pixelMode = _gdSavedPixel;
  applyPerfMode();
  setGaundropLook(false);
  applyArenaMode(landscapeMode);
}
function clearGaundropLevel() {
  for (const w of gdWalls) { scene.remove(w.mesh); w.mesh.geometry.dispose(); w.mesh.material.dispose(); }
  gdWalls = [];
  gdDoors = [];   // v168: door meshes live in gdWalls — just drop the refs
  for (const c of bdChasms) {   // v163: binding pits share the terrain clear
    scene.remove(c.mesh); scene.remove(c.rim);
    c.mesh.geometry.dispose(); c.mesh.material.dispose();
    c.rim.geometry.dispose(); c.rim.material.dispose();
  }
  bdChasms = [];
  for (const g of gdGenerators) g.remove(scene);
  gdGenerators = [];
  if (gdExit) { scene.remove(gdExit.mesh); gdExit.mesh.geometry.dispose(); gdExit.mat.dispose(); gdExit = null; }
}
const GD_WALL_MAT_COLOR = 0x7a4a22;   // stone-brown
// v167: brick texture for the dungeon walls — offset courses + mortar lines.
const GD_BRICK_TEX = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#7a4a22'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#5c3617';
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 16 : 0;
    g.fillRect(0, row * 16, 64, 2);                       // mortar course
    for (let x = -16; x < 64; x += 32) g.fillRect(x + off, row * 16, 2, 16);  // joints
  }
  g.fillStyle = '#8a5a2e';
  for (let i = 0; i < 20; i++) g.fillRect(Math.random() * 63, Math.random() * 63, 2, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
})();
// v161 identity dressing — SHARED geometry/materials that ride disposable
// parents (walls, buildings, generators) as children: never disposed, reused.
const TORCH_GEO = new THREE.PlaneGeometry(0.3, 0.5);
const TORCH_MAT = new THREE.MeshBasicMaterial({
  color: 0xffaa33, transparent: true, opacity: 0.7,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const WINDOW_GEO = new THREE.PlaneGeometry(0.3, 0.36);
const WINDOW_MAT = new THREE.MeshBasicMaterial({ color: 0xffcc55 });
const MAST_GEO = new THREE.BoxGeometry(0.08, 2.4, 0.08);
const MAST_MAT = new THREE.MeshBasicMaterial({ color: 0x99bb77 });
const BEACON_GEO = new THREE.SphereGeometry(0.13, 8, 6);
const BEACON_MAT = new THREE.MeshBasicMaterial({ color: 0xff3322 });
class Generator {
  constructor(sc, x, z, type, rate = 2.2) {   // v156: ghost gens pour faster, deeper
    this.alive = true;
    this.x = x; this.z = z;
    this.type = type;
    this.hp = 6;
    this._rate = rate;
    this._spawnT = 1.2 + Math.random();
    this._flashT = 0;
    this.mat = new THREE.MeshBasicMaterial({ color: 0xb06a2a });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.0, 1.25), this.mat);
    this.mesh.position.set(x, 0.5, z);
    sc.add(this.mesh);
  }
  update(dt) {
    this._spawnT -= dt;
    if (this._flashT > 0) { this._flashT -= dt; this.mat.color.setHex(0xffcc88); }
    else this.mat.color.setHex(0xb06a2a);
    this.mesh.rotation.y += dt * 0.4;
    const aliveCount = enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
    // v168: Gauntlet is CROWDS — the dungeon runs a deeper cap
    if (this._spawnT <= 0 && aliveCount < (gaundropMode ? 30 : 22)) {
      this._spawnT = this._rate + Math.random() * 1.2;
      const a = Math.random() * Math.PI * 2;
      enemies.push(new Enemy(scene, this.type, this.x + Math.cos(a) * 1.4, this.z + Math.sin(a) * 1.4));
    }
  }
  hit() {
    this.hp--;
    this._flashT = 0.1;
    if (this.hp <= 0) {
      this.alive = false;
      score += 500 * (scoreMultT > 0 ? 2 : 1);
      damageNumbers.push(new DamageNumber(this.x, 1.2, this.z, '+500', '255,170,68'));
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2;
        chunkPool.spawn(this.x, 0.7, this.z, Math.cos(a) * 4, 2 + Math.random() * 2, Math.sin(a) * 4, 0xb06a2a, 0.14);
      }
      addShake(0.15);
      audio.enemyDieType('cube');
    }
  }
  remove(sc) { sc.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}
// BINDING chasms (v163): Isaac pits — bodies can't cross, bullets fly
// over. FLITs (flying) and mid-hop HOPPERs ignore them. Same AABB math as
// the wall kit, separate array so bullets never interact.
let bdChasms = [];   // { mesh, rim, x, z, hx, hz }
function bdInsideChasm(x, z, r = 0) {
  for (const c of bdChasms) {
    if (Math.abs(x - c.x) < c.hx + r && Math.abs(z - c.z) < c.hz + r) return true;
  }
  return false;
}
function bdResolveChasms(x, z, r) {
  for (const w of bdChasms) {
    const dx = x - Math.max(w.x - w.hx, Math.min(w.x + w.hx, x));
    const dz = z - Math.max(w.z - w.hz, Math.min(w.z + w.hz, z));
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        x += (dx / d) * (r - d);
        z += (dz / d) * (r - d);
      } else {
        const px = (w.hx + r) - Math.abs(x - w.x);
        const pz = (w.hz + r) - Math.abs(z - w.z);
        if (px < pz) x += Math.sign(x - w.x || 1) * px;
        else         z += Math.sign(z - w.z || 1) * pz;
      }
    }
  }
  return { x, z };
}

// circle-vs-AABB pushout: returns corrected {x, z} for a radius r at (x, z)
function gdResolveWalls(x, z, r) {
  for (const w of gdWalls) {
    const dx = x - Math.max(w.x - w.hx, Math.min(w.x + w.hx, x));
    const dz = z - Math.max(w.z - w.hz, Math.min(w.z + w.hz, z));
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        x += (dx / d) * (r - d);
        z += (dz / d) * (r - d);
      } else {
        // center inside the box: push out along the thinnest axis
        const px = (w.hx + r) - Math.abs(x - w.x);
        const pz = (w.hz + r) - Math.abs(z - w.z);
        if (px < pz) x += Math.sign(x - w.x || 1) * px;
        else         z += Math.sign(z - w.z || 1) * pz;
      }
    }
  }
  return { x, z };
}
function gdInsideWall(x, z, r = 0) {
  for (const w of gdWalls) {
    if (Math.abs(x - w.x) < w.hx + r && Math.abs(z - w.z) < w.hz + r) return true;
  }
  return false;
}

// THE BINDING OF TOKO (v150, roadmap M5 cabinet #3 — Binding of Isaac
// tribute): room-by-room basement floors on the SMASH lattice, but the soul
// is the ITEM ECONOMY — item rooms every ~3rd door hand out a free upgrade
// pick, every 6th room is a floor boss paying a RARE pick. Mods stack for
// the whole run; the build IS the run.
let bindingMode = false;
let bindingRoomN = 1;    // rooms entered this run
let bindingFloor = 1;
let _bdSavedPixel = null, _bdSavedSmash = null;
function bindingKindFor(n) {
  if (n % 6 === 0) return 'boss';
  if (n % 3 === 0) return 'item';
  const r = Math.abs(Math.sin(runSeed + n * 7.13));   // seeded, stable per room
  return r < 0.55 ? 'normal' : r < 0.8 ? 'swarm' : 'spike';
}
function setBindingLook(on) {
  setCabGround(on ? 'binding' : null);   // v167: the reference has GROUND
  scene.background.setHex(on ? 0x0d0509 : 0x0d0d1a);   // basement gloom
  floor.visible = !on;
  border.material.color.setHex(on ? 0xcc4466 : 0x5555cc); // fleshy red bounds
  _FOG.color.setHex(on ? 0x0d0509 : 0x0d0d1a);
  scene.fog = _FOG;
  CABINET_STYLE.mode = on ? 'binding' : null;
  player.setCabinetStyle(on ? 'binding' : null);
  audio.setCabinetSound(on ? 'binding' : null);   // v164: the gun changes voice
}
function startBinding() {
  bindingMode = true;
  bindingRoomN = 1;
  bindingFloor = 1;
  _bdSavedSmash = smashMode; smashMode = true;   // borrow the WHOLE room system
  _bdSavedPixel = pixelMode; pixelMode = true;
  applyPerfMode();
  setBindingLook(true);
  startGame();
}
function exitBinding() {
  bindingMode = false;
  smashMode = _bdSavedSmash;
  pixelMode = _bdSavedPixel;
  applyPerfMode();
  setBindingLook(false);
  applyArenaMode(landscapeMode);
}

// LOADOUT (v152, roadmap M5 cabinet #4 — Re-Loaded tribute): gunmetal
// mission rooms. Pick a loadout (weapon + perk) at the door, then rotating
// objectives — PURGE (eliminate all), DEMOLISH (smash the generators),
// HOLD OUT (survive the clock). A fresh loadout offer every 2nd mission.
let loadoutMode = false;
let loMission = 1;        // current mission number (== wave)
let loObjective = null;   // 'purge' | 'demolish' | 'holdout'
let loTimer = 0;          // HOLD OUT countdown
let loTrickleT = 0;
let loDone = false;       // objective met, transition pending
let _loSavedSmash = null;
let _loHeavyArmed = false;  // v158: one-shot flag — startGame resets, then we scale
const LO_LOADOUTS = [
  { id: 'gunner', pod: 'S2', perk: 'firerate' },
  { id: 'lancer', pod: 'L',  perk: 'pierce' },
  { id: 'runner', pod: 'R',  perk: 'speed' },
  { id: 'tank',   pod: 'B2', perk: 'hp' },
];
function setLoadoutLook(on) {
  setCabGround(on ? 'loadout' : null);   // v167: the reference has GROUND
  scene.background.setHex(on ? 0x0a0c08 : 0x0d0d1a);   // oil-dark olive
  floor.visible = !on;
  border.material.color.setHex(on ? 0x77cc33 : 0x5555cc); // toxic green bounds
  _FOG.color.setHex(on ? 0x0a0c08 : 0x0d0d1a);
  _FOG.near = on ? 34 : 42; _FOG.far = on ? 70 : 80;   // v162: the theater reveal
  scene.fog = _FOG;
  CABINET_STYLE.mode = on ? 'loadout' : null;
  player.setCabinetStyle(on ? 'loadout' : null);
  audio.setCabinetSound(on ? 'loadout' : null);   // v164: the gun changes voice
}
function startLoadout() {
  loadoutMode = true;
  arenaScale = 1.9;   // v162: the theater of operations scrolls
  loMission = 0;
  loObjective = null; loDone = false;
  _loHeavyArmed = true;   // v158: heavier rounds applied after startGame's reset
  _loSavedSmash = smashMode; smashMode = false;
  applyPerfMode();
  setLoadoutLook(true);
  startGame();
  showLoadoutPicks();   // the door: pick your kit before mission 1
}
function exitLoadout() {
  loadoutMode = false;
  arenaScale = 1;
  smashMode = _loSavedSmash;
  applyPerfMode();
  setLoadoutLook(false);
  applyArenaMode(landscapeMode);
}
function showLoadoutPicks() {
  gameState = 'upgrade';
  const picks = [...LO_LOADOUTS].sort(() => Math.random() - 0.5).slice(0, 3);
  const panel = document.createElement('div');
  panel.id = 'upgrade-panel';
  panel.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.78);z-index:60;font-family:monospace,sans-serif;color:#fff;';
  const title = document.createElement('div');
  title.style.cssText = 'font-size:24px;font-weight:bold;margin-bottom:24px;color:#aaff66;text-shadow:0 0 20px #66cc22;';
  title.textContent = t('loPick');
  panel.appendChild(title);
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;justify-content:center;';
  panel.appendChild(row);
  for (const lo of picks) {
    const btn = document.createElement('div');
    btn.dataset.ui = '1';
    btn.style.cssText = 'background:#141a10;border:2px solid #77cc33;border-radius:8px;padding:20px 24px;min-width:140px;max-width:180px;text-align:center;cursor:pointer;box-shadow:0 0 18px rgba(119,204,51,0.25);';
    btn.innerHTML = `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#bbff77">${t('lo_' + lo.id)}</div>` +
      `<div style="font-size:12px;opacity:0.75;color:#dfffc0">${t('lo_' + lo.id + '_d')}</div>`;
    btn.addEventListener('pointerdown', () => {
      panel.remove();
      equipWeapon(lo.pod);
      applyUpgrade(lo.perk);
      gameState = 'playing';
      spawnWave();
    });
    row.appendChild(btn);
  }
  document.body.appendChild(panel);
}

// KAIKKI IRTI 3 (v159, roadmap M5 cabinet #5 — Tapan Kaikki 3 tribute):
// grim DOS-street carnage. Money from EVERYTHING — kills pay cash, crates
// pop cash, and between missions THE SHOP sells the escalating arsenal
// (the sanctioned exception to shooting-stays-Toko: the run's guns are
// BOUGHT, not dropped — convoys stay home). Kill everything, get paid,
// buy bigger, repeat.
let kaikkiMode = false;
let kkCash = 0;          // the wallet — separate from score, spent in THE SHOP
let kkDone = false;      // mission cleared, shop pending
let kkCrates = [];
let kkBought = new Set(); // weapons already owned this run (one purchase each)
let _kkSavedSmash = null, _kkSavedPixel = null;
class KkCrate {
  constructor(sc, x, z) {
    this.alive = true;
    this.x = x; this.z = z;
    this.hp = 2;
    this.mat = new THREE.MeshBasicMaterial({ color: 0x6b5233 });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), this.mat);
    this.mesh.position.set(x, 0.4, z);
    this.mesh.rotation.y = Math.random() * 0.6;
    sc.add(this.mesh);
  }
  hit() {
    this.hp--;
    this.mat.color.setHex(this.hp > 0 ? 0x8a6a44 : 0x6b5233);
    if (this.hp <= 0) {
      this.alive = false;
      const pu = new Powerup(scene, this.x, this.z, 'score');
      pu._life = 12;
      pu._value = 100 + wave * 20;
      pu.mesh.geometry.dispose();
      pu.mesh.geometry = CASH_GEO;
      pu.mat.color.setHex(0x99ee66);
      powerups.push(pu);
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2;
        chunkPool.spawn(this.x, 0.5, this.z, Math.cos(a) * 3.5, 2.5, Math.sin(a) * 3.5, 0x8a6a44, 0.1);
      }
      audio.enemyDieType('cube');
    }
  }
  remove(sc) { sc.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}
function clearKaikkiLevel() {
  for (const c of kkCrates) c.remove(scene);
  kkCrates = [];
}
function setKaikkiLook(on) {
  setCabGround(on ? 'kaikki' : null);   // v167: the reference has GROUND
  scene.background.setHex(on ? 0x0d0d0d : 0x0d0d1a);   // wet asphalt
  floor.visible = !on;
  border.material.color.setHex(on ? 0xbb2222 : 0x5555cc); // blood-red bounds
  _FOG.color.setHex(on ? 0x0d0d0d : 0x0d0d1a);
  _FOG.near = on ? 30 : 42; _FOG.far = on ? 64 : 80;   // v162: the street reveal
  scene.fog = _FOG;
  CABINET_STYLE.mode = on ? 'kaikki' : null;
  player.setCabinetStyle(on ? 'kaikki' : null);
  audio.setCabinetSound(on ? 'kaikki' : null);   // v164: the gun changes voice
}
function startKaikki() {
  kaikkiMode = true;
  arenaScale = 1.7;   // v162: the city scrolls
  kkCash = 0;
  kkDone = false;
  kkBought = new Set();
  _kkSavedSmash = smashMode; smashMode = false;
  _kkSavedPixel = pixelMode; pixelMode = true;
  applyPerfMode();
  setKaikkiLook(true);
  startGame();
}
function exitKaikki() {
  kaikkiMode = false;
  arenaScale = 1;
  clearKaikkiLevel();
  smashMode = _kkSavedSmash;
  pixelMode = _kkSavedPixel;
  applyPerfMode();
  setKaikkiLook(false);
  applyArenaMode(landscapeMode);
}
// THE SHOP (v159): between every mission. Weapons are one-time buys;
// supplies restock. Prices are flat — the carnage pays more as you go.
const KK_SHOP = [
  { id: 'uzi',     cost: 500,  once: true,  buy: () => { equipWeapon('R');  applyUpgrade('firerate'); } },
  { id: 'shotgun', cost: 900,  once: true,  buy: () => { equipWeapon('S2'); applyUpgrade('bigbullets'); } },
  { id: 'laser',   cost: 1200, once: true,  buy: () => { equipWeapon('L');  applyUpgrade('pierce'); } },
  { id: 'sinko',   cost: 1800, once: true,  buy: () => { equipWeapon('B2'); applyUpgrade('pierce'); applyUpgrade('bigbullets'); } },
  { id: 'medkit',  cost: 400,  once: false, buy: () => { player.hp = Math.min(player.maxHp, player.hp + 2); } },
  { id: 'kevlar',  cost: 700,  once: false, buy: () => applyUpgrade('hp') },
  { id: 'boots',   cost: 600,  once: false, buy: () => applyUpgrade('speed') },
];
function showKaikkiShop() {
  gameState = 'upgrade';
  const panel = document.createElement('div');
  panel.id = 'upgrade-panel';
  panel.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.82);z-index:60;font-family:monospace,sans-serif;color:#fff;overflow-y:auto;';
  const title = document.createElement('div');
  title.style.cssText = 'font-size:24px;font-weight:bold;margin-bottom:6px;color:#ff5544;text-shadow:0 0 20px #aa1111;';
  title.textContent = t('kkShop');
  panel.appendChild(title);
  const cashLine = document.createElement('div');
  cashLine.style.cssText = 'font-size:15px;color:#99ee66;margin-bottom:18px;';
  panel.appendChild(cashLine);
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center;max-width:640px;';
  panel.appendChild(row);
  const paint = () => {
    cashLine.textContent = `${t('kkCash')}: ${kkCash}`;
    row.innerHTML = '';
    for (const item of KK_SHOP) {
      const owned = item.once && kkBought.has(item.id);
      const afford = kkCash >= item.cost;
      const btn = document.createElement('div');
      btn.dataset.ui = '1';
      btn.style.cssText = 'background:#1a1210;border:2px solid ' +
        (owned ? '#333' : afford ? '#bb2222' : '#553333') + ';border-radius:8px;' +
        'padding:14px 16px;min-width:120px;max-width:150px;text-align:center;' +
        `cursor:${owned || !afford ? 'default' : 'pointer'};opacity:${owned ? 0.45 : afford ? 1 : 0.6};`;
      btn.innerHTML = `<div style="font-size:14px;font-weight:bold;margin-bottom:5px;color:#ff8877">${t('kk_' + item.id)}</div>` +
        `<div style="font-size:11px;opacity:0.7;color:#ffbbaa;margin-bottom:6px">${t('kk_' + item.id + '_d')}</div>` +
        `<div style="font-size:13px;color:${owned ? '#666' : '#99ee66'}">${owned ? t('kkOwned') : '₵' + item.cost}</div>`;
      if (!owned && afford) {
        btn.addEventListener('pointerdown', e => {
          e.stopPropagation();
          kkCash -= item.cost;
          if (item.once) kkBought.add(item.id);
          item.buy();
          audio.kaChing();   // v164: the till rings
          paint();
        });
      }
      row.appendChild(btn);
    }
  };
  paint();
  const go = document.createElement('div');
  go.dataset.ui = '1';
  go.textContent = t('kkNext');
  go.style.cssText = 'margin-top:22px;pointer-events:auto;cursor:pointer;user-select:none;' +
    'font-size:16px;font-weight:bold;padding:12px 34px;border-radius:8px;' +
    'background:rgba(187,34,34,0.2);border:2px solid #ff5544;color:#ffddcc;text-shadow:0 0 12px #aa1111;';
  go.addEventListener('pointerdown', e => {
    e.stopPropagation();
    panel.remove();
    gameState = 'playing';
    spawnWave();
  });
  panel.appendChild(go);
  document.body.appendChild(panel);
}

// ── NEX DEUS (v173): the FINAL cabinet ─────────────────────────────────────────────────────────
// Unlocked by beating the bar in all five cabinets (nexProgress() === 5).
// The machine that dreamed the other five: a fixed near-black arena where
// neon rings warn and then ERUPT squads drawn from every cabinet's roster
// (zone surges), LOST PLAYERS blink in on a countdown to be carried home,
// and the dash is a weapon — it wipes bullets and wounds everything it
// passes through (this cabinet only).
let nexdeusMode = false;
let nxSurges = [];        // { x, z, t, ring, list, col, spd, itv }
let nxHumans = [];        // { civ, t, tMax } — timed rescues
let nxHumanAt = [];       // waveTimer marks for the next lost-player drop
let nxChain = 0;
let _nxSavedSmash = null, _nxSavedPixel = null;
function clearNexLevel() {
  for (const su of nxSurges) {
    scene.remove(su.ring);
    su.ring.geometry.dispose();
    su.ring.material.dispose();
  }
  nxSurges = [];
  for (const h of nxHumans) h.civ.remove(scene);
  nxHumans = [];
  nxHumanAt = [];
  nxChain = 0;
}
function setNexdeusLook(on) {
  setCabGround(on ? 'nexdeus' : null);
  scene.background.setHex(on ? 0x020006 : 0x0d0d1a);   // void, not room
  floor.visible = !on;
  border.material.color.setHex(on ? 0xff44ff : 0x5555cc);  // hard magenta rim
  _FOG.color.setHex(on ? 0x020006 : 0x0d0d1a);
  _FOG.near = on ? 34 : 42; _FOG.far = on ? 72 : 80;
  scene.fog = _FOG;
  CABINET_STYLE.mode = on ? 'nexdeus' : null;
  player.setCabinetStyle(on ? 'nexdeus' : null);
  audio.setCabinetSound(on ? 'nexdeus' : null);
}
function startNexdeus() {
  nexdeusMode = true;
  _nxSavedSmash = smashMode; smashMode = false;
  _nxSavedPixel = pixelMode; pixelMode = true;
  applyPerfMode();
  setNexdeusLook(true);
  startGame();
}
function exitNexdeus() {
  nexdeusMode = false;
  clearNexLevel();
  smashMode = _nxSavedSmash;
  pixelMode = _nxSavedPixel;
  applyPerfMode();
  setNexdeusLook(false);
  applyArenaMode(landscapeMode);
}

// Cabinet row (v153): the arcade cabinets are a single-select MOD — picked on
// the title's cabinet row or in OPTIONS right under SMASH TV, only one armed
// at a time. TAP TO START then plays the selected cabinet (OFF = classic).
const CABINETS = ['tokotron', 'gaundrop', 'binding', 'loadout', 'kaikki'];
// v172: per-cabinet HIGH SCORES (deepest wave/level/floor/mission reached on
// full runs — quests never count) + the NEX DEUS unlock they feed. Clearing
// all five thresholds powers on the final cabinet (v173).
function cabBestsGet() {
  try { return JSON.parse(localStorage.getItem('tokoDropCabBests') || '{}'); }
  catch (_) { return {}; }
}
function cabBestSet(mode, val) {
  const b = cabBestsGet();
  if ((b[mode] || 0) >= val) return;
  b[mode] = val;
  localStorage.setItem('tokoDropCabBests', JSON.stringify(b));
}
const NEX_REQ = { tokotron: 5, gaundrop: 3, binding: 2, loadout: 4, kaikki: 3 };
function nexProgress() {
  const b = cabBestsGet();
  return CABINETS.filter(c => (b[c] || 0) >= NEX_REQ[c]).length;
}
// v173: the sixth slot only exists once the machine is powered — a stale or
// hand-edited save can never arm a cabinet the profile hasn't earned.
const cabSelOk = v => CABINETS.includes(v) || (v === 'nexdeus' && nexProgress() >= 5);
let cabinetSel = (() => {
  const v = localStorage.getItem('tokoDropCabinet');
  return cabSelOk(v) ? v : null;
})();
function setCabinetSel(v) {
  cabinetSel = cabSelOk(v) ? v : null;
  localStorage.setItem('tokoDropCabinet', cabinetSel ?? '');
}
function startRun() {
  if      (cabinetSel === 'tokotron') startTokotron();
  else if (cabinetSel === 'gaundrop') startGaundrop();
  else if (cabinetSel === 'binding')  startBinding();
  else if (cabinetSel === 'loadout')  startLoadout();
  else if (cabinetSel === 'kaikki')   startKaikki();
  else if (cabinetSel === 'nexdeus')  startNexdeus();
  else startGame();
}

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
// PIXEL PREVIEW (v147, tribute-wing foundation): render the world at a chunky
// low resolution with nearest-neighbor upscale — the shared look every arcade
// tribute mode (roadmap M5) will build on. HUD/UI canvas stays crisp: the
// modern+classic mix. DEV toggle for now so the feel can be dialed in early.
let pixelMode = localStorage.getItem('tokoDropPixel') === '1';
let _perfSavedTrans = null;
function applyPerfMode() {
  // v151: cabinet looks run through the RetroPass render-target pipeline (per-
  // profile internal resolution + palette/scanline shader); the old 0.22-DPR
  // trick survives only as the PIXEL PREVIEW dev profile.
  const cab = tokotronMode ? 'tokotron' : gaundropMode ? 'gaundrop'
            : bindingMode  ? 'binding'  : loadoutMode ? 'loadout'
            : kaikkiMode   ? 'kaikki'
            : nexdeusMode  ? 'nexdeus'
            : pixelMode ? 'preview' : null;
  retro.setCabinet(cab, renderer);
  renderer.setPixelRatio(Math.min(devicePixelRatio, perfMode ? 1.25 : 2));
  renderer.domElement.style.imageRendering = '';
  VIS.hz = (cab && cab !== 'preview') ? 12 : 0;   // sprite-era stepped visuals
  // v129: the 1024² shadow pass is the third big GPU cost — drop it too.
  // Flat-lit cabinets (vector/NES) never want shadows either (v151).
  sun.castShadow = !perfMode && cab !== 'tokotron' && cab !== 'gaundrop' && cab !== 'loadout' && cab !== 'kaikki' && cab !== 'nexdeus';
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
  // VOLATILE affix (v145): the fuse pays off — a slow 8-bullet ring from the
  // corpse. The orange strobe telegraphed it the whole time.
  if (e._affix === 'volatile') {
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * Math.PI * 2;
      bullets.spawnDir(e.position.x, e.position.z, Math.cos(a), Math.sin(a),
        false, 0xff8833, false, e.type);
    }
    addShake(0.12);
  }
  streak++;
  score += 100 * streak * (scoreMultT > 0 ? 2 : 1) * (dailyMod === 'glass' ? 2 : 1)   // v179: GLASS pays double
         * killScoreMult                                                              // v180: GAMBLER's card
         * (gauntlet ? gauntlet.mult : cabQuest ? cabQuest.mult : 1);
  if (vampireOn && ++vampireKills % 25 === 0 && player.hp < player.maxHp) {
    player.hp++;                                     // v180: the suds provide
    milestoneT = 1.1; milestoneText = 'THE SUDS PROVIDE (+1 HP)';
    audio.pickup();
  }
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
  // BINDING hearts (v157): the basement pays in life — kills sometimes
  // drop a suds-heart that fades fast. The item build is the run; hearts
  // keep it alive long enough to matter.
  if (bindingMode && Math.random() < 0.10 && powerups.length < 12) {
    const pu = new Powerup(scene, e.position.x, e.position.z, 'hp',
      (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6);
    pu._life = 8.0;
    powerups.push(pu);
  }
  // SMASH TV (v114): kills sometimes drop cash that lies on the floor — walk
  // over it before it fades. Big money. Big prizes.
  if (smashMode && !bindingMode && Math.random() < 0.15 && powerups.length < 14) {
    const pu = new Powerup(scene, e.position.x, e.position.z, 'score',
      (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6);
    pu._life = 6.0;
    powerups.push(pu);
  }
  if (kaikkiMode) kkCash += Math.round(10 + e.radius * 20);   // v159: every body pays
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
  // v167 (KAIKKI parity): the streets remember — kills leave BLOOD, not goo.
  puddles.push(new Puddle(scene, e.position.x, e.position.z,
    kaikkiMode ? 0x7a0f0f : e.color, e.radius * (kaikkiMode ? 2.0 : 1.5)));
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
    seed: runSeed, mode: nexdeusMode ? 'nexdeus' : kaikkiMode ? 'kaikki' : loadoutMode ? 'loadout' : bindingMode ? 'binding' : gaundropMode ? 'gaundrop' : tokotronMode ? 'tokotron' : roguelikeMode ? 'roguelike' : 'arcade',
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
    seed: runSeed, mode: nexdeusMode ? 'nexdeus' : kaikkiMode ? 'kaikki' : loadoutMode ? 'loadout' : bindingMode ? 'binding' : gaundropMode ? 'gaundrop' : tokotronMode ? 'tokotron' : roguelikeMode ? 'roguelike' : 'arcade',
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
    getCabinet: () => cabinetSel,
    setCabinet: v => setCabinetSel(v),
    getNexInfo: () => ({ progress: nexProgress(), unlocked: nexProgress() >= 5,
                         bests: cabBestsGet(), req: NEX_REQ }),
    getSmash: () => smashMode,
    setSmash: on => {
      smashMode = on;
      localStorage.setItem('tokoDropSmash', on ? '1' : '0');
      // The mode has its own fixed room size (v115) — re-frame the title arena
      // immediately when toggled from the title's OPTIONS panel.
      if (gameState === 'title' || gameState === 'options') applyArenaMode(landscapeMode);
    },
    getPixel: () => pixelMode,
    setPixel: on => {
      pixelMode = on;
      localStorage.setItem('tokoDropPixel', on ? '1' : '0');
      applyPerfMode();
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

  // LOADOUT objective line (v152), top-center.
  if (loadoutMode && gameState === 'playing' && loObjective) {
    let txt = '';
    if (loObjective === 'assault') {
      txt = loDone ? 'POST DESTROYED' : 'ASSAULT — DESTROY THE COMMAND POST';
    } else if (loObjective === 'purge') {
      const left = enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0) + pendingSpawns.length;
      txt = loDone ? 'PURGED' : `PURGE — ${left} LEFT`;
    } else if (loObjective === 'demolish') {
      txt = loDone ? 'DEMOLISHED' : `DEMOLISH — ${gdGenerators.length} GENERATORS`;
    } else {
      txt = loDone ? 'HELD' : `HOLD OUT — ${Math.max(0, loTimer).toFixed(0)}s`;
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px monospace, sans-serif';
    ctx.shadowColor = '#77cc33';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#bbff77';
    ctx.fillText(txt, uiCanvas.width / 2, 26);
    ctx.restore();
  }

  // KAIKKI IRTI 3 line (v159): the one objective + the wallet.
  if (kaikkiMode && gameState === 'playing') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px monospace, sans-serif';
    ctx.shadowColor = '#bb2222';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff6655';
    const left = enemies.reduce((n2, e) => n2 + (e.alive ? 1 : 0), 0) + pendingSpawns.length;
    ctx.fillText(kkDone ? 'STREETS CLEARED' : `KILL EVERYTHING — ${left} LEFT`,
      uiCanvas.width / 2, 26);
    ctx.font = 'bold 13px monospace, sans-serif';
    ctx.shadowColor = '#336622';
    ctx.fillStyle = '#99ee66';
    ctx.fillText(`₵ ${kkCash}`, uiCanvas.width / 2, 44);
    ctx.restore();
  }

  // GAUNDROP line (v156): level + lock state, and the hunger clock when it
  // gets loud. Canvas HUD stays English (lang.js header rule).
  if (gaundropMode && gameState === 'playing' && gdExit) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px monospace, sans-serif';
    ctx.shadowColor = '#cc8833';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffbb66';
    ctx.fillText(`LEVEL ${wave} — ${gdExit.locked ? 'FIND A KEY' : 'EXIT OPEN'}` +
      (gdKeys > 0 ? `  ·  KEYS ×${gdKeys}` : ''),
      uiCanvas.width / 2, 26);
    if (gdHungerT < 10) {
      ctx.font = 'bold 13px monospace, sans-serif';
      ctx.shadowColor = '#ff3322';
      ctx.fillStyle = Math.sin(performance.now() * 0.012) > 0 ? '#ff5544' : '#ffaa88';
      ctx.fillText(`HUNGRY — EAT SUDS!  ${Math.max(0, gdHungerT).toFixed(0)}s`,
        uiCanvas.width / 2, 62);
    }
    ctx.restore();
  }

  // CABINET QUEST tag (v154): live multiplier + beats, top-center.
  if (cabQuest && gameState === 'playing') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px monospace, sans-serif';
    ctx.shadowColor = '#ffcc33';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffdd66';
    ctx.fillText(`BONUS QUEST  ×${cabQuest.mult}  ·  ${cabQuest.done}/${cabQuest.goal}`,
      uiCanvas.width / 2, 44);
    ctx.restore();
  }

  // GAUNTLET tag (v146): the live pinball multiplier, top-center.
  if (gauntlet && gameState === 'playing') {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px monospace, sans-serif';
    ctx.shadowColor = '#ffcc33';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffdd66';
    ctx.fillText(`GAUNTLET  ×${gauntlet.mult}  ·  ROOM ${gauntlet.roomIdx + 1}/${gauntlet.rooms.length}`,
      uiCanvas.width / 2, 26);
    ctx.restore();
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
  ctx.fillText('v180', 16, uiCanvas.height - 12);

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
    btn.textContent = `${t('rogue')}: ${!on ? t('off') : rogueB ? 'B' : 'A'}`;
    btn.style.cssText =
      'display:inline-block;pointer-events:auto;cursor:pointer;user-select:none;' +
      'font-size:14px;font-weight:bold;padding:8px 18px;border-radius:8px;' +
      'background:rgba(0,0,0,0.35);transition:all 0.12s;' +
      `border:2px solid ${on ? '#00ccaa' : '#445'};` +
      `color:${on ? '#00ffcc' : '#7777aa'};` +
      `text-shadow:${on ? '0 0 12px #00ccaa' : 'none'};`;
    hint.textContent = !on ? t('rogueOffH') : rogueB ? t('rogueBH') : t('rogueOnH');
  };
  render();
  const toggle = e => {
    e.stopPropagation();
    e.preventDefault();
    // three-state cycle: OFF → A → B → OFF
    if (!roguelikeMode)      { roguelikeMode = true;  rogueB = false; }
    else if (!rogueB)        { rogueB = true; }
    else                     { roguelikeMode = false; rogueB = false; }
    localStorage.setItem('tokoDropRogue2', roguelikeMode ? '1' : '0');
    localStorage.setItem('tokoDropRogueB', rogueB ? '1' : '0');
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
    // v179: name the day's twist right on the chip hint
    const _tm = todaysMod();
    const modTag = _tm ? `  ·  ${t('todayMod')}: ${DAILY_MODS[_tm].label}` : '';
    dhint.textContent = (on ? t('dailyOnH') : t('dailyOffH')) + modTag + todayBest;
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

  // v170 (user direction): the cabinet PICKER lives in OPTIONS (the cycle
  // button under SMASH TV) — the title only reminds you what's armed so
  // TAP TO START never launches a surprise.
  if (cabinetSel) {
    const CAB_NOTE_COLOR = {
      tokotron: '#88f4ff', gaundrop: '#ffbb66', binding: '#ff99bb',
      loadout: '#bbff77', kaikki: '#ff6655', nexdeus: '#ff44ff',
    };
    const note = document.createElement('div');
    note.style.cssText = 'font-size:12px;margin-top:12px;letter-spacing:1px;' +
      `color:${CAB_NOTE_COLOR[cabinetSel]};opacity:0.85;`;
    const _cb = cabBestsGet()[cabinetSel] || 0;
    note.textContent = `${t('cabRow')}: ${t(cabinetSel)}` +
      (_cb > 0 ? `  ·  ${t('cabBest')} ${_cb}` : '') + `  ·  ${t('options')}`;
    slot.appendChild(note);
    const noteHint = document.createElement('div');
    noteHint.style.cssText = 'font-size:11px;opacity:0.45;margin-top:4px';
    noteHint.textContent = t(cabinetSel + 'H');
    slot.appendChild(noteHint);
  }

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
        mode: `${nexdeusMode ? 'nexdeus' : kaikkiMode ? 'kaikki' : loadoutMode ? 'loadout' : bindingMode ? 'binding' : gaundropMode ? 'gaundrop' : tokotronMode ? 'tokotron' : roguelikeMode ? 'roguelike' : 'arcade'}${smashMode ? '+smash' : ''}${dailyMod ? '+' + dailyMod : ''}`,
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
  const frameMat = new THREE.MeshBasicMaterial({ color: bindingMode ? 0xcfc0a8 : 0x2a2a55 });   // v169: bone arches in the basement
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
  for (const c of civilians)    c.remove(scene); civilians     = [];
  clearElectrodes();
  clearGaundropLevel();
  clearBounty();
  for (const g of gates)        g.remove(scene); gates         = [];
  clearArenaObjectives();   // v175: vault/escort/chain die with the wave state
  clearHazards();           // v176: vents/drain/surge too
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
  // Binding fight rooms use the cabinet's own roster (v157) — only BOSS
  // rooms keep the smash schedule (tokotron/gaundrop build their own floods).
  const list = (tokotronMode || gaundropMode || loadoutMode || kaikkiMode || nexdeusMode ||
                (smashMode && smashRoomKind === 'bonus') ||     // v178: pure loot, no fight
                (bindingMode && smashRoomKind !== 'boss')) ? [] : getEnemySchedule(wave);
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
        affix: entry.affix || null,
      });
    }
  });
  if (player._hasShield) player._shield = true;
  if (!inCabinet() && wave >= 3) {
    if (gates.length >= 2) { gates[0].remove(scene); gates.shift(); }
    // v175: from wave 5 some gates run the RISK cycle; from 10 they wander
    gates.push(new Gate(scene, wave >= 5 && rng() < 0.35, wave >= 10));
  }

  // GAUNDROP remake (v156): a REAL tile dungeon per level — drunkard-walk
  // corridors + room clearings carved on a seeded grid, merged stone runs,
  // the player at the near corner and a LOCKED exit at the far one (find the
  // KEY from level 2). Generators pour GHOST streams (faster with depth),
  // BAMBU lobbers arc over the walls, a wall-phasing WRAITH haunts level 3+,
  // suds food fights the hunger drain, and a POTION clears the floor.
  if (gaundropMode) {
    clearGaundropLevel();
    const lvl = wave;
    gdKeys = 0;
    gdHungerT = 38;   // v162: the scrolled dungeon is twice the walk
    // ── carve the maze ──
    const cols = Math.max(9, Math.floor((HALF_X * 2 - 2) / 2.4));
    const rows = Math.max(7, Math.floor((HALF_Z * 2 - 2) / 2.4));
    const cw = (HALF_X * 2 - 2) / cols, ch = (HALF_Z * 2 - 2) / rows;
    const cX = i => -HALF_X + 1 + (i + 0.5) * cw;
    const cZ = j => -HALF_Z + 1 + (j + 0.5) * ch;
    const open = Array.from({ length: cols }, () => new Array(rows).fill(false));
    const carve = (i, j) => { if (i >= 0 && i < cols && j >= 0 && j < rows) open[i][j] = true; };
    const walk = (i0, j0, i1, j1) => {   // wide drunkard's walk — guaranteed arrival
      let i = i0, j = j0, guard = 0;
      carve(i, j);
      while ((i !== i1 || j !== j1) && guard++ < 500) {
        if (rng() < 0.5) i += Math.sign(i1 - i) || (rng() < 0.5 ? 1 : -1);
        else             j += Math.sign(j1 - j) || (rng() < 0.5 ? 1 : -1);
        i = Math.max(0, Math.min(cols - 1, i));
        j = Math.max(0, Math.min(rows - 1, j));
        carve(i, j); carve(i + 1, j);
      }
    };
    const pi = 1, pj = 1, xi = cols - 2, xj = rows - 2;
    walk(pi, pj, xi, xj);
    walk(pi, pj, xi, 1);
    walk(pi, pj, 1, xj);
    // v162: carve effort scales with the grid AREA — the scrolled dungeon
    // stays corridors-and-halls instead of a solid mass with slits.
    const nRooms = 3 + Math.floor(cols * rows / 80);
    for (let r = 0; r < nRooms; r++) {   // room clearings, each wired in
      const ri = 1 + Math.floor(rng() * (cols - 4));
      const rj = 1 + Math.floor(rng() * (rows - 4));
      for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) carve(ri + a, rj + b);
      walk(pi, pj, ri + 1, rj);
    }
    for (let w2 = Math.floor(cols * rows / 130); w2 > 0; w2--) {  // cross-halls
      walk(1 + Math.floor(rng() * (cols - 2)), 1 + Math.floor(rng() * (rows - 2)),
           1 + Math.floor(rng() * (cols - 2)), 1 + Math.floor(rng() * (rows - 2)));
    }
    for (let n = Math.floor(cols * rows * 0.13); n > 0; n--) {  // loops, not tubes
      carve(Math.floor(rng() * cols), Math.floor(rng() * rows));
    }
    // ── merged stone runs from closed cells ──
    // v167: BRICK walls — shared canvas texture, per-wall UVs scaled so a
    // brick stays ~2.2 world units regardless of run length.
    const wallMat = () => new THREE.MeshBasicMaterial({ color: 0xffffff, map: GD_BRICK_TEX });
    for (let j = 0; j < rows; j++) {
      let run = -1;
      for (let i = 0; i <= cols; i++) {
        const closed = i < cols && !open[i][j];
        if (closed && run < 0) run = i;
        if (!closed && run >= 0) {
          const x0 = cX(run) - cw / 2, x1 = cX(i - 1) + cw / 2;
          const hx = (x1 - x0) / 2, hz = ch / 2;
          const wx = (x0 + x1) / 2, wz = cZ(j);
          const wallGeo = new THREE.BoxGeometry(hx * 2, 1.2, hz * 2);
          {   // v167: stretch the brick UVs with the run so courses stay square
            const uv = wallGeo.attributes.uv;
            const rep = Math.max(1, (hx * 2) / 2.2);
            for (let k = 0; k < uv.count; k++) uv.setX(k, uv.getX(k) * rep);
            uv.needsUpdate = true;
          }
          const mesh = new THREE.Mesh(wallGeo, wallMat());
          mesh.position.set(wx, 0.6, wz);
          // v161: TORCHLIGHT (finally living up to the art direction) — an
          // amber flame plane on every long run; TORCH_MAT flickers globally.
          if (hx > 1.6 && rng() < 0.7) {
            const torch = new THREE.Mesh(TORCH_GEO, TORCH_MAT);
            torch.position.set((rng() * 2 - 1) * hx * 0.6, 0.9, 0);
            mesh.add(torch);
          }
          scene.add(mesh);
          gdWalls.push({ mesh, x: wx, z: wz, hx, hz });
          run = -1;
        }
      }
    }
    const openCells = [];
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++)
      if (open[i][j]) openCells.push([i, j]);
    const pickCell = (minD = 0) => {
      for (let t = 0; t < 50; t++) {
        const [i, j] = openCells[Math.floor(rng() * openCells.length)];
        if (Math.hypot(cX(i) - cX(pi), cZ(j) - cZ(pj)) >= minD) return [cX(i), cZ(j)];
      }
      const [i, j] = openCells[Math.floor(rng() * openCells.length)];
      return [cX(i), cZ(j)];
    };
    // ── you, the exit, the key ──
    player.mesh.position.set(cX(pi), player.mesh.position.y, cZ(pj));
    player.grantInvincibility(1.0);
    {
      const ex = cX(xi), ez = cZ(xj);
      const locked = lvl >= 2;
      const mat = new THREE.MeshBasicMaterial({ color: locked ? 0xff4455 : 0xffcc33,
        transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(ex, 0.03, ez);
      scene.add(mesh);
      gdExit = { mesh, mat, x: ex, z: ez, locked, _lockPingT: 0 };
      // v168 (Gauntlet parity): locked internal DOORS across the halls —
      // gold slabs on open cells, each opened by one key from the inventory.
      // Keys spawn (doors + 1) deep so the exit is always payable; the maze's
      // loops keep routes alive around a door you can't afford yet.
      const nDoors = locked ? Math.min(2, 1 + Math.floor(lvl / 4)) : 0;
      for (let i = 0; i < nDoors; i++) {
        const [dx2, dz2] = pickCell(9);
        const doorGeo = new THREE.BoxGeometry(cw * 0.96, 1.25, ch * 0.96);
        const doorMesh = new THREE.Mesh(doorGeo,
          new THREE.MeshBasicMaterial({ color: 0xd8a020 }));
        doorMesh.position.set(dx2, 0.62, dz2);
        scene.add(doorMesh);
        const rec = { mesh: doorMesh, x: dx2, z: dz2, hx: cw * 0.48, hz: ch * 0.48, _pingT: 0 };
        gdWalls.push(rec);      // blocks + eats bullets via the wall kit
        gdDoors.push(rec);
      }
      if (locked) {
        for (let i = 0; i < nDoors + 1; i++) {
          const [kx, kz] = pickCell(8);
          const pu = new Powerup(scene, kx, kz, 'key');
          pu._life = 999;
          pu.mesh.geometry.dispose();
          pu.mesh.geometry = KEY_GEO;   // v169: a key that LOOKS like a key
          powerups.push(pu);
        }
      }
    }
    // ── generators: the ghost engine ──
    const nGen = Math.min(6, 2 + Math.floor(lvl / 2));   // v170: more engines
    const ghostRate = Math.max(0.9, 1.5 - lvl * 0.06);   // v170: pour faster
    for (let i = 0; i < nGen; i++) {
      const [gx, gz] = pickCell(8);
      const roll = rng();
      const ty = roll < 0.55 ? EnemyType.GHOST            // v170: wider pool
               : roll < 0.72 ? EnemyType.ORANGE_CUBE
               : roll < 0.84 ? EnemyType.SLUDGE_CUBE      // poison trails in the halls
               : roll < 0.94 ? (lvl >= 3 ? EnemyType.REDD_MINI : EnemyType.GHOST)
               : (lvl >= 4 ? EnemyType.YELA_CUBE : EnemyType.GHOST);
      gdGenerators.push(new Generator(scene, gx, gz, ty, ty === EnemyType.GHOST ? ghostRate : 2.2));
    }
    // ── lobbers arc over walls from level 2; the wraith haunts level 3+ ──
    if (lvl >= 2) {
      for (let i = 0; i < 1 + (lvl >= 5 ? 1 : 0); i++) {
        const [bx, bz] = pickCell(9);
        enemies.push(new Enemy(scene, EnemyType.BAMBU, bx, bz, speedMult, intervalMult));
      }
    }
    if (lvl >= 2) {   // v170: the dread comes a level earlier — two deep down
      enemies.push(new Enemy(scene, EnemyType.WRAITH, cX(xi), cZ(1), speedMult, intervalMult));
      if (lvl >= 5) enemies.push(new Enemy(scene, EnemyType.WRAITH, cX(1), cZ(xj), speedMult, intervalMult));
    }
    // ── loot: suds food (the hunger answer), treasure, maybe a potion ──
    const nLoot = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < nLoot; i++) {
      const [lx, lz] = pickCell(4);
      const pu = new Powerup(scene, lx, lz, rng() < 0.5 ? 'hp' : 'score');
      pu._life = 999;
      if (pu._type === 'score') { pu._value = 200 + lvl * 40; pu.mesh.geometry.dispose(); pu.mesh.geometry = CASH_GEO; pu.mat.color.setHex(0xffcc44); }
      else { pu.mesh.geometry.dispose(); pu.mesh.geometry = FOOD_GEO; pu.mat.color.setHex(0xcc8855); }   // v169: suds-meat
      powerups.push(pu);
    }
    if (lvl >= 2 && rng() < 0.6) {
      const [px2, pz2] = pickCell(7);
      const pu = new Powerup(scene, px2, pz2, 'potion');
      pu._life = 999;
      pu.mesh.geometry.dispose();
      pu.mesh.geometry = POTION_GEO;   // v169: a flask that LOOKS like a flask
      powerups.push(pu);
    }
    // ── a welcome party already loose in the halls ──
    const n0 = Math.min(18, 6 + lvl * 2);   // v170: the halls are ALREADY busy
    for (let i = 0; i < n0; i++) {
      const [px, pz] = pickCell(7);
      const roll2 = rng();
      const ty0 = roll2 < 0.55 ? EnemyType.GHOST
                : roll2 < 0.8 ? EnemyType.ORANGE_CUBE
                : (lvl >= 3 ? EnemyType.WEEVA : EnemyType.GHOST);   // v170: variety
      pendingSpawns.push({ type: ty0,
        delay: 0.2 + i * 0.06, px, pz, angle: 0, shooter: false, clusterOffset: null, speedMult, intervalMult });
    }
    clusterSpawnAt = [];
  }

  // BINDING fight rooms (v157 remake): Isaac-shaped — a seeded ROCK layout
  // (blocks bullets and bodies both ways, reuses the dungeon wall kit) and
  // the cabinet's own roster ALREADY IN THE ROOM when you walk in: FLIT
  // orbit-swarms, SPITTLE arc-spitters, lane-charging CHARGERs (floor 2+),
  // HOPPERs. Compositions scale with the floor; bosses keep the smash boss.
  if (bindingMode && smashRoomKind !== 'item' && smashRoomKind !== 'boss') {
    clearGaundropLevel();          // previous room's rocks
    // v163: CHASMS (floor 2+, ~1/3 of fight rooms) — the pit shapes the
    // room: bodies can't cross, bullets fly over. Red-rimmed voids.
    if (bindingFloor >= 2 && rng() < 0.38) {
      const pit = (x, z, hx, hz) => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(hx * 2, hz * 2),
          new THREE.MeshBasicMaterial({ color: 0x030103 }));
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.02, z);
        const rim = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.PlaneGeometry(hx * 2, hz * 2)),
          new THREE.LineBasicMaterial({ color: 0x772233 }));
        rim.rotation.x = -Math.PI / 2;
        rim.position.set(x, 0.035, z);
        scene.add(mesh, rim);
        bdChasms.push({ mesh, rim, x, z, hx, hz });
      };
      const cp = Math.floor(rng() * 3);
      if (cp === 0) {
        pit(0, 0, 3.4, 2.4);                       // the center void
      } else if (cp === 1) {
        pit(-HALF_X * 0.32, 0, 1.3, HALF_Z * 0.42); // twin strips
        pit( HALF_X * 0.32, 0, 1.3, HALF_Z * 0.42);
      } else {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          pit(sx * HALF_X * 0.4, sz * HALF_Z * 0.4, 1.7, 1.4);  // corner pits
        }
      }
    }
    const rock = (x, z, hx = 0.9, hz = 0.9) => {
      // v161: rocks read ORGANIC — jittered footprint, height, tilt, and a
      // two-tone flesh-stone palette (collision stays axis-aligned).
      hx *= 0.85 + rng() * 0.35;
      hz *= 0.85 + rng() * 0.35;
      // v163: pits are placed first — no rocks hovering in the void
      for (const c of bdChasms) {
        if (Math.abs(x - c.x) < c.hx + hx && Math.abs(z - c.z) < c.hz + hz) return;
      }
      const h = 0.6 + rng() * 0.55;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, h, hz * 2),
        new THREE.MeshBasicMaterial({ color: rng() < 0.5 ? 0x5a3a44 : 0x6a4a50 }));
      mesh.position.set(x, h / 2, z);
      mesh.rotation.y = (rng() - 0.5) * 0.5;
      scene.add(mesh);
      gdWalls.push({ mesh, x, z, hx, hz });
    };
    const mx = HALF_X * 0.45, mz = HALF_Z * 0.45;
    const pat = Math.floor(rng() * 5);
    if (pat === 0) {               // four pillars
      rock(-mx, -mz); rock(mx, -mz); rock(-mx, mz); rock(mx, mz);
    } else if (pat === 1) {        // center cross
      rock(0, 0, 2.6, 0.9); rock(0, 0, 0.9, 2.6);
    } else if (pat === 2) {        // diagonal ring
      for (let a = 0; a < 4; a++) {
        const th = a * Math.PI / 2 + Math.PI / 4;
        rock(Math.cos(th) * 5.5, Math.sin(th) * 5.5);
      }
    } else if (pat === 3) {        // two flanking bars
      rock(-HALF_X * 0.35, 0, 0.9, 3.2); rock(HALF_X * 0.35, 0, 0.9, 3.2);
    } else {                       // scattered boulders, clear of doors/center
      for (let i = 0; i < 5; i++) {
        let bx2, bz2, tr = 0;
        do {
          bx2 = (rng() * 2 - 1) * (HALF_X - 3.5);
          bz2 = (rng() * 2 - 1) * (HALF_Z - 3.5);
        } while ((Math.hypot(bx2, bz2) < 3 ||
                  (Math.abs(bx2) > HALF_X - 4 && Math.abs(bz2) < 2.5) ||
                  (Math.abs(bz2) > HALF_Z - 4 && Math.abs(bx2) < 2.5)) && ++tr < 20);
        rock(bx2, bz2);
      }
    }
    // the room's residents — present on entry, Isaac-style, never on you
    const f = bindingFloor;
    const kind = smashRoomKind || 'normal';
    const T = EnemyType;
    // v170: harder floors, and the basement breeds classic guests too
    const comp = kind === 'swarm'
      ? { [T.FLIT]: 12 + f * 3, [T.HOPPER]: 2 + Math.floor(f / 2), [T.GLOBBO]: 2 }
      : kind === 'spike'
      ? { [T.CHARGER]: 2 + Math.floor(f / 2) + 1, [T.SPITTLE]: 4, [T.HOPPER]: 3, [T.PURP_CUBE]: f >= 2 ? 1 : 0 }
      : { [T.FLIT]: 5 + f * 2, [T.SPITTLE]: 2 + Math.floor(f / 2), [T.CHARGER]: f >= 1 ? 1 : 0, [T.HOPPER]: 2, [T.GLOBBO]: f >= 2 ? 2 : 0 };
    for (const [tyStr, n] of Object.entries(comp)) {
      const ty = +tyStr;
      for (let i = 0; i < n; i++) {
        let px, pz, tries = 0;
        do {
          px = (rng() * 2 - 1) * (HALF_X - 1.8);
          pz = (rng() * 2 - 1) * (HALF_Z - 1.8);
        } while ((gdInsideWall(px, pz, 0.8) || bdInsideChasm(px, pz, 0.8) ||
                  Math.hypot(px - player.position.x, pz - player.position.z) < 5) && ++tries < 25);
        const en = new Enemy(scene, ty, px, pz, speedMult, intervalMult);
        enemies.push(en);
        gooChunkPool.spawn(px, 0.5, pz, 0, 2.5, 0, en.color, 0.10);
      }
    }
  } else if (bindingMode) {
    clearGaundropLevel();          // item/boss rooms stay clear of rocks
  }

  // BINDING OF TOKO item room (v150): no enemies — one glowing pedestal in
  // the middle, doors already open. Take the item, or don't, and move on.
  if (bindingMode && smashRoomKind === 'item') {
    const pu = new Powerup(scene, 0, 0, 'item');
    pu._life = 999;
    powerups.push(pu);
    exitPhase  = true;
    exitDoors  = pickSmashExits();
    for (const ed of exitDoors) ed.kind = bindingKindFor(bindingRoomN + 1);
    roomTallyT = 0;
  }

  // LOADOUT missions (v158 remake): every mission is fought around THE
  // COMPOUND — a walled base east of your staging point, gated on the west
  // (the assault route) with a narrow back gate, TURRET emplacements on the
  // inside corners, and TROOPER riflemen in the mix. Rotating objectives:
  // PURGE the field, DEMOLISH the generators inside, HOLD OUT on the clock,
  // or ASSAULT the command post dug in at the back.
  if (loadoutMode) {
    clearGaundropLevel();
    loMission = wave;
    loDone = false;
    loTrickleT = 2.0;
    const objs = ['purge', 'demolish', 'holdout', 'assault'];
    loObjective = objs[(wave - 1) % 4];
    const wallMat = () => new THREE.MeshBasicMaterial({ color: 0x39422e });
    const seg = (x, z, hx, hz) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, 1.15, hz * 2), wallMat());
      mesh.position.set(x, 0.58, z);
      scene.add(mesh);
      gdWalls.push({ mesh, x, z, hx, hz });
    };
    const ccx = HALF_X * 0.32;                          // compound center, east of mid
    const cw2 = HALF_X * 0.52, ch2 = HALF_Z * 0.58;     // half extents
    const gate = ch2 * 0.36;                            // west gate half-width
    seg(ccx, -ch2, cw2, 0.42);                          // north wall
    seg(ccx,  ch2, cw2, 0.42);                          // south wall
    seg(ccx - cw2, -(gate + (ch2 - gate) / 2), 0.42, (ch2 - gate) / 2);  // west, gated
    seg(ccx - cw2,  (gate + (ch2 - gate) / 2), 0.42, (ch2 - gate) / 2);
    const bg = gate * 0.5;                              // narrow back gate
    seg(ccx + cw2, -(bg + (ch2 - bg) / 2), 0.42, (ch2 - bg) / 2);        // east
    seg(ccx + cw2,  (bg + (ch2 - bg) / 2), 0.42, (ch2 - bg) / 2);
    // you stage OUTSIDE, west of the walls
    player.mesh.position.set(-HALF_X + 2.5, player.mesh.position.y, 0);
    player.grantInvincibility(1.0);
    // corner turret emplacements inside — more with depth
    const nTur = Math.min(4, 2 + Math.floor(wave / 3));   // v170: two from the door
    const tPos = [[ccx - cw2 + 1.6, -ch2 + 1.6], [ccx - cw2 + 1.6, ch2 - 1.6],
                  [ccx + cw2 - 1.6, ch2 - 1.6], [ccx + cw2 - 1.6, -ch2 + 1.6]];
    for (let i = 0; i < nTur; i++) {
      enemies.push(new Enemy(scene, EnemyType.TURRET, tPos[i][0], tPos[i][1], speedMult, intervalMult));
    }
    const pickInside = () => {
      let gx, gz, tries = 0;
      do {
        gx = ccx + (rng() * 2 - 1) * (cw2 - 2.5);
        gz = (rng() * 2 - 1) * (ch2 - 2.5);
      } while (gdInsideWall(gx, gz, 1.2) && ++tries < 30);
      return [gx, gz];
    };
    if (loObjective === 'demolish') {
      const nGen = Math.min(4, 2 + Math.floor(wave / 4));
      const types = [EnemyType.TROOPER, EnemyType.GLOBBO, EnemyType.ORANGE_CUBE];
      for (let i = 0; i < nGen; i++) {
        const [gx, gz] = pickInside();
        gdGenerators.push(new Generator(scene, gx, gz, types[Math.floor(rng() * types.length)]));
      }
    } else if (loObjective === 'assault') {
      // the command post: one big hardened generator at the back of the base
      const post = new Generator(scene, ccx + cw2 * 0.55, 0, EnemyType.TROOPER, 5.0);
      post.hp = 14;
      post.mesh.scale.setScalar(1.55);
      post.mat.color.setHex(0x4a5a3a);
      {   // v161: an antenna mast + red beacon — the COMMAND read
        const mast = new THREE.Mesh(MAST_GEO, MAST_MAT);
        mast.position.y = 1.3;
        const beacon = new THREE.Mesh(BEACON_GEO, BEACON_MAT);
        beacon.position.y = 2.5;
        post.mesh.add(mast, beacon);
      }
      gdGenerators.push(post);
    } else if (loObjective === 'purge') {
      const n = Math.min(32, 12 + wave * 3);   // v170: a real occupation force
      for (let i = 0; i < n; i++) {
        let px, pz, tries = 0;
        do {
          px = (rng() * 2 - 1) * (HALF_X - 1.5);
          pz = (rng() * 2 - 1) * (HALF_Z - 1.5);
        } while ((gdInsideWall(px, pz, 0.8) ||
                  Math.hypot(px - player.position.x, pz - player.position.z) < 6) && ++tries < 20);
        const roll = rng();
        const ty = roll < 0.35 ? EnemyType.TROOPER
                 : roll < 0.6 ? EnemyType.GLOBBO
                 : roll < 0.8 ? EnemyType.ORANGE_CUBE
                 : roll < 0.9 ? EnemyType.YELA_CUBE
                 : roll < 0.96 ? (wave >= 3 ? EnemyType.CLOAKER : EnemyType.TROOPER)   // v170: ambushers
                 : (wave >= 4 ? EnemyType.DRAPER : EnemyType.TROOPER);   // v171: curtain teams
        pendingSpawns.push({ type: ty, delay: 0.2 + i * 0.05, px, pz,
          angle: 0, shooter: false, clusterOffset: null, speedMult, intervalMult });
      }
    } else {
      loTimer = 22 + wave * 1.5;   // HOLD OUT clock grows with depth
    }
    clusterSpawnAt = [];
  }

  // KAIKKI IRTI 3 missions (v159): city blocks, crates, and a crowd to
  // kill. Every mission is KILL EVERYTHING — the pay is the point: kills
  // fill the wallet, crates pop cash, THE SHOP opens when the street is
  // quiet. No convoys, no pods — the arsenal is bought.
  if (kaikkiMode) {
    clearGaundropLevel();
    clearKaikkiLevel();
    kkDone = false;
    // city blocks: two loose rows of buildings, streets between
    const wallMat = () => new THREE.MeshBasicMaterial({ color: 0x2a2a2e });
    const nBld = 5 + Math.floor(rng() * 3);   // v162: a scrolled city has blocks
    for (let i = 0; i < nBld; i++) {
      const hx = 1.6 + rng() * 1.6, hz = 1.3 + rng() * 1.4;
      const bx = (rng() * 2 - 1) * (HALF_X - hx - 3);
      const bz = ((i % 2 === 0 ? -1 : 1) * (0.35 + rng() * 0.35)) * (HALF_Z - hz - 3);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, 1.6, hz * 2), wallMat());
      mesh.position.set(bx, 0.8, bz);
      // v161: LIT WINDOWS on the street faces — most dark, a few glowing;
      // shared geometry/material ride the building (city-at-night read).
      for (const side of [-1, 1]) {
        const cols2 = Math.max(2, Math.floor(hx * 1.6));
        for (let r = 0; r < 2; r++) {
          for (let c2 = 0; c2 < cols2; c2++) {
            if (rng() < 0.55) continue;
            const win = new THREE.Mesh(WINDOW_GEO, WINDOW_MAT);
            win.position.set(-hx + (c2 + 0.5) * (hx * 2 / cols2), -0.32 + r * 0.62, side * (hz + 0.02));
            if (side < 0) win.rotation.y = Math.PI;
            mesh.add(win);
          }
        }
      }
      scene.add(mesh);
      gdWalls.push({ mesh, x: bx, z: bz, hx, hz });
    }
    // crates in the alleys — every one is money
    const nCrate = 9 + Math.floor(rng() * 5);   // v162
    for (let i = 0; i < nCrate; i++) {
      let cx2, cz2, tries = 0;
      do {
        cx2 = (rng() * 2 - 1) * (HALF_X - 2);
        cz2 = (rng() * 2 - 1) * (HALF_Z - 2);
      } while (gdInsideWall(cx2, cz2, 1.0) && ++tries < 20);
      kkCrates.push(new KkCrate(scene, cx2, cz2));
    }
    // you, at the south end of the street
    player.mesh.position.set(0, player.mesh.position.y, HALF_Z - 2.2);
    player.grantInvincibility(1.0);
    // the crowd — big, mixed, pouring in from all over
    const n = Math.min(46, 14 + wave * 4);   // v170: a proper riot
    for (let i = 0; i < n; i++) {
      let px, pz, tries = 0;
      do {
        px = (rng() * 2 - 1) * (HALF_X - 1.5);
        pz = (rng() * 2 - 1) * (HALF_Z - 1.5);
      } while ((gdInsideWall(px, pz, 0.8) ||
                Math.hypot(px - player.position.x, pz - player.position.z) < 6) && ++tries < 20);
      const roll = rng();
      const ty = roll < 0.25 ? EnemyType.THUG          // v169: the streets have people
               : roll < 0.42 ? EnemyType.GLOBBO
               : roll < 0.56 ? EnemyType.YELA_CUBE
               : roll < 0.70 ? EnemyType.ORANGE_CUBE
               : roll < 0.80 ? EnemyType.REDD_MINI
               : roll < 0.88 ? (wave >= 2 ? EnemyType.FANNER : EnemyType.GLOBBO)   // v170
               : roll < 0.93 ? (wave >= 3 ? EnemyType.SPITTOR : EnemyType.GLOBBO)
               : roll < 0.97 ? (wave >= 4 ? EnemyType.TORO : EnemyType.THUG)   // v170: joyriders
               : (wave >= 5 ? EnemyType.DRAPER : EnemyType.THUG);   // v171: street looms
      pendingSpawns.push({ type: ty, delay: 0.2 + i * 0.05, px, pz,
        angle: 0, shooter: false, clusterOffset: null, speedMult, intervalMult });
    }
    clusterSpawnAt = [];
  }

  // TOKOTRON remake (v155): full Robotron pacing — the ENTIRE wave
  // materializes AT ONCE around a recentered player (no trickle, a beat of
  // spawn grace), running the cabinet's own roster on scripted 8-wave loops:
  // GRUNT swarms that speed up the longer they live, ORBs seeding PROG
  // hunters, unkillable BRUTEs stalking the family, MINDERs converting
  // civilians into hostiles. Orange cubes remain honored guests.
  if (tokotronMode) {
    const loop = Math.floor((wave - 1) / 8);
    const wi   = (wave - 1) % 8;
    const k    = 1 + loop * 0.35;              // per-loop escalation
    const T    = EnemyType;
    // v170: harder + more varied — bigger swarms, and from wave 4 the wave
    // scripts pull GUEST types (mini swarms, botflies, weevas) into the mix.
    const comp = [
      { [T.GRUNT]: 15, [T.ORANGE_CUBE]: 3, civ: 4 },
      { [T.GRUNT]: 17, [T.ORB]: 2, [T.REDD_MINI]: 4, civ: 4 },
      { [T.GRUNT]: 12, [T.BRUTE]: 2, [T.ORANGE_CUBE]: 4, civ: 6 },
      { [T.GRUNT]: 19, [T.ORB]: 3, [T.ORANGE_CUBE]: 2, [T.BOTFLY]: 2, civ: 3 },
      { [T.GRUNT]: 11, [T.MINDER]: 3, [T.REDD_MINI]: 6, civ: 8 },
      { [T.GRUNT]: 21, [T.BRUTE]: 2, [T.ORB]: 3, [T.WEEVA]: 1, civ: 4 },
      { [T.GRUNT]: 13, [T.ORB]: 4, [T.ORANGE_CUBE]: 5, [T.BOTFLY]: 2, civ: 4 },
      { [T.GRUNT]: 19, [T.BRUTE]: 3, [T.MINDER]: 2, [T.ORB]: 3, [T.WEEVA]: 1, civ: 6 },
    ][wi];
    // Robotron opening: you appear center-room; the wave appears around you.
    player.mesh.position.set(0, player.mesh.position.y, 0);
    player.grantInvincibility(1.4);
    audio.waveZap();   // v164: the room materializes with a robotic double-zap
    for (const [tyStr, n0] of Object.entries(comp)) {
      if (tyStr === 'civ') continue;
      const ty = +tyStr;
      const heavyCap = ty === T.BRUTE || ty === T.MINDER;   // dread scales gently
      const n = Math.round(n0 * (heavyCap ? Math.min(k, 1.7) : k));
      for (let i = 0; i < n; i++) {
        let px, pz, tries = 0;
        do {
          px = (rng() * 2 - 1) * (HALF_X - 1.5);
          pz = (rng() * 2 - 1) * (HALF_Z - 1.5);
        } while (Math.hypot(px, pz) < 6.5 && ++tries < 20);
        const en = new Enemy(scene, ty, px, pz, speedMult, intervalMult);
        enemies.push(en);                     // instant materialize, no trickle
        for (let j = 0; j < 3; j++) {         // spawn-in flash
          const a = (j / 3) * Math.PI * 2 + rng() * 2;
          chunkPool.spawn(px, 0.6, pz, Math.cos(a) * 3.5, 3, Math.sin(a) * 3.5, en.color, 0.10);
        }
      }
    }
    for (const c of civilians) c.remove(scene);
    civilians = [];
    rescueChain = 0;
    for (let i = 0; i < comp.civ; i++) {
      civilians.push(new Civilian(scene,
        (rng() * 2 - 1) * (HALF_X - 2), (rng() * 2 - 1) * (HALF_Z - 2), i % 3));
    }
    // v168: ELECTRODES scatter the room — never near the recentered player
    clearElectrodes();
    const nEl = 6 + Math.floor(rng() * 4) + Math.min(4, loop);
    for (let i = 0; i < nEl; i++) {
      let ex2, ez2, tries = 0;
      do {
        ex2 = (rng() * 2 - 1) * (HALF_X - 2);
        ez2 = (rng() * 2 - 1) * (HALF_Z - 2);
      } while (Math.hypot(ex2, ez2) < 5 && ++tries < 20);
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.34, 0),
        new THREE.MeshBasicMaterial({ color: 0xffff55 }));
      mesh.position.set(ex2, 0.4, ez2);
      scene.add(mesh);
      tkElectrodes.push({ mesh, x: ex2, z: ez2 });
    }
    clusterSpawnAt = [];   // no convoys in the dark room
  }
  // NEX DEUS (v173): ZONE SURGES — rings of light appear at wave start, each
  // counting down to erupt a squad drawn from ONE of the five cabinets (the
  // arena itself is the spawner — no doors, no trickle). LOST PLAYERS drop
  // in mid-wave on a rescue countdown.
  if (nexdeusMode) {
    clearNexLevel();
    player.mesh.position.set(0, player.mesh.position.y, 0);
    player.grantInvincibility(1.4);
    audio.waveZap();
    const T = EnemyType;
    const k = 1 + (wave - 1) * 0.12;                     // per-surge escalation
    const POOLS = [
      { col: 0x44eeff, list: [[T.GRUNT, 7 + wave], [T.ORB, Math.min(3, 1 + (wave >> 1))]] },
      { col: 0xffaa44, list: [[T.GHOST, 8 + wave], [T.WRAITH, wave >= 3 ? 1 : 0]] },
      { col: 0xff88bb, list: [[T.FLIT, 4 + (wave >> 1)], [T.SPITTLE, 2], [T.HOPPER, wave >= 2 ? 2 : 0]] },
      { col: 0xbbff77, list: [[T.TROOPER, 4 + wave], [T.TURRET, 1 + Math.floor(wave / 3)]] },
      { col: 0xff5544, list: [[T.THUG, 9 + wave * 2]] },
    ];
    const nSurge = Math.min(5, 1 + Math.floor(wave / 2));   // 1,2,2,3,3,4,4,5…
    const order = [0, 1, 2, 3, 4].sort(() => rng() - 0.5);  // distinct pools per wave
    for (let i = 0; i < nSurge; i++) {
      const pool = POOLS[order[i % 5]];
      let sx, sz, tries = 0;
      do {
        sx = (rng() * 2 - 1) * (HALF_X - 4);
        sz = (rng() * 2 - 1) * (HALF_Z - 4);
      } while (Math.hypot(sx, sz) < 7 && ++tries < 20);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 3.2, 40),
        new THREE.MeshBasicMaterial({ color: pool.col, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(sx, 0.04, sz);
      scene.add(ring);
      const squad = [];
      for (const [ty, n0] of pool.list) {
        const n = Math.round(n0 * k);
        for (let j = 0; j < n; j++) squad.push(ty);
      }
      nxSurges.push({ x: sx, z: sz, t: 2.2 + i * 7.5, ring, list: squad, col: pool.col,
                      spd: speedMult, itv: intervalMult });
    }
    nxHumanAt = [];
    const nH = 2 + (wave % 2);
    for (let i = 0; i < nH; i++) nxHumanAt.push(4 + i * 9 + rng() * 4);
    nxHumanAt.sort((a, b) => a - b);
    clusterSpawnAt = [];   // the machine ships no cargo
  }
  // Schedule cargo convoys (start mid-wave, seeded position). SMASH TV runs a
  // second prize convoy per wave — big money, big prizes.
  const kind = (smashMode && smashRoomKind) ? smashRoomKind : waveKind(wave);
  // Secondary objectives (v133): an unclaimed bounty dies with its wave; every
  // 3rd wave (from 4, never boss waves) arms a new one for the spawn drain to
  // mark. CLEANSE foam appears every 4th wave from 6 — seeded, so daily runs
  // get identical placements.
  clearBounty();
  // v171: arm the arena curtain — a mid-wave spectacle, never on boss waves.
  // v177: the fixed-screen cabinets run their own curtains (scrolling worlds
  // skip — a 2× sheet is unreadable), and late waves roll VARIATIONS.
  const curtainOk = (!inCabinet() && wave >= 6) ||
                    (tokotronMode && wave >= 4) ||
                    (nexdeusMode && wave >= 2);
  curtainArmed = curtainOk && kind !== 'boss' && kind !== 'bonus' &&
                 rng() < (inCabinet() ? 0.45 : dailyMod === 'surge' ? 0.8 : 0.55);
  curtainStyle = (wave >= 10 && rng() < 0.35) ? 'cross'
               : (wave >= 8  && rng() < 0.45) ? 'diag' : 'wall';
  curtainColor = tokotronMode ? 0x44eeff : nexdeusMode ? 0xff44ff : 0xff66aa;
  curtainAt    = 5 + rng() * 6;
  curtainWarnT = 0;
  curtainCross = null;
  bountyArm = !inCabinet() && wave >= 4 && wave % 3 === 1 && kind !== 'boss';
  if (!inCabinet() && wave >= 6 && wave % 4 === 2) {
    foamZones.push(new FoamZone(scene,
      (rng() * 2 - 1) * (HALF_X - 4), (rng() * 2 - 1) * (HALF_Z - 4)));
  }
  // v175 living-arena objectives — VAULT greed and the ESCORT errand share
  // the classic/SMASH rotation on offset beats so they never stack.
  clearArenaObjectives();
  if (!inCabinet() && kind !== 'boss' && kind !== 'bonus' && wave >= 5 && wave % 4 === 3) {
    vaultCrate = new VaultCrate(scene,
      (rng() * 2 - 1) * (HALF_X - 5), (rng() * 2 - 1) * (HALF_Z - 5));
  }
  if (!inCabinet() && kind !== 'boss' && kind !== 'bonus' && wave >= 6 && wave % 4 === 1) {
    escortBot = new EscortBot(scene);
    milestoneT = 1.2; milestoneText = 'ESCORT THE BOT!';
  }
  // v176 hazards: the floor joins the show. HAZARD rooms are the vent venue;
  // classic runs get a lighter rotation. Everything hurts enemies too.
  clearHazards();
  const _svm = dailyMod === 'surge' ? 2 : 1;   // v179: SURGE DAY doubles the floor
  const ventN = ((smashMode && kind === 'hazard') ? 5 + Math.floor(rng() * 2)
              : (!inCabinet() && !smashMode && wave >= 7 && wave % 3 === 0 && kind !== 'boss') ? 2 + Math.floor(rng() * 2)
              : 0) * _svm;
  for (let i = 0; i < ventN; i++) {
    steamVents.push(new SteamVent(scene,
      (rng() * 2 - 1) * (HALF_X - 3), (rng() * 2 - 1) * (HALF_Z - 3)));
  }
  if (!inCabinet() && kind !== 'boss' &&
      ((smashMode && kind === 'hazard') ||
       (!smashMode && wave >= 9 && wave % (dailyMod === 'surge' ? 3 : 5) === 4 % (dailyMod === 'surge' ? 3 : 5)))) {
    drainZone = new Drain(scene,
      (rng() * 2 - 1) * (HALF_X - 6), (rng() * 2 - 1) * (HALF_Z - 6));
  }
  if (smashMode && kind === 'vault' && !vaultCrate) {
    vaultCrate = new VaultCrate(scene,
      (rng() * 2 - 1) * (HALF_X - 5), (rng() * 2 - 1) * (HALF_Z - 5));
  }
  // SUDS SURGE: SMASH-only mid-wave spectacle, never boss rooms
  sudsArmed = smashMode && !bindingMode && wave >= 6 && kind !== 'boss' && kind !== 'bonus' &&
              rng() < (dailyMod === 'surge' ? 0.7 : 0.4);
  sudsAt    = 6 + rng() * 4;
  sudsWarnT = 0;
  clusterTimer = 0;
  clusterSpawnAt = [3 + rng() * 5]; // 3-8 s into the wave — always overlaps live enemies
  if (smashMode) clusterSpawnAt.push(12 + rng() * 5);
  if (smashMode && kind === 'prize') clusterSpawnAt.push(7 + rng() * 3); // PRIZE room: 3rd convoy

  // SMASH TV valuables (v116): cash piles and the odd big prize scattered on
  // the room floor — walk over them. Rarely, a score-multiplier orb glitters
  // among them. Cleared with the room (spawnWave wipes powerups).
  if (smashMode) {
    const heavy = kind === 'spike' || kind === 'hazard';   // v120/v176: HEAVY + HAZARD pay 2×$
    const n = (3 + Math.floor(rng() * 4) + (heavy ? 1 : 0)) * (dailyMod === 'rich' ? 2 : 1);   // v179
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

  // v178 BONUS ROOM (plain SMASH): the floor's breather — a loot festival,
  // zero enemies, EXIT doors open from the first second. Grab and go.
  if (smashMode && !bindingMode && !gauntlet && kind === 'bonus') {
    const nLoot = 8 + Math.floor(rng() * 3);
    for (let i = 0; i < nLoot; i++) {
      const vx = (rng() * 2 - 1) * (HALF_X - 3);
      const vz = (rng() * 2 - 1) * (HALF_Z - 3);
      const pu = new Powerup(scene, vx, vz, 'score');
      pu._life = 999;
      pu._value = (250 + wave * 15) * (rng() < 0.2 ? 4 : 1);
      pu.mesh.geometry.dispose();
      pu.mesh.geometry = rng() < 0.2 ? PRIZE_GEO : CASH_GEO;
      pu.mat.color.setHex(rng() < 0.2 ? 0xffcc33 : 0x99ee66);
      powerups.push(pu);
    }
    const pod = new Powerup(scene, 0, 0, randomWeaponPodId(wave >= 8));
    pod._life = 999;
    powerups.push(pod);
    if (rng() < 0.5) {
      const sm = new Powerup(scene, (rng() * 2 - 1) * 4, (rng() * 2 - 1) * 4, 'scoremult');
      sm._life = 999;
      powerups.push(sm);
    }
    exitPhase = true;
    exitDoors = pickSmashExits();
    roomTallyT = 0;               // no tally — the room IS the reward
  }
  // v178: the studio re-lights per floor (no-op off smash / inside cabinets)
  applySmashFloorLook();

  // Wave-start banner (v114 SMASH / v123 classic): name the incoming pressure.
  if (bindingMode) {
    const k = ROOM_KINDS[smashRoomKind ?? 'normal'] ?? ROOM_KINDS.normal;
    waveIntroT     = waveIntroDur = 1.3;
    waveIntroText  = `BINDING — FLOOR ${bindingFloor}` + (smashRoomKind && smashRoomKind !== 'normal' ? ` · ${k.label}` : '');
    waveIntroColor = '#ff88bb';
  } else if (smashMode) {
    // SMASH TV: game-show room intro card, named + colored by room kind.
    // v178: floors get named once you're off the ground floor.
    waveIntroT     = waveIntroDur = 1.5;
    const floorTag = smashFloor > 1 ? `FLOOR ${smashFloor} · ` : '';
    waveIntroText  = kind === 'bonus' ? `FLOOR ${smashFloor} — BONUS ROOM`
                   : kind === 'normal' ? `${floorTag}WAVE ${wave}`
                   : `${floorTag}WAVE ${wave} — ${ROOM_KINDS[kind].label}`;
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
  } else if (tokotronMode) {
    waveIntroT = waveIntroDur = 1.2;
    waveIntroText  = `TOKOTRON — WAVE ${wave}`;
    waveIntroColor = '#44eeff';
  } else if (nexdeusMode) {
    waveIntroT = waveIntroDur = 1.4;
    waveIntroText  = `NEX DEUS — SURGE ${wave}`;
    waveIntroColor = '#ff44ff';
  } else if (gaundropMode) {
    waveIntroT = waveIntroDur = 1.2;
    waveIntroText  = `GAUNDROP — LEVEL ${wave}`;
    waveIntroColor = '#ffaa44';
  } else if (kaikkiMode) {
    waveIntroT = waveIntroDur = 1.3;
    waveIntroText  = `KAIKKI IRTI — MISSION ${wave}`;
    waveIntroColor = '#ff5544';
  } else if (loadoutMode) {
    waveIntroT = waveIntroDur = 1.4;
    waveIntroText = `MISSION ${wave} — ` +
      (loObjective === 'purge' ? 'PURGE' : loObjective === 'demolish' ? 'DEMOLISH'
       : loObjective === 'assault' ? 'ASSAULT' : 'HOLD OUT');
    waveIntroColor = '#aaff66';
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
  // v180 (M6): three new builds to chase
  { id: 'graze' }, { id: 'vampire' }, { id: 'longdash' },
];
// v180 CURSED CARDS: power at a price, plainly printed. From wave 6 one card
// slot sometimes turns purple — never forced, always a real trade.
const CURSED_POOL = [
  { id: 'x_berserk' },      // +fire rate, −1 max HP
  { id: 'x_glasscannon' },  // huge piercing shots, −1 max HP
  { id: 'x_leadfeet' },     // +2 max HP, −speed
  { id: 'x_gambler' },      // kills pay double, slower dash recharge
];
// v180 run-state the new cards ride on (reset every startGame)
let grazeMult = 1;
let vampireOn = false, vampireKills = 0;
let killScoreMult = 1;
const dropMaxHp = n => {
  player.maxHp = Math.max(1, player.maxHp - n);
  player.hp = Math.min(player.hp, player.maxHp);
};

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
  } else if (id === 'graze') {
    grazeMult = 3;                                   // v180: weaving pays triple
  } else if (id === 'vampire') {
    vampireOn = true;                                // v180: every 25 kills = +1 HP
  } else if (id === 'longdash') {
    player._dashDurMult = Math.min(1.7, (player._dashDurMult ?? 1) * 1.3);
  } else if (id === 'x_berserk') {
    player._fireRateMult *= 0.7;
    dropMaxHp(1);
  } else if (id === 'x_glasscannon') {
    BULLET_CONFIG.playerBulletScale = Math.min(3.0, BULLET_CONFIG.playerBulletScale * 1.5);
    BULLET_CONFIG.playerPiercing = true;
    dropMaxHp(1);
  } else if (id === 'x_leadfeet') {
    player.maxHp += 2;
    player.hp = Math.min(player.hp + 2, player.maxHp);
    player._speedMult *= 0.85;
  } else if (id === 'x_gambler') {
    killScoreMult = 2;
    player._dashCDMult = Math.min(3, player._dashCDMult + 0.3);
  }
}

function showUpgradeCards(afterPick = null) {
  // afterPick (v150): item-room pedestals hand out a FREE pick mid-room —
  // the caller decides what happens after (default: classic wave chaining).
  gameState = 'upgrade';
  overlay.style.display = 'none';

  // Roguelike B (v146): 2 regular mods + 1 rare gauntlet invitation.
  const pool = [...UPGRADE_POOL].sort(() => Math.random() - 0.5).slice(0, rogueB ? 2 : 3);
  // v180: from wave 6, ~35% of card screens turn one slot PURPLE — a cursed
  // trade with the price printed on the card. Never the only choice.
  if (wave >= 6 && Math.random() < 0.35) {
    pool[pool.length - 1] = {
      ...CURSED_POOL[Math.floor(Math.random() * CURSED_POOL.length)],
      cursed: true,
    };
  }
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
    const baseBorder = card.cursed ? '#aa22ff' : '#5555cc';
    btn.style.cssText = `background:${card.cursed ? '#1c1026' : '#1a1a2e'};border:2px solid ${baseBorder};` +
      'border-radius:8px;padding:20px 24px;min-width:140px;max-width:180px;text-align:center;cursor:pointer;' +
      (card.cursed ? 'box-shadow:0 0 16px rgba(170,34,255,0.35);' : '');
    btn.innerHTML =
      (card.cursed ? `<div style="font-size:10px;letter-spacing:2px;color:#cc66ff;margin-bottom:6px">${t('cursedTag')}</div>` : '') +
      `<div style="font-size:16px;font-weight:bold;margin-bottom:8px${card.cursed ? ';color:#dd99ff' : ''}">${t('c_' + card.id)}</div>` +
      `<div style="font-size:12px;opacity:0.65">${t('c_' + card.id + '_d')}</div>`;
    btn.addEventListener('pointerover', () => { btn.style.borderColor = card.cursed ? '#ee88ff' : '#00ccaa'; });
    btn.addEventListener('pointerout',  () => { btn.style.borderColor = baseBorder; });
    btn.addEventListener('pointerdown', () => {
      panel.remove();
      applyUpgrade(card.id);
      if (afterPick) afterPick();
      else { gameState = 'playing'; spawnWave(); }
    });
    row.appendChild(btn);
  }

  if (rogueB && !afterPick && !inCabinet() && !cabQuest && Math.random() < 0.55) {
    // v166 (user direction): the gold card is a SOMETIMES thing — a bit
    // over half of card screens roll a bonus quest at all, and the quest is
    // RANDOM (never the same one twice in a row). Scarcity is the appeal.
    let qMode;
    // v173: the god-machine joins the quest deck only on an unlocked profile
    const qPool = nexProgress() >= 5 ? [...QUEST_ORDER, 'nexdeus'] : QUEST_ORDER;
    do { qMode = qPool[Math.floor(Math.random() * qPool.length)]; }
    while (qPool.length > 1 && qMode === _lastQuestOffer);
    _lastQuestOffer = qMode;
    const tier = gauntletTier;
    const g = document.createElement('div');
    g.dataset.ui = '1';
    g.style.cssText = 'background:#2a2010;border:2px solid #ffcc33;border-radius:8px;' +
      'padding:20px 24px;min-width:140px;max-width:180px;text-align:center;cursor:pointer;' +
      'box-shadow:0 0 18px rgba(255,204,51,0.25);';
    const [qTitle, qDesc] = qMode === 'gauntlet'
      ? [t(tier === 1 ? 'g_t1' : 'g_t2'), t(tier === 1 ? 'g_t1_d' : 'g_t2_d')]
      : [t('q_' + qMode), t('q_' + qMode + '_d')];
    g.innerHTML = `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#ffdd66">` +
      `${qTitle}</div>` +
      `<div style="font-size:12px;opacity:0.75;color:#ffeebb">${qDesc}</div>`;
    g.addEventListener('pointerover', () => { g.style.borderColor = '#ffee88'; });
    g.addEventListener('pointerout',  () => { g.style.borderColor = '#ffcc33'; });
    g.addEventListener('pointerdown', () => {
      panel.remove();
      if (qMode === 'gauntlet') startGauntlet(tier);
      else startCabQuest(qMode);
    });
    row.appendChild(g);
  }

  document.body.appendChild(panel);
}

// ── BONUS GAUNTLET (v146, Roguelike B) ───────────────────────────────────────
// A goal-oriented detour built on the SMASH TV room machinery: fixed room
// sequence, all score ×mult (climbing per room, pinball-style), a RARE
// upgrade pick on completion. The regular smash toggle is restored after.
function startGauntlet(tier) {
  _gSavedSmash = smashMode;
  smashMode = true;
  gauntlet = tier === 1
    ? { tier, rooms: ['normal', 'swarm', 'spike', 'prize', 'boss'], roomIdx: 0, mult: 2, mega: false }
    : { tier, rooms: ['spike', 'spike', 'boss', 'boss'],            roomIdx: 0, mult: 2, mega: true };
  applyArenaMode(landscapeMode);
  roomX = 0; roomY = 0;
  visitedRooms = new Set(['0,0']);
  smashRoomKind = gauntlet.rooms[0];
  _entryDoor = null; _cameFromDoor = null;
  buildSmashDoors();
  gameState = 'playing';
  audio.announce('start');
  spawnWave();
}

// Rare upgrades — the gauntlet's payout: doubled-up versions of the pool.
const RARE_POOL = [
  { id: 'r_hp',     apply: () => { applyUpgrade('hp'); applyUpgrade('hp'); } },
  { id: 'r_rate',   apply: () => { applyUpgrade('firerate'); applyUpgrade('firerate'); } },
  { id: 'r_speed',  apply: () => { applyUpgrade('speed'); applyUpgrade('speed'); } },
  { id: 'r_pierce', apply: () => { applyUpgrade('pierce'); applyUpgrade('bigbullets'); } },
];
function finishGauntlet() {
  const bonus = 2500 * gauntlet.tier * gauntlet.mult;
  score += bonus;
  milestoneT = 1.2; milestoneText = `GAUNTLET CLEAR! +${bonus}`;
  gauntletTier++;
  smashMode = _gSavedSmash;
  gauntlet = null;
  smashRoomKind = null;
  applyArenaMode(landscapeMode);
  buildSmashDoors();          // clears the doors when smash is off
  audio.applause();
  showRareCards();
}
function showRareCards(afterPick = null) {
  gameState = 'upgrade';
  overlay.style.display = 'none';
  const picks = [...RARE_POOL].sort(() => Math.random() - 0.5).slice(0, 2);
  const panel = document.createElement('div');
  panel.id = 'upgrade-panel';
  panel.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);z-index:60;font-family:monospace,sans-serif;color:#fff;';
  const title = document.createElement('div');
  title.style.cssText = 'font-size:24px;font-weight:bold;margin-bottom:24px;color:#ffdd66;text-shadow:0 0 20px #ffaa00;';
  title.textContent = t('chooseRare');
  panel.appendChild(title);
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;justify-content:center;';
  panel.appendChild(row);
  for (const card of picks) {
    const btn = document.createElement('div');
    btn.dataset.ui = '1';
    btn.style.cssText = 'background:#2a2010;border:2px solid #ffcc33;border-radius:8px;padding:20px 24px;min-width:140px;max-width:180px;text-align:center;cursor:pointer;box-shadow:0 0 18px rgba(255,204,51,0.25);';
    btn.innerHTML = `<div style="font-size:16px;font-weight:bold;margin-bottom:8px;color:#ffdd66">${t('c_' + card.id)}</div>` +
      `<div style="font-size:12px;opacity:0.75;color:#ffeebb">${t('c_' + card.id + '_d')}</div>`;
    btn.addEventListener('pointerdown', () => {
      panel.remove();
      card.apply();
      if (afterPick) afterPick();
      else { gameState = 'playing'; spawnWave(); }
    });
    row.appendChild(btn);
  }
  document.body.appendChild(panel);
}

// ── CABINET BONUS QUESTS (v154, Roguelike B) ─────────────────────────────────
// Each quest borrows its cabinet's full machinery (look, spawn systems,
// runtime) mid-run — mirroring startX() minus the startGame() reset — and
// hands everything back via the cabinet's own exit on finish OR death.
function startCabQuest(mode) {
  cabQuest = { mode, goal: mode === 'binding' ? 3 : mode === 'gaundrop' ? 1 : 2, done: 0,
               mult: mode === 'nexdeus' ? 3 : 2 };   // v173: the endgame detour pays best
  // leftover classic-wave gates/bounty/foam don't belong inside a cabinet
  for (const g of gates) g.remove(scene);
  gates = [];
  clearArenaObjectives();
  clearHazards();
  clearBounty();
  for (const f of foamZones) f.remove(scene);
  foamZones = [];
  if (mode === 'tokotron') {
    tokotronMode = true;
    _tkSavedSmash = smashMode; smashMode = false;
    _tkSavedPixel = pixelMode; pixelMode = true;
    applyPerfMode();
    setTokotronLook(true);
    applyArenaMode(landscapeMode);   // v162: tokotron is a fixed room preset
  } else if (mode === 'gaundrop') {
    gaundropMode = true;
    arenaScale = 2.0;                // v162: quests scroll like the cabinet
    _gdSavedSmash = smashMode; smashMode = false;
    _gdSavedPixel = pixelMode; pixelMode = true;
    applyPerfMode();
    setGaundropLook(true);
    applyArenaMode(landscapeMode);
  } else if (mode === 'loadout') {
    loadoutMode = true;
    arenaScale = 1.9;                // v162
    loMission = wave; loObjective = null; loDone = false;
    _loSavedSmash = smashMode; smashMode = false;
    applyPerfMode();
    setLoadoutLook(true);            // no door pick inside a quest: bring your build
    applyArenaMode(landscapeMode);
  } else if (mode === 'kaikki') {
    kaikkiMode = true;
    arenaScale = 1.7;                // v162
    kkDone = false;
    _kkSavedSmash = smashMode; smashMode = false;
    _kkSavedPixel = pixelMode; pixelMode = true;
    applyPerfMode();
    setKaikkiLook(true);
    applyArenaMode(landscapeMode);
  } else if (mode === 'nexdeus') {
    nexdeusMode = true;
    _nxSavedSmash = smashMode; smashMode = false;
    _nxSavedPixel = pixelMode; pixelMode = true;
    applyPerfMode();
    setNexdeusLook(true);
    applyArenaMode(landscapeMode);   // fixed room preset, like tokotron
  } else if (mode === 'binding') {
    bindingMode = true;
    bindingRoomN = 1; bindingFloor = 1;
    _bdSavedSmash = smashMode; smashMode = true;
    _bdSavedPixel = pixelMode; pixelMode = true;
    applyPerfMode();
    setBindingLook(true);
    applyArenaMode(landscapeMode);
    roomX = 0; roomY = 0;
    visitedRooms = new Set(['0,0']);
    smashRoomKind = bindingKindFor(1);
    _entryDoor = null; _cameFromDoor = null;
    buildSmashDoors();
  }
  gameState = 'playing';
  audio.announce('start');
  spawnWave();
}
// Hand the borrowed cabinet back — shared by quest completion and death.
function exitCabQuest() {
  const m = cabQuest.mode;
  cabQuest = null;
  if (m === 'tokotron') {
    exitTokotron();
    for (const c of civilians) c.remove(scene);
    civilians = []; rescueChain = 0;
  } else if (m === 'gaundrop') {
    clearGaundropLevel();
    exitGaundrop();
  } else if (m === 'loadout') {
    clearGaundropLevel();        // loadout's walls/generators live in gd arrays
    loObjective = null; loDone = false;
    exitLoadout();
  } else if (m === 'kaikki') {
    clearGaundropLevel();      // the city blocks live in the wall kit
    exitKaikki();
  } else if (m === 'nexdeus') {
    exitNexdeus();             // clearNexLevel rides the exit
  } else if (m === 'binding') {
    exitBinding();
    smashRoomKind = null;
    exitPhase = false; exitDoors = []; roomTallyT = 0;
    buildSmashDoors();
  }
}
// One quest beat done (wave / mission / room / level): ramp or pay out.
function cabQuestAdvance() {
  cabQuest.done++;
  if (cabQuest.done >= cabQuest.goal) finishCabQuest();
  else { cabQuest.mult++; spawnWave(); }
}
function finishCabQuest() {
  const bonus = 3000 * cabQuest.mult;
  score += bonus;
  milestoneT = 1.2; milestoneText = `QUEST CLEAR! +${bonus}`;
  exitCabQuest();
  audio.applause();
  showRareCards();               // default afterPick resumes classic waves
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
  gauntlet = null; gauntletTier = 1; cabQuest = null; _lastQuestOffer = null;
  collectedUpgrades = []; hitEventLog = []; _lastHitTime = -1; _lbPosted = false;
  grazeMult = 1; vampireOn = false; vampireKills = 0; killScoreMult = 1;   // v180
  scheduleTutorialHints();
  BULLET_CONFIG.playerBulletScale  = 1.0;
  BULLET_CONFIG.playerPiercing     = false;
  BULLET_CONFIG.playerWeaponPierce = false;
  if (dailyMode && !testMode && !inCabinet()) {   // test/cabinet runs are never dailies
    // Same seed for everyone today: hash the UTC date through the PRNG once
    // so consecutive days land far apart in seed space.
    _dailyRun = new Date().toISOString().slice(0, 10);
    runSeed = (mulberry32(Number(_dailyRun.replaceAll('-', '')))() * 0xFFFFFF | 0) >>> 0;
    dailyMod = todaysMod();   // v179: the date's twist rides the same math
  } else {
    dailyMod = null;
    _dailyRun = null;
    runSeed = (Math.random() * 0xFFFFFF | 0) >>> 0;
  }
  rng = mulberry32(runSeed);
  player.reset();
  if (dailyMod === 'glass') { player.maxHp = 1; player.hp = 1; }   // v179: GLASS
  if (dailyMod) {
    milestoneT = 2.0;
    milestoneText = dailyMod === 'glass' ? 'GLASS DAY — 1 HP, KILLS PAY DOUBLE'
                  : dailyMod === 'surge' ? 'SURGE DAY — THE FLOOR FIGHTS HARDER'
                  : 'RICH DAY — DOUBLE LOOT, BIGGER CROWDS';
  }
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
  smashFloor = 1;               // v178: every run starts on studio floor 1
  applySmashFloorLook();
  _entryDoor = null; _cameFromDoor = null;
  buildSmashDoors();  // no-op unless SMASH TV mode is on
  _titleIntroPlayed = false;  // v121: arm the recorded intro for the next title visit
  audio.announce('start');
  if (_loHeavyArmed) {   // v158: LOADOUT fires heavier rounds — feel, not stats
    _loHeavyArmed = false;
    BULLET_CONFIG.playerBulletScale *= 1.2;
  }
  // LOADOUT holds mission 1 until the door pick — the pick itself calls
  // spawnWave() (loMission is 0 only between startLoadout and that pick).
  if (!(loadoutMode && loMission === 0)) spawnWave();
  gameState = 'playing';
}

// Tear down the finished run and go back to the title screen. Called by the
// death-screen feedback buttons (the screen no longer auto-dismisses, so the
// player has time to leave feedback) and by Space / Start as a quick skip.
function returnToTitle() {
  if (gameState !== 'gameover') return;
  if (tokotronMode) exitTokotron();   // v148: give back the borrowed toggles
  if (gaundropMode) exitGaundrop();   // v149: same deal for the dungeon
  if (bindingMode) exitBinding();     // v150: and the basement
  if (loadoutMode) exitLoadout();     // v152: and the armory
  if (kaikkiMode) exitKaikki();       // v159: and the streets
  if (nexdeusMode) exitNexdeus();     // v173: and the god-machine
  smashFloor = 1;                     // v178: the studio re-lights for the title
  applySmashFloorLook();
  clearFX();
  for (const e of enemies) e.removeFrom(scene);
  enemies = [];
  bullets.clear();
  overlay.style.pointerEvents = '';
  showTitle();
  gameState = 'title';
}

function triggerGameOver() {
  if (gauntlet) {                       // died inside a gauntlet: restore state
    smashMode = _gSavedSmash;
    gauntlet = null;
    smashRoomKind = null;
  }
  if (cabQuest) exitCabQuest();         // died inside a cabinet quest: same deal
  // v172: per-cabinet record — the depth this full run reached
  if      (tokotronMode) cabBestSet('tokotron', wave);
  else if (gaundropMode) cabBestSet('gaundrop', wave);
  else if (bindingMode)  cabBestSet('binding', bindingFloor);
  else if (loadoutMode)  cabBestSet('loadout', wave);
  else if (kaikkiMode)   cabBestSet('kaikki', wave);
  else if (nexdeusMode)  cabBestSet('nexdeus', wave);
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
    startRun();  // A / bumper / trigger starts from the title — unless the
                  // pad is focused on a menu chip (then A activates the chip)
  }
};
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused';  designer.show(); }
  else if (gameState === 'paused')  { gameState = 'playing'; designer.hide(); }
  else if (gameState === 'options') { gameState = 'title';   designer.hide(); }
  else if (gameState === 'title')   startRun();
  else if (gameState === 'gameover') returnToTitle();  // Start skips feedback
};

// Space also starts from title on desktop (keyup so the same keyup doesn't also trigger dash)
window.addEventListener('keyup', e => {
  // Don't hijack keys while the player is typing feedback.
  const tag = e.target?.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT') return;
  if (e.code === 'Space' && gameState === 'title') startRun();
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
  startRun();
}, { once: false });

player.onShoot = () => {
  audio.shoot();
  if (loadoutMode) {
    addShake(0.016);   // v158: the guns have shoulders
    // v167: and a muzzle flash — two hot sparks off the barrel
    for (let i = 0; i < 2; i++) {
      chunkPool.spawn(player.position.x, 0.55, player.position.z,
        (Math.random() - 0.5) * 3, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 3,
        0xffee88, 0.07);
    }
  }
};

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
    const bx = s.px != null ? s.px : Math.cos(s.angle) * HALF_X * edge;
    const bz = s.pz != null ? s.pz : Math.sin(s.angle) * HALF_Z * edge;
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
      // Gauntlet mega-boss (v146): the tier-2 finale hits far harder.
      const mega = gauntlet && gauntlet.mega && gauntlet.roomIdx === gauntlet.rooms.length - 1;
      const bossHpMult = mega ? 5 : 3;
      if (en.type !== EnemyType.BAMBU && en.type !== EnemyType.PYRA) {
        en.hp = Math.ceil(en.hp * bossHpMult); en._hpMult = bossHpMult;
      }
      en.mesh.scale.multiplyScalar(mega ? 1.7 : 1.5); en._radiusMult = mega ? 1.7 : 1.5;
      en.setBoss(en.hp);
      bossAuras.push(makeBossAura(en));
      // TWIN PRISMS (v174): the pair finds each other on arrival — opposite
      // orbit directions, offset volley clocks, and the survivor-rage link.
      if (en.type === EnemyType.PRISM) {
        const sib = enemies.find(x => x.alive && x !== en && x.type === EnemyType.PRISM);
        if (sib) {
          en._twin = sib; sib._twin = en;
          en._twinIdx = 1; sib._twinIdx = 0;
          en._orbitSign = -(sib._orbitSign ?? 1);
        }
      }
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
    // Elite affixes (v145): each with its own visible tell.
    if (s.affix) {
      en._affix = s.affix;
      if (s.affix === 'swift') {
        en._speedMult *= 1.35;               // tell: the ribbons it sheds
      } else if (s.affix === 'anchored') {
        // tell: squat, wide, stone-still silhouette — and it cannot be shoved
        en.mesh.scale.x *= 1.25; en.mesh.scale.z *= 1.25; en.mesh.scale.y *= 0.8;
      }
      // volatile's tell is its fuse glow (enemy.js) — the pop comes in onKill
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

  // LOADOUT runtime (v152): objectives tick, walls block, trickles pour.
  if (loadoutMode && player.alive && gameState === 'playing') {
    for (let i = gdGenerators.length - 1; i >= 0; i--) {
      const g = gdGenerators[i];
      g.update(dt);
      if (!g.alive) { g.remove(scene); gdGenerators.splice(i, 1); }
    }
    for (let bi = bullets.active.length - 1; bi >= 0; bi--) {
      const b = bullets.active[bi];
      if (b.isPlayer) {
        for (const g of gdGenerators) {
          if (g.alive && Math.abs(b.mesh.position.x - g.x) < 0.85 && Math.abs(b.mesh.position.z - g.z) < 0.85) {
            bullets.recycleAt(bi); g.hit(); break;
          }
        }
      }
      if (bullets.active[bi] === b && gdInsideWall(b.mesh.position.x, b.mesh.position.z, 0)) bullets.recycleAt(bi);
    }
    {
      const c = gdResolveWalls(player.position.x, player.position.z, PLAYER_RADIUS);
      player.mesh.position.x = c.x; player.mesh.position.z = c.z;
    }
    for (const e of enemies) {
      if (!e.alive) continue;
      const c = gdResolveWalls(e.position.x, e.position.z, e.radius * 0.8);
      e.position.x = c.x; e.position.z = c.z;
    }
    // HOLD OUT trickle (and a light drip during DEMOLISH from the field edges)
    if (loObjective === 'holdout' && !loDone) {
      loTimer -= dt;
      loTrickleT -= dt;
      const alive = enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0);
      if (loTrickleT <= 0 && alive < 20) {   // v170: the siege never thins
        loTrickleT = 1.8;
        const a2 = Math.random() * Math.PI * 2;
        const roll = Math.random();
        const ty = roll < 0.4 ? EnemyType.TROOPER : roll < 0.75 ? EnemyType.GLOBBO : EnemyType.ORANGE_CUBE;
        enemies.push(new Enemy(scene, ty,
          Math.cos(a2) * HALF_X * 0.95, Math.sin(a2) * HALF_Z * 0.95));
      }
    }
    // objective completion
    if (!loDone) {
      const alive = enemies.some(e => e.alive) || pendingSpawns.length > 0;
      const met = loObjective === 'purge'    ? !alive
                : (loObjective === 'demolish' || loObjective === 'assault')
                  ? gdGenerators.length === 0
                : loTimer <= 0;
      if (met) {
        loDone = true;
        const bonus = 1200 * wave;
        score += bonus;
        milestoneT = 1.2; milestoneText = `MISSION COMPLETE! +${bonus}`;
        pendingSpawns = [];
        for (const e of enemies) if (e.alive) { e.hp = 1; e.hit(e.position.x, e.position.z); onKill(e); }
        audio.waveClear();
        setTimeout(() => {
          if (!loadoutMode || gameState !== 'playing') return;
          if (cabQuest) { cabQuestAdvance(); return; }   // v154: quest beat
          if (wave % 2 === 0) showLoadoutPicks();   // fresh kit every 2nd mission
          else spawnWave();
        }, 1400);
      }
    }
  }

  // BINDING rocks (v157) + chasms (v163): rocks block bullets and bodies;
  // pits block ONLY bodies — bullets sail over the void.
  if (bindingMode && player.alive && (gdWalls.length || bdChasms.length)) {
    for (let bi = bullets.active.length - 1; bi >= 0; bi--) {
      const b = bullets.active[bi];
      if (gdInsideWall(b.mesh.position.x, b.mesh.position.z, 0)) bullets.recycleAt(bi);
    }
    {
      let c = gdResolveWalls(player.position.x, player.position.z, PLAYER_RADIUS);
      c = bdResolveChasms(c.x, c.z, PLAYER_RADIUS * 0.7);
      player.mesh.position.x = c.x; player.mesh.position.z = c.z;
    }
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.type === EnemyType.HOPPER && e.mesh.position.y > 0.5) continue;  // hops clear
      if (e.type === EnemyType.FLIT) continue;                               // flies clear
      let c = gdResolveWalls(e.position.x, e.position.z, e.radius * 0.8);
      c = bdResolveChasms(c.x, c.z, e.radius * 0.6);
      e.position.x = c.x; e.position.z = c.z;
    }
  }

  // KAIKKI IRTI 3 runtime (v159): crates take bullets and pay out,
  // buildings block everything, and a quiet street opens THE SHOP.
  if (kaikkiMode && player.alive && gameState === 'playing') {
    for (let bi = bullets.active.length - 1; bi >= 0; bi--) {
      const b = bullets.active[bi];
      if (b.isPlayer) {
        let ate = false;
        for (const c of kkCrates) {
          if (c.alive && Math.abs(b.mesh.position.x - c.x) < 0.7 && Math.abs(b.mesh.position.z - c.z) < 0.7) {
            bullets.recycleAt(bi); c.hit(); ate = true; break;
          }
        }
        if (ate) continue;
      }
      if (gdInsideWall(b.mesh.position.x, b.mesh.position.z, 0)) bullets.recycleAt(bi);
    }
    for (let i = kkCrates.length - 1; i >= 0; i--) {
      if (!kkCrates[i].alive) { kkCrates[i].remove(scene); kkCrates.splice(i, 1); }
    }
    {
      const c = gdResolveWalls(player.position.x, player.position.z, PLAYER_RADIUS);
      player.mesh.position.x = c.x; player.mesh.position.z = c.z;
    }
    for (const e of enemies) {
      if (!e.alive) continue;
      const c = gdResolveWalls(e.position.x, e.position.z, e.radius * 0.8);
      e.position.x = c.x; e.position.z = c.z;
    }
    if (!kkDone) {
      const alive = enemies.some(e => e.alive) || pendingSpawns.length > 0;
      if (!alive && enemies.length > 0) {
        kkDone = true;
        const bonus = 300 + 150 * wave;
        kkCash += bonus;
        score += bonus;
        milestoneT = 1.4; milestoneText = `MISSION CLEAR! +₵${bonus}`;
        audio.waveClear();
        setTimeout(() => {
          if (!kaikkiMode || gameState !== 'playing') return;
          if (cabQuest) { cabQuestAdvance(); return; }   // quests skip the shop
          showKaikkiShop();
        }, 1300);
      }
    }
  }

  // GAUNDROP runtime (v149): generators pour, walls block, the exit calls.
  if (gaundropMode && player.alive) {
    for (let i = gdGenerators.length - 1; i >= 0; i--) {
      const g = gdGenerators[i];
      g.update(dt);
      if (!g.alive) { g.remove(scene); gdGenerators.splice(i, 1); }
    }
    // player bullets vs generators
    for (let bi = bullets.active.length - 1; bi >= 0; bi--) {
      const b = bullets.active[bi];
      if (!b.isPlayer) continue;
      for (const g of gdGenerators) {
        if (!g.alive) continue;
        if (Math.abs(b.mesh.position.x - g.x) < 0.85 && Math.abs(b.mesh.position.z - g.z) < 0.85) {
          bullets.recycleAt(bi);
          g.hit();
          break;
        }
      }
    }
    // walls eat bullets from both sides — cover is real
    for (let bi = bullets.active.length - 1; bi >= 0; bi--) {
      const b = bullets.active[bi];
      if (gdInsideWall(b.mesh.position.x, b.mesh.position.z, 0)) bullets.recycleAt(bi);
    }
    // walls block bodies
    {
      const c = gdResolveWalls(player.position.x, player.position.z, PLAYER_RADIUS);
      player.mesh.position.x = c.x; player.mesh.position.z = c.z;
    }
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.type === EnemyType.WRAITH) continue;   // v156: it phases through
      const c = gdResolveWalls(e.position.x, e.position.z, e.radius * 0.8);
      e.position.x = c.x; e.position.z = c.z;
    }
    // v168: locked DOORS — a key opens each on touch; no key, a dull tink
    for (let i = gdDoors.length - 1; i >= 0; i--) {
      const d = gdDoors[i];
      d._pingT = Math.max(0, d._pingT - dt);
      if (Math.hypot(player.position.x - d.x, player.position.z - d.z) < d.hx + 1.1) {
        if (gdKeys > 0) {
          gdKeys--;
          for (let j = 0; j < 6; j++) {
            const a = (j / 6) * Math.PI * 2;
            chunkPool.spawn(d.x, 0.7, d.z, Math.cos(a) * 4, 3, Math.sin(a) * 4, 0xd8a020, 0.10);
          }
          audio.keyJingle();
          milestoneT = 1.0; milestoneText = `DOOR OPEN — KEYS ×${gdKeys}`;
          scene.remove(d.mesh);
          d.mesh.geometry.dispose();
          d.mesh.material.dispose();
          const wi2 = gdWalls.indexOf(d);
          if (wi2 >= 0) gdWalls.splice(wi2, 1);
          gdDoors.splice(i, 1);
        } else if (d._pingT <= 0) {
          d._pingT = 2.0;
          audio.shieldTink();
        }
      }
    }
    // v161: shared torch flame flicker — two beat frequencies read as fire
    TORCH_MAT.opacity = 0.5 + 0.22 * Math.sin(performance.now() * 0.013)
                            + 0.14 * Math.sin(performance.now() * 0.031);
    // the exit tile: step on it to descend — if you've earned the key
    if (gdExit) {
      gdExit.mat.opacity = 0.35 + 0.25 * Math.abs(Math.sin(performance.now() * 0.005));
      gdExit._lockPingT = Math.max(0, (gdExit._lockPingT || 0) - dt);
      if (gdExit.locked &&
          Math.hypot(player.position.x - gdExit.x, player.position.z - gdExit.z) < 1.6) {
        if (gdKeys > 0) {                       // v168: spend a key at the door
          gdKeys--;
          gdExit.locked = false;
          gdExit.mat.color.setHex(0xffcc33);
          milestoneT = 1.2; milestoneText = 'EXIT UNLOCKED';
          audio.keyJingle();
        } else if (gdExit._lockPingT <= 0) {
          gdExit._lockPingT = 2.0;
          milestoneT = 1.2; milestoneText = 'LOCKED — FIND A KEY';
          audio.shieldTink();
        }
      } else if (!gdExit.locked &&
          Math.hypot(player.position.x - gdExit.x, player.position.z - gdExit.z) < 1.1) {
        score += 1000 * (scoreMultT > 0 ? 2 : 1) * (cabQuest ? cabQuest.mult : 1);
        audio.descend();   // v164: the floor swallows you
        audio.waveClear();
        pendingSpawns = [];
        for (const e of enemies) e.removeFrom(scene);
        enemies = [];
        if (cabQuest) cabQuestAdvance();   // v154: the delve pays out up top
        else spawnWave();   // next level (spawnWave rebuilds walls/generators/exit)
      }
    }
    // Hunger (v156): the dungeon drains you — suds food is the answer.
    if (gameState === 'playing') {
      gdHungerT -= dt;
      if (gdHungerT <= 0) {
        gdHungerT = 22;
        milestoneT = 1.4; milestoneText = 'STARVING — EAT SUDS!';
        audio.hungerKnell();   // v164
        if (!player.invincible) {
          if (tryHitPlayer('starve', null)) triggerGameOver();
        }
      }
    }
  }

  // TOKOTRON civilians (v148): wander, get rescued by touch (chain pays
  // 1000 × chain, Robotron-style), or die to any enemy that reaches them.
  if (tokotronMode && player.alive) {
    // v168 ELECTRODES: shot → destroyed (+25); grunt touch → grunt dies;
    // BRUTE touch → electrode dies; player touch → a hit + the electrode.
    for (let i = tkElectrodes.length - 1; i >= 0; i--) {
      const el = tkElectrodes[i];
      el.mesh.rotation.y += 0.03;
      let gone = false;
      for (let bi = bullets.active.length - 1; bi >= 0; bi--) {
        const b = bullets.active[bi];
        if (!b.isPlayer) continue;
        if (Math.hypot(b.mesh.position.x - el.x, b.mesh.position.z - el.z) < 0.55) {
          bullets.recycleAt(bi);
          score += 25;
          gone = true;
          break;
        }
      }
      if (!gone) {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.position.x - el.x, e.position.z - el.z) < e.radius + 0.35) {
            if (e.type === EnemyType.BRUTE) { gone = true; break; }
            e.hp = 1;
            e.hit(e.position.x, e.position.z);   // fried — no score, the room did it
            gone = true;
            break;
          }
        }
      }
      if (!gone && !player.invincible &&
          Math.hypot(player.position.x - el.x, player.position.z - el.z) < PLAYER_RADIUS + 0.35) {
        gone = true;
        if (tryHitPlayer('electrode', null)) { triggerGameOver(); }
      }
      if (gone) {
        for (let j = 0; j < 4; j++) {
          const a = (j / 4) * Math.PI * 2;
          chunkPool.spawn(el.x, 0.4, el.z, Math.cos(a) * 4, 2.5, Math.sin(a) * 4, 0xffff55, 0.08);
        }
        scene.remove(el.mesh);
        el.mesh.geometry.dispose();
        el.mesh.material.dispose();
        tkElectrodes.splice(i, 1);
      }
    }
    // v155: ORB broods, BRUTE/MINDER civilian-hunting, MINDER conversions.
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e._progReady) {
        e._progReady = false;
        const progs = enemies.reduce((n, x) => n + (x.alive && x.type === EnemyType.PROG ? 1 : 0), 0);
        if (progs < 7) {
          enemies.push(new Enemy(scene, EnemyType.PROG, e.position.x, e.position.z));
          audio.shooterPing();
        }
      }
      if (e.type === EnemyType.BRUTE || e.type === EnemyType.MINDER) {
        let best = null, bd = 1e9;
        for (const c of civilians) {
          const d = Math.hypot(c.x - e.position.x, c.z - e.position.z);
          if (d < bd) { bd = d; best = c; }
        }
        if (best) { e._tX = best.x; e._tZ = best.z; }
        else { e._tX = undefined; e._tZ = undefined; }
        if (e.type === EnemyType.MINDER) {
          if (best && bd < 1.05) {
            // conversion grapple: ~1 s of glow, then the civilian returns
            // as a hostile PROG. Kill the minder mid-grapple to break it.
            e._convT = (e._convT ?? 1.0) - dt;
            e._setEmissive(Math.sin(performance.now() * 0.03) > 0 ? 0xcc66ff : 0x220044);
            if (e._convT <= 0) {
              e._convT = undefined;
              e._setEmissive(0x000000);
              civilians.splice(civilians.indexOf(best), 1);
              gooChunkPool.spawn(best.x, 0.5, best.z, 0, 3, 0, 0xcc66ff, 0.12);
              best.remove(scene);
              enemies.push(new Enemy(scene, EnemyType.PROG, best.x, best.z));
              audio.civDown();
            }
          } else if (e._convT !== undefined) {
            e._convT = undefined;
            e._setEmissive(0x000000);
          }
        }
      }
    }
    for (let i = civilians.length - 1; i >= 0; i--) {
      const c = civilians[i];
      c.update(dt);
      if (Math.hypot(c.x - player.position.x, c.z - player.position.z) < PLAYER_RADIUS + 0.5) {
        rescueChain++;
        const pay = 1000 * rescueChain * (scoreMultT > 0 ? 2 : 1);
        score += pay;
        damageNumbers.push(new DamageNumber(c.x, 1.0, c.z, `+${pay}`, '255,238,136'));
        audio.pickup();
        c.remove(scene); civilians.splice(i, 1);
        continue;
      }
      let taken = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (e.type === EnemyType.MINDER) continue;   // v155: it converts, not kills
        if (Math.hypot(c.x - e.position.x, c.z - e.position.z) < e.radius + 0.35) { taken = true; break; }
      }
      if (taken) {
        gooChunkPool.spawn(c.x, 0.5, c.z, 0, 2.5, 0, 0x888888, 0.1);
        audio.civDown();
        c.remove(scene); civilians.splice(i, 1);
      }
    }
  }

  // NEX DEUS runtime (v173): surge rings strobe down and erupt; lost players
  // tick toward reclamation; the DASH cuts — enemy bullets die and enemies
  // bleed along its path (this cabinet only — everywhere else i-frames are
  // purely defensive).
  if (nexdeusMode && player.alive && gameState === 'playing') {
    for (let i = nxSurges.length - 1; i >= 0; i--) {
      const su = nxSurges[i];
      su.t -= dt;
      const urgent = su.t < 1.6;
      su.ring.material.opacity = urgent
        ? (Math.floor(su.t * 10) % 2 ? 0.15 : 0.85)      // strobe: stand clear
        : 0.25 + 0.2 * Math.abs(Math.sin(performance.now() * 0.004));
      su.ring.rotation.z += dt * (urgent ? 2.6 : 0.7);
      if (su.t <= 0) {
        for (const ty of su.list) {
          const a = rng() * Math.PI * 2, r = 0.4 + rng() * 2.2;
          const ex = Math.max(-HALF_X + 1, Math.min(HALF_X - 1, su.x + Math.cos(a) * r));
          const ez = Math.max(-HALF_Z + 1, Math.min(HALF_Z - 1, su.z + Math.sin(a) * r));
          enemies.push(new Enemy(scene, ty, ex, ez, su.spd, su.itv));
        }
        for (let j = 0; j < 10; j++) {
          const a = (j / 10) * Math.PI * 2;
          chunkPool.spawn(su.x, 0.5, su.z, Math.cos(a) * 6, 3.5, Math.sin(a) * 6, su.col, 0.12);
        }
        addShake(0.35);
        audio.nexSurge();
        milestoneT = 0.9; milestoneText = 'SURGE!';
        scene.remove(su.ring);
        su.ring.geometry.dispose();
        su.ring.material.dispose();
        nxSurges.splice(i, 1);
      }
    }
    // LOST PLAYERS: drop in on schedule; the rescue halo IS the timer — it
    // shrinks and goes ember-red as the machine reclaims them.
    if (nxHumanAt.length && waveTimer >= nxHumanAt[0]) {
      nxHumanAt.shift();
      const hx = (rng() * 2 - 1) * (HALF_X - 3), hz = (rng() * 2 - 1) * (HALF_Z - 3);
      nxHumans.push({ civ: new Civilian(scene, hx, hz, Math.floor(rng() * 3)), t: 8.0, tMax: 8.0 });
      milestoneT = 1.0; milestoneText = 'LOST PLAYER! BRING THEM HOME';
      audio.keyJingle();
    }
    for (let i = nxHumans.length - 1; i >= 0; i--) {
      const h = nxHumans[i];
      h.t -= dt;
      h.civ.update(dt);
      const f = Math.max(0, h.t / h.tMax);
      h.civ._haloMat.color.setHex(f > 0.4 ? 0xffdd66 : 0xff4422);
      h.civ._halo.scale.setScalar(0.35 + f * 0.9);
      if (Math.hypot(h.civ.x - player.position.x, h.civ.z - player.position.z) < PLAYER_RADIUS + 0.5) {
        nxChain++;
        const pay = 1500 * nxChain * (scoreMultT > 0 ? 2 : 1) * (cabQuest ? cabQuest.mult : 1);
        score += pay;
        damageNumbers.push(new DamageNumber(h.civ.x, 1.0, h.civ.z, `+${pay}`, '255,238,136'));
        if (nxChain % 3 === 0 && player.hp < player.maxHp) {
          player.hp++;
          milestoneT = 1.0; milestoneText = 'THE MACHINE GIVES BACK (+1 HP)';
        }
        audio.pickup();
        h.civ.remove(scene); nxHumans.splice(i, 1);
        continue;
      }
      if (h.t <= 0) {
        gooChunkPool.spawn(h.civ.x, 0.5, h.civ.z, 0, 3, 0, 0xff44ff, 0.12);
        audio.civDown();
        nxChain = 0;                       // the chain dies with them
        h.civ.remove(scene); nxHumans.splice(i, 1);
      }
    }
    // DASH OFFENSE: the signature verb — i-frames plus a cutting edge.
    if (player.dashing) {
      for (let i = bullets.active.length - 1; i >= 0; i--) {
        const b = bullets.active[i];
        if (b.isPlayer) continue;
        if (Math.hypot(b.mesh.position.x - player.position.x,
                       b.mesh.position.z - player.position.z) < PLAYER_RADIUS + 1.0) {
          score += 10;
          gooChunkPool.spawn(b.mesh.position.x, 0.5, b.mesh.position.z, 0, 2.5, 0, 0xff44ff, 0.06);
          bullets.recycleAt(i);
        }
      }
      for (const e of enemies) {
        if (!e.alive || (e._nxHitT ?? 0) > 0) continue;
        if (Math.hypot(e.position.x - player.position.x,
                       e.position.z - player.position.z) < e.radius + PLAYER_RADIUS + 0.2) {
          e._nxHitT = 0.45;                // one cut per pass, not per frame
          const died = e.hit(e.position.x, e.position.z);
          if (died) onKill(e); else audio.enemyHit();
          addShake(0.10);
        }
      }
    }
    for (const e of enemies) if ((e._nxHitT ?? 0) > 0) e._nxHitT -= dt;
  }

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
    if (e._affix === 'swift' && e.alive && Math.random() < dt * 10) {
      trailPool.spawn(e.position.x, e.fxY, e.position.z, 0x99e6ff, 0.22);
    }
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
      milestoneT = 1.1;
      milestoneText = e.type === EnemyType.PRISM
        ? 'THE SURVIVOR RAGES!'            // v174: twin down — the other snaps
        : `BOSS PHASE ${e._bossPhase}!`;
      addShake(0.3);
      audio.phaseShift();
      audio.announce('phase');             // v174: the booth calls the turn
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
        if (_d < _min && _d > 0.001 &&
            _a._affix !== 'anchored' && _b._affix !== 'anchored') {
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
      if (e.type === EnemyType.WRAITH) continue;   // v156: bullets pass through
      const _piercing = BULLET_CONFIG.playerPiercing || BULLET_CONFIG.playerWeaponPierce;
      if (_piercing && b._hitIds && b._hitIds.has(e)) continue;
      const dx = b.mesh.position.x - e.position.x;
      const dz = b.mesh.position.z - e.position.z;
      if (Math.hypot(dx, dz) < BULLET_R * BULLET_CONFIG.playerBulletScale + e.radius) {
        // TOKOTRON BRUTE (v155): unkillable — bullets shove it back instead
        // of hurting it. The wave ends around it; herd it away from the family.
        if (e.type === EnemyType.BRUTE) {
          const kl = Math.hypot(dx, dz) || 1;
          e._shoveX = Math.max(-6, Math.min(6, (e._shoveX || 0) - (dx / kl) * 3.4));
          e._shoveZ = Math.max(-6, Math.min(6, (e._shoveZ || 0) - (dz / kl) * 3.4));
          bullets.recycleAt(i);
          hit = true;
          audio.plateTink();
          for (let j = 0; j < 2; j++) {
            const a2 = Math.atan2(dz, dx) + (Math.random() - 0.5) * 1.6;
            gooChunkPool.spawn(b.mesh.position.x, 0.9, b.mesh.position.z,
              Math.cos(a2) * 4, 2 + Math.random() * 2, Math.sin(a2) * 4, 0xffaa22, 0.08);
          }
          break;
        }
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
            // v179: RICH DAY compresses the roll — every drop chance doubles
            if (dailyMod === 'rich') roll *= 0.5;
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
        score += 25 * grazeMult * (scoreMultT > 0 ? 2 : 1);   // v180: GRAZE card triples this
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
      if (e.type === EnemyType.HOPPER && e.mesh.position.y > 0.5) continue;  // v157: airborne
      const dx = player.position.x - e.position.x;
      const dz = player.position.z - e.position.z;
      if (Math.hypot(dx, dz) < e.radius + PLAYER_RADIUS) {
        const died = tryHitPlayer('melee', e.type);
        if (!died && e.type === EnemyType.TORO && e._state === 'dashing') addShake(0.27);
        // v156: ghosts and wraiths spend themselves on the touch — no score,
        // no drops, just the death anim (the hit was their payment).
        if (e.type === EnemyType.GHOST || e.type === EnemyType.WRAITH) {
          e.hp = 1;
          e.hit(e.position.x, e.position.z);
        }
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

  // v176 hazards runtime: vents cycle and erupt on everything, the drain
  // pulls bodies and eats bullets, the suds surge sweeps its lane.
  if ((steamVents.length || drainZone || sudsArmed || sudsWall) && gameState === 'playing') {
    for (const v of steamVents) {
      v.update(dt);
      if (v.justErupted) {
        v.justErupted = false;
        addShake(0.18);
        // dead-center bodies still get thrown — random direction beats zero
        const ventKick = (px2, pz2) => {
          let dx = px2 - v.x, dz = pz2 - v.z;
          const d = Math.hypot(dx, dz);
          if (d < 0.05) { const a = Math.random() * Math.PI * 2; return [Math.cos(a) * 2.2, Math.sin(a) * 2.2]; }
          const k = 2.2 / Math.max(d, 0.3);
          return [dx * k, dz * k];
        };
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.position.x - v.x, e.position.z - v.z) < 1.7) {
            const died = e.hit(e.position.x, e.position.z);
            if (died) onKill(e); else audio.enemyHit();
            const [kx, kz] = ventKick(e.position.x, e.position.z);
            e.position.x = Math.max(-HALF_X + 1, Math.min(HALF_X - 1, e.position.x + kx));
            e.position.z = Math.max(-HALF_Z + 1, Math.min(HALF_Z - 1, e.position.z + kz));
          }
        }
        if (player.alive && !player.invincible &&
            Math.hypot(player.position.x - v.x, player.position.z - v.z) < 1.7) {
          const [kx, kz] = ventKick(player.position.x, player.position.z);
          player.mesh.position.x = Math.max(-HALF_X + 1, Math.min(HALF_X - 1, player.position.x + kx));
          player.mesh.position.z = Math.max(-HALF_Z + 1, Math.min(HALF_Z - 1, player.position.z + kz));
          if (tryHitPlayer('vent', null)) triggerGameOver();
        }
      }
    }
    if (drainZone) {
      drainZone.update(dt);
      const pullR = drainZone.radius * 2.2;
      if (player.alive) {
        const dx = drainZone.x - player.position.x, dz = drainZone.z - player.position.z;
        const d = Math.hypot(dx, dz);
        if (d < pullR && d > 0.2) {
          const pull = 1.1 * (1 - d / pullR);
          player.mesh.position.x += (dx / d) * pull * dt;
          player.mesh.position.z += (dz / d) * pull * dt;
        }
      }
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = drainZone.x - e.position.x, dz = drainZone.z - e.position.z;
        const d = Math.hypot(dx, dz);
        if (d < pullR && d > 0.2) {
          const pull = 0.7 * (1 - d / pullR);
          e.position.x += (dx / d) * pull * dt;
          e.position.z += (dz / d) * pull * dt;
        }
      }
      for (let bi = bullets.active.length - 1; bi >= 0; bi--) {
        const b = bullets.active[bi];
        if (Math.hypot(b.mesh.position.x - drainZone.x, b.mesh.position.z - drainZone.z) < drainZone.radius) {
          gooChunkPool.spawn(b.mesh.position.x, 0.3, b.mesh.position.z, 0, 1.5, 0, 0x66ccff, 0.06);
          bullets.recycleAt(bi);
        }
      }
    }
    // SUDS SURGE: telegraph the lane, then sweep it. (<= 0, not === 0: a
    // previous surge leaves the warn clock slightly negative.)
    if (sudsArmed && player.alive) {
      if (sudsWarnT <= 0 && waveTimer >= sudsAt) {
        sudsWarnT = 1.2;
        milestoneT = 1.2; milestoneText = 'SUDS SURGE INCOMING!';
        audio.curtainAlarm();
      } else if (sudsWarnT > 0) {
        sudsWarnT -= dt;
        if (sudsWarnT <= 0) {
          sudsArmed = false;
          const axis = rng() < 0.5 ? 'x' : 'z';
          const dir = rng() < 0.5 ? 1 : -1;
          const mat = new THREE.MeshBasicMaterial({ color: 0xeef6ff, transparent: true, opacity: 0.55, depthWrite: false });
          const mesh = new THREE.Mesh(
            axis === 'x' ? new THREE.BoxGeometry(1.2, 2.2, HALF_Z * 2) : new THREE.BoxGeometry(HALF_X * 2, 2.2, 1.2),
            mat);
          const start = (axis === 'x' ? HALF_X : HALF_Z) * -dir;
          mesh.position.set(axis === 'x' ? start : 0, 1.1, axis === 'z' ? start : 0);
          scene.add(mesh);
          sudsWall = { mesh, mat, axis, dir, pos: start };
          audio.surgeFoam();
        }
      }
    }
    if (sudsWall) {
      const speed = 9;
      sudsWall.pos += sudsWall.dir * speed * dt;
      if (sudsWall.axis === 'x') sudsWall.mesh.position.x = sudsWall.pos;
      else                       sudsWall.mesh.position.z = sudsWall.pos;
      if (Math.random() < dt * 30) {
        bubblePool.spawn(
          sudsWall.axis === 'x' ? sudsWall.pos : (Math.random() * 2 - 1) * HALF_X,
          sudsWall.axis === 'z' ? sudsWall.pos : (Math.random() * 2 - 1) * HALF_Z, 0xeef6ff);
      }
      // brush enemies hard aside (and hurt them); the player only on direct hit
      for (const e of enemies) {
        if (!e.alive) continue;
        const p2 = sudsWall.axis === 'x' ? e.position.x : e.position.z;
        if (Math.abs(p2 - sudsWall.pos) < 0.9) {
          const died = e.hit(e.position.x, e.position.z);
          if (died) onKill(e); else audio.enemyHit();
          const lat = sudsWall.axis === 'x' ? 'z' : 'x';
          const shove = (lat === 'z' ? e.position.z : e.position.x) >= 0 ? 3 : -3;
          if (lat === 'z') e.position.z = Math.max(-HALF_Z + 1, Math.min(HALF_Z - 1, e.position.z + shove));
          else             e.position.x = Math.max(-HALF_X + 1, Math.min(HALF_X - 1, e.position.x + shove));
        }
      }
      if (player.alive && !player.invincible) {
        const pp = sudsWall.axis === 'x' ? player.position.x : player.position.z;
        if (Math.abs(pp - sudsWall.pos) < 0.8) {
          if (tryHitPlayer('surge', null)) triggerGameOver();
        }
      }
      if (Math.abs(sudsWall.pos) > (sudsWall.axis === 'x' ? HALF_X : HALF_Z) + 1.5) {
        scene.remove(sudsWall.mesh);
        sudsWall.mesh.geometry.dispose(); sudsWall.mat.dispose();
        sudsWall = null;
      }
    }
  }

  // v175 living-arena objectives: the vault takes hits and snitches; the
  // escort bot crosses, dies to stray fire and bodies, and pays on delivery.
  if (gateChainT > 0) { gateChainT -= dt; if (gateChainT <= 0) gateChainN = 0; }
  if (vaultCrate && gameState === 'playing') {
    vaultCrate.update(dt);
    for (let bi = bullets.active.length - 1; bi >= 0; bi--) {
      const b = bullets.active[bi];
      if (!b.isPlayer) continue;
      if (Math.hypot(b.mesh.position.x - vaultCrate.x, b.mesh.position.z - vaultCrate.z) < 1.15) {
        bullets.recycleAt(bi);
        vaultCrate.hp--;
        vaultCrate._flashT = 0.25;
        audio.plateTink();
        // every hit pings the room — nearby enemies surge at YOU
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.position.x - vaultCrate.x, e.position.z - vaultCrate.z) < 9) {
            e._surgeT = Math.max(e._surgeT || 0, 0.7);
          }
        }
        if (vaultCrate.hp <= 0) {
          const vx = vaultCrate.x, vz = vaultCrate.z;
          for (let j = 0; j < 12; j++) {
            const a = (j / 12) * Math.PI * 2;
            chunkPool.spawn(vx, 0.8, vz, Math.cos(a) * 5, 2.5, Math.sin(a) * 5,
              j % 2 ? 0xffcc33 : 0x8899aa, 0.12);
          }
          powerups.push(new Powerup(scene, vx, vz, randomWeaponPodId(wave >= 8)));
          const cash = new Powerup(scene, vx + 1.1, vz, 'score');
          cash._value = 800 + wave * 60;
          powerups.push(cash);
          if (Math.random() < 0.4) powerups.push(new Powerup(scene, vx - 1.1, vz, 'scoremult'));
          milestoneT = 1.2; milestoneText = 'VAULT CRACKED!';
          addShake(0.4);
          audio.applause();
          audio.announce('prize');
          vaultCrate.remove(scene); vaultCrate = null;
        }
        break;
      }
    }
  }
  if (escortBot && gameState === 'playing') {
    const arrived = escortBot.update(dt);
    let botDead = false;
    for (let bi = bullets.active.length - 1; bi >= 0; bi--) {
      const b = bullets.active[bi];
      if (b.isPlayer) continue;
      if (Math.hypot(b.mesh.position.x - escortBot.x, b.mesh.position.z - escortBot.z) < 0.75) {
        bullets.recycleAt(bi);
        escortBot.hp--;
        escortBot._flashT = 0.3;
        if (escortBot.hp <= 0) botDead = true;
        break;
      }
    }
    if (!botDead) {
      for (const e of enemies) {
        if (!e.alive || !MELEE_TYPES.has(e.type)) continue;
        if (Math.hypot(e.position.x - escortBot.x, e.position.z - escortBot.z) < e.radius + 0.5) {
          botDead = true;
          break;
        }
      }
    }
    if (botDead) {
      gooChunkPool.spawn(escortBot.x, 0.5, escortBot.z, 0, 3, 0, 0x44ddff, 0.14);
      milestoneT = 1.1; milestoneText = 'THE BOT IS DOWN…';
      audio.civDown();
      escortBot.remove(scene); escortBot = null;
    } else if (arrived) {
      powerups.push(new Powerup(scene, escortBot.x, escortBot.z, randomWeaponPodId(wave >= 8)));
      milestoneT = 1.2; milestoneText = 'ESCORT DELIVERED! ENJOY THE POD';
      audio.applause();
      audio.announce('prize');
      escortBot.remove(scene); escortBot = null;
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
          if (g._risk && !g._green) {
            // v175 RISK gate on red: a harmless dud — the cost is the waste
            milestoneT = 1.0; milestoneText = 'DUD! GREEN MEANS GO';
            audio.shieldTink();
            break;
          }
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
          if (g._risk) {
            // green on the cycle: DOUBLE prize for the read
            powerups.push(new Powerup(scene, g._x + 1.2, g._z, gateTypes[Math.floor(Math.random() * gateTypes.length)]));
            milestoneT = 1.1; milestoneText = 'GREEN RUSH! DOUBLE PRIZE';
          }
          // v175 GATE CHAIN: bank another gate within 6 s and the pay climbs
          gateChainN = gateChainT > 0 ? gateChainN + 1 : 1;
          gateChainT = 6.0;
          if (gateChainN >= 2) {
            const chainPay = 500 * gateChainN * (scoreMultT > 0 ? 2 : 1);
            score += chainPay;
            milestoneT = 1.1; milestoneText = `GATE CHAIN x${gateChainN}! +${chainPay}`;
            audio.milestone();
          }
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
        if (gaundropMode) gdHungerT = Math.max(gdHungerT, 32);   // v156: food = time
      } else if (pu._type === 'key') {
        // v168: keys go in the POCKET — doors and the exit each spend one.
        gdKeys++;
        milestoneT = 1.2; milestoneText = `KEY ×${gdKeys}`;
        audio.keyJingle();   // v164
      } else if (pu._type === 'potion') {
        // v156: Gauntlet magic — the whole floor pops (generators excepted).
        let n = 0;
        for (const e of enemies) if (e.alive) { e.hp = 1; e.hit(e.position.x, e.position.z); n++; }
        score += n * 40;
        addShake(0.5);
        waveClearFlashT = 0.4;
        milestoneT = 1.2; milestoneText = 'POTION! THE FLOOR CLEARS';
        audio.waveClear();
      } else if (pu._type === 'firerate') {
        player.grantFireRateBoost(8.0);
      } else if (pu._type === 'score') {
        // Instant score nugget (v89) — worth more in later waves, doubled by
        // an active Score Multiplier. Floor valuables (v116) carry their own
        // value: small cash piles, big prizes.
        const gained = (pu._value ?? (250 + wave * 25)) * (scoreMultT > 0 ? 2 : 1) * (gauntlet ? gauntlet.mult : cabQuest ? cabQuest.mult : 1);
        score += gained;
        if (kaikkiMode) { kkCash += gained; audio.kaChing(); }   // v159/v164: money is money, and it RINGS
        damageNumbers.push(new DamageNumber(pu.x, 1.2, pu.z, `+${gained}`, '255,221,68'));
        audio.announce('money');
      } else if (pu._type === 'scoremult') {
        scoreMultT = 10.0;
        damageNumbers.push(new DamageNumber(pu.x, 1.2, pu.z, 'x2!', '255,170,255'));
        audio.announce('mult');
      } else if (pu._type === 'item') {
        // Binding pedestal (v150): a free pick, then back to the same room.
        showUpgradeCards(() => { gameState = 'playing'; });
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

  // v171 ARENA CURTAIN: one beat of warning, then the wall marches.
  // v177: the arming (spawnWave) already encodes who gets curtains — the
  // fixed-screen cabinets included — and rolls the STYLE for late waves.
  if (curtainArmed && gameState === 'playing' && player.alive) {
    if (curtainWarnT <= 0 && waveTimer >= curtainAt) {
      curtainWarnT = 1.1;
      milestoneT = 1.1;
      milestoneText = curtainStyle === 'cross' ? 'CROSSING CURTAINS!'
                    : curtainStyle === 'diag'  ? 'SHEARING CURTAIN!' : 'BULLET CURTAIN!';
      audio.curtainAlarm();
    } else if (curtainWarnT > 0) {
      curtainWarnT -= dt;
      if (curtainWarnT <= 0) {
        curtainArmed = false;
        const s1 = fireArenaCurtain(curtainStyle === 'diag' ? 'diag' : 'wall');
        audio.curtainSweep();
        if (curtainStyle === 'cross') curtainCross = { t: 1.1, side: (s1 + 1) % 4 };
      }
    }
  }
  if (curtainCross && gameState === 'playing') {
    curtainCross.t -= dt;
    if (curtainCross.t <= 0) {
      fireArenaCurtain('wall', curtainCross.side);
      audio.curtainSweep();
      curtainCross = null;
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
  // v146 FIX: never re-evaluate the clear while a room transition is in
  // flight (_roomSwap / roomFadeT) — the old room's dead enemies linger until
  // spawnWave, so the clear could re-fire mid-fade, double-paying the bonus
  // and (in gauntlets) cascading through the whole room script instantly.
  if (gameState === 'playing' && !exitPhase && waveGapT <= 0 && !gaundropMode && !loadoutMode && !kaikkiMode &&
      (!nexdeusMode || nxSurges.length === 0) &&
      !_roomSwap && roomFadeT <= 0 &&
      enemies.length > 0 &&
      enemies.every(e => (tokotronMode && e.type === EnemyType.BRUTE) ||
                         (!e.alive && !e._dying)) &&
      (!smashMode || pendingSpawns.length === 0)) {
    pendingSpawns = [];
    score += wave * 500 * (gauntlet ? gauntlet.mult : cabQuest ? cabQuest.mult : 1);
    waveClearFlashT = 0.4;
    audio.waveClear();
    if (gauntlet && gauntlet.roomIdx >= gauntlet.rooms.length - 1) {
      // BONUS GAUNTLET (v146): final room down — payout and back to classic.
      finishGauntlet();
    } else if (smashMode) {
      // SMASH TV (v115): the room doesn't chain straight into the next wave —
      // EXIT doors open, the tally card shows, the minimap comes up, and the
      // player WALKS OUT through a door of their choosing.
      exitPhase  = true;
      exitDoors  = pickSmashExits();
      // Gauntlet doors all lead to the SAME scripted next room (v146).
      if (gauntlet) for (const ed of exitDoors) ed.kind = gauntlet.rooms[gauntlet.roomIdx + 1];
      // v178: a downed boss ends the FLOOR — every door leads to the breather
      // (fall back to the wave rhythm when no door ever set the room kind)
      if (!gauntlet && !bindingMode && (smashRoomKind ?? waveKind(wave)) === 'boss') {
        for (const ed of exitDoors) ed.kind = 'bonus';
      }
      if (bindingMode) {
        // v157: REAL branching — the item/boss cadence still rules those
        // beats, but between them each door rolls its own room kind.
        const cadence = bindingKindFor(bindingRoomN + 1);
        if (cadence === 'item' || cadence === 'boss') {
          for (const ed of exitDoors) ed.kind = cadence;
        } else {
          for (const ed of exitDoors) {
            const r2 = rng();
            ed.kind = r2 < 0.5 ? 'normal' : r2 < 0.8 ? 'swarm' : 'spike';
          }
        }
        // Floor boss down (v150): the basement pays a RARE pick on the spot.
        if (smashRoomKind === 'boss') showRareCards(() => { gameState = 'playing'; });
      }
      roomTallyT = 2.2;
      audio.applause();
      audio.announce('exit');
    } else {
      audio.announce('clear');
      // Roguelike pacing (v101): a card every 3rd cleared wave — every wave was
      // way too frequent with instant wave-ends chaining fast.
      if (tokotronMode || nexdeusMode) {
        if (cabQuest) cabQuestAdvance();     // v154: quest beat — pay or ramp
        else waveGapT = tokotronMode ? 0.6 : 1.0;   // v148: the reference slams onward
      }
      else if (roguelikeMode && wave % 3 === 0) showUpgradeCards();
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
        if (!gauntlet && !bindingMode && ed.kind === 'bonus') {   // v178
          smashFloor++;
          milestoneT = 1.4; milestoneText = `FLOOR ${smashFloor}!`;
          audio.applause();
        }
        if (gauntlet) {                      // v146: scripted room list + pinball ramp
          gauntlet.roomIdx++;
          gauntlet.mult++;
          smashRoomKind = gauntlet.rooms[gauntlet.roomIdx];
        }
        if (bindingMode) {                   // v150: the basement script
          if (smashRoomKind !== undefined && bindingKindFor(bindingRoomN) === 'boss') {
            bindingFloor++;                  // leaving a boss room = next floor
          }
          bindingRoomN++;
          // v157: the door's advertised kind IS the choice; only the
          // item/boss cadence overrides it.
          const cad = bindingKindFor(bindingRoomN);
          if (cad === 'item' || cad === 'boss') smashRoomKind = cad;
          if (cabQuest) {                    // v154: each room walked out of
            cabQuest.done++;                 // is a quest beat
            if (cabQuest.done >= cabQuest.goal) { finishCabQuest(); break; }
            cabQuest.mult++;
          }
        }
        _entryDoor    = (ed.door + 2) % 4;
        _cameFromDoor = _entryDoor;
        if (!gauntlet && !bindingMode && roguelikeMode && wave % 3 === 0) {
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
  VIS.now = VIS.hz ? Math.floor(_now * VIS.hz) / VIS.hz : _now;   // v151: stepped
  GOO_TIME.value            = VIS.now;
  floorUniforms.uTime.value = VIS.now;
  if (retro.active) retro.render(renderer, scene, camera);
  else              renderer.render(scene, camera);
  drawHUD();
}

// ── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  retro.setSize(renderer);   // v151: cabinet RT tracks the drawing buffer
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
    navigator.serviceWorker.register('./sw.js?v=134').catch(() => {});
  });
}
