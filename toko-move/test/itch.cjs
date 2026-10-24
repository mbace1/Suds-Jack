// THE STORE UPLOAD, PLAYED (v2.64, roadmap M2). Builds the itch.io zip the way
// a release does (tools/package-itch.mjs), UNZIPS it into an empty folder and
// serves that folder ALONE — no repo, no arcade, no flow-core beside it — then
// opens the zip's own index.html on a phone viewport and plays: the title,
// a job taken by tap, a tram caught, a delivery made. It fails on any request
// that 404s, any request that leaves the package, any page error, the arcade's
// HOME button or the playtest card showing up, or a share line that links the
// frame the game is played in instead of the store page.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/itch.cjs
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..');
const PAGE = 'https://example.itch.io/toko-move';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); } };

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'toko-itch-test-'));
const zip = path.join(work, 'toko-move.zip'), site = path.join(work, 'site');
execFileSync('node', [path.join(ROOT, 'toko-move/tools/package-itch.mjs'), zip, '--page', PAGE], { cwd: ROOT, stdio: 'inherit' });
execFileSync('python3', ['-c', 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zip, site]);
const names = execFileSync('python3', ['-c', 'import sys,zipfile; print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))', zip], { encoding: 'utf8' }).split('\n').filter(Boolean);

const asked = [], missing = [];
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); asked.push(u);
  let p = path.join(site, u);
  if (!p.startsWith(site)) { missing.push(u); res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { missing.push(u); res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  const errs = [], away = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  page.on('request', r => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) away.push(u); });
  try {
    ok('the zip has index.html at its root, the game and the engine beside it', names.includes('index.html') && names.some(n => n.startsWith('toko-move/js/')) && names.some(n => n.startsWith('flow-core/')));
    ok('and carries no tests, tools, design notes or arcade files', !names.some(n => /(^|\/)(test|tools|scripts|store)\/|\.md$|^hub\//.test(n)), names.filter(n => /(^|\/)(test|tools)\/|\.md$|^hub\//.test(n)).slice(0, 3).join(' '));
    await page.goto(`${base}/`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
    ok('the zip root steps into the game', /\/toko-move\/(index\.html)?$/.test(new URL(page.url()).pathname), page.url());
    const shell = await page.evaluate(() => ({ home: !!document.querySelector('.arcade-home'), card: (() => { const c = document.getElementById('testCard'); return !!c && !c.hidden && c.offsetParent !== null; })(), platform: window.TOKO_PLATFORM, live: (() => { const l = document.getElementById('liveLink'); return !!l && !l.hidden && l.offsetParent !== null; })() }));
    ok('no arcade HOME button on a store page', !shell.home);
    ok('no playtest card on a store page', !shell.card);
    ok('no LIVE on a store build until a real phone has seen it work (M6)', !shell.live);
    ok('the build says where it is published', shell.platform?.name === 'itch' && shell.platform?.page === PAGE, JSON.stringify(shell.platform));
    const share = await page.evaluate(async () => { const m = await import('./js/platform.js?v=1'); return { store: m.STORE, url: m.shareUrl('?week') }; });
    ok(`a share line links the store page, not the frame (${share.url})`, share.store === true && share.url === PAGE);
    // play: a job by tap, then the game's own catch until a delivery lands
    await page.tap('#play'); await page.waitForTimeout(400);
    await page.tap('#jobBoard .jobOffer:not([disabled])'); await page.waitForTimeout(300);
    const run = await page.evaluate(() => {
      const tm = window.__tm, ch = tm.challenge, mob = tm.mobility, { routeChoices, allowFor } = globalThis.__tmRouteChoiceCore;
      for (let t = 0; t < 2500 && ch.index < 1; t++) {
        const st = mob.status?.();
        if (st?.kind === 'getoff') mob.getOff();
        else if (st?.kind === 'waiting') for (const c of routeChoices(tm.city, ch.currentFrom(), ch.currentTo(), 3, allowFor(ch.cargoRule?.()), mob.passed?.())) {
          const layer = tm.transit.layers.find(x => x.id === c.legs[0].line.sourceId); if (!layer) continue;
          const n = tm.city.resolved[c.legs[0].from]; let bi = 0, bd = 1e9;
          layer.path.forEach((q, i) => { const d = (q[0] - n.lat) ** 2 + (q[1] - n.lon) ** 2; if (d < bd) { bd = d; bi = i; } });
          const near = tm.liveNetwork.nearestTo(layer, bi, tm.flow.clock.tick, 2.2, null);
          if (near && !mob.catchChoice(c, near.vehicle)?.error) break;
        }
        tm.flow.runTicks(1);
      }
      return { delivered: ch.index, tick: tm.flow.clock.tick };
    });
    ok(`a delivery is made from the zip alone (${run.delivered} by tick ${run.tick})`, run.delivered >= 1);
    await page.waitForTimeout(500);
    ok(`every request was answered from the package (${asked.length} asked)`, missing.length === 0, missing.slice(0, 4).join(' '));
    ok('nothing was fetched from anywhere else', away.length === 0, away.slice(0, 3).join(' '));
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); console.log(`    missing: ${missing.join(" ")}\n    errors: ${errs.join(" | ")}\n    away: ${away.slice(0,5).join(" ")}`); }
  await browser.close(); server.close(); fs.rmSync(work, { recursive: true, force: true });
  console.log(`\n  itch package: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
