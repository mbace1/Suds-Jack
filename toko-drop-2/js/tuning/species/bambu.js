// bambu.js — BAMBU: its numbers. The 1.x CFG row (1.x enemy.js:591), melee
// flag (1.x main.js:2410-2420), movement role (1.x tuning.js:306), revenge
// dialect (1.x tuning.js:496-513), and everything its port reads: the stalk
// that emerges and grows (and REGROWS) in three segments, the telegraphed
// parabolic lob onto a flashing ring near you, and the look's numbers
// (1.x TUNING.bambu, tuning.js:83-91, plus the literals enemy.js writes
// inline). Spec: docs/port-1x/species-b.md §8, bullets-graze.md §5.2.
// Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'BAMBU',
  deathLabel: 'Bambu lobber', // the death screen's name for it (1.x main.js:5037)
  family: 'custom',        // its own family: a group-bodied tower (1.x GROUP_BODY, enemy.js:652); render/looks/bambu.js builds it
  radius: 0.7,             // CFG radius (1.x enemy.js:591): only the material's uRadius — the hitbox is the segments' (hitRadius below)
  hp: 1,                   // CFG hp, and the constructor's override (1.x enemy.js:591, 876): one segment, one hit
  speed: 0,                // 1.x enemy.js:591: it never walks (the wave's current still drifts it, role HOLDER)
  color: 0xaa8844,         // tan stalk (1.x enemy.js:591)
  bulletColor: 0xddbb44,   // the lob, its ring, the charge orb (1.x enemy.js:591, 892-893, 906-907, 916-917)
  fireInterval: 4.0,       // s × the wave's intervalMult, from a landing to the next telegraph (1.x enemy.js:591 = TUNING.bambu.lobCooldown, 2867)
  contact: false,          // its touch never hurts in classic (1.x MELEE_TYPES, main.js:2410-2420)
  role: 'HOLDER',          // swarm-force profile: the wave's current at 0.25 and nothing else (1.x tuning.js:306)
  revenge: 'FAN',          // HARDCADE's corpse fire: 5 slow bullets, ±1.0 rad (1.x tuning.js:511)
  noHpMult: true,          // elites and bosses never multiply its hp (1.x main.js:9385, 9403, 9408)

  // ── the stalk: emerge, grow, regrow (1.x enemy.js:873-886, 2537-2549) ──
  segments: 3,             // a full tower (1.x tuning.js:84 bambu.segments)
  segHeight: 0.6,          // each segment's height; a lob leaves from segments × 0.6 (1.x tuning.js:84, enemy.js:2846)
  emerge: 0.6,             // s to rise out of the floor, scale.y 0.01 → 1 (1.x enemy.js:880, 2538-2540)
  growEvery: 0.18,         // s between segments once emerged — and it keeps running, so a popped segment
                           // grows back the next step if the timer has run out (1.x enemy.js:886, 2543-2546)
  hitRadius: { min: 0.6, perSeg: 0.6 },   // the hitbox (and the crowd's radius): max(0.6, 0.6 × segments) = 0.6, 1.2, 1.8.
                           // Elite size multipliers never apply: the getter ignores _radiusMult (1.x enemy.js:1468-1470)

  // ── the lob (1.x enemy.js:2811-2868, landing main.js:10501-10520) ──
  firstLob: 1.3,           // s from its arrival to the first telegraph; it runs through the emergence (1.x enemy.js:884)
  lobTelegraph: 0.7,       // s of ring and climbing charge orb before the launch (1.x tuning.js:88)
  lobFlight: 1.0,          // s in the air, whatever the distance (1.x tuning.js:88, enemy.js:2857)
  lobArcHeight: 2.4,       // the arc term of 1.x's y = y0·(1 − p) + 2.4·4p(1 − p) (1.x tuning.js:88, enemy.js:2860)
  lobSpread: 1.2,          // the target: the hero's spot + U(−1.2, 1.2) on each axis, taken as the telegraph starts (1.x tuning.js:89, enemy.js:2823-2824)
  lobBlobRadius: 0.34,     // the blob in flight (1.x tuning.js:89, enemy.js:906)
  ring: { inner: 0.55, outer: 0.95 },     // the landing ring; the splash hurts within outer + the hero's 0.5 = 1.45 (1.x tuning.js:90, main.js:10517)

  // ── the look (render/looks/bambu.js) ──
  look: {
    // the material: 1.x's satin, family `bambu` — a matte woody stalk (1.x tuning.js:30) —
    // uWobble 0.35 (every non-blob family), uRadius the CFG 0.7 (1.x enemy.js:867)
    roughness: 0.20, transmission: 0.10, wobble: 0.35,
    // segment i: a cylinder flaring wider toward its top, botR 0.20 + 0.02 i, topR 0.36 + 0.03 i,
    // 14 sides, base at 0.6 i, capped by a node lip 1.14 × topR wide and 0.06 tall at 0.6 (i + 1)
    // (1.x tuning.js:85-87, enemy.js:1584-1601)
    flareBottom: 0.20, flareBottomStep: 0.02, flareTop: 0.36, flareTopStep: 0.03,
    lipScale: 1.14, lipHeight: 0.06, sides: 14,
    emergeFloor: 0.01,     // the stalk starts flat, scale.y 0.01 (1.x enemy.js:879)
    // idle: no squash spring (1.x enemy.js:2727); a breath and, while the shot climbs, a strain
    // (1.x enemy.js:2551-2557): scale (1 − br/2 + st/2, 1 + br − st, 1 − br/2 + st/2),
    // br = 0.05 sin(2.4 t + φ), st = 0.14 × the telegraph's progress
    breatheAmp: 0.05, breatheRate: 2.4, strain: 0.14, strainXZ: 0.5, breatheXZ: 0.5,
    // the charge orb, climbing the stalk through the telegraph: r 0.35 (10 × 8), opacity 0.9,
    // additive, no depth write, at y = p × segments × 0.6 and scale 0.6 + 0.9 p (1.x enemy.js:891-901, 2833-2840)
    orb: { r: 0.35, wSeg: 10, hSeg: 8, opacity: 0.9, scale0: 0.6, scaleGain: 0.9 },
    // the landing ring: 28 segments, flat at y 0.02, double-sided, no depth write (1.x enemy.js:914-924).
    // It flashes on the lob's own clock: sin(22 t) > 0 ? 0.75 : 0.2 through the telegraph, then
    // sin(40 t) > 0 ? 0.85 : 0.25 in flight (1.x enemy.js:2831-2832, 2855-2856). 1.x calls these
    // `telegraphFlashHz` 22 and `flightFlashHz` 40, but they are radians a second (≈3.5 Hz and ≈6.4 Hz)
    ringSegs: 28, ringY: 0.02,
    telegraphFlashRate: 22, telegraphOpacity: [0.75, 0.2],
    flightFlashRate: 40, flightOpacity: [0.85, 0.25],
    // a shot pops the top segment: 3 gel chunks from (segments left + 0.5) × 0.6, outward 3 u/s,
    // vy 2–5, tan, size 0.14 (1.x enemy.js:1627-1638), as smooth goo droplets, a 9 × 7 sphere
    // (1.x main.js:2436, 2617). They fly on 1.x's chunk physics: life 1.4, gravity 14, the floor
    // keeping 0.35 of their skid, a shrink over the last 0.3 s (TUNING.death), and land at
    // y ≤ 0.01 with a squash kick 0.4 × |vy| on a 0.32 / 0.80 spring held to 0.55..1.4
    // (1.x main.js:1370-1381), per 60 Hz frame
    popChunks: 3, popSpeed: 3, popUp: [2, 5], popSize: 0.14, popColor: 0xaa8844, popGeo: [9, 7],
    popFloor: 0.01, popSquash: { land: 0.4, spring: 0.32, damp: 0.80, min: 0.55, max: 1.4 },
    frameDtCap: 0.05,      // the chunks' frame clock is held to 1.x's own dt cap (1.x main.js:9268)
    popPool: 9,            // chunks a view keeps in flight at once (three pops' worth; 2.0's budget, 1.x had a shared 384)
  },
};
