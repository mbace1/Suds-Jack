#!/usr/bin/env node
// reddmini.mjs — REDD MINI's own checks, in bare node: 1.x's numbers
// (enemy.js:588, 659-660, 738, 1209-1214, 1486-1566, 1682, 2297-2303, 2331,
// 2770-2777, 2970, 2992-3000, 3007, 3035-3037; tuning.js:56-62, 305, 496-497;
// crowd.js:107-116; main.js:2414, 3558, 5034, 7489, 7903, 7950-7953, 9350-9371,
// 10367-10369, 10586-10620, 10636, 10886-10889), asserted against the sim
// stepping on its fixed 1/60 s,
// and its look against a real three. Its flop is also checked against an
// ORACLE: 1.x's own code, transcribed with 1.x's literals and fed the same
// random stream.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=160';
import { TUNING as T } from '../../js/tuning.js?v=160';
import { waveScale } from '../../js/sim/director/arcade.js?v=160';
import { makeRng } from '../../js/sim/rng.js?v=160';
import behaviour from '../../js/sim/species/reddmini.js?v=160';
import look from '../../js/render/looks/reddmini.js?v=160';
import reddLook from '../../js/render/looks/redd.js?v=160';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

const S = T.species.reddmini, F = S.flop, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const [KS, CS] = T.gel.sq.cube;
const L0 = F.halfExtent * S.radius, D0 = L0 * Math.SQRT2;
const HOLD = 1e9;

// a world with nothing in it but one REDD MINI (spawned as 1.x spawns it, a
// child: active at once), the hero where asked and never out of lives;
// anchored (no swarm forces, no crowd) unless asked
function world({ seed = 1, mode = 'arcade', x = 0, z = 0, hero = [12, 0], o = {}, anchored = true } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  const h = w.hero; h.x = h.px = hero[0]; h.z = h.pz = hero[1];
  const g = api.spawn(w, 'reddmini', x, z, { child: true, ...o });
  g.anchored = anchored;
  return { w, g };
}
const stepsDown = (from) => { let t = from, n = 0; while (!(t <= 0)) { t -= dt; n++; } return n; };
const stepsUp = (dur) => { let t = 0, n = 0; while (!(Math.min(1, t / dur) >= 1)) { t += dt; n++; } return n; };
const sprung = (sq, sqV, kick) => (sqV - (sq - 1) * KS) * CS + kick;
const cycleOf = (spd) => { const L = F.halfExtent * S.radius, c = (2 * L) / Math.max(spd, F.minSpeed), f = Math.min(F.timeMax, c * F.shareOfCycle); return { L, stride: 2 * L, cycle: c, flop: f, rest: Math.max(F.restMin, c - f) }; };
const run = (w, n, input = IDLE) => { for (let i = 0; i < n; i++) step(w, input); };
const rolled = (w, r, fn) => { const nx = w.rng.next; let used = false; w.rng.next = () => (used ? nx() : (used = true, r)); try { fn(); } finally { w.rng.next = nx; } };
const minis = (w) => w.gels.filter((o) => o.kind === 'reddmini');

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.32, hp 1, speed 3.2, red 0xff4433, no gun (1.x enemy.js:588)',
    S.radius === 0.32 && S.hp === 1 && S.speed === 3.2 && S.color === 0xff4433 && S.bulletColor === null && S.fireInterval === null);
  check('a rounded cube, SCHOOL, hurts to touch in classic (MELEE_TYPES), not a biter (1.x tuning.js:305, 496-497; main.js:2414)',
    S.family === 'cube' && S.role === 'SCHOOL' && S.contact === true && S.revenge === null);
  check('the death screen calls it 1.x\'s "red mini" (main.js:5034)', S.deathLabel === 'red mini');
  const R = T.movement.roles.SCHOOL;
  check('SCHOOL is 1.x\'s: dodge 0.9, flock 1.0, current 1.0, no weave', R.dodge === 0.9 && R.flock === 1.0 && R.current === 1.0 && R.weave === 0);
  const P = T.species.redd.flop;
  check('its flop table is every cube\'s (1.x tuning.js:56-62, enemy.js:1213, 1497-1566): REDD\'s, number for number',
    Object.keys(P).length === Object.keys(F).length && Object.keys(P).every((k) => JSON.stringify(P[k]) === JSON.stringify(F[k])));
  check('…which at r 0.32 is L 0.288, a face of 0.576 a flop, a 0.18 s cycle at 3.2 u/s (0.117 tipping, 0.063 resting)',
    near(L0, 0.288, 1e-12) && near(cycleOf(S.speed).cycle, 0.18, 1e-12) && near(cycleOf(S.speed).flop, 0.117, 1e-12) && near(cycleOf(S.speed).rest, 0.063, 1e-12));
  check('its death throws 2 + ⌊U·2⌋ chunks of 0.12, carried for the core (1.x enemy.js:3035-3037)',
    S.deathChunks.count[0] === 2 && S.deathChunks.count[1] === 3 && S.deathChunks.size === 0.12);
  const lk = S.look;
  check('the look: RoundedBox corner 0.18, 4 segments (enemy.js:738); breath 0.10 at 2.4 rad/s, half across (tuning.js:61, enemy.js:2773-2775)',
    lk.corner === 0.18 && lk.segments === 4 && lk.breatheAmp === 0.10 && lk.breatheRate === 2.4 && lk.breatheXZ === 0.5 && lk.sqFloor === 0.1);
  const src = readFileSync(new URL('../../js/sim/species/reddmini.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('no special hits, no brood of its own, the core\'s circle and contact', !behaviour.onHit && !behaviour.onKill && !behaviour.hitTest && !behaviour.touches);
}

// ── its starting state (1.x enemy.js:1209-1214) ──────────────────────
{
  const rests = [], dirs = new Set();
  let fresh = true;
  for (let seed = 1; seed <= 300; seed++) {
    const { g } = world({ seed });
    rests.push(g.s.rest); dirs.add(`${g.s.dirX},${g.s.dirZ}`);
    fresh &&= g.state === 'active' && g.s.flopping === false && near(g.s.lift, L0, 1e-12) && g.s.flankSign === undefined;
  }
  check('a child is active at once, at rest on a face; it has no flank side', fresh);
  check('the first rest is in [0, 0.25) and spread over it', rests.every((t) => t >= 0 && t < 0.25) && Math.min(...rests) < 0.01 && Math.max(...rests) > 0.24);
  check('its first heading is any of the four cardinals', dirs.size === 4);
}

// ── straight at you (1.x enemy.js:2302-2303 "default: direct (YELA, minis)") ──
{
  const pick = (hero, r = 0.5) => {
    const { w, g } = world({ x: 0, z: 0, hero });
    g.s.rest = 0.001;
    rolled(w, r, () => step(w, IDLE));
    return g.s.flopping ? `${g.s.dirX},${g.s.dirZ}` : 'rest';
  };
  check('far off along +x (where a REDD would cross your line), it comes straight: +x', pick([12, 0.5]) === '1,0' && pick([12, -0.5]) === '1,0');
  check('the larger axis of the bearing wins: (3, 2) +x, (2, 3) +z, (−2, −3) −z, (−3, 1) −x',
    pick([3, 2]) === '1,0' && pick([2, 3]) === '0,1' && pick([-2, -3]) === '0,-1' && pick([-3, 1]) === '-1,0');
  check('a dead diagonal goes along z (1.x\'s strict `>`)', pick([2, 2]) === '0,1' && pick([-2, -2]) === '0,-1');
  check('the roll: toward you below 0.70; its last heading to 0.90', (() => {
    const { w, g } = world({ x: 0, z: 0, hero: [3, 0] }); g.s.rest = 0.001; g.s.dirX = 0; g.s.dirZ = -1;
    rolled(w, 0.75, () => step(w, IDLE)); return g.s.dirX === 0 && g.s.dirZ === -1;
  })() && pick([3, 0], 0.699) === '1,0');
  let toward = 0, n = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const { w, g } = world({ seed, x: -10, z: 0, hero: [10, 0] });
    g.s.rest = 0.001; step(w, IDLE); n++;
    if (g.s.dirX === 1) toward++;
  }
  check('its first flop comes at you about 3 times in 4 (0.70 + 0.30·¼)', toward / n > 0.70 && toward / n < 0.85, `${toward}/${n}`);
}

// ── one flop (1.x enemy.js:1542-1565) ────────────────────────────────
{
  const { w, g } = world({ x: -4, z: 1, hero: [2, 1.2] });
  g.s.rest = 0.001;
  const { L, stride, flop, rest } = cycleOf(S.speed);
  let x0 = null, kinematic = true, lifted = 0, steps = 0, land = null;
  for (let i = 0; i < 30; i++) {
    const pre = { sq: g.sq, sqV: g.sqV };
    rolled(w, 0.5, () => step(w, IDLE));
    if (x0 == null && g.s.flopping) x0 = { x: g.s.x0, z: g.s.z0, dx: g.s.dirX, dz: g.s.dirZ };
    if (!g.s.tumble) { if (x0) break; continue; }
    steps++;
    const p = Math.min(1, g.s.t / g.s.dur), ang = (135 - 90 * p) * Math.PI / 180;
    const disp = p >= 1 ? stride : L + D0 * Math.cos(ang);
    kinematic &&= near(g.x, x0.x + x0.dx * disp, 1e-12) && near(g.z, x0.z + x0.dz * disp, 1e-12) && near(g.s.lift, p >= 1 ? L : D0 * Math.sin(ang), 1e-12);
    lifted = Math.max(lifted, g.s.lift);
    if (!g.s.flopping) land = { sqV: g.sqV, rest: g.s.rest, pre };
  }
  check('it flops +x at you, from where it stood', x0 && x0.dx === 1 && x0.dz === 0 && x0.x === -4 && x0.z === 1);
  check('the tip lasts 0.65 × the 0.18 s cycle = 0.117 s, on 1.x\'s frame arithmetic (8 steps)', steps === stepsUp(flop) && steps === 8 && near(g.s.dur, 0.117, 1e-12), `${steps}`);
  check('each step the centre sits L + D·cos(ang) along the heading and D·sin(ang) up', kinematic);
  check('it lifts to D = 0.288·√2 = 0.407', near(lifted, D0, 2e-2) && lifted <= D0 + 1e-12, `${lifted}`);
  check('a flop advances one face, 0.576', near(g.x - x0.x, 0.576, 1e-12));
  check('the landing: −0.32 to the squash spring, then a 0.063 s rest (4 steps)', land && near(land.sqV, sprung(land.pre.sq, land.pre.sqV, F.landSquish), 1e-12) && near(land.rest, rest, 1e-12) && stepsDown(rest) === 4);
}

// ── the cadence: one face a cycle, at the wave's speed ───────────────
for (const wave of [1, 4, 10]) {
  const mult = waveScale(wave).speedMult, c = cycleOf(S.speed * mult);
  const { w, g } = world({ x: -16, z: 0, hero: [17, 0], o: { speedMult: mult } });
  const lands = [];
  for (let i = 1; i <= 360; i++) {
    w.hero.x = g.x + 3; w.hero.z = g.z;
    const was = g.s.flopping;
    step(w, IDLE);
    if (was && !g.s.flopping) lands.push(i);
    if (g.x > 14) break;
  }
  const gaps = lands.slice(1).map((v, k) => v - lands[k]);
  const want = stepsDown(c.rest) + stepsUp(c.flop) - 1;
  check(`wave ${wave} (×${mult.toFixed(3)}): every cycle is one rest and one flop, ${want} steps`, gaps.length >= 8 && gaps.every((k) => k === want), gaps.join(' '));
}

// ── its touch hurts; one hit kills it, and it leaves nothing behind ───
{
  const { w, g } = world({ x: 0.81, z: 0, hero: [0, 0] });
  g.s.rest = HOLD; w.hero.lives = 3;
  step(w, IDLE);
  check('standing within r + 0.5 = 0.82 of it hurts (1.x MELEE_TYPES)', w.hero.lives === 2 && w.killedBy === 'reddmini');
  const { w: w2, g: g2 } = world({ x: 0.83, z: 0, hero: [0, 0] });
  g2.s.rest = HOLD; w2.hero.lives = 3;
  step(w2, IDLE);
  check('…0.83 off does not', w2.hero.lives === 3);
  // spawned outright, not as a brood — 1.x did that too: a GAUNDROP generator
  // pours REDD MINIs from level 3 (main.js:7489, poured by `new Enemy` at
  // 3558), KAIKKI IRTI's streets roll one 10% of the time (7903) and
  // TOKOTRON's waves 2 and 5 carry 4 and 6 (7950-7953). It is the same body
  // from its first step: 1.x had no appear phase — a body was a live Enemy
  // from its constructor (enemy.js:659-660),
  // built inside the frame (main.js:9350-9371) ahead of that frame's update
  // (10367-10369), its bullet pass (10636) and its contact pass (10886-10889).
  // 2.0 used to hold it 0.3 s (18 steps) inert and untouchable first; it does not now
  const { w: o1, g: og1 } = world({ x: 0.81, z: 0, hero: [0, 0], o: { child: false } });
  og1.s.rest = HOLD; o1.hero.lives = 3;
  step(o1, IDLE);
  check('spawned outright (not a brood), it hurts within 0.82 on its very first step', !og1.child && og1.state === 'active' && o1.hero.lives === 2 && o1.killedBy === 'reddmini', `lives ${o1.hero.lives}`);
  const { w: o2, g: og2 } = world({ x: 10, z: 0, hero: [0, 0], o: { child: false } });
  og2.s.rest = HOLD;
  api.heroBullet(o2, og2.x - 0.4, og2.z, 0);
  step(o2, IDLE);
  check('…and one bullet kills it on its very first step', !og2.alive && o2.events.some((e) => e.type === 'kill' && e.id === og2.id));
  for (const mode of ['arcade', 'hardcade']) {
    const r = world({ mode, x: 10, z: 0, hero: [0, 0] });
    r.w.wave = 6; r.g.s.rest = HOLD;
    api.heroBullet(r.w, r.g.x - 0.4, r.g.z, 0);
    step(r.w, IDLE);
    const kills = r.w.events.filter((e) => e.type === 'kill' && e.kind === 'reddmini');
    check(`${mode}: one bullet kills it`, !r.g.alive && kills.length === 1);
    check(`${mode}: a small body: no shockwave (r 0.32 < 0.75)`, kills[0]?.big === false && kills[0].color === 0xff4433);
    check(`${mode}: no brood, and its corpse fires nothing (not a biter)`, r.w.gels.length === 0 && r.w.bullets.filter((b) => !b.hero).length === 0 && !r.w.events.some((e) => e.type === 'revenge'));
  }
}

// ── born from a REDD, it rushes you (1.x main.js:10586-10620) ─────────
{
  const w = createWorld({ seed: 2 }); w.director = { step() {} }; w.hero.lives = 1e9; w.hero.mercy = 1e9;
  w.hero.x = w.hero.px = 10; w.hero.z = w.hero.pz = 0;
  const p = api.spawn(w, 'redd', -6, 0, { intervalMult: 0.835 });
  api.kill(w, p, 'hero');
  const b = minis(w);
  check('a REDD of wave 4 breaks into 8 of them, waiting out its pop', b.length === 8 && b.every((c) => c.state === 'appear'));
  run(w, stepsDown(0.28));
  check('…out when the pop ends', b.every((c) => c.state === 'active'));
  // you invincible and still, 16 off: the first touch, then the whole brood packed round you
  // (the crowd keeps them a pad apart, so only the first few can stand on you at once)
  const d0 = Math.max(...b.map((c) => Math.hypot(c.x - 10, c.z)));
  let first = -1, inside = true;
  for (let i = 1; i <= 60 * 10; i++) {
    step(w, IDLE);
    for (const c of b) {
      if (first < 0 && Math.hypot(c.x - w.hero.x, c.z - w.hero.z) < c.r + T.gel.contactRadius) first = i;
      inside &&= Math.abs(c.x) <= w.hx - c.r + 1e-9 && Math.abs(c.z) <= w.hz - c.r + 1e-9;
    }
  }
  const far = Math.max(...b.map((c) => Math.hypot(c.x - w.hero.x, c.z - w.hero.z)));
  check(`the brood rushes you from ${d0.toFixed(1)} off: the first touches you inside 6 s`, first > 0 && first * dt < 6, `${(first * dt).toFixed(2)} s`);
  check('…and inside 10 s all eight are packed round you, within 3 u', far < 3, `${far.toFixed(2)}`);
  check('…inside the walls', inside);
}

// ── the swarm forces stick only while it rests ────────────────────────
{
  const { w, g } = world({ seed: 4, x: -6, z: 3, hero: [8, -2], anchored: false });
  api.spawn(w, 'reddmini', -6, 4, { child: true });          // a schoolmate to flock with
  let restMoved = 0, flopExact = true, rests = 0;
  for (let i = 0; i < 300; i++) {
    const was = g.s.flopping, px = g.x, pz = g.z;
    step(w, IDLE);
    if (!was && !g.s.tumble) { rests++; restMoved = Math.max(restMoved, Math.hypot(g.x - px, g.z - pz)); }
    if (g.s.tumble && g.s.flopping) {
      const ang = (135 - 90 * Math.min(1, g.s.t / g.s.dur)) * Math.PI / 180, disp = L0 + D0 * Math.cos(ang);
      // where its own step put it: the crowd's nudge (between the pair) lands after it
      flopExact &&= near(g.x - g.nudgedX, g.s.x0 + g.s.dirX * disp, 1e-12) && near(g.z - g.nudgedZ, g.s.z0 + g.s.dirZ * disp, 1e-12);
    }
  }
  check('resting, a SCHOOL body is carried by the swarm forces', rests > 50 && restMoved > 0.005, `${restMoved}`);
  check('flopping, its position is written from the flop\'s origin (the crowd\'s nudge after it)', flopExact);
}

// ── a knock mid-flop is carried (the PUSH dash) ──────────────────────
{
  const mk = () => world({ x: -5, z: -2, hero: [-2, -2] });
  const ref = mk(), k = mk();
  for (const r of [ref, k]) r.g.s.rest = 0.001;
  for (let i = 0; i < 3; i++) { rolled(ref.w, 0.5, () => step(ref.w, IDLE)); rolled(k.w, 0.5, () => step(k.w, IDLE)); }
  check('(both mid-flop, in step)', ref.g.s.flopping && k.g.s.flopping && ref.g.x === k.g.x);
  k.g.kz = 6;
  let carried = true, sum = 0;
  for (let i = 0; i < 20 && (ref.g.s.flopping || k.g.s.flopping); i++) {
    step(ref.w, IDLE); step(k.w, IDLE);
    sum += k.g.nudgedZ;
    carried &&= near(k.g.z - ref.g.z, sum, 1e-12);
  }
  check('a knock mid-flop is carried by the tumble, every step of it', carried && sum > 0.05, `${sum}`);
  // the real PUSH dash: small and light, it is thrown hard (force × heavy / r)
  const { w, g } = world({ x: 1.6, z: 0, hero: [0, 0], anchored: false });
  w.dashMode = 'push'; g.s.rest = HOLD;
  let shoved = false;
  for (let i = 0; i < 12 && !shoved; i++) { step(w, { ...IDLE, mx: 1, dash: i === 0 }); shoved = w.events.some((e) => e.type === 'shove' && e.id === g.id); }
  check('a PUSH dash throws it (a light body flies: force × heavy / r)', shoved && g.kx > 25, `${g.kx}`);
}

// ── against 1.x's own code, transcribed literally and fed the same stream ──
{
  const C4 = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
  const oneX = (R, x, z) => ({ x, z, flopActive: false, flopRest: R() * 0.25, flopDir: C4[Math.floor(R() * 4)] });
  const updateX = (e, R, P, ex, ez, spd, halfX, halfZ) => {
    e.x = ex; e.z = ez;
    const ddx = P.x - ex, ddz = P.z - ez, dist = Math.hypot(ddx, ddz) || 0.001;
    const wantX = ddx / dist, wantZ = ddz / dist;
    const radius = 0.32, L = radius * 0.9, D = L * Math.SQRT2, stride = 2 * L, cycle = stride / Math.max(spd, 0.01);
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
  let solo = true, flops = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    for (const sm of [1, 1.35 * 1.2]) {
      const w = createWorld({ seed }); w.director = { step() {} }; w.hero.lives = 1e9; w.hero.mercy = 1e9;
      const R = makeRng(0); R.state = w.rng.state;
      const x = (seed % 7) * 3 - 9, z = (seed % 3) * 3 - 3;
      const g = api.spawn(w, 'reddmini', x, z, { child: true, speedMult: sm }); g.anchored = true;
      const e = oneX(R.next, x, z);
      for (let i = 0; i < 900 && solo; i++) {
        const t = i * dt, ex = e.x, ez = e.z, was = e.flopActive;
        step(w, { ...IDLE, mx: Math.cos(t * 0.25 + seed), mz: Math.sin(t * 0.4) });
        updateX(e, R.next, { x: w.hero.x, z: w.hero.z }, ex, ez, 3.2 * sm, w.hx, w.hz);
        if (!was && e.flopActive) flops++;
        solo &&= near(g.x, e.x, 1e-9) && near(g.z, e.z, 1e-9) && g.s.flopping === e.flopActive;
      }
    }
  }
  check(`alone, it moves exactly as 1.x's code does (12 runs of 15 s: ${flops} flops)`, solo && flops > 800);
  // spawned outright, not as a brood (1.x main.js:3558, 7903, 7950-7953): the
  // same body on 1.x's own frames from its first step. Its first rest
  // (U·0.25, enemy.js:1213) counts down from its first update, the frame it
  // was built in (main.js:9350-9371, then 10367-10369): `_flopRest -= dt;
  // if (_flopRest > 0) return` (enemy.js:1505-1506), so its first flop starts
  // on the step that takes the rest to 0 — not 0.3 s (18 steps) later, as
  // 2.0's old appear had it
  let outright = true, onTime = true, oflops = 0;
  for (const seed of [7, 8, 9, 10, 11, 12]) {
    const w = createWorld({ seed }); w.director = { step() {} }; w.hero.lives = 1e9; w.hero.mercy = 1e9;
    const R = makeRng(0); R.state = w.rng.state;
    const x = (seed % 5) * 3 - 6, z = (seed % 4) * 2 - 3;
    const g = api.spawn(w, 'reddmini', x, z); g.anchored = true;
    const e = oneX(R.next, x, z);
    let due = 0, left = e.flopRest;
    do { left -= dt; due++; } while (left > 0);
    let first = -1;
    for (let i = 0; i < 600 && outright; i++) {
      const t = i * dt, ex = e.x, ez = e.z, was = e.flopActive;
      step(w, { ...IDLE, mx: Math.cos(t * 0.25 + seed), mz: Math.sin(t * 0.4) });
      updateX(e, R.next, { x: w.hero.x, z: w.hero.z }, ex, ez, 3.2, w.hx, w.hz);
      if (!was && e.flopActive) oflops++;
      if (first < 0 && g.s.flopping) first = i + 1;
      outright &&= !g.child && near(g.x, e.x, 1e-9) && near(g.z, e.z, 1e-9) && g.s.flopping === e.flopActive;
    }
    onTime &&= first === due;
  }
  check(`spawned outright, it moves exactly as 1.x's code does from its first step, its first flop on 1.x's frame (6 runs of 10 s: ${oflops} flops)`, outright && onTime && oflops > 250, `${outright} ${onTime}`);
  // a brood of eight free bodies: the swarm forces, the flock, the crowd and its clamp
  const entry = new Map(), exit = new Map(), orig = behaviour.step;
  behaviour.step = function (w, g, d, a) { entry.set(g.id, { x: g.x, z: g.z }); orig.call(this, w, g, d, a); exit.set(g.id, { x: g.x, z: g.z }); };
  let crowd = true, clamped = 0, nudged = 0;
  try {
    for (let seed = 1; seed <= 3 && crowd; seed++) {
      const w = createWorld({ seed }); w.director = { step() {} }; w.hero.lives = 1e9; w.hero.mercy = 1e9;
      const R = makeRng(0); R.state = w.rng.state;
      const pairs = [];
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2, x = -6 + Math.cos(a) * 1.6, z = Math.sin(a) * 1.6;
        pairs.push({ g: api.spawn(w, 'reddmini', x, z, { child: true }), e: oneX(R.next, x, z) });
      }
      for (let i = 0; i < 900 && crowd; i++) {
        const t = i * dt;
        step(w, { ...IDLE, mx: Math.cos(t * 0.25 + seed), mz: Math.sin(t * 0.4) });
        for (const { g, e } of pairs) {
          const en = entry.get(g.id), out = exit.get(g.id);
          updateX(e, R.next, { x: w.hero.x, z: w.hero.z }, en.x, en.z, 3.2, w.hx, w.hz);
          crowd &&= near(out.x, e.x, 1e-9) && near(out.z, e.z, 1e-9) && g.s.flopping === e.flopActive;
          if (Math.abs(g.x) >= w.hx - g.r - 1e-12 || Math.abs(g.z) >= w.hz - g.r - 1e-12) clamped++;
          if (e.flopActive) { e.x0 += g.nudgedX; e.z0 += g.nudgedZ; if (g.nudgedX || g.nudgedZ) nudged++; }
        }
      }
    }
  } finally { behaviour.step = orig; }
  check(`a brood of eight, in a crowd and at the walls, tumbles exactly as 1.x's code does (${nudged} nudged tumbles, ${clamped} steps at a wall)`, crowd && nudged > 50 && clamped > 20, `${nudged} ${clamped}`);
}

// ── determinism ─────────────────────────────────────────────────────
{
  const trail = (seed) => {
    const { w, g } = world({ seed, x: -9, z: 5, hero: [6, -3], anchored: false });
    const out = [];
    for (let i = 0; i < 600; i++) { step(w, IDLE); out.push(`${g.x.toFixed(9)},${g.z.toFixed(9)}`); }
    return out.join(';');
  };
  check('a run replays from its seed', trail(11) === trail(11));
  check('another seed tumbles another way', trail(11) !== trail(12));
}

// ── the look: REDD's cube, at its own radius ─────────────────────────
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
  const v = view(look, S, 'reddmini');
  check('its own body in its own red (0xff4433), the cube family, unit radius, own: true',
    v.own === true && made[0].hex === 0xff4433 && made[0].fam === 'cube' && made[0].r === 1);
  const geo = v.body.geometry, bb = geo.boundingBox, c = S.look.corner / S.radius, inner = 0.9 - c;
  const pos = geo.attributes.position;
  let onSurface = true;
  for (let i = 0; i < pos.count; i++) {
    const qx = Math.max(Math.abs(pos.getX(i)) - inner, 0), qy = Math.max(Math.abs(pos.getY(i)) - inner, 0), qz = Math.max(Math.abs(pos.getZ(i)) - inner, 0);
    onSurface &&= near(Math.hypot(qx, qy, qz), c, 1e-6);
  }
  check('1.x\'s RoundedBox at r 0.32: 1.8 radii a side, the absolute 0.18 corner taking most of each face (0.5625 of a unit radius)',
    near(bb.max.x, 0.9, 1e-6) && near(bb.min.y, -0.9, 1e-6) && near(c, 0.5625, 1e-12) && onSurface);
  const rv = view(reddLook, T.species.redd, 'redd');
  check('its geometry is its own, not REDD\'s (each cube is its own rounder or squarer box)', rv.body.geometry !== geo && view(look, S, 'reddmini').body.geometry === geo);
  const Wd = { time: 0 };
  const g = { r: 0.32, sq: 1, tell: 0, flash: 0, affix: null, s: { tumble: false } };
  look.update(v, g, Wd, 0, 1);
  v.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(v.body, true);
  check('at rest: drawn at r 0.32, its centre at L = 0.288, its bottom on the floor, 0.576 across',
    near(v.body.scale.x, 0.32) && near(v.body.position.y, L0, 1e-12) && near(box.min.y, 0, 1e-6) && near(box.max.x - box.min.x, 0.576, 1e-6));
  Object.assign(g.s, { tumble: true, x0: 0, z0: 0, dirX: 0, dirZ: -1 });
  let planted = true;
  for (const along of [0, 0.1, 0.288, 0.45, 0.576]) {
    v.root.position.set(0, 0, -along);
    look.update(v, g, Wd, 0, 1);
    v.root.updateMatrixWorld(true);
    const edge = new THREE.Vector3(0, -0.9, -0.9).applyMatrix4(v.body.matrixWorld);
    planted &&= near(edge.y, 0, 1e-9) && near(edge.z, -L0, 1e-9);
  }
  check('mid-flop it pivots on its planted leading edge, as REDD does', planted);

  // a brood waiting out its parent's 0.28 s pop: 1.x had not built it yet
  // (enemy.js:2992-3000, main.js:10586-10620), so it is not drawn — and when
  // it comes out it is whole, not growing in from the core's 15%
  const w = createWorld({ seed: 5 }); w.director = { step() {} }; w.hero.lives = 1e9;
  const p = api.spawn(w, 'redd', 0, 0);
  api.kill(w, p, 'hero');
  const kid = minis(w)[0];
  // the grow the core's view hands a look (TUNING.gel.swell, render/actors.js):
  // a body is drawn swelling in from 15% over the swell, off its age; a child never swells
  const smooth = (u) => { const c = Math.min(1, Math.max(0, u)); return c * c * (3 - 2 * c); };
  const viewGrow = (gg) => (gg.child || !(gg.t < T.gel.swell) ? 1 : 0.15 + 0.85 * smooth(gg.t / T.gel.swell));
  const kv = view(look, S, 'reddmini');
  look.update(kv, kid, w, 0, viewGrow(kid));
  let hidden = kv.body.visible === false, frames = 0;
  while (kid.state === 'appear' && frames < 60) { step(w, IDLE); frames++; look.update(kv, kid, w, frames * dt, viewGrow(kid)); if (kid.state === 'appear') hidden &&= kv.body.visible === false; }
  // 1.x's pop: `_deathT = 0.28` (enemy.js:3007), less dt a frame (2970), the
  // brood ready when it is <= 0 (2992-3000): 17 frames of 1/60 s
  check(`a mini born from a REDD is not drawn while its parent pops (${stepsDown(0.28)} steps)`, hidden && frames === stepsDown(0.28) && frames === 17, `${frames}`);
  check('…and comes out whole: drawn at its full 0.32, standing on a face', kv.body.visible === true && near(kv.body.scale.x, 0.32 * (1 - 0.10 * Math.sin(frames * dt * 2.4) / 2), 1e-9) && near(kv.body.position.y, L0, 1e-12));
  // spawned outright (not a brood), it is live from its first step (above), and
  // only its view swells in like any body's: from 15% over the core's
  // TUNING.gel.swell, a 2.0 choice (owner, 2026-10-22, "c or less": no longer
  // than 0.15 s) — 1.x drew every body whole from its constructor (enemy.js:659-660)
  const wd = createWorld({ seed: 6 }); wd.director = { step() {} };
  const lone = api.spawn(wd, 'reddmini', 3, 0);                      // not a child: an ordinary spawn
  lone.s.rest = HOLD;                                                // held on its face, to read its height
  const swellSteps = T.gel.swell > 0 ? stepsUp(T.gel.swell) : 0;
  const lv = view(look, S, 'reddmini');
  let shown = true, rising = true, lastY = -1, y1 = null, wholeAt = -1;
  for (let i = 1; i <= swellSteps + 3; i++) {
    step(wd, IDLE);
    look.update(lv, lone, wd, i * dt, viewGrow(lone));
    const y = lv.body.position.y;
    shown &&= lone.state === 'active' && lv.body.visible === true && near(y, F.halfExtent * lone.r * viewGrow(lone), 1e-12);
    rising &&= y >= lastY - 1e-12; lastY = y;
    if (i === 1) y1 = y;
    if (wholeAt < 0 && near(y, L0, 1e-12)) wholeAt = i;
  }
  check(`spawned outright, it is drawn from its first step, swelling in from 15% over the core's ${T.gel.swell} s and whole from step ${swellSteps}`,
    T.gel.swell <= 0.15 && shown && rising && wholeAt === Math.max(1, swellSteps) && (swellSteps === 0 || y1 < L0 * 0.5), `${y1} whole at ${wholeAt}`);
  const rp = view(reddLook, T.species.redd, 'redd');
  reddLook.update(rp, { ...kid, state: 'appear', child: true, r: 0.75, s: { tumble: false } }, w, 0, 0.5);
  check('REDD\'s own look never hides a body (only a brood opts in)', rp.body.visible === true);
  kv.body.visible = false; look.reset(kv);
  check('a pooled view comes back visible', kv.body.visible === true);
}

if (failed) { console.log(`✗ reddmini: ${failed} of ${failed + passed} checks failed`); process.exit(1); }
console.log(`✔ reddmini: ${passed} checks`);
