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
  const misses = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  // A 404 is fail-soft here (every asset path has a fallback) and that is
  // exactly why it needs its own watch: three enemy GLBs were requested on
  // every single boot for art that is in no branch, and nothing failed.
  p.on('response', r => { if (r.status() === 404) misses.push(r.url()); });

  // ---- boot --------------------------------------------------------------
  // assets=0 for the bulk of the suite. Everything from here to the v38
  // section tests movement, gunfeel, the director, the render passes and the
  // string-art sculpts — none of it needs 5 MB of Meshy skins in the scene,
  // and with them loaded the software renderer takes minutes per section and
  // stalls outright on the multi-render sphere captures. The art sections
  // below navigate to a page that DOES load it, and check it there.
  await p.goto(base + '/hyperdagger/?assets=0', { waitUntil: 'load' });
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

  // ---- v30 weapon-and-clock frame ---------------------------------------
  await p.waitForFunction(() =>
    document.querySelector('.arcade-home') && document.querySelector('.toko-signature'),
  null, { timeout: 5000 });
  await p.waitForTimeout(700); // let shell/signature fades settle under SwiftShader
  const frame30 = await p.evaluate(() => {
    const css = id => getComputedStyle(document.getElementById(id));
    const weapon = window.__hd.debug.getWeaponView();
    return {
      active: document.body.classList.contains('in-run'),
      kills: css('kills').display,
      gems: css('gems').display,
      style: css('style').display,
      timer: css('timer').fontSize,
      pause: +css('pauseBtn').opacity,
      home: +getComputedStyle(document.querySelector('.arcade-home')).opacity,
      signature: +getComputedStyle(document.querySelector('.toko-signature')).opacity,
      weapon,
    };
  });
  ok('the active frame is clock-only',
    frame30.active && frame30.kills === 'none' && frame30.gems === 'none' &&
    frame30.style === 'none' && frame30.timer === '27px', JSON.stringify(frame30));
  ok('shell controls retreat during the fight',
    frame30.pause <= 0.16 && frame30.home <= 0.08 && frame30.signature <= 0.08,
    JSON.stringify(frame30));
  ok('the four-dagger hand sits bottom-centre',
    Math.abs(frame30.weapon.x) < 0.02 && Math.abs(frame30.weapon.y + 0.92) < 0.02 &&
    Math.abs(frame30.weapon.z + 1.5) < 0.02 && Math.abs(frame30.weapon.rx + 0.75) < 0.01 &&
    Math.abs(frame30.weapon.ry - (Math.PI + 0.12)) < 0.01 && Math.abs(frame30.weapon.rz) < 0.01,
    JSON.stringify(frame30.weapon));

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

  // ---- v28 software-rendered frame --------------------------------------
  const raster28 = await p.evaluate(() => window.__hd.debug.getRaster());
  ok('v28 renders a deliberately coarse software raster',
    raster28.pixelRatio <= 0.72 &&
    raster28.buffer.w <= Math.ceil(raster28.viewport.w * 0.73) &&
    raster28.buffer.h <= Math.ceil(raster28.viewport.h * 0.73),
    JSON.stringify(raster28));
  ok('the coarse buffer is enlarged with hard pixels',
    raster28.scaling === 'pixelated', JSON.stringify(raster28));
  ok('the soot floor is a tiny unfiltered texture',
    raster28.floor.w === 128 && raster28.floor.h === 128 &&
    raster28.floor.nearest === true && raster28.floor.mipmaps === false,
    JSON.stringify(raster28.floor));
  ok('the weapon carries aim without a HUD crosshair',
    raster28.crosshair === 'none', JSON.stringify(raster28));

  // ---- tuning.js is what the game actually reads -------------------------
  const tun = await p.evaluate(() => {
    const hd = window.__hd; const t = hd.debug.getTuning();
    return { dash: t.dash.speed, lv4: t.weapon.tiers[4].stream, sg: t.weapon.shotgunCount[1],
      player: hd.player.speed === t.player.speed, bleed: t.style.bleedBase,
      jumps: t.player.maxJumps, straight: t.player.speed,
      streamSpeed: t.weapon.streamSpeed, shotgunSpeed: t.weapon.shotgunSpeed,
      // DD economy invariant: burst DPS < stream DPS at every weapon level
      economy: t.weapon.tiers.every((tier, lv) =>
        !tier || t.weapon.shotgunCount[lv] / t.weapon.shotgunCd < tier.stream),
    };
  });
  ok('TUNING drives the game', tun.dash === 30 && tun.lv4 === 106 && tun.player && tun.bleed === 5, JSON.stringify(tun));
  ok('the burst never out-DPSes the stream', tun.economy === true && tun.sg === 10, JSON.stringify(tun));
  ok('shotgun daggers outrun the stream', tun.shotgunSpeed >= tun.streamSpeed * 1.5, JSON.stringify(tun));

  // ---- v31 PURE becomes an authored DD ruleset -------------------------
  const rules31 = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    hd.debug.setTime(3.05);
    await frames(3);
    const squid = hd.enemies.find(e => e.ddTier === 1);
    if (squid) squid.emit = true;
    await frames(3);
    const skulls = hd.enemies.filter(e => e.alive && e.type === 'skull');
    const leader = skulls.find(e => !e.jawPivot);
    const mouthA = hd.debug.getSkullMouth();
    await frames(6);
    const mouthB = hd.debug.getSkullMouth();
    const result = {
      mode: hd.debug.getState().mode,
      dash: hd.player.dashEnabled,
      cursor: hd.debug.getSchedule().pureScriptCursor,
      squid: squid ? { hp: squid.hp, gems: squid.gemDrop, interval: squid.interval } : null,
      skulls: skulls.length,
      leader: leader ? { hp: leader.hp, gems: leader.gemDrop } : null,
      mouthA, mouthB,
    };
    for (const e of hd.enemies) e.alive = false;
    await frames(4);
    hd.debug.setTime(0);
    return result;
  });
  ok('PURE uses the fixed 3-second opening and removes dash',
    rules31.mode === 'pure' && !rules31.dash && rules31.cursor >= 1 &&
    rules31.squid?.hp === 10 && rules31.squid?.gems === 1 && rules31.squid?.interval === 20,
    JSON.stringify(rules31));
  ok('a squid emits the DD-shaped 9+1 skull wave',
    rules31.skulls === 10 && rules31.leader?.hp === 5 && rules31.leader?.gems === 1,
    JSON.stringify(rules31));
  ok('basic skulls carry a separately animated jaw',
    rules31.mouthA.animated && rules31.mouthA.parts === 2 &&
    rules31.mouthA.phase !== rules31.mouthB.phase && rules31.mouthB.open >= 0.05 &&
    rules31.mouthB.jaw?.cubes > 0 && !rules31.mouthB.jaw?.hull,
    JSON.stringify(rules31));

  const gemRules31 = await p.evaluate(() => {
    const hd = window.__hd;
    hd.gems.reset();
    const player = hd.player.feet.clone(); player.y += 1.1;
    hd.gems.spawn(player);
    const g = hd.gems.active[0];
    g.m.position.set(player.x + 10, player.y, player.z); g.vel.set(0, 0, 0);
    const x0 = g.m.position.x;
    hd.gems.update(0.1, player, false);
    const xFiring = g.m.position.x;
    g.vel.set(0, 0, 0);
    hd.gems.update(0.1, player, true);
    const xIdle = g.m.position.x;
    g.m.position.set(player.x + 5, player.y, player.z); g.vel.set(0, 0, 0);
    hd.gems.blast(player);
    const blastVx = g.vel.x;
    hd.gems.reset();
    return { x0, xFiring, xIdle, blastVx, life: hd.debug.getTuning().gems.lifetime };
  });
  ok('gems attract only while idle and shotgun pressure repels them',
    Math.abs(gemRules31.xFiring - gemRules31.x0) < 0.001 &&
    gemRules31.xIdle < gemRules31.xFiring && gemRules31.blastVx > 0 && gemRules31.life === 10,
    JSON.stringify(gemRules31));

  // ---- v29 90s-FPS movement: diagonal, momentum, hop, dagger jump -------
  const move29 = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    for (const e of hd.enemies) e.alive = false;
    hd.enemies.length = 0;
    const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));

    hd.player.reset();
    key('keydown', 'KeyW');
    await frames(20);
    const straight = hd.debug.getMovement().speed;
    key('keyup', 'KeyW');

    hd.player.reset();
    key('keydown', 'KeyW'); key('keydown', 'KeyD');
    await frames(20);
    const diagonal = hd.debug.getMovement().speed;
    key('keyup', 'KeyW'); key('keyup', 'KeyD');
    await frames(1);
    const coast = hd.debug.getMovement().speed;
    await frames(18);
    const stopped = hd.debug.getMovement().speed;

    hd.player.reset();
    hd.player.velocity.set(10, 0, 0);
    hd.player.feet.y = 0.08;
    hd.player.vy = -4;
    hd.player.coyoteT = 0;
    hd.player.airTime = 0.3;
    hd.player.input._jump = true;
    await frames(3);
    const hop = hd.debug.getMovement();
    const beforeSecond = hop.vy;
    hd.player.input._jump = true;
    await frames(1);
    const second = hd.debug.getMovement();

    hd.player.reset();
    hd.player.feet.y = 0.25;
    hd.player.vy = 4;
    hd.player.airTime = 0.1;
    const daggerFirst = hd.player.daggerJump({ x: 0.2, y: -0.9, z: -0.4 });
    const daggerTooSoon = hd.player.daggerJump({ x: 0.2, y: -0.9, z: -0.4 });
    hd.player.vy = 2;
    hd.player.airTime = 0.75;
    const daggerSecond = hd.player.daggerJump({ x: 0.2, y: -0.9, z: -0.4 });
    const dagger = hd.debug.getMovement();

    hd.debug.spawnSkull();
    const skull = hd.enemies[hd.enemies.length - 1];
    const pressure = { speed: skull.maxSpeed, accel: skull.accel };
    skull.alive = false;
    hd.player.reset();
    return { straight, diagonal, coast, stopped, hop, beforeSecond, second,
      daggerFirst, daggerTooSoon, daggerSecond, dagger, pressure };
  });
  ok('forward + strafe is materially faster than a straight run',
    move29.diagonal > move29.straight * 1.25, JSON.stringify(move29));
  ok('movement carries velocity, then ground friction settles it',
    move29.coast > 1 && move29.stopped < 0.5, JSON.stringify(move29));
  ok('a buffered landing hop preserves and boosts speed',
    move29.hop.hops === 1 && move29.hop.speed > 10.4 && move29.hop.vy > 0,
    JSON.stringify(move29.hop));
  ok('the old free second jump is gone', move29.second.vy < move29.beforeSecond,
    JSON.stringify({ before: move29.beforeSecond, after: move29.second.vy }));
  ok('downward bursts produce an authored double dagger jump',
    move29.daggerFirst && !move29.daggerTooSoon && move29.daggerSecond &&
    move29.dagger.vy > 10 && move29.dagger.daggerJumps === 2,
    JSON.stringify(move29));
  ok('skulls beat straight speed but leave a turning window',
    move29.pressure.speed > tun.straight && move29.pressure.accel < 10,
    JSON.stringify(move29.pressure));

  const impact29 = await p.evaluate(() => window.__hd.debug.getImpact());
  ok('hits use an 8px unfiltered software sprite',
    impact29.w === 8 && impact29.h === 8 && impact29.nearest && !impact29.mipmaps,
    JSON.stringify(impact29));

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
    const viewAfterTap = hd.debug.getWeaponView();
    const tapSpeeds = hd.daggers.active.map(d => d.vel.length());
    // wait out the shotgun lockout, then HOLD: stream after streamDelay
    while (hd.debug.getGun().shotCd > 0) await frames(2);
    hd.daggers.reset();
    const d2 = shots;
    hd.player.input.mouseDown = true;
    await frames(1); // one frame is still inside the short detection window
    const early = shots - d2;
    await frames(4); // stream is live by ~0.15s rather than waiting 0.22s
    const responsive = shots - d2;
    await frames(8);
    const streamed = shots - d2;
    const streamSpeeds = hd.daggers.active.map(d => d.vel.length());
    const d3 = shots;
    hd.player.input.mouseDown = false; // long hold released → must NOT shotgun
    await frames(3);
    const releaseFired = shots - d3;
    hd.daggers.fire = realFire;
    return { moveFired, tapFired, cdAfterTap, viewAfterTap, tapSpeeds,
      early, responsive, streamed, streamSpeeds, releaseFired };
  });
  ok('moving alone no longer fires', gun.moveFired === 0, JSON.stringify(gun));
  ok('a TAP fires the shotgun burst', gun.tapFired >= 10 && gun.cdAfterTap > 0, JSON.stringify(gun));
  ok('the shotgun visibly kicks the claw', gun.viewAfterTap.recoil > 0.015 && gun.viewAfterTap.z > -1.46, JSON.stringify(gun.viewAfterTap));
  ok('the stream keeps a short tap-detection window', gun.early === 0, JSON.stringify(gun));
  ok('a HOLD starts quickly and forms a dense stream', gun.responsive >= 2 && gun.streamed >= 6, JSON.stringify(gun));
  ok('tap projectiles are faster than held projectiles',
    Math.min(...gun.tapSpeeds) > Math.max(...gun.streamSpeeds), JSON.stringify({ tap: gun.tapSpeeds, stream: gun.streamSpeeds }));
  ok('releasing a long hold is not a tap', gun.releaseFired <= 2, JSON.stringify(gun));

  const touchBurst = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    while (hd.debug.getGun().shotCd > 0) await frames(2);
    hd.daggers.reset();
    hd.player.reset();
    hd.player.feet.y = 0.25;
    hd.player.vy = 4;
    hd.player.airTime = 0.1;
    hd.player.pitch = -1.1;
    hd.player._sync();
    hd.player.input.touchMode = true;
    hd.player.input._fireTap = true;
    const realFire = hd.daggers.fire.bind(hd.daggers);
    let shots = 0;
    hd.daggers.fire = (...args) => { shots++; return realFire(...args); };
    const before = hd.player.daggerJumpCount;
    await frames(2);
    hd.daggers.fire = realFire;
    const result = { shots,
      jumps: hd.player.daggerJumpCount - before, vy: hd.player.vy };
    hd.player.input.touchMode = false;
    hd.player.reset();
    return result;
  });
  ok('touch right-tap fires the burst and can dagger-jump',
    touchBurst.shots >= 10 && touchBurst.jumps === 1 && touchBurst.vy > 9,
    JSON.stringify(touchBurst));

  const homing31 = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    while (hd.debug.getGun().shotCd > 0) await frames(2);
    hd.daggers.reset();
    hd.debug.addGems(70);
    const lv3 = hd.debug.getGun();
    hd.debug.addGems(20);
    const banked = hd.debug.getGun();
    hd.player.input.mouseAltDown = true;
    await frames(1);
    hd.player.input.mouseAltDown = false;
    await frames(2);
    const spent = hd.debug.getGun();
    const homing = hd.daggers.active.filter(d => d.homing && d.damage === 10).length;
    hd.debug.addGems(150);
    const lv4 = hd.debug.getGun();
    hd.daggers.reset();
    return { lv3, banked, spent, homing, lv4 };
  });
  ok('70 gems unlock LV3 and later gems become homing ammo',
    homing31.lv3.lv === 3 && homing31.lv3.homing === 0 && homing31.banked.homing === 20,
    JSON.stringify(homing31));
  ok('RMB spends the bank as ten-damage homing daggers',
    homing31.homing === 20 && homing31.spent.homing === 0,
    JSON.stringify(homing31));
  ok('banking 150 homing daggers unlocks the final hand',
    homing31.lv4.lv === 4 && homing31.lv4.homing === 0,
    JSON.stringify(homing31));

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
    hd.debug.setOpt('smear', true);
    const on = hd.debug.getFx();
    hd.debug.setOpt('edge', false);
    const off = hd.debug.getFx().edge;
    hd.debug.setOpt('edge', true);
    hd.debug.setOpt('perf', 'low'); // T4 must shed the pass regardless of opts
    const tierGated = hd.debug.getFx().edge;
    hd.debug.setOpt('perf', 'high');
    // smear deepens mid-dash and settles back
    const dampIdle = hd.debug.getFx().damp;
    hd.player.dashEnabled = true; // exercise the optional HYPER-mode effect
    hd.player.dashT = hd.debug.getTuning().dash.time;
    await frames(1);
    const dampDash = hd.debug.getFx().damp;
    await frames(30);
    const dampBack = hd.debug.getFx().damp;
    hd.player.dashEnabled = false;
    hd.debug.setOpt('perf', 'auto');
    return { edgeOn: on.edge, glow: on.gridGlow, off, tierGated, dampIdle, dampDash, dampBack };
  });
  ok('neon edge pass on by default at T0', fx.edgeOn === true, JSON.stringify(fx));
  ok('EDGE OFF and the low tier both shed it', fx.off === false && fx.tierGated === false, JSON.stringify(fx));
  ok('the grid stays below the bloom threshold', fx.glow === 0.9, JSON.stringify(fx));
  ok('smear deepens mid-dash, settles back', fx.dampDash > fx.dampIdle + 0.05 && fx.dampBack <= fx.dampIdle + 0.01, JSON.stringify(fx));

  // ---- v4.31 detail overhaul ---------------------------------------------
  const detail31 = await p.evaluate(async (tok) => {
    const { MODELS, parseModel } = await import(`./js/voxel.js?v=${tok}`);
    const base = parseModel(MODELS.skull, 1);
    const xs = base.map(v => v.x);
    const width = Math.max(...xs) - Math.min(...xs) + MODELS.skull.voxelSize;
    const hand = parseModel(MODELS.hand, 1);
    const hxs = hand.map(v => v.x);
    const handWidth = Math.max(...hxs) - Math.min(...hxs) + MODELS.hand.voxelSize;
    const palm = hand.find(v => v.key === 'G').color;
    const finger = hand.find(v => v.key === 'H').color;
    const tip = hand.find(v => v.key === 'B').color;
    const dc = window.__hd.daggers.mesh.material.color;
    // baked AO: bone voxels must NOT all share one flat color any more
    const boneCols = new Set(base.filter(v => v.key === 'W').map(v => v.color.getHexString()));
    return {
      count: base.length, width: +width.toFixed(2), boneShades: boneCols.size,
      handCount: hand.length, handWidth: +handWidth.toFixed(2), handTips: hand.filter(v => v.key === 'B').length,
      handColor: {
        palm: [+palm.r.toFixed(3), +palm.g.toFixed(3), +palm.b.toFixed(3)],
        finger: [+finger.r.toFixed(2), +finger.g.toFixed(2), +finger.b.toFixed(2)],
        tip: [+tip.r.toFixed(2), +tip.g.toFixed(2), +tip.b.toFixed(2)],
      },
      dagger: { r: +dc.r.toFixed(2), g: +dc.g.toFixed(2), b: +dc.b.toFixed(2) },
    };
  }, token);
  ok('the skull is a sculpt now (≥300 source voxels)', detail31.count >= 300, JSON.stringify(detail31));
  ok('the basic skull owns a wider threatening horn silhouette (~2.38)', Math.abs(detail31.width - 2.38) < 0.02, JSON.stringify(detail31));
  // v38: the bake snaps to STYLE.quantize value bands, so a sculpt carries a
  // handful of hard bone tones rather than a gradient — that is the pixel-art
  // read, and "more than one" is the thing being asserted, not "many"
  ok('AO bake gives bone real shading (banded)', detail31.boneShades >= 3, JSON.stringify(detail31));
  ok('the firing hand is a broad four-tip claw', detail31.handCount > 140 && detail31.handWidth === 0.45 && detail31.handTips === 8, JSON.stringify(detail31));
  ok('the original ash-and-bone claw is restored',
    detail31.handColor.palm[0] > 0.3 && detail31.handColor.palm[0] < 1 &&
    detail31.handColor.finger[0] > 0.5 && detail31.handColor.finger[2] > 0.35 &&
    detail31.handColor.tip[0] >= 3.1 && detail31.handColor.tip[1] >= 0.29,
    JSON.stringify(detail31.handColor));
  ok('daggers carry the ember-orange weapon colour', detail31.dagger.r > 2.5 && detail31.dagger.g < 0.5 && detail31.dagger.b < 0.1, JSON.stringify(detail31.dagger));

  const fx31 = await p.evaluate(() => {
    const hd = window.__hd;
    return { glow: hd.debug.getFx().gridGlow, edgeAmt: hd.debug.getFx().edgeAmt };
  });
  ok('the grid is subdued (glow 0.9, edge option 0.15)', fx31.glow === 0.9 && fx31.edgeAmt === 0.15, JSON.stringify(fx31));

  // ---- enemy assets + v26 minimal arena ---------------------------------
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
  ok('the arena background is one horizon line',
    assets22.environment.horizon === 1 && assets22.environment.groupChildren === 1 &&
    assets22.environment.rifts === 0 && assets22.environment.pylons === 0 &&
    assets22.environment.horns === 0 && assets22.environment.shards === 0 &&
    assets22.environment.arches === 0 && assets22.environment.lattice === 0,
    JSON.stringify(assets22.environment));
  ok('rear overlays remain absent by default', assets22.fx.sphere === false && assets22.fx.threat === false, JSON.stringify(assets22.fx));

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
    // Put it back to its default (OFF). Leaving it on made every later
    // section pay six cube-face renders per capture, and since v38 those
    // render full cube lattices rather than a smoothed hull — the suite
    // stalled outright in the serpent motion test that follows.
    hd.debug.setOpt('projection', false);
    await frames(1);
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

  // ---- v4.32 mesh hull: LOOK SMOOTH still works, on the thing that has one --
  // Since v38 the cube look is the default and any roster slot may be a
  // voxelized asset (no hull by design), so this no longer reaches into
  // "whatever dread just spawned" — that hung the suite. The probe builds a
  // string-art dread with the skin forced on and chips it.
  const hull = await p.evaluate(async () => {
    const hd = window.__hd;
    hd.debug.setOpt('perf', 'high');
    const probe = hd.debug.hullProbe();
    hd.debug.setOpt('look', 'smooth');
    const smooth = hd.debug.getLook();
    hd.debug.setOpt('look', 'cubes');
    const cubes = hd.debug.getLook();
    hd.debug.setOpt('perf', 'auto');
    return { ...probe, smoothMode: smooth.mode, smoothHull: smooth.hullMode, cubesHull: cubes.hullMode };
  });
  ok('the cube look is the default alive-look', hull.defaultHull === false && hull.cubesHull === false, JSON.stringify(hull));
  ok('LOOK SMOOTH still builds a skin that hides the cubes', hull.hadHull && hull.cubesHidden === 0 && hull.smoothHull === true, JSON.stringify(hull));
  ok('a chip tears and re-forms the skin', hull.after > 0 && hull.after !== hull.before, JSON.stringify(hull));

  // ---- long-run health: spawn/kill cycles must plateau, not climb --------
  // (the hull re-skin allocates a fresh BufferGeometry per rebuild, so this
  // is the check that catches a missed dispose anywhere in that path)
  const health = await p.evaluate(async () => {
    const hd = window.__hd;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    hd.debug.setTime(0); // generated pressure would measure the director, not leaks
    for (const e of hd.enemies) e.alive = false;
    await frames(4);
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
    // Guarantee a LIVE run before killing it. debug.die() is a no-op unless
    // state === 'playing', and by this point in the suite the player has
    // often already been killed by the director — so the assertion below
    // read a stale frame and failed for reasons that had nothing to do with
    // the frame logic. (Verified in isolation: die() clears in-run and a
    // restart restores it, every time.)
    if (hd.debug.getState().state !== 'playing') {
      hd.debug.startGame?.();
      await new Promise(r => requestAnimationFrame(r));
    }
    hd.debug.die();
    return {
      state: hd.debug.getState().state,
      activeFrame: document.body.classList.contains('in-run'),
    };
  });
  ok('debug.die() reaches the death screen', death.state === 'dead');
  await p.waitForTimeout(1200); // death screen ignores input for 700ms
  // click clear of the death screen's own buttons (they stopPropagation)
  await p.mouse.click(880, 620);
  const restarted = await p.waitForFunction(
    () => window.__hd.debug.getState().state === 'playing', null, { timeout: 4000 }).then(() => true, () => false);
  ok('one click restarts within 2s', restarted);
  // the restart's frame swap lands a tick after state flips to 'playing'
  const retreated = await p.waitForFunction(
    () => document.body.classList.contains('in-run'), null, { timeout: 4000 }).then(() => true, () => false);
  ok('the full shell returns off-run and retreats again on restart',
    !death.activeFrame && retreated);

  // ---- v36 the mode lab: every registered experiment boots ---------------
  // This section exists because TRUCK was LOST. v33's notes promise a three-
  // way mode cycle; the toggle was a two-way flip, truck.js was never
  // imported, and nothing failed — a whole named experiment existed only on
  // paper for three releases. So the gate does not test "pure and hyper", it
  // walks the registry: whatever is in MODES has to boot, has to get the body
  // it declared, and has to have something under its feet.
  const registry = await p.evaluate(() => window.__hd.debug.getModes());
  ok('the registry declares at least the three named experiments',
    ['pure', 'hyper', 'truck'].every(id => registry.ids.includes(id)),
    registry.ids.join(','));
  ok('every mode declares a hi-score key or explicitly none',
    registry.modes.every(m => typeof m.hiKey === 'string' || m.hiKey === null));
  ok('every mode declares an arena, an edge, a director and a lethality',
    registry.modes.every(m => m.arena && m.edge && m.director && m.lethality));

  for (const id of registry.ids) {
    // assets=0: this loop tests the mode registry, not the art, and fetching
    // 5 MB of GLB on each of four reloads is most of the suite's wall clock
    await p.goto(base + '/hyperdagger/?assets=0&mode=' + id, { waitUntil: 'load' });
    await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
    await p.evaluate(() => localStorage.setItem('hyperDaggerSeenTips', '1'));
    await p.evaluate(() => window.__hd.debug.startGame());
    const tick = n => p.evaluate(count => new Promise(r => {
      let i = 0; const t = () => (++i > count ? r() : requestAnimationFrame(t)); requestAnimationFrame(t);
    }), n);
    // Read the body the moment the run opens. Later is not the same question:
    // a bot never steers, and a track is a route, so "still alive after a
    // minute" would only ever measure whether the road happened to run straight.
    await tick(3);
    const m = await p.evaluate(() => window.__hd.debug.getModes());
    const decl = m.modes.find(x => x.id === m.current);
    ok(`${id}: boots into its own mode`, m.current === id, m.current);
    ok(`${id}: the body is the one the mode declared`,
      m.player.maxJumps === decl.resolved.jumps
      && m.player.abilities.dash === decl.resolved.dash
      && m.player.abilities.glide === decl.resolved.glide
      && m.player.edgeMode === decl.edge,
      JSON.stringify({ got: m.player.maxJumps, want: decl.resolved.jumps, edge: m.player.edgeMode }));
    // The bug this catches: an edge value folded into "open" left the disc
    // modes with no floor at all and the body fell through the arena.
    ok(`${id}: there is a floor under it`,
      Number.isFinite(m.player.floorY) && m.player.feetY >= m.player.floorY - 0.6,
      `floorY=${m.player.floorY} y=${m.player.feetY}`);
    await tick(60);
    const late = await p.evaluate(() => ({
      state: window.__hd.debug.getState().state,
      platforms: window.__hd.debug.getModes().trackPlatforms,
    }));
    if (decl.arena === 'track') {
      // A track keeps laying itself ahead of the player for as long as the
      // run lasts; whether a bot that never steers stays on it is not the
      // gate's business.
      ok(`${id}: the track keeps building ahead`, late.platforms > 4, String(late.platforms));
    } else {
      ok(`${id}: survives a minute of its own director`, late.state === 'playing', late.state);
    }
  }

  // The bench mode cannot kill you, so without a way out of a run the only
  // way to change experiment was a page reload. (The loop above leaves the
  // page on the last registered mode, which is exactly the one that proves it.)
  await p.evaluate(() => window.__hd.debug.startGame()); // guarantee a live run
  await p.click('#pauseBtn');  // (still on the assets=0 page from the loop above)
  await p.waitForSelector('#endBtn', { timeout: 5000 });
  await p.click('#endBtn');
  const backAtMenu = await p.evaluate(() => ({
    state: window.__hd.debug.getState().state,
    canSwitch: !!document.getElementById('modeBtn'),
  }));
  ok('END RUN leaves a run for the mode menu', backAtMenu.state === 'menu', backAtMenu.state);
  ok('and the mode toggle is there when you land', backAtMenu.canSwitch);

  // ---- v38 the voxel route: the roster is the owner's Meshy art, as cubes --
  // back onto a page that actually loads the art (the mode loop ran assets=0)
  await p.goto(base + '/hyperdagger/', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
  await p.evaluate(() => localStorage.setItem('hyperDaggerSeenTips', '1'));
  // Wait for the art BEFORE starting a run. Loading fourteen sculpts takes
  // real seconds on a software renderer, and a run left playing through it
  // kills the stationary player — the loop then stops, baseUpdate never runs,
  // and nothing ever puts a skin on anything.
  await p.waitForFunction(() => Object.keys(window.__hd.debug.getVoxelModels()).length >= 14, null, { timeout: 180000 }).catch(() => {});
  await p.evaluate(() => {
    window.__hd.debug.startGame();
    window.__hd.debug.freezeDirector?.(true);
    window.__hd.debug.setInvulnerable?.(true);
  });
  const vox = await p.evaluate(async () => {
    const hd = window.__hd;
    // skins ride the perf tier's hull switch, and this software renderer's
    // governor settles low — force the tier that HAS them, or the check
    // measures the shed path instead of the skin path
    hd.debug.setOpt('perf', 'high');
    const models = hd.debug.getVoxelModels();
    const style = hd.debug.getVoxelStyle();
    // spawn one of each overridden kind the debug menu can reach and read
    // what the enemy is actually holding
    for (const e of hd.enemies) e.alive = false;
    hd.enemies.length = 0;
    hd.debug.spawnSkull(); hd.debug.spawnDread(); hd.debug.spawnSpider(); hd.debug.spawnWatcher();
    // the skin lands on the frame after spawn
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const held = hd.enemies.map(e => ({ type: e.type, voxels: e.sprite.voxels.length, size: +e.sprite.size.toFixed(3),
      hull: !!e.sprite.hull, jaw: !!e.jaw, hinge: !!e.hinge, skin: !!e.meshRoot, twin: !!e.sprite.def.voxels }));
    for (const e of hd.enemies) e.alive = false;
    hd.enemies.length = 0;
    const total = Object.values(models).reduce((a, m) => a + m.voxels, 0);
    hd.debug.setOpt('perf', 'auto');
    return { models, style, held, total, kinds: Object.keys(models).length };
  });
  ok('every kind the manifest names took its slot', vox.kinds >= 14, JSON.stringify(Object.keys(vox.models)));
  ok('the skull kept its hinge through the swap', vox.models.skull?.hinge === true && vox.held.find(h => h.type === 'skull')?.jaw === true, JSON.stringify(vox.held));
  ok('a spawned skull holds the voxelized asset, not the sculpt',
    (vox.held.find(h => h.type === 'skull')?.voxels ?? 0) > 5000, JSON.stringify(vox.held));
  ok('voxelized enemies wear no hull (cubes are the point)', vox.held.every(h => !h.hull), JSON.stringify(vox.held));
  // the hybrid: alive, a voxelized body wears the Meshy mesh it was cut from
  ok('a voxelized body wears its mesh as the alive-skin', vox.held.every(h => !h.twin || h.skin), JSON.stringify(vox.held));
  ok('a skin never lands on a body that was not cut from it', vox.held.every(h => !h.skin || h.twin), JSON.stringify(vox.held));
  const shed = await p.evaluate(async () => {
    const hd = window.__hd;
    hd.debug.setOpt('perf', 'high'); // as above: the skin only exists on a tier that has it
    if (hd.debug.getState().state !== 'playing') { hd.debug.startGame(); hd.debug.setInvulnerable?.(true); }
    hd.debug.spawnSkull();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const e = hd.enemies[hd.enemies.length - 1];
    const before = !!e.meshRoot;
    const sp = e.sprite; e.group.updateWorldMatrix(true, true);
    for (let i = 0; i < 6; i++) { const wv = sp.worldVoxels(); if (!wv.length) break; sp.chip(wv[0].pos, Math.ceil(sp.voxels.length * 0.06)); }
    e.baseUpdate(0.05);
    const out = { before, after: !!e.meshRoot, shed: !!e.skinShed, lost: 1 - sp.aliveCount / sp.voxels.length, cubesVisible: sp.mesh.visible };
    e.alive = false; hd.enemies.length = 0;
    hd.debug.setOpt('perf', 'auto');
    return out;
  });
  ok('past 22% of the lattice the skin sheds and the cube body shows', shed.before && !shed.after && shed.shed && shed.cubesVisible, JSON.stringify(shed));
  ok('face tone and value banding are on', vox.style.faceShade === true && vox.style.quantize > 0, JSON.stringify(vox.style));
  // one of each of the fourteen at rest is well inside one ×27 dread's worth
  // of instances per enemy; the budget that matters is per-body, and no
  // single body may exceed the 64³ cap the voxelizer enforces
  ok('no voxelized body exceeds the lattice cap', Object.values(vox.models).every(m => m.voxels <= 262144), JSON.stringify(vox.models));
  // the perf ladder's floor must still buy something: at ×1 a spawn holds
  // the coarse twin, ~1/8 the cells of the fine cut
  const lod = await p.evaluate(async () => {
    const hd = window.__hd;
    const fine = hd.debug.getVoxelModels().skull;
    hd.debug.setDetail(1);
    hd.debug.spawnSkull();
    const held = hd.enemies[hd.enemies.length - 1].sprite.voxels.length;
    hd.enemies[hd.enemies.length - 1].alive = false;
    hd.enemies.length = 0;
    hd.debug.setOpt('detail', 'auto');
    return { fine: fine.voxels, lodDeclared: fine.lod, held };
  });
  ok('every voxelized kind carries a coarse twin for the perf floor', Object.values(vox.models).every(m => m.lod > 0 && m.lod < m.voxels), JSON.stringify(vox.models));
  // (a skull holds its HEAD — the jaw is a second sprite — so the held count
  //  is at most the twin's, never equal to it)
  ok('at the ladder floor a spawn holds the coarse twin', lod.held > 0 && lod.held <= lod.lodDeclared && lod.held < lod.fine / 3, JSON.stringify(lod));

  // ---- v37 the Meshy seam ------------------------------------------------
  // The loader for this whole system was never called from anywhere, so 5 MB
  // of exported art had never once been on screen and nothing said so. These
  // checks are about the SEAM, not about any particular art being on: the
  // manifest is the single list, and an empty one must cost nothing.
  const skins = await p.evaluate(() => window.__hd.debug.getMeshSkins());
  ok('the mesh-skin loader actually runs at boot', skins.ran === true);
  ok('every declared skin loaded', skins.declared.every(k => skins.loaded.includes(k)),
    JSON.stringify(skins));
  const manifest = await p.evaluate(async () => {
    const r = await fetch('assets/manifest.json');
    return r.ok ? await r.json() : null;
  });
  ok('the manifest is present and parses', !!manifest && typeof manifest.models === 'object');
  const declaredFiles = Object.values(manifest?.models ?? {})
    .map(v => (typeof v === 'string' ? v : v?.file)).filter(Boolean);
  const cached = await p.evaluate(async () => {
    const r = await fetch('sw.js');
    return r.ok ? await r.text() : '';
  });
  // The manifest is precached (it is what says the art exists); the GLBs
  // are NOT — ~5 MB that fails soft to the string-art sculpts, and the
  // worker is network-first with a cache write, so they land the first time
  // you play. Precaching them made install a 5 MB download to be useful.
  ok('the worker precaches the manifest but not the art it names',
    cached.includes('./assets/manifest.json')
    && declaredFiles.every(f => !cached.includes(`./assets/${f}`)),
    declaredFiles.join(','));

  // ---- nothing is asked for that is not there ----------------------------
  ok('the game never requests a file that is not in the tree',
    misses.length === 0, misses.slice(0, 4).join(' | '));

  // ---- zero errors across the whole run ----------------------------------
  ok('still zero page errors at the end', errs.length === 0, errs.slice(0, 4).join(' | '));

  await b.close();
  s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
