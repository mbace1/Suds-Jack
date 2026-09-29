#!/usr/bin/env node
// THE MST SCAFFOLDS — and the check a delivery must pass (v45).
//
//   node turf/tools/mst-export.mjs [outDir]        write every plate's automatic
//                                                  cut at NATIVE size (default
//                                                  turf/art-src/sprites/mst-scaffold/)
//   node turf/tools/mst-export.mjs --check f.png   run the art-bible check on a file
//   node turf/tools/mst-export.mjs --check-prop f.png
//
// A scaffold is the figure already on the right grid (MST_H tall), already
// outlined, already flattened — the starting point for a hand-finished
// sprite, so whoever paints it (turf/CODEX_BRIEF.md) fixes faces and
// highlights instead of guessing a size. Bare node, no dependencies: the PNG
// writer below is zlib plus a CRC.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { mstCut, mstProblems } from '../js/mstcut.js';
import { MST_H } from '../js/render.js';
import { readPng, inkBounds } from '../test/png.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, body) {
  const len = Buffer.alloc(4); len.writeUInt32BE(body.length);
  const tb = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(tb));
  return Buffer.concat([len, tb, c]);
}
export function writePng(file, { data, w, h }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  fs.writeFileSync(file, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

const args = process.argv.slice(2);
if (args[0] === '--check' || args[0] === '--check-prop') {
  const img = readPng(args[1]);
  const probs = mstProblems(img, args[0] === '--check' ? { height: MST_H, colours: 18 } : { colours: 18 });
  console.log(probs.length ? `FAIL ${args[1]}\n  - ${probs.join('\n  - ')}` : `ok   ${args[1]}`);
  process.exit(probs.length ? 1 : 0);
}

const out = args[0] || path.join(ROOT, 'art-src/sprites/mst-scaffold');
fs.mkdirSync(out, { recursive: true });
const files = [...new Set(['units.json', 'enemies.json'].flatMap(f =>
  [...fs.readFileSync(path.join(ROOT, 'data', f), 'utf8').matchAll(/"sprite": *"([^"]+)"/g)].map(m => m[1])))];
for (const f of files) {
  const png = readPng(path.join(ROOT, f));
  const cut = mstCut(png.data, png.w, png.h, inkBounds(png), { height: MST_H, colours: 18, punch: 0.35 });
  const name = path.basename(f);
  writePng(path.join(out, name), cut);
  console.log(`${name}  ${cut.w}x${cut.h}`);
}
console.log(`\n${files.length} scaffolds in ${path.relative(process.cwd(), out)} — each is ${MST_H}px of figure plus a 1px outline.`);
