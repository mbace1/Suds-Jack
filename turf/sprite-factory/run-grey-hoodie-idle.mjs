#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { executeJob } from './comfy-worker.mjs';
import { gateImage } from './output-gate.mjs';

function arg(name,fallback=null){const i=process.argv.indexOf(`--${name}`);return i>=0?process.argv[i+1]:fallback}
const planPath=arg('plan','work/pilots/grey-hoodie/plan.json');
const workflowPath=arg('workflow',process.env.TURF_COMFY_WORKFLOW);
const baseUrl=arg('url',process.env.COMFYUI_URL);
const outRoot=arg('out','work/pilots/grey-hoodie/quarantine');
if(!workflowPath||!baseUrl){console.error('requires COMFYUI_URL and TURF_COMFY_WORKFLOW (or --url/--workflow)');process.exit(2)}

const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));
const idle=plan.stages.find(s=>s.action==='idle');
if(!idle) throw new Error('idle stage missing from pilot plan');
const workflow=JSON.parse(fs.readFileSync(workflowPath,'utf8'));
const summary={character:plan.character,visibility:'hidden',stage:'idle',attempted:0,passedOutputGate:0,failed:0,records:[]};

for(const item of idle.jobs){
  const job=JSON.parse(fs.readFileSync(item.jobFile,'utf8'));
  const outputFile=path.join(outRoot,item.direction,`${String(item.frame).padStart(2,'0')}.png`);
  const rec={direction:item.direction,frame:item.frame,phase:item.phase,outputFile,state:'quarantine'};
  summary.attempted++;
  try{
    await executeJob({baseUrl,job,workflowTemplate:workflow,outputFile});
    const gate=await gateImage(outputFile);rec.outputGate=gate;
    if(!gate.pass){rec.state='rejected_output';summary.failed++}
    else {rec.state='awaiting_mechanical_validation';summary.passedOutputGate++}
  }catch(e){rec.state='worker_error';rec.error=e.message;summary.failed++}
  summary.records.push(rec);
}
fs.mkdirSync(path.dirname(planPath),{recursive:true});
const reportPath=path.join(path.dirname(planPath),'idle-run-report.json');
fs.writeFileSync(reportPath,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({reportPath,attempted:summary.attempted,passedOutputGate:summary.passedOutputGate,failed:summary.failed,visibility:'hidden'},null,2));
process.exit(summary.failed?1:0);
