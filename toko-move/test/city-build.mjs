// The city layer is DATA, and this proves two things about that claim.
//
// 1. Generalising cost Helsinki nothing. The graph built from
//    cities/helsinki.city.js through js/city-build.js is compared against a
//    frozen fingerprint of the graph the hand-written v2.11 builder produced —
//    every node's id, name, tags, capacity and projected position, and every
//    edge's endpoints, mode and time. A refactor that silently moves a stop or
//    retimes a leg fails here rather than in someone's shift.
//
// 2. A SECOND city is a definition, not a rewrite. A different definition over
//    the same pack — different anchors, different names, its own walk links and
//    its own speeds — builds a different working board. That is the whole bet
//    chapter 2 rests on, so it is tested rather than asserted in a document.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildCity, resolveAnchors, metresBetween } from '../js/city-build.js';
import { HELSINKI } from '../cities/helsinki.city.js';
import { buildRealHelsinki } from '../js/real-helsinki.js';

const here = dirname(fileURLToPath(import.meta.url));
const pack = JSON.parse(readFileSync(join(here, '../cities/helsinki.json'), 'utf8'));

// ---- 1. Helsinki is unchanged by the generalisation --------------------
const city = buildRealHelsinki(pack);
assert.equal(city.nodes.length, 22, 'Helsinki still has 22 delivery anchors');
assert.equal(city.city.id, 'helsinki');
assert.equal(city.city.chapter, 1);

// The fingerprint. Rounded to 0.01 of a projection unit (a centimetre at this
// scale) so it pins real movement without breaking on float noise.
const fingerprint = c => [
  ...c.nodes.map(n => `N ${n.id} ${n.name} [${n.tags.join('|')}] c${n.capacity} @${n.x.toFixed(2)},${n.y.toFixed(2)}`).sort(),
  ...c.edges.map(e => `E ${[e.a, e.b].sort().join('-')} ${e.mode} t${e.time} c${e.capacity}`).sort(),
  ...c.lines.map(l => `L ${l.label} ${l.mode} ${l.nodes.join('>')}`).sort(),
].join('\n');

const FROZEN = readFileSync(join(here, 'helsinki-graph.fingerprint'), 'utf8').trim();
const now = fingerprint(city).trim();
if (now !== FROZEN) {
  const a = FROZEN.split('\n'), b = now.split('\n');
  const gone = a.filter(x => !b.includes(x)).slice(0, 3);
  const added = b.filter(x => !a.includes(x)).slice(0, 3);
  assert.fail(`the Helsinki graph moved.\n  no longer present: ${gone.join(' / ') || '(none)'}\n  newly present:     ${added.join(' / ') || '(none)'}`);
}

// every anchor still resolves to a real stop with real coordinates
for (const n of city.nodes) {
  assert.ok(Number.isFinite(n.lat) && Number.isFinite(n.lon), `${n.id} has no coordinates`);
  assert.ok(n.hslStopId, `${n.id} lost its source stop identity`);
}
assert.equal(city.source.exactGeometry, true, 'the pack still declares exact geometry');

// ---- 2. a second definition builds a different, working board ----------
// Deliberately NOT Nagoya: inventing a Nagoya board without Nagoya's feed is
// exactly the approximation TRANSIT_LAYERS.md forbids. This is a throwaway
// definition over the SAME real pack, and it exists only to prove the builder
// takes its city from the definition rather than from Helsinki hardcoded.
const OTHER = {
  id: 'testbed', name: 'Testbed', chapter: 99,
  modes: { SUBWAY: 'metro', TRAM: 'tram' },
  speedKmh: { metro: 60, tram: 30 },
  edgeCapacity: { metro: 99, tram: 77 },
  carriers: { metro: { count: 7, seats: 100 }, tram: { count: 5, seats: 50 } },
  anchors: {
    north: { aliases: ['Käpylänaukio'], name: 'North', tags: ['home'], capacity: 11 },
    middle: { aliases: ['Rautatientori'], name: 'Middle', tags: ['work'], capacity: 12 },
    south: { aliases: ['Eiran sairaala'], name: 'South', tags: ['shop'], capacity: 13 },
    east: { aliases: ['Kalasatama'], name: 'East', tags: ['transfer'], capacity: 14 },
  },
  walk: [['north', 'middle'], ['middle', 'south'], ['middle', 'east']],
};
const other = buildCity(pack, OTHER);
assert.equal(other.nodes.length, 4, 'the second city has its own anchors');
assert.equal(other.city.name, 'Testbed');
assert.equal(other.city.chapter, 99);
assert.deepEqual(other.nodes.map(n => n.name).sort(), ['East', 'Middle', 'North', 'South']);
for (const n of other.nodes) assert.ok(!city.nodes.some(h => h.id === n.id), `${n.id} leaked from Helsinki`);
// its own speeds and capacities are honoured, not Helsinki's
const otherMetro = other.edges.filter(e => e.mode === 'metro');
assert.ok(otherMetro.length >= 1, 'the second city has metro links');
assert.ok(otherMetro.every(e => e.capacity === 99), 'per-city edge capacity is used');
assert.ok(other.lines.some(l => l.mode === 'metro' && l.carriers === 7), 'per-city carrier counts are used');
// walking is the definition's, not Helsinki's
const walks = other.edges.filter(e => e.mode === 'walk');
assert.equal(walks.length, 3, 'the second city walks only where its definition says');

// ---- the failure modes a definition can have, caught at build time -----
assert.throws(() => buildCity(pack, { ...OTHER, anchors: { nowhere: { aliases: ['Ei ole olemassa xyzzy'], name: 'Nowhere' } } }),
  /misses delivery anchors/, 'an anchor that resolves to nothing must fail the build');
assert.throws(() => buildCity(pack, { ...OTHER, walk: [['north', 'atlantis']] }),
  /unknown anchor/, 'a walk link to a place that is not on the board must fail the build');
assert.throws(() => buildCity(pack, { ...OTHER, modes: { FUNICULAR: 'funicular' } }),
  /No funicular service/, 'a declared mode with no service through the board must fail the build');

// ---- the shared helpers behave -----------------------------------------
const r = resolveAnchors(pack, HELSINKI.anchors);
assert.equal(Object.values(r).filter(Boolean).length, 22, 'every Helsinki anchor resolves');
const d = metresBetween({ lat: 60.1699, lon: 24.9384 }, { lat: 60.1841, lon: 24.9299 });
assert.ok(d > 1400 && d < 1800, `Rautatientori->Töölöntori should be about 1.6km, got ${Math.round(d)}m`);

console.log(`city build: Helsinki ${city.nodes.length} anchors / ${city.edges.length} edges / ${city.lines.length} services, ` +
            `fingerprint holds; a second definition builds ${other.nodes.length} anchors with its own rules`);
