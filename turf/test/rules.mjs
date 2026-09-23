// Rule profiles (js/rules.js): the Piritori C.11 rules, played on this engine.
//
//   node turf/test/rules.mjs
//
// Two promises, and this file holds both:
//
//   1. TURF's own boards are untouched. No `rules` on the encounter means no
//      trace of a profile anywhere in the state, and the profile verbs are
//      refused rather than quietly ignored. (balance.mjs reading bit-identical
//      is the other half of this promise; it is checked there, not here.)
//
//   2. Under 'piritori-c11' each switch does what Piritori's own resolver does
//      (piritori-eden web/fight-module/tactics.js and cover-edges.js). The
//      numbers below are Piritori's, not re-derived: armour 2 against a bat's
//      3, a knife's pierce 1, a -25 low wall, brace +2 to a cap of 4, a +2
//      bandage, and the first roll of its LCG from seed 104729.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createEncounterState, getUnit, moveUnit, attack, braceUnit, useItem, reloadUnit,
  endPlayerTurn, stepEnemyPhase, forecastAttack,
} from '../js/combat.js?v=23';
import { moveRange, hasLOS, key } from '../js/grid.js?v=7';
import { resolveRules, makeLcg, supercoverTiles, PIRITORI_C11 } from '../js/rules.js?v=1';

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++; };

// ── 1. TURF's own boards carry no trace of a profile ────────────────
{
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
  const enc = read('encounters.json').encounters[0];
  const s = createEncounterState(enc, read('units.json').units, read('weapons.json').weapons, read('enemies.json').enemies, 7);
  ok(!('rules' in s) && !('partialEdges' in s) && !('items' in s), 'a TURF board has no profile fields');
  ok(s.units.every(u => !('armour' in u) && !('items' in u)), 'TURF units have no armour or items fields');
  const p = s.units.find(u => u.faction === 'player');
  eq(braceUnit(s, p.uid).ok, false, 'brace is refused under TURF rules');
  eq(useItem(s, p.uid, 'training-bandage').ok, false, 'items are refused under TURF rules');
  eq(resolveRules(null), resolveRules('turf'), 'no rules = the turf profile');
  assert.throws(() => resolveRules('nope'), /unknown profile/); checks++;
}

// ── a Piritori board ────────────────────────────────────────────────
const WEAPONS = [
  { id: 'baseball-bat', name: 'Bat', archetype: 'melee', range: 1, damage: 3, hitChance: 1, knockback: 0 },
  { id: 'folding-knife', name: 'Knife', archetype: 'melee', range: 1, damage: 2, hitChance: 1, knockback: 0, pierce: 1 },
  { id: 'first-handgun', name: 'Handgun', archetype: 'ranged', range: 6, damage: 3, hitChance: 0.9, knockback: 0, mag: 4 },
];
const def = (id, weapon, armour, extra = {}) => ({ id, name: id, role: 'x', weapon, hp: 5, move: 4, armour, items: ['training-bandage'], ...extra });
function board({ players, enemies, full = [], partial = [], seed = 104729 }) {
  const enc = {
    id: 't', grid: { cols: 6, rows: 8 }, rules: 'piritori-c11',
    items: { 'training-bandage': { effectType: 'restore_condition', magnitude: 2, singleUse: true } },
    playerSpawns: players.map(([id, x, y]) => ({ unit: id, x, y })),
    enemySpawns: enemies.map(([id, x, y]) => ({ enemy: id, x, y })),
    cover: { full, partial },
  };
  const all = [...players, ...enemies].map(([id, , , w, a]) => def(id, w, a));
  return createEncounterState(enc, all, WEAPONS, all.map(d => ({ ...d, behaviour: 'charger', focus: 'nearest' })), seed);
}
const U = (s, id) => s.units.find(u => u.defId === id);

// ── 2. armour, pierce ───────────────────────────────────────────────
{
  const s = board({ players: [['bat', 2, 2, 'baseball-bat', 2], ['knife', 3, 3, 'folding-knife', 1]], enemies: [['r', 3, 2, 'baseball-bat', 2]] });
  const f = forecastAttack(s, U(s, 'bat'), U(s, 'r'), U(s, 'bat').weapon);
  eq([f.damage, f.armourDamage, f.hpDamage], [3, 2, 1], 'bat 3 into armour 2: 2 absorbed, 1 hp');
  ok(attack(s, U(s, 'bat').uid, U(s, 'r').uid).ok, 'the bat swings');
  eq([U(s, 'r').armour, U(s, 'r').hp], [0, 4], 'armour spent first, then hp');
  const g = forecastAttack(s, U(s, 'knife'), U(s, 'r'), U(s, 'knife').weapon);
  eq([g.armourDamage, g.hpDamage], [0, 2], 'no armour left: the whole blow is hp');
  U(s, 'r').armour = 2;
  const h = forecastAttack(s, U(s, 'knife'), U(s, 'r'), U(s, 'knife').weapon);
  eq([h.armourDamage, h.hpDamage], [1, 1], 'pierce 1: a knife 2 against armour 2 lands 1 hp');
}

// ── 3. brace and the bandage spend the action, never the move ───────
{
  const s = board({ players: [['a', 1, 1, 'baseball-bat', 2], ['b', 2, 1, 'baseball-bat', 3]], enemies: [['r', 5, 7, 'baseball-bat', 1]] });
  ok(braceUnit(s, U(s, 'a').uid).ok, 'brace'); eq(U(s, 'a').armour, 4, 'brace +2');
  ok(braceUnit(s, U(s, 'b').uid).ok, 'brace at 3'); eq(U(s, 'b').armour, 4, 'brace caps at 4');
  eq(braceUnit(s, U(s, 'a').uid).ok, false, 'one action a turn');
  ok(moveUnit(s, U(s, 'a').uid, 1, 2).ok, 'the move is still there after bracing');
  const t = board({ players: [['a', 1, 1, 'baseball-bat', 2]], enemies: [['r', 5, 7, 'baseball-bat', 1]] });
  eq(useItem(t, U(t, 'a').uid, 'training-bandage').ok, false, 'no bandage at full hp');
  U(t, 'a').hp = 2;
  ok(useItem(t, U(t, 'a').uid, 'training-bandage').ok, 'bandage'); eq([U(t, 'a').hp, U(t, 'a').items], [4, []], '+2 and gone');
}

// ── 4. edge cover: walked around, protects one face ─────────────────
{
  // A wall on the NORTH edge of (1,3): stepping (1,3)->(1,4) is refused both
  // ways; the tile itself is not.
  const s = board({ players: [['g', 1, 2, 'first-handgun', 1]], enemies: [['r', 5, 7, 'baseball-bat', 1]], partial: [[1, 3, 'north']] });
  const g = U(s, 'g');
  ok(moveRange(s, g).has(key(1, 3)), 'the walled tile can be entered');
  g.x = 1; g.y = 3;
  ok(!moveRange(s, g).has(key(1, 4)) || moveRange(s, g).get(key(1, 4)).cost > 1, 'cannot step across the wall');
  // Odds through the face: a gun firing from (1,5) at (1,3) comes in through
  // the north face; from (1,1) (the rear) it does not.
  const t = board({ players: [['g', 1, 5, 'first-handgun', 1]], enemies: [['r', 1, 3, 'baseball-bat', 1]], partial: [[1, 3, 'north']] });
  const face = forecastAttack(t, U(t, 'g'), U(t, 'r'), U(t, 'g').weapon);
  eq(Math.round(face.chance * 100), 65, 'through the walled face: 90 - 25');
  U(t, 'g').y = 1;
  const rear = forecastAttack(t, U(t, 'g'), U(t, 'r'), U(t, 'g').weapon);
  eq(Math.round(rear.chance * 100), 90, 'from the rear the wall does nothing');
}

// ── 5. supercover sight; bodies block ───────────────────────────────
{
  eq(supercoverTiles({ x: 0, y: 0 }, { x: 1, y: 1 }).map(t => key(t.x, t.y)), ['1,0', '0,1'], 'an exact corner touches both side tiles');
  const s = board({ players: [['g', 0, 0, 'first-handgun', 1], ['mate', 0, 2, 'baseball-bat', 1]], enemies: [['r', 0, 4, 'baseball-bat', 1]] });
  eq(hasLOS(s, U(s, 'g'), U(s, 'r')), false, 'a body between shooter and target blocks the shot');
  U(s, 'mate').x = 3;
  eq(hasLOS(s, U(s, 'g'), U(s, 'r')), true, 'and the line is clear once it moves');
  const w = board({ players: [['g', 0, 0, 'first-handgun', 1]], enemies: [['r', 2, 2, 'baseball-bat', 1]], full: [[1, 0], [0, 1]] });
  eq(hasLOS(w, U(w, 'g'), U(w, 'r')), false, 'no shot threads between two touching walls');
}

// ── 6. frozen plans: shown once, broken plans hold whole ────────────
{
  const s = board({ players: [['p', 2, 2, 'baseball-bat', 1]], enemies: [['r', 2, 5, 'baseball-bat', 1]] });
  const r = U(s, 'r'), plan = s.telegraph.get(r.uid);
  eq(plan.type, 'attack', 'the rival plans to swing');
  ok(moveUnit(s, U(s, 'p').uid, 0, 0).ok, 'the player walks out of reach');
  eq(s.telegraph.get(r.uid), plan, 'the plan is NOT re-read after a player command');
  endPlayerTurn(s);
  let step; do step = stepEnemyPhase(s); while (step && !step.done && step.uid !== r.uid);
  eq([step.note, step.moved, step.attacked], ['out-of-position', null, null], 'a broken plan holds whole: no step, no swing');
  eq([r.x, r.y], [2, 5], 'the rival did not move');
  while (!step.done) step = stepEnemyPhase(s);   // the round turns on the LAST step
  ok(s.telegraph.get(r.uid) !== plan, 'the next round shows a fresh plan');
}

// ── 7. the dice, drops and momentum ─────────────────────────────────
{
  const lcg = makeLcg(104729);
  eq(lcg(), ((Math.imul(104729, 1664525) + 1013904223) >>> 0) / 4294967296, "the first roll is Piritori's");
  const s = board({ players: [['p', 2, 2, 'baseball-bat', 1]], enemies: [['r', 2, 3, 'baseball-bat', 0]] });
  U(s, 'r').hp = 1;
  ok(attack(s, U(s, 'p').uid, U(s, 'r').uid).ok, 'a killing blow');
  eq(s.drops, [], 'no weapon drops under Piritori rules');
  const m = board({ players: [['g', 0, 0, 'first-handgun', 1]], enemies: [['r', 0, 6, 'baseball-bat', 1]] });
  U(m, 'r').momentum = 4;
  eq(forecastAttack(m, U(m, 'g'), U(m, 'r'), U(m, 'g').weapon).evade, 0, 'no momentum evasion');
  ok(PIRITORI_C11.momentum === false && PIRITORI_C11.drops === false, 'the profile says so');
  // A reload is still an action, and the profile does not disturb it.
  U(m, 'g').ammo = 0;
  ok(reloadUnit(m, U(m, 'g').uid).ok, 'reload under the profile');
}

console.log(`${checks} checks passed`);
