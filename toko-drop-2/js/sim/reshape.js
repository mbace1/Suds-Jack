// reshape.js — SURVIVAL's floor changes size as you play (owner, 2026-10-23:
// "survival should be changing level size, like Sektori game. Abstract grid
// type visuals ok for that").
//
// Sektori's way: the run starts on a small floor, and every half minute or
// so the floor lights up where it is about to change, then the new shape
// slams into place. Here the shape is the arena's rectangle: every `every`
// s the next size is picked (seeded, never the one you are on), the floor
// WARNS for `warn` s, then the walls MOVE to it over `move` s, carrying the
// hero and the bodies with them, and the bullets left outside are gone.
// Sizes are fractions of the run's own 1.x arena; past 1 the floor is
// bigger than the screen and the camera follows (as on the later worlds).
//
// The sim owns all of it — `w.hx`/`w.hz` are the walls wherever they are —
// and reports
//   reshapeWarn  { hx, hz, from: { hx, hz }, t }   the floor lights up
//   reshape      { hx, hz }                        the walls start to move
//   reshaped     { hx, hz }                        they are there
// Every number is TUNING.survival.reshape.
import { TUNING } from '../tuning.js?v=57';

const T = TUNING;

export const on = (w) => w.mode === 'survival' && T.survival.reshape.on;

// the run's 1.x arena (its screen shape's), which the sizes are fractions of
const base = (w) => T.arena[w.shape] ?? T.arena.landscape;

// the biggest the floor gets: the view builds its floor and light map this big
export function maxSize(shape) {
  const R = T.survival.reshape, A = T.arena[shape] ?? T.arena.landscape;
  let fx = R.start[0], fz = R.start[1];
  for (const [x, z] of R.sizes) { fx = Math.max(fx, x); fz = Math.max(fz, z); }
  return { hx: A.hx * fx, hz: A.hz * fz };
}

export function create(w) {
  const R = T.survival.reshape, A = base(w);
  w.hx = A.hx * R.start[0]; w.hz = A.hz * R.start[1];
  w.shapeT = { t: 0, phase: 'hold', next: R.first, at: R.sizes.findIndex(([x, z]) => x === R.start[0] && z === R.start[1]), from: null, to: null };
}

export function step(w, dt) {
  const R = T.survival.reshape, S = w.shapeT, A = base(w);
  S.t += dt;
  if (S.phase === 'hold' && S.t >= S.next) {
    // the next size: any but the one you are on
    let i;
    do { i = w.rng.int(0, R.sizes.length - 1); } while (i === S.at && R.sizes.length > 1);
    S.at = i;
    S.from = { hx: w.hx, hz: w.hz };
    S.to = { hx: A.hx * R.sizes[i][0], hz: A.hz * R.sizes[i][1] };
    S.phase = 'warn'; S.t = 0;
    w.events.push({ type: 'reshapeWarn', hx: S.to.hx, hz: S.to.hz, from: S.from, t: R.warn });
  } else if (S.phase === 'warn' && S.t >= R.warn) {
    S.phase = 'move'; S.t = 0;
    w.events.push({ type: 'reshape', hx: S.to.hx, hz: S.to.hz });
  } else if (S.phase === 'move') {
    // the walls slam in (or out): fast, then settling, and whatever stands in
    // their way is carried with them (world.js clamps to w.hx / w.hz)
    const u = Math.min(1, S.t / R.move), e = 1 - (1 - u) * (1 - u) * (1 - u);
    w.hx = S.from.hx + (S.to.hx - S.from.hx) * e;
    w.hz = S.from.hz + (S.to.hz - S.from.hz) * e;
    if (u >= 1) {
      w.hx = S.to.hx; w.hz = S.to.hz;
      S.phase = 'hold'; S.t = 0; S.next = R.every;
      w.events.push({ type: 'reshaped', hx: w.hx, hz: w.hz });
    }
  }
}
