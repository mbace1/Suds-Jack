// worlds.js — the run goes somewhere (owner, 2026-10-23: "after we beat the
// first boss in arcade and hardcade, the grid should turn into a drain hole
// like vortex and suck the character down. Only to end up in a concrete
// looking floor ... This same will happen after the boss in world 2, except
// it's a drainage hole that appears, and then a new world is revealed").
//
// The sim owns where the run is and when it moves: `w.world` (1, 2, 3), the
// arena that goes with it, and the transition between two of them, step by
// step and from nothing random, so a seed still replays exactly. The view
// owns how it looks (the swirl, the drain, the fall, the floors) and reads
// it all from here: `w.trans` while one runs, the hero's `sink` (0 → 1 down
// the hole) and `fall` (1 → 0 dropping into the next world), and the events
//
//   worldOut   the floor starts to swallow: { kind: 'vortex' | 'drain', x, z }
//   worldIn    the next world is there, the droplet high above it: { world, hx, hz, x, z }
//   worldLand  the droplet lands; the floor shows itself from where it hit
//
// While a transition runs the run is held: no director, no bodies, no gun;
// the hero is the transition's and cannot be hurt. Every number is
// TUNING.worlds.
import { TUNING } from '../tuning.js?v=29';
import * as rules from './rules.js?v=29';

const T = TUNING, WD = T.worlds;

// the worlds are ARCADE's and HARDCADE's
export const on = (w) => WD.modes.includes(w.mode);
export const last = () => WD.list.length;

// world n's arena for the run's screen shape: 1.x's for world 1, the world's
// own after it, with the shape's tilt
export function arenaFor(n, shape = 'landscape') {
  const base = T.arena[shape] ?? T.arena.landscape, own = WD.list[n - 1]?.arena?.[shape];
  return own ? { ...base, ...own } : base;
}

// the share of a world's bodies that arrive heavy
export const heavyShare = (w) => (on(w) ? WD.list[w.world - 1]?.heavy ?? 0 : 0);

// A world ends with its boss wave
export const endsWorld = (w, wave) => on(w) && w.world < last() && wave === w.world * T.waves.rhythm.bossEvery;
// and the last world's boss wave ends the run, won
export const endsRun = (w, wave) => on(w) && w.world === last() && wave === w.world * T.waves.rhythm.bossEvery;

// The frame spawns are placed in: world 1's arena, around the hero, kept
// inside the floor. In world 1 that is the arena itself; on a bigger floor
// the bodies still come in around you as they did there, not 40 m away
// where the camera cannot see them.
export function spawnFrame(w) {
  const A = T.arena[w.shape] ?? T.arena.landscape;
  if (A.hx >= w.hx && A.hz >= w.hz) return { cx: 0, cz: 0, hx: w.hx, hz: w.hz };
  const ex = Math.max(0, w.hx - A.hx), ez = Math.max(0, w.hz - A.hz), h = w.hero;
  return { cx: Math.max(-ex, Math.min(ex, h.x)), cz: Math.max(-ez, Math.min(ez, h.z)), hx: Math.min(A.hx, w.hx), hz: Math.min(A.hz, w.hz) };
}

// The boss is dead and its wave is clear: the floor opens. World 1's grid
// becomes a vortex at its centre; a later world opens a drain where the
// boss went down (kept inside the curb).
export function begin(w) {
  const P = WD.trans, h = w.hero, kind = w.world === 1 ? 'vortex' : 'drain';
  const at = kind === 'vortex' || !w.lastBoss ? { x: 0, z: 0 }
    : { x: Math.max(-w.hx + P.drainInset, Math.min(w.hx - P.drainInset, w.lastBoss.x)), z: Math.max(-w.hz + P.drainInset, Math.min(w.hz - P.drainInset, w.lastBoss.z)) };
  const r0 = Math.hypot(h.x - at.x, h.z - at.z), a0 = Math.atan2(h.z - at.z, h.x - at.x);
  w.trans = { kind, t: 0, from: w.world, to: w.world + 1, x: at.x, z: at.z, r0, a0, swapped: false, landed: false };
  // what is still in the air or on the floor goes with the world: the
  // bullets, the lobs and their hazards, the pickups
  for (const b of w.bullets) b.dead = true;
  w.lobs.length = 0; w.hazards.length = 0;
  if (w.pk) { w.pk.items.length = 0; w.pk.gates.length = 0; w.pk.convoy = null; w.pk.bounty = { arm: false, id: null, t: 0 }; }
  h.dash = 0; h.burst.length = 0;
  w.events.push({ type: 'worldOut', kind, world: w.world, x: at.x, z: at.z });
}

const easeIn = (u) => u * u * u;

// one step of a running transition
export function step(w, dt) {
  const tr = w.trans, P = WD.trans, h = w.hero;
  tr.t += dt;
  h.invinc = Math.max(h.invinc, P.grace);
  if (!tr.swapped) {
    // pulled round and in: the radius closes and the turn winds up together,
    // slow at first, then all at once, as water goes down a plughole
    const u = Math.min(1, tr.t / P.pull), e = easeIn(u);
    const r = tr.r0 * (1 - e), a = tr.a0 + P.spin * 2 * Math.PI * e;
    h.x = tr.x + Math.cos(a) * r; h.z = tr.z + Math.sin(a) * r;
    h.sink = Math.max(0, Math.min(1, (tr.t - P.pull) / P.sink));
    if (tr.t >= P.pull + P.sink + P.dark) swap(w);
    return;
  }
  const t2 = tr.t - tr.swapAt;
  h.fall = Math.max(0, 1 - t2 / P.fall);
  if (!tr.landed && t2 >= P.fall) {
    tr.landed = true; h.fall = 0;
    h.sqV += T.hero.sq.hit;          // it lands with a splat (the squash the view draws)
    w.events.push({ type: 'worldLand', world: w.world, x: h.x, z: h.z });
  }
  if (tr.landed && t2 >= P.fall + P.settle) {
    w.trans = null;
    w.events.push({ type: 'worldGo', world: w.world });
    w.director.onWorld?.(w);
  }
}

// the next world: its arena, and the droplet over its middle, about to drop
function swap(w) {
  const tr = w.trans, h = w.hero;
  w.world = tr.to;
  const A = arenaFor(w.world, w.shape);
  w.hx = A.hx; w.hz = A.hz;
  rules.create(w);   // the new world's rule, from its first step
  h.x = h.px = 0; h.z = h.pz = 0; h.sink = 0; h.fall = 1;
  h.velX = h.velZ = 0; h.sVelX = h.sVelZ = 0; h.sSeen = false;
  tr.swapped = true; tr.swapAt = tr.t;
  w.events.push({ type: 'worldIn', world: w.world, hx: w.hx, hz: w.hz, x: 0, z: 0 });
}
