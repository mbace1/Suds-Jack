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
for (const [name, m] of Object.entries(manifest.pieces || {})) {
  const f = path.join(__dirname, '..', 'assets', m.file);
  ok(`piece "${name}": ${m.status === 'live' ? 'live file exists' : 'placeholder declared'}`,
    m.status !== 'live' || fs.existsSync(f), m.file);
  ok(`piece "${name}" declares every state`,
    Array.isArray(m.nodes) && m.nodes.filter((n) => n.startsWith('state')).length >= 2);
}
for (const [world, layers] of Object.entries(manifest.layers)) {
  for (const [layer, e] of Object.entries(layers)) {
    const f = path.join(__dirname, '..', 'assets', e.file);
    ok(`layer "${world}/${layer}": ${e.status === 'live' ? 'live file exists' : 'placeholder declared'}`,
      e.status !== 'live' || fs.existsSync(f), e.file);
  }
}

// ---- the seam only ever reaches into assets/ -----------------------------
// Asset work contributes files here and a status flip, nothing else. A
// manifest path that climbs out of this folder would make the art drop a
// way to reach the code, so it is refused rather than trusted.
const ASSETS = path.resolve(__dirname, '..', 'assets');
const allFiles = [
  ...Object.entries(manifest.models).map(([n, m]) => [`model ${n}`, m.file]),
  ...Object.entries(manifest.pieces || {}).map(([n, m]) => [`piece ${n}`, m.file]),
  ...Object.entries(manifest.layers).flatMap(([w, ls]) =>
    Object.entries(ls).map(([n, e]) => [`layer ${w}/${n}`, e.file])),
];
for (const [what, file] of allFiles) {
  const abs = path.resolve(ASSETS, file);
  ok(`${what} stays inside assets/`,
    !path.isAbsolute(file) && !file.includes('..') && abs.startsWith(ASSETS + path.sep), file);
}

// ---- the 2D contract an artist paints to is the one the game uses -------
// assets/README.md carries the layer size table. It is the brief for every
// incoming PNG, so it is checked against the code rather than trusted to
// have been kept up by hand.
const readme = fs.readFileSync(path.join(ASSETS, 'README.md'), 'utf8');
const NUM = (s) => Number(String(s).replace(/[−–—]/g, '-').trim());
const readmeRects = {};
for (const line of readme.split('\n')) {
  const m = line.match(/^\|\s*`(skyline|far|mid|near|fore)`\s*\|([^|]+)\|([^|]+)\|([^|]+)\|/);
  if (!m) continue;
  const rect = m[3].match(/(-?[−\d.]+)\s*…\s*(-?[−\d.]+)\s*×\s*(-?[−\d.]+)\s*…\s*(-?[−\d.]+)/);
  const px = m[4].match(/(\d+)\s*×\s*(\d+)/);
  if (rect && px) {
    readmeRects[m[1]] = {
      z: NUM(m[2]),
      x0: NUM(rect[1]), x1: NUM(rect[2]), y0: NUM(rect[3]), y1: NUM(rect[4]),
      pxW: Number(px[1]), pxH: Number(px[2]),
    };
  }
}
ok('the README documents every 2D layer', Object.keys(readmeRects).length === 5,
  Object.keys(readmeRects).join(','));

// A live PNG at the wrong size does not fail — it STRETCHES onto the plane,
// silently, and the art looks subtly wrong with nothing to blame. So the
// pixels are measured. (PNG header: 8-byte signature, then IHDR length and
// type, then width and height as big-endian u32s.)
function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
for (const [world, layers] of Object.entries(manifest.layers)) {
  for (const [layer, e] of Object.entries(layers)) {
    if (e.status !== 'live') continue;
    const f = path.join(ASSETS, e.file);
    if (!fs.existsSync(f)) continue;              // already reported above
    const got = pngSize(f), want = readmeRects[layer];
    ok(`layer "${world}/${layer}" is painted to its documented size`,
      got && want && got.w === want.pxW && got.h === want.pxH,
      got ? `${got.w}×${got.h}, wanted ${want?.pxW}×${want?.pxH}` : 'not a readable PNG');
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
  await p.evaluate(() => window.__eeri.debug.setPos(30.5, 4.2));
  await p.waitForTimeout(400);
  ok('walking into a bolt collects it', await p.evaluate(() => window.__eeri.collected()) > n0);

  // the ride: walk to the cab, climb in, drive, hop out
  await p.evaluate(() => {
    const e = window.__eeri.debug.excPos();
    window.__eeri.debug.setPos(e.x - 1.5, e.y + 0.1);
  });
  await p.waitForTimeout(200);
  let mounted = false;
  for (let i = 0; i < 8 && !mounted; i++) {
    await p.evaluate(() => {
      window.__eeri.player.mercyT = 0;
      window.__eeri.debug.setPos(window.__eeri.exc.x - 1.5, window.__eeri.exc.y + 0.1);
    });
    await p.waitForTimeout(250);
    await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
    mounted = await p.waitForFunction(() => window.__eeri.mode() === 'riding', null, { timeout: 4000 }).then(() => true).catch(() => false);
  }
  ok('E climbs into the excavator', mounted, 'mode=' + await p.evaluate(() => window.__eeri.mode()));

  const ex0 = (await p.evaluate(() => window.__eeri.debug.excPos())).x;
  await p.evaluate(() => window.__eeri.debug.press('right'));
  const drove = await p.waitForFunction((x) => window.__eeri.debug.excPos().x > x + 1.5, ex0, { timeout: 8000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('riding drives the machine', drove, `${ex0} → ` + (await p.evaluate(() => window.__eeri.debug.excPos())).x);

  await p.evaluate(() => window.__eeri.debug.press('action'));
  await p.evaluate(() => window.__eeri.debug.release('action'));
  const out = await p.waitForFunction(() => window.__eeri.mode() === 'foot', null, { timeout: 10000 }).then(() => true).catch(() => false);
  ok('E hops back out', out, 'mode=' + await p.evaluate(() => window.__eeri.mode()));
  ok('the kid lands somewhere real after dismount', await p.evaluate(() => window.__eeri.player.y) > 3);

  // ---- the hazard: telegraph before strike, and the Yoshi rule -----------
  await p.evaluate(() => window.__eeri.debug.setPos(4, 4.2));
  await p.waitForTimeout(500);
  ok('the wrecking ball hangs still when nobody is near',
    await p.evaluate(() => window.__eeri.debug.hazard().state) === 'rest');

  await p.evaluate(() => window.__eeri.debug.setPos(68, 4.2));
  const wound = await p.waitForFunction(() => window.__eeri.debug.hazard().state === 'wind', null, { timeout: 4000 }).then(() => true).catch(() => false);
  ok('coming near winds it back first — it telegraphs', wound);
  const swung = await p.waitForFunction(() => window.__eeri.debug.hazard().state === 'swing', null, { timeout: 12000 }).then(() => true).catch(() => false);
  ok('and only then does it swing', swung);

  const struck = await p.waitForFunction(() => window.__eeri.debug.mercy() > 0, null, { timeout: 6000 }).then(() => true).catch(() => false);
  ok('the swing knocks the kid back (mercy frames, never death)', struck);
  ok('and he is still in the world afterwards',
    await p.evaluate(() => window.__eeri.player.y) > 0.9);

  // riding into it costs the RIDE, not the run (the Yoshi rule).
  // Mount well clear of the ball first, then drive the cab under it.
  await p.evaluate(() => {
    window.__eeri.player.mercyT = 0;
    window.__eeri.exc.x = 30; window.__eeri.exc.y = 4;
    window.__eeri.debug.setPos(28.5, 4.1);
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
  const rode = await p.waitForFunction(() => window.__eeri.mode() === 'riding', null, { timeout: 5000 }).then(() => true).catch(() => false);
  ok('back in the cab, clear of the ball', rode);

  await p.evaluate(() => { window.__eeri.exc.x = 69.4; window.__eeri.player.mercyT = 0; });
  const thrown = await p.waitForFunction(() => window.__eeri.mode() !== 'riding', null, { timeout: 10000 }).then(() => true).catch(() => false);
  ok('a hit takes the ride, not the run (thrown clear of the cab)', thrown);

  // ---- the loop: dangerous until tamed, and a machine-shaped exit -------
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => !!window.__eeri && window.__eeri.player.grounded, null, { timeout: 8000 });
  ok('the machine starts UNMANNED', await p.evaluate(() => !window.__eeri.debug.tamed()));
  ok('and the bank blocks the way out', await p.evaluate(() => window.__eeri.debug.bank().remaining) === 3);
  ok('the exit is not open at the start', await p.evaluate(() => !window.__eeri.debug.cleared()));

  // the kid cannot pass the bank on foot — three tiles is above his jump
  await p.evaluate(() => window.__eeri.debug.setPos(82, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  await p.waitForTimeout(1200);
  for (let i = 0; i < 6; i++) {
    await p.evaluate(() => { window.__eeri.debug.press('jump'); });
    await p.waitForTimeout(220);
    await p.evaluate(() => window.__eeri.debug.release('jump'));
    await p.waitForTimeout(220);
  }
  await p.evaluate(() => window.__eeri.debug.release('right'));
  const blocked = await p.evaluate(() => window.__eeri.player.x) < 84;
  ok('the kid alone cannot get past the bank', blocked,
    'x=' + await p.evaluate(() => window.__eeri.player.x));

  // taming it turns the beacon off and the threat into a tool. The cab is
  // approached on the machine's own rhythm: a sweep can knock the kid away
  // mid-try, so each attempt walks back up and the mount move itself gets
  // real time to play out (a sandbox with no GPU runs the clock ~5× slow).
  await p.evaluate(() => { window.__eeri.exc.x = 40; });
  let ride = false;
  for (let i = 0; i < 10 && !ride; i++) {
    await p.evaluate(() => {
      window.__eeri.player.mercyT = 0;
      window.__eeri.debug.setPos(window.__eeri.exc.x - 1.5, window.__eeri.exc.y + 0.1);
    });
    await p.waitForTimeout(250);
    await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
    ride = await p.waitForFunction(() => window.__eeri.mode() === 'riding', null, { timeout: 4000 }).then(() => true).catch(() => false);
  }
  ok('reading the cycle gets you into the cab', ride);
  ok('and taming it kills the beacon', await p.evaluate(() => window.__eeri.debug.tamed()));

  // the bucket digs the bank down — the machine changes the level
  await p.evaluate(() => { window.__eeri.exc.x = 83; window.__eeri.debug.press('down'); });
  const dug = await p.waitForFunction(() => window.__eeri.debug.bank().cleared, null, { timeout: 25000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('down'));
  ok('the bucket digs the bank away', dug,
    'remaining=' + await p.evaluate(() => window.__eeri.debug.bank().remaining));
  ok('and the map really changed, not just the picture',
    await p.evaluate(() => !window.__eeri.level.solidCell(86, 4)));

  // out on foot, through the gate the machine opened — and the gate does
  // not end the job any more: the level goes beyond one room
  await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
  await p.waitForFunction(() => window.__eeri.mode() === 'foot', null, { timeout: 5000 }).catch(() => {});
  await p.evaluate(() => window.__eeri.debug.setPos(88, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  const site2 = await p.waitForFunction(() => window.__eeri.site() === 1, null, { timeout: 8000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('walking out of site 1 leads to SITE 2, not the credits', site2);
  ok('the room announces itself on the way in', await p.locator('#banner').count() === 1);
  ok('arriving clears nothing', await p.evaluate(() => !window.__eeri.debug.cleared()));
  ok('the bolt count carries over between sites', await p.evaluate(() => window.__eeri.collected()) > 0);

  // ---- SITE 2: the girder — stacked, slung, seated as a span --------------
  ok('the new room\'s machine is unmanned again', await p.evaluate(() => !window.__eeri.debug.tamed()));
  ok('site 2 carries the girder, not the bank',
    await p.evaluate(() => window.__eeri.debug.girder() !== null && window.__eeri.debug.bank() === null));
  ok('the girder waits on its stack', await p.evaluate(() => window.__eeri.debug.girder()?.state) === 0);

  // the gap is past BOTH of them: the kid's jump falls short…
  await p.evaluate(() => window.__eeri.debug.setPos(54, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  await p.waitForTimeout(600);
  await p.evaluate(() => window.__eeri.debug.press('jump'));
  await p.waitForTimeout(300);
  await p.evaluate(() => { window.__eeri.debug.release('jump'); window.__eeri.debug.release('right'); });
  await p.waitForTimeout(1500);   // he falls, and the pit hands him back
  ok('the gap is too wide for the kid', await p.evaluate(() => window.__eeri.player.x) < 58,
    'x=' + await p.evaluate(() => window.__eeri.player.x));

  // …so read the cycle and take the machine, again
  await p.evaluate(() => { window.__eeri.exc.x = 40; });
  let ride2 = false;
  for (let i = 0; i < 10 && !ride2; i++) {
    await p.evaluate(() => {
      window.__eeri.player.mercyT = 0;
      window.__eeri.debug.setPos(window.__eeri.exc.x - 1.5, window.__eeri.exc.y + 0.1);
    });
    await p.waitForTimeout(250);
    await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
    ride2 = await p.waitForFunction(() => window.__eeri.mode() === 'riding', null, { timeout: 4000 }).then(() => true).catch(() => false);
  }
  ok('the mount is a skill test in every room', ride2);

  // …and the machine refuses the cliff: start it at the approach and let it
  // drive — it must actually reach the lip and stop there, not merely dawdle
  await p.evaluate(() => { window.__eeri.exc.x = 54; window.__eeri.exc.vx = 0; });
  await p.evaluate(() => window.__eeri.debug.press('right'));
  await p.waitForTimeout(6000);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  const stoppedAt = await p.evaluate(() => window.__eeri.exc.x);
  ok('the machine refuses the gap', stoppedAt > 55 && stoppedAt < 57.1, 'x=' + stoppedAt);

  // the bucket takes the girder off the stack
  await p.evaluate(() => { window.__eeri.exc.x = 46; window.__eeri.exc.vx = 0; });
  await p.evaluate(() => window.__eeri.debug.press('down'));
  const slung = await p.waitForFunction(() => window.__eeri.debug.girder()?.state === 1, null, { timeout: 8000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('down'));
  ok('holding the bucket in the stack slings the girder on', slung);
  ok('and the machine feels the load', await p.evaluate(() => window.__eeri.debug.girder()?.carrying));

  // carried to the lip and lowered in, it seats as a span
  await p.evaluate(() => { window.__eeri.exc.x = 55.5; window.__eeri.exc.vx = 0; });
  await p.waitForTimeout(300);
  await p.evaluate(() => window.__eeri.debug.press('down'));
  const seated = await p.waitForFunction(() => window.__eeri.debug.girder()?.state === 2, null, { timeout: 8000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('down'));
  ok('lowered at the lip, the girder seats as a span', seated);
  ok('and the map really changed — the gap is bridged',
    await p.evaluate(() => window.__eeri.level.solidCell(61, 3)));
  ok('the load is off the machine', await p.evaluate(() => !window.__eeri.exc.carrying));

  // the kid crosses his machine's bridge and walks the job out
  await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
  await p.waitForFunction(() => window.__eeri.mode() === 'foot', null, { timeout: 5000 }).catch(() => {});
  await p.evaluate(() => window.__eeri.debug.setPos(56, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  // mid-span at ground height, grounded, over what used to be air = crossing
  const crossed = await p.waitForFunction(
    () => window.__eeri.player.x > 62 && window.__eeri.player.grounded && window.__eeri.player.y < 4.2,
    null, { timeout: 15000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('the kid crosses the span on foot', crossed,
    'x=' + await p.evaluate(() => window.__eeri.player.x));

  await p.evaluate(() => window.__eeri.debug.setPos(88, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  const site3 = await p.waitForFunction(() => window.__eeri.site() === 2, null, { timeout: 10000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('site 2 leads on to SITE 3', site3);

  // ---- SITE 3: the crane, and the third verb ----------------------------
  ok('the room parks a CRANE, not another excavator',
    await p.evaluate(() => window.__eeri.debug.machine()?.kind) === 'crane');
  ok('and it is unmanned like every machine on arrival',
    await p.evaluate(() => !window.__eeri.debug.machine().tamed));
  ok('the brick wall is standing', await p.evaluate(() => window.__eeri.debug.wall()?.hits) === 0);
  ok('the wall blocks the way out on the map',
    await p.evaluate(() => window.__eeri.level.solidCell(82, 4)));

  // the kid alone cannot pass four tiles of brick
  await p.evaluate(() => window.__eeri.debug.setPos(77, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  for (let i = 0; i < 5; i++) {
    await p.evaluate(() => window.__eeri.debug.press('jump'));
    await p.waitForTimeout(200);
    await p.evaluate(() => window.__eeri.debug.release('jump'));
    await p.waitForTimeout(200);
  }
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('the kid alone cannot get past the wall',
    await p.evaluate(() => window.__eeri.player.x) < 80,
    'x=' + await p.evaluate(() => window.__eeri.player.x));

  let onCrane = false;
  for (let i = 0; i < 10 && !onCrane; i++) {
    await p.evaluate(() => {
      window.__eeri.player.mercyT = 0;
      window.__eeri.debug.setPos(window.__eeri.exc.x - 1.6, window.__eeri.exc.y + 0.1);
    });
    await p.waitForTimeout(250);
    await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
    onCrane = await p.waitForFunction(() => window.__eeri.mode() === 'riding', null, { timeout: 4000 }).then(() => true).catch(() => false);
  }
  ok('reading the swing gets you into the crane', onCrane);

  // the ball that swung at you is the ball you swing at the wall
  await p.evaluate(() => { window.__eeri.exc.x = 77; window.__eeri.exc.vx = 0; });
  await p.waitForTimeout(300);
  await p.evaluate(() => window.__eeri.debug.press('down'));
  const cracked = await p.waitForFunction(() => window.__eeri.debug.wall().hits >= 1, null, { timeout: 30000 }).then(() => true).catch(() => false);
  ok('the first swing cracks the wall', cracked);
  ok('…and a cracked wall is still a wall',
    await p.evaluate(() => window.__eeri.debug.wall().cracked && !window.__eeri.debug.wall().cleared));
  const smashed = await p.waitForFunction(() => window.__eeri.debug.wall().cleared, null, { timeout: 30000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('down'));
  ok('the second brings it down', smashed);
  ok('and the map really changed — the brick is gone',
    await p.evaluate(() => !window.__eeri.level.solidCell(82, 4)));

  // out on foot, through the hole the crane made
  await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
  await p.waitForFunction(() => window.__eeri.mode() === 'foot', null, { timeout: 6000 }).catch(() => {});
  await p.evaluate(() => window.__eeri.debug.setPos(88, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  const walkedOut = await p.waitForFunction(() => window.__eeri.debug.cleared(), null, { timeout: 10000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('walking out of the last site clears the whole job', walkedOut);
  ok('and it says so on screen', await p.locator('#clear').count() === 1);

  // ---- the small stuff ---------------------------------------------------
  const bots = await p.evaluate(() => window.__eeri.debug.robots());
  ok('the room carries robots, and they patrol', bots.length > 0);
  ok('a robot only ever stands on its own floor',
    bots.every((b) => typeof b.x === 'number' && !Number.isNaN(b.x)));
  ok('the room carries a telegraphed hazard',
    (await p.evaluate(() => window.__eeri.debug.vents())).length > 0);

  // ---- the diorama: the Tropical Freeze half ----------------------------
  // 2D gameplay in a layered world. The gate cannot see "does it look
  // deep", but it can hold the three rules whose breach made it look flat.
  const contract = await p.evaluate(() => window.__eeri.debug.layerContract());

  for (const [name, r] of Object.entries(readmeRects)) {
    const c = contract[name];
    ok(`layer "${name}": the README rect is the code's rect`,
      c && c.x0 === r.x0 && c.x1 === r.x1 && c.y0 === r.y0 && c.y1 === r.y1,
      c ? `code ${c.x0}…${c.x1} × ${c.y0}…${c.y1} vs readme ${r.x0}…${r.x1} × ${r.y0}…${r.y1}` : 'missing');
    ok(`layer "${name}": the README PNG size is what the plane wants`,
      c && c.pxW === r.pxW && c.pxH === r.pxH,
      c ? `code ${c.pxW}×${c.pxH} vs readme ${r.pxW}×${r.pxH}` : 'missing');
  }

  // the occluder lane has to REACH the frame, top and bottom. It used to
  // stop at y=5 — a tile above the ground line — so its pieces could only
  // ever sit buried in the dirt, and the "cropped foreground = depth"
  // lesson was written in the brief and absent from the screen.
  ok('the foreground lane can crop the top of the frame', contract.fore.y1 >= 12,
    'fore y1=' + contract.fore.y1);
  ok('…and the bottom', contract.fore.y0 <= -1, 'fore y0=' + contract.fore.y0);
  ok('the foreground sits in front of the gameplay plane', contract.fore.z > 0);
  ok('the layer stack is genuinely stacked, not co-planar',
    new Set(Object.values(contract).map((c) => c.z)).size === Object.keys(contract).length,
    Object.values(contract).map((c) => c.z).join(','));

  // the background WORKS: depth you watch, not just parallax you scroll
  const bg0 = await p.evaluate(() => window.__eeri.debug.bg());
  ok('the background carries authored life at all', bg0.length > 0);
  const bgMoved = await p.waitForFunction(
    (a) => window.__eeri.debug.bg().some((v, i) => Math.abs(v - a[i]) > 0.05),
    bg0, { timeout: 6000 }).then(() => true).catch(() => false);
  ok('the background works — something back there is moving', bgMoved);

  // the camera reframes per room (js/camera.js): a room pulls back where it
  // is asking you to read a lock, and that is authored, not a spring. We are
  // standing in site 2, whose wide shot covers the stack and the gap.
  // Settle by watching the dolly stop moving — the sandbox runs the clock
  // several times slower than the wall clock, so a fixed sleep is a coin flip.
  const settleZ = async () => {
    let last = null;
    for (let i = 0; i < 40; i++) {
      const z = (await p.evaluate(() => window.__eeri.debug.camera())).z;
      if (last !== null && Math.abs(z - last) < 0.12) return z;
      last = z;
      await p.waitForTimeout(250);
    }
    return last;
  };
  await p.evaluate(() => window.__eeri.debug.setPos(50, 4.2));
  const zOpen = await settleZ();
  await p.evaluate(() => window.__eeri.debug.setPos(72, 4.2));
  const zWide = await settleZ();
  ok('the camera pulls back where the room asks you to read something',
    zWide > zOpen + 3, `open z=${zOpen.toFixed(1)} → wall z=${zWide.toFixed(1)}`);

  // ---- the house obligations --------------------------------------------
  ok('the way home is mounted', await p.locator('.hub-home, #hubHome, [data-hub-home]').count() > 0
    || await p.evaluate(() => !!document.querySelector('a[href*="../"], a[href$="/"]')));
  ok('it is signed', await p.locator('.toko-sign, .toko-badge, [class*="toko"]').count() > 0);

  // the HUD must not sit under the HOME button — it did, and it was unreadable
  const clash = await p.evaluate(() => {
    const hud = document.getElementById('hud');
    const home = [...document.querySelectorAll('a, button')]
      .find((e) => /home/i.test(e.textContent + e.className + e.id));
    if (!hud || !home) return false;
    const a = hud.getBoundingClientRect(), b = home.getBoundingClientRect();
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  });
  ok('the HUD clears the way home', !clash);

  ok('no errors after the whole ride', errs.length === 0, errs.slice(0, 3).join(' | '));

  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
