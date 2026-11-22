#!/usr/bin/env node
// curbking.mjs — CURB KING (THE DRIVEWAY's boss, v45), in bare node: it
// squats, marks its landing, leaps out of reach, lands there with a ring;
// raging, it hops twice in a row, its ring doubled, and shakes HOPPA loose.
import { checker, arena, common } from '../lib/boss.mjs';
import BEH from '../../js/sim/species/curbking.js?v=162';
const K = 'curbking', { check, done } = checker(K);
const { S } = common(K, 2, { check });
{
  const A = arena(K, { world: 2 });
  let mark = null, airMiss = false, high = 0;
  A.run(8, (w, g) => {
    if (g.s.state === 'crouch' && !mark) mark = { x: g.s.tx, z: g.s.tz };
    if (g.s.state === 'hop') { high = Math.max(high, g.s.y); if (g.s.y > S.airborne && A.api) airMiss ||= !BEH.hitTest(w, g, g.x, g.z, 0.15); }
    return A.log.some((e) => e.type === 'hopLand');
  });
  const land = A.log.find((e) => e.type === 'hopLand');
  check('it squats, marks where it will land, and lands there', !!mark && !!land && Math.hypot(land.x - mark.x, land.z - mark.z) < 1e-6);
  check(`in the air it goes over your head (${high.toFixed(1)} u) and your shots pass under it`, high > S.airborne && airMiss);
  check(`the landing is a ring of ${S.ring.count}`, A.shots() === S.ring.count, `${A.shots()}`);
}
{
  const A = arena(K, { world: 2 });
  A.run(0.2); A.g.hp = A.g.maxHp * 0.4; A.run(0.1);
  A.log.length = 0;
  const t0 = A.w.time;
  A.run(12, () => A.log.some((e) => e.type === 'hopLand'));
  const ring = A.shots();
  A.run(12, () => A.log.filter((e) => e.type === 'hopLand').length >= 3);
  const lands = A.log.filter((e) => e.type === 'hopLand').length;
  check(`raging, its landing ring is doubled (${ring})`, ring === S.ring.count + S.ring2.count);
  check('…three landings come quickly: it hops twice in a row', lands >= 3 && A.w.time - t0 < 9, `${lands} in ${(A.w.time - t0).toFixed(1)} s`);
  const kidsBefore = A.w.gels.filter((g) => g.alive && g.kind === 'hoppa' && g.child).length;
  A.run(20, () => A.log.filter((e) => e.type === 'hopLand').length >= S.rage.brood.every);
  const kids = A.w.gels.filter((g) => g.alive && g.kind === 'hoppa' && g.child).length;
  check(`…none shaken loose before landing ${S.rage.brood.every}, then ${S.rage.brood.n} HOPPA`, kidsBefore === 0 && kids === S.rage.brood.n, `${kidsBefore} then ${kids} hoppa`);
}
done();
