#!/usr/bin/env node
// lookshot.mjs — a picture of one or more species, for look checks.
//
// Boots the game in headless Chromium (WebGPU on SwiftShader), puts only the
// named species in the arena (__toko.showcase), lets them act for a moment
// and saves two screenshots: the whole arena, and a close-up on the first
// body. Optionally the hero shoots the first body (--shoot) to show hits and,
// with enough time, the death.
//
// Usage: node test/lookshot.mjs <key>[,<key>...] <out-prefix> [--secs 1.5] [--shoot] [--wide 4]
//          [--gels classic|sdf] [--webgl]
//   writes <out-prefix>-arena.png and <out-prefix>-close.png. --gels draws the
//   gels in that style (the title's GELS switch, as ?gels=), --webgl forces
//   the WebGL 2 fallback.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { spawn } from 'node:child_process'; import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const kinds = (args[0] || '').split(',').filter(Boolean), out = args[1];
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const secs = +opt('--secs', 1.5), shoot = args.includes('--shoot'), close = +opt('--close', 7);
const query = new URLSearchParams();
if (opt('--gels', null)) query.set('gels', opt('--gels', null));
if (args.includes('--webgl')) query.set('webgl', '');
if (!kinds.length || !out) { console.error('usage: node test/lookshot.mjs <key>[,<key>...] <out-prefix> [--secs 1.5] [--shoot] [--close 7] [--gels classic|sdf] [--webgl]'); process.exit(2); }

const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
}).listen(0, '127.0.0.1');
await new Promise((r) => srv.on('listening', r));
const prof = mkdtempSync(path.join(tmpdir(), 'lookshot-'));
const flags = ['--headless=new', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--no-proxy-server',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--use-vulkan=swiftshader'];
const pr = spawn(process.env.CHROMIUM || '/opt/pw-browsers/chromium', [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'], detached: true });
let buf = '';
const wsUrl = await new Promise((res) => pr.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\S+)/); if (m) res(m[1]); }));
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const errs = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) pend.get(m.id)?.(m.result || m.error); else if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description?.split('\n')[0]); else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map((a) => a.value).join(' ').split('\n')[0]); };
const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)).result?.value;
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 915, height: 412, deviceScaleFactor: 2, mobile: true }, sessionId);
await send('Page.navigate', { url: `http://127.0.0.1:${srv.address().port}/${query.size ? '?' + query.toString().replace(/=(&|$)/g, '$1') : ''}` }, sessionId);
for (let t = 0; t < 120 && !(await ev('!!(window.__toko && window.__toko.ready)')); t++) await sleep(250);
let info = null;
try {
  const bodies = await ev(`__toko.showcase(${JSON.stringify(kinds)})`);
  const first = bodies[0];
  await ev(`__toko.idle(${secs}, ${shoot ? JSON.stringify({ x: first.x, z: first.z }) : 'null'})`);
  await sleep(1200);
  const shot = async (name) => { const s = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(`${out}-${name}.png`, Buffer.from(s.data, 'base64')); };
  await shot('arena');
  const g = await ev(`(() => { const g = __toko.world.gels[0] || { x: ${first.x}, z: ${first.z} }; return { x: g.x, z: g.z }; })()`);
  await ev(`(() => { const t = __toko, c = t.camera; t.freeCam = true; c.clearViewOffset(); c.position.set(${g.x}, ${close * 0.75}, ${g.z} + ${close * 0.66}); c.lookAt(${g.x}, 0.5, ${g.z}); c.updateMatrixWorld(); })()`);
  await sleep(1500);
  await shot('close');
  info = await ev(`(() => { const w = __toko.world; return { time: +w.time.toFixed(2), gels: w.gels.map((g) => ({ kind: g.kind, x: +g.x.toFixed(2), z: +g.z.toFixed(2), hp: g.hp })), bullets: w.bullets.length, lobs: w.lobs.length, hazards: w.hazards.length, lives: w.hero.lives, counts: __toko.counts }; })()`);
} catch (e) { errs.push(String(e)); }
console.log(JSON.stringify(info));
console.log('errors:', errs.length ? errs.slice(0, 5) : 'none');
process.kill(-pr.pid, 'SIGKILL'); srv.close(); await sleep(300);
rmSync(prof, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
process.exit(errs.length ? 1 : 0);
