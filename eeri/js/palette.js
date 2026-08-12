// EERI — the single colour source (ART_BRIEF §3.3). Every cutout layer and
// every model colour is built from these values; no asset invents a colour.

export const PAL = {
  SKY:      '#4aa8e8',
  SKY_PALE: '#c2e2f4',
  CLOUD:    '#f4faff',

  // 3–4 tone ramps, dark → light. Bands, not gradients.
  EARTH: ['#6e4c32', '#8a6242', '#a87c52', '#c49a66'],
  STEEL: ['#4a5a6a', '#5f7080', '#7a8a9a', '#9aaab8'],

  GREEN:    '#3cc85a',   // the "grass lip" role — safe standable edges
  GREEN_DK: '#2a9a44',

  MACHINE:    '#ffb01f', // the cast's family colour (safety yellow-orange)
  MACHINE_DK: '#d88c12',

  HAZARD: '#e8402a',
  INK:    '#1a1410',
  DARK:   '#26221c',     // tyres, undercarriage, near-black trim

  // Eeri the kid
  SKIN:  '#f2c9a0',
  VEST:  '#ff7a1a',
  SHIRT: '#4a7ac8',
  PANTS: '#3a4a5c',
  BOOT:  '#26221c',
};

// One depth model (ART_BRIEF §3.2): gameplay at z = 0, layers at fixed
// per-world depths — constants, not per-asset improvisation.
export const LAYER_Z = {
  SKY: -48, SKYLINE: -30, FAR: -14, MID: -6, NEAR: -2, PLAY: 0, FORE: 2.2,
};

// How far each layer's painting is pushed toward the sky (painted air).
export const LAYER_TINT = {
  SKYLINE: 0.58, FAR: 0.38, MID: 0.20, NEAR: 0.07, FORE: 0,
};

// '#rrggbb' × '#rrggbb' → mixed '#rrggbb'. Used to bake depth tint into
// layer paintings and background-cast repaints.
export function mix(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const c = (sh) => {
    const x = (A >> sh) & 255, y = (B >> sh) & 255;
    return Math.round(x + (y - x) * t);
  };
  return '#' + ((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0');
}
