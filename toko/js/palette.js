// TOKO MIDORI — the single colour source for the brand.
//
// 常緑 (tokomidori) is an old Japanese word for evergreen: the green that
// does not drop. So the identity is built on one green, held against a
// near-black void, with a hanko red for the signature and the two phosphors
// the games already speak in (the arcade's cyan, the Game of Life's leaf).
//
// Nothing else. If a mark needs a sixth colour, the mark is wrong.

export const TOKO = {
  // ── the void ──────────────────────────────────────────────────────────
  // near-black, not black: #06070a is the arcade hub's background, so a
  // Toko mark dropped on the hub sits on its own colour and disappears
  // into the page instead of floating in a box.
  VOID:   '#05070a',
  PITCH:  '#000000',     // true black — only inside a mark's own eye slits
  PANEL:  '#0c1113',     // one step up, for cards on the brand board
  LINE:   '#1d2725',     // hairline rules

  // ── the green ─────────────────────────────────────────────────────────
  MIDORI:      '#4ce08a',   // THE colour. 11.4:1 on VOID — safe as text.
  MIDORI_DEEP: '#146b46',   // shell, seams, the shadow side of the mask
  MOSS:        '#0d241a',   // the fill behind a mark; almost void
  LUX:         '#a6e85a',   // the luminescent leaf (== gameoflife PAL.LEAF_LUX)

  // ── borrowed phosphors: the machine's colours, never Toko's ───────────
  PHOSPHOR: '#35e8d8',      // the arcade terminal (== hub --accent, gol CYAN_LUX)
  GOLD:     '#ffd75a',      // (== gameoflife GOLD_LUX) reward, not identity

  // ── the stamp ─────────────────────────────────────────────────────────
  // A hanko is always red. Toko's is chipped.
  VERMILION: '#e5372c',
  VERM_DEEP: '#7d1a14',

  // ── ink & paper ───────────────────────────────────────────────────────
  BONE: '#ece5d5',          // 15.3:1 on VOID — body copy
  ASH:  '#96a29a',          //  7.7:1 on VOID — dim copy, still AA at 14px
  INK:  '#07090b',          // type knocked out of a light mark
};

// Toko's registers. A mark is drawn in exactly one of these.
//
//   LIVE   — the default: green on void. Screens, marquees, in-game.
//   STAMP  — the signature: hanko red. Corners, credits, the seal.
//   GHOST  — pressed flat: one colour, no depth. Favicons, 16px, print.
//   RIOT   — the glitch register: green torn by red. Never resting state,
//            only the frame a hit lands on.
export const REGISTER = {
  LIVE:  { shell: TOKO.MIDORI_DEEP, face: TOKO.MIDORI, lux: TOKO.LUX,   eye: TOKO.PITCH, mark: TOKO.VERMILION, bg: TOKO.VOID },
  STAMP: { shell: TOKO.VERM_DEEP,   face: TOKO.VERMILION, lux: TOKO.VERMILION, eye: TOKO.VOID, mark: TOKO.BONE, bg: 'transparent' },
  GHOST: { shell: TOKO.BONE,        face: TOKO.BONE,   lux: TOKO.BONE,  eye: TOKO.VOID,  mark: TOKO.BONE,     bg: 'transparent' },
  RIOT:  { shell: TOKO.VERMILION,   face: TOKO.MIDORI, lux: TOKO.PHOSPHOR, eye: TOKO.PITCH, mark: TOKO.BONE, bg: TOKO.VOID },
};

// The words. Kept here, next to the colours, because they are as fixed as
// the colours are — a lockup that reworded itself would not be a brand.
export const VOICE = {
  name:     'TOKO MIDORI',
  kanji:    '常緑',
  reading:  'tokomidori',
  gloss:    'evergreen — the green that does not drop',
  cry:      'GO MAKE YOUR OWN',                       // the primary tagline
  terms:    'NO PUBLISHER · NO LAUNCHER · NO ACCOUNT', // the secondary
  terse:    'NO ACCOUNT · NO LAUNCHER',                 // …where it has to fit
  hand:     'PAINTED IN CODE · NO IMAGE ASSETS',       // the workshop note
};

// Paint the palette onto an element as CSS custom properties, so plain HTML
// and the canvas marks are guaranteed to be quoting the same hex.
export function cssVars(el = document.documentElement, pal = TOKO) {
  for (const [k, v] of Object.entries(pal)) {
    el.style.setProperty('--toko-' + k.toLowerCase().replace(/_/g, '-'), v);
  }
}
