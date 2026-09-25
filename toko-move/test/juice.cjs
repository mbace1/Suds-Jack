// JUICE, IN THE PAGE (v2.51): a delivery is a moment. Two on-time deliveries
// and one late one, each through the game's own get-off; the effects must be
// the ones the numbers say (deliver, the chain stepping up, late), the score
// must bump, the chain must stutter when it breaks, and every effect must be
// gone again — juice that never clears is a leak with a nice colour.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/juice.cjs [rootDir]
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
  try {
    await page.goto(`${base}/toko-move/?shift=3&day=none`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.rival && !document.getElementById('play').disabled, null, { timeout: 30000 });
    await page.tap('#play'); await page.waitForTimeout(300);
    const deliver = async (late) => {
      await page.tap('#jobBoard .jobOffer:not([disabled])'); await page.waitForTimeout(300);
      for (let i = 0; i < 200; i++) { const on = await page.evaluate(() => { const k = (window.__tm.catchables?.() || [])[0]; return !!k && !window.__tm.catchVehicle(k.vehicle.id)?.error; }); if (on) break; await page.evaluate(() => window.__tm.flow.runTicks(3)); }
      for (let i = 0; i < 700; i++) { if ((await page.evaluate(() => window.__tm.mobility.status().kind)) === 'getoff') break; await page.evaluate(() => window.__tm.flow.runTicks(4)); }
      if (late) await page.evaluate(() => { window.__tm.challenge.active.limit = 1; });   // setup: this one has run out of time
      const r = await page.evaluate(() => { const before = document.getElementById('mult').className; const x = window.__tm.getOffNow(); return { ok: !x?.error, before }; });
      await page.waitForTimeout(120);
      return page.evaluate(() => ({ seen: window.__tm.juice.seen(), live: window.__tm.juice.live(), score: document.getElementById('score').className, mult: document.getElementById('mult').className, results: window.__tm.challenge.results.slice() }));
    };
    const a = await deliver(false);
    ok(`an on-time delivery is a delivery moment (${a.seen.join(',')})`, a.seen.includes('deliver') && a.live.includes('deliver'));
    ok('and the score bumps', /jBump/.test(a.score));
    const b = await deliver(false);
    ok(`the second on time steps the chain up, and it punches in (${b.seen.join(',')})`, b.seen.filter(k => k === 'deliver').length === 2 && b.seen.includes('mult') && /jBump/.test(b.mult));
    const c = await deliver(true);
    ok(`a late one is a cracked parcel, not a celebration (${c.results.join(',')} → ${c.seen.join(',')})`, c.results[c.results.length - 1] === 'late' && c.seen[c.seen.length - 1] === 'late');
    ok('and the chain stutters as it breaks', /jBreak/.test(c.mult));
    await page.waitForTimeout(1800);
    ok('every effect clears', (await page.evaluate(() => window.__tm.juice.live().length)) === 0);
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  juice: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
