// Hyper Dagger — HD-003 follow-up probes: menu focus across screens, a pad
// unplugged mid-menu, two fingers on the menu, a drifting stick, B on the menu.
//   NODE_PATH=$(npm root -g) node hyperdagger/test/menu-focus.cjs
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
  window.__gp = gp; window.__plugged = true;
  navigator.getGamepads = () => (window.__plugged ? [gp] : [null]);
  // a press is held for a few frames then released, so the poll sees both edges
  // ONE frame down: the arcade shell sends you HOME after 750 ms of wall time
  // holding Start, and three frames on a 250 ms-a-frame software renderer is
  // that hold — the page navigated mid-test. One frame is still an edge the
  // game's poll sees (it polls every frame).
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
  const open = async touch => {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: touch, hasTouch: touch });
    const q = await ctx.newPage();
    q.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await q.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerModeV31', 'pure');
      localStorage.setItem('hyperDaggerRunKind', 'free'); localStorage.setItem('hyperDaggerSeason', 'ember'); });
    await q.goto(`${base}/hyperdagger/?assets=0`, { waitUntil: 'load' });
    await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
    await q.evaluate(HELPERS);
    return { q, ctx };
  };
  try {
    // A. focus left on the pause menu must not carry into the death screen
    {
      const { q, ctx } = await open(false);
      const r = await q.evaluate(async () => {
        const d = window.__hd.debug;
        await window.__press(9);                     // START: play
        d.freezeDirector(true); d.setInvulnerable(true); await window.__game(0.3);
        await window.__press(9);                     // START: pause
        for (let i = 0; i < 3; i++) await window.__press(13);
        const pausedFocus = window.__focus();
        await window.__press(1);                     // B: resume
        await window.__game(0.3);
        d.die(); await window.__frames(2);
        const deathFocus = window.__focus();
        await new Promise(r => setTimeout(r, 750));  // the death screen's 700 ms restart guard (wall clock, UI)
        await window.__press(0);                     // A: the screen says ✕ retries
        await window.__frames(3);
        return { pausedFocus, deathFocus, state: d.getState().state, toko: !!document.querySelector('.toko-table') };
      });
      ok('A. pad: the death screen opens with nothing focused, after a pause where focus was moved', r.pausedFocus && r.deathFocus === null, JSON.stringify(r));
      ok('A. pad: A on that death screen retries (not a stale-focused button)', r.state === 'playing' && !r.toko, JSON.stringify(r));
      await ctx.close();
    }
    // B. END RUN from the pause menu → the main menu opens with nothing focused, A starts
    {
      const { q, ctx } = await open(false);
      const r = await q.evaluate(async () => {
        const d = window.__hd.debug;
        await window.__press(9); d.freezeDirector(true); d.setInvulnerable(true); await window.__game(0.3);
        await window.__press(9);
        await window.__press(12);                    // up from nothing wraps to the last button: END RUN
        const at = window.__focus();
        await window.__press(0);                     // A on END RUN
        await window.__frames(3);
        const menuFocus = window.__focus(), st = window.__menu();
        await window.__press(0);                     // A: "press ✕ … to descend"
        await window.__frames(3);
        return { at, menuFocus, menu: st, after: window.__menu() };
      });
      ok('B. pad: END RUN lands on the main menu with nothing focused', r.at === 'endBtn' && r.menu.state === 'menu' && r.menuFocus === null, JSON.stringify(r));
      ok('B. pad: and A there starts a run, the way the menu says', r.after.state === 'playing' && r.after.runKind === r.menu.runKind, JSON.stringify(r));
      await ctx.close();
    }
    // C. pad unplugged and replugged mid-menu: nothing fires, focus still works
    {
      const { q, ctx } = await open(false);
      const r = await q.evaluate(async () => {
        for (let i = 0; i < 12 && window.__focus() !== 'mode:hyper'; i++) await window.__press(13);
        const before = { f: window.__focus(), m: window.__menu() };
        window.__plugged = false; await window.__frames(4);
        window.__plugged = true; await window.__frames(4);
        const after = { f: window.__focus(), m: window.__menu() };
        await window.__press(13);
        return { before, after, next: window.__focus() };
      });
      ok('C. pad: unplug/replug mid-menu fires nothing and keeps the focus walkable',
        r.after.m.state === 'menu' && r.after.m.mode === r.before.m.mode && r.after.m.runKind === r.before.m.runKind && r.next === 'mode:truck', JSON.stringify(r));
      await ctx.close();
    }
    // D. two fingers on the menu at once: one run, no jump, no stick held
    {
      const { q, ctx } = await open(true);
      const cdp = await ctx.newCDPSession(q);
      const pts = [{ x: 60, y: 370, id: 1 }, { x: 784, y: 370, id: 2 }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const r = await q.evaluate(async () => {
        const d = window.__hd.debug; let n = 0; while (d.getState().state !== 'playing' && n++ < 120) await window.__frames(1);
        d.freezeDirector(true); d.setInvulnerable(true);
        const pl = window.__hd.player, inp = d.inputObj(); const y0 = pl.feet.y; let peak = 0; const t0 = d.getState().gameTime;
        for (let i = 0; i < 3000 && d.getState().gameTime - t0 < 0.6; i++) { await window.__frames(1); peak = Math.max(peak, pl.feet.y - y0); }
        return { state: d.getState().state, rise: +peak.toFixed(2), sticks: [inp.left.active, inp.right.active] };
      });
      ok('D. touch: two fingers on the menu start one run with no jump and no stick held', r.state === 'playing' && r.rise < 0.2 && !r.sticks[0] && !r.sticks[1], JSON.stringify(r));
      await ctx.close();
    }
    // E. a stick drifting past the menu threshold, held through a pause: no focus walk; B on the main menu does nothing
    {
      const { q, ctx } = await open(false);
      const r = await q.evaluate(async () => {
        const d = window.__hd.debug, gp = window.__gp;
        await window.__press(1); await window.__frames(3);
        const bOnMenu = window.__menu();
        await window.__press(9); d.freezeDirector(true); d.setInvulnerable(true);
        gp.axes[1] = 0.6;                            // drift past the 0.55 menu line, held into the pause
        await window.__game(0.3);
        await window.__press(9); await window.__frames(20);
        const f = window.__focus();
        gp.axes[1] = 0; await window.__frames(3);
        return { bOnMenu, f };
      });
      ok('E. pad: B on the main menu does not start anything', r.bOnMenu.state === 'menu', JSON.stringify(r));
      ok('E. pad: a stick held past the menu line into the pause does not walk the focus', r.f === null, JSON.stringify(r));
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
