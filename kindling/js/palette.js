// Kindling — the room's colours.
//
// One idea runs the whole scheme: WARM is what you made, COLD is what is
// waiting outside it. The fire, the creature and every object you have brought
// home are lit in ember and gold; the dark corners, the window and the night
// beyond it are blue-black. Nothing in the room is cold, and nothing outside it
// is warm, so the picture states the loop before any text does.
//
// The ramps are here rather than in the drawing code because the light in this
// game is a MEASURE — how far the ember ramp reaches across the floor is how
// much you did today — so the steps have to be shared by the fire, the floor,
// the wall and the creature or the reading breaks at the seams.

export const PAL = {
  // beyond the light: not a colour so much as an absence, kept a touch off
  // black so a shape can still sit against it without vanishing
  VOID:      '#05060b',
  NIGHT:     '#0c1322',
  NIGHT_LOW: '#16233a',
  STAR:      '#cfe4ea',
  MOON:      '#e8eef2',

  // the room, unlit → lit. The same five steps carry wall, floor and hearth,
  // which is what lets rampDither fade one into the next without banding.
  ROOM:      ['#100b08', '#1d130c', '#33200f', '#4c3116', '#68431d'],
  FLOOR:     ['#0d0906', '#19110a', '#2c1c0d', '#412813', '#5b3819'],

  // the fire itself
  COAL:      '#7a2f16',
  COAL_HOT:  '#b2481c',
  EMBER:     '#f0a24a',
  FLAME:     '#ffc768',
  FLAME_CORE:'#fff2cf',
  SPARK:     '#ffe6a8',
  SMOKE:     '#2b2530',

  // the creature. Moss over warm fur, a pale front, and a rim of ember on the
  // fire side — a small dark shape against a dark room is a hole in the
  // picture, so it is lit from the left and edged on the right.
  FUR:       '#6f7f4a',
  FUR_DARK:  '#3f4a2a',
  FUR_LIT:   '#9cae63',
  BELLY:     '#d8cfa8',
  EYE:       '#141018',
  EYE_LIGHT: '#f2f6ea',
  NOSE:      '#c96f4a',

  // things brought home, and the shelf they sit on
  WOOD:      '#4a3218',
  WOOD_LIT:  '#75491f',
  STONE:     '#8d8878',
  BONE:      '#d5cdb4',
  MOSS:      '#8faf6a',
  RUST:      '#a05a34',
  GLASS:     '#7fc7d8',
  THREAD:    '#7f8fd8',

  // ── THE RUIN (owner direction, 2026-08-16) ────────────────────────
  // The hut is retired. The world is now a moonlit dark-fantasy ruin, and the
  // scheme's one idea gets sharper rather than changing: the environment is
  // COLD and the fire is the only warm thing in it. So everything is drawn from
  // a cold ramp first and warmed by distance from the flame — that subtraction
  // is what makes forty pixels of firelight feel like shelter instead of decor.
  COLD:      ['#080d13', '#101823', '#1a2634', '#26364a', '#354a63'],
  STONE_COLD:'#5a6a7e',
  TREE_FAR:  '#121b28',
  TREE_NEAR: '#080d14',
  MOSS_DARK: '#2f4029',
  // one accent in the world that is neither fire nor moon: a banner that has
  // been hanging too long. Dark enough to stay out of the fire's job.
  BANNER:    '#6e2c3a',
  BANNER_DIM:'#3f1c26',

  // ── THE APPROVED SHEETS (art pass, 2026-08-17) ────────────────────
  // Read off the reference in `art-src/approved/` — see SHEETS.md for what each
  // sheet shows. Everything below is measured from the art rather than invented,
  // which is the whole difference between this block and the one above it.
  //
  // The night is genuinely BLUE. The first cut of the ruin was painted so close
  // to black that the picture had no cold half to warm anything against — the
  // reference sky is a deep navy you can name, and the value contrast between it
  // and the stone is where the depth comes from.
  SKY_HIGH:  '#101a30',
  SKY_LOW:   '#243357',
  SKY_WARM:  '#5e3f3a',    // the ember band low behind the castle
  CLOUD:     '#2a3a5c',

  // stone, from deep shadow to a block catching the moon. Five steps, because a
  // wall reads by blocks being different VALUES of the same colour — a mortar
  // line drawn as a stroke is the trap SHEETS.md §5 records.
  BLOCK:     ['#1a222e', '#26303e', '#333f50', '#455263', '#586777'],
  MOSS_TOP:  '#3f5936',    // every top edge in the reference carries moss
  MOSS_LIT:  '#587f42',

  BARK:      '#33251b',
  BARK_LIT:  '#5a3f26',
  LEAF_DARK: '#16241a',
  LEAF:      '#2b4025',

  EARTH:     '#332a20',
  EARTH_LIT: '#6b5330',
  GRASS:     '#26361f',
  GRASS_LIT: '#425c2c',

  CASTLE:    '#232f4a',
  CASTLE_LIT:'#33415f',

  BANNER_GOLD:'#c08b3e',
  IRON:      '#2b2d33',
  IRON_LIT:  '#6f7a88',
  BLADE:     '#9aa6b4',
  SHIELD:    '#2c3f66',
  POTION:    '#4aa6c8',
  CAP:       '#a83c34',    // mushroom caps, and the rug
  BLOOM:     '#7d6bb0',

  // ── EMBER, the companion (ember_character_art_bible_sheet) ────────
  // Porous dark stone, not fur. The body is nearly the colour of the night, so
  // it is the HORNS and the SCARF that carry the silhouette — which is exactly
  // what the sheet's call-outs say they are for.
  EM_BODY:   ['#171d2b', '#232b3d', '#2f3950', '#3f4b66'],
  EM_LIT:    '#4d5c7c',
  EM_HORN:   '#c7b189',
  EM_HORN_LIT:'#e5d5b1',
  EM_SCARF:  '#7e2a2a',
  EM_SCARF_LIT:'#a8402f',
  EM_SCARF_DK:'#4a1a1c',
  EM_EYE:    '#e8eef4',
  EM_PUPIL:  '#12141c',
  EM_TOOTH:  '#f2ecda',

  // ink and paper: the 1px outline that keeps a pixel shape defined, and the
  // colour text is set in
  INK:       '#080506',
  PAPER:     '#efe3c9',
  PAPER_DIM: '#b9ab8c',
};

// Blend two #rrggbb hexes. Firelight is a colour walking toward another colour,
// not a palette entry, so most of the warm tinting in room.js comes from here.
export function mix(c1, c2, t) {
  const k = Math.max(0, Math.min(1, t));
  const ch = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const v = i => Math.round(ch(c1, i) + (ch(c2, i) - ch(c1, i)) * k).toString(16).padStart(2, '0');
  return `#${v(0)}${v(1)}${v(2)}`;
}

// Darken (f<1) or lighten (f>1) a hex — the 1px seams and outlines.
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const cl = v => Math.max(0, Math.min(255, Math.round(v)));
  const r = cl(((n >> 16) & 255) * f), g = cl(((n >> 8) & 255) * f), b = cl((n & 255) * f);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
