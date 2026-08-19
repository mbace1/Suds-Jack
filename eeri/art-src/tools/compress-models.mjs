#!/usr/bin/env node
// EERI — shrink the shipped .glb models WITHOUT touching their contracts.
//
// Why: assets/3d reached 56 MB across two releases, immediately after the
// layer art went from 31 MB to 5.9 MB. Measured, the machines were the cost —
// each ~3.6 MB, and only ~23% of that was texture. The rest is vertex data
// stored as raw float32.
//
// WHAT THIS MAY NOT DO, and it is the whole reason this file exists rather
// than a one-line `gltf-transform optimize`:
//
//   `optimize` bundles `join` and `flatten`, which MERGE NODES. Run on the
//   crane it took 19 nodes to 1. Those node names ARE the seam — assets.js
//   looks up `house`, `boom`, `stick`, `bucket` by name and js/excavator.js
//   drives them — so a merge silently turns a rigged machine into one welded
//   lump that the game cannot articulate. The smoke gate checks the contract,
//   but a tool that needs a gate to catch it is a tool aimed at your foot.
//
// So: two passes only, both decoded NATIVELY by the vendored GLTFLoader with
// no extra decoder to ship —
//
//   quantize  KHR_mesh_quantization — float32 positions/normals/UVs become
//             int16/int8. A data layout, not a codec.
//   webp      EXT_texture_webp — the same picture, a fraction of the bytes.
//
// Draco and meshopt would beat both, and are deliberately NOT used: each
// needs a decoder module that is not in vendor/, and adding a runtime
// dependency to save disk is the wrong trade for a game that must boot on a
// phone with no build step.
//
// Every write is guarded: node names and animation-clip names are compared
// before and after, and a file whose contract moved is left alone.
//
// Run:  node art-src/tools/compress-models.mjs [--dry]

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets', '3d');
const DRY = process.argv.includes('--dry');

// The bits of a .glb the game actually promises: what things are called.
function contract(file) {
  const d = readFileSync(file);
  if (d.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a glb: ' + file);
  const len = d.readUInt32LE(12);
  const j = JSON.parse(d.toString('utf8', 20, 20 + len));
  return {
    nodes: (j.nodes || []).map((n) => n.name).filter(Boolean).sort(),
    clips: (j.animations || []).map((a) => a.name).filter(Boolean).sort(),
    skins: (j.skins || []).length,
  };
}
const same = (a, b) =>
  a.nodes.join('|') === b.nodes.join('|') &&
  a.clips.join('|') === b.clips.join('|') &&
  a.skins === b.skins;

const files = readdirSync(DIR).filter((f) => f.endsWith('.glb')).sort();
let before = 0, after = 0, done = 0, skipped = [];

for (const f of files) {
  const src = path.join(DIR, f);
  const b = statSync(src).size;
  before += b;
  const t1 = path.join('/tmp', `cm1-${f}`), t2 = path.join('/tmp', `cm2-${f}`);
  try {
    execFileSync('gltf-transform', ['quantize', src, t1], { stdio: 'pipe' });
    execFileSync('gltf-transform', ['webp', t1, t2], { stdio: 'pipe' });
    const c0 = contract(src), c1 = contract(t2);
    const a = statSync(t2).size;
    if (!same(c0, c1)) {
      skipped.push(`${f} — CONTRACT MOVED (nodes ${c0.nodes.length}→${c1.nodes.length}, clips ${c0.clips.length}→${c1.clips.length})`);
      after += b;
    } else if (a >= b) {
      skipped.push(`${f} — already small (${(b / 1024).toFixed(0)} kB, would grow)`);
      after += b;
    } else {
      if (!DRY) writeFileSync(src, readFileSync(t2));
      after += a;
      done++;
      console.log(`  ${f.padEnd(26)} ${(b / 1048576).toFixed(2)}M → ${(a / 1048576).toFixed(2)}M  (−${(100 - 100 * a / b).toFixed(0)}%)`);
    }
  } catch (e) {
    skipped.push(`${f} — ${String(e.message).split('\n')[0]}`);
    after += b;
  }
  for (const t of [t1, t2]) { try { unlinkSync(t); } catch {} }
}
console.log(`\n${done} rewritten${DRY ? ' (DRY RUN — nothing written)' : ''}: ` +
  `${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB ` +
  `(−${(100 - 100 * after / before).toFixed(0)}%)`);
if (skipped.length) console.log('left alone:\n  ' + skipped.join('\n  '));
