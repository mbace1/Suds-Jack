// The staged takes for the full film (4 Nov), busier than the checkpoint's (stage.cjs): the game's own look-check
// hooks (showcase / idle / act — real game code, nothing patched), every frame drawn and saved inside its window.
//   node stage2.cjs <g1|g2|ram|dash> <world> <outdir> [dpr]
//   g1   a GIANT riding its escort of mites (v106) marches in; then the hero opens up on it: it sheds goo and wears (v114),
//        its escort pops, and it bursts (splitting in two, sizes.classes[5].split) — frames 0… straight through
//   g2   a giant and its company; the hero inside its reach when it gathers (v112): the ring and STEP OUT! (v115), the
//        hero steps out, the slam lands on nothing — saved from the gather to just after the slam
//   ram  the sewer: four gels pinned at a ram's wall end, the hero in its lane; the lane warns with CLEAR THE LANE! (v115),
//        the hero steps out, the ram punches the gels down the lane (v110)
//   dash a line of bodies; the hero dashes through them twice, shooting
// A capture aid, said in the plan doc: the hero's lives are topped up each frame (the bodies around fire at it).
const { chromium } = require('playwright');
const fs = require('fs');
const [,, mode, world, out, dpr = 2.5] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: +dpr, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message));
  await p.goto(`http://127.0.0.1:8731/toko-drop-2/?nointro&world=${world}`); await p.waitForFunction(() => window.__toko?.ready, null, { timeout: 180000 });
  fs.mkdirSync(out, { recursive: true });
  const setup = await p.evaluate(([mode]) => {
    const d = window.__toko; d.loop(false);
    const S = window.__st = { mode, phase: 'start', n: 0, k: 0 };
    if (mode === 'g1') {
      d.showcase(['globbo', 'yela', 'redd', 'yela', 'redd', 'sludge', 'yela', 'redd'], { sizes: [5, 1, 1, 1, 1, 1, 1, 1], escort: true, heroZ: 0.62, spacing: 2 });
      const w = d.world, g = w.gels[0], h = w.hero; g.x = g.px = 0; g.z = g.pz = -w.hz * 0.15; h.x = h.px = 0.5; h.z = h.pz = g.z + 7; S.gid = g.id; S.phase = 'march';
      return { hz: w.hz, hx: w.hx, n: w.gels.length, r: g.r };
    }
    if (mode === 'g2') {
      d.showcase(['globbo', 'yela', 'redd', 'sludge', 'yela'], { sizes: [5, 2, 2, 2, 2], heroZ: 0.5, spacing: 3.2 });
      const w = d.world, g = w.gels[0], h = w.hero; g.x = g.px = 0; g.z = g.pz = 0;
      w.gels.slice(1).forEach((o, i) => { o.x = o.px = [-6, 6, -5, 5][i]; o.z = o.pz = [-4, -4, 6, 6][i]; });
      h.x = h.px = 0.4; h.z = h.pz = 4.8; S.gid = g.id; S.phase = 'shoot';
      return { r: g.r, hz: w.hz };
    }
    if (mode === 'dash') {
      d.showcase(['globbo', 'yela', 'redd', 'sludge', 'yela', 'globbo', 'redd'], { sizes: [3, 2, 2, 2, 2, 3, 2], heroZ: 0.35, spacing: 2.6 });
      const w = d.world, h = w.hero; h.x = h.px = -w.hx * 0.6; h.z = h.pz = 1.5; S.phase = 'go';
      return { hx: w.hx, hz: w.hz };
    }
    d.showcase(['globbo', 'yela', 'redd', 'sludge'], { spacing: 3, heroZ: 0 });
    const w = d.world, ram = (w.posts || []).find((q) => q.ram && q.ram.side === 1);
    if (!ram) return { err: 'no ram' };
    S.phase = 'wait'; S.zWalls = ram.ram.zWalls; return { zWalls: ram.ram.zWalls, half: ram.ram.half, along: ram.ram.along };
  }, [mode]);
  console.log('setup', JSON.stringify(setup));
  if (mode === 'ram') await p.evaluate(() => { const d = window.__toko, w = d.world; const R = d.tuning.posts.worlds[w.world].rams, P = R.period;
    const ram = w.posts.find((q) => q.ram && q.ram.side === 1), ph = ram.ram.phase; let tw = (Math.ceil(w.time / P + ph) - ph) * P - 0.45; if (tw < w.time) tw += P;
    const h = w.hero, m = ram.ram, pin = () => { if (m.zWalls) { h.z = h.pz = m.half - 5.4; h.x = h.px = m.along; } else { h.x = h.px = m.half - 5.4; h.z = h.pz = m.along; }
      w.gels.forEach((g, i) => { const a = m.half - 1.3 - i * 0.85, c = m.along + (i % 2 ? 0.55 : -0.55); if (m.zWalls) { g.z = g.pz = a; g.x = g.px = c; } else { g.x = g.px = a; g.z = g.pz = c; } }); };
    pin(); let guard = 0; while (w.time < tw && !w.over && guard++ < 1200) { h.lives = Math.max(h.lives, 3); d.act({ mx: 0, mz: 0, aim: false, fire: false }, 1 / 30); pin(); } });   // lives topped: a dead run stops the clock
  let t = 0, saved = 0;
  const MAX = +(process.env.MAXF || 0) || { g1: 170, g2: 400, ram: 66, dash: 44 }[mode];
  for (let i = 0; i < MAX; i++) {
    const r = await p.evaluate((i) => {
      const d = window.__toko, w = d.world, s = window.__st, h = w.hero; h.lives = Math.max(h.lives, 3);
      let save = true;
      if (s.mode === 'g1') {
        const g = w.gels.find((x) => x.id === s.gid);
        if (s.phase === 'march' && i >= 44) s.phase = 'fire';
        if (s.phase === 'fire' && (!g || !g.alive)) { s.phase = 'down'; s.k = 0; }
        if (s.phase === 'down' && ++s.k > 22) s.phase = 'end';
        const tgt = g && g.alive ? g : w.gels.find((x) => x.alive);
        if (s.phase === 'march') d.idle(1 / 30, null); else d.idle(1 / 30, tgt ? { x: tgt.x, z: tgt.z } : null);
        return { save, ph: s.phase, hp: g?.hp, alive: !!g?.alive, n: w.gels.filter((x) => x.alive).length, end: s.phase === 'end' };
      }
      if (s.mode === 'g2') {
        const g = w.gels.find((x) => x.id === s.gid), ph = g?.slam?.phase;
        if (s.phase === 'shoot' && ph === 'warn') { s.phase = 'tagged'; s.k = 0; }
        if (s.phase === 'tagged' && ++s.k > 9) s.phase = 'escape';
        if (s.phase === 'escape' && ph !== 'warn') { s.phase = 'after'; s.k = 0; }
        if (s.phase === 'after' && ++s.k > 16) s.phase = 'end';
        save = s.phase !== 'shoot';
        if (s.phase === 'escape') d.act({ mx: 0.25, mz: 1, ax: g ? g.x - h.x : 0, az: g ? g.z - h.z : -1, aim: true, fire: false }, 1 / 30);
        else { s.n++; const burst = s.phase === 'after' || (s.phase === 'shoot' && (s.n % 40) < 3 && s.n > 8);
          const dx = g ? h.x - g.x : 0, dz = g ? h.z - g.z : 1, dd = Math.hypot(dx, dz) || 1;
          if (s.phase === 'shoot' && g && dd < 4.3) d.act({ mx: dx / dd * 0.6, mz: dz / dd * 0.6, ax: -dx / dd, az: -dz / dd, aim: true, fire: burst }, 1 / 30);
          else d.idle(1 / 30, g && burst ? { x: g.x, z: g.z } : null); }
        return { save, ph: s.phase, slam: ph, hints: d.actors.hints.debug(), end: s.phase === 'end' };
      }
      if (s.mode === 'dash') {
        const tgt = w.gels.find((x) => x.alive), aim = tgt ? { ax: tgt.x - h.x, az: tgt.z - h.z } : { ax: 1, az: 0 };
        const dashNow = i === 6 || i === 26;
        d.act({ mx: i < 22 ? 1 : -1, mz: i < 22 ? -0.15 : 0.15, ...aim, aim: true, fire: true, dash: dashNow }, 1 / 30);
        return { save, i, hx: +h.x.toFixed(1), n: w.gels.filter((x) => x.alive).length };
      }
      const ram = w.posts.find((q) => q.ram && q.ram.side === 1), st = ram.ram.stage;
      if (s.phase === 'wait' && st === 'warn') { s.phase = 'tagged'; s.k = 0; }
      if (s.phase === 'tagged' && ++s.k > 12) s.phase = 'escape';
      if (s.phase === 'escape' && st === 'hold') s.phase = 'after';
      const g = w.gels.find((x) => x.alive), aim = g ? { ax: g.x - h.x, az: g.z - h.z } : { ax: 1, az: 0 };
      if (s.phase === 'escape') d.act(s.zWalls ? { mx: 1, mz: 0, ...aim, aim: true, fire: false } : { mx: 0, mz: 1, ...aim, aim: true, fire: false }, 1 / 30);
      else d.act({ mx: 0, mz: 0, ...aim, aim: true, fire: s.phase === 'after' }, 1 / 30);
      return { save, ph: s.phase, ram: st, hints: d.actors.hints.debug() };
    }, i);
    await p.evaluate((t) => window.__toko.capFrame(t), (t += 1 / 30));
    if (r.save) { await p.screenshot({ path: `${out}/f${String(saved).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 }); saved++; }
    if (i % 6 === 0 || r.end) console.log(i, saved, JSON.stringify(r));
    if (r.end) break;
  }
  console.log('saved', saved, 'ERRS:', errs.slice(0, 5).join(' | ') || '(none)'); await b.close();
})();
