// ── Tiny Hawk — main ───────────────────────────────────────────────────────
// P0: the control scheme. Park heightfield, chase camera, twin sticks with the
// drag/flick split, ollie, air spin, tricks, land/bail, combo readout.
// No grinds, no goals — those are P1 and P4 (design doc §10).
//
// The gate this build exists to answer: does the right stick's slow-drag vs
// flick split actually feel like two separate verbs, and does the chase camera
// stay out of the player's way?

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { COL, GLOW, ZONES } from './palette.js?v=1';
import { Park, PARK_EXTENT } from './park.js?v=1';
import { Skater } from './skater.js?v=1';
import { InputManager, SCHEMES } from './input.js?v=1';
import { Audio } from './audio.js?v=1';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

const CAM_PITCH_MIN = 0.05, CAM_PITCH_MAX = 0.85;
const CAM_SPRING_IDLE = 0.35;   // seconds of no look input before the cam follows
const PHYS_STEP = 1 / 120;

// ── Renderer / scene ───────────────────────────────────────────────────────
const canvas = document.getElementById('canvas-game');
const canvasUI = document.getElementById('canvas-ui');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
const ZONE = ZONES.arena;
scene.background = new THREE.Color(ZONE.sky);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);

// Pinpoint lights in a black sky — stadium rigs, distant windows, embers. HDR
// so bloom turns each one into a soft flare, which is most of the atmosphere in
// the reference for almost no cost.
{
  const N = 300, pos = [], col = [];
  const c = new THREE.Color();
  const warm = GLOW.lampWarm, cool = GLOW[ZONE.dots] || GLOW.lampCool;
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = Math.pow(Math.random(), 1.7);           // crowd them near the horizon
    const r = 300;
    pos.push(Math.cos(a) * r * (1 - y * 0.2), 12 + y * 190, Math.sin(a) * r * (1 - y * 0.2));
    const g = Math.random() < 0.25 ? warm : cool;
    const k = 0.5 + Math.random() * 0.9;
    c.setRGB(g[0] * k, g[1] * k, g[2] * k);
    col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 1.7, vertexColors: true, sizeAttenuation: true, depthWrite: false,
  }));
  pts.frustumCulled = false;
  scene.add(pts);
}

// Chromatic aberration, driven by speed — the reference sells motion almost
// entirely with post, not with geometry.
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
const afterimage = new AfterimagePass(0.6);    // the smear, speed-driven below
composer.addPass(afterimage);
// Threshold high enough that ONLY the HDR line-work and the prism's rim bloom.
// Drop it and the matte ground blooms too, which is what turns the whole look
// into fog.
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.45, 0.92);
composer.addPass(bloom);
const chromaPass = new ShaderPass(ChromaShader);
composer.addPass(chromaPass);
composer.addPass(new OutputPass());

const park = new Park(scene);

// The plateau the park is carved into. The rim flattens out at its own height
// past PARK_EXTENT, so a frame of planes at that height joins it seamlessly and
// the world does not just stop.
{
  const RIM_TOP = park.height(PARK_EXTENT, 0);
  const mat = new THREE.MeshBasicMaterial({ color: COL.void });
  const F = 400, E = PARK_EXTENT;
  const quads = [
    [-F, -F, F, -E], [-F, E, F, F], [-F, -E, -E, E], [E, -E, F, E],
  ];
  for (const [x0, z0, x1, z1] of quads) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    const m = new THREE.Mesh(g, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, RIM_TOP, (z0 + z1) / 2);
    scene.add(m);
  }
}

const skater = new Skater(scene, park);
const input = new InputManager();
const audio = new Audio();

// ── HUD ────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const el = {
  mphNum: $('mphNum'), mphArrows: $('mphArrows'), mphFill: $('mphFill'),
  score: $('score'), mult: $('mult'), trick: $('trick'), breakdown: $('breakdown'),
  objName: $('objName'), objFill: $('objFill'),
  toast: $('toast'), hud: $('hud'), menu: $('menu'), sound: $('btnSound'),
};
const OBJ_TARGET = 25000;   // what the top banner is a progress bar toward

let state = 'menu';
let score = 0, combo = 0, bestCombo = 0;
let camYaw = 0, camPitch = 0.22, lookIdle = 0;
let best = 0;
try { best = parseInt(localStorage.getItem('tinyHawkP0Best') || '0', 10) || 0; } catch (e) { /* ignore */ }

const camTarget = new THREE.Vector3();
let toastT = 0;

function toast(text, color) {
  el.toast.textContent = text;
  el.toast.style.color = color || '#f4f1e8';
  toastT = 1.0;
}

// Trick names read like a skater would say them, because the centre line of
// the HUD is the one place the game talks to you.
const TRICK_NAME = { up: 'Grab', down: 'Pop Shuvit', left: 'Kickflip', right: 'Heelflip' };

let line = [];   // the trick string being built this air

function updateHud() {
  const kmh = Math.round(skater.speed * 2.4);
  el.mphNum.textContent = kmh;
  el.mphArrows.textContent = '>'.repeat(clamp(Math.round(kmh / 9), 0, 7));
  el.mphFill.style.width = clamp(kmh / 80, 0, 1) * 100 + '%';
  el.score.textContent = Math.floor(score).toLocaleString();
  el.mult.textContent = '×' + Math.max(1, combo);
  el.objFill.style.width = clamp(score / OBJ_TARGET, 0, 1) * 100 + '%';
}

function showLine() {
  el.trick.textContent = line.join(' + ');
  el.trick.style.opacity = line.length ? '1' : '0';
}

// ── Scoring ────────────────────────────────────────────────────────────────
function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'ollie') {
      audio.pop(e.power);
      line = ['Ollie'];
      showLine();
      el.breakdown.style.opacity = '0';
    } else if (e.type === 'trick') {
      audio.trick();
      line.push(TRICK_NAME[e.dir]);
      showLine();
    } else if (e.type === 'land') {
      const spins = Math.floor(e.spin / (Math.PI * 0.95));
      if (e.quality === 'bail') {
        combo = 0;
        audio.bail();
        toast('Bail', '#ff6a5a');
        line = [];
        showLine();
        el.breakdown.style.opacity = '0';
      } else {
        // Everything banks on the landing, never before it (design doc §3).
        const airPts = Math.round(e.airTime * 220);
        const trickPts = e.tricks.length * 260;
        const spinPts = spins * 150;
        const gradeK = e.quality === 'clean' ? 1 : e.quality === 'sketchy' ? 0.6 : 0.3;
        let pts = (60 + airPts + trickPts + spinPts) * (e.fakie ? 1.3 : 1) * gradeK;
        if (pts > 40) {
          combo++;
          bestCombo = Math.max(bestCombo, combo);
          score += pts * combo;
          if (e.fakie) line.push('to Fakie');
          showLine();
          // The itemised line under the trick name, straight off the reference.
          const bits = [];
          if (airPts) bits.push('AIR +' + airPts);
          if (trickPts) bits.push('TRICKS +' + trickPts);
          if (spinPts) bits.push('SPIN +' + spinPts);
          if (e.fakie) bits.push('FAKIE ×1.3');
          if (e.quality !== 'clean') bits.push(e.quality.toUpperCase() + ' ×' + gradeK);
          bits.push('LAND +' + Math.round(pts * combo));
          el.breakdown.textContent = bits.join('  ');
          el.breakdown.style.opacity = '1';
          audio.land(e.quality === 'clean');
        } else {
          line = [];
          showLine();
        }
      }
      if (score > best) { best = Math.floor(score); try { localStorage.setItem('tinyHawkP0Best', String(best)); } catch (err) { /* ignore */ } }
    }
  }
}

// ── Camera ─────────────────────────────────────────────────────────────────
function updateCamera(dt) {
  // A rate, not a delta — the right stick under the THPS scheme and the
  // bumpers under Skate both report deflection, and neither is pixels.
  const rate = input.getLookRate();
  if (Math.abs(rate.x) > 1e-4 || Math.abs(rate.y) > 1e-4) {
    camYaw -= rate.x * dt;
    camPitch = clamp(camPitch + rate.y * dt, CAM_PITCH_MIN, CAM_PITCH_MAX);
    lookIdle = 0;
  } else {
    lookIdle += dt;
  }

  // Spring back behind the direction of travel, but only once the player has
  // stopped steering the camera — fighting the player is the fastest way to
  // ruin a skate game.
  const flat = Math.hypot(skater.vel.x, skater.vel.z);
  if (lookIdle > CAM_SPRING_IDLE && flat > 3) {
    const travel = Math.atan2(skater.vel.x, skater.vel.z);
    let d = travel - camYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    camYaw += d * (1 - Math.pow(0.12, dt));
  }

  camTarget.lerp(skater.pos, 1 - Math.pow(0.0006, dt));
  const dist = 9.5 + skater.speed * 0.24;
  const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
  const cx = camTarget.x - Math.sin(camYaw) * cp * dist;
  const cz = camTarget.z - Math.cos(camYaw) * cp * dist;
  const cy = camTarget.y + sp * dist + 1.6;
  // Never let the camera sink into a transition.
  const floor = park.height(cx, cz) + 1.4;
  camera.position.set(cx, Math.max(cy, floor), cz);
  camera.lookAt(camTarget.x, camTarget.y + 1.3, camTarget.z);

  const wantFov = 62 + clamp(skater.airTime, 0, 1) * 7 + skater.speed * 0.18;
  camera.fov = lerp(camera.fov, wantFov, 1 - Math.pow(0.02, dt));
  camera.updateProjectionMatrix();
}

// ── Loop ───────────────────────────────────────────────────────────────────
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  const dpr = Math.min(devicePixelRatio, 2);
  canvasUI.width = w * dpr; canvasUI.height = h * dpr;
  canvasUI.style.width = w + 'px'; canvasUI.style.height = h + 'px';
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  let dt = (now - last) / 1000;
  last = now;
  if (!(dt > 0)) return;
  dt = Math.min(dt, 1 / 20);

  input.pollGamepad(dt);
  input.setAirborne(!skater.grounded);
  input.update(dt);

  if (state === 'play') {
    let acc = dt, guard = 0;
    const events = [];
    while (acc > 0 && guard++ < 32) {
      const h = Math.min(PHYS_STEP, acc);
      events.push(...skater.update(h, input, camYaw));
      acc -= h;
    }
    handleEvents(events);
    updateHud();
  }

  updateCamera(dt);

  if (toastT > 0) {
    toastT -= dt;
    el.toast.style.opacity = String(clamp(toastT, 0, 1));
  }

  // Smear and aberration ride speed, so going fast *looks* like going fast.
  const sp = clamp((skater.speed - 6) / 26, 0, 1);
  afterimage.uniforms.damp.value = 0.55 + sp * 0.2;
  chromaPass.uniforms.uAmount.value = 0.0012 + sp * 0.009;

  const g = canvasUI.getContext('2d');
  const dpr = canvasUI.width / innerWidth;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvasUI.width, canvasUI.height);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  input.drawTouchUI(g);

  composer.render();
}

// ── Shell ──────────────────────────────────────────────────────────────────
function startSkate() {
  audio.init();
  audio.resume();
  skater.reset();
  score = 0; combo = 0; bestCombo = 0; line = [];
  el.trick.style.opacity = '0'; el.breakdown.style.opacity = '0';
  camTarget.copy(skater.pos);
  camYaw = skater.yaw;
  input.clear();
  input.enabled = true;
  state = 'play';
  el.menu.classList.add('hidden');
  el.hud.classList.remove('hidden');
  updateHud();
}

$('btnSkate').addEventListener('click', startSkate);
el.sound.addEventListener('click', () => {
  audio.init();
  audio.setMuted(audio.on);
  el.sound.textContent = audio.on ? '♪ on' : '♪ off';
});
el.sound.textContent = audio.on ? '♪ on' : '♪ off';

const btnScheme = $('btnScheme');
function paintScheme() {
  btnScheme.textContent = input.scheme === 'skate'
    ? 'CONTROLS: SKATE (flick-it)'
    : 'CONTROLS: TONY HAWK (buttons)';
}
btnScheme.addEventListener('click', () => {
  input.setScheme(input.scheme === 'skate' ? 'thps' : 'skate');
  paintScheme();
});
paintScheme();

addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && state === 'play') startSkate();
});

resize();
camTarget.copy(skater.pos);
requestAnimationFrame(animate);

window.__th = {
  skater, park, input, audio, camera,
  debug: {
    state: () => state,
    start: startSkate,
    stats: () => ({ score, combo, bestCombo, speed: skater.speed, grounded: skater.grounded }),
    // The number the whole control scheme rests on (design doc §4, §11).
    scheme: () => input.scheme,
    setScheme: (s) => { input.setScheme(s); paintScheme(); },
    schemes: SCHEMES,
    act: (dir, power = 1) => input.actions.push({ dir, power }),
    setCam: (yaw, pitch) => { camYaw = yaw; if (pitch != null) camPitch = pitch; },
    getCam: () => ({ yaw: camYaw, pitch: camPitch }),
  },
};
