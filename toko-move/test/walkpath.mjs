// The walk follows the street (v2.55). Bare node, against the committed OSM
// extract: a walk inside the extract is drawn along real streets, one outside
// it stays the straight line it always was, and the figure moves along the
// path by distance walked.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as W from '../js/walkpath.js';
import { walkLinks } from '../js/hubs-walking.js';
import { resolveHslAnchors } from '../js/helsinki-anchors.js';

const here = dirname(fileURLToPath(import.meta.url));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const res = (a => a.resolved || a)(resolveHslAnchors(JSON.parse(readFileSync(join(here, '../cities/helsinki.json'), 'utf8'))));
const roads = JSON.parse(readFileSync(join(here, '../cities/ground/helsinki-streets.json'), 'utf8')).roads;
const g = W.buildGraph(roads);

// The junction pass is what makes the extract a network at all.
{ const big = Math.max(...g.size);
  ok(big > 3500, `the centre is one network after junctions are joined (largest piece ${big} of ${g.pts.length} points)`); }

const paths = walkLinks().map(l => ({ l, a: res[l.from], b: res[l.to] })).filter(x => x.a && x.b)
  .map(x => ({ ...x, line: W.walkPath(g, x.a, x.b, x.l.street) }));
const along = paths.filter(x => x.line);
ok(along.length >= 7, `walks inside the extract follow streets (${along.length} of ${paths.length}: ${along.map(x => `${x.l.from}→${x.l.to}`).join(', ')})`);

for (const { l, a, b, line } of along) {
  const straight = W.metres([a.lat, a.lon], [b.lat, b.lon]), len = W.length(line);
  ok(line.length > 2 && len >= straight * 0.999 && len <= W.DETOUR * straight,
    `${l.from}→${l.to} bends along the street and is no detour (${Math.round(len)} m against ${Math.round(straight)} m straight)`);
  ok(line[0][0] === a.lat && line[line.length - 1][0] === b.lat, `${l.from}→${l.to} starts at one stop and ends at the other`);
  // every leg of the drawn path is a street segment or a short junction join,
  // never a jump across a block
  let worst = 0; for (let i = 2; i < line.length - 1; i++) worst = Math.max(worst, W.metres(line[i - 1], line[i]));
  ok(worst < 400, `${l.from}→${l.to} has no leg longer than a street segment (longest ${Math.round(worst)} m)`);
}

// Outside the extract (its box is 60.17–60.20 / 24.93–24.98) there is nothing
// to follow, and the walk is refused rather than invented.
{ const out = paths.find(x => x.l.from === 'hietalahti' && x.l.to === 'lansiterminaali');
  ok(out && out.line === null, 'Tyynenmerenkatu, outside the street extract, stays a straight walk'); }

// Moving along it.
{ const line = along[0].line, a = W.pointAlong(line, 0), z = W.pointAlong(line, 1), m = W.pointAlong(line, 0.5);
  ok(a.lat === line[0][0] && z.lat === line[line.length - 1][0], 'the figure starts at the first stop and ends at the second');
  const d1 = W.metres(line[0], [m.lat, m.lon]), d2 = W.metres([m.lat, m.lon], line[line.length - 1]);
  ok(Number.isFinite(d1) && d1 > 0 && d2 > 0, 'half way is somewhere between them');
  const run = []; for (let f = 0; f <= 1.0001; f += 0.1) run.push(W.pointAlong(line, f));
  let jump = 0; for (let i = 1; i < run.length; i++) jump = Math.max(jump, W.metres([run[i - 1].lat, run[i - 1].lon], [run[i].lat, run[i].lon]));
  ok(jump <= W.length(line) * 0.1 + 1, `and no tenth of the walk jumps further than a tenth of it (${Math.round(jump)} m)`); }

// The named street is preferred.
{ const x = along.find(p => p.l.street === 'Hämeentie');
  if (x) { const other = W.walkPath(g, x.a, x.b, 'no such street');
    ok(other && W.length(x.line) <= W.length(other) * W.DETOUR, 'naming the street never costs more than a detour'); } }

console.log(`walkpath: ${checks} checks passed`);
