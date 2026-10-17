#!/usr/bin/env node
// Render a page's frames: NODE_PATH=$(npm root -g) node <abs>/render-frames.mjs <page> <outdir> [--stills 1.2,3.4] [--events file.json]
// The page sets window.__film = { fps, frames, events, frame(i) → JPEG data URL, still(t) → PNG data URL } and window.__ready.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const [PAGE, OUT] = argv; fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
});
await new Promise((res) => srv.listen(0, res));
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } }); page.setDefaultTimeout(0);
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`http://localhost:${srv.address().port}/${PAGE}`, { waitUntil: 'commit', timeout: 0 });
  await page.waitForFunction(() => window.__ready || window.__failed, null, { timeout: 0, polling: 300 });
  const failed = await page.evaluate(() => window.__failed); if (failed) throw new Error(failed);
  if (arg('events')) fs.writeFileSync(arg('events'), JSON.stringify(await page.evaluate(() => window.__film.events), null, 1));
  if (arg('stills')) { for (const t of arg('stills').split(',').map(Number)) { const u = await page.evaluate((t) => window.__film.still(t), t); fs.writeFileSync(path.join(OUT, `t${t.toFixed(2)}.png`), Buffer.from(u.split(',')[1], 'base64')); } console.log('stills ->', OUT); }
  else {
    const n = await page.evaluate(() => window.__film.frames), t0 = Date.now();
    for (let i = 0; i < n; i++) { const u = await page.evaluate((i) => window.__film.frame(i), i); fs.writeFileSync(path.join(OUT, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(u.split(',')[1], 'base64')); if (i % 60 === 0) console.log(`${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
    console.log('frames ->', OUT);
  }
} finally { await browser.close(); srv.close(); }
