// Kindling v9 breeding / visible-genetics smoke gate.
// Run from repo root with Playwright installed:
//   node kindling/test/breeding-smoke.cjs

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
  await page.waitForFunction(() => window.__kd && window.__bettermentCombat && window.__bettermentBreeding);
  check('lineage layer boots without errors', errors.length === 0);

  const initial = await page.evaluate(() => __bettermentBreeding.active());
  check('starter companion is the live scene companion', !!initial && initial.id === __bettermentGdd.meta.companion.id);
  check('starter exposes renderer-ready traits', initial?.traits && ['horns','ears','ember','marking'].every(k => initial.traits[k]));

  await page.evaluate(() => {
    __bettermentCombat.state.mossFragments = 1;
    __bettermentBreeding.sync();
  });
  await page.locator('[data-bm-page="companion"]').tap();
  await page.waitForSelector('[data-breeding]');
  check('lineage lives under Companion', await page.locator('[data-breeding]').count() === 1);
  check('starter companion is in the roster', await page.locator('.bm-roster-card').count() === 1);

  await page.locator('.bm-moss-discovery .btn').tap();
  await page.waitForFunction(() => __bettermentBreeding.game.roster.length === 2);
  check('combat discovery can awaken a second companion', await page.locator('.bm-roster-card').count() === 2);
  check('awakening uses one Moss Fragment', await page.evaluate(() => __bettermentCombat.state.mossFragments) === 0);
  check('both prototype parents are mature and living', await page.evaluate(() => __bettermentBreeding.liveMature().length) === 2);

  const mossId = await page.evaluate(() => __bettermentBreeding.game.roster.find(r => r.source === 'moss-fragment').id);
  await page.evaluate(id => __bettermentBreeding.setCurrentById(id), mossId);
  const mossActive = await page.evaluate(() => __bettermentBreeding.active());
  check('another living creature can be kept by the bonfire', mossActive.id === mossId && __bettermentGdd.meta.companion.id === mossId);
  check('Mossling carries visibly distinct genes', mossActive.traits.ember === 'green' && mossActive.traits.horns === 'branch' && mossActive.traits.ears === 'leaf');
  check('active creature has its own growth stage', mossActive.visualStage === 'tender');

  // Render two explicit genetic records into isolated low-res canvases. This is
  // deterministic (still frame, fixed stage) and proves inherited fields change
  // actual pixels rather than only roster labels.
  const renderHashes = await page.evaluate(async () => {
    const { PixelScreen } = await import('./js/pixel.js?v=5');
    const { drawPet } = await import('./js/pet.js?v=5');
    const hash = visual => {
      const host = document.createElement('div');
      const scr = new PixelScreen(host, 64, 64);
      scr.clear('#000000');
      drawPet(scr, 32, 54, { stage:'tender', t:0, pose:'sit', lit:1, still:true, face:-1, look:0, visual });
      const data = scr.ctx.getImageData(0, 0, 64, 64).data;
      let h = 2166136261;
      for (let i = 0; i < data.length; i++) { h ^= data[i]; h = Math.imul(h, 16777619); }
      return h >>> 0;
    };
    const ember = {
      visualStage:'tender', traits:{horns:'stub',ears:'round',ember:'orange',marking:'ash'},
      temperament:'curious', combatStyle:'quick striker',
    };
    const moss = {
      visualStage:'tender', traits:{horns:'branch',ears:'leaf',ember:'green',marking:'moss'},
      temperament:'cautious', combatStyle:'guard-heavy',
    };
    const blue = {
      visualStage:'tender', traits:{horns:'curl',ears:'droop',ember:'blue',marking:'stripe'},
      temperament:'bold', combatStyle:'counterattacker',
    };
    return [hash(ember), hash(moss), hash(blue)];
  });
  check('genetic combinations produce different live-render silhouettes/pixels', new Set(renderHashes).size === 3);

  const parentsBefore = await page.evaluate(() => __bettermentBreeding.liveMature().map(r => r.id));
  await page.locator('[data-bm-page="companion"]').tap();
  await page.locator('.bm-breed').tap();
  await page.waitForSelector('.bm-egg-card');
  check('breeding creates an ember-seed rather than consuming a parent', await page.evaluate(() => !!__bettermentBreeding.game.egg));
  check('both parents remain in the roster', await page.evaluate(ids => ids.every(id => __bettermentBreeding.game.roster.some(r => r.id === id && r.alive)), parentsBefore));
  check('new egg starts at zero care progress', await page.evaluate(() => __bettermentBreeding.eggProgress().done) === 0);

  const eggSnapshot = await page.evaluate(() => JSON.stringify(__bettermentBreeding.game.egg.child));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__bettermentBreeding && window.__bettermentBreeding.game.egg);
  check('offspring outcome is seeded and survives reload', await page.evaluate(() => JSON.stringify(__bettermentBreeding.game.egg.child)) === eggSnapshot);
  check('selected companion survives reload', await page.evaluate(id => __bettermentBreeding.active().id === id, mossId));

  await page.evaluate(() => {
    __kd.state.kept += __bettermentBreeding.constants.HATCH_CARE;
    __bettermentBreeding.sync();
  });
  await page.locator('[data-bm-page="companion"]').tap();
  await page.waitForSelector('.bm-hatch');
  check('five future care units make the ember-seed ready', await page.evaluate(() => __bettermentBreeding.eggProgress().ready));

  await page.locator('.bm-hatch').tap();
  await page.waitForFunction(() => __bettermentBreeding.game.roster.length === 3 && !__bettermentBreeding.game.egg);
  const child = await page.evaluate(() => __bettermentBreeding.game.roster[2]);
  check('hatching creates a third persistent companion', !!child && child.source === 'lineage');
  check('offspring records both parents', Array.isArray(child.parents) && child.parents.length === 2);
  check('offspring has inherited visual traits', child.traits && ['horns','ears','ember','marking'].every(k => child.traits[k]));
  check('offspring has temperament and combat tendency', !!child.temperament && !!child.combatStyle);
  check('new offspring starts as a spark rather than inheriting global age', await page.evaluate(id => {
    const r = __bettermentBreeding.game.roster.find(x => x.id === id);
    return __bettermentBreeding.visualStage(r) === 'spark' && r.mature === false;
  }, child.id));

  await page.evaluate(id => __bettermentBreeding.setCurrentById(id), child.id);
  check('a newborn can become the visible current companion without deleting its parents', await page.evaluate(id => {
    return __bettermentBreeding.active().id === id && __bettermentBreeding.game.roster.filter(r => r.alive).length === 3;
  }, child.id));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`lineage UI has no mobile horizontal overflow (${overflow}px)`, overflow <= 0);
  check('lineage flow produced no page/console errors', errors.length === 0);

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => {
  console.error(err);
  server.close();
  process.exit(1);
});
