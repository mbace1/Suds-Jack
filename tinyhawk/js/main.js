// ── Tiny Hawk — main ───────────────────────────────────────────────────────
// P0: the control scheme. Park heightfield, chase camera, twin sticks with the
// drag/flick split, ollie, air spin, tricks, land/bail, combo readout.
// No grinds, no goals — those are P1 and P4 (design doc §10).
//
// The gate this build exists to answer: does the right stick's slow-drag vs
// flick split actually feel like two separate verbs, and does the chase camera
// stay out of the player's way?

import * as THREE from 'three';
import { COL } from './palette.js?v=1';
import { Park, PARK_EXTENT } from './park.js?v=1';
import { Skater } from './skater.js?v=1';
import { Input } from './input.js?v=1';
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
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.sky);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);

// Sky dome: a gradient on the inside of a sphere. No fog anywhere (house rule),
// so the horizon has to come from the backdrop itself.
{
  const c = document.createElement('canvas');
  c.width = 4; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  const hex = (v) => '#' + v.toString(16).padStart(6, '0');
  grad.addColorStop(0, hex(COL.sky));
  grad.addColorStop(0.62, hex(COL.fogBand));
  grad.addColorStop(1, hex(COL.skyLow));
  g.fillStyle = grad; g.fillRect(0, 0, 4, 128);
  const tex = new THREE.CanvasTexture(c);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(500, 24, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false })
  );
  dome.renderOrder = -10;
  scene.add(dome);
}

const park = new Park(scene);

// The plateau the park is carved into. The rim flattens out at its own height
// past PARK_EXTENT, so a frame of planes at that height joins it seamlessly and
// the world does not just stop.
{
  const RIM_TOP = park.height(PARK_EXTENT, 0);
  const mat = new THREE.MeshBasicMaterial({ color: COL.groundLow });
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
const input = new Input(canvasUI);
const audio = new Audio();

// ── HUD ────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const el = {
  speed: $('speed'), score: $('score'), best: $('best'), combo: $('combo'),
  line: $('line'), toast: $('toast'), hud: $('hud'), menu: $('menu'),
  sound: $('btnSound'),
};

let state = 'menu';
let score = 0, combo = 0, bestCombo = 0, pending = 0;
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

const TRICK_NAME = { up: 'grab', down: 'shuv', left: 'kickflip', right: 'heelflip' };

function updateHud() {
  el.speed.textContent = Math.round(skater.speed * 2.4) + ' km/h';
  el.score.textContent = Math.floor(score).toLocaleString();
  el.best.textContent = best ? 'best ' + best.toLocaleString() : '';
  if (combo > 1) {
    el.combo.style.opacity = '1';
    el.combo.textContent = combo + ' chain';
  } else el.combo.style.opacity = '0';
}

// ── Scoring ────────────────────────────────────────────────────────────────
function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'ollie') {
      audio.pop(e.power);
      el.line.textContent = 'ollie';
      el.line.style.opacity = '1';
    } else if (e.type === 'trick') {
      audio.trick();
      el.line.textContent += ' + ' + TRICK_NAME[e.dir];
    } else if (e.type === 'land') {
      const spins = Math.floor(e.spin / (Math.PI * 0.95));
      if (e.quality === 'bail') {
        combo = 0;
        pending = 0;
        audio.bail();
        toast('BAIL', '#ff5a4d');
        el.line.style.opacity = '0';
      } else {
        // Everything banks on the landing, never before it (design doc §3).
        let pts = 60 + e.airTime * 220 + e.tricks.length * 260 + spins * 150;
        if (e.fakie) pts *= 1.3;
        pts *= e.quality === 'clean' ? 1 : e.quality === 'sketchy' ? 0.6 : 0.3;
        if (pts > 40) {
          combo++;
          bestCombo = Math.max(bestCombo, combo);
          score += pts * combo;
          const label = (e.fakie ? 'FAKIE ' : '')
            + (spins ? spins * 180 + '° ' : '')
            + (e.quality === 'clean' ? 'CLEAN' : e.quality.toUpperCase());
          toast(label + '  +' + Math.round(pts * combo),
            e.fakie ? '#b69cff' : e.quality === 'clean' ? '#6ff0d0' : '#f4f1e8');
          audio.land(e.quality === 'clean');
        }
        el.line.style.opacity = '0';
      }
      if (score > best) { best = Math.floor(score); try { localStorage.setItem('tinyHawkP0Best', String(best)); } catch (err) { /* ignore */ } }
    }
  }
}

// ── Camera ─────────────────────────────────────────────────────────────────
function updateCamera(dt) {
  const look = input.consumeLook();
  if (Math.abs(look.x) > 1e-4 || Math.abs(look.y) > 1e-4) {
    camYaw -= look.x;
    camPitch = clamp(camPitch + look.y, CAM_PITCH_MIN, CAM_PITCH_MAX);
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

  input.draw();
  renderer.render(scene, camera);
}

// ── Shell ──────────────────────────────────────────────────────────────────
function startSkate() {
  audio.init();
  audio.resume();
  skater.reset();
  score = 0; combo = 0; bestCombo = 0; pending = 0;
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

// Desktop look is pointer-lock; touch never needs it.
canvas.addEventListener('click', () => {
  if (state === 'play' && !input.pointerLocked && matchMedia('(pointer: fine)').matches) {
    canvas.requestPointerLock();
  }
});

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
    getFlick: () => ({ speed: input.flickSpeed, full: input.flickFull }),
    setFlick: (s, f) => { input.flickSpeed = s; if (f) input.flickFull = f; },
    act: (dir, power = 1) => input.actions.push({ dir, power }),
    setCam: (yaw, pitch) => { camYaw = yaw; if (pitch != null) camPitch = pitch; },
    getCam: () => ({ yaw: camYaw, pitch: camPitch }),
  },
};
