#!/usr/bin/env node
// Radio Free Helsinki — one bulletin, one clip.
//
//   node radiofree/tools/render-clips.mjs [--date YYYY-MM-DD] [--ids a,b]
//        [--out clips] [--seconds 16] [--url URL]
//
// Drives the real app in a real browser and records it. There is no second
// renderer here and there must never be one: a clip that was drawn by a
// separate code path would go on looking right long after the app it claims to
// be a clip OF had changed. `?vertical` is the framing (`index.html`), the
// package is the edit (`js/package.js`), and this file only presses play.
//
// THE SHAPE OF A CLIP: a station ident, the post's own edit (each one is cut
// on a different pattern — establish, intercut, or piece-to-camera), and an
// end card carrying the dateline and the headline.
//
// It used to fire DECODE halfway and hold; DECODE is gone.
//
// 1080×1920 comes out of a 405×720 viewport at deviceScaleFactor 2.667 — the
// recorder does the scaling, so the type stays vector-crisp. Playwright writes
// WebM (VP8) with no audio; if `ffmpeg` is on PATH an MP4 is transcoded beside
// it, which is what every phone-shaped platform actually wants. Neither step
// needs a build, and the MP4 step is optional on purpose: this has to work on
// a laptop that does not have ffmpeg installed.

import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
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
  const o = { date: null, ids: null, out: path.join(RF, 'clips'), seconds: 16,
              url: null, ident: 1.1, card: 2.6, lang: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--no-stingers') { o.ident = 0; o.card = 0; }
    else if (a === '--ident') o.ident = Number(argv[++i]);
    else if (a === '--card') o.card = Number(argv[++i]);
    else if (a === '--lang') o.lang = argv[++i];
    else if (a === '--date') o.date = argv[++i];
    else if (a === '--ids') o.ids = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--out') o.out = path.resolve(argv[++i]);
    else if (a === '--seconds') o.seconds = Number(argv[++i]);
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

const clock = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor(ms / 60000) % 60).padStart(2, '0');
  const sec = String(Math.floor(ms / 1000) % 60).padStart(2, '0');
  return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`;
};

/**
 * A caption file for one clip.
 *
 * The copy is already burned into the frame — it is a lower third, not a
 * voice-over — so this is not a transcript nobody can read. It is what the
 * platforms ingest: the accessibility track, and the thing that makes a clip
 * searchable by the words in it rather than by whatever the uploader typed.
 *
 * The timeline is the renderer's own, so the cues cannot drift from the clip:
 * the ident, the bulletin, and the end card.
 */
export function captions(meta, t) {
  const cues = [];
  let at = 0;
  const cue = (len, text) => { cues.push([at, at + len, text]); at += len; };

  if (t.ident > 0) cue(t.ident, 'Radio Free Helsinki');
  const bodyLen = Math.max(1, t.body);
  const spoken = [meta.head, ...(meta.lines || [])].filter(Boolean);
  // the head gets a fifth of the body, the lines share the rest
  const headLen = Math.min(3, bodyLen / 4);
  cue(headLen, meta.head);
  const each = (bodyLen - headLen) / Math.max(1, spoken.length - 1);
  for (const line of spoken.slice(1)) cue(each, line);
  if (t.card > 0) cue(t.card, `${meta.slug} — Radio Free Helsinki`);

  return cues.map(([a, b, text], i) =>
    `${i + 1}\n${clock(a)} --> ${clock(b)}\n${String(text).trim()}\n`).join('\n');
}

/**
 * The text that goes with the clip when it is posted.
 *
 * Deliberately NOT an auto-post. Posting needs somebody's account and
 * somebody's judgement about where a thing goes, and a job holding the keys to
 * both would be the one part of this project that could do damage while
 * unattended. What it can do without either is write the caption, so posting
 * is a paste rather than a rewrite.
 */
export function postText(meta, { date, lang }) {
  const tags = ['#RadioFreeHelsinki', '#Helsinki', '#pixelart', '#news'];
  return [
    meta.head,
    '',
    meta.slug,
    '',
    'Real events · invented names.',
    `Radio Free Helsinki, ${date}${lang && lang !== 'en' ? ` (${lang})` : ''}`,
    '',
    tags.join(' '),
  ].join('\n') + '\n';
}

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
  console.log(`  ${SIZE.width}×${SIZE.height}, ${opt.seconds}s\n`);

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
    // a clip is made in ONE language and the app has three; the switch rebuilds
    // the feed in place, so it has to happen before anything is worth recording
    if (opt.lang) {
      await page.evaluate((l) => window.__rfh.debug.setLang(l), opt.lang);
      await sleep(500);
    }
    // let the first cut settle before the clip is worth anything
    await sleep(600);
    const head = (Date.now() - t0) / 1000;   // dead air at the top of the file

    // ── the stingers ────────────────────────────────────────────────
    // The station identifies itself, and the clip ends on the TELL rather
    // than stopping mid-sentence. Both are drawn by the app off the wire —
    // see `__rfh.ident` — because this file must not learn to read the wire.
    const marks = { ident: 0 };
    if (opt.ident) {
      await page.evaluate((ms) => window.__rfh.ident({ ms }), opt.ident * 1000);
      marks.ident = opt.ident + 0.56;        // the two fades
    }
    const t1 = Date.now();

    await sleep(opt.seconds * 1000);
    marks.body = (Date.now() - t1) / 1000;
    if (opt.card) await page.evaluate((ms) => window.__rfh.ident({ ms, card: true }), opt.card * 1000);

    // what the clip is OF, straight out of the app's own copy — the caption
    // file and the post text are written from this, never from the wire file
    const meta = await page.evaluate((want) => {
      const c = window.__rfh.debug.copy(want);
      return c && { head: c.head, slug: c.slug,
                    lines: window.__rfh.debug.broadcast(want), lang: window.__rfh.state.lang };
    }, id);

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
    // the sidecars: what a platform ingests, and what a human pastes
    if (meta) {
      await writeFile(path.join(outDir, `${id}.srt`),
        captions(meta, { ident: marks.ident, body: marks.body, card: opt.card }));
      await writeFile(path.join(outDir, `${id}.txt`),
        postText(meta, { date: opt.date, lang: meta.lang }));
      line += '  + srt/txt';
    }
    if (errs.length) line += `   ! ${errs.join(' | ')}`;
    console.log(line);
    made.push({ id, meta, seconds: marks.ident + marks.body + opt.card });
  }

  // One file that says what this morning produced, so whatever posts it does
  // not have to guess at filenames or re-read the wire.
  await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify({
    station: 'Radio Free Helsinki',
    date: opt.date,
    frame: `${SIZE.width}x${SIZE.height}`,
    clips: made.map(m => ({
      id: m.id,
      video: `${m.id}.mp4`,
      captions: `${m.id}.srt`,
      post: `${m.id}.txt`,
      seconds: Math.round(m.seconds * 10) / 10,
      head: m.meta && m.meta.head,
      slug: m.meta && m.meta.slug,
      lang: m.meta && m.meta.lang,
    })),
  }, null, 2) + '\n');

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
