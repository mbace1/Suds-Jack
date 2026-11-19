#!/usr/bin/env node
// itch-shots.mjs — screenshots for the itch page (docs/ITCH.md): the nine
// arcade worlds mid-fight, the campaign grid and a boss room, at 1920 × 1080
// (a 960 × 540 page at 2×), from the itch zip itself. The hero is kept alive
// while the game runs ahead and let go before the picture, so the debug line
// that says so is not in it.
//
//   node scripts/itch-shots.mjs dist/toko-drop-2-v<N>-itch.zip [outDir=dist/itch-shots]
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname, normalize, sep, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// v156: --gl opens the game on its WebGL 2 path (?webgl): a sandbox whose software GPU cannot run WebGPU draws
// every picture blank otherwise
const GL = process.argv.includes('--gl') ? 'webgl&' : '';
const zip = process.argv[2], OUT = resolve(process.argv[3] ?? 'dist/itch-shots');
if (!zip || !existsSync(zip)) { console.log('usage: node scripts/itch-shots.mjs <zip> [outDir]'); process.exit(2); }
mkdirSync(OUT, { recursive: true });
const root = mkdtempSync(join(tmpdir(), 'itch-shots-'));
execFileSync('unzip', ['-q', resolve(zip), '-d', root]);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1)) || 'index.html';
  const file = normalize(join(root, rel));
  if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const binary = [process.env.CHROMIUM, '/opt/pw-browsers/chromium'].find((b) => b && existsSync(b));
const profile = mkdtempSync(join(tmpdir(), 'itch-shots-cdp-'));
const proc = spawn(binary, ['--headless=new', '--no-sandbox', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--mute-audio', '--no-proxy-server',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--use-vulkan=swiftshader', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'], detached: true });
const wsUrl = await new Promise((res, rej) => { let b = ''; proc.stderr.on('data', (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); setTimeout(() => rej(new Error('no DevTools port')), 20000); });
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NAMES = ['grid', 'driveway', 'sewer', 'cistern', 'boiler', 'river', 'ice', 'deep', 'core'];

async function page(url) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: 960, height: 540, deviceScaleFactor: 2, mobile: false });
  await s('Page.navigate', { url });
  const ev = async (expression) => (await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
  for (let i = 0; i < 240 && !(await ev('!!(window.__toko && window.__toko.ready)')); i++) await sleep(250);
  const shot = async (name) => { const r = await s('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, `${name}.png`), Buffer.from(r.data, 'base64')); console.log(`  ${name}.png`); };
  return { ev, shot, close: () => send('Target.closeTarget', { targetId }) };
}
const letGo = `(() => { const h = __toko.world.hero; h.invinc = 0; h.mercy = 0; })()`;
try {
  for (const [i, name] of NAMES.entries()) {
    const p = await page(`${base}?${GL}nointro&world=${i + 1}`);
    await p.ev(`(async () => { const t = __toko; t.start('arcade'); for (let i = 0; i < 40 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100)); t.world.hero.invinc = 1e9; t.advance(14); })()`);
    await p.ev(letGo); await sleep(2500);
    await p.shot(`${String(i + 1).padStart(2, '0')}-${name}`); await p.close();
  }
  const g = await page(`${base}?${GL}nointro`);
  await g.ev(`(async () => { localStorage.setItem('toko2.campaign', JSON.stringify({ 'first-light': { grade: 'S' }, 'high-ground': { grade: 'A' }, 'three-rings': { grade: 'S' }, 'first-swarm': { grade: 'B' } })); __toko.toMenu(); [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'CAMPAIGN').click(); for (let i = 0; i < 40 && !document.querySelector('#menu .grid .tile'); i++) await new Promise((r) => setTimeout(r, 100)); })()`);
  await sleep(1500); await g.shot('10-campaign'); await g.close();
  const b = await page(`${base}?${GL}nointro`);
  await b.ev(`(async () => { const t = __toko; await t.room('boil-over'); for (let i = 0; i < 40 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100)); t.world.hero.invinc = 1e9; t.advance(9); })()`);
  await b.ev(letGo); await sleep(2500); await b.shot('11-boss-room'); await b.close();
  console.log(`✔ screenshots in ${OUT}`);
} finally {
  ws.close(); server.close();
  try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
  await sleep(500); rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); rmSync(root, { recursive: true, force: true });
}
