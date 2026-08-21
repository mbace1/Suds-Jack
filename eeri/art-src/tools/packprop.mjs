#!/usr/bin/env node
/**
 * Pack a rigid Meshy prop into a shippable GLB.
 *
 * A 1-tile pickup came back at 3.3 MB, almost all of it a 1024² texture for
 * an object drawn 32 px wide. This re-exports it with the texture downsized
 * and the mesh recentred on its own footprint.
 *
 * Why downsize rather than `strip-textures.mjs` + a `paint` map: a Meshy prop
 * is ONE `mesh_node`, so a paint map can only give it ONE flat colour — and
 * the bolt's grey collar and the toolbox's red body are the read, not
 * decoration. §3.2 ("no asset invents a colour") is satisfied a different
 * way: the concepts are generated in the palette's own colours, and
 * `checkpalette.mjs` measures how far the baked texture drifts.
 *
 *   node packprop.mjs <in.glb> --out name.glb [--tex 128] [--height 0.5]
 *
 * --height rescales so the prop is that tall in TILES, and drops it so its
 * base sits on y=0 — the same origin rule every model in assets/README obeys.
 */
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
const HERE=WORK;
const MIME={'.glb':'model/gltf-binary','.js':'text/javascript','.html':'text/html'};
const argv=process.argv.slice(2); const flags={}; const pos=[];
for(let i=0;i<argv.length;i++){ if(argv[i].startsWith('--')) flags[argv[i].slice(2)]=argv[++i]; else pos.push(argv[i]); }
const TEX=Number(flags.tex||128), H=Number(flags.height||0), ANCHOR=flags.anchor||'center';
const PAGE=`<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body></body>`;
const s=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
if(u==='/r.html'){r.writeHead(200,{'content-type':'text/html'});return r.end(PAGE);}
const p=u.startsWith('/three/')?join(HERE,'node_modules/three',u.slice(6)):join(HERE,'meshy',u);
try{const b=await readFile(p);r.writeHead(200,{'content-type':MIME[extname(p)]||'application/octet-stream'});r.end(b);}
catch{r.writeHead(404);r.end();}}).listen(8952);
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await br.newPage(); await pg.goto('http://localhost:8952/r.html');
const b64 = await pg.evaluate(async ({file,TEX,H,ANCHOR})=>{
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
  const g=await new GLTFLoader().loadAsync('/'+file);
  const root=g.scene;
  // downsize every texture
  root.traverse(o=>{
    if(!o.isMesh) return;
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(!m?.map?.image) continue;
      const im=m.map.image, c=document.createElement('canvas');
      const s=Math.min(1,TEX/Math.max(im.width,im.height));
      c.width=Math.max(1,Math.round(im.width*s)); c.height=Math.max(1,Math.round(im.height*s));
      const cx=c.getContext('2d'); cx.imageSmoothingQuality='high';
      cx.drawImage(im,0,0,c.width,c.height);
      const t=new THREE.CanvasTexture(c);
      t.colorSpace=m.map.colorSpace; t.flipY=false; t.needsUpdate=true;
      const flat=new THREE.MeshLambertMaterial({ map:t, color:0xffffff });
      o.material=flat;
    }
  });
  // rescale to H tiles tall and sit the base on y=0
  if(H>0){
    const box=new THREE.Box3().setFromObject(root);
    const sz=box.getSize(new THREE.Vector3());
    const k=H/Math.max(sz.y,1e-6);
    root.scale.setScalar(k); root.updateMatrixWorld(true);
    const b2=new THREE.Box3().setFromObject(root);
    // A PICKUP FLOATS. The game places it at the cell CENTRE and bobs it, so
    // its origin is its centre — not the foot-contact rule that governs
    // things which stand on the ground. Anchor 'base' is there for props
    // that do stand.
    root.position.y -= (ANCHOR==='base') ? b2.min.y : (b2.min.y+b2.max.y)/2;
    root.position.x -= (b2.min.x+b2.max.x)/2;
    root.position.z -= (b2.min.z+b2.max.z)/2;
    root.updateMatrixWorld(true);
  }
  const buf=await new Promise((res,rej)=>new GLTFExporter().parse(root,res,rej,{binary:true}));
  let s2=''; const u8=new Uint8Array(buf);
  for(let i=0;i<u8.length;i+=8192) s2+=String.fromCharCode(...u8.subarray(i,i+8192));
  return btoa(s2);
}, {file:pos[0], TEX, H, ANCHOR});
const out=`out/pickups3d/${flags.out}`;
await writeFile(out, Buffer.from(b64,'base64'));
console.log(`→ ${out}  ${(Buffer.from(b64,'base64').length/1024).toFixed(0)} KB`);
await br.close(); s.close();
