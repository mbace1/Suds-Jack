// The board: orthogonal (4-directional) tiles, ITB-style rather than an
// 8-directional grid — it is what keeps range and line-of-sight unambiguous
// (no "does a diagonal cut a corner" question to answer), and it is one of
// the two named influences (Into the Breach) rather than a departure from
// either. All game logic below works in plain (x,y) grid space; the iso
// *look* is a render-time projection only (render.js), never fed back in.

export const key = (x, y) => `${x},${y}`;

export const inBounds = (grid, x, y) => x >= 0 && y >= 0 && x < grid.cols && y < grid.rows;

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// Every live unit at a tile, or null. `exclude` lets a unit check its own
// starting tile without seeing itself as blocking.
export function unitAt(state, x, y, exclude) {
  for (const u of state.units) {
    if (u.hp <= 0) continue;
    if (u === exclude) continue;
    if (u.x === x && u.y === y) return u;
  }
  return null;
}

// BFS move range: full-cover tiles and occupied tiles block passage; cost is
// 1 per step, capped at the unit's `move` stat. Returns a Map of "x,y" -> the
// tile plus the path cost, which is also everywhere a "can this unit legally
// stand here" check reads from.
export function moveRange(state, unit) {
  const { grid, fullCover } = state;
  const start = { x: unit.x, y: unit.y };
  const seen = new Map();
  seen.set(key(start.x, start.y), { x: start.x, y: start.y, cost: 0 });
  let frontier = [start];
  let cost = 0;
  // `slowed` (the Enforcer line's Cripple) comes off the move budget here and
  // nowhere else, so every reader of move range — the highlight, the AI's
  // telegraph, approachTile, the bots — sees the same shortened reach without
  // any of them learning the rule. Never below 1: a unit pinned to zero can
  // be farmed from range with nothing it can do, which is a different game.
  const budget = Math.max(1, unit.move - (unit.slowed || 0));
  while (frontier.length && cost < budget) {
    cost++;
    const next = [];
    for (const { x, y } of frontier) {
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy;
        if (!inBounds(grid, nx, ny)) continue;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        if (fullCover.has(k)) continue;
        if (unitAt(state, nx, ny, unit)) continue;
        seen.set(k, { x: nx, y: ny, cost });
        next.push({ x: nx, y: ny });
      }
    }
    frontier = next;
  }
  return seen;
}

// Bresenham's line, tile centers, endpoints excluded — the set of tiles a
// shot actually crosses between attacker and target.
export function lineTiles(a, b) {
  const pts = [];
  let x0 = a.x, y0 = a.y;
  const x1 = b.x, y1 = b.y;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    if (!(x0 === a.x && y0 === a.y) && !(x0 === x1 && y0 === y1)) pts.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return pts;
}

// Full cover blocks a shot outright (and melee can never reach through it,
// since it also blocks movement). Adjacent tiles always see each other.
export function hasLOS(state, a, b) {
  if (manhattan(a, b) <= 1) return true;
  for (const t of lineTiles(a, b)) {
    if (state.fullCover.has(key(t.x, t.y))) return false;
  }
  return true;
}

// Partial cover softens a ranged hit rather than blocking it: true if the
// shot's path crosses a partial-cover tile, or the target is standing on one.
export function coverSoftens(state, a, b) {
  if (state.partialCover.has(key(b.x, b.y))) return true;
  for (const t of lineTiles(a, b)) {
    if (state.partialCover.has(key(t.x, t.y))) return true;
  }
  return false;
}

export function inRange(state, weapon, a, b) {
  return manhattan(a, b) <= weapon.range;
}

// The cheapest tile `unit` could stand on to hit `target` this turn — its
// current tile if already in range, otherwise the nearest reachable tile
// with range and LOS, or null if no such tile exists. Shared by the AI
// (ai.js) and by click-to-attack in input.js, so "can I reach this fight"
// is answered exactly once.
// Every tile this unit could hit `target` from this turn. The raw list, so
// the UI can offer a CHOICE rather than a fait accompli.
export function firingTiles(state, unit, target) {
  const reachable = unit.actedMove
    ? new Map([[key(unit.x, unit.y), { x: unit.x, y: unit.y, cost: 0 }]])
    : moveRange(state, unit);
  const out = [];
  for (const { x, y, cost } of reachable.values()) {
    if (manhattan({ x, y }, target) > unit.weapon.range) continue;
    if (!hasLOS(state, { x, y }, target)) continue;
    out.push({ x, y, cost });
  }
  return out;
}

// What a firing tile is WORTH. Higher is better.
//
// THIS USED TO BE "the cheapest tile that can reach", and by v27 that was
// actively wrong. Measured over 400 one-tap attacks where a real choice of
// tile existed, the cheapest tile banked LESS momentum than an available
// alternative 80% of the time and stopped in the open when cover was on
// offer 20% of the time — so the single most common input in the game was
// systematically fighting the movement economy (v24) and ignoring the cover
// rules (v6) and the hazards (v18). A default that quietly plays badly is
// worse than no default.
//
// Deliberately in grid.js and not in the AI: this is what the PLAYER's tap
// resolves to, and ai.js keeps its own scoring because a behaviour has to be
// free to disagree with "the best tile" (that is what a behaviour IS).
export function firingTileScore(state, unit, target, tile) {
  let score = 0;
  // Cover against the unit you are shooting at is worth the most: it is the
  // one term that changes what happens to you on THEIR turn.
  if (coverSoftens(state, target, tile)) score += 6;
  // Every other gun that bears on the tile costs, softened if something is
  // between them and it.
  for (const f of state.units) {
    if (f.faction === unit.faction || f.hp <= 0 || !f.weapon || f === target) continue;
    if (manhattan(tile, f) > f.weapon.range) continue;
    if (!hasLOS(state, f, tile)) continue;
    score -= coverSoftens(state, f, tile) ? 1 : 2.5;
  }
  // A hazard is measured in HP, which is worth more than any positional term
  // here — walking into a fire to take a shot is never the default.
  const h = state.hazards && state.hazards.get(key(tile.x, tile.y));
  if (h) score -= h.lethal ? 100 : ((h.onEnter || 0) + (h.lingers || 0)) * 3;
  // Distance travelled is momentum (momentum.js), which is damage on this
  // swing or evasion until you use it. Small per tile, because it must not
  // outweigh cover — but positive, so a tie goes to the longer run.
  score += manhattan(tile, unit) * 0.6;
  return score;
}

// The tile a one-tap attack uses: the BEST one, not the nearest. Ties break
// on tile key so the same board always resolves the same way — a default
// that moves you somewhere different on a replay is not a default.
export function approachTile(state, unit, target) {
  const tiles = firingTiles(state, unit, target);
  let best = null, bestScore = -Infinity;
  for (const t of tiles) {
    const s = firingTileScore(state, unit, target, t);
    if (s > bestScore || (s === bestScore && best && key(t.x, t.y) < key(best.x, best.y))) {
      bestScore = s; best = t;
    }
  }
  return best;
}
