#!/usr/bin/env node
// bosskinds.mjs — every world boss is one of two kinds, by turns (v157, tuning/bosskinds.js), in bare node.
// Owner, 19 Nov 2026: "make first boss endurance, second strategic, and so on".
//   the call     worlds 1, 3, 5, 7, 9 ENDURE; 2, 4, 6, 8 READ; in ARCADE and HARDCADE only, the campaign's rooms as
//                they were, and ?bosskinds=off (BOSS_KINDS.on) the v156 bosses
//   READ         a shot that lands outside the boss's window clinks off it (no health lost, a block event 'armour');
//                inside it, it lands; the ring under the boss says which (g.s.armour)
//   ENDURE       left alone the fight lasts its hold and the boss breaks at the end of it; hit as hard as you like
//                it still lasts (1 - shave) of the hold; its phases come on the clock; graded on the hits taken
import { arena, checker, dt } from './lib/boss.mjs';
import { BOSS_KINDS } from '../js/tuning/bosskinds.js?v=158';
import { BOSS_PHASES } from '../js/tuning/bossphases.js?v=158';
import { kindOf, armoured } from '../js/sim/species/bosskit.js?v=158';
import { BEHAVIOUR } from '../js/sim/species/index.js?v=158';
import * as bossfight from '../js/sim/bossfight.js?v=158';
import { TUNING as T } from '../js/tuning.js?v=158';

const { check, done } = checker('bosskinds');
BOSS_KINDS.on = true; BOSS_PHASES.on = true;   // (lib/boss.mjs turns both off for the species' own specs)

// ── the call: by turns, endurance first ──
const worlds = T.waves.boss.worlds;
worlds.forEach((key, i) => check(`world ${i + 1}'s ${key.toUpperCase()} is ${i % 2 ? 'STRATEGIC' : 'ENDURANCE'}`, BOSS_KINDS.kind[key] === (i % 2 ? 'read' : 'endure'), BOSS_KINDS.kind[key]));
check('ARCADE and HARDCADE fight the kinds', kindOf({ mode: 'arcade' }, 'maw') === 'endure' && kindOf({ mode: 'hardcade' }, 'pike') === 'read');
check('…a campaign room keeps its own boss', kindOf({ mode: 'campaign' }, 'maw') === null && kindOf({ mode: 'campaign' }, 'pike') === null);
check('…and SURVIVAL (no boss of its own) is not asked', kindOf({ mode: 'survival' }, 'maw') === null);
BOSS_KINDS.on = false;
check('?bosskinds=off is the v156 bosses', kindOf({ mode: 'arcade' }, 'maw') === null && kindOf({ mode: 'arcade' }, 'pike') === null);
BOSS_KINDS.on = true;
for (const key of Object.keys(BOSS_KINDS.endure.hold)) check(`${key}: an endurance boss has a hold`, BOSS_KINDS.kind[key] === 'endure' && BOSS_KINDS.endure.hold[key] >= 15);

// ── READ: armoured outside the window ──
// the hero at the middle firing at the boss every step; every step's health is checked against whether the boss
// was open as the step began or as it ended (a window can open and close inside one)
const fireAt = (g) => (w) => { const dx = g.x - w.hero.x, dz = g.z - w.hero.z, d = Math.hypot(dx, dz) || 1; return { mx: 0, mz: 0, ax: dx / d, az: dz / d, aim: true, fire: true, dash: false }; };
for (const [key, world] of [['curbking', 2], ['pike', 6], ['angler', 8]]) {
  const A = arena(key, { world, x: 7, z: 2 });
  check(`${key}: says when it is open`, typeof BEHAVIOUR[key].open === 'function');
  let closedLoss = 0, openLoss = 0, openSteps = 0, closedSteps = 0;
  for (let i = 0; i < 16 / dt; i++) {
    const hp0 = A.g.hp, open0 = !armoured(A.w, A.g, BEHAVIOUR[key]);
    A.run(dt, null, fireAt(A.g));
    if (!A.g.alive) break;
    const open1 = A.g.s.armour === false, lost = hp0 - A.g.hp;
    if (open0 || open1) { openSteps++; openLoss += Math.max(0, lost); } else { closedSteps++; closedLoss += Math.max(0, lost); }
  }
  const clinks = A.log.filter((e) => e.type === 'block' && e.by === 'armour').length;
  check(`${key}: closed, it takes nothing — the shots clink off`, closedLoss === 0 && clinks > 0 && closedSteps > 0, `lost ${closedLoss} over ${closedSteps} closed steps, ${clinks} clinks`);
  check(`${key}: open, the shots land`, openLoss > 0 && openSteps > 0, `lost ${openLoss} over ${openSteps} open steps`);
}
// BLISTER reads by its own shell, as it always did: no armour of the kinds' on top
{
  const A = arena('blister', { world: 4 }); A.run(0.2);
  check('blister: its shell is its window (no armour on top)', !BEHAVIOUR.blister.open && A.g.s.armour === null && !armoured(A.w, A.g, BEHAVIOUR.blister));
}
// the windows are a little wider in these modes (bosskinds.js `set`), and the campaign's are not
{
  const A = arena('pike', { world: 6 }); A.run(0.2);
  check('pike: stunned longer here (its window)', A.api.S(A.g).stun.time === BOSS_KINDS.read.pike.set.stun.time);
  const C = arena('curbking', { world: 2 }); C.run(0.2);
  check('curbking: dazed after a landing here', C.api.S(C.g).daze === BOSS_KINDS.read.curbking.set.daze);
}

// ── ENDURE: the clock ──
// the fight started as the director starts it, and stepped as the director steps it (a stand-in director here)
function fight(key, world, { hit = 0, hits = 0 } = {}) {
  const A = arena(key, { world, x: 9, z: 3 });
  bossfight.start(A.w, key);
  A.w.director = { step(w, d, api) { bossfight.step(w, d, api); } };
  const hold = BOSS_KINDS.endure.hold[key];
  let t = 0;
  for (; t < hold + 5 && A.g.alive; t += dt) {
    if (hit) A.g.hp -= hit;                                  // as hard as you like, every step
    if (hits && Math.abs(t - 1) < dt / 2) A.w.hits = (A.w.hits || 0) + hits;   // hits taken in the fight
    A.run(dt);
  }
  return { A, t, hold, F: A.w.fight };
}
for (const [key, world] of [['maw', 3], ['kettle', 5], ['berg', 7]]) {
  const hold = BOSS_KINDS.endure.hold[key];
  const idle = fight(key, world);
  check(`${key}: left alone it breaks when its ${hold} s are up`, !idle.A.g.alive && Math.abs(idle.t - hold) < 0.1 && idle.F.done, `t ${idle.t.toFixed(2)}`);
  check(`${key}: …a kill, its whole death (the big burst)`, idle.A.log.some((e) => e.type === 'kill' && e.boss && e.kind === key));
  check(`${key}: …untouched, an S`, idle.F.grade === 'S');
  // its phases on the clock (bosskinds.js `lines`): stage lengths 1 : 1.15 : 1.3 of the hold
  const ph = idle.A.log.filter((e) => e.type === 'phase' && e.kind === key);
  const L = BOSS_KINDS.endure.lines;
  check(`${key}: …its three phases came on the clock`, ph.length === 2 && ph.map((e) => e.phase).join() === '2,3', ph.map((e) => e.phase).join());
  // hit hard every step: shorter, never under (1 - shave) of the hold
  const hard = fight(key, world, { hit: 50 });
  const least = (1 - BOSS_KINDS.endure.shave) * hold;
  check(`${key}: hit as hard as you like, it lasts ${least.toFixed(1)} s and no less`, !hard.A.g.alive && hard.t >= least - 0.1 && hard.t <= least + 0.6, `t ${hard.t.toFixed(2)}`);
  // graded on the hits taken: two is a B
  const hurt = fight(key, world, { hits: 2 });
  check(`${key}: two hits in the fight is a B`, hurt.F.grade === 'B' && hurt.F.hits === 2, `${hurt.F.grade} (${hurt.F.hits})`);
  check(`${key}: the HUD shows the clock and the grade`, (() => { const B = arena(key, { world }); bossfight.start(B.w, key); B.w.director = { step(w, d, api) { bossfight.step(w, d, api); } }; B.run(2); const oc = bossfight.onCourse(B.w); return oc?.hold && oc.grade === 'S' && Math.abs(oc.left - (hold - 2)) < 0.1; })());
}
done();
