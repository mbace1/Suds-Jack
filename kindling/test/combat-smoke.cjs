// Kindling v7 combat smoke gate.
// Run from repo root with Playwright installed:
//   node kindling/test/combat-smoke.cjs

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

let pass = 0, fail = 0;
const check = (label, ok) => { console.log(`${ok ? '  ok ' : 'FAIL '} ${label}`); ok ? pass++ : fail++; };

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(`${base}/kindling/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__kd && window.__bettermentUx && window.__bettermentGdd && window.__bettermentCombat);
  check('combat layer boots without errors', errors.length === 0);

  const careBefore = await page.evaluate(() => ({
    cared: __kd.debug.cared(),
    fuel: __kd.state.fuel,
    kept: __kd.state.kept,
  }));

  await page.locator('[data-bm-page="journey"]').tap();
  await page.waitForSelector('[data-combat-encounter="moss-knight"]');
  check('Moss Knight encounter lives under Journey', await page.locator('[data-combat-encounter="moss-knight"]').count() === 1);

  await page.locator('.bm-fight').tap();
  await page.waitForSelector('.bm-combat-page');
  check('fight opens as a dedicated mobile combat screen', await page.locator('.bm-combat-page h2').textContent() === 'Moss Knight');
  check('three large actions are present', await page.locator('.bm-combat-action').count() === 3);
  check('first enemy intent is telegraphed', /ROOT SWING/.test(await page.locator('.bm-combat-intent').textContent()));

  // Turn 1: strike. Turn 2 telegraphs the heavy attack.
  await page.locator('.bm-combat-action.strike').tap();
  check('Strike damages and generates a Spark', await page.evaluate(() => {
    const f = __bettermentCombat.state.current;
    return f.enemyHp === 20 && f.sparks === 2 && f.playerHp === 16;
  }));
  check('heavy Moss Knight attack is shown before acting', /OVERHEAD CRUSH/.test(await page.locator('.bm-combat-intent').textContent()));

  // Guard should make the 7 damage heavy hit only deal 1.
  await page.locator('.bm-combat-action.guard').tap();
  check('Guard heavily reduces the telegraphed heavy hit', await page.evaluate(() => {
    const f = __bettermentCombat.state.current;
    return f.playerHp === 15 && f.sparks === 3;
  }));

  // Finish with skill / strike / skill. Moss gets one heal turn in the middle.
  await page.locator('.bm-combat-action.skill').tap();
  await page.locator('.bm-combat-action.strike').tap();
  await page.locator('.bm-combat-action.skill').tap();
  await page.waitForSelector('.bm-combat-result.victory');
  check('short action sequence can win the prototype fight', await page.evaluate(() => __bettermentCombat.state.current.status) === 'victory');
  check('victory awards one Moss Fragment', await page.evaluate(() => __bettermentCombat.state.mossFragments) === 1);

  const afterWin = await page.evaluate(() => ({
    cared: __kd.debug.cared(),
    fuel: __kd.state.fuel,
    kept: __kd.state.kept,
  }));
  check('combat victory does not alter self-care economy',
    afterWin.cared === careBefore.cared && afterWin.fuel === careBefore.fuel && afterWin.kept === careBefore.kept);

  // Prove defeat/retreat is also isolated from wellness state.
  await page.locator('.bm-combat-result .btn').filter({ hasText: 'Fight again' }).tap();
  await page.evaluate(() => { __bettermentCombat.state.current.playerHp = 1; });
  await page.locator('.bm-combat-action.strike').tap();
  await page.waitForSelector('.bm-combat-result.retreat');
  check('combat defeat becomes a retreat, not creature death', await page.evaluate(() => __bettermentCombat.state.current.status) === 'retreat');

  const afterLoss = await page.evaluate(() => ({
    cared: __kd.debug.cared(),
    fuel: __kd.state.fuel,
    kept: __kd.state.kept,
  }));
  check('retreat loses no care, Flames or Bond progression',
    afterLoss.cared === careBefore.cared && afterLoss.fuel === careBefore.fuel && afterLoss.kept === careBefore.kept);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`combat has no mobile horizontal overflow (${overflow}px)`, overflow <= 0);
  check('fight flow produced no page/console errors', errors.length === 0);

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
