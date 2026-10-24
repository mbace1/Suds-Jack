// THE FIRST MINUTES FOR A STRANGER (v2.65, roadmap M4). A player who knows
// nothing but what the screen offers: they tap the first job they can, wait
// until a row says CATCH and tap it, tap GET OFF when it lights, and answer any
// card that asks. No debug hook moves them — the only thing the harness does
// besides tapping is let the clock run, because a headless browser cannot wait
// in real time.
//
// The first run of this probe (on v2.64) delivered fine and found three things
// a stranger would have read wrong, all of which are asserted here:
//   · "Nothing to catch yet" stayed above a row that had just lit CATCH — the
//     rows refreshed in place and the hint over them did not;
//   · one tap after CATCH the panel offered "Get off here" at the stop you had
//     just boarded at — the game contradicting itself;
//   · the store build offered LIVE on its title card (test/itch.cjs holds that).
//
// It also measures how long a stranger waits for their first delivery, and
// fails if the shift cannot be finished by someone who only taps what lights.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/stranger.cjs [rootDir]
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

// The default address (today's daily — what a stranger actually gets) and two
// fixed shifts, so the gate does not depend on what day it is run.
const RUNS = ['', '?shift=1', '?shift=2'];
const FIRST_DELIVERY_MAX_MIN = 20; // game minutes from START SHIFT

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    for (const q of RUNS) {
      const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
      const errs = [];
      page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
      await page.goto(`${base}/toko-move/${q}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
      await page.evaluate(() => window.__tm.flow.clock.setPaused(true));
      const label = q || '(today)';
      let start = null, firstDelivery = null, taps = 0, lies = [], selfExits = [], phases = new Set(), end = null;
      let held = 0;  // see below: waiting for the panel to show what the game says is there
      for (let i = 0; i < 6000; i++) {
        // look at the screen the way a person would: what is lit, what it says
        const s = await page.evaluate(() => {
          const vis = e => e && !e.disabled && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
          const q = sel => [...document.querySelectorAll(sel)].filter(vis), tm = window.__tm, ch = tm.challenge;
          const out = { tick: tm.flow.clock.tick, index: ch.index, target: ch.target };
          const endVeil = document.getElementById('end'); if (endVeil && !endVeil.hidden) return { ...out, phase: 'end', title: document.getElementById('endTitle').textContent };
          const hint = document.querySelector('.catchHint'), lit = q('.catchChoice.lit');
          if (hint && lit.length && /^Nothing to catch/.test(hint.textContent)) out.lie = hint.textContent;
          const st = tm.mobility.status(), from = tm.mobility.ride?.from;
          if (from) for (const b of q('.exitChoice')) if (b.dataset.at === from) out.selfExit = b.innerText.replace(/\s+/g, ' ');
          const t = document.getElementById('title');
          if (t && !t.hidden && getComputedStyle(t).display !== 'none' && vis(document.getElementById('play'))) return { ...out, phase: 'title', sel: '#play' };
          if (q('.eventCard button').length) return { ...out, phase: 'event', sel: '.eventCard button:not([disabled])' };
          if (q('#getOff').length) return { ...out, phase: 'getoff', sel: '#getOff' };
          if (lit.length) return { ...out, phase: 'catch', sel: '.catchChoice.lit:not([disabled])' };
          if (!ch.active && q('#jobBoard .jobOffer:not([disabled])').length) return { ...out, phase: 'jobs', sel: '#jobBoard .jobOffer:not([disabled])' };
          { const due = (tm.catchables?.().length || st?.kind === 'getoff' || tm.events?.pending || (!ch.active && (ch.offers || []).length)); return { ...out, phase: 'wait:' + (st?.kind || '?'), due: !!due }; }
        });
        phases.add(s.phase);
        if (s.lie) lies.push(`t${s.tick} "${s.lie}"`);
        if (s.selfExit) selfExits.push(`t${s.tick} ${s.selfExit}`);
        if (s.phase === 'end') { end = s; break; }
        if (s.index >= 1 && firstDelivery == null) firstDelivery = s.tick - start;
        if (s.sel) {
          if (s.phase === 'jobs' && start == null) start = s.tick;
          if (await page.tap(s.sel, { timeout: 1500 }).then(() => true, () => false)) taps++; await page.waitForTimeout(60); continue;
        }
        // The panel repaints every 250ms of WALL time; this harness moves the clock
        // far faster, so a catch window (~22 ticks) could open and close between two
        // repaints and never be seen lit. When the game says something is there to
        // tap, wait for the panel to show it, as a person would, before ticking on.
        if (s.due && held++ < 8) { await page.waitForTimeout(80); continue; }
        held = 0;
        await page.evaluate(() => window.__tm.flow.runTicks(3));
      }
      // ticks per game minute, the way js/ui.js reads it
      const tpm = await page.evaluate(() => { const c = window.__tm.flow.clock, sh = window.__tm.shift; return c && sh ? c.ticksPerDay / (sh.hours * 60) : 40; });
      const mins = firstDelivery == null ? null : firstDelivery / tpm;
      ok(`${label}: a stranger reaches the board, a catch and a get-off by tapping only (${[...phases].join(' ')})`, ['jobs', 'catch', 'getoff'].every(p => phases.has(p)));
      ok(`${label}: first delivery ${mins == null ? 'never' : `${mins.toFixed(1)} game min`} after taking a job (≤ ${FIRST_DELIVERY_MAX_MIN})`, mins != null && mins <= FIRST_DELIVERY_MAX_MIN);
      ok(`${label}: the shift ends by tapping what lights (${end ? `${end.title}, ${end.index}/${end.target}` : 'never ended'}, ${taps} taps)`, !!end && end.index >= 1);
      ok(`${label}: the catch hint never says "nothing to catch" over a lit CATCH`, !lies.length, lies.slice(0, 2).join(' | '));
      ok(`${label}: "get off here" is never offered at the stop you boarded at`, !selfExits.length, selfExits.slice(0, 2).join(' | '));
      ok(`${label}: no page errors`, !errs.length, errs.slice(0, 2).join(' | '));
      await page.close();
    }
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  stranger: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
