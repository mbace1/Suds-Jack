#!/usr/bin/env node
/**
 * Kindling — CHECKSUM A DELIVERY BEFORE IT ARRIVES.
 *
 *   node tools/art-manifest.cjs expect <dir> [> MANIFEST.md]
 *   node tools/art-manifest.cjs verify <dir> <manifest.md>
 *
 * Why this exists, and it is not paranoia. The second art delivery (PR #282)
 * shipped the pack as base64 chunks with a rebuild script. It produced 107,789
 * bytes against a manifest claiming 116,809, and the archive would not open.
 * The only symptom anyone had was "the archive will not open" — which could
 * mean a bad zip, a bad script, a bad upload, or a bad file. It was truncated
 * chunks, and finding that out cost a round trip.
 *
 * `expect` publishes a table of sha256 AND BYTE COUNT per file. `verify` reads
 * it back. Then a truncated delivery does not report "will not open", it
 * reports "chunk 7: 8,192 bytes short" — and a file that is merely the WRONG
 * file, rather than a broken one, is caught by the same pass.
 *
 * Eeri does exactly this and it paid: `eeri/art-src/.../BINARY_STATUS.md`
 * published the sums first, so when the machine roster landed it was
 * identified BY HASH rather than by eye — which is what makes "do not infer
 * approval for discarded intermediate sheets" enforceable rather than a hope.
 *
 * No dependencies. Node's own crypto and fs.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const [cmd, dir, manifest] = process.argv.slice(2);
if (!['expect', 'verify'].includes(cmd) || !dir) {
  console.error('usage: art-manifest.cjs expect <dir> | verify <dir> <manifest.md>');
  process.exit(2);
}

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (!/\.(md|json)$/i.test(e.name)) out.push(p);
  }
  return out;
};
const sum = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const files = walk(dir).sort();

if (cmd === 'expect') {
  console.log(`# Delivery manifest — \`${dir}\`\n`);
  console.log('Published so a delivery can be checked **by hash, not by eye**. A short');
  console.log('file reports as short rather than as "the archive will not open".\n');
  console.log('| file | bytes | sha256 |');
  console.log('|---|---:|---|');
  for (const f of files) {
    console.log(`| \`${path.relative(dir, f)}\` | ${fs.statSync(f).size} | \`${sum(f)}\` |`);
  }
  process.exit(0);
}

// ---- verify ---------------------------------------------------------------
if (!manifest) { console.error('verify needs a manifest'); process.exit(2); }
const want = new Map();
for (const line of fs.readFileSync(manifest, 'utf8').split('\n')) {
  const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|\s*`([0-9a-f]{64})`\s*\|/);
  if (m) want.set(m[1], { bytes: +m[2], sha: m[3] });
}
if (!want.size) { console.error(`no entries parsed from ${manifest}`); process.exit(2); }

let bad = 0;
const seen = new Set();
for (const [rel, w] of want) {
  const p = path.join(dir, rel);
  if (!fs.existsSync(p)) { console.log(`  MISSING  ${rel}`); bad++; continue; }
  seen.add(rel);
  const got = fs.statSync(p).size, sha = sum(p);
  if (got !== w.bytes) {
    const d = w.bytes - got;
    console.log(`  ${d > 0 ? 'SHORT' : 'LONG '}    ${rel}  ${got} bytes, expected ${w.bytes} (${d > 0 ? d + ' short' : -d + ' over'})`);
    bad++;
  } else if (sha !== w.sha) {
    console.log(`  WRONG    ${rel}  right size, different content — a substitute, not a broken file`);
    bad++;
  } else {
    console.log(`  ok       ${rel}`);
  }
}
for (const f of files) {
  const rel = path.relative(dir, f);
  if (!want.has(rel)) console.log(`  EXTRA    ${rel}  (not in the manifest)`);
}
console.log(bad ? `\n✗ ${bad} file(s) do not match the manifest` : `\n✓ all ${want.size} files match`);
process.exit(bad ? 1 : 0);
