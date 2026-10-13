// Hyper Dagger — HD-014 convoy perf.  NODE_PATH=/workspace/pw/node_modules node hyperdagger/test/convoy-perf.cjs
//
// The season 3 sibling of perf.cjs (HD-011, #597): same budget knob
// (HD_PERF_BUDGET, default 0.02 — the loose floor for the GPU-less box; 0.95
// on a GPU box), same game-to-real clock ratio and rAF frame times, but on
// the CONVOY, where the landspeeder visuals live. Plus the plan's rule (risk
// 3): draws per truck no more than main's wheeled truck (15). Uses
// __hd.debug.getTimeRatio when the build has it (#597), the game clock if not.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const BUDGET = +(process.env.HD_PERF_BUDGET || 0.02);
const SECONDS = +(process.env.HD_PERF_SECONDS || 10);
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
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined, args: ['--use-gl=swiftshader', '--disable-dev-shm-usage'] });
  const kill = setTimeout(() => { console.log('  !! convoy perf timed out'); process.exit(2); }, 180000);
  const p = await b.newPage({ viewport: { width: 820, height: 540 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerModeV31', 'truck'); localStorage.setItem('hyperDaggerRunKind', 'free'); });
  await p.goto(base + '/hyperdagger/?assets=0&season=haul', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 30000 });
  const out = await p.evaluate(async (secs) => {
    const d = window.__hd.debug;
    d.setOpt?.('perf', 'high');            // no auto quality: measure the scene as drawn
    d.setInvulnerable(true); d.startGame(); d.freezeDirector?.(true);
    await new Promise(r => setTimeout(r, 300));
    const cv = d.truckObj();
    if (!cv?.cargo) return { convoy: false };
    cv.cfg.skullsFrom = 1e9;               // the convoy alone (and no player.pos throw)
    const hasMon = !!d.getTimeRatio; if (hasMon) d.resetTimeRatio();
    const ft = []; let last = performance.now(), maxTrucks = 0;
    const t0 = performance.now(), g0 = d.getState().gameTime ?? d.getState().lifeT;
    await new Promise(r => { const f = now => { ft.push(now - last); last = now; maxTrucks = Math.max(maxTrucks, cv.trucks.length); (now - t0 >= secs * 1000) ? r() : requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const real = (performance.now() - t0) / 1000, st = d.getState(), gain = (st.gameTime ?? st.lifeT) - g0;
    ft.shift(); const so = ft.slice().sort((a, b) => a - b), q = k => +(so[Math.min(so.length - 1, Math.floor(k * so.length))] || 0).toFixed(1);
    const draws = cv.trucks.map(t => { let n = t.pool ? 1 : 0; t.group.traverse(o => { if ((o.isMesh || o.isLineSegments) && o.visible) n++; }); return n; });
    return { convoy: true, state: st.state, ratio: hasMon ? d.getTimeRatio().total : +(gain / real).toFixed(3), mon: hasMon,
      frames: ft.length, p50: q(0.5), p95: q(0.95), maxTrucks, draws: Math.max(...draws), drawsMin: Math.min(...draws) };
  }, SECONDS);
  console.log(`  [season 3 convoy] ratio ${out.ratio} (${out.mon ? 'monitor' : 'game clock'}), ${out.frames} frames, ft p50 ${out.p50} / p95 ${out.p95} ms, trucks ≤${out.maxTrucks}, draws/truck ${out.drawsMin}–${out.draws}`);
  ok('season 3 boots a live convoy', out.convoy && out.state === 'playing', JSON.stringify({ convoy: out.convoy, state: out.state }));
  ok(`convoy game-to-real ratio ≥ budget ${BUDGET}`, out.ratio >= BUDGET, `${out.ratio}`);
  ok('draws per truck ≤ 15 (main\'s wheeled truck)', out.draws <= 15, `${out.drawsMin}–${out.draws}`);
  ok('no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  clearTimeout(kill);
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); s.close(); process.exit(fail ? 1 : 0);
});
