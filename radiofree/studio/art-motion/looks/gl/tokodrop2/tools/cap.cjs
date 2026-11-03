// the game's own intro, then its bot's run, frame by frame (debug.capBegin / capFrame, as the v16 review film was):
// node cap.cjs <outdir> <indices a,b,c | a-b> [dpr]   index = seconds since the intro began × 30
const { chromium } = require('playwright');
const fs = require('fs');
const [,, out, list, dpr = 2.5] = process.argv;
const want = new Set(); for (const part of list.split(',')) { const [a, b] = part.split('-').map(Number); for (let i = a; i <= (b ?? a); i++) want.add(i); }
const max = Math.max(...want);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: +dpr, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto('http://127.0.0.1:8731/toko-drop-2/'); await p.waitForFunction(() => window.__toko?.ready, null, { timeout: 180000 });
  fs.mkdirSync(out, { recursive: true });
  await p.evaluate(() => window.__toko.capBegin('arcade'));
  for (const t of [0.8, 5.5, 7.6, 9.2]) await p.evaluate((t) => window.__toko.capFrame(t), t);   // warm every material first
  await p.evaluate(() => window.__toko.capBegin('arcade'));
  const PLAY = Math.floor(10.6 * 30);   // from here the run is stepped a frame at a time, so every frame is drawn
  for (let i = 0; i <= max; i++) {
    if (!want.has(i) && i < PLAY) continue;
    await p.evaluate((t) => window.__toko.capFrame(t), i / 30);
    if (want.has(i)) { if (i < PLAY) await p.evaluate((t) => window.__toko.capFrame(t), i / 30); await p.screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 }); }
  }
  console.log('state', await p.evaluate(() => window.__toko.state), 'ERRS:', errs.slice(0, 5).join(' | ') || '(none)'); await b.close();
})();
