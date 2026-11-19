#!/usr/bin/env node
// smoke.mjs — boot the real game in headless Chromium and fail on anything wrong.
//
// Zero dependencies, so it runs the same here, in CI and anywhere with node 22
// and a Chromium: the site is served by node:http under /toko-drop/ (exactly
// the path GitHub Pages serves it from, so a root-absolute URL 404s here as it
// would there), and Chromium is driven over the DevTools protocol with node's
// own WebSocket.
//
// Each scenario boots the page fresh and lets the loop run for a few seconds:
//   landscape   a phone held sideways (the layout this game is built for);
//               the default backend, which is WebGPU wherever the browser
//               offers an adapter (headless Chromium does, via SwiftShader).
//               The arrow keys and Enter walk the title and flip its DASH
//               switch, and SURVIVAL, off the title for now, still runs
//   portrait    a phone held upright from boot: 1.x's tall arena
//   rotate      the landscape boot, then the phone turned to portrait mid-run
//               (the arena must NOT change shape: 1.x picks it per run)
//   ipad        an iPad sideways, and `ipad-portrait` upright, which also runs
//               with ?goo=off: the goo check's control (below)
//   pad         the iPad with a DualSense: a stubbed standard-mapping gamepad
//               walks the menu, flips the DASH switch PUSH → CUT → PUSH,
//               starts a run (with 1.x's PASS saved, which plays PUSH now),
//               moves, aims and fires on the sticks, dashes on Cross, pauses
//               and resumes on Options
//   webgl2      ?webgl — the WebGL 2 fallback path, forced
//   sdf         ?gels=sdf — the title's GELS · SDF (render/sdf.js) on WebGPU:
//               the label says so, the gels are fields and are drawn (a
//               bright pixel at each one's projected centre), and the title's
//               GELS switch flips both ways, persists across a reload, and
//               drops the URL override; `sdf-webgl2` is the same on WebGL 2
// Every scenario also checks the menu's and the pause button's touch targets
// are at least 44 px, that the title offers ARCADE (HARD makes it HARDCADE) but not
// SURVIVAL (hidden for now), and that the arena is 1.x's for the screen's shape,
// and kills one gel in the middle of the arena: the goo (render/goo.js) must
// throw drops and leave goo in the floor's film where it died, read back off
// the film itself — and in the ?goo=off control, none of either, and 1.x's
// puddles instead, so the reading cannot pass on a build that draws no goo.
// `--quick` runs landscape and webgl2 only. `--gl` runs every scenario on WebGL 2 (a sandbox with no WebGPU).
// and fails on: a page error or console.error, a failed or 4xx/5xx request,
// a module requested without a ?v= token, the fault box showing, the loop not
// advancing, the HUD label disagreeing with VERSIONS.md, the arena not wholly
// on screen, or a frame that is not 1.x's look (uniform, no navy floor, no
// bright gel hero standing on it).
//
// Usage:  node test/smoke.mjs [--url <site-url>] [--out <dir>]
//   --url  smoke a deployed copy instead (e.g. https://mbace1.github.io/toko-drop/)
//   --out  where the screenshots go (default: $TMPDIR/toko2-smoke)
// Env:    CHROMIUM — the browser binary (default: /opt/pw-browsers/chromium,
//         then google-chrome / chromium on PATH)
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { TUNING } from '../js/tuning.js?v=156';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = '/toko-drop/';
// the arcade's worlds by id, in order (TUNING.worlds.list): what each world's surround is named after
const WORLD_IDS = ['grid', 'driveway', 'sewer', 'cistern', 'boiler', 'river', 'ice', 'deep', 'core'];
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
let REMOTE = opt('--url');
// An empty --url (an unset variable in CI) must not quietly smoke the local
// tree instead and call the live site verified.
if (args.includes('--url') && !/^https?:\/\/\S+$/.test(REMOTE || '')) {
  console.error(`✗ --url needs a site URL, got "${REMOTE ?? ''}"`);
  process.exit(2);
}
if (REMOTE && !REMOTE.endsWith('/') && !/\.[a-z]+$/i.test(new URL(REMOTE).pathname)) REMOTE += '/';
const OUT = opt('--out') || join(tmpdir(), 'toko2-smoke');
const BOOT_TIMEOUT = 45_000;   // SwiftShader parsing 3.7 MB of three is not quick
const RUN_MS = 3_000;          // "a few seconds of play"
const MIN_FRAMES = 3;          // over RUN_MS; SwiftShader manages a handful a second
const FRAME_GRACE = 12_000;    // a loaded CI box is slow, not stopped: wait this long for them

const N = readFileSync(join(ROOT, 'VERSIONS.md'), 'utf8').match(/^## v(\d+)\b/m)[1];
const LABEL = `2.0 · v${N}`;

// ---------------------------------------------------------------- the server
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8',
};
function serve() {
  const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://local');
    if (pathname === PREFIX.slice(0, -1)) { res.writeHead(301, { location: PREFIX }); return res.end(); }
    if (!pathname.startsWith(PREFIX)) { res.writeHead(404); return res.end(); }
    let rel;
    try { rel = decodeURIComponent(pathname.slice(PREFIX.length)); }
    catch { res.writeHead(400); return res.end(); }   // a malformed %-escape is a 400, not a crash
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const file = normalize(join(ROOT, rel));
    if (!file.startsWith(ROOT + sep) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404); return res.end();
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ---------------------------------------------------------------- the browser
function findChromium() {
  const candidates = [process.env.CHROMIUM, '/opt/pw-browsers/chromium'];
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { candidates.push(execFileSync('which', [name], { encoding: 'utf8' }).trim()); } catch {}
  }
  const found = candidates.find((c) => c && existsSync(c));
  if (!found) throw new Error('no Chromium found — set CHROMIUM=/path/to/chrome');
  return found;
}

function launch(binary, profile) {
  const flags = [
    '--headless=new', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--mute-audio',
    // A software GPU for both paths: WebGL 2 through ANGLE, WebGPU through Dawn.
    // Without Vulkan on SwiftShader, headless WebGPU loses its device at the
    // second or third frame ("A valid external Instance reference no longer
    // exists") — even on a bare page with no three in it.
    '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
    '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader',
    '--enable-features=Vulkan', '--use-vulkan=swiftshader',
  ];
  if (!REMOTE) flags.push('--no-proxy-server');
  else if (process.env.HTTPS_PROXY) flags.push(`--proxy-server=${process.env.HTTPS_PROXY}`);
  // Its own process group, so one kill takes the GPU, renderer and utility
  // children with it: they otherwise outlive the browser for a moment and
  // keep writing into the profile we are about to delete.
  const proc = spawn(binary, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'], detached: true });
  return new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => { kill(proc); reject(new Error('Chromium did not open a DevTools port in 20 s')); }, 20_000);
    proc.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); resolve({ proc, ws: m[1] }); }
    });
    proc.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Chromium exited (${code}) before DevTools came up:\n${buf.slice(-800)}`)); });
  });
}

function kill(proc) {
  try { process.kill(-proc.pid, 'SIGKILL'); } catch { try { proc.kill('SIGKILL'); } catch {} }
}

// Cleanup never decides the verdict: wait for the browser to be gone, retry
// the delete, and only warn if the profile still will not go.
async function shutdown(proc, profile) {
  if (proc && proc.exitCode === null && proc.signalCode === null) {
    const gone = new Promise((r) => proc.once('exit', r));
    kill(proc);
    await Promise.race([gone, new Promise((r) => setTimeout(r, 5_000))]);
  } else if (proc) kill(proc);   // the browser itself may be gone while its children are not
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
  catch (e) { console.log(`  · could not remove ${profile} (${e.code}); left behind`); }
}

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.seq = 0; this.pending = new Map(); this.listeners = new Set();
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id); clearTimeout(p.timer);
        msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result);
      } else for (const fn of this.listeners) fn(msg);
    };
  }
  open() { return new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = () => rej(new Error('DevTools socket failed')); }); }
  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => {
      // v101: name what stalled (a bare "no answer" took a re-run with logging to place)
      const what = typeof params.expression === 'string' ? ` — ${params.expression.replace(/\s+/g, ' ').slice(0, 220)}` : '';
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method}: no answer in 60 s${what}`)); }, 60_000);
      this.pending.set(id, { resolve, reject, method, timer });
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

// ---------------------------------------------------------------- png → pixels
// Just enough PNG to read Chromium's screenshots: 8-bit RGB/RGBA, no interlace.
function decodePng(buf) {
  let off = 8, width, height, channels; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      const depth = data[8], color = data[9], interlace = data[12];
      if (depth !== 8 || interlace || ![2, 6].includes(color)) throw new Error(`unsupported PNG (depth ${depth}, colour ${color})`);
      channels = color === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat)), stride = width * channels;
  const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? px[y * stride + x - channels] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? px[(y - 1) * stride + x - channels] : 0;
      let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + x] = v & 255;
    }
  }
  return { width, height, channels, px };
}

// Mean colour (0..1) of a rectangle given in fractions of the frame.
function regionMean(img, fx0, fy0, fx1, fy1) {
  const x0 = Math.max(0, Math.floor(fx0 * img.width)), x1 = Math.min(img.width, Math.ceil(fx1 * img.width));
  const y0 = Math.max(0, Math.floor(fy0 * img.height)), y1 = Math.min(img.height, Math.ceil(fy1 * img.height));
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * img.width + x) * img.channels;
    r += img.px[i]; g += img.px[i + 1]; b += img.px[i + 2]; n++;
  }
  n *= 255;
  return { r: r / n, g: g / n, b: b / n, lum: (0.2126 * r + 0.7152 * g + 0.0722 * b) / n };
}

// Brightest luminance (0..1) in a rectangle given in fractions of the frame.
function regionMax(img, fx0, fy0, fx1, fy1) {
  const x0 = Math.max(0, Math.floor(fx0 * img.width)), x1 = Math.min(img.width, Math.ceil(fx1 * img.width));
  const y0 = Math.max(0, Math.floor(fy0 * img.height)), y1 = Math.min(img.height, Math.ceil(fy1 * img.height));
  let best = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * img.width + x) * img.channels;
    best = Math.max(best, (0.2126 * img.px[i] + 0.7152 * img.px[i + 1] + 0.0722 * img.px[i + 2]) / 255);
  }
  return best;
}

function lumSpread(img) {
  let s = 0, s2 = 0, n = 0;
  for (let i = 0; i < img.px.length; i += img.channels * 7) {
    const l = (0.2126 * img.px[i] + 0.7152 * img.px[i + 1] + 0.0722 * img.px[i + 2]) / 255;
    s += l; s2 += l * l; n++;
  }
  const mean = s / n;
  return Math.sqrt(Math.max(0, s2 / n - mean * mean));
}

// ---------------------------------------------------------------- scenarios
// CSS viewports: a Pixel-class phone and an iPad Air, each both ways up
const DEVICES = {
  phone: { dpr: 2.625, landscape: { width: 915, height: 412 }, portrait: { width: 412, height: 915 } },
  ipad: { dpr: 2, landscape: { width: 1180, height: 820 }, portrait: { width: 820, height: 1180 } },
};
const QUICK = process.argv.includes('--quick');
// v156: --gl runs every scenario on the WebGL 2 path (?webgl): a sandbox whose software GPU cannot run WebGPU (its
// createBuffer refuses mappedAtCreation buffers) can still smoke the whole game this way
const GL = process.argv.includes('--gl');
const ONLY = opt('--only');   // run one scenario by name, e.g. --only pad
// A DualSense as the Gamepad API reports it (standard mapping), installed
// before the page's scripts run; the harness drives it by mutating window.__pad.
const PAD_STUB = `window.__pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
navigator.getGamepads = () => [window.__pad, null, null, null];`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// v101: killed from outside (a `timeout`, a ^C) node dies before the finally below,
// and the browser is in its own process group, so it outlived us and went on
// rendering: three such orphans once held three of four CPUs, and the next run
// lost its GPU instance halfway through. Take the group down with us.
let live = null;
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { if (live) { kill(live.proc); try { rmSync(live.profile, { recursive: true, force: true }); } catch {} } process.exit(130); });
process.on('exit', () => { if (live && live.proc.exitCode === null && live.proc.signalCode === null) kill(live.proc); });

async function run() {
  mkdirSync(OUT, { recursive: true });
  const binary = findChromium();
  const server = REMOTE ? null : await serve();
  const base = REMOTE || `http://127.0.0.1:${server.address().port}${PREFIX}`;
  const profile = mkdtempSync(join(tmpdir(), 'toko2-chrome-'));
  let proc = null, cdp = null;
  try {
    const launched = await launch(binary, profile);
    proc = launched.proc; live = { proc, profile };
    cdp = new CDP(launched.ws);
    await cdp.open();
    return await drive(cdp, base);
  } finally {
    cdp?.close();
    server?.close();
    await shutdown(proc, profile);
  }
}

async function drive(cdp, base) {
  const failures = [];
  const report = [];
  let gpuAdapter = null;

  async function scenario(name, { query = '', device = 'phone', orientation = 'landscape', rotate = false, pad = false, menu = false, worldsTest = false, expectBackend }) {
    if (GL && !/[?&]webgl\b/.test(query)) { query = query ? `${query}&webgl` : '?webgl'; expectBackend = 'webgl2'; }
    // v156: SETTINGS keeps the test, look and quality switches for ?dev (a player sees eight rows), and these checks
    // drive them (DASH, SPLATTER, WORLDS, the quality, the dead zone), so every scenario opens with ?dev
    if (!/[?&]dev\b/.test(query)) query = query ? `${query}&dev` : '?dev';
    if (ONLY && name !== ONLY) return;
    const wantGels = /[?&]gels=sdf\b/.test(query) ? 'sdf' : 'classic';
    const wantStyle = (query.match(/[?&]style=(cel|watercolor)\b/) || [])[1] || 'physical';   // v92
    const wantWorld = Number((/[?&]world=(\d)/.exec(query) || [])[1] || 1);
    // the WORLDS look (v23): STREET's floors, or NEON's abstract ones
    const neon = /[?&]worlds=neon\b/.test(query), STYLES = (neon ? ['grid', 'hex', 'tide'] : ['grid', 'concrete', 'sewer']).concat(['cistern', 'boiler', 'river', 'ice', 'deep', 'core']);   // ?world=2 / 3: the run starts in a later world (v19)
    const fails = [];
    const fail = (m) => fails.push(m);
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const send = (m, p) => cdp.send(m, p, sessionId);
    const evaluate = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(`evaluate threw: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
      return r.result.value;
    };

    const requests = new Map();
    const listener = (msg) => {
      if (msg.sessionId !== sessionId) return;
      const p = msg.params;
      switch (msg.method) {
        case 'Runtime.exceptionThrown':
          fail(`page error: ${p.exceptionDetails.exception?.description || p.exceptionDetails.text}`); break;
        case 'Runtime.consoleAPICalled':
          if (p.type === 'error' || p.type === 'assert') fail(`console.${p.type}: ${p.args.map((a) => a.value ?? a.description).join(' ')}`);
          break;
        case 'Log.entryAdded':
          if (p.entry.level === 'error') fail(`browser log: ${p.entry.text}${p.entry.url ? ' ' + p.entry.url : ''}`); break;
        case 'Network.requestWillBeSent': requests.set(p.requestId, p.request.url); break;
        case 'Network.responseReceived':
          if (p.response.status >= 400) fail(`HTTP ${p.response.status} ${p.response.url}`); break;
        case 'Network.loadingFailed':
          if (!p.canceled) fail(`request failed (${p.errorText}) ${requests.get(p.requestId)}`); break;
      }
    };
    cdp.listeners.add(listener);
    for (const d of ['Runtime', 'Log', 'Network', 'Page']) await send(`${d}.enable`);
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    const setPhone = (o) => send('Emulation.setDeviceMetricsOverride', {
      ...DEVICES[device][o], deviceScaleFactor: DEVICES[device].dpr, mobile: true,
      screenOrientation: o === 'landscape' ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
    });
    await setPhone(orientation);
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    if (pad) await send('Page.addScriptToEvaluateOnNewDocument', { source: PAD_STUB });

    const url = base + query + (query ? '&' : '?') + 'nointro';   // the film is checked once, on purpose, in the landscape scenario
    await send('Page.navigate', { url });
    const t0 = Date.now();
    let ready = false;
    while (Date.now() - t0 < BOOT_TIMEOUT) {
      ready = await evaluate('!!(window.__toko && window.__toko.ready)').catch(() => false);
      if (ready || fails.length) break;
      await sleep(250);
    }
    const bootMs = Date.now() - t0;
    if (!ready) fail(`not ready after ${Math.round(bootMs / 1000)} s (window.__toko.ready never became true)`);

    let info = {};
    if (ready) {
      if (gpuAdapter === null) gpuAdapter = await evaluate('navigator.gpu ? navigator.gpu.requestAdapter().then((a) => !!a, () => false) : false');
      // The title must offer a way in, and the modes the owner set
      // (2026-10-22): ARCADE and HARDCADE, and from v20 SURVIVAL again. Then
      // PLAY, the way a thumb does: tap ARCADE, hold the right half of the
      // screen and drag (aim + fire), let go (dash), all through real touch events.
      const rows = (await evaluate(`[...document.querySelectorAll('#menu .item .label')].map((e) => e.textContent)`)) || [];
      const menuOk = rows.join('|');
      // v27 (owner, 2026-10-23): ARCADE with a HARD switch that turns it into
      // HARDCADE, the CAMPAIGN, and no SURVIVAL on the title
      // v38 (owner, 2026-10-24): ARCADE with HARD beside it, CAMPAIGN and MENU — and nothing else to press
      if (rows.includes('INTRO')) fail(`the title still offers INTRO (menu: "${menuOk}")`);
      if (!rows.includes('ARCADE') || !rows.includes('HARD') || !rows.includes('CAMPAIGN')) fail(`the title does not offer ARCADE, HARD and CAMPAIGN (menu: "${menuOk}")`);
      if (rows.includes('SURVIVAL') || rows.includes('HARDCADE')) fail(`the title still offers SURVIVAL or a separate HARDCADE (menu: "${menuOk}")`);
      if (menu) {
        // the switch is a real one (v49): role=switch, aria-checked, a knob that lights
        const flip = async () => { await evaluate(`document.querySelector('#menu .item[role=switch]').click()`);
          return evaluate(`(() => { const b = document.querySelector('#menu .item[role=switch]'); return [...document.querySelectorAll('#menu .item .label')].map((e) => e.textContent).filter((l) => /^(ARCADE|HARDCADE)$/.test(l)).concat(b.querySelector('.label').textContent + ':' + b.getAttribute('aria-checked') + ':' + b.querySelector('.switch').classList.contains('on')).join('|'); })()`); };
        const on = await flip(), off = await flip();
        if (on !== 'HARDCADE|HARD:true:true' || off !== 'ARCADE|HARD:false:false') fail(`the HARD switch did not turn ARCADE into HARDCADE and back ("${on}", then "${off}")`);
        // v156 (owner: the start menu "a bit" messy): one family. ARCADE, its HARD row (still a real switch) under it as
        // wide as it, CAMPAIGN under them (or at the top of the right column on a phone held sideways), and SETTINGS a
        // row after DAILY. The order is the owner's (v89): ARCADE, HARD, CAMPAIGN
        const lay = await evaluate(`(() => { const q = (re) => [...document.querySelectorAll('#menu .item')].find((b) => re.test(b.querySelector('.label')?.textContent)); const r = (b) => b?.getBoundingClientRect();
          const a = r(q(/^ARCADE$/)), h = r(document.querySelector('#menu .item[role=switch]')), c = r(q(/^CAMPAIGN$/)), m = r(q(/^SETTINGS$/));
          if (!a || !h || !c || !m) return null;
          return { stack: h.top >= a.bottom - 1 && Math.abs(h.width - a.width) < 2, camp: c.top >= h.bottom - 1 || c.left >= a.right - 1, last: m.top >= c.bottom - 1 && m.left >= c.left - 1 }; })()`);
        if (!lay?.stack || !lay.camp || !lay.last) fail(`the title is not ARCADE with its HARD row under it, CAMPAIGN under them or to the right, and SETTINGS last (${JSON.stringify(lay)})`);
        await evaluate(`document.querySelector('#menu .item[role=switch]').click()`);
        const hardRow = await evaluate(`[...document.querySelectorAll('#menu .item.big > .label, #menu .item.hard > .label')].map((e) => e.textContent).join('|') + (document.getElementById('menu').classList.contains('hardmode') ? ' red' : '')`);
        if (hardRow !== 'HARDCADE|HARD|HARD PAIN red') fail(`HARD on does not read HARDCADE | HARD | HARD PAIN on a red title ("${hardRow}")`);
        await evaluate(`document.querySelector('#menu .item[role=switch]').click()`);
        // v50: a tap on a menu button is the touch scheme, though the phone follows it with mouse events of its own
        const sw = await evaluate(`(() => { const r = document.querySelector('#menu .item[role=switch]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
        await evaluate(`__toko.input.source = 'keys'`);
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sw.x, y: sw.y, id: 5 }] });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        // (the tap brings the browser's own mousemove / mousedown / click after it, marked as from a touch)
        await new Promise((r) => setTimeout(r, 150));
        const src = await evaluate(`__toko.input.source`);
        if (src !== 'touch') fail(`a tap on the title, followed by the phone's own mouse event, reads as "${src}", not touch: the hints would say WASD on a phone`);
        await evaluate(`localStorage.removeItem('toko2.hard'); __toko.toMenu()`);
      }
      // every switch is in OPTIONS now (v23, owner: "we don't need all these
      // in the start screen, please make an option menu like 1.x")
      if (rows.some((l) => /^(DASH|GELS|WORLDS|SPLATTER|SOUND) /.test(l))) fail(`the title still carries switches (menu: "${menuOk}")`);
      const toOpt = rows.indexOf('SETTINGS');
      if (toOpt < 0) fail(`no SETTINGS on the title (menu: "${menuOk}")`);
      // v89: the title wears the icon's logo, inlined — a box with the image behind it and a height
      const logo = await evaluate(`(() => { const l = document.querySelector('#menu .logo'); if (!l) return null; const cs = getComputedStyle(l), r = l.getBoundingClientRect();
        return { img: /data:image\\/png/.test(cs.backgroundImage), h: r.height, w: r.width, text: l.textContent }; })()`);
      if (!logo || !logo.img || logo.h < 40 || logo.text) fail(`the title's logo is not the inlined mark (${JSON.stringify(logo)})`);
      // (v80: a run kept at a world's door puts CONTINUE between them and MENU; v85: a world reached, FROM WORLD n)
      if (!/^ARCADE\|HARD\|(START AT\|)?CAMPAIGN\|(CONTINUE\|)?DAILY\|SETTINGS/.test(rows.join('|'))) fail(`the title is not ARCADE, HARD, (START AT,) CAMPAIGN, (CONTINUE,) DAILY, SETTINGS in that order (menu: "${menuOk}")`);   // v156
      // v156: a SETTINGS row is a name and a value ("VOLUME" "25%"); read together, as a player reads the row
      const labels = `[...document.querySelectorAll('#menu .item')].map((b) => [b.querySelector('.label')?.textContent, b.querySelector('.val')?.textContent].filter(Boolean).join(' '))`;
      const clickItem = (re) => evaluate(`[...document.querySelectorAll('#menu .item')].find((b) => ${re}.test(b.querySelector('.label')?.textContent))?.click()`);
      await clickItem('/^SETTINGS$/');
      const opts = (await evaluate(labels)) || [], optsOk = opts.join('|');
      // the SPLATTER switch (v21): on unless the link says ?goo=off
      const wantGoo = /[?&]goo=off\b/.test(query) ? 'SPLATTER OFF' : 'SPLATTER ON';
      if (!opts.includes(wantGoo)) fail(`OPTIONS has no ${wantGoo} switch (options: "${optsOk}")`);
      const wantWorlds = /[?&]worlds=neon\b/.test(query) ? 'WORLDS · NEON' : 'WORLDS · STREET';
      if (!opts.includes(wantWorlds)) fail(`OPTIONS has no ${wantWorlds} switch (options: "${optsOk}")`);
      if (!opts.some((l) => /^DASH · /.test(l)) || !opts.some((l) => /^GELS · /.test(l)) || !opts.includes('BACK')) fail(`OPTIONS is missing DASH, GELS or BACK (options: "${optsOk}")`);
      // 1.x's settings (v24): LANGUAGE walks en → fi → ja → en and the page
      // speaks it; VOLUME steps by quarters and wraps 100% → 0% → … → 100%
      if (menu) {
        const walk = [];
        for (let i = 0; i < 3; i++) { await clickItem('/^(LANGUAGE|KIELI|言語)$/'); walk.push((await evaluate(labels)).find((l) => / (ENGLISH|SUOMI|日本語)$/.test(l))); }
        if (walk.join('|') !== 'KIELI SUOMI|言語 日本語|LANGUAGE ENGLISH') fail(`OPTIONS' LANGUAGE did not walk en → fi → ja → en (${walk.join(' → ')})`);
        const vols = [];
        for (let i = 0; i < 5; i++) { await clickItem('/^VOLUME$/'); vols.push((await evaluate(labels)).find((l) => /^VOLUME /.test(l))); }
        if (vols.join('|') !== 'VOLUME 0%|VOLUME 25%|VOLUME 50%|VOLUME 75%|VOLUME 100%') fail(`OPTIONS' VOLUME did not step by quarters (${vols.join(' → ')})`);
        // the music (v58): MUSIC steps the same way and is the music's alone; a tap has woken the
        // sound by now, so the menus are playing the title's song
        const mus = [];
        for (let i = 0; i < 5; i++) { await clickItem('/^MUSIC$/'); mus.push((await evaluate(labels)).find((l) => /^MUSIC /.test(l))); }
        if (mus.join('|') !== 'MUSIC 0%|MUSIC 25%|MUSIC 50%|MUSIC 75%|MUSIC 100%') fail(`OPTIONS' MUSIC did not step by quarters (${mus.join(' → ')})`);
        const stored = await evaluate(`localStorage.getItem('toko2.music')`), mv = await evaluate('__toko.music.volume');
        if (stored !== '1' || mv !== 1) fail(`MUSIC is not kept (toko2.music ${stored}, the music at ${mv})`);
        let onTitle = null;
        for (const end = Date.now() + FRAME_GRACE; Date.now() < end; await sleep(100)) { onTitle = await evaluate('__toko.music.state()'); if (onTitle?.song === 'title') break; }
        if (!onTitle?.on || onTitle.song !== 'title') fail(`the menus are not playing the title's song once the sound is awake (${JSON.stringify(onTitle)})`);
        await evaluate(`localStorage.removeItem('toko2.lang'); localStorage.removeItem('toko2.volume'); localStorage.removeItem('toko2.music')`);
      }
      for (const where of ['SETTINGS', 'the title']) {
        const clipped = await evaluate(`[...document.querySelectorAll('#menu .item .label')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent)`);
        if (clipped?.length) fail(`${where}: labels cut off: ${JSON.stringify(clipped)}`);
        // a thumb's floor: every menu item at least 44 px tall and wide
        const small = await evaluate(`[...document.querySelectorAll('#menu .item')].map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0, 12), Math.round(r.width), Math.round(r.height)]; }).filter(([, w, h]) => Math.min(w, h) < 44)`);
        if (small.length) fail(`${where}: touch targets under 44 px: ${JSON.stringify(small)}`);
        if (where === 'SETTINGS') await clickItem('/^BACK$/');
      }
      const backHome = (await evaluate(labels)) || [];
      if (!backHome.includes('ARCADE')) fail(`BACK in SETTINGS did not return to the title (menu: "${backHome.join('|')}")`);
      const backFocus = await evaluate(`document.querySelector('#menu .item.focus .label')?.textContent`);
      if (backFocus !== 'SETTINGS') fail(`BACK in SETTINGS did not leave the focus on SETTINGS ("${backFocus}")`);
      await evaluate('__toko.toMenu()');   // the title afresh, focus on ARCADE, for the walks below
      const focused = () => evaluate(`document.querySelector('#menu .item.focus .label')?.textContent`);
      const padSet = (js) => evaluate(`(() => { const p = window.__pad; ${js}; p.timestamp++; return true; })()`);
      // The Gamepad API has no events: the game reads the pad once a frame,
      // and under SwiftShader a frame can take longer than any fixed hold.
      // So a press is held until the game has drawn two frames over it, and
      // let go for two more, timed off the game's own frame counter.
      const frames = () => evaluate('__toko.frames');
      const waitFrames = async (n) => { const f = await frames(); for (const end = Date.now() + FRAME_GRACE; (await frames()) - f < n && Date.now() < end; ) await sleep(40); };
      const padPress = async (i) => { await padSet(`p.buttons[${i}].pressed = true; p.buttons[${i}].value = 1`); await waitFrames(2); await padSet(`p.buttons[${i}].pressed = false; p.buttons[${i}].value = 0`); await waitFrames(2); };
      let f0, firing = null;   // bullets in flight, and the glows drawn for them, sampled while the gun is held
      let letGo = null, flicked = null;   // the dash count after a plain let-go, then after a flick
      if (!pad) {
        if (menu && toOpt > 0) {
          // the keys walk the title as the pad does (ui.js _menuKey): down to
          // OPTIONS, Enter opens it on the DASH switch, Enter flips it in
          // place — three states since v124, PASS → PUSH → CUT → PASS — Esc goes back to the title
          // on OPTIONS, and up lands on ARCADE. A raw key-down carries no
          // character, so Enter cannot also press a button the page focused.
          const key = async (code, vk) => {
            await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code, key: code, windowsVirtualKeyCode: vk });
            await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: code, windowsVirtualKeyCode: vk });
          };
          for (let i = 0; i < toOpt; i++) await key('ArrowDown', 40);
          await key('Enter', 13);
          // v156: SETTINGS opens on VOLUME; DASH heads the ?dev block below the player's rows
          const toDash = await evaluate(`[...document.querySelectorAll('#menu button')].findIndex((b) => /^DASH · /.test(b.querySelector('.label')?.textContent))`);
          for (let i = 0; i < toDash; i++) await key('ArrowDown', 40);
          const onDash = await focused();
          await key('Enter', 13); const flipped = await focused();
          await key('Enter', 13); const cut = await focused();
          await key('Enter', 13); const back = await focused();
          await key('Escape', 27); const out = await focused();
          for (let i = 0; i < toOpt; i++) await key('ArrowUp', 38);
          const home = await focused();
          if (onDash !== 'DASH · PASS' || flipped !== 'DASH · PUSH' || cut !== 'DASH · CUT' || back !== 'DASH · PASS' || out !== 'SETTINGS' || home !== 'ARCADE') {
            fail(`the keys did not walk into OPTIONS, flip DASH PASS → PUSH → CUT → PASS in place and come back ("${onDash}" → "${flipped}" → "${cut}" → "${back}", then "${out}", "${home}")`);
          }
        }
        await evaluate(`[...document.querySelectorAll('#menu .item')].find((b) => /^ARCADE/.test(b.textContent)).click()`);
        const vw = await evaluate('innerWidth'), vh = await evaluate('innerHeight');
        const touch = (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts });
        const aimAt = { x: vw * 0.75, y: vh * 0.55 };
        await touch('touchStart', [{ x: aimAt.x, y: aimAt.y, id: 7 }]);
        await touch('touchMove', [{ x: aimAt.x + 10, y: aimAt.y - 40, id: 7 }]);
        f0 = await evaluate('__toko.frames');
        await sleep(RUN_MS / (rotate ? 2 : 1));
        if (rotate) { await setPhone('portrait'); orientation = 'portrait'; await sleep(RUN_MS / 2); }
        firing = await evaluate(`(() => { const t = __toko; return { bullets: t.world ? t.world.bullets.length : 0, drawn: t.actors?.bullets ? t.actors.bullets.count : undefined, glows: t.actors?.juice ? t.actors.juice.glows.count : undefined, pools: t.actors?.light ? t.actors.light.pools.count : undefined }; })()`);
        // v124 (owner: "more like in v. 1.x"): DASH BY LIFT, 1.x's, is the default — a plain let-go of the aim
        // stick is a dash; under FLICK (v18) it is none and a FLICK of it is (js/flick.js). The flick is thrown with
        // its own timestamps, the drawing stopped so a slow software-GPU frame cannot coalesce it
        const by = await evaluate('__toko.input.dashBy');
        if (by !== 'lift') fail(`a fresh browser's DASH BY is not 1.x's LIFT ("${by}")`);
        const lift0 = await evaluate('__toko.counts.dash || 0');
        await touch('touchEnd', []);
        // a software GPU draws a frame in a few hundred ms: wait for the dash to be counted, not a fixed time
        for (const end = Date.now() + 5000; Date.now() < end && (await evaluate('__toko.counts.dash || 0')) === lift0; ) await sleep(100);
        await sleep(300);
        letGo = await evaluate('({ dash: __toko.counts.dash || 0, kind: __toko.input.lastGesture?.kind })');
        if (letGo.dash !== lift0 + 1) fail(`under LIFT a plain let-go of the aim stick was not one dash, as 1.x's (${letGo.dash - lift0} dashes, read as ${letGo.kind})`);
        const lifted = letGo.dash;
        // FLICK: the cooldown run out, a let-go again (no dash), then the flick (one, up the screen)
        await evaluate('__toko.input.dashBy = "flick"');
        await sleep(1200);
        const nw = await evaluate('innerWidth'), nh = await evaluate('innerHeight');   // the screen as it is now (rotate has turned it)
        await touch('touchStart', [{ x: nw * 0.75, y: nh * 0.55, id: 9 }]);
        await touch('touchMove', [{ x: nw * 0.75 + 10, y: nh * 0.55 - 40, id: 9 }]);
        await sleep(600);
        await touch('touchEnd', []);
        const f1 = await evaluate('__toko.frames');   // a few frames, so a dash it set off would have been counted
        for (const end = Date.now() + 5000; Date.now() < end && (await evaluate('__toko.frames')) - f1 < 4; ) await sleep(100);
        letGo = await evaluate('({ dash: __toko.counts.dash || 0, kind: __toko.input.lastGesture?.kind })');
        letGo.dash -= lifted;   // the FLICK let-go's own dashes, after the LIFT one
        await evaluate('(() => { const h = __toko.world.hero; h.dash = 0; h.dashCd = 0; })()');   // the LIFT dash's cooldown, run out on a slow GPU too
        await evaluate('__toko.loop(false)');
        // on the screen as it is now (the rotate scenario has turned it)
        const fw = await evaluate('innerWidth'), fh = await evaluate('innerHeight');
        const base = Date.now() / 1000, fx = fw * 0.72, fy = fh * 0.62, at = (ms) => base + ms / 1000;
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fx, y: fy, id: 8 }], timestamp: at(0) });
        await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: fx + 30, y: fy, id: 8 }], timestamp: at(100) });
        for (let i = 1; i <= 4; i++) await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: fx + 30, y: fy - 22 * i, id: 8 }], timestamp: at(400 + 16.7 * i) });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: at(400 + 16.7 * 4 + 4) });
        await evaluate('__toko.loop(true)');
        const before = lifted + letGo.dash;
        for (const end = Date.now() + 5000; Date.now() < end && (await evaluate('__toko.counts.dash || 0')) === before; ) await sleep(100);
        await sleep(300);
        flicked = await evaluate('({ dash: __toko.counts.dash || 0, g: __toko.input.lastGesture })');
        flicked.dash -= lifted;
        await evaluate('__toko.input.dashBy = "lift"');
      } else {
        const stub = await evaluate('navigator.getGamepads()[0] === window.__pad');
        if (!stub) fail('the DualSense stub is not what navigator.getGamepads() returns');
        // the pad walks down to the DASH test switch and Cross flips it, the
        // focus staying on it. Three states since v124: PASS (1.x's, the
        // default again) → PUSH → CUT → back to PASS
        for (let i = 0; i < toOpt; i++) await padPress(13);
        await padPress(0);
        const toDash = await evaluate(`[...document.querySelectorAll('#menu button')].findIndex((b) => /^DASH · /.test(b.querySelector('.label')?.textContent))`);
        for (let i = 0; i < toDash; i++) await padPress(13);
        const onDash = await focused();
        await padPress(0); const flipped = await focused();
        await padPress(0); const cut = await focused();
        await padPress(0); const back = await focused();
        await padPress(1); const out = await focused();
        if (onDash !== 'DASH · PASS' || flipped !== 'DASH · PUSH' || cut !== 'DASH · CUT' || back !== 'DASH · PASS' || out !== 'SETTINGS') fail(`Cross in SETTINGS did not flip DASH PASS → PUSH → CUT → PASS in place, or Circle did not come back ("${onDash}" → "${flipped}" → "${cut}" → "${back}", then "${out}")`);
        for (let i = 0; i < toOpt; i++) await padPress(12);
        // a browser that saved PUSH before v124 meets 1.x's PASS once (the reset is keyed toko2.dash124): saved
        // again after it, PUSH stays — the run Cross starts below is PUSH, and plays it (the run's own check)
        const legacy = await evaluate(`(() => { localStorage.setItem('toko2.dash', 'push'); __toko.toMenu();
          [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'SETTINGS').click();
          const l = [...document.querySelectorAll('#menu .item .label')].find((e) => /^DASH · /.test(e.textContent))?.textContent;
          [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'BACK').click(); __toko.toMenu(); return l; })()`);
        if (legacy !== 'DASH · PUSH') fail(`a PUSH dash saved after v124 did not stay PUSH in OPTIONS ("${legacy}")`);
        // the pad walks the menu: down, down, up, up lands back on ARCADE; Cross picks it
        await padPress(13); await padPress(13); await padPress(12); await padPress(12);
        const focus = await focused();
        if (focus !== 'ARCADE') fail(`the pad's d-pad did not walk the menu back to ARCADE (focus: "${focus}")`);
        await padPress(0);
        for (const end = Date.now() + 3000; Date.now() < end && (await evaluate('__toko.state')) !== 'play'; ) await sleep(100);
        if ((await evaluate('__toko.state')) !== 'play') fail('Cross on ARCADE did not start a run');
        // the run has read the saved dash; the scenarios after this one boot as a fresh browser
        await evaluate(`localStorage.removeItem('toko2.dash'); localStorage.removeItem('toko2.dashPass')`);
        // left stick walks right, right stick aims and fires
        const x0 = await evaluate('__toko.world ? __toko.world.hero.x : 0');
        await padSet('p.axes[0] = 0.7; p.axes[1] = 0; p.axes[2] = 1; p.axes[3] = 0');
        f0 = await evaluate('__toko.frames');
        // a second of the RUN's time, not the wall's: 0.7 of a stick is 4.2 u
        const t0 = await evaluate('__toko.world.time');
        for (const end = Date.now() + RUN_MS + FRAME_GRACE; Date.now() < end && (await evaluate('__toko.world.time')) < t0 + 1; ) await sleep(100);
        firing = await evaluate(`(() => { const t = __toko; return { bullets: t.world ? t.world.bullets.length : 0, drawn: t.actors?.bullets ? t.actors.bullets.count : undefined, glows: t.actors?.juice ? t.actors.juice.glows.count : undefined, pools: t.actors?.light ? t.actors.light.pools.count : undefined }; })()`);
        await padSet('p.axes[0] = 0; p.axes[1] = 0; p.axes[2] = 0; p.axes[3] = 0');
        const x1 = await evaluate('__toko.world ? __toko.world.hero.x : 0');
        if (!(x1 > x0 + 1)) fail(`the left stick did not walk the hero (x ${x0.toFixed(2)} → ${x1.toFixed(2)})`);
        await padPress(0);                                   // Cross: a dash
        await padPress(9);                                   // Options: pause
        if ((await evaluate('__toko.state')) !== 'paused') fail('Options did not pause');
        await waitFrames(2);
        if (!(await evaluate('__toko.music.want.duck'))) fail('the pause did not duck the music');
        await padPress(9);                                   // Options again picks RESUME
        if ((await evaluate('__toko.state')) !== 'play') fail(`Options in the pause menu did not resume (state ${await evaluate('__toko.state')})`);
        await sleep(300);
      }
      const smallPause = await evaluate(`(() => { const r = document.getElementById('pausebtn')?.getBoundingClientRect(); return r ? [Math.round(r.width), Math.round(r.height)] : null; })()`);
      if (smallPause && Math.min(...smallPause) < 44) fail(`the pause button is ${smallPause.join('×')} px, under 44`);
      const menuBtn = await evaluate(`(() => { const b = document.getElementById('pausebtn'), c = document.getElementById('clock'); if (!b) return null; const r = b.getBoundingClientRect(), k = c.getBoundingClientRect();
        return { text: b.textContent, shown: !b.closest('[hidden]') && r.width > 0, right: innerWidth - r.right < 40, top: r.top < 40, clear: k.top >= r.bottom - 1 }; })()`);
      if (!menuBtn || !/MENU/.test(menuBtn.text) || !menuBtn.shown || !menuBtn.right || !menuBtn.top || !menuBtn.clear) fail(`while playing there is no MENU button top right with the clock under it (${JSON.stringify(menuBtn)})`);
      // A healthy loop on a busy machine is slow, not stopped: give it a
      // deadline rather than one look.
      let f1 = await evaluate('__toko.frames');
      for (const end = Date.now() + FRAME_GRACE; f1 - f0 < MIN_FRAMES && Date.now() < end; f1 = await evaluate('__toko.frames')) await sleep(250);
      if (f1 - f0 < MIN_FRAMES) fail(`the loop is not advancing: ${f1 - f0} frames in ${(RUN_MS + FRAME_GRACE) / 1000} s`);
      // A slow machine runs the game slower than the wall clock: wait on the
      // run itself (two seconds of it) before asking whether gels came.
      for (const end = Date.now() + FRAME_GRACE; Date.now() < end && !(await evaluate('__toko.world && __toko.world.time >= 2')); ) await sleep(250);
      // From here the run holds still (__toko.hold: the sim and its effects do
      // not step, the frame still draws), so what is read and what is
      // photographed are one moment: a hit landing between the read and the
      // screenshot used to redden the floor sample on a frame with nothing
      // wrong in it (the run's seed is random, so about one run in five). A
      // hit already taken is an event, not the look: its mercy blink and red
      // glow are ended with it
      await evaluate(`(() => { const t = __toko; if (t.state === 'play') { t.hold = true; t.world.hero.mercy = 0; } })()`);
      await waitFrames(2);

      // the SDF bodies, held still so the screenshot finds them where they were measured
      let sdfBodies = [];
      if (wantGels === 'sdf') {
        await evaluate('__toko.hold = true'); await waitFrames(2);
        sdfBodies = await evaluate(`(() => { const t = __toko, out = [];
          for (const v of t.actors.views.values()) {
            if (!v.sdf || !v.root.visible || v.dyingT > 0 || v.kind === 'cloaker') continue;
            const p = new t.THREE.Vector3(v.root.position.x, 0.6 * (v.r || 0.6), v.root.position.z).project(t.camera);
            if (Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95) out.push({ kind: v.kind, x: (p.x + 1) / 2, y: (1 - p.y) / 2 });
          }
          return out; })()`);
      }
      info = await evaluate(`(() => {
        const t = window.__toko, fault = document.getElementById('fault'), ver = document.getElementById('ver');
        // hx: the world's own size — a world closing its walls in for a challenge (v37) keeps it underneath
        const out = { music: t.music?.state(), audio: t.music?.ctx?.state, backend: t.backend, fault: fault && !fault.hidden ? fault.textContent : '', state: t.state, counts: { ...t.counts }, gels: t.world ? t.world.gels.length : 0, simTime: t.world ? t.world.time : 0, hx: t.world ? (t.world.squeeze?.home.hx ?? t.world.hx) : undefined, source: t.input ? t.input.source : undefined, dash: t.world ? t.world.dashMode : undefined, hpMult: t.world ? t.world.hpMult : undefined, gelStyle: t.actors?.gels, look: t.actors?.look };
        out.flow = t.flow;   // v125: the run's flow (js/fsm.js): its moves, and any the table does not declare
        if (ver) {
          const r = ver.getBoundingClientRect(), s = getComputedStyle(ver);
          out.label = ver.textContent.trim();
          out.labelVisible = r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 &&
            r.right <= innerWidth && r.bottom <= innerHeight && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.3;
          out.labelBox = { x0: r.left / innerWidth, y0: r.top / innerHeight, x1: r.right / innerWidth, y1: r.bottom / innerHeight };
        }
        // The game's own camera cannot vouch for itself: if the game never
        // refits, its NDC numbers do not move either. Compare it with the screen.
        const cv = t.renderer.domElement;
        out.aspect = { screen: innerWidth / innerHeight, camera: t.camera.aspect, buffer: cv.width / cv.height };
        if (t.arena && t.camera) {
          const { THREE, camera, arena } = t; let worst = 0, x0 = 1, x1 = -1, y0 = 1, y1 = -1;
          for (const x of [arena.min.x, arena.max.x]) for (const y of [arena.min.y, arena.max.y]) for (const z of [arena.min.z, arena.max.z]) {
            const p = new THREE.Vector3(x, y, z).project(camera);
            worst = Math.max(worst, Math.abs(p.x), Math.abs(p.y));
            x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
          }
          out.arenaWorst = worst;
          // the gap, in CSS px, between the arena and the screen's edge on each axis
          out.arenaGap = { x: ((1 - (x1 - x0) / 2) * innerWidth) / 2, y: ((1 - (y1 - y0) / 2) * innerHeight) / 2, spanY: (y1 - y0) / 2 };
          out.turn = t.turn;
          out.worlds = { following: t.following, zoomed: (t.tuning.camera.zoom ?? 1) < 1, viewWorld: t.viewWorld, style: t.floorStyle, world: t.world?.world, scenery: t.scenery.parts.length, sceneryKind: t.scenery.kind, lit: t.litAs,
            bigger: t.world.hx > t.arenaFor(1, t.world.shape).hx + 1e-6 || t.world.hz > t.arenaFor(1, t.world.shape).hz + 1e-6,
            posts: (t.world.posts || []).length, postViews: t.actors.posts.views.length,   // v108: what stands on the floor, and drawn
                         want: t.arenaFor(${wantWorld}, '${rotate ? 'landscape' : orientation}') };
          // the hero, in fractions of the frame, and whether it is drawn
          // (it flickers through its mercy frames after a hit)
          const w = t.world, hv = t.actors.hero.root;
          if (w) {
            const c = new THREE.Vector3(hv.position.x, 0.5, hv.position.z).project(camera);
            out.hero = { x: (c.x + 1) / 2, y: (1 - c.y) / 2, visible: hv.visible };
          }
          // and the floor near its bottom-left corner, two units in: 1.x's
          // navy, past the light pool and under the vignette
          // (v104: under the zoom the arena's corner can be off screen: then the floor under the screen's own lower left)
          let k = new THREE.Vector3(arena.min.x + 2, 0, arena.max.z - 2).project(camera);
          if (Math.abs(k.x) > 0.92 || Math.abs(k.y) > 0.92) {
            const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(-0.8, -0.8), camera);
            const at = new THREE.Vector3(); if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), at)) k = at.project(camera);
          }
          out.edge = { x: (k.x + 1) / 2, y: (1 - k.y) / 2 };
        }
        return out;
      })()`);
      if (info.fault) fail(`the fault box is showing: ${info.fault.trim()}`);
      // it is a GAME: the run started, the run moved, the gun fired, gels came, the dash answered
      if (info.state !== 'play' && info.state !== 'dying' && info.state !== 'over') fail(`ARCADE did not start a run (state: ${info.state})`);
      // the title's test switches: a fresh browser plays the PUSH dash at GEL
      // HP ×1, and so does the pad's, which has 1.x's PASS saved
      // v125 (the state audit): every move the run's flow made in this scenario is one its table declares
      if (info.flow?.violations?.length) fail(`the run's flow made undeclared moves: ${info.flow.violations.map((v) => `${v.from}→${v.to} (${v.why})`).join(', ')}`);
      if (info.dash !== (pad ? 'push' : 'pass') || info.hpMult !== 1) fail(`a first run is not 1.x's PASS dash at GEL HP ×1 (the pad's, PUSH as it saved it) (dash ${info.dash}, ×${info.hpMult})`);
      // the GELS switch: a fresh browser plays the classic gels; ?gels=sdf the fields
      if (info.gelStyle !== wantGels) fail(`the gels are drawn "${info.gelStyle}", expected "${wantGels}"`);
      if (info.look !== wantStyle) fail(`the gels are painted "${info.look}", expected "${wantStyle}"`);   // v92
      if (/[?&]lens=tilt\b/.test(query) && info.label !== undefined && !info.label.includes(' · tilt')) fail(`the HUD label "${info.label}" does not say the lens is TILT-SHIFT`);   // v94
      if (wantStyle !== 'physical' && info.label !== undefined && !info.label.includes(` · ${wantStyle}`)) fail(`the HUD label "${info.label}" does not say the style is ${wantStyle}`);
      if (wantGels === 'sdf' && !sdfBodies.length) fail('?gels=sdf but no gel on screen is an SDF body');
      if (info.label !== undefined && info.label.endsWith(' · sdf') !== (wantGels === 'sdf')) fail(`the HUD label "${info.label}" does not say the gels are ${wantGels}`);
      if (!(info.simTime > 0.5)) fail(`the run did not move (sim time ${info.simTime})`);
      // the music (v58): the run plays its world's own song (the songs carry the worlds' ids), and it is making notes
      const wantSong = WORLD_IDS[wantWorld - 1];
      if (info.state === 'play' && (info.music?.song !== wantSong || !(info.music?.made > 0))) fail(`world ${wantWorld}'s run is not playing its song "${wantSong}" (${JSON.stringify(info.music)}, audio ${info.audio})`);
      if (!(info.counts.shot > 0)) fail('holding the aim stick did not fire');
      if (!(info.counts.spawn > 0)) fail('no gel ever arrived');
      if (!(info.counts.dash > 0)) fail(pad ? 'Cross did not dash' : 'a flick of the aim stick did not dash');
      if (!pad && letGo && (letGo.dash !== 0 || letGo.kind !== 'release')) fail(`a plain let-go of the aim stick dashed or was misread (${letGo.dash} dashes, read as ${letGo.kind}); under FLICK only a flick dashes`);
      if (!pad && flicked && (flicked.dash !== letGo.dash + 1 || flicked.g?.kind !== 'flick' || !(flicked.g.dirY < -0.99))) fail(`a flick up the screen was not one dash up the screen (${flicked.dash - (letGo?.dash ?? 0)} dashes, ${JSON.stringify(flicked.g)})`);
      // the camera (v18): the arena as big as a whole-arena view allows (a
      // few px from the screen's edge on its tight axis), and a phone turned
      // mid-run turns the world with it rather than shrinking it to a strip
      const W = info.worlds ?? {};
      if (!W.following && info.arenaGap && Math.min(info.arenaGap.x, info.arenaGap.y) > 14) fail(`the arena sits ${Math.min(info.arenaGap.x, info.arenaGap.y).toFixed(1)} px from the screen's edge on its tight axis; the margins are trimmed to ~10 px`);
      if (rotate && !(info.turn === 1 || info.turn === 3)) fail(`the phone was turned mid-run but the view was not (turn ${info.turn})`);
      // (unturned, a landscape arena on an upright phone is a strip ~22% of
      // its height; turned, it stands as tall as the phone's own arena, ~45%)
      if (rotate && !(info.arenaGap?.spanY > 0.38)) fail(`the turned arena fills only ${((info.arenaGap?.spanY ?? 0) * 100).toFixed(0)}% of the upright screen's height`);
      if (!rotate && info.turn !== 0) fail(`the view is turned (${info.turn}) on a screen that matches its arena`);
      // every bullet in flight is drawn — by its own shading since v104 (owner: "No cheap effects like glow"):
      // the juice's glows are off (render/juice.js `on`), so none may be drawn
      if (!firing || firing.drawn === undefined) fail('no bullets drawn (window.__toko.actors.bullets)');
      else if (!(firing.bullets > 0)) fail('no bullet was in flight while the gun was held');
      else if (firing.drawn < firing.bullets) fail(`${firing.bullets} bullets in flight but only ${firing.drawn} drawn`);
      else if (firing.glows > 0) fail(`${firing.glows} glows drawn with the juice's glows off`);
      // …and throws its light on the floor (render/light.js, the arena's light map)
      if (firing && firing.bullets > 0 && !(firing.pools >= firing.bullets)) fail(`${firing.bullets} bullets in flight but ${firing.pools ?? 'no'} pools of light on the floor`);
      // 1.x's arena for the screen's shape, picked at the run's start and never mid-run
      // (v19: or a later world's own, bigger floor — sim/worlds.js — the camera following you over it)
      const wantHx = wantWorld > 1 ? W.want?.hx : (rotate ? 'landscape' : orientation) === 'landscape' ? 19 : 11;
      if (wantWorld > 1) {
        const style = STYLES[wantWorld - 1];
        if (W.world !== wantWorld || W.viewWorld !== wantWorld) fail(`?world=${wantWorld} started the run in world ${W.world} (drawn as ${W.viewWorld})`);
        if (W.style !== style) fail(`world ${wantWorld}'s floor is drawn "${W.style}", expected "${style}"`);
        if (W.bigger && !W.following) fail(`world ${wantWorld}'s floor is bigger than the screen but the camera does not follow`);
        // STREET stands its curb and lawn or its walls round the floor; NEON, and every world past the
        // third, its surround (v43: a ground, an edge, props along the sides)
        const want = !neon && wantWorld === 2 ? 'driveway' : !neon && wantWorld === 3 ? 'sewer' : wantWorld <= 3 ? 'surround:grid' : `surround:${WORLD_IDS[wantWorld - 1]}`;
        // v75: the world is lit in its own light (TUNING.worlds.light); NEON's abstract floors and the grid keep 1.x's
        const wantLit = neon && wantWorld <= 3 ? 'grid' : WORLD_IDS[wantWorld - 1];
        if (W.lit !== wantLit) fail(`world ${wantWorld} is lit as "${W.lit}", not "${wantLit}"`);
        if (W.sceneryKind !== want || !(W.scenery > 0)) fail(`world ${wantWorld}${neon ? ' (NEON)' : ''} stands "${W.sceneryKind}" round its floor (${W.scenery} parts), expected "${want}"`);
        // v108: a later world's floor has what stands on it (sim/posts.js), and every one of them is drawn
        if (!(W.posts > 0) || W.postViews !== W.posts) fail(`world ${wantWorld}'s floor has ${W.posts} posts and ${W.postViews} drawn`);
        // v144: the cistern stands in SIMULATED water (render/water.js); v146: and the river, whose water also FLOWS. A splash is a
        // dent the wave equation turns into rings: after it the surface round it is up and down, every texel a number
        const wantWater = ['cistern', 'river', 'ice', 'deep'].includes(STYLES[wantWorld - 1]);   // (v146: the river's too, and the deep's stirred water; v149: the ice's trail)
        const wt = await evaluate(`(async () => { const t = __toko, wk = t.actors.water; if (!wk.on) return { on: false };
          const before = await t.waterAt(3, 3); wk.splash(3, 3, 1.2, 0.12); t.idle(0.25); const after = await t.waterAt(3, 3);
          return { on: true, before, after, sources: wk.sources.length }; })()`);
        if (!wt || wt.on !== wantWater) fail(`world ${wantWorld}'s floor ${wantWater ? 'has no simulated water' : 'stands in simulated water'} (${JSON.stringify(wt)})`);
        // (v149: the ice's is a trail — a mark, not a ring; a stamp laid after the frame's last step is not yet clamped, so its ceiling is looser)
        else if (wantWater && !(wt.after.steps > wt.before.steps && wt.after.top > 0.01 && wt.after.top < (STYLES[wantWorld - 1] === 'ice' ? 4 : 1) && wt.after.bad === 0 && wt.before.bad === 0))
          fail(`world ${wantWorld}'s water did not take a splash (before ${JSON.stringify(wt.before)}, after ${JSON.stringify(wt.after)})`);
        else if (STYLES[wantWorld - 1] === 'cistern' && !(wt.sources >= 1)) fail(`the cistern's fall pours nothing into its water (${wt.sources} sources)`);
        // v151: the floors' pulses hear of REDUCE MOTION (kit.js CALM): off in a browser that has not asked for it
        { const cm = await evaluate('__toko.calm()'); if (cm !== 0) fail(`the floors' pulses are held back (${cm}) with REDUCE MOTION off`); }
        // v148: the river's lily pads are tethered (they lean with the current, a few decimetres and no further); the cistern has flotsam afloat
        if (STYLES[wantWorld - 1] === 'river') { const pl = await evaluate('__toko.padLean()'); if (!(pl >= 0 && pl <= TUNING.scenery.river.pads.lean + 1e-6)) fail(`the river's lily pads lean ${pl} m; they are tethered to ${TUNING.scenery.river.pads.lean}`); }
        if (STYLES[wantWorld - 1] === 'cistern') { const fl = await evaluate('(() => { const l = __toko.scenery.leaves; return l ? { kind: l.kindName, n: l.n, awake: Array.from(l.awake).filter(Boolean).length } : null; })()'); if (!(fl && fl.kind === 'flotsam' && fl.n > 0 && fl.awake === fl.n)) fail(`the cistern has no flotsam afloat (${JSON.stringify(fl)})`); }
      } else if (W.following !== W.zoomed || W.style !== 'grid' || W.sceneryKind !== 'surround:grid' || !(W.scenery > 0)) fail(`world 1 is not 1.x's grid ${W.zoomed ? 'followed under the zoom (v104)' : 'seen whole'} with its surround (style ${W.style}, following ${W.following}, "${W.sceneryKind}", ${W.scenery} parts)`);
      if (info.hx !== undefined && info.hx !== wantHx) fail(rotate && info.hx === 11 ? 'the arena changed shape mid-run (1.x picks it per run)' : `the arena is ${info.hx * 2} wide in ${orientation}; 1.x's is ${wantHx * 2}`);
      if (pad && info.source !== 'pad') fail(`the input source is ${info.source}, expected pad`);
      // Where the browser offers WebGPU, the default path must take it.
      const want = expectBackend || (gpuAdapter ? 'webgpu' : undefined);
      if (want && info.backend !== want) fail(`backend is ${info.backend}, expected ${want}`);
      if (info.label === undefined) fail('no HUD label (#ver)');
      else {
        if (info.label !== LABEL && !info.label.startsWith(LABEL + ' ')) fail(`HUD label reads "${info.label}", VERSIONS.md says "${LABEL}"`);
        if (!info.labelVisible) fail('the HUD label is not visible on screen');
      }
      if (info.arenaWorst === undefined) fail('no arena exposed (window.__toko.arena)');
      else if (!W.following && info.arenaWorst > 1.0001) fail(`the arena is not wholly on screen in ${orientation} (worst corner at NDC ${info.arenaWorst.toFixed(3)})`);
      const a = info.aspect;
      if (Math.abs(a.camera / a.screen - 1) > 0.01 || Math.abs(a.buffer / a.screen - 1) > 0.02) {
        fail(`the view did not follow the screen in ${orientation}: screen ${a.screen.toFixed(3)}, camera ${a.camera.toFixed(3)}, drawing buffer ${a.buffer.toFixed(3)}`);
      }

      // a hit in the run flashes the hurt vignette red for 0.32 s; caught
      // mid-flash, it tinted the floor sample and failed the look on a frame
      // with nothing wrong in it. The flash is an event, not the look: end it
      await evaluate(`document.getElementById('vignette')?.getAnimations().forEach((a) => a.finish())`);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const png = Buffer.from(shot.data, 'base64');
      writeFileSync(join(OUT, `${name}.png`), png);
      const img = decodePng(png);
      const spread = lumSpread(img);
      if (spread < 0.02) fail(`the frame is nearly uniform (luminance spread ${spread.toFixed(3)}) — nothing drew`);
      // The gate is the label ON SCREEN, so look for its ink in the frame:
      // CSS can call it visible while the canvas sits on top of it.
      if (info.labelBox) {
        const ink = regionMax(img, info.labelBox.x0, info.labelBox.y0, info.labelBox.x1, info.labelBox.y1);
        if (ink < 0.45) fail(`the HUD label is not in the frame (brightest pixel in its box ${ink.toFixed(2)})`);
      }
      if (info.edge && wantWorld === 1) {
        // 1.x's look, measured: a dark navy floor, and a bright white gel hero
        // standing on it. Both are WORLD points projected by the game's own
        // camera, so the check follows the framing on any screen.
        // (v109: read patches round that point — a body walking onto the one patch read as the floor's colour, a
        // yellow cube on it as not navy; v113: nine patches spread over the lower left of the floor, and the MEDIAN of
        // them by brightness: a body on a few reads brighter and a patch past the floor's edge darker, and neither is
        // the floor's colour)
        const e = info.edge, P = [];
        for (const dx of [0, 0.12, 0.24]) for (const dy of [0, -0.1, -0.2]) P.push([dx, dy]);
        const corner = P.map(([dx, dy]) => regionMean(img, e.x + dx - 0.02, e.y + dy - 0.02, e.x + dx + 0.02, e.y + dy + 0.02)).sort((a, b) => a.lum - b.lum)[4];
        info.cornerLum = corner.lum;
        if (!(corner.b > corner.r * 1.2 && corner.lum < 0.25 && corner.lum > 0.01)) fail(`the floor is not 1.x's navy (r ${corner.r.toFixed(3)}, b ${corner.b.toFixed(3)}, lum ${corner.lum.toFixed(3)})`);
        if (info.hero?.visible) {
          // the brightest pixel near where the hero stands: its size on screen
          // depends on the framing, so a mean would measure the floor too
          const p = info.hero, h = 0.015, heroLum = regionMax(img, p.x - h, p.y - h, p.x + h, p.y + h);
          info.heroLum = heroLum;
          if (!(heroLum > 0.5 && heroLum > corner.lum * 4)) fail(`no bright gel hero where the hero stands (${heroLum.toFixed(3)} vs the floor ${corner.lum.toFixed(3)})`);
        }
        // every SDF body is DRAWN: a mask that discards every fragment throws
        // no error and draws nothing (its shadow and splats still show, and the
        // grid lines are as bright as a gel), so the frame is taken again with
        // the SDF bodies hidden and each one's box must have CHANGED
        if (wantGels === 'sdf' && sdfBodies.length) {
          const frames = async (n) => { const f = await evaluate('__toko.frames'); for (const end = Date.now() + FRAME_GRACE; (await evaluate('__toko.frames')) - f < n && Date.now() < end; ) await sleep(40); };
          const vis = (on) => evaluate(`(() => { for (const v of __toko.actors.views.values()) v.root.traverse((o) => { if (o.material?.userData?.sdf) o.visible = ${on}; }); })()`);
          await vis(false); await frames(2);
          const off = decodePng(Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
          await vis(true);
          const h = 0.008, diff = (b) => { const a = regionMean(img, b.x - h, b.y - h, b.x + h, b.y + h), c = regionMean(off, b.x - h, b.y - h, b.x + h, b.y + h); return Math.abs(a.r - c.r) + Math.abs(a.g - c.g) + Math.abs(a.b - c.b); };
          const dark = sdfBodies.filter((b) => !(diff(b) > 0.06));
          if (dark.length) fail(`${dark.length} of ${sdfBodies.length} SDF gels are not drawn where they stand (${dark.map((b) => b.kind).join(', ')})`);
          info.sdfDrawn = sdfBodies.length - dark.length;
        }
      }

      // 1.x's pickups (render/pickups.js), after the look checks so they do
      // not change the frame those measure: the run held still, one of
      // everything staged round the hero (sim/pickups.js stage) and the
      // effects' timers running, then a few frames drawn — every drop with its
      // glyph badge, every gate's beam (and DASH THROUGH! while the hero
      // stands), the convoy's moths, the bounty's ring, their light on the
      // floor and the HUD's timers — with no page error on either backend
      // (held, not paused: the PAUSED panel would cover what is photographed,
      // and the gate tags are drawn only while the game is playing)
      // (the DASH THROUGH! hint hides for good once this browser has dashed a
      // gate, and the scenarios share one profile: an earlier flick through a
      // gate — world 2 has them from its first wave — must not hide this one's;
      // and a gate the run spawned itself is cleared first: caught cooling down,
      // its beam is off, which read as a staged gate not drawing, now and then)
      const staged = await evaluate(`(() => { const t = __toko; if (!t.world) return null; t.hold = true; localStorage.removeItem('toko2.gateUsed'); t.world.pk.gateUsed = false; t.world.pk.gates.length = 0; const s = t.stagePickups();
        const h = t.world.hero; h.invinc = 3; h.rapid = 8; t.world.pk.multT = 10; h.dashLevel = 1;
        // 1.x's floating numbers and the mark's ping, from the events that make them (v118: on a floor cleared of the
        // run's own: a pickup the run took a moment before still floated its number, and the count read 3)
        for (const f of t.actors.pickups.floaters) { f.life = 0; f.s.visible = false; }
        t.actors.onEvent({ type: 'pickup', kind: 'score', value: 450, x: h.x + 1.5, z: h.z - 1.5, color: 0x88ff88 }, t.world);
        t.actors.onEvent({ type: 'pickup', kind: 'scoremult', value: 0, x: h.x - 1.5, z: h.z - 1.5, color: 0xffdd22 }, t.world);
        if (s.bounty != null) t.actors.onEvent({ type: 'bounty', id: s.bounty, x: 0, z: 0, t: 8 }, t.world);
        return { ...s, alive: h.alive }; })()`);
      if (!staged) fail('no run to stage the pickups in');
      else {
        await waitFrames(3);
        const drawn = await evaluate('__toko.actors.pickups.stats()');
        const chips = await evaluate(`[...document.querySelectorAll('#fx span')].map((e) => e.textContent).join(' | ')`);
        const want = [['items', staged.items], ['badges', staged.items], ['gates', staged.gates], ['beams', staged.gates], ['hints', staged.alive && staged.gates ? 1 : 0]];   // v48: the teaching tag on the nearest live gate only
        const short = want.filter(([k, n]) => drawn[k] !== n).map(([k, n]) => `${k} ${drawn[k]}/${n}`);
        if (short.length) fail(`the staged pickups did not all draw: ${short.join(', ')}`);
        if (!(drawn.moths > 0)) fail('the staged convoy drew no moth');
        if (staged.bounty != null && !drawn.bounty) fail('the staged bounty drew no ring');
        if (staged.bounty != null && !drawn.ping) fail('the marked bounty drew no "!" ping');
        if (drawn.floaters !== 2) fail(`a nugget and a ×2 drew ${drawn.floaters} floating numbers, not 2`);
        if (!(drawn.pools > staged.items)) fail(`the pickups threw ${drawn.pools} pools of light on the floor`);
        if ((chips.match(/\|/g) || []).length < 3) fail(`the HUD does not show the effects' timers ("${chips}")`);
        info.pickups = drawn;
        const pshot = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(OUT, `${name}-pickups.png`), Buffer.from(pshot.data, 'base64'));
        // over the pause panel the gate and bounty tags are not drawn (1.x drew
        // them only while 'playing', main.js:5893, 6018)
        await evaluate('__toko.pause()');
        await waitFrames(2);
        const paused = await evaluate('__toko.actors.pickups.stats()');
        if (await evaluate('__toko.state') === 'paused' && (paused.hints || paused.bounty)) fail(`the gate or bounty tags draw over the pause panel (${paused.hints} hints, bounty ${paused.bounty})`);
        await evaluate('__toko.resume()');
        // v107: the gate family — one of each kind stood by hand, and each drawn from the shared parts: eight gates
        // (a slalom is three), seven beams (a hoop has none), one hub, one ring, one spark
        await evaluate(`(() => { const t = __toko, w = t.world, k = w.pk, F = t.tuning.pickups.gate.family; k.gates.length = 0;
          const g = (type, x, z, angle, extra = {}) => k.gates.push({ id: k.nextId++, x, z, px: x, pz: z, angle, ax: -Math.sin(angle), az: Math.cos(angle), risk: false, green: true, alive: true, cd: 0, retireT: null, drift: false, dx: 0, dz: 0, type, ...extra });
          const hx = w.hx * 0.5, hz = w.hz * 0.4;
          g('gate', -hx, -hz, 0.5); g('turnstile', 0, -hz, 0.9, { half: F.turnstile.half, spin: 0.9 });
          for (const s of [-1, 0, 1]) g('slalom', hx + s * F.slalom.gap, -hz, 0, { half: F.slalom.half, group: 5 });
          g('fuse', -hx, hz, 1.2, { half: F.fuse.half }); g('hoop', hx, hz, 0, { ring: F.hoop.r }); g('fence', 0, 0, Math.PI / 2, { half: w.hx * 0.3 }); })()`);
        await waitFrames(3);
        const fam = await evaluate('__toko.actors.pickups.stats()');
        if (fam.gates !== 8 || fam.beams !== 7 || fam.parts?.hub !== 1 || fam.parts?.hoop !== 1 || fam.parts?.spark !== 1) fail(`the gate family did not all draw: ${JSON.stringify({ gates: fam.gates, beams: fam.beams, parts: fam.parts })}`);
        await evaluate('(() => { __toko.world.pk.gates.length = 0; })()');
        // v115: the first-time tags (render/hints.js) — a giant gathering with the hero in its ring carries STEP OUT!, a
        // ram's warning lane with the hero in it CLEAR THE LANE!, and neither is drawn while the game is not playing.
        // Staged on worlds of their own in one evaluation (the loop's next frame puts the run's own back), from a
        // clean count, and the browser's count put back after
        const tags = await evaluate(`(() => { const t = __toko, v = t.actors.hints, kept = { slam: v.k.slam, ram: v.k.ram }, hero = { x: 0, z: 0, alive: true };
          const slam = { world: 1, hero, posts: [], gels: [{ id: -7, alive: true, r: 2, slam: { phase: 'warn', t: 0.5, x: 1, z: 0 } }] };
          const ram = { world: 3, hero, gels: [], posts: [{ r: 1.1, x: 0, z: 0, ram: { zWalls: true, side: 1, along: 0, half: 11, stage: 'warn' } }] };
          ram.hero = { x: 0, z: 9, alive: true };
          const out = {};
          v.load({}); v.playing = true; v.sync(slam, 1, 0); out.slam = v.debug(); out.slamSay = v.tags[0].material.map?.image?.width > 0;
          v.load({}); v.sync(ram, 1, 0); out.ram = v.debug();
          v.load({}); v.playing = false; v.sync(slam, 1, 0); out.paused = v.debug();
          v.load(kept); v.playing = t.state === 'play'; return out; })()`);
        if (tags.slam !== 1 || !tags.slamSay) fail(`a giant gathering with the hero in its ring drew ${tags.slam} STEP OUT! tags${tags.slamSay ? '' : ' (no text on it)'}`);
        if (tags.ram !== 1) fail(`a ram's warning lane with the hero in it drew ${tags.ram} CLEAR THE LANE! tags`);
        if (tags.paused !== 0) fail(`the first-time tags draw while the game is not playing (${tags.paused})`);
      }

      // 2.0's goo (render/goo.js): one gel killed in the middle of the arena
      // throws drops, and the floor's film holds goo where it died, read back
      // off the film itself. The `goo=off` scenario is the control: the same
      // kill there must leave no drop and no film, and 1.x's puddles instead,
      // or this reading could pass on a build that never drew any goo.
      // v156 (owner: "Pause menu needs a restart if you want to abandon run but no enemy card"): PAUSED, RESUME,
      // RESTART, SETTINGS, QUIT, and no GOT YOU card (the result screen keeps that); SETTINGS opens and BACK comes back.
      // A player (no ?dev) sees the player's rows and none of the developer's. RESTART: the run again, the old one quit
      const card = await evaluate(`(async () => { const t = __toko; if (t.state !== 'play') return null; t.world.killedBy = 'globbo'; t.pause();
        const item = (l) => [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === l);
        const r = { items: [...document.querySelectorAll('#menu .item .label')].map((e) => e.textContent).join('|'), card: !!document.querySelector('#menu .gelcard') };
        item('SETTINGS')?.click(); r.opts = !!item('VOLUME') && (!!item('SPLATTER ON') || !!item('SPLATTER OFF')); item('BACK')?.click();
        r.back = document.querySelector('#menu h2')?.textContent === 'PAUSED';
        const dev = t.ui.h.dev; t.ui.h.dev = () => false; item('SETTINGS')?.click();
        r.player = [...document.querySelectorAll('#menu .item .label')].map((e) => e.textContent).join('|');
        item('BACK')?.click(); t.ui.h.dev = dev;
        const was = t.world, rec0 = JSON.parse(localStorage.getItem('toko2.record') || '[]').length;
        item('RESTART')?.click(); for (let i = 0; i < 40 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100));
        r.restart = { state: t.state, fresh: t.world !== was && t.world.time < 2, quit: JSON.parse(localStorage.getItem('toko2.record') || '[]').length === rec0 + 1 };
        t.world.killedBy = null; return r; })()`);
      if (card && card.items !== 'RESUME|RESTART|SETTINGS|QUIT') fail(`the pause menu is not RESUME, RESTART, SETTINGS, QUIT ("${card.items}")`);
      if (card && card.card) fail('the pause menu still shows a GOT YOU card');
      if (card && (!card.opts || !card.back)) fail(`the pause menu's SETTINGS did not open and come back (${JSON.stringify(card)})`);
      if (card && card.player !== 'VOLUME|MUSIC|INTRO VOICE|MOVE WITH|STICK SIZE|REDUCE MOTION|LANGUAGE|BACK') fail(`a player's SETTINGS is not the eight player rows ("${card.player}")`);
      if (card && !(card.restart.state === 'play' && card.restart.fresh && card.restart.quit)) fail(`RESTART did not start the run again with the old one recorded as quit (${JSON.stringify(card.restart)})`);
      const cords = await evaluate(`(async () => { const t = __toko; t.showcase(['yela', 'yela'], { heroZ: 0.6, spacing: 6, links: [[0, 1]] });
        for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r));
        return { cords: t.actors.cords.count, links: (t.world.links || []).length }; })()`);
      if (!cords || !(cords.cords > 0) || cords.links !== 1) fail(`a linked pair's strand is not drawn (${JSON.stringify(cords)})`);
      const gooOff = /[?&]goo=off\b/.test(query);
      // v101: two calls, each with its own 60 s. Every read of the film waits behind the frames in flight, and with
      // other work on the machine's CPUs (three orphaned browsers, once) an iPad-sized frame under SwiftShader took
      // 2–7 s: one gooAt ~30 s, the check's two ~65–75 s in one call. A check should not hang on how busy the machine is
      const goo0 = await evaluate(`(async () => { const t = __toko; t.showcase(['globbo'], { heroZ: 0.5 });
        const w = t.world, g = w.gels[0], k0 = t.counts.kill || 0; g.hp = 1;
        // (v147: where a world's rule moves what stands still — the river's current — the hero and the gel can be carried
        // behind one of its islands, and no shot reaches: the check failed one run in two there. After a second with no
        // kill the hero is put down beside the gel, in the open, and shoots on)
        for (let i = 0; i < 300 && (t.counts.kill || 0) === k0; i++) {
          if (i >= 60 && i % 30 === 0) { const h = w.hero; h.x = h.px = g.x; h.z = h.pz = g.z + 3.5; }
          t.idle(1 / 60, { x: g.x, z: g.z });
        }
        if ((t.counts.kill || 0) === k0) return null;
        t.idle(0.1); const thrown = await t.gooAt(g.x, g.z); const strands = t.actors.strandCount, chunks = t.actors.chunks.length;
        return (window.__gooCheck = { x: g.x, z: g.z, thrown, strands, chunks }); })()`);
      // the film is stepped by the FRAMES (goo.js render, at most maxDt a frame), not by idle(): let it spread before it is read.
      // (World 3 on WebGL 2 reading a dozen texels here, v93–v98, was not slowness: WebGL read the probe's rows from the other
      // edge, the mirror of where the gel died — goo.js probe, fixed in v98 — so it read goo only when the gel died near the middle)
      const goo = goo0 && await evaluate(`(async () => { const t = __toko, c = window.__gooCheck;
        t.idle(0.6); const until = performance.now() + 9000; for (let i = 0; i < 24 && performance.now() < until; i++) await new Promise((r) => requestAnimationFrame(r)); const laid = await t.gooAt(c.x, c.z);   // at most 9 s of frames: an iPad-sized frame under SwiftShader takes seconds
        // v83: 1.9 s on, every chunk of the kill has melted away (or faded, with the goo off). Counted by AGE (v108): a
        // shot dying on a post in the meantime throws two fresh droplets of its own, and those are not the kill's
        t.idle(1.2); const D = t.tuning.death, late = t.actors.chunks.filter((c) => c.age >= Math.max(D.burstLife ?? 0, D.chunkLife) + 0.05).length;
        return { ...c, laid, late }; })()`);
      if (!goo) fail('the goo check could not kill its gel');
      // v83: the chunks trail strands out of the burst, and are gone by the end of their life
      else if (!(goo.chunks >= 3 && goo.strands >= 1)) fail(`a kill threw ${goo.chunks} chunks trailing ${goo.strands} strands`);
      else if (goo.late !== 0) fail(`${goo.late} chunks outlive their life, still lying there 1.9 s after the kill`);
      else if (gooOff) {
        if (goo.thrown.on || goo.thrown.drops || goo.laid.covered) fail(`?goo=off still threw goo: ${goo.thrown.drops} drops, ${goo.laid.covered} film texels`);
        if (!(goo.thrown.splats > 0)) fail('?goo=off: the kill left none of 1.x\'s puddles');
        info.goo = `off (${goo.thrown.splats} puddles)`;
      } else {
        if (!(goo.thrown.drops >= 10)) fail(`a kill threw ${goo.thrown.drops} drops of goo`);
        // since v81 a gel that dies at the rail throws most of its goo UP the wall (world 3 once read 7 floor texels against 684 on the wall), so the wall's film counts with the floor's
        const wallGoo = goo.laid.wall ? (goo.laid.wall.covered || 0) : 0;
        if (!(goo.laid.covered + wallGoo >= 20 && goo.laid.wet + goo.laid.dry + (goo.laid.wall ? goo.laid.wall.wet + goo.laid.wall.dry : 0) > 1)) fail(`neither the floor's film nor the wall's holds goo where the gel died (${goo.laid.covered} floor texels, ${wallGoo} wall texels, ${(goo.laid.wet + goo.laid.dry).toFixed(2)} mm on the floor)`);
        if (goo.thrown.splats) fail(`the goo is on but 1.x's puddles drew too (${goo.thrown.splats})`);
        info.goo = `${goo.thrown.drops}/${goo.laid.covered}`;
        // v81: a kill against the far wall throws goo UP THE WALL, and the wall's
        // own film holds it (read back whole: it is one small strip)
        const wall = await evaluate(`(async () => { const t = __toko; t.showcase(['globbo'], { heroZ: 0.5 });
          // the gel against the far wall and the hero four metres off it, so the shot lands before the gel has walked away from the wall
          const w = t.world, g = w.gels[0], h = w.hero; g.z = -w.hz + g.r + 0.25; g.pz = g.z; g.hp = 1; h.z = h.pz = g.z + 4; const k0 = t.counts.kill || 0;
          for (let i = 0; i < 240 && (t.counts.kill || 0) === k0; i++) t.idle(1 / 60, { x: g.x, z: g.z });
          if ((t.counts.kill || 0) === k0) return null;
          t.idle(0.8); const r = await t.gooAt(g.x, g.z); return r.wall; })()`);
        if (!wall) fail('the wall check could not kill its gel against the rail');
        else if (!(wall.covered >= 8 && wall.wet + wall.dry > 0.5)) fail(`a kill against the rail left no goo on the wall (${JSON.stringify(wall)})`);
        else info.goo += `/wall ${wall.covered}`;
      }
      // v86: CONTROLS and AUTO QUALITY in OPTIONS — the rows are there; MOVE WITH (was LEFT-HANDED) makes a
      // touch on the left half the aim stick; a slow window steps the picture down and the
      // pixel ratio follows; off, the full picture whatever the frames
      const ctl = await evaluate(`(async () => { const t = __toko, item = (re) => [...document.querySelectorAll('#menu .item')].find((b) => re.test(b.querySelector('.label')?.textContent ?? ''));
        t.pause(); item(/^SETTINGS$/)?.click(); await new Promise((r) => setTimeout(r, 150));
        const rows = [...document.querySelectorAll('#menu .item .label')].map((e) => e.textContent);
        const r = { rows: rows.filter((l) => /^MOVE WITH$|^STICK SIZE$|DEAD ZONE|AUTO QUALITY/.test(l)) };
        item(/^MOVE WITH$/)?.click(); await new Promise((r) => setTimeout(r, 100)); r.swap = t.input.swap; r.label = item(/^MOVE WITH$/)?.querySelector('.val')?.textContent;
        item(/^BACK$/)?.click(); await new Promise((r) => setTimeout(r, 100)); t.resume(); await new Promise((r) => setTimeout(r, 100));
        // a thumb down on the LEFT half: with LEFT-HANDED on it is the aim stick
        const el = document.elementFromPoint(40, innerHeight / 2) ?? document.body;
        const touch = new Touch({ identifier: 77, target: el, clientX: 40, clientY: innerHeight / 2 });
        el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], changedTouches: [touch], bubbles: true, cancelable: true }));
        r.aimActive = t.input.right.active; r.moveActive = t.input.left.active;
        el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touch], bubbles: true, cancelable: true }));
        localStorage.setItem('toko2.hand', 'right'); t.pause(); item(/^SETTINGS$/)?.click(); await new Promise((r) => setTimeout(r, 100)); item(/^MOVE WITH$/)?.click(); await new Promise((r) => setTimeout(r, 100));
        if (t.input.swap) { item(/^MOVE WITH$/)?.click(); await new Promise((r) => setTimeout(r, 100)); }
        r.swapBack = t.input.swap;
        // the quality: three slow windows step it to the floor, the ratio follows; calm ones bring it back
        // (the renderer may already stand a step down: a software GPU's frames are late, which is the feature)
        const q = t.quality, full = t.renderer.getPixelRatio() / q.share;
        for (let i = 0; i < 3; i++) q.judge({ late: 60, sim: 0.7, n: 100 }); t.applyQuality();
        r.stepDown = q.step; r.ratioDown = +(t.renderer.getPixelRatio() / full).toFixed(2); r.steps = t.tuning.quality.steps;
        for (let i = 0; i < 40; i++) q.judge({ late: 0, sim: 1, n: 100 }); t.applyQuality(); r.stepUp = q.step; r.ratioUp = +(t.renderer.getPixelRatio() / full).toFixed(2);
        localStorage.removeItem('toko2.qstep'); item(/^BACK$/)?.click(); await new Promise((r) => setTimeout(r, 100)); t.resume(); return r; })()`);
      if (!(ctl.rows.length === 4)) fail(`SETTINGS lacks the controls and quality rows (${JSON.stringify(ctl.rows)})`);
      if (!(ctl.swap === true && /RIGHT THUMB/.test(ctl.label ?? '') && ctl.aimActive === true && ctl.moveActive === false && ctl.swapBack === false)) fail(`MOVE WITH did not swap the thumbs (${JSON.stringify(ctl)})`);
      // (v104: to the last step, whatever the steps are — the floor moved to 0.8)
      if (!(ctl.stepDown === ctl.steps.length - 1 && Math.abs(ctl.ratioDown - ctl.steps.at(-1)) < 0.03 && ctl.stepUp === 0 && Math.abs(ctl.ratioUp - 1) < 0.03)) fail(`the quality did not step down with slow frames and back up with calm ones (${JSON.stringify(ctl)})`);
      // v87: RECORDS in OPTIONS — a run just finished is on the page with its score, and BACK goes to SETTINGS (v156: the title's only)
      const recs = await evaluate(`(async () => { const t = __toko, item = (re) => [...document.querySelectorAll('#menu .item')].find((b) => re.test(b.querySelector('.label')?.textContent ?? ''));
        const w = t.world; w.score = 4321; w.over = true; t.finish(); await new Promise((r) => setTimeout(r, 200));
        // v156: RECORDS is on the title's SETTINGS only (it is about the whole game, not the run just ended)
        t.toMenu(); await new Promise((r) => setTimeout(r, 150)); item(/^SETTINGS$/)?.click(); await new Promise((r) => setTimeout(r, 150)); const hadRecords = !!item(/^RECORDS$/);
        item(/^RECORDS$/)?.click(); await new Promise((r) => setTimeout(r, 150));
        const h2 = document.querySelector('#menu h2')?.textContent, dds = [...document.querySelectorAll('#menu dd')].map((e) => e.textContent);
        item(/^BACK$/)?.click(); await new Promise((r) => setTimeout(r, 150)); const back = document.querySelector('#menu h2')?.textContent;
        item(/^BACK$/)?.click(); await new Promise((r) => setTimeout(r, 150)); t.showcase(['globbo'], { heroZ: 0.5 });   // a quiet run again for the checks after this
        return { hadRecords, h2, dds, back }; })()`);
      if (!(recs.hadRecords && recs.h2 === 'RECORDS' && recs.dds.some((d) => /4,321/.test(d)) && recs.back === 'SETTINGS')) fail(`the RECORDS page does not list the run just finished and go back to SETTINGS (${JSON.stringify(recs)})`);
      // v118: DAILY — the title offers it; it starts the day's run from world 1 (the day's seed, its waves on their
      // own dice); a finished one counts a try and its best for the day, its results offer SHARE, and AGAIN is the day again
      const dly = await evaluate(`(async () => { const t = __toko, item = (re) => [...document.querySelectorAll('#menu .item')].find((b) => re.test(b.querySelector('.label')?.textContent ?? ''));
        const day = t.dayOf(), key = 'toko2.daily.arcade.' + day; localStorage.removeItem(key); localStorage.removeItem('toko2.hard');
        t.toMenu(); await new Promise((r) => setTimeout(r, 150));
        const btn = item(/^DAILY$/), sub = btn?.querySelector('.sub')?.textContent ?? null; btn?.click();
        for (let i = 0; i < 100 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100));
        const r = { btn: !!btn, sub, state: t.state, day: t.daily?.day, seed: t.world?.seed, fixed: t.world?.fixedWaves, want: t.dailySeed(new Date()), world: t.world?.world };
        t.world.score = 1234; t.world.over = true; t.finish(); await new Promise((r) => setTimeout(r, 200));
        r.kept = JSON.parse(localStorage.getItem(key) || 'null'); r.share = !!item(/^SHARE$/); r.mode = document.querySelector('#menu .mode')?.textContent;
        item(/^AGAIN$/)?.click(); for (let i = 0; i < 100 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100));
        r.againSeed = t.world?.seed; r.againDaily = !!t.daily;
        localStorage.removeItem(key); t.showcase(['globbo'], { heroZ: 0.5 }); r.after = t.daily; return r; })()`);
      if (!(dly.btn && dly.state === 'play' && dly.day && dly.seed === dly.want && dly.fixed === true && dly.world === 1)) fail(`DAILY does not start the day's run from the title (${JSON.stringify(dly)})`);
      else if (!(dly.kept?.tries === 1 && dly.kept?.best === 1234 && dly.share && /DAILY/.test(dly.mode ?? ''))) fail(`a finished DAILY run is not counted for the day, or its results offer no SHARE (${JSON.stringify(dly)})`);
      else if (!(dly.againSeed === dly.want && dly.againDaily && dly.after === null)) fail(`AGAIN after a DAILY is not the day again, or an ordinary run after it is still one (${JSON.stringify(dly)})`);
      // v120: ?ending — the campaign's end, previewed: CAMPAIGN CLEAR with its tally, marked PREVIEW, nothing saved
      const end = await evaluate(`(async () => { const t = __toko, before = localStorage.getItem('toko2.campaign');
        await t.endingPreview(false); await new Promise((r) => setTimeout(r, 200));
        const r = { h2: document.querySelector('#menu h2')?.textContent, preview: [...document.querySelectorAll('#menu p')].some((p) => /^PREVIEW/.test(p.textContent)),
          tally: document.querySelectorAll('#menu .tiers .tt').length, total: document.querySelector('#menu .best')?.textContent, same: localStorage.getItem('toko2.campaign') === before };
        t.toMenu(); await new Promise((r) => setTimeout(r, 150)); t.showcase(['globbo'], { heroZ: 0.5 }); return r; })()`);
      if (!(end.h2 === 'CAMPAIGN CLEAR' && end.preview && end.tally === 4 && /[1-9]/.test(end.total ?? '') && end.same)) fail(`?ending does not preview the campaign's end, or it saved progress (${JSON.stringify(end)})`);
      // v84: spray and tracks — the hero runs through the pool the kill left: drops
      // thrown out of his foot, and tracks laid once he is out of it
      if (!gooOff) {
        // (its own kill, in a quiet arena: the checks before this restarted the run, which wipes the wet map;
        // the pool is wherever the gel died — it walks — so it is read off the map's wettest cell)
        const run = await evaluate(`(async () => { const t = __toko; t.showcase(['globbo'], { heroZ: 0.5 });
          const w = t.world, g = w.gels[0], h = w.hero, s = t.actors.goo.sim; g.hp = 1; h.z = h.pz = g.z + 4; const k0 = t.counts.kill || 0;
          for (let i = 0; i < 240 && (t.counts.kill || 0) === k0; i++) t.idle(1 / 60, { x: g.x, z: g.z });
          if ((t.counts.kill || 0) === k0) return null;
          t.idle(1.6);   // the pool settles, the chunks melt into it
          const W = s.wet; let bi = 0; for (let i = 0; i < W.v.length; i++) if (W.v[i] > W.v[bi]) bi = i;
          const pool = { x: (bi % W.cols) + 0.5 - W.hx, z: Math.floor(bi / W.cols) + 0.5 - W.hz }, wet = s.wetAt(pool.x, pool.z);
          h.x = h.px = pool.x - 3; h.z = h.pz = pool.z; h.invinc = 1e9;
          const sprayed0 = s.stats.sprayed, tracked0 = s.stats.tracked;
          t.act({ mx: 1, mz: 0 }, 1.4);
          return { wet, sprayed: s.stats.sprayed - sprayed0, tracked: s.stats.tracked - tracked0, x: h.x, pool }; })()`);
        if (!run) fail('the run check could not kill its gel');
        else if (!(run.wet > 0.05)) fail(`the wet map does not know the pool the kill left (${JSON.stringify(run)})`);
        else if (!(run.sprayed >= 3 && run.tracked >= 3)) fail(`running through the pool threw ${run.sprayed} drops and laid ${run.tracked} track stamps (${JSON.stringify(run)})`);
        else info.goo += `/run ${run.sprayed}+${run.tracked}`;
      }
      // v82: contact squash — two gels standing in each other, and a gel standing in
      // the hero, reach the gel shader as a contact depth; a body on its own does not
      // (the press is the sim's, the easing the frame's: a few frames are let by after each idle. Two gels
      // stood in each other are parted by the crowd within a few steps, so the press that lasts is a gel
      // stood in the HERO, who is never pushed: one either side of him, and a third far off as the control)
      const squash = await evaluate(`(async () => { const t = __toko; const ids = t.showcase(['globbo', 'globbo', 'globbo'], { spacing: 4, heroZ: 0.5 });
        const w = t.world, h = w.hero, frames = async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); };
        h.invinc = 1e9;
        // held either side of him through every step: world 9 cycles every world's rule, and a current or a slip
        // carried a gel off him inside the old 0.3 s idle (the press is the step's own, so the last step is what eases in)
        const hold = () => { for (const [g, dx] of [[w.gels[0], -0.6], [w.gels[1], 0.6]]) { g.x = g.px = h.x + dx; g.z = g.pz = h.z; g.vx = g.vz = g.kx = g.kz = 0; } };
        w.gels[2].x = w.gels[2].px = 9; w.gels[2].z = w.gels[2].pz = -4;
        for (let i = 0; i < 18; i++) { hold(); t.idle(1 / 60); }
        await frames(4);
        const both = (c) => (c ? c.z + c.w : -1), d = (id) => both(t.actors.views.get(id)?.mat?.gel?.contact.value);   // v90: the near side and the far side
        return { pair: [d(ids[0].id), d(ids[1].id)], alone: d(ids[2].id), hero: both(t.actors.hero.mat.gel.contact.value) }; })()`);
      if (!(squash.pair[0] > 0.03 && squash.pair[1] > 0.03 && Math.max(...squash.pair) > 0.2)) fail(`two gels stood in the hero do not squash against him (${JSON.stringify(squash)})`);   // the pair jostle each other off him a little; one of them is always pressed hard
      if (!(squash.alone < 0.02)) fail(`a gel on its own squashes (${JSON.stringify(squash)})`);
      if (!(squash.hero > 0.05)) fail(`the hero does not squash against the gels stood in him (${JSON.stringify(squash)})`);   // v90: pressed from both sides, which used to cancel to nothing


      // the worlds (v19, sim/worlds.js): straight on to the next world, as if
      // its boss had just been cleared — the floor opens, the droplet goes
      // down it, the next world's floor comes up under it as it lands, and
      // the run is the player's again, the screen back from the dark. And a
      // control: the last world (or SURVIVAL) does not go on
      if (worldsTest) {
        const tr = await evaluate(`(() => { const t = __toko; t.hold = false; const c0 = { ...t.counts }; const from = t.world.world;
          t.world.hero.invinc = 1e9;
          const ok = t.nextWorld(); t.advance(6.5);
          const d = (k) => (t.counts[k] || 0) - (c0[k] || 0);
          return { ok, from, to: t.world.world, view: t.viewWorld, style: t.floorStyle, out: d('worldOut'), in: d('worldIn'), land: d('worldLand'), go: d('worldGo'),
            trans: !!t.world.trans, sink: t.world.hero.sink, fall: t.world.hero.fall, following: t.following, hx: t.world.hx,
            want: t.arenaFor(Math.min(9, from + 1), t.world.shape), bigger: t.world.hx > t.arenaFor(1, t.world.shape).hx + 1e-6 }; })()`);
        await waitFrames(3);
        const fade = await evaluate('+__toko.transit.fade.style.opacity');
        if (tr.from >= 9) {
          // the control: the last world does not go on
          if (tr.ok || tr.to !== 9 || tr.out) fail(`the last world went on (nextWorld ${tr.ok}, now world ${tr.to}, ${tr.out} worldOut)`);
        } else {
          const style = STYLES[tr.from];
          if (!tr.ok) fail(`nextWorld() refused in world ${tr.from}`);
          else if (tr.to !== tr.from + 1 || tr.view !== tr.to || tr.style !== style || tr.hx !== tr.want.hx) fail(`world ${tr.from}'s floor did not open onto world ${tr.from + 1} (now world ${tr.to}, drawn ${tr.view} as ${tr.style}, ${tr.hx} wide)`);
          if (tr.out !== 1 || tr.in !== 1 || tr.land !== 1 || tr.go !== 1) fail(`a world change sent worldOut ${tr.out} / In ${tr.in} / Land ${tr.land} / Go ${tr.go}, not one of each`);
          if (tr.trans || tr.sink || tr.fall) fail(`6.5 s on, the world change has not finished (trans ${tr.trans}, sink ${tr.sink}, fall ${tr.fall})`);
          if (tr.bigger && !tr.following) fail(`world ${tr.to} is bigger than the screen but the camera does not follow`);
          if (fade > 0.01) fail(`the screen did not come back from the dark (fade ${fade})`);
        }
        // v80: the run is kept at the new world's door; the title offers CONTINUE and takes it up there with its score
        if (tr.from === 2 && !neon && tr.to === 3) {
          const cont = await evaluate(`(async () => { const t = __toko; const kept = JSON.parse(localStorage.getItem('toko2.continue') || 'null');
            t.toMenu(); await new Promise((r) => setTimeout(r, 300));
            const btn = [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'CONTINUE');
            const sub = btn?.querySelector('.sub')?.textContent ?? null; btn?.click();
            for (let i = 0; i < 40 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100));
            const r = { kept, btn: !!btn, sub, state: t.state, world: t.world?.world, score: t.world?.score, lives: t.world?.hero.lives, after: JSON.parse(localStorage.getItem('toko2.continue') || 'null') };
            localStorage.removeItem('toko2.continue'); return r; })()`);
          if (!cont.kept || cont.kept.world !== 3 || cont.kept.mode !== 'arcade') fail(`the run was not kept at world 3's door (${JSON.stringify(cont.kept)})`);
          else if (!cont.btn || !/3/.test(cont.sub ?? '')) fail(`the title offers no CONTINUE for the kept run (btn ${cont.btn}, "${cont.sub}")`);
          else if (cont.state !== 'play' || cont.world !== 3 || cont.score !== cont.kept.score || cont.lives !== cont.kept.lives) fail(`CONTINUE did not take the run up at world 3 with its score and lives (${JSON.stringify(cont)})`);
          else if (!cont.after || cont.after.world !== 3) fail(`taking the run up dropped the kept run (${JSON.stringify(cont.after)})`);
          // v85: world 3 reached, the title offers FROM WORLD; set to 3 it starts a run there,
          // whose score is kept apart from the real best
          const urlWorld = Number(new URLSearchParams(query).get('world')) || 0;
          const from = await evaluate(`(async () => { const t = __toko; const reached = +localStorage.getItem('toko2.reached.arcade');
            const best0 = +(localStorage.getItem('toko2.heat.best.arcade') || 0);
            t.toMenu(); await new Promise((r) => setTimeout(r, 300));
            // v156: START AT (was FROM WORLD) is a row under ARCADE, the world it starts at as its value
            const btn = () => [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'START AT');
            const labels = []; for (let i = 0; i < 4 && btn() && !/3/.test(btn().querySelector('.val').textContent); i++) { labels.push(btn().querySelector('.val').textContent); btn().click(); await new Promise((r) => setTimeout(r, 150)); }
            const label = btn()?.querySelector('.val').textContent ?? null, arcadeSub = [...document.querySelectorAll('#menu .item')][0]?.querySelector('.sub')?.textContent ?? '';
            t.start('arcade'); for (let i = 0; i < 40 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100));
            const w = t.world; const world = w?.world; w.score = 777; w.over = true; t.finish(); await new Promise((r) => setTimeout(r, 200));
            const r = { reached, labels, label, arcadeSub, world, state: t.state, best: +(localStorage.getItem('toko2.heat.best.arcade') || 0), best0, bestFrom: +(localStorage.getItem('toko2.heat.best.arcade.from' + world) || 0),
              rec: JSON.parse(localStorage.getItem('toko2.record') || '[]').slice(-1)[0]?.w0 ?? null };
            localStorage.removeItem('toko2.startAt.arcade'); return r; })()`);
          if (!(from.reached >= 3)) fail(`world 3 was not kept as reached (${JSON.stringify(from)})`);
          else if (!/WORLD 3/.test(from.label ?? '')) fail(`the title's START AT did not step to WORLD 3 (${JSON.stringify(from)})`);
          // a scenario that pins a world with ?world= keeps it: that is what the parameter is for (main.js startWorld), so the title's setting is tested where none is pinned
          else if (from.world !== (urlWorld || 3)) fail(`ARCADE set to start at world 3${urlWorld ? ` under ?world=${urlWorld}` : ''} started at world ${from.world}`);
          else if (!((urlWorld ? from.bestFrom >= 777 : from.bestFrom === 777) && from.best === from.best0 && from.rec === from.world)) fail(`a run from world ${from.world} did not keep its score apart (${JSON.stringify(from)})`);   // one profile serves every scenario: under ?world= the from-key may already hold an earlier run's score
        }
        const wshot = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(OUT, `${name}-world${tr.to}.png`), Buffer.from(wshot.data, 'base64'));
        info.world = tr.to;
      }

      // SURVIVAL (v20, sim/reshape.js): its floor starts small and changes
      // size as you play — the floor warns, the walls slam, the camera
      // refits — and back on the title the floor is ARCADE's again
      if (menu) {
        const R = await evaluate(`(() => { const t = __toko; t.start('survival'); const w = t.world, A = t.arenaFor(1, w.shape), S = w.shapeT;
          const r = { mode: w.mode, small: w.hx < A.hx && w.hz < A.hz, bounds: !!t.floor().bounds, first: S?.next };
          const c0 = { ...t.counts }; w.hero.invinc = 1e9;
          t.advance(S.next + 0.1);
          r.warned = (t.counts.reshapeWarn || 0) - (c0.reshapeWarn || 0); r.warnLit = t.floor().bounds.warn.value;
          const from = [w.hx, w.hz];
          t.advance(3.0);   // the warning (2.2 s) and the slam (0.45 s), and a beat
          r.slammed = (t.counts.reshaped || 0) - (c0.reshaped || 0); r.size = [w.hx, w.hz]; r.to = [S.to.hx, S.to.hz]; r.from = from;
          return r; })()`);
        // the view catches up on the frames after the jump: the rail, the
        // camera; and the slam's shake (an event, not the framing) dies down
        await waitFrames(3); await sleep(900); await waitFrames(2);
        const fit = await evaluate(`(() => { const t = __toko, a = t.arena, c = t.camera, f = t.floor(); let worst = 0;
          for (const x of [a.min.x, a.max.x]) for (const z of [a.min.z, a.max.z]) { const p = new t.THREE.Vector3(x, 0, z).project(c); worst = Math.max(worst, Math.abs(p.x), Math.abs(p.y)); }
          return { worst, warn: f.bounds.warn.value, rail: [f.border.scale.x * f.arena.max.x, f.border.scale.z * f.arena.max.z], following: t.following }; })()`);
        R.rail = fit.rail; R.following = fit.following;
        const sshot = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(OUT, `${name}-survival.png`), Buffer.from(sshot.data, 'base64'));
        const back = await evaluate(`(() => { const t = __toko; t.toMenu(); return { bounds: !!t.floor().bounds, w: t.floor().arena.max.x }; })()`);
        if (R.mode !== 'survival') fail(`__toko.start('survival') started ${R.mode ?? 'nothing'}`);
        if (!R.small || !R.bounds) fail(`SURVIVAL did not start on a small floor drawn with walls (small ${R.small}, bounds ${R.bounds})`);
        if (R.warned !== 1) fail(`SURVIVAL's floor did not warn before its first change (${R.warned} warnings)`);
        if (R.slammed !== 1 || Math.abs(R.size[0] - R.to[0]) > 1e-6 || Math.abs(R.size[1] - R.to[1]) > 1e-6) fail(`SURVIVAL's walls did not reach the new size (${R.size} vs ${R.to}, ${R.slammed} changes)`);
        if (Math.abs(R.rail[0] - R.size[0]) > 0.02 || Math.abs(R.rail[1] - R.size[1]) > 0.02) fail(`SURVIVAL's rail is not on its walls (${R.rail} vs ${R.size})`);
        if (!R.following && fit.worst > 1.0001) fail(`after the change the floor is not wholly on screen (worst ${fit.worst.toFixed(3)})`);
        if (fit.warn > 0.01) fail(`the warning stayed lit after the change (${fit.warn})`);
        if (back.bounds) fail('back on the title the floor is still SURVIVAL\'s');
        // THE BOSS FIGHT (v42, sim/bossfight.js): a boss wave puts the boss,
        // its clock and its grade on the clock line and its health in a bar under
        // it; the boss down says so in the banner, pays, and the bar goes. The
        // bar is read near full, not full: the hero can nick the boss in the
        // frames between the last one landing and the read
        const fight = await evaluate(`(async () => { const t = __toko, wait = async (f, ms = 20000) => { for (const end = performance.now() + ms; performance.now() < end && !f(); ) await new Promise((r) => setTimeout(r, 50)); return f(); };
          t.toMenu(); t.start('arcade'); t.world.hero.invinc = 1e9; t.bossWave();
          // v109: the boss comes in under its own name, on a card in the banner's band
          const card = () => document.getElementById('card'), named = await wait(() => !card().hidden && card().classList.contains('band'), 6000) ? card().querySelector('.t').textContent : null;
          // every boss of the wave up (the second prism lands 0.4 s after the first)
          const up = await wait(() => t.world.fight && t.world.fight.seen && !t.world.dir.queue.some((q) => q.boss) && !document.getElementById('bossbar').hidden);
          const clock = document.getElementById('clock').textContent, r = document.getElementById('bossbar').getBoundingClientRect(), c = document.getElementById('clock').getBoundingClientRect();
          const fill = document.querySelector('#bossbar i').style.width;
          const n = t.killBosses();
          const down = await wait(() => (t.counts.bossDown || 0) > 0 && document.getElementById('bossbar').hidden);
          const banner = document.getElementById('banner').textContent;
          // v109: and the world ends on WORLD CLEAR before the floor opens (v154: on a side card at the right edge)
          const cleared = await wait(() => !card().hidden && card().classList.contains('side') && card().querySelector('.t').textContent === 'WORLD CLEAR', 10000);   // v154: a side card, flush right
          t.toMenu();
          return { up, clock, bar: { w: Math.round(r.width), right: Math.round(innerWidth - r.right), under: r.top >= c.bottom - 1 }, fill, n, down, banner, named, cleared }; })()`);
        if (!fight.up) fail(`a boss wave did not put a fight on the HUD (${JSON.stringify(fight)})`);
        else {
          if (!/^(TWIN PRISMS|OMEGA) · [SABC]/.test(fight.clock)) fail(`the boss fight's clock line is not "BOSS · grade" ("${fight.clock}")`);
          if (fight.bar.w < 40 || fight.bar.right > 40 || !fight.bar.under || !(parseFloat(fight.fill) > 50 && parseFloat(fight.fill) <= 100)) fail(`the boss's health bar is not drawn near full, under the clock, at the right (${JSON.stringify(fight.bar)}, fill ${fight.fill})`);
          if (!fight.n || !fight.down || !/DOWN · [SABC] · \+[\d,]+/.test(fight.banner)) fail(`the boss down did not end the fight with its banner ("${fight.banner}", down ${fight.down})`);
          if (!/^(TWIN PRISMS|OMEGA)$/.test(fight.named ?? '')) fail(`the boss wave did not open with the boss's name on a card ("${fight.named}")`);
          if (!fight.cleared) fail('the world\'s boss down did not end the world on WORLD CLEAR');
        }
        // THE INTRO (v39, owner 2026-10-24): a start from the title plays the
        // film, a press skips it into the run, and AGAIN after the run goes
        // straight back in without it. Every other scenario boots ?nointro.
        const film = await evaluate(`(async () => { const t = __toko, wait = async (f, ms = 8000) => { for (const end = performance.now() + ms; performance.now() < end && !f(); ) await new Promise((r) => setTimeout(r, 50)); return f(); };
          t.nointro = false; t.toMenu();
          [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'ARCADE').click();
          const first = t.state;
          await new Promise((r) => setTimeout(r, 600));
          dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
          const skipped = await wait(() => t.state === 'play');
          t.world.over = true;
          // the death beat is 1.4 s of the RUN's frames, each at most 0.1 s: a slow software GPU takes a while
          const over = await wait(() => t.state === 'over' && [...document.querySelectorAll('#menu .item')].some((b) => b.querySelector('.label')?.textContent === 'AGAIN'), 45000);
          [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'AGAIN')?.click();
          const again = t.state;
          t.nointro = true; t.toMenu();
          return { first, skipped, over, again }; })()`);
        if (film.first !== 'intro') fail(`ARCADE from the title did not play the intro (state ${film.first})`);
        if (!film.skipped) fail('a press did not skip the intro into the run');
        if (!film.over) fail('the run did not end on the results with AGAIN');
        if (film.again !== 'play') fail(`AGAIN after a run did not go straight into play (state ${film.again})`);
        // v125 (the state audit): QUIT in the middle of a world change leaves the title clear — the change is the
        // run's, and it was re-applied under the title every frame (the floor frozen in the vortex, or under the dark)
        const quitMid = await evaluate(`(async () => { const t = __toko, frames = async (n) => { const f = t.frames; for (const end = performance.now() + 20000; t.frames - f < n && performance.now() < end; ) await new Promise((r) => setTimeout(r, 30)); };
          t.toMenu(); t.start('arcade'); t.world.hero.invinc = 1e9; t.nextWorld(); t.advance(2.0); await frames(2);
          const mid = { phase: t.machines.transit, run: t.machines.run, hero: t.machines.hero, fade: +t.transit.fade.style.opacity, swirl: t.floor().swirl.k.value };
          t.pause(); t.toMenu(); await frames(4);
          const m = t.machines;
          return { mid, phase: m.transit, runView: m.runView, fade: +t.transit.fade.style.opacity, swirl: t.floor().swirl.k.value, hole: t.floor().swirl.hole.value, following: t.following, state: t.state, views: t.actors.views.size }; })()`);
        if (quitMid.mid.phase !== 'out' || !(quitMid.mid.swirl > 0.1)) fail(`the world change was not under way when the run was left (${JSON.stringify(quitMid.mid)})`);
        // v126: and the simulation's own reading of it, for an agent: the run between two worlds, the hero guarded
        else if (quitMid.mid.run !== 'transition' || !quitMid.mid.hero?.guard) fail(`__toko.machines did not read the world change (${JSON.stringify(quitMid.mid)})`);
        // v127: and the title draws none of the run it came back from (its bodies stood frozen on world 1's floor)
        if (quitMid.views !== 0) fail(`the title after a run still draws ${quitMid.views} of that run's bodies`);
        else if (quitMid.state !== 'menu' || quitMid.fade > 0.01 || quitMid.swirl > 0.001 || quitMid.hole > 0.001 || quitMid.runView || quitMid.following) fail(`QUIT in the middle of a world change left it on the title (${JSON.stringify(quitMid)})`);
        // v125: the film over a later world (a FROM WORLD start) gives the floor back as that world drew it — the
        // driveway's summer haze and no rail, where it put world 1's dark and rail on it
        const later = await evaluate(`(async () => { const t = __toko, wait = async (f, ms = 8000) => { for (const end = performance.now() + ms; performance.now() < end && !f(); ) await new Promise((r) => setTimeout(r, 50)); return f(); };
          localStorage.setItem('toko2.reached.arcade', '2'); localStorage.setItem('toko2.startAt.arcade', '2'); localStorage.setItem('toko2.hard', 'off');
          t.nointro = false; t.toMenu();
          [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'ARCADE').click();
          const first = t.state, world = t.world?.world;
          await new Promise((r) => setTimeout(r, 600));
          dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
          const played = await wait(() => t.state === 'play');
          const bg = t.scene.background, sky = t.tuning.worlds.floor.concrete.sky;
          const r = { first, world, played, border: t.floor().border.visible, bg: [bg.r, bg.g, bg.b].map((v) => +v.toFixed(3)), sky };
          t.nointro = true; localStorage.setItem('toko2.startAt.arcade', '1'); t.toMenu();
          return r; })()`);
        if (later.first !== 'intro' || later.world !== 2 || !later.played) fail(`a FROM WORLD 2 start did not play the film into world 2 (${JSON.stringify(later)})`);
        else if (later.border || later.bg.some((v, i) => Math.abs(v - later.sky[i]) > 0.02)) fail(`the film over world 2 left world 1's look on its floor (rail ${later.border}, background ${later.bg} against the driveway's ${later.sky})`);
        // THE CAMPAIGN (v25): the title opens the room list, the rooms
        // before the first quota room graded C open it and nothing after
        // it; the quota room draws its region and plays to a grade (v46:
        // the order is TUNING's, which the bot's measurements set)
        const ROWS = TUNING.campaign.worlds.map((wd) => wd.rooms.map((r) => r.id)), ORDER = ROWS.flat(), COLS = Math.max(...ROWS.map((r) => r.length));
        // the first quota room on a shaped floor (a plain rectangle is the world's own floor: no region)
        const Q = ORDER.findIndex((id) => { const L = JSON.parse(readFileSync(join(ROOT, 'levels', `${id}.json`), 'utf8')), sh = L.arena.shapes; return L.goal.type === 'quota' && (sh.length > 1 || sh[0].kind !== 'rect'); });
        const QID = ORDER[Q], QLV = JSON.parse(readFileSync(join(ROOT, 'levels', `${QID}.json`), 'utf8'));
        const qr = Math.floor(Q / COLS), qc = Q % COLS, QRIGHT = ROWS[qr][qc + 1], QDOWN = ROWS[qr + 1]?.[qc + 1];   // the grid's rows are staggered: down is one column on
        const graded = Object.fromEntries(ORDER.slice(0, Q).map((id) => [id, { grade: 'C' }]));
        const camp = await evaluate(`(async () => { const t = __toko; localStorage.setItem('toko2.campaign', JSON.stringify(${JSON.stringify(graded)})); t.toMenu();
          [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'CAMPAIGN').click();
          for (let i = 0; i < 40 && !document.querySelector('#menu .grid .tile'); i++) await new Promise((r) => setTimeout(r, 100));
          // v33: the grid — every room a tile, the graded ones and the next open, the focus on the next room; the pad walks it in 2-D
          const tiles = [...document.querySelectorAll('#menu .tile')], ui = t.ui;
          const r = { tiles: tiles.length, open: tiles.filter((x) => !x.classList.contains('off')).map((x) => x.dataset.id), route: !!document.querySelector('#menu canvas.route'),
            focus: ui.buttons[ui.focusIndex]?.dataset.id };
          ui._dir(1, 0); r.right = ui.buttons[ui.focusIndex]?.dataset.id; ui._dir(0, 1); r.down = ui.buttons[ui.focusIndex]?.dataset.id; ui._dir(0, -1); ui._dir(-1, 0);
          // a tile opens the room's card; START is the way in
          tiles.find((x) => x.dataset.id === '${QID}').click();
          await new Promise((r) => setTimeout(r, 100));
          r.card = { title: document.querySelector('#menu h2.card')?.textContent, tiers: document.querySelectorAll('#menu .tiers .tg').length, chart: !!document.querySelector('#menu canvas.chart'),
            start: ui.buttons[ui.focusIndex]?.querySelector('.label')?.textContent, state: t.state };
          [...document.querySelectorAll('#menu .item')].find((b) => b.classList.contains('go')).click();
          for (let i = 0; i < 40 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100));
          const w = t.world; r.state = t.state; r.mode = w?.mode; r.region = !!w?.region; r.rail = !t.floor().border.visible; r.style = t.floorStyle; r.kind = t.scenery.kind;
          return r; })()`);
        await waitFrames(3);
        const cshot = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(OUT, `${name}-campaign.png`), Buffer.from(cshot.data, 'base64'));
        const cend = await evaluate(`(() => { const t = __toko, w = t.world; w.hero.invinc = 1e9; t.advance(2); w.kills = w.room.level.goal.kills; t.advance(1); return { over: w.over, res: w.roomResult }; })()`);   // a quota room (v31): its count met
        // the death beat is 1.4 s of frame time at no more than 0.1 s a frame: 14 frames, and a
        // room under SwiftShader draws about one a second, so 15 s was right at the edge
        const fWait = await evaluate('__toko.frames');
        // v101: wait for the menu by FRAMES as well as by the clock — a wall-clock wait measures the machine: with other
        // work on its CPUs a room drew at 2–3 s a frame under SwiftShader, so 30 s was ~13 frames, short of the death beat's 14
        const untilMenu = async (frames = 40, capMs = 150000) => {
          const f0 = await evaluate('__toko.frames');
          for (const end = Date.now() + capMs; Date.now() < end; await sleep(250)) {
            const [st, f] = await evaluate('[__toko.state, __toko.frames]');
            if (st === 'menu' || f - f0 > frames) return;
          }
        };
        await untilMenu();
        await sleep(300);
        const after = await evaluate(`({ state: __toko.state, fault: document.getElementById('fault')?.hidden ? null : document.getElementById('fault')?.textContent?.slice(0, 300), vis: document.visibilityState, frames: __toko.frames - ${fWait}, played: document.querySelector('#menu .played')?.textContent, saved: JSON.parse(localStorage.getItem('toko2.campaign') || '{}')['${QID}'] })`);
        if (camp.tiles !== ORDER.length || camp.open.join() !== ORDER.slice(0, Q + 1).join() || !camp.route) fail(`the grid is not ${ORDER.length} tiles with the rooms up to ${QID} open (${JSON.stringify(camp)})`);
        if (camp.focus !== QID || camp.right !== QRIGHT || camp.down !== QDOWN) fail(`the grid does not start on the next room or the pad does not walk it in 2-D (${camp.focus} → ${camp.right} → ${camp.down}; want ${QID} → ${QRIGHT} → ${QDOWN})`);
        if (camp.card?.title !== QLV.name || camp.card.tiers !== 5 || !camp.card.chart || camp.card.state !== 'menu' || !camp.card.start) fail(`a tile does not open its card with its chart, five grade lines and START in focus (${JSON.stringify(camp.card)})`);
        if (camp.state !== 'play' || camp.mode !== 'campaign' || !camp.region || !camp.rail) fail(`${QLV.name} did not start as a shaped room (${JSON.stringify(camp)})`);
        // v73: a room wears its world's look, the arcade world its rule comes from: that floor and the set round it.
        // v153: or the look it names itself (`rooms[].look`) — the grid, for a floor that is a shape or moves
        const QLOOK = TUNING.campaign.worlds[qr].rooms.find((r) => r.id === QID)?.look ?? TUNING.campaign.worlds[qr].look;
        const wantStyle = QLOOK === 'driveway' ? 'concrete' : QLOOK, wantKind = QLOOK === 'driveway' || QLOOK === 'sewer' ? QLOOK : `surround:${QLOOK}`;
        if (camp.style !== wantStyle || camp.kind !== wantKind) fail(`${QLV.name} does not wear its look (floor ${camp.style}, set ${camp.kind}; want ${wantStyle}, ${wantKind})`);
        if (!cend.over || !cend.res || cend.res.outcome !== 'clear' || !/^[SABC]$/.test(cend.res.grade)) fail(`${QLV.name} did not play to a grade (${JSON.stringify(cend)})`);
        if (!after.played || !after.saved) fail(`after the room the list did not come back with its grade, or the grade was not kept (${JSON.stringify(after)})`);
        // the HARD CAMPAIGN (v49), called HARD PAIN on the title from v50: the title's HARD switch
        // turns the grid into its own route, where a room opens only once it is cleared on the normal
        // one (here the first is); the title goes red, and the room's card says HARD PAIN
        const hardCamp = await evaluate(`(async () => { const t = __toko; localStorage.setItem('toko2.hard', 'on'); localStorage.setItem('toko2.campaign', JSON.stringify({ '${ORDER[0]}': { grade: 'C' } })); localStorage.removeItem('toko2.campaign.hard'); t.toMenu();
          const btn = [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'HARD PAIN'); if (!btn) return { btn: false };
          const red = document.getElementById('menu').classList.contains('hardmode');
          btn.click(); for (let i = 0; i < 40 && !document.querySelector('#menu .grid .tile'); i++) await new Promise((r) => setTimeout(r, 100));
          const r = { btn: true, red, title: document.querySelector('#menu h2')?.textContent, open: [...document.querySelectorAll('#menu .tile')].filter((x) => !x.classList.contains('off')).map((x) => x.dataset.id) };
          document.querySelector('#menu .tile:not(.off)')?.click(); await new Promise((r) => setTimeout(r, 100));
          r.tag = document.querySelector('#menu .hardtag')?.textContent ?? null;
          localStorage.setItem('toko2.hard', 'off'); return r; })()`);
        if (!hardCamp.btn || !hardCamp.red || hardCamp.title !== 'HARD PAIN' || hardCamp.open.join() !== ORDER[0] || hardCamp.tag !== 'HARD PAIN') fail(`the HARD switch does not give a red title and HARD PAIN with only the normally cleared room open, its card saying HARD PAIN (${JSON.stringify(hardCamp)})`);
        // v54: the campaign's END — the room that makes all thirty-six through shows the end
        // screen (its title and the four grades' tally), and ROOMS goes on to the grid with its S tally
        await untilMenu();   // the room before has finished
        const allBut = Object.fromEntries(ORDER.filter((id) => id !== QID).map((id) => [id, { grade: 'S', pts: 1000 }]));
        await evaluate(`(async () => { const t = __toko; localStorage.setItem('toko2.campaign', JSON.stringify(${JSON.stringify(allBut)})); t.toMenu();
          [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'CAMPAIGN').click();
          for (let i = 0; i < 40 && !document.querySelector('#menu .grid .tile'); i++) await new Promise((r) => setTimeout(r, 100));
          [...document.querySelectorAll('#menu .tile')].find((x) => x.dataset.id === '${QID}').click(); await new Promise((r) => setTimeout(r, 100));
          [...document.querySelectorAll('#menu .item')].find((b) => b.classList.contains('go')).click();
          for (let i = 0; i < 40 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100)); })()`);
        // v101: and a score over its lines — a room is graded on its score (v51), and two seconds of the bot sometimes
        // scored under C, an F, which is not a clear: the room's own result showed instead of CAMPAIGN CLEAR (THE PULL, tally 5)
        await evaluate(`(() => { const w = __toko.world; w.hero.invinc = 1e9; __toko.advance(2); w.kills = w.room.level.goal.kills; w.score = Math.max(w.score, 1e7); __toko.advance(1); })()`);
        await untilMenu();
        await sleep(300);
        const done = await evaluate(`(async () => { const r = { title: document.querySelector('#menu h2')?.textContent, tally: document.querySelectorAll('#menu .tiers .tg').length };
          [...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'ROOMS')?.click();
          for (let i = 0; i < 40 && !document.querySelector('#menu .grid .tile'); i++) await new Promise((r) => setTimeout(r, 100));
          r.stally = document.querySelector('#menu h2 .stally')?.textContent ?? null; return r; })()`);
        if (done.title !== 'CAMPAIGN CLEAR' || done.tally !== 4 || !/S \d+\/36/.test(done.stally ?? '')) fail(`clearing the last room does not show CAMPAIGN CLEAR with its tally, then the grid with its S count (${JSON.stringify(done)})`);
        info.campaign = cend.res ? `${cend.res.grade} ${cend.res.kills}k` : '-';
        await evaluate(`localStorage.removeItem('toko2.campaign'); __toko.toMenu()`);
      }
    }

    // the title's GELS switch, in the SDF scenario: flips both ways, persists,
    // and drops the ?gels= override so a reload agrees with the menu
    if (ready && name === 'sdf') {
      const openOpts = `[...document.querySelectorAll('#menu .item')].find((b) => b.querySelector('.label')?.textContent === 'SETTINGS')?.click()`;
      await evaluate('__toko.hold = false; __toko.toMenu()'); await evaluate(openOpts);
      const flip = async () => { await evaluate(`[...document.querySelectorAll('#menu .item')].find((b) => /^GELS/.test(b.textContent)).click()`); await waitFrames(1);
        return evaluate(`({ label: [...document.querySelectorAll('#menu .item .label')].map((e) => e.textContent).find((l) => /^GELS/.test(l)), gels: __toko.actors.gels, stored: localStorage.getItem('toko2.gels'), url: location.search, ver: document.getElementById('ver').textContent.trim() })`); };
      const waitFrames = async (n) => { const f = await evaluate('__toko.frames'); for (const end = Date.now() + FRAME_GRACE; (await evaluate('__toko.frames')) - f < n && Date.now() < end; ) await sleep(40); };
      const a = await flip(), b = await flip();
      if (a.label !== 'GELS · CLASSIC' || a.gels !== 'classic' || a.stored !== 'classic' || /gels=/.test(a.url) || a.ver.endsWith(' · sdf')) fail(`the GELS switch did not flip SDF → CLASSIC: ${JSON.stringify(a)}`);
      if (b.label !== 'GELS · SDF' || b.gels !== 'sdf' || b.stored !== 'sdf' || !b.ver.endsWith(' · sdf')) fail(`the GELS switch did not flip CLASSIC → SDF: ${JSON.stringify(b)}`);
      await send('Page.navigate', { url: base });
      let back = false;
      for (const end = Date.now() + BOOT_TIMEOUT; !back && Date.now() < end; ) { back = await evaluate('!!(window.__toko && window.__toko.ready)').catch(() => false); if (!back) await sleep(250); }
      if (back) await evaluate(openOpts);
      const after = back ? await evaluate(`({ gels: __toko.actors.gels, label: [...document.querySelectorAll('#menu .item .label')].map((e) => e.textContent).find((l) => /^GELS/.test(l)) })`) : null;
      if (!after || after.gels !== 'sdf' || after.label !== 'GELS · SDF') fail(`the GELS switch did not persist across a reload: ${JSON.stringify(after)}`);
      await evaluate(`localStorage.removeItem('toko2.gels')`).catch(() => {});
    }

    for (const url of requests.values()) {
      const u = new URL(url);
      if (/\.(m?js|css|webmanifest|json)$/.test(u.pathname) && !u.searchParams.has('v')) fail(`module requested without a ?v= token: ${u.pathname}`);
    }
    cdp.listeners.delete(listener);
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});

    const line = `${fails.length ? '✗' : '✔'} ${name.padEnd(13)} ${String(info.backend || '-').padEnd(6)} boot ${(bootMs / 1000).toFixed(1)} s` +
      (info.counts ? `  run ${info.simTime.toFixed(1)} s  shots ${info.counts.shot || 0}  gels ${info.counts.spawn || 0}  kills ${info.counts.kill || 0}` : '') +
      (info.arenaWorst !== undefined ? `  arena ${info.arenaWorst.toFixed(3)}` : '') +
      (info.cornerLum !== undefined ? `  floor ${info.cornerLum.toFixed(3)}` : '') + (info.heroLum !== undefined ? `  hero ${info.heroLum.toFixed(3)}` : '') +
      (info.sdfDrawn !== undefined ? `  sdf ${info.sdfDrawn} drawn` : '') + (info.world ? `  → world ${info.world}` : '') +
      (info.pickups ? `  pickups ${info.pickups.items}/${info.pickups.gates}/${info.pickups.moths}${info.pickups.bounty ? '/B' : ''}` : '') +
      (info.goo ? `  goo ${info.goo}` : '') + (info.campaign ? `  campaign ${info.campaign}` : '');
    report.push(line);
    console.log(line);
    for (const f of fails) { console.log('    ' + f); failures.push(`${name}: ${f}`); }
  }

  console.log(`· smoke ${base}  (expect "${LABEL}", screenshots → ${OUT})`);
  await scenario('landscape', { orientation: 'landscape', menu: true, worldsTest: true });
  if (gpuAdapter === false) console.log('  · this browser offers no WebGPU adapter: only the WebGL 2 path is exercised');
  else if (gpuAdapter === null) console.log('  · WebGPU adapter not probed (landscape never became ready)');
  if (!QUICK) {
    await scenario('portrait', { orientation: 'portrait' });
    await scenario('rotate', { orientation: 'landscape', rotate: true });
    await scenario('ipad', { device: 'ipad', orientation: 'landscape' });
    // also the goo's control: 1.x's droplets and puddles, and no film (?goo=off)
    await scenario('ipad-portrait', { query: '?goo=off', device: 'ipad', orientation: 'portrait' });
    await scenario('pad', { device: 'ipad', orientation: 'landscape', pad: true });
  }
  await scenario('webgl2', { query: '?webgl', orientation: 'landscape', expectBackend: 'webgl2' });
  // the worlds past the first (v19): the driveway on a phone, the sewer on WebGL 2, upright, each going on
  await scenario('world2', { query: '?world=2', orientation: 'landscape', worldsTest: true });
  await scenario('world2-neon', { query: '?world=2&worlds=neon', orientation: 'portrait', worldsTest: true });
  await scenario('world3', { query: '?webgl&world=3', orientation: 'portrait', expectBackend: 'webgl2', worldsTest: true });
  await scenario('world4', { query: '?world=4', orientation: 'portrait', worldsTest: true });   // v74: into a world with a set of its own (render/sets/), upright, the boilers in view
  await scenario('world4-gl', { query: '?webgl&world=4', orientation: 'landscape', expectBackend: 'webgl2', worldsTest: true });   // v144: the simulated water on the WebGL 2 fallback
  await scenario('world6', { query: '?world=6', orientation: 'portrait', worldsTest: true });   // v146: the river's flowing simulated water
  await scenario('world9', { query: '?world=9', orientation: 'landscape', worldsTest: true });
  // v92: the STYLE switch, both painted looks, each with the splatter the ordinary run leaves
  if (!QUICK) {
    await scenario('style-cel', { query: '?style=cel', orientation: 'landscape' });
    await scenario('style-watercolor', { query: '?style=watercolor', orientation: 'portrait' });
    await scenario('lens-tilt', { query: '?lens=tilt', orientation: 'landscape' });   // v94: the tilt-shift lens: the run boots, plays and fits through it
  }
  // last: the SDF scenarios use the URL (one profile serves every scenario), and clean up the switch
  await scenario('sdf', { query: '?gels=sdf', orientation: 'landscape' });
  await scenario('sdf-webgl2', { query: '?webgl&gels=sdf', orientation: 'landscape', expectBackend: 'webgl2' });
  return { failures, gpuAdapter };
}

run().then(({ failures, gpuAdapter }) => {
  if (failures.length) {
    console.log(`\n✗ SMOKE FAIL (${failures.length})`);
    process.exit(1);
  }
  console.log(`\n✔ smoke passed: boots clean on ${gpuAdapter ? 'WebGPU and WebGL 2' : 'WebGL 2'}, "${LABEL}" on screen, arena fits both ways`);
  process.exit(0);
}, (e) => { console.error(`✗ SMOKE ERROR: ${e.stack || e.message}`); process.exit(1); });
