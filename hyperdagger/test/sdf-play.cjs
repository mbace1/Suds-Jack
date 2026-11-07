// Hyper Dagger — the SDF skulls, PLAYED: picked on the real menu, then a run in
// each of the three seasons.   NODE_PATH=$(npm root -g) node hyperdagger/test/sdf-play.cjs
//
// sdf-menu.cjs proves the switch and sdf-skull.cjs the shader. This one proves
// the choice reaches the game: a finger picks RENDER · SDF and the season on
// the menu, START plays it, and then, in that run:
//   - the skulls the season's own director spawns are SDF skulls, never skinned;
//   - skull, splitter and dread come up as their own profiles;
//   - an SDF skull in front of the eye is actually drawn (the frame with it
//     against the same frame without it);
//   - the season's own weapon kills them: a finger held on the right stick in
//     Ember and Inca, the look and its missiles in season 3 (debug calls only
//     set the scene up — #628 review). The death throws the skull's voxels
//     (physical gibs, and the spray; on season 3's road only the spray) and
//     releases the shader, and a splitter splits into SDF minis;
//   - END RUN, RENDER · CLASSIC, START: the skulls are voxels again.
// Phone landscape with touch, the view where the menu is tightest. Waits are
// on game time, not frames (a ~4 fps software renderer).
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const s = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

// [season, wait on its own director?]. Inca's skulls come only while the goo
// trough lines up, on per-frame odds, with an 8%-a-frame chance of a 10 s
// breather; on a ~4 fps renderer that is too rare to wait for. Inca builds its
// skulls from the same classes the hand-spawned family below covers.
const SEASONS = [['ember', true], ['inca', false], ['haul', true]];

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    env: { ...process.env, LD_LIBRARY_PATH: process.env.PLAYWRIGHT_CHROMIUM_LIB || process.env.LD_LIBRARY_PATH },
    args: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? ['--no-sandbox', '--single-process', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--in-process-gpu']
      : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
  });
  try {
    for (const [sn, natural] of SEASONS) {
      const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
      const p = await ctx.newPage(); p.setDefaultTimeout(120000);
      const errs = [];
      p.on('pageerror', e => errs.push('pageerror: ' + e.message));
      p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
      await p.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
        localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerRunKind', 'free'); localStorage.setItem('hyperDaggerRenderer', 'classic'); });
      await p.goto(base + '/hyperdagger/?assets=0', { waitUntil: 'load' });
      await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 120000 });
      const tap = async sel => { const bb = await p.locator(sel).boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(150); };
      const frames = n => p.evaluate(async n => { for (let i = 0; i < n; i++) await new Promise(r => requestAnimationFrame(r)); }, n);

      await tap(`#msg button.mn-season[data-season="${sn}"]`);
      await tap('[data-renderer="sdf"]');
      const picked = await p.evaluate(() => ({ state: window.__hd.debug.getState().state, on: document.querySelector('[data-renderer="sdf"]').getAttribute('aria-pressed'), saved: localStorage.getItem('hyperDaggerRenderer') }));
      ok(`${sn}: a finger on RENDER · SDF picks it, saves it, and starts nothing`, picked.state === 'menu' && picked.on === 'true' && picked.saved === 'sdf', JSON.stringify(picked));
      await tap('#startBtn');
      await p.waitForFunction(() => window.__hd.debug.getState().state === 'playing');

      if (natural) {
        const seen = await p.evaluate(async () => {
          const d = window.__hd.debug, hd = window.__hd, f = () => new Promise(r => requestAnimationFrame(r));
          d.setInvulnerable(true);
          const t0 = d.getState().gameTime; const seen = new Map();
          for (let i = 0; i < 4000 && d.getState().gameTime - t0 < 20 && seen.size < 3; i++) {
            await f();
            for (const e of hd.enemies) if (e.type === 'skull' || e.type === 'dread') seen.set(e, { type: e.type, sdf: e.sdfRoot?.userData.sdfVariant ?? null, skin: !!e.meshRoot });
          }
          return { t: +(d.getState().gameTime - t0).toFixed(1), list: [...seen.values()] };
        });
        ok(`${sn}: the skulls the season's own director spawns are SDF skulls, none skinned (${seen.list.length} in ${seen.t}s)`,
          seen.list.length > 0 && seen.list.every(e => e.sdf && !e.skin), JSON.stringify(seen.list));
      } else {
        await p.evaluate(() => window.__hd.debug.setInvulnerable(true));
      }

      const fam = await p.evaluate(async () => {
        const d = window.__hd.debug, hd = window.__hd, f = () => new Promise(r => requestAnimationFrame(r));
        d.freezeDirector(true);
        for (const e of [...hd.enemies]) if (e.alive) d.killEnemy(e);
        for (let i = 0; i < 4; i++) await f();
        d.spawnSkull(); d.spawnSplitter(); d.spawnDread();
        return hd.enemies.filter(e => e.alive).map(e => ({ sdf: e.sdfRoot?.userData.sdfVariant ?? null, hp: e.hp }));
      });
      ok(`${sn}: skull, splitter and dread come up as their own SDF profiles with their own health`,
        [['skull', 1], ['splitter', 4], ['dread', 8]].every(([v, hp]) => fam.some(e => e.sdf === v && e.hp === hp)), JSON.stringify(fam));

      // drawn: one skull parked in front of the eye, the frame with it and without it
      await p.evaluate(async () => {
        const d = window.__hd.debug, hd = window.__hd, f = () => new Promise(r => requestAnimationFrame(r));
        const cam = hd.player.camera; const fwd = new cam.position.constructor(0, 0, -1).applyQuaternion(cam.quaternion);
        const sk = hd.enemies.find(e => e.alive && e.sdfRoot?.userData.sdfVariant === 'skull');
        for (const e of hd.enemies) if (e !== sk && e.alive) d.killEnemy(e);
        // held still and at full size: its update (and with it the spawn
        // grow-in) stops here, so the size must not depend on frame timing
        sk.update = () => {}; sk.spawnK = 1; sk.group.scale.setScalar(1);
        sk.pos.copy(cam.position).addScaledVector(fwd, 3.2); sk.group.position.copy(sk.pos); sk.group.lookAt(cam.position);
        window.__parked = sk;
        for (let i = 0; i < 8; i++) await f();
      });
      const clip = { x: 844 / 2 - 90, y: 390 / 2 - 90, width: 180, height: 180 };
      const shotWith = (await p.screenshot({ clip })).toString('base64');
      await p.evaluate(() => { window.__parked.sdfRoot.visible = false; });
      await frames(4);
      const shotWithout = (await p.screenshot({ clip })).toString('base64');
      await p.evaluate(() => { window.__parked.sdfRoot.visible = true; });
      const drawn = await p.evaluate(async ([a, b]) => {
        const read = src => new Promise(r => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); r(g.getImageData(0, 0, c.width, c.height).data); }; im.src = 'data:image/png;base64,' + src; });
        const A = await read(a), B = await read(b);
        let changed = 0, bone = 0;
        for (let i = 0; i < A.length; i += 4) {
          if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 60) changed++;
          if (A[i] > 90 && A[i] >= A[i + 1] && A[i + 1] >= A[i + 2] && A[i] - A[i + 2] < 90) bone++;
        }
        return { share: +(changed / (A.length / 4)).toFixed(3), bone: +(bone / (A.length / 4)).toFixed(3) };
      }, [shotWith, shotWithout]);
      ok(`${sn}: an SDF skull in front of the eye is drawn — bone where the frame without it has none`, drawn.share > 0.05 && drawn.bone > 0.03, JSON.stringify(drawn));

      // THE KILLS ARE REAL (#628 review). Debug calls only set the scene up;
      // the death comes from the season's own weapon: a finger held on the
      // right stick streams daggers in Ember and Inca, and in season 3, which
      // has no gun, the look locks the skull and the missiles kill it.
      const gun = sn !== 'haul';
      const cdp = await ctx.newCDPSession(p);
      const hold = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 640, y: 260, id: 7 }] });
      const lift = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const killByPlay = async (setup, sec) => {
        if (gun) await hold();
        const r = await p.evaluate(async ([setup, sec]) => {
          const d = window.__hd.debug, hd = window.__hd, f = () => new Promise(r => requestAnimationFrame(r));
          const cam = hd.player.camera;
          const fwd = () => new cam.position.constructor(0, 0, -1).applyQuaternion(cam.quaternion);
          const e = setup === 'parked' ? window.__parked : (() => { d.spawnSplitter(); const sp = hd.enemies.at(-1); sp.update = function (dt) { this.baseUpdate(dt); }; sp.spawnK = 1; sp.group.scale.setScalar(1); return sp; })();
          // a death hands its voxels to the physical gibs and the rest to the
          // debris spray; on season 3's road the gibs are off by design and
          // the spray takes all of them, so count both
          const g0 = d.getGibs().n; let spray = 0;
          const burst = hd.debris.burst.bind(hd.debris);
          hd.debris.burst = (vox, ...rest) => { spray += vox.length; return burst(vox, ...rest); };
          const t0 = d.getState().gameTime;
          for (let i = 0; i < 6000 && e.alive && d.getState().gameTime - t0 < sec; i++) {
            e.pos.copy(cam.position).addScaledVector(fwd(), 6); e.group.position.copy(e.pos); e.group.lookAt(cam.position);   // held in the eye line
            await f();
          }
          // the minis are counted the moment the parent dies: the stream is
          // still running, and a few frames later it has killed some of them
          const minis = hd.enemies.filter(x => x.alive && x.radius < 0.5).map(x => x.sdfRoot?.userData.sdfVariant ?? null);
          for (let i = 0; i < 3; i++) await f();
          hd.debris.burst = burst;
          return { variant: e.sdfRoot?.userData.sdfVariant ?? 'released', dead: !e.alive, t: +(d.getState().gameTime - t0).toFixed(1), gibs: [g0, d.getGibs().n], spray, released: e.sdfRoot === null, minis };
        }, [setup, sec]);
        if (gun) await lift();
        return r;
      };
      const how = gun ? 'a finger held on the right stick' : 'the look and its missiles';
      const kill = await killByPlay('parked', 15);
      ok(`${sn}: ${how} kills an SDF skull`, kill.dead, JSON.stringify(kill));
      ok(`${sn}: that death throws the skull's voxels (gibs, spray) and releases its shader`, kill.dead && kill.gibs[1] - kill.gibs[0] + kill.spray > 0 && kill.released, JSON.stringify(kill));
      await p.evaluate(async () => { const d = window.__hd.debug; for (const e of [...window.__hd.enemies]) if (e.alive) d.killEnemy(e); for (let i = 0; i < 4; i++) await new Promise(r => requestAnimationFrame(r)); });   // setup: a clear field
      const split = await killByPlay('splitter', 25);
      ok(`${sn}: ${how} kills an SDF splitter, and it splits into SDF minis`, split.dead && split.minis.length >= 2 && split.minis.every(v => v === 'mini'), JSON.stringify(split));

      await p.evaluate(async () => {
        const f = () => new Promise(r => requestAnimationFrame(r));
        document.getElementById('pauseBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        await f(); await f();
        document.getElementById('endBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        for (let i = 0; i < 4; i++) await f();
      });
      const back = await p.evaluate(() => window.__hd.debug.getState().state);
      await tap('[data-renderer="classic"]');
      await tap('#startBtn');
      await p.waitForFunction(() => window.__hd.debug.getState().state === 'playing');
      const classic = await p.evaluate(async () => { const d = window.__hd.debug; d.freezeDirector(true); const sk = d.spawnSkull(); await new Promise(r => requestAnimationFrame(r)); return { sdf: !!sk.sdfRoot, saved: localStorage.getItem('hyperDaggerRenderer') }; });
      ok(`${sn}: END RUN, RENDER · CLASSIC, START — the skulls are voxels again`, back === 'menu' && !classic.sdf && classic.saved === 'classic', JSON.stringify({ back, classic }));
      ok(`${sn}: zero page or console errors`, errs.length === 0, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // build 3's test arena, reached the way a player reaches it: the header
    // chip on the menu (shown while SDF is on), then START. It opens with a
    // Watcher and a Totem, both SDF since build 3.
    {
      const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
      const p = await ctx.newPage(); p.setDefaultTimeout(120000);
      const errs = [];
      p.on('pageerror', e => errs.push('pageerror: ' + e.message));
      p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
      await p.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
        localStorage.setItem('hyperDaggerSeenTips', '1'); localStorage.setItem('hyperDaggerRunKind', 'free'); localStorage.setItem('hyperDaggerRenderer', 'sdf'); });
      await p.goto(base + '/hyperdagger/?assets=0', { waitUntil: 'load' });
      await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 120000 });
      const chip = await p.locator('[data-sdf-arena]').boundingBox();
      const start0 = await p.locator('#startBtn').boundingBox();
      ok('test arena: the chip is on the SDF menu, 44 px tall, and START is still whole on the screen',
        !!chip && Math.round(chip.height) >= 44 && start0 && start0.y + start0.height <= 390, JSON.stringify({ chip, start0 }));
      await Promise.all([p.waitForNavigation({ waitUntil: 'load' }), p.touchscreen.tap(chip.x + chip.width / 2, chip.y + chip.height / 2)]);
      await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 120000 });
      const there = await p.evaluate(() => ({ url: location.search, sub: document.querySelector('#msg .mn-sub')?.textContent ?? '', state: window.__hd.debug.getState().state }));
      ok('test arena: the chip opens the SDF test arena on its menu', /sdfTest=1/.test(there.url) && /SDF TEST ARENA/.test(there.sub) && there.state === 'menu', JSON.stringify(there));
      const sb = await p.locator('#startBtn').boundingBox();
      await p.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2);
      await p.waitForFunction(() => window.__hd.debug.getState().state === 'playing');
      const cdp = await ctx.newCDPSession(p);
      const hold = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 640, y: 260, id: 7 }] });
      const lift = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const bodies = await p.evaluate(() => {
        const d = window.__hd.debug, hd = window.__hd;
        d.setInvulnerable(true);
        const body = t => hd.enemies.find(e => e.alive && e.type === t);
        window.__w = body('watcher'); window.__t = body('totem');
        return { watcher: window.__w?.sdfRoot?.userData.sdfVariant ?? null, totem: window.__t?.sdfRoot?.userData.sdfVariant ?? null };
      });
      // the Watcher still does its job: an aimed volley within a few seconds
      const volley = await p.evaluate(async () => {
        const d = window.__hd.debug, hd = window.__hd, f = () => new Promise(r => requestAnimationFrame(r));
        let orbs = 0; const t0 = d.getState().gameTime;
        for (let i = 0; i < 4000 && d.getState().gameTime - t0 < 9 && !orbs; i++) { await f(); orbs = hd.orbs.active.length; }
        return { orbs, t: +(d.getState().gameTime - t0).toFixed(1) };
      });
      // held fire at a body that moves on its own: the CAMERA is turned to it
      // each frame (setup of the aim), and the daggers do the rest
      const fireAt = (name, until, sec) => p.evaluate(async ([name, until, sec]) => {
        const d = window.__hd.debug, hd = window.__hd, f = () => new Promise(r => requestAnimationFrame(r));
        const e = window['__' + name], pl = hd.player, c = new pl.camera.position.constructor();
        const hp0 = e.hp, t0 = d.getState().gameTime;
        const done = () => until === 'wound' ? e.sdfRoot && e.sdfRoot.material.uniforms.woundCount.value > 0 : !e.alive;
        for (let i = 0; i < 8000 && !done() && d.getState().gameTime - t0 < sec; i++) {
          e.center(c); const o = pl.camera.position, dx = c.x - o.x, dy = c.y - o.y, dz = c.z - o.z;
          pl.yaw = Math.atan2(-dx, -dz); pl.pitch = Math.atan2(dy, Math.hypot(dx, dz)); pl._sync();
          await f();
        }
        return { hp: [hp0, e.hp], wounds: e.sdfRoot ? e.sdfRoot.material.uniforms.woundCount.value : null, alive: e.alive, released: e.sdfRoot === null, t: +(d.getState().gameTime - t0).toFixed(1) };
      }, [name, until, sec]);
      await hold(); const wound = await fireAt('t', 'wound', 15); await lift();
      await hold(); const deadT = await fireAt('t', 'dead', 40); const deadW = await fireAt('w', 'dead', 25); await lift();
      ok('test arena: the run opens with an SDF Watcher and an SDF Totem', bodies.watcher === 'watcher' && bodies.totem === 'totem', JSON.stringify(bodies));
      ok('test arena: the SDF Watcher still fires its aimed volley', volley.orbs > 0, JSON.stringify(volley));
      ok('test arena: held fire carves a wound into the Totem and leaves it standing', wound.wounds >= 1 && wound.hp[1] < wound.hp[0] && wound.alive, JSON.stringify(wound));
      ok('test arena: held fire kills the Totem and the Watcher, and both release their shaders', !deadT.alive && deadT.released && !deadW.alive && deadW.released, JSON.stringify({ deadT, deadW }));
      // a season picked in the test arena is a way OUT of it (#628 review):
      // the arena's link pins ?mode=hyper, and HAUL must not play that on a disc
      await p.evaluate(async () => {
        const f = () => new Promise(r => requestAnimationFrame(r));
        document.getElementById('pauseBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        await f(); await f();
        document.getElementById('endBtn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        for (let i = 0; i < 4; i++) await f();
      });
      const leave = await p.evaluate(() => ({ chip: document.querySelector('[data-sdf-arena]')?.textContent ?? '', href: document.querySelector('[data-sdf-arena]')?.getAttribute('href') }));
      ok('test arena: its menu offers LEAVE THE TEST ARENA back to the plain page', /LEAVE THE TEST ARENA/.test(leave.chip) && leave.href === './', JSON.stringify(leave));
      const tab = await p.locator('#msg button.mn-season[data-season="haul"]').boundingBox();
      await Promise.all([p.waitForNavigation({ waitUntil: 'load' }), p.touchscreen.tap(tab.x + tab.width / 2, tab.y + tab.height / 2)]);
      await p.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 120000 });
      const out = await p.evaluate(() => ({ url: location.search, state: window.__hd.debug.getState().state, mode: window.__hd.debug.getState().mode, on: document.querySelector('#msg button.mn-season.on')?.dataset.season }));
      ok('test arena: picking HAUL there leaves it — the plain page, season 3, TRUCK rules', !/sdfTest|mode=/.test(out.url) && out.state === 'menu' && out.on === 'haul' && out.mode === 'truck', JSON.stringify(out));
      ok('test arena: zero page or console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
  } catch (e) {
    ok('the run completed', false, e.stack || String(e));
  }
  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
