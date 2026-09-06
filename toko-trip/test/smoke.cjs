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
  // point clouds: the foam line and the fireflies. The foam was two clouds
  // until v7 folded them into one line that follows the water's reach.
  check(`the scene is populated (${scene.meshes} meshes, ${scene.points} clouds)`,
    scene.meshes > 15 && scene.points >= 2);
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

  // ── comfort, and the slate that sets it ──
  // These are the dials that can only be judged with the headset on, so the
  // thing worth gating is that they can be MOVED with the headset on: one
  // mesh, four rows read off a UV, and a menu read off a UV is one bad
  // divisor away from every tap moving the wrong setting.
  const comfort0 = await page.evaluate(() => window.__tt.debug.comfort());
  check(`comfort starts on its defaults (${comfort0.speed} · ${comfort0.turn} · edges ${comfort0.vig} · sound ${comfort0.sound})`,
    comfort0.speed === 'easy' && comfort0.turn === 'snap 30'
    && comfort0.vig === 1 && comfort0.sound === 1);
  check('the slate is a ray target',
    await page.evaluate(() => window.__tt.debug.rayTargets.includes(window.__tt.debug.slate)));
  const vig = await page.evaluate(() => window.__tt.debug.vignette());
  check(`the vignette is open while you stand still (${vig.opacity})`, vig.on === false);
  // it must hang off the HEAD: a vignette parented to the world is a black
  // ring you walk out of, which is worse than not having one
  check('and it is a mesh on the camera, not a post pass', await page.evaluate(() => {
    let found = false;
    window.__tt.camera.traverse(o => { if (o.isMesh && o.renderOrder === 999) found = true; });
    return found;
  }));

  await page.waitForFunction(() => window.__tt.debug.perf().fps > 0, null, { timeout: 60000 })
    .catch(() => {});
  const perf = await page.evaluate(() => window.__tt.debug.perf());
  check(`the frame cost is measurable (${perf.fps} fps · ${perf.ms} ms · ${perf.calls} draws · ${perf.backend})`,
    perf.fps > 0 && perf.calls > 0 && perf.tris > 0);
  check('and it is off until it is asked for', perf.on === false);

  const rows = await page.evaluate(() => {
    const d = window.__tt.debug, seen = [];
    d.slateAct(0);
    const perfOn = d.perf().on;
    for (const row of [1, 1, 1, 2, 3, 4]) { d.slateAct(row); seen.push(d.comfort()); }
    return { perfOn, seen };
  });
  check('the top row turns the readout on from inside the headset', rows.perfOn === true);
  check(`GLIDE cycles and wraps (${rows.seen.slice(0, 3).map(c => c.speed).join(' ')})`,
    rows.seen[0].speed === 'brisk' && rows.seen[1].speed === 'gentle' && rows.seen[2].speed === 'easy');
  check(`TURN cycles (${rows.seen[3].turn})`, rows.seen[3].turn === 'snap 45');
  check(`EDGES toggles (${rows.seen[4].vig})`, rows.seen[4].vig === 0);
  check(`SOUND toggles (${rows.seen[5].sound})`, rows.seen[5].sound === 0);
  // and one row must not move another: the UV divisor is the whole menu
  check('and one row moves one dial',
    rows.seen[5].speed === 'easy' && rows.seen[5].turn === 'snap 45' && rows.seen[5].vig === 0);
  check('and SOUND really silences everything, not just the surf',
    await page.evaluate(() => window.__tt.debug.air().master) === 0);
  await page.evaluate(() => window.__tt.debug.setComfort('sound', 1));
  check('and turning it back on restores it',
    await page.evaluate(() => window.__tt.debug.air().master) === 1);

  // ── the soundscape ──
  // The point of it is that it comes from SOMEWHERE. A bed panned to the
  // middle of your head is a soundtrack; the surf has to be at the water,
  // so that walking down the beach walks into it.
  const air = await page.evaluate(() => window.__tt.debug.air());
  check(`the sound started with the island (${air.surf.length} surf emitters, ${air.wind.length} in the crowns)`,
    air.started === true && air.surf.length >= 4 && air.wind.length >= 1);
  const offshore = air.surf.filter(v => Math.abs(v.ground) > 0.12);
  check(`and every surf emitter sits on the waterline${offshore.length ? ` — ${offshore.map(v => v.ground)}` : ''}`,
    offshore.length === 0);
  check(`and they are spread round the island, not stacked (${air.surf.map(v => v.at[0]).join(' ')})`,
    new Set(air.surf.map(v => v.at.join(','))).size === air.surf.length);
  // the wash must breathe with the tide that is drawn, not on its own clock
  const breath = await page.evaluate(async () => {
    const d = window.__tt.debug, out = [];
    for (let i = 0; i < 24; i++) {
      out.push(d.air().surf[0].gain);
      await new Promise(r => setTimeout(r, 220));
    }
    return out;
  });
  check(`the wash breathes with the visible tide (${Math.min(...breath).toFixed(3)}…${Math.max(...breath).toFixed(3)})`,
    Math.max(...breath) - Math.min(...breath) > 0.02);
  // the mood mixes the air: dusk goes quiet and dark, midday brightens it
  const airByMood = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < window.__tt.MOODS.length; i++) {
      window.__tt.setMood(i, true);
      out.push(window.__tt.debug.air().cut);
    }
    window.__tt.setMood(0, true);
    return out;
  });
  check(`and each mood mixes it differently (cut ${airByMood.join(' ')})`,
    new Set(airByMood).size === airByMood.length);
  check('a gull can cry without throwing', await page.evaluate(() => {
    try { window.__tt.debug.gullCry(); return true; } catch (e) { return false; }
  }));

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
  // the settings were tuned once, in a headset, and must still be there the
  // next visit — otherwise every session starts by tuning them again
  await page.waitForFunction(() => window.__tt && window.__tt.debug, null, { timeout: 120000 })
    .catch(() => {});
  const kept = await page.evaluate(() => window.__tt.debug.comfort());
  check(`and remembers what you set (${kept.speed} · ${kept.turn} · edges ${kept.vig} · sound ${kept.sound})`,
    kept.speed === 'easy' && kept.turn === 'snap 45' && kept.vig === 0 && kept.sound === 1);

  check(`zero page errors${errors.length ? ` — ${errors.slice(0, 2)}` : ''}`, errors.length === 0);

  await browser.close();
  server.close();

  console.log(`\n${fail === 0 ? 'all' : `${pass}/${pass + fail}`} toko-trip checks passed${fail ? ` — ${fail} FAILED` : ''}`);
  process.exit(fail === 0 ? 0 : 1);
})();
