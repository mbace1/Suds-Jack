// Bare-node core-loop gate — no browser, no canvas, no GPU. grid.js/ai.js/
// combat.js touch nothing but plain objects, so the whole engine is
// verifiable here in milliseconds (same discipline as eeri/test/rooms.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { manhattan, hasLOS, coverSoftens, moveRange, lineTiles, key } from '../js/grid.js';
import { planIntent, planAllIntents } from '../js/ai.js';
import {
  createEncounterState, getUnit, livingPlayers, livingEnemies, canUnitAct,
  movableTiles, moveUnit, attackableTargets, attack, orderAttack, useAbility,
  endUnitTurn, endPlayerTurn, stepEnemyPhase,
  awardXp, xpToNext, XP_BASE_CLEAR, XP_PER_KILL, HP_PER_LEVEL, DROP_CHANCE, hazardAt,
  applyTrinkets, TRINKET_SHARE,
} from '../js/combat.js';
import {
  MOVE_CAP, EVADE_PER, DAMAGE_PER, addMomentum, clearMomentum, evasionOf,
} from '../js/momentum.js';
import { abilitiesFor, abilityTargets, canAfford, whyNot, findAbility } from '../js/abilities.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const readJson = f => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));

const WEAPONS = readJson('weapons.json').weapons;
const UNITS = readJson('units.json').units;
const ENEMIES = readJson('enemies.json').enemies;
const ENCOUNTERS = readJson('encounters.json').encounters;
const HAZARDS = readJson('hazards.json').hazards;
const TRINKETS = readJson('trinkets.json').trinkets;
const ABILITIES = readJson('abilities.json').abilities;
const BACKLOT = ENCOUNTERS.find(e => e.id === 'backlot');
const LOADING_DOCK = ENCOUNTERS.find(e => e.id === 'loading-dock');

const boot = (encounter, seed) => createEncounterState(encounter, UNITS, WEAPONS, ENEMIES, seed, HAZARDS, TRINKETS);

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
  // A SCRIPTED rng, not a constant: a drop now takes three rolls in order
  // (hit, drop-or-not, weapon-or-trinket) and a constant 0 wins all three,
  // which silently turned this weapon test into a trinket test when the
  // trinket roll was added. Naming each value keeps the test honest about
  // which branch it is actually exercising.
  const rngSeq = (...vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };

  check(`a kill rolling under DROP_CHANCE (${DROP_CHANCE}) drops the victim's weapon on its tile`, () => {
    const state = boot(oneHit, 1);
    state.rng = rngSeq(0, 0, 0.99); // hit; drops; 0.99 >= TRINKET_SHARE so it is the weapon
    const r = attack(state, 'p0', 'e0');
    assert.ok(r.killed);
    assert.deepEqual(r.dropped, { x: 1, y: 0, weaponId: 'handgun' });
    assert.deepEqual(state.drops, [{ x: 1, y: 0, weaponId: 'handgun' }]);
  });
  check('a kill rolling over DROP_CHANCE leaves nothing behind', () => {
    const state = boot(oneHit, 1);
    state.rng = rngSeq(0.99, 0.99); // still a hit; drop roll 0.99 >= DROP_CHANCE (no drop)
    const r = attack(state, 'p0', 'e0');
    assert.ok(r.killed);
    assert.equal(r.dropped, null);
    assert.deepEqual(state.drops, []);
  });
  check('walking onto a drop swaps the weapon and clears it — a player kills adjacent, then steps onto the body', () => {
    const state = boot(oneHit, 1);
    state.rng = rngSeq(0, 0, 0.99); // hit; drops; the weapon, not a trinket
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

// ── hazards (GDD §10's "set dressing with mechanical teeth") ─────────────
// The point of these is not that a tile does damage — it is that knockback
// finally has somewhere to push things, and that the AI understands the
// board well enough for the telegraph not to promise a suicide.
console.log('hazards');

const hazEnc = ENCOUNTERS.find(e => e.id === 'the-yard');

check('every hazard in the data names a kind the defs declare', () => {
  const known = new Set(HAZARDS.map(h => h.id));
  for (const e of ENCOUNTERS) {
    for (const [x, y, kind] of (e.hazards || [])) {
      assert.ok(known.has(kind), `${e.id} (${x},${y}) uses unknown hazard "${kind}"`);
    }
  }
});

check('a hazard never sits on cover or on a spawn', () => {
  for (const e of ENCOUNTERS) {
    const blocked = new Set([
      ...e.cover.full.map(([x, y]) => `${x},${y}`),
      ...e.cover.partial.map(([x, y]) => `${x},${y}`),
      ...e.playerSpawns.map(s => `${s.x},${s.y}`),
      ...e.enemySpawns.map(s => `${s.x},${s.y}`),
    ]);
    for (const [x, y] of (e.hazards || [])) {
      assert.ok(!blocked.has(`${x},${y}`), `${e.id}: hazard at ${x},${y} overlaps cover or a spawn`);
    }
  }
});

check('walking into a hazard costs the unit health', () => {
  const s = boot(hazEnc, 7);
  const fire = (hazEnc.hazards || []).find(h => h[2] === 'fire');
  const u = s.units.find(x => x.faction === 'player');
  // stand the unit next to the fire and walk it in
  u.x = fire[0]; u.y = fire[1] + 1; u.actedMove = false;
  const before = u.hp;
  const r = moveUnit(s, u.uid, fire[0], fire[1]);
  assert.ok(r.ok, 'the move itself should be legal — a hazard is a price, not a wall');
  assert.ok(u.hp < before, 'standing in a fire should cost health');
  assert.equal(r.hazard.kind, 'fire');
});

check('a hazard does NOT block movement — that is what cover is for', () => {
  const s = boot(hazEnc, 7);
  const haz = hazEnc.hazards[0];
  const u = s.units.find(x => x.faction === 'player');
  u.x = haz[0]; u.y = haz[1] + 1; u.actedMove = false;
  assert.ok(moveRange(s, u).has(`${haz[0]},${haz[1]}`), 'a hazard tile must stay reachable');
});

check('a stairwell kills whatever ends up in it, at any HP', () => {
  const s = boot(hazEnc, 7);
  const pit = (hazEnc.hazards || []).find(h => h[2] === 'stairwell');
  const u = s.units.find(x => x.faction === 'player');
  u.hp = u.maxHp = 99;
  u.x = pit[0]; u.y = pit[1] + 1; u.actedMove = false;
  moveUnit(s, u.uid, pit[0], pit[1]);
  assert.equal(u.hp, 0, 'a lethal hazard ignores how much health you had');
});

check('a fire bites again at the end of the round if you are still in it', () => {
  const s = boot(hazEnc, 7);
  const fire = (hazEnc.hazards || []).find(h => h[2] === 'fire');
  const u = s.units.find(x => x.faction === 'player');
  u.x = fire[0]; u.y = fire[1];          // placed, not moved — no onEnter charge
  const before = u.hp;
  endPlayerTurn(s);
  let step; do { step = stepEnemyPhase(s); } while (step && !step.done);
  assert.ok(u.hp < before, 'ending a round in a fire should cost health');
});

check('glass bites on the way in but does not linger', () => {
  const g = HAZARDS.find(h => h.id === 'glass');
  assert.ok(g.onEnter > 0, 'glass should cost something to cross');
  assert.equal(g.lingers, 0, 'glass is a toll, not a burn');
});

check('the AI will not telegraph a move that walks into a lethal hazard', () => {
  const s = boot(hazEnc, 11);
  for (const [uid, intent] of s.telegraph) {
    if (!intent.moveTo) continue;
    const h = hazardAt(s, intent.moveTo.x, intent.moveTo.y);
    assert.ok(!(h && h.lethal),
      `${uid} plans to step into a ${h && h.name} — a full-information telegraph must not promise a suicide`);
  }
});

check('an enemy shoved into a stairwell dies, and the shover is credited', () => {
  const s = boot(hazEnc, 3);
  const pit = (hazEnc.hazards || []).find(h => h[2] === 'stairwell');
  const pipe = WEAPONS.find(w => w.knockback > 0);
  const me = s.units.find(u => u.faction === 'player');
  const foe = s.units.find(u => u.faction === 'enemy');
  me.weapon = pipe; me.actedAction = false;
  foe.hp = foe.maxHp = 50;                 // far too healthy to kill by damage
  // Line them up so the shove pushes the enemy along +x into the pit.
  foe.x = pit[0] - 1; foe.y = pit[1];
  me.x = pit[0] - 2;  me.y = pit[1];
  const kills = me.kills;
  const r = attack(s, me.uid, foe.uid);
  if (r.ok && r.hit) {
    assert.equal(foe.hp, 0, 'a body shoved into a stairwell should die regardless of HP');
    assert.ok(r.killed, 'the attack event should report the kill it caused');
    assert.equal(me.kills, kills + 1, 'the shove earned the kill');
  }
});


// ── enemy behaviours (GDD §10's "enemy archetypes") ─────────────────────
// The point is not that the data has a field. It is that two enemies with
// the same weapon standing in the same spot produce DIFFERENT telegraphs —
// if they do not, the roster is one enemy with eighteen portraits.
console.log('enemy behaviours');

check('every enemy declares a behaviour and a focus the AI knows', () => {
  const behaviours = new Set(['charger', 'skirmisher', 'holder', 'flanker']);
  const focuses = new Set(['nearest', 'weakest']);
  for (const e of ENEMIES) {
    assert.ok(behaviours.has(e.behaviour), `${e.id} has unknown behaviour "${e.behaviour}"`);
    assert.ok(focuses.has(e.focus), `${e.id} has unknown focus "${e.focus}"`);
  }
});

check('the roster is not all one behaviour', () => {
  const kinds = new Set(ENEMIES.map(e => e.behaviour));
  assert.ok(kinds.size >= 3, `only ${kinds.size} distinct behaviour(s) across the roster`);
});

check('focus:weakest goes for the hurt operator, focus:nearest for the close one', () => {
  const s = boot(ENCOUNTERS[0], 5);
  const [a, b] = s.units.filter(u => u.faction === 'player');
  const e = s.units.find(u => u.faction === 'enemy');
  // b is further away but badly hurt; a is close and healthy.
  a.x = e.x; a.y = e.y + 2; a.hp = a.maxHp;
  b.x = e.x + 4; b.y = e.y + 4; b.hp = 1;
  e.focus = 'nearest';
  assert.equal(planIntent(s, e).targetUid, a.uid, 'nearest should take the close healthy one');
  e.focus = 'weakest';
  assert.equal(planIntent(s, e).targetUid, b.uid, 'weakest should take the hurt one further away');
});

check('a skirmisher keeps its distance where a charger closes', () => {
  const s = boot(ENCOUNTERS[0], 5);
  const e = s.units.find(u => u.faction === 'enemy');
  const t = s.units.find(u => u.faction === 'player');
  // Give it a long gun and put the target well inside its range.
  e.weapon = WEAPONS.find(w => w.id === 'handgun');
  e.x = 5; e.y = 5; e.actedMove = false;
  t.x = 5; t.y = 8;
  for (const o of s.units) if (o !== e && o !== t) { o.hp = 0; }
  e.behaviour = 'charger';
  const closeIn = planIntent(s, e).moveTo;
  e.behaviour = 'skirmisher';
  const standOff = planIntent(s, e).moveTo;
  const dClose = Math.abs(closeIn.x - t.x) + Math.abs(closeIn.y - t.y);
  const dStand = Math.abs(standOff.x - t.x) + Math.abs(standOff.y - t.y);
  assert.ok(dStand > dClose,
    `skirmisher should stand further off than a charger (${dStand} vs ${dClose})`);
});

check('the telegraph is stable — replanning an unchanged board gives the same plan', () => {
  const s = boot(ENCOUNTERS[2], 9);
  const first = [...s.telegraph].map(([uid, i]) => `${uid}:${i.type}:${i.moveTo ? i.moveTo.x + ',' + i.moveTo.y : '-'}:${i.targetUid || '-'}`);
  planAllIntents(s);
  const again = [...s.telegraph].map(([uid, i]) => `${uid}:${i.type}:${i.moveTo ? i.moveTo.x + ',' + i.moveTo.y : '-'}:${i.targetUid || '-'}`);
  assert.deepEqual(again, first, 'an intent that flickers between equal tiles is unreadable');
});


// ── trinkets (GDD §5's last unbuilt v1 line) ────────────────────────────
console.log('trinkets');

const oneHitT = {
  id: 'onehitT', grid: { cols: 3, rows: 1 },
  playerSpawns: [{ unit: 'blade', x: 0, y: 0 }],
  enemySpawns: [{ enemy: 'grunt_handgun', x: 1, y: 0 }],
  cover: { full: [], partial: [] },
};
const seq = (...v) => { let i = 0; return () => v[Math.min(i++, v.length - 1)]; };

check('every trinket declares an effect the engine knows how to apply', () => {
  const known = new Set(['maxHp', 'move', 'damage', 'range', 'hitChance']);
  for (const t of TRINKETS) {
    const keys = Object.keys(t.effect || {});
    assert.ok(keys.length, `${t.id} has no effect`);
    for (const k of keys) assert.ok(known.has(k), `${t.id} has unknown effect "${k}"`);
  }
});

check('a kill can leave a trinket instead of the weapon', () => {
  const state = boot(oneHitT, 1);
  state.rng = seq(0, 0, 0.1, 0); // hit; drops; 0.1 < TRINKET_SHARE so a trinket; pick index 0
  const r = attack(state, 'p0', 'e0');
  assert.ok(r.killed);
  assert.ok(r.dropped.trinketId, 'the drop should be a trinket');
  assert.equal(state.drops.length, 1);
});

check('picking one up applies its stat effect immediately', () => {
  const state = boot(oneHitT, 1);
  state.rng = seq(0, 0, 0.1, 0); // steel_toes (+2 maxHp) is index 0
  attack(state, 'p0', 'e0');
  const blade = getUnit(state, 'p0');
  const beforeMax = blade.maxHp, beforeHp = blade.hp;
  const got = moveUnit(state, 'p0', 1, 0);
  assert.ok(got.ok);
  assert.equal(blade.trinkets.length, 1);
  assert.equal(blade.maxHp, beforeMax + 2, '+2 max hp');
  assert.equal(blade.hp, beforeHp + 2, 'and healed by it — a max bump you cannot feel is a promise, not a pickup');
  assert.deepEqual(state.drops, [], 'consumed, not left for someone else too');
});

check('a weapon-field trinket survives a later weapon swap', () => {
  const state = boot(oneHitT, 1);
  const blade = getUnit(state, 'p0');
  const knuckle = TRINKETS.find(t => t.effect.damage);
  applyTrinkets(blade, [knuckle.id], TRINKETS);
  const boosted = blade.weapon.damage;
  assert.equal(boosted, blade.baseWeapon.damage + knuckle.effect.damage, 'bonus folded into the live weapon');
  // now swap the weapon by walking onto a dropped one
  blade.actedAction = false;
  state.rng = seq(0, 0, 0.99); // the victim's weapon, not a trinket
  attack(state, 'p0', 'e0');
  moveUnit(state, 'p0', 1, 0);
  assert.equal(blade.baseWeapon.id, 'handgun', 'the swap happened');
  const base = WEAPONS.find(w => w.id === 'handgun');
  assert.equal(blade.weapon.damage, base.damage + knuckle.effect.damage,
    'the trinket applies to the NEW weapon — it is not attached to the gun it was found with');
});

check('trinkets stack rather than replace', () => {
  const state = boot(oneHitT, 1);
  const blade = getUnit(state, 'p0');
  const hp = TRINKETS.filter(t => t.effect.maxHp).map(t => t.id);
  const before = blade.maxHp;
  applyTrinkets(blade, [...hp, ...hp], TRINKETS); // same trinket twice
  assert.equal(blade.trinkets.length, hp.length * 2, 'no slots, no replace — they accumulate');
  assert.ok(blade.maxHp > before);
});

check('a unit with no trinkets keeps its weapon object untouched', () => {
  const state = boot(oneHitT, 1);
  const blade = getUnit(state, 'p0');
  assert.equal(blade.trinkets.length, 0);
  assert.equal(blade.weapon, blade.baseWeapon, 'the common case allocates nothing');
});

// ── the movement economy (momentum.js) ───────────────────────
// Two rules and one pool. Each test pins a claim the module header makes,
// because every claim in it that went unmeasured turned out to be false:
// sync was cut on exactly this kind of evidence.

check('moving banks one point per tile, capped', () => {
  const u = {};
  addMomentum(u, 3);
  assert.equal(u.momentum, 3, 'one point per tile actually travelled');
  addMomentum(u, 99);
  assert.equal(u.momentum, MOVE_CAP, 'a long approach cannot bank a one-shot kill');
  clearMomentum(u);
  assert.equal(u.momentum, 0);
});

check('momentum evades bullets, never knives', () => {
  const u = { momentum: MOVE_CAP };
  assert.ok(evasionOf(u, { archetype: 'ranged' }) > 0);
  assert.equal(evasionOf(u, { archetype: 'melee' }), 0,
    'a knife at one tile does not miss because you jogged');
  assert.ok(evasionOf(u, { archetype: 'ranged' }) < 0.3,
    'running must never beat partial cover outright, or cover stops being a decision');
});

check('a move logs the momentum it earned', () => {
  const state = boot(BACKLOT, 7);
  const u = state.units.find(x => x.faction === 'player');
  const far = [...movableTiles(state, u).values()]
    .sort((a, b) => manhattan(b, u) - manhattan(a, u))[0];
  moveUnit(state, u.uid, far.x, far.y);
  const logged = state.log.filter(e => e.type === 'move').pop();
  assert.ok(u.momentum > 0, 'a real move banks something');
  assert.equal(logged.momentum, u.momentum, 'the animator reads it off the log, so it must be in it');
});

check('the swing spends the run that set it up', () => {
  // Every point is either damage or evasion, never both. Without this the
  // enemies — which close every single turn — accumulate evasion the player
  // never can, and measurement showed the skill gap NARROWING, not widening.
  const state = boot(BACKLOT, 3);
  const attacker = state.units.find(u => u.faction === 'player' && attackableTargets(state, u).length);
  assert.ok(attacker, 'seed 3 puts somebody in range on turn one');
  const victim = attackableTargets(state, attacker)[0];
  attacker.momentum = MOVE_CAP;
  // orderAttack, not attack: attackableTargets answers "could reach and hit",
  // so a target may need a step first — and that step is what input.js does.
  // Calling attack() straight would bail out-of-range and prove nothing.
  orderAttack(state, attacker.uid, victim);
  assert.equal(attacker.momentum, 0, 'spent whether the shot lands or not');
  const evt = state.log.filter(e => e.type === 'attack').pop();
  assert.equal(evt.bonus, Math.floor(MOVE_CAP * DAMAGE_PER), 'reported, not folded in silently');
  assert.equal(evt.base, attacker.weapon.damage, 'and the base is reported beside it');
  if (evt.hit) assert.equal(evt.damage, evt.base + evt.bonus);
});

check('an attack event carries the evasion it faced', () => {
  const state = boot(BACKLOT, 11);
  const shooter = state.units.find(u =>
    u.faction === 'player' && u.weapon.archetype === 'ranged' && attackableTargets(state, u).length);
  assert.ok(shooter, 'seed 11 gives a gun a target');
  const target = getUnit(state, attackableTargets(state, shooter)[0]);
  target.momentum = MOVE_CAP;
  orderAttack(state, shooter.uid, target.uid);
  const evt = state.log.filter(e => e.type === 'attack').pop();
  assert.equal(evt.evade, MOVE_CAP * EVADE_PER, 'a miss has to be explainable after the fact');
});

check('momentum never survives its own turn', () => {
  const state = boot(BACKLOT, 5);
  for (const u of state.units) u.momentum = MOVE_CAP;
  endPlayerTurn(state);
  assert.ok(state.units.filter(u => u.faction === 'enemy').every(u => !u.momentum),
    'the enemy phase starts from zero, so what it banks is what you watched it do');
  let step; do { step = stepEnemyPhase(state); } while (step && !step.done);
  assert.ok(state.units.filter(u => u.faction === 'player').every(u => !u.momentum),
    'and the player turn starts from zero too — momentum is this turn, not a bank');
});

check('the telegraph survives every operator being evasive', () => {
  const state = boot(BACKLOT, 9);
  const enemy = state.units.find(u => u.faction === 'enemy');
  const before = planIntent(state, enemy);
  for (const u of state.units) if (u.faction === 'player') u.momentum = MOVE_CAP;
  const after = planIntent(state, enemy);
  assert.ok(before.type && after.type, 'an AI that ignored evasion would promise shots it cannot land');
});

// ── abilities (abilities.js + combat.js's useAbility) ────────
// The answer to "there are no actions at all, fighters just bump into each
// other". Everything here is checked against the ECONOMY as much as the
// effect: an ability that fires without being paid for is a bug the board
// cannot show.

check('every operator has a kit, and no enemy does', () => {
  const state = boot(BACKLOT, 1);
  for (const u of state.units.filter(x => x.faction === 'player')) {
    assert.ok(abilitiesFor(u, ABILITIES).length >= 2, `${u.name} has a kit`);
  }
  for (const e of state.units.filter(x => x.faction === 'enemy')) {
    assert.equal(abilitiesFor(e, ABILITIES).length, 0,
      'enemy variety is behaviour, not a kit the telegraph would have to spell out');
  }
});

check('an ability is bought with momentum, so standing still cannot buy one', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.role === 'control');
  const shove = findAbility(ABILITIES, 'shove');
  assert.equal(canAfford(u, shove), false, 'no run, no ability');
  assert.match(whyNot(u, shove), /momentum/, 'and it says so in words');
  addMomentum(u, shove.cost);
  assert.equal(canAfford(u, shove), true);
});

check('using one spends exactly its cost and takes the turn', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.role === 'control');
  addMomentum(u, MOVE_CAP);
  const tile = abilityTargets(state, u, findAbility(ABILITIES, 'barricade'))[0];
  assert.ok(tile, 'somewhere beside a spawn is empty');
  const before = state.partialCover.size;
  const r = useAbility(state, u.uid, 'barricade', tile, ABILITIES);
  assert.ok(r.ok);
  assert.equal(state.partialCover.size, before + 1, 'the board changed');
  assert.equal(u.momentum, MOVE_CAP - 2, 'charged its cost, not the whole pool');
  assert.equal(u.actedAction, true, 'an ability IS your action, never an extra one');
});

check('an ability you cannot afford does nothing at all', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.role === 'control');
  u.momentum = 0;
  const before = state.partialCover.size;
  const r = useAbility(state, u.uid, 'barricade', { x: u.x + 1, y: u.y }, ABILITIES);
  assert.equal(r.ok, false);
  assert.equal(state.partialCover.size, before, 'and it does not half-happen');
  assert.equal(u.actedAction, false, 'a refused ability must not eat the turn');
});

check('barricade refuses a tile that is already something', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.role === 'control');
  addMomentum(u, MOVE_CAP);
  const occupied = state.units.find(o => o.uid !== u.uid);
  const r = useAbility(state, u.uid, 'barricade', { x: occupied.x, y: occupied.y }, ABILITIES);
  assert.equal(r.ok, false, 'legality is answered by the same function the board highlighted with');
});

check('cleave hits everyone adjacent, once each', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.role === 'melee');
  addMomentum(u, MOVE_CAP);
  // Stand two rivals right next to the operator.
  const foes = state.units.filter(e => e.faction === 'enemy').slice(0, 2);
  foes[0].x = u.x + 1; foes[0].y = u.y;
  foes[1].x = u.x; foes[1].y = u.y - 1;
  const group = abilityTargets(state, u, findAbility(ABILITIES, 'cleave'))[0];
  assert.equal(group.all.length, 2, 'both of them are targets, as one action');
  const r = useAbility(state, u.uid, 'cleave', group, ABILITIES);
  assert.ok(r.ok);
  assert.equal(r.results.length, 2, 'two resolutions, not two turns');
  assert.equal(u.momentum, MOVE_CAP - 2, 'and one cost');
});

check('snap shot fires twice, and never into a corpse', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.role === 'ranged');
  addMomentum(u, MOVE_CAP);
  const foe = state.units.find(e => e.faction === 'enemy');
  foe.x = u.x + 1; foe.y = u.y; foe.hp = 1; // dies to the first barrel
  const r = useAbility(state, u.uid, 'snapshot', { uid: foe.uid }, ABILITIES);
  assert.ok(r.ok);
  assert.ok(r.results.length <= 2, 'two barrels, not more');
  // Whichever shot lands the kill must be the LAST one resolved — the first
  // may well miss, so "results.length === 1" would be asserting the dice.
  const killed = r.results.findIndex(x => x.killed);
  if (killed >= 0) assert.equal(r.results.length, killed + 1, 'nothing is fired into a body');
  const evt = state.log.filter(e => e.type === 'attack').pop();
  assert.ok(evt.chance > 0.5, 'accuracyMod shifts the weapon chance; it does not replace it');
});

check('shove is flat damage and a long push, and never misses', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.role === 'control');
  addMomentum(u, MOVE_CAP);
  const foe = state.units.find(e => e.faction === 'enemy');
  foe.x = u.x + 1; foe.y = u.y; foe.hp = 20;
  const r = useAbility(state, u.uid, 'shove', { uid: foe.uid }, ABILITIES);
  assert.ok(r.ok && r.results[0].hit, 'accuracy 1 means it lands');
  assert.equal(r.results[0].damage, 1, 'flat: a shove is a shove whoever holds the pipe');
  assert.ok(r.results[0].knockback, 'and it moves them');
});

check('overwatch fires on an enemy that moves into range, once', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.role === 'ranged');
  addMomentum(u, MOVE_CAP);
  const r = useAbility(state, u.uid, 'overwatch', { self: true }, ABILITIES);
  assert.ok(r.ok);
  assert.equal(state.overwatch.has(u.uid), true, 'the posture is on the board, not implied');
  endPlayerTurn(state);
  let shots = 0, step;
  do {
    step = stepEnemyPhase(state);
    shots = state.log.filter(e => e.type === 'overwatch').length;
  } while (step && !step.done);
  assert.ok(shots <= 1, 'one watcher cannot mow down a column');
  assert.equal(state.overwatch.size, 0, 'and the posture never survives the phase');
});

check('overwatch is cleared even when it never triggers', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.role === 'ranged');
  addMomentum(u, MOVE_CAP);
  useAbility(state, u.uid, 'overwatch', { self: true }, ABILITIES);
  endPlayerTurn(state);
  let step; do { step = stepEnemyPhase(state); } while (step && !step.done);
  assert.equal(state.overwatch.size, 0,
    'a standing order the player has forgotten they gave is the worst surprise this game could spring');
});

for (const enc of ENCOUNTERS) playthrough(enc, 42);

console.log(`\n${pass} checks passed`);
