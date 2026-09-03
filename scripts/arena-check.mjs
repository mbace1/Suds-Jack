#!/usr/bin/env node
// arena-check.mjs — P0's gate: the rectangle survives being reimplemented.
//
// LEVEL_EDITOR_DESIGN.md §7 P0 promises "the rectangle becomes an SDF, and
// nothing changes." This asserts the second half, numerically. Every check
// below compares an Arena method against the literal expression the call site
// used to inline, at the shipped arena sizes, and demands EXACT equality —
// not a tolerance. A tolerance here would hide precisely the drift that makes
// a seeded wave schedule diverge.
//
// It also pins the two determinism rules from arena.js's header, because they
// are invisible until a level uses a shape and then everything desynchronises
// at once.
//
// Bare node. No browser, no GPU. Run it on every edit.

import { Arena, rectShape, circleShape, unionShape, intersectShape, KIND }
  from '../toko-drop/js/arena.js';

let checks = 0, fails = 0;
const eq = (name, got, want) => {
  checks++;
  if (!Object.is(got, want)) { fails++; console.error(`✘ ${name}\n    got  ${got}\n    want ${want}`); }
};
const ok = (name, cond) => { checks++; if (!cond) { fails++; console.error(`✘ ${name}`); } };

// The three shipped presets, plus a scrolling-arena scale (arenaScale 1.6).
const SIZES = [[11, 18], [19, 11], [15, 11], [11 * 1.6, 18 * 1.6], [6, 6], [11, 7]];
const out = { x: 0, z: 0 };

for (const [hx, hz] of SIZES) {
  const a = new Arena(rectShape(hx, hz));
  const tag = `${hx}×${hz}`;

  eq(`${tag} aabb halfX`, a.halfX, hx);
  eq(`${tag} aabb halfZ`, a.halfZ, hz);

  // ── sdf sign convention ────────────────────────────────────────────────
  ok(`${tag} sdf centre inside`, a.sdf(0, 0) < 0);
  eq(`${tag} sdf on +x wall`, a.sdf(hx, 0), 0);
  eq(`${tag} sdf on +z wall`, a.sdf(0, hz), 0);
  ok(`${tag} sdf outside`, a.sdf(hx + 3, 0) > 0);

  // ── clamp === Math.max(-h, Math.min(h, v)), per axis, radius and all ───
  for (const r of [0, 0.5, 0.6, 1.2, 2.4, hx + 4 /* degenerate h < 0 */]) {
    for (const x of [-99, -hx, -3.3, 0, 0.001, 7.77, hx, 99]) {
      for (const z of [-99, -hz, -1.1, 0, 4.25, hz, 99]) {
        a.clamp(x, z, r, out);
        const bx = hx - r, bz = hz - r;
        eq(`${tag} clamp r=${r} x`, out.x, Math.max(-bx, Math.min(bx, x)));
        eq(`${tag} clamp r=${r} z`, out.z, Math.max(-bz, Math.min(bz, z)));
      }
    }
  }

  // ── ringPoint === cos(a)*halfX*k, sin(a)*halfZ*k (the spawn ring) ──────
  // Note it is an inscribed ELLIPSE, not the box boundary. That is deliberate
  // and load-bearing: it is what the spawn ring has always been.
  for (const k of [0.85, 0.95, 0.99, 1]) {
    for (let i = 0; i < 64; i++) {
      const ang = (i / 64) * Math.PI * 2;
      a.ringPoint(ang, k, out);
      eq(`${tag} ringPoint k=${k} x`, out.x, Math.cos(ang) * hx * k);
      eq(`${tag} ringPoint k=${k} z`, out.z, Math.sin(ang) * hz * k);
    }
  }

  // ── insetPoint === cos(a)*(halfX-m), sin(a)*(halfZ-m) (the SMASH door) ─
  for (const m of [1, 1.5, 2, 4]) {
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      a.insetPoint(ang, m, out);
      eq(`${tag} insetPoint m=${m} x`, out.x, Math.cos(ang) * (hx - m));
      eq(`${tag} insetPoint m=${m} z`, out.z, Math.sin(ang) * (hz - m));
    }
  }

  // ── rayEdge === TORO's slab test, Infinity on a zero component ─────────
  for (const r of [0, 1.2, 2.2]) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.6, 0.8], [-0.6, -0.8], [0.8, -0.6]]) {
      for (const [px, pz] of [[0, 0], [3, -4], [-hx + 1, hz - 1]]) {
        const bx = hx - r, bz = hz - r;
        const tx = dx > 0 ? (bx - px) / dx : dx < 0 ? (-bx - px) / dx : Infinity;
        const tz = dz > 0 ? (bz - pz) / dz : dz < 0 ? (-bz - pz) / dz : Infinity;
        eq(`${tag} rayEdge r=${r} d=${dx},${dz} p=${px},${pz}`,
           a.rayEdge(px, pz, dx, dz, r), Math.min(tx, tz));
      }
    }
  }

  // ── contains(x, z, -slack) === the old "escaped the arena" test ────────
  for (const slack of [5]) {
    for (const [x, z] of [[0, 0], [hx + 4.9, 0], [hx + 5.1, 0], [0, hz + 5.1], [hx + 6, hz + 6]]) {
      const oldEscaped = Math.abs(x) > hx + slack || Math.abs(z) > hz + slack;
      eq(`${tag} escape ${x},${z}`, !a.contains(x, z, -slack), oldEscaped);
    }
  }

  // ── randomPoint: two draws, x then z, exactly the old expression ───────
  for (const margin of [0, 2, 3]) {
    let i = 0;
    const seq = [0.125, 0.875, 0.5, 0.0, 1.0, 0.333];
    const rng = () => seq[i++ % seq.length];
    i = 0; a.randomPoint(rng, margin, out);
    const drawsUsed = i;
    eq(`${tag} randomPoint draw count m=${margin}`, drawsUsed, 2);
    eq(`${tag} randomPoint x m=${margin}`, out.x, (seq[0] * 2 - 1) * (hx - margin));
    eq(`${tag} randomPoint z m=${margin}`, out.z, (seq[1] * 2 - 1) * (hz - margin));
  }

  // update() is a no-op for a rectangle and must not move the box.
  a.update(12.5);
  eq(`${tag} update leaves halfX`, a.halfX, hx);
  eq(`${tag} update leaves halfZ`, a.halfZ, hz);
}

// ── The shapes P0 does not wire up, but P1 will ────────────────────────────
// Not "nothing changes" checks — these prove the algebra is right, so P1 is a
// level file rather than a debugging session.
{
  const c = new Arena(circleShape(0, 0, 7));
  eq('circle sdf centre', c.sdf(0, 0), -7);
  eq('circle sdf edge', c.sdf(7, 0), 0);
  eq('circle aabb', c.halfX, 7);

  // The owner's worked example: three overlapping circles, their COMMON area.
  const tri = new Arena(intersectShape(
    circleShape(-3, 0, 8), circleShape(3, 0, 8), circleShape(0, 3, 8)));
  eq('intersect kind', tri.shape.kind, KIND.INTERSECT);
  ok('intersect: centre is inside', tri.sdf(0, 0) < 0);
  ok('intersect: x=9 is outside (union would say inside)', tri.sdf(9, 0) > 0);
  const uni = new Arena(unionShape(
    circleShape(-3, 0, 8), circleShape(3, 0, 8), circleShape(0, 3, 8)));
  ok('union: x=9 is inside', uni.sdf(9, 0) < 0);

  // clamp with no closed form falls back to the gradient march, and must land
  // a point that actually fits.
  tri.clamp(40, 40, 0, out);
  ok('intersect clamp lands inside', tri.sdf(out.x, out.z) <= 1e-2);
  tri.clamp(0, 0, 0, out);
  eq('intersect clamp leaves an inside point alone x', out.x, 0);
  eq('intersect clamp leaves an inside point alone z', out.z, 0);

  // rayEdge by sphere-trace: two circles at ±3 radius 8 meet the +x axis at 5.
  const lens = new Arena(intersectShape(circleShape(-3, 0, 8), circleShape(3, 0, 8)));
  ok('lens rayEdge ≈ 5', Math.abs(lens.rayEdge(0, 0, 1, 0, 0) - 5) < 0.01);

  // Determinism rule 1 holds for non-rectangles too: still exactly two draws.
  let n = 0;
  tri.randomPoint(() => { n++; return 0.9; }, 1, out);
  eq('non-rect randomPoint draw count', n, 2);
  ok('non-rect randomPoint lands inside', tri.sdf(out.x, out.z) <= 1e-2);

  // ringPoint on a general shape is a ray-march, and must land on the edge.
  lens.ringPoint(0, 1, out);
  ok('lens ringPoint ≈ edge', Math.abs(out.x - 5) < 0.01 && Math.abs(out.z) < 1e-9);
}

console.log(`${checks - fails}/${checks} arena checks passed`);
if (fails) { console.error(`✘ ${fails} FAILED`); process.exit(1); }
console.log('✔ the rectangle survives being an SDF');
