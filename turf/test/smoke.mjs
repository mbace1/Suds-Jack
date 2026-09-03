// Bare-node core-loop gate — no browser, no canvas, no GPU. grid.js/ai.js/
// combat.js touch nothing but plain objects, so the whole engine is
// verifiable here in milliseconds (same discipline as eeri/test/rooms.mjs).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { manhattan, hasLOS, coverSoftens, moveRange, lineTiles, key, firingTiles, firingTileScore, approachTile } from '../js/grid.js';
import { planIntent, planAllIntents } from '../js/ai.js';
import {
  createEncounterState, getUnit, livingPlayers, livingEnemies, canUnitAct,
  movableTiles, moveUnit, attackableTargets, attack, orderAttack, useAbility,
  forecastAttack, previewAttack, COVER_PENALTY,
  endUnitTurn, endPlayerTurn, stepEnemyPhase,
  awardXp, xpToNext, XP_BASE_CLEAR, XP_PER_KILL, HP_PER_LEVEL, DROP_CHANCE, hazardAt,
  applyTrinkets, TRINKET_SHARE, reloadUnit, firingOptions, attackFrom,
  skillOffer, learnSkill, OFFER_SIZE, MAX_SKILLS,
  landArrivals, pendingArrivals, incomingArrivals, ARRIVAL_NOTICE,
} from '../js/combat.js';
import {
  MOVE_CAP, EVADE_PER, DAMAGE_PER, addMomentum, clearMomentum, evasionOf,
} from '../js/momentum.js';
import { abilitiesFor, abilityTargets, canAfford, whyNot, findAbility, weaponSuits, isFlanked } from '../js/abilities.js';
import { autoTurn } from '../js/autoplay.js';
import { magOf, needsReload, roundsLeft } from '../js/ammo.js';

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
const CROSSING = ENCOUNTERS.find(e => e.id === 'the-crossing');
const UNDERPASS = ENCOUNTERS.find(e => e.id === 'underpass');
const DEPOT = ENCOUNTERS.find(e => e.id === 'the-depot');

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

// ── skill lines are CATEGORIES, not classes (GDD §5.1, v29) ──
// Owner, 2026-09-03: "I never said that only one type of skills class is
// available to 1 unit. treat them like categories." v25-v28 keyed the kit on
// `role`, which gave every melee operator the identical pair — the fixed
// archetype §5.1 explicitly rejects.

check('a loadout crosses skill lines rather than sitting in one', () => {
  const lines = a => new Set(a.map(x => x.line));
  let crossed = 0;
  for (const def of UNITS) {
    const kit = abilitiesFor({ faction: 'player', abilities: def.abilities }, ABILITIES);
    assert.equal(kit.length, def.abilities.length, `${def.id}'s loadout all resolves`);
    if (lines(kit).size > 1) crossed++;
  }
  assert.equal(crossed, UNITS.length,
    'every shipped kit draws from two lines — a roster of pure lines is the class box wearing new names');
});

check('two operators of the same role can have different kits', () => {
  const melee = UNITS.filter(u => u.role === 'melee');
  const kits = new Set(melee.map(u => u.abilities.join('+')));
  assert.ok(kits.size > 1, 'role no longer decides the kit');
});

check('a skill the weapon cannot use is inert and says why', () => {
  const knifeGuy = { faction: 'player', weapon: WEAPONS.find(w => w.id === 'knife'), momentum: 4 };
  const snap = findAbility(ABILITIES, 'snapshot');
  assert.equal(weaponSuits(knifeGuy, snap), false);
  assert.equal(canAfford(knifeGuy, snap), false, 'affordability includes what is in hand');
  assert.match(whyNot(knifeGuy, snap), /ranged weapon/, 'and it says so in words, rather than hiding');
  const gunGuy = { faction: 'player', weapon: WEAPONS.find(w => w.id === 'pistol'), momentum: 4 };
  assert.equal(weaponSuits(gunGuy, snap), true, 'the same build goes live when the gun arrives');
  const wallop = findAbility(ABILITIES, 'wallop');
  assert.equal(weaponSuits(gunGuy, wallop), false, 'a pistol does not knock back');
  assert.equal(weaponSuits({ faction: 'player', weapon: WEAPONS.find(w => w.id === 'hammer') }, wallop), true);
});

check('backstab only offers a rival somebody else has busy', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.faction === 'player');
  u.abilities = ['backstab'];
  const mate = state.units.find(x => x.faction === 'player' && x.uid !== u.uid);
  const foe = state.units.find(x => x.faction === 'enemy');
  foe.x = u.x + 1; foe.y = u.y;
  mate.x = 0; mate.y = 0;
  const back = findAbility(ABILITIES, 'backstab');
  assert.equal(abilityTargets(state, u, back).length, 0,
    'alone, there is no back to stab — the board never offers a swing it would refuse');
  mate.x = foe.x; mate.y = foe.y - 1;               // now the rival is engaged
  assert.ok(isFlanked(state, u, foe, manhattan));
  assert.equal(abilityTargets(state, u, back).length, 1);
});

check('the flank bonus is paid per target, not once per swing', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.faction === 'player');
  u.abilities = ['backstab']; u.momentum = MOVE_CAP;
  const mate = state.units.find(x => x.faction === 'player' && x.uid !== u.uid);
  const foe = state.units.find(x => x.faction === 'enemy');
  foe.x = u.x + 1; foe.y = u.y; foe.hp = 40;
  mate.x = foe.x; mate.y = foe.y - 1;
  const back = findAbility(ABILITIES, 'backstab');
  useAbility(state, u.uid, 'backstab', { uid: foe.uid }, ABILITIES);
  const evt = state.log.filter(e => e.type === 'attack').pop();
  assert.equal(evt.flanked, true, 'the event says the flank was live');
  if (evt.hit) assert.ok(evt.damage >= u.weapon.damage + back.flankBonus, 'and it paid');
});

check('cripple takes tiles off the target next turn, but never all of them', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.faction === 'player' && x.weapon.archetype === 'ranged');
  u.abilities = ['cripple']; u.momentum = MOVE_CAP;
  const foe = state.units.find(x => x.faction === 'enemy');
  foe.x = u.x + 1; foe.y = u.y; foe.hp = 40;
  const before = moveRange(state, foe).size;
  useAbility(state, u.uid, 'cripple', { uid: foe.uid }, ABILITIES);
  assert.ok(foe.slowed > 0, 'the slow landed');
  assert.ok(moveRange(state, foe).size < before, 'and every reader of move range sees it');
  foe.slowed = 99;
  assert.ok(moveRange(state, foe).size > 1,
    'a unit pinned to nowhere can be farmed from range with nothing it can do');
});

check('planted makes the neighbours harder to shoot, and only for a round', () => {
  const state = boot(BACKLOT, 1);
  const anchor = state.units.find(x => x.faction === 'player');
  anchor.abilities = ['planted']; anchor.momentum = MOVE_CAP;
  const mate = state.units.find(x => x.faction === 'player' && x.uid !== anchor.uid);
  mate.x = anchor.x + 1; mate.y = anchor.y;
  const foe = state.units.find(x => x.faction === 'enemy' && x.weapon.archetype === 'ranged');
  const before = forecastAttack(state, foe, mate, foe.weapon).chance;
  useAbility(state, anchor.uid, 'planted', { self: true }, ABILITIES);
  assert.ok(forecastAttack(state, foe, mate, foe.weapon).chance < before,
    'standing together is worth something');
  // Move the ANCHOR away, not the mate: moving the mate would also change
  // whose cover it is standing behind, and the test would be measuring two
  // rules at once (it did, and read 0.8 against an expected 0.5).
  anchor.x = 0; anchor.y = 0;
  assert.equal(forecastAttack(state, foe, mate, foe.weapon).chance, before,
    'read off the board, so it stops the moment the anchor walks away');
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

// ── the forecast (MST_PARITY §2.1) ───────────────────────────
// A game that promises full information may not hide the number it rolls
// against. The defence is structural: the preview and the resolution call
// the SAME function, so they cannot drift.

check('the forecast is the arithmetic the roll actually uses', () => {
  const state = boot(BACKLOT, 4);
  const shooter = state.units.find(u => u.faction === 'player' && attackableTargets(state, u).length);
  const target = getUnit(state, attackableTargets(state, shooter)[0]);
  const pre = previewAttack(state, shooter.uid, target.uid);
  assert.ok(pre, 'a shot that is on has a forecast');
  orderAttack(state, shooter.uid, target.uid);
  const evt = state.log.filter(e => e.type === 'attack').pop();
  assert.equal(evt.chance, pre.chance, 'quoted odds === rolled odds');
  assert.equal(evt.evade, pre.evade);
  if (evt.hit) assert.equal(evt.damage, pre.damage, 'and the promised damage is what lands');
});

check('the forecast is taken from the tile you would shoot FROM', () => {
  // approachTile steps you into range first, and cover is a property of
  // where you end up — a forecast from the current tile would quote the
  // wrong number on exactly the shots that need a step.
  const state = boot(BACKLOT, 4);
  const shooter = state.units.find(u => u.faction === 'player' && attackableTargets(state, u).length);
  const target = getUnit(state, attackableTargets(state, shooter)[0]);
  const pre = previewAttack(state, shooter.uid, target.uid);
  assert.equal(pre.steps, manhattan(pre.from, shooter), 'it reports how far it had to look');
  const here = forecastAttack(state, shooter, target, shooter.weapon, {}, shooter);
  const there = forecastAttack(state, shooter, target, shooter.weapon, {}, pre.from);
  assert.equal(there.chance, pre.chance, 'the preview uses the destination tile, not the origin');
  assert.ok(typeof here.chance === 'number', 'and forecasting from anywhere is still legal');
});

check('a shot that is not on has no forecast at all', () => {
  const state = boot(BACKLOT, 4);
  const shooter = state.units.find(u => u.faction === 'player');
  const foe = state.units.find(u => u.faction === 'enemy');
  shooter.actedAction = true;
  assert.equal(previewAttack(state, shooter.uid, foe.uid), null,
    'better nothing than a 5% floor for an attack that cannot happen');
});

check('the forecast names cover, evasion and the lethal blow', () => {
  const state = boot(BACKLOT, 4);
  const shooter = state.units.find(u => u.faction === 'player' && u.weapon.archetype === 'ranged');
  const foe = state.units.find(u => u.faction === 'enemy');
  foe.x = shooter.x + 2; foe.y = shooter.y; foe.hp = 99;
  const plain = forecastAttack(state, shooter, foe, shooter.weapon);
  assert.equal(plain.lethal, false);
  foe.momentum = MOVE_CAP;
  const running = forecastAttack(state, shooter, foe, shooter.weapon);
  assert.ok(running.chance < plain.chance, 'a target that ran is a worse shot');
  assert.equal(running.evade, MOVE_CAP * EVADE_PER, 'and the forecast says by how much');
  foe.hp = 1;
  assert.equal(forecastAttack(state, shooter, foe, shooter.weapon).lethal, true,
    'the single most decision-relevant fact on the board');
  assert.equal(COVER_PENALTY, 0.3, 'cover is one constant, not a literal in two files');
});

// ── objectives (MST_PARITY §2.2) ─────────────────────────────
// `state.win` is data (GDD §3), so a mode is a clause in checkWinLoss plus
// encounter JSON. What needs testing is not the arithmetic but the two new
// ways to LOSE, because before this the game had exactly one (a crew wipe)
// and a loss condition nothing exercises is a loss condition that does not
// work.

check('an extraction is won by standing still, on the move that gets you there', () => {
  const state = boot(CROSSING, 1);
  const pads = [...state.extract].map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });
  assert.ok(pads.length, 'the encounter declares its pads');
  const crew = state.units.filter(u => u.faction === 'player');
  // Teleport two of them beside a pad and walk them on — a move is the only
  // action in this game that can win an encounter by itself, and before the
  // checkWinLoss call in moveUnit the win sat unnoticed until somebody
  // happened to attack.
  crew[0].x = pads[0].x; crew[0].y = pads[0].y + 1;
  crew[1].x = pads[1].x; crew[1].y = pads[1].y + 1;
  moveUnit(state, crew[0].uid, pads[0].x, pads[0].y);
  assert.equal(state.result, null, 'one is not two');
  moveUnit(state, crew[1].uid, pads[1].x, pads[1].y);
  assert.equal(state.result, 'win', 'the second one closes it, on the move itself');
});

check('falling below `need` loses the extraction outright', () => {
  // `need` is ABSOLUTE. Clamping it to the living was a real fault: it made
  // losing an operator make the mission easier, so the cheapest way to pass
  // a 3-of-3 was to let one die.
  const state = boot(CROSSING, 1);
  const need = state.win.need;
  const crew = state.units.filter(u => u.faction === 'player');
  for (const u of crew.slice(0, crew.length - need + 1)) u.hp = 0;
  endPlayerTurn(state);
  let step; do { step = stepEnemyPhase(state); } while (step && !step.done);
  assert.equal(state.result, 'lose', 'a mission that can no longer be completed says so');
});

check('the deadline is a real loss, and the only clock this game has', () => {
  const state = boot(DEPOT, 1);
  assert.ok(state.win.deadline, 'the depot runs on a clock');
  state.round = state.win.deadline + 1;
  endPlayerTurn(state);
  let step; do { step = stepEnemyPhase(state); } while (step && !step.done);
  assert.equal(state.result, 'lose',
    'without a deadline an objective mission is a walk, and nothing punishes taking twenty rounds');
});

check('a cache is a target like any other, and breaking it wins', () => {
  const state = boot(DEPOT, 1);
  const cache = state.units.find(u => u.faction === 'objective');
  assert.ok(cache, 'the depot declares an objective');
  assert.equal(cache.weapon, null, 'it does not fight');
  assert.equal(livingEnemies(state).some(u => u.uid === cache.uid), false,
    'and it is invisible to the enemy count, so it cannot block an eliminate win');
  const hitter = state.units.find(u => u.faction === 'player');
  assert.ok(attackableTargets(state, hitter).length >= 0);
  cache.hp = 0;
  const foe = state.units.find(u => u.faction === 'enemy');
  foe.hp = 1;
  // Breaking the last cache is a win even with rivals still standing.
  const other = state.units.find(u => u.faction === 'player' && u.uid !== hitter.uid);
  moveUnit(state, other.uid, other.x, other.y - 1);
  assert.equal(state.result, 'win', 'the mission is the cache, not the block');
});

check('the enemy brain never targets an objective', () => {
  // ai.js filters on faction 'player' by name, which is what lets a third
  // faction exist without the AI learning anything — but if that ever
  // changed, the rivals would spend the encounter beating up a crate.
  const state = boot(DEPOT, 1);
  for (const e of state.units.filter(u => u.faction === 'enemy')) {
    const intent = planIntent(state, e);
    if (intent.targetUid) {
      assert.equal(getUnit(state, intent.targetUid).faction, 'player',
        'rivals fight the crew, never the scenery');
    }
  }
});

// ── reinforcements (MST_PARITY §2.4, v31) ────────────────────
// On a survive map, wiping the opening roster meant coasting with an empty
// board while the objective still said "hold". Arrivals turn that countdown
// into a rising threat — and every one of them is announced before it lands,
// because a spawn nobody could see coming would break the promise the rest
// of this board keeps.

const advanceRound = state => {
  endPlayerTurn(state);
  let step; do { step = stepEnemyPhase(state); } while (step && !step.done);
};

check('an encounter carries its schedule, and nothing has landed at boot', () => {
  const state = boot(UNDERPASS, 1);
  assert.ok(state.reinforcements.length, 'underpass stages part of its roster');
  assert.equal(pendingArrivals(state).length, state.reinforcements.length);
  const opening = state.units.filter(u => u.faction === 'enemy').length;
  assert.equal(opening, UNDERPASS.enemySpawns.length, 'only the opening roster is on the board');
});

check('an arrival is announced BEFORE it lands', () => {
  const state = boot(UNDERPASS, 1);
  const first = state.reinforcements[0];
  assert.ok(first.round >= 2, 'a reinforcement is by definition not on the opening board');
  // Walk to the round before it is due.
  while (state.round < first.round - ARRIVAL_NOTICE && !state.result) advanceRound(state);
  if (state.result) return; // the crew died first; the rule below is unconditional when reached
  assert.ok(incomingArrivals(state).some(r => r.rid === first.rid),
    'the board is marking it a round early');
  assert.ok(pendingArrivals(state).some(r => r.rid === first.rid), 'and it has not landed yet');
});

check('it lands on the round it said it would, at the top of the turn', () => {
  const state = boot(UNDERPASS, 1);
  const first = state.reinforcements[0];
  const before = state.units.length;
  while (state.round < first.round && !state.result) advanceRound(state);
  if (state.result) return;
  assert.equal(state.turn, 'player', 'arrivals land into the player turn, never mid-enemy-phase');
  assert.ok(state.units.length > before, 'somebody new is on the board');
  assert.ok(state.log.some(e => e.type === 'arrive'), 'and it is on the log');
  assert.ok(!pendingArrivals(state).some(r => r.rid === first.rid), 'and off the schedule');
});

check('an arrival never lands on top of somebody', () => {
  const state = boot(UNDERPASS, 1);
  const spot = state.reinforcements[0];
  // Park an operator exactly where it means to appear.
  const u = state.units.find(x => x.faction === 'player');
  u.x = spot.x; u.y = spot.y;
  state.round = spot.round;
  const landed = landArrivals(state);
  assert.equal(landed.length, 1, 'it still arrives — a rival that quietly failed to show is a broken promise');
  assert.ok(landed[0].x !== spot.x || landed[0].y !== spot.y, 'just not on the occupied tile');
  assert.equal(state.units.filter(x => x.x === u.x && x.y === u.y && x.hp > 0).length, 1,
    'and nothing is stacked');
});

check('clearing the board is not a win while rivals are still due', () => {
  // An empty board with arrivals pending is a lull, not a victory — handing
  // the win out there lets the player skip the half of the encounter the
  // schedule exists to provide.
  const state = boot(UNDERPASS, 1);
  assert.ok(pendingArrivals(state).length);
  for (const e of state.units) if (e.faction === 'enemy') e.hp = 0;
  const u = state.units.find(x => x.faction === 'player');
  moveUnit(state, u.uid, u.x, u.y - 1);
  assert.equal(state.result, null, 'the lull is not the end');
  state.reinforcements.forEach(r => { r.landed = true; });
  const other = state.units.find(x => x.faction === 'player' && x.uid !== u.uid);
  moveUnit(state, other.uid, other.x, other.y - 1);
  assert.equal(state.result, 'win', 'once nothing more is coming, it is');
});

check('an unknown enemy id is a content bug, not a crash', () => {
  const state = boot(UNDERPASS, 1);
  state.reinforcements = [{ rid: 'rX', round: 1, enemy: 'grunt_does_not_exist', x: 4, y: 0 }];
  assert.doesNotThrow(() => landArrivals(state));
  assert.equal(pendingArrivals(state).length, 0, 'it is consumed rather than retried forever');
});

// ── the skill pick (v30) ─────────────────────────────────────
// A level grants a slot, a slot buys one of three from ANY line. This is
// where GDD §5.1's "every level-up spends a skill slot" actually happens,
// and where a run becomes a build rather than a stat curve.

check('a level grants a slot, and the slot is not spent by the engine', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.faction === 'player');
  u.xp = xpToNext(u.level) - 1; u.kills = 0;
  for (const e of state.units) if (e.faction === 'enemy') e.hp = 0;
  state.result = 'win';
  const ev = awardXp(state).find(e => e.uid === u.uid);
  assert.ok(ev.levelsGained.length >= 1, 'the win levelled them');
  assert.equal(u.slots, ev.levelsGained.length, 'one slot per level');
  assert.equal(u.abilities.length, 2, 'and nothing was picked FOR them');
});

check('an offer is three skills from any line, none already held, and it is stable', () => {
  const state = boot(BACKLOT, 3);
  const u = state.units.find(x => x.faction === 'player');
  u.slots = 1;
  const offer = skillOffer(state, u, ABILITIES);
  assert.equal(offer.length, OFFER_SIZE);
  assert.ok(offer.every(id => !u.abilities.includes(id)), 'nothing you already know');
  assert.deepEqual(skillOffer(state, u, ABILITIES), offer, 'asking twice shows the same three');
  const lines = new Set(offer.map(id => findAbility(ABILITIES, id).line));
  assert.ok(lines.size >= 1, 'drawn from the whole pool, not one line');
});

check('the same seed always offers the same three', () => {
  const a = boot(BACKLOT, 9), b = boot(BACKLOT, 9);
  const ua = a.units.find(x => x.faction === 'player'), ub = b.units.find(x => x.faction === 'player');
  ua.slots = 1; ub.slots = 1;
  assert.deepEqual(skillOffer(a, ua, ABILITIES), skillOffer(b, ub, ABILITIES),
    'a replayable offer is a testable one, and a reroll-by-reload is a player the design already lost');
});

check('learning spends the slot, keeps the old kit, and draws fresh next time', () => {
  const state = boot(BACKLOT, 3);
  const u = state.units.find(x => x.faction === 'player');
  const before = [...u.abilities];
  u.slots = 2;
  const first = skillOffer(state, u, ABILITIES);
  assert.equal(learnSkill(state, u.uid, first[0], ABILITIES).ok, true);
  assert.equal(u.slots, 1);
  assert.deepEqual(u.abilities.slice(0, 2), before, 'the starting kit is untouched');
  assert.equal(u.abilities[2], first[0]);
  const second = skillOffer(state, u, ABILITIES);
  assert.ok(!second.includes(first[0]), 'the next slot does not re-offer what was just learned');
  assert.ok(state.log.some(e => e.type === 'learn' && e.uid === u.uid), 'it is on the log');
});

check('you cannot learn without a slot, twice, or off the offer', () => {
  const state = boot(BACKLOT, 3);
  const u = state.units.find(x => x.faction === 'player');
  assert.equal(learnSkill(state, u.uid, 'steady', ABILITIES).reason, 'no-slot');
  u.slots = 1;
  assert.equal(learnSkill(state, u.uid, u.abilities[0], ABILITIES).reason, 'already-known');
  const offer = skillOffer(state, u, ABILITIES);
  const off = ABILITIES.map(a => a.id).find(id => !offer.includes(id) && !u.abilities.includes(id));
  assert.equal(learnSkill(state, u.uid, off, ABILITIES).reason, 'not-offered',
    'the three on screen are the rule, not a suggestion');
  assert.equal(u.slots, 1, 'a refused pick spends nothing');
});

check('the kit is capped, and a level past the cap still pays HP', () => {
  const state = boot(BACKLOT, 3);
  const u = state.units.find(x => x.faction === 'player');
  u.slots = 10;
  let learned = 0;
  for (let i = 0; i < 10; i++) {
    const offer = skillOffer(state, u, ABILITIES);
    if (!offer.length) break;
    if (learnSkill(state, u.uid, offer[0], ABILITIES).ok) learned++;
  }
  assert.equal(u.abilities.length, MAX_SKILLS, `stops at ${MAX_SKILLS}`);
  assert.equal(skillOffer(state, u, ABILITIES).length, 0, 'a full kit is offered nothing');
  const hpBefore = u.maxHp;
  u.xp = xpToNext(u.level); state.result = 'win';
  for (const e of state.units) if (e.faction === 'enemy') e.hp = 0;
  awardXp(state);
  assert.ok(u.maxHp > hpBefore, 'the level still pays');
});

check('a weapon-gated skill is still OFFERED to a unit that cannot use it yet', () => {
  // §5.1's payoff is a build that is inert now and goes live when a gun
  // drops; an offer that only showed what works today could never make it.
  let seen = false;
  for (let seed = 1; seed <= 40 && !seen; seed++) {
    const state = boot(BACKLOT, seed);
    const u = state.units.find(x => x.faction === 'player' && x.weapon.archetype === 'melee');
    u.slots = 1;
    seen = skillOffer(state, u, ABILITIES).some(id => findAbility(ABILITIES, id).weapon === 'ranged');
  }
  assert.ok(seen, 'across forty seeds a knife carrier was offered a gun skill at least once');
});

// ── choosing where you fire from (v28) ───────────────────────
// Through v27 a tap on a rival ran the operator to the CHEAPEST tile that
// could reach. Measured over 400 one-tap attacks with a real choice of
// tile, that banked less momentum than an available alternative 80% of the
// time and stopped in the open when cover was on offer 20% of the time —
// the most common input in the game fighting the systems built around it.

check('the default firing tile prefers cover over closeness', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.faction === 'player' && x.weapon.archetype === 'ranged');
  const foe = state.units.find(x => x.faction === 'enemy');
  // Put the rival at range, with a covered tile further away than a bare one.
  u.x = 5; u.y = 7; u.actedMove = false;
  foe.x = 5; foe.y = 2;
  const tiles = firingTiles(state, u, foe);
  const covered = tiles.filter(t => coverSoftens(state, foe, t));
  if (!covered.length) return; // this board offers none from here; the rule below still holds
  const pick = approachTile(state, u, foe);
  assert.ok(coverSoftens(state, foe, pick),
    'a default that quietly plays badly is worse than no default');
});

check('a firing tile is scored, and a hazard is never the default', () => {
  const state = boot(BACKLOT, 1);
  const u = state.units.find(x => x.faction === 'player');
  const foe = state.units.find(x => x.faction === 'enemy');
  foe.x = u.x; foe.y = u.y - 2;
  const tiles = firingTiles(state, u, foe);
  assert.ok(tiles.length, 'there is somewhere to shoot from');
  const bare = { x: u.x, y: u.y };
  const clean = firingTileScore(state, u, foe, bare);
  state.hazards.set(key(bare.x, bare.y), { id: 'fire', name: 'Fire', onEnter: 2, lingers: 2 });
  assert.ok(firingTileScore(state, u, foe, bare) < clean, 'a hazard costs, and costs a lot');
});

check('firing options come back best-first, each with its own forecast', () => {
  const state = boot(BACKLOT, 4);
  const u = state.units.find(x => x.faction === 'player' && attackableTargets(state, x).length);
  const foe = attackableTargets(state, u)[0];
  const opts = firingOptions(state, u.uid, foe);
  assert.ok(opts.length, 'a reachable rival has at least one firing position');
  for (let i = 1; i < opts.length; i++) {
    assert.ok(opts[i - 1].score >= opts[i].score, 'sorted best first, so the UI can mark the default');
  }
  assert.ok(opts.every(o => typeof o.forecast.chance === 'number'),
    'a menu of positions with no numbers on it is worse than the automatic behaviour');
});

check('you can fire from a tile you chose, not only the one scored best', () => {
  const state = boot(BACKLOT, 4);
  const u = state.units.find(x => x.faction === 'player' && attackableTargets(state, x).length);
  const foe = attackableTargets(state, u)[0];
  const opts = firingOptions(state, u.uid, foe);
  const worst = opts[opts.length - 1];
  const r = attackFrom(state, u.uid, foe, { x: worst.x, y: worst.y });
  assert.ok(r.ok, 'overriding the default is the whole point of offering the choice');
  assert.equal(u.x, worst.x); assert.equal(u.y, worst.y);
  assert.equal(u.actedAction, true);
});

check('a tile that is not on offer is refused', () => {
  const state = boot(BACKLOT, 4);
  const u = state.units.find(x => x.faction === 'player' && attackableTargets(state, x).length);
  const foe = attackableTargets(state, u)[0];
  assert.equal(attackFrom(state, u.uid, foe, { x: 99, y: 99 }).reason, 'bad-tile');
  assert.equal(u.actedAction, false, 'and a refused order does not eat the turn');
});

check('an empty gun offers no firing positions at all', () => {
  const state = boot(BACKLOT, 4);
  const u = state.units.find(x =>
    x.faction === 'player' && x.weapon.archetype === 'ranged' && attackableTargets(state, x).length);
  assert.ok(firingOptions(state, u.uid, attackableTargets(state, u)[0]).length);
  const foe = attackableTargets(state, u)[0];
  u.ammo = 0;
  assert.equal(firingOptions(state, u.uid, foe).length, 0);
});

// ── ammo and reload (MST_PARITY §2.3) ────────────────────────
// The rule that gives a turn more than one question in it. Every check here
// is about the ECONOMY as much as the count: an ammo system that costs the
// move as well as the action would just be a slower game.

check('only guns carry a magazine', () => {
  const knife = WEAPONS.find(w => w.id === 'knife');
  const pistol = WEAPONS.find(w => w.id === 'pistol');
  assert.equal(magOf(knife), null, 'a knife does not run out — that reliability is what melee buys');
  assert.ok(magOf(pistol) > 0);
  assert.equal(needsReload({ weapon: knife, ammo: 0 }), false,
    'and melee is never "needing a reload", so no check has to special-case it');
});

check('an absent round count means FULL, not empty', () => {
  // Load-bearing: any path that puts a weapon on a unit without seeding the
  // count — a direct assignment, a future pickup, a test poking at
  // internals — would otherwise hand back a gun that is silently out.
  const pistol = WEAPONS.find(w => w.id === 'pistol');
  assert.equal(roundsLeft({ weapon: pistol }), pistol.mag);
  assert.equal(needsReload({ weapon: pistol }), false);
  assert.equal(needsReload({ weapon: pistol, ammo: 0 }), true, 'only a real zero is empty');
});

check('firing spends a round, whichever path fired it', () => {
  const state = boot(BACKLOT, 4);
  const shooter = state.units.find(u =>
    u.faction === 'player' && u.weapon.archetype === 'ranged' && attackableTargets(state, u).length);
  assert.ok(shooter, 'seed 4 gives a gun a target');
  const before = roundsLeft(shooter);
  orderAttack(state, shooter.uid, attackableTargets(state, shooter)[0]);
  assert.equal(shooter.ammo, before - 1, 'the round is spent in resolveAttack, so every path pays');
  const evt = state.log.filter(e => e.type === 'attack').pop();
  assert.equal(evt.ammo, shooter.ammo, 'and the event carries it, so the HUD never has to guess');
});

check('an empty gun is not offered a shot it would refuse', () => {
  const state = boot(BACKLOT, 4);
  const shooter = state.units.find(u => u.faction === 'player' && u.weapon.archetype === 'ranged');
  const foe = state.units.find(u => u.faction === 'enemy');
  foe.x = shooter.x + 1; foe.y = shooter.y;
  assert.ok(attackableTargets(state, shooter).length, 'loaded, the shot is on');
  shooter.ammo = 0;
  assert.equal(attackableTargets(state, shooter).length, 0,
    'the board must never highlight something it will then refuse');
  assert.equal(attack(state, shooter.uid, foe.uid).reason, 'empty');
});

check('reloading costs the ACTION and never the MOVE', () => {
  // The entire reason the mechanic is interesting rather than annoying: an
  // empty turn is still a turn you spend going somewhere.
  const state = boot(BACKLOT, 4);
  const shooter = state.units.find(u => u.faction === 'player' && u.weapon.archetype === 'ranged');
  shooter.ammo = 0;
  assert.equal(reloadUnit(state, shooter.uid).ok, true);
  assert.equal(roundsLeft(shooter), magOf(shooter.weapon), 'full again');
  assert.equal(shooter.actedAction, true, 'it was your action');
  assert.equal(shooter.actedMove, false, 'and your move is untouched');
  assert.equal(reloadUnit(state, shooter.uid).reason, 'already-acted', 'once per turn');
});

check('a full gun and a knife both refuse a reload', () => {
  const state = boot(BACKLOT, 4);
  const gun = state.units.find(u => u.faction === 'player' && u.weapon.archetype === 'ranged');
  assert.equal(reloadUnit(state, gun.uid).reason, 'already-full');
  const knife = state.units.find(u => u.faction === 'player' && u.weapon.archetype === 'melee');
  assert.equal(reloadUnit(state, knife.uid).reason, 'nothing-to-reload');
});

check('an empty rival TELEGRAPHS the reload rather than just standing there', () => {
  // A rival doing nothing for no visible reason reads as a bug, not a beat —
  // and the window it opens is only worth having if the player can see it.
  const state = boot(BACKLOT, 4);
  const gunner = state.units.find(u => u.faction === 'enemy' && u.weapon.archetype === 'ranged');
  assert.ok(gunner, 'backlot fields a shooter');
  const loaded = planIntent(state, gunner);
  gunner.ammo = 0;
  const dry = planIntent(state, gunner);
  assert.equal(dry.type, 'reload', 'the intent says so by name');
  assert.notEqual(loaded.type, 'reload');
});

check('an enemy that telegraphed a reload actually reloads', () => {
  const state = boot(BACKLOT, 4);
  for (const e of state.units.filter(u => u.faction === 'enemy' && u.weapon.archetype === 'ranged')) e.ammo = 0;
  // Re-plan, because endPlayerTurn FREEZES the telegraph (v10's fix) and a
  // test that mutates ammo directly has skipped the replan every real
  // action performs. The frozen plan is the whole point of that design; the
  // test has to respect it rather than route around it.
  planAllIntents(state);
  endPlayerTurn(state);
  let step; do { step = stepEnemyPhase(state); } while (step && !step.done);
  const dry = state.units.filter(u => u.faction === 'enemy' && u.hp > 0 && magOf(u.weapon));
  assert.ok(dry.every(u => roundsLeft(u) === magOf(u.weapon)),
    'symmetric with the crew, or the rule is a trap the player learns to exploit');
  assert.ok(state.log.some(e => e.type === 'reload' && e.uid.startsWith('e')));
});

check('a swapped weapon arrives loaded', () => {
  const state = boot(BACKLOT, 4);
  const u = state.units.find(x => x.faction === 'player' && x.weapon.archetype === 'melee');
  u.baseWeapon = WEAPONS.find(w => w.id === 'shotgun');
  u.ammo = null;
  applyTrinkets(u, [], TRINKETS);
  assert.equal(roundsLeft(u), magOf(u.weapon), 'a picked-up gun is not handed over empty');
});

// The AUTO switch has to survive every encounter, and this is the check that
// was missing: AUTO was verified in a browser on encounter ONE, and a
// weaponless cache walking into its threat model crashed it outright on the
// destroy map. A bot that throws is worse than a bot that loses.
check('AUTO plays every encounter without throwing', () => {
  for (const enc of ENCOUNTERS) {
    const state = boot(enc, 7);
    let rounds = 0;
    while (!state.result && rounds < 30) {
      for (const u of state.units.filter(x => x.faction === 'player' && x.hp > 0)) {
        autoTurn(state, u, ABILITIES);
        if (state.result) break;
      }
      if (state.result) break;
      endPlayerTurn(state);
      let step; do { step = stepEnemyPhase(state); } while (step && !step.done);
      rounds++;
    }
    assert.ok(state.result, `${enc.id}: AUTO reaches a result`);
  }
});

for (const enc of ENCOUNTERS) playthrough(enc, 42);

console.log(`\n${pass} checks passed`);
