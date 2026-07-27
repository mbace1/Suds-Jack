// ── Palette ────────────────────────────────────────────────────────────────
// Art direction: Skate Story. A near-black world washed in ONE dominant hue,
// everything reading as silhouette, and the only bright things are glowing
// line-work and the skater — who is a faceted prism, not a painted figure.
//
// This deliberately breaks the flat-unlit rule that paperboy and dropcabal
// follow. It follows hyperdagger instead: ACES tone mapping and an
// EffectComposer, with **selective bloom via HDR colours** — anything with a
// channel over 1.0 blows out and smears, everything else stays matte. That is
// why the glow colours below are float triples rather than hex.

export const COL = {
  void:       0x05060a,   // the sky, and the bottom of everything
  horizon:    0x0d1420,

  // Park surface, three tones by face normal. Almost black on purpose — in the
  // reference the ground is a silhouette and the LINES do all the describing.
  groundUp:   0x2b3247,
  groundMid:  0x1d2231,
  groundLow:  0x0f121b,

  ink:        0x05060a,
};

// HDR glow values. Over 1.0 on any channel = picked up by bloom.
// Kept only just over 1.0. Pushed higher, the bloom spill lifts the whole
// frame and the near-black world — the entire point of the look — turns grey.
export const GLOW = {
  line:    [0.9, 1.35, 1.6],   // ground markings, cool white
  coping:  [1.6, 1.25, 0.7],   // warm metal on a quarterpipe lip
  lampWarm:[1.7, 1.15, 0.55],
  lampCool:[0.7, 1.25, 1.7],
  accent:  [1.7, 0.35, 0.45],  // the one red thing in frame
};

// Per-district washes (design doc §7 — a phase change re-tints one park).
// `wash` tints the whole scene, `sky` the dome, `dots` the pinpoint lights.
export const ZONES = {
  arena: { wash: [0.62, 0.86, 1.0], sky: 0x080d16, dots: 'lampCool', line: 'line' },
  hell:  { wash: [1.0, 0.42, 0.36], sky: 0x140508, dots: 'accent',   line: 'coping' },
  rust:  { wash: [1.0, 0.72, 0.52], sky: 0x0e0a08, dots: 'lampWarm', line: 'coping' },
};

export const UI = {
  ink:   '#efe7d2',
  gold:  '#e8c98a',
  dim:   'rgba(239,231,210,0.5)',
  clean: '#8fe6d8',
  fakie: '#c3a7ff',
  bail:  '#ff6a5a',
};
