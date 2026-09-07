#!/usr/bin/env node
// Build a Toko Move city pack from a real network.
//
//   node scripts/city-pack.mjs --city hsl
//   node scripts/city-pack.mjs --city nyc --modes SUBWAY
//   node scripts/city-pack.mjs --city hsl --gtfs ~/Downloads/hsl.zip     (offline)
//   node scripts/city-pack.mjs --city hsl --streets 1                    (+ roads)
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
import { readZip, packFromGtfs, simplify } from './gtfs.mjs';

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

// ── the streets, if asked ───────────────────────────────────────────────
// The tram lines want something to sit ON. Their own `path` from shapes.txt is
// the street they run down, but a map needs the ones they DON'T run down too,
// or the network floats in a void and cannot be read as a place.
//
// This is a SEPARATE licence from the timetable, and a stricter one:
// OpenStreetMap is ODbL, an extract of it is a Derivative Database, and it must
// be offered under ODbL with attribution. The pack records that per-source
// rather than for the whole file, because the timetable is CC BY and the roads
// are not.
let streets = null;
if (args.get('streets') && net.stops.length) {
  const pad = Number(args.get('pad') ?? 0.01);
  const lats = net.stops.map(s => s.lat), lons = net.stops.map(s => s.lon);
  const bbox = [
    (Math.min(...lats) - pad).toFixed(5), (Math.min(...lons) - pad).toFixed(5),
    (Math.max(...lats) + pad).toFixed(5), (Math.max(...lons) + pad).toFixed(5),
  ].join(',');

  // `out geom` returns each way's coordinates inline, so there is no second
  // round trip to resolve node ids — which for a city is a hundred thousand of
  // them. Anything smaller than a residential street is left out: a map that
  // draws every driveway is a grey rectangle.
  const KINDS = 'motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|pedestrian';
  const ql = `[out:json][timeout:180];way["highway"~"^(${KINDS})$"](${bbox});out geom;`;
  const url = args.get('overpass') ?? 'https://overpass-api.de/api/interpreter';
  process.stderr.write(`fetching streets in ${bbox} … `);
  const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(ql),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!r.ok) die(`${url} answered ${r.status} ${r.statusText}`);
  const body = await r.json();

  // four weights, so a renderer can draw a trunk road heavier than a back
  // street without knowing what any of the tags mean
  const RANK = { motorway: 3, trunk: 3, primary: 2, secondary: 2, tertiary: 1 };
  streets = [];
  for (const w of body.elements ?? []) {
    const pts = (w.geometry ?? []).map(g => [g.lat, g.lon]);
    if (pts.length < 2) continue;
    streets.push({
      rank: RANK[w.tags?.highway] ?? 0,
      pts: simplify(pts, Number(args.get('streetTol') ?? 6) / 111320).map(([a, b]) => [round(a), round(b)]),
    });
  }
  process.stderr.write(`${streets.length} ways\n`);
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
  ...(streets ? {
    streets,
    // the roads are somebody ELSE's data under somebody else's terms, so they
    // say so themselves rather than hiding inside the pack's one licence field
    streetSource: 'OpenStreetMap contributors',
    streetLicence: 'ODbL 1.0 — https://opendatacommons.org/licenses/odbl/',
  } : {}),
};
function round(n) { return Math.round(n * 1e6) / 1e6; }

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(pack, null, 1) + '\n');

const kb = (Buffer.byteLength(JSON.stringify(pack)) / 1024).toFixed(0);
console.log(`${out}: ${pack.stops.length} stops, ${pack.lines.length} lines, ${modes.join('+')}, ${kb} kB`);
console.log(`source: ${pack.source} (${pack.licence}) — this credit must stay on screen`);
if (streets) console.log(`streets: ${streets.length} ways from ${pack.streetSource} (${pack.streetLicence})`);
