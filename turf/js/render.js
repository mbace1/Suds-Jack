// The board, drawn low-res and upscaled with image-rendering: pixelated —
// the same trick every canvas game in this repo uses (see dropcabal's 220px
// internal height). Game logic stays in plain (x,y) grid space (grid.js);
// everything here is a one-way projection of that state onto an isometric
// diamond grid, never fed back into it.
import { PAL } from './palette.js';
import { key } from './grid.js';

export const TILE_W = 32, TILE_H = 16, UNIT_H = 18;

export function computeLayout(grid) {
  const minA = -(grid.rows - 1), maxA = grid.cols - 1;
  const maxB = grid.cols + grid.rows - 2;
  const width = Math.ceil((maxA - minA) * (TILE_W / 2) + TILE_W * 2);
  const height = Math.ceil(maxB * (TILE_H / 2) + UNIT_H + TILE_H * 4);
  const originX = Math.round(-minA * (TILE_W / 2) + TILE_W);
  const originY = UNIT_H + TILE_H;
  return { width, height, originX, originY };
}

export function toScreen(layout, gx, gy) {
  return {
    x: layout.originX + (gx - gy) * (TILE_W / 2),
    y: layout.originY + (gx + gy) * (TILE_H / 2),
  };
}

// Inverse of toScreen, rounded to the nearest tile — how a click becomes a
// grid coordinate. Not clamped to the board; callers check inBounds.
export function screenToGrid(layout, px, py) {
  const dx = px - layout.originX, dy = py - layout.originY;
  const a = dx / (TILE_W / 2), b = dy / (TILE_H / 2);
  return { x: Math.round((a + b) / 2), y: Math.round((b - a) / 2) };
}

function pen(ctx) {
  const p = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const diamond = (cx, cy, w, h, fill, edge) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke(); }
  };
  const line = (x0, y0, x1, y1, c, dash) => {
    ctx.strokeStyle = c; ctx.lineWidth = 1;
    ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.setLineDash([]);
  };
  const disc = (cx, cy, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); };
  return { p, diamond, line, disc };
}

function drawFloor(g, layout, grid, fullCover, partialCover) {
  for (let gy = 0; gy < grid.rows; gy++) {
    for (let gx = 0; gx < grid.cols; gx++) {
      const { x, y } = toScreen(layout, gx, gy);
      let fill = (gx + gy) % 2 === 0 ? PAL.FLOOR_A : PAL.FLOOR_B;
      if (gy <= 1) fill = mixFloor(fill, PAL.FLOOR_FAR);
      else if (gy >= grid.rows - 2) fill = mixFloor(fill, PAL.FLOOR_HOME);
      g.diamond(x, y, TILE_W, TILE_H, fill, PAL.FLOOR_LINE);
    }
  }
}
function mixFloor(a, b) {
  const ch = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const v = i => Math.round(ch(a, i) * 0.75 + ch(b, i) * 0.25).toString(16).padStart(2, '0');
  return `#${v(0)}${v(1)}${v(2)}`;
}

function drawHighlights(g, layout, state) {
  if (!state.moveTiles) return;
  for (const { x: gx, y: gy } of state.moveTiles.values()) {
    const { x, y } = toScreen(layout, gx, gy);
    g.diamond(x, y, TILE_W - 4, TILE_H - 2, PAL.MOVE_HI, PAL.MOVE_HI_EDGE);
  }
  for (const uid of state.attackTiles || []) {
    const u = state.units.find(t => t.uid === uid);
    if (!u) continue;
    const { x, y } = toScreen(layout, u.x, u.y);
    g.diamond(x, y, TILE_W - 2, TILE_H, null, PAL.ATTACK_HI_EDGE);
  }
}

// Full cover: a squat closed box (dumpster/fence/parked car). Partial: a
// shorter, lighter one (crate/curb/rubble) — visually distinct at a glance,
// which is the one thing the pipeline doc asks of the two cover kinds.
function drawProp(g, layout, gx, gy, tall) {
  const { x, y } = toScreen(layout, gx, gy);
  const w = tall ? TILE_W * 0.62 : TILE_W * 0.5;
  const h = tall ? UNIT_H * 0.75 : UNIT_H * 0.36;
  const topFill = tall ? PAL.COVER_FULL : PAL.COVER_PARTIAL;
  const bodyFill = tall ? PAL.COVER_FULL_DK : PAL.COVER_PARTIAL_DK;
  const edge = tall ? PAL.COVER_FULL_EDGE : PAL.COVER_FULL_EDGE;
  const topY = y - h;
  g.p(x - w / 2, topY, w, h, bodyFill);
  g.diamond(x, topY, w, w * (TILE_H / TILE_W), topFill, edge);
  ctxStroke(g, x - w / 2, topY, x - w / 2, topY + h, edge);
  ctxStroke(g, x + w / 2, topY, x + w / 2, topY + h, edge);
  ctxStroke(g, x - w / 2, topY + h, x + w / 2, topY + h, edge);
}
function ctxStroke(g, x0, y0, x1, y1, c) { g.line(x0, y0, x1, y1, c); }

function drawUnit(g, layout, unit, isSelected) {
  const { x, y } = toScreen(layout, unit.x, unit.y);
  const isPlayer = unit.faction === 'player';
  const body = isPlayer ? PAL.PLAYER : PAL.ENEMY;
  const dark = isPlayer ? PAL.PLAYER_DK : PAL.ENEMY_DK;
  const feetY = y - 2;
  const bodyH = UNIT_H * 0.6, headR = 3.4;

  if (isSelected) g.diamond(x, y, TILE_W - 2, TILE_H - 1, null, PAL.SELECT_EDGE);

  // shadow
  g.diamond(x, y, TILE_W * 0.4, TILE_H * 0.35, 'rgba(0,0,0,0.35)', null);
  // legs/body — a flat trapezoid silhouette, Master-System-style hard edge
  g.p(x - 4, feetY - bodyH, 8, bodyH, dark);
  g.p(x - 3, feetY - bodyH - 1, 6, bodyH * 0.55, body);
  // head
  g.disc(x, feetY - bodyH - headR - 1, headR, body);
  // role marker
  if (unit.role === 'melee') g.line(x - 5, feetY - bodyH * 0.55, x + 5, feetY - bodyH * 0.85, PAL.INK);
  else if (unit.role === 'ranged') g.disc(x + 5, feetY - bodyH * 0.65, 1.4, PAL.INK);
  else g.p(x - 6, feetY - bodyH * 0.7, 12, 2, PAL.INK);
  // outline
  g.diamond(x, feetY - bodyH * 0.4, 9, bodyH + 5, null, PAL.INK);

  // HP bar
  const hpW = 14, frac = Math.max(0, unit.hp / unit.maxHp);
  const hpY = feetY - bodyH - headR * 2 - 6;
  g.p(x - hpW / 2, hpY, hpW, 2, PAL.HP_TRACK);
  const hpColor = frac > 0.5 ? PAL.HP_GOOD : frac > 0.25 ? PAL.HP_MID : PAL.HP_BAD;
  g.p(x - hpW / 2, hpY, hpW * frac, 2, hpColor);
}

function drawTelegraph(g, layout, state) {
  for (const [uid, intent] of state.telegraph) {
    const enemy = state.units.find(u => u.uid === uid);
    if (!enemy || enemy.hp <= 0 || !intent.moveTo) continue;
    const at = toScreen(layout, intent.moveTo.x, intent.moveTo.y);
    if (intent.type === 'attack') {
      const target = state.units.find(u => u.uid === intent.targetUid);
      if (target) {
        const tp = toScreen(layout, target.x, target.y);
        g.line(at.x, at.y - UNIT_H * 0.4, tp.x, tp.y - UNIT_H * 0.3, PAL.TELEGRAPH, [2, 2]);
        g.diamond(tp.x, tp.y, TILE_W - 6, TILE_H - 3, null, PAL.TELEGRAPH);
      }
      g.p(at.x - 1, at.y - UNIT_H - 6, 2, 4, PAL.TELEGRAPH);
    } else if (intent.type === 'move') {
      g.disc(at.x, at.y, 1.5, PAL.TELEGRAPH);
    }
  }
}

export function render(canvas, state, layout) {
  const ctx = canvas.getContext('2d');
  const g = pen(ctx);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  g.p(0, 0, canvas.width, canvas.height, PAL.VOID);

  drawFloor(g, layout, state.grid, state.fullCover, state.partialCover);
  drawHighlights(g, layout, state);

  const props = [];
  for (const k of state.fullCover) { const [x, y] = k.split(',').map(Number); props.push({ x, y, depth: x + y, tall: true }); }
  for (const k of state.partialCover) { const [x, y] = k.split(',').map(Number); props.push({ x, y, depth: x + y, tall: false }); }
  const drawables = [
    ...props.map(p => ({ depth: p.depth, draw: () => drawProp(g, layout, p.x, p.y, p.tall) })),
    ...state.units.filter(u => u.hp > 0).map(u => ({
      depth: u.x + u.y,
      draw: () => drawUnit(g, layout, u, state.selected === u.uid),
    })),
  ].sort((a, b) => a.depth - b.depth);
  for (const d of drawables) d.draw();

  if (state.turn === 'player') drawTelegraph(g, layout, state);
}
