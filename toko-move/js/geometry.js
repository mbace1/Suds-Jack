// The one rule that makes a diagram read as a transit map: OCTOLINEAR.
//
// Every leg between two stops runs at 0°, 45° or 90° and nothing else. A real
// route does not, which is exactly the point — Beck's London map threw the
// geography away and became more useful, not less. So a leg is two pieces: a
// diagonal run, then an axis-aligned run into the stop. Get this wrong and the
// whole board stops looking like a metro map and starts looking like a graph.

export const TAU = Math.PI * 2;

// Where the bend falls. The diagonal eats whichever axis is shorter, so the
// remainder is always a clean horizontal or vertical into `b`.
export function corner(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax > ay) return { x: a.x + Math.sign(dx) * ay, y: b.y };
  return { x: b.x, y: a.y + Math.sign(dy) * ax };
}

// A leg as drawable points. The bend is dropped when it lands on an end,
// which is what keeps a perfectly straight or perfectly diagonal leg to two
// points instead of three with a zero-length piece in the middle.
export function legPoints(a, b) {
  const c = corner(a, b);
  const out = [a];
  if (!same(c, a) && !same(c, b)) out.push(c);
  out.push(b);
  return out;
}

const same = (p, q) => Math.abs(p.x - q.x) < 0.001 && Math.abs(p.y - q.y) < 0.001;

export function polyLength(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return d;
}

// Cumulative lengths, so a train's position along a leg is one binary-free walk
// rather than a re-measure every frame.
export function measure(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return cum;
}

// Position and heading at distance `d` along a measured polyline.
export function posOn(pts, cum, d) {
  const total = cum[cum.length - 1];
  if (total <= 0) return { x: pts[0].x, y: pts[0].y, ang: 0 };
  const t = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < t) i++;
  const span = cum[i] - cum[i - 1] || 1;
  const k = (t - cum[i - 1]) / span;
  const a = pts[i - 1], b = pts[i];
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, ang: Math.atan2(b.y - a.y, b.x - a.x) };
}

// Perpendicular of the chord a→b, unit length. Parallel lines sharing a leg are
// pushed along this — using the CHORD rather than each piece's own normal keeps
// the offset copy the same shape as the original, just moved sideways.
export function chordNormal(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: -dy / len, y: dx / len };
}

export function offsetPoints(pts, n, amount) {
  return pts.map(p => ({ x: p.x + n.x * amount, y: p.y + n.y * amount }));
}

// ── water ───────────────────────────────────────────────────────────────
// A ring is a closed loop of points; anything inside it is water.

export function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function inWater(x, y, rings) {
  for (const r of rings) if (pointInRing(x, y, r)) return true;
  return false;
}

// How many separate stretches of water a leg passes over — that is how many
// tunnels it costs. Sampled rather than solved: the rings are wobbly polylines
// with dozens of edges, and a sample every few units cannot miss a river wide
// enough to matter while an exact intersection test would have to care about
// grazing a corner.
export function crossings(pts, rings, step = 5) {
  if (!rings.length) return 0;
  const cum = measure(pts);
  const total = cum[cum.length - 1];
  if (total <= 0) return 0;
  let count = 0, was = false;
  for (let d = 0; d <= total; d += step) {
    const p = posOn(pts, cum, d);
    const now = inWater(p.x, p.y, rings);
    if (now && !was) count++;
    was = now;
  }
  return count;
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Where a leg enters or leaves the water. Drawn as a notch, so a tunnel is
// visible on the board instead of being a number in the corner — the player
// needs to see which connection is costing them the scarce thing.
export function waterGates(pts, rings, step = 4) {
  if (!rings.length) return [];
  const cum = measure(pts);
  const total = cum[cum.length - 1];
  const gates = [];
  let was = false;
  for (let d = 0; d <= total; d += step) {
    const p = posOn(pts, cum, d);
    const now = inWater(p.x, p.y, rings);
    if (now !== was && d > 0) gates.push({ x: p.x, y: p.y, ang: p.ang });
    was = now;
  }
  return gates;
}
