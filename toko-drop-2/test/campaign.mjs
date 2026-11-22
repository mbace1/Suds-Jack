#!/usr/bin/env node
// campaign.mjs — the CAMPAIGN in bare node (sim/director/campaign.js,
// sim/shape.js): every room loads and plays to its end, its bodies arrive
// where and when the level says, a shaped room keeps everything inside its
// region, the goals end a room as 1.x's did, and the grades are 1.x's.
//
//   node test/campaign.mjs
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../js/sim/world.js?v=161';
import { TUNING as T } from '../js/tuning.js?v=161';
import { grade, rooms, isOpen, roomBodies, tiersFor } from '../js/sim/director/campaign.js?v=161';
import { speciesOf, goalOf, metricOf } from '../js/sim/challenge.js?v=161';
import * as heatMod from '../js/sim/heat.js?v=161';
import { Arena, levelShape, rectShape, circleShape, unionShape, intersectShape } from '../js/sim/shape.js?v=161';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`); };
const C = T.campaign, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const FIRE = { mx: 0, mz: 0, ax: 1, az: 0, aim: true, fire: true, dash: false };
const level = (id) => JSON.parse(readFileSync(new URL(`../levels/${id}.json`, import.meta.url), 'utf8'));
const roomOf = (id, turn = false) => { const r = rooms().find((x) => x.id === id); return { ...r, level: level(id), turn }; };

// ── shapes, against 1.x's arithmetic ──────────────────────────────────
{
  const box = new Arena(rectShape(19, 11));
  check('a rect contains its middle, not past its wall', box.contains(0, 0, 0.5) && !box.contains(19.2, 0, 0));
  const c = new Arena(circleShape(0, 0, 10));
  const p = c.clamp(20, 0, 1, { x: 0, z: 0 });
  check('a circle clamps a body back to radius − r', Math.abs(Math.hypot(p.x, p.z) - 9) < 1e-3, `${p.x}, ${p.z}`);
  const u = new Arena(unionShape(circleShape(-5, 0, 8), circleShape(5, 0, 8))), x = new Arena(intersectShape(circleShape(-4, 0, 10), circleShape(4, 0, 10)));
  check('a union holds either part; an intersection only the overlap', u.contains(-11, 0) && u.contains(11, 0) && x.contains(0, 0) && !x.contains(-12, 0));
  const turned = levelShape(level('undertow'), true);
  check('a turned room swaps its sizes (portrait)', turned.halfX === 11 && turned.halfZ === 19);
}

// ── every room: loads, plays to its end, keeps its bodies in ─────────
for (const r of rooms()) {
  for (const turn of [false, true]) {
    const R = roomOf(r.id, turn), L = R.level;
    const w = createWorld({ seed: 7, mode: 'campaign', room: R });
    w.hero.invinc = 1e9;
    const known = L.spawns.filter((s) => s.kind !== 'pickup' && speciesOf(s.type)).length;
    let spawned = 0, outside = 0, end = null, steps = 0;
    while (!w.over && steps < (L.duration + 5) / dt) {
      step(w, steps % 2 ? FIRE : IDLE); steps++;
      for (const e of w.events) { if (e.type === 'spawn') spawned++; if (e.type === 'roomEnd') end = e; }
      if (w.region) for (const g of w.gels) if (!w.region.contains(g.x, g.z, g.r - 0.02)) outside++;
      if (w.region && !w.region.contains(w.hero.x, w.hero.z, T.hero.radius - 0.02)) outside++;
    }
    const tag = `${r.id}${turn ? ' (turned)' : ''}`;
    check(`${tag}: every authored body is a 2.0 species`, known === roomBodies(L), `${known} of ${roomBodies(L)}`);
    check(`${tag}: ends with a grade`, !!end && ['S', 'A', 'B', 'C', 'D', 'F'].includes(end.grade), JSON.stringify(end));
    if (!end) continue;
    // a room graded on a share or on hits lasts its clock (an invincible hero cannot die in it; a heart can)
    const timed = metricOf(R).name === 'time', heart = ['protect', 'escort'].includes(goalOf(R).type);
    if (!timed && !heart) check(`${tag}: a room on the clock runs its whole clock`, Math.abs(end.time - L.duration) < 0.11 && end.outcome === 'clear', `${end.time} / ${L.duration}`);
    if (!timed && !heart) check(`${tag}: its own bodies arrive (children may add more)`, spawned >= known, `${spawned} / ${known}`);
    if (w.region) check(`${tag}: nothing leaves the region`, outside === 0, `${outside} body-steps outside`);
  }
}

// ── the goals end a room (1.x main.js:11344-11356) ───────────────────
{
  const R = roomOf('the-pull'), K = R.level.goal.kills;
  const w = createWorld({ seed: 3, mode: 'campaign', room: R }); w.hero.invinc = 1e9;
  let end = null;
  for (let i = 0; i < 2 / dt && !end; i++) { step(w, IDLE); w.kills = Math.max(w.kills, i > 30 ? K : 0); for (const e of w.events) if (e.type === 'roomEnd') end = e; }
  check('a quota room ends the moment the count is met', end?.outcome === 'clear' && end.time < 1, JSON.stringify(end));
  const F = { ...roomOf('undertow'), level: { ...level('undertow'), mods: { flawless: true } } };
  const v = createWorld({ seed: 3, mode: 'campaign', room: F });
  let e2 = null;
  for (let i = 0; i < 4 / dt && !e2; i++) { step(v, IDLE); if (i === 20) { v.hero.invinc = 0; v.hero.mercy = 0; api.hurt(v, 'test'); } for (const e of v.events) if (e.type === 'roomEnd') e2 = e; }
  check('one hit ends a flawless room, graded F', e2?.outcome === 'dead' && e2.grade === 'F', JSON.stringify(e2));
  const d = createWorld({ seed: 3, mode: 'campaign', room: roomOf('undertow') });
  d.hero.lives = 1; d.hero.invinc = 0;
  let e3 = null;
  for (let i = 0; i < 2 / dt && !e3; i++) { step(d, IDLE); if (i === 5) { d.hero.mercy = 0; api.hurt(d, 'test'); } for (const e of d.events) if (e.type === 'roomEnd') e3 = e; }
  check('dying in a room ends it with an F', e3?.outcome === 'dead' && e3.grade === 'F', JSON.stringify(e3));
}

// ── a room is graded on its SCORE (v51) ──────────────────────────────
{
  const L = { ...level('undertow'), tiers: { S: 9000, A: 7000, B: 5000, C: 3000 } }, room = { goal: 'survive' };
  check('a score at or past a line takes its grade', grade(room, L, { outcome: 'clear', score: 9000 }) === 'S' && grade(room, L, { outcome: 'clear', score: 7400 }) === 'A' && grade(room, L, { outcome: 'clear', score: 5000 }) === 'B' && grade(room, L, { outcome: 'clear', score: 3000 }) === 'C');
  check('through the room but under C is D (v157: F is not getting through)', grade(room, L, { outcome: 'clear', score: 2999 }) === 'D');
  check('dead is F, whatever the score', grade(room, L, { outcome: 'dead', score: 99999 }) === 'F');
  const N = { ...level('undertow'), tiers: undefined, tiersHard: undefined }, R2 = T.campaign.scoreRate, D = N.duration;
  check('a room with no lines yet grades at TUNING.campaign.scoreRate a second of its clock', JSON.stringify(tiersFor(room, N)) === JSON.stringify({ S: D * R2.S, A: D * R2.A, B: D * R2.B, C: D * R2.C }));
  check('every room has four score lines, best first', rooms().every((x) => { const t = level(x.id).tiers; return t && t.S > t.A && t.A > t.B && t.B > t.C && t.C > 0; }), rooms().filter((x) => { const t = level(x.id).tiers; return !(t && t.S > t.A && t.A > t.B && t.B > t.C && t.C > 0); }).map((x) => x.id).join(' '));
}

// ── HEAT (v51): the score's one multiplier ───────────────────────────
{
  const H = T.heat, R = roomOf('undertow');
  // a bystander stays alive far off, so a kill under test is not the one that empties the floor (v53)
  const fresh = (lv = R.level) => { const w = createWorld({ seed: 5, mode: 'campaign', room: { ...R, level: lv } }); w.hero.invinc = 1e9; const s = api.spawn(w, 'globbo', -12, 6, {}); s.state = 'active'; s.speedMult = 0; return w; };
  const body = (w, d) => { const g = api.spawn(w, 'globbo', w.hero.x + d, w.hero.z, {}); g.state = 'active'; return g; };
  let w = fresh();
  check('heat starts cold: ×1', heatMod.mult(w) === 1 && w.heat === 0);
  const s0 = w.score; api.kill(w, body(w, 1.5), 'hero');
  check('a kill pays perKill × the heat it was made at, and heats you', w.score - s0 === T.score.perKill && w.heat > 0, `${w.score - s0}, ${w.heat}`);
  const near = w.heat; w = fresh(); api.kill(w, body(w, 9), 'hero');
  check('a kill made close heats more than one made far off', near > w.heat * 3, `${near} vs ${w.heat}`);
  w = fresh(); api.kill(w, body(w, 9), 'dash');
  check('a dash kill heats as one made point-blank', Math.abs(w.heat - near) < 1e-9, `${w.heat} vs ${near}`);
  w = fresh(); w.heat = 3.5;
  check('heat 3.5 pays ×4', heatMod.mult(w) === 4);
  const s1 = w.score; api.kill(w, body(w, 9), 'hero');
  check('…and a kill there pays four times perKill', w.score - s1 === 4 * T.score.perKill, String(w.score - s1));
  const ev = w.events.find((e) => e.type === 'kill');
  check('a kill event carries the multiplier it was made at (its voice rides up with it)', ev?.m === 4, JSON.stringify(ev));
  w.heat = 7.9; check('the multiplier stops at ×levels', heatMod.mult(w) === H.levels);
  w = fresh(); w.heat = 2.5; for (let i = 0; i < 5 / dt; i++) step(w, IDLE);
  check('quiet, the heat drains away', w.heat < 0.5, String(w.heat));
  // v53: an empty floor holds it, and the kill that empties the floor heats more
  w = fresh(); w.dir.queue = []; for (const g of w.gels) g.alive = false; w.heat = 2.5;
  for (let i = 0; i < 3 / dt; i++) step(w, IDLE);
  check('with nothing on the floor to kill, the heat holds', w.heat === 2.5, String(w.heat));
  w = fresh(); w.dir.queue = []; for (const g of w.gels) g.alive = false;
  const a = body(w, 9), b = body(w, 9.5); api.kill(w, a, 'hero'); const h1 = w.heat; api.kill(w, b, 'hero');
  check('the kill that empties the floor heats TUNING.heat.clear more', Math.abs((w.heat - h1) - h1 - H.clear) < 1e-9, `${h1} then ${w.heat}`);
  w = fresh(); w.heat = 4; w.hero.invinc = 0; w.hero.mercy = 0; api.hurt(w, 'test');
  check('a hit throws the heat away', w.heat === H.hitKeep * 4 && heatMod.mult(w) === 1);
  // BANK: the pot waits for the heat to cool, and a hit loses it
  const bankLv = { ...R.level, score: { mutators: ['bank'] } };
  w = fresh(bankLv); const s2 = w.score; api.kill(w, body(w, 1.5), 'hero');
  check('BANK: a kill goes into the pot, not the score', w.score === s2 && w.pot === T.score.perKill, `${w.score} ${w.pot}`);
  for (let i = 0; i < 6 / dt && w.pot > 0; i++) step(w, IDLE);
  check('BANK: the pot is banked when the heat cools', w.pot === 0 && w.score === s2 + T.score.perKill, `${w.score} ${w.pot}`);
  w = fresh(bankLv); api.kill(w, body(w, 1.5), 'hero'); w.hero.invinc = 0; w.hero.mercy = 0; api.hurt(w, 'test');
  check('BANK: a hit loses the pot', w.pot === 0 && w.score === 0);
  // COLD GUN: a shot costs heat
  w = fresh({ ...R.level, score: { mutators: ['coldgun'] } }); w.heat = 1;
  api.heroBullet(w, w.hero.x, w.hero.z, 0);
  check('COLD GUN: a shot cools the heat', Math.abs(w.heat - (1 - H.coldShot)) < 1e-9, String(w.heat));
  w = fresh(); w.heat = 1; api.heroBullet(w, w.hero.x, w.hero.z, 0);
  check('without it, a shot costs nothing', w.heat === 1);
  // WHITE HEAT (v60): the ceiling is ×white.levels, not ×levels
  const whiteLv = { ...R.level, score: { mutators: ['white'] } };
  w = fresh(whiteLv); w.heat = 7.9; heatMod.gain(w, 3);
  check('WHITE HEAT: the heat climbs on past ×levels', heatMod.mult(w) === H.levels + 3, String(heatMod.mult(w)));
  heatMod.gain(w, 99);
  check('…and stops at ×white.levels', heatMod.mult(w) === H.white.levels && w.heat < H.white.levels, String(w.heat));
  const s3 = w.score; api.kill(w, body(w, 9), 'hero');
  check('…where a kill pays white.levels × perKill', w.score - s3 === H.white.levels * T.score.perKill, String(w.score - s3));
  w.hero.invinc = 0; w.hero.mercy = 0; api.hurt(w, 'test');
  check('…and a hit throws it all away', heatMod.mult(w) === 1);
  w = fresh(); w.heat = 7.9; heatMod.gain(w, 3);
  check('without it, the heat stops at ×levels', heatMod.mult(w) === H.levels && w.heat < H.levels, String(w.heat));
  // v60: every world of the campaign has a room with a mutator, and only the three there are
  const KINDS = ['bank', 'coldgun', 'white'], mutOf = (id) => level(id).score?.mutators ?? [];
  check('every campaign world has a room with a mutator', T.campaign.worlds.every((W) => W.rooms.some((r) => mutOf(r.id).length > 0)),
    T.campaign.worlds.map((W) => `${W.name}: ${W.rooms.filter((r) => mutOf(r.id).length).map((r) => r.id).join(',') || '—'}`).join('; '));
  check('every mutator a room names is one sim/heat.js knows', T.campaign.worlds.every((W) => W.rooms.every((r) => mutOf(r.id).every((m) => KINDS.includes(m)))));
  // v153 (owner: "campaign can use any world"): a room may name a look of its own. The rule the list keeps: a floor
  // that is a shape, or moves, wears the neon grid; one plain rectangle wears a place
  { const WORLDS = T.worlds.list.map((x) => x.id), lookOf = (W, r) => r.look ?? W.look;
    const shaped = (id) => { const sh = level(id).arena?.shapes ?? []; return sh.length !== 1 || sh[0].kind !== 'rect' || sh.some((s) => s.orbit || s.pulse || s.path || s.spin); };
    const all = T.campaign.worlds.flatMap((W) => W.rooms.map((r) => ({ W, r })));
    check('every room wears an arcade world\'s look, its own or its world\'s', all.every(({ W, r }) => WORLDS.includes(lookOf(W, r))),
      all.filter(({ W, r }) => !WORLDS.includes(lookOf(W, r))).map(({ r }) => `${r.id}: ${r.look}`).join(', '));
    const wrong = all.filter(({ W, r }) => (lookOf(W, r) === 'grid') !== shaped(r.id)).map(({ W, r }) => `${r.id} (${lookOf(W, r)})`);
    check('a floor that is a shape or moves wears the grid, and a plain rectangle a place', wrong.length === 0, wrong.join(', '));
    const nGrid = all.filter(({ W, r }) => lookOf(W, r) === 'grid').length;
    check('…which leaves every world of the campaign rooms of both kinds', T.campaign.worlds.every((W) => { const g = W.rooms.filter((r) => lookOf(W, r) === 'grid').length; return g > 0 && g < W.rooms.length; }), `${nGrid} of ${all.length} on the grid`);
    const worn = new Set(all.map(({ W, r }) => lookOf(W, r)));
    check('every arcade world is worn somewhere in the campaign', WORLDS.every((id) => worn.has(id)), WORLDS.filter((id) => !worn.has(id)).join(', '));
    check('a room on the grid keeps its world\'s own colours and rail', T.campaign.worlds.every((W) => W.base?.length === 3 && W.gridHi?.length === 3 && W.rail != null)); }
  // a room won early pays its seconds left
  const Q = roomOf('the-pull'), K = Q.level.goal.kills;
  w = createWorld({ seed: 3, mode: 'campaign', room: Q }); w.hero.invinc = 1e9;
  let end = null;
  for (let i = 0; i < 2 / dt && !end; i++) { step(w, IDLE); if (i > 30) w.kills = K; for (const e of w.events) if (e.type === 'roomEnd') end = e; }
  const left = Math.floor(Q.level.duration - end.time - 1e-6);
  check('a room won early pays TUNING.campaign.points.timeLeft a second left', end?.outcome === 'clear' && end.score >= left * T.campaign.points.timeLeft, JSON.stringify(end));
}

// ── the route: a room opens when the one before it is past F ─────────
{
  const all = rooms();
  check('thirty-six rooms in six worlds of six', all.length === 36 && C.worlds.length === 6 && C.worlds.every((wd) => wd.rooms.length === 6));
  // v46: each world walks its rooms from the easiest to the hardest, as the bot measured them
  check('in every world the difficulty never falls from one room to the next', C.worlds.every((wd) => wd.rooms.every((r, i) => !i || level(r.id).plan.d >= level(wd.rooms[i - 1].id).plan.d)),
    C.worlds.map((wd) => wd.rooms.map((r) => level(r.id).plan.d).join(' ')).join(' | '));
  const types = all.map((r) => { const L = level(r.id), g = L.goal, m = L.mods ?? {}; return [g.type, g.metric, m.noGun && 'nogun', m.dash, m.ammo && 'ammo', m.flawless && 'flawless', m.escalate && 'esc', L.gates?.length && 'gates', (L.arena.shapes ?? []).map((p) => p.orbit ? 'orbit' : p.pulse?.mode ?? '').join('')].filter(Boolean).join('+'); });
  check('the goals and mods: at least twenty kinds of room', new Set(types).size >= 20, `${new Set(types).size}: ${[...new Set(types)].join(' | ')}`);
  // the strategy curve (CAMPAIGN_PLAN.md): THE SURFACE teaches one skill a room, all five — but room 1, which teaches
  // the controls and nothing more (v160);
  // the next two worlds a pair a room, every one of the ten pairs; the last three three or more
  const SK = ['position', 'priority', 'aim', 'movement', 'risk'], st = (r) => level(r.id).plan?.strategy ?? [];
  const w1 = all.filter((r) => r.world === 0), w23 = all.filter((r) => r.world === 1 || r.world === 2), w46 = all.filter((r) => r.world >= 3);
  check('strategy: every skill named is one of the five', all.slice(1).every((r) => st(r).length && st(r).every((k) => SK.includes(k))));
  check('strategy: room 1 asks for none (v160: it teaches the controls)', st(all[0]).length === 0);
  check('strategy: the rest of THE SURFACE teaches one skill a room, and all five', w1.slice(1).every((r) => st(r).length === 1) && new Set(w1.slice(1).map((r) => st(r)[0])).size === 5);
  check('strategy: worlds two and three pair them, every pair at least once', w23.every((r) => st(r).length === 2) && new Set(w23.map((r) => [...st(r)].sort().join('+'))).size === 10);
  check('strategy: the last three worlds ask for three or more, and the end for more still', w46.every((r) => st(r).length >= 3) && st(all.at(-2)).length >= 4 && st(all.at(-1)).length === 5);
  check('every room says what it teaches and how hard it is', all.every((r) => { const P = level(r.id).plan; return P && P.d >= 1 && P.d <= 10 && P.teaches; }));
  check('the first room is open, the second is not', isOpen(0, {}) && !isOpen(1, {}));
  check('an F does not open the next; a C does', !isOpen(1, { [all[0].id]: { grade: 'F' } }) && isOpen(1, { [all[0].id]: { grade: 'C' } }));
}
{
  const a = createWorld({ seed: 11, mode: 'campaign', room: roomOf('rink') }), b = createWorld({ seed: 11, mode: 'campaign', room: roomOf('rink') });
  for (let i = 0; i < 20 / dt; i++) { step(a, FIRE); step(b, FIRE); }
  check('one seed, one room: the same run', a.kills === b.kills && a.gels.length === b.gels.length && a.hero.x === b.hero.x);
}

// ── the HARD CAMPAIGN (v49): the same rooms, and every corpse fires back ─
{
  const R = T.revenge, H = R.room;
  // one GLOBBO (not a biter) at `dist`, shot down: does its corpse fire?
  const corpse = (hard, dist) => {
    const w = createWorld({ seed: 4, mode: 'campaign', room: { ...roomOf('first-light'), hard } });
    w.dir.queue.length = 0; w.hero.invinc = 1e9;
    const g = api.spawn(w, 'globbo', dist, 0, { hp: 1 }); g.state = 'active'; g.vx = g.vz = 0;
    let rev = 0, killed = false;
    for (let i = 0; i < 3 / dt && !killed; i++) {
      if (i % 6 === 0) api.heroBullet(w, w.hero.x, w.hero.z, Math.atan2(g.z - w.hero.z, g.x - w.hero.x));
      step(w, IDLE);
      for (const e of w.events) { if (e.type === 'revenge') rev++; if (e.type === 'kill') killed = true; }
    }
    // v103: a corpse warns before it bites: its fire leaves `tell` s after the kill
    for (let i = 0; i < 120 && w.seeds.length; i++) { step(w, IDLE); for (const e of w.events) if (e.type === 'revenge') rev++; }
    return { killed, rev };
  };
  const far = corpse(true, H.near + 4), near = corpse(true, H.near - 1), soft = corpse(false, H.near + 4);
  check('HARD: a body that is not a biter fires back from its corpse', far.killed && far.rev === 1, JSON.stringify(far));
  check('HARD: …but not one killed within reach of you (a dash kill is point-blank)', near.killed && near.rev === 0, JSON.stringify(near));
  check('…and on the normal route no corpse fires', soft.killed && soft.rev === 0, JSON.stringify(soft));
  // its own lines, and its own route
  const L = level('flotsam'), r = roomOf('flotsam');
  check('every room has HARD lines of its own', rooms().every((x) => level(x.id).tiersHard?.S != null));
  check('a HARD room is graded on its HARD lines, a room on its own', tiersFor({ ...r, hard: true }, L) === L.tiersHard && tiersFor(r, L) === L.tiers);
  const ids = rooms().map((x) => x.id), pass = (n) => Object.fromEntries(ids.slice(0, n).map((id) => [id, { grade: 'C' }]));
  check('the first HARD room opens only once the room is cleared on the normal route', !isOpen(0, {}, {}) && isOpen(0, {}, pass(1)));
  check('a later one also needs the HARD room before it', !isOpen(1, {}, pass(2)) && isOpen(1, pass(1), pass(2)) && !isOpen(1, pass(1), pass(1)));
  check('…and the normal route is as it was', isOpen(0, {}) && isOpen(1, pass(1)) && !isOpen(1, {}));
}

// ── one rule per world (1.x v264; sim/rules.js) ───────────────────────
{
  const RR = T.campaign.rules;
  const run = (id, s, inp = IDLE, w = createWorld({ seed: 5, mode: 'campaign', room: roomOf(id) })) => { w.hero.invinc = 1e9; const log = []; for (let i = 0; i < s / dt && !w.over; i++) { step(w, inp); log.push(...w.events); } return { w, log }; };
  check('THE SURFACE keeps no rule', !createWorld({ seed: 5, mode: 'campaign', room: roomOf('gate-run') }).rule);
  const kinds = T.campaign.worlds.map((wd) => wd.rule).join(',');
  check('the worlds own current, sweep, dark, slip, updraft, in 1.x\'s order', kinds === ',current,sweep,dark,slip,updraft', kinds);
  {
    // THE WELL: an idle hero drifts with the current, a third of a body's speed
    const { w } = run('undertow', 3);
    const moved = Math.hypot(w.hero.x, w.hero.z);
    check('THE WELL: an idle hero drifts on the current', moved > RR.current.speed * RR.current.playerMult * 3 * 0.6, moved.toFixed(2));
  }
  {
    // THE VEIN: a warning, then a line off one rail with a gap in it
    const { w, log } = run('pulse', RR.sweep.every + RR.sweep.warn + 0.2);
    const warn = log.find((e) => e.type === 'ruleWarn'), fire = log.find((e) => e.type === 'ruleFire');
    const line = w.bullets.filter((b) => b.src === 'sweep');
    check('THE VEIN: the rail warns, then fires a line', !!warn && !!fire && line.length >= 3, `${!!warn} ${!!fire} ${line.length}`);
    const horiz = warn.lane < 2, span = horiz ? w.hx : w.hz, n = Math.max(3, Math.floor((span * 2) / RR.sweep.spacing));
    check('…with a gap of two in it', line.length === n - RR.sweep.gapSlots, `${line.length} of ${n}`);
  }
  {
    const w = createWorld({ seed: 5, mode: 'campaign', room: roomOf('lights-out') }); w.hero.invinc = 1e9;
    let lo = 1, hi = 0;
    for (let i = 0; i < RR.dark.period / dt; i++) { step(w, IDLE); lo = Math.min(lo, w.rule.dark); hi = Math.max(hi, w.rule.dark); }
    check('THE VOID: the dark closes all the way in and opens again over its period', lo < 0.02 && hi > 0.98, `${lo} ${hi}`);
  }
  {
    // THE FOAM: let go of the stick and you keep sliding
    const w = createWorld({ seed: 5, mode: 'campaign', room: roomOf('rink') }); w.hero.invinc = 1e9;
    const RIGHT = { ...IDLE, mx: 1 };
    for (let i = 0; i < 0.5 / dt; i++) step(w, RIGHT);
    const x0 = w.hero.x; for (let i = 0; i < 0.3 / dt; i++) step(w, IDLE);
    const g = createWorld({ seed: 5, mode: 'campaign', room: roomOf('undertow') });
    check('THE FOAM: you slide on after letting go', w.hero.x - x0 > 0.5, (w.hero.x - x0).toFixed(2));
    check('…and only there', !g.rule || g.rule.kind !== 'slip');
  }
  {
    // THE KILN: everything is shoved out from the middle
    const w = createWorld({ seed: 5, mode: 'campaign', room: roomOf('bellows') }); w.hero.invinc = 1e9; w.hero.x = 2; w.hero.z = 0;
    let fired = false, r0 = 0;
    for (let i = 0; i < (RR.updraft.every + RR.updraft.warn + RR.updraft.dur + 0.3) / dt; i++) { if (!fired) r0 = Math.hypot(w.hero.x, w.hero.z); step(w, IDLE); if (w.events.some((e) => e.type === 'ruleFire')) fired = true; }
    check('THE KILN: the updraft shoves you out from the middle', fired && Math.hypot(w.hero.x, w.hero.z) > r0 + 1.5, `${r0.toFixed(2)} → ${Math.hypot(w.hero.x, w.hero.z).toFixed(2)}`);
  }
  {
    const a = run('crossfire', 12, FIRE).w, b = run('crossfire', 12, FIRE).w;
    check('a world rule replays from the seed', a.bullets.length === b.bullets.length && a.hero.x === b.hero.x && a.rule.fired === b.rule.fired);
  }
}

console.log(failed ? `\n✗ campaign: ${failed} failed, ${passed} passed` : `✔ campaign: ${passed} checks`);
process.exit(failed ? 1 : 0);
