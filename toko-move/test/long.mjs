// THE LONG SHIFT (v3.26, runs.js LONG) in bare node: the endless run.
//   · it is not a rung: the ladder is the four it was, and the long shift opens
//     with EASY done, beside MEDIUM
//   · it keeps going: jobs come until the strikes or the three-hour clock end
//     it, and the deck never runs out (made cards fill what the written lack)
//   · every job's clock is a little shorter than the last (`ramp`)
//   · stars for how far it went (5, 10, 15 jobs), struck out or not; the best
//     is jobs, not euros
//   · measured: the two bots the ladder is measured with, and a band
//
//   node toko-move/test/long.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from '../js/journey.js';
import { RUNS, LONG, BY_ID, ORDER, loadRuns, unlocked, starsFor, record } from '../js/runs.js';
import { buildRealHelsinki } from '../js/real-helsinki.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const net = J.network(buildRealHelsinki(JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json', import.meta.url), 'utf8'))));

// not a rung
ok(ORDER.join() === 'easy,medium,hard,night' && !RUNS.includes(LONG) && BY_ID.long === LONG, 'the ladder is the four it was; the long shift sits beside it');
{ const s = mem(); ok(!unlocked('long', loadRuns(s)), 'closed on a first visit');
  const r = record('easy', { delivered: 3, target: 3, late: 0, score: 10 }, s);
  ok(unlocked('long', loadRuns(s)) && r.opened.includes('long'), 'open once EASY is done, and the end card says so');
  const a = record('long', { delivered: 7, target: 99, late: 3, score: 90, failed: true }, s), b = record('long', { delivered: 4, target: 99, late: 1, score: 40 }, s);
  ok(a.stars === 1 && a.newBest && loadRuns(s).long.best === 7 && b.stars === 0 && !b.newBest && loadRuns(s).long.best === 7 && loadRuns(s).long.plays === 2,
    'stars for how far it went, struck out or not; the best is jobs (7), and a shorter shift does not lower it'); }
ok(starsFor(LONG, { delivered: 4 }) === 0 && starsFor(LONG, { delivered: 5 }) === 1 && starsFor(LONG, { delivered: 12 }) === 2 && starsFor(LONG, { delivered: 15, failed: true }) === 3, 'one star at 5 jobs, two at 10, three at 15');

// it keeps going
const POL = {
  reader: c => c.kind === 'route' && c.options[0].hop ? c.options.map((o, k) => [o.hop.total + Math.max(0, -(o.hop.cash || 0)) * 25, k]).sort((a, b) => a[0] - b[0])[0][1]
    : c.kind === 'story' || c.kind === 'halt' ? c.options.map((o, k) => [o.price + (/job gone/.test(`${o.stakes?.win} ${o.stakes?.sure}`) ? 1e6 : 0), k]).sort((a, b) => a[0] - b[0])[0][1] : 0,
  left: () => 0,
};
const run = { ...LONG, perkPool: ['shoes', 'pass', 'map'] };
const band = {}, limits = [];
for (const pol of ['reader', 'left']) { const jobs = []; let struck = 0, timed = 0;
  for (let seed = 1; seed <= 60; seed++) { const s = J.newRun(net, run, 9000 + seed); let st = 0, last = null;
    while (s.phase !== 'end' && st++ < 3000) { const c = J.card(net, s); if (!c) break;
      const r = J.choose(net, s, POL[pol](c, s)); assert.ok(!r.error, r.error); assert.equal(J.check(net, s).length, 0, J.check(net, s).join());
      if (pol === 'reader' && s.job && s.job !== last) { last = s.job; limits.push([s.done, s.job.limit / s.job.best]); } }
    assert.equal(s.phase, 'end'); jobs.push(s.done); if (s.failed) struck++; else { timed++; assert.equal(s.clock, J.shiftSecondsOf(s)); } }
  jobs.sort((a, b) => a - b); band[pol] = { median: jobs[30], best: jobs[59], struck, timed }; }
ok(band.reader.struck > 0 && band.reader.timed > 0 && band.left.struck > 0, `it ends both ways: the strikes (reader ${band.reader.struck}, tapper ${band.left.struck}) or the clock at 10:00 (reader ${band.reader.timed}, tapper ${band.left.timed})`);
ok(J.newRun(net, run, 3).deck.length === LONG.cards && J.newRun(net, run, 3).deck.every(d => d.card), `the deck never runs out: ${LONG.cards} cards, the written ones and made ones after`);
const early = limits.filter(([d]) => d <= 1).map(x => x[1]), late = limits.filter(([d]) => d >= 8).map(x => x[1]), mean = a => a.reduce((x, y) => x + y, 0) / a.length;
ok(late.length && mean(late) < mean(early) * 0.85, `every clock a little shorter: ${mean(early).toFixed(2)}× the best route on the first jobs, ${mean(late).toFixed(2)}× from the ninth`);
ok(band.reader.median >= band.left.median && band.reader.median >= 7 && band.reader.median <= 14 && band.left.median >= 5, `measured, median jobs: reader ${band.reader.median} (best ${band.reader.best}), tapper ${band.left.median} (best ${band.left.best})`);
ok(band.reader.best < 25, 'and nobody runs it forever');
console.log(`  long: reader ${JSON.stringify(band.reader)} · tapper ${JSON.stringify(band.left)}`);
console.log(`long: ${n} checks passed`);
