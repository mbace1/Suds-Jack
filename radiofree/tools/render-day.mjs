#!/usr/bin/env node
// Radio Free Helsinki — the morning, rendered to files.
//
//   node radiofree/tools/render-day.mjs                    # newest episode, en
//   node radiofree/tools/render-day.mjs --date 2026-09-19 --lang fi,en,ja
//   node radiofree/tools/render-day.mjs --seconds 16 --fps 30 --out dist/clips
//
// A clip's length comes from its copy: js/film.js gives every caption a reading
// budget and the reveal its hold, so --seconds is a TARGET the budgets compress
// toward (down to 55%), never a cut-off. Leave it out and each clip is as long
// as its bulletin needs.
//
// The station writes a morning and nobody can post it: thirteen bulletins that
// exist only as a page. This drives the app's OWN export button — the same
// `exportActive` a listener presses, through `js/export.js`, through WebCodecs
// — once per bulletin, and writes what comes back to disk with a manifest
// beside it. Nothing here re-implements the renderer, which is the whole point:
// a clip is the thing that shipped, not a second drawing of it.
//
// TWO THINGS ABOUT THE OUTPUT, both facts rather than faults:
//
//   The CODEC IS NEGOTIATED. A desktop Chrome has H.264 and writes an MP4
//   anything plays. The headless Chromium this runs on — in CI and here — has
//   no H.264 encoder at all and writes AV1 into the same .mp4 container. That
//   plays in modern browsers, VLC and mpv, and does NOT play in older phone
//   galleries. The manifest records which codec every file actually got,
//   because "MP4" that turns out to be AV1 is the fact the uploader needs.
//
//   It is SLOW, and it is slow in software. Every frame is drawn by the app,
//   painted into a 1080x1920 canvas and encoded on a CPU with no GPU under it.
//   Budget it in minutes per bulletin, not seconds, and use --seconds to say
//   how long a clip you actually want rather than discovering it at the end.
//
// Exit code is 0 only when every requested clip was written.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// ESM `import('playwright')` does NOT honour NODE_PATH, and NODE_PATH is how
// every gate in this repo reaches the global install. A CJS require does, and
// playwright is CommonJS anyway.
const require = createRequire(import.meta.url);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RF = path.resolve(HERE, '..');
const ROOT = path.resolve(RF, '..');

// ── arguments ─────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
const flag = (name) => argv.includes('--' + name);

const DATE = arg('date', '');
const LANGS = arg('lang', 'en').split(',').map(s => s.trim()).filter(Boolean);
const SECONDS = Number(arg('seconds', 0));
const FPS = Number(arg('fps', 30));

const LIMIT = Number(arg('limit', 0));
const OUT = path.resolve(process.cwd(), arg('out', path.join(RF, 'dist', 'clips')));

if (!Number.isFinite(SECONDS) || SECONDS < 0) { console.error('--seconds must be a number'); process.exit(2); }
if (!Number.isFinite(FPS) || FPS <= 0) { console.error('--fps must be a positive number'); process.exit(2); }

// ── a static server, so this never depends on the network ────────────────
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
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('nope'); return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

async function launch() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  // The export canvas is 1080x1920 whatever the viewport is; the viewport only
  // has to be a phone so the app lays out the way a listener sees it.
  const page = await browser.newPage({ viewport: { width: 400, height: 840 } });
  return { browser, page };
}

const pad = (n) => String(n).padStart(2, '0');

async function main() {
  const { srv, port } = await serve();
  let browser, page;
  try { ({ browser, page } = await launch()); }
  catch (err) {
    srv.close();
    console.error('no browser: install playwright, or run with NODE_PATH=$(npm root -g)');
    console.error(String(err && err.message || err));
    process.exit(2);
  }

  const problems = [];
  const written = [];
  page.on('pageerror', e => problems.push('page error: ' + e.message));
  // the export CATCHES its own failure and logs it; without this the tool
  // would only ever say "nothing came back"
  page.on('console', m => { if (m.type() === 'error') console.error('  [page] ' + m.text()); });

  try {
    for (const lang of LANGS) {
      const q = new URLSearchParams({ lang });
      if (DATE) q.set('date', DATE);
      await page.goto(`http://127.0.0.1:${port}/radiofree/index.html?${q}`);
      // the app opens on a TUNE IN card and builds no feed until it is
      // pressed — the same door the gate goes through
      await page.waitForFunction(() => window.__rfh && window.__rfh.debug, null, { timeout: 60000 });
      await page.evaluate(() => window.__rfh.debug.tuneIn());
      await page.waitForFunction(
        () => window.__rfh.debug.stories().length > 0, null, { timeout: 60000 });
      // The app takes its language from storage or the browser, never the URL,
      // so `?lang=` above was decoration: the first three-language run wrote
      // twenty-four clips and every one of them was English. Switch through the
      // app's own path (the one its buttons call) and refuse to render if the
      // switch did not take.
      const got = await page.evaluate(async (want) => {
        window.__rfh.debug.setLang(want);
        await new Promise(r => setTimeout(r, 400));
        return window.__rfh.state.lang;
      }, lang);
      if (got !== lang) throw new Error(`asked for ${lang}, the app is in ${got}`);

      const info = await page.evaluate(() => ({
        episode: window.__rfh.debug.episode ? window.__rfh.debug.episode() : null,
        stories: window.__rfh.debug.stories(),
        stale: !!(window.__rfh.debug.wire().errors || []).length,
      }));
      const day = info.episode || DATE || 'wire';
      const dir = path.join(OUT, day, lang);
      fs.mkdirSync(dir, { recursive: true });

      const ids = LIMIT > 0 ? info.stories.slice(0, LIMIT) : info.stories;
      console.log(`\n${day} · ${lang} · ${ids.length} bulletin${ids.length === 1 ? '' : 's'}`
        + ` · ${SECONDS ? `about ${SECONDS}s` : 'as long as the copy needs'} at ${FPS}fps`);
      if (info.stale) console.log('  ! this is NOT the newest morning — an episode above it failed to validate');

      for (let i = 0; i < ids.length; i++) {
        const t0 = Date.now();
        const got = await page.evaluate(async ({ i, seconds, fps }) => {
          const d = window.__rfh.debug;
          await d.exportMp4(i, { noDownload: true, seconds: seconds || undefined, fps });
          return d.takeExport();
        }, { i, seconds: SECONDS, fps: FPS });

        if (!got || got.error || !got.base64) {
          problems.push(`${day}/${lang}/${ids[i]}: ${got && got.error ? got.error : 'nothing came back'}`);
          console.log(`  ${pad(i + 1)} ${ids[i].padEnd(24)} FAILED`);
          continue;
        }
        const name = `${pad(i + 1)}-${ids[i]}.${got.ext}`;
        const file = path.join(dir, name);
        fs.writeFileSync(file, Buffer.from(got.base64, 'base64'));
        const rec = {
          file: path.relative(OUT, file), episode: day, lang, id: ids[i],
          codec: got.codec, container: got.ext, type: got.type,
          bytes: got.bytes, frames: got.frames, seconds: got.seconds, fps: FPS,
          target: SECONDS || null, scale: got.scale, revealed: got.revealed, encodeMs: got.ms,
        };
        written.push(rec);
        console.log(`  ${pad(i + 1)} ${ids[i].padEnd(24)} ${got.codec}/${got.ext}`
          + ` ${String(got.seconds.toFixed(1)).padStart(5)}s of clip`
          + ` ${(got.bytes / 1024).toFixed(0).padStart(5)}kB  ${((Date.now() - t0) / 1000).toFixed(1)}s to render`
          + (got.revealed < 0 ? '  ! NO REVEAL' : ''));
      }
    }
  } finally {
    if (browser) await browser.close();
    srv.close();
  }

  if (written.length) {
    fs.mkdirSync(OUT, { recursive: true });
    const manifest = {
      rendered: new Date().toISOString(),
      // A clip is only as honest as the thing it says it is: the codec is per
      // file because a run can straddle two of them.
      clips: written,
      problems,
    };
    fs.writeFileSync(path.join(OUT, 'clips.json'), JSON.stringify(manifest, null, 2) + '\n');
  }

  console.log(`\n${written.length} clip${written.length === 1 ? '' : 's'} in ${path.relative(process.cwd(), OUT)}`);
  const codecs = [...new Set(written.map(c => c.codec))];
  if (codecs.length) {
    console.log(`codec: ${codecs.join(', ')}`
      + (codecs.includes('av1') ? '  — AV1 in .mp4. Plays in modern browsers, VLC and mpv; not in every phone gallery.' : ''));
  }
  for (const p of problems) console.error('  ! ' + p);
  process.exit(problems.length ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
