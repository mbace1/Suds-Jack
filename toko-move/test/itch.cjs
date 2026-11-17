// THE STORE UPLOAD, PLAYED (v2.64, roadmap M2). Builds the itch.io zip the way
// a release does (tools/package-itch.mjs), UNZIPS it into an empty folder and
// serves that folder ALONE — no repo, no arcade, no flow-core beside it — then
// opens the zip's own index.html on a phone viewport and plays: the title,
// then (v3.0) the card journey tapped through to a delivery — the scenes, the
// board and every card from the zip alone — and then `?classic`, the
// real-time game, with a job taken by tap, a tram caught, a delivery made. It fails on any request
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
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp' };
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
    await page.waitForFunction(() => window.__tm3 && !document.getElementById('play').disabled, null, { timeout: 30000 });
    ok('the zip root steps into the game', /\/toko-move\/(index\.html)?$/.test(new URL(page.url()).pathname), page.url());
    const shell = await page.evaluate(() => ({ home: !!document.querySelector('.arcade-home'), card: (() => { const c = document.getElementById('testCard'); return !!c && !c.hidden && c.offsetParent !== null; })(), platform: window.TOKO_PLATFORM, live: (() => { const l = document.getElementById('liveLink'); return !!l && !l.hidden && l.offsetParent !== null; })() }));
    ok('no arcade HOME button on a store page', !shell.home);
    ok('no playtest card on a store page', !shell.card);
    ok('no LIVE on a store build until a real phone has seen it work (M6)', !shell.live);
    ok('the build says where it is published', shell.platform?.name === 'itch' && shell.platform?.page === PAGE, JSON.stringify(shell.platform));
    const share = await page.evaluate(async () => { const m = await import('./js/platform.js?v=1'); return { store: m.STORE, url: m.shareUrl('?week') }; });
    ok(`a share line links the store page, not the frame (${share.url})`, share.store === true && share.url === PAGE);
    ok('the store opens on the card journey (v3)', await page.evaluate(() => !!window.__tm3 && !window.__tm));
    // the journey: tap the first button of every card, tap the scene to hurry
    // a hop, until the first drop is stamped
    await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
    let scenes = new Set(), boards = 0, most = 0;
    for (let i = 0; i < 300; i++) {
      const s = await page.evaluate(() => ({ done: window.__tm3.state().done, busy: window.__tm3.busy(), scene: window.__tm3.scene(), board: document.getElementById('v3board').classList.contains('on'), btn: !!document.querySelector('#v3panel .eventOpt:not([disabled])'),
        painted: [...document.querySelectorAll('#v3frame .L')].map(e => getComputedStyle(e).backgroundImage).filter(b => /\.webp/.test(b)).length }));
      scenes.add(s.scene); if (s.board) boards++; most = Math.max(most, s.painted);
      // the state moves inside choose(), before the hop is played: wait for the
      // delivery to finish playing, or a first-hop drop reads 0 hops (CI, main)
      if (s.done >= 1 && !s.busy) break;
      if (!s.busy && s.btn) { await page.tap('#v3panel .eventOpt[data-i="0"]').catch(() => {}); await page.waitForTimeout(100); continue; }
      await page.touchscreen.tap(80, 380).catch(() => {}); await page.waitForTimeout(140);
    }
    // the layers are counted over the whole job, not at its last frame: since v3.12 a
    // delivery by day ends on its moment, one full-frame picture, where the stop had six
    const j = await page.evaluate(() => ({ done: window.__tm3.state().done, hops: window.__tm3.boards }));
    // hops are COUNTED (__tm3.boards): this loop hurries every animation, so a
    // sampled board frame was luck, and v3.1's tram drive-in made it unlucky
    ok(`a card-journey delivery from the zip alone (${j.done} delivered; scenes ${[...scenes]}; ${j.hops} hops on the board)`, j.done >= 1 && j.hops > 0 && scenes.has('stop'));
    ok(`the scenes are in the package and painted (${most} layers at most)`, most >= 4);
    // ?classic: the real-time game, from the same zip
    await page.goto(`${base}/toko-move/index.html?classic`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
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
          // the way the leg runs along its line: catching the nearest tram in
          // EITHER direction rode one away from the drop for a thousand ticks
          // once an event card shifted the timing (v2.72)
          const at = id => { const n = tm.city.resolved[id]; let bi = 0, bd = 1e9; layer.path.forEach((q, i) => { const d = (q[0] - n.lat) ** 2 + (q[1] - n.lon) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
          const bi = at(c.legs[0].from), dir = at(c.legs[0].to) > bi ? 1 : -1;
          const near = tm.liveNetwork.nearestTo(layer, bi, tm.flow.clock.tick, 2.2, dir);
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
