#!/usr/bin/env node
// glowa.mjs — GLOWA (THE DEEP), in bare node: it holds its lure out in front,
// and lunges when you come close to the light.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=160';
import { TUNING as T } from '../../js/tuning.js?v=160';
let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const S = T.species.glowa, dt = T.sim.dt, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
check('no Math.random, no clock', !/Math\.random|Date\.now|performance\./.test(readFileSync(new URL('../../js/sim/species/glowa.js', import.meta.url), 'utf8')));
const w = createWorld({ seed: 6, mode: 'arcade' }); w.director = { step() {} }; w.hero.invinc = 1e9;
const g = api.spawn(w, 'glowa', 14, 0, {}); g.anchored = true;
step(w, IDLE);
// the lure is placed before the body takes its step, so it leads by its reach give or take one step
const lead = Math.hypot(g.s.lx - g.x, g.s.lz - g.z);
check('its lure is held out in front, toward you', Math.abs(lead - g.r * S.lure.reach) < 0.2 && g.s.lx < g.x);
let bite = null, told = 0;
for (let i = 0; i < 12 / dt && !bite; i++) { step(w, IDLE); told = Math.max(told, g.tell); bite = w.events.find((e) => e.type === 'bite'); }
check('near the light it tells, then lunges', told > 0.8 && !!bite);
let top = 0; for (let i = 0; i < 0.3 / dt; i++) { step(w, IDLE); top = Math.max(top, Math.hypot(g.x - g.px, g.z - g.pz) / dt); }
check('the lunge is fast', top > S.bite.speed * 0.8, top.toFixed(1));
console.log(failed ? `\n✗ glowa: ${failed} failed, ${passed} passed` : `✔ glowa: ${passed} checks`);
process.exit(failed ? 1 : 0);
