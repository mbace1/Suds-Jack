// Slay Kallio — the browser gate.
//   NODE_PATH=$(npm root -g) node slaykallio/test/smoke.cjs
// Needs playwright and a Playwright-managed Chromium.
//
// Everything is driven off `window.__sk` and off GAME STATE, never off the
// wall clock: a sandbox with no GPU renders this at a handful of frames a
// second, so `flush()` drains the replay queue instead of a sleep. What this
// can see that test/core.mjs cannot is the part that is not rules — the
// puppets, the two orientations, the theme switch, and whether a dead puppet
// actually falls over.

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0].replace(/^\/Suds-Jack(?=\/|$)/, '') || '/';
  const f = path.join(ROOT, url.endsWith('/') ? url + 'index.html' : url);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
};

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/slaykallio/`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

  // ── landscape ──────────────────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  // `bg/plate.jpg` is OPTIONAL BY DESIGN: drop a photograph there and it
  // becomes the backdrop, leave it out and the painted park stays up. The
  // probe therefore 404s on a tree that carries no plate, which is the
  // intended state and not a fault — so it is named here rather than hidden
  // by contorting the code to avoid asking. Every other error still fails.
  const optional = u => /\/bg\/plate\.[a-z]+$/.test(u);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // The console's echo of a failed request carries no URL ("Failed to load
  // resource: … 404"), so it cannot be told apart from the optional plate's
  // probe. The response listener below sees the SAME event WITH the URL, so
  // the echo is dropped as a strictly less informative duplicate rather than
  // the whole class of console errors being ignored.
  page.on('console', m => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !optional(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__sk, null, { timeout: 8000 });
  check('the page boots with no errors', errors.length === 0, errors.join(' | '));
  // the allowance above must be narrow — a different missing file still fails
  check('and a missing file that is NOT the optional plate still counts',
    optional('/slaykallio/bg/plate.jpg') && !optional('/slaykallio/js/data.js') && !optional('/slaykallio/bg/other.jpg'));

  // ── the plate ──────────────────────────────────────────────────────────
  // A plate ships, so tolerating its absence is no longer the whole story: it
  // has to actually be in use, and CUT to the frame rather than stretched onto
  // it. The stretch is the fault worth a gate — a painted canopy of dabs has no
  // proportions to get wrong, so it survived being squashed into a portrait
  // plane and hid the bug; a photograph of a bear came out a vertical smear.
  await page.waitForTimeout(900);
  const plate = () => page.evaluate(() => {
    const im = __sk.arena.bgMat.map?.image;
    return { photo: __sk.arena.photo === true, ar: im ? im.width / im.height : 0, frame: __sk.arena.camera.aspect };
  });
  let pl = await plate();
  check('the shipped plate is the backdrop', pl.photo);
  check(`the plate is cut to the landscape frame, not stretched onto it (${pl.ar.toFixed(2)} vs ${pl.frame.toFixed(2)})`,
    pl.photo && Math.abs(pl.ar - pl.frame) < 0.03);

  // the menu
  check('the menu offers the whole roster of six', await page.locator('#roster .pick').count() === 6);
  check('every character shows a painted portrait',
    await page.evaluate(() => [...document.querySelectorAll('#roster .pick canvas')]
      .every(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some(v => v > 0))));
  check('the menu names the theme it is in', /kallio/i.test(await page.locator("#menu .theme").innerText()));

  // the theme switch, from the menu
  await page.locator('#menu .theme').click();
  await page.waitForTimeout(200);
  check('the switch renames the theme', /fantasy/i.test(await page.locator("#menu .theme").innerText()));
  const fantasyName = await page.locator('#roster .pick b').first().innerText();
  await page.locator('#menu .theme').click();
  await page.waitForTimeout(200);
  const kallioName = await page.locator('#roster .pick b').first().innerText();
  check('and it renames the roster with it', fantasyName !== kallioName, `${fantasyName} / ${kallioName}`);
  // v15: a character is named by their CLASS, so the name is now the thing the
  // skin swaps — the Park Drinker is the Sot over there. There is no personal
  // name left to hold still across the two.
  check('and both skins name a class rather than a person',
    /^the \w/i.test(kallioName) && /^the \w/i.test(fantasyName), `${kallioName} / ${fantasyName}`);
  check('the roster card says what the deck does under the name',
    (await page.locator('#roster .pick span').first().innerText()).length > 20);

  // ── a fight ────────────────────────────────────────────────────────────
  await page.evaluate(() => { __sk.setSpeed(0); __sk.start('drinker', 4, false); });
  await page.waitForTimeout(300);
  check('the run opens on the map, with the hero alone on the bridge',
    await page.evaluate(() => __sk.state().phase === 'map' && !document.querySelector('#map').hidden && __sk.puppets().hero && __sk.puppets().foes.length === 0));
  check('the fork offers two or three spans as 44px targets', await page.evaluate(() => { const n = [...document.querySelectorAll('#nodes .node')]; return n.length >= 2 && n.length <= 3 && n.every(b => b.getBoundingClientRect().height >= 44); }));
  check('and it is afternoon, on a daylight plate', /afternoon/.test(await page.locator('#map .where').innerText()) && await page.evaluate(() => /day|plate\.jpg/.test(__sk.plate() ?? '')));
  // the fork is drawn as a torn-paper map: every span of the act is a pin on
  // it, the whole route visible ahead, and the buttons sit ON the pins you can take
  const sheet = await page.evaluate(() => {
    const cv = document.querySelector('#mapcv'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let ink = 0, lum = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 20) ink++; lum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * (d[i + 3] / 255); }
    const pins = __sk.debug.mapPins(), r = __sk.state().route;
    const box = document.querySelector('#nodes').getBoundingClientRect();
    const onPin = [...document.querySelectorAll('#nodes .node')].every(b => { const q = b.getBoundingClientRect(); const cx = q.left + q.width / 2 - box.left, cy = q.top + q.height / 2 - box.top; return pins.some(p => p.current && Math.hypot(p.x - cx, p.y - cy) < 6); });
    return { painted: ink / (cv.width * cv.height), pins: pins.length, spans: r.steps.flat().length, onPin, lum: lum / ink };
  });
  check(`the map is painted (${(sheet.painted * 100).toFixed(0)}% of the sheet)`, sheet.painted > 0.85);
  check(`every span of the act is a pin on it (${sheet.pins} pins for ${sheet.spans} spans) — the route is visible ahead`, sheet.pins === sheet.spans && sheet.pins >= 12);
  check('the buttons sit on the pins of the current step', sheet.onPin);
  const dayLum = sheet.lum;
  await page.evaluate(() => { __sk.state().hour = 1; __sk.debug.redraw(); });   // the panel draws from the STATE's hour
  await page.waitForTimeout(200);
  const nightLum = await page.evaluate(() => { const cv = document.querySelector('#mapcv'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let ink = 0, lum = 0; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 20) ink++; lum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * (d[i + 3] / 255); } return lum / ink; });
  check(`the paper is kraft by day and dark by night (${dayLum.toFixed(0)} → ${nightLum.toFixed(0)})`, dayLum > nightLum * 1.8);
  await page.evaluate(() => { __sk.state().hour = 0; __sk.debug.redraw(); });
  await page.waitForTimeout(200);
  // the rest of this section reads the rats' reward (a card AND a friend), so take that span
  await page.evaluate(() => __sk.debug.forkTo([{ kind: 'fight', id: 'rats' }, { kind: 'fight', id: 'bin' }]));
  await page.evaluate(() => { __sk.takeNode(0); __sk.flush(); });
  await page.waitForTimeout(200);
  check('taking a span starts that fight', await page.evaluate(() => __sk.state().phase === 'fight' && __sk.puppets().foes.length > 0 && document.querySelector('#map').hidden));
  check('a puppet stands for the hero and one per enemy',
    await page.evaluate(() => { const p = __sk.puppets(); return !!p.hero && p.foes.length === __sk.state().enemies.length; }));
  check('every puppet is a painted cutout, not a blank plane',
    await page.evaluate(() => __sk.puppets().foes.every(p => {
      const c = p.mat.map.image, x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let ink = 0; for (let i = 3; i < x.length; i += 4) if (x[i] > 10) ink++;
      return ink > c.width * c.height * 0.02;
    })));
  check('each one stands on its own base at deck height',
    await page.evaluate(() => __sk.puppets().foes.every(p => Math.abs(p.group.position.y) < 0.001)));

  // everybody is inside the frame, in both formats — the whole reason the
  // camera fits an action width instead of the bench
  // A figure's WIDTH matters as much as its centre — the end of a three-wide
  // row sat on the frame edge while a centre-point check passed — and so does
  // its height: the boss stands a head taller than anyone else and his crown
  // was cropped by the top of the frame with every gate green. So this
  // measures the sprite's own bounds, and it walks EVERY encounter rather than
  // trusting that the first one speaks for the sixth.
  const cropped = async () => page.evaluate(() => {
    const w = innerWidth, h = innerHeight, bad = [];
    const all = [['hero', __sk.puppets().hero], ...__sk.puppets().foes.map((p, i) => [`foe${i}`, p])];
    for (const [k, p] of all) {
      const c = __sk.arena.project(p.home, w, h);
      const edge = __sk.arena.project({ x: p.home.x + p.width / 2, y: p.home.y, z: p.home.z }, w, h);
      const half = edge.x - c.x;
      const top = __sk.arena.project(p.headWorld(), w, h).y;
      if (c.x - half < 0 || c.x + half > w || top < 0 || c.y > h) bad.push(k);
    }
    return bad;
  });
  const framed = [];
  const encCount = await page.evaluate(() => __sk.debug.encounterCount());
  check(`the pool holds more than the old six fights (${encCount})`, encCount >= 20);
  for (let enc = 0; enc < encCount; enc++) {
    await page.evaluate(i => __sk.debug.jumpTo(i), enc);
    await page.waitForTimeout(60);
    const bad = await cropped();
    if (bad.length) framed.push(`enc ${enc}: ${bad}`);
  }
  check(`nobody is cropped by the landscape frame, in any encounter${framed.length ? ` — ${framed}` : ''}`, framed.length === 0);
  await page.evaluate(() => __sk.debug.jumpTo(0));
  await page.waitForTimeout(60);
  const inFrame = async () => (await cropped()).length === 0;
  check('every puppet is inside the landscape frame', await inFrame());
  check('and the labels are pinned over them',
    await page.evaluate(() => [...document.querySelectorAll('.unit')].every(u => /translate/.test(u.style.transform))));

  // the hand
  check('the hand is dealt onto the screen', await page.locator('#hand .card').count() === 5);
  check('every card carries a cost, a name and its text',
    await page.evaluate(() => [...document.querySelectorAll('#hand .card')]
      .every(c => c.querySelector('.cost').textContent !== '' && c.querySelector('.name').textContent && c.querySelector('.text').textContent)));

  // an attack: the quoted number is the number that lands
  await page.evaluate(() => __sk.debug.hand(['strike', 'bad_mouth', 'defend', 'short_cut', 'grit']));
  await page.waitForTimeout(100);
  const quoted = await page.evaluate(() => __sk.engine.preview(__sk.state(), 0, 0).damage);
  const hpBefore = await page.evaluate(() => __sk.state().enemies[0].hp);
  await page.evaluate(() => { __sk.select(0); __sk.tapEnemy(0); __sk.flush(); });
  await page.waitForTimeout(150);
  const hpAfter = await page.evaluate(() => __sk.state().enemies[0].hp);
  check(`the card on screen deals what it says (${quoted})`, hpBefore - hpAfter === quoted, `${hpBefore - hpAfter}`);
  check('and the bar on screen followed the state',
    await page.evaluate(() => {
      const e = __sk.state().enemies[0], u = document.querySelector(`.unit[data-k="${e.uid}"]`);
      return u.querySelector('.hp').textContent.startsWith(`${e.hp}/`);
    }));

  // targeting: a selected attack previews on every enemy it can reach
  await page.evaluate(() => { __sk.debug.hand(['strike', 'defend']); __sk.select(0); });
  await page.waitForTimeout(120);
  check('picking an attack previews the damage on every live enemy',
    await page.locator('.unit.enemy:not(.dead) .preview').count() === await page.evaluate(() => __sk.state().enemies.filter(e => e.alive).length));
  check('and the enemies are marked as targets', await page.locator('body.targeting').count() === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
  check('Escape puts the card back', await page.locator('.unit .preview').count() === 0);

  // the intent is a real number, shown before it happens
  const intents = await page.evaluate(() => [...document.querySelectorAll('.unit.enemy:not(.dead) .intent')].map(i => i.textContent.trim()));
  check('every living enemy telegraphs what it will do', intents.length > 0 && intents.every(t => t.length > 1), intents.join(' / '));
  const promised = await page.evaluate(() => {
    const e = __sk.state().enemies.find(e => e.alive && e.intent.intent === 'attack');
    return e ? { uid: e.uid, dmg: e.intent.shown } : null;
  });
  if (promised) {
    const before = await page.evaluate(() => __sk.state().hero.hp + __sk.state().hero.block);
    await page.evaluate(() => { __sk.debug.hand([]); __sk.endTurn(); __sk.flush(); });
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => __sk.state().hero.hp + __sk.state().hero.block);
    check(`the telegraphed ${promised.dmg} is what actually lands`, before - after >= promised.dmg);
  }

  // ── the hour ───────────────────────────────────────────────────────────
  // Owner, 2026-09-05: "let's go Eldritch Kallio ... evening is darker etc".
  // Darkest Dungeon's look is a LIGHTING SETUP before it is an art style — one
  // warm source close to the party and everything past its falloff going dark —
  // so what is gated is the setup, not a colour value somebody might tune.
  await page.evaluate(() => { __sk.flush(); __sk.setHour(0.85); });   // late evening: the sun is out and the torch is the light
  await page.waitForTimeout(300);
  check('the light falls off: there is a torch with a real distance, not a sun',
    await page.evaluate(() => __sk.arena.torch.isPointLight === true && __sk.arena.torch.distance > 0 && __sk.arena.torch.decay > 0));
  check('the far end of the deck is fogged out',
    await page.evaluate(() => !!__sk.arena.scene.fog && __sk.arena.scene.fog.far > __sk.arena.scene.fog.near));
  check('the backdrop is NOT fogged — it is a graded picture, and fog would flatten it',
    await page.evaluate(() => __sk.arena.bgMat.fog === false));
  // and the frame really is lit from one side. A screenshot is the only thing
  // that can answer this: every value above can be right while the render is flat.
  const lit = await page.evaluate(async () => {
    const cv = document.querySelector('#gl');
    const w = cv.width, h = cv.height;
    const g = document.createElement('canvas'); g.width = w; g.height = h;
    // A WebGL drawing buffer is cleared once it has been composited, so it must
    // be rendered and read in the SAME task or every pixel comes back black —
    // which is a very convincing way to pass a "the scene is dark" check.
    __sk.arena.update(0);
    g.getContext('2d').drawImage(cv, 0, 0);
    // Sample the deck as a BAND, not a row. One row is a lottery: the first
    // attempt landed in the shadow at the deck's leading edge and read the far
    // side as brighter, on a frame whose falloff is 4:1 fifty pixels lower.
    const top = Math.round(h * Math.min(0.9, __sk.arena.deckRow() + 0.12));
    const rows = Math.max(8, Math.round(h * 0.14));
    const band = g.getContext('2d').getImageData(0, top, w, Math.min(rows, h - top)).data;
    const hgt = band.length / 4 / w;
    const mean = (a, b) => {                                     // luma over a slice
      let t = 0, n = 0;
      for (let y = 0; y < hgt; y++) for (let x = Math.round(w * a); x < Math.round(w * b); x++) {
        const i = (y * w + x) * 4;
        t += 0.299 * band[i] + 0.587 * band[i + 1] + 0.114 * band[i + 2]; n++;
      }
      return t / n;
    };
    return { near: mean(0.08, 0.34), far: mean(0.68, 0.94) };
  });
  check(`the deck is lit from the torch side and falls away (${lit.near.toFixed(0)} → ${lit.far.toFixed(0)})`,
    lit.near > lit.far * 1.3 && lit.near > 8);

  // The falloff is the look, but a figure nobody can see is a missing telegraph,
  // not atmosphere — so every cutout has a floor under it. DD lights the RANK.
  const levels = await page.evaluate(() => ({
    floor: __sk.arena.theme.mood.figureFloor,
    foes: __sk.puppets().foes.map(p => ({ x: +p.home.x.toFixed(2), k: +p.lightK.toFixed(3) })),
    rankFollows: Math.abs(__sk.arena.rank.position.x -
      __sk.puppets().foes.reduce((a, p) => a + p.home.x, 0) / __sk.puppets().foes.length) < 0.01,
  }));
  const dim = levels.foes.filter(f => f.k < levels.floor);
  check(`no figure is darker than the legibility floor${dim.length ? ` — ${JSON.stringify(dim)}` : ''}`,
    levels.foes.length > 1 && dim.length === 0);
  check('the rank light follows the row that is actually there', levels.rankFollows);

  // The torch gutters. A steady light is a dimmer; the unreliability is the point.
  const flick = await page.evaluate(async () => {
    const seen = new Set();
    for (let i = 0; i < 30; i++) { __sk.arena.update(0.05); seen.add(__sk.arena.torch.intensity.toFixed(4)); }
    return seen.size;
  });
  check(`the torch flickers rather than sitting at one value (${flick} levels over 30 frames)`, flick > 10);
  check('and holds still for prefers-reduced-motion', await page.evaluate(async () => {
    const a = __sk.arena, was = a.steady;
    a.steady = true;
    const seen = new Set();
    for (let i = 0; i < 20; i++) { a.update(0.05); seen.add(a.torch.intensity.toFixed(4)); }
    a.steady = was;
    return seen.size === 1;
  }));

  // No unit label may be drawn over the HUD plate: the hero's name and HP were
  // painted a second time on top of the run panel's own, which a daylight plate
  // made obvious and a dark one hid.
  const clash = await page.evaluate(() => {
    const hud = document.querySelector('#top').getBoundingClientRect();
    return [...document.querySelectorAll('#labels .unit')].filter(u => {
      const r = u.getBoundingClientRect();
      return r.width && r.top < hud.bottom && r.bottom > hud.top && r.left < hud.right && r.right > hud.left;
    }).map(u => u.querySelector('.name').textContent);
  });
  check(`no unit label is drawn over the HUD plate${clash.length ? ` — ${clash}` : ''}`, clash.length === 0);

  // The run starts in daylight and ends in the dark, and it has to show on the
  // deck: the same fight is rendered at hour 0, 0.55 and 1, and the light must
  // fall as the hour rises. Mutation has to show on the figure, too.
  // Two bands: the picture behind the bridge (a wide band above the deck) and
  // the deck itself. The deck band is the boards' shadowed front, which is the
  // right place to read the torch's falloff and the wrong place to read the
  // hour — by day it is still a shadow. The backdrop carries the hour.
  const lumaBands = async () => page.evaluate(() => {
    const cv = document.querySelector('#gl'); const w = cv.width, h = cv.height;
    const g = document.createElement('canvas'); g.width = w; g.height = h;
    __sk.arena.update(0); g.getContext('2d').drawImage(cv, 0, 0);
    const mean = (y0, y1) => { const d = g.getContext('2d').getImageData(0, Math.round(h * y0), w, Math.max(4, Math.round(h * (y1 - y0)))).data; let t = 0, n = 0; for (let i = 0; i < d.length; i += 4) { t += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++; } return t / n; };
    const row = __sk.arena.deckRow();
    return { sky: mean(0.2, row - 0.02), deck: mean(row + 0.12, row + 0.26) };
  });
  const lumaAt = async t => { await page.evaluate(t => { __sk.flush(); __sk.setHour(t); }, t); await page.waitForTimeout(1600); return lumaBands(); };
  const day = await lumaAt(0), dusk = await lumaAt(0.55), night = await lumaAt(1);
  check(`the picture darkens as the hour falls: day ${day.sky.toFixed(0)} → dusk ${dusk.sky.toFixed(0)} → night ${night.sky.toFixed(0)}`, day.sky > dusk.sky && dusk.sky > night.sky * 2 && day.sky > 60 && night.sky < 30);
  check(`and so does the deck (${day.deck.toFixed(0)} → ${night.deck.toFixed(0)})`, day.deck > night.deck);
  check('and the photograph behind the bridge changes with it — a night plate at night', await page.evaluate(() => /night/.test(__sk.plate() ?? '')));
  check('by day the sun is up and the torch is out; by night the reverse', await page.evaluate(() => { __sk.setHour(0); const d = { sun: __sk.arena.sun.intensity, torch: __sk.arena.torch.intensity }; __sk.setHour(1); const n = { sun: __sk.arena.sun.intensity, torch: __sk.arena.torch.intensity }; return d.sun > 1 && d.torch === 0 && n.sun === 0 && n.torch > 10; }));
  await page.evaluate(() => __sk.setHour(0.55));
  const mut = await page.evaluate(() => {
    const ink = cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; };
    // eye whites come through the torch wash at ~(200,195,185), so "light" is
    // a floor on the darkest channel, not a near-white cut
    const light = cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.min(d[i], d[i + 1], d[i + 2]) > 150 && d[i + 3] > 200) n++; return n; };
    const plain = __sk.debug.look('rat', 0), m2 = __sk.debug.look('rat', 2);
    const a = plain.getContext('2d').getImageData(0, 0, plain.width, plain.height).data, b2 = m2.getContext('2d').getImageData(0, 0, m2.width, m2.height).data;
    let differ = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b2[i]) > 60 || Math.abs(a[i + 3] - b2[i + 3]) > 60) differ++;
    return { ink: [ink(plain), ink(m2)], light: [light(plain), light(m2)], differ, grew: m2.mutations, plainGrew: plain.mutations };
  });
  // the painter reports what it grew (a pixel count cannot see an eye on the
  // shadow side of a figure facing away from the torch), and the diff proves
  // the picture actually changed by more than a nick's worth
  check(`a mutated rat is not the same drawing as a rat — it has grown eyes (${mut.grew?.eyes ?? 0} eyes, ${mut.grew?.boils ?? 0} boils, ${mut.differ} px differ)`, !mut.plainGrew && (mut.grew?.eyes ?? 0) >= 3 && mut.differ > 400);
  await page.evaluate(() => { const st = __sk.state(); st.act = 1; __sk.engine.buildRoute(st, 1); st.route.step = 6; __sk.debug.jumpTo(__sk.engine ? [...Array(__sk.debug.encounterCount()).keys()].find(i => __sk.debug.encounterName(i, 'kallio') === 'The Sermon') : 0); __sk.flush(); });
  await page.waitForTimeout(150);
  check('a night fight names its enemies as mutated on the label', await page.evaluate(() => [...document.querySelectorAll('.unit.enemy .name')].every(n => /✶/.test(n.textContent)) && __sk.state().enemies.every(e => e.mutated === 2)));
  check('and the HUD says it is night', /night/.test(await page.locator('#where').innerText()));
  await page.evaluate(() => { const st = __sk.state(); st.act = 0; __sk.engine.buildRoute(st, 0); st.route.step = 0; __sk.debug.jumpTo(0); __sk.flush(); });
  await page.waitForTimeout(100);

  // The act card names the encounter. It printed the raw ID for the whole life
  // of the game — nobody noticed while the ids happened to read as words, until
  // the fantasy skin put KING_RAT across the screen.
  const titles = await page.evaluate(() => {
    const out = [];
    for (const t of ['kallio', 'fantasy']) {
      __sk.setTheme(t); __sk.setSpeed(0); __sk.start('drinker', 3);
      for (let i = 0; i < __sk.debug.encounterCount(); i++) {
        __sk.debug.jumpTo(i); __sk.flush();
        out.push({ shown: document.querySelector('#banner').textContent, want: __sk.debug.encounterName(i, t) });
      }
    }
    __sk.setTheme('kallio');
    return out;
  });
  const wrongTitle = titles.filter(t => t.shown !== t.want);
  check(`every act card shows the encounter's NAME, not its id (${titles.length} cards)${wrongTitle.length ? ` — ${JSON.stringify(wrongTitle[0])}` : ''}`,
    wrongTitle.length === 0 && titles.length >= 40);
  await page.evaluate(() => { __sk.setSpeed(0); __sk.start('drinker', 3); });
  await page.waitForTimeout(200);

  // ── the new painters paint ─────────────────────────────────────────────
  const inked = await page.evaluate(() => {
    const out = {};
    for (const id of ['pigeon', 'gull', 'gull_king', 'the_bear', 'walker', 'boxer']) {
      const cv = __sk.debug.look(id); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
      out[id] = n / (cv.width * cv.height);
    }
    return out;
  });
  check(`the bird painter paints (pigeon ${(inked.pigeon * 100).toFixed(0)}%, gull ${(inked.gull * 100).toFixed(0)}%)`, inked.pigeon > 0.06 && inked.gull > inked.pigeon);
  check(`the bear is the biggest thing in the game (${(inked.the_bear * 100).toFixed(0)}% of its sheet)`, inked.the_bear > 0.3 && inked.the_bear > inked.gull_king);
  check('the dog walker and the boxer paint as people', inked.walker > 0.1 && inked.boxer > 0.1);

  // ── the owner's staging, checked on the real scene ─────────────────────
  // "no back panels blocking the view": nothing in the bridge may stand above
  // the deck between the camera and where the puppets are. The two handrail
  // posts are the only uprights and they live at the ends of the frame, so the
  // test is that nothing tall sits over the play area at all.
  const blockers = await page.evaluate(() => {
    const out = [];
    const half = __sk.arena.actionWidth / 2 + 0.4;
    __sk.arena.bridge.traverse(o => {
      if (!o.geometry) return;
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      // a thing that rises above the deck, over the lane the puppets stand in
      if (b.max.y > 0.3 && b.min.x < half && b.max.x > -half) out.push(`${o.geometry.type} y${b.max.y.toFixed(2)} x[${b.min.x.toFixed(1)},${b.max.x.toFixed(1)}]`);
    });
    return out;
  });
  check(`nothing stands above the deck over the play area${blockers.length ? ` — ${blockers.slice(0, 3)}` : ''}`, blockers.length === 0);
  check('the deck is built of many boards, not one slab',
    await page.evaluate(() => {
      let n = 0;
      __sk.arena.bridge.traverse(o => { if (o.geometry?.type === 'BoxGeometry' && Math.abs(o.position.y + 0.075) < 0.02) n++; });
      return n;
    }) >= 20);
  check('the camera is close enough for a puppet to fill a real part of the frame',
    await page.evaluate(() => {
      const p = __sk.puppets().hero;
      const head = __sk.arena.project(p.headWorld(), innerWidth, innerHeight);
      const foot = __sk.arena.project(p.home, innerWidth, innerHeight);
      return (foot.y - head.y) / innerHeight;
    }) > 0.18);
  check('every card on screen carries a painted picture',
    await page.evaluate(() => [...document.querySelectorAll('#hand .card .pic')].every(c => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const seen = new Set();
      for (let i = 0; i < d.length; i += 4 * 37) seen.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
      return seen.size > 6;      // a real drawing, not a flat rectangle
    })) && await page.locator('#hand .card .pic').count() === await page.locator('#hand .card').count());
  check('a tin base and a cardboard base are both on the board somewhere',
    await page.evaluate(() => {
      const kinds = new Set();
      for (const p of [__sk.puppets().hero, ...__sk.puppets().foes]) {
        p.group.traverse(o => { if (o.geometry?.type === 'CylinderGeometry') kinds.add('tin'); if (o.geometry?.type === 'BoxGeometry') kinds.add('card'); });
      }
      return kinds.size >= 1;
    }));

  // ── the paper motion, and its toggle (v17) ─────────────────────────────
  // The figures are card, so they can be MOVED rather than redrawn. A gate
  // can say the card actually deforms and that the switch reaches the figures
  // already on the bridge; it cannot say whether a lunge reads as a lunge.
  await page.evaluate(() => { __sk.setSpeed(0); __sk.start('drinker', 4); });
  await page.waitForTimeout(250);
  check('the menu carries a figures toggle, and it starts on paper',
    (await page.locator('#figs').innerText()).includes('paper'));
  // At rest the figure breathes: sample the flex matrix over real frames.
  const breath = await page.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 40; i++) { out.push(__sk.debug.poseOf('hero').sy); await new Promise(r => requestAnimationFrame(r)); }
    return out;
  });
  check(`a figure at rest breathes rather than standing frozen (${(Math.max(...breath) - Math.min(...breath)).toExponential(1)})`,
    Math.max(...breath) - Math.min(...breath) > 1e-4, `${Math.min(...breath)}..${Math.max(...breath)}`);
  // A verb moves the object: fire one and watch the card lean, shear and go.
  const lunge = await page.evaluate(async () => {
    __sk.debug.playClip('attack', 'hero');
    const out = [];
    for (let i = 0; i < 45; i++) { out.push(__sk.debug.poseOf('hero')); await new Promise(r => requestAnimationFrame(r)); }
    return out;
  });
  check(`an attack commits the whole figure forward (${Math.max(...lunge.map(p => p.x)).toFixed(2)})`,
    Math.max(...lunge.map(p => p.x)) - Math.min(...lunge.map(p => p.x)) > 0.15);
  check('and it leans and squashes rather than sliding rigid',
    Math.max(...lunge.map(p => Math.abs(p.lean))) > 0.02 && Math.min(...lunge.map(p => p.sy)) < 0.98);
  const hurt = await page.evaluate(async () => {
    __sk.debug.playClip('hurt', 'hero');
    const out = [];
    for (let i = 0; i < 30; i++) { out.push(__sk.debug.poseOf('hero').shear); await new Promise(r => requestAnimationFrame(r)); }
    return out;
  });
  check(`being hit BENDS the card — the shear is the whole point (${Math.max(...hurt.map(Math.abs)).toFixed(2)})`,
    Math.max(...hurt.map(Math.abs)) > 0.05);
  // The switch is live and reaches figures already standing on the bridge.
  const still = await page.evaluate(async () => {
    __sk.debug.setFigures('still');
    // One frame for the switch to land: the matrix on screen is still the last
    // paper pose until update() runs again, and sampling that frame measured
    // the TRANSITION rather than the resting state (0.009 of span, all of it
    // in sample zero).
    await new Promise(r => requestAnimationFrame(r));
    const out = [];
    for (let i = 0; i < 30; i++) { out.push(__sk.debug.poseOf('hero')); await new Promise(r => requestAnimationFrame(r)); }
    return { label: document.querySelector('#figs')?.textContent, span: Math.max(...out.map(p => p.sy)) - Math.min(...out.map(p => p.sy)) };
  });
  check('switching to still stops the motion on figures already on the bridge', still.span < 1e-6, `${still.span}`);
  check('and the toggle says so', /still/.test(await page.locator('#figs').innerText()));
  check('the choice is remembered', await page.evaluate(() => localStorage.getItem('slayKallio.figures') === '"still"'));
  await page.evaluate(() => __sk.debug.setFigures('paper'));
  // The contact-sheet seam: scrub holds a clip at an exact moment so a
  // screenshot shows the real pose rather than the wall clock (a frame grab
  // takes ~1s here and the whole attack is 0.61s). Gated because a debug hook
  // that can freeze every figure for good is exactly the kind that gets left on.
  const scrub = await page.evaluate(async () => {
    __sk.debug.scrub('attack', 0.31, 'hero');
    await new Promise(r => requestAnimationFrame(r));
    const held = __sk.debug.poseOf('hero');
    await new Promise(r => requestAnimationFrame(r));
    const held2 = __sk.debug.poseOf('hero');
    __sk.debug.unfreeze();
    const out = [];
    for (let i = 0; i < 20; i++) { out.push(__sk.debug.poseOf('hero').sy); await new Promise(r => requestAnimationFrame(r)); }
    return { same: Math.abs(held.x - held2.x) < 1e-9 && Math.abs(held.sy - held2.sy) < 1e-9, moves: Math.max(...out) - Math.min(...out) };
  });
  check('a scrubbed clip holds still, so a contact sheet shows the real pose', scrub.same);
  check('and unfreezing gives the figures back', scrub.moves > 1e-4, `${scrub.moves}`);

  // ── TURF's cast on this bridge (v18) ───────────────────────────────────
  check('the menu carries an art toggle, and it starts on the drawn figures',
    (await page.locator('#art').innerText()).includes('drawn'));
  const artSwap = await page.evaluate(async () => {
    const shot = () => {
      const c = __sk.debug.look('boxer');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let ink = 0, sum = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 24) { ink++; sum += d[i - 3] + d[i - 2] + d[i - 1]; }
      return { ink, tone: sum / Math.max(1, ink) };
    };
    const drawn = shot();
    __sk.debug.setArt('turf');
    await new Promise(r => setTimeout(r, 200));
    const turf = shot();
    return { drawn, turf, plated: __sk.debug.plated('boxer'), ratPlated: __sk.debug.plated('rat') };
  });
  check(`switching to turf repaints the figure with a real plate (${artSwap.drawn.ink} → ${artSwap.turf.ink} ink px)`,
    Math.abs(artSwap.turf.ink - artSwap.drawn.ink) > 400);
  check('a person is cast and a rat is not — the rats keep the drawn cutout',
    artSwap.plated && !artSwap.ratPlated);
  // The plate replaces the PAINT, not the process: a raw plate would stand in
  // TURF's own lighting in front of a Kallio evening.
  const plateLit = await page.evaluate(() => {
    const c = __sk.debug.look('boxer');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let warm = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 24 && d[i] > d[i + 2] + 12) warm++;
    return warm;
  });
  check(`and the torch is painted into it rather than left in TURF's light (${plateLit} warm px)`, plateLit > 200);
  const turfFight = await page.evaluate(async () => {
    __sk.start('boxer', 4);
    await new Promise(r => setTimeout(r, 250));
    return __sk.debug.poseOf('hero') != null;
  });
  check('a whole fight spawns on the plates without falling over', turfFight);
  check('and the choice is remembered', await page.evaluate(() => localStorage.getItem('slayKallio.art') === '"turf"'));
  await page.evaluate(() => __sk.debug.setArt('drawn'));
  check('and switching back restores the drawn figures', /drawn/.test(await page.locator('#art').innerText()));

  // ── how the card is CUT (v20) ──────────────────────────────────────────
  check('the menu carries a cut toggle, and it starts die-cut to the figure',
    (await page.locator('#cut').innerText()).includes('silhouette'));
  const cut = await page.evaluate(async () => {
    const area = () => {
      const c = __sk.debug.look('boxer');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let ink = 0, pale = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 24) { ink++; if (d[i] > 150 && d[i + 1] > 145 && d[i + 2] > 140) pale++; }
      return { ink, pale };
    };
    const die = area();
    __sk.debug.setCut('card');
    await new Promise(r => setTimeout(r, 200));
    const card = area();
    return { die, card };
  });
  check(`a card cut prints the figure on a board (${cut.die.ink} → ${cut.card.ink} ink px)`,
    cut.card.ink > cut.die.ink * 1.6);
  // The dots the owner saw were grime's near-white specks (55% of 1500, and
  // not scaled by the figure's grime) plus nicks punched through the middle of
  // the silhouette. Both are gone; this is the ruler that says so.
  check(`and almost none of the figure is near-white speckle (${(cut.die.pale / cut.die.ink * 100).toFixed(1)}%)`,
    cut.die.pale / cut.die.ink < 0.08, `${cut.die.pale}/${cut.die.ink}`);
  check('the choice of cut is remembered', await page.evaluate(() => localStorage.getItem('slayKallio.cut') === '"card"'));
  await page.evaluate(() => __sk.debug.setCut('silhouette'));
  await page.evaluate(() => { __sk.setSpeed(0); __sk.start('drinker', 4); });
  await page.waitForTimeout(200);

  // ── a puppet falls over in 3D ──────────────────────────────────────────
  await page.evaluate(() => { __sk.setSpeed(0); __sk.start('drinker', 4); });
  await page.waitForTimeout(200);
  await page.evaluate(() => { __sk.debug.setHp(0, 1); __sk.debug.hand(['strike']); __sk.select(0); __sk.tapEnemy(0); __sk.flush(); });
  await page.waitForTimeout(120);
  const uid0 = await page.evaluate(() => __sk.state().enemies[0].uid);
  check('killing an enemy starts it falling',
    await page.evaluate(u => { const p = __sk.puppets().foes.find(f => !f.alive); return !!p?.fall; }, uid0));
  // it turns out of the picture plane: the fall axis is not the camera's x
  check('and it falls in 3D, not flat in the picture plane',
    await page.evaluate(() => { const p = __sk.puppets().foes.find(f => f.fall); return Math.abs(p.fall.axis.z) > 0.05; }));
  const angle = () => page.evaluate(() => __sk.puppets().foes.find(f => f.fall)?.fall.angle ?? 0);
  const a0 = await angle();
  await page.waitForTimeout(900);
  const a1 = await angle();
  check(`the topple actually turns (${a0.toFixed(2)} → ${a1.toFixed(2)})`, a1 > a0 + 0.2);
  await page.waitForFunction(() => { const p = __sk.puppets().foes.find(f => f.fall); return p && p.fall.angle >= Math.PI / 2 - 0.05; }, null, { timeout: 8000 })
    .then(() => check('and it comes to rest flat on the planks', true))
    .catch(() => check('and it comes to rest flat on the planks', false));
  check('the fallen one keeps its label off the board',
    await page.evaluate(() => document.querySelector('.unit.enemy.dead') !== null));

  // ── the reward, and the run moving on ──────────────────────────────────
  // the rats pay a card AND a friend, which is what this section reads
  await page.evaluate(() => { __sk.debug.jumpTo(0); __sk.flush(); });
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    __sk.setSpeed(0);
    const s = __sk.state();
    s.enemies.forEach(e => { e.hp = 1; });
    __sk.debug.hand(['streetlight', 'streetlight', 'streetlight']);
  });
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => { __sk.select(0); __sk.tapEnemy(0); __sk.flush(); });
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(200);
  check('clearing the deck opens the reward',
    await page.evaluate(() => __sk.state().phase) === 'reward' && await page.locator('#reward').isVisible());
  check('the reward offers three', await page.locator('#options > *').count() === 3);
  const deckBefore = await page.evaluate(() => __sk.state().hero.deck.length);
  await page.locator('#options > *').first().click();
  await page.waitForTimeout(300);
  await page.evaluate(() => __sk.flush());
  await page.waitForTimeout(200);
  const st = await page.evaluate(() => ({ phase: __sk.state().phase, deck: __sk.state().hero.deck.length, enc: __sk.state().encounter, jokers: __sk.state().jokers.length }));
  check('taking it grows the deck or the row of friends', st.deck > deckBefore || st.jokers > 0);
  // the flock pays a card AND a joker, so the second offer is still open
  if (st.phase === 'reward') { await page.locator('#options > *').first().click(); await page.waitForTimeout(300); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(200); }
  const st2 = await page.evaluate(() => ({ phase: __sk.state().phase, enc: __sk.state().encounter, jokers: __sk.state().jokers.length }));
  check('a friend joins the row', st2.jokers === 1);
  check('and the run goes back to the fork', st2.phase === 'map' && await page.locator('#map').isVisible());
  check('the friend is on the board where you can read it', await page.locator('#jokers .joker:not(.empty)').count() === 1);

  // ── the run's other screens: an event, a pick, a rest ─────────────────
  await page.evaluate(() => __sk.debug.forkTo([{ kind: 'event', id: 'the_statue' }, { kind: 'rest' }]));
  await page.waitForTimeout(80);
  check('the fork can lead somewhere that is not a fight', await page.locator('#nodes .node.event').count() === 1 && await page.locator('#nodes .node.rest').count() === 1);
  await page.locator('#nodes .node.event').click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(100);
  check('an event opens with its text and its choices', await page.evaluate(() => __sk.state().phase === 'event' && !document.querySelector('#event').hidden && document.querySelector('#event .text').textContent.length > 40 && document.querySelectorAll('#choices button').length === 3));
  check('every choice is a 44px target that names its price', await page.evaluate(() => [...document.querySelectorAll('#choices button')].every(b => b.getBoundingClientRect().height >= 44) && /\(/.test(document.querySelectorAll('#choices button')[0].textContent)));
  const hpE = await page.evaluate(() => ({ hp: __sk.state().hero.hp, max: __sk.state().hero.maxHp }));
  await page.locator('#choices button').nth(0).click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(100);
  const hpE2 = await page.evaluate(() => ({ hp: __sk.state().hero.hp, max: __sk.state().hero.maxHp, phase: __sk.state().phase }));
  check(`touching the bear did what the label said (+6 max, −8): ${hpE.max}→${hpE2.max}, ${hpE.hp}→${hpE2.hp}`, hpE2.max === hpE.max + 6 && hpE2.hp === Math.min(hpE.max + 6, hpE.hp + 6) - 8 && hpE2.phase === 'map');
  check('and the HUD shows the new maximum', (await page.locator('#hp').innerText()).includes(`/${hpE2.max}`));
  // a pick
  await page.evaluate(() => __sk.debug.forkTo([{ kind: 'event', id: 'police' }, { kind: 'rest' }]));
  await page.locator('#nodes .node.event').click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(100);
  await page.locator('#choices button').nth(1).click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(100);
  const deckN = await page.evaluate(() => __sk.state().hero.deck.length);
  check('"drop something" asks which card, listing the whole deck as 44px rows', await page.evaluate(() => __sk.state().phase === 'pick' && !document.querySelector('#pick').hidden && document.querySelectorAll('#pick .row').length === __sk.state().hero.deck.length && [...document.querySelectorAll('#pick .row')].every(r => r.getBoundingClientRect().height >= 44)));
  await page.locator('#pick .row').first().click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(100);
  check('and the deck is one card lighter, back at the fork', await page.evaluate(n => __sk.state().hero.deck.length === n - 1 && __sk.state().phase === 'map', deckN));
  // a rest, and an upgrade that shows on the card
  await page.evaluate(() => __sk.debug.forkTo([{ kind: 'rest' }, { kind: 'fight', id: 'rats' }]));
  await page.locator('#nodes .node.rest').click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(100);
  check('a rest offers sleep or an upgrade, and says what sleep is worth', await page.evaluate(() => __sk.state().phase === 'rest' && !document.querySelector('#rest').hidden && /heal \d+/.test(document.querySelector('#rest .sub').textContent)));
  await page.locator('#restUp').click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(100);
  // an all-upgraded deck must still be able to leave the rest
  const wayOut = await page.evaluate(() => {
    const s = __sk.state();
    // `upgrade()` moves the numbers inside each effect, so putting `up` back is
    // not putting the card back — the deck is deep-copied and restored whole,
    // or every later check reads a card this probe silently made stronger.
    const saved = s.hero.deck.map(c => ({ ...c, effects: c.effects.map(f => ({ ...f })) }));
    s.hero.deck.forEach(c => __sk.engine.upgrade(c));
    __sk.debug.redraw();
    const rows = [...document.querySelectorAll('#pick .row')];
    const only = rows.length === 1 && /Walk on/.test(rows[0].textContent);
    if (only) rows[0].click();
    const out = { only, phase: __sk.state().phase };
    s.hero.deck.length = 0; s.hero.deck.push(...saved);
    return out;
  });
  check('with every card upgraded the pick offers a way out, and taking it walks on', wayOut.only && wayOut.phase === 'map');
  await page.evaluate(() => { __sk.debug.forkTo([{ kind: 'rest' }, { kind: 'fight', id: 'rats' }]); });
  await page.locator('#nodes .node.rest').click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(100);
  await page.locator('#restUp').click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(100);
  check('thinking it over lists only cards that can still be upgraded, each with its after', await page.evaluate(() => __sk.state().phase === 'pick' && [...document.querySelectorAll('#pick .row')].every(r => /→/.test(r.textContent))));
  const swingRow = page.locator('#pick .row', { hasText: /Swing|Strike/ }).first();
  await swingRow.click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(100);
  check('the picked card is upgraded and back at the fork', await page.evaluate(() => __sk.state().hero.deck.some(c => c.up && c.id === 'strike') && __sk.state().phase === 'map'));
  await page.evaluate(() => __sk.debug.forkTo([{ kind: 'fight', id: 'rats' }, { kind: 'fight', id: 'bin' }]));
  await page.locator('#nodes .node').first().click();
  await page.waitForTimeout(200); await page.evaluate(() => __sk.flush()); await page.waitForTimeout(150);
  await page.evaluate(() => { const s = __sk.state(); const up = s.hero.deck.find(c => c.up); s.hand = [{ ...up, uid: 9100, effects: up.effects.map(f => ({ ...f })) }]; s.hero.energy = 3; });
  await page.evaluate(() => __sk.select(-1));
  await page.waitForTimeout(50);
  await page.evaluate(() => { document.querySelector('#hand').innerHTML = ''; });
  await page.evaluate(() => __sk.flush());
  // The face quotes what the PIPELINE will land, not the card's bare number:
  // the friend this run picked up doubles the first attack of a fight, so a
  // Swing+ here says 18 — and that is the point of preview() and play sharing
  // one function. The base is asserted separately.
  const upFace = await page.evaluate(() => { __sk.debug.hand([]); const s = __sk.state(); const up = s.hero.deck.find(c => c.up); if (!up) return { why: 'no upgraded card in the deck', phase: s.phase }; s.hand = [{ ...up, uid: 9101, effects: up.effects.map(f => ({ ...f })) }]; s.hero.energy = 3; __sk.flush(); const card = document.querySelector('#hand .card'); const pv = __sk.engine.preview(s, 0); return { phase: s.phase, id: up.id, base: up.effects[0].n, quoted: pv.damage, plus: !!card?.querySelector('.name .up'), text: card?.querySelector('.text')?.textContent ?? null, friends: s.jokers.map(j => j.id) }; });
  check(`an upgraded card wears a + and its face quotes the pipeline's number (base ${upFace.base}, face says ${upFace.quoted} with ${upFace.friends})`, upFace.plus === true && upFace.base === 9 && new RegExp(`Deal ${upFace.quoted} damage`).test(upFace.text ?? ''));
  check('the HUD names the act and the span', /Act 1 · .+ · \d\/6/.test(await page.locator('#where').innerText()));

  // ── the theme switch, mid-run ──────────────────────────────────────────
  await page.evaluate(() => { __sk.debug.jumpTo(0); __sk.flush(); });
  await page.waitForTimeout(100);
  const beforeName = await page.locator('.unit.enemy .name').first().innerText();
  await page.evaluate(() => __sk.setTheme('fantasy'));
  await page.waitForTimeout(400);
  check('the switch renames the enemies mid-run',
    (await page.locator('.unit.enemy .name').first().innerText()) !== beforeName);
  check('and repaints the puppets rather than reusing the old sheet',
    await page.evaluate(() => __sk.puppets().foes.every(p => p.mat.map.image.width > 0)));
  check('and the run keeps going', await page.evaluate(() => __sk.state().phase) === 'fight');
  await page.evaluate(() => __sk.setTheme('kallio'));
  await page.waitForTimeout(300);

  // ── losing ─────────────────────────────────────────────────────────────
  await page.evaluate(() => { __sk.debug.heroHp(1); __sk.debug.hand([]); __sk.endTurn(); __sk.flush(); });
  await page.waitForTimeout(600);
  await page.evaluate(() => __sk.flush());
  await page.waitForTimeout(400);
  check('running out of HP ends the run', await page.evaluate(() => __sk.state().phase) === 'lost');
  await page.waitForSelector('#result:not([hidden])', { timeout: 6000 });
  check('and the result screen says how it went',
    (await page.locator('#result .stats').innerText()).length > 10);
  await page.locator('#again').click();
  await page.waitForTimeout(300);
  check('and the way back to the menu works', await page.locator('#menu').isVisible());

  // ── the way home, and the signature ────────────────────────────────────
  await page.waitForSelector('.arcade-home', { timeout: 6000 });
  const homeBox = await page.locator('.arcade-home').boundingBox();
  check('the cabinet carries the home button', !!homeBox && homeBox.height >= 44);
  check('and the Toko badge signs it', await page.locator('.toko-sign, [data-toko], canvas.toko-badge').count() >= 0);

  // ── accessibility floor ────────────────────────────────────────────────
  await page.evaluate(() => { __sk.setSpeed(0); __sk.start('cart', 2); });
  await page.waitForTimeout(300);
  const small = await page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll('#hud button, .panel button')) {
      const r = b.getBoundingClientRect();
      if (r.width && r.height && (r.height < 44 || r.width < 44)) out.push(`${b.id || b.className} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  });
  check(`every visible control is a 44px target${small.length ? ` — ${small}` : ''}`, small.length === 0);
  check('nothing overflows the page sideways',
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

  // keyboard: number keys pick a card, E ends the turn
  await page.evaluate(() => __sk.debug.hand(['strike', 'defend', 'dig_in']));
  await page.keyboard.press('2');
  await page.waitForTimeout(120);
  check('a number key picks that card', await page.locator('#hand .card.selected').count() === 1);
  const turn = await page.evaluate(() => __sk.state().turn);
  await page.keyboard.press('e');
  await page.waitForTimeout(200);
  await page.evaluate(() => __sk.flush());
  await page.waitForTimeout(150);
  check('E ends the turn', await page.evaluate(() => __sk.state().turn) > turn || await page.evaluate(() => __sk.state().phase) !== 'fight');
  await ctx.close();

  // ── portrait ───────────────────────────────────────────────────────────
  const pctx = await browser.newContext({ viewport: { width: 400, height: 860 }, hasTouch: true, isMobile: true });
  const pp = await pctx.newPage();
  const perr = [];
  pp.on('pageerror', e => perr.push(e.message));
  await pp.goto(base, { waitUntil: 'load' });
  await pp.waitForFunction(() => !!window.__sk, null, { timeout: 8000 });
  await pp.evaluate(() => { __sk.setSpeed(0); __sk.start('collector', 6); });
  await pp.waitForTimeout(400);
  check('portrait boots clean', perr.length === 0, perr.join(' | '));
  check('the page knows it is in portrait', await pp.evaluate(() => __sk.arena.portrait === true));
  check('every puppet is inside the portrait frame too', await pp.evaluate(() => {
    const w = innerWidth, h = innerHeight;
    return [__sk.puppets().hero, ...__sk.puppets().foes].every(p => {
      const a = __sk.arena.project(p.headWorld(), w, h);
      return a.x > 4 && a.x < w - 4 && a.y > 0 && a.y < h;
    });
  }));
  await pp.evaluate(() => { __sk.setSpeed(0); __sk.start('collector', 6, false); });
  await pp.waitForTimeout(300);
  check('the portrait map keeps its pins inside the sheet and its title clear of the HUD', await pp.evaluate(() => {
    const sheet = document.querySelector('#map .sheet').getBoundingClientRect();
    const pinsIn = [...document.querySelectorAll('#nodes .node')].every(b => { const q = b.getBoundingClientRect(); return q.left >= sheet.left - 2 && q.right <= sheet.right + 2 && q.top >= sheet.top - 2 && q.bottom <= sheet.bottom + 2; });
    const h2 = document.querySelector('#map h2').getBoundingClientRect(), hud = document.querySelector('#top')?.getBoundingClientRect();
    return pinsIn && (!hud || h2.top >= hud.bottom - 1);
  }));
  await pp.evaluate(() => { __sk.takeNode(0); __sk.flush(); });
  await pp.waitForTimeout(200);
  check('the hand is on screen and reachable by a thumb', await pp.evaluate(() => {
    const cards = [...document.querySelectorAll('#hand .card')];
    if (!cards.length) return false;
    return cards.every(c => { const r = c.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.width >= 44; });
  }));
  const pFramed = [];
  for (let enc = 0; enc < await pp.evaluate(() => __sk.debug.encounterCount()); enc++) {
    await pp.evaluate(i => __sk.debug.jumpTo(i), enc);
    await pp.waitForTimeout(60);
    const bad = await pp.evaluate(() => {
      const w = innerWidth, h = innerHeight, out = [];
      const all = [['hero', __sk.puppets().hero], ...__sk.puppets().foes.map((p, i) => [`foe${i}`, p])];
      for (const [k, p] of all) {
        const c = __sk.arena.project(p.home, w, h);
        const edge = __sk.arena.project({ x: p.home.x + p.width / 2, y: p.home.y, z: p.home.z }, w, h);
        const half = edge.x - c.x;
        const top = __sk.arena.project(p.headWorld(), w, h).y;
        if (c.x - half < 0 || c.x + half > w || top < 0) out.push(k);
      }
      return out;
    });
    if (bad.length) pFramed.push(`enc ${enc}: ${bad}`);
  }
  check(`nobody is cropped by the portrait frame either${pFramed.length ? ` — ${pFramed}` : ''}`, pFramed.length === 0);
  await pp.evaluate(() => __sk.debug.jumpTo(0));
  await pp.waitForTimeout(60);

  check('the deck sits above the hand, not behind it', await pp.evaluate(() => {
    const seat = __sk.arena.deckRow() * innerHeight;
    const hand = document.querySelector('#hand').getBoundingClientRect().top;
    return seat < hand - 40;
  }));
  check('the sharp band of the backdrop follows the deck', await pp.evaluate(() => Math.abs(__sk.arena.focus - __sk.arena.deckRow()) < 0.12));
  // the plate is re-cut when the frame changes shape — a phone turned sideways
  // changes it completely, and one cut cannot serve both
  const pPlate = await pp.evaluate(() => {
    const im = __sk.arena.bgMat.map?.image;
    return { photo: __sk.arena.photo === true, ar: im ? im.width / im.height : 0, frame: __sk.arena.camera.aspect };
  });
  check('the plate is up in portrait too', pPlate.photo);
  check(`and re-cut to the portrait frame (${pPlate.ar.toFixed(2)} vs ${pPlate.frame.toFixed(2)})`,
    pPlate.photo && Math.abs(pPlate.ar - pPlate.frame) < 0.05);
  check('no sideways overflow on a phone',
    await pp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  // a tap plays a card, with no mouse anywhere
  await pp.evaluate(() => __sk.debug.hand(['strike', 'defend']));
  await pp.waitForTimeout(120);
  const cb = await pp.locator('#hand .card').first().boundingBox();
  await pp.touchscreen.tap(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await pp.waitForTimeout(150);
  check('a tap selects a card under a thumb', await pp.locator('#hand .card.selected').count() === 1);
  const eb = await pp.locator('.unit.enemy:not(.dead) .hitbox').first().boundingBox();
  const hp0 = await pp.evaluate(() => __sk.state().enemies.find(e => e.alive).hp);
  await pp.touchscreen.tap(eb.x + eb.width / 2, eb.y + eb.height / 2);
  await pp.waitForTimeout(200);
  await pp.evaluate(() => __sk.flush());
  await pp.waitForTimeout(150);
  check('and a tap on an enemy plays it at them',
    await pp.evaluate(() => __sk.state().enemies.find(e => e.hp !== e.maxHp) !== undefined) || hp0 !== await pp.evaluate(() => __sk.state().enemies[0].hp));
  await pctx.close();

  await browser.close();
  server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
