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

  await page.goto('http://127.0.0.1:4173/flashprince/movement-lab.html', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.build === 'FP-MOVE-9');

  // Scene 2: running gap, running landing, raised ledge catch and pull-up.
  await page.keyboard.press('Digit2');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'run' && globalThis.__flashPrinceMovement.x >= 78, null, { timeout: 5000 });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.visited?.includes('landRun') && globalThis.__flashPrinceMovement.x >= 148 && globalThis.__flashPrinceMovement.grounded, null, { timeout: 5000 });
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'run' && globalThis.__flashPrinceMovement.x >= 190, null, { timeout: 5000 });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'ledgeCatch', null, { timeout: 5000 });
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'hang', null, { timeout: 3000 });
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'pullUp', null, { timeout: 2000 });
  await page.keyboard.up('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'stand' && globalThis.__flashPrinceMovement.grounded && globalThis.__flashPrinceMovement.y <= 96.1, null, { timeout: 5000 });
  const ledge = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(ledge.faults, 0);
  assert.ok(ledge.x >= 224);

  // Scene 4: low mantle, deliberate climb-down, valid inward shimmy, blocked outward shimmy, pull-up.
  await page.keyboard.press('Digit4');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'lowMantle', null, { timeout: 7000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'stand' && globalThis.__flashPrinceMovement.grounded && globalThis.__flashPrinceMovement.y <= 160.1, null, { timeout: 5000 });
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'pivot', null, { timeout: 2000 });
  await page.keyboard.up('ArrowLeft');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'stand', null, { timeout: 3000 });
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'climbDown', null, { timeout: 2000 });
  await page.keyboard.up('ArrowDown');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'hang', null, { timeout: 3000 });
  const hangStart = await page.evaluate(() => globalThis.__flashPrinceMovement);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'shimmy', null, { timeout: 2000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'hang', null, { timeout: 3000 });
  const shimmy = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.ok(shimmy.x > hangStart.x + 2.5);
  const outwardX = shimmy.x;
  await page.keyboard.down('ArrowLeft');
  await sleep(350);
  await page.keyboard.up('ArrowLeft');
  const blocked = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(blocked.state, 'hang');
  assert.ok(Math.abs(blocked.x - outwardX) < 0.2);
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'pullUp', null, { timeout: 2000 });
  await page.keyboard.up('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'stand' && globalThis.__flashPrinceMovement.grounded && globalThis.__flashPrinceMovement.y <= 160.1, null, { timeout: 5000 });
  const climb = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(climb.faults, 0);

  // Scene 3: use the authored left shaft. One committed step reaches the lip;
  // deliberate climb-down gives a zero-horizontal drop from hanging height to
  // the bottom floor: 70px, above FALL_HURT but below FALL_KILL.
  await page.keyboard.press('Digit3');
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'pivot', null, { timeout: 2000 });
  await page.keyboard.up('ArrowLeft');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'stand' && globalThis.__flashPrinceMovement.face === -1, null, { timeout: 3000 });
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'step', null, { timeout: 2000 });
  await page.keyboard.up('ArrowLeft');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'stand', null, { timeout: 3000 });
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'climbDown', null, { timeout: 2000 });
  await page.keyboard.up('ArrowDown');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'hang', null, { timeout: 3000 });
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'fall', null, { timeout: 2000 });
  await page.keyboard.up('ArrowDown');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'landHard', null, { timeout: 5000 });
  const impact = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(impact.health, 2, 'hard landing must cost exactly one health');
  assert.equal(impact.grounded, true, 'hard landing must contact bottom floor');
  assert.ok(impact.y >= 176 && impact.y <= 177, `hard landing expected bottom-floor contact window 176..177, got ${impact.y}`);
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'stand', null, { timeout: 3000 });
  const recovered = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(recovered.faults, 0, 'hard landing recovery must have zero transition faults');

  // Scene 1: prove release braking and reverse braking/pivot as live input sequences.
  await page.keyboard.press('Digit1');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'run' && globalThis.__flashPrinceMovement.x >= 90, null, { timeout: 5000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'runStop', null, { timeout: 2000 });
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'stand', null, { timeout: 3000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'run', null, { timeout: 5000 });
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'runStop', null, { timeout: 2000 });
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'pivot', null, { timeout: 3000 });
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'runStart' && globalThis.__flashPrinceMovement.face === -1, null, { timeout: 3000 });
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'run' && globalThis.__flashPrinceMovement.face === -1, null, { timeout: 3000 });
  await page.keyboard.up('ArrowLeft');
  const brake = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(brake.faults, 0, 'brake/pivot sequence must have zero transition faults');

  assert.equal(errors.length, 0, `browser console/page errors: ${errors.join(' | ')}`);
  console.log(`PASS Flash Prince movement v9: ledge ${ledge.x.toFixed(1)}/${ledge.y.toFixed(1)}, hard-land y=${impact.y.toFixed(1)} HP${impact.health}, reverse face=${brake.face}`);
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
