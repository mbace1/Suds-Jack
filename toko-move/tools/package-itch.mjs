// Toko Move — THE STORE UPLOAD (roadmap M2, v2.64).
//
// The game ships from one tree to two homes: the arcade (the Suds-Jack site)
// and a store page (itch.io), where an HTML5 game is a zip with index.html at
// its root, played in a frame served from the store's CDN. This builds that zip
// from the shipping tree — it copies and rewrites, it does not build; the game
// itself still has no build step.
//
// What it does, and why each step:
//   · copies the files GIT TRACKS under toko-move/ and flow-core/ — never the
//     working tree, so a test's output or a scratch file cannot reach a store;
//   · leaves out tests, tools, scripts, the store kit and every .md (design
//     notes are not the product; VERSIONS.md is the changelog on the page);
//   · keeps the two folders SIDE BY SIDE (toko-move/ beside flow-core/), so
//     every import path the arcade build uses still resolves unchanged — no
//     rewriting of game code — and writes a root index.html that steps in;
//   · in toko-move/index.html, drops the arcade's HOME button (../hub/shell.js
//     — there is no arcade on a store page) and declares
//     `window.TOKO_PLATFORM` before the game's modules (js/platform.js reads
//     it: share lines link the store page, the playtest card stays off);
//   · REFUSES any relative path in the package that would resolve outside it,
//     which is how an import of a file that was not packaged gets caught here
//     rather than as a blank page on the store;
//   · zips it, deterministic order, and prints what went in.
//
//   node toko-move/tools/package-itch.mjs [out.zip] [--page https://you.itch.io/toko-move] [--dir keep/here]
//
// test/itch.cjs builds the zip with this, unzips it and plays a shift through
// it with nothing else served beside it.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, extname, posix } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(i > 0 && all[i - 1].startsWith('--')));
const OUT = resolve(positional[0] || join(ROOT, 'toko-move-itch.zip'));
const PAGE = arg('--page', '');
const DIR = arg('--dir') ? resolve(arg('--dir')) : mkdtempSync(join(tmpdir(), 'toko-itch-'));

const SKIP = [/(^|\/)test\//, /(^|\/)tools\//, /(^|\/)scripts\//, /(^|\/)store\//, /\.md$/i];
export function packaged(path) { return !SKIP.some(r => r.test(path)); }

export function buildPackage({ dir = DIR, page = PAGE } = {}) {
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const tracked = execFileSync('git', ['ls-files', 'toko-move', 'flow-core'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  const files = tracked.filter(f => packaged(f.replace(/^[^/]+\//, '')) && existsSync(join(ROOT, f)));
  for (const f of files) { mkdirSync(dirname(join(dir, f)), { recursive: true }); copyFileSync(join(ROOT, f), join(dir, f)); }

  // the game's page: no arcade HOME button, and the platform declared first
  const pagePath = join(dir, 'toko-move', 'index.html');
  let html = readFileSync(pagePath, 'utf8');
  const shell = /<script[^>]*src="\.\.\/hub\/shell\.js[^"]*"[^>]*><\/script>\s*/;
  if (!shell.test(html)) throw new Error('toko-move/index.html no longer loads ../hub/shell.js the way this script expects — check before shipping');
  html = html.replace(shell, '');
  const decl = `<script>window.TOKO_PLATFORM=${JSON.stringify({ name: 'itch', page })};</script>\n`;
  const firstModule = html.indexOf('<script type="module"');
  if (firstModule < 0) throw new Error('no module script in toko-move/index.html');
  html = html.slice(0, firstModule) + decl + html.slice(firstModule);
  writeFileSync(pagePath, html);

  // the store opens index.html at the zip root
  writeFileSync(join(dir, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Toko Move</title><meta http-equiv="refresh" content="0; url=toko-move/index.html">
<style>html,body{margin:0;height:100%;background:#22282d}</style></head>
<body><script>location.replace('toko-move/index.html');</script></body></html>
`);

  // nothing in the package may point outside it
  const escapes = [];
  const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (['.js', '.html', '.mjs', '.css'].includes(extname(p))) check(p); } };
  const check = file => {
    const src = readFileSync(file, 'utf8'), rel = relative(dir, file).split('\\').join('/');
    // An import resolves against the FILE; a fetch() against the PAGE that
    // loaded it (toko-move/index.html). A path is fine if either lands inside
    // the package on a file it carries.
    for (const m of src.matchAll(/['"`]((?:\.\.\/)+[^'"`?#\s]*)/g)) {
      const bases = [posix.dirname(rel), 'toko-move'];
      const targets = bases.map(b => posix.normalize(posix.join(b, m[1])));
      const inside = targets.filter(t => !t.startsWith('..'));
      if (!inside.length) escapes.push(`${rel} → ${m[1]}`);
      else if (/\.(js|json|css)$/.test(m[1]) && !inside.some(t => existsSync(join(dir, t)))) escapes.push(`${rel} → ${m[1]} (not packaged)`);
    }
  };
  walk(dir);
  if (escapes.length) throw new Error(`the package reaches outside itself or for files it does not carry:\n  ${escapes.join('\n  ')}`);
  return { dir, files: files.length + 1 };
}

function zip(dir, out) {
  rmSync(out, { force: true });
  execFileSync('python3', ['-c', `
import os, sys, zipfile
root, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, dirs, files in sorted(os.walk(root)):
        dirs.sort()
        for f in sorted(files):
            p = os.path.join(d, f); a = os.path.relpath(p, root)
            i = zipfile.ZipInfo(a, (2026, 1, 1, 0, 0, 0)); i.compress_type = zipfile.ZIP_DEFLATED
            with open(p, 'rb') as fh: z.writestr(i, fh.read())
`, dir, out]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const r = buildPackage();
    zip(r.dir, OUT);
    const v = (readFileSync(join(ROOT, 'toko-move/VERSIONS.md'), 'utf8').match(/^## v([\d.]+)/m) || [])[1];
    console.log(`itch package: Toko Move v${v} · ${r.files} files · ${(statSync(OUT).size / 1e6).toFixed(2)} MB → ${OUT}${PAGE ? ` · shares ${PAGE}` : ' · no store page set (share lines carry no link)'}`);
    if (!arg('--dir')) rmSync(r.dir, { recursive: true, force: true });
  } catch (e) { console.error(`itch package failed: ${e.message}`); process.exitCode = 1; }
}
