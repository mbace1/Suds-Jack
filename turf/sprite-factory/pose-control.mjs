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
    left:{x:Math.sin(t)*16,y:Math.cos(t)*8},
    right:{x:Math.sin(t+Math.PI)*16,y:Math.cos(t+Math.PI)*8},
    bob:Math.round(Math.cos(t*2)*3)
  };
}

function isoSkeleton(direction,bob){
  const rear=direction==='rear_iso';
  // Explicit 3/4 tactical camera. Near/far limbs are offset in both X and Y,
  // so the skeleton itself cannot collapse into a side/profile pose.
  const near=rear?'left':'right';
  const far=rear?'right':'left';
  const shoulder={
    [near]:[rear?78:114,114+bob],
    [far]:[rear?112:80,107+bob]
  };
  const hip={
    [near]:[rear?86:108,166+bob],
    [far]:[rear?106:88,160+bob]
  };
  return {rear,near,far,shoulder,hip};
}

export function buildPose({direction='front_iso',action='move',frame=1}){
  assertDirection(direction);
  if(action!=='move'&&action!=='idle') throw new Error('pose-control v0.7 currently supports idle/move only');
  if(action==='move'&&(frame<1||frame>12)) throw new Error('move frame must be 1..12');
  if(action==='idle'&&(frame<1||frame>4)) throw new Error('idle frame must be 1..4');
  const leg=action==='move'?legPose(frame):{left:{x:0,y:0},right:{x:0,y:0},bob:[0,-2,-4,-2][frame-1]};
  const iso=isoSkeleton(direction,leg.bob);
  const headX=iso.rear?91:101;
  const baseY=214;
  const joints={
    head:[headX,76+leg.bob], neck:[96,104+leg.bob], pelvis:[96,163+leg.bob],
    lShoulder:iso.shoulder.left, rShoulder:iso.shoulder.right,
    lElbow:[iso.shoulder.left[0]-4,139+leg.bob+(iso.near==='left'?4:-2)],
    rElbow:[iso.shoulder.right[0]+4,139+leg.bob+(iso.near==='right'?4:-2)],
    lWrist:[iso.shoulder.left[0],160+leg.bob+(iso.near==='left'?5:-1)],
    rWrist:[iso.shoulder.right[0],160+leg.bob+(iso.near==='right'?5:-1)],
    lHip:iso.hip.left, rHip:iso.hip.right,
    lKnee:[iso.hip.left[0]+leg.left.x*.42,190+leg.left.y+(iso.near==='left'?4:-2)],
    rKnee:[iso.hip.right[0]+leg.right.x*.42,190+leg.right.y+(iso.near==='right'?4:-2)],
    lAnkle:[iso.hip.left[0]-8+leg.left.x,baseY+leg.left.y+(iso.near==='left'?5:-3)],
    rAnkle:[iso.hip.right[0]+8+leg.right.x,baseY+leg.right.y+(iso.near==='right'?5:-3)]
  };
  return {
    direction,action,frame,
    phase:action==='move'?phases[frame-1]:['rest','inhale','peak','exhale'][frame-1],
    camera:{type:'tactical_three_quarter_isometric',nearSide:iso.near,farSide:iso.far,sideProfileAllowed:false},
    joints
  };
}

export function poseIsIsometric(p){
  const j=p.joints;
  const shoulderDepth=Math.abs(j.lShoulder[1]-j.rShoulder[1]);
  const hipDepth=Math.abs(j.lHip[1]-j.rHip[1]);
  const shoulderWidth=Math.abs(j.lShoulder[0]-j.rShoulder[0]);
  const hipWidth=Math.abs(j.lHip[0]-j.rHip[0]);
  return shoulderDepth>=5&&hipDepth>=4&&shoulderWidth>=24&&hipWidth>=14&&p.camera?.sideProfileAllowed===false;
}

export function poseSvg(p){
  const j=p.joints;
  const links=[['head','neck'],['neck','lShoulder'],['neck','rShoulder'],['lShoulder','lElbow'],['lElbow','lWrist'],['rShoulder','rElbow'],['rElbow','rWrist'],['neck','pelvis'],['pelvis','lHip'],['pelvis','rHip'],['lHip','lKnee'],['lKnee','lAnkle'],['rHip','rKnee'],['rKnee','rAnkle']];
  const lines=links.map(([a,b])=>`<line x1="${j[a][0]}" y1="${j[a][1]}" x2="${j[b][0]}" y2="${j[b][1]}"/>`).join('');
  const dots=Object.values(j).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="black"/><g stroke="white" stroke-width="5" stroke-linecap="round" fill="white">${lines}${dots}</g></svg>`;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const a=n=>{const i=process.argv.indexOf(`--${n}`);return i>=0?process.argv[i+1]:null};
  const direction=a('direction')||'front_iso', action=a('action')||'move', frame=Number(a('frame')||1), out=a('out');
  if(!out){console.error('usage: node pose-control.mjs --direction front_iso|rear_iso --action idle|move --frame N --out pose.png');process.exit(2)}
  const pose=buildPose({direction,action,frame});
  if(!poseIsIsometric(pose)) throw new Error('pose failed isometric structural gate');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  await sharp(Buffer.from(poseSvg(pose))).png().toFile(out);
  fs.writeFileSync(`${out}.json`,JSON.stringify(pose,null,2)+'\n');
  console.log(JSON.stringify({out,pose},null,2));
}
