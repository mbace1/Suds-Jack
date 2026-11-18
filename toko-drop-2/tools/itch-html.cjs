#!/usr/bin/env node
// itch-html.cjs — the itch.io upload as ONE file: tokodropv<N>.html (owner, 18 Nov 2026).
// Bundles js/main.js and everything it imports, three.js (the import map's three/webgpu
// and three/tsl) and every levels/*.json into a single page, so itch needs nothing else.
// The game's own files are not changed: two lines are rewritten in the bundle only —
//   - main.js fetches a campaign room's JSON beside it; here it reads it from the page
//   - record.js reads its version off its own ?v= URL; here it is the number itself
// Packaging tooling, not part of the game: the game keeps its no-build rule and this
// folder is not in the upload. esbuild is NOT vendored — install it somewhere scratch:
//
//   npm i --prefix /tmp/esb esbuild@0.24.2
//   NODE_PATH=/tmp/esb/node_modules node toko-drop-2/tools/itch-html.cjs
//     → toko-drop-2/tokodropv<N>.html   (do not commit it)
const { build } = require('esbuild');
const { readFileSync, readdirSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const N = html.match(/js\/main\.js\?v=(\d+)/)[1];
const out = process.argv[2] || join(root, `tokodropv${N}.html`);
const levels = {};
for (const f of readdirSync(join(root, 'levels'))) if (f.endsWith('.json')) levels[f.slice(0, -5)] = JSON.parse(readFileSync(join(root, 'levels', f), 'utf8'));
const vendor = { three: 'three.webgpu.js', 'three/webgpu': 'three.webgpu.js', 'three/tsl': 'three.tsl.js' };   // index.html's import map
const patched = { levels: 0, version: 0 };

const plugin = { name: 'toko', setup(b) {
  // every import carries a ?v= cache token, which a file path cannot have
  b.onResolve({ filter: /.*/ }, (a) => {
    const p = a.path.replace(/\?.*$/, '');
    if (vendor[p]) return { path: join(root, 'vendor/three', vendor[p]) };
    if (p.startsWith('.')) return { path: resolve(a.resolveDir, p) };
    return null;
  });
  b.onLoad({ filter: /[\\/]js[\\/](main|record)\.js$/ }, (a) => {
    let src = readFileSync(a.path, 'utf8');
    if (a.path.endsWith('main.js')) {
      const re = /fetch\(new URL\(`\.\.\/levels\/\$\{id\}\.json\?v=\d+`, import\.meta\.url\)\)/;
      if (!re.test(src)) throw new Error('main.js: the level fetch has changed; update this tool');
      src = src.replace(re, '(window.__TOKO_LEVELS && window.__TOKO_LEVELS[id] ? Promise.resolve(new Response(JSON.stringify(window.__TOKO_LEVELS[id]), { status: 200, headers: { "content-type": "application/json" } })) : Promise.resolve(new Response("", { status: 404 })))');
      patched.levels++;
    } else {
      const re = /Number\(new URL\(import\.meta\.url\)\.searchParams\.get\('v'\)\) \|\| 0/;
      if (!re.test(src)) throw new Error('record.js: the VERSION line has changed; update this tool');
      src = src.replace(re, String(N)); patched.version++;
    }
    return { contents: src, loader: 'js' };
  });
} };

(async () => {
  const r = await build({ entryPoints: [join(root, 'js/main.js')], bundle: true, format: 'esm', write: false, minify: true, target: 'es2022', plugins: [plugin], logLevel: 'warning' });
  if (!patched.levels || !patched.version) throw new Error('a rewrite did not apply');
  const js = r.outputFiles[0].text;
  if (/import\.meta/.test(js)) throw new Error('import.meta is still in the bundle: a new file-relative load needs inlining');
  const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  const page = html
    .replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, '')
    .replace(/<script type="module" src="js\/main\.js\?v=\d+"><\/script>/,
      () => `<script>window.__TOKO_LEVELS = ${safe(JSON.stringify(levels))};</script>\n  <script type="module">\n${safe(js)}\n</script>`);
  if (/src="js\/main/.test(page) || /<script type="importmap">/.test(page)) throw new Error('index.html has changed shape; update this tool');
  writeFileSync(out, page);
  console.log(`✔ ${out}: v${N}, ${Object.keys(levels).length} levels, ${(page.length / 1048576).toFixed(2)} MB`);
})().catch((e) => { console.error('✗ ' + e.message); process.exit(1); });
