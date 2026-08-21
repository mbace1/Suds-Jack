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
  eq(board.locked, 0, 'the first mission is not locked behind anything');

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
  // The world stays STILL. The crash is in the render path, which runs every
  // frame whether the clock does or not, so pausing reproduces it just as well
  // — and running live let a stop spawn mid-drag and broke the setup instead.
  const l0 = await pAt(0), l1 = await pAt(1), l2 = await pAt(2);
  await phone.mouse.move(l0.x, l0.y); await phone.mouse.down();
  await phone.mouse.move(l1.x, l1.y, { steps: 8 });
  await phone.mouse.move(l2.x, l2.y, { steps: 8 });
  await phone.mouse.up();
  // Put the train on the LAST leg deliberately. Waiting and hoping it drifts
  // there is a coin toss — the first cut of this check passed happily with the
  // fix reverted, which makes it worse than no check.
  const placed = await phone.evaluate(() => {
    const l = window.__tm.net.lines[0];
    if (!l || !l.trains.length || l.segCount() < 2) return false;
    const t = l.trains[0];
    t.segIdx = l.segCount() - 1; t.p = 0.4; t.dir = 1;
    return true;
  });
  ok(placed, 'a train can be put out on the last leg for the test');
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
