#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { gateImage } from './output-gate.mjs';

function arg(name){const i=process.argv.indexOf(`--${name}`);return i>=0?process.argv[i+1]:null}
function has(name){return process.argv.includes(`--${name}`)}

export async function evaluateHiddenCandidate({input,reportPath}){
  const output=await gateImage(input);
  const report={visibility:'hidden',input,outputGate:output,mechanical:'pending_external_spritekit',humanApproval:false,promotable:false};
  if(reportPath){fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n')}
  return report;
}

export function promote({input,destination,report,approve=false}){
  if(!approve) throw new Error('promotion requires explicit --approve');
  if(!report?.outputGate?.pass) throw new Error('candidate failed output gate');
  if(report.mechanical!=='pass') throw new Error('candidate has not passed mechanical validators');
  if(report.facing!=='pass') throw new Error('candidate has not passed facing/isometric gate');
  if(report.duplicate!=='pass') throw new Error('candidate has not passed duplicate/uniqueness gate');
  if(report.humanApproval!==true) throw new Error('candidate has not been human approved');
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(input,destination);
  return {promoted:true,destination};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const input=arg('input'), reportPath=arg('report'), destination=arg('promote');
  if(!input){console.error('usage: node hidden-pipeline.mjs --input candidate.png [--report report.json] [--promote approved.png --approve]');process.exit(2)}
  const report=await evaluateHiddenCandidate({input,reportPath});
  if(destination){
    const external=reportPath&&fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):report;
    try{console.log(JSON.stringify(promote({input,destination,report:external,approve:has('approve')}),null,2))}catch(e){console.error(e.message);process.exit(1)}
  } else {
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    process.exit(report.outputGate.pass?0:1);
  }
}
