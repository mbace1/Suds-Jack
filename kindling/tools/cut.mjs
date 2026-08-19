#!/usr/bin/env node
/**
 * Kindling — turn a generated sheet into cuttable game art.
 *
 *   node kindling/tools/cut.mjs key   <in> <out.png>
 *   node kindling/tools/cut.mjs fit   <in> <out.png> <W>x<H> [--palette P] [--no-quantise]
 *   node kindling/tools/cut.mjs anchors <in> [out.png] [--as WxH] [--tol N]
 *   node kindling/tools/cut.mjs slice <in> <outDir> <cell> [name,name,...]
 *   node kindling/tools/cut.mjs check <in> [--cell N] [--colours N] [--illustration]
 *
 * IT IS NOT KINDLING'S ANY MORE. Piritori ships art from the same magenta
 * pipeline but is not a pixel-art game and does not use this palette, so the
 * two Kindling assumptions baked in here are now flags: which palette `fit`
 * snaps to, and whether `check` expects 1:1 pixel art at all. The defaults are
 * unchanged, so every Kindling command in NANO_BANANA_PIPELINE.md still means
 * what it did.
 *
 * WHY THIS EXISTS. An image model does not produce game art. It produces an
 * illustration: no alpha channel, an arbitrary resolution, thousands of
 * colours, and antialiased edges. Every one of those has to come off before a
 * pixel can be cut, and doing it by eye in an editor is how a set of assets
 * drifts apart. So the four steps are a tool, and the tool is the same one for
 * every asset.
 *
 *   key    the magenta background becomes real alpha
 *   fit    down to the native grid, then snapped to the game's own palette
 *   slice  a grid sheet becomes one file per cell
 *   check  reports whether the result is actually 1:1 pixel art
 *
 * The image work runs in Chromium rather than a native image library, which is
 * how eeri/art-src/tools does it: canvas is already here, needs no build step
 * and no binary dependency, and this repo has been bitten before by a tool that
 * only ran on one machine.
 *
 * THE MAGENTA RULE. Ask the generator for a flat #FF00FF background. It is the
 * one colour that appears nowhere in this game's palette, so keying it cannot
 * eat any of the art — and a model that will not give you transparency will
 * happily give you a flat colour. `key` also DESPILLS (the halo of pink that
 * antialiasing leaves around every edge) and then bleeds the edge colour
 * outward under the transparent pixels, because a downscale samples pixels it
 * is about to make invisible and a fringe appears out of nothing.
 */

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
function playwright() {
  try { return require_('playwright'); } catch { /* not local */ }
  return require_(execSync('npm root -g').toString().trim() + '/playwright');
}

// ── the palette the art has to land on ──
// Read out of the game's own palette.js so a generated sheet and a code-drawn
// element cannot disagree about what colour the stone is. This is the whole
// reason `fit` quantises at all: a sheet with 4,000 colours in it is not in
// the same world as a scene built from thirty.
async function gamePalette(src) {
  const out = new Set();
  // walks arrays AND nested objects: Piritori keeps its city-service colours in
  // a { metro, tram, car } object, and a flat Object.values() pass dropped all
  // three on the floor without saying so.
  const walk = v => {
    if (typeof v === 'string') {
      if (/^#[0-9a-f]{6}$/i.test(v)) out.add(v.toLowerCase());
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };

  if (src && /\.json$/i.test(src)) {
    // a plain list of hex strings — how a project declares an ART palette that
    // is wider than the one its code draws with
    walk(JSON.parse(await readFile(src, 'utf8')));
  } else {
    const mod = await import(src
      ? new URL(path.resolve(src), 'file://')
      : new URL('../js/palette.js', import.meta.url));
    walk(mod.PAL ?? mod.default ?? mod);
  }
  return [...out];
}

const BROWSER = { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' };

async function withCanvas(fn) {
  const { chromium } = playwright();
  const br = await chromium.launch(BROWSER).catch(() => chromium.launch());
  const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');
  try { return await fn(pg); } finally { await br.close(); }
}

const toUrl = async (p) => {
  const ext = path.extname(p).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return `data:image/${mime};base64,${(await readFile(p)).toString('base64')}`;
};
const write = async (out, dataUrl) => {
  await mkdir(path.dirname(out), { recursive: true });
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  await writeFile(out, buf);
  return buf.length;
};

// ── the browser-side half ──
// One string, injected into the page, because everything here needs a canvas.
const LIB = `
function load(url){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=url;});}
function ctxOf(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;return[c,g];}

// magenta -> alpha, with despill and an outward bleed
function keyImage(img){
  const [c,g]=ctxOf(img.width,img.height);
  g.drawImage(img,0,0);
  const im=g.getImageData(0,0,c.width,c.height),d=im.data;
  for(let i=0;i<d.length;i+=4){
    const r=d[i],gg=d[i+1],b=d[i+2];
    // magenta is red AND blue high with green low. A ratio test rather than a
    // distance test, so a dark magenta edge keys as surely as a bright one.
    const mag=(r+b)/2, key=mag>60 && gg<mag*0.55;
    if(key){d[i+3]=0;continue;}
    // despill: pull green back up toward the mean where the pink has bled in
    const spill=(r+b)/2-gg;
    if(spill>18&&gg<200){const k=Math.min(1,(spill-18)/70);
      d[i]=r-(r-gg)*k*0.7; d[i+2]=b-(b-gg)*k*0.7;}
  }
  // bleed: give every transparent pixel the colour of its nearest opaque
  // neighbour, so a later downscale cannot sample magenta out of nothing
  const W=c.width,H=c.height,src=new Uint8ClampedArray(d);
  for(let pass=0;pass<2;pass++){
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=(y*W+x)*4; if(src[i+3]!==0)continue;
      let r=0,gg=0,b=0,n=0;
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H)continue;
        const j=(ny*W+nx)*4; if(src[j+3]===0)continue;
        r+=src[j];gg+=src[j+1];b+=src[j+2];n++;
      }
      if(n){d[i]=r/n;d[i+1]=gg/n;d[i+2]=b/n;}
    }
    src.set(d);
  }
  g.putImageData(im,0,0);
  return c;
}

// down to the native grid. AREA average first (so fine detail becomes a real
// mid-tone rather than whichever pixel nearest-neighbour happened to land on),
// then snap every pixel to the nearest palette colour. Alpha is forced binary:
// a half-transparent pixel in a 320x180 sprite is a smudge, not an edge.
function fitImage(img,W,H,pal){
  const [c,g]=ctxOf(W,H);
  g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
  g.drawImage(img,0,0,W,H);
  const im=g.getImageData(0,0,W,H),d=im.data;
  if(!pal){ // resize + binary alpha only
    for(let i=0;i<d.length;i+=4){ if(d[i+3]<128){d[i+3]=0;d[i]=d[i+1]=d[i+2]=0;} else d[i+3]=255; }
    g.putImageData(im,0,0); return c;
  }
  const P=pal.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]<128){d[i+3]=0;d[i]=d[i+1]=d[i+2]=0;continue;}
    d[i+3]=255;
    let best=0,bd=1e9;
    for(let k=0;k<P.length;k++){
      // weighted so the eye's own sensitivity decides, not raw RGB distance
      const dr=d[i]-P[k][0],dg=d[i+1]-P[k][1],db=d[i+2]-P[k][2];
      const dist=dr*dr*0.30+dg*dg*0.59+db*db*0.11;
      if(dist<bd){bd=dist;best=k;}
    }
    d[i]=P[best][0];d[i+1]=P[best][1];d[i+2]=P[best][2];
  }
  g.putImageData(im,0,0);
  return c;
}

// is this actually 1:1 pixel art? Halve it and double it back with nearest —
// true pixel art survives that unchanged, a faux-pixel illustration does not.
function inspect(img,cell){
  const [c,g]=ctxOf(img.width,img.height);
  g.drawImage(img,0,0);
  const d=g.getImageData(0,0,c.width,c.height).data;
  const cols=new Set(); let opaque=0, semi=0;
  for(let i=0;i<d.length;i+=4){
    if(d[i+3]===0)continue;
    if(d[i+3]<255)semi++;
    opaque++;
    cols.add((d[i]<<16)|(d[i+1]<<8)|d[i+2]);
  }
  // the round trip
  const [h,hg]=ctxOf(Math.max(1,c.width>>1),Math.max(1,c.height>>1));
  hg.drawImage(c,0,0,h.width,h.height);
  const [u,ug]=ctxOf(c.width,c.height);
  ug.drawImage(h,0,0,c.width,c.height);
  const a=d,b=ug.getImageData(0,0,c.width,c.height).data;
  let diff=0; for(let i=0;i<a.length;i+=4) if(Math.abs(a[i]-b[i])>16)diff++;
  const cells = cell ? { across: c.width/cell, down: c.height/cell } : null;
  return { w:c.width, h:c.height, colours:cols.size, opaque, semi,
           roundTrip: +(100*diff/(c.width*c.height)).toFixed(1), cells };
}

// ── anchors ──
// Registration dots: a pure colour that appears nowhere in the art, marking a
// point something else has to line up with. Same trick as the magenta key, one
// level down — cyan is the primary point, orange the secondary, and BOTH are
// read off and then erased, because a dot that ships is noise on a silhouette
// that is doing all the work.
function findAnchors(img,targets,tol){
  const [c,g]=ctxOf(img.width,img.height);
  g.drawImage(img,0,0);
  const im=g.getImageData(0,0,c.width,c.height), d=im.data, W=c.width, H=c.height;
  const out={};
  const claimed=new Uint8Array(W*H);
  for(const key of Object.keys(targets)){
    const T=targets[key];
    const mask=new Uint8Array(W*H);
    for(let i=0,p=0;i<d.length;i+=4,p++){
      if(d[i+3]<128)continue;
      const dr=d[i]-T[0],dg=d[i+1]-T[1],db=d[i+2]-T[2];
      if(dr*dr+dg*dg+db*db<=tol*tol){mask[p]=1;claimed[p]=1;}
    }
    // connected components, so three knee/elbow/shoulder dots of one colour
    // come back as three points rather than one centroid between them
    const seen=new Uint8Array(W*H), pts=[];
    for(let p=0;p<mask.length;p++){
      if(!mask[p]||seen[p])continue;
      let sx=0,sy=0,n=0; const st=[p]; seen[p]=1;
      while(st.length){
        const q=st.pop(), qx=q%W, qy=(q/W)|0;
        sx+=qx; sy+=qy; n++;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const nx=qx+dx, ny=qy+dy;
          if(nx<0||ny<0||nx>=W||ny>=H)continue;
          const r=ny*W+nx;
          if(mask[r]&&!seen[r]){seen[r]=1;st.push(r);}
        }
      }
      if(n>=4)pts.push({x:+(sx/n).toFixed(1),y:+(sy/n).toFixed(1),px:n});
    }
    pts.sort((a,b)=>a.y-b.y||a.x-b.x);
    out[key]=pts;
  }
  // erase: every claimed pixel takes the nearest unclaimed opaque colour, so
  // the dot leaves no hole and no halo behind it
  for(let p=0;p<claimed.length;p++){
    if(!claimed[p])continue;
    const x=p%W, y=(p/W)|0;
    let got=null;
    for(let r=1;r<=10&&!got;r++){
      for(let dy=-r;dy<=r&&!got;dy++)for(let dx=-r;dx<=r&&!got;dx++){
        if(Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;
        const nx=x+dx, ny=y+dy;
        if(nx<0||ny<0||nx>=W||ny>=H)continue;
        const q=ny*W+nx;
        if(claimed[q]||d[q*4+3]<128)continue;
        got=[d[q*4],d[q*4+1],d[q*4+2],d[q*4+3]];
      }
    }
    if(got){d[p*4]=got[0];d[p*4+1]=got[1];d[p*4+2]=got[2];d[p*4+3]=got[3];}
    else {d[p*4+3]=0;}
  }
  g.putImageData(im,0,0);
  return { points:out, w:W, h:H, url:c.toDataURL('image/png') };
}

// cut a grid sheet into one canvas per cell, skipping empty ones
function sliceImage(img,cell){
  const across=Math.floor(img.width/cell), down=Math.floor(img.height/cell);
  const out=[];
  for(let r=0;r<down;r++)for(let q=0;q<across;q++){
    const [c,g]=ctxOf(cell,cell);
    g.drawImage(img,q*cell,r*cell,cell,cell,0,0,cell,cell);
    const d=g.getImageData(0,0,cell,cell).data;
    let ink=0; for(let i=3;i<d.length;i+=4) if(d[i]>0)ink++;
    if(ink>2) out.push({ row:r, col:q, ink, url:c.toDataURL('image/png') });
  }
  return out;
}
`;

// ── the commands ──
const [cmd, ...rest] = process.argv.slice(2);

// --flag and --opt VALUE, without pulling in a dependency. `flagValues` is what
// keeps an option's VALUE from being mistaken for a positional argument.
const flagValues = new Set();
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--') && rest[i + 1] && !rest[i + 1].startsWith('--')
      && ['--palette', '--cell', '--colours', '--as', '--tol'].includes(rest[i])) flagValues.add(rest[i + 1]);
}
const flag = name => rest.includes(name);
const opt = name => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };

if (cmd === 'key') {
  const [src, out] = rest;
  const url = await toUrl(src);
  const dataUrl = await withCanvas(async pg => {
    await pg.addScriptTag({ content: LIB });
    return pg.evaluate(async u => keyImage(await load(u)).toDataURL('image/png'), url);
  });
  console.log(`→ ${out}  ${(await write(out, dataUrl) / 1024).toFixed(0)} KB`);

} else if (cmd === 'fit') {
  const [src, out, size] = rest.filter(a => !a.startsWith('--') && !flagValues.has(a));
  const [W, H] = size.split('x').map(Number);
  // --no-quantise keeps every colour: correct for illustration, where snapping
  // an ink-line painting to fourteen flats destroys it. The resize, the binary
  // alpha and the edge handling are all still worth having.
  const pal = flag('--no-quantise') ? null : await gamePalette(opt('--palette'));
  const url = await toUrl(src);
  const dataUrl = await withCanvas(async pg => {
    await pg.addScriptTag({ content: LIB });
    return pg.evaluate(async ({ u, W, H, pal }) =>
      fitImage(await load(u), W, H, pal).toDataURL('image/png'), { u: url, W, H, pal });
  });
  console.log(`→ ${out}  ${W}x${H}  `
    + (pal ? `snapped to ${pal.length} palette colours  ` : 'colours kept as generated  ')
    + `${(await write(out, dataUrl) / 1024).toFixed(1)} KB`);

} else if (cmd === 'anchors') {
  const [src, out] = rest.filter(a => !a.startsWith('--') && !flagValues.has(a));
  const scale = opt('--as');           // report coordinates as if fitted to WxH
  const tol = Number(opt('--tol') ?? 90);
  const url = await toUrl(src);
  const r = await withCanvas(async pg => {
    await pg.addScriptTag({ content: LIB });
    return pg.evaluate(async ({ u, tol }) => findAnchors(await load(u),
      { primary: [0, 255, 255], secondary: [255, 106, 0] }, tol), { u: url, tol });
  });
  const [SW, SH] = scale ? scale.split('x').map(Number) : [r.w, r.h];
  const fmt = p => `${Math.round(p.x * SW / r.w)},${Math.round(p.y * SH / r.h)}`;
  for (const key of Object.keys(r.points)) {
    const pts = r.points[key];
    console.log(`  ${key.padEnd(9)} ${pts.length ? pts.map(fmt).join('  ') : '— none found'}`
      + (scale && pts.length ? `   (as ${scale})` : ''));
  }
  if (!Object.values(r.points).some(p => p.length)) {
    console.log('  ! no anchor dots found — is the sheet keyed, and are the dots'
      + ' pure cyan #00FFFF / orange #FF6A00? raise --tol if the generator drifted.');
  }
  if (out) console.log(`→ ${out}  dots erased  ${(await write(out, r.url) / 1024).toFixed(1)} KB`);

} else if (cmd === 'slice') {
  const [src, dir, cellArg, namesArg] = rest;
  const cell = Number(cellArg);
  const names = (namesArg ?? '').split(',').filter(Boolean);
  const url = await toUrl(src);
  const cells = await withCanvas(async pg => {
    await pg.addScriptTag({ content: LIB });
    return pg.evaluate(async ({ u, cell }) => sliceImage(await load(u), cell), { u: url, cell });
  });
  await mkdir(dir, { recursive: true });
  let i = 0;
  for (const c of cells) {
    const name = names[i] ?? `r${c.row}c${c.col}`;
    await write(path.join(dir, `${name}.png`), c.url);
    i++;
  }
  console.log(`→ ${dir}  ${cells.length} non-empty cell(s) of ${cell}x${cell}`);
  if (names.length && names.length !== cells.length) {
    console.log(`   ! ${names.length} names given for ${cells.length} cells — check the grid`);
  }

} else if (cmd === 'check') {
  const cell = Number(opt('--cell') ?? 0);
  // an illustration is not meant to survive the half-scale round trip, and its
  // colour count is a different question. Saying so is better than shipping a
  // gate that cannot pass — this repo has done that before.
  const illustration = flag('--illustration');
  const maxColours = Number(opt('--colours') ?? (illustration ? 4096 : 64));
  const files = [];
  for (const src of rest.filter(a => !a.startsWith('--') && !flagValues.has(a))) {
    if (existsSync(src) && (await readdir(src).catch(() => null))) {
      for (const f of await readdir(src)) if (/\.(png|webp|jpg)$/i.test(f)) files.push(path.join(src, f));
    } else files.push(src);
  }
  let bad = 0;
  await withCanvas(async pg => {
    await pg.addScriptTag({ content: LIB });
    for (const f of files) {
      const r = await pg.evaluate(async ({ u, cell }) => inspect(await load(u), cell),
        { u: await toUrl(f), cell });
      const notes = [], soft = [];
      if (r.semi > 0) notes.push(`${r.semi}px SEMI-TRANSPARENT (must be binary)`);
      if (r.colours > maxColours) notes.push(`${r.colours} colours (expected <= ${maxColours})`);
      // THE ROUND TRIP ONLY DISCRIMINATES WHEN THE COLOUR COUNT DOES NOT.
      // Halving and doubling back destroys any 1px feature, so genuinely 1:1
      // art that is DENSE — a 26px sprite, a 16px icon — fails it just as an
      // illustration does. Measured: the reference illustrations lost 7.7-13%
      // with 6,500-9,200 colours; the delivered sprite sheets lost 4.5-10.4%
      // with 8-25. The loss does not separate them and the palette does.
      //
      // So the test is applied only where a file is not already provably pixel
      // art by its palette. Under 64 colours nothing an image model produces
      // survives, so the file has been quantised, and the round trip has
      // nothing left to tell us. This flagged six good sheets as failures on
      // its first real delivery, which is the whole reason for the change.
      const provable = r.colours <= 64;
      if (!illustration && !provable && r.roundTrip > 2) {
        notes.push(`${r.roundTrip}% lost on a half-scale round trip — NOT 1:1 pixel art`);
      } else if (!illustration && provable && r.roundTrip > 2) {
        soft.push(`${r.roundTrip}% lost halved — fine 1px detail, expected on dense sprites`);
      }
      if (cell && r.cells && (r.cells.across % 1 || r.cells.down % 1)) {
        notes.push(`${r.w}x${r.h} is not a whole number of ${cell}px cells`);
      }
      if (notes.length) bad++;
      console.log(`${notes.length ? 'FAIL' : '  ok'}  ${path.basename(f)}  ${r.w}x${r.h}  `
        + `${r.colours} colours  ${r.opaque}px ink`
        + (cell && r.cells ? `  ${r.cells.across}x${r.cells.down} cells` : ''));
      for (const n of notes) console.log(`        ${n}`);
      for (const n of soft) console.log(`        note: ${n}`);
    }
  });
  console.log(`\n${files.length - bad}/${files.length} usable`);
  process.exit(bad ? 1 : 0);

} else {
  console.log(`kindling/tools/cut.mjs — generated sheet -> cuttable game art

  key   <in> <out.png>                    magenta background -> real alpha
  fit   <in> <out.png> <W>x<H>            down to the native grid, snapped to the palette
          --palette <file.js|.json>       snap to another project's palette
          --no-quantise                   resize + binary alpha only (illustration)
  anchors <in> [out.png] [--as WxH]      read the cyan/orange registration dots,
          [--tol N]                       print their coordinates and erase them
  slice <in> <outDir> <cell> [names]      grid sheet -> one PNG per non-empty cell
  check <in|dir...> [--cell N]            is it actually 1:1 pixel art?
          --colours N                     raise the colour ceiling (default 64)
          --illustration                  skip the pixel-art round trip entirely

See kindling/art-src/NANO_BANANA_PIPELINE.md, or piritori/art-src/NANO_BANANA.md
for the illustration path.`);
}
