// The ground's gate: the real water, streets and place names under the network.
// Bare node. Everything here is a property of the committed packs or of a pure
// function over them, which is why it runs on every edit.
//
// What it is really holding: that the three packs still carry the provenance
// they were fetched with. A map whose shapes came from somewhere it cannot name
// is a drawing, and ODbL and CC BY are conditions of use rather than courtesies.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Ground, STREET_TIERS } from '../js/ground.js';
import { landmarkPoints, LANDMARK_FORMS } from '../js/landmarks.js';
import { boardBox } from '../js/board.js';
import { resolveHslAnchors } from '../js/helsinki-anchors.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = f => JSON.parse(readFileSync(join(here, '../cities/ground/', f), 'utf8'));
const water = read('helsinki-water.json'), streets = read('helsinki-streets-centre.json'), districts = read('helsinki-districts.json'), landmarks = read('helsinki-landmarks.json');
const ground = new Ground({ water, streets, districts, landmarks });
const box = boardBox(resolveHslAnchors(JSON.parse(readFileSync(join(here, '../cities/helsinki.json'), 'utf8'))));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

// ---- provenance, on every pack -----------------------------------------
for (const [name, pack] of [['water', water], ['streets', streets], ['districts', districts], ['landmarks', landmarks]]) {
  ok(pack.source, `${name} pack states a source`);
  ok(pack.source.licence || pack.source.dataset, `${name} pack states a licence or a dataset`);
  if (name !== 'landmarks') ok(pack.boundingBox, `${name} pack states the extent it covers`);
  ok(typeof pack.coordinateSystem === 'string' && pack.coordinateSystem.length, `${name} pack states its coordinate system`);
}
ok(/ODbL/.test(water.source.licence) && /OpenStreetMap/.test(water.source.attribution), 'water is OSM under ODbL');
ok(/ODbL/.test(streets.source.licence) && /OpenStreetMap/.test(streets.source.attribution), 'streets are OSM under ODbL');
// the credit that actually reaches the screen names both, and the street extent
const credit = ground.credit();
for (const must of ['OpenStreetMap', 'ODbL', 'City of Helsinki', 'centre extract'])
  ok(credit.includes(must), `the on-screen credit names ${must}`);

// ---- water covers the board, which is the whole point of replacing it ----
{
  const b = water.boundingBox;
  const covers = (box.n - Math.max(box.s, b.s)) / (box.n - box.s);
  ok(b.n - b.s > 0.06, 'the water pack spans the board, not one district');
  ok(covers > 0.9, `water covers ${(covers * 100).toFixed(0)}% of the board's latitude span`);
  ok(water.areas.length > 80 && water.edges.length > 100, 'water carries both fillable bodies and open coastline');
  // areas are closed rings and edges are OPEN lines — the coastline rule from
  // TRANSIT_LAYERS.md's sibling: an OSM coastline is directed and open, and
  // closing it invents land.
  for (const a of water.areas.slice(0, 20)) ok(a.shape.length >= 3, 'a water area is a real ring');
}

// ---- streets: a hierarchy, and honest about where it stops ---------------
{
  ok(streets.roads.length > 4000, 'the street pack is a real extract, not a sample');
  const tiers = new Set(streets.roads.map(r => r.tier));
  for (const t of ['major', 'mid', 'minor']) ok(tiers.has(t), `streets carry a ${t} tier`);
  ok(STREET_TIERS.city.length < STREET_TIERS.route.length && STREET_TIERS.route.length < STREET_TIERS.stop.length,
    'each scale in adds a tier — a street map is a hierarchy, not a layer');
  ok(ground.streetsFor('city').length < ground.streetsFor('stop').length, 'and the counts follow the tiers');
  // service roads and yard tracks are not streets a courier reads
  const drawn = [...ground.byTier.major, ...ground.byTier.mid, ...ground.byTier.minor];
  ok(!drawn.some(r => r.class === 'service' || r.class === 'track'), 'parking aisles and yard tracks are not drawn');
  ok(streets.roads.some(r => r.class === 'service'), 'and the pack really does contain them — the filter is doing work');
  ok(drawn.length > 3000, 'what is left is still a street network');
  const ring = r => { const s = r.shape; return s.length > 2 && s[0][0] === s.at(-1)[0] && s[0][1] === s.at(-1)[1]; };
  ok(!drawn.some(r => r.class === 'pedestrian' && ring(r)), 'squares mapped as closed ways are not stroked as streets');
  ok(streets.roads.filter(r => r.class === 'pedestrian' && ring(r)).length > 100, 'and the pack really is full of them');
  // the centre-only limit, held as a fact rather than a comment
  const b = streets.boundingBox;
  ok(ground.hasStreets((b.s + b.n) / 2, (b.w + b.e) / 2), 'the extract covers its own middle');
  ok(!ground.hasStreets(box.s + 0.001, (b.w + b.e) / 2), 'and does NOT cover the south end of the board');
  ok((b.n - b.s) < (box.n - box.s) * 0.6, 'which is why the schematic corridors are still needed outside it');
}

// ---- districts: real names, ordered by how big the quarter is -----------
{
  ok(districts.districts.length >= 40, 'forty-one sub-districts, not nine typed by hand');
  for (const d of districts.districts) {
    ok(typeof d.name === 'string' && d.name.length, 'every district is named');
    ok(Array.isArray(d.at) && d.at.length === 2, `${d.name} has a label point`);
    ok(d.at[0] > 59 && d.at[0] < 61 && d.at[1] > 24 && d.at[1] < 26, `${d.name} is in Helsinki`);
  }
  const wide = ground.districtsFor('city'), close = ground.districtsFor('stop');
  ok(wide.length < close.length, 'the city view keeps only the big quarters');
  ok(wide[0].areaRank >= wide.at(-1).areaRank, 'and keeps them biggest-first');
  const names = new Set(districts.districts.map(d => d.name));
  for (const n of ['Kluuvi', 'Kallio' in {} ? 'Kallio' : 'Torkkelinmäki', 'Punavuori', 'Katajanokka', 'Käpylä'])
    ok(names.has(n), `the pack names ${n}`);
}

// ---- landmarks are SYMBOLS, and the pack has to say so -------------------
{
  const src = landmarks.source;
  ok(/NOT survey data/i.test(src.dataset) || /NOT/i.test(src.isNot), 'the landmark pack says what it is not');
  ok(/not building footprints/i.test(src.isNot), 'and says plainly that these are not footprints');
  ok(/offset/i.test(src.method), 'and states how a position is arrived at');
  ok(!/OpenStreetMap/i.test(src.attribution), 'and does NOT credit OpenStreetMap for an authored position');
  // the credit line separates them from the source layers for the same reason
  ok(/landmarks: map symbols/i.test(credit), 'the on-screen credit calls the landmarks what they are');

  const resolved = JSON.parse(readFileSync(join(here, '../cities/helsinki.json'), 'utf8'));
  const anchors = resolveHslAnchors(resolved);
  const pts = landmarkPoints(landmarks, anchors);
  ok(pts.length === landmarks.landmarks.length, 'every landmark resolves against a real stop');
  for (const l of landmarks.landmarks) {
    ok(anchors[l.anchor], `${l.id} names a stop that exists (${l.anchor})`);
    ok(LANDMARK_FORMS[l.kind], `${l.id} names a form that can be drawn (${l.kind})`);
    ok(Math.abs(l.offset.n) <= 400 && Math.abs(l.offset.e) <= 400,
      `${l.id} sits within 400 m of its anchor — a symbol that wanders is a wrong symbol`);
  }
  // and the offsets actually move them: a landmark on top of its stop dot is
  // indistinguishable from the dot
  for (const p of pts) {
    const a = anchors[p.anchor];
    const moved = Math.hypot((p.lat - a.lat), (p.lon - a.lon)) > 0;
    ok(p.offset.n === 0 && p.offset.e === 0 ? !moved : moved, `${p.id} is placed where its offset says`);
  }
  ok(landmarks.landmarks.some(l => l.pale), 'the white church is marked pale — it is the one that is white');
  ok(landmarks.landmarks.filter(l => l.pale).length === 1, 'and it is the ONLY one, or pale stops meaning anything');
}

// ---- a missing pack must not take the map down --------------------------
{
  const empty = new Ground({ water: null, streets: null, districts: null, landmarks: null });
  ok(empty.streetsFor('stop').length === 0 && empty.districtsFor('city').length === 0, 'an absent pack is empty, not a crash');
  ok(empty.hasStreets(60.18, 24.95) === false, 'and reports no street coverage rather than pretending');
  ok(empty.credit() === '', 'and claims no attribution it cannot support');
}

console.log(`toko-move ground gate: ${checks} checks passed — ${water.areas.length} water areas, ` +
            `${streets.roads.length} streets in 3 tiers, ${districts.districts.length} districts, ` +
            `${landmarks.landmarks.length} landmarks`);
