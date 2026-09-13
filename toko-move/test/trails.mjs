// The trail's gate. Bare node with a stub context — the module owns no canvas
// state of its own, which is the property that let it be written this way in
// the first place: nothing accumulates in pixels, so everything it knows is a
// list of lat/lon points that can be inspected.
import assert from 'node:assert';
import { Trails, TRAIL_TICKS } from '../js/trails.js';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

const layer = (id, colour) => ({ id, colour, visible: true, path: [[60.17, 24.94], [60.19, 24.96]] });
function net(n = 3) {
  const vs = Array.from({ length: n }, (_, i) => ({ id: `v${i}`, layer: layer(`L${i}`, `#f0${i}`) }));
  return { vehicles: vs, position: (v, t) => ({ lat: 60.17 + t * 1e-4, lon: 24.94 + t * 1e-4 }) };
}
// A context that remembers what was asked of it instead of drawing.
// Built as a literal rather than through Object.assign: assign copies an
// accessor's VALUE, not the accessor, so a composite-operation setter defined
// that way silently disappears and the check for it can never pass.
function stubCtx() {
  const c = {
    strokes: [], composites: [],
    globalAlpha: 1, lineWidth: 1, strokeStyle: '', lineCap: '', lineJoin: '',
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {},
    stroke() { c.strokes.push({ a: c.globalAlpha, w: c.lineWidth, s: c.strokeStyle }); },
    get globalCompositeOperation() { return c.composites.at(-1); },
    set globalCompositeOperation(v) { c.composites.push(v); },
  };
  return c;
}
const project = (lat, lon) => ({ x: (lon - 24.9) * 1e4, y: (60.2 - lat) * 1e4 });

// ---- it remembers, and it forgets ---------------------------------------
{
  const t = new Trails(), n = net(3), ctx = stubCtx();
  for (let tick = 0; tick <= 40; tick += 1) t.update(ctx, n, tick, project, 1);
  ok(t.paths.size === 3, 'one path per vehicle');
  const a = [...t.paths.values()][0];
  ok(a.length > 4, `a path has points (${a.length})`);
  // sampling is on the tick, so a faster frame rate cannot remember more city
  ok(a.every(p => p[0] % 2 === 0), 'points are sampled on the tick, not the frame');
  ok(a.at(-1)[0] - a[0][0] <= TRAIL_TICKS, `and reach back no further than ${TRAIL_TICKS} ticks`);
  const len = a.length;
  for (let tick = 41; tick <= 200; tick++) t.update(ctx, n, tick, project, 1);
  ok([...t.paths.values()][0].length <= len + 1, 'a tail stops growing — it is a window, not a log');
}
{
  // a vehicle that stops being drawn stops being remembered, or a filtered
  // fleet leaves ghosts behind it for as long as the tab is open
  const t = new Trails(), n = net(3), ctx = stubCtx();
  for (let tick = 0; tick <= 20; tick++) t.update(ctx, n, tick, project, 1);
  ok(t.paths.size === 3, 'three remembered');
  for (let tick = 21; tick <= 40; tick++) t.update(ctx, n, tick, project, 1, (lat, lon, l, v) => v.id === 'v0');
  ok(t.paths.size === 1 && t.paths.has('v0'), 'filtering the fleet forgets the rest');
}
{
  const t = new Trails(), n = net(2), ctx = stubCtx();
  n.vehicles[1].layer.visible = false;
  for (let tick = 0; tick <= 20; tick++) t.update(ctx, n, tick, project, 1);
  ok(t.paths.size === 1, 'a hidden layer leaves no wake');
}

// ---- the tail says which way the vehicle is going -------------------------
{
  const t = new Trails(), n = net(1), ctx = stubCtx();
  for (let tick = 0; tick <= 30; tick++) t.update(ctx, n, tick, project, 1);
  ctx.strokes.length = 0;
  t.update(ctx, n, 32, project, 1);
  const s = ctx.strokes;
  ok(s.length > 3, `the tail is drawn as segments (${s.length})`);
  ok(s[0].a < s.at(-1).a, 'and fades from head to tail');
  ok(s[0].w < s.at(-1).w, 'and tapers from head to tail');
  ok(s.at(-1).a < 0.6, 'the brightest segment is still translucent — a wake, not a second route');
  ok(s.every(x => x.s === '#f00'), "and every segment wears its own line's colour");
  ok(ctx.composites.includes('lighter'),
    'drawn additively, because a wake in the line colour laid on its own line is invisible');
}

// ---- it cannot draw without somewhere to draw ----------------------------
{
  const t = new Trails();
  ok(t.update(null, net(2), 0, project, 1) === 0, 'no context, no work');
  ok(t.update(stubCtx(), null, 0, project, 1) === 0, 'no fleet, no work');
  ok(t.paths.size === 0, 'and nothing remembered from either');
}

console.log(`toko-move trail gate: ${checks} checks passed`);
