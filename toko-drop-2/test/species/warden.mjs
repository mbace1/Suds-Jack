#!/usr/bin/env node
// warden.mjs — WARDEN's own checks, in bare node: 1.x's numbers (enemy.js:
// 573-575, 595, 644-648, 662, 1118-1131, 1682, 1755-1767, 3008; main.js:
// 1349-1388, 2410-2421, 9350-9436, 10369, 10703-10720; tuning.js:40-44, 307,
// 496-497), asserted against the sim stepping on its fixed 1/60 s, and the
// look against real three.
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=158';
import { TUNING as T } from '../../js/tuning.js?v=158';
import { BEHAVIOUR } from '../../js/sim/species/index.js?v=158';
import look from '../../js/render/looks/warden.js?v=158';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.warden, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

// The bodies a WARDEN guards are stand-ins that never move on their own (a
// GLOBBO kind with no behaviour, in this process only), so what is asserted is
// the aura, not somebody else's walk; one a check gives a pace (g.s.vx, g.s.vz)
// walks at it, in its own step.
BEHAVIOUR.globbo = { step(w, g) { g.vx = g.s.vx || 0; g.vz = g.s.vz || 0; } };

// a world with nothing in it but what a check puts there; the hero at the origin
function world({ seed = 1, mode = 'arcade' } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  return w;
}
// a body standing still where it is put: anchored (no swarm forces, no
// crowd) and, for a WARDEN, with its walk at speed 0 unless asked. Every body
// is live from its first step (1.x had no appear phase: a body is alive from
// its constructor, enemy.js:662), so there is nothing to skip.
function put(w, kind, x, z, o = {}, { walk = false } = {}) {
  const g = api.spawn(w, kind, x, z, { ...(walk ? {} : { speedMult: 0 }), ...o });
  g.anchored = true;
  return g;
}
// one hero bullet, half a unit left of the target and flying +x, so the
// next step's test finds it touching (it moves 24/60 = 0.4 u a step)
const shootAt = (w, g) => api.heroBullet(w, g.x - 0.5, g.z, 0);
const has = (w, type, id) => w.events.some((e) => e.type === type && e.id === id);

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.85, hp 5, speed 1.1, teal 0x33ffdd (1.x enemy.js:595)', S.radius === 0.85 && S.hp === 5 && S.speed === 1.1 && S.color === 0x33ffdd);
  check('CFG: no gun, never fires (enemy.js:595)', S.bulletColor === null && S.fireInterval === null);
  check('a blob dome, SUPPORT, harmless to touch in classic (not in MELEE_TYPES), not a biter',
    S.family === 'blob' && S.role === 'SUPPORT' && S.contact === false && S.revenge === null && !S.noHpMult);
  check('its silhouette is the default dome {1.05, 0.82, 1.05} (1.x tuning.js:39-44)', T.blob.shape.x === 1.05 && T.blob.shape.y === 0.82 && T.blob.shape.z === 1.05 && !T.blob.shapes.warden);
  check('it walks at you until within 1.4 (enemy.js:1758); the aura is 4.5 (WARDEN_AURA, enemy.js:575)', S.stopAt === 1.4 && S.aura === 4.5 && S.distFloor === 0.001);
  const R = S.ring;
  check('the ring: RingGeometry(4.5 − 0.18, 4.5, 48) at y 0.06, cyan, 0.30 + 0.13·sin(3.1·t) (enemy.js:1124-1130, 1764)',
    R.width === 0.18 && R.segments === 48 && R.y === 0.06 && R.color === 0x33ffdd && R.base === 0.30 && R.amp === 0.13 && R.hz === 3.1);
  const K = S.spark;
  check('a shielded shot: 3 cyan droplets of 0.08, ±0.8 rad about the hit, 4 u/s out, 2–4 up, from mid-height + 0.15 (main.js:10714-10717)',
    K.count === 3 && K.color === 0x33ffdd && K.size === 0.08 && K.spread === 1.6 && K.speed === 4 && K.up[0] === 2 && K.up[1] === 4 && K.lift === 0.15);
  check('… on the goo pool\'s physics: life 1.4, gravity 14, keep 0.35 on landing, spring 0.32/0.80, shrink 0.3 (main.js:1353, 1373-1387)',
    K.life === 1.4 && K.gravity === 14 && K.floorAt === 0.01 && K.floorKeep === 0.35 && K.landSquash === 0.4 && K.spring === 0.32 && K.damp === 0.8
    && K.sqMin === 0.55 && K.sqMax === 1.4 && K.sxFloor === 0.1 && K.shrink === 0.3);
}

// ── the walk (enemy.js:1755-1761) ────────────────────────────────────
{
  const w = world(), g = put(w, 'warden', 9, 0, {}, { walk: true });
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('it plods straight at you at 1.1 u/s: one second from (9, 0) is (7.9, 0)', near(g.x, 9 - 60 * 1.1 * dt, 1e-9) && g.z === 0, `${g.x}, ${g.z}`);
  check('… faces where it walks', near(g.faceX, -1) && near(g.faceZ, 0));
}
{
  const w = world(), g = put(w, 'warden', 6, 8, {}, { walk: true });
  step(w, IDLE);
  check('… along the line to you (from (6, 8): −0.6, −0.8)', near(g.x, 6 - 0.6 * 1.1 * dt, 1e-12) && near(g.z, 8 - 0.8 * 1.1 * dt, 1e-12));
}
{
  const w = world(), g = put(w, 'warden', 9, 0, { speedMult: 1.5 }, { walk: true });
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('the wave\'s speedMult multiplies the walk (1.x _speedMult, enemy.js:1697)', near(g.x, 9 - 60 * 1.65 * dt, 1e-9), `${g.x}`);
}
{
  const w = world(), g = put(w, 'warden', 9, 0, {}, { walk: true });
  g.surgeT = 10; g.surgeMult = 1.6;
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('a SIREN\'s surge speeds it × 1.6 (enemy.js:1698)', near(g.x, 9 - 60 * 1.76 * dt, 1e-9), `${g.x}`);
}
{
  const w = world(), g = put(w, 'warden', 9, 0, { affix: 'swift' }, { walk: true });
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('… and the SWIFT affix × 1.35 (main.js:9416)', near(g.x, 9 - 60 * 1.1 * 1.35 * dt, 1e-9), `${g.x}`);
}
{
  const w = world(), g = put(w, 'warden', 1.41, 0, {}, { walk: true });
  step(w, IDLE);
  const once = g.x;
  for (let i = 0; i < 120; i++) step(w, IDLE);
  check('it stops once inside 1.4: a step from 1.41 takes it to 1.41 − 1.1/60, then it stands', near(once, 1.41 - 1.1 * dt, 1e-12) && g.x === once && g.z === 0, `${once} → ${g.x}`);
  const w2 = world(), g2 = put(w2, 'warden', 1.4, 0, {}, { walk: true }), g3 = put(w2, 'warden', 0, -1.2, {}, { walk: true });
  for (let i = 0; i < 60; i++) step(w2, IDLE);
  check('… at exactly 1.4 it does not move (dist > 1.4 walks, enemy.js:1758)', g2.x === 1.4 && g2.z === 0 && g3.x === 0 && g3.z === -1.2);
}
{
  const w = world(), g = put(w, 'warden', 0, 0, {}, { walk: true });
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('on top of you it stands still (1.x hypot || 0.001 guard, no NaN)', g.x === 0 && g.z === 0 && Number.isFinite(g.x));
}

// ── it never attacks, and it does not hurt ───────────────────────────
{
  const w = world(), g = api.spawn(w, 'warden', 6, 3);
  let shots = 0, maxGel = 0;
  for (let i = 0; i < 60 * 20; i++) { step(w, IDLE); shots += w.events.filter((e) => e.type === 'gelShot').length; maxGel = Math.max(maxGel, w.gelBullets); }
  check('twenty seconds in the arena: not one shot', shots === 0 && maxGel === 0 && w.bullets.length === 0);
  check('… it ends standing beside you, and touching it costs nothing in classic', Math.hypot(g.x - w.hero.x, g.z - w.hero.z) < 1.6 && w.hero.lives === T.hero.lives && !w.over && w.hero.mercy === 0,
    `d ${Math.hypot(g.x - w.hero.x, g.z - w.hero.z).toFixed(3)}, lives ${w.hero.lives}`);
}
{
  const w = world({ mode: 'hardcade' }); w.wave = 12;
  const g = put(w, 'warden', 5, 0);
  api.kill(w, g, 'hero');
  check('HARDCADE: its corpse does not fire back (not a biter, tuning.js:496-497)', !w.events.some((e) => e.type === 'revenge') && w.bullets.length === 0);
}
{
  const w = world();
  const a = put(w, 'warden', 5, 0, { variant: 'elite' });
  check('an elite is 1.2× as big and has 2× the hp (main.js:9402-9406)', near(a.r, 0.85 * 1.2) && a.hp === 10);
}

// ── the aura (main.js:10703-10720) ───────────────────────────────────
// layout: a WARDEN at (0, −6) standing still; wards on its row
{
  const w = world(), W = put(w, 'warden', 0, -6), A = put(w, 'globbo', 4.49, -6);
  step(w, IDLE);
  check('a body whose centre is 4.49 from it is shielded this step', A.shield === true);
  shootAt(w, A); step(w, IDLE);
  check('… a shot on it is spent (a block, no hit), and it loses nothing', has(w, 'block', A.id) && !has(w, 'hit', A.id) && A.hp === A.maxHp && A.flash <= 0
    && !w.bullets.some((b) => b.hero), `hp ${A.hp}`);
  for (let i = 0; i < 10; i++) { shootAt(w, A); step(w, IDLE); }
  check('… however many shots land on it', A.hp === A.maxHp && A.alive);
  void W;
}
{
  const w = world(), W = put(w, 'warden', 0, -6), B = put(w, 'globbo', 4.51, -6), C = put(w, 'globbo', -4.5, -6);
  step(w, IDLE);
  shootAt(w, B); step(w, IDLE);
  check('one at 4.51 is not: the shot lands', has(w, 'hit', B.id) && B.hp === B.maxHp - 1 && !has(w, 'block', B.id));
  shootAt(w, C); step(w, IDLE);
  check('… nor one at exactly 4.5 (hypot < 4.5, strictly)', has(w, 'hit', C.id) && !C.shield);
  check('the aura is the WARDEN\'s centre to the ward\'s centre, not their edges', !B.shield && W.shield === false);
}
{
  const w = world(), W = put(w, 'warden', 0, -6), W2 = put(w, 'warden', 2, -6);
  step(w, IDLE);
  check('wardens never shield each other', W.shield === false && W2.shield === false);
  shootAt(w, W2); step(w, IDLE);
  check('… a shot on the second lands', has(w, 'hit', W2.id) && W2.hp === 4);
  shootAt(w, W); step(w, IDLE);
  check('… and it never shields itself: the priority target is always killable', has(w, 'hit', W.id) && W.hp === 4);
}
{
  const w = world(), W = put(w, 'warden', 0, -6), boss = put(w, 'globbo', 3, -6, { isBoss: true, hp: 15 });
  step(w, IDLE);
  shootAt(w, boss); step(w, IDLE);
  check('the boss too: a boss inside the aura shrugs the shot off', has(w, 'block', boss.id) && boss.hp === 15);
  void W;
}
{
  const w = world(), W = put(w, 'warden', 0, -6, { variant: 'elite' }), A = put(w, 'globbo', 4.49, -6), B = put(w, 'globbo', -4.51, -6);
  step(w, IDLE);
  check('an elite WARDEN\'s aura is still 4.5 (the aura is a constant, not a radius share)', A.shield && !B.shield);
  void W;
}
{
  const w = world(), W = put(w, 'warden', 0, -6), A = put(w, 'globbo', 3, -6);
  step(w, IDLE);
  api.kill(w, W, 'hero');
  check('it dies and the shield drops with it, the same step (enemy.js:3008)', A.shield === false);
  step(w, IDLE);
  shootAt(w, A); step(w, IDLE);
  check('… and the next shot lands', has(w, 'hit', A.id) && A.hp === A.maxHp - 1);
}
{
  // the same step: a bullet kills the WARDEN, the next bullet that step hits its ward
  const w = world(), W = put(w, 'warden', 0, -6, { hp: 1 }), A = put(w, 'globbo', 3, -6);
  step(w, IDLE);
  shootAt(w, W); shootAt(w, A); step(w, IDLE);
  check('killed mid-volley: a later bullet the same step lands (1.x tested w.alive per bullet)', !W.alive && has(w, 'hit', A.id) && A.hp === A.maxHp - 1);
  const w2 = world(), W2 = put(w2, 'warden', 0, -6, { hp: 1 }), A2 = put(w2, 'globbo', 3, -6);
  step(w2, IDLE);
  shootAt(w2, A2); shootAt(w2, W2); step(w2, IDLE);
  check('… and an earlier one that step is still blocked', !W2.alive && has(w2, 'block', A2.id) && A2.hp === A2.maxHp);
}
{
  const w = world(), W1 = put(w, 'warden', 0, -6, { hp: 1 }), W2 = put(w, 'warden', 6, -6), A = put(w, 'globbo', 3, -6);
  step(w, IDLE);
  shootAt(w, W1); shootAt(w, A); step(w, IDLE);
  check('two WARDENs over one ward: kill one and the other still holds it', !W1.alive && W2.alive && has(w, 'block', A.id) && A.hp === A.maxHp && A.shield);
}
{
  const w = world(), W = put(w, 'warden', 0, -6), A = put(w, 'globbo', 3, -6);
  step(w, IDLE);
  A.x = 5;
  step(w, IDLE);
  check('the shield is decided afresh every step: a ward that leaves the aura is open', A.shield === false);
  shootAt(w, A); step(w, IDLE);
  check('… and is hit', has(w, 'hit', A.id));
  void W;
}
{
  // 1.x had no arrival gate on the aura: the bullet test asks every ALIVE
  // WARDEN in `enemies` (main.js:10706-10708) — alive from its constructor
  // (enemy.js:662), which also built the ring lit (enemy.js:1124-1131). So one
  // in the arena before a step shields at that step's bullet test: the very
  // first shot on its ward is spent, while 2.0's view is still swelling the
  // WARDEN's body in (that swell is the view's alone)
  const w = world(), W = api.spawn(w, 'warden', 0, -6, { speedMult: 0 }), A = put(w, 'globbo', 3, -6);
  W.anchored = true;
  shootAt(w, A); step(w, IDLE);
  check('a WARDEN shields from its first step, as 1.x\'s did from its first frame (main.js:10706-10708; enemy.js:662): the first shot on its ward is blocked',
    W.state === 'active' && A.shield === true && has(w, 'block', A.id) && !has(w, 'hit', A.id) && A.hp === A.maxHp, `${W.state} ${A.shield} hp ${A.hp}`);
  check('… while its view is still swelling in (2.0\'s swell is render-only, TUNING.gel.swell)', W.t < T.gel.swell, `${W.t}`);
}
{
  // the director's: 1.x landed a wave's pending spawns (main.js:9350-9436)
  // before the bodies' update (main.js:10369) and the bullet test
  // (main.js:10636-10712) of the same frame; 2.0's director runs first in the step
  const w = world();
  let W = null;
  w.director = { step(w, dt, api) { if (w.tick === 1) { W = api.spawn(w, 'warden', 0, -6, { speedMult: 0 }); W.anchored = true; } } };
  const A = put(w, 'globbo', 3, -6);
  shootAt(w, A); step(w, IDLE);
  check('… and one the director lands in a step shields in that same step (main.js:9350-9436 before 10703-10708)',
    W !== null && W.alive && has(w, 'block', A.id) && A.hp === A.maxHp && A.shield === true);
}
{
  // … and walks from it: 1.x updated every body in `enemies` that frame,
  // the one just landed with it (main.js:10367-10369; enemy.js:1758-1761)
  const w = world();
  let W = null;
  w.director = { step(w, dt, api) { if (w.tick === 1) { W = api.spawn(w, 'warden', 9, 0); W.anchored = true; } } };
  step(w, IDLE);
  check('… and walks in that step too: 1.1/60 from (9, 0) toward you', W !== null && near(W.x, 9 - 1.1 * dt, 1e-12) && W.z === 0, W && `${W.x}`);
}
{
  // a walking WARDEN carries its umbrella with it
  const w = world(), W = put(w, 'warden', 0, -9, {}, { walk: true }), A = put(w, 'globbo', 0, -4.4);
  step(w, IDLE);
  const before = A.shield;
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('it walks its aura over the pack: a body 4.6 ahead comes under it as it closes', before === false && A.shield === true && W.z > -9);
}

// ── 1.x took the aura where everybody stood AFTER the moves and the crowd
// (main.js:10369, 10426, then the bullet test at 10636-10712) ─────────────
{
  // a ward that walks INTO the aura this step, after the WARDEN has stepped
  const w = world(), W = put(w, 'warden', 0, -6), A = put(w, 'globbo', 4.505, -6);
  A.s.vx = -0.6;                                            // 0.01 a step: 4.505 → 4.495
  shootAt(w, A); step(w, IDLE);
  check('a ward that walks into the aura this step is shielded at the bullet test (post-move, 1.x)',
    A.px === 4.505 && near(A.x, 4.495, 1e-12) && has(w, 'block', A.id) && A.hp === A.maxHp && A.shield === true, `${A.px} → ${A.x}`);
  void W;
}
{
  // … and one that walks OUT of it is hit, though its step began inside
  const w = world(), W = put(w, 'warden', 0, -6), A = put(w, 'globbo', 4.495, -6);
  A.s.vx = 0.6;                                             // 4.495 → 4.505
  shootAt(w, A); step(w, IDLE);
  check('… and one that walks out of it is hit, though the step began with it inside', near(A.x, 4.505, 1e-12) && has(w, 'hit', A.id) && A.hp === A.maxHp - 1 && !A.shield);
  void W;
}
{
  // the WARDEN's own walk carries the edge: 4.51 at its step, 4.49 once it has moved
  const w = world(), W = put(w, 'warden', 0, -6, {}, { walk: true }), A = put(w, 'globbo', 0, -6 + 4.51);
  shootAt(w, A); step(w, IDLE);
  check('the WARDEN\'s own step closes the gap: a ward 4.51 away when it steps, 4.49 once it has moved, is shielded',
    near(W.z, -6 + 1.1 * dt, 1e-12) && Math.hypot(W.x - A.x, W.z - A.z) < 4.5 && has(w, 'block', A.id) && A.hp === A.maxHp);
}
{
  // two WARDENs: the bullet test re-takes both auras, the union of the two
  for (const dir of [-1, 1]) {
    const w = world(), W1 = put(w, 'warden', 0, -6), W2 = put(w, 'warden', 9, -6), A = put(w, 'globbo', 4.5 - dir * 0.005, -6);
    A.s.vx = dir * 0.6;                                     // from one WARDEN's aura into the other's
    shootAt(w, A); step(w, IDLE);
    check(`two WARDENs, re-taken together: a ward crossing from ${dir < 0 ? 'the right' : 'the left'} aura into the other stays shielded`,
      has(w, 'block', A.id) && A.shield && A.hp === A.maxHp && W1.s.covered.includes(A) === (dir < 0) && W2.s.covered.includes(A) === (dir > 0));
  }
}
{
  const w = world(), W = put(w, 'warden', 0, -6);
  step(w, IDLE);
  const t = BEHAVIOUR.warden.hitTest;
  check('its own body is the plain circle: centre to centre against the bullet\'s radius plus its own (main.js:10651-10653)',
    t(w, W, 0.85 + 0.15 - 1e-9, -6, 0.15) === true && t(w, W, 0.85 + 0.15, -6, 0.15) === false);
}

// ── the real gun ─────────────────────────────────────────────────────
{
  const w = world(), W = put(w, 'warden', 6, 3), A = put(w, 'globbo', 6, 0, { hp: 5 });
  const FIRE = { mx: 0, mz: 0, ax: 1, az: 0, aim: true, fire: true, dash: false };
  let blocks = 0, hits = 0;
  for (let i = 0; i < 90; i++) { step(w, FIRE); blocks += w.events.filter((e) => e.type === 'block' && e.id === A.id).length; hits += w.events.filter((e) => e.type === 'hit' && e.id === A.id).length; }
  check('the hero\'s own stream on a ward: every shot blocked, nothing lands', blocks > 5 && hits === 0 && A.hp === 5, `${blocks} blocks, ${hits} hits`);
  api.kill(w, W, 'hero');
  for (let i = 0; i < 90 && A.alive; i++) step(w, FIRE);
  check('… kill the WARDEN first and the same stream kills it', !A.alive);
}

// ── determinism: the WARDEN draws nothing from the run's random ──────
{
  const a = world({ seed: 7 }), b = world({ seed: 7 });
  put(a, 'warden', 4, 4, {}, { walk: true });
  for (let i = 0; i < 120; i++) { step(a, IDLE); step(b, IDLE); }
  check('it uses no randomness at all: the run\'s rng is where it would be without it', a.rng.next() === b.rng.next());
  const c = world({ seed: 3 }), d = world({ seed: 3 });
  const gc = put(c, 'warden', 7, -3, {}, { walk: true }), gd = put(d, 'warden', 7, -3, {}, { walk: true });
  for (let i = 0; i < 300; i++) { step(c, IDLE); step(d, IDLE); }
  check('… and replays exactly', gc.x === gd.x && gc.z === gd.z);
}

// ── the look ─────────────────────────────────────────────────────────
{
  let matArgs = null;
  const scene = new THREE.Scene(), clock = { value: 0 };
  const ctx = { THREE, TSL: THREE.TSL, GEL_TIME: clock, T, S, kind: 'warden', scene, geo: { blob: new THREE.SphereGeometry(1, 8, 6) },
    gelMaterial: (hex, fam, r, o) => { matArgs = [hex, fam, r, o]; const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color(); m.gel = { tear: { value: 0 } }; return m; } };
  const mk = () => ({ kind: 'warden', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0.7, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) });
  const v = mk();
  check('the body is the plain gel dome in 0x33ffdd, shaped by the core (not `own`)',
    !v.own && matArgs[0] === 0x33ffdd && matArgs[1] === 'blob' && matArgs[2] === 1 && matArgs[3] === undefined && v.body.geometry === ctx.geo.blob && v.body.material === v.mat);
  const geo = v.ring.geometry.parameters, rmat = v.ringMat;
  check('the ring: RingGeometry(4.32, 4.5, 48), drawn, not added (v104: no glow), no depth write, both sides, cyan',
    near(geo.innerRadius, 4.32, 1e-12) && geo.outerRadius === 4.5 && geo.thetaSegments === 48 && rmat.blending === THREE.NormalBlending
    && rmat.depthWrite === false && rmat.side === THREE.DoubleSide && rmat.transparent && rmat.color.getHex() === 0x33ffdd);
  check('… laid flat at y 0.06', near(v.ring.rotation.x, -Math.PI / 2) && v.ring.position.y === 0.06);
  const g = { id: 1, kind: 'warden', state: 'active', r: 0.85, x: 0, z: 0, s: {} };
  look.update(v, g, null, 1.5, 1);
  check('it rides under the body\'s root, not its squash (the squash spring does not bend the floor ring)', v.ring.parent === v.root);
  check('its opacity breathes 0.30 + 0.13·sin(3.1·t + phase) (enemy.js:1764)', near(rmat.opacity, 0.30 + 0.13 * Math.sin(1.5 * 3.1 + 0.7)));
  look.update(v, g, null, 2.2, 1);
  check('… on the clock', near(rmat.opacity, 0.30 + 0.13 * Math.sin(2.2 * 3.1 + 0.7)) && rmat.opacity >= 0.17 && rmat.opacity <= 0.43);
  v.root.position.set(3, 0, -2); v.root.updateMatrixWorld(true);
  const p = new THREE.Vector3(); v.ring.getWorldPosition(p);
  check('it follows the body', near(p.x, 3) && near(p.y, 0.06) && near(p.z, -2));
  look.update(v, { ...g, r: 1.02 }, null, 2.2, 1);
  check('an elite\'s ring is the same 4.5 (the rule does not grow)', v.ring.scale.x === 1 && v.ring.geometry.parameters.outerRadius === 4.5);
  // the view swells the body in (TUNING.gel.swell, the `grow` it is handed);
  // the ring is the rule, up from the first step, so it is lit and full-size
  // through the swell (1.x built it lit at its full 4.5, enemy.js:1124-1131)
  look.update(v, { ...g, t: dt }, null, 2.2, 0.15);
  check('lit through the view\'s swell-in: the shield is up from the first step (enemy.js:662, 1124-1131; main.js:10706-10708)',
    near(rmat.opacity, 0.30 + 0.13 * Math.sin(2.2 * 3.1 + 0.7)) && v.ring.scale.x === 1 && v.ring.parent === v.root);
  look.update(v, { ...g, state: 'appear' }, null, 2.2, 1);
  check('2.0: dark only while the core holds a body inert (state \'appear\', a brood\'s wait: such a body has not stepped, so it shields nothing)', rmat.opacity === 0);
  look.update(v, g, null, 2.2, 1);
  v.mat.gel.tear.value = 1; v.ring.onBeforeRender();
  check('it goes out the instant the WARDEN dies (the death thrash, tear, runs exactly while it dies)', rmat.opacity === 0);
  v.mat.gel.tear.value = 0; look.update(v, g, null, 2.2, 1); v.ring.onBeforeRender();
  check('… and a pooled view, reused, lights again', rmat.opacity > 0);

  // the deflection droplets
  const sp = v.sparks, mesh = sp.mesh, rnd = Math.random;
  check('the droplets live in the scene, shared by every WARDEN there', mesh.parent === scene && mk().sparks === sp && scene.children.filter((c) => c === mesh).length === 1);
  check('… a pool of 96, nothing in the air yet', mesh.instanceMatrix.count === 96 && mesh.count === 0);
  Math.random = () => 0.5;                                  // the middle of every 1.x roll
  const ward = { id: 7, kind: 'globbo', x: 2, z: 0, r: 0.55, shield: true };
  const wv = { tick: 5, events: [{ type: 'block', id: 7, x: 1.2, z: 0 }], gels: [ward] };
  clock.value = 10; look.update(v, g, wv, 10, 1);
  const at = (i) => { const m = new THREE.Matrix4(), q = new THREE.Vector3(), s = new THREE.Vector3(); mesh.getMatrixAt(i, m); m.decompose(q, new THREE.Quaternion(), s); return { q, s }; };
  const d0 = sp.drops.filter((d) => d.live);
  check('a shot the aura ate throws three droplets', mesh.count === 3 && d0.length === 3);
  check('… from the bullet at the ward\'s mid-height + 0.15 (a blob\'s fxY is its radius)', near(at(0).q.x, 1.2, 1e-6) && near(at(0).q.y, 0.55 + 0.15, 1e-6) && near(at(0).q.z, 0, 1e-6));
  check('… back along the hit at 4 u/s, 3 up, 0.08 big', d0.every((d) => near(Math.hypot(d.vx, d.vz), 4) && angDiff(Math.atan2(d.vz, d.vx), Math.PI) < 1e-9 && d.vy === 3) && near(at(0).s.y, 0.08, 1e-6));
  const w6 = { ...wv, tick: 6 };
  Math.random = () => 0; look.update(v, g, w6, 10, 1);
  const d1 = sp.drops.filter((d) => d.live).slice(3);
  check('… spread ±0.8 rad (rand 0 → −0.8) and 2 up', d1.length === 3 && d1.every((d) => angDiff(Math.atan2(d.vz, d.vx), Math.PI - 0.8) < 1e-9 && d.vy === 2));
  Math.random = rnd;
  look.update(v, g, w6, 10, 1); look.update(v, g, w6, 10, 1);
  check('one step\'s blocks throw once, however many frames draw it', mesh.count === 6);
  look.update(v, g, { tick: 7, events: [{ type: 'block', id: 8, x: 0, z: 0 }], gels: [{ id: 8, kind: 'globbo', x: 0, z: 0, r: 0.55, shield: false }] }, 10, 1);
  check('a block the aura did not make throws nothing', mesh.count === 6);
  look.update(v, g, { tick: 8, events: [{ type: 'plate', id: 9, x: 1, z: 0 }, { type: 'block', id: 9, x: 1, z: 0 }], gels: [{ id: 9, kind: 'bulwark', x: 0, z: 0, r: 0.9, shield: true }] }, 10, 1);
  check('… nor one a BULWARK\'s plate took first (1.x tests the plate before the aura, main.js:10683-10700)', mesh.count === 6);
  look.update(v, g, { tick: 9, events: [{ type: 'block', id: 10, x: 1, z: 0 }], gels: [{ id: 10, kind: 'yela', x: 0, z: 0, r: 0.7, shield: true }] }, 10, 1);
  check('a cube ward\'s droplets start at its rest height 0.9 × radius + 0.15 (enemy.js:1000)', mesh.count === 9 && near(sp.drops.filter((d) => d.live)[6].y, 0.9 * T.species.yela.radius + 0.15));
  // e.fxY by 1.x's own sets (enemy.js:1479), whatever 2.0's family says
  let tick = 20;
  const yOf = (ward) => {
    const n = sp.drops.filter((d) => d.live).length;
    look.update(v, g, { tick: tick++, events: [{ type: 'block', id: ward.id, x: ward.x + 0.5, z: 0 }], gels: [{ shield: true, z: 0, ...ward }] }, 10, 1);
    const live = sp.drops.filter((d) => d.live);
    return live.length === n + 3 ? live[n].y : NaN;
  };
  check('… an elite cube\'s: 0.9 × its own radius, elite size and all (L, enemy.js:1498)', near(yOf({ id: 11, kind: 'yela', x: 0, r: 0.84 }), 0.9 * 0.84 + 0.15));
  check('a BOTFLY\'s: its hover, 1.5 (enemy.js:1233), not its radius', near(yOf({ id: 12, kind: 'botfly', x: 0, r: 0.5 }), 1.5 + 0.15));
  check('a PYRA\'s, a DRAPER\'s, a SHEPHERD\'s: their CFG radius, not their size (not 1.x BLOB_TYPES, enemy.js:939, 1000)',
    near(yOf({ id: 13, kind: 'pyra', x: 0, r: 1.2 }), T.species.pyra.radius + 0.15)
    && near(yOf({ id: 14, kind: 'draper', x: 0, r: 99 }), T.species.draper.radius + 0.15)
    && near(yOf({ id: 15, kind: 'shepherd', x: 0, r: 99 }), T.species.shepherd.radius + 0.15));
  check('a BAMBU\'s: 0, its group stands on the floor (enemy.js:870)', near(yOf({ id: 16, kind: 'bambu', x: 0, r: 0.7 }), 0.15));
  check('a boss blob\'s and a SLUG\'s: their radius as they stand (enemy.js:1468-1470, 1479)',
    near(yOf({ id: 17, kind: 'globbo', x: 0, r: 0.825 }), 0.825 + 0.15) && near(yOf({ id: 18, kind: 'slug', x: 0, r: 0.6 }), 0.6 + 0.15));

  // the WARDEN killed in the very step its aura blocked: its wards are no
  // longer shielded when the frame is drawn, and it is gone from the floor
  const before = sp.drops.filter((d) => d.live).length;
  look.update(v, g, { tick: tick++, events: [{ type: 'block', id: 30, x: 2.5, z: 0 }, { type: 'kill', id: 31, kind: 'warden', x: 0, z: 0, r: 0.85 }],
    gels: [{ id: 30, kind: 'globbo', x: 3, z: 0, r: 0.55, shield: false }] }, 10, 1);
  check('a WARDEN killed in the step its aura blocked still throws the droplets (1.x threw them at the block)', sp.drops.filter((d) => d.live).length === before + 3);
  look.update(v, g, { tick: tick++, events: [{ type: 'block', id: 32, x: 4.5, z: 0 }, { type: 'kill', id: 33, kind: 'warden', x: 0, z: 0, r: 0.85 }],
    gels: [{ id: 32, kind: 'globbo', x: 5, z: 0, r: 0.55, shield: false }] }, 10, 1);
  check('… but not for a body outside the dead WARDEN\'s aura', sp.drops.filter((d) => d.live).length === before + 3);
  look.update(v, g, { tick: tick++, events: [{ type: 'block', id: 34, x: 1.5, z: 0 }, { type: 'kill', id: 35, kind: 'warden', x: 0, z: 0, r: 0.85 },
    { type: 'kill', id: 34, kind: 'globbo', x: 2, z: 0, r: 0.55 }], gels: [] }, 10, 1);
  const dk = sp.drops.filter((d) => d.live);
  check('… nor lose them when the ward died later that step too: its kill says where it stood',
    dk.length === before + 6 && near(dk[before + 3].y, 0.55 + 0.15) && near(dk[before + 3].x, 1.5));
  // no WARDEN left to look: the droplets read the world they were last shown
  const wv2 = { tick: tick++, events: [], gels: [{ id: 36, kind: 'globbo', x: 2, z: 0, r: 0.55, shield: true }] };
  look.update(v, g, wv2, 10, 1);
  wv2.tick = tick++; wv2.events = [{ type: 'block', id: 36, x: 1.5, z: 0 }];
  mesh.onBeforeRender();
  check('… and with no WARDEN view left to update them, they still catch the last step\'s blocks', sp.drops.filter((d) => d.live).length === before + 9);
  mesh.onBeforeRender();
  check('… once', sp.drops.filter((d) => d.live).length === before + 9);

  // flight: 1.x's chunk physics on the frame clock
  const d = d0[0], y0 = d.y, x0 = d.x;
  clock.value = 10 + 1 / 60; mesh.onBeforeRender();
  check('they fly on the gel clock with no WARDEN looking (onBeforeRender): gravity 14, 4 u/s out', near(d.vy, 3 - 14 / 60, 1e-12) && near(d.y, y0 + (3 - 14 / 60) / 60, 1e-12) && near(d.x, x0 - 4 / 60, 1e-12));
  let landed = false;
  for (let i = 2; i <= 60; i++) { clock.value = 10 + i / 60; mesh.onBeforeRender(); if (d.y === 0 && d.vy === 0) landed = true; }
  check('… land, squash and skid to a stop (× 0.35 a landing)', landed && d.live && Math.abs(d.vx) < 0.05);
  for (let i = 61; i <= 80; i++) { clock.value = 10 + i / 60; mesh.onBeforeRender(); }
  check('… shrink over their last 0.3 s', d.live && d.life < 0.3 && at(0).s.y < 0.06);
  for (let i = 81; i <= 90; i++) { clock.value = 10 + i / 60; mesh.onBeforeRender(); }
  check('… and are gone after 1.4 s', !sp.drops.some((q) => q.live) && mesh.count === 0);

  // a full pool reuses the droplet with the least life left
  for (let t = 0; t < 40; t++) look.update(v, g, { tick: 100 + t, events: [{ type: 'block', id: 7, x: 1.2, z: 0 }], gels: [ward] }, 12, 1);
  check('a full pool (40 blocks, 120 droplets) holds 96 and reuses the oldest', mesh.count === 96);
}

if (failed) { console.log(`✗ warden: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ warden: ${passed} checks`);
