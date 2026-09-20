#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = name => process.argv.includes(`--${name}`);

const input = arg('input');
const sheet = arg('sheet');
const data = arg('data');
const exe = arg('aseprite', process.env.ASEPRITE || 'aseprite');
const tag = arg('tag');
const run = has('run');

if (!input || !sheet || !data) {
  console.error('usage: node aseprite-export.mjs --input anim.aseprite --sheet out.png --data out.json [--tag move] [--aseprite /path/to/aseprite] [--run]');
  process.exit(2);
}

const args = ['-b', input];
if (tag) args.push('--tag', tag);
args.push('--sheet', sheet, '--data', data, '--format', 'json-array', '--list-tags', '--list-slices');

const packet = {
  executable: exe,
  args,
  input: path.normalize(input),
  sheet: path.normalize(sheet),
  data: path.normalize(data),
  tag: tag || null,
  run
};

if (!run) {
  console.log(JSON.stringify(packet, null, 2));
  process.exit(0);
}

fs.mkdirSync(path.dirname(sheet), { recursive: true });
fs.mkdirSync(path.dirname(data), { recursive: true });
const result = spawnSync(exe, args, { stdio: 'inherit' });
if (result.error) {
  console.error(`Aseprite CLI unavailable: ${result.error.message}`);
  process.exit(2);
}
process.exit(result.status ?? 0);
