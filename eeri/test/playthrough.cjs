// EERI playthrough gate — a bot actually FINISHES every level.
//
// Why this exists, precisely. `test/rooms.mjs` proves a room is
// *reachable*: the steps are inside the jump budget, the gaps inside the
// run, the machine's track unbroken by holes. It passed SITE 1 while
// SITE 1 was impossible — a wrecking ball stood on the excavator's only
// route to the bank it had to dig, and since a hit takes the RIDE it
// threw you out of the cab every attempt. The bank could never come down.
// A proof about geometry cannot see that; only playing can.
//
// So this plays. It runs right, jumps when the run is blocked or a hole
// is ahead, boards a machine when one is in the way of progress, uses the
// verb the room needs, and it must reach the flag. If a level cannot be
// finished by a bot that never gives up, it cannot be finished.
//
// Run: NODE_PATH=$(npm root -g) node eeri/test/playthrough.cjs
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const srv = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

// The bot, as a string run inside the page: it needs to act every frame,
// and a round trip per frame over CDP would take an hour per level.
// It is deliberately DUMB — no level knowledge, no waypoints. It knows
// only: go right; jump when stuck or over a hole; if something is in the
// way that a machine clears, go get the machine and use it.
const BOT = `async (budgetMs) => {
  const E = window.__eeri;
  const sleep = (m) => new Promise((r) => setTimeout(r, m));
  const t0 = Date.now();
  const startSite = E.site();
  let best = -Infinity, stuck = 0, jumping = false, jT = 0, act = 0;
  const log = [];
  // A tireless bot will eventually beat a level a child would put down, so
  // "finished" is not enough — count what it COST. Losing the ride means
  // walking back and reading the machine again; more than a couple of those
  // in one level is a hostile arrangement even though it is passable.
  let rideLosses = 0, wasRiding = false;

  const need = () => {
    // what, if anything, only the machine can clear — and where it is
    const d = E.level.def, q = E.player;
    if (d.bank && E.debug.bank() && !E.debug.bank().cleared) return { at: d.bank.c0, verb: 'down' };
    if (d.wall && E.debug.wall() && !E.debug.wall().cleared) return { at: d.wall.c0, verb: 'down' };
    // the flattener needs no held verb at all (DESIGN §8.4) — 'down' here
    // does nothing and costs nothing; parking near the sheet is the whole
    // job, so the bot just has to arrive and sit still long enough.
    if (d.sheet && E.debug.sheet() && !E.debug.sheet().cleared) return { at: d.sheet.c0, verb: 'down' };
    // the girder is TWO actions, not one: pick it off its stack first, then
    // carry it to the seating window at the lip. A bot that only ever drove
    // at the gap sat there holding the verb with an empty hook.
    // WORLD 2: a flooded trench is the pump's job. Same shape as the bank —
    // drive at it and hold the verb — so it costs the bot one entry.
    if (d.flooded && E.debug.flooded && E.debug.flooded() && !E.debug.flooded().cleared) {
      return { at: d.flooded.c0, verb: 'down' };
    }
    if (d.girder && E.debug.girder()) {
      const g = E.debug.girder();
      if (g.state === 0) return { at: d.girder.stackX, verb: 'down' };
      if (g.state === 1) return { at: (d.girder.seat.x0 + d.girder.seat.x1) / 2, verb: 'down' };
    }
    return null;
  };

  // is the kid standing at a pipe mouth?
  const q0 = (E) => {
    const pl = E.player;
    for (const q of (E.debug.pipes() || [])) {
      for (const m of [q.a, q.b]) {
        if (Math.abs(pl.x - (m.c + 0.5)) < 0.7 && Math.abs(pl.y - m.cy) < 0.6) return q;
      }
    }
    return null;
  };

  while (Date.now() - t0 < budgetMs) {
    await sleep(16);
    if (E.site() !== startSite || E.debug.cleared()) break;   // finished it
    const q = E.player, mode = E.mode();
    if (wasRiding && mode === 'foot') rideLosses++;
    wasRiding = (mode === 'riding');

    if (mode === 'riding') {
      const job = need();
      const m = E.debug.excPos();
      // job done — GET OUT. The flag only finishes on foot, and a bot that
      // stays in the cab drives happily past the end of the level forever.
      if (!job) {
        E.debug.release('down'); E.debug.release('right'); E.debug.release('left');
        if (Date.now() - act > 400) { E.debug.press('action'); E.debug.release('action'); act = Date.now(); }
        continue;
      }
      // drive at the job, then hold the verb
      const dx = job.at - m.x;
      if (Math.abs(dx) > 2.2) {
        E.debug.release('down');
        E.debug.press(dx > 0 ? 'right' : 'left');
        E.debug.release(dx > 0 ? 'left' : 'right');
      } else {
        E.debug.release('right'); E.debug.release('left');
        E.debug.press('down');                                // dig / sling / swing
      }
      continue;
    }

    if (mode !== 'foot') continue;                            // mid mount/dismount

    // on foot: always rightward
    E.debug.press('right');
    if (q.x > best + 0.01) { best = q.x; stuck = 0; } else stuck++;

    // THE PIPE. The bot's whole vocabulary is right/left/jump/down/action/up,
    // and it has stalled on an unknown verb once already (the climb), so the
    // rule is the same shape: standing at a mouth and getting nowhere means
    // go in. It stays deliberately dumb — no routing, no idea where the far
    // end is — because a pipe that only helps a bot that plans is a pipe a
    // six-year-old will not find either.
    if (stuck > 40 && E.debug.pipes) {
      const q = q0(E);
      if (q && Date.now() - act > 400) {
        E.debug.press('action'); E.debug.release('action'); act = Date.now();
      }
    }

    // jump when the run is blocked, or a hole is coming
    const ahead = E.level.groundTop(q.x + 1.0, q.y + 0.1);
    if (q.grounded && (Math.abs(q.vx) < 1.0 || ahead < q.y - 0.5) && !jumping) {
      E.debug.press('jump'); jumping = true; jT = q.t;
    }
    // HOLD THE JUMP IN GAME SECONDS, NOT WALL SECONDS. His jump is variable
    // height — letting go while rising cuts it to a hop — and the loop
    // clamps dt to 33 ms, so under a software renderer at 13 fps the game
    // clock runs at less than half real time. A 420 ms wall-clock hold was
    // five frames, i.e. 0.17 s of HIS time: every jump in the gate was a
    // hop, and the bot sat under the first two-high step in seven levels
    // reporting a wall that is not there. player.t is the same clock the
    // jump is integrated on, so this holds for as long as a thumb would.
    if (jumping && q.t - jT > 0.42) { E.debug.release('jump'); jumping = false; }

    // stuck for a while and there is a machine job outstanding? go board it
    if (stuck > 90) {
      const job = need();
      const m = E.debug.excPos();
      if (job) {
        const dx = m.x - q.x;
        if (Math.abs(dx) > 1.6) {
          E.debug.press(dx > 0 ? 'right' : 'left');
          E.debug.release(dx > 0 ? 'left' : 'right');
        } else if (Date.now() - act > 300) {
          E.debug.press('action'); E.debug.release('action'); act = Date.now();
        }
      }
      if (stuck > 90 && stuck % 40 === 0) log.push(Math.round(q.x));
    }
  }
  for (const k of ['right', 'left', 'jump', 'down', 'action']) E.debug.release(k);
  return {
    finished: E.site() !== startSite || E.debug.cleared(),
    x: +E.player.x.toFixed(1), best: +best.toFixed(1),
    exit: E.level.def.exit.x, mode: E.mode(), stalls: log.slice(0, 6), rideLosses,
  };
}`;

srv.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 480, height: 270 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));

  await page.goto(base + '/eeri/?skip', { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__eeri && window.__eeri.player.grounded, null, { timeout: 20000 });
  const total = await page.evaluate(() => window.__eeri.debug.rooms());
  if (!Number.isInteger(total) || total < 1) { console.log('  FAIL could not read the level count'); process.exit(1); }
  console.log(`playing ${total} level(s) — the bot never gives up, so a stall is a real wall\n`);

  // ONE LEVEL AT A TIME when asked: `node playthrough.cjs 1` runs level 2
  // alone. Six levels is several minutes a run, and iterating on the one
  // that failed should not cost the five that passed.
  const only = process.argv[2] === undefined ? null : Number(process.argv[2]);
  for (let i = 0; i < total; i++) {
    if (only !== null && i !== only) continue;
    await page.evaluate((n) => window.__eeri.debug.goSite(n), i);
    // WAIT FOR THE ROOM, not for a number of milliseconds. A level change now
    // fades down, builds and fades up (js/main.js's veil), so a flat 1200 ms
    // could hand the bot a room that is still being assembled — and it would
    // report that as a wall. `transitioning` is the game's own answer to "is
    // the change finished".
    await page.waitForFunction((n) => window.__eeri.site() === n
      && !window.__eeri.debug.transitioning(), i, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(400);
    const name = await page.evaluate(() => window.__eeri.level.def.name);
    // The sandbox has no GPU, so the game runs in slow motion and the
    // budget is wall-clock generous rather than tuned to real play. The
    // viewport is small for the same reason: fewer pixels to rasterise is
    // the cheapest speed-up available to a software renderer.
    const r = await page.evaluate(new Function('return ' + BOT)(), 300000);
    ok(`${name} can be finished`, r.finished,
      `got to x=${r.best} of ${r.exit}, mode=${r.mode}${r.stalls.length ? `, stalled at ${r.stalls}` : ''}`);
    // the ride is meant to be lost to a mistake, not to the level's layout
    ok(`${name} does not keep throwing you out of the cab (${r.rideLosses})`,
      !r.finished || r.rideLosses <= 3,
      `lost the ride ${r.rideLosses} times — something is standing on the machine's route`);
  }

  ok('no page errors across the whole playthrough', errs.length === 0, errs.slice(0, 2).join(' | '));

  await b.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
