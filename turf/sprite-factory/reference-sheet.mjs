#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

function arg(name, fallback=null){const i=process.argv.indexOf(`--${name}`);return i>=0?process.argv[i+1]:fallback}
const input=arg('input');
const outDir=arg('out','reference-extract');
const row=arg('row','bottom');
const characters=(arg('characters','')||'').split(',').map(s=>s.trim()).filter(Boolean);
if(!input||!characters.length){console.error('usage: node reference-sheet.mjs --input sheet.png --characters id1,id2,id3 [--row bottom] [--out dir]');process.exit(2)}

const image=sharp(input).ensureAlpha();
const meta=await image.metadata();
const {data,info}=await image.raw().toBuffer({resolveWithObject:true});
const {width,height,channels}=info;
const startY=row==='bottom'?Math.floor(height/2):0;
const endY=row==='top'?Math.floor(height/2):height;
const mask=new Uint8Array(width*height);
const isBg=(r,g,b)=>r>170&&b>170&&g<80&&Math.abs(r-b)<45;
for(let y=startY;y<endY;y++)for(let x=0;x<width;x++){const i=(y*width+x)*channels;mask[y*width+x]=isBg(data[i],data[i+1],data[i+2])?0:1}

const seen=new Uint8Array(mask.length);const comps=[];const qx=new Int32Array(mask.length);const qy=new Int32Array(mask.length);
for(let sy=startY;sy<endY;sy++)for(let sx=0;sx<width;sx++){
 const si=sy*width+sx;if(!mask[si]||seen[si])continue;
 let head=0,tail=0,area=0,minX=sx,maxX=sx,minY=sy,maxY=sy;qx[tail]=sx;qy[tail++]=sy;seen[si]=1;
 while(head<tail){const x=qx[head],y=qy[head++];area++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<startY||ny>=endY)continue;const ni=ny*width+nx;if(mask[ni]&&!seen[ni]){seen[ni]=1;qx[tail]=nx;qy[tail++]=ny}}
 }
 if(area>500)comps.push({area,minX,minY,maxX,maxY,width:maxX-minX+1,height:maxY-minY+1,centerX:(minX+maxX)/2});
}
const sprites=comps.sort((a,b)=>a.centerX-b.centerX).slice(0,characters.length*2);
if(sprites.length!==characters.length*2){console.error(`expected ${characters.length*2} sprites, found ${sprites.length}`);process.exit(1)}
fs.mkdirSync(outDir,{recursive:true});
const manifest=[];
for(let i=0;i<characters.length;i++)for(let j=0;j<2;j++){
 const c=sprites[i*2+j];const direction=j===0?'front_iso':'rear_iso';const pad=18;
 const left=Math.max(0,c.minX-pad),top=Math.max(0,c.minY-pad),right=Math.min(width,c.maxX+pad+1),bottom=Math.min(height,c.maxY+pad+1);
 const file=`${characters[i]}_${direction}.png`;const dest=path.join(outDir,file);
 await sharp(input).extract({left,top,width:right-left,height:bottom-top}).resize(192,288,{fit:'contain',position:'south'}).flatten({background:{r:255,g:0,b:255}}).png().toFile(dest);
 manifest.push({character:characters[i],direction,source:path.normalize(input),asset:path.normalize(dest),bbox:c});
}
fs.writeFileSync(path.join(outDir,'manifest.json'),JSON.stringify({row,count:manifest.length,records:manifest},null,2)+'\n');
console.log(JSON.stringify({row,count:manifest.length,outDir:path.normalize(outDir),records:manifest},null,2));
