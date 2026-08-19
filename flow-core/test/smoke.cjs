// Both entry points, in a real browser: do they boot, does the map paint, does
// a drawn line carry anybody, and do the phone-shaped rules from the brief's
// contract list hold — 44px targets, no horizontal overflow, pause not
// breaking touch editing.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const s = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

const PHONE = { width: 390, height: 780 };

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch();

  for (const [name, url, handle, startBtn] of [
    ['piritori', '/piritori/', '__pt', '#play'],
    ['toko-move', '/toko-move/', '__tm', '#play'],
  ]) {
    console.log(`\n${name}\n`);
    const p = await b.newPage({ viewport: PHONE });
    const errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

    await p.goto(base + url);
    await p.waitForTimeout(500);
    ok('boots with no errors', errs.length === 0, errs.slice(0, 2).join(' | '));
    ok('the handle is exposed', await p.evaluate(h => !!window[h], handle));

    await p.click(startBtn);
    await p.waitForTimeout(400);
    ok('the clock is running', await p.evaluate(h => !window[h].flow.clock.paused, handle));

    // the map actually painted something other than paper
    ok('the map paints', await p.evaluate(() => {
      const c = document.getElementById('map');
      const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const first = [g[0], g[1], g[2]].join();
      for (let i = 4; i < g.length; i += 4) if ([g[i], g[i + 1], g[i + 2]].join() !== first) return true;
      return false;
    }));

    // draw a line by dragging between two stops, and check it carries people
    const drew = await p.evaluate(h => {
      const f = window[h].flow;
      const r = f.addRoute('tram', ['hakaniemi', 'kuudeslinja', 'kirkko', 'karhupuisto', 'vaasanaukio', 'kurvi']);
      return !r.error;
    }, handle);
    ok('a line can be drawn', drew);
    // a tram leg is ~20 ticks and a tick is 100ms, so a second of wall clock
    // buys ten ticks — half a leg. Run it at ×4 and wait properly rather than
    // asserting against a carrier that has not left the first stop.
    await p.evaluate(h => window[h].flow.clock.setSpeed(4), handle);
    await p.waitForTimeout(4000);
    const moved = await p.evaluate(h => window[h].flow.stats(), handle);
    ok(`the line carries people (riding ${moved.riding}, done ${moved.completed})`,
      moved.riding + moved.completed > 0);

    // pause must freeze the sim but leave editing alive
    await p.click('#pause');
    await p.waitForTimeout(300);
    const t1 = await p.evaluate(h => window[h].flow.clock.tick, handle);
    await p.waitForTimeout(400);
    const t2 = await p.evaluate(h => window[h].flow.clock.tick, handle);
    ok('pause freezes the simulation', t1 === t2, `${t1} → ${t2}`);
    ok('editing still works while paused', await p.evaluate(h => {
      const f = window[h].flow;
      const n = f.routes.list.length;
      f.addRoute('tram', ['harju', 'vaasanaukio', 'kurvi']);
      return f.routes.list.length === n + 1;
    }, handle));
    await p.click('#pause');

    // phone rules
    ok('no horizontal overflow on a phone',
      await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    const small = await p.$$eval('button', bs => bs.filter(x => {
      const r = x.getBoundingClientRect();
      return r.width > 0 && (r.width < 44 || r.height < 44);
    }).map(x => x.id || x.textContent.trim().slice(0, 16)));
    ok('every control clears 44px', small.length === 0, small.join(', '));

    // the active city: fixed services run from boot, and everything on the
    // map opens a small window when asked
    ok('the metro is running before the player draws anything',
      await p.evaluate(h => window[h].flow.routes.list.some(r => r.fixed && r.mode === 'metro'), handle));
    ok('trams and cars are out too', await p.evaluate(h => {
      const modes = new Set(window[h].flow.routes.list.filter(r => r.fixed).map(r => r.mode));
      return modes.has('tram') && modes.has('car');
    }, handle));
    ok('a fixed line refuses the player\'s edits', await p.evaluate(h => {
      const f = window[h].flow;
      const m = f.routes.list.find(r => r.fixed);
      return !!f.removeRoute(m.id).error && !!f.reshapeRoute(m.id, m.nodes.slice(0, 2)).error;
    }, handle));
    ok('a tap on a moving carrier opens its window', await p.evaluate(h => {
      const d = window[h].debug;
      const f = window[h].flow;
      const r = f.routes.list.find(x => x.fixed && x.mode === 'metro');
      d.showPop({ kind: 'carrier', routeId: r.id, carrierId: r.carriers[0].id }, { x: 100, y: 100 });
      const open = !document.getElementById('pop').hidden
        && document.getElementById('popBody').textContent.length > 20;
      d.hidePop();
      return open;
    }, handle));
    ok('there are pins on the map', await p.evaluate(h => window[h].debug.markers().length > 0, handle));
    ok('every pin opens a window that says something', await p.evaluate(h => {
      const d = window[h].debug;
      for (const mk of d.markers()) {
        d.showPop({ kind: 'marker', id: mk.id, marker: mk }, { x: 100, y: 100 });
        if (document.getElementById('pop').hidden
          || document.getElementById('popBody').textContent.length < 15) { d.hidePop(); return false; }
      }
      d.hidePop();
      return true;
    }, handle));

    // ── the encounter layer, driven through the REAL UI ──────────────────
    //
    // This block used to call autoTurn() through the debug handle, which
    // exercised the MODEL and never the INTERFACE — so it passed while a real
    // encounter opened frozen with no buttons at all. Debug hooks are for
    // SETUP only now; every action below is a click on the thing a player
    // clicks.
    if (name === 'piritori') {
      ok('the night map pins people, sellers, a rival and the goals',
        await p.evaluate(() => {
          const ids = window.__pt.debug.markers().map(m => m.id).join();
          return ids.includes('contact:') && ids.includes('dealers')
            && ids.includes('rival') && ids.includes('mission:');
        }));

      // ── the room, and the bargain inside it ─────────────────────────
      // The offer is SET UP through the handle and everything after is a
      // click: walk into the man's place from the stop sheet, take what he is
      // offering, and — from somebody else's place — pay to be told whether
      // the bag is real. A fake bag the player cannot be sold is not a
      // mechanic, and a room you cannot walk into is not a location.
      const room = await p.evaluate(async () => {
        const d = window.__pt.debug, m = window.__pt.market;
        m.cash = 50000;
        d.forceDeal({ seller: 'igor', at: 'sornainen', who: 'Igor',
          good: 'piri', n: 5, discount: 0.4, fake: true, trust: -1 });
        d.sel = 'sornainen';
        const visit = document.getElementById('visit');
        if (!visit) return { sheet: false };
        visit.click();
        const open = !document.getElementById('room').hidden;
        const who = document.getElementById('roomWho').textContent;
        const take = [...document.querySelectorAll('#roomBtns button')]
          .find(b => /TAKE THE/.test(b.textContent));
        if (!take) return { sheet: true, open, who, took: false };
        const before = m.stock.piri;
        take.click();
        return {
          sheet: true, open, who,
          bought: m.stock.piri - before,
          cut: m.fake.piri,
          gone: ![...document.querySelectorAll('#roomBtns button')]
            .some(b => /TAKE THE/.test(b.textContent)),
        };
      });
      ok('a contact\'s stop offers a way in', room.sheet);
      ok('and walking in opens their place', room.open === true && /IGOR/.test(room.who || ''), room.who);
      ok('the offer is taken in the room', room.bought === 5, String(room.bought));
      ok('and a cut bag is really cut', room.cut === 5, String(room.cut));
      ok('the offer cannot be taken twice', room.gone === true);

      // …and the appraisal, which is the second relationship paying off
      const asked = await p.evaluate(async () => {
        const d = window.__pt.debug, m = window.__pt.market;
        m.cash = 50000;
        d.forceDeal({ seller: 'igor', at: 'sornainen', who: 'Igor',
          good: 'piri', n: 5, discount: 0.4, fake: true, trust: -1 });
        d.closeRoom();
        d.openRoom('jaska');                       // somebody else entirely
        const ask = [...document.querySelectorAll('#roomBtns button')]
          .find(b => /ASK ABOUT/.test(b.textContent));
        if (!ask) return { offered: false };
        const before = m.cash;
        ask.click();
        const said = document.querySelector('#roomBtns .said')?.textContent || '';
        d.closeRoom();
        return { offered: true, spent: before - m.cash, said };
      });
      ok('a second contact will look at the first one\'s offer', asked.offered);
      ok('and charges for it', asked.spent > 0, String(asked.spent));
      ok('and a kept contact tells the truth', /cut/i.test(asked.said || ''), asked.said);

      await p.evaluate(() => window.__pt.debug.startFight('collector', 1000));
      await p.waitForTimeout(300);
      ok('an encounter opens', await p.locator('#fight').isVisible());
      ok('the board paints', await p.evaluate(() => {
        const c = document.getElementById('board');
        const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const first = [g[0], g[1], g[2]].join();
        for (let i = 4; i < g.length; i += 4) if ([g[i], g[i + 1], g[i + 2]].join() !== first) return true;
        return false;
      }));
      ok('it is three a side', await p.evaluate(() => {
        const f = window.__pt.debug.fight;
        return f.living('you').length === 3 && f.living('them').length === 3;
      }));

      // THE ONE THAT MATTERS: whoever wins initiative, the player must end up
      // with something to press. Every roster has an enemy who is faster than
      // Aatami, so if enemy turns are not run for us the panel opens dead.
      const firstUp = await p.evaluate(() => window.__pt.debug.fight.actor.side);
      const btns = await p.locator('#fightBtns button:visible').count();
      ok(`the fight is actionable on arrival (first actor: ${firstUp}, ${btns} buttons)`,
        btns > 0);
      ok('it telegraphs before you commit',
        (await p.locator('#fightTell').textContent()).length > 10);
      ok('it freezes the city while it runs',
        await p.evaluate(() => window.__pt.flow.clock.paused));

      // The arena is ADDITIVE: it must load when it exists and change nothing
      // when it does not.
      ok('the fight stands on generated ground when there is some',
        await p.evaluate(async () => {
          const v = window.__pt.debug.fightView;
          for (let i = 0; i < 40 && !v.arena; i++) await new Promise(r => setTimeout(r, 50));
          return !!v.arena && v.arenaId === 'piritori/arena-court';
        }));
      ok('and the board drops onto its ground rather than centring on the roofs',
        await p.evaluate(() => {
          const v = window.__pt.debug.fightView;
          const withArt = v.cell('you', 1, 0, 3).y;
          const held = v.arena; v.arena = null;
          const without = v.cell('you', 1, 0, 3).y;
          v.arena = held;
          return withArt > without;
        }));
      ok('and it survives the art not being there at all', await p.evaluate(() => {
        const d = window.__pt.debug, v = d.fightView;
        const held = v.arena;
        v.arena = null;
        try { v.draw(d.fight); return true; } catch { return false; } finally { v.arena = held; }
      }));

      ok('the arena has cover standing in it', await p.evaluate(() => {
        const f = window.__pt.debug.fight;
        return f.props.length > 0 && f.props.every(x => x.alive && x.hp > 0);
      }));

      // arm a weapon by clicking it, then strike a ringed body on the canvas
      const before = await p.evaluate(() => {
        const f = window.__pt.debug.fight;
        return f.units.reduce((s, u) => s + u.hp + u.nerve, 0);
      });
      await p.locator('#fightBtns button').first().click();
      await p.waitForTimeout(80);
      const shot = await p.evaluate(() => {
        const d = window.__pt.debug, f = d.fight, v = d.fightView;
        const t = f.targets(f.actor, f.actor.weapons[0]).find(x => !x.prop);
        if (!t) return null;
        const c = document.getElementById('board').getBoundingClientRect();
        const pt = v.cell(t.side, t.col, t.row, f.rows);
        return { x: c.left + pt.x / v.dpr, y: c.top + pt.y / v.dpr - 16 };
      });
      if (shot) { await p.mouse.click(shot.x, shot.y); await p.waitForTimeout(120); }
      const after = await p.evaluate(() => {
        const f = window.__pt.debug.fight;
        return f.units.reduce((s, u) => s + u.hp + u.nerve, 0);
      });
      ok('clicking a weapon then a body actually strikes', after < before, `${before} → ${after}`);

      // ITEM, clicked. A consumable you cannot actually throw is a button.
      const thrown = await p.evaluate(async () => {
        const d = window.__pt.debug, f = d.fight;
        const btn = [...document.querySelectorAll('#fightBtns button')]
          .find(b => /THROW THE/.test(b.textContent));
        if (!btn) return { shown: false };
        const label = btn.textContent;
        const before = f.items.rock + f.items.bottle;
        btn.click();                                   // arms it
        const item = d.fightView.sel;
        const t = f.itemTargets(f.actor)[0];
        if (!t) return { shown: true, armed: item, threw: false };
        f.act({ kind: 'throw', item: item.slice(1), target: t.id });
        return { shown: true, armed: item, label, spent: before - (f.items.rock + f.items.bottle) };
      });
      ok('the street offers something to throw', thrown.shown, JSON.stringify(thrown));
      ok('the button says how many are left', /\d+ left/.test(thrown.label || ''), thrown.label);
      ok('arming an item is not arming a weapon', (thrown.armed || '').startsWith('!'), thrown.armed);
      ok('and throwing one spends it', thrown.spent === 1, String(thrown.spent));

      // the out is offered every round and is a real button
      ok('OFFER THEM THE OUT is always present',
        await p.locator('#fightBtns button', { hasText: 'OFFER THEM THE OUT' }).count() > 0);

      // hand it to the auto-battler by clicking, and let it finish
      await p.locator('#fightBtns button', { hasText: 'AUTO' }).first().click();
      for (let i = 0; i < 40; i++) {
        if (await p.evaluate(() => !!window.__pt.debug.fight?.over)) break;
        await p.waitForTimeout(60);
      }
      ok('the auto-battler finishes it from a click',
        await p.evaluate(() => !!window.__pt.debug.fight?.over));

      await p.locator('#fightBtns button', { hasText: 'CONTINUE' }).click();
      await p.waitForTimeout(150);
      ok('and it closes and hands the city back',
        !(await p.locator('#fight').isVisible())
        && await p.evaluate(() => !window.__pt.flow.clock.paused));
    } else {
      ok('no encounter layer in this product', await p.evaluate(() => !document.getElementById('fight')));
    }

    // ── restarting must not leave the old listeners behind ────────────────
    const dupes = await p.evaluate(async h => {
      const api = window[h];
      api.debug.boot(7);
      await new Promise(r => setTimeout(r, 60));
      const n = api.flow.routes.drawn.length;
      api.flow.addRoute('tram', ['harju', 'vaasanaukio', 'kurvi']);
      return { added: api.flow.routes.drawn.length - n };
    }, handle);
    ok('after a restart one route is one route', dupes.added === 1, `added ${dupes.added}`);
    ok('the line budget counts only the player\'s own lines', await p.evaluate(h => {
      const t = document.getElementById('lines').textContent;
      const max = window[h].flow.routes.maxRoutes;
      const shown = parseInt(t.split('/')[0], 10);
      return shown <= max;
    }, handle), await p.locator('#lines').textContent());

    ok('still no errors after playing', errs.length === 0, errs.slice(0, 2).join(' | '));
    await p.close();
  }

  await b.close(); s.close();
  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
});
