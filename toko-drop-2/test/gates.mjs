#!/usr/bin/env node
// gates.mjs — the gate family (sim/pickups.js family, v107), in bare node: world 1's gates stay 1.x's; from world 2
// a gate may stand as a TURNSTILE (turning), a SLALOM (three in a line, threaded in one dash), a FENCE (a long beam
// sliding across), a FUSE (a burst when dashed) or a HOOP (crossed through its middle); each kind pays its own way.
//
//   node test/gates.mjs
import { createWorld, step, api } from '../js/sim/world.js?v=161';
import { TUNING as T } from '../js/tuning.js?v=161';
import * as PK from '../js/sim/pickups.js?v=161';
import { waveKind } from '../js/sim/director/arcade.js?v=161';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const G = T.pickups.gate, F = G.family, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 0, az: 0, aim: false, fire: false, dash: false };
const QUIET = { step() {} };
const W = (o = {}) => { const w = createWorld({ seed: 1, mode: 'arcade', ...o }); w.director = QUIET; w.gels.length = 0; return w; };
const run = (w, n, inp = IDLE) => { const log = []; for (let i = 0; i < n && !w.over; i++) { step(w, typeof inp === 'function' ? inp(i) : inp); log.push(...w.events); } return log; };
const begin = (w, n) => {
  w.director = { step(w) { w.wave = n; w.events.push({ type: 'wave', wave: n, kind: waveKind(n), carry: false }); w.director = QUIET; } };
  step(w, IDLE);
};
// a family gate by hand, the fields family() gives one
const gate = (w, type, x, z, angle, extra = {}) => {
  const g = { id: 900 + w.pk.gates.length, x, z, px: x, pz: z, angle, ax: -Math.sin(angle), az: Math.cos(angle), risk: false, green: true, alive: true, cd: 0, retireT: null, drift: false, dx: 0, dz: 0, type, ...extra };
  w.pk.gates.push(g); return g;
};
// a dash from (x, z) toward (dx, dz), the hero put there first, kept alive
const dash = (w, x, z, dx, dz, n = 30) => {
  const h = w.hero; h.x = h.px = x; h.z = h.pz = z; h.dashCd = 0; h.invinc = 1e9;
  return run(w, n, (i) => ({ ...IDLE, mx: dx, mz: dz, dash: i === 0 }));
};

// ── world 1 keeps 1.x's gates; the family stands from world 2 ───────────────
{
  let w1 = 0, kinds = new Map(), groups = new Map(), drawn = 0;
  for (let seed = 0; seed < 8; seed++) {
    const w = W({ seed, world: 1 });
    for (let n = 3; n <= 30; n++) { run(w, 30); begin(w, n); }
    w1 += w.pk.gates.filter((g) => g.type && g.type !== 'gate').length;
    for (const world of [6, 9]) {
      const v = W({ seed: seed + 50, world });
      for (let n = (world - 1) * 8 + 3; n <= (world - 1) * 8 + 30; n++) {
        run(v, 30); begin(v, n);
        for (const g of v.pk.gates) {
          if (g.seen) continue; g.seen = true; drawn++;
          kinds.set(g.type ?? 'gate', (kinds.get(g.type ?? 'gate') ?? 0) + 1);
          if (g.group != null) groups.set(`${world}:${seed}:${g.group}`, (groups.get(`${world}:${seed}:${g.group}`) ?? 0) + 1);
        }
      }
    }
  }
  check('world 1\'s gates are all 1.x\'s plain gates', w1 === 0, `${w1}`);
  check('from world 2, every kind of the family stands', ['gate', 'turnstile', 'slalom', 'fence', 'fuse', 'hoop'].every((k) => kinds.get(k) > 0), JSON.stringify([...kinds]));
  check('a slalom stands three to a group', groups.size > 0 && [...groups.values()].every((n) => n === 3), JSON.stringify([...groups.values()].slice(0, 6)));
  const w2 = W({ seed: 3, world: 2 }); const seen2 = new Set();
  for (let n = 11; n <= 30; n++) { run(w2, 30); begin(w2, n); for (const g of w2.pk.gates) seen2.add(g.type ?? 'gate'); }
  check('the driveway opens only the turnstile', [...seen2].every((k) => k === 'gate' || k === 'turnstile'), [...seen2].join(' '));
}

// ── the turnstile turns, the fence slides and turns back ───────────────────
{
  const w = W({ world: 6 }), g = gate(w, 'turnstile', 0, 0, 0.3, { half: F.turnstile.half, spin: 1.1 });
  run(w, 60);
  check('a turnstile turns at its own rate', Math.abs(g.angle - (0.3 + 1.1 * 60 * dt)) < 1e-9 && Math.abs(g.ax + Math.sin(g.angle)) < 1e-12);
  const f = gate(w, 'fence', w.hx - F.fence.inset - 0.3, 0, 0, { half: F.fence.frac * w.hz, drift: true, dx: F.fence.speed, inset: F.fence.inset });
  let maxX = -Infinity; for (let i = 0; i < 300; i++) { step(w, IDLE); maxX = Math.max(maxX, f.x); }
  check('a fence slides across and turns back off its own inset', f.dx < 0 && maxX < w.hx - F.fence.inset + F.fence.speed * dt + 1e-9, `${maxX.toFixed(2)} dx ${f.dx}`);
}

// ── a slalom threaded in one dash pays, and drops its prize ─────────────────
{
  const w = W({ world: 6 }), a = 0;   // beams along z; three gates along x, gap apart
  const gs = [-1, 0, 1].map((s) => gate(w, 'slalom', s * F.slalom.gap, 0, a, { half: F.slalom.half, group: 77, follower: s !== 0 }));
  const s0 = w.score, log = dash(w, -F.slalom.gap - 0.7, 0, 1, 0);   // a plain dash (4.7) from just before the first
  const th = log.find((e) => e.type === 'threaded'), sl = log.filter((e) => e.type === 'slalom');
  check('a dash through all three of a slalom threads it', gs.every((g) => !g.alive) && sl.length === 3 && !!th, `${sl.length} slalom, threaded ${!!th}`);
  check('…paying each gate and the threading, and one prize', w.score - s0 >= 3 * F.slalom.pay + F.slalom.threaded && w.pk.items.length + log.filter((e) => e.type === 'pickup').length >= 1, `${w.score - s0}`);
  const v = W({ world: 6 });
  const hs = [-1, 0, 1].map((s) => gate(v, 'slalom', s * F.slalom.gap, 0, 0, { half: F.slalom.half, group: 78 }));
  const l1 = dash(v, -F.slalom.gap - 0.7, 0, 1, 0, 4);   // cut short after two of them
  v.hero.dash = 0;
  const l2 = dash(v, F.slalom.gap - 0.7, 0, 1, 0);
  check('three broken in two dashes is not a threading, and drops no prize', !hs.some((g) => g.alive) && ![...l1, ...l2].some((e) => e.type === 'threaded') && v.pk.items.length === 0, `${hs.map((g) => g.alive)} items ${v.pk.items.length}`);
}

// ── a fuse bursts: bodies in reach hurt or shoved, their shots gone, no prize ──
{
  const w = W({ world: 6 });
  gate(w, 'fuse', 0, 0, 0, { half: F.fuse.half });
  const near = [], far = [];
  for (const [x, z] of [[2, 1], [-2, -2], [3, 3]]) near.push(createBody(w, 'globbo', x, z));
  far.push(createBody(w, 'globbo', F.fuse.r + 4, 0));
  const tough = createBody(w, 'bulwark', 0, -3); tough.hp = tough.maxHp = 20;
  w.bullets.push({ x: 1, z: 1.5, px: 1, pz: 1.5, vx: 0, vz: 0, speed: 0, r: 0.15, life: 9, hero: false, color: 0xffffff, src: 'spittor', revenge: false, homing: 0, grazed: false, dead: false });
  const log = dash(w, -1.5, 0, 1, 0, 2);
  check('a dashed fuse bursts', log.some((e) => e.type === 'fuse'));
  check('…every small body in reach dies to it (an env kill)', near.every((g) => !g.alive), near.map((g) => g.hp).join(' '));
  check('…one out of reach is untouched', far.every((g) => g.alive && g.hp === g.maxHp));
  check('…a tough one in reach is hurt and shoved out', tough.alive && tough.hp === 20 - F.fuse.damage && Math.hypot(tough.kx, tough.kz) > 1, `${tough.hp} ${tough.kx.toFixed(2)},${tough.kz.toFixed(2)}`);
  check('…the shots in its reach are gone', !w.bullets.some((b) => !b.hero && !b.dead && Math.hypot(b.x - 1, b.z - 1.5) < 0.01));
  check('…and it drops no prize', w.pk.items.length === 0 && !log.some((e) => e.type === 'pickup'));
}

// ── a hoop: crossed through its middle for two prizes; it cuts nothing ──────
{
  const w = W({ world: 6 });
  const h = gate(w, 'hoop', 0, 0, 0, { ring: F.hoop.r });
  const by = createBody(w, 'globbo', 0.2, 0.3);
  run(w, 40);
  check('a hoop cuts no body', by.alive && by.hp === by.maxHp);
  by.alive = false; w.gels.length = 0;
  const miss = W({ world: 6 }), hm = gate(miss, 'hoop', 0, 0, 0, { ring: F.hoop.r });
  dash(miss, -3, F.hoop.r * 1.3, 1, 0);
  check('a dash past its rim does not count', hm.alive);
  const log = dash(w, -3, 0, 1, 0);
  check('a dash through its middle takes it, for two prizes', !h.alive && w.pk.items.length + log.filter((e) => e.type === 'pickup').length === F.hoop.prizes, `${w.pk.items.length}`);
}

// a body put down where a check wants it, standing still
function createBody(w, kind, x, z) {
  const g = api.spawn(w, kind, x, z, {});
  g.speedMult = 0; g.anchored = true;
  return g;
}

console.log(failed ? `\n✗ gates: ${failed} failed, ${passed} passed` : `✔ gates: ${passed} checks`);
process.exit(failed ? 1 : 0);
