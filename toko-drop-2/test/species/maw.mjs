#!/usr/bin/env node
// maw.mjs — MAW (THE SEWER's boss, v45), in bare node: out of reach under
// the floor, it comes up near you with a ring, sprays a turning spiral while
// it stands, and goes back down; raging, every hole it goes down fills with
// sludge.
import { checker, arena, common } from '../lib/boss.mjs';
import BEH from '../../js/sim/species/maw.js?v=160';
const K = 'maw', { check, done } = checker(K);
const { S } = common(K, 3, { check });
{
  const A = arena(K, { world: 3, x: 12 });
  let underMiss = true, upHit = false;
  A.run(10, (w, g) => {
    if (g.s.state === 'under' && BEH.hitTest(w, g, g.x, g.z, 0.15)) underMiss = false;
    if (g.s.state === 'up' && g.s.up > 0.5) upHit ||= BEH.hitTest(w, g, g.x, g.z, 0.15);
    return A.log.some((e) => e.type === 'wormUp');
  });
  const up = A.log.find((e) => e.type === 'wormUp');
  check('under the floor nothing reaches it; it comes up near you', underMiss && !!up && Math.hypot(up.x - A.w.hero.x, up.z - A.w.hero.z) < S.surface[1] + 1.5);
  check(`it breaks the floor with a ring of ${S.erupt.count}`, A.shots() === S.erupt.count, `${A.shots()}`);
  const n0 = A.shots();
  A.run(1.5, (w, g) => { if (g.s.state === 'up' && g.s.up > 0.5) upHit ||= BEH.hitTest(w, g, g.x, g.z, 0.15); });
  check('up, it can be hit, and sprays its spiral', upHit && A.shots() - n0 >= 15, `${A.shots() - n0} more`);
  A.run(6, () => A.log.some((e) => e.type === 'wormDown'));
  check('then it goes back down, leaving nothing while it is calm', A.log.some((e) => e.type === 'wormDown') && A.w.hazards.filter((z) => z.src === K).length === 0);
}
{
  const A = arena(K, { world: 3, x: 12 });
  A.run(0.2); A.g.hp = A.g.maxHp * 0.4;
  A.run(14, () => A.log.some((e) => e.type === 'wormDown'));
  check('raging, the hole it goes down fills with sludge', A.w.hazards.some((z) => z.src === K && z.r === S.rage.sludge.r));
}
done();
