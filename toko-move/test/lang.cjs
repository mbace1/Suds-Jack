// TOKO MOVE IN FINNISH (v2.66, roadmap M5). js/lang.js translates at the DOM:
// every text node, aria-label and title the game draws goes through one table,
// with English as the per-string fallback. A fallback is silent by design, so
// this gate is what stops a new English line shipping untranslated: it PLAYS
// in Finnish — fixed shifts, today's daily and a week through its kit pick —
// the way test/stranger.cjs does (tap only what lights), opens the map panel,
// and fails on any string the table missed that still reads as English.
//
// It also holds what a DOM-level translator could break:
//   · the game must still be playable in Finnish (a shift finishes by tapping);
//   · a lit CATCH button is the SAME element across ticks — v2.4x rebuilt the
//     panel only when what it says changes, so a press in flight lands, and a
//     translator that made every render look "changed" would undo that;
//   · English is untouched, the switch on the title goes both ways, and the
//     choice is remembered.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/lang.cjs [rootDir]
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

const look = page => page.evaluate(() => {
  const vis = e => e && !e.disabled && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const q = sel => [...document.querySelectorAll(sel)].filter(vis), tm = window.__tm, ch = tm.challenge;
  const end = document.getElementById('end'); if (end && !end.hidden) return { phase: 'end', index: ch.index };
  if (q('.eventCard button').length) return { phase: 'event', sel: '.eventCard button:not([disabled])' };
  if (q('#getOff').length) return { phase: 'getoff', sel: '#getOff' };
  if (q('.catchChoice.lit').length) return { phase: 'catch', sel: '.catchChoice.lit:not([disabled])' };
  if (!ch.active && q('#jobBoard .jobOffer:not([disabled])').length) return { phase: 'jobs', sel: '#jobBoard .jobOffer:not([disabled])' };
  { const st = tm.mobility?.status?.(), due = (tm.catchables?.().length || st?.kind === 'getoff' || tm.events?.pending || (!ch.active && (ch.offers || []).length)); return { phase: 'wait', due: !!due }; }
});

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const allMisses = new Map();
  try {
    const boot = async (ctx, q) => {
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
      await page.goto(`${base}/toko-move/${q}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
      await page.evaluate(() => window.__tm.flow.clock.setPaused(true));
      return { page, errs };
    };
    const harvest = async (page, where) => { for (const m of await page.evaluate(() => [...(window.__tmLang?.misses || [])])) if (!allMisses.has(m)) allMisses.set(m, where); };
    const fresh = () => browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'en-US' });

    // ── English is the source and stays untouched ────────────────────────
    {
      const ctx = await fresh(); const { page } = await boot(ctx, '?shift=1&day=none');
      const en = await page.evaluate(() => ({ lang: document.documentElement.lang, play: document.getElementById('play').textContent, sw: document.getElementById('langLink')?.textContent, href: document.getElementById('langLink')?.getAttribute('href') }));
      ok(`English stays English (${en.play})`, en.lang === 'en' && en.play === 'START SHIFT');
      ok(`the title offers Finnish (${en.sw} → ${en.href})`, en.sw === 'SUOMEKSI' && /lang=fi/.test(en.href || '') && /shift=1/.test(en.href || ''));
      await page.tap('#langLink'); await page.waitForFunction(() => window.__tm?.flow && document.documentElement.lang === 'fi', null, { timeout: 30000 });
      const fi = await page.evaluate(() => ({ play: document.getElementById('play').textContent, sw: document.getElementById('langLink')?.textContent }));
      ok(`tapping it turns the game Finnish (${fi.play}), and offers English back (${fi.sw})`, fi.play === 'ALOITA VUORO' && fi.sw === 'IN ENGLISH');
      await page.goto(`${base}/toko-move/?shift=2&day=none`); await page.waitForFunction(() => window.__tm?.flow, null, { timeout: 30000 });
      ok('and the choice is remembered on the next visit', await page.evaluate(() => document.documentElement.lang === 'fi'));
      await ctx.close();
    }
    // a Finnish browser lands in Finnish without asking
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fi-FI' });
      const { page } = await boot(ctx, '?shift=1&day=none');
      ok('a Finnish browser gets Finnish first time', await page.evaluate(() => document.documentElement.lang === 'fi'));
      await ctx.close();
    }

    // ── play in Finnish, and read everything it said ─────────────────────
    for (const q of ['?lang=fi&shift=1', '?lang=fi&shift=2&day=none', '?lang=fi', '?lang=fi&week']) {
      const ctx = await fresh(); const { page, errs } = await boot(ctx, q);
      await page.tap('#play'); await page.waitForTimeout(300);
      let end = null, sameButton = null, panel = false, taps = 0;
      let held = 0;  // see below: waiting for the panel to show what the game says is there
      for (let i = 0; i < 6000; i++) {
        const s = await look(page);
        if (s.phase === 'end') { end = s; break; }
        // once per run: hold a lit CATCH and let the clock run under it
        if (s.phase === 'catch' && sameButton == null) {
          sameButton = await page.evaluate(async () => {
            const b = document.querySelector('.catchChoice.lit'); if (!b) return null;
            for (let k = 0; k < 3; k++) { window.__tm.flow.runTicks(1); await new Promise(r => setTimeout(r, 120)); }
            return b.isConnected;
          });
        }
        if (!panel && s.phase === 'wait') { panel = true; await page.tap('#transit').catch(() => {}); await page.waitForTimeout(200); await harvest(page, q + ' map panel'); await page.tap('#transitClose').catch(() => {}); }
        if (s.sel) { if (await page.tap(s.sel, { timeout: 1500 }).then(() => true, () => false)) taps++; await page.waitForTimeout(60); continue; }
        // The panel repaints every 250ms of WALL time; this harness moves the clock
        // far faster, so a catch window (~22 ticks) could open and close between two
        // repaints and never be seen lit. When the game says something is there to
        // tap, wait for the panel to show it, as a person would, before ticking on.
        if (s.due && held++ < 8) { await page.waitForTimeout(80); continue; }
        held = 0;
        await page.evaluate(() => window.__tm.flow.runTicks(3));
      }
      await page.waitForTimeout(300); await harvest(page, q);
      // the week's night: take what is offered, and read the next morning's card
      if (/week/.test(q)) {
        const kit = page.locator('.kitPick button, #kitPicker button, button.kit').first();
        if (await kit.count()) { await kit.tap().catch(() => {}); await page.waitForTimeout(300); await harvest(page, q + ' kit'); }
      }
      const lang = await page.evaluate(() => document.documentElement.lang);
      ok(`${q}: a shift in Finnish finishes by tapping what lights (${end ? `${end.index} delivered` : 'never ended'}, ${taps} taps)`, !!end && end.index >= 1 && lang === 'fi');
      ok(`${q}: a lit CATCH is the same button while the clock runs under it`, sameButton === true, String(sameButton));
      ok(`${q}: no page errors`, !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
    const left = [...allMisses];
    ok(`nothing left in English on any screen played (${left.length} strings)`, !left.length, '\n      ' + left.map(([m, w]) => `${JSON.stringify(m)}  [${w}]`).join('\n      '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  lang: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
