// Hyper Dagger — HD-003 / HD-019: the menu by touch, by keys and by gamepad.
//   NODE_PATH=$(npm root -g) node hyperdagger/test/menu-input.cjs
//
// Real touches (a hasTouch context, page.touchscreen.tap) and a stubbed
// standard-mapping pad (navigator.getGamepads). Waits are on game time once a
// run is live; on the menu (no game clock) on rAF frames with a cap.
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

const HELPERS = () => {
  const frame = () => new Promise(r => requestAnimationFrame(r));
  window.__frames = async n => { for (let i = 0; i < n; i++) await frame(); };
  window.__game = async sec => {   // wait `sec` of GAME time (frames only as a hang guard)
    const d = window.__hd.debug, t0 = d.getState().gameTime;
    for (let i = 0; i < 3000 && d.getState().state === 'playing' && d.getState().gameTime - t0 < sec; i++) await frame();
  };
  const gp = { id: 'menu pad', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  navigator.getGamepads = () => [gp];
  // a press is held for ONE frame then released, so the poll sees both edges.
  // Not three: the arcade shell sends you HOME after 750 ms of wall time
  // holding Start, and three frames on a 250 ms-a-frame software renderer is
  // that hold (menu-focus.cjs paid for this first).
  window.__press = async i => { gp.buttons[i].pressed = true; await window.__frames(1); gp.buttons[i].pressed = false; await window.__frames(3); };
  window.__focus = () => { const b = document.querySelector('#msg button.gfocus'); return b ? (b.dataset.season ? 'season:' + b.dataset.season : b.dataset.mode ? 'mode:' + b.dataset.mode : b.id || b.textContent) : null; };
  window.__menu = () => ({ state: window.__hd.debug.getState().state, mode: window.__hd.debug.getState().mode,
    season: localStorage.getItem('hyperDaggerSeason'), runKind: localStorage.getItem('hyperDaggerRunKind') });
};

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
  const open = async (touch, init = {}) => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: touch, hasTouch: touch });
    const q = await ctx.newPage();
    q.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await q.addInitScript(kv => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      localStorage.setItem('hyperDaggerSeenTips', '1'); for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, v); }, init);
    await q.goto(`${base}/hyperdagger/?assets=0`, { waitUntil: 'load' });
    await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
    await q.evaluate(HELPERS);
    return { q, ctx };
  };
  // The menu can be taller than a phone in landscape (#587's controls line
  // pushes RUN below the fold), so bring the target into view first, the way
  // a player would scroll to it. If it still cannot be reached on screen,
  // say so and skip that tap rather than touch a point off the glass.
  const center = async (q, sel) => {
    const loc = q.locator(sel).first();
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const bb = await loc.boundingBox();
    const vp = q.viewportSize();
    const c = bb && { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
    if (!c || c.x < 0 || c.y < 0 || c.x > vp.width || c.y > vp.height) { console.log('  skip ' + sel + ' — not reachable on screen'); return null; }
    return c;
  };
  try {
    // HD-019: the menu is three season tabs, that season's arena behind them,
    // its rules, and START. A tab only picks; START (or ENTER, or A) plays.
    // ------------------------------------------------------------- touch
    {
      const { q, ctx } = await open(true, { hyperDaggerModeV31: 'pure', hyperDaggerRunKind: 'free', hyperDaggerSeason: 'ember' });
      const shape = await q.evaluate(() => ({ tabs: [...document.querySelectorAll('#msg button.mn-season')].map(b => b.dataset.season),
        others: [...document.querySelectorAll('#msg button')].filter(b => !b.matches('.mn-season, #startBtn')).map(b => b.id || b.textContent),
        start: !!document.getElementById('startBtn'), menu: window.__menu() }));
      ok('the menu offers seasons 1-3 and START, nothing else (no VOID, no mode row, no RUN)', shape.tabs.join(',') === 'ember,inca,haul' && shape.start && shape.others.length === 0, JSON.stringify(shape));
      ok('the menu plays the season it shows: season 1 is HYPER, not the saved PURE', shape.menu.mode === 'hyper', JSON.stringify(shape.menu));
      let c = await center(q, '#msg button.mn-season[data-season="inca"]');
      if (!c) throw new Error('SEASON 2 is not reachable on screen');
      await q.touchscreen.tap(c.x, c.y); await q.evaluate(() => window.__frames(3));
      const picked = await q.evaluate(() => ({ ...window.__menu(), on: document.querySelector('#msg button.mn-season.on')?.dataset.season,
        tag: document.querySelector('#msg .mn-card')?.textContent ?? '', goo: window.__hd.debug.getGoo().on, slabs: window.__hd.debug.getPlatforms().count,
        acc: getComputedStyle(document.getElementById('startBtn')).backgroundColor }));
      ok('touch: a tap on SEASON 2 picks it and stays on the menu', picked.state === 'menu' && picked.season === 'inca' && picked.on === 'inca', JSON.stringify(picked));
      ok("touch: the picked season's arena is behind the menu (Inca's sea, no Ember slabs)", picked.goo && picked.slabs === 0, JSON.stringify(picked));
      ok("touch: the rules and START change with it (Inca's card, teal START)", /drowned temple/.test(picked.tag) && /Jump the waves/.test(picked.tag) && picked.acc === 'rgb(47, 191, 163)', JSON.stringify(picked));
      // a tap on the empty menu is not a start any more
      for (const [x, y] of [[60, 200], [784, 12]]) {
        await q.touchscreen.tap(x, y); await q.evaluate(() => window.__frames(4));
      }
      const still = await q.evaluate(() => window.__menu());
      ok('touch: a tap on empty menu space starts nothing', still.state === 'menu' && still.season === 'inca', JSON.stringify(still));
      c = await center(q, '#startBtn');
      if (!c) throw new Error('START is not reachable on screen');
      await q.touchscreen.tap(c.x, c.y);
      const run = await q.evaluate(async () => {
        let n = 0; while (window.__hd.debug.getState().state !== 'playing' && n++ < 120) await window.__frames(1);
        const pl = window.__hd.player, inp = window.__hd.debug.inputObj(); const st0 = window.__menu(); const y0 = pl.feet.y; let peak = 0;
        const t0 = window.__hd.debug.getState().gameTime;
        for (let i = 0; i < 3000 && window.__hd.debug.getState().state === 'playing' && window.__hd.debug.getState().gameTime - t0 < 0.6; i++) { await window.__frames(1); peak = Math.max(peak, pl.feet.y - y0); }
        return { ...st0, rise: +peak.toFixed(2), sticks: [inp.left.active, inp.right.active] };
      });
      ok('touch: a tap on START starts the season picked', run.state === 'playing' && run.season === 'inca', JSON.stringify(run));
      ok('touch: the START tap leaves no stick held and is not a jump', run.rise < 0.2 && !run.sticks[0] && !run.sticks[1], JSON.stringify(run));
      await ctx.close();
    }
    // ------------------------------------------------------------- keys
    {
      const { q, ctx } = await open(false, { hyperDaggerModeV31: 'pure', hyperDaggerRunKind: 'free', hyperDaggerSeason: 'ember' });
      await q.evaluate(() => window.__frames(2));
      const seen = [];
      for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'Digit2', 'KeyD']) {
        await q.keyboard.press(k); await q.evaluate(() => window.__frames(2));
        seen.push(await q.evaluate(() => window.__menu().state + ':' + window.__menu().season));
      }
      ok('keys: ← → step the season and wrap, 1-3 pick one, D steps too, all on the menu', seen.join(',') === 'menu:inca,menu:haul,menu:ember,menu:haul,menu:inca,menu:haul', seen.join(','));
      const truckArena = await q.evaluate(() => ({ mode: window.__hd.debug.getState().mode, slabs: window.__hd.debug.getPlatforms().count, goo: window.__hd.debug.getGoo().on }));
      ok("keys: season 3's road is behind the menu (TRUCK rules, no slabs, no sea)", truckArena.mode === 'truck' && truckArena.slabs === 0 && !truckArena.goo, JSON.stringify(truckArena));
      await q.keyboard.press('Enter');
      const go = await q.evaluate(async () => { let n = 0; while (window.__hd.debug.getState().state !== 'playing' && n++ < 60) await window.__frames(1); return window.__menu(); });
      ok('keys: ENTER starts the season picked', go.state === 'playing' && go.season === 'haul', JSON.stringify(go));
      await ctx.close();
      // the very first START shows the tips card first
      const ctx2 = await b.newContext({ viewport: { width: 844, height: 390 } });
      const q2 = await ctx2.newPage(); q2.on('pageerror', e => errs.push('pageerror: ' + e.message));
      await q2.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); localStorage.setItem('hyperDaggerSeason', 'ember'); localStorage.setItem('hyperDaggerRunKind', 'free'); });
      await q2.goto(`${base}/hyperdagger/?assets=0`, { waitUntil: 'load' });
      await q2.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
      await q2.evaluate(HELPERS);
      await q2.locator('#startBtn').click();
      const tips = await q2.evaluate(() => window.__menu().state);
      await q2.mouse.click(400, 200);
      const after = await q2.evaluate(async () => { let n = 0; while (window.__hd.debug.getState().state !== 'playing' && n++ < 60) await window.__frames(1); return window.__menu().state; });
      ok('the first START shows the tips, and a click there descends', tips === 'tips' && after === 'playing', JSON.stringify({ tips, after }));
      await ctx2.close();
    }
    // ------------------------------------------------------------- gamepad
    {
      const { q, ctx } = await open(false, { hyperDaggerModeV31: 'pure', hyperDaggerRunKind: 'free', hyperDaggerSeason: 'ember' });
      const nav = await q.evaluate(async () => {
        const seen = [];
        await window.__frames(3);
        for (const btn of [15, 15, 15, 14]) { await window.__press(btn); seen.push(window.__menu().season); }   // right ×3 wraps, left steps back
        const s0 = window.__menu();
        for (const btn of [13, 12, 1]) await window.__press(btn);                                              // down, up, B
        return { seen, s0, s1: window.__menu(), focus: window.__focus() };
      });
      ok('pad: d-pad right/left step the season and wrap, on the menu', nav.seen.join(',') === 'inca,haul,ember,haul' && nav.s0.state === 'menu', JSON.stringify(nav));
      ok('pad: down, up and B on the main menu change nothing and focus nothing', nav.s1.state === 'menu' && nav.s1.season === nav.s0.season && nav.focus === null, JSON.stringify(nav));
      const go = await q.evaluate(async () => {
        await window.__press(14);  // back to season 2
        await window.__press(0);   // A starts it
        const pl = window.__hd.player; const st = window.__menu(); const y0 = pl.feet.y; let peak = 0;
        const t0 = window.__hd.debug.getState().gameTime;
        for (let i = 0; i < 3000 && window.__hd.debug.getState().state === 'playing' && window.__hd.debug.getState().gameTime - t0 < 0.6; i++) { await window.__frames(1); peak = Math.max(peak, pl.feet.y - y0); }
        return { ...st, rise: +peak.toFixed(2) };
      });
      ok('pad: A starts the season picked', go.state === 'playing' && go.season === 'inca', JSON.stringify(go));
      ok('pad: the A that started the run is not also a jump in it', go.rise < 0.2, JSON.stringify(go));
      const death = await q.evaluate(async () => {
        const d = window.__hd.debug; d.die(); await window.__frames(2);
        await new Promise(r => setTimeout(r, 750));   // the death screen ignores a restart for 700 ms (a wall-clock UI guard, not game time)
        await window.__press(9);   // START retries
        const st = d.getState().state; await window.__frames(2);
        return { st };
      });
      ok('pad: START on the death screen retries', death.st === 'playing', JSON.stringify(death));
      const pause = await q.evaluate(async () => {
        await window.__press(9); const paused = !!document.querySelector('#msg button'); const shown = document.getElementById('msg').style.display;
        // FREE / DAILY lives in the pause menu since HD-019: from the next run
        for (let i = 0; i < 40 && !(document.querySelector('#msg button.gfocus')?.dataset.run === 'daily'); i++) await window.__press(13);
        await window.__press(0);
        const kind = { saved: localStorage.getItem('hyperDaggerRunKind'), live: window.__hd.debug.getRunInfo().runKind,
          note: /from the next run/.test(document.getElementById('msg').textContent), on: document.querySelector('#msg button.runkind.on')?.dataset.run };
        await window.__press(1);   // B resumes
        await window.__frames(2);
        return { paused, shown, kind, after: document.getElementById('msg').style.display, state: window.__hd.debug.getState().state };
      });
      ok('pad: START pauses mid-run and B resumes', pause.paused && pause.shown === 'block' && pause.after === 'none' && pause.state === 'playing', JSON.stringify(pause));
      ok('pad: RUN DAILY in the pause menu is the next run\'s; this run stays FREE', pause.kind.saved === 'daily' && pause.kind.live === 'free' && pause.kind.note && pause.kind.on === 'daily', JSON.stringify(pause.kind));
      await ctx.close();
    }
  } catch (e) {
    ok('the run completed', false, e.stack || String(e));
  }
  ok('zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
