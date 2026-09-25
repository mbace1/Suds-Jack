// LIVE, IN THE PAGE (v2.56). HSL's broker cannot be reached from the build
// sandbox, and a gate must not depend on a real morning anyway, so the broker
// is MOCKED at the WebSocket (Playwright's routeWebSocket): it answers CONNECT
// and SUBSCRIBE the way an MQTT 3.1.1 broker does and then publishes HFP v2
// positions placed on the real HSL paths. What this holds: the way in, the
// real-time clock, the positions landing where they were reported, the HUD
// saying so, nothing recorded, and the timetable coming back when the feed
// dies. What it cannot hold is the real broker — that is the phone test.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/live.cjs [rootDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
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
  const M = await import(pathToFileURL(path.join(ROOT, 'toko-move/js/mqtt-ws.js')).href);
  const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'toko-move/cities/helsinki.json'), 'utf8'));
  const trams = pack.lines.filter(l => l.mode === 'TRAM' && l.path.length > 100).slice(0, 3);
  const report = (line, f, veh) => { const p = line.path[Math.floor(f * (line.path.length - 1))];
    return { topic: `/hfp/v2/journey/ongoing/vp/tram/0040/${veh}/${line.id}/1/X/07:00/1/5/60;24/1/1/1/1`,
      payload: JSON.stringify({ VP: { desi: line.name, dir: '1', oper: 40, veh, tst: new Date().toISOString(), spd: 5, hdg: null, lat: p[0], long: p[1], route: line.id } }), lat: p[0], lon: p[1] }; };
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  let sock = null, subscribed = false, url = '';
  await page.routeWebSocket(u => String(u).includes('mqtt.hsl.fi'), ws => {
    sock = ws; url = ws.url();
    ws.onMessage(m => { const b = Buffer.isBuffer(m) ? m : Buffer.from(m);
      if (b[0] === 0x10) ws.send(Buffer.from(M.CONNACK));
      else if (b[0] === 0x82) { ws.send(Buffer.from(M.encodeSuback(1, 2))); subscribed = true; } });
  });
  const publish = r => sock.send(Buffer.from(M.encodePublish(r.topic, r.payload)));
  try {
    // the way in, from the ordinary title card
    await page.goto(`${base}/toko-move/?shift=3`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.rival && !document.getElementById('play').disabled, null, { timeout: 30000 });
    const link = await page.evaluate(() => { const a = document.getElementById('liveLink'); return { hidden: a.hidden, href: a.getAttribute('href'), text: a.textContent }; });
    ok(`the title card offers LIVE (${link.text})`, !link.hidden && link.href === '?live');

    await page.goto(`${base}/toko-move/?live`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.rival && !document.getElementById('play').disabled, null, { timeout: 30000 });
    const title = await page.evaluate(() => ({ card: document.getElementById('dayCard')?.innerText || '', shift: document.getElementById('shiftNo')?.innerText || '', link: document.getElementById('liveLink').hidden, kind: window.__tm.shiftInfo?.kind, weather: window.__tm.weather?.id, rush: window.__tm.rushOn }));
    ok(`the LIVE card says what it is (${title.shift.split('\n')[0]})`, /LIVE/.test(title.card) && /LIVE · HELSINKI \d\d:\d\d/.test(title.shift) && title.link, JSON.stringify(title));
    ok(`an ordinary, clear, rush-free morning that is not the daily (${title.kind}, ${title.weather}, rush ${title.rush})`, title.kind === 'live' && title.weather === 'clear' && !title.rush);
    await page.tap('#play');
    await page.waitForFunction(() => window.__tm?.liveFeed?.state === 'connecting' || window.__tm?.liveFeed?.state === 'live', null, { timeout: 10000 });
    for (let i = 0; i < 50 && !subscribed; i++) await page.waitForTimeout(100);
    ok(`it connects to HSL's broker and subscribes (${url})`, subscribed && /^wss:\/\/mqtt\.hsl\.fi/.test(url));
    const clock = await page.evaluate(() => ({ speed: window.__tm.flow.clock.speed, btn: document.getElementById('speed').disabled }));
    ok(`the clock runs at the real rate (${clock.speed.toFixed(4)}) and cannot be sped up`, Math.abs(clock.speed - 1 / 15) < 1e-9 && clock.btn);

    // three trams, reported
    const reps = trams.map((l, i) => report(l, 0.2 + 0.25 * i, 500 + i));
    for (const r of reps) publish(r);
    await page.waitForFunction(n => window.__tm.liveFeed?.count >= n, reps.length, { timeout: 5000 }).catch(() => {});
    const got = await page.evaluate(rs => { const tm = window.__tm, net = tm.liveNetwork, t = tm.flow.clock.tick;
      const m = (a, b) => Math.hypot((a.lat - b.lat) * 111320, (a.lon - b.lon) * 111320 * Math.cos(a.lat * Math.PI / 180));
      return { feed: { ...tm.liveFeed }, vehicles: net.vehicles.length, live: net.vehicles.filter(v => v.live).length,
        off: rs.map(r => { const v = net.vehicles.find(x => x.live && x.key.endsWith(`/${r.veh}`)); return v ? m(net.position(v, t), r) : null; }) }; }, reps.map((r, i) => ({ lat: r.lat, lon: r.lon, veh: 500 + i })));
    ok(`the reports become the fleet (${got.live} live of ${got.vehicles}; ${got.feed.label})`, got.live === reps.length && got.vehicles === reps.length && got.feed.state === 'live');
    ok(`each is where it was reported (${got.off.map(d => d == null ? '—' : d.toFixed(1) + ' m').join(', ')})`, got.off.every(d => d != null && d < 15));
    await page.waitForTimeout(600);
    const hud = await page.evaluate(() => document.getElementById('rush').textContent);
    ok(`the HUD says LIVE and how many (${hud})`, /LIVE · 3/.test(hud));
    // the panel still works on real vehicles: take a job and look at the catch rows
    const panel = await page.evaluate(async () => { const tm = window.__tm, ch = tm.challenge; ch.acceptOffer(ch.offers[0].id);
      await new Promise(r => setTimeout(r, 600)); return document.getElementById('routeChoices')?.innerText.slice(0, 160) || ''; });
    ok(`the catch panel reads the live fleet without breaking (${panel.split('\n')[0]})`, panel.length > 0);

    // the feed dies
    await sock.close();
    await page.waitForFunction(() => window.__tm.liveFeed.state === 'timetable', null, { timeout: 5000 }).catch(() => {});
    const lost = await page.evaluate(() => ({ feed: { ...window.__tm.liveFeed }, vehicles: window.__tm.liveNetwork.vehicles.length, live: window.__tm.liveNetwork.vehicles.filter(v => v.live).length, hud: document.getElementById('rush').textContent }));
    ok(`when the feed dies the timetable comes back and the HUD says so (${lost.vehicles} vehicles, ${lost.feed.label})`, lost.feed.state === 'timetable' && lost.vehicles > 20 && lost.live === 0);
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  live: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
