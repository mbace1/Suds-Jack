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
//   · the face geometry is self-consistent: the eye's slots stay OPEN at the
//     shipping stroke weight (over-weighting it is the failure that actually
//     happened, and it silently turns the eyes into blobs)
//   · every mark puts ink down, and only ever in the two brand colours
//   · the SVG exporter emits well-formed SVG for the face and the badge
//   · the sting runs and removes itself, and skips on input
//   · the signature puts a 44px-clean badge on EVERY signed game, and the game
//     still boots clean with it attached
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
    lockups: document.querySelectorAll('#lockups canvas').length,
    masthead: document.querySelectorAll('#masthead canvas').length,
    sheet: document.querySelectorAll('#sheet canvas').length,
    duo: [...document.querySelectorAll('.duo > div')]
      .map(d => getComputedStyle(d).backgroundColor),
  }));
  ok('six mark cards rendered', counts.marks === 6, JSON.stringify(counts.marks));
  ok('five lockups rendered', counts.lockups === 5, String(counts.lockups));
  ok('masthead rendered', counts.masthead === 1);
  ok('the sticker sheet rendered', counts.sheet === 1);
  ok('the two colours are the two colours',
    counts.duo[0] === 'rgb(0, 0, 0)' && counts.duo[1] === 'rgb(240, 2, 127)',
    counts.duo.join(' / '));

  // ── the geometry ────────────────────────────────────────────────────────
  console.log('\nthe geometry');
  const geo = await page.evaluate(async () => {
    const f = await import('/toko/js/face.js');
    const G = f.GEO, b = f.bounds(), e = G.eye;
    // the slot: the gap between the stem and the arch's inner wall, measured
    // at the stem's lowest point. This is the number that goes to zero when
    // somebody fattens the stroke, and when it does the eye stops being an eye.
    const dy = e.stem.y1 - e.cy;
    const innerR = e.outer.r - G.stroke / 2;
    const wallX = Math.sqrt(Math.max(0, innerR * innerR - dy * dy));
    return {
      slot: wallX - G.stroke / 2,
      stemInsideCrown: (e.stem.y0 - G.stroke / 2) >= (e.cy - e.outer.r - G.stroke / 2) - 0.01,
      stemMergesCrown: (e.stem.y0 - G.stroke / 2) <= (e.cy - e.outer.r + G.stroke / 2) + 0.01,
      eyesClearMouth: (G.mouth.cy + G.mouth.outer.r * Math.sin(G.mouth.outer.a0 * Math.PI / 180)
        - G.stroke / 2) - (e.cy + e.outer.r * Math.sin(30 * Math.PI / 180) + G.stroke / 2),
      symmetric: G.mouth.cx === 50,
      bounds: b,
      arcCount: f.arcs().length,
    };
  });
  ok('the eye slots stay open', geo.slot > 1.5, 'slot = ' + geo.slot.toFixed(2));
  ok('the stem starts inside the crown', geo.stemInsideCrown && geo.stemMergesCrown);
  ok('the mouth clears the eye legs', geo.eyesClearMouth > 1, geo.eyesClearMouth.toFixed(2));
  ok('the mark is symmetric', geo.symmetric);
  ok('four arcs and two stems', geo.arcCount === 6, String(geo.arcCount));
  ok('the ink is wider than it is tall', geo.bounds.w > geo.bounds.h);

  // ── the ink ─────────────────────────────────────────────────────────────
  console.log('\nthe ink');
  const ink = await page.evaluate(async () => {
    const [{ TOKO }, f] = await Promise.all([
      import('/toko/js/palette.js'), import('/toko/js/face.js'),
    ]);
    const cv = document.createElement('canvas');
    cv.width = 400; cv.height = 300;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = TOKO.INK; ctx.fillRect(0, 0, 400, 300);
    f.drawFace(ctx, 20, 20, 360, { color: TOKO.MAGENTA });
    const d = ctx.getImageData(0, 0, 400, 300).data;
    let inked = 0, stray = 0;
    for (let i = 0; i < d.length; i += 4) {
      // antialiased edges blend the two, so only count pixels that are neither
      // endpoint nor a blend along the straight line between them
      const [r, g, bl] = [d[i], d[i + 1], d[i + 2]];
      if (r > 8 || g > 8 || bl > 8) inked++;
      const u = r / 240;
      if (u > 0.06 && (Math.abs(g - 2 * u) > 12 || Math.abs(bl - 127 * u) > 14)) stray++;
    }
    return { inked, stray };
  });
  ok('the face puts ink down', ink.inked > 4000, String(ink.inked));
  ok('no colour outside the two', ink.stray === 0, String(ink.stray));

  // ── SVG export ──────────────────────────────────────────────────────────
  console.log('\nthe svg exports');
  const svg = await page.evaluate(async () => {
    const f = await import('/toko/js/face.js');
    const parse = (str) => {
      const doc = new DOMParser().parseFromString(str, 'image/svg+xml');
      if (doc.querySelector('parsererror')) return -1;
      return doc.querySelectorAll('path').length;
    };
    const face = f.svgFace({});
    return {
      face: parse(face),
      badge: parse(f.svgBadge({})),
      // the canvas and the SVG must be emitting the SAME six subpaths
      matchesArcs: (face.match(/<path/g) || []).length === f.arcs().length,
      hasRoundCaps: /stroke-linecap="round"/.test(face),
      strokeMatches: face.includes(`stroke-width="${f.GEO.stroke}"`),
      favicon: f.faviconHref().startsWith('data:image/svg+xml,'),
    };
  });
  ok('face svg parses', svg.face > 0, String(svg.face));
  ok('badge svg parses', svg.badge > 0, String(svg.badge));
  ok('svg emits exactly the canvas arcs', svg.matchesArcs);
  ok('svg keeps the round caps', svg.hasRoundCaps);
  ok('svg keeps the shipping stroke weight', svg.strokeMatches);
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
      ok('the badge has ink', sig.inked > 100, String(sig.inked));
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
