// Kindling — headless smoke test.
//   node kindling/test/smoke.cjs
// Needs the `playwright` package resolvable (a global install is fine:
// NODE_PATH=<global node_modules>) and a Playwright-managed Chromium.
//
// Everything here is driven off GAME STATE rather than the wall clock. Two
// reasons, both learned elsewhere in this repo: a sandbox with no GPU renders a
// dithered scene at a handful of frames a second, so a test that waits for
// seconds is a coin flip; and the parts of this app that take real time (a
// ninety-second errand, a sixty-four-second breathing set, a day turning over)
// would otherwise make the gate slower than the thing it is gating.
//
// What it covers:
//  - it boots clean, and the room is actually painted
//  - the sheet: ticking, unticking, and the once-only payout that stops a line
//    being farmed on and off
//  - the check-in, and that changing it is free
//  - the breathing machine's phases, per-round banking, and early stopping
//  - the errand: the cost, the wait, that it survives a reload, that its report
//    is fixed at departure, and that it always comes home with something to say
//  - the day turning over: the sheet clears, the journal keeps it, and nothing
//    else is taken away
//  - the light IS the reward: more care means a measurably brighter room, and
//    the far side of it only exists on a full fire
//  - the copy never scolds (a real check, because that is the design rule)
//  - room life (Slice 1): the creature has its own business, saying hello pays
//    nothing, the window follows the local clock, and the fire has five bands
//  - the offline shell names files that exist, at the tokens the page asks for
//  - a 44px floor on every control, AA contrast, no sideways scroll on a phone

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/plain',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

let pass = 0, fail = 0;
function check(what, ok) {
  console.log(`${ok ? '  ok ' : 'FAIL '} ${what}`);
  ok ? pass++ : fail++;
}

// ── contrast, the same way the hub's gate measures it ──
const lum = ([r, g, b]) => {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const rgb = str => str.match(/\d+/g).slice(0, 3).map(Number);

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 620, height: 1000 } });
  const page = await ctx.newPage();
  const noise = [];
  page.on('console', m => { if (m.type() === 'error') noise.push(m.text()); });
  page.on('pageerror', e => noise.push('pageerror: ' + e.message));

  const open = async () => {
    await page.goto(`${base}/kindling/`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__kd, null, { timeout: 10000 });
  };
  await open();

  // ── it boots ──
  check('the page loads with no console or page errors' + (noise.length ? ` — ${noise[0]}` : ''),
    noise.length === 0);
  check('the app exposes its handle for the console', await page.evaluate(() => !!window.__kd?.debug));

  const painted = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
    return { lit, w: c.width, h: c.height };
  });
  check(`the room is painted, not a blank canvas (${painted.lit} lit pixels)`, painted.lit > 500);
  check('at the resolution the art is drawn for', painted.w === 192 && painted.h === 128);

  // it must MOVE on its first screen — a still opening reads as a broken page
  const moved = await page.evaluate(async () => {
    const c = document.querySelector('canvas');
    const grab = () => c.toDataURL();
    const a = grab();
    await new Promise(r => setTimeout(r, 320));
    return a !== grab();
  });
  check('and the fire is alive on the first screen', moved);

  // ── the sheet ──
  const fresh = await page.evaluate(() => ({
    tasks: __kd.debug.tasks().length,
    cared: __kd.debug.cared(),
    fuel: __kd.state.fuel,
    warmth: __kd.debug.warmth(),
    streak: __kd.debug.streak(),
    stage: __kd.debug.stage(),
  }));
  check(`a fresh sheet has ${fresh.tasks} lines on it and nothing ticked`,
    fresh.tasks === 6 && fresh.cared === 0 && fresh.fuel === 0);
  check('the fire is banked to coals, and the streak is honestly zero',
    fresh.warmth === 0 && fresh.streak === 0 && fresh.stage === 'spark');

  await page.locator('.task').first().click();
  const one = await page.evaluate(() => ({
    cared: __kd.debug.cared(), fuel: __kd.state.fuel, streak: __kd.debug.streak(),
    pressed: document.querySelector('.task').getAttribute('aria-pressed'),
    said: document.getElementById('say').textContent,
  }));
  check('ticking one line marks it, pays a kindling and starts the streak',
    one.cared === 1 && one.fuel === 1 && one.streak === 1 && one.pressed === 'true');
  check(`and the app says what it did ("${one.said.slice(0, 42)}…")`, one.said.length > 10);

  await page.locator('.task').first().click();
  const off = await page.evaluate(() => ({
    cared: __kd.debug.cared(), fuel: __kd.state.fuel, kept: __kd.state.kept,
    pressed: document.querySelector('.task').getAttribute('aria-pressed'),
  }));
  check('unticking takes the mark off — and takes nothing else away',
    off.cared === 0 && off.pressed === 'false' && off.fuel === 1 && off.kept === 1);

  await page.locator('.task').first().click();
  await page.locator('.task').first().click();
  await page.locator('.task').first().click();
  const farmed = await page.evaluate(() => ({ fuel: __kd.state.fuel, kept: __kd.state.kept }));
  check('and ticking the same line on and off again pays nothing more',
    farmed.fuel === 1 && farmed.kept === 1);

  // ── the check-in ──
  await page.locator('.mood').nth(2).click();
  const mood1 = await page.evaluate(() => ({ fuel: __kd.state.fuel, mood: __kd.state.sheet.mood }));
  check('checking in counts as care', mood1.mood === 'ok' && mood1.fuel === 2);
  await page.locator('.ask .link').click();               // "change"
  await page.locator('.mood').nth(4).click();
  const mood2 = await page.evaluate(() => ({ fuel: __kd.state.fuel, mood: __kd.state.sheet.mood }));
  check('and changing your mind is free', mood2.mood === 'bright' && mood2.fuel === 2);

  // ── a custom line of your own ──
  await page.locator('.add input').fill('called my brother');
  await page.locator('.add .btn').click();
  const added = await page.evaluate(() => __kd.debug.tasks().length);
  check('a line you write yourself joins the list', added === 7);
  await page.locator('.sheet .drop').first().click();
  check('and can be taken off it again', await page.evaluate(() => __kd.debug.tasks().length) === 6);

  // ── the breathing machine, stepped rather than waited out ──
  const breath = await page.evaluate(async () => {
    const { makeBreath, ROUNDS } = await import('./js/breathe.js?v=2');
    const rounds = [];
    let done = false;
    const m = makeBreath({ onRound: n => rounds.push(n), onDone: () => { done = true; } });
    const seen = [];
    const full = [];
    for (let i = 0; i < 4000 && !done; i++) {
      m.update(0.05);
      if (!seen.length || seen[seen.length - 1] !== m.phase) seen.push(m.phase);
      full.push(m.fullness);
    }
    return { seen: seen.slice(0, 5), rounds, done, ROUNDS, peak: Math.max(...full), floor: Math.min(...full) };
  });
  check(`the breath walks in · hold · out · rest (${breath.seen.slice(0, 4).join(' · ')})`,
    breath.seen.slice(0, 4).join() === 'in,hold,out,rest');
  check(`it banks every round as it finishes (${breath.rounds.join(',')})`,
    breath.rounds.length === breath.ROUNDS && breath.done);
  check('and the lungs actually fill and empty', breath.peak === 1 && breath.floor === 0);

  // one frame, because the fire is driven by the loop rather than by the click
  const inBreath = await page.evaluate(async () => {
    __kd.debug.breathe();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      page: __kd.view.page,
      label: document.getElementById('breath-label')?.textContent,
      flame: __kd.view.flame,
    };
  });
  check('starting it takes over the screen and drives the fire',
    inBreath.page === 'breathe' && typeof inBreath.label === 'string' && inBreath.flame > 0);
  await page.locator('.breathing .btn').click();
  check('stopping early comes back to the sheet without a telling-off',
    await page.evaluate(() => __kd.view.page) === 'today');

  // ── the errand ──
  await page.evaluate(() => { __kd.state.fuel = 1; __kd.debug.render(); });
  await page.evaluate(() => __kd.debug.sendOut());
  check('an errand it cannot afford does not happen',
    await page.evaluate(() => !__kd.state.errand));
  check('and it says so rather than doing nothing',
    /kindling/i.test(await page.locator('#say').textContent()));

  await page.evaluate(() => __kd.debug.give(3));
  await page.evaluate(() => __kd.debug.sendOut());
  const out = await page.evaluate(() => ({
    fuel: __kd.state.fuel,
    out: !!__kd.state.errand?.out,
    btn: document.querySelector('.btn.send')?.textContent,
    disabled: document.querySelector('.btn.send')?.disabled,
  }));
  check('sending it out spends the kindling', out.out && out.fuel === 1);
  check(`and the button becomes the clock ("${out.btn}")`, /back in \d:\d\d/.test(out.btn) && out.disabled);

  // the report is rolled at DEPARTURE: the same errand always tells the same
  // story, however many times the page is reloaded before it gets home
  const stable = await page.evaluate(async () => {
    const { report } = await import('./js/errand.js?v=2');
    const e = __kd.state.errand;
    const a = report(e, []), b = report(e, []);
    return a.lines.join('|') === b.lines.join('|') && a.thing === b.thing;
  });
  check('its outcome is fixed when it leaves, not when it arrives', stable);

  await open();                                            // and it survives this
  const survived = await page.evaluate(() => ({
    out: !!__kd.state.errand?.out,
    btn: document.querySelector('.btn.send')?.textContent,
    said: document.getElementById('say').textContent,
  }));
  check('a reload does not bring it home early or lose it', survived.out
    && /back in/.test(survived.btn) && /window|out/i.test(survived.said));

  await page.evaluate(() => __kd.debug.finishErrand());
  const back = await page.evaluate(() => ({
    out: !!__kd.state.errand?.out,
    lines: __kd.state.journal[0].lines.length,
    found: __kd.state.found.length,
    said: document.getElementById('say').textContent,
  }));
  check('when the clock runs out it comes home', !back.out);
  check(`with something to say about it (${back.lines} lines in today's journal)`, back.lines >= 2);
  check('and often, but not always, something for the shelf', back.found >= 0);
  check(`the room says it too ("${back.said.slice(0, 40)}…")`, /home/i.test(back.said));

  // ── the light is the reward ──
  const brightness = await page.evaluate(async () => {
    const c = document.querySelector('canvas');
    const read = () => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
      return sum / (d.length / 4);
    };
    // the far wall: the door only exists on a day that reached it
    const farWall = () => {
      const d = c.getContext('2d').getImageData(158, 60, 24, 30).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
      return lit;
    };
    // The fire EASES toward the day, so the level is set on the view directly
    // and one frame is taken: waiting for the ease to land would be timing the
    // wall clock, which is the thing this gate does not do.
    const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const s = __kd.state;
    s.sheet.done = []; s.sheet.mood = null; s.sheet.breaths = 0;
    __kd.view.shown = 0;
    await frame();
    const cold = { mean: read(), far: farWall() };
    s.sheet.done = __kd.debug.tasks(); s.sheet.mood = 'ok';
    __kd.view.shown = 1;
    await frame();
    const warm = { mean: read(), far: farWall() };
    return { cold, warm };
  });
  check(`a full day is a measurably brighter room (${brightness.cold.mean.toFixed(1)} → ${brightness.warm.mean.toFixed(1)})`,
    brightness.warm.mean > brightness.cold.mean * 1.5);
  check(`and the far side of the room only exists on a full fire (${brightness.cold.far} → ${brightness.warm.far} lit)`,
    brightness.cold.far < 10 && brightness.warm.far > 120);

  // ── the day turning over ──
  const rolled = await page.evaluate(() => {
    const before = {
      fuel: __kd.state.fuel, kept: __kd.state.kept, found: __kd.state.found.length,
      journalDays: __kd.state.journal.length,
    };
    __kd.debug.ageDay(1);
    return {
      before,
      cared: __kd.debug.cared(),
      streak: __kd.debug.streak(),
      fuel: __kd.state.fuel,
      kept: __kd.state.kept,
      found: __kd.state.found.length,
      journalDays: __kd.state.journal.length,
      said: document.getElementById('say').textContent,
    };
  });
  check('a new day clears the sheet', rolled.cared === 0);
  check('yesterday stays in the journal', rolled.journalDays === rolled.before.journalDays);
  check('the streak survives one night', rolled.streak > 0);
  check('and nothing else is taken away',
    rolled.fuel === rolled.before.fuel && rolled.kept === rolled.before.kept
    && rolled.found === rolled.before.found);
  check(`the day is announced kindly ("${rolled.said}")`, /new day/i.test(rolled.said));

  const lapsed = await page.evaluate(() => {
    __kd.debug.ageDay(4);
    return {
      streak: __kd.debug.streak(), stored: __kd.state.streak,
      fuel: __kd.state.fuel, kept: __kd.state.kept, found: __kd.state.found.length,
    };
  });
  check('a streak counted back from today shows zero once it has lapsed', lapsed.streak === 0);
  check('and the missed days cost nothing but the count',
    lapsed.fuel > 0 && lapsed.kept > 0 && lapsed.found >= 0);

  // picking it back up starts a fresh streak rather than punishing the gap
  await page.evaluate(() => { __kd.debug.render(); });
  await page.locator('.task').first().click();
  check('picking it up again simply starts a new one',
    await page.evaluate(() => __kd.debug.streak()) === 1);

  // ── the growth ──
  const grew = await page.evaluate(() => {
    __kd.state.kept = 79;
    const before = __kd.debug.stage();
    __kd.state.kept = 80;
    return { before, after: __kd.debug.stage() };
  });
  check(`it grows on what you kept, not on time spent (${grew.before} → ${grew.after})`,
    grew.before === 'keeper' && grew.after === 'elder');

  // ── the rule the whole app is built on ──
  const scolding = await page.evaluate(async () => {
    const files = ['main.js', 'state.js', 'errand.js', 'breathe.js', 'idle.js'];
    const bad = /\b(you failed|failure|don't break|do not break|you should have|lazy|shame|punish|guilt)\b/i;
    const hits = [];
    for (const f of files) {
      const src = await fetch(`./js/${f}?v=1`).then(r => r.text());
      // only the strings the app can actually say, not the notes about them
      for (const line of src.split('\n')) {
        if (line.trim().startsWith('//')) continue;
        for (const m of line.matchAll(/'([^']{6,})'|`([^`]{6,})`/g)) {
          const text = m[1] ?? m[2];
          if (bad.test(text)) hits.push(`${f}: ${text.slice(0, 40)}`);
        }
      }
    }
    return hits;
  });
  check(`nothing it can say to you is a telling-off${scolding.length ? ` — ${scolding[0]}` : ''}`,
    scolding.length === 0);

  // ── room life (BETTERMENT_DESIGN Slice 1) ──
  //
  // The creature wanders, looks at things and can be greeted. The assertion that
  // matters is the LAST one: none of it may pay. "Screen time earns nothing" is
  // the rule that separates this from a game that wants you holding the phone,
  // so it is checked rather than trusted.
  await page.evaluate(() => {                       // a warm room, so it potters
    __kd.state.sheet.done = __kd.debug.tasks();
    __kd.state.found = ['cone', 'stone'];
    __kd.debug.render();
  });
  const life = await page.evaluate(() => {
    const before = { fuel: __kd.state.fuel, kept: __kd.state.kept, cared: __kd.debug.cared() };
    const seen = new Set(), poses = new Set(), xs = new Set();
    for (let i = 0; i < 90; i++) {
      const r = __kd.debug.idleStep(1);
      if (r.behaviour) seen.add(r.behaviour);
      poses.add(r.pose);
      xs.add(Math.round(r.x));
    }
    return {
      before, after: { fuel: __kd.state.fuel, kept: __kd.state.kept, cared: __kd.debug.cared() },
      behaviours: [...seen], poses: [...poses], places: xs.size,
    };
  });
  check(`the creature gets on with things by itself (${life.behaviours.join(', ') || 'nothing'})`,
    life.behaviours.length >= 2);
  check(`it walks about the room rather than sitting on one pixel (${life.places} positions)`,
    life.places > 6 && life.poses.includes('walk'));
  check('and ninety seconds of watching it earns exactly nothing',
    life.after.fuel === life.before.fuel && life.after.kept === life.before.kept
    && life.after.cared === life.before.cared);

  const hello = await page.evaluate(async () => {
    const before = { fuel: __kd.state.fuel, kept: __kd.state.kept };
    const btn = [...document.querySelectorAll('.acts .btn')].find(b => /hello/i.test(b.textContent));
    btn?.click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      had: !!btn, pose: __kd.idle.pose, said: document.getElementById('say').textContent,
      paid: __kd.state.fuel !== before.fuel || __kd.state.kept !== before.kept,
    };
  });
  check(`saying hello is a thing you can do (${hello.pose})`, hello.had && hello.pose === 'perk');
  check(`it answers ("${hello.said.slice(0, 34)}…")`, hello.said.length > 8);
  check('and it pays nothing at all, which is the point of it', !hello.paid);

  // the window is read off the local clock — and off nothing else
  const sky = await page.evaluate(async () => {
    const { skyOf } = await import('./js/room.js?v=2');
    const at = (h, d = 15) => skyOf(new Date(2026, 7, d, h, 0, 0));
    return {
      night: at(23).key, noon: at(13).key, dawn: at(6).key, dusk: at(19).key,
      sameEvening: at(21).key === at(22, 15).key ? 'same' : 'different',
      otherNight: at(23, 16).key,
      stars: { night: at(23).stars, noon: at(13).stars },
    };
  });
  check(`the window knows what time it is (${sky.noon.split(':')[0]} at one, ${sky.night.split(':')[0]} at eleven)`,
    sky.noon.startsWith('day') && sky.night.startsWith('night') && sky.dawn.startsWith('dawn'));
  check(`and there are no stars out at lunchtime (${sky.stars.night} vs ${sky.stars.noon})`,
    sky.stars.night > 0 && sky.stars.noon === 0);
  check('tonight is not last night, and it is the same sky all evening',
    sky.night !== sky.otherNight);

  // five bands, five rooms: each step of the day must light more of it than the
  // one below, or "the fire is the measure" is only a claim
  const bands = await page.evaluate(async () => {
    const c = document.querySelector('canvas');
    const lit = () => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++;
      return n;
    };
    const out = [];
    for (let b = 0; b <= 5; b++) {
      __kd.view.shown = b / 5;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      out.push(lit());
    }
    return out;
  });
  const rising = bands.every((n, i) => i === 0 || n > bands[i - 1]);
  check(`the day has five bands and each one is a brighter room (${bands.join(' → ')})`, rising);

  // ── the offline shell, and the numbers in it ──
  //
  // The one bug a hand-kept precache list can have is a number that disagrees
  // with another file — a list a token behind the page is an app that loads
  // online and comes up blank on a train. So every entry is fetched, and the
  // tokens are compared with what index.html and hub/shell.js actually request.
  const sw = fs.readFileSync(path.join(ROOT, 'kindling', 'sw.js'), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'kindling', 'index.html'), 'utf8');
  const hubShell = fs.readFileSync(path.join(ROOT, 'hub', 'shell.js'), 'utf8');

  const V = sw.match(/const V = '(\?v=\d+)'/)?.[1] ?? '';
  const from = sw.indexOf('const SHELL = [');
  const block = sw.slice(from, sw.indexOf('];', from));
  const entries = [...block.matchAll(/[`'](\.[^`']+)[`']/g)]
    .map(m => m[1].replace('${V}', V));
  check(`the worker's shell list has every module on it (${entries.length} entries)`,
    entries.length >= 19);

  const dead = [];
  for (const e of entries) {
    const url = new URL(e, `${base}/kindling/`).href;
    const r = await page.request.get(url);
    if (!r.ok()) dead.push(e);
  }
  check(`and every one of them resolves${dead.length ? ` — ${dead}` : ''}`, dead.length === 0);

  check(`the page's own token matches the worker's (${V})`,
    html.includes(`js/main.js${V}`) && V.length > 0);

  // the four files that come from one level up belong to the arcade, and their
  // numbers move when it deploys — so they are checked against the real thing
  const drifted = entries.filter(e => e.startsWith('../hub/')).filter(e => {
    const file = e.slice('../hub/'.length);
    return !hubShell.includes(`./${file}`) && !html.includes(`../hub/${file}`);
  });
  check(`the way home is precached at the tokens the hub actually uses${drifted.length ? ` — ${drifted}` : ''}`,
    drifted.length === 0);

  // ── the floors ──
  const small = await page.evaluate(() => {
    const out = [];
    for (const n of document.querySelectorAll('button, input, a')) {
      const b = n.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) continue;         // not on screen
      if (n.classList.contains('link')) continue;            // inline text link
      if (b.height < 44) out.push(`${n.className || n.tagName}@${Math.round(b.height)}px`);
    }
    return out;
  });
  check(`every control is a 44px target${small.length ? ` — ${small.slice(0, 3)}` : ''}`, small.length === 0);

  const contrast = await page.evaluate(() => {
    const out = [];
    for (const n of document.querySelectorAll('h1, h2, p, span, button, input, li')) {
      if (!n.textContent.trim()) continue;
      const cs = getComputedStyle(n);
      let bg = 'rgba(0, 0, 0, 0)', at = n;
      while (at && bg === 'rgba(0, 0, 0, 0)') { bg = getComputedStyle(at).backgroundColor; at = at.parentElement; }
      out.push([n.className || n.tagName, cs.color, bg, parseFloat(cs.fontSize)]);
    }
    return out;
  });
  const thin = contrast.filter(([, fg, bg, size]) => {
    const need = size >= 24 ? 3 : 4.5;
    return ratio(rgb(fg), rgb(bg)) < need;
  });
  check(`every text colour clears WCAG AA${thin.length ? ` — ${thin.slice(0, 2).map(t => `${t[0]} ${ratio(rgb(t[1]), rgb(t[2])).toFixed(2)}:1`)}` : ''}`,
    thin.length === 0);

  const labels = await page.evaluate(() => ({
    canvasHidden: document.querySelector('canvas').getAttribute('aria-hidden') === 'true',
    live: document.getElementById('say').getAttribute('aria-live') === 'polite',
    main: !!document.querySelector('main#app'),
    title: document.title,
  }));
  check('the canvas is hidden from a screen reader and the line of text is the channel',
    labels.canvasHidden && labels.live);
  check('the page is a <main>, and it has a name', labels.main && labels.title.length > 0);

  // ── a phone ──
  const phone = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
  const pp = await phone.newPage();
  await pp.goto(`${base}/kindling/`, { waitUntil: 'load' });
  await pp.waitForFunction(() => window.__kd);
  const overflow = await pp.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`nothing hangs off the side of a phone (${overflow}px)`, overflow <= 0);
  await pp.locator('.task').first().tap();
  check('and a thumb can tick a line', await pp.evaluate(() => __kd.debug.cared()) === 1);

  // ── reduced motion ──
  const calm = await browser.newContext({ viewport: { width: 620, height: 800 }, reducedMotion: 'reduce' });
  const cp = await calm.newPage();
  await cp.goto(`${base}/kindling/`, { waitUntil: 'load' });
  await cp.waitForFunction(() => window.__kd);
  const held = await cp.evaluate(async () => {
    const c = document.querySelector('canvas');
    const a = c.toDataURL();
    await new Promise(r => setTimeout(r, 400));
    const b = c.toDataURL();
    let lit = 0;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 40) lit++;
    return { still: a === b, lit };
  });
  check('reduced motion holds the room still — and still paints it', held.still && held.lit > 500);

  // ── the way out ──
  check('the arcade shell put a way home on the page',
    await page.locator('.arcade-home').count() === 1);

  check('and nothing broke along the way' + (noise.length ? ` — ${noise[0]}` : ''), noise.length === 0);

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
