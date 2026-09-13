// ONE TOKEN PER MODULE, MOVED WHEN AND ONLY WHEN ITS BYTES MOVE.
//
// This gate exists because v2.33 shipped with it broken. live-network.js was
// rewritten and its token went 7 → 8, and core-v212.js — which is the file that
// IMPORTS it — changed too and kept ?v=36. A returning player holding a cached
// core@36 would have gone on importing live-network@7 for as long as the cache
// held: the fix was on the server, the token said nothing had changed, and the
// board would have kept its badge pile-up. Nothing caught it. version-sync.mjs
// checks the release NUMBER against VERSIONS.md, which is a different question.
//
// The check needs a second tree to compare against, and the honest one is the
// DEPLOYED tree — a token means "this is not the file you already have", so the
// file you already have is what it has to be measured against. CI fetches
// gh-pages for this; with no gh-pages to read, the gate FAILS rather than
// skipping, because a cache gate that goes quiet when it cannot see is worse
// than none.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, '..');
const ROOT = path.resolve(GAME, '..');
const REF = process.env.TOKENS_REF || 'origin/gh-pages';
const git = args => execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// Every ?v= in this game's own entry and modules, as module -> token. A module
// carrying two different tokens is the bug the house rule is named for: the
// browser instantiates it twice and the module's state splits in half.
function tokensOf(read, files) {
  const seen = new Map();
  for (const f of files) {
    const text = read(f);
    if (text === null) continue;
    for (const m of text.matchAll(/(?:^|[\/'"(])([a-z0-9._-]+\.js)\?v=(\d+)/g)) {
      const [, mod, tok] = m;
      if (!seen.has(mod)) seen.set(mod, new Set());
      seen.get(mod).add(tok);
    }
  }
  return seen;
}

const here = f => { try { return readFileSync(path.join(GAME, f), 'utf8'); } catch { return null; } };

// WALK THE IMPORT GRAPH from index.html rather than globbing js/*.js. The
// folder still carries main.js, main-v210.js and main-v211.js — superseded
// entry points nothing loads — and their stale tokens are not a cache fault,
// they are dead files. Matching a pattern instead of following the imports is
// a hand-kept list with extra steps; the same reasoning scripts/sw-shell.mjs
// was rewritten for.
const reachable = (() => {
  const seen = new Set(), queue = ['index.html'];
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f) || f === undefined) continue;
    seen.add(f);
    const text = here(f);
    if (text === null) continue;
    for (const m of text.matchAll(/['"(]((?:\.{1,2}\/)?(?:js\/)?[a-z0-9._-]+\.js)(?:\?v=\d+)?['"]/g)) {
      const raw = m[1].replace(/^\.\//, '');
      if (raw.startsWith('../')) continue;                  // the site's, not this game's
      const rel = raw.startsWith('js/') ? raw : (f.startsWith('js/') ? `js/${raw}` : raw);
      if (!seen.has(rel)) queue.push(rel);
    }
  }
  return [...seen];
})();
const jsFiles = reachable.filter(f => f.startsWith('js/'));
const scanned = reachable;

// A module may only carry one token across the whole tree.
for (const [mod, toks] of tokensOf(here, scanned)) {
  assert.equal(toks.size, 1, `${mod} is asked for under ${toks.size} different tokens (${[...toks].join(', ')}) — the browser will load it twice and split its state`);
}

let deployed = null;
try {
  git(`rev-parse --verify ${REF}`);
  deployed = f => { try { return git(`show ${REF}:toko-move/${f}`); } catch { return null; } };
} catch { /* no ref */ }
assert.ok(deployed, `cannot read ${REF} — fetch it before running this gate (git fetch origin gh-pages --depth=1). A cache gate that skips when it cannot see the deployed tree is decoration.`);

const mine = tokensOf(here, scanned), theirs = tokensOf(deployed, scanned);
const one = m => m && [...m][0];
const moved = [], stale = [];
for (const [mod, toks] of mine) {
  // Only this game's own modules: ../hub/shell.js is the site's and is
  // renumbered by the floor, not by this branch.
  if (!jsFiles.includes(`js/${mod}`)) continue;
  const before = deployed(`js/${mod}`), after = here(`js/${mod}`);
  if (before === null) continue;                    // new module, nothing to compare
  const was = one(theirs.get(mod)), now = one(toks);
  if (!was) continue;
  const changed = before !== after;
  if (changed && was === now) stale.push(`${mod} (bytes changed, still ?v=${now})`);
  if (!changed && was !== now) moved.push(`${mod} (bytes identical, ?v=${was} → ?v=${now})`);
}
assert.deepEqual(stale, [], `a module changed and its token did not — a cached copy will never be replaced:\n  ${stale.join('\n  ')}`);
// The reverse case is NOT a failure, and finding that out is worth writing
// down: "bytes identical, token moved" is what a CORRECTION looks like. v2.33
// shipped core-v212.js's new bytes under its old token, so the deployed copy
// already matches this tree and the 36 → 37 bump that fixes it reads, from
// bytes alone, exactly like a gratuitous one. Nothing in the two trees can tell
// them apart — only whether the old bytes were ever served under that token,
// which is not written down anywhere. So it is reported and not enforced; the
// cost of a wrong bump is one refetch, the cost of a missed one is a player
// stuck on the old build until their cache turns over.
if (moved.length) console.log(`note: token moved with no byte change (a correction, or a wasted refetch):\n  ${moved.join('\n  ')}`);

console.log(`tokens: ${mine.size} modules referenced, all single-tokened, all agreeing with ${REF}`);
