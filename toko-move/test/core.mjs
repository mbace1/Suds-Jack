// The core gate. Bare node: no browser, no GPU, no canvas — which is the point,
// because it means it can be run on every edit rather than once before a deploy.
// Everything it checks is decided by game state, never by the wall clock.

import { legPoints, corner, measure, posOn, pointInRing, inWater, crossings, waterGates } from '../js/geometry.js?v=10';
import { SHAPES, COMMON, SPECIAL, isSpecial } from '../js/shapes.js?v=10';
import { World, Station, BOARD, STATION_CAP } from '../js/world.js?v=10';
import { Network, Train, CAR_CAPACITY, nubs } from '../js/lines.js?v=10';
import { Game } from '../js/sim.js?v=10';
import { RoadNet, Car, CELL, CELL_CARS } from '../js/roads.js?v=10';
import { MISSIONS, byId, campaign, validate, GOALS, CAPABILITIES, clockFmt } from '../js/missions.js?v=10';
import { PAL, INK } from '../js/palette.js?v=10';
import { validate as validCity, project, octolinear, layout, merge, report } from '../js/city.js?v=10';
import { readZip, parseCsv, packFromGtfs, modeOf } from '../../scripts/gtfs.mjs';
import { deflateRawSync, crc32 } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// a platform full of people, now that a passenger is an object
const fill = (st, n, goal, now = 0) => { for (let i = 0; i < n; i++) st.join(goal, now); return st; };

let pass = 0; const fails = [];
const ok = (cond, msg) => { if (cond) pass++; else fails.push(msg); };
const eq = (a, b, msg) => ok(a === b || (typeof a === 'number' && Math.abs(a - b) < 1e-6), `${msg} — got ${a}, want ${b}`);
// A check that survives the thing it is checking throwing. A gate that dies on
// the first bad call never runs the rest of itself, and then a broken module
// looks like a clean exit with no summary at all — which is exactly how a zip
// reader pointed at the wrong offset hid nine other checks.
const tries = (fn, msg, fallback = null) => {
  try { return fn(); } catch (e) { fails.push(`${msg} — threw: ${e.message}`); return fallback; }
};

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
  const ENDLESS = byId('endless');
  const OVERCROWD_TIME = ENDLESS.fail.overcrowd;
  const w = new World(3, ENDLESS);
  eq(w.stations.length, 3, 'a board opens with three stops');
  eq([...new Set(w.stations.map(s => s.kind))].sort().join(','), 'circle,square,triangle',
     'and they are one of each common shape');

  // the same seed must lay out the same board, or a reported run is not a run
  const a = new World(99, ENDLESS), b = new World(99, ENDLESS);
  for (let i = 0; i < 300; i++) { a.step(0.2); b.step(0.2); }
  eq(JSON.stringify(a.stations.map(s => [s.kind, s.x | 0, s.y | 0])),
     JSON.stringify(b.stations.map(s => [s.kind, s.x | 0, s.y | 0])),
     'the same seed builds the same board');

  const w2 = new World(11, ENDLESS);
  for (let i = 0; i < 900; i++) w2.step(0.2);
  ok(w2.stations.every(s => !inWater(s.x, s.y, w2.rings)), 'no stop is ever placed in the water');
  ok(w2.stations.every(s => s.x > 0 && s.x < BOARD.w && s.y > 0 && s.y < BOARD.h), 'every stop is on the board');
  let tooClose = 0;
  for (let i = 0; i < w2.stations.length; i++) for (let j = i + 1; j < w2.stations.length; j++) {
    const p = w2.stations[i], q = w2.stations[j];
    if (Math.hypot(p.x - q.x, p.y - q.y) < 60) tooClose++;
  }
  eq(tooClose, 0, 'no two stops are drawn on top of each other');
  ok(w2.spawnRate() > new World(11, ENDLESS).spawnRate(), 'more people arrive later in the run than at the start');
  ok(w2.stations.length > 3, 'the city grows');
}

// ── crowding ────────────────────────────────────────────────────────────
{
  const ENDLESS = byId('endless');
  const OVERCROWD_TIME = ENDLESS.fail.overcrowd;
  const w = new World(5, ENDLESS);
  const st = w.stations[0];
  fill(st, STATION_CAP + 2, 'circle');
  ok(st.crowded, 'past capacity is crowded');
  w.step(OVERCROWD_TIME / 2);
  ok(st.over > 0.4 && st.over < 0.6, 'the gauge fills at the stated rate');
  ok(!w.doomed(), 'a half-full gauge is not the end');
  w.step(OVERCROWD_TIME);
  ok(w.doomed(), 'a full gauge ends the run');

  const w2 = new World(5, ENDLESS);
  const s2 = w2.stations[0];
  fill(s2, STATION_CAP + 2, 'circle');
  w2.step(OVERCROWD_TIME / 2);
  const peak = s2.over;
  s2.waiting = [];
  w2.step(5);
  ok(s2.over < peak, 'clearing a platform drains the gauge again');
}

// ── a hand-built network, so routing is checked against a known answer ──
function bench(seed = 1) {
  const g = new Game(seed, 'endless');
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
  A.join('square');
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
  B.join('square');
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
  fill(A, 20, 'square');
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
  A.join('square');
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

{
  // the grab handle at a terminus
  const { g, add } = bench();
  const A = add('circle', 100, 300), B = add('square', 400, 300), C = add('triangle', 700, 300);
  g.net.rebuild();
  const line = g.net.open(A.id, B.id).line;
  g.net.extend(line, C.id, false);

  const GAP = 20;
  const ns = nubs(g.net, g.world, GAP);
  eq(ns.length, 2, 'an open line has a nub at each end');
  ok(ns.some(n => n.atHead) && ns.some(n => !n.atHead), 'one at the head and one at the tail');

  // it stands off the stop by the gap it was given, along the track
  const head = ns.find(n => n.atHead);
  const tail = ns.find(n => !n.atHead);
  const dHead = Math.hypot(head.x - A.x, head.y - A.y);
  const dTail = Math.hypot(tail.x - C.x, tail.y - C.y);
  eq(Math.round(dHead), Math.round(INK.stationR + GAP), 'the head nub stands off by the stop radius plus the gap');
  ok(tail.x > C.x, 'and the tail nub points on past the last stop, away from the line');
  ok(head.x < A.x, 'while the head nub points the other way');
  eq(Math.round(dTail), Math.round(INK.stationR + GAP), 'both at the same stand-off');

  // the gap is a parameter because it is a SCREEN measurement — a bigger gap
  // must actually move the nub, or the phone fix does nothing
  const wide = nubs(g.net, g.world, GAP * 3).find(n => n.atHead);
  ok(Math.hypot(wide.x - A.x, wide.y - A.y) > dHead + GAP, 'a larger gap pushes the nub further out');

  // a loop has no ends, so it has nothing to grab
  const D = add('cross', 400, 600);
  g.net.rebuild();
  g.net.extend(line, D.id, false);
  g.net.extend(line, A.id, false);
  ok(line.loop, 'the line is a loop');
  eq(nubs(g.net, g.world, GAP).length, 0, 'and a loop offers no nub — you unwrap it first');
}

{
  // deleting: one continuous pull down the line takes the whole thing, and
  // hands back everything it was holding
  const { g, add } = bench();
  const A = add('circle', 100, 100), B = add('triangle', 300, 100), C = add('square', 500, 100);
  g.net.rebuild();
  const line = g.net.open(A.id, B.id).line;
  g.net.extend(line, C.id, false);
  const colour = line.colour;
  eq(g.net.spareTrains, 2, 'the line took a train out of the shed');

  g.net.retract(line, false);
  eq(line.stations.length, 2, 'one pull takes one stop');
  const gone = g.net.retract(line, false);
  ok(gone.removed, 'the next pull removes the line itself');
  eq(g.net.lines.length, 0, 'so nothing is left drawn');
  eq(g.net.spareTrains, 3, 'the train goes back to the shed');
  eq(g.net.freeColour(), colour, 'and the colour goes back on the peg');
}

{
  // A line that gets shorter must bring its trains back with it. Pulling a stop
  // off while a train was out on that leg left the train pointing at a leg that
  // no longer existed, and the next frame read `pts` off undefined and took the
  // renderer down with it. Every gate passed, because they all retract lines
  // that are standing still — this one moves the train first.
  const { g, add } = bench();
  const A = add('circle', 100, 100), B = add('triangle', 300, 100);
  const C = add('square', 500, 100), D = add('cross', 700, 100);
  g.net.rebuild();
  const line = g.net.open(A.id, B.id).line;
  g.net.extend(line, C.id, false);
  g.net.extend(line, D.id, false);
  const t = line.trains[0];
  eq(line.segCount(), 3, 'four stops make three legs');

  for (const leg of [2, 1]) {
    t.segIdx = leg; t.p = 0.5; t.dir = 1;
    g.net.retract(line, false);
    ok(t.segIdx < Math.max(1, line.segCount()), `a train out on leg ${leg} is not left past the end`);
    let threw = null;
    try { t.pos(); } catch (e) { threw = e.message; }
    eq(threw, null, `and asking where it is does not throw (${threw})`);
  }

  // and it survives a whole frame's worth of work afterwards
  let boom = null;
  try { for (let i = 0; i < 40; i++) g.step(0.05); } catch (e) { boom = e.message; }
  eq(boom, null, `the run carries on after the line was cut under a moving train (${boom})`);
}

{
  // Nobody can reach a shape that is not on any line. Mini Metro draws those
  // people exactly like everyone else and never lets them leave — PLAYTEST.md
  // measured up to 61% of a queue in that state, invisible, pushing the gauge.
  // This is a logical option, not an inherited one: mark them, and let them go.
  const { g, add } = bench();
  const A = add('circle', 100, 100), B = add('triangle', 300, 100);
  add('star', 600, 100);                       // exists, but no line will reach it
  g.net.rebuild();
  g.start();

  const ok1 = A.join('triangle', 0);           // reachable once the line exists
  const stuck = A.join('star', 0);             // never reachable
  g.net.open(A.id, B.id);
  for (let i = 0; i < 4; i++) g.step(0.1);

  ok(!ok1.stranded, 'somebody with a route is not marked');
  ok(stuck.stranded, 'somebody without one is');
  eq(g.stranded, 1, 'and the count says exactly how many');

  // …and drawing the line they needed clears it
  g.net.extend(g.net.lines[0], g.world.stations[2].id, false);
  for (let i = 0; i < 4; i++) g.step(0.1);
  ok(!stuck.stranded, 'connecting their shape un-marks them');
  eq(g.stranded, 0, 'and the count goes back to nothing');
}

{
  // the fuse
  const { g, add } = bench();
  const A = add('circle', 100, 100), B = add('triangle', 300, 100);
  add('star', 600, 100);
  g.net.rebuild();
  g.start();
  const patient = A.join('triangle', 0);
  const stuck = A.join('star', 0);
  g.net.open(A.id, B.id);
  for (let i = 0; i < 4; i++) g.step(0.1);
  eq(g.gaveUp, 0, 'nobody leaves straight away');

  g.world.time = byId('endless').giveUp + 5;
  for (let i = 0; i < 4; i++) g.step(0.1);
  eq(g.gaveUp, 1, 'past the fuse, the one with nowhere to go leaves');
  ok(!A.waiting.includes(stuck), 'and is off the platform');
  ok(A.waiting.includes(patient), 'while somebody merely waiting for a train stays');
  eq(g.report().gaveUp, 1, 'and the run reports it');

  // a mission may say they never give up, which is the old behaviour
  const never = new Game(2, 'endless');
  never.mission = { ...never.mission, giveUp: null };
  never.start();
  const s0 = never.world.stations[0];
  const forever = s0.join('star', 0);
  never.world.time = 9999;
  for (let i = 0; i < 4; i++) never.step(0.1);
  ok(s0.waiting.includes(forever), 'with no fuse set, nobody ever leaves');
}

{
  // a passenger keeps its history across a transfer — the property the layers
  // to come depend on, and the one OpenTTD's manual records itself lacking
  const { g, add } = bench();
  const A = add('circle', 100, 300), B = add('triangle', 300, 300);
  const C = add('square', 300, 100), D = add('cross', 500, 300);
  g.net.rebuild();
  const one = g.net.open(A.id, B.id).line;
  g.net.extend(one, D.id, false);
  g.net.open(B.id, C.id);
  const rider = A.join('square', 7);
  const t = one.trains[0];
  t.segIdx = 0; t.p = 0; t.dir = 1;
  g.service(t, 0);
  eq(t.load[0], rider, 'the person who boards is the person who was waiting');
  t.segIdx = 1; t.p = 0; t.dir = 1;
  g.service(t, 1);
  ok(B.waiting.includes(rider), 'and the same one is put back down to transfer');
  eq(rider.born, 7, 'still carrying how long they have been travelling');
  eq(rider.goal, 'square', 'and still wanting the same thing');
}

// ── the run ─────────────────────────────────────────────────────────────
{
  const g = new Game(21, 'endless');
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
  const g = new Game(31, 'endless');
  g.start();
  let guard = 0;
  while (g.state === 'play' && guard++ < 4000) g.step(0.05);
  ok(g.state === 'upgrade', 'the first upgrade beat stops for a choice');
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
  const g = new Game(41, 'endless');
  g.start();
  fill(g.world.stations[0], STATION_CAP + 3, 'circle');
  let guard = 0;
  while (g.state === 'play' && guard++ < 20000) {
    g.step(0.05);
    if (g.state === 'upgrade') g.applyUpgrade(g.offer[0], g.net.lines[0]?.id ?? null);
  }
  eq(g.state, 'over', 'an unattended platform ends the run');
  const r = g.report();
  ok(r.seed === 41 && r.units >= 0, 'the report names the board it was played on');
}

{
  // a played run really does move people
  const g = new Game(77, 'endless');
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
  ok(g.time > byId('endless').clock.upgradeEvery, 'and lasts more than one upgrade beat');
}

// ── missions: the format, and that the sim owns no numbers ──────────────
{
  eq(MISSIONS.length >= 2, true, 'there is more than one mission');
  ok(MISSIONS.every(m => m.id && m.title && m.clock), 'every mission is named and has a clock');
  eq(new Set(MISSIONS.map(m => m.id)).size, MISSIONS.length, 'mission ids are unique');
  ok(campaign().every((m, i, a) => i === 0 || a[i - 1].order < m.order), 'the campaign spine is ordered');
  ok(byId('endless').length == null, 'the endless city has no end');
  ok(byId('festival').length > 0, 'the festival does');

  // a goal naming a capability this build lacks must be REFUSED, not silently
  // impossible — a mission that looks playable and cannot be finished is worse
  // than one that will not load
  let refused = 0;
  for (const goal of [{ type: 'budget', n: 10 }, { type: 'nonsense' }]) {
    try { validate({ id: 't', clock: { unit: 1 }, goals: [goal] }); }
    catch { refused++; }
  }
  eq(refused, 2, 'goals needing what this build lacks are refused at load');
  // `payload` moved from "stated but impossible" to real when The Handover
  // shipped, and the point of this check is that the list is HONEST rather than
  // that it is short: money is still not a thing, and a budget goal still will
  // not load.
  ok(CAPABILITIES.has('payload'), 'a load is something this build can now carry');
  ok(!CAPABILITIES.has('money'), 'and it is still honest about having no economy');
  let escortLoads = true;
  try { validate({ id: 't', clock: { unit: 1 }, goals: [{ type: 'escort', what: 'the load' }] }); }
  catch { escortLoads = false; }
  ok(escortLoads, 'so an escort mission loads where it used to be refused');
  ok(GOALS.escort && GOALS.budget, 'and the format can still STATE what does not exist yet');

  // the five kinds the owner asked to be able to state
  for (const k of ['deliver', 'survive', 'hold', 'escort', 'budget']) ok(!!GOALS[k], `the format can state "${k}"`);
}

{
  // the sim must take its numbers from the mission and nowhere else
  const a = new Game(5, 'endless'), b = new Game(5, 'festival');
  ok(a.net.maxLines !== b.net.maxLines || a.net.spareTrains !== b.net.spareTrains,
     'two missions hand out different transport');
  eq(b.net.maxLines, byId('festival').resources.lines, 'resources come from the mission');
  eq(b.net.spareTrains, byId('festival').resources.trains, 'and so do the trains');
  ok(a.clock.unit !== b.clock.unit, 'and the clocks differ');
  eq(a.unitLabel, 'mon', 'the endless city counts in days');
  eq(b.unitLabel, '21:00', 'the festival counts in hours');
  eq(a.remaining, null, 'an endless run has no time left because it has no end');
  eq(b.remaining, byId('festival').length, 'a timed one starts with all of it');
  eq(a.world.maxStations, byId('endless').board.maxStations, 'the board size is the mission\'s');
  eq(b.world.maxStations, byId('festival').board.maxStations, 'on both');
}

{
  // winning
  const g = new Game(5, 'festival');
  g.start();
  ok(!g.goalsMet(), 'nothing is won at the start');
  g.score = byId('festival').goals[0].n;
  g.step(0.05);
  eq(g.state, 'won', 'hitting the target wins it');
  eq(g.endReason, 'won', 'and says so');
  ok(g.paused, 'and stops the clock');
}

{
  // running out of time
  const g = new Game(6, 'festival');
  g.start();
  g.world.time = byId('festival').length;
  g.step(0.05);
  eq(g.state, 'over', 'dawn with the target unmet ends it');
  eq(g.endReason, 'timeup', 'and names the reason');
}

{
  // the fail rule is the MISSION's. The festival deliberately has no sudden
  // death: a jammed platform is the premise, not a defeat.
  eq(byId('endless').fail.overcrowd, 45, 'the endless city dies of crowding');
  eq(byId('festival').fail.overcrowd, null, 'the festival does not');
  const g = new Game(9, 'festival');
  g.start();
  for (const s of g.world.stations) { fill(s, 40, 'circle'); s.over = 1; }
  g.step(0.05);
  eq(g.state, 'play', 'so a jammed festival platform costs people, not the night');
  ok(g.world.doomed(), 'even though the gauge is full');
}

{
  // the crowd WALKS: it lands spread across the nearest stops, not on the
  // festival itself, which is what makes the pre-midnight network matter
  const m = byId('festival');
  const burst = m.spawn.bursts[0];
  const g = new Game(11, 'festival');
  g.start();
  let guard = 0;
  while (g.time < burst.at - 1 && guard++ < 20000) {
    g.step(0.05);
    if (g.state === 'upgrade') g.applyUpgrade(g.offer[0], g.net.lines[0]?.id ?? null);
  }
  const before = g.world.stations.reduce((n, s) => n + s.waiting.length, 0);
  ok(g.world.firedBursts.size === 0, 'the crowd has not moved before midnight');
  guard = 0;
  while (g.world.firedBursts.size === 0 && guard++ < 20000) {
    g.step(0.05);
    if (g.state === 'upgrade') g.applyUpgrade(g.offer[0], g.net.lines[0]?.id ?? null);
  }
  const after = g.world.stations.reduce((n, s) => n + s.waiting.length, 0);
  ok(after - before >= burst.n * 0.9, `midnight puts the crowd on the platforms (+${after - before})`);
  ok(g.world.site, 'the festival has a place on the board');
}

{
  // How far the crowd SPREADS. The first cut of this check counted stops with
  // anybody on them, which ambient traffic satisfies on its own — it passed
  // happily with the whole crowd dumped on one platform. Measure the burst.
  const m = byId('festival');
  const burst = m.spawn.bursts[0];
  const g = new Game(11, 'festival');
  g.start();
  let guard = 0;
  while (g.world.firedBursts.size === 0 && guard++ < 20000) {
    const before = new Map(g.world.stations.map(s => [s.id, s.waiting.length]));
    g.step(0.05);
    if (g.state === 'upgrade') g.applyUpgrade(g.offer[0], g.net.lines[0]?.id ?? null);
    if (g.world.firedBursts.size) {
      const gained = g.world.stations
        .map(s => s.waiting.length - (before.get(s.id) ?? 0))
        .filter(n => n > 5);
      eq(gained.length, burst.spread, `the crowd walks to ${burst.spread} stops, not one`);
      const each = burst.n / burst.spread;
      ok(gained.every(n => Math.abs(n - each) <= each * 0.5), 'and lands on them evenly');
      break;
    }
  }
  ok(g.world.firedBursts.size === 1, 'and it happens exactly once');
}

{
  // A mission carrying a crowd must lay out EXACTLY the board a mission
  // without one does, or every seeded board that already exists quietly moves.
  //
  // Swept across sixty seeds on purpose: checked on a single seed this passes
  // even when the site is drawn from the board's own stream, because roughly
  // one board in seven coincidentally survives the shift. One seed proved
  // nothing and said it had.
  const E = byId('endless');
  const withCrowd = { ...E, spawn: { ...E.spawn, bursts: [{ at: 5, n: 3, spread: 2 }] } };
  const key = w => w.stations.map(s => `${s.kind}:${s.x.toFixed(4)}:${s.y.toFixed(4)}`).join('|');
  let shifted = 0;
  for (let seed = 1; seed <= 60; seed++) {
    if (key(new World(seed, E)) !== key(new World(seed, withCrowd))) shifted++;
  }
  eq(shifted, 0, 'adding a crowd moves no stop on any of sixty boards');
}

{
  // the burst has to SAY something — a crowd of two hundred appearing with no
  // word for it reads as the game breaking rather than the festival ending
  const g = new Game(11, 'festival');
  g.start();
  let said = null, guard = 0;
  while (g.world.firedBursts.size === 0 && guard++ < 20000) {
    g.step(0.05);
    if (g.state === 'upgrade') g.applyUpgrade(g.offer[0], g.net.lines[0]?.id ?? null);
    const ev = g.events.find(e => e && e.say);
    if (ev) said = ev.say;
    g.events.length = 0;
  }
  ok(said && said.length > 4, `midnight announces itself ("${said}")`);
  eq(said, byId('festival').spawn.bursts[0].label, 'in the words the mission gave it');
}

{
  // "hold the line" is sticky. Nothing on the floor uses it yet, so without a
  // test of its own it would rot unnoticed until the first mission that does.
  const g = new Game(3, 'endless');
  g.mission = { ...g.mission, goals: [{ type: 'hold', limit: 0.5, t: 4 }] };
  g.start();
  ok(!g.holdBroken, 'nothing is broken at the start');
  g.step(0.05);
  ok(!g.holdBroken, 'and a quiet board keeps it that way');

  g.world.stations[0].over = 0.6;
  g.step(0.05);
  ok(g.holdBroken, 'crossing the line breaks it');

  g.world.stations[0].over = 0;
  g.world.stations[0].waiting = [];
  g.step(0.05);
  ok(g.holdBroken, 'and clearing the platform afterwards does NOT un-break it');

  g.world.time = 99;
  ok(!GOALS.hold.done(g, { type: 'hold', limit: 0.5, t: 4 }), 'so the goal cannot be met by tidying up at the end');
  const clean = new Game(3, 'endless');
  clean.world.time = 99;
  ok(GOALS.hold.done(clean, { type: 'hold', limit: 0.5, t: 4 }), 'while a board that never crossed it does meet the goal');
}

{
  // a clock may never print a sixtieth second. Flooring the minutes off a float
  // while ceiling the seconds separately turned 119.4s into "1:60" on the strip.
  eq(clockFmt(120), '2:00', 'two minutes reads as two minutes');
  eq(clockFmt(119.4), '2:00', 'and so does very nearly two minutes');
  eq(clockFmt(0), '0:00', 'zero is zero');
  eq(clockFmt(-5), '0:00', 'and past the end is still zero');
  eq(clockFmt(65), '1:05', 'seconds under ten keep their leading zero');
  let bad = null;
  for (let ms = 0; ms <= 600000; ms += 137) {
    const out = clockFmt(ms / 1000);
    const sec = +out.split(':')[1];
    if (sec > 59) { bad = `${ms / 1000}s -> ${out}`; break; }
  }
  eq(bad, null, `no time in ten minutes prints a sixtieth second (${bad})`);
}

// ── the car layer ───────────────────────────────────────────────────────
// A hand-made town rather than a generated one, for the same reason `bench()`
// exists upstairs: a road network checked against a board nobody chose is a
// test that can only say "it did not throw".
//
//   cells are 40 board units. Row 4 is a river, from x=0 to x=400.
//   circle at (60, 100) → cell 1,2      square at (60, 300) → cell 1,7
//   triangle at (300, 100) → cell 7,2
function town(opts = {}) {
  const stations = [
    new Station(0, 'circle', 60, 100),
    new Station(1, 'square', 60, 300),
    new Station(2, 'triangle', 300, 100),
  ].slice(0, opts.n ?? 3);
  const rings = opts.dry ? [] : [[{ x: -20, y: 160 }, { x: 420, y: 160 }, { x: 420, y: 240 }, { x: -20, y: 240 }]];
  const world = {
    w: 400, h: 400, time: 0, rings, stations,
    station: id => stations.find(s => s.id === id),
    shapesPresent: () => [...new Set(stations.map(s => s.kind))],
  };
  return { world, net: new RoadNet(world, opts.res ?? { road: 60, cars: 4, bridge: 1 }) };
}
const lay = (net, x0, y0, x1, y1) => {          // a straight run, inclusive
  const out = [];
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) out.push(net.build(cx, cy));
  return out;
};

{
  const { net } = town({ dry: true });
  eq(net.cols, 10, 'the grid covers the board across');
  eq(net.rows, 10, 'and down');
  const c = net.centre('3,5');
  eq(c.x, 3 * CELL + CELL / 2, 'a square’s centre is its middle, not its corner');
  const back = net.cellOf(c);
  ok(back.cx === 3 && back.cy === 5, 'and a point in it names it again');
  ok(!net.onBoard(-1, 0) && !net.onBoard(0, 10) && net.onBoard(9, 9), 'the board has edges');
}

// budget: road is the resource, and lifting gives it back
{
  const { net } = town({ dry: true, res: { road: 4, cars: 2, bridge: 0 } });
  eq(net.left(), 4, 'you start with what the mission granted');
  lay(net, 0, 0, 3, 0);
  eq(net.used(), 4, 'four squares spend four');
  eq(net.build(4, 0), false, 'and the fifth is refused');
  ok(net.erase(0, 0), 'a laid square can be lifted');
  eq(net.left(), 1, 'which hands the square back');
  eq(net.erase(0, 0), false, 'lifting bare ground does nothing');
  eq(net.build(4, 0), true, 'and now the fifth fits');
}

// water: a bridge is a CROSSING, not a square. Charging per square made the
// price of a river its width, which quietly broke every L laid after the third.
{
  const { net } = town({ res: { road: 40, cars: 2, bridge: 1 } });
  ok(net.wet(1, 4) && !net.wet(1, 2), 'the river is where the river is');
  eq(net.bridgesLeft(), 1, 'one crossing to spend');
  ok(net.build(1, 4), 'the first wet square starts a span');
  eq(net.bridgesLeft(), 0, 'and spends the crossing');
  ok(net.build(1, 5), 'carrying that span further across is free');
  eq(net.bridgesLeft(), 0, 'a wide river costs no more than a narrow one');
  eq(net.build(6, 4), false, 'but a SECOND crossing has nothing left to pay with');
  ok(net.erase(1, 5) && net.erase(1, 4), 'lift the span');
  eq(net.bridgesLeft(), 1, 'and the crossing comes back');
  eq(net.build(6, 4), true, 'to be spent somewhere else');
}
{
  // the count may not depend on the order the squares were laid in
  const a = town({ res: { road: 40, cars: 2, bridge: 2 } }).net;
  for (const cy of [4, 5]) for (const cx of [2, 3]) a.build(cx, cy);
  const b = town({ res: { road: 40, cars: 2, bridge: 2 } }).net;
  for (const cx of [3, 2]) for (const cy of [5, 4]) b.build(cx, cy);
  eq(a.piers, 1, 'four squares in one block are one crossing');
  eq(a.piers, b.piers, 'and laying them backwards says the same');
}

// reach: the same solve as upstairs, so the stranded mark works untouched
{
  const { net, world } = town({ dry: true });
  eq(net.hopsFrom(0, 'square'), Infinity, 'with no road nobody reaches anybody');
  lay(net, 1, 2, 1, 7);
  eq(net.doorsOf(world.stations[0]).length > 0, true, 'road under a building is its door');
  ok(net.hopsFrom(0, 'square') < Infinity, 'a road down the street joins the two');
  eq(net.hopsFrom(0, 'circle'), 0, 'and you are already where you are');
  eq(net.hopsFrom(0, 'triangle'), Infinity, 'the third is still off the network');
  const path = net.route(world.stations[0], 'square');
  ok(path && path.length > 1, 'which is a route the car can drive');
  ok(net.doorsOf(world.stations[1]).includes(path[path.length - 1]), 'ending at the door of the building it was going to');
  let downhill = true;
  const d = net.reach.get('square');
  for (let i = 1; i < path.length; i++) if (!(d.get(path[i]) < d.get(path[i - 1]))) downhill = false;
  ok(downhill, 'every step of it strictly closer, so it cannot loop');
}

// the lane rule. This is the deadlock the first cut shipped: CELL_CARS was
// written as "one each way, so nobody deadlocks head-on" and then counted both,
// so a one-square street with two cars pointing east and two pointing west
// locked solid. The balance sweep found two boards in eight at 93% and 100% of
// every car stopped.
{
  const { net } = town({ dry: true, res: { road: 40, cars: 9, bridge: 0 } });
  lay(net, 1, 0, 1, 3);
  const east = (a, b) => { const c = new Car({ goal: 'square' }, 0, [a, b]); net.cars.push(c); return c; };
  east('1,1', '1,2'); east('1,1', '1,2');
  ok(!net.roomIn('1,1', '1,0'), 'two cars going one way fill the square behind them');
  ok(net.roomIn('1,2', '1,1'), 'the square ahead is still open');
  east('1,2', '1,1'); east('1,2', '1,1');
  ok(net.roomIn('1,2', '1,1'), 'oncoming traffic is in the other lane and does not block you');
  eq(net.countIn('1,2'), 2, 'even though it is standing there');
}
{
  // and a queue flushes from the front, so a street advances rather than a car
  const { net } = town({ dry: true, res: { road: 40, cars: 9, bridge: 0 } });
  lay(net, 1, 0, 1, 5);
  // a FULL street: two abreast in each of four squares, all going the same way,
  // so every car but the leaders has a full square in front of it
  const line = ['1,0', '1,1', '1,2', '1,3', '1,4', '1,5'];
  for (let i = 0; i < 4; i++) for (let k = 0; k < CELL_CARS; k++) {
    net.cars.push(new Car({ goal: 'square' }, 0, line.slice(i)));
  }
  const before = net.cars.map(c => c.at);
  net.drive(1.2, () => {});
  const moved = net.cars.filter((c, i) => c.at > before[i]).length;
  ok(moved >= 6, `a full street advances together, not one square a tick (moved ${moved} of ${net.cars.length})`);
}

// dispatch, delivery, and what happens when you lift the road out from under a car
{
  const { net, world } = town({ dry: true, res: { road: 40, cars: 2, bridge: 0 } });
  lay(net, 1, 2, 1, 7);
  world.stations[0].join('square', 0);
  net.dispatch();
  eq(net.cars.length, 1, 'somebody waiting with a road to their shape gets a car');
  eq(net.spareCars, 1, 'out of the pool');
  eq(world.stations[0].waiting.length, 0, 'and off the pavement');
  let delivered = 0;
  for (let i = 0; i < 400 && delivered === 0; i++) net.step(0.05, () => delivered++);
  eq(delivered, 1, 'the car arrives on its own — nothing routed it by hand');
  eq(net.spareCars, 2, 'and goes back in the pool');
}
{
  const { net, world } = town({ dry: true, res: { road: 40, cars: 2, bridge: 0 } });
  lay(net, 1, 2, 1, 7);
  world.stations[0].join('square', 0);
  net.dispatch();
  const rider = net.cars[0].p;
  net.erase(1, 5);
  eq(net.cars.length, 0, 'lifting the road under a car takes the car off it');
  eq(net.spareCars, 2, 'the car goes back in the pool');
  ok(world.stations[0].waiting.includes(rider), 'and the SAME person is back where they were waiting');
}
{
  // nobody is dispatched to a shape no road reaches — the layer's own
  // "unreachable", which is what the stranded mark upstairs reads
  const { net, world } = town({ dry: true, res: { road: 40, cars: 2, bridge: 0 } });
  lay(net, 1, 2, 1, 3);
  world.stations[0].join('square', 0);
  net.dispatch();
  eq(net.cars.length, 0, 'a road that goes nowhere dispatches nobody');
  eq(world.stations[0].waiting.length, 1, 'they are still standing there');
}

// ── the Rush: the mission wired onto that layer ─────────────────────────
{
  const g = new Game(11, 'rush');
  eq(g.layer, 'roads', 'the mission says which layer it is played on');
  ok(g.roads instanceof RoadNet, 'and the game builds it');
  ok(g.transport === g.roads, 'everything that asks "can this be reached" asks the roads');
  eq(g.net.lines.length, 0, 'there are no lines to draw on this one');
  eq(g.roads.budget, byId('rush').resources.road, 'the road allowance is the mission’s number');
  eq(g.roads.spareCars, byId('rush').resources.cars, 'and so is the number of cars');

  const metro = new Game(11, 'endless');
  eq(metro.roads, null, 'a metro mission builds no roads');
  ok(metro.transport === metro.net, 'and asks its lines instead');
}
{
  // the upgrades this layer offers, and that each one does something
  const g = new Game(11, 'rush');
  const road = g.roads.budget, cars = g.roads.spareCars, bridges = g.roads.bridges;
  g.applyUpgrade('road');  ok(g.roads.budget > road, 'MORE ROAD lays more road');
  g.applyUpgrade('cars');  ok(g.roads.spareCars > cars, 'MORE CARS puts more cars out');
  g.applyUpgrade('bridge'); ok(g.roads.bridges > bridges, 'BRIDGE buys another crossing');
  g.applyUpgrade('carriage');
  eq(g.net.lines.length, 0, 'and a metro upgrade on this layer is simply nothing');

  let sawBridge = false, sawLine = false;
  for (let i = 0; i < 200; i++) { const o = new Game(i, 'rush').makeOffer(); if (o.includes('bridge')) sawBridge = true; if (o.includes('line')) sawLine = true; }
  ok(!sawLine, 'the car layer never offers a line');
  ok(!sawBridge, 'nor a bridge while you still hold one — a dead card in a hand of two');
  const spent = new Game(11, 'rush');
  spent.roads.piers = spent.roads.bridges;
  let offered = false;
  for (let i = 0; i < 60 && !offered; i++) { spent.world.rng.next(); offered = spent.makeOffer().includes('bridge'); }
  ok(offered, 'but once they are all spent, a wet board can buy another');
}
{
  // the give-up fuse reads the ROADS on this layer, not the lines
  const g = new Game(11, 'rush');
  g.start();
  const st = g.world.stations[0];
  const other = g.world.stations.find(s => s.kind !== st.kind);
  st.join(other.kind, 0);
  g._sweep = 0;
  g.sweepStranded(0);
  ok(st.waiting[0].stranded, 'with no road laid, everybody is marked unreachable');
  const a = g.roads.cellOf(st), b = g.roads.cellOf(other);
  for (let cx = Math.min(a.cx, b.cx); cx <= Math.max(a.cx, b.cx); cx++) g.roads.build(cx, a.cy);
  for (let cy = Math.min(a.cy, b.cy); cy <= Math.max(a.cy, b.cy); cy++) g.roads.build(b.cx, cy);
  g._sweep = 0;
  g.sweepStranded(0);
  ok(!st.waiting[0]?.stranded || g.roads.hopsFrom(st.id, other.kind) === Infinity,
    'and joined by a road, they are not');
}
{
  // it has to be finishable. A deterministic player joining each new building to
  // the nearest road it already owns must reach the target on most boards —
  // measured, because "the mission loads" is not the same as "the mission ends".
  let wins = 0;
  for (const seed of [11, 24, 38, 59, 101]) {
    const g = new Game(seed, 'rush');
    g.start();
    const R = g.roads, joined = new Set();
    const join = () => {
      for (const st of g.world.stations) {
        if (joined.has(st.id) || R.left() <= 0) continue;
        const a = R.cellOf(st);
        let to = null, bd = Infinity;
        for (const k of R.cells) {
          const [cx, cy] = k.split(',').map(Number);
          const d = Math.abs(cx - a.cx) + Math.abs(cy - a.cy);
          if (d < bd) { bd = d; to = { cx, cy }; }
        }
        let { cx, cy } = a;
        const put = () => { if (!R.cells.has(`${cx},${cy}`)) R.build(cx, cy); };
        put();
        if (to) { while (cx !== to.cx) { cx += Math.sign(to.cx - cx); put(); }
                  while (cy !== to.cy) { cy += Math.sign(to.cy - cy); put(); } }
        joined.add(st.id);
      }
    };
    for (let n = 0; n < 20000 && g.state !== 'over' && g.state !== 'won'; n++) {
      g.step(0.05);
      if (n % 20 === 0) join();
      if (g.state === 'upgrade') g.applyUpgrade(R.left() < 10 ? 'road' : (g.offer.includes('cars') ? 'cars' : g.offer[0]));
    }
    if (g.state === 'won') wins++;
  }
  ok(wins >= 4, `The Rush can be won by an ordinary player (${wins}/5 boards)`);
}

// ── two layers at once, and a load that changes hands ───────────────────
// The Handover runs the metro AND the roads together, and the parcel is not a
// new kind of object: it is a Passenger with LEGS, standing in the ordinary
// queue, competing for the same trains as everybody else.
{
  const g = new Game(11, 'transfer');
  eq(g.layers.join('+'), 'metro+roads', 'a mission may name more than one layer');
  ok(!!g.net && !!g.roads, 'and both are built, not one of them');
  eq(g.layer, 'metro', 'the FOCUS starts on the first one named');

  ok(g.focus('roads'), 'the focus can be moved');
  eq(g.layer, 'roads', 'and it moves');
  ok(g.transport === g.roads, 'so the drawn-on transport follows it');
  ok(!g.focus('boat'), 'but not to a layer this mission does not run');
  eq(g.layer, 'roads', 'and a refused switch leaves it where it was');
  g.focus('metro');

  // BOTH keep working. A layer that stops while you look elsewhere would make
  // the switch a change of board rather than a change of attention.
  g.start();
  const st = g.world.stations[0];
  const other = g.world.stations.find(s => s.kind !== st.kind);
  st.join(other.kind, 0);
  const before = { cars: g.roads.cars.length, trains: g.net.lines.length };
  for (let i = 0; i < 40; i++) g.step(0.05);
  ok(g.roads.cars.length >= before.cars, 'the roads tick while the metro is focused');
}

{
  // the legs themselves
  const g = new Game(11, 'transfer');
  g.start();
  let n = 0;
  while (!g.parcel && n++ < 4000) g.step(0.05);
  ok(!!g.parcel, `the load turns up (t ${g.time.toFixed(0)}s)`);
  const p = g.parcel;
  eq(p.parcel, true, 'and knows it is one');
  eq(p.legs.length, 3, 'with a leg per hop the mission asked for');
  ok(p.legs.every((l, i) => i === 0 || l.goal !== p.legs[i - 1].goal),
     'no two legs in a row end at the same shape, or a handover is a no-op');
  eq(p.legs.map(l => l.layer).join('>'), 'metro>roads>metro',
     'and the layers alternate, so the load changes hands twice rather than once');
  eq(p.goal, p.legs[0].goal, 'p.goal is whatever THIS leg is heading for');
  eq(p.layer, 'metro', 'and p.layer is who may carry it');

  // the handoff: arriving mid-journey does not score, it changes hands
  const scoreBefore = g.score;
  const dest = g.world.stations.find(s => s.kind === p.legs[0].goal);
  const out = g.arrived(p, dest.id);
  eq(out, 'handoff', 'arriving at the end of a leg is a handoff, not a delivery');
  eq(g.score, scoreBefore, 'and it does not score');
  eq(p.leg, 1, 'the load is on its second leg');
  eq(p.layer, 'roads', 'which only a van may carry');
  ok(dest.waiting.includes(p), 'and it is standing on the platform waiting for one');

  // …and the last leg does score
  p.leg = p.legs.length - 1;
  const last = g.world.stations.find(s => s.kind === p.goal);
  eq(g.arrived(p, last.id), 'drop', 'the last leg is a delivery');
  eq(g.score, scoreBefore + 1, 'which scores');
  ok(g.delivered.has('the load'), 'and is recorded by name');
  ok(GOALS.escort.done(g), 'so the escort goal is met');
}

{
  // A parcel booked onto one layer may not be picked up by the other. This is
  // the whole mechanism: a car "helpfully" carrying a crate booked onto the
  // metro has not helped, it has stolen it — and a train that takes one booked
  // onto the roads has done the same.
  //
  // BOTH DIRECTIONS, and the platform is EMPTIED first. The first cut of this
  // left the ordinary queue in place, and `dispatch()` breaks after one
  // successful car per stop — so an earlier passenger was dispatched, the loop
  // never reached the parcel, and the check passed with the guard deleted.
  const g = new Game(11, 'transfer');
  g.start();
  const st = g.world.stations[0];

  // roads everywhere and cars to spare, so nothing but the booking can stop it.
  // NOTE the river: `build` refuses water without a bridge, so "every cell" is
  // still two components — and the first cut of this picked a goal on the far
  // bank, where the roads could not route anyway and the check passed with the
  // guard deleted. So the goal is chosen AFTER the roads exist, from the shapes
  // they can actually reach.
  // …and the BUDGET, which is 30 squares on this mission. Without raising it
  // "every cell" built thirty scattered ones, nothing routed anywhere, and the
  // check passed with the guard deleted — the second way this same assertion
  // managed to prove nothing.
  g.roads.budget = 9999;
  g.roads.bridges = 99;
  for (let x = 0; x < g.roads.cols; x++) for (let y = 0; y < g.roads.rows; y++) g.roads.build(x, y);
  g.roads.spareCars = 20;

  const other = g.world.stations.find(s => s.kind !== st.kind && g.roads.hopsFrom(st.id, s.kind) < Infinity);
  ok(!!other, 'the roads reach somewhere else on this board, so the next check can mean something');
  const goal = other?.kind;

  st.waiting.length = 0;
  const onMetro = st.join(st.kind, 0, { parcel: true, label: 'x', legs: [{ layer: 'metro', goal }] });
  eq(onMetro.layer, 'metro', 'a load booked onto the metro says so');
  g.roads.dispatch();
  ok(!g.roads.cars.some(c => c.p === onMetro), 'and no car takes it, with a road under it and cars idle');
  ok(st.waiting.includes(onMetro), 'it is still standing where it was');

  // …and the other way: a train must leave a road-booked load alone
  st.waiting.length = 0;
  const onRoad = st.join(st.kind, 0, { parcel: true, label: 'y', legs: [{ layer: 'roads', goal }] });
  const opened = other ? g.net.open(st.id, other.id) : { error: 'no goal' };
  ok(!opened.error, 'a line runs from the load to where it is going');
  const train = opened.line?.trains?.[0];
  ok(!!train, 'with a train on it');
  if (train) {
    train.load.length = 0;
    g.service(train, opened.line.stations.indexOf(st.id));
    ok(!train.load.includes(onRoad), 'and the train leaves the road-booked load on the platform');
    ok(st.waiting.includes(onRoad), 'where it stays');

    // the same train DOES take an ordinary passenger going the same way, so the
    // refusal above is the booking and not a broken line
    st.waiting.length = 0;
    const anyone = st.join(goal, 0);
    g.service(train, opened.line.stations.indexOf(st.id));
    ok(train.load.includes(anyone), 'while anybody unbooked gets on the very same train');
  }
}

{
  // "unreachable" on a two-layer board means unreachable on EVERY layer it may
  // use — asking only the focused one would mark half the city stranded
  const g = new Game(11, 'transfer');
  g.start();
  const st = g.world.stations[0];
  const other = g.world.stations.find(s => s.kind !== st.kind);
  const p = st.join(other.kind, 0);
  eq(g.reaches(st.id, p), false, 'with nothing built, nobody is reachable');
  const a = g.roads.cellOf(st), b = g.roads.cellOf(other);
  for (let cx = Math.min(a.cx, b.cx); cx <= Math.max(a.cx, b.cx); cx++) g.roads.build(cx, a.cy);
  for (let cy = Math.min(a.cy, b.cy); cy <= Math.max(a.cy, b.cy); cy++) g.roads.build(b.cx, cy);
  ok(g.reaches(st.id, p), 'a ROAD is enough, even while the metro is the focused layer');
  eq(g.layer, 'metro', 'which it is');
}

{
  // it has to be finishable, and by the handover rather than by the counter
  let won = 0, handed = 0;
  for (const seed of [3, 17, 24, 31, 59]) {
    const g = new Game(seed, 'transfer');
    g.start();
    const R = g.roads, joined = new Set();
    const play = () => {
      for (const st of g.world.stations) {
        if (!g.net.linesAt(st.id).length) {
          let best = null, bd = 1e9, head = false;
          for (const l of g.net.lines) for (const [id, h] of [[l.head, true], [l.tail, false]]) {
            const e = g.world.station(id); if (!e) continue;
            const d = Math.hypot(e.x - st.x, e.y - st.y);
            if (d < bd) { bd = d; best = l; head = h; }
          }
          if (!(best && !g.net.extend(best, st.id, head).error) && g.net.canOpenLine()) {
            const near = g.world.stations.find(o => o.id !== st.id && !g.net.linesAt(o.id).length);
            if (near) g.net.open(st.id, near.id);
          }
        }
        if (joined.has(st.id) || R.left() <= 0) continue;
        const a = R.cellOf(st);
        let to = null, bd2 = Infinity;
        for (const k of R.cells) {
          const [cx, cy] = k.split(',').map(Number);
          const d = Math.abs(cx - a.cx) + Math.abs(cy - a.cy);
          if (d < bd2) { bd2 = d; to = { cx, cy }; }
        }
        let { cx, cy } = a;
        const put = () => { if (!R.cells.has(`${cx},${cy}`)) R.build(cx, cy); };
        put();
        if (to) { while (cx !== to.cx) { cx += Math.sign(to.cx - cx); put(); }
                  while (cy !== to.cy) { cy += Math.sign(to.cy - cy); put(); } }
        joined.add(st.id);
      }
    };
    for (let n = 0; n < 20000 && g.state !== 'over' && g.state !== 'won'; n++) {
      g.step(0.05);
      if (n % 20 === 0) play();
      if (g.state === 'upgrade') g.applyUpgrade(g.offer[0], g.net.lines[0]?.id ?? null);
    }
    if (g.state === 'won') won++;
    if ((g.parcel?.leg ?? 0) > 0) handed++;
  }
  ok(handed >= 4, `the load changes hands on most boards (${handed}/5)`);
  ok(won >= 3, `and the mission can be finished (${won}/5)`);
}

// ── warning before the water ────────────────────────────────────────────
// The tunnel rule was only ever met by being REFUSED: you dragged onto a stop
// across the water, the move was rejected, and that is how you learned. It
// teaches the rule at the cost of the move. `wouldCost` answers the same
// question without drawing anything, so the drag can be told in advance.
{
  // seed 7 rather than the usual 11: 11 deals its three opening stops all on
  // one side of the river, so there is no wet leg to ask about and the check
  // would prove nothing. Found by sweeping rather than guessed.
  const g = new Game(7, 'endless');
  const net = g.net, w = g.world;

  // find a pair the water really does separate, rather than assuming one
  let wet = null;
  for (const a of w.stations) {
    for (const b of w.stations) {
      if (a.id === b.id) continue;
      if (net.wouldCost(a.id, b.id).cross > 0) { wet = [a.id, b.id]; break; }
    }
    if (wet) break;
  }
  ok(wet !== null, 'this board has a leg that crosses water');

  if (wet) {
    const [a, b] = wet;
    const before = net.lines.length;
    ok(net.wouldCost(a, b).cross > 0, 'and wouldCost counts the crossing');
    eq(net.lines.length, before, 'without drawing anything — asking must not build');
    eq(net.wouldCost(a, b).refused, null, 'with tunnels in hand it is allowed');

    net.ownedTunnels = 0;
    eq(net.wouldCost(a, b).refused, 'needs a tunnel', 'and with none it is refused, BEFORE the attempt');
    eq(net.lines.length, before, 'still without drawing anything');

    // a dry leg is never refused, however many tunnels are gone
    let dry = null;
    for (const x of w.stations) for (const y of w.stations) {
      if (x.id !== y.id && net.wouldCost(x.id, y.id).cross === 0) { dry = [x.id, y.id]; break; }
    }
    ok(dry && net.wouldCost(dry[0], dry[1]).refused === null, 'a leg on dry land is always allowed');

    eq(net.wouldCost(a, 'nowhere').refused, null, 'and asking about a stop that is not there answers rather than throws');
  }
}

// ── a city ──────────────────────────────────────────────────────────────
// The seam between a real network and this game's board. Everything here runs
// against a SYNTHETIC city with a real one's shape — six radial trunks and a
// ring, stops every ~400m, each leg wobbled off straight the way a tram that
// follows streets is. It is deliberately not anywhere: the job is to measure
// the fitter, and a gate that needs a 400 kB pack of somebody else's open data
// checked in beside it is a gate that stops being run.
function synthCity(seed = 7) {
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const lat0 = 60.17, lon0 = 24.94, k = Math.cos((lat0 * Math.PI) / 180);
  const M = 1 / 111320;                      // degrees per metre, near enough
  const stops = [], lines = [];
  const put = (id, x, y) => {
    stops.push({ id, name: id, lat: lat0 + y * M, lon: lon0 + (x * M) / k, modes: ['TRAM'] });
    return id;
  };
  let n = 0;
  for (let arm = 0; arm < 6; arm++) {
    const a = (arm / 6) * Math.PI * 2 + 0.2;
    const seq = []; let x = 0, y = 0;
    for (let i = 0; i < 12; i++) {
      const wob = (rnd() - 0.5) * 0.5;
      // stop spacing is deliberately NOT uniform: close together in the middle,
      // far apart at the ends, which is how a city is — and which is the whole
      // thing the evenness weight has to cope with. The first version of this
      // fixture spaced them all 400m apart, which is a city nobody lives in and
      // made the fitter look better than it is.
      // …and one arm runs out of town at the end, which is what makes the
      // MEDIAN leg the right target rather than the mean: a handful of long
      // suburban runs drag a mean upward and stretch every downtown leg to
      // match. Real networks all have one of these.
      const step = 240 + i * 70 + (arm === 2 && i >= 9 ? 1300 : 0);
      x += Math.cos(a + wob) * step; y += Math.sin(a + wob) * step;
      seq.push(put(`s${n++}`, x, y));
    }
    lines.push({ id: `L${arm}`, name: String(arm + 1), mode: 'TRAM', colour: arm, stops: seq });
  }
  const ring = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ring.push(put(`r${i}`, Math.cos(a) * 2200, Math.sin(a) * 2200));
  }
  ring.push(ring[0]);                        // a ring closes
  lines.push({ id: 'R', name: 'R', mode: 'TRAM', colour: 6, stops: ring });
  return { id: 'synth', name: 'Synthetic', source: 'generated in the gate', licence: 'n/a', stops, lines };
}

{
  const good = synthCity();
  ok(validCity(good) === good, 'a well-formed pack loads');

  const throws = (mut, why) => {
    const p = structuredClone(good);
    mut(p);
    let threw = false;
    try { validCity(p); } catch { threw = true; }
    ok(threw, why);
  };
  // the licence is a condition, not a courtesy: HSL's data is CC BY 4.0, so a
  // pack that has lost its attribution may not be drawn at all
  throws(p => { delete p.licence; }, 'a pack without a licence is refused');
  throws(p => { delete p.source; }, 'and so is one that has forgotten where it came from');
  throws(p => { p.stops[3].id = p.stops[2].id; }, 'two stops may not share an id');
  throws(p => { p.stops[0].lat = 220; }, 'a stop has to be on Earth');
  throws(p => { p.lines[0].stops = ['s0']; }, 'a line has to go somewhere');
  throws(p => { p.lines[0].stops[2] = 'nowhere'; }, 'and may only call at stops the pack holds');
}

{
  // projection: the city keeps its shape, which is what makes it recognisable
  const pack = synthCity();
  const board = { w: 860, h: 600, margin: 46 };
  const at = project(pack, board);
  eq(at.size, pack.stops.length, 'every stop lands on the board');

  let inside = true;
  for (const p of at.values()) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) inside = false;
    if (p.x < 0 || p.y < 0 || p.x > board.w || p.y > board.h) inside = false;
  }
  ok(inside, 'and lands on it rather than off the edge');

  // ONE scale for both axes. Fitting each axis to its own range fills the board
  // and stretches the city, which is the difference between a map of somewhere
  // and a picture of a network — and it cannot be seen in any single number
  // except this one: a round city has to come out round.
  const xs = [...at.values()].map(p => p.x), ys = [...at.values()].map(p => p.y);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  ok(Math.abs(w - h) / Math.max(w, h) < 0.06, `a round city comes out round, not stretched to the board (${w.toFixed(0)}x${h.toFixed(0)})`);

  const again = project(pack, board);
  let same = true;
  for (const [id, p] of at) { const q = again.get(id); if (p.x !== q.x || p.y !== q.y) same = false; }
  ok(same, 'and the same pack always projects the same way');
}

{
  // the fitter, judged by its own report
  const pack = synthCity();
  const board = { w: 860, h: 600, margin: 46 };
  const projected0 = project(pack, board);
  const legsOf = pk => {
    const out = [], seen = new Set();
    for (const l of pk.lines) for (let i = 1; i < l.stops.length; i++) {
      const a = l.stops[i - 1], b = l.stops[i];
      if (a === b) continue;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(k)) continue;
      seen.add(k); out.push([a, b]);
    }
    return out;
  };
  const { report: r } = octolinear(projected0, pack.lines);
  ok(r.onGrid >= 0.99, `the whole network reaches the octolinear grid (${(r.onGrid * 100).toFixed(0)}%)`);
  ok(r.worstAngleDeg < 3, `with nothing left visibly off it (worst ${r.worstAngleDeg.toFixed(1)}°)`);
  // …while still being the place. 2% of the board's width is the line between
  // "bent" and "somewhere else"; measured, it comes out at 6 units of 860.
  ok(r.drift < board.w * 0.02, `and the average stop barely moves (${r.drift.toFixed(1)} units of ${board.w})`);
  // The WORST one is allowed to move much further, and that is not a loosened
  // threshold — it is what a transit diagram is for. The stop that moves most
  // here is the far end of the one line that runs out of town, pulled in
  // because its legs are being evened toward the median. Every printed map does
  // this; the Tube map does it to Amersham dramatically. What must not drift is
  // the AVERAGE, which is the check above.
  ok(r.worstDrift < board.w * 0.14, `and the outer terminus is pulled in rather than flung out (${r.worstDrift.toFixed(1)})`);
  // 100% on the grid says NOTHING about whether the legs are all the same size,
  // and the first render came out as a staircase of three-pixel steps beside a
  // neighbour with one long one. Unevened, this city measures 0.31.
  ok(r.spread < 0.1, `and the stops are evenly spaced along a line (spread ${r.spread.toFixed(3)})`);
  const raw = octolinear(project(pack, board), pack.lines, { even: 0 }).report;
  ok(raw.spread > r.spread * 2, `which is the evenness weight doing it, not the city (${raw.spread.toFixed(3)} without)`);

  // …toward the median leg. The reason first written for that was that a long
  // suburban run drags a mean upward — which measured FALSE, so this pins the
  // tie instead of the belief. If a change ever makes the two diverge, that is
  // worth knowing about; it is not worth "fixing" today.
  ok(r.target < r.meanOfLegs, `this city has a long run in it, so its median leg is the shorter (${r.target.toFixed(1)} vs ${r.meanOfLegs.toFixed(1)})`);
  const byMean = octolinear(project(pack, board), pack.lines, { target: r.meanOfLegs }).report;
  ok(Math.abs(r.spread - byMean.spread) < 0.01,
     `and targeting the mean instead measures the same — the median is the more robust of two equal choices, not a measured win (${r.spread.toFixed(3)} vs ${byMean.spread.toFixed(3)})`);

  // The core of a radial city is crowded BEFORE anything is bent: six arms and
  // a ring meeting in the middle put about a fifth of the stops within 12 units
  // of another. That is the projection's doing, not the fitter's, and the fix
  // is a repulsion force this does not have yet — so what is pinned here is the
  // honest invariant: bending and evening must not make the crowding WORSE by
  // much. Measured across four seeds: 18 -> 18, 18 -> 21, 18 -> 21, 17 -> 17.
  const flat = report(projected0, projected0, legsOf(pack), {});
  ok(r.collisions <= flat.collisions + 5,
     `and the fitter does not add crowding of its own (${flat.collisions} before, ${r.collisions} after)`);

  // a leg shared by two lines is one leg. Pulled once per line it would be bent
  // twice as hard as the branches, and the trunk of the network would walk.
  const shared = structuredClone(pack);
  shared.lines.push({ ...shared.lines[0], id: 'dup', colour: 1 });
  const rd = octolinear(project(shared, board), shared.lines).report;
  eq(rd.legs, r.legs, 'a leg two lines share is still one leg');
}

{
  // and the whole job, which is the only entry point anything else should use
  const pack = synthCity(11);
  const out = layout(pack, { w: 860, h: 600, margin: 46 });
  eq(out.stops.length, pack.stops.length, 'layout returns every stop');
  ok(out.stops.every(s => Number.isFinite(s.x) && Number.isFinite(s.y)), 'each with a place on the board');
  ok(out.stops.every(s => s.truth && Number.isFinite(s.truth.x)),
     'and where it really is, kept alongside — a bent stop that has forgotten its own position cannot be put back on a map');
  ok(out.report.onGrid >= 0.99, 'a second board bends as well as the first');
}

{
  // Interchanges, for feeds that do not say which platforms belong together.
  // GTFS has `parent_station` and scripts/gtfs.mjs uses it; OpenStreetMap route
  // relations and hand-made packs have nothing, and there the only evidence is
  // that two stops are a few metres apart and called the same thing.
  const near = (name, lat, lon, id, modes) => ({ id, name, lat, lon, modes });
  const pack = {
    id: 'x', name: 'X', source: 'the gate', licence: 'n/a',
    stops: [
      near('Kamppi', 60.1690, 24.9310, 'a', ['TRAM']),
      near('Kamppi, platform 3', 60.1691, 24.9312, 'b', ['TRAM']),   // 20m away, same place
      near('Kamppi M', 60.1688, 24.9316, 'c', ['SUBWAY']),           // the metro under it
      near('Kamppi', 60.2400, 25.0400, 'far', ['TRAM']),             // same NAME, 8km away
      near('Rautatientori', 60.1710, 24.9410, 'r', ['TRAM']),
      near('Hakaniemi', 60.1790, 24.9510, 'h', ['TRAM']),
    ],
    lines: [
      { id: 'T', name: '1', mode: 'TRAM', colour: 0, stops: ['a', 'b', 'r', 'h'] },
      { id: 'M', name: 'M', mode: 'SUBWAY', colour: 1, stops: ['c', 'r'] },
      { id: 'F', name: '9', mode: 'TRAM', colour: 2, stops: ['far', 'h'] },
    ],
  };
  const m = merge(pack);
  eq(m.stops.length, 4, 'three faces of one interchange become one stop');
  eq(m.merged, 2, 'and it says how many it folded');
  ok(m.stops.some(s => s.id === 'far'), 'a stop 8km away with the SAME NAME is a different place');

  const host = m.stops.find(s => ['a', 'b', 'c'].includes(s.id));
  eq((host?.modes ?? []).slice().sort().join('+'), 'SUBWAY+TRAM', 'the merged stop serves both modes');
  const tram = m.lines.find(l => l.id === 'T');
  // a,b were two calls at one place; after merging that is ONE call, not a leg
  // of length zero — which would be an unsnappable direction and a NaN angle
  eq(tram.stops.length, 3, 'a line calling at two platforms of one station calls once');

  // proximity ALONE would merge the tram stop into whatever is across the
  // junction; the name is what stops it
  const loose = merge({ ...pack, stops: [...pack.stops, near('Simonkatu', 60.1690, 24.9311, 's', ['TRAM'])] });
  ok(loose.stops.some(s => s.id === 's'), 'a different place 10m away keeps its own name and its own dot');

  const off = merge(pack, { metres: 0 });
  eq(off.stops.length, pack.stops.length, 'and it can be turned off');
}

{
  // Two views from ONE pack, which is the whole design: a diagram is unusable
  // for finding a stop and a street map is unusable as a board, so the mode
  // needs both and neither is a preference.
  const pack = synthCity();
  // give it a street and a path, the way a real feed does
  pack.streets = [
    { rank: 2, pts: [[60.169, 24.931], [60.171, 24.941], [60.179, 24.951]] },
    { rank: 0, pts: [[60.160, 24.900], [60.163, 24.914]] },
  ];
  // the path has to belong to THIS line — built from its own first two stops
  // with a bend put between them, the way a street that curves does
  {
    const l = pack.lines[0];
    const a = pack.stops.find(s => s.id === l.stops[0]);
    const b = pack.stops.find(s => s.id === l.stops[1]);
    l.path = [[a.lat, a.lon], [(a.lat + b.lat) / 2 + 0.0004, (a.lon + b.lon) / 2], [b.lat, b.lon]];
  }
  const board = { w: 860, h: 600, margin: 46 };

  const dia = layout(pack, board);
  const st = layout(pack, board, { view: 'street' });
  eq(dia.view, 'diagram', 'the default view is the board');
  eq(st.view, 'street', 'and the street map is asked for by name');

  // A street view is the projection UNTOUCHED — that is what makes it a map.
  // Bending it even slightly puts a stop on the wrong side of a junction, which
  // is the one thing this view exists to get right.
  let exact = true;
  for (const s of st.stops) if (Math.abs(s.x - s.truth.x) > 1e-9 || Math.abs(s.y - s.truth.y) > 1e-9) exact = false;
  ok(exact, 'a street view leaves every stop exactly where it really is');
  ok(dia.stops.some(s => Math.hypot(s.x - s.truth.x, s.y - s.truth.y) > 1), 'and the diagram does not');

  // ONE projection for both. Two that disagree by a pixel are a tram running
  // beside its own street rather than down it.
  const first = st.stops.find(s => s.id === pack.lines[0].stops[0]);
  ok(st.lines[0].path?.length >= 2, 'a line in the street view carries its path in board units');
  ok(Math.hypot(st.lines[0].path[0].x - first.x, st.lines[0].path[0].y - first.y) < 3,
     'and the path starts on the stop, so the line runs down the street rather than beside it');
  ok(st.streets.length === 2 && st.streets[0].pts.every(p => Number.isFinite(p.x)),
     'the streets are projected through the same transform');
  eq(st.streets[0].rank, 2, 'and keep their weight, so a trunk road can be drawn heavier than a lane');

  // the diagram must NOT carry a path: a bent line has no curve to trace, and
  // drawing the true one over bent stops is a lie about both
  ok(dia.lines.every(l => l.path === null), 'the diagram carries no path, because a bent line has no real curve');
  eq(dia.streets.length, 0, 'and no streets, because it is not a map');

  // a scale, so a street can be drawn at a believable width rather than a guess
  ok(st.metresPerUnit > 0 && Number.isFinite(st.metresPerUnit), `the view knows its own scale (${st.metresPerUnit.toFixed(0)} m per board unit)`);

  let threw = false;
  try { validCity({ ...pack, streets: [{ rank: 0, pts: [[60, 24]] }] }); } catch { threw = true; }
  ok(threw, 'a street with one point is refused');
}

// ── reading a real feed ─────────────────────────────────────────────────
// GTFS is a zip of CSVs, and scripts/gtfs.mjs reads both halves without a
// dependency — which is the only way a city pack can exist in a repo with no
// build step. The fixture is built here rather than checked in: a gate that
// needs somebody else's 40 MB feed beside it is a gate that stops being run.

// a genuine zip, both compression methods, real CRCs
function zipOf(files, { method = 8 } = {}) {
  const parts = [], dir = [];
  let at = 0;
  for (const [name, textIn] of files) {
    const raw = Buffer.from(textIn, 'utf8');
    const body = method === 8 ? deflateRawSync(raw) : raw;
    const nb = Buffer.from(name, 'utf8');
    // an extra field in the LOCAL header and NOT in the directory, which is
    // what real zips do (timestamps, unix uids) and what makes reading the body
    // at the directory's offsets land in the middle of a file
    const extra = Buffer.from([0x55, 0x54, 0x05, 0x00, 0x03, 1, 2, 3, 4]);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc32(raw) >>> 0, 14); local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nb.length, 26);
    local.writeUInt16LE(extra.length, 28);
    parts.push(local, nb, extra, body);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(method, 10); cd.writeUInt32LE(crc32(raw) >>> 0, 16);
    cd.writeUInt32LE(body.length, 20); cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nb.length, 28); cd.writeUInt32LE(at, 42);
    dir.push(cd, nb);
    at += 30 + nb.length + extra.length + body.length;
  }
  const cdBuf = Buffer.concat(dir);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12); eocd.writeUInt32LE(at, 16);
  return Buffer.concat([...parts, cdBuf, eocd]);
}

// One tram, one metro, one bus that must be filtered out; a short working that
// must LOSE to the full line; a stop name with a comma in it; a BOM on the
// first file and CRLF in the big one — all four of which real agencies ship.
const FEED = [
  ['routes.txt', '﻿route_id,route_short_name,route_long_name,route_type,route_color\n'
    + 'T1,1,Ring,0,00985F\nM1,M,Metro,1,FF6319\nB9,9,Bus,3,\n'],
  ['trips.txt', 'route_id,service_id,trip_id,shape_id\n'
    + 'T1,S,t_full,shp_T\nT1,S,t_short,shp_T\nM1,S,m_full,shp_M\nB9,S,b1,shp_B\n'],
  // The path the vehicle really traces, which for a tram IS the street it runs
  // down. Deliberately dense and deliberately out of sequence order: a real
  // shape is thousands of points at metre resolution, and nothing promises the
  // rows are sorted. The middle points here are very nearly collinear, so a
  // thinner that works throws most of them away.
  ['shapes.txt', 'shape_id,shape_pt_sequence,shape_pt_lat,shape_pt_lon\n'
    + 'shp_T,3,60.1730,24.9450\nshp_T,1,60.1690,24.9310\nshp_T,2,60.1710,24.9380\n'
    + 'shp_T,4,60.1750,24.9480\nshp_T,5,60.1790,24.9510\nshp_T,6,60.1840,24.9490\n'
    + 'shp_M,1,60.1685,24.9315\nshp_M,2,60.1660,24.9200\nshp_M,3,60.1630,24.9140\n'
    + 'shp_B,1,60.2000,24.9000\nshp_B,2,60.2100,24.9100\n'],
  ['stop_times.txt', ('trip_id,stop_sequence,stop_id\n'
    // the SHORT working first, so "take the longest pattern" and "take the
    // first one you see" cannot agree — they did in the first cut of this
    // fixture, and the check passed with the rule inverted
    + 't_short,1,a\nt_short,2,b\n'
    // …and deliberately out of order: GTFS does not promise sorted rows
    + 't_full,3,c\nt_full,1,a\nt_full,2,b\nt_full,5,e\nt_full,4,d\n'
    // the metro calls at the OTHER platform of the same station the tram uses
    + 'm_full,1,x\nm_full,2,y\nm_full,3,z\n'
    + 'b1,1,p\nb1,2,q\n').replace(/\n/g, '\r\n')],
  // A GTFS stop is a PLATFORM. `a` and `x` are two faces of one interchange and
  // `location_type` 1 / `parent_station` say so; an unmerged pack draws them as
  // two dots a few metres apart and stitches both lines through the pair.
  ['stops.txt', 'stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\n'
    + 'K,Kamppi,60.1685,24.9315,1,\n'
    + 'a,"Kamppi, platform 3",60.169,24.931,0,K\n'
    + 'x,Kamppi M platform 1,60.168,24.932,0,K\n'
    + 'b,Rautatientori,60.171,24.941,0,\nc,Hakaniemi,60.179,24.951,0,\n'
    + 'd,Sornainen,60.187,24.961,0,\ne,Kallio,60.184,24.949,0,\n'
    + 'y,Ruoholahti,60.163,24.914,0,\nz,Lauttasaari,60.159,24.881,0,\n'
    + 'p,Bus1,60.20,24.90,0,\nq,Bus2,60.21,24.91,0,\n'],
];

{
  for (const method of [0, 8]) {
    const how = method === 0 ? 'stored' : 'deflated';
    const files = tries(() => readZip(zipOf(FEED, { method })), `a ${how} zip is readable`, new Map());
    eq(files.size, FEED.length, `a ${how} zip gives up every file`);
    eq(files.get('stops.txt')?.toString('utf8').split('\n')[0],
       'stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station',
       `and the bytes come back intact (${how})`);
  }
  let threw = false;
  try { readZip(Buffer.from('this is not a zip at all, not even slightly')); } catch { threw = true; }
  ok(threw, 'and something that is not a zip says so rather than reading garbage');
}

{
  // A UTF-8 BOM on the first file turns `route_id` into `﻿route_id`, so
  // every lookup of the first column silently misses and the whole feed reads
  // as empty. Agencies really do ship it.
  const csv = parseCsv('﻿route_id,name\nT1,Ring\n');
  eq(csv.at(csv.rows[0], 'route_id'), 'T1', 'a BOM does not eat the first column');
  // …and this is the one that actually holds the strip in place. The line
  // above passes either way, because JS `.trim()` counts U+FEFF as whitespace
  // and the header lookup trims — so it proved nothing until the raw header
  // was checked too.
  eq(csv.head[0], 'route_id', 'and the raw header is clean, not merely trimmable');

  // and a stop name with a comma is ONE field
  const q = parseCsv('id,name,n\na,"Kamppi, platform 3",2\n');
  eq(q.at(q.rows[0], 'name'), 'Kamppi, platform 3', 'a quoted comma stays inside its field');
  eq(q.at(q.rows[0], 'n'), '2', 'and every column after it stays put');
  const dq = parseCsv('id,name\na,"the ""Ring"" line"\n');
  eq(dq.at(dq.rows[0], 'name'), 'the "Ring" line', 'a doubled quote is one quote');

  eq(modeOf('0'), 'TRAM', 'route_type 0 is a tram');
  eq(modeOf('1'), 'SUBWAY', 'and 1 is a metro');
  eq(modeOf('3'), 'BUS', 'and 3 is a bus');
  eq(modeOf('900'), 'TRAM', 'the extended codes map back onto the same handful');
}

{
  const net = tries(() => packFromGtfs(readZip(zipOf(FEED)), { modes: ['TRAM', 'SUBWAY'] }),
                    'a feed reads end to end', { stops: [], lines: [] });
  eq(net.lines.length, 2, 'the bus is not in a tram-and-metro pack');
  const tram = net.lines.find(l => l.id === 'T1') ?? { stops: [] };
  // the 06:14 that turns back early is not the line as anybody thinks of it,
  // and picking the first trip in the file picks one of those half the time
  eq(tram.stops.length, 5, 'a route is drawn by its LONGEST pattern, not its first');
  eq(tram.stops.join(','), 'K,b,c,d,e', 'in stop_sequence order, whatever order the file was in');
  eq(tram.hex, '#00985F', 'and in the operator’s own colour when it has one');
  // 5 tram calls + 2 more metro ones, with the shared interchange counted once —
  // NOT 8, which is what an unmerged pack gives
  eq(net.stops.length, 7, 'only the stops those lines call at, platforms folded into stations');
  // guarded, because a gate that THROWS instead of failing stops before it has
  // run the rest of itself — which is how one broken reader hid four checks
  const kamppi = net.stops.find(s => s.id === 'K') ?? {};
  eq(kamppi.name, 'Kamppi', 'a platform is drawn as the STATION it belongs to');
  eq((kamppi.modes ?? []).slice().sort().join('+'), 'SUBWAY+TRAM',
     'and the two lines that call at its two platforms meet at one node');
  ok(!net.stops.some(s => s.id === 'a' || s.id === 'x'), 'the platforms themselves are not on the diagram');

  // the path on the ground, which is what a street view draws
  ok(Array.isArray(tram.path) && tram.path.length >= 2, `a line carries the path the vehicle traces (${tram.path?.length} points)`);
  eq(tram.path?.[0]?.[0], 60.169, 'starting where the shape starts, in sequence order not file order');
  ok(tram.path.length < 6, `and thinned — ${tram.path?.length} points from 6, the near-collinear ones dropped`);
  ok(net.lines.every(l => l.mode !== 'BUS'), 'and the bus shape is not carried for a route nobody drew');

  let threw = false;
  try { packFromGtfs(readZip(zipOf(FEED)), { modes: ['FERRY'] }); } catch { threw = true; }
  ok(threw, 'asking for a mode the city does not run says so rather than writing an empty pack');

  // …and the whole way through: a feed becomes a diagram
  const pack = { id: 't', name: 'T', source: 'the gate', licence: 'n/a', ...net };
  const out = tries(() => layout(pack, { w: 860, h: 600, margin: 46 }),
                    'a feed lays out', { stops: [], report: { onGrid: 0 } });
  eq(out.stops.length, 7, 'a feed read off disk lays out like any other pack');
  ok(out.report.onGrid >= 0.99, 'and lands on the grid');
}

// ── a REAL city ─────────────────────────────────────────────────────────
// Everything above this runs on a synthetic network, and a synthetic network
// was too kind: it scored the octolinear fitter at 100% and real Kallio scores
// it at 46%. So the real pack is in the gate, and what it pins is not "this
// works" but WHAT IS TRUE — including the part that does not work, because a
// known failure that nothing measures quietly becomes a forgotten one.
//
// `toko-move/cities/kallio.json` is real HSL tram and metro geometry, built by
// `scripts/city-pack-kallio.mjs` from the extract flow-core fetched (PR #305).
{
  const here = dirname(fileURLToPath(import.meta.url));
  const file = join(here, '..', 'cities', 'kallio.json');
  ok(existsSync(file), 'the repo carries a real city pack, not only generated ones');

  if (existsSync(file)) {
    const pack = tries(() => JSON.parse(readFileSync(file, 'utf8')), 'the real pack parses', null);
    const board = { w: 900, h: 640, margin: 40 };

    ok(!!pack && validCity(pack) === pack, 'and it is a well-formed pack');
    // CC BY 4.0 makes the credit a condition, not a courtesy
    ok(/HSL|Helsingin/.test(pack?.source ?? ''), `it names HSL as its source ("${pack?.source}")`);
    eq(pack?.licence, 'CC BY 4.0', 'and carries the licence that requires that');
    ok(!!pack?.clippedTo, 'and says it is a window on Helsinki rather than Helsinki');

    // 82 platforms are 65 stations, and the feed does not say so — no
    // `parent_station` here, so `merge()` has to work it out from position and
    // name alone, which is the case every non-GTFS source will be in.
    const m = merge(pack);
    eq(pack.stops.length, 82, 'the extract has 82 platforms in it');
    eq(m.stops.length, 65, 'which merge() folds to 65 stations with no parent_station to help it');

    const st = layout(pack, board, { view: 'street' });
    eq(st.lines.filter(l => l.path?.length > 1).length, st.lines.length,
       'every line in the street view follows the path its vehicle really traces');
    let exact = true;
    for (const s of st.stops) if (Math.abs(s.x - s.truth.x) > 1e-9) exact = false;
    ok(exact, 'and every stop sits exactly where it really is');

    // ── the known failure, pinned ──────────────────────────────────────
    // The relaxation cannot lay out a real network: 46% of legs on the grid
    // against 100% on the synthetic city, and it is structural — 34 of the 65
    // stations have more than four legs meeting at them, and an octolinear node
    // has only eight directions to hand out. Eight sweeps of every weight
    // changed nothing; more rounds oscillate rather than converge.
    //
    // This asserts the failure so that fixing it BREAKS THE GATE, which is the
    // only way a number nobody is looking at ever gets looked at again.
    const dia = layout(pack, board);
    ok(dia.report.onGrid < 0.7,
       `KNOWN BAD, and pinned so a fix is visible: the octolinear fitter reaches only `
       + `${(dia.report.onGrid * 100).toFixed(0)}% of legs on a real network. If this check `
       + `FAILS, the fitter got better — raise the bar and delete this note (CITIES.md).`);

    let crowded = 0;
    const deg = new Map();
    for (const l of m.lines) for (let i = 1; i < l.stops.length; i++) {
      for (const id of [l.stops[i - 1], l.stops[i]]) deg.set(id, (deg.get(id) ?? 0) + 1);
    }
    for (const n of deg.values()) if (n > 4) crowded++;
    ok(crowded > 20, `and the reason is countable: ${crowded} stations have more than four legs meeting at them`);
  }
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
  // the road, which shipped at 1.19:1 against the ground and was invisible in
  // a screenshot while every state assertion about it passed. A gate that can
  // only see `works` cannot see `looks` — but it can see a contrast ratio.
  ok(cr(PAL.road, PAL.paper) >= 2, `a laid road is visible on the ground (${cr(PAL.road, PAL.paper).toFixed(2)}:1)`);
  ok(cr(PAL.road, PAL.water) >= 1.8, 'and tellable from the river');
  ok(cr(PAL.ink, PAL.road) >= 4.5, 'while a building still reads on top of it');
  ok(cr(PAL.paper, PAL.road) >= 2, 'and so does a paper-filled car');
  ok(cr(PAL.roadLine, PAL.road) >= 2, 'the centre stripe is a stripe, not a rumour');

  // The street map under a city view. Same failure as the road, and it was
  // made the same day: the first cut drew the quietest street at 1.24:1, which
  // is not a quiet street but no street.
  ok(cr(PAL.streets[0], PAL.paper) >= 1.3,
     `the quietest street is visible on the paper (${cr(PAL.streets[0], PAL.paper).toFixed(2)}:1)`);
  let rising = true;
  for (let i = 1; i < PAL.streets.length; i++) {
    if (cr(PAL.streets[i], PAL.paper) <= cr(PAL.streets[i - 1], PAL.paper)) rising = false;
  }
  ok(rising, 'and each weight of street is darker than the one below it');
  // the streets are the GROUND and the network is the subject — a motorway
  // that shouts louder than a tram line inverts the picture
  const quietestLine = Math.min(...PAL.lines.map(c => cr(c, PAL.paper)));
  ok(cr(PAL.streets[PAL.streets.length - 1], PAL.paper) < quietestLine,
     `while the loudest still sits under the quietest line (${cr(PAL.streets[3], PAL.paper).toFixed(2)} vs ${quietestLine.toFixed(2)})`);
  ok(PAL.streetInk.length === PAL.streets.length && PAL.streetInk.every((w, i) => i === 0 || w > PAL.streetInk[i - 1]),
     'and width carries the hierarchy alongside the colour');

  ok(INK.line > INK.station, 'the network is drawn heavier than the stops on it');
  ok(INK.lineGap > INK.line, 'two lines sharing a leg are pushed further apart than they are wide');
}

console.log(`\ntoko-move core: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log('  FAIL  ' + f);
process.exit(fails.length ? 1 : 0);
