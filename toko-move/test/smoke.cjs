// The page gate. Everything here needs a real browser: the drag gesture, the
// tap targets, the contrast of text as actually rendered, and whether anything
// is painted at all. It serves the repo itself so it has no outside dependency
// beyond playwright.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/smoke.cjs

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

let pass = 0; const fails = [];
const ok = (c, m) => { if (c) pass++; else fails.push(m); };
const eq = (a, b, m) => ok(a === b, `${m} — got ${a}, want ${b}`);

function serve() {
  return new Promise(res => {
    const s = http.createServer((req, rq) => {
      const rel = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        rq.writeHead(404); rq.end('no'); return;
      }
      rq.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(rq);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  .map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const cr = (a, b) => { const x = lum(a), y = lum(b); const [h, l] = x > y ? [x, y] : [y, x]; return (h + 0.05) / (l + 0.05); };
const hex = rgb => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(rgb);
  return m ? '#' + [1, 2, 3].map(i => (+m[i]).toString(16).padStart(2, '0')).join('') : null; };

// A text box is taller than the text in it — the score's box carries its
// leading above the digit — so a few pixels of overlap is grazing and reads
// fine, while fourteen is the button sitting on the number. 10px is the line
// between them, and it is where the desktop layout has always sat (8) without
// anyone minding.
//
// A FUNCTION because the first cut of this ran only on the desktop page, where
// the short-screen rules do not apply — so deleting the very rule that keeps
// the two apart on a landscape phone changed nothing and the check passed.
async function checkHomeClear(pg, where) {
  // …and it is checked against every CONTROL as well as the score, because the
  // score is not the only thing it can land on: with the strip wrapped, the
  // HOME anchor took the top-left corner of PAUSE, and a thumb there went home
  // instead of pausing. A control you cannot fully press is the v5 bug wearing
  // a different hat.
  const clash = await pg.evaluate(() => {
    const home = document.querySelector('a.arcade-home')?.getBoundingClientRect();
    if (!home) return null;
    const worst = [];
    for (const el of [document.querySelector('.score'), ...document.querySelectorAll('#tools .ctl')]) {
      if (!el) continue;
      const b = el.getBoundingClientRect();
      const x = Math.min(home.right, b.right) - Math.max(home.left, b.left);
      const y = Math.min(home.bottom, b.bottom) - Math.max(home.top, b.top);
      if (x > 0 && y > 0) worst.push({ what: el.id || el.className, y: Math.round(y) });
    }
    worst.sort((a, b) => b.y - a.y);
    return worst[0] ?? null;
  });
  ok(!clash || clash.y <= 10,
     `the way home does not sit on the score or a control (${where})`
     + `${clash ? ` — ${clash.y}px over ${clash.what}` : ''}`);
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/toko-move/index.html`;
  const browser = await chromium.launch();
  const errs = [];

  // ── desktop ───────────────────────────────────────────────────────────
  const page = await browser.newPage({ viewport: { width: 1200, height: 820 } });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(base + '#seed=7', { waitUntil: 'load' });
  await page.waitForTimeout(500);

  ok(await page.evaluate(() => !!window.__tm), 'the game exposes __tm for the gate to drive');
  ok(await page.evaluate(() => !document.getElementById('title').hidden), 'the title card is up first');
  eq(await page.evaluate(() => window.__tm.game.state), 'title', 'and the game has not started');

  // a closed veil must not be left over the board as invisible glass
  const veilTrap = await page.evaluate(() => ['upgrade', 'end']
    .map(id => getComputedStyle(document.getElementById(id)).display)
    .every(d => d === 'none'));
  ok(veilTrap, 'closed cards are display:none, not an invisible sheet over the board');

  // the title card IS the mission board now
  const board = await page.evaluate(() => ({
    campaign: [...document.querySelectorAll('#campaignList button')].map(b => b.querySelector('b')?.textContent),
    free: [...document.querySelectorAll('#freeList button')].map(b => b.querySelector('b')?.textContent),
    locked: [...document.querySelectorAll('#campaignList button')].filter(b => b.disabled).length,
  }));
  ok(board.campaign.length >= 1, `the mission board lists the campaign (${board.campaign.join(', ')})`);
  ok(board.free.includes('The City'), 'and free play keeps the endless city');
  // the spine: the first is always open, and anything after it is earned
  const lockState = await page.evaluate(() => [...document.querySelectorAll('#campaignList button')].map(b => b.disabled));
  eq(lockState[0], false, 'the first mission is not locked behind anything');
  ok(lockState.slice(1).every(Boolean), `and the ones after it are (${lockState.length - 1} locked)`);

  await page.evaluate(() => [...document.querySelectorAll('#freeList button')]
    .find(b => /The City/.test(b.textContent)).click());
  eq(await page.evaluate(() => window.__tm.game.state), 'play', 'choosing a mission starts it');
  eq(await page.evaluate(() => window.__tm.game.mission.id), 'endless', 'and starts the one you chose');
  ok(await page.evaluate(() => document.getElementById('title').hidden), 'and puts the board away');
  // the seed in the address must actually pin the board, or the number printed
  // on the end card is a receipt for a run nobody can return to
  eq(await page.evaluate(() => window.__tm.game.seed), 7, 'and a seed in the address pins the board');

  // ── the gesture ───────────────────────────────────────────────────────
  // Hold the world still for this. Run live, a stop can spawn beside the drag
  // path between reading the nub and grabbing it, and the pointer takes the new
  // stop instead — the gate failed about one run in three that way. The gesture
  // is what is under test, not the spawner.
  await page.evaluate(() => { window.__tm.game.paused = true; });

  const at = i => page.evaluate(k => {
    const s = window.__tm.world.stations[k];
    return s ? window.__tm.toClient(s.x, s.y) : null;
  }, i);

  const a = await at(0), b = await at(1), c = await at(2);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
  eq(await page.evaluate(() => window.__tm.net.lines.length), 1, 'a drag between two stops opens a line');
  eq(await page.evaluate(() => window.__tm.net.lines[0].stations.length), 2, 'with two stops on it');
  eq(await page.evaluate(() => window.__tm.net.lines[0].trains.length), 1, 'and a train on it');

  // extend from the nub at the live end
  // ask the game where its nub is; recomputing it here lets the test agree
  // with itself while disagreeing with what the player can actually grab
  const nubAt = () => page.evaluate(() => {
    const n = window.__tm.touch.nubs.find(x => !x.atHead);
    return n ? window.__tm.toClient(n.x, n.y) : null;
  });
  const nub = await nubAt();
  await page.mouse.move(nub.x, nub.y);
  await page.mouse.down();
  await page.mouse.move(c.x, c.y, { steps: 12 });
  await page.mouse.up();
  eq(await page.evaluate(() => window.__tm.net.lines[0].stations.length), 3, 'dragging the end nub carries the line onward');

  // and pulling it back takes the stop off again
  const nub2 = await nubAt();
  const back = await at(1);
  await page.mouse.move(nub2.x, nub2.y);
  await page.mouse.down();
  await page.mouse.move(back.x, back.y, { steps: 12 });
  await page.mouse.up();
  eq(await page.evaluate(() => window.__tm.net.lines[0].stations.length), 2, 'dragging it back pulls the stop off');

  // ── it is actually painted ────────────────────────────────────────────
  await page.evaluate(() => { window.__tm.game.paused = false; });
  await page.waitForTimeout(700);
  const painted = await page.evaluate(() => {
    const cv = document.getElementById('board');
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) seen.add(`${d[i]},${d[i+1]},${d[i+2]}`);
    return seen.size;
  });
  ok(painted > 4, `the board is really drawn, not a blank canvas (${painted} distinct colours sampled)`);

  // ── somebody with nowhere to go ───────────────────────────────────────
  // Marked, counted, and told about. Mini Metro does none of the three: its
  // unreachable passengers look identical to everyone else and never leave.
  await page.evaluate(() => {
    const g = window.__tm.game;
    const st = g.world.stations.find(s => g.net.linesAt(s.id).length) || g.world.stations[0];
    st.join('star', g.world.time);          // no line reaches a star
    window.__tmStuckAt = st.id;
  });
  await page.waitForTimeout(600);

  const stuck = await page.evaluate(() => {
    const g = window.__tm.game;
    const st = g.world.station(window.__tmStuckAt);
    const p = st.waiting.find(x => x.goal === 'star');
    const chip = document.getElementById('stkStuck');
    return {
      marked: !!p && p.stranded,
      count: g.stranded,
      chipShown: !chip.hidden,
      chipText: chip.textContent.trim(),
      feed: document.getElementById('feed').textContent,
    };
  });
  ok(stuck.marked, 'a passenger no line can reach is marked as such');
  ok(stuck.count >= 1, `and counted (${stuck.count})`);
  ok(stuck.chipShown, `and the strip says so ("${stuck.chipText}")`);
  ok(/give up|no line reaches/i.test(stuck.feed), `and the game explains it once ("${stuck.feed}")`);

  // …and the mark is really PAINTED, in the ghost ink and not the normal one
  const ghost = await page.evaluate(() => {
    const g = window.__tm.game, r = window.__tm.renderer, cv = document.getElementById('board');
    const st = g.world.station(window.__tmStuckAt);
    const S = window.__tm.debug.sizeAt(r.scale);
    const dpr = r.dpr;
    const box = 26 * r.scale * dpr;
    const cx = Math.round((r.ox + (st.x + S.stationR + 20) * r.scale) * dpr);
    const cy = Math.round((r.oy + st.y * r.scale) * dpr);
    const d = cv.getContext('2d').getImageData(cx - box, cy - box, box * 2, box * 2).data;
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const near = (i, t) => Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2]) < 42;
    const gh = hex(window.__tm.debug.PAL.stranded);
    let hits = 0;
    for (let i = 0; i < d.length; i += 4) if (near(i, gh)) hits++;
    return hits;
  });
  ok(ghost > 4, `the ghosted passenger is painted in the ghost ink (${ghost} pixels)`);

  // ── the taps ──────────────────────────────────────────────────────────
  const small = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll('button')) {
      if (!el.offsetParent && el.closest('[hidden]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width && (r.width < 44 || r.height < 44)) bad.push(`${el.id || el.className}:${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return bad;
  });
  eq(small.length, 0, `every control clears 44px (${small.join(', ')})`);

  // The sweep above only ever looked at DOM buttons, so the targets drawn ON
  // THE CANVAS were never measured — and the end-of-line nub came out 17px on a
  // phone, which meant no line could be shortened or deleted by thumb at all.
  const desk = await page.evaluate(() => window.__tm.touch);
  ok(desk.nubHitPx >= 44, `the line-end nub is a real target on a desktop (${desk.nubHitPx.toFixed(1)}px)`);
  ok(desk.stationHitPx >= 44, `and so is a stop (${desk.stationHitPx.toFixed(1)}px)`);
  ok(desk.nubDrawPx >= 5, `the nub has a drawn size (r=${desk.nubDrawPx.toFixed(1)}px)`);
  // Reading a number back out of the game does not prove anything was PAINTED —
  // the same weak-check mistake as counting stops with anybody on them. Sample
  // the canvas around the nub and look for the line's own colour.
  const nubInk = await page.evaluate(() => {
    const cv = document.getElementById('board');
    const t = window.__tm.touch;
    const n = t.nubs.find(x => !x.atHead);
    if (!n) return null;
    const r = window.__tm.renderer;
    const dpr = r.dpr;
    const cx = Math.round((r.ox + n.x * r.scale) * dpr);
    const cy = Math.round((r.oy + n.y * r.scale) * dpr);
    const rad = Math.max(6, Math.round(t.nubDrawPx * dpr * 1.6));
    const g = cv.getContext('2d');
    const d = g.getImageData(cx - rad, cy - rad, rad * 2, rad * 2).data;
    // read the palette from the GAME. A copy of it here passed for weeks and
    // then failed the moment the real one moved, which is the copy's whole
    // contribution.
    const line = window.__tm.net.lines[0];
    const hex = window.__tm.debug.PAL.lines[line.colour];
    const tgt = [1,3,5].map(i => parseInt(hex.slice(i, i + 2), 16));
    let hits = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i]-tgt[0]) + Math.abs(d[i+1]-tgt[1]) + Math.abs(d[i+2]-tgt[2]) < 40) hits++;
    }
    return { hits, sampled: d.length / 4 };
  });
  ok(nubInk && nubInk.hits > 8,
     `the nub is really painted in its line's colour (${nubInk ? nubInk.hits : 0} pixels of ${nubInk ? nubInk.sampled : 0})`);


  // ── the ink, as the browser actually renders it ───────────────────────
  const inks = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const grab = sel => { const e = document.querySelector(sel); return e ? getComputedStyle(e).color : null; };
    return { bg, dim: grab('.cap'), ink: grab('#score') };
  });
  const bgHex = hex(inks.bg);
  ok(cr(hex(inks.ink), bgHex) >= 4.5, 'the score clears AA against the paper');
  ok(cr(hex(inks.dim), bgHex) >= 4.5, 'the small caps clear AA against the paper');

  // ── the weekly card ───────────────────────────────────────────────────
  await page.evaluate(() => { window.__tm.game.nextUpgradeAt = 0.001; });
  await page.waitForTimeout(300);
  eq(await page.evaluate(() => window.__tm.game.state), 'upgrade', 'crossing a week stops for the choice');
  ok(await page.evaluate(() => window.__tm.game.paused), 'and pauses while it is open');
  eq(await page.evaluate(() => document.querySelectorAll('#upBtns button').length), 2, 'two cards, never more');
  // force the two-step reward rather than taking whatever the offer rolled —
  // a gate whose number of checks depends on a dice roll cannot be compared
  // between runs
  await page.evaluate(() => {
    window.__tm.game.offer = ['carriage', 'tunnel'];
    window.__tm.debug.showUpgrade();
  });
  await page.click('#upBtns button');
  ok(await page.evaluate(() => !document.getElementById('lineWrap').hidden),
     'a reward that lands on a line asks which line');
  ok(await page.evaluate(() => !!document.querySelector('#upBtns button.sel')),
     'and the card you picked is marked while you place it');
  await page.click('#linePick button');
  eq(await page.evaluate(() => window.__tm.game.state), 'play', 'and taking it resumes the run');

  // ── the end ───────────────────────────────────────────────────────────
  // the platform has to be genuinely full as well as the gauge full — an empty
  // platform drains the gauge on the very next tick, which is correct
  await page.evaluate(() => {
    const st = window.__tm.world.stations[0];
    for (let i = 0; i < st.capacity + 3; i++) st.join('circle', window.__tm.world.time);
    st.over = 1;
  });
  await page.waitForTimeout(300);
  eq(await page.evaluate(() => window.__tm.game.state), 'over', 'a closed gauge ends the run');
  ok(await page.evaluate(() => !document.getElementById('end').hidden), 'and the end card comes up');
  ok(await page.evaluate(() => /\d/.test(document.getElementById('endStats').textContent)), 'with the numbers on it');
  await page.click('#again');
  eq(await page.evaluate(() => window.__tm.game.state), 'play', 'and TRY IT AGAIN starts a fresh board');
  eq(await page.evaluate(() => window.__tm.net.lines.length), 0, 'with nothing drawn on it yet');

  // ── the mission that is not the endless one ───────────────────────────
  await page.evaluate(() => window.__tm.debug.launch('festival', 4242));
  await page.waitForTimeout(200);
  eq(await page.evaluate(() => window.__tm.game.mission.id), 'festival', 'a mission can be launched by name');
  const fest = await page.evaluate(() => ({
    goal: document.getElementById('goal').textContent,
    clock: document.getElementById('day').textContent,
    left: document.getElementById('week').textContent,
    lines: window.__tm.net.maxLines,
  }));
  ok(/220/.test(fest.goal), `the goal is on the strip ("${fest.goal}")`);
  ok(/:/.test(fest.clock), `the festival clock reads in hours ("${fest.clock}")`);
  ok(/left/.test(fest.left), `and a timed mission counts down ("${fest.left}")`);
  eq(fest.lines, 4, 'with the transport the mission grants, not the endless default');

  // clearing it has to stick, or the campaign spine cannot open
  await page.evaluate(() => {
    localStorage.removeItem('tokoMoveProgress');
    const g = window.__tm.game;
    g.score = g.mission.goals[0].n;
  });
  await page.waitForTimeout(250);
  eq(await page.evaluate(() => window.__tm.game.state), 'won', 'hitting the target wins the mission');
  ok(await page.evaluate(() => !document.getElementById('end').hidden), 'and the end card comes up');
  ok(await page.evaluate(() => /HELD/.test(document.getElementById('endTitle').textContent)),
     'saying the night held rather than that it stopped');
  eq(await page.evaluate(() => window.__tm.debug.progress().cleared.includes('festival')), true,
     'and the clear is written down');

  await page.click('#toMissions');
  ok(await page.evaluate(() => !document.getElementById('title').hidden), 'the way back to the board works');
  ok(await page.evaluate(() => !!document.querySelector('#campaignList .miss.done')),
     'and a cleared mission is marked on it');

  // ── the rules, on demand ──────────────────────────────────────────────
  // Every tip fires once and is gone, which is right for a nudge and useless
  // for the delete gesture — the one rule nobody guesses and everybody wants
  // again three minutes later (PLAYTEST.md §3.3).
  // …and the VAN, also actually drawn. The load's road leg rides a longer
  // vehicle outlined in the alarm colour (`Car.van`), which is the only way to
  // pick it out of traffic once it is off the platform and the ring is gone.
  // Sampled BOTH ways from one frame: alarm pixels around the van, none around
  // an ordinary car — asking only the van's would pass with every car outlined.
  const van = await page.evaluate(async () => {
    window.__tm.debug.launch('transfer', 24);
    const g = window.__tm.game, r = window.__tm.renderer, R = g.roads;
    g.focus('roads');
    R.budget = 9999; R.bridges = 99; R.spareCars = 20;
    for (let x = 0; x < R.cols; x++) for (let y = 0; y < R.rows; y++) R.build(x, y);
    const st = g.world.stations[0];
    const other = g.world.stations.find(s => s.kind !== st.kind && R.hopsFrom(st.id, s.kind) < Infinity);
    if (!other) return { why: 'the roads reach nowhere else on this board' };
    st.waiting.length = 0;
    R.cars.length = 0;
    st.join(st.kind, 0, { parcel: true, label: 'z', legs: [{ layer: 'roads', goal: other.kind }] });
    R.dispatch();
    st.join(other.kind, 0);
    R.dispatch();
    const load = R.cars.find(c => c.p.parcel), plain = R.cars.find(c => !c.p.parcel);
    if (!load || !plain) return { why: 'a van and an ordinary car did not both go out' };
    // off the door, so what is sampled is the vehicle and not the building
    for (let i = 0; i < 12; i++) R.drive(0.05, () => {});
    if (!R.cars.includes(load) || !R.cars.includes(plain)) return { why: 'they arrived before the frame' };
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    const want = window.__tm.debug.PAL.warn;
    const ctx = r.canvas.getContext('2d');
    const count = (car, at) => {
      const q = at ?? R.posOf(car);
      const box = Math.round(22 * devicePixelRatio);
      const px = Math.round((r.ox + q.x * r.scale) * devicePixelRatio);
      const py = Math.round((r.oy + q.y * r.scale) * devicePixelRatio);
      const d = ctx.getImageData(px - box, py - box, box * 2, box * 2).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if ('#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('') === want) n++;
      }
      return n;
    };
    const box = { q: R.posOf(load) };
    const onVan = count(load);
    // …and the same patch of board with the van taken off it. Comparing the van
    // against a NEARBY car does not work — they leave the same door half a cell
    // apart and each one's box catches the other. Comparing the same box to
    // itself does: whatever alarm colour is there came from the van.
    R.cars.splice(R.cars.indexOf(load), 1);
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    const onGone = count({ ...load, get van() { return false; } }, box.q);
    return { onVan, onGone, longer: load.van === true && plain.van === false };
  });
  ok(!van.why, `a van and a car are both on the road to be looked at${van.why ? ` — ${van.why}` : ''}`);
  if (!van.why) {
    ok(van.longer, 'the one with the load is the van and the other is not');
    ok(van.onVan > 0, `the van is outlined in the alarm colour (${van.onVan} pixels)`);
    eq(van.onGone, 0, 'and that colour is the van, not the board under it');
  }

  await page.evaluate(() => window.__tm.debug.launch('endless', 7));
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.getElementById('howto').hidden), 'the rules start closed');
  const helpBox = await page.evaluate(() => {
    const b = document.getElementById('help');
    const r = b.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), label: b.getAttribute('aria-label'), exp: b.getAttribute('aria-expanded') };
  });
  ok(helpBox.w >= 44 && helpBox.h >= 44, `and open from a real tap target (${helpBox.w}x${helpBox.h})`);
  eq(helpBox.exp, 'false', 'which says it is closed to a screen reader');

  await page.click('#help');
  const opened = await page.evaluate(() => ({
    shown: !document.getElementById('howto').hidden,
    exp: document.getElementById('help').getAttribute('aria-expanded'),
    items: [...document.querySelectorAll('#howtoList li')].map(li => li.textContent),
  }));
  ok(opened.shown, 'pressing it opens them');
  eq(opened.exp, 'true', 'and says so');
  ok(opened.items.length >= 4, `with the rules in it (${opened.items.length} of them)`);
  // the delete gesture is the WHOLE REASON this panel exists
  ok(opened.items.some(t => /back down the line|take it back/i.test(t)),
     'including how to take a line back, which is the rule this exists for');
  // …and it must not pause or cover the board
  eq(await page.evaluate(() => window.__tm.game.state), 'play', 'the rules do not stop the game');
  ok(await page.evaluate(() => {
    const r = document.getElementById('howto').getBoundingClientRect();
    const c = document.getElementById('board').getBoundingClientRect();
    return r.width < c.width * 0.6;
  }), 'nor cover the board');

  await page.keyboard.press('Escape');
  ok(await page.evaluate(() => document.getElementById('howto').hidden), 'Esc closes them');
  ok(await page.evaluate(() => document.activeElement?.id === 'help'),
     'and gives focus back to the button that opened them, so a keyboard is not trapped');

  // the two layers share no verbs at all, so the rules must follow the layer
  await page.click('#help');
  const metroRules = await page.evaluate(() => document.getElementById('howtoList').textContent);
  await page.evaluate(() => window.__tm.debug.launch('rush', 9));
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.getElementById('howto').hidden),
     'a new run closes the rules rather than leaving the wrong layer showing');
  await page.click('#help');
  const roadRules = await page.evaluate(() => document.getElementById('howtoList').textContent);
  ok(roadRules !== metroRules, 'and the car layer has its own rules, not the metro’s');
  ok(/road/i.test(roadRules) && !/tunnel/i.test(roadRules), 'which talk about road and not about tunnels');
  await page.keyboard.press('Escape');

  // ── the car layer, driven by pointer ──────────────────────────────────
  // Everything here is the gesture, which is the one part of this layer that
  // cannot be checked in bare node: whether a drag lays road, whether dragging
  // back along it lifts it, and whether a second drag off the end EXTENDS it —
  // that last one shipped broken, because "started on road" decided the verb
  // and every attempt to carry a street on simply erased it.
  await page.evaluate(() => window.__tm.debug.launch('rush', 9));
  await page.waitForTimeout(300);
  eq(await page.evaluate(() => window.__tm.game.layer), 'roads', 'The Rush is played on the roads');

  const chips = await page.evaluate(() => [...document.querySelectorAll('.stk')].map(e => e.textContent.trim()).join(' | '));
  ok(/road/.test(chips), `the strip counts road, not lines ("${chips}")`);
  ok(/cars/.test(chips), 'and cars');
  ok(/bridge/.test(chips), 'and bridges');

  const cellAt = (cx, cy) => page.evaluate(([x, y]) => {
    const c = window.__tm.game.roads.centre(x + ',' + y);
    return window.__tm.toClient(c.x, c.y);
  }, [cx, cy]);
  const dragCells = async (from, to) => {
    const a = await cellAt(from[0], from[1]), b = await cellAt(to[0], to[1]);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(120);
  };
  // a dry run of squares, found rather than assumed: a board has a river on it
  const run = await page.evaluate(() => {
    const R = window.__tm.game.roads;
    for (let cy = 1; cy < R.rows - 1; cy++) {
      let n = 0;
      for (let cx = 1; cx < R.cols - 1; cx++) n = R.wet(cx, cy) ? 0 : n + 1;
      if (n >= 6) {
        let cx = R.cols - 2;
        while (R.wet(cx, cy)) cx--;
        return { cy, from: cx - 5, to: cx };
      }
    }
    return null;
  });
  ok(run !== null, 'the board has somewhere dry to lay a street');
  if (run) {
    await page.evaluate(() => { const R = window.__tm.game.roads; for (const k of [...R.cells]) R.erase(...k.split(',').map(Number)); });
    await dragCells([run.from, run.cy], [run.from + 3, run.cy]);
    const laid = await page.evaluate(() => window.__tm.game.roads.used());
    ok(laid >= 4, `a drag across bare ground lays road (${laid} squares)`);

    // …and drawn. The board is the only thing that can say so.
    const painted = await page.evaluate(async ([cx, cy]) => {
      const R = window.__tm.game.roads, c = R.centre(cx + ',' + cy);
      const r = window.__tm.renderer;
      const px = Math.round(r.ox + c.x * r.scale), py = Math.round(r.oy + c.y * r.scale);
      const d = r.canvas.getContext('2d').getImageData(px * devicePixelRatio, py * devicePixelRatio, 1, 1).data;
      return { got: '#' + [...d].slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join(''),
               want: window.__tm.debug.PAL.road, paper: window.__tm.debug.PAL.paper };
    }, [run.from + 1, run.cy]);
    ok(painted.got !== painted.paper, `a laid square is actually painted (${painted.got} vs paper ${painted.paper})`);

    // extend: start ON the road you have and carry it onto bare ground
    await dragCells([run.from + 3, run.cy], [run.to, run.cy]);
    const extended = await page.evaluate(() => window.__tm.game.roads.used());
    ok(extended > laid, `dragging off the end carries the street on (${laid} → ${extended})`);

    // lift: start on the road and drag ALONG it
    await dragCells([run.to, run.cy], [run.from + 3, run.cy]);
    const lifted = await page.evaluate(() => window.__tm.game.roads.used());
    ok(lifted < extended, `dragging back along it lifts it (${extended} → ${lifted})`);
  }

  // cars are dispatched by the game, never by the player: there is nothing on
  // the page to press that puts one on the road
  await page.evaluate(() => {
    const g = window.__tm.game, R = g.roads;
    for (const k of [...R.cells]) R.erase(...k.split(',').map(Number));
    const a = g.world.stations[0], b = g.world.stations.find(s => s.kind !== a.kind);
    const ca = R.cellOf(a), cb = R.cellOf(b);
    for (let cx = Math.min(ca.cx, cb.cx); cx <= Math.max(ca.cx, cb.cx); cx++) R.build(cx, ca.cy);
    for (let cy = Math.min(ca.cy, cb.cy); cy <= Math.max(ca.cy, cb.cy); cy++) R.build(cb.cx, cy);
    a.join(b.kind, g.world.time);
  });
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.__tm.game.roads.cars.length > 0 || window.__tm.game.score > 0),
     'a joined-up road puts a car on it with nobody asked');

  await page.evaluate(() => window.__tm.debug.launch('endless', 7));
  await page.waitForTimeout(200);

  // ── two layers at once, and the load ──────────────────────────────────
  await page.evaluate(() => window.__tm.debug.launch('transfer', 24));
  await page.waitForTimeout(300);
  eq(await page.evaluate(() => window.__tm.game.layers.join('+')), 'metro+roads',
     'The Handover runs both layers');

  const swap = await page.evaluate(() => {
    const b = document.getElementById('swap'), r = b.getBoundingClientRect();
    // the INK's width, measured with a Range. `scrollWidth` counts the padding
    // as content, so it sits ~2px under the box whatever the padding is — it
    // reported "fits" on the cramped layout and on the fixed one alike.
    const range = document.createRange();
    range.selectNodeContents(b);
    const ink = range.getBoundingClientRect().width;
    return { hidden: b.hidden, text: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height),
             label: b.getAttribute('aria-label'), ink: Math.round(ink) };
  });
  ok(!swap.hidden, 'with a control to say which one your finger is on');
  eq(swap.text, 'metro', 'starting on the first the mission names');
  ok(swap.w >= 44 && swap.h >= 44, `which is a real tap target (${swap.w}x${swap.h})`);
  // 44 is a FLOOR, not a width: "metro" filled a square box edge to edge, at
  // 42px of text in 44px of button. The first version of this check asked only
  // that the text fitted, which it technically did — so it passed on exactly
  // the layout it was written to reject. Room on both sides is the thing meant.
  ok(swap.w - swap.ink >= 12,
     `and has room around the word in it (${swap.ink}px of text in ${swap.w}px)`);
  ok(/switch/i.test(swap.label ?? ''), 'and says what it does');

  await page.click('#swap');
  await page.waitForTimeout(150);
  eq(await page.evaluate(() => window.__tm.game.layer), 'roads', 'pressing it switches the layer');
  // the GESTURE has to move with it — there is nothing to draw on the roads
  eq(await page.evaluate(() => window.__tm.debug.drawerKind()), 'roads',
     'and the drawer with it, so the gesture matches the layer');
  eq(await page.evaluate(() => document.querySelector('.stk#stkLines i').textContent), 'road',
     'and the counts are the ones you are spending');
  await page.click('#swap');
  await page.waitForTimeout(150);
  eq(await page.evaluate(() => window.__tm.game.layer), 'metro', 'and back again');

  // the load, ACTUALLY DRAWN. A ring nobody can see is a load nobody can find
  // on a board with sixty pips on it.
  const load = await page.evaluate(async () => {
    const g = window.__tm.game, r = window.__tm.renderer;
    for (let i = 0; i < 3000; i++) g.step(0.05);
    const par = g.parcel;
    if (!par) return { why: 'the load never turned up' };
    const at = g.world.stations.find(s => s.waiting.includes(par));
    if (!at) return { why: 'the load is in transit, not on a platform' };
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    const S = window.__tm.debug.sizeAt(r.scale);
    const rad = (at.special ? S.specialR : S.stationR) + 15;
    const px = Math.round((r.ox + (at.x + rad) * r.scale) * devicePixelRatio);
    const py = Math.round((r.oy + at.y * r.scale) * devicePixelRatio);
    const d = r.canvas.getContext('2d').getImageData(px, py, 1, 1).data;
    return { leg: par.leg, layer: par.layer,
             got: '#' + [...d].slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join(''),
             want: window.__tm.debug.PAL.warn };
  });
  ok(!load.why, `the load is on a platform to be looked at${load.why ? ` — ${load.why}` : ''}`);
  if (!load.why) eq(load.got, load.want, 'and is ringed in the alarm colour, so it can be found');

  // ── the bus layer ─────────────────────────────────────────────────────
  // The third layer, through the page rather than through the model: the same
  // switch, the same drawer, a different network under it.
  await page.evaluate(() => window.__tm.debug.launch('busline', 11));
  await page.waitForTimeout(200);
  eq(await page.evaluate(() => window.__tm.game.layers.join('+')), 'roads+bus',
     'The Number 7 runs the streets and the buses on them');
  eq(await page.evaluate(() => window.__tm.game.layer), 'roads',
     'and opens on the streets, because there is nothing to draw a route along yet');
  await page.click('#swap');
  await page.waitForTimeout(150);
  eq(await page.evaluate(() => window.__tm.game.layer), 'bus', 'the switch reaches the bus layer');
  eq(await page.evaluate(() => window.__tm.debug.drawerKind()), 'bus',
     'and the gesture with it — a route is drawn, not laid');
  eq(await page.evaluate(() => document.querySelector('.stk#stkLines i').textContent), 'routes',
     'the counts are the bus layer\'s');
  eq(await page.evaluate(() => document.querySelector('.stk#stkTunnels i').textContent), 'in traffic',
     'including the one number this layer has that no other does');
  await page.click('#help');
  await page.waitForTimeout(120);
  ok(await page.evaluate(() => [...document.querySelectorAll('#howtoList li')].some(li => /street/i.test(li.textContent))),
     'and the rules say the thing that will otherwise be a mystery: no street, no route');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);

  // …and a route, ACTUALLY DRAWN, with a bus on it. Both are sampled from the
  // frame: a route painted in nothing and a bus that is not there would each
  // pass every state assertion in the core gate.
  const route = await page.evaluate(async () => {
    const g = window.__tm.game, r = window.__tm.renderer, R = g.roads;
    R.budget = 9999;
    const [a, b] = g.world.stations;
    const A = R.cellOf(a), B = R.cellOf(b);
    for (let x = Math.min(A.cx, B.cx); x <= Math.max(A.cx, B.cx); x++) R.build(x, A.cy);
    for (let y = Math.min(A.cy, B.cy); y <= Math.max(A.cy, B.cy); y++) R.build(B.cx, y);
    const res = g.bus.open(a.id, b.id);
    if (res.error) return { why: res.error };
    const line = res.line, bus = line.trains[0];
    if (!bus) return { why: 'the route opened with no bus on it' };
    // off the stop, so the stop's own ink is not what gets sampled
    for (let i = 0; i < 40; i++) g.bus.step(0.05, () => {});
    await new Promise(res2 => requestAnimationFrame(() => requestAnimationFrame(res2)));
    const D = window.__tm.debug.PAL;
    const ctx = r.canvas.getContext('2d');
    const count = (q, want) => {
      const box = Math.round(20 * devicePixelRatio);
      const px = Math.round((r.ox + q.x * r.scale) * devicePixelRatio);
      const py = Math.round((r.oy + q.y * r.scale) * devicePixelRatio);
      const d = ctx.getImageData(px - box, py - box, box * 2, box * 2).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        if ('#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('') === want) n++;
      }
      return n;
    };
    const p = bus.pos();
    const colour = D.lines[line.colour];
    const withBus = { paint: count(p, colour), ink: count(p, D.ink) };
    // The same patch with the bus lifted off it. Comparing against the route
    // is the only comparison that means anything: a bus is filled in its
    // route's own colour and stands ON that route, so "there is blue here"
    // is true either way.
    line.trains.length = 0;
    await new Promise(res2 => requestAnimationFrame(() => requestAnimationFrame(res2)));
    const without = { paint: count(p, colour), ink: count(p, D.ink) };
    return { withBus, without, bends: line.segs[0].pts.length };
  });
  ok(!route.why, `a route can be drawn along the street${route.why ? ` — ${route.why}` : ''}`);
  if (!route.why) {
    ok(route.bends > 2, `and it follows the street rather than flying over it (${route.bends} points)`);
    ok(route.without.paint > 0, `the route itself is painted in its colour (${route.without.paint} pixels)`);
    ok(route.withBus.paint - route.without.paint > 60,
       `and a bus on it adds a block of that colour, not a thicker stripe (+${route.withBus.paint - route.without.paint})`);
    // the outline, which is the fix a SCREENSHOT asked for and no state
    // assertion could: filled in the route's colour and sitting on the route,
    // a bus without an ink edge read as a swelling of the line
    ok(route.withBus.ink - route.without.ink > 30,
       `and it is outlined, so it reads as a vehicle rather than a swelling (+${route.withBus.ink - route.without.ink} ink)`);
  }

  await page.evaluate(() => window.__tm.debug.launch('endless', 7));
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.getElementById('swap').hidden),
     'a one-layer mission has no switch to press');

  // ── the way home ──────────────────────────────────────────────────────
  // `a` would have matched anything; the shell injects one specific anchor
  const home = await page.evaluate(() => {
    const el = document.querySelector('a.arcade-home');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { label: el.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height) };
  });
  ok(home !== null, 'the hub shell put its HOME anchor on the page');
  ok(home && home.w >= 44 && home.h >= 44, `and the way home is a real tap target (${home ? home.w + 'x' + home.h : 'missing'})`);
  // …and it does not sit ON the score. The HOME button is absolutely positioned
  // by the shell and the strip pads itself clear of it; tightening that padding
  // for a short screen put the two straight through each other, and nothing
  // measured it.
  await checkHomeClear(page, 'desktop');

  // ── a phone ───────────────────────────────────────────────────────────
  const phone = await browser.newPage({ viewport: { width: 390, height: 720 }, isMobile: true, hasTouch: true });
  phone.on('pageerror', e => errs.push('phone pageerror: ' + e.message));
  await phone.goto(base, { waitUntil: 'load' });
  await phone.waitForTimeout(400);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 1, `nothing runs off the side of a phone (overflow ${overflow}px)`);
  await phone.evaluate(() => [...document.querySelectorAll('#freeList button')][0].click());
  await phone.waitForTimeout(300);
  const boardBox = await phone.evaluate(() => {
    const r = document.getElementById('board').getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  ok(boardBox.w > 100 && boardBox.h > 100, `the board gets real room on a phone (${boardBox.w}x${boardBox.h})`);

  // THE CHECK THAT SHOULD HAVE CAUGHT IT. At 390px the strip ran to 515px and
  // put pause, speed and sound off the screen — a phone could not pause the
  // game. `overflow: hidden` on body meant scrollWidth never grew, so the
  // no-horizontal-overflow check above passed the entire time. Measure the
  // controls themselves.
  const clipped = await phone.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('#hud button, #hud .stk, #hud .score')) {
      const r = el.getBoundingClientRect();
      if (r.right > innerWidth + 0.5 || r.left < -0.5 || r.bottom > innerHeight + 0.5) {
        out.push(`${el.id || el.className}@${Math.round(r.left)}..${Math.round(r.right)}`);
      }
    }
    return out;
  });
  eq(clipped.length, 0, `no control is pushed off a 390px screen (${clipped.join(', ')})`);

  // the board turns to match the screen, instead of being letterboxed into a
  // strip down the middle of it
  const fit = await phone.evaluate(() => {
    const r = window.__tm.renderer;
    const w = r.bw * r.scale, h = r.bh * r.scale;
    const S = window.__tm.debug.sizeAt(r.scale);
    return {
      portrait: r.bh > r.bw,
      share: w * h / (innerWidth * innerHeight),
      stopPx: S.stationR * r.scale * 2,
      pipPx: S.pipR * r.scale * 2,
    };
  });
  ok(fit.portrait, 'a portrait screen gets a portrait board');
  ok(fit.share > 0.6, `and the board fills it (${(fit.share * 100).toFixed(0)}% of the screen)`);
  ok(fit.stopPx >= 20, `a stop stays big enough to read (${fit.stopPx.toFixed(1)}px)`);
  ok(fit.pipPx >= 6, `and so does a waiting passenger (${fit.pipPx.toFixed(1)}px)`);

  // the letterbox maths the game uses must round-trip, or every tap lands wrong
  const trip = await phone.evaluate(() => {
    const s = window.__tm.world.stations[0];
    const c = window.__tm.toClient(s.x, s.y);
    const back = window.__tm.renderer.toBoard(c.x, c.y);
    return Math.hypot(back.x - s.x, back.y - s.y);
  });
  ok(trip < 0.5, `board and screen coordinates round-trip (off by ${trip.toFixed(3)})`);

  // ── the case that was actually broken ─────────────────────────────────
  // At 390px the board renders at 0.45 scale. Hit radii fixed in board units
  // shrank with it: the nub measured 17px, so a line could not be shortened or
  // deleted by thumb. These are screen measurements now.
  const ph = await phone.evaluate(() => window.__tm.touch);
  ok(ph.nubHitPx >= 44, `the nub clears 44px on a phone too (${ph.nubHitPx.toFixed(1)}px at ${ph.scale.toFixed(2)} scale)`);
  ok(ph.stationHitPx >= 44, `and so does a stop (${ph.stationHitPx.toFixed(1)}px)`);
  ok(ph.nubDrawPx >= 5, `and it is big enough to see (r=${ph.nubDrawPx.toFixed(1)}px)`);


  // and prove it end to end: draw a line, then pull it off in ONE drag back
  await phone.evaluate(() => {
    window.__tm.game.paused = true;
    while (window.__tm.world.stations.length < 3) window.__tm.world.spawnStation('circle');
  });
  const pAt = i => phone.evaluate(k => {
    const st = window.__tm.world.stations[k];
    return window.__tm.toClient(st.x, st.y);
  }, i);
  const [a0, a1, a2] = [await pAt(0), await pAt(1), await pAt(2)];
  await phone.mouse.move(a0.x, a0.y); await phone.mouse.down();
  await phone.mouse.move(a1.x, a1.y, { steps: 10 });
  await phone.mouse.move(a2.x, a2.y, { steps: 10 });
  await phone.mouse.up();
  const drawn = await phone.evaluate(() => window.__tm.net.lines[0]?.stations.length ?? 0);
  ok(drawn >= 2, `a line can be drawn by thumb (${drawn} stops)`);

  const pn = await phone.evaluate(() => {
    const n = window.__tm.touch.nubs.find(x => !x.atHead);
    return n ? window.__tm.toClient(n.x, n.y) : null;
  });
  ok(pn !== null, 'and it grows a nub to grab');
  // Reachable is not the same as legible. Nearest-wins keeps the nub grabbable
  // even when it is jammed against the stop, so the stand-off needs its own
  // check: on screen, the drawn nub must CLEAR the drawn stop, or the player
  // sees one blob and has nothing to aim at.
  const clear = await phone.evaluate(() => {
    const t = window.__tm.touch;
    const n = t.nubs.find(x => !x.atHead);
    if (!n) return null;
    const st = window.__tm.world.station(n.line.tail);
    const gapUnits = Math.hypot(n.x - st.x, n.y - st.y);
    const stationR = st.special ? 18 : 15.5;
    return (gapUnits - stationR) * t.scale - t.nubDrawPx;
  });
  ok(clear !== null && clear >= 6,
     `and it stands clear of the stop rather than sitting on it (${clear === null ? 'no nub' : clear.toFixed(1) + 'px of daylight'})`);
  await phone.mouse.move(pn.x, pn.y); await phone.mouse.down();
  await phone.mouse.move(a1.x, a1.y, { steps: 10 });
  await phone.mouse.move(a0.x, a0.y, { steps: 10 });
  await phone.mouse.up();
  const after = await phone.evaluate(() => ({
    lines: window.__tm.net.lines.length, spare: window.__tm.net.spareTrains }));
  eq(after.lines, 0, 'and one drag back down it deletes the whole line');
  eq(after.spare, 3, 'handing the train back to the shed');

  // …and again with the world RUNNING, which is how a person actually does it.
  // A train out on the leg being pulled off used to leave the renderer reading
  // `pts` off undefined; a paused board never reproduced it because every train
  // is sitting at the start of leg zero.
  const liveErrs = [];
  phone.on('pageerror', e => liveErrs.push(e.message));
  // The world is HELD still rather than expected to be: the crash is in the
  // render path, which runs every frame whether the clock does or not, so a
  // paused board reproduces it just as well.
  await phone.evaluate(() => { window.__tm.game.paused = true; });
  const l0 = await pAt(0), l1 = await pAt(1), l2 = await pAt(2);

  // The three-stop line is STAGING, and it is built through the game's own API
  // rather than by three pointer drags. Dragging 0 → 1 → 2 across the board
  // joined only two of them about one run in three — the middle stop is not
  // always on the way to the third, which is a fact about the board that was
  // dealt and not about the bug under test. The pointer gestures are already
  // covered a dozen checks above; what is being tested HERE is what the
  // renderer does when a leg is pulled out from under a moving train, and the
  // cut below is still a real drag.
  const placed = await phone.evaluate(() => {
    const net = window.__tm.net, w = window.__tm.world;
    const ids = w.stations.slice(0, 3).map(s => s.id);
    if (ids.length < 3) return `the board only dealt ${ids.length} stops`;

    // The staging gets tunnels and trains from nowhere, deliberately. Every
    // board deals a river, the first three stops sometimes sit across it, and
    // the tunnel budget by this point in the run is often spent — so the line
    // is refused, correctly, for a reason that has nothing to do with what is
    // being tested. The tunnel economy has its own checks; this one is about
    // what the renderer does when a leg is pulled out from under a moving
    // train, and it should not be able to fail for anything else.
    net.ownedTunnels = 99;
    net.spareTrains = Math.max(net.spareTrains, 3);

    // open() answers { line } or { error }, never the Line itself
    const opened = net.open(ids[0], ids[1]);
    if (opened?.error || !opened?.line) return `a line could not be opened: ${opened.error}`;
    const line = opened.line;
    const ext = net.extend(line, ids[2], true);
    if (ext?.error) return `the line could not be extended: ${ext.error}`;
    if (line.segCount() < 2) return `the line has only ${line.segCount()} leg(s)`;
    if (!line.trains.length) return 'the line has no train on it';
    // Put the train on the LAST leg deliberately. Waiting and hoping it drifts
    // there is a coin toss — the first cut of this check passed happily with
    // the fix reverted, which makes it worse than no check.
    const t = line.trains[0];
    t.segIdx = line.segCount() - 1; t.p = 0.4; t.dir = 1;
    return true;
  });
  ok(placed === true, `a train can be put out on the last leg for the test (${placed})`);
  await phone.waitForTimeout(300);
  const liveNub = await phone.evaluate(() => {
    const n = window.__tm.touch.nubs.find(x => !x.atHead);
    return n ? window.__tm.toClient(n.x, n.y) : null;
  });
  if (liveNub) {
    await phone.mouse.move(liveNub.x, liveNub.y); await phone.mouse.down();
    await phone.mouse.move(l1.x, l1.y, { steps: 8 });
    await phone.mouse.move(l0.x, l0.y, { steps: 8 });
    await phone.mouse.up();
  }
  await phone.waitForTimeout(900);
  eq(liveErrs.length, 0, `cutting a line under a moving train does not crash (${liveErrs.join(' | ')})`);

  // ── a phone on its side ───────────────────────────────────────────────
  // The tightest case there is, and the one that makes the drawing floors do
  // work: a landscape board in a 270px-tall strip renders at 0.45 scale, where
  // the declared sizes alone put a stop at 14px.
  const wide = await browser.newPage({ viewport: { width: 640, height: 360 }, isMobile: true, hasTouch: true });
  wide.on('pageerror', e => errs.push('landscape pageerror: ' + e.message));
  await wide.goto(base, { waitUntil: 'load' });
  await wide.waitForTimeout(400);
  await wide.evaluate(() => [...document.querySelectorAll('#freeList button')][0].click());
  await wide.waitForTimeout(300);
  await checkHomeClear(wide, 'phone on its side');
  const rot = await wide.evaluate(() => {
    const r = window.__tm.renderer, t = window.__tm.touch;
    const S = window.__tm.debug.sizeAt(r.scale);
    const off = [];
    for (const el of document.querySelectorAll('#hud button, #hud .stk, #hud .score')) {
      const b = el.getBoundingClientRect();
      if (b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5) off.push(el.id || el.className);
    }
    return {
      scale: r.scale,
      stopPx: S.stationR * r.scale * 2,
      pipPx: S.pipR * r.scale * 2,
      nubHitPx: t.nubHitPx,
      off,
    };
  });
  ok(rot.stopPx >= 20, `sideways, a stop still reads (${rot.stopPx.toFixed(1)}px at ${rot.scale.toFixed(2)} scale)`);
  ok(rot.pipPx >= 6, `and so does a waiting passenger (${rot.pipPx.toFixed(1)}px)`);
  ok(rot.nubHitPx >= 44, `and the nub is still grabbable (${rot.nubHitPx.toFixed(0)}px)`);
  eq(rot.off.length, 0, `and no control is off a 640x360 screen (${rot.off.join(', ')})`);

  eq(errs.length, 0, `no page errors (${errs.join(' | ')})`);

  await browser.close();
  server.close();
  console.log(`\ntoko-move page: ${pass} passed, ${fails.length} failed`);
  for (const f of fails) console.log('  FAIL  ' + f);
  process.exit(fails.length ? 1 : 0);
})();
