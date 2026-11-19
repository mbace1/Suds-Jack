#!/usr/bin/env bash
# Real ES-module syntax check, without executing anything.
#
# `node --check` exits 0 on ES-module syntax errors in a .js file (it parses
# CommonJS), which is how 1.x v93 shipped a parse-broken designer.js and a
# black screen through four releases of green checks. This compiles every
# file as an actual ES module (vm.SourceTextModule), and every inline
# <script> in the pages: modules as modules, classic scripts as scripts,
# importmaps as JSON.
#
# Covers: js/**, vendor/** (a bad patch to a vendored file is caught here),
# scripts/*.mjs, test/*.mjs, and every *.html at the root.
set -u
cd "$(dirname "$0")/.."

node --no-warnings --experimental-vm-modules - <<'EOF'
const fs = require('fs'), path = require('path'), vm = require('vm');

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};

const modules = [
  ...walk('js'), ...walk('vendor'), ...walk('scripts'), ...walk('test'),
].filter((f) => /\.m?js$/.test(f));
const pages = fs.readdirSync('.').filter((f) => f.endsWith('.html'));

let bad = 0, count = 0;
const asModule = (src, id) => { count++; new vm.SourceTextModule(src, { identifier: id }); };
const asScript = (src, id) => { count++; new vm.Script(src, { filename: id }); };

for (const f of modules) {
  try { asModule(fs.readFileSync(f, 'utf8'), f); }
  catch (e) { console.error(`  ✗ SYNTAX ${f}: ${e.message}`); bad = 1; }
}
for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8');
  let i = 0;
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1], body = m[2], id = `${f} <script #${++i}>`;
    if (/\bsrc\s*=/.test(attrs) || !body.trim()) continue;
    const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    try {
      if (type === 'importmap') { count++; JSON.parse(body); }
      else if (type === 'module') asModule(body, id);
      else if (!type || /javascript/i.test(type)) asScript(body, id);
    } catch (e) { console.error(`  ✗ SYNTAX ${id}: ${e.message}`); bad = 1; }
  }
}
// What ships (the pages, js/, vendor/, levels/) must have no name that starts
// with "_" or ".": the arcade is served by GitHub Pages, whose Jekyll build
// leaves those out, so the file is a 404 on the live site while every local
// server serves it. js/sim/species/_base.js was one (v41), and the game failed
// to load on the phone with every test green.
for (const f of [...walk('js'), ...walk('vendor'), ...walk('levels'), ...pages]) {
  if (f.split(path.sep).some((seg) => /^[_.]/.test(seg))) { console.error(`  ✗ ${f}: a name starting with "_" or "." is left out by GitHub Pages (Jekyll) — a 404 on the live site`); bad = 1; }
}
if (bad) {
  console.error('\n✗ syntax error(s) above — refusing to continue.');
  process.exit(1);
}
console.log(`✔ syntax OK (${count} modules, scripts and importmaps)`);
EOF
