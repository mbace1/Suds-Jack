#!/usr/bin/env node
/**
 * The ground, built from COMMITTED real geometry instead of a live fetch.
 *
 *   node flow-core/tools/ground-data.mjs --dry    project, clip, print, write nothing
 *   node flow-core/tools/ground-data.mjs          …and write flow-core/ground.js
 *
 * WHY THIS EXISTS BESIDE ground.mjs. `GROUND.md` §4 records that the ground was
 * finished except for its source: Overpass answers CONNECT with 403 at the
 * egress gateway, and the one reachable alternative — Who's On First's Kallio
 * macrohood — is an ADMINISTRATIVE polygon that contains the open water south of
 * Hakaniemi and all of Eläintarhanlahti. Drawn as land it paints the harbour as
 * ground, which is a worse map than no map.
 *
 * That diagnosis was independently reached twice. The Piritori → Eden map work
 * hit the identical trap with Helsinki's official sub-district polygons and
 * recorded it in `TRANSIT_LAYERS.md` §11.3, having tested points in
 * Eläintarhanlahti, Töölönlahti, Sörnäistenselkä and the open sea — every one of
 * them falls inside a district. Two sessions, two datasets, same wrong shape.
 * **An administrative boundary is not a coastline, and it never will be.**
 *
 * So the water was fetched on a machine that can reach Overpass and committed as
 * data. `flow-core/data/` now holds it, and this importer needs no network at
 * all — which is what the offline workers needed anyway.
 *
 * THE PROJECTION IS NOT ITS OWN. Imported from city.js, so the ground and the
 * stops cannot drift apart: one arithmetic, one board.
 *
 * ONE DEPARTURE FROM THE SPEC, and it is the data's fault rather than a
 * preference — see GROUND.md §2 and the note this PR adds under it. The format
 * asked for `land`, ONE closed ring, with water as the negative space. Real
 * Kallio does not have one: the coastline arrives as 27 open runs (OSM maps the
 * sea as `natural=coastline`, a directed open line with land on its left and the
 * sea only implied), and there are 27 separate inland water bodies besides.
 * Closing a coastline run into a polygon puts a lid across the harbour mouth.
 * So this emits `water` rings and `coast` lines, which is what is actually
 * there, and a renderer draws the sea rather than inferring it.
 *
 * EVERYTHING IS ITS OWN LAYER, under `layers`. A renderer that wants water and
 * no streets, or streets and no rail, should not have to filter one array —
 * and a product deciding what to draw is GROUND.md §2's own rule. Order in the
 * object is bottom-to-top draw order, which is also the order the city is made
 * of: water, then streets, then the rails on them.
 *
 * RAIL CARRIES ITS SERVICE AND A COLOUR. A line without its number is a green
 * squiggle, and Toko Move is a game about which line goes where. The palette is
 * OURS, not HSL's — HSL has no per-line tram colour at all (verified from
 * hsl-map-publisher's own `colorsByMode`: trams are one green and the NUMBER is
 * the wayfinding). It ships here so a renderer has something correct to draw on
 * day one, and `LINE_COLOURS` is exported so a product can replace it.
 */

import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { project, KALLIO } from '../city.js?v=2';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'data');
const OUT = path.join(HERE, '..', 'ground.js');

// THE MARGIN IS A FLAG, AND ITS DEFAULT HAD TO CHANGE. ground.mjs used 14
// units (140 m). Measured against the real coastline, the nearest water is
// **129 m** from the board's edge — so at 140 m the sheet catches two slivers
// in one corner and nothing else, and the map still forgets the water that
// GROUND.md §1 says it must not.
//
//    pad  14 (140 m) ->  0 water areas,  2 coast runs
//    pad  30 (300 m) ->  2 water areas,  7 coast runs
//    pad  60 (600 m) -> 11 water areas, 14 coast runs
//    pad 100 (1000 m) -> 22 water areas, 22 coast runs
//
// 60 puts a shore on both sides of the block, which is the picture GROUND.md
// asks for — "a high block between two waters". It is a drawn-extent decision
// rather than a data one, so it is a flag and this is only the default.
const padArg = process.argv.indexOf('--pad');
const PAD = padArg > -1 ? +process.argv[padArg + 1] : 60;
const TOL = 0.1;                      // a tenth of a unit is one metre here

// ── the board ───────────────────────────────────────────────────────────────
const nodes = Object.values(KALLIO.nodes || KALLIO);
const xs = [], ys = [];
for (const n of nodes) {
  if (typeof n?.x === 'number' && typeof n?.y === 'number') { xs.push(n.x); ys.push(n.y); }
}
const BOX = {
  x0: Math.min(...xs) - PAD, x1: Math.max(...xs) + PAD,
  y0: Math.min(...ys) - PAD, y1: Math.max(...ys) + PAD,
};

// ── clipping ────────────────────────────────────────────────────────────────
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const clipHalf = (poly, keep, cut) => {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ka = keep(a), kb = keep(b);
    if (ka) out.push(a);
    if (ka !== kb) out.push(cut(a, b));
  }
  return out;
};
function clipRect(poly) {
  let p = poly;
  p = clipHalf(p, v => v.x >= BOX.x0, (a, b) => lerp(a, b, (BOX.x0 - a.x) / (b.x - a.x)));
  p = clipHalf(p, v => v.x <= BOX.x1, (a, b) => lerp(a, b, (BOX.x1 - a.x) / (b.x - a.x)));
  p = clipHalf(p, v => v.y >= BOX.y0, (a, b) => lerp(a, b, (BOX.y0 - a.y) / (b.y - a.y)));
  p = clipHalf(p, v => v.y <= BOX.y1, (a, b) => lerp(a, b, (BOX.y1 - a.y) / (b.y - a.y)));
  return p;
}
/** Open chains are clipped by walking them and cutting at the boundary, which
 *  is NOT the polygon clipper: Sutherland–Hodgman closes what it is given, and
 *  running a coastline through it would join its two ends across the board. */
function clipChain(pts) {
  const inside = p => p.x >= BOX.x0 && p.x <= BOX.x1 && p.y >= BOX.y0 && p.y <= BOX.y1;
  const runs = [];
  let cur = [];
  for (let i = 0; i < pts.length; i++) {
    if (inside(pts[i])) cur.push(pts[i]);
    else if (cur.length) { runs.push(cur); cur = []; }
  }
  if (cur.length) runs.push(cur);
  return runs.filter(r => r.length > 1);
}

// ── Douglas–Peucker, open chains only ───────────────────────────────────────
// A CLOSED RING CANNOT BE FED TO DP DIRECTLY — GROUND.md §4 records why: the
// wrapped baseline is zero-length and a 37-point coastline collapses to a
// point. Rings are split at their two most distant points and each half run as
// an open chain, which is the same fix, kept.
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let far = 0, dmax = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i].x - a.x) * dy - (pts[i].y - a.y) * dx) / len;
    if (d > dmax) { dmax = d; far = i; }
  }
  if (dmax <= tol) return [a, b];
  return [...dp(pts.slice(0, far + 1), tol).slice(0, -1), ...dp(pts.slice(far), tol)];
}
function simplifyRing(ring, tol) {
  if (ring.length < 4) return ring;
  let i0 = 0, i1 = 0, best = -1;
  for (let i = 0; i < ring.length; i++) {
    for (let j = i + 1; j < ring.length; j++) {
      const d = Math.hypot(ring[i].x - ring[j].x, ring[i].y - ring[j].y);
      if (d > best) { best = d; i0 = i; i1 = j; }
    }
  }
  const half1 = ring.slice(i0, i1 + 1);
  const half2 = [...ring.slice(i1), ...ring.slice(0, i0 + 1)];
  return [...dp(half1, tol).slice(0, -1), ...dp(half2, tol).slice(0, -1)];
}

// One hue per line, so six routes over one corridor can be told apart. 1/6/7
// are the values Wikidata carries; 3 is deepened off #007fc1 because Wikidata's
// blue sits a step from line 1's cyan and they run side by side; 8/9 have none
// published anywhere. NOT HSL's — see the header.
const LINE_COLOURS = {
  metro: '#ff6319', rail: '#8c4799', ferry: '#00b9e4',
  1: '#00b4e5', 2: '#e8734a', 3: '#0b5299', 4: '#c9a227', 5: '#7a8f3a',
  6: '#009757', 7: '#d5007f', 8: '#8a5cf0', 9: '#b8d430', 10: '#00a3a3',
  13: '#0098a1',
};
const colourFor = l => LINE_COLOURS[l.service]
  || LINE_COLOURS[l.mode] || '#00985f';

const toXY = p => project(p[1], p[0]);          // data is [lat, lon]
const round = pts => pts.map(p => [+p.x.toFixed(2), +p.y.toFixed(2)]);

// ── build ───────────────────────────────────────────────────────────────────
const water = JSON.parse(await readFile(path.join(DATA, 'kallio-water-v1.json'), 'utf8'));
const rail = JSON.parse(await readFile(path.join(DATA, 'kallio-rail-v1.json'), 'utf8'));
const cor = JSON.parse(await readFile(path.join(DATA, 'kallio-corridors-v1.json'), 'utf8'));

const waterRings = [];
for (const a of water.areas || []) {
  const ring = clipRect(a.shape.map(toXY));
  if (ring.length < 3) continue;
  const s = simplifyRing(ring, TOL);
  if (s.length >= 3) waterRings.push(round(s));
}

const coast = [];
for (const e of water.edges || []) {
  for (const run of clipChain(e.shape.map(toXY))) {
    const s = dp(run, TOL);
    if (s.length > 1) coast.push(round(s));
  }
}

// Rail: direction 0 only — the two directions of a route are the same street
// drawn twice. Toko Move draws lines on real alignments rather than straight
// hops, which is the point of a Mini Metro on a real map.
const railOut = [];
for (const l of rail.lines) {
  if (l.direction !== 0) continue;
  for (const run of clipChain(l.shape.map(toXY))) {
    const s = dp(run, TOL);
    if (s.length > 1) railOut.push({ service: l.service, mode: l.mode, colour: colourFor(l), shape: round(s) });
  }
}

// STREETS. Corridors that carry service — not every street, and the data says
// so itself in `source.isNot`. In Kallio that is most of the grid that matters
// and it omits the quiet residential blocks entirely. `w` is a 0..1 weight from
// weekly trips on a LOG scale, so a renderer can make a trunk look like a trunk
// without anyone hand-classifying a road.
const maxTrips = Math.log(cor.corridors[0].trips + 1);
const streets = [];
for (const c of cor.corridors) {
  for (const run of clipChain(c.shape.map(toXY))) {
    const s2 = dp(run, TOL);
    if (s2.length > 1) {
      streets.push({ w: +(Math.log(c.trips + 1) / maxTrips).toFixed(3), shape: round(s2) });
    }
  }
}
streets.sort((a, b) => a.w - b.w);          // quiet first, so a trunk draws over

const pts = a => a.reduce((n, r) => n + (r.shape ? r.shape.length : r.length), 0);
console.log(`  board  x ${BOX.x0.toFixed(0)}..${BOX.x1.toFixed(0)}  y ${BOX.y0.toFixed(0)}..${BOX.y1.toFixed(0)}  (design units, 1 = 10 m)`);
console.log(`  water  ${waterRings.length} rings, ${pts(waterRings)} points`);
console.log(`  coast  ${coast.length} runs, ${pts(coast)} points`);
console.log(`  street ${streets.length} runs, ${pts(streets)} points`);
console.log(`  rail   ${railOut.length} lines, ${pts(railOut)} points — ${[...new Set(railOut.map(r => r.service))].join(' ')}`);

if (process.argv.includes('--dry')) {
  console.log('\n  --dry: nothing written');
} else {
  const body = `// GENERATED by flow-core/tools/ground-data.mjs — do not hand-edit.
//
// The land under the lines, in DESIGN UNITS (1 unit = 10 m), projected through
// city.js's own project() so the ground and the stops cannot drift apart.
//
// \`water\` are closed rings and \`coast\` are open runs. See GROUND.md §2: real
// Kallio has no single land ring, because OSM maps the sea as an open
// coastline with the water only implied, and closing one puts a lid across the
// harbour mouth. A renderer draws the sea rather than inferring it.
//
// A product decides whether to draw any of this, behind theme.relief.
export const GROUND = {
  kallio: {
    source: ${JSON.stringify({
    water: { dataset: water.source?.dataset, licence: water.source?.licence, attribution: water.source?.attribution },
    rail: { feed: rail.source?.feed, licence: rail.source?.licence, attribution: rail.source?.attribution },
    note: 'committed under flow-core/data/; re-run ground-data.mjs to rebuild',
  }, null, 6).replace(/\n/g, '\n    ')},
    box: ${JSON.stringify({ x0: +BOX.x0.toFixed(2), y0: +BOX.y0.toFixed(2), x1: +BOX.x1.toFixed(2), y1: +BOX.y1.toFixed(2) })},
    // bottom-to-top draw order, which is also the order the city is made of
    layers: {
      water: ${JSON.stringify(waterRings)},
      coast: ${JSON.stringify(coast)},
      street: ${JSON.stringify(streets)},
      rail: ${JSON.stringify(railOut)},
    },
  },
};

// Exported so a product can re-map without editing generated data.
export const LINE_COLOURS = ${JSON.stringify(LINE_COLOURS, null, 2)};
`;
  await writeFile(OUT, body);
  console.log(`\n  → flow-core/ground.js  ${Math.round(body.length / 1024)} KB`);
}
