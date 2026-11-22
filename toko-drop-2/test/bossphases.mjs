#!/usr/bin/env node
// bossphases.mjs — the worlds' own bosses fought in THREE PHASES (v154, tuning/bossphases.js; sim/species/bosskit.js),
// in bare node. For each of the seven: in ARCADE it starts in phase 1 and goes up one phase at a time, never skipping;
// a phase lasts at least its `min` however hard it is hit (its health holds just over the next line until then); each
// phase is announced with its own banner; phase 3 brings the world's own gel and its pace; with the phases switched off
// it is the v153 boss (one rage at half health); and a campaign room keeps the v153 boss unless `campaign` is set.
import { arena, checker, dt } from './lib/boss.mjs';
import { BOSS_PHASES } from '../js/tuning/bossphases.js?v=160';
import { phaseSpec } from '../js/sim/species/bosskit.js?v=160';
import { TUNING as T } from '../js/tuning.js?v=160';

const { check, done } = checker('bossphases');
const WORLD = { curbking: 2, maw: 3, blister: 4, kettle: 5, pike: 6, berg: 7, angler: 8 };
check('the seven world bosses all have phases', Object.keys(BOSS_PHASES.bosses).sort().join() === Object.keys(WORLD).sort().join(), Object.keys(BOSS_PHASES.bosses).join());

for (const [key, world] of Object.entries(WORLD)) {
  const B = BOSS_PHASES.bosses[key];
  check(`${key}: three phases, their lines going down, phase 1 at full health`, B.phases.length === 3 && B.phases[0].at === 1 && B.phases[1].at > B.phases[2].at && B.phases[2].at > 0);

  BOSS_PHASES.on = true;
  const A = arena(key, { world });
  check(`${key}: in ARCADE it is fought in phases`, phaseSpec(A.w, key) === B);
  const min = (i) => B.phases[i].min ?? BOSS_PHASES.minPhase;
  const phases = () => A.log.filter((e) => e.type === 'phase' && e.kind === key);
  A.run(0.5);
  check(`${key}: it starts in phase 1, unannounced`, A.g.s.phase === 0 && !phases().length);

  // a hit that crosses both lines at once, before phase 1 has lasted its min: nothing yet, and the health held
  A.g.hp = 1; A.run(dt * 2);
  const held = Math.floor(A.g.maxHp * B.phases[1].at) + 1;
  check(`${key}: phase 1 lasts its ${min(0)} s however hard it is hit (health held at ${held})`, A.g.s.phase === 0 && A.g.hp === held && !phases().length, `phase ${A.g.s.phase}, hp ${A.g.hp}`);

  // past its min, the same hit: into phase 2 only (never straight to 3), announced, and held over phase 3's line
  A.run(min(0));
  A.g.hp = 1; A.run(dt * 2);
  const p2 = phases();
  check(`${key}: then phase 2, and only phase 2 — "${B.phases[1].label}"`, A.g.s.phase === 1 && p2.length === 1 && p2[0].phase === 2 && p2[0].label === B.phases[1].label, `phase ${A.g.s.phase}, ${p2.map((e) => e.phase).join()}`);
  check(`${key}: …its health lifted just over phase 3's line`, A.g.hp === Math.floor(A.g.maxHp * B.phases[2].at) + 1, `${A.g.hp}`);
  check(`${key}: …raging as phase 2 says`, !!A.g.s.enraged === !!B.phases[1].rage);

  // phase 2's min, then phase 3: its banner, the world's own gel, its pace
  A.run(min(1));
  // counted at the step it enters: phase 2 may already shake the same gel loose on its own clock (CURB KING's brood)
  const before = A.w.gels.filter((g) => g.alive && !g.isBoss && g.kind === B.phases[2].adds?.kind).length, speed = A.g.speedMult;
  A.g.hp = Math.max(1, Math.floor(A.g.maxHp * B.phases[2].at) - 1); A.run(dt * 2);
  const p3 = phases();
  check(`${key}: then phase 3 — "${B.phases[2].label}"`, A.g.s.phase === 2 && p3.length === 2 && p3[1].phase === 3 && p3[1].label === B.phases[2].label, `phase ${A.g.s.phase}`);
  if (B.phases[2].adds) {
    const n = A.w.gels.filter((g) => g.alive && !g.isBoss && g.kind === B.phases[2].adds.kind).length - before;
    check(`${key}: …and ${B.phases[2].adds.n} ${B.phases[2].adds.kind.toUpperCase()} come to it`, n === B.phases[2].adds.n, `${n}`);
  }
  if (B.phases[2].pace) check(`${key}: …at ${B.phases[2].pace}× its pace`, Math.abs(A.g.speedMult / speed - B.phases[2].pace / (B.phases[1].pace ?? 1)) < 1e-9, `${(A.g.speedMult / speed).toFixed(3)}`);
  A.run(1);
  check(`${key}: …and it stays in phase 3 (there is no fourth)`, A.g.s.phase === 2 && phases().length === 2);

  // the switch off: the v153 boss, one rage at half its health
  BOSS_PHASES.on = false;
  const O = arena(key, { world });
  O.run(0.5); O.g.hp = Math.floor(O.g.maxHp * T.species[key].rage.at); O.run(0.2);
  const r = O.log.filter((e) => e.type === 'phase' && e.kind === key);
  check(`${key}: with the phases off it is the v153 boss — one rage at half, "${T.species[key].rage.label}"`, phaseSpec(O.w, key) === null && r.length === 1 && r[0].label === T.species[key].rage.label && O.g.s.enraged);

  // a campaign room keeps the v153 boss, unless `campaign` puts the phases there too
  BOSS_PHASES.on = true;
  // (phaseSpec reads only the run's mode; a campaign world needs a room to be made, which this does not need)
  check(`${key}: a campaign room keeps the v153 boss`, phaseSpec({ mode: 'campaign' }, key) === null);
  BOSS_PHASES.campaign = true;
  check(`${key}: …unless the phases are asked for there (?bossphases=all)`, phaseSpec({ mode: 'campaign' }, key) === B);
  BOSS_PHASES.campaign = false;
}
done();
