// ── Palette ────────────────────────────────────────────────────────────────
// Tiny Hawk art direction: flat-shaded low-poly read as vector poster art.
// No lights anywhere — "shading" is three explicit tones per surface (lit top /
// mid lip / dark body), so every colour decision lives here and the whole game
// re-tints in one edit. Endless is a dusk session; Run mode districts will add
// their own entries to ZONES below.
// Art direction matches tinyhawk: Skate Story. Near-black, one cold hue, and
// the only bright things are the glowing edge of the hill and the skater. The
// glow values are HDR (over 1.0) so bloom picks them out selectively — see
// `main.js`. Everything else stays matte and nearly silhouette.
export const COL = {
  // Sky: a cold gradient into black
  skyTop:    0x03060c,
  skyMid:    0x0a1b2c,
  skyBot:    0x16394e,
  sun:       0x9fd8e8,

  // Parallax silhouettes, far → near. They separate in VALUE, not hue.
  farHills:  0x123246,
  midHills:  0x0b2032,
  nearHills: 0x06121e,

  // The rideable ground
  groundTop: 0x1d4a5e,   // the surface you skate
  groundLip: 0x123344,
  groundBody:0x050e18,   // the mass below, silhouette

  // Skater
  skin:      0xffcf9e,
  shirt:     0xe0483f,
  pants:     0x39415c,
  helmet:    0xf5d13f,
  board:     0xf2f0e6,
  wheels:    0x2a2833,
  ink:       0x03060c,

  // Feedback
  perfect:   0x8fe6d8,
  fever:     0x9fd8e8,
  bail:      0xff6a5a,
  dust:      0xffffff,
  hudInk:    0xf4f1e8,
};

// HDR glow. Over 1.0 on any channel = picked up by bloom.
export const GLOW = {
  edge:    [0.55, 1.5, 1.85],   // the lit lip of the hill you ride
  perfect: [0.7, 2.0, 1.9],
  fever:   [1.0, 1.7, 2.0],
};

// Zone tints for Run mode districts (design doc §7 — phase change re-tints the
// same geometry). Endless uses the base scheme above.
export const ZONES = {
  dusk:     { groundTop: 0x6fe0b0, groundLip: 0x2f9e77, groundBody: 0x14343a },
  plaza:    { groundTop: 0xf2e6c9, groundLip: 0xc2a878, groundBody: 0x4a3b2c },
  docks:    { groundTop: 0x8fd4ff, groundLip: 0x3f86bb, groundBody: 0x16304a },
  downtown: { groundTop: 0xd7c6ff, groundLip: 0x7f68c4, groundBody: 0x241b3d },
};
