// magna.js — MAGNA: its numbers. The 1.x CFG row (1.x enemy.js:599), melee
// flag (1.x main.js:2410-2420: not in MELEE_TYPES), movement role (1.x
// tuning.js:308), revenge dialect (1.x tuning.js:496-513: not a biter), and
// everything its port reads: the v144 puller — an amber support dome that
// lumbers to 9 from you and holds, while every living MAGNA within 11 drags
// you toward itself at 1.1 u/s (stacked, capped at 2.0 u/s) on a faint amber
// tether; a dash breaks the hold for the dash and 1.2 s after it.
// Spec: docs/port-1x/species-a.md §7. Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'MAGNA',
  family: 'blob',          // look family: the gel dome (render/looks/magna.js shapes it, 1.x's own way)
  radius: 0.8,
  hp: 4,
  speed: 0.9,
  color: 0xff9944,
  bulletColor: null,
  fireInterval: null,      // no gun: the pull is its attack (1.x enemy.js:599)
  contact: false,         // touching it hurts in classic (1.x MELEE_TYPES): it does not (1.x main.js:2410-2420)
  role: 'SUPPORT',          // swarm-force profile (TUNING.movement.roles; 1.x tuning.js:308)
  revenge: null,          // HARDCADE dialect if it bites: 'AIMED' | 'FAN' | 'RING'; null = it does not (1.x tuning.js:496-497)

  // ── the walk: "lumbers to mid range and holds — the pull does the chasing" (1.x enemy.js:1888-1894) ──
  keep: 8,                  // 1.x enemy.js:1890 `const keepM = 8`
  keepBand: 1,              // it closes only while farther than keep + 1 = 9, else it stands; it never backs off (1.x enemy.js:1891)

  // ── the pull (v144, 1.x main.js:10189-10213) ──
  reach: 11,                // a MAGNA holds you while you are strictly within 11 of it (1.x main.js:2542 `MAGNA_REACH = 11`, 10202)
  release: 1.2,             // … and strictly farther than 1.2 (no pull at the singularity) (1.x main.js:10202 `md > 1.2`)
  pull: 1.1,                // u/s toward it, per MAGNA that holds (1.x main.js:2543 `MAGNA_PULL = 1.1`, 10204)
  cap: 2.0,                 // the summed pull of every MAGNA is held to 2.0 u/s, in its own direction (1.x main.js:10206-10207)
  immune: 1.2,              // s: a dash sets the hold's immunity to 1.2 every step it lasts, then it runs down by dt (1.x main.js:10194-10195)

  // ── its clocks (1.x enemy.js:668, 671, 2724-2725) ──
  clockStart: [0, Math.PI * 2],  // `_wobbleT = rand·2π`, then += dt every frame: drives the breath and the tether's shimmer
  phaseStart: [0, Math.PI * 2],  // `_phase = rand·2π`: desyncs the breath across a wave
  // the velocity its look smears and turns by: 1.x's `_velX/_velZ`, the body's
  // OWN movement this frame (measured from where the swarm forces left it,
  // before the crowd solver), smoothed 0.3 a frame (1.x enemy.js:2694-2697)
  velSmooth: 0.3,

  // ── the tether's glow: the tell (1.x enemy.js:1171-1184, 1895-1904) ──
  // the opacity is the sim's (g.s.tether), eased per step as 1.x eased it per
  // frame inside update, toward `held ? base + amp·|sin(hz·clock)| : 0`
  tether: {
    base: 0.3,              // 1.x enemy.js:1902 `0.3 + 0.15·|sin(_wobbleT·6)|`
    amp: 0.15,              // a 0.30–0.45 shimmer while it holds …
    hz: 6,                  // … at a π/6 = 0.52 s period, on its own clock (1.x enemy.js:1902)
    ease: 0.25,             // the opacity closes a quarter of the gap a frame (τ ≈ 0.058 s) (1.x enemy.js:1903)
  },

  // ── the look (render/looks/magna.js) ──
  // the silhouette is the default dome, TUNING.blob.shape {1.05, 0.82, 1.05}
  // (1.x tuning.js:39, enemy.js:803-806: MAGNA has no override): 0.84 wide, 1.12 tall
  look: {
    // 1.x's blob scale block (enemy.js:2731-2769)
    breatheXZ: 0.5,        // the breath gives back half of itself across (1.x enemy.js:2751 `sx × (1 − breathe × 0.5)`)
    dragSink: 0.25,        // the smear lowers the crown by a quarter of the drag (1.x enemy.js:2768 `sy − drag × 0.25`)
    yawMinSpeed: 0.4,      // it turns to its heading only above this smoothed speed (1.x enemy.js:2755)
    sqFloor: 0.1,          // the volume-keeping width reads max(_sq, 0.1) (1.x enemy.js:2732)
    yaw0: 0,               // a new body faces +z (1.x enemy.js:806 `_moveYaw = 0`)
    // the tether (1.x enemy.js:1175-1181): BoxGeometry(0.09, 0.02, 1),
    // MeshBasic 0xffaa55, additive, no depth write, from the MAGNA to you: at
    // the midpoint, y 0.45, turned along the line and stretched to its length
    tether: {
      width: 0.09, thick: 0.02,      // 1.x enemy.js:1176
      color: 0xffaa55,               // a pale amber, lighter than the body (1.x enemy.js:1178)
      y: 0.45,                       // 1.x enemy.js:1181, 1898
      minLen: 0.01,                  // scale.z = max(0.01, dist) (1.x enemy.js:1901)
      unseen: 0.001,                 // below this opacity it is not drawn at all (1.x drew it at 0; additive, so nothing shows either way)
    },
  },
};
