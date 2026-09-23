// Put ONE game onto the deployed site.
//
//   node scripts/deploy-game.mjs <game-id> <siteRoot> [--dry]
//
// deploy-hub.mjs moves the arcade SHELL and ships no game folder at all, so
// every game release until now was a hand copy — and Flowsnow's five hand
// copies each paid for a different trap, every one of them the same shape as
// the three deploy-hub.mjs was written to remove: a number or a byte in one
// file that disagreed with another.
//
//   v2  a text-mode splice of the catalogue normalised the site's CRLF, so a
//       deploy meant to be one cabinet carried a byte outside it
//   v3  one importer of games.js was left a token behind the rest
//   v4  games.js was imported under two tokens at once (103 and 96) and the
//       worker precached BOTH, so bumping one half left most of the site on
//       the old catalogue — and copying the repo's test/ into the site nested
//       it inside the site's own, so both gate runs died at load with zero
//       checks and "agreed"
//   v5  the cabinet gate was run BEFORE the version bump, which is a gate run
//       against the previous release; and the game's index.html was copied
//       over the site's with the other line endings, a 258-line diff for a
//       one-character change
//
// So this does what those deploys did, in the same shape, with every one of
// those rules written down once instead of remembered five times:
//
//   1. the game's folder, minus test/ and art-src/, in the SITE's line endings,
//      with every reference out of the folder taking the SITE's token
//   2. the cabinet's entry spliced into the site's games.js — never the whole
//      file, which is theirs and lists cabinets this branch has never had
//   3. games.js's token climbed in every file that asks for it, to ONE number
//   4. the worker rolled if its list moved
//   5. one row of versions.json, read off the game's own VERSIONS.md
//   6. the result checked for all of the above before anything is written
//
// It does NOT merge, regenerate versions.json, touch another cabinet, or push.
// Deploys never merge; pushing is the caller's decision.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const REPO = path.resolve(import.meta.dirname, '..');
const [id, siteArg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const dry = process.argv.includes('--dry');
const site = siteArg && path.resolve(siteArg);

if (!id || !site || !fs.existsSync(path.join(site, 'hub', 'games.js'))) {
  console.error('usage: node scripts/deploy-game.mjs <game-id> <siteRoot> [--dry]');
  process.exit(2);
}

const { GAMES } = await import(pathToFileURL(path.join(REPO, 'hub', 'games.js')).href);
const game = GAMES.find(g => g.id === id);
if (!game || !game.inRepo) {
  console.error(`no in-repo cabinet called '${id}' in this branch's catalogue`);
  process.exit(2);
}
const DIR = game.path.replace(/\/$/, '');

// ── the overlay ────────────────────────────────────────────────────
// Every step reads what the steps before it wrote, so writes are staged and
// land together at the end — deploy-hub.mjs's lesson: a --dry run that reads
// the tree as it IS while a real run reads it as it is BECOMING says the
// right thing about the wrong tree.
const pending = new Map();                    // site-relative path -> Buffer
const siteBuf = f => {
  if (pending.has(f)) return pending.get(f);
  try { return fs.readFileSync(path.join(site, f)); } catch { return null; }
};
const siteText = f => siteBuf(f)?.toString('utf8') ?? null;
const stage = (f, data) => pending.set(f, Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8'));

const say = [];
const stops = [];
const note = s => say.push(s);
const stop = s => { stops.push(s); note(`! ${s}`); };

const TEXT = /\.(?:html|js|mjs|cjs|css|md|json|svg|txt|webmanifest)$/;
// the site's line endings win, in whichever direction: v5 flipped a file one
// way and main's merge flipped it back, and both were whole-file diffs for
// nothing. A file the site does not have yet keeps ours.
// By MAJORITY, not by presence: the site's games.js is LF with eight stray
// CRLF lines in it, and "contains a CRLF" put 27 carriage returns into an
// entry the hand deploy had rightly written in LF. Replaying the v5 deploy
// through this script is what showed it.
const eolLike = (text, like) => {
  if (like == null) return text;
  const lf = text.replace(/\r\n/g, '\n');
  const crlf = (like.match(/\r\n/g) ?? []).length;
  const all = (like.match(/\n/g) ?? []).length;
  return crlf * 2 > all ? lf.replace(/\n/g, '\r\n') : lf;
};

// ── 0. the site's tokens, read before anything is written ─────────
// A token belongs to a PATH, never to a filename: nine games ship a main.js.
// So every reference is resolved against the file it was found in.
const walk = (root, rel = '', skip = () => false) => {
  const out = [];
  let ents;
  try { ents = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return out; }
  for (const d of ents) {
    if (d.name.startsWith('.') || d.name === 'node_modules') continue;
    const p = rel ? `${rel}/${d.name}` : d.name;
    if (skip(p, d)) continue;
    if (d.isDirectory()) out.push(...walk(root, p, skip));
    else out.push(p);
  }
  return out;
};
const REF = /(?<=[/'"(=])((?:\.{0,2}\/)*(?:[\w.-]+\/)*)([\w.-]+\.(?:js|css))\?v=(\d+)/g;
const resolve = (inFile, dir, name) =>
  path.posix.normalize(path.posix.join(path.posix.dirname(inFile), dir, name));

const siteWeb = walk(site, '', p => p === 'test' || p.startsWith('test/'))
  .filter(f => /\.(?:html|js|css)$/.test(f));
const siteTok = new Map();                    // resolved path -> highest token the site asks for
const siteUse = new Map();                    // resolved path -> Map(token -> how many files)
for (const f of siteWeb) {
  for (const [, dir, name, v] of (siteText(f) ?? '').matchAll(REF)) {
    const at = resolve(f, dir, name);
    siteTok.set(at, Math.max(siteTok.get(at) ?? 0, +v));
    const use = siteUse.get(at) ?? new Map();
    use.set(+v, (use.get(+v) ?? 0) + 1);
    siteUse.set(at, use);
  }
}
// The token a game should ask for when it reaches OUT of its folder: the one
// most of the site asks for, not the highest. The site is not always one
// token per module — before v5 it asked for toko/js/signature.js as v3 in
// nine pages, v62 in radiofree's and v1 in one more — and taking the highest
// would have moved this cabinet onto one other game's number, a change that
// is not this deploy's to make. Every URL serves the same bytes; the token is
// only which cache entry answers, so the one everybody else shares is right.
const siteMost = at => [...(siteUse.get(at) ?? [])]
  .sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0];

// ── has this branch ever HELD the site's copy? ─────────────────────
// A deploy may move the site forward; it may not move it backwards, and a
// byte comparison cannot tell which way two copies differ. If the site's copy
// is one this branch once had, it is an older version of ours and safe to
// replace. If not, somebody edited the site directly and a copy would delete
// their work while reporting success. Compared with tokens stripped and line
// endings folded, because a deployed file has been renumbered and re-ended.
const bare = s => s.replace(/\r\n/g, '\n').replace(/\?v=\d+/g, '').replace(/\s*$/, '\n');
const held = (f, text) => {
  const want = bare(text);
  let hist = [];
  try {
    hist = execFileSync('git', ['log', '--format=%H', '--', f], { cwd: REPO, encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch { return false; }
  for (const c of hist) {
    try {
      const was = execFileSync('git', ['show', `${c}:${f}`],
        { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 26 });
      if (bare(was) === want) return true;
    } catch { /* deleted in that commit */ }
  }
  return false;
};

// ── 1. the folder ──────────────────────────────────────────────────
// test/ and art-src/ stay behind: the site ships docs but no test dirs, and
// art-src/ is source. A game whose RUNTIME art lives in art-src/ (TURF) must
// not be deployed with this until that is a per-game setting.
const LEAVE = new Set(['test', 'art-src']);
const ours = walk(path.join(REPO, DIR), '', p => LEAVE.has(p.split('/')[0]))
  .map(p => `${DIR}/${p}`);
let copied = 0;
const split = new Set();
for (const f of ours) {
  const mine = fs.readFileSync(path.join(REPO, f));
  const theirs = siteBuf(f);
  let out = mine;
  if (TEXT.test(f)) {
    let text = mine.toString('utf8');
    // a reference OUT of the game (the shell button, the signature) takes
    // whatever the site asks for everywhere else: v1 shipped this cabinet
    // pinned to a shell token the rest of the site had long since left
    text = text.replace(REF, (whole, dir, name, v) => {
      const at = resolve(f, dir, name);
      if (at.startsWith(`${DIR}/`)) return whole;
      if (!siteUse.has(at)) {
        if (!siteBuf(at)) stop(`${f} asks for ${at}, which the site does not have`);
        return whole;
      }
      if (siteUse.get(at).size > 1) split.add(at);
      return `${dir}${name}?v=${siteMost(at)}`;
    });
    text = eolLike(text, theirs?.toString('utf8'));
    out = Buffer.from(text, 'utf8');
    if (theirs && bare(theirs.toString('utf8')) !== bare(text) && !held(f, theirs.toString('utf8'))) {
      stop(`${f} — the site carries work this branch has never held; NOT overwritten`);
      continue;
    }
  }
  if (theirs && theirs.equals(out)) continue;
  stage(f, out);
  copied++;
}
const orphans = walk(path.join(site, DIR), '', p => LEAVE.has(p.split('/')[0]))
  .map(p => `${DIR}/${p}`)
  .filter(f => !ours.includes(f));
if (orphans.length) note(`  left on the site, no longer in this branch: ${orphans.join(', ')}`);
// not this deploy's to fix — mending another game's references is another
// game's deploy — but a person should know the site is split
for (const at of split) {
  note(`  note: the site asks for ${at} under ${siteUse.get(at).size} tokens ` +
    `(${[...siteUse.get(at)].map(([v, n]) => `v${v}×${n}`).join(', ')}); this cabinet takes v${siteMost(at)}`);
}
note(`  ${copied} file(s) of ${DIR}/ to write`);

// ── 2. the cabinet ─────────────────────────────────────────────────
// Only this cabinet's object is replaced. The span is found by walking the
// file with strings skipped, because a tagline may contain a brace and a
// regex over nested objects is how the last copy of a hub script swallowed
// the whole rack into one "comment".
const objectAround = (src, at) => {
  const stack = [];
  let best = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\'' || c === '"' || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 1; continue; }
    if (c === '{') stack.push(i);
    else if (c === '}') {
      const open = stack.pop();
      // the innermost object that contains the id is the entry itself: the
      // nested fi/ja objects all come after `id:` and cannot contain it
      if (open < at && i > at && (best === null || open > best[0])) best = [open, i + 1];
    }
  }
  return best;
};
const idAt = src => src.search(new RegExp(`\\bid: '${id}',`));

const catMine = fs.readFileSync(path.join(REPO, 'hub', 'games.js'), 'utf8');
const catTheirs = siteText('hub/games.js');
let catalogueMoved = false;
{
  const a = idAt(catMine), b = idAt(catTheirs);
  if (b < 0) {
    stop(`the site's catalogue has no '${id}' — a FIRST deploy needs a place in the rack, a ` +
      `marquee in art.js and lead kinds in topics.js, all of them the site's files; that is a person's job`);
  } else {
    const [ma, mb] = objectAround(catMine, a);
    const [ta, tb] = objectAround(catTheirs, b);
    const entry = catMine.slice(ma, mb);
    const was = catTheirs.slice(ta, tb);
    if (bare(entry) !== bare(was)) {
      // in the site's line endings, byte for byte outside the entry: v2
      const out = catTheirs.slice(0, ta) + eolLike(entry, catTheirs) + catTheirs.slice(tb);
      stage('hub/games.js', out);
      catalogueMoved = true;
      note('  the cabinet\'s catalogue entry moves');
    }
    // The note on the card is the release note a player reads, and it has to
    // describe the release being shipped. Replaying the v4 deploy showed the
    // branch still said v3 at the v4 commit — the note had been edited on the
    // site by hand — and v6 to v9 went four releases without anyone touching
    // it. A note that names a different version is a deploy of old paperwork.
    const rel = fs.readFileSync(path.join(REPO, DIR, 'VERSIONS.md'), 'utf8').match(/^##\s*v([\d.]+)/m)?.[1];
    const named = [...entry.matchAll(/\bnote: '(v[\d.]+) /g)].map(m => m[1].slice(1));
    const wrong = named.filter(v => v !== rel);
    if (rel && wrong.length) {
      stop(`the cabinet's note still describes v${wrong[0]} while this releases v${rel} — ` +
        'update the note (all three languages) in hub/games.js first');
    }
    // a cabinet with no draw function is a blank marquee on the floor
    const art = siteText('hub/art.js') ?? '';
    if (game.art && !new RegExp(`^ {2}${game.art}\\(g(?:, a)?\\)`, 'm').test(art)) {
      stop(`the site's art.js has no marquee called '${game.art}'`);
    }
  }
}

// ── 3. the catalogue's token, climbed to ONE number ────────────────
// Every file that asks for games.js asks for the same new number, including
// the worker's list. Taking the max and adding one also heals a split rather
// than bumping one half of it (v4).
//
// It climbs ONE level, as all five hand deploys did, not to a fixpoint the way
// deploy-hub.mjs does. The importers (hub.js, shell.js, …) change bytes here
// but keep their tokens, and that is safe because of step 4: the worker rolls,
// and it precaches with `cache: 'reload'`, so a returning browser refetches
// every shell module past its HTTP cache. A full climb would move shell.js,
// and shell.js is in every cabinet's page — one game's deploy would rewrite
// twenty other games' index.html, which is exactly what a game deploy must not
// do. The residue is a browser with no worker holding the old hub.js in its
// HTTP cache, for at most the ten minutes Pages allows.
if (catalogueMoved) {
  const key = 'hub/games.js';
  const next = (siteTok.get(key) ?? 0) + 1;
  let touched = 0;
  for (const f of [...siteWeb, 'sw.js']) {
    const src = siteText(f);
    if (src == null) continue;
    let out = src.replace(REF, (whole, dir, name) =>
      resolve(f, dir, name) === key ? `${dir}${name}?v=${next}` : whole);
    if (f === 'sw.js') {
      // a split left two list entries; renumbered, they are now the same line
      const seen = new Set();
      out = out.split(/(?<=\n)/).filter(l => {
        if (!/hub\/games\.js\?v=/.test(l)) return true;
        if (seen.has(l)) return false;
        seen.add(l);
        return true;
      }).join('');
    }
    if (out !== src) { stage(f, out); touched++; }
  }
  note(`  games.js v${siteTok.get(key)} -> v${next} in ${touched} file(s)`);
}

// ── 4. the worker ──────────────────────────────────────────────────
// A new list needs a new cache name, or the old cache answers first.
{
  const before = (() => { try { return fs.readFileSync(path.join(site, 'sw.js'), 'utf8'); } catch { return null; } })();
  const now = siteText('sw.js');
  if (before != null && now !== before) {
    const out = now.replace(/const VERSION = 'v(\d+)';/, (_, n) => `const VERSION = 'v${+n + 1}';`);
    stage('sw.js', out);
    note(`  sw.js ${before.match(/const VERSION = '(v\d+)';/)?.[1]} -> ${out.match(/const VERSION = '(v\d+)';/)?.[1]}`);
  }
}

// ── 5. one row ─────────────────────────────────────────────────────
// Never a regeneration — the site does not hold every project's log, and the
// last regeneration moved eight cabinets, most of them BACKWARDS. One row, read
// off the log this deploy is carrying, and never lower than the site's.
{
  const m = fs.readFileSync(path.join(REPO, DIR, 'VERSIONS.md'), 'utf8').match(/^##\s*v(\d+)(?:\.(\d+))?/m);
  if (!m) stop(`${DIR}/VERSIONS.md has no ## vN heading`);
  else {
    const row = {
      v: m[2] === undefined ? m[1] : `${m[1]}.${m[2]}`,
      n: +m[1] * 1000 + Math.min(999, +(m[2] ?? 0)),
      from: 'VERSIONS.md',
    };
    const text = siteText('hub/versions.json');
    const data = JSON.parse(text);
    if (JSON.stringify(data, null, 2) + '\n' !== text) {
      stop('hub/versions.json is not in the shape this writes back; edit the row by hand');
    } else if ((data[id]?.n ?? 0) > row.n) {
      stop(`the site is AHEAD of this branch: ${id} v${data[id].v} there, v${row.v} here`);
    } else if (JSON.stringify(data[id]) !== JSON.stringify(row)) {
      note(`  versions.json ${id}: v${data[id]?.v ?? '—'} -> v${row.v}`);
      data[id] = row;
      stage('hub/versions.json', JSON.stringify(data, null, 2) + '\n');
    }
  }
}

// ── 6. the result, checked before it lands ─────────────────────────
// Each of these is a trap one of the hand deploys fell into.
{
  const want = siteTok.get('hub/games.js') + (catalogueMoved ? 1 : 0);
  const asks = new Map();
  for (const f of [...siteWeb, 'sw.js']) {
    for (const [, dir, name, v] of (siteText(f) ?? '').matchAll(REF)) {
      if (resolve(f, dir, name) === 'hub/games.js') asks.set(f, [...(asks.get(f) ?? []), +v]);
    }
  }
  const off = [...asks].filter(([, vs]) => vs.some(v => v !== want));
  // Strict only when this deploy MOVED the catalogue: then every reader must
  // take the new number, or part of the site keeps the old cabinet (v4). When
  // it did not, the bytes are unchanged and a split is somebody else's — the
  // v4 replay stopped a Flowsnow-only deploy over a split in four files it had
  // no reason to touch. Say so instead.
  if (off.length && catalogueMoved) {
    stop(`games.js is still asked for under another token in: ${off.map(([f]) => f).join(', ')}`);
  } else if (off.length) {
    const tokens = [...new Set([...asks.values()].flat())].sort((a, b) => a - b);
    note(`  note: the site asks for hub/games.js under ${tokens.length} tokens (${tokens.map(t => `v${t}`).join(', ')}); ` +
      'a deploy that moves the catalogue will heal it');
  }
  if (!asks.has('sw.js')) stop('sw.js does not precache games.js');
  const leaked = [...pending.keys()].filter(f => f.startsWith(`${DIR}/test/`) || f.startsWith(`${DIR}/art-src/`));
  if (leaked.length) stop(`would ship ${leaked.join(', ')}`);
  const shipped = siteText(`${DIR}/VERSIONS.md`)?.match(/^##\s*v([\d.]+)/m)?.[1];
  const row = JSON.parse(siteText('hub/versions.json'))[id]?.v;
  if (shipped !== row) stop(`${DIR}/VERSIONS.md says v${shipped} and versions.json says v${row}`);
}

// ── land ───────────────────────────────────────────────────────────
const lands = [...pending].filter(([f, b]) => {
  try { return !fs.readFileSync(path.join(site, f)).equals(b); } catch { return true; }
}).map(([f]) => f).sort();

if (stops.length) {
  console.log(say.join('\n'));
  console.log(`\nSTOP: ${stops.length} problem(s) above. Nothing was written.`);
  process.exit(1);
}
if (!dry) {
  for (const f of lands) {
    fs.mkdirSync(path.dirname(path.join(site, f)), { recursive: true });
    fs.writeFileSync(path.join(site, f), pending.get(f));
  }
}
console.log(say.join('\n'));
const outOfGame = lands.filter(f => !f.startsWith(`${DIR}/`));
console.log(`\n${lands.length} file(s) ${dry ? 'would change' : 'changed'}` +
  (outOfGame.length ? `, ${outOfGame.length} outside ${DIR}/: ${outOfGame.join(', ')}` : ''));
console.log(`\nnext: run the cabinet gate on the site tree (after this, never before), and walk
the arcade route into ${DIR}/ before pushing.`);
