#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const candidates = JSON.parse(fs.readFileSync(path.join(root, 'candidates.json'), 'utf8'));

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}

const character = arg('character');
const action = arg('action');
const direction = arg('direction');
const frame = Number(arg('frame'));

if (!character || !action || !direction || !frame) {
  console.error('usage: node build-render-packet.mjs --character <id> --action <id> --direction <front_iso|rear_iso> --frame <n>');
  process.exit(2);
}

const char = manifest.characters.find(c => c.id === character);
if (!char) throw new Error(`Unknown character: ${character}`);
if (!manifest.actions[action]) throw new Error(`Unknown action: ${action}`);
if (!manifest.directions.includes(direction)) throw new Error(`Unknown direction: ${direction}`);

const approved = candidates.records.filter(r => r.character === character && r.action === action && r.direction === direction && r.status === 'approved');
const previous = approved.filter(r => r.frame < frame).sort((a,b)=>b.frame-a.frame)[0] || null;
const oppositeDirection = direction === 'front_iso' ? 'rear_iso' : 'front_iso';
const paired = candidates.records.find(r => r.character === character && r.action === action && r.direction === oppositeDirection && r.frame === frame && r.status === 'approved') || null;

const packet = {
  contract: 'TURF clean render packet v1',
  character: { id: char.id, label: char.label, source: char.source },
  target: { action, direction, frame, targetFrames: manifest.actions[action].targetFrames },
  invariants: [
    'character identity', 'face and hair', 'costume design', 'palette family',
    'camera and facing', 'apparent scale', 'game-space origin', 'weapon state unless action requires change'
  ],
  references: {
    characterMaster: char.source,
    previousApprovedFrame: previous?.asset || null,
    pairedApprovedFrame: paired?.asset || null
  },
  output: {
    count: 1,
    background: manifest.validation.background,
    text: false,
    shadow: false,
    vfx: false,
    preferredPlate: manifest.validation.preferredPlate,
    quantise: manifest.validation.quantise
  },
  rule: 'Do not include the Sprite Bible, historical discussion, scoring language, phase tables, legends, posters, contact sheets or rejected imagery in the renderer context.'
};

process.stdout.write(JSON.stringify(packet, null, 2) + '\n');
