#!/usr/bin/env node
// Render SOMEBODY DOES THE DISHES (clay).
//
//   NODE_PATH=$(npm root -g) node clay-dishes/render.mjs --stills              one PNG per shot at its key moment
//   NODE_PATH=$(npm root -g) node clay-dishes/render.mjs --still 3:0.75        one shot at shot-time s
//   NODE_PATH=$(npm root -g) node clay-dishes/render.mjs --probe '[[0,2],[1,3]]'  where things land on screen
//   NODE_PATH=$(npm root -g) node clay-dishes/render.mjs --frames 0-899        JPEG frames (skips ones on disk; --force redoes)
//   NODE_PATH=$(npm root -g) node clay-dishes/render.mjs --encode              frames → film.mp4 (silent, 24 fps, H.264, yuv420p)
//   --res 0.5 for quick layout drafts.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes('--' + n);
const FRAMES = path.join(HERE, arg('out', 'frames')), STILLS = path.join(HERE, 'stills');
const KEY = JSON.parse(process.env.KEYS || '[[0, 3.0], [1, 3.2], [2, 1.6], [3, 1.5], [4, 0.9], [5, 1.0], [6, 1.2]]');   // each shot's key moment

async function withPage(fn) {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
  const srv = http.createServer((q, r) => {
    const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!p.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
    fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
  });
  await new Promise(res => srv.listen(0, res));
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
    page.setDefaultTimeout(0);
    let err = null;
    page.on('pageerror', e => { err = e; console.error('page error:', e.message); });
    page.on('console', m => { if (!m.text().startsWith('THREE.WebGLRenderer')) console.log('[page]', m.text()); });
    await page.goto(`http://localhost:${srv.address().port}/clay-dishes/film.html?res=${arg('res', '1')}`, { waitUntil: 'commit', timeout: 0 });
    await page.waitForFunction(() => window.__ready || window.__failed, null, { timeout: 0, polling: 500 }).catch(e => { throw err || e; });
    if (err) throw err;
    if (arg('tune')) await page.evaluate((o) => window.__film.tune(o), JSON.parse(arg('tune')));
    await fn(page);
  } finally { await browser.close(); srv.close(); }
}
const save = (file, dataURL) => fs.writeFileSync(file, Buffer.from(dataURL.split(',')[1], 'base64'));

if (has('stills') || has('still')) {
  fs.mkdirSync(STILLS, { recursive: true });
  const list = has('still') ? arg('still').split(',').map(x => x.split(':').map(Number)) : (arg('only') ? KEY.filter(([k]) => arg('only').split(',').map(Number).includes(k + 1)) : KEY);
  const tagS = arg('tag', '');
  await withPage(async (page) => {
    for (const [k, s] of list) {
      const t0 = Date.now();
      const cam = arg('cam') ? JSON.parse(arg('cam')) : null;
      const d = await page.evaluate(([k, s, cam]) => window.__film.still(k, s, cam), [k, s, cam]);
      const f = path.join(STILLS, has('still') ? `shot-${k + 1}-${s}${tagS}.png` : `shot-${k + 1}${tagS}.png`);
      save(f, d);
      console.log(f, ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
  });
}

if (has('probe')) {
  await withPage(async (page) => {
    for (const [k, s] of JSON.parse(arg('probe')))
      console.log(`shot ${k + 1} s=${s}`, JSON.stringify(await page.evaluate(([k, s]) => window.__film.probe(k, s), [k, s])));
  });
}

if (has('frames')) {
  fs.mkdirSync(FRAMES, { recursive: true });
  const [a, b] = arg('frames').split('-').map(Number);
  const step = Number(arg('step', '1')), force = has('force');
  await withPage(async (page) => {
    const t0 = Date.now(); let n = 0;
    for (let i = a; i <= b; i += step) {
      const f = path.join(FRAMES, String(i).padStart(5, '0') + '.jpg');
      if (!force && fs.existsSync(f)) continue;
      const d = await page.evaluate((i) => window.__film.frame(i), i);
      fs.writeFileSync(f + '.tmp', Buffer.from(d.split(',')[1], 'base64'));
      fs.renameSync(f + '.tmp', f);
      n++;
      if (n % 10 === 0 || i === b) { const per = (Date.now() - t0) / 1000 / n; console.log(`frame ${i}  ${per.toFixed(1)} s/frame  ~${((b - i) / step * per / 60).toFixed(0)} min left`); }
    }
  });
}

if (has('encode')) {
  const out = path.join(HERE, 'film.mp4');
  const n = fs.readdirSync(FRAMES).filter(f => f.endsWith('.jpg')).length;
  const N = Number(arg('n', '514'));
  if (n !== N) console.warn(`warning: ${n} frames on disk, expected ${N}`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '24', '-i', path.join(FRAMES, '%05d.jpg'),
    '-frames:v', String(N), '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '24',
    '-movflags', '+faststart', '-an', out]);
  console.log(out);
}
