// Record GLYPH//CITY to an MP4, frame by frame, off the game's own clock.
//
//   NODE_PATH=$(npm root -g) node glyphcity/tools/capture.mjs [out.mp4] [--w 1280 --h 720 --fps 30 --seed 14 --shot]
//
// The page is opened with ?capture=1, which stops its rAF loop; every frame is
// window.__gc.frame(1/fps), read back as a PNG and piped to ffmpeg. Because the
// clock is the frame counter rather than the wall, a slow software GPU makes a
// slow render, never a stuttering video.
//
// The cut (seconds): 0-3 title over the attract run · 3-11 the run with the
// HUD · 11-15 a palette tour, one look a beat · 15-16.5 back to the title.
// --shot writes a few PNG stills instead (for a quick look).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const W = Number(opt('w', 1280)), H = Number(opt('h', 720)), FPS = Number(opt('fps', 30));
const SEED = Number(opt('seed', 14)), ZOOM = opt('zoom', null);
const SHOT = args.includes('--shot');
const OUT = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || 'glyphcity.mp4';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  fs.readFile(p.endsWith('/') ? p + 'index.html' : p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://localhost:${port}/glyphcity/index.html?capture=1&w=${W}&h=${H}&seed=${SEED}${ZOOM ? '&zoom=' + ZOOM : ''}`);
await page.waitForFunction(() => window.__gc, null, { timeout: 30000 });
await page.evaluate(() => document.querySelectorAll('.arcade-home').forEach((e) => e.remove()));

const decode = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

if (SHOT) {
  const dir = path.resolve(OUT.replace(/\.mp4$/, ''));
  fs.mkdirSync(dir, { recursive: true });
  // warm the city up, then a still per state
  await page.evaluate(() => { for (let i = 0; i < 60; i++) window.__gc.step(1 / 30); });
  const shots = [
    ['title', () => window.__gc.setMode('title', true)],
    ['play', () => window.__gc.setMode('play', true)],
    ['raw', () => { window.__gc.S.raw = true; }],
    ['phosphor', () => { window.__gc.S.raw = false; window.__gc.setPalette(1); }],
    ['vapor', () => window.__gc.setPalette(5)],
  ];
  for (const [name, fn] of shots) {
    await page.evaluate(fn);
    for (let i = 0; i < 20; i++) await page.evaluate(() => window.__gc.step(1 / 30));
    const url = await page.evaluate(() => window.__gc.frame(1 / 30));
    fs.writeFileSync(path.join(dir, name + '.png'), decode(url));
    console.log('wrote', path.join(dir, name + '.png'));
  }
} else {
  const cut = [
    [0, () => { window.__gc.setPalette(0); window.__gc.setMode('title', true); }],
    [3, () => window.__gc.setMode('play', true)],
    [11, () => window.__gc.setPalette(1)],
    [12, () => window.__gc.setPalette(2)],
    [13, () => window.__gc.setPalette(5)],
    [14, () => window.__gc.setPalette(4)],
    [15, () => { window.__gc.setPalette(0); window.__gc.setMode('title', true); }],
  ];
  const total = Math.round(16.5 * FPS);
  // a few seconds of city before the first frame, so cars and drones are spread out
  await page.evaluate(() => { for (let i = 0; i < 90; i++) window.__gc.step(1 / 30); });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    const t = f / FPS;
    for (const [at, fn] of cut) if (Math.abs(at * FPS - f) < 0.5) await page.evaluate(fn);
    const url = await page.evaluate((dt) => window.__gc.frame(dt), 1 / FPS);
    if (!ff.stdin.write(decode(url))) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % FPS === 0) process.stdout.write(`\r${t.toFixed(0)}s / ${(total / FPS).toFixed(1)}s  (${((Date.now() - t0) / 1000).toFixed(0)}s elapsed)`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`\nwrote ${OUT}`);
}

if (errors.length) console.log('page errors:\n  ' + errors.join('\n  '));
await browser.close();
server.close();
