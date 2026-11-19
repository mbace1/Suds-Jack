// reshape.mjs — SURVIVAL's floor changes size as you play (sim/reshape.js),
// in bare node: it starts small, warns, the walls slam to the next size and
// carry what stands in their way, and nothing else changes.
//
//   node test/reshape.mjs
import { createWorld, step, api } from '../js/sim/world.js?v=157';
import { TUNING as T } from '../js/tuning.js?v=157';
import * as reshape from '../js/sim/reshape.js?v=157';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const dt = T.sim.dt, R = T.survival.reshape, A = T.arena.landscape;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const run = (w, s, inp = IDLE) => { const log = []; for (let i = 0; i < Math.round(s / dt); i++) { step(w, inp); log.push(...w.events.map((e) => ({ ...e, tick: w.tick }))); } return log; };
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

{
  const w = createWorld({ seed: 3, mode: 'survival', shape: 'landscape' });
  w.hero.invinc = 1e9;
  check('SURVIVAL starts on a small floor', near(w.hx, A.hx * R.start[0]) && near(w.hz, A.hz * R.start[1]) && w.hx < A.hx, `${w.hx} × ${w.hz}`);
  const quiet = run(w, R.first - 0.1);
  check('and holds it until the first change', !quiet.some((e) => e.type.startsWith('reshape')) && near(w.hx, A.hx * R.start[0]));
  const warn = run(w, 0.2).find((e) => e.type === 'reshapeWarn');
  check('then the floor warns where it will be', warn && !(near(warn.hx, w.hx) && near(warn.hz, w.hz)) && warn.t === R.warn, JSON.stringify(warn));
  check('…and nothing moves while it warns', near(w.hx, A.hx * R.start[0]));
  // stand the hero against the wall that is about to move in, if one is
  const shrinkX = warn.hx < w.hx;
  w.hero.x = shrinkX ? w.hx - T.hero.radius : 0;
  const moveLog = run(w, R.warn + 0.05);
  check('the walls start to move when the warning ends', moveLog.some((e) => e.type === 'reshape'));
  const done = run(w, R.move + 0.1);
  check('and reach the new size', done.some((e) => e.type === 'reshaped') && near(w.hx, warn.hx) && near(w.hz, warn.hz), `${w.hx} × ${w.hz} vs ${warn.hx} × ${warn.hz}`);
  check('a wall that moved in carried the hero with it', !shrinkX || near(w.hero.x, w.hx - T.hero.radius, 1e-6), `${w.hero.x} / ${w.hx}`);
  check('every body is inside the floor', w.gels.every((g) => g.state === 'appear' || (Math.abs(g.x) <= w.hx - g.r + 1e-6 && Math.abs(g.z) <= w.hz - g.r + 1e-6)));
  // a run of changes: never the same size twice running, always one of the sizes
  const sizes = [];
  for (let i = 0; i < 6; i++) { const l = run(w, R.every + R.warn + R.move + 0.2); const r = l.find((e) => e.type === 'reshaped'); if (r) sizes.push(`${r.hx.toFixed(3)}×${r.hz.toFixed(3)}`); }
  const allowed = new Set(R.sizes.map(([x, z]) => `${(A.hx * x).toFixed(3)}×${(A.hz * z).toFixed(3)}`));
  check('it goes on changing, every one a size from the list', sizes.length >= 5 && sizes.every((s) => allowed.has(s)), sizes.join(' '));
  check('never to the size it is already', sizes.every((s, i) => i === 0 || s !== sizes[i - 1]));
  const mx = reshape.maxSize('landscape');
  check('maxSize bounds every size it takes', sizes.every((s) => { const [x, z] = s.split('×').map(Number); return x <= mx.hx + 1e-6 && z <= mx.hz + 1e-6; }));
}

{
  // the bullets left outside when it shrinks are gone
  const w = createWorld({ seed: 8, mode: 'survival' });
  w.hero.invinc = 1e9;
  run(w, R.first + R.warn - 0.05);
  const to = w.shapeT.to;
  api.fire.emit(w, Math.min(w.hx, to.hx + 2), 0, 0, { src: 'test' });
  run(w, R.move + 0.3);
  check('a bullet the floor left behind is gone', w.bullets.every((b) => Math.abs(b.x) <= w.hx + 1.5 && Math.abs(b.z) <= w.hz + 1.5));
}

{
  const a = createWorld({ seed: 5, mode: 'arcade' });
  run(a, R.first + R.warn + R.move + 1);
  check('ARCADE\'s floor never changes size', a.hx === A.hx && a.hz === A.hz && !a.shapeT);
  const x = createWorld({ seed: 12, mode: 'survival' }), y = createWorld({ seed: 12, mode: 'survival' });
  run(x, 70); run(y, 70);
  check('one seed, one run: the same sizes at the same times', x.hx === y.hx && x.hz === y.hz && x.tick === y.tick && x.gels.length === y.gels.length);
}

console.log(failed ? `\n✗ reshape: ${failed} failed, ${passed} passed` : `✔ reshape: ${passed} checks`);
process.exit(failed ? 1 : 0);
