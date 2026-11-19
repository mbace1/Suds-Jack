#!/usr/bin/env node
// spittor.mjs — SPITTOR's own checks, in bare node: 1.x's numbers
// (enemy.js:579, 674, 2247-2257, 2693-2698, 2733-2769, 2878-2902, 2961-2966;
// tuning.js:41, 48), asserted against the sim stepping on its fixed 1/60 s.
// The cycle is checked against an ORACLE: 1.x's own per-frame arithmetic for
// the fire clock and the tell (enemy.js:2784, 2878-2888), run from the same
// starting clock, so the steps the tells start and the rings leave on must
// match 1.x's frame for frame.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=156';
import { TUNING as T } from '../../js/tuning.js?v=156';
import look from '../../js/render/looks/spittor.js?v=156';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.spittor, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const QUIET = -1e9;                       // a fire clock that never comes round

// A world with nothing in it but one SPITTOR (anchored: no swarm current or
// crowd, so what moves it is its own step), the hero at the origin and never
// running out of lives, so a long test is not cut short by the rings it is
// counting.
function world({ seed = 1, mode = 'arcade', x = 10, z = 0, o = {}, quiet = false, mortal = false } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  if (!mortal) w.hero.lives = 1e9;
  const g = api.spawn(w, 'spittor', x, z, o);
  g.anchored = true;
  if (quiet) g.s.t = QUIET;
  return { w, g };
}
const shotsOf = (w) => w.events.filter((e) => e.type === 'gelShot' && e.kind === 'spittor');
const snap = (b) => ({ x: b.x, z: b.z, px: b.px, pz: b.pz, vx: b.vx, vz: b.vz, r: b.r, color: b.color, src: b.src, revenge: b.revenge, homing: b.homing });

// 1.x's fire clock and tell, frame by frame (enemy.js:2784 `_t += dt`, then
// _tick 2878-2888): which frames the tell starts on and the ring leaves on
function oracle(t0, interval, steps) {
  let t = t0, tele = false, teleT = 0;
  const starts = [], fires = [];
  for (let i = 1; i <= steps; i++) {
    t += dt;
    if (!tele && t >= interval) { t = 0; teleT = S.tellTime; tele = true; starts.push(i); }
    if (tele) { teleT -= dt; if (teleT <= 0) { tele = false; fires.push(i); } }
  }
  return { starts, fires };
}

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.9, hp 3, speed 1.6 (1.x enemy.js:579)', S.radius === 0.9 && S.hp === 3 && S.speed === 1.6);
  check('CFG: body 0xff5533, bullets 0xff7755, every 2.2 s', S.color === 0xff5533 && S.bulletColor === 0xff7755 && S.fireInterval === 2.2);
  check('a blob dome, HOLDER, no contact damage in classic, bites AIMED', S.family === 'blob' && S.role === 'HOLDER' && S.contact === false && S.revenge === 'AIMED');
  check('HOLDER is 1.x\'s: the current at 0.25 and nothing else (1.x tuning.js:292)',
    T.movement.roles.HOLDER.current === 0.25 && T.movement.roles.HOLDER.dodge === 0 && T.movement.roles.HOLDER.flock === 0 && T.movement.roles.HOLDER.weave === 0);
  check('holds 10 ± 1 (1.x enemy.js:2248)', S.hold === 10 && S.holdBand === 1);
  check('tell 0.45 s, +22%, recoil 0.18, squash −1.0, ring of 8 at 7 u/s (1.x tuning.js:48, enemy.js:2892-2899)',
    S.tellTime === 0.45 && S.look.inflate === 0.22 && S.recoil === 0.18 && S.fireSquash === -1.0 && S.ring === 8 && S.bulletSpeedMult === 1);
  check('the fire clock starts in U(0, 0.5) (1.x enemy.js:674)', S.fireStart[0] === 0 && S.fireStart[1] === 0.5);
  check('the snouty silhouette is 1.x\'s (tuning.js:41), and agrees with the core\'s copy',
    S.look.shape.x === 1.02 && S.look.shape.y === 0.78 && S.look.shape.z === 1.26
    && ['x', 'y', 'z'].every((k) => T.blob.shapes.spittor[k] === S.look.shape[k]));
  check('the tell glows 0x442200 (1.x enemy.js:2687)', S.look.tellEmissive === 0x442200);
  check('1.x\'s velocity easing, 0.3 a step (enemy.js:2697)', S.velSmooth === 0.3);
  check('the shared blob numbers are 1.x\'s: breath 0.13 at 2.4, drag 0.10/u·s capped 0.35, tilt 0.35 (tuning.js:46, 53; the 2.4 is enemy.js:2749)',
    T.blob.breatheAmp === 0.13 && T.blob.breatheHz === 2.4 && T.blob.dragStretchPerSpeed === 0.10 && T.blob.dragMax === 0.35 && T.blob.rearDragTilt === 0.35);
  const src = readFileSync(new URL('../../js/sim/species/spittor.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
}

// ── the hold band ─────────────────────────────────────────────────────
{
  // far: walks straight in at 1.6 u/s
  let { w, g } = world({ x: 15, quiet: true });
  for (let i = 0; i < 30; i++) step(w, IDLE);
  check('beyond 11 it walks in at its speed (1.6 u/s)', near(g.x, 15 - 30 * dt * 1.6, 1e-9) && near(g.z, 0), `x ${g.x}`);
  for (let i = 0; i < 150; i++) step(w, IDLE);
  check('and stops on the band\'s far edge, 11', g.x <= 11 && g.x > 11 - 1.6 * dt * 1.01, `x ${g.x}`);
  const x0 = g.x;
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('inside the band it stands', g.x === x0 && g.z === 0, `x ${g.x}`);

  // near: backs straight off
  ({ w, g } = world({ x: 3, z: 4, quiet: true }));            // 5 away
  for (let i = 0; i < 30; i++) step(w, IDLE);
  const d = Math.hypot(g.x, g.z), want = 5 + 30 * dt * 1.6;
  check('inside 9 it backs off at its speed, straight away from you', near(d, want, 1e-9) && near(Math.atan2(g.z, g.x), Math.atan2(4, 3), 1e-9), `d ${d} want ${want}`);
  for (let i = 0; i < 200; i++) step(w, IDLE);
  check('and stops on the band\'s near edge, 9', Math.hypot(g.x, g.z) >= 9 && Math.hypot(g.x, g.z) < 9 + 1.6 * dt * 1.01, `d ${Math.hypot(g.x, g.z)}`);

  // in the band: stands still
  ({ w, g } = world({ x: 0, z: 9.5, quiet: true }));
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('between 9 and 11 it does not walk at all', g.x === 0 && g.z === 9.5);

  // it follows you: you walk off, it walks after you
  ({ w, g } = world({ x: 10, z: 0, quiet: true }));
  for (let i = 0; i < 60; i++) step(w, { ...IDLE, mx: -1 });
  check('when you walk away it closes the gap (but never inside 11)', g.x < 10 && Math.hypot(g.x - w.hero.x, g.z - w.hero.z) >= 11 - 1e-9, `x ${g.x}`);

  // no strafe: the walk is only ever along the line to you
  ({ w, g } = world({ x: 12, z: 6, quiet: true }));
  const a0 = Math.atan2(6, 12);
  for (let i = 0; i < 20; i++) step(w, IDLE);
  check('no strafe: it walks the line to you', near(Math.atan2(g.z, g.x), a0, 1e-12));

  // the wave's escalation and the SWIFT affix scale the walk (1.x enemy.js:1699)
  ({ w, g } = world({ x: 15, o: { speedMult: 1.448 }, quiet: true }));
  for (let i = 0; i < 30; i++) step(w, IDLE);
  check('the wave\'s speedMult scales the walk', near(15 - g.x, 30 * dt * 1.6 * 1.448, 1e-9));
  ({ w, g } = world({ x: 15, o: { affix: 'swift' }, quiet: true }));
  g.anchored = true;
  for (let i = 0; i < 30; i++) step(w, IDLE);
  check('so does SWIFT (×1.35)', near(15 - g.x, 30 * dt * 1.6 * T.variants.swiftSpeed, 1e-9));

  // 2.0's curbs: backing off into a wall it is held there (1.x had none)
  ({ w, g } = world({ x: 0, z: 0, quiet: true }));
  const edge = w.hx - g.r;
  g.x = edge; w.hero.x = edge - 4;
  for (let i = 0; i < 30; i++) step(w, IDLE);
  check('backing off into the curb it stays on it', near(g.x, edge, 1e-12), `x ${g.x} edge ${edge}`);
}

// ── its own velocity (1.x _velX, enemy.js:2693-2698) ─────────────────
{
  let { w, g } = world({ x: 15, quiet: true });
  for (let i = 0; i < 120; i++) step(w, IDLE);
  check('walking, its own velocity settles on the walk (−1.6 u/s)', near(g.s.velX, -1.6, 1e-6) && near(g.s.velZ, 0), `velX ${g.s.velX}`);
  ({ w, g } = world({ x: 15, quiet: true }));
  step(w, IDLE);
  check('eased 0.3 a step', near(g.s.velX, -1.6 * 0.3, 1e-12), `${g.s.velX}`);
  // standing in the band, the spit's kick back never shows in it
  ({ w, g } = world({ seed: 4, x: 6, z: 8 }));
  let kicked = false, still = true;
  for (let i = 0; i < 300; i++) {
    step(w, IDLE);
    if (shotsOf(w).length) kicked = true;
    if (g.s.velX !== 0 || g.s.velZ !== 0) still = false;
  }
  check('standing still, it spits and kicks back, and its own velocity stays 0', kicked && still && Math.hypot(g.x - 6, g.z - 8) > 0.17);
}

// ── the inflate-and-spit cycle ────────────────────────────────────────
function cycle({ seed = 3, im = 1, at = [6, 8], hitAt = -1, steps = 800 } = {}) {
  const { w, g } = world({ seed, x: at[0], z: at[1], o: { intervalMult: im } });
  const t0 = g.s.t, log = [];
  for (let i = 1; i <= steps && g.alive; i++) {
    const pre = { x: g.x, z: g.z, tele: g.s.tele };
    if (i === hitAt) api.heroBullet(w, g.x - 0.5, g.z, 0);
    step(w, IDLE);
    const ev = shotsOf(w)[0] || null;
    log.push({ i, pre, tell: g.tell, startedTell: !pre.tele && g.s.tele, fired: !!ev, ev, x: g.x, z: g.z, sqV: g.sqV, hp: g.hp,
      ring: ev ? w.bullets.filter((b) => !b.hero && b.src === 'spittor').slice(-S.ring).map(snap) : null });
  }
  return { w, g, t0, log };
}

{
  const { w, t0, log } = cycle({ steps: 1000 });
  check('the fire clock starts in [0, 0.5) s (1.x enemy.js:674)', t0 >= 0 && t0 < 0.5, `t0 ${t0}`);
  const starts = log.filter((e) => e.startedTell).map((e) => e.i), fires = log.filter((e) => e.fired).map((e) => e.i);
  const o = oracle(t0, S.fireInterval, log.length);
  check('it tells and spits, over and over (7 times in 16.7 s)', starts.length >= 7 && fires.length >= 7, `${starts.length} tells, ${fires.length} spits`);
  check('every tell starts on 1.x\'s frame', starts.join() === o.starts.join(), `${starts.slice(0, 6)} vs 1.x ${o.starts.slice(0, 6)}`);
  check('every ring leaves on 1.x\'s frame', fires.join() === o.fires.join(), `${fires.slice(0, 6)} vs 1.x ${o.fires.slice(0, 6)}`);
  check('the first tell starts 2.2 s less the starting clock in', Math.abs(starts[0] * dt - (2.2 - t0)) <= dt, `${starts[0] * dt} vs ${2.2 - t0}`);
  check('the tell lasts 0.45 s, to the step', fires.every((f, k) => Math.abs((f - starts[k]) * dt - 0.45) <= dt + 1e-9), `${fires.map((f, k) => f - starts[k])}`);
  const gaps = starts.slice(1).map((s, k) => s - starts[k]);
  check('tell start to tell start is the interval, 2.2 s (the clock counts through the tell), not 2.65',
    gaps.every((n) => Math.abs(n * dt - 2.2) <= dt), `gaps ${gaps}`);

  // the swell the look draws
  const s0 = starts[0], f0 = fires[0];
  const tells = log.filter((e) => e.i >= s0 && e.i <= f0).map((e) => e.tell);
  check('no swell on the step the tell starts (1.x reads it before the tick)', tells[0] === 0);
  check('then it swells linearly over the tell', tells.slice(1).every((v, k) => near(v, (k + 1) * dt / S.tellTime, 1e-9)), tells.slice(0, 4).join(' '));
  check('nearly full on the step it spits, gone the step after', tells[tells.length - 1] > 0.95 && log.find((e) => e.i === f0 + 1).tell === 0);
  check('between tells there is no swell', log.filter((e) => e.i > f0 && e.i < starts[1]).every((e) => e.tell === 0));

  // the ring
  const e = log.find((x) => x.i === f0), ox = e.pre.x, oz = e.pre.z, aim = Math.atan2(0 - oz, 0 - ox);
  const ring = e.ring;
  check('a ring of 8 leaves on the spit', ring.length === 8 && e.ev.n === 8, `${ring.length}`);
  check('every bullet from where it stood before the kick back', ring.every((b) => near(b.px, ox, 1e-12) && near(b.pz, oz, 1e-12)) && near(e.ev.x, ox) && near(e.ev.z, oz));
  check('and has already flown its first step (bullets move the step they are fired, 1.x main.js:10428)',
    ring.every((b) => near(Math.hypot(b.x - b.px, b.z - b.pz), 7 * dt, 1e-9)));
  check('the first bullet flies straight at you', angDiff(Math.atan2(ring[0].vz, ring[0].vx), aim) < 1e-9);
  check('the rest at 45° steps round the ring', ring.every((b, k) => angDiff(Math.atan2(b.vz, b.vx), aim + (k * Math.PI * 2) / 8) < 1e-9));
  check('at 7 u/s, radius 0.15, in 0xff7755, from the spittor', ring.every((b) => near(Math.hypot(b.vx, b.vz), 7, 1e-9) && b.r === 0.15 && b.color === 0xff7755 && b.src === 'spittor' && !b.revenge && !b.homing));
  check('the spit kicks it 0.18 back, straight away from you', near(Math.hypot(e.x - ox, e.z - oz), 0.18, 1e-9) && angDiff(Math.atan2(e.z - oz, e.x - ox), aim + Math.PI) < 1e-9,
    `${Math.hypot(e.x - ox, e.z - oz)}`);
  check('and flattens it: a −1.0 kick to the squash spring', e.sqV < -0.95 && e.sqV > -1.05, `sqV ${e.sqV}`);
  // each kick walks it further off; out past 11 it walks back in between spits
  check('the kicks back carry it past the band, and it walks back to 11', log.some((x) => Math.hypot(x.x, x.z) > 11.05) && Math.hypot(log.at(-1).x, log.at(-1).z) <= 11 + 0.18 + 1e-9,
    `${Math.hypot(log.at(-1).x, log.at(-1).z)}`);
  check('the hero was hit by the aimed bullet (the first of the ring flies at you)', w.hero.lives < 1e9);
}

// the ring leaves from where it has walked to this step (1.x _tick re-reads its position)
{
  const { w, g } = world({ seed: 7, x: 17, z: 0 });
  let got = null;
  for (let i = 0; i < 400 && !got; i++) {
    const pre = g.x;
    step(w, IDLE);
    const ev = shotsOf(w)[0];
    if (ev) got = { pre, ev, walk: api.speed(g) * dt };
  }
  check('walking in, the ring leaves from this step\'s walked spot, not last step\'s', got && near(got.ev.x, got.pre - got.walk, 1e-12), got && `${got.ev.x} vs ${got.pre - got.walk}`);
}

// it aims where you are NOW
{
  const { w, g } = world({ seed: 5, x: 10, z: 0 });
  let fired = null;
  for (let i = 0; i < 400 && !fired; i++) {
    if (g.s.tele) { w.hero.x = 0; w.hero.z = 3; }        // you step aside during the tell
    step(w, IDLE);
    if (shotsOf(w).length) fired = w.bullets.filter((b) => b.src === 'spittor').map(snap);
  }
  const ox = fired[0].px, oz = fired[0].pz;
  check('the aim is taken as it spits, not as the tell starts', angDiff(Math.atan2(fired[0].vz, fired[0].vx), Math.atan2(3 - oz, 0 - ox)) < 1e-9);
}

// escalation: the wave's intervalMult shortens the cycle; the tell does not
{
  const { t0, log } = cycle({ im: 0.505, steps: 600 });
  const starts = log.filter((e) => e.startedTell).map((e) => e.i), fires = log.filter((e) => e.fired).map((e) => e.i);
  const o = oracle(t0, S.fireInterval * 0.505, log.length);
  check('at wave 10 (intervalMult 0.505) it tells every 1.111 s, on 1.x\'s frames', starts.length >= 8 && starts.join() === o.starts.join() && fires.join() === o.fires.join(),
    `${starts.slice(0, 5)} vs ${o.starts.slice(0, 5)}`);
  check('and the tell is still 0.45 s', fires.every((f, k) => Math.abs((f - starts[k]) * dt - 0.45) <= dt + 1e-9));
  // at the floor (0.35, wave 26+) the period, 0.77 s, still holds the whole 0.45 s tell
  const fl = cycle({ im: 0.35, steps: 400 });
  const o2 = oracle(fl.t0, S.fireInterval * 0.35, fl.log.length);
  check('at the 0.35 floor too', fl.log.filter((e) => e.fired).map((e) => e.i).join() === o2.fires.join() && o2.fires.length >= 8);
}

// a hit does not interrupt the tell
{
  const plain = cycle({ seed: 9, steps: 300 });
  const s0 = plain.log.find((e) => e.startedTell).i, f0 = plain.log.find((e) => e.fired).i;
  const hit = cycle({ seed: 9, steps: 300, hitAt: s0 + 5 });
  check('a hit mid-tell lands (1 damage)', hit.g.hp === S.hp - 1);
  check('and the spit comes on the same step', hit.log.find((e) => e.fired)?.i === f0);
}

// it dies to 3 ordinary hits and leaves nothing behind
{
  const { w, g } = world({ x: 10, quiet: true });
  let kills = 0, blocks = 0;
  for (let i = 0; i < 3; i++) {
    api.heroBullet(w, g.x - 0.5, g.z, 0);
    step(w, IDLE);
    kills += w.events.filter((e) => e.type === 'kill' && e.kind === 'spittor').length;
    blocks += w.events.filter((e) => e.type === 'block').length;
  }
  check('three hero bullets kill it, none blocked', kills === 1 && blocks === 0 && !g.alive);
  check('it leaves no children and nothing on the floor', w.gels.length === 0 && w.hazards.length === 0 && w.lobs.length === 0);
  const { w: w2, g: g2 } = world({ x: 10, quiet: true });
  g2.hp = 1; api.heroBullet(w2, g2.x - 0.5, g2.z, 0); step(w2, IDLE);
  const k = w2.events.find((e) => e.type === 'kill');
  check('its kill event is big, in its colour', k && k.big && k.color === 0xff5533 && k.r === 0.9);
  check('a dead SPITTOR fires nothing in ARCADE', w2.bullets.filter((b) => !b.hero).length === 0);
}

// classic: touching it does not hurt
{
  const { w, g } = world({ x: 0.3, z: 0, quiet: true, mortal: true });
  for (let i = 0; i < 60; i++) { w.hero.x = g.x; w.hero.z = g.z; step(w, IDLE); }
  check('in classic its touch is harmless', w.hero.lives === T.hero.lives);
}

// HARDCADE: it bites AIMED — 3 slow bullets 0.14 rad apart at you, in dark blood
{
  const { w, g } = world({ mode: 'hardcade', x: 6, z: 8, quiet: true });
  w.wave = 3;
  g.hp = 1;
  api.heroBullet(w, g.x - 0.5, g.z, 0);
  step(w, IDLE);
  for (let i = 0; i < 120 && w.seeds.length; i++) step(w, IDLE);   // v103: the corpse warns before it bites
  const bite = w.bullets.filter((b) => b.revenge);
  const aim = Math.atan2(0 - g.z, 0 - g.x);
  const angs = bite.map((b) => Math.atan2(b.vz, b.vx));
  const n = Math.max(1, Math.round(T.revenge.aimed.count * T.revenge.density));
  check(`${n} corpse bullets (1.x: 3, at density ${T.revenge.density})`, bite.length === n && T.revenge.aimed.count === 3, `${bite.length}`);
  check('at 0.14 rad steps about the aim', angs.every((a, k) => angDiff(a, aim + (k - (n - 1) / 2) * 0.14) < 1e-9));
  check('at 4.2 u/s in 0xcb2c00', bite.every((b) => near(Math.hypot(b.vx, b.vz), 4.2, 1e-9) && b.color === 0xcb2c00), bite.map((b) => b.color.toString(16)).join(' '));
  const { w: w2, g: g2 } = world({ mode: 'hardcade', x: 6, z: 8, quiet: true });
  w2.wave = 2; g2.hp = 1; api.heroBullet(w2, g2.x - 0.5, g2.z, 0); step(w2, IDLE);
  check('and not before wave 3', w2.bullets.filter((b) => b.revenge).length === 0);
}

// determinism: the same seed, the same spits
{
  const a = cycle({ seed: 21, steps: 500 }), b = cycle({ seed: 21, steps: 500 });
  const sig = (r) => r.w.bullets.map((x) => `${x.x.toFixed(9)},${x.z.toFixed(9)}`).join(';') + `|${r.g.x},${r.g.z}`;
  check('a run replays from its seed', sig(a) === sig(b) && a.w.bullets.length > 0);
  const c = cycle({ seed: 22, steps: 500 });
  check('another seed starts its clock elsewhere', c.t0 !== a.t0);
}

// ── the look: 1.x's scale block (enemy.js:2733-2769) ──────────────────
{
  // a stand-in three: just enough Object3D for build() and update()
  class O3 {
    constructor() { this.children = []; this.scale = { set(x, y, z) { this.v = [x, y, z]; }, v: [1, 1, 1] }; this.rotation = { set(x, y, z) { this.v = [x, y, z]; }, v: [0, 0, 0] }; }
    add(c) { this.children.push(c); }
  }
  class Mesh extends O3 { constructor(geo, mat) { super(); this.geo = geo; this.mat = mat; } }
  const emissive = { hex: -1, setHex(h) { this.hex = h; return this; } };
  const ctx = { THREE: { Group: O3, Mesh }, geo: { blob: 'dome' }, T, S, gelMaterial: (hex, fam, r) => ({ hex, fam, r, emissive }) };
  const built = look.build(ctx);
  check('build: one gel dome in its colour, blob family, unit radius (1.x makeSatinMat(color, \'blob\', 1))',
    built.mesh.geo === 'dome' && built.mat.hex === 0xff5533 && built.mat.fam === 'blob' && built.mat.r === 1 && built.own === true && built.body.children[0] === built.mesh);
  const v = { S, phase: 0, ...built };
  const sh = S.look.shape, B = T.blob;
  // the squash group above the body, as actors.js sets it
  const squash = (sq) => [1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)];
  // what reaches the screen: squash group × body group × mesh (all axis scales; the mesh's own R·S sits inside)
  const world3 = (sq) => { const a = squash(sq), b = v.body.scale.v; return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; };
  const g = { r: 0.9, sq: 1, tell: 0, flash: 0, s: { velX: 0, velZ: 0 } };

  look.update(v, g, null, 0, 1);            // at rest, mid-breath zero (time 0, phase 0)
  check('at rest it is r × the snout: 1.84 wide, 1.40 tall dome, 2.27 long',
    near(v.mesh.scale.v[0], 0.9 * sh.x) && near(v.mesh.scale.v[1], 0.9 * sh.y) && near(v.mesh.scale.v[2], 0.9 * sh.z));
  check('it faces +z until it first walks (1.x _moveYaw = 0)', v.yaw === 0 && v.mesh.rotation.v[1] === 0);

  g.tell = 1; emissive.hex = -1; look.update(v, g, null, 0, 1);
  check('at the end of the tell it is 22% bigger every way', near(v.mesh.scale.v[0], 0.9 * sh.x * 1.22) && near(v.mesh.scale.v[1], 0.9 * sh.y * 1.22) && near(v.mesh.scale.v[2], 0.9 * sh.z * 1.22));
  check('and glows 0x442200', emissive.hex === 0x442200);
  g.tell = 0.5; look.update(v, g, null, 0, 1);
  check('half way through it is 11% bigger (linear)', near(v.mesh.scale.v[0], 0.9 * sh.x * 1.11));
  emissive.hex = -1; g.flash = 0.1; look.update(v, g, null, 0, 1);
  check('the hit flash outranks the tell glow', emissive.hex === -1);
  emissive.hex = -1; g.flash = 0; g.tell = 1; g.affix = 'volatile'; look.update(v, g, null, 0, 1);
  check('so does a VOLATILE fuse (1.x enemy.js:2653, checked before the tell)', emissive.hex === -1);
  g.affix = null; g.tell = 0.5;
  emissive.hex = -1; g.flash = 0; g.tell = 0; look.update(v, g, null, 0, 1);
  check('no tell, no glow of its own', emissive.hex === -1);

  // squashed, breathing and dragging: the mesh carries 1.x's whole scale, and
  // the body group undoes the squash group exactly
  g.sq = 0.7; g.s.velX = 3; g.s.velZ = 0;
  const time = 0.37, b = B.breatheAmp * Math.sin(time * B.breatheHz);
  look.update(v, g, null, time, 1);
  const sx = 1 / Math.sqrt(0.7), drag = Math.min(3 * B.dragStretchPerSpeed, B.dragMax);
  const want = [0.9 * sh.x * sx * (1 - b * 0.5), 0.9 * sh.y * (0.7 * (1 + b) - drag * 0.25), 0.9 * sh.z * (sx * (1 - b * 0.5) + drag)];
  check('squashed, breathing and dragging, its shape is 1.x\'s formula', v.mesh.scale.v.every((x, k) => near(x, want[k], 1e-12)), `${v.mesh.scale.v} vs ${want}`);
  check('the body group cancels the squash group, so the mesh\'s scale is the whole story', world3(0.7).every((x) => near(x, 1, 1e-12)), `${world3(0.7)}`);
  check('the snout turns to its heading, nose lifting with the drag (1.x rotation (−0.35 drag, yaw, 0))',
    near(v.yaw, Math.atan2(3, 0)) && near(v.mesh.rotation.v[0], -drag * B.rearDragTilt) && v.mesh.rotation.v[2] === 0);
  g.s.velX = 10; look.update(v, g, null, time, 1);
  check('the smear caps at 0.35', near(v.mesh.scale.v[2], 0.9 * sh.z * (sx * (1 - b * 0.5) + 0.35)));
  g.s.velX = 0.3; g.s.velZ = 0.1; const yaw = v.yaw; look.update(v, g, null, time, 1);
  check('below 0.4 u/s the snout holds its heading', v.yaw === yaw);
  // an elite (r × 1.2) and the view's swell grow scale it all
  g.sq = 1; g.s.velX = g.s.velZ = 0; g.r = 0.9 * 1.2; look.update(v, g, null, 0, 0.5);
  check('the radius it is drawn at is the body\'s own (elite × 1.2) × the view\'s swell grow (TUNING.gel.swell)', near(v.mesh.scale.v[0], 0.9 * 1.2 * 0.5 * sh.x));
  // a pooled view comes back facing 1.x's start
  v.yaw = 2; look.reset(v);
  check('reset: a reused view faces +z again', v.yaw === 0);

  // the sim's velocity, not the view's: a spit's kick back leaves the snout alone
  const { w, g: gg } = world({ seed: 4, x: 6, z: 8 });
  const vv = { S, phase: 0, ...look.build(ctx) };
  let yawMoved = false;
  for (let i = 0; i < 300; i++) { step(w, IDLE); look.update(vv, gg, w, i * dt, 1); if (vv.yaw !== 0) yawMoved = true; }
  check('a SPITTOR standing in its band never swings its snout, spitting or not', !yawMoved && Math.hypot(gg.x - 6, gg.z - 8) > 0.17);
}

if (failed) { console.log(`✗ spittor: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ spittor: ${passed} checks`);
