// The Game of Life — central colour scheme (earth, paper, moss, water).
// Everything on-screen tints from here so the whole project re-skins in one edit.

export const PAL = {
  // page / chrome
  BG:        '#141311',
  PAPER:     '#efe6d0',
  PAPER_DIM: '#d8cdb2',
  INK:       '#2b2620',
  INK_SOFT:  '#5c5343',

  // nature accents
  MOSS:      '#5f7a4a',
  FOREST_FAR:'#2a3423',
  MOSS_DEEP: '#3d5232',
  LEAF:      '#8faf6a',
  BARK:      '#6b4f3a',
  EARTH:     '#8a6d4f',

  // water
  WATER:     '#5aa7c7',
  WATER_DEEP:'#38708f',
  FOAM:      '#cfe8f2',

  // stone (aqueduct)
  STONE:     '#b0a189',
  STONE_DARK:'#877a63',
  STONE_LINE:'#6e6350',
  GROOVE:    '#4e4638',

  // skies
  SKY_DAWN_TOP: '#3a4a6b',
  SKY_DAWN_LOW: '#d99a6c',
  SKY_DAY_TOP:  '#7fb2d9',
  SKY_DAY_LOW:  '#cfe3ea',
  SKY_DUSK_TOP: '#2b2440',
  SKY_DUSK_LOW: '#b56b7a',
  SUN:          '#f2d98c',

  // ui
  GOLD:      '#c9a84c',
  DANGER:    '#a05040',

  // contrast accent + outline ink — the muted palette needed one warm pop and
  // a near-black edge colour so shapes read as defined pixel sections
  EMBER:     '#e8703a',
  EDGE:      '#1a1712',

  // the new visual standard (2026-07 master doc): vignettes float in a pure
  // black void; interactive elements glow in luminescent cyan / gold and
  // break the frame
  VOID:      '#000000',
  // the phosphor. This one entry is NOT constant: the screen's accent (see
  // ACCENTS below) writes to it, so every interactive glow drawn from
  // PAL.CYAN_LUX follows the colour the terminal is set to. Read it at draw
  // time — a module-level `const C = PAL.CYAN_LUX` freezes at import and stops
  // following.
  CYAN_LUX:  '#35e8d8',
  GOLD_LUX:  '#ffd75a',
  // a living luminescent green — fireflies, glow-moss, the breakout accent for
  // nature scenes where cyan/gold would read as artificial light
  LEAF_LUX:  '#a6e85a',
};

// ── the screen's accent ────────────────────────────────────────────
// The terminal is monochrome-ish by design: one phosphor colour carries every
// interactive element, on the screen and in the chrome around it. Three to
// choose from, because a phosphor colour is a taste and cyan is only the
// default one. `hex` tints the UI and PAL.CYAN_LUX; `rgb` (0..1) tints the
// CRT's phosphor bleed; `dim` is the readable, non-glowing version for text.
export const ACCENTS = {
  cyan:  { hex: '#35e8d8', dim: '#7fd8d0', rgb: [0.21, 0.91, 0.85] },
  green: { hex: '#5ce87a', dim: '#8fd89a', rgb: [0.36, 0.91, 0.48] },
  white: { hex: '#cfe4ea', dim: '#b6c8ce', rgb: [0.81, 0.89, 0.92] },
};

let current = 'cyan';

export function accentName() { return current; }
export function accentHex() { return ACCENTS[current].hex; }
export function accentDim() { return ACCENTS[current].dim; }
export function accentRgb() { return ACCENTS[current].rgb; }

export function setAccent(name) {
  if (!ACCENTS[name]) return;
  current = name;
  PAL.CYAN_LUX = ACCENTS[name].hex;          // the in-scene glow follows too
  document.documentElement.style.setProperty('--accent', ACCENTS[name].hex);
  document.documentElement.style.setProperty('--accent-dim', ACCENTS[name].dim);
}
