// Hyper Dagger — v64: a pad on a touch screen (the iPad + DualSense playtest).
//   NODE_PATH=$(npm root -g) node hyperdagger/test/pad-tablet.cjs
//
// The playtest: "Controller doesn't shoot. The menus are hard to navigate. Lack
// of communication of clear objectives. In general hard to read." On a touch
// screen the first tap sets touch mode for good, and in touch mode the fire
// check asked the on-screen stick alone. This drives a stubbed pad on a touch
// context at a tablet's size: every asserted action is a pad button or a real
// tap; debug hooks only read state and set scenes.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary', '.webmanifest': 'application/manifest+json' };
const s = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };
const HELPERS = () => {
  const frame = () => new Promise(r => requestAnimationFrame(r));
  window.__frames = async n => { for (let i = 0; i < n; i++) await frame(); };
  window.__game = async sec => { const d = window.__hd.debug, t0 = d.getState().gameTime; for (let i = 0; i < 3000 && d.getState().state === 'playing' && d.getState().gameTime - t0 < sec; i++) await frame(); };
  const gp = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  window.__gp = gp; window.__padOn = false;
  navigator.getGamepads = () => (window.__padOn ? [gp] : []);
  window.__press = async i => { gp.buttons[i].pressed = true; await window.__frames(1); gp.buttons[i].pressed = false; await window.__frames(3); };
  window.__hold = (i, on) => { gp.buttons[i].pressed = on; gp.buttons[i].value = on ? 1 : 0; };
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
  try {
    // an iPad held sideways: touch, coarse pointer, 1180 x 820
    const ctx = await b.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const q = await ctx.newPage();
    q.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await q.addInitScript(() => { localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerSeason', 'ember'); localStorage.setItem('hyperDaggerOptsV26', JSON.stringify({ perf: 'low', music: false, fx: false })); });
    await q.addInitScript(HELPERS);
    await q.goto(`${base}/hyperdagger/?assets=0`, { waitUntil: 'load' });
    await q.waitForFunction(() => window.__hd && window.__hd.debug && document.querySelector('.mn-keys'), null, { timeout: 30000 });

    // the menu, before and after a pad is in hand
    const keys0 = await q.evaluate(() => document.querySelector('.mn-keys').textContent);
    await q.evaluate(async () => { window.__padOn = true; await window.__frames(4); });
    const m = await q.evaluate(() => ({ keys: document.querySelector('.mn-keys').textContent, shown: getComputedStyle(document.querySelector('.mn-keys')).display, hasPad: document.body.classList.contains('has-pad') }));
    ok('menu: with no pad a touch screen is told about the sticks', /stick/.test(keys0) && !/R2/.test(keys0), keys0);
    ok('menu: a pad in hand is told its own buttons, in its own shapes (R2, ✕), and the hint is on screen', m.hasPad && m.shown !== 'none' && /R2/.test(m.keys) && /✕/.test(m.keys) && /season/.test(m.keys) && !/stick/.test(m.keys), JSON.stringify(m));
    await q.evaluate(() => window.__press(15));   // d-pad right: the next season
    const season = await q.evaluate(() => localStorage.getItem('hyperDaggerSeason'));
    ok('menu: the d-pad steps the season', season === 'inca', season);
    await q.evaluate(() => window.__press(14));
    // a real tap first — that is what puts an iPad in touch mode — then ✕ starts
    await q.touchscreen.tap(40, 780);
    await q.evaluate(() => window.__press(0));
    await q.waitForFunction(() => window.__hd.debug.getState().state === 'playing', null, { timeout: 20000 });
    await q.evaluate(async () => { const d = window.__hd.debug; d.setInvulnerable(true); d.setLife(60); d.freezeDirector(true); await window.__game(0.5); });
    const touchMode = await q.evaluate(() => window.__hd.debug.getGoal().touchMode);

    // the HUD at a tablet's size
    const hud = await q.evaluate(() => { const r = id => { const e = document.querySelector(id); if (!e) return null; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return null; const x = e.getBoundingClientRect(); return x.width ? { l: x.left, t: x.top, r: x.right, b: x.bottom, fs: parseFloat(cs.fontSize) } : null; };
      return { g: window.__hd.debug.getGoal(), timer: r('#timer'), kills: r('#kills'), clock: r('#clockLabel'), goal: r('#goalCard'), obj: r('#objective'), keys: r('#keysCard'), bar: r('#runBar'), vh: innerHeight, vw: innerWidth }; });
    ok('run: the objective is on screen in words, with the time', hud.g.objectiveShown && /SURVIVE TO 5:00/.test(hud.g.objective) && /0:0\d/.test(hud.g.objective), hud.g.objective);
    ok('run: a strip along the top shows how far through, with a tick per act', hud.bar && hud.bar.t <= 1 && hud.g.ticks >= 4 && parseFloat(hud.g.bar) >= 0, JSON.stringify([hud.bar, hud.g.ticks, hud.g.bar]));
    ok('run: the controls card says what the pad does (R2 fire, ✕ jump)', hud.g.keysShown && /R2/.test(hud.g.keys) && /✕/.test(hud.g.keys) && /fire/.test(hud.g.keys), hud.g.keys);
    ok('run: the goal card stays long enough to read (≥ 4 s)', hud.g.ms >= 4000 && hud.g.shown, String(hud.g.ms));
    ok('run: at a tablet\'s size the clock is a size up (≥ 40 px) and so are its lines', hud.timer.fs >= 40 && hud.kills.fs >= 16 && hud.clock.fs >= 13, JSON.stringify([hud.timer.fs, hud.kills.fs, hud.clock.fs]));
    const boxes = Object.entries({ timer: hud.timer, kills: hud.kills, clock: hud.clock, goal: hud.goal, obj: hud.obj, keys: hud.keys }).filter(([, v]) => v);
    const hits = []; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const [na, a] = boxes[i], [nb, c] = boxes[j]; if (!(a.r <= c.l || a.l >= c.r || a.b <= c.t || a.t >= c.b)) hits.push(na + '×' + nb); }
    ok('run: nothing in the HUD overlaps at that size', boxes.length >= 6 && hits.length === 0, hits.join(', ') + ' ' + JSON.stringify(boxes.map(([n]) => n)));
    const cy = hud.vh / 2, cx = hud.vw / 2;
    ok('run: the new lines sit at the foot, clear of the reticle', hud.obj.t > cy + 60 && hud.keys.t > cy + 60, JSON.stringify([hud.obj, hud.keys]));

    // THE BUG: the trigger, in touch mode
    const before = await q.evaluate(() => ({ gun: window.__hd.debug.getGun?.(), n: window.__hd.daggers.active.length, fired: window.__hd.debug.getSeasonLook?.().counts?.muzzle ?? null }));
    const fired = await q.evaluate(async () => { window.__hold(7, true); let max = 0; for (let i = 0; i < 400; i++) { await window.__frames(1); max = Math.max(max, window.__hd.daggers.active.length); if (max >= 2) break; } const st = window.__hd.debug.getState(); window.__hold(7, false); await window.__frames(2); return { max, t: st.gameTime }; });
    ok('run: this is a touch-mode session (the tap that makes an iPad one)', touchMode === true, String(touchMode));
    ok('run: R2 HELD fires — in touch mode (it fired nothing); the press grammar is HD-001\'s, unchanged', fired.max >= 2 && before.n === 0, JSON.stringify({ before: before.n, fired }));
    const jump = await q.evaluate(async () => { const pl = window.__hd.player; const y0 = pl.feet.y; window.__hold(0, true); await window.__frames(1); window.__hold(0, false); let top = y0; for (let i = 0; i < 40; i++) { await window.__frames(1); top = Math.max(top, pl.feet.y); } return { y0, top }; });
    ok('run: ✕ jumps', jump.top - jump.y0 > 0.3, JSON.stringify(jump));

    // pause with OPTIONS: short, RESUME first, the tail folded, ○ resumes
    await q.evaluate(() => window.__press(9));
    await q.waitForSelector('#resumeBtn', { timeout: 10000 });
    const p0 = await q.evaluate(() => ({ n: document.querySelectorAll('#msg button').length, first: document.querySelector('#msg button')?.id, bar: document.querySelector('.padbar')?.textContent ?? '' }));
    ok('pause: RESUME is the first thing, and the list is short (≤ 30 buttons; it was 57)', p0.first === 'resumeBtn' && p0.n <= 30, JSON.stringify(p0));
    ok('pause: the pad is told how to move, choose and leave', /select/.test(p0.bar) && /resume/.test(p0.bar) && /OPTIONS/.test(p0.bar), p0.bar);
    await q.evaluate(async () => { await window.__press(13); await window.__press(13); });
    const f = await q.evaluate(() => { const b2 = document.querySelector('#msg button.gfocus'); const r = b2?.getBoundingClientRect(); return { id: b2?.id || b2?.textContent, onScreen: !!r && r.top >= 0 && r.bottom <= innerHeight, outline: b2 ? getComputedStyle(b2).outlineStyle : '' }; });
    ok('pause: the d-pad moves a focus you can see, and it stays on screen', !!f.id && f.onScreen && f.outline !== 'none', JSON.stringify(f));
    await q.evaluate(async () => { for (let i = 0; i < 40 && document.querySelector('#msg button.gfocus')?.id !== 'moreBtn'; i++) await window.__press(13); await window.__press(0); await window.__frames(2); });
    const p1 = await q.evaluate(() => document.querySelectorAll('#msg button').length);
    ok('pause: MORE OPTIONS opens the rest', p1 > p0.n + 15, `${p0.n} → ${p1}`);
    await q.evaluate(() => window.__press(1));   // ○
    const res = await q.evaluate(async () => { await window.__frames(3); return { msg: document.getElementById('msg').style.display, state: window.__hd.debug.getState().state }; });
    ok('pause: ○ resumes', res.msg === 'none' && res.state === 'playing', JSON.stringify(res));
    await ctx.close();
  } catch (e) { ok('the checks ran', false, e.stack || String(e)); }
  ok('zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); s.close();
  process.exit(fail ? 1 : 0);
});
