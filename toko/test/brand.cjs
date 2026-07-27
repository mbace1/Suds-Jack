// TOKO MIDORI — the headless gate.
//
//   node toko/test/brand.cjs            (add --shots to also write screenshots)
//
// Needs the `playwright` package resolvable (a global install is fine:
// NODE_PATH=<global node_modules>) and a Playwright-managed Chromium — same
// arrangement as gameoflife/test/smoke.cjs.
//
// Covers the things that have actually gone wrong, or would be silent if they
// did:
//   · the brand board loads with zero console / page errors
//   · every string-art grid is square and the right width (a short row silently
//     shears the mask)
//   · every mark actually puts pixels down, in the palette's own colours
//   · the SVG exporter emits well-formed SVG for mask / seal / wordmark
//   · the sting runs and removes itself, and skips on input
//   · the signature stamps a 44px-clean mark on EVERY signed game, and the
//     game still boots clean with it attached
//   · nothing on the board is frozen on its first screen

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SHOTS = process.argv.includes('--shots');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.md': 'text/plain', '.json': 'application/json', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

const SIGNED = ['toko-drop', 'paperboy', 'dropcabal', 'hyperdagger'];

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  → ' + detail : '')); }
};

function serve() {
  const s = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      res.writeHead(404); return res.end('no');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => s.listen(0, '127.0.0.1', () => r({ s, port: s.address().port })));
}

(async () => {
  const { s, port } = await serve();
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();

  const newPage = async () => {
    const p = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    p.__errs = [];
    p.on('console', m => { if (m.type() === 'error') p.__errs.push('console: ' + m.text()); });
    p.on('pageerror', e => p.__errs.push('pageerror: ' + e.message));
    return p;
  };

  // ── the board ──────────────────────────────────────────────────────────
  console.log('\nthe brand board');
  const page = await newPage();
  await page.goto(base + '/toko/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  ok('loads with no errors', page.__errs.length === 0, page.__errs.join(' | '));

  const counts = await page.evaluate(() => ({
    marks: document.querySelectorAll('#marks canvas').length,
    registers: document.querySelectorAll('#registers canvas').length,
    swatches: document.querySelectorAll('#swatches .sw').length,
    lockups: document.querySelectorAll('#lockups canvas').length,
    masthead: document.querySelectorAll('#masthead canvas').length,
  }));
  ok('six marks rendered', counts.marks === 6, JSON.stringify(counts));
  ok('four registers rendered', counts.registers === 4, String(counts.registers));
  ok('twelve swatches rendered', counts.swatches === 12, String(counts.swatches));
  ok('eight lockups rendered', counts.lockups === 8, String(counts.lockups));
  ok('masthead rendered', counts.masthead === 1);

  // ── the grids ──────────────────────────────────────────────────────────
  console.log('\nthe grids');
  const grids = await page.evaluate(async () => {
    const m = await import('/toko/js/mark.js');
    const bad = [];
    m.MASK24.forEach((r, i) => { if (r.length !== 24) bad.push(`MASK24[${i}] = ${r.length}`); });
    m.MASK16.forEach((r, i) => { if (r.length !== 16) bad.push(`MASK16[${i}] = ${r.length}`); });
    return { bad, h24: m.MASK24.length, h16: m.MASK16.length, seal: m.SEAL };
  });
  ok('every mask row is the right width', grids.bad.length === 0, grids.bad.join(', '));
  ok('the mask is square', grids.h24 === 24 && grids.h16 === 16, `${grids.h24}/${grids.h16}`);
  ok('the seal is 22', grids.seal === 22);

  // ── the marks put pixels down, in the brand's colours ──────────────────
  console.log('\nthe marks');
  const ink = await page.evaluate(async () => {
    const [{ TOKO }, m] = await Promise.all([
      import('/toko/js/palette.js'), import('/toko/js/mark.js'),
    ]);
    const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    const shoot = (w, h, draw) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      const g = {
        p: (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, ww | 0, hh | 0); },
        art: (rows, ax, ay, map, s) => {
          for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
            const col = map[rows[r][c]];
            if (col) g.p(ax + c * s, ay + r * s, s, s, col);
          }
        },
        text: () => 0, frame: () => {}, disc: () => {}, line: () => {}, ctx,
      };
      draw(g);
      const d = ctx.getImageData(0, 0, w, h).data;
      const seen = new Set();
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0) seen.add(hex(d[i], d[i + 1], d[i + 2]));
      return seen;
    };
    const { shade } = await import('/toko/js/pixel.js');
    const mask = shoot(24, 24, g => m.drawMask(g, 0, 0, { scale: 1 }));
    const seal = shoot(22, 22, g => m.drawSeal(g, 0, 0, { scale: 1 }));
    // the whole permitted ink list for the mask: four palette tokens, the
    // black of the slits, and ONE derived shade for the crack. Anything else
    // in there means a colour has been smuggled into the identity.
    const allowed = new Set([
      TOKO.MIDORI, TOKO.MIDORI_DEEP, TOKO.LUX, TOKO.VERMILION, TOKO.PITCH,
      shade(TOKO.MIDORI, 0.45),
    ]);
    return {
      maskGreen: mask.has(TOKO.MIDORI),
      maskShell: mask.has(TOKO.MIDORI_DEEP),
      maskLux: mask.has(TOKO.LUX),
      maskNick: mask.has(TOKO.VERMILION),
      strays: [...mask].filter(c => !allowed.has(c)),
      sealRed: seal.has(TOKO.VERMILION),
    };
  });
  ok('the mask is green', ink.maskGreen);
  ok('the mask has a shell', ink.maskShell);
  ok('the mask catches the crown light', ink.maskLux);
  ok('the mask carries the vermilion nick', ink.maskNick);
  ok('the mask uses no ink outside the identity', ink.strays.length === 0, ink.strays.join(', '));
  ok('the seal is red', ink.sealRed);

  // ── SVG export ─────────────────────────────────────────────────────────
  console.log('\nthe svg exports');
  const svg = await page.evaluate(async () => {
    const m = await import('/toko/js/mark.js');
    const out = {
      mask: m.svgMask({ px: 8 }),
      mask16: m.svgMask({ px: 8, small: true }),
      seal: m.svgSeal({ px: 8 }),
      word: m.svgWordmark({ px: 8 }),
      favicon: m.faviconHref(),
    };
    const parse = (s) => {
      const d = new DOMParser().parseFromString(s, 'image/svg+xml');
      return !d.querySelector('parsererror') && d.querySelectorAll('rect').length;
    };
    return {
      mask: parse(out.mask), mask16: parse(out.mask16),
      seal: parse(out.seal), word: parse(out.word),
      maskBox: /viewBox="0 0 192 192"/.test(out.mask),
      favicon: out.favicon.startsWith('data:image/svg+xml,'),
    };
  });
  ok('mask svg parses and has rects', svg.mask > 20, String(svg.mask));
  ok('mask svg is 24 grid cells at px 8', svg.maskBox);
  ok('16px mask svg parses', svg.mask16 > 8, String(svg.mask16));
  ok('seal svg parses', svg.seal > 4, String(svg.seal));
  ok('wordmark svg parses', svg.word > 20, String(svg.word));
  ok('favicon is a data uri', svg.favicon);

  // ── nothing frozen on its first screen ─────────────────────────────────
  console.log('\nmotion');
  const moved = await page.evaluate(async () => {
    const cv = document.querySelector('#lab canvas');
    const grab = () => cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.join();
    const a = grab();
    await new Promise(r => setTimeout(r, 420));
    return a !== grab();
  });
  ok('the lab is animating', moved);

  // ── the sting ──────────────────────────────────────────────────────────
  console.log('\nthe sting');
  await page.click('#b-sting');
  await page.waitForTimeout(500);
  ok('the sting is on screen', await page.evaluate(() => !!document.querySelector('div[role="img"] canvas')));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  ok('any key skips it and it removes itself',
    await page.evaluate(() => !document.querySelector('div[role="img"][style*="fixed"]')));
  ok('board still clean after the sting', page.__errs.length === 0, page.__errs.join(' | '));

  if (SHOTS) {
    fs.mkdirSync(path.join(ROOT, 'toko', 'test', 'shots'), { recursive: true });
    await page.screenshot({ path: path.join(ROOT, 'toko/test/shots/board.png'), fullPage: true });
  }
  await page.close();

  // ── every signed game ──────────────────────────────────────────────────
  for (const game of SIGNED) {
    console.log('\n' + game + ' (signed)');
    const p = await newPage();
    // three.js comes off a CDN; a sandbox with no egress must not fail the
    // signature check, so only errors that name our own files are fatal
    await p.goto(`${base}/${game}/index.html`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1400);

    const sig = await p.evaluate(() => {
      const el = document.querySelector('.toko-signature');
      if (!el) return null;
      const cv = el.querySelector('canvas');
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let inked = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) inked++;
      return {
        w: r.width, h: r.height, z: cs.zIndex, pe: cs.pointerEvents,
        art: cv.width + 'x' + cv.height, inked,
        offscreen: r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight,
      };
    });
    ok('the signature is attached', !!sig);
    if (sig) {
      ok('the seal has ink', sig.inked > 100, String(sig.inked));
      ok('it is at least 44px', Math.min(sig.w, sig.h) >= 44, `${sig.w}×${sig.h}`);
      ok('it sits under the HUD', sig.z === '4', sig.z);
      ok('it takes no input', sig.pe === 'none', sig.pe);
      ok('it is on screen', !sig.offscreen);
    }
    const mine = p.__errs.filter(e => /toko\//.test(e));
    ok('no errors from toko/', mine.length === 0, mine.join(' | '));
    if (SHOTS) await p.screenshot({ path: path.join(ROOT, `toko/test/shots/${game}.png`) });
    await p.close();
  }

  await browser.close();
  s.close();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
