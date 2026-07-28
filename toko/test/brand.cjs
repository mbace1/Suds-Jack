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

  // Skip until he has actually finished. Every `after` hook — the note box,
  // the scoreboard, the sticker — hangs off the END of the typing, and one
  // click only skips the line in flight.
  const settle = async (pg = page) => {
    for (let i = 0; i < 10; i++) {
      await pg.waitForTimeout(90);
      await pg.evaluate(() => globalThis.__tokoChat.skip());
      await pg.waitForTimeout(90);
      if (!await pg.evaluate(() => globalThis.__tokoChat.busy())) break;
    }
    await pg.waitForTimeout(120);
  };

  // ── the parser ─────────────────────────────────────────────────────────
  // You can TYPE at him, which is the reason this thing is shaped like Police
  // Quest. Still not a language model — word overlap against a lookup — so
  // the thing worth guarding is that a MISS admits the miss instead of
  // confidently answering the wrong question.
  const typeAt = async (text) => {
    await page.fill('.toko-chat .tc-say-row input', text);
    await page.press('.toko-chat .tc-say-row input', 'Enter');
    await settle();
  };
  const logText = () => page.evaluate(() =>
    document.querySelector('.toko-chat .tc-log').textContent);

  await typeAt('why do you wear a mask');
  ok('typing at him reaches the right topic', /LOOK AT THE WORK/.test(await logText()));
  await typeAt('xyzzy plugh frobnicate');
  ok('and a miss says so rather than guessing',
    /DO NOT KNOW THAT ONE|SAY IT ANOTHER WAY|NOT A THING I HAVE|ON THE LIST/.test(await logText()));
  await typeAt('go make your own');
  ok('he answers the cry', /THERE IT IS/.test(await logText()));
  ok('the parser line clears 44px',
    await page.evaluate(() =>
      document.querySelector('.toko-chat .tc-say-row input').getBoundingClientRect().height >= 44));
  // the number keys must not fire while you are writing in a field, or
  // "3 CRASHES" picks topic three and throws the sentence away
  ok('number keys do not fire while you are typing',
    await page.evaluate(async () => {
      const i = document.querySelector('.toko-chat .tc-say-row input');
      i.focus(); i.value = '';
      const before = document.querySelectorAll('.toko-chat .tc-log .tc-you').length;
      i.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
      await new Promise(r => setTimeout(r, 60));
      return document.querySelectorAll('.toko-chat .tc-log .tc-you').length === before;
    }));
  await page.evaluate(() => document.querySelector('.toko-chat .tc-say-row input').blur());

  // ── what the cabinets left on this machine ─────────────────────────────
  await page.evaluate(() => {
    localStorage.setItem('hyperDaggerHi', '41.7');
    localStorage.setItem('dropCabalHi', '128400');
  });
  await page.evaluate(() => globalThis.__tokoChat.say('seen'));
  await settle();
  const scores = await page.evaluate(() =>
    [...document.querySelectorAll('.toko-chat .tc-score')].map(n => n.textContent));
  ok('he reads the scores the games left here', scores.length === 2, scores.join(' | '));
  ok('and reads them right', /41\.7s/.test(scores[0] || '') && /128,400/.test(scores[1] || ''),
    scores.join(' | '));

  // ── the note you leave him ─────────────────────────────────────────────
  // The counter's whole reason for existing. Two rules matter: saying nothing
  // must record NOTHING, and he must never claim a delivery that did not
  // happen — so each transport status gets its own line.
  await page.evaluate(() => {
    globalThis.__hub = globalThis.__hub || {};
    globalThis.__hub.feedback = { sent: [], status: 'sent', send(e) { this.sent.push(e); return this.status; } };
  });
  await page.evaluate(() => globalThis.__tokoChat.say('note'));
  await settle();
  await page.waitForSelector('.toko-chat .tc-note textarea', { timeout: 4000 });
  ok('the note box clears 44px on its send',
    await page.evaluate(() =>
      document.querySelector('.toko-chat .tc-note button').getBoundingClientRect().height >= 44));
  await page.click('.toko-chat .tc-note button');            // empty
  await settle();
  ok('saying nothing records nothing',
    await page.evaluate(() => globalThis.__hub.feedback.sent.length === 0
      && /WROTE NOTHING DOWN/.test(document.querySelector('.toko-chat .tc-log').textContent)));

  await page.evaluate(() => globalThis.__tokoChat.say('note'));
  await settle();
  await page.waitForSelector('.toko-chat .tc-note textarea', { timeout: 4000 });
  await page.fill('.toko-chat .tc-note textarea', 'the eyes look right now');
  await page.click('.toko-chat .tc-note button');
  await settle();
  const note = await page.evaluate(() => ({
    sent: globalThis.__hub.feedback.sent,
    said: document.querySelector('.toko-chat .tc-log').textContent,
    noted: JSON.parse(localStorage.getItem('tokoCounter') || '{}').noted,
  }));
  ok('a real note goes down the hub\'s own transport',
    note.sent.length === 1 && note.sent[0].note === 'the eyes look right now'
    && note.sent[0].game === 'toko-counter', JSON.stringify(note.sent));
  ok('and he says it landed', /IT LANDED/.test(note.said));
  ok('and remembers to mention it next time', note.noted === true);

  // an opaque no-cors POST is 'sent-blind', and he must NOT say it landed
  await page.evaluate(() => { globalThis.__hub.feedback.status = 'sent-blind'; });
  await page.evaluate(() => globalThis.__tokoChat.say('note'));
  await settle();
  await page.waitForSelector('.toko-chat .tc-note textarea', { timeout: 4000 });
  await page.fill('.toko-chat .tc-note textarea', 'second one');
  await page.click('.toko-chat .tc-note button');
  await settle();
  ok('a blind send is not reported as a landing',
    await page.evaluate(() => {
      const t = document.querySelector('.toko-chat .tc-log').textContent;
      return /CANNOT SEE THE OTHER END/.test(t) && !/IT LANDED[\s\S]*$/.test(t.split('SECOND ONE')[1] || '');
    }));

  // and with no hub at all it still writes it down rather than throwing
  await page.evaluate(() => { delete globalThis.__hub.feedback; });
  await page.evaluate(() => globalThis.__tokoChat.say('note'));
  await settle();
  await page.waitForSelector('.toko-chat .tc-note textarea', { timeout: 4000 });
  await page.fill('.toko-chat .tc-note textarea', 'third one');
  await page.click('.toko-chat .tc-note button');
  await settle();
  ok('with nowhere to send it he says exactly that',
    /WRITTEN DOWN ON YOUR MACHINE/.test(await logText()));

  // ── one cabinet at a time ──────────────────────────────────────────────
  // `askGames` is the his-question mechanic with the LIVE catalogue as the
  // options, so a cabinet added tomorrow is on the rack tonight — and one
  // with no line written for it yet falls back to its own tagline rather
  // than going missing.
  await page.evaluate(() => {
    globalThis.__hub = globalThis.__hub || {};
    globalThis.__hub.games = [
      { id: 'hyperdagger', title: 'Hyper Dagger', path: 'hyperdagger/', lineage: 'Devil Daggers × HYPERDEMON' },
      { id: 'newthing', title: 'New Thing', path: 'newthing/', tagline: 'a cabinet with no line written yet' },
    ];
  });
  await page.evaluate(() => globalThis.__tokoChat.say('about'));
  await settle();
  const rack = await page.evaluate(() =>
    [...document.querySelectorAll('.toko-chat .tc-menu.is-yours button')].map(b => b.textContent));
  ok('the rack is built from the live catalogue', rack.length === 2, rack.join(' | '));
  await page.keyboard.press('1');
  await settle();
  ok('picking one gets his line and a real link',
    await page.evaluate(() => {
      const t = document.querySelector('.toko-chat .tc-log').textContent;
      const a = [...document.querySelectorAll('.toko-chat .tc-go')].pop();
      return /SURVIVAL TIME IS THE ONLY SCORE/.test(t) && a.getAttribute('href') === 'hyperdagger/';
    }));
  ok('and the rack hands the menu back', await page.evaluate(() =>
    !globalThis.__tokoChat.asking()
    && document.querySelectorAll('.toko-chat .tc-menu button').length > 0));
  await page.evaluate(() => globalThis.__tokoChat.type('tell me about new thing'));
  await settle();
  ok('a cabinet with no line falls back to its tagline',
    /NO LINE WRITTEN YET/.test(await logText()));
  await page.evaluate(() => globalThis.__tokoChat.type('what about hyper dagger'));
  await settle();
  ok('a cabinet can be named straight at the parser',
    /SURVIVAL TIME IS THE ONLY SCORE/.test(await logText()));

  // The failure this guards: cabinets were matched on ANY title word over two
  // characters, so "SAY THE WHOLE THING" scored a hit on "The Game of Life"
  // through the word THE, and he answered about the wrong thing entirely with
  // total confidence — the one failure this parser is not allowed to have.
  await page.evaluate(() => {
    globalThis.__hub.games = [
      { id: 'gameoflife', title: 'The Game of Life', path: 'gameoflife/' },
      { id: 'hyperdagger', title: 'Hyper Dagger', path: 'hyperdagger/' },
    ];
  });
  await page.evaluate(() => globalThis.__tokoChat.type('say the whole thing'));
  await settle();
  ok('a stop word does not match a cabinet',
    /THE VERB FIRST[\s\S]*GO MAKE YOUR OWN/.test(await logText()));

  // Same failure one layer up, and it survived the stop-list fix: GAME is not
  // a stop word, so "WHAT MAKES A GOOD GAME?" was answered with the CABINET
  // The Game of Life. One ordinary title word is not a cabinet name — and
  // "ordinary" is asked of the corpus rather than hand-listed: a word Toko
  // already uses in a question of his own needs a second word to agree.
  await page.evaluate(() => globalThis.__tokoChat.type('what makes a good game'));
  await settle();
  ok('one common title word does not name a cabinet',
    /THE VERB\.?\s*$|RUN\. FIRE\./m.test(await logText())
    && !/▸ THE GAME OF LIFE[\s\S]*$/.test((await logText()).split('WHAT MAKES A GOOD GAME').pop()));
  // but a real name still gets there in one go
  await page.evaluate(() => globalThis.__tokoChat.type('the game of life'));
  await settle();
  ok('and a real cabinet name still does',
    /THE QUIET ONE|SENDING YOU|SIGNAL OFF|DO NOT SIGN/.test(await logText()));

  // The routing step, and the reason the counter can be the front door for
  // all of it: a note taken in front of a cabinet files under THAT GAME —
  // the same `game` field every other feedback surface here uses — and
  // carries what he was talking about when you wrote it. A note that says
  // "this is broken" is worth nothing without that.
  await page.evaluate(() => {
    globalThis.__hub.feedback = { sent: [], send(e) { this.sent.push(e); return 'sent'; } };
  });
  await page.evaluate(() => globalThis.__tokoChat.type('what about hyper dagger'));
  await settle();
  await page.click('.toko-chat .tc-tell');
  await page.waitForSelector('.toko-chat .tc-note textarea', { timeout: 4000 });
  await page.fill('.toko-chat .tc-note textarea', 'the serpent is unfair from behind');
  await page.click('.toko-chat .tc-note button');
  await settle();
  const filed = await page.evaluate(() => globalThis.__hub.feedback.sent[0]);
  ok('a note in front of a cabinet files under that cabinet',
    filed && filed.game === 'hyperdagger', JSON.stringify(filed));
  ok('and carries what he was talking about',
    filed && filed.topic === 'about:hyperdagger', String(filed && filed.topic));

  // ── reading your own notes back ────────────────────────────────────────
  // Feedback you cannot see again is a suggestion box with a lock on it.
  await page.evaluate(() => {
    globalThis.__hub.feedback = {
      archive: () => [{ ts: Date.parse('2026-07-20'), note: 'the eyes look right now' }],
      send: () => 'sent',
    };
  });
  await page.evaluate(() => globalThis.__tokoChat.say('mine'));
  await settle();
  ok('he reads your own notes back to you',
    await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.toko-chat .tc-score')].map(n => n.textContent);
      return rows.some(r => /2026-07-20/.test(r) && /eyes look right now/.test(r));
    }));
  await page.evaluate(() => { globalThis.__hub.feedback = { archive: () => [], send: () => 'sent' }; });
  await page.evaluate(() => globalThis.__tokoChat.say('mine'));
  await settle();
  ok('and says so when there are none', /THE BOX IS EMPTY/.test(await logText()));

  // ── and what changed because of it ─────────────────────────────────────
  // The other half of the note box: a suggestion box nobody answers stops
  // getting used. The log is hand-kept and never claims you asked — but it
  // does check whether you left a note about that cabinet, ONCE, because
  // said against every line it stops being an acknowledgement and becomes
  // flattery.
  await page.evaluate(() => {
    globalThis.__hub.feedback = {
      archive: () => [{ ts: Date.now(), game: 'hub', note: 'home button does nothing on my phone' }],
      send: () => 'sent',
    };
  });
  await page.evaluate(() => globalThis.__tokoChat.say('changed'));
  await settle();
  const chg = await page.evaluate(() => ({
    entries: document.querySelectorAll('.toko-chat .tc-score').length,
    yours: document.querySelectorAll('.toko-chat .tc-you-quiet').length,
    text: document.querySelector('.toko-chat .tc-log').textContent,
  }));
  ok('he reads out what actually changed', chg.entries >= 3, String(chg.entries));
  ok('and flags a game you noted about exactly once', chg.yours === 1, String(chg.yours));
  ok('the log never claims you asked for it',
    !/YOU ASKED FOR/i.test(chg.text) && !/BECAUSE YOU/i.test(chg.text));

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

  // ── three languages ────────────────────────────────────────────────────
  // The arcade is fi/en/ja, so the counter is. English is the source and a
  // pack overrides it by topic id; the two things worth guarding are that
  // NOTHING is left untranslated (a pack that half-lands reads worse than no
  // pack) and that a missing key falls back to English rather than blanking.
  const langs = await page.evaluate(async () => {
    const d = await import('/toko/js/dialogue.js');
    const out = {};
    for (const code of ['fi', 'ja']) {
      d.setLang(code);
      out[code] = {
        sameQ: d.TOPICS.filter(t => d.say(t).q === t.q).map(t => t.id),
        sameA: d.TOPICS.filter(t => d.say(t).a === t.a).map(t => t.id),
        greet: d.greeting({ visits: 1, hour: 13 }).join(' '),
        hint: d.u('HINT'),
        // his question's options come from the pack too
        opt: (() => {
          const me = d.TOPICS.find(t => t.id === 'me');
          return d.sayOption(me, 0).q !== me.asks[0].q;
        })(),
        // a key the pack does not define must fall back, not blank
        fallback: d.L('SCOREBOARD_MISSING_ON_PURPOSE') === undefined,
      };
    }
    d.setLang('en');
    out.en = { greet: d.greeting({ visits: 1, hour: 13 }).join(' '), hint: d.u('HINT') };
    return out;
  });
  for (const code of ['fi', 'ja']) {
    ok(`${code}: every topic is translated`,
      langs[code].sameQ.length === 0 && langs[code].sameA.length === 0,
      'q: ' + langs[code].sameQ.join(',') + ' a: ' + langs[code].sameA.join(','));
    ok(`${code}: the greeting and the chrome follow`,
      langs[code].greet !== langs.en.greet && langs[code].hint !== langs.en.hint);
    ok(`${code}: his own question's options follow`, langs[code].opt);
  }
  // The parser has to actually work in the language it claims to. Two things
  // went wrong here and both were silent:
  //   · the tokeniser matched /[A-Z']+/, which has no Ä or Ö in it, so
  //     "TIEDÄ" became "TIED" and every Finnish key with an umlaut was
  //     unmatchable — while the fragments left behind collided with unrelated
  //     topics and answered them confidently.
  //   · a KEYS entry with a space in it can never match a whitespace
  //     tokeniser, so it is dead weight that reads like coverage.
  const fi = await page.evaluate(async () => {
    const d = await import('/toko/js/dialogue.js');
    const { FI } = await import('/toko/js/dialogue.fi.js');
    d.setLang('fi');
    const hit = q => (d.find(q) || {}).id || null;
    const out = {
      multiword: Object.entries(FI.KEYS)
        .flatMap(([id, ws]) => ws.filter(w => /\s/.test(w)).map(w => id + ':' + w)),
      umlaut: hit('käytätkö tekoälyä'),
      mask: hit('miksi naamio'),
      mantra: hit('mikä tekee hyvän pelin'),
      // ordinary Finnish function words must NOT be enough to score a match
      noise: hit('en tiedä mitään'),
      noise2: hit('se on minun'),
    };
    d.setLang('en');
    return out;
  });
  ok('fi: no key has a space in it', fi.multiword.length === 0, fi.multiword.join(', '));
  ok('fi: umlauts survive the tokeniser', fi.umlaut === 'ai', String(fi.umlaut));
  ok('fi: it reaches the right topic', fi.mask === 'mask' && fi.mantra === 'mantra',
    `${fi.mask} / ${fi.mantra}`);
  ok('fi: function words alone do not score a match',
    fi.noise === null && fi.noise2 === null, `${fi.noise} / ${fi.noise2}`);

  // Every cabinet he has a line for must have it in ALL THREE, or a Finnish
  // player gets an English paragraph in the middle of a Finnish answer. A
  // cabinet with NO line anywhere is fine — that falls back to its tagline
  // by design — but a half-translated one is not.
  const notes = await page.evaluate(async () => {
    const d = await import('/toko/js/dialogue.js');
    const seen = {};
    for (const code of ['en', 'fi', 'ja']) { d.setLang(code); seen[code] = Object.keys(d.L('GAME_NOTES')); }
    d.setLang('en');
    return {
      missing: seen.en.filter(id => !seen.fi.includes(id) || !seen.ja.includes(id)),
      extra: [...seen.fi, ...seen.ja].filter(id => !seen.en.includes(id)),
      count: seen.en.length,
    };
  });
  ok('every cabinet line exists in all three languages',
    notes.missing.length === 0, notes.missing.join(', '));
  ok('and no pack invents a cabinet English does not have',
    notes.extra.length === 0, notes.extra.join(', '));

  // Japanese does not space its words, so the whitespace tokeniser sees one
  // long run and matches nothing. That pack sets `substring: true` and the
  // parser asks a different question — does this key APPEAR in what you
  // typed. The risk flips with it: a blunt matcher will happily answer
  // ANYTHING, so what is guarded here is that it still SAYS NO.
  const ja = await page.evaluate(async () => {
    const d = await import('/toko/js/dialogue.js');
    d.setLang('ja');
    const hit = q => (d.find(q) || {}).id || null;
    const out = {
      mask: hit('なぜ仮面をつけてるんだ'),
      mantra: hit('良いゲームとは何だ'),
      note: hit('言いたいことがある'),
      steal: hit('コードをもらってもいいか'),
      // unrelated Japanese, and a single character, must both come back empty
      weather: hit('今日はいい天気だ'),
      one: hit('あ'),
      empty: hit(''),
    };
    d.setLang('en');
    return out;
  });
  ok('ja: the parser reaches the right topic',
    ja.mask === 'mask' && ja.mantra === 'mantra' && ja.note === 'note' && ja.steal === 'steal',
    `${ja.mask} ${ja.mantra} ${ja.note} ${ja.steal}`);
  ok('ja: and still says no to what it does not know',
    ja.weather === null && ja.one === null && ja.empty === null,
    `${ja.weather} / ${ja.one} / ${ja.empty}`);

  // and the switch actually reaches the live counter, driven the way the hub
  // drives it — by putting the code on <html lang>
  // Compared before/against/after rather than matched against particular
  // Finnish words: by this point in the run most `once` topics are spent, so
  // WHICH topics are on the menu is not knowable from here — only that they
  // are no longer the same words.
  const menuText = () => page.evaluate(() =>
    [...document.querySelectorAll('.toko-chat .tc-menu button')].map(b => b.textContent).join('|'));
  // the goodbye test just closed it, and a closed counter deliberately does
  // NOT repaint on a language change — there is nothing on screen to repaint
  await page.evaluate(() => globalThis.__tokoChat.open());
  await page.waitForTimeout(250);
  const beforeLang = await menuText();
  await page.evaluate(() => { document.documentElement.lang = 'fi'; });
  await page.waitForTimeout(250);
  const afterLang = await menuText();
  ok('changing <html lang> repaints the menu',
    afterLang !== beforeLang && afterLang.length > 0, afterLang.slice(0, 60));
  ok('and the transcript is NOT rewritten under you',
    await page.evaluate(() =>
      /WHO ARE YOU\?|SO YOU ARE A HYPOCRITE/.test(
        document.querySelector('.toko-chat .tc-log').textContent)));
  await page.evaluate(() => { document.documentElement.lang = 'en'; });
  await page.waitForTimeout(200);

  // ── the deep link ──────────────────────────────────────────────────────
  // `#toko` opens the counter, so a link can point at the conversation and
  // not just the page it sits on.
  {
    const dl = await newPage();
    await dl.goto(base + '/toko/index.html#toko', { waitUntil: 'networkidle' });
    await dl.waitForTimeout(500);
    ok('#toko opens the counter',
      await dl.evaluate(() => document.querySelector('.toko-chat').classList.contains('is-open')));
    ok('and nothing errored on the way in', dl.__errs.length === 0, dl.__errs.join(' | '));
    await dl.close();
  }

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
