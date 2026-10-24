const { chromium } = require('playwright');
const base = process.argv[2], out = process.argv[3];
const ok = (name, cond, info = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${info ? '  — ' + info : ''}`); if (!cond) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  // 1 · the hub's cabinet
  await p.goto(base + '/');
  await p.waitForTimeout(2500);
  const href = await p.evaluate(() => { const a = [...document.querySelectorAll('a')].find(x => /toko-drop-2\/?$/.test(x.getAttribute('href') || '')); return a ? a.getAttribute('href') : null; });
  ok('hub has a link to toko-drop-2/', !!href, href);
  const note = await p.evaluate(() => document.body.innerText.includes('INTRO button'));
  ok('hub shows the v16 note', note);
  // 2 · the cabinet's title, as the hub opens it
  await p.goto(new URL(href, base + '/').href);
  await p.waitForFunction(() => window.__toko?.ready, null, { timeout: 120000 });
  ok('label reads v16', (await p.textContent('#ver')).includes('v16'), await p.textContent('#ver'));
  const row = await p.evaluate(() => { const r = document.querySelector('#menu .row.start'); return r ? [...r.querySelectorAll('button')].map(x => { const q = x.getBoundingClientRect(); return { t: x.querySelector('.label').textContent, w: Math.round(q.width), h: Math.round(q.height) }; }) : null; });
  ok('first row is ARCADE + INTRO', !!row && row[0].t === 'ARCADE' && row[1].t === 'INTRO', JSON.stringify(row));
  ok('INTRO is at least 44 x 44', row && row[1].w >= 44 && row[1].h >= 44);
  await p.screenshot({ path: `${out}/menu-1280.png` });
  // 3 · INTRO plays the intro, then the run
  await p.click('#menu .row.start .item.narrow');
  await p.waitForTimeout(300);
  ok('INTRO starts the intro', (await p.evaluate(() => window.__toko.state)) === 'intro');
  await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/intro-logo.png` });
  const t0 = Date.now();
  await p.waitForFunction(() => window.__toko.state === 'play', null, { timeout: 60000 });
  const took = (Date.now() - t0 + 1800) / 1000;
  ok('the intro hands over to play on its own', true, `after ~${took.toFixed(1)} s`);
  const hud = await p.evaluate(() => ({ hidden: document.getElementById('hud').hidden, inl: document.getElementById('scorebox').style.transform, mode: document.getElementById('banner').textContent }));
  ok('HUD is up, and the intro left no inline styles', !hud.hidden && hud.inl === '', JSON.stringify(hud));
  await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/after-intro.png` });
  // 4 · ARCADE still goes straight in (back to the title is setup)
  await p.evaluate(() => window.__toko.toMenu());
  await p.click('#menu .row.start .item:not(.narrow)');
  await p.waitForTimeout(200);
  ok('ARCADE starts a run directly, no intro', (await p.evaluate(() => window.__toko.state)) === 'play');
  // 5 · a key skips the intro
  await p.evaluate(() => window.__toko.toMenu());
  await p.click('#menu .row.start .item.narrow');
  await p.waitForTimeout(1200);
  ok('intro running before the skip', (await p.evaluate(() => window.__toko.state)) === 'intro');
  await p.keyboard.press('KeyZ');
  await p.waitForTimeout(300);
  ok('a key skips straight to play', (await p.evaluate(() => window.__toko.state)) === 'play');
  // 6 · the title on a phone, both ways round
  for (const [w, h] of [[390, 844], [844, 390]]) {
    const q = await ctx.newPage(); await q.setViewportSize({ width: w, height: h });
    await q.goto(new URL(href, base + '/').href); await q.waitForFunction(() => window.__toko?.ready, null, { timeout: 120000 });
    const m = await q.evaluate(() => { const r = document.querySelector('#menu .row.start'); const bs = [...r.querySelectorAll('button')].map(x => x.getBoundingClientRect()); return { w: bs.map(x => Math.round(x.width)), h: bs.map(x => Math.round(x.height)), over: document.documentElement.scrollWidth > innerWidth }; });
    ok(`title at ${w}x${h}: both buttons 44px+, no sideways scroll`, m.w.every(v => v >= 44) && m.h.every(v => v >= 44) && !m.over, JSON.stringify(m));
    await q.screenshot({ path: `${out}/menu-${w}x${h}.png` }); await q.close();
  }
  const fault = await p.evaluate(() => document.getElementById('fault').textContent);
  ok('no fault box and no page errors', !fault && errs.filter(e => !/favicon|404/.test(e)).length === 0, (fault || '') + errs.join(' | '));
  await b.close();
})();
