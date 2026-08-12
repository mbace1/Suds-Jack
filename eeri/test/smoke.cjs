// EERI smoke: does it boot, does the kid run/jump, does the ride work,
// does the asset seam hold. Driven off game state, not the wall clock.
// Run: NODE_PATH=$(npm root -g) node eeri/test/smoke.cjs
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const s = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

// ---- the asset seam holds without a browser ------------------------------
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'manifest.json'), 'utf8'));
for (const [name, m] of Object.entries(manifest.models)) {
  const f = path.join(__dirname, '..', 'assets', m.file);
  ok(`model "${name}": ${m.status === 'live' ? 'live file exists' : 'placeholder declared'}`,
    m.status !== 'live' || fs.existsSync(f), m.file);
  ok(`model "${name}" declares its node contract`, Array.isArray(m.nodes) && m.nodes.length > 0);
}
for (const [world, layers] of Object.entries(manifest.layers)) {
  for (const [layer, e] of Object.entries(layers)) {
    const f = path.join(__dirname, '..', 'assets', e.file);
    ok(`layer "${world}/${layer}": ${e.status === 'live' ? 'live file exists' : 'placeholder declared'}`,
      e.status !== 'live' || fs.existsSync(f), e.file);
  }
}

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await p.goto(base + '/eeri/', { waitUntil: 'load' });
  await p.waitForFunction(() => !!window.__eeri, null, { timeout: 8000 }).catch(() => {});
  ok('it boots and exposes the handle', await p.evaluate(() => !!window.__eeri));
  ok('no errors on boot', errs.length === 0, errs.slice(0, 3).join(' | '));
  ok('it is actually drawing triangles', await p.evaluate(() => window.__eeri.debug.tris() > 500));

  // the kid lands on the ground and stands
  await p.waitForFunction(() => window.__eeri.player.grounded, null, { timeout: 3000 }).catch(() => {});
  ok('the kid stands on the ground', await p.evaluate(() => window.__eeri.player.grounded));
  const y0 = await p.evaluate(() => window.__eeri.player.y);
  ok('the ground is where the map says (top of the band = 4)', Math.abs(y0 - 4) < 0.1, 'y=' + y0);

  // run right: x increases (state-driven — a GPU-less sandbox renders slow)
  const x0 = await p.evaluate(() => window.__eeri.player.x);
  await p.evaluate(() => window.__eeri.debug.press('right'));
  const ran = await p.waitForFunction((x) => window.__eeri.player.x > x + 2, x0, { timeout: 6000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('holding right runs him right', ran, `${x0} → ` + await p.evaluate(() => window.__eeri.player.x));

  // jump: leaves the ground, comes back
  await p.evaluate(() => window.__eeri.debug.press('jump'));
  const rose = await p.waitForFunction(() => window.__eeri.player.y > 4.5, null, { timeout: 1500 }).then(() => true).catch(() => false);
  ok('jump leaves the ground', rose);
  await p.evaluate(() => window.__eeri.debug.release('jump'));
  const back = await p.waitForFunction(() => window.__eeri.player.grounded, null, { timeout: 2500 }).then(() => true).catch(() => false);
  ok('and gravity brings him back', back);

  // a bolt collects on touch
  const n0 = await p.evaluate(() => window.__eeri.collected());
  await p.evaluate(() => window.__eeri.debug.setPos(34.5, 4.2));
  await p.waitForTimeout(400);
  ok('walking into a bolt collects it', await p.evaluate(() => window.__eeri.collected()) > n0);

  // the ride: walk to the cab, climb in, drive, hop out
  await p.evaluate(() => {
    const e = window.__eeri.debug.excPos();
    window.__eeri.debug.setPos(e.x - 1.5, e.y + 0.1);
  });
  await p.waitForTimeout(200);
  await p.evaluate(() => window.__eeri.debug.press('action'));
  await p.evaluate(() => window.__eeri.debug.release('action'));
  const mounted = await p.waitForFunction(() => window.__eeri.mode() === 'riding', null, { timeout: 3000 }).then(() => true).catch(() => false);
  ok('E climbs into the excavator', mounted, 'mode=' + await p.evaluate(() => window.__eeri.mode()));

  const ex0 = (await p.evaluate(() => window.__eeri.debug.excPos())).x;
  await p.evaluate(() => window.__eeri.debug.press('right'));
  const drove = await p.waitForFunction((x) => window.__eeri.debug.excPos().x > x + 1.5, ex0, { timeout: 8000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('riding drives the machine', drove, `${ex0} → ` + (await p.evaluate(() => window.__eeri.debug.excPos())).x);

  await p.evaluate(() => window.__eeri.debug.press('action'));
  await p.evaluate(() => window.__eeri.debug.release('action'));
  const out = await p.waitForFunction(() => window.__eeri.mode() === 'foot', null, { timeout: 3000 }).then(() => true).catch(() => false);
  ok('E hops back out', out);
  ok('the kid lands somewhere real after dismount', await p.evaluate(() => window.__eeri.player.y) > 3);

  ok('no errors after the whole ride', errs.length === 0, errs.slice(0, 3).join(' | '));

  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
