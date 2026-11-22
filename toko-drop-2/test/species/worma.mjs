#!/usr/bin/env node
// worma.mjs — WORMA, the sewer's pipe-worm, in bare node: under the floor
// nothing reaches it and it reaches nothing; it comes up near you, spits two
// fans, and goes back down.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=160';
import { TUNING as T } from '../../js/tuning.js?v=160';
import behaviour from '../../js/sim/species/worma.js?v=160';
import { schedule } from '../../js/sim/director/arcade.js?v=160';
import { makeRng } from '../../js/sim/rng.js?v=160';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`); };
const S = T.species.worma;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const run = (w, until, max = 1200) => { for (let i = 0; i < max; i++) { step(w, IDLE); if (until()) return i; } return -1; };

{
  check('a blob with no 1.x row: hp 3, its own clock for shots, FIXED', S.family === 'blob' && S.hp === 3 && S.fireInterval === null && S.role === 'FIXED');
  const src = readFileSync(new URL('../../js/sim/species/worma.js', import.meta.url), 'utf8');
  check('no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
}
{
  const w = createWorld({ seed: 6, mode: 'arcade' });
  w.director = { step() {} }; w.hero.invinc = 1e9;
  const g = api.spawn(w, 'worma', 12, 4, {});
  step(w, IDLE);
  check('it starts under the floor', g.s.state === 'under' && g.s.up === 0);
  check('under, a bullet passes over it', !behaviour.hitTest(w, g, g.x, g.z, 0.2));
  w.hero.x = g.x; w.hero.z = g.z;
  check('under, it cannot touch you', !behaviour.touches(w, g));
  check('under, the crowd does not shove it', g.anchored === true);
  w.hero.x = 0; w.hero.z = 0;
  run(w, () => g.s.state === 'rise');
  const d = Math.hypot(g.x, g.z);
  check(`it comes up near you (${S.surface[0]}-${S.surface[1]} u)`, d > S.surface[0] - 1 && d < S.surface[1] + 1, d.toFixed(2));
  run(w, () => g.tell > 0.9 || g.s.state !== 'rise');
  check('the floor bulges and glows before it comes up (the tell)', g.tell > 0.5);
  const b0 = w.bullets.length;
  run(w, () => g.s.state === 'up');
  run(w, () => g.s.state !== 'up');
  check(`it spits ${S.fans.length} fans of ${S.fanCount}`, w.bullets.length - b0 === S.fans.length * S.fanCount, `${w.bullets.length - b0}`);
  run(w, () => g.s.state === 'under');
  check('then it goes back down', g.s.state === 'under' && g.s.up === 0);
}
{
  const w = createWorld({ seed: 6, mode: 'arcade' });
  w.director = { step() {} }; w.hero.invinc = 1e9;
  const g = api.spawn(w, 'worma', 5, 0, {});
  run(w, () => g.s.state === 'up' && g.s.up > 0.9);
  check('up, a bullet hits it', behaviour.hitTest(w, g, g.x, g.z, 0.2));
  w.hero.x = g.x + 0.4; w.hero.z = g.z;
  check('up, touching it hurts', behaviour.touches(w, g));
}
{
  const kinds = (world) => { const r = makeRng(9), out = []; for (let wave = 11; wave < 40; wave++) for (const e of schedule(wave, r, 9, world).list) out.push(e.kind); return out; };
  check('world 1 and the driveway never draw WORMA', !kinds(1).includes('worma') && !kinds(2).includes('worma'));
  check('the sewer does', kinds(3).filter((k) => k === 'worma').length >= 8);
}

console.log(failed ? `\n✗ worma: ${failed} failed, ${passed} passed` : `✔ worma: ${passed} checks`);
process.exit(failed ? 1 : 0);
