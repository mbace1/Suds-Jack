// Toko Move — the store page's STILLS, from the v3 journey (v3.7; the Act 1
// ship plan's store pass). tools/stills.cjs shot the real-time game; this
// shoots the card journey a stranger now meets first. Nothing is mocked up:
// the page is the STORE BUILD (tools/package-itch.mjs, unzipped alone — no
// arcade HOME button), on a 9:16 phone (405×720 CSS, captured at 1080×1920),
// and every screen is one a player reaches by tapping. The only setup is a
// pinned seed per shot and, for the later shots, the save a player would have
// by then (the ladder cleared, a fourth run, Friday of a week).
//
//   NODE_PATH=$(npm root -g) node toko-move/tools/stills3.cjs [outDir]
//
// Writes 00-title, 01-dispatch, 02-risk, 03-museum-tram, 04-board,
// 05-delivered, 06-race, 07-sealed, 08-night, 09-easy-complete, 10-daily,
// 11-week-rent (all 1080×1920) and cover.png (630×500) + cover@2x.png — the
// cover is the game's own Kauppatori stop (scenes/stop/169), composited,
// with the wordmark on the bible's paper.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');

const REPO = path.resolve(__dirname, '..', '..');
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'toko-stills3-'));
execFileSync('node', [path.join(REPO, 'toko-move/tools/package-itch.mjs'), path.join(ROOT, 'pkg.zip'), '--dir', path.join(ROOT, 'site')], { cwd: REPO, stdio: 'inherit' });
const OUT = path.resolve(process.argv[2] || 'toko-move-stills');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };

// the cover: the stop as the game draws it at Kauppatori, an old tram in, and
// the wordmark on a paper band — the courier's cyan once, as its full stop
const LAYERS = ['01-backdrop', '01b-land-kauppatori', '01c-wheel', '02-street', '03-tram-nr2', '04-shelter', '05-people', '06-courier'];
const COVER = () => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#f4f1e8}canvas{display:block}</style></head><body><canvas id="c"></canvas>
<script type="module">
const c = document.getElementById('c'), d = 2, w = 630 * d, h = 500 * d; c.width = w; c.height = h;
const x = c.getContext('2d');
const load = async src => { const i = new Image(); i.src = src; await i.decode(); return i; };
const layers = await Promise.all(${JSON.stringify(LAYERS)}.map(l => load('/toko-move/scenes/stop/169/' + l + '.webp')));
// the 16:9 stop cut to the cover's shape: the wheel, the shelter, the tram and the courier all in
const sh = 1080, sw = sh * w / h, sx = 20, sy = 0;
for (const im of layers) x.drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
const g = x.createLinearGradient(0, h * 0.62, 0, h); g.addColorStop(0, 'rgba(244,241,232,0)'); g.addColorStop(0.45, 'rgba(244,241,232,.92)'); g.addColorStop(1, 'rgba(244,241,232,.98)');
x.fillStyle = g; x.fillRect(0, h * 0.62, w, h * 0.38);
const T = (s, px, y, col, weight = 900, ls = 0) => { x.font = weight + ' ' + px * d + 'px ui-monospace, monospace'; x.fillStyle = col; x.textAlign = 'left'; x.letterSpacing = ls * d + 'px'; x.fillText(s, 28 * d, y * d); };
T('TOKO MOVE', 58, 440, '#15262b', 900, 2);
T("Act 1 · Helsinki · a courier's shift, one card at a time", 15, 472, '#3a474c', 600);
x.font = '900 ' + 58 * d + 'px ui-monospace, monospace'; x.letterSpacing = 2 * d + 'px'; const tw = x.measureText('TOKO MOVE').width;
x.fillStyle = '#33b2d2'; x.beginPath(); x.arc(28 * d + tw + 9 * d, 433 * d, 7 * d, 0, Math.PI * 2); x.fill();
window.__ready = true;
</script></body></html>`;

const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/__cover') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(COVER()); }
  let p = path.join(ROOT, 'site', decodeURIComponent(u));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

const PHONE = { viewport: { width: 405, height: 720 }, deviceScaleFactor: 1080 / 405, hasTouch: true, isMobile: true, locale: 'en-US' };
const ready = page => page.waitForFunction(() => window.__tm3 && !document.getElementById('play').disabled, null, { timeout: 30000 });
const state = page => page.evaluate(() => ({ end: !document.getElementById('end').hidden, busy: window.__tm3.busy(), scene: window.__tm3.scene(), line: document.querySelector('.evLine')?.textContent || '',
  btn: !!document.querySelector('#v3panel .eventOpt:not([disabled])'), odds: !!document.querySelector('.evStk em'), board: document.getElementById('v3board').classList.contains('on'),
  stamp: document.querySelector('.v3stamp')?.textContent || '', car: [...document.querySelectorAll('#v3frame .L')].map(e => (getComputedStyle(e).backgroundImage.match(/02-car(-[a-z]+)?\.webp/) || [])[0]).find(Boolean) || '',
  tram: document.getElementById('v3tram')?.dataset.model || '', glow: !!document.querySelector('#v3tram.glow') }));
const shot = async (page, name) => { await page.waitForTimeout(650); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); console.log(`  ${name}.png`); };
// tap the first button of every card; NEVER hurry, so a hop and a stamp stay on
// screen long enough to be shot. `want` is a list of [name, test]; each is shot once.
async function playFor(page, want, { max = 900 } = {}) {
  const got = new Set();
  for (let i = 0; i < max && got.size < want.length; i++) {
    const s = await state(page);
    for (const [name, test] of want) if (!got.has(name) && test(s)) { await shot(page, name); got.add(name); }
    if (s.end) break;
    if (!s.busy && s.btn) { await page.tap('#v3panel .eventOpt[data-i="0"]', { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(250); continue; }
    await page.waitForTimeout(120);
  }
  return got;
}
const seed = (ctx, kv) => ctx.addInitScript(kv => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, JSON.stringify(v)); }, kv);

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    // 00 the title a new player meets; 01–05, 09 an EASY shift at Lasipalatsi
    { const ctx = await browser.newContext(PHONE), page = await ctx.newPage();
      await page.goto(`${base}/toko-move/index.html`, { waitUntil: 'load' }); await ready(page); await shot(page, '00-title');
      await page.goto(`${base}/toko-move/index.html?run=easy&seed=1002`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play');
      await playFor(page, [['01-dispatch', s => s.btn && !s.busy && /for /.test(s.line) && s.scene === 'stop'], ['02-risk', s => s.btn && !s.busy && s.odds],
        ['04-board', s => s.board && s.busy], ['05-delivered', s => /DELIVERED/.test(s.stamp) && /Signed for/.test(s.stamp)], ['09-easy-complete', s => s.end]]);
      await ctx.close(); }
    // 03 the museum tram from inside (seed 1197 rides it first)
    { const ctx = await browser.newContext(PHONE), page = await ctx.newPage();
      await page.goto(`${base}/toko-move/index.html?run=easy&seed=1197`, { waitUntil: 'load' }); await ready(page); await page.tap('#play');
      await playFor(page, [['03-museum-tram', s => s.scene === 'tram' && /museum/.test(s.car)]]); await ctx.close(); }
    // 06 the race and 07 the sealed parcel: a fourth run of MEDIUM
    { const ctx = await browser.newContext(PHONE); await seed(ctx, { tokoMoveRuns: { easy: { done: true, stars: 2, plays: 2 }, medium: { plays: 1 } } });
      const page = await ctx.newPage(); await page.goto(`${base}/toko-move/index.html?run=medium&seed=1002`, { waitUntil: 'load' }); await ready(page); await page.tap('#play');
      await playFor(page, [['06-race', s => s.btn && !s.busy && /other courier wants it too/.test(s.line)], ['07-sealed', s => s.btn && !s.busy && /you'll know the stop/.test(s.line)]]); await ctx.close(); }
    // 08 NIGHT: the tram with no number
    { const ctx = await browser.newContext(PHONE); await seed(ctx, { tokoMoveRuns: { easy: { done: true }, medium: { done: true }, hard: { done: true } } });
      const page = await ctx.newPage(); await page.goto(`${base}/toko-move/index.html?run=night&seed=60`, { waitUntil: 'load' }); await ready(page); await page.tap('#play');
      await playFor(page, [['08-night', s => s.glow && s.scene === 'stop']], { max: 400 }); await ctx.close(); }
    // 10 the daily's end card, and 11 the week's Friday
    { const ctx = await browser.newContext(PHONE), page = await ctx.newPage();
      await page.goto(`${base}/toko-move/index.html?daily&date=2026-11-04`, { waitUntil: 'load' }); await ready(page); await page.tap('#play');
      await playFor(page, [['10-daily', s => s.end]]);
      await page.evaluate(() => { const days = ['none', 'none', 'match', 'market', 'helsinki']; const sh = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'].map((name, i) => ({ name, day: days[i], score: [1040, 870, 1210, 960][i], euros: [104, 87, 121, 96][i], results: ['ok', 'ok', i === 1 ? 'late' : 'ok', 'ok'], drops: 0, tips: 0, left: false, trail: [] }));
        localStorage.setItem('tokoMoveWeek3', JSON.stringify({ seed: 4242, day: 4, days, shifts: sh, started: null, live: null, kit: [], nights: {} })); });
      await page.goto(`${base}/toko-move/index.html?week`, { waitUntil: 'load' }); await ready(page); await page.tap('#play');
      await playFor(page, [['11-week-rent', s => s.end]]); await ctx.close(); }
    // the cover
    { const page = await browser.newPage({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 2 });
      await page.goto(`${base}/__cover`); await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
      const big = Buffer.from((await page.evaluate(() => document.getElementById('c').toDataURL('image/png'))).split(',')[1], 'base64');
      fs.writeFileSync(path.join(OUT, 'cover@2x.png'), big);
      await page.setViewportSize({ width: 630, height: 500 });
      await page.evaluate(() => { const c = document.getElementById('c'); c.style.width = '630px'; c.style.height = '500px'; });
      const p2 = await browser.newPage({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 1 });
      await p2.goto(`${base}/__cover`); await p2.waitForFunction(() => window.__ready, null, { timeout: 30000 });
      await p2.evaluate(() => { const c = document.getElementById('c'); c.style.width = '630px'; c.style.height = '500px'; });
      await p2.screenshot({ path: path.join(OUT, 'cover.png'), clip: { x: 0, y: 0, width: 630, height: 500 } });
      console.log('  cover.png, cover@2x.png'); }
  } catch (e) { console.error('stills3 failed:', e); process.exitCode = 1; }
  await browser.close(); server.close();
});
