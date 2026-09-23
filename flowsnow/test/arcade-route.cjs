// Flowsnow from the arcade floor, the way a player arrives.
//
//   NODE_PATH=$(npm root -g) node flowsnow/test/arcade-route.cjs [--root <siteRoot>]
//
// The game's own gates boot flowsnow/ directly. A player never does: they come
// off the floor, through the cabinet's Play button, and leave by the HOME
// button — and the v3 deploy's throwaway probe of exactly that route is what
// caught `__fs.version` being read as `VERSION`. This is that probe, kept.
//
// Run it against a gh-pages worktree AFTER scripts/deploy-game.mjs and BEFORE
// pushing; the deploy workflow does. It serves the tree at /Suds-Jack/ as well
// as at /, because that is where Pages puts it.
//
// Three facts, all read from the SITE tree rather than from this branch:
//   1. the cabinet's Play button takes you into flowsnow/
//   2. the game says the version the site's own flowsnow/VERSIONS.md says —
//      the arcade and the game disagreeing about what you are playing is the
//      bug v2 and v3 both shipped with
//   3. a real key press starts a ride, and HOME takes you back to the floor
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const at = process.argv.indexOf('--root');
const ROOT = path.resolve(at > 0 ? process.argv[at + 1] : path.join(__dirname, '..', '..'));
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2',
};
const srv = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]).replace(/^\/Suds-Jack(?=\/|$)/, '') || '/';
  let p = path.join(ROOT, url);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  if (c) { pass++; console.log('  ok   ' + n); } else { fail++; console.log('  FAIL ' + n + (d !== undefined ? ' → ' + d : '')); }
};

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}/Suds-Jack/`;
  const want = fs.readFileSync(path.join(ROOT, 'flowsnow', 'VERSIONS.md'), 'utf8').match(/^##\s*v([\d.]+)/m)?.[1];
  console.log(`\narcade route — ${ROOT}\n`);
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  // a returning player: the CRT boot plays once per tab, the sting once per
  // browser, and neither is what is under test, so both are marked as seen
  const ctx = await b.newContext({ viewport: { width: 1100, height: 700 } });
  await ctx.addInitScript(() => {
    try { sessionStorage.setItem('sudsJackHubBooted', '1'); localStorage.setItem('tokoSting', '1'); } catch {}
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  try {
    await p.goto(base, { waitUntil: 'load' });
    const play = p.locator('a.btn.play[data-game="flowsnow"]');
    await play.waitFor({ timeout: 20000 });
    ok('the floor has a Flowsnow cabinet with a Play button', await play.count() === 1);

    // the sting may still hold the navigation for a moment; any key skips it
    await play.click();
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForURL(/\/flowsnow\/(\?.*)?$/, { timeout: 20000 });
    ok('Play takes you into flowsnow/', /\/Suds-Jack\/flowsnow\//.test(p.url()), p.url());

    await p.waitForFunction(() => !!window.__fs, null, { timeout: 30000 });
    const shown = (await p.locator('#ver').textContent()).trim();
    const reported = await p.evaluate(() => __fs.version);
    ok(`the game shows the version the site's log ships (v${want})`, shown === `v${want}`, shown);
    ok('and reports the same number to the page', String(reported) === want, reported);

    // a REAL key starts the ride; the hook only advances the clock and reads
    // the result, in one call, because the live loop runs on between two
    await p.keyboard.press('Space');
    const rode = await p.evaluate(() => {
      const m0 = __fs.mode();
      __fs.debug.step(3, {});
      return { m0, m1: __fs.mode(), speed: __fs.state.speed };
    });
    ok('a key press starts a ride', rode.m0 === 'play', JSON.stringify(rode));
    ok('and the board goes downhill', rode.speed > 2, rode.speed);

    const home = p.locator('a.arcade-home');
    ok('the HOME button is on the page', await home.count() === 1);
    await home.click();
    await p.waitForURL(/\/Suds-Jack\/(index\.html)?$/, { timeout: 20000 });
    ok('and it takes you back to the floor', /\/Suds-Jack\/(index\.html)?$/.test(p.url()), p.url());

    ok('nothing threw on the way', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    ok('the route completed', false, e.message.split('\n')[0]);
  }
  await b.close();
  srv.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
