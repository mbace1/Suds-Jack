// THE RUNS (v2.73, runs.js) — the ladder in bare node: the table, what opens
// what, the stars, the save and what a broken save does, which visit plays
// which run, and the levers a run turns (the halt, the deck, the director —
// these were the v2.70 mutators' checks, and the levers are the same).
//
//   node toko-move/test/runs.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RUNS, BY_ID, ORDER, loadRuns, unlocked, extrasOpen, nextRun, starsFor, record, resolveRun, runHref } from '../js/runs.js';
import { headwayWith, rushWith, startMinute, haltFamily, haltMinutes, pickWeighted } from '../js/mutators.js';
import { drawSchedule, ENCOUNTERS, MOODS, EventDirector } from '../js/events.js';
import { skinFor } from '../js/skin.js';
import { HEADWAY_MIN } from '../js/live-network.js';
import { CARGO } from '../js/deliveries.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const P = q => new URLSearchParams(q);
const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
const KEY = 'tokoMoveRuns';

// ── 1. the ladder (owner: "Easy, medium, hard and night runs")
ok(ORDER.join() === 'easy,medium,hard,night', 'four runs, easiest first, NIGHT last');
for (const r of RUNS) {
  ok(r.name && r.title && r.blurb && r.blurb.length < 90 && r.glyph, `${r.id}: a name, a title, one sentence`);
  ok(r.target >= 3 && r.par > 0, `${r.id}: asks for ${r.target} jobs, par ${r.par}`);
  ok(Object.keys(r.moods || {}).every(k => MOODS[k]), `${r.id}: biases only real moods`);
  ok(!r.cargo || r.cargo.every(c => CARGO[c]), `${r.id}: deals only real parcels`);
}
for (let i = 1; i < RUNS.length; i++) ok(RUNS[i].target >= RUNS[i - 1].target, `${RUNS[i].id} asks for no fewer jobs than ${RUNS[i - 1].id}`);
ok(BY_ID.easy.cargo.every(c => !CARGO[c].modes && !CARGO[c].freshness), 'EASY: parcels with no rules to learn yet');
ok(BY_ID.easy.board === 'short' && ['medium', 'hard', 'night'].every(id => !BY_ID[id].board), 'EASY: a short board — the three cheapest jobs that fit, no hand-offs');
ok(/challenge\.shortBoard=true/.test(fs.readFileSync(new URL('../js/core-v212.js', import.meta.url), 'utf8')) && /this\.shortBoard\?fits\.slice\(0,3\)/.test(fs.readFileSync(new URL('../js/deliveries.js', import.meta.url), 'utf8')), 'and the dispatcher reads it');
ok(BY_ID.easy.deadline > 1 && BY_ID.easy.rival === false && BY_ID.easy.sealed === false && BY_ID.easy.weather === 'clear' && BY_ID.easy.disruptions === 0, 'EASY: a generous clock, no rival, no sealed parcel, clear sky, no held lines');
ok(Object.entries(BY_ID.easy.moods).every(([m, w]) => (m === 'warning' || m === 'notice') ? w === 0 : true), 'EASY: no warning or notice cards — only the kind ones');
ok(BY_ID.medium.cityDay && BY_ID.medium.rival && BY_ID.medium.sealed, 'MEDIUM: the city happens, the rival and the sealed parcel are in it');
ok(BY_ID.hard.rush === 'max' && BY_ID.hard.halt && BY_ID.hard.headway < 1, 'HARD: the rush at its peak, every line provisioned tighter, one family halted');
ok(BY_ID.night.skin === 'night' && BY_ID.night.startHour === 23 && BY_ID.night.headway === 2 && BY_ID.night.rush === 'off', 'NIGHT: the night board, 23:00, half the trams, no rush');

// ── 2. what opens what
{ const s = mem(); let all = loadRuns(s);
  ok(ORDER.map(id => unlocked(id, all)).join() === 'true,false,false,false', 'a new player: EASY open, the rest locked');
  ok(nextRun(all) === 'easy' && !extrasOpen(all), 'and EASY is next; the daily and the week are shut');
  let r = record('easy', { delivered: 2, target: 3, late: 0, score: 500 }, s);
  ok(r.stars === 0 && !r.done && r.opened.length === 0 && !unlocked('medium', loadRuns(s)), 'two of three is NOT YET: nothing opens');
  r = record('easy', { delivered: 3, target: 3, late: 2, score: 400 }, s);
  ok(r.done && r.first && r.stars === 1 && r.opened.join() === 'medium', 'every job delivered, some late: complete, one star, MEDIUM opens');
  r = record('easy', { delivered: 3, target: 3, late: 0, score: 1200 }, s);
  ok(r.stars === 3 && !r.first && r.opened.length === 0 && loadRuns(s).easy.stars === 3, 'on time at par: three stars, kept; nothing new opens twice');
  r = record('easy', { delivered: 3, target: 3, late: 3, score: 100 }, s);
  ok(loadRuns(s).easy.stars === 3 && loadRuns(s).easy.best === 1200, 'a worse run never takes stars or a best away');
  ok(loadRuns(s).easy.plays === 4, 'every attempt is counted');
  ok(nextRun(loadRuns(s)) === 'medium', 'MEDIUM is next');
  record('medium', { delivered: 4, target: 4, late: 0, score: 100 }, s);
  ok(unlocked('hard', loadRuns(s)) && !unlocked('night', loadRuns(s)), 'MEDIUM opens HARD, not NIGHT');
  record('hard', { delivered: 5, target: 5, late: 1, score: 100 }, s);
  r = record('night', { delivered: 5, target: 5, late: 0, score: 100 }, s);
  ok(r.extrasOpened && extrasOpen(loadRuns(s)), 'clearing NIGHT opens the daily and the week (owner: ladder first, rest after)');
  ok(nextRun(loadRuns(s)) === 'night', 'with every run done, the title offers NIGHT'); }

// ── 3. stars never gate, and say what they mean
ok(starsFor(BY_ID.easy, { delivered: 3, target: 3, late: 0, score: BY_ID.easy.par - 1 }) === 2, '★★ every job on time');
ok(starsFor(BY_ID.easy, { delivered: 3, target: 3, late: 0, score: BY_ID.easy.par }) === 3, '★★★ on time AND at par');
ok(starsFor(BY_ID.easy, { delivered: 3, target: 3, late: 1, score: 5000 }) === 1, 'late is ★ however high the score');
ok(starsFor(BY_ID.hard, { delivered: 4, target: 5, late: 0, score: 9999 }) === 0, 'four of five is not complete');

// ── 4. a broken save is a new player, never a crash and never a free unlock
{ const s = mem();
  s.setItem(KEY, '{"easy":'); ok(ORDER.every(id => !loadRuns(s)[id].done), 'mangled JSON reads as a new player');
  s.setItem(KEY, '[1,2,3]'); ok(!loadRuns(s).easy.done, 'an array reads as a new player');
  s.setItem(KEY, JSON.stringify({ easy: { done: 'yes' }, medium: { done: 1, stars: 99 } })); const all = loadRuns(s);
  ok(!all.easy.done && !all.medium.done && all.medium.stars === 3, 'only a real true is done, and stars are clamped to three');
  ok(!unlocked('hard', all), 'a forged "done" opens nothing'); }
{ const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  ok(loadRuns(bad).easy.done === false && record('easy', { delivered: 3, target: 3, late: 0, score: 1 }, bad).done, 'blocked storage: the run still completes, it is just not kept'); }

// ── 5. which visit plays which run
{ const fresh = loadRuns(mem()), s = mem(); record('easy', { delivered: 3, target: 3, late: 0, score: 1 }, s); const one = loadRuns(s);
  ok(resolveRun(P(''), {}, fresh) === BY_ID.easy, 'the bare address IS the ladder: a new player plays EASY');
  ok(resolveRun(P(''), {}, one) === BY_ID.medium, 'and after EASY, MEDIUM');
  ok(resolveRun(P('run=night'), {}, fresh) === BY_ID.easy, 'a typed link to a locked run plays the next open one instead');
  ok(resolveRun(P('run=easy'), {}, one) === BY_ID.easy, 'an open run can always be played again');
  ok(resolveRun(P('run=bogus'), {}, fresh) === BY_ID.easy, 'an unknown run is the next one');
  ok(resolveRun(P('shift=3'), { other: true }, fresh) === null, 'a pinned shift is the classic game (testers, the bot)');
  ok(resolveRun(P('shift=3&run=easy'), { other: true }, fresh) === BY_ID.easy, 'unless it names a run');
  ok(resolveRun(P(''), { live: true }, fresh) === null && resolveRun(P('run=easy'), { week: true }, fresh) === null, 'LIVE and the week wear no run');
  ok(runHref('medium', '?shift=4&day=none&lang=fi') === './?shift=4&lang=fi&run=medium', 'a run link keeps a pinned shift and the language, nothing else');
  ok(runHref('hard', '') === './?run=hard', 'and from the bare address it is just the run');
  ok(runHref('medium', '?classic&lang=fi') === './?lang=fi&classic=&run=medium', 'v3.0: a run link from the real-time game keeps it the real-time game'); }
const core = fs.readFileSync(new URL('../js/core-v212.js', import.meta.url), 'utf8');
ok(/const CLASSIC=\['shift','daily','day','weather','rush','kit'\]/.test(core), 'core: any tester parameter keeps the classic rules');
ok(/kind:'run',run:RUN\.id,seed:1000\+Math\.floor\(Math\.random\(\)\*9000\)/.test(core), 'core: a run is a FRESH shift every attempt (owner: a new shift each time)');
ok(/targetOverride=RUN\.target/.test(core) && /cargoPool=RUN\.cargo/.test(core) && /limit:\(KIT_FX\.limit\|\|1\)\*RUN\.deadline/.test(core), 'core: a run sets the jobs, the parcels and the deadlines before the first dispatch');

// EASY's one card is met by someone who never walks (v2.73: on a fresh shift
// it was sometimes a walking card, and the stranger gate met none)
{ let walking = 0, met = 0; for (let s = 1; s <= 400; s++) for (const e of drawSchedule(s, 3000, [], BY_ID.easy.encounters, BY_ID.easy.moods, null, BY_ID.easy.places)) if (e.kind === 'encounter') { met++; if (e.card.where === 'walking') walking++; }
  ok(met === 400 && walking === 0, `EASY: one card a shift, never one that waits for a walk (${walking} of ${met})`);
  ok(JSON.stringify(drawSchedule(7, 3000, ['1'], null)) === JSON.stringify(drawSchedule(7, 3000, ['1'], null, null, null, null)), 'no places: the deck is every card, as it was'); }

// ── 6. the levers a run turns
ok(skinFor({ mutator: BY_ID.night.skin }).id === 'night' && skinFor({ mutator: BY_ID.easy.skin || null, weather: { id: 'clear' } }).id === 'day', 'NIGHT wears the night board; the rest wear day paper');
ok(startMinute(BY_ID.night, 7) === 23 * 60 && startMinute(BY_ID.easy, 7) === 7 * 60, 'NIGHT starts at 23:00, the rest at 07:00');
{ const h = headwayWith(BY_ID.night, HEADWAY_MIN); ok(h.TRAM === HEADWAY_MIN.TRAM * 2, 'NIGHT: twice the headway'); }
{ const h = headwayWith(BY_ID.hard, HEADWAY_MIN); ok(Math.abs(h.TRAM - HEADWAY_MIN.TRAM * 0.6) < 1e-9, 'HARD: 0.6× the headway'); }
ok(headwayWith(BY_ID.easy, HEADWAY_MIN) === HEADWAY_MIN && headwayWith(null, HEADWAY_MIN) === HEADWAY_MIN, 'EASY and a classic shift keep the timetable');
{ const base = () => 0.42;
  ok(rushWith(BY_ID.night, true, base).on === false && rushWith(BY_ID.easy, true, base).on === false, 'no rush on NIGHT or EASY');
  const r = rushWith(BY_ID.hard, false, base); ok(r.on && r.load() === 1, 'HARD: the rush at its peak all shift');
  const z = rushWith(BY_ID.medium, true, base); ok(z.on && z.load === base, 'MEDIUM: the ordinary morning curve'); }

// ── 4. the halt: a tram family, seeded, recovering after two jobs
const fams = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '13', '15', 'M1', 'M2'];
{ const f = haltFamily(7, fams); ok(fams.includes(f) && !/^M/.test(f), `the halted family is a tram (${f}), never the metro — the safe spine`);
  ok(haltFamily(7, fams) === f && haltFamily(7, [...fams].reverse()) === f, 'seeded, and blind to the order the board lists lines');
  ok(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => haltFamily(s, fams))).size >= 4, 'different shifts halt different families');
  ok(haltFamily(7, ['M1', 'M2']) === null, 'a board with no trams has nothing to halt'); }
ok(BY_ID.hard.halt.atMin === 10, 'HARD: a family halted from about 07:10');
ok(BY_ID.hard.halt.recoverJobs === 2, 'and it recovers after 2 jobs');
for (let s = 0; s < 40; s++) { const m = haltMinutes(s, BY_ID.hard); ok(m >= 28 && m <= 44, `the halt lasts 28–44 min if no jobs lift it (${m})`); }

// ── 5. a run biases the deck, and a classic shift deals exactly what it did
ok(pickWeighted(ENCOUNTERS, 12345, null) === ENCOUNTERS[12345 % ENCOUNTERS.length], 'no weights is the old draw, card for card');
for (let seed = 1; seed <= 60; seed++) {
  const a = drawSchedule(seed, 3000, ['1', '2'], null), b = drawSchedule(seed, 3000, ['1', '2'], null, null, null);
  ok(JSON.stringify(a.map(e => [e.card.id, e.at, e.line])) === JSON.stringify(b.map(e => [e.card.id, e.at, e.line])), `seed ${seed}: no moods deals the same schedule`);
}
// shares are measured at the run's own deck size: EASY deals ONE card, so a
// mood weighted to zero never appears (with three, a repeat falls through to
// the next card in the deck whatever its mood)
const share = (moods, mood, cards = null) => { let hit = 0, all = 0; for (let s = 1; s <= 400; s++) for (const e of drawSchedule(s, 3000, [], cards, moods)) if (e.kind === 'encounter') { all++; if (e.card.mood === mood) hit++; } return hit / all; };
for (const m of RUNS.filter(r => r.moods)) for (const [mood, w] of Object.entries(m.moods).filter(([, w]) => w !== 1)) {
  const base = share(null, mood, m.encounters), got = share(m.moods, mood, m.encounters);
  ok(w > 1 ? got > base : w === 0 ? got === 0 : got < base, `${m.id}: ${mood} ${w > 1 ? 'up' : 'down'} (${(base * 100).toFixed(0)}% → ${(got * 100).toFixed(0)}%)`);
}
{ const s = drawSchedule(9, 3000, ['1', '2', '4'], null, null, { line: '4', lines: ['4', '4T'], atTick: 400, minutes: 30, recoverJobs: 2 });
  const d = s.filter(e => e.kind === 'disruption');
  ok(d.length === 1 && d[0].line === '4' && d[0].at === 400 && d[0].recoverJobs === 2 && d[0].lines.join() === '4,4T', 'a HARD run holds ITS family, on time, and only that one');
  ok(d[0].card.minutes === 30 && /halted/.test(d[0].card.text('4')), 'its card says the line is halted'); }


// ── 6. the director runs the halt: on its own time, both variants, lifted by two jobs
{ // a seed whose first card is due BEFORE the halt — a card waiting for the
  // courier to be somewhere used to hold everything behind it in the queue
  const seed = [...Array(400).keys()].find(s => drawSchedule(s, 3000, [], null).some(e => e.kind === 'encounter' && e.at < 400));
  ok(seed != null, 'a seed with a card due before ten minutes exists');
  const layers = [{ id: 'a', name: '4', visible: true }, { id: 'b', name: '4T', visible: true }, { id: 'c', name: '2', visible: true }];
  const net = { transit: { layers }, holds: [], hold(l, f, u) { this.holds.push({ layerId: l.id, from: f, until: u }); } };
  const said = [], tm = { flow: { clock: { tick: 0, ticksPerDay: 3000 } }, shift: { hours: 1.25 }, transit: { layers }, liveNetwork: net, challenge: { index: 0, active: { cargo: 'parcel' }, say: t => said.push(t) }, mobility: { status: () => ({ kind: 'riding' }) } };
  const dir = new EventDirector(tm, seed, { halt: { line: '4', lines: ['4', '4T'], atTick: 400, minutes: 30, recoverJobs: 2 } });
  for (let t = 0; t < 400; t++) { tm.flow.clock.tick = t; dir.step(); }
  ok(!dir.activeHolds().length, 'nothing is held before its time');
  tm.flow.clock.tick = 400; dir.step();
  ok(dir.activeHolds().length === 1 && net.holds.length === 2, 'on time, both variants of the family held, even with a card waiting');
  ok(dir.heldLayer(layers[1]) && !dir.heldLayer(layers[2]), 'the board asks per layer: 4T is held, 2 is not');
  ok(said.some(t => /4 is halted/.test(t)), 'the feed says the line is halted');
  tm.challenge.index = 1; tm.flow.clock.tick = 500; dir.step();
  ok(dir.activeHolds().length === 1, 'one job does not lift it');
  tm.challenge.index = 2; tm.flow.clock.tick = 600; dir.step();
  ok(!dir.activeHolds().length && net.holds.every(h => h.until === 600), 'the second job lifts it, on the board as well as the card');
  ok(said.some(t => /^4 is running again\.$/.test(t)), 'and the feed says it is running again');
}

console.log(`  runs: ${n} checks`);
