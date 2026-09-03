import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const server = spawn('python3', ['-m', 'http.server', '4173'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  await sleep(700);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://127.0.0.1:4173/flashprince/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.build === 'FP-MOVE-7');

  // Scene 2: accelerate into a real run and take off in the authored edge zone
  // just before the x=96 gap. The far lip begins at x=144/y=128.
  await page.keyboard.press('Digit2');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d?.state === 'run' && d.x >= 78;
  }, null, { timeout: 5000 });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.visited?.includes('ledgeCatch'), null, { timeout: 5000 });
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'hang', null, { timeout: 3000 });
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.visited?.includes('pullUp'), null, { timeout: 2000 });
  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d && d.state === 'stand' && d.grounded && d.y <= 128.1;
  }, null, { timeout: 5000 });

  const ledge = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(ledge.faults, 0, 'ledge playthrough must report zero transition faults');
  assert.ok(ledge.visited.includes('gatherRun'), 'gap playthrough must use the running jump');
  assert.ok(ledge.visited.includes('ledgeCatch'), 'gap playthrough must enter ledgeCatch');
  assert.ok(ledge.visited.includes('hang'), 'ledgeCatch must settle into hang');
  assert.ok(ledge.visited.includes('pullUp'), 'hang must transition through pullUp');
  assert.equal(ledge.grounded, true, 'pull-up must finish grounded');
  assert.ok(ledge.x >= 144, `pull-up must carry the hero onto the far platform, got x=${ledge.x}`);
  assert.ok(ledge.y <= 128.1, `pull-up must finish at the far lip height, got y=${ledge.y}`);

  // Scene 4 regression: keep the low-mantle path green while the ledge pass evolves.
  await page.keyboard.press('Digit4');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'lowMantle', null, { timeout: 7000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d && d.state !== 'lowMantle' && d.grounded;
  }, null, { timeout: 5000 });

  const mantle = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(mantle.faults, 0, 'runtime transition validator must report zero faults');
  assert.equal(mantle.grounded, true, 'hero must finish grounded after mantle');
  assert.ok(mantle.y <= 160.1, `hero must finish on the upper tile, got y=${mantle.y}`);
  assert.equal(errors.length, 0, `browser console/page errors: ${errors.join(' | ')}`);

  console.log(`PASS Flash Prince ledge: x=${ledge.x.toFixed(1)} y=${ledge.y.toFixed(1)}; mantle: x=${mantle.x.toFixed(1)} y=${mantle.y.toFixed(1)}`);
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
