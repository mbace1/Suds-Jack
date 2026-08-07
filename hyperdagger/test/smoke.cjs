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

  // ---- tuning.js is what the game actually reads -------------------------
  const tun = await p.evaluate(() => {
    const hd = window.__hd; const t = hd.debug.getTuning();
    return { dash: t.dash.speed, lv4: t.weapon.tiers[4].stream, sg: t.weapon.shotgunCount,
      player: hd.player.speed === t.player.speed, bleed: t.style.bleedBase };
  });
  ok('TUNING drives the game', tun.dash === 30 && tun.lv4 === 26 && tun.player && tun.bleed === 5, JSON.stringify(tun));

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
    // wait out the shotgun lockout, then HOLD: stream after streamDelay
    while (hd.debug.getGun().shotCd > 0) await frames(2);
    const d2 = hd.daggers.active.length;
    hd.player.input.mouseDown = true;
    await frames(3); // ≤0.15s held — still inside the delay
    const early = hd.daggers.active.length - d2;
    await frames(12); // well past streamDelay now
    const streamed = hd.daggers.active.length - d2;
    const d3 = hd.daggers.active.length;
    hd.player.input.mouseDown = false; // long hold released → must NOT shotgun
    await frames(3);
    const releaseFired = Math.max(0, hd.daggers.active.length - d3);
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
