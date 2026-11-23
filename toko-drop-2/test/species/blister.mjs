#!/usr/bin/env node
// blister.mjs — BLISTER (THE CISTERN's boss, v45), in bare node: its bubble
// takes your shots and pops on the last; only then can the gel be hurt, and
// only until the bubble grows back. Its blown bubbles burst into rings.
import { checker, arena, common } from '../lib/boss.mjs';
import BEH from '../../js/sim/species/blister.js?v=163';
const K = 'blister', { check, done } = checker(K);
const { S } = common(K, 4, { check });
{
  const A = arena(K, { world: 4, x: 9 });
  A.run(0.1);
  const b = { vx: -1, vz: 0, x: A.g.x, z: A.g.z };
  const res = []; for (let i = 0; i < S.shell; i++) res.push(BEH.onHit(A.w, A.g, b, A.api));
  check(`the bubble takes ${S.shell} shots and pops on the last`, res.every((r) => r === 'block') && A.g.s.shell === 0 && A.log.length === 0 && A.w.events.some((e) => e.type === 'bubble' && e.popped));
  check('…then the gel takes them', BEH.onHit(A.w, A.g, b, A.api) === undefined);
  A.run(S.bare + 0.2);
  check(`after ${S.bare} s bare the bubble is whole again`, A.g.s.shell === S.shell && A.log.some((e) => e.type === 'bubble' && e.whole));
}
{
  const A = arena(K, { world: 4, x: 9 });
  let big = 0;
  A.run(6, (w) => { big = Math.max(big, w.bullets.filter((b) => b.src === K && b.r === S.blow.radius).length); return A.log.some((e) => e.type === 'bubble' && e.small); });
  const burst = A.log.find((e) => e.type === 'bubble' && e.small);
  A.run(0.05);
  const ring = A.w.bullets.filter((b) => b.src === K && b.r !== S.blow.radius && Math.hypot(b.x - burst.x, b.z - burst.z) < 1).length;
  check(`it blows ${S.blow.count} big slow bubbles, and each bursts into a ring`, big === S.blow.count && !!burst && ring >= S.blow.burst.count, `${big} big, ${ring} in the ring`);
}
done();
