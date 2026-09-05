// Hyper Dagger's precache list, derived rather than kept.
//
//   node scripts/hd-shell.mjs [root]        # default: the repo
//
// Same argument as scripts/sw-shell.mjs, which does this for the arcade: a
// precache list IS the module graph, and a hand-kept copy of a graph drifts.
// This one had drifted all the way — it named two modules out of the whole
// game, both of them UNTOKENED while the page asks for `?v=63`, so the worker
// cached URLs nobody would ever request and `js/main.js` was not in the cache
// at all. Hyper Dagger's own sw.js says the module graph is precached at
// install; it was not, and the deployed copy has the same list.
//
// It cannot just call shellOf(): that walker refuses a path leaving its root,
// and the signature is `../toko/js/signature.js` — deliberately the SITE's
// copy, not a vendored one. So the walk runs from the repo root and keeps its
// paths relative to the game.
import fs from 'node:fs';
import path from 'node:path';

const REFS = [/(?:src|href)="([^"]+)"/g, /from\s*'([^']+)'/g, /import\(\s*'([^']+)'/g];
const tokenOf = ref => ref.match(/\?v=\d+/)?.[0] ?? '';

const args = process.argv.slice(2);
const check = args.includes('--check');
const root = args.find(a => !a.startsWith('--')) ?? path.resolve(import.meta.dirname, '..');
const GAME = 'hyperdagger';
const read = f => { try { return fs.readFileSync(path.join(root, f), 'utf8'); } catch { return null; } };

// three.js arrives through the page's importmap — `from 'three'` and
// `from 'three/addons/…'` — so a walker that only follows relative specifiers
// drops the renderer, the whole postprocessing chain and the GLTF loader, and
// the game is a black screen offline while every one of its own modules is
// cached. Read the map off index.html and resolve through it.
const IMPORTS = (() => {
  const page = read(`${GAME}/index.html`) ?? '';
  const block = page.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (!block) return {};
  try { return JSON.parse(block[1]).imports ?? {}; } catch { return {}; }
})();

// Bare specifiers resolve against the map: an exact key wins, otherwise the
// longest trailing-slash prefix does, which is how `three/addons/` works.
function resolveBare(spec) {
  if (IMPORTS[spec]) return IMPORTS[spec];
  const pre = Object.keys(IMPORTS)
    .filter(k => k.endsWith('/') && spec.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return pre ? IMPORTS[pre] + spec.slice(pre.length) : null;
}

const out = new Set();
const seen = new Set();

// Files are addressed from the repo root while walking and written out
// relative to the game, which is the only form the worker can use.
const visit = (file, token) => {
  if (seen.has(file)) return;
  seen.add(file);
  const src = read(file);
  if (src == null) return;
  const dir = path.posix.dirname(file);
  for (const re of REFS) {
    for (const m of src.matchAll(re)) {
      let raw = m[1];
      if (/^(?:https?:|data:|#|\/\/)/.test(raw)) continue;
      // A bare specifier resolves through the map, and its result is written
      // from the PAGE rather than from the importing file. Only the map
      // decides: `src="js/main.js?v=63"` in index.html has no leading `./`
      // either, and treating every such reference as bare dropped the entire
      // game — twelve modules — while leaving the hub and brand files in.
      let from = dir;
      const mapped = raw.startsWith('.') || raw.startsWith('/') ? null : resolveBare(raw);
      if (mapped) { raw = mapped; from = GAME; }
      const bare = raw.split('?')[0];
      if (!/\.(?:js|css)$/.test(bare)) continue;
      const at = path.posix.normalize(path.posix.join(from, bare));
      if (at.startsWith('..')) continue;
      if (read(at) == null) continue;          // a comment is not an import
      // The arcade's HOME button is deliberately NOT cached: it is another
      // app's module graph with its own tokens, and offline the hub it leads
      // to is unreachable anyway — the correct offline page has no HOME
      // button rather than a dead one. offline.cjs states the same rule.
      // The signature is the opposite case and stays: it is drawn INTO this
      // game, so without it the corner is empty on a plane.
      if (at.startsWith('hub/')) continue;
      const t = tokenOf(raw);
      out.add(path.posix.relative(GAME, at) + t);
      visit(at, t);
    }
  }
};
visit(`${GAME}/index.html`, '');

// The non-module shell: the page itself, the manifest, the icons. None of them
// carries a token, so no walk for tokens can ever produce them.
const FIXED = ['./', './index.html', './manifest.webmanifest'];
for (const f of ['favicon.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  if (read(`${GAME}/${f}`)) FIXED.push(`./${f}`);
}

// The Meshy enemy models are named by mesh-enemies.js through `new URL(...)`,
// which no reference pattern sees. They are not listed by hand either: the
// game reads models/enemies/manifest.json and requests ONLY what it names, so
// the precache reads the same file and lists the same thing. A precache naming
// art that is in no branch is the same class of lie as one naming the wrong
// token — and the manifest is what stops the loader asking for it at runtime,
// so the worker and the game cannot disagree about which art exists.
const MODELS = (() => {
  const at = `${GAME}/assets/manifest.json`;
  const raw = read(at);
  if (raw == null) return [];
  const out = ['./assets/manifest.json'];
  let declared = {};
  try { declared = JSON.parse(raw).models ?? {}; } catch { return out; }
  // The GLBs themselves are deliberately NOT precached. They are ~5 MB of art
  // that fails soft — a missing one leaves that enemy as its string-art sculpt
  // and the game plays exactly as before — and sw.js is network-first with a
  // cache write on every success, so they land in the cache the first time you
  // actually play. Precaching them made install a 5 MB download before the
  // worker was useful, and the offline gate caught it honestly: the cord was
  // cut mid-install and the first kind the loader asked for was still in
  // flight. The manifest stays: it is small, and it is what says they exist.
  return out;
})();

// `../toko/js/signature.js` climbs out of the game folder and must stay
// written that way — `./../toko/…` resolves the same but reads as a mistake.
const rel = u => (u.startsWith('../') ? u : `./${u}`);
const list = [...FIXED, ...[...out].sort().map(rel), ...MODELS];

const swPath = path.join(root, GAME, 'sw.js');
const was = fs.readFileSync(swPath, 'utf8');
const body = `const PRECACHE = [\n${list.map(u => `  '${u}',`).join('\n')}\n];`;
const now = was.replace(/const PRECACHE = \[[\s\S]*?\n\];/, body);

if (check) {
  if (now !== was) {
    console.error('hyperdagger/sw.js precache list is out of date — run scripts/hd-shell.mjs');
    process.exit(1);
  }
  console.log(`hyperdagger precache: ${list.length} entries, up to date`);
} else {
  fs.writeFileSync(swPath, now);
  console.log(`hyperdagger precache: ${list.length} entries written`);
}
