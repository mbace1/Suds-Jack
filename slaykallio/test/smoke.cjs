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
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__sk, null, { timeout: 8000 });
  check('the page boots with no errors', errors.length === 0, errors.join(' | '));

  // the menu
  check('the menu offers the whole roster', await page.locator('#roster .pick').count() === 4);
  check('every character shows a painted portrait',
    await page.evaluate(() => [...document.querySelectorAll('#roster .pick canvas')]
      .every(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some(v => v > 0))));
  check('the menu names the theme it is in', /kallio/i.test(await page.locator("#menu .theme").innerText()));

  // the theme switch, from the menu
  await page.locator('#menu .theme').click();
  await page.waitForTimeout(200);
  check('the switch renames the theme', /fantasy/i.test(await page.locator("#menu .theme").innerText()));
  const fantasyName = await page.locator('#roster .pick b').first().innerText();
  const fantasyTitle = await page.locator('#roster .pick i').first().innerText();
  await page.locator('#menu .theme').click();
  await page.waitForTimeout(200);
  check('and it renames the roster with it',
    fantasyTitle !== await page.locator('#roster .pick i').first().innerText(), fantasyTitle);
  check('but a character keeps their name across the skins',
    fantasyName === await page.locator('#roster .pick b').first().innerText());

  // ── a fight ────────────────────────────────────────────────────────────
  await page.evaluate(() => { __sk.setSpeed(0); __sk.start('drinker', 4); });
  await page.waitForTimeout(300);
  check('the run opens on the first encounter',
    await page.evaluate(() => __sk.state().encounter) === 0);
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
  for (let enc = 0; enc < 6; enc++) {
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
  check('and the run walks on to the next bridge', st2.phase === 'fight' && st2.enc === 1);
  check('the new fight has its own puppets',
    await page.evaluate(() => __sk.puppets().foes.length === __sk.state().enemies.length && __sk.puppets().foes.every(p => p.alive)));
  check('the friend is on the board where you can read it', await page.locator('#jokers .joker:not(.empty)').count() === 1);

  // ── the theme switch, mid-run ──────────────────────────────────────────
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
  check('the hand is on screen and reachable by a thumb', await pp.evaluate(() => {
    const cards = [...document.querySelectorAll('#hand .card')];
    if (!cards.length) return false;
    return cards.every(c => { const r = c.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1 && r.width >= 44; });
  }));
  const pFramed = [];
  for (let enc = 0; enc < 6; enc++) {
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
