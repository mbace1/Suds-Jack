import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const server = spawn('python3', ['-m', 'http.server', '4174'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  await sleep(700);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('http://127.0.0.1:4174/flashprince/', { waitUntil: 'networkidle' });
  const canvas = page.locator('#screen');
  await canvas.waitFor({ state: 'visible', timeout: 5000 });

  const before = await canvas.screenshot();
  await page.keyboard.press('ArrowRight');
  await sleep(900);
  const entered = await canvas.screenshot();
  assert.notDeepEqual(entered, before, 'hub entry must advance from the opening screen into gameplay after input');

  await page.keyboard.down('ArrowRight');
  await sleep(700);
  await page.keyboard.up('ArrowRight');
  const moving = await canvas.screenshot();
  assert.notDeepEqual(moving, entered, 'playable game must continue updating after entering gameplay');
  assert.equal(errors.length, 0, `playable entry console/page errors: ${errors.join(' | ')}`);

  console.log('PASS Flash Prince playable entry: opening screen -> live campaign');
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
