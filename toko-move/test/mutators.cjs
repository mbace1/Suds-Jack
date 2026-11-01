// EVERY MUTATOR IS A RUN SOMEBODY CAN FINISH (v2.70). The title card offers the
// four core mutators from the first run (MUTATORS.md); this chooses each one
// the way a player does — by tapping its chip on the title card — and then
// plays it the way test/stranger.cjs plays: tap the first job, CATCH when it
// lights, GET OFF when it lights, answer any card. No debug hook moves the
// courier; the harness only lets the clock run.
//
// Per mutator it holds what that mutator promises, on the screen:
//   NIGHT       the night skin, a clock that starts at 23:00, no rush chip
//   DISRUPTION  one tram family held from about ten minutes in, drawn on the
//               board, and lifted by the second job (or its time)
//   RUSH HOUR   the RUSH chip all shift, trams provisioned tighter
//   SNOW DAY    the snow skin and the first-snow weather
// and of every one: it is not recorded as the daily, the shift ends with a
// delivery, and nothing on screen is left in English under Finnish.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/mutators.cjs [rootDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); } };

const boot = async (page, url) => {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
};

// The stranger's loop (test/stranger.cjs), returning what it saw along the way.
async function playOut(page, watch) {
  await page.evaluate(() => window.__tm.flow.clock.setPaused(true));
  let held = 0, end = null, taps = 0; const seen = [];
  for (let i = 0; i < 6000; i++) {
    const s = await page.evaluate(() => {
      const vis = e => e && !e.disabled && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
      const q = sel => [...document.querySelectorAll(sel)].filter(vis), tm = window.__tm, ch = tm.challenge;
      const out = { tick: tm.flow.clock.tick, index: ch.index, target: ch.target };
      const endVeil = document.getElementById('end'); if (endVeil && !endVeil.hidden) return { ...out, phase: 'end', title: document.getElementById('endTitle').textContent };
      const st = tm.mobility.status(), t = document.getElementById('title');
      if (t && !t.hidden && getComputedStyle(t).display !== 'none' && vis(document.getElementById('play'))) return { ...out, phase: 'title', sel: '#play' };
      if (q('.eventCard button').length) return { ...out, phase: 'event', sel: '.eventCard button:not([disabled])' };
      if (q('#getOff').length) return { ...out, phase: 'getoff', sel: '#getOff' };
      if (q('.catchChoice.lit').length) return { ...out, phase: 'catch', sel: '.catchChoice.lit:not([disabled])' };
      if (!ch.active && q('#jobBoard .jobOffer:not([disabled])').length) return { ...out, phase: 'jobs', sel: '#jobBoard .jobOffer:not([disabled])' };
      const due = (tm.catchables?.().length || st?.kind === 'getoff' || tm.events?.pending || (!ch.active && (ch.offers || []).length));
      return { ...out, phase: 'wait', due: !!due };
    });
    if (watch && i % 4 === 0) seen.push(await page.evaluate(watch));
    if (s.phase === 'end') { end = s; break; }
    if (s.sel) { if (await page.tap(s.sel, { timeout: 1500 }).then(() => true, () => false)) taps++; await page.waitForTimeout(60); continue; }
    if (s.due && held++ < 8) { await page.waitForTimeout(80); continue; }
    held = 0;
    await page.evaluate(() => window.__tm.flow.runTicks(3));
  }
  return { end, taps, seen };
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    // ── the title card offers them, and a tap is how you choose one
    {
      const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
      await boot(page, `${base}/toko-move/?shift=1`);
      const chips = await page.$$eval('#mutRow .mut', as => as.map(a => ({ id: a.dataset.mut, on: a.classList.contains('on'), h: a.getBoundingClientRect().height, w: a.getBoundingClientRect().width })));
      ok(`the title card offers Day and the four core mutators (${chips.map(c => c.id).join(' ')})`, chips.map(c => c.id).join() === 'day,night,disruption,rush,snow');
      ok('Day is lit when no mutator is chosen', chips.find(c => c.on)?.id === 'day' && chips.filter(c => c.on).length === 1);
      ok('every chip is a 44px target', chips.every(c => c.h >= 44 && c.w >= 44), JSON.stringify(chips.filter(c => c.h < 44)));
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
      ok('the row wraps inside a phone, no sideways scroll', fits);
      await Promise.all([page.waitForNavigation(), page.tap('#mutRow .mut[data-mut="night"]')]);
      await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
      const r = await page.evaluate(() => ({ q: location.search, mut: window.__tm.mutator?.id, lit: document.querySelector('#mutRow .mut.on')?.dataset.mut, when: document.getElementById('titleWhen').textContent, label: document.getElementById('shiftNo').textContent }));
      ok(`tapping NIGHT starts a page wearing it, the shift kept (${r.q})`, r.mut === 'night' && /shift=1/.test(r.q) && r.lit === 'night');
      ok(`the title says the time the run starts ("${r.when}")`, /23:00/.test(r.when));
      ok(`the shift is labelled with its mutator ("${r.label}")`, /^NIGHT · /.test(r.label));
      await Promise.all([page.waitForNavigation(), page.tap('#mutRow .mut[data-mut="day"]')]);
      await page.waitForFunction(() => window.__tm?.flow, null, { timeout: 30000 });
      ok('and DAY takes it off again', await page.evaluate(() => window.__tm.mutator === null && !/mutator/.test(location.search) && window.__tm.skin === 'day'));
      await page.close();
    }
    // ── today's address under a mutator is not the daily
    {
      const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
      await boot(page, `${base}/toko-move/?mutator=rush`);
      const r = await page.evaluate(() => ({ kind: window.__tm.shiftInfo.kind, seed: window.__tm.shiftInfo.seed }));
      await boot(page, `${base}/toko-move/`);
      const d = await page.evaluate(() => ({ kind: window.__tm.shiftInfo.kind, seed: window.__tm.shiftInfo.seed }));
      ok(`a mutator on today's address is today's city (${r.seed}) but never the daily record (${r.kind})`, r.kind === 'mutator' && d.kind === 'daily' && r.seed === d.seed);
      await page.close();
    }
    // ── each one, played out
    const RUNS = [
      { id: 'night', q: '?shift=1&mutator=night' },
      { id: 'disruption', q: '?shift=2&mutator=disruption' },
      { id: 'rush', q: '?shift=1&mutator=rush' },
      { id: 'snow', q: '?shift=2&mutator=snow' },
    ];
    for (const run of RUNS) {
      const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
      const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
      await boot(page, `${base}/toko-move/${run.q}`);
      const at = await page.evaluate(() => ({ skin: window.__tm.skin, body: document.body.className, weather: window.__tm.weather?.id, day: window.__tm.cityDay?.id || null, rush: window.__tm.rushOn, headway: window.__tm.liveNetwork?.headwayMinutes?.TRAM }));
      const { end, taps, seen } = await playOut(page, () => {
        const tm = window.__tm, h = tm.events?.activeHolds?.() || [], ch = tm.challenge;
        return { tick: tm.flow.clock.tick, index: ch.index, clock: document.getElementById('clock').textContent, rush: document.getElementById('rush').textContent, held: h.map(x => x.line).join(), heldLayers: (tm.transit?.layers || []).filter(l => tm.events?.heldLayer?.(l)).length, holds: (tm.events?.holds || []).map(x => ({ line: x.line, from: x.from, until: x.until, lifted: !!x.lifted, startIndex: x.startIndex })) };
      });
      const label = run.id.toUpperCase();
      ok(`${label}: the shift ends by tapping what lights (${end ? `${end.title}, ${end.index}/${end.target}` : 'never ended'}, ${taps} taps)`, !!end && end.index >= 1);
      ok(`${label}: no page errors`, !errs.length, errs.slice(0, 2).join(' | '));
      ok(`${label}: a mutator is the day — no city event on top of it`, at.day === null);
      if (run.id === 'night') {
        const first = seen.find(s => s.clock)?.clock || '', clocks = seen.map(s => s.clock);
        ok(`NIGHT: the night skin (${at.skin}, ${at.body})`, at.skin === 'night' && /skin-night/.test(at.body));
        ok(`NIGHT: the clock starts at 23:00 and runs past midnight (${first} … ${clocks[clocks.length - 1]})`, /^23:0/.test(first) && clocks.some(c => /^00:/.test(c)));
        ok(`NIGHT: no rush at 23:00 (${at.rush})`, at.rush === false && seen.every(s => !s.rush));
        ok(`NIGHT: trams provisioned at twice the headway (${at.headway} min)`, at.headway === 15);
      }
      if (run.id === 'disruption') {
        const last = seen[seen.length - 1], h = last?.holds?.find(x => x.startIndex != null);
        const perMin = await page.evaluate(() => window.__tm.flow.clock.ticksPerDay / ((window.__tm.shift?.hours || 1.25) * 60));
        ok(`DISRUPTION: the day skin (${at.skin})`, at.skin === 'day');
        ok(`DISRUPTION: one family held from about ten minutes in (${h ? `${h.line} at ${(h.from / perMin).toFixed(1)} min` : 'never'})`, !!h && Math.abs(h.from / perMin - 10) < 1.5 && last.holds.length === 1);
        ok('DISRUPTION: the held family is on the board while it is held', seen.some(s => s.held && s.heldLayers >= 1));
        const lift = seen.find(s => s.holds?.[0]?.lifted);
        ok(`DISRUPTION: it lifts by the second job or its time (${h?.lifted ? `lifted at job ${lift?.index}` : `ran its ${(h ? (h.until - h.from) / perMin : 0).toFixed(0)} min`})`, !!h && (h.lifted ? lift && lift.index >= h.startIndex + 2 : (h.until - h.from) / perMin >= 28));
      }
      if (run.id === 'rush') {
        ok(`RUSH HOUR: the RUSH chip from first tick to last (${[...new Set(seen.map(s => s.rush))].join(' / ')})`, at.rush === true && seen.length > 3 && seen.every(s => /^RUSH/.test(s.rush)));
        ok(`RUSH HOUR: trams provisioned at 0.6× the headway (${at.headway} min)`, Math.abs(at.headway - 4.5) < 1e-9);
      }
      if (run.id === 'snow') {
        ok(`SNOW DAY: the snow skin and the first-snow weather (${at.skin}, ${at.weather})`, at.skin === 'snow' && at.weather === 'snow');
      }
      await page.close();
    }
    // ── under Finnish, the new lines are Finnish
    {
      const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-US' })).newPage();
      await boot(page, `${base}/toko-move/?shift=1&mutator=night&lang=fi`);
      // the halt's two feed lines, put on the page the way the feed puts them
      await page.evaluate(() => { for (const t of ['⛔ 4 is halted — the network routes around it.', '4 is running again.']) { const d = document.createElement('div'); d.className = 'mutProbe'; d.textContent = t; document.getElementById('feed').appendChild(d); } });
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => ({ row: document.getElementById('mutRow').innerText, card: document.querySelector('.mutBlurb')?.innerText || '', when: document.getElementById('titleWhen').innerText, goal: document.getElementById('titleGoal').innerText, probes: [...document.querySelectorAll('.mutProbe')].map(e => e.textContent), lang: document.documentElement.lang, misses: [...(window.__tmLang?.misses || [])] }));
      ok(`FI: the row and the card are Finnish (${r.row.replace(/\s+/g, ' ').slice(0, 60)} | ${r.card.replace(/\s+/g, ' ').slice(0, 50)})`, r.lang === 'fi' && /YÖ/.test(r.row) && /LUMIPÄIVÄ/.test(r.row) && /MUUNNIN/.test(r.row) && /kaupunki/.test(r.card));
      ok(`FI: the night title lines (${r.when} | ${r.goal.slice(0, 40)})`, /23:00/.test(r.when) && /0\.15/.test(r.goal));
      ok(`FI: the halt's feed lines (${r.probes.join(' | ')})`, /pysähdyksissä/.test(r.probes[0]) && /kulkee taas/.test(r.probes[1]));
      const mine = r.misses.filter(m => /MUTATOR|NIGHT|DISRUPTION|RUSH HOUR|SNOW DAY|neon|halted|running again|deliveries before/i.test(m));
      ok('FI: none of it is left in English', !mine.length, mine.slice(0, 3).join(' | '));
      await page.close();
    }
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  mutators: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
