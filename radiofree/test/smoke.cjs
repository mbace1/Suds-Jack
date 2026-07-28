#!/usr/bin/env node
// Radio Free Helsinki — the gate.
//
//   node radiofree/test/smoke.cjs                    (serves ./ on a free port)
//   RFH_URL=https://mbace1.github.io/Suds-Jack/radiofree/ node radiofree/test/smoke.cjs
//
// Drives a real browser. Prefers Playwright (NODE_PATH=/opt/node22/lib/node_modules
// picks up a global install); falls back to puppeteer / puppeteer-core + CHROMIUM,
// the same convention `plates.cjs` uses.
//
// What it is FOR: this app has no build step, so nothing else notices when a
// cache token drifts, a module stops being precached, an art key stops
// existing, or a shot class quietly stops answering the interface main.js
// drives it through. Every check below is something that has actually broken.

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RF = path.join(ROOT, 'radiofree');

let fails = 0, checks = 0;
const ok = (name, cond, detail = '') => {
  checks++;
  if (cond) { console.log('  ok   ' + name); return true; }
  fails++;
  console.log('  FAIL ' + name + (detail ? '\n         ' + detail : ''));
  return false;
};

// ── a static server, so the gate does not depend on the network ──────────
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json', '.css': 'text/css',
};
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('nope'); return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, port: srv.address().port }));
  });
}

async function launch() {
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 400, height: 840 } });
    return { browser, page, kind: 'playwright' };
  } catch { /* fall through */ }
  let pptr;
  try { pptr = require('puppeteer'); }
  catch {
    try { pptr = require('puppeteer-core'); }
    catch { return null; }
  }
  const opts = { args: ['--no-sandbox'] };
  if (process.env.CHROMIUM) opts.executablePath = process.env.CHROMIUM;
  const browser = await pptr.launch(opts);
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 840 });
  return { browser, page, kind: 'puppeteer' };
}

// ── the checks that never open a browser ─────────────────────────────────
function staticChecks() {
  console.log('\nshell');
  const sw = fs.readFileSync(path.join(RF, 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(RF, 'index.html'), 'utf8');

  const v = (sw.match(/const V = `\?v=(\d+)`/) || [])[1];
  const ver = (sw.match(/const VERSION = 'v(\d+)'/) || [])[1];
  ok('sw.js VERSION and V agree', v && ver && v === ver, `VERSION=v${ver} V=?v=${v}`);

  // Only radiofree's own tokens; ../hub and ../toko keep their own versions.
  const own = [...html.matchAll(/(?:src|href)="(?:js|sw)[^"]*\?v=(\d+)"/g)].map(m => m[1]);
  ok('index.html tokens match sw.js', own.length > 0 && own.every(t => t === v),
     `page=${[...new Set(own)].join(',')} sw=${v}`);

  const modules = fs.readdirSync(path.join(RF, 'js')).filter(f => f.endsWith('.js'))
    .map(f => f.replace(/\.js$/, ''));
  // the LIST THAT MAPS TO ./js/ — sw.js also spreads a list of ../toko
  // modules, and matching the first spread grades this against the wrong one
  const jsSpread = sw.match(/\.\.\.\[([^\]]+)\]\s*\n?\s*\.map\([^)]*`\.\/js\//);
  const listed = (jsSpread || [, ''])[1]
    .split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean);
  const missing = modules.filter(m => !listed.includes(m));
  const dead = listed.filter(m => !modules.includes(m));
  ok('the precache names every module in js/', missing.length === 0, 'missing: ' + missing.join(', '));
  ok('the precache names no module that is gone', dead.length === 0, 'dead: ' + dead.join(', '));

  // Every leaf import has to carry the same token — a module fetched under two
  // tokens is loaded TWICE, and two copies of PixelScreen is not one class.
  const bad = [];
  for (const f of fs.readdirSync(path.join(RF, 'js'))) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(RF, 'js', f), 'utf8');
    for (const m of src.matchAll(/from '\.\/[\w.]+\.js\?v=(\d+)'/g)) {
      if (m[1] !== v) bad.push(`${f} → ?v=${m[1]}`);
    }
  }
  ok('every local import carries the shipping token', bad.length === 0, bad.join('; '));

  const wire = JSON.parse(fs.readFileSync(path.join(RF, 'wire.json'), 'utf8'));
  ok('wire.json parses and carries bulletins',
     Array.isArray(wire.stories) && wire.stories.length > 0,
     `${wire.stories && wire.stories.length} stories`);
}

// The rotation is a pure function over the wire, so it is checked here rather
// than by publishing six fixture wires and reloading a browser at each one.
// The three behaviours below are the whole contract an external author leans
// on when they file a bulletin or archive one.
async function rotationChecks() {
  console.log('\nrotation');
  const { rotate, validateWire } = await import(
    'file://' + path.join(RF, 'js', 'wire.js'));

  const S = (id, sector, filed, retired) => ({
    id, sector, visual: 'chart', broll: 'katu',
    ...(filed ? { filed } : {}), ...(retired !== undefined ? { retired } : {}),
  });
  const sectors = [{ id: 'GAMING' }, { id: 'INDUSTRY' }, { id: 'DEFENCE' }];
  const wire = { sectors, stories: [
    S('back-a', 'GAMING'), S('back-b', 'DEFENCE'),
    S('mon-def', 'DEFENCE', '2026-07-27'), S('mon-game', 'GAMING', '2026-07-27'),
    S('tue-ind', 'INDUSTRY', '2026-07-28'),
    S('gone', 'GAMING', '2026-07-28', true),
  ] };

  const r = rotate(wire);
  ok('a bulletin filed today lands at the TOP',
     r.shown[0].id === 'tue-ind', r.shown.map(x => x.id).join(' → '));
  ok('inside one day the bands keep their order',
     r.shown[1].id === 'mon-game' && r.shown[2].id === 'mon-def',
     r.shown.map(x => x.id).join(' → '));
  ok('undated bulletins are the backlog and sit at the bottom, in file order',
     r.shown.slice(-2).map(x => x.id).join(',') === 'back-a,back-b',
     r.shown.map(x => x.id).join(' → '));
  ok('a retired bulletin leaves the rotation',
     !r.shown.some(x => x.id === 'gone') && r.archived.includes('gone'));

  const k = rotate({ ...wire, keep: 3 });
  ok('keep cuts from the BOTTOM — the oldest go first',
     k.shown.length === 3 && k.archived.includes('back-b') && k.archived.includes('back-a'),
     k.shown.map(x => x.id).join(' → ') + ' | archived ' + k.archived.join(','));

  const mini = (over) => validateWire({
    version: 1,
    sectors: [{ id: 'GAMING', freq: '1', call: 'K' }],
    stories: [{ id: 'x', sector: 'GAMING', visual: 'chart', broll: 'katu', ...over }],
    copy: { en: {}, fi: {}, ja: {} },
  });
  ok('a filing date that is not a real date is rejected',
     mini({ filed: '2026-02-31' }).errors.some(e => /filed must be/.test(e)));
  ok('retiring every bulletin is an error, not an empty feed',
     mini({ retired: true }).errors.some(e => /empty broadcast/.test(e)));
}

async function main() {
  console.log('Radio Free Helsinki — gate');
  staticChecks();
  await rotationChecks();

  const drv = await launch();
  if (!drv) {
    console.log('\nno browser driver (playwright / puppeteer) — static checks only');
    process.exit(fails ? 1 : 0);
  }
  const { browser, page } = drv;

  let srv = null, base = process.env.RFH_URL;
  if (!base) {
    const s = await serve();
    srv = s.srv;
    base = `http://127.0.0.1:${s.port}/radiofree/`;
  }

  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));

  const go = (fn, ...a) => page.evaluate(fn, ...a);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  await page.goto(base, { waitUntil: 'networkidle0' in page ? 'networkidle0' : 'networkidle' })
    .catch(() => page.goto(base));
  await wait(900);

  // The wire is fetched ON TUNE-IN, not at boot, so that tuning in is
  // genuinely tuning in — read it after, or it always reports 'none'.
  await go(() => window.__rfh.debug.tuneIn());
  await wait(1400);

  console.log('\nthe wire');
  const wire = await go(() => window.__rfh.debug.wire());
  // 'network' is what loadWire() installs on a good fetch; 'off-air' is the
  // baked-in station identification, and shipping that silently is the whole
  // reason this check exists.
  ok('the wire is FETCHED, not the baked-in station identification',
     wire.source === 'network', JSON.stringify(wire));
  ok('the wire validated clean', !wire.errors || wire.errors.length === 0,
     (wire.errors || []).join('; '));

  const rot = await go(() => __rfh.debug.rotation());
  const onScreen = await go(() =>
    [...document.querySelectorAll('.post:not(.sign-off)')].map(a => a.dataset.id));
  ok('the feed is exactly what the rotation says aired, in that order',
     rot.onAir.map(x => x.id).join(',') === onScreen.join(','),
     `rotation ${rot.onAir.length} vs feed ${onScreen.length}`);
  ok('nothing archived is on screen',
     !rot.archived.some(id => onScreen.includes(id)), rot.archived.join(','));

  console.log('\nthe cut package');
  ok('a post opens on its own footage',
     (await go(() => __rfh.debug.shot())).type === 'broll');

  const seen = new Set();
  for (let i = 0; i < 34; i++) {
    seen.add((await go(() => __rfh.debug.shot())).type);
    await wait(500);
  }
  ok('the frame really cuts between footage and the studio',
     seen.has('broll') && seen.has('anchor'), [...seen].join(','));

  const canvases = () => go(() => document.querySelectorAll('canvas.anchor-cv').length);
  ok('one studio canvas alive, not one per post', (await canvases()) === 1,
     String(await canvases()));

  // A fixed 9:16 buffer under object-fit: cover took the station chrome off
  // both edges on any phone taller than 16:9 — which is most of them.
  const fit = await go(() => {
    const c = document.querySelector('canvas.anchor-cv');
    const r = c.getBoundingClientRect();
    return { buf: c.width / c.height, box: r.width / r.height };
  });
  ok('the studio buffer matches the frame, so nothing is cropped',
     Math.abs(fit.buf - fit.box) < 0.02, JSON.stringify(fit));

  // The typewriter is OFF on this build — the copy is set, not typed — so
  // reader.update() only ever returns a decaying zero. main.js warns about
  // exactly this: with nothing else, Toko's face sits dead and nothing notices.
  // Measured off the value, not the pixels; the blink and the sway move that
  // band too, so a pixel diff cannot tell a reading face from a still one.
  await go(() => __rfh.debug.cutTo('anchor'));
  await wait(700);
  const mouth = [];
  for (let i = 0; i < 80; i++) { mouth.push(await go(() => __rfh.debug.mouth())); await wait(70); }
  const peak = Math.max(...mouth), shut = mouth.filter(v => v < 0.05).length;
  ok('Toko is reading — the mouth opens', peak > 0.25, `peak ${peak.toFixed(3)}`);
  ok('...and shuts between phrases, so it is speech and not chewing',
     shut >= 3, `${shut}/${mouth.length} closed frames`);

  console.log('\ndecode');
  await go(() => __rfh.debug.cutTo('broll'));
  await go(() => __rfh.debug.toggleDecode());
  await wait(400);
  ok('DECODE cuts home to the shot that decodes',
     (await go(() => __rfh.debug.shot())).type === 'anchor');
  await wait(9000);
  ok('DECODE holds it — the cut stops while the plain reading is up',
     (await go(() => __rfh.debug.shot())).type === 'anchor');
  const plain = await go(() => document.querySelectorAll('.post.live .plain').length);
  ok('the plain readings are showing', plain > 0, String(plain));

  console.log('\nstate');
  await go(() => __rfh.debug.go(1));
  await wait(900);
  ok('the next post opens on its own footage',
     (await go(() => __rfh.debug.shot())).type === 'broll');
  ok('the studio canvas is released when a post goes idle',
     (await canvases()) <= 1, String(await canvases()));

  await go(() => __rfh.debug.go(-1));
  await wait(900);
  const back = await go(() => ({ shot: __rfh.debug.shot().type, dec: __rfh.state.decoded }));
  ok('coming back to a decoded post re-opens on the studio',
     back.shot === 'anchor' && back.dec, JSON.stringify(back));

  await go(() => __rfh.debug.setLang('fi'));
  await wait(1200);
  ok('a language switch rebuilds the feed with the machinery intact',
     !!(await go(() => __rfh.debug.shot())));
  await go(() => __rfh.debug.setLang('en'));
  await wait(600);

  // The decoded set persists across visits, so once bulletins start being
  // archived a returning listener's set outgrows the feed — the sign-off has to
  // count against what AIRED or it reads "14/12".
  console.log('\nsign-off');
  await go((n) => __rfh.debug.go(n), 99);
  await wait(1200);
  const off = await go(() => {
    const head = document.querySelector('.post.sign-off .tally-head');
    return { state: __rfh.state, head: head ? head.textContent : null };
  });
  ok('the sign-off closes the feed', !!(off.state && off.state.signoff),
     JSON.stringify(off.state));
  const m = (off.head || '').match(/(\d+)\s*\/\s*(\d+)/);
  ok('the tally counts against what aired', m && Number(m[1]) <= Number(m[2]),
     off.head);

  console.log('\nconsole');
  ok('zero console errors', errs.length === 0, errs.join(' | '));

  console.log(`\n${checks - fails}/${checks} passed`);
  await browser.close();
  if (srv) srv.close();
  process.exit(fails ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
