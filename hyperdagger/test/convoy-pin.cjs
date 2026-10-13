// Hyper Dagger — HD-014 step 1: the convoy's geometry, pinned.  node hyperdagger/test/convoy-pin.cjs
//
// Season 3's trucks are about to become landspeeders (docs/HD-014-landspeeder-plan.md).
// That is a VISUAL change: the player and the cargo stand on numbers that must
// not move with it. This check records those numbers as they are on main
// (603e76d82) and fails if any of them shifts:
//   - deck (trailer top) height: top = ROAD_Y + CHASSIS + trailerH, trailerH in [2.0, 3.8]
//   - deck extents: topAt() answers inside w/2+0.3 × depth/2+0.3 and nowhere else
//   - trailer box, roof slab, crate rest heights (s/2 + stack + 0.02 above the deck)
//   - the cab centre the gaze locks onto, and its lock radius
//   - collision boxes in the cargo solver (trailer [w, depth, trailerH], crate [s, s, s])
//   - the deck bob: group.y = top + sin(age·bobW + ph) · 0.07, from Convoy._pose
// Read-only through window.__hd.debug.truckObj() — no debug hook added, no
// game code touched. Skulls are switched off on the page's own cfg so main's
// enemy path never runs while we look.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const s = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

// THE PINS (main @ 603e76d82). Change one only on purpose, with Mikael's yes.
const PIN = {
  ROAD_Y: -3.2, CHASSIS: 1.1, trailerH: [2.0, 3.8], top: [-0.1, 1.7],
  w: [2.6, 3.4], depth: [7, 11.5], footMargin: 0.3,
  roof: { y: 0.01, h: 0.06, wK: 0.96, dK: 0.98 },
  crate: { size: [0.7, 1.05], gap: 0.02, standMargin: 0.25 },
  cab: { h: 2.3, l: 2.6, wK: 0.92, gap: 0.25, chassisK: 0.6, radius: 1.6 },
  bob: 0.07, fallY: -2.9,
};
const E = 1e-6;

s.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + s.address().port;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    env: { ...process.env, LD_LIBRARY_PATH: process.env.PLAYWRIGHT_CHROMIUM_LIB || process.env.LD_LIBRARY_PATH },
    args: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? ['--no-sandbox', '--single-process', '--no-zygote', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--in-process-gpu']
      : ['--use-gl=swiftshader', '--disable-dev-shm-usage'],
  });
  const errs = [];
  const q = await b.newPage({ viewport: { width: 820, height: 540 } });
  q.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await q.addInitScript(() => { localStorage.setItem('hyperDaggerModeV31', 'truck'); localStorage.setItem('hyperDaggerRunKind', 'free'); });
  await q.goto(base + '/hyperdagger/?assets=0&season=haul', { waitUntil: 'load' });
  await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
  const r = await q.evaluate(async () => {
    const hd = window.__hd, d = hd.debug, pl = hd.player;
    const frames = n => new Promise(r => { let c = 0; const f = () => (++c >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    d.startGame(); d.freezeDirector?.(true); d.setInvulnerable(true);
    await frames(2);
    const cv = d.truckObj();
    if (!cv?.cargo) return { convoy: false };
    cv.cfg.skullsFrom = 1e9;              // no skulls: main's enemy path stays out of this
    cv.reset(pl);
    const first = cv.trucks[0];
    const spawn = { floorY: pl.floorY, feetY: pl.feet.y, groupY: first.group.position.y, top: first.top };
    await frames(3);                      // a few live frames: poses, cargo stepped
    const geo = m => m.geometry.parameters;
    const trucks = cv.trucks.map(t => {
      const g = t.group, kids = g.children.filter(o => o.isMesh);
      const trailer = kids[0], roof = kids[1];
      const cab = kids.find(o => Math.abs(o.position.z - t.cabLocal.z) < 1e-9 && Math.abs(o.position.y - t.cabLocal.y) < 1e-9);
      // deck extents through topAt, crates hidden so it reads the bare deck
      const realTop = cv.cargo.topAt; cv.cargo.topAt = () => null;
      const gp = g.position, mx = t.w / 2 + 0.3, mz = t.depth / 2 + 0.3;
      const ext = {
        centre: cv.topAt(t, gp.x, gp.z), groupY: gp.y,
        inX: cv.topAt(t, gp.x + mx - 0.01, gp.z) !== null, outX: cv.topAt(t, gp.x + mx + 0.01, gp.z) === null,
        inZ: cv.topAt(t, gp.x, gp.z - mz + 0.01) !== null, outZ: cv.topAt(t, gp.x, gp.z + mz + 0.01) === null,
      };
      cv.cargo.topAt = realTop;
      const c = new (gp.constructor)(); t.proxy.center(c);
      const cw = t.cabLocal.clone().applyEuler(g.rotation).add(gp);
      const tr = cv.cargo.trailers?.get(t);
      // bob: drive _pose on a stand-in, so the live truck is untouched
      const ys = []; const stub = { ...t, group: { rotation: { set() {} }, position: { set(x, y) { stub.y = y; } } }, age: 0 };
      for (let i = 0; i < 400; i++) { cv._pose(stub, 0.01); ys.push({ a: stub.age, y: stub.y }); }
      const bobErr = Math.max(...ys.map(p => Math.abs(p.y - (t.top + Math.sin(p.a * t.bobW + t.ph) * cv.cfg.bob))));
      const bobMax = Math.max(...ys.map(p => Math.abs(p.y - t.top)));
      return {
        w: t.w, depth: t.depth, trailerH: t.trailerH, top: t.top, jacked: t.jacked,
        trailer: { ...geo(trailer), y: trailer.position.y },
        roof: { ...geo(roof), y: roof.position.y },
        cab: cab ? { ...geo(cab), x: cab.position.x, y: cab.position.y, z: cab.position.z } : null,
        cabLocal: t.cabLocal.toArray(), cabErr: c.distanceTo(cw), radius: t.proxy.radius,
        solver: tr ? Array.from(tr.body.size) : null,
        ext, bobErr, bobMax, bobDy: gp.y - t.top,
      };
    });
    const crates = cv.cargo.crates.filter(cr => cr.truck).map(cr => ({
      s: cr.s, ly: cr.local.y, size: Array.from(cr.b.size), welded: cr.welded,
      top: cr.welded ? cr.b.positionLin[2] + cr.s / 2 : null,
      want: cr.welded ? cr.local.clone().applyEuler(cr.truck.group.rotation).add(cr.truck.group.position).y + cr.s / 2 : null,
    }));
    return { convoy: true, roadY: cv.road.position.y, bob: cv.cfg.bob, fallY: cv.cfg.fallY, spawn, trucks, crates };
  });
  await b.close(); s.close();

  if (!r.convoy) { ok('convoy: season 3 boots a convoy', false, JSON.stringify(r)); }
  else {
    const T = r.trucks, C = r.crates, P = PIN;
    const all = (a, f) => a.length > 0 && a.every(f);
    const bad = (a, f) => JSON.stringify(a.filter(x => !f(x)).slice(0, 2));
    const near = (a, b, e = E) => Math.abs(a - b) <= e;
    const inR = (v, [lo, hi]) => v >= lo - E && v <= hi + E;
    console.log(`  (${T.length} trucks, ${C.length} crates on board)`);
    ok('pin: road at ROAD_Y −3.2, deck bob 0.07, road death at −2.9',
      near(r.roadY, P.ROAD_Y) && r.bob === P.bob && r.fallY === P.fallY, JSON.stringify({ roadY: r.roadY, bob: r.bob, fallY: r.fallY }));
    let f = t => near(t.top, P.ROAD_Y + P.CHASSIS + t.trailerH) && inR(t.trailerH, P.trailerH) && inR(t.top, P.top);
    ok('pin: deck top = ROAD_Y + 1.1 + trailerH, trailerH in [2.0, 3.8], top in [−0.1, 1.7]', all(T, f), bad(T, f));
    f = t => inR(t.w, P.w) && inR(t.depth, P.depth);
    ok('pin: deck extents — width in [2.6, 3.4], depth in [7, 11.5]', all(T, f), bad(T, f));
    f = t => near(t.trailer.width, t.w) && near(t.trailer.height, t.trailerH) && near(t.trailer.depth, t.depth) && near(t.trailer.y, -t.trailerH / 2);
    ok('pin: trailer box is w × trailerH × depth, hung below the deck origin', all(T, f), bad(T, f));
    f = t => near(t.roof.y, P.roof.y) && near(t.roof.height, P.roof.h) && near(t.roof.width, t.w * P.roof.wK) && near(t.roof.depth, t.depth * P.roof.dK);
    ok('pin: roof slab 0.06 thick at +0.01, 0.96 w × 0.98 depth', all(T, f), bad(T, f));
    f = t => t.ext.centre !== null && near(t.ext.centre, t.ext.groupY) && t.ext.inX && t.ext.outX && t.ext.inZ && t.ext.outZ;
    ok('pin: topAt — the deck centre is the group origin; the footprint is w/2+0.3 × depth/2+0.3', all(T, f), bad(T, f));
    f = t => t.bobErr < 1e-9 && t.bobMax <= P.bob + E && t.bobMax > P.bob * 0.95 && Math.abs(t.bobDy) <= P.bob + E;
    ok('pin: _pose bob — group.y = top + sin(age·bobW + ph)·0.07, never more, and it reaches 0.07', all(T, f), bad(T, f));
    const sp = r.spawn;
    ok('pin: the spawn floor is the first deck at its bobbed height (|floorY − top| ≤ 0.07)',
      near(sp.floorY, sp.feetY) && Math.abs(sp.floorY - sp.top) <= P.bob + E && sp.floorY >= sp.groupY - E, JSON.stringify(sp));
    f = t => t.cab && near(t.cab.height, P.cab.h) && near(t.cab.depth, P.cab.l) && near(t.cab.width, t.w * P.cab.wK) && near(t.cab.x, 0)
      && near(t.cab.y, -(t.top - (P.ROAD_Y + P.CHASSIS * P.cab.chassisK)) + P.cab.h / 2) && near(t.cab.z, -(t.depth / 2 + P.cab.l / 2 + P.cab.gap));
    ok('pin: cab 2.3 × 2.6 at y = −(top − (ROAD_Y + 0.66)) + 1.15, z = −(depth/2 + 1.55)', all(T, f), bad(T, f));
    f = t => near(t.cabLocal[0], t.cab?.x ?? NaN) && near(t.cabLocal[1], t.cab?.y ?? NaN) && near(t.cabLocal[2], t.cab?.z ?? NaN) && t.cabErr < 1e-6 && t.radius === P.cab.radius;
    ok('pin: the gaze locks the cab centre (cabLocal posed by the group), radius 1.6', all(T, f), bad(T, f));
    const withSolver = T.filter(t => t.solver);
    f = t => near(t.solver[0], t.w) && near(t.solver[1], t.depth) && near(t.solver[2], t.trailerH);
    ok('pin: trailer collision box [w, depth, trailerH] in the cargo solver', all(withSolver, f), bad(withSolver, f));
    f = c => inR(c.s, P.crate.size) && c.size.every(v => near(v, c.s)) && (near(c.ly, c.s / 2 + P.crate.gap) || near(c.ly, c.s * 1.5 + P.crate.gap));
    ok('pin: crates are s³ boxes, s in [0.7, 1.05], resting s/2 + 0.02 above the deck (or one crate up)', all(C, f), bad(C, f));
    const W = C.filter(c => c.welded);
    f = c => near(c.top, c.want, 1e-4);
    ok('pin: a welded crate\'s standing top is its rest point, posed with the truck, + s/2', all(W, f), bad(W, f));
  }
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
