// where is a world busy? node probe.cjs <world> [seconds=70]: the game's own simple bot (debug.advance) runs a run in
// that world a second at a time, the hero's lives topped up so the bot survives (a capture aid, logged as such), and
// prints what is on the floor each second: wave, live bodies, the biggest size, boss, a slam or a ram warning, gates.
const { chromium } = require('playwright');
const [,, world, secs = 70] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto(`http://127.0.0.1:8731/toko-drop-2/?nointro&world=${world}`); await p.waitForFunction(() => window.__toko?.ready, null, { timeout: 180000 });
  await p.evaluate(() => window.__toko.capBegin('arcade'));
  for (let i = 0; i < 3; i++) await p.evaluate((t) => window.__toko.capFrame(t), i / 30);
  for (let s = 1; s <= +secs; s++) {
    const r = await p.evaluate(() => { const d = window.__toko, w = d.world; if (!w) return null; w.hero.lives = Math.max(w.hero.lives, 3); d.advance(1);
      const live = w.gels.filter((g) => g.alive); return { st: d.state, world: w.world, wave: w.dir?.wave, n: live.length, big: Math.max(0, ...live.map((g) => g.size || 0)),
        boss: live.some((g) => g.isBoss), slam: live.some((g) => g.slam?.phase === 'warn'), ram: (w.posts || []).some((q) => q.ram?.stage === 'warn'),
        gates: (w.pk?.gates || w.pickups?.gates || []).length, trans: !!w.trans, over: !!w.over }; });
    console.log(s, JSON.stringify(r));
  }
  console.log('ERRS:', errs.slice(0, 3).join(' | ') || '(none)'); await b.close();
})();
