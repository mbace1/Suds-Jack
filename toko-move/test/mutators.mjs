// THE MUTATORS (v2.70, toko-move/art/itch-bible/MUTATORS.md). A run wears one;
// each is a setting on a lever the game already had. This holds the table to
// the bible and the levers to what they promise — and holds the one thing a
// mutator must never do to a run without one: change it.
//
//   node toko-move/test/mutators.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MUTATORS, BY_ID, resolveMutator, mutateShift, headwayWith, rushWith, startMinute, haltFamily, haltMinutes, pickWeighted } from '../js/mutators.js';
import { drawSchedule, ENCOUNTERS, MOODS, EventDirector } from '../js/events.js';
import { skinFor } from '../js/skin.js';
import { HEADWAY_MIN } from '../js/live-network.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const P = q => new URLSearchParams(q);

// ── 1. the itch v1 core set, and only it (MUTATORS.md: "Itch v1 core set (4)")
ok(MUTATORS.map(m => m.id).join() === 'night,disruption,rush,snow', 'the four core mutators, in the bible\'s order');
for (const m of MUTATORS) {
  ok(m.name && m.glyph && m.blurb && m.blurb.length < 90, `${m.id}: a name, a glyph and one sentence`);
  ok(Object.keys(m.moods || {}).every(k => MOODS[k]), `${m.id}: biases only real moods`);
  ok(Object.keys(m).every(k => ['id', 'name', 'glyph', 'blurb', 'skin', 'startHour', 'headway', 'rush', 'weather', 'halt', 'moods'].includes(k)), `${m.id}: turns only levers the game has — no currency, no route line (MUTATORS.md)`);
}

// ── 2. which runs wear one
ok(resolveMutator(P('')) === null, 'no ?mutator= is no mutator — Default is the Day skin');
ok(resolveMutator(P('mutator=night')) === BY_ID.night, '?mutator=night');
ok(resolveMutator(P('mutator=bogus')) === null, 'an unknown id is no mutator, not an error');
ok(resolveMutator(P('mutator=night'), { live: true }) === null, 'LIVE is the real city and wears none');
ok(resolveMutator(P('mutator=night'), { week: true }) === null, 'a week is its own run and wears none');
{ const daily = { kind: 'daily', seed: 123456, key: '2026-11-01', label: '1 Nov' };
  const m = mutateShift(daily, BY_ID.night);
  ok(m.kind === 'mutator' && m.seed === daily.seed && m.label === '1 Nov', 'a mutator on today\'s address is today\'s city, not the daily');
  ok(mutateShift(daily, null) === daily, 'no mutator leaves the daily alone');
  ok(mutateShift({ kind: 'pinned', seed: 4 }, BY_ID.rush).kind === 'pinned', 'a pinned shift stays pinned'); }
const core = fs.readFileSync(new URL('../js/core-v212.js', import.meta.url), 'utf8');
ok(/kind==='daily'\?todayRecord/.test(core) && /recordDaily\(SHIFT_INFO\.key/.test(core), 'the daily record is still gated on kind daily, which a mutator run is not');

// ── 3. each lever does what the bible says
ok(skinFor({ mutator: 'night' }).id === 'night' && skinFor({ mutator: 'snow' }).id === 'snow', 'Night and Snow Day decide their skins');
ok(skinFor({ mutator: 'disruption' }).id === 'day' && skinFor({ mutator: 'rush' }).id === 'day', 'Disruption and Rush Hour are Day');
ok(startMinute(BY_ID.night, 7) === 23 * 60, 'Night: the clock starts at 23:00');
ok(startMinute(null, 7) === 7 * 60 && startMinute(BY_ID.rush, 7) === 7 * 60, 'everything else starts when the shift does');
{ const h = headwayWith(BY_ID.night, HEADWAY_MIN); ok(h.TRAM === HEADWAY_MIN.TRAM * 2 && h.SUBWAY === HEADWAY_MIN.SUBWAY * 2, 'Night: headways about 2×'); }
{ const h = headwayWith(BY_ID.rush, HEADWAY_MIN); ok(Math.abs(h.TRAM - HEADWAY_MIN.TRAM * 0.6) < 1e-9, 'Rush Hour: headways about 0.6×'); }
ok(headwayWith(null, HEADWAY_MIN) === HEADWAY_MIN && headwayWith(BY_ID.snow, HEADWAY_MIN) === HEADWAY_MIN, 'no mutator and Snow Day leave the timetable alone');
{ const base = () => 0.42;
  ok(rushWith(BY_ID.night, true, base).on === false, 'Night: no rush (opposite hours)');
  const r = rushWith(BY_ID.rush, false, base); ok(r.on === true && r.load() === 1, 'Rush Hour: the rush on, at its peak all shift');
  const z = rushWith(null, true, base); ok(z.on === true && z.load === base, 'no mutator: the ordinary rush curve'); }
ok(BY_ID.snow.weather === 'snow', 'Snow Day: the first-snow weather (walk ×1.4 time ≈ the bible\'s ×0.7 speed)');

// ── 4. the halt: a tram family, seeded, recovering after two jobs
const fams = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '13', '15', 'M1', 'M2'];
{ const f = haltFamily(7, fams); ok(fams.includes(f) && !/^M/.test(f), `the halted family is a tram (${f}), never the metro — the safe spine`);
  ok(haltFamily(7, fams) === f && haltFamily(7, [...fams].reverse()) === f, 'seeded, and blind to the order the board lists lines');
  ok(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => haltFamily(s, fams))).size >= 4, 'different shifts halt different families');
  ok(haltFamily(7, ['M1', 'M2']) === null, 'a board with no trams has nothing to halt'); }
ok(BY_ID.disruption.halt.atMin === 10, 'halted from about 07:10');
ok(BY_ID.disruption.halt.recoverJobs === 2, 'recovers after 2 jobs');
for (let s = 0; s < 40; s++) { const m = haltMinutes(s, BY_ID.disruption); ok(m >= 28 && m <= 44, `the halt lasts 28–44 min if no jobs lift it (${m})`); }

// ── 5. a mutator biases the deck, and no mutator deals exactly what it did
ok(pickWeighted(ENCOUNTERS, 12345, null) === ENCOUNTERS[12345 % ENCOUNTERS.length], 'no weights is the old draw, card for card');
for (let seed = 1; seed <= 60; seed++) {
  const a = drawSchedule(seed, 3000, ['1', '2'], null), b = drawSchedule(seed, 3000, ['1', '2'], null, null, null);
  ok(JSON.stringify(a.map(e => [e.card.id, e.at, e.line])) === JSON.stringify(b.map(e => [e.card.id, e.at, e.line])), `seed ${seed}: no mutator deals the same schedule`);
}
const share = (moods, mood) => { let hit = 0, all = 0; for (let s = 1; s <= 400; s++) for (const e of drawSchedule(s, 3000, [], null, moods)) if (e.kind === 'encounter') { all++; if (e.card.mood === mood) hit++; } return hit / all; };
for (const m of MUTATORS) for (const [mood, w] of Object.entries(m.moods)) {
  const base = share(null, mood), got = share(m.moods, mood);
  ok(w > 1 ? got > base : got < base, `${m.id}: ${mood} ${w > 1 ? 'up' : 'down'} (${(base * 100).toFixed(0)}% → ${(got * 100).toFixed(0)}%)`);
}
{ const s = drawSchedule(9, 3000, ['1', '2', '4'], null, null, { line: '4', lines: ['4', '4T'], atTick: 400, minutes: 30, recoverJobs: 2 });
  const d = s.filter(e => e.kind === 'disruption');
  ok(d.length === 1 && d[0].line === '4' && d[0].at === 400 && d[0].recoverJobs === 2 && d[0].lines.join() === '4,4T', 'a Disruption run holds ITS family, on time, and only that one');
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

console.log(`  mutators: ${n} checks`);
