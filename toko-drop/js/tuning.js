// js/tuning.js — single source of truth for Toko Drop enemy look & feel.
// Edited live by the pause-menu ENEMIES tab. enemy.js/main.js read from here;
// no visual or behavior constant covered below should remain hardcoded elsewhere.

export const TUNING = {
  material: {
    // active values (start = "satin"); per-family overrides in `families`
    sss: 0.70, roughness: 0.16, clearcoat: 1.00, clearcoatRoughness: 0.06,
    sheen: 0.45, transmission: 0.15, thickness: 0.8, ior: 1.38,
    presets: {
      satin : { sss:0.70, roughness:0.16, clearcoat:1.00, sheen:0.45, transmission:0.15 },
      jelly : { sss:0.50, roughness:0.09, clearcoat:0.95, sheen:0.25, transmission:0.45 },
      glassy: { sss:0.10, roughness:0.02, clearcoat:0.90, sheen:0.00, transmission:0.78 },
      candy : { sss:0.30, roughness:0.05, clearcoat:1.00, sheen:0.15, transmission:0.35 },
      clay  : { sss:0.15, roughness:0.38, clearcoat:0.15, sheen:0.60, transmission:0.00 },
      neon  : { sss:1.35, roughness:0.12, clearcoat:0.80, sheen:0.30, transmission:0.20 },
    },
    families: {
      blob: {},                                        // uses active values as-is
      cube: { roughness: 0.10, transmission: 0.25 },   // firmer candy-glass
      toro: { roughness: 0.10, transmission: 0.25 },   // hard rolling wheel
      bambu: { roughness: 0.20, transmission: 0.10 },  // matte woody stalk
      pyra: { roughness: 0.10, transmission: 0.25 },
      omega: { roughness: 0.04, transmission: 0.40 },  // boss keeps a hard crystal read
    },
  },

  blob: {
    // geometry: gel dome = smax(length(p)-1, -p.y-domeCut, domeRound), origin at floor contact
    domeCut: 0.7, domeRound: 0.22,
    shape:  { x:1.05, y:0.82, z:1.05 },                // squat grounded baseline
    shapes: {
      SPITTOR: { x:1.02, y:0.78, z:1.26 },             // snouty
      FANNER : { x:1.30, y:0.66, z:1.08 },             // wide flat pancake
      WEEVA  : { x:0.98, y:1.02, z:0.98 },             // taller drill dome
    },
    // grounded drag smear
    dragStretchPerSpeed: 0.10, dragMax: 0.35, rearDragTilt: 0.35,
    // per-blob tells
    spittorInflate: 0.22, spittorInflateTime: 0.45, spittorRecoil: 0.18,
    weevaVibrate: 0.03, weevaVibrateHz: 40,
    fannerSway: 0.10, fannerSwayHz: 7,
    globboLungeHz: 3.0, globboLungeGain: 2.6, globboLungeFloor: 0.4,
    splittaChildBulges: { offset: [0.6, 0.42, 0.15], scale: 0.42 },
    breatheAmp: 0.13, breatheAmpSplitta: 0.18,
  },

  flop: {
    // edge-pivot flop (math in goo-flop.html): arc 135°→45°, tip 90° about up×dir
    arcStartDeg: 135, arcEndDeg: 45,
    landSquish: 0.32, landFlat: true,                  // reset orientation on landing
    flopTimeMax: 0.30, flopShareOfCycle: 0.65,         // cycle = 2L / type speed
    breatheAmp: 0.10,
  },

  toro: {
    revTime: 1.6, telegraphTime: 0.5,
    dashSpeed: 22, dashMin: 14, dashDecel: 8,
    dirSnapDeg: 45,
    indicatorWidth: 0.34, indicatorFlashHz: 25,
    arrow: { radius: 0.5, length: 0.9 },               // tip sits exactly at impact point
    rimSpikes: 5,
    recoverTime: 0.8,
  },

  bambu: {
    segments: 3, segHeight: 0.6,
    flareBottom: 0.20, flareBottomStep: 0.02,
    flareTop: 0.36, flareTopStep: 0.03,
    lipScale: 1.14, lipHeight: 0.06,
    lobTelegraph: 0.7, lobFlight: 1.0, lobCooldown: 4.0, lobArcHeight: 2.4,
    lobBlobRadius: 0.34, lobSpread: 1.2,
    landingRing: { inner: 0.55, outer: 0.95, telegraphFlashHz: 22, flightFlashHz: 40 },
  },

  // v210 MOVEMENT PROFILES (field feedback: "the movement of enemies is now
  // unnatural, they should have unique patterns but not all just dodge").
  //
  // FLUID (the default since v198) bolted the SAME four forces onto every
  // non-boss body — dodge, flock, wave current, shepherd pull — so a charging
  // TORO, a stationary TURRET, a lobbing BAMBU and a FLIT all moved like the
  // same fish and each type's own behaviour got averaged away. Every type now
  // declares how much of the shared movement it takes; 0 means "this body
  // does its own thing", which is what makes the roster read as 40 species
  // again instead of one school.
  //
  //   dodge   — reads an incoming bullet lane and sidesteps it
  //   flock   — boids cohesion/alignment, and ONLY with other flockers
  //   current — how hard the wave archetype (stream/ring/pincer) pushes it
  //   weave   — its own serpentine approach: personality without a school
  movement: {
    roles: {
      SCHOOL : { dodge: 0.9, flock: 1.0,  current: 1.0,  weave: 0    },  // the fish
      DARTER : { dodge: 1.0, flock: 0.5,  current: 0.9,  weave: 0.5  },  // quick, reads your gun
      DRIFTER: { dodge: 0.3, flock: 0.6,  current: 1.0,  weave: 0.25 },  // ordinary bodies
      HUNTER : { dodge: 0.4, flock: 0,    current: 0.5,  weave: 0.8  },  // solo stalkers: weave, never school
      HOLDER : { dodge: 0,   flock: 0,    current: 0.25, weave: 0    },  // ranged — holds its ground
      COMMIT : { dodge: 0,   flock: 0,    current: 0.15, weave: 0    },  // chargers are committed to the line
      MASS   : { dodge: 0,   flock: 0,    current: 0.10, weave: 0    },  // heavies plough through
      FIXED  : { dodge: 0,   flock: 0,    current: 0,    weave: 0    },  // does not move under its own power
      SUPPORT: { dodge: 0.5, flock: 0.3,  current: 0.6,  weave: 0.3  },  // has a job to do
      HERDER : { dodge: 0.6, flock: 0,    current: 0.3,  weave: 0.2  },  // SHEPHERD holds a pocket, never schools
    },
    // EnemyType name -> role. Anything unlisted falls back to DRIFTER.
    byType: {
      GLOBBO: 'DRIFTER', SPITTOR: 'HOLDER',  FANNER: 'HOLDER',   WEEVA: 'HOLDER',
      SPLITTA: 'SCHOOL',
      YELA_CUBE: 'DRIFTER', ORANGE_CUBE: 'DRIFTER', SLUDGE_CUBE: 'MASS',
      REDD_CUBE: 'DRIFTER', PURP_CUBE: 'DRIFTER',
      REDD_MINI: 'SCHOOL',  PURP_MINI: 'SCHOOL',
      TORO: 'COMMIT', BAMBU: 'HOLDER', PYRA: 'HUNTER', OMEGA: 'MASS',
      BOTFLY: 'HOLDER', WARDEN: 'SUPPORT', BULWARK: 'MASS', SIREN: 'SUPPORT',
      CLOAKER: 'HUNTER', MAGNA: 'SUPPORT',
      GRUNT: 'SCHOOL', BRUTE: 'MASS', ORB: 'SUPPORT', PROG: 'DARTER', MINDER: 'SUPPORT',
      GHOST: 'SCHOOL', WRAITH: 'COMMIT',
      FLIT: 'SCHOOL', SPITTLE: 'HOLDER', CHARGER: 'COMMIT', HOPPER: 'DARTER',
      TURRET: 'FIXED', TROOPER: 'HOLDER',
      THUG: 'DRIFTER', DRAPER: 'HOLDER',
      PRISM: 'MASS', CUSTODIAN: 'MASS', SHEPHERD: 'HERDER',
    },
    fallback: 'DRIFTER',
    weaveSpeed: 1.7,     // rad/s of the serpentine
    weaveGain: 1.6,      // u/s at full weave
  },

  // v217 WAVE DIRECTOR v1 (roadmap-v2 Phase 2) — the classic-mode spawn
  // director as data. main.js keeps the assembly ALGORITHM (getEnemySchedule);
  // everything tabular about it lives here: which types exist at which depth
  // and cost (composition), the boss/spike/swarm pulse and spawn timing
  // (cadence), and the speed/fire-rate/budget curves (escalation).
  //
  // ORDER MATTERS in `pool`: the draw rolls a seeded index into this list, so
  // reordering entries reshuffles every seeded run (and the daily). Append new
  // types at the end. Boss-wave choreography (OMEGA/PRISM alternation, WARDEN
  // escorts) stays scripted in main.js — it is a set piece, not a table.
  waves: {
    // escalation — getWaveScale: difficulty knees at `knee`, then slow creep
    scale: {
      knee: 10,
      speed:    { base: 1.1, ramp: 0.09,  post: 0.02,  cap: 2.4 },
      interval: { base: 1.0, ramp: 0.055, post: 0.010, floor: 0.35 },
      earlyEase: { until: 6, per: 0.012 },   // waves 1-5 shave a little speed
    },
    // cadence — waveKind: every 8th boss, every 4th spike, every 3rd swarm
    rhythm: { bossEvery: 8, spikeEvery: 4, swarmEvery: 3, swarmFrom: 3 },
    // composition — EnemyType name -> [minWave, budgetCost]
    pool: {
      GLOBBO:      [1, 1], YELA_CUBE: [1, 1], SPITTOR: [1, 2], FANNER: [1, 2],
      ORANGE_CUBE: [2, 2], WEEVA:     [2, 3],
      SLUDGE_CUBE: [3, 2], BAMBU:     [3, 3], SPLITTA: [3, 3],
      REDD_CUBE:   [4, 3],
      PURP_CUBE:   [5, 3], PYRA:      [5, 4], BOTFLY:  [5, 4],
      TORO:        [6, 5],
      WARDEN:      [7, 5],   // shield-bearer — cost keeps it rare
      BULWARK:     [6, 4],   // plate walker — front is bulletproof, flank it
      SIREN:       [8, 5],   // screamer — surges the pack, kill it first
      CLOAKER:     [9, 4],   // ambusher — shimmer-flanks, telegraphed burst
      MAGNA:      [10, 5],   // magnet — pulls you off your line, dash breaks it
      DRAPER:      [7, 5],   // wall-weaver — looms marching bullet curtains
      SHEPHERD:    [4, 4],   // herds the flock — its mechanic is its identity
    },
    // v221 (field call: "different enemies for each mode"): CLOSE COMBAT
    // draws its OWN table. The gun ecology's stationary artillery (BAMBU,
    // PYRA — speed 0, so muzzled they are literally poles of free score) and
    // the pure gun species (BOTFLY, DRAPER) sit out; the melee-native threats
    // arrive earlier instead — CLOAKER's ambush at 5, SIREN's surge at 7,
    // MAGNA's pull at 9. ORIGINAL mode keeps `pool` unchanged.
    // Same rule as `pool`: ORDER IS DRAW ORDER — append, don't reorder.
    poolMelee: {
      GLOBBO:      [1, 1], YELA_CUBE: [1, 1], SPITTOR: [1, 2], FANNER: [1, 2],
      ORANGE_CUBE: [2, 2], WEEVA:     [2, 3],
      SLUDGE_CUBE: [3, 2], SPLITTA:   [3, 3],
      REDD_CUBE:   [4, 3], SHEPHERD:  [4, 4],
      PURP_CUBE:   [5, 3], CLOAKER:   [5, 4],
      TORO:        [6, 5], BULWARK:   [6, 4],
      SIREN:       [7, 5], WARDEN:    [7, 5],
      MAGNA:       [9, 5],
    },
    // ranged types: placed deliberately (capped, spread) instead of flooded
    shooters: ['SPITTOR', 'FANNER', 'WEEVA', 'ORANGE_CUBE', 'PURP_CUBE',
               'BAMBU', 'PYRA', 'BOTFLY', 'CLOAKER', 'DRAPER'],
    affixes: ['volatile', 'swift', 'anchored'],   // elite behavior modifiers
    // escalation — the wave's spend on bodies
    budget: {
      base: 5, ramp: 1.8, post: 0.8, knee: 10, slack: 3,
      kind: { boss: 2.0, spike: 1.4, swarm: 1.25, prize: 0.8, breather: 0.6, normal: 1.0 },
      early: { until: 6, base: 0.85, step: 0.03 },   // −15% at wave 1, gone by 6
      smash: 1.4, smashFloorStep: 0.12,   // the show wants bodies; floors stack
      melee: 1.35,                        // CLOSE COMBAT floods the floor
      rich: 1.4,                          // RICH DAY: crowds pay for the loot
      testFloor: 24,                      // TEST MODE fits late types at wave 1
    },
    // on-field body caps
    caps: {
      swarm:  { base: 5, per: 1.4, max: 22 },
      normal: { base: 4, per: 1,   max: 14 },
      meleeMult: 1.5,
    },
    // deliberate-shooter plan: 1 at wave 1 growing to capMax by ~wave 12
    shooterPlan: { capBase: 1, capPerWaves: 3, capMax: 5, swarmCap: 1, bossCap: 2,
                   budgetShare: 0.35, slack: 2, first: 0.8, gap: 2.5, gapRand: 1.5 },
    // variant draw tables (relative odds = repetition) + variant pricing
    variants: {
      melee:  ['group', 'group', 'group', 'twin', 'twin', 'normal', 'normal', 'elite'],
      swarm:  ['group', 'group', 'twin', 'normal'],
      smash:  ['normal', 'normal', 'normal', 'elite', 'elitelite', 'twin', 'group', 'group', 'group'],
      normal: ['normal', 'normal', 'normal', 'elite', 'elitelite', 'twin', 'group'],
      eliteCost: 1.6, eliteliteCost: 1.25, twinCost: 1.6,
      group: { base: 3, meleeBase: 4, rand: 2 },
      swarmCostMax: 2,          // swarm waves draw only bodies this cheap
      meleeCheapMax: 3,         // the melee draw doubles up on cheap bodies
      meleeShooterDiscount: 2,  // a drafted shooter without its gun is just legs
    },
    // cadence — spawn drip inside a wave
    cadence: {
      swarm:  { min: 0.08, rand: 0.28 },
      normal: { min: 0.18, rand: 0.5 },
      smashPulse: { size: 3, gap: 2.0, rand: 1.0 },   // bursts of 3, one door each
    },
  },

  // v220 REVENGE LANGUAGE (field feedback: "revenge bullets… can't really be
  // used as is but need quite different attacks and strategy… original colors
  // in the one and slightly different colors and features for the other").
  //
  // A corpse's retaliation is its own attack class, never a copy of the living
  // one. Living fire wears the species' bulletColor; revenge wears the SHIFTED
  // palette below — warm colors go dark blood-orange/red, yellows go poison
  // green, cool colors go deep venom — and it comes slow and grazeable.
  revenge: {
    speedMult: 0.6,          // revenge is slow — the graze game, not a wall
    // Dialect per species: revenge ECHOES the species' living attack family
    // but demands different play — AIMED spits a slow burst at your position
    // (move off the line), FAN throws a slow arc (sidestep wide), RING blooms
    // the classic circle (stay off the corpse). Unlisted types RING. Bosses
    // always RING (a boss corpse is an arena event, not a duel).
    byType: {
      SPITTOR: 'AIMED', ORANGE_CUBE: 'AIMED', BOTFLY: 'AIMED', CLOAKER: 'AIMED', TROOPER: 'AIMED',
      FANNER: 'FAN', PURP_CUBE: 'FAN', PYRA: 'FAN', BAMBU: 'FAN', WEEVA: 'FAN', DRAPER: 'FAN', SPITTLE: 'FAN',
    },
    fallback: 'RING',
    aimed: { count: 3, spread: 0.14 },
    fan:   { count: 5, spread: 0.5 },   // 5 shots × 0.5 rad ≈ a 115° arc — a FAN, not a broken ring
    ring:  { small: 4, big: 7, boss: 14, bigRadius: 0.75 },
    // Palette shift rules (revengeColor() in main.js applies them to the
    // species' living bulletColor, falling back to its body color):
    palette: {
      yellowLo: 0.10, yellowHi: 0.22,          // hue band that reads "yellow"
      poisonHue: 0.285, poisonSatMin: 0.75, poisonL: 0.42,   // → poison green
      warmHiCut: 0.92,                          // magenta-reds count as warm
      satMul: 1.2, darkL: 0.55, coolL: 0.5, lFloor: 0.30,    // dark blood / deep venom
    },
  },

  // v223 ARENA & ENVIRONMENT (roadmap-v2 Phase 3, art priority 2). The classic
  // floor was a uniform neon grid: every cell identical everywhere, so the
  // swarm crossed a flat backdrop with nothing to read its approach against.
  // Three cheap fragment terms give the arena depth and a centre of gravity —
  // and one of them tracks YOU, so a wave closing in is visibly closing in.
  //
  // Both renderers run the same math (GLSL + TSL), so this is not "painted
  // twice"; the cabinets keep their own ground and are untouched.
  arena: {
    vignetteInner: 0.55,   // uv-radius where the darkening starts
    vignetteDepth: 0.55,   // how dark the corners get (0 = off)
    poolRadius: 0.30,      // player pool size in uv units
    poolLift: 0.30,        // how much the pool lifts the base color
    gridFalloff: 0.45,     // grid dims toward the rim (0 = uniform, old look)
  },

  fx: {
    hitDroplets: 8, killDroplets: 22, killChunks: 5,
    splatLife: 20,
    slimeTrailInterval: 0.3, slimeTrailLife: 4,
    poisonInterval: 0.5, poisonLife: 8,
    hitWobbleStart: 0.65, hitWobbleDecay: 1.1,
  },
};

// Apply a named material preset onto the active values (pause menu calls this).
export function applyMaterialPreset(name){
  const p = TUNING.material.presets[name];
  if (p) Object.assign(TUNING.material, p);
}
