// Hyper Dagger — three edges of the press grammar, from the review of #619 (v57).
//   NODE_PATH=$(npm root -g) node hyperdagger/test/press-edges.cjs
//
// 1. Switching season from the pause menu between rules (HAUL's truck scheme
//    and EMBER's HYPER) starts a fresh run, so the arena matches the rules.
// 2. The mouse click that resumes from pause is UI: its release is not a jump.
// 3. Season 3 has no gun, but a short mouse press still jumps (HD-001).
// Waits are on game time once a run is live.
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

  const GAME = async (q, sec) => q.evaluate(async sec => {
    const d = window.__hd.debug, t0 = d.getState().gameTime;
    for (let i = 0; i < 3000 && d.getState().gameTime - t0 < sec; i++) await new Promise(r => requestAnimationFrame(r));
  }, sec);
  const open = async seasonId => {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    const q = await ctx.newPage();
    q.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await q.addInitScript(id => { localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerRunKind', 'free'); localStorage.setItem('hyperDaggerSeason', id); }, seasonId);
    await q.goto(`${base}/hyperdagger/?assets=0&season=${seasonId}`, { waitUntil: 'load' });
    await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 30000 });
    await q.evaluate(() => { const d = window.__hd.debug; d.startGame(); d.setInvulnerable(true); d.freezeDirector(true); });
    await GAME(q, 1.0);
    return { q, ctx };
  };
  const pause = q => q.evaluate(() => { document.getElementById('pauseBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  try {
    // 1. season switch across rules restarts the run
    for (const [from, to, want] of [['haul', 'ember', 'hyper'], ['ember', 'haul', 'truck']]) {
      const { q, ctx } = await open(from);
      await pause(q);
      await GAME(q, 0).catch(() => {});
      const r = await q.evaluate(async to => {
        const d = window.__hd.debug;
        const before = { mode: d.getState().mode, convoy: !!d.getConvoy() };
        const btn = document.querySelector(`#msg button.season[data-season="${to}"]`);
        btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        for (let i = 0; i < 6; i++) await new Promise(r => requestAnimationFrame(r));
        return { before, after: { mode: d.getState().mode, convoy: !!d.getConvoy(), state: d.getState().state, gameTime: d.getState().gameTime } };
      }, to);
      ok(`switching ${from} → ${to} from pause plays ${to}'s rules`, r.after.mode === want, JSON.stringify(r));
      ok(`switching ${from} → ${to} starts a fresh run (convoy ${want === 'truck' ? 'on' : 'off'})`,
        r.after.state === 'playing' && r.after.convoy === (want === 'truck') && r.after.gameTime < 1, JSON.stringify(r));
      await ctx.close();
    }
    // 2. the mouse click that resumes is not a jump; a later short press still is
    {
      const { q, ctx } = await open('ember');
      await pause(q);
      const r = await q.evaluate(async () => {
        const d = window.__hd.debug, pl = window.__hd.player, inp = d.inputObj();
        const f = n => (async () => { for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r)); })();
        inp.touchMode = false;
        const j0 = pl.jumpsLeft;
        document.getElementById('msg').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }));
        inp.mouseDown = true; await f(1); inp.mouseDown = false; await f(4);
        const resumed = { shown: document.getElementById('msg').style.display, jumpsLeft: pl.jumpsLeft, vy: +pl.vy.toFixed(2), j0 };
        const t0 = d.getState().gameTime; while (d.getState().gameTime - t0 < 1.0) await f(1);
        const j1 = pl.jumpsLeft;
        inp.mouseDown = true; await f(1); inp.mouseDown = false; await f(3);
        return { resumed, later: { jumpsLeft: pl.jumpsLeft, j1, vy: +pl.vy.toFixed(2) } };
      });
      ok('the mouse click that resumes from pause resumes the run', r.resumed.shown === 'none', JSON.stringify(r));
      ok('...and its release is not a jump', r.resumed.jumpsLeft === r.resumed.j0 && r.resumed.vy <= 0.5, JSON.stringify(r));
      ok('a short press after that still jumps', r.later.jumpsLeft < r.later.j1 || r.later.vy > 1, JSON.stringify(r));
      await ctx.close();
    }
    // 3. season 3: no gun, but a short mouse press still jumps
    {
      const { q, ctx } = await open('haul');
      const r = await q.evaluate(async () => {
        const d = window.__hd.debug, pl = window.__hd.player, inp = d.inputObj();
        const f = n => (async () => { for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r)); })();
        inp.touchMode = false;
        for (let i = 0; i < 200 && pl.feet.y > pl.floorY + 0.01; i++) await f(1);   // standing on a truck
        const j0 = pl.jumpsLeft, shots0 = window.__hd.daggers.active.length;
        inp.mouseDown = true; await f(1); inp.mouseDown = false; await f(3);
        return { mode: d.getState().mode, j0, jumpsLeft: pl.jumpsLeft, vy: +pl.vy.toFixed(2), shots: window.__hd.daggers.active.length - shots0 };
      });
      ok('season 3: a short mouse press jumps', r.mode === 'truck' && (r.jumpsLeft < r.j0 || r.vy > 1), JSON.stringify(r));
      await ctx.close();
    }
  } finally {
    await b.close(); s.close();
  }
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
