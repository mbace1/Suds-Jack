// Toko Move — the store page's STILLS (roadmap M3): phone screenshots and the
// 630×500 cover, all from the real game, the way tools/film.cjs makes the
// trailer. Nothing is mocked up: the page is the shipping page on a 9:16 phone
// viewport (405×720 CSS, captured at 1080×1920), entered by tapping START, and
// every screen is one a player reaches by tapping what lights. The only setup
// is the film's own (stand at Hakaniemi bound for Kruunuvuori, so the bridge
// shot has a tram 12 over the water) and a clock that is paused between
// captures so a frame is never taken mid-repaint.
//
//   NODE_PATH=$(npm root -g) node toko-move/tools/stills.cjs [outDir]
//
// Writes 01-dispatch, 02-catch, 03-crown-bridge, 04-event, 05-week, 06-daily
// (1080×1920) and cover.png (630×500) + cover@2x.png (1260×1000).
// The game is rendered from the STORE BUILD (tools/package-itch.mjs, unzipped
// into a temp folder), because these are the store page's pictures: no arcade
// HOME button, no LIVE on the title. The cover's lettering reads the brand's
// palette from the repo's toko/.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');

const REPO = path.resolve(__dirname, '..', '..');
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'toko-stills-'));
execFileSync('node', [path.join(REPO, 'toko-move/tools/package-itch.mjs'), path.join(ROOT, 'pkg.zip'), '--dir', path.join(ROOT, 'site')], { cwd: REPO, stdio: 'inherit' });
const OUT = path.resolve(process.argv[2] || 'toko-move-stills');
const W = 405, H = 720, SCALE = 1080 / 405;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

const COVER = () => `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#22282d}canvas{display:block}</style></head><body><canvas id="c"></canvas>
<script type="module">
import { TOKO } from '/toko/js/palette.js';
const c = document.getElementById('c'), d = 2, w = 630 * d, h = 500 * d; c.width = w; c.height = h;
const x = c.getContext('2d');
const img = new Image(); img.src = '/__map.png'; await img.decode();
// the map, cut to the cover's shape around the crossing
const ar = w / h, sw = Math.min(img.width, img.height * ar), sh = sw / ar;
const sx = (img.width - sw) / 2, sy = Math.max(0, Math.min(img.height - sh, img.height * 0.5 - sh / 2));
x.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
// a dark band at the foot for the name, graded so the map runs into it
const g = x.createLinearGradient(0, h * 0.52, 0, h); g.addColorStop(0, 'rgba(26,32,36,0)'); g.addColorStop(0.55, 'rgba(26,32,36,.86)'); g.addColorStop(1, 'rgba(26,32,36,.96)');
x.fillStyle = g; x.fillRect(0, h * 0.52, w, h * 0.48);
const T = (s, px, y, col, weight = 900, ls = 0) => { x.font = weight + ' ' + px * d + 'px ui-monospace, monospace'; x.fillStyle = col; x.textAlign = 'left'; x.letterSpacing = ls * d + 'px'; x.fillText(s, 28 * d, y * d); };
T('TOKO MOVE', 58, 430, TOKO.PAPER, 900, 2);
T('A courier on the real Helsinki trams', 17, 466, '#c9d3d6', 600);
window.__ready = true;
</script></body></html>`;

let mapPng = null;
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/__cover') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(COVER()); }
  if (u === '/__map.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(mapPng); }
  let p = u.startsWith('/toko/') ? path.join(REPO, decodeURIComponent(u)) : path.join(ROOT, 'site', decodeURIComponent(u));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

// What a stranger sees and taps — the same reading as test/stranger.cjs.
const look = page => page.evaluate(() => {
  const vis = e => e && !e.disabled && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const q = sel => [...document.querySelectorAll(sel)].filter(vis), tm = window.__tm, ch = tm.challenge;
  const end = document.getElementById('end'); if (end && !end.hidden) return { phase: 'end' };
  if (q('.eventCard button').length) return { phase: 'event', sel: '.eventCard button:not([disabled])' };
  if (q('#getOff').length) return { phase: 'getoff', sel: '#getOff' };
  if (q('.catchChoice.lit').length) return { phase: 'catch', sel: '.catchChoice.lit:not([disabled])' };
  if (!ch.active && q('#jobBoard .jobOffer:not([disabled])').length) return { phase: 'jobs', sel: '#jobBoard .jobOffer:not([disabled])' };
  return { phase: 'wait' };
});
const settle = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const errs = [];
  const fresh = async q => {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, hasTouch: true, isMobile: true });
    const page = await ctx.newPage(); page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.goto(`${base}/toko-move/${q}`);
    await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
    await page.evaluate(() => window.__tm.flow.clock.setPaused(true));
    return page;
  };
  const shoot = async (page, name) => { await settle(page); await page.waitForTimeout(250); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log(`  ${name}.png`); };
  // Play by tapping what lights; `want` names the screens to keep, first sight of each.
  const play = async (page, want, maxSteps = 5000) => {
    const got = new Set();
    for (let i = 0; i < maxSteps; i++) {
      const s = await look(page);
      if (want[s.phase] && !got.has(s.phase)) { got.add(s.phase); await shoot(page, want[s.phase]); }
      if (s.phase === 'end') return got;
      if (s.sel) { await page.tap(s.sel, { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(60); continue; }
      await page.evaluate(() => window.__tm.flow.runTicks(3));
    }
    return got;
  };
  try {
    // 01 the dispatch board and 02 a lit catch, from a fixed shift
    let page = await fresh('?shift=3&day=none');
    await page.tap('#play'); await page.waitForTimeout(400);
    await shoot(page, '01-dispatch');
    await page.tap('#jobBoard .jobOffer:not([disabled])'); await page.waitForTimeout(300);
    await play(page, { catch: '02-catch' }, 400);
    await page.context().close();

    // 03 the Crown Bridge — the film's setup, and a frame part way over the water
    page = await fresh('?shift=3&day=none');
    await page.tap('#play'); await page.waitForTimeout(400);
    await page.tap('#jobBoard .jobOffer:not([disabled])'); await page.waitForTimeout(300);
    const boarded = await page.evaluate(() => {
      const tm = window.__tm, ch = tm.challenge, line = tm.city.lines.find(l => l.label === '12');
      const layer = tm.transit.layers.find(x => x.id === line.sourceId);
      tm.mobility.location = 'hakaniemi'; ch.currentTo = () => 'kruunuvuori'; ch.active.limit = ch.elapsed() + 1500;
      const idx = id => { const n = tm.city.resolved[id]; let bi = 0, bd = 1e9; layer.path.forEach((q, i) => { const d = (q[0] - n.lat) ** 2 + (q[1] - n.lon) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
      const a = idx('hakaniemi'), dir = idx('kruunuvuori') > a ? 1 : -1;
      const plan = globalThis.__tmRouteChoiceCore.routeChoices(tm.city, 'hakaniemi', 'kruunuvuori', 3).find(c => c.legs[0].line.label === '12');
      for (let t = 0; t < 900; t++) { const near = tm.liveNetwork.nearestTo(layer, a, tm.flow.clock.tick, 2.2, dir);
        if (near) { const r = tm.mobility.catchChoice(plan, near.vehicle); return { ok: !r.error, error: r.error || null }; }
        tm.flow.runTicks(1); }
      return { ok: false, error: 'no tram 12 came' };
    });
    if (!boarded.ok) throw new Error(`could not board tram 12: ${boarded.error}`);
    await page.evaluate(() => window.__tm.camera.snapTo('route')); await page.waitForTimeout(800);
    // ride until the tram is over the water between the two shores
    const over = await page.evaluate(() => {
      const tm = window.__tm;
      for (let t = 0; t < 1200; t++) {
        tm.flow.runTicks(1); if (tm.events?.pending) tm.events.choose(0);
        const r = tm.mobility.ride, v = r && tm.liveNetwork.vehicle(r.vehicleId), p = v && tm.liveNetwork.position(v, tm.flow.clock.tick);
        // the Crown Bridge spans Sompasaari → Korkeasaari → Kruunuvuori, lon ~24.98–25.02
        if (p?.lon > 24.995 && p?.lon < 25.012) return { lat: p.lat, lon: p.lon, tick: tm.flow.clock.tick };
        if (tm.mobility.status().kind === 'getoff') return null;
      }
      return null;
    });
    if (!over) throw new Error('the tram never reached the bridge');
    await page.waitForTimeout(600);
    await shoot(page, '03-crown-bridge');
    // the cover's map: the same moment, without the panels or the zoom rail
    await page.addStyleTag({ content: '#zoomRail,#recentre,#hud{visibility:hidden!important}' });
    await settle(page); await page.waitForTimeout(300);
    mapPng = await page.locator('#map').screenshot();
    await page.context().close();

    // 04 an event card — the first one a stranger meets on shift 1
    page = await fresh('?shift=1');
    await page.tap('#play'); await page.waitForTimeout(400);
    await play(page, { event: '04-event' });
    await page.context().close();

    // 05 the week: Monday played out, the rent on the end card
    page = await fresh('?week');
    await page.tap('#play'); await page.waitForTimeout(400);
    await play(page, { end: '05-week' });
    await page.context().close();

    // 06 the daily: today's shift, the shareable result
    page = await fresh('');
    await page.tap('#play'); await page.waitForTimeout(400);
    await play(page, { end: '06-daily' });
    await page.context().close();

    // the cover
    page = await (await browser.newContext({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 1 })).newPage();
    page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.goto(`${base}/__cover`); await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
    const big = await page.locator('#c').screenshot();
    fs.writeFileSync(path.join(OUT, 'cover@2x.png'), big);
    await page.setContent(`<img id="i" src="data:image/png;base64,${big.toString('base64')}" style="width:630px;height:500px;display:block">`);
    await page.locator('#i').screenshot({ path: path.join(OUT, 'cover.png') });
    console.log('  cover.png, cover@2x.png');
    if (errs.length) throw new Error(`page errors: ${errs.join(' | ')}`);
    console.log(`stills: ${OUT}`);
  } catch (e) { console.error(`stills failed: ${e.message}`); process.exitCode = 1; }
  await browser.close(); server.close(); fs.rmSync(ROOT, { recursive: true, force: true });
});
