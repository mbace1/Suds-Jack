#!/usr/bin/env node
// Build a Toko Move city pack from a real network.
//
//   node scripts/city-pack.mjs --city hsl --modes TRAM,SUBWAY --key <subscription-key>
//   node scripts/city-pack.mjs --city hsl --key $DIGITRANSIT_KEY --out toko-move/cities/hsl.json
//
// WHY THIS IS A SCRIPT AND NOT SOMETHING THE GAME DOES. A city pack is data
// about the real world, fetched once and checked in. If the game fetched it at
// runtime it would need a key in the page, it would break offline, and the
// arcade's offline-first promise would be a lie. So: fetch here, commit the
// JSON, and the game only ever reads a file.
//
// The key is required and not optional to work around. Digitransit's APIs have
// needed registration since 2023 — get one at https://portal-api.digitransit.fi/
// — and rate limits are enforced. Do not commit it.
//
// ATTRIBUTION TRAVELS WITH THE DATA. HSL's is CC BY 4.0, which means the credit
// is a licence condition and not a courtesy, so the pack carries `source` and
// `licence` and `city.js` refuses to load one that does not.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Known routers. `id` is the Digitransit router name; anything not in here can
// still be passed with --endpoint, because this file should not be the reason a
// city cannot be added.
const ROUTERS = {
  hsl: {
    name: 'Helsinki',
    endpoint: 'https://api.digitransit.fi/routing/v2/hsl/gtfs/v1',
    source: 'Helsinki Regional Transport Authority (HSL) via Digitransit',
    licence: 'CC BY 4.0',
  },
  waltti: {
    name: 'Waltti cities',
    endpoint: 'https://api.digitransit.fi/routing/v2/waltti/gtfs/v1',
    source: 'Waltti via Digitransit',
    licence: 'CC BY 4.0',
  },
  finland: {
    name: 'Finland',
    endpoint: 'https://api.digitransit.fi/routing/v2/finland/gtfs/v1',
    source: 'Fintraffic / Digitransit',
    licence: 'CC BY 4.0',
  },
};

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);

const cityId = args.get('city') ?? 'hsl';
const router = ROUTERS[cityId];
const endpoint = args.get('endpoint') ?? router?.endpoint;
const key = args.get('key') ?? process.env.DIGITRANSIT_KEY;
const modes = (args.get('modes') ?? 'TRAM,SUBWAY').split(',').map(s => s.trim().toUpperCase());
const out = args.get('out') ?? `toko-move/cities/${cityId}.json`;

if (!endpoint) die(`unknown city "${cityId}" — pass --endpoint, or add it to ROUTERS`);
if (!key) die('no API key. Register at https://portal-api.digitransit.fi/ and pass --key, or set DIGITRANSIT_KEY');

function die(msg) { console.error('city-pack: ' + msg); process.exit(1); }

// One pattern per route direction, its stops in order. `patterns` gives several
// variants per route (short workings, diversions); the LONGEST is taken, which
// is the line as people think of it rather than the 06:14 that turns short.
const QUERY = `
query Net($modes: [Mode]) {
  routes(transportModes: $modes) {
    gtfsId
    shortName
    longName
    mode
    color
    patterns {
      code
      directionId
      stops { gtfsId name lat lon vehicleMode }
    }
  }
}`;

const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'digitransit-subscription-key': key },
  body: JSON.stringify({ query: QUERY, variables: { modes } }),
});
if (!res.ok) die(`${endpoint} answered ${res.status} ${res.statusText}`);
const body = await res.json();
if (body.errors) die('the API refused the query: ' + JSON.stringify(body.errors));

const stops = new Map();
const lines = [];
let colour = 0;

for (const r of body.data.routes ?? []) {
  // longest pattern per direction, then keep direction 0 only — a line and its
  // return are the same line on a diagram, and drawing both stacks two strokes
  // on every leg
  const best = new Map();
  for (const p of r.patterns ?? []) {
    const cur = best.get(p.directionId);
    if (!cur || (p.stops?.length ?? 0) > (cur.stops?.length ?? 0)) best.set(p.directionId, p);
  }
  const p = best.get(0) ?? [...best.values()][0];
  if (!p || (p.stops?.length ?? 0) < 2) continue;

  for (const s of p.stops) {
    if (stops.has(s.gtfsId)) continue;
    stops.set(s.gtfsId, {
      id: s.gtfsId,
      name: s.name,
      lat: round(s.lat),
      lon: round(s.lon),
      modes: [s.vehicleMode ?? r.mode],
    });
  }

  lines.push({
    id: r.gtfsId,
    name: r.shortName ?? r.longName ?? r.gtfsId,
    mode: r.mode,
    // the operator's own colour when it has one, else a slot in the game's
    // palette — a line without a colour is not a line anybody can follow
    hex: r.color ? '#' + r.color.replace(/^#/, '') : null,
    colour: colour++,
    stops: p.stops.map(s => s.gtfsId),
  });
}

function round(n) { return Math.round(n * 1e6) / 1e6; }   // ~10cm, far past what a diagram uses

if (!stops.size) die(`no stops came back for modes ${modes.join(',')} — is that mode served here?`);

const pack = {
  id: cityId,
  name: args.get('name') ?? router?.name ?? cityId,
  source: args.get('source') ?? router?.source ?? endpoint,
  licence: args.get('licence') ?? router?.licence ?? 'unknown — CHECK BEFORE SHIPPING',
  fetched: new Date().toISOString().slice(0, 10),
  modes,
  stops: [...stops.values()],
  lines,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(pack, null, 1) + '\n');

const kb = (Buffer.byteLength(JSON.stringify(pack)) / 1024).toFixed(0);
console.log(`${out}: ${pack.stops.length} stops, ${pack.lines.length} lines, ${modes.join('+')}, ${kb} kB`);
console.log(`source: ${pack.source} (${pack.licence}) — this credit must stay on screen`);
