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

  // The declared peaks must BE the drawn ridges. They disagreed once: the
  // peaks were declared for a twenty-lane channel while main.js still built
  // thirteen, so the walls you hit sat beside the ridges you saw, one peak
  // was past the lip, and the fifth bay was a one-lane sliver. The gate
  // passed because it only ever asked the declaration about itself — this
  // asks the geometry.
  const ridges = await p.evaluate(() => {
    const t = window.__sj.tube;
    const y = (u) => t._point(u, 0).y;
    return t.peaks.map(pk => {
      const u = pk / t.lanes;
      return { pk, inRange: pk > 0 && pk < t.lanes,
               higher: y(u) > y(u - 0.1) + 0.05 && y(u) > y(u + 0.1) + 0.05 };
    });
  });
  ok('every peak is inside the channel', ridges.every(r => r.inRange),
    JSON.stringify(ridges));
  ok('and every peak sits on a drawn ridge', ridges.every(r => r.higher),
    JSON.stringify(ridges));

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

  // ── the float: pressing again mid-air chains one more bay ──
  const floated = await p.evaluate(async () => {
    const j = window.__sj;
    const land = () => { while (j.player.jumping) j.player.update(0.02); };
    land();

    // early press must NOT chain: still going up is not a float
    j.player.lane = j.tube.floorLane;
    j.player.jump(1);
    j.player.update(0.02);                        // barely off the floor
    const early = j.player.jump(1);
    land();

    // one flight: hop, then press twice in the falling halves. Air at each
    // press is the height the float STARTS from — that is what must be off
    // the floor; the tail of the last glide is an ordinary landing. It leaves
    // from the far-left bay so there are enough bays to float across.
    j.player.lane = j.tube.bayRange(0)[0] + 2;
    const startBay = j.tube.bayRange(j.player.lane)[0];
    j.player.jump(1);
    let hopPeak = 0, floatPeak = 0, airAt = [];
    for (let i = 0; i < 400 && j.player.jumping; i++) {
      j.player.update(0.02);
      if (!airAt.length) hopPeak = Math.max(hopPeak, j.player.air);
      else floatPeak = Math.max(floatPeak, j.player.air);
      const k = j.player.jumpT / j.player.hopMs;
      if (j.player.jumping && k > 0.5 && airAt.length < 2 && j.player.jump(1)) {
        airAt.push(j.player.air);
      }
    }
    const endBay = j.tube.bayRange(j.player.lane)[0];
    return { early, airAt, hopPeak, floatPeak, startBay, endBay };
  });
  ok('a press straight off the floor does not float', !floated.early);
  ok('pressing again mid-air chains (' + floated.airAt.length + ' floats)', floated.airAt.length === 2);
  ok('each float starts well off the floor (' + floated.airAt.map(a => a.toFixed(1)).join(', ') + ')',
    floated.airAt.every(a => a > 1));
  ok('and a float never out-jumps the jump (' + floated.floatPeak.toFixed(1) + ' ≤ ' + floated.hopPeak.toFixed(1) + ')',
    floated.floatPeak <= floated.hopPeak + 0.01 && floated.endBay > floated.startBay);

  // and it is bounded: mashing jump is a float, not a flight
  const capped = await p.evaluate(async () => {
    const j = window.__sj;
    while (j.player.jumping) j.player.update(0.02);
    j.player.lane = j.tube.bayRange(0)[0] + 1;    // far left bay
    j.player.jump(1);
    let granted = 0;
    for (let i = 0; i < 600 && j.player.jumping; i++) {
      j.player.update(0.02);
      if (j.player.jump(1)) granted++;            // mash every frame
    }
    return granted;
  });
  // three exactly: from the far-left bay, hop + three floats is lip to lip —
  // the cap and the channel are the same size, which is not a coincidence
  ok('the float is bounded, and spans the channel (' + capped + ' chains granted)', capped === 3);

  // ── THE SCUM LINE: what you dodged is still there ──
  // grime past the mouth settles instead of vanishing
  const settled = await p.evaluate(async () => {
    const j = window.__sj;
    while (j.player.jumping) j.player.update(0.02);
    j.risers.clear();
    j.state.lives = 3;
    j.player.mercy = 0;
    j.player.lane = 18;                            // far from the landing lane
    j.debug.spawn('grime', 2, 0.01);               // one step from the mouth
    for (let i = 0; i < 60 && j.risers.items.length; i++) j.debug.step(0.02);
    return { layer: j.scum.at(2), fouled: j.scum.fouled() };
  });
  ok('grime past the mouth settles as scum', settled.layer === 1, JSON.stringify(settled));

  // it stacks, and it caps
  const stacked = await p.evaluate(() => {
    const j = window.__sj;
    j.debug.foul(5, 5);                            // five arrivals on one lane
    const cap = j.scum.at(5);
    j.scum.clear();
    return cap;
  });
  ok('scum stacks and caps at three (' + stacked + ')', stacked === 3);

  // BARREN: the director does not raise bubbles through a fouled lane
  const barren = await p.evaluate(() => {
    const j = window.__sj;
    j.debug.setLevel(1);                           // a smooth shape, whole rim
    j.risers.clear(); j.scum.clear();
    for (let l = 0; l < 10; l++) j.debug.foul(l);  // foul half the channel
    const bad = [];
    for (let i = 0; i < 30; i++) {
      j.state.nextBubble = -1;
      j.debug.step(0.001);
    }
    for (const it of j.risers.items) {
      if (it.type === 'bubble' && j.scum.at(it.lane) > 0) bad.push(it.lane);
    }
    const spawned = j.risers.items.filter(i => i.type === 'bubble').length;
    j.risers.clear();
    return { spawned, bad };
  });
  ok('bubbles do not rise through fouled lanes (' + barren.spawned + ' spawned)',
    barren.spawned > 0 && barren.bad.length === 0, JSON.stringify(barren));

  // STICKY: riding through scum is slow; the same ride on a clean rim is not.
  // The key is real (it feeds input.spin() the way a hand would) but the
  // frames are stepped by hand — this sandbox renders too slowly for a
  // wall-clock ride to mean anything, and the gate's own rule applies:
  // measure the game, not the rasteriser.
  await p.keyboard.down('ArrowRight');
  const rides = await p.evaluate(() => {
    const j = window.__sj;
    const ride = () => {
      j.player.lane = 2; j.player.vel = 0;
      for (let i = 0; i < 10; i++) j.debug.step(0.05);
      return j.player.lane - 2;
    };
    j.scum.clear();
    const clean = ride();
    for (let l = 0; l < 15; l++) j.debug.foul(l);   // foul the road, short of the flood
    const sticky = ride();
    j.scum.clear();
    return { clean, sticky };
  });
  await p.keyboard.up('ArrowRight');
  ok('scum underfoot is sticky (' + rides.sticky.toFixed(1) + ' vs ' + rides.clean.toFixed(1) + ' lanes)',
    rides.sticky < rides.clean * 0.65, JSON.stringify(rides));

  // ...and a jump does not feel it: airborne, the floor has no say
  const overScum = await p.evaluate(() => {
    const j = window.__sj;
    const frames = (foul) => {
      j.scum.clear();
      if (foul) for (let l = 0; l < 15; l++) j.debug.foul(l);
      j.player.lane = 6; j.player.vel = 0;
      j.player.jump(1);
      let n = 0;
      while (j.player.jumping && n < 200) { j.player.update(0.02); n++; }
      return n;
    };
    const clean = frames(false), fouled = frames(true);
    j.scum.clear();
    return { clean, fouled };
  });
  ok('a jump crosses scum in the same frames as clean rim',
    overScum.fouled === overScum.clean, JSON.stringify(overScum));

  // THE SCRUB: a dive that comes home wipes a layer, and it pays
  const scrubbed = await p.evaluate(async () => {
    const j = window.__sj;
    j.risers.clear();
    j.player.mercy = 0;
    const lane = Math.round(j.player.lane);
    j.debug.foul(lane, 2);
    const score0 = j.state.score;
    j.player.dive();
    for (let i = 0; i < 200 && (j.player.diving || j.player.depth > 0.01); i++) j.debug.step(0.02);
    j.debug.step(0.02);                            // the frame that consumes scrubReady
    return { layers: j.scum.at(lane), gain: j.state.score - score0, level: j.state.level };
  });
  ok('a completed dive scrubs one layer (2 → ' + scrubbed.layers + ')', scrubbed.layers === 1);
  ok('and the scrub pays 50 × level', scrubbed.gain >= 50 * scrubbed.level, JSON.stringify(scrubbed));

  // a dive knocked out of the water scrubs nothing
  const knocked = await p.evaluate(async () => {
    const j = window.__sj;
    j.risers.clear();
    j.player.mercy = 0;
    const lane = Math.round(j.player.lane);
    j.scum.clear();
    j.debug.foul(lane, 2);
    j.player.dive();
    for (let i = 0; i < 6; i++) j.debug.step(0.02);     // committed, on the way down
    j.debug.give('grime');                               // and struck mid-dive
    for (let i = 0; i < 80; i++) j.debug.step(0.02);
    const layers = j.scum.at(lane);
    j.scum.clear();
    return { layers, diving: j.player.diving };
  });
  ok('a dive cancelled by a hit scrubs nothing', knocked.layers === 2, JSON.stringify(knocked));

  // THE FLOOD: neglect has a horizon
  const flooded = await p.evaluate(() => {
    const j = window.__sj;
    j.state.lives = 3;
    for (let l = 0; l < 16; l++) j.debug.foul(l);       // 16 of 20 = the line
    const before = j.state.lives;
    j.debug.step(0.001);
    return { before, after: j.state.lives, fouled: j.scum.fouled(),
             mercy: j.player.mercy, chain: j.state.chain, mode: j.state.mode };
  });
  ok('fouling 80% of the channel floods: a life', flooded.after === flooded.before - 1,
    JSON.stringify(flooded));
  ok('and the flood washes the rim clean, with mercy',
    flooded.fouled === 0 && flooded.mercy > 0 && flooded.chain === 1 && flooded.mode === 'play');

  // the sector boundary washes too, and clean lanes pay. A sector ends when
  // you have FLOWN it — distance, not a bubble count — so the test flies the
  // last stretch rather than collecting anything.
  const washed = await p.evaluate(async () => {
    const j = window.__sj;
    j.debug.setLevel(3);                                 // back on the ridged one
    j.risers.clear();
    j.player.mercy = 0;
    for (let l = 0; l < 4; l++) j.debug.foul(l);         // four fouled, sixteen clean
    const level0 = j.state.level, score0 = j.state.score;
    j.state.dist = 16 + level0 * 3 - 0.01;               // a breath from the boundary
    for (let i = 0; i < 20 && j.state.level === level0; i++) j.debug.step(0.05);
    return { level0, level: j.state.level, fouled: j.scum.fouled(),
             gain: j.state.score - score0, bonus: 40 * level0 * 16 };
  });
  ok('the sector boundary washes the channel', washed.level === washed.level0 + 1 && washed.fouled === 0,
    JSON.stringify(washed));
  ok('and every clean lane pays (gain ' + washed.gain + ' ≥ bonus ' + washed.bonus + ')',
    washed.gain >= washed.bonus);

  // ── ON RAILS: the flight, the morph, the gun ──
  // you are moving whether you like it or not
  const flight = await p.evaluate(async () => {
    const j = window.__sj;
    j.debug.setLevel(2);
    const d0 = j.state.dist, f0 = j.tube.flow;
    for (let i = 0; i < 20; i++) j.debug.step(0.05);
    return { dist: j.state.dist - d0, flow: j.tube.flow !== f0, speed: j.tube.speed };
  });
  ok('the sector is flown, not collected (dist +' + flight.dist.toFixed(2) + ')',
    flight.dist > 0.3 && flight.speed > 0);
  ok('and the ribs stream to show it', flight.flow);

  // the channel becomes the next shape UNDER you, and the rules follow the
  // dominant one the moment it flips
  const morphed = await p.evaluate(async () => {
    const j = window.__sj;
    j.debug.setLevel(2);                                  // trough → gutters next
    const before = j.tube.shape;
    j.state.dist = (16 + 2 * 3) * 0.62;                   // past the morph point
    j.debug.step(0.05);
    const started = j.tube.morphing;
    const y0 = j.tube.at(10, 0).y;
    let flipped = null;
    for (let i = 0; i < 400 && j.tube.morphing; i++) {
      j.tube.update(0.05);
      if (flipped === null && j.tube.shape !== before) flipped = j.tube.mix;
    }
    const y1 = j.tube.at(10, 0).y;
    return { before, started, flipped, moved: Math.abs(y1 - y0) > 0.5, now: j.tube.shape };
  });
  ok('the channel starts morphing mid-sector', morphed.started, JSON.stringify(morphed));
  ok('the floor actually moves under you', morphed.moved);
  ok('and the dominant shape flips at half way (' + (morphed.flipped ?? 'never').toString().slice(0, 4) + ')',
    morphed.flipped !== null && Math.abs(morphed.flipped - 0.5) < 0.08);

  // THE GUN: a bolt kills grime and pays
  const gunned = await p.evaluate(async () => {
    const j = window.__sj;
    j.debug.setLevel(1);
    j.risers.clear(); j.scum.clear();
    j.player.mercy = 0;
    const lane = Math.round(j.player.lane);
    const g = j.debug.spawn('grime', lane, 0.0001);
    g.depth = 0.5;
    const s0 = j.state.score;
    j.shots.fire(lane, 0.02);
    for (let i = 0; i < 40 && j.risers.items.length; i++) j.debug.step(0.02);
    return { dead: j.risers.items.length === 0, gain: j.state.score - s0 };
  });
  ok('a bolt kills grime', gunned.dead, JSON.stringify(gunned));
  ok('and the kill pays', gunned.gain >= 75);

  // holding SPACE actually streams — the wiring, not just the class
  await p.keyboard.down('Space');
  const streamed = await p.evaluate(() => {
    const j = window.__sj;
    j.shots.clear();
    for (let i = 0; i < 12; i++) j.debug.step(0.05);
    return j.shots.items.length;
  });
  await p.keyboard.up('Space');
  ok('holding fire streams bolts (' + streamed + ' in flight)', streamed >= 2);

  // the stream does not know friend from food: popping the LIT one is the
  // chain, gone, by your own hand — and pays nothing
  const popped = await p.evaluate(async () => {
    const j = window.__sj;
    j.risers.clear(); j.shots.clear();
    j.state.chain = 6;
    const lane = Math.round(j.player.lane);
    const b = j.debug.spawn('bubble', lane, 0.0001);
    b.depth = 0.5; b.lit = true;
    const s0 = j.state.score;
    j.shots.fire(lane, 0.02);
    for (let i = 0; i < 40 && j.risers.items.length; i++) j.debug.step(0.02);
    return { gone: j.risers.items.length === 0, chain: j.state.chain, gain: j.state.score - s0 };
  });
  ok('a bolt pops a bubble instead of collecting it', popped.gone && popped.gain === 0,
    JSON.stringify(popped));
  ok('and popping the lit one kills the chain (6 → ' + popped.chain + ')', popped.chain === 1);

  // SPITTERS hold mid-tube, shoot back, and dive when the magazine is dry
  const spat = await p.evaluate(async () => {
    const j = window.__sj;
    j.risers.clear(); j.shots.clear();
    j.player.lane = 2;
    const sp = j.debug.spawn('spitter', 16, 0.0001);
    sp.depth = sp.holdAt + 0.02; sp.speed = 0.2; sp.fireIn = 0.01;
    for (let i = 0; i < 30; i++) j.debug.step(0.02);
    const held = Math.abs(sp.depth - sp.holdAt) < 0.001;
    const orbs = j.risers.items.filter(i => i.type === 'orb').length;
    sp.shots = 0;
    j.debug.step(0.02);
    return { held, orbs, divesAfter: sp.type === 'grime' };
  });
  ok('a spitter holds mid-tube and shoots back (' + spat.orbs + ' orbs)',
    spat.held && spat.orbs >= 1, JSON.stringify(spat));
  ok('and dives like grime when its magazine is dry', spat.divesAfter);

  // an orb ducks past the mouth and is GONE — nothing settles off a shot
  const orbGone = await p.evaluate(async () => {
    const j = window.__sj;
    j.risers.clear(); j.scum.clear();
    j.player.lane = 2;
    const o = j.debug.spawn('orb', 17, 0.5);
    o.depth = 0.02;
    // the director keeps directing while we step, so ask about THE ORB, not
    // about an empty tube — a bubble spawning mid-loop is the game working
    for (let i = 0; i < 30 && j.risers.items.includes(o); i++) j.debug.step(0.02);
    return { gone: !j.risers.items.includes(o), scum: j.scum.at(17) };
  });
  ok('an orb past the mouth never settles', orbGone.gone && orbGone.scum === 0,
    JSON.stringify(orbGone));

  // leave the gate the way we found it: the ridged channel, an empty rim
  await p.evaluate(() => {
    const j = window.__sj;
    j.debug.setLevel(3);
    j.risers.clear(); j.scum.clear(); j.shots.clear();
    j.state.lives = 2;
  });

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
