#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectProgress, frameCoverage } from './progress-lib.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const candidates=JSON.parse(fs.readFileSync(path.join(root,'candidates.json'),'utf8'));
const p=projectProgress(manifest,candidates);
console.log(`TURF Sprite Factory ${manifest.version}`);
console.log(`approved ${p.approvedFrames}/${p.requiredFrames} frames (${(p.frameRatio*100).toFixed(1)}%)`);
console.log(`complete animations ${p.completeAnimations}/${p.animations}`);
for(const ch of manifest.characters){
  let approved=0,total=0;
  for(const action of Object.keys(manifest.actions)) for(const direction of manifest.directions){
    const c=frameCoverage(manifest,candidates,{character:ch.id,action,direction});approved+=c.approved;total+=c.total;
  }
  console.log(`${ch.id.padEnd(28)} ${String(approved).padStart(3)}/${String(total).padEnd(3)} ${(100*approved/total).toFixed(1).padStart(5)}%`);
}
