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

function topOf(file) {
  if (!existsSync(file)) return null;
  const m = readFileSync(file, 'utf8').match(/^##\s*v(\d+)/m);
  return m ? Number(m[1]) : null;
}

// Toko Drop's log lives at the site root rather than inside its folder — it
// was there before there was a floor to be one of. Rather than move a file
// another release process writes to, read the root log's own H1 and give it to
// the project it names.
function rootLogOwner() {
  const f = path.join(ROOT, 'VERSIONS.md');
  if (!existsSync(f)) return null;
  const h1 = readFileSync(f, 'utf8').match(/^#\s*(.+?)\s*(?:—|-|$)/m);
  if (!h1) return null;
  const norm = t => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const owner = GAMES.find(g => norm(g.title) === norm(h1[1]));
  return owner ? { id: owner.id, v: topOf(f) } : null;
}

function fromLog(dir) {
  const v = topOf(path.join(dir, 'VERSIONS.md'));
  return v ? { v, from: 'VERSIONS.md' } : null;
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

// Not every project on the floor is a cabinet. The brand — the mark, the
// sting, the signature and the counter at the top of the hub — ships like one
// and breaks like one, so it gets a number the same way. It is named here
// rather than found by scanning, because "a directory with a VERSIONS.md in
// it" would sweep up anything anybody ever left lying around.
const EXTRA = [{ id: 'toko', path: 'toko/' }];

const rootLog = rootLogOwner();
const out = {};
const missing = [];
for (const g of [...GAMES, ...EXTRA]) {
  const dir = path.join(ROOT, g.path);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) { missing.push(`${g.id} (not here)`); continue; }
  const owned = rootLog && rootLog.id === g.id && rootLog.v
    ? { v: rootLog.v, from: 'VERSIONS.md' } : null;
  const found = owned ?? fromLog(dir) ?? fromToken(dir);
  if (!found) { missing.push(`${g.id} (no log, no token)`); continue; }
  out[g.id] = found;
}

const dest = path.join(ROOT, 'hub', 'versions.json');
writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');

const shown = Object.entries(out).map(([id, r]) => `${id} v${r.v} (${r.from})`);
console.log(`${path.relative(process.cwd(), dest)}: ${shown.length} projects`);
for (const line of shown) console.log('  ' + line);
if (missing.length) console.log('  no version for: ' + missing.join(', '));
