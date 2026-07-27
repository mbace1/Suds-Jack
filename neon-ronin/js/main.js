import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { InputManager } from './input.js';
import { Player, FORMS, PLAYER_RADIUS, ULT_MAX } from './player.js';
import { Enemy, EnemyType, BoltPool } from './enemy.js';
import { Ally, ALLY_ACCENT, ALLY_RADIUS } from './ally.js';
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
const bolts = new BoltPool(scene, 100);   // enemy fire
const pBolts = new BoltPool(scene, 60);   // player ranged-mode fire
let enemies = [];
let allies = [];
const ALLY_CAP = 6;
const LIVE_CAP = 70;    // max simultaneous enemies; overflow waits in pending
let cmdCd = 0;          // CHARGE order cooldown

// neon glow that follows the active form — kept soft and above the rig so
// the kasa/skirt surfaces don't blow out into a bloom blob at point-blank
const playerLight = new THREE.PointLight(FORMS[0].accent, 9, 11, 1.6);
scene.add(playerLight);

// ── Camera rig ────────────────────────────────────────────────────────────────
let camYaw = 0;
let camPitch = 0.42;
let shakeAmp = 0;
const CAM_DIST = 9.5;

function updateCamera(dt) {
  const { dx, dy } = input.consumeMouse();
  camYaw -= dx * 0.0026;
  camPitch += dy * 0.0022;
  // touch: right stick deflection = orbit rate
  const look = input.stick('R');
  camYaw -= look.x * 2.8 * dt;
  camPitch += look.y * 1.9 * dt;
  camPitch = Math.min(1.15, Math.max(0.12, camPitch));
  shakeAmp = Math.max(0, shakeAmp - dt * 2.2);
  const p = player.pos;
  const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
  camera.position.set(
    p.x + Math.sin(camYaw) * cp * CAM_DIST + (Math.random() - 0.5) * shakeAmp,
    1.5 + sp * CAM_DIST + (Math.random() - 0.5) * shakeAmp,
    p.z + Math.cos(camYaw) * cp * CAM_DIST + (Math.random() - 0.5) * shakeAmp);
  camera.lookAt(p.x, p.y + 1.4, p.z);
}

// ── HUD ───────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const hud = {
  hpfill: $('hpfill'), dashpips: [...document.querySelectorAll('#dashpips span')],
  allychip: $('allychip'), cmdbtn: $('cmdbtn'),
  ultfill: $('ultfill'), ultwrap: $('ultwrap'),
  parrybtn: $('parrybtn'), ultbtn: $('ultbtn'),
  room: $('roomlbl'), score: $('scorelbl'), hi: $('hilbl'),
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
    // slashes swat bolts out of the air (BOLT MAGNET returns them to sender)
    for (let i = bolts.active.length - 1; i >= 0; i--) {
      const b = bolts.active[i].mesh.position;
      const dx = b.x - pos.x, dz = b.z - pos.z;
      if (Math.hypot(dx, dz) > range + 0.5) continue;
      let da = Math.atan2(dx, dz) - yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > half) continue;
      if (player.stats.mods.magnet) {
        let tgt = null, td = 99;
        for (const e of enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.pos.x - b.x, e.pos.z - b.z);
          if (d < td) { td = d; tgt = e; }
        }
        if (tgt) {
          _tmp.set(tgt.pos.x - b.x, 0, tgt.pos.z - b.z);
          pBolts.spawn(b, _tmp, 16, player.conf.accent, player.conf.dmg * 0.6 * player.stats.dmgMul);
        }
      }
      effects.sparks(b.clone(), 0xffffff, 3, 3);
      bolts.recycleAt(i);
      score += 10;
      audio.deflect();
    }
    if (hitAny) { audio.hit(); this.shake(0.08); }
  },

  // squad melee: same sector test as the player's, no bolt work / no shake
  allyStrike(pos, yaw, range, arcDeg, dmg) {
    const half = (arcDeg / 2) * (Math.PI / 180);
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > range + e.radius) continue;
      let da = Math.atan2(dx, dz) - yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > half && d > 1.1) continue;
      const died = e.hit(dmg, pos);
      _tmp.set(e.pos.x, 1.2, e.pos.z);
      effects.sparks(_tmp, ALLY_ACCENT, 3);
      if (died) this.onKill(e);
    }
  },

  // enemies deal damage through this so allies soak hits too
  hurtTarget(t, dmg, fromPos, knock = 4) {
    if (t.isPlayer) this.hurtPlayer(dmg, fromPos, knock);
    else t.ref.hurt(dmg, fromPos);
  },

  onKill(e) {
    effects.shards(e.pos, e.conf.accent, e.type === EnemyType.DRONE ? 4 : e.type === EnemyType.BRUTE ? 20 : 12);
    score += Math.round(e.score * streakMult());
    streak++;
    kills++;
    player.addUlt(e.type === EnemyType.DRONE ? 4 : e.type === EnemyType.BRUTE ? 25 : 10);
    if (player.stats.lifesteal) player.heal(player.stats.lifesteal);
    audio.kill();
    this.shake(e.type === EnemyType.BRUTE ? 0.3 : 0.12);
    // CHAIN ARC: the kill detonates and can cascade
    if (player.stats.mods.chain) {
      effects.ring(e.pos, 2.6, 0.25, e.conf.accent, true);
      for (const o of enemies) {
        if (o.dead || o === e) continue;
        const d = Math.hypot(o.pos.x - e.pos.x, o.pos.z - e.pos.z);
        if (d < 2.6 && o.hit(24 * player.stats.dmgMul, e.pos)) this.onKill(o);
      }
    }
  },

  hurtPlayer(dmg, fromPos, knock = 4) {
    if (player.pos.y > 0.9) return;   // jumped clear of the strike
    // PARRY: negate the hit, stagger the attacker, refund ult charge
    if (player.parrying) {
      player.parriedThis = true;
      player.addUlt(10);
      player.iframes = Math.max(player.iframes, 0.25);
      effects.ring(player.pos, 2.6, 0.25, 0xffffff, true);
      effects.sparks(player.pos, 0xffffff, 8, 5);
      audio.deflect();
      this.shake(0.18);
      if (fromPos) {   // shove whoever swung at you
        for (const e of enemies) {
          if (e.dead) continue;
          if (Math.hypot(e.pos.x - fromPos.x, e.pos.z - fromPos.z) < 0.6) {
            _tmp.subVectors(e.pos, player.pos).setY(0).normalize();
            e.knock.addScaledVector(_tmp, 9);
            e.state = 'recover';
            e.stateT = 0;
          }
        }
      }
      return;
    }
    if (!player.hurt(dmg)) return;
    streak = 0;
    vignetteT = 0.5;
    audio.hurt();
    this.shake(0.25);
    if (fromPos) {
      _tmp.subVectors(player.pos, fromPos).setY(0).normalize();
      player.pos.addScaledVector(_tmp, knock * 0.25);
    }
    // SECOND CORE: cheat death once per room
    if (player.dead && player.stats.mods.core && !player.reviveUsed) {
      player.dead = false;
      player.reviveUsed = true;
      player.hp = Math.round(player.stats.maxHp * 0.3);
      player.iframes = 1.5;
      effects.ring(player.pos, 4.2, 0.45, 0xffffff, true);
      effects.sparks(player.pos, 0xffffff, 14, 6);
      audio.upgrade();
    }
    if (player.dead) gameOver();
  },
};

// ── Rooms / waves ─────────────────────────────────────────────────────────────
function rollSpawns(n) {
  const list = [];
  const bruteRoom = n % 4 === 0;
  let budget = Math.min(8 + n * 4, 48);
  let i = 0;
  if (bruteRoom) {
    const brutes = Math.min(1 + Math.floor(n / 6), 3);
    for (let b = 0; b < brutes; b++) { list.push({ type: EnemyType.BRUTE, delay: 0.4 + b * 1.5 }); budget -= 4; }
  }
  // drone flood packs: one beam per pack, scattered around a shared center
  const packs = Math.min(1 + Math.floor(n / 3), 3);
  for (let p = 0; p < packs && budget > 3; p++) {
    const size = 6 + Math.min(n, 6);
    const delay = 1 + p * 6 + Math.random();
    for (let d = 0; d < size; d++) {
      list.push({ type: EnemyType.DRONE, delay: delay + d * 0.08, pack: p, packLead: d === 0 });
    }
    budget -= Math.ceil(size * 0.5);
  }
  while (budget > 0) {
    const roll = Math.random();
    let type = EnemyType.SLASHER, cost = 1;
    if (n >= 3 && roll > 0.85 && !bruteRoom) { type = EnemyType.BRUTE; cost = 4; }
    else if (n >= 2 && roll > 0.6) { type = EnemyType.GUNNER; cost = 2; }
    list.push({ type, delay: 0.4 + Math.floor(i / 4) * 2 + Math.random() * 0.8 });
    budget -= cost;
    i++;
  }
  // spawn positions: ring around the arena, away from the player; a pack
  // shares one center (and one beam, on its lead member) with scatter
  const packCenters = {};
  for (const s of list) {
    let x, z;
    if (s.pack !== undefined && packCenters[s.pack]) {
      const c = packCenters[s.pack];
      x = c.x + (Math.random() - 0.5) * 3;
      z = c.z + (Math.random() - 0.5) * 3;
    } else {
      let a;
      do {
        a = Math.random() * Math.PI * 2;
        x = Math.cos(a) * ARENA_R * 0.72;
        z = Math.sin(a) * ARENA_R * 0.72;
      } while (Math.hypot(x - player.pos.x, z - player.pos.z) < 8);
      if (s.pack !== undefined) packCenters[s.pack] = { x, z };
    }
    s.x = x; s.z = z;
    s.beamed = s.pack !== undefined ? !s.packLead : false;
  }
  return list;
}

function startRoom(n) {
  room = n;
  setRoomHue(n);
  pending = rollSpawns(n);
  player.reviveUsed = false;    // SECOND CORE recharges each room
  // fallen squad members stand back up between rooms
  for (const a of allies) {
    if (a.dead) {
      const ang = Math.random() * Math.PI * 2;
      a.revive(player.pos.x + Math.sin(ang) * 2, player.pos.z + Math.cos(ang) * 2);
      effects.spawnBeam(a.pos, ALLY_ACCENT, 0.5);
    }
  }
  state = 'fight';
  announce(`ROOM ${n}`, n % 4 === 0 ? 'heavy signatures detected' : '');
}

function resetRun() {
  for (const e of enemies) scene.remove(e.mesh);
  enemies = [];
  for (const a of allies) scene.remove(a.mesh);
  allies = [];
  cmdCd = 0;
  bolts.clear();
  pBolts.clear();
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

// ── Upgrades (repeatable stat boosts) + Modifiers (one-shot build changers) ───
const UPGRADES = [
  { n: 'PLASMA EDGE', d: '+20% damage', a: (s) => { s.dmgMul *= 1.2; } },
  { n: 'OVERCLOCKED SERVOS', d: '+15% move speed', a: (s) => { s.spdMul *= 1.15; } },
  { n: 'QUICKDRAW CORE', d: '+15% attack speed', a: (s) => { s.atkSpdMul *= 0.87; } },
  { n: 'PHASE CAPACITOR', d: '-25% dash cooldown', a: (s) => { s.dashCdMul *= 0.75; } },
  { n: 'BLADE SYNC', d: '-30% swap cooldown<br>+50% swap burst', a: (s) => { s.swapCdMul *= 0.7; s.swapDmgMul *= 1.5; } },
  { n: 'COOLANT FLUSH', d: '+25 max integrity<br>full repair', a: (s) => { s.maxHp += 25; player.hp = s.maxHp; } },
  { n: 'VAMPIRIC NANITES', d: '+2 integrity per kill', a: (s) => { s.lifesteal += 2; } },
  { n: 'REACTIVE PLATING', d: '-15% damage taken', a: (s) => { s.dmgTakenMul *= 0.85; } },
  {
    n: 'RONIN BANNER', d: 'recruit 2 ally ronin<br>(E / ⚑ orders a charge)',
    avail: () => allies.length < ALLY_CAP,
    a: () => recruitAllies(2),
  },
];

function recruitAllies(n) {
  for (let i = 0; i < n && allies.length < ALLY_CAP; i++) {
    const a = (Math.random() - 0.5) * Math.PI;
    allies.push(new Ally(scene,
      player.pos.x + Math.sin(a) * 2, player.pos.z + Math.cos(a) * 2));
  }
}

const MODS = [
  { n: 'STATIC WAKE', mod: 'wake', d: 'dashing leaves a damaging trail' },
  { n: 'ECHO BLADE', mod: 'echo', d: 'every 3rd strike emits a shockwave' },
  { n: 'CHAIN ARC', mod: 'chain', d: 'kills detonate, arcing to nearby enemies' },
  { n: 'BOLT MAGNET', mod: 'magnet', d: 'deflected bolts fly back at enemies' },
  { n: 'BERSERK PROTOCOL', mod: 'berserk', d: '+40% damage below 40% integrity' },
  { n: 'SECOND CORE', mod: 'core', d: 'survive one lethal hit per room' },
  { n: 'OVERCHARGE SWAP', mod: 'overcharge', d: 'swapping also fires a bolt nova' },
  { n: 'GLASS EDGE', mod: 'glass', d: '+35% damage, +15% damage taken' },
];
for (const m of MODS) {
  const flag = m.mod;
  m.a = (s) => {
    s.mods[flag] = true;
    if (flag === 'glass') { s.dmgMul *= 1.35; s.dmgTakenMul *= 1.15; }
  };
}

let offered = [];
let cardArmT = 0;    // brief guard so a combat click doesn't insta-pick a card
function showUpgrades() {
  state = 'upgrade';
  cardArmT = performance.now() + 400;
  document.exitPointerLock?.();
  // modifiers only offered while not yet owned; stat upgrades repeat freely
  const pool = [
    ...UPGRADES.filter((u) => !u.avail || u.avail()),
    ...MODS.filter((m) => !player.stats.mods[m.mod]),
  ];
  offered = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  for (let i = 0; i < 3; i++) {
    const o = offered[i];
    hud.cards[i].classList.toggle('mod', !!o.mod);
    hud.cards[i].innerHTML =
      `<div class="card-tag">${o.mod ? 'MODIFIER' : 'STAT'}</div>` +
      `<div class="card-name">${o.n}</div><div class="card-desc">${o.d}</div>`;
  }
  hud.upgrade.style.display = 'flex';
}
hud.cards.forEach((card, i) => {
  card.addEventListener('click', () => {
    if (state !== 'upgrade' || performance.now() < cardArmT) return;
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
  if (state !== 'fight' || input.touch) return;
  paused = !locked;
  hud.pause.style.display = locked ? 'none' : 'flex';
};

// melee/ranged toggle for touch auto-combat (sits above the right stick)
const modeBtn = $('modebtn');
function refreshModeBtn() {
  modeBtn.textContent = input.mode === 'melee' ? '⚔ MELEE' : '➶ RANGED';
  modeBtn.classList.toggle('ranged', input.mode === 'ranged');
}
refreshModeBtn();
for (const ev of ['click', 'touchstart']) {
  modeBtn.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    input.mode = input.mode === 'melee' ? 'ranged' : 'melee';
    refreshModeBtn();
    audio.swap();
  }, { passive: false });
}

// form chips double as swap buttons on touch
hud.chips.forEach((chip, i) => {
  chip.addEventListener('click', () => { input.swapQueued = i; });
});

// touch action buttons mirror their keys
for (const [btn, field] of [[hud.cmdbtn, 'commandQueued'], [hud.parrybtn, 'parryQueued'], [hud.ultbtn, 'ultQueued']]) {
  for (const ev of ['click', 'touchstart']) {
    btn.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      input[field] = true;
    }, { passive: false });
  }
}

// ── HUD refresh ───────────────────────────────────────────────────────────────
function updateHud(dt) {
  hud.hpfill.style.width = `${(player.hp / player.stats.maxHp) * 100}%`;
  hud.dashpips.forEach((pip, i) => pip.classList.toggle('on', player.dashCharges > i));
  hud.ultfill.style.width = `${(player.ult / ULT_MAX) * 100}%`;
  hud.ultwrap.classList.toggle('ready', player.ultReady);
  hud.ultbtn.style.opacity = player.ultReady ? 1 : 0.3;
  hud.parrybtn.style.opacity = player.parryCd > 0 ? 0.4 : 1;
  const liveAllies = allies.filter((a) => !a.dead).length;
  hud.allychip.style.display = allies.length ? 'block' : 'none';
  hud.allychip.textContent = `⚑ RONIN ×${liveAllies}`;
  hud.cmdbtn.classList.toggle('has-squad', liveAllies > 0);
  hud.cmdbtn.style.opacity = liveAllies === 0 ? 0.25 : cmdCd > 0 ? 0.4 : 1;
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

// debug/testing hook
window.__nr = {
  player, input,
  getEnemies: () => enemies, getScore: () => score,
  getAllies: () => allies, recruitAllies,
  hurtPlayerTest: (dmg) => combat.hurtPlayer(dmg, null),
  spawnTestDrone: (i, n = 6) => {
    const a = (i / n) * Math.PI * 2;
    enemies.push(new Enemy(scene, EnemyType.DRONE,
      player.pos.x + Math.sin(a) * 2.2, player.pos.z + Math.cos(a) * 2.2, 1));
  },
  // clears the field but parks one inert enemy far away so the room does not
  // read as "cleared" and freeze the sim behind the upgrade overlay
  clearFieldTest: () => {
    for (const e of enemies) scene.remove(e.mesh);
    enemies.length = 0;
    pending.length = 0;
    bolts.clear();
    const keeper = new Enemy(scene, EnemyType.SLASHER, 0, ARENA_R - 2, 1);
    keeper.speed = 0;
    keeper.hp = 1e9;
    enemies.push(keeper);
  },
};

function simulate(dt) {
  // enemies pick their nearest target from the player + living allies
  const targets = [{ pos: player.pos, radius: PLAYER_RADIUS, isPlayer: true, ref: player }];
  for (const a of allies) {
    if (!a.dead) targets.push({ pos: a.pos, radius: ALLY_RADIUS, isPlayer: false, ref: a });
  }
  const ctx = { input, camYaw, dt, t, combat, effects, audio, bolts, pBolts, enemies, allies, targets, arenaR: ARENA_R, playerPos: player.pos };

  player.update(ctx);

  // CHARGE order: squad hunts with a damage/speed boost
  cmdCd = Math.max(0, cmdCd - dt);
  if (input.consumeCommand() && cmdCd <= 0 && allies.some((a) => !a.dead)) {
    cmdCd = 10;
    for (const a of allies) if (!a.dead) a.charge();
    effects.ring(player.pos, 3, 0.35, ALLY_ACCENT, true);
    audio.rally();
  }

  // squad update + casualty sweep
  let slot = 0;
  const liveAllies = allies.filter((a) => !a.dead);
  for (const a of liveAllies) a.update(ctx, slot++, liveAllies.length);
  for (const a of allies) {
    if (a.dead && a.mesh.parent) {
      effects.shards(a.pos, ALLY_ACCENT, 8);
      scene.remove(a.mesh);
    }
  }
  playerLight.position.set(player.pos.x, player.pos.y + 2.6, player.pos.z);
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
      if (enemies.length >= LIVE_CAP) { s.delay = 0.4; continue; }   // hold overflow
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

  // enemy bolts vs player (jumping clears them) and vs allies
  bolts.update(dt, ARENA_R + 2);
  for (let i = bolts.active.length - 1; i >= 0; i--) {
    const b = bolts.active[i].mesh.position;
    // parry catches bolts in a wide bubble and sends them back
    if (player.parrying && Math.hypot(b.x - player.pos.x, b.z - player.pos.z) < 2.4) {
      let tgt = null, td = 99;
      for (const e of enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.pos.x - b.x, e.pos.z - b.z);
        if (d < td) { td = d; tgt = e; }
      }
      _tmp.set(tgt ? tgt.pos.x - b.x : Math.sin(player.yaw), 0,
               tgt ? tgt.pos.z - b.z : Math.cos(player.yaw));
      pBolts.spawn(b, _tmp, 20, 0xffffff, 28 * player.stats.dmgMul);
      effects.sparks(b.clone(), 0xffffff, 4, 4);
      bolts.recycleAt(i);
      player.addUlt(4);
      score += 15;
      audio.deflect();
      continue;
    }
    if (!player.invincible && player.pos.y < 0.9) {
      const dx = b.x - player.pos.x, dz = b.z - player.pos.z;
      if (dx * dx + dz * dz < (PLAYER_RADIUS + BOLT_R) ** 2) {
        bolts.recycleAt(i);
        combat.hurtPlayer(10, null);
        if (player.dead) break;
        continue;
      }
    }
    for (const a of allies) {
      if (a.dead) continue;
      const dx = b.x - a.pos.x, dz = b.z - a.pos.z;
      if (dx * dx + dz * dz < (ALLY_RADIUS + BOLT_R) ** 2) {
        bolts.recycleAt(i);
        a.hurt(10, null);
        break;
      }
    }
  }

  // player bolts (ranged mode) vs enemies
  pBolts.update(dt, ARENA_R + 2);
  for (let i = pBolts.active.length - 1; i >= 0; i--) {
    const b = pBolts.active[i];
    const bp = b.mesh.position;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = bp.x - e.pos.x, dz = bp.z - e.pos.z;
      if (dx * dx + dz * dz < (e.radius + BOLT_R + 0.1) ** 2) {
        effects.sparks(bp.clone(), player.conf.accent, 4, 3);
        const died = e.hit(b.dmg, player.pos);
        if (died) combat.onKill(e);
        audio.hit();
        pBolts.recycleAt(i);
        break;
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
