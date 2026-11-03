// posts.js — the floor's own shape (v108; owner: "arcade arena shapes are boring. We need some dynamic
// elements"). A later world's floor is not an empty rectangle: things stand in it — the driveway's bollards, the
// cistern's pillars, the boiler's drums, the river's boulders, the core's crystals going round — and they BLOCK.
// The hero and every body are pushed out of them as the rail pushes, a bullet (yours or a gel's) dies on one, so
// each is cover both ways; a spawn, a gate or a drop that would land in one is moved clear of it.
//
// They are circles, laid out from TUNING.posts by world as fractions of its floor (so one layout fits the floor in
// either orientation), symmetric about the middle so neither side is the safe one, and never on the middle, where
// the hero lands from the world before. A post with an `orbit` goes round the middle on the run's clock.
// Pure: no DOM, no clock but the run's, no Math.random.
//
//   w.posts  [{ x, z, r, kind, px, pz, orbit? { a0, R, w } }]      none in world 1 (1.x's floor) or a campaign room
import { TUNING } from '../tuning.js?v=109';

const T = TUNING;

// a world's posts, laid out on its floor (`w.hx`, `w.hz` already its own)
export function layout(w) {
  const L = T.worlds.modes.includes(w.mode) ? T.posts.worlds[w.world] : null;
  w.posts = [];
  if (!L) return;
  const m = Math.min(w.hx, w.hz);
  for (const p of L.at) {
    const r = L.r * (p[2] ?? 1);
    if (L.orbit) {
      const a0 = Math.atan2(p[1], p[0]), R = Math.hypot(p[0] * w.hx, p[1] * w.hz) || L.orbit.r * m;
      w.posts.push({ kind: L.kind, r, x: Math.cos(a0) * R, z: Math.sin(a0) * R, px: 0, pz: 0, orbit: { a0, R, w: (2 * Math.PI) / L.orbit.period } });
    } else w.posts.push({ kind: L.kind, r, x: p[0] * w.hx, z: p[1] * w.hz, px: 0, pz: 0 });
  }
  for (const p of w.posts) { p.px = p.x; p.pz = p.z; }
}

// the moving ones move (on the run's clock, so a run replays)
export function step(w) {
  if (!w.posts?.length) return;
  for (const p of w.posts) {
    p.px = p.x; p.pz = p.z;
    if (p.orbit) { const a = p.orbit.a0 + w.time * p.orbit.w; p.x = Math.cos(a) * p.orbit.R; p.z = Math.sin(a) * p.orbit.R; }
  }
}

// keep a circle of radius r at o out of every post; the push back, or null. `press` gets the shove (v82's squash)
export function push(w, o, r, press = null) {
  if (!w.posts?.length) return null;
  let moved = null;
  for (const p of w.posts) {
    const dx = o.x - p.x, dz = o.z - p.z, d = Math.hypot(dx, dz), min = p.r + r;
    if (d >= min) continue;
    const nx = d > 1e-6 ? dx / d : 1, nz = d > 1e-6 ? dz / d : 0, k = min - d;
    o.x += nx * k; o.z += nz * k;
    press?.(o, -nx * k, -nz * k);
    moved = { nx, nz };
  }
  return moved;
}

// is (x, z) inside a post, with a margin
export function inside(w, x, z, r = 0) {
  if (!w.posts?.length) return false;
  for (const p of w.posts) if (Math.hypot(x - p.x, z - p.z) < p.r + r) return true;
  return false;
}
