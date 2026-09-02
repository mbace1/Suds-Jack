// Toko Move v2.13 — the BOARD: the part of Helsinki the game is actually played in.
//
// Why this file exists. Every delivery anchor sits inside a box that is 9.1% of
// the full HSL pack's area, and the map was drawn to the whole pack — so the
// metro ran off to Espoo and Vuosaari while the twenty-two places you deliver to
// were a knot of overlapping labels in the middle. A courier game whose board is
// a twelfth of the screen is not readable, and readability here is not polish:
// the whole verb set is READ the network, time it, catch it.
//
// The box is DERIVED from the resolved anchors rather than typed in, so adding a
// delivery location moves the viewport with it. `test/board.mjs` asserts every
// anchor lands inside with margin to spare.
//
// OWNER OVERRIDE (2026-09-01), recorded per AGENTS.md §1.
// `TRANSIT_LAYERS.md` and transit-layers.js's own header say line colour comes
// from GTFS `route_color` with HSL's tram green / metro orange as the fallback.
// The owner's direction is "different line colors". This contradicts that rule
// and is taken deliberately, for a reason the data itself gives: `route_color`
// is **null on all 34 lines** in the committed pack, so the rule's own fallback
// path paints all thirty tram services one identical green — thirteen distinct
// corridors rendered as one indistinguishable tangle. The rule was written to
// stop invented geometry, and it still holds completely: GEOMETRY remains exact
// and untouched. Only the ink changes, and only because the source has no ink to
// honour. If HSL ever ships route_color, `lineColour` prefers it again.

// ---------------------------------------------------------------- the box

// Fraction of the anchor span added on every side. Enough that a stop on the
// edge of the board is not drawn on the frame itself, small enough that the
// board stays the board.
export const BOARD_MARGIN = 0.11;

// The gameplay box in degrees, from wherever the anchors actually resolved to.
export function boardBox(resolved, margin = BOARD_MARGIN) {
  const stops = Object.values(resolved || {}).filter(Boolean);
  if (stops.length < 2) throw new Error('board box needs at least two resolved anchors');
  let s = Infinity, n = -Infinity, w = Infinity, e = -Infinity;
  for (const stop of stops) {
    s = Math.min(s, stop.lat); n = Math.max(n, stop.lat);
    w = Math.min(w, stop.lon); e = Math.max(e, stop.lon);
  }
  const dLat = (n - s) * margin, dLon = (e - w) * margin;
  return { s: s - dLat, n: n + dLat, w: w - dLon, e: e + dLon };
}

// Grow the box to the canvas's aspect so the board FILLS the canvas instead of
// being letterboxed into a column. Growing (never cropping) is the deliberate
// half of the trade: the extra pixels show more of the surrounding network,
// which is honest, where cropping would hide a stop the player can deliver to.
export function boxToAspect(box, width, height) {
  const kx = Math.cos(((box.n + box.s) * 0.5) * Math.PI / 180);
  const boxW = (box.e - box.w) * kx, boxH = box.n - box.s;
  const want = Math.max(1e-6, width / Math.max(1, height)), have = boxW / boxH;
  if (Math.abs(want - have) < 1e-9) return { ...box };
  if (have < want) {                      // canvas is wider than the board
    const grow = (boxH * want / kx - (box.e - box.w)) * 0.5;
    return { ...box, w: box.w - grow, e: box.e + grow };
  }
  const grow = (boxW / want - boxH) * 0.5; // canvas is taller than the board
  return { ...box, s: box.s - grow, n: box.n + grow };
}

// One projection, used by the transit layers, the water, the roads, the stops
// and every hit test — so a draw and a tap can never disagree about where a
// stop is. Anything outside the box simply lands off-canvas and is clipped by
// the canvas edge, which reads correctly: the network continues, the board ends.
export function boardFit(box, width, height) {
  const b = boxToAspect(box, width, height);
  const kx = Math.cos(((b.n + b.s) * 0.5) * Math.PI / 180);
  const scale = width / Math.max(1e-9, (b.e - b.w) * kx);
  const project = (lat, lon) => ({ x: (lon - b.w) * kx * scale, y: (b.n - lat) * scale });
  project.box = b;
  project.scale = scale;
  return project;
}

// ------------------------------------------------------- line identity ink

// One colour per tram FAMILY, not per layer: 4, 4H and 4T are variants of one
// service running one corridor, so they share ink — colouring them separately
// would say "three lines" where the city has one. Metro is deliberately ONE
// colour: M1 and M2 share track across the whole board and only diverge far
// outside it, so two colours would draw a division that is not there.
//
// These are SOLVED, not picked, and they were solved TWICE — once for the warm
// paper this board used to have, and again at v2.20 for the night ground, which
// is the honest cost of the owner's greyscale direction. Six of the fourteen
// light-paper inks fail 3:1 on the night paper (1 at 1.83:1, 4 at 1.77, 5 at
// 2.31, 6 at 1.79, 10 at 1.76, 15 at 1.85) — a dark line on a dark ground is
// not a quieter line, it is an absent one — so carrying them over was never an
// option and eyeballing replacements was the trap the first solve documented.
//
// The search is the same one: constrained to this product's tonal world, HSL's
// metro orange PINNED, minimum perceptual gap maximised inside it. Only the
// band moved, because a light ground and a dark one do not offer the same room:
// on paper the usable slice was L 32–62, and here it is L 56–78 with chroma
// 32–56. Achieved: **min dE76 = 32.5** across all 14, down from the paper's
// 37.0 and still three times the ~10 where two colours stop reading as
// different. Widening the band does buy more — L 54–80 with chroma to 58
// reaches 41.1 — but it buys it in neon: mint, lemon and hot pink, the
// highlighter set the first solve was written to avoid. The floor in
// test/board.mjs moved to 32.0 to match; if a family is added, re-run the
// solver rather than eyeballing a gap.
const TRAM_INK = {
  '1':  '#9a79aa',  // violet
  '2':  '#00d7ef',  // cyan
  '3':  '#8bc4fe',  // sky
  '4':  '#c09734',  // amber
  '5':  '#808b53',  // olive
  '6':  '#ce6459',  // brick
  '7':  '#fca8c1',  // rose
  '8':  '#8495fd',  // indigo
  '9':  '#abcf66',  // lime
  '10': '#f19ef9',  // orchid
  '13': '#db5389',  // magenta
  '15': '#f4b58f',  // peach
  'H':  '#7ad3b0',  // mint
};
export const METRO_INK = '#e2531f';

// ------------------------------------------------------------- the night map
//
// OWNER DIRECTION (2026-09-02), recorded per AGENTS.md §1, and it replaces the
// warm-paper board this file was written for: "we should go for a more grey
// scale palette... a more readable map with streets and water that is based in
// a gray scale with some contrast colors like dark blue for water... mostly
// grey night version map colors though."
//
// So the ground goes to greys and the water to a dark blue, and the LINES keep
// their colour — they are the contrast colours in that sentence, and they are
// the only thing on the board that carries identity. Everything else is
// hierarchy: road weight, label weight, and the one blue.
//
// Every value below is measured against the ground it sits on rather than
// picked: test/board.mjs holds the line floor (min dE76 and 3:1 on the paper)
// and the roads-quieter-than-lines rule, and both are re-measured on this
// paper, not the old one.
export const NIGHT = {
  paper:     '#22282d',   // the board itself — land at night
  surround:  '#171b1f',   // the canvas outside the board
  water:     '#12293d',   // "dark blue for water", the owner's one contrast
  waterFill: '#173a58',
  waterEdge: '#2a5f88',   // the coastline, one step up so it reads as an edge
  district:  '#69747b',
  credit:    '#77828a',
  label:     '#c4ced4',
  labelDim:  '#98a4ab',
  halo:      'rgba(20,26,31,.86)',
  hub:       '#eef3f6',
  hubRing:   '#0f1418',
  stop:      '#d5dee3',
  stopRing:  '#0f1418',
  frame:     'rgba(196,206,212,.20)',
};
// Roads by tier. Three greys a step apart, and what keeps them GROUND at night
// is not that they are dim — dim on a dark board is gone, and the first cut of
// this palette held them under the paper board's 1.9:1 bar and drew streets
// nobody could see. It is that they are GREY: every road here has Lab chroma
// under 9 and every line has chroma over 30, a gap of nearly four times. Colour
// is what says "service"; weight and lightness say "how big a street".
export const ROAD_INK_MAJOR = '#5c6773';
export const ROAD_INK_MID   = '#4a535b';
export const ROAD_INK_MINOR = '#3f474e';
// The schematic corridors, where the real street extract does not reach. Same
// weight as the mid tier so the swap between them is a change of detail, not a
// change of loudness.
export const ROAD_INK  = '#4a535b';
export const HUB_INK   = '#eef3f6';

// "10B" -> "10", "9N" -> "9", "M1B" -> "M1", "H" -> "H".
export function lineFamily(name) {
  const s = String(name ?? '').trim().toUpperCase();
  const m = s.match(/^(M?\d+)/);
  return m ? m[1] : s.replace(/[^A-Z]/g, '');
}

// GTFS route_color still wins wherever the source actually has one.
export function lineColour(name, mode, hex = null) {
  if (typeof hex === 'string' && /^#?[0-9a-f]{6}$/i.test(hex)) return hex.startsWith('#') ? hex : `#${hex}`;
  if (mode === 'SUBWAY' || mode === 'metro') return METRO_INK;
  return TRAM_INK[lineFamily(name)] || '#6a7a80';
}

export function tramInk() { return { ...TRAM_INK }; }

// ------------------------------------------------------------- main roads

// The major streets, as the sequences of anchors they actually run through.
// These are the SAME abstractions hubs-walking.js already declares for walking
// — drawn, not invented. They are not exact pedestrian geometry and must never
// be styled to look like transit: flat grey, thin, under everything, no caps.
export const MAIN_ROADS = [
  { name: 'Mannerheimintie',   nodes: ['rautatientori', 'lasipalatsi', 'ooppera', 'pasila'] },
  { name: 'Runeberginkatu',    nodes: ['kamppi', 'toolontori', 'meilahti'] },
  { name: 'Helsinginkatu',     nodes: ['toolontori', 'kallionkirkko', 'sornainen'] },
  { name: 'Hämeentie',         nodes: ['hakaniemi', 'sornainen', 'arabia'] },
  { name: 'Kaivokatu',         nodes: ['kamppi', 'lasipalatsi', 'rautatientori', 'hakaniemi'] },
  { name: 'Bulevardi',         nodes: ['kamppi', 'hietalahti', 'eira'] },
  { name: 'Eteläranta',        nodes: ['senaatintori', 'kauppatori', 'olympiaterminaali'] },
  { name: 'Pohjoisesplanadi',  nodes: ['rautatientori', 'senaatintori'] },
  { name: 'Tyynenmerenkatu',   nodes: ['ruoholahti', 'lansiterminaali', 'hietalahti'] },
  { name: 'Kalasataman katu',  nodes: ['sornainen', 'kalasatama'] },
  { name: 'Pasilan väylä',     nodes: ['pasila', 'messukeskus', 'kapyla'] },
  { name: 'Katajanokanranta',  nodes: ['kauppatori', 'katajanokka'] },
];

// Road polylines in lat/lon, resolved through the anchors so a road can never
// point somewhere no stop is.
export function roadPaths(resolved) {
  const out = [];
  for (const road of MAIN_ROADS) {
    const pts = road.nodes.map(id => resolved?.[id]).filter(Boolean).map(s => [s.lat, s.lon]);
    if (pts.length >= 2) out.push({ name: road.name, path: pts });
  }
  return out;
}
