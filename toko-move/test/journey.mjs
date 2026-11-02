// THE JOURNEY (v3.0, journey.js) in bare node: the network it is played on,
// the card grammar, the rules a hop keeps, the clock that moves only by what
// you choose, the halt, the deck, and the ladder's difficulty bands — measured
// by two bots over sixty fresh shifts of every run, the numbers runs.js quotes.
//
//   node toko-move/test/journey.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from '../js/journey.js';
import { RUNS, BY_ID } from '../js/runs.js';
import { buildRealHelsinki } from '../js/real-helsinki.js';
import { MOODS } from '../js/events.js';
import { CARGO } from '../js/deliveries.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const net = J.network(buildRealHelsinki(JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json', import.meta.url), 'utf8'))));

// ── 1. the network: real places, real lines, plausible walks
ok(net.nodes.size >= 20, `${net.nodes.size} named places`);
ok(net.lines.length >= 25 && net.lines.every(l => l.nodes.every(id => net.nodes.has(id))), `${net.lines.length} line variants, every stop a named place`);
ok(net.lines.some(l => l.mode === 'metro') && net.lines.some(l => l.mode === 'tram'), 'trams and the metro');
ok(net.walks.length > 0 && net.walks.every(w => w.km <= J.WALK_KM), `${net.walks.length} walks, none over ${J.WALK_KM} km`);
ok(net.lines.every(l => l.sourceId), 'every line knows its HSL geometry (the board rides it)');
{ const best = J.bestTable(net, {}); const ids = [...net.nodes.keys()];
  ok(ids.every(a => ids.every(b => Number.isFinite(best[a][b]))), 'every place reaches every other');
  ok(ids.every(a => best[a][a] === 0) && J.bestTable(net, { headway: 2 }).lasipalatsi.kamppi >= best.lasipalatsi.kamppi, 'half the trams is never faster'); }

// ── 2. a bot, two ways to play
const POLICIES = {
  // reads the board: the hop that leaves the least to go; the cheapest card
  reader: c => c.kind === 'route' && c.options[0].hop ? c.options.map((o, k) => [o.hop.total, k]).sort((a, b) => a[0] - b[0])[0][1]
    : c.kind === 'story' || c.kind === 'halt' ? c.options.map((o, k) => [o.price, k]).sort((a, b) => a[0] - b[0])[0][1] : 0,
  left: () => 0,
};
const play = (run, seed, policy, watch = null) => { const s = J.newRun(net, run, seed); let steps = 0;
  while (s.phase !== 'end' && steps++ < 500) { const c = J.card(net, s); if (!c) break; watch?.(c, s); const r = J.choose(net, s, POLICIES[policy](c, s)); if (r.error) throw new Error(`${run.id} ${seed}: ${r.error}`); }
  return { s, steps }; };

// ── 3. the card grammar (art bible §4): one mood, one line, two priced buttons
{ let cards = 0, kinds = new Set(), bad = [], twoRoute = 0, routes = 0;
  for (const run of RUNS) for (let k = 1; k <= 25; k++) for (const pol of ['reader', 'left']) play(run, 500 + k, pol, (c, s) => {
    cards++; kinds.add(c.kind);
    if (!MOODS[c.mood] || !c.text || !c.options.length || c.options.length > 2) bad.push(`${c.kind}: ${c.text}`);
    if (c.options.some(o => !o.label || !(o.price >= 0) || o.price % 10)) bad.push(`price ${c.kind}`);
    if (c.kind === 'route') { routes++; if (c.options.length === 2) twoRoute++;
      const p = c.options.map(o => o.price); if (p[1] != null && p[0] > p[1]) bad.push('the cheaper hop is not on the left');
      const rule = CARGO[s.job.cargo] || {};
      for (const o of c.options) { const h = o.hop; if (!h) continue;
        if (h.kind === 'walk' && rule.heavy) bad.push(`${s.job.cargo} walked`);
        if (h.kind === 'ride' && rule.modes && !rule.modes.includes(h.line.mode)) bad.push(`${s.job.cargo} on the ${h.line.mode}`);
        if (h.kind === 'ride' && J.halted(s, h.line.family)) bad.push(`a ride on the halted ${h.line.family}`);
        if (h.to === s.at) bad.push('a hop to where you stand'); } }
  });
  ok(!bad.length, `every card keeps the grammar and the rules (${cards} cards) ${bad.slice(0, 3).join(' | ')}`);
  ok(['dispatch', 'route', 'story', 'halt'].every(k => kinds.has(k)), `all four kinds are dealt (${[...kinds]})`);
  ok(twoRoute / routes > 0.85, `a stop is nearly always a choice of two (${twoRoute}/${routes})`); }

// ── 4. the clock moves ONLY by what you choose
{ let off = 0, ended = 0, stuck = 0;
  for (const run of RUNS) for (let k = 1; k <= 30; k++) for (const pol of ['reader', 'left']) { const { s, steps } = play(run, 900 + k, pol);
    const sum = s.log.reduce((a, l) => a + l.price, 0); if (Math.min(sum, J.SHIFT_SECONDS) !== s.clock) off++;
    if (s.phase === 'end') ended++; if (steps >= 500) stuck++; }
  ok(off === 0, `the clock is the sum of the prices chosen (${off} runs disagree)`);
  ok(ended === 240 && stuck === 0, `every run ends — all delivered or the shift over — and none loops (${ended}/240, ${stuck} stuck)`); }

// ── 5. determinism: a run is its seed, and its rng is one integer
{ const a = play(BY_ID.hard, 4242, 'left').s, b = play(BY_ID.hard, 4242, 'left').s, c = play(BY_ID.hard, 4243, 'left').s;
  ok(JSON.stringify(a.log) === JSON.stringify(b.log) && a.score === b.score, 'the same seed plays the same shift');
  ok(JSON.stringify(a.log) !== JSON.stringify(c.log), 'another seed, another shift');
  ok(Number.isInteger(a.rng) && a.v === 3, 'the whole rng state is one integer (a run serialises)'); }

// ── 6. dispatch: take it, or pay a minute for another
{ const s = J.newRun(net, BY_ID.medium, 77), first = s.offer.to; const c = J.card(net, s);
  ok(c.kind === 'dispatch' && c.options[0].price === 0 && c.options[1].price === J.REROLL_S, 'Take it is free; Ask for another is a minute');
  J.choose(net, s, 1); ok(s.clock === J.REROLL_S && s.offer.to !== first, 'another is never the same drop');
  J.choose(net, s, 0); ok(s.job && s.job.limit > 0 && s.phase !== 'dispatch', 'taken: a job with a deadline'); }
{ let far = 0, near = 0; for (let k = 1; k <= 200; k++) { const s = J.newRun(net, BY_ID.easy, k), m = J.newRun(net, BY_ID.medium, k); near = Math.max(near, s.offer.best); far = Math.max(far, m.offer.best); }
  ok(near < far, `EASY's short board sends you less far than MEDIUM's (${Math.round(near / 60)} vs ${Math.round(far / 60)} min)`);
  ok(far <= BY_ID.medium.reach * 60, `MEDIUM never sends you past its reach (${Math.round(far / 60)} min)`); }
ok(RUNS.every(r => !r.cargo || r.cargo.every(c => CARGO[c])), 'every run deals real parcels');
{ const seen = new Set(); for (let k = 1; k <= 120; k++) seen.add(J.newRun(net, BY_ID.easy, k).offer.cargo);
  ok([...seen].every(c => BY_ID.easy.cargo.includes(c)), `EASY deals only its own parcels (${[...seen]})`); }

// ── 7. the halt (HARD): a family stops; route round it or wait it out
{ let met = 0, waited = 0, around = 0;
  for (let k = 1; k <= 60; k++) { const s = J.newRun(net, BY_ID.hard, 3000 + k); let steps = 0;
    ok(s.halt && s.halt.until > s.halt.from, `HARD ${3000 + k}: a family is halted for a while`);
    while (s.phase !== 'end' && steps++ < 500) { const c = J.card(net, s);
      if (c.kind === 'halt') { met++; ok(c.text.includes(s.halt.family) && c.options[1].price === Math.round((s.halt.until - s.clock) / 10) * 10, 'the halt card names the family and prices the wait honestly');
        const i = k % 2; J.choose(net, s, i); if (i) { waited++; ok(s.halt.lifted && !J.halted(s, s.halt.family), 'waiting it out lifts it'); } else around++; continue; }
      J.choose(net, s, POLICIES.reader(c, s)); } }
  ok(met >= 15 && waited && around, `the halt is met (${met} of 60 shifts), both ways out are taken`);
  ok(RUNS.filter(r => r.id !== 'hard').every(r => !J.newRun(net, r, 1).halt), 'only HARD halts a line'); }

// ── 8. the story deck: the run's own count, each card once, in its place
{ const bad = [];
  for (const run of RUNS) for (let k = 1; k <= 40; k++) { const s = J.newRun(net, run, 7000 + k);
    if (s.deck.length !== (run.encounters ?? 3)) bad.push(`${run.id} deals ${s.deck.length}`);
    if (new Set(s.deck.map(d => d.card.id)).size !== s.deck.length) bad.push(`${run.id} deals a card twice`);
    if (run.places && s.deck.some(d => !run.places.includes(d.card.where))) bad.push(`${run.id} deals a card out of its places`); }
  ok(!bad.length, `every deck is the run's own (${bad.slice(0, 2)})`); }
{ let seen = 0; const ids = []; play(BY_ID.medium, 8181, 'reader', (c, s) => { if (c.kind === 'story') { seen++; ids.push(s.pending.card.id); } });
  ok(seen >= 1 && new Set(ids).size === ids.length, `a story card is met, and never twice (${ids})`); }

// ── 9. scoring: on time pays, a streak pays more, late pays half
{ const s = J.newRun(net, BY_ID.easy, 31); let out = null, steps = 0;
  while (!out && steps++ < 100) { const c = J.card(net, s); const r = J.choose(net, s, POLICIES.reader(c, s)); if (r.delivered) out = r.delivered; }
  ok(out && !out.late && s.score > 100 && s.streak === 1 && s.results[0] === 'ok', `the first drop on time pays ${s.score}`); }

// ── 10. a dead end is never a dead stop
{ const s = J.newRun(net, BY_ID.medium, 5); J.choose(net, s, 0); s.options = []; s.pending = null;
  const c = J.card(net, s); ok(c.kind === 'route' && c.options.length === 1 && c.options[0].price === J.STUCK_S && !c.options[0].hop, 'with nowhere to go, the card offers the next one');
  const t = s.clock; J.choose(net, s, 0); ok(s.clock === t + J.STUCK_S && J.card(net, s).options.length >= 1, 'and waiting for it moves on'); }

// ── 11. reading the run
{ const s = J.newRun(net, BY_ID.night, 1); ok(J.clockLabel(s) === '23:00', 'NIGHT starts at 23:00'); s.clock = 75 * 60; ok(J.clockLabel(s) === '00:15', 'and ends at 00:15');
  const d = J.newRun(net, BY_ID.easy, 1); ok(J.clockLabel(d) === '07:00' && J.timeLeft(d) === null, 'a day starts at 07:00; no job, no deadline'); }

// ── 12. THE BANDS (runs.js quotes these): sixty fresh shifts of every run
const SEEDS = Array.from({ length: 60 }, (_, k) => 1000 + (k + 1) * 37);
const band = {};
for (const run of RUNS) for (const pol of ['reader', 'left']) {
  const got = SEEDS.map(seed => play(run, seed, pol).s), won = got.filter(J.complete);
  band[`${run.id}.${pol}`] = { won: won.length, onTime: won.filter(s => !s.late).length, scores: won.map(s => s.score).sort((a, b) => a - b) };
}
const line = id => `${id.padEnd(6)} ${band[id + '.reader'].won}/60 (${band[id + '.reader'].onTime}) · ${band[id + '.left'].won}/60 (${band[id + '.left'].onTime})`;
console.log(RUNS.map(r => '  ' + line(r.id)).join('\n'));
ok(band['easy.reader'].won === 60 && band['easy.left'].won >= 57, 'EASY: anyone completes it');
ok(band['medium.reader'].won >= 52 && band['hard.reader'].won >= 46 && band['night.reader'].won >= 40, 'a player who reads the board clears every rung most shifts');
for (const r of RUNS) ok(band[`${r.id}.reader`].won >= band[`${r.id}.left`].won, `${r.id}: reading the board beats tapping left`);
ok(band['easy.left'].won > band['medium.left'].won && band['medium.left'].won > band['hard.left'].won && band['hard.left'].won > band['night.left'].won, 'and the left-tapper is stopped higher up each rung');
for (const r of RUNS) { const sc = band[`${r.id}.reader`].scores, p70 = sc[Math.floor(0.7 * (sc.length - 1))];
  ok(Math.abs(p70 - r.par) <= r.par * 0.12, `${r.id}: par ${r.par} is about the reader's 70th percentile (${p70})`); }

console.log(`  journey: ${n} checks`);
