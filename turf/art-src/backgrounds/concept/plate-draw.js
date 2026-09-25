// CONCEPT PLATES, DRAWN IN THE BOARD'S OWN CAMERA.
//
// `ART_REQUEST.md` §10 asks for four to six more encounter backgrounds and
// states one hard requirement: the plate must be made at 45° yaw / 30°
// elevation, so a ground line runs parallel to a tile edge. §10.2's
// ten-second test is to lay the grid over the plate and look.
//
// Every plate this project has was judged AFTER delivery against that test,
// and one of the three failed it — `dockyard.jpg` is a one-point perspective
// render, so the three encounters it carried had to be moved off it. That is
// the failure this module removes: it does not APPROXIMATE the camera, it
// draws in it. `g()` below is `render.js`'s own `toScreen` with the layout
// origin factored out, so a ground line here cannot be at any angle a tile
// edge is not. The requirement holds by construction and cannot regress.
//
// The second thing it removes is the MEASURED floor quad. `plates.js` asks
// each plate for `{cx, cy, halfW, halfH}` — where the flat ground is, as
// fractions of the image — and for a photograph those are read off the
// picture by eye. v33 is a whole version about that going wrong. Here the
// floor is a rectangle THIS FILE placed, so the quad is arithmetic: each
// subject returns its own, exact.
//
// These are CONCEPT art, for direction. They are not a substitute for a
// rendered or photographed plate — no code-drawn backdrop will carry the
// grain and incidental mess of a real Nordic yard at night. What they are
// for: showing what each subject looks like seated under a real board, at the
// right camera, before anyone spends a generation credit or a trip out with a
// camera on it. Each one is also a spec — its floor quad is the number a
// delivered photograph has to match.
//
// The register is GDD §2 and §10.4: a grim, rain-lit Nordic city at night,
// sodium lamps and wet stone. And §10.4's frame rules are design constraints
// here, not review notes:
//   - nothing important in the middle third — that is where twelve sprites,
//     their health bars, ammo pips and telegraph markers sit;
//   - dark and low-contrast, because index.html already lays a .55→.85
//     gradient over it and a busy plate fights the HUD;
//   - light from the upper left, matching the cast's own lighting;
//   - no people and no vehicles mid-frame, because an unselectable body reads
//     as a unit (the readability bug the cache had before v26).

// ── the camera ──────────────────────────────────────────────────────
// render.js: x = (gx - gy) * TILE_W/2, y = (gx + gy) * TILE_H/2, with
// TILE_W 32 and TILE_H 16. A tile edge therefore lies at atan(0.5) = 26.57°.
// UNIT is how many image pixels one board tile is drawn at here; the plates
// are rendered far larger than the board so a delivered photograph has room.
export const TILE_W = 32, TILE_H = 16;

/** Ground point (gx, gy) in tiles → image pixels, about the floor's centre. */
export function g(gx, gy, o) {
  return { x: o.x + (gx - gy) * (TILE_W / 2) * o.u,
           y: o.y + (gx + gy) * (TILE_H / 2) * o.u };
}

/** A ground quad, in tiles. Four corners, always in the board's camera. */
function quad(ctx, o, x0, y0, x1, y1) {
  const a = g(x0, y0, o), b = g(x1, y0, o), c = g(x1, y1, o), d = g(x0, y1, o);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
  ctx.closePath();
}

/**
 * A BOX standing on the ground, drawn as three faces. `h` is height in tiles.
 * Faces are shaded from one direction — §10.4's "light from the upper left" —
 * so the top is lightest, the left wall next and the right wall darkest. Every
 * horizontal edge is a ground vector, so every one of them is at the tile
 * angle; only the verticals are vertical, which is what an orthographic
 * elevation of 30° actually looks like.
 */
function box(ctx, o, x0, y0, x1, y1, h, col, opts = {}) {
  // THE SHADOW FIRST, and it is the single thing that stops a box floating.
  // The first draft had none and every container read as a slab hovering over
  // the yard. It is a ground quad offset along the light's own direction —
  // down and to the RIGHT, because the key is upper-left — and it is drawn on
  // the ground, so it is in the projection like everything else.
  if (opts.shadow !== false) {
    const off = h * SHADOW_LEN;
    ctx.save();
    ctx.globalAlpha = Math.min(0.55, 0.20 + h * 0.05);
    quad(ctx, o, x0 + off, y0 + off, x1 + off * 1.15, y1 + off * 1.15);
    ctx.fillStyle = '#04060a'; ctx.fill();
    ctx.restore();
  }
  const lift = p => ({ x: p.x, y: p.y - h * TILE_H * o.u });
  const a = g(x0, y0, o), b = g(x1, y0, o), c = g(x1, y1, o), d = g(x0, y1, o);
  const A = lift(a), B = lift(b), C = lift(c), D = lift(d);
  const face = (p, q, r, s, tone, rim) => {
    ctx.fillStyle = tone;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.lineTo(r.x, r.y); ctx.lineTo(s.x, s.y);
    ctx.closePath(); ctx.fill();
    if (opts.edge) { ctx.strokeStyle = opts.edge; ctx.lineWidth = 1; ctx.stroke(); }
    if (rim) {
      // A lit EDGE along the top of the light-facing wall. At night this is
      // most of what says "steel" rather than "a shape" — the same reason
      // slaykallio's puppets carry a rim and the reason a dark figure on a
      // dark ground has no outline until something draws one.
      ctx.strokeStyle = rim; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(r.x, r.y); ctx.stroke();
    }
  };
  // The tone range is WIDE on purpose. The first draft used 0.52/0.78/1.0 and
  // against base colours this dark the three faces collapsed into one flat
  // shape; a box reads as a volume only when its faces are genuinely apart.
  face(d, c, C, D, shade(col, opts.rightMul ?? 0.22), null);              // away from the light
  face(a, d, D, A, shade(col, opts.leftMul ?? 1.55), opts.rim ?? 'rgba(226,238,252,.62)');
  face(A, B, C, D, shade(col, opts.topMul ?? 0.74), null);               // the top, seen at 30°
  // Grime down the walls: wear is most of what makes a surface read as a
  // thing (slaykallio v29's finding, applied to a night exterior).
  if (opts.grime !== false) streak(ctx, A, D, h, o, (x0 * 31 + y0 * 17) | 0);
  return { A, B, C, D };
}

/** How far a shadow reaches per tile of height. The light is low and raking. */
const SHADOW_LEN = 0.62;

/** Vertical wear running DOWN a wall, in the wall's own plane. */
function streak(ctx, top, bot, h, o, seed) {
  const rnd = mulberry(seed | 0);
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const t = rnd();
    const x = top.x + (bot.x - top.x) * t;
    const y0 = top.y + (bot.y - top.y) * t;
    const len = (0.25 + rnd() * 0.7) * h * TILE_H * o.u;
    ctx.globalAlpha = 0.05 + rnd() * 0.09;
    ctx.fillStyle = rnd() > 0.45 ? '#05070a' : '#6b7a88';
    ctx.fillRect(x, y0, 1 + rnd() * 2, len);
  }
  ctx.restore();
}

/** Multiply a hex colour, clamped. The only tinting this file does. */
export function shade(hex, mul) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * mul));
  const gg = Math.min(255, Math.round(((n >> 8) & 255) * mul));
  const b = Math.min(255, Math.round((n & 255) * mul));
  return `rgb(${r},${gg},${b})`;
}

// ── the palette ─────────────────────────────────────────────────────
// Read off js/palette.js's register rather than invented: cold, desaturated,
// sodium for the one warm note. Nothing here is bright; the HUD sits on top.
export const PAL = {
  night:  '#0a0c11',
  stone:  '#22262e',
  wet:    '#191d25',
  brick:  '#2a2622',
  steel:  '#262b33',
  rust:   '#3a2c22',
  sodium: '#ffb761',
  cold:   '#5a7794',
  paint:  '#3d4a40',
};

// ── weather and light, shared by every subject ──────────────────────

/** Rain on wet ground: long cold streaks, never dense enough to read as fog. */
function rain(ctx, W, H, seed) {
  const rnd = mulberry(seed);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#9fb6cc';
  ctx.lineWidth = 1;
  for (let i = 0; i < 420; i++) {
    const x = rnd() * W, y = rnd() * H, len = 14 + rnd() * 26;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * 0.22, y + len); ctx.stroke();
  }
  ctx.restore();
}

/**
 * A sodium lamp's pool on the ground. Drawn as a GROUND ELLIPSE — squashed to
 * the camera's 2:1 — not a screen-space circle: a round pool is the tell that
 * a plate was painted flat rather than in the projection.
 */
function pool(ctx, o, gx, gy, rTiles, strength) {
  const c = g(gx, gy, o);
  const rx = rTiles * (TILE_W / 2) * o.u, ry = rTiles * (TILE_H / 2) * o.u;
  // A HOT CORE, not an even wash. Measured against the shipping plates, the
  // concepts' fault was tonal RANGE rather than brightness, and a pool that
  // only ever reaches 30% alpha raises the mean without widening the range.
  // A real sodium lamp on wet ground has a small blown-out centre and a long
  // dim skirt; that spread is the range.
  const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, rx);
  grd.addColorStop(0, `rgba(255,214,150,${0.92 * strength})`);
  grd.addColorStop(0.10, `rgba(255,186,104,${0.52 * strength})`);
  grd.addColorStop(0.32, `rgba(248,158,78,${0.20 * strength})`);
  grd.addColorStop(0.62, `rgba(220,136,66,${0.07 * strength})`);
  grd.addColorStop(1, 'rgba(255,150,70,0)');
  ctx.save();
  ctx.translate(c.x, c.y); ctx.scale(1, ry / rx); ctx.translate(-c.x, -c.y);
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(c.x, c.y, rx, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // The fitting. One genuinely bright, genuinely small thing per lamp — the
  // top of the range every plate that works has and this one did not.
  ctx.save();
  ctx.globalAlpha = Math.min(1, strength);
  const hot = ctx.createRadialGradient(c.x, c.y - ry * 0.35, 0, c.x, c.y - ry * 0.35, rx * 0.09);
  hot.addColorStop(0, 'rgba(255,241,214,0.95)');
  hot.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = hot;
  ctx.beginPath(); ctx.arc(c.x, c.y - ry * 0.35, rx * 0.09, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Wet sheen: broken horizontal glints on standing water, in the projection. */
function sheen(ctx, o, x0, y0, x1, y1, seed, alpha = 0.10) {
  const rnd = mulberry(seed);
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#9db8d2'; ctx.lineWidth = 1.4;
  for (let i = 0; i < 90; i++) {
    const gx = x0 + rnd() * (x1 - x0), gy = y0 + rnd() * (y1 - y0);
    const len = 0.5 + rnd() * 1.8;
    // ALONG ONE TILE AXIS, never along both at once. The first cut stepped
    // (+len, +len) and called it "a tile edge" in its own comment; in this
    // projection x = (gx - gy) so that diagonal has NO horizontal component —
    // it is straight down the screen. Every puddle rendered as a bundle of
    // vertical white streaks hanging over the yard, which reads as a
    // waterfall pouring out of the containers. Both real axes are used, so a
    // wet patch glints in two directions the way water does.
    const b = rnd() > 0.5 ? g(gx + len, gy, o) : g(gx, gy + len, o);
    const a = g(gx, gy, o);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

/** Ground texture: fine speckle, so a flat fill does not read as paper. */
function grit(ctx, o, x0, y0, x1, y1, seed, n = 2600) {
  const rnd = mulberry(seed);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const gx = x0 + rnd() * (x1 - x0), gy = y0 + rnd() * (y1 - y0);
    const p = g(gx, gy, o);
    ctx.globalAlpha = 0.04 + rnd() * 0.07;
    ctx.fillStyle = rnd() > 0.5 ? '#8ea4b8' : '#05070a';
    ctx.fillRect(p.x, p.y, 1.4, 1.4);
  }
  ctx.restore();
}

/** Paving joints, running along both tile axes so the camera is legible. */
function paving(ctx, o, x0, y0, x1, y1, step, alpha = 0.16) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  for (let gx = x0; gx <= x1; gx += step) {
    const a = g(gx, y0, o), b = g(gx, y1, o);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let gy = y0; gy <= y1; gy += step) {
    const a = g(x0, gy, o), b = g(x1, gy, o);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── the key light ───────────────────────────────────────────────────

/**
 * ONE DIRECTIONAL KEY, FROM THE UPPER LEFT.
 *
 * §10.4 asks for "light from one direction, consistent with the sprite
 * plates — the cast is lit from the upper left". The first draft had no key
 * at all: every surface was flat-shaded and the only light in the picture was
 * a few sodium pools sitting low, which made the lower-right half of every
 * plate the brighter one. The harness measured that and failed all six, and
 * it was right — the ruler was correct and the art was wrong, so this is the
 * art being fixed rather than the check being softened.
 *
 * It is laid over the ground BEFORE anything is built on it, so structures
 * and their shadows sit on top of a floor that already falls away to the
 * lower right. That gradient is most of what gives a flat iso yard depth.
 */
function keyLight(ctx, W, H) {
  const grd = ctx.createLinearGradient(0, 0, W * 0.85, H);
  grd.addColorStop(0, 'rgba(168,196,226,0.22)');
  grd.addColorStop(0.42, 'rgba(120,146,176,0.05)');
  grd.addColorStop(1, 'rgba(0,0,0,0.52)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

/**
 * The marks a working yard carries. The "quiet middle third" rule is about
 * CONTRAST, not emptiness — the first draft read the rule as "leave it blank"
 * and the floor came out a plastic lozenge. These are all low-contrast and
 * all in the projection: staining, a worn track, a drain, shallow puddles.
 */
function groundMarks(ctx, o, seed) {
  const rnd = mulberry(seed);
  // NO BIG GROUND PATCHES — TRIED, MEASURED, AND CUT.
  //
  // The tonal-range check (calibrated against courtyard.jpg at 0.102) reads
  // ~0.05 here, and broad slabs of differing value across the yard were the
  // obvious way to raise it: they took it to 0.073 and they are gone anyway.
  // Stacked translucent rectangles on a flat iso ground do not read as
  // resurfaced asphalt, they read as sheets of glass lying in the yard, and
  // the backlot plate came out looking like a wireframe. The number went up
  // and the picture went down.
  //
  // That is the honest finding of this whole exercise rather than a defect to
  // hide: a code-drawn plate nails the camera, which is the thing this
  // pipeline keeps getting WRONG, and cannot reach a photograph's tonal
  // richness, which is the thing a photograph is FOR. The check is left
  // failing on purpose — it states the gap a delivered plate has to close.
  // Kindling's rule, from the other direction: the ruler was right, and
  // satisfying it was still the wrong move.
  // Broad staining — soft, dark, irregular, nothing with an edge to it.
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const gx = FLOOR.x0 - 5 + rnd() * (FLOOR.x1 - FLOOR.x0 + 10);
    const gy = FLOOR.y0 - 5 + rnd() * (FLOOR.y1 - FLOOR.y0 + 10);
    const c = g(gx, gy, o), r = (1.2 + rnd() * 3.4) * (TILE_W / 2) * o.u;
    const grd = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
    const dark = rnd() > 0.35;
    grd.addColorStop(0, dark ? 'rgba(4,6,9,0.22)' : 'rgba(120,138,158,0.07)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(c.x, c.y); ctx.scale(1, 0.5); ctx.translate(-c.x, -c.y);
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // A worn track across the yard, along one tile axis — where things get
  // dragged. Two parallel bands, darker than the paving around them.
  ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#05070a';
  for (const off of [-0.9, 0.9]) {
    quad(ctx, o, FLOOR.x0 - 5, off - 0.28, FLOOR.x1 + 5, off + 0.28);
    ctx.fill();
  }
  ctx.restore();
  // Shallow standing water: flat sheets that catch the key, so the ground
  // reads as WET rather than merely dark.
  for (let i = 0; i < 5; i++) {
    const gx = FLOOR.x0 + rnd() * (FLOOR.x1 - FLOOR.x0);
    const gy = FLOOR.y0 + rnd() * (FLOOR.y1 - FLOOR.y0);
    const w = 1.4 + rnd() * 3.2, d = 1.0 + rnd() * 2.4;
    // Softened to a wash and feathered at the edge: a hard-edged bright
    // rectangle reads as a sheet of paper lying in the yard, not as water.
    ctx.save(); ctx.globalAlpha = 0.07;
    const c0 = g(gx + w / 2, gy + d / 2, o), rr = Math.max(w, d) * (TILE_W / 2) * o.u;
    const pg = ctx.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, rr);
    pg.addColorStop(0, '#8fa9c6'); pg.addColorStop(1, 'rgba(143,169,198,0)');
    ctx.translate(c0.x, c0.y); ctx.scale(1, 0.5); ctx.translate(-c0.x, -c0.y);
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(c0.x, c0.y, rr, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    sheen(ctx, o, gx, gy, gx + w, gy + d, (seed + i * 7) | 0, 0.09);
  }
}

// ── the frame ───────────────────────────────────────────────────────

/**
 * The floor is where the fight happens, and §10.4 wants it in the MIDDLE and
 * QUIET. Every subject declares its floor in tiles and everything it builds
 * stands OUTSIDE that rectangle — so "nothing important in the middle third"
 * is a property of the layout rather than something to check afterwards.
 *
 * FLOOR is generous on purpose: the board needs an 11x9 grid plus margin, and
 * a plate whose clear ground only just fits leaves the camera nothing to pan
 * over.
 */
export const FLOOR = { x0: -9, y0: -9, x1: 9, y1: 9 };

/** The subjects, one per §10.4's list. */
export const SUBJECTS = {
  'loading-dock': { name: 'A loading dock', draw: loadingDock },
  'underpass':    { name: 'An underpass mouth', draw: underpass },
  'warehouse':    { name: 'A warehouse floor', draw: warehouse },
  'depot':        { name: 'A depot yard', draw: depot },
  'crossing':     { name: 'A street crossing', draw: crossing },
  'backlot':      { name: 'A back lot behind flats', draw: backLot },
};

/**
 * Render one subject. Returns the floor quad in IMAGE FRACTIONS — the exact
 * numbers plates.js wants, arithmetic rather than measured off the picture.
 */
export function drawPlate(ctx, id, W, H) {
  const o = originFor(W, H);
  ctx.fillStyle = PAL.night;
  ctx.fillRect(0, 0, W, H);
  SUBJECTS[id].draw(ctx, o, W, H);
  keyLight(ctx, W, H);
  rain(ctx, W, H, 7 + id.length);
  vignette(ctx, W, H);
  return floorQuad(o, W, H);
}

/**
 * Where the floor's centre sits in the image, and how big a tile is drawn.
 * The floor is put slightly BELOW centre, the way a real yard photographed at
 * this elevation is: the frame above it carries the building the light comes
 * off, and the frame below it is the near ground the camera stands on.
 */
function originFor(W, H) {
  const span = (FLOOR.x1 - FLOOR.x0);
  const u = (W * 0.78) / (span * TILE_W);         // the floor spans ~78% of width
  return { x: W / 2, y: H * 0.56, u };
}

/** The floor quad plates.js asks for, computed rather than eyeballed. */
function floorQuad(o, W, H) {
  const top = g(FLOOR.x0, FLOOR.y0, o), near = g(FLOOR.x1, FLOOR.y1, o);
  const left = g(FLOOR.x0, FLOOR.y1, o), right = g(FLOOR.x1, FLOOR.y0, o);
  return {
    w: W, h: H,
    cx: +(o.x / W).toFixed(3),
    cy: +(o.y / H).toFixed(3),
    halfW: +(((right.x - left.x) / 2) / W).toFixed(3),
    halfH: +(((near.y - top.y) / 2) / H).toFixed(3),
  };
}

/** Closes the plate into the stage colour, as v33 required of a seated plate. */
function vignette(ctx, W, H) {
  const grd = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.95);
  grd.addColorStop(0, 'rgba(10,12,17,0)');
  grd.addColorStop(1, 'rgba(6,7,10,0.86)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
}

/** The ground every subject stands on: wet stone, jointed, gritted, glinting. */
function groundBed(ctx, o, seed, tone = PAL.wet, step = 3) {
  quad(ctx, o, FLOOR.x0 - 6, FLOOR.y0 - 6, FLOOR.x1 + 6, FLOOR.y1 + 6);
  ctx.fillStyle = tone; ctx.fill();
  paving(ctx, o, FLOOR.x0 - 6, FLOOR.y0 - 6, FLOOR.x1 + 6, FLOOR.y1 + 6, step);
  groundMarks(ctx, o, seed + 101);
  grit(ctx, o, FLOOR.x0 - 6, FLOOR.y0 - 6, FLOOR.x1 + 6, FLOOR.y1 + 6, seed);
  sheen(ctx, o, FLOOR.x0 - 4, FLOOR.y0 - 4, FLOOR.x1 + 4, FLOOR.y1 + 4, seed + 11);
}

// ── the six subjects ────────────────────────────────────────────────
// Each builds only OUTSIDE FLOOR, which is what keeps the middle third quiet.

function loadingDock(ctx, o, W, H) {
  groundBed(ctx, o, 3);
  // The dock wall along the far edge, with roller shutters cut into it.
  box(ctx, o, FLOOR.x0 - 5, FLOOR.y0 - 5, FLOOR.x1 + 5, FLOOR.y0 - 2, 7, PAL.brick, { edge: 'rgba(0,0,0,.35)' });
  for (let i = 0; i < 5; i++) {
    const x = FLOOR.x0 - 3 + i * 3.4;
    box(ctx, o, x, FLOOR.y0 - 2.3, x + 2.4, FLOOR.y0 - 2.0, 3.1, PAL.steel, { topMul: 0.9 });
    pool(ctx, o, x + 1.2, FLOOR.y0 - 1.2, 4.2, 0.75);      // a bay light each
  }
  // The loading platform lip, a step up along that wall.
  box(ctx, o, FLOOR.x0 - 5, FLOOR.y0 - 2, FLOOR.x1 + 5, FLOOR.y0 - 0.7, 0.55, PAL.stone);
  // Pallets stacked at both ends, clear of the middle.
  for (const sx of [FLOOR.x0 - 4.2, FLOOR.x1 + 1.4]) {
    for (let k = 0; k < 3; k++) {
      box(ctx, o, sx, FLOOR.y0 + 1 + k * 2.2, sx + 2.2, FLOOR.y0 + 2.6 + k * 2.2, 0.5 + k * 0.2, PAL.rust);
    }
  }
  // A truck bay marking, painted on the ground at the edge.
  ctx.save(); ctx.globalAlpha = 0.20; ctx.strokeStyle = '#d8cf9a'; ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const a = g(FLOOR.x0 - 1 + i * 4, FLOOR.y0 - 0.4, o), b = g(FLOOR.x0 - 1 + i * 4, FLOOR.y0 + 1.2, o);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

function underpass(ctx, o, W, H) {
  groundBed(ctx, o, 5, '#161a21', 4);
  // The tunnel mouth: a deep box far side, with a black opening in it.
  box(ctx, o, FLOOR.x0 - 6, FLOOR.y0 - 7, FLOOR.x1 + 6, FLOOR.y0 - 2.4, 8, '#20242b');
  const m0 = g(FLOOR.x0 + 1.5, FLOOR.y0 - 2.4, o), m1 = g(FLOOR.x1 - 1.5, FLOOR.y0 - 2.4, o);
  const mouthH = 4.6 * TILE_H * o.u;
  ctx.fillStyle = '#05070a';
  ctx.beginPath();
  ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y);
  ctx.lineTo(m1.x, m1.y - mouthH); ctx.lineTo(m0.x, m0.y - mouthH);
  ctx.closePath(); ctx.fill();
  // Headlights OFF frame, per §10.4 — light spilling out, no vehicle drawn.
  const spill = ctx.createLinearGradient(0, m0.y - mouthH, 0, m0.y + 120);
  spill.addColorStop(0, 'rgba(210,225,255,0.11)');
  spill.addColorStop(1, 'rgba(210,225,255,0)');
  ctx.fillStyle = spill;
  ctx.beginPath();
  ctx.moveTo(m0.x, m0.y - mouthH); ctx.lineTo(m1.x, m1.y - mouthH);
  ctx.lineTo(m1.x + 40, m1.y + 150); ctx.lineTo(m0.x - 40, m0.y + 150);
  ctx.closePath(); ctx.fill();
  // Concrete piers down both sides, clear of the middle.
  for (const sx of [FLOOR.x0 - 3.2, FLOOR.x1 + 1.2]) {
    for (let k = 0; k < 3; k++) {
      box(ctx, o, sx, FLOOR.y0 + k * 6, sx + 1.6, FLOOR.y0 + 1.6 + k * 6, 6.5, '#23272e');
    }
  }
  // Graffiti: a band of colour low on the left pier, never mid-frame.
  ctx.save(); ctx.globalAlpha = 0.5;
  for (let i = 0; i < 14; i++) {
    const p = g(FLOOR.x0 - 3.2, FLOOR.y0 + 1 + i * 0.9, o);
    ctx.fillStyle = ['#8a4f9e', '#3f7fa6', '#b0603a'][i % 3];
    ctx.fillRect(p.x - 3, p.y - 42 - (i % 4) * 7, 12, 5);
  }
  ctx.restore();
  // Standing water: a broad flat sheet at one edge, catching the spill.
  quad(ctx, o, FLOOR.x0 - 5, FLOOR.y1 + 0.5, FLOOR.x1 + 5, FLOOR.y1 + 4);
  ctx.fillStyle = 'rgba(70,95,120,0.16)'; ctx.fill();
  sheen(ctx, o, FLOOR.x0 - 5, FLOOR.y1 + 0.5, FLOOR.x1 + 5, FLOOR.y1 + 4, 31, 0.22);
}

function warehouse(ctx, o, W, H) {
  groundBed(ctx, o, 9, '#1d2028', 6);
  // Racking down both long sides — tall, repeated, and outside the floor.
  for (const sx of [FLOOR.x0 - 5.5, FLOOR.x1 + 1.5]) {
    for (let k = 0; k < 5; k++) {
      const y = FLOOR.y0 - 2 + k * 4.2;
      box(ctx, o, sx, y, sx + 4, y + 2.6, 0.4, PAL.steel);              // base
      box(ctx, o, sx, y, sx + 4, y + 2.6, 3.0, shade(PAL.rust, 1.0), { topMul: 0.7 });
      box(ctx, o, sx, y, sx + 4, y + 2.6, 5.4, '#2c3038', { topMul: 0.8 });
    }
  }
  // The far wall, with roof lights above it throwing the one bright note.
  box(ctx, o, FLOOR.x0 - 7, FLOOR.y0 - 6, FLOOR.x1 + 7, FLOOR.y0 - 4, 9, '#24282f');
  for (let i = 0; i < 4; i++) {
    pool(ctx, o, FLOOR.x0 + 1 + i * 4.5, FLOOR.y0 - 1, 6.5, 0.55);
  }
  // A swept lane: the floor paint that says where you may walk.
  ctx.save(); ctx.globalAlpha = 0.13; ctx.strokeStyle = '#d8cf9a'; ctx.lineWidth = 3;
  for (const off of [-0.2, 0.2]) {
    const a = g(FLOOR.x0 - 5, FLOOR.y1 + 2 + off, o), b = g(FLOOR.x1 + 5, FLOOR.y1 + 2 + off, o);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

function depot(ctx, o, W, H) {
  groundBed(ctx, o, 13, '#1b1f26', 5);
  // Containers stacked along the far edge and both sides — the depot's walls.
  const cols = ['#2f3a44', '#3d3128', '#2b3a33', '#3a2f38'];
  for (let i = 0; i < 6; i++) {
    const x = FLOOR.x0 - 6 + i * 3.6;
    box(ctx, o, x, FLOOR.y0 - 5.5, x + 3.2, FLOOR.y0 - 3.0, 2.6, cols[i % 4], { edge: 'rgba(0,0,0,.4)' });
    if (i % 2 === 0) {
      box(ctx, o, x, FLOOR.y0 - 5.5, x + 3.2, FLOOR.y0 - 3.0, 5.2, cols[(i + 1) % 4], { edge: 'rgba(0,0,0,.4)' });
    }
  }
  for (const sx of [FLOOR.x0 - 4.5, FLOOR.x1 + 1.3]) {
    for (let k = 0; k < 3; k++) {
      const y = FLOOR.y0 + k * 6.5;
      box(ctx, o, sx, y, sx + 3.2, y + 2.4, 2.6, cols[(k + 2) % 4], { edge: 'rgba(0,0,0,.4)' });
    }
  }
  // Chain fence across the near edge: a screen, not a wall — you see through.
  ctx.save(); ctx.globalAlpha = 0.30; ctx.strokeStyle = '#7d8a99'; ctx.lineWidth = 1;
  for (let i = 0; i <= 60; i++) {
    const gx = FLOOR.x0 - 6 + i * 0.5;
    const a = g(gx, FLOOR.y1 + 3.2, o);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, a.y - 3.4 * TILE_H * o.u); ctx.stroke();
  }
  for (let k = 0; k <= 7; k++) {
    const a = g(FLOOR.x0 - 6, FLOOR.y1 + 3.2, o), b = g(FLOOR.x1 + 6, FLOOR.y1 + 3.2, o);
    const dy = -k * 0.45 * TILE_H * o.u;
    ctx.beginPath(); ctx.moveTo(a.x, a.y + dy); ctx.lineTo(b.x, b.y + dy); ctx.stroke();
  }
  ctx.restore();
  pool(ctx, o, FLOOR.x0 - 2, FLOOR.y0 - 1.5, 7, 0.9);
  pool(ctx, o, FLOOR.x1 + 1, FLOOR.y1 - 2, 6, 0.6);
}

function crossing(ctx, o, W, H) {
  groundBed(ctx, o, 17, '#171b22', 4);
  // Two roads crossing, drawn ALONG the tile axes so the junction reads.
  ctx.save();
  quad(ctx, o, FLOOR.x0 - 6, -3.2, FLOOR.x1 + 6, 3.2);
  ctx.fillStyle = '#12151b'; ctx.fill();
  quad(ctx, o, -3.2, FLOOR.y0 - 6, 3.2, FLOOR.y1 + 6);
  ctx.fillStyle = '#12151b'; ctx.fill();
  ctx.restore();
  // Lane dashes on both roads, stopping short of the middle third.
  ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = '#d8cf9a'; ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    for (const sgn of [-1, 1]) {
      const gx = sgn * (5 + i * 1.8);
      const a = g(gx, 0, o), b = g(gx + 1.1, 0, o);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      const c = g(0, gx, o), d = g(0, gx + 1.1, o);
      ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    }
  }
  ctx.restore();
  // Corner blocks — three of the four corners built, and ONE LEFT OPEN,
  // because §10.4 asks the-crossing's plate for an obvious way out of frame.
  const corners = [[FLOOR.x0 - 7, FLOOR.y0 - 7], [FLOOR.x1 + 3.4, FLOOR.y0 - 7], [FLOOR.x0 - 7, FLOOR.y1 + 3.4]];
  for (const [cx, cy] of corners) {
    box(ctx, o, cx, cy, cx + 4.2, cy + 4.2, 7.5, PAL.brick, { edge: 'rgba(0,0,0,.35)' });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {      // lit windows
      const p = g(cx, cy + 1 + c * 1.6, o);
      ctx.fillStyle = 'rgba(255,196,120,0.22)';
      ctx.fillRect(p.x - 2, p.y - (3.4 + r * 1.5) * TILE_H * o.u, 9, 7);
    }
  }
  // Lamp posts at the junction's corners, outside the play area.
  for (const [lx, ly] of [[-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5]]) {
    const p = g(lx, ly, o);
    ctx.strokeStyle = '#2b3138'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - 5.2 * TILE_H * o.u); ctx.stroke();
    pool(ctx, o, lx, ly, 8, 1.0);
  }
}

function backLot(ctx, o, W, H) {
  groundBed(ctx, o, 23, '#1a1e24', 4);
  // Flats on the far side and one flank: tall, flat, a grid of dim windows.
  for (const [bx, by, bw, bd] of [[FLOOR.x0 - 6, FLOOR.y0 - 6.5, 20, 2.6], [FLOOR.x1 + 1.8, FLOOR.y0 - 4, 2.6, 16]]) {
    box(ctx, o, bx, by, bx + bw, by + bd, 10, '#23252b', { edge: 'rgba(0,0,0,.3)' });
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      const p = g(bx + 1 + c * (bw / 9), by + bd, o);
      if ((r + c) % 3 === 0) continue;                       // not every one lit
      ctx.fillStyle = `rgba(255,190,115,${0.10 + ((r * 3 + c) % 4) * 0.045})`;
      ctx.fillRect(p.x - 3, p.y - (3 + r * 2.1) * TILE_H * o.u, 10, 9);
    }
  }
  // Bins along one edge.
  for (let i = 0; i < 5; i++) {
    const x = FLOOR.x0 - 5 + i * 2.4;
    box(ctx, o, x, FLOOR.y0 - 2.6, x + 1.7, FLOOR.y0 - 1.2, 1.5, PAL.paint, { edge: 'rgba(0,0,0,.4)' });
  }
  // A rusted swing frame at one corner — an A-frame, drawn in the projection.
  const sw = (gx, gy) => g(gx, gy, o);
  ctx.strokeStyle = shade(PAL.rust, 1.3); ctx.lineWidth = 4;
  const topL = sw(FLOOR.x0 - 4.5, FLOOR.y1 + 1.2), topR = sw(FLOOR.x0 - 0.5, FLOOR.y1 + 1.2);
  const lift = 4.4 * TILE_H * o.u;
  ctx.beginPath();
  ctx.moveTo(topL.x, topL.y); ctx.lineTo(topL.x, topL.y - lift);
  ctx.lineTo(topR.x, topR.y - lift); ctx.lineTo(topR.x, topR.y);
  ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(120,130,140,.5)';
  for (const t of [0.3, 0.55]) {
    const x = topL.x + (topR.x - topL.x) * t, y = topL.y - lift + (topR.y - topL.y) * t;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + lift * 0.62); ctx.stroke();
  }
  // Washing lines: two cables strung between the flats, high and to one side.
  ctx.strokeStyle = 'rgba(150,160,172,.32)'; ctx.lineWidth = 1.6;
  for (const k of [0, 1]) {
    const a = sw(FLOOR.x0 - 5, FLOOR.y0 - 1 + k * 2), b = sw(FLOOR.x0 + 2, FLOOR.y0 - 1 + k * 2);
    const hh = (6.2 - k * 0.7) * TILE_H * o.u;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - hh);
    ctx.quadraticCurveTo((a.x + b.x) / 2, a.y - hh + 12, b.x, b.y - hh);
    ctx.stroke();
  }
  pool(ctx, o, FLOOR.x0 - 3, FLOOR.y0 - 0.5, 6.5, 0.8);
}
