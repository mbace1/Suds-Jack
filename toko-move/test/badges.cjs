// THE BADGE DECLUTTER GATE.
//
// LiveNetwork.draw() used to paint one badge per vehicle at its exact position
// in vehicle order with no collision handling at all: at city scale on a phone
// that was 34 overlapping pairs, a stack nine deep and a quarter of all badge
// area buried under a later badge. The fix is DEGRADATION, not movement — a
// badge is the vehicle, so nudging one lies about where the tram is. The
// highest-ranked vehicle in a crowd keeps its labelled badge and the rest fall
// back to a dot at their true position, with rank supplied by the caller so the
// lines your job can actually use are the ones that stay readable.
//
// This gate holds three things: that no two labelled badges overlap, that no
// vehicle is silently dropped on the way (badges + dots == shown), and that
// rank is really consulted — a check that only passes because the crowd was
// thin would be worth nothing, so it asserts the declutter is engaging first.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log(`${c ? 'ok  ' : 'FAIL'}  ${m}`); };

const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

const VIEWS = { 'phone 390x844': [390, 844], 'tablet 820x1180': [820, 1180] };

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    for (const [view, [width, height]] of Object.entries(VIEWS)) {
      const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      await page.goto(`${base}/toko-move/`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__tm?.camera && window.__tm?.liveNetwork, null, { timeout: 30000 });
      // Spy on the call the game itself makes, before anything else touches it:
      // the declutter is only worth having if main actually ranks the vehicles.
      await page.evaluate(() => {
        const ln = window.__tm.liveNetwork, real = ln.draw.bind(ln);
        window.__seenOpts = [];
        ln.draw = (c, t, p, d, opts) => { window.__seenOpts.push(opts || {}); return real(c, t, p, d, opts); };
      });
      await page.tap('#play');
      await page.waitForTimeout(1500);

      const wired = await page.evaluate(() => window.__seenOpts.some(o => typeof o.priority === 'function'));
      ok(wired, `${view}: the game ranks its vehicles — draw() is called with a priority function`);

      for (const scale of ['city', 'route', 'stop']) {
        const r = await page.evaluate(async (s) => {
          const tm = window.__tm, ln = tm.liveNetwork;
          tm.camera.snapTo(s); tm.camera.zoom = tm.camera.targetZoom;
          await new Promise(done => setTimeout(done, 600));
          const canvas = document.getElementById('map');
          const on = b => b.x + b.w > 0 && b.y + b.h > 0 && b.x < canvas.width && b.y < canvas.height;
          const badges = (ln.lastBadges || []).filter(on), dots = (ln.lastDots || []).filter(on);
          const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
          const collisions = [];
          for (let i = 0; i < badges.length; i++) for (let j = i + 1; j < badges.length; j++)
            if (hit(badges[i], badges[j])) collisions.push(`${badges[i].line}/${badges[j].line}`);
          return { badges: badges.length, dots: dots.length, collisions,
            shown: ln.lastShown, accounted: (ln.lastBadges || []).length + (ln.lastDots || []).length };
        }, scale);
        ok(r.collisions.length === 0, `${view} ${scale}: no two labelled badges overlap (${r.badges} labelled, ${r.dots} dots${r.collisions.length ? ' — ' + r.collisions.slice(0, 4).join(' ') : ''})`);
        ok(r.accounted === r.shown, `${view} ${scale}: every vehicle on the board is drawn as one or the other (${r.accounted} of ${r.shown})`);
      }
      await ctx.close();
    }

    // Rank, on the one viewport where the crowd is worst. Drawn straight through
    // draw() onto the live canvas so the test drives the shipping code path.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(`${base}/toko-move/`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.camera && window.__tm?.liveNetwork, null, { timeout: 30000 });
    await page.tap('#play');
    await page.waitForTimeout(1500);
    const rank = await page.evaluate(async () => {
      const tm = window.__tm, ln = tm.liveNetwork;
      tm.camera.snapTo('city'); tm.camera.zoom = tm.camera.targetZoom;
      await new Promise(done => setTimeout(done, 600));
      const canvas = document.getElementById('map'), c2d = canvas.getContext('2d');
      const dpr = tm.renderer?.dpr || 1, tick = tm.flow.clock.tick;
      const run = priority => {
        ln.draw(c2d, tick, (a, b) => tm.project(a, b), dpr, { filter: tm.fleetFilter?.(), priority });
        return { labelled: (ln.lastBadges || []).map(b => b.line), dotted: (ln.lastDots || []).map(b => b.line),
          badgeBoxes: (ln.lastBadges || []).slice(), dotBoxes: (ln.lastDots || []).slice() };
      };
      const flat = run(null);
      // A line that lost EVERY badge it had — the one the rank rule exists for.
      const silenced = flat.dotted.find(n => !flat.labelled.includes(n)) || null;
      const raised = silenced ? run(l => (l?.name === silenced ? 2 : 1)) : null;
      const again = run(null);
      // The placement RULE, asserted directly: a vehicle only ever yields its
      // label to one that outranks it (rank first, then id — never a geometric
      // tiebreak, which would let two crossing trams swap who is readable).
      const before = (a, b) => a.rank !== b.rank ? a.rank > b.rank : String(a.id) < String(b.id);
      const gap = tm.renderer?.dpr || 1;
      const overlaps = (a, b) => a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
      const usurped = again.dotBoxes.filter(d => {
        const box = { x: d.x + d.w / 2 - 12 * (tm.renderer?.dpr || 1), y: d.y + d.h / 2 - 7 * (tm.renderer?.dpr || 1), w: 24 * (tm.renderer?.dpr || 1), h: 14 * (tm.renderer?.dpr || 1) };
        const over = again.badgeBoxes.filter(b => overlaps(box, b));
        return !over.some(b => before(b, d));
      }).map(d => `${d.line}#${d.id}`);
      // Asserted by POSITION, not by line name: several trams share a line, so
      // "a badge saying 2H exists" would pass even when yours was the one silenced.
      const selected = (() => {
        const crowded = ln.vehicles.filter(x => x.layer.visible)
          .map(x => ({ x, p: ln.position(x, tick) })).filter(o => o.p);
        const victim = crowded.find(o => {
          const q = tm.project(o.p.lat, o.p.lon);
          return (ln.lastDots || []).some(d => Math.abs(d.x + d.w / 2 - q.x) < 1 && Math.abs(d.y + d.h / 2 - q.y) < 1);
        });
        if (!victim) return null;
        ln.select(victim.x.id);
        run(l => 1);
        const q = tm.project(victim.p.lat, victim.p.lon);
        const held = (ln.lastBadges || []).some(b => Math.abs(b.x + b.w / 2 - q.x) < 1 && Math.abs(b.y + b.h / 2 - q.y) < 1);
        ln.clearSelection();
        return held;
      })();
      return { degraded: flat.dotted.length, silenced,
        raisedBack: raised ? raised.labelled.includes(silenced) : false,
        stable: JSON.stringify(flat.labelled) === JSON.stringify(again.labelled), usurped, selected };
    });
    ok(rank.degraded > 0, `phone city: the declutter is engaging — ${rank.degraded} vehicles yielded a label, so the no-overlap checks above are not vacuous`);
    ok(rank.silenced !== null, `phone city: at least one line loses every badge unranked (${rank.silenced}) — the case rank exists for`);
    ok(rank.raisedBack, `phone city: ranking that line high gives it a readable badge back (${rank.silenced})`);
    ok(rank.stable, 'phone city: the same tick drawn twice keeps the same badges');
    ok(rank.usurped.length === 0, `phone city: every vehicle that yielded its label yielded it to one that outranks it — rank then id, never geometry${rank.usurped.length ? ' — ' + rank.usurped.slice(0, 4).join(' ') : ''}`);
    ok(rank.selected === true, `phone city: a vehicle that was a dot keeps its badge once you select it${rank.selected === null ? ' — NO DEGRADED VEHICLE TO SELECT' : ''}`);
    await ctx.close();
  } catch (e) {
    fail++; console.log(`FAIL  threw: ${e.message}`);
  }
  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
