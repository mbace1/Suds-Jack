// Toko Trip — the gate.
//
//   node toko-trip/test/smoke.cjs
//
// Everything here is driven off game state through `window.__tt`, never off
// the wall clock: a sandbox with no GPU renders this at a handful of frames a
// second, and a test that waits for seconds is a test that fails on a slow
// machine and passes on a fast one for the same broken code.
//
// XR itself cannot be driven headlessly — there is no headset here — so what
// this can honestly check is everything up to and including the interaction
// logic: the terrain function, the teleport clamp, the moods, the book, the
// radio and its attribution, the way home. What it cannot check is the part
// that needs eyes and a head, and it does not pretend to.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png',
};

let pass = 0, fail = 0;
const check = (label, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  ok ? pass++ : fail++;
};

(async () => {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });

  // ── it boots ──
  await page.goto(`${base}/toko-trip/`, { waitUntil: 'domcontentloaded' });
  let booted = true;
  try {
    await page.waitForFunction(() => window.__tt && window.__tt.renderer, null, { timeout: 120000 });
  } catch (e) { booted = false; }
  check('the island boots and exposes __tt', booted);
  if (!booted) { console.log('\nnothing else can be checked'); process.exit(1); }

  const scene = await page.evaluate(() => {
    let meshes = 0, points = 0, lights = 0, casters = 0;
    window.__tt.scene.traverse(o => {
      if (o.isMesh) meshes++;
      if (o.isPoints) points++;
      if (o.isLight) lights++;
      if (o.castShadow) casters++;
    });
    return { meshes, points, lights, casters, tier: window.__tt.TIER };
  });
  check(`the scene is populated (${scene.meshes} meshes, ${scene.points} clouds)`,
    scene.meshes > 15 && scene.points >= 3);
  check(`things cast shadows (${scene.casters})`, scene.casters > 3);
  check(`a quality tier was chosen (${scene.tier.name})`,
    scene.tier.fb > 0 && scene.tier.shadow >= 1024 && scene.tier.seg >= 100);

  // ── the terrain, which is one function everything else asks ──
  const land = await page.evaluate(() => {
    const g = window.__tt.groundHeight, c = window.__tt.chair;
    // walk out along the direction the chair FACES
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const ahead = [2, 4, 6, 8].map(d => +g(c.p[0] + fx * d, c.p[2] + fz * d).toFixed(3));
    // and out the back, which should be the mellow beach
    const behind = [4, 6, 8, 10, 12, 14].map(d => +g(-fx * d, -fz * d).toFixed(3));
    return { pad: +g(0, 0).toFixed(3), ahead, behind, far: +g(0, 24).toFixed(2) };
  });
  check(`the pad under the chair is level (${land.pad})`, Math.abs(land.pad - 0.92) < 0.02);
  // THE REGRESSION THIS GATE EXISTS FOR: the chair once faced inland, which
  // sat you with your back to the cove. Assert it behaviourally — a few steps
  // in front of the seat there must be water.
  check(`the chair faces the water (${land.ahead.join(' ')})`, land.ahead.some(h => h < -0.1));
  check('and the cove is water the whole way out, not a puddle',
    land.ahead[land.ahead.length - 1] < -0.1);
  // a mellow beach: falling, but never a cliff between samples
  const steps = land.behind.slice(1).map((h, i) => land.behind[i] - h);
  check(`the beach falls away gently (${land.behind.join(' ')})`,
    steps.every(s => s < 0.75) && land.behind[0] > land.behind[land.behind.length - 1]);
  check(`and the sea bed is deep further out (${land.far})`, land.far < -1);

  // ── the teleport clamp asks that same function ──
  const tp = await page.evaluate(() => {
    const can = window.__tt.debug.canTeleport, c = window.__tt.chair;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    return { water: can(fx * 8, fz * 8), sand: can(-fx * 8, -fz * 8), far: can(0, 40) };
  });
  check('you cannot teleport into the cove', tp.water === false);
  check('you can teleport onto the beach', tp.sand === true);
  check('and not off the edge of the world', tp.far === false);

  // ── the moods ──
  const moods = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < window.__tt.MOODS.length; i++) {
      window.__tt.setMood(i, true);
      const s = window.__tt.scene;
      out.push({
        i: window.__tt.mood,
        name: window.__tt.MOODS[i].name,
        fog: s.fog.color.getHexString(),
        far: s.fog.far,
      });
    }
    window.__tt.setMood(0, true);
    return out;
  });
  check(`there are ${moods.length} moods and each one selects`,
    moods.every((m, i) => m.i === i) && moods.length >= 3);
  check(`and each repaints the world (${moods.map(m => m.fog).join(' ')})`,
    new Set(moods.map(m => m.fog)).size === moods.length);

  // ── the book ──
  const bookRun = [];
  const pageCount = await page.evaluate(() => window.__tt.debug.book().pages);
  for (let i = 0; i < Math.ceil(pageCount / 2) + 1; i++) {
    bookRun.push(await page.evaluate(() => {
      window.__tt.debug.bookAct();
      return window.__tt.debug.book();
    }));
  }
  check('the book opens on the first page', bookRun[0].open === true && bookRun[0].page === 0);
  check('and turns two pages at a time', bookRun[1].open === true && bookRun[1].page === 2);
  check('and shuts itself at the end rather than running off it',
    bookRun[bookRun.length - 1].open === false && bookRun[bookRun.length - 1].page === 0);

  // ── the radio, and the credit it is required to carry ──
  const list = await page.evaluate(() => window.__tt.debug.PLAYLIST);
  const unattributed = list.filter(t => !t.title || !t.artist || !t.note || !t.source);
  check(`every track names its artist and why it is free to play${unattributed.length ? ` — ${unattributed.map(t => t.file)}` : ''}`,
    list.length > 0 && unattributed.length === 0);
  const dead = [];
  for (const t of list) {
    if (/^https?:/.test(t.file)) continue;             // an off-site URL is not ours to check
    const r = await page.request.get(`${base}/toko-trip/${t.file}`);
    if (!r.ok()) dead.push(t.file);
  }
  check(`and every track file is really there${dead.length ? ` — ${dead}` : ''}`, dead.length === 0);

  // pressing it must say something IMMEDIATELY — decoding a 78 takes seconds,
  // and a button that looks dead for three of them gets pressed twice
  const firstPress = await page.evaluate(() => {
    window.__tt.debug.radioToggle();
    return window.__tt.debug.radio();
  });
  check('pressing the radio shows a card at once, before the record decodes',
    firstPress.on === true && firstPress.plaque === true);
  const cycle = [firstPress];
  for (let i = 0; i < list.length + 1; i++) {
    cycle.push(await page.evaluate(() => {
      window.__tt.debug.radioToggle();
      return window.__tt.debug.radio();
    }));
  }
  check(`the radio walks every track then its own bed then off (${cycle.map(c => c.track).join(' ')})`,
    cycle[cycle.length - 1].on === false && cycle[cycle.length - 1].plaque === false);

  // ── the way home ──
  check('there is a sign, and it is a ray target',
    await page.evaluate(() => !!window.__tt.debug.sign
      && window.__tt.debug.rayTargets.includes(window.__tt.debug.sign)));
  await page.evaluate(() => window.__tt.debug.goHome());
  await page.waitForFunction(() => document.querySelector('#cabinets .cab'), null, { timeout: 20000 })
    .catch(() => {});
  check(`the sign takes you to the arcade (${new URL(page.url()).pathname})`,
    new URL(page.url()).pathname === '/' || page.url().endsWith('/index.html'));
  check('and the arcade is really there when you land',
    await page.locator('#cabinets .cab').count() > 0);

  // ── the calibration tool ──
  const lab = await browser.newPage();
  const labErrors = [];
  lab.on('pageerror', e => labErrors.push(String(e)));
  await lab.goto(`${base}/toko-trip/chair-lab.html`, { waitUntil: 'domcontentloaded' });
  await lab.waitForFunction(() => window.__ttlab, null, { timeout: 30000 }).catch(() => {});
  check('chair-lab boots', await lab.evaluate(() => !!window.__ttlab));
  const labSays = await lab.evaluate(() => document.getElementById('status')?.textContent ?? '');
  // no headset in a sandbox: it must SAY so rather than sit there looking broken
  check(`and says why it cannot calibrate here ("${labSays.slice(0, 46)}…")`,
    /not (supported|available)/i.test(labSays));
  check('chair-lab throws nothing', labErrors.length === 0);
  await lab.close();

  // ── the way back, the same one every cabinet carries ──
  const home = await page.goto(`${base}/toko-trip/`, { waitUntil: 'domcontentloaded' })
    .then(() => page.waitForSelector('.arcade-home', { timeout: 20000 }).then(() => true, () => false));
  check('the island carries the arcade home button', home);

  check(`zero page errors${errors.length ? ` — ${errors.slice(0, 2)}` : ''}`, errors.length === 0);

  await browser.close();
  server.close();

  console.log(`\n${fail === 0 ? 'all' : `${pass}/${pass + fail}`} toko-trip checks passed${fail ? ` — ${fail} FAILED` : ''}`);
  process.exit(fail === 0 ? 0 : 1);
})();
