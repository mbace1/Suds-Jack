#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function arg(name,fallback=null){const i=process.argv.indexOf(`--${name}`);return i>=0?process.argv[i+1]:fallback}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

export function bindWorkflow(template,bindings){
  const raw=JSON.stringify(template);
  return JSON.parse(raw.replace(/\{\{([A-Z0-9_]+)\}\}/g,(_,k)=>{
    if(!(k in bindings)) throw new Error(`missing workflow binding: ${k}`);
    return String(bindings[k]).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  }));
}

export async function uploadImage(baseUrl,file,fetchImpl=fetch){
  const form=new FormData();
  const buf=fs.readFileSync(file);
  form.append('image',new Blob([buf]),path.basename(file));
  const r=await fetchImpl(`${baseUrl.replace(/\/$/,'')}/upload/image`,{method:'POST',body:form});
  if(!r.ok) throw new Error(`upload failed ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function queuePrompt(baseUrl,prompt,clientId='turf-sprite-factory',fetchImpl=fetch){
  const r=await fetchImpl(`${baseUrl.replace(/\/$/,'')}/prompt`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,client_id:clientId})});
  if(!r.ok) throw new Error(`prompt failed ${r.status}: ${await r.text()}`);
  const j=await r.json();
  if(!j.prompt_id) throw new Error('ComfyUI response missing prompt_id');
  return j.prompt_id;
}

export async function waitHistory(baseUrl,promptId,{timeoutMs=600000,pollMs=1500,fetchImpl=fetch}={}){
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
    const r=await fetchImpl(`${baseUrl.replace(/\/$/,'')}/history/${encodeURIComponent(promptId)}`);
    if(!r.ok) throw new Error(`history failed ${r.status}: ${await r.text()}`);
    const j=await r.json();
    const entry=j[promptId]||j;
    if(entry?.status?.status_str==='error') throw new Error(`ComfyUI execution failed: ${JSON.stringify(entry.status)}`);
    if(entry?.outputs&&Object.keys(entry.outputs).length) return entry;
    await sleep(pollMs);
  }
  throw new Error(`ComfyUI timeout after ${timeoutMs}ms`);
}

export function outputImages(history){
  const found=[];
  for(const [nodeId,node] of Object.entries(history.outputs||{})) for(const image of node.images||[]) found.push({nodeId,...image});
  return found;
}

export async function downloadImage(baseUrl,image,destination,fetchImpl=fetch){
  const qs=new URLSearchParams({filename:image.filename,subfolder:image.subfolder||'',type:image.type||'output'});
  const r=await fetchImpl(`${baseUrl.replace(/\/$/,'')}/view?${qs}`);
  if(!r.ok) throw new Error(`view failed ${r.status}: ${await r.text()}`);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,Buffer.from(await r.arrayBuffer()));
  return destination;
}

export async function executeJob({baseUrl,job,workflowTemplate,outputFile,fetchImpl=fetch}){
  if(!baseUrl) throw new Error('COMFYUI_URL/--url required');
  if(job.visibility!=='hidden'||job.output?.surfaceToUser!==false||job.output?.state!=='quarantine') throw new Error('refusing non-hidden generation job');
  const ref=await uploadImage(baseUrl,job.identityReference,fetchImpl);
  const pose=await uploadImage(baseUrl,job.poseControl.image,fetchImpl);
  const workflow=bindWorkflow(workflowTemplate,{
    REFERENCE_IMAGE:ref.name,
    POSE_IMAGE:pose.name,
    OUTPUT_PREFIX:`turf_${job.character}_${job.camera.direction}_${job.poseControl.pose.action}_${String(job.poseControl.pose.frame).padStart(2,'0')}`
  });
  const promptId=await queuePrompt(baseUrl,workflow,'turf-sprite-factory',fetchImpl);
  const history=await waitHistory(baseUrl,promptId,{fetchImpl});
  const images=outputImages(history);
  if(images.length!==1) throw new Error(`expected exactly 1 output image, got ${images.length}`);
  await downloadImage(baseUrl,images[0],outputFile,fetchImpl);
  return {promptId,outputFile,visibility:'hidden',state:'quarantine'};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const jobPath=arg('job'),templatePath=arg('workflow'),outputFile=arg('out'),baseUrl=arg('url',process.env.COMFYUI_URL);
  if(!jobPath||!templatePath||!outputFile){console.error('usage: node comfy-worker.mjs --job job.json --workflow workflow-api.json --out quarantine.png [--url http://127.0.0.1:8188]');process.exit(2)}
  try{
    const job=JSON.parse(fs.readFileSync(jobPath,'utf8'));const template=JSON.parse(fs.readFileSync(templatePath,'utf8'));
    const result=await executeJob({baseUrl,job,workflowTemplate:template,outputFile});
    console.log(JSON.stringify(result,null,2));
  }catch(e){console.error(e.message);process.exit(1)}
}
