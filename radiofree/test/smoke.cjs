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

  // The daily job writes a new episode every morning and never touches code, so
  // the worker has to treat the whole `wire/` directory as content. Served
  // cache-first, `wire/index.json` is a list of broadcasts frozen on the day the
  // app was installed — the job would run, the file would land, and no installed
  // copy would ever learn an episode existed.
  const isWire = (sw.match(/const isWire = \(u\) => ([\s\S]*?);\n/) || [, ''])[1];
  ok('the worker treats every wire/ file as content, not shell',
     /wire\.json/.test(isWire) && /\/wire\//.test(isWire), isWire.replace(/\s+/g, ' '));
  ok('the precache names no dated episode',
     !/wire\/\d{4}-\d{2}-\d{2}\.json/.test(sw),
     'a named episode list is a list of yesterdays once the job runs daily');
  ok('install caches whatever the index points at', /precacheNewest/.test(sw));

  // The deployed site is a curated root with no `.github` in it, and the gate
  // runs there too (against gh-pages, before a deploy is believed). Absent
  // entirely = a site checkout, so there is nothing to grade; present but
  // missing the job = somebody deleted the job.
  const wf = path.join(ROOT, '.github', 'workflows', 'radiofree-wire.yml');
  if (fs.existsSync(path.join(ROOT, '.github'))
      && ok('the daily job exists', fs.existsSync(wf))) {
    const y = fs.readFileSync(wf, 'utf8');
    ok('it runs the generator and then the app\'s own validator',
       y.includes('tools/generate-wire.mjs') && y.includes('tools/validate-wire.mjs'));
    ok('it publishes to gh-pages, which is the branch a listener reads',
       /push origin gh-pages/.test(y));
  }
}

// The generator writes the copy nobody proof-reads before it airs, so the two
// editorial rules that would fail SILENTLY are checked here over fixtures: copy
// that reads perfectly and is either undecodable or is still wearing the real
// company's name off the source headline.
async function generatorChecks() {
  console.log('\ngenerator');
  const g = await import('file://' + path.join(RF, 'tools', 'generate-wire.mjs'));

  const rss = `<rss><channel>
    <item><title>Nokia Oyj cuts 340 jobs at its Espoo site</title><link>x</link>
      <description><![CDATA[The review was run by Deloitte &amp; co.]]></description></item>
  </channel></rss>`;
  const items = g.parseFeed(rss, 'fixture');
  ok('the feed parser reads a title, a link and an unescaped summary',
     items.length === 1 && items[0].title.startsWith('Nokia Oyj')
     && items[0].summary.includes('Deloitte & co'), JSON.stringify(items[0] || {}));

  const names = g.sourceNames(items);
  // it led the headline, which is where a company name usually is — the first
  // draft of this check skipped the first word and let exactly this through
  ok('a name that OPENS the headline is still caught', names.includes('Nokia'), names.join(', '));
  ok('a place is not a name', !names.some(n => /Espoo/.test(n)), names.join(', '));

  const story = (id, tech, line, lineFi, lineJa) => ({
    id, visual: 'chart2', broll: 'harbour',
    en: { slug: 'S', head: 'h', lines: [line], technique: tech, decodeNote: 'n', tell: 't' },
    fi: { slug: 'S', head: 'h', lines: [lineFi], technique: tech + ' FI', decodeNote: 'n', tell: 't' },
    ja: { slug: 'S', head: 'h', lines: [lineJa], technique: tech + ' JA', decodeNote: 'n', tell: 't' },
  });
  const two = '{{a|the first plain reading}} and {{b|the second}}';
  const bad = g.assemble({ stories: [
    story('a', 'AGENTLESS PASSIVE', `Nokia ${two}.`, `Nokia ${two}.`, `Nokia ${two}。`),
    story('b', 'AGENTLESS PASSIVE', '{{one|only one span}}.', '{{one|vain yksi}}.', '{{一|ひとつだけ}}。'),
  ] }, '2026-07-31');
  const v = g.check(bad, names);
  ok('a lifted company name is an error, not a warning',
     v.errors.some(e => /"Nokia" is lifted/.test(e)), v.errors.join(' | ').slice(0, 120));
  ok('a bulletin with one decode span is rejected',
     v.errors.some(e => /copy\.en\.b: 1 decode span/.test(e)));
  ok('two bulletins may not share a technique',
     v.errors.some(e => /already used by a/.test(e)));

  const good = g.assemble({ stories: [
    story('a', 'AGENTLESS PASSIVE', `Rack & Ruin Oy ${two}.`, `Rack & Ruin Oy ${two}.`, `Rack & Ruin Oy ${two}。`),
    story('b', 'MISSING DENOMINATOR', `Piggies and Birds Inc ${two}.`, `Piggies and Birds Inc ${two}.`, `Piggies and Birds Inc ${two}。`),
  ] }, '2026-07-31');
  const vg = g.check(good, names);
  ok('an invented cast passes', vg.ok, vg.errors.join(' | '));
  ok('the episode it assembles is dated and filed',
     good.date === '2026-07-31' && good.stories.every(s => s.filed === '2026-07-31'));
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

// The clip renderer drives the real app, so recording one in here would cost
// fifteen seconds a bulletin to re-prove what the browser block already
// proved. What is graded instead is the part that has no other witness: the
// frame arithmetic, and that the renderer loads the app rather than redrawing
// it — a second renderer would go on looking right long after the app changed.
async function clipChecks() {
  console.log('\nclips');
  const src = fs.readFileSync(path.join(RF, 'tools', 'render-clips.mjs'), 'utf8');
  const r = await import('file://' + path.join(RF, 'tools', 'render-clips.mjs'));

  const { view, size, scale } = r.FRAME;
  ok('the frame is 1080×1920', size.width === 1080 && size.height === 1920);
  ok('the viewport and the scale multiply out to the frame',
     Math.round(view.width * scale) === size.width && Math.round(view.height * scale) === size.height,
     `${view.width}×${view.height} × ${scale.toFixed(3)}`);

  const d = r.args([]);
  ok('a clip decodes by default — the hold is the point',
     d.decode === true && d.cut > 0 && d.cut < d.seconds, JSON.stringify(d));
  const c = r.args(['--no-decode', '--seconds', '20', '--cut', '5', '--ids', 'a, b']);
  ok('the timeline and the roster are settable',
     c.decode === false && c.seconds === 20 && c.cut === 5 && c.ids.join(',') === 'a,b',
     JSON.stringify(c));

  // the sidecars. A caption file whose cues drift is worse than none — the
  // platform shows the wrong line over the right picture with total confidence
  const meta = { head: 'A headline', slug: 'S', technique: 'PRECISION AS PROOF',
                 tell: 'Ask how it was measured.', lines: ['One.', 'Two.'] };
  const srt = r.captions(meta, { ident: 1.1, body: 12, card: 2.6 });
  const times = [...srt.matchAll(/(\d\d):(\d\d):(\d\d),(\d\d\d) --> (\d\d):(\d\d):(\d\d),(\d\d\d)/g)]
    .map(m => [Number(m[3]) + Number(m[4]) / 1000, Number(m[7]) + Number(m[8]) / 1000]);
  ok('the captions cover every line plus both stingers', times.length === 5,
     `${times.length} cues`);
  ok('the cues run forwards and do not overlap',
     times.every(([a, b], i) => b > a && (i === 0 || Math.abs(a - times[i - 1][1]) < 0.002)),
     JSON.stringify(times));
  ok('the last cue is the tell — the only thing worth taking away',
     srt.trim().endsWith(meta.tell), srt.trim().slice(-60));

  const post = r.postText(meta, { date: '2026-07-31', lang: 'en' });
  ok('the post text carries the head, the technique and the tell',
     post.includes(meta.head) && post.includes(meta.technique) && post.includes(meta.tell));
  ok('...and says what the station is',
     /real events · invented names · real techniques/i.test(post));

  ok('it records the app, in clip framing', /\?vertical/.test(src));
  ok('it asks the app which bulletins aired, not the wire file',
     /debug\.stories\(\)/.test(src));

  const wf = path.join(ROOT, '.github', 'workflows', 'radiofree-clips.yml');
  if (fs.existsSync(path.join(ROOT, '.github'))
      && ok('the clip job exists', fs.existsSync(wf))) {
    const y = fs.readFileSync(wf, 'utf8');
    ok('it records the live site, not a checkout', /--url https:\/\//.test(y));
    ok('it uploads the clips rather than committing them',
       /upload-artifact/.test(y) && !/git commit/.test(y));
  }
}

async function main() {
  console.log('Radio Free Helsinki — gate');
  staticChecks();
  await rotationChecks();
  await generatorChecks();
  await clipChecks();

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
  // 'episode' is a dated broadcast out of wire/, 'network' the single-file
  // fallback for a shell cached before episodes existed, 'off-air' the baked-in
  // station identification — and shipping that silently is why this check is here.
  ok('the wire is FETCHED, not the baked-in station identification',
     wire.source === 'episode' || wire.source === 'network', JSON.stringify(wire));
  ok('a dated episode is what actually played', wire.source === 'episode',
     JSON.stringify(wire));
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

  // ── episodes ─────────────────────────────────────────────────────
  console.log('\nepisodes');
  const eps = await go(() => ({ list: __rfh.debug.episodes(), at: __rfh.debug.episode() }));
  ok('the index lists more than one morning', eps.list.length >= 2, JSON.stringify(eps.list));
  ok('no date asked for plays the NEWEST', eps.at === eps.list[0], JSON.stringify(eps));
  ok('the archive picker is on screen with a choice to make',
     await go(() => { const a = document.getElementById('archive');
                      return !!a && !a.hidden && a.querySelectorAll('option').length >= 2; }));

  console.log('\nthe cut package');
  ok('a post opens on its own footage',
     (await go(() => __rfh.debug.shot())).type === 'broll');

  const seen = new Set();
  for (let i = 0; i < 34; i++) {
    seen.add((await go(() => __rfh.debug.shot())).type);
    await wait(500);
  }
  ok('the frame cuts through all three registers — footage, studio, graphic',
     seen.has('broll') && seen.has('anchor') && seen.has('graphic'),
     [...seen].join(','));

  // Both drawn shots are lazy, and the graphic doubles the exposure: two
  // canvases per post across seventeen posts is the same wall from further off.
  const canvases = () => go(() =>
    document.querySelectorAll('canvas.anchor-cv, canvas.graphic-cv').length);
  ok('at most one post owns drawn canvases', (await canvases()) <= 2,
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

  // ── the sets, and the camera HUD ─────────────────────────────────
  // Toko does not read every bulletin from the same desk. The choice is
  // seeded off the post index and must be STABLE: scrolling back to a
  // bulletin has to find it in the same place, on the same night.
  const sets = [];
  for (let i = 0; i < 6; i++) {
    await go(() => __rfh.debug.cut('anchor'));
    await wait(120);
    sets.push(await go(() => ({ id: __rfh.state.id, set: __rfh.debug.anchorSet() })));
    await go(() => __rfh.debug.go(1));
    await wait(700);
  }
  ok('some bulletins are read on location, not from the desk',
     sets.some(x => x.set === 'street') && sets.some(x => x.set === 'booth'),
     sets.map(x => `${x.id}:${x.set}`).join(' '));

  await go((n) => __rfh.debug.go(-n), 6);
  await wait(900);
  await go(() => __rfh.debug.cut('anchor'));
  await wait(150);
  const again = await go(() => ({ id: __rfh.state.id, set: __rfh.debug.anchorSet() }));
  ok('a bulletin keeps its set when you come back to it',
     !!again.set && again.set === (sets.find(x => x.id === again.id) || {}).set,
     JSON.stringify(again));

  const hud = () => go(() => {
    const h = document.querySelector('.post.live .pkg-hud');
    return h && { rec: h.querySelector('.hud-rec').textContent,
                  cam: h.querySelector('.hud-cam').textContent,
                  tc: h.querySelector('.hud-tc').textContent };
  });
  const h1 = await hud();
  await wait(900);
  const h2 = await hud();
  ok('the live post carries a camera HUD', !!h1 && /REC|DECODE/.test(h1.rec), JSON.stringify(h1));
  ok('the timecode is running', h1 && h2 && h1.tc !== h2.tc, `${h1 && h1.tc} → ${h2 && h2.tc}`);
  await go(() => __rfh.debug.cut('graphic'));
  await wait(200);
  const h3 = await hud();
  ok('the camera number follows the cut', h3 && h3.cam !== h2.cam,
     `${h2 && h2.cam} → ${h3 && h3.cam}`);

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
  ok('DECODE cuts home to the graphic — the shot that decodes',
     (await go(() => __rfh.debug.shot())).type === 'graphic');
  await wait(9000);
  ok('DECODE holds it — the cut stops while the plain reading is up',
     (await go(() => __rfh.debug.shot())).type === 'graphic');
  // The panels mix green -> amber on a 0..1 `decode`, which is what re-bases
  // the chart and hollows the tower. If that stays 0 the picture is still
  // arguing the spin while the words next to it have been struck out.
  const dk = await go(() => {
    const p = __rfh.debug.pkg && __rfh.debug.pkg();
    return p && p.graphic ? p.graphic.decodeK : null;
  });
  ok('the graphic itself decodes, not just the words', dk !== null && dk > 0.9,
     String(dk));
  const plain = await go(() => document.querySelectorAll('.post.live .plain').length);
  ok('the plain readings are showing', plain > 0, String(plain));

  console.log('\nstate');
  await go(() => __rfh.debug.go(1));
  await wait(900);
  ok('the next post opens on its own footage',
     (await go(() => __rfh.debug.shot())).type === 'broll');
  ok('the drawn canvases are released when a post goes idle',
     (await canvases()) <= 2, String(await canvases()));

  await go(() => __rfh.debug.go(-1));
  await wait(900);
  const back = await go(() => ({ shot: __rfh.debug.shot().type, dec: __rfh.state.decoded }));
  ok('coming back to a decoded post re-opens on the graphic',
     back.shot === 'graphic' && back.dec, JSON.stringify(back));

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

  // ── clean mode ───────────────────────────────────────────────────
  // The clip export loads `?clean`, and the contract is not that DECODE is
  // hidden — it is that DECODE was never built. Checked against the DOM and
  // against the page's own text, because a struck span that is display:none
  // still puts its words in textContent.
  console.log('\ndate routing');
  for (const [q, want, label] of [
    ['?date=' + eps.list[1], eps.list[1], 'an older date plays that morning'],
    ['?date=1999-01-01', eps.list[0], 'an unknown date falls back to the newest, never a blank screen'],
  ]) {
    const dp = await browser.newPage();
    const derr = [];
    dp.on('pageerror', e => derr.push(e.message));
    await dp.goto(base + q, { waitUntil: 'load' });
    await wait(600);
    await dp.evaluate(() => window.__rfh.debug.tuneIn());
    await wait(1600);
    const got = await dp.evaluate(() => ({ at: __rfh.debug.episode(),
                                           posts: document.querySelectorAll('.post').length }));
    ok(label, got.at === want && got.posts > 1, JSON.stringify(got) + ' wanted ' + want);
    ok(label + ' — without throwing', derr.length === 0, derr.join(' | '));
    await dp.close();
  }

  // ── the clip framing ─────────────────────────────────────────────
  // `?vertical` is what a recorder loads. Everything checked here is
  // something that would burn into a video and could not be taken out
  // afterwards: a masthead, a HUB button, a signature badge, a headline
  // clipped at "…", a picture letterboxed inside its own frame.
  console.log('\nvertical');
  const vp = await browser.newPage();
  const verrs = [];
  vp.on('pageerror', e => verrs.push(e.message));
  await vp.goto(base + '?vertical', { waitUntil: 'load' });
  await wait(700);
  await vp.evaluate(() => window.__rfh.debug.tuneIn());
  await wait(1800);
  const vt = await vp.evaluate(() => {
    const shown = (sel) => {
      const e = document.querySelector(sel);
      return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;
    };
    const post = document.querySelector('.post');
    const shot = post.querySelector('.pkg-shot.on .photo');
    const head = post.querySelector('.head');
    return {
      on: !!__rfh.vertical,
      posts: document.querySelectorAll('.post').length,
      chrome: ['.mast', '.rail', '.arcade-home', '.swipe-hint'].filter(shown),
      sig: !!document.querySelector('[class*="signature"]'),
      // the picture must FILL the frame: a canvas sized by height with width
      // auto sat letterboxed, and on the dark plates that read as art
      fill: shot ? shot.getBoundingClientRect().width / post.getBoundingClientRect().width : 0,
      clamp: head ? getComputedStyle(head).webkitLineClamp : 'x',
    };
  });
  ok('?vertical reports itself', vt.on && vt.posts > 1, JSON.stringify(vt.posts));
  ok('no site furniture is in the frame', vt.chrome.length === 0 && !vt.sig,
     vt.chrome.join(', ') + (vt.sig ? ' signature' : ''));
  ok('the picture fills the frame, not a letterbox inside it', vt.fill > 0.99,
     'width ratio ' + vt.fill.toFixed(3));
  ok('the headline is not clipped at an ellipsis',
     vt.clamp === 'none' || vt.clamp === '', vt.clamp);
  // the stingers, driven the way the renderer drives them
  const st = await vp.evaluate(async () => {
    const box = document.getElementById('ident');
    // the fade in is a .28s CSS transition, so sample after it, not during
    const p = window.__rfh.ident({ ms: 900, tell: true, fade: 60 });
    await new Promise(r => setTimeout(r, 600));
    const up = !box.hidden && Number(getComputedStyle(box).opacity) > 0.9;
    const text = box.innerText;
    await p;
    return { up, text, gone: box.hidden };
  });
  ok('the end card comes up and goes away again', st.up && st.gone, JSON.stringify(st.gone));
  ok('...carrying the technique and the tell',
     /[A-Z]{4,}/.test(st.text) && st.text.length > 40, JSON.stringify(st.text).slice(0, 90));

  ok('the clip framing throws nothing', verrs.length === 0, verrs.join(' | '));
  await vp.close();

  console.log('\nclean mode');
  const cp = await browser.newPage();
  const cerrs = [];
  cp.on('pageerror', e => cerrs.push(e.message));
  await cp.goto(base + '?clean', { waitUntil: 'load' });
  await cp.waitForTimeout(700);
  await cp.evaluate(() => window.__rfh.debug.tuneIn());
  await cp.waitForTimeout(1600);
  const cl = await cp.evaluate(() => ({
    on: !!__rfh.clean,
    nodes: document.querySelectorAll('.spun, .plain, .decode-box, .decode-btn').length,
    posts: document.querySelectorAll('.post').length,
    text: document.body.innerText,
    said: __rfh.debug.broadcast(),
  }));
  ok('?clean reports itself', cl.on);
  ok('clean builds the feed', cl.posts > 1, String(cl.posts));
  ok('not one decode node exists in a clean render', cl.nodes === 0, String(cl.nodes));
  // the plain readings of the live post must be absent from the page text
  const plains = await cp.evaluate(() => {
    const w = __rfh.debug.wireData();
    const id = __rfh.state.id;
    return (w.copy.en[id].lines.join(' ').match(/\{\{[^|{}]*\|([^{}]*)\}\}/g) || [])
      .map(m => m.split('|')[1].slice(0, -2));
  });
  ok('no plain reading appears anywhere in the clean text',
     plains.length > 0 && !plains.some(x => cl.text.includes(x)),
     plains.filter(x => cl.text.includes(x)).join(' | '));
  ok('the broadcast field still carries the words', cl.said.length > 0,
     JSON.stringify(cl.said).slice(0, 60));
  ok('clean mode throws nothing', cerrs.length === 0, cerrs.join(' | '));
  await cp.close();

  console.log('\nconsole');
  ok('zero console errors', errs.length === 0, errs.join(' | '));

  console.log(`\n${checks - fails}/${checks} passed`);
  await browser.close();
  if (srv) srv.close();
  process.exit(fails ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
