#!/usr/bin/env node
// sludge.mjs — SLUDGE CUBE's own checks, in bare node: 1.x's numbers
// (enemy.js:585, 1210-1221, 1494-1566, 2326-2356, 2770-2777; main.js:1591-1673,
// 2442-2491, 10459-10464, 11302-11313; tuning.js:56-62, 622), asserted against
// the sim stepping on its fixed 1/60 s, and the look against real three.
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=158';
import { TUNING as T } from '../../js/tuning.js?v=158';
import look from '../../js/render/looks/sludge.js?v=158';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

const S = T.species.sludge, F = S.flop, P = S.poison, dt = T.sim.dt, DEG = Math.PI / 180;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const C = S.cardinals;

// A scripted chance: the values given, then `rest`. Swapped in for w.rng so
// every pick is the one the check asks for (the sim draws only from w.rng).
function scripted(vals, rest = 0.5) {
  const q = [...vals], next = () => (q.length ? q.shift() : rest);
  return { next, range: (a, b) => a + (b - a) * next(), int: (a, b) => a + Math.floor(next() * (b - a + 1)), pick: (l) => l[Math.floor(next() * l.length)], sign: () => (next() < 0.5 ? -1 : 1), left: () => q.length };
}
// cardinal index → the U that picks it
const U = (i) => (i + 0.5) / 4;

// a world with one SLUDGE CUBE (anchored by default: no swarm current, no
// crowd, so what moves it is its own step); the hero stands where asked.
// `rng`: the values the spawn and its first picks draw.
function world({ seed = 1, x = -15, z = 0, hero = [0, 0], o = {}, rng = null, anchored = true, mode = 'arcade', dash = 'pass' } = {}) {
  const w = createWorld({ seed, mode, dashMode: dash });
  w.director = { step() {} };
  w.hero.x = w.hero.px = hero[0]; w.hero.z = w.hero.pz = hero[1];
  if (rng) w.rng = scripted(rng);
  const g = api.spawn(w, 'sludge', x, z, o);
  g.anchored = anchored;
  return { w, g };
}
// 1.x's frame arithmetic: steps for a timer at `from` to run out (≤ 0), and
// for a clock counting up from 0 to reach p ≥ 1 of `dur`
const stepsDown = (from) => { let t = from, n = 0; do { t -= dt; n++; } while (!(t <= 0)); return n; };
const flopSteps = (dur) => { let t = 0, n = 0; do { t += dt; n++; } while (!(Math.min(1, t / dur) >= 1)); return n; };
const geom = (r, spd) => {
  const L = F.halfEdge * r, D = L * Math.SQRT2, stride = 2 * L, cycle = stride / Math.max(spd, F.minSpeed);
  const dur = Math.min(F.timeMax, cycle * F.shareOfCycle);
  return { L, D, stride, cycle, dur, rest: Math.max(F.minRest, cycle - dur) };
};
const disp = (L, D, p) => L + D * Math.cos((F.arcStartDeg + (F.arcEndDeg - F.arcStartDeg) * p) * DEG);

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.65, hp 2, speed 0.75 (1.x enemy.js:585)', S.radius === 0.65 && S.hp === 2 && S.speed === 0.75);
  check('CFG: lime 0xaaee00, no bullets, never fires', S.color === 0xaaee00 && S.bulletColor === null && S.fireInterval === null);
  check('a cube, MASS (the current at 0.10, nothing else), hurts on touch, not a biter',
    S.family === 'cube' && S.role === 'MASS' && S.contact === true && S.revenge === null
    && T.movement.roles.MASS.current === 0.10 && T.movement.roles.MASS.dodge === 0 && T.movement.roles.MASS.flock === 0 && T.movement.roles.MASS.weave === 0);
  check('stops advancing within 7 (1.x enemy.js:2329)', S.hold === 7);
  check('the 70 / 20 / 10 roll, 70% momentum with no want (1.x enemy.js:1519-1521)', S.pick.toward === 0.70 && S.pick.keep === 0.90 && S.idleKeep === 0.7);
  check('the cardinals in 1.x\'s order (+x, −x, +z, −z)', JSON.stringify(C) === '[[1,0],[-1,0],[0,1],[0,-1]]');
  check('TUNING.flop: arc 135° → 45°, ≤ 0.30 s or 65% of the cycle, −0.32 landing, breath 0.10 (1.x tuning.js:56-62)',
    F.arcStartDeg === 135 && F.arcEndDeg === 45 && F.timeMax === 0.30 && F.shareOfCycle === 0.65 && F.landSquish === 0.32 && S.look.breatheAmp === 0.10);
  check('L is 0.9 r, the cycle\'s floor 0.01, the rest\'s 0.02, the first rest U(0, 0.25)',
    F.halfEdge === 0.9 && F.minSpeed === 0.01 && F.minRest === 0.02 && F.firstRest === 0.25);
  check('poison: every 0.5 s, 1.8 r, life 3.5 lethal above 1.0 (1.x tuning.js:622, main.js:1593-1597, 10463)',
    P.every === 0.5 && P.radius === 1.8 && P.life === 3.5 && P.harmlessBelow === 1.0);
  check('trail points every 0.35 u, 12 at most, 3 s on a live cube (1.x enemy.js:2346-2348, main.js:1647)',
    S.trail.spacing === 0.35 && S.trail.max === 12 && S.trail.expire === 3.0);
  const R = S.look.ribbon, Fu = S.look.fumes;
  check('the ribbon: 0x88cc00 droplets 1.5 r wide, (0.85 + 0.25 sin), dried 45%, 0.26 flat, at y 0.02 (1.x main.js:1602-1663)',
    R.color === 0x88cc00 && R.width === 1.5 && R.base === 0.85 && R.amp === 0.25 && R.perIndex === 1.9 && R.rate === 2.2
    && R.dry === 0.45 && R.flat === 0.26 && R.y === 0.02 && R.max === 12 && R.deadAge === 0.5);
  check('its opacity pulses 0.35 + 0.2|sin 5t| alive, fades from 0.4 over 2 s dead (1.x main.js:1635-1640)',
    R.pulse.join() === '0.35,0.2,5' && R.fadeOpacity === 0.4 && R.fade === 2.0);
  check('fumes: 5/s, 0xaadd44, pool 48, rise 0.9, life 0.9-1.4, size 0.07-0.15 (1.x main.js:1666-1668, 2442-2484)',
    Fu.rate === 5 && Fu.color === 0xaadd44 && Fu.pool === 48 && Fu.rise === 0.9 && Fu.life.join() === '0.9,1.4' && Fu.size.join() === '0.07,0.15'
    && Fu.y === 0.08 && Fu.opacity === 0.5 && Fu.popRate === 3 && Fu.wiggle.join() === '9,0.15' && Fu.minPoints === 2);
  const g0 = geom(S.radius, S.speed);
  check('so a plain cube: L 0.585, stride 1.17, cycle 1.56 s = 0.30 flop + 1.26 rest',
    near(g0.L, 0.585) && near(g0.stride, 1.17) && near(g0.cycle, 1.56) && g0.dur === 0.30 && near(g0.rest, 1.26));
  const src = readFileSync(new URL('../../js/sim/species/sludge.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
}

// ── the flop: one stride a cycle, tipping over its leading edge ──────
{
  // first rest U = 0.4 → 0.1 s; starting dir (+z); then a want toward +x, rolled 0
  const { w, g } = world({ x: -15, z: 0, rng: [0.4, U(2), 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0] });
  const G = geom(g.r, S.speed);
  check('the first rest is U(0, 0.25): 0.1 s on U 0.4', near(g.s.rest, 0.1) && g.s.dx === 0 && g.s.dz === 1);
  const restN = stepsDown(0.1), f = flopSteps(G.dur);
  let i = 0;
  for (; i < restN - 1; i++) step(w, IDLE);
  check('it rests where it landed until the rest runs out', g.x === -15 && g.z === 0 && !g.s.flop, `step ${i} x ${g.x}`);
  step(w, IDLE); i++;
  check('the step the rest runs out it starts tipping toward you, on +x (the larger axis)', g.s.flop && g.s.dx === 1 && g.s.dz === 0 && g.s.x0 === -15);
  check('and moves that same step: x0 + (L + D cos ang(dt / 0.30))', near(g.x, -15 + disp(G.L, G.D, dt / G.dur), 1e-12) && g.z === 0, `x ${g.x}`);
  let onArc = true, sqV0 = 0, sq0 = 1;
  for (let k = 2; k < f; k++) {
    sqV0 = g.sqV; sq0 = g.sq;
    step(w, IDLE); i++;
    if (!g.s.flop || !near(g.x, -15 + disp(G.L, G.D, Math.min(1, (k * dt) / G.dur)), 1e-9) || g.z !== 0) onArc = false;
  }
  check('every step of the tumble is on the pivot arc, linear in time (no easing)', onArc);
  sqV0 = g.sqV; sq0 = g.sq;
  step(w, IDLE); i++;
  check(`it lands after ${f} steps (0.30 s), one stride on, flat`, !g.s.flop && near(g.x, -15 + G.stride, 1e-12), `x ${g.x}`);
  const [k, c] = T.gel.sq.cube;
  check('and the landing kicks the squash spring −0.32 (1.x tuning.js:59)', near(g.sqV, (sqV0 - (sq0 - 1) * k) * c - F.landSquish, 1e-12), `sqV ${g.sqV}`);
  check('then rests out the cycle: 1.26 s', near(g.s.rest, G.rest, 1e-12));
  // landing to landing, nine more strides
  const lands = [i];
  let was = false;
  for (let n = 0; n < 1000 && lands.length < 10; n++) { step(w, IDLE); i++; if (was && !g.s.flop) lands.push(i); was = g.s.flop; }
  const period = stepsDown(G.rest) + f - 1, gaps = lands.slice(1).map((l, q) => l - lands[q]);
  check(`landing to landing is ${period} steps, 1.x's frame count`, gaps.every((n) => n === period), `gaps ${gaps}`);
  check('ten strides, every one exactly 1.17 along +x', near(g.x, -15 + 10 * G.stride, 1e-9) && g.z === 0, `x ${g.x}`);
  const avg = G.stride / (period * dt);
  check('its average ground speed is its speed, 0.75 u/s (to the step)', Math.abs(avg / S.speed - 1) < 0.01, `avg ${avg}`);
}

// the wave's escalation, SWIFT, and the elite's longer edge
{
  // step to the first landing: the rest it has just been given
  const rest = (o) => {
    const { w, g } = world({ x: -15, o, rng: [0, U(0)] });
    let was = false;
    for (let n = 0; n < 60; n++) { step(w, IDLE); if (was && !g.s.flop) break; was = g.s.flop; }
    return { g, G: geom(g.r, api.speed(g)) };
  };
  let { g, G } = rest({ speedMult: 1.24 });
  check('wave 3 (0.93 u/s): cycle 1.258 s = 0.30 flop + 0.958 rest (spec §7.2)', near(G.cycle, 1.17 / 0.93, 1e-12) && near(g.s.rest, G.rest, 1e-12) && near(g.s.dur, 0.30), `rest ${g.s.rest}`);
  ({ g, G } = rest({ affix: 'swift' }));
  check('SWIFT: the cycle shrinks by 1.35', near(g.s.rest, G.cycle - 0.30, 1e-12) && near(G.cycle, 1.17 / (0.75 * T.variants.swiftSpeed), 1e-12));
  ({ g, G } = rest({ speedMult: 4 }));
  check('fast (3 u/s): the tip takes 65% of the cycle, not 0.30', near(g.s.dur, G.cycle * 0.65, 1e-12) && G.cycle * 0.65 < 0.30);
  ({ g, G } = rest({ speedMult: 40 }));
  check('very fast: the rest never goes under 0.02 s', near(g.s.rest, 0.02, 1e-12));
  ({ g, G } = rest({ variant: 'elite' }));
  check('elite (r × 1.2): a 1.404 stride, a 1.872 s cycle, hp 4', near(G.stride, 1.404, 1e-12) && near(g.s.rest, 1.872 - 0.30, 1e-12) && g.hp === 4 && near(g.x, -15 + 1.404, 1e-12));
}

// ── where it goes: the zoner's want and 1.x's roll ───────────────────
{
  // the first pick after spawn: rest U 0 → starts on step 1
  const pick = (x, z, startDir, rolls, hero = [0, 0]) => {
    const { w, g } = world({ x, z, hero, rng: [0, U(startDir), ...rolls] });
    step(w, IDLE);
    return [g.s.dx, g.s.dz].join();
  };
  check('far off it wants you: toward the larger axis (+x from (−12, 3))', pick(-12, 3, 3, [0.0]) === '1,0');
  check('the larger axis is z from (−3, 12): −z', pick(-3, 12, 0, [0.0]) === '0,-1');
  check('a tie goes to z', pick(-8, -8, 0, [0.0]) === '0,1');
  check('U < 0.70: toward', pick(-12, 3, 3, [0.6999]) === '1,0');
  check('0.70 ≤ U < 0.90: the previous direction (−z)', pick(-12, 3, 3, [0.70]) === '0,-1' && pick(-12, 3, 3, [0.8999]) === '0,-1');
  check('U ≥ 0.90: a random cardinal, cardinals[floor(U × 4)]', pick(-12, 3, 3, [0.90, U(1)]) === '-1,0' && pick(-12, 3, 3, [0.95, U(2)]) === '0,1');
  // within 7 the want is gone: U 0.5 keeps the previous direction instead of turning to you
  check('at exactly 7 it has no want: U 0.5 keeps its (+z) heading', pick(-7, 0, 2, [0.5]) === '0,1');
  check('at 7.01 it still wants you: U 0.5 turns it to +x', pick(-7.01, 0, 2, [0.5]) === '1,0');
  check('with no want, U < 0.7 keeps the heading', pick(-3, 0, 3, [0.6999]) === '0,-1');
  check('else a random cardinal', pick(-3, 0, 3, [0.7, U(0)]) === '1,0');
  // wander: inside 7 it never stops, it random-walks with momentum
  const { w, g } = world({ seed: 9, x: -3, z: 2 });
  let flops = 0, was = false, maxD = 0;
  for (let n = 0; n < 1800; n++) { step(w, IDLE); if (g.s.flop && !was) flops++; was = g.s.flop; maxD = Math.max(maxD, Math.hypot(g.x, g.z)); }
  check('inside 7 it keeps flopping (random-walking) rather than standing', flops >= 15, `${flops} flops in 30 s`);
}

// ── walls: a stride that would cross one turns it back ───────────────
{
  const turn = (x, z, startDir, o = {}) => {
    const { w, g } = world({ x, z, hero: [x - 3, z], o, rng: [0, U(startDir), 0.0] });   // no want; U 0 keeps the heading
    step(w, IDLE);
    return { dir: [g.s.dx, g.s.dz].join(), w, g };
  };
  check('heading +x at 17.5 (17.5 + 1.17 > 19 − 0.65) it turns back to −x', turn(17.5, 0, 0).dir === '-1,0');
  check('heading +x at 17.1 it carries on', turn(17.1, 0, 0).dir === '1,0');
  check('heading +z at 10 (11.17 > 11 − 0.65) it turns back to −z', turn(0, 10, 2).dir === '0,-1');
  check('heading −x at −17.5 it turns back to +x', turn(-17.5, 0, 1).dir === '1,0');
  // 1.x's bound is the CFG radius, not the elite's: an elite at 16.9 still
  // flops right (16.9 + 1.404 < 18.35), and the arena's edge stops it
  const { w, g } = turn(16.9, 0, 0, { variant: 'elite' });
  check('an elite\'s wall check uses the CFG radius (1.x enemy.js:1527)', [g.s.dx, g.s.dz].join() === '1,0');
  let held = true, clamped = false, was = true;
  for (let n = 0; n < 30; n++) {
    step(w, IDLE);
    if ((g.s.flop || was) && g.s.x0 !== 16.9) held = false;           // the landing step too
    if (g.s.flop && near(g.x, w.hx - g.r, 1e-12)) clamped = true;
    was = g.s.flop;
  }
  // 1.x never clamped a cube (it would land at 18.304, its edge 0.08 into
  // the wall); the 2.0 core clamps every body to the arena after its step
  check('and the core\'s arena clamp holds it at 19 − r (a 2.0 rule, not 1.x\'s)', near(g.x, w.hx - g.r, 1e-12), `x ${g.x}`);
  check('the clamp holds the body, not the tumble: its origin stays at 16.9 through the flop (1.x moved it only by the crowd)', held && clamped);
}

// ── what moves it besides itself ─────────────────────────────────────
{
  // the crowd's nudge mid-tumble moves the tumble's origin, unclamped
  // (1.x crowd.js:110 adds `ax` to `_flopX0` before it clamps the position)
  const { w, g } = world({ x: -15, z: 0, rng: [0, U(0), 0.0] });
  const G = geom(g.r, S.speed);
  for (let n = 0; n < 5; n++) step(w, IDLE);
  const x0 = g.s.x0;
  g.x += 0.2; g.z += 0.1; g.nudgedX = 0.2; g.nudgedZ = 0.1;    // as the crowd solver does after the step, and records
  step(w, IDLE);
  check('a nudge mid-tumble moves the origin with it', near(g.s.x0, x0 + 0.2, 1e-12) && near(g.s.z0, 0.1, 1e-12));
  check('and the tumble carries on from there', near(g.x, g.s.x0 + disp(G.L, G.D, Math.min(1, (6 * dt) / G.dur)), 1e-12) && near(g.z, 0.1, 1e-12));
  for (let n = 0; n < 30 && g.s.flop; n++) step(w, IDLE);
  check('so it lands one stride on from the nudged origin', near(g.x, -15 + 0.2 + G.stride, 1e-12) && near(g.z, 0.1, 1e-12));

  // pinned to the wall, the crowd pushes 0.06 further and the clamp lets 0.01 through:
  // the origin takes all 0.06, as 1.x's did, and the walls hold the body in
  const p = world({ x: 0, z: w.hz - 0.66, rng: [0, U(0), 0.0], hero: [-10, w.hz - 0.66] });
  for (let n = 0; n < 4; n++) step(p.w, IDLE);
  const z0 = p.g.s.z0;
  p.g.z += 0.01; p.g.nudgedZ = 0.06;
  step(p.w, IDLE);
  check('a nudge into the wall moves the origin by the whole nudge, not by what the clamp let through', near(p.g.s.z0, z0 + 0.06, 1e-12) && near(p.g.z, p.w.hz - p.g.r, 1e-12));

  // the real solver: a second cube overlapping a tumbling one pushes it off,
  // and the tumble's origin moves by exactly what the solver recorded
  {
    const c = createWorld({ seed: 3, mode: 'arcade' });
    c.director = { step() {} };
    c.hero.x = c.hero.px = 15; c.hero.z = c.hero.pz = 0;
    c.rng = scripted([0, U(0), 0.999, U(0), 0.0]);         // A: no rest, +x; B: a long rest; A's first pick: toward you, +x
    const a = api.spawn(c, 'sludge', -10, 0);
    const b = api.spawn(c, 'sludge', -10, 1.2);
    step(c, IDLE);
    const nz = a.nudgedZ, az0 = a.s.z0;
    step(c, IDLE);
    check('the crowd solver\'s own nudge moves a tumble\'s origin (1.x crowd.js:110)',
      a.s.flop && nz < -0.01 && near(a.s.z0, az0 + nz, 1e-12) && b.s.flop === false, `nz ${nz} z0 ${a.s.z0}`);
  }

  // the swarm's current: lost mid-tumble (1.x writes the position), kept at rest
  const u = world({ seed: 5, x: -15, z: 0, anchored: false });
  let arcOk = true, restMoved = false, flopX0 = null, prev = null;
  for (let n = 0; n < 400; n++) {
    const was = u.g.s.flop;
    step(u.w, IDLE);
    const s = u.g.s;
    if (s.flop) {
      if (!was) flopX0 = s.x0;
      const p = Math.min(1, s.ft / s.dur), G2 = geom(u.g.r, S.speed);
      if (s.x0 !== flopX0 || !near(u.g.x, s.x0 + s.dx * disp(G2.L, G2.D, p), 1e-12) || !near(u.g.z, s.z0 + s.dz * disp(G2.L, G2.D, p), 1e-12)) arcOk = false;
    } else if (was === false && prev && (u.g.x !== prev.x || u.g.z !== prev.z)) restMoved = true;
    prev = { x: u.g.x, z: u.g.z };
  }
  check('mid-tumble the wave\'s current is overwritten: it stays on its arc (1.x trap 15)', arcOk);
  check('at rest the current (MASS, 0.10) carries it', restMoved);
}

// ── the test dashes: a PUSH shove is carried, a CUT goes through ──────
{
  const DASH = (mx, mz) => ({ ...IDLE, mx, mz, dash: true });
  // tumbling +x when the hero, 1.6 below it, dashes away (−z): the shove is +z
  const shoved = (dash) => {
    const r = world({ x: -5, z: 0, hero: [-5, -1.6], rng: [0, U(0), 0.0], anchored: false, dash });
    const g = r.g, G = geom(g.r, S.speed);
    step(r.w, IDLE);                                        // the flop starts (+x: no want inside 7, U 0 keeps it)
    const x0 = g.s.x0, z0 = g.s.z0;
    step(r.w, DASH(0, -1));
    let rising = true, lastZ = g.z, n = 0;
    while (g.s.flop && n++ < 40) { step(r.w, IDLE); if (g.s.flop && g.z < lastZ - 1e-12) rising = false; lastZ = g.z; }
    return { g, G, rising, x0, z0, dirs: `${g.s.dx},${g.s.dz}` };
  };
  const pass = shoved('pass'), push = shoved('push');
  check('a PUSH dash shoves a tumbling cube and the tumble carries the shove (it is not written back)',
    push.g.alive && push.g.z - push.z0 > 0.5 && push.g.s.z0 - push.z0 > 0.4 && push.rising, `z ${push.g.z - push.z0}, origin ${push.g.s.z0 - push.z0}`);
  check('…and still tips over the same edge: +x, landing a stride on from where the shove took the origin',
    push.dirs === '1,0' && push.g.x - push.g.s.x0 >= push.G.stride - 1e-12 && push.g.x - push.g.s.x0 < push.G.stride + 0.1, `${push.g.x - push.g.s.x0}`);
  check('unshoved (the PASS dash) the same tumble lands exactly one stride on, on its line',
    near(pass.g.x, pass.x0 + pass.G.stride, 1e-12) && pass.g.z === pass.z0 && pass.g.s.z0 === pass.z0);
  // resting, a shove just moves it
  const rest = world({ x: -5, z: 0, hero: [-5, -1.6], rng: [0.999, U(0)], anchored: false, dash: 'push' });
  step(rest.w, DASH(0, -1));
  for (let n = 0; n < 10; n++) step(rest.w, IDLE);
  check('a PUSH dash shoves a resting cube along the floor', !rest.g.s.flop && rest.g.z > 0.5, `z ${rest.g.z}`);

  // the CUT dash through it: 2 hits against its 2 HP; what it poured stays
  const cut = world({ x: -5, z: 0, hero: [-5, -4], rng: [0.999, U(0)], dash: 'cut' });
  while (!cut.w.hazards.length) step(cut.w, IDLE);
  cut.w.hero.x = cut.g.x; cut.w.hero.z = cut.g.z - 1;
  let src = null;
  for (let n = 0; n < 12 && cut.g.alive; n++) { step(cut.w, n ? IDLE : DASH(0, 1)); for (const e of cut.w.events) if (e.type === 'kill') src = e.src; }
  check('a CUT dash through it kills it (TUNING.hero.cut.hits 2 against its HP 2)', T.hero.cut.hits >= S.hp && !cut.g.alive && src === 'dash');
  check('…and the poison it poured outlives it', cut.w.hazards.length >= 1 && cut.w.hazards.every((h) => h.src === 'sludge'));
}

// ── a run replays from its seed ──────────────────────────────────────
{
  const run = () => {
    const r = world({ seed: 11, x: -15, z: 3, anchored: false });
    const out = [];
    for (let n = 0; n < 900; n++) {
      step(r.w, IDLE);
      out.push(`${r.g.x.toFixed(9)},${r.g.z.toFixed(9)},${r.g.s.dx},${r.g.s.dz},${r.g.s.trail.length},${r.w.hazards.length}`);
    }
    return out.join('|');
  };
  check('the same seed walks, pours and poisons the same way twice', run() === run());
}

// ── the trail's points ───────────────────────────────────────────────
{
  const { w, g } = world({ seed: 2, x: -15, z: 0 });
  step(w, IDLE);
  check('the first step pushes its first point, where it stands, stamped with the clock before the step (1.x _wobbleT, enemy.js:2347, 2725)',
    g.s.trail.length === 1 && g.s.trail[0].x === g.x && g.s.trail[0].t === g.t - dt);
  let spaced = true, fresh = true, capped = true;
  for (let n = 0; n < 900; n++) {
    step(w, IDLE);
    const tr = g.s.trail;
    for (let k = 1; k < tr.length; k++) if (Math.hypot(tr[k].x - tr[k - 1].x, tr[k].z - tr[k - 1].z) < 0.35 - 1e-12) spaced = false;
    if (tr.some((p) => g.t - p.t > 3.0)) fresh = false;
    if (tr.length > 12) capped = false;
  }
  check('a point every 0.35 u it moves, never closer (1.x v105: distance, not time)', spaced);
  check('none older than 3 s while it lives', fresh);
  check('never more than 12', capped);
  // a fast cube fills all 12
  const f = world({ x: -15, z: 0, o: { speedMult: 8 } });
  let full = false;
  for (let n = 0; n < 300; n++) { step(f.w, IDLE); if (f.g.s.trail.length === 12) full = true; }
  check('a fast cube keeps 12 (the oldest dropped)', full);
  // a point lives 1.x's frames: pushed in frame N with _wobbleT before that
  // frame's advance, dropped once _wobbleT after frame M is more than 3 s on,
  // (M − N + 1)/60 > 3, so on frame N + 180
  {
    const a = world({ seed: 2, x: -15, z: 0 });
    step(a.w, IDLE);
    const p0 = a.g.s.trail[0], born = a.w.tick;
    let gone = -1;
    for (let n = 0; n < 400 && gone < 0; n++) { step(a.w, IDLE); if (a.g.s.trail[0] !== p0) gone = a.w.tick; }
    check('a point lives 180 steps, as 1.x\'s ribbon kept it (main.js:1645-1648)', gone - born === 180, `${gone - born}`);
  }
  // resting, it pushes nothing
  const r = world({ x: -15, z: 0, rng: [0.999, U(0)] });
  for (let n = 0; n < 10; n++) step(r.w, IDLE);
  check('standing still it pushes nothing new', r.g.s.trail.length === 1);
}

// ── the poison zones ─────────────────────────────────────────────────
{
  const { w, g } = world({ x: -15, z: 0, hero: [10, 0] });
  const first = stepsDown(P.every);
  for (let n = 0; n < first - 1; n++) step(w, IDLE);
  check('no zone before the clock runs out', w.hazards.length === 0);
  step(w, IDLE);
  const z = w.hazards[0];
  check(`the first zone drops on step ${first} (0.5 s, 1.x's frames)`, w.hazards.length === 1);
  check('where the cube stands that step', z && z.x === g.x && z.z === g.z);
  check('it reaches the hero\'s centre at 1.8 r + the hero\'s 0.5 = 1.67', z && near(z.r, 1.8 * 0.65 + 0.5, 1e-12), `${z?.r}`);
  check('lethal for 2.5 s: its whole life (3.5 s, harmless below 1.0)', z && z.max === 2.5);
  check('the trail\'s colour, kind poison, from the sludge', z && z.color === 0x88cc00 && z.kind === 'poison' && z.src === 'sludge');
  const at = [first];
  for (let n = first + 1; n <= 600; n++) { const c = w.hazards.length; step(w, IDLE); if (w.hazards.some((h) => h.max - h.life <= dt + 1e-12) && w.hazards.length >= c) at.push(n); }
  const gaps = at.slice(1).map((a, k) => a - at[k]);
  check(`then one every ${first} steps, resting or tumbling (the clock is reset, not wound back)`, gaps.length >= 18 && gaps.every((n) => n === first), `${gaps.slice(0, 6)}`);
  check('a steady cube keeps 5 zones alive', w.hazards.length === 5, `${w.hazards.length}`);
  const e = world({ x: -15, z: 0, hero: [10, 0], o: { variant: 'elite' } });
  for (let n = 0; n < first; n++) step(e.w, IDLE);
  check('elite: 1.8 × 0.78 + 0.5', near(e.w.hazards[0]?.r, 1.8 * 0.78 + 0.5, 1e-12));
}

// a zone hurts you while it lives, outlives the cube, and then stops
{
  const zoneWorld = () => {
    const { w, g } = world({ x: -15, z: 0, hero: [10, 0] });
    while (!w.hazards.length) step(w, IDLE);
    const z = w.hazards[0], born = w.tick;
    api.kill(w, g, 'env');                                 // no more zones; this one stays
    return { w, z, born };
  };
  let { w, z } = zoneWorld();
  check('the zone outlives the cube that poured it', !w.gels.some((b) => b.alive) && w.hazards.length === 1);
  w.hero.x = z.x; w.hero.z = z.z + 1.669;
  step(w, IDLE);
  check('inside 1.67 of it you are hit, by the sludge', w.hero.lives === T.hero.lives - 1 && w.killedBy === 'sludge');
  ({ w, z } = zoneWorld());
  w.hero.x = z.x; w.hero.z = z.z + 1.671;
  step(w, IDLE);
  check('at 1.671 you are not', w.hero.lives === T.hero.lives);
  // 1.x: lethal while 3.5 − j·dt > 1.0 (aged before the test from the frame after) — 151 tests
  let l = P.life, lethal = 0;
  while (l > P.harmlessBelow) { lethal++; l -= dt; }
  // stand in it for its k-th test (the 1st is on the step it drops)
  const probe = (k) => {
    const r = zoneWorld();
    while (r.w.tick < r.born + k - 2) step(r.w, IDLE);
    r.w.hero.x = r.z.x; r.w.hero.z = r.z.z;
    step(r.w, IDLE);
    return r.w.hero.lives < T.hero.lives;
  };
  check(`it hurts on the last of 1.x's ${lethal} lethal steps`, probe(lethal));
  check('and not on the step after', !probe(lethal + 1));
  ({ w, z } = zoneWorld());
  w.hero.x = z.x; w.hero.z = z.z; w.hero.mercy = 1;
  step(w, IDLE);
  check('mercy protects (1.x: not while invincible)', w.hero.lives === T.hero.lives);
}

// ── touching it hurts; two hits kill it; nothing special on death ─────
{
  let { w, g } = world({ x: 0, z: 0, hero: [1.149, 0], rng: [0.999, U(2)] });
  step(w, IDLE);
  check('touching it (within 0.65 + 0.5) hurts, by the sludge', w.hero.lives === T.hero.lives - 1 && w.killedBy === 'sludge');
  ({ w, g } = world({ x: 0, z: 0, hero: [1.151, 0], rng: [0.999, U(2)] }));
  for (let n = 0; n < 10; n++) step(w, IDLE);
  check('just outside it does not', w.hero.lives === T.hero.lives);

  ({ w, g } = world({ x: 0, z: 0, hero: [-6, 0], rng: [0.999, U(1), 0.0, 0.0, 0.0] }));
  let hits = 0, blocks = 0, kills = 0;
  for (let n = 0; n < 120 && g.alive; n++) {
    step(w, { ...IDLE, aim: true, fire: true });
    for (const e of w.events) { if (e.type === 'hit') hits++; if (e.type === 'block') blocks++; if (e.type === 'kill') kills++; }
  }
  check('two hero bullets kill it, none blocked', !g.alive && hits === 2 && kills === 1 && blocks === 0, `hits ${hits} kills ${kills}`);
  check('it leaves nothing alive behind (no children)', w.gels.length === 0);
  // HARDCADE: not a biter, so it only bites back if every corpse does
  ({ w, g } = world({ x: 0, z: 0, hero: [-6, 0], mode: 'hardcade' }));
  w.wave = 10;
  api.kill(w, g, 'hero');
  const corpse = w.bullets.filter((b) => b.revenge).length;
  check('HARDCADE: no corpse fire from a non-biter (unless every corpse bites: a RING of 4)',
    T.revenge.who === 'all' ? corpse === Math.max(1, Math.round(T.revenge.ring.small * T.revenge.density)) : corpse === 0, `${corpse}`);
}

// ── the look ─────────────────────────────────────────────────────────
{
  const scene = new THREE.Scene(), clock = { value: 100 };
  let matArgs = null;
  // the core's gel material, stubbed: an emissive and the uniforms it drives
  const realGel = () => ({ hit: { value: 0 }, hitDir: { value: new THREE.Vector2() }, tear: { value: 0 }, phase: { value: 0 } });
  const ctx = { THREE, TSL: null, GEL_TIME: clock, T, S, scene, geo: {},
    gelMaterial: (hex, fam, r) => { matArgs = [hex, fam, r]; const m = new THREE.MeshBasicNodeMaterial(); m.emissive = new THREE.Color(); m.gel = realGel(); return m; } };
  const mkView = () => {
    const built = look.build(ctx);
    const v = { kind: 'sludge', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, ...built };
    v.squash.add(v.body); v.root.add(v.squash); scene.add(v.root);
    look.reset(v);
    return v;
  };
  const v = mkView();
  check('own body, the satin gel in the cube family at unit radius', v.own === true && matArgs.join() === `${0xaaee00},cube,1`);
  const cube = v.cube;
  // 1.x's RoundedBoxGeometry(1.8r, 1.8r, 1.8r, 4, 0.18): 1.8 a side, centred,
  // its corner 0.18 at the CFG size (0.277 radii), whatever the elite scale
  const bb = cube.geometry.boundingBox, c = 0.18 / 0.65;
  let far = 0;
  const pa = cube.geometry.attributes.position;
  for (let i = 0; i < pa.count; i++) far = Math.max(far, Math.hypot(pa.getX(i), pa.getY(i), pa.getZ(i)));
  check('the body is 1.x\'s rounded box: 1.8 a side, centred, a 0.18 corner at 0.65 (1.x enemy.js:738)',
    near(bb.min.x, -0.9, 1e-6) && near(bb.max.y, 0.9, 1e-6) && near(bb.min.z, -0.9, 1e-6) && near(far, (0.9 - c) * Math.sqrt(3) + c, 1e-6), `far ${far}`);
  check('with 4 corner segments: 9 a side (three\'s 2·4 + 1)', pa.count === 6 * 9 * 9 * 6);
  // 1.x rippled and tore BLOBS only: the core's writes miss the cube's shader
  v.mat.gel.hit.value = 1; v.mat.gel.tear.value = 1; v.mat.gel.hitDir.value.set(1, 0);
  check('a hit or a death writes to stand-ins: no ripple, no tear on a cube (1.x enemy.js:1609-1625, 2702-2708, 2986-2989)',
    v.gel.hit.value === 0 && v.gel.tear.value === 0 && v.gel.hitDir.value.x === 0 && v.mat.gel.phase === v.gel.phase);
  v.mat.gel.hit.value = 0; v.mat.gel.tear.value = 0;
  const world3 = (p) => { scene.updateMatrixWorld(true); return p.clone().applyMatrix4(cube.matrixWorld); };
  const place = (g, alpha = 1) => {
    v.root.position.set(g.px + (g.x - g.px) * alpha, 0, g.pz + (g.z - g.pz) * alpha);
    v.squash.scale.set(1 / Math.sqrt(g.sq), g.sq, 1 / Math.sqrt(g.sq));
  };

  // tumbling: the leading bottom edge stays planted at x0 + L, on the floor
  const { w, g } = world({ x: -15, z: 0, rng: [0, U(0), 0.0] });
  let planted = true, sized = true, mid = false;
  const edgeLen = () => world3(new THREE.Vector3(-0.9, 0.9, 0.9)).distanceTo(world3(new THREE.Vector3(0.9, 0.9, 0.9)));
  for (let n = 0; n < 18; n++) {
    step(w, IDLE);
    if (!g.s.flop) break;
    for (const alpha of [0.5, 1]) {
      place(g, alpha);
      v.squash.scale.set(1 / Math.sqrt(0.7), 0.7, 1 / Math.sqrt(0.7));    // a live spring must not show mid-tumble
      clock.value += 0.016; look.update(v, g, w, clock.value, 1);
      const e = world3(new THREE.Vector3(0.9, -0.9, 0)), L = 0.9 * g.r;
      if (!near(e.x, g.s.x0 + L, 1e-9) || !near(e.y, 0, 1e-9) || !near(e.z, 0, 1e-9)) planted = false;
      if (!near(edgeLen(), 1.8 * g.r, 1e-9)) sized = false;
      const top = world3(new THREE.Vector3(0, 0.9, 0));
      if (top.x > g.s.x0 + 0.1 && Math.abs(top.y - 2 * L) > 0.2) mid = true;
    }
  }
  check('mid-tumble the leading bottom edge stays planted on the floor, between steps too', planted);
  check('mid-tumble it is its plain size: no squash, no breath', sized);
  check('it really tips: the top swings over toward +x', mid);

  // death mid-tumble: it snaps flat (1.x destroy)
  const w2 = world({ x: -15, z: 0, rng: [0, U(0), 0.0] });
  for (let n = 0; n < 8; n++) step(w2.w, IDLE);
  place(w2.g); clock.value += 0.016; look.update(v, w2.g, w2.w, clock.value, 1);
  const tilted = Math.abs(v.tip.quaternion.w - 1) > 1e-3;
  clock.value += 0.016; cube.onBeforeRender();
  check('killed mid-tumble it snaps flat, its plain size', tilted && near(v.tip.quaternion.w, 1, 1e-12) && near(v.tip.scale.y, w2.g.r, 1e-12));

  // at rest: the breath on the squash spring, on the floor
  look.reset(v);
  const w3 = world({ x: -15, z: 0, rng: [0.999, U(0)] });
  step(w3.w, IDLE);
  w3.g.sq = 0.8; place(w3.g);
  const t = 0.4, b = S.look.breatheAmp * Math.sin(t * S.look.breatheHz + v.phase);
  clock.value += 0.016; look.update(v, w3.g, w3.w, t, 1);
  const bot = world3(new THREE.Vector3(0, -0.9, 0)), top = world3(new THREE.Vector3(0, 0.9, 0)), side = world3(new THREE.Vector3(0.9, 0, 0));
  check('at rest it stands on the floor, upright', near(bot.y, 0, 1e-9) && near(top.x, bot.x, 1e-9));
  check('breathing (1 + b) tall on the squash spring: 1.17 × (1 + 0.10 sin(2.4t + φ)) × sq', near(top.y, 1.8 * w3.g.r * (1 + b) * 0.8, 1e-9), `${top.y}`);
  check('and (1 − b/2) across, over √sq', near(side.x - bot.x, 0.9 * w3.g.r * (1 - b / 2) / Math.sqrt(0.8), 1e-9));
  check('it never turns to its heading (1.x cubes have no yaw)', near(v.tip.rotation.y, 0) && near(v.body.rotation.y, 0));
  // killed at rest mid-breath: the pop starts from its plain rest pose
  // (1.x destroy(): _sq 1, a uniform scale, the centre still L up)
  clock.value += 0.016; v.squash.scale.setScalar(1); cube.onBeforeRender();
  check('killed at rest it pops from its plain pose: uniform, its centre L up, on the floor',
    near(v.tip.scale.x, w3.g.r, 1e-12) && near(v.tip.scale.y, w3.g.r, 1e-12) && near(v.tip.position.y, 0.9 * w3.g.r, 1e-12));

  // the trail: one droplet per point, 1.x's size and pulse, then the fade
  const v2 = mkView();
  const w4 = world({ seed: 4, x: -15, z: 0, o: { speedMult: 2 } });
  for (let n = 0; n < 150; n++) step(w4.w, IDLE);
  // v116: every trail is drawn by the scene's one ribbon mesh; a trail notes where its droplets went (at, drawn) and its opacity
  const tr = v2.trails[v2.cur], pts = w4.g.s.trail, R = S.look.ribbon, ribbon = v2.sh.ribbons.mesh, draw = () => ribbon.onBeforeRender();
  clock.value += 1; place(w4.g); look.update(v2, w4.g, w4.w, clock.value, 1);
  draw();
  const m = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  let shaped = pts.length >= 4 && tr.drawn === pts.length;
  for (let i = 0; i < tr.drawn; i++) {
    ribbon.getMatrixAt(tr.at + i, m); m.decompose(pos, q, sc);
    const age = Math.max(0, Math.min(1, (w4.g.t - pts[i].t) / 3));
    const r = 1.5 * w4.g.r * (R.base + R.amp * Math.sin(i * R.perIndex + tr.t * R.rate)) * (1 - R.dry * age);
    if (!near(pos.x, pts[i].x, 1e-6) || !near(pos.z, pts[i].z, 1e-6) || !near(sc.x, r, 1e-6) || !near(sc.y, r * R.flat, 1e-6)) shaped = false;
  }
  check('a squashed droplet per trail point, r = 1.5 r × (0.85 + 0.25 sin(1.9 i + 2.2 t)) × (1 − 0.45 age)', shaped, `${tr.drawn} of ${pts.length}`);
  check('at y 0.02, in 0x88cc00, no depth write', ribbon.position.y === 0.02 && ribbon.material.color.getHex() === 0x88cc00 && ribbon.material.transparent && !ribbon.material.depthWrite);
  check('…every droplet carrying its trail\'s opacity (v116: one mesh for every trail in the scene)', ribbon.count >= tr.drawn && ribbon.geometry.attributes.aAlpha.getX(tr.at) === Math.fround(tr.alpha));
  const t1 = tr.t;
  check('alive it pulses 0.35 + 0.2|sin 5t|', near(tr.alpha, 0.35 + 0.2 * Math.abs(Math.sin(t1 * 5)), 1e-9));
  // the ribbon's clock is the game's: it runs with the sim, a pause holds it
  for (let n = 0; n < 6; n++) { clock.value += dt; step(w4.w, IDLE); place(w4.g); look.update(v2, w4.g, w4.w, clock.value, 1); draw(); }
  check('it runs with the sim (6 steps, 0.1 s)', near(tr.t - t1, 6 * dt, 1e-9), `${tr.t - t1}`);
  const t2 = tr.t;
  for (let n = 0; n < 30; n++) { clock.value += dt; look.update(v2, w4.g, w4.w, clock.value, 1); draw(); }
  check('paused (the sim not stepping) it holds still, as 1.x\'s did (main.js:9293-9299)', tr.t === t2);
  // no update this frame: the cube is dead; half a second of frames
  for (let n = 0; n < 30; n++) { clock.value += dt; draw(); }
  ribbon.getMatrixAt(tr.at, m); m.decompose(pos, q, sc);
  const rDead = 1.5 * w4.g.r * (R.base + R.amp * Math.sin(tr.t * R.rate)) * (1 - R.dry * 0.5);
  check('dead, it fades from 0.4 over 2 s, every droplet at age 0.5', near(tr.alpha, 0.4 * (1 - 0.5 / 2), 1e-9) && near(sc.x, rDead, 1e-6), `${tr.alpha}`);
  for (let n = 0; n < 91; n++) { clock.value += dt; draw(); }
  check('and is gone 2 s after', tr.n === 0 && tr.drawn === 0);
  // a long frame counts 1.x's 0.05 s at most (main.js:9268)
  const v4 = mkView(), w6 = world({ seed: 7, x: -15, z: 0, o: { speedMult: 2 } }), tr6 = v4.trails[v4.cur];
  for (let n = 0; n < 60; n++) step(w6.w, IDLE);
  clock.value += dt; look.update(v4, w6.g, w6.w, clock.value, 1); draw();
  const t6 = tr6.t;
  for (let n = 0; n < 30; n++) step(w6.w, IDLE);
  clock.value += 0.5; look.update(v4, w6.g, w6.w, clock.value, 1); draw();
  check('a long frame advances it 0.05 s, not 0.5', near(tr6.t - t6, 0.05, 1e-9), `${tr6.t - t6}`);

  // fumes: off a live trail, one pool of 48 for every trail
  const pools = () => scene.children.filter((o) => o.isInstancedMesh && o.instanceMatrix.count === S.look.fumes.pool);
  check('one fume pool in the scene, shared by every view', pools().length === 1);
  const fumes = pools()[0];
  const v3 = mkView(), w5 = world({ seed: 6, x: -15, z: 0, o: { speedMult: 2 } });
  for (let n = 0; n < 120; n++) step(w5.w, IDLE);
  let most = 0, low = true;
  for (let n = 0; n < 240; n++) {
    clock.value += dt; step(w5.w, IDLE); place(w5.g); look.update(v3, w5.g, w5.w, clock.value, 1);
    draw(); fumes.onBeforeRender();
    most = Math.max(most, fumes.count);
    for (let i = 0; i < fumes.count; i++) { fumes.getMatrixAt(i, m); m.decompose(pos, q, sc); if (pos.y < 0.08 - 1e-6 || pos.y > 0.08 + 0.9 * 1.4 + 1e-6 || sc.x > 0.15 + 1e-6) low = false; }   // the pool is Float32
  }
  check('a live trail fumes (about 5 a second), into the 48', most >= 2 && most <= 48, `${most}`);
  check('bubbles rise from 0.08 at 0.9 u/s, never bigger than 0.15', low);
  // paused: nothing rises, nothing new
  const snap = () => { const out = []; for (let i = 0; i < fumes.count; i++) { fumes.getMatrixAt(i, m); m.decompose(pos, q, sc); out.push(pos.y.toFixed(9)); } return out.join(); };
  const before = snap();
  for (let n = 0; n < 60; n++) { clock.value += dt; look.update(v3, w5.g, w5.w, clock.value, 1); draw(); fumes.onBeforeRender(); }
  check('paused, the fumes hang where they are and none are added', fumes.count > 0 && snap() === before, `${fumes.count}`);
  for (let n = 0; n < 100; n++) { clock.value += dt; draw(); fumes.onBeforeRender(); }
  check('a dead trail stops fuming; the last bubbles pop within 1.4 s', fumes.count === 0);

  // a pooled view reused for a new cube pours into its other trail
  const old = v3.cur;
  look.reset(v3);
  check('a reused view leaves the last trail to fade and pours into the other, its clock from 0',
    v3.cur !== old && v3.trails[v3.cur].n === 0 && v3.trails[v3.cur].t === 0);

  // a new run: the first cube of it drawn sweeps the last run's trails and
  // fumes away at once (1.x clearFX at startGame, main.js:7167-7171)
  {
    const va = mkView(), wa = world({ seed: 8, x: -15, z: 0, o: { speedMult: 2 } });
    for (let n = 0; n < 1200 && (n < 120 || !fumes.count); n++) { clock.value += dt; step(wa.w, IDLE); place(wa.g); look.update(va, wa.g, wa.w, clock.value, 1); draw(); fumes.onBeforeRender(); }
    const ta = va.trails[va.cur], had = ta.drawn, fumed = fumes.count;
    const vb = mkView(), wb = world({ seed: 9, x: 5, z: 0 });
    clock.value += dt; step(wb.w, IDLE); place(wb.g); look.update(vb, wb.g, wb.w, clock.value, 1);
    draw(); fumes.onBeforeRender();
    check('a new run sweeps the last run\'s trail and fumes away (no 2 s fade into the next run)',
      had >= 4 && fumed > 0 && ta.n === 0 && ta.drawn === 0 && fumes.count === 0, `${had} ${fumed} → ${ta.drawn} ${fumes.count}`);
    // within one run a dead cube's trail still fades out in full
    const vc = mkView();
    for (let n = 0; n < 60; n++) { clock.value += dt; step(wb.w, IDLE); place(wb.g); look.update(vc, wb.g, wb.w, clock.value, 1); draw(); }
    const tc = vc.trails[vc.cur];
    clock.value += dt; step(wb.w, IDLE); place(wb.g); look.update(vb, wb.g, wb.w, clock.value, 1); draw();
    check('…but not a trail of this run whose cube has died', tc.n > 0 && tc.drawn > 0 && tc.alpha < 0.4);
  }
}

console.log(failed ? `✗ sludge: ${failed} of ${passed + failed} checks failed` : `✔ sludge: ${passed} checks`);
process.exit(failed ? 1 : 0);
