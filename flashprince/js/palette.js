// Sixteen colours, and the fade between them.
//
// Another World never held more than sixteen colours on screen at once, and it
// changed scene by *fading the palette* rather than by loading new art. That is
// the whole trick this file exists to reproduce: the slots below are fixed
// ROLES, every biome supplies its own sixteen values for them, and the world
// walks continuously from one set to the next as the player travels. The
// jungle does not stop and the desert start — the greens drain out of the
// floor slot over four screens while the sand comes up underneath, which is
// what "one biome blending into the next" actually means in a 16-colour game.
//
// Because the roles are fixed, nothing that draws needs to know which biome it
// is in. A frond and a colonnade both fill with MID; they just happen to be
// different colours by the time you get there.

export const C = {
  VOID: 0,        // black. the sky's floor, every hole, every silhouette
  SKY_HI: 1,      // top of the sky band
  SKY_LO: 2,      // horizon
  FAR: 3,         // furthest parallax mass
  MID: 4,         // middle distance
  NEAR: 5,        // the wall right behind the player
  EDGE: 6,        // the lit top surface of anything you stand on
  SOLID: 7,       // the mass under that surface
  DARK: 8,        // its shadow side, and the inside of things
  LUX: 9,         // the biome's own light — bioluminescence, glyphs, moon
  LUX2: 10,       // the hot core of it
  SKIN: 11,
  SUIT: 12,       // the hero, who does not change colour when the world does
  SUIT_HI: 13,
  HAIR: 14,
  ALERT: 15,      // red. blood, eyes, the moment a guard sees you
};

// The hero's four slots are held out of the fade on purpose: he is the one
// thing carried from the jungle to the palace, and a protagonist who re-tints
// with the wallpaper stops being a protagonist.
const HERO = ['#c89878', '#2f3d5e', '#c2cede', '#0d0d14'];

const biome = (name, cols) => ({ name, cols: [...cols.slice(0, 11), ...HERO, cols[15]] });

// Each entry is the sixteen values in slot order. Read them down the column and
// you can see the world change: SOLID goes swamp-green, then root-brown, then
// sandstone, then marble, then green again with the marble still under it.
export const BIOMES = [
  biome('jungle', [
    '#000000', '#181038', '#4a1c4e', '#101f3a', '#0c3040', '#0a2028',
    '#3a7f5e', '#16382c', '#050f0d', '#46e0c0', '#d6ff78', '', '', '', '', '#d83a3a',
  ]),
  biome('dig', [
    '#000000', '#1c1630', '#5c3446', '#1e2434', '#243026', '#1a201c',
    '#7d7048', '#31392a', '#070a08', '#4ad8c4', '#e2c878', '', '', '', '', '#d83a3a',
  ]),
  biome('tomb', [
    '#000000', '#20182c', '#6e4030', '#332638', '#4a3626', '#33241a',
    '#c89a58', '#7a5330', '#150d07', '#46f0ff', '#ffd062', '', '', '', '', '#e04034',
  ]),
  biome('reactor', [
    '#000000', '#101828', '#2a4a5e', '#16202e', '#1e3040', '#182430',
    '#8ad4e8', '#2c4450', '#080c12', '#5cf6ff', '#ffe27a', '', '', '', '', '#ff4438',
  ]),
  biome('palace', [
    '#000000', '#241f42', '#8a6a86', '#3c3450', '#4e4558', '#332d3e',
    '#e8dcc4', '#9c8a72', '#1c161c', '#8ad0ff', '#ffc266', '', '', '', '', '#e04034',
  ]),
  biome('overgrown', [
    '#000000', '#1a1a34', '#5c4a66', '#2a3040', '#33402e', '#20261e',
    '#b4c894', '#5e6e54', '#0c100c', '#5ce8c4', '#e2ff8a', '', '', '', '', '#d83a3a',
  ]),
];

const lerpHex = (a, b, t) => {
  const ch = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const v = i => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0');
  return `#${v(0)}${v(1)}${v(2)}`;
};

// t walks 0 → BIOMES.length-1 across the whole game. A room sits at some
// fractional point on that line and gets sixteen interpolated colours: the fade
// is the journey, not a transition effect played at a door.
export function paletteAt(t) {
  const n = BIOMES.length - 1;
  const c = Math.max(0, Math.min(n, t));
  const i = Math.min(n - 1, Math.floor(c));
  const k = c - i;
  const a = BIOMES[i].cols, b = BIOMES[i + 1].cols;
  return a.map((hex, s) => lerpHex(hex, b[s], k));
}

export const biomeName = t => BIOMES[Math.max(0, Math.min(BIOMES.length - 1, Math.round(t)))].name;
