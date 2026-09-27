// KUOPPA — the browser gate for the roguelike (kuoppa.html).
//   NODE_PATH=$(npm root -g) node pajatso/test/kuoppa.cjs
//
// Driven off `window.__pj` and off GAME STATE, never off the wall clock: a
// sandbox with no GPU renders at a few frames a second, so time is moved with
// `__pj.debug.advance(s)` and a check waits for a state, not a sleep. What this
// sees that core.mjs cannot: the page, the lever under a finger and a key, the
// camera that has to sit close on a phone, and the first-time lines.

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]) || '/';
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
const settle = page => page.evaluate(() => { for (let i = 0; i < 60 && (__kp.game.phase === 'flight' || __kp.game.busy); i++) __kp.debug.advance(0.5); return __kp.game.phase; });
const sheetIs = (page, re) => page.waitForFunction(r => new RegExp(r).test(__kp.sheet ?? ''), re.source, { timeout: 15000 }).then(() => true, () => false);

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/pajatso/`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  // ── a desk ─────────────────────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = await watch(page);
  await page.goto(`${base}kuoppa.html?seed=7`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__kp, null, { timeout: 20000 });
  check('KUOPPA boots with no errors', errors.length === 0, errors.join(' | '));
  check('the title says what the run is', /KUOPPA/.test(await page.locator('#title h1').textContent()) && /ante/i.test(await page.locator('#title').textContent()));
  check('the base machine and the old pit are a link away', (await page.locator('#baseLink').getAttribute('href')) === './' && (await page.locator('#oldPit').getAttribute('href')) === 'pit.html');
  await page.click('#start');
  check('the run starts with twenty coins to shoot on the bare machine', await page.evaluate(() => __kp.started && __kp.game.drops === 20 && !__kp.game.parts.length && !__kp.view.lcdMesh));
  await page.keyboard.down(' ');
  await page.waitForTimeout(700);
  await page.keyboard.up(' ');
  check('SPACE pulls: a coin of the round goes in, the money is untouched', await page.evaluate(() => __kp.game.drops === 19 && __kp.game.coins === 4));
  // the nudge: a tap on the machine, beside the coin, once it is out on the face
  await page.evaluate(() => { for (let i = 0; i < 60 && __kp.game.board.coins[0] && __kp.game.board.inLane(__kp.game.board.coins[0]); i++) __kp.debug.advance(0.05); __kp.pause(); __kp.resume(); });
  const at = await page.evaluate(() => { const c = __kp.game.board.coins[0]; if (!c) return null; const [x, y] = __kp.view.toScreen(c.x, c.y); return { x, y }; });
  if (at) await page.mouse.click(at.x + 60, at.y);
  check('a tap on the machine nudges the coin toward it', !at || await page.evaluate(() => (__kp.game.board.coins[0]?.nudges ?? 1) >= 1));
  await settle(page);
  // a round short of the ante: it scores, then the vendor
  await page.evaluate(() => { __kp.game.drops = 1; __kp.game.coins = 60; __kp.debug.pull(0.4); });
  await settle(page);
  check('the round scores and the vendor lays out two cards and a level plate', await sheetIs(page, /VENDOR/)
    && await page.locator('#runSheet .card').count() === 3 && await page.locator('#runSheet .tag.plate').count() === 1);
  check('it names the deadline round\'s twist in advance', /Deadline round/.test(await page.locator('#runSheet .boss').textContent()));
  await page.locator('#runSheet [data-buy="2"]').click();
  check('a level plate can be bought', await page.evaluate(() => Object.values(__kp.game.levels).some(v => v > 1)));
  const buyable = page.locator('#runSheet [data-buy]:not([disabled])');
  if (await buyable.count()) await buyable.first().click();
  check('a joker or charm can be bought, and sold back', await page.evaluate(() => __kp.game.jokers.length + __kp.game.charms.length === 1)
    && (await page.locator('#runSheet [data-sell]').first().click().then(() => true), await page.evaluate(() => __kp.game.jokers.length + __kp.game.charms.length === 0)));
  check('pulling does nothing while the vendor is up', await page.evaluate(() => { const d = __kp.game.drops; __kp.debug.pull(0.5); return __kp.game.drops === d && __kp.game.phase === 'shop'; }));
  await page.click('#nextRound');
  check('the next round hands out its coins and closes the sheet', await page.evaluate(() => __kp.game.phase === 'idle' && __kp.game.drops === __kp.game.handful && __kp.sheet === null));
  // clearing the ante: the lock opens, with the card of the part it bolts on
  await page.evaluate(() => { const g = __kp.game; g.tally.chips = g.ante; g.drops = 1; __kp.debug.pull(0.4); });
  await settle(page);
  check('reaching the ante opens lock 1 and shows what was bolted on', await sheetIs(page, /LOCK 1/) && /Heso/i.test(await page.locator('#runSheet .part').textContent()));
  check('the part has a picture', await page.locator('#runSheet .part canvas').count() === 1);
  check('the heso and the LCD in its gold frame are on the machine', await page.evaluate(() => !!__kp.game.L.byId.start && !!__kp.view.lcdMesh));
  await page.click('#toShop');
  check('then the vendor again, and the ante is ten times the last', await sheetIs(page, /VENDOR/) && await page.evaluate(() => __kp.game.ante === 1000));
  await page.click('#nextRound');
  await page.evaluate(() => { const g = __kp.game; g.onBoard({ t: 'pocket', pocket: 'start' }); for (const e of g.drain()); __kp.debug.advance(0.1); });
  check('a coin in the heso spins the reels', await page.evaluate(() => !!__kp.game.spin));
  await page.evaluate(() => { for (let i = 0; i < 40 && __kp.game.spin; i++) __kp.debug.advance(0.25); });
  check('and the spin comes to rest', await page.evaluate(() => !__kp.game.spin));
  await page.evaluate(() => __kp.debug.setup({ parts: ['chucker', 'tulips', 'fever', 'windmills', 'chain', 'multiplier'], jokers: ['bajazzo', 'stacker'] }));
  await page.evaluate(() => { __kp.game.openFever(); __kp.game.openRush(); __kp.game.L.byId.w1.open = true; });
  await page.waitForTimeout(800);
  await page.screenshot({ path: require('path').join(require('os').tmpdir(), 'kuoppa-parts.png') });
  check('every part can be bolted on without an error', errors.length === 0, errors.join(' | '));
  // the language
  await page.keyboard.press('Escape');
  await page.click('#paused .langs button[data-lang="fi"]');
  check('Finnish, the run included', await page.evaluate(() => /Markkaa/.test(document.body.textContent) && /Kierros/.test(document.getElementById('round').textContent)));
  await page.click('#paused .langs button[data-lang="en"]');
  await page.click('#resume');
  // the deadline passes short of the ante
  await page.evaluate(() => { const g = __kp.game; g.round = 3; g.anteTotal = 0; g.newTally(); g.drops = 1; g.board.coins.length = 0; g.phase = 'idle'; __kp.debug.pull(0.4); });
  await settle(page);
  check('a deadline passed short of the ante ends the run, summed up', await sheetIs(page, /FLOOR/) && /Locks opened/.test(await page.locator('#runSheet').textContent()));
  await page.click('#againBtn');
  check('and ANOTHER RUN starts over on the bare machine', await page.evaluate(() => __kp.game.deadline === 1 && !__kp.game.parts.length && __kp.sheet === null));
  check('no errors through the run', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // ── a phone, upright ───────────────────────────────────────────────────
  const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const tp = await tctx.newPage();
  const terr = await watch(tp);
  await tp.goto(`${base}kuoppa.html?seed=8`, { waitUntil: 'load' });
  await tp.waitForFunction(() => !!window.__kp, null, { timeout: 20000 });
  await tp.tap('#start');
  await tp.evaluate(() => __kp.debug.setup({ parts: ['chucker', 'tulips'] }));
  await tp.waitForTimeout(1200);
  const lcd = await tp.evaluate(() => {
    const v = __kp.view, [lx, top] = v.toScreen(-4.5, 72.1, 0), [rx] = v.toScreen(7.5, 72.1, 0);
    const hud = document.getElementById('top').getBoundingClientRect().bottom, panel = document.getElementById('panel').getBoundingClientRect().top;
    const [, face] = v.toScreen(0, 0, 0);
    return { top, hud, panel, face, w: rx - lx };
  });
  check(`upright, the LCD in the yakumono is on screen and clear of the top bar (${Math.round(lcd.w)}px wide)`, lcd.top >= lcd.hud - 4 && lcd.w > 60, JSON.stringify(lcd));
  check('and the machine\'s bottom row above the lever', lcd.face < lcd.panel + 2, JSON.stringify(lcd));
  const lr = await tp.locator('#lever').boundingBox();
  const lx = lr.x + lr.width / 2, top = lr.y + 40, span = lr.height - 80;
  await tp.dispatchEvent('#lever', 'pointerdown', { pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: lx, clientY: top });
  await tp.dispatchEvent('#lever', 'pointermove', { pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: lx, clientY: top + span * 0.5 });
  await tp.dispatchEvent('#lever', 'pointerup', { pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: lx, clientY: top + span * 0.5 });
  check('a finger pulls the lever', await tp.evaluate(() => __kp.game.phase === 'flight' && __kp.game.drops === 19));
  await tp.evaluate(() => { for (let i = 0; i < 60 && __kp.game.board.coins[0] && __kp.game.board.inLane(__kp.game.board.coins[0]); i++) __kp.debug.advance(0.05); });
  const tc = await tp.evaluate(() => { const c = __kp.game.board.coins[0]; if (!c) return null; const [x, y] = __kp.view.toScreen(c.x, c.y); return { x, y }; });
  if (tc) await tp.touchscreen.tap(Math.min(380, tc.x + 40), tc.y);
  check('a thumb on the machine nudges the coin', !tc || await tp.evaluate(() => (__kp.game.board.coins[0]?.nudges ?? 1) >= 1));
  await settle(tp);
  await tp.evaluate(() => { __kp.game.drops = 1; __kp.game.coins = 40; __kp.game.board.coins.length = 0; __kp.game.phase = 'idle'; __kp.debug.pull(0.4); });
  await settle(tp);
  await sheetIs(tp, /VENDOR/);
  const fits = await tp.evaluate(() => {
    const r = document.getElementById('runSheet').getBoundingClientRect();
    return { l: r.left, r: r.right, w: innerWidth, scroll: document.documentElement.scrollWidth };
  });
  check('the vendor fits the phone', fits.l >= 0 && fits.r <= fits.w + 1 && fits.scroll <= fits.w, JSON.stringify(fits));
  const small = await tp.evaluate(() => [...document.querySelectorAll('button, [role=slider], a')]
    .filter(b => b.offsetParent !== null && !b.closest('[hidden]'))
    .map(b => ({ id: b.id || b.className || b.textContent, r: b.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44)).map(x => `${x.id}:${Math.round(x.r.width)}x${Math.round(x.r.height)}`));
  check(`every control is a 44px target${small.length ? ` — ${small}` : ''}`, small.length === 0);
  const clash = await tp.evaluate(() => {
    const R = r => `${Math.round(r.left)}-${Math.round(r.right)}`;
    const boxes = ['coins', 'drops'].map(id => [id, document.getElementById(id).getBoundingClientRect()]);
    const btns = [...document.querySelectorAll('.arcade-home, .arcade-toko, .sys')].map(b => [b.id || b.className.split(' ')[0], b.getBoundingClientRect()]).filter(([, r]) => r.width);
    return boxes.flatMap(([n, a]) => btns.filter(([, r]) => r.right > a.left && r.left < a.right && r.bottom > a.top && r.top < a.bottom).map(([m, r]) => `${n}@${R(a)}×${m}@${R(r)}`));
  });
  check('the purse and the round\'s coins clear the corner buttons', clash.length === 0, clash.join(' '));
  check('no errors on the phone', terr.length === 0, terr.join(' | '));
  await tctx.close();

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
