// fairspawn.js — a body never arrives on top of the hero, nor just ahead of where the hero is going (v157).
//
// Owner, 19 Nov 2026, after FIRST LIGHT (room 1) beat him at every tier: "The biggest impact on this would be how
// the enemies spawn. They shouldn't spawn too close and also could avoid the direction of movement slightly."
// A room's bodies arrive at the points its file names, and nothing looked at where the hero stood: standing by a
// wall, the next three came in at arm's length. Sakurai §2 (#211): never put the player into danger they could not
// see coming.
//
// The rule, at the moment a body is due (TUNING.fairSpawn):
//   a point is FAIR when it is at least `clear` from the hero, and — while the hero moves faster than `moving` —
//   not inside the `ahead` cone of its heading out to `ahead.range`.
//   A fair authored point is kept exactly: the room plays as written wherever you are not.
//   An unfair one moves to the NEAREST fair point among its mirrors (across the room's middle, then across each
//   axis: a room's layouts are mostly symmetric, so a mirror is still the room) and then the same point turned
//   round the room's middle in steps. Inside the room's floor (its region, if it has one). If none is fair, the
//   one farthest from the hero.
// The body is not delayed and not dropped: the room's count and timing are the room's. A boss is left where its
// room put it (it is the room's set piece, and arrives as the room opens).
//
// v158, ARCADE too (owner, 20 Nov, "2 yes" to "should ARCADE get the fair spawns too?"): a wave's body lands on 1.x's
// ring (`ring`: an ellipse round the spawn frame, sim/director/arcade.js), so an unfair landing moves ALONG THAT RING —
// the same angle turned in 30° steps either way, the nearest fair one — rather than across the room. Off the ring a
// body would land somewhere 1.x never put one.
import { TUNING } from '../tuning.js?v=159';
import * as posts from './posts.js?v=159';

const T = TUNING;

export function fairPoint(w, x, z, ring = null) {
  const F = T.fairSpawn, h = w.hero;
  if (!F?.on || !h || (ring && !F.arcade)) return { x, z };
  const v = Math.hypot(h.velX || 0, h.velZ || 0), mv = v > F.moving, ux = mv ? h.velX / v : 0, uz = mv ? h.velZ / v : 0;
  const cos = Math.cos(F.ahead.cone);
  const fair = (px, pz) => {
    const dx = px - h.x, dz = pz - h.z, d = Math.hypot(dx, dz);
    if (d < F.clear) return false;
    if (mv && d < F.ahead.range && (dx * ux + dz * uz) / (d || 1) > cos) return false;
    return true;
  };
  if (fair(x, z)) return { x, z };
  const inside = (px, pz) => (w.region ? w.region.contains(px, pz, 1) : Math.abs(px) <= w.hx - 1 && Math.abs(pz) <= w.hz - 1);
  const cands = [];
  if (ring) {
    // along the ring: its own angle turned 30° at a time, either way (an ellipse, so the angle is the ring's own)
    const a0 = Math.atan2((z - ring.cz) / ring.rz, (x - ring.cx) / ring.rx);
    for (let k = 1; k <= 6; k++) for (const s of [1, -1]) { const a = a0 + s * k * (Math.PI / 6); cands.push([ring.cx + Math.cos(a) * ring.rx, ring.cz + Math.sin(a) * ring.rz]); }
  } else {
    cands.push([-x, -z], [-x, z], [x, -z]);
    const r = Math.hypot(x, z), a0 = Math.atan2(z, x);
    for (let k = 1; k <= 6; k++) for (const s of [1, -1]) {
      const a = a0 + s * k * (Math.PI / 6);
      cands.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  // a body that has to MOVE is held to more than the authored point was (v158, measured on a hero running round the
  // arcade's ring): out of the heading at ANY distance — the ring ahead of a runner is the runner's path, and a body
  // turned just past the cone's reach landed on it — and not on top of one that has just arrived (a front laid evenly
  // round the ring, nudged, bunched). Only if no turn is that clean does the plain rule pick.
  const clean = (px, pz) => {
    const dx = px - h.x, dz = pz - h.z, d = Math.hypot(dx, dz) || 1;
    if (mv && (dx * ux + dz * uz) / d > cos) return false;
    return !w.gels.some((o) => o.alive && (o.t ?? 9) < F.bunch.t && Math.hypot(o.x - px, o.z - pz) < F.bunch.r);
  };
  let best = null, bd = Infinity, far = null, fd = -1, okBest = null, okD = Infinity;
  for (const [px, pz] of cands) {
    if (!inside(px, pz)) continue;
    const dh = Math.hypot(px - h.x, pz - h.z);
    if (dh > fd) { fd = dh; far = { x: px, z: pz }; }
    if (!fair(px, pz)) continue;
    const d0 = Math.hypot(px - x, pz - z);
    if (d0 < okD) { okD = d0; okBest = { x: px, z: pz }; }
    if (!clean(px, pz)) continue;
    const d = Math.hypot(px - x, pz - z);
    if (d < bd) { bd = d; best = { x: px, z: pz }; }
  }
  const p = best ?? okBest ?? far ?? { x, z };
  if (ring && (p.x !== x || p.z !== z)) posts.clear(w, p, 1.2);   // never inside what stands on the floor (as ringPoint)
  return p;
}
