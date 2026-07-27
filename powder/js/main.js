// Powder — a heavy hover racer carving a bottomless deep-powder descent.
// Third-person and close, like a snowboarding game; weighty and momentum-led,
// like Jet Moto; elbows out against a field, like MotorStorm. Scene, race
// loop, camera, HUD.
import * as THREE from 'three';
import { PAL, SUN_DIR } from './palette.js?v=1';
import { Track, ICE, ROCK } from './track.js?v=1';
import { Craft } from './craft.js?v=1';
import { SprayPool, ScarField } from './snow.js?v=1';
import { InputManager, STICK_R } from './input.js?v=1';
import { AudioKit } from './audio.js?v=1';
import { makeSky } from './sky.js?v=1';
import { patchAll } from './retro.js?v=1';

const RES_H = 288;              // internal render height — upscaled with hard pixels
const FOG_NEAR = 170, FOG_FAR = 610;
const START_TIME = 45;
const GATE_TIME = 22;
const RIVALS = 5;
const TOP_SPEED = 140;          // for the speed bar / audio normalisation
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.setClearColor(PAL.fog);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PAL.fog, FOG_NEAR, FOG_FAR);
const camera = new THREE.PerspectiveCamera(58, 1, 0.5, 2200);

// A warm low sun over cold snow: lit faces come out bone-cream like the
// reference plates, shadowed faces stay blue. The hemisphere fill stands in
// for the enormous bounce you get off a snowfield.
const sun = new THREE.DirectionalLight(0xfff2d8, 1.35);
sun.position.set(-SUN_DIR[0] * 100, -SUN_DIR[1] * 100, -SUN_DIR[2] * 100);
scene.add(sun);
// A bright field throws an enormous amount of light back up. Without a strong
// ground term in the hemisphere fill, every face turned away from the sun goes
// to slate and the cream hulls read as grey metal.
scene.add(new THREE.HemisphereLight(0xa8bcd8, 0xf4eeda, 1.00));

const sky = makeSky(scene);
const track = new Track(scene, 7);
const spray = new SprayPool(scene, { color: PAL.fog, near: FOG_NEAR, far: FOG_FAR });
const scars = new ScarField(scene);
const input = new InputManager();
const audio = new AudioKit();

// Sticks are drawn on their own full-resolution overlay — putting them in the
// 288px render would make them as chunky as the world.
const ui = document.getElementById('ui');
const uiCtx = ui.getContext('2d');

function resize() {
  const aspect = innerWidth / innerHeight;
  renderer.setSize(Math.round(RES_H * aspect), RES_H, false);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  ui.width = innerWidth; ui.height = innerHeight;
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------- HUD
const el = id => document.getElementById(id);
const hud = {
  speed: el('speed'), pos: el('pos'), time: el('time'), dist: el('dist'),
  chargeFill: el('chargeFill'), surf: el('surf'), msg: el('msg'), toast: el('toast'),
  hudBar: el('hud'),
};

// -------------------------------------------------------------- race state
const state = {
  mode: 'menu', timer: START_TIME, dist: 0, score: 0, rank: 1,
  gates: 0, best: Number(localStorage.getItem('powderBest') || 0),
  trauma: 0, toastT: 0, camHead: 0, camY: 0, camRoll: 0, fov: 58,
};

let player = null;
let field = [];

function startRace() {
  for (const c of field) c.dispose();
  field = [];
  player = new Craft(track, { isPlayer: true, accent: PAL.accents[0], number: 1, s: 40, n: 0 });
  field.push(player);
  for (let i = 0; i < RIVALS; i++) {
    const c = new Craft(track, {
      accent: PAL.accents[(i + 1) % PAL.accents.length],
      number: [7, 5, 3, 9, 4][i],
      s: 40 + (i % 2 ? 6 : -4) - i * 3,
      n: (i - 2) * 8.5,
    });
    c.basePower = 0.90 + i * 0.020;
    c.power = c.basePower;
    field.push(c);
  }
  player.basePower = 1;
  patchAll(scene);

  state.mode = 'race';
  state.timer = START_TIME;
  state.dist = 0; state.score = 0; state.gates = 0;
  state.trauma = 0;
  nextGate = track.gateAfter(player.s + 10);
  hud.msg.style.display = 'none';
  hud.hudBar.style.display = '';
  audio.startLoops();
  placeCamera(0, true);
}

let nextGate = null;

function gameOver() {
  state.mode = 'over';
  audio.stopLoops();
  audio.over();
  const d = Math.floor(state.dist);
  if (d > state.best) { state.best = d; localStorage.setItem('powderBest', String(d)); }
  hud.msg.innerHTML =
    `<b>RUN OVER</b><br><small>${d} M &nbsp;·&nbsp; ${state.gates} CHECKPOINTS &nbsp;·&nbsp; ` +
    `${ordinal(state.rank)} OF ${field.length}<br>SCORE ${state.score} &nbsp;·&nbsp; BEST ${state.best} M</small>` +
    `<br><small style="opacity:.7">ENTER / TAP TO RUN AGAIN</small>`;
  hud.msg.style.display = '';
}

function ordinal(n) {
  const s = ['TH', 'ST', 'ND', 'RD'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function toast(text, ms = 1400) {
  hud.toast.textContent = text;
  hud.toast.style.display = '';
  state.toastT = ms / 1000;
}

// --------------------------------------------------------------- race step
const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _p = new THREE.Vector3();
const _nd = {};

function step(dt) {
  const ctl = input.read();
  player.update(dt, ctl);
  for (let i = 1; i < field.length; i++) {
    const c = field[i];
    c.update(dt, c.aiControl(dt, player.s));
  }
  bodyContact();
  feedback();

  for (const c of field) { emitSnow(c, dt); layScar(c, dt); }
  spray.update(dt);
  scars.update(dt);
  track.update(player.s);

  // ---- checkpoints
  state.dist = player.s - 40;
  if (nextGate && player.s > nextGate.s) {
    state.gates++;
    state.timer += GATE_TIME;
    state.score += 500;
    audio.gate();
    toast(`CHECKPOINT  +${GATE_TIME}s`);
    nextGate = track.gateAfter(player.s + 10);
  }
  state.timer -= dt;
  if (state.timer <= 0) { state.timer = 0; gameOver(); return; }

  // ---- tricks and knocks
  if (player.trick) {
    toast(player.trick);
    state.score += 300;
    audio.trick();
    state.trauma = Math.min(1, state.trauma + 0.25);
    player.trick = null;
  }
  for (let i = 1; i < field.length; i++) field[i].trick = null;

  state.rank = 1;
  for (let i = 1; i < field.length; i++) if (field[i].s > player.s) state.rank++;

  placeCamera(dt, false);
  updateHud(dt);

  const sp01 = clamp(player.speed / TOP_SPEED, 0, 1);
  const snow01 = player.air ? 0 : clamp(player.depth * 0.8 + player.carve * 0.5, 0, 1);
  audio.drive(sp01, player.carve, snow01, player.boosting);
}

/** Watch the player for state changes worth hearing and feeling. */
function feedback() {
  const p = player;
  if (p.air && !p._wasAir) { audio.launch(); state.trauma = Math.min(1, state.trauma + 0.2); }
  if (!p.air && p._wasAir) {
    const hard = p.surfType === ICE || p.surfType === ROCK;
    audio.land(hard);
    state.trauma = Math.min(1, state.trauma + (hard ? 0.5 : 0.3));
    burst(p, hard ? 8 : 20);
  }
  if (p.crashT > 0 && !(p._wasCrash > 0)) {
    audio.crash();
    state.trauma = 1;
    burst(p, 24);
    toast('WIPEOUT', 900);
  }
  if (p.boosting && !p._wasBoost) audio.boost();
  p._wasAir = p.air;
  p._wasCrash = p.crashT;
  p._wasBoost = p.boosting;
}

/** One-off cloud, for landings and wrecks. */
function burst(c, n) {
  craftBasis(c);
  for (let i = 0; i < n; i++) {
    _p.copy(c.mesh.position)
      .addScaledVector(_fwd, -1 - Math.random() * 3)
      .addScaledVector(_right, (Math.random() - 0.5) * 5);
    _p.y = c.y + 0.3;
    spray.emit(_p, _fwd, _right, (Math.random() - 0.5) * 14, 0.9);
  }
}

/** Elbows out — the field shoves rather than passes politely. */
function bodyContact() {
  for (let i = 0; i < field.length; i++) {
    for (let j = i + 1; j < field.length; j++) {
      const a = field[i], b = field[j];
      if (Math.abs(a.s - b.s) > 5.5) continue;
      const dn = b.n - a.n;
      if (Math.abs(dn) > 3.6) continue;
      const dir = Math.sign(dn) || 1;
      a.shove(-dir); b.shove(dir);
      if (a === player || b === player) {
        audio.bump();
        state.trauma = Math.min(1, state.trauma + 0.22);
      }
    }
  }
}

function craftBasis(c) {
  const nd = track.sample(c.s, _nd);
  const head = nd.head + c.yaw;
  _fwd.set(Math.sin(head), 0, -Math.cos(head));
  _right.set(Math.cos(head), 0, Math.sin(head));
  return nd;
}

function emitSnow(c, dt) {
  if (c.air || c.speed < 8) { c._emitAcc = 0; return; }
  craftBasis(c);
  const hard = c.surfType === ICE || c.surfType === ROCK;
  const power = clamp(c.depth * 0.8 + c.carve * 0.5 + (c.crashT > 0 ? 0.5 : 0) + c.speed / 320, 0, 1);
  let rate = (3 + c.depth * 46 + c.carve * 22 + (c.crashT > 0 ? 45 : 0)) * (0.35 + c.speed / 130);
  if (hard) rate *= 0.22;
  c._emitAcc = (c._emitAcc || 0) + rate * dt;
  const sign = Math.sign(c.yaw) || 1;
  while (c._emitAcc >= 1) {
    c._emitAcc -= 1;
    const off = -sign * (0.7 + Math.random() * 1.7);
    _p.copy(c.mesh.position)
      .addScaledVector(_fwd, -2.0 - Math.random() * 1.6)
      .addScaledVector(_right, off);
    _p.y = c.y + 0.25;
    spray.emit(_p, _fwd, _right, -sign * c.carve * 10, power);
  }
}

function layScar(c, dt) {
  if (c._scarS === undefined) c._scarS = c.s;
  if (c.air) { c._scarS = c.s; return; }
  if (c.s - c._scarS < 1.4) return;
  c._scarS = c.s;
  const nd = track.sample(c.s, _nd);
  track.worldPos(c.s, c.n, _p);
  // long and overlapping so it reads as a continuous trench, and only just
  // darker than the snow — hard-edged slabs look like road markings
  scars.lay(_p, -(nd.head + c.yaw), nd.pitch, Math.atan(nd.tilt),
    1.7 + c.carve * 1.3, 3.6, 0.10 + c.depth * 0.26 + c.carve * 0.10);
}

// ------------------------------------------------------------------ camera
const _camPos = new THREE.Vector3(), _look = new THREE.Vector3();
/** Shortest signed way round from a to b. */
function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function placeCamera(dt, snap) {
  const p = player;
  // Anchored on the craft in WORLD space, not in track space. Framing the
  // shot as (s - back, n) and aiming at (s + ahead, n * k) looks fine on the
  // centreline and skews badly everywhere else — off to one side the camera
  // ends up staring diagonally past the craft and the run reads as a road
  // crossing the frame. Hang the rig off the craft and it can't drift.
  const back = 9.5 + p.speed * 0.018;
  const nd = track.sample(p.s, _nd);
  // Smooth the HEADING, then snap the position onto the rig. Lerping the
  // position instead leaves a steady-state lag of speed/rate metres — at
  // 100 m/s that silently doubles the chase distance and the craft shrinks
  // to a speck the moment you get going.
  const head = nd.head + p.yaw * 0.55;
  if (snap) state.camHead = head;
  else state.camHead += angleDelta(state.camHead, head) * Math.min(1, 6 * dt);
  const fx = Math.sin(state.camHead), fz = -Math.cos(state.camHead);
  const ground = track.surface(p.s - back, p.n);

  _camPos.copy(p.mesh.position);
  _camPos.x -= fx * back;
  _camPos.z -= fz * back;
  // ride above whichever is higher — the craft, or the hill behind it, which
  // on a 20% descent is always a few metres up
  const wantY = Math.max(ground + 1.0, p.y + 3.0 + p.speed * 0.006);
  if (snap) state.camY = wantY;
  else state.camY += (wantY - state.camY) * Math.min(1, 6 * dt);
  _camPos.y = state.camY;

  const ahead = 22;
  _look.copy(p.mesh.position);
  _look.x += fx * ahead;
  _look.z += fz * ahead;
  // Aim close to the craft's own level. Aiming high tips the rig down and
  // buries the craft at the bottom of the frame with a screenful of ground
  // above it; this puts it around two thirds down with the horizon in shot.
  _look.y = p.y + 1.4;

  camera.position.copy(_camPos);
  camera.lookAt(_look);

  // bank the frame with the craft, then shake
  const roll = clamp(-p.yaw * 0.22 - p.vDrift * 0.003, -0.14, 0.14);
  state.camRoll += (roll - state.camRoll) * Math.min(1, 6 * dt);
  camera.rotateZ(state.camRoll);

  state.trauma = Math.max(0, state.trauma - dt * 1.6);
  if (p.scrapeT > 0) state.trauma = Math.min(1, state.trauma + dt * 3);
  if (p.crashT > 0) state.trauma = Math.min(1, state.trauma + dt * 2.2);
  const t = state.trauma * state.trauma;
  if (t > 0.001) {
    camera.position.x += (Math.random() - 0.5) * t * 1.5;
    camera.position.y += (Math.random() - 0.5) * t * 1.2;
    camera.rotateZ((Math.random() - 0.5) * t * 0.05);
  }

  const wantFov = 58 + (p.boosting ? 9 : 0) + p.speed * 0.038;
  state.fov += (wantFov - state.fov) * Math.min(1, 4 * dt);
  if (Math.abs(camera.fov - state.fov) > 0.01) {
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
  }
  sky.update(camera);
}

// --------------------------------------------------------------------- HUD
let hudT = 0;
function updateHud(dt) {
  hudT -= dt;
  if (state.toastT > 0 && (state.toastT -= dt) <= 0) hud.toast.style.display = 'none';
  hud.chargeFill.style.width = player.charge.toFixed(0) + '%';
  hud.chargeFill.style.background = player.boosting ? '#fff' : (player.charge > 55 ? '#b5462f' : '#6b3550');
  if (hudT > 0) return;
  hudT = 0.08;
  hud.speed.textContent = Math.round(player.speed * 2.4);
  hud.pos.textContent = state.rank + '/' + field.length;
  hud.time.textContent = state.timer.toFixed(1);
  hud.time.style.color = state.timer < 8 ? '#b5462f' : '';
  hud.dist.textContent = Math.floor(state.dist);
  const s = player.air ? 'AIR' : ['PACKED', 'DEEP', 'CRUST', 'ROCK'][player.surfType];
  hud.surf.textContent = s;
}

// ------------------------------------------------------------ stick overlay
function drawStick(s, label, hintX, hintY) {
  const c = uiCtx;
  if (s.id !== -1) {
    let dx = s.x - s.x0, dy = s.y - s.y0;
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
    c.strokeStyle = 'rgba(232,223,198,0.55)';
    c.fillStyle = 'rgba(232,223,198,0.07)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(s.x0, s.y0, STICK_R, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(232,223,198,0.42)';
    c.beginPath(); c.arc(s.x0 + dx, s.y0 + dy, 23, 0, 7); c.fill();
  } else {
    c.strokeStyle = 'rgba(232,223,198,0.18)';
    c.lineWidth = 2;
    c.setLineDash([6, 6]);
    c.beginPath(); c.arc(hintX, hintY, STICK_R * 0.8, 0, 7); c.stroke();
    c.setLineDash([]);
    c.fillStyle = 'rgba(232,223,198,0.32)';
    c.font = 'bold 12px monospace';
    c.textAlign = 'center';
    c.fillText(label, hintX, hintY + 4);
  }
}

function drawSticks() {
  uiCtx.clearRect(0, 0, ui.width, ui.height);
  if (!input.touchSeen) return;
  const s = input.sticks();
  drawStick(s.left, 'CARVE', ui.width * 0.17, ui.height * 0.74);
  drawStick(s.right, 'BURN', ui.width * 0.83, ui.height * 0.74);
}

// -------------------------------------------------------------------- loop
let last = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.mode === 'race') step(dt);
  else if (state.mode === 'menu' || state.mode === 'over') {
    // idle flyby so the menu is never a still frame
    idle(dt);
  }
  renderer.render(scene, camera);
  drawSticks();
}

let idleS = 60;
function idle(dt) {
  idleS += 26 * dt;
  const n = Math.sin(idleS * 0.008) * 20;
  track.update(idleS);
  track.worldPos(idleS - 26, n - 10, _camPos);
  _camPos.y += 9;
  camera.position.lerp(_camPos, Math.min(1, 2 * dt));
  track.worldPos(idleS + 30, n, _look);
  _look.y += 2;
  camera.lookAt(_look);
  spray.update(dt);
  scars.update(dt);
  sky.update(camera);
}

// -------------------------------------------------------------------- boot
input.onStart = () => {
  audio.ensure();
  if (state.mode === 'paused') {
    state.mode = 'race'; hud.msg.style.display = 'none'; last = performance.now();
  } else if (state.mode !== 'race') startRace();
};
input.onPause = () => {
  if (state.mode === 'race') {
    state.mode = 'paused';
    hud.msg.innerHTML = '<b>PAUSED</b><br><small>ENTER TO RESUME</small>';
    hud.msg.style.display = '';
  } else if (state.mode === 'paused') {
    state.mode = 'race';
    hud.msg.style.display = 'none';
    last = performance.now();
  }
};
addEventListener('keydown', e => {
  if (e.code === 'Enter' && state.mode === 'paused') {
    state.mode = 'race'; hud.msg.style.display = 'none'; last = performance.now();
  }
});

hud.msg.innerHTML =
  '<b>P&nbsp;O&nbsp;W&nbsp;D&nbsp;E&nbsp;R</b>' +
  '<br><small>CARVE THE DEEP SNOW TO CHARGE THE AFTERBURNER' +
  '<br>MAKE THE CHECKPOINTS BEFORE THE CLOCK RUNS OUT</small>' +
  '<br><small style="opacity:.7">A / D CARVE &nbsp; W TUCK &nbsp; S SCRUB &nbsp; SPACE BURN' +
  '<br>TOUCH: LEFT STICK CARVE &nbsp;·&nbsp; RIGHT STICK BURN</small>' +
  '<br><small style="opacity:.7">ENTER / TAP TO DROP IN</small>';
hud.hudBar.style.display = 'none';
track.update(idleS);
patchAll(scene);
animate();

window.__pw = {
  THREE, scene, camera, renderer, track, state, spray, scars, audio, sky,
  get player() { return player; },
  get field() { return field; },
  debug: {
    start: startRace,
    over: gameOver,
    warp: (m) => { if (player) { player.s += m; track.update(player.s); } },
    time: (t) => { state.timer = t; },
  },
};
