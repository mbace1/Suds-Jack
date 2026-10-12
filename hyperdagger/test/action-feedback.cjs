// HD-009 — in seasons 1 and 2, firing, jumping and dashing each answer with
// their feedback, with enemies alive on the field.
//
// 12 Oct playtest: "no visible feedback for fire, jump or dash in seasons 1
// and 2". Two causes: main's threat vignette read `player.pos` (undefined)
// and threw every frame with a live enemy, so updateFeel and the render never
// ran — and the jump had no visual at all (sound only). This drives the real
// keyboard/mouse input and reads debug.feedback(): the fx counters, recoil,
// fovKick, dashK and live jump puffs. Walking alone must not fire.
//
//   NODE_PATH=…/node_modules node hyperdagger/test/action-feedback.cjs
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };
const frames = (p, n) => p.evaluate(n => new Promise(r => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
// The box browser can run several times slower than real time, so values
// that decay in a fraction of a second are sampled every frame in the page
// and the PEAK since the last read is returned.
const fb = p => p.evaluate(() => { const pk = window.__fxPeak; window.__fxPeak = null; return { ...window.__hd.debug.feedback(), ...(pk || {}) }; });
const installPeak = p => p.evaluate(() => {
  const tick = () => {
    const f = window.__hd.debug.feedback(), pk = window.__fxPeak || (window.__fxPeak = { recoil: 0, puffs: 0, dashK: 0, fov: 0, fovKick: 0 });
    for (const k of Object.keys(pk)) pk[k] = Math.max(pk[k], f[k]);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

srv.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  try {
    for (const id of ['ember', 'inca']) {
      const ctx = await b.newContext({ viewport: { width: 960, height: 600 } });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
      await p.addInitScript(() => localStorage.setItem('hyperDaggerSeenTips', '1'));
      await p.goto(base + '/hyperdagger/index.html?assets=0');
      await p.waitForFunction(() => window.__hd && window.__hd.debug && window.__hd.debug.feedback, null, { timeout: 30000 });
      await p.evaluate(sid => { const d = window.__hd.debug; d.setSeason(sid); d.startGame(); }, id);
      await p.waitForFunction(() => window.__hd.debug.getState().state === 'playing', null, { timeout: 15000 });
      await p.evaluate(() => { const d = window.__hd.debug; d.freezeDirector(true); d.setInvulnerable(true); d.spawnSkull(); d.spawnSkull(); });
      await installPeak(p);
      const info = await p.evaluate(() => ({ mode: window.__hd.debug.getState().mode, dash: window.__hd.player.dashEnabled }));
      console.log('  ' + id + ' ' + JSON.stringify(info));
      await frames(p, 30); // let the player settle on the floor
      const label = id === 'ember' ? 'season 1' : 'season 2';

      // walking alone never fires
      let f0 = await fb(p);
      await p.keyboard.down('KeyW'); await frames(p, 20); await p.keyboard.up('KeyW');
      let f1 = await fb(p);
      ok(`${label}: walking does not fire`, f1.fire === f0.fire, JSON.stringify([f0.fire, f1.fire]));

      // fire: hold the button through the stream delay
      await p.mouse.move(480, 300);
      await p.mouse.down(); await frames(p, 25);
      f1 = await fb(p);
      await p.mouse.up();
      ok(`${label}: holding fire shoots with recoil`, f1.fire > f0.fire && f1.recoil > 0, JSON.stringify(f1));

      // jump: a press spawns a puff at the feet
      await frames(p, 30);
      f0 = await fb(p);
      await p.keyboard.press('Space'); await frames(p, 3);
      f1 = await fb(p);
      ok(`${label}: jump spawns a puff`, f1.jump > f0.jump && f1.puffs > 0, JSON.stringify(f1));

      // dash: the press is counted and the FOV widens
      await frames(p, 40);
      f0 = await fb(p);
      await p.keyboard.down('KeyW'); await p.keyboard.press('ShiftLeft'); await frames(p, 3);
      f1 = await fb(p);
      await p.keyboard.up('KeyW');
      ok(`${label}: dash gives its kick`, f1.dash > f0.dash && f1.dashK > 0 && f1.fov > 90, JSON.stringify([f0, f1]));

      const alive = await p.evaluate(() => window.__hd.enemies.filter(e => e.alive).length);
      ok(`${label}: no page errors with enemies alive (${alive})`, errs.length === 0, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
  } finally {
    await b.close(); srv.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
