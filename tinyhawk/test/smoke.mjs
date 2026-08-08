import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ComboSystem, SPECIAL_TRICKS } from '../js/tricks.js';
import { createMetrics, makeGoalSet } from '../js/goals.js';
import { availableNodes, generateTour } from '../js/map.js';
import { PARTS, PartRun } from '../js/meta.js';
import { chooseEvent, pickEvent } from '../js/story.js';
import { FlickIt } from '../js/input.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};

let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++; };

const fullFlick = new FlickIt();
equal(fullFlick.sample(0, 0.72, 0.05, false), null, 'right stick loads the ollie');
const straightPop = fullFlick.sample(0, -0.65, 0.05, false);
equal(straightPop?.dir, 'up', 'down-up right-stick flick pops');
ok(straightPop?.pop, 'ground ollie is marked as a pop');
const springFlick = new FlickIt();
springFlick.sample(0, 0.7, 0.05, false);
equal(springFlick.sample(0, 0.05, 0.06, false)?.dir, 'up', 'spring return to centre pops');
const liftedFlick = new FlickIt();
liftedFlick.sample(0, 0.65, 0.05, false);
const liftedPop = liftedFlick.release(false);
equal(liftedPop?.dir, 'up', 'touch release preserves a loaded pop');
ok(liftedPop?.pop, 'touch release carries grounded pop metadata');
equal(liftedFlick.release(false), null, 'one release cannot emit two pops');
const kickflipFlick = new FlickIt();
kickflipFlick.sample(0, 0.72, 0.05, false);
const kickflipPop = kickflipFlick.sample(-0.75, -0.65, 0.05, false);
equal(kickflipPop?.dir, 'left', 'loaded up-left flick selects kickflip');
ok(kickflipPop?.pop, 'diagonal ground trick also carries the ollie impulse');
const shuvFlick = new FlickIt();
shuvFlick.sample(0, 0.72, 0.05, false);
const shuvPop = shuvFlick.sample(0.75, 0.45, 0.05, false);
equal(shuvPop?.dir, 'down', 'loaded side swipe selects pop shuvit');
ok(shuvPop?.pop, 'side swipe launches from the ground');

const tour = generateTour('smoke');
equal(tour.rows.length, 13, 'tour has thirteen rows');
equal(tour.rows[0].length, 1, 'tour starts at one node');
equal(tour.rows[12][0].type, 'boss', 'tour ends at the rival');
for (let row = 0; row < 12; row++) {
  for (const node of tour.rows[row]) ok(node.next.length >= 1, `${node.id} has a route forward`);
  for (const next of tour.rows[row + 1]) {
    ok(tour.rows[row].some(node => node.next.includes(next.id)), `${next.id} is reachable`);
  }
}
let route = [];
for (let row = 0; row < 13; row++) {
  const choices = availableNodes(tour, route);
  equal(choices.length > 0, true, `row ${row} offers a node`);
  route.push({ nodeId: choices[0] });
}
equal(route.at(-1).nodeId, 'r12n0', 'a valid route reaches the rival');

const goalsA = makeGoalSet('daily:2030-01-02', 0.58);
const goalsB = makeGoalSet('daily:2030-01-02', 0.58);
equal(JSON.stringify(goalsA.goals.map(g => [g.id, g.target])), JSON.stringify(goalsB.goals.map(g => [g.id, g.target])), 'daily goals are deterministic');
const metrics = createMetrics();
for (const goal of goalsA.goals.slice(0, 2)) {
  if (goal.id === 'rails') for (let i = 0; i < goal.target; i++) metrics.rails.add(`r${i}`);
  else if (goal.id === 'score') metrics.score = goal.target;
  else if (goal.id === 'combo') metrics.bestMult = goal.target;
  else if (goal.id === 'grind') metrics.bestGrind = goal.target;
  else if (goal.id === 'manual') metrics.bestManual = goal.target;
  else if (goal.id === 'tricks') metrics.tricks = goal.target;
  else if (goal.id === 'fakie') metrics.fakies = goal.target;
}
ok(goalsA.passed(metrics), 'two of three goals clear a spot');

const combo = new ComboSystem();
combo.begin();
const first = combo.addTrick('left');
const repeat = combo.addTrick('left');
ok(repeat.points < first.points, 'repeating a trick loses value');
combo.land({ spin: 0, airTime: 0.7, fakie: false });
equal(combo.snapshot().score, 0, 'pending points do not pay on landing alone');
const bank = combo.bank();
ok(bank.total > 0 && combo.snapshot().score === bank.total, 'rolling away banks the multiplier');

const insured = new ComboSystem({ insurance: true });
insured.begin();
insured.addTrick('right');
const saved = insured.bail();
ok(saved.insured && saved.saved > 0, 'insurance saves half of the first bailed combo');
insured.begin();
insured.addTrick('right');
equal(insured.bail().saved, 0, 'insurance only fires once per node');

const heated = new ComboSystem();
let specialReady = false;
for (let i = 0; i < 6; i++) {
  heated.begin();
  heated.addTrick(i % 2 ? 'left' : 'right');
  heated.land({ spin: 0, airTime: 0.8, fakie: false });
  specialReady ||= heated.bank().specialReady;
}
ok(specialReady && heated.snapshot().specialLive, 'landed lines fill and activate the special meter');
const signature = heated.addTrick('left');
equal(signature.name, SPECIAL_TRICKS.left.name, 'a live meter upgrades the next flick to a signature trick');
ok(signature.special && heated.snapshot().special < 100, 'signature tricks consume special meter');
heated.bail();
equal(heated.snapshot().specialLive, false, 'a bail kills the live special state');

const run = new PartRun('economy');
equal(run.film, 5, 'part starts with five film');
ok(run.commitNode('r0n0'), 'choosing a node commits the route');
equal(run.pendingNodeId, 'r0n0', 'the committed node survives outside the session');
equal(PartRun.load().pendingNodeId, 'r0n0', 'the committed node survives a reload');
equal(run.commitNode('r1n0'), false, 'a committed node cannot be rerolled');
run.failAttempt();
equal(run.film, 4, 'failed attempt burns one film');
run.restFilm();
equal(run.film, 5, 'rest refills film to the maximum');
run.footage = 999;
ok(run.buy(PARTS[0].id), 'a board part can be bought');
ok(run.modifiers().grindCorrect > 1 && run.modifiers().maxSpeed < 1, 'part preserves its trade-off');
const beforeReward = run.footage;
run.clearNode(run.tour.rows[0][0], { score: 9000, bestMult: 5, line: 'Kickflip + Manual' });
ok(run.footage > beforeReward && run.route.length === 1, 'clearing a spot pays and advances the tape');
equal(run.pendingNodeId, null, 'clearing the spot releases the route commitment');
run.parts.push('insurance-clip');
ok(run.modifiers('r1n0').insurance, 'insurance is live on a fresh node');
run.markInsuranceUsed('r1n0');
equal(run.modifiers('r1n0').insurance, false, 'insurance stays spent across retries of that node');
equal(PartRun.load().modifiers('r1n0').insurance, false, 'spent insurance survives a reload');

const eliteRun = new PartRun('elite-reward');
const elite = eliteRun.tour.nodes.find(node => node.type === 'session');
eliteRun.clearNode(elite, { score: 12000, line: 'Boardslide' });
equal(eliteRun.parts.length, 1, 'clearing a session guarantees a board part');
ok(eliteRun.route[0].partReward, 'the fitted session reward is recorded on the tape');

const event = pickEvent('event-seed', []);
const filmBefore = run.film;
const result = chooseEvent(run, event, 0);
ok(typeof result === 'string' && run.seenEvents.includes(event.id), 'story choice records a persistent consequence');
ok(run.film <= run.maxFilm && filmBefore <= 5, 'story state keeps film inside its current maximum');

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const main = await readFile(new URL('../js/main.js', import.meta.url), 'utf8');
const skaterSource = await readFile(new URL('../js/skater.js', import.meta.url), 'utf8');
for (const id of ['btnFree', 'btnDaily', 'btnPart', 'mapHost', 'specialFill']) ok(index.includes(id), `${id} exists in the shell`);
for (const moduleName of ['tricks.js', 'goals.js', 'map.js', 'meta.js', 'story.js']) ok(main.includes(moduleName), `${moduleName} is wired into the game`);
ok(!index.includes('CONTROL PROTOTYPE'), 'the shipped menu no longer calls itself P0');
for (const part of ['fat-bird-skater', 'fat-bird-belly', 'beak', 'left-wing', 'skateboard-deck']) {
  ok(skaterSource.includes(part), `${part} is present in the permanent character rig`);
}

console.log(`Tiny Hawk smoke: ${checks} checks passed`);
