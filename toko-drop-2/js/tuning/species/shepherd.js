// shepherd.js — SHEPHERD: its numbers. The 1.x CFG row (1.x enemy.js:624),
// melee flag (1.x main.js:2410-2421: not in MELEE_TYPES), movement role (1.x
// tuning.js:297, 314), revenge dialect (1.x tuning.js:496-497: not a biter),
// then the conductor's own numbers (v203): the herd it lays on the others
// (main.js:10233-10260, SHEPHERD_RADIUS enemy.js:569-571), the pocket it
// holds and circles in (enemy.js:1769-1791), its non-blob squash spring
// (enemy.js:2726-2737, 2779) and the look's numbers — the slim hexagonal
// spire (enemy.js:783-787, 811-817, 1000) and the herd ring (enemy.js:
// 1134-1147, 1787-1789, 3009). Specs: docs/port-1x/species-a.md §2.3,
// species-b.md (the swarm forces), arcade-mode.md §2.5.1 (the pool:
// SHEPHERD [4, 4]). Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'SHEPHERD',
  family: 'custom',        // its own body: a slim tapered spire, ConeGeometry(0.75 r, 2.6 r, 6) (1.x enemy.js:783-787);
                           // render/looks/shepherd.js builds it. Not a 1.x BLOB_TYPE or CUBE_TYPE (enemy.js:644-657), so
                           // its death chunks are 1.x's smooth goo (main.js:2616-2618 `chunksFor`: goo unless a cube)
  // the kill sound: 1.x's voice for every body that is not a blob, TORO, BAMBU or PYRA is the cube's square-wave
  // pop (main.js:4476-4481 — main.js's own BLOB_TYPES, 2422-2424, has no SHEPHERD — and audio.js:243-249); the
  // view voices family 'cube' only, so a custom body names it here (audio.js reads `deathSound`)
  deathSound: { wave: 'square', f0: 380, f1: 55, dur: 0.18, vol: 0.22, noiseVol: 0.09, noiseDur: 0.13 },
  radius: 0.6,             // 1.x enemy.js:624 ("fragile, slow, keeps its distance", enemy.js:622-623)
  hp: 3,                   // 1.x enemy.js:624
  speed: 1.6,              // u/s × the wave's speedMult, × a SIREN's surge (1.x enemy.js:624, 1699-1700)
  color: 0x66ffcc,         // 1.x enemy.js:624
  bulletColor: null,
  fireInterval: null,      // it never attacks: no gun, no _tick branch (1.x enemy.js:557-559, 624, 2788-2790)
  contact: false,          // "Never touches you" (enemy.js:558): not in MELEE_TYPES, harmless to touch (main.js:2410-2421)
  role: 'HERDER',          // swarm-force profile: dodge 0.6, flock 0, current 0.3, weave 0.2 (1.x tuning.js:297, 314)
  revenge: null,           // not a biter (1.x tuning.js:496-497): its corpse never fires back

  // ── the herd (v203, 1.x main.js:10233-10260; read by sim/crowd.js) ──
  // Every OTHER living, non-boss body whose centre is within `radius` of a
  // living SHEPHERD (d² ≤ 7.5²) moves `speed` u/s straight at the hero while it
  // is farther than `stopAt` from you — one shepherd's pull; they don't stack.
  // 2.8 is "matched to GLOBBO's own speed" (main.js:10250-10254).
  herd: { radius: 7.5, speed: 2.8, stopAt: 1.2 },   // SHEPHERD_RADIUS (enemy.js:571); main.js:10246, 10249, 10255-10256

  // ── the pocket (1.x enemy.js:1769-1791) ──
  // It "never attacks and never closes": it holds `distance` from you. Farther
  // than distance + band it closes in at its speed; nearer than distance −
  // band it backs straight off at speed × backOff ("it's not a body"); in the
  // pocket between it circles you at speed × circle, always the same way
  // round — along (−dz, dx)/d of the line to you — "conducting".
  hold: {
    distance: 9,           // enemy.js:1774 `const hold = 9`
    band: 1,               // enemy.js:1775, 1778 `hold + 1`, `hold − 1` (strictly: > 10 closes, < 8 backs off)
    backOff: 1.15,         // enemy.js:1779-1780 `spd * 1.15`
    circle: 0.8,           // enemy.js:1782-1783 `spd * 0.8`
  },
  distFloor: 0.001,        // 1.x's guard on a zero distance: hypot(...) || 0.001 (enemy.js:1682)
  spin: 2.2,               // rad/s about y, for show — "spinning conductor's baton" (enemy.js:1785)

  // 1.x's squash spring for every non-blob body, per 60 Hz frame (1.x enemy.js:2728-2731): spring, damp, held
  // to 0.55..1.55. The core picks its spring by family (a `custom` body gets the blob 0.24/0.86), so the
  // behaviour runs this one in its place, after the movement, as 1.x did (OMEGA's and TORO's ports do the same).
  squash: { spring: 0.18, damp: 0.90, min: 0.55, max: 1.55 },

  // ── the look (render/looks/shepherd.js) ──
  look: {
    // the spire: ConeGeometry(radius × 0.75, radius × 2.6, 6) — a hexagonal cone 0.45 across and 1.56 tall
    // at the CFG radius, "a CONDUCTOR, not a body to bump into. Nothing else in the roster is tall-and-thin"
    // (enemy.js:783-787). An elite is the same cone × 1.2 (main.js:9406; the spring keeps rm, enemy.js:2737, 2779).
    coneRadius: 0.75,      // × the CFG radius (enemy.js:786)
    coneHeight: 2.6,       // × the CFG radius (enemy.js:786)
    coneSegments: 6,       // radial segments (enemy.js:786); three's defaults for the rest (one height segment, capped)
    // its centre stands at the CFG radius, elite or not (enemy.js:1000 `position.set(x, cfg.radius, z)`), so the
    // 1.56 cone reaches 0.18 into the floor (an elite's 1.872, 0.336)
    // the material: 1.x's satin, family `omega` (enemy.js:811-817 — every specialist that is not TORO, the
    // arc-movers or a TOKOTRON box): roughness 0.04, transmission 0.40 (1.x tuning.js:32), uWobble 0.35 (every
    // non-blob family, enemy.js:323), uRadius the CFG 0.6 (enemy.js:817). No hit ripple and no death thrash:
    // 1.x writes uHit and uTear for BLOB_TYPES only (enemy.js:1609-1612, 2704-2708, 2986-2990)
    roughness: 0.04, transmission: 0.40, wobble: 0.35,
    sqFloor: 0.1,          // the spring's width is 1/√max(sq, 0.1) (enemy.js:2732)
    // the herd ring (v203): "the herd ring IS the tell — everything inside it is being dragged toward you.
    // Faint by design (it's a big circle), and it pulses with the pull" (enemy.js:1134-1136). A flat ring,
    // RingGeometry(SHEPHERD_RADIUS − 0.14, SHEPHERD_RADIUS, 64), MeshBasicMaterial additive, depthWrite off,
    // DoubleSide, laid flat (rotation.x −π/2) at y 0.05, following the body; its outer edge is `herd.radius`, so
    // the rule and the tell can't drift (enemy.js:569-571). Opacity 0.16 + 0.10·sin(4·clock + phase) on the
    // body's own clock (enemy.js:1788); it does not grow with an elite; hidden the instant it dies (enemy.js:3009).
    ring: {
      width: 0.14,         // enemy.js:1139
      segments: 64,        // enemy.js:1139
      color: 0x66ffcc,     // enemy.js:1141
      opacity0: 0.18,      // its opacity as built, before the first pulse (enemy.js:1141)
      y: 0.05,             // enemy.js:1145, 1787
      base: 0.16, amp: 0.10, hz: 4.0,   // enemy.js:1788
    },
  },
};
