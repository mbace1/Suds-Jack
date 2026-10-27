// reddmini.js — REDD MINI, what a REDD CUBE breaks into: a small red rounded
// cube (r 0.32, 1 hp) that tumbles straight at you on 1.x's v84 edge-pivot
// flop, quick and short — a face of 0.576 u every 0.18 s at 3.2 u/s — and in
// a SCHOOL: the brood flocks, dodges hard and rides the wave's current
// between flops. Melee only.
//
// 1.x js/enemy.js at v268: the cube state 1209-1214, `_flopMove` 1486-1566
// (exact = false), the heading 2297-2303 and 2331 ("default: direct (YELA,
// minis)"); the crowd's tumble nudge crowd.js:107-116. Every number is
// tuning/species/reddmini.js.
//
// Per step, from where the swarm forces left it: the unit bearing to you is
// the heading it wants, and the flop (sim/species/redd.js `cubeFlop`, REDD's
// own) takes it on the cardinal path — a rest counts down (the forces stick),
// then the cardinal of its larger axis 70%, the last one 20%, any 10%; a
// rigid tip from the flop's origin, the crowd's nudge and a PUSH dash's knock
// carried into it; a −0.32 squash on landing. In arcade it is born as a child
// (1.x spawns it from a REDD's corpse, main.js:10586-10620) and waits out its
// parent's 0.28 s death pop in the core's wait (state 'appear', t < 0); out,
// it is live at once, as 1.x's was. Spawned outright (1.x's GAUNDROP,
// KAIKKI IRTI and TOKOTRON did, main.js:3558, 7903, 7950-7953) it is live
// from its first step, like every body (1.x had no appear, enemy.js:659-660).
// It is not otherwise special: no gun, no special hits, no brood, the core's
// contact (r + 0.5) and death (angular chunks, a puddle); not a biter.
// One thing the contract cannot say: 1.x's mini throws 2–3 chunks of 0.12
// when it dies, not every cube's 5–6 of 0.18 (enemy.js:3035-3037); the
// number is in its tuning (deathChunks) for the core to read.
import { cubeInit, cubeCarry, cubeFlop } from './redd.js?v=55';

export default {
  init(w, g, api) { cubeInit(w, g, api); },

  step(w, g, dt, api) {
    const S = api.S(g), h = w.hero;
    cubeCarry(g);
    // straight at you (1.x enemy.js:2302-2303), from where the forces left it
    const ddx = h.x - g.x, ddz = h.z - g.z, dist = Math.hypot(ddx, ddz) || S.distFloor;
    cubeFlop(w, g, dt, api, ddx / dist, ddz / dist);
  },
};
