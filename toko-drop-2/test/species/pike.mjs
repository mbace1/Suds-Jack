#!/usr/bin/env node
// pike.mjs — PIKE (THE RIVER's boss, v45), in bare node: it circles, lines
// up (its lane lit), charges along the lane leaving a wake either side, and a
// charge into a wall stuns it; raging, it charges three times in a row.
import { checker, arena, common, dt } from '../lib/boss.mjs';
const K = 'pike', { check, done } = checker(K);
const { S } = common(K, 6, { check });
{
  const A = arena(K, { world: 6, x: 9 });
  let lane = null;
  A.run(6, (w, g) => { if (g.s.state === 'aim') lane = { lx: g.s.lx, lz: g.s.lz }; return g.s.state === 'charge'; });
  check('it circles, then lines up with its lane to the wall', !!lane && A.g.s.state === 'charge' && (Math.abs(Math.abs(lane.lx) - (A.w.hx - A.g.r)) < 0.01 || Math.abs(Math.abs(lane.lz) - (A.w.hz - A.g.r)) < 0.01));
  let top = 0, wake = 0;
  const n0 = A.shots();
  A.run(S.charge.time + 0.05, (w, g) => { top = Math.max(top, Math.hypot(g.x - g.px, g.z - g.pz) / dt); return g.s.state !== 'charge'; });
  wake = A.shots() - n0;
  check(`it charges fast (${top.toFixed(1)} u/s), its wake either side`, top > S.charge.speed * 0.9 && wake >= 4 && wake % 2 === 0, `${wake} wake`);
}
{
  // you with your back to a wall: the charge goes through you into it
  const A = arena(K, { world: 6, x: 0 });
  A.w.hero.x = -(A.w.hx - 2); A.g.x = A.g.px = A.w.hero.x + 9;
  A.run(16, () => A.g.s.state === 'stun');
  check('a charge into a wall stuns it, with a ring', A.g.s.state === 'stun' && A.log.some((e) => e.type === 'shake' && e.kind === K));
}
{
  const A = arena(K, { world: 6, x: 9 });
  A.run(0.2); A.g.hp = A.g.maxHp * 0.4;
  A.run(12, () => A.log.filter((e) => e.type === 'charge').length >= 3);
  const ch = A.log.filter((e) => e.type === 'charge').length;
  check(`raging, it charges ${S.rage.chain} times in a row`, ch >= S.rage.chain);
}
done();
