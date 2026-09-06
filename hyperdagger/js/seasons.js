import { TUNING as T } from './tuning.js?v=72';

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
    blurb: 'the bare disc, the Devil Daggers reference — daggers, nothing standing',
    sky: { void: [0.0015, 0.0015, 0.0015], horizon: [0.30, 0.02, 0.02], band: 4.8, stars: 0 },
    floor: { tint: [1, 1, 1], glow: 0.9 },
    backdrop: { visible: false, emissive: 0 }, // the v26 arena: one horizon line, nothing behind it
    fog: { color: [0.008, 0.008, 0.008], near: 24, far: 72 }, // the pre-v41 fog, untouched
    dust: { color: [0.72, 0.67, 0.64], size: 0.045, opacity: 0.12 },
    ground: null,
    pillars: null,
    platforms: null,
    weapon: 'dagger',
    built: true,
  },
  {
    id: 'ember',
    name: 'SEASON 1 — EMBER',
    blurb: 'black shale you can barely see, slabs that rise and drift, a needler',
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
    ground: [0.006, 0.0025, 0.0025],
    pillars: {
      count: 5,                 // fewer objects in general (owner)
      rMin: 7, rMax: 21,        // radius band they stand in (the disc is 26)
      hMin: 3, hMax: 7,         // shorter (owner)
      wMin: 1.1, wMax: 2.4,     // footprint side, each axis drawn separately
      color: [0.010, 0.009, 0.011], // darker (owner) — LINEAR, well under the grid
      glow: [0.030, 0.005, 0.004],  // the foot of each pile catches the horizon — barely
      minGap: 4.5,              // between piles, so there is always a way through
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
    weapon: 'needler',
    built: true,
  },
  {
    id: 'inca',
    name: 'SEASON 2 — INCA',
    blurb: 'aquamarine skullscape under a white sky — palette only, the goo is not built',
    sky: { void: [0.44, 0.49, 0.54], horizon: [0.02, 0.28, 0.95], band: 2.2, stars: 0 },
    floor: { tint: [0.30, 0.95, 0.82], glow: 1.7 },
    backdrop: { visible: false, emissive: 0 }, // season 1's monuments are season 1's; the Inca skullscape is on the list
    fog: { color: [0.40, 0.46, 0.52], near: 20, far: 90 },
    dust: { color: [0.60, 0.92, 0.85], size: 0.06, opacity: 0.2 },
    ground: [0.05, 0.14, 0.13],
    pillars: null,
    platforms: {
      count: 4,
      rMin: 5, rMax: 18,
      wMin: 5.0, wMax: 8.0,     // LARGE — the brief says large voxel platforms
      hMin: 0.6, hMax: 1.8,
      shale: { layer: 0.3, jitter: 0.05, turn: 0.02, tile: 1.2, tileLift: 0.02, tileTilt: 0.02,
        color: [0.10, 0.30, 0.27], tileColor: [0.14, 0.42, 0.38] },
      grow: 2.0, sink: 1.6,
      lifeMin: 18, lifeMax: 30,
      drift: 0.6, driftW: 0.12,
      avoidPlayer: 5.5,
    },
    weapon: 'needler',
    built: false,
    todo: [
      'goo voxel waves breaking across the arena',
      'soft edges on the large voxel platforms (goo shader, not shale beds)',
      'the Inca skull backdrop through the manifest env seam',
      'bone enemies against a white sky — readability pass',
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
