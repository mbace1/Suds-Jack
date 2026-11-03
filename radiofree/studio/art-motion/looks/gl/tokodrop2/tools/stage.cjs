// The told moments, staged with the game's own look-check hooks (showcase / idle / act — real game code, nothing
// patched): node stage.cjs <slam|ram> <world> <outdir> <shot every N frames> [frames]
//   slam: a giant (size 5) on a quiet floor, the hero inside its reach shooting it (v114: it sheds goo and wears);
//         when it gathers (v112) the STEP OUT! tag shows (v115); the hero steps out and the slam lands on nothing.
//   ram:  the sewer (world 3): the hero in a ram's lane with two gels; the lane warns, CLEAR THE LANE! shows (v115),
//         the hero steps out of the lane and the ram punches the gels across the floor (v110).
const { chromium } = require('playwright');
const fs = require('fs');
const [,, mode, world, out, every = 1, frames = 150] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: +(process.env.DPR || 2.5), serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto(`http://127.0.0.1:8731/toko-drop-2/?nointro&world=${world}`); await p.waitForFunction(() => window.__toko?.ready, null, { timeout: 180000 });
  fs.mkdirSync(out, { recursive: true });
  const setup = await p.evaluate(([mode]) => {
    const d = window.__toko; d.loop(false);
    if (mode === 'slam') {
      const [g0] = d.showcase(['globbo'], { sizes: [5], heroZ: 0.5 });
      const w = d.world, g = w.gels[0], h = w.hero; h.z = h.pz = 4.8; h.x = h.px = 0.4;
      window.__st = { mode, phase: 'shoot', n: 0, gid: g.id };
      return { r: g.r, hz: w.hz, hx: w.hx, hero: [h.x, h.z] };
    }
    const ids = d.showcase(['globbo', 'yela'], { spacing: 4, heroZ: 0 });
    const w = d.world, h = w.hero, ram = (w.posts || []).find((q) => q.ram && q.ram.side === 1);
    if (!ram) return { err: 'no ram', posts: (w.posts || []).length };
    const m = ram.ram, X = (m.zWalls ? 1 : 1);
    // the hero in the lane, a few metres off the wall; two gels deeper in it
    if (m.zWalls) { h.x = h.px = m.along; h.z = h.pz = m.half - 3.0; w.gels[0].x = w.gels[0].px = m.along - 0.6; w.gels[0].z = w.gels[0].pz = m.half - 1.6; w.gels[1].x = w.gels[1].px = m.along + 0.7; w.gels[1].z = w.gels[1].pz = m.half - 5.5; }
    else { h.z = h.pz = m.along; h.x = h.px = m.half - 3.0; w.gels[0].z = w.gels[0].pz = m.along - 0.6; w.gels[0].x = w.gels[0].px = m.half - 1.6; w.gels[1].z = w.gels[1].pz = m.along + 0.7; w.gels[1].x = w.gels[1].px = m.half - 5.5; }
    window.__st = { mode, phase: 'wait', n: 0, zWalls: m.zWalls };
    return { zWalls: m.zWalls, half: m.half, along: m.along, hx: w.hx, hz: w.hz, time: w.time };
  }, [mode]);
  console.log('setup', JSON.stringify(setup));
  // ram: fast-forward to ~1.0 s before the +1 ram warns (its beat: w.time/period + phase, phase 0.5)
  if (mode === 'ram') await p.evaluate(() => { const d = window.__toko, w = d.world; const R = d.tuning.posts.worlds[w.world].rams, P = R.period;
    const ram = w.posts.find((q) => q.ram && q.ram.side === 1), ph = ram.ram.phase; let tw = (Math.ceil(w.time / P + ph) - ph) * P - 0.3; if (tw < w.time) tw += P;
    const h = w.hero, m = ram.ram, pin = () => { h.x = h.px = m.half - 4.6; h.z = h.pz = m.along; w.gels.forEach((g, i) => { g.x = g.px = m.half - 1.4 - i * 0.9; g.z = g.pz = m.along + (i ? 0.5 : -0.5); }); };
    pin(); while (w.time < tw) { d.act({ mx: 0, mz: 0, aim: false, fire: false }, 1 / 30); pin(); } });
  let t = 0;
  for (let i = 0; i < +frames; i++) {
    const info = await p.evaluate(() => {
      const d = window.__toko, w = d.world, s = window.__st, h = w.hero;
      if (s.mode === 'slam') {
        const g = w.gels.find((x) => x.id === s.gid);
        const ph = g?.slam?.phase;
        if (s.phase === 'shoot' && ph === 'warn') { s.phase = 'tagged'; s.k = 0; }
        if (s.phase === 'tagged' && ++s.k > 9) s.phase = 'escape';
        if (s.phase === 'escape' && ph !== 'warn') { s.phase = 'after'; s.k = 0; }
        if (s.phase === 'after' && ++s.k > 12) s.phase = 'shoot2';
        if (s.phase === 'escape') d.act({ mx: 0.25, mz: 1, ax: g ? (g.x - h.x) : 0, az: g ? (g.z - h.z) : -1, aim: true, fire: false }, 1 / 30);
        else { s.n++; const burst = s.phase === 'shoot2' || (s.phase === 'shoot' && (s.n % 40) < 3 && s.n > 8);
          const dx = g ? h.x - g.x : 0, dz = g ? h.z - g.z : 1, dd = Math.hypot(dx, dz) || 1;
          if (s.phase === 'shoot' && g && dd < 4.3) d.act({ mx: dx / dd * 0.6, mz: dz / dd * 0.6, ax: -dx / dd, az: -dz / dd, aim: true, fire: burst }, 1 / 30);
          else d.idle(1 / 30, g && burst ? { x: g.x, z: g.z } : null); }
        return { ph: s.phase, slam: ph, hp: g?.hp, hints: d.actors.hints.debug(), lives: h.lives, hz: +h.z.toFixed(2) };
      }
      const ram = w.posts.find((q) => q.ram && q.ram.side === 1), st = ram.ram.stage;
      if (s.phase === 'wait' && st === 'warn') { s.phase = 'tagged'; s.k = 0; }
      if (s.phase === 'tagged' && ++s.k > 10) s.phase = 'escape';
      if (s.phase === 'escape' && st === 'hold') s.phase = 'after';
      const g = w.gels.find((x) => x.alive);
      const aim = g ? { ax: g.x - h.x, az: g.z - h.z } : { ax: 1, az: 0 };
      if (s.phase === 'escape') d.act(s.zWalls ? { mx: 1, mz: 0, ...aim, aim: true, fire: false } : { mx: 0, mz: 1, ...aim, aim: true, fire: false }, 1 / 30);
      else d.act({ mx: 0, mz: 0, ...aim, aim: true, fire: s.phase === 'after' }, 1 / 30);
      return { ph: s.phase, ram: st, hints: d.actors.hints.debug(), lives: h.lives, gels: w.gels.filter((x) => x.alive).map((x) => [+x.x.toFixed(1), +x.z.toFixed(1)]) };
    });
    await p.evaluate((t) => window.__toko.capFrame(t), (t += 1 / 30));
    if (i % +every === 0) await p.screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 });
    if (i % 6 === 0) console.log(i, JSON.stringify(info), 'tags', await p.evaluate(() => window.__toko.actors.hints.debug()));
  }
  console.log('ERRS:', errs.slice(0, 5).join(' | ') || '(none)'); await b.close();
})();
