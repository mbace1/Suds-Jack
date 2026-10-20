// tuning.js — every number in the game lives here. Never duplicate a tuned
// constant in code: import it. spec/toko2.json (the Godot port's seam) will be
// emitted from this file, so a number that lives anywhere else is a number the
// port re-derives by guesswork.
//
// World units are 1.x's own (owner, 2026-10-20: "gameplay on par, copy the
// things that work"). The arena is 1.x's, so every 1.x number ports as it is
// instead of through a rescale. Axes: x across the screen (right +), y up,
// z toward the bottom of the screen. The arena is centred on the origin.
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
  },

  // The gelatin: 1.x's satin preset (tuning.js `material`), per-family
  // overrides, and the contrast floor that rims a body too dark to read.
  material: {
    sss: 0.70, roughness: 0.16, clearcoat: 1.00, clearcoatRoughness: 0.06,
    sheen: 0.45, transmission: 0.15, thickness: 0.8, ior: 1.38,
    contrast: { minLum: 0.16, rim: 2.2, rimPow: 2.0, rimWhite: 0.55, lift: 0.6 },
    families: {
      blob: {},
      cube: { roughness: 0.10, transmission: 0.25 },   // firmer candy-glass
    },
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
    death: 0.28,            // seconds a dying gel thrashes, swells and fades before it bursts
    deathSwell: 1.3,        // how much bigger it gets by the end
  },

  // The hero's body (1.x player.js): a white satin sphere, calmer than the
  // gels, with black eyes that face the last shot.
  heroLook: {
    wobble: 0.6,
    eye: { r: 0.13, scale: [0.55, 1.15, 0.4], forward: 0.44, side: 0.14, up: 0.18, glint: 0.042 },
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

  hero: {
    radius: 0.5,            // the body (1.x PLAYER_RADIUS)
    hitRadius: 0.3,         // what bullets must touch: smaller than the body, as 1.x
    speed: 6,               // 1.x SPEED
    dashSpeed: 26,          // 1.x DASH_SPEED
    dashTime: 0.18,         // 1.x DASH_DUR
    dashCooldown: 0.75,     // 1.x DASH_CD
    fireEvery: 0.09,        // 1.x FIRE_RATE
    lives: 3,               // 1.x MAX_HP
    mercy: 1.2,             // 1.x MERCY_DURATION
    shoveRadius: 1.5,       // dash is a body-check: everything this close is shoved
    shove: 11,              // and this hard (units/s of knock)
    color: 0xffffff,        // 1.x: white satin
  },

  bullets: {
    heroSpeed: 24,          // 1.x PLAYER_BULLET_SPEED
    heroRadius: 0.13,
    heroDamage: 1,
    gelSpeed: 7,            // 1.x ENEMY_BULLET_SPEED
    gelRadius: 0.15,
    life: 4,
    max: 400,
    heroColor: 0xfff4c8,
  },

  graze: { radius: 0.9, points: 10 },   // a gel bullet passing this close, once each

  score: {
    comboWindow: 1.6,       // seconds a kill keeps the chain alive
    comboStep: 4,           // kills per multiplier step
    maxMult: 8,
    extendEvery: 20000,     // an extra life at every multiple of this
    maxLives: 5,
  },

  gel: {
    knockFriction: 6,       // knock velocity decays this fast (1/s)
    hitKnock: 2.2,          // a bullet's push
    wallBounce: 0.6,        // a wall returns this share of the speed
    separation: 0.6,        // how hard overlapping gels push apart (share per step)
    appear: 0.3,            // seconds a new gel swells into being; it can neither hurt nor be hit
    spring: 70,             // squash spring stiffness
    damping: 7,             // and its damping
    contactSquash: 0.35,    // how much a hit / wall / shove squashes
  },

  // Who comes and when: pressure rises over `ramp` seconds and then holds.
  // 1.x pops bodies in on an ellipse at 0.85 of the arena, never on you.
  director: {
    firstSpawn: 0.6,
    ramp: 600,
    spawnEvery: [1.4, 0.45],
    maxAlive: [8, 30],
    groupOf: [1, 3],
    ring: 0.85,
    clearOfHero: 6,
  },

  // The core six, in 1.x's colours, sizes, speeds and hit points (enemy.js
  // CFG). `unlock` is seconds into the run; `weight` its share of spawns.
  species: {
    globbo:  { name: 'GLOBBO',      shape: 'blob', radius: 0.55, hp: 1, speed: 2.8, score: 100, color: 0x00ccaa, unlock: 0,   weight: 5, revenge: 'ring' },
    yela:    { name: 'YELA CUBE',   shape: 'cube', radius: 0.7,  hp: 2, speed: 2.2, score: 150, color: 0xffdd00, unlock: 25,  weight: 4, revenge: 'ring',
               dartEvery: 2.2, dartSpeed: 7.5, dartTime: 0.35 },
    spittor: { name: 'SPITTOR',     shape: 'blob', radius: 0.9,  hp: 3, speed: 1.6, score: 200, color: 0xff5533, bulletColor: 0xff7755, unlock: 50,  weight: 3, revenge: 'aimed',
               range: 9, fireEvery: 2.2, windup: 0.45 },
    orange:  { name: 'ORANGE CUBE', shape: 'cube', radius: 0.75, hp: 4, speed: 1.4, score: 220, color: 0xff8800, bulletColor: 0xff6600, unlock: 90,  weight: 3, revenge: 'fan',
               range: 8, fireEvery: 3.2, windup: 0.35, spreadDeg: 15 },
    fanner:  { name: 'FANNER',      shape: 'blob', radius: 0.75, hp: 3, speed: 1.4, score: 260, color: 0xff00aa, bulletColor: 0xff66cc, unlock: 130, weight: 2, revenge: 'fan',
               fireEvery: 1.5, windup: 0.5, count: 6, arcDeg: 70 },
    splitta: { name: 'SPLITTA',     shape: 'blob', radius: 1.1,  hp: 5, speed: 1.0, score: 400, color: 0x88ff22, unlock: 170, weight: 1, revenge: 'ring',
               children: 3, childKind: 'globbo' },
  },

  // A kill, as 1.x played it (enemy.js destroy/updateDeath, main.js onKill):
  // chunks and droplets of goo thrown out, a puddle with satellites, a
  // shockwave through nearby bodies when a big one goes, and the camera shaken.
  death: {
    chunks: [5, 6], chunkSize: 0.18, chunkSpeed: [3, 7], chunkUp: [3, 8],
    droplets: 4, dropletsBig: 8, dropletSize: [0.09, 0.18], dropletSpeed: 2, dropletUp: [2.5, 6.5],
    chunkLife: 1.4, gravity: 14, floorKeep: 0.35, shrink: 0.3,
    puddle: 1.5,                           // radius, as a share of the body's
    satellites: [0.6, 1.5], satelliteSize: [0.4, 0.7],
    big: 0.75,                             // a body this wide is big: more of everything, and a shockwave
    shockRadius: 3.5, shockRipple: 0.75, shockSquash: 0.55,
    heatPerKill: 0.18, heatDecay: 0.35,    // kills in quick succession throw more
    whiten: 0.4,                           // a dying body glows its colour, this far toward white
  },
  splats: { capacity: 192, life: 5, opacity: 0.55, spring: 0.55, damp: 0.74, y: 0.01 },
  // 1.x's camera shake (main.js:665-737): trauma adds, decays, and moves the
  // camera by trauma squared
  shake: { decay: 2.8, amp: [1.8, 1.2, 1.2], freq: [41, 37, 43], kill: 0.07, killPerRadius: 0.13, hurt: 0.38, bigKill: 0.1 },
  audio: { master: 0.5 },
  flow: { deathBeat: 1.4 },                 // seconds the last hit holds the screen before the results

  // HARDCADE: every corpse fires back in its species' dialect, slower, in
  // corpse colours (1.x v220).
  revenge: {
    speedMult: 0.6,
    fuse: 0.45,             // seconds a corpse seethes before it fires: time to step away
    safeRadius: 1.4,        // a corpse this close to you when it fires spends itself harmlessly
    aimed: { count: 3, gap: 0.12 },        // a burst at you
    fan: { count: 5, arcDeg: 58 },
    ring: { count: 8 },
    darken: 0.45,                           // corpse colour: this far toward black
    scoreMult: 1.5,
  },
};
