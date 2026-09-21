// Toko Move — PARCELS: what you are carrying, as a shape and a colour.
//
// Owner, 2026-09-18: "Recipients names aren't needed. Maybe package size is
// relevant, can carry many smaller but only few or one larger. They can be
// also color coded rather than named."
//
// So two things change and they are the same change. A job used to be a PERSON
// at a destination — "Riikka · Ooppera · asks for you" — which is three words
// before you reach the thing you are choosing between. It is a PARCEL now: a
// coloured box whose SIZE is what it costs you to carry. Colour says what kind
// of thing it is, size says how much of the bag it takes, and neither needs
// reading. That is the same Mini Metro rule the UI pass followed in v2.41 —
// shapes before words — applied to the one row the whole game is played from.
//
// THE CAPACITY IS THE SENTENCE. "Many smaller but only few or one larger":
// a bag of 5, small 1, medium 2, large 5. Five smalls, two mediums with a small
// beside them, or ONE large and nothing else. A large parcel is a decision
// about the whole leg rather than a number on a card, and it is the first time
// this game has asked you to give something up to take something.
//
// ONE PALETTE. There were two — `cargoColour` in core-v212.js and
// `cargoColourOf` in job-board-v212.js — and they disagreed on all eight
// cargoes, so the marquee ring and the offer row drew the same parcel in two
// colours. A colour that means something may only be defined once.

export const CAPACITY = 5;

export const SIZES = { small: 1, medium: 2, large: CAPACITY };

// Size is a property of the THING, so it is declared beside the cargo and not
// derived from its price: a folder of documents is small whatever it is worth.
export const SIZE_OF = {
  documents: 'small',
  express: 'small',
  'hot food': 'small',
  parts: 'medium',
  'fresh food': 'medium',
  'market goods': 'medium',
  fragile: 'large',
  equipment: 'large',
};

// Eight hues, checked against each other in test/parcels.mjs rather than picked
// by eye: two parcels a player cannot tell apart are two parcels with no colour
// coding at all.
export const COLOUR = {
  documents: '#2f9fb8',
  'hot food': '#e2683c',
  parts: '#7c8a92',
  fragile: '#9b59b6',
  equipment: '#3d5a80',
  express: '#e0a53a',
  'fresh food': '#5aa860',
  'market goods': '#8c3b2e',
};

export const sizeOf = cargo => SIZE_OF[cargo] || 'medium';
export const unitsOf = cargo => SIZES[sizeOf(cargo)] || SIZES.medium;
export const colourOf = cargo => COLOUR[cargo] || '#233d4d';

// What a size is worth. A large parcel takes the whole bag, so it has to pay
// for the drops it stops you taking or nobody would ever take one — and a small
// one pays less than it used to, or the bag would simply be free money. The
// multipliers are measured in VERSIONS.md, not chosen.
export const PAY = { small: 0.82, medium: 1, large: 1.45 };
export const payFor = cargo => PAY[sizeOf(cargo)] ?? 1;

// ── the drawing ───────────────────────────────────────────────────────────
// A parcel is a flat fill inside a hard line, the house register, sized by its
// units. The tape line on a large one is what stops the three sizes reading as
// one box at three zooms.
const PX = { small: 13, medium: 19, large: 27 };
export const pixelsOf = cargo => PX[sizeOf(cargo)] || PX.medium;

export function parcelHtml(cargo, { title = '', max = Infinity } = {}) {
  const s = sizeOf(cargo), px = Math.min(PX[s] || PX.medium, max);
  return `<span class="pcl pcl-${s}" style="--pc:${colourOf(cargo)};width:${px}px;height:${px}px"${title ? ` title="${String(title).replace(/"/g, '&quot;')}"` : ''}></span>`;
}

// THE BAG, as space rather than as a count. Each carried parcel draws at its
// own width and the rest of the bag is empty slots, so "one more small would
// fit and a large would not" is something you see instead of something you
// work out.
export function bagHtml(cargoes = [], capacity = CAPACITY) {
  const used = cargoes.reduce((a, c) => a + unitsOf(c), 0);
  const cells = cargoes.map(c => `<i class="bagP" style="--pc:${colourOf(c)};flex-grow:${unitsOf(c)}"></i>`).join('');
  // Free room draws as SLOTS, one per unit, not as one grown cell: a bar that
  // is 60% full is a progress bar, and five separate gaps is a bag with two
  // spaces left in it. The difference is whether "would a medium fit?" is
  // something you read off or something you estimate.
  const free = Math.max(0, capacity - used);
  const slots = '<i class="bagFree"></i>'.repeat(free);
  return `<span class="bag" aria-label="bag ${used} of ${capacity}">${cells}${slots}</span>`;
}
