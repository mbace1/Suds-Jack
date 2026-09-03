// The engine: state creation, the move+act economy (either order, once each
// — GDD §4, the XCOM/ITB standard, not MST's move-then-act lock), attack
// resolution, knockback, and the enemy phase. Pure data in, pure data out —
// nothing here touches a canvas or the DOM, which is what makes it runnable
// in bare node (test/smoke.cjs).
import {
  key, inBounds, unitAt, moveRange, manhattan, hasLOS, coverSoftens, approachTile,
  firingTiles, firingTileScore,
} from './grid.js?v=3';
import { planAllIntents } from './ai.js?v=6';
import { makeRng } from './rng.js?v=2';
import { addMomentum, clearMomentum, evasionOf, momentumDamage } from './momentum.js?v=1';
import { abilityTargets, canAfford, findAbility } from './abilities.js?v=1';
import { magOf, needsReload, roundsLeft } from './ammo.js?v=2';

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
  // Objective units — the thing a `destroy` mission is about. A third
  // faction rather than a new entity type, because "a thing on a tile with
  // hp that can be attacked" is what a unit already IS: attackableTargets
  // filters on `faction !== mine`, so both sides can hit it for free;
  // livingEnemies and ai.js's target search both filter on 'enemy' and
  // 'player' by name, so it is invisible to the win check and to the enemy
  // brain without either of them learning a thing. It cannot move, has no
  // weapon, and is never asked to act.
  (encounter.objectives || []).forEach((spawn, i) => {
    units.push({
      uid: `o${i}`, defId: spawn.id, name: spawn.name, faction: 'objective',
      role: 'objective', weapon: null, baseWeapon: null,
      hp: spawn.hp, maxHp: spawn.hp, move: 0,
      x: spawn.x, y: spawn.y,
      actedMove: true, actedAction: true,
      kills: 0, xp: 0, level: 1, trinkets: [],
    });
  });

  const state = {
    encounterId: encounter.id,
    grid: encounter.grid,
    fullCover, partialCover, hazards,
    // Extraction tiles (GDD §4's objective variety, MST's most-used mission
    // shape). A Set of tile keys — empty for every other mode, so nothing
    // downstream needs to know which mode is running.
    extract: new Set((encounter.extract || []).map(([x, y]) => key(x, y))),
    // Units holding fire (the Overwatch ability). A Set of uids, emptied at
    // the top of every player turn — overwatch is a posture you take for one
    // enemy phase, never a standing order you can forget you gave.
    overwatch: new Set(),
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
  // A picked-up gun comes loaded, and a trinket that changes the weapon must
  // not leave a stale round count from the old one behind.
  if (unit.ammo == null || magOf(base) !== magOf(unit.weapon)) unit.ammo = magOf(base);
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
    // Starts loaded. Null for melee, and every ammo check goes through
    // magOf/needsReload rather than reading this directly.
    ammo: magOf(weapon),
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

export { magOf, needsReload, roundsLeft };

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
  // Momentum is banked from the distance actually travelled, before the
  // position is overwritten — a unit that moves one tile has not run.
  addMomentum(unit, Math.abs(x - unit.x) + Math.abs(y - unit.y));
  unit.x = x; unit.y = y;
  unit.actedMove = true;
  state.log.push({ type: 'move', uid, x, y, momentum: unit.momentum });
  // Hazard first, then loot: a unit that walks into an open stairwell does
  // not get to pick up the pistol lying in it on the way down.
  const hazard = enterHazard(state, unit, 'move');
  const pickedUp = unit.hp > 0 ? pickUpDropAt(state, unit) : null;
  maybeDeselect(state, unit);
  planAllIntents(state);
  // An extraction is won by STANDING somewhere, which makes a move the only
  // action in the game that can win an encounter on its own. Without this
  // call the win would sit unnoticed until somebody happened to attack —
  // the same bug the survive mode had before v22.
  checkWinLoss(state);
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
  // An empty magazine removes the option entirely rather than offering a
  // shot that then fails: the board must never highlight something it will
  // refuse, and this is what turns "reload" into a real decision instead of
  // a chore you discover by tapping.
  if (needsReload(unit)) return [];
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

// `opts` is how an ABILITY bends one attack without there being a second
// damage pipeline in this codebase (abilities.js's header explains why that
// matters). Everything an ability can change is a modifier on this one
// resolution: accuracy, a damage bonus or a flat replacement, a knockback
// override, and whether the swing spends the attacker's momentum — it does
// not, when the ability has already charged for it.
// THE ONE PLACE the odds are worked out, so the preview and the resolution
// are the same arithmetic rather than two copies that drift. This game
// promises full information: a player who is told 70% and hit 4 times out of
// ten has been lied to, and the only structural defence against that is for
// the number on screen and the number rolled against to come from here.
//
// Pure — no rng, no mutation. `from` lets a caller ask about a tile the
// attacker has not reached yet, which matters because orderAttack steps you
// into range first and cover is a property of WHERE YOU END UP.
export function forecastAttack(state, attacker, target, weapon, opts = {}, from = attacker) {
  let chance = opts.accuracy != null ? opts.accuracy : weapon.hitChance;
  if (opts.accuracyMod) chance += opts.accuracyMod;
  const cover = weapon.archetype === 'ranged' && coverSoftens(state, from, target);
  if (cover) chance -= COVER_PENALTY;
  // A moving target is harder to shoot (momentum.js) — the rule that makes
  // standing still cost something, and the reason a board spreads out.
  const evade = evasionOf(target, weapon);
  chance -= evade;
  chance = Math.max(0.05, Math.min(1, chance));
  const bonus = opts.flatDamage != null ? 0 : momentumDamage(attacker) + (opts.damageBonus || 0);
  const base = opts.flatDamage != null ? opts.flatDamage : weapon.damage;
  const damage = opts.flatDamage != null ? opts.flatDamage : base + bonus;
  const shots = opts.shots || 1;
  return {
    chance, cover, evade, base, bonus, damage, shots,
    // Whether this would finish them. The single most decision-relevant fact
    // on the board, and until now the player had to do the subtraction.
    lethal: damage >= target.hp,
    knockback: opts.knockback != null ? opts.knockback : weapon.knockback,
  };
}

export const COVER_PENALTY = 0.3;

function resolveAttack(state, attacker, target, weapon, opts = {}) {
  const f = forecastAttack(state, attacker, target, weapon, opts);
  const chance = f.chance, evade = f.evade, bonus = f.bonus;
  // The round is spent HERE and nowhere else, so every firing path pays for
  // it — an ordinary swing, an ability, and an overwatch reaction all funnel
  // through this function, and three separate call sites deducting ammo is
  // the third-copy bug this file has already paid for twice.
  if (magOf(weapon) != null) attacker.ammo = Math.max(0, roundsLeft(attacker) - 1);
  const roll = state.rng();
  const hit = roll < chance;
  let damage = 0, killed = false, knockback = null, dropped = null;
  if (hit) {
    damage = f.damage;
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
    const shove = opts.knockback != null ? opts.knockback : weapon.knockback;
    if (!killed && shove > 0) knockback = applyKnockback(state, attacker, target, shove);
  }
  // Spending it is the whole interlock (momentum.js): the run that sharpened
  // this swing is over, and the attacker is a stationary target until it moves
  // again. Cleared whether the shot lands or not — you committed to the swing.
  // An ability has already deducted its own cost, so it opts out rather than
  // being charged twice.
  if (!opts.keepMomentum) clearMomentum(attacker);
  const evt = {
    type: 'attack', attackerUid: attacker.uid, targetUid: target.uid, hit, damage,
    killed, knockback, dropped, chance, roll,
    // The breakdown travels with the event so the HUD and the animation layer
    // can say WHY a number was what it was, rather than showing a total the
    // player has to reverse-engineer.
    base: opts.flatDamage != null ? opts.flatDamage : weapon.damage, bonus, evade,
    ammo: attacker.ammo,
    ability: opts.ability || null,
  };
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
  if (needsReload(attacker)) return { ok: false, reason: 'empty' };
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
// What the player is about to do to whoever they are pointing at, worked out
// from the tile orderAttack would actually shoot from — not from where the
// unit is standing. That distinction is the whole point: approachTile steps
// you into range first, and cover is a property of where you END UP, so a
// forecast taken from the current tile would confidently quote the wrong
// number on exactly the shots that need a step.
//
// Returns null when the shot is not on, so the caller shows nothing rather
// than a 5% floor for an attack that cannot happen.
// Every tile this operator could shoot `target` from, each with the forecast
// it would give — the data behind letting the player CHOOSE where to fight
// from instead of being walked to a tile the engine picked. Sorted best
// first, so the UI can mark the default without recomputing the ranking.
export function firingOptions(state, attackerUid, targetUid) {
  const attacker = getUnit(state, attackerUid);
  const target = getUnit(state, targetUid);
  if (!attacker || !target || attacker.actedAction || needsReload(attacker)) return [];
  return firingTiles(state, attacker, target)
    .map(t => ({
      ...t,
      score: firingTileScore(state, attacker, target, t),
      steps: manhattan(t, attacker),
      forecast: forecastAttack(state, attacker, target, attacker.weapon, {}, t),
    }))
    .sort((a, b) => b.score - a.score || (key(a.x, a.y) < key(b.x, b.y) ? -1 : 1));
}

// Attack from a SPECIFIC tile the player chose. Same guards as orderAttack,
// but the step is the one they asked for rather than the one scored best —
// overriding the default is the whole point of offering the choice.
export function attackFrom(state, attackerUid, targetUid, tile) {
  const attacker = getUnit(state, attackerUid);
  if (!attacker) return { ok: false, reason: 'invalid' };
  const legal = firingOptions(state, attackerUid, targetUid);
  if (!legal.some(t => t.x === tile.x && t.y === tile.y)) return { ok: false, reason: 'bad-tile' };
  if ((tile.x !== attacker.x || tile.y !== attacker.y) && !attacker.actedMove) {
    const moved = moveUnit(state, attackerUid, tile.x, tile.y);
    if (!moved.ok) return moved;
    if (state.result) return { ok: true, ended: true }; // a hazard on the way can end it
  }
  return attack(state, attackerUid, targetUid);
}

export function previewAttack(state, attackerUid, targetUid, opts = {}) {
  const attacker = getUnit(state, attackerUid);
  const target = getUnit(state, targetUid);
  if (!attacker || !target || attacker.hp <= 0 || target.hp <= 0) return null;
  if (attacker.actedAction) return null;
  const tile = approachTile(state, attacker, target);
  if (!tile) return null;
  const f = forecastAttack(state, attacker, target, attacker.weapon, opts, tile);
  return { ...f, from: tile, steps: manhattan(tile, attacker), targetHp: target.hp };
}

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

// RELOADING IS YOUR ACTION, which is the whole mechanic. It is not a free
// housekeeping step: the turn you spend refilling is a turn you do not spend
// shooting, and what makes that interesting rather than merely annoying is
// that it leaves the MOVE untouched — so an empty gun is a turn to
// reposition, and the movement economy gets the empty turns it was
// previously competing with a free attack for.
export function reloadUnit(state, uid) {
  const unit = getUnit(state, uid);
  if (!unit || unit.hp <= 0) return { ok: false, reason: 'dead' };
  if (unit.faction === 'player' && state.turn !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (unit.actedAction) return { ok: false, reason: 'already-acted' };
  const mag = magOf(unit.weapon);
  if (mag == null) return { ok: false, reason: 'nothing-to-reload' };
  if (roundsLeft(unit) >= mag) return { ok: false, reason: 'already-full' };
  unit.ammo = mag;
  unit.actedAction = true;
  state.log.push({ type: 'reload', uid, name: unit.name, ammo: unit.ammo });
  maybeDeselect(state, unit);
  planAllIntents(state);
  return { ok: true };
}

export function endUnitTurn(state, uid) {
  const unit = getUnit(state, uid);
  if (!unit || unit.faction !== 'player' || state.turn !== 'player') return { ok: false };
  unit.actedMove = true; unit.actedAction = true;
  if (state.selected === uid) state.selected = null;
  return { ok: true };
}

// Every operator holding fire that can now see this enemy takes its shot.
// One shot each per enemy phase — the uid is dropped from the set as it
// fires, so a watcher cannot mow down a whole column, and a watcher whose
// line never opens simply keeps the posture until the turn ends.
function overwatchFire(state, enemy) {
  if (!state.overwatch || !state.overwatch.size || enemy.hp <= 0) return;
  for (const uid of [...state.overwatch]) {
    const watcher = getUnit(state, uid);
    if (!watcher || watcher.hp <= 0) { state.overwatch.delete(uid); continue; }
    if (manhattan(watcher, enemy) > watcher.weapon.range) continue;
    if (!hasLOS(state, watcher, enemy)) continue;
    state.overwatch.delete(uid);
    state.log.push({ type: 'overwatch', uid, targetUid: enemy.uid, name: watcher.name });
    resolveAttack(state, watcher, enemy, watcher.weapon, { ability: 'overwatch', keepMomentum: true });
    checkWinLoss(state);
    if (enemy.hp <= 0) return;
  }
}

// ── abilities ────────────────────────────────────────────────────────
// One entry point for every shape. The dispatch is small on purpose: each
// case reduces to calls this file already makes for an ordinary attack, so
// an ability can never do something the normal path cannot explain.
export function useAbility(state, uid, abilityId, target, abilityDefs) {
  const unit = getUnit(state, uid);
  const ability = findAbility(abilityDefs, abilityId);
  if (!unit || !ability) return { ok: false, reason: 'invalid' };
  if (state.turn !== 'player' || unit.faction !== 'player') return { ok: false, reason: 'not-your-turn' };
  if (!canAfford(unit, ability)) return { ok: false, reason: 'cannot-afford' };

  // Legality is answered by the same function the UI highlighted with, so a
  // tile the board offered can never be refused here and a tile it did not
  // can never be taken by a crafted call.
  const legal = abilityTargets(state, unit, ability);
  const results = [];

  if (ability.shape === 'self') {
    if (ability.id !== 'overwatch') return { ok: false, reason: 'unknown-self-ability' };
    state.overwatch.add(unit.uid);
    state.log.push({ type: 'ability', uid, ability: ability.id, name: ability.name });
  } else if (ability.shape === 'adjacent-all') {
    const group = legal[0];
    if (!group) return { ok: false, reason: 'no-target' };
    // A copy of the list, resolved one at a time: a body killed by the first
    // swing must not still be standing for the third.
    for (const tuid of group.all) {
      const t = getUnit(state, tuid);
      if (!t || t.hp <= 0) continue;
      results.push(resolveAttack(state, unit, t, unit.weapon, abilityOpts(ability)));
    }
    if (!results.length) return { ok: false, reason: 'no-target' };
  } else if (ability.shape === 'empty-tile') {
    const tile = target || {};
    if (!legal.some(t => t.x === tile.x && t.y === tile.y)) return { ok: false, reason: 'bad-tile' };
    state.partialCover.add(key(tile.x, tile.y));
    state.log.push({ type: 'ability', uid, ability: ability.id, name: ability.name, x: tile.x, y: tile.y });
  } else {
    const tuid = typeof target === 'string' ? target : target && target.uid;
    if (!legal.some(t => t.uid === tuid)) return { ok: false, reason: 'bad-target' };
    const shots = ability.shots || 1;
    for (let i = 0; i < shots; i++) {
      const t = getUnit(state, tuid);
      if (!t || t.hp <= 0) break; // a second barrel is not fired into a corpse
      results.push(resolveAttack(state, unit, t, unit.weapon, abilityOpts(ability)));
    }
  }

  // Charged once, whatever the shape, and only after the ability actually
  // happened — a refused call must not eat the run that paid for it.
  unit.momentum = Math.max(0, (unit.momentum || 0) - ability.cost);
  unit.actedAction = true;
  maybeDeselect(state, unit);
  planAllIntents(state);
  checkWinLoss(state);
  return { ok: true, results };
}

function abilityOpts(ability) {
  return {
    ability: ability.id,
    accuracy: ability.accuracy,
    accuracyMod: ability.accuracy != null ? 0 : ability.accuracyMod,
    damageBonus: ability.damageMode === 'weapon' ? (ability.damage || 0) : 0,
    flatDamage: ability.damageMode === 'flat' ? ability.damage : null,
    knockback: ability.knockback,
    // The ability's own cost is the price; the swing must not also empty the
    // pool, or a 2-cost ability would silently charge everything you had.
    keepMomentum: true,
  };
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
  // The enemy turn begins: their momentum from LAST round is spent, and each
  // will bank fresh momentum as it steps. Cleared here so the evasion an
  // operator sees while planning is the evasion that was actually earned
  // during the phase they just watched.
  for (const u of state.units) if (u.faction === 'enemy') clearMomentum(u);
  return { ok: true };
}

// Resolves exactly one enemy's turn (freshly re-planned, since earlier
// enemies this same phase — or the player's last action — may have changed
// the board) and returns a descriptor for the HUD/animation layer to show.
// Returns { done: true } once the phase is empty, having already flipped
// back to the player and reset the move/act flags for the new round.
// Who acts next, without acting. main.js uses this to point the camera at an
// enemy BEFORE it moves — seeing a unit arrive somewhere is not the same as
// watching it go, and "I can't see who is going where" is what the board
// looked like when the two happened in the same frame.
export function peekEnemyQueue(state) {
  if (state.turn !== 'enemy') return null;
  for (const uid of state.enemyQueue) {
    const enemy = getUnit(state, uid);
    if (enemy && enemy.hp > 0) return uid;
  }
  return null;
}

export function stepEnemyPhase(state) {
  if (state.turn !== 'enemy') return null;
  while (state.enemyQueue.length) {
    const uid = state.enemyQueue.shift();
    const enemy = getUnit(state, uid);
    if (!enemy || enemy.hp <= 0) continue;
    // The unit the board is currently about — render.js spotlights it and
    // the camera follows it. Cleared when the phase ends, below.
    state.actingUid = uid;

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
        // Enemies bank momentum from their own step exactly as operators do —
        // an asymmetric rule would be a trap the player learns to exploit,
        // and evasion in particular has to cut both ways or closing on a
        // skirmisher becomes free.
        addMomentum(enemy, Math.abs(intent.moveTo.x - enemy.x) + Math.abs(intent.moveTo.y - enemy.y));
        enemy.x = intent.moveTo.x; enemy.y = intent.moveTo.y;
        moved = { x: enemy.x, y: enemy.y };
        enterHazard(state, enemy, 'move');
        // Overwatch fires HERE — after the step, before the enemy acts. It
        // is the only reaction in the game, and it is what stops crossing
        // open ground being free: through v24 an enemy could walk the whole
        // board under a held gun and nothing happened.
        overwatchFire(state, enemy);
      }
    }
    // An enemy that just burned to death (or was shoved into a stairwell and
    // is only now taking its turn) does not get to swing.
    if (enemy.hp <= 0) {
      state.log.push({ type: 'enemy-turn', uid, name: enemy.name, moved, attacked: null });
      checkWinLoss(state);
      return { done: false, uid, name: enemy.name, moved, attacked: null };
    }
    if (intent.type === 'reload') {
      // Symmetric with the crew's rule: the action refills, the move was
      // already spent above. An enemy that reloads is a real beat the player
      // can read and exploit — it is the window the telegraph promised.
      const mag = magOf(enemy.weapon);
      if (mag != null && roundsLeft(enemy) < mag) {
        enemy.ammo = mag;
        state.log.push({ type: 'reload', uid: enemy.uid, name: enemy.name, ammo: enemy.ammo });
      }
      return { done: false, uid, name: enemy.name, moved, attacked: null, reloaded: true };
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
  for (const u of state.units) if (u.faction === 'player') {
    u.actedMove = false; u.actedAction = false;
    // Momentum never carries between turns — it is this turn's movement, not
    // a bank. Cleared at the START of the player's turn rather than the end
    // of it, so a unit that moved and did not attack still shows the evasion
    // it earned all through the enemy phase it is about to face.
    clearMomentum(u);
  }
  // A posture for one enemy phase, never a standing order. Anything still
  // held here was never triggered, and holding it into a turn the player is
  // about to spend moving would be a promise the board stopped showing.
  state.overwatch.clear();
  // A survive objective is decided HERE and nowhere else: outlasting round N
  // is an event with no attack behind it, so without this call the win would
  // only be noticed the next time somebody happened to take damage.
  checkWinLoss(state);
  planAllIntents(state);
  state.actingUid = null;
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
// Everything that can end an encounter, in one place. Each mode is a branch
// rather than a subclass because `state.win` is DATA (GDD §3) — a new
// objective is encounter JSON plus a clause here, never an engine rewrite.
function checkWinLoss(state) {
  if (state.result) return;
  const win = state.win || { mode: 'eliminate' };
  if (!state.units.some(u => u.faction === 'player' && u.hp > 0)) { state.result = 'lose'; return; }

  // A DEADLINE is the game's second loss condition, and until now it had
  // only one (the crew wipe). Without it an extraction mission is just a
  // walk: nothing punishes taking twenty rounds to cross the board, so the
  // objective carries no pressure and the fight around it does not matter.
  if (win.deadline && state.round > win.deadline) { state.result = 'lose'; return; }

  // Clearing the block wins any mission. Stated on the title card ("killing
  // them all also wins") because a player who has just wiped the board and
  // is then told to keep walking would rightly call it a bug — and on these
  // rosters it is never the easy route anyway.
  if (!state.units.some(u => u.faction === 'enemy' && u.hp > 0)) { state.result = 'win'; return; }

  if (win.mode === 'survive' && state.round > win.rounds) { state.result = 'win'; return; }

  if (win.mode === 'destroy') {
    const left = state.units.filter(u => u.faction === 'objective' && u.hp > 0);
    if (!left.length) { state.result = 'win'; return; }
  }

  if (win.mode === 'extract') {
    const alive = state.units.filter(u => u.faction === 'player' && u.hp > 0);
    const need = win.need || alive.length;
    // `need` IS ABSOLUTE, and clamping it to the living was a real fault:
    // with `Math.min(need, alive)` a crew that lost somebody needed fewer
    // bodies on the pads, so losing an operator made the mission EASIER and
    // the cheapest way to pass a 3-of-3 extraction was to let one die.
    // Falling below it is instead the game's third loss condition — the
    // mission is now unpassable and saying so beats letting the player walk
    // out a run that cannot be completed.
    if (alive.length < need) { state.result = 'lose'; return; }
    const out = alive.filter(u => state.extract.has(key(u.x, u.y)));
    if (out.length >= need) { state.result = 'win'; return; }
  }
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
