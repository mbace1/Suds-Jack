// HD-012 + HD-013 gate.
//  1. On the death screen the kills/load line (#kills) must not intersect the
//     arcade shell's HUB button, at phone portrait, phone landscape, desktop.
//  2. On desktop Chromium the click on a SEASON button (the run-start click)
//     calls canvas.requestPointerLock from inside that gesture, and while
//     locked a mouse movement turns the camera. Headless cannot really lock,
//     so requestPointerLock is spied and the lock is simulated.
// Run: NODE_PATH=/workspace/pw/node_modules node hyperdagger/test/hud-lock.cjs
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const s = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };
const hit = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--disable-dev-shm-usage'] });
  const views = [
    { name: 'phone portrait', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    { name: 'phone landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
    { name: 'desktop', viewport: { width: 1280, height: 720 } },
  ];
  // --- HD-012: season 3 (haul) printed "N kills · load N · +Ns", the long form.
  // HD-010 moved the load onto the clock's label and v58 (HD-018) took it out of
  // the score, so the line is "N kills" now; it still must clear HUB.
  for (const v of views) {
    const { name, ...opt } = v;
    const ctx = await b.newContext(opt);
    const p = await ctx.newPage();
    await p.addInitScript(() => localStorage.setItem('hyperDaggerSeenTips', '1'));
    await p.goto(base + '/hyperdagger/?assets=0&season=haul');
    await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 60000 });
    await p.evaluate(() => { __hd.debug.startGame(); __hd.debug.freezeDirector(true); });
    // (this waited up to 30 s for a "load" that has not been on this line since HD-010)
    await p.waitForFunction(() => /kills/.test(document.getElementById('kills').textContent), null, { timeout: 30000 });
    await p.evaluate(() => __hd.debug.die(false));
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => {
      const k = document.getElementById('kills'), h = document.querySelector('.arcade-home');
      const box = el => { if (!el || getComputedStyle(el).display === 'none') return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
      return { state: __hd.debug.getRun().state, text: k.textContent, kills: box(k), hub: box(h) };
    });
    ok(`${name}: death screen up`, r.state === 'dead', r.state);
    ok(`${name}: HUB present`, !!r.hub);
    ok(`${name}: load line does not intersect HUB`, !!r.kills && !hit(r.kills, r.hub), JSON.stringify(r));
    console.log(`       "${r.text}" kills=${JSON.stringify(r.kills)} hub=${JSON.stringify(r.hub)}`);
    await ctx.close();
  }
  // --- HD-013
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => {
      localStorage.setItem('hyperDaggerSeenTips', '1');
      let locked = null;
      window.__lock = { calls: 0, active: false };
      Object.defineProperty(Document.prototype, 'pointerLockElement', { configurable: true, get() { return locked; } });
      HTMLCanvasElement.prototype.requestPointerLock = function () {
        window.__lock.calls++; window.__lock.active = navigator.userActivation ? navigator.userActivation.isActive : null;
        locked = this; document.dispatchEvent(new Event('pointerlockchange')); return Promise.resolve();
      };
      Document.prototype.exitPointerLock = function () { locked = null; document.dispatchEvent(new Event('pointerlockchange')); };
    });
    await p.goto(base + '/hyperdagger/?assets=0');
    await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 60000 });
    // HD-019: a season tab only picks (no run, no lock); START starts and locks
    await p.locator('#msg button.mn-season[data-season="inca"]').click();
    await p.waitForTimeout(300);
    let r = await p.evaluate(() => ({ lock: window.__lock, state: __hd.debug.getRun().state }));
    ok('a season tab click picks without starting or locking', r.state === 'menu' && r.lock.calls === 0, JSON.stringify(r));
    await p.locator('#startBtn').click();
    await p.waitForTimeout(300);
    r = await p.evaluate(() => ({ lock: window.__lock, state: __hd.debug.getRun().state, locked: !!document.pointerLockElement }));
    ok('START click starts the run', r.state === 'playing', r.state);
    ok('START click calls requestPointerLock', r.lock.calls >= 1, JSON.stringify(r.lock));
    ok('...from inside the user gesture', r.lock.active !== false, JSON.stringify(r.lock));
    await p.evaluate(() => { __hd.debug.freezeDirector(true); __hd.debug.setInvulnerable(true); });
    const y0 = await p.evaluate(() => __hd.debug.getYaw());
    await p.evaluate(() => { for (let i = 0; i < 5; i++) document.dispatchEvent(new MouseEvent('mousemove', { movementX: 40, movementY: 10 })); });
    await p.waitForTimeout(400);
    const y1 = await p.evaluate(() => __hd.debug.getYaw());
    ok('locked mouse movement turns the camera', Math.abs(y1.yaw - y0.yaw) > 0.05, `${y0.yaw} → ${y1.yaw}`);
    // Esc / unlock pauses; the resume click locks again
    await p.evaluate(() => document.exitPointerLock());
    await p.waitForTimeout(200);
    const paused = await p.evaluate(() => document.getElementById('msg').style.display === 'block');
    ok('unlock pauses the run', paused);
    const c0 = await p.evaluate(() => window.__lock.calls);
    // a click on the pause screen's BACKDROP. On the combined v57 build
    // (640, 700) lands on an option button (GIBS, measured 17 Oct), which
    // takes the click for itself. Find a spot no control covers.
    const backdrop = () => p.evaluate(() => {
      for (const y of [360, 200, 520]) for (let x = 16; x < 400; x += 24) {
        const el = document.elementFromPoint(x, y);
        if (el && !el.closest('button, a, input, select, .toko-table, .arcade-home')) return { x, y };
      }
      return null;
    });
    { const sp = await backdrop(); ok('the pause screen has a backdrop to click', !!sp, JSON.stringify(sp)); await p.mouse.click(sp.x, sp.y); }
    await p.waitForTimeout(200);
    r = await p.evaluate(() => ({ calls: window.__lock.calls, locked: !!document.pointerLockElement, msg: document.getElementById('msg').style.display }));
    ok('resume click re-locks', r.calls > c0 && r.locked && r.msg === 'none', JSON.stringify(r));
    // refusal: the lock is denied → the run pauses rather than run cursor-free
    await p.evaluate(() => {
      HTMLCanvasElement.prototype.requestPointerLock = function () { window.__lock.calls++; setTimeout(() => document.dispatchEvent(new Event('pointerlockerror'))); return Promise.reject(new DOMException('refused', 'NotAllowedError')); };
      document.exitPointerLock();
    });
    await p.waitForTimeout(200);
    { const sp = await backdrop(); ok('the pause screen has a backdrop to click', !!sp, JSON.stringify(sp)); await p.mouse.click(sp.x, sp.y); }
    await p.waitForTimeout(300);
    r = await p.evaluate(() => ({ locked: !!document.pointerLockElement, msg: document.getElementById('msg').style.display, state: __hd.debug.getRun().state }));
    ok('refused lock leaves the run paused', !r.locked && r.msg === 'block' && r.state === 'playing', JSON.stringify(r));
    ok('no page errors', errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  // touch still never locks
  {
    const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    await p.addInitScript(() => { localStorage.setItem('hyperDaggerSeenTips', '1'); window.__calls = 0; HTMLCanvasElement.prototype.requestPointerLock = function () { window.__calls++; }; });
    await p.goto(base + '/hyperdagger/?assets=0');
    await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 60000 });
    await p.locator('#startBtn').tap();
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ calls: window.__calls, state: __hd.debug.getRun().state }));
    ok('touch tap starts the run without asking for pointer lock', r.state === 'playing' && r.calls === 0, JSON.stringify(r));
    await ctx.close();
  }
  // HD-019: ENTER on the menu starts the run and asks for the lock from
  // inside that key press (a key press is a user gesture, as a click is)
  {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      localStorage.setItem('hyperDaggerSeenTips', '1');
      let locked = null; window.__lock = { calls: 0, active: false };
      Object.defineProperty(Document.prototype, 'pointerLockElement', { configurable: true, get() { return locked; } });
      HTMLCanvasElement.prototype.requestPointerLock = function () {
        window.__lock.calls++; window.__lock.active = navigator.userActivation ? navigator.userActivation.isActive : null;
        locked = this; document.dispatchEvent(new Event('pointerlockchange')); return Promise.resolve();
      };
    });
    await p.goto(base + '/hyperdagger/?assets=0');
    await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 60000 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ lock: window.__lock, state: __hd.debug.getRun().state }));
    ok('ENTER on the menu starts the run and asks for the lock inside the key press', r.state === 'playing' && r.lock.calls >= 1 && r.lock.active !== false, JSON.stringify(r));
    await ctx.close();
  }
  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
