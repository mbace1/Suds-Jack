// worlds.mjs — the worlds (sim/worlds.js), in bare node: beat a world's
// boss and the floor swallows the droplet, which drops into the next world;
// later worlds are bigger and some of their bodies arrive heavy.
//
//   node test/worlds.mjs
import { createWorld, step, api } from '../js/sim/world.js?v=159';
import { TUNING as T } from '../js/tuning.js?v=159';
import * as worlds from '../js/sim/worlds.js?v=159';
import { pressure, schedule } from '../js/sim/director/arcade.js?v=159';
import { makeRng } from '../js/sim/rng.js?v=159';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const dt = T.sim.dt, P = T.worlds.trans, EVERY = T.waves.rhythm.bossEvery;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

// a run held at a world's boss wave: jump there, then kill whatever stands
// until the wave clears, logging every event
// (v109: and through the WORLD CLEAR beat to the floor opening, unless `atClear` stops it at the clear)
function toBossClear(w, wave, atClear = false) {
  w.dir.wave = wave - 1; w.dir.gapT = 1e-9; w.dir.queue = [];
  w.hero.invinc = 1e9;
  const log = [];
  for (let i = 0; i < 60 * 90 && !w.trans && !log.some((e) => e.type === 'clear' && e.wave === wave); i++) {
    step(w, IDLE);
    log.push(...w.events.map((e) => ({ ...e, tick: w.tick })));
    if (w.wave === wave && w.dir.waveT > 1) for (const g of w.gels.slice()) if (g.alive && g.state === 'active') api.kill(w, g, 'env');
  }
  if (!atClear) for (let i = 0; i < Math.ceil((T.waves.worldClear.hold + 0.2) / dt) && !w.trans && !w.over; i++) { step(w, IDLE); log.push(...w.events.map((e) => ({ ...e, tick: w.tick }))); }
  return log;
}
const runFor = (w, s, inp = IDLE) => { const log = []; for (let i = 0; i < Math.round(s / dt); i++) { step(w, inp); log.push(...w.events.map((e) => ({ ...e, tick: w.tick }))); } return log; };

// ── world 1 → 2: the vortex ─────────────────────────────────────────
{
  const w = createWorld({ seed: 5, mode: 'arcade', shape: 'landscape' });
  check('a run starts in world 1 on 1.x\'s arena', w.world === 1 && w.hx === T.arena.landscape.hx && w.hz === T.arena.landscape.hz);
  const log = toBossClear(w, EVERY, true);
  // v109: the boss wave cleared, the world says so (WORLD CLEAR) and the floor holds a beat before it opens
  const wc = log.find((e) => e.type === 'worldClear'), held = !w.trans;
  const beat = runFor(w, T.waves.worldClear.hold - 2 * dt), still = !w.trans;
  log.push(...beat, ...runFor(w, 4 * dt));
  check('world 1\'s boss wave cleared: WORLD CLEAR, and the floor holds a beat before it opens', wc?.world === 1 && wc.dur === T.waves.worldClear.hold && held && still && !!w.trans, JSON.stringify(wc));
  const out = log.find((e) => e.type === 'worldOut');
  check('world 1\'s boss wave cleared: the floor opens, a vortex at the middle', out?.kind === 'vortex' && out.x === 0 && out.z === 0 && w.trans?.kind === 'vortex', JSON.stringify(out));
  check('it opens on the clear, after the clear\'s own bonus', log.findIndex((e) => e.type === 'clear') >= 0 && log.findIndex((e) => e.type === 'clear') < log.findIndex((e) => e.type === 'worldOut'));
  check('nothing in flight survives it', w.bullets.length === 0 && w.lobs.length === 0 && w.pk.items.length === 0);
  // the pull: round and in, and the stick does nothing
  const h = w.hero; h.x = 6; h.z = 3; w.trans.r0 = Math.hypot(6, 3); w.trans.a0 = Math.atan2(3, 6);
  const ds = [];
  for (let i = 0; i < Math.round(P.pull / dt); i++) { step(w, { ...IDLE, mx: 1, fire: true, aim: true }); ds.push(Math.hypot(h.x, h.z)); }
  check('the droplet is pulled in to the hole, whatever the stick says', ds.every((d, i) => i === 0 || d <= ds[i - 1] + 1e-9) && ds[ds.length - 1] < 0.05, `${ds[0].toFixed(2)} → ${ds[ds.length - 1].toFixed(3)}`);
  check('and spun round on the way (it does not go straight in)', Math.abs(Math.atan2(h.z, h.x) - Math.atan2(3, 6)) > 0.1 || ds[ds.length - 1] < 1e-6);
  check('nothing is fired and nothing comes while it goes', w.bullets.length === 0 && w.gels.length === 0);
  check('the droplet cannot be hurt between worlds', api.invincible(w));
  const sinkLog = runFor(w, P.sink + P.dark - dt);
  check('then it sinks into the hole', h.sink === 1 && w.world === 1, `sink ${h.sink}, world ${w.world}`);
  const inLog = runFor(w, 3 * dt);
  const inn = inLog.find((e) => e.type === 'worldIn');
  const D = worlds.arenaFor(2, 'landscape');
  check('after the dark, world 2: the driveway, bigger than 1.x\'s arena', inn?.world === 2 && w.world === 2 && w.hx === D.hx && w.hz === D.hz && D.hx > T.arena.landscape.hx * 1.3, JSON.stringify(inn));
  check('the droplet is over its middle, falling', h.x === 0 && h.z === 0 && h.fall > 0.9 && h.sink === 0);
  const landLog = runFor(w, P.fall + 2 * dt);   // (a step's slack: the phases end on float sums)
  check('it lands after the fall', landLog.some((e) => e.type === 'worldLand' && e.world === 2) && h.fall === 0);
  const goLog = runFor(w, P.settle + 0.1);
  check('a beat later the run is the player\'s again', goLog.some((e) => e.type === 'worldGo') && !w.trans);
  const next = runFor(w, T.waves.clear.breather + 0.2).find((e) => e.type === 'wave');
  check('the breather, then wave 9 in world 2', next?.wave === EVERY + 1 && w.world === 2, JSON.stringify(next));
  void sinkLog;
}

// ── world 2: heavy bodies, spawns round the hero ────────────────────
{
  const D = worlds.arenaFor(2, 'landscape');
  let normal = 0, heavy = 0, bad = [], w;
  const F = [];
  for (const seed of [11, 12, 13, 14, 15, 16]) {
  w = createWorld({ seed, mode: 'arcade', shape: 'landscape', world: 2 });
  if (seed === 11) check('a run can start in world 2: its arena, at wave 9', w.world === 2 && w.hx === D.hx && w.hz === D.hz);
  w.hero.invinc = 1e9;
  const seen = new Set();
  for (let i = 0; i < 60 * 120 && w.wave < 15; i++) {
    step(w, IDLE);
    for (const g of w.gels) {
      if (seen.has(g.id)) continue;
      seen.add(g.id);
      // v106: a giant's escort (its mites, riding it) is the giant's, not a draw from the world's HEAVY share
      if (g.isBoss || g.child || g.variant !== 'normal' || g.form?.kind === 'escort') continue;
      const S = T.species[g.kind];
      // v105: a heavy body is a size class 3-5 (TUNING.sizes): its class's radius and hit points
      if (g.heavy) { heavy++; const C = T.sizes.classes[g.size]; if (!C || g.size < 3 || Math.abs(g.r - S.radius * C.r) > 1e-9 || (!S.noHpMult && g.maxHp !== Math.max(1, Math.ceil(S.hp * C.hp)))) bad.push(`${g.kind} size ${g.size} r ${g.r} hp ${g.maxHp}`); }
      else normal++;
      F.push([g.x, g.z]);
    }
    if (w.dir.waveT > 3) for (const g of w.gels.slice()) if (g.alive && g.state === 'active') api.kill(w, g, 'env');
  }
  }
  const share = heavy / Math.max(1, heavy + normal);
  check('about 35% of world 2\'s plain bodies arrive heavy', Math.abs(share - 0.35) < 0.08, `${heavy}/${heavy + normal} = ${share.toFixed(2)}`);
  check('a heavy body is its size class: a brute 1.3× as big with 2× the hp, a tank 1.65× with 4× (v105)', heavy > 0 && !bad.length, bad.slice(0, 3).join('; '));
  check('every body lands on the floor', F.every(([x, z]) => Math.abs(x) <= w.hx && Math.abs(z) <= w.hz));
  // the spawn frame: world 1's arena, round the hero, inside the driveway
  w.hero.x = 25; w.hero.z = -14;
  const f = worlds.spawnFrame(w), A = T.arena.landscape;
  check('on the driveway, bodies come in round you as on 1.x\'s arena', f.hx === A.hx && f.hz === A.hz && f.cx === w.hx - A.hx && f.cz === -(w.hz - A.hz), JSON.stringify(f));
  const w1 = createWorld({ seed: 1, mode: 'arcade' }), f1 = worlds.spawnFrame(w1);
  check('in world 1 the frame is the arena itself', f1.cx === 0 && f1.cz === 0 && f1.hx === w1.hx && f1.hz === w1.hz);
}

// ── world 2 → 3: the drain, where the boss died ─────────────────────
{
  const w = createWorld({ seed: 4, mode: 'hardcade', shape: 'portrait', world: 2 });
  const log = toBossClear(w, 2 * EVERY);
  const out = log.find((e) => e.type === 'worldOut'), lb = w.lastBoss;
  const I = P.drainInset;
  const want = { x: Math.max(-w.hx + I, Math.min(w.hx - I, lb.x)), z: Math.max(-w.hz + I, Math.min(w.hz - I, lb.z)) };
  check('HARDCADE too: world 2\'s boss cleared, a drain opens where it died', out?.kind === 'drain' && out.x === want.x && out.z === want.z, `${JSON.stringify(out)} boss at ${JSON.stringify(lb)}`);
  runFor(w, P.pull + P.sink + P.dark + P.fall + P.settle + 0.2);
  const S = worlds.arenaFor(3, 'portrait');
  check('and drops it into world 3, the sewer: a long tunnel, its own way round', w.world === 3 && w.hx === S.hx && w.hz === S.hz && S.hz > 2.5 * S.hx, `${w.hx} × ${w.hz}`);
  check('the sewer\'s share of heavy bodies is higher', worlds.heavyShare(w) > T.worlds.list[1].heavy);
}

// ── nine worlds (v27): the third goes on into the fourth, the ninth's boss
// wins the run; other modes have no worlds ─────────────────────────
{
  check('arcade has nine worlds', worlds.last() === 9 && T.worlds.list.map((x) => x.id).join() === 'grid,driveway,sewer,cistern,boiler,river,ice,deep,core');
  const w = createWorld({ seed: 9, mode: 'arcade', world: 3 });
  const log = toBossClear(w, 3 * EVERY);
  runFor(w, 6);
  check('world 3\'s boss opens the floor onto world 4, which plays under its rule', log.some((e) => e.type === 'worldOut') && w.world === 4 && w.rule?.kind === 'sweep', `${w.world} ${w.rule?.kind}`);
  const z = createWorld({ seed: 9, mode: 'arcade', world: 9 });
  const end = toBossClear(z, 9 * EVERY);
  check('world 9 is the last: its boss wins the run', end.some((e) => e.type === 'won') && z.won && z.over && !end.some((e) => e.type === 'worldOut'));
  check('…and THE CORE plays its rules in turn', z.rule?.cycle === true);
  const s = createWorld({ seed: 9, mode: 'survival' });
  check('SURVIVAL has no worlds', !worlds.on(s) && worlds.heavyShare(s) === 0 && !worlds.endsWorld(s, EVERY));
}

// ── v54: the gentler ramp — the pressure a wave presses at, and lives back per world ─────
{
  const G = T.waves.gentle, a = createWorld({ seed: 3, mode: 'arcade' }), h = createWorld({ seed: 3, mode: 'hardcade' });
  check('a wave up to `from` presses as itself', pressure(a, G.from) === G.from && pressure(a, 1) === 1);
  check('past it ARCADE presses on the gentle slope, HARDCADE on a steeper one than 1.x\'s own (v55)', pressure(a, 40) === G.from + (40 - G.from) * G.slope && pressure(h, 40) === G.from + (40 - G.from) * G.hard && G.slope < 1 && G.hard > 1);
  check('1.x\'s oracle (no worlds) presses as written', pressure({ mode: 'arcade', events: [] }, 40) === 40 && pressure(createWorld({ seed: 3, mode: 'survival' }), 40) === 40);
  const s = schedule(40, makeRng(5), 5, 5, 0, pressure(a, 40)), f = schedule(40, makeRng(5), 5, 5, 0);
  check('…so wave 40 budgets as the wave it presses at, and keeps its own kind', s.budget < f.budget && s.kind === f.kind && s.press === pressure(a, 40), `${s.budget} vs ${f.budget}`);
  const w = createWorld({ seed: 4, mode: 'arcade' }); w.hero.lives = 1;
  const ev = [...toBossClear(w, EVERY), ...runFor(w, 9)];
  check('beating a world\'s boss in ARCADE gives every life back, and says so', w.world === 2 && w.hero.lives === T.hero.lives && ev.some((e) => e.type === 'heal' && e.n === T.hero.lives - 1), `${w.world} ${w.hero.lives}`);
  const x = createWorld({ seed: 4, mode: 'hardcade' }); x.hero.lives = 1;
  const xe = [...toBossClear(x, EVERY), ...runFor(x, 9)];
  check('…and in HARDCADE one, and says so (v62; v55 gave none)', x.world === 2 && x.hero.lives === 2 && xe.some((e) => e.type === 'heal' && e.n === 1), `${x.world} ${x.hero.lives}`);
  const y = createWorld({ seed: 4, mode: 'hardcade' });
  const ye = [...toBossClear(y, EVERY), ...runFor(y, 9)];
  check('…never past T.hero.lives: a full hand stays full, and nothing is said', y.world === 2 && y.hero.lives === T.hero.lives && !ye.some((e) => e.type === 'heal'), `${y.world} ${y.hero.lives}`);
}

// ── the same seed, the same run (nothing random between worlds) ─────
{
  const a = createWorld({ seed: 21, mode: 'arcade' }), b = createWorld({ seed: 21, mode: 'arcade' });
  toBossClear(a, EVERY); toBossClear(b, EVERY);
  runFor(a, 9); runFor(b, 9);
  const key = (w) => JSON.stringify([w.world, w.wave, w.tick, w.score, w.hero.x, w.hero.z, w.gels.map((g) => [g.kind, g.x, g.z, g.heavy])]);
  check('two runs from one seed go through the vortex and on identically', key(a) === key(b) && a.world === 2);
}

console.log(failed ? `\n✗ worlds: ${failed} failed, ${passed} passed` : `✔ worlds: ${passed} checks`);
process.exit(failed ? 1 : 0);
