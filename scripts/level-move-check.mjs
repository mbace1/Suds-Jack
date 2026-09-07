#!/usr/bin/env node
// level-move-check.mjs — P3's gate (LEVEL_EDITOR_DESIGN.md §7): a level whose
// region MOVES is provably always non-empty and always has somewhere to
// stand, checked across its whole duration.
//
// Why a gate and not a look: a moving intersection can close to nothing for a
// second in the middle of a level, and a player standing there would be
// squeezed out of the world with no way to read why. That is not something a
// screenshot at t=0 can catch, and it is not something the author can see in
// the editor without scrubbing every frame. So it is arithmetic, over every
// step of the clock, before the level ever runs.
//
// Owner's rules, both settled 2026-09-04/05 and both assumed here:
//   · a body left outside is PUSHED along the gradient (arena.clamp), so the
//     region never has to be empty for the game to survive — but a region
//     that IS empty has nowhere to push TO, which is what this refuses;
//   · the shape contains EVERYTHING, player and swarm alike, so an authored
//     spawn must be inside the region at the moment it arrives, not merely
//     inside the bounding box.
//
// Bare node, no browser, no GPU:  node scripts/level-move-check.mjs

import { readFileSync, readdirSync } from 'node:fs';
import * as L from '../toko-drop/js/level.js';
import { Arena } from '../toko-drop/js/arena.js';

const PLAYER_R = 0.5;      // js/player.js RADIUS
const STEP     = 0.1;      // the authoring grid: nothing can hide between two of these
const GRID     = 0.5;      // world units between standing-spot samples

let checks = 0, fails = 0;
const ok = (name, cond) => { checks++; if (!cond) { fails++; console.error(`✘ ${name}`); } };

// Every point on a coarse grid that can hold a body of radius r, at this t.
function standingSpots(arena, r) {
  const out = [];
  for (let x = -arena.halfX; x <= arena.halfX; x += GRID) {
    for (let z = -arena.halfZ; z <= arena.halfZ; z += GRID) {
      if (arena.contains(x, z, r)) out.push([x, z]);
    }
  }
  return out;
}

const dir = new URL('../toko-drop/levels/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();

let moving = 0;
for (const f of files) {
  const json = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  const shapes = (json.arena && json.arena.shapes) || [];
  if (!shapes.some(s => s.move)) continue;          // static levels are level-check.mjs's job
  moving++;
  const tag = `levels/${f}`;
  // Validity is level-check.mjs's job and it covers every file including this
  // one; duplicating it here would mean a second copy of its source-parsed
  // context to drift. This gate asks only what MOVING adds.
  const level = json;
  const arena = new Arena(L.arenaShape(level));

  // The room must NOT breathe: HALF_X/HALF_Z drive the floor geometry and the
  // camera fit, so a bounding box that changed with t would rebuild both every
  // frame. arena.js keeps the SWEPT box for exactly this.
  arena.update(0);
  const box0 = [arena.halfX, arena.halfZ];
  let boxStable = true;
  for (let t = 0; t <= level.duration; t += STEP) {
    arena.update(t);
    if (arena.halfX !== box0[0] || arena.halfZ !== box0[1]) boxStable = false;
  }
  ok(`${tag}: the bounding box is the same at every t (${box0[0].toFixed(2)} x ${box0[1].toFixed(2)})`, boxStable);

  // The region, at every authored step of the clock.
  let emptyAt = null, unstandableAt = null, worst = Infinity, worstT = 0;
  for (let t = 0; t <= level.duration + STEP; t += STEP) {
    arena.update(t);
    const spots = standingSpots(arena, PLAYER_R);
    if (spots.length === 0) {
      if (arena.contains(0, 0, 0)) { if (unstandableAt === null) unstandableAt = t; }
      else if (emptyAt === null) emptyAt = t;
    }
    if (spots.length < worst) { worst = spots.length; worstT = t; }
  }
  ok(`${tag}: the region is never empty`, emptyAt === null);
  ok(`${tag}: there is always somewhere to stand (fewest ${worst} spots, at t=${worstT.toFixed(1)}s)`, unstandableAt === null && worst > 0);
  // Somewhere to stand is not enough if it is a pinprick: a player being
  // pushed needs room to be pushed INTO.
  ok(`${tag}: and it is never a pinprick (>= 8 spots)`, worst >= 8);

  // Determinism: the same t gives the same region, always. A mover that read
  // a clock would pass every check above and desynchronise the two builds.
  arena.update(7.3);
  const a = arena.sdf(1, 1);
  arena.update(21.7);
  arena.update(7.3);
  ok(`${tag}: the region is a pure function of t`, arena.sdf(1, 1) === a);

  // The owner's rule that the shape contains EVERYTHING: a body must be inside
  // the region when it arrives, not merely inside the box.
  let badSpawn = null;
  for (const s of level.spawns) {
    arena.update(s.t);
    if (!arena.contains(s.px, s.pz, 0)) { badSpawn = s; break; }
  }
  ok(`${tag}: every spawn is inside the region at the second it arrives`,
     badSpawn === null || (console.error(`    ${badSpawn.type || badSpawn.id} at t=${badSpawn.t} (${badSpawn.px}, ${badSpawn.pz})`), false));
}

ok('at least one moving level exists to check', moving > 0);
console.log(`${checks - fails}/${checks} moving-region checks passed (${moving} level${moving === 1 ? '' : 's'})`);
if (fails) { console.error(`✘ ${fails} FAILED`); process.exit(1); }
console.log('✔ every moving region stays non-empty, standable and deterministic for its whole duration');
