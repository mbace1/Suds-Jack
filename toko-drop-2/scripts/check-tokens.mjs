#!/usr/bin/env node
// check-tokens.mjs — every module URL carries a cache token, and the tokens agree.
//
// The Pages CDN can cache a 404 for a path that was requested before it was
// deployed, and a phone keeps a stale module for as long as its URL holds
// still. So every local module, stylesheet and manifest URL carries `?v=`
// from its first release, in one of two families:
//
//   ?v=N     every game module. N is the game version: the top `## vN` of
//            VERSIONS.md and the HUD label `2.0 · vN`. bump-version.sh moves
//            all three together; this script fails if they disagree.
//   ?v=rNNN  vendored three.js, pinned to its REVISION. Those bytes change
//            only on a three upgrade, so their URL does too — a game bump
//            does not make every phone re-download 3.8 MB of three.
//
// Also fails on an importmap entry that maps a PREFIX ("x/": "./dir/") to a
// local folder: a module resolved through it arrives with no token at all.
// And on a bare specifier the importmap does not map, which only fails at
// runtime, on the device, when that module happens to load. And on a dynamic
// import() that BUILDS its URL ('./x/' + id + '.js'): no text search can see
// that URL, so it would load untokened. A template literal is fine as long as
// its token is literal. Module files and inline <script type="module"> bodies
// are read the same way.
//
// Usage: node scripts/check-tokens.mjs        (exit 1 on any problem)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// v156: and itch/ (the itch kit's single-file .html is a bundle: its minified code reads as bare imports) and tools/
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', 'scripts', 'test', 'spec', 'itch', 'tools']);
const TOKENED_EXT = new Set(['.js', '.mjs', '.css', '.webmanifest', '.json']);

const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(join(dir, e.name), out); }
    else out.push(join(dir, e.name));
  }
  return out;
}

// --- the numbers that must agree --------------------------------------------
const versionsMd = readFileSync(join(ROOT, 'VERSIONS.md'), 'utf8');
const top = versionsMd.match(/^## v(\d+)\b/m);
if (!top) { console.error('✗ VERSIONS.md has no ## vN entry'); process.exit(1); }
const N = top[1];

const coreFile = join(ROOT, 'vendor/three/three.core.js');
const REVISION = existsSync(coreFile)
  ? (readFileSync(coreFile, 'utf8').match(/const REVISION = '(\d+)'/) || [])[1]
  : null;

// --- helpers ----------------------------------------------------------------
const isLocal = (u) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u);
const pathOf = (u) => u.split(/[?#]/)[0];

// Checks one local URL as written in `file`, resolved against `baseDir`.
// `templated`: a template literal with ${…} in its path, e.g. a per-species
// module. Its file cannot be checked, but its token must still be literal,
// because bump-version.sh moves tokens by text.
function checkUrl(file, url, baseDir, what, templated = false) {
  if (!isLocal(url)) return;
  if (url.startsWith('/')) return fail(file, `${what} '${url}' is root-absolute; Pages serves this site under /toko-drop/, so it would 404`);
  const path = pathOf(url);
  if (!TOKENED_EXT.has(extname(path))) return;
  const target = relative(ROOT, join(baseDir, path));
  if (!templated && !existsSync(join(ROOT, target))) fail(file, `${what} '${url}' points at a file that does not exist`);
  const tok = (url.match(/[?&]v=([^&#]+)/) || [])[1];
  if (!tok) return fail(file, `${what} '${url}' has no ?v= token`);
  if (tok.includes('${')) return fail(file, `${what} '${url}' builds its token; write it as a literal ?v=${N} so bump-version.sh can move it`);
  if (target.startsWith('vendor/three/')) {
    if (!REVISION) fail(file, `'${url}' is vendored three but vendor/three/three.core.js has no REVISION`);
    // r186, or r186.1, r186.2… when a vendor patch changes without an upgrade
    else if (!new RegExp(`^r${REVISION}(\\.\\d+)?$`).test(tok)) fail(file, `'${url}' should be ?v=r${REVISION} (the vendored three REVISION)`);
  } else if (target.startsWith('vendor/')) {
    // another vendored library: any token, as long as there is one
  } else if (tok !== N) {
    fail(file, `'${url}' is ?v=${tok} but VERSIONS.md is at v${N}`);
  }
}

// Comment lines only — not trailing `//` (it could be inside a string, e.g. a URL).
const stripCommentLines = (src) => src
  .replace(/^\s*\/\*[\s\S]*?\*\//gm, '')
  .replace(/^\s*\/\/.*$/gm, '');

const SPEC_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"`])([^'"`\n]+)\1/g;
// import( whose argument is not one whole string literal: './x/' + id + '.js'
// would load untokened, and no text search can see the URL it builds.
const BUILT_IMPORT_RE = /\bimport\s*\(\s*(?!(['"`])[^'"`\n]*\1\s*[,)])/g;
const NEW_URL_RE = /\bnew\s+URL\s*\(\s*(['"`])([^'"`\n]+)\1\s*,\s*import\.meta\.url/g;

const importmapKeys = new Set();
const bareUsed = []; // [file, specifier]

// Every module specifier in one piece of game JS (a file, or an inline
// <script type="module"> body), resolved against `baseDir`.
function scanModule(rel, src, baseDir) {
  for (const m of src.matchAll(SPEC_RE)) {
    const spec = m[2], templated = m[1] === '`' && spec.includes('${');
    if (spec.startsWith('.') || spec.startsWith('/')) checkUrl(rel, spec, baseDir, 'import', templated);
    else bareUsed.push([rel, spec]);
  }
  for (const m of src.matchAll(NEW_URL_RE)) checkUrl(rel, m[2], baseDir, 'new URL', m[1] === '`' && m[2].includes('${'));
  if (BUILT_IMPORT_RE.test(src)) fail(rel, 'a dynamic import() builds its specifier; write the whole URL, ?v= token included, as one literal');
  BUILT_IMPORT_RE.lastIndex = 0;
}

// --- html: importmaps, src/href ---------------------------------------------
const files = walk(ROOT);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
for (const f of htmlFiles) {
  const rel = relative(ROOT, f);
  const src = readFileSync(f, 'utf8');
  const base = dirname(f);

  for (const m of src.matchAll(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let map;
    try { map = JSON.parse(m[1]); } catch (e) { fail(rel, `importmap is not valid JSON (${e.message})`); continue; }
    const urlOfPath = new Map(); // one file reached by two URLs is two module instances
    for (const [key, val] of Object.entries(map.imports || {})) {
      importmapKeys.add(key);
      if (key.endsWith('/') && isLocal(val)) {
        fail(rel, `importmap prefix '${key}' → '${val}' resolves modules with no token; map each module explicitly`);
        continue;
      }
      checkUrl(rel, val, base, `importmap '${key}' →`);
      const p = pathOf(val).replace(/^\.\//, '');
      if (urlOfPath.has(p) && urlOfPath.get(p) !== val) {
        fail(rel, `importmap reaches ${p} as both '${urlOfPath.get(p)}' and '${val}' — that loads it twice`);
      }
      urlOfPath.set(p, val);
    }
  }
  for (const m of src.matchAll(/\b(?:src|href)\s*=\s*(["'])([^"']+)\1/gi)) checkUrl(rel, m[2], base, 'attribute');
  // inline module scripts import like any module file does (1.x's lab did)
  for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\btype\s*=\s*["']module["']/i.test(m[1]) && !/\bsrc\s*=/i.test(m[1])) scanModule(`${rel} (inline module)`, stripCommentLines(m[2]), base);
  }

  const label = src.match(/2\.0 · v(\d+)/);
  if (label && label[1] !== N) fail(rel, `HUD label says 2.0 · v${label[1]} but VERSIONS.md is at v${N}`);
}

// --- js: static and dynamic imports -------------------------------------------
for (const f of files.filter((p) => /\.m?js$/.test(p))) {
  const rel = relative(ROOT, f);
  const raw = readFileSync(f, 'utf8');
  if (!rel.startsWith('vendor/')) { scanModule(rel, stripCommentLines(raw), dirname(f)); continue; }
  // Vendored code: only its own top-level import/export lines are ours to check.
  const head = raw.split('\n').filter((l) => /^\s*(?:import|export)\b/.test(l)).join('\n');
  for (const m of head.matchAll(SPEC_RE)) {
    const spec = m[2];
    if (spec.startsWith('.') || spec.startsWith('/')) checkUrl(rel, spec, dirname(f), 'import');
    else if (spec.startsWith('three')) bareUsed.push([rel, spec]);
  }
}

// --- bare specifiers must be mapped -------------------------------------------
if (htmlFiles.length) {
  for (const [rel, spec] of bareUsed) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(spec)) continue; // a full URL
    const mapped = importmapKeys.has(spec) || [...importmapKeys].some((k) => k.endsWith('/') && spec.startsWith(k));
    if (!mapped) fail(rel, `bare import '${spec}' is not in any importmap`);
  }
}

if (problems.length) {
  console.error(problems.map((p) => '  ✗ ' + p).join('\n'));
  console.error(`\n✗ cache-token check failed (${problems.length} problem${problems.length > 1 ? 's' : ''})`);
  process.exit(1);
}
console.log(`✔ cache tokens OK (game ?v=${N}${REVISION ? `, three ?v=r${REVISION}` : ''})`);
