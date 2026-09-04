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
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.build === 'FP-MOVE-8');

  await page.keyboard.press('Digit2');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d?.state === 'run' && d.x >= 78;
  }, null, { timeout: 5000 });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d?.visited?.includes('landRun') && d.x >= 148 && d.grounded;
  }, null, { timeout: 5000 });

  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d?.state === 'run' && d.x >= 190;
  }, null, { timeout: 5000 });
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.visited?.includes('ledgeCatch'), null, { timeout: 5000 });
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'hang', null, { timeout: 3000 });
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'pullUp', null, { timeout: 2000 });
  await page.keyboard.up('ArrowUp');
  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d && d.state === 'stand' && d.grounded && d.y <= 96.1;
  }, null, { timeout: 5000 });

  const ledge = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(ledge.faults, 0, 'ledge playthrough must report zero transition faults');
  assert.ok(ledge.visited.includes('gatherRun'), 'scene must use running jumps');
  assert.ok(ledge.visited.includes('landRun'), 'three-tile gap must resolve through running landing');
  assert.ok(ledge.visited.includes('ledgeCatch'), 'raised platform must enter ledgeCatch');
  assert.ok(ledge.visited.includes('hang'), 'ledgeCatch must settle into hang');
  assert.ok(ledge.visited.includes('pullUp'), 'hang must transition through pullUp');
  assert.equal(ledge.grounded, true, 'pull-up must finish grounded');
  assert.ok(ledge.x >= 224, `pull-up must carry the hero onto the raised platform, got x=${ledge.x}`);
  assert.ok(ledge.y <= 96.1, `pull-up must finish at the raised lip height, got y=${ledge.y}`);

  // Scene 4: mantle onto the two-tile block, take one committed step to its
  // right lip, deliberately climb down, shimmy back toward the block, reject
  // an outward shimmy into empty space, then pull back onto the same surface.
  await page.keyboard.press('Digit4');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'lowMantle', null, { timeout: 7000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d && d.state === 'stand' && d.grounded && d.y <= 160.1;
  }, null, { timeout: 5000 });

  const mantle = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(mantle.faults, 0, 'runtime transition validator must report zero faults after mantle');
  assert.equal(mantle.grounded, true, 'hero must finish grounded after mantle');
  assert.ok(mantle.y <= 160.1, `hero must finish on the upper tile, got y=${mantle.y}`);

  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'step', null, { timeout: 2000 });
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d?.state === 'stand' && d.x >= 147 && d.x <= 150 && d.grounded;
  }, null, { timeout: 3000 });

  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'climbDown', null, { timeout: 2000 });
  await page.keyboard.up('ArrowDown');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'hang', null, { timeout: 3000 });
  const hangStart = await page.evaluate(() => globalThis.__flashPrinceMovement);

  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'shimmy', null, { timeout: 2000 });
  await page.keyboard.up('ArrowLeft');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'hang', null, { timeout: 3000 });
  const shimmy = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.ok(shimmy.x < hangStart.x - 2.5, `inward shimmy must move left along the lip, ${hangStart.x} -> ${shimmy.x}`);

  const outwardX = shimmy.x;
  await page.keyboard.down('ArrowRight');
  await sleep(350);
  await page.keyboard.up('ArrowRight');
  const blocked = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(blocked.state, 'hang', 'outward shimmy into empty space must stay hanging');
  assert.ok(Math.abs(blocked.x - outwardX) < 0.2, `blocked shimmy must not move hero, ${outwardX} -> ${blocked.x}`);

  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => globalThis.__flashPrinceMovement?.state === 'pullUp', null, { timeout: 2000 });
  await page.keyboard.up('ArrowUp');
  await page.waitForFunction(() => {
    const d = globalThis.__flashPrinceMovement;
    return d?.state === 'stand' && d.grounded && d.y <= 160.1;
  }, null, { timeout: 5000 });

  const climb = await page.evaluate(() => globalThis.__flashPrinceMovement);
  assert.equal(climb.faults, 0, 'climb-down/shimmy playthrough must report zero transition faults');
  assert.ok(climb.visited.includes('climbDown'), 'Scene 4 must enter climbDown');
  assert.ok(climb.visited.includes('shimmy'), 'Scene 4 must enter shimmy');
  assert.ok(climb.visited.includes('pullUp'), 'Scene 4 must pull back onto the block');
  assert.equal(climb.grounded, true, 'climb-down recovery must finish grounded');
  assert.ok(climb.y <= 160.1, `climb-down recovery must finish on upper block, got y=${climb.y}`);
  assert.equal(errors.length, 0, `browser console/page errors: ${errors.join(' | ')}`);

  console.log(`PASS Flash Prince gap+ledge: x=${ledge.x.toFixed(1)} y=${ledge.y.toFixed(1)}; climb+shimmy: x=${climb.x.toFixed(1)} y=${climb.y.toFixed(1)}`);
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
