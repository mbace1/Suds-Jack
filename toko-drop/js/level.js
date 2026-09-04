// level.js — an AUTHORED level: a shape to stand in and a timeline of spawns.
//
// v237 (P1 of LEVEL_EDITOR_DESIGN.md §7). The spawn pipeline was already an
// authored-timeline data structure — main.js pumps `pendingSpawns` by delay
// and honours an explicit `px`/`pz` on each entry — so a level is just a file
// that writes those entries instead of getEnemySchedule() rolling them. This
// module turns the file into the two things the game consumes: an Arena shape
// (js/arena.js) and a sorted schedule in exactly the pump's shape.
//
// Deliberately PURE, like arena.js: no three.js, no DOM, no rng, no clock.
// scripts/level-check.mjs runs it in bare node over every file in levels/.
//
// THE FORMAT IS A CONTRACT WITH THE GODOT PORT. That build loads the same
// JSON directly (its Q-032), so validation here is STRICT: an unknown key is
// an error, not a skip. Eeri's exporter silently dropped two part types for
// two versions because a translation layer let unknown fields fall through;
// this format refuses to have a translation layer at all.
//
// Format 1 (LEVEL_EDITOR_DESIGN.md §4):
//   {
//     "format": 1, "id": "first-light", "name": "FIRST LIGHT",
//     "arena": { "combine": "union"|"intersect"?, "shapes": [ shape, ... ] },
//     "duration": 45.0,
//     "spawns": [ { "t": 0.0, "type": "GLOBBO", "px": -6, "pz": -8,
//                   "speedMult"?: 1, "intervalMult"?: 1 }, ... ],
//     "rules": { "mode": "arcade", "outside": "push" }
//   }
//   shape: { "kind": "rect", "hx": 19, "hz": 11 }
//        | { "kind": "circle", "c": [x, z], "r": 8 }
//   `t` is seconds, authored at 0.1 s, and becomes `delay` verbatim. `type`
//   is a NAME, never the numeric EnemyType value — those are positional and a
//   saved level must not break when the enum grows. Positions are world xz.
//
// Not in format 1 (rejected, by name, so a file cannot half-work): moving
// shapes (`move`, upstream P3 — the owner's rule for a body left outside is
// PUSH along the SDF gradient, which is arena.js's clamp() already) and
// pickups (`kind: "pickup"`, P2). Adding either is a format bump.

import { Arena, rectShape, circleShape, unionShape, intersectShape } from './arena.js?v=192';

export const LEVEL_FORMAT = 1;
// The floor draws the region from a fixed array of shape slots on both render
// paths (main.js FLOOR_FRAG / makeFloorMat, TUNING.arena.shapeSlots). A level
// cannot name more shapes than the floor can draw — a level that plays but
// paints the wrong region is worse than one that refuses to load.
export const MAX_SHAPES = 4;

const TOP_KEYS    = new Set(['format', 'id', 'name', 'arena', 'duration', 'spawns', 'rules']);
const ARENA_KEYS  = new Set(['combine', 'shapes']);
const RECT_KEYS   = new Set(['kind', 'hx', 'hz']);
const CIRCLE_KEYS = new Set(['kind', 'c', 'r']);
const SPAWN_KEYS  = new Set(['t', 'type', 'px', 'pz', 'speedMult', 'intervalMult']);
const RULE_KEYS   = new Set(['mode', 'outside']);
const MODES       = new Set(['arcade']);
const OUTSIDE     = new Set(['push']);

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function unknownKeys(obj, allowed, where, errs) {
  for (const k of Object.keys(obj)) if (!allowed.has(k)) errs.push(`${where}: unknown key "${k}"`);
}

// Every problem in the file, as text — not just the first. An editor wants
// the whole list; so does a human reading a gate's output.
export function validateLevel(json, typeNames) {
  const errs = [];
  if (!json || typeof json !== 'object' || Array.isArray(json)) return ['level: not an object'];
  unknownKeys(json, TOP_KEYS, 'level', errs);
  if (json.format !== LEVEL_FORMAT) errs.push(`level: format must be ${LEVEL_FORMAT}, got ${JSON.stringify(json.format)}`);
  if (typeof json.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(json.id)) errs.push('level: id must be a lowercase slug');
  if (typeof json.name !== 'string' || !json.name.length) errs.push('level: name must be a non-empty string');
  if (!isNum(json.duration) || json.duration <= 0) errs.push('level: duration must be a positive number of seconds');

  const A = json.arena;
  if (!A || typeof A !== 'object') errs.push('arena: missing');
  else {
    unknownKeys(A, ARENA_KEYS, 'arena', errs);
    if (A.combine !== undefined && A.combine !== 'union' && A.combine !== 'intersect') errs.push(`arena: combine must be "union" or "intersect"`);
    if (!Array.isArray(A.shapes) || A.shapes.length === 0) errs.push('arena: shapes must be a non-empty array');
    else {
      if (A.shapes.length > 1 && A.combine === undefined) errs.push('arena: several shapes need a combine');
      if (A.shapes.length > MAX_SHAPES) errs.push(`arena: at most ${MAX_SHAPES} shapes (the floor draws that many)`);
      A.shapes.forEach((s, i) => {
        const w = `arena.shapes[${i}]`;
        if (!s || typeof s !== 'object') { errs.push(`${w}: not an object`); return; }
        if (s.kind === 'rect') {
          unknownKeys(s, RECT_KEYS, w, errs);
          if (!isNum(s.hx) || s.hx <= 0 || !isNum(s.hz) || s.hz <= 0) errs.push(`${w}: rect needs positive hx and hz`);
        } else if (s.kind === 'circle') {
          unknownKeys(s, CIRCLE_KEYS, w, errs);
          if (!Array.isArray(s.c) || s.c.length !== 2 || !s.c.every(isNum)) errs.push(`${w}: circle needs c: [x, z]`);
          if (!isNum(s.r) || s.r <= 0) errs.push(`${w}: circle needs a positive r`);
        } else {
          errs.push(`${w}: unknown kind ${JSON.stringify(s.kind)} (format ${LEVEL_FORMAT} knows rect, circle)`);
        }
        if ('move' in s) errs.push(`${w}: "move" is not in format ${LEVEL_FORMAT} (moving shapes are upstream P3)`);
      });
    }
  }

  const S = json.spawns;
  if (!Array.isArray(S)) errs.push('spawns: must be an array');
  else {
    const names = new Set(typeNames);
    let prevT = -Infinity;
    S.forEach((s, i) => {
      const w = `spawns[${i}]`;
      if (!s || typeof s !== 'object') { errs.push(`${w}: not an object`); return; }
      if ('kind' in s) errs.push(`${w}: "kind" is not in format ${LEVEL_FORMAT} (pickups are P2); every spawn is an enemy`);
      unknownKeys(s, SPAWN_KEYS, w, errs);
      if (!isNum(s.t) || s.t < 0) errs.push(`${w}: t must be a non-negative number of seconds`);
      else {
        if (Math.abs(s.t * 10 - Math.round(s.t * 10)) > 1e-9) errs.push(`${w}: t=${s.t} is not on the 0.1 s grid`);
        if (s.t < prevT) errs.push(`${w}: t=${s.t} is earlier than the previous spawn (${prevT}) — author in order`);
        prevT = s.t;
        if (isNum(json.duration) && s.t > json.duration) errs.push(`${w}: t=${s.t} is past the level's duration (${json.duration})`);
      }
      if (typeof s.type !== 'string' || !names.has(s.type)) errs.push(`${w}: unknown enemy type ${JSON.stringify(s.type)}`);
      if (!isNum(s.px) || !isNum(s.pz)) errs.push(`${w}: px and pz are required (an authored level places every body)`);
      if (s.speedMult !== undefined && (!isNum(s.speedMult) || s.speedMult <= 0)) errs.push(`${w}: speedMult must be a positive number`);
      if (s.intervalMult !== undefined && (!isNum(s.intervalMult) || s.intervalMult <= 0)) errs.push(`${w}: intervalMult must be a positive number`);
    });
    if (S.length === 0) errs.push('spawns: a level with nothing in it is not a level');
  }

  const R = json.rules;
  if (!R || typeof R !== 'object') errs.push('rules: missing');
  else {
    unknownKeys(R, RULE_KEYS, 'rules', errs);
    if (!MODES.has(R.mode)) errs.push(`rules: mode must be one of ${[...MODES].join(', ')}`);
    if (R.outside !== undefined && !OUTSIDE.has(R.outside)) errs.push(`rules: outside must be one of ${[...OUTSIDE].join(', ')} (owner decision 2026-09-04: push)`);
  }
  return errs;
}

export function shapeFromSpec(spec) {
  if (spec.kind === 'rect')   return rectShape(spec.hx, spec.hz);
  if (spec.kind === 'circle') return circleShape(spec.c[0], spec.c[1], spec.r);
  throw new Error(`unknown shape kind ${JSON.stringify(spec.kind)}`);
}

export function arenaShapeFromLevel(json) {
  const parts = json.arena.shapes.map(shapeFromSpec);
  if (parts.length === 1) return parts[0];
  return json.arena.combine === 'union' ? unionShape(...parts) : intersectShape(...parts);
}

// Validates, then builds. Throws with every error listed, so a bad file is
// loud once rather than wrong quietly. `typeNames` is Object.keys(EnemyType)
// — passed in, because enemy.js pulls three.js and this file must not.
export function parseLevel(json, typeNames) {
  const errs = validateLevel(json, typeNames);
  if (errs.length) throw new Error(`level ${JSON.stringify(json && json.id)}:\n  ` + errs.join('\n  '));
  const shape = arenaShapeFromLevel(json);
  const probe = new Arena(shape);
  // A static shape must have somewhere to stand at t=0, or the level is a
  // wall. Checked at the origin (where the player starts) and, failing that,
  // on a coarse grid — a level whose region misses every sample is refused.
  if (!probe.contains(0, 0, 0.5)) {
    let ok = false;
    for (let x = -probe.halfX; x <= probe.halfX && !ok; x += 1) {
      for (let z = -probe.halfZ; z <= probe.halfZ && !ok; z += 1) ok = probe.contains(x, z, 0.5);
    }
    if (!ok) throw new Error(`level ${json.id}: the arena has nowhere to stand`);
  }
  for (const [i, s] of json.spawns.entries()) {
    if (!probe.contains(s.px, s.pz, 0)) throw new Error(`level ${json.id}: spawns[${i}] (${s.px}, ${s.pz}) is outside the arena`);
  }
  return {
    format: json.format,
    id: json.id,
    name: json.name,
    duration: json.duration,
    arena: { shape, halfX: probe.halfX, halfZ: probe.halfZ },
    spawns: json.spawns.map(s => ({
      t: s.t, type: s.type, px: s.px, pz: s.pz,
      speedMult: s.speedMult ?? 1, intervalMult: s.intervalMult ?? 1,
    })),
    rules: { mode: json.rules.mode, outside: json.rules.outside ?? 'push' },
  };
}

// The pump's shape, entry for entry (main.js spawnWave() → pendingSpawns):
// `delay` compared against waveTimer, `px`/`pz` honoured over the ring. No
// rng anywhere — the same file yields the same schedule, every time, which
// is what lets the Godot port and this build be gated against each other.
// `shooterNames` is TUNING.waves.shooters, so a tactical body keeps its
// entrance ping (v120) in an authored level too.
export function scheduleFromLevel(level, EnemyType, shooterNames = []) {
  const shooters = new Set(shooterNames);
  const entries = level.spawns.map((s, i) => ({
    type: EnemyType[s.type],
    delay: s.t,
    angle: 0,                 // unused: px/pz override the ring in the pump
    px: s.px, pz: s.pz,
    door: undefined,
    shooter: shooters.has(s.type),
    clusterOffset: null,
    speedMult: s.speedMult,
    intervalMult: s.intervalMult,
    boss: false, elite: false, elitelite: false, affix: null,
    _order: i,                // stable sort key: authored order wins ties
  }));
  entries.sort((a, b) => (a.delay - b.delay) || (a._order - b._order));
  for (const e of entries) delete e._order;
  return entries;
}
