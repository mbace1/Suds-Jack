#!/usr/bin/env node
// level-check.mjs — the level format's gate, in bare node.
//
// Proves js/level.js does what LEVEL_EDITOR_DESIGN.md §4 says a level format
// must: validate against the game's REAL enemy names, compile to the exact
// entry shape main.js's spawn pump reads, round-trip through serialize/parse
// byte-for-byte, keep every t on the 0.1s grid, and drop (never fire early)
// the spawns before a play-from-here point. It also checks the built-in
// example level, which is the editor's first LOAD and the editor gate's fixture.
//
// EnemyType lives in enemy.js, which imports three and cannot load here — so
// the names are read out of the SOURCE with a regex. That is the honest
// coupling: a level names an enemy, and this asks the file that defines them.

import { readFileSync } from 'node:fs';
import * as L from '../toko-drop/js/level.js';

const src = readFileSync(new URL('../toko-drop/js/enemy.js', import.meta.url), 'utf8');
const block = src.match(/export const EnemyType = \{([\s\S]*?)\n\};/);
if (!block) { console.error('✘ could not find EnemyType in enemy.js'); process.exit(1); }
const EnemyType = {};
for (const m of block[1].matchAll(/^\s*([A-Z][A-Z0-9_]*):\s*(\d+)/gm)) EnemyType[m[1]] = +m[2];
const typeNames = new Set(Object.keys(EnemyType));
// The pickup ids main.js's collect switch handles (NON_WEAPON_COLORS + pods).
const msrc = readFileSync(new URL('../toko-drop/js/main.js', import.meta.url), 'utf8');
const nw = msrc.match(/const NON_WEAPON_COLORS = \{([^}]*)\}/);
const pods = msrc.match(/const WEAPON_PODS = \{([\s\S]*?)\n\};/);
const pickupIds = new Set([
  ...[...(nw?.[1] ?? '').matchAll(/(\w+):/g)].map(m => m[1]),
  ...[...(pods?.[1] ?? '').matchAll(/^\s*(\w+):/gm)].map(m => m[1]),
]);
const ctx = { typeNames, pickupIds };

let checks = 0, fails = 0;
const ok = (name, cond, extra = '') => { checks++; if (!cond) { fails++; console.error(`✘ ${name} ${extra}`); } };

ok('EnemyType parsed from source', typeNames.size >= 30, `(${typeNames.size})`);
ok('pickup ids parsed from source', pickupIds.has('hp') && pickupIds.has('S'), [...pickupIds].join(','));

// ── the example level ──────────────────────────────────────────────────
const ex = L.EXAMPLE_LEVEL;
const exErrs = L.validate(ex, ctx);
ok('example level validates', exErrs.length === 0, exErrs.join('; '));
ok('example level has enemies AND a pickup',
   ex.spawns.some(s => s.kind === 'pickup') && ex.spawns.some(s => !s.kind));

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

// play-from-here: earlier spawns are DROPPED, later ones shift, nothing fires early
const from = 12.3;
const c1 = L.compile(ex, EnemyType, from);
const later = ex.spawns.filter(s => s.t >= from - 1e-6);
ok('play-from-here keeps exactly the later spawns', c1.length === later.length, `${c1.length} vs ${later.length}`);
ok('play-from-here shifts delays by fromT', c1.every((s, i) => Math.abs(s.delay - (later.sort((a, b) => a.t - b.t)[i].t - from)) < 1e-6));
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
  const bad = L.validate({ ...lv, spawns: [{ t: 1.25, type: 'GLOBBO', px: 0, pz: 0 }] }, ctx);
  ok('validate rejects an off-grid t', bad.some(e => /off the 0.1s grid/.test(e)), bad.join('; '));
}

// ── validation catches what a hand-edited file gets wrong ──────────────
{
  const v = o => L.validate({ ...L.newLevel('X'), ...o }, ctx);
  ok('rejects unknown enemy', v({ spawns: [{ t: 0, type: 'NOPE', px: 0, pz: 0 }] }).length === 1);
  ok('rejects unknown pickup', v({ spawns: [{ t: 0, kind: 'pickup', id: 'gold', px: 0, pz: 0 }] }).length === 1);
  ok('rejects missing position', v({ spawns: [{ t: 0, type: 'GLOBBO' }] }).length === 1);
  ok('rejects a spawn past the end', v({ duration: 10, spawns: [{ t: 11, type: 'GLOBBO', px: 0, pz: 0 }] }).length === 1);
  ok('rejects a bad mode', v({ rules: { mode: 'chaos' } }).length === 1);
  ok('rejects an unknown named arena', v({ arena: 'hexagon' }).length === 1);
  ok('accepts an explicit rect arena', v({ arena: { halfX: 9, halfZ: 9 } }).length === 0);
  ok('rejects a tiny arena', v({ arena: { halfX: 1, halfZ: 9 } }).length === 1);
  ok('rejects a wrong format', v({ format: 2 }).length === 1);
  ok('a fresh level is valid', v({}).length === 0);
}

// ── serialize / parse round-trip, byte for byte ────────────────────────
{
  const s1 = L.serialize(ex);
  const back = L.parse(s1, ctx);
  const s2 = L.serialize(back);
  ok('serialize → parse → serialize is byte-identical', s1 === s2);
  ok('serialize puts one spawn per line', s1.split('\n').filter(l => /^\s{4}\{/.test(l)).length === ex.spawns.length);
  ok('serialize omits defaulted multipliers', !/"speedMult": ?1[,}]/.test(s1) && /"speedMult":1\.1/.test(s1));
  ok('parse rejects an invalid file', (() => { try { L.parse('{"format":1,"name":"x","duration":5,"spawns":[{"t":0,"type":"NOPE","px":0,"pz":0}]}', ctx); return false; } catch (e) { return /NOPE/.test(e.message); } })());
  ok('parse fills defaults for a bare file', (() => { const l = L.parse('{"format":1,"name":"bare","duration":5,"spawns":[]}', ctx); return l.arena === 'auto' && l.rules.mode === 'guns' && l.id === 'bare'; })());
}

// ── editing helpers ────────────────────────────────────────────────────
{
  const lv = L.newLevel('EDIT');
  const a = L.addSpawn(lv, { t: 5, type: 'GLOBBO', px: 0, pz: 0 });
  const b = L.addSpawn(lv, { t: 2, type: 'GLOBBO', px: 1, pz: 1 });
  ok('addSpawn keeps the list sorted', lv.spawns[0].t === 2 && lv.spawns[1].t === 5 && b === 0 && a === 0 /* a was index 0 at insert time */);
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
console.log('✔ the level format holds');
