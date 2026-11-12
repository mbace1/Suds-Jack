#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildPose, poseSvg } from './pose-control.mjs';
import { buildComfyJob } from './comfy-job.mjs';

const character='bottom_grey_hoodie';
const referenceRoot=process.argv[2] || 'work/reference-extract';
const outRoot=process.argv[3] || 'work/pilots/grey-hoodie';
const directions=['front_iso','rear_iso'];
const stages=[{action:'idle',frames:4},{action:'move',frames:12}];

fs.mkdirSync(outRoot,{recursive:true});
const plan={character,visibility:'hidden',policy:'idle must be approved before move is generated',stages:[]};
for(const stage of stages){
  const record={action:stage.action,blockedBy:stage.action==='move'?'idle_approved':null,jobs:[]};
  for(const direction of directions){
    const reference=path.join(referenceRoot,`${character}_${direction}.png`);
    for(let frame=1;frame<=stage.frames;frame++){
      const pose=buildPose({direction,action:stage.action,frame});
      const poseDir=path.join(outRoot,'poses',stage.action,direction);
      fs.mkdirSync(poseDir,{recursive:true});
      const poseImage=path.join(poseDir,`${String(frame).padStart(2,'0')}.svg`);
      fs.writeFileSync(poseImage,poseSvg(pose));
      const job=buildComfyJob({character,reference,direction,action:stage.action,frame,poseImage,outputDir:path.join(outRoot,'quarantine',stage.action,direction)});
      const jobDir=path.join(outRoot,'jobs',stage.action,direction);fs.mkdirSync(jobDir,{recursive:true});
      const jobFile=path.join(jobDir,`${String(frame).padStart(2,'0')}.json`);fs.writeFileSync(jobFile,JSON.stringify(job,null,2)+'\n');
      record.jobs.push({direction,frame,phase:pose.phase,reference,poseImage,jobFile,state:stage.action==='idle'?'ready_hidden':'blocked'});
    }
  }
  plan.stages.push(record);
}
fs.writeFileSync(path.join(outRoot,'plan.json'),JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({character,outRoot,idleJobs:8,moveJobs:24,moveBlocked:true,visibility:'hidden'},null,2));
