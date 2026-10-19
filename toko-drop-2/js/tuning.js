// tuning.js — every number in the game lives here. Never duplicate a tuned
// constant in code: import it. spec/toko2.json (the Godot port's seam) will be
// emitted from this file, so a number that lives anywhere else is a number the
// port re-derives by guesswork.
//
// World units are metres, roughly. Axes: x across the screen (right +),
// y up, z from the garage (−) toward the street (+). The slab is centred on
// the origin.
export const TUNING = {
  render: {
    clearColor: 0x050506,   // near-black: the void around the driveway, and the UI's ground
    maxPixelRatio: 2,       // a Pixel 10 Pro reports ~3; full-res HD gels at 2 are plenty
  },

  // One fixed view of the whole arena, refitted on every resize and rotation.
  camera: {
    fov: 30,                // vertical, degrees: narrow, so the curbs do not bow
    tiltDeg: 24,            // off straight-down, toward the street, so the garage door has a face
    near: 0.5,
    far: 400,
    margin: 0.02,           // NDC kept clear around the arena on the tighter axis
    searchMin: 1,           // camera distances the fit searches between
    searchMax: 400,
  },

  driveway: {
    slab: {
      width: 16,            // curb to curb: a double driveway, stretched for landscape
      depth: 9,             // garage door to street curb
      panelX: 4,            // expansion-joint spacing across…
      panelZ: 4.5,          // …and along
      jointWidth: 0.07,
    },
    curb: { width: 0.3, height: 0.15 },
    lawn: {
      y: 0.1,               // grass sits just under the curb top
      reach: 30,            // how far the lawns run out sideways (past any screen)
    },
    street: {
      reach: 40,            // how far the asphalt runs toward the camera
    },
    house: {
      reach: 30,            // half-width of the house front, past any screen
      wallHeight: 3.2,
      wallDepth: 0.4,
      roofDepth: 36,
      roofRise: 0.25,       // the roof's front edge stands this far over the wall top
    },
    door: { width: 9.6, height: 2.4, panels: 4, grooveWidth: 0.05 },
    flood: { width: 0.5, height: 0.22, depth: 0.25, y: 2.85 },  // the motion-sensor light over the door
  },

  light: {
    // The one warm light: the flood over the garage door, pooling on the slab
    // and falling off toward the street.
    flood: {
      color: 0xffb468,
      intensity: 60,        // candela (physical lights, decay 2)
      decay: 2,
      angleDeg: 62,         // half-angle of the cone
      penumbra: 0.75,
      targetZ: -0.5,        // where the cone points on the slab
    },
    // A dim cool fill so the edges stay readable; everything else is dark.
    moon: { sky: 0x6a7dab, ground: 0x0b0b0e, intensity: 1.1 },
  },

  // ── the game ──────────────────────────────────────────────────────
  // 1.x numbers where 1.x had them (js/player.js, js/bullet.js, js/input.js
  // at v268); the slab is 16 x 9 where 1.x's arena was larger, so ranges
  // and spawn rates are retuned for it.
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
    color: 0xf2efe6,        // pearl white
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
    dawnBonus: 5000,        // per life left when the sun comes up
  },

  gel: {
    knockFriction: 6,       // knock velocity decays this fast (1/s)
    hitKnock: 2.2,          // a bullet's push
    wallBounce: 0.6,        // a curb returns this share of the speed
    separation: 0.6,        // how hard overlapping gels push apart (share per step)
    rustle: 0.7,            // seconds a spawn shakes on the lawn before it hops
    hop: 0.45,              // seconds of the hop over the curb
    hopHeight: 0.9,
    spring: 70,             // squash spring stiffness
    damping: 7,             // and its damping
    contactSquash: 0.35,    // how much a hit / wall / shove squashes
  },

  // The night: 11 PM to 5 AM, two minutes an hour. Dawn pays out, then
  // overtime runs on at full pressure.
  night: {
    startHour: 23,
    firstSpawn: 0.6,           // seconds before the first gel: the run starts with something coming
    secondsPerHour: 120,
    dawnHour: 5,
    spawnEvery: [1.6, 0.5],    // seconds between spawns, start of night → dawn (2.2 left the first minute empty)
    maxAlive: [5, 24],
    groupOf: [1, 3],           // gels per spawn
  },

  // Six species to start (DIRECTION's twelve land in stages). `unlock` is
  // seconds into the night; `weight` its share of spawns once unlocked.
  species: {
    globbo:  { name: 'GLOBBO',      shape: 'blob', radius: 0.55, hp: 3,  speed: 2.4, score: 100, color: 0x3fc79a, unlock: 0,   weight: 5, revenge: 'ring' },
    yela:    { name: 'YELA CUBE',   shape: 'cube', radius: 0.42, hp: 2,  speed: 3.4, score: 150, color: 0xf2d64b, unlock: 25,  weight: 4, revenge: 'ring',
               dartEvery: 2.2, dartSpeed: 7.5, dartTime: 0.35 },
    spittor: { name: 'SPITTOR',     shape: 'blob', radius: 0.6,  hp: 4,  speed: 1.8, score: 200, color: 0xe2453c, unlock: 50,  weight: 3, revenge: 'aimed',
               range: 5.5, fireEvery: 1.7, windup: 0.4 },
    orange:  { name: 'ORANGE CUBE', shape: 'cube', radius: 0.55, hp: 4,  speed: 2.2, score: 220, color: 0xff8a2a, unlock: 90,  weight: 3, revenge: 'fan',
               range: 4.5, fireEvery: 2.0, windup: 0.35, spreadDeg: 15 },
    fanner:  { name: 'FANNER',      shape: 'blob', radius: 0.65, hp: 6,  speed: 1.2, score: 260, color: 0x9b5cf0, unlock: 130, weight: 2, revenge: 'fan',
               fireEvery: 2.6, windup: 0.5, count: 7, arcDeg: 70 },
    splitta: { name: 'SPLITTA',     shape: 'blob', radius: 0.95, hp: 12, speed: 1.5, score: 400, color: 0x6dd84a, unlock: 170, weight: 1, revenge: 'ring',
               children: 3 },
    mini:    { name: 'SPLITTA MINI', shape: 'blob', radius: 0.35, hp: 1, speed: 4.0, score: 50,  color: 0xa8f08a, unlock: Infinity, weight: 0, revenge: 'ring' },
  },

  // The painting: resolution, how much darker a splat dries than its gel, its
  // opacity, and its size as a share of the body (kill) or chunk that made it.
  // Small and dark on purpose — it has to build all night, not carpet the slab
  // by the first hour (the first cut did, by kill 34).
  paint: { pxPerUnit: 64, darken: 0.62, alpha: 0.6, killSplat: 0.75, chunkSplat: 1.0 },
  audio: { master: 0.5 },
  flow: { deathBeat: 1.4 },                 // seconds the last hit holds the screen before the results

  // HARDIVAL: every corpse fires back in its species' dialect, slower, in
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

  colors: {
    slab: 0x9a968c,
    joint: 0x2c2b29,
    curb: 0xb3afa5,
    lawn: 0x3d5a2f,
    street: 0x2b2c30,
    wall: 0x5d5a57,
    roof: 0x1d1d22,
    door: 0xd2ccbf,
    doorGroove: 0x6f6a61,
    flood: 0xfff1d6,
  },
};
