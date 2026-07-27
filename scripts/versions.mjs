// Collect every project's version number into one file the arcade can read.
//
//   node scripts/versions.mjs [siteRoot]      -> writes <siteRoot>/hub/versions.json
//
// Toko Drop has kept a real version system for a long time: a VERSIONS.md log
// with a `## vN — date` entry per release, and a `?v=N` cache-bust token
// carried across its module graph by scripts/bump-version.sh. The two numbers
// are deliberately different — the token tracks every module-graph change, the
// version is the public release number.
//
// This extends that to the whole floor without touching the tooling that
// already works. It does not invent numbers or ask each project to declare
// one: it reads what is already there, in that order of preference.
//
//   1. <game>/VERSIONS.md   the first `## vN` heading — the public number
//   2. <game>/index.html    the `?v=N` module token — what a project has
//                           before anyone starts writing a log for it
//
// Run it at deploy time. A project that gains a VERSIONS.md later starts
// reporting its release number instead of its token, with no other change.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2] ?? path.join(HERE, '..'));

const { GAMES } = await import(pathToFileURL(path.join(ROOT, 'hub', 'games.js')).href);

function fromLog(dir) {
  const f = path.join(dir, 'VERSIONS.md');
  if (!existsSync(f)) return null;
  const m = readFileSync(f, 'utf8').match(/^##\s*v(\d+)/m);
  return m ? { v: Number(m[1]), from: 'VERSIONS.md' } : null;
}

function fromToken(dir) {
  const f = path.join(dir, 'index.html');
  if (!existsSync(f)) return null;
  const html = readFileSync(f, 'utf8');
  // the game's own entry module, not the shared shell one level up
  const tokens = [...html.matchAll(/src="(?!\.\.\/)[^"]*?\?v=(\d+)"/g)].map(m => Number(m[1]));
  if (!tokens.length) return null;
  return { v: Math.max(...tokens), from: 'cache token' };
}

const out = {};
const missing = [];
for (const g of GAMES) {
  const dir = path.join(ROOT, g.path);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) { missing.push(`${g.id} (not here)`); continue; }
  const found = fromLog(dir) ?? fromToken(dir);
  if (!found) { missing.push(`${g.id} (no log, no token)`); continue; }
  out[g.id] = found;
}

const dest = path.join(ROOT, 'hub', 'versions.json');
writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');

const shown = Object.entries(out).map(([id, r]) => `${id} v${r.v} (${r.from})`);
console.log(`${path.relative(process.cwd(), dest)}: ${shown.length} projects`);
for (const line of shown) console.log('  ' + line);
if (missing.length) console.log('  no version for: ' + missing.join(', '));
