// tuning.js — every number in the game lives here. Never duplicate a tuned
// constant in code: import it. spec/toko2.json (the Godot port's seam) will be
// emitted from this file, so a number that lives anywhere else is a number the
// port re-derives by guesswork.
//
// World units are 1.x's own (owner, 2026-10-20: "gameplay on par, copy the
// things that work"). The arena is 1.x's, so every 1.x number ports as it is
// instead of through a rescale. Axes: x across the screen (right +), y up,
// z toward the bottom of the screen. The arena is centred on the origin.
import { SPECIES } from './tuning/species/index.js?v=14';
import WAVES from './tuning/waves.js?v=14';

export const TUNING = {
  render: {
    clearColor: 0x0d0d1a,   // 1.x's background: the void past the floor, and the UI's ground
    maxPixelRatio: 2,       // a Pixel 10 Pro reports ~3; full-res HD gels at 2 are plenty
  },

  // 1.x's arena presets (main.js:20-33), picked at the start of each run by
  // the screen's shape. Half sizes.
  arena: {
    landscape: { hx: 19, hz: 11, tiltDeg: 28.2 },   // 38 x 22; camera ray atan(11/20.5)
    portrait:  { hx: 11, hz: 18, tiltDeg: 41.6 },   // 22 x 36; camera ray atan(24/27)
  },

  // One fixed view of the whole arena, refitted on every resize and rotation.
  camera: {
    fov: 60,                // 1.x's vertical FOV
    near: 0.5,
    far: 400,
    margin: 0.05,           // NDC kept clear around the arena (1.x fits to 0.96 / 0.93)
    searchMin: 5,
    searchMax: 200,
  },

  // 1.x's floor (FLOOR_FRAG, the studio-default depth). Colours are what 1.x
  // put on screen; grid cells are square at 1.286 units.
  floor: {
    base: 0x14142b, gridLo: 0x211261, gridHi: 0x008c80,
    gridCell: 1.286, gridLine: 0.012, gridGlow: 0.55,   // line half-width in cells; strength
    vignetteInner: 0.55, vignetteDepth: 0.55, gridFalloff: 0.45,
    poolRadius: 0.30, poolLift: 0.30,
    rail: 0x5555cc, railHeight: 0.05,
  },

  // 1.x's lights (main.js:774-779): white ambient and one sun. No tone mapping.
  light: {
    ambient: 0.45,
    sun: { intensity: 1.3, position: [8, 20, 10] },
    // 2.0's ARENA LIGHT (render/light.js; owner, 2026-10-22: the graphics
    // pass's third step, no reflective floor). A top-down light map of the
    // arena, perMetre texels a metre: soft pools of light (k = strength, in
    // the colour of what threw it; r in metres) and contact shadows (r × the
    // body's radius). `floor` is how the floor reads it: light lifts the
    // whole floor by `spill` and its grid lines by `grid`.
    arena: {
      perMetre: 12, pow: 1.6, cap: 640, burstCap: 64,
      bullet: { hero: { r: 0.9, k: 0.10 }, gel: { r: 1.15, k: 0.16 } },
      burst: {
        kill: { r: 4.0, k: 1.4, life: 0.32, big: 1.6, boss: 2.4 },   // a kill; a big or boss kill multiplies its strength (and its reach by the root)
        dash: { r: 4.5, k: 1.1, life: 0.3 },                          // the dash boom
        muzzle: { r: 1.3, k: 0.35, life: 0.06 },                       // each of the hero's shots
      },
      shadow: { cap: 300, r: 1.35, strength: 0.6 },
      floor: { spill: 0.18, grid: 0.9 },
    },
  },

  // The gelatin: 1.x's satin preset (tuning.js `material`), per-family
  // overrides, and the contrast floor that rims a body too dark to read.
  material: {
    sss: 0.70, roughness: 0.16, clearcoat: 1.00, clearcoatRoughness: 0.06,
    sheen: 0.45, transmission: 0.15, thickness: 0.8, ior: 1.38,
    contrast: { minLum: 0.16, rim: 2.2, rimPow: 2.0, rimWhite: 0.55, lift: 0.6 },
    families: {
      blob: {},
      cube: { roughness: 0.10, transmission: 0.25, jelly: { transmission: 0.82, roughness: 0.07 } },   // firmer candy-glass
    },
    // 2.0's JELLY (owner, 2026-10-22: the graphics pass, "real gelatin" first,
    // held to their melon-jelly reference: refraction and Beer–Lambert colour).
    // The body is mostly see-through: the floor bends behind it, and the hue
    // is carried by absorption, so light that crosses a thick belly comes out
    // deep and saturated while a thin edge stays pale and bright. The surface
    // colour is the hue lifted toward white by `tintWhite` (three multiplies
    // transmitted light by it as well as by the absorption); `attenuation` is
    // the distance, in body radii, over which white light becomes the hue.
    // `thickness` is local units (the unit dome is ~2 across). The hero keeps
    // 1.x's white satin. `on: false` puts every gel back on 1.x's satin.
    // `core`: an inner glow in the full hue where the body faces you (light
    // scattered inside the jelly), so a gel keeps its colour over the dark
    // floor it lets through; `corePow` how tightly it gathers to the middle
    jelly: { on: true, transmission: 0.92, roughness: 0.05, thickness: 1.6, ior: 1.36, tintWhite: 0.6, attenuation: 0.85, sss: 0.3, dispersion: 0, core: 0.32, corePow: 1.6 },
  },

  // What the jelly reflects (render/env.js, 2.0's): a studio painted in code —
  // the room's dark gradient, a soft box overhead that slides across every
  // crown, and strip lights on the horizon that catch the sides (one in the
  // grid's teal, one warm opposite). `intensity` is scene.environmentIntensity.
  env: {
    on: true, size: 512, intensity: 0.9,
    zenith: 0x1a1c33, horizon: 0x2a2d4a, floor: 0x0d0d1a,
    softbox: { color: 0xffffff, strength: 0.85, depth: 0.22 },
    strips: [
      { bearing: 70, width: 38, height: 0.06, span: 0.05, color: 0x7fffe0, strength: 0.9 },
      { bearing: 250, width: 38, height: 0.06, span: 0.05, color: 0xffc890, strength: 0.75 },
    ],
  },

  // The blob's shape and life (1.x `blob`): a dome with a rounded flat
  // bottom, squat by default, per-species silhouettes, a breath, and a smear
  // along the floor when it moves.
  blob: {
    domeCut: 0.7, domeRound: 0.22,
    shape: { x: 1.05, y: 0.82, z: 1.05 },
    shapes: {
      spittor: { x: 1.02, y: 0.78, z: 1.26 },     // snouty
      fanner:  { x: 1.30, y: 0.66, z: 1.08 },     // wide flat pancake
    },
    breatheAmp: 0.13, breatheAmpSplitta: 0.18, breatheHz: 2.4,
    dragStretchPerSpeed: 0.10, dragMax: 0.35, rearDragTilt: 0.35,
    hitRipple: 0.28,        // seconds a hit ripple takes to die out
    // 2.0's dent (the graphics pass): a shot pushes the jelly in where it lands
    // and the dent springs back with an overshoot, over the ripple's 0.28 s.
    // `depth` in radii, `focus` how tightly it gathers round the impact,
    // `freq` rad/s and `damp` 1/s of the spring. 1.x only rippled.
    dent: { depth: 0.24, focus: 5.5, freq: 34, damp: 9 },
    death: 0.28,            // seconds a dying gel thrashes, swells and fades before it bursts
    deathSwell: 1.3,        // how much bigger it gets by the end
  },

  // The hero's body (1.x player.js): a white satin sphere, calmer than the
  // gels, with black eyes that face the last shot. Times are seconds; the
  // blinks are 1.x's opacity curves, base + amp·|sin(rate·t)| on the timer.
  heroLook: {
    wobble: 0.6,            // 1.x uWobble on the hero (player.js:65); the gels wear 1.0
    // 1.x's black ovals (player.js:81-93, 478-494): r 0.13 scaled (0.55, 1.15,
    // 0.4), a 0.042 glint. 1.x set them 0.4 forward and 0.16 up, which buried
    // them in the body (player-controls.md §14.2); 0.44 / 0.18 stand them proud.
    eye: { r: 0.13, scale: [0.55, 1.15, 0.4], forward: 0.44, side: 0.14, up: 0.18, glint: 0.042 },
    opacity: 0.98,          // the body at rest (player.js:63)
    flashColor: 0xff1100,   // red emissive from the hit to the END of mercy (player.js:266-273, 329-331)
    mercyBlink: { base: 0.3, amp: 0.7, rate: 12 },    // opacity through mercy (player.js:328)
    dashBlink: { base: 0.35, amp: 0.65, rate: 55 },   // opacity through a dash (player.js:280-282)
    // dash ghosts: one every 0.03 s from the dash's first step (the sim emits
    // a `ghost` event each time, 6 a dash), pooled 7, living 0.28 s at
    // opacity 0.45·t and scale 0.6 + 0.4·t (player.js:13-15, 70-78, 284-294, 336-348)
    ghost: { count: 7, every: 0.03, life: 0.28, color: 0x88bbff, opacity: 0.45, scale: 0.6 },
    // the muzzle pop (player.js:99-108, 351-359, 467-474): at radius + 0.35
    // along the shot, y 0.3, 0.05 s, opacity 0.9 → 0 while it swells 0.6 → 1.4
    muzzle: { r: 0.2, color: 0xaaffcc, life: 0.05, opacity: 0.9, scale: [0.6, 1.4], offset: 0.35, y: 0.3 },
    // the lunge (player.js:371-385), per 60 Hz step from the post-clamp
    // position: walking settles at 0.15, a dash caps at 0.45. The sim keeps
    // it (hero.stretch, stretchX/Z) so the view only copies it.
    stretch: { vel: 0.4, perSpeed: 0.025, max: 0.45, ease: 0.35, minSpeed: 0.3 },
    // the red screen vignette on a hit (main.js:4798, 5550-5564): alpha
    // (t / 0.32)·0.55 from 0.35·min(cx, cy) to 1.05·max(cx, cy); off under reduce motion
    vignette: { life: 0.32, alpha: 0.55, inner: 0.35, outer: 1.05 },
    haptics: { hit: 35, death: [50, 40, 90] },        // navigator.vibrate ms (haptics.js:25, 30)
    deathShake: 0.9,        // the fatal hit's extra shake, on top of the hit's (main.js:9033)
  },

  // ── the game ──────────────────────────────────────────────────────
  // 1.x numbers (js/player.js, js/bullet.js, js/input.js, js/enemy.js at
  // v268), on 1.x's own arena, so none of them needs a rescale.
  sim: { dt: 1 / 60, maxSteps: 5 },       // fixed step, and the most a frame may catch up

  input: {
    stickRadius: 60,        // px of thumb travel for a full stick (1.x STICK_RADIUS)
    aimDeadzone: 15,        // px before the aim stick aims and fires (1.x AIM_DEADZONE)
    padDeadzone: 0.2,       // 1.x GP_DEADZONE
    pauseStripHeight: 56,   // the top-centre pause strip on touch (1.x)
    pauseStripHalfWidth: 40,
  },

  // The hero, as 1.x played it (player.js; docs/port-1x/player-controls.md
  // §3-§9). Every timer is 1.x's per-frame one, ticked once a 60 Hz step,
  // so the frame-quantised feel ports exactly: a dash is 11 steps, its
  // cooldown runs out 45 steps after it ends, the gun fires every 6th step.
  hero: {
    radius: 0.5,            // the body, and the hitbox (1.x PLAYER_RADIUS, player.js:17)
    hitRadius: 0.5,         // a gel bullet hits at its 0.15 + 0.5 from the centre (main.js:10840-10853)
    speed: 6,               // walk, u/s; no acceleration, an analog stick walks slower (SPEED, player.js:5, 320-321)
    dashSpeed: 26,          // DASH_SPEED (player.js:6)
    dashTime: 0.18,         // DASH_DUR (player.js:7): 11 steps, 4.77 u, i-frames through the 10 before it ends
    dashCooldown: 0.75,     // DASH_CD (player.js:8), from the dash's END; a press inside it is lost (no buffer)
    // 1.x dashes along the RAW move stick (main.js:9156-9158, player.js:247-249),
    // so half a stick is half a dash; only with no move at all does it take the
    // last shot's direction. true normalises it (player-controls.md trap T1).
    dashNormalise: false,
    fireEvery: 0.09,        // FIRE_RATE (player.js:9), ASSIGNED on each shot, not carried (player.js:465): 6 steps, 10/s
    muzzle: 0.3,            // a shot leaves at radius + 0.3 = 0.8 from the centre (player.js:402-403)
    mouseNoAim: 0.5,        // the mouse does not aim (so cannot fire) within this of the centre (main.js:9235)
    rapidMult: 0.4,         // the fire-rate pickup's period while `rapid` runs (player.js:416); the pickup lands with the gates
    // 1.x's pickups, which land with the gates: taken within reach + radius
    // (main.js:11242), each timer takes the LONGER of what it has and what it
    // is given (player.js:177-178; hero.js grantInvincibility / grantRapid)
    pickup: { reach: 0.8, invincible: 3.0, rapid: 8.0 },   // main.js:11242, 11249, 11268
    aim0: [1, 0],           // _lastAim before the first shot: screen-right (player.js:32; 1.x's reset() kept the last run's, player.js:191-232)
    lives: 3,               // MAX_HP: lives are hp, a lost one does not respawn (player.js:10)
    mercy: 1.2,             // MERCY_DURATION (player.js:11), from a non-fatal hit
    flash: 0.25,            // the red hit flash (player.js:238); the body stays red until mercy ends
    // The dash is 1.x's (i-frames, it passes through bodies) and upgrades
    // (owner, 2026-10-21): level 1 KILLS what it passes through (a boss takes
    // one hit a dash); level 2 adds 1.x's dash boom, a ring of hero bullets
    // from where the dash's first step left you (1.x main.js:10216-10224, a
    // roguelike card). The pickups that raise the level land with the gates.
    // Touching = within the body's radius + reach: the hero's own radius, so a
    // dash cuts exactly what would have hurt to walk into (1.x's contact test,
    // e.radius + PLAYER_RADIUS, main.js:10895). 1.x's one body-cutting dash
    // (NEX DEUS, a cabinet) reached 0.2 further and HIT for 1 rather than
    // killing (main.js:10166-10183); bossHits is that 1, once a pass.
    dashKill: { reach: 0.5, bossHits: 1 },
    dashBoom: { count: 12, shake: 0.18, color: 0xff8844 },   // 12 rays, addShake(0.18), 0xff8844 (main.js:10216-10225)
    // The PUSH dash, on test beside 1.x's pass-through (owner, 2026-10-22: "the
    // pushing dash should be tested as it may be a better dynamic, allowing
    // for more bullet sponge enemies"). The world's `dashMode` picks ('pass' |
    // 'push'); the title's DASH switch sets it. It began as 2.0 v3-v4's
    // body-check (one knock of 11 at first contact, world.js:113-123 at v4),
    // and measured, that opened almost no room: the hero overtakes what it
    // just shoved and ends the dash inside the crowd (gap to the four nearest
    // gels at 0.5 s: 0.89 with PASS, 1.02 with v4's shove). So it PLOUGHS:
    // every step a body is within `reach` of the dashing hero it is kept
    // moving straight away at no less than force × heavy / its radius, and it
    // slides out on the core's knock friction (gel.knockFriction 3): 2.09 at
    // 0.5 s, 1.45 at 1.0 s. A small gel flies, a boss barely moves; planted
    // bodies (the ANCHORED affix, the FIXED role) do not move at all. At dash
    // level 1 the first touch of a dash also hurts.
    push: { reach: 1.5, force: 18, heavy: 0.55, plough: true, squash: -0.45, hurt: 1 },
    // The CUT dash (owner, 2026-10-22: "likely we want dashes that go through
    // and do damage in the end"): 1.x's pass-through, with the dash level 1
    // cut from the start, as damage. Every body it passes takes `hits` (2 is
    // 0.2 s of the gun: at GEL HP ×1 it kills every body of 2 hp or less —
    // GLOBBO, YELA, SLUDGE, BAMBU, BOTFLY and the minis — and takes 2 off the
    // rest). It touches as the level 1 cut does
    // (dashKill.reach); from dash level 1 a body that is not a boss dies outright.
    cut: { hits: 2 },
    color: 0xffffff,        // 1.x: white satin (player.js:61)
    // 1.x's weapon pods (tuning.js:141-160, main.js:1985-2005, player.js:404-464):
    // one table, two levels a family; `rate` multiplies fireEvery. A pod drops
    // at level 1, the same family again earns level 2, and a hit knocks level
    // 2 back to 1 — never off. HOMING is enemy-only since v88 (BOTFLY). The
    // pods themselves land with the gates; `color` is each pod's orb (L1, L2).
    weapons: {
      spread:  { l1: { shots: 5, step: 9, rate: 1 }, l2: { shots: 7, step: 11, rate: 1 }, color: [0xffcc44, 0xffee11] },
      burst:   { l1: { rounds: 4, rate: 2.0 }, l2: { rounds: 6, rate: 2.2 }, color: [0x44ffcc, 0x11ffee] },
      laser:   { l1: { rails: 1, rate: 1 }, l2: { rails: 2, railGap: 0.55, rate: 1.5 }, color: [0xff3355, 0xff1133] },
      rapid:   { l1: { rate: 0.45 }, l2: { rate: 0.30 }, color: [0xaa55ff, 0xcc22ff] },
      shotgun: { l1: { pellets: 5, spread: 0.45, rate: 1.55 }, l2: { pellets: 7, spread: 0.5, rate: 1.5 }, color: [0xff8833, 0xffaa22] },
      hitCostsLevel: true,
      favourUnheld: 0.7,     // how strongly a drop favours a family you are NOT holding
    },
    // 1.x's squash spring, per 60 Hz step (player.js:362-365): a dash
    // stretches it tall (player.js:252), a hit flattens it (player.js:241)
    sq: { spring: 0.28, damp: 0.84, min: 0.55, max: 1.55, dash: 0.6, hit: -0.9 },
  },

  bullets: {
    heroSpeed: 24,          // 1.x PLAYER_BULLET_SPEED
    heroRadius: 0.15,       // 1.x BULLET_R
    heroDamage: 1,
    gelSpeed: 7,            // 1.x ENEMY_BULLET_SPEED; never escalates with the wave
    gelRadius: 0.15,
    life: 4,
    maxHero: 200,           // separate pools, so a dense field never silences your gun
    maxGel: 300,            // 1.x's shared pool size
    heroColor: 0x66ffcc,    // 1.x's player halo
    gelColor: 0xff5533,     // 1.x's default enemy bullet
  },

  graze: { radius: 1.2, points: 25 },   // 1.x: a gel bullet passing this close while you are vulnerable, once each

  // 1.x's score (main.js:4421-4453): every kill pays 100 × the streak, and the
  // streak only resets when you are hit. A banner every 25,000; no extra lives.
  score: { perKill: 100, milestone: 25000 },

  gel: {
    // 1.x: a bullet never moves a body. Knock (kx, kz) is for whatever throws
    // a body — nothing in the roster does yet.
    knockFriction: 3,       // knock velocity decays this fast (1/s); only the PUSH dash knocks: 3 lets a shoved gel slide out (it was 6, under which a shove opened no room)
    wallBounce: 0.6,        // a wall returns this share of the knock
    appear: 0.3,            // seconds a new gel swells into being; it can neither hurt nor be hit
    flash: 0.12,            // 1.x hit flash
    // 1.x's squash spring, per 60 Hz step (enemy.js:2728-2729), and its kicks
    sq: { blob: [0.24, 0.86], cube: [0.18, 0.90], hit: -0.75, wall: -0.3 },
    contactRadius: 0.5,     // touching: within the body's radius + 0.5 (1.x main.js:10886-10906)
  },

  // SURVIVAL's director: pressure rises over `ramp` seconds and then holds.
  // 1.x pops bodies in on an ellipse at 0.85 of the arena.
  director: {
    firstSpawn: 0.6,
    ramp: 600,
    spawnEvery: [1.4, 0.45],
    maxAlive: [8, 30],
    groupOf: [1, 3],
    ring: 0.85,
    clearOfHero: 6,
    secondsPerWave: 12,      // SURVIVAL reads ARCADE's roster as if a wave passed this often
  },

  // Every species: one file each under tuning/species/ (1.x's CFG rows and
  // each species' own numbers).
  species: SPECIES,

  // ARCADE's waves (tuning/waves.js).
  waves: WAVES,

  // 1.x's crowd solver (crowd.js, tuning.js:284): bodies keep a pad apart, and
  // one closing on the hero behind another is pushed back and slid aside
  crowd: { pad: 0.6, comfort: 1.5, push: 4.0, slide: 5.0, passes: 2 },

  // 1.x's swarm forces (v210; tuning.js:287-319): each species takes a share
  // of dodge (sidestep the hero's bullets), flock, the wave's current and a
  // weave, by its role
  movement: {
    roles: {
      SCHOOL:  { dodge: 0.9, flock: 1.0, current: 1.0,  weave: 0 },
      DARTER:  { dodge: 1.0, flock: 0.5, current: 0.9,  weave: 0.5 },
      DRIFTER: { dodge: 0.3, flock: 0.6, current: 1.0,  weave: 0.25 },
      HUNTER:  { dodge: 0.4, flock: 0,   current: 0.5,  weave: 0.8 },
      HOLDER:  { dodge: 0,   flock: 0,   current: 0.25, weave: 0 },
      COMMIT:  { dodge: 0,   flock: 0,   current: 0.15, weave: 0 },
      MASS:    { dodge: 0,   flock: 0,   current: 0.10, weave: 0 },
      FIXED:   { dodge: 0,   flock: 0,   current: 0,    weave: 0 },
      SUPPORT: { dodge: 0.5, flock: 0.3, current: 0.6,  weave: 0.3 },
      HERDER:  { dodge: 0.6, flock: 0,   current: 0.3,  weave: 0.2 },
    },
    weaveSpeed: 1.7, weaveGain: 1.6,
    dodge: { ahead: [0.5, 7], lane: 1.0, speed: 12, time: 0.3, decay: 5, cooldown: [0.8, 1.5], maxRadius: 1.1 },
    flock: { radius: 4, cohesion: 0.5, align: 0.25 },
    current: { stream: 1.2, ring: 1.1, pincer: 1.0, pincerSide: 6 },
  },

  // 1.x elites and affixes (main.js:9402-9422)
  variants: {
    elite: { hp: 2, radius: 1.2 }, elitelite: { hp: 1.5, affixChance: 0.5 }, swiftSpeed: 1.35, boss: { radius: 1.5 },
    volatileGlow: [0x662200, 0x1a0800], volatileHz: 5,   // the VOLATILE fuse smoulders (1.x enemy.js:2653-2656)
  },

  // A kill, as 1.x played it (enemy.js destroy/updateDeath, main.js onKill):
  // chunks and droplets of goo thrown out, a puddle with satellites, a
  // shockwave through nearby bodies when a big one goes, and the camera shaken.
  death: {
    chunks: [5, 6], chunkSize: 0.18, chunkSpeed: [3, 7], chunkUp: [3, 8],
    droplets: 4, dropletsBig: 8, dropletsBoss: 14,   // 1.x's extra burst: 4 small, 8 big, 14 a boss (main.js:4499)
    dropletSize: [0.09, 0.18], dropletSpeed: 2, dropletUp: [2.5, 6.5],
    chunkLife: 1.4, gravity: 14, floorKeep: 0.35, shrink: 0.3,
    puddle: 1.5,                           // radius, as a share of the body's
    satellites: [0.6, 1.5], satelliteSize: [0.4, 0.7],
    big: 0.75,                             // a body this wide is big: more of everything, and a shockwave
    shockRadius: 3.5, shockRipple: 0.75, shockSquash: 0.55,
    heatPerKill: 0.18, heatDecay: 0.35,    // kills in quick succession throw more
    whiten: 0.4,                           // a dying body glows its colour, this far toward white
    hitFlash: 1.0,                         // 1.x: emissive #ffffff for the flash (enemy.js:2650-2652)
    hitFlashJelly: 0.4,                    // 2.0: a jelly body flashes at 0.4, so the dent (blob.dent) reads through it
    // 2.0's jelly death (render/jelly.js; the owner's melon-jelly reference,
    // ported from toko-drop-godot Q-052's scripts/jelly_body.gd): a big blob
    // (`minRadius`, 1.x's own `big`) dies as a soft body of tetrahedra cut in
    // two by a vertical blade along the line from the hero, the halves pushed
    // `push` u/s off the blade, wobbling, slumping and melting into the
    // puddle over `life` s. At most `max` at once; the rest pop as 1.x did.
    // XPBD: `substeps` a frame, edge `edgeCompliance` (the wobble), volume
    // held, `damp` 1/s, `friction` on the floor. The dome is the unit sphere
    // raised `lift` (= blob.domeCut) and cut at the floor; `cells` the lattice.
    jelly: {
      on: true, minRadius: 0.75, max: 3, life: 1.3, push: 1.6, up: 0.8, shrinkFrom: 0.55,
      cells: 4, lift: 0.7, segs: 32, rings: 12, faceRings: 3, faceArc: 24, faceChord: 6,   // the skin, and the clean cut face (rings, arc and floor-chord samples)
      match: 0.04,   // its set: the pull toward its rest shape, a substep (0 = syrup, and unstable)
      sliver: 0.25,  // a tet under this share of the mean volume (the cut flattened it) keeps no volume
      substeps: 6, edgeCompliance: 0.02, volCompliance: 0, damp: 1.6, friction: 0.6, gravity: -9.8,
    },
    // a lob's splashdown (1.x main.js:10507-10514): droplets, a puddle, a shake
    lobSplash: { droplets: 10, dropletSize: [0.09, 0.13], puddle: 1.1, shake: 0.12 },
  },
  splats: { capacity: 192, life: 5, opacity: 0.55, spring: 0.55, damp: 0.74, y: 0.01 },

  // 2.0's ARCADE JUICE (render/juice.js; owner, 2026-10-22: the graphics
  // pass's second step, after the jelly). World-space additive glows in the
  // colour of what made them, no screen bloom (the owner prefers colour to
  // bloom). `white` lifts a glow toward white at its hot core; alpha is its
  // strength. The gels' shots glow harder than yours: they are what you read.
  juice: {
    glowCap: 600, streakCap: 760, ringCap: 48, glowPow: 1.3,   // a glow's falloff from its centre (1 = a cone; higher = tighter)
    bullet: {
      hero: { halo: 5.0, haloAlpha: 0.42, trail: 0.03, trailMax: 0.9, width: 1.6, trailAlpha: 0.5, white: 0.35 },   // halo/width × the bullet's radius; trail = seconds of flight behind it
      gel: { halo: 6.5, haloAlpha: 0.7, trail: 0.09, trailMax: 0.8, width: 1.8, trailAlpha: 0.55, white: 0.25 },
    },
    spark: { count: 8, max: 256, speed: [6, 13], life: [0.16, 0.3], drag: 6, len: 0.07, width: 0.16, alpha: 1, white: 0.75, y: 0.5, spread: 1.2 },   // a hit: hot streaks sprayed back out of the body, ±spread rad
    flash: { max: 24, life: 0.14, r: 1.6, y: 0.7, swell: 0.4, alpha: 0.85, white: 0.6 },   // a kill: a hot disc, r and y × the body's radius
    ring: { max: 32, life: 0.36, from: 0.9, small: 2.2, big: 3.6, boss: 5.0, y: 0.03, alpha: 0.7, white: 0.15, dashFrom: 0.6, dashTo: 3.2 },   // a kill's ring on the floor, from/to × the body's radius; the dash boom's in metres
  },
  // 1.x's camera shake (main.js:665-737): trauma adds, decays, and moves the
  // camera by trauma squared
  shake: { decay: 2.8, amp: [1.8, 1.2, 1.2], freq: [41, 37, 43], kill: 0.07, killPerRadius: 0.13, hurt: 0.38, bigKill: 0.1 },
  audio: { master: 0.5 },
  flow: { deathBeat: 1.4 },                 // seconds the last hit holds the screen before the results

  // HARDCADE's corpse fire, as 1.x had it (tuning.js:486-526, main.js:4390-4420):
  // only the biters (the species with a `revenge` dialect) and bosses bite,
  // from wave 3, while the floor holds fewer live corpse bullets than the
  // cap. Slow, in a darker shift of the living colour, from the corpse's
  // centre the frame it dies. `who: 'all'` makes every corpse bite.
  revenge: {
    who: 'biters',
    density: 1,              // owner: "more or less bullets" — scales every bloom's count (min 1)
    speedMult: 0.6,
    fromWave: 3,
    fieldCap: { base: 14, per: 1.2, max: 44 },
    poolGate: 240,
    aimed: { count: 3, spread: 0.14 },
    fan: { count: 5, spread: 0.5 },
    ring: { small: 4, big: 7, boss: 14, bigRadius: 0.75 },
    palette: { yellowLo: 0.10, yellowHi: 0.22, poisonHue: 0.285, poisonSatMin: 0.75, poisonL: 0.42,
               warmHiCut: 0.92, satMul: 1.2, darkL: 0.55, coolL: 0.5, lFloor: 0.30 },
    scoreMult: 1.5,          // 2.0 keeps HARDCADE's higher score (DIRECTION)
  },
};
