#!/usr/bin/env node
// Build the HELSINKI city pack — chapter one of the campaign — out of the real
// geometry this repository already carries.
//
//   node scripts/city-pack-helsinki.mjs
//
// WHY IT READS COMMITTED FILES RATHER THAN FETCHING. `scripts/city-pack.mjs`
// fetches an agency's whole GTFS and needs a network; the environment these
// tools are written in cannot reach `dev.hsl.fi`, `api.digitransit.fi` or
// Overpass — all three answer nothing at the egress gateway. What it CAN reach
// is the repository, and the repository holds two real extracts fetched on a
// networked machine and committed:
//
//   flow-core/data/kallio-rail-v1.json    HSL GTFS       CC BY 4.0
//   flow-core/data/kallio-water-v1.json   OpenStreetMap  ODbL 1.0
//
// So the pack is built from those. It is EVERY LIVE TRACK in the box — twenty
// services, both metro lines and eighteen tram services including the letter
// and night variants — with their real shapes, real stop names and real
// coordinates, plus the real coastline and the real inland water.
//
// WHAT IT IS NOT. The box is 60.17–60.20 N, 24.93–24.98 E: central Helsinki
// from the main station up through Kallio and Vallila to Pasila. Lines run OUT
// of it and are cut where it ends — line 4 does not reach Munkkiniemi here and
// the metro stops at Kalasatama. The pack says so in `clippedTo` and `note`,
// and the game says so on the mission card, because a clipped line drawn as a
// short one is a lie about a city somebody lives in.
//
// The upgrade path is one command on a networked machine:
//   node scripts/city-pack.mjs --city hsl --out toko-move/cities/helsinki.json
// It writes the same schema from the whole feed. Nothing in the game changes.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const railPath = process.argv[2] ?? 'flow-core/data/kallio-rail-v1.json';
const waterPath = process.argv[3] ?? 'flow-core/data/kallio-water-v1.json';
const out = process.argv[4] ?? 'toko-move/cities/helsinki.json';

const read = (p, what) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { console.error(`city-pack-helsinki: cannot read the ${what} at ${p} — ${e.message}`); process.exit(1); }
};
const rail = read(railPath, 'rail extract');
const water = read(waterPath, 'water extract');

const round = n => Math.round(n * 1e6) / 1e6;

// Stops keep the feed's own names and ids. Several share a name — the two
// platforms of one stop — and folding those is `city.js`'s `merge()`, which is
// the GAME's decision and not this script's.
const stops = rail.stops.map(s => ({
  id: s.id, name: s.name, lat: round(s.lat), lon: round(s.lon), modes: [],
}));
const byName = new Map();
for (const s of stops) {
  if (!byName.has(s.name)) byName.set(s.name, []);
  byName.get(s.name).push(s);
}

// ONE DIRECTION PER SERVICE. A line and its return are one stroke on a diagram
// and drawing both stacks two strokes on every leg. The feed carries 40 rows
// for 20 services.
const seen = new Set();
const lines = [];
let slot = 0;
for (const l of rail.lines) {
  if (seen.has(l.service)) continue;
  seen.add(l.service);
  const mode = l.mode === 'metro' ? 'SUBWAY' : 'TRAM';

  // `stopSequence` is NAMES, and a name can belong to either platform — so the
  // platform is chosen as the one nearest THIS line's own traced path. Taking
  // the first match instead puts a southbound tram on the northbound platform,
  // which is a stop's width of error at every call.
  const ids = [];
  for (const name of l.stopSequence ?? []) {
    const cands = byName.get(name);
    if (!cands?.length) continue;
    let best = cands[0], bd = Infinity;
    for (const c of cands) {
      for (const [la, lo] of l.shape) {
        const dd = Math.hypot(c.lat - la, (c.lon - lo) * 0.5);
        if (dd < bd) { bd = dd; best = c; }
      }
    }
    if (!best.modes.includes(mode)) best.modes.push(mode);
    if (ids[ids.length - 1] !== best.id) ids.push(best.id);
  }
  if (ids.length < 2) continue;

  lines.push({
    id: l.routeId, name: l.service, mode, colour: slot++,
    stops: ids,
    path: l.shape.map(([la, lo]) => [round(la), round(lo)]),
  });
}

// ── the water ─────────────────────────────────────────────────────────
// A separate dataset under a STRICTER licence than the timetable: OSM is ODbL,
// an extract is a Derivative Database, and it says so itself rather than hiding
// under the pack's one `licence` field.
//
// `areas` are closed rings and fillable. `edges` are coastline — an OPEN,
// directed line with land on its left and the sea only implied — so they are
// carried as lines and NOT closed. Closing a coastline run into a polygon puts
// a lid across the harbour mouth and paints the sea as land; `flow-core`'s
// importer records hitting exactly that, twice, from two different datasets.
const ring = shape => shape.map(([la, lo]) => [round(la), round(lo)]);
const areas = water.areas.filter(a => (a.shape?.length ?? 0) >= 4).map(a => ({ name: a.name ?? null, ring: ring(a.shape) }));
const coast = water.edges.filter(e => (e.shape?.length ?? 0) >= 2).map(e => ({ name: e.name ?? null, pts: ring(e.shape) }));

const used = new Set(lines.flatMap(l => l.stops));
const pack = {
  id: 'helsinki',
  name: 'Helsinki',
  source: rail.source?.attribution ?? '© Helsingin seudun liikenne (HSL)',
  licence: rail.source?.licence ?? 'CC BY 4.0',
  fetched: (rail.source?.feedVersion ?? '').slice(0, 10) || null,
  feed: rail.source?.feed ?? null,
  clippedTo: rail.boundingBox ?? null,
  note: 'central Helsinki, from the main station up through Kallio and Vallila to Pasila: '
      + 'every live track in the box, cut where the box ends',
  modes: [...new Set(lines.map(l => l.mode))],
  stops: stops.filter(s => used.has(s.id)),
  lines,
  water: { areas, coast },
  waterSource: water.source?.attribution ?? '© OpenStreetMap contributors',
  waterLicence: water.source?.licence ?? 'ODbL 1.0',
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(pack) + '\n');

const kb = (Buffer.byteLength(JSON.stringify(pack)) / 1024).toFixed(0);
console.log(`${out}: ${pack.stops.length} stops, ${pack.lines.length} services (${pack.lines.map(l => l.name).join(' ')}), ${kb} kB`);
console.log(`  water: ${areas.length} bodies, ${coast.length} coastline runs`);
console.log(`  ${pack.source} (${pack.licence}) · ${pack.waterSource} (${pack.waterLicence}) — both credits must stay on screen`);
