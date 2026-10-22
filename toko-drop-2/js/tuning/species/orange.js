// orange.js — ORANGE CUBE: its numbers. The 1.x CFG row (1.x enemy.js:584),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:303),
// revenge dialect (1.x tuning.js:496, 510), and everything its port reads:
// the reposition target (a point 6–9 from you, clamped to a ±10 box, re-picked
// on arrival or after 5 s), the v84 edge-pivot flop taken on a FREE heading
// (diagonals allowed, v43), the parallel wall of 6–12 snapped to a compass
// heading on its own 3.0–4.5 s clock, the 0.6 s strobe before it, and the
// look's per-frame numbers. Spec: docs/port-1x/species-b.md §2.13, §6;
// bullets-graze.md §5.2-§5.3. Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'ORANGE CUBE',
  deathLabel: 'orange cube', // the death screen's name for it (1.x main.js:5030)
  family: 'cube',          // look family: the rounded cube (render/looks/orange.js builds and tumbles its own)
  radius: 0.75,            // 1.x enemy.js:584
  hp: 4,                   // 1.x enemy.js:584
  speed: 1.4,              // u/s × speedMult: its AVERAGE ground speed, delivered as flops (1.x enemy.js:584, 1699, 2371)
  color: 0xff8800,         // 1.x enemy.js:584
  bulletColor: 0xff6600,   // 1.x enemy.js:584, 2390
  fireInterval: 3.2,       // the CFG row carries it but 1.x NEVER reads it for this species: the wall runs on its
                           // own clock below (_tick has no ORANGE case; species-b.md §6.2, trap 19)
  contact: false,          // its touch hurts only in CLOSE COMBAT, never in classic (1.x MELEE_TYPES, main.js:2410-2420)
  role: 'DRIFTER',         // swarm-force profile: dodge 0.3, flock 0.6, current 1.0, weave 0.25 (1.x tuning.js:303);
                           // the flop writes its position from the flop's origin, so they stick only while it rests
  revenge: 'AIMED',        // HARDCADE's corpse fire: 3 slow bullets at ±0.14 rad, in 0xcb3200 (1.x tuning.js:496, 510)

  // ── where it goes: a reposition target near you (1.x enemy.js:1568-1579, 2361-2372) ──
  target: {
    ring: [6, 9],          // a point 6 + U·3 from the hero, at a uniform angle (1.x enemy.js:1573-1574)
    box: 10,               // clamped to ±10 on both axes: a box inside both 1.x arenas (1.x enemy.js:1576-1577, v47)
    arrive: 2.6,           // re-picked once it rests within 2.6 of it: just over one stride, so it cannot
                           // straddle the target (1.x enemy.js:2367)
    giveUp: 5,             // … or once it has chased it more than 5 s (1.x enemy.js:2367 `_moveT > 5`)
  },

  // ── the flop: an edge-pivot tumble (v84, 1.x enemy.js:1486-1566; 1.x tuning.js:56-62) ──
  // ORANGE calls it with exact = true: the heading is the raw unit vector to
  // its target, not a cardinal, so it tumbles diagonally (1.x enemy.js:1509-1513, 2371)
  flop: {
    halfExtent: 0.9,       // L = 0.9 · radius · rm: the RoundedBox is 1.8 radii on a side (1.x enemy.js:738, 1498)
    arcStartDeg: 135,      // the centre swings from 135° … (1.x tuning.js:58 arcStartDeg)
    arcEndDeg: 45,         // … to 45° about the planted edge: it advances 2L and lifts to L√2 (1.x tuning.js:58)
    timeMax: 0.30,         // a flop lasts min(0.30 s, … (1.x tuning.js:60 flopTimeMax)
    shareOfCycle: 0.65,    // … 0.65 × cycle), cycle = 2L / spd (1.x tuning.js:60 flopShareOfCycle, enemy.js:1538)
    restMin: 0.02,         // then it rests max(0.02 s, cycle − flop) (1.x enemy.js:1564)
    minSpeed: 0.01,        // cycle = 2L / max(spd, 0.01) (1.x enemy.js:1501)
    landSquish: -0.32,     // every landing kicks the squash spring flat: `_sqV −= 0.32` (1.x tuning.js:59, enemy.js:1561)
    firstRest: [0, 0.25],  // the first rest is U·0.25 s, staggering a wave's first flops (1.x enemy.js:1213)
    keep: 0.7,             // with no heading at all it keeps its line 70% of the time, else any cardinal
                           // (1.x enemy.js:1521; unreachable for ORANGE, which only flops ≥ 2.6 from its target)
  },

  // ── the wall: a parallel line of bullets on a compass heading (1.x enemy.js:1225-1227, 2373-2395) ──
  wall: {
    firstShot: [1.5, 2.5], // the first wall comes 1.5 + U s after it spawns (1.x enemy.js:1227)
    cadence: [3.0, 4.5],   // then 3.0 + U·1.5 s after each (1.x enemy.js:2392). NOT × intervalMult:
                           // only the bullet count escalates with the wave
    shots: 6,              // bullets in the wall at waves 1-2 … (1.x enemy.js:1226)
    shotsPerTier: 2,       // … +2 a tier … (1.x enemy.js:1226)
    shotsMax: 12,          // … up to 12, from wave 6 (1.x enemy.js:1226)
    tierStep: 0.09,        // tier = ⌊(1 − intervalMult) / 0.09⌋, frozen at spawn (1.x enemy.js:1225)
    width: 4.0,            // the line is always 4 u wide, centred on the cube: 0.80 / 0.57 / 0.44 / 0.36 apart (1.x enemy.js:2389)
    diag: 0.707,           // the diagonal compass headings, as written (not 1/√2) (1.x enemy.js:2379)
    bulletSpeedMult: 1,    // × the gel bullet's 7 u/s; spawnDir scales the raw heading, so a diagonal
                           // flies at 7 × 0.99985 (1.x bullet.js:91-94, 107)
  },
  tellTime: 0.6,           // it strobes for the last 0.6 s before each wall (1.x enemy.js:2657)

  // ── the look (render/looks/orange.js) ──
  look: {
    // the body: 1.x's RoundedBoxGeometry(1.8r, 1.8r, 1.8r, 4, 0.18) (enemy.js:738)
    corner: 0.18,          // the corner's world radius at radius 0.75 (it grows with an elite's rm, as 1.x's mesh scale did)
    segments: 4,           // corner segments: three's RoundedBoxGeometry builds a box of 2·4 + 1 per side
    // at rest: the squash spring and a gentle breath, about the cube's CENTRE, which sits at L
    // (1.x enemy.js:1000, 1559, 2770-2777: the mesh origin is the box centre)
    breatheAmp: 0.10,      // (1.x tuning.js:61 flop.breatheAmp)
    breatheRate: 2.4,      // rad/s on its own clock (1.x enemy.js:2773 `sin(_wobbleT · 2.4 + _phase)`)
    breatheXZ: 0.5,        // the breath gives back half of itself across (1.x enemy.js:2775 `× (1 − breathe · 0.5)`)
    sqFloor: 0.1,          // the across-scale is 1/√max(sq, 0.1) (1.x enemy.js:2732)
    // the tell: a square-wave emissive strobe on the frame clock (1.x enemy.js:2657-2658)
    strobeOn: 0x442200,    // (1.x enemy.js:2658)
    strobeOff: 0x000000,   // (1.x enemy.js:2658)
    strobeRate: 20,        // rad/s: sin(performance.now() × 0.02), ≈ 3.2 Hz (1.x enemy.js:2658)
  },
};
