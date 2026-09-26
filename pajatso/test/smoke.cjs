// KUOPPA — the browser gate for the pit run (pit.html). The Pajatso machine
// itself has its own: test/classic.cjs.
//   NODE_PATH=$(npm root -g) node pajatso/test/smoke.cjs
//
// Driven off `window.__pp` and off ENGINE STATE, never off the wall clock: a
// sandbox with no GPU renders this at a few frames a second, so time is moved
// with `__pp.debug.advance(s)` and a check waits for a state, not a sleep.
// What this sees that core.mjs cannot: the page, the HUD, the four stations,
// the lens that fits the machine into what the HUD leaves free, and a phone.

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]).replace(/^\/Suds-Jack(?=\/|$)/, '') || '/';
  const f = path.join(ROOT, url.endsWith('/') ? url + 'index.html' : url);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
};

async function watch(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  return errors;
}

// is every one of these world points inside the band the HUD leaves free?
const framing = page => page.evaluate(() => {
  const { THREE, eye } = __pp;
  const cam = eye.camera, top = eye.insets?.machine?.top ?? 0, bottom = eye.insets?.machine?.bottom ?? 0;
  const pts = [[-0.33, 1.87, -0.93], [0.33, 1.87, -0.93], [-0.23, 0.72, -0.52], [0.23, 0.72, -0.52]];
  const out = pts.map(p => { const v = new THREE.Vector3(...p).project(cam); return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]; });
  return { ok: out.every(([x, y]) => x >= 0 && x <= innerWidth && y >= top - 2 && y <= innerHeight - bottom + 2), out, top, bottom };
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/pajatso/pit.html`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  // ── the title and the first look ────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = await watch(page);
  await page.goto(`${base}?seed=7`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__pp, null, { timeout: 15000 });
  check('the page boots with no errors', errors.length === 0, errors.join(' | '));
  check('the title is up and the machine waits for you', await page.locator('#title').isVisible() && !(await page.evaluate(() => __pp.started)));
  await page.click('#start');
  check('SIT DOWN takes you to the machine', await page.evaluate(() => __pp.started && __pp.debug.station() === 'machine'));
  check('the arcade\'s way home is on the page', await page.locator('.arcade-home').count() === 1);
  // the picture is a picture: the blit drew something that is not one colour
  await page.waitForFunction(() => __pp.eye.renderer.info.render.frame > 2, null, { timeout: 20000 });
  // (render and read in the same task: the drawing buffer is not preserved,
  // so a canvas read after the frame was composited is black)
  const pixels = await page.evaluate(() => {
    __pp.eye.render(1);
    const c = document.getElementById('gl'), g = document.createElement('canvas');
    g.width = 64; g.height = 36;
    const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 36);
    const d = x.getImageData(0, 0, 64, 36).data;
    let min = 255, max = 0, lum = 0;
    for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; min = Math.min(min, l); max = Math.max(max, l); lum += l; }
    return { min, max, mean: lum / (d.length / 4) };
  });
  check(`the room renders — dark, with the machine lit in it (mean ${pixels.mean.toFixed(0)}, range ${pixels.min}-${pixels.max})`,
    pixels.max - pixels.min > 80 && pixels.mean > 12 && pixels.mean < 140);
  const fr = await framing(page);
  check('the machine is fitted into the band the HUD leaves free (landscape)', fr.ok, JSON.stringify(fr.out));
  check('landscape puts the handle and FIRE on the walls either side', await page.evaluate(() => document.body.classList.contains('wide')));

  // ── a shift ─────────────────────────────────────────────────────────────
  check('between shifts the lever is the only thing to press', await page.locator('#lever').isVisible() && !(await page.locator('#controls').isVisible()));
  await page.click('#lever');
  await page.waitForFunction(() => __pp.engine.phase === 'shift');
  check('the lever starts a shift with the house coins', await page.evaluate(() => __pp.engine.drops === 12));
  await page.waitForFunction(() => !document.getElementById('controls').hidden, null, { timeout: 10000 });
  check('the handle and FIRE appear for the shift', await page.locator('#fire').isVisible() && await page.locator('#power').isVisible());
  // the power bar under a pointer
  const pb = await page.locator('#power').boundingBox();
  await page.mouse.click(pb.x + pb.width * 0.6, pb.y + pb.height / 2);
  check('the power bar sets the handle where you touch it', await page.evaluate(() => Math.abs(__pp.engine.power - 0.6) < 0.05));
  await page.keyboard.press('ArrowLeft');
  check('and the arrow keys turn it', await page.evaluate(() => __pp.engine.power < 0.6));
  await page.evaluate(() => __pp.engine.setPower(0.22));
  // hold FIRE: a real pointer press on the button
  const fb = await page.locator('#fire').boundingBox();
  await page.mouse.move(fb.x + fb.width / 2, fb.y + fb.height / 2);
  await page.mouse.down();
  await page.evaluate(() => __pp.debug.advance(3));
  const mid = await page.evaluate(() => ({ drops: __pp.engine.drops, board: __pp.engine.board.coins.length, firing: __pp.engine.firing }));
  check(`holding FIRE streams coins up the rail (${12 - mid.drops} shot, ${mid.board} on the board)`, mid.drops < 12 && mid.firing);
  await page.mouse.up();
  check('letting go lets go of the handle', await page.evaluate(() => !__pp.engine.firing));
  // the rest of the shift, by keyboard: space held
  await page.keyboard.down(' ');
  await page.evaluate(() => { for (let i = 0; i < 40 && __pp.engine.phase === 'shift'; i++) __pp.debug.advance(1); });
  await page.keyboard.up(' ');
  await page.waitForFunction(() => __pp.engine.phase !== 'shift', null, { timeout: 20000 });
  const after = await page.evaluate(() => ({ phase: __pp.engine.phase, shift: __pp.engine.shift, fired: __pp.engine.stats.fired, wallet: __pp.engine.wallet, tray: __pp.engine.tray.value }));
  check(`SPACE fires too, and the shift ends (${after.fired} shot, ${after.tray}¢ to the tray)`, after.phase === 'idle' && after.shift === 2 && after.fired >= 12);
  check('the HUD shows the wallet the engine has', (await page.locator('#wallet b').textContent()).trim() === `${after.wallet}¢`);

  // ── the stations ────────────────────────────────────────────────────────
  await page.click('.tab[data-st="atm"]');
  await page.waitForFunction(() => __pp.debug.station() === 'atm');
  check('the ATM tab turns you to the ATM and opens its panel', await page.locator('#p-atm').isVisible());
  const w0 = await page.evaluate(() => __pp.engine.wallet);
  await page.locator('#p-atm .big', { hasText: 'DEPOSIT ALL' }).click();
  check(`DEPOSIT ALL moves the wallet into the ATM (${w0}¢)`, await page.evaluate(w => __pp.engine.wallet === 0 && __pp.engine.atm === w, w0));
  await page.keyboard.press('e');
  await page.waitForFunction(() => __pp.debug.station() === 'machine');
  await page.keyboard.press('e');
  await page.waitForFunction(() => __pp.debug.station() === 'vendor');
  check('Q/E turn you round the room', await page.locator('#p-vendor').isVisible());
  await page.evaluate(() => { __pp.engine.wallet = 400; });
  await page.waitForTimeout(200);
  await page.keyboard.press('1');
  check('1 buys the first charm on the shelf', await page.evaluate(() => __pp.engine.charms.length === 1));
  await page.waitForFunction(() => document.querySelectorAll('#rack .chip:not(.empty)').length === 1, null, { timeout: 5000 }).catch(() => {});
  check('and it goes on your rack', await page.locator('#rack .chip:not(.empty)').count() === 1);
  // the vendor is framed LEFT of its panel
  const vendorFit = await page.evaluate(() => {
    const { THREE, eye } = __pp;
    const v = new THREE.Vector3(1.04, 1.2, 0.34).project(eye.camera);
    const x = (v.x * 0.5 + 0.5) * innerWidth;
    return { x, panel: document.getElementById('p-vendor').getBoundingClientRect().left };
  });
  check(`the vendor stands left of its panel (${vendorFit.x.toFixed(0)} < ${vendorFit.panel.toFixed(0)})`, vendorFit.x < vendorFit.panel);
  await page.click('.tab[data-st="door"]');
  await page.waitForFunction(() => __pp.debug.station() === 'door');
  check('the door counts its padlocks', /8 padlocks left/.test(await page.locator('#p-door').textContent()));

  // ── the deadline: paid, the phone, a deal ───────────────────────────────
  await page.evaluate(() => { const e = __pp.engine; e.phase = 'due'; e.atm = e.debt + 3; });
  await page.click('.tab[data-st="atm"]');
  await page.waitForFunction(() => __pp.debug.station() === 'atm');
  await page.locator('#p-atm .big', { hasText: 'SETTLE' }).click();
  check('SETTLE pays the debt and the phone rings', await page.evaluate(() => __pp.engine.phase === 'phone' && __pp.engine.deadline === 1));
  await page.waitForFunction(() => __pp.debug.station() === 'door', null, { timeout: 8000 });
  check('you are turned round to the door and the phone', await page.locator('#p-door .card').count() === 3);
  await page.keyboard.press('2');
  check('2 takes the second deal and the next deadline begins', await page.evaluate(() => __pp.engine.deadline === 2 && __pp.engine.phase === 'idle'));
  await page.waitForTimeout(300);
  check('a padlock is on the floor', await page.evaluate(() => __pp.room.locks.filter(l => l.open).length === 1));

  // ── pause, sound ────────────────────────────────────────────────────────
  await page.keyboard.press('Escape');
  check('Esc pauses', await page.evaluate(() => __pp.paused) && await page.locator('#paused').isVisible());
  await page.click('#resume');
  check('and BACK TO THE PIT resumes', await page.evaluate(() => !__pp.paused));
  const m0 = await page.locator('#mute').textContent();
  await page.click('#mute');
  check('the sound switch switches', (await page.locator('#mute').textContent()) !== m0);

  // ── the trapdoor ────────────────────────────────────────────────────────
  await page.evaluate(() => { const e = __pp.engine; e.phase = 'due'; e.atm = 0; e.wallet = 0; e.settle(); __pp.debug.advance(0.1); });
  await page.waitForSelector('#end:not([hidden])', { timeout: 15000 });
  check('short at the deadline: YOU FELL, with the run on the card', /YOU FELL/.test(await page.locator('#end').textContent()));
  check('and your best is kept on your own disk', await page.evaluate(() => localStorage.getItem('pachiPit.best') !== null));
  await page.locator('#end .big', { hasText: 'NEW RUN' }).click();
  check('NEW RUN starts over at the first padlock', await page.evaluate(() => __pp.engine.deadline === 1 && __pp.engine.phase === 'idle' && !__pp.ending));
  check('no errors through the whole run', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // ── a phone, upright ────────────────────────────────────────────────────
  const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const tp = await tctx.newPage();
  const terr = await watch(tp);
  await tp.goto(`${base}?skip&seed=8`, { waitUntil: 'load' });
  await tp.waitForFunction(() => !!window.__pp && __pp.eye.renderer.info.render.frame > 1, null, { timeout: 20000 });
  check('upright, the HUD stacks under the machine', await tp.evaluate(() => document.body.classList.contains('tall')));
  const tf = await framing(tp);
  check('and the machine is fitted above it', tf.ok, JSON.stringify(tf.out));
  await tp.tap('#lever');
  await tp.waitForFunction(() => __pp.engine.phase === 'shift');
  await tp.waitForFunction(() => !document.getElementById('controls').hidden, null, { timeout: 10000 });
  const small = await tp.evaluate(() => [...document.querySelectorAll('button, [role=slider]')]
    .filter(b => b.offsetParent !== null && !b.closest('[hidden]'))
    .map(b => ({ id: b.id || b.className || b.textContent, r: b.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44)).map(x => `${x.id}:${Math.round(x.r.width)}x${Math.round(x.r.height)}`));
  check(`every control is a 44px target${small.length ? ` — ${small}` : ''}`, small.length === 0);
  // the first instruction a phone gets is the SHIFT 1 message; centred and
  // unwrapped, it ran off both edges of the screen
  const msg = await tp.evaluate(() => {
    const t = document.getElementById('toast');
    const off = [t, ...t.children].map(e => e.getBoundingClientRect()).filter(r => r.left < -1 || r.right > innerWidth + 1).length;
    return { text: t.textContent.slice(0, 40), off, over: [t, ...t.children].some(e => e.scrollWidth > e.clientWidth + 1) };
  });
  check(`the first shift's message fits the phone (${msg.text})`, /SHIFT 1/.test(msg.text) && !msg.off && !msg.over, JSON.stringify(msg));
  // the live site's shell seats Toko beside HOME under a thumb: the deadline
  // has to start where the arcade's corner ENDS, whatever turns out to be in it
  await tp.evaluate(() => {
    const b = document.createElement('button');
    b.className = 'arcade-toko';
    b.style.cssText = 'position:fixed;top:10px;left:88px;width:44px;height:44px;display:block;z-index:99';
    document.body.appendChild(b);
  });
  await tp.waitForTimeout(150);
  const hud = await tp.evaluate(() => {
    const boxes = ['deadline', 'debt', 'wallet'].map(id => document.getElementById(id).getBoundingClientRect());
    const clash = [...document.querySelectorAll('.arcade-home, .arcade-toko')].map(b => b.getBoundingClientRect())
      .filter(r => r.width && boxes.some(d => r.right > d.left && r.left < d.right && r.bottom > d.top && r.top < d.bottom)).length;
    return { clash, bar: Math.round(document.getElementById('debtbar').getBoundingClientRect().width) };
  });
  check('the debt clears the arcade\'s corner, a Toko button beside HOME included', hud.clash === 0, JSON.stringify(hud));
  // ...and does not pay for it with the bar: upright, the debt row runs under the corner
  check(`the debt bar is still a bar on a phone (${hud.bar}px)`, hud.bar >= 90);
  check('nothing runs off the side of the phone', await tp.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const fb2 = await tp.locator('#fire').boundingBox();
  await tp.dispatchEvent('#fire', 'pointerdown', { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: fb2.x + 40, clientY: fb2.y + 40 });
  await tp.evaluate(() => __pp.debug.advance(2));
  check('a thumb held on FIRE shoots', await tp.evaluate(() => __pp.engine.drops < 12));
  await tp.dispatchEvent('#fire', 'pointerup', { pointerId: 7, pointerType: 'touch', isPrimary: true });
  check('and lifting it stops', await tp.evaluate(() => !__pp.engine.firing));
  check('no errors on the phone', terr.length === 0, terr.join(' | '));
  await tctx.close();

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
