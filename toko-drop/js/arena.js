// arena.js — the playable region, as a signed-distance field.
//
// v236 (P0 of LEVEL_EDITOR_DESIGN.md §7). Before this, "the arena" was two
// numbers — HALF_X and HALF_Z — read in 88 places across main.js, plus a
// (halfX, halfZ) pair threaded into player.update() and enemy.update(). That
// works exactly as long as every arena is a rectangle, and stops working the
// moment one is not.
//
// This module owns the boundary instead. It is deliberately PURE: no three.js,
// no DOM, no imports at all, so scripts/arena-check.mjs can run it in bare node
// and so the shape math has exactly one home.
//
// P0's contract is that NOTHING CHANGES. Every method below, for the rectangle
// shape, evaluates the identical expression the call site used to inline —
// including the odd ones. `clamp` reproduces Math.max(-h, Math.min(h, v)) as
// written, sign flip and all, for the degenerate h < 0 case; `ringPoint` is the
// old cos/sin·half·edge formula, which for a box is an inscribed ELLIPSE and
// not the boundary, and it stays that way. Being right and being identical are
// different goals here, and P0 is the second one.
//
// Two determinism rules, because seeded wave schedules are gated byte-for-byte:
//   1. randomPoint() draws from `rng` a FIXED number of times (2), in x-then-z
//      order, for every shape. Rejection sampling is banned — a variable draw
//      count would desynchronise every seeded schedule the moment a level used
//      a non-rectangular shape.
//   2. Nothing here reads Math.random() or a clock. update(t) takes its time.

// ── Shapes ────────────────────────────────────────────────────────────────
// A shape is { kind, sdf(x, z), aabb() } and may override clamp/ringPoint.
// sdf() is signed distance in world units: < 0 inside, 0 on the edge,
// > 0 outside. The sign convention matches the gel dome's SDF in enemy.js.

export const KIND = {
  RECT: 'rect',
  CIRCLE: 'circle',
  UNION: 'union',
  INTERSECT: 'intersect',
};

// The current arena, and the only shape P0 wires up.
export function rectShape(halfX, halfZ) {
  return {
    kind: KIND.RECT,
    halfX, halfZ,
    sdf(x, z) { return Math.max(Math.abs(x) - halfX, Math.abs(z) - halfZ); },
    aabb() { return { halfX, halfZ }; },
    // Exactly the expression the ~20 containment sites used to inline.
    clamp(x, z, r, out) {
      const hx = halfX - r, hz = halfZ - r;
      out.x = Math.max(-hx, Math.min(hx, x));
      out.z = Math.max(-hz, Math.min(hz, z));
      return out;
    },
    // Exactly the spawn-ring expression: an ellipse inscribed in the box,
    // touching it at the four axis points. NOT the box boundary — see header.
    ringPoint(angle, k, out) {
      out.x = Math.cos(angle) * halfX * k;
      out.z = Math.sin(angle) * halfZ * k;
      return out;
    },
    // Slab test — the exact expression TORO's dash used to inline.
    rayEdge(x, z, dx, dz, r) {
      const bx = halfX - r, bz = halfZ - r;
      const tx = dx > 0 ? (bx - x) / dx : dx < 0 ? (-bx - x) / dx : Infinity;
      const tz = dz > 0 ? (bz - z) / dz : dz < 0 ? (-bz - z) / dz : Infinity;
      return Math.min(tx, tz);
    },
    // The other form the codebase uses: pull in by a fixed number of world
    // units rather than by a factor. On a box that is a different ellipse.
    insetPoint(angle, inset, out) {
      out.x = Math.cos(angle) * (halfX - inset);
      out.z = Math.sin(angle) * (halfZ - inset);
      return out;
    },
  };
}

// Not wired to anything yet. Defined here so P1 is a level file, not a module.
// v241 (P3): `move` makes the centre travel. The only mover is ORBIT — the
// one LEVEL_EDITOR_DESIGN.md §4 names — { kind: 'orbit', radius, period,
// phase? }; anything else is refused by name in level.js rather than
// silently standing still.
//
// Two things here are load-bearing:
//
//  · `sdf` and `aabb` read `s.cx` / `s.cz`, NOT the constructor's arguments.
//    They used to close over the parameters, which is correct forever for a
//    static circle and silently wrong the moment one moves: update() would
//    change the fields and the field would keep answering from the old
//    centre. The 8,396 static checks in scripts/arena-check.mjs still pass
//    because for a shape that never moves the two read the same number.
//
//  · `aabb` is the SWEPT box — it grows by the orbit radius and does not
//    change with t. HALF_X/HALF_Z drive the floor plane's geometry, the
//    border, the grid frequencies and the camera fit; a box that breathed
//    every frame would rebuild that geometry every frame and pump the
//    camera. The REGION moves; the room it is drawn in does not.
export function circleShape(cx, cz, r, move = null) {
  const reach = move ? move.radius : 0;
  const s = {
    kind: KIND.CIRCLE,
    cx, cz, r,   // v240: read by the floor's shape uniforms (main.js syncShapeUniforms)
    baseX: cx, baseZ: cz,   // v241: the AUTHORED centre; the mover offsets from it
    move,
    sdf(x, z) { return Math.hypot(x - s.cx, z - s.cz) - s.r; },
    aabb() { return { halfX: Math.abs(s.baseX) + r + reach, halfZ: Math.abs(s.baseZ) + r + reach }; },
  };
  if (move) {
    // Pure: the angle comes from the t it is handed, never from a clock.
    s.update = (t) => {
      const a = Math.PI * 2 * (t / move.period + (move.phase || 0));
      s.cx = s.baseX + Math.cos(a) * move.radius;
      s.cz = s.baseZ + Math.sin(a) * move.radius;
    };
  }
  return s;
}

// The owner's worked example — "three overlapping circles create a moving
// common area" — is intersect(circle, circle, circle) with animated centres.
// union = min(d...), intersect = max(d...). That is the whole of shape algebra.
export function unionShape(...parts) { return _combine(KIND.UNION, parts); }
export function intersectShape(...parts) { return _combine(KIND.INTERSECT, parts); }

function _combine(kind, parts) {
  const pick = kind === KIND.UNION ? Math.min : Math.max;
  return {
    kind, parts,
    sdf(x, z) {
      let d = parts[0].sdf(x, z);
      for (let i = 1; i < parts.length; i++) d = pick(d, parts[i].sdf(x, z));
      return d;
    },
    aabb() {
      // Union grows to hold every part; intersection can only shrink, but a
      // conservative (union) box is still correct for camera fit and UV, and
      // is the only one computable without sampling. Deliberately loose.
      let hx = 0, hz = 0;
      for (const p of parts) { const b = p.aabb(); hx = Math.max(hx, b.halfX); hz = Math.max(hz, b.halfZ); }
      return { halfX: hx, halfZ: hz };
    },
    // v241 (P3): a combine moves when its parts do. Without this, Arena.update()
    // reached a union/intersect, found no update() on it, and every part stood
    // still — which is exactly the shape the owner's worked example is made of.
    update(t) { for (const p of parts) if (p.update) p.update(t); },
  };
}

// ── Arena ─────────────────────────────────────────────────────────────────

const _scratch = { x: 0, z: 0 };

export class Arena {
  constructor(shape) { this.setShape(shape); }

  setShape(shape) {
    this.shape = shape;
    const b = shape.aabb();
    this.halfX = b.halfX;
    this.halfZ = b.halfZ;
  }

  // Convenience for the one shape P0 uses. Keeps main.js from importing
  // rectShape just to resize on an orientation flip.
  setRect(halfX, halfZ) { this.setShape(rectShape(halfX, halfZ)); }

  sdf(x, z) { return this.shape.sdf(x, z); }

  // A body of radius r fits entirely inside when its centre is at least r in.
  contains(x, z, r = 0) { return this.shape.sdf(x, z) + r <= 0; }

  // Nearest point that holds a body of radius r. Writes into `out` (callers
  // are per-frame per-body, so this must not allocate) and returns it.
  clamp(x, z, r = 0, out = _scratch) {
    if (this.shape.clamp) return this.shape.clamp(x, z, r, out);
    return this._marchIn(x, z, r, out);
  }

  // Generic fallback for shapes with no closed-form clamp: walk down the SDF
  // gradient until the body fits. Finite-difference normal, a few fixed steps —
  // fixed so cost is predictable and the result is deterministic.
  _marchIn(x, z, r, out) {
    const s = this.shape;
    const EPS = 1e-3;
    for (let i = 0; i < 8; i++) {
      const d = s.sdf(x, z) + r;
      if (d <= 0) break;
      const gx = s.sdf(x + EPS, z) - s.sdf(x - EPS, z);
      const gz = s.sdf(x, z + EPS) - s.sdf(x, z - EPS);
      const len = Math.hypot(gx, gz) || 1;
      x -= (gx / len) * d;
      z -= (gz / len) * d;
    }
    out.x = x; out.z = z;
    return out;
  }

  // The spawn ring: where an enemy enters from. `k` is the old `edge` factor.
  ringPoint(angle, k = 1, out = _scratch) {
    if (this.shape.ringPoint) return this.shape.ringPoint(angle, k, out);
    // General shapes: bisect along the ray to find where the region ends, then
    // scale by k the way the box's inscribed ellipse does. Fixed step count, so
    // the cost is predictable and the answer is deterministic.
    const s = this.shape;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const reach = Math.hypot(this.halfX, this.halfZ);
    let lo = 0, hi = reach;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) * 0.5;
      if (s.sdf(dx * mid, dz * mid) < 0) lo = mid; else hi = mid;
    }
    out.x = dx * lo * k;
    out.z = dz * lo * k;
    return out;
  }

  // Same ray, pulled in by a fixed distance instead of scaled by a factor.
  insetPoint(angle, inset, out = _scratch) {
    if (this.shape.insetPoint) return this.shape.insetPoint(angle, inset, out);
    this.ringPoint(angle, 1, out);
    const d = Math.hypot(out.x, out.z);
    const k = d > inset ? (d - inset) / d : 0;
    out.x *= k; out.z *= k;
    return out;
  }

  // How far a body of radius r can travel from (x, z) along the unit direction
  // (dx, dz) before it leaves the region. TORO's dash telegraph is drawn from
  // this, so it has to be the real distance, not an estimate.
  rayEdge(x, z, dx, dz, r = 0) {
    if (this.shape.rayEdge) return this.shape.rayEdge(x, z, dx, dz, r);
    // General shapes: sphere-trace. Steps are bounded and the step size comes
    // from the SDF itself, so a concave region cannot be stepped over.
    const s = this.shape;
    const far = Math.hypot(this.halfX, this.halfZ) * 2;
    let t = 0;
    for (let i = 0; i < 48 && t < far; i++) {
      const d = -(s.sdf(x + dx * t, z + dz * t) + r);   // distance to the wall
      if (d <= 1e-3) return t;
      t += Math.max(d, 1e-3);
    }
    return Math.min(t, far);
  }

  // A point inside, `margin` world units clear of the boundary. Consumes
  // EXACTLY two rng draws, x then z, for every shape — see the header.
  randomPoint(rng, margin = 0, out = _scratch) {
    const x = (rng() * 2 - 1) * (this.halfX - margin);
    const z = (rng() * 2 - 1) * (this.halfZ - margin);
    if (this.shape.kind === KIND.RECT) { out.x = x; out.z = z; return out; }
    // Non-rectangular: pull the AABB sample inside rather than redrawing.
    return this.clamp(x, z, margin, out);
  }

  // Moving shapes advance here. The rectangle does not move; P3 is where this
  // stops being a no-op, and §2.4 of LEVEL_EDITOR_DESIGN.md is the design
  // question that gates it.
  update(t) {
    if (this.shape.update) { this.shape.update(t); this.setShape(this.shape); }
  }
}
