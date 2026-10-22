// weeva.js — WEEVA: its numbers. The 1.x CFG row (1.x enemy.js:581), melee
// flag (1.x main.js:2410-2420), movement role (1.x tuning.js:301), revenge
// dialect (1.x tuning.js:511), and everything its port reads: the meander that
// closes on you (1.x enemy.js:2273-2278), the accelerating single-arm spiral
// (1.x enemy.js:2948-2957) and the look's per-frame numbers (1.x
// enemy.js:2732-2769, tuning.js:43, 49). Spec: docs/port-1x/species-b.md §5,
// bullets-graze.md §5.2. Contract: docs/SIM_CONTRACT.md.
//
// Not ported: 1.x's motion-trail afterimage (enemy.js:638, every 0.06 s at
// 0.55 × radius) — it was off under 1.x's WEBGPU build since v193
// (main.js:10483-10489), which is 2.0's reference look.
export default {
  name: 'WEEVA',
  family: 'blob',          // look family: the gel dome (render/looks/weeva.js shapes it, 1.x's own way)
  radius: 0.8,
  hp: 3,
  speed: 0.6,
  color: 0x4422ee,         // under 1.x's contrast floor (L 0.0855): the gel rims and lifts it (1.x enemy.js:244-259, v246)
  bulletColor: 0x6644ff,
  fireInterval: 0.16,      // s, × the wave's intervalMult (1.x enemy.js:2873, 2950; v69)
  contact: false,          // touching it is harmless in classic: WEEVA is not in 1.x MELEE_TYPES (main.js:2410-2420)
  role: 'HOLDER',          // swarm-force profile (TUNING.movement.roles; 1.x tuning.js:301 byType)
  revenge: 'FAN',          // HARDCADE dialect if it bites (1.x tuning.js:496, 511: a biter, FAN)

  // ── movement: a slow meander plus a steady close (1.x enemy.js:2276-2277) ──
  // pos += (meander·(sin(rateX·clock), cos(rateZ·clock)) + close·unit(hero − pos)) · speed · dt
  // where clock is the body's own (1.x `_wobbleT`), advanced after the walk.
  // No minimum distance: it closes until it sits on you.
  meander: 0.5,            // the meander's share of speed, on each axis (1.x enemy.js:2276-2277 `* 0.5`)
  meanderRateX: 0.7,       // rad/s of the body clock in x: a 9.0 s period (1.x enemy.js:2276 `sin(_wobbleT * 0.7)`)
  meanderRateZ: 0.5,       // rad/s in z: a 12.6 s period (1.x enemy.js:2277 `cos(_wobbleT * 0.5)`)
  close: 0.45,             // the share of speed it closes on you at (1.x enemy.js:2276-2277 `(ddx / dist) * 0.45`)
  clockStart: [0, Math.PI * 2], // the body clock starts at U(0, 2π), desyncing a wave's meanders (1.x enemy.js:668)
  // 1.x's smoothed velocity (_velX/_velZ), which the look turns and smears
  // by: 0.3 of the way to this step's displacement, and only the body's OWN
  // walk — the swarm forces before it and the crowd after it are not in it
  // (1.x enemy.js:692, 2696-2697, read at 2753-2755; species-b.md §2.9)
  walkSmooth: 0.3,

  // ── the spiral (1.x enemy.js:2948-2957) ──
  // No tell. When the fire clock reaches fireInterval × intervalMult it is
  // reset to 0 (not wound back, so the period rounds up to whole steps, as
  // 1.x's did: 10 steps at 0.16 s), one bullet leaves at the arm's angle, and
  // the arm turns on by (spiralStep + accel) / intervalMult, accel growing.
  fireStart: [0, 0.5],     // the fire clock starts at U(0, 0.5) s (1.x enemy.js:674); from 0.16 − dt it fires on its first step
  spiralStart: 0,          // the arm starts at +x for every WEEVA (1.x enemy.js:678 `_spiralAngle = 0`)
  spiralStep: 0.38,        // rad the arm turns per shot at the start (1.x enemy.js:2949)
  spiralAccel: 0.002,      // the turn grows by this every shot (1.x enemy.js:2954)
  spiralAccelMax: 0.4,     // up to +0.4, so 0.78 rad a shot after 200 shots (1.x enemy.js:2954)
  bulletSpeedMult: 1,      // × the gel bullet's 7 u/s: spawnDir's default (1.x bullet.js:91-94)

  // ── the look (render/looks/weeva.js): 1.x's blob scale block (enemy.js:2732-2769) ──
  look: {
    shape: { x: 0.98, y: 1.02, z: 0.98 },  // the taller drill dome (1.x tuning.js:43 shapes.WEEVA)
    vibrate: 0.03,         // the drill vibration: added across, taken off the height (1.x tuning.js:49 weevaVibrate, enemy.js:2761-2762, 2767-2768)
    vibrateRate: 40,       // rad/s, ≈ 6.4 Hz, on the body's OWN clock: sin(_wobbleT × 40), the sim's g.s.clock (1.x tuning.js:49 `weevaVibrateHz`, enemy.js:2762)
    breatheXZ: 0.5,        // the breath gives back half of itself across (1.x enemy.js:2751 `sx × (1 − breathe × 0.5)`)
    dragSink: 0.25,        // the smear lowers the crown by a quarter of the drag (1.x enemy.js:2768 `sy − drag × 0.25`)
    yawMinSpeed: 0.4,      // it turns to its heading only above this smoothed speed (1.x enemy.js:2755)
    sqFloor: 0.1,          // the squash the width is divided by never reads below this (1.x enemy.js:2732 `Math.max(_sq, 0.1)`)
  },
};
