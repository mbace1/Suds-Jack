#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const W=192,H=288;
const phases=['left_contact','left_compression','left_push','left_pass','left_reach','left_precontact','right_contact','right_compression','right_push','right_pass','right_reach','right_precontact'];

export function assertDirection(direction){
  if(!['front_iso','rear_iso'].includes(direction)) throw new Error(`forbidden direction: ${direction}`);
}

function legPose(frame){
  const i=(frame-1)%12;
  const t=(i/12)*Math.PI*2;
  return {
    left:{x:Math.sin(t)*18,y:Math.cos(t)*8},
    right:{x:Math.sin(t+Math.PI)*18,y:Math.cos(t+Math.PI)*8},
    bob:Math.round(Math.cos(t*2)*3)
  };
}

export function buildPose({direction='front_iso',action='move',frame=1}){
  assertDirection(direction);
  if(action!=='move'&&action!=='idle') throw new Error('pose-control v0.7 currently supports idle/move only');
  if(action==='move'&&(frame<1||frame>12)) throw new Error('move frame must be 1..12');
  if(action==='idle'&&(frame<1||frame>4)) throw new Error('idle frame must be 1..4');
  const rear=direction==='rear_iso';
  const baseY=210;
  const leg=action==='move'?legPose(frame):{left:{x:0,y:0},right:{x:0,y:0},bob:[0,-2,-4,-2][frame-1]};
  const bias=rear?-1:1;
  const joints={
    head:[96+bias*4,76+leg.bob], neck:[96,104+leg.bob], pelvis:[96,164+leg.bob],
    lShoulder:[76,112+leg.bob], rShoulder:[116,112+leg.bob],
    lElbow:[70,139+leg.bob], rElbow:[122,139+leg.bob],
    lWrist:[75,159+leg.bob], rWrist:[117,159+leg.bob],
    lKnee:[84+leg.left.x*.45,190+leg.left.y], rKnee:[108+leg.right.x*.45,190+leg.right.y],
    lAnkle:[80+leg.left.x,baseY+leg.left.y], rAnkle:[112+leg.right.x,baseY+leg.right.y]
  };
  return {direction,action,frame,phase:action==='move'?phases[frame-1]:['rest','inhale','peak','exhale'][frame-1],joints};
}

export function poseSvg(p){
  const j=p.joints; const links=[['head','neck'],['neck','lShoulder'],['neck','rShoulder'],['lShoulder','lElbow'],['lElbow','lWrist'],['rShoulder','rElbow'],['rElbow','rWrist'],['neck','pelvis'],['pelvis','lKnee'],['lKnee','lAnkle'],['pelvis','rKnee'],['rKnee','rAnkle']];
  const lines=links.map(([a,b])=>`<line x1="${j[a][0]}" y1="${j[a][1]}" x2="${j[b][0]}" y2="${j[b][1]}"/>`).join('');
  const dots=Object.values(j).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="black"/><g stroke="white" stroke-width="5" stroke-linecap="round" fill="white">${lines}${dots}</g></svg>`;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const a=n=>{const i=process.argv.indexOf(`--${n}`);return i>=0?process.argv[i+1]:null};
  const direction=a('direction')||'front_iso', action=a('action')||'move', frame=Number(a('frame')||1), out=a('out');
  if(!out){console.error('usage: node pose-control.mjs --direction front_iso|rear_iso --action idle|move --frame N --out pose.png');process.exit(2)}
  const pose=buildPose({direction,action,frame}); fs.mkdirSync(path.dirname(out),{recursive:true});
  await sharp(Buffer.from(poseSvg(pose))).png().toFile(out); fs.writeFileSync(`${out}.json`,JSON.stringify(pose,null,2)+'\n');
  console.log(JSON.stringify({out,pose},null,2));
}
