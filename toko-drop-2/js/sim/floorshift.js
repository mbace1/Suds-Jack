// floorshift.js — a world's floor that moves for a wave (v44, CAMPAIGN_PLAN.md
// step 5: the campaign's moving rooms — breath, orbit, pulse — as arcade
// world events). A world with a `shift` (TUNING.worlds.list) has one wave in
// it whose floor is a shape on a clock: the river's banks breathe in and out,
// the ice is a round floe drifting on an orbit, the core is two discs going
// round each other. It is warned (the banner, `shiftWarn`), then the shape
// is the floor — every wall clamps to it (w.region, as a campaign room's) —
// and at the next wave it is gone and the floor is whole again.
//
// Sizes in a shift are FRACTIONS of the world's own floor (r of its shorter
// half side, hx/hz of its half sides), so one spec fits the floor in either
// orientation. Pure: no clock but the run's, no Math.random.
//
//   w.shift  { spec, t, phase: 'warn' | 'on', box: the floor it is sized off }
//   events   shiftWarn { kind } · shift { kind } · shiftEnd { kind }
import { TUNING } from '../tuning.js?v=46';
import { Arena, rectShape, circleShape, unionShape, intersectShape, partAt } from './shape.js?v=46';

const T = TUNING;

// the shift for this wave of this run, if it has one: the `at`-th wave of a world that has one
export function shiftFor(w, wave) {
  if (!T.worlds.modes.includes(w.mode)) return null;
  const k = w.world || 1, S = T.worlds.list[k - 1]?.shift, E = T.waves.rhythm.bossEvery;
  return S && wave === (k - 1) * E + S.at ? S : null;
}

// the shape at `t` seconds into the shift, in the run's units, sized off `box`:
// the world's own floor, not its walls (a challenge that closed them in can
// still be running when the shift begins)
export function shapeAt(box, spec, t) {
  const w = box, m = Math.min(w.hx, w.hz);
  const parts = spec.parts.map((p0) => {
    const p = p0.kind === 'rect'
      ? { ...p0, hx: p0.hx * w.hx, hz: p0.hz * w.hz }
      : { ...p0, c: [(p0.c?.[0] ?? 0) * w.hx, (p0.c?.[1] ?? 0) * w.hz], r: p0.r * m, orbit: p0.orbit && { ...p0.orbit, r: p0.orbit.r * m } };
    const s = partAt(p, t);
    return s.kind === 'rect' ? rectShape(s.hx, s.hz) : circleShape(s.c[0], s.c[1], s.r);
  });
  if (parts.length === 1) return parts[0];
  return spec.combine === 'intersect' ? intersectShape(...parts) : unionShape(...parts);
}

export function start(w, spec) {
  end(w);
  w.shift = { spec, t: 0, phase: 'warn', box: { hx: w.squeeze?.home.hx ?? w.hx, hz: w.squeeze?.home.hz ?? w.hz } };
  w.events.push({ type: 'shiftWarn', kind: spec.kind, t: T.worlds.shift.warn });
}

export function step(w, dt) {
  const S = w.shift;
  if (!S) return;
  S.t += dt;
  if (S.phase === 'warn' && S.t >= T.worlds.shift.warn) {
    S.phase = 'on'; S.t = 0;
    w.region = new Arena(shapeAt(S.box, S.spec, 0));
    w.events.push({ type: 'shift', kind: S.spec.kind });
  } else if (S.phase === 'on') w.region.setShape(shapeAt(S.box, S.spec, S.t));
}

// the wave is over (or the world): the floor is whole again
export function end(w) {
  if (!w.shift) return;
  const kind = w.shift.spec.kind;
  w.shift = null; w.region = null;
  w.events.push({ type: 'shiftEnd', kind });
}
