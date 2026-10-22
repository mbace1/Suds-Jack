// spittor.js — SPITTOR: its numbers. The 1.x CFG row (1.x enemy.js:579),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:292, 301),
// revenge dialect (1.x tuning.js:496-513), and everything its port reads:
// the 10 ± 1 hold band, the inflate-and-spit cycle (an aimed RING of 8 every
// 2.2 × intervalMult s, after a 0.45 s +22% inflate, with a 0.18 kick back)
// and the look's per-frame numbers. Spec: docs/port-1x/species-b.md §3,
// bullets-graze.md §5.2. Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'SPITTOR',
  deathLabel: 'red spittor', // the death screen's name for it (1.x main.js:5025)
  family: 'blob',          // look family: the gel dome (render/looks/spittor.js shapes it, 1.x's own way)
  radius: 0.9,             // 1.x enemy.js:579
  hp: 3,                   // 1.x enemy.js:579
  speed: 1.6,              // u/s before the wave's speedMult (1.x enemy.js:579, 1699)
  color: 0xff5533,         // 1.x enemy.js:579
  bulletColor: 0xff7755,   // 1.x enemy.js:579
  fireInterval: 2.2,       // s, × the wave's intervalMult (1.x enemy.js:579, 2873)
  contact: false,          // its touch hurts only in CLOSE COMBAT, never in classic (1.x MELEE_TYPES, main.js:2410-2420)
  role: 'HOLDER',          // swarm-force profile: the wave's current at 0.25, nothing else (1.x tuning.js:292, 301)
  revenge: 'AIMED',        // HARDCADE's corpse fire: 3 slow bullets at ±0.14 rad (1.x tuning.js:496-513)

  // ── movement: a radial hold band, no strafe (1.x enemy.js:2247-2257) ──
  hold: 10,                // the distance from the hero it keeps (1.x enemy.js:2248 `want = 10`)
  holdBand: 1,             // walks in past hold + 1, backs off inside hold − 1 (1.x enemy.js:2249, 2252)
  velSmooth: 0.3,          // 1.x _velX: its OWN walk each frame, eased 0.3 a frame (1.x enemy.js:1680, 2693-2698).
                           // The spit's kick back lands after it is sampled, so it never shows in it.

  // ── the spit (1.x enemy.js:2878-2902) ──
  fireStart: [0, 0.5],     // the fire clock starts at U(0, 0.5) s, desyncing a wave (1.x enemy.js:674)
  tellTime: 0.45,          // the inflate before each spit; the fire clock keeps counting through it (1.x tuning.js:48 spittorInflateTime)
  ring: 8,                 // bullets in the ring; the first flies straight at the hero, the rest 45° on (1.x enemy.js:2899, 2961-2966)
  bulletSpeedMult: 1,      // × the gel bullet's 7 u/s: spawnDir's default (1.x bullet.js:91-94)
  recoil: 0.18,            // the body kicks this far back along −aim as it spits (1.x tuning.js:48 spittorRecoil, enemy.js:2897-2898)
  fireSquash: -1.0,        // and flattens: a kick to the squash spring (1.x enemy.js:2892 `_sqV −= 1.0`)

  // ── the look (render/looks/spittor.js): 1.x's blob scale block (enemy.js:2733-2769) ──
  look: {
    shape: { x: 1.02, y: 0.78, z: 1.26 },   // "snouty": 1.84 wide, 2.27 long along its heading at rest (1.x tuning.js:41)
    inflate: 0.22,         // swells linearly to +22% over the tell (1.x tuning.js:48 spittorInflate, enemy.js:2759)
    tellEmissive: 0x442200,// a dull orange glow for the whole tell (1.x enemy.js:2686-2687)
    breatheXZ: 0.5,        // the breath gives back half of itself across (1.x enemy.js:2751 `sx × (1 − breathe × 0.5)`)
    dragSink: 0.25,        // the smear lowers the crown by a quarter of the drag (1.x enemy.js:2768 `sy − drag × 0.25`)
    yawMinSpeed: 0.4,      // the snout swings to the travel heading only above this smoothed speed (1.x enemy.js:2755)
    sqFloor: 0.1,          // the across-scale is 1/√max(sq, 0.1) (1.x enemy.js:2732)
    yaw0: 0,               // a new body faces +z until it first walks (1.x _moveYaw = 0, enemy.js:806)
  },
};
