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

// ---- one token per module ------------------------------------------------
// Two tokens for one module means the browser instantiates it TWICE, and a
// module with state (assets.js holds the manifest) then has two of them:
// loadManifest() runs on one instance and getLayerTexture() asks the other,
// whose manifest is still null. Every layer silently falls back to its code
// placeholder while the painted PNGs sit unrequested. This has happened
// twice — once on the art lineage, once again in the reconciliation.
{
  const tok = {};
  const files = fs.readdirSync(path.join(__dirname, '..', 'js')).filter((f) => f.endsWith('.js'))
    .map((f) => path.join(__dirname, '..', 'js', f))
    .concat([path.join(__dirname, '..', 'index.html')]);
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/['"](?:\.\/)?([a-zA-Z0-9_-]+\.js)\?v=(\d+)['"]/g)) {
      (tok[m[1]] ||= new Set()).add(m[2]);
    }
  }
  const split = Object.entries(tok).filter(([, s]) => s.size > 1)
    .map(([m, s]) => `${m}:${[...s].sort()}`);
  ok(`every module is imported under ONE token${split.length ? ' — ' + split.join(' ') : ''}`,
    split.length === 0);
}

// ---- the asset seam holds without a browser ------------------------------
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'manifest.json'), 'utf8'));
for (const [name, m] of Object.entries(manifest.models)) {
  const f = path.join(__dirname, '..', 'assets', m.file);
  ok(`model "${name}": ${m.status === 'live' ? 'live file exists' : 'placeholder declared'}`,
    m.status !== 'live' || fs.existsSync(f), m.file);
  // THREE kinds of rig, three contracts: a hand-cut model declares the NODES
  // the game rotates, a skinned character declares the CLIPS it can play, and
  // a PROP declares neither because nothing inside it moves — a pickup is one
  // solid thing the game spins and bobs whole. Saying so beats exempting it:
  // a prop that quietly grew an animated part would still be caught.
  const skinned = m.rig === 'skinned', prop = m.rig === 'prop';
  if (prop) {
    ok(`prop "${name}" declares no moving parts`,
      !m.nodes?.length && !m.clips?.length);
  } else {
    ok(`model "${name}" declares its ${skinned ? 'clip' : 'node'} contract`,
      Array.isArray(skinned ? m.clips : m.nodes) && (skinned ? m.clips : m.nodes).length > 0);
  }
  if (skinned) {
    ok(`skinned "${name}" declares its height in TILES`,
      typeof m.height === 'number' && m.height > 0.5 && m.height < 6);
  }
}
// UI art is a third family beside models and pieces — flat PNGs the game
// mounts on screens rather than in the world, so there is no rig and no node
// contract to check. What still has to hold is that a live file exists: a
// logo that 404s is a blank landing screen.
for (const [name, u] of Object.entries(manifest.ui || {})) {
  const f = path.join(__dirname, '..', 'assets', u.file);
  ok(`ui "${name}": ${u.status === 'live' ? 'live file exists' : 'placeholder declared'}`,
    u.status !== 'live' || fs.existsSync(f), u.file);
}
for (const [name, m] of Object.entries(manifest.pieces || {})) {
  const f = path.join(__dirname, '..', 'assets', m.file);
  ok(`piece "${name}": ${m.status === 'live' ? 'live file exists' : 'placeholder declared'}`,
    m.status !== 'live' || fs.existsSync(f), m.file);
  // A STAGED piece (a bank, a wall, a flag) ships every stage as sibling
  // nodes and the game shows one at a time — `state0…` for the things a
  // machine changes, `phase0…` for the things that BUILD themselves. A prop
  // that is not staged (the checkpoint) still has to declare the nodes the
  // game drives, or the seam has nothing to check a live file against.
  const staged = (m.nodes || []).filter((n) => /^(state|phase)\d/.test(n));
  ok(`piece "${name}" declares every ${staged.length ? 'stage' : 'contracted node'}`,
    Array.isArray(m.nodes) && (staged.length === 0 ? m.nodes.length > 0 : staged.length >= 2));
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
  ...Object.entries(manifest.textures || {})
    .filter(([n, e]) => !n.startsWith('_') && e && typeof e === 'object')
    .map(([n, e]) => [`texture ${n}`, e.file]),
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
  // `sky` belongs in this list: it ships as a layer like the rest (the
  // crafted paper sky), and leaving it out made the size check compare a
  // real PNG against `undefined×undefined` and fail.
  const m = line.match(/^\|\s*`(sky|skyline|far|mid|near|fore)`\s*\|([^|]+)\|([^|]+)\|([^|]+)\|/);
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
ok('the README documents every 2D layer', Object.keys(readmeRects).length === 6,
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
  // the static check above proves the tokens agree; this proves the art is
  // actually FETCHED, which is the thing that silently stopped happening
  const fetched = new Set();
  p.on('request', (r) => {
    const m = r.url().match(/\/assets\/(2d|3d)\/([^?]+)/);
    if (m) fetched.add(m[2]);
  });
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });


  // Board the machine standing in this room. Short, repeated attempts beat
  // one long wait: the cab is only reachable between bucket sweeps, and a
  // press that lands during one is lost. Returns true once mode is 'riding'.
  async function mountUp(tries = 40, place = null) {
    for (let i = 0; i < tries; i++) {
      if (await p.evaluate(() => window.__eeri.mode() === 'riding')) return true;
      await p.evaluate((where) => {
        const e = window.__eeri.exc;
        if (!e) return;
        window.__eeri.player.mercyT = 0;
        window.__eeri.debug.setPos(where ?? (e.x - 1.5), e.y + 0.1);
      }, place);
      await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
      await p.waitForTimeout(350);
    }
    return await p.evaluate(() => window.__eeri.mode() === 'riding');
  }

  await p.goto(base + '/eeri/?skip', { waitUntil: 'load' });
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
  const back = await p.waitForFunction(() => window.__eeri.player.grounded, null, { timeout: 8000 }).then(() => true).catch(() => false);
  ok('and gravity brings him back', back);

  // a bolt collects on touch
  const n0 = await p.evaluate(() => window.__eeri.collected());
  await p.evaluate(() => window.__eeri.debug.setPos(30.5, 4.2));
  await p.waitForTimeout(400);
  ok('walking into a bolt collects it', await p.evaluate(() => window.__eeri.collected()) > n0);

  // ---- THE CLIMB: the verb level 2 is built around --------------------
  // Level 1 is the stomp's level and carries no ladders on purpose (one idea
  // per level), so the climb is proved where it is taught.
  await p.evaluate(() => window.__eeri.debug.goSite(1));
  await p.waitForFunction(() => window.__eeri.site() === 1 && !window.__eeri.debug.transitioning(), null, { timeout: 8000 }).catch(() => {});
  const ladders = await p.evaluate(() => window.__eeri.debug.ladders());
  ok('level 2 is built on ladders', ladders.length > 0, JSON.stringify(ladders));
  const L = ladders[0];
  await p.evaluate((l) => window.__eeri.debug.setPos(l.c + 0.5, 4.1), L);
  await p.waitForTimeout(300);
  await p.evaluate(() => window.__eeri.debug.press('up'));
  const climbed = await p.waitForFunction(
    () => window.__eeri.debug.climbing() && window.__eeri.player.y > 5.2,
    null, { timeout: 8000 }).then(() => true).catch(() => false);
  ok('holding up on a ladder climbs it', climbed,
    'y=' + await p.evaluate(() => window.__eeri.player.y));

  // …and it TOPS OUT on the deck rather than one rung above it in the air,
  // which is what makes a ladder a route instead of a trap
  const topped = await p.waitForFunction(
    (l) => Math.abs(window.__eeri.player.y - (l.cy1 + 1)) < 0.2,
    L, { timeout: 12000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('up'));
  ok('the climb tops out with his feet on the deck', topped,
    `y=${await p.evaluate(() => window.__eeri.player.y)}, deck=${L.cy1 + 1}`);

  await p.evaluate(() => window.__eeri.debug.press('right'));
  const steppedOff = await p.waitForFunction(
    (l) => !window.__eeri.debug.climbing() && window.__eeri.player.x > l.c + 1.2
      && window.__eeri.player.grounded,
    L, { timeout: 8000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('and a direction steps him off onto it', steppedOff,
    'x=' + await p.evaluate(() => window.__eeri.player.x));

  // ---- the level's own furniture --------------------------------------
  const counts = await p.evaluate(() => window.__eeri.debug.counts());
  ok('the HUD counts THIS level: a hundred bolts and three golden',
    counts.ofBolts === 100 && counts.ofGolden === 3, JSON.stringify(counts));

  const cp = await p.evaluate(() => window.__eeri.debug.checkpoint());
  ok('the level has a midway checkpoint, and it starts unlit', cp && !cp.lit, JSON.stringify(cp));
  await p.evaluate((c) => window.__eeri.debug.setPos(c.x - 1, 4.2), cp);
  await p.evaluate(() => window.__eeri.debug.press('right'));
  const litUp = await p.waitForFunction(() => window.__eeri.debug.checkpoint()?.lit,
    null, { timeout: 8000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('running past it lights it', litUp);
  ok('…and falling out of the world then costs the middle of the level, not all of it',
    await p.evaluate(() => window.__eeri.level.fallRespawn(70).x) > 40);

  // the three kinds, and the one that is not stompable
  const kinds = await p.evaluate(() => window.__eeri.debug.robots().map((r) => r.kind));
  ok('the levels carry more than one kind of small thing', new Set(kinds).size > 1, kinds.join(','));
  const roll = await p.evaluate(() => window.__eeri.debug.robots().find((r) => r.kind === 'roller'));
  ok('…and the roller is the one you jump, not the one you land on',
    roll && roll.stompable === false);
  await p.evaluate(() => window.__eeri.debug.goSite(0));
  await p.waitForFunction(() => window.__eeri.site() === 0 && !window.__eeri.debug.transitioning(), null, { timeout: 8000 }).catch(() => {});

  // the ride: walk to the cab, climb in, drive, hop out
  await p.evaluate(() => {
    const e = window.__eeri.debug.excPos();
    window.__eeri.debug.setPos(e.x - 1.5, e.y + 0.1);
  });
  await p.waitForTimeout(200);
  let mounted = await mountUp();
  // A mount that fails says almost nothing on its own — it is four
  // conditions ANDed together in nearExc() — so it reports which one was
  // false. Guessing at ten minutes a run is not debugging.
  const why = await p.evaluate(() => {
    const e = window.__eeri.exc, pl = window.__eeri.player;
    if (!e) return { near: false, reason: 'no machine in this room' };
    return {
      mode: window.__eeri.mode(),
      dx: +(pl.x - e.x).toFixed(2), pl: +pl.y.toFixed(2), ex: +e.y.toFixed(2),
      grounded: pl.grounded, mercy: +pl.mercyT.toFixed(2), climbing: pl.climbing,
      near: Math.abs(pl.x - e.x) < 2.6 && pl.y > e.y - 1 && pl.y < e.y + 2.4 && pl.grounded,
    };
  });
  ok('E climbs into the excavator', mounted, JSON.stringify(why));

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
  // walk away and WAIT for it to settle rather than sampling once: the ride
  // above ends within the ball's six-tile wake radius, so it is mid-cycle
  // when we get here, and a fixed sleep is a coin flip in a sandbox that
  // runs the clock several times slower than the wall clock.
  await p.evaluate(() => window.__eeri.debug.setPos(4, 4.2));
  const rested = await p.waitForFunction(
    () => window.__eeri.debug.hazard()?.state === 'rest', null, { timeout: 20000 })
    .then(() => true).catch(() => false);
  ok('the wrecking ball hangs still when nobody is near', rested,
    'state=' + await p.evaluate(() => window.__eeri.debug.hazard()?.state));



  // RECORD the states rather than sampling for one: the telegraph is an
  // ORDER — wind before swing — and a poll can miss a phase entirely on a
  // machine rendering at a handful of frames a second, which says nothing
  // about whether the game told you first.
  await p.evaluate(() => {
    window.__ballLog = [];
    const tick = () => {
      const st = window.__eeri.debug.hazard()?.state;
      if (window.__ballLog[window.__ballLog.length - 1] !== st) window.__ballLog.push(st);
      requestAnimationFrame(tick);
    };
    tick();
  });
  await p.evaluate(() => window.__eeri.debug.setPos(37, 4.2));
  // the wind-up is 0.9s of GAME time and this sandbox runs several times
  // slower than the wall clock, so the budget is the frame rate's, not the
  // hazard's — the ORDER below is the actual assertion
  const swung = await p.waitForFunction(() => window.__ballLog.includes('swing'),
    null, { timeout: 45000 }).then(() => true).catch(() => false);
  const ballLog = await p.evaluate(() => window.__ballLog);
  // the telegraph is an ORDER, and the order is the assertion: it must go
  // through `wind` and it must not have swung before it. Written as
  // `wind < swing` this quietly fails whenever the swing has not arrived
  // YET — which turns a slow frame into a report that the game gave no
  // warning, the opposite of the truth.
  const iWind = ballLog.indexOf('wind'), iSwing = ballLog.indexOf('swing');
  ok('coming near winds it back first — it telegraphs',
    iWind >= 0 && (iSwing < 0 || iWind < iSwing), ballLog.join(' → '));
  ok('and only then does it swing', swung, ballLog.join(' → '));


  const struck = await p.waitForFunction(() => window.__eeri.debug.mercy() > 0, null, { timeout: 6000 }).then(() => true).catch(() => false);
  ok('the swing knocks the kid back (mercy frames, never death)', struck);
  ok('and he is still in the world afterwards',
    await p.evaluate(() => window.__eeri.player.y) > 0.9);

  // riding into it costs the RIDE, not the run (the Yoshi rule).
  // Mount well CLEAR of the ball first — it wakes within six tiles and would
  // throw him out of the cab before the test has asked it to — then drive
  // under it deliberately. The cab parks on its own track, not wherever
  // there happened to be floor.
  await p.evaluate(() => {
    window.__eeri.exc.x = 56; window.__eeri.exc.vx = 0; window.__eeri.player.mercyT = 0;
  });
  let rode = await mountUp();
  ok('back in the cab, clear of the ball', rode);

  // drive the cab under the ball deliberately — it hangs at 39 now, off the
  // machine's own run, which is the entire point of having moved it
  await p.evaluate(() => { window.__eeri.exc.x = 38.4; window.__eeri.player.mercyT = 0; });
  const thrown = await p.waitForFunction(() => window.__eeri.mode() !== 'riding', null, { timeout: 10000 }).then(() => true).catch(() => false);
  ok('a hit takes the ride, not the run (thrown clear of the cab)', thrown);

  // ---- the loop: dangerous until tamed, and a machine-shaped exit -------
  await p.reload({ waitUntil: 'load' });
  await p.waitForFunction(() => !!window.__eeri && window.__eeri.player.grounded, null, { timeout: 8000 });
  ok('the machine starts UNMANNED', await p.evaluate(() => !window.__eeri.debug.tamed()));
  ok('and the bank blocks the way out', await p.evaluate(() => window.__eeri.debug.bank()?.remaining) === 3);
  ok('the exit is not open at the start', await p.evaluate(() => !window.__eeri.debug.cleared()));
  // ---- the flag: it builds itself, and it goes off by being run past ----
  // Checked here, on a fresh level, because a flag never un-builds: asking
  // "does it start unbuilt" after driving the length of the room is asking
  // the wrong question.
  ok('the level ends in a flag, and it starts unbuilt',
    await p.evaluate(() => window.__eeri.debug.flag()?.phase) === -1,
    'phase=' + await p.evaluate(() => window.__eeri.debug.flag()?.phase));
  await p.evaluate(() => window.__eeri.debug.setPos(80, 4.2));
  await p.waitForFunction(() => window.__eeri.debug.flag()?.phase >= 0, null, { timeout: 8000 }).catch(() => {});
  ok('coming up on it starts building it',
    await p.evaluate(() => window.__eeri.debug.flag()?.phase) >= 0);
  await p.evaluate(() => window.__eeri.debug.setPos(89, 4.2));
  const built = await p.waitForFunction(() => window.__eeri.debug.flag()?.phase >= 2,
    null, { timeout: 10000 }).then(() => true).catch(() => false);
  ok('and arriving finishes it — all three phases', built,
    'phase=' + await p.evaluate(() => window.__eeri.debug.flag()?.phase));
  ok('…but it is not raised until it is passed',
    await p.evaluate(() => !window.__eeri.debug.flag()?.raised));


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
  await p.evaluate(() => { window.__eeri.exc.x = 56; });
  let ride = await mountUp();
  ok('reading the cycle gets you into the cab', ride);
  ok('and taming it kills the beacon', await p.evaluate(() => window.__eeri.debug.tamed()));

  // the bucket digs the bank down — the machine changes the level
  await p.evaluate(() => { window.__eeri.exc.x = 83; window.__eeri.debug.press('down'); });
  const dug = await p.waitForFunction(() => window.__eeri.debug.bank()?.cleared, null, { timeout: 45000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('down'));
  ok('the bucket digs the bank away', dug,
    'remaining=' + await p.evaluate(() => window.__eeri.debug.bank()?.remaining));
  ok('and the map really changed, not just the picture',
    await p.evaluate(() => !window.__eeri.level.solidCell(86, 4)));

  // out on foot, through the gate the machine opened — and the gate does
  // not end the job any more: the level goes beyond one room
  await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
  await p.waitForFunction(() => window.__eeri.mode() === 'foot', null, { timeout: 20000 }).catch(() => {});
  await p.evaluate(() => window.__eeri.debug.setPos(88, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  // A long window, not 8s: this walk is ~4.5 tiles plus the flag's build and
  // the site load, and a sandbox with no GPU renders at a handful of frames a
  // second (the house rule: judge game STATE, never the wall clock). At 8s it
  // flickered red purely with rendering load — instrumented by the art lane,
  // the player advances steadily and arrives at ~9-10s. The `transitioning`
  // half is the levels lane's and is kept: arriving is not the same as having
  // finished arriving, and without it the next check can read the old room.
  const site2 = await p.waitForFunction(
    () => window.__eeri.site() === 1 && !window.__eeri.debug.transitioning(),
    null, { timeout: 25000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('running past the flag ends the level and leads to LEVEL 2, not the credits', site2);
  ok('the room announces itself on the way in', await p.locator('#banner').count() === 1);
  ok('arriving clears nothing', await p.evaluate(() => !window.__eeri.debug.cleared()));
  // the count is the LEVEL's completion figure (DESIGN §4.2), so it starts
  // again with the level rather than running on across the job
  const c2 = await p.evaluate(() => window.__eeri.debug.counts());
  ok('the bolt count is the LEVEL\'s, and starts again with it',
    c2.bolts === 0 && c2.ofBolts === 100, JSON.stringify(c2));

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
  await p.evaluate(() => { window.__eeri.exc.x = 50; });
  let ride2 = await mountUp();
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
  await p.waitForFunction(() => window.__eeri.mode() === 'foot', null, { timeout: 20000 }).catch(() => {});
  await p.evaluate(() => window.__eeri.debug.setPos(56, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  // mid-span at ground height, grounded, over what used to be air = crossing
  const crossed = await p.waitForFunction(
    () => window.__eeri.player.x > 62 && window.__eeri.player.grounded && window.__eeri.player.y < 4.2,
    null, { timeout: 30000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('the kid crosses the span on foot', crossed,
    'x=' + await p.evaluate(() => window.__eeri.player.x));

  await p.evaluate(() => window.__eeri.debug.setPos(88, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  const site3 = await p.waitForFunction(() => window.__eeri.site() === 2 && !window.__eeri.debug.transitioning(), null, { timeout: 20000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('site 2 leads on to SITE 3', site3);

  // ---- SITE 3: the crane, and the third verb ----------------------------
  ok('the room parks a CRANE, not another excavator',
    await p.evaluate(() => window.__eeri.debug.machine()?.kind) === 'crane');
  ok('and it is unmanned like every machine on arrival',
    await p.evaluate(() => !window.__eeri.debug.machine()?.tamed));
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

  let onCrane = await mountUp();
  ok('reading the swing gets you into the crane', onCrane);

  // the ball that swung at you is the ball you swing at the wall
  await p.evaluate(() => { window.__eeri.exc.x = 77; window.__eeri.exc.vx = 0; });
  await p.waitForTimeout(300);
  await p.evaluate(() => window.__eeri.debug.press('down'));
  const cracked = await p.waitForFunction(() => window.__eeri.debug.wall()?.hits >= 1, null, { timeout: 30000 }).then(() => true).catch(() => false);
  ok('the first swing cracks the wall', cracked);
  ok('…and a cracked wall is still a wall',
    await p.evaluate(() => window.__eeri.debug.wall()?.cracked && !window.__eeri.debug.wall()?.cleared));
  const smashed = await p.waitForFunction(() => window.__eeri.debug.wall()?.cleared, null, { timeout: 30000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('down'));
  ok('the second brings it down', smashed);
  ok('and the map really changed — the brick is gone',
    await p.evaluate(() => !window.__eeri.level.solidCell(82, 4)));

  // out on foot, through the hole the crane made
  await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
  await p.waitForFunction(() => window.__eeri.mode() === 'foot', null, { timeout: 20000 }).catch(() => {});
  // the last level of a world carries the BIG flag — a different object, so
  // it is tellable from the small one before you reach it — and past it the
  // GATE, which is the world's curtain rather than the level's
  ok('the last level flies the big flag',
    await p.evaluate(() => window.__eeri.debug.flag()?.big) === true);
  await p.evaluate(() => window.__eeri.debug.setPos(85, 4.2));
  await p.waitForFunction(() => window.__eeri.debug.flag()?.phase >= 2, null, { timeout: 12000 }).catch(() => {});
  await p.evaluate(() => window.__eeri.debug.press('right'));
  const bigRaised = await p.waitForFunction(() => window.__eeri.debug.flag()?.raised,
    null, { timeout: 25000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('and it is run past like any other', bigRaised);
  ok('but it does NOT end the world by itself', await p.evaluate(() => !window.__eeri.debug.cleared()));

  await p.evaluate(() => window.__eeri.debug.setPos(89, 4.2));
  await p.evaluate(() => window.__eeri.debug.press('right'));
  const walkedOut = await p.waitForFunction(() => window.__eeri.debug.cleared(), null, { timeout: 25000 }).then(() => true).catch(() => false);
  await p.evaluate(() => window.__eeri.debug.release('right'));
  ok('walking out through the gate clocks the whole job out', walkedOut);
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

  // ---- controls: glyphs, never key names (DESIGN.md §5) -----------------
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');
    const hints = src.slice(src.indexOf('const HINT = {'), src.indexOf('};', src.indexOf('const HINT = {')));
    const named = (hints.match(/\b(SPACE|ENTER|SHIFT|CTRL|CLICK|MOUSE|W\s*S|A\s*D)\b/g) || []);
    ok(`no prompt names a key or a mouse${named.length ? ' — ' + [...new Set(named)] : ''}`,
      named.length === 0);
    // The buttons used to BE the glyph characters. They now carry drawn
    // faces (owner: "like old arcades with illustrated backboards"), so the
    // old textContent test no longer describes anything real. What still
    // has to hold is the correspondence: every control the prompts talk
    // about has a face drawn for it, and the glyph set covers exactly the
    // controls the input map binds — a set that drifts from the map is how
    // ▲ ends up illustrated as the thing ▼ does.
    {
      const g = fs.readFileSync(path.join(__dirname, '..', 'js', 'glyphs.js'), 'utf8');
      // scoped to the exported set, not the whole file: the pose table and
      // the direction ticks use the same words and matched too
      const block = g.slice(g.indexOf('export const GLYPHS = {'), g.indexOf('};', g.indexOf('export const GLYPHS = {')));
      const drawn = [...block.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
      const CONTROLS = ['left', 'right', 'up', 'down', 'jump', 'action'];
      ok('a face is drawn for every control, and only for those',
        CONTROLS.every((c) => drawn.includes(c)) && drawn.length === CONTROLS.length,
        drawn.join(','));
      const mainSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'main.js'), 'utf8');
      const bind = mainSrc.match(/bindButtons\(\{([^}]*)\}/);
      const bound = bind ? [...bind[1].matchAll(/'(\w+)'/g)].map((m) => m[1]) : [];
      ok('…and the glyph set matches the controls the game actually binds',
        bound.length > 0 && bound.every((c) => CONTROLS.includes(c)), bound.join(','));
    }
    // The rule is about the WORDS and is unaffected by the buttons gaining
    // pictures. It is checked against the language packs rather than against
    // whatever prompt happens to be on screen: several prompts are pure
    // sentences with no control in them at all ("CARRY IT TO THE GAP"), so
    // sampling the live hint tests the clock, not the rule.
    {
      const packs = fs.readFileSync(path.join(__dirname, '..', 'js', 'lang.js'), 'utf8');
      const prompts = [...packs.matchAll(/^\s{4}h[A-Z]\w*: '([^']*)'/gm)].map((m) => m[1]);
      ok('every language pack ships the in-play prompts', prompts.length >= 14 * 3, String(prompts.length));
      const keyed = prompts.filter((s2) => /\b(SPACE|ENTER|SHIFT|CTRL|CLICK|MOUSE|WASD)\b/i.test(s2));
      ok('no prompt in any language names a key or a mouse', keyed.length === 0, keyed.join(' | '));
      // and the ones that DO name a control name it as a glyph
      const withCtl = prompts.filter((s2) => /[◀▶▲▼ⒶⒷ]/.test(s2));
      ok('the prompts that name a control do it in glyphs', withCtl.length >= 8 * 3, String(withCtl.length));
    }
    // The on-screen controls only EXIST on a coarse pointer, and the Toko
    // badge takes a different inset there, so measuring them on the desktop
    // page tests a layout nobody ever sees. This opens a real landscape
    // phone — the shape that actually matters — and measures that.
    const phone = await b.newContext({
      viewport: { width: 750, height: 340 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3,
    });
    const pp = await phone.newPage();
    await pp.goto(base + '/eeri/?skip', { waitUntil: 'load' });
    await pp.waitForFunction(() => !!window.__eeri, null, { timeout: 12000 }).catch(() => {});
    await pp.waitForTimeout(600);
    const geo = await pp.evaluate(() => {
      const btns = [...document.querySelectorAll('#touch button')]
        .map((e) => ({ id: e.id, r: e.getBoundingClientRect() }));
      const badge = document.querySelector('[class*="toko"]');
      const hint = document.getElementById('hint');
      const over = (a, c) => !(a.right <= c.left || a.left >= c.right || a.bottom <= c.top || a.top >= c.bottom);
      return {
        n: btns.length,
        small: btns.filter((x) => x.r.width < 44 || x.r.height < 44).map((x) => x.id),
        pairs: btns.flatMap((x, i) => btns.slice(i + 1)
          .filter((y) => over(x.r, y.r)).map((y) => x.id + '/' + y.id)),
        onBadge: badge ? btns.filter((x) => over(x.r, badge.getBoundingClientRect())).map((x) => x.id) : [],
        hintTop: hint ? hint.getBoundingClientRect().top : 0,
        topBtn: Math.min(...btns.map((x) => x.r.top)),
        vh: innerHeight,
      };
    });
    await phone.close();
    ok('the on-screen controls are all there on a phone', geo.n >= 6);
    ok(`every on-screen button clears the 44 px floor${geo.small.length ? ' — ' + geo.small : ''}`,
      geo.small.length === 0);
    // A D-PAD'S ZONES MAY TOUCH. The pad is a painted backboard now (art
    // lane), and at 390px wide the DMG plate is 225px tall with drawn d-pad
    // arms of about 20px — so four zones that each clear the 44px floor
    // cannot also be disjoint. Adjacent zones are how a virtual d-pad has
    // always worked. What must never overlap is the FACE buttons, where an
    // ambiguous press means jumping when you meant to climb into a machine.
    {
      const DPAD = new Set(['tL', 'tR', 'tU', 'tD']);
      const bad = geo.pairs.filter((pair) => {
        const [a, b] = pair.split('/');
        return !(DPAD.has(a) && DPAD.has(b));
      });
      ok(`no two controls overlap, d-pad zones aside${bad.length ? ' — ' + bad.join(',') : ''}`,
        bad.length === 0);
    }
    // the badge is inert under a thumb, but it must not COVER a control —
    // v6 fixed this once for jump, and my first layout put Ⓑ under it
    ok(`the signature covers no control${geo.onBadge.length ? ' — ' + geo.onBadge : ''}`,
      geo.onBadge.length === 0);
    // and the controls must not eat the screen: on a landscape phone the
    // first cross layout stood 200 px tall and shoved the hint into the
    // middle of the picture
    ok(`the controls leave the picture alone (top ${Math.round(geo.topBtn)} of ${geo.vh})`,
      geo.topBtn > geo.vh * 0.45);
    ok('the hint sits above the controls', geo.hintTop < geo.topBtn);
    ok('the pad is polled in every mode, not just play',
      /pollGamepad\(\)/.test(src.slice(src.indexOf('setAnimationLoop'), src.indexOf('setAnimationLoop') + 400)));
  }

  // ---- THE ADDRESS: /eeri/#eeri-1-2 opens the second level --------------
  // The mapping itself is proved in test/rooms.mjs, in plain Node. What can
  // only be proved here is the WIRING: that a fragment actually boots that
  // room, that a level change rewrites the bar, and that an address naming a
  // level which is not built yet lands somewhere real instead of a black
  // screen — the game grows three levels at a time, so #eeri-2-1 is a link
  // somebody can hold before world 2 exists.
  //
  // Each check needs its own QUERY, not just its own fragment: a navigation
  // differing only after the '#' does not reload the page, so the assertions
  // would read the PREVIOUS room's game object and pass or fail for the wrong
  // reason. That cost a debugging pass. `?skip` walks past the title screen.
  {
    // the invariant, not a fixed string: the gate has already walked several
    // rooms by now, so what must hold is that the bar names the room you are
    // standing in — whichever that is.
    const agrees = await p.evaluate(() => {
      const i = window.__eeri.site();
      return location.hash === `#eeri-${Math.floor(i / 3) + 1}-${(i % 3) + 1}`;
    });
    ok('the address in the bar always names the room you are in', agrees,
      await p.evaluate(() => `${location.hash} at site ${window.__eeri.site()}`));
    ok('the HUD shows the address beside the name',
      /^\d+-\d+ · /.test(await p.evaluate(() => document.getElementById('site').textContent)),
      await p.evaluate(() => document.getElementById('site').textContent));

    await p.goto(base + '/eeri/?skip&a=1#eeri-1-2', { waitUntil: 'load' });
    await p.waitForFunction(() => !!window.__eeri, null, { timeout: 20000 }).catch(() => {});
    ok('#eeri-1-2 boots straight into the second level',
      await p.evaluate(() => window.__eeri.site()) === 1,
      'site=' + await p.evaluate(() => window.__eeri.site()));
    ok('…and it really is the room it names',
      (await p.evaluate(() => window.__eeri.level.def.name)).includes('SCAFFOLD'));

    await p.goto(base + '/eeri/?skip&a=2#1-3', { waitUntil: 'load' });
    await p.waitForFunction(() => !!window.__eeri, null, { timeout: 20000 }).catch(() => {});
    ok('the bare form works, and is rewritten to the full one',
      await p.evaluate(() => window.__eeri.site()) === 2
      && await p.evaluate(() => location.hash) === '#eeri-1-3',
      await p.evaluate(() => location.hash));

    await p.goto(base + '/eeri/?skip&a=3#eeri-2-1', { waitUntil: 'load' });
    await p.waitForFunction(() => !!window.__eeri, null, { timeout: 20000 }).catch(() => {});
    ok('an address for a level that is not built yet falls back to 1-1',
      await p.evaluate(() => window.__eeri.site()) === 0);

    await p.goto(base + '/eeri/?skip&a=4#totally-bogus', { waitUntil: 'load' });
    await p.waitForFunction(() => !!window.__eeri, null, { timeout: 20000 }).catch(() => {});
    ok('and so does nonsense', await p.evaluate(() => window.__eeri.site()) === 0);

    await p.evaluate(() => window.__eeri.debug.goSite(1));
    await p.waitForFunction(() => window.__eeri.site() === 1 && !window.__eeri.debug.transitioning(),
      null, { timeout: 20000 }).catch(() => {});
    ok('changing level rewrites the address',
      await p.evaluate(() => location.hash) === '#eeri-1-2',
      await p.evaluate(() => location.hash));
  }

  // ---- the gizmo kit, in the lab ----------------------------------------
  // A belt is a floor that moves you and a tarp is a floor that throws you,
  // so both are proved by standing still on one: anything that happens is
  // the gizmo's doing, not the player's.
  await p.evaluate(() => window.__eeri.debug.goLab());
  const inLab = await p.waitForFunction(
    () => !window.__eeri.debug.transitioning() && (window.__eeri.debug.gizmos().belts || []).length > 0,
    null, { timeout: 15000 }).then(() => true).catch(() => false);
  ok('the gizmo lab builds', inLab);

  if (inLab) {
    const giz = await p.evaluate(() => window.__eeri.debug.gizmos());
    // WATER, both kinds, in the lab that exists to prove the kit.
    const wat = giz.water || [];
    ok('the lab carries both kinds of water', wat.length >= 2
      && wat.some((q) => !q.deep) && wat.some((q) => q.deep), JSON.stringify(wat));

    const sh = wat.find((q) => !q.deep);
    if (sh) {
      // SHALLOW is a floor that slows you. Measured as a RACE rather than by
      // reading a constant: run the same 4 tiles on dry land and in water and
      // compare, because a test that reads WADE back out of the game proves
      // only that the number exists.
      const runFor = async (x0) => {
        await p.evaluate((x) => { window.__eeri.debug.setPos(x, 4.2); }, x0);
        await p.waitForTimeout(120);
        await p.evaluate(() => window.__eeri.debug.press('right'));
        await p.waitForFunction((x) => window.__eeri.player.x > x + 3.5, x0, { timeout: 20000 })
          .catch(() => {});
        const v = await p.evaluate(() => Math.abs(window.__eeri.player.vx));
        await p.evaluate(() => window.__eeri.debug.release('right'));
        return v;
      };
      const dryV = await runFor(sh.c0 - 8);
      const wetV = await runFor(sh.c0 + 0.5);
      ok('standing in shallow water reads as water', await p.evaluate(() => window.__eeri.debug.wading()));
      ok(`wading is slower than running (${wetV.toFixed(2)} vs ${dryV.toFixed(2)} tiles/s)`,
        wetV < dryV * 0.75 && wetV > 0.5);
    }

    const dp = wat.find((q) => q.deep);
    if (dp) {
      // DEEP is a hole wearing different paint, and DESIGN §4.1 is the point:
      // it must HAND HIM BACK, never hurt him. Dropped into the middle of it,
      // he ends up on the dry side of the near lip with his health untouched
      // (there is no health), which is the promise the whole world rests on.
      await p.evaluate((d) => window.__eeri.debug.setPos((d.c0 + d.c1) / 2 + 0.5, 4.2), dp);
      const handedBack = await p.waitForFunction(
        (d) => window.__eeri.player.y > 3 && window.__eeri.player.x < d.c0,
        dp, { timeout: 15000 }).then(() => true).catch(() => false);
      ok('deep water hands him back to the near lip rather than drowning him', handedBack,
        'x=' + await p.evaluate(() => window.__eeri.player.x.toFixed(1)));
      // …on something STANDABLE, which the shallows are — the lip he is
      // handed to here is a puddle, and that is a legitimate place to be put
      // down. `fallRespawn` returns him a tile ABOVE the lip, so this waits
      // for the landing rather than sampling mid-drop.
      const landed = await p.waitForFunction(() => window.__eeri.player.grounded,
        null, { timeout: 10000 }).then(() => true).catch(() => false);
      ok('…and he lands on a floor, out of the deep', landed,
        'y=' + await p.evaluate(() => window.__eeri.player.y.toFixed(2)));
    }

    // THE PIPE: a tube you go inside. Stand at a mouth, press the action,
    // come out the other end — and the assertions are the two halves of the
    // contract: you actually MOVE, and you are somewhere standable when you
    // land, which is what `check()` proves geometrically and this proves in
    // the running game.
    const pipes = await p.evaluate(() => window.__eeri.debug.pipes());
    ok('the lab carries a pipe', pipes.length >= 1, JSON.stringify(pipes));
    if (pipes.length) {
      const q = pipes[0];
      await p.evaluate((m) => window.__eeri.debug.setPos(m.c + 0.5, m.cy + 0.05), q.a);
      await p.waitForTimeout(250);
      ok('standing at a mouth offers the pipe',
        (await p.evaluate(() => document.getElementById('hint').textContent)).toUpperCase()
          .includes('PIPE'),
        await p.evaluate(() => document.getElementById('hint').textContent));

      await p.evaluate(() => { window.__eeri.debug.press('action'); window.__eeri.debug.release('action'); });
      const cameOut = await p.waitForFunction(
        (m) => Math.abs(window.__eeri.player.x - (m.c + 0.5)) < 1.2 && window.__eeri.mode() === 'foot',
        q.b, { timeout: 15000 }).then(() => true).catch(() => false);
      ok('going in one mouth brings you out the other', cameOut,
        'x=' + await p.evaluate(() => window.__eeri.player.x.toFixed(1))
        + ' wanted ~' + (q.b.c + 0.5));
      ok('…and he is standing on something when he arrives',
        await p.evaluate(() => window.__eeri.player.grounded));
      // the far mouth is a mouth too — without a cooldown it swallows him
      // straight back, and the trip becomes a loop he cannot leave
      await p.waitForTimeout(700);
      ok('…and the far mouth does not send him straight back',
        Math.abs(await p.evaluate(() => window.__eeri.player.x) - (q.b.c + 0.5)) < 1.5,
        'x=' + await p.evaluate(() => window.__eeri.player.x.toFixed(1)));
    }

    // THE BELT: stand still on it and the floor takes you somewhere
    const b = giz.belts.find((x) => x.dir > 0);
    await p.evaluate((v) => window.__eeri.debug.setPos(v.c0 + 0.5, v.cy + 1.2), b);
    const carried = await p.waitForFunction(
      (v) => window.__eeri.player.x > v.c0 + 1.4 && Math.abs(window.__eeri.player.vx) < 0.1,
      b, { timeout: 15000 }).then(() => true).catch(() => false);
    ok('a belt carries him along it while he stands still', carried,
      'x=' + await p.evaluate(() => window.__eeri.player.x));

    // …and it moves the FLOOR, not him: his own speed is untouched
    ok('…and it does it without touching his own speed',
      Math.abs(await p.evaluate(() => window.__eeri.player.vx)) < 0.1);

    // THE TARP: dropped on, it throws him higher than his own jump can go
    const t = giz.tarps[0];
    await p.evaluate((v) => {
      window.__eeri.player.mercyT = 0;
      window.__eeri.debug.setPos((v.c0 + v.c1) / 2 + 0.5, v.cy + 3.5);
    }, t);
    const thrown = await p.waitForFunction(() => window.__eeri.player.vy > 13,
      null, { timeout: 15000 }).then(() => true).catch(() => false);
    ok('landing on a tarp throws him back up', thrown,
      'vy=' + await p.evaluate(() => window.__eeri.player.vy));
    const apex = await p.evaluate(async () => {
      let top = window.__eeri.player.y;
      for (let i = 0; i < 200; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        top = Math.max(top, window.__eeri.player.y);
        if (window.__eeri.player.grounded && i > 20) break;
      }
      return top;
    });
    ok(`…higher than any jump reaches (apex ${apex.toFixed(1)}, a jump is 2.65 tiles)`,
      apex > t.cy + 1 + 3.6, 'apex=' + apex.toFixed(2));
  }

  await p.evaluate(() => window.__eeri.debug.goSite(2));
  await p.waitForFunction(() => window.__eeri.site() === 2 && !window.__eeri.debug.transitioning(), null, { timeout: 15000 }).catch(() => {});

  // ---- the stomp --------------------------------------------------------
  // Dropped from a height measured off the TARGET, not from a fixed 7.5: the
  // levels now stand small machines on decks and the kinds are different
  // heights, so a constant that meant "well above a 0.7-tile robot on the
  // floor" can mean "already inside a 1.0-tile hopper on a deck at cy 7" —
  // which is a hit, correctly, and reads as a broken stomp. And it must pick
  // a STOMPABLE one: the roller is the kind you jump, so landing on it is
  // meant to bounce you off without killing it.
  const target = await p.evaluate(() => {
    const r = window.__eeri.debug.robots().find((x) => !x.dead && x.stompable);
    if (!r) return null;
    window.__eeri.player.mercyT = 0;
    window.__eeri.debug.setPos(r.x, r.y + r.h + 2.5);
    return r;
  });
  ok('there is something stompable to land on', !!target, JSON.stringify(target));
  const stomped = await p.waitForFunction(() => window.__eeri.debug.stomps() > 0, null, { timeout: 5000 })
    .then(() => true).catch(() => false);
  ok('landing on a small machine stomps it', stomped);
  ok('and the stomp bounces him back up', await p.evaluate(() => window.__eeri.player.vy) > 3);
  ok('it does not also count as being hit', await p.evaluate(() => window.__eeri.debug.mercy()) === 0);
  ok('the stomped one is dead', await p.evaluate(() =>
    window.__eeri.debug.robots().some((r) => r.dead)));

  // every asset the manifest calls live must actually have been requested
  {
    const live = [];
    for (const kind of ['models', 'pieces']) {
      for (const m of Object.values(manifest[kind] || {})) {
        if (m.status === 'live') live.push(path.basename(m.file));
      }
    }
    for (const layers of Object.values(manifest.layers || {})) {
      for (const l of Object.values(layers)) {
        if (l.status === 'live') live.push(path.basename(l.file));
      }
    }
    const missed = live.filter((f) => !fetched.has(f));
    ok(`every live asset is actually fetched${missed.length ? ' — never asked for: ' + missed.join(', ') : ''}`,
      missed.length === 0);
  }

  // ---- the two MOMENTS on the rig ---------------------------------------
  // `stomp` and `hurt` are one-shot clips over the top of the state machine,
  // and the first wiring of them never fired at all: main.js resolves stomps
  // and hits AFTER player.update() has drawn the frame, so a flag set then
  // was cleared at the top of the next update before the visual read it.
  // Nothing else in the suite would notice — the game plays identically with
  // a rig that simply never reacts.
  {
    const rigged = await p.evaluate(() => !!window.__eeri.player.kid.clips);
    ok('the kid is on a skinned rig with clips', rigged);
    if (rigged) {
      const has = await p.evaluate(() => Object.keys(window.__eeri.player.kid.clips.actions));
      ok('the rig carries stomp and hurt', has.includes('stomp') && has.includes('hurt'), has.join(','));

      await p.evaluate(() => window.__eeri.player.bounce());
      ok('a bounce plays the stomp clip',
        await p.evaluate(() => window.__eeri.player.kid.clips.current) === 'stomp');

      await p.evaluate(() => { window.__eeri.player.mercyT = 0; window.__eeri.player.struck(window.__eeri.player.x + 5); });
      ok('a hit plays the hurt clip',
        await p.evaluate(() => window.__eeri.player.kid.clips.current) === 'hurt');

      // …and it must RELEASE. Judged on game time, never the wall clock:
      // this sandbox renders at a handful of frames a second.
      const t0 = await p.evaluate(() => window.__eeri.player.t);
      const freed = await p.waitForFunction(
        (t) => window.__eeri.player.t > t + 1.2 && !window.__eeri.player.kid.clips.shotUntil,
        t0, { timeout: 60000 }).then(() => true).catch(() => false);
      ok('…and a one-shot hands the rig back to the state machine', freed);
    }
  }

  ok('no errors after the whole ride', errs.length === 0, errs.slice(0, 3).join(' | '));

  // ---- THE TITLE SCREEN, and the three languages -------------------------
  // Every other check above loads `?skip`, which walks past the intro so the
  // gate is testing the game rather than a button. That makes it exactly the
  // kind of thing that rots unwatched, so it gets its own page — in Finnish,
  // because the player is a Finnish six-year-old and that is the case which
  // was broken for fourteen versions.
  {
    const ip = await b.newPage({ viewport: { width: 844, height: 390 }, locale: 'fi-FI' });
    const ierr = [];
    ip.on('pageerror', (e) => ierr.push(String(e)));
    await ip.goto(base + '/eeri/', { waitUntil: 'load' });
    const shown = await ip.waitForSelector('#intro', { timeout: 20000 }).then(() => true).catch(() => false);
    ok('the game opens on a title screen, not straight into level 1', shown);

    if (shown) {
      await ip.waitForTimeout(400);
      const txt = await ip.evaluate(() => document.getElementById('intro').innerText);
      // the owner's own words, and the reason this screen exists
      ok('the title screen carries the story brief, in Finnish',
        txt.includes('seikkailee työkoneiden ja robottien maailmassa'), txt.replace(/\n/g, ' | '));
      ok('…and the browser language decided that, not a default',
        await ip.evaluate(() => document.documentElement.lang) === 'fi');
      ok('all three languages are offered',
        await ip.evaluate(() => document.querySelectorAll('#intro .lang button').length) === 3);

      // switching is the whole point of putting the toggle here
      await ip.click('#intro .lang button:nth-child(3)');
      await ip.waitForTimeout(150);
      ok('switching to Japanese rewrites the brief',
        (await ip.evaluate(() => document.getElementById('introBrief').textContent)).includes('はたらくくるま'));
      await ip.click('#intro .lang button:nth-child(1)');
      await ip.waitForTimeout(150);

      // 44px floor applies here like everywhere else on this site
      const small = await ip.evaluate(() => [...document.querySelectorAll('#intro button')]
        .map((e) => ({ t: e.textContent.trim(), h: Math.round(e.getBoundingClientRect().height) }))
        .filter((e) => e.h < 44));
      ok('every control on the title screen clears 44px', small.length === 0, JSON.stringify(small));

      // and it must actually let you in
      await ip.click('#introStart');
      const started = await ip.waitForFunction(() => window.__eeri, null, { timeout: 90000 })
        .then(() => true).catch(() => false);
      ok('START starts the game', started);
    }
    ok('no errors on the title screen', ierr.length === 0, ierr.slice(0, 2).join(' | '));
    await ip.close();
  }

  // ---- the pad, on a thumb -----------------------------------------------
  // The layout is owner-specified (◀ ▼ ▶ with ▲ above) and every button
  // carries a picture of its action rather than an arrow, so both are worth
  // asserting: a glyph set that silently stops rendering leaves six blank
  // circles, which looks like a broken game and passes every other check.
  {
    const tp = await b.newPage({
      viewport: { width: 844, height: 390 }, locale: 'fi-FI', hasTouch: true, isMobile: true,
    });
    await tp.goto(base + '/eeri/?skip', { waitUntil: 'load' });
    await tp.waitForFunction(() => window.__eeri, null, { timeout: 90000 });
    await tp.waitForTimeout(800);
    const pad = await tp.evaluate(() => ['tL', 'tD', 'tR', 'tU', 'tA', 'tJ'].map((id) => {
      const e = document.getElementById(id); const r = e.getBoundingClientRect();
      return { id, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width),
               h: Math.round(r.height), art: !!e.querySelector('svg,img'), label: e.getAttribute('aria-label') };
    }));
    const by = Object.fromEntries(pad.map((q) => [q.id, q]));
    ok('every pad button carries a picture of its action, not a bare arrow',
      pad.every((q) => q.art), pad.filter((q) => !q.art).map((q) => q.id).join(','));
    ok('every pad button clears 44px', pad.every((q) => q.w >= 44 && q.h >= 44));
    ok('every pad button is named in the player\'s language',
      pad.every((q) => q.label && /[a-zåäö]/i.test(q.label)) && by.tL.label.includes('vasemmalle'),
      by.tL.label);
    // the owner's layout: down BETWEEN left and right, up ABOVE
    ok('down sits between left and right', by.tL.x < by.tD.x && by.tD.x < by.tR.x,
      `L${by.tL.x} D${by.tD.x} R${by.tR.x}`);
    ok('up sits above, in the middle column', by.tU.y < by.tD.y && by.tU.x === by.tD.x,
      `U(${by.tU.x},${by.tU.y}) D(${by.tD.x},${by.tD.y})`);
    // …and nothing is stacked more than two high: this is a landscape phone
    // The "never more than two rows" rule belonged to the DRAWN buttons this
    // lane laid out. The pad is a painted backboard now and the arrangement
    // is the ART's — a DMG face in portrait, an arcade panel in landscape —
    // so what must hold is that the plate is mounted and every hit area
    // actually sits on it, rather than a row count.
    ok('the touch plate is mounted',
      await tp.evaluate(() => document.documentElement.classList.contains('plated')));
    // THE STICKER IS ON THE PLATE, WHICH IS A LAYER QUESTION, NOT A
    // z-index ONE. `#touch` was left at `z-index: auto`, so the whole hit
    // layer — buttons, press tint and the Toko sticker with it — painted
    // *under* `#pad`; a z-index of 9999 on the badge itself changed
    // nothing, because a child cannot climb out of its parent's layer.
    // Nothing was visible through the plated buttons except those two
    // things, so it read as "the sticker never mounted".
    ok('the sticker layer sits above the plate', await tp.evaluate(() => {
      const z = (id) => { const v = getComputedStyle(document.getElementById(id)).zIndex; return v === 'auto' ? 0 : +v; };
      const bd = document.querySelector('.toko-signature');
      return !!bd && !!bd.closest('#touch') && z('touch') > z('pad');
    }));
    ok('…and every hit area sits over the plate', await tp.evaluate(() => {
      const img = [...document.querySelectorAll('#pad img')].find((i) => getComputedStyle(i).display !== 'none');
      if (!img) return false;
      const r = img.getBoundingClientRect();
      return ['tU', 'tD', 'tL', 'tR', 'tA', 'tJ'].every((id) => {
        const b = document.getElementById(id).getBoundingClientRect();
        const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
      });
    }));
    await tp.close();
  }

  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
