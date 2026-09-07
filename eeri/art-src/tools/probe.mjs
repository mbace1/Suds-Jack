// Which local axis raises the right arm forward? Guessing costs a render each;
// asking costs one. Six poses: RightArm rotated +-1.1 about x, y, z.
const { chromium } = await import(process.env.MESHY_WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile } from 'node:fs/promises'; import { createServer } from 'node:http'; import { extname, join } from 'node:path';
const HERE=process.env.MESHY_HERE, MIME={'.glb':'model/gltf-binary','.js':'text/javascript'};
const s=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
if(u==='/t.html'){r.writeHead(200,{'content-type':'text/html'});return r.end('<!doctype html><style>body{margin:0;background:#c9d6de}</style><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body>');}
const p=u.startsWith('/three/')?join(HERE,'node_modules/three',u.slice(6)):join(HERE,'meshy',u);
try{const b=await readFile(p);r.writeHead(200,{'content-type':MIME[extname(p)]||'application/octet-stream'});r.end(b);}catch{r.writeHead(404);r.end();}}).listen(8950);
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await br.newPage({viewport:{width:1400,height:520}}); await pg.goto('http://localhost:8950/t.html');
const url=await pg.evaluate(async(f)=>{const THREE=await import('three');
const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
const poses=[['x',1.1],['x',-1.1],['y',1.1],['y',-1.1],['z',1.1],['z',-1.1]];
const W=1400,H=520,cv=document.createElement('canvas');cv.width=W;cv.height=H;const cx=cv.getContext('2d');
cx.fillStyle='#c9d6de';cx.fillRect(0,0,W,H);
const rend=new THREE.WebGLRenderer({antialias:true,alpha:true});rend.setSize(W/6,H,false);
for(let i=0;i<poses.length;i++){const [ax,a]=poses[i];
 const g=await new GLTFLoader().loadAsync('/'+f);const sc=new THREE.Scene();sc.add(g.scene);
 sc.add(new THREE.HemisphereLight(0xffffff,0x777788,2.4));
 const arm=g.scene.getObjectByName('RightArm'); if(arm) arm.rotation[ax]+=a;
 g.scene.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(g.scene),c=box.getCenter(new THREE.Vector3()),sz=box.getSize(new THREE.Vector3());
 const cam=new THREE.PerspectiveCamera(30,(W/6)/H,0.01,100);
 cam.position.set(c.x, c.y, c.z+Math.max(sz.x,sz.y)*2.6);cam.lookAt(c);
 rend.render(sc,cam);
 cx.drawImage(rend.domElement,i*(W/6),0);
 cx.fillStyle='#000';cx.font='15px monospace';cx.textAlign='center';cx.fillText(`${ax} ${a>0?'+':'-'}`,i*(W/6)+W/12,H-8);}
return cv.toDataURL('image/png');}, 'eeri_v4.glb');
await writeFile('out/rig/probe-arm.png',Buffer.from(url.split(',')[1],'base64'));console.log('out/rig/probe-arm.png');
await br.close(); s.close();
