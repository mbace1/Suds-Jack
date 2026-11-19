#!/usr/bin/env node
// angler.mjs — ANGLER (THE DEEP's boss, v45), in bare node: its lure out in
// front, a lunge when you come near the light, lanterns that follow you;
// raging, two GLOWA come to it.
import { checker, arena, common, dt } from '../lib/boss.mjs';
const K = 'angler', { check, done } = checker(K);
const { S } = common(K, 8, { check });
{
  const A = arena(K, { world: 8, x: 14 });
  A.run(0.05);
  const lead = Math.hypot(A.g.s.lx - A.g.x, A.g.s.lz - A.g.z);
  check('its lure is held out in front, toward you', Math.abs(lead - A.g.r * S.lure.reach) < 0.3 && A.g.s.lx < A.g.x);
  let homing = 0;
  A.run(6, (w) => { homing = Math.max(homing, w.bullets.filter((b) => b.src === K && b.homing > 0).length); return homing > 0; });
  check(`it lets ${S.lantern.count} lanterns go that turn after you`, homing === S.lantern.count);
  let told = 0, top = 0;
  A.run(14, (w, g) => { told = Math.max(told, g.tell); if (g.s.state === 'bite') top = Math.max(top, Math.hypot(g.x - g.px, g.z - g.pz) / dt); return g.s.state === 'rest'; });
  check(`near the light it tells, then lunges (${top.toFixed(1)} u/s)`, told > 0.8 && top > S.bite.speed * 0.8 && A.log.some((e) => e.type === 'bite'));
}
{
  const A = arena(K, { world: 8, x: 14 });
  A.run(0.2); A.g.hp = A.g.maxHp * 0.4; A.run(0.2);
  check(`raging, ${S.rage.call.n} GLOWA come to it`, A.w.gels.filter((g) => g.alive && g.kind === 'glowa').length === S.rage.call.n);
}
done();
