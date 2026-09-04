#!/usr/bin/env node
// level-check.mjs — P1's bare-node gate: every file in toko-drop/levels/ is a
// level the game (and the Godot port) can load, and the schedule it yields is
// the pump's shape, in order, deterministic.
//
// Bare node, no browser, no GPU. Run on every edit to a level file or to
// js/level.js. The browser half of P1's gate — that the level actually PLAYS
// and its spawns land where and when authored — is scripts/level-smoke.sh.
//
// The enemy type names come from enemy.js's source text rather than an
// import: enemy.js pulls three.js, and this gate must stay free of it.

import { readFileSync, readdirSync } from 'node:fs';
import { parseLevel, validateLevel, scheduleFromLevel, LEVEL_FORMAT } from '../toko-drop/js/level.js';
import { TUNING } from '../toko-drop/js/tuning.js';

let checks = 0, fails = 0;
const ok = (name, cond) => { checks++; if (!cond) { fails++; console.error(`✘ ${name}`); } };

const enemySrc = readFileSync(new URL('../toko-drop/js/enemy.js', import.meta.url), 'utf8');
const enumBody = enemySrc.match(/export const EnemyType = \{([\s\S]*?)\n\};/);
ok('EnemyType enum found in enemy.js', !!enumBody);
const typeNames = [...enumBody[1].matchAll(/^\s*([A-Z_][A-Z0-9_]*)\s*:\s*\d+/gm)].map(m => m[1]);
ok(`EnemyType has a plausible number of names (${typeNames.length})`, typeNames.length >= 20);
// A stand-in for the real enum with the same names: the schedule only needs
// name → id, and the ids' actual values are irrelevant to this gate.
const EnemyType = Object.fromEntries(typeNames.map((n, i) => [n, i]));

const dir = new URL('../toko-drop/levels/', import.meta.url);
const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
ok('at least one level exists', files.length > 0);

for (const f of files) {
  const tag = `levels/${f}`;
  const json = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  const errs = validateLevel(json, typeNames);
  ok(`${tag}: validates clean`, errs.length === 0);
  for (const e of errs) console.error(`    ${e}`);
  if (errs.length) continue;
  ok(`${tag}: id matches its file name`, json.id === f.replace(/\.json$/, ''));
  ok(`${tag}: format is ${LEVEL_FORMAT}`, json.format === LEVEL_FORMAT);

  let level;
  try { level = parseLevel(json, typeNames); } catch (e) { ok(`${tag}: parses (${e.message})`, false); continue; }
  ok(`${tag}: the player's start (0, 0) is inside the arena`, level.arena.shape.sdf(0, 0) < 0);
  ok(`${tag}: aabb is positive`, level.arena.halfX > 0 && level.arena.halfZ > 0);

  const sched = scheduleFromLevel(level, EnemyType, TUNING.waves.shooters);
  ok(`${tag}: one schedule entry per spawn`, sched.length === level.spawns.length);
  ok(`${tag}: schedule is sorted by delay`, sched.every((e, i) => i === 0 || sched[i - 1].delay <= e.delay));
  ok(`${tag}: every entry carries px/pz (the pump prefers them over the ring)`, sched.every(e => Number.isFinite(e.px) && Number.isFinite(e.pz)));
  ok(`${tag}: every entry resolves to an enemy id`, sched.every(e => Number.isInteger(e.type)));
  ok(`${tag}: no entry is a boss/elite (format ${LEVEL_FORMAT} has no such field)`, sched.every(e => !e.boss && !e.elite && !e.elitelite && e.affix === null));
  ok(`${tag}: last spawn is inside the duration`, sched[sched.length - 1].delay <= level.duration);
  // Determinism: no rng, no clock — the same file yields the same schedule.
  const again = scheduleFromLevel(level, EnemyType, TUNING.waves.shooters);
  ok(`${tag}: schedule is deterministic`, JSON.stringify(sched) === JSON.stringify(again));
  // Shooters keep their entrance ping in an authored level (v120).
  const shooterNames = new Set(TUNING.waves.shooters);
  // spawns are validated in authored order and the sort is stable, so
  // sched[i] IS level.spawns[i].
  ok(`${tag}: shooter flag follows TUNING.waves.shooters`,
    sched.every((e, i) => e.shooter === shooterNames.has(level.spawns[i].type)));
}

// The validator must be able to FAIL — a gate that passes everything is not a
// gate. Each of these is one real mistake an editor or a hand could make.
{
  const base = JSON.parse(readFileSync(new URL(files[0], dir), 'utf8'));
  const mut = (f) => { const j = JSON.parse(JSON.stringify(base)); f(j); return validateLevel(j, typeNames); };
  ok('rejects a wrong format number', mut(j => { j.format = 2; }).length > 0);
  ok('rejects an unknown top-level key', mut(j => { j.bonus = true; }).length > 0);
  ok('rejects an unknown spawn key', mut(j => { j.spawns[0].hp = 9; }).length > 0);
  ok('rejects a numeric enemy type (names only)', mut(j => { j.spawns[0].type = 0; }).length > 0);
  ok('rejects an unknown enemy name', mut(j => { j.spawns[0].type = 'GLOBBO_XL'; }).length > 0);
  ok('rejects a spawn off the 0.1 s grid', mut(j => { j.spawns[0].t = 0.05; }).length > 0);
  ok('rejects spawns authored out of order', mut(j => { j.spawns[1].t = 0; j.spawns[0].t = 5; }).length > 0);
  ok('rejects a spawn past the duration', mut(j => { j.spawns[j.spawns.length - 1].t = j.duration + 10; }).length > 0);
  ok('rejects a spawn without a position', mut(j => { delete j.spawns[0].px; }).length > 0);
  ok('rejects a moving shape (P3, not format 1)', mut(j => { j.arena.shapes[0].move = { kind: 'orbit' }; }).length > 0);
  ok('rejects a pickup entry (P2, not format 1)', mut(j => { j.spawns.push({ t: 1, kind: 'pickup', id: 'firerate', px: 0, pz: 0 }); }).length > 0);
  ok('rejects an unknown rules.mode', mut(j => { j.rules.mode = 'rush'; }).length > 0);
  ok('rejects rules.outside other than push', mut(j => { j.rules.outside = 'death'; }).length > 0);
  ok('rejects several shapes with no combine', mut(j => { j.arena.shapes.push({ kind: 'circle', c: [0, 0], r: 5 }); }).length > 0);
  // And parseLevel refuses a spawn outside the arena even when the file is well-formed.
  const outside = JSON.parse(JSON.stringify(base)); outside.spawns[0].px = 999;
  let threw = false; try { parseLevel(outside, typeNames); } catch { threw = true; }
  ok('parseLevel refuses a spawn outside the arena', threw);
  // The three-circle worked example from the design doc parses as a shape.
  const tri = JSON.parse(JSON.stringify(base));
  tri.arena = { combine: 'intersect', shapes: [
    { kind: 'circle', c: [-3, 0], r: 8 }, { kind: 'circle', c: [3, 0], r: 8 }, { kind: 'circle', c: [0, 3], r: 8 } ] };
  tri.spawns = [{ t: 0, type: 'GLOBBO', px: 0, pz: 0 }];
  let triLevel = null; try { triLevel = parseLevel(tri, typeNames); } catch (e) { console.error('    ' + e.message); }
  ok('the design doc\'s three-circle intersection parses to a standable shape', !!triLevel && triLevel.arena.shape.sdf(0, 0) < 0 && triLevel.arena.shape.sdf(9, 0) > 0);
}

console.log(`${checks - fails}/${checks} level checks passed`);
if (fails) { console.error(`✘ ${fails} FAILED`); process.exit(1); }
console.log('✔ every level loads, schedules in order, and the validator can say no');
