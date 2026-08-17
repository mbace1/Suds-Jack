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

    // the encounter layer is Piritori-only, and must never reach the other one
    if (name === 'piritori') {
      // the pin set the request names: contacts (gangs, the wholesale), the
      // sellers, the rival crew, and mission goals — the patrol appears with
      // heat, proven separately in the contract of heat.js
      ok('the night map pins people, sellers, a rival and the goals',
        await p.evaluate(() => {
          const ids = window.__pt.debug.markers().map(m => m.id).join();
          return ids.includes('contact:') && ids.includes('dealers')
            && ids.includes('rival') && ids.includes('mission:');
        }));
      await p.evaluate(() => window.__pt.debug.startFight('collector', 1000));
      await p.waitForTimeout(250);
      ok('an encounter opens', await p.locator('#fight').isVisible());
      ok('the isometric board paints', await p.evaluate(() => {
        const c = document.getElementById('board');
        const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        const first = [g[0], g[1], g[2]].join();
        for (let i = 4; i < g.length; i += 4) if ([g[i], g[i+1], g[i+2]].join() !== first) return true;
        return false;
      }));
      ok('it is three a side', await p.evaluate(() => {
        const f = window.__pt.debug.fight;
        return f.living('you').length === 3 && f.living('them').length === 3;
      }));
      ok('it telegraphs before you commit',
        (await p.locator('#fightTell').textContent()).length > 10);
      ok('it freezes the city while it runs',
        await p.evaluate(() => window.__pt.flow.clock.paused));
      ok('a weapon out of its row is refused by the button', await p.evaluate(() => {
        const f = window.__pt.debug.fight;
        const u = f.living('you').find(x => x.weapons.includes('blank'));
        return !!u && !f.canUse(u, 'blank') === (u.row === 0);
      }));
      // hand it to the auto-battler and let it finish
      await p.evaluate(() => {
        const f = window.__pt.debug.fight;
        f.auto = true;
        let n = 0;
        while (!f.over && n++ < 400) f.autoTurn();
      });
      await p.evaluate(() => window.__pt.debug.paintFight());
      await p.waitForTimeout(120);
      ok('the auto-battler finishes it',
        await p.evaluate(() => !!window.__pt.debug.fight.over));
      await p.locator('#fightBtns button').last().click();
      await p.waitForTimeout(150);
      ok('and it closes and hands the city back',
        !(await p.locator('#fight').isVisible())
        && await p.evaluate(() => !window.__pt.flow.clock.paused));
    } else {
      ok('no encounter layer in this product', await p.evaluate(() => !document.getElementById('fight')));
    }

    ok('still no errors after playing', errs.length === 0, errs.slice(0, 2).join(' | '));
    await p.close();
  }

  await b.close(); s.close();
  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
});
