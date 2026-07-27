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
  void:       0x03060c,   // the sky, and the bottom of everything
  horizon:    0x081826,

  // Park surface, three tones by face normal. Almost black on purpose — in the
  // reference the ground is a silhouette and the LINES do all the describing.
  groundUp:   0x203a4e,
  groundMid:  0x162838,
  groundLow:  0x0b1622,

  ink:        0x03060c,
};

// HDR glow values. Over 1.0 on any channel = picked up by bloom.
// Kept only just over 1.0. Pushed higher, the bloom spill lifts the whole
// frame and the near-black world — the entire point of the look — turns grey.
export const GLOW = {
  line:    [0.55, 1.45, 1.75],  // ground markings, cold cyan-white
  coping:  [1.05, 1.5, 1.75],  // rail metal, cool
  lampWarm:[1.35, 1.15, 0.8],
  lampCool:[0.5, 1.3, 1.85],
  accent:  [1.7, 0.35, 0.45],  // the one red thing in frame
};

// Per-district washes (design doc §7 — a phase change re-tints one park).
// `wash` tints the whole scene, `sky` the dome, `dots` the pinpoint lights.
export const ZONES = {
  arena: { wash: [0.55, 0.85, 1.0], sky: 0x04101c, dots: 'lampCool', line: 'line' },
  hell:  { wash: [1.0, 0.42, 0.36], sky: 0x140508, dots: 'accent',   line: 'coping' },
  rust:  { wash: [1.0, 0.72, 0.52], sky: 0x0e0a08, dots: 'lampWarm', line: 'coping' },
};

export const UI = {
  ink:   '#efe7d2',
  gold:  '#9fd8e8',
  dim:   'rgba(239,231,210,0.5)',
  clean: '#8fe6d8',
  fakie: '#c3a7ff',
  bail:  '#ff6a5a',
};
