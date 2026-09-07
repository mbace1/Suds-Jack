// The arcade worker's precache list, derived rather than kept.
//
//   node scripts/sw-shell.mjs [root]        # default: the repo
//
// A precache list IS the module graph, and a hand-kept copy of a graph drifts:
// the list said `feedback.js?v=7` while the page asked for `?v=9`, which is an
// arcade that loads perfectly online and is blank the moment you lose signal —
// the worker had cached a URL nobody would ever request again.
//
// So it is not a list at all. It is a WALK, from index.html, following every
// import it finds. The first cut pattern-matched `hub/*` instead, which was the
// same hand-kept list with extra steps: the counter at the top of the page is
// twelve modules under toko/ and not one of them was named, so the arcade came
// up offline with a dead bar across the top of it.
//
// The two callers do not share a filesystem view — deploy-hub.mjs works on an
// overlay of edits that have not landed yet — so the reader is passed in.
//
// `test/hub-smoke.cjs` asserts the result, so drift fails the gate rather than
// waiting for someone to board a plane.

import fs from 'node:fs';
import path from 'node:path';

// Anything a page or a module can point at another file with. `href` is in
// here for the stylesheet; the rest are the three shapes an import takes.
const REFS = [
  /(?:src|href)="([^"]+)"/g,
  /from\s*'([^']+)'/g,
  /import\(\s*'([^']+)'/g,
  // a bare side-effect import — `import './x.js';`, no `from` — is invisible
  // to the pattern above (which needs the word `from`) and to the dynamic one
  // (which needs `import(`). hub-entry.js is written exactly this way, and
  // missing it silently dropped ten modules — the whole rest of the hub —
  // out of the walk with no error, since the walker just never got past it.
  /^\s*import\s+'([^']+)'/gm,
];

// `import('./dialogue.js' + V)` — the specifier is BUILT, so the token is not
// in the source at all: it is inherited from the URL of the file doing the
// importing. Matching only literal `?v=` misses these, and the two dialogue
// packs are loaded exactly this way.
const BUILT = /import\(\s*'(\.\/[\w.-]+\.js)'\s*\+/g;

const tokenOf = ref => ref.match(/\?v=\d+/)?.[0] ?? '';

export function shellOf(root, read) {
  // A folder that ships its own service worker caches itself, and a second
  // worker reaching in from out here would be two answers to the same
  // question. A narrower scope wins the page, so those keep controlling
  // themselves — see the note at the top of sw.js.
  const selfCaching = new Set(
    fs.readdirSync(root, { withFileTypes: true })
      .filter(d => d.isDirectory() && fs.existsSync(path.join(root, d.name, 'sw.js')))
      .map(d => d.name));

  const out = new Set();
  const done = new Set();

  const visit = (file, inheritedToken) => {
    if (done.has(file)) return;
    done.add(file);
    const src = read(file);
    if (src == null) return;
    const dir = path.posix.dirname(file);
    const mine = inheritedToken || tokenOf(file);

    // The built ones FIRST, and their bare paths are then ignored by the plain
    // pass. `import('./dialogue.js' + V)` matches both patterns, and the plain
    // one sees a specifier with no token — so whichever landed first decided
    // the URL, and the untokened one won often enough to put `dialogue.js` in
    // the list twice and to walk its language packs with no token at all.
    const found = [];
    const built = new Set();
    for (const m of src.matchAll(BUILT)) {
      built.add(m[1]);
      found.push(m[1] + mine);
    }
    for (const re of REFS) {
      for (const m of src.matchAll(re)) {
        if (built.has(m[1])) continue;
        found.push(m[1]);
      }
    }

    for (const raw of found) {
      if (/^(?:https?:|data:|#|\/\/)/.test(raw)) continue;         // not ours
      const bare = raw.split('?')[0];
      if (!/\.(?:js|css)$/.test(bare)) continue;
      const at = path.posix.normalize(path.posix.join(dir, bare));
      if (at.startsWith('..')) continue;
      if (selfCaching.has(at.split('/')[0])) continue;
      // It has to be a real file. These patterns read comments as happily as
      // code, and a line of documentation in chat.js showing how to import it
      // put `toko/js/toko/js/chat.js` in the precache list.
      if (read(at) == null) continue;
      // An untokened reference is a shell, not a module: it has no new URL per
      // deploy, so caching it first would pin the page at whatever it looked
      // like on your first visit. sw.js serves those network-first.
      // An untokened module still has to be HERE offline — it just cannot be
      // served cache-first, because it has no new URL per deploy and would pin
      // itself forever. The counter's own modules are all like this
      // (`from './surface.js'`), so leaving them out was the whole reason the
      // arcade came up offline with a dead bar across the top. They go in the
      // list; sw.js reads the token back off the URL and picks the strategy.
      const token = tokenOf(raw);
      out.add(at + token);
      visit(at, token);
    }
  };

  visit('index.html', '');
  return [...out].sort();
}

// `./` and `./index.html` are the fixed head: the page shell is network-first
// and carries no token, so it can never come out of a walk for tokens.
export const withShell = (sw, list) => sw.replace(
  /(const SHELL = \[\n {2}'\.\/',\n {2}'\.\/index\.html',\n)(?: {2}'[^']*',\n)*(\];)/,
  (_, head, tail) => head + list.map(u => `  './${u}',`).join('\n') + '\n' + tail);

if (import.meta.filename === process.argv[1]) {
  const root = process.argv[2] ?? path.resolve(import.meta.dirname, '..');
  const read = f => { try { return fs.readFileSync(path.join(root, f), 'utf8'); } catch { return null; } };
  const list = shellOf(root, read);
  const was = read('sw.js');
  const out = withShell(was, list);
  if (out === was) console.log(`sw.js already names all ${list.length} modules`);
  else {
    fs.writeFileSync(path.join(root, 'sw.js'), out);
    console.log(`sw.js now precaches ${list.length} modules:\n  ${list.join('\n  ')}`);
  }
}
