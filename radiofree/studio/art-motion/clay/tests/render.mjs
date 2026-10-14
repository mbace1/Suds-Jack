#!/usr/bin/env node
// Render the clay test stills headless.
//
//   NODE_PATH=$(npm root -g) node render.mjs style1 [style2 …] [--ss 1.5] [--out name]
//
// Each page draws one frame at 1080×1920 × ss into a preserved WebGL (or 2D)
// canvas and sets window.__png; this writes it and downsamples with Lanczos.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const SS = Number(arg('ss', '1.5'));
const QS = arg('q', '');
const names = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };

const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const p = path.join(HERE, u);
  if (!p.startsWith(HERE)) { r.writeHead(403); r.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
});
await new Promise(res => srv.listen(0, res));
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const name of names) {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', e => { console.error(`[${name}] page error:`, e.message); page.evaluate(m => { window.__err = m; }, e.message).catch(() => {}); });
  page.on('console', m => console.log(`[${name}]`, m.text()));
  const t0 = Date.now();
  await page.goto(`http://localhost:${srv.address().port}/${name}.html?ss=${SS}${QS ? '&' + QS : ''}`, { waitUntil: 'commit', timeout: 0 });
  await page.waitForFunction(() => window.__done || window.__err, null, { timeout: 0 });
  const err = await page.evaluate(() => window.__err);
  if (err) { console.error(`[${name}] FAILED:`, err); await page.close(); continue; }
  const data = await page.evaluate(() => window.__png);
  const raw = path.join(HERE, 'out', `${name}-raw.png`);
  fs.mkdirSync(path.dirname(raw), { recursive: true });
  fs.writeFileSync(raw, Buffer.from(data.split(',')[1], 'base64'));
  const out = path.join(HERE, arg('out', name.replace('style', 'style-')) + '.png');
  execFileSync('convert', [raw, '-filter', 'Lanczos', '-resize', '1080x1920!', '-strip', out]);
  console.log(`${out}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await page.close();
}
await browser.close();
srv.close();
