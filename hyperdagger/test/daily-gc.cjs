// Hyper Dagger — the daily-key cleanup, pinned.  NODE_PATH=$(npm root -g) node hyperdagger/test/daily-gc.cjs
//
// gcDailyKeys() runs once at boot. It folds every PAST day's best into the
// 30-entry daily table and removes that day's key. Its matcher only knew the
// legacy `hyperDaggerDaily:<date>:<mode>` shape. Since HD-002 the keys are
// `hyperDaggerDaily:<date>:<season>:<mode>`, so nothing matched and old days
// piled up in localStorage forever, never reaching the table.
//
// Seeds stale and today's keys in both shapes, plus look-alikes that are not
// daily keys, boots the page (which runs the cleanup), and checks what is left.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const s = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

const TODAY = new Date().toISOString().slice(0, 10);   // the game's daily date is UTC
const OLD = '2026-01-02', OLDER = '2025-12-31';
const SEASONS = ['void', 'ember', 'inca', 'haul'], MODES = ['pure', 'hyper', 'truck', 'move'];
const K = (...p) => 'hyperDaggerDaily:' + p.join(':');
const stale = {}, kept = {};
let n = 0;
for (const sn of SEASONS) for (const m of MODES) {
  stale[K(OLD, sn, m)] = String(10 + n++);          // current shape, a past day
  kept[K(TODAY, sn, m)] = String(50 + n);           // current shape, today
}
stale[K(OLDER, 'ember', 'hyper')] = '7.5';
for (const m of ['pure', 'hyper']) { stale[K(OLD, m)] = String(5 + m.length); kept[K(TODAY, m)] = '33.3'; }   // the legacy shape
Object.assign(kept, {
  hyperDaggerDailyBest: JSON.stringify([{ date: '2025-11-11', mode: 'pure', t: 99.9 }]),   // the table itself
  hyperDaggerHi: '120.5', hyperDaggerHiHyper: '80', hyperDaggerHiTruck: '60',             // the free-run bests
  hyperDaggerHiTruckV58: '61',                                    // v58's TRUCK best (the v57 key above is left on the disk, unread)
  hyperDaggerModeV31: 'hyper', hyperDaggerSeason: 'ember', hyperDaggerRunKind: 'daily',
  'hyperDaggerDaily:junk': '1',                                   // look-alikes that are not a dated daily key
  [K(OLD, 'ember', 'pure', 'extra')]: '2',
  [K('2026-1-2', 'pure')]: '3',
  [K(OLD, 'ember', '')]: '4',
  [K(OLD, 'em-ber', 'pure')]: '5',
  ['x' + K(OLD, 'ember', 'pure')]: '6',
  [K(OLD, 'ember', 'pure') + ' ']: '7',
  [K('2999-01-01', 'ember', 'pure')]: '8',                        // a future date (a clock set back) is not stale
  someOtherGame: 'keep',
});

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    env: { ...process.env, LD_LIBRARY_PATH: process.env.PLAYWRIGHT_CHROMIUM_LIB || process.env.LD_LIBRARY_PATH },
    args: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? ['--no-sandbox', '--single-process', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--in-process-gpu']
      : ['--use-gl=swiftshader', '--disable-dev-shm-usage'],
  });
  const errs = [];
  try {
    const q = await b.newPage({ viewport: { width: 820, height: 540 } });
    q.on('pageerror', e => errs.push('pageerror: ' + e.message));
    // seed once, before the game's first module runs (a reload must not re-seed)
    await q.addInitScript(seed => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v); } }, { ...stale, ...kept });
    await q.goto(base + '/hyperdagger/?assets=0', { waitUntil: 'load' });
    await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
    const r = await q.evaluate(() => ({ all: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])),
      table: window.__hd.debug.getDailyTable?.() ?? JSON.parse(localStorage.getItem('hyperDaggerDailyBest') || '[]') }));
    const left = Object.keys(stale).filter(k => k in r.all);
    ok(`every stale daily key is removed (${Object.keys(stale).length}: current season:mode shape and legacy mode shape)`, left.length === 0, left.slice(0, 4).join(' | '));
    const lost = Object.keys(kept).filter(k => k !== 'hyperDaggerDailyBest' && r.all[k] !== kept[k]);
    ok("today's keys, the free-run bests and every non-daily key are untouched", lost.length === 0, lost.slice(0, 4).join(' | '));
    const tbl = JSON.parse(r.all.hyperDaggerDailyBest || '[]');
    ok('the existing table entry stays', tbl.some(e => e.date === '2025-11-11' && e.t === 99.9), JSON.stringify(tbl.slice(0, 3)));
    // the table keeps its 30 best: every stale time high enough to make it is in it
    const want = Object.entries(stale).map(([k, v]) => ({ date: k.split(':')[1], t: parseFloat(v) })).concat([{ t: 99.9 }])
      .sort((a, c) => c.t - a.t).slice(0, 30).filter(e => e.date);
    const miss = want.filter(w => !tbl.some(e => e.date === w.date && e.t === w.t));
    ok('stale bests are folded into the daily table before their keys go', miss.length === 0 && tbl.length <= 30, JSON.stringify({ miss: miss.slice(0, 3), n: tbl.length }));
    // a second boot finds nothing more to do
    await q.reload({ waitUntil: 'load' });
    await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
    const again = await q.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
    const lost2 = Object.keys(kept).filter(k => k !== 'hyperDaggerDailyBest' && again[k] !== kept[k]);
    ok('a second boot keeps the same keys and the same table', lost2.length === 0 && again.hyperDaggerDailyBest === r.all.hyperDaggerDailyBest, lost2.join(' | '));
    await q.close();
  } catch (e) {
    ok('the run completed', false, e.stack || String(e));
  }
  ok('zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
