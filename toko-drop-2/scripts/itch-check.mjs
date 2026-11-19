#!/usr/bin/env node
// itch-check.mjs — boot the itch zip the way itch.io serves it, and fail on
// anything wrong. itch unpacks the zip under a numbered path on its own HTML
// host and shows it in an iframe on the game's page, a different site. So:
// the zip is unpacked and served at /html/<n>/ on `localhost`, a host page on
// `127.0.0.1` (another site, so Chromium gives the frame its own process, as
// itch's does) holds it in an iframe with itch's `allow` list, and the game
// is driven through the frame's own DevTools session. It must:
//   - load every file it asks for (a root-absolute URL 404s here, as on itch)
//   - show its version, start ARCADE and play, with no page error
//   - fetch a campaign room's level and play it to a grade
//   - hand the play record over from inside the frame: a real tap on OPTIONS →
//     PLAY RECORD copies it (v64: itch's frame is not allowed clipboard-write,
//     which blocks the clipboard API there, so the game falls back to the copy
//     command), read back off the clipboard by the host page
//
//   scripts/build-itch.sh && node scripts/itch-check.mjs dist/toko-drop-2-v<N>-itch.zip
// Env: CHROMIUM — the browser binary (default /opt/pw-browsers/chromium)
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname, normalize, sep, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const zip = process.argv[2];
if (!zip || !existsSync(zip)) { console.log('usage: node scripts/itch-check.mjs <zip>'); process.exit(2); }
const root = mkdtempSync(join(tmpdir(), 'itch-'));
execFileSync('unzip', ['-q', resolve(zip), '-d', root]);
// the game's own number is main.js's token (v131: the first `?v=` on the page is the arcade's HOME button script)
const N = readFileSync(join(root, 'index.html'), 'utf8').match(/js\/main\.js\?v=(\d+)/)?.[1];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' };
const PREFIX = '/html/1234567/';
const missing = [], fails = [];
const fail = (m) => { fails.push(m); console.log(`  ✗ ${m}`); };

const game = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  let rel = pathname.startsWith(PREFIX) ? decodeURIComponent(pathname.slice(PREFIX.length)) : null;
  if (rel === '') rel = 'index.html';
  const file = rel == null ? null : normalize(join(root, rel));
  if (!file || !file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) { missing.push(pathname); res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file));
});
await new Promise((r) => game.listen(0, '127.0.0.1', r));
const gameUrl = `http://localhost:${game.address().port}${PREFIX}index.html`;
const host = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><body style="margin:0;background:#222"><iframe id="game" src="${gameUrl}" width="960" height="540" frameborder="0"
    allow="autoplay; fullscreen *; gamepad; gyroscope; accelerometer; cross-origin-isolated" allowfullscreen style="border:0"></iframe></body>`);
});
await new Promise((r) => host.listen(0, '127.0.0.1', r));

const binary = [process.env.CHROMIUM, '/opt/pw-browsers/chromium'].find((b) => b && existsSync(b));
const profile = mkdtempSync(join(tmpdir(), 'itch-cdp-'));
const proc = spawn(binary, ['--headless=new', '--no-sandbox', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--mute-audio', '--no-proxy-server',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--use-vulkan=swiftshader', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'], detached: true });
const wsUrl = await new Promise((res, rej) => { let b = ''; proc.stderr.on('data', (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); setTimeout(() => rej(new Error('no DevTools port')), 20000); });
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let seq = 0; const pend = new Map(); const errors = []; let frameSession = null;
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  if (m.method === 'Target.attachedToTarget' && m.params.targetInfo.type === 'iframe') {
    frameSession = m.params.sessionId;
    send('Runtime.enable', {}, frameSession); send('Runtime.runIfWaitingForDebugger', {}, frameSession);
  }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] ?? m.params.exceptionDetails.text);
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let code = 0;
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sessionId);
  await send('Runtime.enable', {}, sessionId); await send('Page.enable', {}, sessionId);
  // a page that has focus (a headless one does not), and the host's own clipboard readable, to check what a tap copied
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }, sessionId);
  await send('Browser.grantPermissions', { origin: `http://127.0.0.1:${host.address().port}`, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  await send('Page.navigate', { url: `http://127.0.0.1:${host.address().port}/` }, sessionId);
  for (let i = 0; i < 80 && !frameSession; i++) await sleep(250);
  if (!frameSession) throw new Error('the game frame never attached (is it its own site?)');
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, frameSession)).result?.value;
  for (let i = 0; i < 240 && !(await ev('!!(window.__toko && window.__toko.ready)').catch(() => false)); i++) await sleep(250);
  if (!(await ev('!!(window.__toko && window.__toko.ready)'))) throw new Error('the game never got ready in the frame');
  const label = await ev(`document.getElementById('ver')?.textContent`);
  if (!label?.includes(`v${N}`)) fail(`the version on screen is "${label}", not v${N}`);
  const arcade = await ev(`(async () => { const t = __toko; t.nointro = true; t.start('arcade'); for (let i = 0; i < 40 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100)); t.world.hero.invinc = 1e9; t.advance(3); return { state: t.state, time: t.world.time, gels: t.world.gels.length }; })()`);
  if (arcade.state !== 'play' || arcade.time < 2.9) fail(`ARCADE did not play in the frame (${JSON.stringify(arcade)})`);
  const room = await ev(`(async () => { const t = __toko; t.toMenu(); await t.room('flotsam'); for (let i = 0; i < 40 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100)); const w = t.world; w.hero.invinc = 1e9; t.advance(w.room.level.duration + 2); return { state: t.state, res: w.roomResult }; })()`);
  if (!room.res || !/^[SABCF]$/.test(room.res.grade)) fail(`a campaign room did not play to a grade in the frame (${JSON.stringify(room)})`);
  // the play record: the room's entry is written as its result shows, then a real tap (a mouse event at the
  // button, as a finger is) on OPTIONS → PLAY RECORD inside the frame, and the host page reads its clipboard
  // v101: the entry is written as the result shows (main.js finish), after the room's last beat in FRAME time (1.4 s
  // at no more than 0.1 s a frame: 14 frames), so it is waited for by frames as well as by the clock. 15 s by the
  // clock alone was short of 14 frames of a room under SwiftShader in about one run in two (v100 as v101): the tap
  // then found the record empty ("PLAY RECORD · 0", "nothing yet") and copied nothing
  const f0 = await ev('__toko.frames');
  for (const end = Date.now() + 150_000; Date.now() < end; await sleep(250)) {
    const [has, f] = await ev(`[(localStorage.getItem('toko2.record') || '[]').length > 2, __toko.frames]`);
    if (has || f - f0 > 60) break;
  }
  if (!(await ev(`(localStorage.getItem('toko2.record') || '[]').length > 2`))) fail('the room\'s entry never reached the play record');
  // the room's result opens the campaign grid, which builds after its levels load: OPTIONS is opened once
  // that has settled, and again until it stays up
  await sleep(1500);
  const at = await ev(`(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms)), find = () => [...document.querySelectorAll('#menu .item')].find((x) => /PLAY RECORD/.test(x.textContent));
    for (let i = 0; i < 10; i++) { __toko.toMenu(); __toko.ui.openOptions(() => {}); await wait(600); if (find()) { await wait(600); if (find()) break; } }
    const b = find(); if (!b) return null;
    b.scrollIntoView({ block: 'center', behavior: 'instant' }); await wait(300); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  let said = null, pasted = '';
  if (at) {
    // the pointer arrives first: hovering a button focuses it, and focus scrolls the panel, so the button is
    // measured again until it holds still under the pointer
    for (let i = 0; i < 5; i++) {
      const o = JSON.parse((await send('Runtime.evaluate', { expression: 'JSON.stringify(document.querySelector("iframe").getBoundingClientRect())', returnByValue: true }, sessionId)).result.value);
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x + o.x, y: at.y + o.y }, sessionId); await sleep(400);
      const now = await ev(`(() => { const b = [...document.querySelectorAll('#menu .item')].find((x) => /PLAY RECORD/.test(x.textContent)), r = b?.getBoundingClientRect(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; })()`);
      if (!now) break;
      const still = Math.abs(now.x - at.x) < 1 && Math.abs(now.y - at.y) < 1;
      at.x = now.x; at.y = now.y;
      if (still) break;
    }
    // a point in the frame is a point on the host page plus where the frame sits there now (the host scrolls
    // when the frame scrolls a button into view: the frame is taller than a headless window)
    const off = JSON.parse((await send('Runtime.evaluate', { expression: 'JSON.stringify(document.querySelector("iframe").getBoundingClientRect())', returnByValue: true }, sessionId)).result.value);
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: at.x + off.x, y: at.y + off.y, button: 'left', clickCount: 1 }, sessionId);
    for (let i = 0; i < 20 && !said; i++) { await sleep(250); said = await ev(`[...document.querySelectorAll('#menu .item')].find((x) => /PLAY RECORD/.test(x.textContent))?.querySelector('.sub')?.textContent`); if (!/COPIED|SHARED|SAVED/.test(said ?? '')) said = null; }
    pasted = (await send('Runtime.evaluate', { expression: 'navigator.clipboard.readText().catch((e) => "(" + e.name + ")")', awaitPromise: true, returnByValue: true }, sessionId)).result?.value ?? '';
  }
  if (!at) fail('OPTIONS → PLAY RECORD was not on screen in the frame');
  else if (!/^TOKO DROP 2\.0 · PLAY RECORD\n/.test(pasted)) fail(`a tap on PLAY RECORD in the frame did not copy the record (the button says "${said}", the clipboard holds "${pasted.slice(0, 60)}")`);
  if (missing.length) fail(`asked for files the zip does not have: ${[...new Set(missing)].join(', ')}`);
  if (errors.length) fail(`page errors: ${errors.join(' | ')}`);
  console.log(fails.length ? `\n✗ itch check: ${fails.length} failed` : `✔ itch check: v${N} boots in an itch-style frame on another site, ARCADE plays, FLOTSAM plays to ${room.res.grade}, a tap copies the play record, no 404s, no errors`);
  code = fails.length ? 1 : 0;
} catch (e) { console.log(`✗ itch check: ${e.message}`); code = 1; }
finally {
  ws.close(); game.close(); host.close();
  try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
  await sleep(500); rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); rmSync(root, { recursive: true, force: true });
}
process.exit(code);
