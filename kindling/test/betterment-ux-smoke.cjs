// Betterment v4 mobile UX smoke test.
// Run from repo root with Playwright available:
//   node kindling/test/betterment-ux-smoke.cjs

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
  await page.waitForFunction(() => window.__kd && window.__bettermentUx);

  check('boots without console/page errors', errors.length === 0);
  check('dark mode is the default', await page.evaluate(() => document.documentElement.dataset.bettermentTheme) === 'dark');
  check('five destination mobile nav is present', await page.locator('.bm-nav button').count() === 5);
  check('Today is active', await page.locator('.bm-nav button.active').textContent() === '▲Today');

  const fresh = await page.evaluate(() => ({
    progress: __bettermentUx.goalProgress(),
    tasks: __kd.state.tasks.length,
    flames: document.getElementById('bm-flames')?.textContent,
  }));
  check('fresh daily target is five goals', fresh.progress.target === 5 && fresh.progress.done === 0);
  check('existing six starter goals are preserved', fresh.tasks === 6);
  check('fresh game starts at zero flames', fresh.flames === '0');

  await page.locator('.task').first().tap();
  await page.waitForFunction(() => window.__bettermentUx.goalProgress().done === 1);
  await page.waitForFunction(() => document.getElementById('bm-flames')?.textContent === '20');
  check('checking a goal advances the goal bar', await page.evaluate(() => __bettermentUx.goalProgress().done) === 1);
  check('checking a goal awards 20 visible flames', await page.locator('#bm-flames').textContent() === '20');

  await page.locator('.bm-manage-goals').tap();
  check('goal manager opens', await page.locator('.bm-page h2').textContent() === 'Choose what matters today');
  const categories = await page.locator('.bm-goal-section h3').allTextContents();
  check('goal library covers self-care categories', ['Body','Hygiene','Mind','Connection','Daily care'].every(x => categories.includes(x)));

  const meds = page.locator('.bm-goal-choice').filter({ hasText: 'Take meds' });
  await meds.locator('button').tap();
  check('preset goal can be added', await page.evaluate(() => __kd.state.tasks.some(t => t.text === 'Take meds')));

  await page.locator('.bm-back').tap();
  await page.waitForSelector('.today');
  check('added goal appears on Today', (await page.locator('.task .what').allTextContents()).includes('Take meds'));

  await page.locator('[data-bm-page="journey"]').tap();
  check('Journey is a real destination', /Send your companion|Out beyond/.test(await page.locator('.bm-page h2').textContent()));
  await page.locator('[data-bm-page="inventory"]').tap();
  check('Inventory is a real destination', await page.locator('.bm-page h2').textContent() === 'Found by the fire');
  await page.locator('[data-bm-page="companion"]').tap();
  check('Companion is a real destination', await page.locator('.bm-page .bm-big').count() === 1);

  await page.locator('.bm-settings').tap();
  const appearance = page.locator('.bm-setting-row').first().locator('button');
  await appearance.tap();
  check('parchment mode can be selected', await page.evaluate(() => document.documentElement.dataset.bettermentTheme) === 'parchment');
  await appearance.tap();
  check('dark mode can be restored', await page.evaluate(() => document.documentElement.dataset.bettermentTheme) === 'dark');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`mobile layout has no horizontal overflow (${overflow}px)`, overflow <= 0);
  check('no errors after navigation and goal edits', errors.length === 0);

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});