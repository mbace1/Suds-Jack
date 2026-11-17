// omega.js — OMEGA: its numbers. The 1.x CFG row (1.x enemy.js:593), melee
// flag (1.x main.js:2410-2421: a boss is NOT in MELEE_TYPES), movement role
// (1.x tuning.js:306), revenge dialect (1.x tuning.js:496-513), and everything
// its port reads: the three-act boss by hp (enemy.js:1683-1700), the orbit,
// the spin and the three volleys (enemy.js:2399-2445, 2961-2966), the strobes
// it wears (enemy.js:2666-2672), the boss rules main.js lays on it at spawn
// (main.js:9382-9391), the aura main.js draws under every boss
// (main.js:1967-1982, 10569-10584) and the look's numbers (the faceted
// crystal, enemy.js:741-745, 816, 993-1001; its satin family, tuning.js:32).
// Specs: docs/port-1x/arcade-mode.md §5.2-§5.3, bullets-graze.md §5.5.
// Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'OMEGA',
  deathLabel: 'Omega boss', // the death screen's name for it (1.x main.js:5041)
  family: 'custom',        // its own body: a faceted crystal, IcosahedronGeometry(radius, 0) (1.x enemy.js:741-745);
                           // render/looks/omega.js builds it. Its death chunks are 1.x's smooth goo (main.js:2617)
  // the kill sound: 1.x's voice for every body that is not a blob, TORO, BAMBU or PYRA is the cube's square-wave
  // pop (main.js:4476-4481, audio.js:243-249); the view voices family 'cube' only, so a custom body names it here
  deathSound: { wave: 'square', f0: 380, f1: 55, dur: 0.18, vol: 0.22, noiseVol: 0.09, noiseDur: 0.13 },
  radius: 0.95,            // 1.x enemy.js:593; as a boss × 1.5 → 1.425 (main.js:9389, the core's variants.boss)
  hp: 5,                   // 1.x enemy.js:593 — the CFG hp; a boss spawns with `bossHp` below
  speed: 1.3,              // u/s × the wave's speedMult (1.x enemy.js:593, 1699-1700)
  color: 0x00eeff,         // cyan crystal (1.x enemy.js:593)
  bulletColor: 0x66f2ff,   // 1.x enemy.js:593
  fireInterval: null,      // 1.x enemy.js:593: it fires from its movement branch, on its own clock (_omegaFireT)
  contact: false,          // a boss has no contact damage in classic (1.x MELEE_TYPES, main.js:2410-2421)
  role: 'MASS',            // swarm-force profile (1.x tuning.js:306) — moot: the core's swarm forces skip a boss
  revenge: null,           // not a biter by species; as a BOSS its corpse fires the RING anyway (core world.js revenge,
                           // 1.x main.js:4390-4420, arcade-mode.md §5.2)

  // ── the boss (1.x main.js:9382-9391; enemy.js:1467, 1683-1700) ──
  bossHp: 15,              // ceil(5 × 3): the classic boss multiplier (main.js:9384-9385; the gauntlet's 5 is cabinet-only)
  phases: { p2: 0.66, p3: 0.33 },   // phase 2 at hp/maxHp ≤ 0.66, phase 3 at ≤ 0.33 — only ever up (enemy.js:1689-1693)
  enrageSpeed: 1.45,       // phase 3 is `_enraged`: the speed × 1.45 (enemy.js:1696, 1699-1700)
  phaseFlash: 0.5,         // s of gold/orange strobe at a phase change (enemy.js:1693, 2666-2669); its clock holds
                           // while the hit flash is on — the strobes are one if/else chain (enemy.js:2650-2669) —
                           // and a frame wears the pop when the clock is > 0 BEFORE that frame's countdown (2666-2667)
  // the phase change as main.js announced it (main.js:10398-10407): "BOSS PHASE N!" for 1.1 s, addShake(0.3),
  // audio.phaseShift() and the announcer's 'phase'. The event carries `label` and `dur`, as PRISM's rage does
  phaseLabel: 'BOSS PHASE', // the popup reads `BOSS PHASE ${e._bossPhase}!` (main.js:10403)
  phasePopup: 1.1,
  phaseShake: 0.3,
  firstFire: [1.2, 0.6],   // the first volley 1.2 + U(0, 0.6) s after it arrives (enemy.js:1229)

  // ── the orbit (1.x enemy.js:2404-2416) ──
  orbit: {
    want: { p1: 7.5, p2: 6.2 },   // the preferred distance from the hero, by phase (enemy.js:2405)
    band: 1.5,             // inside want ± 1.5 the radial component is 0 (enemy.js:2408)
    radial: 0.5,           // ±0.5 of the speed in or out, beyond the band (enemy.js:2409-2410)
    tangent: 1,            // 1 of the speed round the hero, in `_orbitSign` (random ±1 at spawn, enemy.js:702)
  },
  phase2Speed: 1.18,       // phase 2 presses closer at × 1.18 (enemy.js:2406)
  // the walls: 1.x clamps the crystal by its CFG radius (enemy.js:2414 `arena.clamp(x, z, cfg.radius)`); the core
  // clamps by the body's radius (1.425 as a boss), so it keeps 0.475 further off the wall than 1.x did
  spin: { y: 0.6, x: 0.25 },   // rad/s about y and x, for show only (enemy.js:2419-2420); three's Euler XYZ

  // ── the three volleys, each at the enemy bullet speed (7 u/s), from the body's centre, in bulletColor ──
  // the clock is ASSIGNED (`_omegaFireT = period × intervalMult`), so a period is whole 60 Hz steps, as in 1.x
  fan:    { period: 0.9,  count: 5,  span: Math.PI * 0.35 },  // phase 1: an aimed 5-fan over 0.35π, endpoints in (enemy.js:2434-2441)
  spiral: { period: 0.24, step: 0.55, arms: 2 },             // phase 2: two opposite bullets, the angle + 0.55 a volley from a random
                                                             // start (enemy.js:2427-2433 — `_spiralA ?? random` then + 0.55, so the first pair is at θ₀ + 0.55).
                                                             // 1.x's gels fire silently; its `gelShot` carries `spiral` so 2.0's tick stays off
                                                             // for a pair every 0.24 s, as a WEEVA's spiral does
  ring:   { period: 0.7,  count: 12, base: 0 },              // phase 3: a 12-ring from angle 0 (enemy.js:2422-2425, 2961-2966)
  tellWindow: 0.25,        // the body strobes in its phase's colour for the last 0.25 s before a volley (enemy.js:2670)

  // 1.x's squash spring for every non-blob body, per 60 Hz frame (1.x enemy.js:2728-2730): spring, damp, held to
  // 0.55..1.55. The core picks its spring by family (blob 0.24/0.86), so the behaviour runs this one in its place.
  squash: { spring: 0.18, damp: 0.90, min: 0.55, max: 1.55 },

  // ── the look (render/looks/omega.js) ──
  look: {
    // the material: 1.x's satin, family `omega` — "boss keeps a hard crystal read": roughness 0.04, transmission 0.40
    // (1.x tuning.js:32); uWobble 0.35 (every non-blob family, enemy.js:323), uRadius the CFG 0.95 (enemy.js:816).
    // No hit ripple and no death thrash: 1.x writes uHit and uTear for BLOB_TYPES only (enemy.js:2704-2708, 2988-2990)
    roughness: 0.04, transmission: 0.40, wobble: 0.35,
    detail: 0,             // IcosahedronGeometry(radius, 0): twenty flat faces (enemy.js:745)
    // the crystal's centre stands at the CFG radius, boss or not (enemy.js:1001 `position.set(x, cfg.radius, z)`;
    // only x and z move, enemy.js:2409-2416), and the squash spring scales the mesh itself — (sx × rm, sq × rm,
    // sx × rm) in its own spinning frame, three's T·R·S (enemy.js:2733-2736, 2760) — so a boss crystal sits 0.475
    // into the floor, as 1.x's did
    sqFloor: 0.1,          // the across-scale is 1/√max(sq, 0.1) (1.x enemy.js:2733)
    // the death pop (1.x destroy + updateDeath, enemy.js:2968-2984, 3013-3029): the squash resets, the crystal
    // swells to 2.3× about its centre (still at the CFG radius) and the spin stops (update() returns for the
    // dead, enemy.js:1673). 2.0's core times it (0.28 s, × 1 + 1.3t) and swells the view's root about the floor;
    // the look keeps the centre where 1.x kept it. (1.x's _deathBaseScale() is 1 for a non-blob, so a boss crystal
    // snapped back to its 0.95 size before it swelled — a bug its blobs were fixed for; it keeps its 1.5 here.)
    // the fire tell: for the last 0.25 s of the clock the emissive strobes its phase's colour / black on
    // sin(now_ms × 0.03) > 0 — 30 rad/s (enemy.js:2670-2672). The hit flash outranks it (enemy.js:2650)
    tell: { p1: 0x0088aa, p2: 0x885500, p3: 0xaa2200, off: 0x000000, rate: 30 },   // off: the other half (enemy.js:2672)
    // the phase pop: half a second of 0xffee88 / 0xff5500 on sin(now_ms × 0.06) > 0 — 60 rad/s; it outranks the
    // fire tell and its clock runs only while no hit flash is on (enemy.js:2650, 2666-2669)
    phaseFlash: { a: 0xffee88, b: 0xff5500, rate: 60 },
    // the boss aura 1.x main.js hangs under every boss (main.js:1967-1982, 10569-10584): a flat ring at y 0.04,
    // outer radius 1.7 × the boss's radius, inner 0.82 of that, 40 segments, additive 0xffcc33 at 0.6 then
    // 0.45 + 0.3·sin(5t); red 0xff2200 and scaled 1.15 + 0.1·sin(20t) while enraged; gone when the boss dies
    aura: {
      outer: 1.7, inner: 0.82, segments: 40, y: 0.04,
      color: 0xffcc33, enraged: 0xff2200,
      opacity0: 0.6, opacity: { base: 0.45, amp: 0.3, rate: 5 },
      enragedScale: { base: 1.15, amp: 0.1, rate: 20 },
    },
  },
};
