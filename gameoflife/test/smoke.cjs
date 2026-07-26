// The Game of Life — headless smoke test (the beta playtest loop).
// Run from anywhere:  node gameoflife/test/smoke.cjs
// Needs the `playwright` package resolvable (globally installed is fine:
// NODE_PATH=<global node_modules>) and a Playwright-managed Chromium.
//
// Covers:
//  - page loads with zero console/page errors
//  - hub renders both cards, in all three languages
//  - aqueduct: story advances, puzzle canvas survives interaction
//  - forest: choices advance scenes, breathing finale starts
//  - nature interlude fires at sinceInterlude >= 2 (day + evening variants)
//  - feedback store + __gol debug handle
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');   // repo root
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.md': 'text/plain' };

// a stand-in for the form endpoint: /collect records what the page posts, and
// /collect-broken always fails, so the outbox path can be exercised too
const collected = [];
let collectOpen = true;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/collect' || url === '/collect-broken') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const ok = url === '/collect' && collectOpen;
      if (ok) { try { collected.push(JSON.parse(body)); } catch { /* ignore */ } }
      res.writeHead(ok ? 200 : 500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      });
      res.end('{}');
    });
    return;
  }
  const p = path.join(ROOT, url === '/' ? 'index.html' : url);
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

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/gameoflife/index.html`;
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  // /collect-broken is failed on purpose to exercise the outbox, so the 500 the
  // browser logs for it is expected noise rather than a defect
  const expected = t => /collect-broken|Failed to load resource.*500/.test(t);
  page.on('console', m => { if (m.type() === 'error' && !expected(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(URL, { waitUntil: 'networkidle' });

  // zen hub: ONE offering at a time, cycle dots, a quiet redraw link
  check('hub offers exactly 1 card', await page.locator('.card').count() === 1);
  check('offering is labeled', (await page.locator('.offer-note').textContent()).includes('offered'));
  check('cycle dots visible', await page.locator('.cycle-dots .dot').count() === 3);
  check('hub title present', (await page.locator('h1').textContent()) === 'The Game of Life');
  const firstOffer = await page.locator('.card h2').textContent();
  await page.locator('.another-btn').click();
  check('"something else" swaps the offering',
    (await page.locator('.card h2').textContent()) !== firstOffer);

  // language switching
  await page.locator('.lang-btn', { hasText: 'Suomi' }).click();
  check('finnish title', (await page.locator('h1').textContent()) === 'Elämän peli');
  await page.locator('.lang-btn', { hasText: '日本語' }).click();
  check('japanese title', (await page.locator('h1').textContent()) === '人生のゲーム');
  await page.locator('.lang-btn', { hasText: 'English' }).click();

  // aqueduct: 3 story panels then puzzle (entered via debug handle — the
  // offering draw is random, so tests navigate deterministically)
  await page.evaluate(() => __gol.debug.start('aqueduct'));
  for (let i = 0; i < 3; i++) {
    check(`aqueduct story panel ${i + 1} has text`, (await page.locator('.exp-text').textContent()).length > 20);
    await page.locator('.exp-buttons .btn').click();
  }
  const hint = await page.locator('.exp-text').textContent();
  check('puzzle hint shown', hint.includes('Channel 1'));
  // click around the canvas — must not throw, tiles rotate silently
  const box = await page.locator('.pixel-screen').boundingBox();
  for (let i = 0; i < 8; i++) {
    await page.mouse.click(box.x + box.width * (0.2 + 0.08 * i), box.y + box.height * 0.45);
  }
  check('puzzle interaction survives clicks', errors.length === 0);
  await page.locator('.back-btn').click();

  // forest: choice -> choice -> continue -> breathing starts
  await page.evaluate(() => __gol.debug.start('forest'));
  await page.locator('.exp-buttons .btn', { hasText: 'Follow the sound' }).click();
  check('forest scene 2 shown', (await page.locator('.exp-text').textContent()).includes('heron'));
  await page.locator('.exp-buttons .btn').first().click();
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  await page.waitForTimeout(300);
  const breatheTxt = await page.locator('.exp-text').textContent();
  check('breathing started', /breathe|circle/i.test(breatheTxt));
  await page.locator('.back-btn').click();

  // tern: story advances through a choice
  await page.evaluate(() => __gol.debug.start('tern'));
  check('tern scene 1 shown', (await page.locator('.exp-text').textContent()).includes('Arctic'));
  await page.locator('.exp-buttons .btn', { hasText: 'Leave with the flock' }).click();
  check('tern choice advances', (await page.locator('.exp-text').textContent()).includes('river of wings'));
  await page.locator('.back-btn').click();

  // cup v2: HOLDING the pour button keeps the tea coming — one sustained press
  // overflows the bowl on its own (PRESS 0.16 + RATE 0.55/s past OVERFLOW_AT 1.9)
  await page.evaluate(() => __gol.debug.start('cup'));
  await page.locator('.exp-buttons .btn', { hasText: 'Pour' }).hover();
  await page.mouse.down();
  await page.waitForTimeout(3600);
  await page.mouse.up();
  check('cup overflows from one long hold',
    (await page.locator('.exp-text').textContent()).includes('empty your cup'));

  // cup: pour until it overflows, then empty it — the wisdom kernel loop
  await page.evaluate(() => __gol.debug.start('cup'));
  check('cup scene shown', (await page.locator('.exp-text').textContent()).includes('Nan-in'));
  for (let i = 0; i < 20; i++) {   // pour until the overflow swaps the button away
    const pourBtn = page.locator('.exp-buttons .btn', { hasText: 'Pour' });
    if (await pourBtn.count() === 0) break;
    await pourBtn.click();
  }
  check('cup overflows into the teaching',
    (await page.locator('.exp-text').textContent()).includes('empty your cup'));
  await page.locator('.exp-buttons .btn', { hasText: 'Empty the cup' }).click();
  await page.waitForTimeout(1600);
  check('cup outro shown', (await page.locator('.exp-text').textContent()).includes('room'));
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  check('completion leads to feedback', await page.locator('.leaf-row').count() === 1);
  await page.locator('.link-btn', { hasText: 'Skip' }).click();

  // ...but only the first finish, and then every fifth. The second one goes
  // straight back to the hub — 22 nagged ratings are worth less than a few
  // willing ones.
  await page.evaluate(() => __gol.debug.start('cup'));
  for (let i = 0; i < 20; i++) {
    const pourBtn = page.locator('.exp-buttons .btn', { hasText: 'Pour' });
    if (await pourBtn.count() === 0) break;
    await pourBtn.click();
  }
  await page.locator('.exp-buttons .btn', { hasText: 'Empty the cup' }).click();
  await page.waitForTimeout(1600);
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  check('the second finish is not asked to rate', await page.locator('.leaf-row').count() === 0);
  check('it returns straight to the hub', await page.locator('.card').count() === 1);
  // two finishes = the rest is due, so the invitation opens over the hub here.
  // Put it off, which also keeps the rest of this run's hub clear.
  check('two finishes bring the rest', await page.locator('.overlay').count() === 1);
  await page.locator('.overlay .link-btn').click();

  // hanami: the history story advances through a choice
  await page.evaluate(() => __gol.debug.start('hanami'));
  check('hanami scene 1 shown', (await page.locator('.exp-text').textContent()).includes('812'));
  await page.locator('.exp-buttons .btn', { hasText: 'Sit with the poets' }).click();
  check('hanami choice advances', (await page.locator('.exp-text').textContent()).includes('poem'));
  await page.locator('.back-btn').click();

  // berry: the Finnish everyman's-right story advances through a choice
  await page.evaluate(() => __gol.debug.start('berry'));
  check('berry scene 1 shown', (await page.locator('.exp-text').textContent()).includes('everyone'));
  await page.locator('.exp-buttons .btn', { hasText: 'Ask what she means' }).click();
  check('berry choice teaches the right',
    (await page.locator('.exp-text').textContent()).includes('Jokamiehenoikeus'));
  await page.locator('.back-btn').click();

  // stars: trace the Dipper star by star, then find Polaris (coords mirror
  // DIPPER/POLARIS in experiences/stars.js — 192x128 canvas space)
  await page.evaluate(() => __gol.debug.start('stars'));
  check('stars intro shown', (await page.locator('.exp-text').textContent()).includes('seven stars'));
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  const sbox = await page.locator('.pixel-screen').boundingBox();
  const tapPx = (x, y) => page.mouse.click(sbox.x + (x + 0.5) / 192 * sbox.width, sbox.y + (y + 0.5) / 128 * sbox.height);
  for (const [x, y] of [[26, 46], [44, 36], [60, 34], [74, 38], [78, 58], [102, 62], [100, 38]]) await tapPx(x, y);
  check('dipper traced (Otava named)', (await page.locator('.exp-text').textContent()).includes('Otava'));
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  await tapPx(52, 22);
  check('Polaris found', (await page.locator('.exp-text').textContent()).includes('Polaris'));
  await page.locator('.back-btn').click();

  // maple: the four-seasons story advances through the bud choice
  await page.evaluate(() => __gol.debug.start('maple'));
  check('maple scene 1 shown', (await page.locator('.exp-text').textContent()).includes('April'));
  await page.locator('.exp-buttons .btn', { hasText: 'Open a bud' }).click();
  check('maple bud teaches unpacking', (await page.locator('.exp-text').textContent()).includes('unpacking'));
  await page.locator('.back-btn').click();

  // plate: the exposure runs (~4s), the crowd erases itself, the choice lands
  await page.evaluate(() => __gol.debug.start('plate'));
  check('plate scene 1 shown', (await page.locator('.exp-text').textContent()).includes('Daguerre'));
  await page.locator('.exp-buttons .btn', { hasText: 'Begin the exposure' }).click();
  await page.waitForTimeout(4800);
  check('plate exposure finishes into choice',
    (await page.locator('.exp-text').textContent()).includes('boots shined'));
  await page.locator('.exp-buttons .btn', { hasText: 'still man' }).click();
  check('plate reflect shown', (await page.locator('.exp-text').textContent()).includes('first human being'));
  await page.locator('.back-btn').click();

  // seam: gather the five shards (coords mirror BOUNDS/SCATTER in seam.js),
  // choose gold, watch the seams gild into the outro
  await page.evaluate(() => __gol.debug.start('seam'));
  check('seam intro shown', (await page.locator('.exp-text').textContent()).includes('five pieces'));
  const kbox = await page.locator('.pixel-screen').boundingBox();
  const ktap = (x, y) => page.mouse.click(kbox.x + (x + 0.5) / 192 * kbox.width, kbox.y + (y + 0.5) / 128 * kbox.height);
  for (const [x, y] of [[34, 54], [62, 98], [107, 38], [141, 94], [166, 64]]) await ktap(x, y);
  await page.waitForTimeout(700);
  check('seam assembled into the choice', (await page.locator('.exp-text').textContent()).includes('two ways'));
  await page.locator('.exp-buttons .btn', { hasText: 'gold' }).click();
  await page.waitForTimeout(2600);
  check('kintsugi outro shown', (await page.locator('.exp-text').textContent()).includes('Scars'));
  await page.locator('.back-btn').click();

  // dots: Galileo — pass the nights until the choice appears, pick "circle Jupiter"
  await page.evaluate(() => __gol.debug.start('dots'));
  check('dots intro shown', (await page.locator('.exp-text').textContent()).includes('Galileo'));
  await page.locator('.exp-buttons .btn', { hasText: 'Look through the glass' }).click();
  for (let i = 0; i < 6; i++) {
    const nextBtn = page.locator('.exp-buttons .btn', { hasText: 'The next night' });
    if (await nextBtn.count() === 0) break;
    await nextBtn.click();
  }
  check('dots reaches the choice', await page.locator('.exp-buttons .btn', { hasText: 'circle Jupiter' }).count() === 1);
  await page.locator('.exp-buttons .btn', { hasText: 'circle Jupiter' }).click();
  check('dots truth shown', (await page.locator('.exp-text').textContent()).includes('Four moons'));
  await page.locator('.back-btn').click();

  // glass: Muybridge — release the horse, wires fire, choose the zoetrope
  await page.evaluate(() => __gol.debug.start('glass'));
  check('glass intro shown', (await page.locator('.exp-text').textContent()).includes('Muybridge'));
  await page.locator('.exp-buttons .btn', { hasText: 'Release the horse' }).click();
  await page.waitForSelector('.exp-buttons .btn:has-text("zoetrope")', { timeout: 6000 });
  check('glass reveal caught the suspension',
    (await page.locator('.exp-text').textContent()).includes('four hooves'));
  await page.locator('.exp-buttons .btn', { hasText: 'zoetrope' }).click();
  check('glass zoetrope revives the horse', (await page.locator('.exp-text').textContent()).includes('cinema'));
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  check('glass outro shown', (await page.locator('.exp-text').textContent()).includes('still moments'));
  await page.locator('.back-btn').click();

  // wait: Stand and Wait — intro, then "stand and wait" starts the mist thinning
  // (checked at the hint, like forest's breathing, so the test needn't wait it out)
  await page.evaluate(() => __gol.debug.start('wait'));
  check('wait intro shown', (await page.locator('.exp-text').textContent()).includes('pine'));
  await page.locator('.exp-buttons .btn', { hasText: 'Stand and wait' }).click();
  check('wait begins to clear', (await page.locator('.exp-text').textContent()).includes('mist'));
  await page.locator('.back-btn').click();

  // lichen: leave it be starts the bloom; a tap makes it recoil (the whole point)
  await page.evaluate(() => __gol.debug.start('lichen'));
  check('lichen intro shown', (await page.locator('.exp-text').textContent()).includes('stone'));
  await page.locator('.exp-buttons .btn', { hasText: 'Leave it be' }).click();
  check('lichen begins to grow', (await page.locator('.exp-text').textContent()).includes('growing'));
  const lbox = await page.locator('.pixel-screen').boundingBox();
  await page.mouse.click(lbox.x + lbox.width * 0.5, lbox.y + lbox.height * 0.6);
  check('lichen recoils when touched', (await page.locator('.exp-text').textContent()).includes('recoils'));
  await page.locator('.back-btn').click();

  // cloud: the cloudberry story branches, and "leave them" teaches the fee of roaming
  await page.evaluate(() => __gol.debug.start('cloud'));
  check('cloud scene 1 shown', (await page.locator('.exp-text').textContent()).includes('cloudberries'));
  await page.locator('.exp-buttons .btn', { hasText: 'Read the tracks' }).click();
  check('cloud choice advances', (await page.locator('.exp-text').textContent()).includes('bear'));
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  await page.locator('.exp-buttons .btn', { hasText: 'Leave them standing' }).click();
  check('cloud teaches to leave beauty', (await page.locator('.exp-text').textContent()).includes('do not have to keep it'));
  await page.locator('.back-btn').click();

  // ice: drill down through the layers to the ancient air, then read the truth
  await page.evaluate(() => __gol.debug.start('ice'));
  check('ice intro shown', (await page.locator('.exp-text').textContent()).includes('arctic station'));
  await page.locator('.exp-buttons .btn', { hasText: 'Lower the drill' }).click();
  for (let i = 0; i < 6; i++) {
    const d = page.locator('.exp-buttons .btn', { hasText: 'Deeper' });
    if (await d.count() === 0) break;
    await d.click();
  }
  check('ice reaches the ice age', (await page.locator('.exp-text').textContent()).includes('twenty thousand years'));
  await page.locator('.exp-buttons .btn', { hasText: 'Read the trapped air' }).click();
  check('ice truth shown', (await page.locator('.exp-text').textContent()).includes('museums of atmosphere'));
  await page.locator('.back-btn').click();

  // trace: draw a free-form constellation (coords mirror STARS in trace.js),
  // 6 stars chained = 5 segments, then name it
  await page.evaluate(() => __gol.debug.start('trace'));
  check('trace intro shown', (await page.locator('.exp-text').textContent()).includes('do not come joined'));
  await page.locator('.exp-buttons .btn', { hasText: 'Begin' }).click();
  const trbox = await page.locator('.pixel-screen').boundingBox();
  const trTap = (x, y) => page.mouse.click(trbox.x + (x + 0.5) / 192 * trbox.width, trbox.y + (y + 0.5) / 128 * trbox.height);
  for (const [x, y] of [[40, 84], [58, 70], [82, 64], [104, 62], [128, 56], [152, 46]]) await trTap(x, y);
  check('trace offers to name it', await page.locator('.exp-buttons .btn', { hasText: 'my constellation' }).count() === 1);
  await page.locator('.exp-buttons .btn', { hasText: 'my constellation' }).click();
  check('trace truth shown', (await page.locator('.exp-text').textContent()).includes('no lion up there'));
  await page.locator('.back-btn').click();

  // gears: crank the Antikythera mechanism through the months to the eclipse
  await page.evaluate(() => __gol.debug.start('gears'));
  check('gears intro shown', (await page.locator('.exp-text').textContent()).includes('Antikythera'));
  await page.locator('.exp-buttons .btn', { hasText: 'Turn the crank' }).click();
  for (let i = 0; i < 16; i++) {
    const c = page.locator('.exp-buttons .btn', { hasText: 'Turn again' });
    if (await c.count() === 0) break;
    await c.click();
  }
  check('gears reaches the eclipse', (await page.locator('.exp-text').textContent()).includes('eclipse'));
  await page.locator('.back-btn').click();

  // cairn: stack three stones on the base at the balance line (x=96), each
  // dropped after the previous settles
  await page.evaluate(() => __gol.debug.start('cairn'));
  check('cairn intro shown', (await page.locator('.exp-text').textContent()).includes('cairn'));
  await page.locator('.exp-buttons .btn', { hasText: 'Begin' }).click();
  const cabox = await page.locator('.pixel-screen').boundingBox();
  for (let i = 0; i < 3; i++) {
    await page.mouse.click(cabox.x + 0.5 * cabox.width, cabox.y + 0.25 * cabox.height);
    await page.waitForTimeout(700);
  }
  check('cairn stands', (await page.locator('.exp-text').textContent()).includes('It stands'));
  await page.locator('.back-btn').click();

  // downhill: tilt ledge 0 and ledge 2 (coords mirror LED in downhill.js) to
  // route the water down; the flow then resolves to the truth after ~1.1s
  await page.evaluate(() => __gol.debug.start('downhill'));
  check('downhill intro shown', (await page.locator('.exp-text').textContent()).includes('way down'));
  await page.locator('.exp-buttons .btn', { hasText: 'Open the water' }).click();
  const dbox = await page.locator('.pixel-screen').boundingBox();
  const dTap = (x, y) => page.mouse.click(dbox.x + (x + 0.5) / 192 * dbox.width, dbox.y + (y + 0.5) / 128 * dbox.height);
  await dTap(92, 34);    // ledge 0 R->L
  await dTap(118, 82);   // ledge 2 R->L
  await page.waitForTimeout(1600);
  check('downhill water reaches the bottom', (await page.locator('.exp-text').textContent()).includes('found the bottom'));
  await page.locator('.back-btn').click();

  // tether: cut the rope, climb, sponge the sparks, reach the truth
  await page.evaluate(() => __gol.debug.start('tether'));
  check('tether intro shown', (await page.locator('.exp-text').textContent()).includes('1783'));
  await page.locator('.exp-buttons .btn', { hasText: 'Cut the tether' }).click();
  check('tether lets go of the ground', (await page.locator('.exp-text').textContent()).includes('let go'));
  await page.locator('.exp-buttons .btn', { hasText: 'Look down' }).click();
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  check('tether sparks threaten the linen', (await page.locator('.exp-text').textContent()).includes('ember'));
  await page.locator('.exp-buttons .btn', { hasText: 'Sponge the sparks' }).click();
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  check('tether truth shown', (await page.locator('.exp-text').textContent()).includes('newborn baby'));
  await page.locator('.back-btn').click();

  // hedge: tap the clumps (coords mirror CLUMPS in hedge.js). Tapping a species
  // twice must teach that it is kinds you count, not bushes; all seven -> truth.
  await page.evaluate(() => __gol.debug.start('hedge'));
  check('hedge intro shown', (await page.locator('.exp-text').textContent()).includes('hedge is older'));
  await page.locator('.exp-buttons .btn', { hasText: 'Walk the thirty paces' }).click();
  const hbox = await page.locator('.pixel-screen').boundingBox();
  const hTap = (x, y) => page.mouse.click(hbox.x + (x + 0.5) / 192 * hbox.width, hbox.y + (y + 0.5) / 128 * hbox.height);
  await hTap(14, 62);    // hawthorn (sp 0)
  await hTap(58, 63);    // hawthorn again -> the lesson
  check('hedge counts kinds, not bushes', (await page.locator('.exp-text').textContent()).includes('already counted'));
  for (const [x, y] of [[38, 62], [76, 62], [96, 62], [114, 63], [132, 62], [166, 62]]) await hTap(x, y);
  await page.waitForTimeout(900);
  check('hedge dates itself by Hooper’s rule',
    (await page.locator('.exp-text').textContent()).includes('seven hundred years'));
  await page.locator('.back-btn').click();

  // seed: four mornings pass on the clock and nothing the player does (or fails
  // to do) can stall them — watering is optional, and the reveal must arrive on
  // its own. This is the dead-end guard: the first version could only finish if
  // you happened to press "water", and otherwise waited forever.
  await page.evaluate(() => __gol.debug.start('seed'));
  check('seed intro shown', (await page.locator('.exp-text').textContent()).includes('hurry'));
  await page.locator('.exp-buttons .btn', { hasText: 'Plant the seed' }).click();
  await page.locator('.exp-buttons .btn', { hasText: 'Let the days pass' }).click();
  check('seed first morning shows bare soil', (await page.locator('.exp-text').textContent()).includes('First morning'));
  await page.locator('.exp-buttons .btn', { hasText: 'Give it water' }).click();
  check('seed drinks a mouthful and no more', (await page.locator('.exp-text').textContent()).includes('one mouthful'));
  check('the water is offered only once', await page.locator('.exp-buttons .btn').count() === 0);
  // from here the player has nothing left to press — the days must arrive anyway
  await page.waitForFunction(
    () => document.querySelector('.exp-text').textContent.includes('hand-span of root'),
    null, { timeout: 30000 });
  check('the days pass without input, and the soil is cut away', true);
  await page.locator('.exp-buttons .btn', { hasText: 'Continue' }).click();
  check('seed sends the player out to plant something', await page.locator('.nature-note').count() === 1);
  await page.locator('.back-btn').click();

  // the hub can only offer what has its strings: a registered experience with a
  // missing catalogue entry renders its key ('sd.s1') at the player instead of a
  // sentence, and nothing at runtime complains. (test/check_strings.mjs is the
  // static half of this gate; this is the one that actually looks at the screen.)
  const ids = await page.evaluate(() => __gol.debug.ids());
  check('every experience is registered with a kind', ids.length > 20 && ids.every(e => ['story', 'game', 'wisdom'].includes(e.kind)));
  const nameGaps = await page.evaluate(() => {
    const out = [];
    for (const l of ['fi', 'en', 'ja']) {
      __gol.debug.setLang(l);
      for (const { id } of __gol.debug.ids()) {
        for (const k of [`exp.${id}.name`, `exp.${id}.desc`]) if (__gol.debug.t(k) === k) out.push(`${l}:${k}`);
      }
    }
    __gol.debug.setLang('en');
    return out;
  });
  check(`every offering is named in all three languages${nameGaps.length ? ` (${nameGaps.slice(0, 6)})` : ''}`, nameGaps.length === 0);

  // (a button is not required to open: seam and hedge start on a canvas tap)
  const keyLike = /^[a-z]{2,4}\.[a-z0-9.]+$/;
  const mute = [];
  for (const { id } of ids) {
    await page.evaluate(i => __gol.debug.start(i), id);
    await page.waitForTimeout(50);
    const said = (await page.locator('.exp-text').textContent()).trim();
    if (said.length < 12 || keyLike.test(said)) mute.push(`${id}("${said.slice(0, 16)}")`);
  }
  check(`every experience opens with words, not a string key${mute.length ? ` — ${mute}` : ''}`, mute.length === 0);
  await page.evaluate(() => __gol.debug.showHub());

  // interlude: force the cycle counter, reload — overlay must appear (daytime prompt)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('golState') || '{}');
    s.sinceInterlude = 2; s.natureIdx = 0;
    localStorage.setItem('golState', JSON.stringify(s));
  });
  await page.clock.install({ time: new Date('2026-07-22T12:00:00') });
  await page.reload({ waitUntil: 'networkidle' });
  check('interlude overlay shown (day)', await page.locator('.overlay').count() === 1);
  check('hub greets by hour (noon)', (await page.locator('.greet').textContent()) === 'The light is high.');
  check('living hub scene present', await page.locator('.hub-canvas').count() === 1);
  const dayTxt = await page.locator('.interlude').textContent();
  check('day prompt is seasonal (July -> barefoot grass)', dayTxt.includes('grass'));

  // the same July, read from the southern hemisphere, must be winter instead
  await page.evaluate(() => { __gol.store.setHemi('s'); });
  await page.reload({ waitUntil: 'networkidle' });
  const southTxt = await page.locator('.interlude').textContent();
  check('southern July is winter, not summer', southTxt.includes('frost') || southTxt.includes('bare tree'));
  check('hemisphere toggle offered in the footer', await page.locator('.hemi-row .lang-btn').count() === 2);
  await page.evaluate(() => { __gol.store.setHemi('n'); });
  await page.reload({ waitUntil: 'networkidle' });
  check('flipping back restores the northern reading',
    (await page.locator('.interlude').textContent()).includes('grass'));
  await page.locator('.overlay .btn').click();   // "I will" -> consumes interlude
  check('interlude consumed', await page.locator('.overlay').count() === 0);
  const since = await page.evaluate(() => JSON.parse(localStorage.getItem('golState')).sinceInterlude);
  check('cycle counter reset', since === 0);

  // the sound garden only grows by accepting an invitation, never by playing
  check('accepting grew the sound garden', await page.evaluate(() => __gol.store.gardenVoices()) >= 1);
  check('sound garden shown in the footer', await page.locator('.garden-note').count() === 1);
  check('garden note counts one voice', (await page.locator('.garden-note').textContent()).includes('♪'));
  check('growth is acknowledged once', await page.locator('.garden-grew').count() === 1);
  await page.evaluate(() => __gol.debug.showHub());
  check('the acknowledgement does not repeat', await page.locator('.garden-grew').count() === 0);

  // evening variant: a season-matched poem from the cross-cultural pool, in
  // the UI language (October + natureIdx 0 -> Wordsworth's rainbow)
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('golState'));
    s.sinceInterlude = 2; s.natureIdx = 0;
    localStorage.setItem('golState', JSON.stringify(s));
  });
  await page.clock.install({ time: new Date('2026-10-22T21:00:00') });
  await page.reload({ waitUntil: 'networkidle' });
  const eveTxt = await page.locator('.interlude').textContent();
  check('evening poem is season-aware (autumn pool)',
    eveTxt.includes('rainbow') && eveTxt.includes('Wordsworth'));

  // same poem, same rest, Finnish UI -> Wordsworth arrives suomeksi
  await page.locator('.overlay .btn').click();
  await page.evaluate(() => {
    const s = __gol.store.getState();   // mutate live state, not localStorage
    s.sinceInterlude = 2; s.natureIdx = 0;
    __gol.debug.setLang('fi');          // re-renders the hub; the due interlude reopens
  });
  const fiTxt = await page.locator('.interlude').textContent();
  check('evening poem crosses cultures (Wordsworth in Finnish)', fiTxt.includes('sateenkaaren'));
  await page.evaluate(() => __gol.debug.setLang('en'));

  // "Not yet" means not this visit — the same invitation must not come back on
  // the next repaint, and Esc / the dark outside the panel close it too
  await page.locator('.overlay .btn').click();
  await page.clock.install({ time: new Date('2026-07-22T12:00:00') });
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('golState'));
    s.sinceInterlude = 2;
    localStorage.setItem('golState', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  check('the invitation is due again', await page.locator('.overlay').count() === 1);
  await page.keyboard.press('Escape');
  check('Escape closes the invitation', await page.locator('.overlay').count() === 0);
  await page.locator('.another-btn').click();          // any hub repaint
  check('"not yet" is not re-asked on a repaint', await page.locator('.overlay').count() === 0);
  await page.reload({ waitUntil: 'networkidle' });     // a new visit asks again
  check('a fresh visit asks once more', await page.locator('.overlay').count() === 1);
  await page.locator('.overlay .btn').click();

  // an address that names an experience opens it; the hub is the plain address
  await page.goto(URL + '#tether', { waitUntil: 'networkidle' });
  check('#id deep-links straight into the experience',
    await page.locator('.pixel-screen').count() === 1 && await page.locator('.card').count() === 0);
  check('the shared address is kept', await page.evaluate(() => location.hash) === '#tether');
  await page.locator('.back-btn').click();
  check('returning to the hub clears the address', await page.evaluate(() => location.hash) === '');
  await page.goto(URL + '#not-a-real-id', { waitUntil: 'networkidle' });
  check('an unknown #id just opens the hub', await page.locator('.card').count() === 1);

  // <html lang> follows the UI language, for screen readers and CJK glyph choice
  await page.evaluate(() => __gol.debug.setLang('ja'));
  check('html lang tracks the language', await page.evaluate(() => document.documentElement.lang) === 'ja');
  await page.evaluate(() => __gol.debug.setLang('en'));

  // Legibility, measured rather than eyeballed. The muted-on-dark palette is
  // the house style and it drifted into genuinely unreadable (1.92:1 on the
  // seasons label); tap targets had the same slow slide. Both regressed twice
  // while being fixed, so they are gated from here on.
  const a11y = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => (s.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number);
    const bgOf = (el) => {
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const b = getComputedStyle(n).backgroundColor;
        if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return parse(b);
      }
      return [20, 19, 17];
    };
    const ratio = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    };
    const dim = [], small = [];
    for (const el of document.querySelectorAll('#app *, .overlay *')) {
      const cs = getComputedStyle(el);
      if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
        const r = ratio(parse(cs.color), bgOf(el));
        if (r < (large ? 3 : 4.5)) dim.push(`${el.className || el.tagName} ${r.toFixed(2)}:1`);
      }
      if (el.matches('button, a, input, textarea')) {
        const b = el.getBoundingClientRect();
        if (b.width < 44 || b.height < 44) small.push(`${el.className || el.tagName} ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
    }
    return { dim, small };
  });
  check(`every text colour clears WCAG AA${a11y.dim.length ? ' — ' + a11y.dim.join(', ') : ''}`, a11y.dim.length === 0);
  check(`every control is a 44px target${a11y.small.length ? ' — ' + a11y.small.join(', ') : ''}`, a11y.small.length === 0);

  // sound has an off switch, and it is remembered. An app that makes noise on
  // its own must let a person on a quiet train stop it.
  check('sound can be turned off from the footer',
    await page.locator('.lang-btn', { hasText: 'off' }).count() === 1);
  await page.locator('.lang-btn', { hasText: 'off' }).click();
  check('the app knows it is muted', await page.evaluate(() => __gol.audio.muted()) === true);
  check('and it is remembered', await page.evaluate(() => __gol.store.soundOn()) === false);
  await page.reload({ waitUntil: 'networkidle' });
  check('the mute survives a visit', await page.evaluate(() => __gol.audio.muted()) === true);
  await page.locator('.lang-btn', { hasText: 'on' }).click();
  check('and it can be turned back on', await page.evaluate(() => __gol.audio.muted()) === false);

  // screen-reader wiring: one landmark, the story text announces each new beat,
  // and the canvas keeps quiet (the text is the channel that can be followed)
  check('the app is a main landmark', await page.locator('main#app').count() === 1);
  await page.goto(URL + '#tern', { waitUntil: 'networkidle' });
  check('the story text is a live region',
    await page.locator('.exp-text').getAttribute('aria-live') === 'polite');
  check('the scene canvas is not announced',
    await page.locator('.pixel-screen').getAttribute('aria-hidden') === 'true');
  check('the tab names the experience', (await page.title()).startsWith('The Longest Summer'));
  await page.locator('.back-btn').click();
  check('the hub takes its plain title back', await page.title() === 'The Game of Life');

  // a phone held sideways: scene, text and choices must fit without scrolling
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto(URL + '#tern', { waitUntil: 'networkidle' });
  const land = await page.evaluate(() => ({
    fits: document.body.scrollHeight <= innerHeight,
    btnVisible: document.querySelector('.exp-buttons .btn').getBoundingClientRect().bottom <= innerHeight,
  }));
  check('landscape fits without scrolling', land.fits);
  check('landscape keeps the choices on screen', land.btnVisible);
  await page.setViewportSize({ width: 1280, height: 720 });

  // asking the system for less motion stills the decorative header
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const stillHeader = await page.evaluate(async () => {
    const c = document.querySelector('.hub-canvas');
    const a = c.toDataURL();
    await new Promise(r => setTimeout(r, 600));
    return c.toDataURL() === a;
  });
  check('reduced motion stills the hub header', stillHeader);
  await page.emulateMedia({ reducedMotion: null });
  await page.goto(URL, { waitUntil: 'networkidle' });

  // saying nothing must not be recorded as feedback, nor thanked for
  const before = await page.evaluate(() => __gol.debug.feedback().length);
  await page.locator('.footer-link').click();
  await page.locator('.btn', { hasText: 'Leave it' }).click();
  check('an empty thought is not stored',
    await page.evaluate(() => __gol.debug.feedback().length) === before);
  check('an empty thought returns to the hub without thanks',
    await page.locator('.card').count() === 1);

  // ── the feedback actually leaves the browser ──────────────────────
  // with no endpoint configured, nothing is promised and nothing is sent
  const sentBefore = collected.length;
  await page.locator('.footer-link').click();
  check('unconfigured panel makes no delivery claim', await page.locator('.fb-dest').count() === 0);
  await page.locator('.leaf-btn').nth(2).click();
  await page.locator('.btn', { hasText: 'Leave it' }).click();
  await page.waitForTimeout(400);
  check('nothing is posted without an endpoint', collected.length === sentBefore);

  // configured and reachable: the note lands on the endpoint
  const base = `http://localhost:${server.address().port}`;
  await page.evaluate(u => __gol.debug.setEndpoint(u), `${base}/collect`);
  await page.locator('.footer-link').click();
  check('a configured panel says where the note goes', await page.locator('.fb-dest').count() === 1);
  await page.locator('.leaf-btn').nth(4).click();
  await page.locator('.fb-text').fill('the pine one made me go outside');
  await page.locator('.btn', { hasText: 'Leave it' }).click();
  await page.waitForTimeout(700);
  check('the note reaches the endpoint', collected.length === sentBefore + 1);
  check('it carries the words, rating and language',
    collected.at(-1)?.text === 'the pine one made me go outside'
    && collected.at(-1)?.leaves === 5 && collected.at(-1)?.lang === 'en');

  // endpoint down: the note is kept, not lost, and goes out on the retry
  await page.evaluate(u => __gol.debug.setEndpoint(u), `${base}/collect-broken`);
  await page.locator('.footer-link').click();
  await page.locator('.fb-text').fill('written while the line was down');
  await page.locator('.btn', { hasText: 'Leave it' }).click();
  await page.waitForTimeout(700);
  const queued = await page.evaluate(() => __gol.debug.outbox());
  check('an undeliverable note is kept, not lost', queued.length === 1);
  check('and the player is told so, not thanked',
    queued[0].text === 'written while the line was down');
  await page.evaluate(u => __gol.debug.setEndpoint(u), `${base}/collect`);
  const flushed = await page.evaluate(() => __gol.debug.flush());
  check('the outbox drains once the endpoint answers again', flushed === 1);
  check('the held note arrives too',
    collected.at(-1)?.text === 'written while the line was down');
  check('and it leaves the outbox', (await page.evaluate(() => __gol.debug.outbox())).length === 0);

  // debug handle + feedback store
  await page.evaluate(() => __gol.debug.setEndpoint(''));
  const fb = await page.evaluate(() => __gol.debug.feedback());
  check('every note is also kept locally', fb.length === 3 && fb[0].leaves === 3);

  check('zero console/page errors overall', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  await browser.close();
  server.close();
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
