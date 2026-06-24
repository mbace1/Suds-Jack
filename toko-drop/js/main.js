import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { InputManager } from './input.js';
import { BulletPool, BULLET_R, FAT_BULLET_R } from './bullet.js';
import { Player, PLAYER_RADIUS } from './player.js';
import { Enemy, EnemyType, ENEMY_RADIUS } from './enemy.js';
import { audio } from './audio.js';

const HALF = 18;

// ── Wave scaling (Nex Machina pacing) ─────────────────────────────────────────
function getWaveScale(wave) {
  const w = wave - 1;
  return {
    speedMult:    Math.min(1 + w * 0.12, 2.8),
    intervalMult: Math.max(1 - w * 0.09, 0.35),
  };
}

// Returns { dur, list: [{type, t: spawnDelaySecs}] }
function getEnemySchedule(wave) {
  const { GLOBBO, SPITTOR, FANNER, WEEVA, SPLITTA,
          YELA_CUBE, ORANGE_CUBE, SLUDGE_CUBE, REDD_CUBE, PURP_CUBE, TORO, BAMBU, PYRA } = EnemyType;
  if (wave === 1) return { dur: 60, list: [
    { type: GLOBBO,      t: 0  },
    { type: YELA_CUBE,   t: 10 },
    { type: SPITTOR,     t: 20 },
    { type: FANNER,      t: 30 },
    { type: WEEVA,       t: 45 },
  ]};
  if (wave === 2) return { dur: 60, list: [
    { type: GLOBBO,      t: 0  },
    { type: YELA_CUBE,   t: 0  },
    { type: ORANGE_CUBE, t: 15 },
    { type: SPITTOR,     t: 25 },
    { type: FANNER,      t: 35 },
    { type: WEEVA,       t: 50 },
  ]};
  if (wave === 3) return { dur: 65, list: [
    { type: GLOBBO,      t: 0  },
    { type: YELA_CUBE,   t: 0  },
    { type: ORANGE_CUBE, t: 10 },
    { type: SLUDGE_CUBE, t: 20 },
    { type: SPITTOR,     t: 30 },
    { type: BAMBU,       t: 40 },
    { type: WEEVA,       t: 45 },
    { type: SPLITTA,     t: 55 },
  ]};
  if (wave === 4) return { dur: 65, list: [
    { type: GLOBBO,      t: 0  },
    { type: REDD_CUBE,   t: 0  },
    { type: ORANGE_CUBE, t: 10 },
    { type: SLUDGE_CUBE, t: 20 },
    { type: BAMBU,       t: 30 },
    { type: FANNER,      t: 35 },
    { type: WEEVA,       t: 45 },
    { type: SPLITTA,     t: 55 },
  ]};
  if (wave === 5) return { dur: 70, list: [
    { type: GLOBBO,      t: 0,  count: 3 },
    { type: REDD_CUBE,   t: 0  },
    { type: PURP_CUBE,   t: 10 },
    { type: ORANGE_CUBE, t: 20 },
    { type: PYRA,        t: 25 },
    { type: SLUDGE_CUBE, t: 35 },
    { type: FANNER,      t: 50 },
    { type: SPLITTA,     t: 60 },
  ]};
  if (wave === 6) return { dur: 70, list: [
    { type: YELA_CUBE,   t: 0  },
    { type: REDD_CUBE,   t: 0  },
    { type: PURP_CUBE,   t: 10 },
    { type: PYRA,        t: 15 },
    { type: ORANGE_CUBE, t: 25 },
    { type: BAMBU,       t: 30 },
    { type: SPITTOR,     t: 40 },
    { type: FANNER,      t: 50 },
    { type: TORO,        t: 62 },
  ]};
  return { dur: 75, list: [
    { type: GLOBBO,      t: 0,  count: 3 },
    { type: BAMBU,       t: 5  },
    { type: REDD_CUBE,   t: 10 },
    { type: PURP_CUBE,   t: 20 },
    { type: ORANGE_CUBE, t: 30 },
    { type: SLUDGE_CUBE, t: 40 },
    { type: SPLITTA,     t: 55 },
    { type: TORO,        t: 65 },
  ]};
}

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('canvas-game'),
  antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping      = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.setSize(innerWidth, innerHeight);

// IBL — needed for MeshPhysicalMaterial transmission + clearcoat
const _pmrem = new THREE.PMREMGenerator(renderer);
const _envTex = _pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
_pmrem.dispose();

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);
scene.fog = new THREE.Fog(0x0d0d1a, 42, 80);
scene.environment = _envTex;  // IBL for physical materials

// ── Camera ────────────────────────────────────────────────────────────────────
const CAM_REST = new THREE.Vector3(0, 26, 19);
const CAM_LOOK = new THREE.Vector3(0, 0, -2);
const camera   = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 120);
camera.position.copy(CAM_REST);
camera.lookAt(CAM_LOOK);

// ── Screen shake ─────────────────────────────────────────────────────────────
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

// ── Lights ────────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(8, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// ── Arena ─────────────────────────────────────────────────────────────────────
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(HALF * 2, HALF * 2),
  new THREE.MeshPhongMaterial({ color: 0x14142b }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
scene.add(new THREE.GridHelper(HALF * 2, 28, 0x22224a, 0x22224a));
const border = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(HALF * 2, 0.05, HALF * 2)),
  new THREE.LineBasicMaterial({ color: 0x5555cc }),
);
border.position.y = 0.02;
scene.add(border);

// ── Death FX: chunks + puddles ────────────────────────────────────────────────
class Chunk {
  constructor(sc, x, y, z, vx, vy, vz, color, size = 0.18) {
    this.vx = vx; this.vy = vy; this.vz = vz;
    this._life = 1.4;
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
    if (this.mesh.position.y < 0) {
      this.mesh.position.y = 0;
      this.vy = 0; this.vx *= 0.35; this.vz *= 0.35;
    }
    this.mat.opacity = Math.min(1, this._life / 0.3);
    return this._life > 0;
  }
  remove(sc) { sc.remove(this.mesh); }
}

class Puddle {
  constructor(sc, x, z, color, radius) {
    this._life = 5;
    this.mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false });
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 14), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(x, 0.01, z);
    sc.add(this.mesh);
  }
  update(dt) {
    this._life -= dt;
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
    const x = (Math.random() - 0.5) * 22;
    const z = (Math.random() - 0.5) * 22;
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

class Powerup {
  constructor(sc, x, z) {
    this._life = 8.0;
    this.x = x; this.z = z;
    this.collected = false;
    this.mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), this.mat);
    this.mesh.position.set(x, 0.6, z);
    sc.add(this.mesh);
    this._type = Math.random() < 0.5 ? 'invincible' : 'firerate';
  }
  update(dt, t) {
    this._life -= dt;
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

// ── Melee types ───────────────────────────────────────────────────────────────
const MELEE_TYPES = new Set([
  EnemyType.GLOBBO, EnemyType.SPLITTA,
  EnemyType.YELA_CUBE, EnemyType.SLUDGE_CUBE, EnemyType.REDD_CUBE, EnemyType.PURP_CUBE,
  EnemyType.REDD_MINI, EnemyType.PURP_MINI,
  EnemyType.TORO,
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
let wave         = 0;
let waveTimer    = 0;
let waveDuration = 60;
let pendingSpawns = [];

// ── Score ─────────────────────────────────────────────────────────────────────
let score   = 0;
let streak  = 0;
let hiScore = parseInt(localStorage.getItem('tokoDropHi') || '0');

function onKill(e) {
  streak++;
  score += 100 * streak;
  addShake(0.13);
  audio.enemyDie();
  // Spawn death FX from chunk data populated by e.destroy()
  for (const cd of e.chunks) {
    chunks.push(new Chunk(scene, cd.x, cd.y, cd.z, cd.vx, cd.vy, cd.vz, e.color, cd.size));
  }
  puddles.push(new Puddle(scene, e.position.x, e.position.z, e.color, e.radius * 1.5));
}

function onPlayerHit() {
  streak = 0;
  addShake(0.38);
  audio.playerHit();
}

// ── Game state ────────────────────────────────────────────────────────────────
// 'title' | 'playing' | 'paused' | 'gameover'
let gameState    = 'title';
let restartTimer = 0;

// ── UI canvas ─────────────────────────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx      = uiCanvas.getContext('2d');
const overlay  = document.getElementById('overlay');
const _proj    = new THREE.Vector3();

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

function drawHUD() {
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);

  if (gameState !== 'playing' && gameState !== 'paused') return;

  // Sticks
  drawStick(input.left,  uiCanvas.width * 0.22, uiCanvas.height * 0.78);
  drawStick(input.right, uiCanvas.width * 0.78, uiCanvas.height * 0.78);

  // Pause button (top centre)
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('❙❙', uiCanvas.width / 2, 36);
  ctx.textAlign = 'left';

  // Wave + score (top row)
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 14px monospace';
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
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`×${streak} STREAK`, uiCanvas.width - 16, 44);
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
}

// ── Overlay helpers ───────────────────────────────────────────────────────────
function showTitle() {
  overlay.style.display = 'block';
  overlay.innerHTML =
    `<div style="font-size:58px;font-weight:bold;letter-spacing:4px">TOKO DROP</div>` +
    `<div style="font-size:14px;opacity:0.5;margin:10px 0 28px">TWIN-STICK BULLET-HELL</div>` +
    `<div style="font-size:16px;opacity:0.8">SPACE / TAP TO START</div>` +
    `<div style="font-size:12px;opacity:0.4;margin-top:12px">` +
    `WASD + hold LMB to aim/fire · SPACE to dash<br>` +
    `Right stick to aim/fire · release to dash · ESC pause<br>` +
    `E to toggle eyes</div>`;
}

function showPause() {
  overlay.style.display = 'block';
  overlay.innerHTML =
    `<div style="font-size:52px;font-weight:bold">PAUSED</div>` +
    `<div style="font-size:14px;opacity:0.5;margin-top:12px">ESC / ❙❙ TO RESUME</div>`;
}

function showGameOver() {
  overlay.style.display = 'block';
  const newHi = score >= hiScore && score > 0;
  overlay.innerHTML =
    `<div style="font-size:52px;font-weight:bold">YOU DIED</div>` +
    `<div style="font-size:22px;margin-top:8px;color:#ff6644">SCORE ${score}</div>` +
    (newHi ? `<div style="font-size:16px;color:#ffdd44;margin-top:6px">NEW BEST!</div>` : ``) +
    `<div style="font-size:13px;opacity:0.4;margin-top:16px">Restarting…</div>`;
}

function announceWave() {
  overlay.style.display = 'block';
  overlay.innerHTML = `<div style="font-size:48px;font-weight:bold">WAVE ${wave}</div>`;
  setTimeout(() => { if (gameState === 'playing') overlay.style.display = 'none'; }, 1100);
}

// ── Wave / restart helpers ────────────────────────────────────────────────────
function clearFX() {
  for (const c of chunks)        c.remove(scene); chunks        = [];
  for (const p of puddles)       p.remove(scene); puddles       = [];
  for (const z of poisonZones)   z.remove(scene); poisonZones   = [];
  for (const s of slimeTrails)   s.remove(scene); slimeTrails   = [];
  for (const r of sludgeRibbons) r.remove(scene); sludgeRibbons = [];
  for (const a of bambuAoes)     a.remove(scene); bambuAoes     = [];
  for (const g of gates)        g.remove(scene); gates         = [];
  for (const p of powerups)     p.remove(scene); powerups      = [];
}

function spawnWave() {
  for (const e of enemies) e.removeFrom(scene);
  enemies = [];
  for (const g of gates)    g.remove(scene); gates    = [];
  for (const p of powerups) p.remove(scene); powerups = [];
  wave++;
  const { speedMult, intervalMult } = getWaveScale(wave);
  const { dur, list } = getEnemySchedule(wave);
  waveDuration = dur;
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
        clusterOffset: k > 0 ? { x: (Math.random()-0.5)*3, z: (Math.random()-0.5)*3 } : null,
        speedMult,
        intervalMult,
      });
    }
  });
  if (wave >= 3) gates.push(new Gate(scene));
  announceWave();
}

function startGame() {
  overlay.style.display = 'none';
  score  = 0; streak = 0; wave = 0;
  player.reset();
  bullets.clear();
  clearFX();
  spawnWave();
  gameState = 'playing';
}

function triggerGameOver() {
  gameState = 'gameover';
  restartTimer = 3.2;
  if (score > hiScore) {
    hiScore = score;
    localStorage.setItem('tokoDropHi', hiScore);
  }
  addShake(0.9);
  audio.playerDie();
  showGameOver();
}

// ── Input wiring ──────────────────────────────────────────────────────────────
input.onDash  = () => {
  if (gameState === 'playing') {
    const move = input.getMoveDir();
    const dir = { x: move.x, z: move.z, valid: move.x !== 0 || move.z !== 0 };
    player.dash(dir);
  }
};
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused';  showPause(); }
  else if (gameState === 'paused')  { gameState = 'playing'; overlay.style.display = 'none'; }
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

// ── Mouse aim ─────────────────────────────────────────────────────────────────
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

// ── Main loop ─────────────────────────────────────────────────────────────────
let prev = performance.now();
showTitle();

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt  = Math.min((now - prev) / 1000, 0.05);
  prev = now;

  updateShake(dt);

  // Title / paused — just render the scene, no game logic
  if (gameState === 'title' || gameState === 'paused') {
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
    if (restartTimer <= 0) startGame();
    renderer.render(scene, camera);
    drawHUD();
    return;
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  const moveDir = input.getMoveDir();
  let aimDir    = input.getAimDir();
  if (aimDir.useMouse) aimDir = mouseAimDir();

  // Trickle spawn pending enemies
  waveTimer += dt;
  while (pendingSpawns.length > 0 && waveTimer >= pendingSpawns[0].delay) {
    const s = pendingSpawns.shift();
    const r = HALF * 0.6;
    const bx = Math.cos(s.angle) * r, bz = Math.sin(s.angle) * r;
    const ox = s.clusterOffset ? s.clusterOffset.x : 0;
    const oz = s.clusterOffset ? s.clusterOffset.z : 0;
    enemies.push(new Enemy(scene, s.type, bx + ox, bz + oz, s.speedMult, s.intervalMult));
  }

  player.update(dt, moveDir, aimDir, bullets, HALF);
  for (const e of enemies) { e.update(dt, player.position, bullets); e.updateDeath(dt); }
  bullets.update(dt, HALF);

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
  for (let ai = bullets.active.length - 1; ai >= 0; ai--) {
    const s = bullets.active[ai];
    if (!bullets.isPlayer[s]) continue;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = bullets.x[s] - e.position.x;
      const dz = bullets.z[s] - e.position.z;
      if (Math.hypot(dx, dz) < BULLET_R + e.radius) {
        const died = e.hit();
        bullets.recycleAt(ai);
        if (died) {
          onKill(e);
          // SPLITTA fires a death-burst ring
          if (e.type === EnemyType.SPLITTA) {
            for (let j = 0; j < 12; j++) {
              const a = (j / 12) * Math.PI * 2;
              bullets.spawnDir(e.position.x, e.position.z, Math.cos(a), Math.sin(a), false, 0xaaff44);
            }
          }
        } else {
          audio.enemyHit();
        }
        break;
      }
    }
  }

  // Collision: enemy bullets → player
  if (!player.invincible) {
    for (let ai = bullets.active.length - 1; ai >= 0; ai--) {
      const s = bullets.active[ai];
      if (bullets.isPlayer[s]) continue;
      const dx = bullets.x[s] - player.position.x;
      const dz = bullets.z[s] - player.position.z;
      const br = bullets.fat[s] ? FAT_BULLET_R : BULLET_R;
      if (Math.hypot(dx, dz) < br + PLAYER_RADIUS) {
        player.hit();
        bullets.recycleAt(ai);
        onPlayerHit();
        if (!player.alive) { triggerGameOver(); break; }
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
        player.hit(); onPlayerHit();
        if (e.type === EnemyType.TORO && e._state === 'dashing') addShake(0.27);
        if (!player.alive) { triggerGameOver(); break; }
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

  // Gate interactions
  if (gates.length > 0) {
    const px = player.position.x, pz = player.position.z;
    for (const g of gates) {
      if (!g.alive) continue;
      if (g.hitsPoint(px, pz, PLAYER_RADIUS)) {
        if (player.dashing) {
          g.deactivate(scene);
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

  // Powerup collection
  for (const pu of powerups) {
    if (pu.collected) continue;
    const dx = player.position.x - pu.x, dz = player.position.z - pu.z;
    if (Math.hypot(dx, dz) < 0.8 + PLAYER_RADIUS) {
      pu.collected = true;
      if (pu._type === 'invincible') {
        player.grantInvincibility(3.0);
      } else {
        player.grantFireRateBoost(5.0);
      }
      audio.waveClear();
    }
  }

  // Poison zone player collision
  if (!player.invincible) {
    for (const z of poisonZones) {
      if (!z.isDangerous) continue;
      const dx = player.position.x - z.mesh.position.x;
      const dz = player.position.z - z.mesh.position.z;
      if (Math.hypot(dx, dz) < z.radius + PLAYER_RADIUS) {
        player.hit(); onPlayerHit();
        if (!player.alive) { triggerGameOver(); break; }
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
    spawnWave();
  }

  renderer.render(scene, camera);
  drawHUD();
}

// ── Resize ────────────────────────────────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  if (camera) { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  uiCanvas.width = innerWidth; uiCanvas.height = innerHeight;
}
window.addEventListener('resize', resize);
resize();
loop();
