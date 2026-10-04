import { TUNING as T } from './tuning.js?v=86';

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
    blurb: 'a small disc — the rim holds you, the swarm does not',
    sky: { void: [0.0015, 0.0015, 0.0015], horizon: [0.30, 0.02, 0.02], band: 4.8, stars: 0.22 },
    floor: { tint: [1, 1, 1], glow: 0.9 },
    // Background only. The pieces sit outside the disc (manifest `at`).
    // They are not cover and the ground ring stays off.
    backdrop: { visible: true, emissive: 0.42 },
    fog: { color: [0.030, 0.005, 0.005], near: 16, far: 68 },
    dust: { color: [0.85, 0.38, 0.20], size: 0.075, opacity: 0.24 },
    ground: null,
    // v55 (owner): the piles and the drifting slabs were the problem — a
    // large level full of obstacles. The disc is empty. Cover stays in the
    // code; this season does not ask for it.
    pillars: null,
    platforms: null,
    // v54 weapon, kept: the bare Devil Daggers hand and white daggers.
    hand: { model: 'daggerHand', pose: { x: 0.44, y: -0.62, z: -1.05, rx: -0.45, ry: Math.PI + 0.30, rz: -0.16 },
      muzzle: [0.30, -0.14], glow: [2.2, 0.22, 0.08] },
    // v55: no rockfall. Falling shale is another obstacle on a disc that is
    // supposed to stay open. The run still ends.
    finale: null,
    goo: null,
    inca: null,
    roster: null,
    weapon: 'dd',
    rubbleFloor: false,
    // Smaller than the 26-unit control. The rim CLAMPS. Stepping off is not
    // a death — HYPER's clock and this edge were killing runs before an
    // enemy did. The clock below is long enough that a clean player is
    // still alive for the first real wave; hits are what spend it.
    arena: 14,
    edge: 'clamp',
    life: { start: 52, cap: 74, hitCost: 12 },
    // One skull, then other types. Not the pulse parade of watchers,
    // blinkers, crowned skulls and dread skulls.
    spawns: { script: 'dd' },
    end: 300,
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
    blurb: 'the sea — one wave, and you jump it',
    // v48 (owner, 2026-09-21): "make season 2 just the wave that you need to
    // jump over. Only random skulls as enemies otherwise." So: no slabs, no
    // rock, no roster but the skull family, and the wave is a HAZARD sized
    // to a single jump, not a floor that carries you.
    spawns: { only: 'skulls', base: 2.6, floor: 0.9, slope: 0.012, cap: 28, first: 1.2 },
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
    mode: 'truck',                       // the Clustertruck rules: the road is the arena, falling is death
    abilities: { jumps: 2, dash: true },
    blurb: 'the convoy — trucks that drive, momentum you keep, and a look that fires',
    sky: { void: [0.0015, 0.0015, 0.0022], horizon: [0.36, 0.13, 0.03], band: 4.2, stars: 0.3,
      sun: 0.55, haze: 0.05, sunDir: [0.0, 0.05, -1] },   // a low sun dead ahead: you are driving into it
    floor: { tint: [1, 1, 1], glow: 0.9 },   // the disc is hidden on the track
    backdrop: { visible: false, emissive: 0 },
    fog: { color: [0.022, 0.011, 0.006], near: 18, far: 72 },
    dust: { color: [0.85, 0.55, 0.30], size: 0.05, opacity: 0.16 },
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
      speed: [16, 40], turn: [1.2, 10], every: [0.5, 0.26], life: 2.6, damage: 1,
      trucks: true },   // v53: the cabs lock too — three missiles and a truck jackknifes and spills its load
    // v54 CARGO IS THE SCORE: the run's time is the clock PLUS the load — a
    // crate that spills onto the road costs `spill` seconds, a loose crate you
    // land on and set back pays `save`. The convoy is a load you are keeping whole.
    cargoScore: { spill: 1, save: 1 },
    end: 300,
    built: true,
    todo: [
      'trucks that read as trucks — a cab, a trailer, wheels (they are slabs)',
      'the missile look: they fly as daggers today',
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
