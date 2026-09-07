#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { frameCoverage, projectProgress } from './progress-lib.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const candidates = JSON.parse(fs.readFileSync(path.join(root, 'candidates.json'), 'utf8'));
const summary = projectProgress(manifest, candidates);

const rows = [];
for (const character of manifest.characters) {
  for (const action of Object.keys(manifest.actions)) {
    for (const direction of manifest.directions) {
      const c = frameCoverage(manifest, candidates, { character: character.id, action, direction });
      rows.push({
        character: character.id,
        action,
        direction,
        approved: c.approved,
        required: c.total,
        complete: c.complete,
        missing: c.frames.filter(f => !f.candidate).map(f => f.frame)
      });
    }
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  policy: manifest.validation.progressPolicy,
  summary: {
    approvedFrames: summary.approvedFrames,
    requiredFrames: summary.requiredFrames,
    frameRatio: Number(summary.frameRatio.toFixed(6)),
    completeAnimations: summary.completeAnimations,
    animations: summary.animations
  },
  coverage: rows
};

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
} else {
  const pct = (summary.frameRatio * 100).toFixed(2);
  console.log(`TURF Sprite Factory progress: ${summary.approvedFrames}/${summary.requiredFrames} approved frames (${pct}%)`);
  console.log(`Complete animations: ${summary.completeAnimations}/${summary.animations}`);
  for (const row of rows.filter(r => r.approved > 0 || r.complete)) {
    console.log(`${row.character}  ${row.action}/${row.direction}  ${row.approved}/${row.required}${row.complete ? ' COMPLETE' : ''}`);
  }
}
