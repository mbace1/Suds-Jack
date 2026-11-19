#!/usr/bin/env node
// berg.mjs — BERG (THE ICE SHEET's boss, v45), in bare node: it slides and
// glances off the walls with a fan of shards, stops dead and frosts over,
// then fires walls of icicles; raging, it calves two SKATA.
import { checker, arena, common } from '../lib/boss.mjs';
const K = 'berg', { check, done } = checker(K);
const { S } = common(K, 7, { check });
{
  // near a wall, sliding off from it toward you and back (THE ICE SHEET is 56 wide)
  const A = arena(K, { world: 7, x: 9, hero: [20, 0] });
  let n = 0;
  A.run(8, () => { const s = A.log.filter((e) => e.type === 'skid').length; if (s && !n) n = A.shots(); return s > 0; });
  check(`off a wall it fires a fan of ${S.bounce.count} shards`, n === S.bounce.count, `${n}`);
  const n0 = A.shots();
  let told = 0;
  A.run(8, (w, g) => { told = Math.max(told, g.tell); return g.s.state === 'hold'; });
  const walls = A.shots() - n0;
  check(`it stops and frosts over, then fires ${S.freeze.lines} walls of ${S.freeze.n}`, told > 0.9 && walls >= S.freeze.lines * S.freeze.n, `${walls}`);
}
{
  const A = arena(K, { world: 7, x: 9 });
  A.run(0.2); A.g.hp = A.g.maxHp * 0.4; A.run(0.2);
  const kids = A.w.gels.filter((g) => g.alive && g.kind === 'skata' && g.child).length;
  A.run(2);
  check(`raging, it calves ${S.rage.calf.n} SKATA, once`, kids === S.rage.calf.n && A.w.gels.filter((g) => g.kind === 'skata').length === S.rage.calf.n);
}
// v136: HARDCADE's BERG lunges — at you, at its surge, with no tell — and lunges again a beat later; ARCADE's never does
{
  const watch = (mode) => {
    const A = arena(K, { world: 7, x: 9, hero: [-14, 6], mode });
    let top = 0, told = 0, starts = [];
    A.run(12, (w, g) => {
      const v = Math.hypot(g.vx, g.vz);
      for (const e of w.events) if (e.type === 'skid' && e.lunge) starts.push(w.time);
      if (g.s.snapping > 0) told = Math.max(told, g.tell);
      if (g.s.state === 'slide') top = Math.max(top, v);
      return false;
    });
    return { top, told, starts };
  };
  const hard = watch('hardcade'), soft = watch('arcade'), slide = S.speed, P = S.snap;
  const gaps = hard.starts.slice(1).map((t, i) => t - hard.starts[i]), beat = P.time + P.again;
  check(`in HARDCADE it lunges at you, near ${P.speed}× its slide, with no tell`, hard.starts.length >= 2 && hard.top > slide * P.speed * 0.85 && hard.told === 0, JSON.stringify({ ...hard, starts: hard.starts.length }));
  check(`…and every lunge has a second ${P.again} s after it ends`, gaps.some((d) => Math.abs(d - beat) < 0.05) && gaps.every((d) => d > beat - 0.05), gaps.map((d) => d.toFixed(2)).join(' '));
  check('in ARCADE it never lunges', soft.starts.length === 0 && soft.top < slide * 1.6, JSON.stringify({ ...soft, starts: soft.starts.length }));
}
done();
