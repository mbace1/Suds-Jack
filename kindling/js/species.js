// Kindling — the roster.
//
// One table describing every creature in the game, because four systems need to
// agree about them and they were about to grow four private opinions:
//
//   room.js / pet.js   how it is drawn, and how it grows
//   combat.js          what it does in a turn-based fight
//   breeding.js        what it can pair with, and what the pairing makes
//   state.js           what you own, and what is still wild
//
// A creature is not one of "companion" or "enemy" — that is the owner's
// direction (2026-08-17): "some are also enemies, breeding partners. also there
// will be enemies that you can get as pets." So `roles` is a SET, and the same
// entry answers all four questions. A Moss Knight is an enemy you fight, and
// then an enemy you can keep.
//
// Everything visual here traces to `art-src/approved/` — the four character
// bibles and the global overview. The scale chart on the global sheet is the
// only place the roster's relative sizes are stated, so `unit` is that chart:
// Ember ~1.6u, Mossling ~1.6u, Ashling ~1.2u, Moss Knight ~2.4u. `PX_PER_UNIT`
// turns it into pixels on the 320x180 grid, so re-scaling the game later is one
// number rather than four sprite rewrites.

// 26px for a 1.6u adult — the height ART_REQUESTS.md §2 asks every sprite sheet
// to be authored at.
export const PX_PER_UNIT = 16.25;
export const px = unit => Math.round(unit * PX_PER_UNIT);

// ── the age ladder, shared by everything that grows ──
// The global bible states how age is carried and it is worth quoting because it
// rules out the obvious shortcut: "horn size, posture, accessories, and surface
// detail (cracks, moss, wear)" — explicitly NOT body type, the same sentence it
// uses to say gender is not body type either. So a stage may change the crown,
// the ornaments and the surface, and may change scale a little, but the base
// build is the same creature at every age.
export const STAGES = ['spark', 'wisp', 'tender', 'keeper', 'elder'];

// how far through the ladder a stage is, 0..1 — the one number the renderers
// and the combat maths both read, so "elder" means the same thing to both
export const stageAt = id => Math.max(0, STAGES.indexOf(id)) / (STAGES.length - 1);

export const SPECIES = {
  // ── EMBER — the companion you start with ──
  ember: {
    id: 'ember',
    name: 'Ember',
    roles: ['companion', 'breeder'],
    unit: 1.6,
    // what the sheet calls the silhouette features. `crown` is the single most
    // important one: it is what the age ladder is carried on, and it is what
    // tells two species apart at 26 pixels.
    crown: 'horn',
    build: 'round',            // big head, small body, no neck, no waist
    surface: 'stone',          // porous, speckled, a few lighter pits
    accent: 'ember',           // glow at the cracks and the tail tip
    wears: 'scarf',
    tail: 'ember-tip',
    // combat: turn-based (owner direction, 2026-08-17), three verbs from the UI
    // kit — STRIKE / GUARD / SKILL. `tendency` is the inherited combat style
    // from GDD §11 and it belongs to the body-outline trait zone, so it must
    // never also write to the crown or the face.
    combat: { hp: 26, strike: 6, guard: 4, skill: 7, speed: 6, tendency: 'skill-focused' },
    breedsWith: ['ember', 'mossling', 'ashling'],
    capturable: false,         // it is already yours
    art: { mode: 'placeholder', sheet: 'ember', cell: 40 },
  },

  // ── MOSSLING — the forest companion, and a breeding partner ──
  mossling: {
    id: 'mossling',
    name: 'Mossling',
    roles: ['companion', 'breeder', 'wild'],
    unit: 1.6,
    crown: 'antler',           // the one change that tells it from Ember at size
    build: 'round',
    surface: 'moss',           // moss and bark, with mushrooms growing on it
    accent: 'leaf',
    wears: 'satchel',
    tail: 'root',
    combat: { hp: 30, strike: 4, guard: 6, skill: 8, speed: 4, tendency: 'guard-heavy' },
    breedsWith: ['ember', 'mossling'],
    capturable: true,
    art: { mode: 'placeholder', sheet: 'mossling', cell: 40 },
  },

  // ── ASHLING — the hatchling ember-drake ──
  // The sheet calls it "hatchling / offspring", which only means something once
  // breeding exists — so this is the species a pairing can produce as well as
  // one you can meet.
  ashling: {
    id: 'ashling',
    name: 'Ashling',
    roles: ['companion', 'breeder', 'wild', 'offspring'],
    unit: 1.2,
    crown: 'spike',
    build: 'drake',            // a snout, spinal spikes, and WINGS
    surface: 'ash',
    accent: 'ember',
    wears: null,
    tail: 'ember-tip',
    wings: true,
    combat: { hp: 20, strike: 8, guard: 2, skill: 6, speed: 9, tendency: 'quick-striker' },
    breedsWith: ['ember', 'ashling'],
    capturable: true,
    art: { mode: 'placeholder', sheet: 'ashling', cell: 32 },
  },

  // ── MOSS KNIGHT — the enemy, and then the pet ──
  mossknight: {
    id: 'mossknight',
    name: 'Moss Knight',
    roles: ['enemy', 'wild'],
    unit: 2.4,
    crown: 'helm',
    build: 'armoured',         // broad, top-heavy, shield-forward
    surface: 'iron',           // stone and iron plates, overgrown
    accent: 'moss',
    wears: 'shield',
    tail: null,
    combat: { hp: 48, strike: 9, guard: 10, skill: 3, speed: 2, tendency: 'counterattacker' },
    breedsWith: [],            // it does not pair; it is captured
    capturable: true,
    // "Slow but relentless" on the sheet, and canon requires enemy intent to be
    // telegraphed before each action (GDD §13). In a turn-based fight that is a
    // POSE held for a beat before the hit, never a colour flash — a silhouette
    // change reads on a phone at arm's length and a tint does not.
    telegraph: 'pose',
    art: { mode: 'placeholder', sheet: 'mossknight', cell: 56 },
  },
};

// ── the questions the other systems ask ──

export const all = () => Object.values(SPECIES);
export const get = id => SPECIES[id] ?? SPECIES.ember;
export const has = (id, role) => (SPECIES[id]?.roles ?? []).includes(role);

export const companions = () => all().filter(s => s.roles.includes('companion'));
export const enemies = () => all().filter(s => s.roles.includes('enemy'));
export const capturable = () => all().filter(s => s.capturable);

// height in pixels at a given stage. A young creature is smaller, but only a
// little — canon says growth may use scale AS WELL as shape, never INSTEAD, so
// the range is deliberately narrow (72% at spark to 100% at elder) and the
// silhouette does the rest.
export function heightAt(id, stage = 'elder') {
  return Math.round(px(get(id).unit) * (0.72 + stageAt(stage) * 0.28));
}

// Can these two pair? Symmetric on purpose: a table where a pairs with b but b
// does not pair with a is a bug waiting to be found by a player.
export function canBreed(a, b) {
  const A = SPECIES[a], B = SPECIES[b];
  if (!A || !B) return false;
  return A.breedsWith.includes(b) && B.breedsWith.includes(a);
}

// What a pairing produces. Like parents make like; a mixed pairing makes an
// Ashling, which is what the sheet means by calling it the offspring species.
export function offspringOf(a, b) {
  if (!canBreed(a, b)) return null;
  return a === b ? a : 'ashling';
}
