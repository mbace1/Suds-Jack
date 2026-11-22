#!/usr/bin/env node
// hoppa.mjs — HOPPA, the driveway's curb-hopper, in bare node: it squats,
// marks where it will land, hops there out of reach, and lands with a ring.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=160';
import { TUNING as T } from '../../js/tuning.js?v=160';
import behaviour from '../../js/sim/species/hoppa.js?v=160';
import { schedule } from '../../js/sim/director/arcade.js?v=160';
import { makeRng } from '../../js/sim/rng.js?v=160';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`); };
const S = T.species.hoppa, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

function world(x = 8, z = 0) {
  const w = createWorld({ seed: 4, mode: 'arcade' });
  w.director = { step() {} };
  w.hero.invinc = 1e9;
  const g = api.spawn(w, 'hoppa', x, z, {});
  return { w, g };
}
const run = (w, g, until, max = 1200) => { for (let i = 0; i < max; i++) { step(w, IDLE); if (until(w, g)) return i; } return -1; };

{
  check('a plain blob with no 1.x row: hp 4, contact, no gun', S.family === 'blob' && S.hp === 4 && S.contact && S.fireInterval === null);
  const src = readFileSync(new URL('../../js/sim/species/hoppa.js', import.meta.url), 'utf8');
  check('no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
}
{
  const { w, g } = world();
  check('it starts on the ground, resting', g.s.state === 'rest' && g.s.y === 0);
  check('it squats', run(w, g, () => g.s.state === 'crouch') >= 0);
  const d = Math.hypot(g.s.tx - g.x, g.s.tz - g.z);
  check('and marks a spot within its reach, toward you', d <= S.reach[1] + 1e-6 && g.s.tx < g.x, `${d.toFixed(2)} u, to x ${g.s.tx.toFixed(2)}`);
  run(w, g, () => g.tell > 0.9 || g.s.state !== 'crouch');
  check('the squat glows (the tell)', g.tell > 0.5);
  const spot = [g.s.tx, g.s.tz];
  run(w, g, () => g.s.state === 'hop');
  let topY = 0, shotDuring = 0;
  const b0 = w.bullets.length;
  run(w, g, () => { topY = Math.max(topY, g.s.y); return g.s.state !== 'hop'; });
  check(`it hops ${S.height} u high`, Math.abs(topY - S.height) < 0.1, topY.toFixed(2));
  check('and lands on the spot it marked', Math.hypot(g.x - spot[0], g.z - spot[1]) < 0.4, `${g.x.toFixed(2)},${g.z.toFixed(2)} vs ${spot}`);
  const ring = w.bullets.length - b0 - shotDuring;
  check(`it lands with a ring of ${S.ringCount}`, ring === S.ringCount, `${ring}`);
}
{
  // in the air nothing reaches it, on the ground it is a plain circle
  const { w, g } = world();
  run(w, g, () => g.s.state === 'hop' && g.s.y > 1.5);
  check('in the air a bullet passes under it', !behaviour.hitTest(w, g, g.x, g.z, 0.2));
  w.hero.x = g.x; w.hero.z = g.z;
  check('in the air it cannot touch you', !behaviour.touches(w, g));
  check('in the air the crowd does not shove it', g.anchored === true);
  run(w, g, () => g.s.state === 'rest'); step(w, IDLE);
  check('on the ground a bullet hits it', behaviour.hitTest(w, g, g.x, g.z, 0.2));
  w.hero.x = g.x + 0.5; w.hero.z = g.z;
  check('and touching it hurts', behaviour.touches(w, g) && g.anchored === false);
}
{
  // the driveway draws it; the grid never does
  const kinds = (world) => { const r = makeRng(9), out = []; for (let wave = 6; wave < 40; wave++) for (const e of schedule(wave, r, 9, world).list) out.push(e.kind); return out; };
  check('world 1 never draws HOPPA', !kinds(1).includes('hoppa'));
  check('the driveway does', kinds(2).filter((k) => k === 'hoppa').length >= 10);
}

console.log(failed ? `\n✗ hoppa: ${failed} failed, ${passed} passed` : `✔ hoppa: ${passed} checks`);
process.exit(failed ? 1 : 0);
