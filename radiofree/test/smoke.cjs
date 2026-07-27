// Radio Free Helsinki — headless smoke test.
// Run from anywhere:  node radiofree/test/smoke.cjs
// Needs `playwright` resolvable (a global install is fine:
// NODE_PATH=/opt/node22/lib/node_modules) and its Chromium.
//
// Covers:
//  - loads with zero console/page errors, gate opens the broadcast
//  - the feed is vertical: one post per screen, snapping, media in portrait
//  - only the post you are on is live; its neighbours hold a painted frame
//  - the live codec animates, and Toko's picture is not a still frame
//  - the reader types, and tapping the copy skips to the end
//  - DECODE grows the plain reading inline, names a technique, and re-folds
//  - every registered story renders, in both states, with complete copy
//  - every story's visual key is a real panel (a typo silently falls back)
//  - scrolling, the NEXT rail button, keyboard, channel tuning, sound
//  - fi / en / ja: every string and every bulletin present in all three,
//    switching rewrites the feed in place and keeps your position
//  - the sign-off closes the feed and hands back the tells you decoded
//  - the address follows the scroll, and a #id link opens that bulletin
//  - the offline shell: the precache names every file, versions agree, and the
//    app really boots with the network cut
//  - 44px targets and WCAG AA on every text colour

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
};

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

  // the language is browser-detected and persisted, so pin it for determinism
  await page.addInitScript(() => localStorage.setItem('rfhLang', 'en'));
  await page.goto(URL, { waitUntil: 'networkidle' });

  // live-post shorthands: everything in the feed is per-post, so the selectors
  // have to follow whichever post the scroll is currently on
  const live = (sel) => page.locator(`.post.live ${sel}`);

  // ── the gate ─────────────────────────────────────────────────────
  check('gate shown before anything plays', await page.locator('#tuneIn').isVisible());
  check('the fiction is declared up front',
    (await page.locator('#gate').textContent()).includes('Every bulletin is invented'));
  await page.locator('#tuneIn').click();
  await page.waitForTimeout(500);
  check('tuning in reveals the receiver', await live('.media-slot canvas').isVisible());

  // ── the feed is vertical ─────────────────────────────────────────
  // The roster grows. Read its size once and derive every count and every
  // NN/NN tag from it — the hardcoded number went stale twice, and a gate that
  // has to be edited to add a bulletin is a gate people learn to edit.
  const N = await page.evaluate(() => __rfh.debug.stories().length);
  const tag = (n) => `${String(n).padStart(2, '0')}/${N}`;
  check('every bulletin is its own post',
    await page.locator('.post:not(.sign-off)').count() === N);
  check('the feed ends with a sign-off rather than just stopping',
    await page.locator('.post.sign-off').count() === 1);
  const geom = await page.evaluate(() => {
    const f = document.getElementById('feed');
    const p = document.querySelector('.post');
    const c = document.querySelector('.post .media-slot canvas');
    return {
      snap: getComputedStyle(f).scrollSnapType,
      align: getComputedStyle(p).scrollSnapAlign,
      postH: Math.round(p.getBoundingClientRect().height),
      viewH: window.innerHeight,
      cw: c.width, ch: c.height,
      rectW: c.getBoundingClientRect().width, rectH: c.getBoundingClientRect().height,
    };
  });
  check('the feed snaps vertically', geom.snap.startsWith('y') && geom.align === 'start');
  check('one post fills the screen', Math.abs(geom.postH - geom.viewH) <= 2);
  check('the media buffer is portrait', geom.ch > geom.cw);
  check('the media renders portrait on screen', geom.rectH > geom.rectW * 1.4);

  check('the scene canvas is not announced to screen readers',
    await live('.media-slot canvas').getAttribute('aria-hidden') === 'true');
  check('the bulletin is a live region',
    await live('.bulletin').getAttribute('aria-live') === 'polite');

  // ── the picture moves, and only where it should ──────────────────
  const hashOf = (n) => page.evaluate((i) => {
    const c = document.querySelectorAll('.post .media-slot canvas')[i];
    return c.toDataURL().slice(-96);
  }, n);
  const liveA = await hashOf(0), idleA = await hashOf(3);
  await page.waitForTimeout(300);
  const liveB = await hashOf(0), idleB = await hashOf(3);
  check('the live codec is animating, not a still frame', liveA !== liveB);
  check('posts you are not on hold their painted frame', idleA === idleB);
  check('an idle post still shows a picture (not an empty box)',
    await page.evaluate(() => {
      const c = document.querySelectorAll('.post .media-slot canvas')[3];
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let onPixels = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 90) onPixels++;
      return onPixels > 2000;
    }));

  // ── the reader ───────────────────────────────────────────────────
  const typed1 = (await live('.bulletin').textContent()).length;
  await page.waitForTimeout(420);
  const typed2 = (await live('.bulletin').textContent()).length;
  check('the bulletin types itself in', typed2 > typed1);
  check('a post you have not reached yet is on standby',
    await page.locator('.post').nth(4).locator('.standby').count() === 1);

  await live('.bulletin').click();
  await page.waitForTimeout(120);
  const typed3 = (await live('.bulletin').textContent()).length;
  await page.waitForTimeout(220);
  check('tapping the copy skips to the end of the read',
    (await live('.bulletin').textContent()).length === typed3);

  // ── decode ───────────────────────────────────────────────────────
  check('nothing is amber before decode', await live('.plain:visible').count() === 0);
  await live('.decode-btn').click();
  await page.waitForTimeout(220);
  check('decode grows plain readings inline', await live('.plain:visible').count() > 0);
  check('decode strikes the broadcast wording', await live('.spun.struck').count() > 0);
  check('decode box names a technique', (await live('.technique').textContent()).trim().length > 3);
  check('decode box is shown', await live('.decode-box').isVisible());
  check('the rail offers the way back', (await live('.decode-btn').textContent()).includes('RE-FOLD'));
  await live('.decode-btn').click();
  await page.waitForTimeout(220);
  check('re-folding hides the plain readings again', await live('.plain:visible').count() === 0);
  check('decode is per-post, not global',
    await page.locator('.post').nth(2).locator('.decode-box:visible').count() === 0);

  // ── the edit ─────────────────────────────────────────────────────
  // The package cuts between the story graphic, the Helsinki footage and the
  // wide of the booth. If the director ever wedges, the post silently becomes
  // the old static two-frame codec again — so watch it actually cut, and watch
  // DECODE bring it home to the graphic (the only shot that decodes).
  const seen = new Set();
  for (let i = 0; i < 34; i++) {
    seen.add(await page.evaluate(() => __rfh.state.shot));
    await page.waitForTimeout(260);
  }
  check(`the program frame cuts between shots (${[...seen].join('/')})`, seen.size >= 2);
  check('the edit cuts to the Helsinki footage', seen.has('broll'));
  check('the edit cuts to the wide of the booth', seen.has('wide'));

  await live('.decode-btn').click();
  await page.waitForTimeout(400);
  check('decoding holds the graphic — the shot that decodes',
    await page.evaluate(() => __rfh.state.shot) === 'graphic');
  await live('.decode-btn').click();
  await page.waitForTimeout(220);

  // ── moving through the feed ──────────────────────────────────────
  const head0 = await live('.head').textContent();
  await live('.next-btn').click();
  await page.waitForTimeout(700);
  check('the NEXT rail button goes to the next post',
    (await live('.head').textContent()) !== head0);

  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(700);
  check('arrow keys move the feed', (await live('.tag').textContent()).includes(tag(3)));

  // scrolling itself is the primary control — drive the container directly
  await page.evaluate(() => {
    const f = document.getElementById('feed');
    f.scrollTo({ top: f.clientHeight * 5, behavior: 'instant' });
  });
  await page.waitForTimeout(500);
  check('scrolling changes which post is live',
    (await live('.tag').textContent()).includes(tag(6)));
  check('exactly one post is live at a time', await page.locator('.post.live').count() === 1);

  // ── the dial ─────────────────────────────────────────────────────
  const freqBefore = await page.locator('#freq').textContent();
  await page.locator('#chUp').click();
  await page.waitForTimeout(800);
  const freqAfter = await page.locator('#freq').textContent();
  check('the dial jumps to another channel', freqAfter !== freqBefore);
  // the dial is a readout of where the scroll put you, not a separate state
  check('the masthead reports the live post’s channel', await page.evaluate(async () => {
    const { SECTORS } = await import('./js/stories.js?v=5');
    const want = SECTORS.find(s => s.id === __rfh.state.channel);
    return document.getElementById('freq').textContent === want.freq
      && document.getElementById('call').textContent === want.call;
  }));
  await page.locator('#chDown').click();
  await page.waitForTimeout(800);
  check('the dial goes both ways', (await page.locator('#freq').textContent()) !== freqAfter);

  // ── sound ────────────────────────────────────────────────────────
  check('sound starts on', await page.locator('#sound').getAttribute('aria-pressed') === 'true');
  await page.locator('#sound').click();
  check('sound can be turned off', await page.locator('#sound').getAttribute('aria-pressed') === 'false');
  check('the mute is remembered', await page.evaluate(() => localStorage.getItem('rfhSound')) === '0');
  await page.locator('#sound').click();

  // ── languages ────────────────────────────────────────────────────
  // A missing string is not an exception — t() returns the key, and a raw key
  // is still a non-empty string, so it would ship quietly. Check the blocks
  // agree instead of waiting to notice 'rail.decode' on a button.
  const langGaps = await page.evaluate(async () => {
    const [{ _STR, UI_KEYS, UI_LANGS }, { COPY, STORIES }] = await Promise.all([
      import('./js/i18n.js?v=5'), import('./js/stories.js?v=5'),
    ]);
    const gaps = [];
    for (const l of UI_LANGS) {
      for (const k of UI_KEYS) if (!_STR[l][k]) gaps.push(`ui ${l}:${k}`);
    }
    for (const l of UI_LANGS) {
      for (const st of STORIES) {
        const c = COPY[l] && COPY[l][st.id];
        if (!c) { gaps.push(`copy ${l}:${st.id}`); continue; }
        for (const f of ['slug', 'head', 'technique', 'decodeNote', 'tell']) {
          if (!c[f] || !String(c[f]).trim()) gaps.push(`copy ${l}:${st.id}.${f}`);
        }
        if (!Array.isArray(c.lines) || c.lines.length < 2) gaps.push(`copy ${l}:${st.id}.lines`);
        // a bulletin with nothing marked up has nothing to decode
        else if (!c.lines.some(x => /\{\{[^|}]+\|[^}]+\}\}/.test(x))) gaps.push(`copy ${l}:${st.id}.markup`);
      }
    }
    return gaps;
  });
  check(`fi/en/ja are complete${langGaps.length ? ' — ' + langGaps.slice(0, 6).join(', ') : ''}`,
    langGaps.length === 0);

  // switching language rewrites every word, so it rebuilds the feed — and must
  // put you back on the same post, with the same decode state
  await page.evaluate(() => __rfh.debug.open('seabed'));
  await page.evaluate(() => __rfh.debug.toggleDecode());
  await page.waitForTimeout(200);
  const enHead = await live('.head').textContent();
  await page.evaluate(() => __rfh.debug.setLang('fi'));
  await page.waitForTimeout(400);
  check('switching to Finnish rewrites the bulletin',
    (await live('.head').textContent()) !== enHead);
  check('Finnish really is Finnish',
    (await live('.head').textContent()).includes('Suomenlahdella'));
  check('the language switch keeps your place', await page.evaluate(() => __rfh.state.id) === 'seabed');
  check('the language switch keeps the decode open', await live('.decode-box').isVisible());
  check('the rail is translated', (await live('.decode-btn').textContent()).includes('TAITA'));
  check('html lang follows', await page.evaluate(() => document.documentElement.lang) === 'fi');

  await page.evaluate(() => __rfh.debug.setLang('ja'));
  await page.waitForTimeout(400);
  check('Japanese really is Japanese',
    /[\u3040-\u30ff\u4e00-\u9faf]/.test(await live('.head').textContent()));
  check('the standby line is translated too',
    (await page.locator('.post').nth(0).locator('.standby, .bulletin').first().textContent()).length > 0);
  await page.evaluate(() => __rfh.debug.setLang('en'));
  await page.evaluate(() => __rfh.debug.toggleDecode());
  await page.waitForTimeout(300);

  // ── every bulletin ───────────────────────────────────────────────
  const ids = await page.evaluate(() => __rfh.debug.stories());
  check('every bulletin on the wire is registered', ids.length === N);

  // A mistyped visual or broll key silently falls back to the bar chart / to
  // Esplanadi, so the wrong picture ships next to the right words — check both
  // key sets against what the modules actually export. The cache token is read
  // off the page rather than hardcoded, so this never drifts on a version bump
  // (and never loads a second copy of the module at a stale query string).
  const badKeys = await page.evaluate(async () => {
    const src = document.querySelector('script[type=module]').getAttribute('src');
    const v = (src.match(/\?v=\d+/) || [''])[0];
    const [{ STORIES }, { PANEL_KEYS }, { BROLL_KEYS }] = await Promise.all([
      import(`./js/stories.js${v}`), import(`./js/visuals.js${v}`), import(`./js/broll.js${v}`),
    ]);
    return {
      visual: STORIES.filter(s => !PANEL_KEYS.includes(s.visual)).map(s => `${s.id}:${s.visual}`),
      broll: STORIES.filter(s => !BROLL_KEYS.includes(s.broll)).map(s => `${s.id}:${s.broll}`),
    };
  });
  check(`every story has a real panel${badKeys.visual.length ? ' — ' + badKeys.visual.join(', ') : ''}`,
    badKeys.visual.length === 0);
  check(`every story has real footage${badKeys.broll.length ? ' — ' + badKeys.broll.join(', ') : ''}`,
    badKeys.broll.length === 0);

  const incomplete = [];
  for (const id of ids) {
    await page.evaluate(i => __rfh.debug.open(i), id);
    await page.waitForTimeout(90);
    await page.evaluate(() => __rfh.debug.finishRead());
    const copy = await page.evaluate(() => {
      const p = document.querySelector('.post.live');
      const g = s => (p.querySelector(s)?.textContent || '').trim();
      return { head: g('.head'), body: g('.bulletin'), tech: g('.technique'),
               note: g('.note'), tell: g('.tell') };
    });
    if (copy.head.length < 12 || copy.body.length < 120 || copy.tech.length < 4
        || copy.note.length < 60 || copy.tell.length < 20) incomplete.push(id);
    await page.evaluate(() => __rfh.debug.toggleDecode());
    await page.waitForTimeout(60);
    if (await live('.plain:visible').count() === 0) incomplete.push(`${id}:no-decode`);
    await page.evaluate(() => __rfh.debug.toggleDecode());
  }
  check(`every bulletin carries a full read and a decode${incomplete.length ? ' — ' + incomplete.join(', ') : ''}`,
    incomplete.length === 0);

  // ── the sign-off ─────────────────────────────────────────────────
  // The end of a feed that has spent twelve posts teaching you to catch a
  // technique should hand the techniques back, and say which ones YOU opened.
  await page.evaluate(() => __rfh.debug.forgetDecoded());
  await page.evaluate(() => __rfh.debug.open('kaiku-restructure'));
  await page.waitForTimeout(120);
  await page.evaluate(() => { __rfh.debug.finishRead(); __rfh.debug.toggleDecode(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const f = document.getElementById('feed');
    f.scrollTo({ top: f.scrollHeight, behavior: 'instant' });
  });
  await page.waitForTimeout(500);
  check('scrolling past the last bulletin reaches the sign-off',
    await page.evaluate(() => !!(__rfh.state && __rfh.state.signoff)));
  check('the sign-off lists every technique',
    await page.locator('.post.sign-off .tally-row').count() === N);
  check('it marks the one you decoded',
    await page.locator('.post.sign-off .tally-row.got').count() === 1);
  check('and prints that technique’s tell back at you',
    (await page.locator('.post.sign-off .tally-row.got .tally-tell').textContent()).length > 20);
  check('the count is shown', (await page.locator('.tally-head').textContent()).includes(`1/${N}`));
  check('the sign-off counts the roster, not a hardcoded twelve',
    (await page.locator('.post.sign-off .bulletin').textContent()).includes(`${N} stories`));
  check('the sign-off is not a bulletin — nothing to decode',
    await page.locator('.post.sign-off .decode-btn').count() === 0);
  check('the masthead drops the frequency when the station is off air',
    (await page.locator('#freq').textContent()).includes('--'));

  // it is the last screen anyone sees; it must not be a frozen one
  const soA = await page.evaluate(() => document.querySelector('.post.sign-off canvas').toDataURL().slice(-96));
  await page.waitForTimeout(300);
  const soB = await page.evaluate(() => document.querySelector('.post.sign-off canvas').toDataURL().slice(-96));
  check('the sign-off card is still moving', soA !== soB);

  check('the tally survives a language switch', await page.evaluate(async () => {
    const before = document.querySelector('.tally-note').textContent;
    __rfh.debug.setLang('ja');
    await new Promise(r => setTimeout(r, 300));
    const f = document.getElementById('feed');
    f.scrollTo({ top: f.scrollHeight, behavior: 'instant' });
    await new Promise(r => setTimeout(r, 400));
    const after = document.querySelector('.tally-note').textContent;
    const rows = document.querySelectorAll('.post.sign-off .tally-row.got').length;
    __rfh.debug.setLang('en');
    await new Promise(r => setTimeout(r, 300));
    return before !== after && rows === 1;
  }));
  await page.evaluate(() => __rfh.debug.open('kaiku-restructure'));
  await page.waitForTimeout(200);

  // ── the address is the bulletin ──────────────────────────────────
  await page.evaluate(() => __rfh.debug.open('synthetic-env'));
  await page.waitForTimeout(200);
  check('the address follows the scroll',
    await page.evaluate(() => location.hash) === '#synthetic-env');
  // replaceState must not walk a fake history: one back should leave, not
  // step through twelve bulletins
  const entries = await page.evaluate(() => history.length);
  await page.evaluate(() => __rfh.debug.open('round-b'));
  await page.waitForTimeout(150);
  check('paging does not push history entries',
    await page.evaluate(() => history.length) === entries);

  // a shared link opens on the bulletin it names
  const deep = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const deepErrors = [];
  deep.on('console', m => { if (m.type() === 'error') deepErrors.push(m.text()); });
  deep.on('pageerror', e => deepErrors.push(String(e)));
  await deep.addInitScript(() => localStorage.setItem('rfhLang', 'en'));
  await deep.goto(URL + '#seabed', { waitUntil: 'networkidle' });
  await deep.locator('#tuneIn').click();
  await deep.waitForTimeout(600);
  check('a #id link opens that bulletin',
    await deep.evaluate(() => __rfh.state.id) === 'seabed');
  check('the deep link is not merely scrolled to, it is live',
    (await deep.locator('.post.live .tag').textContent()).includes(tag(11)));
  check('a shared link boots clean', deepErrors.length === 0);
  await deep.close();

  // ── the offline shell ────────────────────────────────────────────
  // Static first: the worker names every file by hand (there is no build
  // step), which is exactly the kind of list that goes stale in silence.
  const swSrc = fs.readFileSync(path.join(ROOT, 'radiofree', 'sw.js'), 'utf8');
  const pageSrc = fs.readFileSync(path.join(ROOT, 'radiofree', 'index.html'), 'utf8');
  const jsFiles = fs.readdirSync(path.join(ROOT, 'radiofree', 'js')).filter(f => f.endsWith('.js'));
  const notCached = jsFiles.filter(f => !swSrc.includes(`'${f.replace(/\.js$/, '')}'`));
  check(`the precache names every module${notCached.length ? ' — ' + notCached.join(', ') : ''}`,
    notCached.length === 0);
  const pageV = (pageSrc.match(/main\.js\?v=(\d+)/) || [])[1];
  const swV = (swSrc.match(/const V = `\?v=(\d+)`/) || [])[1];
  const swVersion = (swSrc.match(/const VERSION = 'v(\d+)'/) || [])[1];
  check(`the worker caches the version the page asks for (page v${pageV}, sw v${swV}/${swVersion})`,
    pageV && pageV === swV && pageV === swVersion);

  // Then for real: register with ?sw=1, cut the network, and drive it.
  const off = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const offErrors = [];
  off.on('pageerror', e => offErrors.push(String(e)));
  await off.addInitScript(() => localStorage.setItem('rfhLang', 'en'));
  await off.goto(URL + '?sw=1', { waitUntil: 'networkidle' });
  await off.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 })
    .catch(() => {});
  await off.waitForTimeout(1200);                     // let the precache settle
  check('the worker takes control', await off.evaluate(() => !!navigator.serviceWorker.controller));

  await off.context().setOffline(true);
  await off.reload({ waitUntil: 'domcontentloaded' });
  await off.locator('#tuneIn').click();
  await off.waitForTimeout(900);
  check('the feed opens with the network cut',
    await off.locator('.post:not(.sign-off)').count() === N);
  check('a bulletin still reads offline',
    (await off.locator('.post.live .bulletin').textContent()).trim().length > 40);
  check('the picture still draws offline',
    await off.locator('.post.live .media-slot canvas').isVisible());
  check('nothing threw offline', offErrors.length === 0);
  await off.context().setOffline(false);
  await off.close();

  // ── targets and contrast ─────────────────────────────────────────
  await page.evaluate(() => __rfh.debug.toggleDecode());   // decode box visible for its colours
  await page.waitForTimeout(150);
  const small = await page.evaluate(() => {
    const bad = [];
    const scope = document.querySelector('.post.live').parentElement.parentElement;
    for (const b of scope.querySelectorAll('button')) {
      const r = b.getBoundingClientRect();
      if (r.width === 0) continue;
      if (r.width < 44 || r.height < 44) bad.push(`${b.className}:${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return bad;
  });
  check(`every control is at least 44px${small.length ? ' — ' + small.join(', ') : ''}`, small.length === 0);

  const colours = await page.evaluate(() => {
    const sel = ['.logo', '.dial .freq', '.dial .call', '.post.live .tag',
                 '.post.live .head', '.post.live .bulletin', '.post.live .spun.struck',
                 '.post.live .plain', '.post.live .technique', '.post.live .note',
                 '.post.live .tell', '.post.live .fiction', '.post.live .next-btn',
                 '.post .standby'];
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
      let out2 = layers[layers.length - 1];
      for (let i = layers.length - 2; i >= 0; i--) {
        const t = layers[i];
        out2 = {
          r: t.r * t.a + out2.r * (1 - t.a),
          g: t.g * t.a + out2.g * (1 - t.a),
          b: t.b * t.a + out2.b * (1 - t.a),
          a: 1,
        };
      }
      return `rgb(${out2.r}, ${out2.g}, ${out2.b})`;
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
