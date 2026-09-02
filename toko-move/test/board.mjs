// The board's gate: the viewport, the line ink and the drawn streets.
// Bare node — no browser, no GPU. Everything here is a property of the data or
// of a pure function, which is the only reason it can run on every edit.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveHslAnchors, HELSINKI_ANCHORS } from '../js/helsinki-anchors.js';
import { boardBox, boxToAspect, boardFit, lineFamily, lineColour, tramInk, METRO_INK, ROAD_INK, MAIN_ROADS, roadPaths, BOARD_MARGIN } from '../js/board.js';

const here = dirname(fileURLToPath(import.meta.url));
const pack = JSON.parse(readFileSync(join(here, '../cities/helsinki.json'), 'utf8'));
const resolved = resolveHslAnchors(pack);
const box = boardBox(resolved);

// ---- the box holds every place the game can send you --------------------
const anchors = Object.entries(resolved).filter(([, s]) => s);
assert.ok(anchors.length >= 22, `expected at least 22 resolved anchors, got ${anchors.length}`);
for (const [id, stop] of anchors) {
  assert.ok(stop.lat > box.s && stop.lat < box.n && stop.lon > box.w && stop.lon < box.e,
    `anchor ${id} falls outside the board box`);
}

// ...and holds them with room to spare, so no stop is drawn onto the frame
// itself. Half the declared margin is the floor: a label needs somewhere to go.
const latPad = (box.n - box.s) * BOARD_MARGIN * 0.5 / (1 + 2 * BOARD_MARGIN);
const lonPad = (box.e - box.w) * BOARD_MARGIN * 0.5 / (1 + 2 * BOARD_MARGIN);
for (const [id, stop] of anchors) {
  assert.ok(stop.lat - box.s > latPad * 0.9 && box.n - stop.lat > latPad * 0.9, `anchor ${id} sits on the board's top/bottom frame`);
  assert.ok(stop.lon - box.w > lonPad * 0.9 && box.e - stop.lon > lonPad * 0.9, `anchor ${id} sits on the board's left/right frame`);
}

// ---- the box is genuinely a crop, which is the whole point ---------------
let S = 90, N = -90, W = 180, E = -180;
for (const s of pack.stops) { S = Math.min(S, s.lat); N = Math.max(N, s.lat); W = Math.min(W, s.lon); E = Math.max(E, s.lon); }
const share = ((box.n - box.s) * (box.e - box.w)) / ((N - S) * (E - W));
assert.ok(share < 0.30, `board should be a crop of the pack, but covers ${(share * 100).toFixed(1)}%`);
assert.ok(share > 0.02, `board has collapsed to ${(share * 100).toFixed(1)}% of the pack`);

// ---- the aspect fit only ever GROWS, never hides a stop ------------------
for (const [w, h] of [[1280, 400], [400, 1280], [900, 900], [468, 802]]) {
  const grown = boxToAspect(box, w, h);
  assert.ok(grown.s <= box.s + 1e-12 && grown.n >= box.n - 1e-12 &&
            grown.w <= box.w + 1e-12 && grown.e >= box.e - 1e-12,
    `boxToAspect cropped the board at ${w}x${h} — a cropped board can hide a stop you deliver to`);
  const kx = Math.cos(((grown.n + grown.s) * 0.5) * Math.PI / 180);
  const got = ((grown.e - grown.w) * kx) / (grown.n - grown.s);
  assert.ok(Math.abs(got - w / h) < 1e-6, `boxToAspect missed the ${w}x${h} aspect (got ${got.toFixed(4)})`);
}

// the projection puts north above south and east right of west — three of the
// five channel shapes in sudsjack once ran mirrored, and nothing caught it
const fit = boardFit(box, 468, 802);
const nw = fit(box.n, box.w), se = fit(box.s, box.e);
assert.ok(se.x > nw.x, 'projection is mirrored east/west');
assert.ok(se.y > nw.y, 'projection is flipped north/south');

// ---- every service on the board has ink, and the ink is distinguishable --
const families = [...new Set(pack.lines.filter(l => l.mode === 'TRAM').map(l => lineFamily(l.name)))];
const ink = tramInk();
for (const f of families) assert.ok(ink[f], `tram family ${f} has no colour — it would fall back to grey`);
assert.equal(lineFamily('10B'), '10');
assert.equal(lineFamily('9N'), '9');
assert.equal(lineFamily('M1B'), 'M1');
assert.equal(lineFamily('H'), 'H');
// variants of one service share ink; different services never do
assert.equal(lineColour('4', 'TRAM'), lineColour('4T', 'TRAM'));
assert.notEqual(lineColour('4', 'TRAM'), lineColour('5', 'TRAM'));
// GTFS route_color still wins where the source has one
assert.equal(lineColour('4', 'TRAM', '#123456'), '#123456');
assert.equal(lineColour('M1', 'SUBWAY'), METRO_INK);

const srgb = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function lab(hex) {
  const [R, G, B] = rgb(hex).map(srgb);
  const X = (R * .4124 + G * .3576 + B * .1805) / .95047, Y = R * .2126 + G * .7152 + B * .0722, Z = (R * .0193 + G * .1192 + B * .9505) / 1.08883;
  const f = t => t > .008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const lum = hex => { const [r, g, b] = rgb(hex).map(srgb); return .2126 * r + .7152 * g + .0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const dE = (a, b) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

const PAPER = '#edf4f2';
const all = [...Object.values(ink), METRO_INK];
// The solved floor. 37.0 was reached by a constrained search, so a hand-added
// colour that scrapes past a lower bar is exactly what this is here to catch.
const FLOOR = 36.5;
let worst = Infinity, pair = '';
for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
  const d = dE(all[i], all[j]);
  if (d < worst) { worst = d; pair = `${all[i]}/${all[j]}`; }
}
assert.ok(worst >= FLOOR, `two line colours are only dE ${worst.toFixed(1)} apart (${pair}); floor is ${FLOOR}`);
for (const c of all) assert.ok(contrast(c, PAPER) >= 3.0, `line colour ${c} is only ${contrast(c, PAPER).toFixed(2)}:1 on the paper`);

// Roads are GROUND: they must stay quieter than every line, or a street starts
// reading as a service. The bug this pins is the one paperboy and the Rush both
// shipped — a layer drawn at a contrast nobody looked at.
const roadC = contrast(ROAD_INK, PAPER);
assert.ok(roadC < 1.9, `roads at ${roadC.toFixed(2)}:1 are too loud to be ground`);
for (const c of all) assert.ok(contrast(c, PAPER) > roadC * 1.6, `line ${c} is not clearly louder than the roads`);

// ---- the drawn streets point at places that exist -----------------------
for (const road of MAIN_ROADS) {
  assert.ok(road.nodes.length >= 2, `road ${road.name} needs at least two anchors`);
  for (const id of road.nodes) assert.ok(HELSINKI_ANCHORS[id], `road ${road.name} names unknown anchor ${id}`);
}
const paths = roadPaths(resolved);
assert.equal(paths.length, MAIN_ROADS.length, 'a main road failed to resolve to real coordinates');
for (const p of paths) {
  assert.ok(p.path.length >= 2, `road ${p.name} resolved to fewer than two points`);
  for (const [lat, lon] of p.path) assert.ok(Number.isFinite(lat) && Number.isFinite(lon), `road ${p.name} has a non-finite point`);
}

console.log(`board: ${(share * 100).toFixed(1)}% of the pack, ${anchors.length} anchors inside, ` +
            `${families.length} tram families inked at min dE ${worst.toFixed(1)}, ${paths.length} main roads`);
