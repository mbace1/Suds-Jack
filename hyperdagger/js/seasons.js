import { TUNING as T } from './tuning.js?v=85';

/**
 * THE SEASON REGISTRY — the arena's ART is declared, the way a mode is.
 *
 * A mode says what the body can do and what is trying to kill it. A season
 * says what the world LOOKS like and what the hand is holding: the sky, the
 * fog, the motes, the ground, the backdrop's own light, the rock standing in
 * the arena, the slabs rising out of it, and the weapon profile. Modes and
 * seasons multiply — PURE in EMBER is the DD spine on black rock; MOVE in
 * INCA is the bench under a white sky.
 *
 * Owner's direction (2026-09-05), recorded in SEASONS.md:
 *   season 1 — the current look (black void, one red horizon, the Meshy
 *              skulls) plus growing and moving platforms and dark rock
 *              pillars that are hard to see; the weapon is a NEEDLER (fast
 *              nails) and a SHOTGUN (a wider blast of the same nails).
 *              Then, on looking: the 3D models were made for THIS season and
 *              look weird; nothing should float; fewer objects; the shale
 *              darker and shorter; lighting and vfx to smooth the look.
 *   season 2 — an aquamarine Inca skullscape: goo, soft edges on large voxel
 *              platforms, waves of goo voxels breaking across the arena, a
 *              whiter background with a blue horizon.
 *
 * `built` is honest: INCA carries its palette here so the seam is proven
 * with two entries, and its `todo` names what is still only words.
 * `?season=<id>` deep-links one; `hyperDaggerSeason` remembers the choice.
 */

/** @typedef {Object} Season
 *  @property {string} id
 *  @property {string} name
 *  @property {string} blurb
 *  @property {{void:number[], horizon:number[], band:number, stars:number}} sky
 *    void = the sky's base colour, horizon = the low band's colour, band =
 *    how tight the band hugs the horizon (bigger = thinner), stars 0..1
 *  @property {{tint:number[], glow:number}} floor
 *  @property {{visible:boolean, emissive:number}} backdrop  the manifest's env pieces: shown, and how much of their own bake they carry
 *  @property {{color:number[], near:number, far:number}} fog  what distance melts into
 *  @property {{color:number[], size:number, opacity:number}} dust  the drifting motes
 *  @property {number[]|null} ground  a matte plane outside the disc, so a monument stands on something
 *  @property {Object|null} pillars   dark rock standing in the arena (walls.js + shale.js)
 *  @property {Object|null} platforms growing, moving slabs (platforms.js + shale.js)
 *  @property {Object|null} goo       the breaking wave of voxels (goo.js)
 *  @property {Object|null} inca      the skullscape: giant skulls and terraces on the horizon (inca.js)
 *  @property {Object|null} roster    a recolour of every enemy body (roster.js) — null keeps the house bone
 *  @property {Object} [fx]           v61: what a kill, a hit and a shot LOOK like here (fx.js) — a style ('fire' | 'water' | 'road') and its colours; none is VOID
 *  sky.haze / sky.sun / sky.sunDir and floor.caustic are the tech-art terms (v44); zero is off
 *  @property {'dagger'|'needler'} weapon  the profile in T.weapons
 *  @property {boolean} built
 *  @property {string[]} [todo]
 */

/** @type {Season[]} */
export const SEASONS = [
  {
    // The control: the arena exactly as it was before seasons existed. The
    // gate's legacy sections run here, and it is the A in every A/B.
    id: 'void',
    name: 'SEASON 0 — VOID',
    hidden: true,   // v48: the gate's control, never a player-facing choice
    blurb: 'the bare disc, the Devil Daggers reference — daggers, nothing standing',
    sky: { void: [0.0015, 0.0015, 0.0015], horizon: [0.30, 0.02, 0.02], band: 4.8, stars: 0 },
    floor: { tint: [1, 1, 1], glow: 0.9 },
    backdrop: { visible: false, emissive: 0 }, // the v26 arena: one horizon line, nothing behind it
    fog: { color: [0.008, 0.008, 0.008], near: 24, far: 72 }, // the pre-v41 fog, untouched
    dust: { color: [0.72, 0.67, 0.64], size: 0.045, opacity: 0.12 },
    ground: null,
    pillars: null,
    platforms: null,
    goo: null,
    inca: null,
    roster: null,
    weapon: 'dagger',
    built: true,
  },
  {
    id: 'ember',
    name: 'SEASON 1 — EMBER',
    menu: 'SEASON 1',
    // v50 (owner, 2026-09-23): the modes are CONTROL SCHEMES a season picks,
    // not a player toggle. Seasons 1 and 2 play HYPER's rules and body —
    // dash on — plus a double jump. VOID declares none and stays the control.
    mode: 'hyper',
    abilities: { jumps: 2 },
    blurb: 'black shale you can barely see, slabs that rise and drift, the Devil Daggers dagger',
    // HD-019: what the menu says when this season is picked — a name, one
    // line of place, and the rules that differ, in the season's own colour
    card: { title: 'EMBER', accent: '#e0482a',
      tag: 'Black shale, drifting slabs and the Devil Daggers dagger.',
      rules: ['Your clock drains — every kill buys time back',
        'A touch costs 10 seconds, not the run',
        'The rockfall comes at 3:00 · survive to 5:00'] },
    sky: { void: [0.0015, 0.0015, 0.0015], horizon: [0.30, 0.02, 0.02], band: 4.8, stars: 0.22 },
    floor: { tint: [1, 1, 1], glow: 0.9 },
    // The owner's Meshy monuments were made for THIS season. The asset rig's
    // white light never reaches a piece at z −40, so they rendered as black
    // shapes with pink rims; the bake carries its own light now and the
    // crimson fills become the rims they were meant to be.
    backdrop: { visible: true, emissive: 0.45 },
    // LIGHTING AND VFX (owner: "could help smooth out the look"): the fog
    // leans toward the horizon's ember instead of pure black, so distance
    // melts into the glow rather than into a hole; the motes are embers; a
    // matte ground stands under the monuments so nothing floats.
    fog: { color: [0.030, 0.005, 0.005], near: 16, far: 64 },
    dust: { color: [0.85, 0.38, 0.20], size: 0.075, opacity: 0.24 },
    // v61 (HD-022) THE LOOK: FIRE IN THE DARK. What a kill, a hit and a shot
    // look like here (js/fx.js reads this). White-hot sparks that fall and
    // bounce once, embers that hang and die red, low smoke lit from below.
    // Every colour is linear HDR: over 0.78 it blooms.
    fx: {
      style: 'fire',
      spark: [3.6, 1.25, 0.30],          // the nail's own brass, hotter
      spark2: [2.8, 0.26, 0.07],         // the horizon's red
      flash: [2.6, 1.15, 0.42],
      smoke: [0.024, 0.014, 0.013],      // soot: near the void, so it reads as shape not grey
      dust: [0.05, 0.035, 0.03],
      glow: [1.5, 0.32, 0.08],           // what the smoke catches from below
      gem: [3.0, 0.22, 0.16],
      streak: [2.2, 0.5, 0.2],
      trail: { color: [2.6, 0.7, 0.16], chance: 0.55, size: 0.024 },
      // THE FLOOR IS A FLUID (fx-fluid.js): what a skull was full of pools
      // where it died — molten, then crusting from the rim in, then gone.
      // `a` is the hot end, `b` the crust. film/cool/sink/flow are per
      // simulation step (sixty a second): how thick a pool stands, how fast
      // it cools, how slowly a cold crust sinks away, how readily it runs.
      // RENDER · SDF: an SDF body dies as a raymarched liquid (sdf-ichor.js)
      ichor: { a: [1.7, 0.36, 0.06], b: [0.22, 0.012, 0.006], rim: [2.4, 0.9, 0.25], hot: [3.2, 1.9, 0.8] },
      fluid: { kind: 'magma', a: [2.3, 0.95, 0.38], b: [0.011, 0.007, 0.007], film: 0.22, cool: 0.0017, sink: 0.00012, flow: 0.9, spill: 0.5 },
      // the air: embers climbing off the floor, forever (one emit, wrapped
      // around the camera in the shader)
      ambient: { n: 300, color: [1.7, 0.42, 0.09], color2: [0.9, 0.08, 0.04], mix: 0.4,
        size: 0.03, rise: 0.42, drift: 0.25, twinkle: 0.9, box: [46, 11, 46] },
    },
    ground: [0.006, 0.0025, 0.0025],
    pillars: {
      count: 5,                 // fewer objects in general (owner)
      rMin: 7, rMax: 21,        // radius band they stand in (the disc is 26)
      hMin: 3, hMax: 7,         // shorter (owner)
      wMin: 1.1, wMax: 2.4,     // footprint side, each axis drawn separately
      color: [0.010, 0.009, 0.011], // darker (owner) — LINEAR, well under the grid
      glow: [0.030, 0.005, 0.004],  // the foot of each pile catches the horizon — barely
      minGap: 4.5,              // between piles, so there is always a way through
      // v53 COVER THAT DIES (owner): a pile has hit points. A nail takes one, a
      // shotgun a fistful; a body shoving against it wears it at `grind` a
      // second, a brute at `brute`. Past half it leans; at zero it collapses
      // into a heap of shale chunks (physical) and a spray of chips. Standing
      // behind one has a clock now, and the swarm is what runs it.
      hp: 70, grind: 3, brute: 10, rubble: [0.22, 0.19, 0.19],   // the chunks: lighter than the rock, or a heap on the void floor is invisible
      shale: { tile: 0, layer: 0.34, jitter: 0.16, turn: 0.09 },
    },
    platforms: {
      count: 4,
      rMin: 4, rMax: 19,
      wMin: 2.6, wMax: 4.6,     // footprint
      hMin: 0.4, hMax: 1.6,     // LOW mostly — the draw is SQUARED (owner)
      shale: { layer: 0.2, jitter: 0.1, turn: 0.05, tile: 0.65, tileLift: 0.06, tileTilt: 0.08,
        color: [0.014, 0.013, 0.015], tileColor: [0.022, 0.020, 0.019], glow: [0.045, 0.008, 0.006] },
      grow: 1.4, sink: 1.1,     // s
      lifeMin: 14, lifeMax: 24, // s standing before it sinks and re-seeds elsewhere
      drift: 0.9,               // u — the slow orbit radius
      driftW: 0.18,             // rad/s
      avoidPlayer: 4.5,         // u — never grows under your feet
    },
    // v54 (owner: *change season 1's weapon closer to the Devil Daggers
    // example*): the bare hand (voxel.js daggerHand), back to the eye, fingers
    // up and tilted a little forward, white daggers off the fingertips. The
    // needler (v52) stays in the registry as a profile; season 1 no longer wears it.
    hand: { model: 'daggerHand', pose: { x: 0.44, y: -0.62, z: -1.05, rx: -0.45, ry: Math.PI + 0.30, rz: -0.16 },
      muzzle: [0.30, -0.14], glow: [2.2, 0.22, 0.08] },
    // v53 THE FINALE (owner: *nothing in a season ends*): at three minutes the
    // sky throws shale. For `duration` seconds a chunk falls every `every`
    // seconds onto a random point of the disc from `height` up — a rock that
    // lands on you is a hit — and the fallen rock stays as heaps: the new floor.
    // Survive it and the run goes on, with the director `after.pressure` tighter.
    // (the rock is PALE — the first loop dropped shale-dark chunks against a
    // black sky and nothing could be seen falling — and each drop stands a
    // beam on its landing spot for the fall, the way a heavy spawn is marked)
    finale: { at: 180, kind: 'rockfall', name: 'THE ROCKFALL', duration: 10, every: 0.2, height: 16, size: 0.95,
      color: [0.46, 0.38, 0.34], beam: [1.6, 0.32, 0.1], after: { pressure: 1.3 } },
    goo: null,                  // season 2's, not season 1's
    inca: null,
    roster: null,
    weapon: 'dd',   // v54: the Devil Daggers dagger — white blades from a bare hand (was the needler)
    // v54 THE RUBBLE IS THE LEVEL: a heap that has come to rest is ground —
    // you stand on it, a volley stops on it, the swarm goes round it. The
    // piles come down, the rockfall comes down, and what you fight on at four
    // minutes is what the first three left behind.
    rubbleFloor: true,
    // v54 A RUN THAT ENDS: at `end` seconds the season is over and the recap says what the run did
    end: 300,
    // Wave pacing: DD-like pressure with breathing gaps after heavies
    waves: [
      // v62 (HD-023): an act STEERS the tuned HYPER director (tuning.js), it
      // does not replace it. `density` multiplies the tuned budget (1 = as
      // tuned), `kind` leans the picks, `gap` is the valley the act opens on.
      { t: 0,   kind: 'skulls',  name: 'THE SWARM',   density: 1.0,  gap: 0 },
      { t: 25,  kind: 'mix',     name: 'THE PARADE',  density: 1.0,  gap: 3 },
      { t: 50,  kind: 'heavies', name: 'THE HEAVIES', density: 1.1,  gap: 4 },
      { t: 80,  kind: 'skulls',  name: 'THE SQUEEZE', density: 1.1,  gap: 3 },
      { t: 120, kind: 'mix',     name: 'THE HOST',    density: 1.15, gap: 4 },
      { t: 180, kind: 'finale',  density: 1.25, gap: 0 },
    ],
    built: true,
  },
  {
    id: 'inca',
    name: 'SEASON 2 — INCA',
    menu: 'SEASON 2',
    // v50 (owner, 2026-09-23): the modes are CONTROL SCHEMES a season picks,
    // not a player toggle. Seasons 1 and 2 play HYPER's rules and body —
    // dash on — plus a double jump. VOID declares none and stays the control.
    mode: 'hyper',
    abilities: { jumps: 2 },
    blurb: 'jump the waves — skulls are support',
    card: { title: 'INCA', accent: '#2fbfa3',
      tag: 'A drowned temple at golden hour. The sea is the threat.',
      rules: ['Jump the waves — a clean jump buys 2 seconds, a hit costs 10',
        'Your clock drains — every kill buys time back',
        'The sea drains at 3:00 · survive to 5:00'] },
    // v48 (owner, 2026-09-21): "make season 2 just the wave that you need to
    // jump over. Only random skulls as enemies otherwise." So: no slabs, no
    // rock, no roster but the skull family, and the wave is a HAZARD sized
    // to a single jump, not a floor that carries you.
    // v62: was base 2.6 / floor 0.9 — under a clock that drains a second a
    // second and a skull that pays one, that cadence could not be survived.
    spawns: { only: 'skulls', base: 1.0, floor: 0.6, slope: 0.004, cap: 28, first: 1.2 },
    // v62 THE SEA PAYS: a crest cleared in the air buys this many seconds
    crestPays: 2,
    waves: [
      // v62 (HD-023): here `density` multiplies the skull cadence (`spawns`).
      // The sea-led acts run thinner, because a cleared crest pays too.
      { t: 0,   kind: 'wave',   name: 'THE SEA',      density: 0.8,  gap: 0 },   // learn the jump
      { t: 30,  kind: 'skulls', name: 'THE DROWNED',  density: 1.1,  gap: 3 },
      { t: 55,  kind: 'wave',   name: 'HIGH WATER',   density: 0.9,  gap: 4 },
      { t: 90,  kind: 'skulls', name: 'UNDERTOW',     density: 1.2,  gap: 3 },
      { t: 140, kind: 'wave',   name: 'SPRING TIDE',  density: 1.0,  gap: 4 },
      { t: 180, kind: 'finale', density: 1.3, gap: 0 },
    ],
    // v52 THE VISUAL LEAP (owner: "visual leap to season 2"). Looked at first:
    // a flat overcast grey sky nothing could stand against, a floor whose
    // grain read as gravel, everything one teal, and the giant skulls cropped
    // into green slabs across half of every frame. Now: A DROWNED TEMPLE AT
    // GOLDEN HOUR. A deep teal zenith falling to a horizon that burns gold
    // toward a huge low sun ringed in stepped bands — a sun stone — so the
    // skulls and the pyramids are whole dark SHAPES against light; the floor
    // is dark water with its grid and the sun's broken path across it; the
    // wave is backlit; the air carries gold.
    sky: { void: [0.01, 0.06, 0.07], horizon: [0.30, 0.16, 0.04], band: 3.0, stars: 0,
      haze: 0, sun: 1.0, sunDir: [0.0, 0.1, -1],
      zenith: [0.006, 0.055, 0.068], glow: [0.95, 0.52, 0.13],
      sunCol: [1.7, 1.0, 0.38], sunSize: 0.085, rings: 0.8 },
    // the grid on dark water: the texture's grain pressed down to a quarter,
    // the lines kept; caustics under it; and the sun's path on top
    floor: { tint: [0.22, 0.85, 0.72], glow: 3.0, caustic: 0.4, grain: 0.45, glint: 1.0 },
    backdrop: { visible: false, emissive: 0 }, // season 1's monuments are season 1's; the Inca skullscape is on the list
    // gold air: the distance melts into the horizon's colour, not into grey
    fog: { color: [0.30, 0.19, 0.08], near: 24, far: 115 },
    dust: { color: [1.2, 0.85, 0.35], size: 0.07, opacity: 0.32 },   // pollen in the low sun
    // v61 (HD-022) THE LOOK: WATER AND LIGHT. A kill is a fountain — beads of
    // the sea thrown up and falling back — with gold dust in it and rings on
    // the surface; the crest throws spray. Nothing here is fire.
    fx: {
      style: 'water',
      spark: [2.6, 1.9, 0.55],           // gold dust: the sun in the air
      spark2: [0.5, 2.1, 1.7],
      flash: [1.9, 1.7, 1.0],
      drop: [0.10, 0.62, 0.55],          // a bead of the sea (opaque: it must read against a gold sky)
      drop2: [0.85, 0.72, 0.30],         // …and one in three catches the sun
      smoke: [0.30, 0.46, 0.42],         // spray mist
      glow: [0.35, 0.28, 0.10],
      gem: [2.4, 1.9, 0.5],
      streak: [0.9, 2.2, 1.8],
      trail: { color: [0.4, 2.2, 1.8], chance: 0.5, size: 0.024 },
      // THE FLOOR IS A FLUID (fx-fluid.js): the sea rings. `a` is the light a
      // ring's crest catches, `b` the foam; c2 is how fast a ring travels,
      // damp how long it lives.
      ichor: { a: [0.16, 0.75, 0.66], b: [0.02, 0.16, 0.17], rim: [1.6, 1.4, 0.6], hot: [0.6, 1.5, 1.3] },   // the goo: jade, with the sun on its edge
      fluid: { kind: 'water', a: [0.30, 0.95, 0.80], b: [0.62, 0.92, 0.85], c2: 1.0, damp: 0.987, foam: 0.955, strength: 1 },
      ambient: { n: 220, color: [1.9, 1.45, 0.5], color2: [0.6, 1.6, 1.3], mix: 0.25,
        size: 0.028, rise: 0.05, drift: 0.35, twinkle: 1.0, box: [50, 13, 50] },
    },
    ground: [0.012, 0.04, 0.045],                                     // the sea past the disc
    // v53 THE FINALE: the sea DRAINS — over `drainFor` seconds the water goes,
    // the caustics with it; the temple floor shows for `dryFor` seconds and
    // seven stone steps rise out of it; then the sea comes back over `refill`
    // and the tide goes on. The steps stay: stand on one and the wave passes
    // under your feet — the refuges you earn by surviving the drain.
    finale: { at: 180, kind: 'drain', name: 'THE SEA DRAINS', drainFor: 4, dryFor: 14, refill: 5,
      steps: { count: 7, rMin: 5, rMax: 20, wMin: 2.4, wMax: 3.4, hMin: 1.5, hMax: 2.0,
        shale: { layer: 0.3, jitter: 0.08, turn: 0.04, tile: 0.8, tileLift: 0.05, tileTilt: 0.05,
          color: [0.06, 0.11, 0.10], tileColor: [0.10, 0.17, 0.15], glow: [0.10, 0.30, 0.26] },
        grow: 1.6, sink: 1.1, lifeMin: 99999, lifeMax: 99999, drift: 0, driftW: 0, avoidPlayer: 4 },
      after: { pressure: 1.3 } },
    // the jade macuahuitl, throwing obsidian (voxel.js jadeHand; tuning obsidian)
    hand: { model: 'jadeHand', pose: { x: 0.52, y: -0.5, z: -1.05, rx: 0.42, ry: Math.PI + 0.3, rz: -0.22 },
      muzzle: [0.36, -0.2], glow: [0.35, 2.4, 2.0] },
    pillars: null,
    platforms: null,           // v48: nothing stands in the sea — the wave is the arena
    // THE WAVE (v43). A crest sweeps the disc, rises, leans into its travel
    // and breaks; stand on it and it carries you. See js/goo.js.
    goo: {
      cell: 0.5,                // v48: half cells — a crest of jump height is three rows, not one (a one-row crest was a fence)
      round: 0.2,               // v47: and every one of them is a ROUNDED cube
      fill: 1.05,               // ...overlapping, so the sea is one skin and not pebbles
      // v48 JUMPABLE. jumpV 8.6 against gravity 24 is an apex of 1.54 — the
      // crest sits under it with air to spare, and a double jump is a safety.
      // A wave you cannot clear is a wall that moves; this is a hurdle.
      hurts: true,              // contact is a HIT (HYPER: time + a shove; PURE: death); it no longer carries
      hurtFrom: 0.8,            // v50: only the CREST hurts. At 0.35 the whole swell did, for a full
                                // second at any point — longer than a jump stays in the air (0.72 s)
      amp: 1.1,                 // crest height above the floor — ×1.22 at the ripple's peak is 1.34, under the 1.54 apex with a hand of air
      width: 5,                 // v50: 8 was a hill you landed back on; 5 passes under one jump
      gap: 16,                  // clear water between one wave and the next
      // v53 THE TIDE (owner: *the tide comes in*): from 30 s to 150 s the waves
      // come CLOSER (gap 16 → 8) and FASTER (9 → 11: a faster crest is past in
      // less of a jump, so the tide sharpens the read without closing the
      // window — jumped in the gate at both ends) with a bigger swell along the
      // crest; and the crest carries the bone heaps with it (gibs.js carry).
      tide: { from: 30, to: 150, gap: 8, speed: 11, ripple: 0.18 },   // ripple UNDER 0.27: past it the swell dips the crest below hurtFrom and the wave has gaps you can walk through
      speed: 9,                 // u/s. Fitted by jumping a body over it in the real code (gate):
                                // one jump clears in a 0.26 s window, the double jump in 0.79 s
      lean: 0.5,                // how far the crest leans forward as it steepens
      ripple: 0.22, rippleK: 0.19, // a swell along the crest: a sea, not an extrusion
      push: 0,                  // v48: it does not carry (kept for a sea that wants to — `hurts: false`)
      deep: [0.012, 0.09, 0.11], // in the body — dark water
      lip: [0.09, 0.46, 0.46],   // at the break — well under the bloom threshold: the gel's RIM is what blooms, and only at edges
      rim: [0.35, 0.95, 0.85],  // what the gel shader adds at edges and inside: NOT HDR
      // gel.js terms: rim glow, light inside, a wet highlight, jelly wobble
      // v47: the rim is HALF what it was, because rounding the cubes changed
      // what it costs. A flat-faced box shows a fresnel rim only at its
      // silhouette; a rounded one curves away everywhere, so the same number
      // that lit an edge now lights the whole piece and the sea went white.
      fresnel: 0.45, caustic: 0.45, spec: 0.7, wobble: 0.05, sss: 0.35,
      // v47 the SOLID PHASE: what a seized piece of goo looks like — pale,
      // matte, speckled. `shearRef` is how fast the surface has to be moving
      // (units per second) to count as fully seized — measured off the wave's
      // own slope, so it does not change with the frame rate.
      seize: [0.80, 0.94, 0.92], seizeK: 0.3, shearRef: 9,   // v50: ×9/5 for the steeper, faster face (peak ~6.6 u/s)
      // v48: 0.8 painted the whole face pale — the seize is a frosting now, not the paint
      // ...and `shearRef` is recalibrated with it: the break of THIS crest
      // peaks at ~3.7 u/s of surface motion (amp 1.1 down a face 4.4 long at
      // speed 8), so a 12 u/s "fully seized" meant the wave never seized at
      // all and the solid phase only ever showed on an impact ring.
      lipFrom: 0.62,            // v48: the foam is the top third of the crest; below it the body stays dark water
      // v48 THE FLOOR READS THE WAVE: a shadow under its body and a bright
      // foam line at the foot of its face, so you see it coming across the
      // floor before it is on you (main.js floor shader, uWave)
      floorWave: { shadow: 0.42, foam: 0.4 },   // foam 0.7 was a light bar you could read the arena by
      // (v47's sink-when-still was the sea as a floor; a hazard has no floor to sink into)
      // v46 impact rings: a nail or a body striking the sea spreads a ring
      rippleHit: { amp: 1.4, speed: 6.5, width: 1.3, fade: 1.6, reach: 7, life: 1.6, max: 12 },
      // the break: cubes shed off the lip ahead of the crest
      sprayFrom: 0.8, sprayChance: 0.05, sprayMax: 10,   // v48: half cells — more, smaller cubes off the lip
    },
    // the horizon: the game's own skull at monument size, half-buried, and a
    // stepped city behind it — through the fog, pale
    inca: {
      // the skull is the game's own string-art skull at ×22 — forty units of
      // bone, half-buried just past the rim, a DARK aquamarine silhouette
      // against the white sky (a pale skull in a pale fog was a cloud)
      // v52: OUT at the horizon, in a fan round the sun, unfogged and dark, so
      // each is a whole silhouette with its gold eyes lit — just past the rim
      // they cropped into green slabs that filled half of every frame
      // (first try, ×34 at 40–64 out: seventy-five units wide, still looming overhead as slabs)
      skulls: { count: 3, rMin: 72, rMax: 96, scale: 15, sinkMin: 0.04, sinkMax: 0.14, tint: [0.08, 0.12, 0.12],
        arc: [-Math.PI / 2, 2.3], fog: false },
      // the pyramids stay in the gold air, darker, so they layer into it
      terraces: { count: 9, rMin: 28, rMax: 62, wMin: 14, wMax: 28, hMin: 9, hMax: 24, steps: 6, color: [0.035, 0.07, 0.07] },
    },
    // THE ROSTER (v45). Owner: *enemies will be new — aquamarine, green,
    // yellows, but also slightly Aztec themed*. The new sculpts arrive through
    // the manifest when they are made; the colour is the game's now, for
    // whatever body is in the slot: a turquoise-mosaic recolour banded by
    // lattice row (turquoise / jade / turquoise / gold), the seams stepped,
    // the eyes burning gold. See roster.js.
    roster: {
      palette: 'mosaic',
      rows: 3,
      bands: [[0.10, 0.66, 0.60], [0.08, 0.50, 0.22], [0.10, 0.66, 0.60], [0.92, 0.72, 0.12]],
      hdr: [3.6, 2.2, 0.25],   // the eyes: gold, not ember
      mark: [0.95, 0.80, 0.18], // a red in the source goes yellow — the season has no red
      jitter: 0.12,
    },
    weapon: 'obsidian',   // v52: turquoise crystal, not season 1's nail
    // v54 THE EBB (owner-approved next leap): the finale's drain comes early
    // and partial. From `from` seconds, every `every` seconds the sea pulls
    // back to `depth` for a few seconds; on the first ebb low steps rise —
    // UNDER the crest (a step is a place to be while the water is out, not a
    // place to hide when it comes back: the crest still takes you off one).
    // The finale's full drain at 180 builds the tall steps over them.
    ebb: { from: 45, every: 60, depth: 0.85, out: 2.5, dry: 7, back: 3,
      steps: { count: 5, rMin: 5, rMax: 18, wMin: 2.2, wMax: 3.0, hMin: 0.5, hMax: 0.8,
        shale: { layer: 0.25, jitter: 0.08, turn: 0.04, tile: 0.8, tileLift: 0.05, tileTilt: 0.05,
          color: [0.06, 0.11, 0.1], tileColor: [0.1, 0.17, 0.15], glow: [0.1, 0.3, 0.26] },
        grow: 1.2, sink: 1.1, lifeMin: 99999, lifeMax: 99999, drift: 0, driftW: 0, avoidPlayer: 4 } },
    end: 300,
    built: true,
    // wanted, not owed: neither blocks the season being complete
    todo: [
      'the new season 2 sculpts (aquamarine / green / yellow, Aztec) — the recolour holds the slot until they arrive',
      'the Inca backdrop from real art, if any arrives — the skullscape is the game\'s own skull for now',
    ],
  },
  {
    // v51 (owner, 2026-09-23): *Season 3 should be the truck mode, with moving
    // platforms and forward momentum. Also double jump and dash. No need for
    // shoot, but if you look at enemies close enough it deploys homing
    // missiles, with slightly longer look meaning faster, more targeted
    // missiles.*
    id: 'haul',
    name: 'SEASON 3 — HAUL',
    menu: 'SEASON 3',
    waves: [
      // v62 (HD-023): TRUCK has no director, so here `density` multiplies the
      // convoy's own skull rate. Until v62 this table was read by nothing.
      { t: 0,   kind: 'trucks', name: 'THE CONVOY', density: 0.5, gap: 0 },   // learn the platforms
      { t: 35,  kind: 'gaze',   name: 'LOCK ON',    density: 1.0, gap: 0 },   // the look has work
      { t: 80,  kind: 'skulls', name: 'OPEN ROAD',  density: 0.7, gap: 0 },   // a lighter beat
      { t: 130, kind: 'ahead',  name: 'HEADWIND',   density: 1.25, gap: 0 },
      { t: 180, kind: 'finale', density: 1.0, gap: 0 },
    ],
    noRear: true,   // enemies spawn only in the forward hemisphere
    mode: 'truck',                       // the Clustertruck rules: the road is the arena, falling is death
    abilities: { jumps: 2, dash: true },
    blurb: 'the convoy — trucks that drive, momentum you keep, and a look that fires',
    card: { title: 'HAUL', accent: '#f0a830',
      tag: 'A convoy at dusk, driving into the sun.',
      rules: ['Stay on the trucks — the road kills, and so does a skull',
        'No gun: hold your look on a skull and missiles fly',
        'The pile-up comes at 3:00 · survive to 5:00'] },
    sky: { void: [0.0015, 0.0015, 0.0022], horizon: [0.36, 0.13, 0.03], band: 4.2, stars: 0.3,
      sun: 0.55, haze: 0.05, sunDir: [0.0, 0.05, -1] },   // a low sun dead ahead: you are driving into it
    floor: { tint: [1, 1, 1], glow: 0.9 },   // the disc is hidden on the track
    backdrop: { visible: false, emissive: 0 },
    fog: { color: [0.022, 0.011, 0.006], near: 18, far: 72 },
    dust: { color: [0.85, 0.55, 0.30], size: 0.05, opacity: 0.16 },
    // v61 (HD-022) THE LOOK: SPEED AND SMOKE. The road has no floor to pool
    // on, so its liquid is in the air: a missile is a flame and the smoke
    // behind it, a kill is a fireball, and the dust standing over the road
    // is drawn as streaks by the speed you pass it at.
    fx: {
      style: 'road',
      spark: [3.8, 1.7, 0.45],           // sodium
      spark2: [3.0, 0.5, 0.10],
      flash: [2.9, 1.5, 0.5],
      smoke: [0.05, 0.042, 0.04],        // grey, a step off the road's black
      dust: [0.09, 0.07, 0.05],
      glow: [0.9, 0.34, 0.08],
      gem: [3.0, 0.9, 0.2],
      streak: [1.6, 1.1, 0.6],
      trail: { kind: 'missile', color: [4.0, 2.0, 0.7], every: 0.012 },
      carry: 1,                          // the convoy carries what is thrown on it
      ichor: { a: [0.10, 0.08, 0.07], b: [0.012, 0.010, 0.010], rim: [2.6, 1.2, 0.3], hot: [3.0, 1.4, 0.4] },   // burning oil
      ambient: { n: 100, color: [0.20, 0.14, 0.085], color2: [0.6, 0.34, 0.14], mix: 0.1,
        size: 0.008, rise: 0, drift: 0.1, twinkle: 0.2, stretch: 0.034, box: [40, 12, 70] },
    },
    ground: null,
    pillars: null,
    platforms: null,
    goo: null,
    inca: null,
    roster: null,
    // v53 THE FINALE: THE PILE-UP. Every truck within `reach` ahead folds and
    // stops dead: a wall of wrecks across the road you cross truck to truck,
    // standing still, cargo everywhere. Past it the convoy runs `resume` faster
    // and the skulls come thicker.
    finale: { at: 180, kind: 'pileup', name: 'THE PILE-UP', reach: 70, duration: 14, resume: 1.2, after: { skulls: 1.4 } },
    weapon: 'missile',                   // v52: missiles that look like missiles
    hand: { model: 'launcherHand', pose: { x: 0.5, y: -0.46, z: -1.05, rx: 0.02, ry: Math.PI + 0.22, rz: 0.06 },
      muzzle: [0.4, -0.2], glow: [2.6, 1.3, 0.25] },                    // the missiles fly as daggers — every hit and kill path is theirs
    // THE CONVOY (truck.js): the trucks drive at their own speeds and sway in
    // lane; standing on one carries you, and in the air you keep its speed.
    // The gap between trucks is a real gap now (edge to edge ~1.5–6 u): one
    // jump with a run-up clears the short ones, the double jump the long.
    // v51b (owner: *based on Clustertruck — the platforms need to feel
    // lopsided, fast moving*): js/convoy.js. Trucks at 20 ± 3 u/s that pick
    // new speeds, change lanes and brake hard; trailers of different heights,
    // each loaded crooked (roll ±`roll`, pitch ±`pitch`), jostling (`jostle`),
    // bouncing (`bob`), leaning into lane changes and diving under braking.
    // Touch the road and you are dead (`fallY`, just above the asphalt).
    truck: { moving: true, speed: 20, speedVar: 3, laneSpeed: 3.2, brakeChance: 0.14, sideChance: 0.55,
      ahead: 80, roll: 0.12, pitch: 0.05, jostle: 0.035, bob: 0.07, leanK: 0.05, diveK: 0.05,
      skullsFrom: 3, fallY: -2.9 },
    // THE GAZE (gaze.js): hold the look on an enemy inside `range` and within
    // `cone` of the view's centre; after `dwell` a missile leaves every
    // `every` seconds, its speed and turn rate lerped by how long the look
    // has been held (up to `full`). A glance sends a lazy missile that can
    // miss; a held look sends a fast one that will not.
    gaze: { range: 24, cone: 0.16, grace: 0.2, dwell: 0.25, full: 1.2,
      speed: [16, 40], turn: [1.2, 10], every: [0.5, 0.26], life: 2.6, damage: 1 },
    // v58 (HD-018, Mikael: *you don't shoot trucks.. or save crates*): the look
    // locks skulls only, and the load is not the score. v53 let the cabs lock
    // and v54 paid for crates set back by a stomp and charged for crates the
    // road took. Crates still ride, slide and spill, as floor and as spectacle,
    // and the clock is TIME SURVIVED like the TRUCK mode's (no goal/clock of
    // the season's own, so the mode's words show).
    end: 300,
    built: true,
    // wanted, not owed. The missiles have their own trail since v61 (fx.trail).
    todo: [
      'the platforms as landspeeders (HD-014) — they are slabs with a cab',
    ],
  },
];

const BY_ID = new Map(SEASONS.map(s => [s.id, s]));

/** Never undefined: an unknown id lands on season 1, the house look. */
export function seasonById(id) { return BY_ID.get(id) ?? SEASONS[1]; }

/** Cycle order is registry order. */
export function nextSeasonId(id) {
  const i = SEASONS.findIndex(s => s.id === id);
  return SEASONS[(i + 1 + SEASONS.length) % SEASONS.length].id;
}

/** The season's weapon profile, laid over T.weapon. */
export function weaponOf(season) { return T.weapons?.[seasonById(season).weapon] ?? {}; }

/**
 * v48: the gel MOUND is no longer in any season (season 2 is the wave alone),
 * but the material, the spring and the non-Newtonian goo are still the
 * game's, and the gate and the lab still stand a mound up to measure them.
 * This is the platforms block INCA carried through v47, verbatim.
 */
export const GEL_MOUND_SAMPLE = {
      count: 4,
      rMin: 5, rMax: 18,
      wMin: 5.0, wMax: 8.0,     // LARGE — the brief says large voxel platforms
      hMin: 0.9, hMax: 2.2,
      look: 'gel',              // a MOUND of goo cubes with soft edges, in the gel material
      gel: { cell: 1.0, deep: [0.012, 0.09, 0.11], lip: [0.07, 0.36, 0.38], round: 0.2, fill: 1.05 },
      grow: 2.0, sink: 1.6,
      lifeMin: 18, lifeMax: 30,
      drift: 0.6, driftW: 0.12,
      avoidPlayer: 5.5,
      spring: { spring: 0.24, damp: 0.86, min: 0.55, max: 1.35, thicken: 3.2, rate: 0.09 },
      landSquish: 0.32,
      nonNewtonian: { flowBelow: 3.2, fall: 1.3, rise: 0.5, depth: 0.75 },

};
