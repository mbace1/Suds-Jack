#!/usr/bin/env node
// Force-draw every B-roll plate at d=0 and d=1. A broken plate only fails when
// a live cut happens to land on it — this is the only reliable catch.
//
//   node radiofree/test/plates.cjs
//   RFH_URL=https://mbace1.github.io/Suds-Jack/radiofree/ node radiofree/test/plates.cjs
//
// Needs puppeteer (or puppeteer-core + CHROMIUM). Same convention as the
// sibling smoke gates.

'use strict';

const URL = process.env.RFH_URL || 'https://mbace1.github.io/Suds-Jack/radiofree/';

async function main() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    try {
      puppeteer = require('puppeteer-core');
    } catch {
      console.error('plates: need puppeteer or puppeteer-core');
      process.exit(2);
    }
  }

  const launchOpts = {
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  };
  if (process.env.CHROMIUM) launchOpts.executablePath = process.env.CHROMIUM;

  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      const t = msg.text();
      if (t.includes('[rfh plates]')) console.log(t);
    });
    page.on('pageerror', (err) => console.error('pageerror:', err.message));

    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('#tuneIn', { timeout: 15000 });
    await page.click('#tuneIn');
    await page.waitForFunction(() => window.__rfh && window.__rfh.debug && window.__rfh.debug.drawAllPlates, {
      timeout: 10000,
    });

    const report = await page.evaluate(() => window.__rfh.debug.drawAllPlates());
    if (!report.ok) {
      console.error('✗ plates FAIL');
      for (const f of report.failed) {
        console.error(`  ${f.key} d=${f.d}: ${f.error}`);
      }
      process.exit(1);
    }
    console.log(`✔ plates OK — ${report.count} keys × 2 decode states`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
