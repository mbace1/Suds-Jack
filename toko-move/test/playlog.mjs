// THE PLAY LOG (v3.21, js/playlog.js) in bare node: what a person did, read off
// the run's own machine.
//   · a card shown and picked: its state, which button, its tier, how long it took
//   · a card shown twice (a re-render) is one card; a pick with no card shown has no time
//   · a shift's end, or the page left mid-shift (QUIT, and the state it was left in)
//   · the readout: time to choose by state, the third option taken (special, very
//     special), where shifts were left, runs done and struck out
//   · the store keeps the last 60 sessions; a store in the wrong shape reads as empty
//   · and it reads a real run: a bot's shift, picked through the journey, logged
//
//   node toko-move/test/playlog.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as PL from '../js/playlog.js';
import * as J from '../js/journey.js';
import { BY_ID } from '../js/runs.js';
import { buildRealHelsinki } from '../js/real-helsinki.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

// a session by hand
const s = PL.start({ version: '3.21', mode: 'run', run: 'easy', seed: 7, at: 0 });
PL.shown(s, { state: 'dispatch', at: 1000 }); PL.shown(s, { state: 'dispatch', at: 1500 });
PL.picked(s, { state: 'dispatch', i: 2, tier: 'special', n: 3, at: 4000 });
PL.shown(s, { state: 'route', at: 5000 }); PL.picked(s, { state: 'route', i: 0, n: 3, at: 5800 });
PL.picked(s, { state: 'story', i: 1, n: 3, at: 9000 });
ok(s.picks[0].ms === 3000 && s.picks[0].tier === 'special', 'a card shown twice is one card: the time runs from the first showing (3.0 s)');
ok(s.picks[1].ms === 800 && s.picks[2].ms === null, 'a pick with no card shown has no time, rather than a wrong one');
PL.close(s, { done: 3, target: 3, score: 64, at: 60000 }); PL.picked(s, { state: 'route', i: 0, at: 61000 });
ok(s.end.done === 3 && !s.end.quit && s.end.secs === 60 && s.picks.length === 3, 'a shift ends once, and nothing is logged after it');

const q = PL.start({ version: '3.21', mode: 'run', run: 'medium', seed: 9, at: 0 });
PL.shown(q, { state: 'halt', at: 100 }); PL.close(q, { done: 1, target: 4, quit: true, state: 'halt', at: 9000 });
const st = PL.start({ version: '3.21', mode: 'run', run: 'night', seed: 3, at: 0 });
PL.shown(st, { state: 'story', at: 0 }); PL.picked(st, { state: 'story', i: 2, tier: 'very', n: 3, at: 12000 }); PL.close(st, { done: 3, target: 5, late: 2, strikes: 2, failed: true });

const sum = PL.summarise([s, q, st]);
ok(sum.quits === 1 && sum.quitAt.halt === 1, 'a page left mid-shift is a QUIT, with the state it was left in');
ok(sum.runs.easy.done === 1 && sum.runs.medium.quit === 1 && sum.runs.night.struck === 1, 'runs: done, left, struck out — three different endings');
ok(sum.third.offered === 4 && sum.third.taken === 2 && sum.tiers.special.taken === 1 && sum.tiers.very.taken === 1, 'the third option: offered four times, taken twice (one special, one very special)');
ok(sum.slowest === 'story' && sum.states.story.medianMs === 12000, 'the slowest cards to decide are named');
const text = PL.report([s, q, st], '3.21');
ok(/^Toko Move play log · v3\.21 · 3 shifts \(1 left early\) · 4 choices/.test(text) && /Third option taken: 2 of 4/.test(text) && /Left early at: halt ×1/.test(text), `the readout reads: ${text.split('\n')[0]}`);
ok(PL.report([]) === 'Toko Move play log: nothing played on this device yet.', 'and says so when there is nothing');
ok(PL.line(st).failed === true && PL.line(st).third === 1 && PL.line(st).run === 'night', "the arcade's shared log gets one line a shift");

// the store
const store = mem(); PL.save(Array.from({ length: 70 }, (_, i) => ({ ...PL.start({ run: 'easy', seed: i }), end: { done: 1, target: 3 } })), store);
ok(PL.load(store).length === PL.MAX && PL.load(store)[0].seed === 10, `the store keeps the last ${PL.MAX} sessions`);
const bad = mem(); bad.setItem(PL.KEY, '{"oops":1}'); const bad2 = mem(); bad2.setItem(PL.KEY, 'not json');
ok(PL.load(bad).length === 0 && PL.load(bad2).length === 0, 'a store in the wrong shape reads as empty, never as a crash');

// a real run: a bot's shift through the journey, logged the way play.js logs it
const net = J.network(buildRealHelsinki(JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json', import.meta.url), 'utf8'))));
const run = J.newRun(net, BY_ID.medium, 4242), sess = PL.start({ version: 't', mode: 'run', run: 'medium', seed: 4242, at: 0 }); let t = 0, steps = 0;
while (run.phase !== 'end' && steps++ < 400) { const c = J.card(net, run); PL.shown(sess, { state: c.state, at: t += 500 }); const i = steps % 3; PL.picked(sess, { state: c.state, i, tier: c.options[i]?.tier, n: c.options.length, at: t += 700 + 100 * i }); J.choose(net, run, i); }
PL.close(sess, { done: run.done, target: run.target, late: run.late, strikes: run.strikes, failed: !!run.failed, score: run.score, at: t });
const real = PL.summarise([sess]);
ok(real.picks === sess.picks.length && Object.keys(real.states).every(k => J.STATES[k]) && real.third.taken > 0, `a real shift reads in the machine's own states (${Object.keys(real.states).join(', ')})`);
console.log(`playlog: ${n} checks passed`);
