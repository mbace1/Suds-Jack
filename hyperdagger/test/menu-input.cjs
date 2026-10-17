// Hyper Dagger — HD-003: the menu by touch and by gamepad.
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
    // ------------------------------------------------------------- touch
    {
      const { q, ctx } = await open(true, { hyperDaggerModeV31: 'pure', hyperDaggerRunKind: 'free', hyperDaggerSeason: 'ember' });
            let c = await center(q, '#msg button.mode[data-mode="hyper"]');
      if (c) {
        await q.touchscreen.tap(c.x, c.y); await q.evaluate(() => window.__frames(3));
        const afterMode = await q.evaluate(() => window.__menu());
        ok('touch: a tap on a mode button picks that mode and stays on the menu', afterMode.state === 'menu' && afterMode.mode === 'hyper', JSON.stringify(afterMode));
      }
      c = await center(q, '#runKindBtn');
      if (c) {
        await q.touchscreen.tap(c.x, c.y); await q.evaluate(() => window.__frames(3));
        const afterKind = await q.evaluate(() => window.__menu());
        ok('touch: a tap on RUN toggles FREE/DAILY and stays on the menu', afterKind.state === 'menu' && afterKind.runKind === 'daily', JSON.stringify(afterKind));
        c = await center(q, '#runKindBtn');
        if (c) { await q.touchscreen.tap(c.x, c.y); await q.evaluate(() => window.__frames(3)); }
      }
      c = await center(q, '#msg button.season[data-season="inca"]');
      if (!c) throw new Error('SEASON 2 is not reachable on screen');
      await q.touchscreen.tap(c.x, c.y);
      const run = await q.evaluate(async () => {
        const pl = window.__hd.player; await window.__frames(2);
        const st0 = window.__menu(); const y0 = pl.feet.y; let peak = 0, fired = 0;
        const d0 = window.__hd.debug.getGun?.().fired ?? null;
        await window.__game(0.6);
        peak = pl.feet.y - y0;
        return { ...st0, rise: +peak.toFixed(2), touchMode: window.__hd.debug.inputObj().touchMode, sticks: [window.__hd.debug.inputObj().left.active, window.__hd.debug.inputObj().right.active] };
      });
      ok('touch: a tap on SEASON 2 starts season 2', run.state === 'playing' && run.season === 'inca', JSON.stringify(run));
      ok('touch: the starting tap on a button leaves no stick held', !run.sticks[0] && !run.sticks[1], JSON.stringify(run));
      await ctx.close();
      // a tap on empty menu space (the "tap to descend" path, either half)
      for (const side of ['left', 'right']) {
        const o = await open(true, { hyperDaggerModeV31: 'pure', hyperDaggerRunKind: 'free', hyperDaggerSeason: 'ember' });
        const x = side === 'left' ? 60 : 784, y = 370;
        await o.q.touchscreen.tap(x, y);
        const r = await o.q.evaluate(async () => {
          let n = 0; while (window.__hd.debug.getState().state !== 'playing' && n++ < 120) await window.__frames(1);
          const pl = window.__hd.player, inp = window.__hd.debug.inputObj(); const y0 = pl.feet.y; let peak = 0;
          const t0 = window.__hd.debug.getState().gameTime;
          for (let i = 0; i < 3000 && window.__hd.debug.getState().gameTime - t0 < 0.6; i++) { await window.__frames(1); peak = Math.max(peak, pl.feet.y - y0); }
          return { state: window.__hd.debug.getState().state, rise: +peak.toFixed(2), sticks: [inp.left.active, inp.right.active] };
        });
        ok(`touch: a tap on empty menu space (${side} half) starts the run`, r.state === 'playing', JSON.stringify(r));
        ok(`touch: that starting tap is not also a jump in the new run (${side} half)`, r.rise < 0.2 && !r.sticks[0] && !r.sticks[1], JSON.stringify(r));
        await o.ctx.close();
      }
    }
    // ------------------------------------------------------------- gamepad
    {
      const { q, ctx } = await open(false, { hyperDaggerModeV31: 'pure', hyperDaggerRunKind: 'free', hyperDaggerSeason: 'ember' });
      const nav = await q.evaluate(async () => {
        const seen = [];
        await window.__frames(3);
        for (let i = 0; i < 9; i++) { await window.__press(13); seen.push(window.__focus()); }   // d-pad down through everything
        const wrapped = window.__focus();
        await window.__press(12); const up = window.__focus();                                   // and back up
        return { seen, wrapped, up };
      });
      ok('pad: d-pad down walks every menu button in order and wraps', nav.seen.slice(0, 8).join(',') === 'season:ember,season:inca,season:haul,mode:pure,mode:hyper,mode:truck,mode:all,runKindBtn' && nav.seen[8] === 'season:ember', JSON.stringify(nav));
      ok('pad: d-pad up steps back', nav.up === 'runKindBtn', JSON.stringify(nav));
      const pick = await q.evaluate(async () => {
        for (let i = 0; i < 12 && window.__focus() !== 'mode:hyper'; i++) await window.__press(13);
        await window.__press(0);   // A on HYPER
        const m = window.__menu(), f = window.__focus();
        await window.__press(13);  // the focus survives the menu's rebuild: next is TRUCK
        return { m, f, next: window.__focus() };
      });
      ok('pad: A on a mode button picks it, stays on the menu, and keeps the focus there', pick.m.state === 'menu' && pick.m.mode === 'hyper' && pick.f === 'mode:hyper' && pick.next === 'mode:truck', JSON.stringify(pick));
      const kind = await q.evaluate(async () => { for (let i = 0; i < 12 && window.__focus() !== 'runKindBtn'; i++) await window.__press(13); await window.__press(0); const a = window.__menu(); await window.__press(0); return { a, b: window.__menu(), f: window.__focus() }; });
      ok('pad: A on RUN toggles FREE/DAILY and back, focus kept', kind.a.runKind === 'daily' && kind.b.runKind === 'free' && kind.f === 'runKindBtn' && kind.b.state === 'menu', JSON.stringify(kind));
      const go = await q.evaluate(async () => {
        for (let i = 0; i < 12 && window.__focus() !== 'season:inca'; i++) await window.__press(12);
        await window.__press(0);   // A on SEASON 2
        const pl = window.__hd.player; const st = window.__menu(); const y0 = pl.feet.y; let peak = 0;
        const t0 = window.__hd.debug.getState().gameTime;
        for (let i = 0; i < 3000 && window.__hd.debug.getState().gameTime - t0 < 0.6; i++) { await window.__frames(1); peak = Math.max(peak, pl.feet.y - y0); }
        return { ...st, rise: +peak.toFixed(2), focus: window.__focus() };
      });
      ok('pad: A on SEASON 2 starts season 2', go.state === 'playing' && go.season === 'inca', JSON.stringify(go));
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
        await window.__press(1);   // B resumes
        await window.__frames(2);
        return { paused, shown, after: document.getElementById('msg').style.display, state: window.__hd.debug.getState().state };
      });
      ok('pad: START pauses mid-run and B resumes', pause.paused && pause.shown === 'block' && pause.after === 'none' && pause.state === 'playing', JSON.stringify(pause));
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
