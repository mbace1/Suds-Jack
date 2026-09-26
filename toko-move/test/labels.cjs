// WHO GIVES WAY ON THE MAP (v2.63). Stop names used to give way to every
// vehicle badge, and the centre is where trams bunch: on a phone, over forty
// frames, Rautatientori — the main hub — was labelled in none. A hub's name
// now outranks a passing tram on a line you are not using. This counts, frame
// by frame, which in-view names were actually painted. (A rule putting the
// job's own ends first was tried and removed: the job's stop was already named
// every frame without it.)
//
//   NODE_PATH=$(npm root -g) node toko-move/test/labels.cjs [rootDir]
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
const FRAMES = 40;

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const run = async setup => {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
    await page.addInitScript(() => { const o = CanvasRenderingContext2D.prototype.fillText; window.__drawn = new Set();
      CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { if (this.canvas.id === 'map') window.__drawn.add(t); return o.call(this, t, ...a); }; });
    await page.goto(`${base}/toko-move/?shift=3&day=none`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
    await page.tap('#play'); await page.waitForTimeout(500);
    if (setup) await page.evaluate(setup);
    const seen = {};
    for (let i = 0; i < FRAMES; i++) {
      await page.evaluate(() => { window.__drawn.clear(); window.__tm.flow.runTicks(5); }); await page.waitForTimeout(120);
      const r = await page.evaluate(() => { const tm = window.__tm, c = document.getElementById('map'); return tm.city.nodes.map(n => { const q = tm.project(n.lat, n.lon);
        return [n.id, q.x > 20 && q.y > 20 && q.x < c.width - 20 && q.y < c.height - 20, window.__drawn.has(n.name)]; }); });
      for (const [id, inView, drawn] of r) if (inView) { seen[id] ??= [0, 0]; seen[id][0]++; if (drawn) seen[id][1]++; }
    }
    await page.close(); return seen;
  };
  const rate = (s, id) => s[id] ? s[id][1] / s[id][0] : 0, show = (s, id) => s[id] ? `${s[id][1]}/${s[id][0]}` : 'not in view';
  try {
    const a = await run(null);
    ok(`the main hub is named on the map (Rautatientori ${show(a, 'rautatientori')})`, rate(a, 'rautatientori') >= 0.75);
    ok(`and so is the hub beside it (Kauppatori ${show(a, 'kauppatori')})`, rate(a, 'kauppatori') >= 0.75);
    // with a job in hand, its stop is named even between two hubs (the job's end is set up; the painting is the game's)
    const b = await run(() => { const ch = window.__tm.challenge, o = (ch.offers || [])[0]; if (o) { ch.acceptOffer(o.id); ch.currentTo = () => 'senaatintori'; } });
    ok(`the stop the job goes to is named, even between two hubs (Senaatintori ${show(b, 'senaatintori')})`, rate(b, 'senaatintori') >= 0.9);
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  labels: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
