// MEASURE the rig, do not eyeball it. ART_PIPELINE's law: "a dead joint
// renders completely plausibly". So: bounding box, bone list, and how far
// each driven joint actually TRAVELS across each clip.
import { chromium } from '/tmp/claude-0/-home-user-Suds-Jack/8c6f8b94-82be-5dd4-8983-4375ef54b08e/scratchpad/node_modules/playwright/index.mjs'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'
const HERE='/tmp/claude-0/-home-user-Suds-Jack/8c6f8b94-82be-5dd4-8983-4375ef54b08e/scratchpad';
const MIME={'.glb':'model/gltf-binary','.js':'text/javascript','.html':'text/html'};
const PAGE=`<!doctype html><meta charset=utf-8><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body></body>`;
const s=createServer(async(q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);
if(u==='/r.html'){r.writeHead(200,{'content-type':'text/html'});return r.end(PAGE);}
const p=u.startsWith('/three/')?join(HERE,'node_modules/three',u.slice(6)):join(HERE,'meshy',u);
try{const b=await readFile(p);r.writeHead(200,{'content-type':MIME[extname(p)]||'application/octet-stream'});r.end(b);}
catch{r.writeHead(404);r.end();}}).listen(8947);
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await br.newPage();
pg.on('pageerror',e=>console.log('ERR',e.message));
await pg.goto('http://localhost:8947/r.html');
const r = await pg.evaluate(async (file) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const g = await new GLTFLoader().loadAsync('/' + file);
  const root = g.scene;
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const bones = [];
  root.traverse(o => { if (o.isBone) bones.push(o.name); });
  const clips = g.animations.map(a => ({ name: a.name, dur: +a.duration.toFixed(2), tracks: a.tracks.length }));

  // travel: sample each clip and record how far the named bones move
  const WATCH = ['LeftForeArm','RightForeArm','LeftLeg','RightLeg','LeftArm','RightArm','Spine','Head'];
  const found = WATCH.map(n => root.getObjectByName(n)).filter(Boolean);
  const out = {};
  for (const clip of g.animations) {
    const mixer = new THREE.AnimationMixer(root);
    const act = mixer.clipAction(clip); act.play();
    const pos = new Map(found.map(b => [b.name, []]));
    for (let i = 0; i < 24; i++) {
      mixer.setTime(clip.duration * i / 24);
      root.updateMatrixWorld(true);
      for (const b of found) {
        const v = new THREE.Vector3(); b.getWorldPosition(v);
        pos.get(b.name).push(v.clone());
      }
    }
    out[clip.name] = {};
    for (const [n, arr] of pos) {
      let max = 0;
      for (const a of arr) for (const b of arr) max = Math.max(max, a.distanceTo(b));
      out[clip.name][n] = +max.toFixed(3);
    }
    act.stop(); mixer.uncacheClip(clip);
  }
  return { size: [+size.x.toFixed(2), +size.y.toFixed(2), +size.z.toFixed(2)],
           minY: +box.min.y.toFixed(3), boneCount: bones.length,
           sample: bones.slice(0, 6), clips, travel: out };
}, process.argv[2]);
console.log(JSON.stringify(r, null, 1));
await br.close(); s.close();
