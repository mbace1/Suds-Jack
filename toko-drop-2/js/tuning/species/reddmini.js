// reddmini.js — REDD MINI: its numbers. The 1.x CFG row (1.x enemy.js:588),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:305),
// revenge dialect (1.x tuning.js:496-497: not a biter), and everything its
// port reads: 1.x's v84 edge-pivot flop on the CARDINAL path, its heading
// straight at you ("YELA, minis: direct", v40), and the look's numbers. It is
// what a REDD CUBE breaks into (render/looks/redd.js, sim/species/redd.js);
// it has no brood of its own. Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'REDD MINI',
  deathLabel: 'red mini',  // the death screen's name for it (1.x main.js:5034)
  family: 'cube',          // look family: the rounded cube (render/looks/reddmini.js builds and tumbles its own)
  radius: 0.32,            // 1.x enemy.js:588
  hp: 1,                   // 1.x enemy.js:588
  speed: 3.2,              // u/s × speedMult: its AVERAGE ground speed, delivered as flops (1.x enemy.js:588, 1699, 2331)
  color: 0xff4433,         // 1.x enemy.js:588
  bulletColor: null,       // no gun (1.x enemy.js:588)
  fireInterval: null,      // (1.x enemy.js:588; its _tick returns at once, enemy.js:2788-2790)
  contact: true,           // touching it hurts in classic (1.x MELEE_TYPES, main.js:2414)
  role: 'SCHOOL',          // swarm-force profile: dodge 0.9, flock 1.0, current 1.0, no weave (1.x tuning.js:305);
                           // the flop writes its position from the flop's origin, so they stick only while it rests
  revenge: null,           // not a HARDCADE biter (1.x tuning.js:496-497)
  distFloor: 0.001,        // the distance to you is floored at 0.001 (1.x enemy.js:1682): on top of you
                           // the bearing is (0, 0), and the flop takes its no-heading branch

  // ── the flop: an edge-pivot tumble (v84, 1.x enemy.js:1486-1566; 1.x tuning.js:56-62) ──
  // the same table as every cube's, read off its own 0.32 radius: L 0.288, one
  // face 0.576 a flop; at 3.2 u/s a cycle of 0.18 s (0.117 tipping, 0.063 resting)
  flop: {
    halfExtent: 0.9,       // L = 0.9 · radius · rm: the RoundedBox is 1.8 radii on a side (1.x enemy.js:738, 1497)
    arcStartDeg: 135,      // the centre swings from 135° … (1.x tuning.js:58 arcStartDeg)
    arcEndDeg: 45,         // … to 45° about the planted edge: it advances 2L and lifts to L√2 (1.x tuning.js:58)
    timeMax: 0.30,         // a flop lasts min(0.30 s, … (1.x tuning.js:60 flopTimeMax)
    shareOfCycle: 0.65,    // … 0.65 × cycle), cycle = 2L / spd (1.x tuning.js:60 flopShareOfCycle, enemy.js:1538)
    restMin: 0.02,         // then it rests max(0.02 s, cycle − flop) (1.x enemy.js:1564)
    minSpeed: 0.01,        // cycle = 2L / max(spd, 0.01) (1.x enemy.js:1501)
    landSquish: -0.32,     // every landing kicks the squash spring flat: `_sqV −= 0.32` (1.x tuning.js:59, enemy.js:1561)
    firstRest: [0, 0.25],  // the first rest is U·0.25 s (1.x enemy.js:1213)
    toward: 0.70,          // the cardinal of the larger axis toward you below 0.70 … (1.x enemy.js:1519)
    keep: 0.90,            // … its last direction below 0.90, else any cardinal (1.x enemy.js:1519)
    idleKeep: 0.7,         // with no heading at all it keeps its line 70% of the time (1.x enemy.js:1521)
  },

  // ── what the core does not do per species yet (reported in the port's contractGaps) ──
  deathChunks: { count: [2, 3], size: 0.12 },  // its death throws 2 + ⌊U·2⌋ chunks of 0.12, not 5–6 of 0.18
                                               // (1.x enemy.js:3035-3037)

  // ── the look (render/looks/reddmini.js): REDD's rounded cube at its own radius ──
  look: {
    // the body: 1.x's RoundedBoxGeometry(1.8r, 1.8r, 1.8r, 4, 0.18) (enemy.js:738) at r 0.32 — a
    // 0.576 box whose 0.18 corners take most of each face: a candy, rounder than its parent
    corner: 0.18,          // the corner's world radius (1.x enemy.js:738: an absolute 0.18 on every cube)
    segments: 4,           // corner segments (1.x enemy.js:738)
    breatheAmp: 0.10,      // the at-rest breath (1.x tuning.js:61 flop.breatheAmp; every CUBE_TYPE, enemy.js:2770-2777)
    breatheRate: 2.4,      // rad/s (1.x enemy.js:2773)
    breatheXZ: 0.5,        // (1.x enemy.js:2775)
    sqFloor: 0.1,          // (1.x enemy.js:2732)
  },
};
