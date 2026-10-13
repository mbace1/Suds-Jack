// Hyper Dagger — HD-014 convoy lifecycle.  node hyperdagger/test/convoy-lifecycle.cjs

// HD-014 lifecycle checks: tests only, no game code, no hook. The plan's
// leftovers that need no design pick (#598 §5 steps 1 and 4, risk 4):
//  1. step 1 — topAt at 5 points per truck matches the tilted plane through
//     the group origin, and a standing body's floorY follows the deck for N
//     stepped frames (stepped directly at dt 0.05, the loop's slowest frame);
//  2. step 4 — "the pin applies to wrecked trucks too": a jackknifed and a
//     wrecked truck keep top = ROAD_Y + 1.1 + trailerH, the 0.07 bob, the
//     cab centre and their welded crates' rest heights;
//  3. risk 4 — a despawned truck takes its world-space pool out of the scene
//     and never disposes the geometry/materials the other trucks share.
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
    cv.cfg.skullsFrom = 1e9;
    cv.reset(pl);
    await frames(2);
    const ROAD_Y = cv.road.position.y, bob = cv.cfg.bob;
    // 1a. topAt at 5 points (centre and the four quarter points), bare deck
    const realTop = cv.cargo.topAt; cv.cargo.topAt = () => null;
    let planeErr = 0;
    for (const t of cv.trucks) {
      const g = t.group.position, rz = t.group.rotation.z, rx = t.group.rotation.x;
      for (const [u, v] of [[0, 0], [0.25, 0.25], [-0.25, 0.25], [0.25, -0.25], [-0.25, -0.25]]) {
        const lx = u * t.w, lz = v * t.depth;
        planeErr = Math.max(planeErr, Math.abs(cv.topAt(t, g.x + lx, g.z + lz) - (g.y + lx * Math.tan(rz) - lz * Math.tan(rx))));
      }
    }
    cv.cargo.topAt = realTop;
    // 1b. stand on your truck and step: floorY is the deck under the feet
    const me = cv.standing ?? cv.trucks[0];
    pl.feet.set(me.group.position.x, me.group.position.y, me.group.position.z); pl.vy = 0;
    let floorErr = 0, standFrames = 0, t0 = 0;
    for (let i = 0; i < 60; i++) {
      cv.preUpdate(0.05, pl);
      const want = cv.topAt(me, pl.feet.x, pl.feet.z, pl.feet.y + 0.45);
      if (cv.standing === me && want !== null) { standFrames++; floorErr = Math.max(floorErr, Math.abs(pl.floorY - want)); }
      pl.update(0.05);
      cv.update(0.05, pl, t0 += 0.05, [], null);
    }
    // 2. fold one truck ahead and wreck another; step 1.5 s; the pins hold
    const ahead = cv.trucks.filter(t => t !== cv.standing && t.z < pl.feet.z - 8).sort((a, b) => b.z - a.z);
    const [tj, tw] = ahead;
    const fold = {};
    if (tw) {
      const cab0 = [tj, tw].map(t => t.cabLocal.clone());
      cv.hit(tj); cv.hit(tj); cv.hit(tj); cv.wreck(tw);
      let bobErr = 0;
      for (let i = 0; i < 30; i++) {
        cv.preUpdate(0.05, pl); pl.update(0.05);
        cv.update(0.05, pl, t0 += 0.05, [], null);
        for (const t of [tj, tw]) bobErr = Math.max(bobErr, Math.abs(t.group.position.y - t.top) - bob);
      }
      const kept = [tj, tw].every(t => cv.trucks.includes(t));
      const crates = cv.cargo.crates.filter(c => c.welded && (c.truck === tj || c.truck === tw));
      fold.kept = kept; fold.jacked = tj.jacked; fold.wrecked = !!tw.wrecked; fold.stalled = [tj.stalled, tw.stalled];
      fold.topErr = Math.max(...[tj, tw].map(t => Math.abs(t.top - (ROAD_Y + 1.1 + t.trailerH))));
      fold.bobErr = bobErr;
      fold.cabErr = Math.max(...[tj, tw].map((t, i) => t.cabLocal.distanceTo(cab0[i])));
      fold.crates = crates.length;
      fold.crateErr = crates.length ? Math.max(...crates.map(c => Math.min(Math.abs(c.local.y - (c.s / 2 + 0.02)), Math.abs(c.local.y - (c.s * 1.5 + 0.02))))) : 0;
      fold.centre = (() => { cv.cargo.topAt = () => null; const v = Math.max(...[tj, tw].map(t => Math.abs(cv.topAt(t, t.group.position.x, t.group.position.z) - t.group.position.y))); cv.cargo.topAt = realTop; return v; })();
    }
    // 3. despawn one truck through the convoy's own _remove
    const shared = [...(cv.shared ?? [])];
    let disposed = 0;
    for (const x of shared) x.addEventListener('dispose', () => disposed++);
    const gone = cv.trucks.find(t => t !== cv.standing && t !== tj && t !== tw) ?? cv.trucks[cv.trucks.length - 1];
    let ownDisposed = 0; gone.group.traverse(o => { if (o.isMesh && !cv.shared.has(o.geometry)) o.geometry.addEventListener('dispose', () => ownDisposed++); });
    cv._remove(gone); cv.trucks.splice(cv.trucks.indexOf(gone), 1);
    cv.update(0.05, pl, t0 += 0.05, [], null);
    const life = { shared: shared.length, disposed, ownDisposed, poolInScene: gone.pool?.parent === cv.scene, groupInScene: gone.group.parent === cv.scene,
      othersHavePods: cv.trucks.every(t => t.keel.children.some(o => o.name === 'pod' && (o.material === cv.podMat || o.material === cv.podStallMat))) };
    return { convoy: true, trucks: cv.trucks.length, planeErr, floorErr, standFrames, fold, life };
  });
  await b.close(); s.close();
  const E = 1e-6;
  if (!r.convoy) ok('convoy: season 3 boots a convoy', false, JSON.stringify(r));
  else {
    console.log('  ' + JSON.stringify(r));
    ok('step 1: topAt at 5 points per truck lies on the tilted deck plane through the group origin', r.planeErr < E, String(r.planeErr));
    ok('step 1: standing, floorY is the deck under the feet for 60 stepped frames', r.standFrames >= 55 && r.floorErr < E, JSON.stringify({ n: r.standFrames, err: r.floorErr }));
    const f = r.fold;
    ok('step 4: a jackknifed and a wrecked truck keep the deck pins (top, 0.07 bob, deck centre, cab centre)',
      f.kept && f.jacked && f.wrecked && f.topErr < E && f.bobErr <= 1e-9 && f.centre < E && f.cabErr < E, JSON.stringify(f));
    ok('step 4: their welded crates keep their rest heights', f.kept && f.crateErr < E, JSON.stringify({ crates: f.crates, err: f.crateErr }));
    const l = r.life;
    ok('risk 4: a despawned truck leaves the scene with its pool, and disposes its own parts', !l.poolInScene && !l.groupInScene && l.ownDisposed > 0, JSON.stringify(l));
    ok('risk 4: the shared hover geometry/materials are never disposed by a despawn, and every other truck keeps its pods', l.shared >= 5 && l.disposed === 0 && l.othersHavePods, JSON.stringify(l));
  }
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
