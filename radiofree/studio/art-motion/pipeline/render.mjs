#!/usr/bin/env node
// Render a film page in headless Chromium: frames, its events (for the score) and its text report (for the checks).
//   NODE_PATH=$(npm root -g) node pipeline/render.mjs <page, relative to art-motion/> <outdir> --fonts <dir> [--lang en] [--stills 1.2,3.4] [--report-only]
// The page sets window.__film = { fps, frames, events, report, frame(i) → JPEG data URL, still(t) → PNG data URL } and
// window.__ready (or window.__failed); frame() may return a promise. The server serves art-motion/ at / and the fonts
// directory at /_fonts/; --mount name=dir (repeatable) serves dir at /name/, and --query adds to the page's URL.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; }, flag = (n) => argv.includes('--' + n);
const [PAGE, OUT] = argv, FONTS = path.resolve(arg('fonts', '')), LANG = arg('lang', 'en'), QUERY = arg('query', '');
const MOUNTS = { _fonts: FONTS }; argv.forEach((a, i) => { if (a === '--mount') { const [k, v] = argv[i + 1].split('='); MOUNTS[k] = path.resolve(v); } });
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff': 'font/woff', '.ttf': 'font/ttf', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]), m = Object.keys(MOUNTS).find((k) => u.startsWith(`/${k}/`)), [base, rel] = m ? [MOUNTS[m], u.slice(m.length + 2)] : [ROOT, u];
  const p = path.join(base, rel);
  if (!p.startsWith(base)) { r.writeHead(403); r.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
});
await new Promise((res) => srv.listen(0, res));
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } }); page.setDefaultTimeout(0);
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(`http://localhost:${srv.address().port}/${PAGE}?lang=${LANG}&fonts=/_fonts/${QUERY ? '&' + QUERY : ''}`, { waitUntil: 'commit', timeout: 0 });
  await page.waitForFunction(() => window.__ready || window.__failed, null, { timeout: 0, polling: 300 });
  const failed = await page.evaluate(() => window.__failed); if (failed) throw new Error(failed);
  const { events, report, n, fps } = await page.evaluate(() => ({ events: window.__film.events, report: window.__film.report, n: window.__film.frames, fps: window.__film.fps }));
  fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(events, null, 1));
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ ...report, frames: n, fps }, null, 1));
  if (flag('report-only')) console.log('events + report ->', OUT);
  else if (arg('stills')) { for (const t of arg('stills').split(',').map(Number)) { const u = await page.evaluate((t) => window.__film.still(t), t); fs.writeFileSync(path.join(OUT, `t${t.toFixed(2)}.png`), Buffer.from(u.split(',')[1], 'base64')); } console.log('stills ->', OUT); }
  else {
    const dir = path.join(OUT, 'frames'); fs.mkdirSync(dir, { recursive: true }); const t0 = Date.now();
    for (let i = 0; i < n; i++) { const u = await page.evaluate((i) => window.__film.frame(i), i); fs.writeFileSync(path.join(dir, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(u.split(',')[1], 'base64')); if (i % 60 === 0) console.log(`${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
    console.log('frames ->', dir);
  }
} finally { await browser.close(); srv.close(); }
