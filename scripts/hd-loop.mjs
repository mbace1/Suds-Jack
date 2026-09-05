#!/usr/bin/env node
// scripts/hd-loop.mjs — record a looping GIF of Hyper Dagger MOVING, straight
// from the real game code, so an art or feel question is answered with a
// moving picture instead of a still. The same discipline as
// scripts/enemy-loop.mjs for Toko Drop: the owner's method is render → LOOK →
// name what is wrong → redo, against MOTION — the smoke gates certify works
// and prototype-feel lives in the part they cannot see.
//
//   node scripts/hd-loop.mjs                    # every scenario
//   node scripts/hd-loop.mjs jaw shed           # named scenarios
//   node scripts/hd-loop.mjs --out /tmp/gifs --frames 36 --step 60
//   node scripts/hd-loop.mjs shed --stills    # + first/middle/last frames as PNG
//
// Output: one <scenario>.gif per scenario in --out (default ./loops).
//
// Stages a throwaway copy of the SITE subset the game needs (hyperdagger/,
// hub/, toko/ — index.html imports ../hub/shell.js and ../toko/…) and
// appends a harness to that copy's main.js. Nothing here ships. Screenshots
// rather than reading the WebGL canvas: the game's context has no
// preserveDrawingBuffer. Never `networkidle` — the service worker keeps the
// network busy. SwiftShader is ~1.5 s per frame, so run long loops in the
// background.
//
// Requires (dev-only, NOT vendored): gifenc, pngjs, playwright — install them
// in a scratch dir and expose with NODE_PATH.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const { PNG } = require('pngjs');

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : dflt; };
const OUT    = path.resolve(opt('out', path.join(process.cwd(), 'loops')));
const FRAMES = +opt('frames', 36);
const DELAY  = +opt('delay', 70);   // ms per frame in the finished GIF
const STEP   = +opt('step', 60);    // ms of wall time between captures
const STILLS = argv.includes('--stills'); // also write first / middle / last frames as PNG
const WIDTH  = +opt('width', 520);
const HEIGHT = +opt('height', 330);
const wanted = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));

// ── scenarios ─────────────────────────────────────────────────────────────────
// { title, setup, tick, every } — setup/tick run in the page against window._LOOP.
// Deterministic and short: these are answers to design questions.
const SCENARIOS = {
  jaw: {
    title: 'SKULL — the bite: hinged jaw under the Meshy skin',
    setup: 'window._LOOP.solo("Skull", 3.2); window._LOOP.slow(0.35)',
    tick: 'window._LOOP.hold()',
    every: 1,
  },
  shed: {
    title: 'SKULL — 22% of the lattice gone, the skin sheds, the cubes fight on',
    setup: 'window._LOOP.solo("Skull", 3.6); window._LOOP.slow(0.5)',
    tick: 'window._LOOP.hold(); if (window._LOOP._f = (window._LOOP._f || 0) + 1, window._LOOP._f % 3 === 0) window._LOOP.chip(0.05)',
    every: 1,
  },
  burst: {
    title: 'DREAD — the death burst: skin, lattice, gibs, bone-yard',
    setup: 'window._LOOP.solo("Dread", 4.2)',
    tick: 'window._LOOP.killAt(12)',
    every: 1,
  },
  swoop: {
    title: 'SERPENT — rides its own sine, dives and arcs overhead',
    setup: 'window._LOOP.serpent()',
    view: [0, 0.35],
  },
  brute: {
    title: 'BRUTE — the upright Meshy skull, tilt settled from four renders',
    setup: 'window._LOOP.solo("Brute", 4.6)',
    tick: 'window._LOOP.hold()',
    every: 1,
  },
  wallrun: {
    title: 'MOVE — the wall run: take off beside the wall, ride it, kick off',
    mode: 'move',
    setup: 'window._LOOP.wallStart()',
    tick: 'window._LOOP.wallTick()',
    every: 1,
  },
  court: {
    title: 'MOVE — the court: four walls, the body stops and slides along',
    mode: 'move',
    setup: 'window._LOOP.court()',
    tick: 'window._LOOP.run(-0.7, -1)',
    every: 1,
    view: [0.5, 0.05],
  },
};

// ── the in-page harness — appended to the staged copy's main.js ───────────────
const HARNESS = `
window._LOOP = {
  boot() { startGame(); directorFrozen = true; invulnerable = true; return null; },
  // Under SwiftShader one capture frame is ~1.5 s of game time and a wall run
  // is over in one. slow(k) scales the game clock so the move spans frames.
  slow(k) { window.__hd.debug.setTimeScale(k); return null; },
  reset() {
    this._f = 0;
    this.slow(1);
    for (const e of enemies) e.alive = false;
    enemies.length = 0; serpents.length = 0;
    player.feet.set(0, 0, 0); player.yaw = 0; player.pitch = 0.02; player.velocity.set(0, 0, 0); player.vy = 0; player._sync();
    return null;
  },
  // A skull RUSHES you: left alone it is inside the camera by mid-loop. And
  // a hold applied once per CAPTURE frame is not enough — between two
  // captures the game runs half a second and the skull closes three units.
  // So the hold is a wrap on the enemy's own update: it turns, bites, sheds
  // and bleeds every frame, and every frame it is put back where it was placed.
  place(e, dist) {
    e.group.position.set(0, e.pos.y, -dist);
    e._holdAt = e.group.position.clone();
    if (!e._heldUpdate) {
      const u = e.update.bind(e);
      e.update = (...a) => { u(...a); if (e.alive && e._holdAt) e.group.position.copy(e._holdAt); };
      e._heldUpdate = true;
    }
    return e;
  },
  hold() { return null; }, // kept for the scenario table; the wrap above does the work
  solo(kind, dist) {
    this.reset();
    const spawn = { Skull: () => window.__hd.debug.spawnSkull(), Dread: () => window.__hd.debug.spawnDread(),
      Brute: () => { const p = ringSpot(8).clone(); p.y = 1.3; const b = new Brute(scene, p); enemies.push(b); return b; },
      Spider: () => window.__hd.debug.spawnSpider(), Watcher: () => window.__hd.debug.spawnWatcher() }[kind];
    spawn();
    const e = enemies[enemies.length - 1];
    e.hp = 99999;
    this.place(e, dist);
    return null;
  },
  chip(frac) {
    const e = enemies.find(x => x.alive); if (!e) return null;
    const sp = e.sprite; e.group.updateWorldMatrix(true, true);
    const wv = sp.worldVoxels(); if (!wv.length) return null;
    const front = wv.reduce((a, v) => (v.pos.z > a.pos.z ? v : a), wv[0]);
    const out = sp.chip(front.pos, Math.ceil(sp.voxels.length * frac));
    for (const c of out) debris.spawn(c.pos, c.color, new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, 2 + Math.random() * 3), sp.size * 0.9, 1.2, c.base ?? c.color);
    return null;
  },
  killAt(frame) { this._f = (this._f || 0) + 1; if (this._f === frame) { const e = enemies.find(x => x.alive); if (e) { e.hp = 1; e.hit(5, new THREE.Vector3(0, 0, -1)); if (e.hp <= 0) killEnemy(e, new THREE.Vector3(0, 0.5, -1)); } } return null; },
  serpent() { this.reset(); window.__hd.debug.spawnSerpent(); player.feet.set(0, 0, 10); player._sync(); return null; },
  court() { this.reset(); player.feet.set(4, 0, 4); player.yaw = 0.5; player._sync(); return null; },
  // the wall run, scripted: in front of the north wall looking along it,
  // one jump, speed along the wall leaning into it, a kick-off mid-way
  wallStart() { this.reset(); this.slow(0.12); player.feet.set(-5.5, 0, -14.6); player.yaw = -Math.PI / 2 + 0.25; player.pitch = 0.05; player._sync(); this._f = 0; return null; },
  wallTick() {
    this._f = (this._f || 0) + 1;
    if (this._f === 2) player.jumpBuffer = 0.11;
    if (this._f < 16) { player.velocity.x = 9.5; player.velocity.z = -3; }
    if (this._f === 16) player.jumpBuffer = 0.11;   // the kick-off, hands off after
    return null;
  },
  run(x, z) { player.velocity.set(x * 9, 0, z * 9); return null; },
  hudOff() { for (const id of ['hud', 'style', 'timer']) { const el = document.getElementById(id); if (el) el.style.opacity = '0'; } return null; },
  caption(text) {
    let d = document.getElementById('_loopcap');
    if (!d) { d = document.createElement('div'); d.id = '_loopcap';
      d.style.cssText = 'position:fixed;left:0;right:0;top:8px;z-index:999;text-align:center;font:bold 14px monospace;color:#f0e6e6;text-shadow:0 0 8px #c00;pointer-events:none;';
      document.body.appendChild(d); }
    d.textContent = text; return null;
  },
};
`;

function stage() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-loop-'));
  for (const sub of ['hyperdagger', 'hub', 'toko']) fs.cpSync(path.join(ROOT, sub), path.join(dir, sub), { recursive: true, filter: p => !p.includes('/test/') });
  fs.appendFileSync(path.join(dir, 'hyperdagger', 'js', 'main.js'), '\n// ---- hd-loop harness (staged copy only) ----\n' + HARNESS);
  return dir;
}
function serve(dir, port) { return spawn('python3', ['-m', 'http.server', String(port)], { cwd: dir, stdio: 'ignore' }); }

async function capture(page, scn) {
  const frames = [];
  await page.evaluate(`window._LOOP.caption(${JSON.stringify(scn.title)})`);
  await page.evaluate('window._LOOP.hudOff()');
  await page.evaluate(scn.setup);
  if (scn.view) await page.evaluate(`(()=>{const pl=window.__hd.player; pl.yaw=${scn.view[0]}; pl.pitch=${scn.view[1]}; pl._sync();})()`);
  await page.waitForTimeout(500);
  for (let i = 0; i < FRAMES; i++) {
    if (scn.tick && i % (scn.every ?? 3) === 0) await page.evaluate(scn.tick);
    frames.push(await page.screenshot({ type: 'png' }));
    await page.waitForTimeout(STEP);
  }
  return frames;
}
function toGif(pngs, outFile) {
  const gif = GIFEncoder(); let w = 0, h = 0;
  for (const buf of pngs) {
    const png = PNG.sync.read(buf); w = png.width; h = png.height;
    const data = new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length);
    const palette = quantize(data, 64, { format: 'rgb565' });
    gif.writeFrame(applyPalette(data, palette, 'rgb565'), w, h, { palette, delay: DELAY });
  }
  gif.finish(); fs.writeFileSync(outFile, Buffer.from(gif.bytes()));
  return { w, h, bytes: fs.statSync(outFile).size };
}

// ── main ──────────────────────────────────────────────────────────────────────
const names = wanted.length ? wanted.filter(n => SCENARIOS[n]) : Object.keys(SCENARIOS);
if (!names.length) { console.error('no matching scenarios. available: ' + Object.keys(SCENARIOS).join(', ')); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const dir = stage();
const PORT = 8800 + Math.floor(Math.random() * 900);
const srv = serve(dir, PORT);
const cleanup = () => { try { srv.kill(); } catch {} try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { cleanup(); process.exit(1); });
await new Promise(r => setTimeout(r, 1200));
console.log('· staged ' + dir + ', serving on ' + PORT);

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ? ['--no-sandbox', '--single-process', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--in-process-gpu']
    : ['--use-gl=swiftshader', '--disable-dev-shm-usage'],
});
for (const name of names) {
  const scn = SCENARIOS[name];
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://127.0.0.1:${PORT}/hyperdagger/?mode=${scn.mode || 'hyper'}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 60000 });
  await page.evaluate(() => { localStorage.setItem('hyperDaggerSeenTips', '1'); const o = JSON.parse(localStorage.getItem('hyperDaggerOpts') || '{}'); o.perf = 'high'; localStorage.setItem('hyperDaggerOpts', JSON.stringify(o)); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__hd && window.__hd.debug && window._LOOP, null, { timeout: 60000 });
  // the art has to be down before a skin can be on anything
  await page.waitForFunction(() => Object.keys(window.__hd.debug.getVoxelModels()).length >= 14, null, { timeout: 180000 }).catch(() => {});
  await page.evaluate('window._LOOP.boot()');
  await page.waitForTimeout(600);
  const t0 = Date.now();
  const frames = await capture(page, scn);
  const info = toGif(frames, path.join(OUT, name + '.gif'));
  if (STILLS) for (const [tag, i] of [['a', 0], ['b', frames.length >> 1], ['c', frames.length - 1]]) fs.writeFileSync(path.join(OUT, `${name}-${tag}.png`), frames[i]);
  console.log(`· ${name}: ${frames.length} frames, ${info.w}×${info.h}, ${(info.bytes / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(0)} s${errs.length ? '  ERRORS: ' + errs[0] : ''}`);
  await page.close();
}
await browser.close();
cleanup();
