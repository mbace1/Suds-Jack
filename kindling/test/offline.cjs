// Kindling — the offline gate.
//   node kindling/test/offline.cjs
//
// A thing you open once a day, often on a phone and often before you are
// properly awake, cannot need a signal. So this does not check that a worker is
// registered — it KILLS THE SERVER and sets the browser offline, then reloads and
// plays a whole day: ticks a line, checks in, breathes, sends the creature out,
// brings it home, and reads the journal. Anything that quietly wanted the network
// shows up as a page that does not work rather than as a passing test.

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/plain',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
};

let served = 0;
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nope'); }
  served++;
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

let pass = 0, fail = 0;
function check(what, ok) {
  console.log(`${ok ? '  ok ' : 'FAIL '} ${what}`);
  ok ? pass++ : fail++;
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  // ── online first: let the worker install ──
  await page.goto(`${base}/kindling/index.html?sw=1`, { waitUntil: 'load' });
  const worker = await Promise.race([
    page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      for (let i = 0; i < 80 && !navigator.serviceWorker.controller; i++) {
        await new Promise(r => setTimeout(r, 100));
      }
      return { scope: reg.scope, controlled: !!navigator.serviceWorker.controller };
    }),
    new Promise(r => setTimeout(() => r({ timedOut: true }), 20000)),
  ]);
  check(`a worker takes control of the page${worker.timedOut ? ' — timed out; is it registered?' : ''}`,
    !!worker.controlled);
  check(`and its scope is this folder only (${worker.scope ?? '—'})`,
    (worker.scope ?? '').endsWith('/kindling/'));

  const precached = await page.evaluate(async () => {
    const names = await caches.keys();
    const c = await caches.open(names.find(n => n.startsWith('kindling-')));
    return { name: names.find(n => n.startsWith('kindling-')), keys: (await c.keys()).map(r => r.url) };
  });
  check(`the shell is precached under its own version (${precached.name}, ${precached.keys.length} entries)`,
    precached.keys.length >= 17);
  // every module the page actually loaded is in there — a list that names
  // thirteen files and misses the fourteenth is the exact bug this catches
  const wanted = ['main.js', 'room.js', 'pet.js', 'state.js', 'errand.js', 'breathe.js',
    'pixel.js', 'palette.js', 'audio.js', 'icon-192.png', 'manifest.webmanifest',
    'hub/shell.js', 'hub/pad.js', 'hub/games.js', 'hub/padkeys.js'];
  const missing = wanted.filter(w => !precached.keys.some(u => u.includes(w)));
  check(`and it names every file the page asks for${missing.length ? ` — missing ${missing}` : ''}`,
    missing.length === 0);

  // leave some state behind, so the offline run is a RETURN visit rather than a
  // first one — that is how this app is actually used
  await page.locator('.task').first().click();
  await page.waitForTimeout(200);

  // ── now cut the network entirely ──
  await ctx.setOffline(true);
  await new Promise(r => server.close(r));
  const before = served;

  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__kd, null, { timeout: 10000 });

  const room = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
    return { lit, tasks: document.querySelectorAll('.task').length, cared: window.__kd.debug.cared() };
  });
  check(`offline, the room is still painted (${room.lit} lit pixels)`, room.lit > 500);
  check(`the sheet is there with its six lines`, room.tasks === 6);
  check('and yesterday evening\'s tick came back with it', room.cared === 1);

  // a whole day, with no network at all
  await page.locator('.task').nth(1).click();
  await page.locator('.mood').nth(3).click();
  const day = await page.evaluate(() => ({ cared: __kd.debug.cared(), fuel: __kd.state.fuel }));
  check(`ticking and checking in still work (${day.cared} kept, ${day.fuel} kindling)`,
    day.cared === 3 && day.fuel >= 3);

  await page.evaluate(() => __kd.debug.sendOut());
  const out = await page.evaluate(() => !!__kd.state.errand?.out);
  check('the errand goes out with nothing to phone home to', out);
  await page.evaluate(() => __kd.debug.finishErrand());
  const home = await page.evaluate(() => ({
    out: !!__kd.state.errand?.out, lines: __kd.state.journal[0].lines.length,
  }));
  check(`and comes home with its report written locally (${home.lines} lines)`,
    !home.out && home.lines >= 2);

  const breathed = await page.evaluate(async () => {
    __kd.debug.breathe();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const label = document.getElementById('breath-label')?.textContent ?? '';
    __kd.debug.stopBreathing();
    return label;
  });
  check(`breathing runs offline ("${breathed}")`, /breathe/i.test(breathed));

  await page.evaluate(() => { __kd.view.page = 'journal'; __kd.debug.render(); });
  const journal = await page.evaluate(() => document.querySelectorAll('.journal .days li').length);
  check(`the journal reads back offline (${journal} day${journal === 1 ? '' : 's'})`, journal >= 1);

  // the way home, which is the one thing on this page that comes from elsewhere
  check('and the arcade\'s HOME button survived the network going away',
    await page.locator('.arcade-home').count() === 1);

  check(`the network served nothing after it was cut (${served - before} requests)`,
    served === before);
  check(`no page errors offline${errs.length ? ` — ${errs[0]}` : ''}`, errs.length === 0);

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
