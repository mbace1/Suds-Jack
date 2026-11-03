// real play under the game's own bot: node play.cjs <world> <out> <advance s> <n shots> <gap s>
const { chromium } = require('playwright');
const [,, world, out, adv, n, gap] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto(`http://127.0.0.1:8731/toko-drop-2/?nointro&world=${world}`); await p.waitForFunction(() => window.__toko?.ready, null, { timeout: 180000 });
  console.log('state', await p.evaluate(() => window.__toko.capBegin('arcade')));
  let t = 0; for (let i = 0; i < 4; i++) await p.evaluate((t) => window.__toko.capFrame(t), (t += 1 / 30));
  await p.evaluate((s) => window.__toko.advance(s), +adv);
  for (let i = 0; i < +n; i++) {
    const steps = Math.round(+gap * 30);
    for (let k = 0; k < steps; k++) await p.evaluate((t) => window.__toko.capFrame(t), (t += 1 / 30));
    await p.screenshot({ path: `${out}/w${world}_${String(i).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 88 });
    const info = await p.evaluate(() => { const d = window.__toko, w = d.world; return { st: d.state, wave: w?.dir?.wave, gels: w?.gels?.filter((g) => g.alive).length,
      sizes: [...new Set((w?.gels ?? []).filter((g) => g.alive).map((g) => g.size))].join(''), slam: (w?.gels ?? []).some((g) => g.slam?.phase === 'warn'),
      hints: d.actors.hints?.debug?.(), lives: w?.hero?.lives, gates: w?.pk?.gates?.length ?? w?.pickups?.gates?.length, boss: (w?.gels ?? []).some((g) => g.alive && g.isBoss) }; });
    console.log(i, JSON.stringify(info));
  }
  console.log('ERRS:', errs.slice(0, 5).join('\n') || '(none)'); await b.close();
})();
