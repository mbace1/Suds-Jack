// EERI — what a level is CALLED, and what its address is.
//
// The game runs on one flat index: `SITES[i]`, and `goSite(i + 1)` is the
// whole of "next level". That is right, and nothing here changes it — a
// world is a NAMING layer over the flat list, not a second data structure.
// Two lists that can disagree is the bug this project has already paid for
// more than once (SITES vs ROOMS, and the three "v11" lineages).
//
// The scheme is Mario's, because the owner asked for it and because it is
// the one every parent already reads: EERI 1-1 is the first level of the
// first world, EERI 1-2 the second, EERI 2-1 the first level of world two.
// DESIGN §4.1 fixes a world at THREE levels, growing 3 → 6 → 9 → 12, so the
// mapping is arithmetic and stays correct as rooms are added — a level never
// has to be told which world it is in.
//
// PURE except for the temporary greybox registration below. World 3/4 are
// intentionally kept outside the already-stable rooms.js while they are
// being playtested; world34-register.js appends them to the same live array
// that level.js exports. Fold them into rooms.js and remove this import once
// the six layouts stop moving.

import './world34-register.js?v=48';

// DESIGN §4.1: "A world is three levels, and a world is one backdrop set."
export const PER_WORLD = 3;

// the flat index → { world, level }, both 1-based because they are read by
// humans and printed on the screen
export function idOf(i) {
  return { world: Math.floor(i / PER_WORLD) + 1, level: (i % PER_WORLD) + 1 };
}

// …and back. Returns the flat index, or null if the numbers are not a level.
export function indexOf(world, level) {
  if (!Number.isInteger(world) || !Number.isInteger(level)) return null;
  if (world < 1 || level < 1 || level > PER_WORLD) return null;
  return (world - 1) * PER_WORLD + (level - 1);
}

// The address. `eeri-1-2` rather than a bare `1-2`: a fragment gets pasted
// into chat and read out loud on its own, and "eeri-1-2" says what it is
// where "1-2" could be anything. The game still ACCEPTS the bare form.
export const LAB_SLUG = 'lab';
export function slugOf(i, total = Infinity) {
  if (i >= total) return LAB_SLUG;              // the gizmo lab is not a level
  const { world, level } = idOf(i);
  return `eeri-${world}-${level}`;
}

// What the HUD and the title say. The name is the room's own; this is the
// address printed beside it, so what you see matches what you can link to.
export function labelOf(i, total = Infinity) {
  if (i >= total) return 'LAB';
  const { world, level } = idOf(i);
  return `${world}-${level}`;
}

// Parse an address back to a flat index.
//
// Deliberately forgiving, because the failure mode is a child or a parent
// typing it: `#eeri-1-2`, `#EERI-1-2`, `#1-2`, `eeri-1-2`, with or without
// the `#`, all mean the same level. Anything else is null and the caller
// falls back to the first level rather than to a black screen.
export function parseSlug(s) {
  if (typeof s !== 'string') return null;
  const t = s.trim().replace(/^#/, '').toLowerCase();
  if (!t) return null;
  if (t === LAB_SLUG) return { lab: true };
  const m = t.match(/^(?:eeri-)?(\d+)-(\d+)$/);
  if (!m) return null;
  const i = indexOf(Number(m[1]), Number(m[2]));
  return i === null ? null : { index: i };
}
