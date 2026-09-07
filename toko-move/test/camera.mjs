// The camera's gate. Bare node — the camera owns no canvas and no drawing, only
// arithmetic, which is exactly why it can be proved here on every edit instead
// of by looking at a screenshot and hoping.
//
// What it holds: the three scales mean what they say in METRES, a pinch lands in
// the right band, the viewport cannot be panned off the board, zooming about a
// point keeps that point under the finger, and the fleet rule does what the
// owner asked — everything in frame when zoomed in, only what passes you inside
// 2 km when zoomed out.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { boardBox, boardFit } from '../js/board.js';
import { resolveHslAnchors } from '../js/helsinki-anchors.js';
import { Camera, SCALES, FLEET_RADIUS_M, M_PER_DEG, metresBetween } from '../js/camera.js';

const here = dirname(fileURLToPath(import.meta.url));
const pack = JSON.parse(readFileSync(join(here, '../cities/helsinki.json'), 'utf8'));
const box = boardBox(resolveHslAnchors(pack));
const W = 900, H = 1200;
const base = boardFit(box, W, H);
const cam = () => new Camera(box);
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg} (${a} vs ${b} ±${tol})`);

// ---- the scales are metres, not decimals -------------------------------
{
  const c = cam();
  ok(c.zoomFor('city') === 1, 'CITY is the whole board, by definition');
  for (const s of SCALES.filter(x => x.spanM)) {
    const z = c.zoomFor(s.id);
    const spanM = c.heightM() / z;
    near(spanM, s.spanM, s.spanM * 0.02, `${s.id} viewport height is its declared span`);
    ok(z > 1, `${s.id} is closer in than CITY`);
  }
  ok(c.zoomFor('stop') > c.zoomFor('route'), 'STOP is closer in than ROUTE');
  // The owner's circle: a 2 km RADIUS has to fit inside the ROUTE view.
  ok(c.heightM() / c.zoomFor('route') >= FLEET_RADIUS_M * 2 - 1, 'a 2 km radius fits in the ROUTE view');
}

// ---- a pinch between the notches still names its band -------------------
{
  const c = cam(), zr = c.zoomFor('route'), zs = c.zoomFor('stop');
  ok(c.nearestScale(1.02) === 'city', 'just off CITY still reads CITY');
  ok(c.nearestScale(zr) === 'route', 'exactly ROUTE reads ROUTE');
  ok(c.nearestScale(zs * 1.2) === 'stop', 'past STOP still reads STOP');
  // and the boundary between two notches is their GEOMETRIC mean, because zoom
  // is multiplicative: half way between x1 and x2.1 is x1.45, not x1.55. A
  // linear nearest-of puts the boundary in the wrong place at every notch, and
  // the rail then names a band you are not in.
  const edge = Math.sqrt(1 * zr);
  ok(c.nearestScale(edge * 0.98) === 'city', 'just under the CITY/ROUTE boundary reads CITY');
  ok(c.nearestScale(edge * 1.02) === 'route', 'just over it reads ROUTE');
  ok(edge < (1 + zr) / 2, 'and that boundary is BELOW the arithmetic midpoint — the two rules really differ');
}

// ---- the viewport cannot be panned off the board ------------------------
{
  const c = cam().snapTo('stop'); c.zoom = c.targetZoom;
  c.panBy(10, 10);                       // ten degrees north-east: off the planet's worth
  c.step(16, base, W, H);
  // against base.box, not the raw box: boardFit GROWS the box to the canvas
  // aspect (boxToAspect), and the grown box is what is actually drawn, so it is
  // what the viewport must stay inside.
  const half = c.halfSpan(base, W, H), b = base.box;
  ok(c.cy <= b.n - half.lat + 1e-9 && c.cy >= b.s + half.lat - 1e-9, 'latitude stays over the board');
  ok(c.cx <= b.e - half.lon + 1e-9 && c.cx >= b.w + half.lon - 1e-9, 'longitude stays over the board');
}
{
  // At CITY scale the whole board is on screen, so there is nowhere to pan TO
  // and the centre is pinned. A pan that slides the board out of frame is the
  // bug this holds against.
  const c = cam();
  c.panBy(0.02, 0.02); c.step(16, base, W, H);
  near(c.cy, (base.box.n + base.box.s) / 2, 1e-9, 'CITY scale pins the centre in latitude');
  near(c.cx, (base.box.e + base.box.w) / 2, 1e-9, 'CITY scale pins the centre in longitude');
}

// ---- projection: round trip, and zoom keeps the point under the finger ---
{
  const c = cam().snapTo('route'); c.zoom = c.targetZoom; c.step(16, base, W, H);
  const p = c.apply(base, W, H);
  const back = p.invert(410, 630), again = p(back.lat, back.lon);
  near(again.x, 410, 1e-6, 'invert round-trips in x');
  near(again.y, 630, 1e-6, 'invert round-trips in y');
  // a stop drawn at the canvas middle is the camera's own centre
  const mid = p(c.cy, c.cx);
  near(mid.x, W / 2, 1e-6, 'the camera centre draws at the canvas middle (x)');
  near(mid.y, H / 2, 1e-6, 'the camera centre draws at the canvas middle (y)');
}
{
  // zoomAbout is what makes a pinch feel attached to the map. The world point
  // under the finger must not move, which is the whole claim.
  const c = cam();
  const px = 300, py = 400;
  const before = c.apply(base, W, H).invert(px, py);
  c.zoomAbout(base, W, H, px, py, c.zoomFor('route'));
  const after = c.apply(base, W, H)(before.lat, before.lon);
  near(after.x, px, 0.5, 'the point under the finger keeps its x');
  near(after.y, py, 0.5, 'the point under the finger keeps its y');
  ok(c.following === false, 'zooming by hand takes the camera off the courier');
}

// ---- the follow dead zone ----------------------------------------------
{
  const c = cam().snapTo('stop'); c.zoom = c.targetZoom; c.step(16, base, W, H);
  const half = c.halfSpan(base, W, H), start = { lat: c.ty, lon: c.tx };
  c.step(16, base, W, H, { lat: start.lat + half.lat * 0.1, lon: start.lon });   // inside the zone
  near(c.ty, start.lat, 1e-9, 'a small move does not drag the camera');
  c.step(16, base, W, H, { lat: start.lat + half.lat * 0.9, lon: start.lon });   // outside it
  ok(Math.abs(c.ty - start.lat) > half.lat * 0.5, 'leaving the dead zone recentres');
}
{
  const c = cam().snapTo('route');
  c.panBy(0.001, 0.001);
  ok(c.following === false, 'a drag drops the follow');
  c.recentre();
  ok(c.following === true, 'RECENTRE takes it back');
}

// ---- the fleet rule ------------------------------------------------------
{
  const c = cam();
  ok(c.fleetRule() === 'near', 'at CITY scale the fleet is cut to what is near');
  c.snapTo('route'); c.zoom = c.targetZoom;
  ok(c.fleetRule() === 'viewport', 'zoomed in, the viewport is the only filter');
  c.snapTo('stop'); c.zoom = c.targetZoom;
  ok(c.fleetRule() === 'viewport', 'and at STOP scale too');
}
{
  // the 2 km circle, measured the way the game measures it
  const at = { lat: 60.1841, lon: 24.9402 };                         // Töölöntori-ish
  const oneKm = { lat: at.lat + 1000 / M_PER_DEG, lon: at.lon };
  const threeKm = { lat: at.lat + 3000 / M_PER_DEG, lon: at.lon };
  ok(metresBetween(at.lat, at.lon, oneKm.lat, oneKm.lon) <= FLEET_RADIUS_M, '1 km away is inside the circle');
  ok(metresBetween(at.lat, at.lon, threeKm.lat, threeKm.lon) > FLEET_RADIUS_M, '3 km away is outside it');
  // longitude is scaled by cos(lat) or the circle is an ellipse: at 60°N a
  // degree of longitude is about half a degree of latitude on the ground.
  const eastDeg = 2500 / (M_PER_DEG * Math.cos(at.lat * Math.PI / 180));
  ok(metresBetween(at.lat, at.lon, at.lat, at.lon + eastDeg) > FLEET_RADIUS_M,
    '2.5 km EAST is outside the circle too — the circle is round on the ground');
}

// ---- mutation checks: each of these must FAIL the rules above ------------
{
  // a camera that does not clamp would let this sit off the board
  const c = cam().snapTo('stop'); c.zoom = c.targetZoom;
  c.cy = base.box.n + 1; c.cx = base.box.e + 1;
  const before = { lat: c.cy, lon: c.cx };
  c.clampCentre(base, W, H);
  ok(c.cy !== before.lat && c.cx !== before.lon, 'clampCentre actually moves an off-board centre');
  // and a "zoom about the centre" implementation would move the finger point
  const d = cam(), px = 120, py = 180;
  const world = d.apply(base, W, H).invert(px, py);
  d.setZoom(d.zoomFor('stop'), true);                     // the naive version
  const moved = d.apply(base, W, H)(world.lat, world.lon);
  ok(Math.hypot(moved.x - px, moved.y - py) > 20, 'zooming about the centre WOULD move the point (so the test above is real)');
}

console.log(`toko-move camera gate: ${checks} checks passed`);
