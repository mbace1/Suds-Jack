import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { InputManager } from './input.js';
import { Player } from './player.js';
import { DaggerPool } from './daggers.js';
import { GemPool } from './gems.js';
import { DebrisPool, VoxelSprite, MODELS } from './voxel.js';
import { Skull, Wraith, Brute, Totem, Serpent, Spider, Leviathan } from './enemy.js';
import { AudioKit } from './audio.js';

const ARENA_R = 26;
const BASE_FOV = 78;
const FIRE_SPREAD = 0.035;   // radians
const SKULL_CAP = 42;
const TOTEM_CAP = 6;
const SERPENT_CAP = 2;
const SHOTGUN_CD = 0.5;
const STREAM_HOLD = 0.26;    // desktop: hold this long before the stream starts

// Devil-Daggers-style dagger levels, advanced by collecting gems.
const LEVEL_GEMS = [0, 0, 10, 30]; // gems needed to reach index level
const WEAPON = [
  null,
  { stream: 12, shotgun: 8, homing: false },
  { stream: 17, shotgun: 12, homing: false },
  { stream: 17, shotgun: 14, homing: true },
];
const GEM_DROPS = { totem: 3, brute: 2, serpent: 1, leviathan: 10 };

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('canvas-game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x14041c, 30, 95);

const camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 300);
scene.add(camera); // so the first-person hand (a camera child) renders

// HYPERDEMON-ish chromatic aberration, driven by the trauma system
const ChromaShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0.0012 } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 d = (vUv - 0.5) * uAmount;
      gl_FragColor = vec4(
        texture2D(tDiffuse, vUv - d).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv + d).b,
        1.0);
    }`,
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const afterimage = new AfterimagePass(0.72); // motion smear on everything bright
composer.addPass(afterimage);
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.45, 0.6);
composer.addPass(bloom);
const chromaPass = new ShaderPass(ChromaShader);
composer.addPass(chromaPass);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- arena
function makeFloorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0414';
  g.fillRect(0, 0, 256, 256);
  for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
    if (Math.random() < 0.3) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(tx * 64, ty * 64, 64, 64);
    }
  }
  g.strokeStyle = 'rgba(255,45,170,0.16)';
  g.lineWidth = 1;
  for (let i = 0; i <= 256; i += 32) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
  }
  g.strokeStyle = 'rgba(255,45,170,0.55)';
  g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return tex;
}

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(ARENA_R + 3, 64).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ map: makeFloorTexture() }),
);
scene.add(floor);

const edgeRing = new THREE.Mesh(
  new THREE.TorusGeometry(ARENA_R, 0.12, 8, 96).rotateX(Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(2.4, 0.4, 2.0) }),
);
edgeRing.position.y = 0.06;
scene.add(edgeRing);

// HYPERDEMON rainbow-band sky: hue wheel around the horizon, two counter-
// rotating band layers, hot magenta glow right at the horizon line.
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: { uTime: { value: 0 } },
  vertexShader: /* glsl */`
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vPos;
    uniform float uTime;
    vec3 hue(float h) {
      vec3 p = abs(fract(vec3(h) + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
      return clamp(p - 1.0, 0.0, 1.0);
    }
    void main() {
      vec3 d = normalize(vPos);
      float h = d.y;
      float ang = atan(d.z, d.x);
      vec3 horizon = vec3(0.26, 0.02, 0.33);
      vec3 zenith  = vec3(0.012, 0.0, 0.03);
      vec3 col = mix(horizon, zenith, clamp(abs(h) * 2.2, 0.0, 1.0));
      float b1 = 0.5 + 0.5 * sin(ang * 7.0 - uTime * 0.6 + h * 9.0);
      float b2 = 0.5 + 0.5 * sin(ang * 13.0 + uTime * 0.9 - h * 14.0);
      vec3 rain = hue(fract(ang / 6.2831 + uTime * 0.02 + h * 0.35));
      float horiz = 1.0 - clamp(abs(h) * 2.6, 0.0, 1.0);
      col += rain * (0.16 * b1 + 0.10 * b2) * horiz;
      col += vec3(0.5, 0.1, 0.6) * pow(max(0.0, 1.0 - abs(h) * 4.0), 3.0) * 0.35;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(220, 32, 16), skyMat));

// drifting dust motes for depth + speed perception
const dust = (() => {
  const n = 400;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 42;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * 9;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xff66cc, size: 0.07, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const p = new THREE.Points(geo, mat);
  scene.add(p);
  return p;
})();

// ---------------------------------------------------------------- actors
const input = new InputManager();
const player = new Player(camera, input, ARENA_R);
const daggers = new DaggerPool(scene);
const debris = new DebrisPool(scene);
const gems = new GemPool(scene);
const audio = new AudioKit();
const enemies = [];
const serpents = [];

// first-person voxel gauntlet, child of the camera; recoils on fire
const hand = new VoxelSprite(MODELS.hand);
const handGroup = new THREE.Group();
handGroup.add(hand.mesh);
handGroup.rotation.y = Math.PI + 0.3; // blade forward, angled 3/4 so its length reads
handGroup.rotation.z = 0.2;
handGroup.rotation.x = 0.15;
handGroup.position.set(0.32, -0.4, -1.05); // far enough that it reads as a hand, not a wall
camera.add(handGroup);
let recoil = 0;

// ---------------------------------------------------------------- HUD
const ui = document.getElementById('canvas-ui');
const uiCtx = ui.getContext('2d');
const elTimer = document.getElementById('timer');
const elKills = document.getElementById('kills');
const elGems = document.getElementById('gems');
const elMsg = document.getElementById('msg');
const elToast = document.getElementById('toast');
const elCross = document.getElementById('crosshair');
const elVignette = document.getElementById('vignette');
let toastTimeout = 0;

function toast(text) {
  elToast.textContent = text;
  elToast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => elToast.classList.remove('show'), 1500);
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  ui.width = window.innerWidth;
  ui.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- game state
let state = 'menu'; // 'menu' | 'playing' | 'dead'
let paused = false;
let gameTime = 0;
let kills = 0;
let gemCount = 0;
let weaponLv = 1;
let fireTimer = 0;
let holdT = 0;
let shotgunCd = 0;
let nextTotemAt = 0;
let nextBruteAt = 0;
let nextSerpentAt = 0;
let nextSpiderAt = 0;
let nextLevAt = 0;
let deathAt = 0;
let trauma = 0;
let fovKick = 0;
let slowmo = 0;
let hiScore = parseFloat(localStorage.getItem('hyperDaggerHi') || '0');

function showMenu() {
  elMsg.style.display = 'block';
  elMsg.innerHTML =
    `<h1>HYPER DAGGER</h1>
     <p class="sub">a Devil Daggers &times; HYPERDEMON homage</p>
     <p>survive the swarm &mdash; time is your only score<br>
     gems from heavy kills level your daggers up &mdash; level 3 daggers <b>home</b></p>
     <p class="keys">desktop &mdash; mouse look &middot; <b>LMB</b> tap shotgun / hold stream &middot; <b>WASD</b> move &middot; <b>SHIFT</b> dash &middot; <b>SPACE</b> jump<br>
     touch &mdash; left stick move &middot; right stick look + auto-fire (quick tap = shotgun) &middot; DASH / JUMP buttons</p>
     <p class="go">${hiScore > 0 ? `best ${hiScore.toFixed(1)}s &mdash; ` : ''}click / tap to descend</p>`;
}

function showDeath() {
  const t = gameTime.toFixed(1);
  const best = gameTime > hiScore;
  if (best) {
    hiScore = gameTime;
    localStorage.setItem('hyperDaggerHi', String(hiScore));
  }
  elMsg.style.display = 'block';
  elMsg.innerHTML =
    `<h1 class="dead">DEVOURED</h1>
     <p class="big">${t}s &middot; ${kills} kills &middot; ${gemCount} gems</p>
     <p>${best ? 'NEW BEST' : `best ${hiScore.toFixed(1)}s`}</p>
     <p class="go">click / tap to retry</p>`;
}

function clearEnemies() {
  for (const e of enemies) e.remove(scene);
  enemies.length = 0;
  serpents.length = 0;
}

function resetRun() {
  clearEnemies();
  clearPending();
  daggers.reset();
  debris.reset();
  gems.reset();
  gameTime = 0;
  kills = 0;
  gemCount = 0;
  weaponLv = 1;
  fireTimer = 0;
  holdT = 0;
  shotgunCd = 0;
  nextTotemAt = 0;
  nextBruteAt = 40;
  nextSerpentAt = 70;
  nextSpiderAt = 55;
  nextLevAt = 120;
  trauma = 0;
  fovKick = 0;
  slowmo = 0;
  player.reset();
}

function startGame() {
  resetRun();
  state = 'playing';
  paused = false;
  elMsg.style.display = 'none';
  elCross.style.display = input.touchMode ? 'none' : 'block';
  audio.droneStart();
}

function die() {
  state = 'dead';
  deathAt = performance.now();
  slowmo = 1;
  trauma = 1;
  audio.droneStop();
  audio.death();
  elVignette.style.opacity = 1;
  setTimeout(() => { elVignette.style.opacity = 0; }, 450);
  elCross.style.display = 'none';
  if (document.pointerLockElement) document.exitPointerLock();
  showDeath();
}

window.addEventListener('pointerdown', e => {
  audio.ensure();
  const isMouse = e.pointerType === 'mouse';
  if (state === 'menu') {
    startGame();
  } else if (state === 'dead') {
    if (performance.now() - deathAt < 700) return;
    startGame();
  } else if (state === 'playing' && paused) {
    paused = false;
    elMsg.style.display = 'none';
  }
  if (isMouse && state === 'playing' && !document.pointerLockElement) {
    canvas.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (state === 'playing' && !input.touchMode && !document.pointerLockElement) {
    paused = true;
    elMsg.style.display = 'block';
    elMsg.innerHTML = `<h1>PAUSED</h1><p class="go">click to resume</p>`;
  }
});

// ---------------------------------------------------------------- spawning
const _sv = new THREE.Vector3();

// telegraphed spawns: a light beam marks the spot, then the enemy appears
const pending = [];

function telegraph(pos, colorRGB, delay, fn) {
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 26, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setRGB(...colorRGB),
      transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  beam.position.set(pos.x, 13, pos.z);
  scene.add(beam);
  pending.push({ t: delay, total: delay, beam, fn });
}

function updatePending(dt) {
  for (let i = pending.length - 1; i >= 0; i--) {
    const p = pending[i];
    p.t -= dt;
    const k = 1 - Math.max(0, p.t) / p.total;
    p.beam.material.opacity = Math.sin(k * Math.PI) * 0.5;
    p.beam.rotation.y += dt * 4;
    if (p.t <= 0) {
      scene.remove(p.beam);
      p.beam.geometry.dispose();
      p.beam.material.dispose();
      pending.splice(i, 1);
      p.fn();
    }
  }
}

function clearPending() {
  for (const p of pending) {
    scene.remove(p.beam);
    p.beam.geometry.dispose();
    p.beam.material.dispose();
  }
  pending.length = 0;
}

function ringSpot(minPlayerDist) {
  for (let tries = 0; tries < 10; tries++) {
    const a = Math.random() * Math.PI * 2;
    const r = ARENA_R * (0.45 + Math.random() * 0.4);
    _sv.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    if (_sv.distanceTo(player.feet) > minPlayerDist) return _sv;
  }
  return _sv;
}

function skullCount() {
  let n = 0;
  for (const e of enemies) if (e.type === 'skull') n++;
  return n;
}

function totemCount() {
  let n = 0;
  for (const e of enemies) if (e.type === 'totem') n++;
  return n;
}

function spawnSerpent() {
  const p = ringSpot(14).clone();
  p.y = 8;
  audio.roar();
  const s = new Serpent(scene, p, ARENA_R + 5);
  serpents.push(s);
  enemies.push(...s.segments);
}

function director(dt) {
  updatePending(dt);
  if (gameTime >= nextTotemAt && totemCount() < TOTEM_CAP) {
    const interval = Math.max(1.7, 3.4 - gameTime * 0.02);
    const at = ringSpot(12).clone();
    audio.spawn();
    telegraph(at, [1.8, 0.3, 1.6], 0.7, () => enemies.push(new Totem(scene, at, interval)));
    nextTotemAt = gameTime + 24;
  }
  if (gameTime >= nextBruteAt) {
    const at = ringSpot(14).clone();
    audio.spawn();
    telegraph(at, [1.8, 0.4, 0.6], 0.7, () => {
      at.y = 1.25;
      enemies.push(new Brute(scene, at, Math.min(1.5, (gameTime - 40) * 0.01)));
    });
    nextBruteAt = gameTime + 16;
  }
  if (gameTime >= nextSerpentAt) {
    if (serpents.length < SERPENT_CAP) spawnSerpent();
    nextSerpentAt = gameTime + 45;
  }
  if (gameTime >= nextSpiderAt) {
    if (enemies.filter(e => e.type === 'spider').length < 2) {
      const at = ringSpot(10).clone();
      audio.spawn();
      telegraph(at, [1.6, 0.3, 0.4], 0.7, () => enemies.push(new Spider(scene, at)));
    }
    nextSpiderAt = gameTime + 30;
  }
  if (gameTime >= nextLevAt) {
    if (!enemies.some(e => e.type === 'leviathan')) {
      audio.roar();
      telegraph(new THREE.Vector3(0, 0, 0), [2.4, 0.5, 0.5], 1.2,
        () => enemies.push(new Leviathan(scene, 5)));
    }
    nextLevAt = gameTime + 120;
  }
  for (const e of enemies) {
    if ((e.type === 'totem' || e.type === 'leviathan') && e.emit) {
      e.emit = false;
      if (skullCount() < SKULL_CAP) {
        const m = e.mouthPos(_sv);
        const boost = Math.min(6, gameTime * 0.06);
        const gilded = gameTime > 60 && Math.random() < 0.3;
        const skull = gilded ? new Wraith(scene, m, boost) : new Skull(scene, m, boost);
        enemies.push(skull);
        for (let i = 0; i < 4; i++) {
          debris.spawn(m, skull.sprite.randomColor(),
            _sv.clone().set((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4),
            0.14, 0.8);
        }
        audio.spawn();
      }
    }
  }
  for (let i = serpents.length - 1; i >= 0; i--) {
    if (!serpents[i].alive) serpents.splice(i, 1);
  }
}

// ---------------------------------------------------------------- weapon
function levelForGems(n) {
  let lv = 1;
  for (let i = 2; i < LEVEL_GEMS.length; i++) if (n >= LEVEL_GEMS[i]) lv = i;
  return lv;
}

function onGemsCollected(n) {
  gemCount += n;
  audio.gem();
  const lv = levelForGems(gemCount);
  if (lv > weaponLv) {
    weaponLv = lv;
    audio.levelup();
    toast(lv === 3 ? 'DAGGERS LEVEL 3 — HOMING' : `DAGGERS LEVEL ${lv}`);
    trauma = Math.max(trauma, 0.3);
  }
}

// ---------------------------------------------------------------- combat
const _p0 = new THREE.Vector3();
const _c = new THREE.Vector3();
const _seg = new THREE.Vector3();
const _hitDir = new THREE.Vector3();

function segHitsSphere(p0, p1, c, r) {
  _seg.copy(p1).sub(p0);
  const len2 = _seg.lengthSq();
  let t = 0;
  if (len2 > 0) {
    t = _p0.copy(c).sub(p0).dot(_seg) / len2;
    t = Math.max(0, Math.min(1, t));
  }
  _p0.copy(p0).addScaledVector(_seg, t);
  return _p0.distanceToSquared(c) <= r * r;
}

function fireDagger(spread, speed, homing) {
  camera.getWorldDirection(_hitDir);
  _hitDir.x += (Math.random() - 0.5) * spread * 2;
  _hitDir.y += (Math.random() - 0.5) * spread * 2;
  _hitDir.z += (Math.random() - 0.5) * spread * 2;
  _hitDir.normalize();
  _p0.copy(camera.position).addScaledVector(_hitDir, 0.5);
  _p0.y -= 0.12;
  daggers.fire(_p0, _hitDir, speed, homing);
}

function killEnemy(e, dir) {
  e.alive = false;
  kills += e.score;
  e.center(_c);
  debris.burst(e.sprite.worldVoxels(), e.sprite.size,
    _hitDir.copy(dir).multiplyScalar(5), e.type === 'skull' ? 1 : 1.4);
  audio.gib(e.type !== 'skull');
  trauma = Math.max(trauma, e.type === 'skull' ? 0.18 : 0.35);
  let drops = GEM_DROPS[e.type] || 0;
  if (e.isHead) drops = 2;
  if (e.type === 'spider') drops = 1 + e.stolen; // thieves give it all back
  for (let i = 0; i < drops; i++) gems.spawn(_c);
  if (e.type === 'leviathan') trauma = 1;
  e.remove(scene);
}

function updateCombat(dt) {
  const w = WEAPON[weaponLv];

  // tap = shotgun burst
  shotgunCd -= dt;
  if (input.consumeShotgun()
      && shotgunCd <= 0
      && (input.touchMode || document.pointerLockElement)) {
    shotgunCd = SHOTGUN_CD;
    for (let i = 0; i < w.shotgun; i++) fireDagger(0.13, 52, w.homing);
    audio.shotgun();
    recoil = 0.16;
    fovKick = 4;
    trauma = Math.max(trauma, 0.25);
  }

  // hold = dagger stream (immediate on touch, after a short hold on desktop)
  if (input.firing) holdT += dt; else holdT = 0;
  const streaming = input.firing && (input.touchMode || holdT > STREAM_HOLD);
  if (streaming) {
    fireTimer -= dt;
    while (fireTimer <= 0) {
      fireTimer += 1 / w.stream;
      fireDagger(FIRE_SPREAD, 58, w.homing);
      recoil = Math.min(0.12, recoil + 0.03);
      audio.fire();
    }
  } else {
    fireTimer = 0;
  }

  daggers.update(dt, w.homing ? enemies : undefined);

  // dagger → enemy (segment vs sphere so fast daggers can't tunnel)
  for (let i = daggers.active.length - 1; i >= 0; i--) {
    const d = daggers.active[i];
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (!e.alive) continue;
      e.center(_c);
      if (!segHitsSphere(d.prev, d.m.position, _c, e.radius)) continue;
      _hitDir.copy(d.vel).normalize();
      e.hit(1, _hitDir);
      audio.hit();
      for (let k = 0; k < 2; k++) {
        debris.spawn(d.m.position, e.sprite.randomColor(),
          _seg.set((Math.random() - 0.5) * 5, 2 + Math.random() * 3, (Math.random() - 0.5) * 5),
          0.12, 0.6);
      }
      if (e.hp <= 0) killEnemy(e, _hitDir);
      daggers.recycle(i);
      break;
    }
  }
  for (let j = enemies.length - 1; j >= 0; j--) {
    if (!enemies[j].alive) enemies.splice(j, 1);
  }

  // gems: magnet + collect
  _p0.copy(player.feet);
  _p0.y += 1.1;
  const got = gems.update(dt, _p0);
  if (got) onGemsCollected(got);

  // enemy → player
  for (const e of enemies) {
    if (e.spawnK < 0.7) continue;
    if (e.type === 'totem') {
      player.pushOut(e.pos.x, e.pos.z, 2.0);
      continue;
    }
    e.center(_c);
    if (_c.distanceTo(_p0) < e.radius + 0.5 || _c.distanceTo(camera.position) < e.radius + 0.4) {
      die();
      return;
    }
  }
}

// skulls shove each other apart so the swarm doesn't stack into one voxel blob
function separateSkulls() {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (a.type !== 'skull' && a.type !== 'brute') continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (b.type !== 'skull' && b.type !== 'brute') continue;
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, dz = b.pos.z - a.pos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const min = a.radius + b.radius;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) / d * 0.5;
      a.pos.x -= dx * push; a.pos.y -= dy * push; a.pos.z -= dz * push;
      b.pos.x += dx * push; b.pos.y += dy * push; b.pos.z += dz * push;
    }
  }
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();

function step(dt) {
  gameTime += dt;
  player.update(dt);
  if (player.justDashed) {
    player.justDashed = false;
    audio.dash();
    trauma = Math.max(trauma, 0.15);
  }
  director(dt);
  for (const e of enemies) {
    e.update(dt, camera.position, gems);
    // Leviathan drag: pulls the player in along the floor — dash out
    if (e.type === 'leviathan' && e.alive) {
      if (e.pullStarted) {
        e.pullStarted = false;
        audio.pull();
        trauma = Math.max(trauma, 0.3);
      }
      if (e.pullActive) {
        const dx = e.pos.x - player.feet.x, dz = e.pos.z - player.feet.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.5) player.nudge(dx / d * 7 * dt, dz / d * 7 * dt);
      }
    }
  }
  for (const s of serpents) s.update(dt, camera.position);
  separateSkulls();
  updateCombat(dt);
  debris.update(dt);
  elTimer.textContent = gameTime.toFixed(1);
  elKills.textContent = `${kills} kills`;
  elGems.textContent = `◆ ${gemCount} · LV ${weaponLv}${weaponLv >= 3 ? ' HOMING' : ''}`;
}

function updateFeel(dt) {
  // trauma-driven shake + chromatic aberration + FOV kicks (dash, shotgun)
  trauma = Math.max(0, trauma - dt * 1.5);
  const t2 = trauma * trauma;
  if (state === 'playing' && !paused) {
    camera.rotation.z += (Math.random() - 0.5) * t2 * 0.07;
    camera.rotation.x += (Math.random() - 0.5) * t2 * 0.03;
    camera.position.y += (Math.random() - 0.5) * t2 * 0.08;
  }
  chromaPass.uniforms.uAmount.value = 0.0012 + t2 * 0.02;
  fovKick = Math.max(0, fovKick - dt * 18);
  const fov = BASE_FOV + player.dashK * 9 + fovKick;
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  // hand recoil + idle sway
  recoil = Math.max(0, recoil - dt * 1.2) * Math.exp(-10 * dt);
  handGroup.position.z = -1.05 + recoil;
  handGroup.position.y = -0.4 + Math.sin(performance.now() * 0.0017) * 0.006;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  skyMat.uniforms.uTime.value += dt;
  dust.rotation.y += dt * 0.012;
  if (state === 'playing' && !paused) {
    step(dt);
  } else if (state !== 'playing') {
    // death slow-mo: debris + daggers keep tumbling at quarter speed
    slowmo = Math.max(0, slowmo - dt * 0.8);
    const eff = dt * (1 - 0.75 * slowmo);
    debris.update(eff);
    daggers.update(eff);
  }
  updateFeel(dt);
  composer.render();
  uiCtx.clearRect(0, 0, ui.width, ui.height);
  if (state === 'playing' && !paused) input.drawTouchUI(uiCtx);
}

showMenu();
animate();

// tiny debug handle (console tinkering + automated smoke tests)
window.__hd = {
  enemies, player, debris, daggers, gems, serpents,
  debug: {
    addGems(n) { onGemsCollected(n); },
    spawnSerpent() { spawnSerpent(); },
    spawnSpider() { enemies.push(new Spider(scene, ringSpot(8).clone())); },
    spawnLeviathan() { enemies.push(new Leviathan(scene, 5)); },
  },
};
