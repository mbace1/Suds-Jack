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
    speed: 12,       // ground strafe speed, u/s
    gravity: -24,
    jumpV: 8.6,      // takeoff velocity — with gravity gives the jump arc
    maxJumps: 2,     // ground jump + one air jump
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
    levelGems: [0, 0, 10, 30, 70],
    tiers: [
      null,
      { stream: 13, homing: false },
      { stream: 18, homing: false },
      { stream: 18, homing: true },
      { stream: 26, homing: true },
    ],
    daggerSpeed: 58,   // u/s
    spread: 0.035,     // rad of random cone on the stream
    homingDot: 0.8,    // cos of the steer cone (~37°)
    homingRange: 30,   // u — targets beyond this are ignored
    homingSteer: 7,    // 1/s — exponential steer rate toward the target
    autoFireMove: 0.15, // move-input length that turns the touch stream on
    streamDelay: 0.22, // s a press must be held before the stream begins
    // The burst wins the MOMENT, the stream wins the MINUTE (DD's economy):
    // count[lv]/cd must stay below tiers[lv].stream at every level, or
    // tap-spam becomes the optimal close-range play. The gate asserts it.
    shotgunCount: [0, 10, 12, 12, 14], // daggers per tap-burst, by weapon level
    shotgunSpread: 0.14, // rad — much wider cone than the stream
    shotgunCd: 0.8,    // s before the hand fires again after a burst
  },

  gems: {
    gravity: -22,
    magnetR: 5.5,      // u — gems inside this fly to the player
    collectR: 0.95,
    lifetime: 25,      // s before a gem expires (blinks its last 3)
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
    start: 30,         // s on the clock at run start
    cap: 60,
    hitCost: 10,       // s lost per enemy touch
  },

  /**
   * THE DIFFICULTY CURVE (v4.36 balance pass, owner's brief: "more varied
   * enemies in the first minute, harder for the 2nd").
   *
   * The shape is deliberate and the two halves do different jobs:
   *
   *  MINUTE ONE is a PARADE — pulses come fast (~9.5 s) so a new threat
   *  debuts almost every pulse (the debut guarantee forces the earliest
   *  un-met type), but the budget stays LOW so each one arrives nearly
   *  alone. You meet six distinct things and get to read each of them.
   *
   *  MINUTE TWO is the SQUEEZE — the debut parade is over, so the same
   *  cadence now spends a budget that climbs seven times faster
   *  (1.45/pulse vs 0.2), and the recurring clocks tighten. Same enemies,
   *  suddenly in numbers: the difficulty comes from volume, not novelty.
   *
   * MEASURED, with a player who fires (js sim over a real 130 s run):
   * live threats average 4.5 in minute one, 30 in minute two, and then
   * PLATEAU at ~35 rather than climbing — the plateau is the ceiling
   * below doing its job, and it is what keeps a bad minute survivable.
   *
   * Every number the director reads lives here, so re-balancing is one file.
   */
  director: {
    // [key, unlockTime, cost] — ORDER MATTERS: the debut guarantee walks
    // this list, so it doubles as the order the player meets the roster in.
    pool: [
      // NB: an unlock only opens ELIGIBILITY — the debut lands on the next
      // pulse, so measured arrival runs ~8-14 s behind these numbers. They
      // are set early enough that all six still land inside minute one.
      ['skulls', 6, 2],    // the swarm fodder — first contact
      ['watcher', 14, 3],  // …teaches "something shoots at you"
      ['husk', 22, 5],     // …teaches "chew the armor" while it is calm
      ['brute', 30, 3],    // …teaches "some things don't flinch"
      ['spider', 38, 4],   // …teaches "your gems can be stolen"
      ['blinker', 46, 3],  // …teaches "you cannot simply kite"
      ['serpent', 68, 8],  // minute two opens with the big one
      ['dread', 88, 6],
    ],
    caps: { watcher: 3, blinker: 3, spider: 2, dread: 2, husk: 2 },
    // pulse cadence: interval = max(floor, base − t·slope)
    pulse: { first: 10, base: 10, slope: 0.012, floor: 7.5 },
    // budget = base + min(n,kneeA)·rateA + (min(n,kneeB)−kneeA)·rateB
    //          + (n−kneeB)·rateC   — kneeA ends the parade, kneeB the squeeze
    // rateA is deliberately tiny: during the parade the budget barely covers
    // the forced debut, so each new threat arrives with almost no support.
    // Per-pulse pressure in minute one actually DROPS vs the old curve
    // (2.8–5.1 vs 3.8–9.0) even though six things debut instead of four.
    budget: { base: 2.6, kneeA: 6, rateA: 0.2, kneeB: 15, rateB: 1.45, rateC: 0.4 },
    /**
     * THE PRESSURE CEILING. Budget controls the spawn RATE; what actually
     * kills you is the standing POPULATION, and population accumulates
     * whenever spawns outrun your kill rate. Without a ceiling the two
     * compound: measured over a no-kill run, minute two averaged 41 live
     * threats against minute one's 6 — a wall, not a ramp, and a death
     * spiral for anyone already struggling (falling behind makes you fall
     * further behind). The director now refuses to add pressure while the
     * floor is already at capacity, so a bad minute stays survivable and
     * the difficulty lives in the MIX, not in an unbounded pile.
     */
    ceiling: { base: 10, rate: 0.15, cap: 38 },
    // recurring clocks (own timers, outside the pulse system)
    totem: { first: 0, base: 24, slope: 0.03, floor: 15 },
    thorn: { first: 40, base: 11, slope: 0.03, floor: 5 }, // debuts in minute one now
    leviathan: { first: 150, every: 120 },
    revenant: { first: 110 },
  },
};
