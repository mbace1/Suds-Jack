#!/usr/bin/env node
/**
 * ADD animation clips to an already-packed character, keeping the ones it has.
 *
 *   node addclips.mjs <base.glb> name:clip.glb … --out <out.glb>
 *
 * Why this exists rather than re-running `packchar.mjs`. packchar builds a
 * character from a rigged mesh plus one clip file per clip — so re-running it
 * to add a ninth clip means having all eight originals as separate files, and
 * rebuilding the shipped mesh and texture from scratch. The mesh and texture
 * in `eeri_v4.glb` are known good and live. Adding to them risks nothing;
 * rebuilding them risks everything, for no gain.
 *
 * THE SAFETY CHECK IS THE POINT. A clip is a list of tracks addressed BY NODE
 * NAME (`Armature|mixamorig:LeftArm.quaternion`). Dropping a clip from one
 * skeleton onto another does not error — three.js simply finds no node for
 * the track and animates nothing, silently. So every incoming track's target
 * is resolved against the base skeleton first, and a clip with ANY unresolved
 * target is refused by name rather than shipped dead.
 *
 * That matters here specifically: these clips come from a SECOND rig task,
 * created from the same source mesh months later because Meshy's task history
 * had expired. Same rigger, same input, so the bone names should match — but
 * "should" is exactly the word that earns a check.
 *
 * Set MESHY_WORK to the work tree holding node_modules/.
 */
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const HERE = process.env.MESHY_HERE || WORK;
const MIME = { '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.html': 'text/html' };
const argv = process.argv.slice(2), flags = {}, pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i]; else pos.push(argv[i]);
}
const [base, ...clipArgs] = pos;
if (!base || !clipArgs.length) { console.error('usage: addclips.mjs <base.glb> name:clip.glb … --out out.glb [--ground a,b] [--ref idle]'); process.exit(1); }
// clips whose ROOT HEIGHT still needs rebasing after retargeting — i.e. ones
// the library authored standing on something. See the page code.
const GROUND = (flags.ground || '').split(',').filter(Boolean);
const REF = flags.ref || 'idle';
const clips = clipArgs.map(a => { const i = a.indexOf(':'); return { name: a.slice(0, i), file: a.slice(i + 1) }; });
const OUT = flags.out || 'added.glb';

const PAGE = `<!doctype html><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><body></body>`;
const server = createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/a.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
  const p = u.startsWith('/three/') ? join(HERE, 'node_modules/three', u.slice(6)) : join(HERE, 'meshy', u);
  try { const b = await readFile(p); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(8946);

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await br.newPage();
await pg.goto('http://localhost:8946/a.html');

const out = await pg.evaluate(async ({ base, clips, GROUND, REF }) => {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const load = (f) => new GLTFLoader().loadAsync('/' + f);

  const g = await load(base);
  const root = g.scene;
  const known = new Set();
  root.traverse(o => { if (o.name) known.add(o.name); });

  // THE BASE SKELETON'S OWN SCALE, read off its bind pose. Meshy rigs to a
  // declared `height_meters`, and that number is baked into every translation
  // it emits — so two rig tasks on the SAME mesh at different heights produce
  // clips in different units. eeri_v4 was rigged at ~0.9 m (a six-year-old);
  // this batch was rigged at 1.62 m, which put its hips at 55.5 against the
  // base's 30.7. Dropped in raw, every step, sway and gather is ~1.8x too big
  // — and it does not look broken, it looks like a different, larger child.
  const baseHips = root.getObjectByName('Hips');
  const baseHipsY = baseHips ? baseHips.position.y : null;
  const anims = g.animations.map(a => a.clone());
  const log = [`base: ${anims.length} clips — ${anims.map(a => a.name).join(', ')}`];

  // MEAN ROOT HEIGHT of a clip's first .position track. The root track is the
  // only one carrying the character's height off the floor; every other
  // translation is a bone offset inside the body.
  const rootY = (clip) => {
    const t = clip.tracks.find(x => /\.position$/.test(x.name));
    if (!t) return null;
    let sum = 0; const n = t.values.length / 3;
    for (let i = 0; i < n; i++) sum += t.values[i * 3 + 1];
    return sum / n;
  };
  const refClip = anims.find(a => a.name === REF);
  const refY = refClip ? rootY(refClip) : null;

  for (const { name, file } of clips) {
    const c = await load(file);
    if (!c.animations.length) { log.push(`!! ${file} has no clip`); continue; }
    const clip = c.animations[0].clone();
    clip.name = name;

    // RETARGET THE UNITS. Each animation GLB ships the whole rigged character,
    // so its own bind pose says what scale it was authored in. Rotations are
    // scale-free and are left alone; every translation is scaled by the ratio
    // of hip rest heights. This is the fix, and an offset is not — subtracting
    // a constant would put the feet back on the floor while leaving the motion
    // oversized, which is the kind of wrong that passes a screenshot.
    const srcHips = c.scene.getObjectByName('Hips');
    if (baseHipsY && srcHips && Math.abs(srcHips.position.y - baseHipsY) > 0.01) {
      const k = baseHipsY / srcHips.position.y;
      for (const t of clip.tracks) {
        if (!/\.position$/.test(t.name)) continue;
        for (let i = 0; i < t.values.length; i++) t.values[i] *= k;
      }
      log.push(`  ${name}: retargeted x${k.toFixed(4)} (hips ${srcHips.position.y.toFixed(1)} -> ${baseHipsY.toFixed(1)})`);
    }
    // resolve every track against the BASE skeleton — a track whose node is
    // missing animates nothing and says nothing
    const missing = new Set();
    for (const t of clip.tracks) {
      const node = t.name.split('.')[0];
      if (!known.has(node)) missing.add(node);
    }
    if (missing.size) {
      log.push(`!! ${name} REFUSED — ${missing.size} unresolved target(s): ${[...missing].slice(0, 4).join(', ')}`);
      continue;
    }
    if (anims.some(a => a.name === name)) { log.push(`!! ${name} already present — skipped`); continue; }

    // REBASE THE ROOT HEIGHT — applied AFTER retargeting, and only to clips
    // that need it. Some library clips are authored standing on something:
    // `Stand_on_Pole_and_Balance` is a lovely edge-hesitation sway with a root
    // translation that puts the character on top of the pole it is named for.
    // That is staging, not units, so scaling cannot remove it.
    //
    // Shift the whole track by ONE CONSTANT — the gap between this clip's mean
    // root height and the base character's own standing height, from `idle`.
    // A constant keeps every wobble intact; flattening the track to a fixed Y
    // would delete the bob along with the error, and the bob is half of what
    // sells a teeter.
    if (GROUND.includes(name) && refY !== null) {
      const t = clip.tracks.find(x => /\.position$/.test(x.name));
      const my = rootY(clip);
      if (t && my !== null) {
        const d = my - refY, n = t.values.length / 3;
        for (let i = 0; i < n; i++) t.values[i * 3 + 1] -= d;
        log.push(`  ${name}: root height rebased ${d.toFixed(3)} onto '${REF}'`);
      }
    }
    anims.push(clip);
    log.push(`+ ${name}  ${clip.duration.toFixed(2)}s  ${clip.tracks.length} tracks`);
  }

  const buf = await new GLTFExporter().parseAsync(root, { binary: true, animations: anims });
  let s = '', a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
  return { b64: btoa(s), log, names: anims.map(x => x.name) };
}, { base, clips, GROUND, REF });

for (const l of out.log) console.log(' ', l);
const buf = Buffer.from(out.b64, 'base64');
await writeFile(OUT, buf);
console.log(`→ ${OUT}  ${(buf.length / 1048576).toFixed(2)} MB  ${out.names.length} clips: ${out.names.join(', ')}`);
await br.close(); server.close();
