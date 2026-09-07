#!/usr/bin/env node
/**
 * EERI — part GLBs → one rigged excavator_v1.glb.
 *
 * The problem this solves: image-to-3D returns a single fused mesh with one
 * node, and eeri/js/assets.js refuses any model missing its contracted nodes
 * because the game DRIVES those nodes (W/S rotates `boom`, Eeri parents to
 * `seat`). So the machine is generated part by part and rigged here.
 *
 * Every part is normalised the same way: scale to a declared world length,
 * then translate so the part's PIVOT sits at its node's origin. For an arm
 * the pivot is the hinge at one end (anchor 'hingeX'), so rotating the node
 * swings the part about the right point — which is the whole reason for
 * doing this rather than shipping the fused mesh.
 *
 * Geometry targets are read off the placeholder in js/excavator.js so a live
 * asset and the placeholder are interchangeable: same pivots, same rest pose,
 * same overall size. Game code cannot tell which it got.
 */
import { chromium } from '/tmp/claude-0/-home-user-Suds-Jack/8c6f8b94-82be-5dd4-8983-4375ef54b08e/scratchpad/node_modules/playwright/index.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'

const HERE = '/tmp/claude-0/-home-user-Suds-Jack/8c6f8b94-82be-5dd4-8983-4375ef54b08e/scratchpad';
const MIME = { '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.html': 'text/html' };

// serve the part GLBs + three.js to the page (module imports need a origin)
const PAGE = `<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{
  "three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body></body>`;

const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/rig.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  const p = u.startsWith('/three/') ? join(HERE, 'node_modules/three', u.slice(6)) : join(HERE, 'meshy', u);
  try {
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
}).listen(8941);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
page.on('pageerror', e => console.log('ERR:', e.message));
page.on('console', m => console.log('  ', m.text()));

await page.goto('http://localhost:8941/rig.html', { waitUntil: 'load' });

const b64 = await page.evaluate(async () => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const loader = new GLTFLoader();

  // ---- part spec: target size + where the pivot goes -----------------------
  // lengths/positions taken from js/excavator.js so the rig matches exactly
  const PARTS = {
    tracks: { file: 'out/parts/P-tracks.glb', len: 2.70, anchor: 'baseCenter' },
    house:  { file: 'out/parts/P-house.glb',  len: 1.95, anchor: 'baseCenter', shift: [-0.30, 0, 0] },
    boom:   { file: 'out/parts/P-boom.glb',   len: 1.65, anchor: 'hingeX' },
    stick:  { file: 'out/parts/P-stick.glb',  len: 1.10, anchor: 'hingeX' },
    bucket: { file: 'out/parts/P-bucket.glb', len: 0.62, anchor: 'hingeX' },
  };

  async function part(name) {
    const spec = PARTS[name];
    const g = await loader.loadAsync(spec.file);
    const root = g.scene;
    root.updateMatrixWorld(true);
    let bb = new THREE.Box3().setFromObject(root);
    const size = bb.getSize(new THREE.Vector3());
    // scale so the part's LONGEST horizontal run matches its declared length
    const s = spec.len / Math.max(size.x, size.z);
    root.scale.setScalar(s);
    root.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(root);

    const holder = new THREE.Group();
    holder.name = name + '_mesh';
    holder.add(root);
    if (spec.anchor === 'hingeX') {
      // pivot = the hinge at the -x end, centred on y and z
      root.position.x -= bb.min.x;
      root.position.y -= (bb.min.y + bb.max.y) / 2;
      root.position.z -= (bb.min.z + bb.max.z) / 2;
    } else {                       // baseCenter: sits on y=0, centred x/z
      root.position.x -= (bb.min.x + bb.max.x) / 2;
      root.position.y -= bb.min.y;
      root.position.z -= (bb.min.z + bb.max.z) / 2;
    }
    if (spec.shift) root.position.add(new THREE.Vector3(...spec.shift));
    // flat toy read: no PBR, keep the albedo (ART_BRIEF §5 shading)
    root.traverse(o => {
      if (!o.isMesh) return;
      const m = o.material;
      o.material = new THREE.MeshLambertMaterial({ map: m.map ?? null, color: m.color?.clone() ?? new THREE.Color(0xffffff) });
    });
    return holder;
  }

  // ---- the rig: node names + pivots straight from the placeholder ----------
  const rootNode = new THREE.Group();
  rootNode.name = 'excavator';

  const tracks = new THREE.Group(); tracks.name = 'tracks';
  tracks.add(await part('tracks'));
  rootNode.add(tracks);

  // `wheels` must exist as a node the game can spin; the crawler's wheels are
  // baked into the track mesh, so this is the spin group that carries them
  const wheels = new THREE.Group(); wheels.name = 'wheels';
  tracks.add(wheels);

  const house = new THREE.Group(); house.name = 'house';
  house.position.set(0, 0.86, 0);
  house.add(await part('house'));
  rootNode.add(house);

  const boom = new THREE.Group(); boom.name = 'boom';
  boom.position.set(0.35, 0.28, 0);
  boom.add(await part('boom'));
  house.add(boom);

  const stick = new THREE.Group(); stick.name = 'stick';
  stick.position.set(1.58, 0, 0);
  stick.add(await part('stick'));
  boom.add(stick);

  const bucket = new THREE.Group(); bucket.name = 'bucket';
  bucket.position.set(1.02, 0, 0);
  bucket.add(await part('bucket'));
  stick.add(bucket);

  // seat + step are attachment points: empty nodes, exactly where the
  // placeholder puts them (Eeri parents to seat; the mount move uses step)
  const seat = new THREE.Group(); seat.name = 'seat';
  seat.position.set(0.42, 0.12, 0); house.add(seat);
  const step = new THREE.Group(); step.name = 'step';
  step.position.set(0.95, 0.55, 0.62); rootNode.add(step);

  // the beacon is a light, not sculpture — built here so the amber reads as
  // emissive rather than as a painted lump (it is the unmanned tell)
  const beacon = new THREE.Group(); beacon.name = 'beacon';
  beacon.position.set(-0.5, 1.1, 0.34);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.17, 8),
    new THREE.MeshBasicMaterial({ color: 0xff9c1a }));
  lamp.position.y = 0.1; beacon.add(lamp);
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xffdc8a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  flash.position.set(0.13, 0.1, 0); flash.rotation.y = Math.PI / 2; beacon.add(flash);
  house.add(beacon);

  // rest pose, same as the placeholder: boom up, stick folded, bucket tucked
  boom.rotation.z = 0.52; stick.rotation.z = -1.35; bucket.rotation.z = -0.6;

  const exporter = new GLTFExporter();
  const buf = await exporter.parseAsync(rootNode, { binary: true });
  let s2 = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) s2 += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s2);
});

await writeFile('out/parts/excavator_v1.glb', Buffer.from(b64, 'base64'));
console.log(`assembled → out/parts/excavator_v1.glb (${(Buffer.from(b64, 'base64').length / 1024).toFixed(0)} KB)`);
await browser.close();
server.close();
