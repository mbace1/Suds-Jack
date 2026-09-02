// The shift report card. NOT a gate — it never fails a build, because its job
// is the one the gates cannot do: telling DULL from BROKEN.
//
// eeri/test/report.mjs exists for the same reason and this is its sibling. The
// six gates all say the delivery loop WORKS. None of them can say whether a
// shift is worth playing: whether you spend it deciding or waiting, whether
// walking is ever the right call or merely a slower one, whether the back half
// asks more than the front, and whether the deadlines are tight enough to make
// a wrong catch cost anything.
//
// It plays a full shift through the REAL page — taking offers from the dispatch
// board and catching only vehicles the UI actually offers as catchable — and
// reports what it spent its time on. A bot is not a player, so read the numbers
// as symptoms, not verdicts.
//
//   node toko-move/test/report.cjs            (needs a server on :PORT)
//   PORT=8404 node toko-move/test/report.cjs
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

const pct = (a, b) => b ? `${Math.round(100 * a / b)}%` : '—';

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 140)));

  await page.goto(`${base}/toko-move/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__tm?.challenge);
  await page.click('#play');
  // run the clock up: a shift at ×1 is minutes of wall time for no more signal
  await page.click('#speed'); await page.click('#speed');

  const jobs = [];
  let cur = null, lastTick = 0, deadAir = 0, walkSeen = 0, samples = 0, carryChances = 0;
  // Where the shift actually goes. Wait/ride/get-off are the three phases the
  // player experiences, and only by splitting them can "the shift is full" be
  // told apart from "the waiting is long" — the first run could see neither,
  // because the accounting sat after a `continue` and never ran.
  const phase = { waiting: 0, riding: 0, getoff: 0, walking: 0, idle: 0 };
  let lastKind = null;
  // FIRST CATCH vs TRANSFER, split. The card used to record only the first
  // catch of each job and count a transfer as a tally mark, so the sentence
  // "most of the waiting is at the transfer" was a guess about a number nobody
  // was keeping. A wait starts whenever you are standing on a platform — at the
  // start of a job, or the moment you step off a vehicle that is not going all
  // the way — and ends at the next catch.
  const firstWaits = [], transferWaits = [];
  let waitStart = null;
  // and what was ON THE TABLE while you stood there, counted in TICKS: a long
  // wait with three things you could be doing is a different problem from a
  // long wait with none, and only one of them is fixed by more vehicles.
  const waitOpts = { nothing: 0, walk: 0, second: 0, both: 0 };
  const started = Date.now();
  const WALL_CAP_MS = 240000;

  while (Date.now() - started < WALL_CAP_MS) {
    const s = await page.evaluate(() => {
      const tm = window.__tm, ch = tm.challenge;
      const btns = [...document.querySelectorAll('.catchChoice')];
      return {
        tick: tm.flow.clock.tick,
        index: ch.index,
        done: !!ch.complete || !!document.getElementById('end') && !document.getElementById('end').hidden,
        active: ch.active ? { stops: ch.active.stops, cargo: ch.active.cargo, limit: ch.active.limit, value: ch.active.value } : null,
        offers: (ch.offers || []).map(o => ({ id: o.id, value: o.value, limit: o.limit })),
        waitingForCatch: ch.waitingForCatch,
        hasTrip: !!ch.activeTrip,
        score: ch.score, late: ch.late,
        remaining: ch.active ? ch.remaining() : null,
        choices: btns.length,
        enabled: btns.filter(b => !b.disabled).length,
        // the plan estimates the panel is showing the player, read as numbers
        plans: btns.map(b => ({ off: b.disabled, total: Number(b.dataset.total) || null, wait2: Number(b.dataset.wait2) || 0 })),
        walks: (tm.mobility?.walks?.() || []).length,
        canSecond: !!ch.canTakeSecond?.(),
        kind: tm.mobility?.status?.()?.kind ?? null,
      };
    }).catch(() => null);
    if (!s) break;
    if (s.done) break;

    samples++;
    if (s.walks > 0) walkSeen++;
    if (s.canSecond) carryChances++;

    // DEAD AIR is holding a parcel with NOTHING in front of you. It has now
    // been wrong twice in the same direction, and both times it made the game
    // look worse than it is: the first cut said it checked walks and only
    // checked catches, and this cut counted a stop where a SECOND JOB was on
    // offer as dead time — 79% of the waiting in the v2.22 run was exactly
    // that. Taking on a second parcel while you stand there is a decision, and
    // a metric that calls a decision nothing is measuring the bot's policy
    // rather than the game.
    if (s.active && s.enabled === 0 && s.walks === 0 && !s.canSecond && s.kind !== 'riding') deadAir += Math.max(0, s.tick - lastTick);
    const dt = Math.max(0, s.tick - lastTick);
    const k = s.active ? (s.kind || 'waiting') : 'idle';
    phase[k] = (phase[k] || 0) + dt;
    if (k === 'waiting') {
      if (waitStart == null) waitStart = s.tick;
      const w = s.walks > 0, j = s.canSecond;
      waitOpts[w && j ? 'both' : w ? 'walk' : j ? 'second' : 'nothing'] += dt;
    } else if (k !== 'getoff') waitStart = null;
    lastKind = k;
    lastTick = s.tick;

    if (cur && s.index >= cur.n && cur.doneAt == null) {
      cur.doneAt = s.tick;
      cur.rideTicks = cur.caught != null ? s.tick - cur.caught : null;
      cur.margin = s.remaining;
      cur = null;
    }
    if (!s.active && s.offers.length) {
      // a player picks; the bot picks the best-paying, which is the most
      // forgiving policy and so the most flattering measurement
      const best = s.offers.slice().sort((a, b) => b.value - a.value)[0];
      await page.evaluate(id => window.__tm.challenge.acceptOffer(id), best.id);
      cur = { n: jobs.length + 1, took: s.tick, value: best.value, limit: best.limit, caught: null, waitTicks: null };
      jobs.push(cur);
      continue;
    }
    // arriving is not delivering: the ride ends at GET OFF, which is the
    // player's call and not automatic. Missing this made the first run report
    // zero completions while the rides were in fact finishing.
    if (s.kind === 'getoff') {
      await page.click('#getOff').catch(() => {});
      await page.waitForTimeout(80);
      continue;
    }
    if (s.active && s.enabled > 0 && !s.hasTrip) {
      // The bot picks the best-scoring ENABLED choice. It was also given the
      // other decision the estimates enable — LETTING one go because a plan it
      // cannot board yet is better door to door — and that is left out on
      // purpose: an enabled plan has no wait left in its total, so it almost
      // always wins, the rule fired four times in a whole shift for 21 ticks,
      // and the arbitrary "hold out for 1.5x its own estimate" guard added more
      // noise to a card that is already noisy. Taking the vehicle in front of
      // you is very nearly always right; the estimate's job is to tell you
      // WHICH vehicle in front of you, and what the one after it costs.
      const ranked = s.plans.map((p, i) => ({ ...p, i })).filter(p => !p.off && p.total != null)
        .sort((a, b) => a.total - b.total);
      const best = ranked[0];
      const sel = best ? `.catchChoice[data-choice="${best.i}"]:not([disabled])` : '.catchChoice:not([disabled])';
      await page.click(sel).catch(() => page.click('.catchChoice:not([disabled])').catch(() => {}));
      const waited = waitStart == null ? null : s.tick - waitStart;
      if (cur && cur.caught === null) {
        cur.caught = s.tick; cur.waitTicks = s.tick - cur.took;
        if (Number.isFinite(waited)) firstWaits.push(waited);
      } else if (cur) {
        cur.transfers = (cur.transfers || 0) + 1;
        if (Number.isFinite(waited)) { transferWaits.push(waited); (cur.transferWaits ||= []).push(waited); }
      }
      waitStart = null;
      continue;
    }
    if (cur && s.index >= cur.n) { // job completed (checked before the actions below)
      cur.doneAt = s.tick;
      cur.rideTicks = cur.caught != null ? s.tick - cur.caught : null;
      cur.margin = s.remaining;
      cur = null;
    }
    await page.waitForTimeout(120);
  }

  const final = await page.evaluate(() => {
    const ch = window.__tm.challenge;
    return { index: ch.index, score: ch.score, late: ch.late, tick: window.__tm.flow.clock.tick, target: ch.constructor?.TARGET ?? window.__tm.deliveryTarget ?? 6 };
  }).catch(() => ({}));

  const done = jobs.filter(j => j.caught != null);
  const waits = done.map(j => j.waitTicks).filter(n => Number.isFinite(n));
  const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
  const half = Math.ceil(waits.length / 2);

  console.log('\n  TOKO MOVE — shift report card\n  ' + '-'.repeat(58));
  console.log(`  jobs taken            ${jobs.length}    completed ${final.index ?? 0} / ${final.target ?? '?'}    score ${final.score ?? 0}    late ${final.late ?? 0}`);
  console.log(`  shift length          ${final.tick ?? 0} ticks`);
  console.log(`  DEAD AIR              ${deadAir} ticks (${pct(deadAir, final.tick || 1)} of the shift)`);
  console.log('                        holding a parcel with no catch, no walk and no second job');
  console.log(`  wait to catch         avg ${avg(waits)}t   worst ${waits.length ? Math.max(...waits) : 0}t   best ${waits.length ? Math.min(...waits) : 0}t`);
  console.log(`  front half vs back    ${avg(waits.slice(0, half))}t  vs  ${avg(waits.slice(half))}t`);
  console.log(`  a walk was on offer   ${pct(walkSeen, samples || 1)} of samples`);
  console.log(`  second job possible   ${pct(carryChances, samples || 1)} of samples`);
  const tot = Object.values(phase).reduce((a, b) => a + b, 0) || 1;
  console.log(`  where the shift went  waiting ${pct(phase.waiting, tot)} · riding ${pct(phase.riding, tot)} · ` +
              `get off ${pct(phase.getoff, tot)} · walking ${pct(phase.walking, tot)} · between jobs ${pct(phase.idle, tot)}`);
  const sum = a => a.reduce((x, y) => x + y, 0);
  const line = (name, a) => `  ${name.padEnd(21)} ${a.length} waits · ${sum(a)}t total · avg ${avg(a)}t · worst ${a.length ? Math.max(...a) : 0}t`;
  console.log('');
  console.log(line('FIRST catch', firstWaits));
  console.log(line('TRANSFER catch', transferWaits));
  console.log(`  which is ${pct(sum(transferWaits), sum(firstWaits) + sum(transferWaits) || 1)} of all platform time`);
  const wtot = Object.values(waitOpts).reduce((a, b) => a + b, 0) || 1;
  console.log(`  while waiting, you had  nothing ${pct(waitOpts.nothing, wtot)} · a walk ${pct(waitOpts.walk, wtot)} · ` +
              `a 2nd job ${pct(waitOpts.second, wtot)} · both ${pct(waitOpts.both, wtot)}`);
  console.log('                        a long wait with three things to do is a different');
  console.log('                        problem from a long wait with none');
  if (done.length) {
    console.log('\n  per job:');
    for (const j of done) {
      console.log(`    ${String(j.n).padStart(2)}  wait ${String(j.waitTicks ?? '—').padStart(4)}t` +
                  `  ride ${String(j.rideTicks ?? '—').padStart(4)}t` +
                  `  deadline ${String(j.limit).padStart(4)}t  margin ${j.margin ?? '—'}` +
                  `  pays ${j.value}` +
                  (j.transferWaits?.length ? `  transfers waited ${j.transferWaits.join('+')}t` : ''));
    }
  }
  if (errors.length) console.log(`\n  page errors: ${errors.slice(0, 2).join(' | ')}`);
  console.log('\n  Read as symptoms, not verdicts. A tireless bot waits without');
  console.log('  boredom, so DEAD AIR is the number that matters most here —');
  console.log('  it is the share of the shift a person would spend doing nothing.\n');

  await browser.close();
  server.close();
});
