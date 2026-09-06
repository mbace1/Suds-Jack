// TOKO MOVE ON A PHONE. Not a second smoke test — the checks here are the ones
// a desktop viewport cannot fail.
//
// It exists because v2.27 shipped a title screen whose START SHIFT button was
// off the bottom of an iPhone 13, on a veil that does not scroll. The button
// was present, visible and enabled; every gate passed; the game could not be
// started with a thumb. Nine releases of notes had been appended to that card
// and nobody had opened it at 390px.
//
//   node toko-move/test/phone.cjs [rootDir]
const { chromium, devices } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); } };

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 120)); });

  await page.goto(`${base}/toko-move/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__tm?.camera, null, { timeout: 30000 });
  const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  ok(`the phone viewport is narrow and short (${vp.w}x${vp.h})`, vp.w < 500 && vp.h < 800);

  // ── the bug that shipped: a control you cannot reach ──────────────────
  const startBox = await page.locator('#play').boundingBox();
  ok('START SHIFT is inside the viewport, not below it',
    !!startBox && startBox.y >= 0 && startBox.y + startBox.height <= vp.h,
    startBox ? `y ${Math.round(startBox.y)}..${Math.round(startBox.y + startBox.height)} of ${vp.h}` : 'no box');
  // and it must survive the card growing again: the body scrolls, the button does not
  const cardShape = await page.evaluate(() => {
    const c = document.querySelector('#title .card'), b = document.querySelector('#title .cardBody');
    return { col: getComputedStyle(c).flexDirection === 'column', capped: getComputedStyle(c).maxHeight !== 'none',
      bodyScrolls: !!b && /auto|scroll/.test(getComputedStyle(b).overflowY) };
  });
  ok('the title card is capped and scrolls its own text', cardShape.col && cardShape.capped && cardShape.bodyScrolls,
    JSON.stringify(cardShape));

  await page.tap('#play');
  await page.waitForTimeout(2200);
  ok('and tapping it starts the shift', await page.evaluate(() => window.__tm.flow.clock.tick > 0));

  // ── the map has to be full of map ─────────────────────────────────────
  // CITY fits the board by height and board.js grows the box sideways to fill
  // the canvas; on a phone `width:100%` forces that canvas landscape and the
  // grown half has no data in it. Measured as the share of the canvas width the
  // board box actually covers at the scale the game OPENS at.
  const cover = await page.evaluate(() => {
    const tm = window.__tm, c = document.getElementById('map');
    const l = tm.project(tm.board.n, tm.board.w).x, r = tm.project(tm.board.n, tm.board.e).x;
    return { scale: tm.camera.nearestScale(), share: (Math.min(r, c.width) - Math.max(l, 0)) / c.width };
  });
  ok(`it opens at a scale that fills the map (${cover.scale}, ${(cover.share * 100) | 0}% of the width)`, cover.share >= 0.85);

  // ── every control reachable and big enough ────────────────────────────
  const controls = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button, a[href], [role=button]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return;
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const on = cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight;
      // Off screen inside a scroller is a scroll away, not unreachable — the
      // job sheet legitimately holds more jobs than a phone shows at once.
      // Off screen with nothing to scroll is the bug this gate is here for.
      let scrollable = false;
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement)
        if (n.scrollHeight > n.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(n).overflowY)) { scrollable = true; break; }
      const top = on ? document.elementFromPoint(cx, cy) : null;
      out.push({ id: el.id || (el.className || '').toString().slice(0, 24), w: Math.round(r.width), h: Math.round(r.height),
        on: on || scrollable, covered: on && top ? !el.contains(top) && !top.contains(el) : false });
    });
    return out;
  });
  const small = controls.filter(c => c.w < 44 || c.h < 44);
  ok(`every control clears 44px${small.length ? ` — ${small.map(c => `${c.id} ${c.w}x${c.h}`)}` : ''}`, small.length === 0);
  const unreachable = controls.filter(c => !c.on || c.covered);
  ok(`and none is off screen or under something else${unreachable.length ? ` — ${unreachable.map(c => c.id)}` : ''}`, unreachable.length === 0);

  const of = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  ok('the page does not scroll sideways', of.sw <= of.iw, `${of.sw} > ${of.iw}`);

  // ── you must be able to COMPARE jobs, which means seeing more than one ──
  const offers = await page.evaluate(() => {
    const els = [...document.querySelectorAll('#sheet .jobOffer, #sheet .job')];
    return { total: els.length, visible: els.filter(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }).length };
  });
  ok(`more than one job is on screen at once (${offers.visible} of ${offers.total})`, offers.total < 2 || offers.visible >= 2);

  // ── the feed must not say the same thing twice ────────────────────────
  const feed = await page.evaluate(() => [...document.querySelectorAll('#feed div')].map(d => d.textContent));
  ok('the feed does not repeat itself back to back', feed.every((t, i) => i === 0 || t !== feed[i - 1]), feed.join(' | '));

  ok('no console or page errors on a phone', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log(`\n  phone: ${pass} passed, ${fail} failed  (${ROOT})`);
  await browser.close();
  server.close();
  process.exit(fail ? 1 : 0);
});
