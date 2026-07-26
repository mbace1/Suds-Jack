// The arcade hub — headless smoke test.
//   node test/hub-smoke.cjs
// Needs the `playwright` package resolvable (a global install is fine:
// NODE_PATH=<global node_modules>) and a Playwright-managed Chromium.
//
// Covers:
//  - the page loads with zero console/page errors
//  - one cabinet per catalogue entry, each with a Play link and a Feedback button
//  - every Play link that this branch can see actually resolves (200)
//  - every marquee is painted, not a blank canvas
//  - feedback: an empty note records nothing; a real one reaches the endpoint,
//    an unreachable endpoint queues it, and the queue drains on the next visit
//  - the panel closes on Escape and on the backdrop, and gives focus back
//  - WCAG AA on every text colour, 44px on every control

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/plain',
};

// stand-ins for the form endpoint: /collect takes the note, /collect-broken
// always fails, so the outbox path can be exercised too
const collected = [];
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/collect' || url === '/collect-broken') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const ok = url === '/collect';
      if (ok) { try { collected.push(JSON.parse(body)); } catch { /* ignore */ } }
      res.writeHead(ok ? 200 : 500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      });
      res.end('{}');
    });
    return;
  }
  let p = path.join(ROOT, url === '/' ? 'index.html' : url);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
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

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

  // the 500 from /collect-broken is this test's own doing — the browser logs a
  // failed request as a console error, and that one is the point of the stub
  const errors = [];
  const ours = t => /collect-broken/.test(t);
  page.on('console', m => { if (m.type() === 'error' && !ours(m.text() + m.location().url)) errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });

  // ── the floor ──
  const catalogue = await page.evaluate(() => __hub.games);
  const active = await page.evaluate(() => __hub.active);
  const archived = await page.evaluate(() => __hub.archived);
  const sketches = await page.evaluate(() => __hub.sketches);
  // the page renders the live floor first, then the archive — so that, not the
  // catalogue order, is the order the cabinets appear in
  const games = [...active, ...archived];
  check('the catalogue is not empty', games.length >= 8);
  check('every entry declares a status',
    catalogue.every(g => ['active', 'archived'].includes(g.status)));
  check('active and archived account for the whole catalogue', games.length === catalogue.length);
  check('one cabinet per game', await page.locator('.cab').count() === games.length);
  check('the live floor holds only what is being worked on',
    await page.locator('#cabinets .cab').count() === active.length && active.length > 0);
  check('the archive holds the rest', await page.locator('#archived .cab').count() === archived.length);
  check('the archive is still playable, not hidden — bar anything not up',
    await page.locator('#archived .btn.play').count()
      === archived.filter(g => g.live !== false).length);
  check('the archive names itself',
    (await page.locator('#archive-block .count').textContent()).toLowerCase().includes('archived'));
  // the archive holds things that were set down as well as things that were
  // finished, and not all of them are still up — the heading must not promise
  // a Play button that the not-up state deliberately removed
  const archiveHead = await page.locator('#archive-block .count').textContent();
  check('and does not promise every archived cabinet is playable',
    archived.every(g => g.live !== false) || !/still playable/i.test(archiveHead));
  // a cabinet can say where it stands without losing its Play button
  const noted = games.filter(g => g.note && g.live !== false);
  check('a playable cabinet can still carry a state note',
    await page.locator('.cab .note').count() === noted.length);
  check('every cabinet that has something behind it offers Play',
    await page.locator('.cab .btn.play').count() === games.filter(g => g.live !== false).length);
  check('every cabinet offers Feedback', await page.locator('.cab .btn.ghost').count() === games.length);
  check('the sketch shelf is there too', await page.locator('.shelf .sketch-link').count() === sketches.length);
  check('the page names itself', (await page.title()).includes('Suds Jack'));

  // every Play button points at its catalogue path, in the order rendered
  const hrefs = await page.locator('.cab .btn.play').evaluateAll(ns => ns.map(n => n.getAttribute('href')));
  check('Play opens the game it is under',
    hrefs.join() === games.filter(g => g.live !== false).map(g => g.path).join());

  // not every button has to work yet — but a button that cannot work must say
  // so rather than pointing at a 404
  const notUp = games.filter(g => g.live === false);
  check('a cabinet with nothing behind it has no Play link',
    await page.locator('.cab .btn.play').count() === games.length - notUp.length);
  check('it shows a dead button instead', await page.locator('.cab .btn.dead').count() === notUp.length);
  check('and that button cannot be pressed',
    await page.locator('.cab .btn.dead[disabled]').count() === notUp.length);
  check('its marquee is not a link either',
    await page.locator('.cab.dark a.marquee').count() === 0);
  check('but feedback on it is still open',
    await page.locator('.cab.dark .btn.ghost').count() === notUp.length);
  if (notUp.length) {
    check('and it says why it is not up',
      (await page.locator('.cab.dark .controls').first().textContent()).length > 8);
  }

  // and the ones this branch carries actually resolve — a hub whose buttons
  // 404 is worse than no hub. (Entries with inRepo:false live only on the
  // deployed site root; see README.)
  const local = [...games, ...sketches].filter(g => g.inRepo && g.live !== false);
  const dead = [];
  for (const g of local) {
    const r = await page.request.get(`${base}/${g.path}`);
    if (!r.ok()) dead.push(`${g.id} ${r.status()}`);
  }
  check(`every link this branch can see resolves${dead.length ? ` — ${dead}` : ''}`, dead.length === 0);
  check('the games only on the deployed site are marked as such',
    games.filter(g => !g.inRepo).every(g => !fs.existsSync(path.join(ROOT, g.path))));

  // a marquee that draws nothing is a black rectangle nobody notices
  const blank = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.cab .art').forEach((c, i) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const seen = new Set();
      for (let p = 0; p < d.length; p += 4) seen.add(`${d[p]},${d[p + 1]},${d[p + 2]}`);
      if (seen.size < 4) out.push(`${i}:${seen.size}`);
    });
    return out;
  });
  check(`every marquee is painted${blank.length ? ` — ${blank}` : ''}`, blank.length === 0);

  // ── feedback: the empty note ──
  await page.locator('.cab').first().locator('.btn.ghost').click();
  check('the panel opens on the game it was asked from',
    (await page.locator('.sheet h2').textContent()).includes(games[0].title));
  check('the rating offers five steps', await page.locator('.pip').count() === 5);
  await page.locator('.sheet .btn.play').click();      // Send, having said nothing
  check('an empty note closes without ceremony', await page.locator('.scrim').count() === 0);
  check('and nothing is recorded for it', (await page.evaluate(() => __hub.feedback.archive())).length === 0);

  // ── feedback: a real note, to a working endpoint ──
  await page.evaluate(u => __hub.feedback.setEndpoint(u), `${base}/collect`);
  await page.locator('.cab').nth(1).locator('.btn.ghost').click();
  await page.locator('.pip').nth(3).click();
  await page.locator('.fb-text').fill('the second wave is a wall');
  await page.locator('.sheet .btn.play').click();
  await page.waitForFunction(() => document.querySelector('.fb-said')?.textContent.includes('workshop'), null, { timeout: 5000 });
  check('a real note is thanked for', true);
  check('the note reached the endpoint', collected.length === 1);
  check('it carries the game, the rating and the words',
    collected[0].game === games[1].id && collected[0].rating === 4 &&
    collected[0].text.includes('wall') && collected[0].source === 'hub');
  check('and it is kept locally too', (await page.evaluate(() => __hub.feedback.archive())).length === 1);
  await page.locator('.sheet .btn.ghost').click();
  check('the panel closes when it is done', await page.locator('.scrim').count() === 0);

  // ── feedback: an endpoint that will not answer ──
  await page.evaluate(u => __hub.feedback.setEndpoint(u), `${base}/collect-broken`);
  await page.locator('.cab').nth(2).locator('.btn.ghost').click();
  await page.locator('.pip').nth(0).click();
  await page.locator('.fb-text').fill('held note');
  await page.locator('.sheet .btn.play').click();
  await page.waitForFunction(() => document.querySelector('.fb-said')?.textContent.includes('Held'), null, { timeout: 5000 });
  check('an undeliverable note is held, not lost', (await page.evaluate(() => __hub.feedback.outbox())).length === 1);
  check('and the player is told so, not thanked', true);
  await page.locator('.sheet .btn.ghost').click();

  // the outbox drains once something answers again
  await page.evaluate(u => __hub.feedback.setEndpoint(u), `${base}/collect`);
  const drained = await page.evaluate(() => __hub.feedback.flush());
  check('the outbox drains when the endpoint comes back', drained === 1);
  check('the held note arrives too', collected.length === 2 && collected[1].text === 'held note');
  check('and it leaves the outbox', (await page.evaluate(() => __hub.feedback.outbox())).length === 0);
  check('every note is still kept locally', (await page.evaluate(() => __hub.feedback.archive())).length === 2);

  // ── the panel behaves like a modal ──
  await page.locator('.cab').first().locator('.btn.ghost').click();
  await page.keyboard.press('Escape');
  check('Escape closes the panel', await page.locator('.scrim').count() === 0);
  await page.locator('.cab').first().locator('.btn.ghost').click();
  await page.mouse.click(20, 20);        // the dark outside it
  check('the backdrop closes the panel', await page.locator('.scrim').count() === 0);
  check('and the keyboard goes back where it was',
    await page.evaluate(() => document.activeElement?.textContent.includes('Feedback')));

  // ── the floor everything else in this repo holds ──
  await page.locator('.cab').first().locator('.btn.ghost').click();
  const a11y = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => (s.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);
    // A translucent wash — the hover highlight — is not a background: it lets
    // what is behind it through, and reading it as opaque white made a hovered
    // button look like grey-on-white and fail. Only near-opaque layers count.
    const bgOf = (el) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const b = getComputedStyle(n).backgroundColor;
        if (!b || /transparent/.test(b)) continue;
        const a = b.startsWith('rgba') ? parseFloat(b.split(',')[3]) : 1;
        if (a >= 0.5) return parse(b);
      }
      return [11, 11, 15];
    };
    const ratio = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    };
    const dim = [], small = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || el.classList.contains('sr-only')) continue;
      if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
        const r = ratio(parse(cs.color), bgOf(el));
        if (r < (large ? 3 : 4.5)) dim.push(`${el.className || el.tagName} "${el.textContent.trim().slice(0, 16)}" ${r.toFixed(2)}:1`);
      }
      if (el.matches('button, a, input, textarea')) {
        const b = el.getBoundingClientRect();
        if (b.width && (b.width < 44 || b.height < 44)) small.push(`${el.className || el.tagName} ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
    }
    return { dim, small };
  });
  check(`every text colour clears WCAG AA${a11y.dim.length ? ' — ' + a11y.dim.join(', ') : ''}`, a11y.dim.length === 0);
  check(`every control is a 44px target${a11y.small.length ? ' — ' + a11y.small.join(', ') : ''}`, a11y.small.length === 0);
  await page.keyboard.press('Escape');

  // a phone, held upright: the cabinets stack and nothing runs off the side
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(120);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(`nothing overflows a phone (${overflow}px)`, overflow <= 0);

  // ── the short URL ──
  // AnotherHUB/ is the same page one level down, kept identical apart from a
  // <base> so its relative links still resolve against the site root. Two
  // copies of a page drift; this fails loudly the moment they do.
  const rootHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const shortHtml = fs.readFileSync(path.join(ROOT, 'AnotherHUB', 'index.html'), 'utf8');
  check('the short URL carries a <base> to the site root', /<base href="\.\.\/"/.test(shortHtml));
  check('and is otherwise the same page (no drift)',
    shortHtml.replace(/ {2}<!-- the short URL[\s\S]*?<base href="\.\.\/" \/>\n/, '') === rootHtml);

  await page.goto(`${base}/AnotherHUB/`, { waitUntil: 'networkidle' });
  check('the short URL renders the same floor',
    await page.locator('#cabinets .cab').count() === active.length);
  const shortHrefs = await page.locator('.cab .btn.play').evaluateAll(ns => ns.map(n => n.href));
  check('and its Play links point back up at the games, not into itself',
    shortHrefs.every(h => !h.includes('/AnotherHUB/')));
  const deadShort = [];
  for (const g of local) {
    const r = await page.request.get(shortHrefs.find(h => h.endsWith(g.path)) ?? `${base}/${g.path}`);
    if (!r.ok()) deadShort.push(g.id);
  }
  check(`every link resolves from the short URL too${deadShort.length ? ` — ${deadShort}` : ''}`,
    deadShort.length === 0);

  check(`zero console/page errors overall${errors.length ? ` — ${errors[0]}` : ''}`, errors.length === 0);

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} FAILED` : '\nall hub checks passed');
  process.exit(failures ? 1 : 0);
})();
