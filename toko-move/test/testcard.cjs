// THE TEST CARD, IN THE PAGE (v2.61; v2.62's list). The card is on the title with every
// mission untried; each mission ticks when it is DONE in the game — a job
// taken by tap, a tram boarded by tapping it on the map — and the feed says ✓;
// the ticks survive a reload; and "Tell Toko" goes to this cabinet's note
// panel on the arcade.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/testcard.cjs [rootDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
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
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  const boot = async q => { await page.goto(`${base}/toko-move/${q}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.testcard && !document.getElementById('play').disabled, null, { timeout: 30000 }); };
  const card = () => page.evaluate(() => ({ head: document.querySelector('#testCard .tcHead b')?.textContent || '', rows: [...document.querySelectorAll('#testCard .tcRow')].map(r => ({ id: r.dataset.mission, done: r.classList.contains('done'), href: r.getAttribute('href') })), shown: !document.getElementById('testCard').hidden }));
  try {
    await boot('?shift=3&day=none');
    const c0 = await card();
    ok(`the title offers the build's missions (${c0.head})`, c0.shown && c0.rows.length === 5 && c0.rows.every(r => !r.done) && /0\/5/.test(c0.head));
    ok('each has a way in', c0.rows.every(r => r.href));
    // a job, taken the way a thumb takes it — taking one ticks nothing on this build's card
    await page.tap('#play'); await page.waitForTimeout(400);
    await page.tap('#jobBoard .jobOffer:not([disabled])'); await page.waitForTimeout(700);
    ok('taking a job ticks nothing by itself', await page.evaluate(() => Object.keys(window.__tm.testcard.state.done).length === 0));
    // the tram, tapped on the map (mapcontrol.cjs's method)
    const lit = () => page.evaluate(() => { const tm = window.__tm, k = (tm.catchables?.() || [])[0]; if (!k) return null;
      const p = tm.liveNetwork.position(k.vehicle, tm.flow.clock.tick), q = tm.project(p.lat, p.lon), c = document.getElementById('map'), r = c.getBoundingClientRect();
      return { x: r.left + q.x * r.width / c.width, y: r.top + q.y * r.height / c.height, inView: q.x > 0 && q.y > 0 && q.x < c.width && q.y < c.height }; });
    let w = null; for (let i = 0; i < 120 && !((w = await lit()) && w.inView); i++) { await page.evaluate(() => window.__tm.flow.runTicks(3)); await page.waitForTimeout(60); }
    ok('not ticked by the panel — only by a tap on the map', !(await page.evaluate(() => window.__tm.testcard.state.done.mapboard)));
    await page.touchscreen.tap(w.x, w.y); await page.waitForTimeout(500);
    ok('tapping the ringed tram on the map ticks "tap the tram"', await page.evaluate(() => !!window.__tm.testcard.state.done.mapboard));
    const feed1 = await page.evaluate(() => document.getElementById('feed')?.innerText || document.body.innerText);
    ok('and the feed says so', /✓ TESTED · TAP THE TRAM · 1\/5/.test(feed1), feed1.slice(0, 200));
    // the Crown Bridge: a fresh job, then a real line-12 tram boarded through
    // the same catch the CATCH button makes (the stand point is set up; the
    // boarding is the game's own)
    await boot('?shift=3&day=none');
    await page.tap('#play'); await page.waitForTimeout(400);
    await page.tap('#jobBoard .jobOffer:not([disabled])'); await page.waitForTimeout(500);
    const rode = await page.evaluate(() => { const tm = window.__tm, line = tm.city.lines.find(l => l.label === '12');
      const v = tm.liveNetwork.vehicles.find(x => /^12(?!\d)/.test(String(x.layer?.name || '')));
      if (!line || !v) return { error: `line ${!!line} vehicle ${!!v}` };
      tm.mobility.location = 'hakaniemi';
      const r = tm.mobility.catchChoice({ kind: 'direct', legs: [{ line, from: 'hakaniemi', to: 'kruunuvuori', stops: 1, direction: 1 }], transfers: 0, cost: 1 }, v);
      return { error: r.error || null, name: v.layer.name }; });
    ok(`a Crown Bridge tram can be boarded (${rode.name || rode.error})`, !rode.error, rode.error || '');
    await page.waitForFunction(() => window.__tm.testcard.state.done.bridge, null, { timeout: 8000 }).catch(() => {});
    ok('riding it ticks "cross the Crown Bridge"', await page.evaluate(() => !!window.__tm.testcard.state.done.bridge));
    // it remembers
    await boot('?shift=3&day=none');
    const c1 = await card();
    ok(`and the card remembers after a reload (${c1.head})`, /2\/5/.test(c1.head) && c1.rows.filter(r => r.done).map(r => r.id).join() === 'bridge,mapboard');
    // Tell Toko: the arcade's note panel for this cabinet
    await page.route('**/*', r => r.request().isNavigationRequest() && !/toko-move/.test(r.request().url()) ? r.fulfill({ status: 200, body: 'hub' }) : r.continue());
    const nav = page.waitForURL(u => /#tokomove\/feedback$/.test(String(u)), { timeout: 5000 }).then(() => true).catch(() => false);
    await page.locator('#testCard [data-mission="tell"]').scrollIntoViewIfNeeded(); await page.locator('#testCard [data-mission="tell"]').tap();
    ok('"Tell Toko" goes to the arcade note panel for this cabinet', await nav);
    await page.goto(`${base}/toko-move/?shift=3&day=none`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__tm?.testcard, null, { timeout: 30000 });
    ok('and counts as done', await page.evaluate(() => !!window.__tm.testcard.state.done.tell));
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  test card: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
