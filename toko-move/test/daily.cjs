// THE DAILY SHIFT, IN THE PAGE (v2.45).
//
// daily.mjs holds the module; this holds the promise the player actually
// sees. Two strangers opening the game today get the same shift. Finishing it
// records the day's result and offers a line to send. Coming back says the
// day is played before a single tick runs, and a second finish is practice
// that never overwrites the first. A pinned or random shift offers none of it.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/daily.cjs [rootDir]
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
  const errs = [];
  const fresh = async () => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage(); page.on('pageerror', e => errs.push(String(e).slice(0, 140))); return { ctx, page }; };
  const boot = async (page, q = '') => { await page.goto(`${base}/toko-move/${q}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.rival && window.__tm?.challenge?.offers?.length, null, { timeout: 30000 }); };
  // Run the day out without playing: the shift still ends, and ending is what is under test.
  const runOut = page => page.evaluate(() => { document.getElementById('play').click(); window.__tm.flow.runTicks(window.__tm.flow.clock.ticksPerDay + 50); });
  try {
    // ── two strangers, one day ──────────────────────────────────────────
    const A = await fresh(), B = await fresh();
    await boot(A.page); await boot(B.page);
    const read = p => p.evaluate(() => ({ info: window.__tm.shiftInfo, day: window.__tm.cityDay?.id || null,
      offers: window.__tm.challenge.offers.map(o => `${o.stops[1]}:${o.cargo}`).join(','),
      card: document.getElementById('shiftNo')?.textContent || '' }));
    const a = await read(A.page), b = await read(B.page);
    ok(`no parameter is today's daily (${a.card})`, a.info.kind === 'daily' && /^DAILY \d+ · \d+ \w{3}/.test(a.card));
    ok('two strangers get the same shift today', a.info.seed === b.info.seed && a.day === b.day);
    ok(`and the same jobs on the board (${a.offers.slice(0, 50)}…)`, a.offers === b.offers && a.offers.length > 0);
    await B.ctx.close();

    // ── the first finish is the result ─────────────────────────────────
    await A.ctx.grantPermissions?.(['clipboard-read', 'clipboard-write']).catch(() => {});
    await A.page.evaluate(() => { window.__copied = null;
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__copied = t; return Promise.resolve(); } }, configurable: true }); });
    await runOut(A.page);
    await A.page.waitForFunction(() => !document.getElementById('end').hidden, null, { timeout: 15000 });
    const end = await A.page.evaluate(() => ({ box: document.querySelector('.dailyBox')?.innerText || '',
      stored: JSON.parse(localStorage.getItem('tokoMoveDaily') || '{}'), key: window.__tm.shiftInfo.key,
      again: document.getElementById('again').textContent }));
    ok('the end card leads with the day and its grid', /DAILY \d+/.test(end.box) && /[🟩🟨⬛]{3}/u.test(end.box), end.box.slice(0, 80));
    ok("it is today's result", /today's result/.test(end.box));
    ok('and it is recorded against today', !!end.stored[end.key]);
    ok('replaying is offered as practice, not as another go at the result', /PRACTICE/.test(end.again));
    await A.page.click('#share');
    await A.page.waitForFunction(() => window.__copied, null, { timeout: 5000 }).catch(() => {});
    const shared = await A.page.evaluate(() => ({ t: window.__copied, btn: document.getElementById('share').textContent }));
    ok('SHARE puts a line on the clipboard where the phone has no share sheet', !!shared.t && shared.btn === 'COPIED', shared.btn);
    ok(`the line names the daily and carries the grid (${(shared.t || '').split('\n')[0]})`, /^Toko Move · Daily \d+ · \d+ \w{3}\n/.test(shared.t || '') && /[🟩🟨⬛]{3}/u.test(shared.t || ''));
    ok('and links to today, never to a pinned shift', /\/toko-move\/$/m.test(shared.t || '') && !/shift=/.test(shared.t || ''));

    // ── coming back ────────────────────────────────────────────────────
    await boot(A.page);
    const back = await A.page.evaluate(() => document.getElementById('shiftNo')?.textContent || '');
    ok(`the title says the day is played before the run starts (${back.replace(/\s+/g, ' ').slice(0, 70)})`, /played/.test(back) && /practice/.test(back));
    const before = await A.page.evaluate(() => localStorage.getItem('tokoMoveDaily'));
    await A.page.evaluate(() => { window.__tm.challenge.score = 99999; });
    await runOut(A.page);
    await A.page.waitForFunction(() => !document.getElementById('end').hidden, null, { timeout: 15000 });
    const again = await A.page.evaluate(() => ({ box: document.querySelector('.dailyBox')?.innerText || '', stored: localStorage.getItem('tokoMoveDaily') }));
    ok('a second finish is practice', /practice/.test(again.box));
    ok('and a better practice score does not overwrite the day', again.stored === before && !/99999/.test(again.stored));
    await A.ctx.close();

    // ── a pinned or random shift is not a daily ────────────────────────
    for (const q of ['?shift=4821', '?shift=random']) {
      const C = await fresh(); await boot(C.page, q);
      const kind = await C.page.evaluate(() => window.__tm.shiftInfo.kind);
      await runOut(C.page);
      await C.page.waitForFunction(() => !document.getElementById('end').hidden, null, { timeout: 15000 });
      const e = await C.page.evaluate(() => ({ box: !!document.querySelector('.dailyBox'), stored: localStorage.getItem('tokoMoveDaily'), again: document.getElementById('again').textContent }));
      ok(`${q} is ${kind}, offers no share and records nothing`, kind !== 'daily' && !e.box && !e.stored, JSON.stringify(e));
      await C.ctx.close();
    }
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  daily: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
