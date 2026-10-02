// Verify the shipped arcade worker in a browser, including an update and a
// fresh offline navigation. ?sw=1 is the page's existing localhost opt-in.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PREFIX = '/Suds-Jack/';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
let build = 1;
let online = true;
const originalWorker = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const workerVersion = originalWorker.match(/const VERSION = '([^']+)'/)[1];
const expectedCache = n => `suds-hub-${workerVersion}${n === 1 ? '' : '-offline-test-next'}`;
const server = http.createServer((req, res) => {
  if (!online) { res.destroy(); return; }
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith(PREFIX)) { res.writeHead(404); res.end(); return; }
  let file = path.join(ROOT, decodeURIComponent(url.pathname.slice(PREFIX.length)));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, bytes) => {
    if (err) { res.writeHead(404); res.end(); return; }
    if (file === path.join(ROOT, 'index.html')) bytes = Buffer.from(bytes.toString().replace('<body>', `<body data-offline-test-build="${build}">`));
    if (file === path.join(ROOT, 'hub/versions.json')) {
      const data = JSON.parse(bytes); data.__offlineTest = { v: String(build), n: build };
      bytes = Buffer.from(JSON.stringify(data));
    }
    if (file === path.join(ROOT, 'sw.js') && build === 2) bytes = Buffer.from(originalWorker.replace(`const VERSION = '${workerVersion}'`, `const VERSION = '${workerVersion}-offline-test-next'`));
    // A warm HTTP cache must not make the navigation/version checks pass
    // without contacting the server after build changes.
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': path.basename(file) === 'sw.js' ? 'no-store' : 'max-age=3600' });
    res.end(bytes);
  });
});

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}${PREFIX}`;
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    let page = await context.newPage();
    const errors = [];
    const watch = p => p.on('pageerror', e => errors.push(String(e)));
    watch(page);
    const open = async () => {
      await page.goto(`${base}?sw=1`, { waitUntil: 'networkidle' });
      await page.waitForSelector('#cabinets .cab', { timeout: 10000 });
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
    };
    await open();
    await page.reload({ waitUntil: 'networkidle' });
    const cabinets = await page.locator('#cabinets .cab').count();
    assert.ok(cabinets > 0, 'the actual arcade must render before going offline');
    assert.equal(await page.locator('.toko-chat').count(), 1, 'the counter boots with the arcade');
    console.log(`PASS online mobile arcade: ${cabinets} cabinets and the counter`);

    build = 2;
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('body').getAttribute('data-offline-test-build'), '2', 'network-first navigation must bypass a warm HTTP cache');
    const metadata = await page.evaluate(async () => (await (await fetch('hub/versions.json', { cache: 'no-cache' })).json()).__offlineTest.v);
    assert.equal(metadata, '2', 'release metadata must refresh while online');
    console.log('PASS online navigation and release metadata refresh');

    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await page.waitForFunction(async wanted => {
      const keys = (await caches.keys()).filter(k => k.startsWith('suds-hub-'));
      return keys.length === 1 && keys[0] === wanted;
    }, expectedCache(2), { timeout: 15000 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(async () => {
      const response = await caches.match(new URL('hub/versions.json', document.baseURI));
      return response && (await response.json()).__offlineTest?.v === '2';
    });
    console.log('PASS worker update installs the new shell and removes the old hub cache');

    // A new page rules out a still-running module graph masking missing cache
    // entries. Its document, modules and counter must all boot from the worker.
    await page.close();
    online = false;
    await context.setOffline(true);
    page = await context.newPage(); watch(page);
    await open();
    assert.equal(await page.locator('body').getAttribute('data-offline-test-build'), '2', 'offline navigation uses the last online build');
    assert.equal(await page.locator('#cabinets .cab').count(), cabinets, 'all online cabinets render on a fresh offline page');
    await page.locator('.toko-chat .tc-bar').click();
    const input = page.locator('.toko-chat .tc-say-row input');
    const replies = await page.locator('.toko-chat .tc-me').count();
    await input.fill('WHO ARE YOU?'); await input.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.toko-chat .tc-you').length > 0);
    await page.waitForFunction(n => document.querySelectorAll('.toko-chat .tc-me').length > n, replies);
    assert.equal(await page.evaluate(() => navigator.onLine), false, 'the fresh page is offline');
    assert.deepEqual(errors, [], 'online/update/offline pages have no JavaScript exceptions');
    fs.mkdirSync(path.join(ROOT, 'reports/release'), { recursive: true });
    await page.screenshot({ path: path.join(ROOT, 'reports/release/hub-offline.png'), fullPage: true });
    console.log('PASS fresh offline mobile arcade and real counter input');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
