// The board, drawn low-res and upscaled with image-rendering: pixelated —
// the same trick every canvas game in this repo uses (see dropcabal's 220px
// internal height). Game logic stays in plain (x,y) grid space (grid.js);
// everything here is a one-way projection of that state onto an isometric
// diamond grid, never fed back into it.
import { PAL } from './palette.js?v=3';
import { key } from './grid.js?v=2';

export const TILE_W = 32, TILE_H = 16, UNIT_H = 18;
// The real on-board sprite height (drawUnitSprite) — taller than the old
// UNIT_H silhouette, so layout headroom and input.js's tap hit-box both key
// off this instead once every unit carries a `sprite`. UNIT_H stays as-is:
// still used for the one-frame procedural fallback and for prop sizing.
export const SPRITE_H = 46;

// Side clearance beyond the tile diamonds themselves, for whatever a unit
// draws past its own tile's edge — the widest of those is the 14px HP bar
// (drawUnit) and the 14px cursor ring (drawCursor), each ~7px past tile
// centre. This used to be a full TILE_W (32px) per side, generous well past
// what anything actually draws — and on a phone-width viewport a wide grid
// (backlot is 11 tiles across) is width-bound, so that unused margin was
// screen real estate the board could have used instead (main.js's
// fitCanvas fits to whichever of width/height is tighter). Trimmed once to
// 24 already (v8); a real phone playtest of that build still called the
// board too small, so trimmed again to 16 — leaves 9px of slack beyond the
// 7px bulge, checked empirically (screenshots at four widths, both
// encounters) rather than assumed safe.
const SIDE_MARGIN = 16;

// A real character/prop image, cached across renders. render() is called
// synchronously and often (every state change) with no await anywhere in
// this file, so an image that isn't decoded yet just isn't drawn THIS call
// — its onload re-invokes render() with the last known (canvas, state,
// layout) once it's ready, and after that getImage returns it immediately
// from cache. Every caller (drawUnit, drawProp) already has a procedural
// fallback for exactly this one-call gap, so there's no loading flash of
// broken art — worst case is one frame of the old placeholder shape.
const imageCache = new Map();
let lastRenderArgs = null;
function getImage(src) {
  if (!src) return null;
  let entry = imageCache.get(src);
  if (!entry) {
    const img = new Image();
    entry = { img, loaded: false };
    img.onload = () => {
      entry.loaded = true;
      if (lastRenderArgs) render(lastRenderArgs.canvas, lastRenderArgs.state, lastRenderArgs.layout);
    };
    img.src = src;
    imageCache.set(src, entry);
  }
  return entry.loaded ? entry.img : null;
}

export function computeLayout(grid) {
  const minA = -(grid.rows - 1), maxA = grid.cols - 1;
  const maxB = grid.cols + grid.rows - 2;
  const width = Math.ceil((maxA - minA) * (TILE_W / 2) + SIDE_MARGIN * 2);
  // Headroom keys off SPRITE_H (the real drawn unit height), not the old,
  // shorter UNIT_H silhouette — a full-height sprite in row 0 needs more
  // clearance above the grid or its head (and HP bar above that) clips off
  // the top of the canvas.
  const height = Math.ceil(maxB * (TILE_H / 2) + SPRITE_H + TILE_H * 4);
  const originX = Math.round(-minA * (TILE_W / 2) + SIDE_MARGIN);
  const originY = SPRITE_H + TILE_H;
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
  // lw defaults to 1 (the crisp pixel-art outline every prop/unit already
  // draws with) but interaction affordances — move/attack highlights, the
  // telegraph, the selection ring, the cursor — pass 2: a real playtest on
  // a phone found the board legible in screenshots but not on the actual
  // device, where a 1px stroke on a board this physically small all but
  // disappears. Everything decorative stays thin; everything the player
  // has to read to make a move gets to be twice as heavy.
  const diamond = (cx, cy, w, h, fill, edge, lw = 1) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = lw; ctx.stroke(); }
  };
  const line = (x0, y0, x1, y1, c, dash, lw = 1) => {
    ctx.strokeStyle = c; ctx.lineWidth = lw;
    ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.setLineDash([]);
  };
  const disc = (cx, cy, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); };
  // ctx itself, for the two callers (drawUnit, drawProp) that need
  // drawImage — the pixel-rect/diamond/line/disc helpers above cover
  // everything procedural, but a real sprite has no procedural equivalent.
  return { p, diamond, line, disc, ctx };
}

// Owner direction, 2026-08-31: "the grid should be transparently laid on
// the backgrounds so that the players are in the courtyard." Each tile used
// to be an opaque fill — the whole reason a CSS background photo behind
// #stage (main.js's boot()) never showed through it. Now it's a thin tint
// (rgba, not a hex fill) plus the outline, low enough that the photo reads
// through but the grid itself — still the thing a player has to read to
// plan a move — stays a distinct, countable set of diamonds.
function drawFloor(g, layout, grid, fullCover, partialCover) {
  for (let gy = 0; gy < grid.rows; gy++) {
    for (let gx = 0; gx < grid.cols; gx++) {
      const { x, y } = toScreen(layout, gx, gy);
      let fill = (gx + gy) % 2 === 0 ? [20,22,28,0.30] : [20,22,28,0.16];
      if (gy <= 1) fill = mixTint(fill, [58,47,44,0.22]);
      else if (gy >= grid.rows - 2) fill = mixTint(fill, [42,52,58,0.22]);
      g.diamond(x, y, TILE_W, TILE_H, rgba(fill), 'rgba(10,11,14,0.55)');
    }
  }
}
function rgba([r, g, b, a]) { return `rgba(${r},${g},${b},${a})`; }
// A 75/25 weighted blend on both colour AND alpha — the same ratio the old
// opaque-hex mixFloor used for the far/home edge's warm/cold cast, kept
// here so that read carries over even though tiles are translucent now.
function mixTint(a, b) {
  return a.map((v, i) => v * 0.75 + b[i] * 0.25);
}

function drawHighlights(g, layout, state) {
  if (!state.moveTiles) return;
  for (const { x: gx, y: gy } of state.moveTiles.values()) {
    const { x, y } = toScreen(layout, gx, gy);
    g.diamond(x, y, TILE_W - 4, TILE_H - 2, PAL.MOVE_HI, PAL.MOVE_HI_EDGE, 2);
  }
  for (const uid of state.attackTiles || []) {
    const u = state.units.find(t => t.uid === uid);
    if (!u) continue;
    const { x, y } = toScreen(layout, u.x, u.y);
    g.diamond(x, y, TILE_W - 2, TILE_H, null, PAL.ATTACK_HI_EDGE, 2);
  }
}

// Full cover: 4 dense/tall props (crate-on-pallet, the park statue, the
// bike rack, the notice board). Partial: 4 shorter/lighter ones (barrier,
// bollard, bin, bench). A first pass split this 2/6 — with only 2 choices
// for full cover, a 5-6-tile encounter was guaranteed to repeat the same
// prop three times over ("the examples look ok, but have too many of the
// same objects"). Picked deterministically off the tile's own coordinates
// — same map every render, no per-frame flicker.
const FULL_PROPS = ['crate', 'statue', 'bikerack', 'noticeboard'];
const PARTIAL_PROPS = ['barrier', 'bollard', 'bin', 'bench'];
function propArt(gx, gy, tall) {
  const pool = tall ? FULL_PROPS : PARTIAL_PROPS;
  return pool[(gx * 7 + gy * 13) % pool.length];
}

// Procedural placeholder — a squat closed box (tall=full cover) or a
// shorter, lighter one (partial) — drawn only until the real prop image
// (propArt) has loaded, or if it fails to.
function drawPropFallback(g, layout, gx, gy, tall) {
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

function drawProp(g, layout, gx, gy, tall) {
  const { x, y } = toScreen(layout, gx, gy);
  const img = getImage(`art-src/sprites/props/${propArt(gx, gy, tall)}.png`);
  if (!img) { drawPropFallback(g, layout, gx, gy, tall); return; }
  const targetH = tall ? 40 : 24;
  const w = img.naturalWidth * (targetH / img.naturalHeight);
  g.diamond(x, y, w * 0.7, w * 0.7 * (TILE_H / TILE_W), 'rgba(0,0,0,0.3)', null); // ground shadow
  g.ctx.drawImage(img, x - w / 2, y - targetH, w, targetH);
}

// Owner direction, 2026-08-31: "start replacing player characters with
// character model sprites." `unit.sprite` (units.json/enemies.json) is the
// full-body casting-sheet plate — a different field from `portrait`, which
// is the headshot the squad-row/selection-panel UI uses (a body reads fine
// full-size on the board; it read as a blob shrunk to a 34px UI icon, which
// is why that one got cropped to a head instead). Falls back to the
// original procedural silhouette for any unit that has no sprite yet, or
// for the one render call before an image finishes loading.
function drawUnit(g, layout, unit, isSelected) {
  const { x, y } = toScreen(layout, unit.x, unit.y);
  const feetY = y - 2;

  if (isSelected) g.diamond(x, y, TILE_W - 2, TILE_H - 1, null, PAL.SELECT_EDGE, 2);
  g.diamond(x, y, TILE_W * 0.4, TILE_H * 0.35, 'rgba(0,0,0,0.35)', null); // shadow
  // A real character sprite carries its OWN colours (a jacket, not a faction
  // paint job), so the cold-operator/warm-rival read the old flat silhouette
  // gave for free is gone once the sprite draws over it — replaced with a
  // faction-tinted ring at the feet, the one thing every unit still stands
  // on regardless of which sprite (or the procedural fallback) is drawing
  // above it. Same two house colours as everywhere else in this game.
  const factionColor = unit.faction === 'player' ? PAL.PLAYER : PAL.ENEMY;
  g.diamond(x, y, TILE_W * 0.52, TILE_H * 0.46, null, factionColor, 1.5);

  const img = getImage(unit.sprite);
  const topY = img ? drawUnitSprite(g, img, x, feetY) : drawUnitFallback(g, unit, x, feetY);

  // role marker, same three glyphs either way — melee/ranged/control stay
  // readable at a glance even once the sprite art tells you who it is
  const markerY = topY + 8;
  if (unit.role === 'melee') g.line(x - 5, markerY, x + 5, markerY - 3, PAL.INK, null, 2);
  else if (unit.role === 'ranged') g.disc(x + 5, markerY, 1.6, PAL.INK);
  else g.p(x - 6, markerY - 1, 12, 2, PAL.INK);

  // HP bar
  const hpW = 14, frac = Math.max(0, unit.hp / unit.maxHp);
  const hpY = topY - 6;
  g.p(x - hpW / 2, hpY, hpW, 2, PAL.HP_TRACK);
  const hpColor = frac > 0.5 ? PAL.HP_GOOD : frac > 0.25 ? PAL.HP_MID : PAL.HP_BAD;
  g.p(x - hpW / 2, hpY, hpW * frac, 2, hpColor);
}
// Draws the real sprite, bottom-anchored at feetY; returns the y of its top
// (both callers use this for the HP bar / role marker so their position
// doesn't care which branch drew the body beneath them).
function drawUnitSprite(g, img, x, feetY) {
  const targetH = SPRITE_H;
  const w = img.naturalWidth * (targetH / img.naturalHeight);
  g.ctx.drawImage(img, x - w / 2, feetY - targetH, w, targetH);
  return feetY - targetH;
}
function drawUnitFallback(g, unit, x, feetY) {
  const isPlayer = unit.faction === 'player';
  const body = isPlayer ? PAL.PLAYER : PAL.ENEMY;
  const dark = isPlayer ? PAL.PLAYER_DK : PAL.ENEMY_DK;
  const bodyH = UNIT_H * 0.6, headR = 3.4;
  // legs/body — a flat trapezoid silhouette, Master-System-style hard edge
  g.p(x - 4, feetY - bodyH, 8, bodyH, dark);
  g.p(x - 3, feetY - bodyH - 1, 6, bodyH * 0.55, body);
  g.disc(x, feetY - bodyH - headR - 1, headR, body); // head
  g.diamond(x, feetY - bodyH * 0.4, 9, bodyH + 5, null, PAL.INK); // outline
  return feetY - bodyH - headR * 2 - 2;
}

// The source-tile glyph names the weapon's archetype (GDD §4 requires the
// attack type itself be visible, not just "something will happen here"): a
// wedge for melee, a tight burst diamond for a short-range weapon (shotgun),
// a plain dot for a steady long-range one (handgun) — three silhouettes, no
// two of the enemy roster's weapons draw the same one.
function weaponGlyph(g, x, y, weapon) {
  if (weapon.archetype === 'melee') {
    g.p(x - 2, y, 4, 1, PAL.TELEGRAPH);
    g.p(x - 1, y - 1, 2, 1, PAL.TELEGRAPH);
    g.p(x, y - 2, 1, 1, PAL.TELEGRAPH);
  } else if (weapon.range <= 2) {
    g.p(x - 2, y - 2, 4, 4, PAL.TELEGRAPH);
  } else {
    g.disc(x, y, 1.5, PAL.TELEGRAPH);
  }
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
        // dash rhythm also carries range: tight for melee/short, long for a
        // steady handgun shot — one more read a glance can pick up.
        const dash = enemy.weapon.archetype === 'melee' ? [1, 1] : enemy.weapon.range <= 2 ? [3, 1] : [2, 2];
        g.line(at.x, at.y - UNIT_H * 0.4, tp.x, tp.y - UNIT_H * 0.3, PAL.TELEGRAPH, dash, 2);
        g.diamond(tp.x, tp.y, TILE_W - 6, TILE_H - 3, null, PAL.TELEGRAPH, 2);
        // a small tick above the target marker: this hit also shoves you
        if (enemy.weapon.knockback > 0) g.p(tp.x - 1, tp.y - TILE_H * 0.9, 2, 2, PAL.TELEGRAPH);
      }
      weaponGlyph(g, at.x, at.y - UNIT_H - 7, enemy.weapon);
    } else if (intent.type === 'move') {
      g.disc(at.x, at.y, 1.5, PAL.TELEGRAPH);
    }
  }
}

// A weapon-swap drop (combat.js's state.drops): a small pulseless marker on
// the floor tile — the weaponGlyph itself is the telegraph for WHICH weapon
// it is, same glyph language drawTelegraph already uses for an enemy's
// planned attack, so a player who has learned that vocabulary reads this one
// for free instead of a fourth icon language.
function drawDrop(g, layout, drop, weaponDefs) {
  const { x, y } = toScreen(layout, drop.x, drop.y);
  g.diamond(x, y, TILE_W * 0.5, TILE_H * 0.5, null, PAL.TELEGRAPH);
  const weapon = weaponDefs.find(w => w.id === drop.weaponId);
  if (weapon) weaponGlyph(g, x, y, weapon);
}

// The keyboard/gamepad cursor (input.js) — a double-ringed reticle, visually
// distinct from the single-outline selected/move/attack highlights. Only
// drawn once a key or a pad has actually been used (input.js's cursorActive
// flag): a cursor nobody asked for is just noise for a mouse/touch player.
function drawCursor(g, layout, state) {
  if (!state.cursor) return;
  const { x, y } = toScreen(layout, state.cursor.x, state.cursor.y);
  g.diamond(x, y, TILE_W - 4, TILE_H, null, PAL.CURSOR);
  g.diamond(x, y, TILE_W - 12, TILE_H - 6, null, PAL.CURSOR);
}

export function render(canvas, state, layout) {
  lastRenderArgs = { canvas, state, layout };
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false; // keep sprite scaling crisp, same as the tile art
  const g = pen(ctx);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // No opaque fill here any more — owner direction, 2026-08-31: "the grid
  // should be transparently laid on the backgrounds so that the players are
  // in the courtyard." The canvas is transparent by default once nothing
  // paints over it, which is what lets #stage's CSS background photo
  // (main.js's boot()) show through drawFloor's now-translucent tiles.

  drawFloor(g, layout, state.grid, state.fullCover, state.partialCover);
  drawHighlights(g, layout, state);

  const props = [];
  for (const k of state.fullCover) { const [x, y] = k.split(',').map(Number); props.push({ x, y, depth: x + y, tall: true }); }
  for (const k of state.partialCover) { const [x, y] = k.split(',').map(Number); props.push({ x, y, depth: x + y, tall: false }); }
  const drawables = [
    ...props.map(p => ({ depth: p.depth, draw: () => drawProp(g, layout, p.x, p.y, p.tall) })),
    ...(state.drops || []).map(d => ({ depth: d.x + d.y, draw: () => drawDrop(g, layout, d, state.weaponDefs) })),
    ...state.units.filter(u => u.hp > 0).map(u => ({
      depth: u.x + u.y,
      draw: () => drawUnit(g, layout, u, state.selected === u.uid),
    })),
  ].sort((a, b) => a.depth - b.depth);
  for (const d of drawables) d.draw();

  if (state.turn === 'player') {
    drawTelegraph(g, layout, state);
    drawCursor(g, layout, state);
  }
}
