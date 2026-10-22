// yela.js — YELA CUBE: its numbers. The 1.x CFG row (1.x enemy.js:583),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:300-316),
// revenge dialect (1.x tuning.js:496-513: not a biter), and everything its
// port reads: the v84 edge-pivot flop (a rounded cube tipping over its leading
// bottom edge, one face a flop, its cadence derived from its speed), the
// fizzing slime trail it leaves every 0.3 s, and the look's per-frame numbers.
// Spec: docs/port-1x/species-a.md §2.3, §2.10.2 and §4. Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'YELA CUBE',
  family: 'cube',          // look family: the rounded cube (render/looks/yela.js builds and tumbles its own)
  radius: 0.7,
  hp: 2,
  speed: 2.2,              // u/s × speedMult: its AVERAGE ground speed, delivered as flops (1.x enemy.js:1491-1493)
  color: 0xffdd00,
  bulletColor: null,
  fireInterval: null,      // no gun: contact only (1.x enemy.js:583)
  contact: true,         // touching it hurts in classic (1.x MELEE_TYPES)
  role: 'DRIFTER',          // swarm-force profile (TUNING.movement.roles); 1.x's forces only stick while it rests (§2.3)
  revenge: null,          // HARDCADE dialect if it bites: 'AIMED' | 'FAN' | 'RING'; null = it does not

  // ── the flop: an edge-pivot tumble (v84, 1.x enemy.js:1486-1566; 1.x tuning.js:56-62) ──
  flop: {
    halfExtent: 0.9,       // L = 0.9 · radius · rm: the RoundedBox is 1.8 radii on a side (1.x enemy.js:738, 1497)
    // the pivot arc: the centre swings from 135° to 45° about the planted
    // edge, so it advances 2L (one face) and lifts to L√2 at the top
    arcStartDeg: 135,      // (1.x tuning.js:58 arcStartDeg)
    arcEndDeg: 45,         // (1.x tuning.js:58 arcEndDeg)
    timeMax: 0.30,         // a flop lasts min(0.30 s, … (1.x tuning.js:60 flopTimeMax)
    shareOfCycle: 0.65,    // … 0.65 × cycle), cycle = 2L / spd (1.x tuning.js:60 flopShareOfCycle, enemy.js:1538)
    restMin: 0.02,         // then it rests max(0.02 s, cycle − flop) (1.x enemy.js:1564)
    minSpeed: 0.01,        // cycle = 2L / max(spd, 0.01) (1.x enemy.js:1501)
    // the wall it turns back from stands at `radius` above — the CFG radius,
    // not an elite's ×1.2 (1.x enemy.js:1495 `radius = CFG[type].radius`, 1527)
    landSquish: -0.32,     // every landing kicks the squash spring flat: `_sqV −= 0.32` (1.x tuning.js:59, enemy.js:1561)
    firstRest: [0, 0.25],  // the first rest is U·0.25 s, staggering a wave's first flops (1.x enemy.js:1213)
    // the heading roll when a rest runs out (1.x enemy.js:1514-1519): the
    // cardinal of the larger axis toward you below 0.70, its last direction
    // below 0.90, else any of the four cardinals
    toward: 0.70,          // (1.x enemy.js:1519 `r < 0.70 ? toward`)
    keep: 0.90,            // (1.x enemy.js:1519 `r < 0.90 ? this._flopDir`)
    idleKeep: 0.7,         // with no heading at all (on top of you) it keeps its line 70% of the time (1.x enemy.js:1521)
  },

  // ── the slime trail (v132/v190): cosmetic, it hurts and slows nothing ──
  slime: {
    interval: 0.3,         // one splat every 0.3 s, moving or not (1.x tuning.js:621 fx.slimeTrailInterval; enemy.js:1216, 2333-2336)
    radius: 0.5,           // (1.x main.js:10470 `spawnSlime(x, z, 0.5)`)
    keep: 8,               // the sim remembers its last 8 splats for the look: more than live at once (2 s / 0.3 s ≈ 7)
  },

  // ── the look (render/looks/yela.js) ──
  look: {
    // the body: 1.x's RoundedBoxGeometry(1.8r, 1.8r, 1.8r, 4, 0.18) (enemy.js:738)
    corner: 0.18,          // the corner's world radius at radius 0.7 (it grows with an elite's rm, as 1.x's mesh scale did)
    segments: 4,           // corner segments: three's RoundedBoxGeometry builds a box of 2·4 + 1 per side
    // at rest: the squash spring and a gentle breath (1.x enemy.js:2770-2777)
    breatheAmp: 0.10,      // (1.x tuning.js:61 flop.breatheAmp)
    breatheRate: 2.4,      // rad/s on its own clock (1.x enemy.js:2773 `sin(_wobbleT · 2.4 + _phase)`)
    breatheXZ: 0.5,        // the breath gives back half of itself across (1.x enemy.js:2775 `× (1 − breathe · 0.5)`)
    // the slime splat (1.x SplatPool.spawnSlime, main.js:1547-1556) and its fizz
    slimeColor: 0xddee00,  // (1.x main.js:1556)
    slimeJitter: [0.85, 1.15], // radius × U per axis, and a random spin (1.x main.js:1550-1552)
    slimeY: 0.013,         // just above the death puddles (1.x main.js:1549)
    slimeOpacity: 0.45,    // fading linearly to 0 … (1.x main.js:1554)
    slimeLife: 2,          // … over 2 s (1.x main.js:1553 — not fx.slimeTrailLife 4, which nothing read)
    slimeSegments: 16,     // a flat disc, CircleGeometry(1, 16) (1.x main.js:1471)
    slimeCap: 128,         // splats on the floor at once (1.x shared one pool of 192 with the puddles, main.js:1468)
    fizzRate: 1.5,         // bubbles a second from each splat … (1.x main.js:1576 `random < dt · 1.5`)
    fizzUntil: 0.5,        // … while more than 0.5 s of it remain (1.x main.js:1576)
    fizzSpread: 0.6,       // within ±0.3 u of it (1.x main.js:1577)
    fizzColor: 0xccee66,   // (1.x main.js:1577)
    fizzMax: 8,            // at most this many bubbles a splat (1.x: a Bernoulli a frame, 2.25 on average)
    bubbleY: 0.08,         // a bubble starts this high … (1.x main.js:2467)
    bubbleLife: [0.9, 1.4],// … and lives 0.9 + U·0.5 s (1.x main.js:2468)
    bubbleSize: [0.07, 0.15], // 0.07 + U·0.08 (1.x main.js:2469)
    bubbleRise: 0.9,       // u/s, a gentle rise (1.x main.js:2482)
    bubbleWiggle: [9, 0.15], // x += sin(9·y + i) · 0.15 · dt, a lazy wiggle (1.x main.js:2483)
    bubblePop: 3,          // it shrinks out over its last 1/3 s (1.x main.js:2484 `min(1, life · 3)`)
    bubbleOpacity: 0.5,    // (1.x main.js:2447)
    bubbleSegments: [6, 5],// SphereGeometry(1, 6, 5) (1.x main.js:2446)
    bubbleCap: 64,         // bubbles at once (1.x BUBBLE_POOL 48, shared with SLUDGE's fumes, main.js:2442)
  },
};
