// Hyper Dagger — HD-005: a daily run's best is filed under the mode it was PLAYED in.
//   NODE_PATH=$(npm root -g) node hyperdagger/test/daily-key.cjs
//
// The death screen wrote the day's best under dailyKey(runDate, mode) — the
// SAVED mode — while the menu's best line, the daily table and the board all
// read M().id, the mode the run actually used. Since #591 a chosen season's
// declared mode beats the saved one, so with PURE saved, season 1 (HYPER)
// filed its daily best under :pure and the menu never showed it.
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
  try {
    // saved PURE; season 1 chosen by link, so the run plays season 1's HYPER
    for (const [saved, season] of [['pure', 'ember'], ['hyper', 'haul']]) {
      const q = await b.newPage({ viewport: { width: 820, height: 540 } });
      q.on('pageerror', e => errs.push(`${season} pageerror: ${e.message}`));
      await q.addInitScript(sv => { localStorage.setItem('hyperDaggerModeV31', sv); localStorage.setItem('hyperDaggerRunKind', 'daily'); }, saved);
      await q.goto(`${base}/hyperdagger/?assets=0&season=${season}`, { waitUntil: 'load' });
      await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
      const r = await q.evaluate(async ([sv, season]) => {
        const d = window.__hd.debug;
        d.startGame(); d.freezeDirector(true); d.setInvulnerable(true);
        // one frame of game time, then a known run time
        const t0 = d.getState().gameTime;
        for (let i = 0; i < 600 && d.getState().gameTime <= t0; i++) await new Promise(r => requestAnimationFrame(r));
        d.setTime(42);
        const info = d.getRunInfo();
        d.die();
        const keys = Object.keys(localStorage).filter(k => k.startsWith('hyperDaggerDaily:'));
        return { played: info.mode, saved: sv, runDate: info.runDate, keys,
          underPlayed: localStorage.getItem(`hyperDaggerDaily:${info.runDate}:${season}:${info.mode}`),
          underSaved: info.mode === sv ? null : localStorage.getItem(`hyperDaggerDaily:${info.runDate}:${season}:${sv}`) };
      }, [saved, season]);
      ok(`${season} with ${saved} saved: the run plays the season's own mode`, r.played !== saved, JSON.stringify(r));
      ok(`${season} with ${saved} saved: the daily best is filed under the mode played (${r.played})`,
        r.underPlayed !== null && parseFloat(r.underPlayed) >= 42 && r.underSaved === null, JSON.stringify(r));
      await q.close();
    }
  } catch (e) {
    ok('the run completed', false, e.stack || String(e));
  }
  ok('zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
