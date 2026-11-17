// redd.js — REDD CUBE: its numbers. The 1.x CFG row (1.x enemy.js:586),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:304),
// revenge dialect (1.x tuning.js:496-497: not a biter), and everything its
// port reads: the FLANKER heading (v40: the bearing to you turned 0.9 rad to
// its own side while farther than 5, 0.3 inside it), fed to 1.x's v84
// edge-pivot flop on the CARDINAL path (the heading snapped to the larger
// axis, as YELA's is), the brood of REDD MINIs it breaks into when its death
// pop ends (4 + 2 a tier, at most 8), and the look's per-frame numbers.
// No dedicated spec: 1.x's source is the spec. Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'REDD CUBE',
  deathLabel: 'red cube',  // the death screen's name for it (1.x main.js:5032)
  family: 'cube',          // look family: the rounded cube (render/looks/redd.js builds and tumbles its own)
  radius: 0.75,            // 1.x enemy.js:586
  hp: 3,                   // 1.x enemy.js:586
  speed: 1.9,              // u/s × speedMult: its AVERAGE ground speed, delivered as flops (1.x enemy.js:586, 1699, 2331)
  color: 0xff2211,         // 1.x enemy.js:586
  bulletColor: null,       // no gun (1.x enemy.js:586)
  fireInterval: null,      // (1.x enemy.js:586; its _tick returns at once, enemy.js:2788-2790)
  contact: true,           // touching it hurts in classic (1.x MELEE_TYPES, main.js:2413)
  role: 'DRIFTER',         // swarm-force profile: dodge 0.3, flock 0.6, current 1.0, weave 0.25 (1.x tuning.js:304);
                           // the flop writes its position from the flop's origin, so they stick only while it rests
  revenge: null,           // not a HARDCADE biter (1.x tuning.js:496-497)

  // ── where it goes: the flanker's heading (v40, 1.x enemy.js:2303-2309) ──
  // the unit bearing to you, turned by `flankSign × angle` (+ is the x → z
  // turn, 1.x's `ux·c − uz·s, ux·s + uz·c`); the side is drawn once, at spawn
  flank: {
    far: 5,                // farther than 5 from you … (1.x enemy.js:2307 `dist > 5`)
    wide: 0.9,             // … it comes in 0.9 rad (52°) off the line, from its side (1.x enemy.js:2307)
    close: 0.3,            // inside it, 0.3 rad (17°): "straightening as it closes" (1.x enemy.js:2306-2307)
    side: 0.5,             // flankSign = U < 0.5 ? +1 : −1, once (1.x enemy.js:701)
  },
  distFloor: 0.001,        // the distance to you is floored at 0.001 (1.x enemy.js:1682): on top of you
                           // the bearing is (0, 0), and the flop takes its no-heading branch

  // ── the flop: an edge-pivot tumble (v84, 1.x enemy.js:1486-1566; 1.x tuning.js:56-62) ──
  // REDD calls it with exact = false (1.x enemy.js:2331): the heading is snapped to a cardinal
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
    // cardinal of the larger axis of the flank heading below 0.70, its last
    // direction below 0.90, else any of the four cardinals
    toward: 0.70,          // (1.x enemy.js:1519 `r < 0.70 ? toward`)
    keep: 0.90,            // (1.x enemy.js:1519 `r < 0.90 ? this._flopDir`)
    idleKeep: 0.7,         // with no heading at all (on top of you) it keeps its line 70% of the time (1.x enemy.js:1521)
  },

  // ── the brood (v40/v211; 1.x enemy.js:3062-3066, 2992-3000; main.js:10586-10620) ──
  // They come out when the 0.28 s death pop ends — the same `_deathT` the
  // view's pop runs on (1.x enemy.js:3007, 2969, 2992-3000), which 2.0 keeps
  // as TUNING.blob.death — so the port reads that rather than a copy.
  children: {
    kind: 'reddmini',      // always REDD MINIs (1.x enemy.js:3063 `_childType = REDD_MINI`)
    base: 4,               // 4 … (1.x enemy.js:3065 `4 + rTier · 2`)
    perTier: 2,            // … + 2 a tier … (1.x enemy.js:3065)
    max: 8,                // … at most 8 (1.x enemy.js:3065 `Math.min(8, …)`)
    // rTier = round((1 / max(intervalMult, 0.1) − 1) / 0.09), from the parent's
    // frozen intervalMult — ROUNDED, where ORANGE's and PURP's tiers floor
    // (1.x enemy.js:3064): 4 at wave 1, 6 at waves 2-3, 8 from wave 4 (its first)
    tierFloor: 0.1,        // (1.x enemy.js:3064 `Math.max(this._intervalMult, 0.1)`)
    tierStep: 0.09,        // (1.x enemy.js:3064 `/ 0.09`)
    jitter: 0.3,           // mini j at (j / n)·2π + U·0.3 rad round the corpse: not freeform (1.x enemy.js:3066, main.js:10595-10597)
    dist: [1.2, 2.7],      // and 1.2 + U·1.5 u out (1.x main.js:10598 `r = 1.2 + rand·1.5`)
  },

  // ── the look (render/looks/redd.js) ──
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
