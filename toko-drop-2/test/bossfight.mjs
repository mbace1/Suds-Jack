#!/usr/bin/env node
// bossfight.mjs — the arcade's boss waves fought on the clock (v42,
// sim/bossfight.js), in bare node: a boss wave starts a fight with its
// world's own boss (v45) and the measured lines, the boss going down ends the wave (what it
// brought is popped: no score, no streak, no corpse fire, no carry into the
// next wave), and the grade pays its share and, on an S or an A, a pod.
import { createWorld, step, api } from '../js/sim/world.js?v=161';
import { TUNING as T } from '../js/tuning.js?v=161';
import { gradeOf, tiersFor } from '../js/sim/bossfight.js?v=161';
import { headliner } from '../js/sim/director/arcade.js?v=161';
import { BOSS_TIERS } from '../js/tuning/bossfights.js?v=161';
import { phaseSpec } from '../js/sim/species/bosskit.js?v=161';
import { BOSS_KINDS } from '../js/tuning/bosskinds.js?v=161';
// v157: the fight on the clock, graded on time, as v156 fought every boss; the kinds (an endurance boss's clock and
// hits, a strategic boss's armour) are test/bosskinds.mjs
BOSS_KINDS.on = false;

let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const dt = T.sim.dt, F = T.waves.bossFight, EVERY = T.waves.rhythm.bossEvery;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

// a run at the start of world `world`'s boss wave, the floor empty, the hero untouchable
function at(world, seed, mode = 'arcade') {
  const w = createWorld({ seed, mode, world });
  w.hero.invinc = 1e9;
  step(w, IDLE);
  w.gels = []; w.dir.queue = []; w.dir.wave = world * EVERY - 1; w.dir.gapT = 1e-9;
  step(w, IDLE); step(w, IDLE);
  return w;
}
const run = (w, s, each) => { for (let i = 0; i < s / dt; i++) { each?.(w, i); step(w, IDLE); const e = w.events.find((x) => x.type === 'bossDown'); if (e) return e; } return null; };
const bossesUp = (w) => { for (let i = 0; i < 4 / dt && w.dir.queue.some((q) => q.boss); i++) step(w, IDLE); };

// the lines: every world, its own boss (v45), best first
{
  let ok = true;
  for (let k = 1; k <= T.worlds.list.length; k++) { const L = BOSS_TIERS[k]?.[T.waves.boss.worlds[k - 1]]; if (!L || !(L.S < L.A && L.A < L.B)) ok = false; }
  check('every world has measured lines for its own boss, S < A < B', ok);
  check('a world past the measured ones borrows the last', JSON.stringify(tiersFor(99, 'omega')) === JSON.stringify(BOSS_TIERS[T.worlds.list.length].omega));
  const L = { S: 10, A: 20, B: 30 };
  check('graded on the clock: S, A, B, then C', gradeOf(L, 10) === 'S' && gradeOf(L, 10.1) === 'A' && gradeOf(L, 30) === 'B' && gradeOf(L, 31) === 'C' && gradeOf(null, 1) === 'C');
}

// a boss wave is a fight; the wave before it is not
{
  const w = at(1, 12);
  check('a boss wave starts a fight with its world\'s own boss and its lines', w.fight && w.fight.kind === headliner(EVERY, 12, 1).kind && w.fight.kind === 'prism' && w.fight.tiers === BOSS_TIERS[1][w.fight.kind], JSON.stringify(w.fight && { kind: w.fight.kind, tiers: w.fight.tiers }));
  bossesUp(w);
  for (let i = 0; i < 30; i++) step(w, IDLE);
  check('…and counts its boss\'s health', w.fight.seen && w.fight.max > 0 && w.fight.hp === w.fight.max, JSON.stringify({ hp: w.fight.hp, max: w.fight.max }));
}

// every world's boss wave brings its own boss, at its health (v45)
{
  const bad = [];
  for (let k = 1; k <= T.worlds.list.length; k++) {
    const want = T.waves.boss.worlds[k - 1], S = T.species[want];
    const w = at(k, 21);
    bossesUp(w);
    const b = w.gels.filter((g) => g.alive && g.isBoss);
    // v154: a boss fought in three phases has its own health (tuning/bossphases.js), as the arcade director gives it
    const hp = phaseSpec(w, want)?.hp ?? Math.round((S.bossHp ?? Math.ceil(S.hp * T.waves.boss.hpMult)) * (T.waves.boss.worldHp?.[want] ?? 1));
    if (w.fight?.kind !== want || !b.length || !b.every((g) => g.kind === want && g.maxHp === hp)) bad.push(`${k}:${b.map((g) => `${g.kind}/${g.maxHp}`).join(',')}`);
  }
  check('every world\'s boss wave brings its own boss, at its health', !bad.length, bad.join(' '));
  check('…and outside the worlds, 1.x\'s alternation by seed', headliner(EVERY, 1).kind === 'prism' && headliner(EVERY, 0).kind === 'omega' && headliner(EVERY, 0, 4).kind === 'blister');
}

// the boss down ends the wave: adds popped (no score, no streak, no kills), bullets gone, a pod on an S
{
  const w = at(1, 11);
  bossesUp(w);
  for (let i = 0; i < 2 / dt; i++) step(w, IDLE);
  const adds = w.gels.filter((g) => g.alive && !g.isBoss).length;
  w.fight.t = 0.5;                                  // a quick fight: an S
  let s0 = null, k0 = null, st0 = null, items0 = w.pk.items.length;
  // every boss of the wave (the prisms are two) down in one step, and the count read after them
  const e = run(w, 2, (w) => { let n = 0; for (const g of w.gels) if (g.alive && g.isBoss) { api.kill(w, g); n++; } if (n) { s0 = w.score; k0 = w.kills; st0 = w.streak; } });
  const others = w.gels.filter((g) => g.alive).length;
  check('the boss down: the fight ends with its grade and its pay', e && e.grade === 'S' && e.bonus === Math.round(F.share.S * F.perWave * EVERY), JSON.stringify(e && { grade: e.grade, bonus: e.bonus }));
  check(`…what it brought goes with it (${adds} adds), popped for nothing`, adds > 0 && others === 0 && w.score === s0 + e.bonus && w.kills === k0 && w.streak === st0, JSON.stringify({ adds, others, score: w.score - s0, kills: w.kills - k0 }));
  check('…the enemy bullets with them, and nothing left queued', w.bullets.every((b) => b.hero || b.dead) && w.dir.queue.length === 0);
  check('…and an S drops a pod where the boss fell', w.pk.items.length > items0);
  let clear = null;
  for (let i = 0; i < 2 / dt && !clear; i++) { step(w, IDLE); clear = w.events.find((x) => x.type === 'clear'); }
  check('…then the wave clears', !!clear);
}

// the bug v42 shipped with in its first cut: the round's clock already run out with the adds standing
{
  const w = at(1, 12);
  bossesUp(w);
  for (let i = 0; i < 2 / dt; i++) step(w, IDLE);
  w.dir.waveT = w.dir.roundLen + 5;
  w.fight.t = 1e3;                                  // a slow fight: a C, no pod
  const items0 = w.pk.items.length, wave0 = w.dir.wave;
  let carried = false;
  const e = run(w, 2, (w) => { for (const g of w.gels) if (g.alive && g.isBoss) api.kill(w, g); if (w.events.some((x) => x.type === 'wave')) carried = true; });
  check('a boss down past the round\'s clock still ends the fight, and the adds do not carry into the next wave', e && e.grade === 'C' && !carried && w.dir.wave === wave0, JSON.stringify({ e: !!e, carried, wave: w.dir.wave }));
  check('…a C pays its share and drops no pod', e && e.bonus === Math.round(F.share.C * F.perWave * EVERY) && w.pk.items.length === items0);
}

// HARDCADE: the popped fire no corpse
{
  const w = at(2, 11, 'hardcade');
  bossesUp(w);
  for (let i = 0; i < 2 / dt; i++) step(w, IDLE);
  const e = run(w, 2, (w) => { for (const g of w.gels) if (g.alive && g.isBoss) api.kill(w, g); });
  const rev = w.bullets.filter((b) => b.revenge && !b.dead).length;
  check('HARDCADE: the boss goes down and its adds fire nothing as they go', e && rev === 0, `${rev} corpse bullets`);
}

console.log(failed ? `\n✗ bossfight: ${failed} failed, ${passed} passed` : `✔ bossfight: ${passed} checks`);
process.exit(failed ? 1 : 0);
