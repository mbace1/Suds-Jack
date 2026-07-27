// Radio Free Helsinki — headless smoke test.
// Run from anywhere:  node radiofree/test/smoke.cjs
// Needs `playwright` resolvable (a global install is fine:
// NODE_PATH=/opt/node22/lib/node_modules) and its Chromium.
//
// Covers:
//  - loads with zero console/page errors, gate opens the broadcast
//  - the codec animates, and Toko's picture is not a still frame
//  - the reader types, and tapping the copy skips to the end
//  - DECODE grows the plain reading inline, names a technique, and re-folds
//  - every registered story renders, in both states, with complete copy
//  - every story's visual key is a real panel (a typo silently falls back)
//  - paging, channel tuning, keyboard, and the sound toggle
//  - 44px targets and WCAG AA on every text colour

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, req.url.split('?')[0]);
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) failures++;
}

// WCAG relative luminance / contrast, over an rgb() string
function lum(c) {
  const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/radiofree/index.html`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(URL, { waitUntil: 'networkidle' });

  // ── the gate ─────────────────────────────────────────────────────
  check('gate shown before anything plays', await page.locator('#gate .btn').isVisible());
  check('the fiction is declared up front',
    (await page.locator('#gate').textContent()).includes('Every bulletin is invented'));
  await page.locator('#tuneIn').click();
  await page.waitForTimeout(500);
  check('tuning in reveals the receiver', await page.locator('#codec canvas').isVisible());
  check('codec canvas is not announced to screen readers',
    await page.locator('#codec canvas').getAttribute('aria-hidden') === 'true');
  check('bulletin is a live region',
    await page.locator('#bulletin').getAttribute('aria-live') === 'polite');

  // ── the picture moves ────────────────────────────────────────────
  const frameHash = () => page.evaluate(() => {
    const c = document.querySelector('#codec canvas');
    return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.join(',').length
      + ':' + c.toDataURL().slice(-64);
  });
  const f1 = await frameHash();
  await page.waitForTimeout(260);
  const f2 = await frameHash();
  check('the codec is animating, not a still frame', f1 !== f2);

  // ── the reader ───────────────────────────────────────────────────
  const typed1 = (await page.locator('#bulletin').textContent()).length;
  await page.waitForTimeout(450);
  const typed2 = (await page.locator('#bulletin').textContent()).length;
  check('the bulletin types itself in', typed2 > typed1);
  await page.locator('#bulletin').click();
  await page.waitForTimeout(120);
  const typed3 = (await page.locator('#bulletin').textContent()).length;
  await page.waitForTimeout(220);
  check('tapping the copy skips to the end of the read',
    (await page.locator('#bulletin').textContent()).length === typed3);

  // ── decode ───────────────────────────────────────────────────────
  check('nothing is amber before decode', await page.locator('#bulletin .plain:visible').count() === 0);
  await page.locator('#decode').click();
  await page.waitForTimeout(200);
  check('decode grows plain readings inline', await page.locator('#bulletin .plain:visible').count() > 0);
  check('decode strikes the broadcast wording', await page.locator('#bulletin .spun.struck').count() > 0);
  check('decode box names a technique',
    (await page.locator('#technique').textContent()).trim().length > 3);
  check('decode box is shown', await page.locator('#decodeBox').isVisible());
  check('the button offers the way back', (await page.locator('#decode').textContent()).includes('Re-fold'));
  await page.locator('#decode').click();
  await page.waitForTimeout(200);
  check('re-folding hides the plain readings again',
    await page.locator('#bulletin .plain:visible').count() === 0);

  // ── paging and tuning ────────────────────────────────────────────
  const freq0 = await page.locator('#freq').textContent();
  const head0 = await page.locator('#head').textContent();
  await page.locator('#next').click();
  await page.waitForTimeout(150);
  check('NEXT pages to another bulletin', (await page.locator('#head').textContent()) !== head0);
  check('paging stays on the channel', (await page.locator('#freq').textContent()) === freq0);

  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(120);
  check('arrow keys page too', (await page.locator('.tag').textContent()).includes('03'));

  // past the end of a channel the dial sweeps on to the next one
  await page.locator('#next').click();
  await page.waitForTimeout(120);
  await page.locator('#next').click();
  await page.waitForTimeout(150);
  check('running off the end sweeps to the next channel',
    (await page.locator('#freq').textContent()) !== freq0);
  check('the new channel starts at its first bulletin',
    (await page.locator('.tag').textContent()).includes('01'));

  await page.locator('#chUp').click();
  await page.waitForTimeout(120);
  const call = await page.locator('#call').textContent();
  await page.locator('#chDown').click();
  await page.waitForTimeout(120);
  check('the dial goes both ways', (await page.locator('#call').textContent()) !== call);

  // ── sound ────────────────────────────────────────────────────────
  check('sound starts on', await page.locator('#sound').getAttribute('aria-pressed') === 'true');
  await page.locator('#sound').click();
  check('sound can be turned off', await page.locator('#sound').getAttribute('aria-pressed') === 'false');
  check('the mute is remembered', await page.evaluate(() => localStorage.getItem('rfhSound')) === '0');
  await page.locator('#sound').click();

  // ── every bulletin ───────────────────────────────────────────────
  const ids = await page.evaluate(() => __rfh.debug.stories());
  check('twelve bulletins on the wire', ids.length === 12);

  // a mistyped visual key silently falls back to the bar chart, so the wrong
  // picture ships next to the right words — check the keys against the panels
  const badVisuals = await page.evaluate(async () => {
    const [{ STORIES }, { PANEL_KEYS }] = await Promise.all([
      import('./js/stories.js?v=1'), import('./js/visuals.js?v=1'),
    ]);
    return STORIES.filter(s => !PANEL_KEYS.includes(s.visual)).map(s => `${s.id}:${s.visual}`);
  });
  check(`every story has a real panel${badVisuals.length ? ' — ' + badVisuals.join(', ') : ''}`,
    badVisuals.length === 0);

  const incomplete = [];
  for (const id of ids) {
    await page.evaluate(i => __rfh.debug.open(i), id);
    await page.waitForTimeout(90);
    await page.evaluate(() => __rfh.debug.finishRead());
    const copy = await page.evaluate(() => ({
      head: document.getElementById('head').textContent.trim(),
      body: document.getElementById('bulletin').textContent.trim(),
      tech: document.getElementById('technique').textContent.trim(),
      note: document.getElementById('note').textContent.trim(),
      tell: document.getElementById('tell').textContent.trim(),
    }));
    if (copy.head.length < 12 || copy.body.length < 120 || copy.tech.length < 4
        || copy.note.length < 60 || copy.tell.length < 20) incomplete.push(id);
    await page.evaluate(() => __rfh.debug.toggleDecode());
    await page.waitForTimeout(60);
    const plain = await page.locator('#bulletin .plain:visible').count();
    if (plain === 0) incomplete.push(`${id}:no-decode`);
    await page.evaluate(() => __rfh.debug.toggleDecode());
  }
  check(`every bulletin carries a full read and a decode${incomplete.length ? ' — ' + incomplete.join(', ') : ''}`,
    incomplete.length === 0);

  // ── targets and contrast ─────────────────────────────────────────
  await page.evaluate(() => __rfh.debug.toggleDecode());   // decode box visible for its colours
  await page.waitForTimeout(120);
  const small = await page.evaluate(() => {
    const bad = [];
    for (const b of document.querySelectorAll('button')) {
      const r = b.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.width < 44 || r.height < 44) bad.push(`${b.id || b.className}:${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return bad;
  });
  check(`every control is at least 44px${small.length ? ' — ' + small.join(', ') : ''}`, small.length === 0);

  const colours = await page.evaluate(() => {
    const sel = ['.logo', '.mast .date', '.dial .freq', '.dial .call', '.strip', '.strip .slug',
                 '.tag', '.head', '.bulletin', '.spun.struck', '.plain', '.technique',
                 '.note', '.tell', '.hint', '.fiction', '#next'];
    const out = [];
    // the effective background: collect every translucent layer up the tree and
    // composite them. Taking the first non-transparent colour instead reads
    // rgba(255,180,58,.05) as solid amber, which is how the decode box first
    // "failed" contrast by 4x.
    const bgOf = (el) => {
      const layers = [];
      for (let n = el; n; n = n.parentElement) {
        const p = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
        if (!p) continue;
        const a = p.length > 3 ? Number(p[3]) : 1;
        if (a === 0) continue;
        layers.push({ r: +p[0], g: +p[1], b: +p[2], a });
        if (a === 1) break;
      }
      layers.push({ r: 4, g: 7, b: 10, a: 1 });
      let out = layers[layers.length - 1];
      for (let i = layers.length - 2; i >= 0; i--) {
        const t = layers[i];
        out = {
          r: t.r * t.a + out.r * (1 - t.a),
          g: t.g * t.a + out.g * (1 - t.a),
          b: t.b * t.a + out.b * (1 - t.a),
          a: 1,
        };
      }
      return `rgb(${out.r}, ${out.g}, ${out.b})`;
    };
    for (const s of sel) {
      const el = document.querySelector(s);
      if (!el || !el.getBoundingClientRect().width) continue;
      const cs = getComputedStyle(el);
      out.push({ s, fg: cs.color, bg: bgOf(el), size: parseFloat(cs.fontSize), weight: cs.fontWeight });
    }
    return out;
  });
  const dim = [];
  for (const c of colours) {
    // AA: 4.5:1 normally, 3:1 for large text (>=18.66px bold or >=24px)
    const large = c.size >= 24 || (c.size >= 18.66 && Number(c.weight) >= 700);
    const need = large ? 3 : 4.5;
    const ratio = contrast(c.fg, c.bg);
    if (ratio < need) dim.push(`${c.s} ${ratio.toFixed(2)}:1 (needs ${need})`);
  }
  check(`every text colour clears WCAG AA${dim.length ? ' — ' + dim.join(', ') : ''}`, dim.length === 0);

  check('no console or page errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  await browser.close();
  server.close();
  console.log(`\n${failures ? failures + ' FAILURE(S)' : 'all checks passed'}`);
  process.exit(failures ? 1 : 0);
})();
