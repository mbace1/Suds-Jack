// main.js — boot, the loop, the states, and the wiring between them.
//
// One renderer path: WebGPURenderer, which falls back to WebGL 2 by itself
// when the device has no WebGPU. `?webgl` forces the fallback, so both paths
// can be checked on any device. The HUD label says which one is running.
//
// The rules live in sim/ and run on a fixed step; this file feeds them input,
// hands their events to the view and the sound, and draws in between steps.
import * as THREE from 'three/webgpu';
import { TUNING } from './tuning.js?v=3';
import { buildDriveway } from './render/driveway.js?v=3';
import { fitCamera } from './render/view.js?v=3';
import { Paint } from './render/paint.js?v=3';
import { Actors } from './render/actors.js?v=3';
import { createWorld, step, hourOf } from './sim/world.js?v=3';
import { dailySeed } from './sim/rng.js?v=3';
import { Input } from './input.js?v=3';
import { UI, t, clockText } from './ui.js?v=3';
import { Sound } from './audio.js?v=3';

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
const paint = new Paint();
const driveway = buildDriveway(T, paint.texture);
scene.add(driveway.group);
const actors = new Actors(scene, paint);
const camera = new THREE.PerspectiveCamera();

function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(w, h, false);
  fitCamera(camera, driveway.arena, w / h, T.camera);
}
new ResizeObserver(resize).observe(stage);
resize();

// ── state ──────────────────────────────────────────────────────────
const store = {
  num(k) { try { return Number(localStorage.getItem(k)) || 0; } catch { return 0; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* private mode */ } },
};
const dayKey = () => new Date().toISOString().slice(0, 10);
const bestKey = (m) => (m === 'daily' ? `toko2.best.daily.${dayKey()}` : `toko2.best.${m}`);
const bests = () => ({ survival: store.num(bestKey('survival')), hardival: store.num(bestKey('hardival')), daily: store.num(bestKey('daily')) });

const input = new Input(document);
const sound = new Sound();
sound.on = store.num('toko2.mute') !== 1;
addEventListener('pointerdown', () => sound.unlock(), { once: true });
addEventListener('keydown', () => sound.unlock(), { once: true });

let state = 'menu', mode = 'survival', world = null, acc = 0, pendingDash = false, dyingT = 0, lastHour = 0;

const ui = new UI({
  onStart: (m) => start(m),
  onResume: () => resume(),
  onPause: () => pause(),
  onAgain: () => start(mode),
  onMenu: () => toMenu(),
  onSound: () => { sound.setOn(!sound.on); store.set('toko2.mute', sound.on ? 0 : 1); ui.title(bests(), sound.on, input.source); },
  onBack: () => { if (state === 'paused') resume(); else if (state === 'over') toMenu(); },
});

function toMenu() {
  state = 'menu'; input.enabled = false; ui.setHud(false);
  ui.title(bests(), sound.on, input.source);
}

function start(m) {
  mode = m;
  const seed = m === 'daily' ? dailySeed(new Date()) : (Math.random() * 2 ** 32) >>> 0;
  world = createWorld({ seed, mode: m === 'hardival' ? 'hardival' : 'survival' });
  paint.clear(); actors.reset();
  acc = 0; pendingDash = false; lastHour = Math.floor(hourOf(world));
  state = 'play'; input.enabled = true;
  ui.hide(); ui.setHud(true);
  sound.unlock();
  ui.banner(clockText(hourOf(world)), 1.4);
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
    mode, score: world.score, best: Math.max(best, world.score), newBest, dawn: world.dawn,
    reached: clockText(hourOf(world)), gotYou: world.killedBy ? T.species[world.killedBy]?.name : null,
    kills: world.kills, grazes: world.grazes,
  });
}

function onEvent(e) {
  debug.counts[e.type] = (debug.counts[e.type] || 0) + 1;
  sound.event(e);
  if (e.type === 'kill') actors.burst(e.x, e.z, e.r, e.color);
  else if (e.type === 'extend') ui.banner(t('extend'));
  else if (e.type === 'dawn') ui.banner(`${t('dawn')} +${e.bonus.toLocaleString('en-US')}`, 2.4);
}

// screen-axis input → the world. The camera looks down with the garage at
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
  THREE, renderer, scene, camera, backend, input, ui, actors, paint,
  arena: driveway.arena, poolCentre: driveway.poolCentre,
  frames: 0, ready: false, counts: {},
  get world() { return world; }, get state() { return state; },
  start, pause, resume, toMenu,
  // Look checks: run the night ahead under a simple bot (shoot the nearest
  // gel, back away from it) with every event handled, so a screenshot can be
  // of the middle of a fight rather than its first second.
  advance(seconds) {
    if (!world) return;
    const n = Math.round(seconds / T.sim.dt);
    for (let i = 0; i < n && !world.over; i++) {
      const h = world.hero; let near = null, nd = Infinity;
      for (const g of world.gels) { if (g.state !== 'active') continue; const d = Math.hypot(g.x - h.x, g.z - h.z); if (d < nd) { nd = d; near = g; } }
      const inp = near
        ? { mx: -(near.x - h.x) / nd - h.x / 8, mz: -(near.z - h.z) / nd - h.z / 4.5, ax: (near.x - h.x) / nd, az: (near.z - h.z) / nd, aim: true, fire: true, dash: false }
        : { mx: 0, mz: 0, ax: 0, az: -1, aim: true, fire: true, dash: false };
      step(world, inp);
      for (const e of world.events) onEvent(e);
      if (i % 4 === 0) actors.stepChunks(T.sim.dt * 4);
    }
  },
};
window.__toko = debug;

let last = performance.now();
toMenu();
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
  last = now;
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
      const hr = Math.floor(hourOf(world));
      if (hr !== lastHour && !world.over) { lastHour = hr; if (!world.dawn) ui.banner(clockText(hr)); }
      if (world.over) { state = 'dying'; dyingT = T.flow.deathBeat; input.enabled = false; }
    }
  } else if (state === 'paused') {
    if (inp.pause) resume();
  } else if (state === 'dying') {
    if ((dyingT -= dt) <= 0) finish();
  }

  if (world) {
    actors.sync(world, state === 'play' ? acc / T.sim.dt : 1, now / 1000);
    if (state !== 'paused') actors.stepChunks(dt);
    ui.hud(world, hourOf(world));
  }
  paint.update();
  ui.drawSticks(input);
  renderer.render(scene, camera);
  debug.frames++;
});
debug.ready = true;
