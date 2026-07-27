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
// paths the server should answer with a stand-in game page (filled in from the
// catalogue once it has been read — see the on-screen button check)
const STUB = new Set();
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
  // A stand-in for a game that lives only on the deployed site. Half the
  // catalogue is not on this branch, so the only way to test the shell against
  // one of them is to serve a page the shape of one: a canvas, and the single
  // script tag that is the whole integration.
  if (STUB.has(url)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}canvas{width:100%;height:100%;display:block}</style>
</head><body><canvas></canvas>
<script type="module" src="../hub/shell.js?v=8"></script></body></html>`);
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

  // Two kinds of noise are not defects. The 500 from /collect-broken is this
  // test's own stub failing on purpose. And once this suite started opening
  // the game pages to check their home button, three.js started being fetched
  // from the jsDelivr CDN — which a sandboxed or offline runner cannot reach.
  // Anything served from this test's own origin still counts.
  const errors = [];
  const mine = url => !url || url.startsWith(base);
  const expected = (text, url) =>
    /collect-broken/.test(text + url) || (!mine(url) && /Failed to load resource/i.test(text));
  page.on('console', m => {
    if (m.type() === 'error' && !expected(m.text(), m.location().url)) errors.push(m.text());
  });
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

  // ── feedback: what the note is ABOUT ──
  // The kinds are ordered per project, and that ordering is the question each
  // project is asking — so it has to survive, not quietly fall back to a fixed
  // list the day someone renames an id.
  const taxo = await page.evaluate(async () => {
    const t = await import('./hub/topics.js?v=1');
    const bare = t.KINDS.map(k => k.id).join();
    const led = Object.fromEntries(__hub.games.map(g => [g.id, t.kindsFor(g.id).map(k => k.id)]));
    const gaps = [];
    for (const g of __hub.games) {
      for (const k of t.KINDS) if (!t.chipsFor(g.id, k.id).length) gaps.push(`${g.id}:${k.id}`);
    }
    return { bare, led, gaps, moved: Object.values(led).filter(o => o.join() !== bare).length };
  });
  check(`every project gets a full set of kinds`,
    Object.values(taxo.led).every(o => o.length === taxo.bare.split(',').length));
  check(`and most of them lead with their own question (${taxo.moved} of ${games.length})`,
    taxo.moved >= games.length - 1);
  check(`every project-and-kind pair offers a suggestion${taxo.gaps.length ? ` — ${taxo.gaps.slice(0, 3)}` : ''}`,
    taxo.gaps.length === 0);

  // ── feedback: a real note, to a working endpoint ──
  await page.evaluate(u => __hub.feedback.setEndpoint(u), `${base}/collect`);
  await page.locator('.cab').nth(1).locator('.btn.ghost').click();
  const kindLabels = await page.$$eval('.kind', bs => bs.map(b => b.textContent));
  const wanted = await page.evaluate(async id => {
    const t = await import('./hub/topics.js?v=1');
    return t.kindsFor(id).map(k => k.label);
  }, games[1].id);
  check(`the panel offers the kinds in this cabinet's order (${kindLabels[0]})`,
    kindLabels.join() === wanted.join());
  await page.locator('.kind').first().click();
  check('picking one brings up its suggestions', await page.locator('.chip').count() > 0);
  const chipText = await page.locator('.chip').first().textContent();
  await page.locator('.chip').first().click();
  // a suggestion is a starting point, not a vote: it must land in the box and
  // leave the sending to you
  check(`a suggestion fills the box rather than sending ("${chipText}")`,
    (await page.inputValue('.fb-text')) === chipText && collected.length === 0);
  await page.locator('.pip').nth(3).click();
  await page.locator('.fb-text').fill('the second wave is a wall');
  await page.locator('.sheet .btn.play').click();
  await page.waitForFunction(() => document.querySelector('.fb-said')?.textContent.includes('workshop'), null, { timeout: 5000 });
  check('a real note is thanked for', true);
  check('the note reached the endpoint', collected.length === 1);
  check('it carries the game, the rating and the words',
    collected[0].game === games[1].id && collected[0].rating === 4 &&
    collected[0].text.includes('wall') && collected[0].source === 'hub');
  check(`and what it is about, so it can be sorted (${collected[0].kind})`,
    collected[0].kind === (await page.evaluate(async id => {
      const t = await import('./hub/topics.js?v=1');
      return t.kindsFor(id)[0].id;
    }, games[1].id)));
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

  // The row grows with the screen, but the marquee is the thing worth looking
  // at, so each step up is only allowed where it still renders large. Both are
  // measured: the column count AND the width a marquee actually gets.
  const cols = () => page.evaluate(() =>
    getComputedStyle(document.getElementById('cabinets')).gridTemplateColumns.split(' ').length);
  const marqueeWidth = () => page.evaluate(() =>
    document.querySelector('.cab .art').getBoundingClientRect().width);
  const ladder = [
    [390, 1, 'a phone'], [800, 2, 'a tablet upright'],
    [1180, 3, 'a wide iPad'], [1600, 4, 'a large desktop'],
  ];
  const wrong = [], thumbs = [];
  for (const [w, want, what] of ladder) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(80);
    const got = await cols();
    if (got !== want) wrong.push(`${what} ${w}px: ${got} not ${want}`);
    const mw = await marqueeWidth();
    if (mw < 300) thumbs.push(`${what} ${Math.round(mw)}px`);
  }
  check(`the row grows 1-2-3-4 with the screen${wrong.length ? ` — ${wrong}` : ''}`, wrong.length === 0);
  check(`and no step shrinks the marquee to a thumbnail${thumbs.length ? ` — ${thumbs}` : ''}`,
    thumbs.length === 0);
  await page.setViewportSize({ width: 1100, height: 900 });

  // a phone, held upright: the cabinets stack and nothing runs off the side
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(120);
  check('and one cabinet wide on a phone', await cols() === 1);
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

  // ── the version each project is on ──
  const versions = JSON.parse(fs.readFileSync(path.join(ROOT, 'hub', 'versions.json'), 'utf8'));
  check('versions.json covers the projects this branch carries',
    games.filter(g => g.inRepo).every(g => versions[g.id]));
  check('every version came from a log or a real cache token',
    Object.values(versions).every(v => Number.isInteger(v.v) && v.v > 0
      && ['VERSIONS.md', 'cache token'].includes(v.from)));
  await page.reload({ waitUntil: 'networkidle' });
  // not every cabinet has a number — the first one is a game that lives only
  // on the deployed site — so wait for any of them to fill, not for the first
  await page.waitForFunction(
    () => [...document.querySelectorAll('.ver')].some(n => n.textContent), null, { timeout: 5000 });
  const shown = await page.locator('.cab .ver').evaluateAll(ns =>
    ns.map(n => [n.dataset.game, n.textContent]).filter(([, t]) => t));
  check(`the cabinets show a version (${shown.length} of ${games.length})`,
    shown.length === Object.keys(versions).length);
  check('and it is the number the generator found',
    shown.every(([id, text]) => text === `v${versions[id].v}`));
  check('a project with a VERSIONS.md reports its release number, not its token',
    versions.gameoflife.from === 'VERSIONS.md');

  // ── a controller ──
  // No real pad in a headless browser, so stand one in front of the Gamepad
  // API and drive it. This is the whole point of pad.js being one module: the
  // arcade and every game read the same fake.
  // Back to a desktop first: the phone check above left a one-column grid, and
  // "down crosses a row" means something different in one column.
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    window.__pad = { buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, id: 'stub' };
    navigator.getGamepads = () => [window.__pad];
    window.__hub.debug.padHint();
  });
  // A press that follows a link tears down the page mid-evaluate, which is the
  // press working — not a failure. Swallow that one error and let the
  // navigation assertion below be the judge.
  const tap = (i) => page.evaluate(async n => {
    window.__pad.buttons[n].pressed = true;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.__pad.buttons[n].pressed = false;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, i).catch(e => { if (!/context was destroyed|navigation/i.test(String(e))) throw e; });
  const push = (x, y) => page.evaluate(async ([dx, dy]) => {
    window.__pad.axes = [dx, dy, 0, 0];
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.__pad.axes = [0, 0, 0, 0];
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, [x, y]);

  check('a connected pad announces itself in the status line',
    await page.locator('#pad-hint').count() === 1);
  check('and takes the first cabinet', await page.evaluate(() => __hub.debug.selected()) === 0);
  await push(1, 0);
  check('right moves one cabinet along', await page.evaluate(() => __hub.debug.selected()) === 1);
  const liveCols = await cols();
  await push(0, 1);
  check(`down crosses a whole row of ${liveCols}, not one card`,
    await page.evaluate(() => __hub.debug.selected()) === 1 + liveCols);
  await push(-1, 0);
  check('left comes back', await page.evaluate(() => __hub.debug.selected()) === liveCols);
  check('the selection is real focus, so the keyboard agrees',
    await page.evaluate(() => document.activeElement.closest('.cab') === document.querySelectorAll('.cab')[__hub.debug.selected()]));
  check('and it is visible without a mouse',
    await page.locator('.cab.sel').count() === 1);

  // Y opens the note panel for whatever is selected, and the pad can work it
  await tap(3);
  check('Y leaves a note on the selected cabinet', await page.locator('.scrim').count() === 1);
  await push(1, 0);
  check('the d-pad sets the rating', await page.locator('.pip.lit').count() > 0);
  await tap(1);
  check('B closes the panel', await page.locator('.scrim').count() === 0);

  // A plays: the cabinet's own Play link, followed for real
  const want = await page.evaluate(() => document.querySelectorAll('.cab')[__hub.debug.selected()].querySelector('.btn.play').getAttribute('href'));
  await Promise.all([
    page.waitForURL(u => u.href.includes(want.replace(/\/$/, '')), { timeout: 8000 }).catch(() => {}),
    tap(0),
  ]);
  check(`A plays the selected cabinet (${want})`, page.url().includes(want.replace(/\/$/, '')));
  await page.goto(`${base}/index.html`, { waitUntil: 'networkidle' });

  // arrow keys do the same, for anyone who never picks up a pad
  await page.evaluate(() => __hub.debug.select(0));
  await page.keyboard.press('ArrowRight');
  check('the arrow keys move the same selection',
    await page.evaluate(() => __hub.debug.selected()) === 1);

  // ── the way back, on every game page ──
  const shelled = games.filter(g => g.inRepo && g.live !== false);
  const missing = [], badHref = [], small = [];
  for (const g of shelled) {
    await page.goto(`${base}/${g.path}`, { waitUntil: 'domcontentloaded' });
    const home = page.locator('.arcade-home');
    if (await home.count() !== 1) { missing.push(g.id); continue; }
    const href = await home.getAttribute('href');
    if (new URL(href).pathname !== '/') badHref.push(`${g.id}->${href}`);
    const box = await home.boundingBox();
    if (!box || box.height < 44) small.push(`${g.id} ${Math.round(box?.height ?? 0)}px`);
  }
  check(`every game carries the home button${missing.length ? ` — missing ${missing}` : ''}`, missing.length === 0);
  check(`and it points at the hub${badHref.length ? ` — ${badHref}` : ''}`, badHref.length === 0);
  check(`and it is a 44px target${small.length ? ` — ${small}` : ''}`, small.length === 0);

  // A tap, not a click. Several games preventDefault touchstart outside their
  // own UI so a stray thumb never nudges the ship — toko-drop does, and a
  // defaultPrevented touchstart means the browser never synthesises the click a
  // tap would produce. The button worked with a mouse and did nothing under a
  // thumb, which is exactly the shape of bug a headless click test misses.
  const touch = await browser.newContext({
    viewport: { width: 420, height: 780 }, hasTouch: true, isMobile: true,
  });
  const tp = await touch.newPage();
  await tp.goto(`${base}/${shelled[0].path}`, { waitUntil: 'domcontentloaded' });
  await tp.evaluate(() => {
    // Stand in for the game, faithfully: toko-drop swallows every touch that is
    // not in its own UI, in the CAPTURE phase and non-passive. That detail
    // matters — cancelling touchstart there also cancels the pointer stream, so
    // the element gets pointercancel and never pointerup. An earlier version of
    // this stub bubbled, which let a pointerup-only fix pass here and still fail
    // on the real page.
    addEventListener('touchstart', e => {
      if (!e.target.closest('#overlay')) e.preventDefault();
    }, { passive: false, capture: true });
  });
  await tp.waitForSelector('.arcade-home');
  const box = await tp.locator('.arcade-home').boundingBox();
  await tp.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await tp.waitForTimeout(700);
  check('a tap gets home even when the game swallows touches',
    new URL(tp.url()).pathname === '/' || tp.url().endsWith('/index.html'));
  await touch.close();

  // ── the on-screen button, for one-button games ──
  // Tiny 2D's entire control is a held press. With a mouse that is discoverable
  // the moment you click; under a thumb there is nothing to say the screen is
  // the button. The catalogue's `touch` entry puts one on screen — and it must
  // hold the SAME key the pad holds, so a thumb and a controller are one code
  // path rather than two.
  const oneBtn = catalogue.filter(g => g.touch?.key);
  check(`the catalogue declares an on-screen button somewhere (${oneBtn.map(g => g.id)})`,
    oneBtn.length > 0);
  for (const g of oneBtn) {
    STUB.add(`/${g.path}`);
    const tctx = await browser.newContext({
      viewport: { width: 420, height: 780 }, hasTouch: true, isMobile: true,
    });
    const gp = await tctx.newPage();
    await gp.goto(`${base}/${g.path}`, { waitUntil: 'domcontentloaded' });
    await gp.waitForSelector('.arcade-touch');
    // the game listens on window for its own keys; record what actually arrives
    await gp.evaluate(() => {
      window.__keys = [];
      addEventListener('keydown', e => window.__keys.push(`down:${e.code}`));
      addEventListener('keyup', e => window.__keys.push(`up:${e.code}`));
    });
    const btn = gp.locator('.arcade-touch');
    check(`${g.id}: the button is on screen under a thumb`, await btn.isVisible());
    const b = await btn.boundingBox();
    check(`${g.id}: and it is a thumb-sized target (${Math.round(b.width)}px)`, b.width >= 64 && b.height >= 64);
    check(`${g.id}: and it sits where a thumb already is`,
      b.x + b.width > 420 * 0.5 && b.y + b.height > 780 * 0.6);

    // a real touch hold, not a synthesised click: press, stay down, let go
    const cdp = await tctx.newCDPSession(gp);
    const pt = [{ x: b.x + b.width / 2, y: b.y + b.height / 2, radiusX: 12, radiusY: 12, force: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt });
    await gp.waitForTimeout(120);
    const during = await gp.evaluate(() => window.__keys.slice());
    check(`${g.id}: holding it holds ${g.touch.key} down`, during.join() === `down:${g.touch.key}`);
    check(`${g.id}: and the button reads as pressed`,
      await gp.locator('.arcade-touch.down').count() === 1);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await gp.waitForTimeout(120);
    const after = await gp.evaluate(() => window.__keys.slice());
    check(`${g.id}: letting go releases it, once`,
      after.join() === `down:${g.touch.key},up:${g.touch.key}`);
    await tctx.close();

    // and it stays out of the way of anyone with a mouse, who found the
    // control by clicking on their first attempt
    await page.goto(`${base}/${g.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.arcade-touch', { state: 'attached' });
    check(`${g.id}: and a mouse never sees it`,
      await page.locator('.arcade-touch').isVisible() === false);
  }

  // holding Start on a game page walks back to the arcade
  await page.goto(`${base}/${shelled[0].path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    window.__pad = { buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true, id: 'stub' };
    navigator.getGamepads = () => [window.__pad];
    window.__pad.buttons[9].pressed = true;
  });
  await page.waitForTimeout(220);
  const filled = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.arcade-home .fill')).width));
  check('holding Start starts filling the home button', filled > 0);
  await page.waitForFunction(() => location.pathname === '/' || location.pathname.endsWith('/index.html'), null, { timeout: 4000 });
  check('and holding it long enough goes back to the arcade', true);

  // ── the pad bridge, for games with no pad code of their own ──
  const bridged = catalogue.filter(g => g.pad && g.pad !== 'native' && g.inRepo);
  for (const g of bridged) {
    await page.goto(`${base}/${g.path}`, { waitUntil: 'domcontentloaded' });
    const wired = await page.evaluate(() => !!window.__arcadeShell?.bridged);
    check(`${g.id} gets a pad bridged onto it`, wired);
    check(`${g.id} is matched to its own catalogue entry`,
      await page.evaluate(() => window.__arcadeShell.game) === g.id);
  }
  // and a game that reads a pad itself is left completely alone
  const native = catalogue.find(g => g.pad === 'native' && g.inRepo);
  if (native) {
    await page.goto(`${base}/${native.path}`, { waitUntil: 'domcontentloaded' });
    check(`${native.id} reads its own pad, so nothing is layered on it`,
      await page.evaluate(() => window.__arcadeShell.bridged) === null);
  }

  // the key bridge actually produces the key the game listens for
  const cabal = catalogue.find(g => g.id === 'dropcabal');
  await page.goto(`${base}/${cabal.path}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    window.__seen = [];
    addEventListener('keydown', e => window.__seen.push('down:' + e.code), true);
    addEventListener('keyup', e => window.__seen.push('up:' + e.code), true);
    window.__pad = { buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0], connected: true };
    navigator.getGamepads = () => [window.__pad];
  });
  await page.evaluate(async () => {
    window.__pad.axes = [1, 0, 0, 0];                      // stick right
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.__pad.axes = [0, 0, 0, 0];                      // let go
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.__pad.buttons[0].pressed = true;                // A
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.__pad.buttons[0].pressed = false;
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  const seen = await page.evaluate(() => window.__seen);
  check(`the stick presses the game's own run key (${seen.filter(s => s.includes('KeyD')).length} events)`,
    seen.includes('down:KeyD'));
  check('and releases it when the stick comes back', seen.includes('up:KeyD'));
  check('A presses the roll key the game documents', seen.includes('down:Space'));
  // a face button is a key, so it must let go of it — Tiny 2D's whole game is
  // holding the press into the hill and releasing at the lip, which a button
  // that tapped and released a frame later could not play
  check('and lets go of it when the button comes up', seen.includes('up:Space'));
  const order = seen.filter(e => e.endsWith('Space'));
  check(`in that order, and once each (${order.join(' ')})`,
    order.join() === 'down:Space,up:Space');

  check(`zero console/page errors overall${errors.length ? ` — ${errors[0]}` : ''}`, errors.length === 0);

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} FAILED` : '\nall hub checks passed');
  process.exit(failures ? 1 : 0);
})();
