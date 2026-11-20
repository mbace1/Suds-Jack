#!/usr/bin/env node
// mirra.mjs — MIRRA (THE CORE), in bare node: it goes to your mirror point
// and fires volleys at you across the floor.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=158';
import { TUNING as T } from '../../js/tuning.js?v=158';
let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const S = T.species.mirra, dt = T.sim.dt;
check('no Math.random, no clock', !/Math\.random|Date\.now|performance\./.test(readFileSync(new URL('../../js/sim/species/mirra.js', import.meta.url), 'utf8')));
const w = createWorld({ seed: 6, mode: 'arcade' }); w.director = { step() {} }; w.hero.invinc = 1e9;
const g = api.spawn(w, 'mirra', 0, -8, {}); g.anchored = true;
w.hero.x = 6; w.hero.z = 4;
for (let i = 0; i < 3 / dt; i++) step(w, { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false });
const want = { point: [-6, -4], x: [-6, 4], z: [6, -4] }[g.s.axis];
check(`it stands at your mirror point (${g.s.axis})`, Math.hypot(g.x - want[0], g.z - want[1]) < 0.5, `${g.x.toFixed(2)},${g.z.toFixed(2)} vs ${want}`);
check(`it fires volleys of ${S.volley}`, w.bullets.filter((b) => b.src === 'mirra').length >= S.volley);
console.log(failed ? `\n✗ mirra: ${failed} failed, ${passed} passed` : `✔ mirra: ${passed} checks`);
process.exit(failed ? 1 : 0);
