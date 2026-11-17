const { chromium } = require('playwright');
const fs = require('fs');
const [,, url, out, secs, W, H, dpr] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: +dpr });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForFunction(() => window.__toko?.ready, null, { timeout: 120000 });
  await p.evaluate(() => window.__toko.capBegin('arcade'));
  // warm every material before the first real frame
  for (const t of [0.8, 5.5, 7.6, 9.2, 11.5]) await p.evaluate((t) => window.__toko.capFrame(t), t);
  await p.evaluate(() => window.__toko.capBegin('arcade'));
  const wav = await p.evaluate((s) => window.__toko.introWav(s), +secs);
  fs.writeFileSync(`${out}/sfx.wav`, Buffer.from(wav, 'base64'));
  const N = Math.round(+secs * 30), t0 = Date.now();
  for (let i = 0; i < N; i++) {
    await p.evaluate((t) => window.__toko.capFrame(t), i / 30);
    await p.screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 });
    if (i % 30 === 0) console.log(i, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's', await p.evaluate(() => window.__toko.state));
  }
  console.log('fault:', await p.evaluate(() => document.getElementById('fault').textContent) || '(none)', 'errs:', errs.join(' | ') || '(none)');
  await b.close();
})();
