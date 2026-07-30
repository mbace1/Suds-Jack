// Suds Jack smoke: does it boot, does it play, does anything throw.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = require('path').resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const s = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1000, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await p.goto(base + '/sudsjack/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  ok('it boots with no errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  ok('the handle is exposed', await p.evaluate(() => !!window.__sj));
  ok('the menu is up', await p.locator('#menu').isVisible());
  ok('WebGL actually painted', await p.evaluate(() => {
    const c = document.getElementById('game');
    return c.width > 100 && !!c.getContext('webgl2');
  }));
  await p.screenshot({ path: process.env.SHOT_MENU || '/tmp/sj-menu.png' });

  // play
  await p.click('#play');
  await p.waitForTimeout(500);
  ok('play starts a run', await p.evaluate(() => window.__sj.state.mode === 'play'));
  ok('and the menu is gone', await p.locator('#menu').isHidden());

  // risers appear on their own
  await p.waitForTimeout(2500);
  const spawned = await p.evaluate(() => window.__sj.risers.items.length);
  ok('the director spawns risers (' + spawned + ')', spawned > 0);
  ok('exactly one bubble is lit',
    await p.evaluate(() => window.__sj.risers.items.filter(i => i.lit).length) === 1);

  // riding the rim
  const before = await p.evaluate(() => window.__sj.player.lane);
  await p.keyboard.down('ArrowRight');
  await p.waitForTimeout(400);
  await p.keyboard.up('ArrowRight');
  const after = await p.evaluate(() => window.__sj.player.lane);
  ok('holding right rides the rim (' + before.toFixed(2) + ' → ' + after.toFixed(2) + ')', Math.abs(after - before) > 0.4);

  // The dive commits: no lane change while down the tube. Everything here
  // waits on GAME state rather than the clock — this sandbox has no GPU and
  // renders at a handful of frames a second, so a fixed sleep measures the
  // rasteriser, not the game.
  await p.evaluate(() => window.__sj.player.dive());
  await p.waitForFunction(() => window.__sj.player.depth > 0.1, null, { timeout: 5000 });
  const dLane = await p.evaluate(() => window.__sj.player.lane);
  await p.keyboard.down('ArrowLeft');
  await p.waitForFunction(() => window.__sj.player.depth > 0.4, null, { timeout: 5000 });
  const dLane2 = await p.evaluate(() => ({ lane: window.__sj.player.lane, depth: window.__sj.player.depth }));
  await p.keyboard.up('ArrowLeft');
  ok('the dive leaves the mouth (depth ' + dLane2.depth.toFixed(2) + ')', dLane2.depth > 0.1);
  ok('and locks the lane while committed', Math.abs(dLane2.lane - dLane) < 0.02, `${dLane} → ${dLane2.lane}`);
  const back = await p.waitForFunction(() => !window.__sj.player.diving && window.__sj.player.depth < 0.02,
    null, { timeout: 8000 }).then(() => true).catch(() => false);
  ok('and comes back to the rim', back);

  // collection
  const s0 = await p.evaluate(() => window.__sj.state.score);
  const c0 = await p.evaluate(() => window.__sj.state.chain);
  await p.evaluate(() => window.__sj.debug.give('bubble'));
  await p.waitForFunction(s => window.__sj.state.score > s, s0, { timeout: 5000 }).catch(() => {});
  const s1 = await p.evaluate(() => window.__sj.state.score);
  const c1 = await p.evaluate(() => window.__sj.state.chain);
  ok('a bubble in reach is collected (' + s0 + ' → ' + s1 + ')', s1 > s0);
  ok('and the lit one raises the chain (' + c0 + ' → ' + c1 + ')', c1 > c0);

  // damage
  const l0 = await p.evaluate(() => window.__sj.state.lives);
  await p.evaluate(() => window.__sj.debug.give('grime'));
  await p.waitForFunction(l => window.__sj.state.lives < l, l0, { timeout: 5000 }).catch(() => {});
  const st = await p.evaluate(() => ({ lives: window.__sj.state.lives, chain: window.__sj.state.chain, mercy: window.__sj.player.mercy }));
  ok('grime costs a life (' + l0 + ' → ' + st.lives + ')', st.lives === l0 - 1);
  ok('and breaks the chain', st.chain === 1);
  ok('and gives you mercy frames', st.mercy > 0);

  // levels
  await p.evaluate(() => window.__sj.debug.setLevel(5));
  await p.waitForFunction(() => window.__sj.tube.shape === 'drain', null, { timeout: 5000 }).catch(() => {});
  ok('the channel changes shape per level',
    await p.evaluate(() => window.__sj.tube.shape) === 'drain');

  // ── the ridged channel: five bays, and a verb to get between them ──
  await p.evaluate(() => { window.__sj.debug.setLevel(3); window.__sj.risers.clear(); });
  await p.waitForFunction(() => window.__sj.tube.shape === 'gutters', null, { timeout: 5000 }).catch(() => {});
  const bays = await p.evaluate(() => ({ shape: window.__sj.tube.shape, peaks: window.__sj.tube.peaks }));
  ok('level 3 is the five-bay channel', bays.shape === 'gutters', bays.shape);
  ok('with a ridge between each (' + bays.peaks + ')', bays.peaks.length === 4);

  // a ridge is a wall to RIDING
  const penned = await p.evaluate(async () => {
    const j = window.__sj;
    j.player.lane = j.tube.floorLane;
    const [lo, hi] = j.tube.bayRange(j.player.lane);
    for (let i = 0; i < 60; i++) j.player.move(1, 0.05), j.player.update(0.05);   // shove right
    const right = j.player.lane;
    for (let i = 0; i < 120; i++) j.player.move(-1, 0.05), j.player.update(0.05); // and left
    return { lo, hi, right, left: j.player.lane };
  });
  ok('riding cannot cross a ridge', penned.right <= penned.hi + 0.01 && penned.left >= penned.lo - 0.01,
    JSON.stringify(penned));

  // but a jump can
  const hopped = await p.evaluate(async () => {
    const j = window.__sj;
    j.player.lane = j.tube.floorLane;
    const before = j.tube.bayRange(j.player.lane);
    const started = j.player.jump(1);
    let peak = 0;
    for (let i = 0; i < 40; i++) { j.player.update(0.02); peak = Math.max(peak, j.player.air); }
    const after = j.tube.bayRange(j.player.lane);
    return { started, peak, before, after, lane: j.player.lane };
  });
  ok('a jump starts', hopped.started);
  ok('and leaves the floor (' + hopped.peak.toFixed(1) + ' units)', hopped.peak > 1);
  ok('and lands you in the next bay', hopped.after[0] > hopped.before[0], JSON.stringify(hopped));

  // and it is a dodge: grime goes under you
  const dodged = await p.evaluate(async () => {
    const j = window.__sj;
    j.player.mercy = 0;
    j.player.jump(1);
    for (let i = 0; i < 6; i++) j.player.update(0.02);      // get some air
    const lives = j.state.lives;
    const airborne = j.player.airborne;
    j.debug.give('grime');
    for (let i = 0; i < 4; i++) j.debug.step(0.02);
    return { airborne, lives, after: j.state.lives };
  });
  ok('mid-jump you are off the floor', dodged.airborne);
  ok('and grime passes under you', dodged.after === dodged.lives,
    `${dodged.lives} → ${dodged.after}`);

  // grime is penned in too, or the bays would only ever constrain the player
  const pennedGrime = await p.evaluate(async () => {
    const j = window.__sj;
    j.risers.clear();
    j.player.lane = 1;                       // far left bay
    const it = j.risers.spawn('grime', 13, 0.02);   // far right bay
    const [lo, hi] = j.tube.bayRange(13);
    for (let i = 0; i < 200; i++) j.risers.update(0.05, j.player);
    return { lane: it.lane, lo, hi };
  });
  ok('grime cannot cross a ridge either',
    pennedGrime.lane >= pennedGrime.lo && pennedGrime.lane <= pennedGrime.hi,
    JSON.stringify(pennedGrime));
  await p.evaluate(() => { window.__sj.risers.clear(); window.__sj.player.mercy = 0; });

  // EVERY channel has to run left to right. Three of the five did not when
  // they were written, so on those levels pressing right moved you left and
  // the claw was drawn upside down — the shapes and the player disagreed
  // about which way round the channel went. A flat floor faces 0°.
  const dirs = await p.evaluate(() => {
    const j = window.__sj, out = [];
    for (let l = 1; l <= 5; l++) {
      j.debug.setLevel(l);
      const a = j.tube.at(1, 0, new (j.tube.at(0, 0).constructor)());
      const b = j.tube.at(j.tube.lanes - 2, 0, new (j.tube.at(0, 0).constructor)());
      out.push({ shape: j.tube.shape, ltr: b.x > a.x,
        floor: Math.abs(j.tube.faceAngle(j.tube.floorLane) * 180 / Math.PI) });
    }
    return out;
  });
  ok('every channel runs left to right', dirs.every(d => d.ltr),
    dirs.filter(d => !d.ltr).map(d => d.shape).join(','));
  ok('and its floor faces up in all of them',
    dirs.every(d => d.floor < 25), dirs.map(d => `${d.shape} ${d.floor.toFixed(0)}°`).join(' '));

  // the channel has ENDS: you can be cornered at a lip
  const lips = await p.evaluate(async () => {
    const j = window.__sj;
    j.player.lane = 0;
    for (let i = 0; i < 30; i++) j.debug.step(0.05);   // shove left, hard
    const low = j.player.lane;
    j.player.lane = j.tube.lanes;
    for (let i = 0; i < 30; i++) j.debug.step(0.05);
    return { low, high: j.player.lane, lanes: j.tube.lanes };
  });
  ok('lanes do not wrap round the ends',
    lips.low >= 0 && lips.high <= lips.lanes, JSON.stringify(lips));
  await p.screenshot({ path: process.env.SHOT_PLAY || '/tmp/sj-play.png' });

  // Game over. The mercy frames from the hit above are REAL — a second grime
  // inside them costs nothing, which is the point of them — so they have to be
  // spent before this means anything.
  await p.evaluate(() => { window.__sj.state.lives = 1; window.__sj.player.mercy = 0; window.__sj.debug.give('grime'); });
  await p.waitForFunction(() => window.__sj.state.mode === 'over', null, { timeout: 5000 }).catch(() => {});
  ok('the last life ends the run', await p.evaluate(() => window.__sj.state.mode) === 'over');
  ok('and the recap is up', await p.locator('#over').isVisible());
  ok('a score survives as the best',
    await p.evaluate(() => +localStorage.getItem('sudsJackHi')) > 0);
  await p.click('#again');
  await p.waitForFunction(() => window.__sj.state.mode === 'play', null, { timeout: 5000 }).catch(() => {});
  ok('again restarts', await p.evaluate(() => window.__sj.state.mode) === 'play');

  // A PAD ON ITS OWN has to be able to reach a run. The menu and the recap
  // listen for a pointer or Enter; the pad was only polled inside the play
  // branch, so a controller could ride the rim but never start. Reload for a
  // clean menu and drive a synthetic pad through both screens.
  await p.goto(base + '/sudsjack/', { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    window.__pad = { id: 'test', index: 0, connected: true, mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true, value: () => [window.__pad],
    });
  });
  await p.waitForFunction(() => window.__sj.state.mode === 'menu', null, { timeout: 5000 });
  const tap = async (i) => {
    await p.evaluate(i => { window.__pad.buttons[i].pressed = true; }, i);
    await p.waitForTimeout(120);
    await p.evaluate(i => { window.__pad.buttons[i].pressed = false; }, i);
    await p.waitForTimeout(120);
  };
  await tap(0);
  const padStarted = await p.waitForFunction(() => window.__sj.state.mode === 'play',
    null, { timeout: 5000 }).then(() => true).catch(() => false);
  ok('a pad alone starts a run from the menu', padStarted);

  // ...and that same press must not still be sitting in the dive queue, or
  // Jack leaves the mouth before you have seen the level.
  ok('and the starting press is not also a dive',
    await p.evaluate(() => !window.__sj.player.diving && window.__sj.player.depth < 0.02));

  // The recap: a press spent diving during play must not restart the run
  // under you the instant you die.
  await p.evaluate(() => { window.__sj.state.lives = 1; window.__sj.player.mercy = 0; window.__sj.debug.give('grime'); });
  await p.waitForFunction(() => window.__sj.state.mode === 'over', null, { timeout: 5000 }).catch(() => {});
  await p.waitForTimeout(300);
  ok('the recap stays up until the pad is pressed again',
    await p.evaluate(() => window.__sj.state.mode) === 'over');
  await tap(9);
  const padAgain = await p.waitForFunction(() => window.__sj.state.mode === 'play',
    null, { timeout: 5000 }).then(() => true).catch(() => false);
  ok('and Start restarts from the recap', padAgain);

  // the shell and the signature
  ok('it has a way home', await p.locator('.arcade-home').count() === 1);
  ok('and it is signed', await p.locator('.toko-signature').count() === 1);

  ok('nothing errored across the whole run', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log(`\n${pass} passed, ${fail} failed`);
  await b.close(); s.close();
  process.exit(fail ? 1 : 0);
});
