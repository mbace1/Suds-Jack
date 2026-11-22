#!/usr/bin/env node
// kettle.mjs — KETTLE (THE BOILER ROOM's boss, v45), in bare node: it builds
// pressure, vents jets that turn and steam where it stands, and every second
// vent stalls red-hot, when a shot does double.
import { checker, arena, common } from '../lib/boss.mjs';
import BEH from '../../js/sim/species/kettle.js?v=161';
const K = 'kettle', { check, done } = checker(K);
const { S } = common(K, 5, { check });
{
  const A = arena(K, { world: 5, x: 9 });
  let told = 0;
  A.run(S.fill + 0.5, (w, g) => { told = Math.max(told, g.tell); return A.log.some((e) => e.type === 'vent'); });
  check('it builds pressure (its tell), then vents', told > 0.9 && A.log.some((e) => e.type === 'vent'));
  check('…scalding steam where it stands', A.w.hazards.some((z) => z.src === K && z.r === S.vent.steam.r));
  A.run(S.vent.time + 0.1);
  const angles = new Set(A.w.bullets.filter((b) => b.src === K).map((b) => Math.round(Math.atan2(b.vz, b.vx) * 10)));
  check(`…in ${S.vent.jets} jets that turn`, A.w.bullets.filter((b) => b.src === K).length > S.vent.jets * 15 && angles.size > 20, `${angles.size} headings`);
  A.run(S.fill + S.vent.time + 1, (w, g) => g.s.state === 'stall');
  check('the second vent stalls it, red-hot', A.g.s.state === 'stall' && A.g.s.hot);
  const hp = A.g.hp; BEH.onHit(A.w, A.g, {}, A.api);
  check(`…when a shot does ${S.stall.damage} (the core takes 1, the stall the rest)`, hp - A.g.hp === S.stall.damage - 1);
  A.run(S.stall.time + 0.1);
  check('…and then builds again, cool', A.g.s.state === 'build' && !A.g.s.hot);
}
done();
