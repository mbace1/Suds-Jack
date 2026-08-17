// Betterment v6 mobile UX / GDD smoke test.
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
  await page.waitForFunction(() => window.__kd && window.__bettermentUx && window.__bettermentGdd);

  check('boots without console/page errors', errors.length === 0);
  check('dark mode is the default', await page.evaluate(() => document.documentElement.dataset.bettermentTheme) === 'dark');
  check('five destination mobile nav is present', await page.locator('.bm-nav button').count() === 5);
  check('Today is active', await page.locator('.bm-nav button.active').textContent() === '▲Today');

  const fresh = await page.evaluate(() => ({
    progress: __bettermentUx.goalProgress(),
    tasks: __kd.state.tasks.length,
    flames: document.getElementById('bm-flames')?.textContent,
    companion: __bettermentGdd.meta.companion?.name,
  }));
  check('daily Fire target is fixed at five', fresh.progress.target === 5 && fresh.progress.done === 0);
  check('existing six starter goals are preserved', fresh.tasks === 6);
  check('fresh game starts at zero flames', fresh.flames === '0');
  check('the GDD companion layer starts alive', !!fresh.companion);
  check('the five-segment Fire UI is rendered', await page.locator('.bm-gdd-fire-seg').count() === 5);

  await page.locator('.task').first().tap();
  await page.waitForFunction(() => window.__bettermentUx.goalProgress().done === 1);
  await page.waitForFunction(() => document.getElementById('bm-flames')?.textContent === '20');
  check('checking a goal advances Fire by one care point', await page.evaluate(() => __bettermentUx.goalProgress().done) === 1);
  check('checking a goal awards 20 visible flames', await page.locator('#bm-flames').textContent() === '20');

  await page.locator('.bm-manage-goals').tap();
  check('goal manager opens', await page.locator('.bm-page h2').textContent() === 'Choose what matters today');
  const categories = await page.locator('.bm-goal-section h3').allTextContents();
  check('goal library covers self-care categories', ['Body','Hygiene','Mind','Connection','Daily care'].every(x => categories.includes(x)));

  const meds = page.locator('.bm-goal-choice').filter({ hasText: 'Take meds' });
  await meds.locator('button').tap();
  check('preset goal can be added', await page.evaluate(() => __kd.state.tasks.some(t => t.text === 'Take meds')));

  // v6 adds the first explicitly progressive preset without bloating the old
  // goal-library data model.
  await page.locator('.bm-manage-goals').tap().catch(() => {});
  if (!await page.locator('.bm-page').count()) await page.evaluate(() => __bettermentUx.navigate('today'));
  if (!/Choose what matters/.test(await page.locator('.bm-page h2').textContent().catch(() => ''))) {
    await page.evaluate(() => __bettermentUx.navigate('today'));
    await page.locator('.bm-manage-goals').tap();
  }
  await page.waitForSelector('[data-gdd-pushups]');
  const pushChoice = page.locator('[data-gdd-pushups]');
  await pushChoice.locator('button').tap();
  check('progressive push-up goal can be added', await page.evaluate(() => __kd.state.tasks.some(t => t.text === 'Do 10 push-ups')));

  await page.waitForSelector('.today');
  const pushTask = page.locator('.task').filter({ hasText: 'Do 10 push-ups' });
  await pushTask.tap();
  await page.waitForSelector('.bm-bonus-card');
  check('finishing Tier I reveals an optional next tier', /20 push-ups/.test(await page.locator('.bm-bonus-card').first().textContent()));

  const beforeBonus = await page.evaluate(() => ({ fuel: __kd.state.fuel, kept: __kd.state.kept, care: __kd.debug.cared() }));
  await page.locator('.bm-bonus-card .bm-bonus-action').first().tap();
  await page.waitForFunction(before => __kd.state.kept >= before.kept + 2, beforeBonus);
  const afterBonus = await page.evaluate(() => ({ fuel: __kd.state.fuel, kept: __kd.state.kept, care: __kd.debug.cared() }));
  check('bonus tier adds 20 Flames', afterBonus.fuel === beforeBonus.fuel + 1);
  check('bonus tier adds 40 Bond XP units', afterBonus.kept === beforeBonus.kept + 2);
  check('bonus tier does not add another Fire care point', afterBonus.care === beforeBonus.care);
  check('Tier III can appear only after Tier II', /30 push-ups/.test(await page.locator('.bm-bonus-card').first().textContent()));

  await page.locator('[data-bm-page="journey"]').tap();
  check('Journey is a real destination', /Send your companion|Out beyond/.test(await page.locator('.bm-page h2').textContent()));
  await page.locator('[data-bm-page="inventory"]').tap();
  check('Inventory is a real destination', await page.locator('.bm-page h2').textContent() === 'Found by the fire');
  await page.locator('[data-bm-page="companion"]').tap();
  check('Companion is a real destination', await page.locator('.bm-page .bm-big').count() === 1);
  check('Companion now exposes lineage', await page.locator('[data-gdd-lineage]').count() === 1);

  await page.locator('.bm-settings').tap();
  const appearance = page.locator('.bm-setting-row').first().locator('button');
  await appearance.tap();
  check('parchment mode can be selected', await page.evaluate(() => document.documentElement.dataset.bettermentTheme) === 'parchment');
  await appearance.tap();
  check('dark mode can be restored', await page.evaluate(() => document.documentElement.dataset.bettermentTheme) === 'dark');

  // Kindling uses care-day distance, not page visits. A first completely missed
  // day is warning-only; the second consecutive missed day creates the event.
  await page.evaluate(() => {
    const keyAgo = n => {
      const t = new Date(Date.now() - 4 * 3600 * 1000);
      t.setDate(t.getDate() - n);
      const p = x => String(x).padStart(2, '0');
      return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
    };
    __kd.state.lastKept = null;
    __bettermentGdd.meta.lastCareDay = keyAgo(2); // one complete missed care-day
    __bettermentUx.navigate('today');
    __bettermentGdd.sync();
  });
  await page.waitForSelector('.bm-kindling-warning');
  check('one missed care-day is warning-only', await page.evaluate(() => __bettermentGdd.missedDays()) === 1);
  check('monster is still alive on warning day', await page.evaluate(() => __bettermentGdd.meta.companion.alive));

  await page.evaluate(() => {
    const keyAgo = n => {
      const t = new Date(Date.now() - 4 * 3600 * 1000);
      t.setDate(t.getDate() - n);
      const p = x => String(x).padStart(2, '0');
      return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
    };
    __bettermentGdd.meta.lastCareDay = keyAgo(3); // two complete missed care-days
    __bettermentGdd.sync();
  });
  await page.waitForSelector('.bm-kindling-page');
  check('two consecutive missed care-days trigger Kindling', await page.evaluate(() => !!__bettermentGdd.meta.kindling.event?.pending));
  check('Kindled companion enters lineage', await page.evaluate(() => __bettermentGdd.meta.lineage.length === 1));
  check('Kindling event covers the old scene', await page.locator('.bm-kindling-scene').count() === 1);

  const oldName = await page.evaluate(() => __bettermentGdd.meta.kindling.event.name);
  await page.locator('.bm-wake-ember').tap();
  await page.waitForSelector('.today');
  const reborn = await page.evaluate(() => ({
    pending: !!__bettermentGdd.meta.kindling.event?.pending,
    name: __bettermentGdd.meta.companion.name,
    alive: __bettermentGdd.meta.companion.alive,
    lineage: __bettermentGdd.meta.lineage.length,
  }));
  check('new ember can continue the run immediately', reborn.alive && !reborn.pending && reborn.name !== oldName);
  check('ancestor remains in lineage after the new ember wakes', reborn.lineage === 1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`mobile layout has no horizontal overflow (${overflow}px)`, overflow <= 0);
  check('no errors after progression, Kindling and navigation', errors.length === 0);

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});