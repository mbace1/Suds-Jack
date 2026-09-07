// LOOK at a rigged GLB: node contract + three arm poses, driven through the
// SAME node names the game drives. A rig that passes a name check and folds
// itself inside out is the v5 failure; this is what catches it.
// The work tree (playwright, three, and out/) lives outside the repo —
// generated meshes are not source. Set MESHY_WORK to point at it.
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, basename } from 'node:path'
const HERE=WORK;
const MIME={'.glb':'model/gltf-binary','.js':'text/javascript','.html':'text/html'};
const file=process.argv[2];
const PAGE=`<!doctype html><meta charset=utf-8><style>body{margin:0;background:#c9d6de}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body></body>`;
const server=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
if(u==='/r.html'){r.writeHead(200,{'content-type':'text/html'});return r.end(PAGE);}
const p=u.startsWith('/three/')?join(HERE,'node_modules/three',u.slice(6)):join(HERE,'meshy',u);
try{const b=await readFile(p);r.writeHead(200,{'content-type':MIME[extname(p)]||'application/octet-stream'});r.end(b);}
catch{r.writeHead(404);r.end();}}).listen(8944);
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await br.newPage({viewport:{width:1280,height:620}});
pg.on('pageerror',e=>console.log('ERR:',e.message));
pg.on('console',m=>console.log(' ',m.text()));
await pg.goto('http://localhost:8944/r.html',{waitUntil:'load'});
await pg.evaluate(async(file)=>{
  const THREE=await import('three');
  const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
  const src=(await new GLTFLoader().loadAsync(file)).scene;
  const found=[]; src.traverse(o=>found.push(o.name));
  // the contract depends on what KIND of thing this is — a machine has a boom
  const need=found.includes('boom')
    ? ['house','boom','stick','bucket','seat','step','wheels']
    : ['hipL','hipR','body','armL','armR','head'];
  console.log('contract: '+need.map(n=>(found.includes(n)?'✓':'✗')+n).join(' '));
  const bb=new THREE.Box3().setFromObject(src), sz=bb.getSize(new THREE.Vector3());
  console.log('world size  x '+sz.x.toFixed(2)+'  y '+sz.y.toFixed(2)+'  z '+sz.z.toFixed(2));
  const r=new THREE.WebGLRenderer({antialias:true}); r.setSize(1280,620);
  r.setClearColor(0xc9d6de); document.body.appendChild(r.domElement);
  const sc=new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xd8ecf8,0x9a7c5a,1.25));
  const k=new THREE.DirectionalLight(0xffffff,1.35); k.position.set(-14,22,18); sc.add(k);
  const g=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshLambertMaterial({color:0xa87c52}));
  g.rotation.x=-Math.PI/2; sc.add(g);
  const MACHINE=found.includes('boom');
  // machines pose their arm; figures pose a run frame, a jump and a ride —
  // the three the game actually asks for
  const POSES=MACHINE?[[0,0,0],[-0.5,-0.5,-0.5],[0.5,-1.2,-1.0]]
    :[[0,0,0],[0.7,-0.6,0.5],[1.35,1.2,0.7]];
  POSES.forEach((p,i)=>{
    const c=src.clone(true);
    c.traverse(o=>{ if(o.isMesh){const m=o.material;
      o.material=new THREE.MeshLambertMaterial({map:m.map??null,color:m.color?.clone()??new THREE.Color(0xffffff)});}});
    const by={}; c.traverse(o=>by[o.name]=o);
    if(MACHINE){
      if(by.boom)by.boom.rotation.z=p[0];
      if(by.stick)by.stick.rotation.z=p[1];
      if(by.bucket)by.bucket.rotation.z=p[2];
    } else {
      if(by.hipL)by.hipL.rotation.z=p[0];
      if(by.hipR)by.hipR.rotation.z=-p[0];
      if(by.armL)by.armL.rotation.z=p[1];
      if(by.armR)by.armR.rotation.z=p[1]*0.8;
    }
    // a marker cube in the seat: it is where Eeri goes, so its SCALE matters
    if(by.seat){const s=new THREE.Mesh(new THREE.BoxGeometry(0.3,1.5,0.3),
      new THREE.MeshLambertMaterial({color:0xff2f8f})); s.position.y=0.75; by.seat.add(s);}
    c.position.set((i-1)*(MACHINE?4.6:1.5),0,0); sc.add(c);
  });
  const cam=new THREE.PerspectiveCamera(26,1280/620,0.1,100);
  if(MACHINE){cam.position.set(3.2,3.2,18);cam.lookAt(0,1.1,0);}
  else{cam.position.set(1.2,1.2,6.4);cam.lookAt(0,0.85,0);}
  r.render(sc,cam);
},file);
await pg.waitForTimeout(400);
await pg.screenshot({path:`out/slice/rig-${basename(file,'.glb')}.png`});
console.log(`→ out/slice/rig-${basename(file,'.glb')}.png`);
await br.close(); server.close();
