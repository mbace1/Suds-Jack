// ── Tiny 2D — main ─────────────────────────────────────────────────────────
// Scene, camera, loop, scoring.
//
// Tiny Wings' momentum surfing on a skateboard, side-on. Hold to press into the
// face of a hill, release at the lip to pop, hold again in the air to dive onto
// the next downslope. Landing tangentially keeps your speed and steps the fever
// multiplier; slamming into an upslope eats it. The sun is going down the whole
// time and distance buys you daylight.
//
// Spun out of the Tiny Hawk design work — Tiny Hawk itself went third-person
// 3D, and this side-on one-button idea was too good to throw away with it.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { COL } from './palette.js?v=4';
import { Terrain } from './terrain.js?v=4';
import { Skater } from './skater.js?v=4';
import { Input } from './input.js?v=4';
import { Audio } from './audio.js?v=4';
import { randomSeed, clamp, lerp } from './rng.js?v=4';

// ── Tuning ─────────────────────────────────────────────────────────────────
// The view is anchored on its WIDTH, not its height. This is a side-on game
// and the thing you have to see is the next hill: a terrain segment is 31-53
// units long (terrain.js LEN_START/LEN_END), so a view has to hold most of one
// or it is a slope with nothing readable on it. Anchoring on height — which is what this
// did — made the visible width a function of the aspect ratio, so a phone held
// upright got 34 × 0.46 ≈ 16 units across and the screen filled with dark mass.
//
// On a 16:9 desktop these numbers reproduce the old view exactly (34 × 16/9 =
// 60 at a standstill, 50 × 16/9 = 89 flat out). Off 16:9 the height follows
// from the width and is only clamped: never shorter than the old view, never
// so tall that the skater is a speck in a field of sky.
const VIEW_W_MIN   = 60;    // world units across at a standstill
const VIEW_W_MAX   = 89;    // ...and flat out. Endless reads wide on purpose.
const VIEW_H_MIN   = 34;
// 78 is where a 20:9 phone held upright stops being the problem: it buys 36
// units across (one whole terrain segment, and the lip of the next) where the
// old view gave 16. Higher was tried — 92 shows more hill but shrinks the
// skater to a speck against a field of sky, which is the other way to make a
// screen unreadable.
const VIEW_H_MAX   = 78;
const CAM_OFF      = new THREE.Vector3(4, 6, 26);
const LIGHT_START  = 32;    // seconds of daylight
const LIGHT_CAP    = 46;
const CHECK_EVERY  = 200;   // metres between daylight refills
const CHECK_BONUS  = 7;
const FEVER_CAP    = 8;
const PHYS_STEP    = 1 / 120;

// ── Renderer / scene ───────────────────────────────────────────────────────
const canvas = document.getElementById('canvas-game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
let zoom = VIEW_W_MIN;   // the width we are asking for
let viewH = VIEW_H_MIN;  // the height that fell out of it — what the sky and
let viewW = VIEW_W_MIN;  // the camera clamp are sized against, and the width
                         // actually granted after the height clamp
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);

// Same stack as tinyhawk and hyperdagger: ACES + a composer, with SELECTIVE
// bloom via HDR colour. The bloom threshold stays high so only the lit lip of
// the hill blooms — drop it and the matte ground blooms too, which greys out
// the near-black world the whole look depends on.
const composer = new EffectComposer(renderer);
const afterimage = new AfterimagePass(0.5);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.5, 0.9);
scene.add(camera);   // the sky and sun are camera children
composer.addPass(new RenderPass(scene, camera));
composer.addPass(afterimage);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// Sky: a gradient plane parented to the camera, so it is always behind
// everything and never needs culling thought.
function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  const hex = (v) => '#' + v.toString(16).padStart(6, '0');
  grad.addColorStop(0, hex(COL.skyTop));
  grad.addColorStop(0.55, hex(COL.skyMid));
  grad.addColorStop(1, hex(COL.skyBot));
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  return tex;
}
const sky = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ map: skyTexture(), depthWrite: false })
);
sky.position.z = -120;
sky.renderOrder = -10;
camera.add(sky);

const sun = new THREE.Mesh(
  new THREE.CircleGeometry(1, 28),
  new THREE.MeshBasicMaterial({ color: COL.sun, depthWrite: false })
);
sun.position.z = -119;
sun.renderOrder = -9;
camera.add(sun);

// ── Parallax silhouettes ───────────────────────────────────────────────────
// Same sliding-window trick as the terrain: fixed vertex count, rewritten each
// frame from a cheap sine sum sampled at (local + camX * f). f is how fast the
// layer scrolls relative to the ground, so far layers barely move.
const PL_SAMPLES = 90;
const PL_SPAN = 220;

class ParallaxLayer {
  constructor(color, f, amp, wl, baseY, z, phase) {
    Object.assign(this, { f, amp, wl, baseY, phase });
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(PL_SAMPLES * 2 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const idx = [];
    for (let i = 0; i < PL_SAMPLES - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color, side: THREE.DoubleSide, depthWrite: false,
    }));
    this.mesh.position.z = z;
    this.mesh.renderOrder = -5 + f;   // far layers draw first
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  profile(w) {
    return Math.sin(w / this.wl + this.phase) * this.amp
         + Math.sin(w / (this.wl * 0.41) + this.phase * 2.1) * this.amp * 0.35;
  }

  // camY is where the camera is; trendY is a heavily smoothed version of it.
  // Anchoring to the trend rather than to absolute world height is what lets
  // the scenery survive a world that descends forever: the layers ride the
  // long fall with you, and only your *deviation* from it (a big air, a dive
  // into a trough) parallaxes.
  update(camX, camY, trendY) {
    const step = PL_SPAN / (PL_SAMPLES - 1);
    for (let i = 0; i < PL_SAMPLES; i++) {
      const local = -PL_SPAN / 2 + i * step;
      const y = this.profile(local + camX * this.f);
      const o = i * 6;
      this.pos[o] = local; this.pos[o + 1] = y; this.pos[o + 2] = 0;
      this.pos[o + 3] = local; this.pos[o + 4] = -160; this.pos[o + 5] = 0;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.position.x = camX;
    this.mesh.position.y = trendY + this.baseY + (camY - trendY) * (1 - this.f);
  }
}

// Crests sit at or just above the camera centre and the amplitudes stay small:
// these have to read as a horizon, and every unit of amplitude is a unit of sky
// (and of sunset) painted over.
const layers = [
  new ParallaxLayer(COL.farHills,  0.16, 4, 58, -6,  -70, 0.6),
  new ParallaxLayer(COL.midHills,  0.34, 6, 40, -11, -52, 2.3),
  new ParallaxLayer(COL.nearHills, 0.58, 8, 27, -17, -34, 4.1),
];

// ── World ──────────────────────────────────────────────────────────────────
let terrain = new Terrain(randomSeed(), scene);
let skater = new Skater(scene, terrain);
const input = new Input(window);
const audio = new Audio();

// ── HUD ────────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const el = {
  dist: $('dist'), speed: $('speed'), score: $('score'), hi: $('hi'),
  lightFill: $('lightFill'), fever: $('fever'), toast: $('toast'),
  menu: $('menu'), over: $('over'), overStats: $('overStats'),
  menuBest: $('menuBest'), sound: $('btnSound'), hud: $('hud'),
};

let state = 'menu';
let score = 0, dist = 0, fever = 1, light = LIGHT_START, nextCheck = CHECK_EVERY;
let peakSpeed = 0, perfects = 0, tricks = 0, bails = 0, oks = 0, hards = 0;
let camX = 0, camY = 0, trendY = 0, seed = 0;

function loadHi() {
  try { return parseInt(localStorage.getItem('tiny2dHi') || '0', 10) || 0; }
  catch (e) { return 0; }
}
function saveHi(v) {
  try { localStorage.setItem('tiny2dHi', String(v)); } catch (e) { /* ignore */ }
}
let hi = loadHi();

let toastT = 0;
function toast(text, color) {
  el.toast.textContent = text;
  el.toast.style.color = color || '#f4f1e8';
  el.toast.style.opacity = '1';
  el.toast.style.transform = 'translate(-50%, 0) scale(1)';
  toastT = 0.9;
}

function updateHud() {
  el.dist.textContent = Math.floor(dist) + 'm';
  el.speed.textContent = Math.round(skater.speed) + ' km/h';
  el.score.textContent = Math.floor(score).toLocaleString();
  el.hi.textContent = hi ? 'best ' + hi.toLocaleString() : '';
  el.lightFill.style.width = (clamp(light / LIGHT_CAP, 0, 1) * 100).toFixed(1) + '%';
  if (fever > 1) {
    el.fever.style.opacity = '1';
    el.fever.textContent = '×' + fever;
  } else {
    el.fever.style.opacity = '0';
  }
}

// ── Modes ──────────────────────────────────────────────────────────────────
function startEndless() {
  audio.init();
  audio.resume();
  seed = randomSeed();
  scene.remove(terrain.top.mesh, terrain.lip.mesh, terrain.body.mesh);
  scene.remove(skater.group);
  terrain = new Terrain(seed, scene);
  skater = new Skater(scene, terrain);

  score = 0; dist = 0; fever = 1; light = LIGHT_START; nextCheck = CHECK_EVERY;
  peakSpeed = 0; perfects = 0; tricks = 0; bails = 0; oks = 0; hards = 0;
  camX = skater.x; camY = skater.y; trendY = skater.y;
  input.clear();
  input.enabled = true;
  state = 'play';
  el.menu.classList.add('hidden');
  el.over.classList.add('hidden');
  el.hud.classList.remove('hidden');
  updateHud();
}

function gameOver() {
  state = 'over';
  input.enabled = false;
  audio.speed(0);
  audio.gameOver();
  const s = Math.floor(score);
  if (s > hi) { hi = s; saveHi(hi); }
  el.overStats.innerHTML = `
    <div class="big">${s.toLocaleString()}</div>
    <div class="sub">${Math.floor(dist)}m · top ${Math.round(peakSpeed)} km/h</div>
    <div class="sub">${perfects} perfect · ${tricks} tricks · ${bails} bails</div>
    <div class="sub best">${s >= hi ? 'new best' : 'best ' + hi.toLocaleString()}</div>`;
  el.over.classList.remove('hidden');
}

// ── Scoring ────────────────────────────────────────────────────────────────
function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'pop') {
      audio.pop(e.power);
    } else if (e.type === 'launch') {
      audio.launch();
    } else if (e.type === 'trickDone') {
      audio.trick();
    } else if (e.type === 'land') {
      // Air time and tricks only bank on touchdown — the multiplier is only
      // ever paid for a landing you actually made (design doc §3).
      if (e.quality === 'bail') {
        fever = 1;
        bails++;
        light = Math.max(0, light - 3);
        audio.bail();
        toast('BAIL', '#ff4d4d');
      } else {
        const airPts = Math.floor(e.airTime * 90);
        const trickPts = e.tricks * 250;
        tricks += e.tricks;
        if (e.quality === 'perfect') {
          perfects++;
          fever = Math.min(FEVER_CAP, fever + 1);
          light = Math.min(LIGHT_CAP, light + 0.5);
          score += (120 + airPts + trickPts) * fever;
          audio.perfect(perfects);
          if (e.airTime > 0.25 || e.tricks) toast('PERFECT', '#8dfff0');
        } else if (e.quality === 'ok') {
          oks++;
          score += (30 + airPts + trickPts) * fever;
          audio.landSoft();
        } else {
          hards++;
          fever = Math.max(1, Math.floor(fever / 2));
          score += airPts + trickPts;
          audio.landHard();
        }
      }
    }
  }
}

// ── Loop ───────────────────────────────────────────────────────────────────
// Zoom changes every frame with speed; the drawing-buffer size only changes on
// an actual resize, so they are separate calls.
function applyZoom() {
  const aspect = innerWidth / innerHeight;
  // Ask for `zoom` units across; take the height that implies, clamped. On a
  // tall screen the clamp is what stops the world shrinking to nothing — you
  // get a little less width than asked for rather than a doll's-house view.
  viewH = clamp(zoom / aspect, VIEW_H_MIN, VIEW_H_MAX);
  viewW = viewH * aspect;
  camera.left = -viewW / 2;
  camera.right = viewW / 2;
  camera.top = viewH / 2;
  camera.bottom = -viewH / 2;
  camera.updateProjectionMatrix();
  sky.scale.set(viewW * 1.4, viewH * 1.4, 1);
  // The sun is sized against the WIDTH: it was 2.55 units in a 60-wide view, and
  // keeping that proportion is what stops it swelling into a moon that eats half
  // the screen on a tall one (where the height is clamped up, not the width).
  const r = viewW * 0.0425;
  sun.scale.set(r, r, 1);
  // High enough to clear the far hill crests, which sit near the centre line.
  sun.position.set(-viewW * 0.26, viewH * 0.3, sun.position.z);
}

function resize() {
  // updateStyle must stay ON. With it off, three sizes the drawing buffer to
  // innerWidth × pixelRatio and leaves the element's CSS size alone — and an
  // unstyled canvas lays out at its buffer size in CSS pixels. On any phone
  // (pixelRatio 2) that is a canvas twice the viewport in both directions, so
  // the player sees the top-left quarter of the picture at 2× and the skater,
  // who rides the middle of it, is off the bottom of the screen. dropcabal can
  // pass false because its CSS pins the canvas to 100vw/100vh; this one cannot.
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.setSize(innerWidth, innerHeight);
  applyZoom();
}
addEventListener('resize', resize);

let last = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  let dt = (now - last) / 1000;
  last = now;
  if (!(dt > 0)) return;
  dt = Math.min(dt, 1 / 20);   // a tab-switch must not teleport anyone

  if (state === 'play') {
    // Substep so a fast descent can never step over a hill.
    let acc = dt, guard = 0;
    const events = [];
    while (acc > 0 && guard++ < 32) {
      const h = Math.min(PHYS_STEP, acc);
      events.push(...skater.update(h, input));
      acc -= h;
    }
    handleEvents(events);

    dist = Math.max(dist, skater.x);
    peakSpeed = Math.max(peakSpeed, skater.speed);
    score += skater.speed * dt * 0.8;   // ground covered, lightly rewarded

    if (dist >= nextCheck) {
      nextCheck += CHECK_EVERY;
      light = Math.min(LIGHT_CAP, light + CHECK_BONUS);
      audio.checkpoint();
      toast('+' + CHECK_BONUS + 's DAYLIGHT', '#ffd166');
    }

    light -= dt;
    audio.speed(skater.speed);
    if (light <= 0) { light = 0; gameOver(); }
    updateHud();
  }

  if (state === 'play') {
    // Lead the skater by speed so the next hill is always visible, and damp
    // vertical motion hard — a camera that tracks every bump is unreadable.
    const targetZoom = lerp(VIEW_W_MIN, VIEW_W_MAX, clamp((skater.speed - 14) / 44, 0, 1));
    if (Math.abs(targetZoom - zoom) > 0.01) {
      zoom = lerp(zoom, targetZoom, 1 - Math.pow(0.2, dt));
      applyZoom();
    }
    // Lead is a fraction of the view, not a fixed distance: 16 units ahead is a
    // quarter of a 60-wide screen and more than half of a 29-wide one, which is
    // what pinned the skater to the left edge on a phone held upright.
    const lead = clamp(skater.speed * 0.32, 4, 16) * (viewW / VIEW_W_MIN);
    camX = lerp(camX, skater.x + lead, 1 - Math.pow(0.0005, dt));
    camY = lerp(camY, skater.y + 3, 1 - Math.pow(0.15, dt));
    // against the height, not the width — this is how far off centre the
    // skater may drift vertically before the camera drags him back
    camY = clamp(camY, skater.y - viewH * 0.28, skater.y + viewH * 0.34);
  } else {
    // Menus and the death screen drift slowly along the hills rather than
    // sitting on a frozen frame.
    camX += 7 * dt;
    camY = lerp(camY, terrain.heightAt(camX) + 5, 1 - Math.pow(0.1, dt));
  }

  trendY = lerp(trendY, camY, 1 - Math.pow(0.35, dt));

  terrain.update(camX);
  for (const l of layers) l.update(camX, camY, trendY);

  camera.position.set(camX + CAM_OFF.x, camY + CAM_OFF.y, CAM_OFF.z);
  camera.lookAt(camX, camY, 0);

  if (toastT > 0) {
    toastT -= dt;
    const k = clamp(toastT / 0.9, 0, 1);
    el.toast.style.opacity = String(k);
    el.toast.style.transform = `translate(-50%, ${(1 - k) * -18}px) scale(${0.9 + k * 0.25})`;
  }

  // Smear rides speed, as in tinyhawk.
  afterimage.uniforms.damp.value = 0.42 + clamp((skater.speed - 10) / 45, 0, 1) * 0.22;
  composer.render();
}

// ── Shell wiring ───────────────────────────────────────────────────────────
$('btnEndless').addEventListener('click', startEndless);
$('btnAgain').addEventListener('click', startEndless);
$('btnMenu').addEventListener('click', () => {
  state = 'menu';
  input.enabled = false;
  el.over.classList.add('hidden');
  el.menu.classList.remove('hidden');
  el.menuBest.textContent = hi ? 'best ' + hi.toLocaleString() : '';
});
el.sound.addEventListener('click', () => {
  audio.init();
  audio.setMuted(audio.on);
  el.sound.textContent = audio.on ? '♪ on' : '♪ off';
});
el.sound.textContent = audio.on ? '♪ on' : '♪ off';
el.menuBest.textContent = hi ? 'best ' + hi.toLocaleString() : '';

addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && state === 'play') startEndless();
  if (e.code === 'Enter' && state !== 'play') startEndless();
});

input.enabled = false;
resize();
requestAnimationFrame(animate);

// Console handle, matching __hd / __dc.
window.__t2 = {
  get skater() { return skater; },
  get terrain() { return terrain; },
  audio, input, layers,
  debug: {
    state: () => state,
    start: startEndless,
    setLight: (v) => { light = v; },
    setFever: (v) => { fever = v; },
    stats: () => ({ score, dist, fever, light, peakSpeed, perfects, oks, hards, tricks, bails }),
  },
};
