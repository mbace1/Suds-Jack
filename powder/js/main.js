// Powder — a hover racer on an open flatland cut by a canyon.
//
// Three things define this build against the last one:
//   SIMULATION   the craft is a rigid body on four sprung hover pads with a
//                spooling turbine, run at a fixed 120 Hz. Pitch, roll, weight
//                transfer and every slide fall out of forces. See vehicle.js.
//   OPEN WORLD   no ribbon and no fall line. terrain.js is a pure height
//                function streamed as tiles, and you go where you like.
//   SURREAL      a violet sky going lilac at the horizon with a ringed body on
//                it, long raking shadows, rock that floats, a sun that blooms.
//   TWO LAYERS   v5. The WORLD is PS2: rendered at 0.62x into the composer,
//                posterised and dithered, then upscaled soft. The SHIPS and
//                their effects are HD: drawn full-resolution over the top,
//                Phong with real speculars, panel lines, layered flames,
//                sparks. The contrast is the point — a sci-fi formula car on
//                a PlayStation 2 mountain. Compositing is three passes: the
//                PS2 world; a full-res DEPTH-ONLY prepass of the opaque world
//                so the HD layer is occluded correctly; then the HD layer.
//   PS2          second pass, on the owner's direction. Not 1996 any more but
//                not 2024 either: rendered at ~0.62x and upscaled SOFT (the
//                console's blur, not the PS1's hard pixels), Lambert lighting,
//                a hard 1024 shadow map, a full-screen bloom the way ICO and
//                Shadow of the Colossus did it, and a posterise + ordered
//                dither in the grade so gradients band the way they used to.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PAL, SUN_DIR, FILL_DIR } from './palette.js?v=5';
import { Terrain, SURF, SALT, ROAD, VIEW } from './terrain.js?v=5';
import { Vehicle } from './vehicle.js?v=5';
import { DustPool, ScarField } from './dust.js?v=5';
import { Route, RADIUS } from './route.js?v=5';
import { InputManager, STICK_R } from './input.js?v=5';
import { AudioKit } from './audio.js?v=5';
import { makeSky } from './sky.js?v=5';

// Fog has to reach nearly the edge of the streamed world, not half way
// into it, or the flats read as a 300 m milk bowl instead of a plain.
const FOG_NEAR = 300, FOG_FAR = VIEW;
const START_TIME = 60, GATE_TIME = 20;
const RIVALS = 4;
const TOP_SPEED = 100;                     // m/s, for normalising the gauges
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// Render layers. 0 opaque world, 1 the HD ships and their effects, 2 the
// world's own transparencies (plume, scars), 3 the sky.
const L_WORLD = 0, L_HD = 1, L_FX = 2, L_SKY = 3;
const MASK_PS2 = (1 << L_WORLD) | (1 << L_FX) | (1 << L_SKY);
const MASK_OPAQUE = 1 << L_WORLD;
const MASK_HD = 1 << L_HD;

// Quality is a real setting, not a test hook: shadows and bloom are what a
// weak machine cannot afford, and they are exactly what this look is made of.
const QKEY = 'powderQuality';
const CKEY = 'powderChassis';
const qParam = new URLSearchParams(location.search).get('q');
let QUALITY = qParam || localStorage.getItem(QKEY) || 'high';
let CHASSIS = localStorage.getItem(CKEY) === 'rear' ? 'rear' : 'front';

// ------------------------------------------------------------------ renderer
// The PS2 scale: the framebuffer is a fraction of the window and the browser
// upscales it with plain bilinear (no image-rendering: pixelated — that is the
// other console). ~640 px across on a laptop, which is about right.
const PS2_SCALE = 0.62;
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
if (QUALITY === 'high') {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;      // hard-edged, as it was
}

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(PAL.fog, FOG_NEAR, FOG_FAR);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.5, 4000);

// Key light: low and warm, so everything standing up throws its length across
// the flats. Fill: cold and from behind — the tell that this is not Earth.
const key = new THREE.DirectionalLight(0xfff0d8, 2.3);
key.position.set(-SUN_DIR[0] * 200, -SUN_DIR[1] * 200, -SUN_DIR[2] * 200);
if (QUALITY === 'high') {
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const c = key.shadow.camera;
  c.left = -190; c.right = 190; c.top = 190; c.bottom = -190;
  c.near = 1; c.far = 900;
  key.shadow.bias = -0.0012;
  key.shadow.normalBias = 0.6;
}
// the HD ships live on their own layer, and a light only lights (and only
// takes shadow casters from) the layers it is on
key.layers.enable(L_HD);
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0x9a8ce8, 1.05);
fill.position.set(-FILL_DIR[0] * 200, -FILL_DIR[1] * 200, -FILL_DIR[2] * 200);
fill.layers.enable(L_HD);
scene.add(fill);
// generous, because the key is low and raking: without it every face
// turned from the sun crushes to black and the monoliths become holes
const hemi = new THREE.HemisphereLight(0x8a6cc0, 0xe6e2de, 0.95);
hemi.layers.enable(L_HD);
scene.add(hemi);

const sky = makeSky(scene, SUN_DIR);
const terrain = new Terrain(scene, 11);
const FOG = { color: PAL.fog, near: FOG_NEAR, far: FOG_FAR };
// the plume: soft, fogged, world-coloured, on the PS2 layer with the world
const dust = new DustPool(scene, FOG, { max: 1400, layer: L_FX });
// spindrift: the fine curtain the outside runner throws in a carve. HD, white,
// fast, barely affected by fog — the detail the PS2 layer cannot hold.
const drift = new DustPool(scene, FOG, {
  max: 900, layer: L_HD, lit: 0xffffff, shd: 0xdfe4f0, hard: false,
  size: 0.5, sizeRand: 0.7, grow: 0.9, growPow: 1.6, gravity: 7.5, drag: 1.1,
  life: 0.35, lifeRand: 0.4, lifePow: 0.3, alpha: 0.5, scale: 150, cap: 46,
  fog: 0.35, back: 2, backPow: 8, up: 2.2, upRand: 3, upPow: 5, spread: 1.6, spreadPow: 3,
});
// sparks: struck off rock and off the walls. HD, additive, hard, heavy.
const sparks = new DustPool(scene, FOG, {
  max: 500, layer: L_HD, additive: true, hard: true,
  lit: 0xffd9a0, shd: 0xff8a4a,
  size: 0.35, sizeRand: 0.5, grow: -0.25, growPow: 0, gravity: 22, drag: 0.5,
  life: 0.25, lifeRand: 0.5, lifePow: 0.2, alpha: 0.95, scale: 130, cap: 26,
  fog: 0.15, back: 5, backPow: 14, up: 2, upRand: 5, upPow: 8, spread: 5, spreadPow: 9,
});
const scars = new ScarField(scene);
scars.mesh.layers.set(L_FX);
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
    uLevels: { value: 36.0 }, uRes: { value: new THREE.Vector2(640, 400) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uAberr, uShimmer, uVig, uLevels;
    uniform vec2 uRes;
    varying vec2 vUv;
    // 4x4 Bayer: the console's dither, so the posterised gradients band the
    // way they used to instead of stepping cleanly
    float bayer(vec2 p) {
      vec2 q = floor(mod(p, 4.0));
      float i = q.x + q.y * 4.0;
      float m = 0.0;
      if (i == 0.0) m = 0.0;  else if (i == 1.0) m = 8.0;  else if (i == 2.0) m = 2.0;  else if (i == 3.0) m = 10.0;
      else if (i == 4.0) m = 12.0; else if (i == 5.0) m = 4.0;  else if (i == 6.0) m = 14.0; else if (i == 7.0) m = 6.0;
      else if (i == 8.0) m = 3.0;  else if (i == 9.0) m = 11.0; else if (i == 10.0) m = 1.0; else if (i == 11.0) m = 9.0;
      else if (i == 12.0) m = 15.0; else if (i == 13.0) m = 7.0; else if (i == 14.0) m = 13.0; else m = 5.0;
      return (m + 0.5) / 16.0 - 0.5;
    }
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
      c = floor(c * uLevels + bayer(vUv * uRes) * 0.9) / uLevels;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
let bloom = null;
if (QUALITY === 'high') {
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.7, 0.72);
  composer.addPass(bloom);
}
const grade = new ShaderPass(GradeShader);
composer.addPass(grade);
composer.addPass(new OutputPass());

// Depth-only: the HD ships have to be occluded by terrain they are behind,
// and the PS2 composer's depth is at 0.62x. One full-res opaque prepass gives
// the HD layer a depth buffer that matches it.
const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false });

const ui = document.getElementById('ui');
const uiCtx = ui.getContext('2d');

function resize() {
  const w = Math.round(innerWidth * PS2_SCALE), h = Math.round(innerHeight * PS2_SCALE);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);           // false: CSS keeps it full-window
  composer.setSize(w, h);
  grade.uniforms.uRes.value.set(w, h);
  ui.width = innerWidth; ui.height = innerHeight;
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------------- HUD
const el = id => document.getElementById(id);
const hud = {
  kph: el('kph'), n1: el('n1'), n1bar: el('n1bar'), heat: el('heat'),
  gLat: el('glat'), slip: el('slip'), gap: el('gap'), sink: el('sink'), surf: el('surf'),
  dmg: el('dmg'), time: el('time'), gate: el('gate'), rift: el('rift'),
  pos: el('pos'), msg: el('msg'), toast: el('toast'), cluster: el('cluster'),
  leanUp: el('leanUp'), leanDn: el('leanDn'), chassis: el('chassis'),
  compass: el('compass'),
};

const state = {
  mode: 'menu', timer: START_TIME, gates: 0, rift: 0, score: 0, rank: 1,
  best: Number(localStorage.getItem('powderBest') || 0),
  camYaw: 0, camY: 0, pan: 0, shake: 0, toastT: 0, fov: 62, t: 0,
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
  player = new Vehicle(terrain, { isPlayer: true, accent: PAL.accents[0], number: 1, x: sx, z: 0, drive: CHASSIS });
  field.push(player);
  for (let i = 0; i < RIVALS; i++) {
    const v = new Vehicle(terrain, {
      accent: PAL.accents[(i + 1) % PAL.accents.length],
      number: [7, 5, 3, 9][i],
      x: sx + (i - 1.5) * 13, z: 8 + (i % 2) * 9,
      drive: i % 2 ? 'rear' : 'front',
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
  drift.update(dt);
  sparks.update(dt);
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
    basis(p);
    for (let i = 0; i < Math.min(40, 10 + p.impact * 2); i++) {
      _p.copy(p.pos).addScaledVector(_right, (Math.random() - 0.5) * 4);
      _p.y = p.pos.y - 0.6;
      sparks.emit(_p, _fwd, _right, (Math.random() - 0.5) * 26, 1);
    }
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
  const yield_ = (v.surf === SALT || v.surf === ROAD) ? 0.25 : (S.drag - 0.6) + v.sink * 1.5;
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

  // SPINDRIFT: the fine curtain off the loaded outside runner. Only when the
  // sled is actually carving — this is the snowboard read, and it belongs on
  // the HD layer where it stays crisp against the dithered world.
  const carving = Math.min(1, Math.abs(v.slip) / 5) * ((v.surf === SALT || v.surf === ROAD) ? 0.25 : 1);
  if (carving > 0.12 && v.speed > 12) {
    v._acc3 = (v._acc3 || 0) + carving * (30 + v.speed * 1.4) * dt;
    while (v._acc3 >= 1) {
      v._acc3 -= 1;
      _p.copy(v.pos)
        .addScaledVector(_fwd, -1.4 - Math.random() * 2.6)
        .addScaledVector(_right, -sign * (1.1 + Math.random() * 1.4));
      _p.y = terrain.height(_p.x, _p.z) + 0.35;
      drift.emit(_p, _fwd, _right, -sign * (6 + carving * 16), carving);
    }
  }

  // SPARKS: the runners grinding rock, and every wall strike.
  if ((v.surf === 3 && Math.abs(v.slip) > 2.5 && v.speed > 10) || v.hitT > 0.3) {
    v._acc4 = (v._acc4 || 0) + (v.hitT > 0.3 ? 90 : 18 + v.speed) * dt;
    while (v._acc4 >= 1) {
      v._acc4 -= 1;
      _p.copy(v.pos)
        .addScaledVector(_fwd, -1 - Math.random() * 3)
        .addScaledVector(_right, (Math.random() - 0.5) * 3.2);
      _p.y = terrain.height(_p.x, _p.z) + 0.4;
      sparks.emit(_p, _fwd, _right, (Math.random() - 0.5) * 14, 0.8);
    }
  } else v._acc4 = 0;
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
  // the right stick pans the rig round the sled — look into the corner, or
  // back down the mountain at what you just came through
  const wantPan = (ctl.pan || 0) * 1.15;
  state.pan += (wantPan - state.pan) * Math.min(1, 6 * dt);
  const rigYaw = state.camYaw + state.pan;
  const fx = Math.sin(rigYaw), fz = -Math.cos(rigYaw);
  const ground = terrain.height(p.pos.x - fx * back, p.pos.z - fz * back);

  _camPos.set(p.pos.x - fx * back, 0, p.pos.z - fz * back);
  // lean back and the camera drops and sits closer, so the nose lifting reads
  const wantY = Math.max(ground + 5.0, p.pos.y + 8.0 + p.speed * 0.020 - p.lean * 1.6);
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
  // the weight axis, read as two bars either side of a centre line
  hud.leanUp.style.height = (Math.max(0, p.lean) * 100).toFixed(0) + '%';
  hud.leanDn.style.height = (Math.max(0, -p.lean) * 100).toFixed(0) + '%';
  hudT -= dt;
  if (hudT > 0) return;
  hudT = 0.07;
  hud.kph.textContent = Math.round(p.kph);
  hud.n1.textContent = (p.n1 * 100).toFixed(0);
  hud.gLat.textContent = p.gLat.toFixed(2);
  hud.slip.textContent = Math.abs(p.slip).toFixed(1);
  hud.gap.textContent = clamp(p.gap, 0, 99).toFixed(1);
  hud.sink.textContent = (p.sink * 100).toFixed(0);
  hud.surf.textContent = !p.grounded ? 'AIRBORNE' : (p.onDeck ? 'BRIDGE' : SURF[p.surf].name);
  hud.chassis.textContent = p.drive === 'front' ? 'NOSE' : 'AFT';
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
  // Either way across the rim — into the rift for a rift gate, OUT of it for
  // a flats gate — the way is a breach, and the display has to say so. The
  // first version only covered the way in, and the autopilot wedged itself
  // against the far wall trying to climb out to a flats gate.
  if (g.rift !== inRift) {
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

// ------------------------------------------------------------- compositing
/**
 * Three passes. The PS2 world through the composer at 0.62x, upscaled soft by
 * the composer's own blit to the full-resolution canvas. Then a full-res
 * DEPTH-ONLY pass of the opaque world, because the composer's depth is at
 * 0.62x and the HD layer needs a depth buffer that matches it. Then the HD
 * layer — ships, flames, sparks, spindrift — over the top, crisp.
 */
function renderFrame() {
  camera.layers.mask = MASK_PS2;
  composer.render();

  renderer.autoClear = false;
  renderer.clearDepth();
  camera.layers.mask = MASK_OPAQUE;
  scene.overrideMaterial = depthOnly;
  renderer.render(scene, camera);
  scene.overrideMaterial = null;

  camera.layers.mask = MASK_HD;
  renderer.render(scene, camera);
  renderer.autoClear = true;
  camera.layers.mask = MASK_PS2 | MASK_HD;
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
  renderFrame();
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
  drift.update(dt);
  sparks.update(dt);
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
input.onSwap = () => {
  if (state.mode === 'race') return;      // the sled you are on is the sled you race
  CHASSIS = CHASSIS === 'front' ? 'rear' : 'front';
  localStorage.setItem(CKEY, CHASSIS);
  showMenu();
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

/** The menu names the chassis you are about to race, because the two do not
 *  drive the same and the difference is the point of having both. */
function showMenu() {
  hud.msg.innerHTML =
    '<img class="logo" src="logo.png" alt="POWDER">' +
    '<br><small>' + (CHASSIS === 'front'
      ? 'NOSE ROCKETS &nbsp;·&nbsp; power pulls you through the corner; lift off and the tail comes round.'
      : 'AFT ROCKETS &nbsp;·&nbsp; sharper turn-in, but power mid-corner steps the tail out.') +
    ' &nbsp; <b style="color:#8fe8d8">F</b> TO SWAP</small>' +
    '<br><small>LEFT STICK STEERS AND WORKS THE THROTTLE.' +
    '<br>RIGHT STICK IS YOUR WEIGHT — <b style="color:#8fe8d8">BACK</b> TO BOOST AND LIFT THE NOSE,' +
    ' <b style="color:#ffb066">FORWARD</b> TO PRESS IT DOWN.' +
    '<br>LEFT AND RIGHT PAN THE CAMERA.</small>' +
    '<br><small style="opacity:.65">W THROTTLE &nbsp; A / D STEER &nbsp; S BRAKE &nbsp; SPACE BOOST' +
    '<br>&uarr; SPOILER &nbsp; &larr; &rarr; PAN &nbsp; F CHASSIS</small>' +
    '<br><small style="opacity:.65">ENTER / TAP TO DROP IN</small>';
  hud.msg.style.display = '';
}
showMenu();
hud.cluster.style.display = 'none';
terrain.update(0, -400);
animate();

window.__pw = {
  THREE, scene, camera, renderer, composer, terrain, route, state, dust, scars,
  audio, sky, input, drift, sparks, quality: QUALITY,
  get chassis() { return CHASSIS; },
  get player() { return player; },
  get field() { return field; },
  debug: {
    start: startRace,
    over: gameOver,
    setQuality(q) { localStorage.setItem(QKEY, q); location.reload(); },
    tp(x, z) { if (player) { player.pos.set(x, terrain.height(x, z) + 4, z); player.vel.set(0, 0, 0); } },
    gate(i) { route.index = i; route._built = -1; },
    chassis(d) { CHASSIS = d === 'rear' ? 'rear' : 'front'; localStorage.setItem(CKEY, CHASSIS); showMenu(); },
  },
};
