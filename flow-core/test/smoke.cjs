// Toko Move remains the shared flow engine's daylight entry point. Piritori v3
// now has its own authored-campaign browser gate in
// piritori/test/v3-playthrough.cjs; keeping the old v2 path here would prove a
// cabinet that no longer ships.
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

    // ── the encounter layer ───────────────────────────────────────────────
    //
    // Piritori's encounters are gated by piritori/test/v3-playthrough.cjs now.
    // The v2 walkthrough that used to live here — open a room, take a bargain,
    // start a fight, click a weapon, click a target — was ~175 lines driving a
    // `window.__pt` handle and an `art/arenas/court.webp` that the shipping
    // cabinet no longer has. It had already been cut out of the loop above and
    // left in the file, where it read as a live gate and was not one: `name` is
    // only ever 'toko-move', so the branch could never run.
    //
    // What flow-core still needs from this file is the negative: the DAYLIGHT
    // product must have no encounter layer at all. That is a real claim about
    // the shared engine — nothing adult may leak into the neutral core or into
    // Toko Move — and it is the half that was doing work here.
    ok('no encounter layer in this product',
      await p.evaluate(() => !document.getElementById('fight')));

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
