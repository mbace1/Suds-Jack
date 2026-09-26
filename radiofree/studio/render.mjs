#!/usr/bin/env node
// Render a studio episode to an MP4 anyone can play.
//
//   NODE_PATH=$(npm root -g) node radiofree/studio/render.mjs --ep bargain-bin --out dist
//   … --sheet            one still per shot (mid-shot), for looking before rendering
//   … --fps 30
//
// The page draws every frame (studio/film.js) and synthesises the soundtrack
// offline; this drives it, writes the frames as JPEG and the mix as WAV, and
// hands both to ffmpeg for H.264 + AAC at -16 LUFS. ffmpeg must be on PATH —
// unlike the station's in-browser export this is a desk tool, not a button,
// and H.264 is the whole reason for it: every phone plays it.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const EP = arg('ep', 'bargain-bin');
const FPS = Number(arg('fps', 30));
const OUT = path.resolve(arg('out', path.join(HERE, 'dist')));
const SHEET = argv.includes('--sheet');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  const p = path.join(ROOT, u);
  if (!p.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
});
await new Promise(res => srv.listen(0, res));
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(`http://localhost:${srv.address().port}/radiofree/studio/?ep=${EP}`);
await page.waitForFunction(() => window.__studio, null, { timeout: 60000 });
fs.mkdirSync(OUT, { recursive: true });

const grab = (t, q = 0.9) => page.evaluate(([t, q]) => { __studio.frame(t); return __studio.canvas.toDataURL('image/jpeg', q); }, [t, q])
  .then(d => Buffer.from(d.split(',')[1], 'base64'));

const shots = await page.evaluate(() => __studio.tl.shots.map(s => ({ start: s.start, dur: s.dur })));
const total = await page.evaluate(() => __studio.tl.total);

if (SHEET) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-sheet-'));
  for (let i = 0; i < shots.length; i++) fs.writeFileSync(path.join(dir, `${i}.jpg`), await grab(shots[i].start + shots[i].dur * 0.72));
  const outFile = path.join(OUT, `${EP}-sheet.jpg`);
  const cols = Math.min(5, shots.length);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(dir, '%d.jpg'),
    '-vf', `scale=324:-1,tile=${cols}x${Math.ceil(shots.length / cols)}`, '-frames:v', '1', outFile]);
  console.log(outFile);
} else {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-frames-'));
  const n = Math.ceil(total * FPS), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    fs.writeFileSync(path.join(dir, String(i).padStart(5, '0') + '.jpg'), await grab(i / FPS));
    if (i % 150 === 0) console.log(`  frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  fs.writeFileSync(path.join(dir, 'mix.wav'), Buffer.from(await page.evaluate(() => __studio.audio()), 'base64'));
  const outFile = path.join(OUT, `${EP}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'),
    '-i', path.join(dir, 'mix.wav'), '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-shortest', '-movflags', '+faststart', outFile]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`${outFile}  ${total.toFixed(1)}s  ${n} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s to render`);
}
await browser.close(); srv.close();
