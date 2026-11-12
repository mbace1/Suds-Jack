const { chromium } = require('playwright');
const [,, url, out, times, W, H] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +W || 1280, height: +H || 720 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await p.goto(url); await p.waitForFunction(() => window.__toko?.ready, null, { timeout: 120000 });
  console.log('state', await p.evaluate(() => window.__toko.capBegin('arcade')));
  for (const t of times.split(',').map(Number)) {
    await p.evaluate((t) => window.__toko.capFrame(t), t);
    await p.evaluate((t) => window.__toko.capFrame(t), t);   // a second draw: first use of a material compiles
    await p.screenshot({ path: `${out}/t${t.toFixed(2)}.png` });
    console.log('t', t, await p.evaluate(() => window.__toko.state));
  }
  const fault = await p.evaluate(() => document.getElementById('fault').textContent);
  console.log('FAULT:', fault || '(none)'); console.log('ERRS:', errs.slice(0, 8).join('\n') || '(none)');
  await b.close();
})();
