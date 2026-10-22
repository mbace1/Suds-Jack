// main.js — boot, the loop, the states, and the wiring between them.
//
// One renderer path: WebGPURenderer, which falls back to WebGL 2 by itself
// when the device has no WebGPU. `?webgl` forces the fallback, so both paths
// can be checked on any device. The HUD label says which one is running.
//
// The rules live in sim/ and run on a fixed step; this file feeds them input,
// hands their events to the view and the sound, and draws in between steps.
import * as THREE from 'three/webgpu';
import { TUNING } from './tuning.js?v=13';
import { buildFloor } from './render/floor.js?v=13';
import { fitCamera } from './render/view.js?v=13';
import { Splats } from './render/splats.js?v=13';
import { Actors } from './render/actors.js?v=13';
import { GEL_TIME } from './render/gel.js?v=13';
import { studioEnvironment } from './render/env.js?v=13';
import { createWorld, step, api as simApi } from './sim/world.js?v=13';
import { Input } from './input.js?v=13';
import { UI, t, timeText } from './ui.js?v=13';
import { Sound } from './audio.js?v=13';

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
// what the jelly reflects (render/env.js): 2.0's, 1.x had nothing to reflect
if (T.env.on) { scene.environment = studioEnvironment(); scene.environmentIntensity = T.env.intensity; }

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
  str(k) { try { return localStorage.getItem(k) || ''; } catch { return ''; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* private mode */ } },
};
const MODES = ['arcade', 'hardcade', 'survival'];
const bestKey = (m) => `toko2.best.${m}`;
const bests = () => Object.fromEntries(MODES.map((m) => [m, store.num(bestKey(m))]));
// The title's two test switches (owner, 2026-10-22: "the pushing dash should
// be tested as it may be a better dynamic, allowing for more bullet sponge
// enemies", then "likely we want dashes that go through and do damage in the
// end"): the dash, PUSH (TUNING.hero.push), CUT (TUNING.hero.cut) or 1.x's
// PASS, and every non-boss gel's hit points ×1, ×2 or ×3. PUSH is what the
// test began with, so it is what a first run gets (v6 kept PASS as a 1 under
// toko2.dashPass; that is still read).
const DASHES = ['push', 'cut', 'pass'], HP_STEPS = [1, 2, 3];
const tests = () => {
  const hp = store.num('toko2.gelHp'), d = store.str('toko2.dash');
  return { dash: DASHES.includes(d) ? d : store.num('toko2.dashPass') === 1 ? 'pass' : 'push', hp: HP_STEPS.includes(hp) ? hp : 1 };
};
const showTitle = (keep = false) => ui.title(bests(), sound.on, input.source, tests(), keep);

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
  onSound: () => { sound.setOn(!sound.on); store.set('toko2.mute', sound.on ? 0 : 1); showTitle(true); },
  onDash: () => { store.set('toko2.dash', DASHES[(DASHES.indexOf(tests().dash) + 1) % DASHES.length]); showTitle(true); },
  onGelHp: () => { const h = tests().hp; store.set('toko2.gelHp', HP_STEPS[(HP_STEPS.indexOf(h) + 1) % HP_STEPS.length]); showTitle(true); },
  onBack: () => { if (state === 'paused') resume(); else if (state === 'over') toMenu(); },
});

useArena(screenArena());
new ResizeObserver(resize).observe(stage);

function toMenu() {
  state = 'menu'; input.enabled = false; ui.setHud(false);
  useArena(screenArena());
  showTitle();
}

function start(m) {
  debug.hold = false; debug.freeCam = false;
  mode = MODES.includes(m) ? m : 'arcade';
  useArena(screenArena());
  const test = tests();
  world = createWorld({ seed: (Math.random() * 2 ** 32) >>> 0, mode, arena, dashMode: test.dash, hpMult: test.hp });
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
  input.feel?.(e);
  actors.onEvent(e, world);
  const K = T.shake;
  if (e.type === 'kill') shake(K.kill + K.killPerRadius * e.r + (e.r >= T.death.big ? K.bigKill : 0));
  else if (e.type === 'hurt') { shake(K.hurt); ui.vignette(); }
  else if (e.type === 'over') shake(T.heroLook.deathShake);
  else if (e.type === 'dashBoom') shake(e.shake ?? T.hero.dashBoom.shake);
  else if (e.type === 'shake') shake(e.amount);
  else if (e.type === 'lobLand') shake(T.death.lobSplash.shake);
  else if (e.type === 'milestone') ui.banner(e.score.toLocaleString('en-US'), 1.2);
  // a boss's act change or the surviving twin's rage: 1.x's 1.1 s popup (main.js:10398-10407); the 0.3 shake comes as its own event
  else if (e.type === 'phase') ui.banner(e.label ?? 'BOSS PHASE!', e.dur ?? 1.1);
  else if (e.type === 'wave') ui.banner(`${t('wave')} ${e.wave}${e.label ? ` · ${e.label}` : ''}`, e.dur ?? 1.4);
  else if (e.type === 'clear') ui.banner(`${t('wave')} ${e.wave} ${t('clear')} +${e.bonus.toLocaleString('en-US')}`, e.dur ?? 1.0);
  else if (e.type === 'curtainWarn') ui.banner(`${String(e.style || '').toUpperCase()} ${t('curtain')}`, e.t ?? 1.1);
  else if (e.type === 'weapon') ui.banner(e.down ? `${e.fam.toUpperCase()} ${t('podDown')}` : e.up ? `${e.fam.toUpperCase()} ${t('podUp')}` : `${e.fam.toUpperCase()} ${t('pod')}`, 1.2);
}

// screen-axis input → the world. The camera looks down with the far edge at
// the top, so screen-down is +z; the mouse aims at the floor under it, and
// a cursor within the hero's own radius gives no aim (1.x main.js:9228-9237).
const _ray = new THREE.Raycaster(), _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _hit = new THREE.Vector3(), _ndc = new THREE.Vector2();
function toWorld(inp) {
  const out = { mx: inp.mx, mz: inp.my, ax: inp.ax, az: inp.ay, aim: inp.aim, fire: inp.fire, dash: false };
  if (inp.source === 'keys' && input.mouse.seen && world) {
    const r = renderer.domElement.getBoundingClientRect();
    _ndc.set(((input.mouse.x - r.left) / r.width) * 2 - 1, -((input.mouse.y - r.top) / r.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    if (_ray.ray.intersectPlane(_plane, _hit)) {
      const dx = _hit.x - world.hero.x, dz = _hit.z - world.hero.z, d = Math.hypot(dx, dz);
      if (d > T.hero.radius) { out.ax = dx / d; out.az = dz / d; out.aim = true; }
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
  // Look checks for one species (test/lookshot.mjs): a quiet arena with only
  // these bodies in it, the hero standing below them.
  showcase(kinds, { spacing = 4, heroZ = 0.6 } = {}) {
    start('arcade');
    world.director = { step() {} };
    const n = kinds.length;
    kinds.forEach((k, i) => simApi.spawn(world, k, (i - (n - 1) / 2) * spacing, 0, { appear: false }));
    world.hero.x = 0; world.hero.z = world.hz * heroZ; world.hero.px = 0; world.hero.pz = world.hero.z;
    debug.hold = true;                 // the run only moves when idle() says so
    return world.gels.map((g) => ({ id: g.id, kind: g.kind, x: g.x, z: g.z, r: g.r }));
  },
  // step the run with the hero standing still (optionally shooting at `aimAt`)
  idle(seconds, aimAt = null) {
    const n = Math.round(seconds / T.sim.dt);
    for (let i = 0; i < n && !world.over; i++) {
      const h = world.hero, a = aimAt ? Math.atan2(aimAt.z - h.z, aimAt.x - h.x) : 0;
      step(world, { mx: 0, mz: 0, ax: Math.cos(a), az: Math.sin(a), aim: !!aimAt, fire: !!aimAt, dash: false });
      for (const e of world.events) onEvent(e);
      actors.stepFx(T.sim.dt, i * T.sim.dt); splats.step(T.sim.dt);
    }
  },
  // step the run under one fixed input (a look check of a dash, say): `inp`
  // is the sim's input, and its `dash` is an edge, so only the first step dashes
  act(inp, seconds) {
    const n = Math.round(seconds / T.sim.dt);
    for (let i = 0; i < n && !world.over; i++) {
      step(world, { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, ...inp, dash: i === 0 && !!inp.dash });
      for (const e of world.events) onEvent(e);
      actors.stepFx(T.sim.dt, i * T.sim.dt); splats.step(T.sim.dt);
    }
  },
  freeCam: false, hold: false,
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

  if (state === 'play' && debug.hold) {
    // a look check: hold still
  } else if (state === 'play') {
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
    // a look check's hold freezes the effects too: they move only when idle() steps them
    if (state !== 'paused' && !(state === 'play' && debug.hold)) { actors.stepFx(dt, time); splats.step(dt); }
    const h = world.hero;
    floor.setPlayer(h.px + (h.x - h.px) * a, h.pz + (h.z - h.pz) * a);
    ui.hud(world);
  } else floor.setPlayer(0, 0);
  trauma = Math.max(0, trauma - T.shake.decay * dt);
  const m = trauma * trauma, A = T.shake.amp, F = T.shake.freq;
  if (!debug.freeCam) camera.position.set(camRest.x + Math.sin(time * F[0]) * m * A[0], camRest.y + Math.sin(time * F[1]) * m * A[1], camRest.z + Math.sin(time * F[2]) * m * A[2]);
  ui.drawSticks(input);
  renderer.render(scene, camera);
  debug.frames++;
});
debug.ready = true;
