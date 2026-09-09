// The one launcher every Powder harness shares. Serves the repo root on a
// free port, opens headless Chromium on SwiftShader, and — only when a local
// copy of three can be resolved (NODE_PATH, or a node_modules up the tree) —
// routes the jsDelivr importmap URLs to it, so the harnesses run in a sandbox
// with no network exactly as they run in CI with one.
//
//   NODE_PATH=$(npm root -g) node powder/test/keys.mjs
//
// Playwright resolves its own Chromium (PLAYWRIGHT_BROWSERS_PATH honoured);
// CHROME_PATH overrides it.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// require, not import: ESM ignores NODE_PATH, and the repo's gates get
// playwright from the global root (`NODE_PATH=$(npm root -g)`), as hub-smoke.cjs does
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/** Where the harnesses drop screenshots — gitignored, never the repo root. */
export const OUT = path.join(ROOT, 'powder', 'test', 'out');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.css': 'text/css' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, r) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = path.join(ROOT, u);
      if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(r);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

/**
 * Playwright's own Chromium when its revision is installed; otherwise any
 * chromium-* under PLAYWRIGHT_BROWSERS_PATH (a sandbox pins one revision and
 * the global playwright may want another); CHROME_PATH overrides both.
 */
function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  try { const p = chromium.executablePath(); if (fs.existsSync(p)) return p; } catch { /* fall through */ }
  const home = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (home && fs.existsSync(home)) {
    for (const d of fs.readdirSync(home).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
      const p = path.join(home, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

/** Route the importmap's CDN URLs to a local three, when one resolves. */
export async function routeThree(page) {
  const three = localThree();
  if (!three) return false;
  await page.route('**/cdn.jsdelivr.net/npm/three@*/**', r => {
    const u = r.request().url();
    const rel = u.includes('/build/') ? 'build/' + u.split('/build/')[1] : 'examples/jsm/' + u.split('/examples/jsm/')[1];
    const f = path.join(three, rel.split('?')[0]);
    if (!fs.existsSync(f)) return r.abort();
    r.fulfill({ path: f, contentType: MIME[path.extname(f)] || 'text/javascript' });
  });
  return true;
}

function localThree() {
  // three's package "exports" map hides package.json, so resolve the entry
  // point and walk up to the package directory
  try { const main = require.resolve('three'); const i = main.lastIndexOf('/build/'); return i > 0 ? main.slice(0, i) : null; } catch { return null; }
}

/**
 * @param {object} o  q ('low'|'high'), query (extra query string), width, height,
 *   settle (ms to wait after load), log (echo [models]/[pageerror] lines),
 *   mobile (touch-capable context)
 */
export async function open(o = {}) {
  const { q = 'low', query = '', width = 1280, height = 720, settle = 2500, log = true, mobile = false } = o;
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({
    executablePath: chromePath(),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
  });
  // mobile: a touch-capable context, for the twin-stick harness — real CDP
  // touch events need hasTouch, and a desktop page reports none
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: !!mobile, isMobile: !!mobile });
  const page = await context.newPage();
  await routeThree(page);
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); if (log) console.log('[pageerror]', e.message); });
  if (log) page.on('console', m => { if (m.text().startsWith('[models]')) console.log(m.text()); });
  await page.goto(`${base}/powder/?q=${q}${query ? '&' + query : ''}`, { waitUntil: 'load' });
  await page.waitForTimeout(settle);
  return {
    browser, context, page, base, errors, root: ROOT,
    close: async () => { await browser.close(); srv.close(); },
  };
}

/** The harnesses' common park: the rift's flat salt floor, a known venue. */
export const RESET_ON_SALT = ([speed, n1]) => {
  const g = window.__pw, v = g.player, z = -1200;
  const x = g.terrain.canyonX(z);
  v.pos.set(x, g.terrain.height(x, z) + 3, z);
  v.yaw = 0; v.pitch = v.roll = 0; v.yawRate = v.pitchRate = v.rollRate = 0;
  v.vel.set(0, 0, -speed); v._FLf = v._FLr = 0; v.n1 = n1; v.hitT = 0; v.impact = 0;
  if (g.input._kSteer !== undefined) g.input._kSteer = 0;
  g.terrain.update(x, z);
};
