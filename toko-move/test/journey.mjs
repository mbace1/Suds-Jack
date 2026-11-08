// THE JOURNEY (v3.0, journey.js; Act 1 since v3.1, ACT1.md) in bare node: the
// network it is played on, the card grammar, the rules a hop keeps, the clock
// that moves only by what you choose and what happens, the halt, Act 1's deck
// (tones, stakes, odds as words, sales and contents), the weather, the euros,
// the trams (look only), and the ladder's difficulty bands — measured by two
// bots over sixty fresh shifts of every run, the numbers runs.js quotes.
//
//   node toko-move/test/journey.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from '../js/journey.js';
import { RUNS, BY_ID } from '../js/runs.js';
import { buildRealHelsinki } from '../js/real-helsinki.js';
import { MOODS } from '../js/events.js';
import { CARGO } from '../js/deliveries.js';
import { CARDS, CONTENTS, ODDS, TRAMS } from '../js/cards.js';

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
  // (v3.18: a taxi's euros weigh 25 s each — the reader reads the price as well as the clock)
  reader: c => c.kind === 'route' && c.options[0].hop ? c.options.map((o, k) => [o.hop.total + Math.max(0, -(o.hop.cash || 0)) * 25, k]).sort((a, b) => a[0] - b[0])[0][1]
    : c.kind === 'story' || c.kind === 'halt' ? c.options.map((o, k) => [o.price + (/job gone/.test(`${o.stakes?.win} ${o.stakes?.sure}`) ? 1e6 : 0), k]).sort((a, b) => a[0] - b[0])[0][1] : 0,
  left: () => 0,
};
const play = (run, seed, policy, watch = null) => { const s = J.newRun(net, run, seed); let steps = 0;
  const outs = [];
  while (s.phase !== 'end' && steps++ < 500) { const c = J.card(net, s); if (!c) break; watch?.(c, s); const r = J.choose(net, s, POLICIES[policy](c, s)); if (r.error) throw new Error(`${run.id} ${seed}: ${r.error}`); outs.push(r); }
  return { s, steps, outs }; };

// ── 3. the card grammar (art bible §4): one mood, one line, three priced buttons (v3.18:
// two regular, the third sometimes special or very special)
{ let cards = 0, kinds = new Set(), bad = [], twoRoute = 0, routes = 0, tiers = {};
  for (const run of RUNS) for (let k = 1; k <= 25; k++) for (const pol of ['reader', 'left']) play(run, 500 + k, pol, (c, s) => {
    cards++; kinds.add(c.kind);
    if (!MOODS[c.mood] || !c.text || (c.options.length !== 3 && !(c.kind === 'route' && J.isSealed(s)))) bad.push(`${c.kind} (${c.options.length}): ${c.text}`);
    for (const o of c.options) tiers[o.tier || 'regular'] = (tiers[o.tier || 'regular'] || 0) + 1;
    if (c.options.slice(0, 2).some(o => o.tier === 'very')) bad.push(`${c.kind}: a very special option that is not the third`);
    if (c.options.some(o => !o.label || !(o.price >= 0) || o.price % 10)) bad.push(`price ${c.kind}`);
    if (c.kind === 'route') { routes++; if (c.options.length === 3) twoRoute++;
      const reg = c.options.slice(0, 2).filter(o => ['ride', 'walk'].includes(o.hop?.kind)).map(o => o.price); if (reg.length === 2 && reg[0] > reg[1]) bad.push('the cheaper hop is not on the left');
      const rule = CARGO[s.job.cargo] || {};
      for (const o of c.options) { const h = o.hop; if (!h) continue;
        if (h.kind === 'walk' && rule.heavy) bad.push(`${s.job.cargo} walked`);
        if (h.kind === 'ride' && rule.modes && !rule.modes.includes(h.line.mode)) bad.push(`${s.job.cargo} on the ${h.line.mode}`);
        if (h.kind === 'ride' && J.halted(s, h.line.family)) bad.push(`a ride on the halted ${h.line.family}`);
        if (h.to === s.at) bad.push('a hop to where you stand'); } }
  });
  ok(!bad.length, `every card keeps the grammar and the rules (${cards} cards) ${bad.slice(0, 3).join(' | ')}`);
  ok(['dispatch', 'route', 'story', 'halt'].every(k => kinds.has(k)), `all four kinds are dealt (${[...kinds]})`);
  ok(twoRoute / routes > 0.95, `a stop is a choice of three (${twoRoute}/${routes})`);
  ok(tiers.special > tiers.very && tiers.very > 0 && tiers.regular > tiers.special, `the third is sometimes special, now and then very special (${JSON.stringify(tiers)})`); }

// ── 4. the clock moves ONLY by what you choose (and what it costs you)
{ let off = 0, ended = 0, stuck = 0;
  for (const run of RUNS) for (let k = 1; k <= 30; k++) for (const pol of ['reader', 'left']) { const { s, steps } = play(run, 900 + k, pol);
    const sum = s.log.reduce((a, l) => a + l.price, 0); if (Math.min(sum, J.SHIFT_SECONDS) !== s.clock) off++;
    if (s.phase === 'end') ended++; if (steps >= 500) stuck++; }
  ok(off === 0, `the clock is the sum of the prices chosen and the time outcomes cost (${off} runs disagree)`);
  ok(ended === 240 && stuck === 0, `every run ends — all delivered or the shift over — and none loops (${ended}/240, ${stuck} stuck)`); }

// ── 5. determinism: a run is its seed, and its rng is one integer
{ const a = play(BY_ID.hard, 4242, 'left').s, b = play(BY_ID.hard, 4242, 'left').s, c = play(BY_ID.hard, 4243, 'left').s;
  ok(JSON.stringify(a.log) === JSON.stringify(b.log) && a.score === b.score, 'the same seed plays the same shift');
  ok(JSON.stringify(a.log) !== JSON.stringify(c.log), 'another seed, another shift');
  ok(Number.isInteger(a.rng) && a.v === 5, 'the whole rng state is one integer (a run serialises)'); }

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
  ok(['easy', 'night'].every(id => Array.from({ length: 20 }, (_, k) => J.newRun(net, BY_ID[id], 1 + k)).every(s => !s.halt)), 'EASY and NIGHT never halt a line'); }

// ── 7b. the march (v3.16): a march on Mannerheimintie holds the lines that run along it
{ const fams = J.marchFamilies(net);
  ok(fams.join() === '1,2,4,10', `the lines along Mannerheimintie, Lasipalatsi to the Opera, read off the network (${fams.join(', ')})`);
  const med = Array.from({ length: 60 }, (_, k) => J.newRun(net, BY_ID.medium, 6000 + k)), marched = med.filter(s => s.halt);
  ok(marched.length >= 20 && marched.length <= 40 && marched.every(s => s.halt.cause === 'march' && fams.includes(s.halt.family)), `MEDIUM: every other shift or so a march holds one of them (${marched.length} of 60)`);
  ok(new Set(marched.map(s => s.halt.family)).size >= 2, `and not always the same line (${[...new Set(marched.map(s => s.halt.family))].join(', ')})`);
  const hard = Array.from({ length: 60 }, (_, k) => J.newRun(net, BY_ID.hard, 6000 + k));
  ok(hard.every(s => (s.halt.cause === 'march') === fams.includes(s.halt.family)) && hard.some(s => s.halt.cause === 'march') && hard.some(s => !s.halt.cause),
    `HARD: its held line is the march when it is a Mannerheimintie line (${hard.filter(s => s.halt.cause === 'march').length} of 60), a plain halt otherwise`);
  let met = 0, rode = 0; for (const s0 of marched.slice(0, 20)) { const s = s0; let st = 0;
    while (s.phase !== 'end' && st++ < 400) { const c = J.card(net, s);
      if (c.kind === 'halt') { met++; ok(c.cause === 'march' && /^A march on Mannerheimintie, by the Parliament House\. The \S+ is halted\.$/.test(c.text) && c.text.includes(s.halt.family), 'the march card says where and which line'); }
      if (c.kind === 'route') for (const o of c.options) if (o.hop?.kind === 'ride' && J.halted(s, o.hop.line.family)) rode++;
      J.choose(net, s, 0); } }
  ok(met >= 5 && rode === 0, `the march is met (${met} of 20) and no route offers the held line while it holds`); }

// ── 7c. the run's own levers (v3.16): a perk between jobs, a fork, strikes
{ let perks = 0, offered = 0, forks = 0, struck = 0, forkOk = true;
  for (const run of RUNS) for (let k = 1; k <= 20; k++) { const s = J.newRun(net, run, 7000 + k); let st = 0;
    while (s.phase !== 'end' && st++ < 500) { const c = J.card(net, s);
      if (c.kind === 'perk') { perks++; if (c.options.length === 3 && c.options[0].label !== c.options[1].label && c.options[2].label === 'Keep the cash' && /rest of the shift\.$/.test(c.text)) offered++; }
      if (c.fork) { forks++; if (!(c.text === 'Two jobs come in at once. Pick one.' && c.options.length === 3 && c.options.slice(0, 2).every(o => /→/.test(o.label)) && c.options[2].label === 'Toss a coin')) forkOk = false; }
      J.choose(net, s, 0); }
    if (J.strikesOf(run) && s.strikes >= J.strikesOf(run)) { struck++; ok(!J.complete(s) && s.late >= J.strikesOf(run), `${run.id}: struck out is not complete`); }
    ok(s.perks.length <= Math.max(0, s.done - (J.complete(s) ? 1 : 0)) && new Set(s.perks).size === s.perks.length, `${run.id} ${7000 + k}: a perk per job done, never twice`); }
  ok(perks > 100 && offered === perks, `a perk is drafted between jobs on every run, two different ones a card, or the cash (${perks})`);
  ok(forks >= 40 && forkOk, `a fork offers two jobs on one card (${forks})`);
  ok(struck >= 1, `a left-tapper can strike out of a run (${struck} of 80)`); }

// ── 8. Act 1's deck (ACT1.md §5): every card well formed; a run deals its own
//      tones, places and weather, one card a job, at most one buyer
{ const bad = [], ids = new Set();
  for (const c of CARDS) {
    if (ids.has(c.id)) bad.push(`${c.id} twice`); ids.add(c.id);
    if (!c.text || c.text.length > 130 || !MOODS[c.mood] || !c.tone?.length || !['stop', 'aboard', 'walking', 'any'].includes(c.where)) bad.push(`${c.id}: shape`);
    if (c.tone.some(t => !['fun', 'risky', 'scary'].includes(t))) bad.push(`${c.id}: tone`);
    if (c.cargo && c.cargo.some(k => !CARGO[k])) bad.push(`${c.id}: cargo`);
    const plain = c.options.filter(o => !o.needs);
    if (plain.length < 2) bad.push(`${c.id}: needs two options for any parcel`);
    for (const o of c.options) {
      if (!o.label || !(o.time >= 0) || o.time % 10) bad.push(`${c.id}: ${o.label} price`);
      if (o.risk && (!(o.risk.odds in ODDS) || !o.risk.win?.say || !o.risk.lose?.say)) bad.push(`${c.id}: ${o.label} risk`);
      if (!o.risk && !o.say) bad.push(`${c.id}: ${o.label} says nothing`);
      for (const e of o.risk ? [o.risk.win, o.risk.lose] : [o]) if (e.sell != null && !/\{contents\}/.test(e.say)) bad.push(`${c.id}: a buyer who does not say what was inside`);
    }
    if (c.sale && !c.options.some(o => o.sell != null || o.risk?.win?.sell != null)) bad.push(`${c.id}: a buyer with no sale`);
  }
  ok(!bad.length, `${CARDS.length} cards, every one well formed ${bad.slice(0, 3).join(' | ')}`);
  ok(CARDS.filter(c => c.tone.includes('scary')).length >= 8 && CARDS.filter(c => c.tone.includes('fun')).length >= 15 && CARDS.filter(c => c.tone.includes('risky')).length >= 8, 'enough fun, risky and scary cards for four runs');
  ok(CARDS.filter(c => c.sale).length >= 4 && Object.values(CONTENTS).every(l => l.length >= 4) && Object.keys(CARGO).every(k => CONTENTS[k]), 'buyers, and contents for every parcel kind'); }
{ const bad = [];
  for (const run of RUNS) for (let k = 1; k <= 60; k++) { const s = J.newRun(net, run, 7000 + k);
    if (s.deck.length !== (run.cards ?? 3)) bad.push(`${run.id} deals ${s.deck.length}`);
    if (new Set(s.deck.map(d => d.card.id)).size !== s.deck.length) bad.push(`${run.id} deals a card twice`);
    if (s.deck.filter(d => d.card.sale).length > 1) bad.push(`${run.id} deals two buyers`);
    if (s.deck.some(d => !d.card.tone.some(t => run.tones[t]))) bad.push(`${run.id} deals another run's tone`);
    if (s.deck.some(d => d.card.weather && !d.card.weather.includes(s.weather))) bad.push(`${run.id} deals a ${s.weather} shift a card for other weather`);
    if (run.places && s.deck.some(d => !run.places.includes(d.card.where) && d.card.where !== 'any')) bad.push(`${run.id} deals a card out of its places`); }
  ok(!bad.length, `every deck is the run's own: its tones, its weather, one buyer at most ${bad.slice(0, 2)}`);
  const only = (id, t) => { let n = 0; for (let k = 1; k <= 60; k++) n += J.newRun(net, BY_ID[id], 7000 + k).deck.filter(d => d.card.tone.every(x => x === t)).length; return n; };
  const scary = id => { let n = 0; for (let k = 1; k <= 60; k++) n += J.newRun(net, BY_ID[id], 7000 + k).deck.filter(d => d.card.tone.includes('scary')).length; return n; };
  ok(only('easy', 'scary') === 0 && only('medium', 'scary') === 0 && only('easy', 'risky') === 0 && scary('night') > 150, `EASY is only ever fun, MEDIUM never only scary; NIGHT mostly is (${scary('night')} of 300)`); }
{ let seen = 0; const ids = []; play(BY_ID.medium, 8181, 'reader', (c, s) => { if (c.kind === 'story') { seen++; ids.push(s.pending.card.id); } });
  ok(seen >= 1 && new Set(ids).size === ids.length, `a story card is met, and never twice (${ids})`); }

// ── 9. risk: the odds are words, and the words keep their promise
{ const tally = {}; for (const w in ODDS) tally[w] = { win: 0, n: 0 };
  for (const run of RUNS) for (let k = 1; k <= 150; k++) for (const r of play(run, 20000 + k, 'left').outs) if (r.reveal?.odds) { tally[r.reveal.odds].n++; if (r.reveal.how === 'win') tally[r.reveal.odds].win++; }
  for (const [w, p] of Object.entries(ODDS)) { const t = tally[w], rate = t.win / t.n;
    ok(t.n >= 60 && Math.abs(rate - p) < 0.08, `"${w}" lands ${Math.round(rate * 100)}% of ${t.n} rolls (promised ${p * 100}%)`); } }
{ const c = CARDS.find(x => x.id === 'runforit'), st = J.stakesOf(c.options[0]);
  ok(st.odds === 'maybe' && st.win.join() === '×1.3' && st.lose.join() === '+3:00', `a risky button shows its stakes (${st.odds} ${st.win} · or ${st.lose})`);
  const sure = J.stakesOf(CARDS.find(x => x.id === 'choir').options[0]); ok(sure.sure.join() === '×1.15', `a sure one shows what it does, never its price twice (${sure.sure})`);
  const sale = J.stakesOf(CARDS.find(x => x.id === 'longcoat').options[0]); ok(sale.sure.join('|') === '+€200|job gone|fees ×0.85', `a sale says it costs the job and the fees after (${sale.sure})`);
  ok(J.stakesOf(CARDS.find(x => x.id === 'inspector').options[1]).win.join() === 'fine', 'a risk with nothing to win says "fine"'); }

// ── 10. a sale: big money now, the job gone, dispatch hears, contents named
{ let done = 0;
  for (let k = 1; k <= 200 && !done; k++) { const s = J.newRun(net, BY_ID.medium, 30000 + k); let st = 0;
    while (s.phase !== 'end' && st++ < 300) { const c = J.card(net, s);
      if (c.kind === 'story' && c.sale) { const contents = s.job.contents, score = s.score, job = s.job.to;
        const r = J.choose(net, s, 0); done++;
        ok(r.reveal?.sold && r.reveal.say.includes(contents), `the buyer names what was inside ("${r.reveal.say}")`);
        ok(s.score === score + r.reveal.sold.cash && s.sold === 1 && s.trust === 0.85 && s.done === 0 + s.results.length, `the cash lands, the job is gone, fees after are ×0.85 (€${r.reveal.sold.cash})`);
        ok(s.phase === 'dispatch' && s.offer && s.offer.fee === Math.round(J.feeOf(s.offer) * 0.85), `and dispatch offers the next job at the lower fee (€${s.offer.fee})`);
        break; }
      J.choose(net, s, POLICIES.reader(c, s)); } }
  ok(done === 1, 'a buyer is met and sold to'); }

// ── 11. the money (ACT1.md §2): a fee in euros; the job's multiplier moves it
{ ok(J.feeOf({ best: 600, cargo: 'parts' }) === 19 && J.feeOf({ best: 600, cargo: 'equipment' }) === 28 && J.feeOf({ best: 600, cargo: 'documents' }) === 16, 'ten minutes pays €19 for parts, €28 for equipment (large), €16 for documents (small)');
  const s = J.newRun(net, BY_ID.easy, 31); ok(s.offer.fee === J.feeOf(s.offer) && J.card(net, s).options[0].stakes?.sure?.join() === `€${s.offer.fee}`, `Take it says the fee (€${s.offer.fee})`);
  let out = null, st = 0, fee = 0, cargo = null; while (!out && st++ < 100) { const c = J.card(net, s); const r = J.choose(net, s, POLICIES.reader(c, s)); if (s.job) { fee = s.job.fee; cargo = s.job.cargo; } if (r.delivered) out = r.delivered; }
  ok(out && !out.late && out.pay === Math.round(fee * out.mult), `the first drop on time pays its fee × the job's multiplier (€${fee} ×${out?.mult} = €${out?.pay})`);
  ok(out && CONTENTS[cargo].includes(out.contents), `and the drop names what was inside ("${out?.contents}")`); }
{ let named = 0, all = 0; for (const run of RUNS) for (let k = 1; k <= 30; k++) for (const r of play(run, 40000 + k, 'reader').outs) if (r.delivered) { all++; if (r.delivered.contents) named++; }
  ok(all > 100 && named === all, `every delivery names its contents (${named}/${all})`); }

// ── 12. the weather (ACT1.md §4): drawn from the run's skies; snow is slow
//       walking and fuller trams; a walk wears the weather's stakes
{ const w = id => { const c = {}; for (let k = 1; k <= 120; k++) { const x = J.newRun(net, BY_ID[id], k).weather; c[x] = (c[x] || 0) + 1; } return c; };
  ok(Object.keys(w('easy')).join() === 'clear', 'EASY is always clear');
  for (const id of ['medium', 'hard', 'night']) ok(Object.keys(w(id)).every(x => BY_ID[id].skies.includes(x)) && Object.keys(w(id)).length === BY_ID[id].skies.length, `${id}: ${JSON.stringify(w(id))}`);
  const find = (id, sky) => { for (let k = 1; k < 500; k++) { const s = J.newRun(net, BY_ID[id], k); if (s.weather === sky) return s; } };
  const snow = find('medium', 'snow'), clear = find('medium', 'clear');
  ok(snow.run.walkFactor === 1.4 && snow.run.headway === 1.3 && clear.run.walkFactor === 1, 'snow: walks ×1.4, trams wait ×1.3');
  ok(snow.best.lasipalatsi.kamppi > clear.best.lasipalatsi.kamppi, 'and the deadlines are set from the snow, so it is slow, not unfair');
  let slip = 0, soak = 0; for (let k = 1; k <= 200; k++) { const s = J.newRun(net, BY_ID.hard, k); J.choose(net, s, 0); for (const o of J.card(net, s)?.options || []) if (o.hop?.kind === 'walk' && o.stakes) { if (s.weather === 'snow' && o.stakes.odds === 'usually' && o.stakes.lose.join() === '+1:30') slip++; if (s.weather === 'rain' && o.stakes.lose.join() === '×0.7') soak++; } }
  ok(slip > 5, `in snow a walk can slip you: usually fine · or +1:30 (${slip} walks)`);
  ok(soak >= 0, `in rain a paper parcel on a walk can get wet (${soak} walks)`); }

// ── 13. the trams: a model each ride, LOOK ONLY (signed off), the museum tram rare
{ const c = {}; let metro = 0, rides = 0;
  for (const run of RUNS) for (let k = 1; k <= 60; k++) for (const r of play(run, 50000 + k, 'reader').outs) if (r.hop?.kind === 'ride') { rides++; if (r.hop.line.mode === 'metro') { if (r.hop.model === 'metro') metro++; } else c[r.hop.model] = (c[r.hop.model] || 0) + 1; }
  const trams = Object.values(c).reduce((a, b) => a + b, 0);
  ok(Object.keys(c).every(m => TRAMS.some(t => t.id === m)) && trams + metro === rides, `every tram ride draws a model, the metro is the metro (${JSON.stringify(c)}, metro ${metro})`);
  ok((c.artic || 0) > (c.nr2plus || 0) && (c.museum || 0) / trams < 0.05, `the Artic is commonest and the museum tram rare (${c.museum || 0} of ${trams})`); }
{ // look only: the same seed with every model forced the same rides the same
  const a = play(BY_ID.medium, 777, 'reader').s; ok(a.log.every(l => typeof l.price === 'number'), 'a ride costs what its price says, whatever tram came'); }

// ── 14. a dead end is never a dead stop
{ const s = J.newRun(net, BY_ID.medium, 5); J.choose(net, s, 0); s.options = []; s.pending = null;
  const c = J.card(net, s); ok(c.kind === 'route' && c.options.length === 1 && c.options[0].price === J.STUCK_S && !c.options[0].hop, 'with nowhere to go, the card offers the next one');
  const t = s.clock; J.choose(net, s, 0); ok(s.clock === t + J.STUCK_S && J.card(net, s).options.length >= 1, 'and waiting for it moves on'); }

// ── 15. reading the run
{ const s = J.newRun(net, BY_ID.night, 1); ok(J.clockLabel(s) === '23:00', 'NIGHT starts at 23:00'); s.clock = 75 * 60; ok(J.clockLabel(s) === '00:15', 'and ends at 00:15');
  const d = J.newRun(net, BY_ID.easy, 1); ok(J.clockLabel(d) === '07:00' && J.timeLeft(d) === null, 'a day starts at 07:00; no job, no deadline'); }

// ── 17. STORY ARCS (v3.4, ACT1.md §10): the city remembers
{ const { CALLBACKS, ARCS } = await import('../js/cards.js');
  // a run with no memory deals no arc step — the deck it always dealt
  let arcless = true; for (const run of RUNS) for (let k = 1; k <= 30; k++) if (J.newRun(net, run, 900 + k).deck.some(d => d.card.arc)) arcless = false;
  ok(arcless, 'a run with no memory deals no arc step');
  const step = (m, id) => J.arcStep(m, BY_ID[id])?.id || null;
  ok(step({ runs: 0 }, 'easy') === null && step({}, 'medium') === null, 'never on a first run');
  ok(step({ runs: 1 }, 'easy') === 'dispatch1' && step({ runs: 4, dispatch: 1 }, 'hard') === 'dispatch2' && step({ runs: 4, dispatch: 2 }, 'medium') === 'dispatch3' && step({ runs: 9, dispatch: 4 }, 'easy') === null,
    'Dispatch: one step a run, the one the memory says is next, and then it is over');
  ok(step({ runs: 2 }, 'night') === 'ticket1987' && step({ runs: 2, ticket: 1 }, 'night') === 'dispatch1' && step({ runs: 2, ticket: 1 }, 'easy') === 'inspector1987' && step({ runs: 2, ticket: 2 }, 'easy') === 'dispatch1',
    'the 1987 ticket: found on NIGHT, asked about by day, and then Dispatch again');
  ok(ARCS.every(a => a.options.length === 3 && a.options.every(o => typeof o.time === 'number')) && Object.values(CALLBACKS).every(c => c.options.length === 3), 'every arc and callback card keeps the grammar');
  // at most one arc step a run, in its own job's slot
  let one = true; for (const run of RUNS) for (let k = 1; k <= 20; k++) { const s = J.newRun(net, run, 700 + k, { memory: { runs: 3, ticket: run.id === 'night' ? 0 : 1 } });
    const arcs = s.deck.filter(d => d.card.arc); if (arcs.length !== 1 || arcs[0].job !== arcs[0].card.job) one = false; }
  ok(one, 'with a memory, exactly one arc step, in its own job\'s slot');
  // played: the step is met, answered, and kept for the next run
  { const s = J.newRun(net, BY_ID.easy, 5, { memory: { runs: 3 } }); let met = null, steps = 0;
    while (s.phase !== 'end' && steps++ < 500) { const c = J.card(net, s); if (!c) break; if (c.id === 'dispatch1') met = c; J.choose(net, s, c.id === 'dispatch1' ? 1 : 0); }
    ok(!!met && s.keep.dispatch === 1, `Dispatch's first step is met on a second run, and kept (${JSON.stringify(s.keep)})`); }
  { const s = J.newRun(net, BY_ID.easy, 5, { memory: { runs: 3, ticket: 1 } }); let met = false, steps = 0;
    while (s.phase !== 'end' && steps++ < 500) { const c = J.card(net, s); if (!c) break; if (c.id === 'inspector1987') met = true; J.choose(net, s, 0); }
    ok(met && s.keep.ticket === 2, 'the inspector asks about the ticket, once: the arc closes'); }
  // in a run: a callback is dealt only after its choice, and then it comes
  let after = 0, before = 0, granny = 0;
  for (const run of RUNS) for (let k = 1; k <= 120; k++) { const s = J.newRun(net, run, 3000 + k); const seen = []; let steps = 0;
    while (s.phase !== 'end' && steps++ < 500) { const c = J.card(net, s); if (!c) break; if (c.id) seen.push(c.id); J.choose(net, s, 0); }
    for (const [flag, cb] of Object.entries(CALLBACKS)) { const i = seen.indexOf(cb.id); if (i < 0) continue; const j = seen.indexOf(flag); if (j >= 0 && j < i) after++; else before++; if (flag === 'granny') granny++; } }
  ok(after > 0 && before === 0, `a callback comes back only after its choice (${after} came back, ${before} out of order)`);
  ok(granny > 0, `the granny from Mannerheimintie turns up again (${granny} runs)`);
  // a seed with a memory replays exactly
  const a = J.newRun(net, BY_ID.medium, 77, { memory: { runs: 5, dispatch: 2 } }), b = J.newRun(net, BY_ID.medium, 77, { memory: { runs: 5, dispatch: 2 } });
  for (const s of [a, b]) { let steps = 0; while (s.phase !== 'end' && steps++ < 500) { const c = J.card(net, s); if (!c) break; J.choose(net, s, c.options.length - 1); } }
  ok(JSON.stringify(a.log) === JSON.stringify(b.log) && a.score === b.score, 'a seed with a memory replays exactly');
}

// ── 18. THE RIVAL, THE REGULARS, THE SEALED PARCEL (v3.5, ACT1.md §11)
{ const runTo = (s, pick = c => 0, max = 500) => { const outs = []; let steps = 0; while (s.phase !== 'end' && steps++ < max) { const c = J.card(net, s); if (!c) break; outs.push({ c, r: J.choose(net, s, pick(c, s)) }); } return outs; };
  // the race: MEDIUM and HARD only, on one of the middle jobs, both ways
  ok([...Array(20)].every((_, k) => J.newRun(net, BY_ID.easy, k + 1).rivalJob === -1 && J.newRun(net, BY_ID.night, k + 1).rivalJob === -1), 'no race on EASY or NIGHT');
  ok([...Array(20)].every((_, k) => [1, 2].includes(J.newRun(net, BY_ID.medium, k + 1).rivalJob) && [1, 2].includes(J.newRun(net, BY_ID.hard, k + 1).rivalJob)), 'one race a run on MEDIUM and HARD, on a middle job');
  let card = null, won = 0, lost = 0, fair = true;
  for (const run of [BY_ID.medium, BY_ID.hard]) for (let k = 1; k <= 40; k++) for (const o of runTo(J.newRun(net, run, 4000 + k), (c, s) => POLICIES[k % 2 ? 'reader' : 'left'](c, s))) {
    if (o.c.rival && !card) card = o.c;
    const d = o.r.delivered; if (d?.race) { if (d.race === 'won') won++; else lost++; if ((d.race === 'won') !== (d.took <= d.eta)) fair = false; } }
  ok(!!card && /The other courier wants it too\.$/.test(card.text) && card.options[0].label === 'Race her' && /^beat \d\d:\d\d$/.test(card.options[0].stakes.odds), `the race is a card with its clock on the button (${card?.options[0].stakes.odds})`);
  ok(won > 0 && lost > 0 && fair, `the race pays both ways, decided by the time your choices took (${won} won, ${lost} lost)`);
  // the regulars: named on the card, a tip from their standing, standing kept
  let named = null, tipped = null;
  for (let k = 1; k <= 200 && !(named && tipped); k++) { const st = { flor: 3, print: 3, dock: 3, lab: 3, cafe: 3, shop: 3 }, s = J.newRun(net, BY_ID.easy, 5000 + k, { standing: st });
    for (const o of runTo(s)) { if (o.c.kind === 'dispatch' && / for (Riikka|Seppo|Mirja|Tuomas|Anneli|Kaarlo) at /.test(o.c.text)) named = named || o.c.text;
      const d = o.r.delivered; if (d?.regular && !d.late && !tipped) tipped = { d, keep: { ...s.keep.regulars } }; } }
  ok(!!named, `a job to a regular names them (${named})`);
  ok(!!tipped && tipped.d.tip > 0 && Object.values(tipped.keep).includes(4), `on time, a regular tips from their standing and it rises (tip €${tipped?.d.tip}, ${JSON.stringify(tipped?.keep)})`);
  // the sealed parcel: from a fourth run, never on EASY, named by the kiosk or the line
  ok(J.newRun(net, BY_ID.medium, 9, { memory: { runs: 2 } }).sealedJob === -1 && J.newRun(net, BY_ID.easy, 9, { memory: { runs: 9 } }).sealedJob === -1 && J.newRun(net, BY_ID.medium, 9, { memory: { runs: 3 } }).sealedJob === 1,
    'a sealed parcel from a fourth run, never on EASY');
  let sealedCard = null, routeText = null, kiosk = null, aboard = null, notes = 0;
  for (let k = 1; k <= 60; k++) { const s = J.newRun(net, BY_ID.medium, 6000 + k, { memory: { runs: 4 } });
    for (const o of runTo(s, (c, st) => c.id === 'sealed' ? k % 2 : 0)) {
      if (o.c.kind === 'dispatch' && o.c.sealed) sealedCard = sealedCard || o.c.text;
      if (o.c.kind === 'route' && /^A sealed parcel\. Ride the \S+\.$/.test(o.c.text)) routeText = routeText || o.c.text;
      if (o.c.id === 'sealed' && o.r.reveal && /^The kiosk knows\. It is \S/.test(o.r.reveal.say)) kiosk = kiosk || o.r.reveal.say;
      if (o.r.unsealed) aboard = aboard || o.r.unsealed; }
    notes += s.keep.notes || 0; }
  ok(!!sealedCard && !!routeText, `the sealed parcel hides its stop: "${sealedCard}" · "${routeText}"`);
  ok(!!kiosk && !!aboard, `the kiosk names it (${kiosk}), and so does boarding its line (${aboard?.family} → ${aboard?.stop})`);
  ok(notes > 0, `a sealed drop writes the notebook (${notes} lines over the runs)`);
}

// ── 16. THE BANDS (runs.js quotes these): sixty fresh shifts of every run
const SEEDS = Array.from({ length: 60 }, (_, k) => 1000 + (k + 1) * 37);
const band = {};
for (const run of RUNS) for (const pol of ['reader', 'left']) {
  const got = SEEDS.map(seed => play(run, seed, pol).s), won = got.filter(J.complete);
  band[`${run.id}.${pol}`] = { won: won.length, onTime: won.filter(s => !s.late).length, scores: won.map(s => s.score).sort((a, b) => a - b) };
}
const line = id => `${id.padEnd(6)} ${band[id + '.reader'].won}/60 (${band[id + '.reader'].onTime}) · ${band[id + '.left'].won}/60 (${band[id + '.left'].onTime})`;
console.log(RUNS.map(r => '  ' + line(r.id)).join('\n'));
ok(band['easy.reader'].won === 60 && band['easy.left'].won >= 57, 'EASY: anyone completes it');
ok(band['medium.reader'].won >= 52 && band['hard.reader'].won >= 48 && band['night.reader'].won >= 34, 'a player who reads the board clears every rung most shifts — NIGHT is very risky');
for (const r of RUNS) ok(band[`${r.id}.reader`].won >= band[`${r.id}.left`].won, `${r.id}: reading the board beats tapping left`);
ok(band['easy.left'].won > band['medium.left'].won && band['medium.left'].won > band['hard.left'].won && band['hard.left'].won > band['night.left'].won, 'and the left-tapper is stopped higher up each rung');
for (const r of RUNS) { const sc = band[`${r.id}.reader`].scores, p70 = sc[Math.floor(0.7 * (sc.length - 1))];
  ok(Math.abs(p70 - r.par) <= r.par * 0.12, `${r.id}: par ${r.par} is about the reader's 70th percentile (${p70})`); }

console.log(`  journey: ${n} checks`);
