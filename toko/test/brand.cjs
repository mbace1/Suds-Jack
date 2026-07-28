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
  const G_MIN = 12;                    // the eye must stay this far open
  const geo = await page.evaluate(async () => {
    const f = await import('/toko/js/face.js');
    const G = f.GEO, b = f.bounds(), e = G.eye;
    // The eye is an upside-down U with NOTHING inside it, so the number that
    // matters is the clear opening between its two legs. Fatten the stroke far
    // enough and that closes, and the arch renders as a solid blob.
    const opening = (e.outer.r - G.stroke / 2) * 2;
    return {
      opening,
      // CLOSED is the default and the logo: nothing between the legs.
      closedIsDefault: f.arcs().length === 8,
      // OPEN adds the pupil — one more stroke an eye, and no more than that
      openAddsPupil: f.arcs({ open: 1 }).length === 10,
      eyesClearMouth: (G.mouth.cy + G.mouth.outer.r * Math.sin(G.mouth.outer.a0 * Math.PI / 180)
        - G.stroke / 2) - (e.legs.y + G.stroke / 2),
      // a CROWN, not a ring: swept past 180° the arc curls under and closes the
      // eye into a circle — an eyeball stuck on the face
      sweep: e.outer.a1 - e.outer.a0,
      // and the legs are straight and PARALLEL, dropped from the crown's ends.
      // One arc cannot do both jobs: past 180° it curls, short of 180° the legs
      // never come down at all.
      legsDrop: e.legs.y - e.cy,

      symmetric: G.mouth.cx === 50,
      // The eyes and the mouth share an outer edge. In the master artwork the
      // pair of eyes is exactly as wide as the smile under it — off by a few
      // units either way and the face reads as a wobble rather than a decision.
      eyeEdge: e.dx + e.outer.r + G.stroke / 2,
      mouthEdge: G.mouth.outer.r + G.stroke / 2,
      bounds: b,
      arcCount: f.arcs().length,
    };
  });
  ok('the eye stays open', geo.opening > G_MIN, 'opening = ' + geo.opening.toFixed(2));
  ok('the logo eye is closed — nothing inside it', geo.closedIsDefault);
  ok('opening the eyes adds a pupil and nothing else', geo.openAddsPupil);
  ok('the mouth clears the eye legs', geo.eyesClearMouth > 1, geo.eyesClearMouth.toFixed(2));
  ok('the eye crown is a clean semicircle', geo.sweep === 180, geo.sweep + '°');
  ok('the legs actually drop', geo.legsDrop > 4, geo.legsDrop.toFixed(2));
  ok('the mark is symmetric', geo.symmetric);
  ok('the eyes are flush with the mouth', Math.abs(geo.eyeEdge - geo.mouthEdge) < 0.5,
    geo.eyeEdge.toFixed(2) + ' vs ' + geo.mouthEdge.toFixed(2));
  // 2 mouth arcs + per eye (1 crown + 2 legs) × 2
  ok('eight strokes closed: two mouth arcs, two crowns, four legs',
    geo.arcCount === 8, String(geo.arcCount));
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

  // ── the tempo ──────────────────────────────────────────────────────────
  // The house note is Comfortably Numb: heavy-lidded and unhurried. That is a
  // brand rule with numbers in it (BRAND.md §7), so it gets measured — left
  // untested, a "just a touch snappier" would walk it back one commit at a
  // time until Toko is blinking like a cursor.
  console.log('\nthe tempo');
  const tempo = await page.evaluate(async () => {
    const u = await import('/toko/js/util.js');
    const S = 2000, span = 8;
    let shut = 0, peak = 0, firstFull = -1, lastFull = -1;
    for (let i = 0; i < S; i++) {
      const t = i / S * span;
      const v = u.blink(t, { every: span, offset: 0, longEvery: 0 });
      peak = Math.max(peak, v);
      if (v > 0.999) { shut++; if (firstFull < 0) firstFull = t; lastFull = t; }
    }
    // where does it start closing, and where has it finished opening?
    let open0 = -1, open1 = -1;
    for (let i = 0; i < S; i++) {
      const t = i / S * span;
      const v = u.blink(t, { every: span, offset: 0, longEvery: 0 });
      if (open0 < 0 && v > 0.001) open0 = t;
      if (v > 0.001) open1 = t;
    }
    return {
      peak,
      dwell: lastFull - firstFull,
      closing: firstFull - open0,
      opening: open1 - lastFull,
      drift: Math.abs(u.drift(0)) < 0.001 && Math.abs(u.drift(2.25) - 1) < 0.01,
      // the glance: mostly shut, opening slower than it closes again
      glanceRests: u.glance(9.5, { every: 11 }) === 0,
      glanceOpens: u.glance(1.2, { every: 11 }) === 1,
    };
  });
  ok('the eyes actually close', tempo.peak > 0.999, tempo.peak.toFixed(3));
  ok('the lid dwells shut', tempo.dwell > 0.08, tempo.dwell.toFixed(3) + 's');
  ok('it opens slower than it closes', tempo.opening > tempo.closing * 1.5,
    `close ${tempo.closing.toFixed(2)}s / open ${tempo.opening.toFixed(2)}s`);
  ok('the drift is a slow breath', tempo.drift);
  ok('the eyes rest shut', tempo.glanceRests);
  ok('and do open', tempo.glanceOpens);

  ok('the chat types unhurriedly',
    await page.evaluate(async () => {
      const r = await fetch('/toko/js/chat.js').then(x => x.text());
      const m = r.match(/speed\s*=\s*(\d+)/);
      return m && +m[1] >= 30;
    }));

  // ── the counter ────────────────────────────────────────────────────────
  // The failure this guards against: the goodbye topic closes the panel from a
  // callback hung off the end of the typing animation, so SKIPPING the typing
  // used to leave the counter open forever.
  console.log('\nthe counter');
  ok('the bar is there and closed',
    await page.evaluate(() => {
      const b = document.querySelector('.toko-chat .tc-bar');
      return !!b && b.getAttribute('aria-expanded') === 'false';
    }));
  ok('the bar clears 44px',
    await page.evaluate(() => document.querySelector('.toko-chat .tc-bar').getBoundingClientRect().height >= 44));

  await page.click('.toko-chat .tc-bar');
  // Skip the greeting rather than sit through it. Waiting it out made this
  // gate depend on the WALL CLOCK: after midnight Toko opens with a different,
  // longer line and the wait expired. Clicking the log is the skip a player
  // has, and it is the same one at every hour.
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('.toko-chat .tc-log').click());
  // wait for the menu rather than a fixed sleep — a fixed sleep here would
  // pass or fail on how fast the machine happens to be
  await page.waitForSelector('.toko-chat .tc-menu button', { timeout: 4000 });
  const chat = await page.evaluate(() => ({
    open: document.querySelector('.toko-chat').classList.contains('is-open'),
    greeted: document.querySelector('.toko-chat .tc-log').textContent.trim().length > 10,
    topics: document.querySelectorAll('.toko-chat .tc-menu button').length,
    tall: document.querySelector('.toko-chat .tc-panel').getBoundingClientRect().height > 200,
    taps: [...document.querySelectorAll('.toko-chat .tc-menu button')]
      .map(b => Math.round(b.getBoundingClientRect().height)),
    // Goodbye must survive the nine-slot cap. With the tree this size the
    // body alone can fill the menu, and a counter you cannot walk out of is
    // a trap with a caret in it.
    goodbye: [...document.querySelectorAll('.toko-chat .tc-menu button')]
      .some(b => /GO MAKE SOMETHING/.test(b.textContent)),
  }));
  ok('it opens', chat.open);
  ok('it grows into a panel', chat.tall);
  ok('Toko says something first', chat.greeted);
  ok('the topic menu is populated', chat.topics >= 4, String(chat.topics));
  ok('every topic clears 44px', chat.taps.every(h => h >= 44), chat.taps.join(' '));
  ok('you can always leave', chat.goodbye);

  // pressing 1 asks the first topic; asking WHO ARE YOU unlocks two more
  const before = chat.topics;
  await page.keyboard.press('1');
  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');            // skip the typing
  await page.waitForSelector('.toko-chat .tc-menu button', { timeout: 4000 });
  const after = await page.evaluate(() => ({
    topics: document.querySelectorAll('.toko-chat .tc-menu button').length,
    asked: document.querySelectorAll('.toko-chat .tc-log .tc-you').length,
    answered: document.querySelectorAll('.toko-chat .tc-log .tc-me').length,
    menuBack: !document.querySelector('.toko-chat .tc-menu').hidden,
  }));
  ok('a number key asks a topic', after.asked === 1, String(after.asked));
  ok('enter skips the typing and the menu returns', after.menuBack);
  ok('Toko answered', after.answered >= 2, String(after.answered));
  ok('the tree opened up', after.topics > before - 1, `${before} → ${after.topics}`);

  // The recommendation. The board is NOT the arcade, so there is no catalogue
  // here — which is the case worth testing: it has to say so rather than throw.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.toko-chat .tc-menu button')]
      .find(x => /SHOULD I PLAY/.test(x.textContent));
    if (b) b.click();
  });
  await page.waitForTimeout(120);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.toko-chat .tc-menu button', { timeout: 4000 });
  await page.waitForTimeout(200);
  ok('with no catalogue he says so instead of throwing',
    await page.evaluate(() => /CANNOT SEE THE FLOOR/.test(
      document.querySelector('.toko-chat .tc-log').textContent)));

  // ── he asks you back ───────────────────────────────────────────────────
  // The one topic that runs the other way: the menu becomes YOUR mouth for a
  // turn. What this guards is that it hands the menu back afterwards — a
  // conversation that gets stuck in answer mode is a dead end with a caret.
  await page.evaluate(() => globalThis.__tokoChat.say('me'));
  await page.waitForTimeout(120);
  await page.evaluate(() => document.querySelector('.toko-chat .tc-log').click());
  await page.waitForSelector('.toko-chat .tc-menu.is-yours button', { timeout: 4000 });
  ok('Toko can ask YOU something',
    await page.evaluate(() => globalThis.__tokoChat.asking()));
  await page.keyboard.press('1');
  await page.waitForTimeout(120);
  await page.evaluate(() => document.querySelector('.toko-chat .tc-log').click());
  await page.waitForTimeout(200);
  ok('answering him hands the menu back',
    await page.evaluate(() => !globalThis.__tokoChat.asking()
      && !document.querySelector('.toko-chat .tc-menu').classList.contains('is-yours')
      && document.querySelectorAll('.toko-chat .tc-menu button').length > 0));

  // ── the sticker ────────────────────────────────────────────────────────
  // He hands you a real file that is not a file: the badge, emitted from the
  // same arcs the canvas strokes, as an SVG data URI built on the spot.
  await page.evaluate(() => globalThis.__tokoChat.say('gift'));
  await page.waitForTimeout(120);
  await page.evaluate(() => document.querySelector('.toko-chat .tc-log').click());
  await page.waitForSelector('.toko-chat .tc-gift', { timeout: 4000 });
  const gift = await page.evaluate(() => {
    const a = document.querySelector('.toko-chat .tc-gift');
    return {
      download: a.download,
      svg: decodeURIComponent(a.href.replace(/^data:image\/svg\+xml;charset=utf-8,/, '')),
      tall: a.getBoundingClientRect().height >= 44,
    };
  });
  ok('he hands you a sticker', /\.svg$/.test(gift.download), gift.download);
  ok('the sticker is the mark, not an asset',
    /<svg/.test(gift.svg) && /<circle/.test(gift.svg) && /#F0027F/i.test(gift.svg));
  ok('the sticker link clears 44px', gift.tall);

  // ── the hour, and the menu it gates ────────────────────────────────────
  const clock = await page.evaluate(async () => {
    const d = await import('/toko/js/dialogue.js');
    const ids = h => d.menu(new Set(d.TOPICS.map(t => t.id)), new Set(), { hour: h })
      .map(t => t.id);
    return {
      night: ids(2).includes('late'),
      noon: ids(13).includes('late'),
      lateGreeting: d.greeting({ visits: 1, hour: 2 }).join(' '),
      dayGreeting: d.greeting({ visits: 1, hour: 13 }).join(' '),
      remembers: d.greeting({ visits: 4, hour: 13, last: 'mask' }).join(' '),
      // the back room is not opened by any one topic — you have to have dug
      shallow: ids(13).includes('back'),
      deep: d.menu(new Set(d.TOPICS.map(t => t.id)),
        new Set(d.TOPICS.slice(0, 10).map(t => t.id)), { hour: 13 }).map(t => t.id).includes('back'),
    };
  });
  ok('one topic only exists at night', clock.night && !clock.noon);
  ok('and he greets you differently at 2am', clock.lateGreeting !== clock.dayGreeting);
  ok('he remembers the last thing you asked', /MASK/.test(clock.remembers), clock.remembers);
  ok('the back room stays shut until you have dug', !clock.shallow && clock.deep);

  // fresh branches sort to the top, because the menu only shows nine and a
  // branch pushed off the bottom of the list that opened it is a dead branch
  ok('what he just opened comes first',
    await page.evaluate(async () => {
      const d = await import('/toko/js/dialogue.js');
      const ids = d.menu(new Set(d.TOPICS.map(t => t.id)), new Set(),
        { hour: 13, fresh: new Set(['clusters']) }).map(t => t.id);
      return ids[0] === 'clusters';
    }));

  // the tick: off until asked for, and remembered
  const snd = await page.evaluate(() => {
    const b = document.querySelector('.toko-chat .tc-snd');
    const before = b.textContent;
    b.click();
    return { before, after: b.textContent, pressed: b.getAttribute('aria-pressed'),
             stored: JSON.parse(localStorage.getItem('tokoCounter') || '{}').tick };
  });
  ok('the typing tick is off by default', /OFF/.test(snd.before), snd.before);
  ok('and can be switched on', /ON/.test(snd.after) && snd.pressed === 'true');
  ok('and is remembered', snd.stored === true);
  await page.evaluate(() => document.querySelector('.toko-chat .tc-snd').click());

  // the goodbye topic must close the counter even when its typing is skipped
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.toko-chat .tc-menu button')]
      .find(x => /GO MAKE SOMETHING/.test(x.textContent));
    b.click();
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => document.querySelector('.toko-chat .tc-log').click());
  await page.waitForTimeout(1200);
  ok('goodbye closes the counter even when skipped',
    await page.evaluate(() => !document.querySelector('.toko-chat').classList.contains('is-open')));

  await page.keyboard.press('Escape');
  ok('board still clean after the counter', page.__errs.length === 0, page.__errs.join(' | '));

  // ── the counter on a phone ─────────────────────────────────────────────
  // The panel is capped and clips, and an AUTO grid row sizes to its content
  // and overflows that cap instead of letting the child scroll — which hid
  // the bottom four topics AND the way out on a 390px screen. Desktop could
  // not see it, because at 1100px the menu runs three columns and fits.
  {
    const ph = await browser.newPage({
      viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    });
    ph.__errs = [];
    ph.on('pageerror', e => ph.__errs.push('pageerror: ' + e.message));
    await ph.goto(base + '/toko/index.html', { waitUntil: 'networkidle' });
    await ph.click('.toko-chat .tc-bar');
    await ph.waitForTimeout(150);
    await ph.evaluate(() => document.querySelector('.toko-chat .tc-log').click());
    await ph.waitForSelector('.toko-chat .tc-menu button');
    await ph.waitForTimeout(200);
    const m = await ph.evaluate(() => {
      const menu = document.querySelector('.toko-chat .tc-menu');
      const panel = document.querySelector('.toko-chat .tc-panel');
      const btns = [...menu.querySelectorAll('button')];
      return {
        clipped: menu.getBoundingClientRect().bottom > panel.getBoundingClientRect().bottom + 1,
        short: btns.filter(b => b.getBoundingClientRect().height < 44).length,
        reachable: menu.scrollHeight <= menu.clientHeight + 1
          || getComputedStyle(menu).overflowY === 'auto',
        leave: btns.some(b => /MAKE SOMETHING/.test(b.textContent)),
        wide: document.documentElement.scrollWidth > 390,
      };
    });
    ok('phone: the menu is not clipped by the panel', !m.clipped);
    ok('phone: every topic still clears 44px', m.short === 0, String(m.short));
    ok('phone: anything below the fold of the menu can be scrolled to', m.reachable);
    ok('phone: the way out is on the menu', m.leave);
    ok('phone: nothing overflows sideways', !m.wide);
    ok('phone: no errors', ph.__errs.length === 0, ph.__errs.join(' | '));
    await ph.close();
  }

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
