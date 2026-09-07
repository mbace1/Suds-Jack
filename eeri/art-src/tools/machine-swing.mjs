#!/usr/bin/env node
/**
 * EERI — THE SWING TEST for the machine fleet.
 *
 *   node machine-swing.mjs [machine …]      (default: all in DRIVE)
 *
 * A DEAD JOINT RENDERS PLAUSIBLY. That is the whole reason this exists. If a
 * cut predicate matched nothing, or matched the wrong triangles, or the node
 * was built but nothing was parented under it, the machine still loads, still
 * looks like a machine, and still sits there — and a render of it looks
 * completely fine. Eyeballing cannot catch that; only measuring can.
 *
 * So for every joint in `drive.js` this drives the node from `min` to `max`
 * and measures how far the node's own WORLD-SPACE geometry actually moved:
 *
 *   - it walks the node's descendants and unions their bounding boxes
 *   - at each end of the drive it records the centre of that box
 *   - the joint passes only if the centre moved more than THRESH
 *
 * Measuring the node's TRANSFORM would prove nothing — setting rotation.z
 * always changes rotation.z. It is the geometry hanging off it that has to
 * move, which is exactly what a 0-triangle node fails to do.
 *
 * A `spin` joint is checked the same way but about its own axis, and it gets
 * a tighter reading: a wheel whose pivot is off-centre wobbles instead of
 * rotating, so the test also records how far its CENTRE drifts over a full
 * turn. A true wheel's centre does not move at all.
 */
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { DRIVE } from '../machines/drive.js';

const HERE = process.env.MESHY_HERE || WORK;
const RIGGED = process.env.RIGGED || 'out/rigged';
const MIME = { '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.html': 'text/html' };

// how far geometry must move for a joint to count as alive, in model units
const THRESH = 0.02;
// how far a spun wheel's centre may drift before it is a wobble, not a spin
const WOBBLE = 0.01;

const PAGE = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#c9d6de}</style>
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body></body>`;

const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/swing.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  const p = u.startsWith('/three/') ? join(HERE, 'node_modules/three', u.slice(6)) : join(HERE, 'meshy', u);
  try {
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
}).listen(8944);

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(DRIVE);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
await page.goto('http://localhost:8944/swing.html');
await mkdir('out/swing', { recursive: true });

let bad = 0;
for (const name of wanted) {
  const spec = DRIVE[name];
  if (!spec) { console.log(`? ${name} — not in DRIVE`); continue; }
  const file = `${RIGGED}/${name === 'excavator' ? 'excavator_v2' : name + '_v1'}.glb`;

  const out = await page.evaluate(async ({ file, spec, THRESH, WOBBLE }) => {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync('/' + file);
    const root = gltf.scene;
    root.updateMatrixWorld(true);

    // union of the world bounding boxes of everything under `node`
    const spanOf = (node) => {
      const box = new THREE.Box3();
      let any = false;
      node.traverse((o) => {
        if (!o.isMesh) return;
        const b = new THREE.Box3().setFromObject(o);
        if (b.isEmpty()) return;
        any ? box.union(b) : box.copy(b);
        any = true;
      });
      return any ? box : null;
    };
    const centreOf = (node) => {
      root.updateMatrixWorld(true);
      const b = spanOf(node);
      return b ? b.getCenter(new THREE.Vector3()).toArray() : null;
    };
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

    const rows = [];
    for (const [jn, j] of Object.entries(spec.joints || {})) {
      const node = root.getObjectByName(jn);
      if (!node) { rows.push({ jn, verdict: 'MISSING NODE', move: 0 }); continue; }
      const tris = (() => { let n = 0; node.traverse(o => { if (o.isMesh) n += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; }); return Math.round(n); })();
      if (!tris) { rows.push({ jn, verdict: 'NO GEOMETRY', move: 0, tris: 0 }); continue; }

      const ax = j.axis || 'z';
      let move = 0, drift = 0, verdict = 'ok';

      if (j.ch === 'rot' || j.ch === 'wave') {
        const lo = j.ch === 'wave' ? -(j.amp ?? 0.1) : j.min;
        const hi = j.ch === 'wave' ? (j.amp ?? 0.1) : j.max;
        const keep = node.rotation[ax];
        node.rotation[ax] = lo; const a = centreOf(node);
        node.rotation[ax] = hi; const b = centreOf(node);
        node.rotation[ax] = j.rest ?? keep;
        move = a && b ? dist(a, b) : 0;
      } else if (j.ch === 'pos') {
        const keep = node.position[ax];
        node.position[ax] = keep + j.min; const a = centreOf(node);
        node.position[ax] = keep + j.max; const b = centreOf(node);
        node.position[ax] = keep + (j.rest ?? 0);
        move = a && b ? dist(a, b) : 0;
      } else if (j.ch === 'spin' || j.ch === 'turn') {
        // a spin must MOVE the rim and NOT move the centre
        const keep = node.rotation[ax];
        const c0 = centreOf(node);
        node.rotation[ax] = keep + Math.PI / 2;
        const c1 = centreOf(node);
        // rim travel: half the box diagonal is a fair proxy for radius
        const b = spanOf(node);
        const r = b ? b.getSize(new THREE.Vector3()).length() / 2 : 0;
        node.rotation[ax] = keep;
        move = r;                       // there is something to turn
        drift = c0 && c1 ? dist(c0, c1) : 0;
      }

      if (verdict === 'ok') {
        if (move < THRESH) verdict = 'DEAD';
        else if ((j.ch === 'spin' || j.ch === 'turn') && drift > WOBBLE) verdict = 'OFF-CENTRE';
      }
      rows.push({ jn, ch: j.ch, tris, move: +move.toFixed(4), drift: +drift.toFixed(4), verdict });
    }
    return { rows, nodes: (() => { const n = []; root.traverse(o => o.name && n.push(o.name)); return n; })() };
  }, { file, spec, THRESH, WOBBLE });

  const fails = out.rows.filter(r => r.verdict !== 'ok');
  bad += fails.length;
  console.log(`\n${name}  ${fails.length ? '✗' : '✓'}`);
  for (const r of out.rows) {
    const flag = r.verdict === 'ok' ? ' ' : '!';
    console.log(`  ${flag} ${r.jn.padEnd(9)} ${String(r.ch ?? '').padEnd(5)} ${String(r.tris ?? '').padStart(6)} tris  move ${String(r.move).padStart(7)}  drift ${String(r.drift ?? 0).padStart(7)}  ${r.verdict}`);
  }
}

console.log(bad ? `\n✗ ${bad} joint(s) failed` : '\n✓ every joint moves geometry');
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
