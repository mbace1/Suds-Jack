// Hyper Dagger — HD-003 follow-up: a tap that RESUMES from the pause screen is not also a jump.
//   NODE_PATH=$(npm root -g) node hyperdagger/test/pause-resume-tap.cjs
//
// Real touches (a hasTouch context, page.touchscreen.tap) and a stubbed
// standard-mapping pad (navigator.getGamepads). Waits are on game time once a
// run is live; on the menu (no game clock) on rAF frames with a cap.
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
    for (const side of ['left', 'right']) {
      const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
      const q = await ctx.newPage();
      q.on('pageerror', e => errs.push('pageerror: ' + e.message));
      await q.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
        localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerModeV31', 'pure');
        localStorage.setItem('hyperDaggerRunKind', 'free'); localStorage.setItem('hyperDaggerSeason', 'ember'); });
      await q.goto(`${base}/hyperdagger/?assets=0`, { waitUntil: 'load' });
      await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
      await q.evaluate(() => { const frame = () => new Promise(r => requestAnimationFrame(r)); window.__frames = async n => { for (let i = 0; i < n; i++) await frame(); }; });
      // start by a button (UI, never a stick), settle on the floor (game time)
      let bb = await q.locator('#msg button.season[data-season="ember"]').boundingBox();
      await q.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await q.evaluate(async () => {
        const d = window.__hd.debug; let n = 0; while (d.getState().state !== 'playing' && n++ < 120) await window.__frames(1);
        d.freezeDirector(true); d.setInvulnerable(true);
        const t0 = d.getState().gameTime; for (let i = 0; i < 3000 && d.getState().gameTime - t0 < 0.8; i++) await window.__frames(1);
      });
      // pause with the on-screen pause button (the touch path; touch never locks the pointer)
      bb = await q.locator('#pauseBtn').boundingBox();
      await q.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await q.evaluate(() => window.__frames(3));
      const paused = await q.evaluate(() => ({ shown: document.getElementById('msg').style.display }));
      // resume: a tap on empty overlay space, on either half (no button there)
      await q.touchscreen.tap(side === 'left' ? 60 : 784, 375);
      const r = await q.evaluate(async () => {
        const d = window.__hd.debug, pl = window.__hd.player, inp = d.inputObj();
        let n = 0; while (document.getElementById('msg').style.display !== 'none' && n++ < 60) await window.__frames(1);
        const y0 = pl.feet.y; let peak = 0; const t0 = d.getState().gameTime;
        for (let i = 0; i < 3000 && d.getState().gameTime - t0 < 0.6; i++) { await window.__frames(1); peak = Math.max(peak, pl.feet.y - y0); }
        return { msg: document.getElementById('msg').style.display, state: d.getState().state, ran: +(d.getState().gameTime - t0).toFixed(2),
          rise: +peak.toFixed(2), sticks: [inp.left.active, inp.right.active] };
      });
      ok(`touch: the pause button pauses the run (${side})`, paused.shown === 'block', JSON.stringify(paused));
      ok(`touch: a tap on the pause screen (${side} half) resumes the run`, r.msg === 'none' && r.state === 'playing' && r.ran >= 0.5, JSON.stringify(r));
      ok(`touch: that resuming tap is not also a jump (${side} half)`, r.rise < 0.2 && !r.sticks[0] && !r.sticks[1], JSON.stringify(r));
      await ctx.close();
    }
  } catch (e) {
    ok('the run completed', false, e.stack || String(e));
  }
  ok('zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
