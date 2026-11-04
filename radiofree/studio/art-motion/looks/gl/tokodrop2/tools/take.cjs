// A real-play take, frame by frame (the full film, 4 Nov): node take.cjs <world> <outdir> <advance s> <windows> [dpr=2.5]
//   The run starts in <world> (?nointro&world=N) under the game's own simple bot (capture.bot, debug.advance), is run
//   ahead <advance> seconds, and then <windows> "a-b,c-d@kill,…" (source frames after the advance, 30 fps) are drawn
//   one frame at a time and saved as f<a…b>.jpg; between windows the run is advanced without drawing.
//   <advance> may be `busy:N:max`: run ahead (up to max s) until N bodies are on the floor, so the take starts on a crowd.
//   `@boss` before a window jumps the run to its boss wave (debug.bossWave), `@kill` puts the bosses down
//   (debug.killBosses) so the world clears. A capture aid, said plainly in the plan doc: the hero's lives are topped
//   up before every step, so the bot's run reaches the moment instead of ending (the HUD's hearts show it).
const { chromium } = require('playwright');
const fs = require('fs');
const [,, world, out, adv, wins, dpr = 2.5] = process.argv;
const W = wins.split(',').map((s) => { const [r, hook] = s.split('@'); const [a, b] = r.split('-').map(Number); return { a, b: b ?? a, hook }; });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: +dpr, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto(`http://127.0.0.1:8731/toko-drop-2/?nointro&world=${world}`); await p.waitForFunction(() => window.__toko?.ready, null, { timeout: 180000 });
  fs.mkdirSync(out, { recursive: true });
  await p.evaluate(() => window.__toko.capBegin('arcade'));
  let t = 0; for (let i = 0; i < 4; i++) await p.evaluate((t) => window.__toko.capFrame(t), (t += 1 / 30));
  const top = () => p.evaluate(() => { const w = window.__toko.world; if (w?.hero) w.hero.lives = Math.max(w.hero.lives, 3); });
  const ahead = async (s) => { for (let k = 0; k < s; k += 1) { await top(); await p.evaluate((d) => window.__toko.advance(d), Math.min(1, s - k)); } };
  if (String(adv).startsWith('busy:')) { const [, n, max] = adv.split(':').map(Number); let s = 0;
    while (s < max && (await p.evaluate(() => (window.__toko.world?.gels ?? []).filter((g) => g.alive && g.state === 'active').length)) < n) { await top(); await p.evaluate(() => window.__toko.advance(0.25)); s += 0.25; }
    console.log('busy after', s, 's');
  } else await ahead(+adv);
  let idx = 0;
  for (const w of W) {
    if (w.a > idx) { await ahead((w.a - idx) / 30); idx = w.a; }
    if (w.hook === 'boss') { console.log('boss', await p.evaluate(() => window.__toko.bossWave())); let s = 0;
      while (s < 20 && !(await p.evaluate(() => (window.__toko.world?.gels ?? []).some((g) => g.alive && g.isBoss && g.state === 'active')))) { await top(); await p.evaluate(() => window.__toko.advance(0.25)); s += 0.25; }
      console.log('boss active after', s, 's'); }
    if (w.hook === 'kill') console.log('kill', await p.evaluate(() => window.__toko.killBosses()));
    for (; idx <= w.b; idx++) {
      await top(); await p.evaluate((t) => window.__toko.capFrame(t), (t += 1 / 30));
      await p.screenshot({ path: `${out}/f${String(idx).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 });
    }
    const info = await p.evaluate(() => { const d = window.__toko, w = d.world, live = (w?.gels ?? []).filter((g) => g.alive);
      return { st: d.state, world: w?.world, wave: w?.dir?.wave, n: live.length, big: Math.max(0, ...live.map((g) => g.size || 0)), boss: live.some((g) => g.isBoss), trans: !!w?.trans }; });
    console.log('window', w.a, w.b, JSON.stringify(info));
  }
  console.log('ERRS:', errs.slice(0, 5).join(' | ') || '(none)'); await b.close();
})();
