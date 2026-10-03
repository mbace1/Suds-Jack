#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { buildPose } from './pose-control.mjs';

function arg(name){const i=process.argv.indexOf(`--${name}`);return i>=0?process.argv[i+1]:null}

export function buildComfyJob({character,reference,direction,action,frame,poseImage,outputDir='work/quarantine'}){
  const pose=buildPose({direction,action,frame});
  if(!character||!reference||!poseImage) throw new Error('character, reference and poseImage are required');
  return {
    contract:'TURF pose-controlled generation v0.7',
    visibility:'hidden',
    character,
    identityReference:reference,
    poseControl:{type:'openpose_or_control_image',image:poseImage,strength:1.0,pose},
    identityControl:{type:'ip_adapter_or_reference_edit',reference,strength:'high'},
    camera:{direction,rule:'fixed tactical three-quarter isometric; never side/profile/cardinal'},
    render:{count:1,size:[192,288],background:'#FF00FF',text:false,shadow:false,vfx:false,contactSheet:false},
    negative:['side view','profile view','turnaround','multiple characters','multiple directions','sprite sheet','poster','dashboard','labels','frame numbers','cast shadow','special effects'],
    output:{directory:outputDir,state:'quarantine',surfaceToUser:false},
    release:'must pass TURF output, facing, duplicate, motion, drift and human approval gates before promotion'
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const character=arg('character'),reference=arg('reference'),direction=arg('direction'),action=arg('action'),frame=Number(arg('frame')),poseImage=arg('pose'),out=arg('out');
  try{
    const job=buildComfyJob({character,reference,direction,action,frame,poseImage});
    const json=JSON.stringify(job,null,2)+'\n';
    if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,json)} else process.stdout.write(json);
  }catch(e){console.error(e.message);process.exit(2)}
}
