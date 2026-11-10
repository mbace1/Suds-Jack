// Hyper Dagger — the look gate (HD-022, v61).
//
// The look is particles, a fluid floor and event light, declared per season
// (seasons.js `fx`, js/fx.js). A gate cannot say whether it is BEAUTIFUL —
// that is a screenshot and Mikael's eye — but it can say the things a
// screenshot cannot:
//
//   · each season has its OWN look (fire / water / road), and VOID has none;
//   · a real shot, hit and kill each fire it (debug hooks only set the scene);
//   · EMBER's floor holds a pool and INCA's sea rings, and HAUL has no floor;
//   · it is DRAWN: the same frozen frame with the look off is a different
//     picture (the control — with the modules stubbed out this fails);
//   · EFFECTS OFF switches all of it off, and the game underneath still plays;
//   · the lowest perf tier thins it and drops the fluid;
//   · nothing leaks per kill, and the look never draws from Math.random or
//     the run's rng (a seeded run must play the same with it on or off).
//
//   NODE_PATH=$(npm root -g) node hyperdagger/test/fx-look.cjs
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = process.env.HD_SITE_ROOT || path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.glb': 'model/gltf-binary', '.webmanifest': 'application/manifest+json' };
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}  → ${detail}`); } };
const W = 844, H = 390;
const STYLE = { ember: 'fire', inca: 'water', haul: 'road' };
const FLUID = { ember: 2, inca: 1, haul: 0 };

const s = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

s.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${s.address().port}/hyperdagger/`;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    // 0. the look keeps its own dice — read off the source, so it cannot rot
    for (const f of ['fx.js', 'fx-particles.js', 'fx-fluid.js', 'sdf-ichor.js']) {
      const src = fs.readFileSync(path.join(ROOT, 'hyperdagger/js', f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      ok(`${f} never calls Math.random or imports the run's rng`, !/Math\.random\s*\(/.test(src) && !/rng\.js/.test(src));
    }

    const open = async (season, opts = {}, query = '?assets=0') => {
      const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true, serviceWorkers: 'block' });
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.addInitScript(([season, o]) => {
        localStorage.setItem('hyperDaggerSeenTips', '1');
        localStorage.setItem('hyperDaggerSeason', season);
        localStorage.setItem('hyperDaggerRenderer', 'sdf');
        localStorage.setItem('hyperDaggerOptsV26', JSON.stringify(Object.assign({ perf: 'high', music: false }, o)));
      }, [season, opts]);
      await p.goto(base + query);
      await p.waitForFunction(() => window.__hd && window.__hd.debug && window.__hd.debug.getSeasonLook, null, { timeout: 90000 });
      return { ctx, p, errs };
    };
    const gameWait = (p, sec, until) => p.evaluate(async ([sec, until]) => {
      const d = window.__hd.debug, f = until ? new Function('d', 'hd', `return (${until});`) : null;
      const t0 = d.getState().gameTime;
      for (let i = 0; i < 4000 && d.getState().gameTime - t0 < sec; i++) { await new Promise(r => requestAnimationFrame(r)); if (f && f(d, window.__hd)) return true; }
      return f ? !!f(d, window.__hd) : true;
    }, [sec, until || null]);
    // setup only: a skull held in front of the eye. The shot that kills it is real.
    const park = (p, n = 2, dist = 6) => p.evaluate(([n, dist]) => {
      const hd = window.__hd, d = hd.debug, pl = hd.player;
      let live = hd.enemies.filter(e => e.alive && e.pos);
      while (live.length < n) { d.spawnSkull(); live = hd.enemies.filter(e => e.alive && e.pos); }
      live.forEach((e, k) => { e.pos.set(pl.feet.x - Math.sin(pl.yaw) * (dist + k * 1.5), pl.feet.y + 1.5, pl.feet.z - Math.cos(pl.yaw) * (dist + k * 1.5)); if (e.vel) e.vel.set(0, 0, 0); e.spawnK = 1; });
      return live.length;
    }, [n, dist]);
    const diffShots = (p, a, b) => p.evaluate(async ([a, b]) => {
      const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
      g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 36) n++;
      return n / (da.length / 4);
    }, [a.toString('base64'), b.toString('base64')]);

    // 1. VOID is the control: no look at all
    {
      const { ctx, p, errs } = await open('ember', {}, '?assets=0&season=void');
      const L = await p.evaluate(() => window.__hd.debug.getSeasonLook());
      ok('void: the control has no look (no style, nothing in the air, a plain floor)', L.active === false && L.style === null && L.particles.ambient === 0 && L.fluid.mode === 0, JSON.stringify(L));
      ok('void: no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }

    for (const season of ['ember', 'inca', 'haul']) {
      const { ctx, p, errs } = await open(season);
      const cdp = await ctx.newCDPSession(p);
      const menu = await p.evaluate(() => window.__hd.debug.getSeasonLook());
      ok(`${season}: the season declares its own look (${STYLE[season]})`, menu.active && menu.style === STYLE[season], JSON.stringify({ style: menu.style, active: menu.active }));
      ok(`${season}: the air is seeded once, on the menu already`, menu.particles.ambient > 50, `ambient ${menu.particles.ambient}`);

      await p.tap('#startBtn');
      await p.waitForFunction(() => window.__hd.debug.getState().state === 'playing', null, { timeout: 60000 });
      await p.evaluate(() => { const d = window.__hd.debug; d.setInvulnerable(true); d.setLife(90); d.freezeDirector(true); });
      const run = await p.evaluate(() => window.__hd.debug.getSeasonLook());
      ok(`${season}: the floor's liquid is the season's (${['none', 'water', 'magma'][FLUID[season]]})`, run.fluid.mode === FLUID[season], JSON.stringify(run.fluid));

      // a real kill: the held right stick in EMBER and INCA, the look in HAUL
      await park(p);
      if (season !== 'haul') await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 640, y: 260, id: 5 }] });
      let killed = false;
      for (let i = 0; i < 40 && !killed; i++) { await park(p); killed = await gameWait(p, 0.5, 'd.getSeasonLook().counts.kill >= 1'); }
      if (season !== 'haul') await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const L = await p.evaluate(() => window.__hd.debug.getSeasonLook());
      ok(`${season}: a shot leaves the hand as light`, L.counts.muzzle >= 1, JSON.stringify(L.counts));
      ok(`${season}: a projectile leaves a trail`, L.counts.trail >= 1, JSON.stringify(L.counts));
      ok(`${season}: a hit throws its sparks`, L.counts.hit >= 1, JSON.stringify(L.counts));
      ok(`${season}: a kill by the season's own weapon fires the season's death`, killed && L.counts.kill >= 1, JSON.stringify(L.counts));
      if (FLUID[season]) {
        const spilled = await gameWait(p, 3, 'd.getSeasonLook().fluid.splatted >= 1');
        const F = (await p.evaluate(() => window.__hd.debug.getSeasonLook())).fluid;
        ok(`${season}: the kill reaches the floor (${season === 'ember' ? 'a pool' : 'a ring'}) and the field is stepping`, spilled && F.steps > 0, JSON.stringify(F));
      } else {
        ok(`${season}: nothing is spilled on a road that has no floor`, L.fluid.splatted === 0 && L.fluid.steps === 0, JSON.stringify(L.fluid));
      }

      // DRAWN, with a control: freeze a fresh kill, photograph it, switch the
      // look off, photograph the same frame
      await p.evaluate(() => window.__hd.debug.setTimeScale(1));
      await park(p, 3, 5.5);
      await p.evaluate(() => { const d = window.__hd.debug; for (const e of [...window.__hd.enemies]) if (e.alive) d.killEnemy(e, 0, -1); });
      // (staged a few units off: on the road a weapon kill happens on top of the
      // eye, where the liquid's box is skipped by design and the sparks carry it)
      const ich = (await p.evaluate(() => window.__hd.debug.getSeasonLook())).ichor;
      ok(`${season}: an SDF body also dies as a liquid`, ich.bursts >= 1 && ich.live >= 1, JSON.stringify(ich));
      await gameWait(p, 0.25);
      await p.evaluate(() => window.__hd.debug.setTimeScale(0.02));
      await gameWait(p, 0.004);
      const shotOn = await p.screenshot();
      await p.evaluate(() => window.__hd.debug.setOpt('fx', false));
      await gameWait(p, 0.004);
      const shotOff = await p.screenshot();
      const moved = await diffShots(p, shotOn, shotOff);
      ok(`${season}: the look is on screen — the same frozen frame without it differs`, moved > 0.004, `${(moved * 100).toFixed(2)}% of pixels`);

      // OFF is off
      const off0 = await p.evaluate(() => window.__hd.debug.getSeasonLook());
      ok(`${season}: EFFECTS OFF — no style in force, the air empty, the floor plain`, off0.active === false && off0.particles.ambient === 0 && off0.fluid.mode === 0, JSON.stringify({ a: off0.active, amb: off0.particles.ambient, f: off0.fluid.mode }));
      await p.evaluate(() => window.__hd.debug.setTimeScale(1));
      await park(p, 2, 6);
      const kills0 = await p.evaluate(() => window.__hd.debug.getRun?.().kills ?? null);
      await p.evaluate(() => { const d = window.__hd.debug; for (const e of [...window.__hd.enemies]) if (e.alive) d.killEnemy(e, 0, -1); });
      await gameWait(p, 0.2);
      const off1 = await p.evaluate(() => ({ L: window.__hd.debug.getSeasonLook(), state: window.__hd.debug.getState().state, enemies: window.__hd.enemies.filter(e => e.alive).length }));
      ok(`${season}: EFFECTS OFF — a kill still kills, and fires nothing`, off1.L.counts.kill === off0.counts.kill && off1.enemies === 0 && off1.state === 'playing', JSON.stringify({ kill: [off0.counts.kill, off1.L.counts.kill], enemies: off1.enemies, kills0 }));

      // back on, then the floor tier
      await p.evaluate(() => window.__hd.debug.setOpt('fx', true));
      const on2 = await p.evaluate(() => window.__hd.debug.getSeasonLook());
      ok(`${season}: EFFECTS ON brings it back`, on2.active && on2.particles.ambient > 50 && on2.fluid.mode === FLUID[season], JSON.stringify({ a: on2.active, amb: on2.particles.ambient, f: on2.fluid.mode }));
      await p.evaluate(() => { window.__hd.debug.setOpt('perf', 'low'); });
      const low = await p.evaluate(() => window.__hd.debug.getSeasonLook());
      ok(`${season}: the lowest perf tier thins the bursts, empties the air and drops the fluid`, low.tier === 4 && low.particles.budget < 0.35 && low.particles.ambient === 0 && low.fluid.enabled === false, JSON.stringify({ tier: low.tier, b: low.particles.budget, amb: low.particles.ambient, f: low.fluid.enabled }));
      await p.evaluate(() => { window.__hd.debug.setOpt('perf', 'high'); });

      // nothing leaks per kill: two batches, the second no bigger than the first
      const batch = async () => { await park(p, 4, 6); await p.evaluate(() => { const d = window.__hd.debug; for (const e of [...window.__hd.enemies]) if (e.alive) d.killEnemy(e, 0, -1); }); await gameWait(p, 1.2); return p.evaluate(() => { const h = window.__hd.debug.getHealth(); return { g: h.geometries, t: h.textures, c: h.sceneChildren }; }); };
      await batch(); const h1 = await batch(); const h2 = await batch();
      ok(`${season}: kills do not grow the scene (geometries, textures, children)`, h2.g <= h1.g && h2.t <= h1.t && h2.c <= h1.c + 2, JSON.stringify({ h1, h2 }));
      ok(`${season}: no page errors`, errs.length === 0, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }

    // MOTION REDUCED keeps the bursts and drops the flashes
    {
      const { ctx, p, errs } = await open('ember', { motion: false });
      await p.tap('#startBtn');
      await p.waitForFunction(() => window.__hd.debug.getState().state === 'playing', null, { timeout: 60000 });
      await p.evaluate(() => { const d = window.__hd.debug; d.setInvulnerable(true); d.freezeDirector(true); });
      await park(p, 2, 6);
      await p.evaluate(() => { const d = window.__hd.debug; for (const e of [...window.__hd.enemies]) if (e.alive) d.killEnemy(e, 0, -1); });
      await gameWait(p, 0.1);
      const L = await p.evaluate(() => window.__hd.debug.getSeasonLook());
      ok('motion reduced: a kill still bursts, but lights no floor', L.counts.kill >= 1 && L.lights === 0, JSON.stringify({ kill: L.counts.kill, lights: L.lights }));
      ok('motion reduced: no page errors', errs.length === 0, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  } catch (e) {
    fail++; console.log('  FAIL the gate itself threw →', e.message.split('\n')[0]);
  } finally {
    await browser.close(); s.close();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
  }
});
