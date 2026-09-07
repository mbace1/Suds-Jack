// Measure that every clip actually MOVES the bones it claims to. A clip that
// resolved its targets can still be flat — 72 tracks of one repeated key look
// identical to a rig at rest, and render identically too.
const { chromium } = await import(process.env.MESHY_WORK + '/node_modules/playwright/index.mjs');
import { readFile } from 'node:fs/promises'; import { createServer } from 'node:http'; import { extname, join } from 'node:path';
const HERE=process.env.MESHY_HERE, MIME={'.glb':'model/gltf-binary','.js':'text/javascript'};
const s=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
if(u==='/t.html'){r.writeHead(200,{'content-type':'text/html'});return r.end('<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body>');}
const p=u.startsWith('/three/')?join(HERE,'node_modules/three',u.slice(6)):join(HERE,'meshy',u);
try{const b=await readFile(p);r.writeHead(200,{'content-type':MIME[extname(p)]||'application/octet-stream'});r.end(b);}catch{r.writeHead(404);r.end();}}).listen(8951);
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await br.newPage(); await pg.goto('http://localhost:8951/t.html');
const rows=await pg.evaluate(async(f)=>{const THREE=await import('three');
const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
const g=await new GLTFLoader().loadAsync('/'+f);
const WATCH=['Hips','Spine','Head','RightArm','RightForeArm','RightUpLeg','RightLeg'];
const out=[];
for(const clip of g.animations){
  const mx=new THREE.AnimationMixer(g.scene); const act=mx.clipAction(clip); act.play();
  const samples=[];
  for(let i=0;i<=12;i++){ mx.setTime(clip.duration*i/12); g.scene.updateMatrixWorld(true);
    samples.push(WATCH.map(n=>{const o=g.scene.getObjectByName(n);return o?o.getWorldPosition(new THREE.Vector3()).clone():null;}));}
  act.stop();
  const spans=WATCH.map((n,j)=>{const pts=samples.map(s=>s[j]).filter(Boolean); if(!pts.length)return 0;
    const b=new THREE.Box3(); pts.forEach(p=>b.expandByPoint(p)); return b.getSize(new THREE.Vector3()).length();});
  out.push({name:clip.name,dur:+clip.duration.toFixed(2),spans:spans.map(v=>+v.toFixed(3)),watch:WATCH});}
return out;}, process.argv[2]||'out/rig/eeri_v5.glb');
const W=rows[0].watch;
console.log('clip'.padEnd(10),'dur'.padStart(5),W.map(w=>w.slice(0,8).padStart(9)).join(''));
let bad=0;
for(const r of rows){const moved=Math.max(...r.spans);
  const flag=moved<0.02?' DEAD':''; if(flag)bad++;
  console.log(r.name.padEnd(10),String(r.dur).padStart(5),r.spans.map(v=>String(v).padStart(9)).join(''),flag);}
console.log(bad?`\n✗ ${bad} flat clip(s)`:'\n✓ every clip moves the skeleton');
await br.close(); s.close(); process.exit(bad?1:0);
