// AUTHORED PIXEL ART — the seam hand-made MST sprites drop into (v45).
//
// mstcut.js re-cuts the painted plates automatically, and it is honest about
// its ceiling: an algorithm cannot decide that an eye is one dark pixel or
// that a pair of trainers needs a highlight, and that is most of what makes
// Metal Slug Tactics' soldiers read. So a plate can be REPLACED by a sprite a
// person (or Codex — see turf/CODEX_BRIEF.md) drew on the figure's own grid.
//
// One line per sprite: the plate's file name → the authored file. The board
// then draws the authored sprite nearest-neighbour at SPRITE_H / MST_H and
// skips the cut entirely; anything not listed keeps the automatic cut.
// test/smoke.mjs holds every file listed here to the same art-bible checks
// the cut is held to (height, a closed hard outline, hard alpha, flat bands),
// so a delivery that does not meet the brief fails the build rather than
// shipping.
//
// Poses (the `cast/` frame sets) key on the frame's own file name the same
// way: 'gunner-idle.png', 'gunner-attack-windup.png' and so on.
export const MST_ART = {
  // 'blade-plate.png': 'art-src/sprites/mst/blade.png',
};

export const MST_PROPS = {
  // 'bin.png': 'art-src/sprites/props/mst/bin.png',
};
