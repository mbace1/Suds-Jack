// Radio Free Helsinki — one colour scheme for the whole broadcast.
// The look is half a Metal Gear codec screen: phosphor green on near-black,
// with Toko's teal gel in the portrait frame and amber reserved for ONE job —
// the decode layer. Amber never appears until the listener asks what the
// bulletin actually said, so the eye learns that amber = the spin showing.

export const PAL = {
  // the screen itself
  VOID:      '#04070a',   // behind everything
  SHELL:     '#081218',   // codec housing
  PANEL:     '#0a1a1e',   // inside a frame
  PANEL_LO:  '#061114',

  // phosphor
  GREEN:     '#7dffb2',
  GREEN_DIM: '#3f9a6e',
  GREEN_LO:  '#1c4a38',
  GREEN_HOT: '#c9ffe0',

  // Toko's gel (mirrors toko-drop's player: teal body, dark eyes, white specular)
  GEL:       '#00ccaa',
  GEL_DEEP:  '#00806b',
  GEL_RIM:   '#7ff0dd',
  GEL_EYE:   '#08110f',
  SPECULAR:  '#ffffff',

  // the decode layer — the only warm colour on the dial
  AMBER:     '#ffb43a',
  AMBER_DIM: '#a8701c',
  AMBER_HOT: '#ffe2a8',

  // sector accents (frequency strip + card tags)
  GAMING:    '#54d6ff',
  INDUSTRY:  '#8fe36a',
  DEFENCE:   '#ff6b6b',

  // signal furniture
  STATIC:    '#2a4a44',
  INK:       '#04070a',
};

export const SECTOR_COLOR = {
  // ONE STATION. The three bands were a conceit for a twenty-post feed and
  // read as clutter on five — the dial is a readout now, not a control.
  // The old ids are kept so a wire written before this still validates.
  RFH: PAL.GREEN,
  GAMING: PAL.GAMING,
  INDUSTRY: PAL.INDUSTRY,
  DEFENCE: PAL.DEFENCE,
};
