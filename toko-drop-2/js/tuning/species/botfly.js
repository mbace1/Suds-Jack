// botfly.js — BOTFLY: its numbers. The 1.x CFG row (1.x enemy.js:594), melee
// flag (1.x main.js:2408-2420: not melee), movement role (1.x tuning.js:307),
// revenge dialect (1.x tuning.js:510), and everything its port reads: the
// flying bot of v88 that holds 8 ± 1.5 from you while it drifts round you in
// its own orbit sign (enemy.js:2280-2294, 1235), charges for 0.5 s
// (enemy.js:2682-2685) and launches ONE slow homing shot every 3.8 × iM s
// (enemy.js:2934-2946), steered every frame by 1.x's velocity lerp
// (bullet.js:121-129, 196-203); and the look: a low-poly satin sphere in the
// `omega` family hovering at 1.5 on two flapping translucent wings
// (enemy.js:745-746, 810-817, 1230-1247, 2288-2292).
// Spec: docs/port-1x/bullets-graze.md §2.4, §3.2, §5.1, §5.5. Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'BOTFLY',
  deathLabel: 'pink Botfly', // the death screen's name for it (1.x main.js:5042)
  family: 'custom',        // its own body: a SphereGeometry(0.5, 12, 9) hovering at 1.5, not a gel dome (1.x enemy.js:745-746,
                           // 1233-1234); render/looks/botfly.js builds it. Its death is a blob's: the sine pop (1.x main.js:4476
                           // `BLOB_TYPES.has(e.type) || e.type === BOTFLY ? 'blob'`, audio.js:243) and smooth goo chunks
                           // (main.js:2618: not a CUBE_TYPES_FX body) — which is what the core gives a non-cube family
  radius: 0.5,             // 1.x enemy.js:594; an elite × 1.2 → 0.6 (the core's variants.elite)
  hp: 2,                   // 1.x enemy.js:594; an elite ceil(2 × 2) = 4
  speed: 2.0,              // u/s × the wave's speedMult (1.x enemy.js:594, 1699-1700)
  color: 0xff55bb,         // pink (1.x enemy.js:594); above the contrast floor: no rim
  bulletColor: 0xff66ee,   // 1.x enemy.js:594
  fireInterval: 3.8,       // s, × the wave's intervalMult (1.x enemy.js:594, 2873)
  contact: false,          // touching it never hurts in classic (1.x MELEE_TYPES, main.js:2408-2420)
  role: 'HOLDER',          // swarm-force profile: the wave's current at 0.25, nothing else (1.x tuning.js:307)
  revenge: 'AIMED',        // HARDCADE's corpse fire: the tight aimed burst, NOT homing (1.x tuning.js:510; main.js:4410)

  // ── the hover-and-orbit (1.x enemy.js:2280-2287) ──
  // u = unit(hero − pos), perp = (−u.z, u.x); radial = d > hold + band ? 1 : d < hold − band ? −1 : 0
  // pos += (u·radial + perp·orbitSign·orbit)·speed·dt — not normalised, so outside the band it moves at
  // √(1 + 0.8²) = 1.28 × speed. 1.x writes the position (no wall clamp: only the crowd solver clamped it, and only
  // when it nudged it — species-a.md §1.1); 2.0's core keeps every body inside the walls, so against one it slides.
  hold: 8,                 // the distance from the hero it keeps (1.x enemy.js:2283 `want = 8`)
  holdBand: 1.5,           // closes past hold + 1.5, backs off inside hold − 1.5 (1.x enemy.js:2285)
  radial: 1,               // the radial part's share of speed (1.x enemy.js:2286 `ddx / dist * radial`)
  orbit: 0.8,              // the tangential drift's share of speed, always on (1.x enemy.js:2286-2287 `perpX * _botOrbit * 0.8`)
  orbitNegative: 0.5,      // the orbit sign: −1 when U < 0.5, else +1, once at spawn (1.x enemy.js:1235)

  // ── the shot (1.x enemy.js:2784-2785, 2934-2946) ──
  // the clock counts `_t += dt` every frame after the move; at _t ≥ 3.8 × iM it is reset to 0 (not wound back, so
  // the period rounds up to a whole step) and one bullet leaves from where this frame's move put it (_tick re-reads
  // the position, enemy.js:2875), aimed at the hero NOW: (hero − pos) / (|hero − pos| || 1). Nothing gates it.
  fireStart: [0, 0.5],     // the clock starts at U(0, 0.5) s, desyncing a wave (1.x enemy.js:674): the first shot 3.3–3.8 s in
  shot: {
    speedMult: 0.62,       // × the gel bullet's 7 u/s → 4.34 u/s, a range of 17.4 in its 4 s (1.x enemy.js:2941; bullets-graze.md §3.2)
    // 1.x's homing (bullet.js:121-129, 196-203), every frame BEFORE the bullet integrates: t = unit(hero − b)·speed;
    // v += (t − v)·min(1, turnRate·dt). A velocity lerp, NOT a turn-rate cap: it closes 3% of the gap a step, so it
    // lags a moving hero (and slows while it turns: the speed is not renormalised) — "keeps it outrunnable"
    turnRate: 1.8,         // (1.x enemy.js:2941 `true, 1.8`)
    squash: -0.5,          // the launch kicks the squash spring: `_sqV −= 0.5`, after this frame's spring (1.x enemy.js:2942, 2728-2731)
  },
  // the charge-up: 1.x's emissive block (before this frame's tick) strobes while `_t ≥ 3.8 × iM − 0.5`
  chargeWindow: 0.5,       // s before the shot (1.x enemy.js:2682-2683)

  // 1.x's squash spring for every non-blob body, per 60 Hz frame (1.x enemy.js:2728-2731): spring, damp, held to
  // 0.55..1.55. The core picks its spring by family (a `custom` body gets the blob's 0.24/0.86), so the behaviour
  // runs this one in its place, as OMEGA's port does. A hit's −0.75 is the core's (enemy.js:1607).
  squashSpring: { spring: 0.18, damp: 0.90, min: 0.55, max: 1.55 },

  // the launch zip 1.x played for every shot (v108: main.js:10473-10479 → audio.botShot, audio.js:252-253):
  // triangle 380 → 1150 Hz over 0.16 s at 0.14 — "a warning you can hear". 2.0's audio voices `gelShot` with one
  // generic tick and reads no species' shot voice, so this is data for it to read (see the port's report)
  sound: { shot: { wave: 'triangle', f0: 380, f1: 1150, dur: 0.16, vol: 0.14 } },

  // ── the look (render/looks/botfly.js) ──
  look: {
    // the body: SphereGeometry(cfg.radius, 12, 9) — twelve around, nine down (1.x enemy.js:745-746), its centre the
    // mesh's origin. Its material is the specialists' satin in the `omega` family (enemy.js:810-817): roughness
    // 0.04, transmission 0.40 (1.x tuning.js:32 families.omega); uWobble 0.35 like every non-blob (enemy.js:323);
    // uRadius the CFG 0.5 (enemy.js:817). No hit ripple and no death thrash: 1.x writes uHitDir / uHit / uTear
    // for BLOB_TYPES only (enemy.js:1612, 2704, 2988)
    segments: [12, 9],
    gelFamily: 'omega',
    roughness: 0.04, transmission: 0.40, wobble: 0.35,
    // the hover: the centre at 1.5 + 0.22·sin(3·wobbleT + phase) (1.x enemy.js:1233-1234, 2288). 1.x's wobbleT
    // starts at U(0, 2π) and runs with the game (enemy.js:668, 2726), its phase U(0, 2π) (enemy.js:671); the view
    // runs the same curve on the render clock with its own random offsets. Only x and z are the body: hits, shots
    // and contact are all on the floor plane (the shot leaves at bullet height, under the hovering body)
    hover: { base: 1.5, amp: 0.22, rate: 3 },
    // the wings: two PlaneGeometry(0.62, 0.3) at (±(r + 0.18), 0.12, 0) in the sphere's own frame, so they squash
    // and grow with it (1.x enemy.js:1241-1245); MeshBasic 0xffaadd at 0.55, double-sided, no depth write
    // (enemy.js:1236-1239). They flap about their own centres, rotation.z = ±(0.45 + 0.5·sin(22·wobbleT)) — the
    // left (−x) wing +, the right − — so both droop at the tips by 0.45 rad, ±0.5 at 22 rad/s (≈ 3.5 Hz,
    // enemy.js:2290-2292). 1.x never turns the body: the wings always span x
    wing: {
      size: [0.62, 0.3], out: 0.18, y: 0.12,
      color: 0xffaadd, opacity: 0.55,
      flap: { base: 0.45, amp: 0.5, rate: 22 },
    },
    // the squash: 1.x scales the sphere itself (sx·rm, sq·rm, sx·rm) about its own centre (enemy.js:2732, 2779),
    // rm an elite's 1.2; the across-scale is 1/√max(sq, 0.1)
    sqFloor: 0.1,
    // the charge-up flicker: emissive 0x661144 / black on sin(now_ms × 0.025) > 0 — 25 rad/s (1.x enemy.js:2682-2685);
    // the hit flash and a VOLATILE fuse outrank it (enemy.js:2650-2656)
    charge: { on: 0x661144, off: 0x000000, rate: 25 },
    // the death pop (1.x destroy + updateDeath, enemy.js:3004-3033): the squash resets, the sphere swells to 2.3×
    // about its centre, which stays at the hover height it died at (update() returns for the dead, enemy.js:1673),
    // wings frozen mid-flap. 2.0's core times it and swells the view's root about the floor; the look holds the
    // centre where 1.x held it. (1.x's _deathBaseScale() is 1 for a non-blob, so an elite snapped back to the CFG
    // size before it swelled — a bug its blobs were fixed for; the elite keeps its 1.2 here, as OMEGA's boss does)
  },
};
