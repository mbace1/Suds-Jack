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
  while (frontier.length && cost < unit.move) {
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
export function approachTile(state, unit, target) {
  const reachable = unit.actedMove
    ? new Map([[key(unit.x, unit.y), { x: unit.x, y: unit.y, cost: 0 }]])
    : moveRange(state, unit);
  let best = null;
  for (const { x, y, cost } of reachable.values()) {
    if (manhattan({ x, y }, target) > unit.weapon.range) continue;
    if (!hasLOS(state, { x, y }, target)) continue;
    if (!best || cost < best.cost) best = { x, y, cost };
  }
  return best;
}
