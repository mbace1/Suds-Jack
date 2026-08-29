#!/usr/bin/env node
// Build the full Helsinki TRAM+SUBWAY pack from HSL GTFS.
// Shape tolerance is ZERO: source shape points are preserved geometrically,
// with only exactly collinear points eligible to disappear.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { readZip, packFromGtfs } from './gtfs.mjs';

const FEED = process.env.HSL_GTFS_URL || 'https://dev.hsl.fi/gtfs/hsl.zip';
const OUT = process.argv[2] || 'toko-move/cities/helsinki.json';

console.error(`fetching ${FEED}`);
const response = await fetch(FEED, { redirect: 'follow' });
if (!response.ok) throw new Error(`${FEED} answered ${response.status} ${response.statusText}`);
const zip = Buffer.from(await response.arrayBuffer());
console.error(`downloaded ${(zip.length / 1048576).toFixed(1)} MB`);

const net = packFromGtfs(readZip(zip), { modes: ['TRAM', 'SUBWAY'], shapeTol: 0 });
const finitePath = line => Array.isArray(line.path) && line.path.length > 1 && line.path.every(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
const lines = net.lines.filter(finitePath);

const pack = {
  id: 'helsinki',
  name: 'Helsinki',
  source: 'Helsinki Regional Transport Authority (HSL)',
  licence: 'CC BY 4.0',
  fetched: new Date().toISOString().slice(0, 10),
  feed: FEED,
  exactGeometry: true,
  shapeToleranceMetres: 0,
  modes: ['TRAM', 'SUBWAY'],
  stops: net.stops.map(s => ({ ...s, lat: round(s.lat), lon: round(s.lon) })),
  lines,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(pack, null, 1) + '\n');
console.log(`${OUT}: ${pack.stops.length} stops, ${pack.lines.length} lines, ${(Buffer.byteLength(JSON.stringify(pack))/1024/1024).toFixed(2)} MB`);
console.log(`source: ${pack.source} (${pack.licence})`);

function round(n) { return Math.round(n * 1e6) / 1e6; }
