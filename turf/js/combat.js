// The engine: state creation, the move+act economy (either order, once each
// — GDD §4, the XCOM/ITB standard, not MST's move-then-act lock), attack
// resolution, knockback, and the enemy phase. Pure data in, pure data out —
// nothing here touches a canvas or the DOM, which is what makes it runnable
// in bare node (test/smoke.cjs).
import { key, inBounds, unitAt, moveRange, manhattan, hasLOS, coverSoftens, approachTile } from './grid.js?v=2';
import { planAllIntents } from './ai.js?v=2';
import { makeRng } from './rng.js?v=2';

export function createEncounterState(encounter, unitDefs, weaponDefs, enemyDefs, seed = 1) {
  const weaponById = id => weaponDefs.find(w => w.id === id);
  const fullCover = new Set(encounter.cover.full.map(([x, y]) => key(x, y)));
  const partialCover = new Set(encounter.cover.partial.map(([x, y]) => key(x, y)));

  const units = [];
  encounter.playerSpawns.forEach((spawn, i) => {
    const def = unitDefs.find(u => u.id === spawn.unit);
    units.push(makeUnit(`p${i}`, def, weaponById(def.weapon), 'player', spawn));
  });
  encounter.enemySpawns.forEach((spawn, i) => {
    const def = enemyDefs.find(e => e.id === spawn.enemy);
    units.push(makeUnit(`e${i}`, def, weaponById(def.weapon), 'enemy', spawn));
  });

  const state = {
    encounterId: encounter.id,
    grid: encounter.grid,
    fullCover, partialCover,
    units,
    turn: 'player',
    round: 1,
    selected: null,
    telegraph: new Map(),
    enemyPlan: new Map(),
    enemyQueue: [],
    log: [],
    result: null,
    rng: makeRng(seed),
    weaponDefs, // so moveUnit can look up a dropped weapon's def by id
    drops: [], // { x, y, weaponId } — GDD §9's "simple weapon-swap loot drops"
  };
  planAllIntents(state);
  return state;
}

const getWeapon = (state, id) => state.weaponDefs.find(w => w.id === id);

function makeUnit(uid, def, weapon, faction, spawn) {
  return {
    uid, defId: def.id, name: def.name, faction, role: def.role, weapon,
    hp: def.hp, maxHp: def.hp, move: def.move, portrait: def.portrait, sprite: def.sprite,
    x: spawn.x, y: spawn.y,
    actedMove: false, actedAction: false,
    kills: 0, xp: 0, level: 1,
  };
}

export const getUnit = (state, uid) => state.units.find(u => u.uid === uid);
export const livingPlayers = state => state.units.filter(u => u.faction === 'player' && u.hp > 0);
export const livingEnemies = state => state.units.filter(u => u.faction === 'enemy' && u.hp > 0);
export const canUnitAct = unit => unit.hp > 0 && (!unit.actedMove || !unit.actedAction);

function maybeDeselect(state, unit) {
  if (unit.actedMove && unit.actedAction && state.selected === unit.uid) state.selected = null;
}

export function selectUnit(state, uid) {
  if (state.turn !== 'player') return { ok: false, reason: 'not-your-turn' };
  const unit = getUnit(state, uid);
  if (!unit || unit.faction !== 'player' || unit.hp <= 0) return { ok: false, reason: 'invalid' };
  state.selected = uid;
  return { ok: true };
}

// A tile you can legally move to right now (used by both the move command
// and by input.js/render.js to paint the range highlight).
export function movableTiles(state, unit) {
  return unit.actedMove ? new Map() : moveRange(state, unit);
}

export function moveUnit(state, uid, x, y) {
  const unit = getUnit(state, uid);
  if (!unit || unit.hp <= 0) return { ok: false, reason: 'dead' };
  if (state.turn !== 'player' || unit.faction !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (unit.actedMove) return { ok: false, reason: 'already-moved' };
  const range = moveRange(state, unit);
  if (!range.has(key(x, y))) return { ok: false, reason: 'out-of-range' };
  unit.x = x; unit.y = y;
  unit.actedMove = true;
  state.log.push({ type: 'move', uid, x, y });
  const pickedUp = pickUpDropAt(state, unit);
  maybeDeselect(state, unit);
  planAllIntents(state);
  return { ok: true, pickedUp };
}

// A dead enemy's tile never blocks movement (grid.js's unitAt skips hp<=0
// units), which is what makes "walk over the body to grab its gun" work with
// no extra input affordance — the drop marker (render.js) is the telegraph.
function pickUpDropAt(state, unit) {
  if (unit.faction !== 'player') return null;
  const i = state.drops.findIndex(d => d.x === unit.x && d.y === unit.y);
  if (i < 0) return null;
  const [drop] = state.drops.splice(i, 1);
  const weapon = getWeapon(state, drop.weaponId);
  if (!weapon) return null; // a bad weaponId in data is a content bug, not a crash
  unit.weapon = weapon;
  state.log.push({ type: 'pickup', uid: unit.uid, weaponId: weapon.id });
  return weapon;
}

// Every tile a unit could attack a target from *this turn*, given its
// remaining move — used by input.js to light up valid targets and by ai.js
// to pick where to stand. Kept here (not grid.js) since it needs the weapon.
export function attackableTargets(state, unit) {
  if (unit.actedAction) return [];
  const out = [];
  for (const target of state.units) {
    if (target.hp <= 0 || target.faction === unit.faction) continue;
    if (approachTile(state, unit, target)) out.push(target.uid);
  }
  return out;
}

// GDD §9's "simple weapon-swap loot drops": a dead enemy has a flat chance
// to leave its weapon behind, on its own tile. Rolled here (not in awardXp,
// which only runs once at encounter end) because the drop has to exist mid-
// encounter for a unit to walk over and grab it.
export const DROP_CHANCE = 0.5;

function resolveAttack(state, attacker, target, weapon) {
  let chance = weapon.hitChance;
  if (weapon.archetype === 'ranged' && coverSoftens(state, attacker, target)) chance -= 0.3;
  chance = Math.max(0.05, Math.min(1, chance));
  const roll = state.rng();
  const hit = roll < chance;
  let damage = 0, killed = false, knockback = null, dropped = null;
  if (hit) {
    damage = weapon.damage;
    target.hp = Math.max(0, target.hp - damage);
    killed = target.hp <= 0;
    if (killed) {
      attacker.kills += 1;
      if (target.faction === 'enemy' && state.rng() < DROP_CHANCE) {
        dropped = { x: target.x, y: target.y, weaponId: target.weapon.id };
        state.drops.push(dropped);
      }
    }
    if (!killed && weapon.knockback > 0) knockback = applyKnockback(state, attacker, target, weapon.knockback);
  }
  const evt = { type: 'attack', attackerUid: attacker.uid, targetUid: target.uid, hit, damage, killed, knockback, dropped, chance, roll };
  state.log.push(evt);
  return evt;
}

// Pushes the target away along the dominant axis of the attack (the grid is
// orthogonal, so a diagonal hit picks whichever axis it leans on more),
// stopping at the first tile that is out of bounds, full cover, or occupied
// — a target shoved into a wall or another body just stops there.
function applyKnockback(state, attacker, target, tiles) {
  const dx = target.x - attacker.x, dy = target.y - attacker.y;
  let stepX = 0, stepY = 0;
  if (Math.abs(dx) >= Math.abs(dy)) stepX = Math.sign(dx) || 1;
  else stepY = Math.sign(dy) || 1;
  let moved = 0;
  for (let i = 0; i < tiles; i++) {
    const nx = target.x + stepX, ny = target.y + stepY;
    if (!inBounds(state.grid, nx, ny)) break;
    if (state.fullCover.has(key(nx, ny))) break;
    if (unitAt(state, nx, ny, target)) break;
    target.x = nx; target.y = ny; moved++;
  }
  return { moved, dx: stepX, dy: stepY };
}

export function attack(state, attackerUid, targetUid) {
  const attacker = getUnit(state, attackerUid);
  const target = getUnit(state, targetUid);
  if (!attacker || !target || attacker.hp <= 0 || target.hp <= 0) return { ok: false, reason: 'invalid' };
  if (state.turn !== 'player' || attacker.faction !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (attacker.actedAction) return { ok: false, reason: 'already-acted' };
  if (attacker.faction === target.faction) return { ok: false, reason: 'same-faction' };
  if (manhattan(attacker, target) > attacker.weapon.range) return { ok: false, reason: 'out-of-range' };
  if (!hasLOS(state, attacker, target)) return { ok: false, reason: 'no-los' };

  const result = resolveAttack(state, attacker, target, attacker.weapon);
  attacker.actedAction = true;
  maybeDeselect(state, attacker);
  planAllIntents(state);
  checkWinLoss(state);
  return { ok: true, ...result };
}

// The click-to-attack entry point for the UI: if the target isn't in range
// from the unit's current tile, walks it to the nearest tile that IS in
// range (spending the move, if it has one left) before resolving the
// attack. `attack()` itself stays strict/in-place — this is the only place
// "move to make the shot happen" is allowed to occur automatically.
export function orderAttack(state, attackerUid, targetUid) {
  const attacker = getUnit(state, attackerUid);
  const target = getUnit(state, targetUid);
  if (!attacker || !target) return { ok: false, reason: 'invalid' };
  const tile = approachTile(state, attacker, target);
  if (!tile) return { ok: false, reason: 'unreachable' };
  if ((tile.x !== attacker.x || tile.y !== attacker.y) && !attacker.actedMove) {
    const moved = moveUnit(state, attackerUid, tile.x, tile.y);
    if (!moved.ok) return moved;
  }
  return attack(state, attackerUid, targetUid);
}

export function endUnitTurn(state, uid) {
  const unit = getUnit(state, uid);
  if (!unit || unit.faction !== 'player' || state.turn !== 'player') return { ok: false };
  unit.actedMove = true; unit.actedAction = true;
  if (state.selected === uid) state.selected = null;
  return { ok: true };
}

export function endPlayerTurn(state) {
  if (state.turn !== 'player') return { ok: false };
  state.turn = 'enemy';
  state.selected = null;
  // Freeze the plan the player just read off the board. The whole point of
  // an ITB-style telegraph is that it is a promise, not a preview — an enemy
  // executes exactly this, never a plan re-computed against a board that
  // earlier enemies this same phase have already moved.
  state.enemyPlan = new Map(state.telegraph);
  state.enemyQueue = livingEnemies(state).map(u => u.uid);
  return { ok: true };
}

// Resolves exactly one enemy's turn (freshly re-planned, since earlier
// enemies this same phase — or the player's last action — may have changed
// the board) and returns a descriptor for the HUD/animation layer to show.
// Returns { done: true } once the phase is empty, having already flipped
// back to the player and reset the move/act flags for the new round.
export function stepEnemyPhase(state) {
  if (state.turn !== 'enemy') return null;
  while (state.enemyQueue.length) {
    const uid = state.enemyQueue.shift();
    const enemy = getUnit(state, uid);
    if (!enemy || enemy.hp <= 0) continue;

    // Execute the frozen plan (set in endPlayerTurn), not a fresh one — see
    // the comment there. Only guard against a tile another enemy already
    // took earlier this same phase (independent plans can collide); the
    // target's position and the enemy's own tile are otherwise exactly what
    // was shown.
    const intent = state.enemyPlan.get(uid) || { type: 'idle' };
    let moved = null, attacked = null;
    if (intent.moveTo && (intent.moveTo.x !== enemy.x || intent.moveTo.y !== enemy.y)) {
      const blocked = state.fullCover.has(key(intent.moveTo.x, intent.moveTo.y)) || unitAt(state, intent.moveTo.x, intent.moveTo.y, enemy);
      if (!blocked) {
        enemy.x = intent.moveTo.x; enemy.y = intent.moveTo.y;
        moved = { x: enemy.x, y: enemy.y };
      }
    }
    if (intent.type === 'attack') {
      const target = getUnit(state, intent.targetUid);
      if (target && target.hp > 0 && manhattan(enemy, target) <= enemy.weapon.range && hasLOS(state, enemy, target)) {
        attacked = resolveAttack(state, enemy, target, enemy.weapon);
      }
    }
    state.log.push({ type: 'enemy-turn', uid, name: enemy.name, moved, attacked });
    checkWinLoss(state);
    return { done: false, uid, name: enemy.name, moved, attacked };
  }

  state.turn = 'player';
  state.round += 1;
  for (const u of state.units) if (u.faction === 'player') { u.actedMove = false; u.actedAction = false; }
  planAllIntents(state);
  return { done: true };
}

function checkWinLoss(state) {
  if (state.result) return;
  if (!state.units.some(u => u.faction === 'player' && u.hp > 0)) state.result = 'lose';
  else if (!state.units.some(u => u.faction === 'enemy' && u.hp > 0)) state.result = 'win';
}

// GDD.md §5's v1 progression list: "XP levels: units gain levels from
// combat, unlocking small stat bumps." No skill-slot unlock yet — that half
// of §5's sentence waits on the class/subclass system (GDD §5.1), which
// isn't wired into the engine. A clear won encounter pays a flat clear bonus
// plus a per-kill bonus to every unit who survived it (not just the one who
// landed the kill — a squad wipe risk taken together is rewarded together);
// a level costs progressively more and buys +2 max HP, healed immediately
// so the bump is felt right away rather than banked for later.
export const XP_BASE_CLEAR = 10;
export const XP_PER_KILL = 8;
export const HP_PER_LEVEL = 2;
export const xpToNext = level => 20 + (level - 1) * 15;

// Call once, right after a win — awards XP to every surviving player unit
// and rolls any level-ups (a big single haul can roll more than one level).
// Mutates state.units in place, like every other combat function here;
// returns a summary per unit for the UI to report.
export function awardXp(state) {
  if (state.result !== 'win') return [];
  const events = [];
  for (const u of state.units) {
    if (u.faction !== 'player' || u.hp <= 0) continue;
    const gained = XP_BASE_CLEAR + u.kills * XP_PER_KILL;
    u.xp += gained;
    const levelsGained = [];
    while (u.xp >= xpToNext(u.level)) {
      u.xp -= xpToNext(u.level);
      u.level += 1;
      u.maxHp += HP_PER_LEVEL;
      u.hp += HP_PER_LEVEL;
      levelsGained.push(u.level);
    }
    events.push({ uid: u.uid, name: u.name, kills: u.kills, gained, levelsGained });
  }
  return events;
}
