// scripts/campaign-rooms.mjs — v265. Writes the campaign's world rooms to
// toko-drop/levels/<id>.json through the game's OWN serializer and validator,
// so every file is byte-identical to what the editor would save and passes
// level-check.mjs by construction.
//
//   node scripts/campaign-rooms.mjs          # write the rooms
//   node scripts/campaign-rooms.mjs --dry    # validate only
//
// A room is a hand-authored SKELETON (the beats below) plus HEAT (the DIAL
// table): mirrored echo waves, a speed ramp, faster shooters. The dials were
// tuned against two bots — see VERSIONS.md v265. It prints QUOTAS: paste those
// into TUNING.campaign.worlds, because a quota is computed from the heated
// spawn list, not chosen.
//
// The first three rooms (first-light, three-rings, boost-lane) are NOT made
// here: they are the editor's showcase and the Godot port's parity fixtures.
import { readFileSync, writeFileSync } from 'node:fs';
import * as L from '../toko-drop/js/level.js';

const ROOT = new URL('../', import.meta.url);
const src = readFileSync(new URL('toko-drop/js/enemy.js', ROOT), 'utf8');
const block = src.match(/export const EnemyType = \{([\s\S]*?)\n\};/);
const typeNames = new Set([...block[1].matchAll(/^\s*([A-Z][A-Z0-9_]*):\s*(\d+)/gm)].map(m => m[1]));
const ctx = { typeNames, pickupIds: new Set(['hp', 'score', 'S', 'B', 'L', 'R', 'G']) };

const rect = (hx, hz) => ({ shapes: [{ kind: 'rect', hx, hz }] });
const circ = (r, c = [0, 0]) => ({ shapes: [{ kind: 'circle', c, r }] });
const union = (...shapes) => ({ combine: 'union', shapes });
const inter = (...shapes) => ({ combine: 'intersect', shapes });
const R = (hx, hz) => ({ kind: 'rect', hx, hz });
const C = (r, c) => ({ kind: 'circle', c, r });
const ring = (n, r, phase = 0) => Array.from({ length: n }, (_, i) => {
  const a = phase + (i / n) * Math.PI * 2;
  return [Math.round(Math.cos(a) * r * 10) / 10, Math.round(Math.sin(a) * r * 10) / 10];
});
// a beat: at t, one type at a list of points
const beat = (t, type, pts, extra = {}) => pts.map(([px, pz]) => ({ t, type, px, pz, ...extra }));

const ROOMS = {
  // ── 2. THE WELL — the current ────────────────────────────────────────────
  'undertow': { name: 'UNDERTOW', arena: rect(19, 11), duration: 45, spawns: [
    ...beat(0, 'GLOBBO', [[-15, -7], [15, -7]]),
    ...beat(3, 'SPLITTA', [[0, -9]]),
    ...beat(6, 'WEEVA', [[-16, 5]]), ...beat(7, 'WEEVA', [[16, 5]]),
    ...beat(11, 'SLUG', [[-15, 0]]),
    ...beat(15, 'GLOBBO', [[-12, 8], [0, 9], [12, 8]]),
    ...beat(19, 'SPLITTA', [[15, -6]]),
    ...beat(23, 'RIBBON', [[-16, -6]]),
    ...beat(27, 'WEEVA', [[-10, -9], [10, -9]]),
    ...beat(31, 'SLUG', [[15, 0]]),
    ...beat(35, 'SPLITTA', [[0, 9]]), ...beat(35, 'GLOBBO', [[-16, 0], [16, 0]]),
  ] },
  'eddy': { name: 'EDDY', arena: circ(10.5), duration: 40, quota: 14, spawns: [
    ...beat(0, 'GLOBBO', ring(4, 8)),
    ...beat(2.5, 'WEEVA', ring(2, 8, Math.PI / 4)),
    ...beat(5, 'GLOBBO', ring(4, 8, Math.PI / 8)),
    ...beat(8, 'RIBBON', [[0, -8]]),
    ...beat(10, 'WEEVA', ring(2, 8, 3 * Math.PI / 4)),
    ...beat(14, 'GLOBBO', ring(3, 8, 0.3)),
    ...beat(20, 'SPLITTA', [[0, 8]]),
    ...beat(26, 'WEEVA', ring(2, 8, 1.2)),
    ...beat(32, 'RIBBON', [[0, 8]]),
  ] },
  'slug-run': { name: 'SLUG RUN', arena: rect(19, 6), duration: 40, goal: 'flawless', spawns: [
    ...beat(0, 'SLUG', [[-15, 0]]),
    ...beat(5, 'GLOBBO', [[15, -4], [15, 4]]),
    ...beat(10, 'RIBBON', [[0, -4]]),
    ...beat(15, 'SLUG', [[15, 0]]),
    ...beat(20, 'GLOBBO', [[-15, -4], [-15, 4]]),
    ...beat(25, 'RIBBON', [[0, 4]]),
    ...beat(30, 'SLUG', [[-15, 0]]),
  ] },
  // ── 3. THE VEIN — the sweep ─────────────────────────────────────────────
  'pulse': { name: 'PULSE', arena: rect(15, 11), duration: 45, spawns: [
    ...beat(0, 'GLOBBO', [[-12, -8], [12, -8]]),
    ...beat(3, 'SPITTOR', [[0, -9]]),
    ...beat(7, 'FANNER', [[-13, 6]]),
    ...beat(11, 'GLOBBO', [[-12, 8], [0, 9], [12, 8]]),
    ...beat(15, 'SPITTOR', [[13, 0]]),
    ...beat(20, 'FANNER', [[-13, -6]]), ...beat(20, 'YELA_CUBE', [[13, 6]]),
    ...beat(25, 'SPITTOR', [[-12, -8], [12, 8]]),
    ...beat(31, 'GLOBBO', [[-12, 0], [0, -9], [12, 0]]),
    ...beat(36, 'FANNER', [[0, 9]]),
  ] },
  'crossfire': { name: 'CROSSFIRE', arena: union(R(19, 5), R(6, 11)), duration: 40, quota: 15, spawns: [
    ...beat(0, 'GLOBBO', [[-16, 0], [16, 0], [0, -9], [0, 9]]),
    ...beat(2, 'YELA_CUBE', [[-12, 3], [12, -3]]),
    ...beat(4, 'SPITTOR', [[-16, 2], [16, -2]]),
    ...beat(7, 'GLOBBO', [[-14, -3], [14, 3], [-3, -8], [3, 8]]),
    ...beat(10, 'PYRA', [[0, -9]]),
    ...beat(12, 'YELA_CUBE', [[-15, 0], [15, 0]]),
    ...beat(18, 'DRAPER', [[0, 9]]),
    ...beat(24, 'GLOBBO', [[-16, 0], [16, 0]]),
    ...beat(30, 'SPITTOR', [[0, -9], [0, 9]]),
  ] },
  'clot': { name: 'CLOT', arena: circ(11), duration: 35, goal: 'flawless', spawns: [
    ...beat(0, 'GLOBBO', [[-7, 0], [7, 0]]),
    ...beat(8, 'SPITTOR', [[0, -8]]),
    ...beat(14, 'GLOBBO', [[0, -7], [0, 7]]),
    ...beat(20, 'YELA_CUBE', [[7, 0]]),
    ...beat(26, 'FANNER', [[-8, 0]]),
  ] },
  // ── 4. THE VOID — the dark breathes ────────────────────────────────────
  'lights-out': { name: 'LIGHTS OUT', arena: rect(19, 11), duration: 45, spawns: [
    ...beat(0, 'GLOBBO', [[-15, -7], [15, 7]]),
    ...beat(4, 'CLOAKER', [[15, -7]]),
    ...beat(8, 'YELA_CUBE', [[-16, 0], [16, 0]]),
    ...beat(12, 'GLOBBO', [[0, -9], [0, 9]]),
    ...beat(16, 'CLOAKER', [[-15, 7]]),
    ...beat(21, 'GLOBBO', [[-12, -8], [12, -8], [0, 9]]),
    ...beat(26, 'SIREN', [[16, 5]]),
    ...beat(30, 'CLOAKER', [[-16, -5]]),
    ...beat(34, 'YELA_CUBE', [[-8, 9], [8, 9]]),
    ...beat(38, 'GLOBBO', [[-16, 0], [16, 0]]),
  ] },
  'the-pull': { name: 'THE PULL', arena: circ(11), duration: 40, quota: 14, spawns: [
    ...beat(0, 'MAGNA', [[0, -8.5]]),
    ...beat(1, 'GLOBBO', ring(5, 8.5, 0.6)),
    ...beat(4, 'GLOBBO', ring(4, 8.5, 1.1)),
    ...beat(7, 'SPLITTA', [[0, 8.5]]),
    ...beat(9, 'MAGNA', [[8.5, 0]]),
    ...beat(11, 'GLOBBO', ring(3, 8.5, 2.0)),
    ...beat(18, 'YELA_CUBE', ring(2, 8.5, 0.2)),
    ...beat(25, 'GLOBBO', ring(3, 8.5, 1.4)),
    ...beat(32, 'SPLITTA', [[-8.5, 0]]),
  ] },
  'siren-song': { name: 'SIREN SONG', arena: inter(C(10, [-4, 0]), C(10, [4, 0])), duration: 45, spawns: [
    ...beat(0, 'GLOBBO', [[0, -8], [0, 8]]),
    ...beat(4, 'SIREN', [[0, -8]]),
    ...beat(8, 'GLOBBO', [[-5, 0], [5, 0]]),
    ...beat(13, 'TORO', [[0, 8]]),
    ...beat(18, 'GLOBBO', [[-3, -5], [3, -5], [-3, 5], [3, 5]]),
    ...beat(24, 'WARDEN', [[0, -8]]),
    ...beat(29, 'SIREN', [[0, 8]]),
    ...beat(34, 'GLOBBO', [[-5, 0], [5, 0], [0, -8]]),
    ...beat(38, 'TORO', [[0, -8]]),
  ] },
  // ── 5. THE FOAM — the slick floor ──────────────────────────────────────
  'rink': { name: 'RINK', arena: circ(11), duration: 40, spawns: [
    ...beat(0, 'YELA_CUBE', ring(2, 8.5, 0)),
    ...beat(4, 'GLOBBO', ring(3, 8.5, 1)),
    ...beat(9, 'SLUDGE_CUBE', [[0, 8.5]]),
    ...beat(13, 'YELA_CUBE', ring(3, 8.5, 0.5)),
    ...beat(19, 'GLOBBO', ring(3, 8.5, 2)),
    ...beat(25, 'SLUDGE_CUBE', ring(2, 8.5, 1.3)),
    ...beat(31, 'YELA_CUBE', ring(4, 8.5, 0.8)),
  ] },
  'skate': { name: 'SKATE', arena: rect(19, 11), duration: 40, quota: 15, spawns: [
    ...beat(0, 'GLOBBO', [[-15, -7], [15, -7], [-15, 7], [15, 7]]),
    ...beat(2, 'YELA_CUBE', [[0, -9], [0, 9]]),
    ...beat(4.5, 'GLOBBO', [[-16, 0], [16, 0], [-8, -9], [8, 9]]),
    ...beat(7, 'ORANGE_CUBE', [[-12, 8], [12, -8]]),
    ...beat(9.5, 'YELA_CUBE', [[-15, 5], [15, -5]]),
    ...beat(12, 'SPLITTA', [[0, 9]]),
    ...beat(16, 'GLOBBO', [[-12, -8], [12, 8]]),
    ...beat(22, 'ORANGE_CUBE', [[0, -9]]),
    ...beat(28, 'YELA_CUBE', [[-16, 0], [16, 0]]),
    ...beat(34, 'SPLITTA', [[0, -9]]),
  ] },
  'bubble-bath': { name: 'BUBBLE BATH', arena: union(C(8, [-5, 0]), C(8, [5, 0])), duration: 40, goal: 'flawless', spawns: [
    ...beat(0, 'GLOBBO', [[-10, 0], [10, 0]]),
    ...beat(6, 'SPLITTA', [[-5, -6]]),
    ...beat(12, 'GLOBBO', [[5, 6], [5, -6]]),
    ...beat(18, 'SPLITTA', [[5, 6]]),
    ...beat(24, 'SHEPHERD', [[-10, 0]]),
    ...beat(30, 'SPLITTA', [[10, 0]]),
  ] },
  // ── 6. THE KILN — the updraft ──────────────────────────────────────────
  'bellows': { name: 'BELLOWS', arena: rect(15, 11), duration: 45, spawns: [
    ...beat(0, 'GLOBBO', [[-12, -8], [12, 8]]),
    ...beat(4, 'REDD_CUBE', [[0, -9]]),
    ...beat(9, 'GLOBBO', [[-12, 8], [12, -8]]),
    ...beat(13, 'BULWARK', [[-13, 0]]),
    ...beat(18, 'REDD_CUBE', [[13, 0], [0, 9]]),
    ...beat(24, 'GLOBBO', [[-12, 0], [12, 0], [0, -9]]),
    ...beat(29, 'BULWARK', [[13, 6]]),
    ...beat(34, 'REDD_CUBE', [[-12, -8]]), ...beat(34, 'GLOBBO', [[12, -8], [0, 9]]),
  ] },
  'anvil': { name: 'ANVIL', arena: rect(19, 11), duration: 40, quota: 13, spawns: [
    ...beat(0, 'GLOBBO', [[-15, -7], [15, -7], [-15, 7], [15, 7]]),
    ...beat(2, 'PURP_CUBE', [[0, -9]]),
    ...beat(4, 'GLOBBO', [[-16, 0], [16, 0], [0, 9]]),
    ...beat(6.5, 'BULWARK', [[-12, 8]]),
    ...beat(8.5, 'GLOBBO', [[-8, -9], [8, -9], [12, 8]]),
    ...beat(11, 'PURP_CUBE', [[16, 5]]),
    ...beat(16, 'TORO', [[0, 9]]),
    ...beat(22, 'BULWARK', [[-16, 0]]),
    ...beat(28, 'GLOBBO', [[-12, -8], [12, -8]]),
    ...beat(33, 'PURP_CUBE', [[0, -9]]),
  ] },
  'forge': { name: 'FORGE', arena: circ(12), duration: 55, spawns: [
    ...beat(0, 'GLOBBO', ring(4, 9.5, 0)),
    ...beat(4, 'REDD_CUBE', ring(2, 9.5, 0.8)),
    ...beat(8, 'BULWARK', [[0, -9.5]]),
    ...beat(12, 'GLOBBO', ring(4, 9.5, 0.4)),
    ...beat(16, 'TORO', [[0, 9.5]]),
    ...beat(21, 'REDD_CUBE', ring(3, 9.5, 1.2)),
    ...beat(26, 'SIREN', [[-9.5, 0]]),
    ...beat(30, 'GLOBBO', ring(5, 9.5, 0.2)),
    ...beat(35, 'WARDEN', [[9.5, 0]]),
    ...beat(40, 'BULWARK', ring(2, 9.5, 1.6)),
    ...beat(45, 'TORO', [[0, -9.5]]), ...beat(45, 'GLOBBO', ring(3, 9.5, 2.2)),
  ] },
};

// ── HEAT ─────────────────────────────────────────────────────────────────
// The authored beats are the room's SKELETON. Measured bare, a perfect-aim bot
// took S in 52 of 54 runs and a human-like one in nearly all of theirs, with
// 0-2 hits: no pressure at all. Heat adds it the same way in every room, so a
// room keeps its shape: mirrored echo waves (every arena is symmetric in both
// axes, so a mirrored point is always inside), a speed ramp over the clock,
// shooters that fire more often, and more of all of it in later worlds.
const SHOOTERS = new Set(['SPITTOR', 'FANNER', 'PYRA', 'DRAPER', 'BOTFLY', 'WEEVA', 'ORANGE_CUBE', 'PURP_CUBE', 'CLOAKER']);
const WORLD = { 'undertow': 2, 'eddy': 2, 'slug-run': 2, 'pulse': 3, 'crossfire': 3, 'clot': 3,
  'lights-out': 4, 'the-pull': 4, 'siren-song': 4, 'rink': 5, 'skate': 5, 'bubble-bath': 5,
  'bellows': 6, 'anvil': 6, 'forge': 6 };
const r1 = x => Math.round(x * 10) / 10;
// HEAT IS PER ROOM, measured, not per world. A blanket echo by world made
// UNDERTOW (world 2, splitters) kill a human-like bot three times in three
// while RINK (world 5, sliders) gave it S — the cast decides how hard a body
// count is, so each room carries its own dial, tuned against the curve.
//   echo  — share of the skeleton mirrored through the centre, 1.5 s behind
//   echo2 — share mirrored across the long axis, 3 s behind
//   pace  — speed on top of the clock ramp (1 -> 1.2 at 40% -> 1.35 at 70%)
const DIAL = {
  'undertow':    { echo: 0.1,  echo2: 0,    pace: 1.0 },
  'eddy':        { echo: 0.5,  echo2: 0,    pace: 1.0 },
  'slug-run':    { echo: 0.8,  echo2: 0,    pace: 1.1 },
  'pulse':       { echo: 0.15, echo2: 0,    pace: 1.0 },
  'crossfire':   { echo: 0.6,  echo2: 0,    pace: 1.05 },
  'clot':        { echo: 0,    echo2: 0,    pace: 1.0 },
  'lights-out':  { echo: 1.0,  echo2: 1.0,  pace: 1.2 },
  'the-pull':    { echo: 0.8,  echo2: 0.3,  pace: 1.05 },
  'siren-song':  { echo: 0.8,  echo2: 0.2,  pace: 1.1 },
  'rink':        { echo: 1.0,  echo2: 1.0,  pace: 1.35 },
  'skate':       { echo: 0.8,  echo2: 0.4,  pace: 1.1 },
  'bubble-bath': { echo: 0.2,  echo2: 0,    pace: 1.0 },
  'bellows':     { echo: 0.3,  echo2: 0.1,  pace: 1.05 },
  'anvil':       { echo: 1.0,  echo2: 0.8,  pace: 1.25 },
  'forge':       { echo: 0.5,  echo2: 0,    pace: 1.1 },
};
// an even spread of `share` across the skeleton — every k-th body, not the first k
const pick = (i, n, share) => share > 0 && Math.floor((i + 1) * share) > Math.floor(i * share);
function heat(id, r) {
  const w = WORLD[id], dur = r.duration, D = DIAL[id];
  const base = r.spawns.map(s => ({ ...s }));
  const out = [...base];
  base.forEach((s, i) => {
    if (!pick(i, base.length, D.echo)) return;
    const t = r1(s.t + 1.5); if (t > dur - 4) return;
    out.push({ ...s, t, px: r1(-s.px), pz: r1(-s.pz) });
  });
  base.forEach((s, i) => {
    if (!pick(i, base.length, D.echo2)) return;
    const t = r1(s.t + 3); if (t > dur - 4) return;
    out.push({ ...s, t, px: s.px, pz: r1(-s.pz) });
  });
  for (const s of out) {
    const k = s.t / dur;
    const ramp = k >= 0.7 ? 1.35 : k >= 0.4 ? 1.2 : 1;
    const sp = r1(ramp * D.pace);
    if (sp !== 1) s.speedMult = sp;
    if (SHOOTERS.has(s.type) && r.goal !== 'flawless') s.intervalMult = r1(Math.max(0.5, 0.85 - (w - 2) * 0.05));
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}
// a quota is the most bodies that have ALL arrived by 30% of the clock (so an
// S — reaching it by 40% — is always possible), capped at 80% of the room
function autoQuota(spawns, dur) {
  const ts = spawns.map(s => s.t).sort((a, b) => a - b);
  let n = 0; while (n < ts.length && ts[n] <= 0.3 * dur) n++;
  return Math.max(1, Math.min(n, Math.floor(ts.length * 0.8)));
}

const report = [], quotas = {};
let bad = 0;
for (const [id, r] of Object.entries(ROOMS)) {
  const spawns = heat(id, r);
  if (r.quota) { r.quota = autoQuota(spawns, r.duration); quotas[id] = r.quota; }
  const lv = { format: 1, id, name: r.name, arena: r.arena, duration: r.duration,
               rules: { mode: 'arcade', outside: 'push' }, spawns };
  const errs = [...L.validate(lv, ctx), ...L.checkGeometry(lv)];
  const bodies = lv.spawns.length;
  let tQuota = null;
  if (r.quota) {
    const ts = lv.spawns.map(s => s.t).sort((a, b) => a - b);
    tQuota = ts[r.quota - 1];
    if (r.quota > bodies) errs.push(`quota ${r.quota} > ${bodies} bodies`);
    if (tQuota > 0.3 * r.duration) errs.push(`quota body ${r.quota} arrives at ${tQuota}s — later than 35% of ${r.duration}s, so S is out of reach`);
  }
  if (errs.length) { bad++; console.error(`✘ ${id}:\n  ` + errs.join('\n  ')); continue; }
  const text = L.serialize(lv);
  const back = L.serialize(L.parse(text, ctx));
  if (back !== text) { bad++; console.error(`✘ ${id}: serialize round-trip differs`); continue; }
  if (!process.argv.includes('--dry')) writeFileSync(new URL(`toko-drop/levels/${id}.json`, ROOT), text);
  report.push(`${id.padEnd(12)} ${String(r.duration).padStart(3)}s  ${String(bodies).padStart(2)} bodies  ${r.quota ? `quota ${r.quota} (body ${r.quota} at ${tQuota}s)` : r.goal ?? 'survive'}`);
}
console.log(report.join('\n'));
console.log('QUOTAS ' + JSON.stringify(quotas));
if (bad) { console.error(`${bad} room(s) refused`); process.exit(1); }
