#!/usr/bin/env bash
# Real ES-module syntax check for the game's JS.
#
# `node --check` silently exits 0 on ES modules (it only parses CommonJS), so
# it can wave through hard SyntaxErrors — that's exactly how v93 shipped with
# a parse-broken designer.js that black-screened the whole game. This script
# compiles each file as an actual ES module (vm.SourceTextModule), which
# catches parse errors without executing anything.
set -u
node --experimental-vm-modules -e '
const fs = require("fs"), vm = require("vm");
let bad = 0;
for (const f of process.argv.slice(1)) {
  try { new vm.SourceTextModule(fs.readFileSync(f, "utf8"), { identifier: f }); }
  catch (e) { console.error(`SYNTAX ${f}: ${e.message}`); bad = 1; }
}
process.exit(bad);
' toko-drop/js/*.js 2>/dev/null
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo ""
  echo "  ES-module syntax error(s) above — refusing to continue."
  echo ""
  exit 1
fi
echo "✔ ESM syntax OK (toko-drop/js/*.js)"
