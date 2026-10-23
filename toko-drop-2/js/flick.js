// flick.js — the dash gesture, read off the aim stick's recent history at the
// moment it is let go (owner, 2026-10-23: "dash needs to be reacting more to
// flicks, length, speed", then: no dash on a plain let-go, only a flick, and
// a longer one). Pure: no DOM, no clock, so it tests in bare node
// (test/flick.mjs). input.js feeds it samples stamped with the events' own
// timeStamps, never performance.now(): a busy main thread delivers events
// late, and a flick measured off delivery times is a flick of the frame rate.
//
// The result is a GESTURE, not a dash: { kind, sL, sV, dirX, dirY } in screen
// axes (x right, y down). The sim (hero.js dashPlan) owns what one is worth.
//
//   tap      down and up inside tapMs and tapPx
//   release  let go without a flick: the thumb had stopped, or was slow, or
//            the stroke was short. Since v18 this is no dash at all
//   flick    the thumb was still travelling when it lifted: sL (0..1) from
//            the stroke's length, sV (0..1) from its peak speed, and the
//            direction the stroke's own, end minus start

const ramp = (x, [a, b]) => Math.max(0, Math.min(1, (x - a) / (b - a)));

// hist: [{ x, y, t }] oldest first, CSS px and ms; hist[0] is the touchdown,
// the last entry the lift (touchend's own position and time). `unitPx` turns
// px into the flick's units (the stick's radius).
export function analyseTouch(hist, F, unitPx) {
  const n = hist.length, down = hist[0], up = hist[n - 1];
  const dur = up.t - down.t;
  let wander = 0;
  for (const s of hist) wander = Math.max(wander, Math.hypot(s.x - down.x, s.y - down.y));
  const g = { kind: 'release', sL: 0, sV: 0, dirX: 0, dirY: 0, dur, wander, L: 0, V: 0, Vrel: 0 };
  if (dur <= F.tapMs && wander <= F.tapPx) { g.kind = 'tap'; return g; }

  // the moving samples: a touchend repeats the last touchmove's position at
  // a later time; that is the lift, not the thumb stopping (Android's
  // VelocityTracker ignores the up event for the same reason)
  let m = n - 1;
  while (m > 0 && Math.hypot(hist[m].x - hist[m - 1].x, hist[m].y - hist[m - 1].y) < 0.5) m--;
  const last = hist[m];
  // stopped before the lift: no flick, whatever came before
  if (up.t - last.t > F.stopMs || m === 0) return g;

  // speed between two samples, in units a second
  const speed = (a, b) => (Math.hypot(b.x - a.x, b.y - a.y) / unitPx) / Math.max(1e-3, (b.t - a.t) / 1000);
  // the sample a speed ending at i is measured from: back at least spanMs
  // (one sample's jitter is not a speed), but never across a rest (a gap of
  // restMs with no events: a thumb at rest sends nothing)
  const from = (i, lo) => {
    let j = i - 1;
    while (j > lo && hist[i].t - hist[j].t < F.spanMs && hist[j].t - hist[j - 1].t <= F.restMs) j--;
    return j;
  };

  // the release speed: the displacement over the last releaseMs of movement
  let r = m;
  while (r > 0 && last.t - hist[r - 1].t <= F.releaseMs && hist[r].t - hist[r - 1].t <= F.restMs) r--;
  if (r === m) r = m - 1;
  g.Vrel = speed(hist[r], last);

  // the stroke: walk back from the lift while the thumb was moving faster
  // than strokeFloor, in the same general direction, within strokeMs
  let s = m;
  const ex = last.x, ey = last.y;
  while (s > 0) {
    const a = hist[s - 1], b = hist[s];
    // a gap this long before b was the thumb resting, and the stroke started
    // from where it rested, however long ago that was
    if (b.t - a.t > F.restMs) { s--; break; }
    if (last.t - a.t > F.strokeMs) break;
    if (speed(hist[from(s, 0)], b) < F.strokeFloor) break;
    const ox = ex - a.x, oy = ey - a.y, sx = b.x - a.x, sy = b.y - a.y;
    if (s < m && ox * sx + oy * sy <= 0) break;      // turned back on itself: an aim sweep, not this stroke
    s--;
  }
  const st = hist[s];
  const dx = ex - st.x, dy = ey - st.y, len = Math.hypot(dx, dy);
  g.L = len / unitPx;
  // the stroke's peak speed, each sample spanning at least spanMs
  let V = 0;
  for (let i = s + 1; i <= m; i++) {
    if (hist[i].t - hist[i - 1].t > F.restMs) continue;   // the rest is not a speed
    V = Math.max(V, speed(hist[from(i, s)], hist[i]));
  }
  g.V = Math.max(V, g.Vrel);
  // a flick is still moving at the lift, long enough, and fast somewhere in
  // it: an aim drift that lifts while creeping has the length but never the
  // peak, so it is a let-go, and a let-go is no dash
  if (g.Vrel < F.releaseFloor || g.V < F.peakFloor || g.L < F.lengthFloor || len < 1e-6) return g;
  g.kind = 'flick';
  g.sL = ramp(g.L, F.length); g.sV = ramp(g.V, F.speed);
  g.dirX = dx / len; g.dirY = dy / len;
  return g;
}
