// Powder — a hover racer on an open flatland cut by a canyon.
//
// Three things define this build against the last one:
//   SIMULATION   the craft is a rigid body on four sprung hover pads with a
//                spooling turbine, run at a fixed 120 Hz. Pitch, roll, weight
//                transfer and every slide fall out of forces. See vehicle.js.
//   OPEN WORLD   no ribbon and no fall line. terrain.js is a pure height
//                function streamed as tiles, and you go where you like.
//   SURREAL      a violet-to-amber sky with a ringed body sitting on it, long
//                raking shadows, rock that floats, and a graded, bloomed,
//                heat-shimmered frame. Nothing here is pretending to be a
//                console from 1996 any more.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PAL, SUN_DIR, FILL_DIR } from './palette.js?v=3';
import { Terrain, SURF, SALT, VIEW } from './terrain.js?v=3';
import { Vehicle } from './vehicle.js?v=3';
import { DustPool, ScarField } from './dust.js?v=3';
import { Route, RADIUS } from './route.js?v=3';
import { InputManager, STICK_R } from './input.js?v=3';
import { AudioKit } from './audio.js?v=3';
import { makeSky } from './sky.js?v=3';

// Fog has to reach nearly the edge of the streamed world, not half way
// into it, or the flats read as a 300 m milk bowl instead of a plain.
const FOG_NEAR = 300, FOG_FAR = VIEW;
const START_TIME = 60, GATE_TIME = 20;
const RIVALS = 4;
const TOP_SPEED = 100;                     // m/s, for normalising the gauges
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// Quality is a real setting, not a test hook: shadows and bloom are what a
// weak machine cannot afford, and they are exactly what this look is made of.
const QKEY = 'powderQuality';
const qParam = new URLSearchParams(location.search).get('q');
let QUALITY = qParam || localStorage.getItem(QKEY) || 'high';

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: QUALITY === 'high' });
renderer.setPixelRatio(Math.min(devicePixelRatio, QUALITY === 'high' ? 2 : 1));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
if (QUALITY === 'high') {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PAL.fog, FOG_NEAR, FOG_FAR);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 4000);

// Key light: low and warm, so everything standing up throws its length across
// the flats. Fill: cold and from behind — the tell that this is not Earth.
const key = new THREE.DirectionalLight(0xfff0d0, 2.5);
key.position.set(-SUN_DIR[0] * 200, -SUN_DIR[1] * 200, -SUN_DIR[2] * 200);
if (QUALITY === 'high') {
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const c = key.shadow.camera;
  c.left = -190; c.right = 190; c.top = 190; c.bottom = -190;
  c.near = 1; c.far = 900;
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.6;
}
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0x8fa8e8, 1.15);
fill.position.set(-FILL_DIR[0] * 200, -FILL_DIR[1] * 200, -FILL_DIR[2] * 200);
scene.add(fill);
// generous, because the key is low and raking: without it every face
// turned from the sun crushes to black and the monoliths become holes
scene.add(new THREE.HemisphereLight(0x9a86c8, 0xd9b483, 0.95));

const sky = makeSky(scene, SUN_DIR);
const terrain = new Terrain(scene, 11);
const dust = new DustPool(scene, { color: PAL.fog, near: FOG_NEAR, far: FOG_FAR });
const scars = new ScarField(scene);
const route = new Route(terrain, scene);
const input = new InputManager();
const audio = new AudioKit();

// ------------------------------------------------------------ the grade pass
// Vignette, a touch of chromatic aberration toward the corners, and a heat
// shimmer that only bites near the bottom of the frame — where the ground is.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 },
    uAberr: { value: 0.0011 }, uShimmer: { value: 0.0016 }, uVig: { value: 0.55 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uAberr, uShimmer, uVig;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      float ground = smoothstep(0.55, 0.0, uv.y);
      uv.x += sin(uv.y * 90.0 + uTime * 2.6) * uShimmer * ground;
      uv.y += cos(uv.x * 70.0 + uTime * 2.1) * uShimmer * 0.5 * ground;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);
      vec2 off = d * r2 * uAberr * 6.0;
      vec3 c;
      c.r = texture2D(tDiffuse, uv + off).r;
      c.g = texture2D(tDiffuse, uv).g;
      c.b = texture2D(tDiffuse, uv - off).b;
      c *= 1.0 - uVig * r2 * 1.35;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
let bloom = null;
if (QUALITY === 'high') {
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.75, 0.86);
  composer.addPass(bloom);
}
const grade = new ShaderPass(GradeShader);
composer.addPass(grade);
composer.addPass(new OutputPass());

const ui = document.getElementById('ui');
const uiCtx = ui.getContext('2d');

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  ui.width = innerWidth; ui.height = innerHeight;
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------- HUD
const el = id => document.getElementById(id);
const hud = {
  kph: el('kph'), n1: el('n1'), n1bar: el('n1bar'), heat: el('heat'),
  gLat: el('glat'), slip: el('slip'), gap: el('gap'), surf: el('surf'),
  dmg: el('dmg'), time: el('time'), gate: el('gate'), rift: el('rift'),
  pos: el('pos'), msg: el('msg'), toast: el('toast'), cluster: el('cluster'),
  compass: el('compass'),
};

const state = {
  mode: 'menu', timer: START_TIME, gates: 0, rift: 0, score: 0, rank: 1,
  best: Number(localStorage.getItem('powderBest') || 0),
  camYaw: 0, camY: 0, shake: 0, toastT: 0, fov: 62, t: 0,
};

let player = null, field = [];
const ctl = { steer: 0, throttle: 0, brake: false, overdrive: false };
const aiCtl = { steer: 0, throttle: 1, brake: false, overdrive: false };

function startRace() {
  for (const c of field) c.dispose();
  field = [];
  route.index = 0; route._built = -1;
  // start out on the flats beside the rim, not down in the rift — the first
  // gate is deep in the canyon and the breach between here and there is the
  // opening move of a run
  const sx = terrain.canyonX(0) + 95;
  player = new Vehicle(terrain, { isPlayer: true, accent: PAL.accents[0], number: 1, x: sx, z: 0 });
  field.push(player);
  for (let i = 0; i < RIVALS; i++) {
    const v = new Vehicle(terrain, {
      accent: PAL.accents[(i + 1) % PAL.accents.length],
      number: [7, 5, 3, 9][i],
      x: sx + (i - 1.5) * 13, z: 8 + (i % 2) * 9,
    });
    v.basePower = 0.90 + i * 0.028;
    v.power = v.basePower;
    field.push(v);
  }
  state.mode = 'race';
  state.timer = START_TIME; state.gates = 0; state.rift = 0; state.score = 0;
  state.shake = 0;
  hud.msg.style.display = 'none';
  hud.cluster.style.display = '';
  audio.startLoops();
  terrain.update(player.pos.x, player.pos.z);
  placeCamera(0, true);
}

function gameOver(reason) {
  state.mode = 'over';
  audio.stopLoops();
  audio.over();
  const sc = Math.floor(state.score);
  if (sc > state.best) { state.best = sc; localStorage.setItem('powderBest', String(sc)); }
  hud.msg.innerHTML =
    `<b>${reason}</b><br><small>${state.gates} GATES &nbsp;·&nbsp; ` +
    `${state.rift.toFixed(0)} s IN THE RIFT &nbsp;·&nbsp; ${ordinal(state.rank)} OF ${field.length}` +
    `<br>SCORE ${sc} &nbsp;·&nbsp; BEST ${state.best}</small>` +
    `<br><small style="opacity:.65">ENTER / TAP TO RUN AGAIN</small>`;
  hud.msg.style.display = '';
}

function ordinal(n) {
  const s = ['TH', 'ST', 'ND', 'RD'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function toast(text, ms = 1500) {
  hud.toast.textContent = text;
  hud.toast.style.display = '';
  state.toastT = ms / 1000;
}

// --------------------------------------------------------------- race step
const _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _p = new THREE.Vector3();
const _cinfo = {};
let floaters = [], floatT = 0;

function step(dt) {
  state.t += dt;
  input.read(ctl);
  player.update(dt, ctl);
  const tgt = route.current;
  for (let i = 1; i < field.length; i++) {
    const v = field[i];
    v.aiControl(dt, tgt, aiCtl);
    const band = clamp((-player.pos.z + v.pos.z) / 500, -1, 1);
    v.power = v.basePower + band * 0.08;
    v.update(dt, aiCtl);
  }

  feedback();
  for (const v of field) { emitDust(v, dt); layScar(v, dt); }
  dust.update(dt);
  scars.update(dt);
  terrain.update(player.pos.x, player.pos.z);
  route.update();

  // floating rock: turn it slowly and let it breathe
  floatT -= dt;
  if (floatT <= 0) { terrain.floaters(floaters = []); floatT = 0.5; }
  for (const f of floaters) {
    f.rotation.y += f.userData.spin * dt;
    f.position.y = f.userData.y0 + Math.sin(state.t * 0.4 + f.userData.bob) * 1.4;
  }

  // ---- gates
  if (route.check(player.pos.x, player.pos.z)) {
    state.gates++;
    state.timer += GATE_TIME;
    state.score += 400;
    audio.gate();
    toast(`GATE ${state.gates}   +${GATE_TIME}s`);
  }
  state.rift = player.riftT;
  state.score += (player.surf === SALT && player.grounded ? 26 : 8) * dt * (player.speed / 40);

  state.timer -= dt;
  if (state.timer <= 0) { state.timer = 0; gameOver('TIME OUT'); return; }
  if (player.damage >= 1) { gameOver('HULL FAILURE'); return; }

  state.rank = 1;
  for (let i = 1; i < field.length; i++) if (field[i].pos.z < player.pos.z) state.rank++;

  placeCamera(dt, false);
  updateHud(dt);
  audio.drive(player.n1, clamp(player.speed / TOP_SPEED, 0, 1),
    player.grounded ? 1 : 0, Math.abs(player.slip), player.overdrive);
}

let wasTripped = false;
function feedback() {
  const p = player;
  if (p.impact > 0) {
    audio.impact(p.impact);
    state.shake = Math.min(1, state.shake + clamp(p.impact / 18, 0.2, 1));
    burst(p, Math.min(28, 6 + p.impact));
    if (p.impact > 12) toast('IMPACT', 800);
    p.impact = 0;
  }
  if (p.grounded && p.airT === 0 && p._wasAir > 0.35) {
    audio.land(p._wasAir * 8);
    burst(p, 14);
  }
  p._wasAir = p.airT;
  if (p.tripped && !wasTripped) { audio.overheat(); toast('TURBINE OVERTEMP', 1600); }
  wasTripped = p.tripped;
}

function basis(v) {
  const s = Math.sin(v.yaw), c = Math.cos(v.yaw);
  _fwd.set(s, 0, -c); _right.set(c, 0, s);
}

function emitDust(v, dt) {
  if (!v.grounded || v.speed < 5) { v._acc2 = 0; return; }
  basis(v);
  const S = SURF[v.surf];
  const slip = Math.min(1, Math.abs(v.slip) / 8);
  const power = clamp(0.2 + slip * 0.6 + v.speed / 150 + (v.overdrive ? 0.2 : 0), 0, 1);
  // salt is packed and throws almost nothing; the dune field is what smokes
  const yield_ = v.surf === SALT ? 0.3 : (S.drag - 0.6);
  let rate = (10 + slip * 70 + v.speed * 0.5) * yield_;
  v._acc2 = (v._acc2 || 0) + rate * dt;
  const sign = Math.sign(v.slip) || 1;
  while (v._acc2 >= 1) {
    v._acc2 -= 1;
    _p.copy(v.pos)
      .addScaledVector(_fwd, -3.2 - Math.random() * 2)
      .addScaledVector(_right, -sign * (0.6 + Math.random() * 2.4));
    _p.y = terrain.height(_p.x, _p.z) + 0.4;
    dust.emit(_p, _fwd, _right, -sign * slip * 12, power);
  }
}

function burst(v, n) {
  basis(v);
  for (let i = 0; i < n; i++) {
    _p.copy(v.pos)
      .addScaledVector(_fwd, -1 - Math.random() * 4)
      .addScaledVector(_right, (Math.random() - 0.5) * 6);
    _p.y = terrain.height(_p.x, _p.z) + 0.5;
    dust.emit(_p, _fwd, _right, (Math.random() - 0.5) * 16, 0.9);
  }
}

function layScar(v, dt) {
  if (v._scar === undefined) v._scar = 0;
  if (!v.grounded) return;
  v._scar += v.speed * dt;
  if (v._scar < 2.2) return;
  v._scar = 0;
  const y = terrain.height(v.pos.x, v.pos.z);
  terrain.normalAt(v.pos.x, v.pos.z, _p);
  const pitch = Math.atan2(-_p.z, _p.y), roll = Math.atan2(_p.x, _p.y);
  const dark = (v.surf === SALT ? 0.10 : 0.24) + Math.min(0.3, Math.abs(v.slip) * 0.03);
  scars.lay(v.pos.x, y, v.pos.z, v.yaw, pitch, roll, 3.0 + Math.abs(v.slip) * 0.2, 4.4, dark);
}

// ------------------------------------------------------------------ camera
const _camPos = new THREE.Vector3(), _look = new THREE.Vector3();
function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function placeCamera(dt, snap) {
  const p = player;
  // Anchored on the craft in world space; the HEADING is smoothed and the
  // position is snapped onto the rig. Lerping the position instead leaves a
  // lag of speed/rate metres, which at 90 m/s doubles the chase distance.
  // the craft is ~11 m long, so 13 m of chase put the camera inside its own
  // engines; this sits it in the lower third with the horizon in shot
  const back = 26 + p.speed * 0.080;
  if (snap) state.camYaw = p.yaw;
  else state.camYaw += angleDelta(state.camYaw, p.yaw) * Math.min(1, 5.5 * dt);
  const fx = Math.sin(state.camYaw), fz = -Math.cos(state.camYaw);
  const ground = terrain.height(p.pos.x - fx * back, p.pos.z - fz * back);

  _camPos.set(p.pos.x - fx * back, 0, p.pos.z - fz * back);
  const wantY = Math.max(ground + 5.0, p.pos.y + 8.0 + p.speed * 0.020);
  if (snap) state.camY = wantY;
  else state.camY += (wantY - state.camY) * Math.min(1, 5 * dt);
  _camPos.y = state.camY;

  const ahead = 22;
  _look.set(p.pos.x + fx * ahead, p.pos.y + 2.0, p.pos.z + fz * ahead);
  camera.position.copy(_camPos);
  camera.lookAt(_look);
  // a little of the craft's own roll, so a slide leans the frame
  camera.rotateZ(clamp(-p.roll * 0.22 - p.slip * 0.004, -0.13, 0.13));

  state.shake = Math.max(0, state.shake - dt * 1.9);
  const t = state.shake * state.shake;
  if (t > 0.001) {
    camera.position.x += (Math.random() - 0.5) * t * 2.2;
    camera.position.y += (Math.random() - 0.5) * t * 1.8;
    camera.rotateZ((Math.random() - 0.5) * t * 0.06);
  }

  const wantFov = 62 + (p.overdrive ? 8 : 0) + p.speed * 0.075;
  state.fov += (wantFov - state.fov) * Math.min(1, 3.5 * dt);
  if (Math.abs(camera.fov - state.fov) > 0.02) {
    camera.fov = state.fov; camera.updateProjectionMatrix();
  }
  // keep the shadow volume on the craft or it quantises into stripes
  key.target.position.copy(p.pos);
  key.position.set(p.pos.x - SUN_DIR[0] * 220, p.pos.y - SUN_DIR[1] * 220, p.pos.z - SUN_DIR[2] * 220);
  sky.update(camera);
}

// --------------------------------------------------------------------- HUD
let hudT = 0;
function updateHud(dt) {
  if (state.toastT > 0 && (state.toastT -= dt) <= 0) hud.toast.style.display = 'none';
  const p = player;
  hud.n1bar.style.width = (p.n1 * 100).toFixed(0) + '%';
  hud.heat.style.width = (p.heat * 100).toFixed(0) + '%';
  hud.heat.style.background = p.tripped ? '#ff8a5c' : (p.heat > 0.7 ? '#ffb066' : '#8fe8d8');
  hud.dmg.style.width = (p.damage * 100).toFixed(0) + '%';
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.07;
  hud.kph.textContent = Math.round(p.kph);
  hud.n1.textContent = (p.n1 * 100).toFixed(0);
  hud.gLat.textContent = p.gLat.toFixed(2);
  hud.slip.textContent = Math.abs(p.slip).toFixed(1);
  hud.gap.textContent = clamp(p.gap, 0, 99).toFixed(1);
  hud.surf.textContent = p.grounded ? SURF[p.surf].name : 'AIRBORNE';
  hud.time.textContent = state.timer.toFixed(1);
  hud.time.style.color = state.timer < 10 ? '#ff8a5c' : '';
  hud.gate.textContent = state.gates;
  hud.rift.textContent = state.rift.toFixed(0);
  hud.pos.textContent = state.rank + '/' + field.length;
  // Bearing and range to the live gate — and, when the gate is on the canyon
  // floor and you are still up on the flats, to the BREACH instead. The walls
  // are unclimbable by design, so without this the display is telling you to
  // drive at something you cannot reach, which is how the autopilot wrecked.
  const g = route.current;
  const c = terrain.canyon(p.pos.x, p.pos.z, _cinfo);
  const inRift = c.d < 1 && c.df > 0.4;
  let tx = g.x, tz = g.z, label = g.rift ? 'RIFT GATE' : 'FLATS GATE';
  if (g.rift && !inRift) {
    const bz = terrain.nextBreach(p.pos.z);
    if (bz > g.z) { tz = bz; tx = terrain.canyonX(bz); label = 'BREACH'; }
  }
  const dx = tx - p.pos.x, dz = tz - p.pos.z;
  const rng = Math.hypot(dx, dz);
  let rel = Math.atan2(dx, -dz) - p.yaw;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  const deg = Math.round(rel * 180 / Math.PI);
  hud.compass.textContent =
    `${label}  ${Math.round(rng)}m  ` +
    (Math.abs(deg) < 4 ? 'AHEAD' : (deg > 0 ? `${deg}\u00b0 R` : `${-deg}\u00b0 L`));
  hud.compass.style.color = label === 'BREACH' ? '#ffb066'
    : (rng < RADIUS * 2.5 ? '#8fe8d8' : '');
}

// ------------------------------------------------------------ stick overlay
function drawStick(s, label, hx, hy) {
  const c = uiCtx;
  if (s.id !== -1) {
    let dx = s.x - s.x0, dy = s.y - s.y0;
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
    c.strokeStyle = 'rgba(240,230,210,0.5)';
    c.fillStyle = 'rgba(240,230,210,0.06)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(s.x0, s.y0, STICK_R, 0, 7); c.fill(); c.stroke();
    c.fillStyle = 'rgba(143,232,216,0.45)';
    c.beginPath(); c.arc(s.x0 + dx, s.y0 + dy, 24, 0, 7); c.fill();
  } else {
    c.strokeStyle = 'rgba(240,230,210,0.16)';
    c.lineWidth = 2; c.setLineDash([6, 6]);
    c.beginPath(); c.arc(hx, hy, STICK_R * 0.8, 0, 7); c.stroke();
    c.setLineDash([]);
    c.fillStyle = 'rgba(240,230,210,0.3)';
    c.font = 'bold 12px monospace'; c.textAlign = 'center';
    c.fillText(label, hx, hy + 4);
  }
}

function drawSticks() {
  uiCtx.clearRect(0, 0, ui.width, ui.height);
  if (!input.touchSeen) return;
  const s = input.sticks();
  drawStick(s.left, 'STEER / THR', ui.width * 0.17, ui.height * 0.74);
  drawStick(s.right, 'O/D', ui.width * 0.83, ui.height * 0.74);
}

// -------------------------------------------------------------------- loop
let last = performance.now();
let idleT = 0;
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.mode === 'race') step(dt);
  else if (state.mode !== 'paused') idle(dt);
  grade.uniforms.uTime.value = state.t;
  composer.render();
  drawSticks();
}

const _idle = new THREE.Vector3();
function idle(dt) {
  // a slow drift over the rift, so the menu is never a still frame
  state.t += dt;
  idleT += dt;
  const z = -400 - idleT * 26;
  const x = terrain.canyonX(z) + Math.sin(idleT * 0.22) * 70;
  terrain.update(x, z);
  route.update();
  _idle.set(x, terrain.height(x, z) + 42, z + 80);
  camera.position.lerp(_idle, Math.min(1, 1.6 * dt));
  camera.lookAt(x, terrain.height(x, z - 90) + 6, z - 90);
  dust.update(dt);
  scars.update(dt);
  key.target.position.set(x, 0, z);
  key.position.set(x - SUN_DIR[0] * 220, -SUN_DIR[1] * 220, z - SUN_DIR[2] * 220);
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
    state.mode = 'race'; hud.msg.style.display = 'none'; last = performance.now();
  }
};

hud.msg.innerHTML =
  '<b>P&nbsp;O&nbsp;W&nbsp;D&nbsp;E&nbsp;R</b>' +
  '<br><small>THE SALT IN THE RIFT IS THE FASTEST GROUND THERE IS.' +
  '<br>THE WALLS ARE SIXTY DEGREES. FIND THE BREACHES.</small>' +
  '<br><small style="opacity:.65">W THROTTLE &nbsp; A / D STEER &nbsp; S BRAKE &nbsp; SPACE OVERDRIVE' +
  '<br>TOUCH: LEFT STICK STEER + THROTTLE &nbsp;·&nbsp; RIGHT STICK OVERDRIVE</small>' +
  '<br><small style="opacity:.65">ENTER / TAP TO DROP IN</small>';
hud.cluster.style.display = 'none';
terrain.update(0, -400);
animate();

window.__pw = {
  THREE, scene, camera, renderer, composer, terrain, route, state, dust, scars,
  audio, sky, input, quality: QUALITY,
  get player() { return player; },
  get field() { return field; },
  debug: {
    start: startRace,
    over: gameOver,
    setQuality(q) { localStorage.setItem(QKEY, q); location.reload(); },
    tp(x, z) { if (player) { player.pos.set(x, terrain.height(x, z) + 4, z); player.vel.set(0, 0, 0); } },
    gate(i) { route.index = i; route._built = -1; },
  },
};
