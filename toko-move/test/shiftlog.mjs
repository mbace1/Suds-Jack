// The shift log's gate. Bare node — the log owns no DOM and no clock, it only
// watches, so a stub `tm` is enough to drive every branch of it. That is also
// the property that makes it safe: it can be deleted without touching a rule.
import assert from 'node:assert';
import { ShiftLog } from '../js/shiftlog.js';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

// A fake city, courier and clock. Everything the log reads, and nothing else.
function stub() {
  const tm = {
    flow: { clock: { tick: 0 } },
    challenge: { index: 0, active: null, selectedPlan: null,
      name: id => id.toUpperCase(), currentFrom: () => tm._from, currentTo: () => tm._to },
    mobility: { status: () => tm._st },
    planCostFrom: () => tm._best,
    planEstimateOf: () => ({ total: tm._chosen }),
    _from: 'a', _to: 'b', _st: { kind: 'waiting', at: 'a' }, _best: null, _chosen: null,
  };
  return tm;
}
const run = (tm, log, ticks, mutate) => { for (let i = 0; i < ticks; i++) { tm.flow.clock.tick++; mutate?.(tm.flow.clock.tick); log.poll(); } };

// ---- a job is opened, phased and closed ---------------------------------
{
  const tm = stub(), log = new ShiftLog(tm);
  tm.challenge.active = { stops: ['a', 'b'], cargo: 'documents', value: 100, limit: 500 };
  run(tm, log, 20);                                   // waiting
  tm._st = { kind: 'riding', at: 'a', ride: { line: '4', from: 'a' } };
  run(tm, log, 60);                                   // riding
  tm._st = { kind: 'getoff', at: 'b' };
  run(tm, log, 5);
  tm.challenge.index = 1; tm.challenge.active = null;  // delivered
  run(tm, log, 1);
  log.finish();

  ok(log.jobs.length === 1, 'one job recorded');
  const j = log.jobs[0];
  ok(j.delivered, 'and it is marked delivered because the index moved forward');
  ok(!j.late && j.spare > 0, `and on time with ${j.spare}t spare against a 500t limit`);
  const kinds = j.segs.map(s => s.kind);
  ok(kinds.join('>') === 'waiting>riding>getoff', `phases in order, got ${kinds.join('>')}`);
  const ride = j.segs.find(s => s.kind === 'riding');
  ok(ride.end - ride.start >= 55, 'the ride segment spans the ride');
  ok(ride.line === '4', 'and remembers which line it was');
}

// ---- lateness, and a job that never finished ----------------------------
{
  const tm = stub(), log = new ShiftLog(tm);
  tm.challenge.active = { stops: ['a', 'b'], cargo: 'parts', value: 100, limit: 30 };
  run(tm, log, 100);
  tm.challenge.index = 1; tm.challenge.active = null;
  run(tm, log, 1); log.finish();
  ok(log.jobs[0].late, 'a job that overran its limit is late');
  ok(log.jobs[0].spare === 0, 'and has no spare rather than a negative one');
}
{
  const tm = stub(), log = new ShiftLog(tm);
  tm.challenge.active = { stops: ['a', 'b'], cargo: 'parts', value: 100, limit: 900 };
  run(tm, log, 40);
  log.finish();                                        // the shift ended mid-job
  ok(log.jobs.length === 1 && !log.jobs[0].delivered, 'a job open when the shift ends is NOT delivered');
  ok(log.jobs[0].done != null, 'and is still closed, rather than left half-written');
}

// ---- the alternative you did not take ------------------------------------
{
  const tm = stub(), log = new ShiftLog(tm);
  tm.challenge.active = { stops: ['a', 'b'], cargo: 'documents', value: 100, limit: 900 };
  run(tm, log, 5);
  tm._chosen = 900; tm._best = 500;                    // a much better plan was on the board
  tm._st = { kind: 'riding', at: 'a', ride: { line: '7', from: 'a', plan: { legs: [{}] } } };
  run(tm, log, 5);
  ok(log.jobs[0].missed.length === 1, 'boarding a worse plan than the board offered is recorded');
  ok(log.jobs[0].missed[0].saves === 400, 'with the difference it would have saved');
}
{
  // and a difference too small to be a lesson is not one
  const tm = stub(), log = new ShiftLog(tm);
  tm.challenge.active = { stops: ['a', 'b'], cargo: 'documents', value: 100, limit: 900 };
  run(tm, log, 5);
  tm._chosen = 520; tm._best = 500;
  tm._st = { kind: 'riding', at: 'a', ride: { line: '7', from: 'a', plan: { legs: [{}] } } };
  run(tm, log, 5);
  ok(log.jobs[0].missed.length === 0, 'a 20t difference is noise, not a missed plan');
}
{
  // an unpriceable plan says nothing rather than guessing
  const tm = stub(), log = new ShiftLog(tm);
  tm.challenge.active = { stops: ['a', 'b'], cargo: 'documents', value: 100, limit: 900 };
  tm._chosen = null; tm._best = 500;
  tm._st = { kind: 'riding', at: 'a', ride: { line: '7', from: 'a', plan: { legs: [{}] } } };
  run(tm, log, 5);
  ok(log.jobs[0].missed.length === 0, 'no estimate means no claim');
}

// ---- the replay renders what it recorded, and escapes what it prints -----
{
  const tm = stub(), log = new ShiftLog(tm);
  ok(log.html() === '', 'an empty shift renders nothing at all');
  tm.challenge.active = { stops: ['a', 'b'], cargo: '<script>x</script>', value: 100, limit: 900 };
  run(tm, log, 10);
  tm._st = { kind: 'riding', at: 'a', ride: { line: '4', from: 'a' } };
  run(tm, log, 30);
  log.finish();
  const html = log.html();
  ok(html.includes('THE SHIFT BACK'), 'the replay has a heading');
  ok(html.includes('class="bar"'), 'and a bar per job');
  ok(!html.includes('<script>'), 'and escapes a cargo name that looks like markup');
  ok(html.includes('&lt;script&gt;'), 'having actually printed it, escaped');
  ok(/waiting \d+%/.test(html) && /riding \d+%/.test(html), 'and says where the shift went');
}

// ---- it never touches the game it watches --------------------------------
{
  const tm = stub(), log = new ShiftLog(tm);
  const before = JSON.stringify({ i: tm.challenge.index, a: tm.challenge.active });
  run(tm, log, 30);
  ok(JSON.stringify({ i: tm.challenge.index, a: tm.challenge.active }) === before,
    'polling changes nothing about the challenge — the log observes, it does not participate');
  // and a half-built world does not throw
  const bare = new ShiftLog({});
  bare.poll(); bare.finish();
  ok(bare.html() === '', 'a log with no game behind it is silent rather than broken');
}

console.log(`toko-move shift log gate: ${checks} checks passed`);
