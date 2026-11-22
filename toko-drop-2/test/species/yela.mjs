#!/usr/bin/env node
// yela.mjs — YELA CUBE's own checks, in bare node: 1.x's numbers
// (enemy.js:583, 738, 1209-1216, 1486-1566, 2296-2336, 2739-2740, 2770-2777,
// 3015; tuning.js:56-62, 621; crowd.js:107-116; main.js:1547-1578,
// 2410-2420, 2443-2489, 10466-10471, 10886-10906), asserted against the sim
// stepping on its fixed 1/60 s, and its look against a real three. Since v67
// it also tumbles on the diagonals (owner: the YELA sketch's "diagonal
// movement"), which 1.x's never did: those checks say so where they are.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=161';
import { TUNING as T } from '../../js/tuning.js?v=161';
import behaviour from '../../js/sim/species/yela.js?v=161';
import look, { lay } from '../../js/render/looks/yela.js?v=161';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

const S = T.species.yela, F = S.flop, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const [K, C] = T.gel.sq.cube;
const L0 = F.halfExtent * S.radius, D0 = L0 * Math.SQRT2;

// a world with nothing in it but one YELA, the hero where asked; anchored
// (no swarm forces, no crowd) unless asked, so what moves it is its own step
function world({ seed = 1, mode = 'arcade', x = 0, z = 0, hero = [12, 0], o = {}, anchored = true } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  const h = w.hero; h.x = h.px = hero[0]; h.z = h.pz = hero[1];
  const g = api.spawn(w, 'yela', x, z, o);
  g.anchored = anchored;
  return { w, g };
}
// 1.x's own frame arithmetic
const stepsDown = (from) => { let t = from, n = 0; while (!(t <= 0)) { t -= dt; n++; } return n; };   // a countdown
const stepsUp = (dur) => { let t = 0, n = 0; while (!(Math.min(1, t / dur) >= 1)) { t += dt; n++; } return n; }; // a flop
const sprung = (sq, sqV, kick) => (sqV - (sq - 1) * K) * C + kick;
const cycleOf = (spd, rm = 1, diag = false) => {
  const L = F.halfExtent * S.radius * rm, run = 2 * L * (diag ? Math.SQRT2 : 1), c = run / Math.max(spd, F.minSpeed);
  const f = Math.min(F.timeMax * (diag ? F.diagTime : 1), c * F.shareOfCycle);
  return { L, stride: 2 * L, run, cycle: c, flop: f, rest: Math.max(F.restMin, c - f) };
};
const isDiag = (g) => g.s.dirX !== 0 && g.s.dirZ !== 0;
// step until the flop state changes; returns the steps taken
const until = (w, g, pred, max = 600) => { for (let i = 1; i <= max; i++) { step(w, IDLE); if (pred()) return i; } return -1; };

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.7, hp 2, speed 2.2, yellow 0xffdd00 (1.x enemy.js:583)', S.radius === 0.7 && S.hp === 2 && S.speed === 2.2 && S.color === 0xffdd00);
  check('CFG: no gun', S.bulletColor === null && S.fireInterval === null);
  check('a rounded cube, DRIFTER, hurts to touch in classic (MELEE_TYPES), not a biter',
    S.family === 'cube' && S.role === 'DRIFTER' && S.contact === true && S.revenge === null);
  check('the flop: arc 135° → 45°, −0.32 landing, ≤ 0.30 s and 0.65 of the cycle (1.x tuning.js:58-60)',
    F.arcStartDeg === 135 && F.arcEndDeg === 45 && F.landSquish === -0.32 && F.timeMax === 0.30 && F.shareOfCycle === 0.65);
  check('half-extent 0.9 r (a 1.8 r box), rests ≥ 0.02 s, speed floor 0.01 (1.x enemy.js:738, 1497, 1501, 1564)',
    F.halfExtent === 0.9 && F.restMin === 0.02 && F.minSpeed === 0.01);
  check('the first rest is U·0.25 s; the heading roll 0.70 / 0.90 / any; 0.7 with no heading (1.x enemy.js:1213, 1519, 1521)',
    F.firstRest[0] === 0 && F.firstRest[1] === 0.25 && F.toward === 0.70 && F.keep === 0.90 && F.idleKeep === 0.7);
  check('slime every 0.3 s, r 0.5 (1.x tuning.js:621, main.js:10470)', S.slime.interval === 0.3 && S.slime.radius === 0.5);
  const lk = S.look;
  check('the look: RoundedBox corner 0.18, 4 segments (1.x enemy.js:738); breath 0.10 at 2.4 rad/s, half across (tuning.js:61, enemy.js:2773-2775)',
    lk.corner === 0.18 && lk.segments === 4 && lk.breatheAmp === 0.10 && lk.breatheRate === 2.4 && lk.breatheXZ === 0.5);
  check('the slime: 0xddee00, ×0.85–1.15, y 0.013, 0.45 fading over 2 s (1.x main.js:1549-1556)',
    lk.slimeColor === 0xddee00 && lk.slimeJitter[0] === 0.85 && lk.slimeJitter[1] === 1.15 && lk.slimeY === 0.013 && lk.slimeOpacity === 0.45 && lk.slimeLife === 2);
  check('the fizz: 1.5 a second while > 0.5 s remain, ±0.3, 0xccee66 (1.x main.js:1576-1577)',
    lk.fizzRate === 1.5 && lk.fizzUntil === 0.5 && lk.fizzSpread === 0.6 && lk.fizzColor === 0xccee66);
  check('a bubble: from 0.08 up at 0.9, 0.9–1.4 s, 0.07–0.15, wiggle 9 / 0.15, pop 3, opacity 0.5 (1.x main.js:2446-2484)',
    lk.bubbleY === 0.08 && lk.bubbleRise === 0.9 && lk.bubbleLife[0] === 0.9 && near(lk.bubbleLife[1], 1.4) && lk.bubbleSize[0] === 0.07 && near(lk.bubbleSize[1], 0.15)
    && lk.bubbleWiggle[0] === 9 && lk.bubbleWiggle[1] === 0.15 && lk.bubblePop === 3 && lk.bubbleOpacity === 0.5);
  const src = readFileSync(new URL('../../js/sim/species/yela.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('it has no special hits and no death of its own', !behaviour.onHit && !behaviour.onKill && !behaviour.hitTest && !behaviour.touches);
}

// ── its starting state (1.x enemy.js:1209-1216) ──────────────────────
{
  const rests = [], dirs = new Set();
  let fresh = true;
  for (let seed = 1; seed <= 300; seed++) {
    const { g } = world({ seed });
    rests.push(g.s.rest); dirs.add(`${g.s.dirX},${g.s.dirZ}`);
    fresh &&= g.s.flopping === false && g.s.slimeT === S.slime.interval && g.s.slime.length === 0 && Math.abs(g.s.dirX) <= 1 && Math.abs(g.s.dirZ) <= 1 && (g.s.dirX !== 0 || g.s.dirZ !== 0);
  }
  check('it starts at rest, its slime timer at 0.3, a heading of the eight', fresh);
  check('the first rest is in [0, 0.25) and spread over it', rests.every((t) => t >= 0 && t < 0.25) && Math.min(...rests) < 0.01 && Math.max(...rests) > 0.24);
  check('its first heading is any of the eight (v67; 1.x drew one of the four)', dirs.size === 8, [...dirs].join(' '));
}

// ── one flop: a rigid tip over the planted edge (1.x enemy.js:1542-1565) ──
{
  const { w, g } = world({ x: -4, z: 1, hero: [12, 1] });
  g.s.rest = 0.001;
  const spd = S.speed, { L, stride, flop } = cycleOf(spd);
  const log = [];
  let x0 = null, kinematic = true, lifted = 0;
  for (let i = 0; i < 60; i++) {
    const pre = { sq: g.sq, sqV: g.sqV };
    step(w, IDLE);
    if (x0 == null && g.s.flopping) x0 = { x: g.s.x0, z: g.s.z0, dx: g.s.dirX, dz: g.s.dirZ };
    if (!g.s.tumble) { if (x0) break; continue; }
    const p = Math.min(1, g.s.t / g.s.dur), ang = (135 - 90 * p) * Math.PI / 180;
    const disp = p >= 1 ? stride : L + D0 * Math.cos(ang);
    kinematic &&= near(g.x, x0.x + x0.dx * disp, 1e-12) && near(g.z, x0.z + x0.dz * disp, 1e-12) && near(g.s.lift, p >= 1 ? L : D0 * Math.sin(ang), 1e-12);
    lifted = Math.max(lifted, g.s.lift);
    log.push({ p, x: g.x, landed: !g.s.flopping, sqV: g.sqV, pre });
  }
  check('it flops toward you along x (the larger axis), from where it stood', x0 && x0.dx === 1 && x0.dz === 0 && x0.x === -4 && x0.z === 1, JSON.stringify(x0));
  check('the flop lasts min(0.30, 0.65·cycle) = 0.30 s at speed 2.2, on 1.x\'s frame arithmetic', log.length === stepsUp(flop) && near(g.s.dur, flop), `${log.length} steps`);
  check('each step the centre sits L + D·cos(ang) along the heading and D·sin(ang) up, ang 135° → 45° linear in time', kinematic);
  check('it lifts to D = L√2 = 0.891 at the top of the arc', near(lifted, D0, 2e-3) && lifted <= D0 + 1e-12, `${lifted}`);
  check('a flop advances exactly one face, 2L = 1.26', near(g.x - x0.x, 1.26, 1e-12) && g.z === 1, `${g.x - x0.x}`);
  const land = log[log.length - 1];
  check('the landing kicks the squash spring flat: −0.32 (1.x enemy.js:1561)', land.landed && near(land.sqV, sprung(land.pre.sq, land.pre.sqV, F.landSquish), 1e-12));
  check('and it rests for the rest of the cycle, max(0.02, cycle − flop) (one step of it gone)', near(g.s.rest, cycleOf(spd).rest - dt, 1e-12), `${g.s.rest}`);
}

// ── a diagonal flop (v67): a half roll over its corner ────────────────
{
  const { w, g } = world({ x: -4, z: -4, hero: [8, 8] });
  g.s.rest = 0.001; g.s.dirX = 1; g.s.dirZ = 1;
  const c = cycleOf(S.speed, 1, true), H = (p) => L0 * (Math.abs(Math.cos(Math.PI * p)) + Math.SQRT2 * Math.abs(Math.sin(Math.PI * p)));
  let x0 = null, kinematic = true, lifted = 0, steps = 0;
  for (let i = 0; i < 80; i++) {
    step(w, IDLE);
    if (x0 == null && g.s.flopping) x0 = { x: g.s.x0, z: g.s.z0, dx: g.s.dirX, dz: g.s.dirZ };
    if (!g.s.tumble) { if (x0) break; continue; }
    steps++;
    const p = Math.min(1, g.s.t / g.s.dur), along = c.stride * p;
    kinematic &&= near(g.x, x0.x + x0.dx * along, 1e-12) && near(g.z, x0.z + x0.dz * along, 1e-12) && near(g.s.lift, H(p), 1e-12);
    lifted = Math.max(lifted, g.s.lift);
  }
  check('you on its diagonal: it flops along the diagonal (v67)', x0 && x0.dx === 1 && x0.dz === 1 && x0.x === -4 && x0.z === -4, JSON.stringify(x0));
  check('the diagonal flop lasts min(2 × 0.30, 0.65·cycle), its cycle the longer run 2L√2 / spd', steps === stepsUp(c.flop) && near(g.s.dur, c.flop), `${steps} steps, ${g.s.dur}`);
  check('…along each axis linear in time, its lowest corner on the floor, L·(|cos φ| + √2·|sin φ|)', kinematic);
  check('…over its corner at L√3 = 1.091', near(lifted, L0 * Math.sqrt(3), 4e-3) && lifted <= L0 * Math.sqrt(3) + 1e-12, `${lifted}`);
  check('…and lands a face on along each axis, (2L, 2L)', near(g.x - x0.x, 1.26, 1e-12) && near(g.z - x0.z, 1.26, 1e-12), `${g.x - x0.x} ${g.z - x0.z}`);
  check('…resting the rest of its longer cycle', near(g.s.rest, c.rest - dt, 1e-12), `${g.s.rest}`);
}

// ── the cadence: cycle = run / spd, so the average ground speed is spd ──
for (const [mult, flopWant, restWant, name] of [[1.04, 0.300, 0.251, 'wave 1'], [1.244, 0.299, 0.161, 'wave 3'], [1.55, 0.240, 0.129, 'wave 6'], [1.91, 0.195, 0.105, 'wave 10']]) {
  const { w, g } = world({ x: -14, z: 0, hero: [17, 0], o: { speedMult: mult } });
  w.hero.mercy = 1e9;
  const c = cycleOf(S.speed * mult), cd = cycleOf(S.speed * mult, 1, true), of = (d) => (d ? cd : c);
  check(`${name} (×${mult}): flop ${flopWant} s, rest ${restWant} s (spec §4.1)`, near(c.flop, flopWant, 6e-4) && near(c.rest, restWant, 6e-4), `${c.flop} ${c.rest}`);
  // its heading is now and then a diagonal (the 10% drawn from the eight, v67): a longer cycle, the same pace
  const lands = [], kinds = [];
  let durs = true, rests = true;
  for (let i = 1; i <= 600; i++) {
    const was = g.s.flopping;
    step(w, IDLE);
    if (g.s.flopping && !was && g.s.t === dt) durs &&= near(g.s.dur, of(isDiag(g)).flop, 1e-12);
    if (was && !g.s.flopping) { lands.push(i); kinds.push(isDiag(g)); rests &&= near(g.s.rest, of(isDiag(g)).rest, 1e-12); }
  }
  const gaps = lands.slice(1).map((v, k) => v - lands[k]);
  const wants = kinds.slice(1).map((d, k) => stepsDown(of(kinds[k]).rest) + stepsUp(of(d).flop) - 1);
  const want = stepsDown(c.rest) + stepsUp(c.flop) - 1;
  check(`${name}: every cycle is one rest and one flop on 1.x\'s frame arithmetic (${want} steps a cardinal)`, durs && rests && gaps.length > 5 && gaps.every((k, i) => k === wants[i]), gaps.join(' '));
  const pace = kinds.slice(1).reduce((a, d) => a + of(d).run, 0) / (gaps.reduce((a, b) => a + b, 0) * dt);
  check(`${name}: its ground speed is spd = ${(S.speed * mult).toFixed(3)} u/s, to the step`, Math.abs(pace / (S.speed * mult) - 1) < want ** -1 + 1e-9, `${pace}`);
}

// ── SWIFT and a SIREN's surge speed it up the same way (api.speed) ──
{
  for (const [o, mult, name] of [[{ affix: 'swift' }, T.variants.swiftSpeed, 'SWIFT (×1.35)'], [{}, 1.6, 'a surge (×1.6)']]) {
    const { w, g } = world({ x: -10, o });
    if (!o.affix) { g.surgeT = 1e9; g.surgeMult = 1.6; }
    g.s.rest = 0.001;
    until(w, g, () => g.s.flopping);
    check(`${name} shortens the flop to its own cycle`, near(g.s.dur, cycleOf(S.speed * mult).flop, 1e-12), `${g.s.dur}`);
  }
}

// ── an elite is a bigger cube: a longer stride, the same pace ─────────
{
  const { w, g } = world({ x: -10, o: { variant: 'elite' } });
  check('an elite: radius 0.84, hp 4 (1.x ×1.2, ×2)', near(g.r, 0.84) && g.hp === 4);
  g.s.rest = 0.001;
  until(w, g, () => g.s.flopping);
  const x0 = g.s.x0;
  until(w, g, () => !g.s.flopping);
  check('…and it flops 2·0.9·0.84 = 1.512 a face (1.x L = 0.9·r·rm)', near(g.x - x0, 1.512, 1e-12), `${g.x - x0}`);
  check('…at the same average speed: its cycle is 1.512 / 2.2', near(g.s.rest, cycleOf(S.speed, 1.2).rest, 1e-12) && near(cycleOf(S.speed, 1.2).cycle, 1.512 / 2.2, 1e-12));
  const { g: e2 } = world({ o: { variant: 'elitelite' } });
  check('an elitelite: 3 hp (⌈2 × 1.5⌉), no bigger', e2.hp === 3 && e2.r === S.radius);
}

// ── the heading roll (1.x enemy.js:1514-1519) ────────────────────────
function rollFrom({ hero, at = [0, 0], prev = [-1, 0], n = 4000, seed = 5, o = {} }) {
  const { w, g } = world({ seed, x: at[0], z: at[1], hero, o });
  w.hero.mercy = 1e9;                                       // it may be touching you: keep the run going
  const tally = {};
  for (let i = 0; i < n; i++) {
    g.x = g.px = at[0]; g.z = g.pz = at[1];
    Object.assign(g.s, { flopping: false, rest: 0, dirX: prev[0], dirZ: prev[1], lastX: at[0], lastZ: at[1] });
    step(w, IDLE);
    const k = `${g.s.dirX},${g.s.dirZ}`;
    tally[k] = (tally[k] || 0) + 1 / n;
  }
  return tally;
}
{
  const t = rollFrom({ hero: [12, 2] });
  check('70% toward you + its share of the 10% random = 0.7125 (+x: the nearest of the eight)', near(t['1,0'] ?? 0, 0.7125, 0.025), JSON.stringify(t));
  check('20% its last heading + its share of the random = 0.2125', near(t['-1,0'] ?? 0, 0.2125, 0.025));
  check('1.25% each for the other six, the diagonals among them (v67)', ['0,1', '0,-1', '1,1', '-1,1', '1,-1', '-1,-1'].every((k) => near(t[k] ?? 0, 0.0125, 0.008)) && Object.keys(t).length === 8);
  const tz = rollFrom({ hero: [3, -5], prev: [1, 0], n: 1500 });
  check('toward you is the nearest of the eight: 59° off +x it takes the diagonal (+x, −z)', (tz['1,-1'] ?? 0) > 0.68, JSON.stringify(tz));
  const tzz = rollFrom({ hero: [1, -6], prev: [1, 0], n: 1500 });
  check('…and 81° off it, straight −z', (tzz['0,-1'] ?? 0) > 0.68, JSON.stringify(tzz));
  const tie = rollFrom({ hero: [4, 4], prev: [1, 0], n: 1500 });
  check('a dead diagonal goes on the diagonal (1.x went along z)', (tie['1,1'] ?? 0) > 0.68, JSON.stringify(tie));
  // on top of you: no heading, so its line 70% (+ its share of the 30%) or any of the eight
  const top = rollFrom({ hero: [0, 0], prev: [0, 1], n: 3000 });
  check('on top of you it keeps its line 70% (+ its share of the 30%: 0.7375)', near(top['0,1'] ?? 0, 0.7375, 0.03), JSON.stringify(top));
}

// ── the walls turn it back (1.x enemy.js:1527-1531) ──────────────────
{
  const w0 = createWorld({}), r = S.radius;
  const ax = w0.hx - r - 0.5;
  const tx = rollFrom({ hero: [w0.hx - 0.3, 0], at: [ax, 0], prev: [1, 0], n: 1500 });
  check('at the right wall it never flops into it', !tx['1,0'] && !tx['1,1'] && !tx['1,-1'], JSON.stringify(tx));
  check('…the 92.5% that would have (or drew straight across) are turned back along x', near(tx['-1,0'] ?? 0, 0.925, 0.025));
  check('…a diagonal into it turns back on x alone, as a ball off a cushion (v67)', near(tx['-1,1'] ?? 0, 0.025, 0.012) && near(tx['-1,-1'] ?? 0, 0.025, 0.012), JSON.stringify(tx));
  const az = w0.hz - r - 0.5;
  const tz = rollFrom({ hero: [0, w0.hz - 0.3], at: [0, az], prev: [0, 1], n: 1500 });
  check('at the bottom wall it never flops into it, and turns back along z', !tz['0,1'] && !tz['1,1'] && !tz['-1,1'] && near(tz['0,-1'] ?? 0, 0.925, 0.025), JSON.stringify(tz));
  // a diagonal into the corner turns back on both axes
  const tc = rollFrom({ hero: [w0.hx - 0.3, w0.hz - 0.3], at: [ax, az], prev: [1, 1], n: 1500 });
  check('…and one into the corner on both (v67)', !tc['1,1'] && (tc['-1,-1'] ?? 0) > 0.85, JSON.stringify(tc));
  const tl = rollFrom({ hero: [-w0.hx + 0.3, 0], at: [-ax, 0], prev: [-1, 0], n: 600 });
  check('the left wall too', !tl['-1,0'] && (tl['1,0'] ?? 0) > 0.9, JSON.stringify(tl));
  // 1.x measures the wall from the CFG radius, not an elite's grown one (enemy.js:1495
  // `radius = CFG[type].radius`, 1527 `bx = halfX - radius`): an elite (r 0.84, a 1.512
  // stride) whose landing would fall between hx − 0.84 and hx − 0.7 still takes it
  const eAt = w0.hx - 0.75 - 1.512;
  const te = rollFrom({ hero: [w0.hx - 0.3, 0], at: [eAt, 0], prev: [1, 0], n: 1500, o: { variant: 'elite' } });
  check('an elite aims a landing at hx − 0.75: inside 1.x\'s wall at hx − 0.7, so it flops on (toward 70% + kept 20% + 1.25%)', near(te['1,0'] ?? 0, 0.9125, 0.03), JSON.stringify(te));
  const te2 = rollFrom({ hero: [w0.hx - 0.3, 0], at: [eAt + 0.1, 0], prev: [1, 0], n: 600, o: { variant: 'elite' } });
  check('…and one at hx − 0.65 is past it: turned back', !te2['1,0'] && (te2['-1,0'] ?? 0) > 0.9, JSON.stringify(te2));
  const tez = rollFrom({ hero: [0, w0.hz - 0.3], at: [0, w0.hz - 0.75 - 1.512], prev: [0, 1], n: 600, o: { variant: 'elite' } });
  check('the same on z', (tez['0,1'] ?? 0) > 0.68, JSON.stringify(tez));
  // an elite pinned in the corner: the core's wall stands at its own radius, so a landing
  // aimed past it is clamped and the flop's origin moves with the clamp — it stays inside
  // and keeps tumbling
  {
    const { w, g } = world({ seed: 7, x: w0.hx - 1.3, z: w0.hz - 1.3, hero: [w0.hx - 0.4, w0.hz - 0.4], o: { variant: 'elite' } });
    w.hero.mercy = 1e9;
    let inside = true, flops = 0;
    for (let i = 0; i < 1800; i++) {
      const was = g.s.flopping;
      step(w, IDLE);
      if (was && !g.s.flopping) flops++;
      inside &&= Math.abs(g.x) <= w.hx - g.r + 1e-9 && Math.abs(g.z) <= w.hz - g.r + 1e-9;
    }
    check('an elite pinned in the corner for 30 s stays inside the arena and keeps flopping', inside && flops > 30, `${inside} ${flops}`);
  }
  // a long run in a corner pocket: it never leaves the arena, and every landing is a whole face
  const { w, g } = world({ seed: 9, x: w0.hx - 1.2, z: w0.hz - 1.2, hero: [w0.hx - 0.4, w0.hz - 0.4] });
  w.hero.mercy = 1e9;
  let inside = true, faces = true, x0 = 0, z0 = 0;
  for (let i = 0; i < 1800; i++) {
    const was = g.s.flopping;
    step(w, IDLE);
    if (!was && g.s.flopping) { x0 = g.s.x0; z0 = g.s.z0; }
    if (was && !g.s.flopping) faces &&= near(Math.hypot(g.x - x0, g.z - z0), isDiag(g) ? 1.26 * Math.SQRT2 : 1.26, 1e-9);
    inside &&= Math.abs(g.x) <= w.hx - g.r + 1e-9 && Math.abs(g.z) <= w.hz - g.r + 1e-9;
  }
  check('pinned in a corner for 30 s it stays inside, a whole face a flop (on a diagonal, one along each axis)', inside && faces);
}

// ── the swarm forces stick only while it rests (spec §2.3) ────────────
{
  const { w, g } = world({ seed: 4, x: -6, z: 3, hero: [8, -2], anchored: false });
  w.hero.mercy = 1e9;
  let restMoved = 0, flopExact = true, x0 = null, origin = true, rests = 0;
  for (let i = 0; i < 600; i++) {
    const was = g.s.flopping, px = g.x, pz = g.z;
    step(w, IDLE);
    if (!was && !g.s.tumble) { rests++; restMoved = Math.max(restMoved, Math.hypot(g.x - px, g.z - pz)); }
    if (g.s.flopping && !was) x0 = [g.s.x0, g.s.z0];
    else if (g.s.tumble && x0) origin &&= g.s.x0 === x0[0] && g.s.z0 === x0[1];
    if (g.s.tumble && g.s.flopping) {
      const p = Math.min(1, g.s.t / g.s.dur), ang = (135 - 90 * p) * Math.PI / 180;
      const disp = isDiag(g) ? 2 * L0 * p : L0 + D0 * Math.cos(ang);
      flopExact &&= near(g.x, g.s.x0 + g.s.dirX * disp, 1e-12) && near(g.z, g.s.z0 + g.s.dirZ * disp, 1e-12);
    }
  }
  check('resting, a DRIFTER is carried by the swarm forces', rests > 50 && restMoved > 0.005, `${restMoved}`);
  check('flopping, its position is written from the flop\'s origin (the forces of a flop step are lost)', flopExact);
  check('…and with nothing pushing it, the origin holds for the whole flop', origin);
}

// ── what moves it from outside moves the tumble's origin (1.x crowd.js:110) ──
{
  const ref = world({ x: -5, hero: [12, 0] }), poked = world({ x: -5, hero: [12, 0] });
  for (const r of [ref, poked]) { r.g.s.rest = 0.001; r.g.s.dirX = 1; r.g.s.dirZ = 0; }
  for (let i = 0; i < 6; i++) { step(ref.w, IDLE); step(poked.w, IDLE); }
  check('(both mid-flop, in step)', ref.g.s.flopping && poked.g.s.flopping && ref.g.x === poked.g.x);
  poked.g.x += 0.1; poked.g.z -= 0.05;                      // a nudge between steps, as the crowd solver gives one
  let same = true;
  for (let i = 0; i < 40 && (ref.g.s.flopping || poked.g.s.flopping); i++) {
    step(ref.w, IDLE); step(poked.w, IDLE);
    same &&= near(poked.g.x - ref.g.x, 0.1, 1e-12) && near(poked.g.z - ref.g.z, -0.05, 1e-12);
  }
  check('a nudge mid-flop carries the rest of the tumble with it, and the landing', same && !poked.g.s.flopping);
  // the real crowd: two cubes side by side keep a pad apart and still flop in whole faces
  const w = createWorld({ seed: 3 });
  w.director = { step() {} };
  w.hero.x = w.hero.px = 12; w.hero.mercy = 1e9;
  const a = api.spawn(w, 'yela', -6, 0), b = api.spawn(w, 'yela', -6, 0.9);
  let minD = Infinity, flops = 0;
  for (let i = 0; i < 360; i++) { const was = a.s.flopping; step(w, IDLE); if (was && !a.s.flopping) flops++; if (i > 30) minD = Math.min(minD, Math.hypot(a.x - b.x, a.z - b.z)); }
  check('two cubes in one lane are held apart by the crowd and keep tumbling', minD > 2 * S.radius && flops >= 4, `${minD} ${flops}`);
}

// ── the slime: every 0.3 s on its own timer, moving or not ───────────
{
  const { w, g } = world({ x: -8, hero: [12, 0] });
  w.hero.mercy = 1e9;
  const at = [], where = [];
  for (let i = 1; i <= 300; i++) {
    step(w, IDLE);
    for (const e of w.events) if (e.type === 'slime') { at.push(i); where.push(near(e.x, g.x, 1e-12) && near(e.z, g.z, 1e-12) && e.r === 0.5 && e.id === g.id); }
  }
  const gaps = at.slice(1).map((v, k) => v - at[k]);
  check('a splat every 0.3 s on 1.x\'s frame arithmetic', at[0] === stepsDown(0.3) && gaps.every((k) => k === stepsDown(0.3)) && at.length >= 15, `${at[0]} ${gaps.join(' ')}`);
  check('…where it stands, r 0.5, told as a `slime` event', where.every(Boolean));
  const sl = g.s.slime;
  check('the sim keeps its last 8 for the look, numbered and timed', sl.length === S.slime.keep && sl.every((e, k) => k === 0 || (e.n === sl[k - 1].n + 1 && near(e.t - sl[k - 1].t, stepsDown(0.3) * dt, 1e-9))));
  const r = world({ x: -8 });
  r.g.s.rest = 1e9;
  let n = 0;
  for (let i = 0; i < 120; i++) { step(r.w, IDLE); n += r.w.events.filter((e) => e.type === 'slime').length; }
  check('a resting cube slimes too', n === Math.floor(120 / stepsDown(0.3)) && r.g.x === -8);
  check('the slime hurts nothing: the hero was never touched', w.hero.lives === T.hero.lives || w.hero.mercy > 0);
}

// ── contact: within r + 0.5 = 1.2 it hurts (1.x main.js:10886-10906) ──
{
  for (const [d, hurts, o] of [[1.15, true, {}], [1.25, false, {}], [1.3, true, { variant: 'elite' }], [1.4, false, { variant: 'elite' }]]) {
    const { w, g } = world({ x: d, z: 0, hero: [0, 0], o });
    g.s.rest = 1e9;
    step(w, IDLE);
    check(`${o.variant || 'plain'} at ${d}: ${hurts ? 'touching' : 'not touching'}`, (w.hero.lives < T.hero.lives) === hurts && (!hurts || w.killedBy === 'yela'));
  }
  const { w, g } = world({ x: 0.6, hero: [0, 0] });
  w.hero.mercy = 0.5; g.s.rest = 1e9;
  step(w, IDLE);
  check('not through mercy', w.hero.lives === T.hero.lives);
  // it tumbles into you: no stop distance
  const r = world({ x: -6, z: 0, hero: [0, 0] });
  const hurtAt = until(r.w, r.g, () => r.w.hero.lives < T.hero.lives, 600);
  check('it flops straight into you — no stop distance', hurtAt > 0, `${hurtAt}`);
}

// ── two hits kill it; a hit is the core's flash and squash, no more ──
{
  for (const mode of ['arcade', 'hardcade']) {
    const { w, g } = world({ mode, x: 10, hero: [0, 0] });
    w.wave = 5; g.s.rest = 1e9;
    api.heroBullet(w, g.x - 0.5, g.z, 0);
    const pre = { sq: g.sq, sqV: g.sqV };
    step(w, IDLE);
    check(`${mode}: one hit leaves it on 1 hp, flashing, squashed −0.75`, g.alive && g.hp === 1 && g.flash > 0 && near(g.sqV, sprung(pre.sq, pre.sqV, T.gel.sq.hit), 1e-12));
    api.heroBullet(w, g.x - 0.5, g.z, 0);
    step(w, IDLE);
    const kills = w.events.filter((e) => e.type === 'kill' && e.kind === 'yela');
    check(`${mode}: the second kills it`, !g.alive && kills.length === 1);
    check(`${mode}: and it leaves nothing that fires (not a biter)`, w.bullets.filter((b) => !b.hero).length === 0 && w.lobs.length === 0 && w.hazards.length === 0);
  }
}

// ── determinism ─────────────────────────────────────────────────────
{
  const trail = (seed) => {
    const { w, g } = world({ seed, x: -9, z: 5, hero: [6, -3], anchored: false });
    w.hero.mercy = 1e9;
    const out = [];
    for (let i = 0; i < 900; i++) { step(w, IDLE); out.push(`${g.x.toFixed(9)},${g.z.toFixed(9)},${g.s.dirX},${g.s.dirZ}`); }
    return out.join(';');
  };
  check('a run replays from its seed', trail(11) === trail(11));
  check('another seed tumbles another way', trail(11) !== trail(12));
}

// ── the look ─────────────────────────────────────────────────────────
{
  const TSL = THREE.TSL, scene = new THREE.Scene(), GEL_TIME = TSL.uniform(0);
  const made = [];
  const gelMaterial = (hex, fam, r) => {
    const m = new THREE.MeshPhysicalNodeMaterial();
    m.gel = { hit: TSL.uniform(0), hitDir: TSL.uniform(new THREE.Vector2()), tear: TSL.uniform(0), wobble: TSL.uniform(0.35) };
    made.push({ hex, fam, r, m });
    return m;
  };
  const ctx = { THREE, TSL, gelMaterial, GEL_TIME, geo: {}, T, scene, S, kind: 'yela' };
  // a view the way actors.js makes one
  const view = () => {
    const v = { kind: 'yela', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, hit: 0, dyingT: 0 };
    Object.assign(v, look.build({ ...ctx }));
    v.squash.add(v.body); v.root.add(v.squash); look.reset(v);
    return v;
  };
  const v = view();
  const geo = v.body.geometry, bb = geo.boundingBox;
  check('build: its own body, own: true, one gel material in yellow, the cube family, unit radius (1.x makeSatinMat(color, \'cube\', …))',
    v.own === true && made.length === 1 && made[0].hex === 0xffdd00 && made[0].fam === 'cube' && made[0].r === 1 && v.mat === made[0].m);
  check('the body is 1.x\'s RoundedBox: 1.8 radii a side, centred', near(bb.min.x, -0.9, 1e-6) && near(bb.max.y, 0.9, 1e-6) && near(bb.min.z, -0.9, 1e-6));
  const c = S.look.corner / S.radius, inner = 0.9 - c, pos = geo.attributes.position;
  let onSurface = true;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const qx = Math.max(Math.abs(x) - inner, 0), qy = Math.max(Math.abs(y) - inner, 0), qz = Math.max(Math.abs(z) - inner, 0);
    onSurface &&= near(Math.hypot(qx, qy, qz), c, 1e-6);
  }
  check('every vertex sits the corner radius (0.18 at r 0.7) off the inner box: corners rounded, faces flat', onSurface && pos.count > 2000);
  check('every view shares the one geometry', view().body.geometry === geo);
  // 1.x writes no ripple and no tear into a cube (enemy.js:1611, 2986-2989)
  v.mat.gel.hit.value = 1; v.mat.gel.tear.value = 1; v.mat.gel.hitDir.value.set(1, 0);
  check('the core\'s ripple and tear land on stand-ins: the cube\'s own stay at rest', made[0].m.gel !== v.gel && v.gel.hit.value === 0 && v.gel.tear.value === 0 && v.mat.gel.wobble === v.gel.wobble);

  const W = { time: 0 };
  const g = { r: 0.7, sq: 1, tell: 0, flash: 0, s: { tumble: false, slime: [] } };
  const world3 = () => { v.root.updateMatrixWorld(true); return new THREE.Box3().setFromObject(v.body, true); };
  // at rest, mid-breath zero: upright on its face, r × the box
  v.squash.scale.set(0.5, 2, 0.5);                       // what the core set; the look takes it over
  look.update(v, g, W, 0, 1);
  check('at rest: r × the box, its bottom face on the floor, unturned', near(v.body.scale.x, 0.7) && near(v.body.scale.y, 0.7) && near(v.body.position.y, 0.63, 1e-12)
    && v.body.quaternion.equals(new THREE.Quaternion()) && v.squash.scale.x === 1 && v.squash.scale.y === 1);
  // squashed and breathing: 1.x's cube scale block (enemy.js:2770-2777)
  g.sq = 0.78; v.phase = 0.4;
  const t = 1.9, br = 0.10 * Math.sin(t * 2.4 + 0.4), sx = 1 / Math.sqrt(0.78);
  look.update(v, g, W, t, 1);
  check('squashed and breathing: (sx·(1 − b/2), sq·(1 + b), sx·(1 − b/2)) × r', near(v.body.scale.x, 0.7 * sx * (1 - br / 2), 1e-12) && near(v.body.scale.y, 0.7 * 0.78 * (1 + br), 1e-12) && near(v.body.scale.z, v.body.scale.x, 1e-15));
  check('…standing on the floor (the squash anchors at the bottom face)', near(world3().min.y, 0, 1e-6), `${world3().min.y}`);
  g.r = 0.84; g.sq = 1; v.phase = 0; look.update(v, g, W, 0, 1);
  check('an elite is drawn at its own radius', near(v.body.scale.x, 0.84) && near(v.body.position.y, 0.9 * 0.84, 1e-12));
  g.r = 0.7; look.update(v, g, W, 0, 0.5);
  check('it grows in with the view\'s swell (TUNING.gel.swell)', near(v.body.scale.x, 0.35) && near(world3().min.y, 0, 1e-6));

  // the tumble: the pivot edge stays planted wherever the view stands on the flop line
  g.r = 0.7; g.sq = 0.6;                                 // mid-flop the spring is not drawn
  let planted = true, floor = true, top = 0, flat = true;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    Object.assign(g.s, { tumble: true, x0: 2, z0: -1, dirX: dx, dirZ: dz });
    for (const along of [0, 0.2, 0.45, 0.63, 0.9, 1.1, 1.26]) {
      v.root.position.set(2 + dx * along + dz * 0.03, 0, -1 + dz * along + dx * 0.03);   // a crowd nudge across the line changes nothing
      look.update(v, g, W, 0, 1);
      v.root.updateMatrixWorld(true);
      const edge = new THREE.Vector3(dx * 0.9, -0.9, dz * 0.9).applyMatrix4(v.body.matrixWorld);
      planted &&= near(edge.y, 0, 1e-9) && near(edge.x - dz * 0.03, 2 + dx * L0, 1e-9) && near(edge.z - dx * 0.03, -1 + dz * L0, 1e-9);
      floor &&= world3().min.y > -1e-6;
      flat &&= near(v.body.scale.x, 0.7) && near(v.body.scale.y, 0.7) && v.squash.scale.y === 1;
      if (along === 0.63) top = v.body.position.y;
    }
  }
  check('mid-flop the leading bottom edge stays planted, every heading, every step between', planted);
  check('…the cube never dips into the floor, and lifts to D = 0.891 at the top', floor && near(top, D0, 1e-9), `${top}`);
  check('…rigid: no squash, no breath mid-tumble (1.x enemy.js:2739-2740)', flat);
  Object.assign(g.s, { dirX: 1, dirZ: 0 });
  v.root.position.set(2, 0, -1); look.update(v, g, W, 0, 1);
  const q0 = v.body.quaternion.clone();
  v.root.position.set(2 + 1.26, 0, -1); look.update(v, g, W, 0, 1);
  const q1 = v.body.quaternion.clone(), axis = new THREE.Vector3(0, 0, -1);
  check('it turns 0 → 90° about the ground axis (dir.z, 0, −dir.x) (1.x enemy.js:1534, 1552)',
    q0.angleTo(new THREE.Quaternion()) < 1e-9 && q1.angleTo(new THREE.Quaternion().setFromAxisAngle(axis, Math.PI / 2)) < 1e-9);
  // the kill: a cube killed mid-flop stands up for its pop (1.x enemy.js:3015)
  v.root.position.set(2 + 0.63, 0, -1); look.update(v, g, W, 0, 1);
  const lift = v.body.position.y;
  v.dyingT = 0.28; v.body.onBeforeRender();
  check('killed mid-flop it snaps upright where it was, unsquashed', v.body.quaternion.angleTo(new THREE.Quaternion()) < 1e-12 && v.body.position.y === lift && v.body.scale.x === 0.7 && v.popped);
  look.reset(v); v.dyingT = 0;
  check('a reused view starts upright and unpopped', !v.popped && v.seen === -1);

  // the diagonal half roll (v67): its lowest corner on the floor all the way,
  // turned π × how far along it stands, so it lands as itself
  let low = true, rigid = true, crown = 0;
  const run = 2 * L0 * Math.SQRT2;
  for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    Object.assign(g.s, { tumble: true, x0: 2, z0: -1, dirX: dx, dirZ: dz });
    for (const k of [0, 0.15, 0.304, 0.5, 0.696, 0.85, 1]) {
      v.root.position.set(2 + dx * k * run / Math.SQRT2, 0, -1 + dz * k * run / Math.SQRT2);
      look.update(v, g, W, 0, 1);
      v.root.updateMatrixWorld(true);
      let lo = Infinity;
      for (const cx of [-0.9, 0.9]) for (const cy of [-0.9, 0.9]) for (const cz of [-0.9, 0.9]) lo = Math.min(lo, new THREE.Vector3(cx, cy, cz).applyMatrix4(v.body.matrixWorld).y);
      low &&= near(lo, 0, 1e-9);
      rigid &&= near(v.body.scale.x, 0.7) && v.squash.scale.y === 1;
      crown = Math.max(crown, v.body.position.y);
    }
  }
  check('a diagonal tumble keeps its lowest corner on the floor, every diagonal, every step between (v67)', low);
  check('…rigid, and over its corner at L√3 = 1.091', rigid && near(crown, L0 * Math.sqrt(3), 2e-3), `${crown}`);
  Object.assign(g.s, { dirX: 1, dirZ: -1 });
  v.root.position.set(2 + run / Math.SQRT2, 0, -1 - run / Math.SQRT2); look.update(v, g, W, 0, 1);
  const half = v.body.quaternion.angleTo(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-1, 0, -1).normalize(), Math.PI));
  check('…turned a half turn about the ground axis across its line at the landing, as itself again', half < 1e-6, `${half}`);

  // the slime: laid from the sim's splats, one shared pool on the floor
  const P = v.pool;
  check('one slime pool for every view, in the scene once', view().pool === P && scene.children.filter((o) => o === P.splats || o === P.bubbles).length === 2);
  check('…as big as 1.x drew it', P.splats.count === S.look.slimeCap && P.bubbles.count === S.look.bubbleCap);
  g.s = { tumble: false, slime: [{ n: 0, x: 1, z: 2, t: 0.1 }, { n: 1, x: 1.5, z: 2, t: 0.4 }, { n: 2, x: 3, z: 3, t: -2.5 }] };
  const Wa = { time: 0.6 };
  look.update(v, g, Wa, 50, 1);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  P.splats.getMatrixAt(0, m); m.decompose(p, q, s);
  check('a splat where the sim laid it, at y 0.013, 0.5 × 0.85–1.15 a side', near(p.x, 1) && near(p.z, 2) && near(p.y, 0.013) && s.x >= 0.425 && s.x <= 0.575 && s.z >= 0.425 && s.z <= 0.575 && s.y === 1);
  check('…born as long ago as the sim laid it (0.5 s and 0.2 s)', near(P.born.getX(0), P.now.value - 0.5, 1e-6) && near(P.born.getX(1), P.now.value - 0.2, 1e-6));
  P.splats.getMatrixAt(2, m);
  check('a splat already older than 2 s is not laid', m.elements[0] === 0 && m.elements[5] === 0 && m.elements[10] === 0 && P.si === 2);
  const before = P.si;
  look.update(v, g, Wa, 50, 1);
  check('nothing is laid twice', P.si === before);
  // the fizz: scheduled within the first 1.5 s of each splat
  let fizz = true, nb = 0;
  for (let i = 0; i < P.bi; i++) {
    fizz &&= P.bub.getZ(i) <= P.now.value + 1.5 && P.bub.getW(i) >= 0.9 && P.bub.getW(i) <= 1.4 && P.bub2.getX(i) >= 0.07 && P.bub2.getX(i) <= 0.15 && P.bub2.getY(i) === i;
    nb++;
  }
  check('its bubbles live 0.9–1.4 s, 0.07–0.15 across', fizz && nb <= 2 * S.look.fizzMax);
  // the rate: many splats average 1.5 a second over the first 1.5 s = 2.25 each
  const P2 = { ...P, si: 0, bi: 0, splats: { count: 1e6, setMatrixAt() {}, instanceMatrix: {} }, bubbles: { count: 1e6 },
    born: { setX() {} }, bub: { setXYZW(n, x, z, b) { this.t.push(b); }, t: [] }, bub2: { setXY() {} } };
  for (let i = 0; i < 4000; i++) lay(P2, S.look, 0, 0, 0.5, 0);
  const mean = P2.bub.t.length / 4000;
  check('the fizz averages 1.5 bubbles a second while > 0.5 s remain (2.25 a splat)', near(mean, 2.25, 0.12) && P2.bub.t.every((b) => b > 0 && b < 1.5), `${mean}`);
  // the clock: with the sim while a cube is drawn, the frame clock when none is
  const n0 = P.now.value;
  look.update(v, g, Wa, 51, 1);
  check('a held sim (a pause, a look check) holds the trail', P.now.value === n0);
  Object.assign(Wa, { time: 0.9 }); look.update(v, g, Wa, 52, 1);
  check('…the sim moving moves it', near(P.now.value, n0 + 0.3, 1e-9));
  GEL_TIME.value = 52; P.splats.onBeforeRender();
  check('…once a frame, however many passes draw it', near(P.now.value, n0 + 0.3, 1e-9));
  GEL_TIME.value = 52.25; P.splats.onBeforeRender();
  check('with no cube left to draw, the trail fades on the frame clock', near(P.now.value, n0 + 0.55, 1e-9));
  look.update(v, g, { time: 0 }, 53, 1);
  check('a new run clears the floor', P.born.getX(0) < -1e8 && P.si === 0);
}

if (failed) { console.log(`✗ yela: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ yela: ${passed} checks`);
