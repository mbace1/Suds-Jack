#!/usr/bin/env node
// globbo.mjs — GLOBBO's own checks, in bare node: 1.x's numbers
// (enemy.js:578, 668, 671, 709-711, 798, 806, 1682, 1712-1746, 2694-2697,
// 2724-2769; tuning.js:39, 51; main.js:2410-2420, 10886-10906), asserted
// against the sim stepping on its fixed 1/60 s, and the look against 1.x's
// one-mesh transform.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=160';
import { TUNING as T } from '../../js/tuning.js?v=160';
import behaviour, { lunge } from '../../js/sim/species/globbo.js?v=160';
import look from '../../js/render/looks/globbo.js?v=160';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.globbo, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const [K, C] = T.gel.sq.blob;

// a world with nothing in it but one GLOBBO, the hero at the origin;
// anchored (no swarm forces, no crowd) unless asked, so what moves it is its
// own step
function world({ seed = 1, mode = 'arcade', x = 10, z = 0, o = {}, anchored = true } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  const g = api.spawn(w, 'globbo', x, z, o);
  g.anchored = anchored;
  return { w, g };
}
// 1.x's own frame arithmetic: how many steps of `dt` until a timer at `from` runs out
const stepsDown = (from) => { let t = from, n = 0; while (!(t <= 0)) { t -= dt; n++; } return n; };
// the squash spring as the core runs it before the step, then a kick
const sprung = (sq, sqV, kick) => (sqV - (sq - 1) * K) * C + kick;

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.55, hp 1, speed 2.8, teal 0x00ccaa (1.x enemy.js:578)', S.radius === 0.55 && S.hp === 1 && S.speed === 2.8 && S.color === 0x00ccaa);
  check('CFG: no gun', S.bulletColor === null && S.fireInterval === null);
  check('a blob dome, DRIFTER, hurts to touch in classic (MELEE_TYPES), not a biter',
    S.family === 'blob' && S.role === 'DRIFTER' && S.contact === true && S.revenge === null);
  check('the lunge is sin(3.0·clock + φ)² × 2.6 + 0.4 (1.x tuning.js:51)', S.lungeHz === 3.0 && S.lungeGain === 2.6 && S.lungeFloor === 0.4);
  check('stalks past 1.2, pounces inside 12 (1.x enemy.js:1716, 1725)', S.stalkStop === 1.2 && S.pounceRange === 12);
  check('crouch 0.32 s with a −0.85 squash, leap 0.30 s with +0.7 at 3.2× (1.x enemy.js:1727-1739)',
    S.crouchTime === 0.32 && S.crouchSquash === -0.85 && S.leapTime === 0.30 && S.leapSquash === 0.7 && S.leapSpeed === 3.2);
  check('first pounce after 1.0 + U·1.4 s, then every 1.6 + U·1.4 s (1.x enemy.js:710, 1742)',
    S.firstPounce[0] === 1.0 && near(S.firstPounce[1], 2.4) && S.restPounce[0] === 1.6 && near(S.restPounce[1], 3.0));
  check('its silhouette is the default dome {1.05, 0.82, 1.05} (1.x tuning.js:39)', T.blob.shape.x === 1.05 && T.blob.shape.y === 0.82 && T.blob.shape.z === 1.05 && !T.blob.shapes.globbo);
  check('its look smooths its own velocity 0.3 a step (1.x enemy.js:2696-2697)', S.velSmooth === 0.3);
  const src = readFileSync(new URL('../../js/sim/species/globbo.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('it has no special hits and no death of its own', !behaviour.onHit && !behaviour.onKill && !behaviour.hitTest && !behaviour.touches);
}

// ── its starting state (1.x enemy.js:668, 671, 709-711) ──────────────
{
  const ts = [], cs = [], ps = [];
  let fresh = true;
  for (let seed = 1; seed <= 200; seed++) {
    const { g } = world({ seed });
    ts.push(g.s.pounceT); cs.push(g.s.clock); ps.push(g.s.phase);
    fresh &&= g.s.pounce === 'stalk' && g.s.dirX === 0 && g.s.dirZ === 1 && g.s.velX === 0 && g.s.velZ === 0;
  }
  check('it starts stalking, its pounce line (0, 1)', fresh);
  check('the first pounce timer is in [1.0, 2.4) and spread over it', ts.every((t) => t >= 1.0 && t < 2.4) && Math.min(...ts) < 1.1 && Math.max(...ts) > 2.3);
  check('its clock and phase start anywhere in [0, 2π)', [cs, ps].every((a) => a.every((v) => v >= 0 && v < Math.PI * 2) && Math.min(...a) < 0.3 && Math.max(...a) > 6));
}

// ── the stalk: a lunging pulse at you ─────────────────────────────────
{
  const { w, g } = world({ x: 15, z: 8 });
  g.s.pounceT = 1e9;                                       // stalk only
  let exact = true, along = true;
  const ratios = [];
  for (let i = 0; i < 90; i++) {
    const x0 = g.x, z0 = g.z, c = g.s.clock, ph = g.s.phase;
    const want = S.speed * lunge(S, c, ph) * dt;
    step(w, IDLE);
    const d = Math.hypot(g.x - x0, g.z - z0);
    exact &&= near(d, want, 1e-12);
    along &&= angDiff(Math.atan2(g.z - z0, g.x - x0), Math.atan2(-z0, -x0)) < 1e-9;
    ratios.push(d / (S.speed * dt));
    if (!near(g.s.clock, c + dt, 1e-12)) exact = false;
  }
  check('each step it walks spd × the lunge of its clock and phase (1.x enemy.js:1720-1723)', exact);
  check('straight at you', along);
  // the shape of the pulse, sampled the way the sim samples it
  const sampled = [];
  for (let i = 0; i < 1260; i++) sampled.push(lunge(S, i * dt, 0));
  const mean = sampled.reduce((a, b) => a + b, 0) / sampled.length;
  check('the pulse surges to 3.0× and settles at 0.4×', near(Math.max(...sampled), 3.0, 1e-3) && near(Math.min(...sampled), 0.4, 1e-12));
  check('mean 1.05× its speed over a period of 2π/3 = 2.09 s', near(mean, 1.05, 2e-3), `${mean}`);
  const settled = sampled.filter((v) => v === 0.4).length / sampled.length;
  check('half of every period it creeps at the floor', near(settled, 0.5, 0.01), `${settled}`);

  // the wave's escalation and the SWIFT affix scale it (1.x enemy.js:1699)
  for (const [o, mult, name] of [[{ speedMult: 1.448 }, 1.448, 'the wave\'s speedMult'], [{ affix: 'swift' }, T.variants.swiftSpeed, 'SWIFT (×1.35)']]) {
    const r = world({ x: 15, z: 8, o });
    r.g.s.pounceT = 1e9;
    const x0 = r.g.x, z0 = r.g.z, l = lunge(S, r.g.s.clock, r.g.s.phase);
    step(r.w, IDLE);
    check(`${name} scales the stalk`, near(Math.hypot(r.g.x - x0, r.g.z - z0), S.speed * mult * l * dt, 1e-12));
  }
}

// ── it cannot reach you by stalking (1.x: stops at 1.2, contact is 1.05) ──
{
  const { w, g } = world({ x: 5, z: 0 });
  g.s.pounceT = 1e9;
  let minD = Infinity;
  for (let i = 0; i < 400; i++) { step(w, IDLE); minD = Math.min(minD, Math.hypot(g.x, g.z)); }
  const d = Math.hypot(g.x, g.z);
  check('it walks in and stops inside 1.2, short of touching', d <= 1.2 && d > S.radius + T.gel.contactRadius, `d ${d}`);
  check('it never touched you', w.hero.lives === T.hero.lives && minD > 1.05, `closest ${minD}`);
  const x0 = g.x;
  for (let i = 0; i < 30; i++) step(w, IDLE);
  check('and once inside 1.2 it stands', g.x === x0);
}

// ── the crouch: the timer, the range, the squash, the locked line ─────
{
  // the timer: it crouches on the step its timer runs out
  let { w, g } = world({ x: 4, z: 3 });
  g.s.pounceT = 0.5;
  const n = stepsDown(0.5);
  let at = -1, pre = null;
  for (let i = 1; i <= 60 && at < 0; i++) {
    const p = { x: g.x, z: g.z, sq: g.sq, sqV: g.sqV, clock: g.s.clock };
    step(w, IDLE);
    if (g.s.pounce === 'crouch') { at = i; pre = p; }
  }
  check('it crouches on the step its pounce timer runs out', at === n, `step ${at} want ${n}`);
  check('the crouch is 0.32 s on its timer', near(g.s.pounceT, S.crouchTime));
  check('it still stalked on that step, then locked the line from where it stood before it', near(Math.hypot(g.x - pre.x, g.z - pre.z), S.speed * lunge(S, pre.clock, g.s.phase) * dt, 1e-12)
    && angDiff(Math.atan2(g.s.dirZ, g.s.dirX), Math.atan2(-pre.z, -pre.x)) < 1e-12 && near(Math.hypot(g.s.dirX, g.s.dirZ), 1, 1e-12));
  check('and flattened: a −0.85 kick to the squash spring (1.x enemy.js:1728)', near(g.sqV, sprung(pre.sq, pre.sqV, S.crouchSquash), 1e-12), `${g.sqV}`);

  // the range: a timer long out waits until you are within 12
  ({ w, g } = world({ x: 18, z: 10 }));
  g.s.pounceT = 0.05;
  const dists = [];
  let crouched = -1;
  for (let i = 0; i < 600 && crouched < 0; i++) {
    dists.push(Math.hypot(g.x, g.z));
    step(w, IDLE);
    if (g.s.pounce === 'crouch') crouched = i;
  }
  check('past 12 the timer runs out and it keeps stalking', crouched > 3 && dists.slice(0, crouched).every((d) => d >= 12), `crouched at ${crouched}`);
  check('it crouches the first step it starts inside 12', crouched > 0 && dists[crouched] < 12, `${dists[crouched]}`);
}

// ── crouch → leap → stalk ───────────────────────────────────────────
function pounce({ seed = 2, x = 4, z = 3, o = {}, during = null } = {}) {
  const { w, g } = world({ seed, x, z, o });
  w.hero.mercy = 1e9;                                       // it may land on you: let it
  g.s.pounceT = 0;                                           // crouch on the first step
  const log = [];
  for (let i = 1; i <= 300; i++) {
    if (during && g.s.pounce === 'crouch') during(w);
    const p = { x: g.x, z: g.z, sq: g.sq, sqV: g.sqV, state: g.s.pounce };
    step(w, IDLE);
    log.push({ i, pre: p, x: g.x, z: g.z, sq: g.sq, sqV: g.sqV, state: g.s.pounce, t: g.s.pounceT, velX: g.s.velX });
  }
  return { w, g, log };
}
{
  const { log, g } = pounce();
  const c0 = log.findIndex((e) => e.state === 'crouch'), l0 = log.findIndex((e) => e.state === 'leap'), s1 = log.findIndex((e, k) => k > l0 && e.state === 'stalk');
  check('crouch on the first step', c0 === 0);
  check('the crouch holds 0.32 s on 1.x\'s frame arithmetic', l0 - c0 === stepsDown(S.crouchTime), `${l0 - c0} steps`);
  check('crouched, it does not move under its own power — nor on the change-over step',
    log.slice(c0 + 1, l0 + 1).every((e) => e.x === e.pre.x && e.z === e.pre.z));
  check('the launch stretches it: a +0.7 kick (1.x enemy.js:1735)', near(log[l0].sqV, sprung(log[l0].pre.sq, log[l0].pre.sqV, S.leapSquash), 1e-12));
  const crouchSq = Math.min(...log.slice(c0, l0).map((e) => e.sq)), leapSq = Math.max(...log.slice(l0, s1 + 1).map((e) => e.sq));
  check('the crouch squashes it flat to the spring\'s floor, the launch stretches it tall', crouchSq <= 0.56 && leapSq > 1.3, `crouch ${crouchSq} leap ${leapSq}`);
  const leap = log.slice(l0 + 1, s1 + 1);
  const dir = Math.atan2(g.s.dirZ, g.s.dirX);
  check('the leap lasts 0.30 s, moving on the step it runs out too', leap.length === stepsDown(S.leapTime), `${leap.length} steps`);
  check('at 3.2 × its speed (8.96 u/s) along the locked line', leap.every((e) => near(Math.hypot(e.x - e.pre.x, e.z - e.pre.z), S.speed * S.leapSpeed * dt, 1e-12)
    && angDiff(Math.atan2(e.z - e.pre.z, e.x - e.pre.x), dir) < 1e-9));
  const reach = Math.hypot(log[s1].x - log[l0].x, log[s1].z - log[l0].z);
  check('a 2.8 u leap (wave 1: 9.3 u/s × 0.30 s)', near(reach, stepsDown(S.leapTime) * dt * S.speed * S.leapSpeed, 1e-9) && near(reach, 2.8, 0.05), `${reach}`);
  const tRest = log[s1].t;
  check('then it stalks again for 1.6 + U·1.4 s', tRest >= 1.6 && tRest < 3.0, `${tRest}`);
  const c1 = log.findIndex((e, k) => k > s1 && e.state === 'crouch');
  check('and crouches again when that runs out (you are close)', c1 - s1 === stepsDown(tRest), `${c1 - s1} vs ${stepsDown(tRest)}`);
  check('its own velocity, for the look: 0 crouched, the leap speed in the air', near(log[l0].velX, log[l0 - 1].velX * (1 - S.velSmooth), 1e-12)
    && Math.hypot(log[s1].velX) > 5);
}
{
  // the line is locked as it crouches: a sidestep during the crouch beats it
  const moved = pounce({ seed: 2, during: (w) => { w.hero.x = 0; w.hero.z = -6; } });
  const still = pounce({ seed: 2 });
  const l0 = moved.log.findIndex((e) => e.state === 'leap');
  const end = (r) => r.log[l0 + stepsDown(S.leapTime)];
  check('a sidestep during the crouch does not turn the leap', near(end(moved).x, end(still).x, 1e-12) && near(end(moved).z, end(still).z, 1e-12));
  // escalation scales the leap
  for (const [o, mult, name] of [[{ speedMult: 1.91 }, 1.91, 'wave 10\'s speedMult (1.91): a 5.4 u leap'], [{ affix: 'swift' }, T.variants.swiftSpeed, 'SWIFT']]) {
    const r = pounce({ o });
    const a = r.log.findIndex((e) => e.state === 'leap'), b = r.log.findIndex((e, k) => k > a && e.state === 'stalk');
    const reach = Math.hypot(r.log[b].x - r.log[a].x, r.log[b].z - r.log[a].z);
    check(`${name} scales the leap`, near(reach, stepsDown(S.leapTime) * dt * S.speed * mult * S.leapSpeed, 1e-9), `${reach}`);
  }
}

// ── many pounces: the rest between them is 1.6 + U·1.4 s ────────────
{
  const { w, g } = world({ seed: 7, x: 6, z: 2 });
  w.hero.mercy = 1e9;
  let last = g.s.pounce, stalkAt = -1, bad = 0, n = 0;
  const lens = [];
  for (let i = 1; i <= 60 * 40; i++) {
    step(w, IDLE);
    const st = g.s.pounce;
    if (st !== last) {
      if (st === 'stalk') { stalkAt = i; lens.t = g.s.pounceT; }
      if (st === 'crouch' && stalkAt > 0) { n++; lens.push(i - stalkAt); if (i - stalkAt !== stepsDown(lens.t)) bad++; }
      last = st;
    }
  }
  check('over 40 s it pounces again and again', n >= 12, `${n} pounces`);
  check('each rest is its own 1.6–3.0 s draw, on 1.x\'s frame arithmetic', bad === 0 && lens.every((k) => k >= 96 && k <= 180), `${lens.join(' ')}`);
  check('and the draws differ', new Set(lens).size > n / 2);
}

// ── contact: the leap is how it hurts ────────────────────────────────
{
  const { w, g } = world({ x: 3, z: 0 });
  g.s.pounceT = 0;
  let hurtAt = -1;
  for (let i = 1; i <= 60 && hurtAt < 0; i++) { step(w, IDLE); if (w.events.some((e) => e.type === 'hurt')) hurtAt = i; }
  check('a leap that lands on you hurts', hurtAt > 0 && w.hero.lives === T.hero.lives - 1 && w.killedBy === 'globbo', `at ${hurtAt}`);
  check('…during the leap, not before it', hurtAt > stepsDown(S.crouchTime) + 1, `step ${hurtAt}`);
  // the radius: within r + 0.5 = 1.05 (1.x main.js:10886-10906)
  for (const [d, hurts, o] of [[1.0, true, {}], [1.1, false, {}], [1.15, true, { variant: 'elite' }], [1.2, false, { variant: 'elite' }]]) {
    const r = world({ x: d, z: 0, o });
    r.g.s.pounce = 'crouch'; r.g.s.pounceT = 1e9;            // hold still
    step(r.w, IDLE);
    check(`${o.variant || 'plain'} at ${d}: ${hurts ? 'touching' : 'not touching'}`, (r.w.hero.lives < T.hero.lives) === hurts);
  }
  // not while you are invincible
  const r = world({ x: 0.5, z: 0 });
  r.w.hero.mercy = 0.5; r.g.s.pounce = 'crouch'; r.g.s.pounceT = 1e9;
  step(r.w, IDLE);
  check('not through mercy', r.w.hero.lives === T.hero.lives);
}

// ── the swarm still carries it: its own velocity is what the look reads ──
{
  const { w, g } = world({ seed: 3, x: 8, z: 4, anchored: false });
  w.hero.mercy = 1e9;
  g.s.pounce = 'crouch'; g.s.pounceT = 1e9;
  const x0 = g.x, z0 = g.z;
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('crouched, a DRIFTER is still moved by the swarm forces', Math.hypot(g.x - x0, g.z - z0) > 0.3);
  check('but its own velocity is 0, so it neither smears nor turns', g.s.velX === 0 && g.s.velZ === 0 && Math.hypot(g.velX, g.velZ) > 0.3);
}

// ── it dies to one hit and leaves nothing behind ────────────────────
{
  for (const mode of ['arcade', 'hardcade']) {
    const { w, g } = world({ mode, x: 10 });
    w.wave = 5;
    api.heroBullet(w, g.x - 0.5, g.z, 0);
    step(w, IDLE);
    const kills = w.events.filter((e) => e.type === 'kill' && e.kind === 'globbo');
    check(`${mode}: one hero bullet kills it`, kills.length === 1 && !g.alive && kills[0].big === false);
    check(`${mode}: no children, no death ring, no corpse fire`, w.gels.length === 0 && w.bullets.length === 0);
  }
  const { w, g } = world({ x: 10, o: { variant: 'elite' } });
  check('an elite has 2 hp and a 0.66 radius', g.hp === 2 && near(g.r, 0.66, 1e-12));
  api.heroBullet(w, g.x - 0.5, g.z, 0); step(w, IDLE);
  check('…and takes a second hit', g.alive && g.hp === 1);
}

// ── determinism ─────────────────────────────────────────────────────
{
  const trail = (seed) => {
    const { w, g } = world({ seed, x: 9, z: 5, anchored: false });
    w.hero.mercy = 1e9;
    const out = [];
    for (let i = 0; i < 600; i++) { step(w, IDLE); out.push(`${g.x.toFixed(9)},${g.z.toFixed(9)},${g.s.pounce}`); }
    return out.join(';');
  };
  check('a run replays from its seed', trail(11) === trail(11));
  check('another seed pounces elsewhen', trail(11) !== trail(12));
}

// ── the look: 1.x's scale block (enemy.js:2727-2769) ──────────────────
{
  // a stand-in for three: what the look builds, and what it sets
  const v3 = () => ({ v: [1, 1, 1], set(x, y, z) { this.v = [x, y, z]; } });
  class Obj { constructor() { this.scale = v3(); this.rotation = v3(); this.rotation.v = [0, 0, 0]; this.kids = []; } add(o) { this.kids.push(o); } }
  class Mesh extends Obj { constructor(geo, mat) { super(); this.geo = geo; this.mat = mat; } }
  let touched = false;
  const emissive = { setHex() { touched = true; return this; }, setScalar() { touched = true; return this; }, multiplyScalar() { touched = true; return this; }, lerp() { touched = true; return this; } };
  let made = null;
  const ctx = { THREE: { Mesh, Group: Obj }, geo: { blob: 'dome' }, T, S,
    gelMaterial: (hex, fam, rad) => (made = { hex, fam, rad, emissive }) };
  const parts = look.build(ctx);
  check('it is the satin gel dome: gelMaterial(0x00ccaa, \'blob\', 1) on the shared dome (1.x enemy.js:798)',
    made.hex === 0x00ccaa && made.fam === 'blob' && made.rad === 1 && parts.mesh.geo === 'dome' && parts.mat === made);
  check('the body is a group holding the mesh, and the look owns its shaping', parts.body.kids.length === 1 && parts.body.kids[0] === parts.mesh && parts.own === true);
  check('a new body faces +z (1.x `_moveYaw = 0`, enemy.js:806)', parts.yaw === 0 && S.look.yaw0 === 0);
  check('the across-scale reads the squash floored at 0.1 (1.x enemy.js:2732)', S.look.sqFloor === 0.1 && S.look.breatheXZ === 0.5 && S.look.dragSink === 0.25 && S.look.yawMinSpeed === 0.4);

  const v = { S, ...parts };
  const sh = T.blob.shape, B = T.blob, mesh = v.mesh, body = v.body;
  // 1.x's whole transform on its one mesh: R(−drag·tilt, yaw, 0) · scale, with
  // scale = r·rm·shp × (sxz, sq(1 + b) − 0.25·drag, sxz + drag), sxz = (1 − b/2)/√sq
  const oneX = (r, sq, clock, phase, vx, vz) => {
    const b = B.breatheAmp * Math.sin(clock * B.breatheHz + phase);
    const sp = Math.hypot(vx, vz), drag = Math.min(sp * B.dragStretchPerSpeed, B.dragMax), sxz = (1 - b * 0.5) / Math.sqrt(Math.max(sq, 0.1));
    return { scale: [r * sh.x * sxz, r * sh.y * (sq * (1 + b) - drag * 0.25), r * sh.z * (sxz + drag)], tilt: -drag * B.rearDragTilt };
  };
  // what reaches the screen: the view's squash group (1/√sq, sq, 1/√sq) times the body group
  const undone = (sq) => [body.scale.v[0] / Math.sqrt(sq), body.scale.v[1] * sq, body.scale.v[2] / Math.sqrt(sq)];
  const g = { r: 0.55, sq: 1, tell: 0, flash: 0, velX: 0, velZ: 0, affix: null, s: { clock: 0, phase: 0, velX: 0, velZ: 0 } };
  look.update(v, g, null, 0.77, 1);
  check('at rest it is r × the dome: 0.58 in radius, 0.77 tall (1.x §2.10.1)',
    near(mesh.scale.v[0], 0.55 * sh.x) && near(mesh.scale.v[1], 0.55 * sh.y) && near(mesh.scale.v[2], 0.55 * sh.z));
  check('it breathes on its own clock, not the render\'s', (look.update(v, g, null, 3.1, 1), near(mesh.scale.v[1], 0.55 * sh.y)));
  g.s.clock = 0.4; look.update(v, g, null, 0, 1);
  check('…which moves it (1.x `_wobbleT · 2.4 + _phase`)', near(mesh.scale.v[1], oneX(0.55, 1, 0.4, 0, 0, 0).scale[1], 1e-12) && !near(mesh.scale.v[1], 0.55 * sh.y, 1e-3));
  g.s.clock = 0; g.r = 0.66; look.update(v, g, null, 0, 1);
  check('an elite is drawn at its own radius, 1.2× (1.x `r·rm`)', near(mesh.scale.v[0], 0.66 * sh.x) && near(mesh.scale.v[1], 0.66 * sh.y));
  g.r = 0.55; look.update(v, g, null, 0, 0.5);
  check('it grows in with the view\'s swell (TUNING.gel.swell)', near(mesh.scale.v[0], 0.275 * sh.x));
  // squashed, breathing and dragging: 1.x's own scale and turn, the squash group undone
  for (const sq of [0.55, 0.7, 1, 1.3, 1.55]) {
    g.sq = sq; g.s = { clock: 0.37, phase: 0.2, velX: 3, velZ: 4 }; g.velX = -5; g.velZ = 2;
    look.update(v, g, null, 9, 1);
    const want = oneX(0.55, sq, 0.37, 0.2, 3, 4);
    check(`at squash ${sq} the screen gets 1.x's R·S exactly: the squash group undone, the mesh 1.x's`,
      undone(sq).every((x) => near(x, 1, 1e-12)) && mesh.scale.v.every((x, k) => near(x, want.scale[k], 1e-12))
      && near(mesh.rotation.v[0], want.tilt, 1e-12) && near(mesh.rotation.v[1], Math.atan2(3, 4), 1e-12) && mesh.rotation.v[2] === 0,
      `${mesh.scale.v} vs ${want.scale}`);
  }
  check('the leap smears it at the cap: drag 0.35, nose up 0.1225 rad', (g.s.velX = 9, g.s.velZ = 0, look.update(v, g, null, 0, 1), near(mesh.rotation.v[0], -0.35 * 0.35, 1e-12)));
  check('it turns to its OWN heading, not the whole-step velocity', near(v.yaw, Math.atan2(9, 0)));
  g.s.velX = 0.3; g.s.velZ = 0.1; const yaw = v.yaw; look.update(v, g, null, 0, 1);
  check('below 0.4 u/s it holds its heading', v.yaw === yaw);
  for (const affix of [null, 'swift', 'volatile', 'anchored']) { g.affix = affix; look.update(v, g, null, 0, 1); }
  check('it draws no glow of its own (1.x: the crouch is a squash, not a light)', !touched);
  look.reset(v);
  check('a reused view faces forward again (1.x `_moveYaw = 0`)', v.yaw === 0);
}

if (failed) { console.log(`✗ globbo: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ globbo: ${passed} checks`);
