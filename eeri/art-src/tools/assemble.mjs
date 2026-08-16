#!/usr/bin/env node
/**
 * EERI — the rigging pipeline: part GLBs → one contracted, node-named GLB.
 *
 * Image-to-3D returns a single fused mesh with one node. `eeri/js/assets.js`
 * refuses any model missing its contracted nodes, because the game DRIVES
 * those nodes — W/S rotates `boom`, the run swings `hipL`/`hipR`, Eeri parents
 * to `seat`. So a machine or a character is generated PART BY PART, and this
 * assembles the rig.
 *
 * Each part is scaled to a declared world length and then translated so its
 * PIVOT lands on its node's origin. Anchors:
 *   hingeX     — pivot at the -x end (an arm swings about its hinge)
 *   baseCenter — sits on y = 0, centred (a body on a deck)
 *   topCenter  — hangs from y = 0, centred (a limb hanging from a joint)
 *   center     — centred on all axes (a head on a neck)
 *
 * Node names, pivot offsets and the rest pose are taken from each slot's
 * placeholder builder, so a live asset and the placeholder are
 * interchangeable — game code cannot tell which it got.
 *
 *   node assemble.mjs excavator|eeri
 *
 * NOTE: never run `gltf-transform optimize` on the result — its join/prune
 * passes merge the scene graph and silently destroy every node name. Use
 * `resize` then `webp`, which leave the graph alone.
 */
import { chromium } from '/tmp/claude-0/-home-user-Suds-Jack/8c6f8b94-82be-5dd4-8983-4375ef54b08e/scratchpad/node_modules/playwright/index.mjs'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'

const HERE = '/tmp/claude-0/-home-user-Suds-Jack/8c6f8b94-82be-5dd4-8983-4375ef54b08e/scratchpad';
const MIME = { '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.html': 'text/html' };

// ---------------------------------------------------------------- rigs
const RIGS = {
  excavator: {
    out: 'excavator_v1.glb',
    parts: {
      tracks: { file: 'out/parts/P-tracks.glb', len: 2.70, anchor: 'baseCenter' },
      house:  { file: 'out/parts/P-house.glb',  len: 1.95, anchor: 'baseCenter', shift: [-0.30, 0, 0] },
      boom:   { file: 'out/parts/P-boom.glb',   len: 1.65, anchor: 'hingeX' },
      stick:  { file: 'out/parts/P-stick.glb',  len: 1.10, anchor: 'hingeX' },
      bucket: { file: 'out/parts/P-bucket.glb', len: 0.62, anchor: 'hingeX' },
    },
    // [node, parent, [x,y,z], partName|null, restRotZ]
    tree: [
      ['tracks', null,     [0, 0, 0],          'tracks'],
      ['wheels', 'tracks', [0, 0, 0],           null],
      ['house',  null,     [0, 0.86, 0],       'house'],
      ['boom',   'house',  [0.35, 0.28, 0],    'boom',   0.52],
      ['stick',  'boom',   [1.58, 0, 0],       'stick', -1.35],
      ['bucket', 'stick',  [1.02, 0, 0],       'bucket', -0.6],
      ['seat',   'house',  [0.42, 0.12, 0],     null],
      ['step',   null,     [0.95, 0.55, 0.62],  null],
      ['beacon', 'house',  [-0.5, 1.1, 0.34],   null, 0, 'lamp'],
    ],
  },
  eeri: {
    out: 'eeri_v1.glb',
    parts: {
      head:  { file: 'out/kid/K-head.glb',  len: 0.62, anchor: 'center' },
      torso: { file: 'out/kid/K-torso.glb', len: 0.50, anchor: 'baseCenter' },
      arm:   { file: 'out/kid/K-arm.glb',   len: 0.46, anchor: 'topCenter', by: 'y' },
      leg:   { file: 'out/kid/K-leg.glb',   len: 0.56, anchor: 'topCenter', by: 'y' },
    },
    tree: [
      ['hipL', null,   [0, 0.56,  0.11], 'leg'],
      ['hipR', null,   [0, 0.56, -0.11], 'leg'],
      ['body', null,   [0, 0.56,  0],    'torso'],
      ['armL', 'body', [0, 0.44,  0.24], 'arm'],
      ['armR', 'body', [0, 0.44, -0.24], 'arm'],
      ['head', null,   [0, 1.12,  0],    'head'],
    ],
  },
};

const which = process.argv[2];
const RIG = RIGS[which];
if (!RIG) { console.error(`usage: node assemble.mjs ${Object.keys(RIGS).join('|')}`); process.exit(1); }

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
}).listen(8942);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
page.on('pageerror', e => console.log('ERR:', e.message));
await page.goto('http://localhost:8942/rig.html', { waitUntil: 'load' });

const b64 = await page.evaluate(async (RIG) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const loader = new GLTFLoader();
  const cache = new Map();

  async function part(name) {
    const spec = RIG.parts[name];
    // one load per FILE, cloned per use — a leg is used twice
    if (!cache.has(name)) cache.set(name, (await loader.loadAsync(spec.file)).scene);
    const root = cache.get(name).clone(true);
    root.updateMatrixWorld(true);
    let bb = new THREE.Box3().setFromObject(root);
    const size = bb.getSize(new THREE.Vector3());
    const measure = spec.by === 'y' ? size.y : Math.max(size.x, size.z);
    root.scale.setScalar(spec.len / (measure || 1));
    root.updateMatrixWorld(true);
    bb = new THREE.Box3().setFromObject(root);

    const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2, cz = (bb.min.z + bb.max.z) / 2;
    const holder = new THREE.Group();
    holder.name = name + '_mesh';
    holder.add(root);
    if (spec.anchor === 'hingeX')        { root.position.set(-bb.min.x, -cy, -cz); }
    else if (spec.anchor === 'baseCenter') { root.position.set(-cx, -bb.min.y, -cz); }
    else if (spec.anchor === 'topCenter')  { root.position.set(-cx, -bb.max.y, -cz); }
    else                                   { root.position.set(-cx, -cy, -cz); }
    if (spec.shift) root.position.add(new THREE.Vector3(...spec.shift));

    root.traverse(o => {
      if (!o.isMesh) return;
      const m = o.material;
      o.material = new THREE.MeshLambertMaterial({
        map: m.map ?? null,
        color: m.color?.clone() ?? new THREE.Color(0xffffff),
      });
    });
    return holder;
  }

  const rootNode = new THREE.Group();
  rootNode.name = RIG.out.replace('_v1.glb', '');
  const byName = {};

  for (const [name, parent, pos, partName, restZ, extra] of RIG.tree) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(...pos);
    if (restZ) g.rotation.z = restZ;
    if (partName) g.add(await part(partName));
    if (extra === 'lamp') {
      // the beacon is a LIGHT, not sculpture — unlit so it reads as emissive,
      // and it is the game's unmanned tell
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.17, 8),
        new THREE.MeshBasicMaterial({ color: 0xff9c1a }));
      lamp.position.y = 0.1; g.add(lamp);
      const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16),
        new THREE.MeshBasicMaterial({ color: 0xffdc8a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      flash.position.set(0.13, 0.1, 0); flash.rotation.y = Math.PI / 2; g.add(flash);
    }
    (parent ? byName[parent] : rootNode).add(g);
    byName[name] = g;
  }

  const buf = await new GLTFExporter().parseAsync(rootNode, { binary: true });
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}, RIG);

const buf = Buffer.from(b64, 'base64');
await writeFile(`out/rigged/${RIG.out}`, buf).catch(async () => {
  const { mkdir } = await import('node:fs/promises');
  await mkdir('out/rigged', { recursive: true });
  await writeFile(`out/rigged/${RIG.out}`, buf);
});
console.log(`${which} → out/rigged/${RIG.out} (${(buf.length / 1024).toFixed(0)} KB)`);
await browser.close();
server.close();
