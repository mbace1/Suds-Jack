#!/usr/bin/env node
/**
 * Pack a Meshy-rigged character into ONE shippable GLB.
 *
 * Meshy returns the rigged mesh and each animation as its own ~7 MB GLB —
 * five clips is 35 MB of the same character five times. This takes the rigged
 * mesh once, lifts just the AnimationClip out of each animation file, renames
 * each to the game's own state name, downsizes the texture, and writes a
 * single file the asset seam can load.
 *
 *   node packchar.mjs <rigged.glb> idle:eeri-idle.glb run:eeri-run.glb … \
 *        --out eeri_v3.glb [--tex 512]
 *
 * The clip name IS the contract: the game asks for 'run', so the clip is
 * called 'run'. Meshy names them things like "Armature|running|baselayer".
 *
 * Set MESHY_WORK to the work tree holding node_modules/ and out/.
 */
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join } from 'node:path'

const MIME = { '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.html': 'text/html' };
const argv = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
  else pos.push(argv[i]);
}
const [rigged, ...clipArgs] = pos;
if (!rigged || !clipArgs.length) {
  console.error('usage: packchar.mjs <rigged.glb> name:clip.glb … --out out.glb [--tex 512]');
  process.exit(1);
}
const clips = clipArgs.map(a => { const i = a.indexOf(':'); return { name: a.slice(0, i), file: a.slice(i + 1) }; });
const OUT = flags.out || 'packed.glb';
const TEX = Number(flags.tex || 512);

const PAGE = `<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{
  "three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body></body>`;
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/p.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  const p = u.startsWith('/three/') ? join(WORK, 'node_modules/three', u.slice(6)) : join(WORK, 'meshy', u);
  try {
    const b = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end(); }
}).listen(8948);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
page.on('pageerror', e => console.log('ERR:', e.message));
page.on('console', m => console.log(' ', m.text()));
await page.goto('http://localhost:8948/p.html', { waitUntil: 'load' });

const b64 = await page.evaluate(async ({ rigged, clips, TEX }) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const loader = new GLTFLoader();

  const base = await loader.loadAsync(rigged);
  const root = base.scene;

  // Downsize the texture. Meshy ships 2K–4K albedo on a character that is
  // 40 px tall in game; the texture is essentially the entire file size.
  root.traverse(o => {
    if (!o.isMesh || !o.material?.map?.image) return;
    const img = o.material.map.image;
    const c = document.createElement('canvas');
    c.width = c.height = TEX;
    c.getContext('2d').drawImage(img, 0, 0, TEX, TEX);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = o.material.map.colorSpace;
    t.flipY = false;                 // glTF textures are already unflipped
    t.needsUpdate = true;
    // MeshBasic/Lambert conversion happens in-game; keep it simple here and
    // export a standard material carrying just the map and colour
    o.material = new THREE.MeshStandardMaterial({
      map: t, color: o.material.color?.clone() ?? new THREE.Color(0xffffff),
      metalness: 0, roughness: 1,
    });
  });

  // one clip per animation file, renamed to the game's own state name
  const anims = [];
  for (const { name, file } of clips) {
    const g = await loader.loadAsync(file);
    if (!g.animations.length) { console.log(`!! ${file} has no clip`); continue; }
    const clip = g.animations[0].clone();
    clip.name = name;
    anims.push(clip);
    console.log(`+ ${name}  ${clip.duration.toFixed(2)}s  ${clip.tracks.length} tracks`);
  }

  const buf = await new GLTFExporter().parseAsync(root, { binary: true, animations: anims });
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}, { rigged, clips, TEX });

const buf = Buffer.from(b64, 'base64');
await mkdir('out/rig', { recursive: true }).catch(() => {});
await writeFile(`out/rig/${OUT}`, buf);
console.log(`→ out/rig/${OUT}  (${(buf.length / 1024).toFixed(0)} KB)`);
await browser.close();
server.close();
