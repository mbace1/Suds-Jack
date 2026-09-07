// Put the arcade onto the deployed site.
//
//   node scripts/deploy-hub.mjs <siteRoot> [--dry]
//
// The site (gh-pages) is not a copy of this branch and never has been. It is a
// curated tree that carries games `main` does not, its own catalogue with its
// own `inRepo` flags, marquees for those games, and a counter that other work
// edits from its own direction. So this does not sync directories — it moves
// the files this branch owns, leaves the ones it does not, and then fixes up
// everything that has to agree with them.
//
// It exists because doing that by hand went wrong three times in one session,
// each in the same shape: a number in one file that did not match a number in
// another.
//
//   - sw.js precached feedback.js at ?v=7 while the page asked for ?v=9, which
//     is an arcade that loads online and is blank on a plane.
//   - the site's index.html was two features behind main's and quietly lacked
//     the ids the language switch writes into, so the headings never changed
//     language on the live site.
//   - tokens were picked by hand per deploy, so a file could change without
//     its number moving and nobody would see it until a stale cache did.
//
// The rule that removes all three: ONE TOKEN PER MODULE, bumped when and only
// when the file's bytes change, and written into every reference by this
// script rather than by a person. Nothing is hand-numbered.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { shellOf, withShell } from './sw-shell.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const site = process.argv[2];
const dry = process.argv.includes('--dry');

if (!site || !fs.existsSync(path.join(site, 'index.html'))) {
  console.error('usage: node scripts/deploy-hub.mjs <siteRoot> [--dry]');
  process.exit(2);
}

// ── what this branch owns ──────────────────────────────────────────
// Everything the arcade is made of EXCEPT the two files the site is
// authoritative for: games.js carries the site's own catalogue (extra games,
// its own inRepo flags) and art.js carries their marquees. Overwriting either
// deletes a game from the floor, which is how you find out.
// `versions.mjs` is in here because it ships to the site and is RUN against
// the site, so it drifts there like anything else: the site's copy had learned
// to number the brand and this branch's had not, and running the older one
// against the newer tree quietly deleted `toko` from versions.json. A tool
// that is deployed is a file, and every deployed file needs the same guard.
const OWNED = [
  'hub/hub.js', 'hub/hub.css', 'hub/i18n.js', 'hub/topics.js',
  'hub/feedback.js', 'hub/pad.js', 'hub/padkeys.js', 'hub/shell.js',
  'hub/arcade.js',
  'scripts/versions.mjs',
  // The sting is the hub's now — hub.js imports it on Play — so it ships with
  // the hub. NOT the counter's files: chat.js and dialogue*.js are actively
  // rewritten from another direction and belong to whoever is doing that. The
  // guard below would catch it either way; keeping them out says so up front.
  'toko/js/sting.js', 'toko/js/board.js', 'toko/index.html',
];
const THEIRS = ['hub/games.js', 'hub/art.js'];

// Every step reads what the steps before it wrote, so writes go to an overlay
// and land on disk once at the end. Without it a --dry run reads the tree as
// it is while a real run reads the tree as it is becoming, and the two disagree
// exactly where it matters — a dry run that says the right thing about the
// wrong tree is worse than no dry run.
const pending = new Map();
const read = (root, f) => {
  const key = `${root}\0${f}`;
  if (pending.has(key)) return pending.get(key);
  try { return fs.readFileSync(path.join(root, f), 'utf8'); } catch { return null; }
};
const write = (root, f, s) => { pending.set(`${root}\0${f}`, s); };

// What actually lands, which is not what was staged: index.html is rebuilt
// from this branch's copy in step 2 and renumbered back up in step 3, so on a
// re-run it is written twice and ends up exactly as it started. A report that
// counts stages says "wrote index.html" on a deploy that changed nothing, and
// a deploy log you cannot trust is one nobody reads.
const landing = () => [...pending]
  .map(([key, s]) => {
    const [root, f] = key.split('\0');
    let was = null;
    try { was = fs.readFileSync(path.join(root, f), 'utf8'); } catch {}
    return was === s ? null : f;
  })
  .filter(Boolean)
  .sort();

const flush = () => {
  for (const [key, s] of pending) {
    const [root, f] = key.split('\0');
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), s);
  }
};

const say = [];
const note = s => { say.push(s); };

// ── 0. where the site is now ───────────────────────────────────────
// The token map is read BEFORE anything is written, because step 2 rebuilds
// index.html from this branch's copy and this branch's copy carries this
// branch's numbers — which are behind the site's, since the site is what has
// been deployed. Scanning afterwards reads our own lower numbers back and
// walks every token backwards into a cache that already holds that URL.
//
// A token belongs to a PATH, never to a filename. Nine games ship a `main.js`
// at nine different numbers, and `gameoflife/` has an `i18n.js` and a
// `feedback.js` of its own that have nothing to do with the hub's. So every
// reference is resolved against the file it was found in, and only the ones
// that land on `hub/<something>` are ours to touch. The first cut of this
// keyed on the bare filename and would have dragged `gameoflife/js/main.js`
// from v42 to v169 — past its own worker's precache list, which is an offline
// app that boots to nothing.
const walk = (rel = '') => {
  const out = [];
  for (const d of fs.readdirSync(path.join(site, rel), { withFileTypes: true })) {
    if (d.name.startsWith('.') || d.name === 'node_modules') continue;
    const p = rel ? `${rel}/${d.name}` : d.name;
    if (d.isDirectory()) out.push(...walk(p));
    else if (/\.(?:html|js|css)$/.test(d.name)) out.push(p);
  }
  return out;
};
// sw.js is left out on purpose: step 4 rebuilds its list from scratch and is
// the only thing allowed to write it, so it can tell "the shell moved" from
// "somebody already renumbered me".
const files = walk().filter(f => f !== 'sw.js');

// group 1 is the path in front of the name, so the reference can be resolved
const REF = /(?<=[/'"(=])((?:\.{0,2}\/)*(?:[\w.-]+\/)*)([\w.-]+\.(?:js|css))\?v=(\d+)/g;
const hubModule = (inFile, dir, name) => {
  const at = path.posix.normalize(path.posix.join(path.posix.dirname(inFile), dir, name));
  return at.startsWith('hub/') && !at.slice(4).includes('/') ? at : null;
};

const seen = new Map();
for (const f of [...files, 'sw.js']) {
  for (const [, dir, name, v] of (read(site, f) ?? '').matchAll(REF)) {
    const key = hubModule(f, dir, name);
    if (key) seen.set(key, Math.max(seen.get(key) ?? 0, +v));
  }
}
// AnotherHUB/ resolves its links against the site root via <base>, so its
// references look one level deep to a path resolver and never reach the map.
// It is regenerated from the root page in step 5, so that is harmless — but
// only as long as step 5 stays.

// ── 1. the files ───────────────────────────────────────────────────
// A deploy is allowed to move this branch forward onto the site. It is not
// allowed to move the site backwards, and the difference is not visible in a
// byte comparison — "these differ" says nothing about which way.
//
// It matters because the site is edited from more than one direction: the
// first real run of this found `topics.js` and `shell.js` on gh-pages carrying
// work this branch has never held (two more projects in the taxonomy, a
// box-sizing fix for a shell button that a host page's own button rule was
// squashing into an ellipse). Copying over them would have deleted all of it
// and reported success.
//
// So: the site's copy is safe to replace only if this branch has HELD those
// exact bytes at some point — that makes it an older version of ours. Content
// we have never had is somebody else's, and the deploy leaves it alone and
// says so. Reconciling is a merge, and a merge is not a deploy's job.
// Every comparison here is made with the tokens taken out. A deployed file has
// been renumbered by step 3, so its exact bytes never appear in this branch's
// history even when the code is character-for-character ours — the first cut
// compared raw blobs and refused to deploy anything at all, which is the guard
// being useless in the safe direction rather than the dangerous one.
// ...and with the tail newline normalised: a tool on the site side wrote a
// file without one, and "every byte identical except the last is missing"
// spent a run being reported as foreign work.
const bare = s => s.replace(/\?v=\d+/g, '').replace(/\s*$/, '\n');

const held = (f, text) => {
  const want = bare(text);
  try {
    const hist = execFileSync('git', ['log', '--format=%H', '--', f], { cwd: REPO, encoding: 'utf8' })
      .split('\n').filter(Boolean);
    for (const c of hist) {
      let was;
      try {
        was = execFileSync('git', ['show', `${c}:${f}`], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
      } catch { continue; }              // deleted in that commit
      if (bare(was) === want) return true;
    }
  } catch { /* not a checkout, or the path never existed — fall through */ }
  return false;
};

const changed = new Set();
const stale = [];
for (const f of OWNED) {
  const mine = read(REPO, f);
  if (mine == null) { note(`! ${f} is not in this branch`); continue; }
  const theirs = read(site, f);
  if (theirs != null && bare(theirs) === bare(mine)) continue;   // same code, older numbers
  if (theirs != null && !held(f, theirs)) {
    stale.push(f);
    note(`! ${f} — the site carries work this branch has never held; NOT overwritten`);
    continue;
  }
  write(site, f, mine);
  changed.add(f);
}

// The two it does not own still have to be checked, because a cabinet on the
// site with no draw function is a blank marquee and this is the only moment
// anybody would notice.
{
  const cat = read(site, 'hub/games.js') ?? '';
  const art = read(site, 'hub/art.js') ?? '';
  const arts = [...cat.matchAll(/art: '([a-z0-9]+)'/g)].map(m => m[1]);
  // `(g)` as well as `(g, a)` — a marquee that does not tint from an accent
  // takes one argument, and hard-coding two reported the brand mark as a
  // missing drawing on the one deploy that added it
  const drawn = new Set([...art.matchAll(/^ {2}([a-z0-9]+)\(g(?:, a)?\)/gm)].map(m => m[1]));
  const blank = arts.filter(a => !drawn.has(a));
  if (blank.length) note(`! the site lists cabinets with no marquee: ${blank}`);
}

// A module this branch imports but never listed as OWNED would simply not be
// copied, and the deploy would still report success — the page would ask the
// site for a file that is not there and the arcade would not boot at all. This
// is the one failure the rest of the script cannot catch, because everything
// downstream reasons about references rather than about files.
{
  const graph = [read(REPO, 'index.html'), read(REPO, 'hub/hub.js'), read(REPO, 'hub/shell.js')]
    .join('\n');
  const want = new Set([...graph.matchAll(/(?:\.\/|hub\/)([\w.-]+\.(?:js|css))\?v=\d+/g)]
    .map(m => `hub/${m[1]}`));
  const missing = [...want].filter(f => read(site, f) == null);
  if (missing.length) {
    note(`! the page asks for ${missing.join(', ')} and the site does not have it`);
    note('  add it to OWNED in this script — nothing else will copy it');
  }
}

// ── 2. the page ────────────────────────────────────────────────────
// Rebuilt from this branch's, with any <script> block the site has and this
// branch does not put back — that is how the counter mount survives a deploy
// without this script having to know what a counter is.
{
  const mine = read(REPO, 'index.html');
  const theirs = read(site, 'index.html') ?? '';
  // A block is the site's own if this branch's page does not load the modules
  // it loads. Comparing the block's TEXT does not work — the first cut asked
  // whether main's page contained the block's last line, which is `</script>`,
  // so every block looked like one we already had and the counter mount was
  // dropped on every deploy.
  const specs = b => [...b.matchAll(/from\s*'([^']+)'|import\(\s*'([^']+)'/g)]
    .map(m => (m[1] ?? m[2]).replace(/\?v=\d+/, ''));
  // `<!--[^]*?-->` is not "a comment": when the tag after it does not match,
  // the engine backtracks and extends the body past that `-->` to a later one,
  // eating every element in between. It did — it swallowed the whole rack and
  // footer into one "comment" and pasted them back above themselves, giving
  // the page two racks and two copies of hub.js. Each character is guarded
  // against the terminator instead, so a comment cannot cross the end of
  // itself and there is nothing to backtrack into.
  const COMMENT = String.raw`(?:<!--(?:(?!-->)[\s\S])*-->\n {2})?`;
  const BODY = String.raw`(?:(?!<\/script>)[\s\S])*`;
  // the blank line after the block is part of the block: leave it out and every
  // deploy quietly closes the gap between it and the next tag, forever
  const BLOCK = new RegExp(` {2}${COMMENT}<script type="module">${BODY}<\\/script>\n\n?`, 'g');
  const blocks = [...theirs.matchAll(BLOCK)]
    .map(m => m[0])
    .filter(b => {
      const s = specs(b);
      return s.length && !s.some(one => mine.includes(one));
    });
  let out = mine;
  if (blocks.length) {
    // after hub.js, always: hub.js assigns window.__hub wholesale, so anything
    // hanging a handle on before it is thrown away
    out = out.replace(/( {2}<script type="module" src="hub\/hub\.js[^>]*><\/script>\n)/,
      (_, tag) => tag + blocks.join(''));
    note(`  kept ${blocks.length} site-only script block(s)`);
  }
  write(site, 'index.html', out);
}

// ── 3. the numbers ─────────────────────────────────────────────────
// One token per module: bump the ones whose bytes moved, then write every
// reference — in the page, in the hub's own modules, and in each game's shell
// tag — from that one map. A number nobody types by hand is a number that
// cannot disagree with itself.
const bump = new Set([...changed].filter(f => f.startsWith('hub/')));

// A file this branch does not own can still have changed — `art.js` and
// `games.js` are edited ON the site, because that is where the cabinets this
// branch does not carry live. Nothing above would notice, so git is asked:
// anything dirty in the site's working tree has moved since the last deploy
// and needs a new number exactly like ours do. Without this a redrawn marquee
// ships to a browser that already holds the old one and never appears.
try {
  const out = execFileSync('git', ['status', '--porcelain', '--', 'hub'],
    { cwd: site, encoding: 'utf8' });
  for (const line of out.split('\n')) {
    const f = line.slice(3).trim();
    if (f && /^hub\/[\w.-]+\.(?:js|css)$/.test(f)) bump.add(f);
  }
} catch { note('! the site is not a git checkout — site-side edits cannot be detected'); }

// A BUMP HAS TO CLIMB. hub.js imports art.js, so moving art.js alone changes
// nothing for anyone: a browser holding hub.js at the old number keeps that
// copy, and that copy asks for the old art.js by name. The new marquee would
// sit on the server and never be fetched. So every module that imports a
// bumped module is bumped too, to a fixpoint — the page itself carries no
// token (it is network-first) which is where the climb stops.
const importsOf = f => [...(read(site, f) ?? '').matchAll(/from '\.\/([\w.-]+\.js)\?v=\d+'/g)]
  .map(m => `hub/${m[1]}`);
const hubFiles = files.filter(f => /^hub\/[\w.-]+\.js$/.test(f));
for (let moved = true; moved;) {
  moved = false;
  for (const f of hubFiles) {
    if (bump.has(f)) continue;
    if (importsOf(f).some(d => bump.has(d))) { bump.add(f); moved = true; }
  }
}

for (const f of bump) seen.set(f, (seen.get(f) ?? 0) + 1);
changed.clear();
for (const f of bump) changed.add(f);

for (const f of files) {
  const src = read(site, f);
  const out = src.replace(REF, (whole, dir, name) => {
    const key = hubModule(f, dir, name);
    return key && seen.has(key) ? `${dir}${name}?v=${seen.get(key)}` : whole;
  });
  if (out !== src) write(site, f, out);
}
note(`  ${changed.size} module(s) bumped`);
for (const f of [...changed].sort()) note(`    ${f} -> v${seen.get(f)}`);

// ── 4. the offline shell ───────────────────────────────────────────
// Derived from the page and hub.js rather than kept by hand, because a
// precache list IS the module graph and a hand-kept copy of a graph drifts.
//
// The worker itself is rebuilt from this branch's copy, but its VERSION is
// carried forward from the site's — the number is a statement about what is in
// people's browsers, not about what is in this branch, and resetting it to
// whatever `main` happens to say would walk it backwards.
{
  const mine = read(REPO, 'sw.js');
  const theirs = read(site, 'sw.js') ?? '';
  if (mine) {
    // walked over the OVERLAY, so it sees the numbers step 3 just wrote
    const list = shellOf(site, f => read(site, f));
    let out = withShell(mine, list);
    const was = +(theirs.match(/const VERSION = 'v(\d+)';/)?.[1] ?? 0);
    // a new shell needs a new cache name or the old one answers first
    const now = out.replace(/const VERSION = 'v\d+';/, `const VERSION = 'v${was}';`) === theirs
      ? was : was + 1;
    out = out.replace(/const VERSION = 'v\d+';/, `const VERSION = 'v${now}';`);
    write(site, 'sw.js', out);
    if (out !== theirs) note(`  sw.js v${now}, precaching ${list.length} modules`);
  }
}

// ── 5. the short URL ───────────────────────────────────────────────
// Byte-identical to the root page but for the <base> tag. Regenerated rather
// than edited, because two copies of a page drift and this one is invisible
// until somebody uses the short link.
{
  const root = read(site, 'index.html');
  const base = `  <!-- the short URL: /Suds-Jack/AnotherHUB. Same page, one level down, so
       everything it links to is resolved against the site root instead. -->
  <base href="../" />\n`;
  const out = root.replace(/(<head>\n)/, (_, h) => h + base);
  write(site, 'AnotherHUB/index.html', out);
}

const lands = landing();
if (!dry) flush();

for (const f of lands) note(`  ${f}`);
console.log(say.length ? say.join('\n') : '  the site already matches this branch');
if (lands.length) console.log(`\n${lands.length} file(s)${dry ? ' would change' : ' changed'}.`);
if (stale.length) {
  console.log(
    `\nSTOP: ${stale.length} file(s) above were left as the site has them. That work is` +
    `\nnot in this branch, so deploying would delete it. Bring it back first:` +
    stale.map(f => `\n  cp ${path.join(site, f)} ${f}`).join('') +
    `\nread the diff before you commit it — this only proves the bytes differ,` +
    `\nnot that theirs is the version you want.`);
}
console.log('\nnext: node scripts/versions.mjs ' + site);
