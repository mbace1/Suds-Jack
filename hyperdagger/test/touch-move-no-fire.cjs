// Hyper Dagger: the touch MOVE stick never fires (gun grammar, owner 4 Oct).
// A phone-sized page (390x844, touch, mobile) is driven with REAL touch
// events through CDP, not by poking input state. The left stick is pushed to
// full deflection and held for 2 s: no dagger may leave the hand. Then the
// right (aim) stick is held for 2 s: the stream must run.
// Run: node hyperdagger/test/touch-move-no-fire.cjs   (exit 0 = pass)
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const s = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
      : ['--use-gl=swiftshader', '--disable-dev-shm-usage'],
  });
  const W = 390, H = 844;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  try {
    await p.goto(base + '/hyperdagger/?assets=0&season=void', { waitUntil: 'load' });
    await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
    await p.evaluate(() => {
      const d = window.__hd.debug;
      d.setSeason?.('void'); d.startGame(); d.setInvulnerable(true); d.freezeDirector(true);
    });
    await p.waitForFunction(() => window.__hd.debug.getState().state === 'playing', null, { timeout: 10000 });
    await p.evaluate(() => {
      const hd = window.__hd;
      window.__shots = 0;
      const real = hd.daggers.fire.bind(hd.daggers);
      hd.daggers.fire = (...a) => { window.__shots++; return real(...a); };
    });
    const cdp = await ctx.newCDPSession(p);
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    const shots = () => p.evaluate(() => window.__shots);

    // 1) MOVE stick, full deflection, held 2 s
    const lx = 80, ly = 700;
    await touch('touchStart', [{ x: lx, y: ly, id: 1 }]);
    for (let i = 1; i <= 6; i++) { await touch('touchMove', [{ x: lx, y: ly - 25 * i, id: 1 }]); await p.waitForTimeout(16); }
    const st = await p.evaluate(() => { const i = window.__hd.player.input; return { touchMode: i.touchMode, left: i.left.active, move: i.getMove(), firing: i.firing }; });
    const s0 = await shots();
    const t0 = Date.now();
    while (Date.now() - t0 < 2000) { await touch('touchMove', [{ x: lx + (Date.now() & 1), y: ly - 150, id: 1 }]); await p.waitForTimeout(100); }
    const walkShots = (await shots()) - s0;
    await touch('touchEnd', []);
    ok('touch stick is live and fully deflected', st.touchMode && st.left && Math.hypot(st.move.x, st.move.y) > 0.99, JSON.stringify(st));
    ok('full move-stick deflection for 2 s fires nothing', walkShots === 0, 'shots=' + walkShots);

    await p.waitForTimeout(300);
    // 2) AIM/fire stick held 2 s
    const rx = 310, ry = 700;
    const s1 = await shots();
    await touch('touchStart', [{ x: rx, y: ry, id: 2 }]);
    const t1 = Date.now();
    while (Date.now() - t1 < 2000) { await touch('touchMove', [{ x: rx + 1, y: ry, id: 2 }]); await p.waitForTimeout(100); }
    const holdShots = (await shots()) - s1;
    await touch('touchEnd', []);
    ok('holding the aim/fire stick streams', holdShots >= 2, 'shots=' + holdShots);
    ok('no page errors', errs.length === 0, errs.join(' | '));
  } catch (e) { fail++; console.log('  FAIL threw → ' + e.message); }
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); s.close();
  process.exit(fail ? 1 : 0);
});
