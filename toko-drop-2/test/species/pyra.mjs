#!/usr/bin/env node
// pyra.mjs — PYRA's own checks, in bare node: 1.x's numbers (enemy.js:592,
// 652, 935-971, 1474, 1641-1662, 2533-2535, 2727, 2792-2808; main.js:4476-4479,
// 5038, 9385, 9403, 9408; tuning.js:31, 295, 306, 511; audio.js:247),
// asserted against the sim on its fixed 1/60 s step, and its look against a
// real three. The volley timeline is checked against an ORACLE: 1.x's own
// per-frame arithmetic (the spin in the movement switch, then the fire tick,
// then the frame's collisions), run from the same start, so the steps the
// fans leave on and the angles they leave at must match 1.x's frame for frame.
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=157';
import { TUNING as T } from '../../js/tuning.js?v=157';
import { waveScale } from '../../js/sim/director/arcade.js?v=157';
import behaviour, { holeCount } from '../../js/sim/species/pyra.js?v=157';
import look from '../../js/render/looks/pyra.js?v=157';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const sameAngle = (a, b, e = 1e-9) => Math.abs(wrap(a - b)) <= e;

const S = T.species.pyra, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const evs = (w, type) => w.events.filter((e) => e.type === type);

// A world with one PYRA (not anchored: it is FIXED, and nothing else is
// there to crowd it) and a hero who never runs out of lives at the origin.
function world({ seed = 1, mode = 'arcade', x = 10, z = 0, o = {}, dashMode = 'pass', hpMult = 1 } = {}) {
  const w = createWorld({ seed, mode, dashMode, hpMult });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  const g = api.spawn(w, 'pyra', x, z, o);
  return { w, g };
}
// a hero bullet that touches the ring in the next step
const shoot = (w, g) => api.heroBullet(w, g.x, g.z, 0);
// the gel bullets this step made (they are the newest; bullets from earlier volleys have moved)
const fresh = (w, g) => w.bullets.filter((b) => !b.hero && b.x === b.px + b.vx * dt && near(b.px, g.x) && near(b.pz, g.z) && b.life === T.bullets.life - dt);

// 1.x per frame (enemy.js:2533-2535, 2792-2808, 1648): the spin, the fire
// tick, then the frame's collisions (a hit closes a hole: +0.6 rad/s)
function oracle(steps, { iM = 1, hits = new Set() } = {}) {
  let spin = 0, spd = S.spin, fireT = S.fireInterval * iM;
  const volleys = [];
  for (let i = 1; i <= steps; i++) {
    spin += spd * dt;
    fireT -= dt;
    if (fireT <= 0) { fireT = S.fireInterval * iM; volleys.push({ i, spin }); }
    if (hits.has(i)) spd += S.spinPerHole;
  }
  volleys.spin = spin;
  return volleys;
}

// ── the CFG row and its own numbers ───────────────────────────────────
{
  check('CFG: orange 0xff9900, radius 1.0, speed 0, hp 4, gold 0xffcc44 fans every 2.5 s (1.x enemy.js:592)',
    S.color === 0xff9900 && S.radius === 1.0 && S.speed === 0 && S.hp === 4 && S.bulletColor === 0xffcc44 && S.fireInterval === 2.5);
  check('its own body, FIXED, harmless to touch in classic, bites FAN, never takes the elite hp multiplier',
    S.family === 'custom' && S.role === 'FIXED' && S.contact === false && S.revenge === 'FAN' && S.noHpMult === true);
  check('FIXED is 1.x\'s: no dodge, no flock, no current, no weave (1.x tuning.js:295)',
    ['dodge', 'flock', 'current', 'weave'].every((k) => T.movement.roles.FIXED[k] === 0));
  check('the holes: tier ⌊(1 − im)/0.09⌋, 4 / 6 / 8 below 3 / below 5 / else (1.x enemy.js:953-954)',
    S.holes.tierStep === 0.09 && S.holes.tiers.join() === '3,5' && S.holes.counts.join() === '4,6,8');
  check('the spin: 1.8 rad/s, +0.6 a hole (1.x enemy.js:970, 1648)', S.spin === 1.8 && S.spinPerHole === 0.6);
  check('the fan: 3 shots π/12 apart, i.e. a π/6 spread (1.x enemy.js:2801-2803)', S.fan.shots === 3 && near(S.fan.step, Math.PI / 12));
  check('the death screen calls it a "Pyra spinner" (1.x main.js:5038)', S.deathLabel === 'Pyra spinner');
  check('it dies with 1.x\'s pyra voice: a sine 1300 → 550 Hz over 0.16 s at 0.20, no noise (1.x audio.js:247)',
    S.deathSound && S.deathSound.wave === 'sine' && S.deathSound.f0 === 1300 && S.deathSound.f1 === 550 && S.deathSound.dur === 0.16
    && S.deathSound.vol === 0.20 && !S.deathSound.noiseVol);
  const L = S.look;
  check('the look: 1.x\'s pyra satin (roughness 0.10, transmission 0.25, wobble 0.35; 1.x tuning.js:31)',
    L.roughness === 0.10 && L.transmission === 0.25 && L.wobble === 0.35);
  check('… a torus 0.9 / 0.15, 8 × 20; gold Phong cones 0.18 × 0.4, 5 sides, shininess 80 (1.x enemy.js:944, 956-959)',
    L.ring.r === 0.9 && L.ring.tube === 0.15 && L.ring.radialSegs === 8 && L.ring.tubularSegs === 20
    && L.hole.r === 0.18 && L.hole.h === 0.4 && L.hole.sides === 5 && L.hole.color === 0xffcc44 && L.hole.shininess === 80);
  check('… a lost hole throws 3 gold chunks of 0.12, 3 u/s each along a random heading, up 2–5 (1.x enemy.js:1651-1658)',
    L.popChunks === 3 && L.popSize === 0.12 && L.popSpeed === 3 && L.popUp.join() === '2,5' && L.popColor === 0xffcc44);
  const src = readFileSync(new URL('../../js/sim/species/pyra.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
}

// ── the holes by wave ─────────────────────────────────────────────────
{
  const n = (im) => holeCount(S, im);
  check('4 holes at intervalMult 1 and at 0.78 (tiers 0, 2)', n(1) === 4 && n(0.78) === 4);
  check('6 at 0.725 (tier 3) and at 0.56 (tier 4)', n(0.725) === 6 && n(0.56) === 6);
  check('8 at 0.505 (tier 5) and at the floor 0.35', n(0.505) === 8 && n(0.35) === 8);
  check('an intervalMult of 0 or less is tier 0: 4 (1.x\'s guard)', n(0) === 4 && n(-1) === 4);
  const byWave = [5, 6, 9, 10, 20].map((wv) => n(waveScale(wv).intervalMult));
  check('in the arcade: 4 at wave 5 (its first), 6 from wave 6, 8 from wave 10', byWave.join() === '4,6,6,8,8', byWave.join());
  for (const im of [1, 0.725, 0.505]) {
    const { g } = world({ o: { intervalMult: im } });
    const k = g.s.holes.length;
    check(`im ${im}: ${k} holes evenly round the ring from angle 0, all open; hp = maxHp = ${k}`,
      k === n(im) && g.s.holes.every((h, i) => near(h.angle, (i / k) * Math.PI * 2) && h.alive) && g.hp === k && g.maxHp === k);
  }
  const e = world({ o: { variant: 'elite' } }).g;
  check('elite: still 4 hp (noHpMult), the ring 1.2 × as big', e.hp === 4 && e.maxHp === 4 && near(e.r, 1.2));
  // a director's boss would ask 3 × 4 = 12 (1.x main.js:9383-9386, which PYRA is exempt from)
  const b = world({ o: { isBoss: true, hp: 12 } }).g;
  check('boss: the hole count, not the director\'s hp (1.x: 3× exempt, main.js:9385), 1.5 × as big',
    b.hp === 4 && b.maxHp === 4 && b.s.holes.length === 4 && near(b.r, 1.5), `hp ${b.hp}`);
  const bs = world({ o: { isBoss: true, hp: 12, intervalMult: 0.505 }, hpMult: 3 }).g;
  check('… an 8-hole boss stays at 8 under the bullet-sponge switch (it spares bosses)', bs.hp === 8 && bs.maxHp === 8, `hp ${bs.hp}`);
  const ee = world({ o: { variant: 'elitelite' } }).g;
  check('elitelite: still 4 hp (1.x main.js:9408), its CFG size', ee.hp === 4 && near(ee.r, 1.0));
  const x = world({ o: { hp: 9 } }).g;
  check('any spawn hp is overridden by the hole count (1.x enemy.js:967)', x.hp === 4);
}

// ── the spin and the volleys, frame for frame ─────────────────────────
for (const iM of [1, 0.89, 0.505]) {
  const { w, g } = world({ seed: 7, o: { intervalMult: iM } });
  const N = 1200, or = oracle(N, { iM });
  const volleys = [];
  let anglesOk = true, countOk = true, fromOk = true, styleOk = true, spinOff = 0, shotEv = 0, ospin = 0;
  for (let i = 1; i <= N; i++) {
    step(w, IDLE);
    ospin += S.spin * dt;                      // 1.x: group.rotation.y += _spinSpeed × dt, no hits here
    spinOff = Math.max(spinOff, Math.abs(g.s.spin - ospin));
    const o = or.find((v) => v.i === i);
    if (o) spinOff = Math.max(spinOff, Math.abs(g.s.spin - o.spin));
    const shots = fresh(w, g);
    if (evs(w, 'gelShot').length) shotEv++;
    if (!shots.length) continue;
    volleys.push(i);
    const live = g.s.holes.filter((h) => h.alive);
    if (shots.length !== live.length * 3) countOk = false;
    // every live hole: a fan of 3 about spin + its angle, π/12 apart
    const want = [];
    for (const h of live) for (let j = -1; j <= 1; j++) want.push(g.s.spin + h.angle + j * S.fan.step);
    const got = shots.map((b) => Math.atan2(b.vz, b.vx));
    if (!want.every((a) => got.some((q) => sameAngle(q, a, 1e-9)))) anglesOk = false;
    if (!shots.every((b) => near(b.px, g.x) && near(b.pz, g.z))) fromOk = false;
    if (!shots.every((b) => b.color === 0xffcc44 && b.src === 'pyra' && near(b.speed, T.bullets.gelSpeed) && b.r === T.bullets.gelRadius && !b.homing)) styleOk = false;
  }
  const tag = `iM ${iM}`;
  check(`${tag}: it fires on 1.x's frames (${or.length} volleys)`, JSON.stringify(volleys) === JSON.stringify(or.map((v) => v.i)) && volleys.length > 0,
    `${volleys.slice(0, 6)} vs ${or.slice(0, 6).map((v) => v.i)}`);
  check(`${tag}: the first after 2.5 × im (the clock starts full, no random start), then every 2.5 × im rounded up to a step`,
    (() => { const per = Math.ceil(S.fireInterval * iM / dt - 1e-9); return Math.abs(volleys[0] - per) <= 1 && volleys.slice(1).every((v, k) => Math.abs(v - volleys[k] - per) <= 1); })(),
    `${volleys.slice(0, 5)}`);
  check(`${tag}: the spin is 1.x's, step for step`, spinOff < 1e-9, `${spinOff}`);
  check(`${tag}: each volley is 3 bullets a hole (${3 * g.s.holes.length})`, countOk);
  check(`${tag}: each hole fans about the spin + its own angle, −π/12, 0, +π/12`, anglesOk);
  check(`${tag}: from the ring's centre, in gold, at the gel speed, unhoming, filed under pyra`, fromOk && styleOk);
  check(`${tag}: one gelShot event a volley`, shotEv === volleys.length);
}
{
  // 2.5 s counted down in 1/60 s steps reaches ≤ 0 on step 151, not 150 (the
  // float sum of 150 steps is a hair short of 2.5) — 1.x's frame too
  const { w, g } = world();
  for (let i = 0; i < 150; i++) step(w, IDLE);
  const none = w.bullets.length;
  step(w, IDLE);
  const first = w.bullets.filter((b) => !b.hero);
  check('the first volley on step 151 (2.517 s): 12 bullets, the four fan centres 90° apart at spin 1.8 × 151 steps',
    none === 0 && first.length === 12 && near(g.s.spin, 1.8 * 151 * dt, 1e-9)
    && [0, 1, 2, 3].every((k) => first.some((b) => sameAngle(Math.atan2(b.vz, b.vx), g.s.spin + (k * Math.PI) / 2))), `${first.length} @ ${g.s.spin}`);
}

// ── shots take holes ──────────────────────────────────────────────────
{
  const { w, g } = world({ seed: 3 });
  const hits = new Set(), pops = [];
  // shots land on steps 40, 200, 330: between volleys
  for (let i = 1; i <= 360; i++) {
    if (i === 40 || i === 200 || i === 330) { shoot(w, g); hits.add(i); }
    const open = g.s.holes.map((h) => h.alive);
    step(w, IDLE);
    for (const e of evs(w, 'holePop')) {
      const closed = g.s.holes.filter((h, k) => open[k] && !h.alive);
      pops.push({ i, ...e, want: closed.length === 1 ? g.s.spin + closed[0].angle : NaN, left: g.s.holes.filter((h) => h.alive).length });
    }
  }
  check('each shot closes one hole and takes one hp', pops.length === 3 && g.hp === 1 && g.s.holes.filter((h) => h.alive).length === 1,
    `${pops.length} pops, hp ${g.hp}`);
  check('… on the step it lands', pops.map((p) => p.i).join() === '40,200,330');
  check('… and the ring spins 0.6 rad/s faster for each (1.8 → 3.6)', near(g.s.spinSpeed, 3.6));
  const or = oracle(360, { hits });
  check('the spin with the hits is 1.x\'s, step for step', near(g.s.spin, or.spin, 1e-9), `${g.s.spin} vs ${or.spin}`);
  check('… and so are its volleys (the hits land between them)', or.map((v) => v.i).join() === '151,302', or.map((v) => v.i).join());
  check('… a pop names where its hole was drawn (the spin then + its angle) and how many are left',
    pops.every((p, k) => sameAngle(p.angle, p.want, 1e-9) && p.left === 3 - k && p.id === g.id));
  check('the squash spring never moves it (1.x enemy.js:2727): sq stays 1 through the hits', g.sq === 1 && g.sqV === 0);
  // the fourth shot kills it
  shoot(w, g); step(w, IDLE);
  check('the fourth shot kills it, the last hole closing with it', !g.alive && g.s.holes.every((h) => !h.alive) && w.events.some((e) => e.type === 'kill' && e.id === g.id));
}
{
  // a closed hole's line goes quiet: after one shot the next volley is 9 bullets, none along the closed hole
  const { w, g } = world({ seed: 5 });
  shoot(w, g); step(w, IDLE);
  const closed = g.s.holes.find((h) => !h.alive);
  for (let i = 2; i <= 151; i++) step(w, IDLE);
  const shots = w.bullets.filter((b) => !b.hero);
  check('one hole shot off: the next volley is 9 bullets', shots.length === 9, `${shots.length}`);
  check('… and nothing leaves along the closed hole\'s line', !shots.some((b) => sameAngle(Math.atan2(b.vz, b.vx), g.s.spin + closed.angle, 1e-6)));
  check('… which hole closes is drawn from the run\'s seed: the same seed closes the same hole',
    (() => { const q = world({ seed: 5 }); shoot(q.w, q.g); step(q.w, IDLE); return q.g.s.holes.findIndex((h) => !h.alive) === g.s.holes.indexOf(closed); })());
}
{
  // a WARDEN's aura blocks the shot before 1.x's hit(): nothing is lost
  const { w, g } = world();
  const ward = api.spawn(w, 'warden', g.x - 2, g.z, { speedMult: 0 });
  ward.anchored = true;
  step(w, IDLE);
  shoot(w, g); step(w, IDLE);
  check('under a WARDEN\'s aura a shot is blocked: every hole stays open, hp 4', g.s.holes.every((h) => h.alive) && g.hp === 4 && evs(w, 'block').length === 1);
  g.shield = true;
  check('… (onHit itself takes nothing from a shielded ring)', (behaviour.onHit(w, g, {}, api), g.s.holes.every((h) => h.alive)));
}

// ── the bullet-sponge test switch spreads the holes over the hp ───────
{
  const { w, g } = world({ hpMult: 2 });
  check('w.hpMult 2: 8 hp for its 4 holes', g.hp === 8 && g.maxHp === 8 && g.s.holes.length === 4);
  shoot(w, g); step(w, IDLE);
  const open1 = g.s.holes.filter((h) => h.alive).length;
  shoot(w, g); step(w, IDLE);
  const open2 = g.s.holes.filter((h) => h.alive).length;
  check('… a hole closes every second hit (⌈hp · 4 / 8⌉ open)', open1 === 4 && open2 === 3 && g.hp === 6, `${open1} ${open2} ${g.hp}`);
}

// ── it never moves on its own; dashes ─────────────────────────────────
{
  const { w, g } = world({ x: 6, z: 3 });
  for (let i = 0; i < 600; i++) step(w, IDLE);
  check('it never walks, and the swarm forces leave it be (FIXED): it stands where it was put for 10 s', g.x === 6 && g.z === 3);
}
{
  const { w, g } = world({ x: 1.5, z: 0, dashMode: 'push' });
  for (let i = 0; i < 10; i++) step(w, IDLE);
  step(w, { mx: 1, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: true });
  let moved = 0;
  for (let i = 0; i < 30; i++) { step(w, IDLE); moved = Math.max(moved, Math.hypot(g.x - 1.5, g.z)); }
  check('the PUSH dash leaves it standing (the one FIXED body) and, at dash level 0, takes nothing',
    moved < 1e-9 && g.kx === 0 && g.kz === 0 && g.hp === 4 && g.s.holes.every((h) => h.alive), `moved ${moved}`);
}
{
  const cut = T.hero.cut.hits;
  const { w, g } = world({ x: 2.5, z: 0, dashMode: 'cut' });
  const pops = [];
  step(w, { mx: 1, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: true });
  for (let i = 0; i < 12 && g.alive; i++) { pops.push(...evs(w, 'holePop')); step(w, IDLE); }
  pops.push(...evs(w, 'holePop'));
  check(`the CUT dash takes ${cut} hp, and its ${cut} holes close with it (the hp is the holes)`,
    g.alive && g.hp === 4 - cut && g.s.holes.filter((h) => h.alive).length === 4 - cut && pops.length === cut, `hp ${g.hp}, ${pops.length} pops`);
  check(`… spinning ${cut} × 0.6 faster`, near(g.s.spinSpeed, S.spin + cut * S.spinPerHole));
  // a two-hole ring dies to the cut, and both holes go with it
  const q = world({ x: 2.5, z: 0, dashMode: 'cut' });
  shoot(q.w, q.g); step(q.w, IDLE); shoot(q.w, q.g); step(q.w, IDLE);
  const qp = [];
  step(q.w, { mx: 1, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: true });
  for (let i = 0; i < 12 && q.g.alive; i++) { qp.push(...evs(q.w, 'holePop')); step(q.w, IDLE); }
  qp.push(...evs(q.w, 'holePop'));
  check('… a two-hole ring dies to it, both holes closing as it goes', !q.g.alive && q.g.s.holes.every((h) => !h.alive) && qp.length === 2);
  // the hero's dash comes before the bodies' steps, so a hole cut off is shut
  // before that same step's volley (1.x: every lost hp was a hit(), and a
  // hit's hole never fired again)
  const c = world({ x: 1.2, z: 0, dashMode: 'cut' });
  c.g.s.fireT = dt / 2;                      // the volley is due this step
  step(c.w, { mx: 1, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: true });
  const cv = c.w.bullets.filter((b) => !b.hero);
  check(`… and a ring cut on the step it fires sends ${3 * (4 - cut)} bullets, none along a cut hole`,
    evs(c.w, 'dashCut').length === 1 && cv.length === 3 * (4 - cut)
    && c.g.s.holes.filter((h) => !h.alive).every((h) => !cv.some((b) => sameAngle(Math.atan2(b.vz, b.vx), c.g.s.spin + h.angle, 1e-6))),
    `${evs(c.w, 'dashCut').length} cuts, ${cv.length} bullets`);
}
{
  // a kill that takes no hp (dash level 1 in 1.x's own PASS dash) is 1.x's
  // `e.hp = 1; e.hit()` (main.js:4783, 9534, 9880, 11261): one hole still goes
  const { w, g } = world({ x: 1.2, z: 0 });
  w.hero.dashLevel = 1;
  step(w, { mx: 1, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: true });
  const kp = evs(w, 'holePop');
  check('a dash-level kill (hp untouched) still closes one hole, and pops it, as it dies',
    !g.alive && g.hp === 4 && kp.length === 1 && kp[0].left === 3 && g.s.holes.filter((h) => !h.alive).length === 1,
    `alive ${g.alive}, ${kp.length} pops`);
}

// ── HARDCADE: the FAN bite ────────────────────────────────────────────
{
  const { w, g } = world({ mode: 'hardcade' });
  w.wave = 6;
  for (let i = 0; i < 4 && g.alive; i++) { shoot(w, g); step(w, IDLE); }
  for (let i = 0; i < 120 && w.seeds.length; i++) step(w, IDLE);   // v103: the corpse warns before it bites
  const R = T.revenge, fan = w.bullets.filter((b) => b.revenge), n = Math.max(1, Math.round(R.fan.count * R.density));
  const aim = Math.atan2(w.hero.z - g.z, w.hero.x - g.x);
  check(`HARDCADE: its corpse bites a FAN of ${n}, ${R.fan.spread} rad apart, at the hero`,
    !g.alive && fan.length === n && fan.every((b, k) => sameAngle(Math.atan2(b.vz, b.vx), aim + (k - (n - 1) / 2) * R.fan.spread, 1e-9)), `${fan.length}`);
}

// ── the look ──────────────────────────────────────────────────────────
{
  let matArgs = null;
  const ctx = { THREE, TSL: null, GEL_TIME: { value: 0 }, T, S, scene: new THREE.Scene(), geo: {},
    gelMaterial: (hex, fam, r, o) => {
      matArgs = [hex, fam, r, o];
      const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color();
      m.gel = { hit: { value: 0 }, hitDir: { value: new THREE.Vector2() }, tear: { value: 0 }, wobble: { value: o?.wobble }, radius: { value: r } };
      return m;
    } };
  const make = () => {
    const v = { kind: 'pyra', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
    v.squash.add(v.body); v.root.add(v.squash); ctx.scene.add(v.root);
    return v;
  };
  const v = make();
  check('it builds its own body in 1.x\'s pyra satin: 0xff9900, uRadius 1.0, wobble 0.35, roughness 0.10, transmission 0.25',
    v.own === true && matArgs[0] === 0xff9900 && matArgs[2] === 1.0 && matArgs[3].wobble === 0.35 && near(v.mat.roughness, 0.10) && near(v.mat.transmission, 0.25));
  check('… with no hit ripple and no death thrash for the core to drive (1.x: blobs only)', v.mat.gel === undefined && v.gel && v.gel.hit);
  const tp = v.ring.geometry.parameters;
  check('the ring: torus 0.9 / 0.15, 8 × 20, in the gel', near(tp.radius, 0.9) && tp.tube === 0.15 && tp.radialSegments === 8 && tp.tubularSegments === 20 && v.ring.material === v.mat);
  const cp = v.cones[0].geometry.parameters;
  check('the holes: 8 cones built, 0.18 × 0.4, 5 sides, gold Phong at shininess 80',
    v.cones.length === 8 && cp.radius === 0.18 && cp.height === 0.4 && cp.radialSegments === 5
    && v.holeMat.isMeshPhongNodeMaterial && v.holeMat.color.getHex() === 0xffcc44 && v.holeMat.shininess === 80);

  const { w, g } = world({ seed: 9, x: 0, z: 0 });
  w.hero.x = w.hero.px = 8;
  for (let i = 0; i < 37; i++) step(w, IDLE);
  v.root.position.set(g.x, 0, g.z);
  look.update(v, g, w, 0, 1);
  v.root.updateMatrixWorld(true);
  const ringY = new THREE.Vector3().setFromMatrixPosition(v.ring.matrixWorld).y;
  check('it floats with its centre at the CFG radius, 1.0 above the floor', near(ringY, 1.0) && near(v.hub.scale.x, 1));
  // laid flat as 1.x laid it: the torus in its own XY plane, the MESH turned
  // π/2 about x (1.x enemy.js:947), so the gel graph reads 1.x's local frame
  const box = new THREE.Box3().setFromObject(v.ring, true);
  check('… laid flat by the mesh, as 1.x did: 2 × 1.05 across (a 20-sided torus, ±0.05), 2 × 0.15 deep, the geometry left in its XY plane',
    near(v.ring.rotation.x, Math.PI / 2) && near(box.max.x - box.min.x, 2.1, 0.05) && near(box.max.z - box.min.z, 2.1, 0.05)
    && near(box.max.y - box.min.y, 0.3, 1e-3) && near(v.ring.geometry.boundingBox?.max.z ?? (v.ring.geometry.computeBoundingBox(), v.ring.geometry.boundingBox.max.z), 0.15, 1e-6),
    `${(box.max.x - box.min.x).toFixed(3)} × ${(box.max.y - box.min.y).toFixed(3)} × ${(box.max.z - box.min.z).toFixed(3)}`);
  check('four cones show, one per hole', v.cones.filter((c) => c.visible).length === 4);
  // a cone is drawn where its hole fires: world angle spin + a, pointing out along it
  const drawn = (c) => { const p = new THREE.Vector3().setFromMatrixPosition(c.matrixWorld); return { a: Math.atan2(p.z, p.x), d: Math.hypot(p.x, p.z) }; };
  const dirOf = (c) => { const d = new THREE.Vector3(1, 0, 0).transformDirection(c.matrixWorld); return Math.atan2(d.z, d.x); };
  check('each cone sits on the ring at 0.9, at world angle spin + its angle: where its fans leave',
    g.s.holes.every((h, i) => near(drawn(v.cones[i]).d, 0.9, 1e-6) && sameAngle(drawn(v.cones[i]).a, g.s.spin + h.angle, 1e-6)));
  check('… and points out along that line', g.s.holes.every((h, i) => sameAngle(dirOf(v.cones[i]), g.s.spin + h.angle, 1e-6)));
  // and the volley agrees with the picture
  for (let i = 38; i <= 151; i++) step(w, IDLE);
  look.update(v, g, w, 1, 1); v.root.updateMatrixWorld(true);
  const shots = w.bullets.filter((b) => !b.hero).map((b) => Math.atan2(b.vz, b.vx));
  check('the first volley\'s fan centres leave along the drawn cones', v.cones.slice(0, 4).every((c) => shots.some((a) => sameAngle(a, drawn(c).a, 1e-6))));

  // the squash spring is undone (1.x never squashed it)
  g.sq = 1.3; v.squash.scale.set(1 / Math.sqrt(1.3), 1.3, 1 / Math.sqrt(1.3));
  look.update(v, g, w, 1, 1); v.root.updateMatrixWorld(true);
  const ws = new THREE.Vector3().setFromMatrixScale(v.hub.matrixWorld);
  check('the view\'s squash group is undone: the spinner keeps its own shape', near(ws.x, 1, 1e-9) && near(ws.y, 1, 1e-9) && near(ws.z, 1, 1e-9));
  g.sq = 1;
  v.squash.scale.set(1, 1, 1);

  // a lost hole pops three gold chunks from where it was drawn
  const P = v.pool;
  check('one chunk pool in the scene, gold goo, 9 × 7', P.mesh.parent === ctx.scene && P.mesh.material.color.getHex() === 0xffcc44
    && P.mesh.geometry.parameters.widthSegments === 9 && P.mesh.geometry.parameters.heightSegments === 7);
  const before = P.chunks.length;
  shoot(w, g); step(w, IDLE);
  const lost = g.s.holes.findIndex((h) => !h.alive);
  look.update(v, g, w, 2, 1); v.root.updateMatrixWorld(true);
  const at = g.s.spin + g.s.holes[lost].angle;
  const mine = P.chunks.slice(before);
  check('a shot hole: its cone goes and three chunks fly from where it was, at the ring\'s height',
    !v.cones[lost].visible && mine.length === 3
    && mine.every((c) => sameAngle(Math.atan2(c.z - g.z, c.x - g.x), at, 1e-9) && near(Math.hypot(c.x - g.x, c.z - g.z), 0.9, 1e-9) && near(c.y, 1.0, 1e-12)),
    `${mine.length}`);
  // 1.x: vx = cos(ra)·3, vz = sin(ra)·3 with ra a fresh random heading per chunk — not outward
  check('… each at 3 u/s along its own heading, rising 2–5 (1.x enemy.js:1651-1658)',
    mine.every((c) => near(Math.hypot(c.vx, c.vz), 3, 1e-9) && c.vy >= 2 && c.vy < 5));
  look.update(v, g, w, 3, 1);
  check('… once', P.chunks.length === before + 3);

  // an elite: the same spinner, bigger, at the same height
  const e = world({ seed: 4, x: 0, z: 0, o: { variant: 'elite' } });
  const u = make();
  u.root.position.set(0, 0, 0);
  look.update(u, e.g, e.w, 4, 1); u.root.updateMatrixWorld(true);
  check('an elite is the whole spinner at 1.2, its centre still at 1.0',
    near(u.hub.scale.x, 1.2) && near(new THREE.Vector3().setFromMatrixPosition(u.ring.matrixWorld).y, 1.0));

  // the kill: the last hole pops as it dies, and it swells about its centre, not the floor
  const k = world({ seed: 11, x: 0, z: 0 });
  const d = make();
  d.root.position.set(0, 0, 0);
  look.update(d, k.g, k.w, 5, 1);
  for (let i = 0; i < 3; i++) { shoot(k.w, k.g); step(k.w, IDLE); }
  look.update(d, k.g, k.w, 6, 1);
  const n0 = P.chunks.length;
  shoot(k.w, k.g); step(k.w, IDLE);
  check('(set-up) the fourth shot kills it', !k.g.alive);
  d.dyingT = 0.2; d.root.scale.setScalar(1.5); d.root.updateMatrixWorld(true);
  check('dying: the killing shot\'s hole pops its three chunks, and every cone is gone', P.chunks.length === n0 + 3 && d.cones.every((c) => !c.visible));
  check('… it swells about its centre: still 1.0 above the floor under the core\'s swell',
    near(new THREE.Vector3().setFromMatrixPosition(d.ring.matrixWorld).y, 1.0, 1e-9));
  d.root.updateMatrixWorld(true);
  check('… once', P.chunks.length === n0 + 3);
  // the chunks fly on the frame clock once no ring is drawn, and go after 1.4 s
  for (let i = 0; i < 100; i++) { ctx.GEL_TIME.value = 10 + i / 60; P.mesh.onBeforeRender(); }
  check('… the chunks fly on after it has gone, and are gone after their 1.4 s', P.chunks.length === 0);
  look.reset(d);
  check('reset: a pooled view comes back with no cones and no body', d.g === null && d.cones.every((c) => !c.visible));
}

if (failed) { console.log(`✗ pyra: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ pyra: ${passed} checks`);
