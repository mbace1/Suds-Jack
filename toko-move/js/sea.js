// Toko Move v3.8 — THE SEA, as a shape (owner, 2026-11-06: "the top down view
// can use some polish").
//
// The water pack (cities/ground/helsinki-water.json, OpenStreetMap) carries the
// sea the way OpenStreetMap does: as COASTLINE, open ways with the land on the
// left and the water on the right, plus closed rings for the islands. A line is
// not an area, so the hop board stroked a wide band along every coast, and at a
// hop's kilometre that band read as blue tubes laid over the land with paper
// where the harbour should be. The art bible's stills had already solved it in
// raster (make_bible.py's sea_mask: flood fill and a vote); this is the same
// answer as vector, so the board can fill it at any zoom with a crisp shore.
//
// How:
//   1. Ways that share an end are joined into CHAINS; what closes on itself is
//      a RING (an island — land on the left of a closed way is its inside).
//   2. A chain that does not close leaves the extract. Each of its ends is
//      taken straight out to a frame around everything, and the sea is closed
//      by walking that frame CLOCKWISE (north up) from where a chain leaves to
//      where the next one comes in: water on the right of the coast is water
//      on the right of the frame, so the walk keeps it inside.
//   3. Sea polygons and island rings are filled together with the even-odd
//      rule, so an island inside the sea is a hole in it.
//
// Pure: no DOM, no canvas. `isSea()` is what test/sea.mjs holds against known
// places (the South Harbour is sea, Senaatintori is not, Korkeasaari is an
// island in it), because a sea that comes out inside-out is only a sign error
// away and looks, at a glance, like a lake district.
const key = p => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;

export function seaRings(water) {
  const edges = (water?.edges || []).filter(e => e.shape?.length >= 2);
  const rings = [], open = [];
  for (const e of edges) (key(e.shape[0]) === key(e.shape[e.shape.length - 1]) ? rings : open).push(e.shape);
  // 1. chains
  const byStart = new Map(open.map(s => [key(s[0]), s])), ends = new Set(open.map(s => key(s[s.length - 1])));
  const used = new Set(), chains = [];
  const follow = first => { const pts = [...first]; used.add(first); let cur = first;
    for (;;) { const n = byStart.get(key(cur[cur.length - 1])); if (!n || used.has(n)) break; used.add(n); pts.push(...n.slice(1)); cur = n; }
    return pts; };
  for (const s of open) if (!ends.has(key(s[0])) && !used.has(s)) chains.push(follow(s));
  for (const s of open) if (!used.has(s)) { const pts = follow(s); (key(pts[0]) === key(pts[pts.length - 1]) ? rings : chains).push(pts); }
  if (!chains.length) return { sea: [], islands: rings, frame: null };
  // 2. close the chains along a frame round everything
  const all = chains.flat(), bb = water.boundingBox || {};
  const f = { s: Math.min(bb.s ?? 90, ...all.map(p => p[0])) - 0.002, n: Math.max(bb.n ?? -90, ...all.map(p => p[0])) + 0.002,
    w: Math.min(bb.w ?? 180, ...all.map(p => p[1])) - 0.004, e: Math.max(bb.e ?? -180, ...all.map(p => p[1])) + 0.004 };
  const H = f.n - f.s, W = f.e - f.w, P = 2 * (H + W);
  // a point out to the nearest side of the frame, and where that is along it
  // (clockwise from the north-west corner: along the top, down the east side…)
  const out = ([lat, lon]) => { const d = [['n', f.n - lat], ['e', f.e - lon], ['s', lat - f.s], ['w', lon - f.w]].sort((a, b) => a[1] - b[1])[0][0];
    if (d === 'n') return { p: [f.n, lon], u: lon - f.w };
    if (d === 'e') return { p: [lat, f.e], u: W + (f.n - lat) };
    if (d === 's') return { p: [f.s, lon], u: W + H + (f.e - lon) };
    return { p: [lat, f.w], u: 2 * W + H + (lat - f.s) }; };
  const corners = [{ p: [f.n, f.e], u: W }, { p: [f.s, f.e], u: W + H }, { p: [f.s, f.w], u: 2 * W + H }, { p: [f.n, f.w], u: P }];
  const ch = chains.map(c => ({ c, a: out(c[0]), b: out(c[c.length - 1]) }));
  const sea = [], done = new Set();
  for (const first of ch) {
    if (done.has(first)) continue;
    const ring = []; let cur = first;
    for (let guard = 0; guard < ch.length + 1; guard++) {
      done.add(cur); ring.push(cur.a.p, ...cur.c, cur.b.p);
      // the next chain to come in, clockwise from where this one left
      const from = cur.b.u, gap = x => ((x - from) % P + P) % P;
      const next = ch.filter(x => !done.has(x) || x === first).sort((x, y) => gap(x.a.u) - gap(y.a.u))[0];
      for (const k of corners.map(c => ({ ...c, g: gap(c.u % P) })).filter(c => c.g > 0 && c.g < gap(next.a.u)).sort((x, y) => x.g - y.g)) ring.push(k.p);
      if (next === first) break;
      cur = next;
    }
    sea.push(ring);
  }
  return { sea, islands: rings, frame: f };
}

// Even-odd point-in-polygon over every ring: sea polygons and islands together,
// exactly as the board fills them. Lakes (the pack's `areas`) are water too.
export function isSea({ sea, islands }, lat, lon, areas = []) {
  let inside = false;
  for (const ring of [...sea, ...islands]) inside = crossing(ring, lat, lon) ? !inside : inside;
  if (inside) return true;
  return areas.some(a => a.shape?.length > 2 && crossing(a.shape, lat, lon));
}
function crossing(ring, lat, lon) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ay, ax] = ring[i], [by, bx] = ring[j];
    if ((ay > lat) !== (by > lat) && lon < (bx - ax) * (lat - ay) / (by - ay) + ax) c = !c;
  }
  return c;
}

// DISTRICT NAMES, WHERE THE PLACE IS (v3.8; owner, 2026-11-06: "Kluuvi looks
// to be in the wrong place on the map").
//
// The districts pack gives each quarter one point: the centre of the city's
// sub-district (osa-alue) polygon. Those polygons run over water, rail yards
// and parks, so a centre can land where no one would write the name. Five of
// the forty-one stand in the sea, and Kluuvi's stands in the tracks north of
// the station. A street-snapping fix was tried and put three of them on the
// wrong neighbour (Kaivopuisto's went to Katajanokka): there are no streets in
// the extract that far south. So these are placed BY HAND, each with its
// reason, and test/sea.mjs holds that no name the board writes stands in the
// water — a pack that brings a new one fails there, not on a screen.
export const LABEL_AT = {
  Kluuvi:      [60.1700, 24.9447, 'the osa-alue runs north over the rail yard and Kaisaniemi park, so its centre is in the tracks; the name is the station square and the streets down to the Esplanadi'],
  Katajanokka: [60.1675, 24.9700, 'the centre was in the water east of the island'],
  Kruununhaka: [60.1725, 24.9560, 'the centre was in the North Harbour'],
  Kaivopuisto: [60.1567, 24.9590, 'the centre was off the shore by the skerries; this is the park'],
  Hernesaari:  [60.1500, 24.9240, 'the centre was in the water west of the pier'],
  Lapinlahti:  [60.1678, 24.9165, 'the centre was in Lapinlahdenlahti; this is the old hospital grounds'],
};
export const labelAt = q => (LABEL_AT[q.name] ? LABEL_AT[q.name].slice(0, 2) : q.at);
