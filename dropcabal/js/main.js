// Drop Cabal — Cabal-style gallery shooter, suds-jack flavour.
// Layered shooting: the crosshair raycasts into a perspective field, player tracers
// fly INTO the depth rows (near enemies/scenery intercept shots aimed at far ones),
// enemy orbs fly OUT toward the player strip and must be dodged / rolled through.
// Pixel look: renders at 220px internal height, upscaled with image-rendering:pixelated;
// everything is unlit MeshBasicMaterial, NoToneMapping.

import * as THREE from 'three';
import { PAL } from './palette.js';
import { AudioKit } from './audio.js';
import { InputManager } from './input.js';
import { DebrisPool, BoomPool } from './fx.js';
import { TracerPool, OrbPool, GrenadePool } from './shots.js';
import { Enemy, EType, ECFG } from './enemy.js';
import { Player, PLAYER_Z, PLAYER_X_MAX } from './player.js';

// ---------------------------------------------------------------- constants
const PIXEL_H = 220;          // internal render height (Cabal-era chunk)
const AIM_WALL_Z = -32;       // invisible far plane the crosshair slides on
const FIRE_RATE = 1 / 9;
const TRACER_SPEED = 90;
const NADE_RADIUS = 5.4;
const ORB_G = 10;             // keep in sync with shots.js lob gravity

const ROWS = [
  { z: -26, half: 18 },       // far
  { z: -16, half: 16 },       // mid
  { z: -7,  half: 13 },       // near
];
const ROW_W = [0.45, 0.35, 0.2];

// ---------------------------------------------------------------- renderer / scene
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 250);

function resize() {
  const a = window.innerWidth / Math.max(1, window.innerHeight);
  const ih = PIXEL_H;
  const iw = Math.min(640, Math.round((ih * a) / 2) * 2);
  renderer.setSize(iw, ih, false);
  camera.aspect = iw / ih;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- backdrop
function makeSky() {
  // canvas aspect matches the 190x80 plane so the sun stays round
  const c = document.createElement('canvas');
  c.width = 608; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, PAL.SKY_TOP);
  grad.addColorStop(0.55, PAL.SKY_MID);
  grad.addColorStop(1, PAL.SKY_HORIZON);
  g.fillStyle = grad;
  g.fillRect(0, 0, 608, 256);
  // low sun on the horizon
  g.fillStyle = PAL.SUN_HALO;
  g.beginPath(); g.arc(304, 218, 40, 0, 7); g.fill();
  g.fillStyle = PAL.SUN;
  g.beginPath(); g.arc(304, 218, 28, 0, 7); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(190, 80),
    new THREE.MeshBasicMaterial({ map: tex, depthWrite: false }),
  );
  m.position.set(0, 26, -60);
  m.renderOrder = -10;
  scene.add(m);
}

function makeHills(color, z, amp, w = 180) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const x = -w / 2 + (w * i) / steps;
    const y = 1.5 + Math.abs(Math.sin(i * 2.7 + z)) * amp + Math.sin(i * 1.3) * amp * 0.4;
    shape.lineTo(x, y);
  }
  shape.lineTo(w / 2, 0);
  shape.lineTo(-w / 2, 0);
  const m = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color }),
  );
  m.position.set(0, 0, z);
  scene.add(m);
}

function makeGround() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = PAL.GROUND;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = PAL.GROUND_CHECK;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      if ((x + y) % 2 === 0) g.fillRect(x * 8, y * 8, 8, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(26, 10);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 84),
    new THREE.MeshBasicMaterial({ map: tex }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -18);
  scene.add(ground);

  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 11),
    new THREE.MeshBasicMaterial({ color: PAL.FOREGROUND }),
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(0, 0.02, PLAYER_Z + 1);
  scene.add(strip);

  // low sandbag bumps between the strip and the field
  const bagGeo = new THREE.SphereGeometry(0.55, 8, 6);
  const bagMat = new THREE.MeshBasicMaterial({ color: PAL.SANDBAG });
  for (let x = -30; x <= 30; x += 1.6) {
    const bag = new THREE.Mesh(bagGeo, bagMat);
    bag.position.set(x, 0.1, PLAYER_Z - 5.2);
    bag.scale.set(1, 0.55, 0.8);
    scene.add(bag);
  }
}

makeSky();
makeHills(PAL.HILL_FAR, -44, 9);
makeHills(PAL.HILL_NEAR, -38, 5.5);
makeGround();

// ---------------------------------------------------------------- crosshair
const crosshair = new THREE.Group();
{
  const mat = new THREE.MeshBasicMaterial({
    color: PAL.CROSSHAIR, depthTest: false, side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.5, 12), mat);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.09, 8), mat);
  const tickGeo = new THREE.PlaneGeometry(0.1, 0.28);
  crosshair.add(ring, dot);
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(tickGeo, mat);
    const a = (i * Math.PI) / 2;
    t.position.set(Math.sin(a) * 0.66, Math.cos(a) * 0.66, 0);
    t.rotation.z = -a;
    crosshair.add(t);
  }
  crosshair.traverse((o) => { o.renderOrder = 999; });
  scene.add(crosshair);
}

// ---------------------------------------------------------------- pools / actors
const audio = new AudioKit();
const input = new InputManager();
const player = new Player(scene);
const debris = new DebrisPool(scene);
const booms = new BoomPool(scene);
const tracers = new TracerPool(scene, 48, PAL.TRACER);
const orbs = new OrbPool(scene, 64);
const grenades = new GrenadePool(scene, 8, PAL.GRENADE);

let enemies = [];
let towers = [];

// shared scenery resources
const chunkGeo = new THREE.BoxGeometry(1.5, 1.2, 1.5);
const chunkMats = [
  new THREE.MeshBasicMaterial({ color: PAL.TOWER_A }),
  new THREE.MeshBasicMaterial({ color: PAL.TOWER_B }),
];
const bonusMat = new THREE.MeshBasicMaterial({ color: PAL.TOWER_BONUS });

function clearScenery() {
  for (const tw of towers)
    for (const ch of tw.chunks) scene.remove(ch.mesh);
  towers = [];
}

function buildScenery() {
  clearScenery();
  const n = 5 + Math.min(3, stage);
  for (let i = 0; i < n; i++) {
    const x = (Math.random() * 2 - 1) * 16;
    const z = -9 - Math.random() * 19;
    const bonus = Math.random() < 0.22;
    const count = 2 + Math.floor(Math.random() * 3);
    const chunks = [];
    for (let k = 0; k < count; k++) {
      const mat = bonus && k === count - 1 ? bonusMat : chunkMats[k % 2];
      const mesh = new THREE.Mesh(chunkGeo, mat);
      const y = 0.6 + k * 1.2;
      mesh.position.set(x, y, z);
      mesh.rotation.y = (Math.random() - 0.5) * 0.4;
      scene.add(mesh);
      chunks.push({ mesh, y });
    }
    towers.push({ x, z, chunks, bonus });
  }
}

function popChunk(tw) {
  const ch = tw.chunks.pop();
  if (!ch) return;
  const color = ch.mesh.material.color.getHex();
  scene.remove(ch.mesh);
  debris.burst(tw.x, ch.y, tw.z, color, 10, 7);
  addScore(50);
  audio.crumble();
  trauma = Math.min(1, trauma + 0.08);
  if (!tw.chunks.length && tw.bonus) {
    nades = Math.min(9, nades + 1);
    audio.pickup();
    toast('+1 BOMB!');
    updateHud();
  }
}

// ---------------------------------------------------------------- game state
let state = 'title';          // title | play | clear | over
let paused = false;
let score = 0;
let hi = Number(localStorage.getItem('dropCabalHi') || 0);
let lives = 3;
let nades = 3;
let stage = 1;
let quota = 0;
let kills = 0;
let spawned = 0;
let spawnT = 0;
let clearT = 0;
let overT = 0;
let fireT = 0;
let nadeCd = 0;
let trauma = 0;
let announced = new Set();

// ---------------------------------------------------------------- HUD
const el = {
  score: document.getElementById('score'),
  hi: document.getElementById('hi'),
  lives: document.getElementById('lives'),
  nades: document.getElementById('nades'),
  stage: document.getElementById('stageLbl'),
  gauge: document.getElementById('gaugeFill'),
  msg: document.getElementById('msg'),
  toast: document.getElementById('toast'),
  nadeBtn: document.getElementById('nadeBtn'),
};
el.hi.textContent = hi;

let toastT = 0;
function toast(text) {
  el.toast.textContent = text;
  el.toast.style.display = 'block';
  toastT = 1.8;
}

function showMsg(html) {
  el.msg.innerHTML = html;
  el.msg.style.display = html ? 'block' : 'none';
}

function addScore(n) {
  score += n;
  if (score > hi) {
    hi = score;
    el.hi.textContent = hi;
  }
  el.score.textContent = score;
}

function updateHud() {
  el.lives.textContent = '●'.repeat(Math.max(0, lives)) || '—';
  el.nades.textContent = nades;
  el.stage.textContent = `STAGE ${stage}`;
  el.gauge.style.width = `${Math.min(100, (kills / Math.max(1, quota)) * 100)}%`;
}

el.nadeBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  input.pressGrenade();
});

// ---------------------------------------------------------------- flow
function clearActors() {
  for (const e of enemies) e.dispose(scene);
  enemies = [];
  orbs.clear();
  for (let i = tracers.active.length - 1; i >= 0; i--) tracers.recycleAt(i);
}

function startRun() {
  audio.init();
  audio.resume();
  score = 0;
  el.score.textContent = 0;
  lives = 3;
  nades = 3;
  stage = 1;
  announced = new Set();
  player.reset();
  startStage();
}

function startStage() {
  clearActors();
  buildScenery();
  input.consumeRoll();
  input.consumeNade();
  grenades.freshBooms();   // drain booms that landed during the CLEAR banner
  quota = 14 + stage * 6;
  kills = 0;
  spawned = 0;
  spawnT = 0.8;
  state = 'play';
  paused = false;
  updateHud();
  showMsg(`STAGE ${stage}<br><small>GO!</small>`);
  setTimeout(() => { if (state === 'play') showMsg(''); }, 1300);
}

function stageClear() {
  state = 'clear';
  clearT = 2.4;
  const bonus = stage * 1000;
  addScore(bonus);
  // stragglers pop for flavour
  for (const e of enemies) {
    debris.burst(e.x, e.group.position.y, e.z, e.cfg.color, 10, 8);
    e.dispose(scene);
  }
  enemies = [];
  orbs.clear();
  nades = Math.min(9, nades + 1);
  audio.fanfare();
  updateHud();
  showMsg(`STAGE ${stage} CLEAR<br><small>BONUS ${bonus} &middot; +1 BOMB</small>`);
}

function gameOver() {
  state = 'over';
  overT = 1.2;
  localStorage.setItem('dropCabalHi', String(hi));
  audio.over();
  input.consumeAny();
  showMsg(`GAME OVER<br><small>SCORE ${score} &middot; HI ${hi}<br><br>CLICK / TAP TO RETRY</small>`);
}

function showTitle() {
  state = 'title';
  input.consumeAny();
  showMsg(
    'DROP CABAL<br><small>toko drop gels &times; cabal</small><br><br>' +
    '<small>MOUSE aim &middot; HOLD LMB fire &middot; A/D run<br>' +
    'SPACE roll &middot; G / RMB grenade &middot; ESC pause<br>' +
    'touch: left drag run (tap = roll) &middot; right finger aim+fire<br><br>' +
    'CLICK / TAP TO START</small>',
  );
}

// ---------------------------------------------------------------- spawning
function pickType() {
  const table = [[EType.BLOB, 50], [EType.CUBE, 28]];
  if (stage >= 2) table.push([EType.SPITTOR, 18]);
  if (stage >= 3) table.push([EType.HEAVY, 12]);
  if (stage >= 4) table.push([EType.BIG, 7]);
  let total = 0;
  for (const [, w] of table) total += w;
  let roll = Math.random() * total;
  for (const [t, w] of table) {
    roll -= w;
    if (roll <= 0) return t;
  }
  return EType.BLOB;
}

function pickRow() {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < ROWS.length; i++) {
    acc += ROW_W[i];
    if (r <= acc) return ROWS[i];
  }
  return ROWS[0];
}

function spawnEnemy() {
  const type = pickType();
  const e = new Enemy(scene, type, pickRow(), Math.random() < 0.5 ? -1 : 1);
  enemies.push(e);
  spawned++;
  if (type !== EType.BLOB && !announced.has(type)) {
    announced.add(type);
    toast(`${ECFG[type].name}!`);
  }
}

function director(dt) {
  if (spawned >= quota) return;
  spawnT -= dt;
  const cap = Math.min(8, 3 + Math.floor(stage * 0.8));
  const aliveMain = enemies.reduce((n, e) => n + (e.type !== EType.MINI ? 1 : 0), 0);
  if (spawnT <= 0 && aliveMain < cap) {
    spawnEnemy();
    const interval = Math.max(0.5, 1.5 - stage * 0.1);
    spawnT = interval * (0.7 + Math.random() * 0.6);
  }
}

// ---------------------------------------------------------------- enemy fire
const _from = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _vel = new THREE.Vector3();

function enemyShoot(e) {
  const cfg = e.cfg;
  e.muzzle(_from);
  const tx = player.x;
  const ty = 0.7;
  const sp = Math.min(14, 7.5 + stage * 0.5);
  switch (cfg.shot) {
    case 'aim':
    case 'fast': {
      _dir.set(tx - _from.x, ty - _from.y, PLAYER_Z - _from.z).normalize();
      orbs.spawn(_from, _vel.copy(_dir).multiplyScalar(cfg.shot === 'fast' ? sp * 1.6 : sp), cfg.orb);
      audio.pew();
      break;
    }
    case 'lob': {
      const dx = tx - _from.x;
      const dz = PLAYER_Z - _from.z;
      const T = Math.hypot(dx, dz) / (sp * 0.85);
      _vel.set(dx / T, (0.5 - _from.y) / T + 0.5 * ORB_G * T, dz / T);
      orbs.spawn(_from, _vel, cfg.orb, true);
      audio.lob();
      break;
    }
    case 'spread': {
      _dir.set(tx - _from.x, ty - _from.y, PLAYER_Z - _from.z).normalize();
      for (const a of [-0.16, 0, 0.16]) {
        _vel.copy(_dir).multiplyScalar(sp).applyAxisAngle(THREE.Object3D.DEFAULT_UP, a);
        orbs.spawn(_from, _vel, cfg.orb);
      }
      audio.pew();
      break;
    }
  }
}

// ---------------------------------------------------------------- combat
const _ab = new THREE.Vector3();
const _ac = new THREE.Vector3();
const _pt = new THREE.Vector3();

// param t of closest approach if segment p0→p1 passes within r of c, else -1
function segSphereT(p0, p1, c, r) {
  _ab.copy(p1).sub(p0);
  const len2 = _ab.lengthSq();
  let t = len2 > 0 ? _ac.copy(c).sub(p0).dot(_ab) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  _pt.copy(p0).addScaledVector(_ab, t);
  return _pt.distanceToSquared(c) <= r * r ? t : -1;
}

function killEnemy(e, silentScore = false) {
  kills++;
  if (!silentScore) addScore(e.cfg.score);
  debris.burst(e.x, e.group.position.y, e.z, e.cfg.color, e.type === EType.BIG ? 22 : 12, 9);
  audio.splat();
  trauma = Math.min(1, trauma + (e.type === EType.BIG ? 0.3 : 0.12));
  if (e.type === EType.BIG) {
    for (const off of [-1.2, 1.2])
      enemies.push(new Enemy(scene, EType.MINI, e.row, 1, e.x + off));
  }
  e.dispose(scene);
  enemies.splice(enemies.indexOf(e), 1);
  updateHud();
  if (kills >= quota && state === 'play') stageClear();
}

function hitPlayer() {
  if (!player.hurt()) return;
  audio.phit();
  trauma = 1;
  debris.burst(player.x, 0.8, PLAYER_Z, PAL.PLAYER, 18, 10);
  lives--;
  orbs.clear();
  updateHud();
  if (lives <= 0) gameOver();
}

function boomAt(b) {
  booms.spawn(b.x, b.y, b.z, NADE_RADIUS, PAL.BOOM);
  debris.burst(b.x, b.y, b.z, PAL.BOOM, 16, 11);
  audio.boom();
  trauma = 1;
  const r2 = NADE_RADIUS * NADE_RADIUS;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const dx = e.x - b.x, dz = e.z - b.z;
    if (dx * dx + dz * dz <= r2) killEnemy(e);
    if (state !== 'play') return;   // stage cleared mid-boom
  }
  for (const tw of towers) {
    const dx = tw.x - b.x, dz = tw.z - b.z;
    if (dx * dx + dz * dz <= r2)
      while (tw.chunks.length) popChunk(tw);
  }
  for (let i = orbs.active.length - 1; i >= 0; i--) {
    const p = orbs.active[i].mesh.position;
    const dx = p.x - b.x, dz = p.z - b.z;
    if (dx * dx + dz * dz <= r2) orbs.recycleAt(i);
  }
}

function collideTracers() {
  for (let i = tracers.active.length - 1; i >= 0; i--) {
    const tr = tracers.active[i];
    const p0 = tr.prev;
    const p1 = tr.mesh.position;
    let bestT = Infinity;
    let hitEnemy = null;
    let hitTower = null;
    let hitOrb = -1;

    for (const tw of towers) {
      if (!tw.chunks.length) continue;
      for (const ch of tw.chunks) {
        _ac.set(tw.x, ch.y, tw.z);
        const t = segSphereT(p0, p1, _ac, 1.0);
        if (t >= 0 && t < bestT) { bestT = t; hitTower = tw; hitEnemy = null; hitOrb = -1; }
      }
    }
    for (const e of enemies) {
      const t = segSphereT(p0, p1, e.group.position, e.r + 0.18);
      if (t >= 0 && t < bestT) { bestT = t; hitEnemy = e; hitTower = null; hitOrb = -1; }
    }
    for (let k = 0; k < orbs.active.length; k++) {
      const t = segSphereT(p0, p1, orbs.active[k].mesh.position, 0.5);
      if (t >= 0 && t < bestT) { bestT = t; hitOrb = k; hitEnemy = null; hitTower = null; }
    }
    // ground / far wall
    if (p1.y <= 0 && p0.y > 0) {
      const tG = p0.y / (p0.y - p1.y);
      if (tG < bestT) {
        bestT = tG;
        _pt.copy(p0).lerp(p1, tG);
        debris.burst(_pt.x, 0.15, _pt.z, PAL.DUST, 4, 3);
        tracers.recycleAt(i);
        continue;
      }
    }
    if (p1.z <= AIM_WALL_Z - 1) {
      tracers.recycleAt(i);
      continue;
    }

    if (hitEnemy) {
      if (hitEnemy.takeHit(1)) killEnemy(hitEnemy);
      else audio.thock();
      tracers.recycleAt(i);
    } else if (hitTower) {
      popChunk(hitTower);
      tracers.recycleAt(i);
    } else if (hitOrb >= 0) {
      const p = orbs.active[hitOrb].mesh.position;
      booms.spawn(p.x, p.y, p.z, 0.9, 0xffffff, 0.18);
      orbs.recycleAt(hitOrb);
      addScore(20);
      audio.pop();
      tracers.recycleAt(i);
    }
  }
}

// ---------------------------------------------------------------- aim
const raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const aimPoint = new THREE.Vector3(0, 1, -20);
const _aimTmp = new THREE.Vector3();

function computeAim() {
  raycaster.setFromCamera(input.aimNDC(_ndc), camera);
  const o = raycaster.ray.origin;
  const d = raycaster.ray.direction;
  if (d.y < -0.0001) {
    const t = -o.y / d.y;
    _aimTmp.copy(o).addScaledVector(d, t);
    if (_aimTmp.z > AIM_WALL_Z && _aimTmp.z < PLAYER_Z - 4) {
      aimPoint.copy(_aimTmp);
      aimPoint.y = 0.2;
      return;
    }
  }
  const tw = (AIM_WALL_Z - o.z) / d.z;
  if (tw > 0) {
    aimPoint.copy(o).addScaledVector(d, tw);
    aimPoint.y = Math.max(0.3, Math.min(16, aimPoint.y));
    aimPoint.x = Math.max(-30, Math.min(30, aimPoint.x));
    aimPoint.z = AIM_WALL_Z;
  }
}

// ---------------------------------------------------------------- update
const _jitter = new THREE.Vector3();
const enemyCtx = { dt: 0, playerX: 0, playerZ: PLAYER_Z, shoot: enemyShoot };

function updatePlay(dt) {
  director(dt);

  computeAim();
  player.update(dt, input.moveX, input.firing, aimPoint);

  if (input.consumeRoll() && player.tryRoll(input.moveX)) audio.roll();

  if (nadeCd > 0) nadeCd -= dt;
  if (input.consumeNade() && nades > 0 && nadeCd <= 0) {
    nades--;
    nadeCd = 0.5;
    _aimTmp.set(aimPoint.x, 0.3, Math.min(aimPoint.z, PLAYER_Z - 5));
    grenades.throwTo(player.gunTip(), _aimTmp, 0.75);
    audio.lob();
    updateHud();
  }

  fireT -= dt;
  if (input.firing && fireT <= 0) {
    fireT = FIRE_RATE;
    _jitter.set(
      aimPoint.x + (Math.random() - 0.5) * 1.1,
      aimPoint.y + (Math.random() - 0.5) * 0.8,
      aimPoint.z,
    );
    tracers.spawn(player.gunTip(), _jitter, TRACER_SPEED);
    audio.fire();
  }

  enemyCtx.dt = dt;
  enemyCtx.playerX = player.x;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update(enemyCtx);
    if (e.type === EType.MINI && e.z >= PLAYER_Z - 0.6) {
      if (Math.abs(e.x - player.x) < 1.0) {
        hitPlayer();
        debris.burst(e.x, 0.5, e.z, e.cfg.color, 8, 7);
        e.dispose(scene);
        enemies.splice(i, 1);
        if (state !== 'play') return;
      } else if (e.z > PLAYER_Z + 1.5) {
        e.dispose(scene);
        enemies.splice(i, 1);
      }
    }
  }

  tracers.update(dt);
  collideTracers();
  if (state !== 'play') return;

  orbs.update(dt, PLAYER_Z + 3);
  for (let i = orbs.active.length - 1; i >= 0; i--) {
    if (i >= orbs.active.length) continue;   // hitPlayer() may have cleared the pool
    const p = orbs.active[i].mesh.position;
    if (p.z >= PLAYER_Z - 0.4 && p.z <= PLAYER_Z + 1.2 &&
        Math.abs(p.x - player.x) < 1.1 && p.y < 2.4) {
      orbs.recycleAt(i);
      hitPlayer();
      if (state !== 'play') return;
    }
  }

  grenades.update(dt);
  const fresh = grenades.freshBooms();
  if (fresh) {
    for (const b of fresh) {
      boomAt(b);
      if (state !== 'play') break;
    }
  }
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const camBase = new THREE.Vector3();
const camLook = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  if (input.consumePause() && (state === 'play' || paused)) {
    paused = !paused;
    showMsg(paused ? 'PAUSED<br><small>ESC TO RESUME</small>' : '');
  }

  el.nadeBtn.style.display = input.touchSeen ? 'block' : 'none';

  if (!paused) {
    if (state === 'title' || state === 'over') {
      computeAim();
      player.update(dt, 0, false, aimPoint);
      if (state === 'over') overT -= dt;
      if (input.consumeAny() && (state === 'title' || overT <= 0)) startRun();
    } else if (state === 'play') {
      updatePlay(dt);
    } else if (state === 'clear') {
      computeAim();
      player.update(dt, input.moveX, false, aimPoint);
      grenades.update(dt);
      clearT -= dt;
      if (clearT <= 0) {
        stage++;
        startStage();
      }
    }
    debris.update(dt);
    booms.update(dt);
    if (toastT > 0) {
      toastT -= dt;
      if (toastT <= 0) el.toast.style.display = 'none';
    }
    trauma = Math.max(0, trauma - dt * 2.2);
  }

  // crosshair follows aim even on menus
  crosshair.position.copy(aimPoint);
  crosshair.scale.setScalar(aimPoint.distanceTo(camera.position) * 0.045);

  // camera: gentle scroll with the player + trauma shake
  const shake = trauma * trauma * 0.55;
  camBase.set(
    player.x * 0.35 + (Math.random() - 0.5) * shake,
    7.4 + (Math.random() - 0.5) * shake,
    19.5,
  );
  camLook.set(player.x * 0.35, 1.9, -11);
  camera.position.copy(camBase);
  camera.lookAt(camLook);

  renderer.render(scene, camera);
}

showTitle();
updateHud();
animate();

// ---------------------------------------------------------------- debug handle
window.__dc = {
  enemies: () => enemies,
  orbs,
  tracers,
  player,
  debug: {
    state: () => state,
    score: () => score,
    setStage: (n) => { stage = n; startStage(); },
    addNades: (n) => { nades = Math.min(9, nades + n); updateHud(); },
    killAll: () => { while (enemies.length && state === 'play') killEnemy(enemies[0], true); },
    start: () => startRun(),
  },
};
