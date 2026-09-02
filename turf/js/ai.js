// Enemy brain: "move toward + attack nearest" (production pipeline §2.2's
// baseline AI) plus the ITB-style telegraph — the plan an enemy would
// execute if its turn started right now, recomputed after every player
// action so the intent shown on screen never lies about the current board.
import { manhattan, moveRange, approachTile, key } from './grid.js?v=2';

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

function nearestTarget(state, enemy) {
  let best = null, bestDist = Infinity;
  for (const u of state.units) {
    if (u.faction !== 'player' || u.hp <= 0) continue;
    const d = manhattan(enemy, u);
    if (d < bestDist || (d === bestDist && (!best || u.uid < best.uid))) { best = u; bestDist = d; }
  }
  return best;
}

// The plan for one enemy: which tile to (maybe) move to, and who it attacks
// from there — or, failing to reach range this turn, just the tile that
// closes the most distance. Never mutates state.
export function planIntent(state, enemy) {
  const target = nearestTarget(state, enemy);
  if (!target) return { type: 'idle' };

  // An attack is still worth a scratch, but not worth dying for: take the
  // firing position unless standing there would kill this enemy outright.
  const bestAttack = approachTile(state, enemy, target);
  if (bestAttack && hazardCost(state, enemy, bestAttack.x, bestAttack.y) < enemy.hp) {
    return { type: 'attack', moveTo: { x: bestAttack.x, y: bestAttack.y }, targetUid: target.uid };
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
