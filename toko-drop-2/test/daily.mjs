#!/usr/bin/env node
// daily.mjs — DAILY (v118), in bare node: one seed for everyone all day (UTC) and a new one the next; and in a
// daily run (createWorld fixedWaves) two players who play the day differently meet the same waves — the same
// plan, the same bodies in the same places at the same sizes, the same curtains — where on the run's one
// stream (an ordinary run) how they played moves the waves after the first.
//
//   node test/daily.mjs
import { createWorld, step, api } from '../js/sim/world.js?v=160';
import { TUNING as T } from '../js/tuning.js?v=160';
import { dailySeed } from '../js/sim/rng.js?v=160';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const dt = T.sim.dt;

// ── the seed ─────────────────────────────────────────────────────────
{
  const a = dailySeed(new Date('2026-11-06T00:00:00Z')), b = dailySeed(new Date('2026-11-06T23:59:59Z'));
  const c = dailySeed(new Date('2026-11-07T00:00:00Z')), d = dailySeed(new Date('2027-11-06T12:00:00Z'));
  check('one seed all day (UTC), a new one the next day and the next year', a === b && a !== c && a !== d && c !== d, `${a} ${b} ${c} ${d}`);
  // a clock two hours ahead of UTC (Helsinki) still plays the UTC day it is in
  check('the day is the UTC day, wherever the phone is', dailySeed(new Date('2026-11-07T01:30:00+02:00')) === a);
}

// ── the waves ────────────────────────────────────────────────────────
// a run played one way: `move` steers the hero, the floor is cleared every `every` s (so the waves come at
// different times and after different fights); what each wave was, as it began
const WAVES = 7;
function play(fixedWaves, move, every) {
  const w = createWorld({ seed: dailySeed(new Date('2026-11-06T12:00:00Z')), mode: 'arcade', fixedWaves });
  w.hero.invinc = 1e9;
  const seen = [];
  for (let i = 0; i < 400 / dt && seen.length < WAVES; i++) {
    step(w, move(i));
    if (w.events.some((e) => e.type === 'wave')) {
      const d = w.dir;
      seen.push(JSON.stringify({ wave: d.wave, kind: d.kind, plan: d.plan, giant: d.giantDue,
        curtain: { armed: d.curtain.armed, style: d.curtain.style, at: +d.curtain.at.toFixed(6) },
        queue: d.queue.map((s) => [s.kind, s.size, +(s.angle ?? 0).toFixed(6), +(s.delay ?? 0).toFixed(6), s.shooter ? 1 : 0, s.affix ?? null]) }));
    }
    if (i % Math.round(every / dt) === 0) for (const g of w.gels.slice()) if (g.alive) api.kill(w, g);
  }
  return seen;
}
const still = () => ({ mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false });
const busy = (i) => { const a = i * dt * 1.7; return { mx: Math.cos(a), mz: Math.sin(a), ax: Math.cos(a * 3), az: Math.sin(a * 3), aim: true, fire: true, dash: i % 90 === 0 }; };
{
  const A = play(true, still, 2), B = play(true, busy, 3.1);
  const same = A.length === WAVES && B.length === WAVES && A.every((x, i) => x === B[i]);
  check(`a daily run: two players who play it differently meet the same ${WAVES} waves`, same, `${A.length}/${B.length} waves, first apart: ${A.findIndex((x, i) => x !== B[i])}`);
  // the control: on the run's one stream the same two players' waves come apart (or the check above proves nothing)
  const a = play(false, still, 2), b = play(false, busy, 3.1);
  check('…where an ordinary run\'s waves come apart with how it was played', a.length === WAVES && b.length === WAVES && a.some((x, i) => x !== b[i]), `${a.length}/${b.length}`);
  // and a daily run is still its own: the ordinary run on the same seed is not it
  check('…and the day\'s waves are not an ordinary run\'s on the same seed', A.some((x, i) => x !== a[i]));
}

console.log(failed ? `\n✗ daily: ${failed} failed, ${passed} passed` : `✔ daily: ${passed} checks`);
process.exit(failed ? 1 : 0);
