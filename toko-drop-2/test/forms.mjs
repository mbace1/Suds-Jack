// forms.mjs — the formations (sim/formation.js, v106), in bare node: a GIANT's escort rides its orbit, peels off
// when you close and scatters when the giant dies; a LINKED PAIR is held apart by its strand, the strand hurts to
// touch, a dash cuts it and a death snaps it; the director lays both out, and world 1 has neither.
//
//   node test/forms.mjs
import { createWorld, step, api } from '../js/sim/world.js?v=158';
import { TUNING as T } from '../js/tuning.js?v=158';
import * as formation from '../js/sim/formation.js?v=158';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const dt = T.sim.dt, E = T.forms.escort, P = T.forms.pair;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
// an arcade floor with nothing on it but what a check puts there
const bare = (world = 4, seed = 3) => {
  const w = createWorld({ seed, mode: 'arcade', world });
  w.director = { step() {} };
  w.gels.length = 0; w.bullets.length = 0;
  return w;
};
const run = (w, s, inp = IDLE) => { const log = []; for (let i = 0; i < Math.round(s / dt); i++) { step(w, inp); log.push(...w.events); } return log; };

// ── the escort ───────────────────────────────────────────────────────
{
  const w = bare();
  w.hero.x = 0; w.hero.z = w.hz - 2; w.hero.invinc = 1e9;
  const lead = api.spawn(w, 'splitta', 0, -4, { size: 5 });
  const n = 5, moons = [];
  for (let k = 0; k < n; k++) moons.push(api.spawn(w, 'globbo', Math.cos((k / n) * 6.283) * 4, -4 + Math.sin((k / n) * 6.283) * 4, { size: 1, form: { kind: 'escort', lead: lead.id, slot: k, n, phase: 0 } }));
  lead.speedMult = 0;   // the giant stands, so the orbit is read on its own
  run(w, 1.5);
  const R = (m) => lead.r + E.gap + m.r, off = moons.map((m) => Math.abs(Math.hypot(m.x - lead.x, m.z - lead.z) - R(m)));
  check('an escort\'s mites ride an orbit round their giant', off.every((d) => d < 0.6), off.map((d) => d.toFixed(2)).join(' '));
  const a0 = moons.map((m) => Math.atan2(m.z - lead.z, m.x - lead.x));
  run(w, 0.5);
  const turned = moons.map((m, i) => { let d = Math.atan2(m.z - lead.z, m.x - lead.x) - a0[i]; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; });
  check('and the orbit turns, all of them the same way round', turned.every((d) => d > 0.3) || turned.every((d) => d < -0.3), turned.map((d) => d.toFixed(2)).join(' '));
  check('while they ride, they wear their formation', moons.every((m) => m.form?.kind === 'escort'));
  // you close on one: it peels off
  const m0 = moons[0];
  w.hero.x = m0.x + E.peel * 0.5; w.hero.z = m0.z;
  run(w, dt);
  check('a mite peels off for good when you come within reach of it', m0.form === null, JSON.stringify(m0.form));
  w.hero.x = 0; w.hero.z = w.hz - 2;
  // the giant dies: the rest scatter
  const riding = moons.filter((m) => m.alive && m.form);
  const told = [];
  api.kill(w, lead, 'hero'); told.push(...w.events.filter((e) => e.type === 'escortScatter'));
  run(w, dt);
  check('when the giant dies its riders scatter, surging at you', riding.length > 0 && riding.every((m) => !m.form && m.surgeT > 0 && m.surgeMult === E.scatter.mult), `${riding.length} riding`);
  check('and each scatter is told (escortScatter)', told.length === riding.length, `${told.length}/${riding.length}`);

}

// ── the linked pair ──────────────────────────────────────────────────
{
  const w = bare(5, 9);
  w.hero.x = 0; w.hero.z = 4; w.hero.invinc = 1e9;
  const a = api.spawn(w, 'yela', -1, -6, {}), b = api.spawn(w, 'yela', 1, -6, {});
  const L = api.link(w, a.id, b.id, 'yela');
  let lo = Infinity, hi = 0;
  for (let i = 0; i < Math.round(6 / dt); i++) {
    step(w, IDLE);
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (i > 60) { lo = Math.min(lo, d); hi = Math.max(hi, d); }
  }
  check('a strand holds its pair apart, between its shortest and longest', lo > P.min - 1 && hi < P.max + 1.5, `${lo.toFixed(2)}–${hi.toFixed(2)}`);
  check('the strand stands while both live', !L.cut && formation.strands(w).length === 1);
  // the strand hurts: the hero on it, between the bodies, not invincible
  w.hero.invinc = 0; w.hero.mercy = 0;
  a.x = -3; a.z = 0; b.x = 3; b.z = 0; a.speedMult = b.speedMult = 0;
  w.hero.x = 0; w.hero.z = 0.1;
  const hurt = run(w, dt).find((e) => e.type === 'hurt');
  check('touching the strand hurts, and says whose it was', hurt?.by === 'strand:yela', JSON.stringify(hurt));
  // a dash through it cuts it, and nothing hurts
  w.hero.mercy = 0; w.hero.invinc = 0; w.hero.lives = 5;
  w.hero.x = 0; w.hero.z = 2.5;
  const cutLog = run(w, 0.4, { ...IDLE, dash: true, mx: 0, mz: -1 });
  check('a dash through the strand cuts it', cutLog.some((e) => e.type === 'strandCut' && e.by === 'dash') && L.cut, JSON.stringify(cutLog.filter((e) => e.type === 'strandCut')));
  check('and the dash through it does not hurt', !cutLog.some((e) => e.type === 'hurt' && String(e.by).startsWith('strand:')));
  // a death snaps it
  const w2 = bare(5, 11);
  w2.hero.invinc = 1e9;
  const c = api.spawn(w2, 'globbo', -2, -6, {}), e = api.spawn(w2, 'globbo', 2, -6, {});
  const L2 = api.link(w2, c.id, e.id, 'globbo');
  api.kill(w2, c, 'hero');
  check('either body\'s death snaps the strand', L2.cut);
}

// ── the director lays them out ───────────────────────────────────────
{
  let giants = 0, escorted = 0, moonKinds = new Set(), pairs = 0, w1forms = 0, moonsBehind = true;
  for (const world of [1, 3, 6, 9]) for (let seed = 0; seed < 6; seed++) {
    const w = createWorld({ seed: 300 + seed * 7 + world, mode: 'arcade', world });
    w.hero.invinc = 1e9;
    for (let i = 0; i < 90 / dt && w.wave < (world - 1) * T.waves.rhythm.bossEvery + 6; i++) {
      step(w, IDLE);
      for (const ev of w.events) if (ev.type === 'wave') {
        const q = w.dir.queue;
        q.forEach((s, j) => {
          if (s.size === 5) { giants++; const next = q.slice(j + 1).filter((x) => x.moon); if (next.length) escorted++; }
          // behind its giant: queued after it, or the giant already landed (a front at the wave's first beat)
          if (s.moon) { moonKinds.add(`${s.kind}:${s.size}`); if (!q.slice(0, j).some((x) => x.size === 5) && !w.gels.some((g) => g.alive && g.size === 5)) moonsBehind = false; }
        });
        if (q.some((s) => s.pair)) pairs++;
        if (world === 1 && q.some((s) => s.moon || s.pair)) w1forms++;
      }
      // keep the floor moving: kill what stands after a beat
      if (w.dir.waveT > 2) for (const g of w.gels.slice()) if (g.alive && g.state === 'active' && !g.isBoss) api.kill(w, g, 'env');
    }
  }
  check('every giant the director lays out brings an escort', giants > 0 && escorted === giants, `${escorted}/${giants}`);
  check('an escort is mites, queued behind its giant', moonsBehind && [...moonKinds].every((k) => k.endsWith(':1') && T.sizes.mites.includes(k.split(':')[0])), `${moonsBehind} ${[...moonKinds].join(' ')}`);
  check('a wave past world 3 may carry a linked pair', pairs > 0, `${pairs}`);
  check('world 1 has no formations (1.x\'s waves)', w1forms === 0, `${w1forms}`);
}

console.log(failed ? `\n✗ forms: ${failed} failed, ${passed} passed` : `✔ forms: ${passed} checks`);
process.exit(failed ? 1 : 0);
