// The asset pipeline — smoke test.
//   node test/assets-smoke.cjs
//
// Plain node, no browser and no network: everything here runs on a laptop with
// no API keys, which is the point. The two paid services are stubbed with a
// fake `fetch`, so this proves the WIRING — that a spec becomes a request,
// that the reply becomes a file at the hashed name, that a mesh is cut from
// its own plate — without generating anything.
//
// The hash checks are the load-bearing ones. An asset's filename carries the
// hash of the spec that made it, and that is the only thing standing between
// this repo and its oldest bug: art that has quietly drifted from the prompt
// that describes it. If `same prompt -> same hash` ever breaks, every asset
// restages on every run; if `changed prompt -> same hash` ever breaks, a stale
// picture ships forever behind a URL nobody will bust.

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;
function check(label, ok) {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}`);
  if (!ok) failures++;
}
async function section(name, fn) {
  console.log(`\n${name}`);
  try { await fn(); } catch (e) { console.log(`  FAIL ${e.message}`); failures++; }
}

(async () => {
  const core = await import(`file://${path.join(ROOT, 'scripts/lib/assets-core.mjs')}`);
  const manifest = await import(`file://${path.join(ROOT, 'assets/manifest.mjs')}`);
  const banana = await import(`file://${path.join(ROOT, 'scripts/lib/nano-banana.mjs')}`);
  const meshy = await import(`file://${path.join(ROOT, 'scripts/lib/meshy.mjs')}`);

  const specs = core.resolveAll(manifest);

  await section('the manifest', () => {
    check('resolves without throwing', specs.length > 0);
    check('every id is unique', new Set(specs.map(s => s.id)).size === specs.length);
    check('every spec names a game', specs.every(s => s.game));
    check('every 2d spec has a prompt', specs.filter(s => s.kind === '2d').every(s => s.prompt && s.prompt.length > 20));
    check('every 2d spec names a style that exists',
      specs.filter(s => s.kind === '2d').every(s => manifest.STYLES[s.style]));
    check('every 3d spec names a 2d parent that exists',
      specs.filter(s => s.kind === '3d').every(s => specs.some(p => p.id === s.from && p.kind === '2d')));
    check('no 3d spec carries a prompt of its own (meshy is fed an image)',
      specs.filter(s => s.kind === '3d').every(s => !s.prompt));
    check('the composed prompt carries the house style, then the subject',
      specs[0].resolved.prompt.startsWith(manifest.STYLES[specs[0].style].trim().slice(0, 40)));
  });

  await section('the hash is the cache token', () => {
    const again = core.resolveAll(manifest);
    check('same manifest -> same hashes (nothing restages on a re-run)',
      specs.every((s, i) => s.hash === again[i].hash));

    const edited = {
      ...manifest,
      ASSETS: manifest.ASSETS.map(a => (a.id === 'neonronin/samurai-turnaround' ? { ...a, prompt: a.prompt + ' holding a lantern.' } : a)),
    };
    const after = core.resolveAll(edited);
    const before = id => specs.find(s => s.id === id).hash;
    const now = id => after.find(s => s.id === id).hash;
    check('editing one prompt changes that asset\'s hash', before('neonronin/samurai-turnaround') !== now('neonronin/samurai-turnaround'));
    check('...and does NOT change an unrelated asset\'s hash', before('hyperdagger/sky') === now('hyperdagger/sky'));
    check('...and DOES restage the mesh cut from it (lineage)', before('neonronin/samurai-mesh') !== now('neonronin/samurai-mesh'));

    // Reordering keys while editing must not restage the batch — this is why
    // specHash walks a fixed key list instead of JSON.stringify.
    const reordered = {
      ...manifest,
      ASSETS: manifest.ASSETS.map(a => {
        const e = Object.fromEntries(Object.entries(a).reverse());
        return e;
      }),
    };
    check('re-ordering a spec\'s keys does not change any hash',
      core.resolveAll(reordered).every((s, i) => s.hash === specs[i].hash));

    check('the filename carries the hash', specs.every(s => s.file.includes(`.${s.hash}.`)));
    check('2d lands as .png, 3d as .glb',
      specs.every(s => (s.kind === '3d' ? s.file.endsWith('.glb') : s.file.endsWith('.png'))));
    check('every output path is unique', new Set(specs.map(s => s.file)).size === specs.length);
  });

  await section('a duplicate id is caught, not generated twice', () => {
    const dup = { ...manifest, ASSETS: [...manifest.ASSETS, { ...manifest.ASSETS[0] }] };
    let threw = false;
    try { core.resolveAll(dup); } catch (e) { threw = /duplicate/.test(e.message); }
    check('resolveAll throws on a duplicate id', threw);

    const orphan = { ...manifest, ASSETS: [...manifest.ASSETS, { id: 'x/y', game: 'g', kind: '3d', from: 'nope' }] };
    let threw2 = false;
    try { core.resolveAll(orphan); } catch (e) { threw2 = /unknown parent/.test(e.message); }
    check('resolveAll throws on a 3d asset pointing at nothing', threw2);
  });

  // ── the two services, stubbed ────────────────────────────────────────────
  const PNG = Buffer.from('89504e470d0a1a0a', 'hex');       // a PNG magic number is enough

  await section('nano banana (stubbed)', async () => {
    let seen = null;
    const fetchImpl = async (url, init) => {
      seen = { url, body: JSON.parse(init.body), headers: init.headers };
      return { ok: true, status: 200, text: async () => JSON.stringify({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: PNG.toString('base64') } }] } }],
      }) };
    };
    const out = await banana.generateImage({ prompt: 'a neon samurai', model: 'gemini-2.5-flash-image', aspect: '3:4', apiKey: 'k', fetchImpl });
    check('posts to :generateContent on the pinned model', /models\/gemini-2\.5-flash-image:generateContent$/.test(seen.url));
    check('sends the key as x-goog-api-key', seen.headers['x-goog-api-key'] === 'k');
    check('asks for IMAGE in responseModalities (the whole ballgame)',
      seen.body.generationConfig.responseModalities.includes('IMAGE'));
    check('passes the aspect ratio through', seen.body.generationConfig.imageConfig.aspectRatio === '3:4');
    check('returns the decoded bytes', Buffer.compare(out.bytes, PNG) === 0);

    // The failure that returns 200 — a text-only reply. If this ever silently
    // "succeeds" the pipeline writes a 0-byte png and calls it art.
    let msg = '';
    const textOnly = async () => ({ ok: true, status: 200, text: async () => JSON.stringify({
      candidates: [{ finishReason: 'SAFETY', content: { parts: [{ text: 'I can describe it instead.' }] } }],
    }) });
    try { await banana.generateImage({ prompt: 'x', model: 'm', apiKey: 'k', fetchImpl: textOnly }); }
    catch (e) { msg = e.message; }
    check('a text-only 200 is a hard failure, not a silent one', /no image in response/.test(msg));
    check('...and it reports the reason and what the model said',
      /SAFETY/.test(msg) && /describe it instead/.test(msg));

    let noKey = '';
    try { await banana.generateImage({ prompt: 'x', model: 'm', apiKey: null }); } catch (e) { noKey = e.message; }
    check('a missing key fails with a message naming the variable', /GEMINI_API_KEY/.test(noKey));
  });

  await section('meshy (stubbed)', async () => {
    const calls = [];
    const GLB = Buffer.from('676c5446', 'hex');
    let polls = 0;
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/image-to-3d')) return { ok: true, status: 200, text: async () => JSON.stringify({ result: 'task-1' }) };
      if (url.includes('/image-to-3d/task-1')) {
        polls++;
        const done = polls >= 2;
        return { ok: true, status: 200, text: async () => JSON.stringify({
          status: done ? 'SUCCEEDED' : 'IN_PROGRESS', progress: done ? 100 : 40,
          model_urls: done ? { glb: 'https://cdn.example/m.glb' } : {},
        }) };
      }
      return { ok: true, status: 200, arrayBuffer: async () => GLB.buffer.slice(GLB.byteOffset, GLB.byteOffset + GLB.length) };
    };
    const out = await meshy.imageTo3D({
      image: { bytes: PNG, mime: 'image/png' }, model: 'meshy-5', topology: 'triangle',
      targetPolycount: 15000, texture: true, symmetry: 'on', apiKey: 'mk',
      fetchImpl, pollMs: 0, sleep: async () => {},
    });
    const created = JSON.parse(calls[0].init.body);
    check('creates the task with a Bearer token', calls[0].init.headers.authorization === 'Bearer mk');
    check('hands the plate over as a base64 data URI', created.image_url.startsWith('data:image/png;base64,'));
    check('passes the mesh params through', created.target_polycount === 15000 && created.symmetry_mode === 'on');
    check('polls until SUCCEEDED rather than assuming', polls >= 2);
    check('downloads and returns the glb', Buffer.compare(out.glb, GLB) === 0);

    let failMsg = '';
    const failing = async (url) => (url.endsWith('/image-to-3d')
      ? { ok: true, status: 200, text: async () => JSON.stringify({ result: 't' }) }
      : { ok: true, status: 200, text: async () => JSON.stringify({ status: 'FAILED', task_error: { message: 'bad input image' } }) });
    try {
      await meshy.imageTo3D({ image: { bytes: PNG }, apiKey: 'k', fetchImpl: failing, pollMs: 0, sleep: async () => {} });
    } catch (e) { failMsg = e.message; }
    check('a FAILED task throws with the service\'s own reason', /FAILED/.test(failMsg) && /bad input image/.test(failMsg));
  });

  // ── the runtime loader ───────────────────────────────────────────────────
  await section('the loader never breaks a game', async () => {
    const load = await import(`file://${path.join(ROOT, 'assets/load.js')}`);

    load.__setIndex({});                       // nothing generated — a fresh checkout
    check('image() falls back when the asset does not exist',
      (await load.image('neonronin/samurai-cover', () => 'CODE-DRAWN')) === 'CODE-DRAWN');
    check('url() is null for an asset that does not exist',
      (await load.url('neonronin/samurai-cover')) === null);
    check('has() is false for an asset that does not exist',
      (await load.has('neonronin/samurai-cover')) === false);
    check('mesh() falls back too', (await load.mesh(null, 'neonronin/samurai-mesh', () => 'NO-MESH')) === 'NO-MESH');

    const FakeTHREE = { CanvasTexture: class { constructor(c) { this.image = c; this.isTexture = true; } } };
    const tex = await load.texture(FakeTHREE, 'hyperdagger/sky', () => ({ tagged: 'canvas' }));
    check('texture() wraps a fallback canvas in a CanvasTexture', tex instanceof FakeTHREE.CanvasTexture);

    load.__setIndex({ 'neonronin/samurai-cover': { file: '2d/neonronin-samurai-cover.abc12345.png' } });
    const u = await load.url('neonronin/samurai-cover');
    check('url() resolves against the module, not the page',
      u.endsWith('/assets/out/2d/neonronin-samurai-cover.abc12345.png'));
    check('has() is true once the asset is in the index', (await load.has('neonronin/samurai-cover')) === true);
    check('urls() lists it for a worker precache', (await load.urls()).length === 1);
  });

  // ── the CLI, end to end, against the stubs ───────────────────────────────
  await section('status reads the batch with no key and no network', () => {
    const { execFileSync } = require('node:child_process');
    const out = execFileSync('node', [path.join(ROOT, 'scripts/assets.mjs'), 'status'], {
      encoding: 'utf8', env: { ...process.env, GEMINI_API_KEY: '', MESHY_API_KEY: '' },
    });
    check('lists every asset in the manifest', specs.every(s => out.includes(s.id)));
    check('reports a fresh checkout as missing rather than ok', /missing/.test(out));

    const dry = execFileSync('node', [path.join(ROOT, 'scripts/assets.mjs'), 'gen', '--dry'], { encoding: 'utf8' });
    check('gen --dry says what it would do and calls nothing', /--dry: called nothing/.test(dry));
    check('gen --dry counts the two services separately', /nano banana/.test(dry) && /meshy/.test(dry));
  });

  await section('staleness is detected from the filename alone', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'assets-'));
    const dir = path.join(tmp, '2d');
    fs.mkdirSync(dir, { recursive: true });
    const s = specs.find(x => x.id === 'hyperdagger/sky');
    // art on disk from a prompt that has since been edited
    fs.writeFileSync(path.join(dir, `hyperdagger-sky.deadbeef.png`), PNG);
    const stem = 'hyperdagger-sky';
    const found = fs.readdirSync(dir).filter(f => f.startsWith(stem + '.') && f !== path.basename(s.file));
    check('an output at an old hash is visible as drift', found.length === 1);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  console.log(failures ? `\n${failures} FAILED` : `\nall asset pipeline checks passed`);
  process.exit(failures ? 1 : 0);
})();
