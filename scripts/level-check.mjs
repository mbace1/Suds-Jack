#!/usr/bin/env node
// level-check.mjs — the level format's gate, in bare node.
//
// Proves js/level.js does what the UNIFIED format (v239 — this build and the
// Godot port's scripts/level.gd read the same JSON) says a level must:
// validate against the game's REAL enemy names and pickup ids, refuse every
// clause the port refuses (unknown keys, off-grid or out-of-order times, a
// body outside the region, a region with nowhere to stand, too many shapes),
// compile to the exact entry shape main.js's spawn pump reads, round-trip
// through serialize/parse byte-for-byte, and drop (never fire early) the
// spawns before a play-from-here point. Every file in toko-drop/levels/ must
// load — those are the files the port syncs, so a broken one breaks two builds.
//
// EnemyType lives in enemy.js, which imports three and cannot load here — so
// the names are read out of the SOURCE with a regex. That is the honest
// coupling: a level names an enemy, and this asks the file that defines them.

import { readFileSync, readdirSync } from 'node:fs';
import * as L from '../toko-drop/js/level.js';

const src = readFileSync(new URL('../toko-drop/js/enemy.js', import.meta.url), 'utf8');
const block = src.match(/export const EnemyType = \{([\s\S]*?)\n\};/);
if (!block) { console.error('✘ could not find EnemyType in enemy.js'); process.exit(1); }
const EnemyType = {};
for (const m of block[1].matchAll(/^\s*([A-Z][A-Z0-9_]*):\s*(\d+)/gm)) EnemyType[m[1]] = +m[2];
const typeNames = new Set(Object.keys(EnemyType));
// The pickup ids main.js offers a level (LEVEL_PICKUPS): NON_WEAPON_COLORS
// minus the cabinet-only shaped ids, plus the non-homing weapon pods.
const msrc = readFileSync(new URL('../toko-drop/js/main.js', import.meta.url), 'utf8');
const nw = msrc.match(/const NON_WEAPON_COLORS = \{([^}]*)\}/);
const pods = msrc.match(/const WEAPON_PODS = \{([\s\S]*?)\n\};/);
const pickupIds = new Set([
  ...[...(nw?.[1] ?? '').matchAll(/(\w+):/g)].map(m => m[1]).filter(id => !['key', 'potion', 'item'].includes(id)),
  ...[...(pods?.[1] ?? '').matchAll(/^\s*(\w+):/gm)].map(m => m[1]).filter(id => !id.startsWith('H')),
]);
const ctx = { typeNames, pickupIds };

let checks = 0, fails = 0;
const ok = (name, cond, extra = '') => { checks++; if (!cond) { fails++; console.error(`✘ ${name} ${extra}`); } };
const errsOf = lv => [...L.validate(lv, ctx), ...L.checkGeometry(lv)];
const fresh = (o = {}) => ({ ...L.newLevel('X'), spawns: [{ t: 0, type: 'GLOBBO', px: 0, pz: 0 }], ...o });

ok('EnemyType parsed from source', typeNames.size >= 30, `(${typeNames.size})`);
ok('pickup ids parsed from source', pickupIds.has('hp') && pickupIds.has('S') && !pickupIds.has('key'), [...pickupIds].join(','));

// ── every bundled file loads, and BUNDLED names exactly the files ──────
const dir = new URL('../toko-drop/levels/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')).sort();
ok('level.js BUNDLED names exactly the files in levels/', JSON.stringify([...L.BUNDLED].sort()) === JSON.stringify(files), `${L.BUNDLED} vs ${files}`);
const bundled = {};
for (const id of files) {
  let lv = null, err = '';
  try { lv = L.parse(readFileSync(new URL(`${id}.json`, dir), 'utf8'), ctx); } catch (e) { err = e.message; }
  ok(`levels/${id}.json loads clean`, !!lv, err);
  if (!lv) continue;
  bundled[id] = lv;
  ok(`levels/${id}.json: id matches its file name`, lv.id === id);
  ok(`levels/${id}.json: serialize → parse → serialize is byte-identical`, L.serialize(L.parse(L.serialize(lv), ctx)) === L.serialize(lv));
}
if (bundled['first-light']) {
  const s = L.arenaShape(bundled['first-light']);
  ok('first-light: 15 spawns on a 19×11 rectangle', bundled['first-light'].spawns.length === 15 && s.kind === 'rect' && s.halfX === 19 && s.halfZ === 11);
}
if (bundled['three-rings']) {
  const s = L.arenaShape(bundled['three-rings']);
  ok('three-rings: the intersection of three circles', s.kind === 'intersect' && s.parts.length === 3);
  ok('three-rings: the origin is inside the common area and x=9 is not', s.sdf(0, 0) < 0 && s.sdf(9, 0) > 0);
}

// ── the built-in example ───────────────────────────────────────────────
const ex = L.EXAMPLE_LEVEL;
ok('example level validates', errsOf(ex).length === 0, errsOf(ex).join('; '));
ok('example level has enemies AND a pickup AND a boss',
   ex.spawns.some(s => s.kind === 'pickup') && ex.spawns.some(s => !s.kind) && ex.spawns.some(s => s.boss));
ok('example level id does not collide with a bundled file', !files.includes(ex.id));

// ── compile: the pump's contract ───────────────────────────────────────
const c0 = L.compile(ex, EnemyType, 0);
ok('compile keeps every spawn from t=0', c0.length === ex.spawns.length);
ok('compile is sorted by delay', c0.every((s, i) => i === 0 || c0[i - 1].delay <= s.delay));
ok('compile resolves names to numbers', c0.filter(s => !s.pickup).every(s => Number.isInteger(s.type)));
ok('compile carries px/pz', c0.every(s => Number.isFinite(s.px) && Number.isFinite(s.pz)));
const need = ['type', 'delay', 'px', 'pz', 'speedMult', 'intervalMult', 'boss', 'elite', 'elitelite', 'affix', 'clusterOffset', 'shooter'];
ok('enemy entries carry every field the pump reads', c0.filter(s => !s.pickup).every(s => need.every(k => k in s)));
ok('boss flag survives', c0.some(s => s.boss && s.type === EnemyType.TORO));
ok('speedMult survives', c0.some(s => s.speedMult === 1.1));
ok('a pickup entry carries id and life', c0.some(s => s.pickup === 'firerate' && s.life === 12));

// play-from-here: earlier spawns are DROPPED, later ones shift, nothing fires early
const from = 12.3;
const c1 = L.compile(ex, EnemyType, from);
const later = ex.spawns.filter(s => s.t >= from - 1e-6).sort((a, b) => a.t - b.t);
ok('play-from-here keeps exactly the later spawns', c1.length === later.length, `${c1.length} vs ${later.length}`);
ok('play-from-here shifts delays by fromT', c1.every((s, i) => Math.abs(s.delay - (later[i].t - from)) < 1e-6));
ok('play-from-here never produces a negative delay', c1.every(s => s.delay >= 0));
ok('play-from-here delays stay on the grid', c1.every(s => Math.abs(s.delay * 10 - Math.round(s.delay * 10)) < 1e-6));

// ── the grid ───────────────────────────────────────────────────────────
ok('quantize snaps to 0.1', L.quantize(4.26) === 4.3 && L.quantize(0.04) === 0 && L.quantize(-3) === 0);
ok('fmtT prints one decimal', L.fmtT(0.1 + 0.2) === '0.3' && L.fmtT(12) === '12.0');
{
  const lv = L.newLevel('GRID TEST');
  L.addSpawn(lv, { t: 1.26, type: 'GLOBBO', px: 1.234, pz: -5.678 });
  ok('addSpawn quantizes t', lv.spawns[0].t === 1.3);
  ok('addSpawn rounds position to 2dp', lv.spawns[0].px === 1.23 && lv.spawns[0].pz === -5.68);
}

// ── validation: the port's clauses, one for one ────────────────────────
{
  const v = o => errsOf(fresh(o));
  const has = (errs, re) => errs.some(e => re.test(e));
  ok('a fresh level with one spawn is valid', v({}).length === 0, v({}).join('; '));
  ok('rejects an empty spawn list', has(v({ spawns: [] }), /nothing in it/));
  ok('rejects an unknown top-level key', has(v({ bonus: true }), /unknown key "bonus"/));
  ok('rejects an unknown enemy', has(v({ spawns: [{ t: 0, type: 'NOPE', px: 0, pz: 0 }] }), /unknown enemy type/));
  ok('rejects an unknown pickup', has(v({ spawns: [{ t: 0, kind: 'pickup', id: 'gold', px: 0, pz: 0 }] }), /unknown pickup/));
  ok('rejects a cabinet-only pickup', has(v({ spawns: [{ t: 0, kind: 'pickup', id: 'key', px: 0, pz: 0 }] }), /unknown pickup/));
  ok('rejects an unknown spawn key', has(v({ spawns: [{ t: 0, type: 'GLOBBO', px: 0, pz: 0, count: 3 }] }), /unknown key "count"/));
  ok('rejects a pickup with an enemy field', has(v({ spawns: [{ t: 0, kind: 'pickup', id: 'hp', px: 0, pz: 0, boss: true }] }), /unknown key "boss"/));
  ok('rejects a bad kind', has(v({ spawns: [{ t: 0, kind: 'trap', px: 0, pz: 0 }] }), /kind must be "pickup"/));
  ok('rejects missing position', has(v({ spawns: [{ t: 0, type: 'GLOBBO' }] }), /px and pz are required/));
  ok('rejects an off-grid t', has(v({ spawns: [{ t: 1.25, type: 'GLOBBO', px: 0, pz: 0 }] }), /not on the 0.1s grid/));
  ok('rejects spawns out of order', has(v({ spawns: [{ t: 2, type: 'GLOBBO', px: 0, pz: 0 }, { t: 1, type: 'GLOBBO', px: 0, pz: 0 }] }), /author in order/));
  ok('rejects a spawn past the end', has(v({ duration: 10, spawns: [{ t: 11, type: 'GLOBBO', px: 0, pz: 0 }] }), /past the level's duration/));
  ok('rejects a bad mode', has(v({ rules: { mode: 'chaos' } }), /mode must be one of/));
  ok('accepts melee and rush', v({ rules: { mode: 'melee' } }).length === 0 && v({ rules: { mode: 'rush' } }).length === 0);
  ok('rejects a bad outside rule', has(v({ rules: { mode: 'arcade', outside: 'fall' } }), /outside must be/));
  ok('rejects an unknown named arena', has(v({ arena: 'hexagon' }), /not one of/));
  ok('rejects the v237 {halfX, halfZ} arena form', has(v({ arena: { halfX: 9, halfZ: 9 } }), /unknown key "halfX"|must be a named arena|shapes must be/));
  ok('accepts a one-rect shape arena', v({ arena: { shapes: [{ kind: 'rect', hx: 9, hz: 9 }] } }).length === 0);
  ok('rejects several shapes without a combine', has(v({ arena: { shapes: [{ kind: 'rect', hx: 9, hz: 9 }, { kind: 'circle', c: [0, 0], r: 5 }] } }), /need a combine/));
  ok('rejects too many shapes', has(v({ arena: { combine: 'union', shapes: Array(5).fill({ kind: 'circle', c: [0, 0], r: 5 }) } }), /at most 4 shapes/));
  ok('rejects a moving shape', has(v({ arena: { shapes: [{ kind: 'circle', c: [0, 0], r: 5, move: {} }] } }), /"move" is not in format/));
  ok('rejects a bad shape kind', has(v({ arena: { shapes: [{ kind: 'hex', r: 5 }] } }), /unknown kind/));
  ok('rejects a body outside the region', has(v({ arena: { shapes: [{ kind: 'circle', c: [0, 0], r: 5 }] }, spawns: [{ t: 0, type: 'GLOBBO', px: 8, pz: 0 }] }), /outside the arena/));
  ok('rejects a region with nowhere to stand', has(v({ arena: { combine: 'intersect', shapes: [{ kind: 'circle', c: [-20, 0], r: 5 }, { kind: 'circle', c: [20, 0], r: 5 }] } }), /nowhere to stand/));
  ok('rejects a bad id', has(v({ id: 'Not A Slug' }), /lowercase slug/));
  ok('rejects a wrong format', has(v({ format: 2 }), /format must be 1/));
  ok('rejects boss: false (true or absent)', has(v({ spawns: [{ t: 0, type: 'GLOBBO', px: 0, pz: 0, boss: false }] }), /boss is true or absent/));
}

// ── serialize / parse round-trip, byte for byte ────────────────────────
{
  const s1 = L.serialize(ex);
  const back = L.parse(s1, ctx);
  const s2 = L.serialize(back);
  ok('serialize → parse → serialize is byte-identical', s1 === s2);
  ok('serialize puts one spawn per line', s1.split('\n').filter(l => /^\s{4}\{/.test(l)).length === ex.spawns.length);
  ok('serialize omits defaulted multipliers', !/"speedMult": ?1[,}]/.test(s1) && /"speedMult":1\.1/.test(s1));
  ok('parse rejects an invalid file', (() => { try { L.parse(JSON.stringify(fresh({ spawns: [{ t: 0, type: 'NOPE', px: 0, pz: 0 }] })), ctx); return false; } catch (e) { return /NOPE/.test(e.message); } })());
  ok('parse fills defaults for a bare file', (() => { const l = L.parse('{"format":1,"name":"bare","duration":5,"spawns":[{"t":0,"type":"GLOBBO","px":0,"pz":0}]}', ctx); return l.arena === 'auto' && l.rules.mode === 'arcade' && l.id === 'bare'; })());
  ok('parse migrates v237\'s mode "guns" to "arcade"', L.parse(JSON.stringify(fresh({ rules: { mode: 'guns' } })), ctx).rules.mode === 'arcade');
}

// ── editing helpers ────────────────────────────────────────────────────
{
  const lv = L.newLevel('EDIT');
  L.addSpawn(lv, { t: 5, type: 'GLOBBO', px: 0, pz: 0 });
  const b = L.addSpawn(lv, { t: 2, type: 'GLOBBO', px: 1, pz: 1 });
  ok('addSpawn keeps the list sorted', lv.spawns[0].t === 2 && lv.spawns[1].t === 5 && b === 0);
  const i2 = L.nudge(lv, 0, 4);          // 2 → 6, now after the 5
  ok('nudge re-sorts and returns the new index', i2 === 1 && lv.spawns[1].t === 6);
  L.nudge(lv, 1, 1000);
  ok('nudge clamps to duration', lv.spawns[1].t === lv.duration);
  L.removeSpawn(lv, 0);
  ok('removeSpawn removes', lv.spawns.length === 1);
  L.removeSpawn(lv, 7);
  ok('removeSpawn ignores a bad index', lv.spawns.length === 1);
}

console.log(`${checks - fails}/${checks} level checks passed`);
if (fails) { console.error(`✘ ${fails} FAILED`); process.exit(1); }
console.log('✔ the level format holds, on both builds\' clauses');
