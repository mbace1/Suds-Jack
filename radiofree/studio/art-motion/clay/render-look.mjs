#!/usr/bin/env node
// Render a look-test page's stills: NODE_PATH=$(npm root -g) node <abs>/render-look.mjs <page, relative to the scratchpad> [--only 0,2] [--out dir]
// The page sets window.__film = { looks: [{name}], look(i) → PNG data URL } and window.__ready (or window.__failed).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const PAGE = argv[0], OUT = path.resolve(ROOT, arg('out', path.join(path.dirname(PAGE), 'stills')));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff': 'font/woff' };
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
  page.on('console', (m) => { if (!m.text().startsWith('THREE.WebGLRenderer')) console.log('[page]', m.text()); });
  const t0 = Date.now();
  await page.goto(`http://localhost:${srv.address().port}/${PAGE}`, { waitUntil: 'commit', timeout: 0 });
  await page.waitForFunction(() => window.__ready || window.__failed, null, { timeout: 0, polling: 500 });
  const failed = await page.evaluate(() => window.__failed); if (failed) throw new Error(failed);
  console.log(`built in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  fs.mkdirSync(OUT, { recursive: true });
  const looks = await page.evaluate(() => window.__film.looks);
  const only = arg('only') ? arg('only').split(',').map(Number) : looks.map((_, i) => i);
  for (const i of only) {
    const t1 = Date.now(), url = await page.evaluate((i) => window.__film.look(i), i);
    const f = path.join(OUT, looks[i].name + '.png'); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
    console.log(`${f}  ${((Date.now() - t1) / 1000).toFixed(1)}s`);
  }
} finally { await browser.close(); srv.close(); }
