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

  // ── collision: the island's geometry, not its height field ──
  // The reason this exists is one sentence: a height field has one answer per
  // column, and the jetty deck and the water under it are the same column.
  // sea level MOVES now, so every clamp below it does too — pin the tide to
  // high water (where the clock starts) or these read differently every run
  await page.evaluate(() => window.__tt.debug.setTide(0.25));
  const col0 = await page.evaluate(() => window.__tt.debug.collide());
  check(`collision is built on real geometry (${col0.solids} solids, ${col0.trees} bounds trees)`,
    col0.solids >= 3 && col0.trees === col0.solids);
  // You stand ON the deck now, not in it: the planks are ~5.5 cm of real
  // geometry laid on the pad, and the height field has never known about
  // them. That gap IS the feature, so assert the gap rather than the pad.
  const pad = await page.evaluate(() => ({
    geom: window.__tt.debug.standY(0, 0, 0),
    field: window.__tt.groundHeight(0, 0) - 0.92,
  }));
  check(`you stand on the deck, not in it (geometry ${pad.geom.toFixed(3)} over field ${pad.field.toFixed(3)})`,
    pad.geom > pad.field + 0.02 && pad.geom < pad.field + 0.15);

  // THE POINT OF THE WHOLE COMMIT: somewhere the geometry carries you and the
  // height field refuses. Found by sweep rather than by a coordinate, because
  // the jetty is COMPUTED from the inlet spine — a literal here would be the
  // one thing in the cove that did not move when the cove was reshaped.
  const overWater = await page.evaluate(() => {
    const d = window.__tt.debug, g = window.__tt.groundHeight, out = [];
    for (let x = -12; x <= 12; x += 0.5) for (let z = -4; z <= 20; z += 0.5) {
      const s = d.standY(x, z, 0), analytic = g(x, z) - 0.92;
      if (s !== null && analytic < -0.94 && s > analytic + 0.25) out.push(+s.toFixed(1));
    }
    const byH = {};
    for (const y of out) byH[y] = (byH[y] || 0) + 1;
    const deck = Object.entries(byH).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    return { total: out.length, deckY: +deck[0], deckN: deck[1] };
  });
  check(`the jetty carries you where the height field refuses (${overWater.deckN} cells at y ${overWater.deckY})`,
    overWater.deckN >= 8);
  check(`and it is a deck, not scattered rock (${overWater.deckN} of ${overWater.total} at one height)`,
    overWater.deckN / overWater.total > 0.5);
  check('you can teleport onto it', await page.evaluate(() => {
    const d = window.__tt.debug, g = window.__tt.groundHeight;
    for (let x = -12; x <= 12; x += 0.5) for (let z = -4; z <= 20; z += 0.5) {
      if (d.standY(x, z, 0) !== null && g(x, z) - 0.92 < -0.94 && d.canTeleport(x, z)) return true;
    }
    return false;
  }));

  // and solid things are solid — with a control, because a wall test that
  // says yes everywhere is not a wall test
  const bump = await page.evaluate(() => {
    const d = window.__tt.debug, c = window.__tt.chair;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const m = d.tryMove(c.p[0] - fx * 1.2, c.p[2] - fz * 1.2, c.p[0] + fx * 0.3, c.p[2] + fz * 0.3, 0);
    return {
      chair: d.wallBetween(c.p[0] - fx * 1.2, c.p[2] - fz * 1.2, c.p[0] + fx * 0.2, c.p[2] + fz * 0.2, 0),
      sand: d.wallBetween(-fx * 6, -fz * 6, -fx * 7.5, -fz * 7.5, 0),
      gotThrough: Math.hypot(m.x - c.p[0], m.z - c.p[2]) < 0.5,
    };
  });
  check('the chair is something you bump into', bump.chair === true);
  check('and open sand is not', bump.sand === false);
  check('so you cannot walk through the chair', bump.gotThrough === false);

  // ── the tide ──
  // The island's one clock, and the only thing on it that happens because
  // time passed rather than because you pressed something. What makes it a
  // mechanic rather than a texture is that the things it moves are the things
  // the rest of the island already reads: the water, the break, the sound,
  // and where you are allowed to walk.
  const band = await page.evaluate(() => window.__tt.debug.foamBand());
  const amp = await page.evaluate(() => window.__tt.debug.tide().amp);
  check(`the foam band spans the whole tide (${band.lo}…${band.hi} over ±${amp}, ${band.n} points)`,
    band.lo < -amp && band.hi > amp);

  const sweep = {};
  for (const [name, phase] of [['low', 0.75], ['mid', 0.0], ['high', 0.25]]) {
    sweep[name] = await page.evaluate(async (ph) => {
      const d = window.__tt.debug;
      d.setTide(ph); d.retuneSurf();
      // water.position.y is written by the render loop, not by setTide, so
      // read it AFTER a frame — waiting on frames rather than on the clock,
      // because this sandbox draws two or three a second
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const t = d.tide(), c = window.__tt.chair;
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      let reach = 0;
      for (let r = 0; r <= 14; r += 0.1) { if (d.standY(fx * r, fz * r, 0) !== null) reach = r; else break; }
      return { level: t.level, waterY: t.waterY, seaY: t.seaY, foam: d.foamReach(),
        reach: +reach.toFixed(1), surf: Math.hypot(t.surfAt[0][0], t.surfAt[0][1]) };
    }, phase);
  }
  check(`the water rides it (${sweep.low.waterY} → ${sweep.high.waterY})`,
    sweep.high.waterY - sweep.low.waterY > amp);
  check(`the break walks with it (${sweep.low.foam} → ${sweep.high.foam})`,
    sweep.high.foam - sweep.low.foam > amp);
  // THE PAYOFF, and the thing that makes it a mechanic: at low water there is
  // more beach, and you are allowed to stand on it.
  check(`low water uncovers beach you can walk on (${sweep.high.reach} m → ${sweep.low.reach} m)`,
    sweep.low.reach > sweep.high.reach + 1);
  check(`and the surf comes from the waterline, so it moves too (${sweep.high.surf.toFixed(1)} → ${sweep.low.surf.toFixed(1)} m out)`,
    sweep.low.surf > sweep.high.surf + 0.5);

  // still means still — a rate of zero has to actually hold, or "hold" is a
  // label on a thing that drifts
  const held = await page.evaluate(async () => {
    const d = window.__tt.debug;
    d.setComfort('time', 0);
    d.setTide(0.1);
    const a = d.tide().level;
    await new Promise(r => setTimeout(r, 600));
    const b = d.tide().level;
    d.setComfort('time', 1);
    return { a, b, rate: d.comfort().time };
  });
  check(`still holds the tide (${held.a} → ${held.b})`, Math.abs(held.a - held.b) < 1e-6);
  check(`and the slate names the rate (${held.rate})`, typeof held.rate === 'string');

  // ── the caustics ──
  // The one thing taken from Clearwater, and the test of it is not that a
  // texture is present: it is that the light lands only where there is water
  // over the sand, moves when the tide does, and goes out with the sun.
  const caus0 = await page.evaluate(() => {
    window.__tt.debug.setTide(0.25); window.__tt.debug.causRebake();
    return window.__tt.debug.caustics();
  });
  check(`the caustics are additive light on the seabed (${caus0.verts} verts)`,
    caus0.additive === true && caus0.verts > 4000);
  check(`and two layers tile at different rates, so their product moves (${caus0.tiles.join(' / ')})`,
    caus0.tiles[0] !== caus0.tiles[1]);
  // they must not land on dry sand — that is the whole reason the mask exists
  check(`they fall on water, not on dry sand (${caus0.dry} of ${caus0.lit} lit verts are dry)`,
    caus0.dry / caus0.lit < 0.02);

  // and the lit area has to FOLLOW the tide, or it is a decal rather than light
  const causTide = await page.evaluate(() => {
    const d = window.__tt.debug;
    d.setTide(0.75); d.causRebake(); const low = d.caustics().lit;
    d.setTide(0.25); d.causRebake(); const high = d.caustics().lit;
    return { low, high };
  });
  check(`the lit area follows the tide (low ${causTide.low} → high ${causTide.high} verts)`,
    causTide.high > causTide.low);

  // caustics are sunlight that got through the surface, so a low sun means
  // almost none however warm the sky looks
  const causSun = await page.evaluate(async () => {
    const out = {};
    for (const [n, i] of [['midday', 2], ['golden', 0], ['dusk', 1]]) {
      window.__tt.setMood(i, true);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      out[n] = window.__tt.debug.caustics().sun;
    }
    window.__tt.setMood(0, true);
    return out;
  });
  check(`and they follow the sun, not the sky (midday ${causSun.midday} · golden ${causSun.golden} · dusk ${causSun.dusk})`,
    causSun.midday > causSun.golden && causSun.golden > causSun.dusk);

  // ── the two waters ──
  // A comparison, not a decision: the baked material and the TSL one are
  // built to be swapped under the same sky so they can be judged against each
  // other. What is gated is that both exist, that they really swap, and the
  // one thing that silently broke the node version once.
  const w0 = await page.evaluate(() => window.__tt.debug.water());
  check(`the island boots on the baked water (${w0.mode})`, w0.mode === 'baked' && w0.tsl === false);
  const wSwap = await page.evaluate(() => {
    const d = window.__tt.debug;
    const tsl = (d.setWater('tsl'), d.water());
    const back = (d.setWater('baked'), d.water());
    d.setWater('tsl');
    return { tsl, back, live: d.water() };
  });
  check('and swaps to the TSL one and back', wSwap.tsl.tsl === true && wSwap.back.tsl === false);
  check('the TSL material is really a node material', wSwap.tsl.nodes === true);
  // THE BUG THIS GATE EXISTS FOR: the bathy attribute is world y and the sea
  // uniform is world y, and when they were not, every depth clamped to zero —
  // leaving a shader that was all Fresnel and no absorption, which reads
  // exactly like water that is working.
  check(`sea level lands inside the seabed's range (${wSwap.live.bathyMin} < ${wSwap.live.sea} < ${wSwap.live.bathyMax})`,
    wSwap.live.sea > wSwap.live.bathyMin && wSwap.live.sea < wSwap.live.bathyMax);
  // and the reflection has to follow the mood, since rebuildEnv makes a FRESH
  // cube each time rather than updating one in place
  const envLive = await page.evaluate(async () => {
    window.__tt.setMood(1, true);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const a = window.__tt.debug.water().envLive;
    window.__tt.setMood(0, true);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const b = window.__tt.debug.water().envLive;
    window.__tt.debug.setWater('baked');
    return a && b;
  });
  check('and its reflection follows the mood rather than freezing on one sky', envLive === true);

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
    for (const row of [1, 1, 1, 2, 3, 4, 5]) { d.slateAct(row); seen.push(d.comfort()); }
    return { perfOn, seen };
  });
  check('the top row turns the readout on from inside the headset', rows.perfOn === true);
  check(`GLIDE cycles and wraps (${rows.seen.slice(0, 3).map(c => c.speed).join(' ')})`,
    rows.seen[0].speed === 'brisk' && rows.seen[1].speed === 'gentle' && rows.seen[2].speed === 'easy');
  check(`TURN cycles (${rows.seen[3].turn})`, rows.seen[3].turn === 'snap 45');
  check(`EDGES toggles (${rows.seen[4].vig})`, rows.seen[4].vig === 0);
  check(`SOUND toggles (${rows.seen[5].sound})`, rows.seen[5].sound === 0);
  check(`TIDE cycles (${rows.seen[6].time})`, rows.seen[6].time !== rows.seen[5].time);
  // and one row must not move another: the UV divisor is the whole menu
  check('and one row moves one dial',
    rows.seen[6].speed === 'easy' && rows.seen[6].turn === 'snap 45'
    && rows.seen[6].vig === 0 && rows.seen[6].sound === 0);
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
  // "on the waterline" used to mean groundHeight ~ 0, which was true only
  // while sea level was a constant. The waterline is at the TIDE now, and
  // that is the invariant worth asserting.
  const tideNow = await page.evaluate(() => window.__tt.debug.tide().level);
  const offshore = air.surf.filter(v => Math.abs(v.ground - tideNow) > 0.12);
  check(`and every surf emitter sits on the waterline, wherever the tide has put it (tide ${tideNow.toFixed(3)})${offshore.length ? ` — ${offshore.map(v => v.ground)}` : ''}`,
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

  // ── the sand ──
  // The beach is the biggest surface in view from the chair, and the two
  // things it was missing are the two things you only see at a grazing
  // angle: relief, and a change of gloss where the water has been.
  const sand = await page.evaluate(() => window.__tt.debug.sand());
  check(`the sand has relief that tiles (scale ${sand.scale}, ${sand.tile}x over 56 m)`,
    sand.normal === true && sand.tile >= 20 && sand.scale > 0 && sand.scale < 0.4);
  check('and a roughness map', sand.rough === true);
  // wet sand is smoother than dry — that is the sheen band, and it has to be
  // on the WATER side of the chair, not merely present somewhere
  check(`and the gloss is at the water, not up the beach (wet ${sand.wet} < dry ${sand.dry})`,
    sand.wet < sand.dry - 0.2);

  // ── the prop door ──
  // The door's whole point is that it cannot fail quietly, so most of what is
  // worth gating here is the REFUSAL: each rule is proved against a synthetic
  // file, which is how the contract gets tested without a broken .glb being
  // committed to prove it.
  const props = await page.evaluate(() => window.__tt.debug.props());
  const named = ['chair', 'radio', 'cove'].map(id => props.slots.find(s => s.id === id));
  check(`the three named slots are declared (${named.map(s => s && s.id).join(' ')})`,
    named.every(s => s && s.tris > 0 && Array.isArray(s.span) && s.span.length === 3));
  check(`and each says how it is seated (${named.map(s => s && s.fit).join(' ')})`,
    named.every(s => ['ground', 'shelf', 'origin'].includes(s.fit)));
  // the enabling change: a chair file has nothing to replace unless the
  // code-built chair is its own object rather than baked into the static merge
  check('the chair is its own object, so a file can take its place',
    props.chairStandIn === true);
  check('a clean boot raises no cage and no banner',
    props.cages === 0 && props.banner === '');

  const probe = await page.evaluate(() => {
    const d = window.__tt.debug;
    return {
      ok: d.propProbe('chair'),
      animated: d.propProbe('chair', { clips: 2 }),
      skinned: d.propProbe('chair', { skinned: true }),
      fat: d.propProbe('chair', { tris: 99999 }),
      cm: d.propProbe('chair', { size: [120, 160, 130] }),
      tiny: d.propProbe('chair', { size: [0.012, 0.016, 0.013] }),
    };
  });
  check(`a conforming file passes (${probe.ok.tris} tris, ${probe.ok.dim.join('x')} m)`,
    probe.ok.why.length === 0);
  check(`animation is refused — props are static (${probe.animated.why[0] ?? 'NOT REFUSED'})`,
    probe.animated.why.some(w => /animation/i.test(w)));
  check(`a skinned mesh is refused (${probe.skinned.why[0] ?? 'NOT REFUSED'})`,
    probe.skinned.why.some(w => /skinned/i.test(w)));
  check(`over budget is refused (${probe.fat.why[0] ?? 'NOT REFUSED'})`,
    probe.fat.why.some(w => /triangles/i.test(w)));
  // the units mistake, both directions — the commonest export bug there is,
  // and the one that looks exactly like a prop nobody placed
  check(`a centimetre export is refused (${probe.cm.why[0] ?? 'NOT REFUSED'})`,
    probe.cm.why.some(w => /units/i.test(w)));
  check(`and so is one a hundred times too small (${probe.tiny.why[0] ?? 'NOT REFUSED'})`,
    probe.tiny.why.some(w => /units/i.test(w)));

  // and a failure has to be SEEN: a cage in the world and a line on the page
  const failed = await page.evaluate(() => {
    window.__tt.debug.propFail('radio', 'forced by the gate');
    const p = window.__tt.debug.props();
    // a cage is twelve unfogged magenta EDGES — not a wireframe mesh, which
    // is what it was before the edges read better. Assert the thing, not the
    // material flag the thing used to carry.
    let cage = false;
    window.__tt.scene.traverse(o => {
      if (o.isLineSegments && o.material?.fog === false) cage = true;
    });
    return { cages: p.cages, banner: p.banner, cage };
  });
  check(`a failed prop stands in the world as a cage (${failed.cages})`,
    failed.cages === 1 && failed.cage === true);
  check(`and says so on the page ("${failed.banner.slice(0, 40)}…")`,
    /PROP FAILED\s+radio/.test(failed.banner));

  // provenance: CC0 asks for nothing, everything else is credited in world
  const credit = await page.evaluate(() => {
    const d = window.__tt.debug;
    const zero = d.creditProp('Rowboat', 'Someone', 'CC0');
    const by = d.creditProp('Lantern', 'Someone Else', 'CC-BY 4.0');
    return { zero, by, lines: d.credits() };
  });
  check('CC0 is not credited, because it asks for nothing', credit.zero === false);
  check(`CC-BY is credited in world (${credit.lines[0] ?? 'NOTHING'})`,
    credit.by === true && credit.lines.some(l => /Lantern.*Someone Else.*CC-BY/.test(l)));

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
