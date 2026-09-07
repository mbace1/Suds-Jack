import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HELSINKI_ANCHORS, resolveHslAnchors } from '../js/helsinki-anchors.js';

const pack = JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json', import.meta.url), 'utf8'));
assert.equal(pack.source, 'Helsinki Regional Transport Authority (HSL)');
assert.equal(pack.licence, 'CC BY 4.0');
assert.equal(pack.exactGeometry, true, 'full pack declares exact source geometry');
assert.equal(pack.shapeToleranceMetres, 0, 'no geometric approximation tolerance');
assert.ok(!pack.clippedTo, 'full pack must not carry the old central-Helsinki clipping box');

const tram = pack.lines.filter(l => l.mode === 'TRAM');
const metro = pack.lines.filter(l => l.mode === 'SUBWAY');
assert.ok(tram.length >= 10, `expected Helsinki tram network, got ${tram.length}`);
assert.ok(metro.length >= 2, `expected both metro services, got ${metro.length}`);
assert.ok(pack.stops.length >= 100, `expected city-wide stop coverage, got ${pack.stops.length}`);

for (const line of pack.lines) {
  assert.ok(line.id && line.name && line.mode, 'line identity is complete');
  assert.ok(Array.isArray(line.path) && line.path.length > 1, `${line.name} has source path`);
  for (const [lat, lon] of line.path) {
    assert.ok(Number.isFinite(lat) && Number.isFinite(lon), `${line.name} path coordinates are finite`);
  }
}

const pts = pack.lines.flatMap(l => l.path);
const lats = pts.map(p => p[0]), lons = pts.map(p => p[1]);
assert.ok(Math.max(...lats) - Math.min(...lats) > 0.05, 'network spans well beyond the old central clip north/south');
assert.ok(Math.max(...lons) - Math.min(...lons) > 0.08, 'network spans well beyond the old central clip east/west');

const anchors = resolveHslAnchors(pack);
const missing = Object.entries(anchors).filter(([,stop]) => !stop).map(([id]) => `${id} (${HELSINKI_ANCHORS[id].join(' / ')})`);
assert.deepEqual(missing, [], `full feed must resolve every delivery anchor: ${missing.join(', ')}`);
for (const [id, stop] of Object.entries(anchors)) {
  assert.ok(Number.isFinite(stop.lat) && Number.isFinite(stop.lon), `${id} anchor has exact HSL coordinates`);
}

console.log(`full HSL pack: ${tram.length} tram routes, ${metro.length} metro routes, ${pack.stops.length} stops, ${Object.keys(anchors).length} delivery anchors`);
