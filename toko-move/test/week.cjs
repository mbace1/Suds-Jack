// THE WEEK, IN THE PAGE (v2.47).
//
// week.mjs holds the rules; this holds the run a player actually walks: in
// from the daily's title card, five shifts that each happen once, money that
// carries, a reload that clocks you out instead of giving the morning back,
// Friday's rent, and a new week after it. Regulars belong to the week, so the
// browser's own standing must not leak into Monday.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/week.cjs [rootDir]
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  // Loaded, not startable: a night without a pick holds START on purpose.
  const ready = () => page.waitForFunction(() => window.__tm?.rival && !/LOADING/.test(document.getElementById('play').textContent), null, { timeout: 30000 });
  const boot = async q => { await page.goto(`${base}/toko-move/${q}`, { waitUntil: 'load' }); await ready(); };
  const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('tokoMoveWeek') || 'null'));
  // Run a shift out on the clock: ending is what is under test, not playing.
  const runOut = async () => { await page.tap('#play');
    await page.evaluate(() => window.__tm.flow.runTicks(window.__tm.flow.clock.ticksPerDay + 50));
    await page.waitForFunction(() => !document.getElementById('end').hidden, null, { timeout: 15000 }); };
  try {
    // ── ?kit= is for pinned shifts, never the daily ──────────────────────
    await boot('?kit=bag,bike');
    const dk = await page.evaluate(() => ({ kit: window.__tm.kit, cap: window.__tm.challenge.capacity(), walk: window.__tm.walkFactor, kind: window.__tm.shiftInfo.kind }));
    ok("the daily ignores ?kit= — its result is one everybody compares", dk.kind === 'daily' && dk.kit.length === 0 && dk.cap === 5, JSON.stringify(dk));
    await boot('?shift=5&day=none&kit=bag,bike');
    const pk = await page.evaluate(() => ({ cap: window.__tm.challenge.capacity(), walk: window.__tm.walkFactor }));
    ok('a pinned shift takes it: the bag holds 7, walking costs 0.6', pk.cap === 7 && Math.abs(pk.walk - 0.6) < 1e-9, JSON.stringify(pk));

    // ── in from the daily ────────────────────────────────────────────────
    await boot('');
    await page.evaluate(() => localStorage.setItem('tokoMoveRegulars', JSON.stringify({ kiosk: 5, bakery: 4 })));
    const link = await page.locator('#weekLink');
    ok('the daily\'s title card offers the week', await link.isVisible() && /WEEK/.test(await link.textContent()), await link.textContent());
    await link.tap(); await ready();
    ok('and it leads to ?week', /\?week$/.test(page.url()), page.url());
    const mon = await page.evaluate(() => ({ play: document.getElementById('play').textContent, no: document.getElementById('shiftNo').innerText,
      kind: window.__tm.shiftInfo.kind, standing: window.__tm.challenge.standing, link: document.getElementById('weekLink').hidden }));
    ok(`Monday is named on the button (${mon.play})`, mon.kind === 'week' && mon.play === 'START MONDAY');
    ok('the card shows the week, the rent and the pace', /1 of 5/.test(mon.no) && /rent €\d+ on Friday/.test(mon.no), mon.no.replace(/\n/g, ' / '));
    ok("Monday's regulars know nothing, whatever the browser's daily standing is", JSON.stringify(mon.standing) === '{}', JSON.stringify(mon.standing));
    ok('and the week does not offer itself again', mon.link === true);
    const seed = (await save()).seed;

    // ── Monday, played out ───────────────────────────────────────────────
    await runOut();
    const end = await page.evaluate(() => ({ box: document.querySelector('.weekBox')?.innerText || '', offers: document.querySelectorAll('.weekBox .kitOffer').length,
      head: document.querySelector('.kitHead')?.textContent || '', next: !!document.getElementById('nextShift'), again: document.getElementById('again').hidden }));
    ok('the end card has the day, its money and the week strip', /MONDAY/.test(end.box) && /€\d+/.test(end.box) && /TUE/.test(end.box), end.box.replace(/\n/g, ' / ').slice(0, 120));
    ok(`the way on is tonight's kit: three offers for Tuesday (${end.head})`, end.offers === 3 && /TUESDAY/.test(end.head) && !end.next);
    ok('and a shift of the week cannot be run again', end.again === true);
    let w = await save(); ok('Monday is recorded, Tuesday is next', w.day === 1 && w.shifts.length === 1 && w.started === null, JSON.stringify({ day: w.day, n: w.shifts.length }));
    // Nothing is delivered in a run-out, so write through the store the
    // challenge saves with (deliveries.js: saveStanding(this.standing, this.standingStore)).
    const wrote = await page.evaluate(() => { window.__tm.challenge.standingStore.setItem('tokoMoveRegulars', JSON.stringify({ kiosk: 1 }));
      return { global: localStorage.getItem('tokoMoveRegulars'), week: JSON.parse(localStorage.getItem('tokoMoveWeek')).standing }; });
    ok("the challenge's standing lands in the week's save and never in the browser's", wrote.week.kiosk === 1 && wrote.global === JSON.stringify({ kiosk: 5, bakery: 4 }), JSON.stringify(wrote));

    // ── a night left without a pick ──────────────────────────────────────
    await page.goto(`${base}/toko-move/?week`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.rival && document.querySelectorAll('#shiftNo .kitOffer').length, null, { timeout: 30000 });
    const held = await page.evaluate(() => ({ play: document.getElementById('play').textContent, off: document.getElementById('play').disabled, n: document.querySelectorAll('#shiftNo .kitOffer').length }));
    ok('closing the card without picking: the title offers the same three and holds the shift', held.off && held.play === 'TAKE ONE FIRST' && held.n === 3, JSON.stringify(held));
    const picked = await page.evaluate(() => document.querySelector('#shiftNo .kitOffer').dataset.kit);
    await page.locator('#shiftNo .kitOffer').first().tap(); await ready();

    // ── Tuesday, left half-played ────────────────────────────────────────
    ok('the next page is Tuesday', (await page.locator('#play').textContent()) === 'START TUESDAY');
    ok("Tuesday's regulars remember Monday", (await page.evaluate(() => window.__tm.challenge.standing.kiosk)) === 1);
    const kitOn = await page.evaluate(() => ({ kit: window.__tm.kit, fx: window.__tm.challenge.kit }));
    ok(`the kit taken on Monday night is on Tuesday's shift (${picked})`, kitOn.kit.includes(picked) && kitOn.fx && JSON.stringify(kitOn.fx) !== JSON.stringify({ capacity: null, walk: 1, fresh: 1, limit: 1, tips: 1, padding: false }), JSON.stringify(kitOn));
    const tueSeed = await page.evaluate(() => window.__tm.shiftSeed);
    await page.tap('#play'); await page.evaluate(() => window.__tm.flow.runTicks(300));
    await page.evaluate(() => { const ch = window.__tm.challenge; ch.score += 730; ch.results.push('ok'); window.__tm.flow.runTicks(1); });   // as if a delivery landed
    w = await save(); ok('a shift in progress is written as it goes', w.started === 1 && w.live?.score >= 730, JSON.stringify(w.live));
    await boot('?week');
    w = await save();
    const wed = await page.evaluate(() => ({ play: document.getElementById('play').textContent, no: document.getElementById('shiftNo').innerText, seed: window.__tm.shiftSeed }));
    ok('reloading mid-shift clocks out: Tuesday is closed with what it had banked', w.day === 2 && w.shifts[1].left === true && w.shifts[1].euros >= 73, JSON.stringify(w.shifts[1]));
    ok('and the page moves on to Wednesday rather than giving Tuesday back', /WEDNESDAY/.test(wed.no) && wed.seed !== tueSeed);
    ok('the title says so before the next shift starts', /tuesday was left mid-shift/.test(wed.no), wed.no.replace(/\n/g, ' / '));
    await page.locator('#shiftNo .kitOffer').first().tap(); await ready();
    ok('with the night picked, Wednesday can start', (await page.locator('#play').textContent()) === 'START WEDNESDAY');
    await boot('?week'); w = await save();
    ok('opening the page without starting does not burn a day', w.day === 2 && w.kit.length === 2);

    // ── to Friday ────────────────────────────────────────────────────────
    for (const d of ['WEDNESDAY', 'THURSDAY', 'FRIDAY']) {
      if (d !== 'WEDNESDAY') { await page.locator('.weekBox .kitOffer').first().tap(); await ready(); }
      await runOut();
    }
    const fri = await page.evaluate(() => ({ verdict: document.querySelector('.weekVerdict')?.textContent || '', share: !!document.getElementById('share'),
      fresh: document.getElementById('newWeek')?.textContent || '', next: !!document.getElementById('nextShift'), again: document.getElementById('again').hidden }));
    w = await save();
    ok(`Friday settles the rent (${fri.verdict})`, /RENT PAID|SHORT €\d+/.test(fri.verdict) && w.day === 5);
    ok('the week is shared, not the shift — and Friday offers no kit', fri.share && !fri.next && fri.again && !(await page.locator('.kitOffer').count()));
    ok('four nights, four items', w.kit.length === 4 && new Set(w.kit).size === 4, w.kit.join());
    await page.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { window.__copied = t; return Promise.resolve(); } }, configurable: true }); });
    await page.tap('#share'); await page.waitForTimeout(200);
    const text = await page.evaluate(() => window.__copied || '');
    ok('the line has all five days, the kit and the rent', /MON .*€\d+/.test(text) && /FRI/.test(text) && /\(left\)/.test(text) && /kit /.test(text) && /rent|short/.test(text), text.replace(/\n/g, ' / '));

    // ── and a new week ───────────────────────────────────────────────────
    await page.tap('#newWeek'); await ready();
    w = await save();
    ok('A NEW WEEK is Monday again, on a different seed', w.day === 0 && w.shifts.length === 0 && (await page.locator('#play').textContent()) === 'START MONDAY', `seed ${seed} → ${w.seed}`);
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  week: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
