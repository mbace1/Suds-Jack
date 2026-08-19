// Betterment recovery mobile smoke gate.
// Run from repo root with Playwright installed:
//   node kindling/test/betterment-recovery-smoke.cjs

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webmanifest':'application/manifest+json' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

let pass = 0, fail = 0;
const check = (label, ok) => {
  console.log(`${ok ? '  ok ' : 'FAIL '} ${label}`);
  ok ? pass++ : fail++;
};

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
  await page.waitForFunction(() => window.__kd && window.__bettermentUx && window.__bettermentRecovery && window.__bettermentRules);

  check('boots recovery layer without errors', errors.length === 0);
  check('product is named Betterment', await page.title() === 'Betterment' && await page.locator('#app > header h1').textContent() === 'Betterment');

  // Prove the Fire target is fixed, not the number of configured goals.
  await page.evaluate(() => {
    __kd.state.tasks = __kd.state.tasks.slice(0, 1);
    __kd.debug.render();
    __bettermentRecovery.sync();
  });
  await page.waitForFunction(() => __bettermentUx.goalProgress().target === 5);
  const fixed = await page.evaluate(() => ({
    progress: __bettermentUx.goalProgress(),
    segs: document.querySelectorAll('.bm-progress-seg').length,
  }));
  check('one configured goal still has a five-point Fire target', fixed.progress.target === 5 && fixed.progress.done === 0 && fixed.segs === 5);

  // Add the progressive exercise template through the actual mobile UI.
  await page.locator('.bm-manage-goals').tap();
  await page.waitForSelector('[data-bm-pushups]');
  await page.locator('[data-bm-pushups] button').tap();
  await page.waitForSelector('.today');
  const pushup = page.locator('.task').filter({ hasText: 'Do 10 push-ups' });
  check('progressive 10 push-ups template can be added', await pushup.count() === 1);

  await pushup.tap();
  await page.waitForSelector('.bm-progressive-card');
  const afterBase = await page.evaluate(() => ({
    fire: __bettermentRules.fireProgress().done,
    fuel: __kd.state.fuel,
    bond: __bettermentRules.totalBondXp(),
  }));
  check('base goal gives one Fire point', afterBase.fire === 1);
  check('base goal gives 20 Flames and 20 Bond XP', afterBase.fuel === 1 && afterBase.bond === 20);

  check('Tier II appears only after the base win', /20 push-ups/.test(await page.locator('.bm-progressive-card').textContent()));
  await page.locator('.bm-progressive-action').tap();
  await page.waitForFunction(() => /30 push-ups/.test(document.querySelector('.bm-progressive-card')?.textContent || ''));
  const afterTier2 = await page.evaluate(() => ({
    fire: __bettermentRules.fireProgress().done,
    fuel: __kd.state.fuel,
    bond: __bettermentRules.totalBondXp(),
  }));
  check('Tier II does not add another Fire point', afterTier2.fire === afterBase.fire);
  check('Tier II gives +20 Flames and +40 Bond XP', afterTier2.fuel === afterBase.fuel + 1 && afterTier2.bond === afterBase.bond + 40);

  await page.locator('.bm-progressive-action').tap();
  await page.waitForFunction(() => !document.querySelector('.bm-progressive-card'));
  const afterTier3 = await page.evaluate(() => ({
    fire: __bettermentRules.fireProgress().done,
    fuel: __kd.state.fuel,
    bond: __bettermentRules.totalBondXp(),
  }));
  check('Tier III still does not add Fire', afterTier3.fire === afterBase.fire);
  check('Tier III gives +20 Flames and +60 Bond XP', afterTier3.fuel === afterTier2.fuel + 1 && afterTier3.bond === afterTier2.bond + 60);

  // Shift only the care anchor for the smoke gate. Two calendar-day distance =
  // one fully missed day between the cared day and today; three = two misses.
  const status1 = await page.evaluate(() => {
    const shift = days => {
      const now = new Date();
      now.setHours(12,0,0,0);
      now.setDate(now.getDate() - days);
      const p = n => String(n).padStart(2, '0');
      return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`;
    };
    __kd.state.betterment.lastCareDay = shift(2);
    __kd.state.lastKept = shift(2);
    return __bettermentRules.evaluateKindling();
  });
  await page.evaluate(() => __bettermentRecovery.sync());
  check('first completely missed care-day is warning only', status1.missed === 1 && status1.warning && !status1.event);
  check('warning is visible on Today', await page.locator('[data-bm-kindling-warning]').count() === 1);

  const status2 = await page.evaluate(() => {
    const shift = days => {
      const now = new Date();
      now.setHours(12,0,0,0);
      now.setDate(now.getDate() - days);
      const p = n => String(n).padStart(2, '0');
      return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`;
    };
    __kd.state.betterment.lastCareDay = shift(3);
    __kd.state.lastKept = shift(3);
    return __bettermentRules.evaluateKindling();
  });
  await page.evaluate(() => __bettermentRecovery.sync());
  await page.waitForSelector('[data-bm-kindling-page]');
  check('second consecutive missed care-day Kindles the active monster', !!status2.event && status2.event.name === 'Ember');
  check('Kindled monster is retained in lineage', await page.evaluate(() => __bettermentRules.lineage().length) === 1);
  check('Kindling event replaces normal interaction flow', await page.locator('[data-bm-kindling-page]').count() === 1 && await page.locator('[data-bm-kindling-scene]').count() === 1);

  await page.locator('.bm-wake-ember').tap();
  await page.waitForSelector('.today');
  const next = await page.evaluate(() => ({
    event: __bettermentRules.kindlingEvent(),
    generation: __bettermentRules.activeCompanion().generation,
    alive: __bettermentRules.activeCompanion().alive,
    lineage: __bettermentRules.lineage().length,
  }));
  check('player can continue immediately with the next companion', !next.event && next.generation === 2 && next.alive && next.lineage === 1);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`mobile layout has no horizontal overflow (${overflow}px)`, overflow <= 0);
  check('no console/page errors after full rules flow', errors.length === 0);

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});