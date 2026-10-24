// THE SHIP BAR (v2.67, owner: "We need a shippable Toko Move before considering
// itch.io"). Not features — the things a stranger's phone does to a game that
// no feature test does on purpose. Each check is one item of the bar in
// ROADMAP.md, and each was found failing (or never measured) by an audit
// before it was fixed:
//
//   S1  the whole WEEK plays by tapping what lights, Monday to the rent, and
//       memory and the page do not grow with it;
//   S2  leaving mid-shift (a locked phone, another app) pauses the shift and
//       says so, and RESUME carries on;
//   S3  storage that THROWS (private modes, blocked site data) still plays —
//       it used to stop the game loading at all — and a save that is valid
//       JSON in the wrong shape is a fresh start, not a crash at the kit night;
//   S4  a phone held sideways and a 320px phone keep the CATCH row on screen;
//   S6  sound: nothing before the first touch, the cues follow the play, and
//       the mute is kept and really silences;
//   S7  the data credits are on the title card, in both languages.
// (S5 — frame cost on a slow phone — is measured, not gated: headless
// Chromium composites in software, so its numbers say little about a GPU.)
//
//   NODE_PATH=$(npm root -g) node toko-move/test/ship.cjs [rootDir]
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
const phone = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'en-US' };

const look = page => page.evaluate(() => {
  const vis = e => e && !e.disabled && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const q = s => [...document.querySelectorAll(s)].filter(vis), tm = window.__tm, ch = tm.challenge;
  const end = document.getElementById('end'); if (end && !end.hidden) return { phase: 'end', index: ch.index };
  const t = document.getElementById('title'); if (t && !t.hidden && vis(document.getElementById('play'))) return { phase: 'title', sel: '#play' };
  if (q('.eventCard button').length) return { phase: 'event', sel: '.eventCard button:not([disabled])' };
  if (q('#getOff').length) return { phase: 'getoff', sel: '#getOff' };
  if (q('.catchChoice.lit').length) return { phase: 'catch', sel: '.catchChoice.lit:not([disabled])' };
  if (!ch.active && q('#jobBoard .jobOffer:not([disabled])').length) return { phase: 'jobs', sel: '#jobBoard .jobOffer:not([disabled])' };
  { const st = tm.mobility?.status?.(), due = (tm.catchables?.().length || st?.kind === 'getoff' || tm.events?.pending || (!ch.active && (ch.offers || []).length)); return { phase: 'wait', due: !!due }; }
});
// tap what lights until the shift ends (or `until` deliveries are made)
const play = async (page, until = 99) => {
  let held = 0;  // see below: waiting for the panel to show what the game says is there
      for (let i = 0; i < 6000; i++) {
    const s = await look(page);
    if (s.phase === 'end') return s;
    if (await page.evaluate(() => window.__tm.challenge.index) >= until) return { phase: 'delivered' };
    if (s.sel) { await page.tap(s.sel, { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(50); continue; }
    // The panel repaints every 250ms of WALL time; this harness moves the clock
    // far faster, so a catch window (~22 ticks) could open and close between two
    // repaints and never be seen lit. When the game says something is there to
    // tap, wait for the panel to show it, as a person would, before ticking on.
    if (s.due && held++ < 8) { await page.waitForTimeout(80); continue; }
    held = 0;
    await page.evaluate(() => window.__tm.flow.runTicks(3));
  }
  return { phase: 'stuck' };
};

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const boot = async (ctx, q, init) => {
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)); });
    if (init) await page.addInitScript(init);
    await page.goto(`${base}/toko-move/${q}`, { waitUntil: 'load' });
    const loaded = await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 }).then(() => true, () => false);
    if (loaded) await page.evaluate(() => window.__tm.flow.clock.setPaused(true));
    return { page, errs, loaded };
  };
  try {
    // ── S3: storage that throws, and saves in the wrong shape ─────────────
    {
      const ctx = await browser.newContext(phone);
      const { page, errs, loaded } = await boot(ctx, '?shift=1&day=none', () => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }); });
      let r = { phase: 'never loaded' }; if (loaded) { await page.tap('#play'); r = await play(page, 1); }
      ok(`S3 storage that throws: the game loads and a delivery is made (${r.phase})`, loaded && r.phase === 'delivered' && !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
    {
      const ctx = await browser.newContext(phone);
      const seed = await ctx.newPage(); await seed.goto(`${base}/toko-move/?shift=1&day=none`); await seed.waitForFunction(() => window.__tm?.flow, null, { timeout: 30000 });
      await seed.evaluate(() => { localStorage.setItem('tokoMoveWeek', JSON.stringify({ days: [], shifts: [{}], day: 3, kit: 'z', nights: 5, seed: 1 }));
        localStorage.setItem('tokoMoveDaily', JSON.stringify({ x: { results: 5 } })); localStorage.setItem('tokoMoveRegulars', '[1,2]'); localStorage.setItem('tokoMoveVisited', '"x"'); });
      await seed.close();
      const { page, errs } = await boot(ctx, '?week');
      await page.tap('#play'); const r = await play(page);
      const kit = await page.locator('.kitOffer').count();
      ok(`S3 a week save in the wrong shape is a fresh week that plays to its night (${r.phase}, ${kit} kit offers)`, r.phase === 'end' && kit > 0 && !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // ── S2: leaving mid-shift ────────────────────────────────────────────
    {
      const ctx = await browser.newContext(phone); const { page, errs } = await boot(ctx, '?shift=1&day=none');
      await page.tap('#play'); await page.tap('#jobBoard .jobOffer:not([disabled])');
      await page.evaluate(() => window.__tm.flow.clock.setPaused(false));
      const setVis = v => page.evaluate(v => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => v === 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); }, v);
      await setVis('hidden'); await setVis('visible'); await page.waitForTimeout(200);
      const away = await page.evaluate(() => ({ paused: window.__tm.flow.clock.paused, card: !document.getElementById('paused').hidden }));
      ok('S2 hiding the page mid-shift pauses it, and coming back shows the PAUSED card', away.paused && away.card, JSON.stringify(away));
      const t0 = await page.evaluate(() => window.__tm.flow.clock.tick); await page.waitForTimeout(400);
      ok('S2 the shift does not move while the card is up', await page.evaluate(t => window.__tm.flow.clock.tick === t, t0));
      await page.tap('#resume', { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(500);
      const back = await page.evaluate(t => ({ paused: window.__tm.flow.clock.paused, card: !document.getElementById('paused').hidden, moved: window.__tm.flow.clock.tick > t }), t0);
      ok('S2 RESUME takes the card away and the clock runs again', !back.paused && !back.card && back.moved, JSON.stringify(back));
      // a pause the player made is theirs: no card on top of it
      await page.tap('#pause'); await setVis('hidden'); await setVis('visible');
      ok('S2 a shift already paused by hand gets no card', await page.evaluate(() => document.getElementById('paused').hidden));
      ok('S2 no page errors', !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // ── S4: the screens a phone actually is ──────────────────────────────
    for (const [name, vp] of [['a phone held sideways (844×390)', { width: 844, height: 390 }], ['a 320px phone', { width: 320, height: 568 }]]) {
      const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true }); const { page } = await boot(ctx, '?shift=1&day=none');
      const t = await page.evaluate(() => { const b = document.getElementById('play').getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; });
      await page.tap('#play'); await page.waitForTimeout(200); await page.tap('#jobBoard .jobOffer:not([disabled])');
      for (let i = 0; i < 300 && !(await page.evaluate(() => !!document.querySelector('.catchChoice'))); i++) await page.evaluate(() => window.__tm.flow.runTicks(3));
      // the board's FIRST row — rows light in place (v2.4x, so a press in flight
      // lands), so whichever is lit first can be the third; layout owns the first
      const g = await page.evaluate(() => { const c = document.querySelector('.catchChoice')?.getBoundingClientRect(), m = document.getElementById('map').getBoundingClientRect();
        return { catchIn: !!c && c.top >= 0 && c.bottom <= innerHeight, map: Math.round(m.height), hscroll: document.documentElement.scrollWidth > innerWidth + 1 }; });
      ok(`S4 ${name}: START on screen, the first CATCH row on screen, the map ${g.map}px tall, no sideways scroll`, t && g.catchIn && g.map >= 240 && !g.hscroll, JSON.stringify(g));
      await ctx.close();
    }
    // ── S7: the credits, in both languages ───────────────────────────────
    for (const [lang, want] of [['en', /HSL[^]*CC BY 4\.0[^]*OpenStreetMap[^]*ODbL[^]*City of Helsinki/], ['fi', /HSL[^]*CC BY 4\.0[^]*OpenStreetMap[^]*ODbL[^]*Helsingin kaupunki/]]) {
      const ctx = await browser.newContext(phone); const { page } = await boot(ctx, `?shift=1&day=none&lang=${lang}`);
      const txt = await page.evaluate(() => document.getElementById('credits')?.innerText || '');
      ok(`S7 the title card credits HSL (CC BY 4.0), OpenStreetMap (ODbL) and the City of Helsinki — ${lang}`, want.test(txt), txt);
      await ctx.close();
    }
    // ── S6: sound ────────────────────────────────────────────────────────
    {
      const ctx = await browser.newContext(phone); const { page, errs } = await boot(ctx, '?shift=2&day=none');
      ok('S6 no audio before the first touch (a browser would refuse it anyway)', await page.evaluate(() => !window.__tm.audio?.context()));
      const btn = await page.evaluate(() => { const b = document.getElementById('sound').getBoundingClientRect(); return { w: b.width, h: b.height, label: document.getElementById('sound').getAttribute('aria-label') }; });
      ok(`S6 the mute is a 44px control with a name (${btn.label})`, btn.w >= 44 && btn.h >= 44 && /sound/.test(btn.label || ''), JSON.stringify(btn));
      await page.tap('#play'); await play(page, 1);
      const cues = await page.evaluate(() => ({ ctx: !!window.__tm.audio.context(), names: [...new Set(window.__tm.audio.log.map(x => x.name))] }));
      ok(`S6 the cues follow the play: a catch, a get-off, a delivery (${cues.names.join(' ')})`, ['catch', 'getoff'].every(n => cues.names.includes(n)) && cues.names.some(n => n === 'deliver' || n === 'late'), JSON.stringify(cues));
      ok('S6 the first touch made the audio context', cues.ctx);
      await page.tap('#sound');
      const muted = await page.evaluate(() => ({ on: window.__tm.audio.isOn(), level: window.__tm.audio.level(), pressed: document.getElementById('sound').getAttribute('aria-pressed') }));
      ok('S6 the mute silences the master gain', !muted.on && muted.level === 0 && muted.pressed === 'false', JSON.stringify(muted));
      await page.reload(); await page.waitForFunction(() => window.__tm?.audio, null, { timeout: 30000 });
      ok('S6 and it is kept on the next visit', await page.evaluate(() => !window.__tm.audio.isOn() && document.getElementById('sound').classList.contains('off')));
      ok('S6 no page errors', !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // ── S1: the whole week, by tapping ───────────────────────────────────
    {
      const ctx = await browser.newContext(phone); const { page, errs } = await boot(ctx, '?week');
      const days = []; let heap0 = null, heapN = null, nodes0 = null, nodesN = null;
      const size = () => page.evaluate(() => ({ heap: performance.memory?.usedJSHeapSize || 0, nodes: document.getElementsByTagName('*').length }));
      for (let d = 0; d < 5; d++) {
        const r = await play(page);
        days.push(r.phase === 'end' ? r.index : 'x');
        const s = await size(); if (d === 0) { heap0 = s.heap; nodes0 = s.nodes; } heapN = s.heap; nodesN = s.nodes;
        const kit = page.locator('.kitOffer').first();
        if (d < 4) { if (!(await kit.count())) break; await kit.tap().catch(() => {}); await page.waitForTimeout(300); }
      }
      const fri = await page.evaluate(() => document.getElementById('end').innerText);
      ok(`S1 the week plays Monday to Friday by tapping (deliveries ${days.join(' ')})`, days.length === 5 && days.every(n => typeof n === 'number'));
      ok('S1 Friday ends on the rent', /RENT PAID|SHORT €\d+ ON THE RENT|rent paid|short €/i.test(fri), fri.replace(/\s+/g, ' ').slice(0, 120));
      ok(`S1 the page does not grow over the week (DOM ${nodes0} → ${nodesN})`, nodesN < nodes0 * 1.5);
      if (heap0) ok(`S1 nor does memory (${(heap0 / 1e6).toFixed(1)} → ${(heapN / 1e6).toFixed(1)} MB)`, heapN < heap0 * 2.5);
      ok('S1 no page errors across the week', !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  ship: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
