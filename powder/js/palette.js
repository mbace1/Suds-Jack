// Powder — the surreal palette.
//
// Not naturalistic and not trying to be. The reference plates gave the
// vehicles: cream hulls, one weathered accent panel, chrome nacelles, black
// intakes. The WORLD around them is pushed somewhere else — a violet zenith
// over an amber horizon, oxide canyon walls, salt pans that read almost white,
// and shadows that go blue-violet rather than grey. Two light sources, one
// enormous ringed body low on the horizon, and rock that floats.
//
// Retint the whole game from this file.
export const PAL = {
  // ---- sky ---------------------------------------------------------------
  zenith:   0x2a2352,   // deep violet overhead
  skyHigh:  0x6b5a8c,
  skyMid:   0xc08a6b,
  horizon:  0xf0c489,   // amber band the sun sits in
  fog:      0xe0b78c,   // MUST agree with `horizon` or the ground draws a seam

  sun:      0xfff6e2,
  sunGlow:  0xffd9a0,
  planet:   0xb9846b,   // the ringed body low in the north
  planetRim:0xe8c9a8,
  moon:     0xd8d4e8,

  // ---- ground ------------------------------------------------------------
  salt:     0xeee6d2,   // canyon floor — pale, smooth, fast
  saltDark: 0xcfc4ad,
  dune:     0xd9b483,   // the flats
  duneDark: 0xa8825a,
  gravel:   0x9c8468,
  rock:     0x8a4f3c,   // oxide canyon wall
  rockDark: 0x4e2a26,
  rockLit:  0xc4795a,
  scrub:    0x4c5a48,

  // shadow tint — violet, not grey. This is most of the surreal read.
  shade:    0x4a3f6b,

  // ---- set dressing ------------------------------------------------------
  monolith: 0x5a5074,
  monoLit:  0x8a7fae,
  arch:     0x7a4438,
  floater:  0x7a637f,   // the rocks that hang
  glow:     0x8fe8d8,   // the one cold colour in the world, used sparingly

  // ---- craft -------------------------------------------------------------
  hull:     0xe8dfc6,
  chrome:   0xb9bec7,
  chromeHi: 0xe2e6ea,
  intake:   0x14141a,
  glass:    0x2b3340,
  accents:  [0x6b3550, 0x25493f, 0x4a3a6b, 0x63303a, 0x5c5a35, 0x4d5665],
  flame:    0xffcf8a,

  // ---- plume / ui --------------------------------------------------------
  dust:     0xe6cfa8,
  dustShd:  0xa88a6b,
  ink:      0x1d1726,
  paper:    0xf0e6d2,
  hot:      0xff8a5c,
  cold:     0x8fe8d8,
};

// Direction the KEY light travels (from the sun toward the world). Low and
// raking, so the monoliths throw shadows the length of the flats.
export const SUN_DIR = [-0.30, -0.24, 0.92];
// A second, cold fill from the opposite side — the surreal tell. Nothing in a
// desert is lit blue from behind, which is exactly why it works here.
export const FILL_DIR = [0.62, -0.42, -0.66];
