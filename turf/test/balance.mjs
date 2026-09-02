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
  endPlayerTurn, stepEnemyPhase, movableTiles,
} from '../js/combat.js';

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
      let targets = attackableTargets(s, u);
      if (!targets.length && !u.actedMove) {
        const foe = s.units
          .filter(x => x.faction === 'enemy' && x.hp > 0)
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
      if (targets.length) attack(s, u.uid, targets[0]);
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
