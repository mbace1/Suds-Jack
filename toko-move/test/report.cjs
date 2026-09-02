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

    // an active job, nothing catchable, and nowhere useful to walk = dead air:
    // the player is holding a parcel and has no decision in front of them
    // dead air is holding a parcel with NEITHER a catch nor a walk in front of
    // you. The first cut said it checked walks and only checked catches — which
    // would have reported waiting-with-options as dead time.
    if (s.active && s.enabled === 0 && s.walks === 0 && s.kind !== 'riding') deadAir += Math.max(0, s.tick - lastTick);
    const dt = Math.max(0, s.tick - lastTick);
    const k = s.active ? (s.kind || 'waiting') : 'idle';
    phase[k] = (phase[k] || 0) + dt;
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
      await page.click('.catchChoice:not([disabled])').catch(() => {});
      if (cur && cur.caught === null) { cur.caught = s.tick; cur.waitTicks = s.tick - cur.took; }
      else if (cur) cur.transfers = (cur.transfers || 0) + 1;
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
  console.log('                        holding a parcel with nothing catchable and nowhere to walk');
  console.log(`  wait to catch         avg ${avg(waits)}t   worst ${waits.length ? Math.max(...waits) : 0}t   best ${waits.length ? Math.min(...waits) : 0}t`);
  console.log(`  front half vs back    ${avg(waits.slice(0, half))}t  vs  ${avg(waits.slice(half))}t`);
  console.log(`  a walk was on offer   ${pct(walkSeen, samples || 1)} of samples`);
  console.log(`  second job possible   ${pct(carryChances, samples || 1)} of samples`);
  const tot = Object.values(phase).reduce((a, b) => a + b, 0) || 1;
  console.log(`  where the shift went  waiting ${pct(phase.waiting, tot)} · riding ${pct(phase.riding, tot)} · ` +
              `get off ${pct(phase.getoff, tot)} · walking ${pct(phase.walking, tot)} · between jobs ${pct(phase.idle, tot)}`);
  if (done.length) {
    console.log('\n  per job:');
    for (const j of done) {
      console.log(`    ${String(j.n).padStart(2)}  wait ${String(j.waitTicks ?? '—').padStart(4)}t` +
                  `  ride ${String(j.rideTicks ?? '—').padStart(4)}t` +
                  `  deadline ${String(j.limit).padStart(4)}t  margin ${j.margin ?? '—'}` +
                  `  pays ${j.value}`);
    }
  }
  if (errors.length) console.log(`\n  page errors: ${errors.slice(0, 2).join(' | ')}`);
  console.log('\n  Read as symptoms, not verdicts. A tireless bot waits without');
  console.log('  boredom, so DEAD AIR is the number that matters most here —');
  console.log('  it is the share of the shift a person would spend doing nothing.\n');

  await browser.close();
  server.close();
});
