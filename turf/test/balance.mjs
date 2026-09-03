// The balance gate: is each encounter actually WINNABLE?
//
// WHY THIS EXISTS, and it is worth reading before trusting smoke.mjs alone.
// smoke.mjs asserts a bot playthrough TERMINATES — reaches a win or a loss
// rather than stalling. Every one of its lines read "lose in 5 rounds", "lose
// in 6 rounds", and that was reported as green for five releases while the
// game was won ZERO times in 300 runs. A suite that certifies "the loop
// terminates" cannot see "the loop is unwinnable", which is the same shape as
// this repo's older lesson that a gate certifying *works* cannot see *looks*.
//
// So this one plays each encounter many times and reports the win rate. It is
// deliberately a separate file from smoke.mjs: smoke answers "is it correct",
// this answers "is it a game", and conflating them is how the first question
// passing came to imply the second.
//
// The bot is intentionally MEDIOCRE — it closes on the nearest enemy and
// swings, with no use of cover, hazards or knockback. That makes its win rate
// a floor, not a forecast: a human who plays the board well should do better
// than this, so a floor of zero means no amount of skill is being rewarded,
// while a floor that is too HIGH means the fight makes no demands. Both ends
// are failures and both are checked.
//
//   node turf/test/balance.mjs            # gate: fails if any encounter is broken
//   node turf/test/balance.mjs --seeds 200  # tighter numbers, same verdict
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createEncounterState, attackableTargets, attack, moveUnit, endUnitTurn,
  endPlayerTurn, stepEnemyPhase, movableTiles, reloadUnit,
} from '../js/combat.js';
import { needsReload } from '../js/ammo.js';
import { key } from '../js/grid.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));

const WEAPONS = readJson('weapons.json').weapons;
const UNITS = readJson('units.json').units;
const ENEMIES = readJson('enemies.json').enemies;
const ENCOUNTERS = readJson('encounters.json').encounters;
const HAZARDS = readJson('hazards.json').hazards;
const TRINKETS = readJson('trinkets.json').trinkets;

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt;
};
const SEEDS = arg('--seeds', 60);
const ROUND_CAP = 40;

// A floor, not a target. Below FLOOR_MIN the encounter cannot be won by
// playing it straight, so no amount of tactical skill is being rewarded —
// that is the 0/300 case. Above FLOOR_MAX a bot that ignores every system in
// the game still wins comfortably, which means the fight asks nothing.
const FLOOR_MIN = 0.10;
const FLOOR_MAX = 0.90;

const man = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function playOnce(encounter, seed) {
  const s = createEncounterState(encounter, UNITS, WEAPONS, ENEMIES, seed, HAZARDS, TRINKETS);
  let rounds = 0;
  while (!s.result && rounds < ROUND_CAP) {
    for (const u of s.units.filter(x => x.faction === 'player' && x.hp > 0)) {
      // THE BOT HAS TO PURSUE THE OBJECTIVE, badly but genuinely. It is
      // meant to ignore every SYSTEM (cover, hazards, knockback, abilities)
      // — that is what makes its rate a floor — but a bot that ignores the
      // GOAL reports 0% on an extraction map, which is a fact about the bot
      // and not about the encounter. A mode nothing can pursue is a mode
      // nobody can balance.
      if (walkToObjective(s, u)) { if (s.result) break; continue; }
      let targets = attackableTargets(s, u);
      if (!targets.length && !u.actedMove) {
        // "Nearest enemy" includes a cache on a destroy map: combat.js makes
        // an objective a third faction so nothing has to special-case it.
        const foe = s.units
          .filter(x => x.faction !== 'player' && x.hp > 0)
          .sort((a, b) => man(u, a) - man(u, b))[0];
        if (foe) {
          let best = null, bestD = Infinity;
          for (const t of movableTiles(s, u).values()) {
            const d = man(t, foe);
            if (d < bestD) { bestD = d; best = t; }
          }
          if (best) moveUnit(s, u.uid, best.x, best.y);
        }
        targets = attackableTargets(s, u);
      }
      // Reloading is not a SYSTEM this bot is meant to ignore — it is the
      // only way an empty gun ever fires again, and a bot that never reloads
      // would report the ammo mechanic as a difficulty spike rather than a
      // rhythm. Same standard as taking the free swing on an extraction.
      if (targets.length) attack(s, u.uid, targets[0]);
      else if (needsReload(u)) reloadUnit(s, u.uid);
      else endUnitTurn(s, u.uid);
      if (s.result) break;
    }
    if (s.result) break;
    endPlayerTurn(s);
    let step;
    do { step = stepEnemyPhase(s); } while (step && !step.done);
    rounds++;
  }
  return {
    result: s.result || 'stall',
    rounds,
    alive: s.units.filter(x => x.faction === 'player' && x.hp > 0).length,
    foesLeft: s.units.filter(x => x.faction === 'enemy' && x.hp > 0).length,
  };
}

// Walk at the extraction pads and nothing else — no fighting on the way,
// which is exactly the mediocrity this gate is built on. Returns true when
// this unit's turn is spoken for.
function walkToObjective(s, u) {
  const mode = s.win && s.win.mode;
  let goals = null;
  if (mode === 'extract' && s.extract && s.extract.size) {
    if (s.extract.has(key(u.x, u.y))) { endUnitTurn(s, u.uid); return true; }
    goals = [...s.extract].map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });
  } else if (mode === 'destroy') {
    // A DESTROY MAP NEEDS THE SAME HELP, and finding that out cost a whole
    // round of tuning: every cache-HP and deadline combination measured 0%,
    // which looked like an unwinnable encounter and was actually a bot that
    // never attacked a cache once. "Nearest thing that is not mine" always
    // answers "an enemy", because the enemies are the screen in front of the
    // objective — that is the entire point of the mission and it made the
    // mission invisible to the gate.
    goals = s.units.filter(o => o.faction === 'objective' && o.hp > 0);
    if (!goals.length) return false;
    const reachable = attackableTargets(s, u).filter(uid => {
      const t = s.units.find(x => x.uid === uid);
      return t && t.faction === 'objective';
    });
    if (reachable.length) { attack(s, u.uid, reachable[0]); return true; }
  }
  if (!goals) return false;
  if (u.actedMove) { endUnitTurn(s, u.uid); return true; }
  const pads = goals;
  let best = null, bestD = Infinity;
  for (const t of movableTiles(s, u).values()) {
    const d = Math.min(...pads.map(p => man(t, p)));
    if (d < bestD) { bestD = d; best = t; }
  }
  if (best && (best.x !== u.x || best.y !== u.y)) moveUnit(s, u.uid, best.x, best.y);
  if (s.result) return true;
  // A swing on the way out, because the move is already spent and the action
  // is free. Walking past five armed rivals without ever hitting back is not
  // "mediocre", it is suicidal — this gate's bot is meant to ignore the
  // SYSTEMS (cover, hazards, knockback, the kit), not to decline to fight.
  // Measured: without this the crew was wiped in 34 of 40 runs and the mode
  // read as unwinnable when the map was merely dangerous.
  const targets = attackableTargets(s, u);
  if (targets.length) attack(s, u.uid, targets[0]);
  else if (needsReload(u)) reloadUnit(s, u.uid);
  else endUnitTurn(s, u.uid);
  return true;
}

let failures = 0;
console.log(`balance — ${SEEDS} seeds per encounter, with a bot that ignores cover, hazards and knockback\n`);
console.log(`${'encounter'.padEnd(15)}${'objective'.padEnd(14)}${'win'.padStart(9)}${'rounds'.padStart(8)}${'survivors'.padStart(11)}   verdict`);

for (const enc of ENCOUNTERS) {
  let wins = 0, stalls = 0, rounds = 0, alive = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const r = playOnce(enc, seed);
    if (r.result === 'win') { wins++; alive += r.alive; }
    else if (r.result === 'stall') stalls++;
    rounds += r.rounds;
  }
  const rate = wins / SEEDS;
  const obj = enc.win ? (enc.win.mode === 'survive' ? `survive ${enc.win.rounds}` : enc.win.mode) : 'eliminate';
  let verdict = 'ok';
  if (stalls) { verdict = `STALLS x${stalls}`; failures++; }
  else if (rate < FLOOR_MIN) { verdict = 'UNWINNABLE — the goal, not the numbers'; failures++; }
  else if (rate > FLOOR_MAX) { verdict = 'TRIVIAL — a bot ignoring every system still wins'; failures++; }
  console.log(
    `${enc.id.padEnd(15)}${obj.padEnd(14)}` +
    `${(rate * 100).toFixed(0).padStart(7)}%` +
    `${(rounds / SEEDS).toFixed(1).padStart(8)}` +
    `${(wins ? (alive / wins).toFixed(1) : '—').padStart(11)}   ${verdict}`,
  );
}

console.log(
  `\nFloor is ${(FLOOR_MIN * 100).toFixed(0)}-${(FLOOR_MAX * 100).toFixed(0)}% for a bot that plays badly on purpose.` +
  '\nA human using cover, hazards and knockback should beat this; that headroom is the game.',
);
if (failures) {
  console.error(`\n${failures} encounter(s) outside the playable band.`);
  process.exit(1);
}
console.log('\nevery encounter is winnable and none is free.');
