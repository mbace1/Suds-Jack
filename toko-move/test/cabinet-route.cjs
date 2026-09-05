// THE ROUTE A PLAYER ACTUALLY TAKES: the hub floor, the Toko Move cabinet, its
// PLAY link, and the game booting on the other side.
//
// Every deploy this lane has made verified the game at its own URL and the
// cabinet's presence in the catalogue. Neither of those is the route. On
// 2026-09-06 the cabinet was reported missing from the hub: it was there, at
// position 20 of 24, describing the superseded Mini Metro lane through a
// runtime patch that still said v2.24 two releases later. A check that opens
// the game directly cannot see any of that.
//
// This is the `suds-hub-release` skill's rule — "verify the exact Hub/cabinet
// route in a browser, through title/menu into gameplay" — made runnable.
//
//   node toko-move/test/cabinet-route.cjs [rootDir]
//
// Defaults to this checkout; point it at a gh-pages worktree to verify a deploy
// before pushing it.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); } };

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  page.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url().replace(base, '')}`); });

  await page.goto(`${base}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__hub?.games?.length, null, { timeout: 15000 }).catch(() => {});

  // ---- the cabinet is on the floor, and findable ------------------------
  const cab = await page.evaluate(() => {
    const g = (window.__hub?.games || []);
    const i = g.findIndex(x => x.id === 'tokomove');
    const el = document.getElementById('cab-tokomove');
    const r = el?.getBoundingClientRect();
    const text = el?.innerText || '';
    return { i, total: g.length, present: !!el, y: r ? Math.round(r.y + scrollY) : null,
             text, entry: i < 0 ? null : g[i] };
  });
  ok('the catalogue has a Toko Move cabinet', cab.i >= 0);
  ok('and it renders a card on the floor', cab.present);
  // Buried is the same as absent for finding one. Six cabinets is roughly two
  // rows on a desktop floor and the first screen on a phone.
  ok(`it is near the top of the floor (#${cab.i + 1} of ${cab.total})`, cab.i >= 0 && cab.i < 6);

  // ---- the card describes THIS game, not the lane it replaced -----------
  const t = cab.text.toLowerCase();
  ok('the card does not describe the superseded line-drawing lane',
    !/drag stop to stop|drag from stop|draw a line/.test(t), cab.text.slice(0, 90));
  for (const word of ['courier', 'catch']) ok(`the card says what you do ("${word}")`, t.includes(word));
  ok('the card carries a version', /v\d+\.\d+/.test(cab.text), cab.text.slice(0, 60));

  // ---- and the version it shows is the one that will load ---------------
  const shown = (cab.text.match(/v(\d+\.\d+)/) || [])[1];
  const built = fs.readFileSync(path.join(ROOT, 'toko-move/js/core-v212.js'), 'utf8').match(/BUILD_VERSION\s*=\s*'([^']+)'/)?.[1];
  ok(`the cabinet's version matches the build (${shown} vs ${built})`, shown === built);

  // ---- THE ROUTE: press Play and land in the game -----------------------
  const play = page.locator('#cab-tokomove a', { hasText: 'PLAY' }).first();
  const has = await play.count();
  ok('the cabinet has a Play link', has > 0);
  if (has) {
    await play.click();
    // The arcade HOLDS this navigation: pressing Play can run the Toko sting
    // first (once per browser) and only then send you through. So the URL is
    // asserted AFTER the game has come up, not after the click — checking it
    // early reported the hub's own address and called a working route broken.
    const booted = await page.waitForFunction(() => window.__tm?.camera && window.__tm?.challenge, null, { timeout: 25000 })
      .then(() => true).catch(() => false);
    ok('Play lands on the game', /toko-move/.test(page.url()), page.url().replace(base, ''));
    ok('and the game boots through it', booted);
    if (booted) {
      const start = await page.locator('#play').textContent().catch(() => '');
      ok('the start button is ready, not a load failure', /START/i.test(start || ''), start);
      await page.click('#play').catch(() => {});
      await page.waitForTimeout(1200);
      const live = await page.evaluate(() => ({ v: window.__tm.version, tick: window.__tm.flow.clock.tick,
        offers: (window.__tm.challenge.offers || []).length }));
      ok('pressing START runs the clock', live.tick > 0, `tick ${live.tick}`);
      ok('and dispatch has jobs on the board', live.offers > 0, `${live.offers} offers`);
      ok(`the running build is ${built}`, live.v === built, live.v);
    }
  }

  ok('no console or network errors on the whole route', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log(`\n  cabinet route: ${pass} passed, ${fail} failed  (${ROOT})`);
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
});
