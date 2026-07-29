// SUDS JACK — the rebuild.
//
// "Bomb Jack × Suds 51 × Tempest 2000", taken literally and in that order:
// Bomb Jack is the GAME (collect, in the right order, with no weapon), Tempest
// is the SHAPE (a tube you ride the rim of), and the suds are what it is made
// of. The playable original at sudz/ is a tube SHOOTER; this one takes the gun
// away, which is the whole design: everything you do is arrive somewhere in
// time.
//
// It inherits its spine from hyperdagger/ — no build step, three.js off a
// local vendor copy, ACES + EffectComposer with an afterimage smear, a
// telegraphed spawn director, one synth kit, and a debug handle on window for
// the smoke test to drive. What it does NOT inherit is the first-person
// controller or the flat arena, because a tube is not an arena.
//
// EVERY POSITION IN THIS GAME IS (lane, depth). See tube.js.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { PAL, webTint } from './palette.js';
import { Tube, SHAPE_NAMES } from './tube.js';
import { Player } from './player.js';
import { Risers, Pops } from './things.js';
import { Input } from './input.js';
import { AudioKit } from './audio.js';

// ── the scene ────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAL.VOID);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 260);
// Slightly above the mouth and looking down into it. Dead-on, the web is a
// flat wheel of spokes no matter how hard the far end converges — you need to
// see a little of the INSIDE of the tube for it to be a tube.
camera.position.set(0, 5.4, 17.5);
camera.lookAt(0, -1.2, -18);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// The smear is doing a job here rather than being a look: a bubble rising up
// a lane leaves a streak down that lane, so you can read its SPEED, which is
// the one thing you have to judge to meet it with a dive. It is held DOWN to
// 0.5 because it smears the web as well as the risers, and at 0.82 with the
// tube turning under it the rails ghosted into a starburst that hid both.
const smear = new AfterimagePass(0.5);
composer.addPass(smear);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.42, 0.72));
composer.addPass(new OutputPass());

const tube = new Tube(scene, { lanes: 14, radius: 11.4, depth: 78 });
const player = new Player(scene, tube);
const risers = new Risers(scene, tube);
const pops = new Pops(scene, tube);
const input = new Input(canvas);
const audio = new AudioKit();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// ── the run ──────────────────────────────────────────────────────────────
const HI_KEY = 'sudsJackHi';
const state = {
  mode: 'menu',        // menu | play | over
  score: 0,
  chain: 1,
  lives: 3,
  level: 1,
  quota: 0,            // bubbles left to clear this level
  t: 0,
  nextBubble: 0,
  nextGrime: 0,
  banner: 0,
};

const el = id => document.getElementById(id);
const hud = {
  score: el('score'), chain: el('chain'), lives: el('lives'),
  level: el('level'), banner: el('banner'),
};

function hi() { try { return +localStorage.getItem(HI_KEY) || 0; } catch { return 0; } }
function setHi(v) { try { localStorage.setItem(HI_KEY, String(v)); } catch { /* private mode */ } }

function levelQuota(n) { return 8 + n * 4; }
function bubbleRate(n) { return Math.max(0.55, 1.5 - n * 0.09); }     // seconds between
function grimeRate(n) { return Math.max(0.9, 3.2 - n * 0.22); }
function riserSpeed(n) { return 0.16 + n * 0.018; }                    // depth per second

function startLevel(n) {
  state.level = n;
  state.quota = levelQuota(n);
  state.nextBubble = 0.4;
  state.nextGrime = 1.8 + Math.random();
  const shape = SHAPE_NAMES[(n - 1) % SHAPE_NAMES.length];
  // every third web leans off-axis, so a shape you have seen is still a
  // different room the second time round
  tube.setShape(shape, n % 3 === 0 ? [0.22, -0.14] : [0, 0]);
  tube.tint(webTint(n));
  toast(`LEVEL ${n} · ${shape.toUpperCase()}`);
  paintHud();
}

function startRun() {
  state.mode = 'play';
  state.score = 0; state.chain = 1; state.lives = 3; state.t = 0;
  risers.clear(); pops.clear(); player.reset();
  startLevel(1);
  el('menu').hidden = true;
  el('over').hidden = true;
  audio.ensure(); audio.bedStart();
}

function gameOver() {
  state.mode = 'over';
  audio.bedStop(); audio.over();
  const best = Math.max(hi(), state.score);
  setHi(best);
  el('finalScore').textContent = state.score.toLocaleString();
  el('finalLevel').textContent = String(state.level);
  el('finalBest').textContent = best.toLocaleString();
  el('over').hidden = false;
}

function toast(text) {
  hud.banner.textContent = text;
  state.banner = 1.8;
  hud.banner.style.opacity = '1';
}

function paintHud() {
  hud.score.textContent = state.score.toLocaleString();
  hud.chain.textContent = state.chain > 1 ? `×${state.chain}` : '';
  hud.level.textContent = `L${state.level}`;
  hud.lives.textContent = '●'.repeat(Math.max(0, state.lives));
}

// ── the director ─────────────────────────────────────────────────────────
// Bubbles are the metronome and grime is the pressure. Both spawn AWAY from
// where you are standing: a hazard that appears in the lane you already
// occupy is not a decision, it is a tax.
function director(dt) {
  state.nextBubble -= dt;
  state.nextGrime -= dt;
  const n = tube.lanes;

  if (state.nextBubble <= 0 && state.quota > 0) {
    const lane = awayFrom(player.lane, 2, n);
    risers.spawn('bubble', lane, riserSpeed(state.level) * (0.85 + Math.random() * 0.4));
    state.nextBubble = bubbleRate(state.level) * (0.7 + Math.random() * 0.6);
  }
  if (state.nextGrime <= 0) {
    const lane = awayFrom(player.lane, 4, n);
    risers.spawn('grime', lane, riserSpeed(state.level) * (0.7 + Math.random() * 0.3));
    state.nextGrime = grimeRate(state.level) * (0.7 + Math.random() * 0.7);
  }
}

function awayFrom(lane, minGap, n) {
  for (let i = 0; i < 12; i++) {
    const c = Math.floor(Math.random() * n);
    let d = Math.abs(c - lane);
    d = Math.min(d, n - d);
    if (d >= minGap) return c;
  }
  return Math.floor(lane + n / 2) % n;
}

// ── the frame ────────────────────────────────────────────────────────────
let last = performance.now();

function step(dt) {
  // barely turning during play: the web is the thing you are reading
  tube.update(dt, state.mode === 'play' ? 0.012 : 0.1);
  pops.update(dt);

  if (state.banner > 0) {
    state.banner -= dt;
    if (state.banner <= 0) hud.banner.style.opacity = '0';
  }

  if (state.mode !== 'play') { player.update(dt); return; }

  state.t += dt;
  input.pollGamepad();
  player.move(input.spin(), dt);
  if (input.dive() && player.dive()) audio.dive();
  player.update(dt);

  director(dt);
  const { collected, missed, struck } = risers.update(dt, player);

  for (const it of collected) {
    // Depth pays. A bubble taken at the mouth is worth its face value; one
    // met halfway down the tube is worth three times that, which is the only
    // reason to ever leave the rim.
    const depthBonus = 1 + it.depth * 2;
    const worth = Math.round(100 * depthBonus * state.chain);
    state.score += worth;
    if (it.lit) { state.chain = Math.min(state.chain + 1, 16); audio.lit(state.chain); }
    else audio.pop(state.chain);
    pops.at(it.lane, it.depth, it.lit ? PAL.BUBBLE_LIT : PAL.BUBBLE);
    state.quota--;
    if (state.quota <= 0 && !risers.items.some(i => i.type === 'bubble')) {
      audio.level();
      startLevel(state.level + 1);
    }
  }

  for (const it of missed) {
    // Only the lit one costs you. Letting an ordinary bubble go is a shrug;
    // letting the lit one past is the whole chain, and that is Bomb Jack.
    if (it.lit) { state.chain = 1; audio.miss(); toast('CHAIN LOST'); }
  }

  if (struck.length && player.hit()) {
    state.lives--;
    state.chain = 1;
    audio.hit();
    if (state.lives <= 0) gameOver();
    else toast('SPLASH');
  }

  paintHud();
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  step(dt);
  composer.render();
}
requestAnimationFrame(frame);

// ── the ways in ──────────────────────────────────────────────────────────
el('play').addEventListener('pointerup', startRun);
el('play').addEventListener('touchend', (e) => { e.preventDefault(); startRun(); });
el('again').addEventListener('pointerup', startRun);
el('again').addEventListener('touchend', (e) => { e.preventDefault(); startRun(); });
addEventListener('keydown', (e) => {
  if (e.code === 'Enter' && state.mode !== 'play') startRun();
});

el('sound').addEventListener('click', () => {
  const on = el('sound').getAttribute('aria-pressed') !== 'true';
  el('sound').setAttribute('aria-pressed', String(on));
  el('sound').textContent = on ? '♪ ON' : '♪ OFF';
  audio.setOn(on);
});

el('hiScore').textContent = hi().toLocaleString();
tube.tint(webTint(1));
paintHud();

// ── the handle ───────────────────────────────────────────────────────────
// Same contract as every other cabinet here: enough to drive the game from a
// console or a headless test without touching the DOM.
window.__sj = {
  state, tube, player, risers, audio,
  debug: {
    start: startRun,
    over: gameOver,
    setLevel: n => startLevel(n),
    spawn: (type, lane, depth = 1) => {
      const it = risers.spawn(type, lane ?? Math.round(player.lane), riserSpeed(state.level));
      if (it) it.depth = depth;
      return it;
    },
    // put a thing exactly where the player is, one frame from contact — the
    // only honest way to test collection and damage without playing well
    give: (type = 'bubble') => {
      const it = risers.spawn(type, player.lane, 0.0001);
      if (it) { it.depth = player.depth + 0.02; it.lit = type === 'bubble'; }
      return it;
    },
    step,
  },
};
