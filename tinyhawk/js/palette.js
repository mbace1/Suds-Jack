// ── Palette ────────────────────────────────────────────────────────────────
// Flat-shaded low-poly read as vector poster art. No lights anywhere — volume
// comes from three explicit tones per surface, picked by face normal, so every
// colour decision lives here and the whole game re-tints in one edit.
export const COL = {
  sky:       0x8fb8d8,   // pale afternoon
  skyLow:    0xe8dcc4,   // haze at the horizon
  fogBand:   0xbcc9d4,

  // Park surface, three tones by normal (up / sloped / near-vertical)
  groundUp:  0x9aa3ad,   // flat concrete, catching the light
  groundMid: 0x7c848f,   // transitions and banks
  groundLow: 0x5c636d,   // walls, the underside of things
  groundEdge:0x474d56,   // the 1-unit seam that defines a section

  // Painted zones — coping, flat bank faces, the odd bit of colour in a park
  coping:    0xf0e9d8,
  paintA:    0x4fbf9f,
  paintB:    0xe06a5a,
  paintC:    0xf0c14b,

  rail:      0xd8d2c4,
  ledge:     0xb9b2a2,

  // Skater
  skin:      0xffcf9e,
  shirt:     0xe0483f,
  pants:     0x39415c,
  helmet:    0xf5d13f,
  board:     0xf2f0e6,
  wheels:    0x2a2833,
  ink:       0x14161c,   // inverted-hull outline

  // Feedback
  clean:     0x6ff0d0,
  fakie:     0xb69cff,
  bail:      0xff5a4d,
  combo:     0xffd166,
  hudInk:    0xf4f1e8,
};

// Zone tints for Run mode districts (design doc §7 — the phase change re-tints
// the same geometry).
export const ZONES = {
  plaza:    { groundUp: 0x9aa3ad, groundMid: 0x7c848f, groundLow: 0x5c636d },
  docks:    { groundUp: 0x8fa8b8, groundMid: 0x6c828f, groundLow: 0x47555e },
  downtown: { groundUp: 0xa8a0b8, groundMid: 0x847c94, groundLow: 0x5a5468 },
  dusk:     { groundUp: 0x8d7f96, groundMid: 0x6b5f74, groundLow: 0x453d4c },
};
