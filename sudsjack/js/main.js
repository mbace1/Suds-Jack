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
import { Risers, Pops, Scum, Shots, STICKY } from './things.js';
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
// INSIDE the channel, above the floor and below the lips, looking down its
// length. This is the whole read: level with the lips a half tunnel is two
// lines, from above it is a flat ribbon, and only from in here is it a place
// you are lying in. Jack sits at the bottom of the frame with a little room
// under him and the walls sweep up past both edges.
//
// The ridged channel is the exception and gets its own seat. Its five bays
// are spread across the same width as one half-pipe, so from down in the
// middle one you see your own bay and two edges — and the whole level is
// about deciding which bay to be in, which you cannot do if you cannot see
// them. It sits back and up until all five read.
const SEATS = {
  default: { pos: [0, -3.4, 16.5], look: [0, -6.4, -40] },
  gutters: { pos: [0, 2.4, 22], look: [0, -7.4, -30] },
};
function seat(shape) {
  const s = SEATS[shape] || SEATS.default;
  camera.position.set(...s.pos);
  camera.lookAt(...s.look);
}
seat('pipe');

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

// Lane count comes from the tube's own default: BAYS × LANES_PER_BAY. The 13
// this used to pass in predated the ridged channel, and 13 does not divide
// into five bays — the declared peaks sat at lanes 4/8/12/16 of a channel
// whose DRAWN ridges were at 2.6/5.2/7.8/10.4, so the walls you hit were not
// the ridges you saw, one peak was past the lip, and the fifth bay was a
// one-lane sliver. Every lane-denominated tuning below was rescaled ×20/13 to
// keep world-space feel identical.
const tube = new Tube(scene, { radius: 11.4, depth: 78 });
const player = new Player(scene, tube);
const risers = new Risers(scene, tube);
const pops = new Pops(scene, tube);
const scum = new Scum(scene, tube);
const shots = new Shots(scene, tube);
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
  level: 1,            // the SECTOR — you fly through it, not collect it away
  dist: 0,             // depths flown into this sector
  t: 0,
  nextBubble: 0,
  nextGrime: 0,
  nextSpitter: 0,
  banner: 0,
};

const el = id => document.getElementById(id);
const hud = {
  score: el('score'), chain: el('chain'), lives: el('lives'),
  level: el('level'), banner: el('banner'), scum: el('scum'),
};

// the scum line's cells, one per lane, built once
const scumCells = [];
for (let i = 0; i < tube.lanes; i++) {
  const c = document.createElement('i');
  hud.scum.appendChild(c);
  scumCells.push(c);
}

function hi() { try { return +localStorage.getItem(HI_KEY) || 0; } catch { return 0; } }
function setHi(v) { try { localStorage.setItem(HI_KEY, String(v)); } catch { /* private mode */ } }

// A sector is a stretch of tube, measured in depths FLOWN — the level driver
// is the flight itself now, not a bubble count. You cannot camp a distance.
function sectorLen(n) { return 16 + n * 3; }
function flightSpeed(n) { return Math.min(0.9, 0.34 + n * 0.045); }    // depths/sec
function sectorShape(n) { return SHAPE_NAMES[(n - 1) % SHAPE_NAMES.length]; }
// where in a sector the channel starts becoming the NEXT one. Everything
// before it is this sector's shape, pure — which is also what keeps the smoke
// gate honest when it asks for a shape by number.
const MORPH_AT = 0.6;

function bubbleRate(n) { return Math.max(0.55, 1.5 - n * 0.09); }     // seconds between
function grimeRate(n) { return Math.max(0.9, 3.2 - n * 0.22); }
function spitterRate(n) { return Math.max(6, 15 - n); }
function riserSpeed(n) { return 0.16 + n * 0.018; }                    // depth per second
const FIRE_CD = 0.16;                                                  // stream cadence
let fireCD = 0;
let lastDom = 'pipe';           // the dominant shape last frame — seat swaps on it

function startLevel(n, cleanBonus = 0) {
  state.level = n;
  state.dist = 0;
  state.nextBubble = 0.4;
  state.nextGrime = 1.8 + Math.random();
  state.nextSpitter = n >= 2 ? 4 + Math.random() * 3 : Infinity;
  const shape = sectorShape(n);
  // every third web leans off-axis, so a shape you have seen is still a
  // different room the second time round
  // no bend on the ridged one: a leaning channel plus five bays is two
  // things to read at once, and the bays are the level
  tube.setShape(shape, n % 3 === 0 && shape !== 'gutters' ? [0.22, -0.14] : [0, 0]);
  tube.speed = flightSpeed(n);
  tube.tint(webTint(n));
  lastDom = shape;
  seat(shape);
  // the clean bonus rides the sector banner: it is the one moment you look up
  toast(`SECTOR ${n} · ${shape.toUpperCase()}` + (cleanBonus ? `  ·  CLEAN +${cleanBonus.toLocaleString()}` : ''));
  paintHud();
}

function startRun() {
  state.mode = 'play';
  state.score = 0; state.chain = 1; state.lives = 3; state.t = 0;
  risers.clear(); pops.clear(); player.reset();
  scum.clear(); shots.clear();
  input.clearPending();
  fireCD = 0;
  startLevel(1);
  el('menu').hidden = true;
  el('over').hidden = true;
  audio.ensure(); audio.bedStart();
}

function gameOver() {
  state.mode = 'over';
  input.clearPending();
  tube.speed = 0.1;               // the tube keeps drifting behind the recap
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
  hud.level.textContent = `S${state.level} · ${Math.min(99, Math.floor(state.dist / sectorLen(state.level) * 100))}%`;
  hud.lives.textContent = '●'.repeat(Math.max(0, state.lives));
  // the scum line: one cell per lane, the map and the flood meter in one
  for (let i = 0; i < scumCells.length; i++) {
    const k = scum.layers[i];
    scumCells[i].className = k ? 's' + k : '';
  }
}

// ── the director ─────────────────────────────────────────────────────────
// Bubbles are the metronome and grime is the pressure. Both spawn AWAY from
// where you are standing: a hazard that appears in the lane you already
// occupy is not a decision, it is a tax.
function director(dt) {
  state.nextBubble -= dt;
  state.nextGrime -= dt;
  const n = tube.lanes;

  if (state.nextBubble <= 0) {
    // BARREN: bubbles do not rise through a fouled lane. This is scum's
    // quietest tooth — neglect never blocks you, it starves you: the chain
    // migrates into whatever you have kept clean, and a channel you let
    // foul over pays nothing. If no clean lane is far enough away, no
    // bubble this tick — the retry is short, so a scrub reopens the tap
    // almost immediately.
    let lane = -1;
    for (let i = 0; i < 12; i++) {
      const c = awayFrom(player.lane, 3, n);
      if (scum.at(c) === 0) { lane = c; break; }
    }
    if (lane >= 0) {
      risers.spawn('bubble', lane, riserSpeed(state.level) * (0.85 + Math.random() * 0.4));
      state.nextBubble = bubbleRate(state.level) * (0.7 + Math.random() * 0.6);
    } else {
      state.nextBubble = 0.3;
    }
  }
  if (state.nextGrime <= 0) {
    // On the ridged channel grime cannot cross a peak, so "away from you" is
    // measured in BAYS: dropping it in your own bay is the only way it ever
    // threatens you there, and dropping it in every other one is what makes
    // the level a route rather than a hiding place.
    const lane = tube.peaks.length
      ? bayLane(Math.random() < 0.45 ? player.lane : Math.random() * n)
      : awayFrom(player.lane, 6, n);
    risers.spawn('grime', lane, riserSpeed(state.level) * (0.7 + Math.random() * 0.3));
    state.nextGrime = grimeRate(state.level) * (0.7 + Math.random() * 0.7);
  }

  // Spitters, from sector 2: the first thing that does not come to you. At
  // most two hold the tube at once — a third would turn the mid-field into a
  // firing squad and the mouth into the only conversation.
  state.nextSpitter -= dt;
  if (state.nextSpitter <= 0) {
    const alive = risers.items.filter(i => i.type === 'spitter').length;
    if (alive < 2) {
      risers.spawn('spitter', awayFrom(player.lane, 4, n), riserSpeed(state.level) * 0.8);
    }
    state.nextSpitter = spitterRate(state.level) * (0.8 + Math.random() * 0.4);
  }
}

// No short way round in a channel, so distance is just distance. Falling back
// to the FAR LIP rather than to "half a turn away" matters here: half a turn
// does not exist, and the far lip is the one place guaranteed to be a walk.
// a lane inside whichever bay `lane` falls in, at its far end from the middle
function bayLane(lane) {
  const [lo, hi] = tube.bayRange(lane);
  return lo + Math.random() * (hi - lo);
}

function awayFrom(lane, minGap, n) {
  for (let i = 0; i < 12; i++) {
    const c = Math.floor(Math.random() * n);
    if (Math.abs(c - lane) >= minGap) return c;
  }
  return lane < n / 2 ? n - 1 : 0;
}

// ── the frame ────────────────────────────────────────────────────────────
let last = performance.now();

function step(dt) {
  // barely moving during play: the channel is the thing you are reading
  tube.update(dt, state.mode === 'play' ? 0.35 : 1);
  pops.update(dt);

  // Polled in EVERY mode. A pad that can only be read once you are already
  // playing cannot get you there: the menu and the recap listen for a pointer
  // or Enter, so a controller alone was stranded on both screens.
  input.pollGamepad();

  if (state.banner > 0) {
    state.banner -= dt;
    if (state.banner <= 0) hud.banner.style.opacity = '0';
  }

  if (state.mode !== 'play') {
    if (input.start()) startRun();
    player.update(dt);
    return;
  }

  state.t += dt;
  const spin = input.spin();
  // STICKY: scum underfoot costs grip. Only underfoot — airborne is exempt,
  // which is what turns the jump and the float into the way ACROSS a fouled
  // stretch on every shape, not just the one with ridges in it.
  const grip = !player.airborne && scum.at(player.lane) > 0 ? STICKY : 1;
  player.move(spin, dt, grip);
  if (input.jump() && player.jump(spin)) audio.jump();
  if (input.dive() && player.dive()) audio.dive();
  player.update(dt);

  // THE SCRUB: a dive that came all the way back wipes a layer from its
  // lane. A dry dive is never wasted — but it is 0.62s lane-locked in the
  // stickiest place on the rim, which is the price of having let it foul.
  if (player.scrubReady() && scum.scrub(player.lane)) {
    state.score += 50 * state.level;
    audio.scrub();
    pops.at(player.lane, 0.02, PAL.BUBBLE);
  }

  // ── THE FLIGHT ──
  // Distance is the level now. It accrues whether you like it or not, the
  // tube streams to show it, and at MORPH_AT the channel starts BECOMING the
  // next sector's shape — timed to arrive as you do.
  state.dist += tube.speed * dt;
  const len = sectorLen(state.level);
  if (!tube.morphing && state.dist >= len * MORPH_AT && state.dist < len) {
    const remain = (len - state.dist) / tube.speed;
    tube.morphTo(sectorShape(state.level + 1), Math.max(1.5, remain));
  }
  // the seat and the rules follow the DOMINANT shape the moment it flips —
  // the camera pulls back for the bays while you watch them grow
  if (tube.shape !== lastDom) {
    lastDom = tube.shape;
    seat(lastDom);
    toast(`→ ${lastDom.toUpperCase()}`);
  }
  if (state.dist >= len) {
    audio.level();
    const bonus = 40 * state.level * scum.clean();
    state.score += bonus;
    scum.clear();
    startLevel(state.level + 1, bonus);
  }

  // ── THE GUN ──
  fireCD -= dt;
  if (input.firing() && fireCD <= 0 && !player.jumping) {
    shots.fire(player.lane, player.depth + 0.03);
    audio.fire();
    fireCD = FIRE_CD;
  }
  shots.update(dt);

  director(dt);
  const { collected, missed, struck, settled } = risers.update(dt, player);

  // Shots against everything in the tube. A bolt does not know a bubble from
  // grime — that is the tension the gun brings: the stream that clears your
  // lane also pops what you were there to collect, and popping the LIT one
  // is the chain, gone, by your own hand.
  for (const s of shots.items) {
    if (s.dead) continue;
    for (const it of risers.items) {
      if (it.dead) continue;
      if (Math.abs(it.lane - s.lane) > 0.7 || Math.abs(it.depth - s.depth) > 0.07) continue;
      s.dead = true;
      if (it.type === 'bubble') {
        it.dead = true;
        pops.at(it.lane, it.depth, PAL.BUBBLE);
        if (it.lit) { state.chain = 1; audio.miss(); toast('POPPED THE LIT ONE'); }
      } else if (--it.hp <= 0) {
        it.dead = true;
        pops.at(it.lane, it.depth, [1.2, 0.9, 0.3]);
        state.score += it.type === 'spitter' ? 250 : it.type === 'orb' ? 25 : 75;
        audio.zap();
      }
      break;
    }
  }

  // grime that got past the mouth is not gone — it settled
  for (const it of settled) scum.add(it.lane);

  // THE FLOOD: the one failure you walked into slowly. Past FLOOD_AT
  // coverage the channel washes itself — a life, the chain, and a clean rim,
  // in that order. It is the same reset a level clear gives you, paid for.
  if (scum.flooded()) {
    state.lives--;
    state.chain = 1;
    scum.clear();
    player.mercy = Math.max(player.mercy, 1.6);
    audio.washout();
    if (state.lives <= 0) gameOver();
    else toast('WASHED OUT');
  }

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
    // no quota any more: the sector ends when you have FLOWN it, and the
    // clean bonus is paid at the boundary — see the flight block above
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
tube.speed = 0.1;                 // the menu drifts: the tube is going somewhere
paintHud();

// ── the handle ───────────────────────────────────────────────────────────
// Same contract as every other cabinet here: enough to drive the game from a
// console or a headless test without touching the DOM.
window.__sj = {
  state, tube, player, risers, scum, shots, audio, camera,
  debug: {
    // lay n layers on a lane without waiting for grime to do it
    foul: (lane, n = 1) => { for (let i = 0; i < n; i++) scum.add(lane); },
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
