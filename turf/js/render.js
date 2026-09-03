// The board, drawn low-res and upscaled with image-rendering: pixelated —
// the same trick every canvas game in this repo uses (see dropcabal's 220px
// internal height). Game logic stays in plain (x,y) grid space (grid.js);
// everything here is a one-way projection of that state onto an isometric
// diamond grid, never fed back into it.
import { PAL } from './palette.js?v=10';
import { key } from './grid.js?v=3';
import { magOf, roundsLeft } from './ammo.js?v=2';

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
  const entry = getImageEntry(src);
  return entry.loaded ? entry.img : null;
}
// Full entry (image + real ink bounds), for drawUnitSprite's feet anchor —
// see there for why the naive naturalHeight bottom is the wrong number to
// anchor a character's feet to.
function getImageEntry(src) {
  let entry = imageCache.get(src);
  if (!entry) {
    const img = new Image();
    entry = { img, loaded: false, inkBottom: null, inkTop: null };
    img.onload = () => {
      entry.loaded = true;
      Object.assign(entry, scanInkBounds(img));
      if (lastRenderArgs) render(lastRenderArgs.canvas, lastRenderArgs.state, lastRenderArgs.layout, lastRenderArgs.anim);
    };
    img.src = src;
    imageCache.set(src, entry);
  }
  return entry;
}
// A `fit`-pipeline plate is padded to a fixed 192×288 canvas and centred —
// the character rarely fills it, so naturalHeight is NOT where the feet
// are (found as an on-board bug: sprites "floating" above their tile by
// however many transparent rows sit below the shoes — measured 7px to 64px
// of padding across the current roster, nowhere near constant enough to
// hardcode). One-time offscreen scan per image, cached on the entry
// alongside the Image itself. Falls back to the full natural bounds (the
// old, buggy behaviour) if canvas pixel access ever throws, rather than
// hard-failing the whole render.
function scanInkBounds(img) {
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cctx = c.getContext('2d');
    cctx.drawImage(img, 0, 0);
    const { data } = cctx.getImageData(0, 0, c.width, c.height);
    let top = null, bottom = null;
    for (let y = 0; y < c.height; y++) {
      let hasInk = false;
      for (let x = 0; x < c.width; x++) {
        if (data[(y * c.width + x) * 4 + 3] > 40) { hasInk = true; break; }
      }
      if (hasInk) { if (top === null) top = y; bottom = y; }
    }
    if (top === null) return { inkTop: 0, inkBottom: img.naturalHeight - 1 };
    return { inkTop: top, inkBottom: bottom };
  } catch {
    return { inkTop: 0, inkBottom: img.naturalHeight - 1 };
  }
}

export function computeLayout(grid) {
  const minA = -(grid.rows - 1), maxA = grid.cols - 1;
  const maxB = grid.cols + grid.rows - 2;
  const width = Math.ceil((maxA - minA) * (TILE_W / 2) + SIDE_MARGIN * 2);
  // Headroom keys off SPRITE_H (the real drawn unit height), not the old,
  // shorter UNIT_H silhouette — a full-height sprite in row 0 needs more
  // clearance above the grid or its head (and HP bar above that) clips off
  // the top of the canvas.
  // Top clearance is SPRITE_H + TILE_H (originY, below) for a full-height
  // sprite plus its HP bar and momentum pips in row 0. The remainder is the
  // BOTTOM margin, and TILE_H * 4 gave it three tiles of nothing — invisible
  // while the board was always fitted whole, and a band of dead screen once
  // camera.js let it be scaled up. One tile is enough for a front-row
  // sprite's feet and shadow.
  const height = Math.ceil(maxB * (TILE_H / 2) + SPRITE_H + TILE_H * 2);
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
// Hazards, drawn into the floor rather than as depth-sorted objects: they ARE
// the tile, not something standing on it, so a unit must read as being IN the
// fire rather than behind it. Code-drawn — no art, house convention.
//
// Each one has to say what it costs at a glance, because a full-information
// game cannot hide the price of a tile. So they are told apart by SHAPE, not
// just colour: fire fills the tile and flickers upward, glass is a scatter of
// small hard shards, and the stairwell is a hole — the only one that reads as
// an absence, because it is the only one that is not survivable.
const HAZ = {
  // Deliberately RED-orange, not amber: PAL.TELEGRAPH is #f2b23a and the
  // attack highlight is warm too, so a yellower fire would sit in the same
  // band as "an enemy is going to hit this tile." Those two must never be
  // confusable — one is a standing property of the board, the other is a
  // promise about the next turn.
  fire: { fill: 'rgba(178,52,26,0.34)', edge: 'rgba(228,96,44,0.9)' },
  glass: { fill: 'rgba(150,180,196,0.16)', edge: 'rgba(190,220,235,0.55)' },
  stairwell: { fill: 'rgba(4,5,7,0.86)', edge: 'rgba(120,128,140,0.8)' },
};
function drawHazards(g, layout, hazards) {
  if (!hazards) return;
  for (const [k, h] of hazards) {
    const [gx, gy] = k.split(',').map(Number);
    const { x, y } = toScreen(layout, gx, gy);
    const s = HAZ[h.id] || HAZ.glass;
    g.diamond(x, y, TILE_W - 2, TILE_H - 1, s.fill, s.edge, 1);
    if (h.id === 'fire') {
      // Three tongues of flame, tallest in the middle — a static shape that
      // still reads as fire because the silhouette is what carries it.
      for (const [dx, hgt] of [[-5, 5], [0, 9], [5, 6]]) {
        g.line(x + dx, y + 2, x + dx - 1, y + 2 - hgt, s.edge, null, 2);
        g.line(x + dx - 1, y + 2 - hgt, x + dx + 2, y + 2 - hgt * 0.55, s.edge, null, 1.5);
      }
    } else if (h.id === 'glass') {
      for (const [dx, dy] of [[-6, 1], [-1, -2], [4, 2], [7, -1], [1, 3]]) {
        g.p(x + dx, y + dy, 2, 1, s.edge);
      }
    } else if (h.id === 'stairwell') {
      // A smaller diamond inside the hole reads as depth — the step you can
      // see before the dark takes over.
      g.diamond(x, y + 2, TILE_W * 0.55, TILE_H * 0.5, 'rgba(0,0,0,0.9)', 'rgba(90,98,110,0.5)', 1);
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
  // Aiming replaces the ordinary overlays outright. Showing move range and
  // attack targets UNDER a set of firing positions is three meanings in one
  // colour field, and the player cannot tell which tap does what.
  if (state.aimTiles && state.aimTiles.length) return;
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
// A (gx*7+gy*13)%pool.length hash was the first pass here — looked fine on
// the two or three tiles checked by eye, but backlot's real cover list
// hashes FIVE of its six full-cover tiles onto the same index ('crate',
// 'statue', 'bikerack', 'noticeboard'[3] five times), because 7 and 13
// happen to collapse onto one residue for that specific set of
// coordinates. Found from a screenshot, not by inspecting the formula —
// "the examples look ok, but have too many of the same objects" was
// right twice, once before the 2/6→4/4 pool rebalance and again here.
// Greedy instead: assign each cover tile, in order, whichever pool prop
// appears LEAST among already-assigned tiles within Manhattan distance 4
// — ties broken by array order, so it's still fully deterministic (same
// input cover list always assigns the same map, no per-frame flicker).
function assignPropArt(tiles, pool) {
  const chosen = [];
  for (const t of tiles) {
    const nearbyCounts = pool.map(() => 0);
    for (let i = 0; i < chosen.length; i++) {
      const other = tiles[i];
      if (Math.abs(other.x - t.x) + Math.abs(other.y - t.y) <= 4) {
        nearbyCounts[pool.indexOf(chosen[i])]++;
      }
    }
    let best = 0;
    for (let i = 1; i < pool.length; i++) if (nearbyCounts[i] < nearbyCounts[best]) best = i;
    chosen.push(pool[best]);
  }
  return chosen;
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

function drawProp(g, layout, gx, gy, tall, art) {
  const { x, y } = toScreen(layout, gx, gy);
  const img = getImage(`art-src/sprites/props/${art}.png`);
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
function drawUnit(g, layout, unit, isSelected, anim) {
  // The unit's TRUE tile is where every overlay belongs (the selection ring,
  // the tile shadow) — combat.js has already moved it there. Only the body
  // lags behind, by the animator's fractional-tile offset, so a walk reads as
  // travel while the board state stays honest about where the unit is.
  const { x: tileX, y: tileY } = toScreen(layout, unit.x, unit.y);
  const off = anim ? anim.offsetFor(unit) : null;
  const { x, y } = off ? toScreen(layout, unit.x + off.gx, unit.y + off.gy) : { x: tileX, y: tileY };
  const feetY = y - 2;

  if (isSelected) g.diamond(tileX, tileY, TILE_W - 2, TILE_H - 1, null, PAL.SELECT_EDGE, 2);
  g.diamond(x, y, TILE_W * 0.4, TILE_H * 0.35, 'rgba(0,0,0,0.35)', null); // shadow travels with the body
  // A real character sprite carries its OWN colours (a jacket, not a faction
  // paint job), so the cold-operator/warm-rival read the old flat silhouette
  // gave for free is gone once the sprite draws over it — replaced with a
  // faction-tinted ring at the feet, the one thing every unit still stands
  // on regardless of which sprite (or the procedural fallback) is drawing
  // above it. Same two house colours as everywhere else in this game.
  const factionColor = unit.faction === 'player' ? PAL.PLAYER
    : unit.faction === 'objective' ? PAL.OBJECTIVE_EDGE : PAL.ENEMY;
  g.diamond(x, y, TILE_W * 0.52, TILE_H * 0.46, null, factionColor, 1.5);

  // The animator answers with the current frame of whatever clip this unit is
  // playing, or null for the twelve characters that have no frame set yet —
  // those keep the single static plate they already had.
  const frame = anim ? anim.spriteFor(unit) : null;
  const src = frame ? frame.src : unit.sprite;
  const entry = src ? getImageEntry(src) : null;
  // The scale reference: this character's idle frame, so every pose of the
  // same character is drawn at ONE scale and a crouch stays shorter than a
  // stand. Falls back to the frame's own height until the idle has decoded,
  // and for the twelve characters whose sprite is a single static plate.
  const refEntry = frame && frame.refSrc ? getImageEntry(frame.refSrc) : null;
  const refH = refEntry && refEntry.loaded ? refEntry.inkBottom - refEntry.inkTop + 1 : null;
  const topY = entry && entry.loaded
    ? drawUnitSprite(g, entry, x, feetY, frame && frame.mirror, refH)
    : drawUnitFallback(g, unit, x, feetY);

  // Hit flash. Drawing the SAME image again in 'lighter' brightens exactly
  // the sprite's own pixels and leaves the transparent surround untouched —
  // clipped to the silhouette by construction, where a white fillRect would
  // paint a glowing box around the character. This is the only damage
  // feedback a unit without a `hit` frame gets, so it has to work for the
  // twelve characters that are still a single static plate.
  const flash = anim ? anim.flashFor(unit) : 0;
  if (flash > 0 && entry && entry.loaded) {
    g.ctx.save();
    g.ctx.globalCompositeOperation = 'lighter';
    g.ctx.globalAlpha = flash * 0.7;
    drawUnitSprite(g, entry, x, feetY, frame && frame.mirror);
    g.ctx.restore();
  }

  // role marker, same three glyphs either way — melee/ranged/control stay
  // readable at a glance even once the sprite art tells you who it is
  const markerY = topY + 8;
  if (unit.role === 'melee') g.line(x - 5, markerY, x + 5, markerY - 3, PAL.INK, null, 2);
  else if (unit.role === 'ranged') g.disc(x + 5, markerY, 1.6, PAL.INK);
  else g.p(x - 6, markerY - 1, 12, 2, PAL.INK);

  // HP bar — not over a body that is mid-death-clip, where it would read as
  // an empty track floating above a corpse.
  if (unit.hp <= 0) return;
  const hpW = 14, frac = Math.max(0, unit.hp / unit.maxHp);
  const hpY = topY - 6;
  g.p(x - hpW / 2, hpY, hpW, 2, PAL.HP_TRACK);
  const hpColor = frac > 0.5 ? PAL.HP_GOOD : frac > 0.25 ? PAL.HP_MID : PAL.HP_BAD;
  g.p(x - hpW / 2, hpY, hpW * frac, 2, hpColor);

  // Momentum pips, one per tile still carried, above the HP bar. This game
  // promises full information — an enemy's whole plan is on screen before it
  // acts — so a modifier that silently changes a hit chance and a damage
  // number cannot live in the rules only. If a unit is harder to shoot
  // because it just ran, the board has to say so, on that unit, at a glance.
  const mo = unit.momentum || 0;
  if (mo > 0) {
    const pipW = 2, gap = 1, total = mo * pipW + (mo - 1) * gap;
    for (let i = 0; i < mo; i++) {
      g.p(x - total / 2 + i * (pipW + gap), hpY - 3, pipW, 2, PAL.MOMENTUM);
    }
  }

  // Ammo, under the HP bar rather than over it, so the two pip rows sit on
  // opposite sides of the health and cannot be read as one strip. Spent
  // rounds stay drawn as dark slots: "one of three" and "one" are different
  // facts, and only the row that keeps its empty slots says which.
  const mag = magOf(unit.weapon);
  if (mag != null) {
    const pipW = 2, gap = 1, total = mag * pipW + (mag - 1) * gap;
    for (let i = 0; i < mag; i++) {
      g.p(x - total / 2 + i * (pipW + gap), hpY + 3, pipW, 2,
        i < roundsLeft(unit) ? PAL.AMMO : PAL.AMMO_SPENT);
    }
  }
}
// Draws the real sprite, anchored so the character's actual FEET (entry's
// scanned ink bounds — see scanInkBounds) land on feetY, not the bottom of
// the source canvas, which is usually many transparent rows lower. Returns
// the y of the visible content's top (both callers use this for the HP bar
// / role marker so their position doesn't care which branch drew the body
// beneath them, or how much padding that source image happened to carry).
function drawUnitSprite(g, entry, x, feetY, mirror, refH) {
  const { img, inkTop, inkBottom } = entry;
  const contentH = inkBottom - inkTop + 1;
  // Scale off the character's reference height, not this frame's own, so a
  // shorter pose draws shorter instead of being inflated back to SPRITE_H.
  const scale = SPRITE_H / (refH || contentH);
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  const drawY = feetY - inkBottom * scale; // top of the FULL (padded) image, in screen space
  if (mirror) {
    // Mirroring is how two drawn facings cover the board's four directions
    // (anim.js's facingFor). Flip about the sprite's own centre line, not the
    // canvas origin, or the unit lands on the far side of the board.
    g.ctx.save();
    g.ctx.translate(x, 0);
    g.ctx.scale(-1, 1);
    g.ctx.drawImage(img, -w / 2, drawY, w, h);
    g.ctx.restore();
  } else {
    g.ctx.drawImage(img, x - w / 2, drawY, w, h);
  }
  return feetY - contentH * scale; // top of the actual visible content, not the padded canvas
}
function drawUnitFallback(g, unit, x, feetY) {
  // An objective is a THING, not a person. Falling through to the humanoid
  // silhouette drew the cache as a third gang member standing very still,
  // which is a readability bug in a game whose whole promise is that you can
  // tell what is on the board.
  if (unit.faction === 'objective') return drawObjectiveBody(g, x, feetY);
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

// A strapped crate: a flat box in a hard black line, banded so it reads as
// slats rather than a grey slab — the house register (Master System sprite:
// flat fill inside a hard outline, the shape lives in the silhouette).
// A ring plus a reticle above it, in the objective colour. The crate body
// alone was not enough: this board is FULL of crates as cover, and a
// screenshot of the depot showed the cache reading as scenery — the same
// class of mistake as an extraction pad you cannot see.
function drawObjectiveMark(g, layout, state) {
  for (const u of state.units) {
    if (u.faction !== 'objective' || u.hp <= 0) continue;
    const p = toScreen(layout, u.x, u.y);
    const y = p.y - SPRITE_H * 0.75;
    g.diamond(p.x, p.y, TILE_W - 6, TILE_H - 3, null, PAL.OBJECTIVE_EDGE, 2);
    g.line(p.x - 7, y, p.x - 3, y, PAL.OBJECTIVE_EDGE, null, 2);
    g.line(p.x + 3, y, p.x + 7, y, PAL.OBJECTIVE_EDGE, null, 2);
    g.line(p.x, y - 4, p.x, y - 1, PAL.OBJECTIVE_EDGE, null, 2);
    g.line(p.x, y + 1, p.x, y + 4, PAL.OBJECTIVE_EDGE, null, 2);
  }
}

function drawObjectiveBody(g, x, feetY) {
  const h = UNIT_H * 0.85, w = 15;
  g.p(x - w / 2, feetY - h, w, h, PAL.COVER_FULL_DK);
  g.p(x - w / 2 + 1, feetY - h + 1, w - 2, h * 0.45, PAL.COVER_FULL);
  g.p(x - w / 2, feetY - h * 0.55, w, 1.5, PAL.INK);          // strap
  g.p(x - 1, feetY - h, 2, h, PAL.INK);                        // centre seam
  g.diamond(x, feetY - h * 0.5, w + 2, h + 3, null, PAL.INK);  // outline
  return feetY - h - 2;
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

// The route, not just the destination. A diamond on the tile an enemy will
// end up on says WHERE; it does not say that this particular body is the one
// going there, and with four enemies telegraphing at once the board became a
// scatter of markers nobody could attribute. A line from the unit's own feet
// to its destination, with an arrowhead, is the attribution.
function drawIntentPath(g, from, to, colour) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  g.line(from.x, from.y - 2, to.x, to.y - 2, colour, [2, 3], 1);
  // Arrowhead, drawn as two short strokes swept back from the destination
  // along the path — cheap, and it survives being 3px long on a phone.
  const ux = dx / len, uy = dy / len, h = 5;
  g.line(to.x, to.y - 2, to.x - ux * h - uy * h * 0.6, to.y - 2 - uy * h + ux * h * 0.6, colour, null, 1);
  g.line(to.x, to.y - 2, to.x - ux * h + uy * h * 0.6, to.y - 2 - uy * h - ux * h * 0.6, colour, null, 1);
}

// A ring under whoever is acting right now, plus a caret above it. Drawn
// under the units (render()'s order) so it never covers a face.
function drawSpotlight(g, layout, state) {
  if (!state.actingUid) return;
  const u = state.units.find(x => x.uid === state.actingUid);
  if (!u || u.hp <= 0) return;
  const p = toScreen(layout, u.x, u.y);
  g.diamond(p.x, p.y, TILE_W + 4, TILE_H + 2, null, PAL.ACTING, 2);
  g.diamond(p.x, p.y, TILE_W - 4, TILE_H - 2, null, PAL.ACTING, 1);
  const top = p.y - SPRITE_H - 10;
  g.line(p.x - 4, top, p.x, top + 4, PAL.ACTING, null, 2);
  g.line(p.x + 4, top, p.x, top + 4, PAL.ACTING, null, 2);
}

// While an ability is armed the board is in a different mode and has to look
// like it: the move/attack overlays are gone (input.js clears them) and these
// take their place. A player who cannot tell which mode the board is in will
// tap and find out, which in a game about committed decisions is the one
// thing the UI must never make them do.
function drawAbilityTargets(g, layout, state) {
  const tiles = state.abilityTiles;
  if (!tiles || !tiles.length) return;
  const mark = (x, y) => g.diamond(x, y, TILE_W - 4, TILE_H - 2,
    PAL.ABILITY_HI, PAL.ABILITY_HI_EDGE, 2);
  for (const t of tiles) {
    if (t.self) {
      const u = state.units.find(x => x.uid === state.selected);
      if (u) { const p = toScreen(layout, u.x, u.y); mark(p.x, p.y); }
    } else if (t.all) {
      for (const uid of t.all) {
        const u = state.units.find(x => x.uid === uid);
        if (u) { const p = toScreen(layout, u.x, u.y); mark(p.x, p.y); }
      }
    } else if (t.uid) {
      const u = state.units.find(x => x.uid === t.uid);
      if (u) { const p = toScreen(layout, u.x, u.y); mark(p.x, p.y); }
    } else {
      const p = toScreen(layout, t.x, t.y);
      mark(p.x, p.y);
    }
  }
}

// A held gun, drawn on the unit holding it. Overwatch is the only thing in
// this game that happens on somebody else's turn, so it is the only posture
// that has to survive being looked at after the player stops thinking about
// it — a bracket over the head, still there when the enemy phase starts.
function drawOverwatch(g, layout, state) {
  if (!state.overwatch || !state.overwatch.size) return;
  for (const uid of state.overwatch) {
    const u = state.units.find(x => x.uid === uid);
    if (!u || u.hp <= 0) continue;
    const p = toScreen(layout, u.x, u.y);
    const y = p.y - SPRITE_H - 12;
    g.line(p.x - 6, y + 3, p.x - 6, y, PAL.ABILITY_HI_EDGE, null, 1);
    g.line(p.x - 6, y, p.x + 6, y, PAL.ABILITY_HI_EDGE, null, 1);
    g.line(p.x + 6, y, p.x + 6, y + 3, PAL.ABILITY_HI_EDGE, null, 1);
    g.disc(p.x, y + 2, 1.6, PAL.ABILITY_HI_EDGE);
  }
}

// The odds, on the board, over every target the selected operator could
// actually hit. Not a hover tooltip: touch has no hover, and a number you
// have to go and ask for is not the same promise as a number that is simply
// there. This is the hole v24 opened — momentum silently moved a hit chance
// the board never showed — and closing it is `MST_PARITY.md` §2.1.
// The extraction pads, drawn under everything else that moves. A mission
// objective the board does not show is a hidden win condition, which in a
// full-information game is the one unforgivable kind — the same reason v22
// had to put the survive-N counter in the topbar.
function drawExtraction(g, layout, state) {
  if (!state.extract || !state.extract.size) return;
  for (const k of state.extract) {
    const [x, y] = k.split(',').map(Number);
    const p = toScreen(layout, x, y);
    g.diamond(p.x, p.y, TILE_W - 2, TILE_H - 1, PAL.OBJECTIVE, PAL.OBJECTIVE_EDGE, 2);
    // A chevron pointing off the board: "out is this way", which a coloured
    // tile alone does not say.
    g.line(p.x - 5, p.y + 2, p.x, p.y - 3, PAL.OBJECTIVE_EDGE, null, 2);
    g.line(p.x + 5, p.y + 2, p.x, p.y - 3, PAL.OBJECTIVE_EDGE, null, 2);
  }
}

// The firing positions on offer, each labelled with the odds it would give.
// This is what replaced walking the operator to a tile the engine picked:
// the player is choosing where to fight from, so the board has to show what
// each choice is worth — a menu of positions with no numbers on it would be
// a worse version of the automatic behaviour, not a better one.
function drawAimTiles(g, layout, state) {
  const tiles = state.aimTiles;
  if (!tiles || !tiles.length) return;
  tiles.forEach((t, i) => {
    const p = toScreen(layout, t.x, t.y);
    const best = i === 0;
    g.diamond(p.x, p.y, TILE_W - 4, TILE_H - 2, PAL.AIM_HI, best ? PAL.AIM_BEST : PAL.AIM_EDGE, best ? 3 : 1.5);
  });
}

// The odds for each offered position, painted OVER the bodies. The tile
// markings belong on the ground and the numbers do not: a screenshot showed
// the second option's label sitting behind the very operator being asked to
// move, which is the one thing a position chooser must never hide.
function drawAimLabels(g, layout, state) {
  const tiles = state.aimTiles;
  if (!tiles || !tiles.length) return;
  tiles.forEach((t, i) => {
    const p = toScreen(layout, t.x, t.y);
    const best = i === 0;
    const f = t.forecast;
    const label = f.lethal ? `${Math.round(f.chance * 100)}% KILL` : `${Math.round(f.chance * 100)}% · ${f.damage}`;
    g.ctx.save();
    g.ctx.font = `bold ${best ? 9 : 8}px monospace`;
    g.ctx.textAlign = 'center';
    const w = g.ctx.measureText(label).width + 6;
    g.ctx.fillStyle = 'rgba(7,8,11,0.9)';
    g.ctx.fillRect(p.x - w / 2, p.y - 6, w, 11);
    g.ctx.strokeStyle = best ? PAL.AIM_BEST : PAL.AIM_EDGE;
    g.ctx.lineWidth = 1;
    g.ctx.strokeRect(p.x - w / 2, p.y - 6, w, 11);
    g.ctx.fillStyle = best ? PAL.AIM_BEST : PAL.FORECAST;
    g.ctx.fillText(label, p.x, p.y + 3);
    g.ctx.restore();
  });
}

function drawForecasts(g, layout, state) {
  const fc = state.forecasts;
  // Suppressed while aiming: the board is asking ONE question then, and the
  // other rivals' badges are answers to a different one.
  if (!fc || !fc.size || state.armedAbility || state.aimUid) return;
  for (const [uid, f] of fc) {
    const u = state.units.find(x => x.uid === uid);
    if (!u || u.hp <= 0) continue;
    const p = toScreen(layout, u.x, u.y);
    const y = p.y - SPRITE_H - 16;
    const pct = Math.round(f.chance * 100);
    // "70% · 4" — odds then damage, the two numbers a decision needs. A
    // lethal shot says so in words, because arithmetic against a health bar
    // is exactly the work the player should not be doing.
    const label = f.lethal ? `${pct}% KILL` : `${pct}% · ${f.damage}`;
    g.ctx.save();
    g.ctx.font = 'bold 8px monospace';
    g.ctx.textAlign = 'center';
    const w = g.ctx.measureText(label).width + 6;
    g.ctx.fillStyle = 'rgba(7,8,11,0.82)';
    g.ctx.fillRect(p.x - w / 2, y - 8, w, 10);
    g.ctx.fillStyle = f.lethal ? PAL.FORECAST_LETHAL : PAL.FORECAST;
    g.ctx.fillText(label, p.x, y);
    g.ctx.restore();
  }
}

function drawTelegraph(g, layout, state) {
  for (const [uid, intent] of state.telegraph) {
    const enemy = state.units.find(u => u.uid === uid);
    if (!enemy || enemy.hp <= 0 || !intent.moveTo) continue;
    const at = toScreen(layout, intent.moveTo.x, intent.moveTo.y);
    drawIntentPath(g, toScreen(layout, enemy.x, enemy.y), at, PAL.TELEGRAPH);
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
    } else if (intent.type === 'reload') {
      // An open bracket over the destination — deliberately NOT the attack
      // marker, because the whole value of telegraphing a reload is that the
      // player can tell at a glance which rivals cannot hurt them this turn.
      g.diamond(at.x, at.y, TILE_W - 8, TILE_H - 4, null, PAL.AMMO, 2);
      g.line(at.x - 5, at.y - TILE_H * 0.9, at.x + 5, at.y - TILE_H * 0.9, PAL.AMMO, null, 2);
      g.line(at.x - 5, at.y - TILE_H * 0.9, at.x - 5, at.y - TILE_H * 0.9 + 3, PAL.AMMO, null, 2);
      g.line(at.x + 5, at.y - TILE_H * 0.9, at.x + 5, at.y - TILE_H * 0.9 + 3, PAL.AMMO, null, 2);
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
  if (drop.trinketId) {
    // A trinket has no weapon glyph to borrow, and inventing a per-item icon
    // would be a fifth icon language for five flat stat bumps. One mark for
    // "something small, worth picking up" is the honest amount of detail —
    // what it does is told in the toast when you take it.
    g.p(x - 3, y - 1, 6, 2, PAL.HP_GOOD);
    g.p(x - 1, y - 3, 2, 6, PAL.HP_GOOD);
    return;
  }
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

// How many real pixels the canvas carries per board pixel. main.js sizes the
// backing store; this reads the factor back off it so every draw call below
// can keep working in plain board units and know nothing about it.
//
// WHY IT IS NOT 1. The character plates are 288px ILLUSTRATIONS (9-12k
// colours — art-src/sprites/README.md is explicit that they were cut for
// illustration fidelity, not retro pixel art). At SS=1 the board is ~320px
// wide, a plate is nearest-neighbour downscaled 6.3x to SPRITE_H, and then
// CSS magnifies that back up ~3x on a phone. The detail is thrown away once
// and the loss is then enlarged — which is what "very pixelated" was.
// Supersampling keeps the art's own resolution instead of discarding it.
export const SUPERSAMPLE = 3;

export function render(canvas, state, layout, anim = null) {
  lastRenderArgs = { canvas, state, layout, anim };
  const ctx = canvas.getContext('2d');
  const ss = canvas.width / layout.width || 1;
  ctx.setTransform(ss, 0, 0, ss, 0, 0);
  // Smoothing ON now that a downscale is gentle rather than brutal: at SS=3 a
  // plate lands at ~138px instead of 46, so averaging reads as detail. Tried
  // and rejected: a high-quality resample at SS=1 (LANCZOS-equivalent) rings
  // badly against the plates' hard alpha edge and speckles colour along the
  // silhouette — worse than the nearest-neighbour it replaced.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const g = pen(ctx);
  ctx.clearRect(0, 0, layout.width, layout.height);
  // No opaque fill here any more — owner direction, 2026-08-31: "the grid
  // should be transparently laid on the backgrounds so that the players are
  // in the courtyard." The canvas is transparent by default once nothing
  // paints over it, which is what lets #stage's CSS background photo
  // (main.js's boot()) show through drawFloor's now-translucent tiles.

  drawFloor(g, layout, state.grid, state.fullCover, state.partialCover);
  // Under the move/attack highlights: a highlight has to stay readable OVER a
  // hazard, since "can I reach that tile" and "what does it cost me" are two
  // different questions the player asks in that order.
  drawHazards(g, layout, state.hazards);
  drawExtraction(g, layout, state);
  drawObjectiveMark(g, layout, state);
  drawHighlights(g, layout, state);
  drawAimTiles(g, layout, state);
  drawAbilityTargets(g, layout, state);
  // Under the props and bodies, over the highlights: the ring belongs on the
  // ground the unit is standing on, not painted across its chest.
  drawSpotlight(g, layout, state);

  const fullTiles = [...state.fullCover].map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });
  const partialTiles = [...state.partialCover].map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; });
  const fullArt = assignPropArt(fullTiles, FULL_PROPS);
  const partialArt = assignPropArt(partialTiles, PARTIAL_PROPS);
  const props = [
    ...fullTiles.map((t, i) => ({ x: t.x, y: t.y, depth: t.x + t.y, tall: true, art: fullArt[i] })),
    ...partialTiles.map((t, i) => ({ x: t.x, y: t.y, depth: t.x + t.y, tall: false, art: partialArt[i] })),
  ];
  const drawables = [
    ...props.map(p => ({ depth: p.depth, draw: () => drawProp(g, layout, p.x, p.y, p.tall, p.art) })),
    ...(state.drops || []).map(d => ({ depth: d.x + d.y, draw: () => drawDrop(g, layout, d, state.weaponDefs) })),
    // A unit at hp 0 keeps drawing for as long as its death clip is playing —
    // filtered on hp alone the corpse vanishes on the very frame the clip
    // starts, and the death animation is never seen at all.
    ...state.units.filter(u => u.hp > 0 || (anim && anim.isDying(u))).map(u => ({
      depth: u.x + u.y,
      draw: () => drawUnit(g, layout, u, state.selected === u.uid, anim),
    })),
  ].sort((a, b) => a.depth - b.depth);
  for (const d of drawables) d.draw();

  if (state.turn === 'player') {
    drawTelegraph(g, layout, state);
    drawForecasts(g, layout, state);
    drawAimLabels(g, layout, state);
    drawOverwatch(g, layout, state);
    drawCursor(g, layout, state);
  }

  // Damage numbers last, above every unit and overlay: a number that a
  // later-drawn sprite paints over is a number the player does not read.
  if (anim) for (const f of anim.floaters()) drawFloater(g, layout, f);
}

// A hit's damage, rising and fading off the tile it landed on. Colour carries
// the outcome the same way the rest of this game does — the two faction
// colours are already spoken for, so a kill gets the HP bar's own BAD red and
// a miss gets muted ink, which is what a non-event should look like.
function drawFloater(g, layout, f) {
  const { x, y } = toScreen(layout, f.gx, f.gy);
  const rise = 16 + f.k * 20;
  const alpha = f.k < 0.15 ? f.k / 0.15 : 1 - (f.k - 0.15) / 0.85;
  const colour = f.kind === 'kill' ? PAL.HP_BAD : f.kind === 'miss' ? PAL.UI_DIM : '#ffffff';
  g.ctx.save();
  g.ctx.globalAlpha = Math.max(0, alpha);
  g.ctx.font = `bold ${f.kind === 'miss' ? 7 : 9}px monospace`;
  g.ctx.textAlign = 'center';
  g.ctx.lineWidth = 3;
  g.ctx.strokeStyle = PAL.INK;   // ink halo, so a number stays legible over any tile
  g.ctx.strokeText(f.text, x, y - SPRITE_H - rise);
  g.ctx.fillStyle = colour;
  g.ctx.fillText(f.text, x, y - SPRITE_H - rise);
  g.ctx.restore();
}
