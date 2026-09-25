// THE WALK, IN THE PAGE (v2.55). walkpath.mjs holds the path; this holds what
// a player sees: tap a walk and the courier goes ALONG the street — every
// sampled position lies on the street path, not on the straight chord — the
// camera follows the same point, and the way still to walk is drawn ahead.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/walk.cjs [rootDir] [shotDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const SHOTS = process.argv[3] || null;
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
  try {
    await page.goto(`${base}/toko-move/?shift=3&day=none`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.rival && !document.getElementById('play').disabled, null, { timeout: 30000 });
    await page.tap('#play');
    // SETUP: a job leaving Rautatientori, and the courier knowing the walk to
    // Hakaniemi (Local Knowledge gates a walk on both ends visited). The walk
    // itself is a tap on its row in the panel.
    const setup = await page.evaluate(() => {
      const tm = window.__tm, ch = tm.challenge;
      // a cargo that may go on foot (documents, hot food, parts, fresh food)
      const walkable = x => ['documents', 'hot food', 'parts', 'fresh food'].includes(x.cargo);
      ch.location = 'rautatientori'; let o = null;
      for (let i = 0; i < 20 && !o; i++) { ch.refreshOffers(); o = ch.offers.find(x => x.stops[0] === 'rautatientori' && walkable(x)); }
      ch.acceptOffer(o.id); tm.flow.runTicks(2);
      for (const id of ['rautatientori', 'hakaniemi', 'lasipalatsi', 'kamppi']) tm.visited?.add?.(id);
      const walks = tm.mobility.walks();
      return { from: ch.currentFrom(), cargo: o.cargo, walks: walks.map(w => w.to), can: tm.mobility.canWalk(), st: tm.mobility.status().kind, rc: document.getElementById('routeChoices')?.innerText.slice(0, 200) };
    });
    ok(`a walk is offered from ${setup.from} (${setup.walks.join(', ')})`, setup.walks.length > 0, JSON.stringify(setup));
    await page.waitForSelector('#routeChoices .walkChoice', { state: 'attached', timeout: 5000 });
    const where = await page.evaluate(() => { const b = document.querySelector('#routeChoices .walkChoice'), d = b.closest('details'); if (d && !d.open) { d.querySelector('summary')?.click(); } const r = b.getBoundingClientRect(); return { inDetails: !!d, h: r.height, y: r.top }; });
    const idx = setup.walks.indexOf('hakaniemi') >= 0 ? setup.walks.indexOf('hakaniemi') : setup.walks.indexOf('lasipalatsi') >= 0 ? setup.walks.indexOf('lasipalatsi') : 0;
    const btn = page.locator(`#routeChoices .walkChoice[data-walk="${idx}"]`); await btn.scrollIntoViewIfNeeded(); await btn.tap();
    const walk = await page.evaluate(() => { const st = window.__tm.mobility.status(); return st.kind === 'walking' ? { from: st.from, to: st.to, street: st.street, span: st.arriveTick - st.startTick, start: st.startTick } : null; });
    ok(`the tap starts a walk (${walk?.from} → ${walk?.to}, ${walk?.street})`, !!walk);
    if (SHOTS) { await page.evaluate(w => { const tm = window.__tm; tm.flow.runTicks(Math.round(w.span * 0.45)); }, walk);
      const stop = page.locator('text=STOP').first(); if (await stop.count()) await stop.tap().catch(() => {});
      await page.tap('#pause'); await page.waitForTimeout(1200); await page.screenshot({ path: path.join(SHOTS, 'walk-mid.png') }); await page.tap('#pause'); }
    const run = await page.evaluate(async w => {
      const tm = window.__tm, st = tm.mobility.status(), line = tm.walkLine(st);
      const M = (a, b) => { const lat = (a[0] + b[0]) / 2 * Math.PI / 180; return Math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * Math.cos(lat)); };
      const segD = (p, a, b) => { const k = Math.cos(p[0] * Math.PI / 180), ax = a[1] * k, ay = a[0], bx = b[1] * k, by = b[0], px = p[1] * k, py = p[0]; const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0; return M(p, [ay + dy * t, (ax + dx * t) / k]); };
      const toLine = p => { let d = Infinity; for (let i = 1; i < line.length; i++) d = Math.min(d, segD(p, line[i - 1], line[i])); return d; };
      const a = line[0], b = line[line.length - 1], samples = [];
      for (let f = 0.1; f < 0.95; f += 0.1) { const target = w.start + Math.round(w.span * f); tm.flow.runTicks(Math.max(0, target - tm.flow.clock.tick)); await new Promise(r => requestAnimationFrame(() => r()));
        const ll = tm.courierLatLon(), p = [ll.lat, ll.lon]; samples.push({ onLine: toLine(p), offChord: segD(p, a, b) }); }
      return { points: line.length, len: line.slice(1).reduce((m, q, i) => m + M(line[i], q), 0), straight: M(a, b), samples };
    }, walk);
    ok(`the walk has a street path (${run.points} points, ${Math.round(run.len)} m against ${Math.round(run.straight)} m straight)`, run.points > 2 && run.len > run.straight);
    const worstOn = Math.max(...run.samples.map(s => s.onLine)), mostOff = Math.max(...run.samples.map(s => s.offChord));
    ok(`every sampled position is ON the street path (worst ${worstOn.toFixed(1)} m)`, worstOn < 3);
    ok(`and the courier leaves the straight chord to follow it (furthest ${Math.round(mostOff)} m off)`, mostOff > 15, JSON.stringify(run.samples));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'walk.png') });
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  walk: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
