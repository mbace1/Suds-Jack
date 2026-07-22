// The Game of Life — headless smoke test (the beta playtest loop).
// Run from anywhere:  node gameoflife/test/smoke.cjs
// Needs the `playwright` package resolvable (globally installed is fine:
// NODE_PATH=<global node_modules>) and a Playwright-managed Chromium.
//
// Covers:
//  - page loads with zero console/page errors
//  - hub renders both cards, in all three languages
//  - aqueduct: story advances, puzzle canvas survives interaction
//  - forest: choices advance scenes, breathing finale starts
//  - nature interlude fires at sinceInterlude >= 2 (day + evening variants)
//  - feedback store + __gol debug handle
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');   // repo root
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.md': 'text/plain' };

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const p = path.join(ROOT, url === '/' ? 'index.html' : url);
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/gameoflife/index.html`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(URL, { waitUntil: 'networkidle' });

  check('hub renders 2 cards', await page.locator('.card').count() === 2);
  check('hub title present', (await page.locator('h1').textContent()) === 'The Game of Life');

  // language switching
  await page.locator('.lang-btn', { hasText: 'Suomi' }).click();
  check('finnish title', (await page.locator('h1').textContent()) === 'Elämän peli');
  await page.locator('.lang-btn', { hasText: '日本語' }).click();
  check('japanese title', (await page.locator('h1').textContent()) === '人生のゲーム');
  await page.locator('.lang-btn', { hasText: 'English' }).click();

  // aqueduct: 3 story panels then puzzle
  await page.locator('.card', { hasText: 'The Stone River' }).locator('.btn').click();
  for (let i = 0; i < 3; i++) {
    check(`aqueduct story panel ${i + 1} has text`, (await page.locator('.exp-text').textContent()).length > 20);
    await page.locator('.exp-buttons .btn').click();
  }
  const hint = await page.locator('.exp-text').textContent();
  check('puzzle hint shown', hint.includes('Channel 1'));
  // click around the canvas — must not throw, tiles rotate silently
  const box = await page.locator('.pixel-screen').boundingBox();
  for (let i = 0; i < 8; i++) {
    await page.mouse.click(box.x + box.width * (0.2 + 0.08 * i), box.y + box.height * 0.45);
  }
  check('puzzle interaction survives clicks', errors.length === 0);
  await page.locator('.back-btn').click();

  // forest: choice -> choice -> continue -> breathing starts
  await page.locator('.card', { hasText: 'The Forest Path' }).locator('.btn').click();
  await page.locator('.exp-buttons .btn', { hasText: 'Follow the sound' }).click();
  check('forest scene 2 shown', (await page.locator('.exp-text').textContent()).includes('heron'));
  await page.locator('.exp-buttons .btn').first().click();
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  await page.waitForTimeout(300);
  const breatheTxt = await page.locator('.exp-text').textContent();
  check('breathing started', /breathe|circle/i.test(breatheTxt));
  await page.locator('.back-btn').click();

  // interlude: force the cycle counter, reload — overlay must appear (daytime prompt)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('golState') || '{}');
    s.sinceInterlude = 2; s.natureIdx = 0;
    localStorage.setItem('golState', JSON.stringify(s));
  });
  await page.clock.install({ time: new Date('2026-07-22T12:00:00') });
  await page.reload({ waitUntil: 'networkidle' });
  check('interlude overlay shown (day)', await page.locator('.overlay').count() === 1);
  const dayTxt = await page.locator('.interlude').textContent();
  check('day prompt is outdoor', dayTxt.includes('wind'));
  await page.locator('.overlay .btn').click();   // "I will" -> consumes interlude
  check('interlude consumed', await page.locator('.overlay').count() === 0);
  const since = await page.evaluate(() => JSON.parse(localStorage.getItem('golState')).sinceInterlude);
  check('cycle counter reset', since === 0);

  // evening variant: poem should be embedded
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('golState'));
    s.sinceInterlude = 2; s.natureIdx = 0;
    localStorage.setItem('golState', JSON.stringify(s));
  });
  await page.clock.install({ time: new Date('2026-07-22T21:00:00') });
  await page.reload({ waitUntil: 'networkidle' });
  const eveTxt = await page.locator('.interlude').textContent();
  check('evening interlude has poem', eveTxt.includes('rainbow') || eveTxt.includes('Wordsworth'));

  // debug handle + feedback store
  await page.locator('.overlay .btn').click();
  await page.evaluate(() => __gol.store.recordFeedback({ id: 'smoke', leaves: 5, text: 'test', lang: 'en' }));
  const fb = await page.evaluate(() => __gol.debug.feedback());
  check('feedback recorded via __gol', fb.length === 1 && fb[0].leaves === 5);

  check('zero console/page errors overall', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  await browser.close();
  server.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
