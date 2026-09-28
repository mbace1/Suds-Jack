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
//   LAYERS       v5, made honest in v7. The WORLD is PS2: rendered at 0.62x
//                into the composer, posterised and dithered, then BLITTED up
//                soft into a full-resolution canvas. The SHIPS and their
//                effects are HD: drawn at full resolution over the top —
//                chrome that reflects the sky, panel lines, layered flames,
//                sparks. (Until v7 the canvas itself was 0.62x, so "HD" was
//                only "not dithered"; the docs said full-res and the code
//                did not.) Over THAT sit two screen-space layers: the heat
//                HAZE, which copies the finished frame and bends it behind
//                the exhaust and along the horizon, and the sun's lens
//                FLARE. Five passes: PS2 world; blit; full-res DEPTH-ONLY
//                prepass of the opaque world so the HD layer is occluded;
//                the HD layer; the haze.
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
import { PAL, SUN_DIR, FILL_DIR } from './palette.js?v=11';
import { Terrain, SURF, SALT, ROAD, VIEW } from './terrain.js?v=11';
import { Vehicle } from './vehicle.js?v=11';
import { DustPool, ScarField } from './dust.js?v=11';
import { StreakPool } from './streaks.js?v=11';
import { TrenchField } from './trench.js?v=11';
import { Route, RADIUS } from './route.js?v=11';
import { InputManager, STICK_R } from './input.js?v=11';
import { AudioKit } from './audio.js?v=11';
import { makeSky } from './sky.js?v=12';
import { makeEnvMap, L_CAST } from './craft.js?v=11';
import { HeatHaze } from './haze.js?v=11';
import { makeFlare } from './flare.js?v=11';
import { preloadModels, models } from './models.js?v=11';

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
// v11: L_CAST (craft.js) is the ships' SHADOW STAND-INS. three draws a
// shadow map with the layers of the camera it is rendering for, so the PS2
// pass — the one that draws the sand — never saw the HD ships, and no ship
// ever threw a shadow on the ground: the plates' strongest cue. The PS2
// pass draws the stand-ins with no colour and no depth writes, and they
// cast. The depth prepass must never see them: it would punch their boxes
// out of the HD ship.
const MASK_PS2 = (1 << L_WORLD) | (1 << L_FX) | (1 << L_SKY) | (1 << L_CAST);
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
// antialiasing is one of the things `quality` is for (CLAUDE.md), and with a
// full-res canvas the HD ships are what it smooths
const renderer = new THREE.WebGLRenderer({ canvas, antialias: QUALITY === 'high' });
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
// v11: the SHIP light — HD layer only, so the world never sees it. The sun
// is low and the route runs toward it, so from the chase seat every car is
// backlit and its tail, the part you look at all race, sat in shade. The
// plates light their craft like a studio does (the hull reads cream with
// the sun behind it), and this is that: a soft key from over the camera's
// shoulder, placed every frame by placeCamera.
const shipLight = new THREE.DirectionalLight(0xfff1e2, 1.25);
shipLight.layers.set(L_HD);
scene.add(shipLight, shipLight.target);

const sky = makeSky(scene, SUN_DIR);
const terrain = new Terrain(scene, 11);
const FOG = { color: PAL.fog, near: FOG_NEAR, far: FOG_FAR };
// the plume: soft, fogged, world-coloured, on the PS2 layer with the world
// v11: thinner and smaller than it was — at the low formula seat the old
// plume wrapped the lens in white, and the spray streaks carry the sand now
const dust = new DustPool(scene, FOG, { max: 1400, layer: L_FX, alpha: 0.30, size: 1.1, sizeRand: 1.6, grow: 1.6, growPow: 3.5, cap: 80, near: 5 });
// v11: SPRAY — the sand a carving edge throws, and the rooster tail off the
// rear pods at speed. Streaks, not discs (streaks.js says why): HD, so each
// grain stays crisp against the dithered world. It replaces v5's spindrift,
// which was keyed to SLIP — so a clean carve, the thing you are trying to
// do, threw nothing at all, and only a mistake made it snow.
// Short streaks (22 ms of motion, a tenth of the frame at most): at 45 ms
// the sheet read as a porcupine of white sticks round the car.
const spray = new StreakPool(scene, FOG, { max: 2600, layer: L_HD, blur: 0.022, maxLen: 0.10, maxW: 0.010, near: 2.0, gravity: 11, drag: 1.2, fog: 0.5 });
// AIR — grains hanging in the air, streaked by your own speed. Additive and
// faint; they only appear past ~80 km/h, and they are the thing nearest the
// lens that moves, which is most of what makes speed read as speed.
const air = new StreakPool(scene, FOG, { max: 320, layer: L_HD, additive: true, blur: 0.05, maxLen: 0.25, maxW: 0.006, near: 3.0, gravity: 0, drag: 0, fog: 0.8 });
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
// v11: the grooves the pods cut in soft sand — a trail map the ground shader
// reads (trench.js); the scars stay for the hard ground, where a pod
// polishes rather than cuts
const trenches = new TrenchField(renderer, terrain, QUALITY === 'high' ? 1024 : 512);
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

// v11 hotfix: SANITISE before bloom. The world renders into a half-float target,
// which holds NaN and Infinity, and bloom blurs every pixel into every
// other through its mips — so ONE non-finite pixel anywhere in the scene
// becomes the whole frame (black on a desktop GPU, WHITE on a phone's).
// That was the v11 phone report: the race running, the view blank white,
// traced to one pow() in the planet's limb. The pow is fixed at the site;
// this is so the next stray NaN costs a pixel, not the picture. Written as
// comparisons, which are false for NaN, rather than isnan(), which a
// fast-math driver may fold away.
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    float ok(float x) { return (x > -1.0 && x < 64.0) ? max(x, 0.0) : (x >= 64.0 ? 64.0 : 0.0); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(ok(c.r), ok(c.g), ok(c.b), 1.0);
    }`,
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new ShaderPass(SanitizeShader));
let bloom = null;
if (QUALITY === 'high') {
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.7, 0.72);
  composer.addPass(bloom);
}
const grade = new ShaderPass(GradeShader);
composer.addPass(grade);
composer.addPass(new OutputPass());
// The composer renders into its own 0.62x buffer and the result is BLITTED
// to the full-res canvas with a raw shader: the OutputPass has already tone
// mapped and encoded it, so the blit must not touch the colour again (a
// MeshBasic quad would encode it twice and wash the world out). The
// bilinear stretch IS the PS2's soft upscale.
composer.renderToScreen = false;
const blitMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }`,
  depthTest: false, depthWrite: false,
});
const blitScene = new THREE.Scene();
const blitQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat);
blitQuad.frustumCulled = false;
blitScene.add(blitQuad);
const blitCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// the screen-space layers over the HD ships
const haze = new HeatHaze();
const flare = makeFlare(scene, sky.toSun);
// chrome needs a world to reflect — built once, shared by every ship
const ENV = makeEnvMap(renderer);

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
  renderer.setSize(innerWidth, innerHeight, false);   // the canvas is full-res
  composer.setSize(w, h);                             // the PS2 world is not
  grade.uniforms.uRes.value.set(w, h);
  haze.resize(innerWidth, innerHeight);
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
  // v11: which chase seat — 0 the low formula seat, 1 the old high one
  cam: Number(localStorage.getItem('powderCam') || 0) === 1 ? 1 : 0,
  camBack: 10, camRoll: 0, buffet: 0,
};

let player = null, field = [];
const ctl = { steer: 0, throttle: 0, brake: false, overdrive: false };
const aiCtl = { steer: 0, throttle: 1, brake: false, overdrive: false };

function startRace() {
  for (const c of field) c.dispose();
  spray.clear(); air.clear(); trenches.clear();
  field = [];
  route.index = 0; route._built = -1;
  // start out on the flats beside the rim, not down in the rift — the first
  // gate is deep in the canyon and the breach between here and there is the
  // opening move of a run
  const sx = terrain.canyonX(0) + 95;
  player = new Vehicle(terrain, { isPlayer: true, accent: PAL.accents[0], number: 1, x: sx, z: 0, drive: CHASSIS, env: ENV });
  field.push(player);
  for (let i = 0; i < RIVALS; i++) {
    const v = new Vehicle(terrain, {
      accent: PAL.accents[(i + 1) % PAL.accents.length],
      number: [7, 5, 3, 9][i],
      x: sx + (i - 1.5) * 13, z: 8 + (i % 2) * 9,
      drive: i % 2 ? 'rear' : 'front', env: ENV,
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
    `<img class="plate" src="art/${reason === 'TIME OUT' ? 'delta' : 'intake-green'}.jpg" alt="">` +
    `<br><b>${reason}</b><br><small>${state.gates} GATES &nbsp;·&nbsp; ` +
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
  for (const v of field) { emitDust(v, dt); emitWash(v, dt); emitHaze(v, dt); layScar(v, dt); }
  dust.update(dt);
  sparks.update(dt);
  haze.update(dt);
  scars.update(dt);
  trenches.update(player.pos.x, player.pos.z);
  emitAir(dt);
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
  // the streaks are drawn relative to the camera, so they update after it
  spray.update(dt, camera, player.vel);
  air.update(dt, camera, player.vel);
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
  let rate = (6 + slip * 40 + v.speed * 0.3) * yield_;
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

  emitSpray(v, dt);

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

/**
 * v11: the SPRAY. Driven by the EDGE and by burial, never by slip alone —
 * Flowsnow's rule, and the one that makes a clean carve throw sand:
 *   edge   up on the edge into a turn, the inside pods (the low side) cut,
 *          and fling a wall of sand OUT of the turn, up and back
 *   skid   sliding, the leading pods shove sand the way you are sliding
 *   tail   planing fast over soft ground, the rear pods throw a rooster tail
 * Soft ground throws; salt and the crossings barely do.
 */
const _sand = new THREE.Color(PAL.dust), _sandShd = new THREE.Color(PAL.dustShd), _sc = new THREE.Color();
function emitSpray(v, dt) {
  const soft = (v.surf === SALT || v.surf === ROAD) ? 0.12 : v.surf === 3 ? 0.05 : 1;
  const sp = v.speed;
  const skid = Math.min(1, Math.abs(v.slip) / 6);
  const edgeI = Math.min(1, sp / 20) * v.edge * 1.25;
  const skidI = Math.min(1, sp / 16) * skid * 1.5;
  const tailI = v.plane * Math.min(1, Math.max(0, (sp - 18) / 30)) * 0.5;
  const I = (edgeI + skidI + tailI) * soft;
  if (I < 0.03) { v._acc3 = 0; return; }
  // far away it is sub-pixel: spend the pool on what the camera can see
  const d2 = camera.position.distanceToSquared(v.pos);
  if (d2 > 160 * 160) return;
  const near = v.isPlayer ? 1 : (d2 < 60 * 60 ? 0.6 : 0.3);
  v._acc3 = (v._acc3 || 0) + I * 900 * near * dt;
  if (v._acc3 < 1) return;
  basis(v);
  // roll > 0 is right-side-down: into a right-hand carve, so the OUTSIDE of
  // the turn is on the left. Pads: 0 front-left, 1 front-right, 2 rear-left,
  // 3 rear-right.
  const out = -(Math.sign(v.roll) || 1);
  const slipS = Math.sign(v.slip) || 1;
  const pads = v.pads;
  while (v._acc3 >= 1) {
    v._acc3 -= 1;
    const r = Math.random() * (edgeI + skidI + tailI);
    let padI, ox, oy, ob, lat;                               // outward, up, back (m/s); spawn offset out (m)
    if (r < edgeI) {
      // the edge: the sheet leaves the OUTSIDE of the car, the way a board's
      // spray fans out of a carve — mostly off the loaded outside pods, some
      // out from under the belly off the inside edge that is dug in
      const outside = Math.random() < 0.72;
      const right = (out > 0) === outside;
      padI = right ? (Math.random() < 0.62 ? 3 : 1) : (Math.random() < 0.62 ? 2 : 0);
      ox = out * (5 + Math.random() * 11); oy = 1.5 + Math.random() * Math.random() * 7; ob = 1 + Math.random() * 5;
      lat = out * (0.35 + Math.random() * 0.4);
    } else if (r < edgeI + skidI) {      // the skid: shoved the way you slide
      padI = slipS > 0 ? (Math.random() < 0.5 ? 1 : 3) : (Math.random() < 0.5 ? 0 : 2);
      ox = slipS * (4 + Math.random() * 8); oy = 1.5 + Math.random() * 4; ob = 1 + Math.random() * 3;
      lat = slipS * 0.3;
    } else {                             // the rooster tail off the rear pods: low, and left behind
      padI = Math.random() < 0.5 ? 2 : 3;
      ox = (Math.random() - 0.5) * 2.5; oy = 1 + Math.random() * 3.5; ob = 3 + Math.random() * 6;
      lat = 0;
    }
    const pad = pads[padI];
    const gx = pad.wx + _right.x * lat + (Math.random() - 0.5) * 0.5 - _fwd.x * Math.random() * 0.8;
    const gz = pad.wz + _right.z * lat + (Math.random() - 0.5) * 0.5 - _fwd.z * Math.random() * 0.8;
    const gy = terrain.height(gx, gz) + 0.08;
    // thrown with the pod: it keeps most of the sled's speed for its short
    // life, so the sheet hangs beside the car instead of streaming at the lens
    const vx = v.vel.x * 0.72 + _right.x * ox - _fwd.x * ob;
    const vz = v.vel.z * 0.72 + _right.z * ox - _fwd.z * ob;
    _sc.copy(_sand).lerp(_sandShd, Math.random() * 0.7);
    // mostly fine grains, now and then a clump — one size of everything is
    // what made the first cut read as hatching
    const clump = Math.random() < 0.08;
    spray.emit(gx, gy, gz, vx, oy, vz, clump ? 0.05 + Math.random() * 0.05 : 0.014 + Math.random() * 0.026,
      0.3 + Math.random() * 0.45, _sc, clump ? 0.4 : 0.45 + Math.random() * 0.4);
  }
}

/** v11: AIR — grains hanging in the air ahead, streaked by your own speed. */
const _airCol = new THREE.Color(1.0, 0.94, 0.88);
function emitAir(dt) {
  const p = player, sp = p.speed;
  const k = clamp((sp - 22) / 40, 0, 1);
  if (k <= 0) return;
  p._accAir = (p._accAir || 0) + (40 + sp * 3) * k * dt;
  basis(p);
  while (p._accAir >= 1) {
    p._accAir -= 1;
    const ahead = 18 + Math.random() * 70, side = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 22);
    const x = p.pos.x + _fwd.x * ahead + _right.x * side, z = p.pos.z + _fwd.z * ahead + _right.z * side;
    // below the lens, so every grain is seen against the sand: up in the
    // sky they read as scratches on the picture
    const y = terrain.height(x, z) + 0.2 + Math.random() * Math.random() * 1.9;
    air.emit(x, y, z, 0, 0, 0, 0.018 + Math.random() * 0.03, ahead / sp + 0.6, _airCol, (0.10 + Math.random() * 0.14) * k, 0);
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

/**
 * ROCKET WASH: what the turbine does to the ground under the nozzles, which
 * is the part of "engine rpm" you can see. The plume off the skirts needs
 * speed; this needs only N1, so revving on the spot on sand throws a cloud
 * behind the cans — behind the NOSE on the front sled, behind the tail on
 * the aft one — and a spooling-up sled leaves in its own dust.
 */
const _n = new THREE.Vector3(), _hv = new THREE.Vector3();
function emitWash(v, dt) {
  if (!v.grounded) { v._acc5 = 0; return; }
  const S = SURF[v.surf];
  const yield_ = (v.surf === SALT || v.surf === ROAD) ? 0.12 : (S.drag - 0.6) + v.sink * 1.5;
  const th = v.n1 * v.n1 * (v.overdrive ? 1.7 : 1);
  // strongest when the sled is slow: at speed the plume already owns it
  const rate = th * 70 * yield_ * clamp(1.3 - v.speed / 40, 0.35, 1);
  v._acc5 = (v._acc5 || 0) + rate * dt;
  if (v._acc5 < 1) return;
  basis(v);
  while (v._acc5 >= 1) {
    v._acc5 -= 1;
    v.nozzle(Math.random() < 0.5 ? 0 : 1, _p);
    _p.addScaledVector(_fwd, -1.5 - Math.random() * 2);
    _p.y = terrain.height(_p.x, _p.z) + 0.4;
    dust.emit(_p, _fwd, _right, (Math.random() - 0.5) * 6, 0.35 + th * 0.5);
  }
}

/** The exhaust: hot air out of each bell, refracting whatever is behind it. */
function emitHaze(v, dt) {
  const th = v.n1 * v.n1 * (v.overdrive ? 1.6 : 1);
  const d2 = camera.position.distanceToSquared(v.pos);
  if (d2 > 220 * 220) { v._acc6 = 0; return; }        // sub-pixel from there on
  v._acc6 = (v._acc6 || 0) + (18 + th * 100) * dt;
  if (v._acc6 < 1) return;
  basis(v);
  const U = v.mesh.userData;
  while (v._acc6 >= 1) {
    v._acc6 -= 1;
    const i = Math.random() < 0.5 ? 0 : 1;
    v.nozzle(i, _n);
    // v11: it shows from the TAIL back. The chase camera looks down the
    // exhaust, so every sprite between the lens and the car refracts the
    // car — on the NOSE chassis, whose bells sit mid-ship, the rear wing and
    // pods came out melted. The heat is still there; it just is not drawn
    // over the thing you are steering.
    const toTail = Math.max(0, 4.4 - U.nozzles[i].z);
    _n.addScaledVector(_fwd, -0.4 - toTail - Math.random() * 1.2);
    // it leaves with the exhaust and is left behind by the sled
    _hv.copy(v.vel).multiplyScalar(0.55).addScaledVector(_fwd, -(4 + th * 14));
    _hv.y += 0.5;
    const own = v.isPlayer ? 0.55 : 1;
    haze.emit(_n, _hv, (2.2 + th * 2.6) * (v.isPlayer ? 0.75 : 1), (0.4 + th * 0.55) * own);
  }
}

function layScar(v, dt) {
  if (v._scar === undefined) v._scar = 0;
  const soft = v.surf === 1 || v.surf === 2;           // DUNE, GRAVEL
  // v11: on soft ground every pod cuts a groove, as deep as it sank — in a
  // clean carve the rear pods run in the front pods' line (a little inside
  // it, the way any car off-tracks), and in a slide they cut their own
  for (let pi = 0; pi < 4; pi++) {
    const pad = v.pads[pi];
    if (!pad.touch || !soft || v.onDeck) { trenches.lift(v, pi); continue; }
    const depth = clamp(pad.sink / 0.2, 0.35, 1) * (v.surf === 1 ? 1 : 0.6) * (pi < 2 ? 0.85 : 1);
    const w = Math.min(0.8, 0.3 + Math.abs(v.slip) * 0.03);
    trenches.lay(v, pi, pad.wx, pad.wz, w, depth);
  }
  if (!v.grounded || soft) return;
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

/**
 * The chase camera. v11, on the owner's direction ("a lower camera, a wider
 * field of view as speed rises"): the default seat is a FORMULA seat — low,
 * close, the car filling the lower third — because 160 km/h seen from 30 m
 * up and 30 m back is a model railway. Measured before: the car was ~35 px
 * across a 1280 px frame and nothing near the lens moved. The old high seat
 * is still there (C on the keyboard, RB on a pad) for anyone who wants the
 * whole field.
 */
const SEATS = [
  //   back  +/speed  up    +/speed  ahead lookUp  fov  fov/speed  roll
  { back: 8.6, backV: 0.030, up: 2.35, upV: 0.006, ahead: 16, lookUp: 0.9, fov: 60, fovV: 0.30, roll: 0.55 },
  { back: 26, backV: 0.080, up: 8.0, upV: 0.020, ahead: 22, lookUp: 2.0, fov: 62, fovV: 0.075, roll: 0.22 },
];
function placeCamera(dt, snap) {
  const p = player, S = SEATS[state.cam];
  // Anchored on the craft in world space; the HEADING is smoothed and the
  // position is snapped onto the rig. Lerping the position instead leaves a
  // lag of speed/rate metres, which at 90 m/s doubles the chase distance.
  // The distance breathes with speed, and backs off as the car sinks — a car
  // bogged in deep sand fills the lens with its own plume (Flowsnow's
  // camera does the same, for the same reason)
  const wantBack = S.back + p.speed * S.backV + p.sink * 3.0;
  state.camBack += (wantBack - state.camBack) * (snap ? 1 : Math.min(1, 2.5 * dt));
  const back = state.camBack;
  // In a slide the camera splits the difference between where the nose
  // points and where the sled is actually travelling. Locked to the nose,
  // a 15 m/s slide swung the whole world round while the sled sat still in
  // the frame — it read as the camera losing it, not the driver. Half way
  // to the travel heading, the sled slides ACROSS the frame: the snowboard.
  const vF = p.vel.x * Math.sin(p.yaw) - p.vel.z * Math.cos(p.yaw);
  const travel = p.speed > 6 ? clamp(Math.atan2(p.slip, Math.max(2, vF)), -0.7, 0.7) : 0;
  const wantYaw = p.yaw + travel * 0.5;
  if (snap) state.camYaw = wantYaw;
  else state.camYaw += angleDelta(state.camYaw, wantYaw) * Math.min(1, 5.5 * dt);
  // the right stick pans the rig round the sled — look into the corner, or
  // back down the mountain at what you just came through
  const wantPan = (ctl.pan || 0) * 1.15;
  state.pan += (wantPan - state.pan) * Math.min(1, 6 * dt);
  const rigYaw = state.camYaw + state.pan;
  const fx = Math.sin(rigYaw), fz = -Math.cos(rigYaw);
  const cx = p.pos.x - fx * back, cz = p.pos.z - fz * back;
  const ground = terrain.height(cx, cz);

  _camPos.set(cx, 0, cz);
  // lean back and the camera drops and sits closer, so the nose lifting reads
  const wantY = Math.max(ground + 1.4, p.pos.y + S.up + p.speed * S.upV - p.lean * 0.6 + p.sink * 1.2);
  if (snap) state.camY = wantY;
  else state.camY += (wantY - state.camY) * Math.min(1, 6 * dt);
  _camPos.y = state.camY;

  _look.set(p.pos.x + fx * S.ahead, p.pos.y + S.lookUp, p.pos.z + fz * S.ahead);
  camera.position.copy(_camPos);
  camera.lookAt(_look);
  // The frame banks INTO the carve with the car — the board up on its edge,
  // the horizon tipping with it — rather than rolling out of it like a car's
  // camera. p.roll > 0 is right-side-down, and a negative rotateZ tips the
  // view right.
  const wantRoll = clamp(-p.roll * S.roll - p.slip * 0.003, -0.2, 0.2);
  state.camRoll += (wantRoll - state.camRoll) * (snap ? 1 : Math.min(1, 7 * dt));
  camera.rotateZ(state.camRoll);

  // strikes shake it; SPEED buffets it — a fine, fast tremble that grows
  // with the square of speed and with how soft the ground is, so 250 km/h
  // over sand feels like 250 km/h over sand
  state.shake = Math.max(0, state.shake - dt * 1.9);
  const t = state.shake * state.shake;
  const soft = p.grounded ? (p.surf === SALT || p.surf === ROAD ? 0.35 : 1) : 0.15;
  const wantBuffet = clamp((p.speed - 25) / 55, 0, 1) ** 2 * soft;
  state.buffet += (wantBuffet - state.buffet) * Math.min(1, 3 * dt);
  const b = state.buffet * (state.cam === 0 ? 1 : 0.4);
  if (t > 0.001 || b > 0.001) {
    const ph = state.t * 47;
    camera.position.x += (Math.random() - 0.5) * t * 2.2 + Math.sin(ph) * b * 0.035;
    camera.position.y += (Math.random() - 0.5) * t * 1.8 + Math.sin(ph * 1.37 + 1.1) * b * 0.045;
    camera.rotateZ((Math.random() - 0.5) * t * 0.06 + Math.sin(ph * 0.83) * b * 0.004);
  }

  // the field of view opens with speed: the tunnel of a fast car
  const wantFov = clamp(S.fov + (p.overdrive ? 7 : 0) + Math.max(0, p.speed - 8) * S.fovV, S.fov, 88);
  state.fov += (wantFov - state.fov) * Math.min(1, 3.5 * dt);
  if (Math.abs(camera.fov - state.fov) > 0.02) {
    camera.fov = state.fov; camera.updateProjectionMatrix();
  }
  // over the camera's shoulder, onto the car
  shipLight.position.copy(camera.position).addScaledVector(camera.up, 5);
  shipLight.target.position.copy(p.pos);
  // keep the shadow volume on the craft or it quantises into stripes
  key.target.position.copy(p.pos);
  key.position.set(p.pos.x - SUN_DIR[0] * 220, p.pos.y - SUN_DIR[1] * 220, p.pos.z - SUN_DIR[2] * 220);
  sky.update(camera);
  flare.update(camera);
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
  // SLIP carries the grip state in its colour: `bite` is how much of the
  // rudder the runners can still deliver, so amber is the sled asking for
  // less lock and red is a committed slide. Without it the driver has no way
  // to tell "turning" from "sliding" until the scenery says so.
  hud.slip.textContent = Math.abs(p.slip).toFixed(1);
  hud.slip.style.color = p.bite < 0.45 ? '#ff8a5c' : (p.bite < 0.72 ? '#ffb066' : '');
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
    // the knob follows the SAME square gate input.js reads (see _def there),
    // so it never shows a thumb stopping short of where the game hears it —
    // and a square base says the corners, full lock at full power, are there
    const dx = Math.max(-STICK_R, Math.min(STICK_R, s.x - s.x0));
    const dy = Math.max(-STICK_R, Math.min(STICK_R, s.y - s.y0));
    c.strokeStyle = 'rgba(240,230,210,0.5)';
    c.fillStyle = 'rgba(240,230,210,0.06)';
    c.lineWidth = 2;
    c.beginPath(); c.roundRect(s.x0 - STICK_R, s.y0 - STICK_R, STICK_R * 2, STICK_R * 2, 18); c.fill(); c.stroke();
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
  if (!input.touchSeen || input.gamepad) return;
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
const _hidden = [];
function renderFrame() {
  camera.layers.mask = MASK_PS2;
  composer.render();
  // the PS2 world up onto the full-res canvas
  renderer.setRenderTarget(null);
  blitMat.uniforms.tDiffuse.value = composer.readBuffer.texture;
  renderer.render(blitScene, blitCam);

  // The prepass exists ONLY to occlude the HD ships, and a thing can only
  // occlude what is behind it — so nothing farther away than the farthest
  // ship can matter. Culling the prepass to that range drops most of the
  // streamed world out of it; measured, it was re-rendering all 121 tiles at
  // full resolution every frame for no visible effect. The projection must
  // stay identical to the HD pass or the depth values are not comparable,
  // which is why this culls by visibility rather than by moving the far plane.
  let range = 150;
  for (let i = 0; i < field.length; i++) {
    range = Math.max(range, camera.position.distanceTo(field[i].pos) + 40);
  }
  _hidden.length = 0;
  for (const t of terrain.tiles.values()) {
    const bs = t.mesh.geometry.boundingSphere;
    if (!bs) continue;
    if (camera.position.distanceTo(bs.center) - bs.radius > range) {
      t.mesh.visible = false; t.props.visible = false; _hidden.push(t);
    }
  }

  renderer.autoClear = false;
  renderer.clearDepth();
  camera.layers.mask = MASK_OPAQUE;
  scene.overrideMaterial = depthOnly;
  renderer.render(scene, camera);
  scene.overrideMaterial = null;
  for (let i = 0; i < _hidden.length; i++) {
    _hidden[i].mesh.visible = true; _hidden[i].props.visible = true;
  }

  camera.layers.mask = MASK_HD;
  renderer.render(scene, camera);
  // and the air over all of it: copies the frame, bends it behind the
  // exhaust and along the horizon. Stronger on the salt, where it is hottest.
  // (a full-res frame copy every frame: the one thing here q=low skips)
  if (QUALITY === 'high') haze.render(renderer, camera, player && player.surf === SALT ? 1.4 : 1);
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
  input.pollGamepad();          // feeds the same control struct as keys/touch
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
  sparks.update(dt);
  scars.update(dt);
  spray.update(dt, camera, null);
  air.update(dt, camera, null);
  key.target.position.set(x, 0, z);
  key.position.set(x - SUN_DIR[0] * 220, -SUN_DIR[1] * 220, z - SUN_DIR[2] * 220);
  sky.update(camera);
  flare.update(camera);
  haze.update(dt);
}

// -------------------------------------------------------------------- boot
input.onStart = () => {
  audio.ensure();
  if (state.mode === 'paused') {
    state.mode = 'race'; hud.msg.style.display = 'none'; last = performance.now();
  } else if (state.mode !== 'race') startRace();
};
input.onSwap = () => {
  // the sled you are on is the sled you race — paused included, or the
  // pause overlay became a menu offering a chassis the run would not honour
  if (state.mode === 'race' || state.mode === 'paused') return;
  CHASSIS = CHASSIS === 'front' ? 'rear' : 'front';
  localStorage.setItem(CKEY, CHASSIS);
  showMenu();
};
input.onCam = () => {
  state.cam = state.cam ? 0 : 1;
  localStorage.setItem('powderCam', String(state.cam));
  toast(state.cam ? 'CAMERA: HIGH' : 'CAMERA: LOW', 900);
};
// and for a thumb: every touchstart is cancelled for the sticks, which kills
// the synthesised click, so the chip answers touchend and pointerup (once)
{
  const cam = el('cam');
  let camT = 0;
  const tap = e => {
    e.preventDefault();
    const now = performance.now();
    if (now - camT < 350) return;
    camT = now;
    input.onCam();
  };
  cam.addEventListener('touchend', tap, { passive: false });
  cam.addEventListener('pointerup', tap);
}
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
    // the concept plate for the chassis you are about to race
    `<img class="plate" src="art/${CHASSIS === 'front' ? 'nose-green' : 'aft-five'}.jpg" alt="">` +
    '<br><small>' + (CHASSIS === 'front'
      ? 'NOSE ROCKETS &nbsp;·&nbsp; power pulls you through the corner; lift off and the tail comes round.'
      : 'AFT ROCKETS &nbsp;·&nbsp; sharper turn-in, but power mid-corner steps the tail out.') +
    '<br><b style="color:#8fe8d8;font-size:1.4em">F</b> TO SWAP</small>' +
    '<br><small>LEFT STICK STEERS AND WORKS THE THROTTLE.' +
    '<br>RIGHT STICK IS YOUR WEIGHT — <b style="color:#8fe8d8">BACK</b> TO BOOST AND LIFT THE NOSE,' +
    ' <b style="color:#ffb066">FORWARD</b> TO PRESS IT DOWN.' +
    '<br>LEFT AND RIGHT PAN THE CAMERA.</small>' +
    '<br><small style="opacity:.65">W / &uarr; THROTTLE &nbsp; A D / &larr; &rarr; STEER &nbsp; S / &darr; BRAKE' +
    '<br>SPACE BOOST &nbsp; SHIFT SPOILER &nbsp; Q E PAN &nbsp; C CAMERA &nbsp; F CHASSIS' +
    '<br>GAMEPAD: STICKS AS ABOVE &nbsp;·&nbsp; RT / LT &nbsp;·&nbsp; RB CAMERA &nbsp;·&nbsp; A START &nbsp;·&nbsp; Y CHASSIS' +
    // which shop each chassis came out of, so an export that loaded says so
    `<br>SHIPS &nbsp;·&nbsp; NOSE ${models.ships.nose ? 'BLENDER' : 'KIT'} &nbsp;·&nbsp; AFT ${models.ships.aft ? 'BLENDER' : 'KIT'}` +
    (models.landmarks.length ? ` &nbsp;·&nbsp; ${models.landmarks.length} LANDMARK${models.landmarks.length > 1 ? 'S' : ''}` : '') + '</small>' +
    '<br><small style="opacity:.65">ENTER / TAP TO DROP IN</small>';
  hud.msg.style.display = '';
}
showMenu();
hud.cluster.style.display = 'none';
terrain.update(0, -400);
animate();
// the Blender pipeline's door: whatever models/manifest.json lists. Vehicles
// built before this resolves are kit ships; the menu re-renders so the
// line naming the shop is right by the time anyone reads it.
// ?models=reference loads models/reference/ (the kit's own exports) so the
// whole door can be exercised with no Blender in the loop
const modelsDir = new URLSearchParams(location.search).get('models');
preloadModels(modelsDir ? `models/${modelsDir}/` : 'models/').then(() => {
  terrain.kit.landmarks = models.landmarks;
  if (state.mode !== 'race' && state.mode !== 'paused') showMenu();
});

window.__pw = {
  THREE, scene, camera, renderer, composer, terrain, route, state, dust, scars,
  audio, sky, input, spray, air, trenches, sparks, haze, flare, models, quality: QUALITY,
  get chassis() { return CHASSIS; },
  get player() { return player; },
  get field() { return field; },
  debug: {
    start: startRace,
    over: gameOver,
    setQuality(q) { localStorage.setItem(QKEY, q); location.reload(); },
    tp(x, z) { if (player) { player.pos.set(x, terrain.height(x, z) + 4, z); player.vel.set(0, 0, 0); } },
    gate(i) { route.index = i; route._built = -1; },
    // put the chase camera straight onto its rig (a harness after a teleport)
    snapCamera() { if (player) placeCamera(0, true); },
    // run the whole race step n times at the sim's own rate, synchronously —
    // a harness under SwiftShader gets a fraction of real time from the loop,
    // and a shot needs the grooves, spray and camera of a carve in progress
    advance(n) { for (let i = 0; i < n && state.mode === 'race'; i++) step(1 / 120); },
    chassis(d) { CHASSIS = d === 'rear' ? 'rear' : 'front'; localStorage.setItem(CKEY, CHASSIS); showMenu(); },
  },
};
