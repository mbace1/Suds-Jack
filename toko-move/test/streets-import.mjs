// The street importer's gate. It runs with no network, which is the whole
// difficulty: the tool's job is to turn an Overpass response into a street pack,
// and Overpass is refused by this environment's egress policy.
//
// So the response is SYNTHESISED from the committed centre extract — every way
// in that pack turned back into the `out geom` element it came from — and put
// through the importer. That proves the parser, the tiering, the rounding and
// the emitter on 5652 real ways of real Helsinki geometry. What it cannot prove
// is that Overpass returns what we think it returns; that is what `--check`
// against the committed extract is for on the day someone runs it for real.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { overpassQuery, packFromOverpass, check, BOARD, BBOX, TIERS } from '../scripts/streets-import.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const centre = JSON.parse(readFileSync(join(here, '../cities/ground/helsinki-streets.json'), 'utf8'));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

// ---- the query names the board and every class the game tiers -------------
{
  const q = overpassQuery();
  ok(q.includes('[out:json]') && q.includes('out geom;'), 'the query asks for JSON with full way geometry');
  ok(/60\.14\d+,24\.89\d+,60\.22\d+,24\.98\d+/.test(q), 'the query carries the board bbox in Overpass order (s,w,n,e)');
  for (const cls of Object.keys(TIERS)) ok(q.includes(cls), `the query asks for ${cls}`);
  // the bbox has to be BIGGER than the board or streets stop on the frame
  ok(BBOX.s < BOARD.s && BBOX.n > BOARD.n && BBOX.w < BOARD.w && BBOX.e > BOARD.e,
    'the query box has a margin around the board');
}

// ---- the importer, on real geometry ---------------------------------------
const asOverpass = pack => ({
  elements: pack.roads.map((r, i) => ({
    type: 'way', id: 1000 + i,
    tags: { highway: r.class, ...(r.name ? { name: r.name } : {}) },
    geometry: r.shape.map(([lat, lon]) => ({ lat, lon })),
  })),
});
{
  const built = packFromOverpass(asOverpass(centre), centre.boundingBox);
  ok(built.roads.length === centre.roads.length, `every way survives the round trip (${built.roads.length}/${centre.roads.length})`);
  const pts = a => a.roads.reduce((n, r) => n + r.points, 0);
  ok(pts(built) === pts(centre), 'and every point of every way');
  for (const r of built.roads) {
    ok(r.tier === TIERS[r.class], `${r.class} is tiered as ${TIERS[r.class]}`);
    ok(r.points === r.shape.length, 'the declared point count matches the geometry');
  }
  // provenance is carried, not asserted by the reader
  ok(/ODbL/.test(built.source.licence) && /OpenStreetMap/.test(built.source.attribution), 'the pack credits OSM under ODbL');
  ok(built.source.query.includes('out geom'), 'and records the query that produced it');
  ok(built.coordinateSystem === centre.coordinateSystem, 'same coordinate system as the pack it replaces');
}
// things that are not streets are dropped rather than mis-tiered
{
  const junk = { elements: [
    { type: 'way', id: 1, tags: { highway: 'footway' }, geometry: [{ lat: 60.18, lon: 24.94 }, { lat: 60.181, lon: 24.941 }] },
    { type: 'way', id: 2, tags: { highway: 'primary' }, geometry: [{ lat: 60.18, lon: 24.94 }] },              // one point
    { type: 'node', id: 3, lat: 60.18, lon: 24.94 },
    { type: 'way', id: 4, tags: { highway: 'primary_link' }, geometry: [{ lat: 60.18, lon: 24.94 }, { lat: 60.181, lon: 24.941 }] },
  ] };
  const built = packFromOverpass(junk);
  ok(built.roads.length === 1, 'a footway, a one-point way and a node are all skipped');
  ok(built.roads[0].class === 'primary' && built.roads[0].tier === 'major', 'and primary_link folds into primary');
  ok(built._skipped === 3, 'and the skipped count is reported rather than hidden');
}

// ---- the check catches the thing this whole exercise is about --------------
{
  const centreBuilt = packFromOverpass(asOverpass(centre), centre.boundingBox);
  const rows = check(centreBuilt, centre);
  const failed = rows.filter(([k]) => k === 'FAIL').map(([, m]) => m);
  ok(failed.length === 1, 'a centre-only pack fails exactly one check');
  ok(/does NOT cover the board/.test(failed[0]), 'and it is the coverage one — which is the open problem');
  ok(rows.some(([k, m]) => k === 'ok' && /keeps 100\.0% of the/.test(m)), 'while agreeing completely with itself on named streets');

  // And the overlap check has teeth. It counts DISTINCT NAMES, not ways, which
  // is deliberate: an import that returns whole ways instead of fragments has
  // far fewer roads for the same city and must not fail for it. So the test
  // deletes streets rather than fragments — every way of a tenth of the names —
  // which is the failure that matters: a street that stops existing.
  const allNames = [...new Set(centreBuilt.roads.filter(r => r.name).map(r => r.name))];
  const gone = new Set(allNames.filter((_, i) => i % 10 === 0));
  const thinned = { ...centreBuilt, roads: centreBuilt.roads.filter(r => !gone.has(r.name)) };
  const bad = check(thinned, centre).filter(([k]) => k === 'FAIL').map(([, m]) => m);
  ok(bad.some(m => /lost \d+ of \d+ named streets/.test(m)), `an import that loses ${gone.size} whole streets is caught`);
  // ...and MERGING does not fail it, which is the case that made the threshold
  // worth thinking about: a real `out geom` import returns whole ways, so it has
  // far fewer roads than this fragmented pack for exactly the same city. The
  // extreme of that — one way per street name — must pass.
  const seenName = new Set();
  const merged = { ...centreBuilt, roads: centreBuilt.roads.filter(r => {
    if (!r.name) return false;
    if (seenName.has(r.name)) return false;
    seenName.add(r.name); return true;
  }) };
  ok(merged.roads.length < centreBuilt.roads.length / 5, `merging leaves ${merged.roads.length} ways from ${centreBuilt.roads.length}`);
  ok(!check(merged, centre).some(([k, m]) => k === 'FAIL' && /named streets/.test(m)),
    'and an import of whole ways rather than fragments passes the overlap check');
}

// ---- what is actually missing, stated as a number -------------------------
{
  const M = 111320, kx = Math.cos(((BOARD.n + BOARD.s) / 2) * Math.PI / 180);
  const km2 = b => ((b.n - b.s) * M / 1000) * ((b.e - b.w) * M * kx / 1000);
  const share = km2(centre.boundingBox) / km2(BOARD);
  ok(share < 0.3, `the committed extract is ${(share * 100).toFixed(0)}% of the board — this is the gap the importer exists to close`);
}

console.log(`toko-move street importer gate: ${checks} checks passed — ` +
            `round-tripped ${centre.roads.length} real ways, and the coverage check fails on the pack we ship (correctly)`);
