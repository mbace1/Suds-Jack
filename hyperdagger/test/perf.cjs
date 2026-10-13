// Hyper Dagger perf smoke — HD-011.
//
// The loop clamps dt at 0.05 s, so a device under 20 fps does not drop frames,
// it plays in SLOW MOTION (12 Oct playtest: 22 s real for ~4 s of game). This
// gate measures that directly: game-to-real time ratio, from the in-game
// monitor (__hd.debug.getTimeRatio — setup/readout only; the run itself is the
// real loop, real director, real enemies), plus rAF frame times sampled in the
// page.
//
//   NODE_PATH=/workspace/pw/node_modules node hyperdagger/test/perf.cjs
//
// Budget. HD_PERF_BUDGET (default 0.02) is the minimum ratio the unthrottled
// run must keep. The default is deliberately LOOSE: on the shared, loaded,
// GPU-less agent box SwiftShader draws season 1 with a pack of ten at ~1 fps,
// a measured ratio of 0.05-0.06 (13 Oct 2026; the PR has the runs). 0.02
// leaves room for box load and catches a further ~2.5x regression or a
// hang. On a CI box with a GPU set HD_PERF_BUDGET=0.95 and it becomes a
// ~20 fps floor (the dt cap is 0.05 s, so 1.0 means >= 20 fps throughout).
// HD_PERF_SECONDS (default 10) is the real-time length of each run.
//
// Throttled variant. CPU throttled ×HD_PERF_THROTTLE (default 6) through CDP,
// frame-time governor disabled so ONLY the ratio monitor can act; it must see
// the ratio fall under its floor and step the quality tier down. A control on
// perf 'high' (no auto quality) must NOT step — so the check can fail.
//
// Known noise on main: the player.pos pageerror (fixed in #591/#593/#594,
// not here) throws every frame while enemies are alive and costs frame time.
// It is counted and reported, not failed on; other page errors fail.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const BUDGET = +(process.env.HD_PERF_BUDGET || 0.02);
const SECONDS = +(process.env.HD_PERF_SECONDS || 10);
const THROTTLE = +(process.env.HD_PERF_THROTTLE || 6);
const s = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n + (d ? ' — ' + d : ''))) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: ['--use-gl=swiftshader', '--disable-dev-shm-usage'],
  });
  const kill = setTimeout(() => { console.log('  !! perf gate timed out'); process.exit(2); }, 240000);

  /** One seeded (DAILY) season-1 run with the director live, `secs` real seconds. */
  async function run(label, { throttle = 0, perf = 'auto', isolate = false, shim = true } = {}) {
    const p = await b.newPage({ viewport: { width: 820, height: 540 } });
    const errs = { pos: 0, other: [] };
    p.on('pageerror', e => (/player\.pos|reading 'pos'|reading 'x'/.test(e.message) ? errs.pos++ : errs.other.push(e.message)));
    p.on('crash', () => { console.log('  !! page crashed'); process.exit(2); });
    await p.addInitScript(() => { localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerRunKind', 'daily'); });
    await p.goto(base + '/hyperdagger/?assets=0&season=ember', { waitUntil: 'load' });
    await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 30000 });
    if (throttle) { const c = await p.context().newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: throttle }); }
    const out = await p.evaluate(async ({ secs, perf, isolate, shim }) => {
      const d = window.__hd.debug;
      // TEST-ONLY alias for main's missing player.pos (the real fix is
      // #591/#593/#594). Without it the throw aborts animate() before
      // composer.render(), so every enemy frame skips the render and the box
      // looks FAST. No-ops once a build defines player.pos.
      const pl = window.__hd.player, shimmed = shim && pl.pos === undefined;
      if (shimmed) Object.defineProperty(pl, 'pos', { get() { return this.feet; }, configurable: true });
      d.setOpt('perf', perf);
      if (perf === 'auto') d.setPerfTier(0);
      if (isolate) Object.assign(d.perfTuning, { downMs: 1e9, settleMs: 300, ratioHoldMs: 1000 }); // only the ratio monitor may act
      d.setInvulnerable(true);
      d.startGame();
      // a pack on the field from frame one (setup only): the director's own
      // opening beat is longer than a 5 s window at a few fps on this box
      for (let i = 0; i < 6; i++) d.spawnSkull();
      d.spawnSpider(); d.spawnSpider(); d.spawnWatcher();
      await new Promise(r => setTimeout(r, 500));
      const hasMon = !!d.getTimeRatio; // main has no monitor: fall back to the game clock
      if (hasMon) d.resetTimeRatio();
      const tier0 = d.getPerfTier().tier, pr0 = d.getPerfTier().pixelRatio;
      const ft = []; let last = performance.now(), maxEnemies = 0;
      const t0 = performance.now(), g0 = d.getState().gameTime ?? d.getState().lifeT;
      await new Promise(r => { const f = now => { ft.push(now - last); last = now; maxEnemies = Math.max(maxEnemies, window.__hd.enemies.filter(e => e.alive).length); (now - t0 >= secs * 1000) ? r() : requestAnimationFrame(f); }; requestAnimationFrame(f); });
      const real = (performance.now() - t0) / 1000, st = d.getState();
      ft.shift(); const sorted = ft.slice().sort((a, b) => a - b), q = k => +(sorted[Math.min(sorted.length - 1, Math.floor(k * sorted.length))] || 0).toFixed(1);
      const lifeGain = (st.gameTime ?? st.lifeT) - g0;
      const mon = hasMon ? d.getTimeRatio() : { total: +(lifeGain / real).toFixed(3), ratio: NaN, realS: real, drops: 0, floor: 0.9, absent: true };
      return { shimmed, mon, clockRatio: +(lifeGain / real).toFixed(3), real: +real.toFixed(2), state: st.state,
        frames: ft.length, p50: q(0.5), p95: q(0.95), max: q(1), maxEnemies, tier0, tier: d.getPerfTier().tier, pr0, pr: d.getPerfTier().pixelRatio };
    }, { secs: SECONDS, perf, isolate, shim });
    await p.close();
    console.log(`  [${label}${out.shimmed ? ', player.pos shimmed' : ''}] ratio ${out.mon.total} (window ${out.mon.ratio}, game clock ${out.clockRatio})${out.mon.absent ? ' [no monitor on this build]' : ''}, ${out.frames} frames, ft p50 ${out.p50} / p95 ${out.p95} / max ${out.max} ms, ` +
      `enemies ≤${out.maxEnemies}, tier ${out.tier0}→${out.tier}, pr ${out.pr0}→${out.pr}, monitor drops ${out.mon.drops}, player.pos errors ${errs.pos}, other errors ${errs.other.length}`);
    return { ...out, errs };
  }

  console.log(`perf budget: ratio ≥ ${BUDGET} over ${SECONDS}s real (HD_PERF_BUDGET), throttle ×${THROTTLE}`);
  const a = await run('unthrottled');
  ok('the run stayed live with enemies on the field', a.state === 'playing' && a.maxEnemies > 0, `state ${a.state}, enemies ≤${a.maxEnemies}`);
  ok('monitor ratio agrees with the frame clock', Math.abs(a.mon.realS - a.real) / a.real < 0.25, `monitor ${a.mon.realS}s vs page ${a.real}s`);
  ok(`game-to-real ratio ≥ budget ${BUDGET}`, a.mon.total >= BUDGET, `${a.mon.total}`);
  ok('no page errors besides the known player.pos throw', a.errs.other.length === 0, a.errs.other.slice(0, 2).join(' | '));

  // as main ships today, unshimmed: reported, not gated — the per-frame
  // throw skips rendering, so this number flatters the build
  const raw = await run('unthrottled, as shipped (no shim)', { shim: false });
  console.log(`  note: as-shipped ratio ${raw.mon.total} with ${raw.errs.pos} player.pos throws is NOT a real perf number`);

  const t = await run(`throttled ×${THROTTLE}`, { throttle: THROTTLE, isolate: true });
  ok('throttled: the monitor sees slow motion', t.mon.total < t.mon.floor, `ratio ${t.mon.total} < floor ${t.mon.floor}`);
  ok('throttled: the ratio monitor stepped quality down', t.mon.drops >= 1 && t.tier > t.tier0, `drops ${t.mon.drops}, tier ${t.tier0}→${t.tier}, pr ${t.pr0}→${t.pr}`);

  const c = await run(`throttled ×${THROTTLE}, perf high (control)`, { throttle: THROTTLE, perf: 'high', isolate: true });
  ok('control: perf high never auto-drops', c.mon.drops === 0 && c.tier === c.tier0, `drops ${c.mon.drops}, tier ${c.tier0}→${c.tier}`);

  clearTimeout(kill);
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); s.close(); process.exit(fail ? 1 : 0);
});
