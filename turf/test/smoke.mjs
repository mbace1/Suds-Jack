// Bare-node core-loop gate — no browser, no canvas, no GPU. grid.js/ai.js/
// combat.js touch nothing but plain objects, so the whole engine is
// verifiable here in milliseconds (same discipline as eeri/test/rooms.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { manhattan, hasLOS, coverSoftens, moveRange, lineTiles, key } from '../js/grid.js';
import { planIntent } from '../js/ai.js';
import {
  createEncounterState, getUnit, livingPlayers, livingEnemies, canUnitAct,
  movableTiles, moveUnit, attackableTargets, attack, endUnitTurn, endPlayerTurn, stepEnemyPhase,
  awardXp, xpToNext, XP_BASE_CLEAR, XP_PER_KILL, HP_PER_LEVEL, DROP_CHANCE,
} from '../js/combat.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));

const WEAPONS = readJson('weapons.json').weapons;
const UNITS = readJson('units.json').units;
const ENEMIES = readJson('enemies.json').enemies;
const ENCOUNTERS = readJson('encounters.json').encounters;
const BACKLOT = ENCOUNTERS.find(e => e.id === 'backlot');
const LOADING_DOCK = ENCOUNTERS.find(e => e.id === 'loading-dock');

const boot = (encounter, seed) => createEncounterState(encounter, UNITS, WEAPONS, ENEMIES, seed);

let pass = 0;
function check(name, fn) {
  fn();
  pass++;
  console.log(`  ok  ${name}`);
}

console.log('data integrity');
check('every unit weapon id resolves', () => {
  for (const u of UNITS) assert.ok(WEAPONS.some(w => w.id === u.weapon), `${u.id} -> ${u.weapon}`);
});
check('every enemy weapon id resolves', () => {
  for (const e of ENEMIES) assert.ok(WEAPONS.some(w => w.id === e.weapon), `${e.id} -> ${e.weapon}`);
});
check('every encounter\'s spawns reference real unit/enemy ids', () => {
  for (const enc of ENCOUNTERS) {
    for (const s of enc.playerSpawns) assert.ok(UNITS.some(u => u.id === s.unit), `${enc.id}: ${s.unit}`);
    for (const s of enc.enemySpawns) assert.ok(ENEMIES.some(e => e.id === s.enemy), `${enc.id}: ${s.enemy}`);
  }
});
check('every encounter\'s spawn and cover tiles are in bounds and none overlap', () => {
  for (const enc of ENCOUNTERS) {
    const { cols, rows } = enc.grid;
    const seen = new Set();
    const claim = (x, y, label) => {
      assert.ok(x >= 0 && y >= 0 && x < cols && y < rows, `${enc.id}: ${label} (${x},${y}) out of bounds`);
      const k = key(x, y);
      assert.ok(!seen.has(k), `${enc.id}: ${label} (${x},${y}) collides with an earlier tile`);
      seen.add(k);
    };
    for (const s of enc.playerSpawns) claim(s.x, s.y, 'player spawn');
    for (const s of enc.enemySpawns) claim(s.x, s.y, 'enemy spawn');
    for (const [x, y] of enc.cover.full) claim(x, y, 'full cover');
    for (const [x, y] of enc.cover.partial) claim(x, y, 'partial cover');
  }
});

console.log('grid primitives');
check('manhattan distance', () => {
  assert.equal(manhattan({ x: 0, y: 0 }, { x: 3, y: 4 }), 7);
  assert.equal(manhattan({ x: 2, y: 2 }, { x: 2, y: 2 }), 0);
});
check('lineTiles excludes both endpoints', () => {
  const pts = lineTiles({ x: 0, y: 0 }, { x: 4, y: 0 });
  assert.ok(pts.every(p => !(p.x === 0 && p.y === 0) && !(p.x === 4 && p.y === 0)));
  assert.equal(pts.length, 3); // (1,0) (2,0) (3,0)
});
check('adjacent tiles always have LOS regardless of cover elsewhere', () => {
  const state = { fullCover: new Set(['9,9']) };
  assert.ok(hasLOS(state, { x: 0, y: 0 }, { x: 1, y: 0 }));
});
check('full cover blocks LOS through it, but not around it', () => {
  const state = { fullCover: new Set(['2,0']) };
  assert.equal(hasLOS(state, { x: 0, y: 0 }, { x: 4, y: 0 }), false);
  assert.equal(hasLOS(state, { x: 0, y: 0 }, { x: 4, y: 1 }), true);
});
check('partial cover softens but never blocks', () => {
  const state = { fullCover: new Set(), partialCover: new Set(['2,0']) };
  assert.equal(hasLOS(state, { x: 0, y: 0 }, { x: 4, y: 0 }), true);
  assert.equal(coverSoftens(state, { x: 0, y: 0 }, { x: 4, y: 0 }), true);
  assert.equal(coverSoftens(state, { x: 0, y: 0 }, { x: 1, y: 3 }), false);
});
check('moveRange respects the move stat and stops at full cover / occupied tiles', () => {
  const state = {
    grid: { cols: 7, rows: 1 },
    fullCover: new Set(['3,0']),
    units: [{ x: 0, y: 0, hp: 1 }, { x: 1, y: 0, hp: 1 }],
  };
  const mover = { x: 0, y: 0, move: 5 };
  const range = moveRange(state, mover);
  assert.ok(!range.has('1,0'), 'occupied tile should not be reachable');
  assert.ok(!range.has('3,0'), 'full cover should not be reachable');
  assert.ok(!range.has('4,0'), 'nothing past the wall should be reachable either');
});

console.log('turn economy (backlot)');
{
  const state = boot(BACKLOT, 1);
  check('boots with the right roster and positions', () => {
    assert.equal(livingPlayers(state).length, BACKLOT.playerSpawns.length);
    assert.equal(livingEnemies(state).length, BACKLOT.enemySpawns.length);
    assert.equal(state.turn, 'player');
    for (const u of state.units) assert.ok(canUnitAct(u));
  });
  const blade = getUnit(state, 'p0');
  check('a unit can only move within its move stat, and only once', () => {
    const tiles = movableTiles(state, blade);
    assert.ok(tiles.size > 1 && tiles.size <= (blade.move * 2 + 1) ** 2);
    const dest = [...tiles.values()].find(t => t.x !== blade.x || t.y !== blade.y);
    const r1 = moveUnit(state, blade.uid, dest.x, dest.y);
    assert.ok(r1.ok);
    assert.equal(blade.actedMove, true);
    const r2 = moveUnit(state, blade.uid, blade.x, blade.y);
    assert.equal(r2.ok, false);
    assert.equal(r2.reason, 'already-moved');
  });
  check('enemy units reject player-turn commands', () => {
    const enemy = getUnit(state, 'e0');
    const r = moveUnit(state, enemy.uid, enemy.x, enemy.y);
    assert.equal(r.ok, false);
  });
  check('endUnitTurn burns both actions at once', () => {
    const niner = getUnit(state, 'p1');
    endUnitTurn(state, niner.uid);
    assert.equal(niner.actedMove, true);
    assert.equal(niner.actedAction, true);
    assert.equal(canUnitAct(niner), false);
  });
}

console.log('combat resolution');
{
  // A hand-built two-tile encounter isolates the knife (deterministic melee,
  // hitChance 1) from RNG entirely, so damage and the kill flag are exact.
  const duel = {
    id: 'duel', grid: { cols: 5, rows: 1 },
    playerSpawns: [{ unit: 'blade', x: 0, y: 0 }],
    enemySpawns: [{ enemy: 'grunt_blunt', x: 1, y: 0 }], // 5 hp, survives one knife hit
    cover: { full: [], partial: [] },
  };
  const state = boot(duel, 7);
  const blade = getUnit(state, 'p0'), foe = getUnit(state, 'e0');
  check('melee (hitChance 1) always hits for its listed damage', () => {
    const before = foe.hp;
    const r = attack(state, blade.uid, foe.uid);
    assert.ok(r.ok && r.hit);
    assert.equal(r.damage, 4); // knife
    assert.equal(foe.hp, before - 4);
  });
  check('acting twice in one turn is rejected', () => {
    const r = attack(state, blade.uid, foe.uid);
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'already-acted');
  });
}
{
  // Knockback: open floor, pipe (melee, knockback 2).
  const shove = {
    id: 'shove', grid: { cols: 6, rows: 1 },
    playerSpawns: [{ unit: 'wrench', x: 2, y: 0 }],
    enemySpawns: [{ enemy: 'grunt_blunt', x: 3, y: 0 }],
    cover: { full: [], partial: [] },
  };
  const state = boot(shove, 3);
  const wrench = getUnit(state, 'p0'), foe = getUnit(state, 'e0');
  check('a surviving hit with knockback pushes the target away along the attack line', () => {
    const r = attack(state, wrench.uid, foe.uid);
    assert.ok(r.ok && r.hit);
    assert.ok(!r.killed, 'grunt_blunt has 5 hp, pipe does 1 — should survive to be pushed');
    assert.equal(foe.x, 5); // 3 -> 5, pushed 2 tiles toward the open edge
    assert.equal(foe.y, 0);
  });
}
{
  // Knockback stopped early by a wall one tile behind the target.
  const wall = {
    id: 'wall', grid: { cols: 6, rows: 1 },
    playerSpawns: [{ unit: 'wrench', x: 2, y: 0 }],
    enemySpawns: [{ enemy: 'grunt_blunt', x: 3, y: 0 }],
    cover: { full: [[4, 0]], partial: [] },
  };
  const state = boot(wall, 3);
  const wrench = getUnit(state, 'p0'), foe = getUnit(state, 'e0');
  check('knockback stops at the first blocked tile instead of tunnelling through it', () => {
    attack(state, wrench.uid, foe.uid);
    assert.equal(foe.x, 3); // could not advance into the wall at x=4 at all
  });
}

console.log('XP and leveling');
{
  // grunt_handgun: 4 hp; knife: 4 dmg, hitChance 1 — a one-hit, deterministic kill.
  const oneHit = {
    id: 'onehit', grid: { cols: 3, rows: 1 },
    playerSpawns: [{ unit: 'blade', x: 0, y: 0 }],
    enemySpawns: [{ enemy: 'grunt_handgun', x: 1, y: 0 }],
    cover: { full: [], partial: [] },
  };
  const state = boot(oneHit, 9);
  const blade = getUnit(state, 'p0');
  check('a killing blow credits the attacker with a kill', () => {
    assert.equal(blade.kills, 0);
    const r = attack(state, blade.uid, 'e0');
    assert.ok(r.ok && r.killed);
    assert.equal(blade.kills, 1);
    assert.equal(state.result, 'win', 'the only enemy just died, the encounter is cleared');
  });
}
check('awardXp does nothing when the encounter has not been won', () => {
  const state = { result: null, units: [{ faction: 'player', hp: 9, kills: 3, xp: 0, level: 1 }] };
  const events = awardXp(state);
  assert.deepEqual(events, []);
  assert.equal(state.units[0].xp, 0);
});
check('a surviving unit is paid a clear bonus plus a per-kill bonus; a dead one is paid nothing', () => {
  const state = {
    result: 'win',
    units: [
      { uid: 'p0', name: 'Blade', faction: 'player', hp: 9, maxHp: 9, kills: 1, xp: 0, level: 1 },
      { uid: 'p1', name: 'Niner', faction: 'player', hp: 0, maxHp: 8, kills: 0, xp: 0, level: 1 },
    ],
  };
  const events = awardXp(state);
  assert.equal(events.length, 1, 'only the surviving unit is in the summary');
  assert.equal(events[0].uid, 'p0');
  assert.equal(events[0].gained, XP_BASE_CLEAR + XP_PER_KILL);
  assert.equal(state.units[0].xp, XP_BASE_CLEAR + XP_PER_KILL);
  assert.equal(state.units[1].xp, 0, 'a unit that did not survive the encounter earns nothing');
});
check('enough XP in one haul rolls a level, banks the remainder, and heals the HP bump', () => {
  const state = {
    result: 'win',
    units: [{ uid: 'p0', name: 'Blade', faction: 'player', hp: 9, maxHp: 9, kills: 2, xp: 0, level: 1 }],
  };
  // gained = 10 + 8*2 = 26; xpToNext(1) = 20 -> levels to 2, banking 6.
  const events = awardXp(state);
  const u = state.units[0];
  assert.equal(events[0].gained, 26);
  assert.deepEqual(events[0].levelsGained, [2]);
  assert.equal(u.level, 2);
  assert.equal(u.xp, 26 - xpToNext(1));
  assert.equal(u.maxHp, 9 + HP_PER_LEVEL);
  assert.equal(u.hp, 9 + HP_PER_LEVEL, 'the HP bump is healed immediately, not banked');
});
check('a big enough haul rolls more than one level at once', () => {
  const state = {
    result: 'win',
    units: [{ uid: 'p0', name: 'Blade', faction: 'player', hp: 9, maxHp: 9, kills: 10, xp: 0, level: 1 }],
  };
  // gained = 10 + 80 = 90; xpToNext(1)=20 -> lvl2 (70 left), xpToNext(2)=35 -> lvl3 (35 left),
  // xpToNext(3)=50 -> 35 is not enough, stop at level 3 with 35 banked.
  const events = awardXp(state);
  const u = state.units[0];
  assert.deepEqual(events[0].levelsGained, [2, 3]);
  assert.equal(u.level, 3);
  assert.equal(u.xp, 35);
});

console.log('loot drops');
{
  // A fixed rng (not a seed hunt) makes both the hit roll and the drop roll
  // deterministic regardless of what makeRng(seed) would have produced.
  const oneHit = {
    id: 'onehit', grid: { cols: 3, rows: 1 },
    playerSpawns: [{ unit: 'blade', x: 0, y: 0 }],
    enemySpawns: [{ enemy: 'grunt_handgun', x: 1, y: 0 }],
    cover: { full: [], partial: [] },
  };
  check(`a kill rolling under DROP_CHANCE (${DROP_CHANCE}) drops the victim's weapon on its tile`, () => {
    const state = boot(oneHit, 1);
    state.rng = () => 0; // hit roll 0 < hitChance 1 (hit); drop roll 0 < DROP_CHANCE (drops)
    const r = attack(state, 'p0', 'e0');
    assert.ok(r.killed);
    assert.deepEqual(r.dropped, { x: 1, y: 0, weaponId: 'handgun' });
    assert.deepEqual(state.drops, [{ x: 1, y: 0, weaponId: 'handgun' }]);
  });
  check('a kill rolling over DROP_CHANCE leaves nothing behind', () => {
    const state = boot(oneHit, 1);
    state.rng = () => 0.99; // hit roll 0.99 < hitChance 1 (still a hit); drop roll 0.99 >= DROP_CHANCE (no drop)
    const r = attack(state, 'p0', 'e0');
    assert.ok(r.killed);
    assert.equal(r.dropped, null);
    assert.deepEqual(state.drops, []);
  });
  check('walking onto a drop swaps the weapon and clears it — a player kills adjacent, then steps onto the body', () => {
    const state = boot(oneHit, 1);
    state.rng = () => 0;
    const blade = getUnit(state, 'p0');
    assert.equal(blade.weapon.id, 'knife');
    attack(state, 'p0', 'e0'); // kills without moving — actedMove is still free
    const r = moveUnit(state, 'p0', 1, 0);
    assert.ok(r.ok);
    assert.equal(r.pickedUp.id, 'handgun');
    assert.equal(blade.weapon.id, 'handgun', "the unit's own weapon actually swapped");
    assert.deepEqual(state.drops, [], 'the drop is consumed, not left behind for someone else too');
  });
  check('moving onto an ordinary empty tile picks up nothing', () => {
    const empty = {
      id: 'empty', grid: { cols: 4, rows: 1 },
      playerSpawns: [{ unit: 'blade', x: 0, y: 0 }],
      enemySpawns: [{ enemy: 'grunt_handgun', x: 3, y: 0 }], // out of move range, never engaged
      cover: { full: [], partial: [] },
    };
    const state = boot(empty, 1);
    const r = moveUnit(state, 'p0', 2, 0);
    assert.ok(r.ok);
    assert.equal(r.pickedUp, null);
    assert.equal(getUnit(state, 'p0').weapon.id, 'knife', 'no drop existed, so the weapon is untouched');
  });
}

console.log('AI + telegraph');
{
  const state = boot(BACKLOT, 5);
  const enemy = getUnit(state, 'e0');
  check('planIntent always returns a well-shaped intent', () => {
    const intent = planIntent(state, enemy);
    assert.ok(['move', 'attack', 'idle'].includes(intent.type));
  });
  check('telegraph covers every living enemy and nothing else', () => {
    assert.equal(state.telegraph.size, livingEnemies(state).length);
    for (const uid of state.telegraph.keys()) assert.ok(uid.startsWith('e'));
  });
  check('telegraph recomputes after a player move (does not go stale)', () => {
    const before = new Map(state.telegraph);
    const blade = getUnit(state, 'p0');
    const tiles = movableTiles(state, blade);
    const dest = [...tiles.values()].find(t => t.x !== blade.x || t.y !== blade.y);
    moveUnit(state, blade.uid, dest.x, dest.y);
    let changed = false;
    for (const [uid, intent] of state.telegraph) {
      const was = before.get(uid);
      if (!was || JSON.stringify(was) !== JSON.stringify(intent)) changed = true;
    }
    assert.ok(changed, 'at least one enemy should replan after the board changed');
  });
  check('the enemy phase executes exactly the plan the player last saw, not a live replan', () => {
    // Move every player unit first, so by the time the phase starts, several
    // enemies' frozen plans were computed against a board that later enemies
    // in the queue will go on to change further — the exact scenario a live
    // re-plan (planIntent() called fresh inside stepEnemyPhase) gets wrong.
    for (const u of livingPlayers(state)) {
      if (u.actedMove) continue;
      const tiles = [...movableTiles(state, u).values()];
      const dest = tiles.find(t => t.x !== u.x || t.y !== u.y);
      if (dest) moveUnit(state, u.uid, dest.x, dest.y);
    }
    endPlayerTurn(state);
    const frozen = new Map(state.enemyPlan);
    assert.ok(frozen.size > 0);
    let steps = 0;
    let step;
    do {
      step = stepEnemyPhase(state);
      steps++;
      if (step && !step.done && step.uid) {
        const plan = frozen.get(step.uid);
        assert.ok(plan, `${step.uid} acted with no frozen plan`);
        if (step.moved) assert.deepEqual(step.moved, plan.moveTo, `${step.uid} moved somewhere other than its frozen plan`);
        if (step.attacked) assert.equal(step.attacked.targetUid, plan.targetUid, `${step.uid} attacked a different target than its frozen plan`);
      }
    } while (step && !step.done && steps < 20);
  });
}

console.log('end-to-end playthrough (bot vs bot, every encounter, must terminate)');
function playthrough(encounter, seed) {
  const state = boot(encounter, seed);
  const CAP = 150;
  let rounds = 0;
  while (!state.result && rounds < CAP) {
    for (const unit of livingPlayers(state)) {
      if (!canUnitAct(unit)) continue;
      let targets = attackableTargets(state, unit);
      if (!targets.length && !unit.actedMove) {
        const tiles = [...movableTiles(state, unit).values()];
        let best = null, bestDist = Infinity;
        for (const t of tiles) for (const e of livingEnemies(state)) {
          const d = manhattan(t, e);
          if (d < bestDist) { bestDist = d; best = t; }
        }
        if (best) moveUnit(state, unit.uid, best.x, best.y);
        targets = attackableTargets(state, unit);
      }
      if (targets.length) attack(state, unit.uid, targets[0]);
      else endUnitTurn(state, unit.uid);
    }
    endPlayerTurn(state);
    let step;
    do { step = stepEnemyPhase(state); } while (step && !step.done);
    rounds++;
  }
  check(`${encounter.id}: reaches a win or a loss, not a stalemate`, () => {
    assert.ok(state.result === 'win' || state.result === 'lose', `no result after ${CAP} rounds`);
  });
  check(`${encounter.id}: does not take an absurd number of rounds to get there`, () => {
    assert.ok(rounds < CAP, `hit the ${CAP}-round safety cap`);
  });
  console.log(`  (bot playthrough: ${encounter.id} — ${state.result} in ${rounds} rounds)`);
}
playthrough(BACKLOT, 42);
playthrough(LOADING_DOCK, 42);

console.log(`\n${pass} checks passed`);
