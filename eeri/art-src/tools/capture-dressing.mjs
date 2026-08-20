#!/usr/bin/env node
// EERI — write worlds 3 and 4's dressing DOWN.
//
//   node eeri/art-src/tools/capture-dressing.mjs [--check]
//
// WHY THIS EXISTS. Every prop in those two worlds was a line of code that ran
// once: `timberFrame(THREE, root, 15, 4.1, 6.0, 5.2, -0.84)`. There was no
// object anywhere to select, so "place it somewhere better" meant editing a
// number in a function body and reloading, and nothing could be dragged,
// aligned or saved. That is the whole reason worlds 3 and 4 read as things
// dropped near each other rather than composed.
//
// The migration that CANNOT lose the look is not a re-authoring. The builders
// bottom out in three leaves — panel, disc, cutout — and those leaves record
// their own arguments on the way past, so what this writes out is not a
// transcription of the code, it IS the code's output. Replaying the rows
// through the same three functions rebuilds the identical scene by
// construction; `--check` proves it by re-capturing and comparing.
//
// Run it once per art change to the builders. After that the JSON is the
// truth and the builders are the origin story — the runtime prefers the sheet
// and falls back to them, the same seam `getModel(name, buildPlaceholder)`
// uses everywhere else in this project.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EERI = path.resolve(HERE, '..', '..');
const ROOT = path.resolve(EERI, '..');
const OUT = path.join(EERI, 'assets', 'dressing');
const CHECK = process.argv.includes('--check');
const SITES = [6, 7, 8, 9, 10, 11];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.css': 'text/css' };

const { chromium } = await import(path.join(process.env.NODE_PATH || '', 'playwright/index.mjs'))
  .catch(() => import('playwright'));

const srv = createServer(async (q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  try {
    const b = await readFile(f);
    r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    r.end(b);
  } catch { r.writeHead(404); r.end(); }
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;

const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await br.newPage({ viewport: { width: 640, height: 360 } });
pg.on('pageerror', (e) => console.log('  page error:', e.message));
await pg.goto(`${base}/eeri/index.html?skip`, { waitUntil: 'load' });
await pg.waitForFunction(() => window.__eeri?.THREE, null, { timeout: 60000 });

let changed = 0, same = 0;
await mkdir(OUT, { recursive: true });
console.log('');
for (const site of SITES) {
  const rows = await pg.evaluate(async (s) => {
    const D = await import('/eeri/js/world34-dressing.js?v=38');
    const THREE = window.__eeri.THREE;
    return D.captureSite(THREE, s);
  }, site);

  const file = path.join(OUT, `site-${site + 1}.json`);
  const body = JSON.stringify({ v: 1, site: site + 1, rows }, null, 1) + '\n';
  const before = existsSync(file) ? readFileSync(file, 'utf8') : null;

  if (before === body) { same++; console.log(`  site ${site + 1}: ${String(rows.length).padStart(3)} rows — unchanged`); continue; }
  if (CHECK) {
    changed++;
    console.log(`  site ${site + 1}: ${String(rows.length).padStart(3)} rows — DIFFERS from the sheet on disk`);
    continue;
  }
  await writeFile(file, body);
  changed++;
  console.log(`  site ${site + 1}: ${String(rows.length).padStart(3)} rows — written`);
}

await br.close(); srv.close();
console.log(`\n  ${same} unchanged, ${changed} ${CHECK ? 'differing' : 'written'}\n`);
// --check is for a human comparing intent, NOT a gate: once the sheets are
// hand-edited they are SUPPOSED to differ from the builders. That is the
// migration succeeding, and a gate that failed on it would forbid the editing
// this whole exercise exists to allow.
process.exit(0);
