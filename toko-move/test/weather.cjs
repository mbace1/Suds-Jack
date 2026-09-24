// WEATHER, IN THE PAGE (v2.49). weather.mjs holds the rules; this holds what a
// player sees: the title card names the morning, fog takes every vehicle past
// 400 m off the map and every far arrival off the panel — minutes included —
// while the ride you are on stays drawn, rain slows the fleet and the feet, and
// the harness's own control (`?day=none`) stays clear.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/weather.cjs [rootDir]
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
    ok("the harness's control is clear weather", (await page.evaluate(() => window.__tm.weather.id)) === 'clear');

    // ── fog ────────────────────────────────────────────────────────────
    await boot('?shift=3&weather=fog');
    ok('the title card names the fog', /FOG/.test(await page.locator('#dayCard').innerText()));
    await page.tap('#play');
    // Take a job and stand at the stop: the draw loop's own filter is caught
    // on its next call and asked about EVERY vehicle, near and far.
    const fog = await page.evaluate(async () => {
      const tm = window.__tm; tm.challenge.acceptOffer(tm.challenge.offers[0].id); tm.flow.runTicks(10);
      let caught = null; const real = tm.liveNetwork.draw.bind(tm.liveNetwork);
      tm.liveNetwork.draw = (ctx, tick, project, dpr, opts) => { caught = opts?.filter || null; return real(ctx, tick, project, dpr, opts); };
      await new Promise(r => setTimeout(r, 400)); tm.liveNetwork.draw = real;
      const here = tm.courierLatLon(), m = (a, b) => { const lat = (a.lat + b.lat) / 2 * Math.PI / 180; return Math.hypot((a.lat - b.lat) * 111320, (a.lon - b.lon) * 111320 * Math.cos(lat)); };
      let near = 0, far = 0, farShown = 0, nearShown = 0; const t = tm.flow.clock.tick;
      for (const v of tm.liveNetwork.vehicles) { const p = tm.liveNetwork.position(v, t); if (!p) continue; const d = m(here, p), shown = !caught || caught(p.lat, p.lon, v.layer, v);
        if (d > 420) { far++; if (shown) farShown++; } else if (d < 380) { near++; if (shown) nearShown++; } }
      await new Promise(r => setTimeout(r, 300));
      const rows = [...document.querySelectorAll('#routeChoices .catchChoice')].map(b => ({ lit: !b.disabled, head: b.querySelector('.catchHead')?.textContent || '' }));
      const hint = document.querySelector('#routeChoices .hint')?.textContent || '';
      return { near, far, farShown, nearShown, rows, hint };
    });
    ok(`fog hides every vehicle past 400 m (${fog.farShown} of ${fog.far} drawn)`, fog.far > 5 && fog.farShown === 0, JSON.stringify(fog));
    ok(`and draws what is near (${fog.nearShown} of ${fog.near})`, fog.nearShown === fog.near);
    const waits = fog.rows.filter(r => !r.lit);
    ok(`a far arrival says "in the fog", not a minute (${waits.map(r => r.head).join(' | ')})`, waits.length > 0 && waits.some(r => /in the fog/.test(r.head)) && waits.every(r => /in the fog/.test(r.head) || /in \d+ min/.test(r.head)));
    ok(`and the panel's header does not leak the minute either (${fog.hint})`, !(waits.every(r => /in the fog/.test(r.head)) && /first in \d/.test(fog.hint)));

    // ── rain ───────────────────────────────────────────────────────────
    await boot('?shift=3&weather=rain');
    const rain = await page.evaluate(() => ({ speed: window.__tm.liveNetwork.speedFactor, walk: window.__tm.walkFactor, v: window.__tm.liveNetwork.vehicles[0].speed }));
    await boot('?shift=3&weather=clear');
    const dry = await page.evaluate(() => ({ speed: window.__tm.liveNetwork.speedFactor, walk: window.__tm.walkFactor, v: window.__tm.liveNetwork.vehicles[0].speed }));
    ok(`rain runs the fleet at 0.9 and walking at 1.2 (${JSON.stringify(rain)})`, rain.speed === 0.9 && Math.abs(rain.walk - 1.2) < 1e-9 && Math.abs(rain.v / dry.v - 0.9) < 1e-9);
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  weather: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
