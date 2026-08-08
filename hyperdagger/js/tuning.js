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
};
