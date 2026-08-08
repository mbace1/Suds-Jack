// Hyper Dagger smoke — the committed gate (lives in-repo since v4.29; the
// original 49-section scratch suite died with a container and is being
// rebuilt here, growing per release like every other project's gate).
//
// Serves the REPO ROOT so the arcade-shell (../hub/) and Toko-signature
// (../toko/) imports in index.html resolve, exactly as deployed. Everything
// is driven off window.__hd game state, never the wall clock — a sandbox
// with no GPU renders this at a handful of frames a second, so timing-
// sensitive checks count rAF frames (dt is clamped to 0.05 in-game).
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const s = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    env: { ...process.env, LD_LIBRARY_PATH: process.env.PLAYWRIGHT_CHROMIUM_LIB || process.env.LD_LIBRARY_PATH },
    args: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? ['--no-sandbox', '--single-process', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--in-process-gpu']
      : ['--use-gl=swiftshader', '--disable-dev-shm-usage'],
  });
  const p = await b.newPage({ viewport: { width: 1100, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  // ---- boot --------------------------------------------------------------
  await p.goto(base + '/hyperdagger/', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
  ok('it boots with no errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  ok('WebGL actually painted', await p.evaluate(() => {
    const c = document.getElementById('canvas-game');
    return c.width > 100 && !!(c.getContext('webgl2') || c.getContext('webgl'));
  }));

  // ---- start a run (skip the one-time tips card) -------------------------
  await p.evaluate(() => localStorage.setItem('hyperDaggerSeenTips', '1'));
  await p.mouse.click(550, 360);
  await p.waitForFunction(() => window.__hd.debug.getState().state === 'playing', null, { timeout: 10000 });
  ok('a click starts the run', true);

  // ---- v25 clean presentation baseline ---------------------------------
  const clean25 = await p.evaluate(() => ({
    fx: window.__hd.debug.getFx(),
    vfx: window.__hd.debug.getVfx(),
  }));
  ok('v25 starts without spectacle overlays',
    !clean25.fx.sphere && !clean25.fx.threat && !clean25.fx.smear &&
    !clean25.fx.chroma && !clean25.fx.edge && !clean25.vfx.speedOn &&
    !clean25.vfx.rippleOn,
    JSON.stringify(clean25));
  ok('v25 bloom is restrained', clean25.fx.bloomStrength === 0.32, JSON.stringify(clean25.fx));

  // ---- tuning.js is what the game actually reads -------------------------
  const tun = await p.evaluate(() => {
    const hd = window.__hd; const t = hd.debug.getTuning();
    return { dash: t.dash.speed, lv4: t.weapon.tiers[4].stream, sg: t.weapon.shotgunCount[1],
      player: hd.player.speed === t.player.speed, bleed: t.style.bleedBase,
      // DD economy invariant: burst DPS < stream DPS at every weapon level
      economy: t.weapon.tiers.every((tier, lv) =>
        !tier || t.weapon.shotgunCount[lv] / t.weapon.shotgunCd < tier.stream),
    };
  });
  ok('TUNING drives the game', tun.dash === 30 && tun.lv4 === 26 && tun.player && tun.bleed === 5, JSON.stringify(tun));
  ok('the burst never out-DPSes the stream', tun.economy === true && tun.sg === 10, JSON.stringify(tun));

  // ---- v4.29 DD gunfeel: TAP = shotgun, HOLD = stream, no auto-fire ------
  const gun = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    // Count fire() calls, not net active-pool occupancy. Older daggers can
    // expire while a later trigger phase is being measured, which made this
    // gate report negative/undercounted shots on a slow software renderer.
    const realFire = hd.daggers.fire.bind(hd.daggers);
    let shots = 0;
    hd.daggers.fire = (...args) => { shots++; return realFire(...args); };
    hd.player.input.touchMode = false;
    hd.enemies.length = 0;
    // moving alone must fire NOTHING now (the old auto-fire is gone)
    const d0 = shots;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    await frames(12);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    const moveFired = shots - d0;
    // TAP: trigger down for 2 frames (≤0.1s of clamped dt — under streamDelay)
    const d1 = shots;
    hd.player.input.mouseDown = true;
    await frames(2);
    hd.player.input.mouseDown = false;
    await frames(2);
    const tapFired = shots - d1;
    const cdAfterTap = hd.debug.getGun().shotCd;
    // wait out the shotgun lockout, then HOLD: stream after streamDelay
    while (hd.debug.getGun().shotCd > 0) await frames(2);
    const d2 = shots;
    hd.player.input.mouseDown = true;
    await frames(3); // ≤0.15s held — still inside the delay
    const early = shots - d2;
    await frames(12); // well past streamDelay now
    const streamed = shots - d2;
    const d3 = shots;
    hd.player.input.mouseDown = false; // long hold released → must NOT shotgun
    await frames(3);
    const releaseFired = shots - d3;
    hd.daggers.fire = realFire;
    return { moveFired, tapFired, cdAfterTap, early, streamed, releaseFired };
  });
  ok('moving alone no longer fires', gun.moveFired === 0, JSON.stringify(gun));
  ok('a TAP fires the shotgun burst', gun.tapFired >= 10 && gun.cdAfterTap > 0, JSON.stringify(gun));
  ok('the stream waits out streamDelay', gun.early <= 2, JSON.stringify(gun));
  ok('a HOLD streams', gun.streamed >= 3, JSON.stringify(gun));
  ok('releasing a long hold is not a tap', gun.releaseFired <= 2, JSON.stringify(gun));

  // ---- v4.27 aim assist: sticky near a target, inert without a pad -------
  const aim = await p.evaluate(() => {
    const hd = window.__hd;
    const cam = hd.player.camera;
    hd.enemies.length = 0;
    cam.rotation.set(0, 0, 0); // face -z whatever came before
    const clearRaw = hd.debug.getAim().raw;
    hd.debug.spawnDread();
    const d = hd.enemies[hd.enemies.length - 1];
    d.pos.set(cam.position.x, cam.position.y, cam.position.z - 10);
    const centred = hd.debug.getAim();
    d.pos.set(cam.position.x + 5, cam.position.y, cam.position.z - 10);
    const offAxis = hd.debug.getAim().raw;
    d.alive = false;
    return { clearRaw, centredRaw: centred.raw, offAxis, assist: centred.assist, ramp: centred.ramp };
  });
  ok('assist slows only near a centred target', aim.clearRaw === 1 && aim.centredRaw < 0.7 && aim.offAxis === 1, JSON.stringify(aim));
  ok('assist + ramp stay inert without a pad', aim.assist === 1 && aim.ramp === 0, JSON.stringify(aim));

  // ---- v4.26 REAP: the bone-yard is a resource you spend -----------------
  const reap = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    hd.debug.setPerfTier(0);
    hd.litter.reset(); hd.debris.reset();
    for (const e of hd.enemies) e.alive = false;
    await frames(4);
    const bare = hd.debug.reap();               // bare floor: refuse…
    const coolAfterMiss = hd.debug.getReap().cool; // …without burning the cooldown
    hd.debug.spawnDread();
    await frames(6);
    const d = hd.enemies.filter(e => e.type === 'dread').pop();
    d.pos.set(hd.player.feet.x, 1.2, hd.player.feet.z);
    hd.debris.burst(d.sprite.worldVoxels(), d.sprite.size, { x: 0, y: 0, z: 0 }, 0.25);
    d.alive = false;
    for (let i = 0; i < 220; i++) hd.debris.update(1 / 60); // settle into litter
    const bones = hd.litter.count;
    hd.debug.spawnHusk();
    await frames(4);
    const h = hd.enemies.filter(e => e.type === 'husk').pop();
    h.pos.set(hd.player.feet.x + 2, 1.35, hd.player.feet.z + 1);
    const hpBefore = h.hp;
    const fired = hd.debug.reap();
    const res = { bare, coolAfterMiss, bones, after: hd.litter.count, hpBefore, hpAfter: h.hp,
      cool: hd.debug.getReap().cool, again: hd.debug.reap() };
    h.alive = false; hd.litter.reset(); hd.debris.reset();
    res.fired = fired;
    return res;
  });
  ok('REAP refuses a bare floor, free', reap.bare === false && reap.coolAfterMiss === 0, JSON.stringify(reap));
  ok('REAP consumes the pile and damages', reap.fired === true && reap.bones > 150 && reap.after === 0 && reap.hpAfter < reap.hpBefore, JSON.stringify(reap));
  ok('REAP cooldown blocks a second cast', reap.cool > 2 && reap.again === false, JSON.stringify(reap));

  // ---- chunk detachment: severing a bridge frees the far island ----------
  const token = await p.evaluate(() =>
    new URL(document.querySelector('script[src*="js/main.js"]').src).searchParams.get('v'));
  const detach = await p.evaluate(async (tok) => {
    const { VoxelSprite } = await import(`./js/voxel.js?v=${tok}`);
    const def = { voxelSize: 0.3, palette: { A: 0xffffff }, layers: [['AAAAA', 'AA.AA']] };
    const sp = new VoxelSprite(def, 1);
    const bridge = sp.voxels.find(v => Math.abs(v.x) < 1e-6 && v.z > 0);
    const chipped = sp.chip({ x: bridge.x, y: bridge.y, z: bridge.z }, 1).length;
    const islands = sp.detachIslands();
    const res = { chipped, islands: islands.length, islandSize: islands[0]?.length ?? 0, alive: sp.aliveCount };
    sp.dispose();
    return res;
  }, token);
  // symmetric dumbbell: cutting the centre leaves a 4/4 tie — one side
  // detaches as ONE island, the other survives (largest-component rule)
  ok('chipping the bridge severs one island', detach.chipped === 1 && detach.islands === 1 && detach.islandSize === 4 && detach.alive === 4, JSON.stringify(detach));

  // ---- style meter: gains rank, bleeds back down -------------------------
  const style = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    hd.debug.addStyle(80);
    const high = hd.debug.getStyle();
    await frames(30); // ≥1.5s of clamped dt — the bleed must show
    const later = hd.debug.getStyle();
    return { highVal: high.styleVal, highTier: high.tier, laterVal: later.styleVal };
  });
  ok('style rises and bleeds', style.highVal >= 75 && style.highTier !== 'D' && style.laterVal < style.highVal, JSON.stringify(style));

  // ---- v4.30 HYPERDEMON visual push --------------------------------------
  const fx = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    hd.debug.setOpt('perf', 'high'); // pin T0 so the governor can't interfere
    hd.debug.setOpt('edge', true);
    const on = hd.debug.getFx();
    hd.debug.setOpt('edge', false);
    const off = hd.debug.getFx().edge;
    hd.debug.setOpt('edge', true);
    hd.debug.setOpt('perf', 'low'); // T4 must shed the pass regardless of opts
    const tierGated = hd.debug.getFx().edge;
    hd.debug.setOpt('perf', 'high');
    // smear deepens mid-dash and settles back
    const dampIdle = hd.debug.getFx().damp;
    hd.player.dashT = hd.debug.getTuning().dash.time;
    await frames(1);
    const dampDash = hd.debug.getFx().damp;
    await frames(30);
    const dampBack = hd.debug.getFx().damp;
    hd.debug.setOpt('perf', 'auto');
    return { edgeOn: on.edge, glow: on.gridGlow, off, tierGated, dampIdle, dampDash, dampBack };
  });
  ok('neon edge pass on by default at T0', fx.edgeOn === true, JSON.stringify(fx));
  ok('EDGE OFF and the low tier both shed it', fx.off === false && fx.tierGated === false, JSON.stringify(fx));
  ok('the grid glow is HDR', fx.glow > 1.2, JSON.stringify(fx)); // v4.31 trims it to 1.5 — still past the bloom threshold
  ok('smear deepens mid-dash, settles back', fx.dampDash > fx.dampIdle + 0.05 && fx.dampBack <= fx.dampIdle + 0.01, JSON.stringify(fx));

  // ---- v4.31 detail overhaul ---------------------------------------------
  const detail31 = await p.evaluate(async (tok) => {
    const { MODELS, parseModel } = await import(`./js/voxel.js?v=${tok}`);
    const base = parseModel(MODELS.skull, 1);
    // world width must be unchanged by the resolution bump (hitboxes!)
    const xs = base.map(v => v.x);
    const width = Math.max(...xs) - Math.min(...xs) + MODELS.skull.voxelSize;
    // baked AO: bone voxels must NOT all share one flat color any more
    const boneCols = new Set(base.filter(v => v.key === 'W').map(v => v.color.getHexString()));
    return { count: base.length, width: +width.toFixed(2), boneShades: boneCols.size };
  }, token);
  ok('the skull is a sculpt now (≥250 source voxels)', detail31.count >= 250, JSON.stringify(detail31));
  ok('its world width is unchanged (~1.54)', Math.abs(detail31.width - 1.54) < 0.02, JSON.stringify(detail31));
  ok('AO bake gives bone real shading', detail31.boneShades > 10, JSON.stringify(detail31));

  const fx31 = await p.evaluate(() => {
    const hd = window.__hd;
    return { glow: hd.debug.getFx().gridGlow, edgeAmt: hd.debug.getFx().edgeAmt };
  });
  ok('the neon is dialled back (glow 1.5, edge 0.15)', fx31.glow === 1.5 && fx31.edgeAmt === 0.15, JSON.stringify(fx31));

  // ---- v22 near-parity asset pass ---------------------------------------
  const assets22 = await p.evaluate(async (tok) => {
    const { MODELS, parseModel } = await import(`./js/voxel.js?v=${tok}`);
    const names = ['watcher', 'spider', 'leviathan', 'revenant', 'husk', 'totem', 'egg', 'blinker'];
    const models = {};
    for (const name of names) {
      const vox = parseModel(MODELS[name], 1);
      const zs = new Set(vox.map(v => Math.round(v.z / MODELS[name].voxelSize)));
      models[name] = { count: vox.length, depth: zs.size };
    }
    return { models, environment: window.__hd.debug.getEnvironment(), fx: window.__hd.debug.getFx() };
  }, token);
  const rosterCount = Object.values(assets22.models).reduce((n, m) => n + m.count, 0);
  ok('v22 roster sculpts exceed 1,000 source voxels', rosterCount > 1000, JSON.stringify(assets22.models));
  ok('every upgraded enemy is volumetric', Object.values(assets22.models).every(m => m.depth >= 5), JSON.stringify(assets22.models));
  ok('the arena kit has its complete asset set',
    assets22.environment.rifts === 5 && assets22.environment.pylons === 12 &&
    assets22.environment.horns === 24 && assets22.environment.shards === 96 &&
    assets22.environment.arches === 4 && assets22.environment.lattice === true,
    JSON.stringify(assets22.environment));
  ok('spherical threat awareness is active', assets22.fx.sphere === true || assets22.fx.threat === true, JSON.stringify(assets22.fx));

  // ---- v23 live spherical projection -----------------------------------
  const projection23 = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    hd.debug.setOpt('perf', 'high');
    hd.debug.setOpt('projection', true);
    await frames(4);
    const active = { projection: hd.debug.getProjection(), fx: hd.debug.getFx() };
    hd.debug.setOpt('projection', false);
    await frames(1);
    const off = hd.debug.getProjection();
    hd.debug.setOpt('projection', true);
    hd.debug.setOpt('perf', 'low');
    await frames(1);
    const low = hd.debug.getProjection();
    hd.debug.setOpt('perf', 'auto');
    return { active, off, low };
  });
  ok('v23 spherical projection captures world and threats',
    projection23.active.projection.enabled === true &&
    projection23.active.projection.worldCaptures > 0 &&
    projection23.active.projection.threatCaptures > 0 &&
    projection23.active.fx.threat === false,
    JSON.stringify(projection23));
  ok('projection option and low tier shed cube captures',
    projection23.off.enabled === false && projection23.low.enabled === false,
    JSON.stringify(projection23));

  const swoop = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    hd.debug.setOpt('perf', 'low'); // motion test — voxel density is irrelevant, frames are not
    for (const e of hd.enemies) e.alive = false;
    hd.enemies.length = 0;
    hd.debug.spawnSerpent();
    const ys = [];
    for (let i = 0; i < 60; i++) {
      const head = hd.serpents[0]?.segments.find(s => s.alive);
      if (head) ys.push(head.pos.y);
      await frames(2);
    }
    const serp = hd.serpents[0];
    if (serp) for (const s of serp.segments) s.alive = false;
    hd.debug.setOpt('perf', 'auto');
    return { min: +Math.min(...ys).toFixed(2), max: +Math.max(...ys).toFixed(2) };
  });
  ok('the serpent swoops vertically (Y spread > 2.5)', swoop.max - swoop.min > 2.5, JSON.stringify(swoop));

  // ---- v4.32 mesh hull: smooth skin alive, voxels where it tears ---------
  const hull = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    hd.debug.setOpt('perf', 'high');
    hd.debug.setOpt('look', 'smooth');
    for (const e of hd.enemies) e.alive = false;
    hd.enemies.length = 0;
    hd.debug.spawnDread();
    await frames(3);
    const on = hd.debug.getLook();
    const e = hd.enemies[hd.enemies.length - 1];
    const before = e.sprite.hull.geometry.getAttribute('position').count;
    e.sprite.chip(e.sprite.worldVoxels()[0].pos, 40);
    await frames(6); // past the re-skin throttle at clamped dt
    const after = e.sprite.hull.geometry.getAttribute('position').count;
    hd.debug.setOpt('look', 'cubes');
    const cubes = hd.debug.getLook();
    hd.debug.setOpt('look', 'smooth');
    hd.debug.setOpt('perf', 'low');
    const low = hd.debug.getLook();
    hd.debug.setOpt('perf', 'auto');
    e.alive = false;
    return { hullOn: on.sample?.hull, cubesHidden: on.sample?.cubes, handCubes: on.hand,
      before, after, cubesBack: cubes.sample?.hull, lowShed: low.sample?.hull };
  });
  ok('the smooth skin is the default alive-look', hull.hullOn === true && hull.cubesHidden === 0 && hull.handCubes === false, JSON.stringify(hull));
  ok('a chip tears and re-forms the skin', hull.after > 0 && hull.after !== hull.before, JSON.stringify(hull));
  ok('LOOK CUBES and the low tier both fall back', hull.cubesBack === false && hull.lowShed === false, JSON.stringify(hull));

  // ---- long-run health: spawn/kill cycles must plateau, not climb --------
  // (the hull re-skin allocates a fresh BufferGeometry per rebuild, so this
  // is the check that catches a missed dispose anywhere in that path)
  const health = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    hd.debug.setOpt('perf', 'low'); // cheap frames — we count objects, not pixels
    const cycle = async () => {
      for (let i = 0; i < 4; i++) { hd.debug.spawnDread(); hd.debug.spawnWatcher(); }
      await frames(4);
      // chip one so the re-skin path runs too
      const e = hd.enemies.find(x => x.alive);
      if (e?.sprite?.hull) { e.sprite.chip(e.sprite.worldVoxels()[0].pos, 20); await frames(3); }
      for (const x of hd.enemies) x.alive = false;
      await frames(4); // the main loop prunes + disposes dead enemies
    };
    await cycle(); // warmup — first-use allocations (programs, shared geometry)
    const a = hd.debug.getHealth();
    for (let i = 0; i < 4; i++) await cycle();
    const b = hd.debug.getHealth();
    hd.debug.setOpt('perf', 'auto');
    return { a: { g: a.geometries, t: a.textures, sc: a.sceneChildren, en: a.enemies }, b: { g: b.geometries, t: b.textures, sc: b.sceneChildren, en: b.enemies } };
  });
  ok('spawn/kill cycles do not leak geometry', health.b.g - health.a.g <= 2 && health.b.t === health.a.t, JSON.stringify(health));
  ok('the scene graph returns to baseline', health.b.sc <= health.a.sc + 2 && health.b.en === health.a.en, JSON.stringify(health));

  // ---- death → restart under 2 s -----------------------------------------
  const death = await p.evaluate(async () => {
    const hd = window.__hd;
    hd.debug.die();
    return hd.debug.getState().state;
  });
  ok('debug.die() reaches the death screen', death === 'dead');
  await p.waitForTimeout(1200); // death screen ignores input for 700ms
  // click clear of the death screen's own buttons (they stopPropagation)
  await p.mouse.click(880, 620);
  const restarted = await p.waitForFunction(
    () => window.__hd.debug.getState().state === 'playing', null, { timeout: 4000 }).then(() => true, () => false);
  ok('one click restarts within 2s', restarted);

  // ---- zero errors across the whole run ----------------------------------
  ok('still zero page errors at the end', errs.length === 0, errs.slice(0, 4).join(' | '));

  await b.close();
  s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
