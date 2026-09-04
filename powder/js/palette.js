// Powder — the palette. Second pass on the owner's direction: more whites and
// greys in the sand, more purple in the sky. The ground now reads as white
// sand or powder snow — deliberately either — under a violet sky that goes
// lilac at the horizon, with the sun the one warm thing in it. The craft keep
// the reference plates' cream-and-accent livery; they are the only warm
// objects on the ground, which is why they read.
export const PAL = {
  // ---- sky ---------------------------------------------------------------
  zenith:   0x1c1440,   // deep violet overhead
  skyHigh:  0x4a2f7a,
  skyMid:   0x8b5fa8,
  horizon:  0xd9a4cc,   // lilac band the sun sits in
  fog:      0xd9a4cc,   // MUST agree with `horizon` or the ground draws a seam

  sun:      0xfff3dc,
  sunGlow:  0xffc9a8,
  planet:   0xa07898,
  planetRim:0xe6c8e0,
  moon:     0xe2dcf0,

  // ---- ground ------------------------------------------------------------
  salt:     0xf6f4f0,   // canyon floor — near white, smooth, fast
  saltDark: 0xd8d4d2,
  dune:     0xe6e2de,   // the deep sand: white with a grey grain
  duneDark: 0xb6b0b8,   // its shadow side, grey with the sky in it
  gravel:   0x9f9aa4,
  road:     0x5e5868,   // the crossings — dark, hard, fast
  roadEdge: 0x8a8494,
  rock:     0x8a5c56,   // oxide canyon wall, greyed
  rockDark: 0x4a3340,
  rockLit:  0xc08c80,
  scrub:    0x5a6258,

  // shadow tint — violet, not grey. This is most of the surreal read.
  shade:    0x5a4a8e,

  // ---- set dressing ------------------------------------------------------
  monolith: 0x5c5478,
  monoLit:  0x9088b4,
  arch:     0x7c5062,
  floater:  0x80708c,
  bridge:   0x6a6272,
  bridgeLit:0x9c94a8,
  glow:     0x8fe8d8,   // the one cold colour in the world, used sparingly

  // ---- craft -------------------------------------------------------------
  hull:     0xe8dfc6,
  chrome:   0xc4c8d2,
  chromeHi: 0xe8ecf2,
  intake:   0x14141a,
  glass:    0x2b3340,
  accents:  [0x6b3550, 0x25493f, 0x4a3a6b, 0x63303a, 0x5c5a35, 0x4d5665],
  flame:    0xffcf8a,

  // ---- plume / ui --------------------------------------------------------
  dust:     0xf2eee8,
  dustShd:  0xb8b0be,
  ink:      0x1d1726,
  paper:    0xf0e6d2,
  hot:      0xff8a5c,
  cold:     0x8fe8d8,
};

// Direction the KEY light travels (from the sun toward the world). Low and
// raking, so the monoliths throw shadows the length of the flats.
export const SUN_DIR = [-0.30, -0.24, 0.92];
// A second, cold fill from the opposite side — the surreal tell.
export const FILL_DIR = [0.62, -0.42, -0.66];
