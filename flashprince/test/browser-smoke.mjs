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

  // Scene 4 is the authored low-mantle / climb-down lab.
  await page.keyboard.press('Digit4');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.visited?.includes('lowMantle'), null, { timeout: 7000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d && d.state !== 'lowMantle' && d.grounded;
  }, null, { timeout: 5000 });

  const d = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(d.faults, 0, 'runtime transition validator must report zero faults');
  assert.ok(d.visited.includes('lowMantle'), 'playthrough must actually enter lowMantle');
  assert.equal(d.grounded, true, 'hero must finish grounded after mantle');
  assert.ok(d.y <= 160.1, `hero must finish on the upper tile, got y=${d.y}`);
  assert.equal(errors.length, 0, `browser console/page errors: ${errors.join(' | ')}`);

  console.log(`PASS Flash Prince browser mantle: ${d.build} ${d.state} x=${d.x.toFixed(1)} y=${d.y.toFixed(1)} grounded=${d.grounded}`);
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
