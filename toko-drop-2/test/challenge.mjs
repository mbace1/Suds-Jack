#!/usr/bin/env node
// challenge.mjs — what a CAMPAIGN room asks (sim/challenge.js), in bare node:
// every goal ends its room the way it says, every mod takes away what it says,
// a moving floor moves and holds what stands on it, and the grade reads the
// room's own number against its tiers.
import { createWorld, step, api } from '../js/sim/world.js?v=157';
import { TUNING as T } from '../js/tuning.js?v=157';
import { grade, onCourse } from '../js/sim/director/campaign.js?v=157';
import { levelShape, levelEnvelope } from '../js/sim/shape.js?v=157';
import * as fire from '../js/sim/fire.js?v=157';

let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const dt = T.sim.dt, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const BOX = { combine: 'union', shapes: [{ kind: 'rect', hx: 14, hz: 9 }] };

// a room from a level written here; `world` 0 is THE SURFACE (no rule)
function room(level, { seed = 3, world = 0 } = {}) {
  const L = { format: 2, id: 't', name: 'T', arena: BOX, duration: 30, spawns: [], ...level };
  const w = createWorld({ seed, mode: 'campaign', room: { id: 't', world, level: L } });
  w.hero.invinc = level.mortal ? 0 : 1e9;
  return w;
}
// step until the room ends (or `max` s); the roomEnd event
function run(w, input = IDLE, max = 40, each = null) {
  for (let i = 0; i < max / dt; i++) {
    step(w, typeof input === 'function' ? input(w, i) : input);
    each?.(w, i);
    const e = w.events.find((x) => x.type === 'roomEnd');
    if (e) return e;
  }
  return null;
}
const killAll = (w, pred = () => true) => { for (const g of w.gels.slice()) if (g.alive && pred(g)) api.kill(w, g); };

// ── SURVIVE: runs its clock, graded on the share ──
{
  const w = room({ duration: 2, spawns: [{ t: 0, type: 'GLOBBO', px: 8, pz: 0 }] });
  const e = run(w);
  check('survive: the clock ends it, a clear', e?.outcome === 'clear' && Math.abs(e.time - 2) < 0.11, JSON.stringify(e));
  check('survive (v51): through the clock with no score is under its C line: F', e?.grade === 'F' && e.why === 'score', JSON.stringify(e));
}
// ── QUOTA with tiers: graded on the time against them ──
{
  const L = { goal: { type: 'quota', kills: 2 }, tiers: { S: 400, A: 300, B: 200, C: 100 }, spawns: [0, 0, 0].map((t, i) => ({ t, type: 'GLOBBO', px: 8, pz: -4 + i * 4 })) };
  const w = room(L);
  const e = run(w, IDLE, 5, (w, i) => { if (i === 30) killAll(w); });
  check('quota: met ends it at once', e?.outcome === 'clear' && e.time < 0.7, JSON.stringify(e));
  check('quota (v51): two kills and the seconds left past its S line is S', e?.grade === 'S', JSON.stringify(e));
  const w2 = room(L);
  const e2 = run(w2, IDLE, 40);
  check('quota: the clock running out first is a fail, F', e2?.outcome === 'fail' && e2.grade === 'F', JSON.stringify(e2));
}
// ── CLEAR: every body, then it ends ──
{
  const w = room({ goal: { type: 'clear' }, spawns: [{ t: 0, type: 'GLOBBO', px: 8, pz: 0 }, { t: 1, type: 'GLOBBO', px: -8, pz: 0 }] });
  const e = run(w, IDLE, 5, (w, i) => { if (i === 10 || i === 80) killAll(w); });
  check('clear: not before the last body has come and gone', e?.outcome === 'clear' && e.time > 1, JSON.stringify(e));
}
// ── GATES: the room's own gates, dashed through ──
{
  const w = room({ goal: { type: 'gates' }, gates: [{ t: 0, x: 3, z: 0, angle: 0 }, { t: 0, x: 3, z: 6, angle: 0 }] });
  let gates = 0;
  const e = run(w, (w, i) => (i < 30 ? { ...IDLE, mx: 1, dash: i === 2 } : i < 120 ? { ...IDLE, mz: 1 } : { ...IDLE, mx: -1, dash: i === 140 }), 6,
    (w) => { gates = Math.max(gates, w.pk.gates.length); });
  check('gates: the room places them', gates === 2, `${gates}`);
  check('gates: one dashed through counts', (w.ch.n ?? 0) >= 1, `${w.ch.n}`);
  void e;
}
// ── NO GUN / AMMO ──
{
  const fire = { ...IDLE, aim: true, fire: true };
  const w = room({ mods: { noGun: true } });
  for (let i = 0; i < 60; i++) step(w, fire);
  check('noGun: holding the trigger fires nothing', w.bullets.filter((b) => b.hero).length === 0);
  const w2 = room({ mods: { ammo: 3 } });
  let shots = 0, dry = 0;
  for (let i = 0; i < 120; i++) { step(w2, fire); shots += w2.events.filter((e) => e.type === 'shot' && !e.round).length; dry += w2.events.filter((e) => e.type === 'dry').length; }
  check('ammo: three shots and no more', shots === 3 && w2.gun.ammo === 0 && dry === 1, `${shots} ${dry}`);
  const w3 = room({ mods: { dash: 'cut' } });
  check('a room can ask for the CUT dash', w3.dashMode === 'cut');
}
// ── ORDER: only the lit body can be hurt ──
{
  const w = room({ goal: { type: 'order' }, spawns: [{ t: 0, type: 'GLOBBO', px: 6, pz: 0, order: 2 }, { t: 0, type: 'GLOBBO', px: 6, pz: 4, order: 1 }] });
  for (let i = 0; i < 40; i++) step(w, IDLE);
  const [a, b] = [w.gels.find((g) => g.order === 2), w.gels.find((g) => g.order === 1)];
  check('order: the lowest number is lit, the rest locked', a?.locked && b && !b.locked);
  const hp = a.hp;
  api.heroBullet(w, a.x - 1.2, a.z, 0);
  let blocked = false;
  for (let i = 0; i < 10; i++) { step(w, IDLE); if (w.events.some((e) => e.type === 'block' && e.by === 'locked')) blocked = true; }
  check('order: a shot at a locked body is spent and does nothing', blocked && a.hp === hp, `${blocked} ${a.hp}/${hp}`);
  api.kill(w, b); step(w, IDLE);
  check('order: the next one lights when the lit one goes', !a.locked);
}
// ── HOLD: stand in the ring ──
{
  const w = room({ goal: { type: 'hold', need: 1, zone: { x: 0, z: 0, r: 3 } } });
  const e = run(w, IDLE, 3);
  check('hold: standing in the ring fills it and ends the room', e?.outcome === 'clear' && Math.abs(e.time - 1) < 0.1, JSON.stringify(e));
  const w2 = room({ goal: { type: 'hold', need: 1, zone: { x: 10, z: 0, r: 2, orbit: { r: 2, period: 4 } } } });
  const z0 = { ...w2.ch.zone };
  for (let i = 0; i < 60; i++) step(w2, IDLE);
  check('hold: away from it nothing fills; an orbiting ring moves', w2.ch.zone.fill === 0 && Math.hypot(w2.ch.zone.x - z0.x, w2.ch.zone.z - z0.z) > 1);
}
// ── PROTECT: the heart ──
{
  const w = room({ goal: { type: 'protect', heart: { x: 1, z: 0, r: 1.4, hp: 3 } }, spawns: [{ t: 0, type: 'GLOBBO', px: 6, pz: 0 }] });   // it chases you, and you stand by the heart
  const hurt = [];
  const e = run(w, IDLE, 10, (w) => { for (const x of w.events) if (x.type === 'heart') hurt.push(x.hp); });
  check('protect: a body on the heart bites it, and a dead heart ends the room in an F', hurt.length === 3 && e?.outcome === 'dead' && e.grade === 'F', `${hurt} ${JSON.stringify(e)}`);
  const w2 = room({ duration: 1, goal: { type: 'protect', heart: { x: -6, z: 0, hp: 4 } } });
  const e2 = run(w2);
  check('protect (v51): a whole heart at the end pays TUNING.campaign.points.heart', e2?.outcome === 'clear' && e2.score === T.campaign.points.heart, JSON.stringify(e2));
  // v117: a gel's bullet that reaches the heart lands; corpse fire (aimed at you, v103) passes through it
  const w3 = room({ goal: { type: 'protect', heart: { x: 0, z: 0, r: 1.4, hp: 5 } } });
  w3.hero.x = w3.hero.px = 0; w3.hero.z = w3.hero.pz = 7;
  const shot = fire.emit(w3, -5, 0, 0, { src: 'globbo' }), bite = fire.emit(w3, -5, 0.6, 0, { src: 'globbo', revenge: true });
  let past = -Infinity;
  run(w3, IDLE, 2, () => { if (!bite.dead) past = Math.max(past, bite.x); });
  check('protect (v117): a gel\'s bullet on the heart lands, corpse fire passes through it', w3.ch.heart.hp === 4 && shot.dead && past > 2, JSON.stringify({ hp: w3.ch.heart.hp, shot: shot.dead, past }));
}
// ── HUNT, COMBO, BOSS ──
{
  const w = room({ goal: { type: 'hunt', kind: 'CLOAKER' }, spawns: [{ t: 0, type: 'GLOBBO', px: 6, pz: 0 }, { t: 0, type: 'CLOAKER', px: -6, pz: 0 }] });
  const e = run(w, IDLE, 3, (w, i) => { if (i === 30) killAll(w, (g) => g.kind === 'globbo'); if (i === 60) killAll(w, (g) => g.kind === 'cloaker'); });
  check('hunt: a decoy does not count; the quarry does', e?.outcome === 'clear' && e.time > 0.9, JSON.stringify(e));
  const w2 = room({ goal: { type: 'combo', streak: 3 }, spawns: [0, 1, 2, 3].map((i) => ({ t: 0, type: 'GLOBBO', px: 8, pz: -6 + i * 4 })) });
  const e2 = run(w2, IDLE, 3, (w, i) => { if (i === 20) { const gs = w.gels.filter((g) => g.alive); api.kill(w, gs[0]); api.kill(w, gs[1]); } if (i === 40) api.kill(w, w.gels.find((g) => g.alive)); });
  check('combo: reaching the streak ends it', e2?.outcome === 'clear' && e2.time > 0.6, JSON.stringify(e2));
  const w3 = room({ goal: { type: 'boss' }, spawns: [{ t: 0, type: 'GLOBBO', px: 8, pz: 0, boss: true }, { t: 0, type: 'GLOBBO', px: -8, pz: 0 }] });
  const e3 = run(w3, IDLE, 3, (w, i) => { if (i === 30) killAll(w, (g) => g.isBoss); });
  check('boss: the boss down ends it, its adds or not', e3?.outcome === 'clear' && e3.time < 0.7, JSON.stringify(e3));
}
// ── COLLECT ──
{
  const w = room({ goal: { type: 'collect', orbs: [{ t: 0.5, x: 0, z: 0 }, { t: 1, x: 0.3, z: 0 }] } });
  const e = run(w, IDLE, 3);
  check('collect: an orb under you is taken when it comes out; all of them clears', e?.outcome === 'clear' && Math.abs(e.time - 1) < 0.1, JSON.stringify(e));
}
// ── FLAWLESS as a mod ──
{
  const w = room({ mortal: true, mods: { flawless: true }, spawns: [{ t: 0, type: 'GLOBBO', px: 0.5, pz: 0 }] });
  const e = run(w, IDLE, 5);
  check('flawless: the first hit ends the room, F', e?.outcome === 'dead' && e.grade === 'F', JSON.stringify(e));
}
// ── ESCALATE ──
{
  const w = room({ mods: { escalate: { every: 1, speed: 0.5 } }, spawns: [{ t: 0, type: 'GLOBBO', px: 8, pz: 0 }, { t: 1.5, type: 'GLOBBO', px: -8, pz: 0 }] });
  for (let i = 0; i < 1.7 / dt; i++) step(w, IDLE);
  const [a, b] = w.gels, a1 = a.speedMult, b1 = b.speedMult;
  for (let i = 0; i < 0.5 / dt; i++) step(w, IDLE);
  check('escalate: what arrives arrives at the pace so far', Math.abs(a1 - 1.5) < 1e-6 && Math.abs(b1 - 1.5) < 1e-6, `${a1} ${b1}`);
  check('escalate: and everything standing speeds up at the next step', Math.abs(a.speedMult - 2) < 1e-6 && Math.abs(b.speedMult - 2) < 1e-6, `${a.speedMult} ${b.speedMult}`);
}
// ── GAUNTLET: the rule changes on the room's clock ──
{
  const w = room({ duration: 4, goal: { type: 'gauntlet', stages: [{ at: 0, rule: null }, { at: 1, rule: 'current' }, { at: 2, rule: 'slip' }, { at: 3, rule: 'dark' }] } });
  const seen = [];
  run(w, IDLE, 5, (w) => { for (const e of w.events) if (e.type === 'ruleTurn') seen.push(e.kind); });
  check('gauntlet: the rule turns at each stage', seen.join() === 'current,slip,dark', seen.join());
  const w2 = room({ rule: 'current' });
  check('a room may carry its own rule over its world\'s', w2.rule?.kind === 'current');
}
// ── MOVING FLOORS ──
{
  const orbit = { combine: 'intersect', shapes: [{ kind: 'circle', c: [0, 0], r: 9, orbit: { r: 3, period: 4 } }, { kind: 'circle', c: [0, 0], r: 9, orbit: { r: 3, period: 4, phase: Math.PI } }] };
  const L = { arena: orbit, duration: 8 };
  const s0 = levelShape(L, false, 0), s1 = levelShape(L, false, 1);
  check('orbit: the region at a later time is another shape', s0.sdf(0, 6) !== s1.sdf(0, 6));
  const env = levelEnvelope(L);
  check('the walls hold the room at every moment', env.hx >= 12 - 1e-6 && env.hz >= 12 - 1e-6, JSON.stringify(env));
  const shrink = { combine: 'union', shapes: [{ kind: 'rect', hx: 14, hz: 9, pulse: { from: 1, to: 0.4, period: 4, mode: 'shrink', steps: 2 } }] };
  const w = room({ arena: shrink, duration: 6 });
  w.hero.x = 13; w.hero.z = 8;
  for (let i = 0; i < 4.5 / dt; i++) step(w, IDLE);
  check('shrink: the floor closes in and carries you in with it', Math.abs(w.hero.x) <= 14 * 0.4 && Math.abs(w.hero.z) <= 9 * 0.4, `${w.hero.x.toFixed(2)}, ${w.hero.z.toFixed(2)}`);
  check('shrink: in steps, not a slide', Math.abs(levelShape({ arena: shrink }, false, 1.9).halfX - 14) < 1e-9 && Math.abs(levelShape({ arena: shrink }, false, 2.1).halfX - 14 * 0.7) < 1e-9);
  const a = room({ arena: orbit, duration: 8, spawns: [{ t: 0, type: 'YELA_CUBE', px: 2, pz: 2 }] }), b = room({ arena: orbit, duration: 8, spawns: [{ t: 0, type: 'YELA_CUBE', px: 2, pz: 2 }] });
  for (let i = 0; i < 300; i++) { step(a, { ...IDLE, mx: 1 }); step(b, { ...IDLE, mx: 1 }); }
  check('a moving room replays from its seed', a.hero.x === b.hero.x && a.gels[0]?.x === b.gels[0]?.x);
}
// ── ON COURSE, and why an F ──
{
  // v51: the grade a room's score stands at, and the next line up with the points still to find
  const w = room({ duration: 5, tiers: { S: 400, A: 300, B: 200, C: 100 }, spawns: [{ t: 0, type: 'GLOBBO', px: 8, pz: 0 }] });
  step(w, IDLE);
  const a = onCourse(w); w.score = 250; const b = onCourse(w); w.score = 450; const c = onCourse(w);
  check('on course: F with C 100 to find, then B with A 50 to find, then S', a.grade === 'F' && a.next === 'C' && a.need === 100 && b.grade === 'B' && b.next === 'A' && b.need === 50 && c.grade === 'S' && c.next == null, JSON.stringify([a, b, c]));
  w.score = 50; w.pot = 60;
  check('on course: BANK\'s pot counts toward the line', onCourse(w).grade === 'C');
  const e1 = run(room({ duration: 1, goal: { type: 'quota', kills: 3 } }));
  check('why: a clock that ran out says so', e1?.why === 'clock', JSON.stringify(e1));
  const e2 = run(room({ mortal: true, mods: { flawless: true }, spawns: [{ t: 0, type: 'GLOBBO', px: 0.5, pz: 0 }] }), IDLE, 5);
  check('why: a hit in a no-hits room says so', e2?.why === 'hit', JSON.stringify(e2));
}
// ── GRADES from tiers ──
{
  const room0 = { goal: 'survive' }, L = { duration: 30, spawns: [{ t: 0, type: 'GLOBBO' }], goal: { type: 'clear' }, tiers: { S: 1000, A: 700, B: 400, C: 200 } };
  const g = (score) => grade(room0, L, { outcome: 'clear', kills: 1, hits: 0, time: 9, score });
  check('score lines (v51): at S is S, then A, B, C, and under C an F', g(1000) === 'S' && g(800) === 'A' && g(400) === 'B' && g(250) === 'C' && g(199) === 'F');
  check('anything but a clear is F', grade(room0, L, { outcome: 'fail', kills: 1, time: 5, score: 5000 }) === 'F');
}

// ── ESCORT (v46): the heart walks its path; it ends when it gets there ──
{
  const level = { duration: 20, goal: { type: 'escort', heart: { x: -6, z: 0, r: 1.2, hp: 6 }, path: [[0, 0], [6, 0]], speed: 3 } };
  const w = room(level);
  let legs = 0, mid = null;
  const e = run(w, IDLE, 20, (w, i) => { legs += w.events.filter((x) => x.type === 'chStep' && x.what === 'leg').length; if (i === 60) mid = w.ch.heart.x; });
  check('escort: the heart walks its path at its speed, leg by leg', legs === 2 && Math.abs(mid - (-3)) < 0.1, JSON.stringify({ legs, mid }));
  check('escort: it ends when the heart gets there, a clear paid for what it kept', e?.outcome === 'clear' && Math.abs(e.time - 4) < 0.1 && e.score >= T.campaign.points.heart, JSON.stringify(e));
  // a body on the walking heart bites it, and the room is lost with it
  const w2 = room({ ...level, goal: { ...level.goal, heart: { x: -6, z: 0, r: 1.2, hp: 2 }, speed: 0.5 }, spawns: [{ t: 0, type: 'GLOBBO', px: -6, pz: 0, speedMult: 0 }] });
  const e2 = run(w2, IDLE, 20);
  check('escort: a body in its way bites it; the heart lost is an F', e2?.outcome === 'dead' && e2.why === 'heart' && e2.grade === 'F', JSON.stringify(e2));
  // the clock before the end of the path is a fail
  const w3 = room({ ...level, duration: 3, goal: { ...level.goal, speed: 1 } });
  const e3 = run(w3, IDLE, 5);
  check('escort: the clock out before it arrives is an F', e3?.outcome === 'fail' && e3.why === 'clock', JSON.stringify(e3));
}

// ── HILLS (v46): the rings in turn; a full one gives way to the next ──
{
  const zones = [{ x: 0, z: 0, r: 2 }, { x: 6, z: 0, r: 2 }];
  const w = room({ duration: 20, goal: { type: 'hills', zones, need: 1 } });
  w.hero.x = 0; w.hero.z = 0;
  let hills = [];
  const e = run(w, (w) => ({ ...IDLE, mx: w.ch.zone ? Math.sign(w.ch.zone.x - w.hero.x) * (Math.abs(w.ch.zone.x - w.hero.x) > 0.3 ? 1 : 0) : 0 }), 20,
    (w) => { for (const x of w.events) if (x.type === 'chStep' && x.what === 'hill') hills.push(x.n); });
  check('hills: the first ring fills, the next comes up, and the last one ends the room', hills.join() === '1,2' && e?.outcome === 'clear', JSON.stringify({ hills, e }));
  check('hills: graded on time', e && e.time > 2 && e.time < 6, JSON.stringify(e));
  // drain: out of the ring it empties
  const w2 = room({ duration: 6, goal: { type: 'hills', zones, need: 3, drain: 1 } });
  w2.hero.x = 0; w2.hero.z = 0;
  for (let i = 0; i < 1 / dt; i++) step(w2, IDLE);
  const full = w2.ch.zone.fill;
  w2.hero.x = 10;
  for (let i = 0; i < 0.5 / dt; i++) step(w2, IDLE);
  check('hills: outside the ring it drains at `drain` a second', Math.abs(full - 1) < 0.05 && Math.abs(w2.ch.zone.fill - 0.5) < 0.05, JSON.stringify({ full, now: w2.ch.zone.fill }));
}

// ── COLLECT with a life (v46): an orb not taken in time goes out; too many out is a fail ──
{
  const orbs = [{ t: 0, x: 0, z: 0 }, { t: 0, x: 10, z: 6 }, { t: 0, x: -10, z: -6 }];
  const w = room({ duration: 20, goal: { type: 'collect', orbs, life: 2, need: 2 } });
  w.hero.x = 0; w.hero.z = 0;
  const e = run(w, IDLE, 20);
  check('collect: an orb not taken in its life goes out, and once too few are left the room fails', w.ch.lost === 2 && e?.outcome === 'fail' && e.why === 'orbs' && Math.abs(e.time - 2) < 0.1, JSON.stringify({ lost: w.ch.lost, e }));
  const w2 = room({ duration: 20, goal: { type: 'collect', orbs: [{ t: 0, x: 0, z: 0 }, { t: 0, x: 3, z: 0 }, { t: 0, x: -10, z: -6 }], life: 3, need: 2 } });
  w2.hero.x = 0; w2.hero.z = 0;
  const e2 = run(w2, (w) => ({ ...IDLE, mx: 1 }), 20);
  check('collect: `need` of them taken is the clear, the rest may go out', e2?.outcome === 'clear' && w2.ch.n === 2, JSON.stringify({ n: w2.ch.n, e2 }));
}

console.log(failed ? `\n✗ challenge: ${failed} failed, ${passed} passed` : `✔ challenge: ${passed} checks`);
process.exit(failed ? 1 : 0);
