// PAJATSO — the browser gate for the machine (index.html).
//   NODE_PATH=$(npm root -g) node pajatso/test/classic.cjs
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
const settle = page => page.evaluate(() => { for (let i = 0; i < 40 && __pj.game.phase === 'flight'; i++) __pj.debug.advance(0.5); return __pj.game.phase; });

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/pajatso/`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

  // ── a desk ─────────────────────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = await watch(page);
  await page.goto(`${base}?seed=7`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__pj, null, { timeout: 20000 });
  check('the machine boots with no errors', errors.length === 0, errors.join(' | '));
  check('the title is up, and says what the game is', await page.locator('#title').isVisible() && /PAJATSO/.test(await page.locator('#title h1').textContent()));
  check('the roguelike mode is one link away', (await page.locator('#pitLink').getAttribute('href')) === 'kuoppa.html');
  await page.click('#start');
  check('PLAY starts with thirty markka', await page.evaluate(() => __pj.started && __pj.game.coins === 30));
  check('the arcade\'s way home is on the page', await page.locator('.arcade-home').count() === 1);
  await page.waitForSelector('#tip:not([hidden])', { timeout: 5000 }).catch(() => {});
  check('the first thing it says is how to pull the lever', /lever/i.test(await page.locator('#tip').textContent()));

  // a held key pulls the lever down; letting go fires
  await page.keyboard.down(' ');
  await page.waitForFunction(() => __pj.power > 0.25, null, { timeout: 20000 });
  await page.keyboard.up(' ');
  await page.waitForFunction(() => __pj.game.phase === 'flight', null, { timeout: 5000 }).catch(() => {});
  const k = await page.evaluate(() => ({ phase: __pj.game.phase, coins: __pj.game.coins, last: __pj.lastPull }));
  check(`holding SPACE pulls, letting go fires a coin (${Math.round(k.last * 100)}%)`, k.phase === 'flight' && k.coins === 29 && k.last > 0.25);
  check('the knob springs back after the pull', await page.evaluate(() => __pj.power === 0));
  check('one coin at a time: a second pull while it flies does nothing', await page.evaluate(() => { __pj.debug.pull(0.5); return __pj.game.coins === 29; }));
  check('the coin comes to rest', (await settle(page)) !== 'flight');
  const before = await page.evaluate(() => __pj.game.coins);
  await page.keyboard.press('Enter');
  check('ENTER pulls the same again', await page.evaluate(b => __pj.game.coins === b - 1 && __pj.game.phase === 'flight', before));
  await settle(page);
  const shown = await page.evaluate(() => Number(document.querySelector('#coins b').textContent.replace(',', '.')));
  check('the count on screen is the count in the machine', shown === await page.evaluate(() => __pj.game.coins));

  // run it dry, and the counter gives you another handful
  await page.evaluate(() => { __pj.debug.setCoins(1); });
  for (let i = 0; i < 12 && await page.evaluate(() => __pj.game.coins > 0); i++) {
    await page.evaluate(() => { __pj.debug.setCoins(1); __pj.debug.pull(0.97); });
    await settle(page);
    await page.evaluate(() => { if (__pj.game.coins > 0) __pj.debug.setCoins(0); __pj.game.phase = 'broke'; __pj.game.events.push({ t: 'broke' }); __pj.debug.advance(0.1); });
  }
  await page.waitForSelector('#broke:not([hidden])', { timeout: 10000 }).catch(() => {});
  check('out of markka: the session is summed up', await page.locator('#broke').isVisible() && /OUT OF MARKKA/.test(await page.locator('#broke').textContent()));
  await page.click('#more');
  check('and thirty more from the bar carries on', await page.evaluate(() => __pj.game.coins === 30 && __pj.game.phase === 'idle'));
  await page.keyboard.press('Escape');
  check('Esc pauses', await page.evaluate(() => __pj.paused) && await page.locator('#paused').isVisible());
  // the language switch: Finnish, then Japanese, kept for the next visit
  await page.click('#paused .langs button[data-lang="fi"]');
  check('the language switch turns the machine Finnish', await page.evaluate(() => document.documentElement.lang === 'fi'
    && document.getElementById('resume').textContent === 'TAKAISIN KONEELLE' && /Markkaa/.test(document.getElementById('coins').textContent)));
  check('markka are written with a Finnish comma', await page.evaluate(() => { __pj.debug.setCoins(12.5); __pj.debug.advance(0.05); return true; })
    && await page.waitForFunction(() => document.querySelector('#coins b').textContent === '12,5' || document.querySelector('#coins b').textContent === '12,50', null, { timeout: 5000 }).then(() => true, () => false));
  await page.click('#paused .langs button[data-lang="ja"]');
  check('and Japanese', await page.evaluate(() => document.documentElement.lang === 'ja' && document.getElementById('resume').textContent === '台に戻る'));
  check('the choice is kept', await page.evaluate(() => localStorage.getItem('pajatso.lang') === 'ja'));
  await page.click('#paused .langs button[data-lang="en"]');
  await page.click('#resume');
  check('no errors through the session', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // ── a phone, upright ───────────────────────────────────────────────────
  const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const tp = await tctx.newPage();
  const terr = await watch(tp);
  await tp.goto(`${base}?seed=8`, { waitUntil: 'load' });
  await tp.waitForFunction(() => !!window.__pj, null, { timeout: 20000 });
  await tp.tap('#start');
  await tp.waitForTimeout(800);
  // the face fills the phone's width, and none of it is under the lever
  const fit = await tp.evaluate(() => {
    const v = __pj.view, [lx] = v.toScreen(-30, 40, 0), [rx] = v.toScreen(30, 40, 0);
    const [, bottom] = v.toScreen(0, 0, 0), panel = document.getElementById('panel').getBoundingClientRect();
    return { lx, rx, W: innerWidth, bottom, panel: panel.top };
  });
  check(`upright, the face fills the phone's width (${Math.round(fit.rx - fit.lx)} of ${fit.W}px)`, fit.rx - fit.lx > fit.W * 0.86 && fit.lx > -4 && fit.rx < fit.W + 4, JSON.stringify(fit));
  check('and its bottom row sits above the lever', fit.bottom < fit.panel + 2, JSON.stringify(fit));
  const rest = await tp.evaluate(() => __pj.view.coinPx());
  // a finger drags the knob half way down and lets go
  const lr = await tp.locator('#lever').boundingBox();
  const lx = lr.x + lr.width / 2, top = lr.y + 40, span = lr.height - 80;
  await tp.dispatchEvent('#lever', 'pointerdown', { pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: lx, clientY: top });
  await tp.dispatchEvent('#lever', 'pointermove', { pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: lx, clientY: top + span * 0.25 });
  await tp.dispatchEvent('#lever', 'pointermove', { pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: lx, clientY: top + span * 0.5 });
  check('dragging the knob down pulls the lever as far as the finger', Math.abs(await tp.evaluate(() => __pj.power) - 0.5) < 0.03);
  await tp.dispatchEvent('#lever', 'pointerup', { pointerId: 3, pointerType: 'touch', isPrimary: true, clientX: lx, clientY: top + span * 0.5 });
  check('letting go fires the coin', await tp.evaluate(() => __pj.game.phase === 'flight' && Math.abs(__pj.lastPull - 0.5) < 0.03));
  // the camera leans in while the coin is on the face
  // hold the coin mid-flight (pause freezes the machine, not the camera) and
  // let the camera finish leaning in: time here is frames, not seconds
  await tp.evaluate(() => { __pj.debug.advance(0.5); __pj.pause(); });
  await tp.waitForFunction(() => __pj.view.follow > 0.9, null, { timeout: 30000 }).catch(() => {});
  await tp.waitForTimeout(1200);
  const close = await tp.evaluate(() => { const c = __pj.game.board.coins[0]; return c ? __pj.view.coinPx(c.x, c.y) : 0; });
  await tp.evaluate(() => __pj.resume());
  check(`closer: the coin in flight is ${Math.round(close)}px across on a phone (${Math.round(rest)}px at rest)`, close >= 24 && close > rest * 1.6);
  await settle(tp);
  // a tap on the lever pulls the same again
  const c0 = await tp.evaluate(() => __pj.game.coins);
  await tp.dispatchEvent('#lever', 'pointerdown', { pointerId: 4, pointerType: 'touch', isPrimary: true, clientX: lx, clientY: top + 30 });
  await tp.dispatchEvent('#lever', 'pointerup', { pointerId: 4, pointerType: 'touch', isPrimary: true, clientX: lx, clientY: top + 30 });
  check('a tap on the lever pulls the same again', await tp.evaluate(c => __pj.game.coins === c - 1 && Math.abs(__pj.lastPull - 0.5) < 0.03, c0));
  await settle(tp);
  const small = await tp.evaluate(() => [...document.querySelectorAll('button, [role=slider], a')]
    .filter(b => b.offsetParent !== null && !b.closest('[hidden]'))
    .map(b => ({ id: b.id || b.className || b.textContent, r: b.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44)).map(x => `${x.id}:${Math.round(x.r.width)}x${Math.round(x.r.height)}`));
  check(`every control is a 44px target${small.length ? ` — ${small}` : ''}`, small.length === 0);
  check('nothing runs off the side of the phone', await tp.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const tip = await tp.evaluate(() => { const t = document.getElementById('tip'); const r = t.getBoundingClientRect(); return { hidden: t.hidden, l: r.left, r: r.right, b: r.bottom, w: innerWidth, panel: document.getElementById('panel').getBoundingClientRect().top }; });
  check('a first-time line fits the phone and stays off the lever', tip.hidden || (tip.l >= 0 && tip.r <= tip.w && tip.b <= tip.panel), JSON.stringify(tip));
  const hud = await tp.evaluate(() => {
    const d = document.getElementById('coins').getBoundingClientRect();
    return [...document.querySelectorAll('.arcade-home, .arcade-toko')].map(b => b.getBoundingClientRect())
      .filter(r => r.width && r.right > d.left && r.left < d.right && r.bottom > d.top && r.top < d.bottom).length;
  });
  check('the coin count clears the arcade\'s corner', hud === 0);
  // a line, once said, is not said again
  const seen = await tp.evaluate(() => JSON.parse(localStorage.getItem('pajatso.tips') || '[]'));
  await tp.reload({ waitUntil: 'load' });
  await tp.waitForFunction(() => !!window.__pj, null, { timeout: 20000 });
  await tp.tap('#start');
  await tp.waitForTimeout(900);
  check(`first-time lines are said once (${seen.join(', ')})`, seen.includes('pull') && await tp.locator('#tip').isHidden());
  // v8: the lever remembers, the row shows where the coin went, wins land in
  // the tray coin by coin, and a session has a target
  const v8 = await tp.evaluate(() => {
    localStorage.removeItem('pajatso.marks');
    const out = {};
    __pj.debug.pull(0.2); __pj.debug.advance(8);
    __pj.debug.pull(0.7); __pj.debug.advance(8);
    return out;
  });
  await tp.waitForTimeout(700);
  const marks = await tp.evaluate(() => [...document.querySelectorAll('#lever .m')].map(m => m.className));
  check(`the lever keeps a dot per pull, coloured by what it did (${marks.join(' / ')})`,
    marks.length >= 2 && marks.slice(-2).every(c => /\b(win|back|potti|pot)\b/.test(c)));
  const arrow = await tp.evaluate(() => __pj.view.markMesh.material.opacity);
  check(`an arrow over the row shows where the last coin went (opacity ${arrow.toFixed(2)})`, arrow > 0.5);
  const tray0 = await tp.evaluate(() => __pj.view.drops.length);
  await tp.evaluate(() => { const g = __pj.game; g.pot[6] = 6; g.window(g.L.byId.w4); });
  await tp.waitForTimeout(1500);
  const tray = await tp.evaluate(() => ({ n: __pj.view.drops.length, landed: __pj.view.drops.filter(d => d.landed).length, halves: 0 }));
  check(`a POTTI pours its coins into the tray (${tray.n - tray0} coins, ${tray.landed} landed)`, tray.n - tray0 >= 13 && tray.landed > 0);
  const g0 = await tp.evaluate(() => __pj.debug.goal);
  await tp.evaluate(g => { __pj.game.coins = g + 0.5; }, g0);
  await tp.waitForTimeout(600);
  const g1 = await tp.evaluate(() => ({ goal: __pj.debug.goal, toast: document.getElementById('toast').className, shown: document.querySelector('#goal b').textContent }));
  check(`reaching the target moves it on and says so (${g0} → ${g1.goal})`, g1.goal === g0 + 30 && /show/.test(g1.toast) && g1.shown === String(g0 + 30));
  check('no errors on the phone', terr.length === 0, terr.join(' | '));
  await tctx.close();

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
