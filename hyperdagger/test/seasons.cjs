// Hyper Dagger — HD-023: three seasons that can be finished, and a finish that counts.
//   NODE_PATH=$(npm root -g) node hyperdagger/test/seasons.cjs
//
// Per season: the acts open in order and are named, the tuned director is
// alive under them (bodies arrive on their own, and in EMBER more than the
// skull family), a second run opens in act one, the run ends on its beat, and
// a clear is saved, shown on the end screen and on the menu. INCA's paid crest
// is cleared with a real Space press, and a crest that hits pays nothing.
// Debug hooks set scenes up (time, life, time scale); what is asserted is what
// the game then does on its own clock.
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
  const open = async (season) => {
    const ctx = await b.newContext({ viewport: { width: 640, height: 360 }, serviceWorkers: 'block' });
    const q = await ctx.newPage();
    q.on('pageerror', e => errs.push(`${season} pageerror: ${e.message}`));
    await q.addInitScript(sn => { localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerSeason', sn);
      if (!localStorage.getItem('hyperDaggerOptsV26')) localStorage.setItem('hyperDaggerOptsV26', JSON.stringify({ perf: 'low', music: false, fx: false })); }, season);
    await q.goto(`${base}/hyperdagger/?assets=0`, { waitUntil: 'load' });
    await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 30000 });
    return q;
  };
  const acts = q => q.evaluate(() => window.__hd.debug.getActs());
  const st = q => q.evaluate(() => window.__hd.debug.getState());
  // let `sec` of the game's own time pass (or the run end)
  const pass_ = (q, sec) => q.evaluate(async sec => { const d = window.__hd.debug; const t0 = d.getState().gameTime;
    for (let i = 0; i < 20000 && d.getState().state === 'playing' && d.getState().gameTime - t0 < sec; i++) await new Promise(r => requestAnimationFrame(r)); }, sec);
  const NAMES = { ember: ['THE SWARM', 'THE PARADE'], inca: ['THE SEA', 'THE DROWNED'], haul: ['THE CONVOY', 'LOCK ON'] };
  const SECOND_AT = { ember: 25, inca: 30, haul: 35 };
  const KEY = { ember: 'hyperDaggerHiHyper', inca: 'hyperDaggerHiHyper:inca', haul: 'hyperDaggerHiTruckV58' };

  for (const season of ['ember', 'inca', 'haul']) {
    try {
      const q = await open(season);
      const menu0 = await q.evaluate(() => ({ best: document.querySelector('.mn-best')?.textContent ?? '', stars: document.querySelectorAll('.mn-star').length }));
      ok(`${season}: an uncleared season wears no seal`, menu0.stars === 0 && !/CLEARED/.test(menu0.best), JSON.stringify(menu0));
      await q.evaluate(() => { const d = window.__hd.debug; d.startGame(); d.setInvulnerable(true); d.setLife(60); d.setTimeScale(3); });
      await pass_(q, 0.4);
      let a = await acts(q);
      ok(`${season}: the run opens in act one, named`, a.idx === 0 && a.name === NAMES[season][0] && a.opened === 1, JSON.stringify([a.idx, a.name, a.opened]));
      ok(`${season}: its best is filed under its own key`, a.hiKey === KEY[season], a.hiKey);

      // the director is alive under the act: bodies arrive on their own
      if (season !== 'haul') {
        const seen = await q.evaluate(async () => { const d = window.__hd.debug, hd = window.__hd; const types = new Set(); let n = 0; const known = new WeakSet(); const t0 = d.getState().gameTime;
          for (let i = 0; i < 20000 && d.getState().gameTime - t0 < 22; i++) { for (const e of hd.enemies) if (!known.has(e)) { known.add(e); n++; types.add(e.type); } await new Promise(r => requestAnimationFrame(r)); }
          return { n, types: [...types] }; });
        ok(`${season}: bodies arrive without being asked for (≥ 6 in the first 22 s; it was one)`, seen.n >= 6, JSON.stringify(seen));
      }

      await q.evaluate(t => window.__hd.debug.setTime(t + 0.2), SECOND_AT[season]);
      await pass_(q, 0.6);
      a = await acts(q);
      const toast = await q.evaluate(() => document.getElementById('toast')?.textContent ?? '');
      ok(`${season}: the second act opens and is named on screen`, a.idx === 1 && a.name === NAMES[season][1] && toast.includes(NAMES[season][1]), JSON.stringify([a.idx, a.name, toast]));
      if (season === 'haul') ok('haul: the act leans on the convoy (skull rate ×1 in LOCK ON, it was ×0.5)', Math.abs(a.skullMul - 1) < 1e-6, String(a.skullMul));
      if (season === 'ember') {
        const valley = a.nextPulseAt - (await st(q)).gameTime;
        ok('ember: the act opens on a valley, then the tuned pulses resume', valley > 0 && valley < 14, valley.toFixed(2));
        // deep in the run the roster is more than the skull family
        await q.evaluate(() => window.__hd.debug.setTime(96));
        const types = await q.evaluate(async () => { const d = window.__hd.debug, hd = window.__hd; const types = new Set(); const t0 = d.getState().gameTime;
          for (let i = 0; i < 30000 && d.getState().gameTime - t0 < 34; i++) { for (const e of hd.enemies) types.add(e.type); await new Promise(r => requestAnimationFrame(r)); } return [...types]; });
        ok('ember: the roster arrives (more than skulls and brutes)', types.some(t => !['skull', 'brute'].includes(t)), types.join());
      }

      if (season === 'inca') {
        // a crest that HITS pays nothing (invulnerable: it still passes through the body)
        await q.evaluate(() => { const d = window.__hd.debug; d.freezeDirector(true); d.setTimeScale(1); });
        const waitCrest = async (jump) => {
          for (let i = 0; i < 4000; i++) {
            const c = (await acts(q)).crest;
            if (jump && c.s > 0 && c.s < 5.5) { await q.keyboard.press('Space'); await q.waitForTimeout(90); await q.keyboard.press('Space'); break; }
            if (!jump && c.s > 0 && c.s < 2) break;
            await q.waitForTimeout(25);
          }
          await pass_(q, 1.6);
        };
        const c0 = (await acts(q)).crests;
        await waitCrest(false);
        const c1 = (await acts(q)).crests;
        ok('inca: a crest that hits the body pays nothing', c1 === c0, `${c0} → ${c1}`);
        // a crest cleared with a real jump pays
        await q.evaluate(() => window.__hd.debug.setLife(30));
        let paid = null;
        for (let tries = 0; tries < 4 && !paid; tries++) {
          const before = await q.evaluate(() => ({ n: window.__hd.debug.getActs().crests, life: window.__hd.debug.getState().lifeT, t: window.__hd.debug.getState().gameTime }));
          await waitCrest(true);
          const after = await q.evaluate(() => ({ n: window.__hd.debug.getActs().crests, life: window.__hd.debug.getState().lifeT, t: window.__hd.debug.getState().gameTime }));
          if (after.n > before.n) paid = { before, after };
        }
        const gain = paid ? (paid.after.life - paid.before.life) + (paid.after.t - paid.before.t) : 0;   // the clock drained meanwhile
        ok('inca: a crest cleared with a jump (Space) is counted', !!paid, JSON.stringify(paid));
        ok('inca: and buys 2 s on the clock', Math.abs(gain - 2) < 0.25, gain.toFixed(2));
        await q.evaluate(() => { const d = window.__hd.debug; d.freezeDirector(false); d.setTimeScale(3); });
      }

      // the end: LAST STAND, the count, the clear
      await q.evaluate(() => { const d = window.__hd.debug; d.setLife(60); d.setTime(269.6); });
      await pass_(q, 1.0);
      const ls = await q.evaluate(() => ({ said: window.__hd.debug.getActs().lastStand, toast: document.getElementById('toast')?.textContent ?? '' }));
      ok(`${season}: LAST STAND is called at thirty seconds to go`, ls.said === 31 && ls.toast.includes('LAST STAND'), JSON.stringify(ls));
      await q.evaluate(() => { const d = window.__hd.debug; d.setLife(60); d.setTime(296.5); });
      await pass_(q, 1.2);
      const cnt = (await acts(q)).lastStand;
      ok(`${season}: the last ten seconds are counted`, cnt >= 1 && cnt <= 4, String(cnt));
      await q.evaluate(() => window.__hd.debug.setLife(60));
      await pass_(q, 8);
      const end = await q.evaluate(() => ({ state: window.__hd.debug.getState().state, run: window.__hd.debug.getRun(), h1: document.querySelector('h1.dead')?.textContent ?? '',
        seal: document.querySelector('p.seal')?.textContent ?? '', big: document.querySelector('p.big')?.textContent ?? '', clears: window.__hd.debug.getActs().clears, mode: window.__hd.debug.getState().mode }));
      ok(`${season}: the season's own clock ends the run at 300 s`, end.state === 'dead' && end.run.complete && /^300\.0s/.test(end.big) && end.h1 === 'RUN COMPLETE', JSON.stringify([end.state, end.run.complete, end.big, end.h1]));
      const rec = end.clears[`${season}:${end.mode}`];
      ok(`${season}: the clear is saved with its kills`, !!rec && rec.n === 1 && Number.isFinite(rec.kills), JSON.stringify(end.clears));
      ok(`${season}: the end screen says so (FIRST CLEAR, kills)`, /CLEARED/.test(end.seal) && /FIRST CLEAR/.test(end.seal) && /\d+ kills/.test(end.seal), end.seal);

      // a second run opens in act one (it used to open in the last act)
      await q.evaluate(() => { const d = window.__hd.debug; d.startGame(); d.setInvulnerable(true); });
      await pass_(q, 0.3);
      a = await acts(q);
      ok(`${season}: a second run opens in act one`, a.idx === 0 && a.opened === 1 && a.crests === 0 && a.lastStand === 0, JSON.stringify([a.idx, a.opened, a.crests, a.lastStand]));

      // the menu remembers: reload, same disk
      await q.reload({ waitUntil: 'load' });
      await q.waitForFunction(() => window.__hd && window.__hd.debug && document.querySelector('.mn-best'), null, { timeout: 30000 });
      const menu1 = await q.evaluate(() => ({ best: document.querySelector('.mn-best')?.textContent ?? '', stars: [...document.querySelectorAll('.mn-season')].map(b => !!b.querySelector('.mn-star')) }));
      const idx = ['ember', 'inca', 'haul'].indexOf(season);
      ok(`${season}: the menu shows the clear, and seals this season's tab only`, /CLEARED/.test(menu1.best) && /best clear \d+ kills/.test(menu1.best) && menu1.stars.every((v, i) => v === (i === idx)), JSON.stringify(menu1));
      await q.context().close();
    } catch (e) { ok(`${season}: the checks ran`, false, e.stack || String(e)); }
  }
  ok('zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); s.close();
  process.exit(fail ? 1 : 0);
});
