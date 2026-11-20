#!/usr/bin/env node
// toro.mjs — TORO's own checks, in bare node: 1.x's numbers (enemy.js:126-152,
// 590, 827-863, 2562-2662, 2726-2738, 3033-3034; main.js:2415, 5036, 9419,
// 10886-10906; tuning.js:29, 64-80; arena.js:48-53, 62-67), asserted against
// the sim on its fixed 1/60 s step. The cycle is checked against an ORACLE:
// 1.x's own per-frame arithmetic for the TORO case of update() and the
// squash spring after it (with 1.x's literals, not the tuning file's), run
// from the same idle clocks, so every step's state, position, spin, yaw and
// squash must match 1.x's frame for frame. Then what 2.0's core changes
// around it: an elite's line (the core holds a body its own radius in), a
// knock carried, the current's drift under a fixed arrow, the PUSH and CUT
// test dashes against a charging wheel, and the dying view's swell.
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=158';
import { makeRng } from '../../js/sim/rng.js?v=158';
import { TUNING as T } from '../../js/tuning.js?v=158';
import look from '../../js/render/looks/toro.js?v=158';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.toro, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const evs = (w, type) => w.events.filter((e) => e.type === type);

// A world with one TORO (anchored: no swarm forces, no crowd, so only its own
// step moves it), the hero standing at `hero`, never running out of lives.
// `rng` is a copy of the run's seeded stream from just before the spawn, so
// the oracle can draw the same idle clocks.
function world({ seed = 1, x = 10, z = 0, o = {}, hero = [0, 0], mortal = false, arena } = {}) {
  const w = createWorld({ seed, mode: 'arcade', ...(arena ? { arena } : {}) });
  w.director = { step() {} };
  if (!mortal) w.hero.lives = 1e9;
  w.hero.x = w.hero.px = hero[0]; w.hero.z = w.hero.pz = hero[1];
  const rng = makeRng(0); rng.state = w.rng.state;
  const g = api.spawn(w, 'toro', x, z, o);
  g.anchored = true;
  return { w, g, rng };
}
const run = (w, n) => { for (let i = 0; i < n; i++) step(w, IDLE); };
const until = (w, g, state, max = 2000) => { for (let i = 0; i < max && g.s.state !== state; i++) step(w, IDLE); return g.s.state === state; };

// 1.x's TORO, frame by frame (enemy.js:2562-2647, then the squash spring
// 2726-2730; a bullet hit lands after the update, enemy.js:1607), in 1.x's
// literals, on the landscape arena (halfX 19, halfZ 11), the hero standing still
function oracle(steps, { x, z, rng, hero = [0, 0], hx = 19, hz = 11, hits = new Set() }) {
  let state = 'idle', idleT = 1.5 + rng.next() * 2, stateT = 0, dir = { x: 1, z: 0 }, spd = 0, spin = 0, yaw = 0;
  let sq = 1, sqV = 0, tx = x, tz = z, len = 0;
  const out = [null];
  for (let i = 1; i <= steps; i++) {
    const ddx = hero[0] - x, ddz = hero[1] - z, dist = Math.hypot(ddx, ddz) || 0.001;
    const BX = hx - 1.0, BZ = hz - 1.0;
    switch (state) {
      case 'idle':
        if (dist > 2) { x += (ddx / dist) * 0.8 * dt; z += (ddz / dist) * 0.8 * dt; yaw = Math.atan2(-ddz, ddx); }
        idleT -= dt;
        if (idleT <= 0) {
          state = 'revving'; stateT = 1.6;
          const dl = Math.hypot(ddx, ddz) || 1;
          const snap = 45 * Math.PI / 180, ang = Math.round(Math.atan2(ddz / dl, ddx / dl) / snap) * snap;
          dir = { x: Math.cos(ang), z: Math.sin(ang) };
          yaw = Math.atan2(-dir.z, dir.x);
        }
        break;
      case 'revving':
        stateT -= dt;
        spin += (3 + (1.6 - Math.max(stateT, 0)) * 8) * dt;
        if (stateT <= 0) {
          state = 'telegraphing'; stateT = 0.5;
          const ex = dir.x > 0 ? (BX - x) / dir.x : dir.x < 0 ? (-BX - x) / dir.x : Infinity;
          const ez = dir.z > 0 ? (BZ - z) / dir.z : dir.z < 0 ? (-BZ - z) / dir.z : Infinity;
          len = Math.max(0.5, Math.min(ex, ez)); tx = x; tz = z;
        }
        break;
      case 'telegraphing':
        stateT -= dt;
        if (stateT <= 0) { state = 'dashing'; spd = 22; }
        break;
      case 'dashing':
        spd = Math.max(spd - 8 * dt, 14);
        x += dir.x * spd * dt; z += dir.z * spd * dt;
        spin += (spd / (1.0 * 0.68)) * dt;
        if (Math.abs(x) > BX || Math.abs(z) > BZ) {
          x = Math.max(-BX, Math.min(BX, x)); z = Math.max(-BZ, Math.min(BZ, z));
          state = 'recovering'; stateT = 0.8; sqV -= 0.5;
        }
        break;
      case 'recovering':
        stateT -= dt;
        if (stateT <= 0) { state = 'idle'; idleT = 1.0 + rng.next() * 1.5; }
        break;
    }
    sqV = (sqV - (sq - 1) * 0.18) * 0.90;
    sq = Math.max(0.55, Math.min(1.55, sq + sqV));
    if (hits.has(i)) sqV -= 0.75;
    out.push({ state, x, z, spin, yaw, sq, sqV, tx, tz, len, dir: { ...dir }, stateT, spd });
  }
  return out;
}

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 1.0, hp 6, speed 5.0, blue 0x4488cc, no bullets, no interval (1.x enemy.js:590)',
    S.radius === 1.0 && S.hp === 6 && S.speed === 5.0 && S.color === 0x4488cc && S.bulletColor === null && S.fireInterval === null);
  check('its own body, contact damage in classic, COMMIT, not a biter (1.x enemy.js:652, main.js:2415, tuning.js:293, 306, 496-497)',
    S.family === 'custom' && S.contact === true && S.role === 'COMMIT' && S.revenge === null && S.deathLabel === 'Toro charger');
  const C = T.movement.roles.COMMIT;
  check('COMMIT is 1.x\'s: the wave\'s current at 0.15 and nothing else (1.x tuning.js:293)', C.current === 0.15 && C.dodge === 0 && C.flock === 0 && C.weave === 0);
  check('idle 1.5 + U(0, 2) at first, 1.0 + U(0, 1.5) after; creep 0.8 beyond 2 (1.x enemy.js:862, 2571-2572, 2642)',
    S.firstIdle[0] === 1.5 && S.firstIdle[1] === 2 && S.nextIdle[0] === 1.0 && S.nextIdle[1] === 1.5 && S.creep === 0.8 && S.creepStop === 2);
  check('TUNING.toro: rev 1.6, telegraph 0.5, dash 22 → 14 at 8 u/s², 45° snap, recover 0.8 (1.x tuning.js:65-67, 80)',
    S.revTime === 1.6 && S.telegraphTime === 0.5 && S.dashSpeed === 22 && S.dashMin === 14 && S.dashDecel === 8 && S.dirSnapDeg === 45 && S.recoverTime === 0.8);
  check('spin 3 + 8 × rev, rolling on the 0.68 rim; wall kick −0.5; arrow ≥ 0.5 (1.x enemy.js:2594, 2602, 2624, 2632)',
    S.spin.revBase === 3 && S.spin.revGain === 8 && S.rim === 0.68 && S.wallSquash === -0.5 && S.minArrow === 0.5);
  check('the non-blob squash spring 0.18 / 0.90, held to 0.55..1.55 (1.x enemy.js:2728-2730)',
    S.squash.spring === 0.18 && S.squash.damp === 0.90 && S.squash.min === 0.55 && S.squash.max === 1.55);
  check('dash-touch shake 0.27; death 8 chunks of 0.25; the toro death sound (1.x main.js:10897, enemy.js:3033-3034, audio.js:245)',
    S.dashContactShake === 0.27 && S.deathChunks.count === 8 && S.deathChunks.size === 0.25
    && S.deathSound.f0 === 95 && S.deathSound.f1 === 38 && S.deathSound.dur === 0.45 && S.deathSound.vol === 0.36 && S.deathSound.wave === 'sawtooth');
  const L = S.look;
  check('the wheel: tube 0.30, 8 × 4-sided spikes 0.20 × 0.70 sunk 0.10, hub 0.13 × 0.16, 3 spokes 0.09 (1.x tuning.js:75-78, enemy.js:129-151)',
    L.tube === 0.30 && L.tyreSegs[0] === 8 && L.tyreSegs[1] === 18 && L.rimSpikes === 8 && L.spike.base === 0.20 && L.spike.length === 0.70
    && L.spike.sink === 0.10 && L.spike.sides === 4 && L.hub.r === 0.13 && L.hub.depth === 0.16 && L.hub.sides === 12
    && L.spokes.count === 3 && L.spokes.w === 0.09 && L.spokes.d === 0.09 && L.spokes.inset === 0.35);
  check('the satin `toro` family: roughness 0.10, transmission 0.25, wobble 0.35 (1.x tuning.js:29, enemy.js:322)',
    L.roughness === 0.10 && L.transmission === 0.25 && L.wobble === 0.35);
  check('the arrow: 0xff2200, 0.34 × 0.04 shaft, a 3-sided 0.5 × 0.9 head at y 0.03, 0.7 / 0.15 on sin(25 t) (1.x tuning.js:68-69, enemy.js:840-856, 2612)',
    L.indicator.color === 0xff2200 && L.indicator.width === 0.34 && L.indicator.thick === 0.04 && L.indicator.y === 0.03
    && L.indicator.arrow.radius === 0.5 && L.indicator.arrow.length === 0.9 && L.indicator.arrow.sides === 3
    && L.indicator.flashRate === 25 && L.indicator.opacity[0] === 0.7 && L.indicator.opacity[1] === 0.15 && L.indicator.opacity0 === 0.55);
  check('the rev glow ramps to 0x33 green, half that blue; anchored squats 1.25 / 0.8 (1.x enemy.js:2659-2662, main.js:9419)',
    L.revGlow === 0x33 && L.revGlowBlue === 0.5 && L.anchored.xz === 1.25 && L.anchored.y === 0.8);
  const src = readFileSync(new URL('../../js/sim/species/toro.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
}

// ── the whole cycle, frame for frame against 1.x ──────────────────────
{
  const N = 60 * 16;
  for (const [x, z, hero, label] of [[10, 0, [0, 0], 'straight in'], [-6, 7, [3, -2], 'from the top left'], [14, -8, [0, 3], 'from the bottom right']]) {
    const { w, g, rng } = world({ seed: 7, x, z, hero });
    check(`(${label}) the first idle clock is 1.5 + U(0, 2)`, g.s.idleT >= 1.5 && g.s.idleT < 3.5, `${g.s.idleT}`);
    const want = oracle(N, { x, z, rng, hero });
    let bad = null;
    const seen = new Set(['idle']);
    for (let i = 1; i <= N && !bad; i++) {
      step(w, IDLE);
      const o = want[i], s = g.s;
      seen.add(s.state);
      if (s.state !== o.state || !near(g.x, o.x) || !near(g.z, o.z) || !near(s.spin, o.spin, 1e-7) || !near(s.yaw, o.yaw)
        || !near(g.sq, o.sq, 1e-9) || !near(g.sqV, o.sqV, 1e-9)) bad = `step ${i}: ${s.state}/${o.state} x ${g.x}/${o.x} z ${g.z}/${o.z} spin ${s.spin}/${o.spin} sq ${g.sq}/${o.sq}`;
      if (!bad && s.state === 'telegraphing' && (!near(s.len, o.len) || !near(s.tx, o.tx) || !near(s.tz, o.tz))) bad = `step ${i}: arrow ${s.len}/${o.len}`;
    }
    check(`(${label}) state, position, spin, yaw and squash match 1.x every step for 16 s`, !bad, bad || '');
    check(`(${label}) … through every state, and more than one dash`, ['idle', 'revving', 'telegraphing', 'dashing', 'recovering'].every((k) => seen.has(k)) && g.s.dashes >= 2, `${[...seen]} ${g.s.dashes}`);
  }
  // with hits: the squash is 1.x's non-blob spring, a hit kicking it after the update
  {
    const { w, g, rng } = world({ seed: 3, x: 10, z: 0 });
    const hitSteps = [], N2 = 60 * 7;
    // shots at the wheel's centre land on the next step; fire one in the rev, one in the dash, one at rest
    const plan = new Map();
    const want0 = oracle(N2, { x: 10, z: 0, rng: (() => { const r = makeRng(0); r.state = rng.state; return r; })() });
    const firstIn = (st, k = 0) => want0.findIndex((o, i) => o && o.state === st && i > k);
    for (const i of [firstIn('revving') + 10, firstIn('dashing') + 5, firstIn('recovering') + 2]) plan.set(i - 1, true);
    let bad = null;
    for (let i = 1; i <= N2 && !bad; i++) {
      step(w, IDLE);
      if (evs(w, 'hit').length) hitSteps.push(i);
      if (plan.has(i)) api.heroBullet(w, g.x, g.z, 0);
    }
    const want = oracle(N2, { x: 10, z: 0, rng, hits: new Set(hitSteps) });
    // replay to compare (the hits do not change where it goes, only its squash)
    const r2 = world({ seed: 3, x: 10, z: 0 });
    for (let i = 1; i <= N2 && !bad; i++) {
      step(r2.w, IDLE);
      if (plan.has(i)) api.heroBullet(r2.w, r2.g.x, r2.g.z, 0);
      const o = want[i];
      if (!near(r2.g.sq, o.sq, 1e-9) || !near(r2.g.sqV, o.sqV, 1e-9) || !near(r2.g.x, o.x)) bad = `step ${i}: sq ${r2.g.sq}/${o.sq} sqV ${r2.g.sqV}/${o.sqV}`;
    }
    check('three hits land (rev, dash, recovery), 6 − 3 hp left', hitSteps.length === 3 && g.hp === 3, `${hitSteps} hp ${g.hp}`);
    check('the squash spring is 1.x\'s 0.18 / 0.90 (not the blob 0.24 / 0.86): hits and the wall kick, step for step', !bad, bad || '');
    check('… and the wall kick squashes it to the floor of the spring, 0.55', want.some((o) => o && near(o.sq, 0.55)) && r2.g.sq >= 0.55);
  }
}

// ── the dash line: snapped to 45° ─────────────────────────────────────
{
  for (const [deg, snapped] of [[0, 0], [20, 0], [22.4, 0], [22.6, 45], [30, 45], [67.4, 45], [67.6, 90], [100, 90], [135, 135], [-20, 0], [-30, -45], [-100, -90], [160, 180], [-160, -180]]) {
    const a = (deg * Math.PI) / 180;
    const { w, g } = world({ x: 0, z: 0, hero: [Math.cos(a) * 8, Math.sin(a) * 8] });
    g.s.idleT = 1e-9;
    step(w, IDLE);
    const got = Math.atan2(g.s.dirZ, g.s.dirX), b = (snapped * Math.PI) / 180;
    check(`the way to a hero at ${deg}° dashes at ${snapped}°`, g.s.state === 'revving' && angDiff(got, b) < 1e-12 && near(Math.hypot(g.s.dirX, g.s.dirZ), 1),
      `${(got * 180 / Math.PI).toFixed(3)}`);
    check(`… and turns the wheel to it (local +x along the line) at ${deg}°`, near(Math.cos(g.s.yaw), g.s.dirX, 1e-12) && near(-Math.sin(g.s.yaw), g.s.dirZ, 1e-12));
  }
}

// ── the arrow is exact, and the dash ends where it points ─────────────
{
  const cases = [
    ['straight left, landscape', { x: 10, z: 0, hero: [0, 0] }, -18, null],
    ['diagonal, landscape', { x: 0, z: 0, hero: [5, 5] }, null, 10],
    ['down, portrait', { x: 0, z: -5, hero: [0, 3], arena: T.arena.portrait }, null, 17],
  ];
  for (const [label, o, endX, endZ] of cases) {
    const { w, g } = world(o);
    g.s.idleT = 1e-9;
    check(`(${label}) set-up: telegraphing`, until(w, g, 'telegraphing'));
    const s = g.s, bx = w.hx - 1, bz = w.hz - 1;
    const ex = s.dirX > 1e-9 ? (bx - s.tx) / s.dirX : s.dirX < -1e-9 ? (-bx - s.tx) / s.dirX : Infinity;
    const ez = s.dirZ > 1e-9 ? (bz - s.tz) / s.dirZ : s.dirZ < -1e-9 ? (-bz - s.tz) / s.dirZ : Infinity;
    check(`(${label}) the arrow runs from where it stands to the wall one CFG radius in`, near(s.len, Math.min(ex, ez), 1e-6) && s.tx === g.x && s.tz === g.z, `${s.len} ${Math.min(ex, ez)}`);
    const tipX = s.tx + s.dirX * s.len, tipZ = s.tz + s.dirZ * s.len;
    const tell = evs(w, 'tell')[0];
    check(`(${label}) it says so: a tell event with the line and its length`, tell && tell.id === g.id && near(tell.len, s.len) && near(tell.dx, s.dirX));
    const x0 = g.x, z0 = g.z;
    let moved = 0;
    for (let i = 0; i < 40 && g.s.state === 'telegraphing'; i++) { step(w, IDLE); moved += Math.hypot(g.x - x0, g.z - z0); }
    check(`(${label}) no movement while the arrow shows`, moved === 0);
    check(`(${label}) dash`, until(w, g, 'recovering'));
    const along = (g.x - s.tx) * s.dirX + (g.z - s.tz) * s.dirZ;
    check(`(${label}) the dash stops on the line the arrow measured to`,
      (endX == null || near(g.x, endX)) && (endZ == null || near(g.z, endZ)) && Math.abs(g.x) <= bx && Math.abs(g.z) <= bz, `${g.x} ${g.z}`);
    check(`(${label}) … at the arrow's tip, give or take its last step`, Math.hypot(g.x - tipX, g.z - tipZ) <= 14 * dt * 1.01 && along >= s.len - 1e-9 - 14 * dt,
      `${Math.hypot(g.x - tipX, g.z - tipZ)}`);
  }
  // pinned to the wall it would hit at once: the arrow is the 0.5 floor
  const { w, g } = world({ x: -18, z: 0, hero: [-25, 0] });
  g.s.idleT = 1e-9;
  until(w, g, 'telegraphing');
  check('an arrow into the wall it stands at is the 0.5 floor', g.s.len === 0.5 && g.s.dirX === -1);
  step(w, IDLE);
  run(w, 31);
  check('… and the dash ends on its first step there', g.s.state === 'recovering' && near(g.x, -18));

  // an elite (r 1.2): 2.0's core holds it 1.2 in, so its line is 1.2 in and
  // the arrow still ends exactly where it stops (1.x: CFG 1.0, which 1.x let
  // it reach; see sim/species/toro.js inset())
  {
    const { w, g } = world({ x: 10, z: 0, hero: [0, 0], o: { variant: 'elite' } });
    g.s.idleT = 1e-9;
    until(w, g, 'telegraphing');
    const s = g.s, tipX = s.tx + s.dirX * s.len;
    check('an elite\'s arrow runs to the wall less its own 1.2', s.dirX === -1 && near(tipX, -(w.hx - 1.2), 1e-9), `${tipX}`);
    let pinned = 0;
    for (let i = 0; i < 400 && g.s.state !== 'recovering'; i++) { step(w, IDLE); if (g.s.state === 'dashing' && near(Math.abs(g.x), w.hx - 1.2)) pinned++; }
    check('… and its dash stops at the arrow\'s tip, never pinned at the wall a step first', g.s.state === 'recovering' && near(g.x, tipX, 1e-9) && pinned === 0, `${g.x} pinned ${pinned}`);
  }
}

// ── the dash: 22 → 14 at 8 u/s², along the line, rolling ──────────────
{
  const { w, g } = world({ x: 12, z: 0, hero: [0, 0] });
  g.s.idleT = 1e-9;
  until(w, g, 'dashing');
  const steps = [], spins = [];
  let px = g.x, ps = g.s.spin;
  for (let i = 0; i < 70 && g.s.state === 'dashing'; i++) { step(w, IDLE); steps.push(px - g.x); spins.push(g.s.spin - ps); px = g.x; ps = g.s.spin; }
  check('the first step of the dash moves 22 − 8/60 u/s (the brake before the move)', near(steps[0], (22 - 8 * dt) * dt, 1e-12), `${steps[0] / dt}`);
  check('it slows 8 u/s every second to the 14 floor, reached at 1.0 s', steps.slice(0, 59).every((d, k) => near(d, (22 - 8 * dt * (k + 1)) * dt, 1e-9))
    && near(steps[60] / dt, 14, 1e-9) && near(steps[64] / dt, 14, 1e-9));
  check('it rolls for real: spin speed / 0.68', spins.slice(0, 60).every((d, k) => near(d, ((steps[k] / dt) / 0.68) * dt, 1e-9)));
  check('rolling (local +x along travel; the top of the wheel moves forward)', near(g.s.yaw, Math.PI) || near(Math.abs(g.s.yaw), Math.PI));

  // the rev: 3 → 15.8 rad/s, no movement
  const r = world({ x: 12, z: 0, hero: [0, 0] });
  r.g.s.idleT = 1e-9;
  step(r.w, IDLE);
  const x0 = r.g.x, rates = [];
  let s0 = r.g.s.spin;
  while (r.g.s.state === 'revving') { step(r.w, IDLE); rates.push((r.g.s.spin - s0) / dt); s0 = r.g.s.spin; }
  check('the rev winds the spin from 3 rad/s …', near(rates[0], 3 + 8 * dt, 1e-9), `${rates[0]}`);
  check('… to 15.8 on its last step, with no movement', near(rates[rates.length - 1], 15.8, 1e-9) && r.g.x === x0, `${rates[rates.length - 1]}`);
  const sp = r.g.s.spin;
  run(r.w, 20);
  check('the wheel freezes at its last angle through the telegraph', r.g.s.state === 'telegraphing' && r.g.s.spin === sp);
}

// ── the creep: 0.8 u/s beyond 2, whatever the wave ─────────────────────
{
  const far = world({ x: 6, z: 0 });
  far.g.s.idleT = 1e9;
  step(far.w, IDLE);
  check('idle and far: it creeps straight at you at 0.8 u/s', near(6 - far.g.x, 0.8 * dt, 1e-12) && far.g.z === 0);
  run(far.w, 600);
  check('… and stops once it is within 2', far.g.x <= 2 && far.g.x > 2 - 0.8 * dt, `${far.g.x}`);
  const x1 = far.g.x;
  run(far.w, 120);
  check('… and holds there', far.g.x === x1);
  const near2 = world({ x: 1.9, z: 0 });
  near2.g.s.idleT = 1e9;
  run(near2.w, 60);
  check('idle within 2: it does not move', near2.g.x === 1.9);

  // CFG speed is read by nothing: not the wave's speedMult, SWIFT or a SIREN's surge
  const fast = world({ x: 12, z: 0, o: { speedMult: 2.4, affix: 'swift' } });
  fast.g.surgeT = 99; fast.g.surgeMult = 1.6;
  fast.g.s.idleT = 1e9;
  step(fast.w, IDLE);
  check('speedMult 2.4, SWIFT and a surge leave the creep at 0.8', near(12 - fast.g.x, 0.8 * dt, 1e-12));
  fast.g.s.idleT = 1e-9;
  until(fast.w, fast.g, 'dashing');
  let px = fast.g.x;
  step(fast.w, IDLE);
  check('… and the dash at 22', near(px - fast.g.x, (22 - 8 * dt) * dt, 1e-12));

  // a PUSH dash's knock (g.kx) moves it on top of its own step, and it is
  // carried: it creeps on from where the knock left it, never back
  const a = world({ x: 10, z: 0 }), b = world({ x: 10, z: 0 });
  a.g.s.idleT = b.g.s.idleT = 1e9;
  b.g.kx = 6;
  let want = 0, kx = 6;
  for (let i = 0; i < 90; i++) { step(a.w, IDLE); step(b.w, IDLE); kx *= Math.exp(-T.gel.knockFriction * dt); want += kx * dt; }
  check('a knock is carried, not thrown away (it creeps on from where it was shoved)', near(b.g.x - a.g.x, want, 1e-9) && want > 1, `${b.g.x - a.g.x} vs ${want}`);
}

// ── the wave's current drifts it through the rev and the telegraph, and
// the arrow stays where it was laid (1.x: COMMIT current 0.15, species-a §10.4 trap 13)
{
  const w = createWorld({ seed: 5, mode: 'arcade' });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  const g = api.spawn(w, 'toro', 8, 2);
  g.s.idleT = 1e-9;
  until(w, g, 'telegraphing');
  const tx = g.s.tx, tz = g.s.tz, len = g.s.len, x0 = g.x, z0 = g.z;
  run(w, 20);
  check('the current drifts it while the arrow shows …', g.s.state === 'telegraphing' && Math.hypot(g.x - x0, g.z - z0) > 1e-3, `${Math.hypot(g.x - x0, g.z - z0)}`);
  check('… at no more than COMMIT\'s share of the current', Math.hypot(g.x - x0, g.z - z0) <= 20 * dt * 0.15 * 1.2 + 1e-9);
  check('… and the arrow stays where it was laid', g.s.tx === tx && g.s.tz === tz && g.s.len === len);
}

// ── the tell the body wears: the rev's progress ───────────────────────
{
  const { w, g } = world({ x: 10, z: 0 });
  const tells = { idle: [], revving: [], telegraphing: [], dashing: [], recovering: [] };
  for (let i = 0; i < 60 * 9; i++) { step(w, IDLE); tells[g.s.state].push([g.tell, g.s.stateT]); }
  check('no tell while it idles, telegraphs, dashes or recovers',
    ['idle', 'telegraphing', 'dashing', 'recovering'].every((k) => tells[k].length && tells[k].every(([t]) => t === 0)));
  check('through the rev, g.tell is 1.x\'s ramp (1.6 − time left) / 1.6, rising to ~1',
    tells.revving.length && tells.revving.every(([t, st]) => near(t, (1.6 - Math.max(st, 0)) / 1.6, 1e-12))
    && tells.revving.every(([t], k) => k === 0 || t > tells.revving[k - 1][0] || tells.revving[k - 1][0] > 0.98)   // a new rev starts low
    && tells.revving.filter(([t]) => t > 0.98).length >= 2);
}

// ── hits and the touch ────────────────────────────────────────────────
{
  const { w, g } = world({ x: 6, z: 0 });
  g.s.idleT = 1e9;
  let kills = 0;
  for (let k = 0; k < 6; k++) { api.heroBullet(w, g.x - 1, g.z, 0); step(w, IDLE); kills += evs(w, 'kill').length; if (k < 5) check(`hit ${k + 1} does not kill it (hp ${6 - k - 1} left)`, g.alive && g.hp === 5 - k); }
  check('six hits kill it, in the 1.0 circle (no special hits)', !g.alive && kills === 1);
  const e = world({ o: { variant: 'elite' } }).g, el = world({ o: { variant: 'elitelite' } }).g;
  check('an elite has 12 hp and a 1.2 circle; an elitelite 9 hp (1.x main.js:9402-9411)', e.hp === 12 && near(e.r, 1.2) && el.hp === 9 && el.r === 1.0);
  // a bullet just inside 1.0 + 0.15 lands, just outside does not
  const a = world({ x: 6, z: 0 }), b = world({ x: 6, z: 0 });
  a.g.s.idleT = b.g.s.idleT = 1e9;
  a.w.bullets.push({ x: 6, z: 1.14, px: 6, pz: 1.14, vx: 0, vz: 0, speed: 0, r: 0.15, life: 1, hero: true, color: 0, src: null, revenge: false, homing: 0, grazed: false, dead: false });
  b.w.bullets.push({ x: 6, z: 1.16, px: 6, pz: 1.16, vx: 0, vz: 0, speed: 0, r: 0.15, life: 1, hero: true, color: 0, src: null, revenge: false, homing: 0, grazed: false, dead: false });
  a.w.heroBullets = b.w.heroBullets = 1;
  step(a.w, IDLE); step(b.w, IDLE);
  check('the hit circle is 1.0 (+ the bullet\'s 0.15), whatever the wheel\'s yaw', a.g.hp === 5 && b.g.hp === 6);

  // contact: within 1.0 + 0.5
  const t1 = world({ x: 1.49, z: 0, mortal: true }), t2 = world({ x: 1.51, z: 0, mortal: true });
  t1.g.s.idleT = t2.g.s.idleT = 1e9;
  step(t1.w, IDLE); step(t2.w, IDLE);
  check('touching it hurts: inside 1.5, not outside (1.x main.js:10894)', t1.w.hero.lives === 2 && t2.w.hero.lives === 3);
  check('… and an idle touch does not shake', evs(t1.w, 'shake').length === 0 && evs(t1.w, 'hurt').length === 1);

  // a dash runs through you: it hurts, shakes, and carries on to the wall
  const d = world({ x: 10, z: 0, mortal: true });
  d.g.s.idleT = 1e-9;
  until(d.w, d.g, 'dashing');
  let hurtAt = null, shake = null;
  for (let i = 0; i < 200 && d.g.s.state === 'dashing'; i++) {
    step(d.w, IDLE);
    if (evs(d.w, 'hurt').length) { hurtAt = d.g.x; shake = evs(d.w, 'shake')[0]; }
  }
  check('a dash through you hurts, once (mercy)', hurtAt != null && d.w.hero.lives === 2);
  check('… and a non-fatal touch mid-dash shakes the camera 0.27 (1.x main.js:10897)', shake && shake.amount === 0.27 && shake.id === d.g.id);
  check('… and it never stops for you: on to the far wall', d.g.s.state === 'recovering' && near(d.g.x, -18));
  const f = world({ x: 10, z: 0, mortal: true });
  f.w.hero.lives = 1;
  f.g.s.idleT = 1e-9;
  until(f.w, f.g, 'dashing');
  let shakes = 0;
  for (let i = 0; i < 200 && !f.w.over; i++) { step(f.w, IDLE); shakes += evs(f.w, 'shake').length; }
  check('the fatal touch does not add the dash shake (1.x: `!died`)', f.w.over && shakes === 0 && f.w.killedBy === 'toro');
}

// ── the test dashes (TUNING.hero.push / .cut): a charging TORO meets them ─
{
  // CUT (owner, 2026-10-22: "dashes that go through and do damage"): the hero
  // dashes through a charging TORO — no hurt (a dash is invincible), the cut's
  // hits land once, and the TORO is committed: on to the far wall all the same
  const w = createWorld({ seed: 1, mode: 'arcade', dashMode: 'cut' });
  w.director = { step() {} };
  const g = api.spawn(w, 'toro', 10, 0);
  g.anchored = true;
  g.s.idleT = 1e-9;
  until(w, g, 'dashing');
  let dashed = false, cuts = 0;
  for (let i = 0; i < 300 && g.s.state === 'dashing'; i++) {
    const go = !dashed && g.x - w.hero.x < 4;
    if (go) dashed = true;
    step(w, go ? { ...IDLE, mx: 1, dash: true } : IDLE);
    cuts += evs(w, 'dashCut').length;
  }
  check('a CUT dash through a charging TORO: no hurt, the cut lands once (6 − 2 hp)', dashed && w.hero.lives === T.hero.lives && cuts === 1 && g.hp === 6 - T.hero.cut.hits && g.alive, `lives ${w.hero.lives} cuts ${cuts} hp ${g.hp}`);
  check('… and the TORO carries on to the far wall', g.s.state === 'recovering' && near(g.x, -(w.hx - 1)));

  // PUSH: the shove knocks a charging TORO off its line; it still ends at a wall
  const p = createWorld({ seed: 1, mode: 'arcade', dashMode: 'push' });
  p.director = { step() {} };
  p.hero.lives = 1e9;
  const q = api.spawn(p, 'toro', 10, 0);
  q.s.idleT = 1e-9;
  until(p, q, 'dashing');
  p.hero.z = 0.8; p.hero.pz = 0.8;
  let shoved = 0, pushed = false;
  for (let i = 0; i < 300 && q.s.state === 'dashing'; i++) {
    const go = !pushed && q.x - p.hero.x < 3;
    if (go) pushed = true;
    step(p, go ? { ...IDLE, mx: 1, dash: true } : IDLE);
    shoved += evs(p, 'shove').length;
  }
  check('a PUSH dash shoves a charging TORO off its line, and it still stops at a wall', shoved >= 1 && Math.abs(q.z) > 0.05
    && q.s.state === 'recovering' && (near(Math.abs(q.x), p.hx - 1, 0.01) || near(Math.abs(q.z), p.hz - 1, 0.01)), `${shoved} ${q.x} ${q.z} ${q.s.state}`);   // the knock's tail moves it on after its own clamp
}

// ── the look: the wheel, the squash, the glow, the arrow ──────────────
{
  let matArgs = null;
  const ctx = { THREE, TSL: null, GEL_TIME: { value: 0 }, T, S, scene: new THREE.Scene(), geo: {},
    gelMaterial: (hex, fam, r, o) => {
      matArgs = [hex, fam, r, o];
      const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color();
      m.gel = { hit: { value: 0 }, tear: { value: 0 }, hitDir: { value: new THREE.Vector2() } };
      return m;
    } };
  const v = { kind: 'toro', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
  v.squash.add(v.body); v.root.add(v.squash);
  check('the look builds its own body, one gel of 1.x\'s toro family (uRadius 1.0, wobble 0.35, roughness 0.10, transmission 0.25)',
    v.own === true && matArgs[0] === 0x4488cc && matArgs[1] === 'toro' && matArgs[2] === 1.0 && matArgs[3].wobble === 0.35
    && near(v.mat.roughness, 0.10) && near(v.mat.transmission, 0.25) && v.mesh.material === v.mat);
  check('no hit ripple and no death thrash (1.x: blob bodies only) — the core sees no gel handle, the look keeps it', v.mat.gel === undefined && v.gel && v.gel.hit);

  // the wheel geometry: tyre, eight spikes to 1.58, hub, spokes, one draw
  const pos = v.mesh.geometry.getAttribute('position');
  let rMax = 0, zMax = 0;
  const tips = new Set();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), r = Math.hypot(x, y);
    rMax = Math.max(rMax, r); zMax = Math.max(zMax, Math.abs(pos.getZ(i)));
    if (near(r, 1.58, 1e-5)) tips.add(Math.round((Math.atan2(y, x) * 180) / Math.PI));
  }
  const sum = (geos) => geos.reduce((n, g) => n + (g.index ? g.toNonIndexed() : g).getAttribute('position').count, 0);
  const expect = sum([new THREE.TorusGeometry(0.68, 0.30, 8, 18), ...Array.from({ length: 8 }, () => new THREE.ConeGeometry(0.20, 0.70, 4)),
    new THREE.CylinderGeometry(0.13, 0.13, 0.16, 12), ...Array.from({ length: 3 }, () => new THREE.BoxGeometry(0.09, 1.15, 0.09))]);
  check('the wheel is one merged geometry of tyre + 8 spikes + hub + 3 spokes', pos.count === expect && !v.mesh.geometry.index, `${pos.count} vs ${expect}`);
  check('the sawblade: 8 tips at 1.58, every 45°, in the wheel\'s plane', near(rMax, 1.58, 1e-5) && tips.size === 8
    && [0, 45, 90, 135, 180, -135, -90, -45].every((a) => tips.has(a) || (a === 180 && tips.has(-180))), `${[...tips]}`);
  check('… across the axle no wider than the tyre (0.30)', near(zMax, 0.30, 1e-6));
  let spokeHit = 0;
  for (let i = 0; i < pos.count; i++) if (near(Math.hypot(pos.getX(i), pos.getY(i)), Math.hypot(0.045, 0.575), 1e-6)) spokeHit++;
  check('the spokes are 2 × (0.68 − 0.35 × 0.30) = 1.15 long, 0.09 square', spokeHit > 0);

  const { w, g } = world({ x: 10, z: 0, hero: [0, 0] });
  v.root.position.set(g.x, 0, g.z);
  look.update(v, g, w, 0, 1);
  v.root.updateMatrixWorld(true);
  const wp = new THREE.Vector3().setFromMatrixPosition(v.axle.matrixWorld);
  check('the wheel stands upright with its centre at 1.0 (the CFG radius)', near(wp.y, 1.0) && near(wp.x, 10) && v.axle.position.y === 1.0);
  check('no arrow while it idles', !v.ind.visible);
  // squash: about the axle, (1/√sq, sq, 1/√sq), the view's floor squash undone
  g.sq = 0.7;
  v.squash.scale.set(1 / Math.sqrt(g.sq), g.sq, 1 / Math.sqrt(g.sq));   // what the view does
  look.update(v, g, w, 0, 1);
  v.root.updateMatrixWorld(true);
  const p2 = new THREE.Vector3(), q2 = new THREE.Quaternion(), s2 = new THREE.Vector3();
  v.axle.matrixWorld.decompose(p2, q2, s2);
  check('1.x\'s squash scales the wheel about its axle: centre still at 1.0, scale (1/√sq, sq, 1/√sq)',
    near(p2.y, 1.0, 1e-9) && near(s2.y, 0.7, 1e-9) && near(s2.x, 1 / Math.sqrt(0.7), 1e-9) && near(s2.z, 1 / Math.sqrt(0.7), 1e-9));
  g.sq = 1; v.squash.scale.set(1, 1, 1);
  // a body swelling into being grows from the floor
  look.update(v, g, w, 0, 0.5);
  check('while it swells into being it grows from the floor', near(v.axle.position.y, 0.5) && near(v.mesh.scale.x, 0.5));
  look.update(v, g, w, 0, 1);

  // the rev: turned to the line, spinning, glowing black → 0x003319
  g.s.idleT = 1e-9;
  step(w, IDLE); step(w, IDLE);
  look.update(v, g, w, 0, 1);
  check('revving: the wheel turns to its line and spins about the axle by the sim\'s angle',
    v.axle.rotation.y === g.s.yaw && v.wheel.rotation.z === -g.s.spin && g.s.spin > 0);
  g.tell = 1; look.update(v, g, w, 0, 1);
  check('the rev glow at full ramp is 0x003319 (1.x enemy.js:2660-2662)', v.mat.emissive.getHex() === 0x003319, v.mat.emissive.getHex().toString(16));
  g.tell = 0.5; look.update(v, g, w, 0, 1);
  check('… half way it is (25 << 8) | 12', v.mat.emissive.getHex() === ((25 << 8) | 12), v.mat.emissive.getHex().toString(16));
  v.mat.emissive.setScalar(0.6); g.flash = 0.1; g.tell = 1; look.update(v, g, w, 0, 1);
  check('… and the hit flash outranks it', v.mat.emissive.r === 0.6);
  g.flash = 0;

  // the telegraph: the arrow from where it stood to exactly where the dash will stop
  until(w, g, 'telegraphing');
  v.root.position.set(g.x, 0, g.z);
  look.update(v, g, w, 0, 1);
  v.root.updateMatrixWorld(true);
  const s = g.s, tip = v.arrow.localToWorld(new THREE.Vector3(0, 0, 0)), start = v.shaft.localToWorld(new THREE.Vector3(0, 0, 0));
  const far = v.shaft.localToWorld(new THREE.Vector3(0, 0, 1));
  check('telegraphing: the arrow shows', v.ind.visible && v.fx.visible && v.fx.parent === v.root);
  check('… on the floor at y 0.03, from where it stood', near(start.x, s.tx, 1e-9) && near(start.z, s.tz, 1e-9) && near(start.y, 0.03, 1e-9));
  check('… the shaft to the dash\'s exact length, the arrowhead\'s tip exactly at the impact point',
    near(far.x, s.tx + s.dirX * s.len, 1e-9) && near(far.z, s.tz + s.dirZ * s.len, 1e-9)
    && near(tip.x, s.tx + s.dirX * s.len, 1e-9) && near(tip.z, s.tz + s.dirZ * s.len, 1e-9), `${tip.x} vs ${s.tx + s.dirX * s.len}`);
  // the arrowhead geometry: tip at local z 0, the base 0.9 back, 3-sided, radius 0.5
  const ap = v.arrow.geometry.getAttribute('position');
  let zMin = 0, zTop = -9;
  for (let i = 0; i < ap.count; i++) { zMin = Math.min(zMin, ap.getZ(i)); zTop = Math.max(zTop, ap.getZ(i)); }
  check('… the arrowhead is a 3-sided 0.5 × 0.9 cone lying along the path', near(zTop, 0, 1e-6) && near(zMin, -0.9, 1e-6) && v.arrow.geometry.parameters.radialSegments === 3);
  check('… in 0xff2200, transparent', v.indMat.color.getHex() === 0xff2200 && v.indMat.transparent === true && v.shaft.material === v.indMat && v.arrow.material === v.indMat);
  check('… on its first frame (the rev\'s last in 1.x) the arrow keeps the material\'s 0.55 (1.x enemy.js:842, 2612)', g.s.stateT === 0.5 && v.indMat.opacity === 0.55);
  const fl = [];
  step(w, IDLE);
  for (let i = 0; i < 40 && g.s.state === 'telegraphing'; i++) {
    look.update(v, g, w, 0, 1); fl.push([g.s.stateT, v.indMat.opacity]);
    v.root.position.x += 0.05;                         // the current drifts the wheel …
    step(w, IDLE);
  }
  check('… then flashing 0.7 / 0.15 on sin(25 × time left) > 0', fl.length > 20 && fl.every(([t, o]) => o === (Math.sin(25 * t) > 0 ? 0.7 : 0.15)) && fl.some(([, o]) => o === 0.7) && fl.some(([, o]) => o === 0.15));
  const lastFlash = v.indMat.opacity;
  const before = v.ind.localToWorld(new THREE.Vector3());
  v.root.position.x += 0.3; look.update(v, g, w, 0, 1); v.root.updateMatrixWorld(true);
  check('… and it stays where it was laid when the wheel drifts (1.x placed it once)', g.s.state !== 'telegraphing' || near(v.ind.localToWorld(new THREE.Vector3()).x, before.x, 1e-9));
  check('the dash starts: the arrow goes', g.s.state === 'dashing' && (look.update(v, g, w, 0, 1), !v.ind.visible));

  // a kill mid-telegraph: the arrow hides through the dying swell (1.x enemy.js:3074-3077)
  until(w, g, 'telegraphing');
  look.update(v, g, w, 0, 1);
  check('the next telegraph\'s first frame keeps the last flash\'s opacity, as 1.x\'s material did', v.ind.visible && v.indMat.opacity === lastFlash);
  v.dyingT = 0.2; v.root.updateMatrixWorld(true);
  check('a dying view hides its arrow', !v.fx.visible);
  v.dyingT = 0; v.root.updateMatrixWorld(true);
  look.reset(v);
  check('reset: a pooled view comes back with no arrow', !v.ind.visible && v.fx.visible && v.indMat.opacity === 0.55);

  // a VOLATILE TORO keeps its fuse through the rev (1.x enemy.js:2653-2662: the smoulder comes first)
  until(w, g, 'revving'); step(w, IDLE);
  g.affix = 'volatile'; g.flash = 0; v.mat.emissive.setHex(0x662200);   // what the core has just written
  look.update(v, g, w, 0, 1);
  check('a VOLATILE TORO\'s fuse outranks the rev glow', g.tell > 0 && v.mat.emissive.getHex() === 0x662200, v.mat.emissive.getHex().toString(16));
  g.affix = null;

  // the death: 1.x reset the squash and swelled the group about the wheel's
  // centre (enemy.js:2976-2977, 3013-3014, 3023-3024); the core swells an own
  // look's root from the floor, and the look keeps the centre at 1.0
  g.sq = 0.7; v.squash.scale.set(1 / Math.sqrt(0.7), 0.7, 1 / Math.sqrt(0.7));
  look.update(v, g, w, 0, 1);
  v.dyingT = 0.1; v.squash.scale.setScalar(1); v.root.scale.setScalar(1.65);   // what the core does to a dying view
  v.root.updateMatrixWorld(true);
  const dp = new THREE.Vector3(), dq = new THREE.Quaternion(), ds = new THREE.Vector3();
  v.axle.matrixWorld.decompose(dp, dq, ds);
  check('a dying wheel swells about its axle: centre still at 1.0, scaled uniformly by the swell, the squash gone',
    near(dp.y, 1.0, 1e-9) && near(ds.x, 1.65, 1e-9) && near(ds.y, 1.65, 1e-9) && near(ds.z, 1.65, 1e-9), `${dp.y} ${ds.x} ${ds.y}`);
  v.dyingT = 0; v.root.scale.setScalar(1); g.sq = 1; v.squash.scale.setScalar(1);
  look.update(v, g, w, 0, 1); v.root.updateMatrixWorld(true);
  v.axle.matrixWorld.decompose(dp, dq, ds);
  check('… and a pooled view comes back standing at 1.0, unscaled', near(dp.y, 1.0, 1e-9) && near(ds.y, 1, 1e-9));

  // the size: an elite's 1.2 on the mesh, the axle still at 1.0; ANCHORED squats the wheel
  const el = world({ o: { variant: 'elite' } }).g;
  look.update(v, el, w, 0, 1);
  check('an elite is the same wheel × 1.2, its centre still at the CFG 1.0 (1.x main.js:9406, enemy.js:836)',
    near(v.mesh.scale.x, 1.2) && near(v.mesh.scale.y, 1.2) && v.axle.position.y === 1.0);
  const an = world({ o: { affix: 'anchored' } }).g;
  look.update(v, an, w, 0, 1);
  check('ANCHORED squats it 1.25 / 0.8 / 1.25 — it sticks on a TORO (1.x main.js:9419)',
    near(v.mesh.scale.x, 1.25) && near(v.mesh.scale.y, 0.8) && near(v.mesh.scale.z, 1.25));
}

if (failed) { console.log(`✗ toro: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ toro: ${passed} checks`);
