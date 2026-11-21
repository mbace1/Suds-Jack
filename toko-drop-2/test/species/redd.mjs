#!/usr/bin/env node
// redd.mjs — REDD CUBE's own checks, in bare node: 1.x's numbers
// (enemy.js:586, 701, 738, 1000, 1209-1214, 1486-1566, 1682, 2297-2309, 2331,
// 2770-2777, 2967-3000, 3007, 3013-3029, 3062-3066; tuning.js:56-62, 304,
// 496-497; crowd.js:107-116; main.js:2410-2420, 4495, 4517-4529, 5032, 9416,
// 10586-10620),
// asserted against the sim stepping on its fixed 1/60 s, and its look against
// a real three. Its flop and its brood are also checked against an ORACLE:
// 1.x's own code for them, transcribed with 1.x's literals and fed the same
// random stream.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=159';
import { TUNING as T } from '../../js/tuning.js?v=159';
import { waveScale } from '../../js/sim/director/arcade.js?v=159';
import { makeRng } from '../../js/sim/rng.js?v=159';
import behaviour, { broodSize } from '../../js/sim/species/redd.js?v=159';
import look from '../../js/render/looks/redd.js?v=159';
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

const S = T.species.redd, F = S.flop, K = S.flank, CH = S.children, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const [KS, CS] = T.gel.sq.cube;
const L0 = F.halfExtent * S.radius, D0 = L0 * Math.SQRT2;
const HOLD = 1e9;                          // a rest that never runs out

// a world with nothing in it but one REDD CUBE, the hero where asked and
// never out of lives; anchored (no swarm forces, no crowd) unless asked, so
// what moves it is its own step. It is live from its first step, as 1.x's
// was: 1.x had no appear phase (owner, 2026-10-22)
function world({ seed = 1, mode = 'arcade', x = 0, z = 0, hero = [12, 0], o = {}, anchored = true, dashMode = 'pass', side = null } = {}) {
  const w = createWorld({ seed, mode, dashMode });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  const h = w.hero; h.x = h.px = hero[0]; h.z = h.pz = hero[1];
  const g = api.spawn(w, 'redd', x, z, o);
  g.anchored = anchored;
  if (side) g.s.flankSign = side;
  return { w, g };
}
// 1.x's own frame arithmetic
const stepsDown = (from) => { let t = from, n = 0; while (!(t <= 0)) { t -= dt; n++; } return n; };   // a countdown
const stepsUp = (dur) => { let t = 0, n = 0; while (!(Math.min(1, t / dur) >= 1)) { t += dt; n++; } return n; }; // a flop
const sprung = (sq, sqV, kick) => (sqV - (sq - 1) * KS) * CS + kick;
const cycleOf = (spd, rm = 1) => { const L = F.halfExtent * S.radius * rm, c = (2 * L) / Math.max(spd, F.minSpeed), f = Math.min(F.timeMax, c * F.shareOfCycle); return { L, stride: 2 * L, cycle: c, flop: f, rest: Math.max(F.restMin, c - f) }; };
const until = (w, pred, max = 600) => { for (let i = 1; i <= max; i++) { step(w, IDLE); if (pred()) return i; } return -1; };
const run = (w, n, input = IDLE) => { for (let i = 0; i < n; i++) step(w, input); };
const kids = (w) => w.gels.filter((o) => o.kind === 'reddmini');
// frames until 1.x's death pop, `_deathT = 0.28` counted down a frame at a time, reaches 0 (enemy.js:2969, 2992)
const popFrames = stepsDown(0.28);
// force the roll a rest's end draws (1.x `r = Math.random()`): only this step's w.rng.next() is replaced
const rolled = (w, r, fn) => { const nx = w.rng.next; let used = false; w.rng.next = () => (used ? nx() : (used = true, r)); try { fn(); } finally { w.rng.next = nx; } };

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.75, hp 3, speed 1.9, red 0xff2211, no gun (1.x enemy.js:586)',
    S.radius === 0.75 && S.hp === 3 && S.speed === 1.9 && S.color === 0xff2211 && S.bulletColor === null && S.fireInterval === null);
  check('a rounded cube, DRIFTER, hurts to touch in classic (MELEE_TYPES), not a biter (1.x tuning.js:304, 496-497; main.js:2413)',
    S.family === 'cube' && S.role === 'DRIFTER' && S.contact === true && S.revenge === null);
  check('the death screen calls it 1.x\'s "red cube" (main.js:5032)', S.deathLabel === 'red cube');
  const R = T.movement.roles.DRIFTER;
  check('DRIFTER is 1.x\'s: dodge 0.3, flock 0.6, current 1.0, weave 0.25', R.dodge === 0.3 && R.flock === 0.6 && R.current === 1.0 && R.weave === 0.25);
  check('the flank: 0.9 rad farther than 5, 0.3 inside, its side ±1 at 50/50 (1.x enemy.js:701, 2306-2307)',
    K.far === 5 && K.wide === 0.9 && K.close === 0.3 && K.side === 0.5 && S.distFloor === 0.001);
  check('the flop: arc 135° → 45°, −0.32 landing, ≤ 0.30 s and 0.65 of the cycle (1.x tuning.js:58-60)',
    F.arcStartDeg === 135 && F.arcEndDeg === 45 && F.landSquish === -0.32 && F.timeMax === 0.30 && F.shareOfCycle === 0.65);
  check('half-extent 0.9 r (a 1.8 r box), rests ≥ 0.02 s, speed floor 0.01 (1.x enemy.js:738, 1497, 1501, 1564)',
    F.halfExtent === 0.9 && F.restMin === 0.02 && F.minSpeed === 0.01);
  check('the first rest is U·0.25 s; the heading roll 0.70 / 0.90 / any; 0.7 with no heading (1.x enemy.js:1213, 1519, 1521)',
    F.firstRest[0] === 0 && F.firstRest[1] === 0.25 && F.toward === 0.70 && F.keep === 0.90 && F.idleKeep === 0.7);
  check('the brood: REDD MINIs, min(8, 4 + 2·round((1/max(iM, 0.1) − 1)/0.09)) (1.x enemy.js:3063-3065)',
    CH.kind === 'reddmini' && CH.base === 4 && CH.perTier === 2 && CH.max === 8 && CH.tierFloor === 0.1 && CH.tierStep === 0.09);
  check('…at (j/n)·2π + U·0.3, 1.2 + U·1.5 out (1.x main.js:10595-10598)', CH.jitter === 0.3 && CH.dist[0] === 1.2 && CH.dist[1] === 2.7);
  // 1.x had no appear phase (owner, 2026-10-22): the only wait is the pop's
  // own `_deathT = 0.28` (enemy.js:3007), counted down to 0 (2969, 2992-2998)
  const src = readFileSync(new URL('../../js/sim/species/redd.js', import.meta.url), 'utf8');
  check('…out when the 0.28 s death pop ends, the core\'s own pop clock (1.x enemy.js:3007): no appear phase on top of it',
    T.blob.death === 0.28 && T.gel.appear === undefined && /c\.t = -wait/.test(src) && /wait = api\.T\.blob\.death/.test(src) && !/gel\.appear/.test(src));
  const lk = S.look;
  check('the look: RoundedBox corner 0.18, 4 segments (enemy.js:738); breath 0.10 at 2.4 rad/s, half across (tuning.js:61, enemy.js:2773-2775)',
    lk.corner === 0.18 && lk.segments === 4 && lk.breatheAmp === 0.10 && lk.breatheRate === 2.4 && lk.breatheXZ === 0.5 && lk.sqFloor === 0.1);
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('it has no special hits, the core\'s circle and the core\'s contact; a death of its own (the brood)',
    !behaviour.onHit && !behaviour.hitTest && !behaviour.touches && typeof behaviour.onKill === 'function');
}

// ── its starting state (1.x enemy.js:701, 1209-1214) ─────────────────
{
  const rests = [], sides = { 1: 0, '-1': 0 }, dirs = new Set();
  let fresh = true;
  for (let seed = 1; seed <= 400; seed++) {
    const { g } = world({ seed });
    rests.push(g.s.rest); sides[g.s.flankSign]++; dirs.add(`${g.s.dirX},${g.s.dirZ}`);
    fresh &&= g.s.flopping === false && g.s.tumble === false && near(g.s.lift, L0, 1e-12);
  }
  check('it starts at rest, standing on a face (its centre at L)', fresh);
  check('the first rest is in [0, 0.25) and spread over it', rests.every((t) => t >= 0 && t < 0.25) && Math.min(...rests) < 0.01 && Math.max(...rests) > 0.24);
  check('its flank side is +1 or −1, about half each', sides[1] + sides[-1] === 400 && sides[1] > 160 && sides[-1] > 160, JSON.stringify(sides));
  check('its first heading is any of the four cardinals', dirs.size === 4 && [...dirs].every((d) => ['1,0', '-1,0', '0,1', '0,-1'].includes(d)));
  // 1.x had no appear phase: the pump built a body (main.js:9371) ahead of the
  // update loop that ran it the same frame (main.js:10366-10368), so its first
  // rest `_flopRest -= dt` (enemy.js:1505) counts from the frame it is born
  let first = true, flopsAtOnce = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const { w, g } = world({ seed }), r0 = g.s.rest;
    step(w, IDLE);
    if (r0 - dt > 0) first &&= !g.s.flopping && g.s.rest === r0 - dt;
    else { first &&= g.s.flopping; flopsAtOnce++; }
  }
  check('live from its first step: its first rest counts down on it, and a rest under one step flops on it', first && flopsAtOnce > 0, `${flopsAtOnce} flopped at once`);
}

// ── the flanker's heading (1.x enemy.js:2303-2309, 1514-1522) ─────────
{
  // the cardinal it takes when the roll says "toward": the larger axis of the turned bearing
  const pick = (hero, side, r = 0.5) => {
    const { w, g } = world({ x: 0, z: 0, hero, side });
    g.s.rest = 0.001;
    rolled(w, r, () => step(w, IDLE));
    return g.s.flopping ? `${g.s.dirX},${g.s.dirZ}` : 'rest';
  };
  // you 12 along +x: farther than 5, the bearing turned 0.9 rad: (0.62, ±0.78) — across your line
  check('far off (12), flank +1: the bearing turned +0.9 rad has its larger axis ACROSS your line: it flops +z', pick([12, 0], 1) === '0,1');
  check('…flank −1: −z', pick([12, 0], -1) === '0,-1');
  check('…exactly 5 off is not "farther than 5": turned 0.3, it flops at you (+x)', pick([5, 0], 1) === '1,0' && pick([5, 0], -1) === '1,0');
  check('…5.01 off is: across your line again', pick([5.01, 0], 1) === '0,1' && pick([5.01, 0], -1) === '0,-1');
  check('close (3), turned 0.3 rad: (0.96, ±0.30), it flops straight at you', pick([3, 0], 1) === '1,0' && pick([3, 0], -1) === '1,0');
  // a bearing near the diagonal: 0.3 rad tips it either side of 45°
  const b = 40 * Math.PI / 180, at = [3 * Math.cos(b), 3 * Math.sin(b)];
  check('close, a bearing of 40°: flank +1 turns it to 57° (+z), flank −1 to 23° (+x)', pick(at, 1) === '0,1' && pick(at, -1) === '1,0');
  // you behind it, far: the turn is about its own bearing to you
  check('far, you along −z: flank +1 turns (0, −1) by +0.9 to (0.78, −0.62): +x', pick([0, -9], 1) === '1,0' && pick([0, -9], -1) === '-1,0');
  // the roll (1.x enemy.js:1519): toward below 0.70, the last heading below 0.90, else any
  const keepDir = (r) => {
    const { w, g } = world({ x: 0, z: 0, hero: [3, 0], side: 1 });
    g.s.rest = 0.001; g.s.dirX = 0; g.s.dirZ = -1;
    rolled(w, r, () => step(w, IDLE));
    return `${g.s.dirX},${g.s.dirZ}`;
  };
  check('a roll of 0.699: toward you', keepDir(0.699) === '1,0');
  check('0.70 and 0.899: its last heading', keepDir(0.70) === '0,-1' && keepDir(0.899) === '0,-1');
  const any = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const { w, g } = world({ seed, x: 0, z: 0, hero: [3, 0], side: 1 });
    g.s.rest = 0.001; g.s.dirX = 0; g.s.dirZ = -1;
    rolled(w, 0.9, () => step(w, IDLE));
    any.add(`${g.s.dirX},${g.s.dirZ}`);
  }
  check('0.90: any of the four, drawn afresh', any.size === 4);
  // on top of you there is no bearing: its last line 70%, else any (1.x enemy.js:1520-1522)
  const { w: wt, g: gt } = world({ x: 2, z: 2, hero: [2, 2], side: 1 });
  gt.s.rest = 0.001; gt.s.dirX = -1; gt.s.dirZ = 0;
  rolled(wt, 0.69, () => step(wt, IDLE));
  check('on top of you, a roll under 0.7 keeps its line', gt.s.flopping && gt.s.dirX === -1 && gt.s.dirZ === 0);
  // the statistics of a long natural run: with you far and still, 70% + 20%·¼ + 10%·¼ of rolls cross your line
  let across = 0, at2 = 0, n = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const { w, g } = world({ seed, x: -12, z: 0, hero: [12, 0], side: 1 });
    g.s.rest = 0.001;
    step(w, IDLE);
    n++; if (g.s.dirZ === 1) across++; if (g.s.dirX === 1) at2++;
  }
  check('far off, its first flop crosses your line about 3 times in 4 (0.70 + 0.30·¼ = 0.775)', across / n > 0.70 && across / n < 0.85, `${across}/${n}`);
  check('…and only now and then comes straight at you', at2 / n < 0.15, `${at2}/${n}`);
}

// ── one flop on a cardinal (1.x enemy.js:1542-1565) ──────────────────
{
  const { w, g } = world({ x: -4, z: 1, hero: [-4 + 3, 1 + 0.5], side: 1 });   // close, bearing ≈ +x: it flops +x
  g.s.rest = 0.001;
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
  check('the flop lasts min(0.30, 0.65·cycle) = 0.30 s at speed 1.9, on 1.x\'s frame arithmetic', log.length === stepsUp(flop) && near(g.s.dur, flop) && near(flop, 0.30, 1e-12), `${log.length} steps`);
  check('each step the centre sits L + D·cos(ang) along the heading and D·sin(ang) up, ang 135° → 45° linear in time', kinematic);
  check('it lifts to D = L√2 = 0.955 at the top of the arc', near(lifted, D0, 3e-3) && lifted <= D0 + 1e-12, `${lifted}`);
  check('a flop advances exactly one face, 2L = 1.35', near(g.x - x0.x, 1.35, 1e-12) && g.z === x0.z);
  const land = log[log.length - 1];
  check('the landing kicks the squash spring flat: −0.32 (1.x enemy.js:1561)', land.landed && near(land.sqV, sprung(land.pre.sq, land.pre.sqV, F.landSquish), 1e-12));
  check('and it rests for the rest of the cycle: max(0.02, 0.711 − 0.30) = 0.411 s', near(land.rest, rest, 1e-12) && near(rest, 1.35 / 1.9 - 0.30, 1e-12), `${land.rest}`);
}

// ── the cadence: cycle = 2L / spd, so the average ground speed is spd ──
for (const [wave, flopWant, restWant] of [[1, 0.300, 0.3832], [4, 0.300, 0.2279], [6, 0.298, 0.1604], [10, 0.242, 0.1302]]) {
  const mult = waveScale(wave).speedMult;
  const { w, g } = world({ x: -16, z: 0, hero: [17, 0], side: 1, o: { speedMult: mult } });
  // the rhythm is read along one line: you are kept 3 ahead of it, where a 0.3 rad turn stays +x
  const c = cycleOf(S.speed * mult);
  check(`wave ${wave} (×${mult.toFixed(3)}): flop ${flopWant} s, rest ${restWant} s`, near(c.flop, flopWant, 6e-4) && near(c.rest, restWant, 6e-4), `${c.flop} ${c.rest}`);
  const lands = [];
  for (let i = 1; i <= 360; i++) {
    w.hero.x = g.x + 3; w.hero.z = g.z;                    // keep you 3 ahead: every "toward" is +x
    const was = g.s.flopping;
    step(w, IDLE);
    if (was && !g.s.flopping) lands.push(i);
    if (g.x > 14) break;
  }
  const gaps = lands.slice(1).map((v, k) => v - lands[k]);
  const want = stepsDown(c.rest) + stepsUp(c.flop) - 1;
  check(`wave ${wave}: every cycle is one rest and one flop on 1.x's frame arithmetic (${want} steps)`, gaps.length >= 4 && gaps.every((k) => k === want), gaps.join(' '));
}

// ── the walls turn it back (1.x enemy.js:1523-1531) ──────────────────
{
  const w0 = createWorld({});
  const cases = [
    { at: [0, w0.hz - 1.5], hero: [0.5, w0.hz - 1.5 + 3], want: [0, -1], name: 'the bottom wall: a stride into it is turned back along z' },
    { at: [w0.hx - 1.5, 0], hero: [w0.hx - 1.5 + 3, 0], want: [-1, 0], name: 'the right wall: turned back along x' },
    { at: [0, w0.hz - 2.5], hero: [0, w0.hz - 2.5 + 3], want: [0, 1], name: 'a stride short of the wall it keeps its heading' },
  ];
  for (const k of cases) {
    const { w, g } = world({ x: k.at[0], z: k.at[1], hero: k.hero, side: 1 });
    g.s.rest = 0.001;
    rolled(w, 0.5, () => step(w, IDLE));
    check(k.name, g.s.flopping && g.s.dirX === k.want[0] && g.s.dirZ === k.want[1], `${g.s.dirX},${g.s.dirZ}`);
  }
  // an elite's grown radius does not move the wall it turns at: the CFG radius does (1.x enemy.js:1495)
  const { w, g } = world({ x: 0, z: 0, hero: [0, 12], side: 1, o: { variant: 'elite' } });
  const L = F.halfExtent * g.r;
  g.z = g.pz = w.hz - S.radius - 2 * L - 0.001;            // its stride would end just inside the CFG radius's wall
  g.s.rest = 0.001;
  rolled(w, 0.5, () => step(w, IDLE));
  check('an elite (r 0.9) turns at the CFG radius\'s wall, 0.75 in, not its own: a stride that ends 0.751 from the wall is taken', near(g.r, 0.9, 1e-12) && g.s.dirZ === 1 && near(L, 0.81, 1e-12), `${g.s.dirZ}`);
  const e2 = world({ x: 0, z: 0, hero: [0, 12], side: 1, o: { variant: 'elite' } });
  e2.g.z = e2.g.pz = e2.w.hz - S.radius - 2 * L + 0.001; e2.g.s.rest = 0.001;
  rolled(e2.w, 0.5, () => step(e2.w, IDLE));
  check('…and one that would end 0.749 from it is turned back', e2.g.s.dirZ === -1, `${e2.g.s.dirZ}`);
  // a long natural run hunting you in a corner: it never leaves the arena, and every landing is a whole face
  const r = world({ seed: 9, x: 0, z: 0, hero: [w0.hx - 0.6, w0.hz - 0.6] });
  let inside = true, faces = true, x0 = 0, z0 = 0, landings = 0;
  for (let i = 0; i < 3600; i++) {
    const was = r.g.s.flopping;
    step(r.w, IDLE);
    if (!was && r.g.s.flopping) { x0 = r.g.s.x0; z0 = r.g.s.z0; }
    if (was && !r.g.s.flopping) { landings++; faces &&= near(Math.hypot(r.g.x - x0, r.g.z - z0), 1.35, 1e-9); }
    inside &&= Math.abs(r.g.x) <= r.w.hx - r.g.r + 1e-9 && Math.abs(r.g.z) <= r.w.hz - r.g.r + 1e-9;
  }
  check('hunting you in a corner for 60 s it stays inside, a whole face a flop', inside && faces && landings > 60, `${landings}`);
}

// ── it closes on you, from its side (the flanker, end to end) ─────────
{
  // its own step alone (anchored: the swarm's current can carry a free one off for a while),
  // you standing still 23 along its row: it reaches you, and swings off your line to do it
  let reached = 0, offLine = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const { w, g } = world({ seed, x: -15, z: 0, hero: [8, 0] });
    w.hero.mercy = 1e9;                                     // let it reach you without the game ending the test
    let maxOff = 0, got = false;
    for (let i = 0; i < 60 * 30 && !got; i++) {
      step(w, IDLE);
      const d = Math.hypot(g.x - w.hero.x, g.z - w.hero.z);
      if (d > K.far) maxOff = Math.max(maxOff, Math.abs(g.z));
      if (d < g.r + T.gel.contactRadius) got = true;
    }
    if (got) reached++;
    if (maxOff > 2.5) offLine++;
  }
  check('a REDD 23 off reaches you inside 30 s, every time', reached === 30, `${reached}/30`);
  check('…and on its way it swings off your line by two faces or more (> 2.5 u) every time: a flank, not a rush', offLine === 30, `${offLine}/30`);
}

// ── its touch hurts; three hits kill it ──────────────────────────────
{
  const { w, g } = world({ x: 1.2, z: 0, hero: [0, 0] });
  g.s.rest = HOLD;
  w.hero.lives = 3;
  step(w, IDLE);
  check('standing within r + 0.5 = 1.25 of it hurts (1.x MELEE_TYPES)', w.hero.lives === 2 && w.killedBy === 'redd');
  const { w: w2, g: g2 } = world({ x: 1.26, z: 0, hero: [0, 0] });
  g2.s.rest = HOLD; w2.hero.lives = 3;
  step(w2, IDLE);
  check('…1.26 off does not', w2.hero.lives === 3);
  for (const mode of ['arcade', 'hardcade']) {
    const r = world({ mode, x: 10, z: 0, hero: [0, 0] });
    r.w.wave = 6; r.g.s.rest = HOLD;
    let ok = true;
    for (let k = 1; k <= 3; k++) {
      api.heroBullet(r.w, r.g.x - 0.5, r.g.z, 0);
      const pre = { sq: r.g.sq, sqV: r.g.sqV };
      step(r.w, IDLE);
      if (k < 3) ok &&= r.g.alive && r.g.hp === 3 - k && r.g.flash > 0 && near(r.g.sqV, sprung(pre.sq, pre.sqV, T.gel.sq.hit), 1e-12);
    }
    const kills = r.w.events.filter((e) => e.type === 'kill' && e.kind === 'redd');
    check(`${mode}: two hits flash and squash it (−0.75), the third kills it`, ok && !r.g.alive && kills.length === 1);
    check(`${mode}: a big body (0.75): the core's shockwave, puddle and chunks`, kills[0]?.big === true && kills[0].r === 0.75 && kills[0].color === 0xff2211);
    check(`${mode}: its corpse fires nothing (not a biter)`, r.w.bullets.filter((b) => !b.hero).length === 0 && !r.w.events.some((e) => e.type === 'revenge'));
  }
}

// ── the brood: how many (1.x enemy.js:3064-3065) ─────────────────────
{
  for (const [iM, n] of [[1, 4], [0.98, 4], [0.96, 4], [0.95, 6], [0.945, 6], [0.89, 6], [0.87, 8], [0.835, 8], [0.505, 8], [0.35, 8], [0.05, 8]]) {
    check(`iM ${iM}: ${n} minis (rounded, not floored)`, broodSize(CH, iM) === n, `${broodSize(CH, iM)}`);
  }
  // 1.x literally: iM 0.95 is a tier of 0.58, rounded to 1 (6 minis) where a floor would give 0 (4)
  const x = (iM) => Math.min(8, 4 + Math.round((1 / Math.max(iM, 0.1) - 1) / 0.09) * 2);
  let same = true;
  for (let iM = 0.3; iM <= 1.0001; iM += 0.0025) same &&= broodSize(CH, iM) === x(iM);
  check('across every intervalMult the director can give (0.35..1) it is 1.x\'s formula', same);
  const byWave = [1, 2, 3, 4, 5, 8, 26].map((wave) => broodSize(CH, waveScale(wave).intervalMult));
  check('by the director\'s own waves: 4 6 6 8 8 8 8 (waves 1-5, 8, 26) — so 8 from wave 4, its first', byWave.join(' ') === '4 6 6 8 8 8 8', byWave.join(' '));
  for (const [iM, n] of [[1, 4], [0.89, 6], [0.835, 8]]) {
    const { w, g } = world({ x: 0, z: 0, o: { intervalMult: iM } });
    api.kill(w, g, 'hero');
    check(`a REDD of iM ${iM} that dies drops ${n}`, kids(w).length === n, `${kids(w).length}`);
  }
}

// ── the brood: where, what, and when (1.x main.js:10586-10620, enemy.js:2992-3000) ──
{
  const { w, g } = world({ x: 2, z: -1, hero: [-12, 6], o: { speedMult: 1.346, intervalMult: 0.835 } });
  step(w, IDLE);
  g.hp = 1; api.heroBullet(w, g.x - g.r - 0.3, g.z, 0); step(w, IDLE);
  const k = kids(w);
  check('a bullet kill: 8 REDD MINIs', !g.alive && k.length === 8);
  check('ordinary bodies: hp 1, r 0.32, no variant, no affix, marked as children',
    k.every((c) => c.hp === 1 && c.maxHp === 1 && c.r === 0.32 && c.variant === 'normal' && c.affix === null && c.child === true && !c.isBoss));
  check('on the parent\'s wave multipliers (1.x new Enemy(…, e._speedMult, e._intervalMult))', k.every((c) => c.speedMult === 1.346 && c.intervalMult === 0.835));
  const placed = k.map((c, j) => {
    const a = wrap(Math.atan2(c.z - g.z, c.x - g.x)), d = Math.hypot(c.x - g.x, c.z - g.z);
    return { a, d, off: wrap(a - (j / 8) * TAU) };
  });
  check('mini j at (j/8)·2π + [0, 0.3) round the corpse: evenly round it, not freeform', placed.every((p) => p.off >= 0 && p.off < 0.3 + 1e-12), placed.map((p) => p.off.toFixed(3)).join(','));
  check('1.2–2.7 u out', placed.every((p) => p.d >= 1.2 - 1e-12 && p.d < 2.7 + 1e-12));
  check('none is out yet: each waits out the pop, the whole 0.28 s of it (state \'appear\', t = −0.28)', k.every((c) => c.state === 'appear' && c.t === -T.blob.death));
  const at = k.map((c) => [c.x, c.z]);
  api.heroBullet(w, k[0].x - 0.5, k[0].z, 0);
  let activeAt = -1, still = true, unhurt = true, unhit = true;
  const lives = w.hero.lives;
  for (let n = 1; n <= 40; n++) {
    if (n === 2) { w.hero.x = k[1].x; w.hero.z = k[1].z; }  // stand on one: it does not hurt yet
    step(w, IDLE);
    if (activeAt < 0 && k.every((c) => c.state === 'active')) activeAt = n;
    if (activeAt < 0) {
      still &&= k.every((c, j) => c.x === at[j][0] && c.z === at[j][1]);
      unhurt &&= w.hero.lives === lives;
      unhit &&= k.every((c) => c.hp === 1 && c.alive);
    }
    if (n === 3) { w.hero.x = -12; w.hero.z = 6; }
  }
  check(`they come out on 1.x's frame: ${popFrames} steps after the kill (the death pop's 0.28 s)`, activeAt === popFrames, `${activeAt}`);
  check('until then they do not move, nor hurt you, nor take a bullet', still && unhurt && unhit);
  // once out, they rush you
  const d0 = k.reduce((s, c) => s + Math.hypot(c.x - w.hero.x, c.z - w.hero.z), 0);
  run(w, 60);
  const d1 = k.reduce((s, c) => s + Math.hypot(c.x - w.hero.x, c.z - w.hero.z), 0);
  check('once out, the brood tumbles at you', d1 < d0 - 8 * 1.5, `${d0.toFixed(2)} → ${d1.toFixed(2)}`);
}
{
  // the spread over many corpses: the whole of 1.x's jitter and distance
  const offs = [], ds = [];
  for (let seed = 1; seed <= 120; seed++) {
    const { w, g } = world({ seed, x: 0, z: 0, o: { intervalMult: 0.835 } });
    api.kill(w, g, 'env');
    kids(w).forEach((c, j) => { offs.push(wrap(Math.atan2(c.z, c.x) - (j / 8) * TAU)); ds.push(Math.hypot(c.x, c.z)); });
  }
  check('the jitter covers [0, 0.3)', Math.min(...offs) < 0.02 && Math.max(...offs) > 0.28 && Math.max(...offs) < 0.3);
  check('the distance covers [1.2, 2.7)', Math.min(...ds) < 1.25 && Math.max(...ds) > 2.65 && Math.max(...ds) < 2.7);
  // every death broods: a bullet, a dash, the environment (1.x destroy() sets it for all)
  for (const src of ['hero', 'dash', 'env']) {
    const { w, g } = world({ x: 0, z: 0 });
    api.kill(w, g, src);
    check(`a ${src} kill broods`, kids(w).length === 4);
  }
  // swift is baked into 1.x's _speedMult, so the brood inherits it, not the affix
  const { w, g } = world({ x: 6, z: 0, o: { affix: 'swift', speedMult: 1.1 } });
  api.kill(w, g, 'env');
  check('a SWIFT parent\'s brood inherits the ×1.35 (1.x main.js:9416 bakes it into _speedMult)',
    kids(w).every((c) => near(c.speedMult, 1.1 * 1.35, 1e-12) && c.affix === null));
  const { w: w2, g: g2 } = world({ x: 6, z: 0, o: { variant: 'elite' } });
  api.kill(w2, g2, 'env');
  check('an elite\'s brood: four ordinary minis', kids(w2).length === 4 && kids(w2).every((c) => c.r === 0.32 && c.hp === 1 && c.variant === 'normal'));
  check('an elite REDD (r 0.9, hp 6) takes 6 hits (the core\'s elite)', near(g2.r, 0.9, 1e-12) && g2.maxHp === 6);
  // against a wall: 1.x leaves a mini up to 2.7 outside it; 2.0's walls hold every body
  const w3 = createWorld({ seed: 3 }); w3.director = { step() {} };
  const g3 = api.spawn(w3, 'redd', w3.hx - 0.8, w3.hz - 0.8);
  api.kill(w3, g3, 'env');
  check('a corner corpse: its brood is inside the walls', kids(w3).length === 4 && kids(w3).every((c) => Math.abs(c.x) <= w3.hx - c.r && Math.abs(c.z) <= w3.hz - c.r));
}
{
  // its own death's shockwave (1.x main.js:4495, 4517-4529): every body alive
  // at the kill within 3.5 takes −0.55 on its squash spring — but the brood
  // was built 0.28 s later, so it never took its parent's ("newborn minnows
  // must not be vaporized by the shockwave that birthed them")
  for (const variant of ['normal', 'elite']) {
    const { w, g } = world({ x: 0, z: 0, o: { intervalMult: 0.835, variant } });
    const near1 = api.spawn(w, 'yela', 3.4, 0), far1 = api.spawn(w, 'yela', -3.6, 0);
    g.hp = 1; api.heroBullet(w, g.x - g.r - 0.3, g.z, 0); step(w, IDLE);
    const k = kids(w);
    check(`${variant}: its death squashes a body 3.4 off (−0.55) and not one 3.6 off`, !g.alive && near(near1.sqV, -0.55, 1e-12) && far1.sqV === 0, `${near1.sqV} ${far1.sqV}`);
    check(`${variant}: …but not its own brood, all 2.7 or less from it: each starts unsquashed, sq 1 and sqV 0`, k.length === 8 && k.every((c) => c.sq === 1 && c.sqV === 0), k.map((c) => c.sqV).join(','));
    run(w, popFrames);
    check(`${variant}: …and comes out of the pop still: sq 1`, k.every((c) => c.state === 'active' && c.sq === 1));
  }
}
{
  // nor does another big death during the pop rattle the brood: 1.x had
  // nothing there yet to rattle (it built the brood when the pop ended,
  // main.js:10586-10620; the shockwave took only the living, main.js:4518-4529)
  const { w, g } = world({ x: 0, z: 0, o: { intervalMult: 0.835 } });
  const other = api.spawn(w, 'orange', 0, 3); other.anchored = true;
  api.kill(w, g, 'env');
  const k = kids(w);
  run(w, 5);
  api.kill(w, other, 'env');
  check('an ORANGE (big, 0.75) dying beside the waiting brood leaves it at rest', k.length === 8 && k.some((c) => Math.hypot(c.x - other.x, c.z - other.z) <= T.death.shockRadius) && k.every((c) => c.state === 'appear' && c.sq === 1 && c.sqV === 0), k.map((c) => c.sqV).join(','));
  run(w, popFrames - 5);
  check('…and it comes out at rest', k.every((c) => c.state === 'active' && c.sq === 1 && c.sqV === 0));
}
{
  // the child valve: none past the live cap × 2 (1.x main.js:10612-10619)
  const { w, g } = world({ x: 0, z: 0, o: { intervalMult: 0.835 } });
  for (let i = 0; i < 5; i++) api.spawn(w, 'yela', -15 + i * 2, 8);
  w.dir.childCap = 8;
  api.kill(w, g, 'env');
  check('with 5 living and a cap of 8, three of the eight come out', kids(w).length === 3, `${kids(w).length}`);
  const { w: w2, g: g2 } = world({ x: 0, z: 0 });
  for (let i = 0; i < 8; i++) api.spawn(w2, 'yela', -15 + i * 2, 8);
  w2.dir.childCap = 8;
  api.kill(w2, g2, 'env');
  check('at the cap, none', kids(w2).length === 0);
}
{
  // the brood against 1.x's own placement (main.js:10593-10603), fed the same stream
  let same = true;
  for (let seed = 1; seed <= 40 && same; seed++) {
    const iM = [1, 0.89, 0.835][seed % 3];
    const { w, g } = world({ seed, x: (seed % 7) - 3, z: (seed % 5) - 2, o: { intervalMult: iM } });
    const R = makeRng(0); R.state = w.rng.state;
    api.kill(w, g, 'hero');
    const count = Math.min(8, 4 + Math.round((1 / Math.max(iM, 0.1) - 1) / 0.09) * 2), want = [];
    for (let j = 0; j < count; j++) { const a = (j / count) * Math.PI * 2 + R.next() * 0.3, r = 1.2 + R.next() * 1.5; want.push([g.x + Math.cos(a) * r, g.z + Math.sin(a) * r]); }
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

// ── the crowd's nudge and a knock move the tumble's origin (1.x crowd.js:107-116) ──
{
  const pair = () => {
    const mk = () => world({ x: -5, z: -2, hero: [-5 + 3, -2] , side: 1 });
    const a = mk(), b = mk();
    for (const r of [a, b]) r.g.s.rest = 0.001;
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
  // the knock (a PUSH dash's shove, g.kx/kz): the core folds what it moved into g.nudgedX/Z
  const [r2, k2] = pair();
  k2.g.kz = 4;
  let carried = true, sum = 0, flops = 0;
  for (let i = 0; i < 40 && (r2.g.s.flopping || k2.g.s.flopping); i++) {
    step(r2.w, IDLE); step(k2.w, IDLE);
    sum += k2.g.nudgedZ;
    carried &&= near(k2.g.z - r2.g.z, sum, 1e-12) && near(k2.g.x, r2.g.x, 1e-12);
    flops++;
  }
  check('a knock mid-flop is never thrown away: the tumble carries every step of it', carried && sum > 0.1 && !k2.g.s.flopping, `${sum.toFixed(3)} over ${flops}`);
  wl: {
    // 1.x adds the nudge to `_flopX0` BEFORE it clamps: a push the wall mostly refused still carries the tumble
    const mk = () => { const r = world({ x: 0, z: 0, hero: [0, 6], side: 1 }); const hz = r.w.hz - r.g.r; r.g.z = r.g.px = r.g.pz = hz - 0.2; r.g.s.rest = 0.001; return r; };
    const wl = mk(), wr = mk();
    rolled(wl.w, 0.1, () => step(wl.w, IDLE)); rolled(wr.w, 0.1, () => step(wr.w, IDLE));
    if (!(wl.g.s.flopping && wl.g.s.dirZ === -1 && wl.g.z === wr.g.z)) { check('(both tumbling away from the wall, in step)', false); break wl; }
    wl.g.z += 0.01; wl.g.nudgedZ = 0.06;
    step(wl.w, IDLE); step(wr.w, IDLE);
    check('…the origin takes the unclamped 0.06, not the 0.01 the clamp let through', near(wl.g.s.z0 - wr.g.s.z0, 0.06, 1e-12) && near(wl.g.z - wr.g.z, 0.06, 1e-12), `${wl.g.z - wr.g.z}`);
  }
}

// ── the test dashes: PUSH shoves it, CUT hurts it (TUNING.hero.push / .cut) ──
{
  // PUSH: a dash at it knocks it away from you, and it keeps tumbling in whole faces
  const { w, g } = world({ x: 2.5, z: 0, hero: [0, 0], dashMode: 'push', anchored: false });
  w.hero.mercy = 0; g.s.rest = 0.05;
  step(w, { ...IDLE, mx: 1, dash: true });
  let shoved = w.events.some((e) => e.type === 'shove' && e.id === g.id);
  for (let i = 0; i < 12 && !shoved; i++) { step(w, IDLE); shoved = w.events.some((e) => e.type === 'shove' && e.id === g.id); }
  const kx = g.kx;
  run(w, 50);
  check('a PUSH dash shoves it away from you (a knock along +x)', shoved && kx > 5 && g.x > 6, `kx ${kx.toFixed(2)}, x ${g.x.toFixed(2)}`);
  check('…and it is not hurt by it at dash level 0', g.alive && g.hp === 3);
  // CUT: through it, for 2 hits; a second cut kills it and the brood comes
  const c = world({ x: 2, z: 0, hero: [0, 0], dashMode: 'cut' });
  c.g.s.rest = HOLD;
  step(c.w, { ...IDLE, mx: 1, dash: true }); run(c.w, 12);
  check('a CUT dash passes through it and takes 2 of its 3 hp (TUNING.hero.cut.hits)', c.g.alive && c.g.hp === S.hp - T.hero.cut.hits && c.w.hero.x > c.g.x + 1, `${c.g.hp}`);
  c.w.hero.x = 0; c.w.hero.z = 0;
  run(c.w, 60);
  let kill = null;
  for (let i = 0; i < 4; i++) { step(c.w, { ...IDLE, mx: 1, dash: i === 0 }); kill ||= c.w.events.find((e) => e.type === 'kill' && e.id === c.g.id); }
  check('…the second kills it, by the dash, and a dash kill still broods (4 minis, waiting out the pop)',
    !c.g.alive && kill?.src === 'dash' && kids(c.w).length === 4 && kids(c.w).every((k) => k.state === 'appear'), `${kill?.src} ${kids(c.w).length}`);
  run(c.w, 12);
  check('…the dash that killed it does not cut its brood', kids(c.w).every((k) => k.alive && k.hp === 1));
}

// ── SWIFT and a SIREN's surge speed its flop the same way (api.speed) ──
{
  for (const [o, mult, name] of [[{ affix: 'swift' }, T.variants.swiftSpeed, 'SWIFT (×1.35)'], [{}, 1.6, 'a surge (×1.6)']]) {
    const { w, g } = world({ x: -10, hero: [-7, 0], side: 1, o });
    if (!o.affix) { g.surgeT = 1e9; g.surgeMult = 1.6; }
    g.s.rest = 0.001;
    until(w, () => g.s.flopping);
    until(w, () => !g.s.flopping);
    check(`${name} shortens its cycle: the rest after a flop is its own`, near(g.s.rest, cycleOf(S.speed * mult).rest, 1e-12), `${g.s.rest}`);
  }
}

// ── against 1.x's own code, transcribed literally and fed the same stream ──
// The constructor (enemy.js:701, 1209-1214), _flopMove (1494-1566, exact =
// false) and the update branch (2297-2331), with 1.x's literals rather than
// this port's tuning, run beside the sim. Free bodies read the position the
// swarm forces and the last crowd left (1.x's `ex`) and carry the crowd's
// unclamped nudge into the flop origin (crowd.js:107-116).
{
  const C4 = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
  const oneX = (R, x, z) => ({ x, z, flankSign: R() < 0.5 ? 1 : -1, flopActive: false, flopRest: R() * 0.25, flopDir: C4[Math.floor(R() * 4)] });
  const updateX = (e, R, P, ex, ez, spd, rm, halfX, halfZ) => {
    e.x = ex; e.z = ez;
    const ddx = P.x - ex, ddz = P.z - ez, dist = Math.hypot(ddx, ddz) || 0.001;
    const ux = ddx / dist, uz = ddz / dist;
    const ang = (dist > 5) ? e.flankSign * 0.9 : e.flankSign * 0.3;
    const c = Math.cos(ang), s = Math.sin(ang);
    const wantX = ux * c - uz * s, wantZ = ux * s + uz * c;
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
  // one body, anchored: its own step is all that moves it
  let solo = true, flops = 0, sides = new Set();
  for (const seed of [1, 3, 5, 7, 9, 12]) {
    if (!solo) break;
    for (const [sm, rm, variant] of [[1, 1, 'normal'], [1.35 * 1.2, 1.2, 'elite']]) {
      const w = createWorld({ seed }); w.director = { step() {} }; w.hero.lives = 1e9; w.hero.mercy = 1e9;
      const R = makeRng(0); R.state = w.rng.state;
      const x = (seed % 7) * 3 - 9, z = (seed % 3) * 3 - 3;
      const g = api.spawn(w, 'redd', x, z, { speedMult: sm, variant }); g.anchored = true;
      const e = oneX(R.next, x, z);
      sides.add(e.flankSign);
      for (let i = 0; i < 900 && solo; i++) {
        const t = i * dt, ex = e.x, ez = e.z, was = e.flopActive;
        step(w, { ...IDLE, mx: Math.cos(t * 0.7 + seed), mz: Math.sin(t * 1.1) * 0.8 });
        updateX(e, R.next, { x: w.hero.x, z: w.hero.z }, ex, ez, 1.9 * sm, rm, w.hx, w.hz);
        if (!was && e.flopActive) flops++;
        solo &&= near(g.x, e.x, 1e-9) && near(g.z, e.z, 1e-9) && g.s.flopping === e.flopActive && g.s.flankSign === e.flankSign;
      }
    }
  }
  check(`alone, it moves exactly as 1.x's code does (12 runs of 15 s, elites too: ${flops} flops, both flank sides)`, solo && flops > 200 && sides.size === 2);
  // five free bodies: the swarm forces, the crowd and its clamp at the walls
  const entry = new Map(), exit = new Map(), orig = behaviour.step;
  behaviour.step = function (w, g, d, a) { entry.set(g.id, { x: g.x, z: g.z }); orig.call(this, w, g, d, a); exit.set(g.id, { x: g.x, z: g.z }); };
  let crowd = true, clamped = 0;
  try {
    for (let seed = 1; seed <= 4 && crowd; seed++) {
      const w = createWorld({ seed }); w.director = { step() {} }; w.hero.lives = 1e9; w.hero.mercy = 1e9;
      const R = makeRng(0); R.state = w.rng.state;
      const pairs = [];
      for (let k = 0; k < 5; k++) {
        const x = -14 + k * 1.6 + seed, z = -6 + (k % 2) * 1.4 + seed;
        pairs.push({ g: api.spawn(w, 'redd', x, z), e: oneX(R.next, x, z) });
      }
      for (let i = 0; i < 1200 && crowd; i++) {
        const t = i * dt;
        step(w, { ...IDLE, mx: Math.cos(t * 0.25 + seed), mz: Math.sin(t * 0.4) });   // you sweep the arena wall to wall
        for (const { g, e } of pairs) {
          const en = entry.get(g.id), out = exit.get(g.id);
          updateX(e, R.next, { x: w.hero.x, z: w.hero.z }, en.x, en.z, 1.9, 1, w.hx, w.hz);
          crowd &&= near(out.x, e.x, 1e-9) && near(out.z, e.z, 1e-9) && g.s.flopping === e.flopActive;
          if (Math.abs(g.x) >= w.hx - g.r - 1e-12 || Math.abs(g.z) >= w.hz - g.r - 1e-12) clamped++;
          if (e.flopActive) { e.x0 += g.nudgedX; e.z0 += g.nudgedZ; }    // 1.x's crowd, after the update
        }
      }
    }
  } finally { behaviour.step = orig; }
  check(`in a crowd, by the walls, it tumbles exactly as 1.x's code does (the origin takes the crowd's unclamped nudge; ${clamped} steps at a wall)`, crowd && clamped > 20, `${clamped}`);
}

// ── determinism ─────────────────────────────────────────────────────
{
  const trail = (seed) => {
    const { w, g } = world({ seed, x: -9, z: 5, hero: [6, -3], anchored: false });
    const out = [];
    for (let i = 0; i < 900; i++) { step(w, IDLE); out.push(`${g.x.toFixed(9)},${g.z.toFixed(9)},${g.s.dirX},${g.s.dirZ}`); }
    api.kill(w, g, 'hero');
    out.push(kids(w).map((c) => `${c.x.toFixed(9)},${c.z.toFixed(9)}`).join('|'));
    return out.join(';');
  };
  check('a run replays from its seed, brood and all', trail(11) === trail(11));
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
  const ctx = { THREE, TSL, gelMaterial, GEL_TIME, geo: {}, T, scene, S, kind: 'redd' };
  const view = () => {
    const v = { kind: 'redd', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, hit: 0, dyingT: 0 };
    Object.assign(v, look.build({ ...ctx }));
    v.squash.add(v.body); v.root.add(v.squash); look.reset(v);
    return v;
  };
  const v = view();
  const geo = v.body.geometry, bb = geo.boundingBox;
  check('build: its own body, own: true, one gel material in red, the cube family, unit radius (1.x makeSatinMat(color, \'cube\', …))',
    v.own === true && made.length === 1 && made[0].hex === 0xff2211 && made[0].fam === 'cube' && made[0].r === 1 && v.mat === made[0].m);
  check('the body is 1.x\'s RoundedBox: 1.8 radii a side (1.35 at 0.75), centred', near(bb.min.x, -0.9, 1e-6) && near(bb.max.y, 0.9, 1e-6) && near(bb.min.z, -0.9, 1e-6));
  const c = S.look.corner / S.radius, inner = 0.9 - c, pos = geo.attributes.position, nor = geo.attributes.normal;
  let onSurface = true, smooth = true;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const qx = Math.max(Math.abs(x) - inner, 0), qy = Math.max(Math.abs(y) - inner, 0), qz = Math.max(Math.abs(z) - inner, 0);
    const l = Math.hypot(qx, qy, qz);
    onSurface &&= near(l, c, 1e-6);
    if (l > 1e-6) smooth &&= near(nor.getX(i), Math.sign(x) * qx / l, 1e-6) && near(nor.getY(i), Math.sign(y) * qy / l, 1e-6);
  }
  check('every vertex sits the corner radius (0.18 at r 0.75) off the inner box, with the corner\'s own normal: rounded, smooth', onSurface && smooth && pos.count > 2000);
  check('every view shares the one geometry', view().body.geometry === geo);
  v.mat.gel.hit.value = 1; v.mat.gel.tear.value = 1; v.mat.gel.hitDir.value.set(1, 0);
  check('the core\'s ripple and tear land on stand-ins: the cube\'s own stay at rest (1.x writes them for blobs only)',
    made[0].m.gel !== v.gel && v.gel.hit.value === 0 && v.gel.tear.value === 0 && v.mat.gel.wobble === v.gel.wobble);

  const Wd = { time: 0 };
  const g = { r: 0.75, sq: 1, tell: 0, flash: 0, affix: null, s: { tumble: false } };
  const box = () => { v.root.updateMatrixWorld(true); return new THREE.Box3().setFromObject(v.body, true); };
  v.squash.scale.set(0.5, 2, 0.5);
  look.update(v, g, Wd, 0, 1);
  check('at rest: r × the box, upright, unturned, its centre at L = 0.675 and its bottom on the floor', near(v.body.scale.x, 0.75) && near(v.body.scale.y, 0.75) && near(v.body.position.y, L0, 1e-12)
    && v.body.quaternion.equals(new THREE.Quaternion()) && v.squash.scale.x === 1 && v.squash.scale.y === 1 && near(box().min.y, 0, 1e-6));
  g.sq = 0.7; v.phase = 0.4;
  const t = 1.9, br = 0.10 * Math.sin(t * 2.4 + 0.4), sx = 1 / Math.sqrt(0.7);
  look.update(v, g, Wd, t, 1);
  check('squashed and breathing: (sx·(1 − b/2), sq·(1 + b), sx·(1 − b/2)) × r (1.x enemy.js:2770-2777)',
    near(v.body.scale.x, 0.75 * sx * (1 - br / 2), 1e-12) && near(v.body.scale.y, 0.75 * 0.7 * (1 + br), 1e-12) && near(v.body.scale.z, v.body.scale.x, 1e-15));
  const sb = box();
  check('…about its centre, as 1.x\'s mesh origin is: a landing squash lifts its bottom face off the floor', near((sb.min.y + sb.max.y) / 2, L0, 1e-6) && sb.min.y > 0.05, `${sb.min.y}`);
  g.r = 0.9; g.sq = 1; v.phase = 0; look.update(v, g, Wd, 0, 1);
  check('an elite is drawn at its own radius, centre at 0.9·r', near(v.body.scale.x, 0.9) && near(v.body.position.y, 0.81, 1e-12));
  g.r = 0.75; look.update(v, g, Wd, 0, 0.5);
  check('it grows in with the core\'s swell (the view\'s alone: TUNING.gel.swell)', near(v.body.scale.x, 0.375) && near(box().min.y, 0, 1e-6));

  // the tumble: 1.x's transform — centre D·sin(ang) up, turned p·90° about (dz, 0, −dx)
  g.r = 0.75; g.sq = 0.6;
  let planted = true, exact = true, flat = true, top = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    Object.assign(g.s, { tumble: true, x0: 2, z0: -1, dirX: dx, dirZ: dz });
    for (const along of [0, 0.2, 0.45, 0.675, 0.9, 1.2, 1.35]) {
      v.root.position.set(2 + dx * along - dz * 0.03, 0, -1 + dz * along + dx * 0.03);   // a crowd nudge across the line changes nothing
      look.update(v, g, Wd, 0, 1);
      v.root.updateMatrixWorld(true);
      const ang = Math.acos(Math.max(-1, Math.min(1, (along - L0) / D0))), p = (135 * Math.PI / 180 - ang) / (Math.PI / 2);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dz, 0, -dx).normalize(), p * Math.PI / 2);
      exact &&= near(v.body.position.y, D0 * Math.sin(ang), 1e-9) && Math.abs(v.body.quaternion.dot(q)) > 1 - 1e-12;
      const edge = new THREE.Vector3(dx * 0.9, -0.9, dz * 0.9).applyMatrix4(v.body.matrixWorld);
      planted &&= near(edge.y, 0, 1e-9) && near(edge.x + dz * 0.03, 2 + dx * L0, 1e-9) && near(edge.z - dx * 0.03, -1 + dz * L0, 1e-9);
      flat &&= near(v.body.scale.x, 0.75) && near(v.body.scale.y, 0.75) && v.squash.scale.y === 1;
      if (along === 0.675 && dx === 1) top = v.body.position.y;
    }
  }
  check('mid-flop: 1.x\'s transform on all four cardinals', exact);
  check('…pivoting on its planted leading bottom edge', planted);
  check('…rigid and unsquashed (1.x `scale(rm)` mid-tumble), and up to D = 0.955 at the top', flat && near(top, D0, 1e-9));
  // no tell of its own: the core's glow is left alone
  Object.assign(g.s, { tumble: false }); g.sq = 1;
  v.mat.emissive.setHex(0x123456); look.update(v, { ...g, tell: 1 }, Wd, 0.3, 1);
  check('it has no strobe of its own: the core\'s glow is left as the core set it', v.mat.emissive.getHex() === 0x123456);

  // the kill: flat where it popped, swelling about its own centre (enemy.js:3013-3029, 2967-2984)
  Object.assign(g.s, { tumble: true, x0: 0, z0: 0, dirX: 0, dirZ: 1 }); g.sq = 1;
  v.root.position.set(0, 0, 0.5);
  look.update(v, g, Wd, 0, 1);
  const popY = v.body.position.y;
  v.dyingT = 0.2; v.root.scale.setScalar(1.6);
  v.root.updateMatrixWorld(true);
  v.body.onBeforeRender();
  v.root.updateMatrixWorld(true);
  const centre = new THREE.Vector3().setFromMatrixPosition(v.body.matrixWorld);
  check('killed mid-flop it snaps flat (1.x destroy), unsquashed', v.body.quaternion.equals(new THREE.Quaternion()) && near(v.body.scale.x, 0.75));
  check('…and swells about its own centre, which stays at the height it popped at', near(centre.y, popY, 1e-9) && popY > L0, `${centre.y} ${popY}`);
  v.dyingT = 0; v.root.scale.setScalar(1); look.reset(v);
  Object.assign(g.s, { tumble: false });
  look.update(v, g, Wd, 0, 1);
  check('a pooled view comes back upright and live', !v.popped && near(v.body.position.y, L0, 1e-12) && v.body.quaternion.equals(new THREE.Quaternion()));
}

if (failed) { console.log(`✗ redd: ${failed} of ${failed + passed} checks failed`); process.exit(1); }
console.log(`✔ redd: ${passed} checks`);
