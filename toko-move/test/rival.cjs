// THE RIVAL RACES YOU, IN THE PAGE (v2.53). A claim is a journey: he heads
// for your stop and gets closer every second; take the job first and it pays
// a fifth more; let him get there and he walks off carrying it, and does not
// want another until it is delivered. Through all of it he never jumps.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/rival.cjs [rootDir]
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
  const boot = async () => { await page.goto(`${base}/toko-move/?shift=4&day=none`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.rival && !document.getElementById('play').disabled, null, { timeout: 30000 }); await page.tap('#play'); };
  // walk the clock a tick at a time and record where he is — the no-jump check
  const walk = (n) => page.evaluate(n => { const tm = window.__tm, r = tm.rival, out = []; let maxStep = 0, prev = r.position();
    const m = (a, b) => { const lat = (a.lat + b.lat) / 2 * Math.PI / 180; return Math.hypot((a.lat - b.lat) * 111320, (a.lon - b.lon) * 111320 * Math.cos(lat)); };
    for (let i = 0; i < n; i++) { tm.flow.runTicks(1); const p = r.position(); if (p && prev) maxStep = Math.max(maxStep, m(p, prev)); prev = p;
      const pk = r.claim && tm.city.resolved[r.claim.pickup]; out.push({ kind: p?.kind, d: pk && p ? m(p, pk) : null, claim: r.claim?.id || null }); }
    return { out, maxStep }; }, n);
  try {
    await boot();
    const a = await walk(140);
    const racing = a.out.filter(o => o.kind === 'race' && o.d != null);
    ok(`a claim turns him toward your stop (${racing.length} ticks racing)`, racing.length > 20);
    // shift 4 is picked because he starts 2.9 km away; on a board where he
    // starts ON your stop, "he gets closer" is 0 m → 0 m and proves nothing.
    ok(`and he gets closer (${racing[0]?.d.toFixed(0)} m → ${racing[racing.length - 1]?.d.toFixed(0)} m)`, racing.length > 20 && racing[0].d > 500 && racing[racing.length - 1].d < racing[0].d * 0.8);
    ok(`he never jumps (largest step ${a.maxStep.toFixed(1)} m a tick)`, a.maxStep < 40);
    await page.waitForTimeout(700);   // the board re-renders on its own interval
    const row = await page.evaluate(() => [...document.querySelectorAll('#jobBoard .jobOffer')].map(x => x.innerText).find(t => /coming for it/.test(t)) || '');
    ok('the board row names the race and the prize', /coming for it · \d+ s · beat him \+20%/.test(row), row.replace(/\n/g, ' '));
    // beat him: tap the claimed row
    const before = await page.evaluate(() => { const r = window.__tm.rival; return window.__tm.challenge.offers.find(o => o.id === r.claim.id).value; });
    const idx = await page.evaluate(() => [...document.querySelectorAll('#jobBoard .jobOffer')].findIndex(x => /coming for it/.test(x.innerText)));
    await page.locator('#jobBoard .jobOffer').nth(idx).tap(); await page.waitForTimeout(300);
    const beat = await page.evaluate(() => ({ v: window.__tm.challenge.active?.value, beat: window.__tm.challenge.active?.beat, kind: window.__tm.rival.position().kind }));
    ok(`taking it first beats him: +20% (${before} → ${beat.v})`, beat.beat === true && beat.v === Math.round(before * 1.2));
    ok('and he gives up the race', beat.kind !== 'race');
    const b = await walk(20);
    ok(`giving up does not make him jump (largest step ${b.maxStep.toFixed(1)} m)`, b.maxStep < 40);

    // the other ending: let him win
    await boot();
    const c = await walk(330);
    const won = await page.evaluate(() => ({ taken: window.__tm.rival.taken.slice(), carrying: window.__tm.rival.position().carrying, claim: window.__tm.rival.claim }));
    ok(`if he gets there first he takes it and walks off carrying it (${won.taken.join(',')})`, won.taken.length === 1 && won.carrying === true);
    ok('and wants nothing else until it is delivered', won.claim === null);
    ok(`he never jumped (largest step ${c.maxStep.toFixed(1)} m)`, c.maxStep < 40);
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  rival: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
