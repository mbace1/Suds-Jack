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
    // v246 CONTRAST FLOOR (roadmap-v2 art priority 4, silhouette & readability).
    // The floor's base is 0.085 linear luminance; THUG (0.050), WRAITH (0.059),
    // WEEVA (0.085) and FLIT (0.087) sit AT or BELOW it and read as holes. Two
    // treatments, both keyed to how far under `minLum` a body's own colour
    // is (a bright body gets nothing): a fresnel RIM in the body's own hue
    // lifted toward white, so the silhouette edge lights and the middle keeps
    // its identity; and a value LIFT of the base colour up to minLum (0 = off).
    contrast: { minLum: 0.16, rim: 2.2, rimPow: 2.0, rimWhite: 0.55, lift: 0.6 },
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
    // v255 (PLAYTEST_2026-09-17.md §5.1): the wheel must READ. The old five
    // spikes were 0.12 x 0.30 cones on a 0.68 rim, mostly buried in the tyre —
    // bumps in the lab, nothing at game scale — and a featureless torus
    // spinning about its axle does not change its picture, so the rev-up
    // (the tell before the dash) was invisible. Now: a sawblade, a hub, and
    // spokes, all merged into ONE geometry (6 draw calls -> 1).
    rimSpikes: 8,
    spike: { base: 0.20, length: 0.70, sink: 0.10 },   // sink = how far the cone's base sits inside the tyre
    tube: 0.30,                                        // tyre thickness, x radius — thin enough to leave a hole the spokes show through
    hub: { r: 0.13, depth: 0.16, spokes: 3, spokeW: 0.09, spokeD: 0.09 },   // 3 bars through the centre = 6 arms
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
  // v247 CAMERA — the camera frames the FIGHT, not the floor (js/framing.js).
  // dollyMax is how far in it may come as a fraction of the rest distance;
  // margin is the air kept round the things that matter; ease is the lerp
  // rate coming in and easeOut the rate coming back out (a spawn is arriving
  // on the rim — that is urgent). A pending spawn holds the full arena. Off under
  // REDUCE MOTION, in cabinets, in authored levels and in scrolling arenas.
  camera: { framing: true, dollyMax: 0.35, margin: 3.0, ease: 2.0, easeOut: 5.0,   // out is urgent, in is a mood
            // v260 (owner: "make it stick, zoom out when needed — boss or so, maybe
            // during hazards"): coming IN only happens when the fit moved by more
            // than `hysteresis` x rest distance; coming OUT is always immediate.
            // A boss or a curtain wave pushes the REST itself out, so the whole
            // floor is in frame for the moment that needs it.
            hysteresis: 0.06, zoomOutBoss: 1.18, zoomOutCurtain: 1.10 },

  // v260 THE DROP — every boss floor is a DEPTH (owner: every boss; look AND
  // roster, thematic). depth index = floor((wave - 1) / wavesPer); past the
  // table it cycles from `cycleFrom`. A depth is a LOOK (background, fog,
  // rail, grid density and falloff, vignette, pool) and a ROSTER TILT (its
  // favoured species are drawn twice). The fall between depths is v261; for
  // now the change lands under the black dip with a banner, so the looks can
  // be judged on their own. Every knob here already existed in the floor
  // shader — no new uniform, both render paths untouched.
  // ── WEAPONS (v262) ─────────────────────────────────────────────────────────
  // Five families, ONE IDEA EACH, and the idea is a SHAPE rather than a size:
  //   spread  — covers an arc, poor against one body
  //   burst   — a short burst down one line
  //   laser   — pierces everything on the line
  //   rapid   — pure single-target speed
  //   shotgun — a close-range punch that falls apart at range (was RUSH-only)
  // A pod always DROPS at level 1. Level 2 is EARNED by picking the same
  // family up again, never rolled — and a hit costs you a level, so level 2
  // is what clean play looks like rather than what a lucky drop looks like.
  // `rate` multiplies FIRE_RATE (0.09 s): 1.5 means one cycle every 0.135 s.
  weapons: {
    // spread is the CROWD weapon: measured, a wider arc does NOT stop a body in
    // your face eating three of the five (a dome is a metre across), it only
    // costs coverage at range — so the arc stays and the shotgun earns point
    // blank on its cadence instead
    spread:  { l1: { shots: 5, step: 9,  rate: 1 },   l2: { shots: 7, step: 11, rate: 1 } },
    // burst is CHUNKY where rapid is steady: a bigger volley on a slower
    // cadence for the same damage, and the volley keeps the direction it was
    // fired in, so it punishes tracking a moving target the way rapid does not
    burst:   { l1: { rounds: 4, rate: 2.0 },          l2: { rounds: 6, rate: 2.2 } },
    laser:   { l1: { rails: 1, rate: 1 },             l2: { rails: 2, railGap: 0.55, rate: 1.5 } },
    rapid:   { l1: { rate: 0.45 },                    l2: { rate: 0.30 } },
    // the shotgun OWNS point blank and is nearly useless past it — the one pod
    // that asks you to stand where you are trying not to stand
    shotgun: { l1: { pellets: 5, spread: 0.45, rate: 1.55 }, l2: { pellets: 7, spread: 0.5, rate: 1.5 } },
    // a hit knocks a level off (never past level 1 — being gunless is not a
    // punishment, it is a different game)
    hitCostsLevel: true,
    // how strongly a drop favours a family you are NOT holding (0 = pure random)
    favourUnheld: 0.7,
  },
  // ── THE CAMPAIGN (v263) ────────────────────────────────────────────────────
  // The second door. Geometry Wars 3's shape, which is what the owner named as
  // the reference: a list of ROOMS, each its own arena with its own clock and
  // its own goal, graded S/A/B/C and F for a room you did not survive. A room
  // opens when the one before it is cleared, so the list is a route rather
  // than a menu. The rooms are the authored levels the editor already makes,
  // so a new room is a JSON file and a line here — never new code.
  campaign: {
    rooms: ['first-light', 'three-rings', 'boost-lane'],
    // kills per second the room's own duration is graded against. Deliberately
    // gentler than RUSH's ladder (0.5/0.9/1.4/2.0): a room is a first meeting
    // with an arena, not a score attack you have already learned.
    tiers: { C: 0.35, B: 0.65, A: 1.0, S: 1.5 },
  },
  depth: {
    wavesPer: 8,
    cycleFrom: 1,
    // v261 THE FALL — between depths. Two styles, both shipped (owner: "we can
    // try both"), one toggle in OPTIONS:
    //   floor  — the camera holds; the old floor and rail drop away into the
    //            dark, the look switches, the new floor rises to meet you.
    //   follow — the camera and you fall together; the old floor leaves the
    //            top of the frame, the new one comes up from below.
    // `depth` is how far (world units), `dur` how long. You are invulnerable
    // for it, and nothing spawns until the new floor is under you.
    fall: { style: 'floor', dur: 1.9, depth: 34, dark: 0.65, streaks: 5 },
    looks: [
      { name: 'THE SURFACE', bg: 0x0d0d1a, rail: 0x5555cc, fogNear: 42, fogFar: 80, gridScale: 1.0, gridFall: 0.45, vignette: 0.55, poolLift: 0.30,
        base: [0.079, 0.079, 0.169], gridHi: [0.0, 0.55, 0.50], gridGlow: 1.0,   // the floor's own colours (linear) — the shipped look, verbatim
        favour: [] },
      { name: 'THE WELL',    bg: 0x081a1c, rail: 0x33ccbb, fogNear: 30, fogFar: 66, gridScale: 1.6, gridFall: 0.30, vignette: 0.65, poolLift: 0.36,
        base: [0.030, 0.105, 0.115], gridHi: [0.10, 0.70, 0.60], gridGlow: 1.1,
        favour: ['SPLITTA', 'WEEVA', 'RIBBON', 'SLUG'] },                 // the fish: what schools and arcs
      { name: 'THE VEIN',    bg: 0x1a0708, rail: 0xdd3344, fogNear: 36, fogFar: 74, gridScale: 0.6, gridFall: 0.20, vignette: 0.45, poolLift: 0.22,
        base: [0.130, 0.030, 0.040], gridHi: [0.85, 0.16, 0.22], gridGlow: 0.9,
        favour: ['SPITTOR', 'FANNER', 'PYRA', 'DRAPER', 'BOTFLY'] },     // the bullets: what shoots, and what bites when it dies
      { name: 'THE VOID',    bg: 0x030308, rail: 0x332244, fogNear: 18, fogFar: 46, gridScale: 1.0, gridFall: 0.95, vignette: 0.85, poolLift: 0.55,
        base: [0.012, 0.012, 0.022], gridHi: [0.18, 0.10, 0.32], gridGlow: 0.35,
        favour: ['CLOAKER', 'MAGNA', 'SIREN', 'TORO', 'WARDEN'] },       // the dark: what ambushes, pulls, screams, charges
    ],
  },

  // v245 CROWD — the swarm's spacing (js/crowd.js). contact = ra + rb + pad;
  // comfort is a multiple of contact; push is the FOLLOWING DISTANCE — u/s
  // the body behind is held off the body ahead at contact, fading to 0 at
  // comfort (a pursuer settles where it balances its own speed, so push must
  // beat the fastest chaser or it never bites); slide is u/s the body behind
  // flows round the body ahead.
  crowd: { pad: 0.6, comfort: 1.5, push: 4.0, slide: 5.0, passes: 2 },   // pad was 0.25 for 244 versions; it is the number that un-piled the swarm

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
      TORO: 'COMMIT', BAMBU: 'HOLDER', PYRA: 'FIXED', OMEGA: 'MASS',   // v253: PYRA has speed 0 — HUNTER's dodge was nudging a turret
      BOTFLY: 'HOLDER', WARDEN: 'SUPPORT', BULWARK: 'MASS', SIREN: 'SUPPORT',
      CLOAKER: 'HUNTER', MAGNA: 'SUPPORT',
      GRUNT: 'SCHOOL', BRUTE: 'MASS', ORB: 'SUPPORT', PROG: 'DARTER', MINDER: 'SUPPORT',
      GHOST: 'SCHOOL', WRAITH: 'COMMIT',
      FLIT: 'SCHOOL', SPITTLE: 'HOLDER', CHARGER: 'COMMIT', HOPPER: 'DARTER',
      TURRET: 'FIXED', TROOPER: 'HOLDER',
      THUG: 'DRIFTER', DRAPER: 'HOLDER',
      PRISM: 'MASS', CUSTODIAN: 'MASS', SHEPHERD: 'HERDER',
      RIBBON: 'SCHOOL', SLUG: 'SCHOOL',   // v251: the arc-movers (steer themselves; the role is for the flock)
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
  // v251 ARC-MOVERS (testers) — the shipped movement model has no turn-rate
  // limit; these two bodies carry their own (PROGRESSION_DESIGN.md §8.9).
  arc: {
    turnRate: 2.2,      // rad/s — the ceiling on how fast a heading may change
    weaveHz: 1.7,       // the serpentine's rate (matches movement.weaveSpeed)
    weaveAmp: 0.55,     // rad of heading offset at full swing
    slug:   { segments: 11, spacing: 0.50, headR: 0.46, tailR: 0.18, minSplit: 4 },   // v253: shorter than minSplit shortens instead
    ribbon: { samples: 22, step: 0.30, width: 0.34 },   // body = samples x step long
  },

  waves: {
    // escalation — getWaveScale: difficulty knees at `knee`, then slow creep
    scale: {
      knee: 10,
      speed:    { base: 1.1, ramp: 0.09,  post: 0.02,  cap: 2.4 },
      interval: { base: 1.0, ramp: 0.055, post: 0.010, floor: 0.35 },
      earlyEase: { until: 6, per: 0.012 },   // waves 1-5 shave a little speed
    },
    // cadence — waveKind: every 8th boss, every 4th spike, every 3rd swarm
    // v257 CURTAIN (owner: "hazard wave of bullets was great"): every 6th wave
    // from 6 is bullet-heavy — the shooters get the bigger share and two extra
    // seats; in CLOSE COMBAT the draw leans on the biters, whose corpses are the
    // bullets there. Precedence: boss > spike > curtain > swarm.
    rhythm: { bossEvery: 8, spikeEvery: 4, swarmEvery: 3, swarmFrom: 3, curtainEvery: 6, curtainFrom: 6 },
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
      RIBBON:      [2, 3],   // v251 TESTER — arc-mover candidate (PROGRESSION_DESIGN §8.9); cost 3 keeps it out of swarm groups
      SLUG:        [2, 3],   // v251 TESTER — eat it from an end, or it splits
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
      RIBBON:      [2, 3], SLUG:      [2, 3],   // v251 testers, both modes
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
      kind: { boss: 2.0, spike: 1.4, swarm: 1.25, curtain: 1.2, prize: 0.8, breather: 0.6, normal: 1.0 },
      early: { until: 6, base: 0.85, step: 0.03 },   // −15% at wave 1, gone by 6
      min: 6,                                       // v257 (B6): wave 1 was one body and a shooter — a floor, so the first round is a round
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
      // v258 THE LIVE FLOOR. The caps above bound what a wave DRAWS; nothing
      // bounded what STANDS. v256's carry-over stacks survivors under the next
      // wave's full draw, and the soak found the result: CLOSE COMBAT peaked
      // at 29 bodies through wave 12 and **91** past wave 30, with ms/step
      // 0.44 -> 2.27. A queued front now WAITS while the floor is this full
      // (the wave's own cap x liveMult) — the same gate as the pull-in, from
      // the other side. The clock still ends the round, so a stalled front
      // simply never lands, which is the honest outcome of a floor you are
      // not clearing.
      liveMult: 1.5,
      // Children (SPLITTA's spawn, the MINIs, a SLUG's split) never go through
      // the pump — they are the consequence of your own kills, not the
      // director pouring, so they are not held. But they are not free either:
      // the soak found 95 bodies alive past wave 30 against a live cap of 31.
      // This is a SAFETY VALVE at liveMult x this, not a design rule: normal
      // play never reaches it, and a floor that does has stopped being legible.
      childMult: 2,
    },
    // deliberate-shooter plan: 1 at wave 1 growing to capMax by ~wave 12
    shooterPlan: { capBase: 1, capPerWaves: 3, capMax: 5, swarmCap: 1, bossCap: 2,
                   budgetShare: 0.35, slack: 2, first: 0.8, gap: 2.5, gapRand: 1.5,
                   curtainShare: 0.6, curtainCapBonus: 2, curtainGap: 1.2 },   // v257: the curtain wave — shooters arrive close, or the floor sits empty between them
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
    // v256 (owner: "wave number. Waves can be 12-15 secs"): a classic round is
    // a CLOCK now, by kind, and its bodies arrive as PULSES across it instead
    // of a 3-second pour. The playtest measured rounds at 5-8 s because the
    // wave ended the moment the floor was empty; with fronts spread across
    // the round the earliest an empty floor can end it is after the last
    // pulse, and the clock ends it otherwise — survivors carry over.
    // Escalation stays on the WAVE NUMBER, so wave 10 arrives later in wall
    // time than it used to (~2 min, was ~1). Shooters keep their own spaced
    // schedule (shooterPlan); bosses keep t = 0. Rush, SMASH TV, cabinets and
    // authored levels keep their own pacing.
    // v257 (owner: "add a bit of length, maybe variety, but always emphasize
    // flow"): a touch longer, and the fronts take a different SHAPE per kind —
    // a swarm is four quick fronts, a spike is two heavy ones, a boss is the
    // boss and then two late fronts, a curtain is three.
    round:  { normal: 14, swarm: 12, spike: 15, boss: 16, curtain: 15, prize: 12, breather: 12 },
    gateRetire: 4,   // v257: the oldest gate lingers this long past the wave boundary, then goes
    pulses: { count: 4, span: 0.75, stagger: 0.25, swarmStagger: 0.12,   // pulse k lands at from + k/(count-1) x span x round
              byKind: { swarm: { count: 5, span: 0.78 }, spike: { count: 3, span: 0.60 },
                        boss: { count: 3, span: 0.50, from: 0.28 }, curtain: { count: 3, span: 0.70 } },
              // v257 FLOW: the bot measured ~5 s of EMPTY FLOOR per round with
              // fronts on a fixed schedule — clear one, wait for the next. A
              // front now PULLS IN when live bodies drop to `pullIn` or fewer,
              // never sooner than `pullGap` after the previous front landed.
              // The clock stays the ceiling; a strong player shortens the round.
              pullIn: 2, pullGap: 1.5 },
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
    // v254 (playtest: 37 corpse bullets in flight at wave 2 in the default
    // mode, classic 0.8; the bot died in two-thirds the time). Revenge is a
    // SPECIES trait now, not a mode-wide rule: only these corpses bite back —
    // the ten shooters, whose living fire is the one you already learned —
    // and none before `fromWave`. Bosses always bite (a boss corpse is an
    // arena event). `fieldCap` is live corpse bullets on the floor; a bloom
    // that would exceed it is skipped. PROGRESSION_DESIGN.md §7 Q3/Q5.
    biters: ['SPITTOR', 'FANNER', 'WEEVA', 'ORANGE_CUBE', 'PURP_CUBE',
             'BAMBU', 'PYRA', 'BOTFLY', 'CLOAKER', 'DRAPER'],
    fromWave: 3,
    // v258: the cap was a flat 24 and the soak showed it BINDING from wave 6
    // to wave 40 — CLOSE COMBAT's bullet pressure was flat across 34 waves
    // (peak revenge 27 early, 31 late) while classic's living fire climbed to
    // 86. A cap that never lifts is a difficulty ceiling, not a safety net.
    fieldCap: { base: 14, per: 1.2, max: 44 },
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
    // v228 ARENA PASS 2 (roadmap-v2 Phase 3): the floor now answers three
    // more things happening on it, each a fixed-size point array (branch-free
    // in the shader — an unused slot carries strength 0, not a skipped
    // iteration, so both render paths stay simple loops, no dynamic control
    // flow). Same "cheap fragment terms" discipline as v223, not a new
    // technique: no render-to-texture, no per-object floor projection.
    massSample: 10, massRadius: 0.22, massDark: 0.14,   // the swarm presses the ground darker where it's thick
    popCount: 6, popLife: 0.55, popRadius: 0.07, popBright: 0.85,  // a kill rings out and fades
    prizeCount: 5, prizeRadius: 0.05, prizeGlow: 0.32,  // pickups mark their own ground
    // v240 LEVEL SHAPES (LEVEL_EDITOR_DESIGN.md §2.3): the floor draws the
    // playable region when a level is running. The same trick as the point
    // arrays above — a FIXED array of shape slots evaluated branch-free on
    // both paths (an unused slot is neutral for the combine, never a skipped
    // iteration). shapeSlots is also the format's cap on `arena.shapes`
    // (js/level.js MAX_SHAPES must equal it; level-check.mjs asserts so).
    shapeSlots: 4,
    shapeEdge: 0.45,       // world units: the soft edge band either side of the boundary
    shapeOutside: 0.22,    // how much of the floor colour survives outside the region
    shapeEdgeGlow: 0.55,   // the boundary line's brightness (the border rail's colour)
  },

  // v224 RUSH MODE (owner direction, 2026-08-24; design in the Godot port's
  // RUSH_MODE.md). Its own ruleset, not a modifier: ROGUELIKE and DAILY do not
  // apply inside it. The single rule everything hangs off — BOOST is the good
  // option and the gun is what you take when you cannot afford to boost:
  // boosting grants invulnerability and kills on contact, and PULLING THE
  // TRIGGER CANCELS THE SHIELD. Heat is the shared cost of both.
  rush: {
    boostSpeed: 17,          // walking is 6 — boost is travel AND attack
    heat: {
      boostRate: 0.55,       // ≈1.8s of continuous boost from cold
      perShot: 0.02,         // the gun runs warm, not hot
      coolRate: 0.42,        // ≈2.4s to shed a full meter
      clearAt: 0.35,         // hysteresis: no fluttering on the edge
    },
    // v225 THE ROSTER — Blade Rush's own bodies, not the main game's 21-type
    // ecology. Its named enemies are Chompers, Snakes, asteroids and Coolers,
    // so Rush starts with four and nothing else: things you boost THROUGH.
    // No shooters — a gun club would make standing still the answer, which is
    // the opposite of the mode. Order is draw order; append, don't reorder.
    pool: {
      GLOBBO:      [1, 1],   // CHOMPER  — plain body, lunges at you
      YELA_CUBE:   [1, 1],   // COOLER   — killing one vents heat (below)
      SPLITTA:     [2, 3],   // SNAKE    — splits into a train of minnows
      SLUDGE_CUBE: [3, 2],   // ASTEROID — slow mass that ploughs a lane
    },
    // The COOLER earns its name: boost-killing one sheds heat, so the roster
    // feeds the mode's economy instead of just standing in front of it.
    cooler: 'YELA_CUBE', coolerVent: 0.22,
    // RUSH keeps its OWN shotgun cadence. The same mode is a classic pod now
    // (TUNING.weapons.shotgun), and that pod is tuned to own point blank in a
    // game you play at arm's length — dropped into RUSH it is a 2.2x buff to
    // the mode's only gun, which is a rebalance of RUSH nobody asked for.
    shotgun: { pellets: 5, spread: 0.5, rate: 3.4 },
    chain: { perKill: 1, cap: 100, window: 2.5 },         // boost kills only
    lives: { start: 3, extraEvery: 25000 },
    levels: { first: 60, second: 90, step: 30 },          // then +30s each
    // v227 TIERS (RUSH_DESIGN.md §3.2): reference kills/s per grade, ported
    // from the Godot repo's unshipped tier research and unvalidated against
    // real JS playtest data — first playtest owns these, not the method.
    // A level's PAR kill count is tier-rate × that level's own duration.
    tiers: { C: 0.5, B: 0.9, A: 1.4, S: 2.0 },
    // v232 ABILITIES (PR #311 / PARITY_WITH_GODOT.md §1b): ported from the
    // Godot port's four selectable abilities, owner direction 2026-08-28 —
    // this build leads on gameplay, so this is now the reference version, not
    // a copy. Numbers are new (the port's source wasn't available to derive
    // exact values from) and unvalidated, same standing as the tier table
    // above. One is picked before a run (OPTIONS, default 'none') and fires
    // on the dash button, which boost leaves completely unclaimed in Rush.
    abilities: {
      heatExchange: { minHeat: 0.15, radiusBase: 3, radiusPerHeat: 5, cooldown: 8 },
      hyperBomb:    { radius: 10, cooldown: 22 },
      overcharge:   { duration: 4, cooldown: 16 },   // free boost heat, chain x2
      quantumShield:{ duration: 3, cooldown: 18, reflectRadius: 0.9 },
    },
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
