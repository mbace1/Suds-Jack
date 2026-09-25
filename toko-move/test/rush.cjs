// THE RUSH, IN THE PAGE (v2.52): at the peak the HUD says RUSH, a full tram
// refuses you at every door — the panel, the map tap and the catch call are
// one rule — offers carry rush pay, and the harness's controls stay calm.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/rush.cjs [rootDir]
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
    await page.waitForFunction(() => window.__tm?.rival && !document.getElementById('play').disabled, null, { timeout: 30000 }); };
  try {
    await boot('?shift=3&day=none');
    ok("the harness's control is calm", (await page.evaluate(() => ({ on: window.__tm.rushOn }))).on === false);
    await boot('?shift=3');
    await page.tap('#play');
    const early = await page.evaluate(() => ({ hud: document.getElementById('rush').textContent, pay: window.__tm.challenge.jobPay(100) }));
    ok(`seven o'clock is quiet and pays the plain fee (${JSON.stringify(early)})`, early.hud === '' && early.pay === 100);
    // walk the clock to the peak (setup), then look
    await page.evaluate(() => { const tm = window.__tm; tm.flow.runTicks(Math.round(tm.flow.clock.ticksPerDay * 0.55) - tm.flow.clock.tick); });
    await page.waitForTimeout(300);
    const peak = await page.evaluate(() => { const tm = window.__tm, t = tm.flow.clock.tick, vs = tm.liveNetwork.vehicles; const full = vs.filter(v => tm.isFull(v)).length;
      return { hud: document.getElementById('rush').textContent, pay: tm.challenge.jobPay(100), full, of: vs.length }; });
    ok(`the peak says so on the HUD (${peak.hud})`, /RUSH/.test(peak.hud));
    ok(`and pays rush money on new work (100 → ${peak.pay})`, peak.pay === 130);
    ok(`a real share of the fleet is full (${peak.full} of ${peak.of})`, peak.full / peak.of > 0.3 && peak.full / peak.of < 0.7);
    // a full tram refuses you at the catch call itself
    const refused = await page.evaluate(() => { const tm = window.__tm, v = tm.liveNetwork.vehicles.find(x => tm.isFull(x)); const ch = tm.challenge;
      const choice = { legs: [{ line: { label: v.layer.name, sourceId: v.layer.id }, from: 'x', to: 'y' }] }; return tm.mobility.catchChoice(choice, v); });
    ok(`a full tram cannot be boarded — the catch itself refuses (${refused?.error})`, /full/.test(refused?.error || ''));
    // take a job in the rush and stand at the stop until a FULL tram pulls in
    await page.waitForFunction(() => document.querySelector('#jobBoard .jobOffer:not([disabled])'), null, { timeout: 15000 }).catch(() => {});
    await page.tap('#jobBoard .jobOffer:not([disabled])');
    let seen = null;
    for (let i = 0; i < 400 && !seen; i++) {
      seen = await page.evaluate(() => { const rows = [...document.querySelectorAll('#routeChoices .catchChoice')]; const f = rows.find(r => /full/.test(r.querySelector('.catchHead')?.textContent || ''));
        return f ? { disabled: f.disabled, catchableFull: (window.__tm.catchables?.() || []).filter(k => window.__tm.isFull(k.vehicle)).length } : null; });
      if (!seen) { await page.evaluate(() => window.__tm.flow.runTicks(2)); await page.waitForTimeout(260); }
    }
    ok('a full tram pulls in during the rush and the panel says "full"', !!seen, JSON.stringify(seen));
    ok('its row cannot be tapped, and the map is never offered it', !!seen && seen.disabled && seen.catchableFull === 0, JSON.stringify(seen));
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  rush: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
