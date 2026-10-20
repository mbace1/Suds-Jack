#!/usr/bin/env node
// Render the review reel (or stills) from preview.html in headless Chromium: the same code the game would run.
//   NODE_PATH=$(npm root -g) node tools/render.mjs <outdir> [--stills clip:t,clip:t,...] [--reel]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [OUT] = process.argv.slice(2), arg = (n) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((res) => srv.listen(0, res));
const { chromium } = require('playwright'); const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1672, height: 1000 } }); page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`http://localhost:${srv.address().port}/preview.html?render=1`); await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  const save = (f, u) => fs.writeFileSync(path.join(OUT, f), Buffer.from(u.split(',')[1], 'base64'));
  if (arg('stills')) for (const s of arg('stills').split(',')) { const [clip, t] = s.split(':');
    save(`${clip}-${(+t).toFixed(2)}.png`, await page.evaluate(([c, t]) => window.__review.still(0.5, c === 'reel' ? null : c, t), [clip, +t])); }
  if (process.argv.includes('--reel')) { const n = await page.evaluate(() => window.__review.frames); fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
    for (let i = 0; i < n; i++) { save(`frames/f${String(i).padStart(5, '0')}.jpg`, await page.evaluate((i) => window.__review.frame(i), i)); if (i % 150 === 0) console.log(`${i}/${n}`); } }
} finally { await browser.close(); srv.close(); }
