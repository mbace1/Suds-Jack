// toro.js — TORO: its numbers. The 1.x CFG row (1.x enemy.js:590), melee
// flag (1.x main.js:2410-2420), movement role (1.x tuning.js:293, 306),
// revenge dialect (1.x tuning.js:496-513), and everything its port reads: the
// creep → rev → telegraph → dash → recover cycle (1.x TUNING.toro,
// tuning.js:64-80, and the literals enemy.js:2562-2647 writes inline), the
// exact-length arrow on the floor, and the look's numbers (the v255 sawblade
// wheel, enemy.js:126-152, 827-856). Spec: docs/port-1x/species-a.md §5.
// Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268. "Hz" in 1.x's
// TUNING.toro is radians a second (species-a.md §10.4 trap 11).
export default {
  name: 'TORO',
  deathLabel: 'Toro charger', // the death screen's name for it (1.x main.js:5036)
  family: 'custom',        // its own family: a group-bodied wheel (1.x GROUP_BODY, enemy.js:652); render/looks/toro.js builds it.
                           // Its death chunks are 1.x's smooth goo (main.js:2618: only CUBE_TYPES_FX, the seven cubes at
                           // main.js:2425-2428, throw angular ones)
  radius: 1.0,             // the hit and contact circle, whatever the yaw (1.x enemy.js:590, main.js:10650, 10894);
                           // the wheel itself is 1.96 across with spikes to 1.58 (species-a.md §5.4)
  hp: 6,                   // 1.x enemy.js:590
  speed: 5.0,              // the CFG number — READ BY NOTHING: the creep and the dash below are fixed, so the wave's
                           // speedMult, the SWIFT affix and a SIREN's surge never reach it (1.x enemy.js:2562-2647, species-a.md §5.1)
  color: 0x4488cc,         // blue (1.x enemy.js:590)
  bulletColor: null,       // it never fires (1.x enemy.js:590)
  fireInterval: null,      // 1.x enemy.js:590
  contact: true,           // touching it hurts in classic (1.x MELEE_TYPES, main.js:2415): within 1.0 + 0.5 (main.js:10894)
  role: 'COMMIT',          // swarm-force profile: the wave's current at 0.15 and nothing else (1.x tuning.js:293, 306);
                           // the current still drifts it through its rev and its telegraph, as in 1.x (species-a.md §10.4 trap 13)
  revenge: null,           // not a biter: in 1.x a TORO's corpse never fires (1.x tuning.js:496-497)

  // ── the cycle (1.x enemy.js:2562-2647) ──
  firstIdle: [1.5, 2],     // the first idle: 1.5 + U(0, 2) s from its arrival (1.x enemy.js:862)
  nextIdle: [1.0, 1.5],    // every later one: 1.0 + U(0, 1.5) s from the end of a recovery (1.x enemy.js:2642)
  creep: 0.8,              // u/s straight at the hero while idle, never × speedMult (1.x enemy.js:2571 `idleSpd = 0.8`)
  creepStop: 2,            // ... only while farther than this (1.x enemy.js:2572 `dist > 2`)
  revTime: 1.6,            // s of rev; the dash line is fixed (snapped) as it starts (1.x tuning.js:65, enemy.js:2578-2588)
  dirSnapDeg: 45,          // the dash line is the way to the hero rounded to the nearest 45° (1.x tuning.js:67, enemy.js:2583-2585)
  telegraphTime: 0.5,      // s the arrow shows; no movement, no spin (1.x tuning.js:65, enemy.js:2609-2618)
  dashSpeed: 22,           // u/s as the dash starts (1.x tuning.js:66)
  dashMin: 14,             // ... decelerating to this floor (1.x tuning.js:66)
  dashDecel: 8,            // u/s², applied before each step's move (1.x tuning.js:66, enemy.js:2620)
  // the dash ends when the centre passes the arena's half size less the CFG radius — not the elite's
  // (1.x enemy.js:2566 `halfX − cfg.radius`) — and is clamped back to it (enemy.js:2626-2629); the arrow is
  // measured to the same line (enemy.js:2602, arena.js:62-67). An elite's line is its own radius in, where 2.0's
  // core holds every body (sim/species/toro.js inset())
  minArrow: 0.5,           // the arrow is never shorter than this (1.x enemy.js:2602 `Math.max(0.5, …)`)
  recoverTime: 0.8,        // s standing still at the wall before the next idle (1.x tuning.js:80)
  wallSquash: -0.5,        // the wall hit's kick to the squash spring (1.x enemy.js:2632 `_sqV −= 0.5`)
  // the spin about the axle, rad/s: through the rev 3 + 8 × (1.6 − time left), so 3 → 15.8 (1.x enemy.js:2594),
  // through the dash its true rolling rate, speed / (CFG radius × rim) (1.x enemy.js:2624)
  spin: { revBase: 3, revGain: 8 },
  rim: 0.68,               // the tyre's ring radius, × CFG radius: the wheel it rolls on (1.x enemy.js:128, 2624)
  // 1.x's squash spring for every non-blob body, per 60 Hz frame (1.x enemy.js:2728-2730): spring, damp, held to
  // 0.55..1.55. The core picks its spring by family (blob 0.24/0.86), so the behaviour runs this one in its place.
  squash: { spring: 0.18, damp: 0.90, min: 0.55, max: 1.55 },

  // ── its own feedback ──
  dashContactShake: 0.27,  // a non-fatal touch WHILE it dashes adds this camera shake (1.x main.js:10897); the behaviour
                           // reports it as a `shake` event, which main.js applies
  // NOT read by the core yet (a contract gap: the view's burst throws every body T.death.chunks of
  // T.death.chunkSize): its death throws 8 goo chunks of 0.25, not 5–6 of 0.18 (1.x enemy.js:3033-3034, 3038)
  deathChunks: { count: 8, size: 0.25 },
  // its death sound, 'toro' (audio.js reads it): a sawtooth 95 → 38 Hz over 0.45 s at 0.36, with noise at 0.14
  // for 0.22 s (1.x main.js:4477, audio.js:245)
  deathSound: { wave: 'sawtooth', f0: 95, f1: 38, dur: 0.45, vol: 0.36, noiseVol: 0.14, noiseDur: 0.22 },

  // ── the look (render/looks/toro.js) ──
  look: {
    // the material: 1.x's satin, family `toro` — a hard rolling wheel: roughness 0.10, transmission 0.25 (1.x tuning.js:29),
    // uWobble 0.35 (every non-blob family), uRadius the CFG 1.0 (1.x enemy.js:322-324, 815). No hit ripple and no death
    // thrash: 1.x writes uHit and uTear for BLOB_TYPES only (enemy.js:1611, 2704, 2989)
    roughness: 0.10, transmission: 0.25, wobble: 0.35,
    // the wheel, one merged geometry, in local XY (axle +z, travel +x), the tyre's ring at `rim` above
    // (1.x enemy.js:126-152, tuning.js:76-79):
    tube: 0.30,            // the tyre's thickness, × CFG radius (1.x tuning.js:77)
    tyreSegs: [8, 18],     // TorusGeometry radial / tubular segments (1.x enemy.js:129)
    rimSpikes: 8,          // the sawblade's teeth, evenly round the rim (1.x tuning.js:75)
    spike: { base: 0.20, length: 0.70, sink: 0.10, sides: 4 },  // each a 4-sided cone pointing out, its base sunk 0.10 into
                           // the tyre: centres at 1.23, tips at 1.58 — absolute sizes, not × r (1.x tuning.js:76, enemy.js:133-138)
    hub: { r: 0.13, depth: 0.16, sides: 12 },   // a short cylinder along the axle (1.x tuning.js:78, enemy.js:141-143)
    spokes: { count: 3, w: 0.09, d: 0.09, inset: 0.35 },   // bars through the centre at 0°, 60°, 120° (six arms), each
                           // 2 × (rim − 0.35 × tube) = 1.15 long (1.x tuning.js:78, enemy.js:146-151)
    // the wheel's centre stands at the CFG radius, elite or not (1.x enemy.js:836 `group.position.set(x, cfg.radius, z)`),
    // and the squash spring scales the wheel about it (enemy.js:2737-2738)
    sqFloor: 0.1,          // the across-scale is 1/√max(sq, 0.1) (1.x enemy.js:2733)
    anchored: { xz: 1.25, y: 0.8 },   // the ANCHORED affix's squat tell (1.x main.js:9419). On a TORO it sticks, because
                           // its squash writes the group, not the mesh (1.x enemy.js:2737-2738): an oval wheel
    // the rev glow: black → 0x003319 across the rev, emissive (v << 8) | (v × 0.5) with v = ⌊ramp × 0x33⌋
    // (1.x enemy.js:2659-2662). The hit flash outranks it (enemy.js:2650)
    revGlow: 0x33, revGlowBlue: 0.5,
    // the telegraph (1.x enemy.js:840-856, 2597-2615): a shaft 0.34 wide and 0.04 thick with its origin at the near end,
    // stretched to the dash's exact length, and a 3-sided cone arrowhead 0.5 × 0.9 lying along the path with its tip
    // exactly at the impact point, on the floor at y 0.03 where the TORO stood. 0xff2200, flashing 0.7 / 0.15 on
    // sin(25 × time left) > 0 (≈ 4 Hz)
    indicator: {
      color: 0xff2200, width: 0.34, thick: 0.04, y: 0.03,
      arrow: { radius: 0.5, length: 0.9, sides: 3 },
      flashRate: 25, opacity: [0.7, 0.15],
      opacity0: 0.55,      // the material's opacity before its first flash (1.x enemy.js:842)
    },
  },
};
