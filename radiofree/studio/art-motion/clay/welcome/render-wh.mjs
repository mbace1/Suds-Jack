#!/usr/bin/env node
// Render the WELCOME HOME look stills:  NODE_PATH=$(npm root -g) node <abs>/clay-home/render-wh.mjs [--only 0,1]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), OUT = path.join(HERE, 'stills');
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
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
  let err = null; page.on('pageerror', (e) => { err = e; console.error('page error:', e.message); });
  page.on('console', (m) => { if (!m.text().startsWith('THREE.WebGLRenderer')) console.log('[page]', m.text()); });
  await page.goto(`http://localhost:${srv.address().port}/clay-home/film-wh.html`, { waitUntil: 'commit', timeout: 0 });
  await page.waitForFunction(() => window.__ready || window.__failed, null, { timeout: 0, polling: 500 });
  if (err) throw err;
  fs.mkdirSync(OUT, { recursive: true });
  const looks = await page.evaluate(() => window.__film.looks);
  const only = arg('only') ? arg('only').split(',').map(Number) : looks.map((_, i) => i);
  for (const i of only) {
    const t0 = Date.now(), url = await page.evaluate((i) => window.__film.look(i), i);
    const f = path.join(OUT, looks[i].name + '.png'); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
    console.log(`${f}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
} finally { await browser.close(); srv.close(); }
