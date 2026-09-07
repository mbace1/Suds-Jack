// Renders production sprite frames from a 3D model, at TURF's own board
// projection, straight to the handover's output rules.
//
// WHY THIS EXISTS — it is aimed at one specific failure. The handover records
// that repeated 12-frame generation attempts came back with the second
// half-cycle an exact or near-exact copy of the first, "even when labels
// claimed opposite mechanics." That failure is a property of DRAWING each
// frame independently. Sampling one animation curve at evenly spaced times
// cannot produce it: F1 and F7 are half a cycle apart on the same curve, so
// the support leg has genuinely swapped because the rig swapped it. The same
// move also removes C2 scale drift, C3 costume drift, M4 sliding origin and
// D2 facing drift — the model and camera are fixed, so none of those have
// anywhere to come from.
//
// What it does NOT fix: whether the underlying animation is any good. A bad
// walk cycle rendered from a rig is a bad walk cycle with a stable origin.
// Mechanical review still decides.
//
// The camera is derived from the board, not guessed: render.js projects tiles
// at TILE_W 32 x TILE_H 16, a 2:1 isometric, which is a 45 degrees yaw and an
// elevation of asin(16/32) = 30 degrees. Matching it here is what makes a
// sprite sit correctly on a tile instead of nearly correctly.
//
// Usage:
//   node turf/tools/render-frames.mjs --model <file.glb> --name toko_slomo \
//     --anim move --dir front --frames 12 [--clip Run] [--rev 1] [--height 288]
//
// Output follows the handover's naming: <char>_<anim>_<dir>_<NN>_v<rev>.png

import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require_ = createRequire(import.meta.url);
function playwright() {
  try { return require_('playwright'); } catch { /* not local */ }
  return require_(execSync('npm root -g').toString().trim() + '/playwright');
}

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');

// The production key colour. Exact, because the whole point of a key is that
// it separates by equality — see spritecheck.py, which enforces it.
const MAGENTA = '#FF00FF';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.bin': 'application/octet-stream',
};

// The render page is served from this origin rather than pushed in with
// setContent: an about:blank document cannot resolve the importmap's
// site-relative specifiers, so three.js never loads and the page hangs at
// __ready === false with no error to show for it.
function serve(root, pageHtml) {
  return new Promise(resolve => {
    const srv = createServer(async (req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      if (rel === '/__render.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(pageHtml());
        return;
      }
      const file = path.join(root, rel);
      if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

function args() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) o[a[i].slice(2)] = (a[i + 1] && !a[i + 1].startsWith('--')) ? a[++i] : true;
  }
  return o;
}

const PAGE = (modelUrl, opts) => `<!doctype html><meta charset=utf8>
<style>html,body{margin:0;background:${MAGENTA}}canvas{display:block}</style>
<script type="importmap">{"imports":{
  "three":"/eeri/vendor/three.module.min.js",
  "three/addons/":"/eeri/vendor/jsm/"
}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const W = ${opts.size}, H = ${opts.size};
const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.setClearColor('${MAGENTA}', 1);
// No tone mapping and no shadow map: the handover forbids cast shadows in a
// production export outright, and tone mapping would drift colour between
// runs, which reads downstream as costume drift.
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = false;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('${MAGENTA}');
// Flat, even light from two sides. Enough to read form, not enough to bake a
// direction into the sprite — a lit-from-the-left frame set cannot be mirrored
// to cover the opposite facing, and mirroring is how two drawn directions
// cover the board's four.
scene.add(new THREE.AmbientLight(0xffffff, 1.7));
const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(2, 4, 3); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(-2, 2, -3); scene.add(fill);

// TURF's own projection: 2:1 iso == 45 deg yaw, asin(TILE_H/TILE_W) = 30 deg
// elevation. --dir rear is the same camera swung a half turn, so front and
// rear share timing and scale exactly.
const YAW = (45 + ${opts.dir === 'rear' ? 180 : 0}) * Math.PI / 180;
const ELEV = 30 * Math.PI / 180;

window.__ready = false; window.__err = null; window.__clips = [];

new GLTFLoader().load('${modelUrl}', gltf => {
  try {
    const root = gltf.scene;
    scene.add(root);

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    // Frame on the model's own footprint, with headroom for a pose that
    // reaches above the T-pose bounds (a raised arm, a jump). Fixed for the
    // whole run so nothing rescales between frames.
    const span = Math.max(size.x, size.z, size.y) * ${opts.fit};

    const cam = new THREE.OrthographicCamera(-span/2, span/2, span/2, -span/2, 0.01, span*20);
    const d = span * 4;
    cam.position.set(
      centre.x + d * Math.cos(ELEV) * Math.sin(YAW),
      centre.y + d * Math.sin(ELEV),
      centre.z + d * Math.cos(ELEV) * Math.cos(YAW)
    );
    cam.lookAt(centre);

    const mixer = gltf.animations.length ? new THREE.AnimationMixer(root) : null;
    window.__clips = gltf.animations.map(c => ({ name: c.name, duration: c.duration }));
    let action = null;
    if (mixer && gltf.animations.length) {
      const want = ${JSON.stringify(opts.clip || null)};
      const clip = (want && gltf.animations.find(c => c.name === want)) || gltf.animations[0];
      action = mixer.clipAction(clip);
      action.play();
      // keys = the most keyframes any track carries. A clip where that is 1 is
      // a static pose with a duration, not a cycle — see the guard in the
      // driver, which refuses rather than emitting N identical frames.
      window.__clip = {
        name: clip.name,
        duration: clip.duration,
        keys: clip.tracks.length ? Math.max(...clip.tracks.map(t => t.times.length)) : 0,
      };
    }

    // Sample at t = i/N * duration, NOT i/(N-1): frame N+1 would BE frame 1,
    // so excluding the endpoint is what makes the loop close instead of
    // holding a doubled frame at the seam (failure code M5).
    window.__renderAt = (i, n) => {
      if (mixer && window.__clip) {
        mixer.setTime(0);
        mixer.update((i / n) * window.__clip.duration);
      }
      renderer.render(scene, cam);
    };
    window.__ready = true;
  } catch (e) { window.__err = String(e && e.stack || e); }
}, undefined, e => { window.__err = 'load failed: ' + String(e && e.message || e); });
</script>`;

async function main() {
  const o = args();
  if (!o.model || !o.name || !o.anim) {
    console.error('need --model <glb> --name <character> --anim <move|idle|melee|ranged|hit|ko>');
    process.exit(2);
  }
  const dir = o.dir || 'front';
  if (!['front', 'rear'].includes(dir)) { console.error('--dir must be front or rear'); process.exit(2); }
  // Sprite Bible section 8's frame table. The handover said 12-20 for
  // locomotion; the Bible sets Move at 6 and both documents agree the Bible
  // wins on conflict (Bible section 0, handover Purpose). --frames still
  // overrides for a deliberate dense-master experiment.
  const BIBLE_FRAMES = { idle: 4, move: 6, melee: 5, ranged: 5, hit: 3, ko: 5 };
  const frames = parseInt(o.frames || BIBLE_FRAMES[o.anim] || '6', 10);
  const rev = parseInt(o.rev || '1', 10);
  const size = parseInt(o.size || '512', 10);
  const fit = parseFloat(o.fit || '1.35');

  const modelAbs = path.resolve(o.model);
  if (!existsSync(modelAbs)) { console.error('no such model: ' + modelAbs); process.exit(2); }
  const modelUrl = '/' + path.relative(REPO, modelAbs).split(path.sep).join('/');

  const outDir = o.out || path.join(REPO, 'turf/sprites/characters', o.name, o.anim, dir);
  await mkdir(outDir, { recursive: true });

  let port0 = 0;
  const held = await serve(REPO, () => PAGE(`http://127.0.0.1:${port0}${modelUrl}`, { size, dir, clip: o.clip, fit }));
  const { srv, port } = held;
  port0 = port;

  const { chromium } = playwright();
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  await page.goto(`http://127.0.0.1:${port}/__render.html`);

  await page.waitForFunction('window.__ready === true || window.__err', { timeout: 60000 })
    .catch(() => {});
  const err = await page.evaluate('window.__err');
  if (err) { console.error('render page error: ' + err); await browser.close(); srv.close(); process.exit(1); }

  const clip = await page.evaluate('window.__clip || null');
  const clips = await page.evaluate('window.__clips || []');
  if (!clip) {
    console.error(`model has no animation clips (found: ${clips.length ? clips.map(c => c.name).join(', ') : 'none'}).`);
    console.error('A static mesh cannot produce a locomotion cycle — rig and animate it first.');
    await browser.close(); srv.close(); process.exit(1);
  }
  // A clip can exist and still hold no motion: a single-keyframe "animation"
  // is how several exporters store a static display pose. Sampling it N times
  // yields N identical frames, which is the duplicate failure manufactured at
  // source rather than caught downstream — so refuse it here.
  if (clip.duration <= 0 || clip.keys < 2) {
    console.error(`clip "${clip.name}" has no motion (${clip.keys} keyframe(s), ${clip.duration}s) — a static pose, not a cycle.`);
    console.error('Rendering it would emit ' + frames + ' identical frames. Rig and animate the model first.');
    await browser.close(); srv.close(); process.exit(1);
  }
  console.log(`clip "${clip.name}" ${clip.duration.toFixed(2)}s -> ${frames} frames, ${dir}`);

  for (let i = 0; i < frames; i++) {
    await page.evaluate(([i, n]) => window.__renderAt(i, n), [i, frames]);
    const name = `${o.name}_${o.anim}_${dir}_${String(i + 1).padStart(2, '0')}_v${rev}.png`;
    const buf = await page.locator('canvas').screenshot({ omitBackground: false });
    await writeFile(path.join(outDir, name), buf);
    process.stdout.write(`  ${name}\n`);
  }

  await browser.close();
  srv.close();
  console.log(`\n${frames} frames -> ${path.relative(REPO, outDir)}`);
  console.log('Now validate:  python3 turf/tools/spritecheck.py cycle ' + path.relative(REPO, outDir));
  if (errs.length) console.error('page errors: ' + errs.join('; '));
}

main();
