#!/usr/bin/env node
// steama.mjs — STEAMA (THE BOILER ROOM), in bare node: it swells, then vents
// a scalding cloud and a ring.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=156';
import { TUNING as T } from '../../js/tuning.js?v=156';
let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const S = T.species.steama, dt = T.sim.dt, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
check('no Math.random, no clock', !/Math\.random|Date\.now|performance\./.test(readFileSync(new URL('../../js/sim/species/steama.js', import.meta.url), 'utf8')));
const w = createWorld({ seed: 4, mode: 'arcade' }); w.director = { step() {} }; w.hero.invinc = 1e9;
const g = api.spawn(w, 'steama', 8, 0, {});
let told = 0, vent = null, b0 = 0;
for (let i = 0; i < (S.every[1] + S.tell + 0.3) / dt && !vent; i++) { b0 = w.bullets.length; step(w, IDLE); told = Math.max(told, g.tell); vent = w.events.find((e) => e.type === 'vent'); }
check('it swells before it vents (the tell)', told > 0.8);
check('it vents a cloud that hurts to stand in', !!vent && w.hazards.some((z) => Math.abs(z.r - S.cloud.r) < 1e-6), JSON.stringify(vent));
check(`and a ring of ${S.ring}`, w.bullets.filter((b) => b.src === 'steama').length === S.ring);
console.log(failed ? `\n✗ steama: ${failed} failed, ${passed} passed` : `✔ steama: ${passed} checks`);
process.exit(failed ? 1 : 0);
