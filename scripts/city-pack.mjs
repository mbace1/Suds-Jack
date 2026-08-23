#!/usr/bin/env node
// Build a Toko Move city pack from a real network.
//
//   node scripts/city-pack.mjs --city hsl
//   node scripts/city-pack.mjs --city nyc --modes SUBWAY
//   node scripts/city-pack.mjs --city hsl --gtfs ~/Downloads/hsl.zip     (offline)
//
// WHY THIS IS A SCRIPT AND NOT SOMETHING THE GAME DOES. A city pack is data
// about the real world, fetched once and checked in. If the game fetched it at
// runtime it would break offline, and the arcade's offline-first promise would
// be a lie. So: fetch here, commit the JSON, and the game only ever reads a
// file.
//
// AND WHY GTFS RATHER THAN THE ROUTING API. The first cut of this script went
// through Digitransit's GraphQL, which has needed a registered
// `digitransit-subscription-key` since 2023. The static GTFS feed needs no key
// at all — for Helsinki, for New York, for most agencies on earth — and it is
// the same data. A build step that needs a secret is one nobody else can run,
// including whoever picks this up in a year. So the GraphQL path is GONE, not
// kept as an option — the endpoint stays in the table below only as a note of
// where the keyed route is if a city ever needs it.
//
// ATTRIBUTION TRAVELS WITH THE DATA. HSL's feed is CC BY 4.0, which makes the
// credit a licence condition and not a courtesy, so the pack carries `source`
// and `licence` and `toko-move/js/city.js` refuses to lay out one that has lost
// them.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { readZip, packFromGtfs } from './gtfs.mjs';

// Feeds that were looked up rather than remembered — each one's URL, licence
// and whether it wants a key is in toko-move/CITIES.md with its source.
const CITIES = {
  hsl: {
    name: 'Helsinki',
    gtfs: 'https://dev.hsl.fi/gtfs/hsl.zip',
    api: 'https://api.digitransit.fi/routing/v2/hsl/gtfs/v1',
    modes: ['TRAM', 'SUBWAY'],
    source: 'Helsinki Regional Transport Authority (HSL)',
    licence: 'CC BY 4.0',
  },
  nyc: {
    name: 'New York',
    // The URL the MTA developer pages give. NOT yet fetched from here — this
    // sandbox has no route to it — so treat it as looked-up rather than
    // proven, and expect the run itself to tell you if it has moved.
    gtfs: 'http://web.mta.info/developers/data/nyct/subway/google_transit.zip',
    modes: ['SUBWAY'],
    source: 'Metropolitan Transportation Authority (MTA)',
    licence: 'MTA open data terms — CHECK BEFORE SHIPPING',
  },
  // Japan's networks come through the Public Transportation Open Data Center
  // (odpt.org) rather than one agency zip, and which CITY is still open —
  // CITIES.md question 2. Left without a URL on purpose: a guessed feed that
  // half-works is worse than one that says it does not exist yet.
  nagoya: { name: 'Nagoya', modes: ['SUBWAY'], source: 'ODPT', licence: 'see odpt.org' },
  tokyo: { name: 'Tokyo', modes: ['SUBWAY'], source: 'ODPT', licence: 'see odpt.org' },
};

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);

const cityId = args.get('city') ?? 'hsl';
const city = CITIES[cityId];
const modes = (args.get('modes') ?? city?.modes?.join(',') ?? 'TRAM,SUBWAY').split(',').map(s => s.trim().toUpperCase());
const out = args.get('out') ?? `toko-move/cities/${cityId}.json`;

function die(msg) { console.error('city-pack: ' + msg); process.exit(1); }
if (!city && !args.has('gtfs')) die(`unknown city "${cityId}" — pass --gtfs <url|file>, or add it to CITIES`);

const where = args.get('gtfs') ?? city?.gtfs;
if (!where) die(`no feed known for "${cityId}" yet — pass --gtfs <url|file>. ${city?.source ? `Its data comes from ${city.source}.` : ''}`);

let zip;
if (/^https?:/.test(where)) {
  process.stderr.write(`fetching ${where} … `);
  const res = await fetch(where, { redirect: 'follow' });
  if (!res.ok) die(`${where} answered ${res.status} ${res.statusText}`);
  zip = Buffer.from(await res.arrayBuffer());
  process.stderr.write(`${(zip.length / 1048576).toFixed(1)} MB\n`);
} else {
  zip = readFileSync(where);
}

let net;
try {
  net = packFromGtfs(readZip(zip), { modes });
} catch (e) {
  die(e.message);
}

const pack = {
  id: cityId,
  name: args.get('name') ?? city?.name ?? cityId,
  source: args.get('source') ?? city?.source ?? where,
  licence: args.get('licence') ?? city?.licence ?? 'unknown — CHECK BEFORE SHIPPING',
  fetched: new Date().toISOString().slice(0, 10),
  feed: where,
  modes,
  // ~10cm, which is far past anything a diagram uses and keeps the file small
  stops: net.stops.map(s => ({ ...s, lat: round(s.lat), lon: round(s.lon) })),
  lines: net.lines,
};
function round(n) { return Math.round(n * 1e6) / 1e6; }

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(pack, null, 1) + '\n');

const kb = (Buffer.byteLength(JSON.stringify(pack)) / 1024).toFixed(0);
console.log(`${out}: ${pack.stops.length} stops, ${pack.lines.length} lines, ${modes.join('+')}, ${kb} kB`);
console.log(`source: ${pack.source} (${pack.licence}) — this credit must stay on screen`);
