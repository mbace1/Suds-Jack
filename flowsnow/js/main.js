// Flowsnow — boot, the loop, the camera, the hour, the HUD and the three
// states (title / ride / the light goes). Physics lives in physics.js and the
// snow in particles.js, both pure; this file is the only one that touches the
// DOM or the clock.
import * as THREE from 'three';
import { terrain } from './terrain.js?v=1';
import { createRider, stepRider, RUN_LENGTH } from './physics.js?v=1';
import { SnowSim } from './particles.js?v=1';
import { hour } from './palette.js?v=1';
import { makeUniforms, skyMaterial, snowPointsMaterial } from './snowmat.js?v=1';
import { Figure } from './figure.js?v=1';
import { Field, Trail, Shadow } from './world.js?v=1';
import { Input } from './input.js?v=1';
import { Audio } from './audio.js?v=1';
import { pickLang, t } from './lang.js?v=1';

export const VERSION = 3;
const BEST_KEY = 'flowsnow.best';
const STEP = 1 / 120;
const MAX_SNOW = 5000;

const $ = id => document.getElementById(id);
const lang = pickLang(); const L = t(lang);
document.documentElement.lang = lang;

// ---- renderer, scene, camera ----
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 1600);
scene.add(camera);
const u = makeUniforms();
scene.fog = new THREE.FogExp2(0xf3b58c, 0.0062);
const sun = new THREE.DirectionalLight(0xffffff, 2.2); scene.add(sun); scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0x8090c0, 0x9aa0c8, 1.1); scene.add(hemi);
const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 28, 14), skyMaterial(u));
sky.frustumCulled = false; scene.add(sky);

const field = new Field(scene, u, terrain);
const trail = new Trail(scene, u);
const shadow = new Shadow(scene, u);
const figure = new Figure(scene);

// ---- the snow ----
const sim = new SnowSim(MAX_SNOW);
const pgeo = new THREE.BufferGeometry();
const posAttr = new THREE.BufferAttribute(sim.pos, 3); posAttr.setUsage(THREE.DynamicDrawUsage);
const dataArr = new Float32Array(MAX_SNOW * 3);
const dataAttr = new THREE.BufferAttribute(dataArr, 3); dataAttr.setUsage(THREE.DynamicDrawUsage);
pgeo.setAttribute('position', posAttr); pgeo.setAttribute('aData', dataAttr);
pgeo.setDrawRange(0, 0);
const points = new THREE.Points(pgeo, snowPointsMaterial(u));
points.frustumCulled = false; scene.add(points);
function syncSnow() {
  const n = sim.count;
  for (let i = 0; i < n; i++) {
    dataArr[i * 3] = sim.age[i] / sim.life[i]; dataArr[i * 3 + 1] = sim.size[i]; dataArr[i * 3 + 2] = sim.kind[i];
  }
  posAttr.needsUpdate = true; dataAttr.needsUpdate = true;
  pgeo.setDrawRange(0, n);
}

// ---- state ----
const input = new Input(canvas);
const audio = new Audio();
let mode = 'title';
let s = createRider(terrain, terrain.lineX(0), 0);
let time = 0, acc = 0, last = performance.now();
let sprayAcc = 0, hazeAcc = 0, tailAcc = 0, flakeAcc = 0, hudAt = 0, flowMark = 0;
let debugInput = null, noPopUntil = 0;
let best = (() => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } })();

const P = new THREE.Vector3(), D = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const head = new THREE.Vector3(0, 0, -1), camPos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();

// Snow is thrown FROM the snow. The board rides below the surface in powder,
// so every emitter has to spawn at the surface rather than at the rider — fired
// from the buried board they start inside the mountain, and the sim only lifts
// a particle out once it is already falling.
const surfaceY = (x, z, lift = 0.05) => terrain.height(x, z) + lift;

const events = {
  pop() { audio.pop(); },
  kicker() { sim.burst(24, s.x, surfaceY(s.x, s.z, 0.1), s.z, 0, 0.7, 0.4, 2.5, 0.8, 1.1, 0.8, 1); },
  land(impact, air, spins, grab) {
    audio.land(impact, air, spins);
    const n = Math.round(30 + impact * 7);
    const ly = surfaceY(s.x, s.z);
    sim.burst(n, s.x, ly, s.z, 0, 1, 0, 2.5 + impact * 0.45, 1.0, 1.5, 1.1, 1);
    sim.burst(Math.round(n * 0.6), s.x, ly + 0.05, s.z, 0, 0.8, 0, 3 + impact * 0.5, 0.9, 0.9, 0.5, 0);
    if (air > 0.25) {
      const parts = [];
      if (spins >= 180) parts.push(`${spins}`);
      if (grab) parts.push('grab');
      parts.push(`${air.toFixed(1)}s`);
      toast(parts.join(' · '), 1100);
    }
  },
  dive(sink) {
    audio.tumble();
    sim.burst(190, s.x, surfaceY(s.x, s.z, 0.2), s.z, 0, 1, 0, 4.2, 1.3, 2.0, 1.5, 1);
    toast(L('dive'), 1200);
  },
  tumble(impact) {
    audio.tumble();
    sim.burst(140, s.x, surfaceY(s.x, s.z, 0.2), s.z, 0, 1, 0, 3.5, 1.2, 1.8, 1.4, 1);
    toast(L('fall'), 900);
  },
  done() { finish(); },
};

// ---- the hour: every colour on screen asks the same function ----
function applyHour(p) {
  const h = hour(p);
  u.uSun.value.set(h.sunDir[0], h.sunDir[1], h.sunDir[2]);
  u.uSunCol.value.setRGB(...h.sun); u.uLit.value.setRGB(...h.lit); u.uShade.value.setRGB(...h.shade);
  u.uZenith.value.setRGB(...h.zenith); u.uHorizon.value.setRGB(...h.horizon); u.uFog.value.setRGB(...h.fog);
  u.uFogDensity.value = h.fogDensity;
  scene.fog.color.setRGB(...h.fog); scene.fog.density = h.fogDensity;
  renderer.setClearColor(scene.fog.color);
  sun.color.setRGB(...h.sun); sun.position.set(h.sunDir[0], h.sunDir[1], h.sunDir[2]).multiplyScalar(50).add(camera.position); sun.target.position.copy(camera.position);
  hemi.color.setRGB(...h.zenith).lerp(u.uLit.value, 0.5); hemi.groundColor.setRGB(...h.shade);
}

// ---- HUD ----
const hud = { dist: $('dist'), flow: $('flowFill'), float: $('floatFill'), depth: $('depth'), speed: $('speed'), toast: $('toast'), title: $('title'), done: $('done'), best: $('best') };
let toastTimer = 0;
function toast(text, ms = 1000) {
  hud.toast.textContent = text; hud.toast.style.opacity = '1';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { hud.toast.style.opacity = '0'; }, ms);
}
function updateHud(now) {
  if (now - hudAt < 90) return;
  hudAt = now;
  hud.dist.textContent = `${Math.round(s.dist)}`;
  hud.flow.style.width = `${Math.round(s.flow * 100)}%`;
  hud.speed.textContent = `${Math.round(s.speed * 3.6)}`;
  hud.depth.textContent = s.depth.toFixed(1);
  hud.float.style.width = `${Math.round(s.plane * 100)}%`;
}
function setupText() {
  $('tagline').textContent = L('tagline');
  const coarse = matchMedia('(pointer: coarse)').matches;
  $('controls').textContent = coarse ? L('touch') : L('keys');
  $('padline').textContent = L('pad');
  $('press').textContent = L('press');
  $('flowLabel').textContent = L('flow');
  $('floatLabel').textContent = L('float');
  $('depthLabel').textContent = L('snow');
  $('speedLabel').textContent = L('speed');
  $('distLabel').textContent = L('dist');
  $('doneTitle').textContent = L('done');
  $('again').textContent = L('again');
  $('ver').textContent = `v${VERSION}`;
  hud.best.textContent = best ? `${L('best')} ${Math.round(best).toLocaleString()}` : '';
  $('mute').textContent = `${L('mute')} ${audio.muted ? 'off' : 'on'}`;
}

// ---- states ----
function startRun() {
  s = createRider(terrain, terrain.lineX(0), 0);
  s.vz = -2;
  trail.clear(); sim.count = 0;
  sprayAcc = hazeAcc = 0; flowMark = 0;
  mode = 'play';
  hud.title.hidden = true; hud.done.hidden = true; $('hud').hidden = false;
  noPopUntil = time + 0.5;
  input.clearPending();
  audio.start();
  head.set(0, 0, -1);
  camPos.set(s.x, s.y + 2.5, s.z + 7);
}
function finish() {
  mode = 'done';
  audio.done();
  const score = Math.round(s.score);
  const isBest = score > best;
  if (isBest) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* ok */ } }
  $('doneScore').textContent = score.toLocaleString();
  $('doneScoreLabel').textContent = isBest ? `${L('score')} · ${L('newBest')}` : L('score');
  $('doneStats').innerHTML = [
    [L('time'), `${s.time.toFixed(1)} s`], [L('top'), `${Math.round(s.speedMax * 3.6)} km/h`],
    [L('air'), `${s.airBest.toFixed(1)} s`], [L('spin'), `${s.spinBest}°`],
    [L('deepest'), `${s.deepBest.toFixed(1)} m`], [L('falls'), `${s.tumbles}`],
  ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  hud.best.textContent = `${L('best')} ${Math.round(best).toLocaleString()}`;
  hud.done.hidden = false;
  input.clearPending();
}
$('again').addEventListener('click', () => startRun());
$('mute').addEventListener('click', () => { audio.start(); audio.setMuted(!audio.muted); $('mute').textContent = `${L('mute')} ${audio.muted ? 'off' : 'on'}`; });
addEventListener('keydown', e => { if (e.code === 'KeyM') { audio.start(); audio.setMuted(!audio.muted); $('mute').textContent = `${L('mute')} ${audio.muted ? 'off' : 'on'}`; } if (e.code === 'KeyR' && mode !== 'title') startRun(); });

// ---- one physics step, and what it throws ----
function physicsStep(inp, dt) {
  stepRider(s, inp, dt, terrain, events);
  // spray off the working edge. The board rides BELOW the surface in powder,
  // so the plume has to leave the snow rather than the buried edge — emitted at
  // the board it fired from inside the mountain and was never seen.
  sprayAcc += s.spray * 1300 * dt;
  let n = Math.floor(sprayAcc); sprayAcc -= n;
  if (n > 0) {
    figure.edgePoint(s, P, D);
    P.y = surfaceY(P.x, P.z);
    sim.burst(n, P.x, P.y, P.z, D.x, D.y, D.z, 1.8 + s.speed * 0.45, 0.6, 1.0, 0.16, 0);
  }
  // the rooster tail: a buried board at speed throws a wall of it up behind
  if (s.grounded && s.sink > 0.12) {
    tailAcc += s.sink * Math.min(1, s.speed / 14) * 340 * dt;
    n = Math.floor(tailAcc); tailAcc -= n;
    if (n > 0) {
      tmp.set(0, 0.1, 0.55).applyQuaternion(figure.root.quaternion).add(figure.root.position);
      tmp.y = surfaceY(tmp.x, tmp.z, 0.06);
      // thrown UP far more than back: the camera sits behind the rider, so a
      // tail aimed straight astern is a tail aimed at the lens, and at speed it
      // filled the frame and hid the run
      D.set(0, 0.96, 0.28).applyQuaternion(figure.root.quaternion).normalize();
      sim.burst(n, tmp.x, tmp.y, tmp.z, D.x, D.y, D.z, 1.7 + s.speed * 0.26, 0.7, 1.05, 0.34, 1);
    }
  }
  // a low haze off the tail at speed
  if (s.grounded) {
    hazeAcc += Math.min(1, s.speed / 24) * 70 * dt * (0.6 + s.spray);
    n = Math.floor(hazeAcc); hazeAcc -= n;
    if (n > 0) {
      tmp.set(0, 0.05, 0.75).applyQuaternion(figure.root.quaternion).add(figure.root.position);
      tmp.y = surfaceY(tmp.x, tmp.z, 0.04);
      D.set(0, 0.5, 0.85).applyQuaternion(figure.root.quaternion).normalize();
      sim.burst(n, tmp.x, tmp.y, tmp.z, D.x, D.y, D.z, 1.2 + s.speed * 0.12, 0.6, 1.5, 1.0, 1);
    }
  }
  if (s.flow >= 0.999 && flowMark < 1) { flowMark = 1; audio.flowUp(); }
  if (s.flow < 0.5) flowMark = 0;
}

// ---- the camera ----
function placeCamera(dt) {
  if (mode === 'title') {
    const a = time * 0.18;
    camPos.set(s.x + Math.sin(a) * 8.5, s.y + 2.2 + Math.sin(time * 0.3) * 0.3, s.z + Math.cos(a) * 8.5);
    camPos.y = Math.max(camPos.y, terrain.height(camPos.x, camPos.z) + 1.2);
    camera.position.copy(camPos);
    camera.lookAt(s.x, s.y + 0.9, s.z);
    camera.fov = 52; camera.updateProjectionMatrix();
    return;
  }
  const sp = s.speed;
  if (sp > 1.5) tmp.set(s.vx, s.vy * 0.4, s.vz).normalize();
  else tmp.set(Math.sin(s.yaw), 0, -Math.cos(s.yaw));
  head.lerp(tmp, 1 - Math.exp(-dt * 2.6)).normalize();
  const dist = 6.2 + sp * 0.11, height = 2.3 + sp * 0.035;
  tmp.copy(head).multiplyScalar(-dist);
  tmp.x += s.x; tmp.z += s.z; tmp.y = s.y + height + head.y * -dist * 0.4;
  tmp.y = Math.max(tmp.y, terrain.height(tmp.x, tmp.z) + 1.4);
  camPos.lerp(tmp, 1 - Math.exp(-dt * 5.5));
  camera.position.copy(camPos);
  look.set(s.x, s.y + 1.0, s.z).addScaledVector(head, 5 + sp * 0.12);
  camera.lookAt(look);
  camera.rotateZ(-s.edge * 0.05);
  const targetFov = 60 + Math.min(1, sp / 28) * 16;
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4);
  camera.updateProjectionMatrix();
}

// ---- ambient snow around the camera ----
function flakes(dt) {
  flakeAcc += 26 * dt;
  let n = Math.floor(flakeAcc); flakeAcc -= n;
  for (let i = 0; i < n; i++) {
    const x = camera.position.x + (sim.rand() - 0.5) * 60 + head.x * 20;
    const z = camera.position.z + (sim.rand() - 0.5) * 60 + head.z * 20;
    const y = camera.position.y + sim.rand() * 14 - 5;
    if (y < terrain.height(x, z) + 0.5) continue;
    sim.emit(x, y, z, 0, -0.4, 0, 7 + sim.rand() * 4, 0.07 + sim.rand() * 0.07, 2);
  }
  sim.wind[0] = Math.sin(time * 0.31) * 1.3; sim.wind[1] = -0.25; sim.wind[2] = 0.6 + Math.sin(time * 0.17) * 0.4;
}

// ---- the loop ----
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

let liveTuck = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000); last = now;
  time += dt;
  const inp = debugInput ?? input.read();
  liveTuck = inp.tuck;
  if (time < noPopUntil) inp.jump = false;
  if (mode === 'title' && (inp.start || inp.any)) startRun();
  else if (mode === 'done' && inp.start) startRun();
  else if (mode === 'play') {
    acc += dt;
    let first = true;
    while (acc >= STEP) {
      physicsStep(first ? inp : { ...inp, jump: false }, STEP);
      first = false; acc -= STEP;
      if (mode !== 'play') { acc = 0; break; }
    }
  }
  advanceWorld(dt, now);
  renderer.render(scene, camera);
}
function advanceWorld(dt, now) {
  sim.step(dt, terrain);
  flakes(dt);
  syncSnow();
  figure.update(s, dt, time, liveTuck);
  if (mode === 'play') trail.add(s, figure.root.quaternion, terrain);
  shadow.update(s, terrain);
  field.update(s.x, s.z);
  placeCamera(dt);
  sky.position.copy(camera.position);
  u.uCam.value.copy(camera.position); u.uTime.value = time;
  applyHour(mode === 'title' ? 0 : s.dist / RUN_LENGTH);
  audio.update(s.speed, s.spray, s.flow, !s.grounded, dt);
  updateHud(now ?? performance.now());
}

setupText();
$('hud').hidden = true;
applyHour(0);
field.update(s.x, s.z); field.flush();
figure.update(s, 1 / 60, 0, 0);
requestAnimationFrame(frame);

// ---- the seam the smoke test drives ----
window.__fs = {
  get state() { return s; }, sim, terrain, field, version: VERSION,
  mode: () => mode,
  debug: {
    start: startRun,
    end: finish,
    setInput(o) { debugInput = o ? { lean: 0, tuck: 0, brake: 0, jump: false, grab: false, any: false, start: false, ...o } : null; },
    // advance the game by `seconds` of physics with `inp`, off the wall clock
    step(seconds, inp = {}) {
      const full = { lean: 0, tuck: 0, brake: 0, jump: false, grab: false, ...inp };
      let first = true;
      for (let t = 0; t < seconds; t += STEP) {
        if (mode !== 'play') break;
        physicsStep(first ? full : { ...full, jump: false }, STEP);
        first = false;
        if (t % (1 / 30) < STEP) advanceWorld(1 / 30);
      }
      advanceWorld(1 / 60);
      renderer.render(scene, camera);
    },
    hour: applyHour,
    scene, camera, sky,
    render: () => renderer.render(scene, camera),
    hud: () => { hudAt = 0; updateHud(performance.now()); },
    best: () => best,
    flush: () => field.flush(),
  },
};
