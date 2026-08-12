// SUDS JACK — the colours.
//
// Soap on a black tube. The whole scheme is one idea: everything you WANT is
// cold and bright (foam, water, the rim you ride), everything that wants you
// is warm and dirty (grime, scum, the film on an old bath). You should be able
// to play this with the sound off and never once wonder which is which.
//
// Values above 1.0 are deliberate. The render stack is ACES + a bloom pass
// with a threshold, so anything over 1 blooms and everything under it stays
// matte — that is how a bubble glows without a light in the scene and how the
// web behind it stays a drawing rather than a smear.

export const PAL = {
  // the void the tube hangs in — not black, a very dark blue-violet, so the
  // rails read as light rather than as paint
  VOID: 0x05040a,

  // the web. Rails are what you can see; the far rings just say "depth".
  RAIL: 0x4be3ff,
  RAIL_DIM: 0x1b3f66,
  RING: 0x2a2f6e,

  // the rim you ride, and the segment you are standing on
  RIM: 0x8f6bff,
  RIM_HOT: 0xd6c8ff,

  // Suds Jack himself — a scoop, not a gun
  JACK: [2.4, 3.2, 3.6],          // HDR: he is the brightest thing on the rim
  JACK_DIVE: [3.6, 3.0, 4.4],     // and turns violet while committed

  // what you are here for
  BUBBLE: [1.35, 2.3, 2.6],
  BUBBLE_LIT: [3.4, 3.4, 2.2],    // the lit one. Bomb Jack's fuse, in foam.
  FOAM: 0xdff6ff,

  // what wants you: bath scum. Warm, dull, and never bloomed — grime does not
  // glow, which is most of how it reads as the wrong thing.
  GRIME: 0x8a7b2e,
  GRIME_DARK: 0x3c3512,
  GRIME_HOT: 0xc9b23a,

  // chrome
  TEXT: 0xdff6ff,
};

// The tube's hue drifts across a run — Tempest 2000's trick, and it is doing a
// job: a level you have seen before should not look identical the second time,
// or you stop reading the web and start reading from memory.
export function webTint(level) {
  // no magenta on level 3: Toko's badge sits in that corner in the brand's
  // own magenta, and two magentas on one screen make the signature look like
  // part of the game
  const hues = [0.55, 0.72, 0.42, 0.05, 0.32, 0.86];
  return hues[(level - 1) % hues.length];
}
