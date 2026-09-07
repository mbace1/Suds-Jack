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

// DECIMAL VERSIONS (2026-08-14). A heading may be `## v15` or `## v15.2`:
// the integer is a milestone, the decimal an increment on it. Both are read
// here, and both come back as a PAIR:
//
//   { v: '15.2',  n: 15002 }
//         ^label        ^sort key
//
// Two numbers rather than one, because a single one cannot do both jobs.
// A string cannot be compared (`'15.10' > '15.9'` is false, lexically), and
// a float cannot be displayed (`15.10` and `15.1` are the same number, and
// `15.0` prints as `15`). The label is what a reader sees; the key is what
// the hub's "this moved" diff sorts on. minor is capped at 999.
function topOf(file) {
  if (!existsSync(file)) return null;
  const m = readFileSync(file, 'utf8').match(/^##\s*v(\d+)(?:\.(\d+))?/m);
  if (!m) return null;
  return ver(m[1], m[2]);
}

function ver(major, minor) {
  const M = Number(major), mn = minor === undefined ? null : Number(minor);
  if (!Number.isFinite(M)) return null;
  return {
    v: mn === null ? String(M) : `${M}.${minor}`,
    n: M * 1000 + Math.min(999, mn ?? 0),
  };
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
  return owner ? { id: owner.id, v: topOf(f) } : null;   // v is the {v,n} pair
}

function fromLog(dir) {
  const r = topOf(path.join(dir, 'VERSIONS.md'));
  return r ? { ...r, from: 'VERSIONS.md' } : null;
}

function fromToken(dir) {
  const f = path.join(dir, 'index.html');
  if (!existsSync(f)) return null;
  const html = readFileSync(f, 'utf8');
  // the game's own entry module, not the shared shell one level up
  const tokens = [...html.matchAll(/src="(?!\.\.\/)[^"]*?\?v=(\d+)"/g)].map(m => Number(m[1]));
  if (!tokens.length) return null;
  // a token is an integer by design (see the header): it tracks module-graph
  // churn, not releases, so it has no minor part to carry
  return { ...ver(Math.max(...tokens)), from: 'cache token' };
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
    ? { v: rootLog.v.v, n: rootLog.v.n, from: 'VERSIONS.md' } : null;
  const found = owned ?? fromLog(dir) ?? fromToken(dir);
  if (!found) { missing.push(`${g.id} (no log, no token)`); continue; }
  out[g.id] = found;
}

const dest = path.join(ROOT, 'hub', 'versions.json');

// --check reports instead of writing, and this is not a nicety. On the DEPLOYED
// tree a regeneration is destructive: gh-pages does not carry every project's
// log, so the run reads a token or nothing and quietly moves cabinets — eight
// of them on the last attempt, most of them BACKWARDS. Four separate deploys
// have now hand-edited around that and written "worth someone's attention" in
// the commit message. So a deploy runs --check, which says what disagrees and
// changes nothing, and only a tree that owns every log runs the writer.
if (process.argv.includes('--check')) {
  const was = existsSync(dest) ? JSON.parse(readFileSync(dest, 'utf8')) : {};
  const bad = [];
  for (const [id, r] of Object.entries(out)) {
    const w = was[id];
    if (!w) { bad.push(`${id}: absent from versions.json, tree says v${r.v}`); continue; }
    // A number differing is only news when the tree can SOURCE it. Where the
    // tree has no log, versions.json is the better authority — that is the
    // deployed case, and overwriting it is the bug this flag exists to stop.
    if (r.from === 'VERSIONS.md' && String(w.v) !== String(r.v)) {
      // WHICH WAY it disagrees is the whole diagnosis, and it decides the fix.
      //
      // The log AHEAD of versions.json means the log is right: a release
      // shipped and nobody moved the number. Safe to take.
      //
      // The log BEHIND means the opposite — the code shipped and its log did
      // not travel with it, so the log is a stale copy and taking it would
      // move the cabinet BACKWARDS. The arcade tags what moved by diffing
      // these numbers against the ones you last saw, so a number going
      // backwards is worse than one standing still. That is the direction a
      // plain regeneration took eight cabinets in, and why this flag exists.
      const dir = r.n > w.n ? 'log is AHEAD — take it' : 'log is BEHIND — it did not travel with the deploy, do NOT take it';
      bad.push(`${id}: versions.json v${w.v}, its log says v${r.v}  (${dir})`);
    }
  }
  for (const [id, w] of Object.entries(was)) {
    if (!out[id]) bad.push(`${id}: in versions.json (v${w.v}) but the tree cannot source it`);
    else if (w.from === 'VERSIONS.md' && out[id].from !== 'VERSIONS.md') {
      bad.push(`${id}: versions.json claims a log this tree does not have`);
    }
  }
  // --repair takes the safe half: a log AHEAD of the file, and a cabinet the
  // file never knew about. It never moves a number backwards and never
  // invents a source, so the half that needs a person is left for a person —
  // which is the difference between this and the regeneration that has been
  // reverted four times.
  if (bad.length && process.argv.includes('--repair')) {
    const fixed = [];
    for (const [id, r] of Object.entries(out)) {
      const w = was[id];
      if (!w) { was[id] = r; fixed.push(`${id}: added at v${r.v}`); continue; }
      if (r.from === 'VERSIONS.md' && r.n > w.n) {
        fixed.push(`${id}: v${w.v} -> v${r.v}`);
        was[id] = r;
      }
    }
    if (fixed.length) {
      writeFileSync(dest, JSON.stringify(was, null, 2) + '\n');
      console.log(`${path.relative(process.cwd(), dest)}: repaired ${fixed.length}`);
      for (const f of fixed) console.log('  ' + f);
    }
    const left = bad.filter(b => /BEHIND|does not have/.test(b));
    if (left.length) {
      console.log('  left alone, these need a person:');
      for (const l of left) console.log('    ' + l);
    }
    process.exit(0);
  }

  if (bad.length) {
    console.error(`${path.relative(process.cwd(), dest)} disagrees with the tree:`);
    for (const b of bad) console.error('  ' + b);
    process.exit(1);
  }
  console.log(`${path.relative(process.cwd(), dest)}: agrees with the tree (${Object.keys(out).length} projects)`);
  process.exit(0);
}

writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');

const shown = Object.entries(out).map(([id, r]) => `${id} v${r.v} (${r.from})`);
console.log(`${path.relative(process.cwd(), dest)}: ${shown.length} projects`);
for (const line of shown) console.log('  ' + line);
if (missing.length) console.log('  no version for: ' + missing.join(', '));
