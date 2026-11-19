#!/usr/bin/env node
// species.mjs — every species' own checks (test/species/<key>.mjs), in bare
// node, one process each so a crash names its species.
//
// Usage: node test/species.mjs [key ...]      (exit 1 on any failure)
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = join(dirname(fileURLToPath(import.meta.url)), 'species');
const want = process.argv.slice(2);
const files = readdirSync(here).filter((f) => f.endsWith('.mjs') && (!want.length || want.includes(f.slice(0, -4)))).sort();
let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [join(here, f)], { encoding: 'utf8', timeout: 120000 });
  const out = (r.stdout + r.stderr).trim();
  if (r.status !== 0) { failed++; console.log(`✗ ${f.slice(0, -4)}\n${out.split('\n').map((l) => '    ' + l).join('\n')}`); }
  else console.log(out.split('\n').pop());
}
console.log(failed ? `\n✗ species: ${failed} of ${files.length} failed` : `✔ species: ${files.length} modules`);
process.exit(failed ? 1 : 0);
