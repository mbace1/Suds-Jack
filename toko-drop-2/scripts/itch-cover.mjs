#!/usr/bin/env node
// itch-cover.mjs — cover candidates for the itch page (docs/ITCH.md: "the
// cover image (630 × 500) is OWNER"), rendered from the game itself: each
// scene is posed through the look-check hooks (__toko.showcase / idle /
// bossWave), the HUD and menus are hidden, the camera is put where a cover
// wants it, and the title is set over the void in the game's own logo type
// (TOKO DROP, the amber 2.0 under it). Each cover is written at 1260 × 1000
// (the 2× itch shows on a sharp screen) and 630 × 500.
//
//   king   CURB KING mid-hop over you, the driveway's boss
//   gang   the gels on the grid, the hero firing into them
//   core   world 9's magenta skyline, the heat at ×8 under you
//   burst  a SPLITTA bursting into goo, the heat at ×8
//
// A camera is placed by where things land in the frame, not by eye: the
// numbers below were solved so the hero sits in the left third, the subject
// right of it, and the title over empty sky. And a cover is the same picture
// every time: the page's Math.random is seeded before the game loads (a run's
// seed comes from it, and with it every hop and colour), and each cover names
// the seed that was chosen by looking.
//
//   node scripts/itch-cover.mjs [outDir=dist/itch-cover] [--only king,burst]
//   node scripts/itch-cover.mjs --only king --seeds 1,2,3,4   one picture a seed, to choose from
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname, normalize, sep, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const OUT = resolve(args.find((a) => !a.startsWith('--') && a !== opt('--only', null) && a !== opt('--seeds', null)) ?? join(ROOT, 'dist/itch-cover'));
const ONLY = opt('--only', null)?.split(','), SEEDS = opt('--seeds', null)?.split(',').map(Number);
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1)) || 'index.html';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT + sep) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const binary = [process.env.CHROMIUM, '/opt/pw-browsers/chromium'].find((b) => b && existsSync(b));
const profile = mkdtempSync(join(tmpdir(), 'itch-cover-'));
const proc = spawn(binary, ['--headless=new', '--no-sandbox', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--mute-audio', '--no-proxy-server',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--use-vulkan=swiftshader', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'], detached: true });
const wsUrl = await new Promise((res, rej) => { let b = ''; proc.stderr.on('data', (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); setTimeout(() => rej(new Error('no DevTools port')), 20000); });
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function page(query, seed) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  const size = (scale) => s('Emulation.setDeviceMetricsOverride', { width: 630, height: 500, deviceScaleFactor: scale, mobile: false });
  await size(2);
  // mulberry32, as the sim's own rng: the run's seed, and everything else drawn at random, the same each time
  await s('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { let a = ${seed >>> 0}; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();` });
  await s('Page.navigate', { url: `${base}?nointro${query}` });
  const ev = async (expression) => {
    const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.split('\n')[0] ?? 'evaluate failed');
    return r.result?.value;
  };
  for (let i = 0; i < 240 && !(await ev('!!(window.__toko && window.__toko.ready)')); i++) await sleep(250);
  const shot = async (file) => { const r = await s('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(r.data, 'base64')); };
  return { ev, shot, size, close: () => send('Target.closeTarget', { targetId }) };
}

// the picture only: no HUD, banner, menus, version line or touch sticks
const BARE = `(() => { const s = document.createElement('style'); s.textContent = '#hud,#banner,#vignette,#menu,#ver,#fault,#sticks,#fps{display:none!important}'; document.head.append(s); })()`;
// the title, in the logo's own type (index.html #menu .logo): `stack` sets TOKO over DROP, top left, beside a tall subject;
// `logo` is 1.x's brushed logo (scripts/itch-logo-1x.png, 1.x's toko-drop/logo.png) as 1.x's title showed it, over a
// soft orange-to-violet wash with an orange glow, and no 2.0 (owner: "no need for 2.0")
const TITLE = (layout) => `(async () => {
  const s = document.createElement('style');
  s.textContent = '#cover{position:fixed;z-index:50;inset:0;pointer-events:none;font:800 54px/1 ui-monospace,"SF Mono",Menlo,Consolas,"Roboto Mono",monospace;color:#eceef3}' +
    '#cover:before{content:"";position:absolute;left:0;right:0;top:0;height:42%;background:linear-gradient(rgba(5,5,6,.82),rgba(5,5,6,0))}' +
    '#cover .t{position:absolute;top:32px}#cover.line .t{left:0;right:0;text-align:center}#cover.stack .t{left:34px}' +
    '#cover .n{display:block;letter-spacing:.3em;white-space:nowrap;text-shadow:0 3px 0 rgba(0,0,0,.6),0 0 24px rgba(0,0,0,.9)}#cover.line .n{margin-right:-.3em}' +
    '#cover.stack .n+.n{margin-top:6px}' +
    '#cover .v{display:block;margin-top:12px;font-size:27px;letter-spacing:.5em;color:#ffb468;text-shadow:0 0 14px rgba(255,140,60,.6),0 2px 0 rgba(0,0,0,.7)}#cover.line .v{margin-right:-.5em}' +
    '#cover.logo:before{height:38%;background:linear-gradient(rgba(5,5,6,.7),rgba(5,5,6,0))}#cover.logo .t{left:0;right:0;top:16px;display:flex;justify-content:center}' +
    '#cover .lw{position:relative;width:272px}#cover .wash{position:absolute;inset:-34% -22%;background:radial-gradient(ellipse 52% 48% at 50% 50%,rgba(255,68,34,.5),rgba(170,0,255,.3) 55%,rgba(170,0,255,0) 74%)}' +
    '#cover .lw img{position:relative;width:100%;display:block;filter:drop-shadow(0 0 8px rgba(255,68,34,.8))}#cover.logo .v{position:absolute;right:-62px;bottom:14px;margin:0}';
  document.head.append(s);
  const d = document.createElement('div'); d.id = 'cover'; d.className = '${layout}';
  d.innerHTML = '${layout}' === 'logo' ? '<div class="t"><div class="lw"><div class="wash"></div><img src="/scripts/itch-logo-1x.png" alt="TOKO DROP"></div></div>'
    : '<div class="t">' + ('${layout}' === 'stack' ? '<span class="n">TOKO</span><span class="n">DROP</span>' : '<span class="n">TOKO DROP</span>') + '<span class="v">2.0</span></div>';
  document.body.append(d);
  await d.querySelector('img')?.decode();
})()`;
const cam = ([px, py, pz], [ax, ay, az], fov) => `(() => { const t = __toko, c = t.camera; t.freeCam = true; c.clearViewOffset(); c.fov = ${fov}; c.position.set(${px}, ${py}, ${pz}); c.lookAt(${ax}, ${ay}, ${az}); c.updateProjectionMatrix(); c.updateMatrixWorld(); })()`;
// the arcade's pickups and a challenge's gates out of the picture
const CLEAR = `(() => { const w = __toko.world; if (w.pk) { w.pk.items.length = 0; w.pk.gates.length = 0; w.pk.convoy = null; } if (w.ch?.gates) w.ch.gates.length = 0; })()`;
// a quiet arena with these bodies where they are put, too tough to die, the
// hero firing at `aim` for a moment so the stream is in the air (aimed past
// them: a body being hit flashes white), then everyone put back where they
// were set (world 9's rule, CYCLE, moves the bodies while time runs)
const place = (bodies, hero, aim, heat) => `(() => { const t = __toko; t.showcase(${JSON.stringify(bodies.map((b) => b[0]))}); const w = t.world, L = ${JSON.stringify(bodies)};
  w.gels.forEach((g, i) => { g.x = g.px = L[i][1]; g.z = g.pz = L[i][2]; g.hp = 1e9; });
  const h = w.hero, put = () => { w.gels.forEach((g, i) => { g.x = g.px = L[i][1]; g.z = g.pz = L[i][2]; }); h.x = h.px = ${hero[0]}; h.z = h.pz = ${hero[1]}; };
  put(); w.heat = ${heat}; t.idle(0.45, ${JSON.stringify(aim)}); w.heat = ${heat}; put(); return {}; })()`;

const COVERS = {
  // CURB KING caught 1-1.8 m up a hop (where it stretches tall), the camera on the arena's middle side
  // looking straight at it along the nearer axis: the boss right of centre,
  // the crown clear of the top, the hero below-left firing past it; the
  // bodies between the camera and the boss are taken out of the picture
  king: {
    query: '&world=2', layout: 'stack', seed: 1,
    setup: `(async () => { const t = __toko; t.start('arcade'); for (let i = 0; i < 40 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100)); t.world.hero.invinc = 1e9;
      t.bossWave(); t.advance(6); t.hold = true; const w = t.world, b = w.gels.find((g) => g.isBoss), h = w.hero;
      const axes = () => { const fx = Math.abs(b.x) >= Math.abs(b.z) ? Math.sign(b.x) || 1 : 0, fz = fx ? 0 : Math.sign(b.z) || 1; return { fx, fz, rx: -fz, rz: fx }; };
      const put = () => { const A = axes(); h.x = h.px = b.x - A.fx * 8.6 - A.rx * 3.8; h.z = h.pz = b.z - A.fz * 8.6 - A.rz * 3.8; };
      for (let i = 0; i < 160; i++) { put(); w.heat = 6.5; t.idle(0.05, { x: b.x + axes().rx * 3, z: b.z + axes().rz * 3 }); if (b.s.y > 1.0 && b.s.y < 1.8) break; }
      ${CLEAR}; put(); const A = axes(); w.bullets = w.bullets.filter((q) => q.hero && (q.x - h.x) * A.fx + (q.z - h.z) * A.fz > 0.3);   // only the stream ahead of the hero: a shot by the lens is a blot
      w.gels = w.gels.filter((g) => { const keep = g === b || (g.x - b.x) * -A.fx + (g.z - b.z) * -A.fz < 0.5; if (!keep) g.alive = false; return keep; });
      return { bx: b.x, bz: b.z, ...A, y: b.s.y }; })()`,
    camera: (k) => cam([k.bx - k.fx * 14 - k.rx * 2.4, 1.3, k.bz - k.fz * 14 - k.rz * 2.4], [k.bx - k.rx * 2.4, 2.9, k.bz - k.rz * 2.4], 46),
  },
  gang: {
    query: '', layout: 'line', seed: 3,
    setup: place([['splitta', 1.6, 1.2], ['yela', 2.9, 3.0], ['orange', 3.9, -0.6], ['spittor', 2.0, -2.6], ['globbo', -3.0, -1.4], ['purp', 0.2, -4.8], ['redd', 3.8, -5.2]], [-1.6, 5.0], { x: -1.6, z: -3.4 }, 5.2),
    camera: () => cam([0.4, 4.6, 10.8], [0.4, -0.2, -3.0], 44),
  },
  core: {
    query: '&world=9', layout: 'logo', seed: 3,   // the owner's pick (2026-10-30), with 1.x's logo
    setup: place([['yela', 1.5, 3.4], ['globbo', 3.4, 1.4], ['splitta', -0.1, -0.6], ['orange', 4.6, -2.2], ['mirra', 1.6, -3.4]], [-1.3, 5.6], { x: 2.0, z: -1.0 }, 7.95),
    camera: () => cam([0.4, 1.45, 10.4], [0.4, 1.9, -10], 48),
  },
  // a SPLITTA that dies to the first shot, caught 0.15 s into its burst; the
  // hero stood back on the line its stream came along
  burst: {
    query: '', layout: 'stack', seed: 1,
    setup: `(async () => { const t = __toko; t.showcase(['splitta']); const w = t.world, g = w.gels[0]; g.x = g.px = 1.0; g.z = g.pz = -0.8; g.hp = 1;
      const h = w.hero; h.x = h.px = -2.0; h.z = h.pz = 2.8; w.heat = 7.95;
      for (let i = 0; i < 160 && !(t.counts.kill > 0); i++) t.idle(0.02, { x: g.x, z: g.z });
      const k = { kx: g.x, kz: g.z }; t.idle(0.15, { x: k.kx, z: k.kz }); w.heat = 7.95;
      h.x = h.px = k.kx - 2.0; h.z = h.pz = k.kz + 2.4; return { ...k, kills: t.counts.kill ?? 0 }; })()`,
    camera: (k) => cam([k.kx - 1.5, 1.5, k.kz + 5.6], [k.kx - 0.7, 1.1, k.kz - 1.0], 50),
  },
};

try {
  for (const [name, C] of Object.entries(COVERS)) {
    if (ONLY && !ONLY.includes(name)) continue;
    for (const seed of SEEDS ?? [C.seed]) {
      const p = await page(C.query, seed), tag = SEEDS ? `-s${seed}` : '';
      const k = await p.ev(C.setup);
      await p.ev(BARE); await p.ev(C.camera(k)); await p.ev(TITLE(C.layout));
      await sleep(2500); await p.shot(join(OUT, `cover-${name}${tag}@2x.png`));
      if (!SEEDS) { await p.size(1); await sleep(2500); await p.shot(join(OUT, `cover-${name}.png`)); }
      console.log(`  cover-${name}${tag}${SEEDS ? '@2x' : ''}.png${SEEDS ? '' : `, cover-${name}@2x.png`} (seed ${seed})`);
      await p.close();
    }
  }
  // the covers side by side at the size itch's browse grid shows one (315 × 250), on a page's grey
  const names = Object.keys(COVERS).filter((n) => existsSync(join(OUT, `cover-${n}@2x.png`)));
  if (!SEEDS && names.length) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    await s('Page.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: names.length * 331 + 16, height: 282, deviceScaleFactor: 1, mobile: false });
    const imgs = names.map((n) => `<img style="width:315px;height:250px;display:block" src="data:image/png;base64,${readFileSync(join(OUT, `cover-${n}@2x.png`)).toString('base64')}">`).join('');
    const frameId = (await s('Page.getFrameTree')).frameTree.frame.id;
    await s('Page.setDocumentContent', { frameId, html: `<body style="margin:0;padding:16px;background:#222226;display:flex;gap:16px">${imgs}</body>` });
    await sleep(800);
    const r = await s('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, 'grid-315x250.png'), Buffer.from(r.data, 'base64'));
    await send('Target.closeTarget', { targetId });
    console.log(`  grid-315x250.png (${names.join(', ')})`);
  }
  console.log(`✔ covers in ${OUT}`);
} finally {
  ws.close(); server.close();
  try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
  await sleep(500); rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
