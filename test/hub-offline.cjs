// The arcade — offline gate.  node test/hub-offline.cjs
//
// The hub is the front door, and a front door that needs a signal is a poor
// one. Loads with ?sw=1 to opt the worker in over http, waits for it to take
// control, then kills the server AND sets the browser offline and reloads.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json' };
let served = 0;
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  let p = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    served++;
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
});

let bad = 0;
const check = (n, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`); if (!ok) bad++; };

(async () => {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));

  await pg.goto(`http://localhost:${port}/index.html?sw=1`, { waitUntil: 'networkidle' });
  const worker = await pg.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 60 && !navigator.serviceWorker.controller; i++) {
      await new Promise(r => setTimeout(r, 100));
    }
    return { scope: reg.scope, controlled: !!navigator.serviceWorker.controller };
  });
  const cached = await pg.evaluate(async () => {
    const names = (await caches.keys()).filter(k => k.startsWith('suds-hub-'));
    const c = await caches.open(names[0]);
    return { cache: names[0], entries: (await c.keys()).length };
  });
  console.log('worker:', JSON.stringify(worker), 'precache:', JSON.stringify(cached));

  // ── now cut the network entirely ──
  await ctx.setOffline(true);
  await new Promise(r => server.close(r));
  const before = served;

  await pg.reload({ waitUntil: 'load' });
  await pg.waitForTimeout(400);
  const off = await pg.evaluate(() => ({
    cabs: document.querySelectorAll('.cab').length,
    painted: [...document.querySelectorAll('.cab .art')].every(c =>
      c.getContext('2d').getImageData(0, 0, 4, 4).data.some(v => v)),
    play: document.querySelectorAll('.cab .btn.play').length,
    lang: document.querySelectorAll('.lang-btn').length,
  }));
  console.log('OFFLINE:', JSON.stringify(off));

  check('the worker takes control', worker.controlled);
  check('the hub shell is precached', cached.entries >= 8);
  check(`the whole floor is there with the network gone (${off.cabs})`, off.cabs >= 8);
  check('the marquees still paint — they were code, not images', off.painted);
  check('and every Play button is still a link', off.play > 0);
  check('the language row survives too', off.lang === 3);
  check('nothing reached the network while offline', served - before === 0);
  check(`no page errors${errs.length ? ' — ' + errs[0].slice(0, 60) : ''}`, errs.length === 0);
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
