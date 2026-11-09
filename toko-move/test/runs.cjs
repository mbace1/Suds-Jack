// THE LADDER, PLAYED (v2.73, runs.js; owner: "Easy, medium, hard and night
// runs. Each unlocked after the easier is completed").
//
// A new player arrives at the bare address and sees four runs with one open;
// they play EASY the way test/stranger.cjs plays — tap the first job, CATCH
// when it lights, GET OFF when it lights, answer any card — and the end card
// says COMPLETE, gives stars and opens MEDIUM, whose NEXT button is how they
// get there. No debug hook moves the courier; the save is SEEDED only to stand
// a player further up the ladder, never to play for them.
//
// It holds, on the screen:
//   · a new player: EASY lit and open, three runs locked and inert, no daily,
//     week or LIVE (those are NIGHT's reward)
//   · EASY played out completes and opens MEDIUM, and NEXT goes there
//   · each attempt is a fresh shift (owner: a new shift each time)
//   · HARD is the rush at its peak with a family held from ~10 min; NIGHT is the
//     night board from 23:00 with five jobs at twice the headway
//   · clearing NIGHT opens the daily and the week
//   · the ladder and the end card in Finnish
//
// Since v3.0 the bare address is the card journey (test/play.cjs holds its
// ladder); this gate holds the same ladder in the real-time game, which is
// `?classic` now, and every run link it draws keeps it there.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/runs.cjs [rootDir]
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
const ready = page => page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
const boot = async (page, url) => { await page.goto(url, { waitUntil: 'load' }); await ready(page); };
const seed = (page, runs) => page.evaluate(r => localStorage.setItem('tokoMoveRuns', JSON.stringify(r)), runs);
const title = page => page.evaluate(() => ({
  runs: [...document.querySelectorAll('#mutRow .run')].map(r => ({ id: r.dataset.run, open: !r.classList.contains('locked'), lit: r.classList.contains('on'), href: r.getAttribute('href'), h: r.getBoundingClientRect().height })),
  run: window.__tm.run?.id || null, kind: window.__tm.shiftInfo.kind, seed: window.__tm.shiftInfo.seed, target: window.__tm.challenge.target,
  links: Object.fromEntries(['dailyLink', 'weekLink', 'liveLink'].map(id => { const e = document.getElementById(id); return [id, !!e && !e.hidden && getComputedStyle(e).display !== 'none']; })),
  goal: document.getElementById('titleGoal').textContent, when: document.getElementById('titleWhen').textContent }));

// test/stranger.cjs's reading of the screen
async function playOut(page, maxSteps = 6000) {
  await page.evaluate(() => window.__tm.flow.clock.setPaused(true));
  let held = 0, taps = 0;
  for (let i = 0; i < maxSteps; i++) {
    const s = await page.evaluate(() => {
      const vis = e => e && !e.disabled && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
      const q = sel => [...document.querySelectorAll(sel)].filter(vis), tm = window.__tm, ch = tm.challenge;
      const end = document.getElementById('end'); if (end && !end.hidden) return { phase: 'end', index: ch.index, target: ch.target };
      const t = document.getElementById('title');
      if (t && !t.hidden && getComputedStyle(t).display !== 'none' && vis(document.getElementById('play'))) return { sel: '#play' };
      if (q('.eventCard button').length) return { sel: '.eventCard button:not([disabled])' };
      if (q('#getOff').length) return { sel: '#getOff' };
      if (q('.catchChoice.lit').length) return { sel: '.catchChoice.lit:not([disabled])' };
      if (!ch.active && q('#jobBoard .jobOffer:not([disabled])').length) return { sel: '#jobBoard .jobOffer:not([disabled])' };
      const st = tm.mobility.status(), due = (tm.catchables?.().length || st?.kind === 'getoff' || tm.events?.pending || (!ch.active && (ch.offers || []).length));
      return { phase: 'wait', due: !!due };
    });
    if (s.phase === 'end') return { ...s, taps };
    if (s.sel) { if (await page.tap(s.sel, { timeout: 1500 }).then(() => true, () => false)) taps++; await page.waitForTimeout(60); continue; }
    if (s.due && held++ < 8) { await page.waitForTimeout(80); continue; }
    held = 0; await page.evaluate(() => window.__tm.flow.runTicks(3));
  }
  return null;
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = () => browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'en-US' });
  try {
    // ── a new player
    {
      const c = await ctx(), page = await c.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
      await boot(page, `${base}/toko-move/?classic`);
      let t = await title(page);
      ok(`the bare address is the ladder: four runs, EASY first (${t.runs.map(r => r.id + (r.open ? '' : '🔒')).join(' ')})`, t.runs.map(r => r.id).join() === 'easy,medium,hard,night');
      ok('a new player has EASY open and lit, and three runs locked', t.runs[0].open && t.runs[0].lit && t.runs.slice(1).every(r => !r.open && !r.href) && t.run === 'easy');
      ok('every run row is a 44px target', t.runs.every(r => r.h >= 44), JSON.stringify(t.runs.map(r => r.h)));
      ok(`EASY asks for three jobs (${t.goal})`, t.target === 3 && /^Three deliveries/.test(t.goal));
      ok(`no daily, week or LIVE before NIGHT is cleared (${JSON.stringify(t.links)})`, !t.links.dailyLink && !t.links.weekLink && !t.links.liveLink);
      const before = page.url(); await page.tap('#mutRow .run[data-run="night"]').catch(() => {}); await page.waitForTimeout(300);
      ok('tapping a locked run does nothing', page.url() === before);
      // a fresh shift every attempt
      const seeds = new Set([t.seed]);
      for (let i = 0; i < 3; i++) { await boot(page, `${base}/toko-move/?classic`); seeds.add((await title(page)).seed); }
      ok(`each attempt is a fresh shift (${[...seeds].join(', ')})`, seeds.size >= 3 && (await title(page)).kind === 'run');
      // EASY, played out by tapping
      const end = await playOut(page);
      const card = await page.evaluate(() => ({ t: document.getElementById('endTitle').textContent, stars: document.querySelector('.runStars')?.textContent || '', opened: [...document.querySelectorAll('.runOpened')].map(e => e.textContent), next: document.getElementById('nextRun')?.textContent || null, again: document.getElementById('again').textContent }));
      ok(`EASY played by tapping only ends complete (${end ? `${end.index}/${end.target}` : 'never'}, "${card.t}")`, !!end && end.index >= 3 && card.t === 'EASY COMPLETE');
      ok(`stars on the end card (${card.stars})`, /^★+☆*$/.test(card.stars) && card.stars.length === 3 && card.stars.includes('★'));
      ok(`MEDIUM opens, and the loud button goes there (${card.opened.join(' | ')} · ${card.next})`, card.opened.includes('MEDIUM IS OPEN') && card.next === 'NEXT · MEDIUM');
      ok(`trying again is offered as a new shift (${card.again})`, /EASY AGAIN · A NEW SHIFT/.test(card.again));
      await Promise.all([page.waitForNavigation(), page.tap('#nextRun')]); await ready(page);
      t = await title(page);
      ok(`NEXT opens MEDIUM: lit, four jobs (${t.run}, ${t.target})`, t.run === 'medium' && t.target === 4 && t.runs[1].lit && t.runs[1].open && !t.runs[2].open);
      ok(`EASY wears its stars on the ladder`, await page.evaluate(() => /★/.test(document.querySelector('#mutRow .run[data-run="easy"] .runS')?.textContent || '')));
      ok('no page errors (new player)', !errs.length, errs.slice(0, 2).join(' | '));
      await c.close();
    }
    // ── HARD and NIGHT keep their promises
    {
      const c = await ctx(), page = await c.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
      await page.goto(`${base}/toko-move/js/runs.js`);
      await seed(page, { easy: { done: true, stars: 2 }, medium: { done: true, stars: 1 } });
      await boot(page, `${base}/toko-move/?classic`);
      let t = await title(page);
      ok(`after MEDIUM, the bare address plays HARD (${t.run}) and NIGHT is still locked`, t.run === 'hard' && t.runs[2].lit && !t.runs[3].open);
      const h = await page.evaluate(() => ({ rush: window.__tm.rushOn, load: window.__tm.rushLoad(), headway: window.__tm.liveNetwork.headwayMinutes?.TRAM, target: window.__tm.challenge.target, queue: (window.__tm.events.queue || []).filter(e => e.kind === 'disruption').map(e => [e.line, e.at, e.recoverJobs]) }));
      ok(`HARD: the rush at its peak, 0.6× headway, five jobs (${h.load}, ${h.headway}, ${h.target})`, h.rush && h.load === 1 && Math.abs(h.headway - 4.5) < 1e-9 && h.target === 5);
      ok(`HARD: one family halted from about ten minutes in (${JSON.stringify(h.queue)})`, h.queue.length === 1 && Math.abs(h.queue[0][1] - 400) < 5 && h.queue[0][2] === 2);
      await seed(page, { easy: { done: true }, medium: { done: true }, hard: { done: true } });
      await boot(page, `${base}/toko-move/?classic&run=night`);
      t = await title(page);
      const nn = await page.evaluate(() => ({ skin: window.__tm.skin, body: document.body.className, headway: window.__tm.liveNetwork.headwayMinutes?.TRAM, rush: window.__tm.rushOn }));
      ok(`NIGHT: the night board, 23:00, five jobs at twice the headway (${nn.skin}, ${t.when}, ${t.target}, ${nn.headway})`, nn.skin === 'night' && /skin-night/.test(nn.body) && /23:00/.test(t.when) && t.target === 5 && nn.headway === 15 && !nn.rush);
      ok(`and the goal says so ("${t.goal}")`, /^Five deliveries before 00:15/.test(t.goal));
      await page.evaluate(() => { document.getElementById('play').click(); window.__tm.flow.runTicks(160); });
      await page.waitForTimeout(400);
      ok(`NIGHT's clock reads after eleven (${await page.evaluate(() => document.getElementById('clock').textContent)})`, /^23:/.test(await page.evaluate(() => document.getElementById('clock').textContent)));
      // clearing NIGHT
      await seed(page, { easy: { done: true }, medium: { done: true }, hard: { done: true }, night: { done: true, stars: 1 } });
      await boot(page, `${base}/toko-move/?classic`);
      t = await title(page);
      ok(`clearing NIGHT opens the daily and the week (${JSON.stringify(t.links)})`, t.links.dailyLink && t.links.weekLink);
      await Promise.all([page.waitForNavigation(), page.tap('#dailyLink')]); await ready(page);
      const d = await page.evaluate(() => ({ kind: window.__tm.shiftInfo.kind, run: window.__tm.run }));
      ok(`the daily is the classic shift everyone plays (${d.kind}, run ${d.run})`, d.kind === 'daily' && d.run === null);
      ok('no page errors (up the ladder)', !errs.length, errs.slice(0, 2).join(' | '));
      await c.close();
    }
    // ── in Finnish
    {
      const c = await ctx(), page = await c.newPage();
      await boot(page, `${base}/toko-move/?classic&lang=fi`);
      await page.evaluate(() => { for (const t of ['EASY COMPLETE', 'MEDIUM IS OPEN', 'NEXT · MEDIUM', 'TRY EASY AGAIN', 'EASY AGAIN · A NEW SHIFT', 'NOT YET', 'deliver all 3 to complete EASY', 'every job on time · 1,000 for the third star', 'every job delivered · some late', 'THE DAILY AND THE WEEK ARE OPEN']) { const p = document.createElement('p'); p.className = 'runProbe'; p.textContent = t; document.getElementById('feed').appendChild(p); } });
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => ({ row: document.getElementById('mutRow').innerText.replace(/\s+/g, ' '), probes: [...document.querySelectorAll('.runProbe')].map(e => e.textContent), misses: [...(window.__tmLang?.misses || [])] }));
      ok(`FI: the ladder (${r.row.slice(0, 90)})`, /TASOT/.test(r.row) && /HELPPO/.test(r.row) && /KESKITASO/.test(r.row) && /VAIKEA/.test(r.row) && /YÖ/.test(r.row) && /keikkaa/.test(r.row) && /aukeaa/.test(r.row));
      ok(`FI: the end card (${r.probes.slice(0, 4).join(' | ')})`, r.probes.every(p => !/[A-Z]{4,} (COMPLETE|IS OPEN|AGAIN)|deliver all|for the third star|some late|NOT YET|ARE OPEN/.test(p)) && /SUORITETTU/.test(r.probes[0]) && /ON AUKI/.test(r.probes[1]));
      const mine = r.misses.filter(m => /EASY|MEDIUM|HARD|NIGHT|RUNS|jobs|to open|third star|COMPLETE/.test(m));
      ok('FI: nothing of the ladder left in English', !mine.length, mine.slice(0, 3).join(' | '));
      await c.close();
    }
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  runs: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
