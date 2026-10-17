#!/usr/bin/env node
// Render TESLUR B/C (the broadcast in clay) — look stills now, frames later. Run from the scratchpad dir:
//
//   NODE_PATH=$(npm root -g) node clay-roadster/render.mjs --stills                 the five look stills (version A)
//   NODE_PATH=$(npm root -g) node clay-roadster/render.mjs --stills --ver B         version B's looks (C likewise)
//   NODE_PATH=$(npm root -g) node clay-roadster/render.mjs --stills --only 2,4      just looks 2 and 4
//   NODE_PATH=$(npm root -g) node clay-roadster/render.mjs --still 5.2,15           global time t → stills/t-<t>.png
//   NODE_PATH=$(npm root -g) node clay-roadster/render.mjs --probe 3,5.2            where things land on screen
//   NODE_PATH=$(npm root -g) node clay-roadster/render.mjs --frames 0-491           JPEG frames (later)
//   --res 0.5 for drafts · --tag x appends to file names · --tune '{"focus":"toko"}'

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
const VER = arg('ver', 'B');
const FRAMES = path.join(HERE, arg('out', 'frames-' + VER)), STILLS = path.join(HERE, 'stills');
const tag = arg('tag', '');

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
    const t0 = Date.now();
    await page.goto(`http://localhost:${srv.address().port}/clay-roadster/film-bc.html?res=${arg('res', '1')}&ver=${VER}&mask=${arg('mask', 'black')}`, { waitUntil: 'commit', timeout: 0 });
    await page.waitForFunction(() => window.__ready || window.__failed, null, { timeout: 0, polling: 500 }).catch(e => { throw err || e; });
    if (err) throw err;
    console.log(`built in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (arg('tune')) await page.evaluate((o) => window.__film.tune(o), JSON.parse(arg('tune')));
    await fn(page);
  } finally { await browser.close(); srv.close(); }
}
const save = (file, dataURL) => fs.writeFileSync(file, Buffer.from(dataURL.split(',')[1], 'base64'));

if (has('stills')) {
  fs.mkdirSync(STILLS, { recursive: true });
  await withPage(async (page) => {
    const looks = await page.evaluate(() => window.__film.looks);
    const only = arg('only') ? arg('only').split(',').map(Number) : null;
    for (let i = 0; i < looks.length; i++) {
      if (only && !only.includes(i + 1)) continue;
      const t0 = Date.now();
      const d = await page.evaluate((i) => window.__film.look(i), i);
      const f = path.join(STILLS, looks[i].name + tag + '.png');
      save(f, d);
      console.log(f, ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
  });
}

if (has('still')) {
  fs.mkdirSync(STILLS, { recursive: true });
  await withPage(async (page) => {
    for (const t of arg('still').split(',').map(Number)) {
      const t0 = Date.now();
      const d = await page.evaluate((t) => window.__film.still(t), t);
      const f = path.join(STILLS, `${VER}-t${t}${tag}.png`);
      save(f, d);
      console.log(f, ((Date.now() - t0) / 1000).toFixed(1) + 's');
    }
  });
}

// close-ups around the car: --cams '[["side", 2.95, [60, 10, 0], 30], ...]' (name, t, camera offset from the car, fov)
if (has('cams')) {
  fs.mkdirSync(STILLS, { recursive: true });
  await withPage(async (page) => {
    for (const [name, t, off, fov, drapes, lookUp] of JSON.parse(arg('cams'))) {
      const d = await page.evaluate(([t, off, fov, drapes, lookUp]) => { const p = window.__film.carAt(t); return window.__film.stillCam(t, { pos: [p[0] + off[0], p[1] + off[1], p[2] + off[2]], look: [p[0], p[1] + (lookUp ?? 3), p[2]], fov, drapes }); }, [t, off, fov, drapes, lookUp]);
      const f = path.join(STILLS, `${VER}-cam-${name}${tag}.png`); save(f, d); console.log(f);
    }
  });
}

// the film's own timing, for the composer: --events → events-B.json
if (has('events')) {
  await withPage(async (page) => {
    const ev = await page.evaluate(() => window.__film.events());
    fs.writeFileSync(path.join(HERE, `events-${VER}.json`), JSON.stringify(ev, null, 1));
    console.log('wrote', path.join(HERE, `events-${VER}.json`));
  });
}

if (has('probe')) {
  await withPage(async (page) => {
    for (const t of arg('probe').split(',').map(Number))
      console.log(`t=${t}`, JSON.stringify(await page.evaluate((t) => window.__film.probe(t), t)));
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
  const out = path.join(HERE, `film-${VER}.mp4`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '24', '-i', path.join(FRAMES, '%05d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '24', '-movflags', '+faststart', '-an', out]);
  console.log(out);
}
