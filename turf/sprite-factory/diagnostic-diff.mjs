#!/usr/bin/env node
import fs from 'node:fs';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const aPath = arg('a');
const bPath = arg('b');
const outPath = arg('out', 'sprite-diff.png');
const threshold = Number(arg('threshold', 0.1));

if (!aPath || !bPath) {
  console.error('usage: node diagnostic-diff.mjs --a frameA.png --b frameB.png [--out diff.png] [--threshold 0.1]');
  process.exit(2);
}

async function rgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

const A = await rgba(aPath);
const B = await rgba(bPath);
if (A.width !== B.width || A.height !== B.height) {
  console.error(`dimension mismatch: ${A.width}x${A.height} vs ${B.width}x${B.height}`);
  process.exit(2);
}

const diff = Buffer.alloc(A.width * A.height * 4);
const changed = pixelmatch(A.data, B.data, diff, A.width, A.height, {
  threshold,
  includeAA: true,
  alpha: 0.7,
  diffMask: false
});
await sharp(diff, { raw: { width: A.width, height: A.height, channels: 4 } }).png().toFile(outPath);

const report = {
  a: aPath,
  b: bPath,
  output: outPath,
  width: A.width,
  height: A.height,
  changedPixels: changed,
  changedRatio: changed / (A.width * A.height),
  threshold,
  purpose: 'diagnostic only; TURF spritekit validators remain mechanical authority'
};
fs.writeFileSync(`${outPath}.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
