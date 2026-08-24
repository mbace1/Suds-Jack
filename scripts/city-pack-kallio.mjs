#!/usr/bin/env node
// Build the Kallio city pack from flow-core's rail extract.
//
//   node scripts/city-pack-kallio.mjs [path/to/kallio-rail-v1.json]
//
// WHY THIS EXISTS ALONGSIDE city-pack.mjs. That one fetches a whole agency's
// GTFS and needs a network. This one reads an extract somebody has already
// fetched and committed — `flow-core/data/kallio-rail-v1.json`, from PR #305 —
// and it is the reason Toko Move has a real city at all: this sandbox cannot
// reach `dev.hsl.fi`, and that lane could.
//
// AND WHY THE PACK IS COPIED RATHER THAN SHARED. flow-core's `ground.js` holds
// the same source data in DESIGN UNITS, clipped to Piritori's board, as a
// relief layer to draw under a different game. Toko Move needs lat/lon, its own
// projection, and a pack it can carry to `gh-pages` where flow-core does not
// exist. Two shapes of the same fetch, for two jobs — not two fetches, and the
// attribution is identical because the source is.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const src = process.argv[2] ?? 'flow-core/data/kallio-rail-v1.json';
const out = process.argv[3] ?? 'toko-move/cities/kallio.json';

let d;
try {
  d = JSON.parse(readFileSync(src, 'utf8'));
} catch (e) {
  console.error(`city-pack-kallio: cannot read ${src} — ${e.message}`);
  console.error('  it lives on the Piritori branch (PR #305). Pass a path if it is elsewhere.');
  process.exit(1);
}

const round = n => Math.round(n * 1e6) / 1e6;

// Stops come with real names, and several share one — the two platforms of a
// stop, which is exactly what city.js's merge() folds. They are left as the
// feed has them so that folding stays the game's decision rather than this
// script's.
const stops = d.stops.map(s => ({ id: s.id, name: s.name, lat: round(s.lat), lon: round(s.lon), modes: [] }));
const byName = new Map();
for (const s of stops) {
  if (!byName.has(s.name)) byName.set(s.name, []);
  byName.get(s.name).push(s);
}

// One direction per service. A line and its return are one stroke on a diagram,
// and drawing both stacks two strokes on every leg.
const seen = new Set();
const lines = [];
let slot = 0;
for (const l of d.lines) {
  if (seen.has(l.service)) continue;
  seen.add(l.service);
  const mode = l.mode === 'metro' ? 'SUBWAY' : 'TRAM';

  // `stopSequence` is NAMES, not ids, so the platform has to be chosen — and
  // the right one is the one nearest this line's own traced path. Picking the
  // first match instead puts a southbound tram on the northbound platform,
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

const used = new Set(lines.flatMap(l => l.stops));
const pack = {
  id: 'kallio',
  name: 'Kallio (Helsinki)',
  source: d.source?.attribution ?? 'Helsingin seudun liikenne (HSL)',
  licence: d.source?.licence ?? 'CC BY 4.0',
  fetched: (d.source?.feedVersion ?? '').slice(0, 10) || null,
  feed: d.source?.feed ?? null,
  // This is a WINDOW on Helsinki, not Helsinki — lines run out of it and stop
  // mid-route. Said in the pack so nobody reads a clipped line as a short one.
  clippedTo: d.boundingBox ?? null,
  note: 'a bounding-box extract, not the whole network: lines are cut where the box ends',
  modes: [...new Set(lines.map(l => l.mode))],
  stops: stops.filter(s => used.has(s.id)),
  lines,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(pack) + '\n');

const kb = (Buffer.byteLength(JSON.stringify(pack)) / 1024).toFixed(0);
console.log(`${out}: ${pack.stops.length} platforms, ${pack.lines.length} lines, ${kb} kB`);
console.log(`source: ${pack.source} (${pack.licence}) — this credit must stay on screen`);
