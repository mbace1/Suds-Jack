// Hyper Dagger — HD-002: a run ends one way, whether it was a death or the season's end.
//   NODE_PATH=$(npm root -g) node hyperdagger/test/run-end.cjs
//
// Drives a death and a season completion at the same run time, in FREE and in
// DAILY, and checks the two land the same results and saves: the best (free
// or daily key + table), the history, the run log, the results screen, the
// Toko cue, and that a run that has ended cannot be ended (and saved) again.
// Waits are on game time; the director is frozen so nothing else ends the run.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const s = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    env: { ...process.env, LD_LIBRARY_PATH: process.env.PLAYWRIGHT_CHROMIUM_LIB || process.env.LD_LIBRARY_PATH },
    args: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? ['--no-sandbox', '--single-process', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--in-process-gpu']
      : ['--use-gl=swiftshader', '--disable-dev-shm-usage'],
  });
  const errs = [];
  // one ended run on a fresh page: `how` is 'death' or 'complete'
  const end = async (kind, how) => {
    const q = await b.newPage({ viewport: { width: 820, height: 540 } });
    q.on('pageerror', e => errs.push(`${kind}/${how} pageerror: ${e.message}`));
    await q.addInitScript(k => { localStorage.setItem('hyperDaggerModeV31', 'hyper'); localStorage.setItem('hyperDaggerRunKind', k); }, kind);
    await q.goto(`${base}/hyperdagger/?assets=0&season=ember&mode=hyper`, { waitUntil: 'load' });
    await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
    const r = await q.evaluate(async how => {
      const d = window.__hd.debug;
      d.startGame(); d.freezeDirector(true); d.setInvulnerable(true);
      const t0 = d.getState().gameTime;
      for (let i = 0; i < 600 && d.getState().gameTime - t0 < 0.2; i++) await new Promise(r => requestAnimationFrame(r));
      d.setTime(123.4); d.setLife(60);
      if (how === 'death') d.die(); else d.completeRun();
      const snap = () => {
        const ls = k => localStorage.getItem(k);
        const daily = Object.keys(localStorage).filter(k => k.startsWith('hyperDaggerDaily:')).map(k => [k.split(':').slice(2).join(':'), ls(k)]);
        return { state: d.getState().state, hi: ls('hyperDaggerHiHyper'), daily, table: JSON.parse(ls('hyperDaggerDailyBest') || '[]').length,
          hist: JSON.parse(ls('hyperDaggerHistory') || '[]'), log: JSON.parse(ls('hyperDaggerRunLog') || '[]') };
      };
      const first = snap();
      const msg = document.getElementById('msg') || document.querySelector('#overlay, .msg');
      const big = document.querySelector('p.big')?.textContent ?? '';
      const cue = window.__hd.toko.cue();
      const h1 = document.querySelector('h1.dead')?.textContent ?? '';
      // the run is over: a second end must not save anything again
      d.completeRun();
      const second = snap();
      return { first, second, big, cue, h1, h1After: document.querySelector('h1.dead')?.textContent ?? '', shown: !!msg };
    }, how);
    await q.close();
    return r;
  };
  try {
    for (const kind of ['free', 'daily']) {
      const D = await end(kind, 'death'), C = await end(kind, 'complete');
      const f = x => ({ hi: x.first.hi, daily: JSON.stringify(x.first.daily), table: x.first.table, hist: x.first.hist.length, t: x.first.hist[0]?.t, log: x.first.log.length, logT: x.first.log[0]?.t });
      ok(`${kind}: both end the run`, D.first.state === 'dead' && C.first.state === 'dead', JSON.stringify([D.first.state, C.first.state]));
      ok(`${kind}: death and completion save the same best, history and log`, JSON.stringify(f(D)) === JSON.stringify(f(C)), JSON.stringify({ death: f(D), complete: f(C) }));
      if (kind === 'free') ok('free: the best is the run time', parseFloat(D.first.hi) === 123.4 && parseFloat(C.first.hi) === 123.4, JSON.stringify([D.first.hi, C.first.hi]));
      else ok('daily: the day\'s best and the table carry the run', D.first.daily.length === 1 && parseFloat(D.first.daily[0][1]) === 123.4 && D.first.table === 1, JSON.stringify(D.first));
      ok(`${kind}: the results line is the same for both`, D.big === C.big && /^123\.4s/.test(D.big), JSON.stringify([D.big, C.big]));
      ok(`${kind}: the headings stay as they were (DEVOURED / RUN COMPLETE)`, D.h1 === 'DEVOURED' && C.h1 === 'RUN COMPLETE', JSON.stringify([D.h1, C.h1]));
      ok(`${kind}: a death is logged as a death, a completion as a completion (not "${C.first.log[0]?.cause}")`,
        D.first.log[0]?.cause !== 'complete' && C.first.log[0]?.cause === 'complete', JSON.stringify([D.first.log[0]?.cause, C.first.log[0]?.cause]));
      ok(`${kind}: Toko opens on the right cause — a completion is not "SOMETHING" or a killer`,
        /RUN COMPLETE/.test(C.cue) && !/RUN COMPLETE/.test(D.cue), JSON.stringify([D.cue, C.cue]));
      for (const [n, x] of [['death', D], ['completion', C]])
        ok(`${kind}: after a ${n}, a second end saves nothing again`,
          x.second.hist.length === x.first.hist.length && x.second.log.length === x.first.log.length && x.second.table === x.first.table && x.h1After === x.h1,
          JSON.stringify({ hist: [x.first.hist.length, x.second.hist.length], log: [x.first.log.length, x.second.log.length], table: [x.first.table, x.second.table], h1: [x.h1, x.h1After] }));
    }
  } catch (e) {
    ok('the run completed', false, e.stack || String(e));
  }
  ok('zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
