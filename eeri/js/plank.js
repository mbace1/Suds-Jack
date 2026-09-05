// EERI — the plank: World 2's own gizmo (DESIGN.md "Gizmo the world owns:
// the tipping plank over a trench").
//
// It has no held verb and no cycle to read, unlike every other gizmo in
// this game (a hoist runs a period, a dig is a held button) — it answers
// WEIGHT. A rigid beam pivots at its own centre; standing anywhere but
// dead centre sinks that side and lifts the other. Crossing is one
// committed walk through the tip, not a timed jump or a button held at a
// target — the newest of the "no aiming, no hold" family this game keeps
// building (the flattener is the other one).
//
// THE CONTRACT is `js/hoist.js`'s own (`js/level.js`'s `platforms` array,
// `top(x)` / `overlaps(x, hw)`), generalised the one way a hoist never
// needed: a hoist's deck is flat, so `top()` never looked at `x`. A
// tipped plank's deck genuinely is not flat, so `top(x)` is where that
// generalisation actually earns its keep.
//
// WHO DRIVES THE TILT. Not this file — main.js's own per-frame loop calls
// `update(dt, riderX, riderHw)` the same way it drives every other
// cross-entity interaction (THE DIG, THE GIRDER, THE FLATTEN), because a
// plank that reached into Player to read its own rider would be the one
// entity in this codebase that knows about the thing riding it, and
// every other one is deliberately ignorant of that.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=59';
import { craftMat, craftBox } from './craft.js?v=59';
import { PLANK_DROP } from './parts.js?v=59';

export function buildPlankModel(width = 6) {
  const root = new THREE.Group();
  const M = (c) => craftMat(c, 'balsa');

  // the deck: one board, its own grain reading as a scored top rather than
  // a flat plate the way a hoist's steel deck reads
  const deck = craftBox(width, 0.22, 1.5, M(PAL.EARTH[2]));
  deck.position.y = -0.11; root.add(deck);
  for (let x = -width / 2 + 0.6; x < width / 2; x += 0.9) {
    const seam = craftBox(0.06, 0.05, 1.5, M(mix(PAL.EARTH[2], PAL.INK, 0.35)));
    seam.position.set(x, 0, 0); root.add(seam);
  }
  const underside = craftBox(width, 0.1, 1.3, M(PAL.EARTH[0]));
  underside.position.y = -0.27; root.add(underside);

  // the pivot: a stub of the fulcrum it turns on, so the mechanism reads
  // even though the board itself is the only thing that actually rotates
  const pivot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.32, 1.3, 8),
    M(PAL.STEEL[0]),
  );
  pivot.rotation.x = Math.PI / 2; pivot.position.y = -0.4;
  root.add(pivot);

  // end caps — a plain board has no silhouette to tell its length from a
  // painted tile floor, and the caps are what a six-year-old's eye reads
  // as "this is a thing, not the ground"
  for (const ex of [-width / 2 + 0.1, width / 2 - 0.1]) {
    const cap = craftBox(0.2, 0.3, 1.56, M(PAL.MACHINE));
    cap.position.set(ex, -0.05, 0); root.add(cap);
  }

  return { root };
}

export class Plank {
  // `def` is the part's own record: { c0, c1, cy0 }
  constructor(scene, level, def) {
    this.level = level;
    this.c0 = def.c0; this.c1 = def.c1;
    this.cy0 = def.cy0;

    this.hw = (def.c1 - def.c0 + 1) / 2;
    this.x = (def.c0 + def.c1 + 1) / 2;
    this.tilt = 0;      // -1 (left end down) … +1 (right end down)

    this.group = new THREE.Group();
    this.group.add(buildPlankModel(def.c1 - def.c0 + 1).root);
    scene.add(this.group);

    this.sync();
  }

  // the surface height at world column `x` — the whole reason `top()`
  // takes an argument. Linear across the board, clamped to its own ends,
  // matching a rigid beam rather than a rope.
  top(x) {
    const dx = Math.max(-this.hw, Math.min(this.hw, x - this.x));
    return this.cy0 - this.tilt * PLANK_DROP * (dx / this.hw);
  }

  overlaps(x, hw) { return Math.abs(x - this.x) < this.hw + hw; }

  // called from main.js's own loop, once a frame, in every mode — the
  // same reason hoists animate while you are in a cab: a plank that froze
  // the instant you drove past it on the flattener would settle to a
  // different tilt than the one you left it at, and arrive back on foot
  // having silently moved under nobody.
  update(dt, riderX, riderHw, reduced = false) {
    const riding = riderX != null && this.overlaps(riderX, riderHw ?? 0);
    // target: the rider's own offset across the half-width, so standing at
    // an END asks for the full tip and standing at CENTRE asks for level —
    // the board is asked to do exactly what your weight is doing.
    const target = riding
      ? Math.max(-1, Math.min(1, (riderX - this.x) / this.hw))
      : 0;
    if (reduced) {
      this.tilt = target;                 // no settle to watch, just be there
    } else {
      this.tilt += (target - this.tilt) * Math.min(1, 6 * dt);
    }
    this.sync();
  }

  sync() {
    this.group.position.set(this.x, this.cy0, 0);
    // the visual board is drawn along its OWN local x from -hw to +hw at
    // y=0 (see buildPlankModel), so a single Z rotation about the group's
    // own centre is the whole animation — no per-vertex work, same trick
    // the excavator's boom uses for its own joint.
    this.group.rotation.z = -Math.atan2(this.tilt * PLANK_DROP, this.hw);
  }
}
