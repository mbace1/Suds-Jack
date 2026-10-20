// main.js — boot, the loop, the states, and the wiring between them.
//
// One renderer path: WebGPURenderer, which falls back to WebGL 2 by itself
// when the device has no WebGPU. `?webgl` forces the fallback, so both paths
// can be checked on any device. The HUD label says which one is running.
//
// The rules live in sim/ and run on a fixed step; this file feeds them input,
// hands their events to the view and the sound, and draws in between steps.
import * as THREE from 'three/webgpu';
import { TUNING } from './tuning.js?v=4';
import { buildFloor } from './render/floor.js?v=4';
import { fitCamera } from './render/view.js?v=4';
import { Splats } from './render/splats.js?v=4';
import { Actors } from './render/actors.js?v=4';
import { GEL_TIME } from './render/gel.js?v=4';
import { createWorld, step } from './sim/world.js?v=4';
import { Input } from './input.js?v=4';
import { UI, t, timeText } from './ui.js?v=4';
import { Sound } from './audio.js?v=4';

const T = TUNING;
const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');

// three reports its own failures (a shader that will not compile on this GPU,
// a validation error, a lost device) through console.error and carries on,
// so on a phone they would be a black or frozen screen with no message.
// Same output as three's default, plus the fault box.
THREE.setConsoleFunction((level, message, ...rest) => {
  const trace = rest[0];
  if (trace && trace.isStackTrace) console[level](trace.getError(message));
  else console[level](message, ...rest);
  if (level === 'error') window.__fault?.(message);
});

// The page's own near-black follows the tuned clear colour once we are up.
const voidHex = '#' + new THREE.Color(T.render.clearColor).getHexString();
document.documentElement.style.setProperty('--void', voidHex);
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', voidHex);

const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: params.has('webgl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, T.render.maxPixelRatio));
stage.appendChild(renderer.domElement);
await renderer.init();

const backend = renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
document.getElementById('backend').textContent = ` · ${backend}`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(T.render.clearColor);
// 1.x's light: white ambient and one sun. The gels are the only lit things.
scene.add(new THREE.AmbientLight(0xffffff, T.light.ambient));
const sun = new THREE.DirectionalLight(0xffffff, T.light.sun.intensity);
sun.position.set(...T.light.sun.position);
scene.add(sun);

const splats = new Splats(scene);
const actors = new Actors(scene, splats);
const camera = new THREE.PerspectiveCamera();
const camRest = new THREE.Vector3();
let trauma = 0;
// 1.x's shake: trauma adds up to 1 and decays; the camera moves by its square
const shake = (amount) => { if (!reduceMotion) trauma = Math.min(1, trauma + amount); };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── the arena: 1.x's size for the screen's shape, chosen at each run start
// (never mid-run), with the floor made to match ──────────────────────────
let arenaName = null, arena = null, floor = null;
let state = 'menu', mode = 'arcade', world = null, acc = 0, pendingDash = false, dyingT = 0;
const screenArena = () => (stage.clientWidth >= stage.clientHeight ? 'landscape' : 'portrait');
function useArena(name) {
  if (name === arenaName) return;
  arenaName = name; arena = T.arena[name];
  if (floor) { scene.remove(floor.group); floor.dispose(); }
  floor = buildFloor(T, arena.hx, arena.hz);
  scene.add(floor.group);
  actors.setArena(arena.hx, arena.hz);
  resize();
}

function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(w, h, false);
  if (!floor) return;
  if (state === 'menu' && screenArena() !== arenaName) return useArena(screenArena());
  fitCamera(camera, floor.arena, w / h, { ...T.camera, tiltDeg: arena.tiltDeg });
  camRest.copy(camera.position);
}

// ── state ──────────────────────────────────────────────────────────
const store = {
  num(k) { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* private mode */ } },
};
const MODES = ['arcade', 'hardcade', 'survival'];
const bestKey = (m) => `toko2.best.${m}`;
const bests = () => Object.fromEntries(MODES.map((m) => [m, store.num(bestKey(m))]));

const input = new Input(document);
const sound = new Sound();
sound.on = store.num('toko2.mute') !== 1;
addEventListener('pointerdown', () => sound.unlock(), { once: true });
addEventListener('keydown', () => sound.unlock(), { once: true });

const ui = new UI({
  onStart: (m) => start(m),
  onResume: () => resume(),
  onPause: () => pause(),
  onAgain: () => start(mode),
  onMenu: () => toMenu(),
  onSound: () => { sound.setOn(!sound.on); store.set('toko2.mute', sound.on ? 0 : 1); ui.title(bests(), sound.on, input.source); },
  onBack: () => { if (state === 'paused') resume(); else if (state === 'over') toMenu(); },
});

useArena(screenArena());
new ResizeObserver(resize).observe(stage);

function toMenu() {
  state = 'menu'; input.enabled = false; ui.setHud(false);
  useArena(screenArena());
  ui.title(bests(), sound.on, input.source);
}

function start(m) {
  mode = MODES.includes(m) ? m : 'arcade';
  useArena(screenArena());
  world = createWorld({ seed: (Math.random() * 2 ** 32) >>> 0, mode, arena });
  splats.clear(); actors.reset(); trauma = 0;
  acc = 0; pendingDash = false;
  state = 'play'; input.enabled = true;
  ui.hide(); ui.setHud(true);
  sound.unlock();
  ui.banner(mode.toUpperCase(), 1.2);
}

function pause() { if (state !== 'play') return; state = 'paused'; input.enabled = false; ui.pause(); }
function resume() { if (state !== 'paused') return; state = 'play'; input.enabled = true; ui.hide(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

function finish() {
  state = 'over'; input.enabled = false;
  const k = bestKey(mode), best = store.num(k), newBest = world.score > best;
  if (newBest) store.set(k, world.score);
  ui.setHud(false);
  ui.results({
    mode, score: world.score, best: Math.max(best, world.score), newBest,
    time: timeText(world.time), gotYou: world.killedBy ? T.species[world.killedBy]?.name : null,
    kills: world.kills, grazes: world.grazes,
  });
}

function onEvent(e) {
  debug.counts[e.type] = (debug.counts[e.type] || 0) + 1;
  sound.event(e);
  actors.onEvent(e, world);
  const K = T.shake;
  if (e.type === 'kill') shake(K.kill + K.killPerRadius * e.r + (e.r >= T.death.big ? K.bigKill : 0));
  else if (e.type === 'hurt') shake(K.hurt);
  else if (e.type === 'extend') ui.banner(t('extend'));
}

// screen-axis input → the world. The camera looks down with the far edge at
// the top, so screen-down is +z; the mouse aims at the ground under it.
const _ray = new THREE.Raycaster(), _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45), _hit = new THREE.Vector3(), _ndc = new THREE.Vector2();
function toWorld(inp) {
  const out = { mx: inp.mx, mz: inp.my, ax: inp.ax, az: inp.ay, aim: inp.aim, fire: inp.fire, dash: false };
  if (inp.source === 'keys' && input.mouse.seen && world) {
    const r = renderer.domElement.getBoundingClientRect();
    _ndc.set(((input.mouse.x - r.left) / r.width) * 2 - 1, -((input.mouse.y - r.top) / r.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    if (_ray.ray.intersectPlane(_plane, _hit)) {
      const dx = _hit.x - world.hero.x, dz = _hit.z - world.hero.z, d = Math.hypot(dx, dz);
      if (d > 0.05) { out.ax = dx / d; out.az = dz / d; out.aim = true; }
    }
  }
  return out;
}

// ── the loop ───────────────────────────────────────────────────────
const debug = {
  THREE, renderer, scene, camera, backend, input, ui, actors,
  get arena() { return floor.arena; }, splats,
  frames: 0, ready: false, counts: {},
  get world() { return world; }, get state() { return state; },
  start, pause, resume, toMenu,
  // Look checks: run the game ahead under a simple bot (shoot the nearest
  // gel, back away from it) with every event handled, so a screenshot can be
  // of the middle of a fight rather than its first second.
  advance(seconds) {
    if (!world) return;
    const n = Math.round(seconds / T.sim.dt);
    for (let i = 0; i < n && !world.over; i++) {
      const h = world.hero; let near = null, nd = Infinity;
      for (const g of world.gels) { if (g.state !== 'active') continue; const d = Math.hypot(g.x - h.x, g.z - h.z); if (d < nd) { nd = d; near = g; } }
      const inp = near
        ? { mx: -(near.x - h.x) / nd - h.x / world.hx, mz: -(near.z - h.z) / nd - h.z / world.hz, ax: (near.x - h.x) / nd, az: (near.z - h.z) / nd, aim: true, fire: true, dash: false }
        : { mx: 0, mz: 0, ax: 1, az: 0, aim: true, fire: true, dash: false };
      step(world, inp);
      for (const e of world.events) onEvent(e);
      if (i % 4 === 0) { actors.stepFx(T.sim.dt * 4, i * T.sim.dt); splats.step(T.sim.dt * 4); }
    }
  },
};
window.__toko = debug;

let last = performance.now();
toMenu();
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000), time = now / 1000;
  last = now;
  GEL_TIME.value = time;
  ui.pollPad(); ui.tick(dt);
  const inp = input.read(null);

  if (state === 'play') {
    if (inp.pause) pause();
    else {
      pendingDash ||= inp.dash;
      const w = toWorld(inp);
      acc += dt;
      let steps = 0;
      while (acc >= T.sim.dt && steps < T.sim.maxSteps && !world.over) {
        w.dash = pendingDash; pendingDash = false;
        step(world, w);
        for (const e of world.events) onEvent(e);
        acc -= T.sim.dt; steps++;
      }
      if (steps === T.sim.maxSteps) acc = Math.min(acc, T.sim.dt);   // a slow frame drops its backlog, not the game
      if (world.over) { state = 'dying'; dyingT = T.flow.deathBeat; input.enabled = false; }
    }
  } else if (state === 'paused') {
    if (inp.pause) resume();
  } else if (state === 'dying') {
    if ((dyingT -= dt) <= 0) finish();
  }

  if (world) {
    const a = state === 'play' ? acc / T.sim.dt : 1;
    actors.sync(world, a, time);
    if (state !== 'paused') { actors.stepFx(dt, time); splats.step(dt); }
    const h = world.hero;
    floor.setPlayer(h.px + (h.x - h.px) * a, h.pz + (h.z - h.pz) * a);
    ui.hud(world);
  } else floor.setPlayer(0, 0);
  trauma = Math.max(0, trauma - T.shake.decay * dt);
  const m = trauma * trauma, A = T.shake.amp, F = T.shake.freq;
  camera.position.set(camRest.x + Math.sin(time * F[0]) * m * A[0], camRest.y + Math.sin(time * F[1]) * m * A[1], camRest.z + Math.sin(time * F[2]) * m * A[2]);
  ui.drawSticks(input);
  renderer.render(scene, camera);
  debug.frames++;
});
debug.ready = true;
