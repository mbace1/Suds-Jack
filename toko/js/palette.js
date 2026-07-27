// TOKO MIDORI GAMES — colour, name, and the fixed wording.
//
// TWO COLOURS. Black and magenta. That is the identity, off the owner's own
// guideline sheet:
//
//     RGB (0, 0, 0)        CMYK (0, 0, 0, 100)
//     RGB (240, 2, 127)    CMYK (0, 100, 0, 0)
//
// Both are process primaries — 100% K and 100% M — which is the whole idea:
// the brand prints anywhere, on any press, at no cost, with nothing to match.
// White is the paper, not a colour.
//
// There are no tints, shades, gradients, or drop shadows. If a mark needs a
// third colour it is not this brand — with exactly one documented exception,
// the sticker sheet (see STICKER below).

export const TOKO = {
  INK:     '#000000',   // RGB(0,0,0) · CMYK(0,0,0,100)
  MAGENTA: '#f0027f',   // RGB(240,2,127) · CMYK(0,100,0,0)
  PAPER:   '#ffffff',   // the paper. Not a brand colour — the absence of ink.

  // page furniture for screens, where "paper" is a lie and pure black eats
  // every edge. Never inside a mark.
  COAL:  '#0c0c0e',
  PANEL: '#151518',
  LINE:  '#2a2a30',
  SMOKE: '#9a9aa2',     // 7.4:1 on COAL — dim copy
};

// ── the carriers ─────────────────────────────────────────────────────────
// The face also runs in a rotating set of flats: the mark in a colour on
// white, and reversed out of a full-bleed colour tile. That is how the icons
// and the stickers work — one face, many carriers.
//
// This does NOT make them brand colours. Black and magenta are the identity;
// these are what the mark is CARRIED on, one flat at a time, never mixed and
// never inside a single mark. A carrier is a whole surface or it is nothing.
export const STICKER = {
  GREEN: '#12783a', RED: '#e0141b', SKY: '#4cb7e2', ORANGE: '#f07d12',
  BLUE: '#1149a6', YELLOW: '#f5c400', PURPLE: '#7c1d96', LIME: '#8dc21f',
  PINK: '#ec1a7c',
};

// the sheet: every carrier, both ways round
export const SHEET = [
  { bg: TOKO.PAPER, ink: TOKO.INK },
  { bg: TOKO.INK,   ink: TOKO.PAPER },
  ...Object.values(STICKER).flatMap(c => [
    { bg: TOKO.PAPER, ink: c },
    { bg: c,          ink: TOKO.PAPER },
  ]),
];

// ── the two ways round ───────────────────────────────────────────────────
// A mark is drawn in one of these. That is the entire system.
export const WAYS = {
  INK:     { ink: TOKO.INK,     ground: TOKO.PAPER },   // black on paper
  REVERSE: { ink: TOKO.PAPER,   ground: TOKO.INK },     // paper on black
  HOT:     { ink: TOKO.MAGENTA, ground: TOKO.INK },     // magenta on black
  SIGN:    { ink: TOKO.PAPER,   ground: TOKO.MAGENTA }, // paper on magenta
};

// ── the type ─────────────────────────────────────────────────────────────
// The logotype is set in a CONDENSED SQUARISH GROTESQUE: flat-sided bowls,
// square counters, tight tracking, a clipped corner on the G and splayed M.
//
// The real face is the owner's licensed font and is NOT redistributed here.
// Register it under the family name `Toko Grotesk` — a @font-face rule, a
// local() lookup, anything — and every lockup in this kit picks it up with no
// other change. Until then the stack falls through to the closest thing the
// machine already has, and the lockups are marked as substituted.
export const TYPE = {
  family: `'Toko Grotesk', 'Chakra Petch', 'Rajdhani', 'Saira Condensed', 'Oswald', 'Arial Narrow', 'Helvetica Neue', sans-serif`,
  weight: 700,
  stretch: 'condensed',
  tracking: -0.005,          // the logotype is set tight, never loose
  lineHeight: 0.92,          // the 3-line lockup stacks almost solid
  // has the real face actually been installed?
  loaded() {
    try { return document.fonts.check(`700 32px 'Toko Grotesk'`); }
    catch { return false; }
  },
};

// ── the words ────────────────────────────────────────────────────────────
export const VOICE = {
  company:  'Toko Midori Games',
  lines:    ['Toko', 'Midori', 'Games'],    // the 3-line lockup
  tm:       '™',
  artist:   '美鳥十湖',                      // Toko Midori
  artistRomaji: 'Toko Midori',
  role:     'The Game Creator',
  cry:      'GO MAKE YOUR OWN',
  terms:    'NO PUBLISHER · NO LAUNCHER · NO ACCOUNT',
  terse:    'NO ACCOUNT · NO LAUNCHER',
};

// Publish the palette as CSS custom properties so plain HTML quotes the same
// hex the canvas does.
export function cssVars(el = document.documentElement) {
  for (const [k, v] of Object.entries(TOKO)) {
    el.style.setProperty('--toko-' + k.toLowerCase(), v);
  }
  el.style.setProperty('--toko-type', TYPE.family);
}
