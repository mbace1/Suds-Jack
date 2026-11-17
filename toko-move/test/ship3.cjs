// THE SHIP BAR, ON THE JOURNEY (v3.7, the Act 1 ship plan's last step).
// test/ship.cjs holds it for the real-time game (?classic); this holds the
// same bar for the card journey a stranger now meets first. Each item is the
// thing a phone does to a game that no feature test does on purpose:
//
//   S1  the whole WEEK plays by tapping, Monday to the rent, and the page does
//       not grow as it goes;
//   S2  a hidden tab makes no noise (the context suspends), and leaving a week
//       mid-shift is the clock-out: what was delivered is banked;
//   S3  storage that THROWS still plays a run to its end card, and every save
//       in the wrong shape is a fresh start — the ladder, the daily, the week;
//   S4  a 320px phone plays a whole run with every card on screen;
//   S5  frame cost is MEASURED, not gated (headless composites in software);
//   S6  nothing sounds before the first touch;
//   S7  the data credits are on the title card, in English and Finnish.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/ship3.cjs [rootDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'en-US' };
const ready = page => page.waitForFunction(() => window.__tm3 && !document.getElementById('play').disabled, null, { timeout: 30000 });
const watch = page => { const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160))); page.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); }); return errs; };

// tap the first lit button of every card; tap the scene to hurry a hop. Stops
// at the end card, or once `until(state)` says so. Reports what it saw.
async function tapThrough(page, { until = null, max = 700 } = {}) {
  const seen = { bad: [], nodes: [], end: false, cards: 0 };
  for (let i = 0; i < max; i++) {
    const s = await page.evaluate(() => {
      const vw = innerWidth, vh = innerHeight, btns = [...document.querySelectorAll('#v3panel .eventOpt:not([disabled])')];
      return { end: !document.getElementById('end').hidden, busy: window.__tm3.busy(), done: window.__tm3.state()?.done || 0, nodes: document.getElementsByTagName('*').length,
        btns: btns.map(b => { const r = b.getBoundingClientRect(); return { h: r.height, inside: r.left >= 0 && r.right <= vw + 0.5 && r.top >= 0 && r.bottom <= vh + 0.5 }; }),
        overflow: document.documentElement.scrollWidth > vw + 1 };
    });
    if (s.end) { seen.end = true; break; }
    if (until && !s.busy && (await until(s))) break;
    if (s.overflow) seen.bad.push('the page overflowed sideways');
    if (!s.busy && s.btns.length) {
      if (s.btns.some(b => !b.inside)) { await page.waitForTimeout(400); continue; }   // a card still sliding in
      if (s.btns.some(b => b.h < 44)) seen.bad.push('a button under 44px');
      seen.cards++; seen.nodes.push(s.nodes);
      await page.tap('#v3panel .eventOpt[data-i="0"]', { timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(120); continue;
    }
    await page.touchscreen.tap(Math.round(page.viewportSize().width * 0.2), Math.round(page.viewportSize().height * 0.42)).catch(() => {});
    await page.waitForTimeout(140);
  }
  return seen;
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    // ── S6 · S7: the title card, before anything is touched
    for (const lang of ['en', 'fi']) {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/${lang === 'fi' ? '?lang=fi' : ''}`, { waitUntil: 'load' }); await ready(page);
      const t = await page.evaluate(() => { const c = document.getElementById('credits'); return { credits: c?.textContent || '', shown: !!c && c.offsetParent !== null, ctx: window.__tm3.audio.context(), heard: window.__tm3.audio.log.length }; });
      ok(`S7 the data credits are on the title card (${lang}: ${t.credits.slice(0, 50)}…)`, t.shown && /HSL/.test(t.credits) && /OpenStreetMap/.test(t.credits));
      if (lang === 'en') ok('S6 nothing sounds before the first touch (no audio context, nothing played)', t.ctx === null && t.heard === 0);
      ok(`no page errors on the title (${lang})`, !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }

    // ── S1: the whole week, by tapping, Monday to the rent
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      const days = [];
      for (let d = 0; d < 5; d++) {
        await page.goto(`${base}/toko-move/?week`, { waitUntil: 'load' }); await ready(page);
        const name = await page.evaluate(() => window.__tm3.run.name);
        await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
        const seen = await tapThrough(page);
        await page.waitForTimeout(500);
        const e = await page.evaluate(() => ({ again: document.getElementById('again').textContent, stats: document.getElementById('endStats').textContent }));
        const grew = seen.nodes.length > 2 ? seen.nodes[seen.nodes.length - 1] / seen.nodes[0] : 1;
        days.push({ name, end: seen.end, again: e.again, grew: +grew.toFixed(2), bad: seen.bad.length, stats: e.stats });
      }
      const fri = days[4];
      ok(`S1 a whole week plays by tapping, Monday to Friday (${days.map(d => `${d.name.slice(0, 3)}${d.end ? '✓' : '✗'}`).join(' ')})`, days.map(d => d.name).join() === 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY' && days.every(d => d.end));
      ok(`S1 each day hands on to the next, and Friday to a new week (${days.map(d => d.again).join(' / ')})`, days.slice(0, 4).every((d, i) => d.again === `NEXT · ${days[i + 1].name}`) && fri.again === 'A NEW WEEK');
      ok(`S1 Friday is the rent (${(fri.stats.match(/RENT PAID · €\d+ over|SHORT €\d+ ON THE RENT/) || ['?'])[0]})`, /RENT PAID · €\d+ over|SHORT €\d+ ON THE RENT/.test(fri.stats));
      ok(`S1 the page does not grow through a shift (${days.map(d => `×${d.grew}`).join(' ')})`, days.every(d => d.grew < 1.5));
      ok('S1 every card on every day kept to the grammar (≥44px, on screen, no sideways scroll)', days.every(d => d.bad === 0));
      ok('S1 no page or network errors across the week', !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }

    // ── S2: a hidden tab is silent; leaving a week mid-shift banks what it made
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?week`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const hide = v => page.evaluate(h => { Object.defineProperty(document, 'hidden', { value: h, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, v);
      await hide(true); await page.waitForTimeout(250);
      const hidden = await page.evaluate(() => window.__tm3.audio.context()?.state);
      await hide(false); await page.waitForTimeout(250);
      const back = await page.evaluate(() => window.__tm3.audio.context()?.state);
      ok(`S2 a hidden tab suspends the sound, and it comes back (${hidden} → ${back})`, hidden === 'suspended' && back === 'running');
      await tapThrough(page, { until: s => s.done >= 1 });
      const banked = await page.evaluate(() => window.__tm3.state().score);
      await page.goto(`${base}/toko-move/?week`, { waitUntil: 'load' }); await ready(page);
      const t = await page.evaluate(() => ({ day: window.__tm3.run.name, strip: document.querySelector('.weekStrip')?.textContent || '' }));
      ok(`S2 leaving Monday mid-shift is the clock-out: €${banked} banked, Tuesday next (${t.day} · ${t.strip})`, banked > 0 && t.day === 'TUESDAY' && t.strip.includes(`MON€${banked}`));
      ok('S2 no page errors', !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }

    // ── S3: storage that throws, and saves in the wrong shape
    {
      const ctx = await browser.newContext(PHONE);
      await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }); });
      const page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1002`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const seen = await tapThrough(page);
      ok('S3 storage that throws still plays a run to its end card', seen.end);
      ok('S3 and throws nothing at the page', !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext(PHONE);
      await ctx.addInitScript(() => { if (sessionStorage.getItem('junk')) return; sessionStorage.setItem('junk', '1');
        const junk = { tokoMoveRuns: '[]', tokoMoveMemory: '"x"', tokoMoveRegulars: '{"flor":"lots"}', tokoMoveWeek3: '{"day":"x"}', tokoMoveDaily: '[1]', tokoMoveNotebook: '{}', tokoMoveSound: '42' };
        for (const [k, v] of Object.entries(junk)) localStorage.setItem(k, v); });
      const page = await ctx.newPage(), errs = watch(page), got = [];
      for (const q of ['', '?daily', '?week']) {
        await page.goto(`${base}/toko-move/${q}`, { waitUntil: 'load' }); await ready(page);
        await page.tap('#play'); const first = await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 }).then(() => true).catch(() => false);
        got.push(`${q || 'ladder'}${first ? '✓' : '✗'}`);
      }
      ok(`S3 saves in the wrong shape are a fresh start, never a crash (${got.join(' ')})`, got.every(g => g.endsWith('✓')) && !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }

    // ── S4 · S5: a 320px phone plays a whole run; frame cost, measured
    {
      const ctx = await browser.newContext({ ...PHONE, viewport: { width: 320, height: 568 } }), page = await ctx.newPage(), errs = watch(page);
      await page.addInitScript(() => { window.__long = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch {} });
      await page.goto(`${base}/toko-move/?run=easy&seed=1197`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const seen = await tapThrough(page);
      ok(`S4 a 320px phone plays a whole run, every card on screen (${seen.cards} cards)`, seen.end && !seen.bad.length, seen.bad.slice(0, 2).join(' | '));
      const long = await page.evaluate(() => window.__long || []);
      console.log(`  ..   S5 measured, not gated: ${long.length} long tasks over the run${long.length ? `, the longest ${Math.max(...long)} ms` : ''} (software compositing)`);
      ok('S4 no page errors on a 320px phone', !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  } catch (e) { ok('the gate ran to the end', false, String(e).slice(0, 300)); }
  await browser.close(); server.close();
  console.log(`\n  ship3: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
