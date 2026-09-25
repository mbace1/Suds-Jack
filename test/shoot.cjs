#!/usr/bin/env node
// Photograph every cabinet on the floor, so CI can SEE.
//
// CLAUDE.md says it twice, in two lanes: "a gate that certifies *works*
// cannot see *looks*, so an art change ends in a screenshot, never in a green
// suite". Four Kindling art bugs passed every gate. The band-brightness gate
// measured the wrong thing twice. Powder shipped two turbine discs orbiting
// the hull with every gate green. This is the missing half: it does not
// assert anything about how a game looks, it RENDERS each one and leaves the
// pictures where a person — or contact.cjs — can compare them.
//
//   node test/shoot.cjs --out shots/head            # everything
//   node test/shoot.cjs --out shots/x --only powder,turf
//
// It is deliberately incapable of failing a build. A cabinet that will not
// boot is recorded as `error`, one that boots to a flat colour as `blank`,
// and the run still exits 0 — a screenshot harness that goes red on a game
// somebody else broke is a screenshot harness people turn off.
//
// HONEST LIMITS, so nobody reads more into a sheet than is in it:
//
//  * A `play` shot is not proof of play. The harness clicks a start control
//    and presses two keys; where that does not take, the second shot is the
//    title card again. `started` in report.json says which control it found,
//    and `null` means it found none — read that before concluding a game is
//    broken because its two frames match.
//  * It photographs ONE moment on a fixed delay, so anything animated differs
//    run to run. That is why contact.cjs has a noise floor and why the sheet
//    is evidence for a person rather than a pass mark.
//  * Everything is 960x540 on SwiftShader. It will not catch a fault that
//    only appears on real hardware, at another size, or under a thumb.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const argv = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
// --root lets one copy of this script photograph ANOTHER checkout, which is
// the whole comparison: CI shoots the base commit and the head commit with
// the same harness, so a difference in the pictures is a difference in the
// games and never a difference in how they were photographed.
const ROOT = path.resolve(argv('--root', path.join(__dirname, '..')));
const OUT = path.resolve(argv('--out', path.join(ROOT, 'shots')));
const ONLY = (argv('--only', '') || '').split(',').filter(Boolean);
const WIDTH = +argv('--width', 960), HEIGHT = +argv('--height', 540);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.css': 'text/css', '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };

// ---------------------------------------------------------------- recipes
//
// A cabinet is a game, not a page: most of them open on a title card, and a
// contact sheet of twenty-three title cards would show nothing that matters.
// So each gets a short script. `keys` are pressed in order with a beat
// between; `shots` names what to capture and when. Anything not listed here
// gets DEFAULT, which is the honest general case — load it, look at it, press
// the two keys that start almost every game here, look again.
const DEFAULT = { settle: 3200, keys: ['Enter', 'Space'], play: 3800 };
const RECIPE = {
  // the arcade itself: no game to start, and the floor is the point
  '_hub':      { settle: 3000, keys: [], play: 0, url: 'index.html' },
  brand:       { settle: 2600, keys: [], play: 0 },
  gameoflife:  { settle: 2600, keys: ['Enter'], play: 3000 },
  // built SPA: its router only answers on the production base path
  kindling:    { settle: 4200, keys: [], play: 0, url: 'Suds-Jack/kindling/' },
  radiofree:   { settle: 3000, keys: [], play: 2500 },
  eyetest:     { settle: 2600, keys: [], play: 0 },
  // three.js racers and shooters: heavier boot, and worth a longer look once
  // they are running because the whole point is what is moving
  powder:      { settle: 4200, keys: ['Enter'], play: 5000, query: 'q=low' },
  tokodrop:    { settle: 4000, keys: ['Enter', 'Space'], play: 4500 },
  hyperdagger: { settle: 4000, keys: ['Enter', 'Space'], play: 4500 },
  dropcabal:   { settle: 3600, keys: ['Enter', 'Space'], play: 4000 },
  flowsnow:    { settle: 4000, keys: ['Enter', 'Space'], play: 4500 },
  sudsjack:    { settle: 3600, keys: ['Enter', 'Space'], play: 4000 },
  eeri:        { settle: 4000, keys: [], play: 4000, query: 'skip' },
  turf:        { settle: 3600, keys: ['Enter'], play: 3500 },
  slaykallio:  { settle: 3600, keys: ['Enter'], play: 3500 },
  flashprince: { settle: 3600, keys: ['Enter', 'Space'], play: 4000 },
  skltr:       { settle: 3600, keys: ['Enter', 'Space'], play: 4000 },
  tinyhawk:    { settle: 4000, keys: ['Enter', 'Space'], play: 4500 },
  neonronin:   { settle: 3600, keys: ['Enter', 'Space'], play: 4000 },
};

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, r) => {
      let u;
      try { u = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
      catch { r.writeHead(400); return r.end(); }
      // Pages serves this repo at /Suds-Jack/, not at the root, and Kindling
      // is a built SPA whose router takes its basepath from the build — served
      // anywhere else it renders "Not Found" with every asset loading 200,
      // which is a blank white cabinet and no error anywhere. hub-smoke.cjs
      // serves both for the same reason.
      u = u.replace(/^\/Suds-Jack(?=\/|$)/, '') || '/';
      let f = path.join(ROOT, u);
      if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
      try {
        if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
        if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      } catch { r.writeHead(500); return r.end(); }
      r.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(r);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

/** Playwright's own Chromium, else any chromium-* the sandbox pins. */
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

/**
 * Half these games import three from jsDelivr and half carry a local vendor/
 * copy. CI has a network and a sandbox does not, so route the CDN to a local
 * three when one resolves and leave it alone when none does — the run then
 * behaves the same in both places instead of silently rendering black pages
 * offline.
 */
function localThree() {
  try { const m = require.resolve('three'); const i = m.lastIndexOf('/build/'); return i > 0 ? m.slice(0, i) : null; }
  catch { return null; }
}
async function routeThree(page) {
  const three = localThree();
  if (!three) return false;
  await page.route('**/cdn.jsdelivr.net/npm/three@*/**', r => {
    const u = r.request().url();
    const rel = u.includes('/build/') ? 'build/' + u.split('/build/')[1]
      : u.includes('/examples/jsm/') ? 'examples/jsm/' + u.split('/examples/jsm/')[1] : null;
    if (!rel) return r.abort();
    const f = path.join(three, rel.split('?')[0]);
    if (!fs.existsSync(f)) return r.abort();
    r.fulfill({ path: f, contentType: MIME[path.extname(f)] || 'text/javascript' });
  });
  return true;
}

/**
 * Is this picture one flat colour?
 *
 * The failure this catches is the one toko-live actually shipped and wrote up
 * in its own source: "the shell is static HTML, so the page looked alive and
 * drew nothing at all". A page that renders nothing is not an error — nothing
 * threw — and no assertion in any gate here would notice. Sampling a grid and
 * counting distinct colours does.
 */
function flatness(png) {
  const seen = new Set();
  const { width: w, height: h, data } = png;
  for (let y = 4; y < h; y += 11) for (let x = 4; x < w; x += 11) {
    const i = (y * w + x) * 4;
    seen.add((data[i] >> 3) + ',' + (data[i + 1] >> 3) + ',' + (data[i + 2] >> 3));
    if (seen.size > 12) return seen.size;    // plenty going on; stop counting
  }
  return seen.size;
}

async function main() {
  const { GAMES } = await import('file://' + path.join(ROOT, 'hub', 'games.js'));
  const { PNG } = require('pngjs');
  fs.mkdirSync(OUT, { recursive: true });

  const floor = GAMES.filter(g => g.live !== false && g.inRepo && g.path)
    .filter(g => !ONLY.length || ONLY.includes(g.id));
  // the arcade floor itself is a cabinet for this purpose: it is the page that
  // breaks when a catalogue edit goes wrong, which is a thing that has happened
  const targets = [{ id: '_hub', path: '' }, ...floor]
    .filter(g => !ONLY.length || ONLY.includes(g.id));

  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch({
    executablePath: chromePath(),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox',
           '--autoplay-policy=no-user-gesture-required'],
  });
  const report = [];

  for (const g of targets) {
    const r = { ...DEFAULT, ...(RECIPE[g.id] || {}) };
    const row = { id: g.id, shots: [], errors: [], status: 'ok' };
    const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
    const page = await ctx.newPage();
    page.on('pageerror', e => row.errors.push(String(e.message || e).slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') row.errors.push(m.text().slice(0, 200)); });
    try {
      await routeThree(page);
      const url = `${base}/${r.url || g.path}${r.query ? (g.path && g.path.includes('?') ? '&' : '?') + r.query : ''}`;
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      // every game here parks a boot animation or a title card in front of the
      // thing worth photographing, so the sting is marked seen rather than sat
      // through; failure is fine, most cabinets have no such key
      await page.evaluate(() => {
        try { localStorage.setItem('tokoSting', '1'); localStorage.setItem('sudsJackHubSeen', '{}'); } catch { /* private mode */ }
      }).catch(() => {});
      await page.waitForTimeout(r.settle);
      const shot = async (name) => {
        const file = path.join(OUT, `${g.id}--${name}.png`);
        await page.screenshot({ path: file });
        const png = PNG.sync.read(fs.readFileSync(file));
        row.shots.push({ name, file: path.basename(file), colours: flatness(png) });
      };
      await shot('boot');
      if (r.keys.length || r.click !== false) {
        // Pressing Enter does not start most of these. Some listen for a key,
        // some have a real DOM button (TURF's START, and its "play" frame was
        // the title card until this existed), and some only take a pointer on
        // the canvas. Try the button first because it is unambiguous, fall
        // back to the canvas, then send the keys anyway — they are harmless
        // once a game is running and they are the only way into the rest.
        const clicked = await page.evaluate(() => {
          // NOT anchored, and punctuation is stripped first: the house style
          // is bracketed labels like "[ BEGIN ]" and "> PLAY", and an anchored
          // match on the raw text misses every one of them.
          const wanted = /\b(start|play|begin|drop in|new game|enter)\b/i;
          const els = [...document.querySelectorAll('button, [role="button"], a.btn, .btn, #start, #play')];
          const hit = els.find(e => {
            const r = e.getBoundingClientRect();
            const t = (e.textContent || '').replace(/[[\]>·_—-]/g, ' ').trim();
            return r.width > 8 && r.height > 8 && t.length < 40 && wanted.test(t);
          });
          if (hit) { hit.click(); return (hit.textContent || '').trim().slice(0, 24); }
          return null;
        }).catch(() => null);
        if (clicked) row.started = `button:${clicked}`;
        else {
          const c = await page.$('canvas');
          if (c) { await c.click({ position: { x: WIDTH / 4, y: HEIGHT / 2 } }).catch(() => {}); row.started = 'canvas'; }
        }
        await page.waitForTimeout(400);
        for (const k of r.keys) { await page.keyboard.press(k).catch(() => {}); await page.waitForTimeout(450); }
        await page.waitForTimeout(r.play);
        await shot('play');
      }
      const worst = Math.min(...row.shots.map(s => s.colours));
      if (worst <= 2) row.status = 'blank';
    } catch (e) {
      row.status = 'error';
      row.errors.push(String(e.message || e).slice(0, 300));
    }
    await ctx.close();
    report.push(row);
    const mark = row.status === 'ok' ? '·' : row.status === 'blank' ? 'BLANK' : 'ERROR';
    console.log(`  ${mark} ${g.id} (${row.shots.length} shots${row.errors.length ? `, ${row.errors.length} console/page errors` : ''})`);
  }

  await browser.close();
  srv.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  const bad = report.filter(r => r.status !== 'ok');
  console.log(`\n${report.length} cabinets, ${report.reduce((n, r) => n + r.shots.length, 0)} shots -> ${OUT}`);
  if (bad.length) console.log('did not render: ' + bad.map(b => `${b.id}(${b.status})`).join(' '));
  // exits 0 on purpose — see the header
}

main().catch(e => { console.error('shoot.cjs failed to start:', e); process.exit(1); });
