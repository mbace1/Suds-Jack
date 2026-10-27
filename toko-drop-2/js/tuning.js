// tuning.js — every number in the game lives here. Never duplicate a tuned
// constant in code: import it. spec/toko2.json (the Godot port's seam) will be
// emitted from this file, so a number that lives anywhere else is a number the
// port re-derives by guesswork.
//
// World units are 1.x's own (owner, 2026-10-20: "gameplay on par, copy the
// things that work"). The arena is 1.x's, so every 1.x number ports as it is
// instead of through a rescale. Axes: x across the screen (right +), y up,
// z toward the bottom of the screen. The arena is centred on the origin.
import { SPECIES } from './tuning/species/index.js?v=50';
import WAVES from './tuning/waves.js?v=50';
import PICKUPS from './tuning/pickups.js?v=50';

export const TUNING = {
  render: {
    clearColor: 0x0d0d1a,   // 1.x's background: the void past the floor, and the UI's ground
    maxPixelRatio: 2,       // a Pixel 10 Pro reports ~3; full-res HD gels at 2 are plenty
  },

  // 1.x's arena presets (main.js:20-33), picked at the start of each run by
  // the screen's shape. Half sizes.
  arena: {
    landscape: { hx: 19, hz: 11, tiltDeg: 28.2 },   // 38 x 22; camera ray atan(11/20.5)
    // v43 (owner, 2026-10-24: "make the portrait mode levels a bit bigger"):
    // 41.6° → 30°, near landscape's 28.2. The floor is fitted to the phone's
    // WIDTH either way, so a flatter camera gives it more of the height (43% → 52%
    // of a 412 × 915 phone, measured) and a wider far edge; the floor is the same
    portrait:  { hx: 11, hz: 18, tiltDeg: 30 },     // 22 x 36
  },

  // WORLDS (owner, 2026-10-23): ARCADE and HARDCADE go somewhere. Beat a
  // world's boss (its last wave is its boss wave, every waves.rhythm.bossEvery)
  // and the floor swallows the droplet: world 1's grid twists into a drain
  // VORTEX, world 2's driveway opens a DRAIN where the boss died. The droplet
  // goes down it and drops into the next world. 1.x's arena is world 1;
  // the driveway is bigger than the screen, with a curb and the lawn beyond
  // it, and the camera follows (owner: "bigger driveway, camera follows");
  // the sewer is a long tunnel. From world 2 a share of the bodies arrive
  // HEAVY (owner: "slightly bigger and more durable"): the gels you know,
  // bigger, tougher and darker. Half sizes, per the run's screen shape; a
  // world's tilt is its shape's own (the view fits the screen as world 1).
  worlds: {
    modes: ['arcade', 'hardcade'],
    // a world's floor that moves for a wave (`shift` below; sim/floorshift.js, v44): warned this long first
    shift: { warn: 1.6 },
    list: [
      { id: 'grid', heavy: 0 },
      { id: 'driveway', trial: 'gates', heavy: 0.35, species: [['hoppa', 0, 3]], speciesWeight: 4, arena: { landscape: { hx: 27.5, hz: 16 }, portrait: { hx: 16, hz: 27.5 } } },
      { id: 'sewer', trial: 'hold', heavy: 0.5, species: [['worma', 0, 3]], speciesWeight: 3, arena: { landscape: { hx: 30, hz: 11 }, portrait: { hx: 11, hz: 30 } } },
      // v27 (owner, 2026-10-23: "let's do both and make it 9 worlds"): down
      // the pipes, then out to sea. Each world past the sewer plays under one
      // of 1.x's world rules (sim/rules.js; TUNING.campaign.rules), and has a
      // floor of its own (render/floor.js, TUNING.worlds.floor[id])
      { id: 'cistern', trial: 'collect', squeeze: 0.72, heavy: 0.5, species: [['bubbla', 0, 3]], speciesWeight: 3, rule: 'sweep', rail: 0x3fb8d0,
        arena: { landscape: { hx: 26, hz: 14 }, portrait: { hx: 14, hz: 26 } } },
      { id: 'boiler', trial: 'protect', squeeze: 0.78, heavy: 0.55, species: [['steama', 0, 3]], speciesWeight: 3, rule: 'updraft', rail: 0xff8a33,
        arena: { landscape: { hx: 23, hz: 14 }, portrait: { hx: 14, hz: 23 } } },
      { id: 'river', trial: 'hold', heavy: 0.55, species: [['salma', 0, 3]], speciesWeight: 3, rule: 'current', rail: 0x44ddbb,
        // its third wave the banks breathe in and out (sim/floorshift.js, v44)
        shift: { at: 3, kind: 'breathe', parts: [{ kind: 'rect', hx: 1, hz: 1, pulse: { from: 1, to: 0.58, period: 9, mode: 'breathe' } }] },
        arena: { landscape: { hx: 34, hz: 12 }, portrait: { hx: 12, hz: 34 } } },
      { id: 'ice', trial: 'combo', heavy: 0.6, species: [['skata', 0, 3]], speciesWeight: 3, rule: 'slip', rail: 0xbfe6ff,
        // its third wave the floor is a round floe drifting round the middle
        shift: { at: 3, kind: 'floe', parts: [{ kind: 'circle', c: [0, 0], r: 0.78, orbit: { r: 0.32, period: 16 } }] },
        arena: { landscape: { hx: 28, hz: 17 }, portrait: { hx: 17, hz: 28 } } },
      { id: 'deep', trial: 'collect', heavy: 0.6, species: [['glowa', 0, 3]], speciesWeight: 3, rule: 'dark', rail: 0x4455cc,
        arena: { landscape: { hx: 24, hz: 16 }, portrait: { hx: 16, hz: 24 } } },
      { id: 'core', squeeze: 0.7, heavy: 0.65, species: [['mirra', 0, 3]], speciesWeight: 3, rule: 'cycle', rail: 0xee44dd,
        // its third wave the floor is two discs going round each other: cross the gap when they meet
        shift: { at: 3, kind: 'twins', combine: 'union', parts: [{ kind: 'circle', r: 0.55, orbit: { r: 0.42, period: 14 } }, { kind: 'circle', r: 0.55, orbit: { r: 0.42, period: 14, phase: 3.14159 } }] },
        arena: { landscape: { hx: 19, hz: 11 }, portrait: { hx: 11, hz: 19 } } },
    ],
    // THE CORE plays every rule in turn, `cycleEvery` s each
    // a world's `trial` is its SIGNATURE, the challenge its challenge waves ask
    // (sim/challenge.js, v37); `squeeze` closes its walls in for them, to that share
    cycle: { rules: ['current', 'sweep', 'dark', 'slip', 'updraft'], every: 20 },
    heavy: { radius: 1.3, hp: 2 },   // × a normal body's; not an elite's, a boss's or a child's
    heavyLook: { darken: 0.55 },     // its colour (and what light becomes inside it) × this: denser
    // the transition, in seconds: pulled round and in to the hole, sinking
    // into it, the dark, the drop falling into the next world, the beat
    // before the next wave's breather starts. `spin` turns the pull makes.
    trans: { pull: 1.9, sink: 0.6, dark: 0.45, fall: 0.95, settle: 0.7, spin: 1.6, grace: 1.0, drainInset: 3 },
    // how a world change looks (render/transit.js): the droplet falls from
    // `fallH` m; the light comes back over `lightUp` of the fall; the floor
    // runs out of it over `reveal` s; the vortex's hole and the drain's swirl
    // and hole, in m; the drain rises out of the slab over `drainRise` s
    view: { fallH: 14, splashRing: 4.5, banner: 2.4, vortexHole: 1.9, drainSwirl: 5.5, drainHole: 0.55, drainRise: 0.35, lightUp: 0.45, reveal: 1.3, sceneryAt: 0.45 },
    // the floors (render/floor.js `style`), linear rgb. The swirl winds the
    // floor `twist` rad at the drain, falling off as (1 − r/R)^falloff, and
    // draws it `pull` × in toward it
    floor: {
      swirl: { falloff: 1.4, twist: 9, pull: 0.8 },
      concrete: { lo: [0.03, 0.031, 0.034], hi: [0.075, 0.074, 0.076], speck: [0.028, 0.028, 0.03], oil: [0.012, 0.012, 0.014], oilDepth: 0.45,
                  lip: [0.11, 0.11, 0.11], joint: 4.0, jointW: 0.025, flood: 0.85, ambient: 0.6, floodTint: [1.0, 0.6, 0.25] },
      sewer: { stone: [0.034, 0.04, 0.046], groutCol: [0.007, 0.008, 0.01], water: [0.003, 0.011, 0.013], waterHi: [0.05, 0.17, 0.16],
               kerb: [0.06, 0.06, 0.062], channel: 2.4, slab: [1.7, 0.85], grout: 0.035, flow: 1.2, wetLight: 0.9 },
      // WORLDS · NEON (v23): the abstract floors
      hex: { cell: 1.8, line: 0.035, waveK: 0.55, waveHz: 2.2, base: [0.02, 0.012, 0.035], cell2: [0.09, 0.02, 0.08],
             lineLo: [0.35, 0.03, 0.3], lineHi: [1.0, 0.35, 0.75] },
      tide: { scale: 0.11, flow: 0.12, bands: 7, line: 0.06, grid: 2.2, lo: [0.004, 0.01, 0.02], hi: [0.01, 0.04, 0.06],
              lineCol: [0.15, 0.85, 0.8], gridCol: [0.03, 0.06, 0.12] },
      // worlds 4-9 (v28): linear rgb
      cistern: { slab: 2.4, grout: 0.04, stone: [0.03, 0.042, 0.048], water: [0.003, 0.02, 0.028], depth: 0.6, caustic: [0.25, 0.75, 0.8],
                 column: 8, plinth: 0.75, rim: [0.2, 0.6, 0.7] },
      boiler: { plate: [3.2, 2.1], seam: 0.035, steel: [0.05, 0.04, 0.035], rivet: [0.16, 0.12, 0.09], grate: 6.4, grateW: [1.4, 0.5],
                glow: [1.0, 0.35, 0.06], scorch: [0.012, 0.008, 0.006], pulse: 1.6 },
      river: { water: [0.004, 0.025, 0.03], waterHi: [0.08, 0.35, 0.3], flow: 1.6, bank: 0.78, pebble: [0.05, 0.05, 0.045], foam: [0.5, 0.75, 0.7] },
      ice: { base: [0.055, 0.085, 0.125], deep: [0.02, 0.035, 0.07], crack: [0.6, 0.72, 0.85], lines: 0.45, scale: 0.35, frost: [0.6, 0.75, 0.85] },
      deep: { silt: [0.006, 0.008, 0.02], ripple: [0.012, 0.018, 0.04], glow: [0.2, 0.5, 1.0], glow2: [0.5, 1.0, 0.7], specks: 2.6 },
      core: { base: [0.004, 0.0, 0.008], line: [0.8, 0.1, 0.7], pulse: [0.3, 0.9, 1.0], cell: 1.6, ringEvery: 2.4, ringSpeed: 4.5 },
    },
  },
  // what stands round a world's floor (render/scenery.js). Colours are
  // linear rgb; the lawn and the slab are pictures, the rest is lit.
  scenery: {
    driveway: { lawnOut: 12, bladeScale: 11, tuftScale: 1.1, stripe: 1.8, grassLo: [0.035, 0.085, 0.04], grassHi: [0.09, 0.19, 0.07], fade: 8,
                curb: [0.5, 0.5, 0.48], curbWidth: 0.4, curbHeight: 0.2, curbJoint: 2.4 },
    sewer: { brick: [0.44, 0.15], brickColor: [0.3, 0.15, 0.11], mortar: [0.07, 0.07, 0.08], damp: 0.7, wallHeight: 1.2, wallThick: 0.6, beyond: 4,
             bar: 0x34383e, barR: 0.05, barGap: 0.42, barHeight: 1.7 },
    drain: { r: 0.95, bars: 6, iron: 0x2a2d32 },
    // v43: round every other world's floor (render/scenery.js _surround). A
    // ground `out` m past the floor fading out over `fade` m (`line`/`cell`
    // draw a grid or traces on it), a glowing `edge` where the floor stops (the
    // grid has 1.x's rail instead), and `props` along the far side and the two
    // sides: `every` m apart, `out` [min, max] m past the edge, `h`/`r`/`w`
    // [min, max] in m, a `glow` colour at `glowI`
    surround: {
      // the grid runs on past its rail, much fainter than the floor's own, and
      // short bollards with lit tops stand along it like a runway's lights
      // (tall neon posts were tried first: seen from above they streak out
      // from the floor like a starburst)
      grid: { ground: { lo: [0.006, 0.007, 0.02], hi: [0.014, 0.016, 0.04], scale: 0.35, line: [0.012, 0.024, 0.06], cell: 1.286, out: 18, fade: 8 },
              props: [{ shape: 'post', every: 2.6, out: [1.4, 1.4], h: [0.35, 0.35], w: 0.16, color: 0x0b0d18, glow: 0x5f8cff, glowI: 3.0, rough: 0.5, jitter: 0 },
                      { shape: 'post', every: 5.2, out: [4.2, 4.2], h: [0.55, 0.55], w: 0.2, color: 0x0b0d18, glow: 0xb26bff, glowI: 2.4, rough: 0.5, jitter: 0 }] },
      cistern: { ground: { lo: [0.004, 0.018, 0.026], hi: [0.016, 0.06, 0.075], scale: 0.5, out: 18, fade: 11 },
                 edge: { color: 0x3fb8d0, glow: 1.6, width: 0.12, height: 0.05 },
                 props: [{ shape: 'column', every: 4.4, out: [1.9, 2.1], h: [5.5, 5.5], r: 0.62, color: 0x8a8272, rough: 0.9 },
                         { shape: 'column', every: 4.4, out: [6.2, 6.4], h: [5.5, 5.5], r: 0.62, color: 0x5e584e, rough: 0.9 }] },
      boiler: { ground: { lo: [0.025, 0.02, 0.016], hi: [0.06, 0.045, 0.032], scale: 0.9, line: [0.05, 0.03, 0.015], cell: 2.2, out: 16, fade: 10 },
                edge: { color: 0xff8a33, glow: 1.8, width: 0.12, height: 0.05 },
                props: [{ shape: 'pipe', out: [1.1, 1.1], r: 0.42, y: 0.5, every: 3.2, color: 0x4a3f38, band: 0x7a6650 },
                        { shape: 'stack', every: 6.5, out: [3.8, 4.6], h: [3.0, 5.5], r: [0.55, 0.8], color: 0x2c2826, glow: 0xff7a22, glowI: 2.2, metal: 0.6, rough: 0.5 }] },
      river: { ground: { lo: [0.03, 0.045, 0.025], hi: [0.075, 0.1, 0.05], scale: 0.7, out: 16, fade: 10 },
               edge: { color: 0x44ddbb, glow: 1.3, width: 0.1, height: 0.04 },
               props: [{ shape: 'rock', every: 2.3, out: [1.0, 4.5], h: [0.4, 1.1], r: [0.5, 1.1], color: 0x6b695e, tilt: 0.5 },
                       { shape: 'reed', every: 0.8, out: [0.5, 2.6], h: [0.8, 1.9], r: 0.05, color: 0x4a6a2e, tilt: 0.35 }] },
      ice: { ground: { lo: [0.07, 0.09, 0.13], hi: [0.15, 0.19, 0.25], scale: 0.6, out: 16, fade: 10 },
             edge: { color: 0xbfe6ff, glow: 1.2, width: 0.1, height: 0.04 },
             props: [{ shape: 'shard', every: 1.7, out: [1.0, 5.0], h: [0.8, 3.4], r: [0.25, 0.6], color: 0x8fbad6, glow: 0x6fb8ff, glowI: 0.25, metal: 0.1, rough: 0.2, tilt: 0.45 }] },
      deep: { ground: { lo: [0.004, 0.008, 0.02], hi: [0.014, 0.03, 0.06], scale: 0.5, out: 18, fade: 11 },
              edge: { color: 0x5577ff, glow: 2.2, width: 0.12, height: 0.05 },
              props: [{ shape: 'rock', every: 3.4, out: [1.6, 6.0], h: [1.4, 3.6], r: [0.7, 1.4], color: 0x1c2232, tilt: 0.3 },
                      { shape: 'kelp', every: 1.5, out: [0.8, 4.2], h: [1.6, 4.6], r: 0.07, color: 0x0d3324, glow: 0x33ffaa, glowI: 1.2, tilt: 0.25 }] },
      core: { ground: { lo: [0.008, 0.004, 0.016], hi: [0.03, 0.008, 0.05], scale: 0.4, line: [0.13, 0.02, 0.11], cell: 2.6, out: 18, fade: 9 },
              edge: { color: 0xff55ee, glow: 2.0, width: 0.12, height: 0.05 },
              props: [{ shape: 'tower', every: 3.6, out: [1.6, 5.0], h: [1.4, 5.2], w: [0.6, 1.4], color: 0x120818, glow: 0xff44dd, glowI: 1.8, stripes: 3, rough: 0.4, metal: 0.5 }] },
    },
  },

  // One fixed view of the whole arena, refitted on every resize and rotation.
  camera: {
    fov: 60,                // 1.x's vertical FOV
    near: 0.5,
    far: 400,
    // CSS px kept clear round the arena (owner, 2026-10-23: trim the
    // margins). 1.x fitted to 0.96 / 0.93 of the screen and v17 kept 5%;
    // the HUD sits over the far edge's empty corners and the pause button
    // was already over its middle, so a few px is all the arena needs
    margin: { x: 10, y: 8 },
    // a world bigger than the screen (sim/worlds.js): the camera follows the
    // hero, easing over `tau` s, and at a side shows `edge` m past the floor
    // (the curb, the lawn) — no further
    follow: { tau: 0.22, edge: 2.5 },
    // and the bodies it leaves off screen: an arrow on the edge, `inset` px in
    pips: { inset: 14, max: 40, fade: 0.8, minAlpha: 0.35 },
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
  // the live portrait on the death screen and the pause menu (render/specimen.js):
  // the camera in body radii, a slow turn, the card's own dark behind it
  specimen: { fov: 30, dist: 5.2, up: 2.0, look: 0.35, turn: 0.6, turnHz: 0.7, back: 0x0b0b18, hz: 20, margin: 0.95 },
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

  // The SDF gels (render/sdf.js), the title's GELS · SDF: the dome and the
  // rounded cube drawn as ray-marched fields on a fitted proxy hull, with the
  // same physical jelly, the same displacement law (gel.js gelDisplacement,
  // taken at the rest point) and the same per-gel writes as the mesh. The
  // switch itself is localStorage `toko2.gels` ('classic' | 'sdf'), not here.
  //   steps     the march's budget; epsPx a hit within that many pixels;
  //   acceptPx  a ray out of steps that close to the surface is a hit;
  //   minStepPx the smallest step, in pixels at the ray's distance;
  //   aa        alpha-to-coverage edges: a near miss within half a pixel of the
  //             surface gets partial coverage (a wider feather grew every
  //             silhouette, globbo +13%, and drew a dark fringe);
  //   relax     × the Lipschitz step 1/√(1+T²), T = lip · (wobble, hit, tear).
  //             The lip constants are MEASURED, not worst-case sums: 2.8 for
  //             the hit (the research's sum of term bounds) made every hit gel
  //             step at a third of the distance and run out of steps at the
  //             rim (holes); against a 2000-step ground truth (bare node, the
  //             dome field, idle/hit/death) hit 0.5 and wobble 0.3 overstep
  //             nothing, and tear needs ~1.0 (below it the thrash crests
  //             tunnel). The near-surface gradient is 1.0-1.4 at p90;
  //   burstSteps more steps × max(hit, tear) while a hit or the thrash runs;
  //   normalEps the gradient's tap, in radii; pad the hull's slack, in radii;
  //   normals   'field' shades the lumps and dents, 'rest' the bare dome
  //             (classic shades the rest normal: lumps only in the outline);
  //   merge     smooth union between gels: off, the owner's call.
  sdf: {
    steps: 32, epsPx: 0.25, acceptPx: 2, minStepPx: 0.1, normalEps: 0.003, relax: 0.9, burstSteps: 32,
    lip: { wobble: 0.3, hit: 0.5, tear: 1.0 },
    hull: 'ico2', pad: 0.03,
    normals: 'field', aa: true, merge: { on: false },
    debug: null,           // 'steps': a heat map of the march instead of the jelly
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
    // 2.0 pools 10, not 7: a long flick dash lays a ghost every 2 steps for
    // up to 24, and with 0.28 s lives as many as 9 are up at once
    ghost: { count: 10, every: 0.03, life: 0.28, color: 0x88bbff, opacity: 0.45, scale: 0.6 },
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
    // The FLICK (js/flick.js; owner, 2026-10-23): the dash read off the aim
    // stick as it is let go. Lengths are in units of stickRadius CSS px (CSS
    // px are already near physical: ~6.3 a mm on a Pixel, ~5.2 on an iPad
    // Air, so a thumb's flick reads about the same on both); times in ms of
    // the events' own timeStamps; speeds in units a second (5 = 0.3 px/ms).
    // Measured against synthetic thumb strokes driven through real CDP touch
    // events (a touchmove a display frame while the thumb moves, none while
    // it rests), on a phone at 60 and 120 Hz and an iPad: a flick of 7 mm
    // in 160 ms is read on both, a thumb that stops 60 ms before it lifts or
    // sweeps the aim round slowly is not (scratchpad cam18/flicks.mjs).
    flick: {
      tap: false,                  // a tap is no dash (1.x's was); true makes it 1.x's dash again
      tapMs: 200, tapPx: 12,       // shorter and stiller than this is a TAP
      stopMs: 50,                  // no movement for this long before the lift: the thumb had stopped
      releaseMs: 50,               // the speed at the lift is fitted over this much of the end
      releaseFloor: 4,             // u/s at the lift under which it is a let-go, not a flick (0.24 px/ms)
      peakFloor: 5,                // u/s the stroke must reach somewhere (0.3 px/ms; an aim sweep peaks near 2)
      lengthFloor: 0.3,            // u of stroke under which it is a let-go (18 px, ~3 mm)
      strokeFloor: 2,              // u/s: walking back from the lift, the stroke ends where the thumb was slower
      strokeMs: 350,               // and it looks back no further
      spanMs: 14,                  // a speed sample spans at least this (one sample's jitter is not a speed)
      restMs: 30,                  // a gap with no events this long was the thumb at rest
      length: [0.3, 2.5],          // stroke length → sL 0..1 (18 → 150 px)
      speed: [6, 40],              // peak stroke speed → sV 0..1 (0.36 → 2.4 px/ms)
    },
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
    // The FLICK dash (owner, 2026-10-23: the dash reacts to the flick's
    // length and speed, goes where it was flicked, and runs longer than
    // 1.x's). input.js reads the gesture, dashPlan below prices it: sL 0..1
    // → the distance, sV 0..1 → the speed. Distance is exact (the last step
    // moves what is left); it lasts ceil(d / (v·dt)) steps, clamped to
    // `steps`, and when the clamp bites the speed gives way, never the
    // distance. The i-frames are the dash, as 1.x's were. The cooldown, from
    // the dash's END, grows with the distance: 1.x's 0.75 s at 1.x's 4.77 u.
    // A button (A / RB / RT, Space) is still 1.x's own dash, to the step
    // (owner: the pad keeps a fixed dash), and so is a bare input.dash true.
    flick: {
      d: [2.4, 11], v: [18, 46],           // a flick: sL → distance (u), sV → speed (u/s); 1.x's is 4.77 at 26
      dPow: 1, vPow: 1,
      vStd: 26,                            // the speed the scaled effects are measured against (1.x's)
      steps: [4, 24],                      // 0.067 .. 0.4 s
      cooldown: { at: 0.75, perU: 0.1, min: 0.35 },   // 0.75 s at 4.77 u, ± 0.1 s a unit
      push: [0.75, 1.6],                   // the PUSH plough's force × v / vStd, clamped
      cut: [1, 4],                         // the CUT's hits = round(cut.hits × v / vStd), clamped: a faster flick cuts deeper
      squash: [0.6, 1.5],                  // the dash's squash kick × v / vStd, clamped
    },
    fireEvery: 0.09,        // FIRE_RATE (player.js:9), ASSIGNED on each shot, not carried (player.js:465): 6 steps, 10/s
    muzzle: 0.3,            // a shot leaves at radius + 0.3 = 0.8 from the centre (player.js:402-403)
    mouseNoAim: 0.5,        // the mouse does not aim (so cannot fire) within this of the centre (main.js:9235)
    rapidMult: 0.4,         // the fire-rate pickup's period while `rapid` runs (player.js:416)
    // 1.x's pickups (tuning/pickups.js, sim/pickups.js): taken within reach + radius
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
    // roguelike card). The convoy's DASH pod raises it (tuning/pickups.js dashPod).
    // Touching = within the body's radius + reach: the hero's own radius, so a
    // dash cuts exactly what would have hurt to walk into (1.x's contact test,
    // e.radius + PLAYER_RADIUS, main.js:10895). 1.x's one body-cutting dash
    // (NEX DEUS, a cabinet) reached 0.2 further and HIT for 1 rather than
    // killing (main.js:10166-10183); bossHits is that 1, once a pass.
    dashKill: { reach: 0.5, bossHits: 1 },
    dashBoom: { count: 12, shake: 0.18, color: 0xff8844 },   // 12 rays, addShake(0.18), 0xff8844 (main.js:10216-10225)
    // a hit knocks dash level 2 down to 1, never below 1, as a hit does a pod
    // (weaponTakeHit, main.js:2083-2091); false keeps the level for the run.
    // The level comes from the convoy's DASH pod (tuning/pickups.js dashPod);
    // whether a hit should cost it is the owner's open question ("maybe", 2026-10-22)
    dashUpgrade: { loseOnHit: true },
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
    // pods drop from the convoy and the bounty (tuning/pickups.js); `color` is each pod's orb (L1, L2).
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
    // seconds a new body is DRAWN swelling in, from 15% (its shadow from 0):
    // the view's alone. It acts, hurts and can be hit from its first step, as
    // 1.x's did (1.x had no appear phase; owner, 2026-10-22, "c or less": it
    // was 0.3 s of a body that could neither hurt nor be hit). 0 pops it in
    // at full size; a child (a split, a brood) never swells
    swell: 0.15,
    flash: 0.12,            // 1.x hit flash
    // 1.x's squash spring, per 60 Hz step (enemy.js:2728-2729), and its kicks
    sq: { blob: [0.24, 0.86], cube: [0.18, 0.90], hit: -0.75, wall: -0.3 },
    contactRadius: 0.5,     // touching: within the body's radius + 0.5 (1.x main.js:10886-10906)
  },

  // SURVIVAL's director: pressure rises over `ramp` seconds and then holds.
  // 1.x pops bodies in on an ellipse at 0.85 of the arena.
  // SURVIVAL's floor changes size as you play (sim/reshape.js; owner,
  // 2026-10-23: "like Sektori"): it starts small; `first` s in and every
  // `every` s after, the next size (fractions of the run's 1.x arena, x then
  // z) is picked, the floor warns for `warn` s where it will change, and the
  // walls slam there over `move` s. Past 1 the floor is bigger than the
  // screen and the camera follows.
  // THE CAMPAIGN (1.x v263-v265, tuning.js:165-195): WORLDS of rooms, each
  // room an authored level (levels/<id>.json) with its own clock and goal,
  // graded S/A/B/C, and F for a room you did not get through. A room opens
  // when the one before it has a grade above F, so the list is a route.
  //   survive  — last the room's clock (the default)
  //   quota    — put down `kills` bodies; the room ends the moment you do
  //   flawless — one hit ends the room
  // `name` is 1.x's depth look the world played in (its rule comes later).
  campaign: {
    worlds: [
      // `base` / `gridHi` are the floor's own colours (sRGB 0..1, 1.x verbatim), `rule` the one mechanic (TUNING.campaign.rules)
      { name: 'THE SURFACE', rail: 0x5555cc, base: [0.079, 0.079, 0.169], gridHi: [0.0, 0.55, 0.50], rule: null, rooms: [{ id: 'first-light' }, { id: 'high-ground' }, { id: 'three-rings' }, { id: 'first-swarm' }, { id: 'hands-up' }, { id: 'gate-run' }] },
      { name: 'THE WELL', rail: 0x33ccbb, base: [0.030, 0.105, 0.115], gridHi: [0.10, 0.70, 0.60], rule: 'current', rooms: [{ id: 'in-order' }, { id: 'eddy' }, { id: 'the-sludge' }, { id: 'flotsam' }, { id: 'slug-run' }, { id: 'undertow' }] },
      { name: 'THE VEIN', rail: 0xdd3344, base: [0.130, 0.030, 0.040], gridHi: [0.85, 0.16, 0.22], rule: 'sweep', rooms: [{ id: 'splitter' }, { id: 'clot' }, { id: 'pulse' }, { id: 'spike' }, { id: 'needle' }, { id: 'crossfire' }] },
      { name: 'THE VOID', rail: 0x8866cc, base: [0.012, 0.012, 0.022], gridHi: [0.18, 0.10, 0.32], rule: 'dark', rooms: [{ id: 'the-pull' }, { id: 'lights-out' }, { id: 'six-shots' }, { id: 'orbit' }, { id: 'deep-end' }, { id: 'siren' }] },
      { name: 'THE FOAM', rail: 0x99ffee, base: [0.055, 0.105, 0.125], gridHi: [0.60, 1.00, 0.92], rule: 'slip', rooms: [{ id: 'rink' }, { id: 'salmon' }, { id: 'pack-ice' }, { id: 'breath' }, { id: 'skate' }, { id: 'bubble-bath' }] },
      { name: 'THE KILN', rail: 0xffaa33, base: [0.130, 0.060, 0.018], gridHi: [1.00, 0.62, 0.14], rule: 'updraft', rooms: [{ id: 'forge' }, { id: 'anvil' }, { id: 'bellows' }, { id: 'boil-over' }, { id: 'crucible' }, { id: 'the-core' }] },
    ],
    // survive / flawless: the SHARE of the room's bodies you put down; living
    // through it is a C on its own, S is every body
    share: { B: 0.6, A: 0.85, S: 1.0 },
    hitCost: 1,   // each hit taken costs a grade step (never below C)
    // a timed room with no tiers yet: S within this share of its clock, A, B (the bot pass replaces these)
    timeTiers: { S: 0.5, A: 0.7, B: 0.9 },
    heart: { bite: 0.6 },   // PROTECT: a body on the heart takes one of its hp a this many s
    orb: { reach: 0.9 },    // COLLECT: the hero takes an orb within this + its radius
    // how a room's asks are drawn (render/challenge.js)
    view: { zone: 0x44ffcc, heart: 0xff3355, lit: 0xffee66, orb: { r: 0.35, y: 0.7, color: 0xffcc44 } },
    // quota: seconds BEHIND, from the arrival of the last body the count needs to having them all
    quotaLag: { S: 1.5, A: 3, B: 6 },
    // 1.x's level type names → 2.0's species keys (a level may also name a 2.0 key itself)
    kinds: { GLOBBO: 'globbo', YELA_CUBE: 'yela', SPITTOR: 'spittor', FANNER: 'fanner', ORANGE_CUBE: 'orange', WEEVA: 'weeva',
             SLUDGE_CUBE: 'sludge', BAMBU: 'bambu', SPLITTA: 'splitta', REDD_CUBE: 'redd', PURP_CUBE: 'purp', PYRA: 'pyra',
             BOTFLY: 'botfly', TORO: 'toro', BULWARK: 'bulwark', WARDEN: 'warden', DRAPER: 'draper', SIREN: 'siren',
             CLOAKER: 'cloaker', MAGNA: 'magna', SHEPHERD: 'shepherd', RIBBON: 'ribbon', SLUG: 'slug' },
    endHold: 0.6,   // s the room holds on its last frame before the list comes back
    // ONE RULE PER WORLD (1.x v264, tuning.js:217-232), as 1.x wrote them:
    //   current  THE WELL: the whole floor drifts on a current that turns slowly
    //   sweep    THE VEIN: the rail flashes, then fires a line across with a gap in it
    //   dark     THE VOID: the dark closes in on you and opens again
    //   slip     THE FOAM: the floor is slick; you carry momentum
    //   updraft  THE KILN: every few seconds the floor shoves everything out from the middle
    rules: {
      current: { speed: 2.6, playerMult: 0.42, turn: 0.22 },
      sweep: { every: 7.5, warn: 1.1, spacing: 2.6, gapSlots: 2, speed: 9, color: 0xff4466 },
      dark: { period: 9, near: 6, far: 20 },   // at its darkest you see `near` to `far` units round you
      slip: { accel: 3.2, drag: 0.9 },
      updraft: { every: 6.5, warn: 0.8, push: 13, dur: 0.45, playerMult: 0.55 },
    },
  },
  survival: {
    reshape: {
      on: true, first: 20, every: 30, warn: 2.2, move: 0.45, shake: 0.32,
      start: [0.55, 0.6],
      sizes: [[0.55, 0.6], [0.85, 0.7], [0.7, 1.0], [1.0, 1.0], [1.3, 0.8], [0.62, 0.62], [1.35, 1.25], [0.9, 1.25], [1.15, 0.6]],
    },
  },

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

  // 1.x's classic pickups: the drops, the gates, the convoy, the bounty (tuning/pickups.js).
  pickups: PICKUPS,

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

  // 2.0's GOO (render/goo-sim.js, render/goo.js; owner, 2026-10-23: "more
  // particle splatter and vfx, actually physical modelled vfx"). What a kill,
  // a hit, a cut and a lob throw is DROPLETS with volume (4/3·π·r³, metres),
  // and the floor is a thin FILM of goo they land in: what a drop loses to
  // the floor is what the floor gains, the film spreads it, and it dries to a
  // stain. It replaces 1.x's droplets and puddles (death.droplets*,
  // splats); the chunks and the jelly halves stay. `?goo=off` turns it off,
  // for comparison, and brings 1.x's back.
  goo: {
    cap: 2400,              // drops alive at once (all of them step in ~0.6 ms in bare node: test/goo.mjs)
    budget: 320,            // drops one frame may throw: a boss's death cannot stall a frame
    stampCap: 4096,         // what drops lay into the film between two film steps
    life: 4, gravity: 14, bodyTop: 3,                         // s; m/s² (1.x's chunk gravity); no body stands taller (m)
    air: { lin: 0.1, quad: 0.0005, wall: 0.15 },              // drag 1/s, and its quadratic part × speed / radius (≈ 3/8 · Cd · ρair/ρgoo, doubled for a lumpy drop); the rail returns this much
    size: { min: 0.022, max: 0.085, skew: 2.2 },              // r = exp(lerp(ln min, ln max, u^skew)): mostly fine, a few fat; under a bullet's 0.15
    sizeSpeed: 0.35,                                          // a drop's speed × (min / r)^this: a fat drop flies slower
    // on the floor: kinetic friction mu and viscous drag 1/s while it slides;
    // it sheds `shed` of its volume a metre in a streak `streakWide` × its
    // width, sits `flat` × its radius high, stops under `stop` m/s or `minR`
    // m and leaves a last blob `blob` × its radius; an impact leaves `impact`
    // of it and keeps `keep` of its speed; a stain stretches at most `maxElong`
    floor: { mu: 0.55, visc: 2.2, shed: 1.6, streakWide: 0.9, flat: 0.45, stop: 0.25, minR: 0.012, blob: 1.6, impact: 0.3, keep: 0.75, maxElong: 4 },
    // a fast fat drop SPLASHES: past `speed` m/s down and `minR` m, a stain
    // keeps `keep` of it and the rest flies on as a crown of up to `count`
    // finer drops, thrown out at `out` × the fall plus `carry` × the travel
    splash: { speed: 4.5, minR: 0.04, count: 4, perSpeed: 0.35, out: 0.35, carry: 0.4, up: 0.25, keep: 0.4 },
    // a fast fine one BOUNCES (surface tension wins): a `mark` of it, `e` of its fall back up
    bounce: { speed: 5, maxR: 0.035, e: 0.25, keep: 0.6, mark: 0.15 },
    // riding a body: it creeps down the skin at creep + creepR·r² m/s, for at
    // most `max` s, `proud` × its radius off the skin; off the foot it slides
    // out at the body's speed × `carry` plus `out` m/s. The hero wears only
    // fine drops (under `heroMaxR` m) and none mid-dash: he must stay readable
    ride: { creep: 0.6, creepR: 60, max: 1.6, carry: 0.6, out: 1.2, proud: 0.35, heroMaxR: 0.03 },
    // the impostor: stretched by `stretch` × its screen speed (at most
    // `maxStretch`), wrap-lit, with a fresnel rim, a glint and a glow of its own
    drop: { stretch: 0.09, maxStretch: 3.2, gloss: 28, glint: 0.7, diffuse: 0.75, ambient: 0.35, rim: 0.8, glow: 0.18 },
    // its shadow straight below it: `size` × its radius on the floor, `grow`
    // × its radius wider a metre up, `alpha` at the floor and 1/(1 + fade·h) above
    shadow: { size: 1.3, grow: 4, alpha: 0.5, fade: 1.5, y: 0.006 },
    // THE FILM, `perMetre` texels a metre, stepped `hz` times a second. Depths
    // in MILLIMETRES (a half float is precise there). Goo deeper than `yield`
    // runs toward its neighbours (`spread` of the difference a side a step,
    // ≤ 0.2 for a stable step, at full rate once `ref` mm of it can run);
    // every wet texel loses `evap` mm/s, and `deposit` of what it loses stays
    // as the stain (`ring` of it at the film's edge, where a drying film
    // lays down what it carried: the coffee ring; `ringAt` mm is how dry a
    // neighbour must be for this to be the edge), which halves every
    // `dryHalfLife` s. Bodies drag the film at `drag` × their speed over
    // `foot` × their radius. A stamp is at least `minWid` texels wide.
    // Nothing reaching the film for `wetFor` s means it has all dried: then
    // the stain fades a step every `idleEvery` s.
    film: { perMetre: 16, hz: 30, stampCap: 4096, minWid: 0.8, yield: 6, spread: 0.2, ref: 10, evap: 4, deposit: 0.6, ring: 2.5, ringAt: 0.5, dryHalfLife: 8,
      drag: 0.5, foot: 0.9, wetFor: 20, idleEvery: 0.5 },
    // how the floor shows it (floor.js): the wet film's contact line (mm),
    // its absorption depth (mm), how much of its own hue a deep film
    // scatters back, the slope's bump, which slopes count as curved (m/m),
    // how strongly the sun lifts the side of a slope facing it, the glint
    // and the lit rim, the arena light it catches; the stain's contact line
    // (mm), how strong the thinnest stain is (`dryBase`) and the depth (mm)
    // over which it comes to `dryAlpha`, how dark and how tinted it dries
    look: { edge: 0.35, absorb: 6, scatter: 0.22, bump: 4, curve: [0.02, 0.12], relief: 1.4, shine: 50, spec: 0.55, rim: 0.35, lit: 1.0,
      dryEdge: 0.08, dryBase: 0.2, dryDepth: 2.5, dryAlpha: 0.5, dryDark: 0.7, dryTint: 0.14 },
    // a body's puddle: `lobes` blobs, `spread` × its radius off the middle, each `size` × its radius by its share
    puddle: { lobes: 6, spread: 1.0, size: [0.3, 0.7] },
    // what throws goo
    emit: {
      // a kill: base + perR × its radius drops (more while kills come fast:
      // `heat`), `exit` of them thrown on the way the shot or dash went, and
      // `puddle` × r² m³ poured where it stood, over `puddleR` × its radius
      kill: { base: 10, perR: 45, heat: 0.5, exit: 0.45, exitCone: 0.7, exitBoost: 1.3, speed: [1.5, 6.5], up: [2, 6], puddle: 0.03, puddleR: 0.8 },
      // a hit: back-spray out of the entry toward the gun, a few out of the far side
      hit: { count: 3, cone: 0.8, speed: [2, 6], up: [1, 4], size: { min: 0.016, max: 0.04, skew: 1.6 }, through: 1 },
      lob: { count: 26, speed: [2.5, 6.5], up: [2, 5], puddle: 0.04, puddleR: 0.6 },          // a lob's splashdown
      shove: { count: 8, cone: 1.0, speed: [1.5, 4], up: [1, 3], inherit: 0.5 },                // the dash shoves a body: it slops forward
      cut: { count: 16, along: 6, cone: 0.5, speed: [3, 7], up: [1.5, 4], streak: 0.012 },        // the CUT dash: two sheets out of the sides, a streak along the cut
      hurt: { count: 10 },                                                                         // the hero hit: goo splashed onto him
    },
  },

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
    // the HARD CAMPAIGN (v49): the same rooms, and EVERY corpse fires back —
    // a biter in its own dialect, the rest a small ring — from the first
    // body (a room has no waves to wait for), under a fixed cap. `others`
    // scales the ring of a body that is not a biter; a corpse within `near`
    // of you does not fire (a dash kill is point-blank: its ring would land
    // on you before it could be seen)
    room: { who: 'all', density: 0.4, others: 0.25, near: 3, cap: 6 },   // a level's own `hard` overrides these
  },
};
