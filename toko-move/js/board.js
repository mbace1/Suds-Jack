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
// These are SOLVED, not picked. A hand-picked set was measured first and failed
// badly — 32 of its 91 pairs sat under the house's 90-RGB-distance convention,
// because that convention was written for a handful of colours and fourteen do
// not fit in the mid-tone slice of the cube at all. Maximising raw separation
// instead drives straight to the gamut corners (#0000fc, #fc00ab, min dE 50) —
// satisfiable and wrong, a highlighter set on a paper map. So the search was
// constrained to this product's own tonal world (CIE L 32–62, chroma 22–62, all
// ≥3:1 on the paper) with HSL's metro orange PINNED, and the minimum perceptual
// gap maximised inside it. Achieved: **min dE76 = 37.0** across all 14, which is
// far above the ~10 where two colours stop reading as the same one. If a family
// is added, re-run the solver rather than eyeballing a gap — 37.0 is the number
// test/board.mjs holds, and adding a colour by hand will quietly shrink it.
const TRAM_INK = {
  '1':  '#961e28',  // dark red
  '2':  '#28a04b',  // green
  '3':  '#0091e6',  // bright blue
  '4':  '#3741a0',  // indigo
  '5':  '#875000',  // brown
  '6':  '#96005f',  // deep magenta
  '7':  '#009baa',  // teal
  '8':  '#828c05',  // olive
  '9':  '#be6ec8',  // orchid
  '10': '#3c4b6e',  // navy slate
  '13': '#af6e82',  // dusty rose
  '15': '#145a37',  // dark green
  'H':  '#968c64',  // khaki
};
export const METRO_INK = '#e2531f';
export const ROAD_INK  = '#c8c4b6';
export const HUB_INK   = '#1d2f36';

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
