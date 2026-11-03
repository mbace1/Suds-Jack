// the game's title screen (end card B) and its own intro cues (debug.introWav): node misc.cjs <outdir>
const { chromium } = require('playwright'); const fs = require('fs'); const [,, out] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, serviceWorkers: 'block' });
  const p = await ctx.newPage(); await p.goto('http://127.0.0.1:8731/toko-drop-2/'); await p.waitForFunction(() => window.__toko?.ready, null, { timeout: 180000 });
  fs.mkdirSync(`${out}/title`, { recursive: true }); fs.mkdirSync(`${out}/intro`, { recursive: true });
  await p.waitForTimeout(4000); console.log('state', await p.evaluate(() => window.__toko.state));
  await p.screenshot({ path: `${out}/title/f0000.jpg`, type: 'jpeg', quality: 92 });
  const wav = await p.evaluate(() => window.__toko.introWav(11.6)); fs.writeFileSync(`${out}/intro/sfx.wav`, Buffer.from(wav, 'base64'));
  await b.close();
})();
