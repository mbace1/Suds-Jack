#!/usr/bin/env node
// cloaker.mjs — CLOAKER's own checks, in bare node: 1.x's numbers (enemy.js:
// 493-496, 598, 644-648, 668, 1201-1206, 1603-1667, 1843-1886, 2650-2689,
// 2790, 2983-2984; bullet.js:91-94; main.js:2410-2421, 5046, 10636-10720;
// tuning.js:308, 496-497, 510), asserted against the sim on its fixed 1/60 s
// step. The cycle is checked against an ORACLE: 1.x's own per-frame
// arithmetic for the CLOAKER case of update(), in 1.x's literals (not the
// tuning file's), from the same seeded draws, so every step's position and
// state and every burst must match 1.x's frame for frame. The look is checked
// against real three.
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=160';
import { makeRng } from '../../js/sim/rng.js?v=160';
import { TUNING as T } from '../../js/tuning.js?v=160';
import look, { opacity, deathOpacity } from '../../js/render/looks/cloaker.js?v=160';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.cloaker, L = S.look, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const shotsOf = (w) => w.bullets.filter((b) => b.src === 'cloaker' && !b.revenge && !b.dead);

// A world with one CLOAKER (anchored unless told otherwise: no swarm forces,
// no crowd, so only its own step moves it), the hero at `hero` and never
// running out of lives. `rng` is a copy of the run's seeded stream from just
// before the spawn, so the oracle can make the same draws.
function world({ seed = 1, x = 8, z = 0, o = {}, hero = [0, 0], mode = 'arcade', anchored = true } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  w.hero.x = w.hero.px = hero[0]; w.hero.z = w.hero.pz = hero[1];
  const rng = makeRng(0); rng.state = w.rng.state;
  const g = api.spawn(w, 'cloaker', x, z, o);
  if (anchored) g.anchored = true;
  return { w, g, rng };
}
const run = (w, n, input = IDLE) => { for (let i = 0; i < n; i++) step(w, input); };
// one step, returning the bullets it put on the floor, as they were fired
// (a new bullet's px/pz is where it was spawned; it has flown one step since)
function stepShots(w, input = IDLE) {
  const before = new Set(w.bullets);
  step(w, input);
  return w.bullets.filter((b) => !before.has(b)).map((b) => ({ ...b, x: b.px, z: b.pz }));
}

// 1.x's CLOAKER, frame by frame (enemy.js:1202-1206, 1680, 1698-1700,
// 1843-1886), in 1.x's literals, on the landscape arena. `heroAt(i)` is where
// the hero stood on step i (it moves before the bodies, in 1.x and in 2.0);
// `spd` is 1.x's `cfg.speed × _speedMult × surge`. The wall clamp (by the
// body's radius) is the core's.
function oracle(steps, { x, z, rng, heroAt, spd = 2.4, r = 0.7, hx = 19, hz = 11 }) {
  let state = 'visible', ck = 0.8 + rng.next() * 0.6, tx = x, tz = z, opac = 1;   // enemy.js:1203-1205
  const out = [null];
  for (let i = 1; i <= steps; i++) {
    const [px, pz] = heroAt(i);
    const ex = x, ez = z;
    let drew = state, shots = null, flank = null;
    ck -= dt;
    if (state === 'visible') {
      if (ck <= 0) {
        state = 'cloak';
        ck = 1.8 + rng.next() * 0.6;
        const side = rng.next() < 0.5 ? 1 : -1;
        const a0 = Math.atan2(z - pz, x - px) + side * (Math.PI / 2 + rng.next() * 0.6);
        const r0 = 6.5 + rng.next() * 1.5;
        tx = px + Math.cos(a0) * r0; tz = pz + Math.sin(a0) * r0;
        flank = { side, a0, r0, from: Math.atan2(z - pz, x - px) };
      }
    } else if (state === 'cloak') {
      opac = 0.14;                                   // + the shimmer
      const mx = tx - x, mz = tz - z, ml = Math.hypot(mx, mz);
      if (ml > 0.3) { x += (mx / ml) * spd * dt; z += (mz / ml) * spd * dt; }
      if (ck <= 0 || ml <= 0.3) { state = 'decloak'; ck = 0.6; }
    } else {
      const k = 1 - Math.max(ck, 0) / 0.6;
      opac = 0.14 + 0.86 * k;
      if (ck <= 0) {
        opac = 1.0; drew = 'burst';
        const baseA = Math.atan2(pz - ez, px - ex);
        shots = [-0.18, 0, 0.18].map((off) => ({ x: ex, z: ez, a: baseA + off }));
        state = 'visible';
        ck = 0.9 + rng.next() * 0.5;
      }
    }
    x = clamp(x, -(hx - r), hx - r); z = clamp(z, -(hz - r), hz - r);
    out.push({ x, z, state, drew, ck, tx, tz, opac, shots, flank });
  }
  return out;
}

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.7, hp 3, speed 2.4, ice blue 0x66ddee, bullets 0x88eeff, no fire clock (1.x enemy.js:598)',
    S.radius === 0.7 && S.hp === 3 && S.speed === 2.4 && S.color === 0x66ddee && S.bulletColor === 0x88eeff && S.fireInterval === null);
  check('a blob dome (BLOB_TYPES, enemy.js:647), HUNTER (tuning.js:308), harmless to touch (not in MELEE_TYPES), an AIMED biter (tuning.js:497, 510), "ice Cloaker" (main.js:5046)',
    S.family === 'blob' && S.role === 'HUNTER' && S.contact === false && S.revenge === 'AIMED' && S.deathLabel === 'ice Cloaker' && S.name === 'CLOAKER' && !S.noHpMult);
  check('its silhouette is the default dome (no shape row, enemy.js:802-805)', !T.blob.shapes.cloaker);
  check('it dies with the blob family\'s voice, not 1.x\'s accidental cube crunch (main.js:2422-2424, 4476-4480; species-a.md §10.4.5)', S.deathSound === undefined);
  check('the beats: first visible 0.8 + U·0.6, then 0.9 + U·0.5; the run 1.8 + U·0.6; the decloak 0.6 (enemy.js:1204, 1850, 1868, 1882)',
    S.firstVisible.base === 0.8 && S.firstVisible.rand === 0.6 && S.visible.base === 0.9 && S.visible.rand === 0.5
    && S.cloak.base === 1.8 && S.cloak.rand === 0.6 && S.decloak === 0.6);
  check('the flank: side U < 0.5 → +1, turned π/2 + U·0.6, 6.5 + U·1.5 from the hero, there at 0.3 (enemy.js:1851-1854, 1864-1868)',
    S.flankSide === 0.5 && S.flankTurn === Math.PI / 2 && S.flankJitter === 0.6 && S.flankRange.base === 6.5 && S.flankRange.rand === 1.5 && S.arrive === 0.3);
  check('the burst: 3 shots 0.18 rad apart at the plain gel speed (enemy.js:1876-1880, bullet.js:94)',
    S.burst.count === 3 && S.burst.step === 0.18 && S.burstSpeedMult === 1 && T.bullets.gelSpeed === 7);
  check('the look: floor 0.14 ± 0.05 at 9 rad/s; the strobe 0x226677 / black at 24 rad/s; its clock from U·2π (enemy.js:668, 1860, 1871-1872)',
    L.floor === 0.14 && L.shimmer === 0.05 && L.shimmerRate === 9 && L.strobeOn === 0x226677 && L.strobeOff === 0x000000 && L.strobeRate === 24
    && L.clockStart[0] === 0 && L.clockStart[1] === Math.PI * 2 && L.strobe === true);
  check('the death fade: (1 − t)² × 0.82 over the 0.28 s pop (enemy.js:2983-2984)', L.deathOpacity === 0.82 && L.deathFadePow === 2 && T.blob.death === 0.28);
  check('its swarm profile is HUNTER: dodge 0.4, weave 0.8, current 0.5, no flock (1.x tuning.js:296-308)',
    T.movement.roles.HUNTER.dodge === 0.4 && T.movement.roles.HUNTER.weave === 0.8 && T.movement.roles.HUNTER.current === 0.5 && T.movement.roles.HUNTER.flock === 0);
}

// ── spawning ─────────────────────────────────────────────────────────
{
  const { g, rng } = world({ seed: 5 });
  const want = 0.8 + rng.next() * 0.6;
  check('a CLOAKER: 3 hp, radius 0.7, visible, fully there, its first beat 0.8 + U·0.6 from the run\'s stream (enemy.js:1203-1205)',
    g.hp === 3 && g.r === 0.7 && g.s.state === 'visible' && g.cloak === 0 && g.s.t === want && g.s.tx === 8 && g.s.tz === 0);
  const e = world({ o: { variant: 'elite' } }).g;
  check('an elite: 6 hp = ceil(3 × 2), radius 0.84 = 0.7 × 1.2 (1.x main.js:9402-9406)', e.hp === 6 && near(e.r, 0.84));
  let lo = Infinity, hi = -Infinity;
  for (let seed = 1; seed <= 400; seed++) { const t = world({ seed }).g.s.t; lo = Math.min(lo, t); hi = Math.max(hi, t); }
  check('over 400 seeds the first beat spans 0.8–1.4 s', lo >= 0.8 && hi < 1.4 && lo < 0.82 && hi > 1.38, `${lo.toFixed(3)}–${hi.toFixed(3)}`);
}

// ── the cycle against 1.x, frame by frame ────────────────────────────
function compare(label, { seed, x, z, hero = [0, 0], o = {}, spd = 2.4, r = 0.7, steps = 60 * 20, input = IDLE, surge = null }) {
  const { w, g, rng } = world({ seed, x, z, hero, o });
  if (surge) { g.surgeT = 1e9; g.surgeMult = surge; }
  const heroes = [null], got = [null];
  for (let i = 1; i <= steps; i++) {
    const shots = stepShots(w, input);
    heroes.push([w.hero.x, w.hero.z]);
    got.push({ x: g.x, z: g.z, state: g.s.state, drew: g.s.drew, cloak: g.cloak, shots, gelShot: w.events.filter((e) => e.type === 'gelShot' && e.kind === 'cloaker').length });
  }
  const want = oracle(steps, { x, z, rng, heroAt: (i) => heroes[i], spd, r });
  let bad = null, bursts = 0, cloaks = 0, decloaks = 0;
  for (let i = 1; i <= steps && !bad; i++) {
    const a = got[i], b = want[i];
    if (a.x !== b.x || a.z !== b.z) bad = `step ${i}: at (${a.x}, ${a.z}), 1.x (${b.x}, ${b.z})`;
    else if (a.state !== b.state || a.drew !== b.drew) bad = `step ${i}: ${a.drew}→${a.state}, 1.x ${b.drew}→${b.state}`;
    else if (!near(opacity(L, a.cloak, 'decloak', 0), b.opac, 1e-12)) bad = `step ${i}: opacity ${opacity(L, a.cloak, 'decloak', 0)}, 1.x ${b.opac}`;
    else if (!!b.shots !== (a.shots.length > 0) || (b.shots && (a.shots.length !== 3 || a.gelShot !== 1))) bad = `step ${i}: ${a.shots.length} shots, 1.x ${b.shots ? 3 : 0}`;
    else if (b.shots) {
      bursts++;
      for (let j = 0; j < 3; j++) {
        const s = a.shots[j], q = b.shots[j];
        if (s.x !== q.x || s.z !== q.z || angDiff(Math.atan2(s.vz, s.vx), q.a) > 1e-12 || !near(Math.hypot(s.vx, s.vz), 7, 1e-12) || s.color !== 0x88eeff || s.src !== 'cloaker' || s.r !== T.bullets.gelRadius)
          bad = `step ${i}: shot ${j} (${s.x}, ${s.z}) @${Math.atan2(s.vz, s.vx)}, 1.x (${q.x}, ${q.z}) @${q.a}`;
      }
    }
    if (b.drew === 'cloak' && want[i - 1]?.drew !== 'cloak') cloaks++;
    if (b.drew === 'decloak' && want[i - 1]?.drew !== 'decloak') decloaks++;
  }
  check(`${label}: ${steps} steps match 1.x frame for frame (${bursts} bursts)`, !bad && bursts >= 3, bad || `${bursts} bursts`);
  return { w, g, want, got, bursts, cloaks, decloaks };
}

compare('from (8, 0), the hero at the origin', { seed: 1, x: 8, z: 0 });
compare('from (−5, 6), another seed', { seed: 77, x: -5, z: 6 });
compare('from the corner (17, 9): flank points past the walls', { seed: 3, x: 17, z: 9, hero: [12, 6] });
compare('the hero walking (it reads where you are NOW)', { seed: 11, x: -9, z: -4, input: { ...IDLE, mx: 0.6, mz: 0.3 } });
compare('the hero circling (and through the walls)', { seed: 12, x: 0, z: 7, input: { ...IDLE, mx: -1, mz: 0 } });
compare('a wave\'s speedMult 1.5 runs it faster (1.x _speedMult, enemy.js:1699)', { seed: 21, x: 6, z: -6, o: { speedMult: 1.5 }, spd: 2.4 * 1.5 });
compare('the SWIFT affix × 1.35 (main.js:9416)', { seed: 22, x: -7, z: 2, o: { affix: 'swift' }, spd: 2.4 * 1.35 });
compare('a SIREN surge × 1.6 (enemy.js:1698)', { seed: 23, x: 4, z: 5, surge: 1.6, spd: 2.4 * 1.6 });
compare('an elite (r 0.84 at the walls)', { seed: 24, x: 17.5, z: -9.5, hero: [15, -7], o: { variant: 'elite' }, r: 0.84 });
{
  // the wave's intervalMult reaches nothing on this cycle (1.x never reads _intervalMult for it)
  const a = world({ seed: 31 }), b = world({ seed: 31, o: { intervalMult: 0.4 } });
  let same = true;
  for (let i = 0; i < 60 * 15; i++) { step(a.w, IDLE); step(b.w, IDLE); if (a.g.x !== b.g.x || a.g.z !== b.g.z || a.g.s.state !== b.g.s.state) same = false; }
  check('intervalMult 0.4 changes nothing: the same cycle step for step', same && a.g.s.bursts === b.g.s.bursts && a.g.s.bursts > 0);
}
{
  // the same seed, the same run
  const a = compare('determinism, run one', { seed: 41, x: 3, z: -8 }), b = world({ seed: 41, x: 3, z: -8 });
  run(b.w, 60 * 20);
  check('… and a second world from the same seed ends exactly where the first did', a.g.x === b.g.x && a.g.z === b.g.z && a.g.s.bursts === b.g.s.bursts);
}

// ── the flank, over many seeds (enemy.js:1848-1856) ──────────────────
{
  let sides = { 1: 0, '-1': 0 }, badR = null, badA = null, n = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const { w, g } = world({ seed, x: 6, z: 2, hero: [1, -1] });
    for (let i = 0; i < 120 && g.s.state === 'visible'; i++) step(w, IDLE);
    if (g.s.state !== 'cloak') continue;
    n++;
    const h = w.hero, r0 = Math.hypot(g.s.tx - h.x, g.s.tz - h.z);
    const from = Math.atan2(g.z - h.z, g.x - h.x), to = Math.atan2(g.s.tz - h.z, g.s.tx - h.x);
    const turn = angDiff(to, from);
    sides[g.s.side]++;
    if (!(r0 >= 6.5 - 1e-9 && r0 < 8 + 1e-9)) badR = `seed ${seed}: ${r0}`;
    if (!(turn >= Math.PI / 2 - 1e-9 && turn <= Math.PI / 2 + 0.6 + 1e-9)) badA = `seed ${seed}: ${turn}`;
    const signed = Math.atan2(Math.sin(to - from), Math.cos(to - from));
    if (Math.sign(signed) !== g.s.side) badA = `seed ${seed}: turned ${signed} on side ${g.s.side}`;
  }
  check('every one of 300 bodies cloaks within 1.4 s of arriving', n === 300, `${n}`);
  check('… its flank point is 6.5–8 from the hero', !badR, badR);
  check('… a quarter turn and up to 0.6 rad more round you, on the side it drew', !badA, badA);
  check('… either side about half the time', sides[1] > 110 && sides['-1'] > 110, JSON.stringify(sides));
}

// ── the states, one at a time ────────────────────────────────────────
{
  const { w, g } = world({ seed: 2, x: 8, z: 3 });
  const t0 = g.s.t;
  let moved = false, n = 0;
  while (g.s.state === 'visible') { step(w, IDLE); n++; if (g.x !== 8 || g.z !== 3) moved = true; }
  check('visible: it stands where it is (no walk of its own) …', !moved);
  let k = 0, t = t0; do { t -= dt; k++; } while (t > 0);
  check('… for exactly its beat, counted down by dt, and hands over on the step it runs out', n === k, `${n} vs ${k}`);
  check('… which does not move it either', g.x === 8 && g.z === 3 && g.s.drew === 'visible' && g.cloak === 0);
  const x0 = g.x, z0 = g.z;
  step(w, IDLE);
  const d = Math.hypot(g.x - x0, g.z - z0), dir = Math.atan2(g.z - z0, g.x - x0), want = Math.atan2(g.s.tz - z0, g.s.tx - x0);
  check('cloak: it runs straight at the flank point at 2.4 u/s', near(d, 2.4 * dt, 1e-12) && near(dir, want, 1e-9) && g.cloak === 1 && g.s.drew === 'cloak');
  check('… facing where it runs', near(g.faceX, Math.cos(want), 1e-9) && near(g.faceZ, Math.sin(want), 1e-9));
}
{
  // arriving: within 0.3 of the point it stops and decloaks, that same step
  const { w, g } = world({ seed: 2, x: 8, z: 3 });
  g.s.state = 'cloak'; g.s.t = 2; g.s.tx = 8.29; g.s.tz = 3;
  step(w, IDLE);
  check('cloak: 0.29 from its point it does not move, and starts to decloak (ml ≤ 0.3, enemy.js:1863, 1867)',
    g.x === 8 && g.z === 3 && g.s.state === 'decloak' && g.s.t === 0.6 && g.s.drew === 'cloak' && g.cloak === 1);
  const w2 = world({ seed: 2, x: 8, z: 3 }), g2 = w2.g;
  g2.s.state = 'cloak'; g2.s.t = 2; g2.s.tx = 8.31; g2.s.tz = 3;
  step(w2.w, IDLE);
  check('… 0.31 from it, it takes its last stride (measured before the move) and keeps running', near(g2.x, 8 + 2.4 * dt, 1e-12) && g2.s.state === 'cloak');
  for (let i = 0; i < 4; i++) step(w2.w, IDLE);
  check('… then hands over within 0.3, standing where the stride left it', g2.s.state === 'decloak' && Math.abs(g2.s.tx - g2.x) <= 0.3);
}
{
  // the run's clock: a point past the wall pins it there until the clock ends
  const { w, g } = world({ seed: 2, x: 17, z: 0 });
  g.s.state = 'cloak'; g.s.t = 1; g.s.tx = 40; g.s.tz = 0;
  let n = 0;
  while (g.s.state === 'cloak' && n < 200) { step(w, IDLE); n++; }
  let k = 0, t = 1; do { t -= dt; k++; } while (t > 0);
  check('a flank point past the wall: it runs to the wall and holds there until its clock runs out', n === k && near(g.x, 19 - 0.7) && g.s.state === 'decloak', `${n} vs ${k}, x ${g.x}`);
}
{
  // decloak: 0.6 s fading in, standing still, then the burst
  const { w, g } = world({ seed: 2, x: 6, z: -4, hero: [-1, 1] });
  g.s.state = 'decloak'; g.s.t = 0.6;
  const ks = [];
  let shots = [], n = 0;
  while (!shots.length && n < 100) { shots = stepShots(w, IDLE); n++; if (!shots.length) ks.push(g.cloak); }
  check('decloak: it does not move', g.x === 6 && g.z === -4);
  check('… its cloak runs 1 → 0 linearly: max(t, 0)/0.6 each step', ks.every((c, i) => near(c, Math.max(0.6 - (i + 1) * dt, 0) / 0.6, 1e-9)) && ks[0] < 1 && ks[ks.length - 1] > 0,
    ks.slice(0, 3).concat(ks.slice(-2)).map((c) => c.toFixed(4)).join(' '));
  let k = 0, t = 0.6; do { t -= dt; k++; } while (t > 0);
  check('… and the burst comes on the step the 0.6 s runs out', n === k, `${n} vs ${k}`);
  const aim = Math.atan2(1 - -4, -1 - 6);
  const offs = shots.map((b) => Math.atan2(Math.sin(Math.atan2(b.vz, b.vx) - aim), Math.cos(Math.atan2(b.vz, b.vx) - aim)));
  check('the burst: 3 shots from its centre at −0.18, 0, +0.18 rad about the aim at you, 7 u/s, 0x88eeff', shots.length === 3
    && shots.every((b) => b.x === 6 && b.z === -4 && near(Math.hypot(b.vx, b.vz), 7, 1e-12) && b.color === 0x88eeff && b.src === 'cloaker' && !b.revenge && !b.homing)
    && near(offs[0], -0.18, 1e-12) && near(offs[1], 0, 1e-12) && near(offs[2], 0.18, 1e-12), offs.join(', '));
  check('… snapped back to full view, visible again for 0.9–1.4 s', g.cloak === 0 && g.s.drew === 'burst' && g.s.state === 'visible' && g.s.t >= 0.9 && g.s.t < 1.4 && g.s.bursts === 1);
  const gs = w.events.filter((e) => e.type === 'gelShot' && e.kind === 'cloaker');
  check('… with one gelShot for the sound, naming the body, its aim and its 3 shots', gs.length === 1 && gs[0].id === g.id && gs[0].n === 3 && near(gs[0].angle, aim, 1e-12));
}
{
  // a full pool refuses the burst's shots, and the cycle goes on
  const { w, g } = world({ seed: 2 });
  g.s.state = 'decloak'; g.s.t = dt / 2;
  w.gelBullets = T.bullets.maxGel;
  step(w, IDLE);
  check('a full gel pool: no shots, the cycle goes on (1.x spawnDir returns on an empty pool, bullet.js:92-93)', shotsOf(w).length === 0 && g.s.state === 'visible' && w.refused === 3);
}

// ── cloaked, it can still be shot (main.js:10636-10720; enemy.js:1603-1667) ──
const shootAt = (w, g) => api.heroBullet(w, g.x - 0.5, g.z, 0);
for (const state of ['visible', 'cloak', 'decloak']) {
  const { w, g } = world({ seed: 2, x: 6, z: 5 });
  g.s.state = state; g.s.t = 5; g.s.tx = 6; g.s.tz = -5;
  step(w, IDLE);
  shootAt(w, g); step(w, IDLE);
  check(`${state}: a shot lands — a hit, 1 hp, the flash`, w.events.some((e) => e.type === 'hit' && e.id === g.id) && g.hp === 2 && g.flash > 0 && !w.bullets.some((b) => b.hero),
    `hp ${g.hp}`);
}
{
  const { w, g } = world({ seed: 2, x: 6, z: 5 });
  g.s.state = 'cloak'; g.s.t = 50; g.s.tx = 6; g.s.tz = -5;
  for (let i = 0; i < 3; i++) { step(w, IDLE); shootAt(w, g); }
  step(w, IDLE);
  check('… and three shots kill it mid-shimmer', !g.alive && w.events.some((e) => e.type === 'kill' && e.kind === 'cloaker'));
}
{
  // the dash cuts it cloaked, as any body (the core's hitTest default)
  const { w, g } = world({ seed: 2, x: 2, z: 0 });
  g.s.state = 'cloak'; g.s.t = 50; g.s.tx = 2; g.s.tz = 8;
  w.hero.dashLevel = 1;
  run(w, 12, { ...IDLE, mx: 1, dash: true });
  check('a level-1 dash cuts a cloaked one like any body', !g.alive);
}

// ── it hurts only by its shots ───────────────────────────────────────
{
  const { w, g } = world({ seed: 2, x: 0.5, z: 0 });
  g.s.state = 'visible'; g.s.t = 50;
  run(w, 120);
  check('standing on you, it costs nothing in classic (not a MELEE_TYPE, main.js:2410-2421)', w.hero.lives === 1e9 && w.hero.mercy === 0);
}
{
  const { w, g } = world({ seed: 2, x: 5, z: 0, mode: 'hardcade' }); w.wave = 6;
  api.kill(w, g, 'hero');
  for (let i = 0; i < 120 && w.seeds.length; i++) step(w, IDLE);   // v103: the corpse warns before it bites
  const rv = w.bullets.filter((b) => b.revenge);
  const aim = Math.atan2(0 - 0, 0 - 5);
  check('HARDCADE from wave 3: its corpse bites AIMED, 3 slow shots 0.14 apart at you (tuning.js:496-497, 510)',
    w.events.some((e) => e.type === 'revenge' && e.kind === 'cloaker') && rv.length === 3
    && rv.every((b) => near(Math.hypot(b.vx, b.vz), 7 * T.revenge.speedMult, 1e-9))
    && near(angDiff(Math.atan2(rv[0].vz, rv[0].vx), aim), 0.14, 1e-9) && near(angDiff(Math.atan2(rv[1].vz, rv[1].vx), aim), 0, 1e-9));
}

// ── the outside world still moves it ─────────────────────────────────
{
  // 1.x ran the swarm forces before each body's update (main.js:10231-10360,
  // 10369), so ex/ez, where the burst leaves from, is where the forces left it
  // THIS frame (enemy.js:1680, 1876-1879), not where it stood the frame before
  const { w, g } = world({ seed: 2, x: 6, z: 3, anchored: false });
  g.s.state = 'decloak'; g.s.t = dt / 2;
  run(w, 0);
  const shots = stepShots(w, IDLE);
  check('a free body bursts from where this step\'s swarm forces put it (1.x reads ex/ez after them)',
    shots.length === 3 && shots.every((b) => b.x === g.x && b.z === g.z) && (g.x !== g.px || g.z !== g.pz),
    `shot (${shots[0]?.x}, ${shots[0]?.z}), body (${g.x}, ${g.z}), start (${g.px}, ${g.pz})`);
}
{
  // the HUNTER forces (weave, current) act in every state: standing, it drifts
  const { w, g } = world({ seed: 2, x: 6, z: 3, anchored: false });
  g.s.t = 50;
  run(w, 60);
  check('free, standing visible, the HUNTER forces drift it (1.x applied them to every body before its update)', g.s.state === 'visible' && Math.hypot(g.x - 6, g.z - 3) > 0.05,
    `${g.x.toFixed(3)}, ${g.z.toFixed(3)}`);
}
{
  // a PUSH dash's knock moves it: it sets its velocity, never its position
  const { w, g } = world({ seed: 2, x: 6, z: 3 });
  g.s.t = 50; g.kx = 6;
  step(w, IDLE);
  check('a knock carries it while it stands', g.x > 6 + 0.08 && g.z === 3, `${g.x}`);
  const r2 = world({ seed: 2, x: 6, z: 3 });
  r2.g.s.state = 'cloak'; r2.g.s.t = 50; r2.g.s.tx = 6; r2.g.s.tz = -5; r2.g.kx = 6;
  step(r2.w, IDLE);
  check('… and while it runs (the knock adds to the run)', r2.g.x > 6 + 0.08 && near(r2.g.z, 3 - 2.4 * dt, 1e-12), `${r2.g.x}, ${r2.g.z}`);
}

// ── the look ─────────────────────────────────────────────────────────
{
  // the opacity it draws, as 1.x's _setOpacity calls drew it
  check('visible: opacity 1', opacity(L, 0, 'visible', 3) === 1);
  check('cloak: 0.14 + 0.05·sin(9·clock) (enemy.js:1860)', [0, 0.3, 1.7, 5].every((c) => near(opacity(L, 1, 'cloak', c), 0.14 + 0.05 * Math.sin(c * 9), 1e-12)));
  check('decloak: 0.14 + 0.86·k (enemy.js:1871)', [0, 0.25, 0.5, 0.9].every((k) => near(opacity(L, 1 - k, 'decloak', 2), 0.14 + 0.86 * k, 1e-12)));
  check('burst: back to 1 (enemy.js:1874)', opacity(L, 0, 'burst', 1) === 1);
  check('the death: (1 − t)² × 0.82 over the 0.28 s pop (enemy.js:2983-2984)',
    near(deathOpacity(L, 0.28, 0.28), 0.82) && near(deathOpacity(L, 0.28, 0.14), 0.205)
    && near(deathOpacity(L, 0.28, 0.07), 0.82 * 0.25 * 0.25, 1e-12) && deathOpacity(L, 0.28, 0) === 0);

  const scene = new THREE.Scene();
  let matArgs = null;
  const ctx = { THREE, TSL: THREE.TSL, GEL_TIME: { value: 0 }, T, S, kind: 'cloaker', scene, geo: { blob: new THREE.SphereGeometry(1, 8, 6) },
    gelMaterial: (hex, fam, r, o) => { matArgs = [hex, fam, r, o]; const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color(); m.gel = { tear: { value: 0 } }; return m; } };
  const v = { kind: 'cloaker', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0.7, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
  check('it builds the plain blob gel in its own colour, on the shared dome, transparent from birth (enemy.js:1206)',
    matArgs[0] === 0x66ddee && matArgs[1] === 'blob' && matArgs[2] === 1 && v.mat.transparent === true && v.mat.opacity === 1 && v.body.geometry === ctx.geo.blob && !v.own);
  check('… on its own clock, started at U·2π', v.clock0 >= 0 && v.clock0 < Math.PI * 2);
  const { w, g } = world({ seed: 2 });
  const sync = (tm) => { v.mat.emissive.setScalar(0); look.update(v, g, w, tm, 1); };   // the core clears the glow first (actors.js sync)
  sync(1.0);
  check('visible: drawn at 1, no glow', v.mat.opacity === 1 && v.mat.emissive.getHex() === 0);
  g.s.drew = 'cloak'; g.cloak = 1; sync(1.0);
  check('cloak: drawn at 0.14 + 0.05·sin(9·clock)', near(v.mat.opacity, 0.14 + 0.05 * Math.sin((1.0 + v.clock0) * 9), 1e-12) && v.mat.emissive.getHex() === 0);
  g.s.drew = 'decloak'; g.cloak = 0.5;
  const c0 = v.clock0;
  // a clock where sin(24·clock) > 0, and one where it is not
  const tOn = (Math.PI / 4) / 24 - c0 + 2 * Math.PI, tOff = (Math.PI * 1.25) / 24 - c0 + 2 * Math.PI;
  sync(tOn);
  check('decloak: drawn at 0.57, strobing 0x226677 on the bright half', near(v.mat.opacity, 0.14 + 0.86 * 0.5, 1e-12) && v.mat.emissive.getHex() === 0x226677);
  sync(tOff);
  check('… and black on the dark half (sin(24·clock), enemy.js:1872)', v.mat.emissive.getHex() === 0x000000);
  g.flash = 0.1; v.mat.emissive.setScalar(0.6); look.update(v, g, w, tOn, 1);
  check('the hit flash outranks the strobe (enemy.js:2650-2652)', near(v.mat.emissive.r, 0.6, 1e-6));
  g.flash = 0; g.affix = 'volatile'; v.mat.emissive.setHex(0x662200); look.update(v, g, w, tOn, 1);
  check('… and so does a VOLATILE body\'s smoulder (enemy.js:2653-2656)', v.mat.emissive.getHex() === 0x662200);
  g.affix = null;
  L.strobe = false; sync(tOn);
  check('strobe off: 1.x as it drew, the fade alone', v.mat.emissive.getHex() === 0 && near(v.mat.opacity, 0.57, 1e-12));
  L.strobe = true;
  g.s.drew = 'burst'; g.cloak = 0; sync(tOn);
  check('burst: drawn at 1, the glow off (enemy.js:1874-1875)', v.mat.opacity === 1 && v.mat.emissive.getHex() === 0);
  // the death: the core stops updating; the body fades itself as it is drawn
  g.s.drew = 'cloak'; g.cloak = 1; sync(2);
  v.dyingT = 0.21; v.body.onBeforeRender();
  check('killed mid-shimmer, it pops back to 0.82 and fades (1 − t)² as it is drawn', near(v.mat.opacity, 0.82 * 0.75 * 0.75, 1e-12), `${v.mat.opacity}`);
  v.dyingT = 0; v.mat.opacity = 0.3;
  v.body.onBeforeRender();
  check('… and a living body\'s draw leaves its opacity to update()', v.mat.opacity === 0.3);
  look.reset(v);
  check('reset: a pooled view comes back fully there, on a fresh clock', v.mat.opacity === 1 && v.clock0 >= 0 && v.clock0 < Math.PI * 2);
}

if (failed) { console.log(`✗ cloaker: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ cloaker: ${passed} checks`);
