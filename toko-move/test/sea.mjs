// THE SEA (v3.8, js/sea.js) in bare node. The board used to stroke the
// coastline; it fills a sea solved from it now, and a solved sea is only a sign
// error from coming out inside-out — which on screen looks like a lake district
// rather than like a bug. So this asks geography, not geometry: the harbours
// are water, the squares are land, an island in the sea is land, and no stop
// the game rides to stands in the water.
//
//   node toko-move/test/sea.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { seaRings, isSea } from '../js/sea.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const read = f => JSON.parse(fs.readFileSync(new URL(f, import.meta.url), 'utf8'));
const water = read('../cities/ground/helsinki-water.json'), pack = read('../cities/helsinki.json');
const sea = seaRings(water);

ok(sea.sea.length >= 1 && sea.sea.length <= 6, `${sea.sea.length} sea polygon(s) from the open coastline`);
ok(sea.islands.length >= 40, `${sea.islands.length} closed rings (islands) cut out of it`);
// read off the solved render (positions checked against the drawn coast)
const SEA = { 'the South Harbour': [60.1655, 24.9560], 'the open sea south of Kaivopuisto': [60.150, 24.950], 'Töölönlahti': [60.1809, 24.934], 'Eläintarhanlahti': [60.1791, 24.9443] };
const LAND = { Senaatintori: [60.1693, 24.9522], Kamppi: [60.1685, 24.9312], Pasila: [60.1987, 24.9334], Kallio: [60.1840, 24.9500], Katajanokka: [60.1672, 24.9665],
  Kaivopuisto: [60.1571, 24.9566], Kaartinkaupunki: [60.1640, 24.9470], 'Korkeasaari, an island': [60.1757, 24.9843] };
for (const [k, [lat, lon]] of Object.entries(SEA)) ok(isSea(sea, lat, lon, water.areas), `${k} is water`);
for (const [k, [lat, lon]] of Object.entries(LAND)) ok(!isSea(sea, lat, lon, water.areas), `${k} is land`);
// every stop inside the extract stands on land (a pier stop may sit on the line itself)
const bb = water.boundingBox, inBox = s => s.lat > bb.s && s.lat < bb.n && s.lon > bb.w && s.lon < bb.e;
const stops = pack.stops.map(s => ({ lat: s.lat ?? s.at?.[0], lon: s.lon ?? s.at?.[1], name: s.name })).filter(s => Number.isFinite(s.lat) && inBox(s));
const wet = stops.filter(s => isSea(sea, s.lat, s.lon, []));
ok(stops.length > 100 && wet.length / stops.length < 0.02, `${stops.length - wet.length} of ${stops.length} stops on land${wet.length ? ' (in the water: ' + wet.map(s => s.name).join(', ') + ')' : ''}`);
// the share of the extract that is sea: Helsinki's centre is a peninsula, so
// well short of half, and well above nothing
let w = 0, all = 0; for (let la = bb.s + 0.001; la < bb.n; la += 0.0025) for (let lo = bb.w + 0.001; lo < bb.e; lo += 0.005) { all++; if (isSea(sea, la, lo, water.areas)) w++; }
ok(w / all > 0.12 && w / all < 0.45, `sea is ${(100 * w / all).toFixed(0)}% of the extract`);
// a water pack with no coastline is no sea, not a crash
ok(seaRings({ edges: [] }).sea.length === 0, 'no coastline, no sea');
console.log(`sea: ${n} checks passed`);
