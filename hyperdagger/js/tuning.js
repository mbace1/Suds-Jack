// js/tuning.js — single source of truth for Hyper Dagger FEEL numbers
// (roadmap Phase 1: "all feel numbers extracted from code into one file",
// following toko-drop's js/tuning.js pattern).
//
// Every number here is one a designer would tweak to change how the game
// FEELS moment to moment. Consumers import TUNING and alias into their local
// const names, so this file is the only place these values are written.
// Structural data stays where it lives: enemy stats in enemy.js MODELS /
// class fields, director tables (PULSE_POOL, PERF_TIERS, STYLE_TIERS,
// GEM_DROPS) in main.js — those define WHAT exists; this file defines how
// it feels to move, aim, and spend.

export const TUNING = {
  // first-person body
  player: {
    eye: 1.6,        // camera height above the feet
    speed: 10.4,     // straight-line speed; diagonal strafing is deliberately faster
    diagonalBoost: 0.56, // DD/90s-FPS speed reward for combining forward + strafe
    groundAccel: 12, // Quake-style acceleration, 1/s
    groundFriction: 7,
    airAccel: 2.6,   // air steering without erasing carried momentum
    airSpeedCap: 19,
    gravity: -24,
    jumpV: 8.6,      // takeoff velocity — with gravity gives the jump arc
    maxJumps: 1,     // extra height comes from a downward shotgun, not a free air jump
    glideGravity: 0.32, // gravity multiplier while gliding (MOVE / TRUCK)
    // WALL RUN (v40, MOVE first). Touch a wall while airborne with speed
    // along it and the body sticks and runs: gravity nearly off, speed held
    // at least at wallRunSpeed, a press of jump kicks OFF the wall. The
    // clock is what keeps it a move and not a mode — max seconds per wall
    // contact, refilled by touching the floor.
    // sink -0.5 / gravity 0.06: the first cut sank at -1.4 and a run caught
    // off a standing jump touched the floor in a second, before its clock —
    // a wall run holds nearly flat, and the CLOCK is what ends it
    wallRun: { max: 1.3, minAlong: 3.0, speed: 11.5, gravity: 0.06, rise: 1.2, sink: -0.5, stick: 0.6, jumpUp: 1.05, jumpPush: 7.5, roll: 0.14 },
    jumpBuffer: 0.11,
    coyote: 0.08,
    hopWindow: 0.12,
    hopBoost: 1.08,
    daggerJumpV: 13,
    daggerJumpPush: 4.2,
    daggerJumpWindow: 0.48,
    daggerSecondWindow: 1.4,
    daggerSecondMaxVy: 3.4,
    daggerAimY: -0.38,
    daggerJumps: 2,
  },

  // look, all devices. Touch rates are the shipped feel and stay put by
  // explicit decision (2026-07-31); the pad runs hotter because its response
  // curve (pad.lookExp) protects precision near centre.
  look: {
    mouseSens: 0.0023, // rad per pixel of pointer-lock movement
    touchYaw: 3.8,     // rad/s at full touch-stick deflection
    touchPitch: 2.8,
    padYaw: 4.6,
    padPitch: 3.4,
    rampT: 0.28,       // s of sustained hard deflection to reach full ramp (pad)
    rampMax: 1.55,     // turn multiplier once ramped
    rampPush: 0.7,     // shaped deflection that counts as "held over"
  },

  // gamepad stick shaping (input.js shapeStick)
  pad: {
    deadzone: 0.18,    // radial
    saturation: 0.95,  // deflection past this reads as full
    lookExp: 2.0,      // magnitude^exp response on look — fine centre, fast rim
  },

  // touch stick geometry + gesture windows
  touch: {
    stickR: 60,        // px of travel = full deflection
    lookDeadzone: 0.12,
    tapMs: 250,        // max duration for a jump-tap
    tapPx: 12,         // max travel for a jump-tap
    flickWindow: 150,  // ms of trailing movement examined at release
    flickPx: 40,       // min travel within that window to count as a dash-flick
  },

  // sticky-reticle aim assist — gamepad only (gated in main.js)
  aim: {
    cone: 0.16,        // rad — full slowdown inside this angle off-centre
    fade: 0.26,        // rad — no slowdown at or beyond this
    slow: 0.55,        // look-rate multiplier at dead centre
    maxDist: 45,       // ignore targets further out than this
  },

  dash: {
    speed: 30,         // u/s during the burst
    time: 0.16,        // s of burst
    cooldown: 1.0,
    buffer: 0.25,      // s a request is held so pressing early still fires
  },

  // dagger stream. tiers[lv] = {stream: shots/s, homing}; LV4 is the crimson
  // hand. levelGems[lv] = total gems needed to reach that level.
  // DD gunfeel (2026-07-31): TAP = shotgun burst, HOLD = stream, manually
  // aimed on desktop and pad; touch alone keeps auto-fire while moving.
  weapon: {
    // DD progression: LV2 at 10 collected, LV3 at 70, then bank 150
    // homing daggers (220 total if none are spent) for the final hand.
    levelGems: [0, 0, 10, 70, 220],
    tiers: [
      null,
      { stream: 20, homing: false },
      { stream: 40, homing: false },
      { stream: 80, homing: false },
      { stream: 106, homing: false },
    ],
    streamSpeed: 48,   // the sustained whip is slower and visibly trackable
    shotgunSpeed: 78,  // tap-burst daggers cross the arena much faster
    spread: 0.045,     // rad of random cone on the stream
    originJitter: 0.1, // uneven fingertip release, not a laser from one pixel
    homingDot: 0.8,    // cos of the steer cone (~37°)
    homingRange: 30,   // u — targets beyond this are ignored
    homingSteer: 7,    // 1/s — exponential steer rate toward the target
    autoFireMove: 0.15, // move-input length that turns the touch stream on
    streamDelay: 0.12, // short enough to feel immediate while preserving tap detection
    // The burst wins the MOMENT, the stream wins the MINUTE (DD's economy):
    // count[lv]/cd must stay below tiers[lv].stream at every level, or
    // tap-spam becomes the optimal close-range play. The gate asserts it.
    shotgunCount: [0, 10, 20, 40, 60], // daggers per tap-burst, by weapon level
    shotgunSpread: 0.18, // rad — much wider cone than the stream
    shotgunCd: 0.6,    // brisk recovery; burst DPS still stays below the stream
    homingStream: 40,
    homingShot: [0, 0, 0, 20, 30],
    homingDamage: 10,
  },

  gems: {
    gravity: -22,
    magnetR: 55,       // u — the whole arena, but only while the hand is idle
    collectR: 0.95,
    lifetime: 10,      // DD's short collection window
    blastR: 18,        // a shotgun pushes loose gems away from the hand
    blastPush: 14,
  },

  // REAP — spend the bone-yard (R/E, ✕/LB)
  reap: {
    radius: 7,         // u searched and blasted
    minBones: 30,      // fewer and it refuses (without burning the cooldown)
    cooldown: 3.0,
  },

  // style meter drain: bleed = base + value*scale per second, so top ranks
  // stay fleeting and demand a continuous chain. 5/0.045 is the v4.1 soften
  // (was 6/0.05 — S-rank bled out between kills).
  style: {
    cap: 150,
    bleedBase: 5,
    bleedScale: 0.045,
  },

  // HYPER mode economy (real-time life clock)
  hyper: {
    start: 30,
    cap: 60,
    hitCost: 10,
    killBonus: 3,
    densityRamp: 0.012,
  },

  // TRUCK — the Clustertruck bench. Two numbers decide whether it is a road
  // or a set of stepping stones: platformGap is centre-to-centre, platformDepth
  // is how long each slab is, so the GAP you actually jump is gap - depth.
  // At 5.4-6.8 deep on a 6.5 spacing the early track is a road with seams,
  // which is the point — the pressure is that it LEAVES (platformLife starts
  // the moment you touch it), not that every step is a jump. Real holes arrive
  // later, when the generator starts widening the spacing.
  truck: {
    scrollSpeed: 14,
    platformGap: 6.5,
    platformDepth: 5.4,
    platformDepthVar: 1.4,
    platformLife: 2.2,
    fallY: -8,
    width: 4.2,
    // THE COURSE (v40): after 20 s some gaps widen by courseGap — past what
    // a jump clears — and get a wall along one side to run across.
    courseGap: 2.2,
    courseWallH: 4.5,
    courseChance: 0.12, // per gap, past 20 s — the gate sets it to 1
  },

  /**
   * THE DIFFICULTY CURVE (ported from the v4.36/v4.38 balance work).
   *
   * This governs the PULSE director, which since v31 drives HYPER only —
   * PURE runs the fixed, learnable DD_SPAWNSET and is deliberately NOT
   * touched by any of this. Two halves doing different jobs:
   *
   *  MINUTE ONE is a PARADE — pulses come fast (~9.5 s) so a new threat
   *  debuts almost every pulse (the debut guarantee forces the earliest
   *  un-met type), but the budget stays LOW so each arrives nearly alone.
   *  Per-pulse pressure in minute one is LOWER than the old curve even
   *  though six things debut instead of four.
   *
   *  MINUTE TWO is the SQUEEZE — the parade is over, so the same cadence
   *  spends a budget climbing seven times faster. Same enemies, suddenly
   *  in numbers: difficulty from volume, not novelty.
   */
  director: {
    // [key, unlockTime, cost] — ORDER MATTERS: the debut guarantee walks
    // this list, so it doubles as the order the player meets the roster in.
    // An unlock only opens ELIGIBILITY; the debut lands on the NEXT pulse,
    // so measured arrival runs ~8-14 s behind these numbers.
    pool: [
      ['skulls', 6, 2],
      ['watcher', 14, 3],
      ['husk', 22, 5],
      ['brute', 30, 3],
      ['spider', 38, 4],
      ['blinker', 46, 3],
      ['serpent', 68, 8],
      ['dread', 88, 6],
    ],
    caps: { watcher: 3, blinker: 3, spider: 2, dread: 2, husk: 2 },
    pulse: { first: 10, base: 10, slope: 0.012, floor: 7.5 },
    budget: { base: 2.6, kneeA: 6, rateA: 0.2, kneeB: 15, rateB: 1.45, rateC: 0.4 },
    /**
     * THE PRESSURE CEILING. Budget controls the spawn RATE; what actually
     * kills you is the standing POPULATION, and population runs away
     * whenever spawns outpace kills — which is also a death spiral, since
     * falling behind makes you fall further behind. Measured over a real
     * run, the uncapped curve went 6 -> 41 -> 88 live threats; with the
     * ceiling a firing player sees 4.5 -> 30 -> a PLATEAU at ~35.
     */
    ceiling: { base: 10, rate: 0.15, cap: 38 },
    totem: { first: 0, base: 24, slope: 0.03, floor: 15 },
    thorn: { first: 40, base: 11, slope: 0.03, floor: 5 },
    leviathan: { first: 150, every: 120 },
    revenant: { first: 110 },
  },
};
