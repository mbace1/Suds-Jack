#!/usr/bin/env node
/**
 * EERI — compose a piece that BUILDS ITSELF into one GLB whose phases are
 * exclusive sibling nodes.
 *
 *   node phasemerge.mjs <cut.glb> <out.glb> \
 *        --always pole,base --phase "" --phase banner --phase banner,lamp,brace
 *
 * The flag's contract (assets/README.md, DESIGN §6.3) is that `pole` stands
 * from the first frame and `phase0/1/2` are EXCLUSIVE — each is the whole flag
 * at that stage, not the delta from the one before. The game shows exactly one
 * phase, the same rule `state0/state1` follows in statemerge.mjs.
 *
 * WHY THIS EXISTS RATHER THAN THREE IMAGE-TO-3D TASKS. The flag BUILDS, so
 * phase1 has to be the SAME flag as phase2 with less of it finished. Three
 * separate generations of "a flag at stage N" come back as three different
 * flags — same prompt, different object — and the build then reads as a cut
 * between two props instead of one prop being assembled. One mesh, sliced
 * once, with the phases composed from CUMULATIVE SUBSETS of its parts is the
 * only version that is honestly the same object three times. It is also a
 * third of the credits.
 *
 * Exclusive and cumulative together mean geometry is DUPLICATED on purpose:
 * the banner appears in phase1 and again in phase2. That is not waste — it is
 * what lets the game switch phases by toggling `visible` on one node instead
 * of walking a tree and diffing it.
 *
 * Nodes are rebased through the source root's world matrix rather than
 * reparented by hand, because slice.mjs emits a hierarchy (a wheel under a
 * wheels group under a body) and lifting a child out of it without its
 * parents' transforms moves it. That was the machine rig's most expensive
 * class of bug and there is no reason to meet it again here.
 */
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const HERE = process.env.MESHY_HERE || WORK;
const MIME = { '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.html': 'text/html' };

const argv = process.argv.slice(2);
const [src, out] = argv.filter(a => !a.startsWith('--') && !argv[argv.indexOf(a) - 1]?.startsWith('--'));
const listAfter = (flag) => {
  const r = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === flag) r.push((argv[i + 1] ?? '').split(',').map(s => s.trim()).filter(Boolean));
  return r;
};
const always = (listAfter('--always')[0] || []);
const phases = listAfter('--phase');
if (!src || !out || !phases.length) {
  console.error('usage: phasemerge.mjs <cut.glb> <out.glb> --always pole --phase "" --phase banner --phase banner,lamp');
  process.exit(1);
}

const PAGE = `<!doctype html><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body>`;
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/m.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  const p = u.startsWith('/three/') ? join(HERE, 'node_modules/three', u.slice(6)) : join(HERE, 'meshy', u);
  try { const b = await readFile(p); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(8954);

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await br.newPage();
await pg.goto('http://localhost:8954/m.html');

const res = await pg.evaluate(async ({ src, always, phases }) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const gltf = await new GLTFLoader().loadAsync('/' + src);
  const srcRoot = gltf.scene;
  srcRoot.updateMatrixWorld(true);

  const find = (n) => { let f = null; srcRoot.traverse(o => { if (!f && o.name === n) f = o; }); return f; };
  const missing = [];
  // A clone rebased into the OUTPUT root's space: take the node's world
  // matrix, which already carries every parent transform slice.mjs gave it.
  const lift = (name) => {
    const o = find(name);
    if (!o) { missing.push(name); return null; }
    const c = o.clone(true);
    c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.scale.set(1, 1, 1);
    c.applyMatrix4(o.matrixWorld);
    return c;
  };

  const root = new THREE.Group();
  root.name = 'root';

  // EVERY CLONE GETS A UNIQUE NAME, and this is not tidiness. `housePaint`
  // resolves a paint entry with `root.getObjectByName(node)`, which returns
  // the FIRST match and stops — so with the banner cloned into phase1 and
  // phase2 under the same name, one of them would be repainted to the palette
  // and the other would keep its Meshy texture. The flag would then change
  // colour as it built, and only on the last step. Suffixing by phase makes
  // every paintable part addressable, and the tool prints the keys so the
  // manifest is written from what is in the file rather than from memory.
  const painted = [];
  const poleGroup = new THREE.Group();
  poleGroup.name = 'pole';
  for (const n of always) {
    const c = lift(n);
    // the wrapper carries the contracted name, so the geometry inside takes a
    // distinct one — two objects called `pole` make getObjectByName a coin toss
    if (c) { c.name = `${n}_geo`; poleGroup.add(c); painted.push(c.name); }
  }
  root.add(poleGroup);

  const counts = [];
  phases.forEach((parts, i) => {
    const g = new THREE.Group();
    g.name = `phase${i}`;
    let n = 0;
    for (const p of parts) {
      const c = lift(p);
      if (c) { c.name = `${p}_p${i}`; g.add(c); painted.push(c.name); n++; }
    }
    // exclusive: the game shows exactly one, so only the first is visible in
    // the file. A file that ships every phase visible looks finished at rest
    // and nobody notices until the level does not build.
    // The file rests on phase0 so it opens sensibly in a viewer. THE EXPORT
    // MUST THEN BE TOLD onlyVisible:false — GLTFExporter's default is to
    // prune anything hidden, and it silently dropped phase1 and phase2 from
    // the first build. The GLB loaded, `pole` and `phase0` resolved, the file
    // was a plausible 1.5 MB, and the flag simply never built. statemerge.mjs
    // escapes this only because it never sets `visible` at all.
    g.visible = i === 0;
    counts.push(n);
    root.add(g);
  });

  const glb = await new Promise((ok, no) =>
    new GLTFExporter().parse(root, ok, no, { binary: true, onlyVisible: false }));
  let s = ''; const b = new Uint8Array(glb);
  for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192));
  return { b64: btoa(s), counts, missing: [...new Set(missing)], painted };
}, { src, always, phases });

await writeFile(out, Buffer.from(res.b64, 'base64'));
await br.close(); server.close();

if (res.missing.length) {
  // Loudly, and non-zero: a phase that silently loses a part still exports, and
  // the flag then "builds" by adding nothing. Same failure shape as the nine
  // dead joints — it loads, it is named right, and there is nothing in it.
  console.error(`✗ ${out}: no such node(s): ${res.missing.join(', ')}`);
  process.exit(1);
}
console.log(`→ ${out}  pole[${always.join(' ')}]  ` +
  res.counts.map((n, i) => `phase${i}:${n}`).join(' '));
console.log(`  paintable nodes: ${res.painted.join(' ')}`);
