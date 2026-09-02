// The engine: state creation, the move+act economy (either order, once each
// — GDD §4, the XCOM/ITB standard, not MST's move-then-act lock), attack
// resolution, knockback, and the enemy phase. Pure data in, pure data out —
// nothing here touches a canvas or the DOM, which is what makes it runnable
// in bare node (test/smoke.cjs).
import { key, inBounds, unitAt, moveRange, manhattan, hasLOS, coverSoftens, approachTile } from './grid.js?v=2';
import { planAllIntents } from './ai.js?v=4';
import { makeRng } from './rng.js?v=2';

export function createEncounterState(encounter, unitDefs, weaponDefs, enemyDefs, seed = 1, hazardDefs = [], trinketDefs = []) {
  const weaponById = id => weaponDefs.find(w => w.id === id);
  const fullCover = new Set(encounter.cover.full.map(([x, y]) => key(x, y)));
  const partialCover = new Set(encounter.cover.partial.map(([x, y]) => key(x, y)));
  // tileKey -> hazard def. A hazard never blocks movement (that is cover's
  // job) — it makes a tile cost something, so the board asks a question
  // instead of drawing a wall.
  const hazards = new Map();
  for (const [x, y, kind] of (encounter.hazards || [])) {
    const def = hazardDefs.find(h => h.id === kind);
    if (def) hazards.set(key(x, y), def); // an unknown kind is a content bug, not a crash
  }

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
    fullCover, partialCover, hazards,
    // Per-encounter objective (GDD §4 lists survive-N as a real mode, not
    // only elimination). Defaults to eliminate so an encounter without one
    // behaves exactly as it did before.
    win: encounter.win || { mode: 'eliminate' },
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
    trinketDefs,
    drops: [], // { x, y, weaponId } — GDD §9's "simple weapon-swap loot drops"
  };
  planAllIntents(state);
  return state;
}

const getWeapon = (state, id) => state.weaponDefs.find(w => w.id === id);
const getTrinket = (state, id) => (state.trinketDefs || []).find(t => t.id === id);

// `unit.weapon` is the weapon AS IT ACTUALLY FIRES — base plus every
// trinket's weapon-field bonus — and `unit.baseWeapon` is what was picked up.
// Recomputing into unit.weapon rather than exposing an effectiveWeapon(unit)
// getter is deliberate: grid.js and ai.js both read weapon ranges, and neither
// can import from combat.js (combat.js imports THEM — it would be circular).
// This way every existing read stays correct with no new import anywhere, and
// there is no second code path that can be forgotten.
//
// Recompute on both events that can change the answer: a weapon swap and a
// trinket pickup. A trinket therefore keeps working after a swap instead of
// being silently attached to the gun it was found with.
function recomputeWeapon(unit) {
  const base = unit.baseWeapon || unit.weapon;
  if (!unit.trinkets || !unit.trinkets.length) { unit.weapon = base; return; }
  const w = { ...base };
  for (const t of unit.trinkets) {
    const e = t.effect || {};
    if (e.damage) w.damage += e.damage;
    if (e.range) w.range += e.range;
    if (e.hitChance) w.hitChance = Math.min(1, w.hitChance + e.hitChance);
  }
  unit.weapon = w;
}

// Applied once, on pickup. maxHp also heals by the same amount: a +2 max that
// leaves you on the same hp is a promise rather than a pickup, and this tier
// of item is meant to be felt immediately (same reasoning as awardXp's level
// bump healing on the spot).
// Re-apply a saved trinket list by id (main.js's crewProgress, across
// encounters). Goes through applyTrinket rather than assigning the array, so
// the stat and weapon effects land on this encounter's freshly-built unit
// instead of being restored as inert data.
export function applyTrinkets(unit, ids, defs) {
  for (const id of ids) {
    const def = defs.find(t => t.id === id);
    if (def) applyTrinket(unit, def);
  }
}

function applyTrinket(unit, def) {
  unit.trinkets.push(def);
  const e = def.effect || {};
  if (e.maxHp) { unit.maxHp += e.maxHp; unit.hp += e.maxHp; }
  if (e.move) unit.move += e.move;
  recomputeWeapon(unit);
}

function makeUnit(uid, def, weapon, faction, spawn) {
  return {
    uid, defId: def.id, name: def.name, faction, role: def.role, weapon,
    baseWeapon: weapon, // what was picked up; `weapon` is that plus trinkets
    // ai.js reads these; absent on player units and on any enemy that has
    // not been given one, where the behaviour table falls back to `charger`.
    behaviour: def.behaviour, focus: def.focus,
    hp: def.hp, maxHp: def.hp, move: def.move, portrait: def.portrait, sprite: def.sprite,
    x: spawn.x, y: spawn.y,
    actedMove: false, actedAction: false,
    kills: 0, xp: 0, level: 1,
    trinkets: [], // GDD §5: found gear, no slots, no equip action — they just stack
  };
}

export const hazardAt = (state, x, y) => (state.hazards ? state.hazards.get(key(x, y)) : null) || null;

// Every way a unit's position can change routes through here: a player move,
// a knockback, an enemy's own step. One entry point rather than three copies,
// because the third copy is always the one that forgets to check.
//
// Returns the event (or null) so callers can decide what to narrate; the
// event is already on the log either way. checkWinLoss runs here, since a
// hazard killing the last enemy — or the last operator — has to end the
// encounter exactly like a killing blow does.
function enterHazard(state, unit, cause) {
  if (unit.hp <= 0) return null;
  const h = hazardAt(state, unit.x, unit.y);
  if (!h) return null;
  const before = unit.hp;
  if (h.lethal) unit.hp = 0;
  else if (h.onEnter > 0) unit.hp = Math.max(0, unit.hp - h.onEnter);
  else return null;
  const evt = {
    type: 'hazard', uid: unit.uid, kind: h.id, name: h.name, cause,
    damage: before - unit.hp, killed: unit.hp <= 0, lethal: !!h.lethal,
    x: unit.x, y: unit.y,
  };
  state.log.push(evt);
  checkWinLoss(state);
  return evt;
}

// End-of-round burn: a hazard with `lingers` bites anything still standing in
// it when the round turns over. This is the only hazard effect that is not
// triggered by movement, and it is what stops a fire tile being a one-off
// toll you pay once and then camp on.
function tickLingeringHazards(state) {
  const out = [];
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    const h = hazardAt(state, unit.x, unit.y);
    if (!h || !h.lingers) continue;
    const before = unit.hp;
    unit.hp = Math.max(0, unit.hp - h.lingers);
    const evt = {
      type: 'hazard', uid: unit.uid, kind: h.id, name: h.name, cause: 'linger',
      damage: before - unit.hp, killed: unit.hp <= 0, lethal: false,
      x: unit.x, y: unit.y,
    };
    state.log.push(evt);
    out.push(evt);
  }
  if (out.length) checkWinLoss(state);
  return out;
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
  // Hazard first, then loot: a unit that walks into an open stairwell does
  // not get to pick up the pistol lying in it on the way down.
  const hazard = enterHazard(state, unit, 'move');
  const pickedUp = unit.hp > 0 ? pickUpDropAt(state, unit) : null;
  maybeDeselect(state, unit);
  planAllIntents(state);
  return { ok: true, pickedUp, hazard };
}

// A dead enemy's tile never blocks movement (grid.js's unitAt skips hp<=0
// units), which is what makes "walk over the body to grab its gun" work with
// no extra input affordance — the drop marker (render.js) is the telegraph.
function pickUpDropAt(state, unit) {
  if (unit.faction !== 'player') return null;
  const i = state.drops.findIndex(d => d.x === unit.x && d.y === unit.y);
  if (i < 0) return null;
  const [drop] = state.drops.splice(i, 1);
  if (drop.trinketId) {
    const trinket = getTrinket(state, drop.trinketId);
    if (!trinket) return null; // a bad id in data is a content bug, not a crash
    applyTrinket(unit, trinket);
    state.log.push({ type: 'pickup', uid: unit.uid, trinketId: trinket.id, name: trinket.name });
    return trinket;
  }
  const weapon = getWeapon(state, drop.weaponId);
  if (!weapon) return null;
  unit.baseWeapon = weapon;
  recomputeWeapon(unit); // keep whatever trinkets this unit already carries
  state.log.push({ type: 'pickup', uid: unit.uid, weaponId: weapon.id, name: weapon.name });
  return unit.weapon;
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
// Of the drops that happen, how many are a trinket rather than the victim's
// weapon. Kept below half on purpose: the weapon swap is the decision with
// real texture (it changes range and knockback, i.e. how the unit plays),
// while a trinket is a small permanent tilt. Making trinkets the common drop
// would quietly replace the more interesting item with the duller one.
export const TRINKET_SHARE = 0.4;

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
        // GDD §5 puts trinkets in the same "found gear" tier as weapon swaps,
        // so they come from the same roll rather than a second economy the
        // player has to learn — a body leaves ONE thing, sometimes its gun and
        // sometimes what was in its pockets.
        const pool = state.trinketDefs || [];
        const asTrinket = pool.length && state.rng() < TRINKET_SHARE;
        dropped = asTrinket
          ? { x: target.x, y: target.y, trinketId: pool[Math.floor(state.rng() * pool.length)].id }
          : { x: target.x, y: target.y, weaponId: target.baseWeapon ? target.baseWeapon.id : target.weapon.id };
        state.drops.push(dropped);
      }
    }
    if (!killed && weapon.knockback > 0) knockback = applyKnockback(state, attacker, target, weapon.knockback);
  }
  const evt = { type: 'attack', attackerUid: attacker.uid, targetUid: target.uid, hit, damage, killed, knockback, dropped, chance, roll };
  state.log.push(evt);
  // The payoff the pipe exists for: a shove that lands a body in a fire or an
  // open stairwell. Resolved AFTER the attack event is logged so the two read
  // in causal order, and folded back onto the same event so a caller that
  // only looks at `killed` still learns the target died.
  if (knockback && knockback.moved) {
    const hz = enterHazard(state, target, 'knockback');
    if (hz) {
      evt.hazard = hz;
      if (hz.killed && !evt.killed) {
        evt.killed = true;
        attacker.kills += 1;   // the shove earned it as surely as a killing blow
      }
    }
  }
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
    // A lethal hazard CATCHES whatever is shoved across it. Without this a
    // 2-tile knockback sails a body clean over an open stairwell and lands it
    // on the far side, which is both wrong to look at and quietly makes the
    // heaviest knockback weapons the WORST at using a pit — the exact
    // opposite of the intent. Non-lethal hazards do not stop momentum; you
    // only pay for the tile you come to rest on.
    if (hazardAt(state, nx, ny)?.lethal) break;
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
        enterHazard(state, enemy, 'move');
      }
    }
    // An enemy that just burned to death (or was shoved into a stairwell and
    // is only now taking its turn) does not get to swing.
    if (enemy.hp <= 0) {
      state.log.push({ type: 'enemy-turn', uid, name: enemy.name, moved, attacked: null });
      checkWinLoss(state);
      return { done: false, uid, name: enemy.name, moved, attacked: null };
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

  // The round turns over: anything still standing in a lingering hazard pays
  // for it now. Done before the reset/replan so the new round's telegraph is
  // computed against who actually survived the fire.
  const burns = tickLingeringHazards(state);
  state.turn = 'player';
  state.round += 1;
  for (const u of state.units) if (u.faction === 'player') { u.actedMove = false; u.actedAction = false; }
  // A survive objective is decided HERE and nowhere else: outlasting round N
  // is an event with no attack behind it, so without this call the win would
  // only be noticed the next time somebody happened to take damage.
  checkWinLoss(state);
  planAllIntents(state);
  return { done: true, burns };
}

// The one place a fight is decided.
//
// WHY THERE IS A CHOICE HERE AT ALL. Elimination was the only win condition
// through v21, and measured over 300 bot runs it was won ZERO times: three
// operators against six or seven who out-damage them 2-4x. The numbers were
// not the mistake — the GOAL was. This game shows full enemy intent, which
// is Into the Breach's model, and ITB never asks you to kill everything: you
// get three units, perfect information, and a turn count to survive. Full
// information plus a losing damage race is not tension, it is a legible
// defeat. Change what winning means and the same numbers become correct,
// because cover, hazards and knockback are all tools for DENYING damage
// rather than trading it.
//
// `survive` is therefore the interesting objective and `eliminate` is kept
// for encounters that genuinely are a clear-out. Killing every enemy always
// wins regardless of mode — outliving the fight early is never punished.
function checkWinLoss(state) {
  if (state.result) return;
  if (!state.units.some(u => u.faction === 'player' && u.hp > 0)) { state.result = 'lose'; return; }
  if (!state.units.some(u => u.faction === 'enemy' && u.hp > 0)) { state.result = 'win'; return; }
  // Survive N: the round counter has already advanced past N when the Nth
  // round's enemy phase finishes, which is exactly when the player has
  // outlasted it.
  if (state.win && state.win.mode === 'survive' && state.round > state.win.rounds) state.result = 'win';
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
