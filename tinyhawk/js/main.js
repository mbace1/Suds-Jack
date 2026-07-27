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
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 900);

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
  objName: $('objName'), objFill: $('objFill'), goals: $('goals'),
  balance: $('balance'), balMark: $('balMark'),
  over: $('over'), overStats: $('overStats'),
  toast: $('toast'), hud: $('hud'), menu: $('menu'), sound: $('btnSound'),
};
const OBJ_TARGET = 25000;   // what the top banner is a progress bar toward

let state = 'menu';
let score = 0;
let camYaw = 0, camPitch = 0.13, lookIdle = 0;
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

// ── The combo chain ────────────────────────────────────────────────────────
// This is what grinds and manuals are FOR. A chain stays open while you are in
// the air, on a rail, or on the back wheels, and only banks when you finally
// roll away clean — so a manual across the flat between two features is worth
// more than the two features apart. Bail and the whole pending total is gone.
const GRIND_PPS = 90;    // points per second on a rail
const MANUAL_PPS = 45;
const BANK_GRACE = 0.28; // seconds rolling clean before a chain closes

let chain = { open: false, pending: 0, parts: [], grace: 0 };

function chainOpen(part) {
  if (!chain.open) { chain = { open: true, pending: 0, parts: [], grace: 0 }; }
  if (part) chain.parts.push(part);
  chain.grace = 0;
  showLine();
}

function chainAdd(pts) { if (chain.open) chain.pending += pts; }

function chainBank() {
  if (!chain.open) return;
  const mult = Math.max(1, chain.parts.length);
  const total = Math.round(chain.pending * mult);
  if (total > 0) {
    score += total;
    bestChain = Math.max(bestChain, mult);
    goalCombo = Math.max(goalCombo, mult);
    toast(chain.parts.join(' + '), UI_CLEAN);
    el.breakdown.textContent = `${Math.round(chain.pending)} × ${mult} = ${total.toLocaleString()}`;
    el.breakdown.style.opacity = '1';
    audio.land(true);
    if (score > best) { best = Math.floor(score); try { localStorage.setItem('tinyHawkP0Best', String(best)); } catch (e) { /* ignore */ } }
  }
  chain = { open: false, pending: 0, parts: [], grace: 0 };
  showLine();
}

function chainLose() {
  chain = { open: false, pending: 0, parts: [], grace: 0 };
  showLine();
  el.breakdown.style.opacity = '0';
}

const UI_CLEAN = '#8fe6d8';

function showLine() {
  el.trick.textContent = chain.parts.join(' + ');
  el.trick.style.opacity = chain.parts.length ? '1' : '0';
}

function updateHud() {
  const kmh = Math.round(skater.speed * 2.4);
  el.mphNum.textContent = kmh;
  el.mphArrows.textContent = '>'.repeat(clamp(Math.round(kmh / 9), 0, 7));
  el.mphFill.style.width = clamp(kmh / 80, 0, 1) * 100 + '%';
  el.score.textContent = Math.floor(score).toLocaleString();
  el.mult.textContent = '×' + Math.max(1, chain.parts.length);

  // Balance meter — only up while something is actually balancing.
  const bal = skater.grind ? skater.grind.balance : skater.manual ? skater.manual.balance : null;
  if (bal === null) {
    el.balance.style.opacity = '0';
  } else {
    el.balance.style.opacity = '1';
    el.balMark.style.left = (50 + clamp(bal, -1, 1) * 50) + '%';
    el.balMark.style.background = Math.abs(bal) > 0.66 ? '#ff6a5a' : UI_CLEAN;
  }

  if (mode === 'run') {
    const left = Math.max(0, RUN_TIME - runT);
    el.objName.textContent = `Run — ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
    el.objFill.style.width = clamp(1 - left / RUN_TIME, 0, 1) * 100 + '%';
    el.goals.innerHTML = GOALS.map(g => {
      const done = g.done();
      return `<span class="${done ? 'got' : ''}">${done ? '✓' : '·'} ${g.label()}</span>`;
    }).join('');
  } else {
    el.objName.textContent = 'Endless';
    el.objFill.style.width = clamp(score / 25000, 0, 1) * 100 + '%';
    el.goals.innerHTML = `<span>best chain ×${bestChain}</span>`;
  }
}

// ── Modes ──────────────────────────────────────────────────────────────────
const RUN_TIME = 120;
let mode = 'run', runT = 0, bestChain = 1;
let goalCombo = 1, goalGrind = 0;

const GOALS = [
  { label: () => `${Math.min(Math.floor(score), 12000).toLocaleString()} / 12,000 pts`,
    done: () => score >= 12000 },
  { label: () => `grind ${goalGrind.toFixed(1)} / 2.5s`, done: () => goalGrind >= 2.5 },
  { label: () => `chain ×${goalCombo} / ×5`, done: () => goalCombo >= 5 },
];

// ── Scoring ────────────────────────────────────────────────────────────────
function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'ollie') {
      audio.pop(e.power);
      chainOpen('Ollie');
    } else if (e.type === 'trick') {
      audio.trick();
      chainOpen(TRICK_NAME[e.dir]);
      chainAdd(260);
    } else if (e.type === 'grindStart') {
      audio.trick();
      chainOpen(e.name);
    } else if (e.type === 'grindEnd') {
      goalGrind = Math.max(goalGrind, e.time);
    } else if (e.type === 'manualStart') {
      chainOpen('Manual');
    } else if (e.type === 'bail') {
      audio.bail();
      toast('Bail', '#ff6a5a');
      chainLose();
    } else if (e.type === 'land') {
      const spins = Math.floor(e.spin / (Math.PI * 0.95));
      if (e.quality === 'bail') {
        audio.bail();
        toast('Bail', '#ff6a5a');
        chainLose();
      } else {
        if (chain.open) {
          chainAdd(Math.round(e.airTime * 220) + spins * 150 + 60);
          if (spins) chain.parts.push(spins * 180 + '°');
          if (e.fakie) chain.parts.push('Fakie');
          showLine();
        }
        audio.land(e.quality === 'clean');
      }
    }
  }
}

// ── Camera ─────────────────────────────────────────────────────────────────
// three.js' `fov` is the VERTICAL angle, so a fixed value crops the sides on a
// narrow screen: an iPad at 4:3 sees ~86° across where a 16:9 desktop sees
// ~102°, and the tighter one reads as "zoomed in". This keeps a horizontal
// MINIMUM instead — wide screens are unchanged, narrow ones open the vertical
// angle up rather than losing the world at the edges.
const V_BASE = 70;                            // vertical fov on a wide screen
const H_MIN = 96 * (Math.PI / 180);           // never show less than this across
function baseFov() {
  const aspect = innerWidth / innerHeight;
  const fromH = 2 * Math.atan(Math.tan(H_MIN / 2) / aspect) * (180 / Math.PI);
  return clamp(Math.max(V_BASE, fromH), 60, 100);
}

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

  camTarget.lerp(skater.pos, 1 - Math.pow(0.0009, dt));
  // Skate Story's camera sits low and behind the board. Close, but not so close
  // that the skater fills the frame and you cannot read the park ahead of you.
  const dist = 7.6 + skater.speed * 0.17;
  const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
  const cx = camTarget.x - Math.sin(camYaw) * cp * dist;
  const cz = camTarget.z - Math.cos(camYaw) * cp * dist;
  const cy = camTarget.y + sp * dist + 1.2;
  // Never let the camera sink into a transition.
  const floor = park.height(cx, cz) + 0.9;
  camera.position.set(cx, Math.max(cy, floor), cz);
  camera.lookAt(camTarget.x, camTarget.y + 0.95, camTarget.z);

  const wantFov = baseFov() + clamp(skater.airTime, 0, 1) * 8 + skater.speed * 0.3;
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
  camera.fov = baseFov();   // snap on resize; the loop only lerps from here
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

    // Grinds and manuals earn while they last, and hold the chain open.
    if (skater.grind) chainAdd(GRIND_PPS * dt);
    if (skater.manual) chainAdd(MANUAL_PPS * dt);
    if (chain.open) {
      if (skater.chaining) chain.grace = 0;
      else {
        chain.grace += dt;
        if (chain.grace >= BANK_GRACE) chainBank();
      }
    }

    if (mode === 'run') {
      runT += dt;
      if (runT >= RUN_TIME) endRun();
    }
    updateHud();
  }

  updateCamera(dt);

  if (toastT > 0) {
    toastT -= dt;
    el.toast.style.opacity = String(clamp(toastT, 0, 1));
  }

  // Smear and aberration ride speed, so going fast *looks* like going fast.
  const sp = clamp((skater.speed - 6) / 26, 0, 1);
  afterimage.uniforms.damp.value = 0.48 + sp * 0.18;
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
function endRun() {
  state = 'over';
  input.enabled = false;
  chainLose();
  const got = GOALS.filter(g => g.done()).length;
  el.overStats.innerHTML = `
    <div class="big">${Math.floor(score).toLocaleString()}</div>
    <div class="sub">${got} / ${GOALS.length} objectives · best chain ×${bestChain}</div>
    <div class="sub">${GOALS.map(g => (g.done() ? '✓ ' : '· ') + g.label()).join('<br>')}</div>`;
  el.over.classList.remove('hidden');
  el.hud.classList.add('hidden');
}

function startSkate(m) {
  if (m) mode = m;
  audio.init();
  audio.resume();
  skater.reset();
  score = 0; runT = 0; bestChain = 1; goalCombo = 1; goalGrind = 0;
  chain = { open: false, pending: 0, parts: [], grace: 0 };
  el.trick.style.opacity = '0'; el.breakdown.style.opacity = '0';
  camTarget.copy(skater.pos);
  camYaw = skater.yaw;
  input.clear();
  input.enabled = true;
  state = 'play';
  el.menu.classList.add('hidden');
  el.over.classList.add('hidden');
  el.hud.classList.remove('hidden');
  updateHud();
}

$('btnRun').addEventListener('click', () => startSkate('run'));
$('btnEndless').addEventListener('click', () => startSkate('endless'));
$('btnAgain').addEventListener('click', () => startSkate());
$('btnMenu').addEventListener('click', () => {
  state = 'menu';
  input.enabled = false;
  el.over.classList.add('hidden');
  el.menu.classList.remove('hidden');
});
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
    stats: () => ({ score: Math.round(score), mode, runT: +runT.toFixed(1),
      chain: chain.parts.length, pending: Math.round(chain.pending), bestChain,
      goalGrind: +goalGrind.toFixed(2), goalCombo,
      speed: +skater.speed.toFixed(1), grounded: skater.grounded,
      grind: skater.grind ? skater.grind.name : null,
      manual: !!skater.manual }),
    setMode: (m) => { mode = m; },
    endRun: () => endRun(),
    // The number the whole control scheme rests on (design doc §4, §11).
    scheme: () => input.scheme,
    setScheme: (s) => { input.setScheme(s); paintScheme(); },
    schemes: SCHEMES,
    act: (dir, power = 1) => input.actions.push({ dir, power }),
    setCam: (yaw, pitch) => { camYaw = yaw; if (pitch != null) camPitch = pitch; },
    getCam: () => ({ yaw: camYaw, pitch: camPitch }),
  },
};
