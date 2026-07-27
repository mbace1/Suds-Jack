// ── Palette ────────────────────────────────────────────────────────────────
// Tiny Hawk art direction: flat-shaded low-poly read as vector poster art.
// No lights anywhere — "shading" is three explicit tones per surface (lit top /
// mid lip / dark body), so every colour decision lives here and the whole game
// re-tints in one edit. Endless is a dusk session; Run mode districts will add
// their own entries to ZONES below.
export const COL = {
  // Sky (a two-stop gradient plane behind everything)
  skyTop:    0x1b1f4b,   // deep dusk blue overhead
  skyMid:    0x8e3f77,   // magenta band
  skyBot:    0xff9a4e,   // low sun glow
  sun:       0xffd98a,

  // Parallax silhouettes, far → near. These have to separate in *value*, not
  // just hue — three dark purples a few points apart read as one flat mass.
  farHills:  0x6b5590,
  midHills:  0x453465,
  nearHills: 0x261c3f,

  // The rideable ground: three tones make the volume read without lights
  groundTop: 0x6fe0b0,   // lit surface you actually skate
  groundLip: 0x2f9e77,   // 1-unit band under the lip — the "defined section"
  groundBody:0x14343a,   // the mass below, nearly silhouette

  // Skater
  skin:      0xffcf9e,
  shirt:     0xff5a5f,
  pants:     0x2b3a67,
  helmet:    0xffe14a,
  board:     0xf2f0e6,
  wheels:    0x22202a,
  ink:       0x0b0a14,   // inverted-hull outline

  // Feedback
  perfect:   0x8dfff0,   // clean tangential landing
  fever:     0xffd166,   // multiplier colour
  bail:      0xff4d4d,
  dust:      0xffffff,

  // HUD
  hudInk:    0xf4f1e8,
};

// Zone tints for Run mode districts (design doc §7 — phase change re-tints the
// same geometry). Endless uses the base scheme above.
export const ZONES = {
  dusk:     { groundTop: 0x6fe0b0, groundLip: 0x2f9e77, groundBody: 0x14343a },
  plaza:    { groundTop: 0xf2e6c9, groundLip: 0xc2a878, groundBody: 0x4a3b2c },
  docks:    { groundTop: 0x8fd4ff, groundLip: 0x3f86bb, groundBody: 0x16304a },
  downtown: { groundTop: 0xd7c6ff, groundLip: 0x7f68c4, groundBody: 0x241b3d },
};
