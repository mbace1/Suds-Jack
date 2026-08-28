// Enemy brain: "move toward + attack nearest" (production pipeline §2.2's
// baseline AI) plus the ITB-style telegraph — the plan an enemy would
// execute if its turn started right now, recomputed after every player
// action so the intent shown on screen never lies about the current board.
import { manhattan, moveRange, approachTile } from './grid.js?v=1';

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

  const bestAttack = approachTile(state, enemy, target);
  if (bestAttack) {
    return { type: 'attack', moveTo: { x: bestAttack.x, y: bestAttack.y }, targetUid: target.uid };
  }

  // Can't reach range this turn — close the gap as much as possible.
  const reachable = moveRange(state, enemy);
  let bestMove = { x: enemy.x, y: enemy.y }, bestDist = manhattan(enemy, target);
  for (const { x, y } of reachable.values()) {
    const d = manhattan({ x, y }, target);
    if (d < bestDist) { bestDist = d; bestMove = { x, y }; }
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
