#!/usr/bin/env node
/**
 * THE GROUND — import a district's real outline and write it into the repo.
 *
 *   node flow-core/tools/ground.mjs            fetch, project, clip, write
 *   node flow-core/tools/ground.mjs --dry      print what it would write
 *
 * WHY THIS EXISTS. `city.js` holds ten stops projected from real WGS84
 * positions, and nothing else — so the map draws lines over a void. The
 * targets' map is mostly LAND AND WATER, and inventing either would break the
 * one promise this board makes: that a local can check it.
 *
 * WHY IT IS A TOOL AND NOT A FETCH AT RUNTIME. This repo has no build step and
 * the games must run offline from a file server, so the output is COMMITTED
 * JavaScript. Run this when the source data changes, which is approximately
 * never — a district's coastline is not a live feed.
 *
 * THE SOURCE IS NOT SETTLED, AND THAT IS THE ONLY THING MISSING.
 *
 * What this needs is a LANDMASS — where the water starts — because the board's
 * whole south and west edge is sea and the map currently draws lines over a
 * void. OpenStreetMap's `natural=coastline` is exactly that, and Overpass is
 * BLOCKED by this environment's egress policy: `overpass-api.de` answers
 * CONNECT with 403 at the gateway, the same way `api.meshy.ai` does
 * (assets/README.md). Allow `overpass-api.de` in the environment's domains and
 * this tool is finished.
 *
 * The one reachable alternative was tried and REJECTED on inspection rather
 * than on faith. Who's On First 890537285 is Kallio's macrohood polygon, with
 * geometry from Helsinki's own city GIS — authentic, public domain, and the
 * wrong shape: it is an ADMINISTRATIVE boundary, so a point-in-polygon test
 * puts the open water south of Hakaniemi and the whole of Eläintarhanlahti
 * INSIDE it. Drawing that as land would paint the harbour as ground, which is
 * a worse map than no map. Kept here as the URL so nobody spends the afternoon
 * finding it again.
 *
 * Everything else below is done and checked: the projection is city.js's own,
 * the clip is against the real board, and the ring simplifier is fixed (see
 * the note above simplify()).
 *
 * THE PROJECTION IS NOT ITS OWN. It is imported from city.js, so the ground
 * and the stops cannot drift apart: one arithmetic, one board.
 */

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { project, KALLIO } from '../city.js?v=1';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'ground.js');

const SOURCE = {
  id: 'kallio',
  url: 'https://raw.githubusercontent.com/whosonfirst-data/whosonfirst-data-admin-fi'
     + '/master/data/890/537/285/890537285.geojson',
  note: "Who's On First 890537285 — Kallio macrohood, geometry from Helsinki city GIS",
};

// The board plus a margin. Clipping to exactly the stops' extent would cut the
// shore off at the last stop; a margin lets the land run off the edge of the
// sheet the way a real district does.
const PAD = 14;

// ── clipping: Sutherland–Hodgman against one half-plane at a time ──
const clipHalf = (poly, keep, cut) => {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ka = keep(a), kb = keep(b);
    if (ka) out.push(a);
    if (ka !== kb) out.push(cut(a, b));
  }
  return out;
};
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

function clipRect(poly, x0, y0, x1, y1) {
  let p = poly;
  p = clipHalf(p, v => v.x >= x0, (a, b) => lerp(a, b, (x0 - a.x) / (b.x - a.x)));
  p = clipHalf(p, v => v.x <= x1, (a, b) => lerp(a, b, (x1 - a.x) / (b.x - a.x)));
  p = clipHalf(p, v => v.y >= y0, (a, b) => lerp(a, b, (y0 - a.y) / (b.y - a.y)));
  p = clipHalf(p, v => v.y <= y1, (a, b) => lerp(a, b, (y1 - a.y) / (b.y - a.y)));
  return p;
}

// ── simplify: Douglas–Peucker, so the committed file is a shape and not a
//    transcript. A tenth of a design unit is one metre on this board.
//
// A CLOSED RING CANNOT BE FED TO DP DIRECTLY. Wrapping it so the first point
// repeats at the end makes the baseline segment zero-length, every distance is
// measured against nothing, and the whole coastline simplifies to a single
// point — which is exactly what happened the first time. So the ring is split
// at its two most distant points and each half simplified as an open chain.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  let far = 0, dmax = 0;
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i].x - a.x) * dy - (pts[i].y - a.y) * dx) / len;
    if (d > dmax) { dmax = d; far = i; }
  }
  if (dmax <= tol) return [a, b];
  return [...simplify(pts.slice(0, far + 1), tol).slice(0, -1),
    ...simplify(pts.slice(far), tol)];
}

const dry = process.argv.includes('--dry');

const geo = await (await fetch(SOURCE.url)).json();
if (geo.geometry?.type !== 'Polygon') throw new Error(`expected a Polygon, got ${geo.geometry?.type}`);

// the same projection the stops use, imported rather than repeated
const ring = geo.geometry.coordinates[0].map(([lon, lat]) => project(lon, lat));

const xs = KALLIO.nodes.map(n => n.x), ys = KALLIO.nodes.map(n => n.y);
const box = {
  x0: Math.min(...xs) - PAD, x1: Math.max(...xs) + PAD,
  y0: Math.min(...ys) - PAD, y1: Math.max(...ys) + PAD,
};

function simplifyRing(pts, tol) {
  if (pts.length < 4) return pts;
  let far = 0, dmax = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[0].x, pts[i].y - pts[0].y);
    if (d > dmax) { dmax = d; far = i; }
  }
  const a = simplify(pts.slice(0, far + 1), tol);
  const b = simplify([...pts.slice(far), pts[0]], tol);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

const clipped = clipRect(ring, box.x0, box.y0, box.x1, box.y1);
const land = simplifyRing(clipped, 0.2)
  .map(p => [+p.x.toFixed(1), +p.y.toFixed(1)]);

const body = `// THE GROUND — generated by flow-core/tools/ground.mjs. Do not hand-edit.
//
// ${SOURCE.note}
// Projected with city.js's own projection, clipped to the board plus ${PAD}
// units of margin, and simplified to 0.2 units (~2 m). Committed rather than
// fetched because this repo has no build step and the games run offline.
//
// \`land\` is a closed ring in design units. Everything outside it is water.
// A product decides whether to draw either — see \`theme.relief\`.

export const GROUND = {
  ${SOURCE.id}: {
    source: ${JSON.stringify(SOURCE.url)},
    box: ${JSON.stringify(box)},
    land: [
${land.map(p => `      [${p[0]}, ${p[1]}],`).join('\n')}
    ],
  },
};
`;

console.log(`${SOURCE.id}: ${ring.length} source points → ${clipped.length} clipped → ${land.length} kept`);
console.log(`board box: x ${box.x0.toFixed(0)}…${box.x1.toFixed(0)}  y ${box.y0.toFixed(0)}…${box.y1.toFixed(0)}`);
if (dry) { console.log('--dry: nothing written'); process.exit(0); }
await writeFile(OUT, body);
console.log(`→ ${path.relative(process.cwd(), OUT)}  ${(body.length / 1024).toFixed(1)} KB`);
