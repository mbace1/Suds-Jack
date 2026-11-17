// draper.js — DRAPER: its numbers. The 1.x CFG row (1.x enemy.js:619), melee
// flag (1.x main.js:2410-2421: not in MELEE_TYPES), movement role (1.x
// tuning.js:292, 313), revenge dialect (1.x tuning.js:496-497, 511: a biter,
// FAN), then the wall-weaver's own numbers (v171): the range it holds, the
// weave clock, the wind-up and the curtain it looms (enemy.js:2200-2232), its
// non-blob squash spring (enemy.js:2726-2737, 2779) and the look's numbers —
// the loom slab (enemy.js:771-772, 811-817, 1000) and its glowing end-spools
// (enemy.js:1097-1105, 2213). Specs: docs/port-1x/bullets-graze.md §3.2, §5.5
// (the DRAPER rows), arcade-mode.md §2.5.1 (the pool: DRAPER [7, 5], a
// shooter), revenge-hardcade.md §2.1. Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'DRAPER',
  family: 'custom',        // its own body: a loom slab, BoxGeometry(1.5, 0.9, 0.4) with two end-spools (1.x enemy.js:771-772,
                           // 1097-1105); render/looks/draper.js builds it. Not a 1.x BLOB_TYPE or CUBE_TYPE (enemy.js:644-657),
                           // so its death chunks are 1.x's smooth goo (main.js:2425-2428, 2616-2618 `chunksFor`: goo unless a cube)
  // the kill sound: 1.x's voice for every body that is not a blob, BOTFLY, TORO, BAMBU or PYRA is the cube's square-wave
  // pop (main.js:4476-4480 — main.js's own BLOB_TYPES, 2422-2424, has no DRAPER — and audio.js:243-249); the view
  // voices family 'cube' only, so a custom body names it here (audio.js reads `deathSound`)
  deathSound: { wave: 'square', f0: 380, f1: 55, dur: 0.18, vol: 0.22, noiseVol: 0.09, noiseDur: 0.13 },
  radius: 0.8,             // 1.x enemy.js:619; also its hit circle (main.js:10643-10651: not a long body, so the head circle)
  hp: 5,                   // 1.x enemy.js:619
  speed: 0.9,              // u/s × the wave's speedMult, × SWIFT, × a SIREN's surge (1.x enemy.js:619, 1699-1700; main.js:9415-9416)
  color: 0x9955ff,         // 1.x enemy.js:619
  bulletColor: 0xcc88ff,   // 1.x enemy.js:619, 2223
  fireInterval: 5.0,       // 1.x enemy.js:619: the weave clock's reload after a curtain, × intervalMult (enemy.js:2225). Its
                           // _tick has no DRAPER case (enemy.js:2873-2958), so the curtain is the only gun it has
  contact: false,          // not in MELEE_TYPES (1.x main.js:2410-2421): harmless to touch in classic
  role: 'HOLDER',          // swarm-force profile: dodge 0, flock 0, current 0.25, weave 0 (1.x tuning.js:292, 313)
  revenge: 'FAN',          // HARDCADE's corpse fire: 5 slow bullets 0.5 rad apart (1.x tuning.js:496-497, 511, 515). It is
                           // one of 1.x's ten biters; CLOSE COMBAT filtered it out of the draw (main.js:199), so its bite
                           // never fired in a shipped run (revenge-hardcade.md §2.4); 2.0's HARDCADE is classic + corpse fire

  // ── the range it holds (1.x enemy.js:2204-2207) ─────────────────────
  // "holds ~11 units, faces you (the loom IS the tell)". Farther than
  // distance + band (strictly) it walks straight at you at its speed; nearer
  // than distance − band (strictly) it backs straight off at the same speed;
  // in between it stands. Every step it turns its broad face square to you.
  hold: {
    distance: 11,          // enemy.js:2204 `const wantD = 11`
    band: 1.5,             // enemy.js:2205-2206 `wantD + 1.5`, `wantD - 1.5`
  },
  distFloor: 0.001,        // 1.x's guard on a zero distance: hypot(...) || 0.001 (enemy.js:1682)

  // ── the weave clock and the wind-up (1.x enemy.js:2208-2229) ─────────
  // The weave clock runs only while it is not winding up. The first curtain's
  // clock is drawn on its first update, U(2, 4) s; after every curtain it is
  // fireInterval × intervalMult again (5.0 s at wave 1). When it has run out
  // AND you are within `range` (strictly, at the top of its update) the
  // wind-up starts; a clock that ran out with you farther than that waits
  // (keeps running negative) and the wind-up starts the first step you come
  // inside. The wind-up then runs its whole `windup` wherever you go, and the
  // curtain looms the step it runs out, aimed where you are THEN. At 60 Hz:
  // the wind-up is 54 steps, a 5.0 s reload 301, so curtain to curtain is
  // 355 steps (5.92 s) — "Cadence ~5 s" (enemy.js:2203) plus the wind-up.
  weaveFirst: [2, 4],      // enemy.js:2208 `2.0 + Math.random() * 2`
  range: 17,               // enemy.js:2229 `dist < 17`
  windup: 0.9,             // enemy.js:2229 `this._windup = 0.9` (and 2202 "strobes 0.9 s")
  spoolSpin: 18,           // rad/s the spools tumble about their x while it winds up (enemy.js:2213 `rotation.x += dt * 18`),
                           // the curtain's step included; they hold their angle after. The sim keeps the angle (s.spool) for
                           // the look: it is the tell 1.x actually showed (the strobe below never reached the screen)

  // ── the curtain (1.x enemy.js:2214-2225) ─────────────────────────────
  // From where it stood at the top of the step (ex, ez — enemy.js:1678-1680),
  // `slots` places `spacing` apart across the line square to the aim
  // (lateral (−fz, fx)), centred on the body: offset (k − 7) × 0.85, ±5.95 at
  // the ends. Slots gap and gap + 1 are left empty — the way through — with
  // gap ∈ [2, 12] (so never an end slot or its neighbour). 13 bullets, all
  // marching along the aim (fx, fz) at 7 × 0.72 = 5.04 u/s for 1.x's 4 s.
  curtain: {
    slots: 15,             // enemy.js:2219 `k2 < 15`
    centre: 7,             // enemy.js:2221 `(k2 - 7)`: slot 7 stands on the body's own line
    spacing: 0.85,         // enemy.js:2221 `o = (k2 - 7) * 0.85`
    gap: [2, 12],          // enemy.js:2218 `2 + Math.floor(Math.random() * 11)` — slots 2..12, inclusive
    gapWidth: 2,           // enemy.js:2220 `k2 === gap || k2 === gap + 1`
    speedMult: 0.72,       // enemy.js:2222-2223 spawnDir(…, false, 6, 0.72): not homing, × the base 7 u/s (bullet.js:94)
  },

  // ── the curtain's off-floor ends (1.x bullet.js:130-135, main.js:10428) ──
  // Loomed near a wall at a slant, a curtain's end slots stand past the wall.
  // 1.x culled a bullet only once it was past max(HALF_X, HALF_Z) + 2 on
  // either axis — one square box, ±21 in landscape, ±20 in portrait — so
  // those ends marched on off the floor and came back onto it as part of the
  // wall. 2.0's core culls per axis at the walls + 1.5 (2.0 js/sim/world.js
  // bulletsStep: HX = w.hx + 1.5), which deleted them on their first step:
  // with the hero wandering, about one curtain in fifteen lost an end slot,
  // and about a third of the bullets lost so 1.x marched back onto the floor
  // (40 seeds × 2 min of a random walk: 771 curtains, 113 lost, 41). So the
  // behaviour carries such a bullet itself, moved and aged exactly as 1.x's
  // bullets.update did (bullet.js:130-135), and hands it to the core the step
  // it crosses into the core's box. Out there it can neither hit nor be
  // grazed (the hero is held 0.5 inside the walls and the bullet is past
  // walls + 1.5: hit 0.65, graze 1.2), so all that changes is that it is not
  // drawn off the floor. A DRAPER killed while it carries some takes them
  // with it (2.0 has no owner for a bullet that is not yet on the floor).
  cull: {
    square: 2,             // 1.x bullet.js:134 `Math.abs(p.x) > halfSize + 2 || Math.abs(p.z) > halfSize + 2`, with
                           // halfSize = Math.max(HALF_X, HALF_Z) (main.js:10428)
    core: 1.5,             // NOT a 1.x number: 2.0's own keep box past each wall (2.0 js/sim/world.js bulletsStep). If the
                           // core's margin grows, a carried bullet only shows up later (still out of reach); if it shrinks,
                           // the bullets in between are lost to the cull, as every one of them was before
  },

  // 1.x's squash spring for every non-blob body, per 60 Hz frame (1.x enemy.js:2728-2731): spring, damp, held
  // to 0.55..1.55. The core picks its spring by family (a `custom` body gets the blob 0.24/0.86), so the
  // behaviour runs this one in its place, after the movement, as 1.x did (SHEPHERD's, OMEGA's and TORO's ports
  // do the same). Nothing in its own life kicks it: only a hit's −0.75 (enemy.js:1607) and a big death's shock.
  squash: { spring: 0.18, damp: 0.90, min: 0.55, max: 1.55 },

  // ── the look (render/looks/draper.js) ──────────────────────────────
  look: {
    // the material: 1.x's satin, family `omega` (enemy.js:811-817 — every specialist that is not TORO, the
    // arc-movers or a TOKOTRON box): roughness 0.04, transmission 0.40 (1.x tuning.js:32), uWobble 0.35 (every
    // non-blob family, enemy.js:323), uRadius the CFG 0.8 (enemy.js:817). No hit ripple and no death thrash:
    // 1.x writes uHit and uTear for BLOB_TYPES only (enemy.js:1609-1612, 2704-2708, 2986-2990)
    roughness: 0.04, transmission: 0.40, wobble: 0.35,
    sqFloor: 0.1,          // the spring's width is 1/√max(sq, 0.1) (enemy.js:2732)
    // the loom: BoxGeometry(1.5, 0.9, 0.4), one segment a side (enemy.js:772), its centre at the CFG radius
    // (enemy.js:1000 `position.set(x, cfg.radius, z)`), so the slab hangs 0.35 off the floor; its broad face turned
    // to you every step (enemy.js:2207 `rotation.y = atan2(ddx, ddz)`: local +z at you). An elite is the same
    // slab × 1.2 about the same centre (main.js:9406; the spring keeps rm, enemy.js:2737, 2779)
    loom: { width: 1.5, height: 0.9, depth: 0.4 },
    // the spools: "glowing end-spools — the curtain visibly comes off the loom" — two upright
    // CylinderGeometry(0.14, 0.14, 1.0, 8) in unlit MeshBasicMaterial 0xcc88ff, children of the loom at local
    // (±0.78, 0, 0), so they turn, squash and swell with it (enemy.js:1097-1105)
    spool: { radius: 0.14, height: 1.0, segments: 8, x: 0.78, color: 0xcc88ff },
    // the body strobe 1.x WROTE through the wind-up: emissive 0x5522aa / 0x110022 on sin(_wobbleT × 22)
    // (enemy.js:2212). 1.x never SHOWED it: the emissive chain after the movement switch has no DRAPER case,
    // so its last branch writes black over it the same frame (enemy.js:2649-2690, the `else` at 2688-2689 —
    // already so at v171). Off, as 1.x played; `on: true` draws what the code says (the hit flash and a
    // VOLATILE fuse still outrank it, as in 1.x's chain)
    strobe: { on: false, colors: [0x5522aa, 0x110022], rate: 22 },
    // the death pop: 1.x's destroy() sets the mesh to _deathBaseScale(), which is 1 for every non-blob body (an
    // elite too), then updateDeath() swells it × (1 + 1.3t) about the slab's own centre, its face and spools
    // where they were (1.x enemy.js:1482-1484, 3013-3027; the 1.3 and 0.28 s are the core's)
    death: { base: 1 },
  },
};
