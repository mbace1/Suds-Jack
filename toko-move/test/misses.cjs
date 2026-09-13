// WHAT "MISSED" IS ALLOWED TO ACCUSE YOU OF.
//
// hub-tactics used to work misses out for itself, from a scan of EVERY service
// calling at the stop, with no direction. A CATCH lights only for a vehicle
// going the way your leg goes — so the banner and the buttons were answering
// different questions, and the banner was the one shouting. Measured on the
// live build (iPad, a job taken, standing still at Lasipalatsi, 100 seconds):
// 23 MISSED banners across 8 lines, while the only line the game ever offered
// for that job was 1. The overlap was NONE.
//
// The rule this gate holds: a miss is a catch that was LIT, is not any more,
// and you did not board it. Anything else is the game keeping score against a
// player for a tram it never offered them.
//
//   node toko-move/test/misses.cjs [rootDir]
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

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
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));

  await page.goto(`${base}/toko-move/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__tm?.camera, null, { timeout: 30000 });
  await page.tap('#play');
  await page.waitForFunction(() => { const x = document.querySelector('#jobBoard .jobOffer:not([disabled])'); if (!x) return false; x.click(); return true; }, null, { timeout: 25000 });

  // ── the source of truth is the panel with the buttons on it ───────────
  ok('the miss list is published by the catch panel', await page.evaluate(() => Array.isArray(window.__tm.catchMisses) || window.__tm.catchMisses === undefined));

  // Run the clock up so real misses have a chance to happen inside a gate's
  // patience. x4 is the game's own speed control, not a test-only hook.
  await page.tap('#speed'); await page.tap('#speed');
  const speed = await page.evaluate(() => window.__tm.flow.clock.speed);
  ok(`the shift is running at x${speed} so misses can actually occur`, speed >= 2);

  // Read the BANNER, not the array behind it. A gate that watches
  // tm.catchMisses cannot see hub-tactics go back to computing its own, which
  // is the exact regression this file exists for — the first cut of this gate
  // did that and all three mutations walked past it.
  const seen = await page.evaluate(async () => {
    const out = { banners: [], lit: [], offered: new Set(), ticks: 0 };
    const start = window.__tm.flow.clock.tick;
    await new Promise(done => {
      // At x4 the clock runs ~40 ticks a second, so a 200ms sampler sees one
      // frame in eight and can miss a catch lighting and going dark entirely
      // between samples. That made this check flaky: same build, one run said
      // 0/1 and the next said 1/1. rAF samples at least as often as the game's
      // own 250ms readiness poll, so any transition the game records was seen.
      const step = () => {
        const tm = window.__tm, tick = tm.flow.clock.tick;
        out.ticks = tick - start;
        const m = (document.getElementById('hubTactics')?.innerText || '')
          .match(/MISSED\s+(\S+)\s*·\s*about\s+(\d+)t/);
        if (m) { const at = tick - Number(m[2]), last = out.banners.filter(x => x.line === m[1]).pop();
          if (!last || at - last.tick > 8) out.banners.push({ line: m[1], tick: at, seenAt: tick }); }
        const now = [];
        for (const btn of document.querySelectorAll('#routeChoices .catchChoice')) {
          const lab = (btn.querySelector('div > span > b')?.textContent || '').trim();
          if (!lab) continue;
          out.offered.add(lab);
          if (!btn.disabled) now.push(lab);
        }
        out.lit.push({ tick, lines: now });
        if (out.ticks > 700) { done(); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    out.rawMisses = (window.__tm.catchMisses || []).map(m => `${m.line}@${m.tick}`);
    return { ...out, offered: [...out.offered] };
  });

  const offered = new Set(seen.offered);
  const unoffered = [...new Set(seen.banners.map(m => m.line))].filter(l => !offered.has(l));
  ok(`the run saw enough board to judge (${seen.ticks} ticks, ${seen.offered.length} lines offered, ${seen.banners.length} banners)`,
    seen.ticks > 300 && seen.offered.length > 0);
  ok(`no MISSED names a line the game never offered you (${seen.banners.length} banners across ${new Set(seen.banners.map(m=>m.line)).size} lines)`,
    unoffered.length === 0, `unoffered: ${unoffered.join(', ')}`);

  // A miss must be the END of a catch you could have pressed, so a button for
  // that line has to have been LIT in the moments just before it. "Lit at some
  // point in the whole run" is not that test — a direction-blind tracker fires
  // for trams going the wrong way, which are never lit at all.
  const LOOKBACK = 15;
  const unlit = seen.banners.filter(m =>
    !seen.lit.some(s => s.tick <= m.tick && m.tick - s.tick <= LOOKBACK && s.lines.includes(m.line)));
  ok(`every MISSED follows a catch that was lit within ${LOOKBACK} ticks (${seen.banners.length - unlit.length}/${seen.banners.length})`,
    unlit.length === 0, unlit.map(m => `${m.line}@${m.tick}`).join(', '));
  if (process.env.DUMP && unlit.length) for (const m of unlit) {
    const win = seen.lit.filter(s2 => Math.abs(s2.tick - m.tick) <= 40);
    console.log(`    around ${m.line}@${m.tick}: ticks ${win[0]?.tick}..${win[win.length-1]?.tick}, ${win.length} samples`);
    console.log('    lit states:', JSON.stringify(win.filter((v,i)=>i%3===0).map(x => `${x.tick}:[${x.lines}]`)));
    console.log('    raw misses:', JSON.stringify(seen.rawMisses || 'n/a'));
  }

  // ── boarding is not missing ───────────────────────────────────────────
  // A lit catch stops being lit the moment you take it; calling that a miss
  // would blame the player for succeeding.
  const board = await page.evaluate(async () => {
    // wait for a catch to light rather than sampling once and shrugging
    const lit = () => document.querySelector('#routeChoices .catchChoice:not([disabled])');
    const t0 = Date.now();
    while (!lit() && Date.now() - t0 < 60000) await new Promise(r => setTimeout(r, 200));
    const b = lit(); if (!b) return null;
    const seenBefore = new Set((window.__tm.catchMisses || []).map(m => `${m.line}@${m.tick}`));
    const boardTick = window.__tm.flow.clock.tick;
    b.click();
    const added = new Set();
    for (let i = 0; i < 60; i++) {
      for (const m of window.__tm.catchMisses || []) {
        const k = `${m.line}@${m.tick}`;
        if (!seenBefore.has(k) && m.tick >= boardTick - 2) added.add(k);
      }
      await new Promise(r => setTimeout(r, 50));
    }
    return { boardTick, added: [...added], kind: window.__tm.mobility?.status?.()?.kind };
  });
  ok('a catch lit inside the window, so boarding could be tested', !!board && board.kind === 'riding',
    board ? board.kind : 'none ever lit');
  if (board && board.kind === 'riding')
    ok(`boarding a lit catch does not record a miss (${board.added.length} recorded while boarding)`,
      board.added.length === 0, JSON.stringify(board));

  ok('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(`\n  misses: ${pass} passed, ${fail} failed  (${ROOT})`);
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
});
