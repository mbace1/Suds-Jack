#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const input = arg('input');
const output = arg('output');
const profile = arg('profile', 'cut_binary_alpha');
const width = Number(arg('width', 192));
const height = Number(arg('height', 288));

if (!input || !output) {
  console.error('usage: node normalize.mjs --input in.png --output out.png [--profile prekey_magenta_plate|cut_binary_alpha] [--width 192 --height 288]');
  process.exit(2);
}
if (!['prekey_magenta_plate', 'cut_binary_alpha'].includes(profile)) {
  console.error(`unknown profile: ${profile}`);
  process.exit(2);
}

const image = sharp(input, { failOn: 'error' }).ensureAlpha();
const meta = await image.metadata();
const fitted = image.resize(width, height, { fit: 'contain', position: 'south', kernel: sharp.kernel.nearest });

if (profile === 'prekey_magenta_plate') {
  await fitted
    .flatten({ background: { r: 255, g: 0, b: 255 } })
    .png({ compressionLevel: 9 })
    .toFile(output);
} else {
  const { data, info } = await fitted.raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += info.channels) data[i] = data[i] >= 128 ? 255 : 0;
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output);
}

const outMeta = await sharp(output).metadata();
const report = {
  input: path.normalize(input),
  output: path.normalize(output),
  profile,
  source: { width: meta.width, height: meta.height },
  normalized: { width: outMeta.width, height: outMeta.height },
  anchor: 'south/feet',
  quantised: false
};
fs.writeFileSync(`${output}.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
