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
//   - a kill throws its voxels as a classic skull does (physical gibs, and
//     the spray; on season 3's road only the spray) and releases the shader;
//     a splitter splits into SDF minis;
//   - season 3, which has no gun: the look locks an SDF skull and the missiles
//     kill it;
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

      const kill = await p.evaluate(async () => {
        const d = window.__hd.debug, hd = window.__hd, f = () => new Promise(r => requestAnimationFrame(r));
        const sk = window.__parked;
        // a death hands its voxels to the physical gibs and the rest to the
        // debris spray; on season 3's road the gibs are off by design and the
        // spray takes all of them, so count both
        const g0 = d.getGibs().n; let spray = 0;
        const burst = hd.debris.burst.bind(hd.debris);
        hd.debris.burst = (vox, ...rest) => { spray += vox.length; return burst(vox, ...rest); };
        d.killEnemy(sk); for (let i = 0; i < 3; i++) await f();
        hd.debris.burst = burst;
        const g1 = d.getGibs().n;
        d.spawnSplitter(); await f();
        const sp = hd.enemies.find(e => e.alive && e.sdfRoot?.userData.sdfVariant === 'splitter');
        d.killEnemy(sp); for (let i = 0; i < 4; i++) await f();
        const minis = hd.enemies.filter(e => e.alive && e.radius < 0.5).map(e => e.sdfRoot?.userData.sdfVariant ?? null);
        return { gibs: [g0, g1], spray, released: sk.sdfRoot === null, minis };
      });
      ok(`${sn}: a dead SDF skull throws its voxels (gibs, spray) and releases its shader`, kill.gibs[1] - kill.gibs[0] + kill.spray > 0 && kill.released, JSON.stringify(kill));
      ok(`${sn}: a dead SDF splitter splits into SDF minis`, kill.minis.length >= 2 && kill.minis.every(v => v === 'mini'), JSON.stringify(kill.minis));

      if (sn === 'haul') {
        const gaze = await p.evaluate(async () => {
          const d = window.__hd.debug, hd = window.__hd, f = () => new Promise(r => requestAnimationFrame(r));
          for (const e of [...hd.enemies]) if (e.alive) d.killEnemy(e);
          for (let i = 0; i < 4; i++) await f();
          const sk = d.spawnSkull(); sk.update = function (dt) { this.baseUpdate(dt); };   // alive, held in the look
          const cam = hd.player.camera; const fwd = new cam.position.constructor(0, 0, -1).applyQuaternion(cam.quaternion);
          const t0 = d.getState().gameTime;
          for (let i = 0; i < 4000 && sk.alive && d.getState().gameTime - t0 < 8; i++) {
            sk.pos.copy(cam.position).addScaledVector(fwd, 9); sk.group.position.copy(sk.pos);
            await f();
          }
          return { sdf: sk.sdfRoot !== undefined, dead: !sk.alive, t: +(d.getState().gameTime - t0).toFixed(1) };
        });
        ok('haul: the look locks an SDF skull and the missiles kill it', gaze.sdf && gaze.dead, JSON.stringify(gaze));
      }

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
      const arena = await p.evaluate(async () => {
        const d = window.__hd.debug, hd = window.__hd, f = () => new Promise(r => requestAnimationFrame(r));
        d.setInvulnerable(true);
        const body = t => hd.enemies.find(e => e.alive && e.type === t);
        const w = body('watcher'), t = body('totem');
        const variants = { watcher: w?.sdfRoot?.userData.sdfVariant ?? null, totem: t?.sdfRoot?.userData.sdfVariant ?? null };
        // a wound: one shot's worth into the totem carves the shader and leaves it standing
        const hp0 = t.hp, dir = t.pos.clone().sub(hd.player.camera.position).normalize();
        t.hit(1, dir, t.pos.clone().addScaledVector(dir, -0.4));
        await f();
        const wound = { wounds: t.sdfRoot.material.uniforms.woundCount.value, hp: [hp0, t.hp], alive: t.alive };
        // the watcher still does its job: an aimed volley within a few seconds
        let orbs = 0; const t0 = d.getState().gameTime;
        for (let i = 0; i < 4000 && d.getState().gameTime - t0 < 9 && !orbs; i++) { await f(); orbs = hd.orbs.active.length; }
        d.killEnemy(w); d.killEnemy(t); for (let i = 0; i < 3; i++) await f();
        return { variants, wound, orbs, t: +(d.getState().gameTime - t0).toFixed(1), released: w.sdfRoot === null && t.sdfRoot === null };
      });
      ok('test arena: the run opens with an SDF Watcher and an SDF Totem', arena.variants.watcher === 'watcher' && arena.variants.totem === 'totem', JSON.stringify(arena.variants));
      ok('test arena: a hit carves a wound into the Totem and leaves it standing', arena.wound.wounds >= 1 && arena.wound.hp[1] < arena.wound.hp[0] && arena.wound.alive, JSON.stringify(arena.wound));
      ok('test arena: the SDF Watcher still fires its aimed volley', arena.orbs > 0, JSON.stringify({ orbs: arena.orbs, t: arena.t }));
      ok('test arena: both die and release their shaders', arena.released, JSON.stringify(arena));
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
