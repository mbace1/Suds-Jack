#!/usr/bin/env node
// scripts/enemy-loop.mjs — record a looping GIF of an enemy BEHAVING, straight
// from the real game code, so design questions can be answered with a moving
// picture instead of a paragraph.
//
//   node scripts/enemy-loop.mjs                 # every scenario
//   node scripts/enemy-loop.mjs dodge charge    # named scenarios
//   node scripts/enemy-loop.mjs --out /tmp/gifs --frames 48
//
// Output: one <scenario>.gif per scenario in --out (default ./loops).
//
// Why screenshots rather than reading the WebGL canvas: the game creates its
// context without preserveDrawingBuffer, so drawImage()-ing it into a 2D canvas
// can come back cleared. page.screenshot() always sees the composited frame.
//
// Requires (dev-only, not shipped with the game): gifenc, pngjs, playwright.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const { PNG } = require('pngjs');

const CAP_Y = 330;   // clip top in CSS px; the caption sits just inside it
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const GAME = path.join(ROOT, 'toko-drop');

// ── args ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const OUT    = path.resolve(opt('out', path.join(process.cwd(), 'loops')));
const FRAMES = +opt('frames', 40);
const DELAY  = +opt('delay', 60);         // ms per frame in the finished GIF
const STEP   = +opt('step', 70);          // ms of wall time between captures
const WIDTH  = +opt('width', 400);        // clip width in CSS px (GIF is 2x this)
const wanted = argv.filter(a => !a.startsWith('--') && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);

// ── scenarios ─────────────────────────────────────────────────────────────────
// Each is { title, setup } where setup runs in the page against window._LOOP.
// Keep them deterministic and short — these are answers to design questions,
// not gameplay footage.
const SCENARIOS = {
  dodge: {
    title: 'FLIT — reads the lane and sidesteps',
    type: 'FLIT',
    setup: 'window._LOOP.solo("FLIT", 4)',
    tick:  'window._LOOP.shoot()',
    every: 3,
  },
  charge: {
    title: 'TORO — committed to the line, never sidesteps',
    type: 'TORO',
    setup: 'window._LOOP.solo("TORO", 5)',
    tick:  'window._LOOP.shoot()',
    every: 3,
  },
  weave: {
    title: 'CLOAKER — its own serpentine approach',
    type: 'CLOAKER',
    setup: 'window._LOOP.solo("CLOAKER", 7)',
  },
  school: {
    title: 'FLIT ×9 — fish school with fish',
    type: 'FLIT',
    setup: 'window._LOOP.many("FLIT", 9, 7)',
  },
  hold: {
    title: 'SPITTOR — holds its ground under fire',
    type: 'SPITTOR',
    setup: 'window._LOOP.solo("SPITTOR", 5)',
    tick:  'window._LOOP.shoot()',
    every: 3,
  },
};

// ── the in-page harness ───────────────────────────────────────────────────────
// Appended to a throwaway copy of main.js: a clean arena, a parked invulnerable
// player, and one lever per scenario. Nothing here ships.
const HARNESS = `
const CAP_Y = %CAP_Y%;
window._LOOP = {
  boot() { startGame(); },
  reset() {
    for (const e of enemies) { e.alive = false; e._dying = false; }
    enemies = []; pendingSpawns = []; bullets.clear();
    player.mesh.position.set(0, PLAYER_RADIUS, HALF_Z - 3);
    player.grantInvincibility(99999);
    waveIntroT = 0; milestoneT = 0;
    return null;
  },
  solo(type, dist) {
    this.reset();
    const e = new Enemy(scene, EnemyType[type], 0, HALF_Z - 3 - dist, 1, 1);
    e.hp = 99999; enemies.push(e);
    return null;
  },
  many(type, n, dist) {
    this.reset();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const e = new Enemy(scene, EnemyType[type],
        Math.cos(a) * dist, HALF_Z - 3 - dist + Math.sin(a) * dist * 0.5, 1, 1);
      e.hp = 99999; enemies.push(e);
    }
    return null;
  },
  shoot() {
    const e = enemies.find(x => x.alive);
    if (!e) return null;
    const dx = e.position.x - player.position.x, dz = e.position.z - player.position.z;
    const d = Math.hypot(dx, dz) || 1;
    bullets.spawnDir(player.position.x, player.position.z, dx / d, dz / d, true, 0xffffff);
    return null;
  },
  hudOff() { const c = document.getElementById('ui'); if (c) c.style.display = 'none'; return null; },
  caption(text) {
    let d = document.getElementById('_loopcap');
    if (!d) {
      d = document.createElement('div');
      d.id = '_loopcap';
      d.style.cssText = 'position:fixed;left:0;right:0;z-index:999;text-align:center;' +
        'font:bold 15px monospace,sans-serif;color:#cfe3ff;text-shadow:0 0 8px #0af;' +
        'letter-spacing:0.5px;pointer-events:none;';
      document.body.appendChild(d);
    }
    d.style.top = CAP_Y + 'px';
    d.textContent = text;
    return null;
  },
};
`;

// ── build a throwaway copy of the game with the harness appended ──────────────
function stage() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'toko-loop-'));
  fs.cpSync(GAME, dir, { recursive: true });
  fs.appendFileSync(path.join(dir, 'js', 'main.js'), '\n// ---- enemy-loop harness ----\n' + HARNESS.replace('%CAP_Y%', String(CAP_Y + 6)));
  return dir;
}

function serve(dir, port) {
  const srv = spawn('python3', ['-m', 'http.server', String(port)], { cwd: dir, stdio: 'ignore' });
  return srv;
}

// ── capture ───────────────────────────────────────────────────────────────────
async function capture(page, scn, clip) {
  const frames = [];
  await page.evaluate(`window._LOOP.caption(${JSON.stringify(scn.title)})`);
  await page.evaluate(scn.setup);
  await page.waitForTimeout(400);
  for (let i = 0; i < FRAMES; i++) {
    const t0 = Date.now();
    if (scn.tick && i % (scn.every ?? 3) === 0) await page.evaluate(scn.tick);
    const t1 = Date.now();
    frames.push(await page.screenshot({ clip, type: 'png' }));
    const t2 = Date.now();
    if (process.env.LOOP_DEBUG) console.log(`   frame ${i}: tick ${t1 - t0}ms shot ${t2 - t1}ms`);
    await page.waitForTimeout(STEP);
  }
  return frames;
}

function toGif(pngBuffers, outFile) {
  const gif = GIFEncoder();
  let w = 0, h = 0;
  for (const buf of pngBuffers) {
    const png = PNG.sync.read(buf);
    w = png.width; h = png.height;
    const data = new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length);
    const palette = quantize(data, 64, { format: 'rgb565' });
    const index = applyPalette(data, palette, 'rgb565');
    gif.writeFrame(index, w, h, { palette, delay: DELAY });
  }
  gif.finish();
  fs.writeFileSync(outFile, Buffer.from(gif.bytes()));
  return { w, h, bytes: fs.statSync(outFile).size };
}

// ── main ──────────────────────────────────────────────────────────────────────
const names = wanted.length ? wanted.filter(n => SCENARIOS[n]) : Object.keys(SCENARIOS);
if (!names.length) {
  console.error('no matching scenarios. available: ' + Object.keys(SCENARIOS).join(', '));
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const dir = stage();
// A fixed port strands the next run behind a stale server, so take a random
// high one — and clean up on every exit path, including the signals a timeout
// sends, which is how the first version leaked both a server and a temp dir.
const PORT = 8800 + Math.floor(Math.random() * 900);
const srv = serve(dir, PORT);
const cleanup = () => {
  try { srv.kill(); } catch (_) {}
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
};
process.on('exit', cleanup);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => { cleanup(); process.exit(1); });
}
await new Promise(r => setTimeout(r, 1200));
console.log('· staged ' + dir + ', serving on ' + PORT);

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
console.log('· browser up');
const page = await (await browser.newContext({ viewport: { width: 900, height: 760 }, deviceScaleFactor: 2 })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
// NOT networkidle: the game registers a service worker that keeps the network
// warm, so networkidle never settles and goto() hangs. Wait on the harness.
await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
console.log('· page loaded');
await page.waitForFunction(() => window._LOOP, null, { timeout: 20000 });
console.log('· harness ready');
await page.evaluate('window._LOOP.boot()');
await page.waitForTimeout(1200);
await page.evaluate('window._LOOP.hudOff()');
console.log('· game booted, capturing');

// Frame the lower-middle of the arena, where the harness parks the action.
// deviceScaleFactor 2 means the GIF comes out at twice these CSS pixels.
const clip = { x: 250, y: CAP_Y, width: WIDTH, height: 230 };

const made = [];
for (const name of names) {
  const scn = SCENARIOS[name];
  process.stdout.write(`· ${name.padEnd(8)} ${scn.title} … `);
  const frames = await capture(page, scn, clip);
  const out = path.join(OUT, `${name}.gif`);
  const { w, h, bytes } = toGif(frames, out);
  console.log(`${w}×${h}, ${frames.length} frames, ${(bytes / 1024).toFixed(0)} KB → ${out}`);
  made.push(out);
}

await browser.close();
if (errs.length) console.log('page errors: ' + errs.slice(0, 3).join(' | '));
console.log('\n' + made.length + ' loop(s) written to ' + OUT);
