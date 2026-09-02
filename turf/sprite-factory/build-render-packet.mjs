#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRenderPacket } from './render-packet-lib.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const candidates = JSON.parse(fs.readFileSync(path.join(root, 'candidates.json'), 'utf8'));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const character = arg('character');
const action = arg('action');
const direction = arg('direction');
const frameRaw = arg('frame');
const frame = Number(frameRaw);

if (!character || !action || !direction || !frameRaw) {
  console.error('usage: node build-render-packet.mjs --character <id> --action <id> --direction <front_iso|rear_iso> --frame <n>');
  process.exit(2);
}

try {
  const packet = buildRenderPacket(manifest, candidates, { character, action, direction, frame });
  process.stdout.write(JSON.stringify(packet, null, 2) + '\n');
} catch (error) {
  console.error(error.message);
  process.exit(2);
}
