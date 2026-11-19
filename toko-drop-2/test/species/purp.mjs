#!/usr/bin/env node
// purp.mjs — PURP CUBE's own checks, in bare node: 1.x's numbers
// (enemy.js:587, 678, 702-706, 738, 1000, 1209-1214, 1486-1566, 1682,
// 2297-2326, 2331, 2770-2777, 2967-3000, 3007, 3013-3029, 3067-3071;
// tuning.js:56-62, 304, 496, 511; crowd.js:107-116; main.js:2410-2420, 4495,
// 4517-4529, 5033, 9416, 10586-10620), asserted against the sim stepping on its fixed 1/60 s,
// and its look against a real three. Its flop, its spiral and its brood are
// also checked against an ORACLE: 1.x's own code for them, transcribed with
// 1.x's literals and fed the same random stream.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=157';
import { TUNING as T } from '../../js/tuning.js?v=157';
import { waveScale } from '../../js/sim/director/arcade.js?v=157';
import { makeRng } from '../../js/sim/rng.js?v=157';
import behaviour, { broodSize, orbitHeading } from '../../js/sim/species/purp.js?v=157';
import look from '../../js/render/looks/purp.js?v=157';
import reddLook from '../../js/render/looks/redd.js?v=157';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const TAU = Math.PI * 2;
const wrap = (a) => ((a % TAU) + TAU) % TAU;

const S = T.species.purp, F = S.flop, O = S.orbit, P = S.spiral, CH = S.children, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const [KS, CS] = T.gel.sq.cube;
const L0 = F.halfExtent * S.radius, D0 = L0 * Math.SQRT2;
const HOLD = 1e9;                          // a rest (or a clock) that never runs out

// a world with nothing in it but one PURP CUBE, the hero where asked and
// never out of lives; anchored (no swarm forces, no crowd) unless asked, so
// what moves it is its own step
function world({ seed = 1, mode = 'arcade', x = 0, z = 0, hero = [12, 0], o = {}, anchored = true, dashMode = 'pass', side = null } = {}) {
  const w = createWorld({ seed, mode, dashMode });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  const h = w.hero; h.x = h.px = hero[0]; h.z = h.pz = hero[1];
  const g = api.spawn(w, 'purp', x, z, { ...o });
  g.anchored = anchored;
  if (side) g.s.orbitSign = side;
  return { w, g };
}
// 1.x's own frame arithmetic
const stepsDown = (from) => { let t = from, n = 0; while (!(t <= 0)) { t -= dt; n++; } return n; };   // a countdown
const stepsUp = (dur) => { let t = 0, n = 0; while (!(Math.min(1, t / dur) >= 1)) { t += dt; n++; } return n; }; // a flop
const sprung = (sq, sqV, kick) => (sqV - (sq - 1) * KS) * CS + kick;
const cycleOf = (spd, rm = 1) => { const L = F.halfExtent * S.radius * rm, c = (2 * L) / Math.max(spd, F.minSpeed), f = Math.min(F.timeMax, c * F.shareOfCycle); return { L, stride: 2 * L, cycle: c, flop: f, rest: Math.max(F.restMin, c - f) }; };
const until = (w, pred, max = 600) => { for (let i = 1; i <= max; i++) { step(w, IDLE); if (pred()) return i; } return -1; };
const run = (w, n, input = IDLE) => { for (let i = 0; i < n; i++) step(w, input); };
const kids = (w) => w.gels.filter((o) => o.kind === 'purpmini');
const gelShots = (w) => w.bullets.filter((b) => !b.hero && !b.revenge);
const clearBullets = (w) => { w.bullets.length = 0; w.gelBullets = 0; w.heroBullets = 0; };
const popFrames = stepsDown(0.28);
const rolled = (w, r, fn) => { const nx = w.rng.next; let used = false; w.rng.next = () => (used ? nx() : (used = true, r)); try { fn(); } finally { w.rng.next = nx; } };

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.75, hp 3, speed 1.6, violet 0xcc44ff, bullets 0xcc66ff, no CFG fire interval (1.x enemy.js:587)',
    S.radius === 0.75 && S.hp === 3 && S.speed === 1.6 && S.color === 0xcc44ff && S.bulletColor === 0xcc66ff && S.fireInterval === null);
  check('a rounded cube, DRIFTER, hurts to touch in classic (MELEE_TYPES), a FAN biter (1.x tuning.js:304, 496, 511; main.js:2413)',
    S.family === 'cube' && S.role === 'DRIFTER' && S.contact === true && S.revenge === 'FAN');
  check('the death screen calls it 1.x\'s "purple cube" (main.js:5033)', S.deathLabel === 'purple cube');
  const R = T.movement.roles.DRIFTER;
  check('DRIFTER is 1.x\'s: dodge 0.3, flock 0.6, current 1.0, weave 0.25', R.dodge === 0.3 && R.flock === 0.6 && R.current === 1.0 && R.weave === 0.25);
  check('the orbit: tangential at 5, 0.18 a unit in or out, its side ±1 at 50/50 (1.x enemy.js:702, 2312-2314)',
    O.radius === 5 && O.pull === 0.18 && O.side === 0.5 && S.distFloor === 0.001);
  check('the spiral: first at 0.5 s, then 1.0 × iM, 2 arms from θ = 0, spin 0.42 + U·0.34 either way (1.x enemy.js:678, 703, 706, 2320)',
    P.first === 0.5 && P.period === 1.0 && P.arms === 2 && P.angle0 === 0 && P.spinMin === 0.42 && P.spinRand === 0.34 && P.spinSide === 0.5 && P.bulletSpeedMult === 1);
  check('the flop: arc 135° → 45°, −0.32 landing, ≤ 0.30 s and 0.65 of the cycle (1.x tuning.js:58-60)',
    F.arcStartDeg === 135 && F.arcEndDeg === 45 && F.landSquish === -0.32 && F.timeMax === 0.30 && F.shareOfCycle === 0.65);
  check('half-extent 0.9 r, rests ≥ 0.02 s, speed floor 0.01, first rest U·0.25, roll 0.70 / 0.90 / any, 0.7 with no heading',
    F.halfExtent === 0.9 && F.restMin === 0.02 && F.minSpeed === 0.01 && F.firstRest[0] === 0 && F.firstRest[1] === 0.25
    && F.toward === 0.70 && F.keep === 0.90 && F.idleKeep === 0.7);
  const RF = T.species.redd.flop;
  check('its flop table is every cube\'s: REDD\'s, number for number (1.x has one _flopMove)',
    Object.keys(RF).length === Object.keys(F).length && Object.keys(RF).every((k) => JSON.stringify(RF[k]) === JSON.stringify(F[k])));
  check('the brood: PURP MINIs, 5 + 2·⌊(1/max(iM, 0.1) − 1)/0.09⌋, no cap of its own (1.x enemy.js:3068-3070)',
    CH.kind === 'purpmini' && CH.base === 5 && CH.perTier === 2 && CH.max === undefined && CH.tierFloor === 0.1 && CH.tierStep === 0.09);
  // out when the pop ends and no later: 1.x's destroy() set _deathT = 0.28,
  // updateDeath counted it down and flagged the brood at ≤ 0, and the frame
  // loop built it then (enemy.js:2970, 2992-2999, 3007; main.js:10588-10620)
  // as a live Enemy — 1.x had no appear to wait out on top of the pop, and
  // 2.0 no longer has one either (owner, 2026-10-22)
  check('…freeform, 1.2 + U·1.5 out (1.x main.js:10594-10598); out when the 0.28 s pop ends, with no appear on top (1.x enemy.js:2970, 2992-2999, 3007)',
    CH.dist[0] === 1.2 && CH.dist[1] === 2.7 && CH.jitter === undefined && T.blob.death === 0.28 && T.gel.appear === undefined);
  const lk = S.look;
  check('the look: RoundedBox corner 0.18, 4 segments (enemy.js:738); breath 0.10 at 2.4 rad/s, half across (tuning.js:61, enemy.js:2773-2775)',
    lk.corner === 0.18 && lk.segments === 4 && lk.breatheAmp === 0.10 && lk.breatheRate === 2.4 && lk.breatheXZ === 0.5 && lk.sqFloor === 0.1);
  const src = readFileSync(new URL('../../js/sim/species/purp.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('no special hits, the core\'s circle and contact; a death of its own (the brood)',
    !behaviour.onHit && !behaviour.hitTest && !behaviour.touches && typeof behaviour.onKill === 'function');
}

// ── its starting state (1.x enemy.js:678, 702-706, 1209-1214) ────────
{
  const rests = [], spins = [], sides = { 1: 0, '-1': 0 }, dirs = new Set();
  let fresh = true, pos = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const { g } = world({ seed });
    rests.push(g.s.rest); spins.push(Math.abs(g.s.spin)); sides[g.s.orbitSign]++; dirs.add(`${g.s.dirX},${g.s.dirZ}`);
    if (g.s.spin > 0) pos++;
    fresh &&= g.s.flopping === false && g.s.tumble === false && near(g.s.lift, L0, 1e-12) && g.s.fireT === 0.5 && g.s.spiralA === 0 && g.tell === 0;
  }
  check('it starts at rest on a face, its spiral clock at 0.5 s and its arms at θ = 0, no tell', fresh);
  check('the first rest is in [0, 0.25) and spread over it', rests.every((t) => t >= 0 && t < 0.25) && Math.min(...rests) < 0.01 && Math.max(...rests) > 0.24);
  check('its orbit side is +1 or −1, about half each', sides[1] + sides[-1] === 400 && sides[1] > 160 && sides[-1] > 160, JSON.stringify(sides));
  check('its spin is 0.42..0.76 rad a pulse, spread over it', spins.every((s) => s >= 0.42 && s < 0.76) && Math.min(...spins) < 0.43 && Math.max(...spins) > 0.75);
  check('…turning either way, about half each', pos > 160 && pos < 240, `${pos}/400`);
  check('its first heading is any of the four cardinals', dirs.size === 4);
}

// ── the circler's heading (1.x enemy.js:2310-2314, 1514-1522) ─────────
{
  // the vector it wants, exactly 1.x's arithmetic
  const want = (sign, hero, at = [0, 0]) => orbitHeading(S, sign, at[0], at[1], hero[0], hero[1]);
  const [ax, az] = want(1, [5, 0]);
  check('on the ring (5 off) it wants purely tangential: bearing (1, 0) turned +90° (x → z) for side +1', near(ax, 0, 1e-15) && near(az, 1, 1e-15));
  const [bx, bz] = want(-1, [12, 0]);
  check('12 off: (dist − 5)·0.18 = 1.26 of pull in, plus the tangent', near(bx, 1.26, 1e-12) && near(bz, -1, 1e-15));
  const [cx, cz] = want(1, [0, 3]);
  check('3 off (inside): a push out of 0.36 against the tangent', near(cx, -1, 1e-15) && near(cz, -0.36, 1e-12));
  const [dx, dz] = want(1, [0, 0]);
  check('on top of you there is no bearing: no heading at all', dx === 0 && dz === 0);

  // the cardinal it takes when the roll says "toward": the larger axis of that vector
  const pick = (hero, side, r = 0.5, at = [0, 0]) => {
    const { w, g } = world({ x: at[0], z: at[1], hero, side });
    g.s.rest = 0.001;
    rolled(w, r, () => step(w, IDLE));
    return g.s.flopping ? `${g.s.dirX},${g.s.dirZ}` : 'rest';
  };
  check('far off (12 along +x) the pull wins: it flops at you, either side', pick([12, 0], 1) === '1,0' && pick([12, 0], -1) === '1,0');
  check('…10.6 off (pull 1.008) it still comes in; 10.5 off (pull 0.99) the tangent wins: +z for side +1, −z for −1',
    pick([10.6, 0], 1) === '1,0' && pick([10.5, 0], 1) === '0,1' && pick([10.5, 0], -1) === '0,-1');
  check('on the ring and inside it, straight off a cardinal bearing, it goes round you', pick([5, 0], 1) === '0,1' && pick([3, 0], -1) === '0,-1' && pick([0, -4], 1) === '1,0');
  // a bearing of 30°: inside the ring the push out turns the snapped axis away from you
  const b30 = (d) => [d * Math.cos(Math.PI / 6), d * Math.sin(Math.PI / 6)];
  check('a bearing of 30°, side +1: on the ring the tangent (−0.5, 0.87) goes +z …', pick(b30(5), 1) === '0,1');
  check('…3 off, pushed out by 0.36, it goes (−0.81, 0.69): −x, backing off', pick(b30(3), 1) === '-1,0');
  check('…8 off, pulled in by 0.54, side −1 goes (0.97, −0.60): +x, cutting in', pick(b30(8), -1) === '1,0');
  // the roll (1.x enemy.js:1519): toward below 0.70, the last heading below 0.90, else any
  const keepDir = (r) => {
    const { w, g } = world({ x: 0, z: 0, hero: [5, 0], side: 1 });
    g.s.rest = 0.001; g.s.dirX = -1; g.s.dirZ = 0;
    rolled(w, r, () => step(w, IDLE));
    return `${g.s.dirX},${g.s.dirZ}`;
  };
  check('a roll of 0.699: the orbit\'s cardinal; 0.70 and 0.899: its last heading', keepDir(0.699) === '0,1' && keepDir(0.70) === '-1,0' && keepDir(0.899) === '-1,0');
  const any = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const { w, g } = world({ seed, x: 0, z: 0, hero: [5, 0], side: 1 });
    g.s.rest = 0.001; g.s.dirX = -1; g.s.dirZ = 0;
    rolled(w, 0.9, () => step(w, IDLE));
    any.add(`${g.s.dirX},${g.s.dirZ}`);
  }
  check('0.90: any of the four, drawn afresh', any.size === 4);
  const { w: wt, g: gt } = world({ x: 2, z: 2, hero: [2, 2], side: 1 });
  gt.s.rest = 0.001; gt.s.dirX = 0; gt.s.dirZ = -1;
  rolled(wt, 0.69, () => step(wt, IDLE));
  check('on top of you, a roll under 0.7 keeps its line', gt.s.flopping && gt.s.dirX === 0 && gt.s.dirZ === -1);
}

// ── the spiral: when (1.x enemy.js:703, 2318-2320) ───────────────────
for (const [iM, label] of [[1, 'wave 1'], [waveScale(5).intervalMult, 'wave 5'], [waveScale(10).intervalMult, 'wave 10'], [waveScale(30).intervalMult, 'wave 30']]) {
  const { w, g } = world({ x: 0, z: 0, hero: [5, 0], o: { intervalMult: iM } });
  g.s.rest = HOLD;                                          // standing still: the clock runs moving or not
  const at = [];
  for (let i = 1; i <= 60 * 8; i++) {
    clearBullets(w);
    step(w, IDLE);
    if (w.events.some((e) => e.type === 'gelShot' && e.id === g.id)) at.push(i);
  }
  const gaps = at.slice(1).map((v, k) => v - at[k]);
  const first = stepsDown(P.first), every = stepsDown(P.period * iM);
  check(`${label} (iM ${iM.toFixed(3)}): the first pulse ${first} steps in (0.5 s), then one every ${every} (${(P.period * iM).toFixed(3)} s, the clock assigned)`,
    at[0] === first && gaps.length >= 6 && gaps.every((k) => k === every), `${at[0]} | ${gaps.join(' ')}`);
}
{
  // SWIFT and a surge speed its feet, never its gun: the spiral reads intervalMult alone
  for (const o of [{ affix: 'swift' }, { variant: 'elite' }]) {
    const { w, g } = world({ x: 0, z: 0, hero: [5, 0], o });
    g.s.rest = HOLD; g.surgeT = 1e9; g.surgeMult = 1.6;
    const at = [];
    for (let i = 1; i <= 60 * 4; i++) { clearBullets(w); step(w, IDLE); if (w.events.some((e) => e.type === 'gelShot')) at.push(i); }
    check(`${o.affix ?? o.variant}, surging: still 0.5 s, then 1.0 s apart`, at[0] === stepsDown(0.5) && at[1] - at[0] === stepsDown(1.0), at.join(' '));
  }
}

// ── the spiral: what (1.x enemy.js:2321-2325; bullet.js:91-107) ──────
{
  const { w, g } = world({ x: -3, z: 2, hero: [2, 2] });
  g.s.rest = HOLD; g.s.spin = 0.5;
  const volleys = [];
  for (let i = 0; i < 60 * 6; i++) {
    clearBullets(w);
    step(w, IDLE);
    const b = gelShots(w);
    if (b.length) volleys.push({ b, ev: w.events.filter((e) => e.type === 'gelShot') });
  }
  check('six seconds: six pulses (0.5, 1.5 … 5.5 s)', volleys.length === 6, `${volleys.length}`);
  let two = true, opposite = true, fromIt = true, look = true, sound = true, turned = true;
  volleys.forEach(({ b, ev }, k) => {
    two &&= b.length === 2;
    const a0 = Math.atan2(b[0].vz, b[0].vx), a1 = Math.atan2(b[1].vz, b[1].vx);
    opposite &&= near(wrap(a1 - a0), Math.PI, 1e-12);
    turned &&= near(wrap(a0), wrap(k * 0.5), 1e-9);
    fromIt &&= b.every((x) => x.px === -3 && x.pz === 2);
    look &&= b.every((x) => near(x.speed, 7, 1e-12) && near(Math.hypot(x.vx, x.vz), 7, 1e-12) && x.color === 0xcc66ff && x.src === 'purp' && x.r === T.bullets.gelRadius && x.homing === 0);
    sound &&= ev.length === 1 && ev[0].kind === 'purp' && ev[0].n === 2 && ev[0].x === -3 && ev[0].z === 2 && !ev[0].spiral && near(ev[0].angle, k * 0.5, 1e-9);
  });
  check('every pulse is TWO bullets …', two);
  check('…on opposite arms, θ and θ + π', opposite);
  check('…the arms turning by its spin each pulse: θ = 0, 0.5, 1.0 …', turned);
  check('…from where it stood, at the gel bullet\'s 7 u/s, in 0xcc66ff, tagged purp, plain (not homing)', fromIt && look);
  check('…and one gelShot a pulse for the view and the sound (2.0\'s quiet tick: 1.x\'s PURP was silent)', sound);
  check('it counts its pulses for the view', g.s.pulses === 6);
  // its galaxy: a negative spin turns the arms the other way
  const r = world({ x: 0, z: 0, hero: [5, 0] });
  r.g.s.rest = HOLD; r.g.s.spin = -0.6;
  const angs = [];
  for (let i = 0; i < 60 * 4; i++) { clearBullets(r.w); step(r.w, IDLE); const b = gelShots(r.w); if (b.length) angs.push(Math.atan2(b[0].vz, b[0].vx)); }
  check('a cube spinning −0.6 turns its arms the other way: θ = 0, −0.6, −1.2, −1.8', angs.length === 4 && angs.every((a, k) => near(a, -0.6 * k, 1e-9)), angs.map((a) => a.toFixed(3)).join(' '));
  // the pool is full: nothing comes out, but the arms still turn (1.x spawnDir returns early)
  const p = world({ x: 0, z: 0, hero: [5, 0] });
  p.g.s.rest = HOLD; p.g.s.spin = 0.5;
  run(p.w, stepsDown(0.5) - 1);
  p.w.gelBullets = T.bullets.maxGel;
  const refused = p.w.refused;
  step(p.w, IDLE);
  check('with the bullet pool full, a pulse puts nothing on the floor (refused 2) and still turns its arms',
    p.w.refused === refused + 2 && gelShots(p.w).length === 0 && near(p.g.s.spiralA, 0.5, 1e-15), `${p.w.refused - refused}`);
}
{
  // it fires mid-flop, from where the step began (1.x fires from `ex` before _flopMove)
  const { w, g } = world({ x: -4, z: 1, hero: [8, 1], side: 1 });
  g.s.fireT = 0.2; g.s.rest = 0.001;
  let mid = null;
  for (let i = 0; i < 40 && !mid; i++) {
    clearBullets(w);
    const px = g.x, pz = g.z, was = g.s.flopping;
    step(w, IDLE);
    if (gelShots(w).length && was && g.s.flopping) mid = { px, pz, b: gelShots(w), x: g.x, z: g.z };
  }
  check('a pulse in the middle of a tumble comes from where the cube stood as the step began, not where the flop put it',
    mid && mid.b.length === 2 && mid.b.every((b) => b.px === mid.px && b.pz === mid.pz) && Math.hypot(mid.x - mid.px, mid.z - mid.pz) > 0.01);
}

// ── one flop on a cardinal (1.x enemy.js:1542-1565) ──────────────────
{
  const { w, g } = world({ x: -4, z: 1, hero: [-4 + 12, 1], side: 1 });   // 12 off along +x: it flops +x
  g.s.rest = 0.001; g.s.fireT = HOLD;
  const spd = S.speed, { L, stride, flop, rest } = cycleOf(spd);
  const log = [];
  let x0 = null, kinematic = true, lifted = 0;
  for (let i = 0; i < 60; i++) {
    const pre = { sq: g.sq, sqV: g.sqV };
    rolled(w, 0.5, () => step(w, IDLE));
    if (x0 == null && g.s.flopping) x0 = { x: g.s.x0, z: g.s.z0, dx: g.s.dirX, dz: g.s.dirZ };
    if (!g.s.tumble) { if (x0) break; continue; }
    const p = Math.min(1, g.s.t / g.s.dur), ang = (135 - 90 * p) * Math.PI / 180;
    const disp = p >= 1 ? stride : L + D0 * Math.cos(ang);
    kinematic &&= near(g.x, x0.x + x0.dx * disp, 1e-12) && near(g.z, x0.z + x0.dz * disp, 1e-12) && near(g.s.lift, p >= 1 ? L : D0 * Math.sin(ang), 1e-12);
    lifted = Math.max(lifted, g.s.lift);
    log.push({ p, landed: !g.s.flopping, sqV: g.sqV, rest: g.s.rest, pre });
  }
  check('it flops on a cardinal, +x, from where it stood', x0 && x0.dx === 1 && x0.dz === 0 && x0.x === -4 && x0.z === 1, JSON.stringify(x0));
  check('it faces its heading', g.faceX === 1 && g.faceZ === 0);
  check('the flop lasts min(0.30, 0.65 × 0.844) = 0.30 s at 1.6 u/s, on 1.x\'s frame arithmetic', log.length === stepsUp(flop) && near(flop, 0.30, 1e-12), `${log.length}`);
  check('each step the centre sits L + D·cos(ang) along the heading and D·sin(ang) up, ang 135° → 45° linear in time', kinematic);
  check('it lifts to D = L√2 = 0.955 at the top of the arc', near(lifted, D0, 3e-3) && lifted <= D0 + 1e-12, `${lifted}`);
  check('a flop advances exactly one face, 2L = 1.35', near(g.x - x0.x, 1.35, 1e-12) && g.z === x0.z);
  const land = log[log.length - 1];
  check('the landing kicks the squash spring flat: −0.32 (1.x enemy.js:1561)', land.landed && near(land.sqV, sprung(land.pre.sq, land.pre.sqV, F.landSquish), 1e-12));
  check('and it rests for the rest of the cycle: 1.35 / 1.6 − 0.30 = 0.544 s', near(land.rest, rest, 1e-12) && near(rest, 1.35 / 1.6 - 0.30, 1e-12), `${land.rest}`);
}

// ── the cadence: cycle = 2L / spd, so the average ground speed is spd ──
for (const wave of [5, 8, 12, 26]) {
  const mult = waveScale(wave).speedMult, c = cycleOf(S.speed * mult);
  const { w, g } = world({ x: -6, z: 0, hero: [0, 0], o: { speedMult: mult } });
  g.s.fireT = HOLD;
  const lands = [];
  for (let i = 1; i <= 600; i++) {
    const was = g.s.flopping;
    step(w, IDLE);
    if (was && !g.s.flopping) lands.push(i);
  }
  const gaps = lands.slice(1).map((v, k) => v - lands[k]);
  const want = stepsDown(c.rest) + stepsUp(c.flop) - 1;
  check(`wave ${wave} (×${mult.toFixed(3)}): flop ${c.flop.toFixed(3)} s, rest ${c.rest.toFixed(3)} s — every cycle ${want} steps`, gaps.length >= 8 && gaps.every((k) => k === want), gaps.join(' '));
}

// ── the walls turn it back (1.x enemy.js:1523-1531) ──────────────────
{
  const w0 = createWorld({});
  // the tangent runs it into the right wall: you 3 below it, side +1 wants (1, 0.36)
  const { w, g } = world({ x: w0.hx - 1.5, z: 0, hero: [w0.hx - 1.5, -3], side: 1 });
  g.s.rest = 0.001;
  rolled(w, 0.5, () => step(w, IDLE));
  check('a stride into the right wall is turned back along x', g.s.flopping && g.s.dirX === -1 && g.s.dirZ === 0, `${g.s.dirX},${g.s.dirZ}`);
  const r2 = world({ x: w0.hx - 2.2, z: 0, hero: [w0.hx - 2.2, -3], side: 1 });
  r2.g.s.rest = 0.001;
  rolled(r2.w, 0.5, () => step(r2.w, IDLE));
  check('…a stride short of it keeps its heading', r2.g.s.dirX === 1);
  // a long natural run circling you in a corner: it never leaves the arena, and every landing is a whole face
  const r = world({ seed: 9, x: 0, z: 0, hero: [w0.hx - 0.6, w0.hz - 0.6] });
  let inside = true, faces = true, x0 = 0, z0 = 0, landings = 0;
  for (let i = 0; i < 3600; i++) {
    const was = r.g.s.flopping;
    clearBullets(r.w);
    step(r.w, IDLE);
    if (!was && r.g.s.flopping) { x0 = r.g.s.x0; z0 = r.g.s.z0; }
    if (was && !r.g.s.flopping) { landings++; faces &&= near(Math.hypot(r.g.x - x0, r.g.z - z0), 1.35, 1e-9); }
    inside &&= Math.abs(r.g.x) <= r.w.hx - r.g.r + 1e-9 && Math.abs(r.g.z) <= r.w.hz - r.g.r + 1e-9;
  }
  check('circling you in a corner for 60 s it stays inside, a whole face a flop', inside && faces && landings > 50, `${landings}`);
}

// ── it circles you at about 5 (the circler, end to end) ───────────────
{
  // its own step alone (anchored), you standing still: it comes in from 14 off and goes round you
  // (the roll's 30% that is not "toward" walks it off the ring now and then, so
  // the bounds are on where it spends its time, not on every step)
  let reached = 0, held = 0, round = 0, sideways = 0, kept = 0, median = [];
  const notes = [];
  for (let seed = 1; seed <= 24; seed++) {
    const { w, g } = world({ seed, x: -14, z: 3, hero: [0, 0] });
    w.hero.mercy = 1e9;
    let swept = 0, prev = Math.atan2(g.z, g.x), sum = 0, n = 0, band = 0, close = 0, at7 = -1;
    for (let i = 0; i < 60 * 60; i++) {
      clearBullets(w);
      step(w, IDLE);
      const d = Math.hypot(g.x, g.z), a = Math.atan2(g.z, g.x);
      if (at7 < 0 && d < 7) at7 = i * dt;
      if (i > 60 * 15) {
        let da = a - prev; da = Math.atan2(Math.sin(da), Math.cos(da)); swept += da;
        sum += d; n++; if (d > 3 && d < 7.5) band++; if (d < 2) close++;
      }
      prev = a;
    }
    const mean = sum / n, turns = swept / TAU;
    notes.push(`${mean.toFixed(1)}/${turns.toFixed(1)}/${(band / n).toFixed(2)}`);
    median.push(mean);
    if (at7 >= 0 && at7 < 20) reached++;
    if (mean > 4 && mean < 6.5 && band / n > 0.65) held++;
    if (Math.abs(turns) > 1) round++;
    if (Math.sign(turns) === -g.s.orbitSign) sideways++;      // side +1 turns the bearing x → z: it goes round the other way in angle
    if (close / n < 0.1) kept++;
  }
  median.sort((a, b) => a - b);
  check('from 14 off it comes within 7 of you inside 20 s, every time', reached === 24, `${reached}/24`);
  check('…then holds an orbit: over the next 45 s its mean distance is 4–6.5 and it spends 65%+ of the time 3–7.5 off, every time', held === 24, notes.join(' '));
  check('…the middle of those means is ~5, the orbit 1.x aims at', median[12] > 4.7 && median[12] < 5.6, `${median[12]}`);
  check('…going round you more than once in those 45 s, every time', round === 24, notes.join(' '));
  check('…always the way its side says', sideways === 24, `${sideways}/24`);
  check('…and under 2 of you less than a tenth of the time: a circler, not a rusher', kept === 24, `${kept}/24`);
}

// ── its touch hurts; three hits kill it; it bites back in HARDCADE ────
{
  const { w, g } = world({ x: 1.2, z: 0, hero: [0, 0] });
  g.s.rest = HOLD; g.s.fireT = HOLD;
  w.hero.lives = 3;
  step(w, IDLE);
  check('standing within r + 0.5 = 1.25 of it hurts (1.x MELEE_TYPES)', w.hero.lives === 2 && w.killedBy === 'purp');
  const { w: w2, g: g2 } = world({ x: 1.26, z: 0, hero: [0, 0] });
  g2.s.rest = HOLD; g2.s.fireT = HOLD; w2.hero.lives = 3;
  step(w2, IDLE);
  check('…1.26 off does not', w2.hero.lives === 3);
  // its bullets hurt like any gel bullet's
  const s = world({ x: -3, z: 0, hero: [0, 0] });
  s.g.s.rest = HOLD; s.g.s.fireT = 0.001; s.w.hero.lives = 3;
  until(s.w, () => s.w.hero.lives < 3, 60);
  check('its spiral, fired at θ = 0 from 3 off, hits you: killed by purp', s.w.hero.lives === 2 && s.w.killedBy === 'purp');
  for (const mode of ['arcade', 'hardcade']) {
    const r = world({ mode, x: 10, z: 0, hero: [0, 0] });
    r.w.wave = 6; r.g.s.rest = HOLD; r.g.s.fireT = HOLD;
    let ok = true;
    for (let k = 1; k <= 3; k++) {
      api.heroBullet(r.w, r.g.x - 0.5, r.g.z, 0);
      const pre = { sq: r.g.sq, sqV: r.g.sqV };
      step(r.w, IDLE);
      if (k < 3) ok &&= r.g.alive && r.g.hp === 3 - k && r.g.flash > 0 && near(r.g.sqV, sprung(pre.sq, pre.sqV, T.gel.sq.hit), 1e-12);
    }
    const kills = r.w.events.filter((e) => e.type === 'kill' && e.kind === 'purp');
    check(`${mode}: two hits flash and squash it (−0.75), the third kills it`, ok && !r.g.alive && kills.length === 1);
    check(`${mode}: a big body (0.75): the core's shockwave, puddle and chunks`, kills[0]?.big === true && kills[0].r === 0.75 && kills[0].color === 0xcc44ff);
    for (let i = 0; i < 120 && r.w.seeds.length; i++) step(r.w, IDLE);   // v103: the corpse warns before it bites
    const bite = r.w.bullets.filter((b) => b.revenge);
    if (mode === 'arcade') check('arcade: its corpse fires nothing', bite.length === 0 && !r.w.events.some((e) => e.type === 'revenge'));
    else {
      const aim = Math.PI;                                  // you are along −x from the corpse
      const angs = bite.map((b) => Math.atan2(b.vz, b.vx)).sort((a, b) => a - b);
      const want = [-2, -1, 0, 1, 2].map((j) => wrap(aim + j * 0.5));
      const got = bite.map((b) => wrap(Math.atan2(b.vz, b.vx))).sort((a, b) => a - b);
      check('hardcade: its corpse throws a FAN at you — 5 slow bullets 0.5 rad apart, in 0x9b00cb (1.x tuning.js:511, 515)',
        bite.length === 5 && want.sort((a, b) => a - b).every((a, j) => near(a, got[j], 1e-9)) && bite.every((b) => b.color === 0x9b00cb && near(b.speed, 7 * 0.6, 1e-12)), `${bite.length} ${angs.map((a) => a.toFixed(2))}`);
    }
  }
}

// ── the brood: how many (1.x enemy.js:3069-3070) ─────────────────────
{
  for (const [iM, n] of [[1, 5], [0.95, 5], [0.945, 5], [0.917, 7], [0.89, 7], [0.835, 9], [0.78, 11], [0.505, 25], [0.35, 45], [0.1, 205], [0.05, 205]]) {
    check(`iM ${iM}: ${n} minis (floored, not rounded; no cap)`, broodSize(CH, iM) === n, `${broodSize(CH, iM)}`);
  }
  const x = (iM) => 5 + Math.floor((1 / Math.max(iM, 0.1) - 1) / 0.09) * 2;
  let same = true;
  for (let iM = 0.3; iM <= 1.0001; iM += 0.0025) same &&= broodSize(CH, iM) === x(iM);
  check('across every intervalMult the director can give (0.35..1) it is 1.x\'s formula', same);
  const byWave = [1, 2, 3, 4, 5, 8, 10, 26].map((wave) => broodSize(CH, waveScale(wave).intervalMult));
  check('by the director\'s own waves: 5 5 7 9 11 17 25 45 (waves 1-5, 8, 10, 26) — 11 at its first wave', byWave.join(' ') === '5 5 7 9 11 17 25 45', byWave.join(' '));
  for (const [iM, n] of [[1, 5], [0.89, 7], [0.78, 11]]) {
    const { w, g } = world({ x: 0, z: 0, o: { intervalMult: iM } });
    api.kill(w, g, 'hero');
    check(`a PURP of iM ${iM} that dies drops ${n}`, kids(w).length === n, `${kids(w).length}`);
  }
}

// ── the brood: where, what, and when (1.x main.js:10586-10620, enemy.js:2992-3000) ──
{
  const { w, g } = world({ x: 2, z: -1, hero: [-12, 6], o: { speedMult: 1.4, intervalMult: 0.78 } });
  g.s.fireT = HOLD;
  step(w, IDLE);
  g.hp = 1; api.heroBullet(w, g.x - g.r - 0.3, g.z, 0); step(w, IDLE);
  const k = kids(w);
  check('a bullet kill at wave 5: 11 PURP MINIs', !g.alive && k.length === 11, `${k.length}`);
  check('ordinary bodies: hp 1, r 0.26, no variant, no affix, marked as children',
    k.every((c) => c.hp === 1 && c.maxHp === 1 && c.r === 0.26 && c.variant === 'normal' && c.affix === null && c.child === true && !c.isBoss));
  check('on the parent\'s wave multipliers (1.x new Enemy(…, e._speedMult, e._intervalMult))', k.every((c) => c.speedMult === 1.4 && c.intervalMult === 0.78));
  const ds = k.map((c) => Math.hypot(c.x - g.x, c.z - g.z));
  check('1.2–2.7 u out', ds.every((d) => d >= 1.2 - 1e-12 && d < 2.7 + 1e-12));
  check('none is out yet: they wait out the pop (the core\'s wait, state appear)', k.every((c) => c.state === 'appear'));
  const at = k.map((c) => [c.x, c.z]);
  let activeAt = -1, still = true, unhurt = true;
  const lives = w.hero.lives;
  for (let n = 1; n <= 40; n++) {
    if (n === 2) { w.hero.x = k[1].x; w.hero.z = k[1].z; }  // stand on one: it does not hurt yet
    step(w, IDLE);
    if (activeAt < 0 && k.every((c) => c.state === 'active')) activeAt = n;
    if (activeAt < 0) {
      still &&= k.every((c, j) => c.x === at[j][0] && c.z === at[j][1]);
      unhurt &&= w.hero.lives === lives;
    }
    if (n === 3) { w.hero.x = -12; w.hero.z = 6; }
  }
  check(`they come out on 1.x's frame: ${popFrames} steps after the kill (the death pop's 0.28 s)`, activeAt === popFrames, `${activeAt}`);
  check('until then they do not move, nor hurt you', still && unhurt);
  const d0 = k.reduce((s, c) => s + Math.hypot(c.x - w.hero.x, c.z - w.hero.z), 0);
  run(w, 60);
  const d1 = k.reduce((s, c) => s + Math.hypot(c.x - w.hero.x, c.z - w.hero.z), 0);
  check('once out, the scatter tumbles at you', d1 < d0 - 11 * 2, `${d0.toFixed(2)} → ${d1.toFixed(2)}`);
}
{
  // the frame they come out on, against 1.x's frame order: the pop runs out
  // in the enemy update loop (main.js:10408 → enemy.js:2992-2999), the brood
  // is built after that loop (main.js:10588-10620) and BEFORE the bullet and
  // contact passes (main.js:10636, 10889) — so in 1.x a mini can be shot and
  // hurts to touch on the very frame it appears (no appear: a live Enemy),
  // and its own update first runs on the next. One frame earlier it did not
  // exist at all.
  const { w, g } = world({ x: 0, z: 0, hero: [-12, 6], o: { intervalMult: 0.89 } });
  g.s.fireT = HOLD;
  api.kill(w, g, 'env');
  const k = kids(w), rest = k.map((c) => c.s.rest), lives = w.hero.lives;
  run(w, popFrames - 2);
  clearBullets(w);
  api.heroBullet(w, k[0].x - k[0].r - 0.3, k[0].z, 0);
  w.hero.x = k[2].x; w.hero.z = k[2].z;
  step(w, IDLE);                                            // step popFrames − 1: still waiting
  check(`on step ${popFrames - 1} a bullet goes through a waiting mini and standing on one is safe`,
    k.every((c) => c.alive && c.state === 'appear') && w.hero.lives === lives, `${k.map((c) => c.state).join(' ')} lives ${lives - w.hero.lives}`);
  clearBullets(w);
  w.hero.mercy = 0;
  api.heroBullet(w, k[1].x - k[1].r - 0.3, k[1].z, 0);
  step(w, IDLE);                                            // step popFrames: out
  const shot = w.events.find((e) => e.type === 'kill' && e.id === k[1].id);
  check(`on step ${popFrames} (1.x's frame) one is shot dead, as 1.x's bullet pass would`, !k[1].alive && shot?.src === 'hero', `${k[1].alive} ${shot?.src}`);
  check('…and the one under you hurts on that same step (1.x\'s contact pass)', w.hero.lives === lives - 1, `lives ${lives - w.hero.lives}`);
  // (1.x's crowd pass, main.js:10426, ran before the build too, so 1.x's brood
  // also sat exactly where it was placed on that frame; 2.0's core leaves a
  // brood out of its crowd solve on its release step — the core's rule, not
  // this species', asserted in test/sim.mjs)
  check('…but none has taken a step of its own yet: its first rest has not started counting (1.x enemy.js:1209-1214)',
    k.every((c, j) => !c.s.flopping && c.s.rest === rest[j]), k.map((c, j) => (c.s.rest - rest[j]).toExponential(1)).join(' '));
  step(w, IDLE);
  check('…and the next step it does: every rest is counting down or has run out into a flop (1.x enemy.js:1505-1506)',
    k.filter((c) => c.alive).every((c, j) => c.s.flopping || c.s.rest < rest[k.indexOf(c)]));
}
{
  // FREEFORM: each angle its own draw, so the brood is a scatter, not a ring of even spokes
  const offs = [], angs = [], dsAll = [];
  let uneven = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const { w, g } = world({ seed, x: 0, z: 0, o: { intervalMult: 0.89 } });
    api.kill(w, g, 'env');
    const a = kids(w).map((c) => wrap(Math.atan2(c.z, c.x)));
    a.forEach((v, j) => { angs.push(v); offs.push(wrap(v - (j / 7) * TAU)); dsAll.push(Math.hypot(kids(w)[j].x, kids(w)[j].z)); });
    const sorted = [...a].sort((p, q) => p - q), gaps = sorted.map((v, j) => wrap((sorted[j + 1] ?? sorted[0] + TAU) - v));
    if (Math.max(...gaps) > (TAU / 7) * 2) uneven++;
  }
  const bins = Array(8).fill(0); for (const a of angs) bins[Math.floor(a / (TAU / 8))]++;
  check('its angles cover the whole circle evenly over many corpses', bins.every((b) => b > angs.length / 8 * 0.7), bins.join(' '));
  check('…and are NOT REDD\'s spokes: offsets from (j/n)·2π spread over the whole circle, not [0, 0.3)', offs.filter((o) => o > 0.3).length > offs.length * 0.8);
  check('…so most broods leave a wide gap somewhere (a gap over two even spokes)', uneven > 60, `${uneven}/120`);
  check('the distance covers [1.2, 2.7)', Math.min(...dsAll) < 1.25 && Math.max(...dsAll) > 2.65 && Math.max(...dsAll) < 2.7);
  // every death broods: a bullet, a dash, the environment (1.x destroy() sets it for all)
  for (const src of ['hero', 'dash', 'env']) {
    const { w, g } = world({ x: 0, z: 0 });
    api.kill(w, g, src);
    check(`a ${src} kill broods`, kids(w).length === 5);
  }
  const { w, g } = world({ x: 6, z: 0, o: { affix: 'swift', speedMult: 1.1 } });
  api.kill(w, g, 'env');
  check('a SWIFT parent\'s brood inherits the ×1.35 (1.x main.js:9416 bakes it into _speedMult)',
    kids(w).every((c) => near(c.speedMult, 1.1 * 1.35, 1e-12) && c.affix === null));
  const { w: w2, g: g2 } = world({ x: 6, z: 0, o: { variant: 'elite' } });
  api.kill(w2, g2, 'env');
  check('an elite\'s brood: five ordinary minis', kids(w2).length === 5 && kids(w2).every((c) => c.r === 0.26 && c.hp === 1 && c.variant === 'normal'));
  check('an elite PURP (r 0.9, hp 6) takes 6 hits (the core\'s elite)', near(g2.r, 0.9, 1e-12) && g2.maxHp === 6);
  const w3 = createWorld({ seed: 3 }); w3.director = { step() {} };
  const g3 = api.spawn(w3, 'purp', w3.hx - 0.8, w3.hz - 0.8);
  api.kill(w3, g3, 'env');
  check('a corner corpse: its brood is inside the walls', kids(w3).length === 5 && kids(w3).every((c) => Math.abs(c.x) <= w3.hx - c.r && Math.abs(c.z) <= w3.hz - c.r));
}
{
  // its own death's shockwave (1.x main.js:4495, 4517-4529): every body alive
  // at the kill within 3.5 takes −0.55 on its squash spring — but the brood
  // was built 0.28 s later, so it never took its parent's ("newborn minnows
  // must not be vaporized by the shockwave that birthed them")
  for (const variant of ['normal', 'elite']) {
    const { w, g } = world({ x: 0, z: 0, o: { intervalMult: 0.78, variant } });
    g.s.fireT = HOLD;
    const near1 = api.spawn(w, 'yela', 3.4, 0), far1 = api.spawn(w, 'yela', -3.6, 0);
    g.hp = 1; api.heroBullet(w, g.x - g.r - 0.3, g.z, 0); step(w, IDLE);
    const k = kids(w);
    check(`${variant}: its death squashes a body 3.4 off (−0.55) and not one 3.6 off`, !g.alive && near(near1.sqV, -0.55, 1e-12) && far1.sqV === 0, `${near1.sqV} ${far1.sqV}`);
    check(`${variant}: …but not its own brood, all 2.7 or less from it: each starts unsquashed, sq 1 and sqV 0`, k.length === 11 && k.every((c) => c.sq === 1 && c.sqV === 0), k.map((c) => c.sqV).join(','));
    run(w, popFrames);
    check(`${variant}: …and comes out of the pop still: sq 1`, k.every((c) => c.state === 'active' && c.sq === 1));
  }
}
{
  // nor does another big death during the pop rattle the brood: 1.x had
  // nothing there yet to rattle (it built the brood when the pop ended,
  // main.js:10586-10620; the shockwave took only the living, main.js:4518-4529)
  const { w, g } = world({ x: 0, z: 0, o: { intervalMult: 0.78 } });
    g.s.fireT = HOLD;
  const other = api.spawn(w, 'orange', 0, 3); other.anchored = true;
  api.kill(w, g, 'env');
  const k = kids(w);
  run(w, 5);
  api.kill(w, other, 'env');
  check('an ORANGE (big, 0.75) dying beside the waiting brood leaves it at rest', k.length === 11 && k.some((c) => Math.hypot(c.x - other.x, c.z - other.z) <= T.death.shockRadius) && k.every((c) => c.state === 'appear' && c.sq === 1 && c.sqV === 0), k.map((c) => c.sqV).join(','));
  run(w, popFrames - 5);
  check('…and it comes out at rest', k.every((c) => c.state === 'active' && c.sq === 1 && c.sqV === 0));
}
{
  // the child valve: none past the live cap × 2 (1.x main.js:10612-10619) — all that holds a late brood
  const { w, g } = world({ x: 0, z: 0, o: { intervalMult: 0.35 } });
  for (let i = 0; i < 5; i++) api.spawn(w, 'yela', -15 + i * 2, 8);
  w.dir.childCap = 20;
  api.kill(w, g, 'env');
  check('a wave-26 PURP would drop 45: with 5 living and a cap of 20, fifteen come out', kids(w).length === 15, `${kids(w).length}`);
  const { w: w2, g: g2 } = world({ x: 0, z: 0 });
  for (let i = 0; i < 8; i++) api.spawn(w2, 'yela', -15 + i * 2, 8);
  w2.dir.childCap = 8;
  api.kill(w2, g2, 'env');
  check('at the cap, none', kids(w2).length === 0);
  const { w: w4, g: g4 } = world({ x: 0, z: 0, o: { intervalMult: 0.35 } });
  w4.dir.childCap = 0;
  api.kill(w4, g4, 'env');
  check('with no cap (an authored level), all 45', kids(w4).length === 45);
}
{
  // the brood against 1.x's own placement (main.js:10593-10603, freeform), fed the same stream
  let same = true;
  for (let seed = 1; seed <= 40 && same; seed++) {
    const iM = [1, 0.89, 0.78][seed % 3];
    const { w, g } = world({ seed, x: (seed % 7) - 3, z: (seed % 5) - 2, o: { intervalMult: iM } });
    const R = makeRng(0); R.state = w.rng.state;
    api.kill(w, g, 'hero');
    const count = 5 + Math.floor((1 / Math.max(iM, 0.1) - 1) / 0.09) * 2, want = [];
    for (let j = 0; j < count; j++) { const a = R.next() * Math.PI * 2, r = 1.2 + R.next() * 1.5; want.push([g.x + Math.cos(a) * r, g.z + Math.sin(a) * r]); }
    const k = kids(w);
    same &&= k.length === count && k.every((c, j) => near(c.x, want[j][0], 1e-12) && near(c.z, want[j][1], 1e-12));
  }
  check('the brood is placed exactly as 1.x\'s code places it, from the same stream (40 corpses)', same);
}

// ── the swarm forces stick only while it rests ────────────────────────
{
  const { w, g } = world({ seed: 4, x: -6, z: 3, hero: [8, -2], anchored: false });
  let restMoved = 0, flopExact = true, x0 = null, origin = true, rests = 0;
  for (let i = 0; i < 600; i++) {
    const was = g.s.flopping, px = g.x, pz = g.z;
    clearBullets(w);
    step(w, IDLE);
    if (!was && !g.s.tumble) { rests++; restMoved = Math.max(restMoved, Math.hypot(g.x - px, g.z - pz)); }
    if (g.s.flopping && !was) x0 = [g.s.x0, g.s.z0];
    else if (g.s.tumble && x0) origin &&= g.s.x0 === x0[0] && g.s.z0 === x0[1];
    if (g.s.tumble && g.s.flopping) {
      const ang = (135 - 90 * Math.min(1, g.s.t / g.s.dur)) * Math.PI / 180, disp = L0 + D0 * Math.cos(ang);
      flopExact &&= near(g.x, g.s.x0 + g.s.dirX * disp, 1e-12) && near(g.z, g.s.z0 + g.s.dirZ * disp, 1e-12);
    }
  }
  check('resting, a DRIFTER is carried by the swarm forces', rests > 50 && restMoved > 0.005, `${restMoved}`);
  check('flopping, its position is written from the flop\'s origin (the forces of a flop step are lost)', flopExact);
  check('…and with nothing pushing it, the origin holds for the whole flop', origin);
}

// ── a crowd nudge and a knock move the tumble's origin (1.x crowd.js:107-116) ──
{
  const pair = () => {
    const mk = () => world({ x: -5, z: -2, hero: [-5 + 12, -2], side: 1 });
    const a = mk(), b = mk();
    for (const r of [a, b]) { r.g.s.rest = 0.001; r.g.s.fireT = HOLD; }
    for (let i = 0; i < 6; i++) { rolled(a.w, 0.5, () => step(a.w, IDLE)); rolled(b.w, 0.5, () => step(b.w, IDLE)); }
    return [a, b];
  };
  const [ref, poked] = pair();
  check('(both mid-flop, in step)', ref.g.s.flopping && poked.g.s.flopping && ref.g.x === poked.g.x && ref.g.s.dirX === 1);
  poked.g.x += 0.1; poked.g.z -= 0.05; poked.g.nudgedX = 0.1; poked.g.nudgedZ = -0.05;
  let same = true;
  for (let i = 0; i < 40 && (ref.g.s.flopping || poked.g.s.flopping); i++) {
    step(ref.w, IDLE); step(poked.w, IDLE);
    same &&= near(poked.g.x - ref.g.x, 0.1, 1e-12) && near(poked.g.z - ref.g.z, -0.05, 1e-12);
  }
  check('a crowd nudge mid-flop carries the rest of the tumble with it, and the landing', same && !poked.g.s.flopping);
  const [r2, k2] = pair();
  k2.g.kz = 4;
  let carried = true, sum = 0;
  for (let i = 0; i < 40 && (r2.g.s.flopping || k2.g.s.flopping); i++) {
    step(r2.w, IDLE); step(k2.w, IDLE);
    sum += k2.g.nudgedZ;
    carried &&= near(k2.g.z - r2.g.z, sum, 1e-12) && near(k2.g.x, r2.g.x, 1e-12);
  }
  check('a knock mid-flop is never thrown away: the tumble carries every step of it', carried && sum > 0.1 && !k2.g.s.flopping, `${sum.toFixed(3)}`);
}

// ── the test dashes: PUSH shoves it, CUT hurts it (TUNING.hero.push / .cut) ──
{
  const { w, g } = world({ x: 2.5, z: 0, hero: [0, 0], dashMode: 'push', anchored: false });
  w.hero.mercy = 0; g.s.rest = 0.05; g.s.fireT = HOLD;
  step(w, { ...IDLE, mx: 1, dash: true });
  let shoved = w.events.some((e) => e.type === 'shove' && e.id === g.id);
  for (let i = 0; i < 12 && !shoved; i++) { step(w, IDLE); shoved = w.events.some((e) => e.type === 'shove' && e.id === g.id); }
  const kx = g.kx;
  run(w, 50);
  check('a PUSH dash shoves it away from you (a knock along +x)', shoved && kx > 5 && g.x > 6, `kx ${kx.toFixed(2)}, x ${g.x.toFixed(2)}`);
  check('…and it is not hurt by it at dash level 0', g.alive && g.hp === 3);
  const c = world({ x: 2, z: 0, hero: [0, 0], dashMode: 'cut' });
  c.g.s.rest = HOLD; c.g.s.fireT = HOLD;
  step(c.w, { ...IDLE, mx: 1, dash: true }); run(c.w, 12);
  check('a CUT dash passes through it and takes 2 of its 3 hp (TUNING.hero.cut.hits)', c.g.alive && c.g.hp === S.hp - T.hero.cut.hits && c.w.hero.x > c.g.x + 1, `${c.g.hp}`);
  c.w.hero.x = 0; c.w.hero.z = 0;
  run(c.w, 60);
  let kill = null;
  for (let i = 0; i < 4; i++) { step(c.w, { ...IDLE, mx: 1, dash: i === 0 }); kill ||= c.w.events.find((e) => e.type === 'kill' && e.id === c.g.id); }
  check('…the second kills it, by the dash, and a dash kill still broods (5 minis, waiting out the pop)',
    !c.g.alive && kill?.src === 'dash' && kids(c.w).length === 5 && kids(c.w).every((k) => k.state === 'appear'), `${kill?.src} ${kids(c.w).length}`);
}

// ── SWIFT and a SIREN's surge speed its flop (api.speed) ──────────────
{
  for (const [o, mult, name] of [[{ affix: 'swift' }, T.variants.swiftSpeed, 'SWIFT (×1.35)'], [{}, 1.6, 'a surge (×1.6)']]) {
    const { w, g } = world({ x: -10, hero: [2, 0], side: 1, o });
    if (!o.affix) { g.surgeT = 1e9; g.surgeMult = 1.6; }
    g.s.rest = 0.001; g.s.fireT = HOLD;
    until(w, () => g.s.flopping);
    until(w, () => !g.s.flopping);
    check(`${name} shortens its cycle: the rest after a flop is its own`, near(g.s.rest, cycleOf(S.speed * mult).rest, 1e-12), `${g.s.rest}`);
  }
}

// ── against 1.x's own code, transcribed literally and fed the same stream ──
// The constructor (enemy.js:678, 702-706, 1209-1214), _flopMove (1494-1566,
// exact = false) and the update branch (2297-2331) with its spiral, with
// 1.x's literals rather than this port's tuning, run beside the sim. Every
// bullet it fires is compared too.
{
  const C4 = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
  const oneX = (R, x, z) => {
    const e = { x, z };
    e.orbitSign = R() < 0.5 ? 1 : -1;
    e.purpFireT = 0.5;
    e.spiralAngle = 0;
    e.purpSpin = (0.42 + R() * 0.34) * (R() < 0.5 ? 1 : -1);
    e.flopActive = false; e.flopRest = R() * 0.25; e.flopDir = C4[Math.floor(R() * 4)];
    return e;
  };
  const updateX = (e, R, Pl, ex, ez, spd, im, rm, halfX, halfZ, shots) => {
    e.x = ex; e.z = ez;
    const ddx = Pl.x - ex, ddz = Pl.z - ez, dist = Math.hypot(ddx, ddz) || 0.001;
    const ux = ddx / dist, uz = ddz / dist;
    const radial = (dist - 5) * 0.18;
    const wantX = -uz * e.orbitSign + ux * radial;
    const wantZ = ux * e.orbitSign + uz * radial;
    e.purpFireT -= dt;
    if (e.purpFireT <= 0) {
      e.purpFireT = 1.0 * im;
      shots.push([ex, ez, Math.cos(e.spiralAngle), Math.sin(e.spiralAngle)]);
      shots.push([ex, ez, Math.cos(e.spiralAngle + Math.PI), Math.sin(e.spiralAngle + Math.PI)]);
      e.spiralAngle += e.purpSpin;
    }
    const radius = 0.75, L = radius * 0.9 * rm, D = L * Math.SQRT2, stride = 2 * L, cycle = stride / Math.max(spd, 0.01);
    if (!e.flopActive) {
      e.flopRest -= dt; if (e.flopRest > 0) return;
      let dir;
      if (wantX !== 0 || wantZ !== 0) {
        const toward = Math.abs(wantX) > Math.abs(wantZ) ? { x: Math.sign(wantX), z: 0 } : { x: 0, z: Math.sign(wantZ) };
        const r = R();
        dir = r < 0.70 ? toward : (r < 0.90 ? e.flopDir : C4[Math.floor(R() * 4)]);
      } else dir = (R() < 0.7) ? e.flopDir : C4[Math.floor(R() * 4)];
      const bx = halfX - radius, bz = halfZ - radius;
      if (Math.abs(e.x + dir.x * stride) > bx) dir = { x: -(Math.sign(e.x) || 1), z: 0 };
      else if (Math.abs(e.z + dir.z * stride) > bz) dir = { x: 0, z: -(Math.sign(e.z) || 1) };
      e.flopDir = dir; e.x0 = e.x; e.z0 = e.z; e.flopT = 0; e.flopDur = Math.min(0.30, cycle * 0.65); e.flopActive = true;
    }
    e.flopT += dt;
    const p = Math.min(1, e.flopT / e.flopDur), a = (135 + (45 - 135) * p) * Math.PI / 180, disp = L + D * Math.cos(a);
    e.x = e.x0 + e.flopDir.x * disp; e.z = e.z0 + e.flopDir.z * disp;
    if (p >= 1) { e.x = e.x0 + e.flopDir.x * stride; e.z = e.z0 + e.flopDir.z * stride; e.flopActive = false; e.flopRest = Math.max(0.02, cycle - e.flopDur); }
  };
  const sameShots = (w, shots) => {
    const b = gelShots(w);
    return b.length === shots.length && b.every((x, j) => near(x.px, shots[j][0], 1e-9) && near(x.pz, shots[j][1], 1e-9)
      && near(x.vx, shots[j][2] * 7, 1e-9) && near(x.vz, shots[j][3] * 7, 1e-9));
  };
  // one body, anchored: its own step is all that moves it
  let solo = true, flops = 0, pulses = 0;
  const sides = new Set();
  for (const seed of [1, 3, 5, 7, 9, 12]) {
    if (!solo) break;
    for (const [sm, rm, im, variant] of [[1, 1, 1, 'normal'], [1.35 * 1.2, 1.2, 0.505, 'elite']]) {
      const w = createWorld({ seed }); w.director = { step() {} }; w.hero.lives = 1e9; w.hero.mercy = 1e9;
      const R = makeRng(0); R.state = w.rng.state;
      const x = (seed % 7) * 3 - 9, z = (seed % 3) * 3 - 3;
      const g = api.spawn(w, 'purp', x, z, { speedMult: sm, intervalMult: im, variant }); g.anchored = true;
      const e = oneX(R.next, x, z);
      sides.add(e.orbitSign);
      for (let i = 0; i < 900 && solo; i++) {
        const t = i * dt, ex = e.x, ez = e.z, was = e.flopActive, shots = [];
        clearBullets(w);
        step(w, { ...IDLE, mx: Math.cos(t * 0.7 + seed), mz: Math.sin(t * 1.1) * 0.8 });
        updateX(e, R.next, { x: w.hero.x, z: w.hero.z }, ex, ez, 1.6 * sm, im, rm, w.hx, w.hz, shots);
        if (!was && e.flopActive) flops++;
        pulses += shots.length / 2;
        solo &&= near(g.x, e.x, 1e-9) && near(g.z, e.z, 1e-9) && g.s.flopping === e.flopActive && g.s.orbitSign === e.orbitSign
          && g.s.spin === e.purpSpin && sameShots(w, shots);
      }
    }
  }
  check(`alone, it moves and fires exactly as 1.x's code does (12 runs of 15 s, elites too: ${flops} flops, ${pulses} pulses, both sides)`, solo && flops > 150 && pulses > 250 && sides.size === 2);
  // five free bodies: the swarm forces, the crowd and its clamp at the walls
  const entry = new Map(), exit = new Map(), orig = behaviour.step;
  behaviour.step = function (w, g, d, a) { entry.set(g.id, { x: g.x, z: g.z }); orig.call(this, w, g, d, a); exit.set(g.id, { x: g.x, z: g.z }); };
  let crowd = true, clamped = 0, nudged = 0;
  try {
    for (let seed = 1; seed <= 4 && crowd; seed++) {
      const w = createWorld({ seed }); w.director = { step() {} }; w.hero.lives = 1e9; w.hero.mercy = 1e9;
      const R = makeRng(0); R.state = w.rng.state;
      const pairs = [];
      for (let k = 0; k < 5; k++) {
        const x = -14 + k * 1.6 + seed, z = -6 + (k % 2) * 1.4 + seed;
        pairs.push({ g: api.spawn(w, 'purp', x, z), e: oneX(R.next, x, z) });
      }
      for (let i = 0; i < 1200 && crowd; i++) {
        const t = i * dt;
        clearBullets(w);
        step(w, { ...IDLE, mx: Math.cos(t * 0.25 + seed), mz: Math.sin(t * 0.4) });   // you sweep the arena wall to wall
        const all = [];
        for (const { g, e } of pairs) {
          const en = entry.get(g.id), out = exit.get(g.id);
          updateX(e, R.next, { x: w.hero.x, z: w.hero.z }, en.x, en.z, 1.6, 1, 1, w.hx, w.hz, all);
          crowd &&= near(out.x, e.x, 1e-9) && near(out.z, e.z, 1e-9) && g.s.flopping === e.flopActive;
          if (Math.abs(g.x) >= w.hx - g.r - 1e-12 || Math.abs(g.z) >= w.hz - g.r - 1e-12) clamped++;
          if (e.flopActive) { e.x0 += g.nudgedX; e.z0 += g.nudgedZ; if (g.nudgedX || g.nudgedZ) nudged++; }    // 1.x's crowd, after the update
        }
        crowd &&= sameShots(w, all);
      }
    }
  } finally { behaviour.step = orig; }
  check(`in a crowd, by the walls, it tumbles and fires exactly as 1.x's code does (${nudged} nudged tumbles, ${clamped} steps at a wall)`, crowd && nudged > 20 && clamped > 20, `${nudged} ${clamped}`);
}

// ── determinism ─────────────────────────────────────────────────────
{
  const trail = (seed) => {
    const { w, g } = world({ seed, x: -9, z: 5, hero: [6, -3], anchored: false });
    const out = [];
    for (let i = 0; i < 900; i++) {
      step(w, IDLE);
      out.push(`${g.x.toFixed(9)},${g.z.toFixed(9)},${g.s.dirX},${g.s.dirZ},${gelShots(w).map((b) => b.vx.toFixed(9)).join('/')}`);
    }
    api.kill(w, g, 'hero');
    out.push(kids(w).map((c) => `${c.x.toFixed(9)},${c.z.toFixed(9)}`).join('|'));
    return out.join(';');
  };
  check('a run replays from its seed, spiral and brood and all', trail(11) === trail(11));
  check('another seed tumbles and spins another way', trail(11) !== trail(12));
}

// ── the look: REDD's rounded cube, in violet ─────────────────────────
{
  const TSL = THREE.TSL, scene = new THREE.Scene(), GEL_TIME = TSL.uniform(0);
  const made = [];
  const gelMaterial = (hex, fam, r) => {
    const m = new THREE.MeshPhysicalNodeMaterial();
    m.gel = { hit: TSL.uniform(0), hitDir: TSL.uniform(new THREE.Vector2()), tear: TSL.uniform(0), wobble: TSL.uniform(0.35) };
    made.push({ hex, fam, r, m });
    return m;
  };
  const view = (L, SS, kind) => {
    const v = { kind, S: SS, L, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, hit: 0, dyingT: 0 };
    Object.assign(v, L.build({ THREE, TSL, gelMaterial, GEL_TIME, geo: {}, T, scene, S: SS, kind }));
    v.squash.add(v.body); v.root.add(v.squash); L.reset(v);
    return v;
  };
  const v = view(look, S, 'purp');
  const geo = v.body.geometry, bb = geo.boundingBox;
  check('build: its own body, own: true, one gel material in violet 0xcc44ff, the cube family, unit radius (1.x makeSatinMat(color, \'cube\', …))',
    v.own === true && made.length === 1 && made[0].hex === 0xcc44ff && made[0].fam === 'cube' && made[0].r === 1 && v.mat === made[0].m);
  check('the body is 1.x\'s RoundedBox: 1.8 radii a side (1.35 at 0.75), centred', near(bb.min.x, -0.9, 1e-6) && near(bb.max.y, 0.9, 1e-6) && near(bb.min.z, -0.9, 1e-6));
  const c = S.look.corner / S.radius, inner = 0.9 - c, pos = geo.attributes.position;
  let onSurface = true;
  for (let i = 0; i < pos.count; i++) {
    const qx = Math.max(Math.abs(pos.getX(i)) - inner, 0), qy = Math.max(Math.abs(pos.getY(i)) - inner, 0), qz = Math.max(Math.abs(pos.getZ(i)) - inner, 0);
    onSurface &&= near(Math.hypot(qx, qy, qz), c, 1e-6);
  }
  check('every vertex sits the corner radius (0.18 at r 0.75) off the inner box: rounded', onSurface && pos.count > 2000);
  check('every PURP view shares one geometry, its own (not REDD\'s)', view(look, S, 'purp').body.geometry === geo && view(reddLook, T.species.redd, 'redd').body.geometry !== geo);
  v.mat.gel.hit.value = 1; v.mat.gel.tear.value = 1;
  check('the core\'s ripple and tear land on stand-ins: the cube\'s own stay at rest (1.x writes them for blobs only)', v.gel.hit.value === 0 && v.gel.tear.value === 0);
  const Wd = { time: 0 };
  const g = { r: 0.75, sq: 1, tell: 0, flash: 0, affix: null, s: { tumble: false } };
  look.update(v, g, Wd, 0, 1);
  v.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(v.body, true);
  check('at rest: r × the box, upright, its centre at L = 0.675 and its bottom on the floor',
    near(v.body.scale.x, 0.75) && near(v.body.position.y, L0, 1e-12) && v.body.quaternion.equals(new THREE.Quaternion()) && near(box.min.y, 0, 1e-6));
  g.sq = 0.7; v.phase = 0.4;
  const t = 1.9, br = 0.10 * Math.sin(t * 2.4 + 0.4), sx = 1 / Math.sqrt(0.7);
  look.update(v, g, Wd, t, 1);
  check('squashed and breathing: (sx·(1 − b/2), sq·(1 + b), sx·(1 − b/2)) × r (1.x enemy.js:2770-2777)',
    near(v.body.scale.x, 0.75 * sx * (1 - br / 2), 1e-12) && near(v.body.scale.y, 0.75 * 0.7 * (1 + br), 1e-12));
  g.sq = 1; v.phase = 0;
  let planted = true;
  for (const [dx, dz] of [[1, 0], [0, -1]]) {
    Object.assign(g.s, { tumble: true, x0: 1, z0: 2, dirX: dx, dirZ: dz });
    for (const along of [0, 0.3, 0.675, 1.0, 1.35]) {
      v.root.position.set(1 + dx * along, 0, 2 + dz * along);
      look.update(v, g, Wd, 0, 1);
      v.root.updateMatrixWorld(true);
      const edge = new THREE.Vector3(dx * 0.9, -0.9, dz * 0.9).applyMatrix4(v.body.matrixWorld);
      planted &&= near(edge.y, 0, 1e-9) && near(edge.x, 1 + dx * L0, 1e-9) && near(edge.z, 2 + dz * L0, 1e-9);
    }
  }
  check('mid-flop it pivots on its planted leading bottom edge, as every cube does', planted);
  Object.assign(g.s, { tumble: false });
  v.mat.emissive.setHex(0x123456); look.update(v, { ...g, tell: 1 }, Wd, 0.3, 1);
  check('no tell of its own (1.x gives PURP no emissive): the core\'s glow is left as the core set it', v.mat.emissive.getHex() === 0x123456);
}

if (failed) { console.log(`✗ purp: ${failed} of ${failed + passed} checks failed`); process.exit(1); }
console.log(`✔ purp: ${passed} checks`);
