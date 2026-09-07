const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
const HERE=WORK;
const MIME={'.glb':'model/gltf-binary','.js':'text/javascript','.html':'text/html'};
const PAGE=`<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body></body>`;
const s=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
if(u==='/r.html'){r.writeHead(200,{'content-type':'text/html'});return r.end(PAGE);}
const p=u.startsWith('/three/')?join(HERE,'node_modules/three',u.slice(6)):join(HERE,'meshy',u);
try{const b=await readFile(p);r.writeHead(200,{'content-type':MIME[extname(p)]||'application/octet-stream'});r.end(b);}
catch{r.writeHead(404);r.end();}}).listen(8951);
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await br.newPage(); await pg.goto('http://localhost:8951/r.html');
for (const f of process.argv.slice(2)) {
  const r = await pg.evaluate(async (file) => {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const g = await new GLTFLoader().loadAsync('/' + file);
    const out=[]; const box=new THREE.Box3().setFromObject(g.scene); const sz=box.getSize(new THREE.Vector3());
    g.scene.traverse(o=>{ if(o.isMesh||o.isGroup||o.isObject3D) out.push(`${o.type}:${o.name||'(unnamed)'}`); });
    return { nodes: out.slice(0,10), size:[+sz.x.toFixed(2),+sz.y.toFixed(2),+sz.z.toFixed(2)], minY:+box.min.y.toFixed(2), imgs:(g.parser?.json?.images||[]).length };
  }, f);
  console.log(f.split('/').pop(), JSON.stringify(r));
}
await br.close(); s.close();
