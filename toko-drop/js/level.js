// level.js — an authored Toko Drop level: the format, its validation, and the
// compile step that turns it into what the game's spawn pump already eats.
//
// v237 shipped the editor and this format; v239 UNIFIED it with the Godot
// port's loader (toko-drop-godot `scripts/level.gd`, Q-032). There were two
// "format 1"s for a day — this one, written by the editor, and PR #447's,
// written for the port — and a level file that one build refuses is the
// exact failure a shared format exists to prevent. This is the union, and
// BOTH loaders now accept every clause of it:
//
//   {
//     "format": 1, "id": "first-light", "name": "FIRST LIGHT",
//     "arena": "auto" | "portrait" | "landscape" | "room"
//            | { "combine"?: "union"|"intersect", "shapes": [ shape, … ] },
//     "duration": 45.0,
//     "rules": { "mode": "arcade"|"melee"|"rush", "outside"?: "push" },
//     "spawns": [
//       { "t": 0.0, "type": "GLOBBO", "px": -6, "pz": -8,
//         "speedMult"?: 1, "intervalMult"?: 1, "boss"?: true, "elite"?: true },
//       { "t": 7.5, "kind": "pickup", "id": "firerate", "px": 0, "pz": 0, "life"?: 12 }
//     ]
//   }
//   shape: { "kind": "rect", "hx": 19, "hz": 11 } | { "kind": "circle", "c": [x, z], "r": 8 }
//
// Rules the format keeps on purpose:
//   - `t` is seconds on a 0.1s grid (STEP) and becomes `delay`. Spawns are
//     authored IN ORDER; a file out of order is refused, not sorted.
//   - `type` is a NAME ("GLOBBO"), never the numeric EnemyType value: those
//     are positional, and a saved level must survive the enum growing.
//   - Validation is STRICT: an unknown key anywhere is an error, not a skip.
//     Eeri's exporter silently dropped two part types for two versions because
//     a translation layer let unknown fields through; this format has none.
//   - A named arena is one of the game's own rectangles; a shape object is an
//     SDF built on arena.js (rect, circle, union, intersect — MAX_SHAPES of
//     them, the floor's slot count). "auto" follows the viewport, which is
//     what the game itself does.
//   - `px`/`pz` are world units and must be INSIDE the region; the loader
//     refuses a body placed outside, and a region with nowhere to stand.
//   - A build that lacks a thing REFUSES the level by name (the port has no
//     CLOSE COMBAT, so it refuses `mode: "melee"`) rather than half-playing it.
//   - Nothing here reads Math.random() or a clock.
//
// This module is PURE — no three.js, no DOM — so it runs in bare node
// (scripts/level-check.mjs). Enemy names are resolved against an EnemyType
// map the caller passes in, because enemy.js imports three and cannot load here.

import { Arena, rectShape, circleShape, unionShape, intersectShape } from './arena.js?v=193';

export const FORMAT = 1;
export const STEP = 0.1;
export const MODES = ['arcade', 'melee', 'rush'];
export const OUTSIDE = ['push'];
// The floor will draw the region from a fixed array of shape slots; a level
// may not name more shapes than that (the port's level.gd shares the number).
export const MAX_SHAPES = 4;
// Named rectangles the RULES menu offers. null = follow the viewport.
export const ARENAS = {
  auto:      null,
  portrait:  { halfX: 11, halfZ: 18 },
  landscape: { halfX: 19, halfZ: 11 },
  room:      { halfX: 15, halfZ: 11 },
};
// Levels that ship in toko-drop/levels/ — the editor's LOAD lists them and
// ?level=<id> plays one. The port syncs these same files (tools/sync-levels.sh).
export const BUNDLED = ['first-light', 'three-rings'];

const TOP_KEYS    = new Set(['format', 'id', 'name', 'arena', 'duration', 'spawns', 'rules']);
const ARENA_KEYS  = new Set(['combine', 'shapes']);
const RECT_KEYS   = new Set(['kind', 'hx', 'hz']);
const CIRCLE_KEYS = new Set(['kind', 'c', 'r']);
const ENEMY_KEYS  = new Set(['t', 'type', 'px', 'pz', 'speedMult', 'intervalMult', 'boss', 'elite']);
const PICKUP_KEYS = new Set(['t', 'kind', 'id', 'px', 'pz', 'life']);
const RULE_KEYS   = new Set(['mode', 'outside']);
const ID_RE = /^[a-z0-9][a-z0-9-]*$/;

const isNum = v => typeof v === 'number' && Number.isFinite(v);
const onGrid = t => Math.abs(t * 10 - Math.round(t * 10)) < 1e-9;

export function quantize(t) { return Math.round(Math.max(0, t) / STEP) * STEP; }
// 0.30000000000000004 → "0.3": every t that leaves this module is one decimal.
export function fmtT(t) { return (Math.round(t * 10) / 10).toFixed(1); }

export function slugify(name) {
  return String(name || 'level').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'level';
}

export function newLevel(name = 'UNTITLED') {
  return {
    format: FORMAT,
    id: slugify(name),
    name,
    arena: 'auto',
    duration: 60,
    spawns: [],
    rules: { mode: 'arcade' },
  };
}

// ── Validation ────────────────────────────────────────────────────────────
// Returns a list of human-readable problems; empty means the level is sound.
// `typeNames` and `pickupIds` are Sets the caller derives from the game.
// The clauses are the port's level.gd's, one for one.
function unknownKeys(obj, allowed, where, errs) {
  for (const k of Object.keys(obj)) if (!allowed.has(k)) errs.push(`${where}: unknown key "${k}"`);
}

export function validate(level, { typeNames, pickupIds }) {
  const errs = [];
  if (!level || typeof level !== 'object' || Array.isArray(level)) return ['level: not an object'];
  unknownKeys(level, TOP_KEYS, 'level', errs);
  if (level.format !== FORMAT) errs.push(`level: format must be ${FORMAT}`);
  if (typeof level.id !== 'string' || !ID_RE.test(level.id)) errs.push('level: id must be a lowercase slug');
  if (typeof level.name !== 'string' || !level.name.trim()) errs.push('level: name must be a non-empty string');
  if (!(isNum(level.duration) && level.duration > 0 && level.duration <= 3600))
    errs.push('level: duration must be a positive number of seconds (at most 3600)');

  const A = level.arena;
  if (typeof A === 'string') {
    if (!(A in ARENAS)) errs.push(`arena: "${A}" is not one of ${Object.keys(ARENAS).join(', ')}`);
  } else if (A && typeof A === 'object' && !Array.isArray(A)) {
    unknownKeys(A, ARENA_KEYS, 'arena', errs);
    if (A.combine !== undefined && A.combine !== 'union' && A.combine !== 'intersect')
      errs.push('arena: combine must be "union" or "intersect"');
    const shapes = A.shapes;
    if (!Array.isArray(shapes) || shapes.length === 0) errs.push('arena: shapes must be a non-empty array');
    else {
      if (shapes.length > 1 && A.combine === undefined) errs.push('arena: several shapes need a combine');
      if (shapes.length > MAX_SHAPES) errs.push(`arena: at most ${MAX_SHAPES} shapes (the floor draws that many)`);
      shapes.forEach((s, i) => {
        const w = `arena.shapes[${i}]`;
        if (!s || typeof s !== 'object') { errs.push(`${w}: not an object`); return; }
        if (s.kind === 'rect') {
          unknownKeys(s, RECT_KEYS, w, errs);
          if (!(isNum(s.hx) && s.hx > 0 && isNum(s.hz) && s.hz > 0)) errs.push(`${w}: rect needs positive hx and hz`);
        } else if (s.kind === 'circle') {
          unknownKeys(s, CIRCLE_KEYS, w, errs);
          if (!(Array.isArray(s.c) && s.c.length === 2 && isNum(s.c[0]) && isNum(s.c[1]))) errs.push(`${w}: circle needs c: [x, z]`);
          if (!(isNum(s.r) && s.r > 0)) errs.push(`${w}: circle needs a positive r`);
        } else errs.push(`${w}: unknown kind ${JSON.stringify(s.kind)} (format ${FORMAT} knows rect, circle)`);
        if ('move' in s) errs.push(`${w}: "move" is not in format ${FORMAT} (moving shapes are P3)`);
      });
    }
  } else errs.push('arena: must be a named arena or { shapes: [...] }');

  const R = level.rules;
  if (!R || typeof R !== 'object') errs.push('rules: missing');
  else {
    unknownKeys(R, RULE_KEYS, 'rules', errs);
    if (!MODES.includes(R.mode)) errs.push(`rules: mode must be one of ${MODES.join(', ')}`);
    if (R.outside !== undefined && !OUTSIDE.includes(R.outside)) errs.push(`rules: outside must be one of ${OUTSIDE.join(', ')}`);
  }

  const S = level.spawns;
  if (!Array.isArray(S)) { errs.push('spawns: must be an array'); return errs; }
  let prevT = -Infinity;
  S.forEach((s, i) => {
    const w = `spawns[${i}]`;
    if (!s || typeof s !== 'object') { errs.push(`${w}: not an object`); return; }
    const isPickup = s.kind === 'pickup';
    if ('kind' in s && !isPickup) errs.push(`${w}: kind must be "pickup" (an enemy spawn has no kind)`);
    unknownKeys(s, isPickup ? PICKUP_KEYS : ENEMY_KEYS, w, errs);
    if (!(isNum(s.t) && s.t >= 0)) errs.push(`${w}: t must be a non-negative number of seconds`);
    else {
      if (!onGrid(s.t)) errs.push(`${w}: t=${s.t} is not on the ${STEP}s grid`);
      if (s.t < prevT) errs.push(`${w}: t=${s.t} is earlier than the previous spawn (${prevT}) — author in order`);
      prevT = s.t;
      if (isNum(level.duration) && s.t > level.duration) errs.push(`${w}: t=${s.t} is past the level's duration (${level.duration})`);
    }
    if (!(isNum(s.px) && isNum(s.pz))) errs.push(`${w}: px and pz are required (an authored level places every body)`);
    if (isPickup) {
      if (!pickupIds.has(s.id)) errs.push(`${w}: unknown pickup ${JSON.stringify(s.id)}`);
      if (s.life !== undefined && !(isNum(s.life) && s.life > 0)) errs.push(`${w}: life must be a positive number of seconds`);
    } else {
      if (typeof s.type !== 'string' || !typeNames.has(s.type)) errs.push(`${w}: unknown enemy type ${JSON.stringify(s.type)}`);
      for (const k of ['speedMult', 'intervalMult']) {
        if (s[k] !== undefined && !(isNum(s[k]) && s[k] > 0 && s[k] <= 5)) errs.push(`${w}: ${k} must be a positive number`);
      }
      for (const k of ['boss', 'elite']) if (s[k] !== undefined && s[k] !== true) errs.push(`${w}: ${k} is true or absent`);
    }
  });
  if (S.length === 0) errs.push('spawns: a level with nothing in it is not a level');
  return errs;
}

// ── The region ────────────────────────────────────────────────────────────
export function shapeFromSpec(spec) {
  if (spec.kind === 'rect') return rectShape(spec.hx, spec.hz);
  return circleShape(spec.c[0], spec.c[1], spec.r);
}
// The level's playable region as an arena.js shape, or null for "auto"
// (the game's viewport-driven rectangle). `defaults` names the rectangles.
export function arenaShape(level, arenas = ARENAS) {
  const A = level.arena ?? 'auto';
  if (typeof A === 'string') {
    const r = arenas[A];
    return r ? rectShape(r.halfX, r.halfZ) : null;
  }
  // A malformed arena is validate()'s to report; here it is simply no shape.
  if (!A || !Array.isArray(A.shapes) || A.shapes.length === 0 ||
      !A.shapes.every(sh => sh && (sh.kind === 'rect' ? isNum(sh.hx) && isNum(sh.hz)
                                   : sh.kind === 'circle' && Array.isArray(sh.c) && sh.c.length === 2 && isNum(sh.r)))) return null;
  const parts = A.shapes.map(shapeFromSpec);
  if (parts.length === 1) return parts[0];
  return A.combine === 'union' ? unionShape(...parts) : intersectShape(...parts);
}

// Geometry checks that need the shape built: somewhere to stand at t=0 (the
// origin, where the player starts, else a coarse grid), and every spawn
// inside the region. Returned as errors like the rest.
export function checkGeometry(level) {
  const errs = [];
  const shape = arenaShape(level);
  if (!shape) return errs;                 // "auto": the rectangle is whatever the device says
  const probe = new Arena(shape);
  if (!probe.contains(0, 0, 0.5)) {
    let ok = false;
    for (let x = -probe.halfX; x <= probe.halfX && !ok; x += 1)
      for (let z = -probe.halfZ; z <= probe.halfZ && !ok; z += 1) ok = probe.contains(x, z, 0.5);
    if (!ok) errs.push(`level ${level.id}: the arena has nowhere to stand`);
  }
  level.spawns.forEach((s, i) => {
    if (isNum(s.px) && isNum(s.pz) && !probe.contains(s.px, s.pz, 0))
      errs.push(`level ${level.id}: spawns[${i}] (${s.px}, ${s.pz}) is outside the arena`);
  });
  return errs;
}

// ── Compile ───────────────────────────────────────────────────────────────
// The level, from `fromT` seconds in, as pendingSpawns entries. Spawns before
// `fromT` are DROPPED, not fired at once: "play from here" means the level
// as it stands from this moment, and a pile of catch-up bodies on frame one
// would be a different level. Sorted by delay, ties by authoring order, so
// the pump can shift() from the front.
export function compile(level, EnemyType, fromT = 0) {
  const out = [];
  level.spawns.forEach((s, i) => {
    if (s.t < fromT - 1e-6) return;
    const delay = Math.max(0, Math.round((s.t - fromT) * 10) / 10);
    if (s.kind === 'pickup') {
      out.push({ pickup: s.id, delay, px: s.px, pz: s.pz, life: s.life ?? 12, _i: i });
      return;
    }
    const type = EnemyType[s.type];
    if (type == null) return;   // validate() names these; compile just skips
    out.push({
      type, delay, px: s.px, pz: s.pz,
      angle: 0, door: undefined, clusterOffset: null,
      shooter: false,
      speedMult: s.speedMult ?? 1, intervalMult: s.intervalMult ?? 1,
      boss: !!s.boss, elite: !!s.elite, elitelite: false, affix: null,
      authored: true, _i: i,
    });
  });
  out.sort((a, b) => a.delay - b.delay || a._i - b._i);
  for (const o of out) delete o._i;
  return out;
}

// ── Editing helpers ───────────────────────────────────────────────────────
export function addSpawn(level, spawn) {
  const s = { ...spawn, t: quantize(spawn.t), px: round2(spawn.px), pz: round2(spawn.pz) };
  level.spawns.push(s);
  level.spawns.sort((a, b) => a.t - b.t);
  return level.spawns.indexOf(s);
}
export function removeSpawn(level, idx) {
  if (idx < 0 || idx >= level.spawns.length) return;
  level.spawns.splice(idx, 1);
}
export function nudge(level, idx, dt) {
  const s = level.spawns[idx];
  if (!s) return idx;
  s.t = Math.min(level.duration, quantize(s.t + dt));
  level.spawns.sort((a, b) => a.t - b.t);
  return level.spawns.indexOf(s);
}
function round2(v) { return Math.round(v * 100) / 100; }

// ── Serialisation ─────────────────────────────────────────────────────────
// Stable key order and one spawn per line, so two exports of the same level
// are the same bytes and a diff between two levels reads as spawns.
export function serialize(level) {
  const head = {
    format: level.format, id: level.id, name: level.name,
    arena: level.arena ?? 'auto', duration: level.duration, rules: level.rules,
  };
  const lines = [...level.spawns].sort((a, b) => a.t - b.t).map(s => {
    const o = s.kind === 'pickup'
      ? { t: +fmtT(s.t), kind: 'pickup', id: s.id, px: s.px, pz: s.pz, ...(s.life != null ? { life: s.life } : {}) }
      : { t: +fmtT(s.t), type: s.type, px: s.px, pz: s.pz,
          ...(s.speedMult != null && s.speedMult !== 1 ? { speedMult: s.speedMult } : {}),
          ...(s.intervalMult != null && s.intervalMult !== 1 ? { intervalMult: s.intervalMult } : {}),
          ...(s.boss ? { boss: true } : {}), ...(s.elite ? { elite: true } : {}) };
    return '    ' + JSON.stringify(o);
  });
  const headJson = JSON.stringify(head, null, 2).replace(/\n}$/, '');
  return `${headJson},\n  "spawns": [\n${lines.join(',\n')}\n  ]\n}\n`;
}

// Text → level. Fills the defaults a hand-written file may omit, migrates the
// one field v237 spelled differently (`mode: "guns"` → "arcade"), then
// validates when given a context. Throws with every error listed.
export function parse(text, ctx) {
  const level = typeof text === 'string' ? JSON.parse(text) : text;
  if (level && typeof level === 'object') {
    if (level.arena == null) level.arena = 'auto';
    if (!level.rules) level.rules = { mode: 'arcade' };
    else if (level.rules.mode === 'guns') level.rules.mode = 'arcade';   // v237 → v239
    if (!level.id && level.name) level.id = slugify(level.name);
  }
  if (ctx) {
    const errs = [...validate(level, ctx), ...checkGeometry(level)];
    if (errs.length) throw new Error('level: ' + errs.join('; '));
  }
  return level;
}

// Half a minute that shows every verb the editor has: a trickle, a pincer, a
// pickup laid down before the pressure, a boss with an escort. Built in, so
// the editor's first LOAD has something in it offline and the gate has a fixture.
export const EXAMPLE_LEVEL = {
  format: 1, id: 'show-and-tell', name: 'SHOW AND TELL', arena: 'auto', duration: 30,
  rules: { mode: 'arcade' },
  spawns: [
    { t: 0.5,  type: 'GLOBBO', px: -6,  pz: -10 },
    { t: 0.5,  type: 'GLOBBO', px:  6,  pz: -10 },
    { t: 2.0,  type: 'GLOBBO', px:  0,  pz: -10 },
    { t: 4.0,  type: 'YELA_CUBE', px: -8, pz: 6 },
    { t: 4.0,  type: 'YELA_CUBE', px:  8, pz: 6 },
    { t: 7.5,  kind: 'pickup', id: 'firerate', px: 0, pz: 0 },
    { t: 9.0,  type: 'SPITTOR', px: -7, pz: -8 },
    { t: 9.0,  type: 'SPITTOR', px:  7, pz: -8 },
    { t: 12.0, type: 'GLOBBO', px: -9, pz: 0 },
    { t: 12.3, type: 'GLOBBO', px:  9, pz: 0 },
    { t: 12.6, type: 'GLOBBO', px:  0, pz: 10 },
    { t: 16.0, kind: 'pickup', id: 'hp', px: 4, pz: 4 },
    { t: 18.0, type: 'SPLITTA', px: 0, pz: -10, speedMult: 1.1 },
    { t: 22.0, type: 'ORANGE_CUBE', px: -8, pz: -6 },
    { t: 22.0, type: 'ORANGE_CUBE', px:  8, pz: -6 },
    { t: 25.0, type: 'TORO', px: 0, pz: -10, boss: true },
    { t: 25.5, type: 'GLOBBO', px: -5, pz: -10 },
    { t: 25.5, type: 'GLOBBO', px:  5, pz: -10 },
  ],
};
