// Toko Move — SKINS (v2.69; the itch art bible §1 and §3, MUTATORS.md).
//
// The art bible (toko-move/art/itch-bible/ART-BIBLE.md, approved with the
// minimal-metro look on 2026-11-01) makes DAY PAPER the default board and Night
// a mutator: "Default (no mutator) is the Day skin." Until now the game had one
// board, the owner's grey night map (board.js NIGHT, 2026-09-02); it is kept
// here whole as the Night skin, not replaced, because Night is still a way to
// play and the owner chose those greys.
//
// A skin is ONLY colour — the bible's own rule is that a mutator decides the
// skin and never the geometry, and the geometry stays exactly HSL's. Every
// value is the bible's; where it says "proposed" (the day tram inks) the table
// is copied as written and test/skin.mjs holds the bible's own floors: every
// day ink 3:1 on paper, no two closer than dE76 18, none of them the courier's
// cyan.
import { NIGHT, ROAD_INK_MAJOR, ROAD_INK_MID, ROAD_INK_MINOR, tramInk, lineFamily } from './board.js?v=8';

export const TOKO_CYAN = '#33b2d2';   // the player and Toko only: courier, info face
export const CORAL = '#e2683c';       // warning, late ring, halt stops — never a line
export const HALTED = '#b8c2c6';      // a halted line's grey dash
export const NAVY = '#233d4d';        // the ring while there is time, primary buttons

// Day tram inks (bible §1): each night ink's hue and chroma, lightness moved
// into L* 38–58 so it holds 3:1 on paper; tram 2 hand-set deeper so it never
// reads as the courier.
export const DAY_TRAM_INK = {
  '1': '#704d82', '2': '#04829a', '3': '#3e8ecc', '4': '#8a6802', '5': '#536122',
  '6': '#a3302c', '7': '#c76c8a', '8': '#3f65d6', '9': '#6c981c', '10': '#bd61c8',
  '11': '#026a30', '12': '#056666', '13': '#b0045f', '15': '#bc7c53', 'H': '#2c9c77',
};

export const DAY = {
  id: 'day',
  paper: '#f4f1e8', surround: '#f4f1e8',
  water: '#a9cfd6', waterFill: '#c9e4e8', waterEdge: '#9cc4cc',
  district: '#9b9586', credit: '#7d847f',
  label: '#3a474c', labelDim: '#69777a', halo: 'rgba(244,241,232,.92)',
  hub: '#ffffff', hubRing: '#15262b', stop: '#ffffff', stopRing: '#15262b',
  frame: 'rgba(21,38,43,.16)',
  // the live game keeps its street tiers (bible §3, note 1) — on paper they
  // are a whisper, so the lines are the only thing with colour
  road: { major: '#dcd6c8', mid: '#e2ddd1', minor: '#e7e3d9' },
  tram: DAY_TRAM_INK, metro: '#e2531f',
  ring: NAVY, flake: 'rgba(120,145,160,.75)',
};

export const NIGHT_SKIN = {
  id: 'night', ...NIGHT,
  road: { major: ROAD_INK_MAJOR, mid: ROAD_INK_MID, minor: ROAD_INK_MINOR },
  tram: tramInk(), metro: '#ff6a3d',   // bible: the metro lifts for the neon read
  ring: '#7ad3b0', flake: 'rgba(246,249,252,.85)',
};

// Snow Day (MUTATORS.md §4): Day with a white wash — paper about 6% lighter,
// water grey-blue, line colours unchanged.
export const SNOW = {
  ...DAY, id: 'snow',
  paper: '#faf9f4', surround: '#faf9f4', halo: 'rgba(250,249,244,.92)',
  water: '#a3b4be', waterFill: '#b9c7cf', waterEdge: '#93a6b1',
};

export const SKINS = { day: DAY, night: NIGHT_SKIN, snow: SNOW };

// Which skin a run wears. A mutator decides; an explicit ?skin= wins for a link;
// without either it is Day — and the first snow of a city day wears Snow, since
// that weather is already the Snow Day the bible describes.
export function skinFor({ skin = null, mutator = null, weather = null } = {}) {
  if (skin && SKINS[skin]) return SKINS[skin];
  if (mutator === 'night') return NIGHT_SKIN;
  if (mutator === 'snow' || weather?.id === 'snow') return SNOW;
  return DAY;
}

// A line's ink on a skin. GTFS route_color still wins wherever the source has
// one (it is null on all 34 lines today), exactly as board.js's lineColour.
export function inkFor(skin, layer, hex = null) {
  if (typeof hex === 'string' && /^#?[0-9a-f]{6}$/i.test(hex)) return hex.startsWith('#') ? hex : `#${hex}`;
  if (String(layer?.mode || '').toUpperCase() === 'SUBWAY' || layer?.mode === 'metro') return skin.metro;
  return skin.tram[lineFamily(layer?.name)] || '#6a7a80';
}

// Recolour every layer for the skin, once, after the pack loads. Every chip,
// pill and line reads layer.colour, so the whole board follows.
export function applySkin(transit, skin) {
  for (const layer of transit?.layers || []) layer.colour = inkFor(skin, layer, transit?.pack?.lines?.find(l => l.id === layer.id)?.hex);
  return skin;
}
