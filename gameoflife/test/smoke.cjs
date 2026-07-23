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

  // zen hub: ONE offering at a time, cycle dots, a quiet redraw link
  check('hub offers exactly 1 card', await page.locator('.card').count() === 1);
  check('offering is labeled', (await page.locator('.offer-note').textContent()).includes('offered'));
  check('cycle dots visible', await page.locator('.cycle-dots .dot').count() === 3);
  check('hub title present', (await page.locator('h1').textContent()) === 'The Game of Life');
  const firstOffer = await page.locator('.card h2').textContent();
  await page.locator('.another-btn').click();
  check('"something else" swaps the offering',
    (await page.locator('.card h2').textContent()) !== firstOffer);

  // language switching
  await page.locator('.lang-btn', { hasText: 'Suomi' }).click();
  check('finnish title', (await page.locator('h1').textContent()) === 'Elämän peli');
  await page.locator('.lang-btn', { hasText: '日本語' }).click();
  check('japanese title', (await page.locator('h1').textContent()) === '人生のゲーム');
  await page.locator('.lang-btn', { hasText: 'English' }).click();

  // aqueduct: 3 story panels then puzzle (entered via debug handle — the
  // offering draw is random, so tests navigate deterministically)
  await page.evaluate(() => __gol.debug.start('aqueduct'));
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
  await page.evaluate(() => __gol.debug.start('forest'));
  await page.locator('.exp-buttons .btn', { hasText: 'Follow the sound' }).click();
  check('forest scene 2 shown', (await page.locator('.exp-text').textContent()).includes('heron'));
  await page.locator('.exp-buttons .btn').first().click();
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  await page.waitForTimeout(300);
  const breatheTxt = await page.locator('.exp-text').textContent();
  check('breathing started', /breathe|circle/i.test(breatheTxt));
  await page.locator('.back-btn').click();

  // tern: story advances through a choice
  await page.evaluate(() => __gol.debug.start('tern'));
  check('tern scene 1 shown', (await page.locator('.exp-text').textContent()).includes('Arctic'));
  await page.locator('.exp-buttons .btn', { hasText: 'Leave with the flock' }).click();
  check('tern choice advances', (await page.locator('.exp-text').textContent()).includes('river of wings'));
  await page.locator('.back-btn').click();

  // cup: pour until it overflows, then empty it — the wisdom kernel loop
  await page.evaluate(() => __gol.debug.start('cup'));
  check('cup scene shown', (await page.locator('.exp-text').textContent()).includes('Nan-in'));
  for (let i = 0; i < 20; i++) {   // pour until the overflow swaps the button away
    const pourBtn = page.locator('.exp-buttons .btn', { hasText: 'Pour' });
    if (await pourBtn.count() === 0) break;
    await pourBtn.click();
  }
  check('cup overflows into the teaching',
    (await page.locator('.exp-text').textContent()).includes('empty your cup'));
  await page.locator('.exp-buttons .btn', { hasText: 'Empty the cup' }).click();
  await page.waitForTimeout(1600);
  check('cup outro shown', (await page.locator('.exp-text').textContent()).includes('room'));
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  check('completion leads to feedback', await page.locator('.leaf-row').count() === 1);
  await page.locator('.link-btn', { hasText: 'Skip' }).click();

  // hanami: the history story advances through a choice
  await page.evaluate(() => __gol.debug.start('hanami'));
  check('hanami scene 1 shown', (await page.locator('.exp-text').textContent()).includes('812'));
  await page.locator('.exp-buttons .btn', { hasText: 'Sit with the poets' }).click();
  check('hanami choice advances', (await page.locator('.exp-text').textContent()).includes('poem'));
  await page.locator('.back-btn').click();

  // berry: the Finnish everyman's-right story advances through a choice
  await page.evaluate(() => __gol.debug.start('berry'));
  check('berry scene 1 shown', (await page.locator('.exp-text').textContent()).includes('everyone'));
  await page.locator('.exp-buttons .btn', { hasText: 'Ask what she means' }).click();
  check('berry choice teaches the right',
    (await page.locator('.exp-text').textContent()).includes('Jokamiehenoikeus'));
  await page.locator('.back-btn').click();

  // stars: trace the Dipper star by star, then find Polaris (coords mirror
  // DIPPER/POLARIS in experiences/stars.js — 192x128 canvas space)
  await page.evaluate(() => __gol.debug.start('stars'));
  check('stars intro shown', (await page.locator('.exp-text').textContent()).includes('seven stars'));
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  const sbox = await page.locator('.pixel-screen').boundingBox();
  const tapPx = (x, y) => page.mouse.click(sbox.x + (x + 0.5) / 192 * sbox.width, sbox.y + (y + 0.5) / 128 * sbox.height);
  for (const [x, y] of [[26, 46], [44, 36], [60, 34], [74, 38], [78, 58], [102, 62], [100, 38]]) await tapPx(x, y);
  check('dipper traced (Otava named)', (await page.locator('.exp-text').textContent()).includes('Otava'));
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  await tapPx(52, 22);
  check('Polaris found', (await page.locator('.exp-text').textContent()).includes('Polaris'));
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
  check('hub greets by hour (noon)', (await page.locator('.greet').textContent()) === 'The light is high.');
  const dayTxt = await page.locator('.interlude').textContent();
  check('day prompt is outdoor', dayTxt.includes('wind'));
  await page.locator('.overlay .btn').click();   // "I will" -> consumes interlude
  check('interlude consumed', await page.locator('.overlay').count() === 0);
  const since = await page.evaluate(() => JSON.parse(localStorage.getItem('golState')).sinceInterlude);
  check('cycle counter reset', since === 0);

  // evening variant: a poem from the cross-cultural pool, in the UI language
  // (natureIdx 0 -> Bashō's frog haiku, served in English)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('golState'));
    s.sinceInterlude = 2; s.natureIdx = 0;
    localStorage.setItem('golState', JSON.stringify(s));
  });
  await page.clock.install({ time: new Date('2026-07-22T21:00:00') });
  await page.reload({ waitUntil: 'networkidle' });
  const eveTxt = await page.locator('.interlude').textContent();
  check('evening poem crosses cultures (Bashō in English)',
    eveTxt.includes('frog') && eveTxt.includes('Bashō'));

  // same poem, same rest, Finnish UI -> the haiku appears suomeksi
  await page.locator('.overlay .btn').click();
  await page.evaluate(() => {
    const s = __gol.store.getState();   // mutate live state, not localStorage
    s.sinceInterlude = 2; s.natureIdx = 0;
    __gol.debug.setLang('fi');          // re-renders the hub; the due interlude reopens
  });
  const fiTxt = await page.locator('.interlude').textContent();
  check('evening poem crosses cultures (Bashō in Finnish)', fiTxt.includes('sammakko'));
  await page.evaluate(() => __gol.debug.setLang('en'));

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
