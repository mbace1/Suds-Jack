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

import { ROOMS, LAB } from '../js/rooms.js?v=3';
import {
  check, estimate, REACH, LEVEL, TELL, CLOCK, SOLID_CHARS, W, H, GROUND,
  ground, mound, pit, bank, chasm, machine, robot, startAt, exitAt,
  ladder, ledge, checkpoint, flagAt, golden, boltRun, belt, tarp, TARP_RISE,
  swingBall, hazard,
} from '../js/parts.js?v=4';
import { slugOf, parseSlug, PER_WORLD } from '../js/levelid.js?v=16';

// a hundred bolts is the level's completion figure, so most of the BAD rooms
// below would fail on the count alone and say nothing about what they are
// FOR. This is the filler that lets each one break exactly one rule.
const hundred = [boltRun(GROUND + 1, 0, 49), boltRun(GROUND + 2, 0, 49)];
const furniture = (flagX = 90) => [checkpoint(48), flagAt(flagX), golden(GROUND + 3, [10, 20, 30]), ...hundred];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? '\n         → ' + d : ''))); };

console.log(`the kid's budget: step ${REACH.step} tiles (jump reaches ${REACH.jumpUp.toFixed(2)}), `
  + `gap ${REACH.gap} tiles (a run carries ${REACH.jumpAcross.toFixed(2)})\n`);

// ---- the telegraph floor -------------------------------------------------
// DESIGN §4.1, and it is about a six-year-old: "telegraph ≥ 1.0 s before
// anything can touch you." All three of these clocks were under it — 0.80,
// 0.55 and 0.85 — because the rule lived in a document and the numbers lived
// in three different modules.
console.log(`the telegraph floor: ${TELL.toFixed(1)}s before anything can touch you\n`);
{
  const warn = CLOCK.skitter.notice + CLOCK.skitter.wind;
  ok(`the skitter warns for ${warn.toFixed(2)}s before it lunges`, warn >= TELL);
  ok(`the vent lights its collar for ${CLOCK.vent.warn.toFixed(2)}s before it blows`,
    CLOCK.vent.warn >= TELL);
  ok(`the ball winds back for ${CLOCK.ball.wind.toFixed(2)}s before it swings`,
    CLOCK.ball.wind >= TELL);
  // A hopper never BECOMES dangerous — it is dangerous continuously and
  // identically — so what it owes is a rhythm slow enough to read rather
  // than a warning.
  ok(`the hopper's rhythm is readable (${CLOCK.hopper.cycle.toFixed(2)}s a cycle)`,
    CLOCK.hopper.cycle >= 1.2);
}
console.log('');

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

  // and every obstacle is either kid-sized, has a ladder on its face, or has
  // a machine that clears it
  const ladderFor = (at, size) => c.ladders.some((l) =>
    l.c >= at - 2 && l.c <= at + size + 1 && l.cy1 >= GROUND + size - 1);
  const orphan = c.obstacles.filter((o) => {
    const passable = o.kind === 'step'
      ? (o.size <= REACH.step || ladderFor(o.at, o.size))
      : o.size <= REACH.gap;
    return !passable && !o.clears;
  });
  ok(`${room.name}: nothing blocks the way with no answer`, orphan.length === 0,
    orphan.map((o) => `${o.kind} ${o.size} at x=${o.at}`).join(', '));

  // ---- the shape of a level (DESIGN §4) ---------------------------------
  ok(`${room.name}: is about ONE thing, and says which`, typeof c.idea === 'string' && c.idea.length > 0);

  ok(`${room.name}: carries the level's ${LEVEL.bolts} bolts and ${LEVEL.golden} golden ones`,
    c.bolts.length === LEVEL.bolts && c.golden.length === LEVEL.golden,
    `${c.bolts.length} bolts, ${c.golden.length} golden`);

  ok(`${room.name}: has a midway checkpoint`, !!c.checkpoint
    && c.checkpoint.x > W * 0.3 && c.checkpoint.x < W * 0.7,
    c.checkpoint ? `x=${c.checkpoint.x} (${Math.round((c.checkpoint.x / W) * 100)}%)` : 'none');

  ok(`${room.name}: ends in a ${c.finish.kind} past everything in it`,
    c.finish.x > c.checkpoint?.x && c.finish.x < W,
    `${c.finish.kind} at x=${c.finish.x}`);

  // the ride is the peak, not the way in
  for (const o of c.obstacles.filter((q) => q.clears)) {
    ok(`${room.name}: the ride's payoff sits in the back half (${o.kind} at x=${o.at})`,
      o.at >= W * 0.45, `${Math.round((o.at / W) * 100)}% through the room`);
  }

  // ---- how long it takes, and how much of it is on foot ----------------
  // DESIGN §4: "60–90 seconds first time through, ~40 once learned", and §1:
  // the platforming "is 80% of playtime". This is the LEARNED run, so it is
  // the floor the 60–90 sits above.
  const e = estimate(room);
  console.log(`       ${e.total.toFixed(0)}s learned · ${Math.round(e.onFoot * 100)}% on foot · `
    + `ride ${e.parts.ride.toFixed(0)}s · run ${e.parts.run.toFixed(0)}s`);
  ok(`${room.name}: is a level, not a landscape (${e.total.toFixed(0)}s learned)`,
    e.total > 20 && e.total < 120);
  ok(`${room.name}: the platformer is the spine (${Math.round(e.onFoot * 100)}% on foot)`,
    e.onFoot >= 0.6);

  // both ends of every ladder
  for (const l of c.ladders) {
    const landed = solidAt(l.c - 1, l.cy1) || solidAt(l.c + 1, l.cy1);
    ok(`${room.name}: the ladder at x=${l.c} has a deck to step off onto`, landed,
      `tops out at cy=${l.cy1}`);
  }
}

// ---- the address (js/levelid.js) ----------------------------------------
// A world is a NAMING layer over the flat site list, so the thing to prove is
// that the two never disagree: every level has exactly one address, and every
// address round-trips back to the level it names. The mapping is arithmetic
// and covers the whole planned twelve, so it is proved PAST the rooms that
// exist — the address space is complete before the rooms are, which is what
// makes #eeri-2-1 a link somebody can hold today.
{
  console.log('\nthe address:');
  ok('EERI 1-1 is the first level', slugOf(0, ROOMS.length) === 'eeri-1-1');
  ok('EERI 1-2 is the second level of world one', slugOf(1, ROOMS.length) === 'eeri-1-2');
  ok('EERI 2-1 is the first level of world two', slugOf(3, 12) === 'eeri-2-1');
  ok('EERI 4-3 is the last of the planned twelve', slugOf(11, 12) === 'eeri-4-3');

  let round = true;
  for (let i = 0; i < 12; i++) {
    const q = parseSlug('#' + slugOf(i, 12));
    if (!q || q.index !== i) { round = false; break; }
  }
  ok('every address round-trips back to its own level', round);

  ok('a world is three levels, as DESIGN §4.1 fixes it', PER_WORLD === 3);
  ok('the gizmo lab is addressed, and is not a level',
    slugOf(ROOMS.length, ROOMS.length) === 'lab' && parseSlug('#lab')?.lab === true);

  // forgiving on the way in, because a child or a parent types these
  ok('the bare form works too', parseSlug('1-2')?.index === 1);
  ok('case does not matter', parseSlug('#EERI-1-2')?.index === 1);
  ok('a missing hash does not matter', parseSlug('eeri-1-2')?.index === 1);

  // …and strict about nonsense, so the caller can fall back rather than
  // build a room that is not there
  ok('nonsense addresses are refused rather than guessed at',
    ['', '#', '#eeri', '#1-0', '#0-1', '#1-4', '#eeri-1', 'x', '#1-2-3', null]
      .every((b) => parseSlug(b) === null));
  console.log('');
}

// ---- the gizmo lab -------------------------------------------------------
// NOT a level — it is the standalone reference for the kit, the way
// toko-drop keeps enemy-lab.html — so it is held to every STRUCTURAL rule a
// level is, and to none of the shape rules (its length is whatever proving
// the kit takes). A gizmo that cannot be placed legally fails here, before
// anybody spends it on level 4.
{
  const r = check(LAB);
  ok('the gizmo lab is a legal room', r.ok, r.problems.join('\n         → '));
  const c = r.compiled;
  ok(`the lab exercises both gizmos (${c.belts.length} belts, ${c.tarps.length} tarps)`,
    c.belts.length >= 2 && c.tarps.length >= 2);
  ok('the lab runs a belt each way, since a belt IS its direction',
    new Set(c.belts.map((b) => b.dir)).size === 2);
  console.log(`       a tarp throws you ${TARP_RISE.toFixed(1)} tiles — `
    + `about twice the jump's ${REACH.jumpUp.toFixed(2)}\n`);
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

// ---- and the same for the level SHAPE ------------------------------------
// The rules above keep a room walkable. These keep it a LEVEL: the four
// beats, the midway gate, the hundred bolts, the three secrets. Every one of
// them is a rule the owner set that used to live only in a document.

bites('a ladder that tops out in mid-air', {
  name: 'BAD/ladder-top',
  parts: [ground(), startAt(4), ladder(30, GROUND, 9), ...furniture()],
}, 'nothing to step off onto');

bites('a ladder standing on nothing', {
  name: 'BAD/ladder-foot',
  parts: [ground(), startAt(4), pit(28, 32), ladder(30, GROUND, 8),
    ledge(31, 36, 8), ...furniture()],
}, 'nothing to stand on under it');

bites('a level with no checkpoint', {
  name: 'BAD/no-checkpoint',
  parts: [ground(), startAt(4), flagAt(90), golden(GROUND + 3, [10, 20, 30]), ...hundred],
}, 'no checkpoint');

bites('a level whose ride opens it instead of crowning it', {
  name: 'BAD/early-ride',
  parts: [ground(), startAt(4), machine('excavator', 8, [4, 30]),
    bank(14, 18, 3), ...furniture()],
}, 'a ride is beat 3–4');

bites('a flag planted before the last thing in the level', {
  name: 'BAD/early-flag',
  parts: [ground(), startAt(4), flagAt(40), pit(60, 63), checkpoint(48),
    golden(GROUND + 3, [10, 20, 30]), ...hundred],
}, 'goes past everything in it');

bites('ninety-nine bolts under a HUD that says a hundred', {
  name: 'BAD/count',
  parts: [ground(), startAt(4), checkpoint(48), flagAt(90),
    golden(GROUND + 3, [10, 20, 30]), boltRun(GROUND + 1, 0, 49), boltRun(GROUND + 2, 0, 48)],
}, 'and the hud says');

bites('a golden bolt you would collect by walking', {
  name: 'BAD/not-hidden',
  parts: [ground(), startAt(4), checkpoint(48), flagAt(90),
    golden(GROUND, [10, 20, 30]), ...hundred],
}, 'not a secret');

bites('a bolt hung where nothing can reach it', {
  name: 'BAD/unreachable',
  parts: [ground(), startAt(4), checkpoint(48), flagAt(90),
    golden(GROUND + 3, [10, 20, 30]),
    boltRun(GROUND + 1, 0, 49), boltRun(GROUND + 2, 0, 48), boltRun(H - 2, 60, 60)],
}, 'out of reach');

// The slack rule cannot fire on a room that is otherwise legal — sizes are
// whole tiles, so the widest legal gap already leaves 0.85 and the tallest
// legal step 0.65. Its real job is the other direction: to catch the KID
// changing under levels that were proved against the old numbers. So that is
// what the bite does — weakens the jump and checks the levels notice.
{
  const jump = REACH.jumpUp;
  REACH.jumpUp = 2.2;
  bites('a step the budget no longer covers, after the kid\'s jump changed', {
    name: 'BAD/slack',
    parts: [ground(), startAt(4), mound(40, 44, 2), ...furniture()],
  }, 'slack');
  REACH.jumpUp = jump;
}

// From the other design instance's playtest — somebody played it and got
// stuck, which is the best provenance a rule can have. The ball hung across
// the excavator's only run to the bank it was meant to dig, and a hit takes
// the RIDE, so the ride kept ending on its way to its own job.
bites('a swinging ball parked in the machine\'s only run to its job', {
  name: 'BAD/ride-blocked',
  parts: [ground(), startAt(4), machine('excavator', 50, [44, 92]),
    swingBall(70, 8), bank(84, 88, 3), ...furniture()],
}, 'stands in the excavator\'s only run');

bites('a steam vent parked in the same place', {
  name: 'BAD/ride-vented',
  parts: [ground(), startAt(4), machine('excavator', 50, [44, 92]),
    hazard(70, 'steam'), bank(84, 88, 3), ...furniture()],
}, 'stands in the excavator\'s only run');

bites('a belt that walks you off an edge you did not choose', {
  name: 'BAD/belt',
  parts: [ground(), startAt(4), pit(41, 43), belt(36, 40, GROUND - 1, 1), ...furniture()],
}, 'may not walk you off an edge');

bites('a tarp that throws you into a ceiling', {
  name: 'BAD/tarp',
  parts: [ground(), startAt(4), tarp(40, 43, GROUND - 1), ledge(40, 43, GROUND + 2), ...furniture()],
}, 'into a ceiling');

bites('a robot patrolling a deck that is not there', {
  name: 'BAD/deck-robot',
  parts: [ground(), startAt(4), ledge(30, 34, 8), robot(30, 40, 'hopper', 9), ...furniture()],
}, 'no deck under');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
