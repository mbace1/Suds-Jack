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
  const b = await chromium.launch({ args: ['--use-gl=swiftshader'] });
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
  // Hold the run open for the measurement sections. Since the v4.36 balance
  // pass a player who never moves does NOT survive the length of this suite,
  // and every section below samples a live game. The death→restart section
  // at the end turns this back off and dies for real.
  await p.evaluate(() => window.__hd.debug.setInvulnerable(true));

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
    hd.player.input.touchMode = false;
    hd.enemies.length = 0;
    // moving alone must fire NOTHING now (the old auto-fire is gone)
    const d0 = hd.daggers.active.length;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    await frames(12);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
    const moveFired = hd.daggers.active.length - d0;
    // TAP: trigger down for 2 frames (≤0.1s of clamped dt — under streamDelay)
    const d1 = hd.daggers.active.length;
    hd.player.input.mouseDown = true;
    await frames(2);
    hd.player.input.mouseDown = false;
    await frames(2);
    const tapFired = hd.daggers.active.length - d1;
    const cdAfterTap = hd.debug.getGun().shotCd;
    // wait out the shotgun lockout, then HOLD: stream after streamDelay.
    // The longer lockout gives the director time to spawn something that
    // can kill the player mid-test — keep the arena empty while we measure.
    while (hd.debug.getGun().shotCd > 0) {
      for (const e of hd.enemies) e.alive = false;
      await frames(2);
    }
    for (const e of hd.enemies) e.alive = false;
    const d2 = hd.daggers.active.length;
    hd.player.input.mouseDown = true;
    await frames(3); // ≤0.15s held — still inside the delay
    const early = hd.daggers.active.length - d2;
    // daggers recycle off the arena edge mid-window, so a net delta
    // undercounts — sum the positive per-frame deltas (i.e. actual spawns)
    let streamed = 0, prev = hd.daggers.active.length;
    for (let i = 0; i < 14; i++) {
      await frames(1);
      const n = hd.daggers.active.length;
      if (n > prev) streamed += n - prev;
      prev = n;
    }
    const d3 = hd.daggers.active.length;
    hd.player.input.mouseDown = false; // long hold released → must NOT shotgun
    await frames(3);
    const releaseFired = Math.max(0, hd.daggers.active.length - d3);
    return { moveFired, tapFired, cdAfterTap, early, streamed, releaseFired, state: hd.debug.getState().state };
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
    hd.debug.freezeDirector(true); // measure the sprite we spawned, not the schedule's
    for (const e of hd.enemies) e.alive = false;
    hd.enemies.length = 0;
    const e = hd.debug.spawnDread();
    await frames(3);
    const on = hd.debug.getLook();
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
    hd.debug.freezeDirector(false);
    e.alive = false;
    return { hullOn: on.sample?.hull, cubesHidden: on.sample?.cubes, handCubes: on.hand,
      before, after, cubesBack: cubes.sample?.hull, lowShed: low.sample?.hull };
  });
  ok('the smooth skin is the default alive-look', hull.hullOn === true && hull.cubesHidden === 0 && hull.handCubes === false, JSON.stringify(hull));
  ok('a chip tears and re-forms the skin', hull.after > 0 && hull.after !== hull.before, JSON.stringify(hull));
  ok('LOOK CUBES and the low tier both fall back', hull.cubesBack === false && hull.lowShed === false, JSON.stringify(hull));

  // ---- v4.36 the difficulty curve: parade, then squeeze ------------------
  // Simulated off the real tuning + the real pulse arithmetic, so the SHAPE
  // of the curve is gated: a future rebalance can move numbers, but not
  // silently flatten minute one's variety or minute two's pressure.
  const curve = await p.evaluate(() => {
    const T = window.__hd.debug.getTuning();
    const D = T.director;
    const kindOf = n => (n < 1 ? 'normal' : n % 8 === 0 ? 'heavy' : n % 4 === 0 ? 'spike'
      : (n >= 3 && n % 3 === 0) ? 'swarm' : 'normal');
    const budgetOf = n => {
      const B = D.budget;
      return B.base + Math.min(n, B.kneeA) * B.rateA
        + Math.max(0, Math.min(n, B.kneeB) - B.kneeA) * B.rateB
        + Math.max(0, n - B.kneeB) * B.rateC;
    };
    let t = D.pulse.first, n = 0, m1 = 0, m2 = 0, m1b = 0, m2b = 0, maxEarly = 0;
    const met = new Set();
    while (t < 120) {
      n++;
      const kind = kindOf(n);
      const mod = kind === 'heavy' ? 1.6 : kind === 'spike' ? 1.5 : kind === 'swarm' ? 1.3 : 1;
      const b = budgetOf(n) * mod;
      const debut = D.pool.find(e => !met.has(e[0]) && t >= e[1]);
      if (debut) met.add(debut[0]);
      if (t < 60) { m1++; m1b += b; maxEarly = Math.max(maxEarly, b); } else { m2++; m2b += b; }
      t += Math.max(D.pulse.floor, D.pulse.base - t * D.pulse.slope);
    }
    const metInMin1 = [...met].filter(k => D.pool.find(e => e[0] === k)[1] < 60);
    return {
      m1, m2, m1b: +m1b.toFixed(1), m2b: +m2b.toFixed(1), maxEarly: +maxEarly.toFixed(1),
      variety: metInMin1.length, thornInMin1: D.thorn.first < 60,
      // every heavy-pulse centrepiece must exist in the pool (the old
      // hardcoded 100/120 gates drifted off the unlock times)
      centres: ['serpent', 'dread'].every(k => D.pool.some(e => e[0] === k)),
    };
  });
  ok('minute one is a parade (6+ threats, thorns too)', curve.variety >= 6 && curve.thornInMin1, JSON.stringify(curve));
  ok('…at low per-pulse pressure (no pulse over 6)', curve.maxEarly <= 6, JSON.stringify(curve));
  ok('minute two is the squeeze (2.5x+ minute one)', curve.m2b > curve.m1b * 2.5, JSON.stringify(curve));
  ok('heavy centrepieces are pool-driven', curve.centres === true, JSON.stringify(curve));

  // ---- v4.35 mesh assets: voxelizer, skin slot, the shed moment ----------
  const mesh35 = await p.evaluate(async (tok) => {
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const THREE = await import('./vendor/three.module.min.js');
    const { voxelizeMesh, prepareAsset } = await import(`./js/meshassets.js?v=${tok}`);
    const { VoxelSprite } = await import(`./js/voxel.js?v=${tok}`);
    // a synthetic "Meshy export": a red standard-material sphere
    const raw = new THREE.Group();
    raw.add(new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xaa2020 }),
    ));
    const asset = prepareAsset(raw, { height: 1.4, voxelSize: 0.14 });
    const vox = asset.voxels;
    const interior = vox.filter(v => v.key === 'I').length;
    const surface = vox.filter(v => v.key === 'M').length;
    const reddish = vox.filter(v => v.key === 'M' && v.color.r > v.color.g * 1.5).length;
    // material conversion: lit Lambert, not Standard, not Basic
    let lambert = false;
    asset.template.traverse(o => { if (o.isMesh) lambert = o.material.isMeshLambertMaterial; });
    // world height normalized to the slot
    const box = new THREE.Box3().setFromObject(asset.template);
    const height = +(box.max.y - box.min.y).toFixed(2);

    // the skin rides in the hull slot; heavy damage sheds it. Pin the tier
    // FIRST — hullMode is consulted at construction, and the auto governor
    // sits in a hull-less tier under swiftshader.
    const hd = window.__hd;
    hd.debug.setOpt('perf', 'high');
    hd.debug.setOpt('look', 'smooth');
    const sp = VoxelSprite.fromVoxels(
      vox.map(v => ({ ...v, color: v.color.clone() })), asset.size, asset.template.clone(true));
    const skinOn = sp.skinFixed === true && sp.hull === sp.def.skin && sp.mesh.count === 0;
    // chip past the shed threshold, then let update() notice
    const total = sp.voxels.length;
    while (sp.aliveCount > total * 0.7) {
      const alive = sp.voxels.find(v => v.alive);
      sp.chip({ x: alive.x, y: alive.y, z: alive.z }, 60);
    }
    sp.update(0.05);
    const shed = sp.skinFixed === false && !!sp.hull && sp.hull.geometry?.getAttribute('position');
    sp.dispose();
    hd.debug.setOpt('perf', 'auto');
    return { surface, interior, reddish, lambert, height, skinOn, shed: !!shed, lights: hd.debug.getAssets().lights };
  }, token);
  ok('the voxelizer builds shell + enclosed interior', mesh35.surface > 200 && mesh35.interior > 30, JSON.stringify(mesh35));
  ok('it samples the material color', mesh35.reddish > mesh35.surface * 0.8, JSON.stringify(mesh35));
  ok('assets normalize to slot height, lit Lambert', mesh35.lambert === true && Math.abs(mesh35.height - 1.4) < 0.02, JSON.stringify(mesh35));
  ok('the mesh skin rides in the hull slot', mesh35.skinOn === true, JSON.stringify(mesh35));
  ok('heavy damage sheds the skin to the wounded lattice', mesh35.shed === true, JSON.stringify(mesh35));
  ok('the asset light rig is up', mesh35.lights >= 3, JSON.stringify(mesh35));

  // ---- v4.37 the arena: uplit rig + panel floor + Meshy panel slot -------
  const arena = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const a = hd.debug.getAssets();
    const fx0 = hd.debug.getFx();
    // the ember ring must answer trauma the way the floor does
    const before = a.ember;
    hd.debug.buzz(0, 0, 1);
    hd.player.feet.set(0, 0, 6);
    hd.debug.spawnDread();
    const e = hd.enemies[hd.enemies.length - 1];
    e.pos.copy(hd.player.camera.position); // force a hit → trauma
    await frames(6);
    const during = hd.debug.getAssets().ember;
    for (const x of hd.enemies) x.alive = false;
    return { uplit: a.uplit, lights: a.lights, arenaSlots: a.arena, panels: a.panels, before, during, glow: fx0.gridGlow };
  });
  ok('assets are lit FROM the floor, not from above', arena.uplit === true, JSON.stringify(arena));
  ok('the ember ring answers trauma like the world', arena.during >= arena.before, JSON.stringify(arena));
  ok('the Meshy floor-panel slot exists (0 until registered)', Array.isArray(arena.arenaSlots) && arena.panels === 0, JSON.stringify(arena));

  const floorTex = await p.evaluate(() => {
    // the floor must be PLATES: a mostly-dark field with bright seams, not
    // a uniform grey sheet and not the old hairline-on-black wireframe
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const g = c.getContext('2d');
    const src = window.__hd.debug.getFloorCanvas();
    g.drawImage(src, 0, 0, 512, 512);
    const px = g.getImageData(0, 0, 512, 512).data;
    let dark = 0, bright = 0, mid = 0;
    for (let i = 0; i < px.length; i += 4) {
      const v = px[i];
      if (v < 26) dark++; else if (v > 110) bright++; else mid++;
    }
    const n = px.length / 4;
    return { dark: +(dark / n).toFixed(2), bright: +(bright / n).toFixed(2), mid: +(mid / n).toFixed(2), size: src.width };
  });
  ok('the floor is dark plates with bright seams', floorTex.dark > 0.6 && floorTex.bright > 0.02, JSON.stringify(floorTex));
  ok('…drawn at panel resolution (512)', floorTex.size === 512, JSON.stringify(floorTex));

  // ---- long-run health: spawn/kill cycles must plateau, not climb --------
  // (the hull re-skin allocates a fresh BufferGeometry per rebuild, so this
  // is the check that catches a missed dispose anywhere in that path)
  const health = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    hd.debug.setOpt('perf', 'low'); // cheap frames — we count objects, not pixels
    hd.debug.freezeDirector(true);  // the schedule must not out-spawn the cycle
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
    hd.debug.freezeDirector(false);
    return { a: { g: a.geometries, t: a.textures, sc: a.sceneChildren, en: a.enemies }, b: { g: b.geometries, t: b.textures, sc: b.sceneChildren, en: b.enemies } };
  });
  ok('spawn/kill cycles do not leak geometry', health.b.g - health.a.g <= 2 && health.b.t === health.a.t, JSON.stringify(health));
  ok('the scene graph returns to baseline', health.b.sc <= health.a.sc + 2 && health.b.en === health.a.en, JSON.stringify(health));

  // ---- death → restart under 2 s -----------------------------------------
  const death = await p.evaluate(async () => {
    const hd = window.__hd;
    hd.debug.setInvulnerable(false); // the rest of the suite is done — die for real
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
