#!/usr/bin/env node
// bubbla.mjs — BUBBLA (THE CISTERN), in bare node: its bubble takes the
// shots and pops on the last; only then is the gel hurt; it bolts, and mends.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=159';
import { TUNING as T } from '../../js/tuning.js?v=159';
import behaviour from '../../js/sim/species/bubbla.js?v=159';
let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const S = T.species.bubbla, dt = T.sim.dt, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const src = readFileSync(new URL('../../js/sim/species/bubbla.js', import.meta.url), 'utf8');
check('no Math.random, no clock', !/Math\.random|Date\.now|performance\./.test(src));
const w = createWorld({ seed: 2, mode: 'arcade' }); w.director = { step() {} }; w.hero.invinc = 1e9;
const g = api.spawn(w, 'bubbla', 8, 0, {}); step(w, IDLE);
const shot = () => ({ vx: -1, vz: 0, x: g.x, z: g.z });
for (let i = 0; i < S.shell - 1; i++) check(`hit ${i + 1}: the bubble blocks it`, behaviour.onHit(w, g, shot(), api) === 'block');
check('the bubble is thin but not gone', g.s.shell === 1);
check('the last hit pops it, still blocked', behaviour.onHit(w, g, shot(), api) === 'block' && g.s.shell === 0 && g.s.bolt > 0);
check('popped, the next shot hurts the gel', behaviour.onHit(w, g, shot(), api) === undefined);
const d0 = Math.hypot(g.x - w.hero.x, g.z - w.hero.z);
for (let i = 0; i < 0.6 / dt; i++) step(w, IDLE);
check('popped, it bolts away from you', Math.hypot(g.x - w.hero.x, g.z - w.hero.z) > d0 + 1.5);
for (let i = 0; i < (S.regrow + 0.2) / dt; i++) step(w, IDLE);
check('left alone, the bubble grows back whole', g.s.shell === S.shell);
console.log(failed ? `\n✗ bubbla: ${failed} failed, ${passed} passed` : `✔ bubbla: ${passed} checks`);
process.exit(failed ? 1 : 0);
