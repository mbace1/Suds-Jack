#!/usr/bin/env node
// skata.mjs — SKATA (THE ICE SHEET), in bare node: a puck that never stops,
// faster off every wall, lining up on you every few bounces.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=163';
import { TUNING as T } from '../../js/tuning.js?v=163';
import behaviour from '../../js/sim/species/skata.js?v=163';
let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const S = T.species.skata, dt = T.sim.dt, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
check('no Math.random, no clock', !/Math\.random|Date\.now|performance\./.test(readFileSync(new URL('../../js/sim/species/skata.js', import.meta.url), 'utf8')));
const w = createWorld({ seed: 6, mode: 'arcade' }); w.director = { step() {} }; w.hero.invinc = 1e9; w.hero.x = -5; w.hx = 9; w.hz = 6;   // a small rink, so 10 s holds several walls
const g = api.spawn(w, "skata", 5, 2, {}); g.anchored = true;
let bounces = 0;
for (let i = 0; i < 10 / dt; i++) { step(w, IDLE); bounces += w.events.filter((e) => e.type === 'skid').length; }
const sp = Math.hypot(g.s.vx, g.s.vz);
check('it bounces off the walls', bounces >= 3, `${bounces}`);
check('faster off each, to its cap', sp > S.speed * 1.15 && sp <= S.max + 1e-9, sp.toFixed(2));
check('it never stops', Math.hypot(g.x - g.px, g.z - g.pz) / dt > S.speed * 0.9);
const v0 = { ...g.s }; behaviour.onHit(w, g, { vx: 0, vz: 1 }, api);
check('a shot knocks it along the shot', g.s.vz > v0.vz);
console.log(failed ? `\n✗ skata: ${failed} failed, ${passed} passed` : `✔ skata: ${passed} checks`);
process.exit(failed ? 1 : 0);
