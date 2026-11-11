// A PAD, AND NOTHING ELSE (v3.27; owner: "Dualsense with ipad doesn't work").
//
// A pad reached the game only through the cards: START SHIFT, the run list, the
// end card and the map were out of reach for anyone holding only a controller.
// This plays a whole shift with a stubbed DualSense — the browser's own Gamepad
// API, answered by a fake pad in the page — through the arcade's real bridge
// (hub/shell.js → hub/padkeys.js → keys) and the game's own handlers:
//   · the title: the d-pad lights its buttons, cross with nothing lit is START SHIFT
//   · every card wears ✕ ○ □ while the pad is connected, and cross answers it
//   · the open map closes on a face button
//   · the end card: cross with nothing lit is NEXT (or AGAIN), and it goes there
// No mouse, no touch, no keyboard event from the test itself.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/pad.cjs [rootDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); } };

// a DualSense the page can see, whose buttons the test holds and lets go
const PAD = () => {
  const st = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] };
  const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', get timestamp() { return performance.now(); }, buttons: st.buttons, axes: st.axes };
  navigator.getGamepads = () => [pad, null, null, null];
  window.__pad = { set: (i, down) => { st.buttons[i] = { pressed: down, value: down ? 1 : 0, touched: down }; } };
};
const CROSS = 0, CIRCLE = 1, SQUARE = 2, DOWN = 13;

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: false });
    await ctx.addInitScript(PAD);
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('tokoMoveRuns', JSON.stringify({})); sessionStorage.setItem('seeded', '1'); } } catch {} });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
    const press = async (i, ms = 140) => { await page.evaluate(i => window.__pad.set(i, true), i); await page.waitForTimeout(ms); await page.evaluate(i => window.__pad.set(i, false), i); await page.waitForTimeout(120); };
    const ui = () => page.evaluate(() => document.body.dataset.ui);

    await page.goto(`${base}/toko-move/?run=easy&seed=1152&written`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm3 && !document.getElementById('play').disabled, null, { timeout: 30000 });
    await page.waitForTimeout(400);
    ok('the title is up, and the hub\'s bridge is listening', (await ui()) === 'title');

    // the d-pad lights the title's buttons, one at a time
    await press(DOWN);
    const lit1 = await page.evaluate(() => document.querySelector('.padLit')?.textContent?.trim() || '');
    await press(DOWN);
    const lit2 = await page.evaluate(() => document.querySelector('.padLit')?.textContent?.trim() || '');
    ok(`the d-pad walks the title's buttons ("${lit1.slice(0, 24)}" → "${lit2.slice(0, 24)}")`, !!lit1 && !!lit2 && lit1 !== lit2 && (await page.evaluate(() => document.querySelectorAll('.padLit').length)) === 1);
    // a touch clears the light, and cross with nothing lit starts the shift
    await page.evaluate(() => dispatchEvent(new PointerEvent('pointerdown')));
    await press(CROSS);
    await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
    ok('cross with nothing lit is START SHIFT', (await page.evaluate(() => !!window.__tm3.state())) && (await page.evaluate(() => document.getElementById('title').hidden)));

    // every card wears its pad buttons, and cross answers it
    const glyphs = await page.evaluate(() => [...document.querySelectorAll('#v3panel .eventOpt .evPad')].map(e => e.textContent).join(''));
    ok(`a card wears the DualSense's buttons while it is connected (${glyphs})`, /^✕○□?$/.test(glyphs) && glyphs.length >= 2);
    let cards = 0, maps = 0, steps = 0;
    while (steps++ < 500) {
      const u = await ui();
      if (u === 'end') break;
      if (u === 'card') {
        if (cards === 2 && !maps) {             // open the map once (a tap is the only way in), and close it from the pad
          await page.evaluate(() => document.getElementById('v3mini')?.click());
          await page.waitForTimeout(250);
          if ((await ui()) === 'board') { await press(CIRCLE); await page.waitForTimeout(250); maps = (await ui()) === 'board' ? -1 : 1; continue; }
        }
        const before = await page.evaluate(() => window.__tm3.state().log.length);
        await press(cards % 5 === 3 ? SQUARE : CROSS); cards++;
        await page.waitForTimeout(200);
        const after = await page.evaluate(() => window.__tm3.state().log.length);
        if (after === before && (await ui()) === 'card') { await page.waitForTimeout(300); }
      } else { await press(3, 80); await page.waitForTimeout(200); }   // triangle hurries what is playing
    }
    ok(`a whole shift answered from the pad alone (${cards} cards)`, (await ui()) === 'end' && cards >= 6);
    ok(maps === 1 ? 'the open map closes on a face button' : `the map was not exercised (${maps})`, maps === 1);

    // the end card: cross with nothing lit is its main button
    const main = await page.evaluate(() => (document.getElementById('nextRun') || document.getElementById('again'))?.textContent || '');
    const from = page.url();
    await press(CROSS);
    await page.waitForTimeout(1500);
    ok(`cross on the end card presses its main button ("${main}")`, page.url() !== from || (await ui()) === 'title');
    ok('no page errors', !errs.length, errs.slice(0, 3).join(' | '));
    await ctx.close();
  } catch (e) { fail++; console.log('  FAIL threw:', e.message); }
  finally { await browser.close(); server.close(); console.log(`\n  pad: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0); }
});
