// purp.js — PURP CUBE: its numbers. The 1.x CFG row (1.x enemy.js:587),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:304),
// revenge dialect (1.x tuning.js:496, 511), and everything its port reads:
// the CIRCLER heading (v40: tangential round you, nudged in or out to hold a
// tight ~5 orbit, on its own side drawn once), fed to 1.x's v84 edge-pivot
// flop on the CARDINAL path (the heading snapped to the larger axis, as
// YELA's and REDD's are); its rotating 2-ARM SPIRAL (v61: two opposite
// bullets a pulse, the arms turning at a per-cube rate and direction, the
// pulse doubled in v69 so two arms are not twice the fire); the FREEFORM brood
// of PURP MINIs it breaks into when its death pop ends (5 + 2 a tier,
// uncapped but for the child valve); and the look's per-frame numbers.
// No dedicated spec: 1.x's source is the spec (bullets-graze.md §5.5 has its
// row). Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'PURP CUBE',
  deathLabel: 'purple cube', // the death screen's name for it (1.x main.js:5033)
  family: 'cube',          // look family: the rounded cube (render/looks/purp.js builds and tumbles its own)
  radius: 0.75,            // 1.x enemy.js:587
  hp: 3,                   // 1.x enemy.js:587
  speed: 1.6,              // u/s × speedMult: its AVERAGE ground speed, delivered as flops (1.x enemy.js:587, 1699, 2331)
  color: 0xcc44ff,         // 1.x enemy.js:587
  bulletColor: 0xcc66ff,   // 1.x enemy.js:587, 2322-2324
  fireInterval: null,      // the CFG row carries none: the spiral runs on its own clock below (1.x enemy.js:587;
                           // _tick returns at once, enemy.js:2788-2790)
  contact: true,           // touching it hurts in classic (1.x MELEE_TYPES, main.js:2413)
  role: 'DRIFTER',         // swarm-force profile: dodge 0.3, flock 0.6, current 1.0, weave 0.25 (1.x tuning.js:304);
                           // the flop writes its position from the flop's origin, so they stick only while it rests
  revenge: 'FAN',          // HARDCADE's corpse fire: 5 slow bullets 0.5 rad apart, in 0x9b00cb (1.x tuning.js:496, 511)

  // ── where it goes: the circler's heading (v40, 1.x enemy.js:2310-2314) ──
  // with u the unit bearing to you and o its orbit side (±1, drawn once at
  // spawn): want = (−u.z·o + u.x·k, u.x·o + u.z·k), k = (dist − 5)·0.18 —
  // square to your line, plus a pull in while it is outside 5 and a push
  // out while it is inside (the same 0.18 per unit either way)
  orbit: {
    radius: 5,             // the orbit it holds: purely tangential at 5 from you (1.x enemy.js:2312 `dist − 5`)
    pull: 0.18,            // the radial share per unit off that orbit, + inward (1.x enemy.js:2312 `× 0.18`)
    side: 0.5,             // orbitSign = U < 0.5 ? +1 : −1, once (1.x enemy.js:702); +1 turns the bearing x → z
  },
  distFloor: 0.001,        // the distance to you is floored at 0.001 (1.x enemy.js:1682): on top of you
                           // the bearing is (0, 0), and the flop takes its no-heading branch

  // ── the spiral: a rotating 2-arm pinwheel (v61/v69, 1.x enemy.js:703-706, 2317-2325) ──
  // Every pulse it fires TWO bullets from where it stood at the top of its
  // step, at θ and θ + π, then turns θ by its own spin. The clock counts down
  // every step, moving or not, and is ASSIGNED on firing (not accumulated),
  // so the period is whole steps. No tell (1.x gives it no emissive, enemy.js:2648-2690).
  spiral: {
    first: 0.5,            // the first pulse comes 0.5 s in, the same for every cube (1.x enemy.js:703 `_purpFireT = 0.5`)
    period: 1.0,           // then every 1.0 × intervalMult s: doubled in v69 so two arms are not twice the
                           // bullets (1.x enemy.js:2320; VERSIONS v69)
    arms: 2,               // two opposite arms, θ and θ + π (1.x enemy.js:2321-2324)
    angle0: 0,             // θ starts at 0 (+x) on every cube (1.x enemy.js:678 `_spiralAngle = 0`)
    spinMin: 0.42,         // θ turns 0.42 + U·0.34 rad a pulse (0.42 to 0.76) … (1.x enemy.js:706)
    spinRand: 0.34,        // (1.x enemy.js:706)
    spinSide: 0.5,         // … the way U < 0.5 ? + : − says, both drawn once at spawn (1.x enemy.js:706)
    bulletSpeedMult: 1,    // × the gel bullet's 7 u/s: a unit heading (1.x bullet.js:91-94, 107; enemy.js:2321)
  },

  // ── the flop: an edge-pivot tumble (v84, 1.x enemy.js:1486-1566; 1.x tuning.js:56-62) ──
  // PURP calls it with exact = false (1.x enemy.js:2331): the heading is snapped to a cardinal.
  // At 1.6 u/s a face of 1.35 is a 0.84 s cycle: a 0.30 s tip and a 0.54 s rest
  flop: {
    halfExtent: 0.9,       // L = 0.9 · radius · rm: the RoundedBox is 1.8 radii on a side (1.x enemy.js:738, 1497)
    arcStartDeg: 135,      // the centre swings from 135° … (1.x tuning.js:58 arcStartDeg)
    arcEndDeg: 45,         // … to 45° about the planted edge: it advances 2L and lifts to L√2 (1.x tuning.js:58)
    timeMax: 0.30,         // a flop lasts min(0.30 s, … (1.x tuning.js:60 flopTimeMax)
    shareOfCycle: 0.65,    // … 0.65 × cycle), cycle = 2L / spd (1.x tuning.js:60 flopShareOfCycle, enemy.js:1538)
    restMin: 0.02,         // then it rests max(0.02 s, cycle − flop) (1.x enemy.js:1564)
    minSpeed: 0.01,        // cycle = 2L / max(spd, 0.01) (1.x enemy.js:1501)
    // the wall it turns back from stands at `radius` above — the CFG radius,
    // not an elite's ×1.2 (1.x enemy.js:1495 `radius = CFG[type].radius`, 1527)
    landSquish: -0.32,     // every landing kicks the squash spring flat: `_sqV −= 0.32` (1.x tuning.js:59, enemy.js:1561)
    firstRest: [0, 0.25],  // the first rest is U·0.25 s, staggering a wave's first flops (1.x enemy.js:1213)
    // the heading roll when a rest runs out (1.x enemy.js:1514-1522): the
    // cardinal of the larger axis of the orbit heading below 0.70, its last
    // direction below 0.90, else any of the four cardinals
    toward: 0.70,          // (1.x enemy.js:1519 `r < 0.70 ? toward`)
    keep: 0.90,            // (1.x enemy.js:1519 `r < 0.90 ? this._flopDir`)
    idleKeep: 0.7,         // with no heading at all (on top of you) it keeps its line 70% of the time (1.x enemy.js:1521)
  },

  // ── the brood (v40, "Steps 7-8"; 1.x enemy.js:3067-3071, 2992-3000; main.js:10586-10620) ──
  // They come out when the 0.28 s death pop ends — the same `_deathT` the
  // view's pop runs on (1.x enemy.js:3007, 2969, 2992-3000), which 2.0 keeps
  // as TUNING.blob.death — so the port reads that rather than a copy.
  children: {
    kind: 'purpmini',      // always PURP MINIs (1.x enemy.js:3068 `_childType = PURP_MINI`)
    base: 5,               // 5 … (1.x enemy.js:3070 `5 + pTier · 2`)
    perTier: 2,            // … + 2 a tier, with NO cap of its own (REDD's stops at 8): the child valve
                           // (the live cap × 2) is all that holds it (1.x enemy.js:3070; main.js:10608-10620)
    // pTier = ⌊(1 / max(intervalMult, 0.1) − 1) / 0.09⌋, from the parent's
    // frozen intervalMult — FLOORED, where REDD's rounds (1.x enemy.js:3069):
    // 5 at waves 1-2, 7 at 3, 11 at its first wave (5), 25 at 10, 45 from 25
    tierFloor: 0.1,        // (1.x enemy.js:3069 `Math.max(this._intervalMult, 0.1)`)
    tierStep: 0.09,        // (1.x enemy.js:3069 `/ 0.09`)
    // FREEFORM (1.x enemy.js:3071 `_childFreeform = true`): each mini at its
    // own uniform angle round the corpse, not evenly spaced as REDD's are
    // (1.x main.js:10594-10596 `freeform ? rand·2π : …`) …
    dist: [1.2, 2.7],      // … and 1.2 + U·1.5 u out (1.x main.js:10598 `r = 1.2 + rand·1.5`)
  },

  // ── the look (render/looks/purp.js: REDD's rounded cube, looks/redd.js) ──
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
  },
};
