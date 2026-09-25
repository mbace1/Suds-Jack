// THE MAP IS THE CONTROLLER, IN THE PAGE (v2.50). Take a job with a tap,
// wait for a tram to light, TAP IT ON THE MAP — not the panel — and the
// courier is on it; ride to the stop, TAP THE STOP, and the parcel is
// delivered. Real touch events at the projected screen point, the way a thumb
// does it; the panel's buttons are never touched.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/mapcontrol.cjs [rootDir]
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
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  const screenOf = (fn) => page.evaluate(fn);
  try {
    await page.goto(`${base}/toko-move/?shift=3&day=none`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.rival && !document.getElementById('play').disabled, null, { timeout: 30000 });
    await page.tap('#play'); await page.waitForTimeout(400);
    await page.tap('#jobBoard .jobOffer:not([disabled])'); await page.waitForTimeout(400);
    const lit = () => screenOf(() => { const tm = window.__tm, k = (tm.catchables?.() || [])[0]; if (!k) return null;
      const p = tm.liveNetwork.position(k.vehicle, tm.flow.clock.tick), q = tm.project(p.lat, p.lon), c = document.getElementById('map'), r = c.getBoundingClientRect();
      return { x: r.left + q.x * r.width / c.width, y: r.top + q.y * r.height / c.height, id: k.vehicle.id, inView: q.x > 0 && q.y > 0 && q.x < c.width && q.y < c.height }; });
    let w = null; for (let i = 0; i < 120 && !(w = await lit()); i++) { await page.evaluate(() => window.__tm.flow.runTicks(3)); await page.waitForTimeout(60); }
    ok('a tram lights for the job, and it is on screen', !!w && w.inView, JSON.stringify(w));
    const ringed = await page.evaluate(() => (window.__tm.liveNetwork.lastBadges || []).some(b => (window.__tm.catchables() || []).some(k => k.vehicle.id === b.id)));
    ok('the catchable tram is drawn as a vehicle, not folded into a dot', ringed);
    // a tap well away from it does nothing
    const miss = await page.evaluate(() => { const c = document.getElementById('map').getBoundingClientRect(); return { x: c.left + 12, y: c.bottom - 12 }; });
    await page.touchscreen.tap(miss.x, miss.y); await page.waitForTimeout(500);
    ok('a tap on empty map boards nothing', (await page.evaluate(() => window.__tm.mobility.status().kind)) === 'waiting');
    w = await lit();
    await page.touchscreen.tap(w.x, w.y); await page.waitForTimeout(500);
    const rode = await page.evaluate(() => ({ kind: window.__tm.mobility.status().kind, on: window.__tm.mobility.ride?.vehicleId }));
    ok(`a tap ON THE MAP boards the lit tram (${w.id})`, rode.kind === 'riding' && rode.on === w.id, JSON.stringify(rode));
    for (let i = 0; i < 500; i++) { if ((await page.evaluate(() => window.__tm.mobility.status().kind)) === 'getoff') break; await page.evaluate(() => window.__tm.flow.runTicks(4)); }
    const stop = await screenOf(() => { const tm = window.__tm, st = tm.mobility.status(); if (st.kind !== 'getoff') return null; const n = tm.city.nodes.find(o => o.id === st.at), q = tm.project(n.lat, n.lon), c = document.getElementById('map'), r = c.getBoundingClientRect(); return { x: r.left + q.x * r.width / c.width, y: r.top + q.y * r.height / c.height }; });
    ok('the ride reaches the stop', !!stop);
    const before = await page.evaluate(() => { const st = window.__tm.mobility.status(); return { index: window.__tm.challenge.index, at: st.at, transfer: !!st.transfer }; });
    await page.touchscreen.tap(stop.x, stop.y); await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({ index: window.__tm.challenge.index, kind: window.__tm.mobility.status().kind, from: window.__tm.challenge.currentFrom?.() }));
    // v2.57: shift 3's first job now changes trams, so the first stop can be a
    // TRANSFER — the tap still gets you off, and you are left waiting there.
    ok(`a tap ON THE STOP gets off and ${before.transfer ? `changes at ${before.at}` : 'delivers'}`,
      after.kind !== 'getoff' && (before.transfer ? after.kind === 'waiting' && after.index === before.index && after.from === before.at : after.index === before.index + 1), JSON.stringify({ before, after }));
    ok('one tap, one action: the stop popup did not also open', await page.locator('#pop').isHidden());
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  map control: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
