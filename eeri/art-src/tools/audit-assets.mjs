#!/usr/bin/env node
/**
 * EERI — check every shipped model against the promise the manifest makes
 * about it, and against whether the game can reach it at all.
 *
 *   node eeri/art-src/tools/audit-assets.mjs [--strict]
 *
 * WHY THIS IS NOT COVERED BY THE OTHER GATES. `smoke.cjs` boots the game and
 * checks the assets the game ASKS FOR. That is the right thing and it is why
 * it cannot see this: an asset nothing asks for is, to the smoke gate, not a
 * problem — it is not there. So a `.glb` can be generated, cut, committed and
 * catalogued, and be **unreachable**, and every gate stays green.
 *
 * That is not hypothetical. `js/robots.js` builds every enemy in code and does
 * not import `assets.js` at all, so at the time of writing fifteen models —
 * every enemy and every kit prop — cannot be loaded by the game under any
 * circumstances. They are correct files answering a question nobody asks.
 *
 * So this tool asks the two questions the others do not:
 *
 *   1. DOES THE FILE KEEP ITS CONTRACT? Every name in `nodes`, every name in
 *      `clips`, every key in `paint`, and a skin for anything `rig: skinned`.
 *      A contracted node that is absent makes `getModel` fall back to the code
 *      placeholder with a console warning — the model silently does not appear
 *      and the game looks fine, which is the expensive kind of wrong.
 *   2. CAN THE GAME REACH IT? Something under `js/` has to name it in a
 *      `getModel('x', …)` or `getPiece('x', …)` call. Nothing else counts:
 *      a manifest entry is a catalogue, not a call site.
 *
 * It reads the GLB's own JSON chunk rather than loading it in a browser, so it
 * runs in BARE NODE with no GPU and no playwright — same reason `rooms.mjs`
 * and `fx-smoke.mjs` do, which is that a check you can afford on every edit is
 * a check that actually runs.
 *
 * `--strict` exits non-zero on a broken contract. Unreachable is reported but
 * never fatal: parking an asset ahead of the code that will use it is a
 * deliberate move in this project (`excavator_v2` says so in its own note),
 * and the point here is that it should be a decision rather than a surprise.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STRICT = process.argv.includes('--strict');

// ---- the GLB's own account of itself ------------------------------------
// A .glb is a 12-byte header then length-tagged chunks; the first is JSON and
// it carries every name the contract is written in. No decode, no GPU.
function glbJson(file) {
  const d = readFileSync(file);
  if (d.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a glb');
  let off = 12;
  while (off < d.length) {
    const len = d.readUInt32LE(off), type = d.readUInt32LE(off + 4);
    off += 8;
    if (type === 0x4e4f534a) return JSON.parse(d.toString('utf8', off, off + len));
    off += len;
  }
  throw new Error('no JSON chunk');
}

// Rough model height off the POSITION accessors' own min/max. Node transforms
// are ignored on purpose: this is not trying to be the bounding box, it is
// trying to catch the order-of-magnitude mistake — a rig authored in metres
// dropped into a world measured in tiles, which is exactly what put Eeri in a
// level at 0.95 units tall when he is 1.62.
// QUANTIZED MESHES HAVE NO READABLE MIN/MAX HERE. v15.22 rewrote every model
// with KHR_mesh_quantization, so POSITION is int16 and the accessor min/max
// are in quantization space — the real scale lives in the node transforms the
// extension writes. Reading them raw reports a 1.6-tile character as 65534
// units tall. This tool measured exactly that on its first run and called
// eeri, hopper, bucket and three bots BROKEN when every one of them was fine.
// Same failure as the band-brightness ruler: the page was right, the ruler was
// wrong. So the check is SKIPPED on a quantized file rather than guessed at —
// a measurement you cannot make is not a measurement you should report.
function quantized(j) {
  return (j.extensionsUsed || []).includes('KHR_mesh_quantization');
}

function roughHeight(j) {
  let lo = Infinity, hi = -Infinity;
  for (const m of j.meshes || []) {
    for (const p of m.primitives || []) {
      const a = j.accessors?.[p.attributes?.POSITION];
      if (!a?.min || !a?.max) continue;
      lo = Math.min(lo, a.min[1]); hi = Math.max(hi, a.max[1]);
    }
  }
  return hi > lo ? hi - lo : null;
}

// ---- can anything actually ask for it? ----------------------------------
const jsDir = path.join(ROOT, 'js');
const jsSrc = readdirSync(jsDir).filter(f => f.endsWith('.js'))
  .map(f => readFileSync(path.join(jsDir, f), 'utf8')).join('\n');
const asked = (name) =>
  new RegExp(`get(?:Model|Piece)\\(\\s*['"\`]${name}['"\`]`).test(jsSrc) ||
  // the flag picks its entry at the call site: getPiece(def.flag.big ? 'flagBig' : 'flag', …)
  new RegExp(`['"\`]${name}['"\`]\\s*:\\s*['"\`]`).test(jsSrc) ||
  new RegExp(`\\?\\s*['"\`]${name}['"\`]|['"\`]${name}['"\`]\\s*(?:,|\\))`).test(jsSrc);

const manifest = JSON.parse(readFileSync(path.join(ROOT, 'assets', 'manifest.json'), 'utf8'));

let broken = 0, unreachable = 0, checked = 0;
const rows = [];

for (const kind of ['models', 'pieces']) {
  for (const [name, e] of Object.entries(manifest[kind] || {})) {
    if (!e.file) continue;
    const file = path.join(ROOT, 'assets', e.file);
    const faults = [];
    let h = null, nodes = [], clips = [], skins = 0;

    // A `placeholder` entry with no file is not broken — it is the seam
    // working as designed: the catalogue names what the game will ask for and
    // the code draws its own until a file arrives. Only `live` promises bytes.
    if (!existsSync(file)) {
      if (e.status === 'live') faults.push('FILE MISSING');
      else { rows.push({ kind, name, status: e.status, reach: asked(name), faults: [], nodes: 0, clips: 0, pending: true }); checked++; continue; }
    } else {
      try {
        const j = glbJson(file);
        nodes = (j.nodes || []).map(n => n.name).filter(Boolean);
        clips = (j.animations || []).map(a => a.name).filter(Boolean);
        skins = (j.skins || []).length;
        h = roughHeight(j);

        for (const n of e.nodes || []) if (!nodes.includes(n)) faults.push(`node "${n}"`);
        for (const c of e.clips || []) if (!clips.includes(c)) faults.push(`clip "${c}"`);
        for (const p of Object.keys(e.paint || {})) if (!nodes.includes(p)) faults.push(`paint "${p}"`);
        if (e.rig === 'skinned' && !skins) faults.push('rig:skinned but no skin');
        // `height` is in TILES and the seam rescales to it, so this only flags
        // the case where there is nothing sane to rescale FROM
        if (e.height && h != null && !quantized(j) && (h < 0.01 || h > 100)) faults.push(`height ${h.toFixed(2)} unusable`);
      } catch (err) { faults.push(err.message); }
    }

    const reach = asked(name);
    if (!reach) unreachable++;
    if (faults.length) broken++;
    checked++;
    rows.push({ kind, name, status: e.status, reach, faults, nodes: nodes.length, clips: clips.length });
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\n  EERI asset audit — ${checked} shipped file(s)\n`);
console.log(`  ${pad('asset', 20)}${pad('kind', 8)}${pad('status', 13)}${pad('reachable', 11)}contract`);
console.log('  ' + '-'.repeat(76));
for (const r of rows.sort((a, b) => Number(a.reach) - Number(b.reach) || a.name.localeCompare(b.name))) {
  console.log(`  ${pad(r.name, 20)}${pad(r.kind, 8)}${pad(r.status, 13)}` +
    `${pad(r.reach ? 'yes' : 'NO', 11)}` +
    (r.faults.length ? 'BROKEN — ' + r.faults.join(', ')
      : r.pending ? 'not delivered yet (placeholder, no file)'
      : `ok (${r.nodes} nodes${r.clips ? `, ${r.clips} clips` : ''})`));
}

console.log(`\n  ${checked - broken}/${checked} keep their contract.`);
if (unreachable) {
  console.log(`  ${unreachable} cannot be reached by the game — nothing under js/ names them\n` +
    `  in a getModel()/getPiece() call, so no gate can see them either.`);
}
console.log('');
if (STRICT && broken) process.exit(1);
