// Hyper Dagger — offline gate.  node hyperdagger/test/offline.cjs
//
// The game is an installable PWA: after one visit it must boot and PLAY with
// the network gone. Loads the page (the worker registers on any http), waits
// for it to take control and finish precaching, kills the server AND sets the
// browser offline, reloads, and starts a run.
//
// One failure is tolerated offline: ../hub/shell.js (the arcade HOME button).
// It is deliberately NOT precached — it is another app's module graph with
// its own cache tokens, and offline the hub it leads to is unreachable
// anyway. The correct offline page has no HOME button, not a dead one.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  const p = path.join(ROOT, u === '/' ? 'index.html' : u);
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
});
// The worker's cache name, read off sw.js rather than guessed. This line used
// to look for 'hyper-dagger-v' while sw.js has always written 'hyperdagger-v',
// so the check found no cache at all and reported zero entries — which is what
// a genuinely empty precache looks like too, and that is how a precache list
// naming two of the game's twelve modules went unnoticed.
const CACHE_PREFIX = (fs.readFileSync(path.join(ROOT, 'hyperdagger', 'sw.js'), 'utf8')
  .match(/const CACHE = '([^']*?)v\d+'/) || [, 'hyperdagger-v'])[1];

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const URL = `http://localhost:${port}/hyperdagger/index.html`;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    env: { ...process.env, LD_LIBRARY_PATH: process.env.PLAYWRIGHT_CHROMIUM_LIB || process.env.LD_LIBRARY_PATH },
    args: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? ['--no-sandbox', '--single-process', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--in-process-gpu']
      : ['--use-gl=swiftshader'],
  });
  const ctx = await b.newContext({ viewport: { width: 1100, height: 720 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));

  await pg.goto(URL, { waitUntil: 'load' });
  const controlled = await Promise.race([
    pg.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      for (let i = 0; i < 100 && !navigator.serviceWorker.controller; i++) {
        await new Promise(r => setTimeout(r, 100));
      }
      return { scope: reg.scope, controlled: !!navigator.serviceWorker.controller };
    }),
    new Promise(r => setTimeout(() => r({ controlled: false, timedOut: true }), 20000)),
  ]);
  ok('the worker takes control', controlled.controlled === true, JSON.stringify(controlled));
  // precache must be populated before we cut the cord
  const cached = await pg.evaluate(async (prefix) => {
    const names = await caches.keys();
    const name = names.find(n => n.startsWith(prefix));
    if (!name) return { name: null, entries: 0 };
    const c = await caches.open(name);
    return { name, entries: (await c.keys()).length };
  }, CACHE_PREFIX);
  ok('the precache is populated (30+ files)', cached.entries >= 30, JSON.stringify(cached));

  // cut the cord: server down AND browser offline
  server.close();
  await ctx.setOffline(true);
  const failures = [];
  pg.on('requestfailed', r => failures.push(r.url()));
  await pg.goto(URL, { waitUntil: 'load' }).catch(() => {});
  const booted = await pg.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 25000 })
    .then(() => true, () => false);
  ok('the game boots with the network gone', booted);
  if (booted) {
    await pg.evaluate(() => localStorage.setItem('hyperDaggerSeenTips', '1'));
    await pg.mouse.click(550, 360);
    const playing = await pg.waitForFunction(
      () => window.__hd.debug.getState().state === 'playing', null, { timeout: 10000 }).then(() => true, () => false);
    ok('a run starts offline', playing);
  } else {
    ok('a run starts offline', false, 'no boot');
  }
  const foreign = failures.filter(u => !u.includes('/hub/shell.js'));
  ok('only the arcade shell is allowed to miss', foreign.length === 0, foreign.slice(0, 4).join(' | '));
  ok('zero page errors offline', errs.length === 0, errs.slice(0, 3).join(' | '));

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
