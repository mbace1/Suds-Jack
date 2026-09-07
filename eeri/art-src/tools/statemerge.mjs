#!/usr/bin/env node
/**
 * EERI — merge a cut rig and its DESTROYED form into one GLB as sibling
 * states, per the manipulable-piece convention in assets/README.md: every
 * state ships in ONE file as sibling nodes `state0`, `state1`, …, sharing an
 * origin and registering against each other; the game shows exactly one.
 *
 *   node statemerge.mjs <rig.glb> <broken.glb> <out.glb> [length]
 *
 * Why one file and not two models: two files can drift — get re-exported at
 * different scales, or one updated and the other not — and a swap between
 * them then TELEPORTS the object. Sharing an origin in one file makes the
 * swap a visibility flip, which cannot miss.
 *
 * `state0` keeps the rig's named nodes (spring, eye, wheels…) as children, so
 * the drive contract is untouched — the game finds nodes by name wherever
 * they sit. `state1` is normalised the same way slice.mjs normalises its
 * source (longest horizontal axis scaled to `length`, feet at y=0, centred),
 * because the broken mesh comes from its OWN image-to-3D task and shares no
 * coordinate system with the intact one.
 */
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const HERE = process.env.MESHY_HERE || WORK;
const MIME = { '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.html': 'text/html' };
const [rig, broken, out, lenArg] = process.argv.slice(2);
if (!rig || !broken || !out) { console.error('usage: statemerge.mjs <rig.glb> <broken.glb> <out.glb> [length]'); process.exit(1); }
const LENGTH = +(lenArg || 1.0);

const PAGE = `<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body>`;
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/m.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  const p = u.startsWith('/three/') ? join(HERE, 'node_modules/three', u.slice(6)) : join(HERE, 'meshy', u);
  try { const b = await readFile(p); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(8953);

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await br.newPage();
await pg.goto('http://localhost:8953/m.html');

const b64 = await pg.evaluate(async ({ rig, broken, LENGTH }) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const load = (f) => new GLTFLoader().loadAsync('/' + f);

  const root = new THREE.Group();

  // state0: the cut rig, adopted whole so its node names survive untouched
  const g0 = await load(rig);
  const s0 = new THREE.Group(); s0.name = 'state0';
  for (const c of [...g0.scene.children]) s0.add(c);
  root.add(s0);

  // state1: the broken mesh, normalised onto state0's footprint
  const g1 = await load(broken);
  const s1 = new THREE.Group(); s1.name = 'state1';
  g1.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g1.scene);
  const size = box.getSize(new THREE.Vector3());
  const k = LENGTH / Math.max(size.x, size.z);
  const centre = box.getCenter(new THREE.Vector3());
  const holder = new THREE.Group();
  holder.scale.setScalar(k);
  holder.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);
  for (const c of [...g1.scene.children]) holder.add(c);
  s1.add(holder);
  root.add(s1);

  const names = [];
  root.traverse(o => { if (o.name && !o.isMesh) names.push(o.name); });
  const buf = await new GLTFExporter().parseAsync(root, { binary: true });
  let s = '', a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
  return { b64: btoa(s), names: names.join(' ') };
}, { rig, broken, LENGTH });

const buf = Buffer.from(b64.b64, 'base64');
await writeFile(out, buf);
console.log(`→ ${out}  ${(buf.length / 1048576).toFixed(2)} MB`);
console.log(`  nodes: ${b64.names}`);
await br.close(); server.close();
