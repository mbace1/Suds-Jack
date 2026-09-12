// framing.js — the camera frames the FIGHT, not the floor (v247).
//
// The LOOK pass named it: the classic arena is fitted to the screen edge to
// edge, and the fight is a small patch in the middle of a large dark floor.
// A fixed-screen arena shooter keeps the whole arena in view so a spawn on
// the rim is never a surprise — and that rule is kept here, by making the
// RIM part of the frame whenever a spawn is pending. The rest of the time
// the things that matter are the player, the live bodies and the enemy
// bullets, and the camera dollies in along its own view ray until that set
// fills the frame, never closer than `dollyMax` of the rest distance, never
// further out than rest. The look point slides toward the set's centre in
// proportion to how far in the camera has come, so at full-out the view is
// exactly the fixed one it always was, and nothing drifts on the title.
//
// Pure: no three.js, no DOM. main.js hands it the preset's ray and the
// points; scripts/framing-check.mjs runs it in bare node.

export const FRAMING_DEFAULTS = { enabled: true, dollyMax: 0.35, margin: 3.0, ease: 2.0, easeOut: 5.0, marginX: 0.96, marginZ: 0.93 };

/** the view basis for a ray: dir is the unit vector from look to camera */
export function basis(restCam, restLook) {
  const dx = restCam.x - restLook.x, dy = restCam.y - restLook.y, dz = restCam.z - restLook.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const dir = { x: dx / len, y: dy / len, z: dz / len };
  const f = { x: -dir.x, y: -dir.y, z: -dir.z };                       // camera forward
  let r = { x: f.z, y: 0, z: -f.x };                                     // f × up(0,1,0)
  const rl = Math.hypot(r.x, r.z) || 1; r = { x: r.x / rl, y: 0, z: r.z / rl };
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };   // r × f
  return { dir, f, r, u, restDist: len };
}

/** is every ground point inside the frustum margins from a camera at look + dir·dist? */
export function allInside(points, look, B, dist, aspect, tanHalf, mX, mZ) {
  const cx = look.x + B.dir.x * dist, cy = B.dir.y * dist, cz = look.z + B.dir.z * dist;
  for (const p of points) {
    const dx = p.x - cx, dy = -cy, dz = p.z - cz;
    const z = dx * B.f.x + dy * B.f.y + dz * B.f.z;
    if (z <= 0) return false;
    if (Math.abs((dx * B.r.x + dy * B.r.y + dz * B.r.z) / (z * tanHalf * aspect)) > mX) return false;
    if (Math.abs((dx * B.u.x + dy * B.u.y + dz * B.u.z) / (z * tanHalf)) > mZ) return false;
  }
  return true;
}

/** the smallest distance along the ray at which every point fits (binary search) */
export function fitDistance(points, look, B, aspect, tanHalf, lo, hi, mX, mZ) {
  if (!allInside(points, look, B, hi, aspect, tanHalf, mX, mZ)) return hi;
  for (let i = 0; i < 32; i++) { const mid = (lo + hi) / 2; if (allInside(points, look, B, mid, aspect, tanHalf, mX, mZ)) hi = mid; else lo = mid; }
  return hi;
}

/**
 * Where the camera WANTS to be this frame.
 * @param points  ground points that matter: [{x, z}]; empty or pending → rest
 * @param pending a spawn is coming on the rim → the whole arena matters
 * @param R       { restLook:{x,z}, B: basis(), aspect, tanHalf }
 * @returns { dist, look:{x,z} }
 */
export function frameTarget(points, pending, R, cfg = FRAMING_DEFAULTS) {
  const rest = { dist: R.B.restDist, look: { x: R.restLook.x, z: R.restLook.z } };
  if (!cfg.enabled || pending || points.length < 2) return rest;      // one point is the player alone: nothing to frame
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of points) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.z < z0) z0 = p.z; if (p.z > z1) z1 = p.z; }
  const m = cfg.margin;
  const box = [{ x: x0 - m, z: z0 - m }, { x: x1 + m, z: z0 - m }, { x: x0 - m, z: z1 + m }, { x: x1 + m, z: z1 + m }];
  const c = { x: (x0 + x1) / 2, z: (z0 + z1) / 2 };
  const minDist = rest.dist * (1 - cfg.dollyMax);
  // fit the box looking at its own centre, then decide how far in we really go
  const d = Math.min(rest.dist, Math.max(minDist, fitDistance(box, c, R.B, R.aspect, R.tanHalf, minDist, rest.dist, cfg.marginX, cfg.marginZ)));
  const k = cfg.dollyMax > 0 ? (rest.dist - d) / (rest.dist * cfg.dollyMax) : 0;   // 0 at full-out … 1 at full-in
  return { dist: d, look: { x: rest.look.x + (c.x - rest.look.x) * k, z: rest.look.z + (c.z - rest.look.z) * k } };
}

/** ease the live camera toward the target; returns the state it mutates.
 *  Coming OUT is urgent (a spawn is arriving on the rim — a body must not
 *  land off screen), coming IN is a mood: two rates. */
export function easeToward(cur, target, dt, ease, easeOut = ease) {
  const k = Math.min(1, dt * (target.dist > cur.dist ? easeOut : ease));
  cur.dist += (target.dist - cur.dist) * k;
  cur.look.x += (target.look.x - cur.look.x) * k;
  cur.look.z += (target.look.z - cur.look.z) * k;
  return cur;
}
