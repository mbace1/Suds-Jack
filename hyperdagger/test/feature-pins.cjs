// Hyper Dagger — HD-005: the season features against the timer, pinned.
//   NODE_PATH=$(npm root -g) node hyperdagger/test/feature-pins.cjs
//
// The feature completeness pass found these paths doing what the queue item
// asks on main (603e76d82). This file records them so a later change cannot
// quietly break one. Tests only: no game code, no debug hook added.
//
//   season 1 + 2 under PURE and HYPER (?mode= pins the scheme):
//     - THE ROCKFALL: a rock on you kills (PURE) / costs exactly the HYPER hit (HYPER)
//     - the WAVE: standing in the crest kills (PURE) / costs exactly the hit (HYPER)
//     - THE DRAIN: a drained sea strikes nobody, in either mode
//     - PURE's HUD clock is the run time. (Until v58 a check also asked that a
//       hit left runBonus at 0; v58 removed runBonus, season 3's cargo, so the
//       score is gameTime by construction and that check could no longer fail.)
//   input, per mode: a pad's A jumps, a pad's B dashes only where the mode has
//   a dash, the pad's left stick moves; a touch tap on the right stick jumps.
//
// Every wait is on GAME time (window.__hd.debug.getState().gameTime), with a
// frame cap only as a hang guard. The director is frozen so no enemy runs
// (main's player.pos throw — fixed by #591/#593/#594 — stays out of this).
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

// in-page helpers, injected before every evaluate
const HELPERS = () => {
  const d = window.__hd.debug;
  const frame = () => new Promise(r => requestAnimationFrame(r));
  /** wait `sec` of GAME time, or until cond() — frames only as a hang guard */
  window.__wait = async (sec, cond = () => false, cap = 3000) => {
    const t0 = d.getState().gameTime;
    for (let i = 0; i < cap; i++) {
      await frame();
      const st = d.getState();
      if (cond(st)) return true;
      if (st.state !== 'playing' || st.gameTime - t0 >= sec) return cond(st);
    }
    return cond(d.getState());
  };
};

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
  const open = async (season, mode) => {
    const q = await b.newPage({ viewport: { width: 820, height: 540 } });
    q.on('pageerror', e => errs.push(`${season}/${mode} pageerror: ${e.message}`));
    await q.addInitScript(() => { localStorage.setItem('hyperDaggerRunKind', 'free'); localStorage.setItem('hyperDaggerTips', '1'); });
    await q.goto(`${base}/hyperdagger/?assets=0&season=${season}&mode=${mode}`, { waitUntil: 'load' });
    await q.waitForFunction(() => window.__hd && window.__hd.debug, null, { timeout: 20000 });
    await q.evaluate(HELPERS);
    return q;
  };
  /** a fresh live run: director frozen, nothing alive, a full HYPER clock */
  const fresh = q => q.evaluate(async () => {
    const d = window.__hd.debug, pl = window.__hd.player;
    d.startGame(); d.freezeDirector(true); d.setInvulnerable(true);
    await window.__wait(0.1);
    pl.feet.set(0, 0, 0); pl.vy = 0; pl.velocity?.set(0, 0, 0); pl._sync(); d.setLife(60);
    await window.__wait(0.1);
    return d.getState().mode;
  });

  const HIT = 10;   // T.hyper.hitCost
  try {
    for (const mode of ['pure', 'hyper']) {
      // ---------------------------------------------------- season 1: THE ROCKFALL
      const q1 = await open('ember', mode);
      const m1 = await fresh(q1);
      ok(`ember/${mode}: ?mode=${mode} runs ${mode}`, m1 === mode, m1);
      const rock = await q1.evaluate(async () => {
        const d = window.__hd.debug, pl = window.__hd.player, G = d.gibsObj();
        d.triggerFinale();
        await window.__wait(0.2);
        pl.feet.set(0, 0, 0); pl.vy = 0; pl._sync(); d.setLife(60);
        let prevL = d.getState().lifeT, prevT = d.getState().gameTime, maxDrop = 0;
        d.setInvulnerable(false);
        G.rock(0, 0, 4, 0.95, [0.46, 0.38, 0.34]);
        const struck = await window.__wait(2, st => {
          const drop = (prevL - st.lifeT) - (st.gameTime - prevT);   // the hit, net of the clock's own drain
          if (drop > maxDrop) maxDrop = drop;
          prevL = st.lifeT; prevT = st.gameTime;
          return st.state === 'dead' || maxDrop > 1;
        });
        d.setInvulnerable(true);
        const st = d.getState();
        return { struck, state: st.state, maxDrop: +maxDrop.toFixed(2), kind: d.getFinale().kind };
      });
      if (mode === 'pure') ok('ember/pure: THE ROCKFALL — a rock that lands on you is death', rock.kind === 'rockfall' && rock.state === 'dead', JSON.stringify(rock));
      else ok('ember/hyper: THE ROCKFALL — a rock that lands on you costs the HYPER hit (10 s of clock) and the run goes on',
        rock.kind === 'rockfall' && rock.state === 'playing' && Math.abs(rock.maxDrop - HIT) < 0.6, JSON.stringify(rock));

      // ---------------------------------------------------- the clock on the HUD
      await fresh(q1);
      const hud = await q1.evaluate(async () => {
        const d = window.__hd.debug;
        await window.__wait(0.5);
        const st = d.getState();
        return { timer: parseFloat(document.getElementById('timer').textContent), gameTime: st.gameTime, lifeT: st.lifeT };
      });
      if (mode === 'pure') ok('ember/pure: the HUD clock is the run time (gameTime)', Math.abs(hud.timer - hud.gameTime) < 0.25, JSON.stringify(hud));
      else ok('ember/hyper: the HUD clock is the life clock', Math.abs(hud.timer - hud.lifeT) < 0.25, JSON.stringify(hud));

      // ---------------------------------------------------- input: pad and touch
      await fresh(q1);
      const pad = await q1.evaluate(async () => {
        const d = window.__hd.debug, pl = window.__hd.player;
        const mk = () => ({ id: 'pin pad', index: 0, connected: true, mapping: 'standard', timestamp: 0,
          axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
        const gp = mk();
        const realGet = navigator.getGamepads?.bind(navigator);
        navigator.getGamepads = () => [gp];
        const press = async (i, sec = 0.12) => { gp.buttons[i].pressed = true; gp.buttons[i].value = 1; await window.__wait(sec); gp.buttons[i].pressed = false; gp.buttons[i].value = 0; };
        // A jumps
        let peak = 0;
        const y0 = pl.feet.y;
        await press(0);
        await window.__wait(0.5, () => { peak = Math.max(peak, pl.feet.y - y0); return false; });
        await window.__wait(1.2, () => pl.feet.y <= (pl.floorY ?? 0) + 0.02);
        // B dashes (only where the mode has a dash)
        let dashed = false;
        gp.axes[1] = -1;   // lean forward so a dash has a direction
        await window.__wait(0.1);
        await window.__wait(1, () => !(pl.dashCd > 0));
        await press(1);
        await window.__wait(0.3, () => { if (pl.dashK > 0 || pl.dashCd > 0) dashed = true; return false; });   // dashCd: a dash fired (dashT is shorter than a slow frame)
        gp.axes[1] = 0;
        // the left stick moves
        pl.feet.set(0, 0, 0); pl._sync();
        await window.__wait(0.3);
        const x0 = pl.feet.x, z0 = pl.feet.z;
        gp.axes[0] = 1;
        await window.__wait(0.6);
        gp.axes[0] = 0;
        const moved = Math.hypot(pl.feet.x - x0, pl.feet.z - z0);
        navigator.getGamepads = realGet || (() => []);
        await window.__wait(0.1);
        return { jump: +peak.toFixed(2), dashed, dashEnabled: !!pl.dashEnabled, moved: +moved.toFixed(2), seen: d.inputObj().gamepad };
      });
      ok(`ember/${mode}: gamepad — A jumps`, pad.jump > 0.5, JSON.stringify(pad));
      ok(`ember/${mode}: gamepad — the left stick moves the body`, pad.moved > 1, JSON.stringify(pad));
      if (mode === 'pure') ok('ember/pure: gamepad — B does not dash (PURE has no dash)', !pad.dashEnabled && !pad.dashed, JSON.stringify(pad));
      else ok('ember/hyper: gamepad — B dashes', pad.dashEnabled && pad.dashed, JSON.stringify(pad));
      await fresh(q1);
      const touch = await q1.evaluate(async () => {
        const pl = window.__hd.player, inp = window.__hd.debug.inputObj();
        const t = { identifier: 7, clientX: innerWidth * 0.75, clientY: innerHeight * 0.6 };
        const y0 = pl.feet.y; let peak = 0;
        inp._touchStart({ changedTouches: [t] }); inp._touchEnd({ changedTouches: [t] });
        await window.__wait(0.5, () => { peak = Math.max(peak, pl.feet.y - y0); return false; });
        return { jump: +peak.toFixed(2), touchMode: inp.touchMode };
      });
      ok(`ember/${mode}: touch — a tap on the right stick jumps`, touch.touchMode && touch.jump > 0.5, JSON.stringify(touch));
      await q1.close();

      // ---------------------------------------------------- season 2: the WAVE and THE DRAIN
      const q2 = await open('inca', mode);
      await fresh(q2);
      const wave = await q2.evaluate(async () => {
        const d = window.__hd.debug, pl = window.__hd.player, g = d.gooObj();
        // a crest on the middle of the arena, then stand in it
        let peak = 0, at = 0;
        for (let i = 0; i < 900; i++) { g.t = i * 0.02; const h = g.heightAt(0, 0); if (h > peak) { peak = h; at = g.t; } }
        g.t = at;
        pl.feet.set(0, 0, 0); pl.vy = 0; pl._sync(); d.setLife(60);
        let prevL = d.getState().lifeT, prevT = d.getState().gameTime, maxDrop = 0;
        d.setInvulnerable(false);
        await window.__wait(1, st => {
          const drop = (prevL - st.lifeT) - (st.gameTime - prevT);
          if (drop > maxDrop) maxDrop = drop;
          prevL = st.lifeT; prevT = st.gameTime;
          return st.state === 'dead' || maxDrop > 1;
        });
        d.setInvulnerable(true);
        return { peak: +peak.toFixed(2), state: d.getState().state, maxDrop: +maxDrop.toFixed(2) };
      });
      if (mode === 'pure') ok('inca/pure: the WAVE — a body standing in the crest dies', wave.state === 'dead', JSON.stringify(wave));
      else ok('inca/hyper: the WAVE — a body standing in the crest pays the HYPER hit (10 s) and lives',
        wave.state === 'playing' && Math.abs(wave.maxDrop - HIT) < 0.6, JSON.stringify(wave));

      await fresh(q2);
      const drain = await q2.evaluate(async () => {
        const d = window.__hd.debug, pl = window.__hd.player, g = d.gooObj();
        d.triggerFinale();
        const dry = await window.__wait(8, () => d.getFinale().drain >= 1);
        let peak = 0;
        for (let i = 0; i < 300; i++) { g.t = i * 0.02; peak = Math.max(peak, g.heightAt(0, 0)); }
        pl.feet.set(0, 0, 0); pl.vy = 0; pl._sync(); d.setLife(60);
        const s0 = d.waveStrikes().strikes, l0 = d.getState().lifeT, t0 = d.getState().gameTime, clock = d.getState().mode === 'hyper';
        d.setInvulnerable(false);
        await window.__wait(1, st => st.state === 'dead');
        d.setInvulnerable(true);
        const st = d.getState();
        return { dry, kind: d.getFinale().kind, drain: d.getFinale().drain, peak: +peak.toFixed(3), strikes: d.waveStrikes().strikes - s0,
          state: st.state, extraDrop: +((l0 - st.lifeT) - (clock ? st.gameTime - t0 : 0)).toFixed(2) };   // PURE's lifeT does not drain
      });
      ok(`inca/${mode}: THE DRAIN — the sea goes to nothing and strikes nobody`,
        drain.dry && drain.kind === 'drain' && drain.peak === 0 && drain.strikes === 0 && drain.state === 'playing' && Math.abs(drain.extraDrop) < 0.3, JSON.stringify(drain));
      await q2.close();
    }
  } catch (e) {
    ok('the run completed', false, e.stack || String(e));
  }
  ok('zero page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); s.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
