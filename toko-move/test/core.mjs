// The core gate. Bare node: no browser, no GPU, no canvas — which is the point,
// because it means it can be run on every edit rather than once before a deploy.
// Everything it checks is decided by game state, never by the wall clock.

import { legPoints, corner, measure, posOn, pointInRing, inWater, crossings, waterGates } from '../js/geometry.js?v=2';
import { SHAPES, COMMON, SPECIAL, isSpecial } from '../js/shapes.js?v=2';
import { World, Station, BOARD, STATION_CAP, OVERCROWD_TIME } from '../js/world.js?v=2';
import { Network, Train, CAR_CAPACITY } from '../js/lines.js?v=2';
import { Game, WEEK, DAY } from '../js/sim.js?v=2';
import { PAL, INK } from '../js/palette.js?v=2';

let pass = 0; const fails = [];
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };
const eq = (a, b, msg) => ok(a === b || (typeof a === 'number' && Math.abs(a - b) < 1e-6), `${msg} — got ${a}, want ${b}`);

// ── geometry: the octolinear rule ───────────────────────────────────────
{
  const p = legPoints({ x: 0, y: 0 }, { x: 100, y: 40 });
  eq(p.length, 3, 'a dog-leg is three points');
  eq(p[1].x, 40, 'the bend eats the shorter axis (x)');
  eq(p[1].y, 40, 'the bend lands on the target row');
  eq(legPoints({ x: 0, y: 0 }, { x: 50, y: 50 }).length, 2, 'a pure diagonal has no bend');
  eq(legPoints({ x: 0, y: 0 }, { x: 0, y: 70 }).length, 2, 'a pure vertical has no bend');
  eq(legPoints({ x: 0, y: 0 }, { x: 70, y: 0 }).length, 2, 'a pure horizontal has no bend');

  // the whole point of the module: nothing may be drawn at any other angle
  let offGrid = 0;
  for (let i = 0; i < 400; i++) {
    const a = { x: (i * 37) % 400 - 200, y: (i * 53) % 400 - 200 };
    const b = { x: (i * 71) % 400 - 200, y: (i * 29) % 400 - 200 };
    const pts = legPoints(a, b);
    for (let k = 1; k < pts.length; k++) {
      const dx = Math.abs(pts[k].x - pts[k - 1].x), dy = Math.abs(pts[k].y - pts[k - 1].y);
      if (dx > 0.001 && dy > 0.001 && Math.abs(dx - dy) > 0.001) offGrid++;
    }
  }
  eq(offGrid, 0, 'every leg piece is horizontal, vertical or exactly 45 degrees');
  eq(corner({ x: 0, y: 0 }, { x: 20, y: 90 }).x, 20, 'a tall leg bends onto the target column');

  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
  const cum = measure(pts);
  eq(cum[2], 20, 'cumulative length adds both pieces');
  eq(posOn(pts, cum, 15).y, 5, 'a position halfway along the second piece');
  eq(posOn(pts, cum, 999).x, 10, 'past the end clamps to the end');
}

// ── water ───────────────────────────────────────────────────────────────
{
  const box = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  ok(pointInRing(50, 50, box), 'a point inside the ring is water');
  ok(!pointInRing(150, 50, box), 'a point outside the ring is land');
  ok(inWater(50, 50, [box]), 'inWater agrees');
  const across = legPoints({ x: -50, y: 50 }, { x: 150, y: 50 });
  eq(crossings(across, [box]), 1, 'a leg straight over the water costs one tunnel');
  eq(waterGates(across, [box]).length, 2, 'a crossing has an entry and an exit');
  const beside = legPoints({ x: -50, y: 200 }, { x: 150, y: 200 });
  eq(crossings(beside, [box]), 0, 'a leg clear of the water costs nothing');
  eq(crossings(across, []), 0, 'no water, no tunnels');
}

// ── shapes ──────────────────────────────────────────────────────────────
{
  eq(SHAPES.length, 8, 'eight shapes');
  eq(COMMON.length + SPECIAL.length, SHAPES.length, 'every shape is common or special');
  ok(SPECIAL.every(isSpecial) && !COMMON.some(isSpecial), 'the special split is honest');
}

// ── the board ───────────────────────────────────────────────────────────
{
  const w = new World(3);
  eq(w.stations.length, 3, 'a board opens with three stops');
  eq([...new Set(w.stations.map(s => s.kind))].sort().join(','), 'circle,square,triangle',
     'and they are one of each common shape');

  // the same seed must lay out the same board, or a reported run is not a run
  const a = new World(99), b = new World(99);
  for (let i = 0; i < 300; i++) { a.step(0.2); b.step(0.2); }
  eq(JSON.stringify(a.stations.map(s => [s.kind, s.x | 0, s.y | 0])),
     JSON.stringify(b.stations.map(s => [s.kind, s.x | 0, s.y | 0])),
     'the same seed builds the same board');

  const w2 = new World(11);
  for (let i = 0; i < 900; i++) w2.step(0.2);
  ok(w2.stations.every(s => !inWater(s.x, s.y, w2.rings)), 'no stop is ever placed in the water');
  ok(w2.stations.every(s => s.x > 0 && s.x < BOARD.w && s.y > 0 && s.y < BOARD.h), 'every stop is on the board');
  let tooClose = 0;
  for (let i = 0; i < w2.stations.length; i++) for (let j = i + 1; j < w2.stations.length; j++) {
    const p = w2.stations[i], q = w2.stations[j];
    if (Math.hypot(p.x - q.x, p.y - q.y) < 60) tooClose++;
  }
  eq(tooClose, 0, 'no two stops are drawn on top of each other');
  ok(w2.spawnRate() > new World(11).spawnRate(), 'more people arrive later in the run than at the start');
  ok(w2.stations.length > 3, 'the city grows');
}

// ── crowding ────────────────────────────────────────────────────────────
{
  const w = new World(5);
  const st = w.stations[0];
  st.waiting = new Array(STATION_CAP + 2).fill('circle');
  ok(st.crowded, 'past capacity is crowded');
  w.step(OVERCROWD_TIME / 2);
  ok(st.over > 0.4 && st.over < 0.6, 'the gauge fills at the stated rate');
  ok(!w.doomed(), 'a half-full gauge is not the end');
  w.step(OVERCROWD_TIME);
  ok(w.doomed(), 'a full gauge ends the run');

  const w2 = new World(5);
  const s2 = w2.stations[0];
  s2.waiting = new Array(STATION_CAP + 2).fill('circle');
  w2.step(OVERCROWD_TIME / 2);
  const peak = s2.over;
  s2.waiting = [];
  w2.step(5);
  ok(s2.over < peak, 'clearing a platform drains the gauge again');
}

// ── a hand-built network, so routing is checked against a known answer ──
function bench(seed = 1) {
  const g = new Game(seed);
  g.world.rings = [];              // no water: tunnels are tested separately
  g.world.stations = [];
  g.world.nextId = 0;
  const add = (kind, x, y) => {
    const s = new Station(g.world.nextId++, kind, x, y);
    g.world.stations.push(s);
    return s;
  };
  return { g, add };
}

{
  const { g, add } = bench();
  const A = add('circle', 100, 100), B = add('triangle', 300, 100), C = add('square', 500, 100);
  g.net.rebuild();

  const r = g.net.open(A.id, B.id);
  ok(!r.error, 'a line opens between two stops');
  eq(g.net.spareTrains, 2, 'opening a line takes a train out of the shed');
  eq(r.line.trains.length, 1, 'and puts it on the line');
  g.net.extend(r.line, C.id, false);
  eq(r.line.stations.length, 3, 'a line extends from its end');
  eq(r.line.segCount(), 2, 'three stops make two legs');

  eq(g.net.hopsFrom(A.id, 'square'), 2, 'two hops from the circle to the square');
  eq(g.net.hopsFrom(A.id, 'triangle'), 1, 'one hop to the triangle');
  eq(g.net.hopsFrom(C.id, 'square'), 0, 'standing on your own shape is no hops at all');
  eq(g.net.hopsFrom(A.id, 'star'), Infinity, 'a shape not on the board is unreachable');

  // boarding
  const t = r.line.trains[0];
  t.segIdx = 0; t.p = 0; t.dir = 1;
  eq(t.nextStopId(), B.id, 'the train knows where it is going');
  A.waiting = ['square'];
  g.service(t, 0);
  eq(t.load.length, 1, 'somebody boards a train that gets them closer');
  eq(A.waiting.length, 0, 'and leaves the platform');

  // riding through a stop that is not theirs
  t.segIdx = 1; t.p = 0; t.dir = 1;
  g.service(t, 1);
  eq(t.load.length, 1, 'they stay on through a stop that is not their shape');
  eq(g.score, 0, 'and nothing is scored for passing through');

  // arrival
  t.segIdx = 1; t.p = 1; t.dir = 1;
  g.service(t, 2);
  eq(t.load.length, 0, 'they get off at their shape');
  eq(g.score, 1, 'and that is the score');
}

{
  // the wrong way round: a train pointing away must not be boarded
  const { g, add } = bench();
  const A = add('circle', 100, 100), B = add('triangle', 300, 100), C = add('square', 500, 100);
  g.net.rebuild();
  const line = g.net.open(A.id, B.id).line;
  g.net.extend(line, C.id, false);
  const t = line.trains[0];
  t.segIdx = 0; t.p = 1; t.dir = -1;        // sitting at B, facing A
  eq(t.nextStopId(), A.id, 'facing back down the line');
  B.waiting = ['square'];
  g.service(t, 1);
  eq(t.load.length, 0, 'nobody boards a train going the wrong way');
  eq(B.waiting.length, 1, 'they wait for the next one');
}

{
  // capacity, and the carriage that lifts it
  const { g, add } = bench();
  const A = add('circle', 100, 100), B = add('square', 300, 100);
  g.net.rebuild();
  const line = g.net.open(A.id, B.id).line;
  const t = line.trains[0];
  eq(t.capacity, CAR_CAPACITY, 'a locomotive carries six');
  A.waiting = new Array(20).fill('square');
  t.segIdx = 0; t.p = 0; t.dir = 1;
  g.service(t, 0);
  eq(t.load.length, CAR_CAPACITY, 'a full train takes no more');
  eq(A.waiting.length, 14, 'the rest are still standing there');

  g.net.addCarriage(line);
  eq(t.capacity, CAR_CAPACITY * 2, 'a carriage doubles a one-car train');
}

{
  // the transfer: get off where staying on stops helping
  const { g, add } = bench();
  const A = add('circle', 100, 300), B = add('triangle', 300, 300);
  const C = add('square', 300, 100), D = add('cross', 500, 300);
  g.net.rebuild();
  const one = g.net.open(A.id, B.id).line;   // A—B
  g.net.extend(one, D.id, false);            // A—B—D
  const two = g.net.open(B.id, C.id).line;   // B—C
  eq(g.net.hopsFrom(A.id, 'square'), 2, 'the square is two hops away, via the triangle');

  const t = one.trains[0];
  t.segIdx = 0; t.p = 0; t.dir = 1;
  A.waiting = ['square'];
  g.service(t, 0);
  eq(t.load.length, 1, 'they board the first leg of the trip');
  t.segIdx = 1; t.p = 0; t.dir = 1;          // now at B, next stop D
  g.service(t, 1);
  eq(t.load.length, 0, 'they get off where the train stops helping');
  eq(B.waiting.length, 1, 'and wait at the interchange');
  eq(two.stations.length, 2, 'the connecting line is there to take them');
}

// ── editing the network ─────────────────────────────────────────────────
{
  const { g, add } = bench();
  const A = add('circle', 100, 100), B = add('triangle', 300, 100), C = add('square', 500, 100);
  g.net.rebuild();
  const line = g.net.open(A.id, B.id).line;
  g.net.extend(line, C.id, false);
  const colour = line.colour;

  g.net.retract(line, false);
  eq(line.stations.length, 2, 'retracting takes the end stop off');
  g.net.retract(line, false);
  eq(g.net.lines.length, 0, 'a line below two stops stops existing');
  eq(g.net.spareTrains, 3, 'and hands its train back');
  eq(g.net.freeColour(), colour, 'and its colour goes back on the peg');
}

{
  const { g, add } = bench();
  const A = add('circle', 100, 100), B = add('triangle', 300, 100), C = add('square', 400, 300);
  g.net.rebuild();
  const line = g.net.open(A.id, B.id).line;
  g.net.extend(line, C.id, false);
  eq(line.segCount(), 2, 'open: two legs for three stops');
  g.net.extend(line, A.id, false);            // drag the end back onto the head
  ok(line.loop, 'dragging an end onto the other end closes the loop');
  eq(line.segCount(), 3, 'a loop has a leg for every stop');
  g.net.retract(line, false);
  ok(!line.loop, 'retracting a loop opens it again before removing anything');
  eq(line.stations.length, 3, 'and keeps every stop');
}

{
  const { g, add } = bench();
  for (let i = 0; i < 8; i++) add('circle', 60 + i * 90, 100 + (i % 2) * 120);
  g.net.rebuild();
  const s = g.world.stations;
  eq(g.net.maxLines, 3, 'three lines to start');
  g.net.open(s[0].id, s[1].id);
  g.net.open(s[2].id, s[3].id);
  g.net.open(s[4].id, s[5].id);
  ok(!g.net.canOpenLine(), 'the third line is the last one');
  ok(g.net.open(s[6].id, s[7].id).error, 'a fourth is refused');
  eq(g.net.spareTrains, 0, 'three lines used all three trains');
  ok(!g.net.addTrain(g.net.lines[0]), 'and there is nothing left to add');
  eq(new Set(g.net.lines.map(l => l.colour)).size, 3, 'every line got its own colour');
}

{
  // tunnels: a leg over water is refused when there is no tunnel for it
  const { g, add } = bench();
  g.world.rings = [[{ x: 200, y: -50 }, { x: 260, y: -50 }, { x: 260, y: 650 }, { x: 200, y: 650 }]];
  const A = add('circle', 100, 300), B = add('square', 400, 300);
  g.net.rebuild();
  g.net.ownedTunnels = 0;
  const bad = g.net.open(A.id, B.id);
  ok(bad.error, 'no tunnel, no crossing');
  eq(g.net.lines.length, 0, 'and the refused line is not left lying around');
  g.net.ownedTunnels = 1;
  const good = g.net.open(A.id, B.id);
  ok(!good.error, 'with a tunnel in hand it goes through');
  eq(g.net.tunnelsUsed(), 1, 'and the tunnel is spent');
  eq(g.net.tunnelsLeft(), 0, 'leaving none');
}

{
  // two lines down one leg must not be drawn on top of each other
  const { g, add } = bench();
  const A = add('circle', 100, 100), B = add('square', 400, 100);
  g.net.rebuild();
  const one = g.net.open(A.id, B.id).line;
  const two = g.net.open(A.id, B.id).line;
  ok(one.segs[0].shift !== two.segs[0].shift, 'lines sharing a leg are pushed apart');
  ok(one.segs.every(s => Array.isArray(s.gatesDraw)), 'and their tunnel marks travel with them');
  const solo = new Network(g.world);
  solo.rebuild();
  eq(solo.lines.length, 0, 'an empty network solves without complaint');
}

// ── the run ─────────────────────────────────────────────────────────────
{
  const g = new Game(21);
  eq(g.state, 'title', 'a game starts on the title');
  g.step(1);
  eq(g.time, 0, 'and nothing moves until it is started');
  g.start();
  eq(g.state, 'play', 'starting puts it in play');
  g.paused = true;
  g.step(1);
  eq(g.time, 0, 'pause really pauses');
  g.paused = false;
  g.step(1);
  ok(g.time > 0, 'and unpausing runs the clock');

  g.speed = 2;
  const before = g.time;
  g.step(0.1);
  ok(Math.abs((g.time - before) - 0.2) < 1e-6, 'double speed doubles the clock');

  // a frame that took a whole second must not teleport the world
  const t0 = g.time;
  g.speed = 1;
  g.step(30);
  ok(g.time - t0 <= 0.1 + 1e-6, 'a long frame is clamped, not integrated');
}

{
  const g = new Game(31);
  g.start();
  let guard = 0;
  while (g.state === 'play' && guard++ < 4000) g.step(0.05);
  ok(g.state === 'upgrade', 'the first week ends in a choice');
  eq(g.offer.length, 2, 'and the choice is between exactly two things');
  ok(g.paused, 'the clock stops while you choose');
  const maxBefore = g.net.maxLines, tunBefore = g.net.ownedTunnels;
  const kind = g.offer.includes('line') ? 'line' : 'tunnel';
  g.applyUpgrade(kind, null);
  eq(g.state, 'play', 'choosing puts you back in play');
  ok(!g.paused, 'and starts the clock again');
  ok(kind === 'line' ? g.net.maxLines === maxBefore + 1 : g.net.ownedTunnels === tunBefore + 1,
     'and the thing you chose actually arrives');
  eq(g.offer, null, 'the offer is cleared once taken');
}

{
  const g = new Game(41);
  g.start();
  g.world.stations[0].waiting = new Array(STATION_CAP + 3).fill('circle');
  let guard = 0;
  while (g.state === 'play' && guard++ < 20000) {
    g.step(0.05);
    if (g.state === 'upgrade') g.applyUpgrade(g.offer[0], g.net.lines[0]?.id ?? null);
  }
  eq(g.state, 'over', 'an unattended platform ends the run');
  const r = g.report();
  ok(r.seed === 41 && r.days >= 0, 'the report names the board it was played on');
}

{
  // a played run really does move people
  const g = new Game(77);
  g.start();
  const attach = () => {
    for (const st of g.world.stations) {
      if (g.net.linesAt(st.id).length) continue;
      let best = null, bd = 1e9, head = false;
      for (const l of g.net.lines) for (const [id, h] of [[l.head, true], [l.tail, false]]) {
        const e = g.world.station(id); if (!e) continue;
        const d = Math.hypot(e.x - st.x, e.y - st.y);
        if (d < bd) { bd = d; best = l; head = h; }
      }
      if (best) { if (!g.net.extend(best, st.id, head).error) continue; }
      if (g.net.canOpenLine()) {
        const near = g.world.stations.find(o => o.id !== st.id && !g.net.linesAt(o.id).length);
        if (near) g.net.open(st.id, near.id);
      }
    }
  };
  let guard = 0;
  while (g.state !== 'over' && guard++ < 20000) {
    g.step(0.05);
    if (guard % 20 === 0) attach();
    if (g.state === 'upgrade') g.applyUpgrade(g.offer[0], g.net.lines[0]?.id ?? null);
  }
  ok(g.score > 20, `a run with lines on it delivers people (got ${g.score})`);
  ok(g.time > WEEK, 'and lasts more than a week');
  eq(DAY * 7, WEEK, 'a week is seven days');
}

// ── the ink ─────────────────────────────────────────────────────────────
{
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const lum = h => { const c = rgb(h).map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const x = lum(a), y = lum(b); const [h, l] = x > y ? [x, y] : [y, x]; return (h + 0.05) / (l + 0.05); };
  ok(cr(PAL.ink, PAL.paper) >= 4.5, 'body ink clears AA on the paper');
  ok(cr(PAL.dim, PAL.paper) >= 4.5, 'the quiet grey clears AA too — it has drifted before');
  ok(cr(PAL.warnText, PAL.paper) >= 4.5, 'and so does anything the alarm says in words');

  const d = (a, b) => { const x = rgb(a), y = rgb(b); return Math.abs(x[0]-y[0]) + Math.abs(x[1]-y[1]) + Math.abs(x[2]-y[2]); };
  ok(PAL.lines.every(c => d(c, PAL.ink) >= 110), 'no line can be mistaken for the crowding gauge');
  let closest = Infinity;
  for (let i = 0; i < PAL.lines.length; i++) for (let j = i + 1; j < PAL.lines.length; j++) {
    closest = Math.min(closest, d(PAL.lines[i], PAL.lines[j]));
  }
  ok(closest >= 90, `every line colour is tellable from every other (closest ${closest})`);
  ok(INK.line > INK.station, 'the network is drawn heavier than the stops on it');
  ok(INK.lineGap > INK.line, 'two lines sharing a leg are pushed further apart than they are wide');
}

console.log(`\ntoko-move core: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log('  FAIL  ' + f);
process.exit(fails.length ? 1 : 0);
