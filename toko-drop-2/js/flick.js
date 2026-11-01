// flick.js — the dash gesture, read off the aim stick's recent history at the
// moment it is let go (owner, 2026-10-23: "dash needs to be reacting more to
// flicks, length, speed", then: no dash on a plain let-go, only a flick, and
// a longer one; 2026-10-31: "get flick to dash to 1.x parity"). Pure: no DOM,
// no clock, so it tests in bare node (test/hero.mjs, scratch strokes). input.js
// feeds it samples stamped with the events' own timeStamps, never
// performance.now(): a busy main thread delivers events late, and a flick
// measured off delivery times is a flick of the frame rate.
//
// The result is a GESTURE, not a dash: { kind, sL, sV, dirX, dirY } in screen
// axes (x right, y down). The sim (hero.js dashPlan) owns what one is worth.
//
//   tap      down and up inside tapMs and tapPx
//   release  let go without a flick: the thumb had come to rest, or only
//            drifted. Since v18 this is no dash at all
//   flick    a STROKE — a run of samples faster than strokeFloor, in one
//            general direction, long enough and fast enough somewhere — that
//            ended within landMs of the lift. sL (0..1) from the stroke's
//            length, sV (0..1) from its peak speed, the direction the
//            stroke's own, lift minus start
//
// v91 (1.x parity): 1.x dashed on EVERY lift of the aim stick, so a thumb that
// flicked, slowed, stopped and then lifted always dashed. v18's reader asked
// the thumb to be still moving AT the lift (and above a release speed), and a
// thumb that lands its flick — decelerating to a stop, as a thumb on glass
// does — read as a let-go: at 60 Hz, none of the decelerating strokes in the
// gesture set dashed, at any stop before the lift. The stroke is found first
// now, behind whatever landing followed it, and it counts while the landing
// was shorter than landMs. A thumb at rest longer than that is the plain
// let-go the owner asked to keep as none.

const ramp = (x, [a, b]) => Math.max(0, Math.min(1, (x - a) / (b - a)));

// hist: [{ x, y, t }] oldest first, CSS px and ms; hist[0] is the touchdown,
// the last entry the lift (touchend's own position and time). `unitPx` turns
// px into the flick's units (the stick's radius).
export function analyseTouch(hist, F, unitPx) {
  const n = hist.length, down = hist[0], up = hist[n - 1];
  const dur = up.t - down.t;
  let wander = 0;
  for (const s of hist) wander = Math.max(wander, Math.hypot(s.x - down.x, s.y - down.y));
  const g = { kind: 'release', sL: 0, sV: 0, dirX: 0, dirY: 0, dur, wander, L: 0, V: 0, Vrel: 0, land: 0 };
  if (dur <= F.tapMs && wander <= F.tapPx) { g.kind = 'tap'; return g; }

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
  // was the thumb moving (faster than strokeFloor) when sample i arrived
  const fast = (i) => i > 0 && hist[i].t - hist[i - 1].t <= F.restMs && speed(hist[from(i, 0)], hist[i]) >= F.strokeFloor;

  // the landing: back from the lift over the samples that were slow or still
  // (a touchend repeats the last touchmove's position at a later time; a
  // thumb slowing to a stop sends ever smaller moves, then nothing). The
  // stroke ends at the last fast sample; a landing longer than landMs was the
  // thumb at rest, and lifting a resting thumb is no flick
  let e = n - 1;
  while (e > 0 && !fast(e)) e--;
  if (e === 0) return g;
  g.land = up.t - hist[e].t;
  if (g.land > F.landMs) return g;

  // the stroke: walk back from its end while the thumb was moving faster
  // than strokeFloor, in the same general direction, within strokeMs
  let s = e;
  const ex = hist[e].x, ey = hist[e].y;
  while (s > 0) {
    const a = hist[s - 1], b = hist[s];
    // a gap this long before b was the thumb resting, and the stroke started
    // from where it rested, however long ago that was
    if (b.t - a.t > F.restMs) { s--; break; }
    if (hist[e].t - a.t > F.strokeMs) break;
    if (!fast(s)) break;
    const ox = ex - a.x, oy = ey - a.y, sx = b.x - a.x, sy = b.y - a.y;
    if (s < e && ox * sx + oy * sy <= 0) break;      // turned back on itself: an aim sweep, not this stroke
    s--;
  }
  const st = hist[s];
  // the stroke's length and direction run to the lift: the landing is the
  // tail of the same travel
  const dx = up.x - st.x, dy = up.y - st.y, len = Math.hypot(dx, dy);
  g.L = len / unitPx;
  // the stroke's peak speed, each sample spanning at least spanMs
  let V = 0;
  for (let i = s + 1; i <= e; i++) {
    if (hist[i].t - hist[i - 1].t > F.restMs) continue;   // the rest is not a speed
    V = Math.max(V, speed(hist[from(i, s)], hist[i]));
  }
  // the speed over the stroke's last releaseMs, for the readout
  let r = e;
  while (r > s && hist[e].t - hist[r - 1].t <= F.releaseMs && hist[r].t - hist[r - 1].t <= F.restMs) r--;
  if (r === e) r = Math.max(s, e - 1);
  g.Vrel = r < e ? speed(hist[r], hist[e]) : 0;
  g.V = Math.max(V, g.Vrel);
  // a flick is long enough and fast somewhere in it: an aim drift that lifts
  // while creeping has the length but never the peak, so it is a let-go
  if (g.V < F.peakFloor || g.L < F.lengthFloor || len < 1e-6) return g;
  g.kind = 'flick';
  g.sL = ramp(g.L, F.length); g.sV = ramp(g.V, F.speed);
  g.dirX = dx / len; g.dirY = dy / len;
  return g;
}
