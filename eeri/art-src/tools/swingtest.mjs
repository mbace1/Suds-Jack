// Does a driven joint actually MOVE? Measure it, do not eyeball it.
//
//   node swingtest.mjs <rigged.glb> <nodeName>
//
// Drives the node's rotation.z the way the game does and reports where the far
// end of the limb lands at five angles. A limb that is not working reads as a
// flat column: Eeri's first T-posed rig moved his hand 0.006 units across a
// 1.8-radian swing, because the bind rotation was on the driven node and
// three.js composes euler XYZ as Rx·Ry·Rz — the game's z was applied while the
// arm still pointed along z, spinning it on its own axis. It looked completely
// plausible in a render. Numbers caught it; a picture did not.
// The work tree (playwright, three, and out/) lives outside the repo —
// generated meshes are not source. Set MESHY_WORK to point at it.
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
const HERE=WORK;
const MIME={'.glb':'model/gltf-binary','.js':'text/javascript','.html':'text/html'};
const PAGE=`<!doctype html><meta charset=utf-8><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body></body>`;
const s=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
if(u==='/r.html'){r.writeHead(200,{'content-type':'text/html'});return r.end(PAGE);}
const p=u.startsWith('/three/')?join(HERE,'node_modules/three',u.slice(6)):join(HERE,'meshy',u);
try{const b=await readFile(p);r.writeHead(200,{'content-type':MIME[extname(p)]||'application/octet-stream'});r.end(b);}
catch{r.writeHead(404);r.end();}}).listen(8945);
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await br.newPage(); pg.on('pageerror',e=>console.log('ERR:',e.message));
await pg.goto('http://localhost:8945/r.html',{waitUntil:'load'});
const out=await pg.evaluate(async({file,node})=>{
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const root=(await new GLTFLoader().loadAsync(file)).scene;
  const by={}; root.traverse(o=>by[o.name]=o);
  const arm=by[node]; if(!arm) return {error:'missing node '+node};
  const rows=[];
  for(const z of [-0.9,-0.45,0,0.45,0.9]){
    arm.rotation.z=z; root.updateMatrixWorld(true);
    const bb=new THREE.Box3().setFromObject(arm);
    rows.push({z, handX:+((bb.min.x+bb.max.x)/2).toFixed(3), lowY:+bb.min.y.toFixed(3),
               midZ:+((bb.min.z+bb.max.z)/2).toFixed(3)});
  }
  return {order:arm.rotation.order, rows};
},{file:process.argv[2]||'out/rigged/eeri_v2.glb', node:process.argv[3]||'armL'});
console.log(out.error||('euler order: '+out.order));
for(const r of out.rows||[]) console.log(`  swing z=${String(r.z).padStart(5)}  hand x ${String(r.handX).padStart(7)}  lowest y ${String(r.lowY).padStart(6)}  z ${String(r.midZ).padStart(6)}`);
await br.close(); s.close();
