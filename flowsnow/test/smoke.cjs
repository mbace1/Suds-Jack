// Flowsnow smoke: does it boot, does it ride, does the snow fly, does anything throw.
//   NODE_PATH=$(npm root -g) node flowsnow/test/smoke.cjs
// Driven off game state through window.__fs, never the wall clock — a sandbox
// with no GPU renders this at a handful of frames a second.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const s = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d !== undefined ? ' → ' + d : ''))); };
const SHOTS = process.env.SHOTS || path.join(require('os').tmpdir(), 'flowsnow');
fs.mkdirSync(SHOTS, { recursive: true });

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await p.goto(base + '/flowsnow/', { waitUntil: 'load' });
  await p.waitForFunction(() => !!window.__fs, null, { timeout: 15000 });
  await p.waitForTimeout(800);
  ok('it boots with no errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  ok('the title is up', await p.locator('#title').isVisible());
  ok('and the HUD waits for a ride', await p.locator('#hud').isHidden());
  ok('the version badge names the build', (await p.locator('#ver').textContent()).trim() === `v${await p.evaluate(() => __fs.version)}`);
  ok('WebGL painted a canvas', await p.evaluate(() => { const c = document.getElementById('game'); return c.width > 100 && !!c.getContext('webgl2'); }));
  ok('the field has tiles under the rider', await p.evaluate(() => __fs.field.tiles.size > 60));
  // the picture is not one flat colour
  const sample = async () => p.evaluate(() => {
    __fs.debug.render();
    const c = document.getElementById('game'); const t = document.createElement('canvas');
    t.width = 64; t.height = 36; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 64, 36);
    const d = x.getImageData(0, 0, 64, 36).data; const set = new Set();
    for (let i = 0; i < d.length; i += 4) set.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
    return set.size;
  });
  await p.waitForTimeout(300);
  ok('and the picture has colour in it', await sample() > 12, await sample());
  await p.screenshot({ path: path.join(SHOTS, 'title.png') });

  // a key starts the run
  await p.keyboard.press('Space');
  await p.waitForTimeout(200);
  ok('Space starts a ride', await p.evaluate(() => __fs.mode() === 'play'));
  ok('and the title is gone', await p.locator('#title').isHidden());
  ok('a start press does not also pop', await p.evaluate(() => __fs.state.grounded));

  // ride, off the clock
  // the live loop keeps running between calls, so a step and its reading share one call
  const st = await p.evaluate(() => { __fs.debug.step(4, { lean: 0 }); return { z: __fs.state.z, speed: __fs.state.speed, dist: __fs.state.dist, grounded: __fs.state.grounded }; });
  ok('the rider goes downhill', st.z < -20 && st.dist > 20, JSON.stringify(st));
  ok('at a snowboard speed', st.speed > 8 && st.speed < 30, st.speed);
  const carve = await p.evaluate(() => ({ ...(__fs.debug.step(1.4, { lean: 1 }) ?? {}), yaw: __fs.state.yaw, edge: __fs.state.edge, flow: __fs.state.flow, snow: __fs.sim.count, spray: __fs.state.spray, tumble: __fs.state.tumble, tumbles: __fs.state.tumbles, g: __fs.state.grounded }));
  ok('a lean turns the board', carve.yaw > 0.3 && carve.yaw < 2.6 && carve.edge > 0.8, JSON.stringify(carve));
  ok('a carve throws snow', carve.snow > 200 && carve.spray > 0.1, JSON.stringify(carve));
  ok('and earns flow', carve.flow > 0.1, carve.flow);
  const bar = await p.evaluate(() => { __fs.debug.hud(); return [__fs.state.flow * 100, parseFloat(document.getElementById('flowFill').style.width)]; });
  ok('the flow bar shows it', bar[0] > 5 && Math.abs(bar[0] - bar[1]) < 2, JSON.stringify(bar));
  ok('the HUD counts metres', parseInt(await p.locator('#dist').textContent(), 10) > 20);
  await p.screenshot({ path: path.join(SHOTS, 'carve.png') });
  ok('no flake sits under the snow', await p.evaluate(() => {
    const sim = __fs.sim, t = __fs.terrain; let bad = 0;
    for (let i = 0; i < sim.count; i++) if (sim.kind[i] !== 2 && sim.pos[i * 3 + 1] < t.height(sim.pos[i * 3], sim.pos[i * 3 + 2]) - 0.05) bad++;
    return bad === 0;
  }));
  ok('the HUD is up while riding', await p.locator('#hud').isVisible());

  // ---- powder ----
  // Placed out in the deep field (setup only) and then RIDDEN there through the
  // real input path, holding the fall line. An unsteered board traverses and
  // climbs the gully wall, so a straight-line drop-in measures the side-hill
  // rather than the snow.
  const hold = `(off, secs) => {
    const t = __fs.terrain, st = __fs.state;
    st.x = t.lineX(st.z) + off; st.y = t.height(st.x, st.z); st.sink = 0;
    st.vx = 0; st.vy = 0; st.vz = -12; st.yaw = 0; st.tumble = 0;
    for (let i = 0; i < secs * 10; i++) {
      const want = Math.atan2(t.lineX(st.z - 35) + off - st.x, 35);
      let d = want - st.yaw;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      __fs.debug.step(0.1, { lean: Math.max(-1, Math.min(1, d * 2.5)) });
    }
    __fs.debug.hud();
    return { depth: st.depth, sink: st.sink, plane: st.plane, speed: st.speed,
      buried: t.height(st.x, st.z) - st.y, spray: st.spray,
      hudSnow: parseFloat(document.getElementById('depth').textContent),
      hudFloat: parseFloat(document.getElementById('floatFill').style.width) };
  }`;
  const pow = await p.evaluate(`(${hold})(42, 10)`);
  ok('off the packed line the snow is deep', pow.depth > 0.7, pow.depth);
  ok('and the board rides down inside it', pow.buried > 0.08, pow.buried);
  ok('while still planing rather than wallowing', pow.plane > 0.6 && pow.speed > 8, JSON.stringify(pow));
  ok('the HUD reports the snow under the board', Math.abs(pow.hudSnow - pow.depth) < 0.06, `${pow.hudSnow} vs ${pow.depth}`);
  ok('and how much float is under it', pow.hudFloat > 40, pow.hudFloat);
  ok('deep snow throws a wall of it', pow.spray > 0.6, pow.spray);
  await p.screenshot({ path: path.join(SHOTS, 'powder.png') });

  const flat = await p.evaluate(`(${hold})(0, 10)`);
  ok('the packed line is shallow and fast', flat.depth < pow.depth - 0.3 && flat.speed > pow.speed,
    JSON.stringify(flat));
  ok('and throws far less snow than the deep stuff', flat.spray < pow.spray, `${flat.spray} vs ${pow.spray}`);
  await p.screenshot({ path: path.join(SHOTS, 'packed.png') });

  // a pop, and a landing
  const before = await p.evaluate(() => __fs.state.airBest);
  ok('Space pops the rider off the snow', await p.evaluate(() => { __fs.debug.step(1 / 120, { lean: 0, jump: true }); return !__fs.state.grounded; }));
  const air = await p.evaluate(() => { __fs.debug.step(2.5, { lean: 0 }); return { g: __fs.state.grounded, air: __fs.state.airBest, t: __fs.state.tumble }; });
  ok('and the rider lands again', air.g && air.air > before && air.air > 0.3, JSON.stringify(air));

  // the hour turns with the descent
  const c0 = await p.evaluate(() => { __fs.debug.hour(0); return __fs.field.mat.uniforms.uHorizon.value.getHex(); });
  const c1 = await p.evaluate(() => { __fs.debug.hour(1); return __fs.field.mat.uniforms.uHorizon.value.getHex(); });
  ok('the colours turn from dawn to dusk', c0 !== c1);

  // the way home, and the signature
  ok('the home button is there', await p.locator('.arcade-home').count() === 1);
  ok('and it is signed', await p.locator('.toko-signature').count() === 1);
  ok('the mute control is a 44px target', (await p.locator('#mute').boundingBox()).height >= 44);
  ok('nothing threw during the ride', errs.length === 0, errs.slice(0, 3).join(' | '));

  // the run ends, and the recap is honest
  await p.evaluate(() => { const st = __fs.state; st.z = -2395; st.x = __fs.terrain.lineX(-2395); st.y = __fs.terrain.height(st.x, st.z); st.yaw = 0; st.vx = 0; st.vy = 0; st.vz = -8; st.grounded = true; st.tumble = 0; __fs.debug.step(3, { lean: 0 }); });
  ok('the run ends at the bottom', await p.evaluate(() => __fs.mode() === 'done'));
  ok('the recap is up with a score', await p.locator('#done').isVisible() && /\d/.test(await p.locator('#doneScore').textContent()));
  ok('and the best is kept', await p.evaluate(() => Number(localStorage.getItem('flowsnow.best')) > 0));
  await p.screenshot({ path: path.join(SHOTS, 'done.png') });
  await p.click('#again');
  await p.waitForTimeout(200);
  ok('ride again starts a fresh run', await p.evaluate(() => __fs.mode() === 'play' && __fs.state.dist < 5));

  // a phone: portrait, touch, no horizontal overflow
  const m = await b.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  const mp = await m.newPage();
  const merrs = [];
  mp.on('pageerror', e => merrs.push(e.message));
  await mp.goto(base + '/flowsnow/', { waitUntil: 'load' });
  await mp.waitForFunction(() => !!window.__fs, null, { timeout: 15000 });
  await mp.waitForTimeout(500);
  ok('a phone boots it too', merrs.length === 0, merrs[0]);
  ok('with no horizontal overflow', await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await mp.touchscreen.tap(300, 400);
  await mp.waitForTimeout(250);
  ok('a tap starts a ride', await mp.evaluate(() => __fs.mode() === 'play'));
  await mp.screenshot({ path: path.join(SHOTS, 'phone.png') });

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed  (screenshots in ${SHOTS})`);
  s.close(); process.exit(fail ? 1 : 0);
});
