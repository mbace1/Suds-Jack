// EERI — prove every room can be finished, before it ships.
//
// Mario Maker will not let you upload a level you have not beaten. This is
// that rule as a build step, and it is the piece flashprince never had: its
// editor lets you paint a room and nothing stops you painting an unbeatable
// one — you find out by playing. Here a room that cannot be walked from
// spawn to exit fails the build.
//
// Pure Node, no browser, no deps — the same shape as gameoflife's
// check_levels.mjs. It imports js/parts.js and js/rooms.js directly, which
// is why parts.js touches neither three.js nor the DOM.
//
// Run: node eeri/test/rooms.mjs

import { ROOMS } from '../js/rooms.js?v=1';
import {
  check, REACH, SOLID_CHARS, W, H, GROUND,
  ground, mound, pit, bank, chasm, machine, robot, startAt, exitAt,
} from '../js/parts.js?v=1';

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? '\n         → ' + d : ''))); };

console.log(`the kid's budget: step ${REACH.step} tiles (jump reaches ${REACH.jumpUp.toFixed(2)}), `
  + `gap ${REACH.gap} tiles (a run carries ${REACH.jumpAcross.toFixed(2)})\n`);

for (const room of ROOMS) {
  const r = check(room);
  ok(`${room.name}: can be finished`, r.ok, r.problems.join('\n         → '));

  const c = r.compiled;

  // the room has a way in and a way out, and they are not the same place
  ok(`${room.name}: has a start and an exit, in that order`,
    c.spawn.kid.x < c.exit.x, `start ${c.spawn.kid.x}, exit ${c.exit.x}`);

  // the ground the kid spawns on is solid
  const solidAt = (col, cy) => SOLID_CHARS.includes(c.grid[H - 1 - cy][col]);
  ok(`${room.name}: the kid spawns on solid ground`,
    solidAt(Math.floor(c.spawn.kid.x), GROUND - 1));

  // every machine spawns on solid ground, inside the room
  for (const m of c.machines) {
    ok(`${room.name}: the ${m.type} spawns on solid ground`,
      m.x > 0 && m.x < W && solidAt(Math.floor(m.x), GROUND - 1), 'x=' + m.x);
  }

  // every bolt is inside the room and not buried in rock
  const buried = c.bolts.filter(([row, col]) => SOLID_CHARS.includes(c.grid[row][col]));
  ok(`${room.name}: no bolt is buried in solid tile`, buried.length === 0,
    buried.map(([r2, c2]) => `row ${r2} col ${c2}`).join(', '));

  // the exit is standable
  ok(`${room.name}: you can stand at the exit`,
    solidAt(Math.floor(c.exit.x), GROUND - 1), 'x=' + c.exit.x);

  // and every obstacle is either kid-sized or has a machine that clears it
  const orphan = c.obstacles.filter((o) => {
    const passable = o.kind === 'step' ? o.size <= REACH.step : o.size <= REACH.gap;
    return !passable && !o.clears;
  });
  ok(`${room.name}: nothing blocks the way with no answer`, orphan.length === 0,
    orphan.map((o) => `${o.kind} ${o.size} at x=${o.at}`).join(', '));
}

// ---- and the check has to BITE ------------------------------------------
// A prover that cannot fail proves nothing. These rooms are broken on
// purpose, one way each, and every one of them must be caught. Each is a
// real mistake this project has already made or nearly made.
console.log('\nthe check bites:');
const bites = (name, room, expect) => {
  const r = check(room);
  const hit = !r.ok && r.problems.some((p) => p.toLowerCase().includes(expect));
  ok(`refuses ${name}`, hit, r.ok ? 'it PASSED, and should not have' : r.problems.join(' | '));
};

bites('a step taller than the kid can jump, with no machine', {
  name: 'BAD/step', parts: [ground(), startAt(4), mound(40, 44, 4), exitAt(90)],
}, 'stuck');

bites('a gap wider than a running jump, with no span', {
  name: 'BAD/gap', parts: [ground(), startAt(4), pit(40, 47), exitAt(90)],
}, 'stuck');

bites('a bank with no machine in the room to dig it', {
  name: 'BAD/no-machine', parts: [ground(), startAt(4), bank(40, 44, 3), exitAt(90)],
}, 'no machine in the room provides it');

bites('a machine penned away from its own job by a hole', {
  name: 'BAD/penned',
  parts: [ground(), startAt(4), machine('excavator', 20, [10, 60]),
    pit(30, 33), bank(50, 54, 3), exitAt(90)],
}, 'cut by a hole');

bites('a bank outside the machine\'s track', {
  name: 'BAD/out-of-reach',
  parts: [ground(), startAt(4), machine('excavator', 20, [10, 30]),
    bank(70, 74, 3), exitAt(90)],
}, 'out of the excavator\'s reach');

bites('a machine that spawns off its own track', {
  name: 'BAD/off-track',
  parts: [ground(), startAt(4), machine('excavator', 80, [10, 40]),
    bank(20, 24, 3), exitAt(90)],
}, 'outside its own track');

bites('a robot patrolling across a hole', {
  name: 'BAD/robot',
  parts: [ground(), startAt(4), pit(30, 33), robot(28, 40), exitAt(90)],
}, 'crosses the hole');

bites('a chasm whose machine cannot reach the lip', {
  name: 'BAD/chasm',
  parts: [ground(), startAt(4), machine('excavator', 12, [8, 20]),
    chasm(60, 67), exitAt(90)],
}, 'out of the excavator\'s reach');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
