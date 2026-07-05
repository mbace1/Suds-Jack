import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { InputManager } from './input.js';
import { Player, FORMS, PLAYER_RADIUS } from './player.js';
import { Enemy, EnemyType, BoltPool } from './enemy.js';
import { Effects } from './effects.js';
import { audio } from './audio.js';

const ARENA_R = 20;
const BOLT_R = 0.16;

// neon hue per room, cycling
const HUES = [0x00e5ff, 0xff2fd6, 0xffaa00, 0x7cff00, 0x9d4dff];

// ── Renderer / composer ───────────────────────────────────────────────────────
const canvas = document.getElementById('canvas-game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04050a);
scene.fog = new THREE.Fog(0x04050a, 26, 58);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 120);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.55, 0.25);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ── Cave arena ────────────────────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight(0x36405a, 0x07080c, 1.4));

const _hueMats = [];    // recolored every room
const _hueLights = [];

{
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(ARENA_R + 1.5, 48),
    new THREE.MeshStandardMaterial({ color: 0x11141b, roughness: 0.9, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // glowing floor rings
  for (const r of [5, 10, 15, ARENA_R]) {
    const mat = new THREE.MeshBasicMaterial({
      color: HUES[0], transparent: true, opacity: r === ARENA_R ? 0.7 : 0.22,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.06, r, 64), mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);
    _hueMats.push(mat);
  }

  // rock walls: jagged low-poly chunks ringing the arena
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x181c25, flatShading: true, roughness: 0.95 });
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * Math.PI * 2 + Math.random() * 0.15;
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const s = 2.5 + Math.random() * 4.5;
    rock.scale.set(s, s * (0.8 + Math.random() * 1.6), s);
    const rr = ARENA_R + 3.5 + Math.random() * 4;
    rock.position.set(Math.cos(a) * rr, s * 0.35, Math.sin(a) * rr);
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.add(rock);
  }
  // stalagmite spires + hanging stalactites
  const coneGeo = new THREE.ConeGeometry(1, 1, 5);
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    const spire = new THREE.Mesh(coneGeo, rockMat);
    const h = 4 + Math.random() * 8;
    spire.scale.set(0.9 + Math.random(), h, 0.9 + Math.random());
    const rr = ARENA_R + 2.5 + Math.random() * 6;
    spire.position.set(Math.cos(a) * rr, h / 2, Math.sin(a) * rr);
    scene.add(spire);
  }
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const tite = new THREE.Mesh(coneGeo, rockMat);
    const h = 2.5 + Math.random() * 4;
    tite.scale.set(0.6 + Math.random() * 0.8, h, 0.6 + Math.random() * 0.8);
    const rr = 4 + Math.random() * 17;
    tite.position.set(Math.cos(a) * rr, 8 + Math.random() * 3, Math.sin(a) * rr);
    tite.rotation.x = Math.PI;
    scene.add(tite);
  }

  // neon pillars around the perimeter + point lights on alternate ones
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * (ARENA_R + 0.8), z = Math.sin(a) * (ARENA_R + 0.8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x05070a, emissive: HUES[0], emissiveIntensity: 1.8, flatShading: true,
    });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 6.5, 0.35), mat);
    strip.position.set(x, 3.25, z);
    scene.add(strip);
    _hueMats.push(mat);
    if (i % 2 === 0) {
      const light = new THREE.PointLight(HUES[0], 55, 30, 1.7);
      light.position.set(x * 0.92, 4, z * 0.92);
      scene.add(light);
      _hueLights.push(light);
    }
  }
}

function setRoomHue(room) {
  const hue = HUES[(room - 1) % HUES.length];
  for (const m of _hueMats) (m.emissive ?? m.color).setHex(hue);
  for (const l of _hueLights) l.color.setHex(hue);
}

// ── Actors ────────────────────────────────────────────────────────────────────
const input = new InputManager(canvas);
const effects = new Effects(scene);
const player = new Player(scene);
const bolts = new BoltPool(scene);
let enemies = [];

// neon glow that follows the active form
const playerLight = new THREE.PointLight(FORMS[0].accent, 26, 12, 1.6);
scene.add(playerLight);

// ── Camera rig ────────────────────────────────────────────────────────────────
let camYaw = 0;
let camPitch = 0.42;
let shakeAmp = 0;
const CAM_DIST = 9.5;

function updateCamera(dt) {
  const { dx, dy } = input.consumeMouse();
  camYaw -= dx * 0.0026;
  camPitch = Math.min(1.15, Math.max(0.12, camPitch + dy * 0.0022));
  shakeAmp = Math.max(0, shakeAmp - dt * 2.2);
  const p = player.pos;
  const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
  camera.position.set(
    p.x + Math.sin(camYaw) * cp * CAM_DIST + (Math.random() - 0.5) * shakeAmp,
    1.5 + sp * CAM_DIST + (Math.random() - 0.5) * shakeAmp,
    p.z + Math.cos(camYaw) * cp * CAM_DIST + (Math.random() - 0.5) * shakeAmp);
  camera.lookAt(p.x, 1.4, p.z);
}

// ── HUD ───────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const hud = {
  hpfill: $('hpfill'), room: $('roomlbl'), score: $('scorelbl'), hi: $('hilbl'),
  mult: $('multlbl'), chips: [$('chip0'), $('chip1'), $('chip2')],
  announce: $('announce'), vignette: $('vignette'),
  start: $('start'), pause: $('pause'), over: $('gameover'), overStats: $('overstats'),
  upgrade: $('upgrade'), cards: [$('card0'), $('card1'), $('card2')],
};
for (let i = 0; i < 3; i++) {
  const c = hud.chips[i];
  c.style.borderColor = `#${FORMS[i].accent.toString(16).padStart(6, '0')}`;
  c.querySelector('.chip-name').textContent = FORMS[i].name;
}

let announceT = 0;
function announce(text, sub = '') {
  hud.announce.innerHTML = `<div class="big">${text}</div><div class="sub">${sub}</div>`;
  hud.announce.style.opacity = 1;
  announceT = 2.2;
}

let vignetteT = 0;

// ── Run state ─────────────────────────────────────────────────────────────────
let state = 'start';           // start | fight | upgrade | over
let paused = false;
let room = 0;
let score = 0;
let streak = 0;
let kills = 0;
let hi = +(localStorage.getItem('neonRoninHi') || 0);
let pending = [];              // [{type, x, z, delay, beamed}]
hud.hi.textContent = hi;

const streakMult = () => Math.min(3, 1 + streak * 0.05);

// ── Combat resolver (shared by player + enemies) ──────────────────────────────
const _tmp = new THREE.Vector3();
const combat = {
  shake(a) { shakeAmp = Math.max(shakeAmp, a); },

  // player melee: damage enemies in the arc, deflect bolts caught in it
  meleeStrike(pos, yaw, range, arcDeg, dmg, knock, color) {
    const half = (arcDeg / 2) * (Math.PI / 180);
    let hitAny = false;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > range + e.radius) continue;
      let da = Math.atan2(dx, dz) - yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > half && d > 1.1) continue;
      hitAny = true;
      const died = e.hit(dmg, pos);
      _tmp.set(e.pos.x, 1.2, e.pos.z);
      effects.sparks(_tmp, color, died ? 4 : 6);
      if (died) this.onKill(e);
    }
    // slashes swat bolts out of the air
    for (let i = bolts.active.length - 1; i >= 0; i--) {
      const b = bolts.active[i].mesh.position;
      const dx = b.x - pos.x, dz = b.z - pos.z;
      if (Math.hypot(dx, dz) > range + 0.5) continue;
      let da = Math.atan2(dx, dz) - yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > half) continue;
      effects.sparks(b.clone(), 0xffffff, 3, 3);
      bolts.recycleAt(i);
      score += 10;
      audio.deflect();
    }
    if (hitAny) { audio.hit(); this.shake(0.08); }
  },

  onKill(e) {
    effects.shards(e.pos, e.conf.accent, e.type === EnemyType.BRUTE ? 20 : 12);
    score += Math.round(e.score * streakMult());
    streak++;
    kills++;
    if (player.stats.lifesteal) player.heal(player.stats.lifesteal);
    audio.kill();
    this.shake(e.type === EnemyType.BRUTE ? 0.3 : 0.12);
  },

  hurtPlayer(dmg, fromPos, knock = 4) {
    if (!player.hurt(dmg)) return;
    streak = 0;
    vignetteT = 0.5;
    audio.hurt();
    this.shake(0.25);
    if (fromPos) {
      _tmp.subVectors(player.pos, fromPos).setY(0).normalize();
      player.pos.addScaledVector(_tmp, knock * 0.25);
    }
    if (player.dead) gameOver();
  },
};

// ── Rooms / waves ─────────────────────────────────────────────────────────────
function rollSpawns(n) {
  const list = [];
  const bruteRoom = n % 4 === 0;
  const budget = Math.min(4 + n * 2, 20);
  let spent = 0, i = 0;
  if (bruteRoom) {
    const brutes = Math.min(1 + Math.floor(n / 6), 3);
    for (let b = 0; b < brutes; b++) { list.push({ type: EnemyType.BRUTE, delay: 0.4 + b * 1.5 }); spent += 4; }
  }
  while (spent < budget) {
    const roll = Math.random();
    let type = EnemyType.SLASHER, cost = 1;
    if (n >= 3 && roll > 0.85 && !bruteRoom) { type = EnemyType.BRUTE; cost = 4; }
    else if (n >= 2 && roll > 0.6) { type = EnemyType.GUNNER; cost = 2; }
    list.push({ type, delay: 0.4 + Math.floor(i / 3) * 2.2 + Math.random() * 0.8 });
    spent += cost;
    i++;
  }
  // spawn positions: ring around the arena, away from the player
  for (const s of list) {
    let a, x, z;
    do {
      a = Math.random() * Math.PI * 2;
      x = Math.cos(a) * ARENA_R * 0.72;
      z = Math.sin(a) * ARENA_R * 0.72;
    } while (Math.hypot(x - player.pos.x, z - player.pos.z) < 8);
    s.x = x; s.z = z; s.beamed = false;
  }
  return list;
}

function startRoom(n) {
  room = n;
  setRoomHue(n);
  pending = rollSpawns(n);
  state = 'fight';
  announce(`ROOM ${n}`, n % 4 === 0 ? 'heavy signatures detected' : '');
}

function resetRun() {
  for (const e of enemies) scene.remove(e.mesh);
  enemies = [];
  bolts.clear();
  player.reset();
  score = 0;
  streak = 0;
  kills = 0;
  camYaw = 0;
  startRoom(1);
}

function gameOver() {
  state = 'over';
  audio.over();
  hi = Math.max(hi, score);
  localStorage.setItem('neonRoninHi', hi);
  hud.overStats.innerHTML =
    `SCORE ${score}<br>ROOMS CLEARED ${room - 1} · UNITS DESTROYED ${kills}<br>HI ${hi}`;
  hud.over.style.display = 'flex';
  document.exitPointerLock?.();
}

// ── Upgrades ──────────────────────────────────────────────────────────────────
const UPGRADES = [
  { n: 'PLASMA EDGE', d: '+20% damage', a: (s) => { s.dmgMul *= 1.2; } },
  { n: 'OVERCLOCKED SERVOS', d: '+15% move speed', a: (s) => { s.spdMul *= 1.15; } },
  { n: 'QUICKDRAW CORE', d: '+15% attack speed', a: (s) => { s.atkSpdMul *= 0.87; } },
  { n: 'PHASE CAPACITOR', d: '-25% dash cooldown', a: (s) => { s.dashCdMul *= 0.75; } },
  { n: 'BLADE SYNC', d: '-30% swap cooldown<br>+50% swap burst', a: (s) => { s.swapCdMul *= 0.7; s.swapDmgMul *= 1.5; } },
  { n: 'COOLANT FLUSH', d: '+25 max integrity<br>full repair', a: (s) => { s.maxHp += 25; player.hp = s.maxHp; } },
  { n: 'VAMPIRIC NANITES', d: '+2 integrity per kill', a: (s) => { s.lifesteal += 2; } },
  { n: 'REACTIVE PLATING', d: '-15% damage taken', a: (s) => { s.dmgTakenMul *= 0.85; } },
];

let offered = [];
function showUpgrades() {
  state = 'upgrade';
  document.exitPointerLock?.();
  offered = [...UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
  for (let i = 0; i < 3; i++) {
    hud.cards[i].innerHTML = `<div class="card-name">${offered[i].n}</div><div class="card-desc">${offered[i].d}</div>`;
  }
  hud.upgrade.style.display = 'flex';
}
hud.cards.forEach((card, i) => {
  card.addEventListener('click', () => {
    if (state !== 'upgrade') return;
    offered[i].a(player.stats);
    audio.upgrade();
    hud.upgrade.style.display = 'none';
    startRoom(room + 1);
    input.requestLock();
  });
});

// ── Overlay flow / pointer lock ───────────────────────────────────────────────
hud.start.addEventListener('click', () => {
  audio.init();
  hud.start.style.display = 'none';
  resetRun();
  input.requestLock();
});
hud.over.addEventListener('click', () => {
  if (state !== 'over') return;
  hud.over.style.display = 'none';
  resetRun();
  input.requestLock();
});
hud.pause.addEventListener('click', () => {
  hud.pause.style.display = 'none';
  input.requestLock();
});
input.onLockChange = (locked) => {
  if (state !== 'fight') return;
  paused = !locked;
  hud.pause.style.display = locked ? 'none' : 'flex';
};

// ── HUD refresh ───────────────────────────────────────────────────────────────
function updateHud(dt) {
  hud.hpfill.style.width = `${(player.hp / player.stats.maxHp) * 100}%`;
  hud.room.textContent = room;
  hud.score.textContent = score;
  hud.hi.textContent = hi;
  hud.mult.textContent = streak >= 2 ? `×${streakMult().toFixed(2)}` : '';
  for (let i = 0; i < 3; i++) {
    const c = hud.chips[i];
    c.classList.toggle('active', player.form === i);
    c.style.opacity = player.form !== i && player.swapCd > 0 ? 0.3 : 1;
  }
  if (announceT > 0) {
    announceT -= dt;
    if (announceT <= 0.6) hud.announce.style.opacity = Math.max(0, announceT / 0.6);
  }
  if (vignetteT > 0) {
    vignetteT -= dt;
    hud.vignette.style.opacity = Math.max(0, vignetteT / 0.5);
  } else hud.vignette.style.opacity = 0;
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let last = performance.now();
let t = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (state === 'fight' && !paused) {
    t += dt;
    simulate(dt);
  }
  updateCamera(paused || state !== 'fight' ? 0 : dt);
  updateHud(dt);
  composer.render();
}

function simulate(dt) {
  const ctx = { input, camYaw, dt, t, combat, effects, audio, bolts, enemies, arenaR: ARENA_R, playerPos: player.pos };

  player.update(ctx);
  playerLight.position.set(player.pos.x, 1.6, player.pos.z);
  playerLight.color.setHex(player.conf.accent);

  // pending spawns → beam telegraph → live enemy
  for (let i = pending.length - 1; i >= 0; i--) {
    const s = pending[i];
    s.delay -= dt;
    if (!s.beamed && s.delay <= 0.55) {
      s.beamed = true;
      effects.spawnBeam(s, HUES[(room - 1) % HUES.length]);
    }
    if (s.delay <= 0) {
      enemies.push(new Enemy(scene, s.type, s.x, s.z, 1 + room * 0.08));
      pending.splice(i, 1);
    }
  }

  for (const e of enemies) if (!e.dead) e.update(ctx);

  // sweep dead enemies (killed inside player.update via combat)
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].dead) {
      scene.remove(enemies[i].mesh);
      enemies.splice(i, 1);
    }
  }

  // bolts vs player
  bolts.update(dt, ARENA_R + 2);
  if (!player.invincible) {
    for (let i = bolts.active.length - 1; i >= 0; i--) {
      const b = bolts.active[i].mesh.position;
      const dx = b.x - player.pos.x, dz = b.z - player.pos.z;
      if (dx * dx + dz * dz < (PLAYER_RADIUS + BOLT_R) ** 2) {
        bolts.recycleAt(i);
        combat.hurtPlayer(10, null);
        if (player.dead) break;
      }
    }
  }

  effects.update(dt);

  // room cleared?
  if (state === 'fight' && enemies.length === 0 && pending.length === 0) {
    score += 100 * room;
    audio.clear();
    announce('ROOM CLEAR', `+${100 * room}`);
    showUpgrades();
  }
}

requestAnimationFrame(frame);
