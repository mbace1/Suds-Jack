#!/usr/bin/env node
// Radio Free Helsinki — one bulletin, one clip.
//
//   node radiofree/tools/render-clips.mjs [--date YYYY-MM-DD] [--ids a,b]
//        [--out clips] [--seconds 16] [--cut 8] [--no-decode] [--url URL]
//
// Drives the real app in a real browser and records it. There is no second
// renderer here and there must never be one: a clip that was drawn by a
// separate code path would go on looking right long after the app it claims to
// be a clip OF had changed. `?vertical` is the framing (`index.html`), the
// package is the edit (`js/package.js`), and this file only presses play.
//
// THE SHAPE OF A CLIP is the app's own argument, timed:
//   0s          the cut runs — footage, the studio, the graphic
//   --cut       DECODE fires; the edit stops and holds the graphic while the
//               plain readings grow in beside the broadcast wording
//   --seconds   out
// The hold is the whole point. A clip that only shows the bulletin is a news
// post; the second half is what makes it this station's.
//
// 1080×1920 comes out of a 405×720 viewport at deviceScaleFactor 2.667 — the
// recorder does the scaling, so the type stays vector-crisp. Playwright writes
// WebM (VP8) with no audio; if `ffmpeg` is on PATH an MP4 is transcoded beside
// it, which is what every phone-shaped platform actually wants. Neither step
// needs a build, and the MP4 step is optional on purpose: this has to work on
// a laptop that does not have ffmpeg installed.

import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createReadStream } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RF = path.resolve(HERE, '..');
const ROOT = path.resolve(RF, '..');

// 405×720 CSS px × 2.667 = 1080×1920 device px.
const VIEW = { width: 405, height: 720 };
const SCALE = 1080 / VIEW.width;
const SIZE = { width: 1080, height: 1920 };

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json', '.css': 'text/css',
};

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); return res.end('nope'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

export function args(argv) {
  const o = { date: null, ids: null, out: path.join(RF, 'clips'), seconds: 16, cut: 8, decode: true, url: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-decode') o.decode = false;
    else if (a === '--date') o.date = argv[++i];
    else if (a === '--ids') o.ids = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--out') o.out = path.resolve(argv[++i]);
    else if (a === '--seconds') o.seconds = Number(argv[++i]);
    else if (a === '--cut') o.cut = Number(argv[++i]);
    else if (a === '--url') o.url = argv[++i];
  }
  return o;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function have(cmd) {
  return new Promise((resolve) => {
    const p = spawn(cmd, ['-version'], { stdio: 'ignore' });
    p.on('error', () => resolve(false));
    p.on('close', (code) => resolve(code === 0));
  });
}

// H.264 + faststart + yuv420p: the combination every phone-shaped platform
// wants, and the one a webm is refused for. CRF 20 because the art is flat
// colour with hard pixel edges — the thing compression ruins first.
function toMp4(webm, mp4, head = 0) {
  return new Promise((resolve, reject) => {
    // `-ss` before `-i` seeks the input: the recording starts when the browser
    // context does, so the file opens on however long the page took to load.
    // The head is measured, not guessed — see `head` at the call site.
    const seek = head > 0.15 ? ['-ss', head.toFixed(2)] : [];
    const ff = spawn('ffmpeg', ['-y', ...seek, '-i', webm,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { stdio: 'ignore' });
    ff.on('error', reject);
    ff.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg exited ' + code)));
  });
}

// The frame the clips are cut to, exported so the gate can grade it without
// spending fifteen seconds a bulletin recording one.
export const FRAME = { view: VIEW, size: SIZE, scale: SCALE };

async function main() {
  const opt = args(process.argv.slice(2));

  // NODE_PATH is a CJS mechanism — `import()` does not consult it, so a global
  // playwright install is only reachable through a require. The gate hits the
  // same wall and solves it the same way (it is a .cjs file, which is why it
  // never had to say so).
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch {
    try {
      const { createRequire } = await import('node:module');
      ({ chromium } = createRequire(import.meta.url)('playwright'));
    } catch {
      console.error('✗ playwright is not installed. NODE_PATH=/opt/node22/lib/node_modules, or npm i -D playwright');
      process.exit(1);
    }
  }

  let srv = null, base = opt.url;
  if (!base) {
    const s = await serve();
    srv = s.srv;
    base = `http://127.0.0.1:${s.port}/radiofree/`;
  }

  const browser = await chromium.launch();
  const raw = path.join(opt.out, '.raw');
  await mkdir(raw, { recursive: true });

  // Which bulletins. Asking the app rather than reading the wire file keeps this
  // honest about the ROTATION — what actually aired, in the order it aired,
  // which is not the order the file lists.
  let ids = opt.ids;
  {
    const ctx = await browser.newContext({ viewport: VIEW });
    const page = await ctx.newPage();
    await page.goto(base + '?vertical' + (opt.date ? '&date=' + opt.date : ''), { waitUntil: 'load' });
    await page.evaluate(() => window.__rfh.debug.tuneIn());
    await page.waitForFunction(() => window.__rfh.debug.stories().length > 0, null, { timeout: 20000 });
    const info = await page.evaluate(() => ({ ids: __rfh.debug.stories(), date: __rfh.debug.episode() }));
    if (!ids) ids = info.ids;
    opt.date = opt.date || info.date || 'undated';
    await ctx.close();
  }

  const outDir = path.join(opt.out, opt.date);
  await mkdir(outDir, { recursive: true });
  console.log(`Radio Free Helsinki — ${ids.length} clip${ids.length === 1 ? '' : 's'} for ${opt.date}`);
  console.log(`  ${SIZE.width}×${SIZE.height}, ${opt.seconds}s, decode at ${opt.decode ? opt.cut + 's' : 'never'}\n`);

  const mp4able = await have('ffmpeg');
  if (!mp4able) console.warn('  ! ffmpeg not on PATH — writing WebM only\n');

  const made = [];
  for (const id of ids) {
    const t0 = Date.now();               // the recording starts with the context
    const ctx = await browser.newContext({
      viewport: VIEW,
      deviceScaleFactor: SCALE,
      recordVideo: { dir: raw, size: SIZE },
      // a clip is watched, not read by a screen reader, and the app freezes its
      // decorative motion under reduced-motion — which would record a still
      reducedMotion: 'no-preference',
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));

    const url = `${base}?vertical${opt.date ? '&date=' + opt.date : ''}#${id}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => window.__rfh.debug.tuneIn());
    await page.waitForFunction((want) => window.__rfh.state && window.__rfh.state.id === want,
      id, { timeout: 20000 });
    // let the first cut settle before the clip is worth anything
    await sleep(600);
    const head = (Date.now() - t0) / 1000;   // dead air at the top of the file

    if (opt.decode) {
      await sleep(opt.cut * 1000);
      await page.evaluate(() => window.__rfh.debug.toggleDecode());
      await sleep(Math.max(0, opt.seconds - opt.cut) * 1000);
    } else {
      await sleep(opt.seconds * 1000);
    }

    const video = page.video();
    await ctx.close();                       // the file is only written on close
    const src = await video.path();
    const webm = path.join(outDir, `${id}.webm`);
    await rename(src, webm);
    let line = `  ${id.padEnd(22)} ${path.relative(process.cwd(), webm)}`;
    if (mp4able) {
      const mp4 = path.join(outDir, `${id}.mp4`);
      await toMp4(webm, mp4, head);
      line += `  +  ${path.basename(mp4)}`;
    } else {
      line += `   (webm opens on ${head.toFixed(1)}s of load — ffmpeg trims it)`;
    }
    if (errs.length) line += `   ! ${errs.join(' | ')}`;
    console.log(line);
    made.push(id);
  }

  await browser.close();
  if (srv) srv.close();
  // playwright leaves the directory behind even when every file has been moved
  await rm(raw, { recursive: true, force: true }).catch(() => {});

  const left = await readdir(outDir);
  console.log(`\n✓ ${made.length} clip${made.length === 1 ? '' : 's'} in ${path.relative(process.cwd(), outDir)} (${left.length} files)`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
