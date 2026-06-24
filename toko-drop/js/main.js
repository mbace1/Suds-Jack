import * as THREE from 'three';
import { InputManager } from './input.js';
import { BulletPool, BULLET_R, FAT_BULLET_R, BULLET_CONFIG } from './bullet.js';
import { Player, PLAYER_RADIUS } from './player.js';
import { Enemy, EnemyType, GOO_TIME, makeGooMat } from './enemy.js';
import { audio } from './audio.js';
import { initDesigner } from './designer.js';

const HALF_X    = 11;   // arena half-width  (portrait: narrow side)
const HALF_Z    = 18;   // arena half-depth  (portrait: deep side)
const ROUND_DUR = 30; // seconds per wave

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
function getWaveScale(wave) {
  const w = wave - 1;
  return {
    speedMult:    Math.min(1 + w * 0.16, 3.2),   // ramps faster, higher ceiling
    intervalMult: Math.max(1 - w * 0.11, 0.26),   // fires more often earlier
  };
}

// Returns the spawn list [{type, t: spawnDelaySecs, count?}] for a wave.
// Delays are front-loaded to fit fast 30 s rounds.
// Enemy pool: [type, minWave, budget-cost]. Unlocked types grow with wave number.
// getEnemySchedule uses rng (seeded per run) so every run plays differently.
function getEnemySchedule(wave) {
  const { GLOBBO, SPITTOR, FANNER, WEEVA, SPLITTA,
          YELA_CUBE, ORANGE_CUBE, SLUDGE_CUBE, REDD_CUBE, PURP_CUBE, TORO, BAMBU, PYRA } = EnemyType;
  const POOL = [
    // [type, minWave, cost]
    [GLOBBO,      1, 1], [YELA_CUBE,  1, 1], [SPITTOR,    1, 2], [FANNER,     1, 2],
    [ORANGE_CUBE, 2, 2], [WEEVA,      2, 3],
    [SLUDGE_CUBE, 3, 2], [BAMBU,      3, 3], [SPLITTA,    3, 3],
    [REDD_CUBE,   4, 3],
    [PURP_CUBE,   5, 3], [PYRA,       5, 4],
    [TORO,        6, 5],
  ];
  const available = POOL.filter(([, min]) => wave >= min);
  const isBoss  = wave % 8 === 0;
  const isSpike = !isBoss && wave % 4 === 0;
  const budget = Math.floor((4 + wave * 2.8) * (isBoss ? 2.5 : isSpike ? 1.6 : 1.0));
  // Variant weights: normal appears 3× so it's most common
  const VARIANTS = ['normal', 'normal', 'normal', 'elite', 'elitelite', 'twin', 'group'];
  const list = [];
  let spent = 0, t = 0;

  // Boss wave: guaranteed large enemy up front
  if (isBoss) {
    const topPool = [TORO, PYRA, BAMBU, PURP_CUBE].filter(tp => available.some(([at]) => at === tp));
    const bossType = topPool.length ? topPool[topPool.length - 1] : available[available.length - 1][0];
    const bossCost = POOL.find(([tp]) => tp === bossType)?.[2] ?? 3;
    list.push({ type: bossType, t: 0, boss: true });
    spent += Math.ceil(bossCost * 2.5);
    t = 4;
  }

  while (spent < budget && list.length < 18) {
    const [type, , cost] = available[Math.floor(rng() * available.length)];
    const variant = wave >= 2 ? VARIANTS[Math.floor(rng() * VARIANTS.length)] : 'normal';
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
    t += 1.5 + Math.floor(rng() * 5);
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
function addShake(trauma) { shakeTrauma = Math.min(shakeTrauma + trauma, 1); }
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
  varying vec2 vUv;
  void main() {
    vec3 base = vec3(0.079, 0.079, 0.169);
    // Frequencies scaled to keep grid cells square on the non-square floor (HALF_X:HALF_Z = 11:18)
    float gx = abs(fract(vUv.x * 17.1) - 0.5);
    float gz = abs(fract(vUv.y * 28.0) - 0.5);
    float grid = max(0.0, 1.0 - min(gx, gz) * 50.0);
    float pulse = 0.7 + 0.3 * sin(uTime * 1.2);
    vec3 gridColor = mix(vec3(0.13, 0.07, 0.38), vec3(0.0, 0.55, 0.50), grid);
    vec3 col = mix(base, gridColor, grid * pulse * 0.7);
    gl_FragColor = vec4(col, 1.0);
  }
`;
const floorUniforms = { uTime: { value: 0 } };
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

// ── Death FX: chunks + puddles ────────────────────────────────────────────────
class Chunk {
  constructor(sc, x, y, z, vx, vy, vz, color, size = 0.18) {
    this.vx = vx; this.vy = vy; this.vz = vz;
    this._life = 1.4;
    this._sq   = 1.0;
    this._sqV  = 0.0;
    this.mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 5, 3), this.mat);
    this.mesh.position.set(x, y, z);
    sc.add(this.mesh);
  }
  update(dt) {
    this._life -= dt;
    this.vy    -= 14 * dt;
    this.mesh.position.x += this.vx * dt;
    this.mesh.position.y += this.vy * dt;
    this.mesh.position.z += this.vz * dt;
    if (this.mesh.position.y <= 0.01 && this.vy < 0) {
      this.mesh.position.y = 0;
      this._sqV -= Math.abs(this.vy) * 0.4; // squash on landing
      this.vy = 0; this.vx *= 0.35; this.vz *= 0.35;
    }
    // Spring squash per frame
    this._sqV = (this._sqV - (this._sq - 1.0) * 0.32) * 0.80;
    this._sq  = Math.max(0.55, Math.min(1.4, this._sq + this._sqV));
    const sx = 1 / Math.sqrt(Math.max(this._sq, 0.1));
    this.mesh.scale.set(sx, this._sq, sx);
    this.mat.opacity = Math.min(1, this._life / 0.3);
    return this._life > 0;
  }
  remove(sc) { sc.remove(this.mesh); }
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
    this.radius = radius;
    this.mat = new THREE.MeshBasicMaterial({
      color: 0x88cc00,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 10), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(x, 0.015, z);
    sc.add(this.mesh);
  }
  get isDangerous() { return this._life > 1.0; }
  update(dt) {
    this._life -= dt;
    this.mat.opacity = this._life > 1.0 ? 0.55 : 0.28 * (this._life / 1.0);
    return this._life > 0;
  }
  remove(sc) { sc.remove(this.mesh); }
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
    this._laser = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 0.12), this._laserMat);
    this._laser.position.set(x, 0.9, z);
    this._laser.rotation.y = angle + Math.PI / 2;
    sc.add(this._laser);
  }
  update(dt, t) {
    if (!this.alive) return;
    this._laserMat.opacity = 0.5 + 0.4 * Math.sin(t * 8);
    if (this._dmgCooldown > 0) this._dmgCooldown -= dt;
  }
  deactivate(sc) {
    this.alive = false;
    sc.remove(this._laser);
  }
  remove(sc) {
    sc.remove(this._p1); sc.remove(this._p2); sc.remove(this._laser);
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

const POWERUP_COLORS = { weapon_burst: 0x44ffcc, weapon_spread: 0xffcc44, invincible: 0xffffff, firerate: 0xff88aa, hp: 0xff4466 };

class Powerup {
  constructor(sc, x, z, forcedType, driftX = 0, driftZ = 0) {
    this._life = 9.0;
    this.x = x; this.z = z;
    this._driftX = driftX; this._driftZ = driftZ;
    this.collected = false;
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), this.mat);
    this.mesh.position.set(x, 0.6, z);
    sc.add(this.mesh);
    if (forcedType) {
      this._type = forcedType;
    } else {
      const r = Math.random();
      this._type = r < 0.25 ? 'weapon_burst' : r < 0.5 ? 'weapon_spread' : r < 0.75 ? 'invincible' : 'firerate';
    }
    this.mat.color.set(POWERUP_COLORS[this._type] ?? 0xffffff);
  }
  update(dt, t) {
    this._life -= dt;
    this.x += this._driftX * dt;
    this.z += this._driftZ * dt;
    this.mesh.position.x = this.x;
    this.mesh.position.z = this.z;
    this.mesh.position.y = 0.6 + Math.sin(t * 3) * 0.15;
    this.mat.opacity = 0.5 + 0.4 * Math.sin(t * 5);
    return this._life > 0 && !this.collected;
  }
  remove(sc) { sc.remove(this.mesh); }
}

class BambuAoE {
  constructor(sc, x, z, radius, duration) {
    this._life = duration;
    this._dur  = duration;
    this.x = x; this.z = z;
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xff8800, transparent: true, opacity: 0.6, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 12), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(x, 0.016, z);
    sc.add(this.mesh);
  }
  update(dt) {
    this._life -= dt;
    const frac = Math.max(0, this._life / this._dur);
    this.mat.opacity = 0.6 * frac * (0.5 + 0.5 * Math.sin(this._life * Math.PI * 6));
    return this._life > 0;
  }
  remove(sc) { sc.remove(this.mesh); }
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

// ── Game objects ──────────────────────────────────────────────────────────────
const input   = new InputManager();
const bullets = new BulletPool(scene);
const player  = new Player(scene);
let enemies      = [];
let chunks       = [];
let puddles      = [];
let poisonZones  = [];
let slimeTrails  = [];
let sludgeRibbons = [];
let bambuAoes     = [];
let gates         = [];
let powerups      = [];
let damageNumbers = [];
let cargoCluster    = null;
let clusterTimer    = 0;
let clusterSpawnAt  = 0; // seconds into wave to spawn cluster (0 = none this wave)
let wave         = 0;
let waveTimer    = 0;
let waveDuration = ROUND_DUR;
let pendingSpawns = [];
let _prevDashing = false;

// ── Score ─────────────────────────────────────────────────────────────────────
let score        = 0;
let streak       = 0;
const STREAK_FLASH_DUR = 0.4;
let streakFlashT = 0;
let hiScore = parseInt(localStorage.getItem('tokoDropHi') || '0');
// Roguelike mode (default on): show upgrade cards between waves. Off = plain arcade run.
let roguelikeMode = localStorage.getItem('tokoDropRogue') !== '0';

function onKill(e) {
  streak++;
  score += 100 * streak;
  streakFlashT = STREAK_FLASH_DUR;
  addShake(0.13);
  const _cat = BLOB_TYPES.has(e.type) ? 'blob'
    : e.type === EnemyType.TORO  ? 'toro'
    : e.type === EnemyType.BAMBU ? 'bambu'
    : e.type === EnemyType.PYRA  ? 'pyra' : 'cube';
  audio.enemyDieType(_cat);
  // Spawn death FX from chunk data populated by e.destroy()
  for (const cd of e.chunks) {
    chunks.push(new Chunk(scene, cd.x, cd.y, cd.z, cd.vx, cd.vy, cd.vz, e.color, cd.size));
  }
  puddles.push(new Puddle(scene, e.position.x, e.position.z, e.color, e.radius * 1.5));
}

function onPlayerHit() {
  streak = 0;
  streakFlashT = 0;
  addShake(0.38);
  audio.playerHit();
}

function tryHitPlayer() {
  if (player._shield) {
    player._shield = false;
    addShake(0.15);
    audio.playerHit();
    return false;
  }
  _hitFlashT = 0.32;
  player.hit();
  onPlayerHit();
  return !player.alive;
}

// ── Game state ───────────────────────────────────────────────────────────────
// 'title' | 'playing' | 'paused' | 'gameover'
let gameState    = 'title';
let restartTimer = 0;
let _hitFlashT   = 0;

// ── UI canvas ─────────────────────────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx      = uiCanvas.getContext('2d');
const overlay  = document.getElementById('overlay');
const _proj    = new THREE.Vector3();

const designer = initDesigner({
  getEnemies: () => enemies,
  onResume:   () => { gameState = 'playing'; },
});

function toScreen(worldPos) {
  _proj.copy(worldPos).project(camera);
  return { x: (_proj.x + 1) / 2 * uiCanvas.width, y: (-_proj.y + 1) / 2 * uiCanvas.height };
}

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

const HUD_FONT = 'bold 14px monospace';

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

  if (gameState !== 'playing' && gameState !== 'paused' && gameState !== 'upgrade') return;

  // Sticks
  drawStick(input.left,  uiCanvas.width * 0.22, uiCanvas.height * 0.78);
  drawStick(input.right, uiCanvas.width * 0.78, uiCanvas.height * 0.78);

  // Pause button (top centre)
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('❝❝', uiCanvas.width / 2, 36);
  ctx.textAlign = 'left';

  // Wave + score (top row)
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = HUD_FONT;
  ctx.fillText(`WAVE ${wave}`, 16, 24);

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
    ctx.font = `bold ${Math.round(14 * flashScale)}px monospace`;
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`×${streak} STREAK`, uiCanvas.width - 16, 44);
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

  // Weapon mode indicator
  if (player._weaponMode !== 'SINGLE') {
    const dotAreaW = player.maxHp * dotGap;
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#00ccaa';
    ctx.fillText(`[${player._weaponMode}]`, 16 + dotAreaW + 8, dotY + 5);
    ctx.font = HUD_FONT;
  }

  // Shield indicator
  if (player._shield) {
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#5599ff';
    ctx.fillText('✶ SHLD', 16, dotY + 22);
    ctx.font = HUD_FONT;
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

  // Enemy HP bars (world→screen projection)
  for (const e of enemies) {
    if (!e.alive && !e._dying) continue;
    const s = toScreen(e.position);
    const barW = 36, barH = 5;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(s.x - barW / 2, s.y - 44, barW, barH);
    ctx.fillStyle = hexToCSS(e.color);
    ctx.fillRect(s.x - barW / 2, s.y - 44, barW * e.hpFrac, barH);
  }

  // Hi-score
  if (hiScore > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`HI ${hiScore}`, uiCanvas.width - 16, 60);
    ctx.textAlign = 'left';
  }

  // Seed (bottom-right, very faint — for sharing runs)
  if (runSeed > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`SEED ${runSeed.toString(16).toUpperCase().padStart(6,'0')}`, uiCanvas.width - 16, uiCanvas.height - 12);
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
    `TWIN-STICK BULLET-HELL · PORTRAIT</div>` +
    `<div style="font-size:16px;opacity:0.85;animation:tokoFadeUp 0.5s 0.2s ease both">TAP OR PRESS SPACE TO START</div>` +
    `<div id="rogue-toggle-slot" style="margin-top:18px;animation:tokoFadeUp 0.5s 0.3s ease both"></div>` +
    `<div style="font-size:12px;opacity:0.38;margin-top:20px;line-height:2;text-align:center;` +
    `animation:tokoFadeUp 0.5s 0.4s ease both">` +
    `Move &nbsp;·&nbsp; left stick / WASD<br>` +
    `Aim &amp; fire &nbsp;·&nbsp; right stick / hold LMB<br>` +
    `Dash &nbsp;·&nbsp; release stick / Space<br>` +
    `Pause ESC &nbsp;·&nbsp; Eyes E</div>`;

  // Roguelike toggle — a clickable chip inside the (pointer-events:none) overlay.
  const slot = document.getElementById('rogue-toggle-slot');
  const btn  = document.createElement('div');
  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;opacity:0.45;margin-top:6px';
  const render = () => {
    const on = roguelikeMode;
    btn.textContent = `ROGUELIKE MODE: ${on ? 'ON' : 'OFF'}`;
    btn.style.cssText =
      'display:inline-block;pointer-events:auto;cursor:pointer;user-select:none;' +
      'font-size:14px;font-weight:bold;padding:8px 18px;border-radius:8px;' +
      'background:rgba(0,0,0,0.35);transition:all 0.12s;' +
      `border:2px solid ${on ? '#00ccaa' : '#445'};` +
      `color:${on ? '#00ffcc' : '#7777aa'};` +
      `text-shadow:${on ? '0 0 12px #00ccaa' : 'none'};`;
    hint.textContent = on ? 'Pick an upgrade card after each wave'
                          : 'No upgrades — pure arcade survival';
  };
  render();
  const toggle = e => {
    e.stopPropagation();
    e.preventDefault();
    roguelikeMode = !roguelikeMode;
    localStorage.setItem('tokoDropRogue', roguelikeMode ? '1' : '0');
    render();
  };
  btn.addEventListener('pointerdown', toggle);
  // Stop the chip's own touch from bubbling to the window tap-to-start handler.
  btn.addEventListener('touchend', e => e.stopPropagation());
  slot.appendChild(btn);
  slot.appendChild(hint);
}

function showGameOver() {
  overlay.style.display = 'block';
  const newHi = score >= hiScore && score > 0;
  const seedHex = runSeed.toString(16).toUpperCase().padStart(6, '0');
  overlay.innerHTML =
    `<div style="font-size:52px;font-weight:bold">YOU DIED</div>` +
    `<div style="font-size:22px;margin-top:8px;color:#ff6644">SCORE ${score}</div>` +
    (newHi ? `<div style="font-size:16px;color:#ffdd44;margin-top:6px">NEW BEST!</div>` : ``) +
    `<div style="font-size:12px;opacity:0.35;margin-top:10px">SEED ${seedHex}</div>` +
    `<div style="font-size:13px;opacity:0.4;margin-top:8px">Returning to title…</div>`;
}

function announceWave() {
  overlay.style.display = 'block';
  overlay.innerHTML = `<div style="font-size:22px;opacity:0.75">WAVE ${wave}</div>`;
  setTimeout(() => { if (gameState === 'playing') overlay.style.display = 'none'; }, 900);
}

// ── Wave / restart helpers ──────────────────────────────────────────────────────────
function clearFX() {
  for (const c of chunks)        c.remove(scene); chunks        = [];
  for (const p of puddles)       p.remove(scene); puddles       = [];
  for (const z of poisonZones)   z.remove(scene); poisonZones   = [];
  for (const s of slimeTrails)   s.remove(scene); slimeTrails   = [];
  for (const r of sludgeRibbons) r.remove(scene); sludgeRibbons = [];
  for (const a of bambuAoes)     a.remove(scene); bambuAoes     = [];
  for (const g of gates)        g.remove(scene); gates         = [];
  for (const p of powerups)     p.remove(scene); powerups      = [];
  damageNumbers = [];
  if (cargoCluster) { cargoCluster.remove(scene); cargoCluster = null; }
  clusterTimer = 0; clusterSpawnAt = 0;
}

function spawnWave() {
  for (const e of enemies) e.removeFrom(scene);
  enemies = [];
  for (const g of gates)    g.remove(scene); gates    = [];
  for (const p of powerups) p.remove(scene); powerups = [];
  wave++;
  const { speedMult, intervalMult } = getWaveScale(wave);
  const list   = getEnemySchedule(wave);
  waveDuration = ROUND_DUR;
  waveTimer    = 0;
  const total  = list.length;
  pendingSpawns = [];
  list.forEach((entry, i) => {
    const cnt = entry.count || 1;
    for (let k = 0; k < cnt; k++) {
      pendingSpawns.push({
        type: entry.type,
        delay: entry.t,
        angle: (i / total) * Math.PI * 2,
        clusterOffset: k > 0 ? { x: (rng()-0.5)*3, z: (rng()-0.5)*3 } : null,
        speedMult,
        intervalMult,
        boss: entry.boss || false,
        elite: entry.elite || false,
        elitelite: entry.elitelite || false,
      });
    }
  });
  if (player._hasShield) player._shield = true;
  if (wave >= 3) gates.push(new Gate(scene));
  // Schedule one cargo convoy per wave (starts mid-wave, seeded position)
  clusterTimer = 0;
  clusterSpawnAt = 12 + rng() * 12; // 12-24 s into the wave
  announceWave();
}

// ── Upgrade cards ─────────────────────────────────────────────────────────────
const UPGRADE_POOL = [
  { id: 'hp',         label: '+1 HP',          desc: 'Gain one extra hit point.' },
  { id: 'speed',      label: 'Speed Up',       desc: 'Move 20% faster permanently.' },
  { id: 'firerate',   label: 'Fire Rate Up',   desc: 'Fire 20% faster permanently.' },
  { id: 'bigbullets', label: 'Bigger Bullets', desc: 'Player bullets are 30% larger.' },
  { id: 'dashcd',     label: 'Dash Refresh',   desc: 'Dash cooldown −0.15 s.' },
  { id: 'nuke',       label: 'Nuke',           desc: 'Clear all enemy bullets now.' },
  { id: 'pierce',     label: 'Pierce',         desc: 'Bullets pass through enemies.' },
  { id: 'magnet',     label: 'Magnet',         desc: 'Pickups drift toward you.' },
  { id: 'shield',     label: 'Shield',         desc: 'Absorbs one hit; resets each wave.' },
  { id: 'dashboom',   label: 'Dash Boom',      desc: 'Radial explosion on every dash.' },
];

function applyUpgrade(id) {
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
  panel.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);z-index:60;font-family:monospace;color:#fff;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:24px;font-weight:bold;margin-bottom:24px;text-shadow:0 0 20px #aa00ff;';
  title.textContent = 'CHOOSE UPGRADE';
  panel.appendChild(title);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;justify-content:center;';
  panel.appendChild(row);

  for (const card of pool) {
    const btn = document.createElement('div');
    btn.style.cssText = 'background:#1a1a2e;border:2px solid #5555cc;border-radius:8px;padding:20px 24px;min-width:140px;max-width:180px;text-align:center;cursor:pointer;';
    btn.innerHTML = `<div style="font-size:16px;font-weight:bold;margin-bottom:8px">${card.label}</div><div style="font-size:12px;opacity:0.65">${card.desc}</div>`;
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
  score  = 0; streak = 0; wave = 0;
  BULLET_CONFIG.playerBulletScale = 1.0;
  BULLET_CONFIG.playerPiercing    = false;
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

function triggerGameOver() {
  gameState = 'gameover';
  restartTimer = 2.8;
  if (score > hiScore) {
    hiScore = score;
    localStorage.setItem('tokoDropHi', hiScore);
  }
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
  }
};
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused';  designer.show(); }
  else if (gameState === 'paused')  { gameState = 'playing'; designer.hide(); }
  else if (gameState === 'title')   startGame();
};

// Space also starts from title on desktop (keyup so the same keyup doesn't also trigger dash)
window.addEventListener('keyup', e => {
  if (e.code === 'Space' && gameState === 'title') startGame();
  if (e.code === 'KeyE') player.toggleEyes();
});
// Tap anywhere (outside stick zones) starts from title on mobile
window.addEventListener('touchend', () => {
  if (gameState === 'title') startGame();
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
showTitle();

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt  = Math.min((now - prev) / 1000, 0.05);
  prev = now;

  updateShake(dt);

  // Title / paused — just render the scene, no game logic
  if (gameState === 'title' || gameState === 'paused' || gameState === 'upgrade') {
    renderer.render(scene, camera);
    drawHUD();
    return;
  }

  if (gameState === 'gameover') {
    restartTimer -= dt;
    for (const e of enemies) e.updateDeath(dt);
    for (let i = chunks.length - 1; i >= 0; i--) {
      if (!chunks[i].update(dt)) { chunks[i].remove(scene); chunks.splice(i, 1); }
    }
    if (restartTimer <= 0) {
      clearFX();
      for (const e of enemies) e.removeFrom(scene);
      enemies = [];
      bullets.clear();
      showTitle();
      gameState = 'title';
    }
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

  for (const e of enemies) { e.update(dt, player.position, bullets); e.updateDeath(dt); }
  bullets.update(dt, Math.max(HALF_X, HALF_Z));

  // Update / cull death FX
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (!chunks[i].update(dt)) { chunks[i].remove(scene); chunks.splice(i, 1); }
  }
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

  // BAMBU AoE telegraphs and lob bullets; drain hitChunks for all enemies
  for (const e of enemies) {
    if (e.type === EnemyType.BAMBU) {
      if (e._aoeReady) {
        e._aoeReady = false;
        bambuAoes.push(new BambuAoE(scene, e._lobTargetX, e._lobTargetZ, 2.2, 1.0));
      }
      if (e._lobReady && e.alive) {
        const tgt = e._lobReady; e._lobReady = null;
        const ex = e.position.x, ez = e.position.z;
        const dx = tgt.x - ex, dz = tgt.z - ez;
        const dl = Math.hypot(dx, dz) || 1;
        bullets.spawnDir(ex, ez, dx/dl, dz/dl, false, 0xddbb44, true);
      }
    }
    if (e._hitChunks && e._hitChunks.length > 0) {
      for (const cd of e._hitChunks) {
        chunks.push(new Chunk(scene, cd.x, cd.y, cd.z, cd.vx, cd.vy, cd.vz, cd.color, cd.size));
      }
      e._hitChunks.length = 0;
    }
  }
  for (let i = bambuAoes.length - 1; i >= 0; i--) {
    if (!bambuAoes[i].update(dt)) { bambuAoes[i].remove(scene); bambuAoes.splice(i, 1); }
  }

  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    if (!damageNumbers[i].update(dt)) damageNumbers.splice(i, 1);
  }
  if (streakFlashT > 0) streakFlashT -= dt;

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
      if (BULLET_CONFIG.playerPiercing && b._hitIds && b._hitIds.has(e)) continue;
      const dx = b.mesh.position.x - e.position.x;
      const dz = b.mesh.position.z - e.position.z;
      if (Math.hypot(dx, dz) < BULLET_R * BULLET_CONFIG.playerBulletScale + e.radius) {
        const died = e.hit();
        if (BULLET_CONFIG.playerPiercing) {
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
              bullets.spawnDir(e.position.x, e.position.z, Math.cos(a), Math.sin(a), false, 0xaaff44);
            }
          }
        } else {
          audio.enemyHit();
          damageNumbers.push(new DamageNumber(e.position.x, e.position.y + e.radius, e.position.z));
        }
        if (!BULLET_CONFIG.playerPiercing) break;
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
            chunks.push(new Chunk(scene, kx, 0.8, kz,
              Math.cos(a) * 3.5, 1.0, Math.sin(a) * 3.5, 0xffdd55, 0.1));
          }
          // Drop a slow-drifting pickup away from the convoy path
          const driftAngle = Math.random() * Math.PI * 2;
          const driftSpeed = 0.8 + Math.random() * 0.6;
          const dropTypes = ['hp', 'firerate', 'weapon_burst', 'weapon_spread', 'invincible'];
          const dropType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
          const pu = new Powerup(scene, kx, kz, dropType,
            Math.cos(driftAngle) * driftSpeed, Math.sin(driftAngle) * driftSpeed);
          pu._life = 7.0;
          powerups.push(pu);
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
        bullets.recycleAt(i);
        if (tryHitPlayer()) { triggerGameOver(); break; }
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
        const died = tryHitPlayer();
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
            chunks.push(new Chunk(scene, g._x, 0.9, g._z,
              Math.cos(_ga) * 5.5, 1.2 + Math.random() * 1.0, Math.sin(_ga) * 5.5,
              (_gi % 2 === 0) ? 0x44ff88 : 0x88ffcc, 0.13));
          }
          addShake(0.14);
          audio.pickup();
          powerups.push(new Powerup(scene, g._x, g._z));
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
      }
    }
  }

  // Powerup collection
  for (const pu of powerups) {
    if (pu.collected) continue;
    const dx = player.position.x - pu.x, dz = player.position.z - pu.z;
    if (Math.hypot(dx, dz) < 0.8 + PLAYER_RADIUS) {
      pu.collected = true;
      if (pu._type === 'weapon_burst') {
        player._weaponMode = 'BURST';
      } else if (pu._type === 'weapon_spread') {
        player._weaponMode = 'SPREAD';
      } else if (pu._type === 'invincible') {
        player.grantInvincibility(3.0);
      } else if (pu._type === 'hp') {
        player.hp = Math.min(player.maxHp, player.hp + 1);
      } else {
        player.grantFireRateBoost(8.0);
      }
      audio.pickup();
    }
  }

  // Poison zone player collision
  if (!player.invincible) {
    for (const z of poisonZones) {
      if (!z.isDangerous) continue;
      const dx = player.position.x - z.mesh.position.x;
      const dz = player.position.z - z.mesh.position.z;
      if (Math.hypot(dx, dz) < z.radius + PLAYER_RADIUS) {
        if (tryHitPlayer()) { triggerGameOver(); break; }
        break;
      }
    }
  }

  // All enemies dead + wave duration elapsed → next wave
  if (gameState === 'playing' &&
      pendingSpawns.length === 0 &&
      waveTimer >= waveDuration &&
      enemies.length > 0 &&
      enemies.every(e => !e.alive && !e._dying)) {
    bullets.clear();
    for (const c of chunks) c.remove(scene); chunks = [];
    // Wave-clear burst: 16 white/gold particles from center (after old chunks cleared)
    for (let i = 0; i < 16; i++) {
      const a   = (i / 16) * Math.PI * 2;
      const col = (i % 2 === 0) ? 0xffffff : 0xffdd44;
      chunks.push(new Chunk(scene, 0, 0.3, 0, Math.cos(a) * 8, 1.5, Math.sin(a) * 8, col, 0.12));
    }
    audio.waveClear();
    addShake(0.22);
    score += wave * 500;
    if (roguelikeMode) showUpgradeCards();
    else               spawnWave();  // arcade: straight to next wave, no upgrade pick
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
resize();
loop();
