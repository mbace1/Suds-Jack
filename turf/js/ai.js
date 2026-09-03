// Enemy brain: "move toward + attack nearest" (production pipeline §2.2's
// baseline AI) plus the ITB-style telegraph — the plan an enemy would
// execute if its turn started right now, recomputed after every player
// action so the intent shown on screen never lies about the current board.
import { manhattan, moveRange, hasLOS, coverSoftens, key } from './grid.js?v=2';
import { evasionOf, EVADE_PER } from './momentum.js?v=1';
import { needsReload } from './ammo.js?v=2';

// What standing on a tile costs this enemy, in HP. A lethal hazard is scored
// as its whole health bar rather than Infinity so the comparison stays
// arithmetic — and so an enemy on 1 HP treats a fire and a stairwell as the
// near-equivalent deaths they both are.
//
// Without this the telegraph LIES: it promises a move the enemy would never
// sanely make, the player reads it, and the enemy then walks into a stairwell
// on its own turn. A full-information game cannot show a plan its own actor
// would regret.
function hazardCost(state, enemy, x, y) {
  const h = state.hazards && state.hazards.get(key(x, y));
  if (!h) return 0;
  if (h.lethal) return enemy.hp;
  return (h.onEnter || 0) + (h.lingers || 0); // ending a turn there pays twice
}

// GDD §10's other open question: "Enemy archetypes and how 'weaker but
// numerous' translates to actual stat design." Eighteen enemies shipped
// before this all ran the SAME plan — close on the nearest operator and
// swing — so they differed only in how much damage they did. In an
// Into-the-Breach-shaped game the enemy roster is a set of BEHAVIOURS, not a
// stat table: variety has to be visible in the telegraph, because the
// telegraph is the whole game. Two enemies that both say "I will hit Blade"
// are one enemy with two portraits.
//
// Data-driven per GDD §3 — enemies.json names a behaviour and a focus, and
// nothing here knows which grunt is which. An unknown name falls back to
// `charger`, so a typo in content is a dull enemy, never a crash.
//
// Ties break on uid throughout, because the telegraph must be STABLE: it is
// recomputed after every player action, and an intent that flickers between
// two equally good tiles is unreadable even though each frame is "correct".

// Who an enemy wants dead. `weakest` is what makes a pack dangerous — it
// finishes the operator you were about to pull out, so a hurt unit cannot
// just be left standing at the back.
// Evasion is folded into both: a target that just sprinted is a worse shot
// than a stationary one at the same distance, and an AI that ignored that
// would keep promising shots it is unlikely to land. Scaled to tiles
// (EVADE_PER is a hit-chance fraction) so it trades against distance in the
// same units the rest of this file scores in.
const evadeTiles = (enemy, u) => evasionOf(u, enemy.weapon) / EVADE_PER;
const FOCUS = {
  nearest: (state, enemy, players) => pick(players, u => manhattan(enemy, u) + evadeTiles(enemy, u)),
  weakest: (state, enemy, players) =>
    pick(players, u => u.hp * 100 + manhattan(enemy, u) + evadeTiles(enemy, u)),
};

function pick(list, scoreFn) {
  let best = null, bestScore = Infinity;
  for (const u of list) {
    const s = scoreFn(u);
    if (s < bestScore || (s === bestScore && best && u.uid < best.uid)) { best = u; bestScore = s; }
  }
  return best;
}

// How an enemy wants to stand when it attacks. Each returns a penalty added
// to the tile's move cost — lower is better — so a behaviour expresses a
// preference without ever refusing a shot it can take.
const BEHAVIOUR = {
  // Straight at you. The baseline every grunt used to be.
  charger: () => 0,

  // Wants the range its gun gives it. Prefers standing as far from the
  // target as the weapon allows, and pays a real penalty for ending up
  // inside anyone's melee reach — which is what turns a handgun grunt from
  // "a knife that shoots" into something you have to close on.
  skirmisher: (state, enemy, target, tile) => {
    const reach = manhattan(tile, target);
    let pen = (enemy.weapon.range - reach) * 1.2;
    for (const u of state.units) {
      if (u.faction !== 'enemy' && u.hp > 0 && manhattan(tile, u) <= 1) pen += 4;
    }
    return pen;
  },

  // Fights from behind something. Scores a tile by whether the TARGET's shot
  // back at it would be softened by cover — the mirror of the flanker below,
  // and the reason a firing line is worth breaking up.
  holder: (state, enemy, target, tile) => (coverSoftens(state, target, tile) ? 0 : 3),

  // Refuses to shoot into cover. Prefers the tile where the target's own
  // cover does NOT soften the incoming shot, which is what stops the player
  // parking in partial cover and treating it as a wall.
  flanker: (state, enemy, target, tile) => (coverSoftens(state, tile, target) ? 3.5 : 0),
};

// Every tile this enemy could attack `target` from this turn. Deliberately
// NOT approachTile(): that answers "the cheapest tile", which is exactly the
// question a behaviour needs to disagree with. approachTile stays untouched
// because input.js's click-to-attack depends on it meaning what it means.
function attackOptions(state, enemy, target) {
  const reachable = enemy.actedMove
    ? new Map([[key(enemy.x, enemy.y), { x: enemy.x, y: enemy.y, cost: 0 }]])
    : moveRange(state, enemy);
  const out = [];
  for (const { x, y, cost } of reachable.values()) {
    if (manhattan({ x, y }, target) > enemy.weapon.range) continue;
    if (!hasLOS(state, { x, y }, target)) continue;
    out.push({ x, y, cost });
  }
  return out;
}

function nearestTarget(state, enemy) {
  const players = state.units.filter(u => u.faction === 'player' && u.hp > 0);
  if (!players.length) return null;
  const focus = FOCUS[enemy.focus] || FOCUS.nearest;
  return focus(state, enemy, players);
}

// The plan for one enemy: which tile to (maybe) move to, and who it attacks
// from there — or, failing to reach range this turn, just the tile that
// closes the most distance. Never mutates state.
export function planIntent(state, enemy) {
  const target = nearestTarget(state, enemy);
  if (!target) return { type: 'idle' };

  // AN EMPTY GUN IS TELEGRAPHED. Enemies reload on exactly the rule the crew
  // does, and a rival standing still because it has nothing chambered has to
  // SAY so — otherwise the board shows an enemy doing nothing for no visible
  // reason, which in a game whose whole contract is full information reads
  // as a bug rather than a beat. It still repositions while it reloads: the
  // move is untouched by the action, both ways.
  if (needsReload(enemy)) {
    const reachable = enemy.actedMove ? [] : [...moveRange(state, enemy).values()];
    let best = { x: enemy.x, y: enemy.y };
    let bestScore = manhattan(enemy, target) + hazardCost(state, enemy, enemy.x, enemy.y) * 1.5;
    for (const { x, y } of reachable) {
      // Backing OFF while empty: a rival with nothing to fire wants distance,
      // not a knife fight, so it scores tiles by how far from the crew they
      // are rather than how near.
      const s2 = -manhattan({ x, y }, target) + hazardCost(state, enemy, x, y) * 1.5;
      if (s2 < bestScore) { bestScore = s2; best = { x, y }; }
    }
    return { type: 'reload', moveTo: best, targetUid: target.uid };
  }

  // Pick a firing position the way this enemy's behaviour wants to stand,
  // not merely the closest one. An attack is still worth a scratch but never
  // worth dying for, so a tile that would kill this enemy outright is out.
  const shape = BEHAVIOUR[enemy.behaviour] || BEHAVIOUR.charger;
  const options = attackOptions(state, enemy, target)
    .filter(t => hazardCost(state, enemy, t.x, t.y) < enemy.hp);
  if (options.length) {
    // Reaching the shot costs MOMENTUM as well as tiles, and momentum is
    // evasion — so a tile further away is not only slower, it leaves this
    // enemy easier to hit on the turn that follows. Folding that in is what
    // keeps the telegraph honest once the movement economy exists: an enemy
    // that ignored it would promise a position it would regret standing in.
    const best = pick(
      options.map(t => ({ ...t, uid: `${t.x},${t.y}` })),
      t => t.cost + shape(state, enemy, target, t) + hazardCost(state, enemy, t.x, t.y) * 1.5,
    );
    return { type: 'attack', moveTo: { x: best.x, y: best.y }, targetUid: target.uid };
  }

  // Can't reach range this turn (or the only firing tile is fatal) — close
  // the gap as much as possible. Distance is scored in tiles, hazard cost in
  // HP; one HP is worth a tile and a half here, which is enough to route a
  // healthy enemy around a fire but not enough to make it refuse a shortcut
  // that only costs a scratch.
  const reachable = moveRange(state, enemy);
  const score = (x, y) => manhattan({ x, y }, target) + hazardCost(state, enemy, x, y) * 1.5;
  let bestMove = { x: enemy.x, y: enemy.y };
  let bestScore = score(enemy.x, enemy.y);
  for (const { x, y } of reachable.values()) {
    const s = score(x, y);
    if (s < bestScore) { bestScore = s; bestMove = { x, y }; }
  }
  return { type: 'move', moveTo: bestMove, targetUid: target.uid };
}

export function planAllIntents(state) {
  const telegraph = new Map();
  for (const u of state.units) {
    if (u.faction !== 'enemy' || u.hp <= 0) continue;
    telegraph.set(u.uid, planIntent(state, u));
  }
  state.telegraph = telegraph;
  return telegraph;
}
