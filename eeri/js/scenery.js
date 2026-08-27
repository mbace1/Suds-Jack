// EERI — SCENERY AS DATA, which is the thing standing between this game and
// an editor.
//
// The levels have been data since parts.js: a room is a list of parts, the
// prover reads it, and spec/eeri.json now hands all twelve to the Godot
// port. Scenery never was. A prop is a call inside a function body —
//
//     pipeStack(7.2, 3.65, 0.82);
//
// — which is why dev/inspector.js can point at a prop and drag it but
// cannot SAVE: there is nowhere to write to, and no way to say WHICH call
// made the thing under your finger. Its own header says as much, and calls
// saving "step 2, and it is the real work".
//
// This is that step, and it is deliberately not an editor feature. The
// builders stay exactly where they are — they are the art lane's
// vocabulary and this file does not touch a single shape. What moves is
// the PLACEMENT: the twenty calls at the bottom of a dressing module
// become twenty rows here, each naming a prop type and its numbers.
//
// Three things fall out of that, and they are the three the owner asked
// for:
//
//   · the inspector can name the row that made a thing, so a drag has
//     somewhere to be written back to;
//   · a LIGHT is then not a new system — it is a prop type with a colour
//     and a radius, placed by the same tool, saved to the same row;
//   · the Godot port gets scenery through the spec it already reads,
//     rather than by someone re-typing coordinates.
//
// FORMAT. A row is `{ prop, x, y, ...fields }`. `PROPS` below declares
// which fields each type carries and what they mean, because an editor
// that has to guess is an editor that shows eight unlabelled numbers —
// which is the loop we are getting away from.

// ---- the vocabulary ------------------------------------------------------
// One entry per prop type: the fields it takes beyond x/y, each with a
// sensible default and a step for a slider. `label` is what a person is
// shown; the key is what the builder is called.
export const PROPS = {
  pipeStack:    { label: 'pipe stack',    fields: { s: { def: 0.8, min: 0.4, max: 1.6, step: 0.02 } } },
  buriedPipe:   { label: 'buried pipe',   fields: { s: { def: 1.0, min: 0.5, max: 2.0, step: 0.05 },
                                                    rot: { def: 0, min: -0.6, max: 0.6, step: 0.01 } } },
  serviceWall:  { label: 'service wall',  fields: { w: { def: 6, min: 2, max: 14, step: 0.1 },
                                                    h: { def: 2.4, min: 0.8, max: 6, step: 0.1 } } },
  pipeMouth:    { label: 'pipe mouth',    fields: { r: { def: 0.7, min: 0.3, max: 1.4, step: 0.02 } } },
  standpipe:    { label: 'standpipe',     fields: { h: { def: 2.4, min: 1, max: 5, step: 0.05 } } },
  pumpPlatform: { label: 'pump platform', fields: {} },
  walkway:      { label: 'walkway',       fields: { w: { def: 8, min: 3, max: 18, step: 0.1 } } },
  valve:        { label: 'valve',         fields: { r: { def: 0.48, min: 0.2, max: 1, step: 0.02 } } },

  // THE ONE PROP EVERY WORLD CAN USE. A lamp is an additive quad (js/light.js)
  // rather than a light in the scene graph, so it costs one draw call, needs
  // no new art, and — the point — it has an (x, y) an editor can drag.
  // `z` is which lane it sits BETWEEN: occlusion is the layer order, so a
  // lamp at -8 is behind the near lane and one at -1 is in front of it.
  lamp: {
    label: 'work lamp',
    fields: {
      r: { def: 6, min: 1.5, max: 22, step: 0.25 },
      i: { def: 1, min: 0.1, max: 2.4, step: 0.05 },
      z: { def: -1.2, min: -30, max: 3, step: 0.1 },
      colour: { def: '#ffd9a0', hex: true },
      flicker: { def: 0, min: 0, max: 0.35, step: 0.01 },
    },
  },
};

// ---- the placement -------------------------------------------------------
// Read left to right; a comment is a screen. These are the exact numbers
// that were in world2-dressing.js, moved and not retuned — a refactor that
// changes what a level LOOKS like is a refactor you cannot review.
export const SCENERY = {
  // WORLD 1 is daylight and stays daylight: two lamps only, and both are
  // there to say a machine is running rather than to light the room.
  groundworks: [
    { prop: 'lamp', x: 40.0, y: 6.4, r: 5.5, i: 0.5, z: -1.0, colour: '#ffe2b0' },
    { prop: 'lamp', x: 85.0, y: 6.0, r: 6.5, i: 0.55, z: -1.0, colour: '#ffe2b0' },
  ],

  pipeworks: [
    // OPENING — pipe yard identity before the first hazard.
    { prop: 'pipeStack', x: 7.2, y: 3.65, s: 0.82 },
    { prop: 'buriedPipe', x: 13.0, y: 2.55, s: 1.15, rot: -0.08 },

    // TRENCH / SERVICE WALL — one built connector and one valve, then
    // negative space around the actual water reads.
    { prop: 'serviceWall', x: 21.0, y: 0, w: 6.8, h: 2.5 },
    { prop: 'pipeMouth', x: 24.4, y: 5.0, r: 0.82 },
    { prop: 'standpipe', x: 29.6, y: 0, h: 2.15 },

    // MIDPOINT — pump hardware sells the treatment plant while the
    // checkpoint stays unobscured in front of it.
    { prop: 'pumpPlatform', x: 42.0, y: 0 },
    { prop: 'buriedPipe', x: 51.5, y: 2.2, s: 0.9, rot: 0.12 },

    // BACK HALF — elevated infrastructure frames the pipe/hoist sequences.
    { prop: 'walkway', x: 57.0, y: 9.6, w: 8.2 },
    { prop: 'pipeStack', x: 69.2, y: 3.55, s: 0.72 },
    { prop: 'standpipe', x: 76.4, y: 0, h: 2.8 },

    // FINAL SCREEN — one large junction, leaving the ride/wall/flag
    // silhouette clear at play height.
    { prop: 'serviceWall', x: 85.5, y: 0, w: 6.0, h: 2.0 },
    { prop: 'pipeMouth', x: 87.2, y: 4.95, r: 0.72 },
    { prop: 'pipeMouth', x: 90.0, y: 4.95, r: 0.72 },
    { prop: 'valve', x: 93.0, y: 5.35, r: 0.52 },

    // …and the pump hall is lit, because it is the one interior read in a
    // world of open trenches.
    { prop: 'lamp', x: 43.1, y: 6.9, r: 7.5, i: 0.8, z: -0.9, colour: '#ffdca8' },
    { prop: 'lamp', x: 61.0, y: 10.6, r: 6.0, i: 0.6, z: -1.4, colour: '#d8ecff' },
  ],

  // WORLD 3 — the forest is lit by gaps in the canopy, so the lamps are
  // cool, high and wide: they are daylight coming through a hole, not
  // fixtures. One warm one at the clearing where the work is.
  grove: [
    { prop: 'lamp', x: 18.0, y: 13.5, r: 13, i: 0.55, z: -22, colour: '#cfe6c8' },
    { prop: 'lamp', x: 52.0, y: 14.0, r: 15, i: 0.5, z: -22, colour: '#cfe6c8' },
    { prop: 'lamp', x: 84.0, y: 12.0, r: 11, i: 0.6, z: -14, colour: '#ffe6b4' },
  ],

  // WORLD 4 — the night shift, and this is what the mood ramp exists for:
  // the lanes go deep and cold, and these are the only warm things in the
  // picture. One per beat, so the level reads as a chain of lit places with
  // dark between them rather than an evenly grey room.
  nightshift: [
    { prop: 'lamp', x: 8.0, y: 8.5, r: 7.5, i: 1.15, z: -1.0, colour: '#ffd08a', flicker: 0.05 },
    { prop: 'lamp', x: 31.0, y: 7.5, r: 8.5, i: 1.0, z: -1.0, colour: '#ffd08a' },
    { prop: 'lamp', x: 46.0, y: 9.0, r: 9.5, i: 1.2, z: -1.4, colour: '#fff0c8' },
    { prop: 'lamp', x: 68.0, y: 8.0, r: 8.0, i: 1.1, z: -1.0, colour: '#ffd08a' },
    { prop: 'lamp', x: 88.0, y: 7.5, r: 9.0, i: 1.05, z: -1.0, colour: '#ffd08a', flicker: 0.04 },
    // …and one cold one far back, so the night has depth rather than just
    // being dark: a lit window on the horizon nobody can reach.
    { prop: 'lamp', x: 60.0, y: 15.0, r: 18, i: 0.45, z: -30, colour: '#6f8fc4' },
  ],
};

// Fill a row out to its declared defaults, so a builder never reads
// undefined off a row somebody wrote by hand (or an editor wrote in a
// hurry).
export function withDefaults(row) {
  const spec = PROPS[row.prop];
  if (!spec) throw new Error(`scenery: unknown prop "${row.prop}"`);
  const out = { x: 0, y: 0, ...row };
  for (const [k, f] of Object.entries(spec.fields)) if (out[k] === undefined) out[k] = f.def;
  return out;
}

// Walk a world's rows against a table of builders. Every built object is
// tagged with the row that made it — that tag is what lets the inspector
// answer "which line is this?", which it has never been able to do.
export function placeScenery(world, builders, onPlaced) {
  const rows = SCENERY[world] || [];
  rows.forEach((row, i) => {
    const p = withDefaults(row);
    // A CONSUMER BUILDS WHAT IT KNOWS. Lamps are mounted by layers.js for
    // every world; world 2's pipe vocabulary is mounted by its own dressing
    // module. One list, two readers — so an unknown prop here is somebody
    // else's row, not an error. `rooms.mjs` is what catches a typo.
    const build = builders[p.prop];
    if (!build) return;
    const made = build(p) || null;
    onPlaced?.(made, { world, index: i, ...p });
  });
  return rows.length;
}
