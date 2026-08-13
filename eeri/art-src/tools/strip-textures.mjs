#!/usr/bin/env node
// EERI — drop the textures a model never shows.
//
// ART_BRIEF §3.2/§5 forbid photo textures and PBR channels outright: the
// cast and the world have to read as one game, which is why `assets.js`
// repaints an incoming model to the palette (`paint` in the manifest). Once
// every textured material on a model is in that map, its images are bytes
// the browser downloads, decodes into blob URLs, and throws away.
//
// They are not free. Each one is an async blob load that is still in flight
// while the page settles, and the hub gate — which opens every game and
// moves on — caught them failing on teardown. Stripping them removes the
// error and the weight, and changes nothing on screen, because not one of
// those pixels was ever drawn.
//
// This does NOT touch geometry. Run it only when every textured material is
// covered by the model's `paint` map; the tool checks and refuses otherwise.
//
// Run: node eeri/art-src/tools/strip-textures.mjs <model-name>

import fs from 'node:fs';
import path from 'node:path';

const name = process.argv[2] || 'excavator';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'manifest.json'), 'utf8'));
const entry = manifest.models[name] || manifest.pieces?.[name];
if (!entry) throw new Error(`no model "${name}" in the manifest`);
const file = path.join(ROOT, 'assets', entry.file);

const buf = fs.readFileSync(file);
if (buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a GLB');
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
let p = 20 + jsonLen;
const binLen = buf.readUInt32LE(p);
const bin = buf.subarray(p + 8, p + 8 + binLen);

if (!json.images?.length) { console.log(`${name}: no images — nothing to strip`); process.exit(0); }

// ---- refuse unless the palette really does cover every textured material --
const painted = new Set(Object.keys(entry.paint || {}));
const ownerOf = new Map();                    // material index → true if repainted
const nodeName = (i) => json.nodes[i]?.name;
const walk = (i, owner) => {
  const n = json.nodes[i];
  const own = painted.has(n.name) ? n.name : owner;
  if (n.mesh != null && own) for (const pr of json.meshes[n.mesh].primitives) ownerOf.set(pr.material, true);
  for (const c of n.children || []) walk(c, own);
};
for (const s of json.scenes || []) for (const r of s.nodes || []) walk(r, null);
const textured = json.materials
  .map((m, i) => [i, m])
  .filter(([, m]) => JSON.stringify(m).includes('Texture'));
const unpainted = textured.filter(([i]) => !ownerOf.get(i));
if (unpainted.length) {
  console.error(`${name}: REFUSING — ${unpainted.length} textured material(s) are not covered by the paint map, so stripping would change what is on screen.`);
  process.exit(1);
}

// ---- drop images/textures/samplers and every reference to them ------------
const before = buf.length;
delete json.images; delete json.textures; delete json.samplers;
for (const m of json.materials) {
  const pbr = m.pbrMetallicRoughness || (m.pbrMetallicRoughness = {});
  delete pbr.baseColorTexture; delete pbr.metallicRoughnessTexture;
  delete m.normalTexture; delete m.occlusionTexture; delete m.emissiveTexture;
  if (!pbr.baseColorFactor) pbr.baseColorFactor = [1, 1, 1, 1];
  if (m.extensions?.EXT_texture_webp) delete m.extensions.EXT_texture_webp;
}
for (const k of ['extensionsUsed', 'extensionsRequired']) {
  if (json[k]) {
    json[k] = json[k].filter((e) => e !== 'EXT_texture_webp');
    if (!json[k].length) delete json[k];
  }
}

// ---- compact the buffer: keep only views the accessors still reach --------
const keep = new Set();
for (const a of json.accessors) {
  if (a.bufferView != null) keep.add(a.bufferView);
  if (a.sparse) {
    keep.add(a.sparse.indices.bufferView);
    keep.add(a.sparse.values.bufferView);
  }
}
const order = [...keep].sort((x, y) => x - y);
const remap = new Map(order.map((old, i) => [old, i]));   // old index → new index
const parts = [];
const newViews = [];
let offset = 0;
for (const old of order) {
  const v = json.bufferViews[old];
  const from = v.byteOffset || 0;
  const pad = (4 - (offset % 4)) % 4;                     // keep views 4-byte aligned
  if (pad) { parts.push(Buffer.alloc(pad)); offset += pad; }
  parts.push(bin.subarray(from, from + v.byteLength));
  newViews.push({ ...v, byteOffset: offset });
  offset += v.byteLength;
}
json.bufferViews = newViews;
for (const a of json.accessors) {
  if (a.bufferView != null) a.bufferView = remap.get(a.bufferView);
  if (a.sparse) {
    a.sparse.indices.bufferView = remap.get(a.sparse.indices.bufferView);
    a.sparse.values.bufferView = remap.get(a.sparse.values.bufferView);
  }
}
const newBin = Buffer.concat(parts);
json.buffers = [{ byteLength: newBin.length }];

// ---- write the GLB back --------------------------------------------------
const pad4 = (b, fill) => {
  const n = (4 - (b.length % 4)) % 4;
  return n ? Buffer.concat([b, Buffer.alloc(n, fill)]) : b;
};
const jsonChunk = pad4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
const binChunk = pad4(newBin, 0);
const header = Buffer.alloc(12);
header.write('glTF', 0, 'ascii');
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonChunk.length, 0); jh.write('JSON', 4, 'ascii');
const bh = Buffer.alloc(8); bh.writeUInt32LE(binChunk.length, 0); bh.write('BIN\0', 4, 'ascii');
fs.writeFileSync(file, Buffer.concat([header, jh, jsonChunk, bh, binChunk]));

console.log(`${name}: stripped ${textured.length} textured material(s) → ${entry.file}`);
console.log(`  ${before} → ${fs.statSync(file).size} bytes; bufferViews ${order.length}/${order.length + (before ? 0 : 0)} kept`);
