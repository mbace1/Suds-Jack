// level.js — an authored Toko Drop level: the format, its validation, and the
// compile step that turns it into what the game's spawn pump already eats.
//
// v237 (LEVEL_EDITOR_DESIGN.md §4). The runtime contract was never designed
// for authoring, but it is exactly what authoring wants: main.js pumps
// `pendingSpawns` — `{ type, delay, px, pz, … }` — against `waveTimer`, and a
// `px`/`pz` on an entry overrides the spawn ring. So a level is a list of
// spawns with a time and a place, and "running a level" is filling that list
// by hand instead of from getEnemySchedule(). Nothing downstream can tell.
//
// This module is PURE — no three.js, no DOM, no imports — so it runs in bare
// node (scripts/level-check.mjs) and so the format has exactly one home.
// enemy names are resolved against an EnemyType map the caller passes in,
// because enemy.js imports three and cannot be loaded here.
//
// Rules the format keeps on purpose:
//   - `t` is seconds, authored on a 0.1s grid (STEP). It becomes `delay`.
//   - `type` is a NAME ("GLOBBO"), never the numeric EnemyType value: those
//     are positional, and a saved level must survive the enum growing.
//   - `px`/`pz` are world units; the game clamps a body inside the arena on
//     its first update, so an off-arena point is a mistake, not a crash.
//   - Nothing here reads Math.random() or a clock.

export const FORMAT = 1;
export const STEP = 0.1;
export const MODES = ['guns', 'melee', 'rush'];
// Named rectangles the RULES menu offers. null = follow the viewport, which
// is what the game itself does.
export const ARENAS = {
  auto:      null,
  portrait:  { halfX: 11, halfZ: 18 },
  landscape: { halfX: 19, halfZ: 11 },
  room:      { halfX: 15, halfZ: 11 },
};

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
    rules: { mode: 'guns' },
  };
}

// ── Validation ────────────────────────────────────────────────────────────
// Returns a list of human-readable problems; empty means the level is sound.
// `typeNames` and `pickupIds` are Sets the caller derives from the game.
export function validate(level, { typeNames, pickupIds }) {
  const errs = [];
  if (!level || typeof level !== 'object') return ['not an object'];
  if (level.format !== FORMAT) errs.push(`format ${level.format} (want ${FORMAT})`);
  if (typeof level.name !== 'string' || !level.name.trim()) errs.push('name missing');
  if (!(Number.isFinite(level.duration) && level.duration > 0 && level.duration <= 3600))
    errs.push(`duration ${level.duration} (want 0 < s <= 3600)`);
  if (typeof level.arena === 'string') {
    if (!(level.arena in ARENAS)) errs.push(`arena "${level.arena}" unknown`);
  } else if (level.arena && typeof level.arena === 'object') {
    if (!(level.arena.halfX > 2 && level.arena.halfZ > 2)) errs.push('arena halfX/halfZ must exceed 2');
  } else if (level.arena != null) errs.push('arena must be a name or {halfX, halfZ}');
  if (!level.rules || !MODES.includes(level.rules.mode)) errs.push(`rules.mode must be one of ${MODES.join('/')}`);
  if (!Array.isArray(level.spawns)) { errs.push('spawns must be an array'); return errs; }
  level.spawns.forEach((s, i) => {
    const at = `spawns[${i}]`;
    if (!(Number.isFinite(s.t) && s.t >= 0)) errs.push(`${at}.t ${s.t}`);
    else if (Math.abs(s.t - quantize(s.t)) > 1e-6) errs.push(`${at}.t ${s.t} is off the ${STEP}s grid`);
    else if (level.duration && s.t > level.duration) errs.push(`${at}.t ${s.t} is past the end (${level.duration})`);
    if (!(Number.isFinite(s.px) && Number.isFinite(s.pz))) errs.push(`${at} needs px and pz`);
    if (s.kind === 'pickup') {
      if (!pickupIds.has(s.id)) errs.push(`${at} pickup "${s.id}" unknown`);
    } else {
      if (!typeNames.has(s.type)) errs.push(`${at} enemy "${s.type}" unknown`);
      for (const k of ['speedMult', 'intervalMult']) {
        if (s[k] != null && !(Number.isFinite(s[k]) && s[k] > 0 && s[k] <= 5)) errs.push(`${at}.${k} ${s[k]}`);
      }
    }
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

export function parse(text, ctx) {
  const level = JSON.parse(text);
  if (level.arena == null) level.arena = 'auto';
  if (!level.rules) level.rules = { mode: 'guns' };
  if (!level.id) level.id = slugify(level.name);
  const errs = ctx ? validate(level, ctx) : [];
  if (errs.length) throw new Error('level: ' + errs.join('; '));
  level.spawns.sort((a, b) => a.t - b.t);
  return level;
}

// Half a minute that shows every verb the editor has: a trickle, a pincer, a
// pickup laid down before the pressure, a boss with an escort. Built in, so
// the editor's first LOAD has something in it and the gate has a fixture.
export const EXAMPLE_LEVEL = {
  format: 1, id: 'first-light', name: 'FIRST LIGHT', arena: 'auto', duration: 30,
  rules: { mode: 'guns' },
  spawns: [
    { t: 0.5,  type: 'GLOBBO', px: -6,  pz: -10 },
    { t: 0.5,  type: 'GLOBBO', px:  6,  pz: -10 },
    { t: 2.0,  type: 'GLOBBO', px:  0,  pz: -12 },
    { t: 4.0,  type: 'YELA_CUBE', px: -8, pz: 6 },
    { t: 4.0,  type: 'YELA_CUBE', px:  8, pz: 6 },
    { t: 7.5,  kind: 'pickup', id: 'firerate', px: 0, pz: 0 },
    { t: 9.0,  type: 'SPITTOR', px: -7, pz: -8 },
    { t: 9.0,  type: 'SPITTOR', px:  7, pz: -8 },
    { t: 12.0, type: 'GLOBBO', px: -9, pz: 0 },
    { t: 12.3, type: 'GLOBBO', px:  9, pz: 0 },
    { t: 12.6, type: 'GLOBBO', px:  0, pz: 12 },
    { t: 16.0, kind: 'pickup', id: 'hp', px: 4, pz: 4 },
    { t: 18.0, type: 'SPLITTA', px: 0, pz: -12, speedMult: 1.1 },
    { t: 22.0, type: 'ORANGE_CUBE', px: -8, pz: -6 },
    { t: 22.0, type: 'ORANGE_CUBE', px:  8, pz: -6 },
    { t: 25.0, type: 'TORO', px: 0, pz: -12, boss: true },
    { t: 25.5, type: 'GLOBBO', px: -5, pz: -12 },
    { t: 25.5, type: 'GLOBBO', px:  5, pz: -12 },
  ],
};
