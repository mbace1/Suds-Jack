// Paired-phase / duplicate detector, built to the handover doc's spec:
//   1 background removed (frames already carry binary alpha)
//   2 normalise placement on the foot/origin anchor (bottom-centre of ink)
//   3 binary silhouette mask
//   4 IoU + changed-pixel ratio
//   5 leg region compared separately from torso/head
//   6 flag suspiciously high similarity
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LIB = `
function load(url){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=url;});}
function maskOf(img){
  const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
  const d=g.getImageData(0,0,c.width,c.height).data;
  const W=c.width,H=c.height;
  const m=new Uint8Array(W*H);
  let x0=W,y0=H,x1=-1,y1=-1;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const a=d[(y*W+x)*4+3];
    if(a>127){m[y*W+x]=1; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;}
  }
  return {m,W,H,box:{x0,y0,x1,y1}};
}
// anchor on bottom-centre of the ink: that is the foot/origin the doc asks for
function normalise(a,size){
  const {m,W,H,box}=a;
  const bw=box.x1-box.x0+1, bh=box.y1-box.y0+1;
  const out=new Uint8Array(size*size);
  const ax=(box.x0+box.x1)/2, ay=box.y1;              // foot anchor
  const ox=size/2, oy=size-1;
  for(let y=box.y0;y<=box.y1;y++)for(let x=box.x0;x<=box.x1;x++){
    if(!m[y*W+x])continue;
    const nx=Math.round(x-ax+ox), ny=Math.round(y-ay+oy);
    if(nx<0||ny<0||nx>=size||ny>=size)continue;
    out[ny*size+nx]=1;
  }
  return {mask:out,size,bw,bh};
}
function mirror(M,size){
  const out=new Uint8Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) out[y*size+x]=M[y*size+(size-1-x)];
  return out;
}
function compare(A,B,size,legSplit){
  let inter=0,uni=0,aOnly=0,bOnly=0;
  let legI=0,legU=0,topI=0,topU=0;
  const split=Math.round(size*(1-legSplit));           // lower legSplit fraction = legs
  for(let i=0;i<size*size;i++){
    const a=A[i],b=B[i];
    if(a||b)uni++;
    if(a&&b)inter++;
    if(a&&!b)aOnly++;
    if(b&&!a)bOnly++;
    const y=(i/size)|0;
    if(y>=split){ if(a||b)legU++; if(a&&b)legI++; }
    else { if(a||b)topU++; if(a&&b)topI++; }
  }
  return {
    iou: uni? inter/uni : 0,
    changed: uni? (aOnly+bOnly)/uni : 0,
    legIou: legU? legI/legU : 0,
    topIou: topU? topI/topU : 0,
  };
}
`;

(async () => {
  const dir = process.argv[2];
  const pairs = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  // WHICH REGION TO SCORE DEPENDS ON WHERE THE ANIMATION LIVES.
  // Locomotion differs in the legs, so the lower body is the signal and the
  // torso is noise. A melee swing or an idle breath barely moves the feet at
  // all — scoring those on the legs reports a near-duplicate for a perfectly
  // good frame, which happened here on a melee recover/ready pair (0.758 on
  // legs, distinct on the upper body). Pass the region that matches.
  const region = (process.argv[4] || 'lower').toLowerCase();
  if (!['lower', 'upper', 'full'].includes(region)) {
    console.log('region must be lower | upper | full'); process.exit(1);
  }
  const SIZE = 320, LEG_SPLIT = 0.42;
  const br = await chromium.launch();
  const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');
  await pg.addScriptTag({ content: LIB });

  const url = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64');

  console.log('pair'.padEnd(40), 'IoU'.padStart(6), (region === 'upper' ? 'topIoU' : region === 'full' ? 'IoU' : 'legIoU').padStart(7), 'mirrIoU'.padStart(8), '  verdict');
  console.log('-'.repeat(40), '-'.repeat(6), '-'.repeat(7), '-'.repeat(8), ' ', '-'.repeat(26));
  for (const [a, b, label] of pairs) {
    const r = await pg.evaluate(async ({ ua, ub, size, legSplit }) => {
      const A = normalise(maskOf(await load(ua)), size);
      const B = normalise(maskOf(await load(ub)), size);
      const direct = compare(A.mask, B.mask, size, legSplit);
      const flipped = compare(A.mask, mirror(B.mask,size), size, legSplit);
      return { ...direct, mirrorIou: flipped.iou, mirrorLegIou: flipped.legIou };
    }, { ua: url(a), ub: url(b), size: SIZE, legSplit: LEG_SPLIT });
    // score on the half the animation actually moves
    const scored = region === 'upper' ? r.topIou : region === 'full' ? r.iou : r.legIou;

    // thresholds: a genuine phase-opposite should differ a LOT in the leg region
    let verdict;
    if (r.mirrorIou >= 0.80) verdict = 'MIRROR of the other frame';
    else if (scored >= 0.80) verdict = `NEAR-DUPLICATE (${region})`;
    else if (scored >= 0.65) verdict = `suspicious (${region})`;
    else if (r.iou >= 0.85) verdict = 'NEAR-DUPLICATE overall';
    else verdict = 'distinct';
    console.log(
      (label || `${a} ↔ ${b}`).padEnd(40),
      r.iou.toFixed(3).padStart(6),
      scored.toFixed(3).padStart(7),
      r.mirrorIou.toFixed(3).padStart(8),
      ' ', verdict);
  }
  await br.close();
})();
