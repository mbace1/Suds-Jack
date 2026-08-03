// Powder — colour scheme, straight off the Moebius/Otomo hover-racer reference
// plates: bone-white hulls with one weathered accent panel, chrome nacelles,
// a blown-out sun in a hazy sky, muted desaturated ground. The desert of the
// references reads as a snowfield with almost no retint — cream where the sun
// hits, cold lilac-grey in shadow. NOTHING here is neon; that was the other
// demos. Retint the whole game from this file.
export const PAL = {
  // ---- sky / atmosphere -------------------------------------------------
  skyTop:  0x8d9aad,   // hazy grey-blue overhead
  skyMid:  0xc6c5bb,
  // skyLow and fog are the SAME value on purpose: the ground fades to fog at
  // the draw distance and the sky starts from skyLow, so any gap between them
  // paints a hard tan seam straight across the horizon.
  skyLow:  0xe6ddc6,
  sun:     0xfffdf4,   // blown out, no colour left in it
  sunHalo: 0xf6e6b4,
  fog:     0xe6ddc6,

  // ---- snow -------------------------------------------------------------
  // Straight off the plates: sun-blasted bone, warm in the light, lilac-grey
  // where it folds away. Deliberately ambiguous between deep powder and deep
  // sand — the surface reads as either, and the carve plays the same.
  deepLit:  0xf3ecd9,  // untracked deep stuff taking the sun
  deepMid:  0xdccfae,  // the packed line everyone runs — a clear tone down, or
                       // the run and the powder read as the same dead wash
  deepShd:  0xa2957c,  // shadow side of a roller
  deepDark: 0x8a7f68,  // carve trench / hover scar
  crust:    0xd6cdb6,  // wind-scoured crust — fast and slippery
  crustLit: 0xe9e2ce,

  // ---- ground furniture -------------------------------------------------
  rock:     0x4a4753,  // charcoal with a plum cast, as in the plates
  rockLit:  0x6b6675,
  scrub:    0x5a5e44,  // olive tufts poking through
  poleA:    0xc9c2ad,
  flagA:    0x6b3550,  // plum course markers
  flagB:    0xb5462f,  // faded orange
  gateBody: 0xd8cfb6,
  gateTrim: 0x6b3550,

  // ---- craft ------------------------------------------------------------
  hull:     0xe8dfc6,  // cream bodywork, the constant across every plate
  chrome:   0xb9bec7,
  chromeHi: 0xdfe3e8,
  intake:   0x14141a,  // black nacelle mouths
  glass:    0x2b3340,
  grime:    0x8d7a5c,
  // one accent panel per racer — plum, forest, purple, maroon, olive, steel
  accents: [0x6b3550, 0x25493f, 0x4a3a6b, 0x63303a, 0x5c5a35, 0x4d5665],

  // ---- plume / ui -------------------------------------------------------
  plume:    0xf6f0e0,
  plumeShd: 0xcfc4ac,
  ink:      0x241f1c,   // HUD ink
  paper:    0xe8dfc6,   // HUD paper
  hot:      0xb5462f,   // HUD warning / boost
};

// Fixed sun direction (points FROM the sun) — everything that fakes lighting
// by hand (blob shadows, plume shading) uses this so it agrees with the light.
// Low enough to sit in frame above the horizon and to rake the rollers with
// long shadows, high enough that flat snow still takes some direct light.
export const SUN_DIR = [-0.26, -0.33, 0.91];
