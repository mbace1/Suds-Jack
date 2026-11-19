#!/usr/bin/env node
// salma.mjs — SALMA (THE RIVER), in bare node: it darts and glides, turns
// toward you between darts, and noses against a current.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=156';
import { TUNING as T } from '../../js/tuning.js?v=156';
let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const S = T.species.salma, dt = T.sim.dt, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
check('no Math.random, no clock', !/Math\.random|Date\.now|performance\./.test(readFileSync(new URL('../../js/sim/species/salma.js', import.meta.url), 'utf8')));
const w = createWorld({ seed: 6, mode: 'arcade' }); w.director = { step() {} }; w.hero.invinc = 1e9;
const g = api.spawn(w, 'salma', 12, 6, {});
let top = 0, low = Infinity, darts = 0, prev = g.s.phase, d0 = Math.hypot(g.x, g.z);
for (let i = 0; i < 6 / dt; i++) { step(w, IDLE); const v = Math.hypot(g.x - g.px, g.z - g.pz) / dt; top = Math.max(top, v); if (i > 60) low = Math.min(low, v); if (g.s.phase === 'dart' && prev !== 'dart') darts++; prev = g.s.phase; }
check('it darts fast and glides nearly still', top > S.dart.speed * 0.9 && low < 1.5, `${top.toFixed(1)} / ${low.toFixed(2)}`);
check('it darts again and again', darts >= 4, `${darts}`);
check('it works its way toward you', Math.hypot(g.x, g.z) < d0, `${d0.toFixed(1)} → ${Math.hypot(g.x, g.z).toFixed(1)}`);
check('it stays on the floor', Math.abs(g.x) <= w.hx && Math.abs(g.z) <= w.hz);
console.log(failed ? `\n✗ salma: ${failed} failed, ${passed} passed` : `✔ salma: ${passed} checks`);
process.exit(failed ? 1 : 0);
