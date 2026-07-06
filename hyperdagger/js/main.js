import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { InputManager } from './input.js';
import { Player } from './player.js';
import { DaggerPool } from './daggers.js';
import { DebrisPool } from './voxel.js';
import { Skull, Brute, Totem } from './enemy.js';
import { AudioKit } from './audio.js';

const ARENA_R = 26;
const FIRE_RATE = 12;        // daggers per second
const FIRE_SPREAD = 0.035;   // radians
const SKULL_CAP = 42;
const TOTEM_CAP = 6;

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('canvas-game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x14041c, 30, 95);

const camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.1, 300);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.45, 0.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- arena
function makeFloorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#0b0414';
  g.fillRect(0, 0, 256, 256);
  // random darker tiles for variation
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

// HYPERDEMON-ish animated gradient sky
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
    void main() {
      vec3 d = normalize(vPos);
      float h = d.y;
      float ang = atan(d.z, d.x);
      vec3 horizon = vec3(0.30, 0.02, 0.35);
      vec3 zenith  = vec3(0.01, 0.00, 0.03);
      vec3 col = mix(horizon, zenith, clamp(abs(h) * 2.2, 0.0, 1.0));
      float band = 0.5 + 0.5 * sin(ang * 7.0 - uTime * 0.6 + h * 8.0);
      col += vec3(0.20, 0.03, 0.25) * band * (1.0 - clamp(abs(h) * 3.0, 0.0, 1.0));
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
const audio = new AudioKit();
const enemies = [];

// ---------------------------------------------------------------- HUD
const ui = document.getElementById('canvas-ui');
const uiCtx = ui.getContext('2d');
const elTimer = document.getElementById('timer');
const elKills = document.getElementById('kills');
const elMsg = document.getElementById('msg');
const elCross = document.getElementById('crosshair');
const elVignette = document.getElementById('vignette');

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
let fireTimer = 0;
let nextTotemAt = 0;
let nextBruteAt = 0;
let deathAt = 0;
let hiScore = parseFloat(localStorage.getItem('hyperDaggerHi') || '0');

function showMenu() {
  elMsg.style.display = 'block';
  elMsg.innerHTML =
    `<h1>HYPER DAGGER</h1>
     <p class="sub">a Devil Daggers &times; HYPERDEMON homage</p>
     <p>survive the swarm &mdash; time is your only score</p>
     <p class="keys">desktop &mdash; mouse look &middot; hold <b>LMB</b> fire &middot; <b>WASD</b> move &middot; <b>SPACE</b> jump<br>
     touch &mdash; left stick move &middot; right stick look + auto-fire &middot; centre button jump</p>
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
     <p class="big">${t}s &middot; ${kills} kills</p>
     <p>${best ? 'NEW BEST' : `best ${hiScore.toFixed(1)}s`}</p>
     <p class="go">click / tap to retry</p>`;
}

function clearEnemies() {
  for (const e of enemies) e.remove(scene);
  enemies.length = 0;
}

function resetRun() {
  clearEnemies();
  daggers.reset();
  debris.reset();
  gameTime = 0;
  kills = 0;
  fireTimer = 0;
  nextTotemAt = 0;
  nextBruteAt = 40;
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

function director(dt) {
  if (gameTime >= nextTotemAt && totemCount() < TOTEM_CAP) {
    const interval = Math.max(1.7, 3.4 - gameTime * 0.02);
    enemies.push(new Totem(scene, ringSpot(12), interval));
    audio.spawn();
    nextTotemAt = gameTime + 24;
  }
  if (gameTime >= nextBruteAt) {
    const p = ringSpot(14);
    p.y = 1.25;
    enemies.push(new Brute(scene, p, Math.min(1.5, (gameTime - 40) * 0.01)));
    audio.spawn();
    nextBruteAt = gameTime + 16;
  }
  for (const e of enemies) {
    if (e.type === 'totem' && e.emit) {
      e.emit = false;
      if (skullCount() < SKULL_CAP) {
        const m = e.mouthPos(_sv);
        const skull = new Skull(scene, m, Math.min(6, gameTime * 0.06));
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

function killEnemy(e, dir) {
  e.alive = false;
  kills += e.score;
  debris.burst(e.sprite.worldVoxels(), e.sprite.size,
    _hitDir.copy(dir).multiplyScalar(5), e.type === 'skull' ? 1 : 1.4);
  audio.gib(e.type !== 'skull');
  e.remove(scene);
}

function updateCombat(dt) {
  // fire stream
  if (input.firing) {
    fireTimer -= dt;
    while (fireTimer <= 0) {
      fireTimer += 1 / FIRE_RATE;
      camera.getWorldDirection(_hitDir);
      _hitDir.x += (Math.random() - 0.5) * FIRE_SPREAD * 2;
      _hitDir.y += (Math.random() - 0.5) * FIRE_SPREAD * 2;
      _hitDir.z += (Math.random() - 0.5) * FIRE_SPREAD * 2;
      _hitDir.normalize();
      _p0.copy(camera.position).addScaledVector(_hitDir, 0.5);
      _p0.y -= 0.12;
      daggers.fire(_p0, _hitDir);
      audio.fire();
    }
  } else {
    fireTimer = 0;
  }

  daggers.update(dt);

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

  // enemy → player
  _p0.copy(player.feet);
  _p0.y += 1.1; // torso centre
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
    if (a.type === 'totem') continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (b.type === 'totem') continue;
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
  director(dt);
  for (const e of enemies) e.update(dt, camera.position);
  separateSkulls();
  updateCombat(dt);
  debris.update(dt);
  elTimer.textContent = gameTime.toFixed(1);
  elKills.textContent = `${kills} kills`;
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  skyMat.uniforms.uTime.value += dt;
  dust.rotation.y += dt * 0.012;
  if (state === 'playing' && !paused) {
    step(dt);
  } else if (state !== 'playing') {
    debris.update(dt);
  }
  composer.render();
  uiCtx.clearRect(0, 0, ui.width, ui.height);
  if (state === 'playing' && !paused) input.drawTouchUI(uiCtx);
}

showMenu();
animate();

// tiny debug handle (console tinkering + automated smoke tests)
window.__hd = { enemies, player, debris, daggers };
