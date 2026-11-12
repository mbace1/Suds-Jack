// Hyper Dagger — HD-024 (v63): the air in the sky, and the world's light on the bodies.
//   NODE_PATH=$(npm root -g) node hyperdagger/test/sky.cjs
//
// Per season: the sky has its own air and the bodies their own light; VOID has
// neither and stays the control. EFFECTS OFF and the lowest perf tier draw the
// sky and light the bodies as they were (the rig goes back to its old key).
// And it is DRAWN, with a control: the same held frame with the air off is a
// different picture above the horizon.
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
const KIND = { ember: 1, inca: 2, haul: 3 };

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
  const open = async (season, opts, query = '') => {
    const ctx = await b.newContext({ viewport: { width: 640, height: 360 }, serviceWorkers: 'block' });
    const q = await ctx.newPage();
    q.on('pageerror', e => errs.push(`${season} pageerror: ${e.message}`));
    q.on('console', m => { if (m.type() === 'error' && /shader|program|GLSL/i.test(m.text())) errs.push(`${season} shader: ${m.text().slice(0, 200)}`); });
    await q.addInitScript(([sn, o]) => { localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerSeason', sn); localStorage.setItem('hyperDaggerOptsV26', JSON.stringify(Object.assign({ perf: 'high', music: false }, o))); }, [season, opts || {}]);
    await q.goto(`${base}/hyperdagger/?assets=0${query}`, { waitUntil: 'load' });
    await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 30000 });
    return q;
  };
  const sky = q => q.evaluate(() => window.__hd.debug.getSky());
  // the mean colour of the band of sky above the horizon, read off the canvas
  const band = q => q.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const c = document.querySelector('canvas'); const t = document.createElement('canvas'); t.width = 64; t.height = 36; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 64, 36);
    const d = x.getImageData(0, 0, 64, 17).data; const px = []; for (let i = 0; i < d.length; i += 4) px.push(d[i], d[i + 1], d[i + 2]); return px; });
  const diff = (a, b2) => { let n = 0; for (let i = 0; i < a.length; i++) n += Math.abs(a[i] - b2[i]); return n / a.length; };

  try {
    const v = await open('ember', {}, '&season=void&mode=hyper');
    const vs = await sky(v);
    ok('void: no air and no world light — the control', vs.air === 0 && vs.bodyLight === 0 && vs.declared === null, JSON.stringify([vs.air, vs.bodyLight, vs.declared]));
    await v.context().close();
  } catch (e) { ok('void: the check ran', false, e.stack || String(e)); }

  for (const season of ['ember', 'inca', 'haul']) {
    try {
      const q = await open(season);
      await q.evaluate(() => { const d = window.__hd.debug; d.startGame(); d.setInvulnerable(true); d.setLife?.(60); d.freezeDirector(true); });
      await q.evaluate(async () => { const d = window.__hd.debug; const t0 = d.getState().gameTime; for (let i = 0; i < 3000 && d.getState().gameTime - t0 < 0.4; i++) await new Promise(r => requestAnimationFrame(r)); d.setTimeScale(0.02); const pl = window.__hd.player; pl.pitch = 0.16; pl._sync?.(); });
      const on = await sky(q);
      ok(`${season}: the sky has its own air`, on.air > 0 && on.kind === KIND[season], JSON.stringify([on.air, on.kind]));
      ok(`${season}: the bodies take the season's light, and the rig's key is aimed at it`, on.bodyLight > 0 && on.bodyRim.some(c => c > 0.2) && on.rig.keyK > 0.9 && on.rig.keyCol !== 0xdfe4ff, JSON.stringify([on.bodyLight, on.bodyRim, on.rig]));
      const a = await band(q), a2 = await band(q);   // a2: the same frame again — what two looks at one sky differ by
      await q.evaluate(() => window.__hd.debug.setOpt('fx', false));
      const off = await sky(q);
      const b2 = await band(q);
      ok(`${season}: EFFECTS OFF is the sky and the light as they were`, off.air === 0 && off.bodyLight === 0 && off.rig.keyK === 0.35 && off.rig.keyCol === 0xdfe4ff && off.rig.low === 0xff1e1e, JSON.stringify(off));
      ok(`${season}: the air is drawn — the same held frame without it is a different sky (against a control)`, diff(a, b2) > 0.4 && diff(a, b2) > 4 * diff(a, a2) + 0.2, `${diff(a, b2).toFixed(2)} vs control ${diff(a, a2).toFixed(2)}`);
      await q.evaluate(() => window.__hd.debug.setOpt('fx', true));
      const back = await sky(q);
      ok(`${season}: and back on`, back.air === on.air && back.bodyLight === on.bodyLight && back.rig.keyCol === on.rig.keyCol, JSON.stringify([back.air, back.bodyLight]));
      await q.evaluate(() => window.__hd.debug.setOpt('perf', 'low'));
      await q.evaluate(async () => { for (let i = 0; i < 4; i++) await new Promise(r => requestAnimationFrame(r)); });
      const low = await q.evaluate(() => ({ sky: window.__hd.debug.getSky(), tier: window.__hd.debug.getPerf().tier, tiers: window.__hd.debug.getPerf().tiers }));
      ok(`${season}: the lowest perf tier drops both`, low.sky.air === 0 && low.sky.bodyLight === 0, JSON.stringify([low.sky.air, low.sky.bodyLight, low.tier]));
      await q.context().close();
    } catch (e) { ok(`${season}: the checks ran`, false, e.stack || String(e)); }
  }
  // THE BODIES THAT SHIP are sculpted meshes, cloned per spawn — and a clone
  // drops a material's shader hook. So this is asked of the material a body is
  // actually DRAWN with, assets on: the patch was compiled into it (the flag is
  // set inside the hook, at compile), and INCA's mosaic skin is still on it too.
  for (const season of ['ember', 'inca']) {
    try {
      const ctx = await b.newContext({ viewport: { width: 640, height: 360 }, serviceWorkers: 'block' });
      const q = await ctx.newPage();
      q.on('pageerror', e => errs.push(`${season} bodies pageerror: ${e.message}`));
      q.on('console', m => { if (m.type() === 'error' && /shader|program|GLSL/i.test(m.text())) errs.push(`${season} bodies shader: ${m.text().slice(0, 200)}`); });
      await q.addInitScript(sn => { localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerRenderer', 'classic'); localStorage.setItem('hyperDaggerSeason', sn); localStorage.setItem('hyperDaggerOptsV26', JSON.stringify({ perf: 'high', music: false })); }, season);
      await q.goto(`${base}/hyperdagger/`, { waitUntil: 'load' });
      await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 30000 });
      await q.evaluate(() => { const d = window.__hd.debug; d.startGame(); d.setInvulnerable(true); d.setLife?.(60); d.setTimeScale(2); });
      // let the season bring its own bodies, and look at the nearest so it is drawn
      const r = await q.evaluate(async () => {
        const d = window.__hd.debug, hd = window.__hd, pl = hd.player; let seen = null;
        const t0 = d.getState().gameTime;
        for (let i = 0; i < 6000 && d.getState().gameTime - t0 < 26 && !seen; i++) {
          d.setLife?.(60);
          let best = null, bd = 1e9;
          for (const e of hd.enemies) { if (!e.alive || !e.pos || !e.meshRoot) continue; const dist = e.pos.distanceTo(pl.feet); if (dist > 2 && dist < bd) { bd = dist; best = e; } }
          if (best) { const dx = best.pos.x - pl.feet.x, dz = best.pos.z - pl.feet.z, dy = best.pos.y - (pl.feet.y + 1.6); pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); pl._sync?.();
            const mats = []; best.meshRoot.traverse(o => { if (o.isMesh && o.material) mats.push(o.material); });
            if (mats.length && mats.every(m => m.userData.worldLit)) seen = { type: best.type, mats: mats.length, key: mats[0].customProgramCacheKey(), mosaic: mats.every(m => !!m.userData.mosaic), kind: mats[0].type }; }
          await new Promise(r2 => requestAnimationFrame(r2));
        }
        const any = hd.enemies.filter(e => e.meshRoot).length;
        return { seen, sculpted: any, t: +(d.getState().gameTime - t0).toFixed(1) };
      });
      ok(`${season}: a sculpted body the game spawned is drawn with the world-light patch compiled in`, !!r.seen && /world-lit-lambert/.test(r.seen.key), JSON.stringify(r));
      if (season === 'inca') ok('inca: and its mosaic skin is still on the same material (composed, not replaced)', !!r.seen && r.seen.mosaic && /mosaic-skin/.test(r.seen.key), JSON.stringify(r.seen));
      await ctx.close();
    } catch (e) { ok(`${season}: the body checks ran`, false, e.stack || String(e)); }
  }
  ok('zero page errors, no shader failed to compile', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); s.close();
  process.exit(fail ? 1 : 0);
});
