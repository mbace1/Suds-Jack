// Kindling — the bonfire camp, which is the whole reward.
//
// Restaged against the approved scene sheets (`art-src/approved/SHEETS.md` §1).
// The camp is not a room and never was a hut: it is a night clearing, and every
// reference scene stages the same picture, left to right —
//
//   a huge TREE cropped by the top-left corner, a lit LANTERN hung off it
//   a BANNER on a beam, dark cloth with a gold sigil, torn at the hem
//   the RUIN: one whole arch, one broken behind it, moss along every top edge
//   the BONFIRE in its ring of stones, with the companion beside it on a rug
//   the gear on the ground — sword, shield, helmet
//   crumbled wall stacks, and everything ever carried home standing on them
//   a GATE where the wall ends
//   and on the horizon, a CASTLE on a hill with a few windows lit
//
// Three things about that staging are load-bearing and all three were wrong in
// the version before this one:
//
//   THE FIRE IS NOT CENTRED. It sits left of centre with the ruin behind it, so
//   the picture has somewhere to recede to and the companion has somewhere to
//   stand that is not the middle.
//   DEPTH IS VALUE, NOT PERSPECTIVE. The handoff is explicit — "do not invent
//   perspective depth that the supplied layers cannot support". Four flat
//   layers, each a step lighter or darker than the one behind.
//   TEXTURE IS A VALUE STEP, NEVER A LINE. A wall reads as blocks because
//   adjacent blocks are different values, not because mortar is drawn on it.
//   Every line cut into the stone competed with the fire and lost.
//
// What did NOT change is the thing underneath: there is still no score, and what
// you get for looking after yourself is LIGHT. The fire stands as high as the
// day you have had, and how far it reaches decides how much of the camp exists.
//
// TWO RAMPS, ONE SUBTRACTION. Everything is painted from the COLD ramp and
// warmed toward the fire by `lightAt`. Paint the stone warm to begin with and
// the whole picture goes flat.
//
// Cost discipline: the static camp is one fillRect per cell inside `cached()`,
// keyed on the light BAND (six states, not a slider). The fire, the lantern, the
// banner, the ember motes, the grass, the castle windows and the companion are
// drawn live on top — the sheet asks for secondary motion everywhere, and a
// scene whose first screen is frozen reads as a broken page.

import { PAL, mix, shade } from './palette.js?v=7';
import { bayer, rampDither } from './pixel.js?v=7';
import { THINGS } from './errand.js?v=7';
import { drawPet } from './pet.js?v=7';

export const FLOOR_Y = 100;
// The bonfire sits left of centre and the companion beside it. Both keep the
// coordinates idle.js already walks to (SPOT.hearth 58 · home 74 · pile 96 ·
// shelf 108 · window 120), because the creature's behaviours are about this
// place and should not need rewriting when the place changes its clothes.
const FIRE_X = 50, FIRE_Y = 96;
const PET_X = 74;

// how far the light reaches, in pixels, from coals to a full fire. The floor of
// 46 is what keeps the companion and its patch of ground readable on a day with
// nothing in it at all.
const REACH = w => 46 + w * 124;

// ── what is outside ──────────────────────────────────────────────────
// The sky is read off the LOCAL CLOCK and nothing else: no forecast is fetched,
// nothing is claimed about the real weather where you are, and none of it touches
// what anything is worth. It is a picture of a night.
//
// The night is genuinely BLUE. The first cut was painted so close to black that
// there was no cold half for the fire to be warm against — the reference sky is
// a navy you can name.
export const SKY = {
  night: { key: 'night', top: '#101a30', low: '#243357', trees: '#0d1522', stars: 18, moon: true },
  small: { key: 'small', top: '#0c1526', low: '#1d2a48', trees: '#0b1220', stars: 13, moon: true },
  dawn:  { key: 'dawn',  top: '#1a2542', low: '#7a5652', trees: '#131a26', stars: 4,  moon: false },
  day:   { key: 'day',   top: '#3f5b78', low: '#8ba3ad', trees: '#1c2734', stars: 0,  moon: false },
  dusk:  { key: 'dusk',  top: '#161d38', low: '#5a3a4c', trees: '#101724', stars: 8,  moon: true },
};

// the hour decides the tone; the DATE decides the stars, so tonight's sky is not
// last night's and is still the same sky all evening
export function skyOf(date = new Date()) {
  const h = date.getHours();
  const tone = h < 5 ? SKY.night : h < 8 ? SKY.dawn : h < 17 ? SKY.day
    : h < 20 ? SKY.dusk : h < 22 ? SKY.small : SKY.night;
  const seed = Math.floor(date.getTime() / 86400000);
  return { ...tone, seed, key: `${tone.key}:${seed}` };
}

// light at a point, 0..1 — the one function the whole scene agrees on
function lightAt(x, y, w) {
  const d = Math.hypot(x - FIRE_X, (y - FIRE_Y) * 1.25);
  return Math.max(0, 1 - d / REACH(w));
}

// cold stone warmed by the fire. Every surface in the camp goes through this, so
// the whole picture agrees about where the heat is coming from.
function lit(cold, u, warm = PAL.EMBER) {
  return mix(cold, warm, Math.min(0.85, u * u * 1.15));
}

// A block of masonry, picked out of the five-step stone ramp by its own
// position. This is the whole texture system: neighbouring blocks land on
// different steps, so a wall reads as courses without a single joint being
// drawn. `base` shifts which part of the ramp a surface sits in — a lintel is
// lighter than the leg under it because it is catching the moon.
// It has to be quantised into BLOCKS. The first cut hashed per pixel, which is
// not texture at all — it is noise, and a wall of noise reads as poured
// concrete however carefully the ramp is chosen. Blocks are 4×3 with the
// courses offset by half a block, and the joint is the block's own last row and
// column dropped two steps down the ramp: the mortar is the absence between
// stones, never a line drawn on top of them.
function stone(x, y, u, base = 2) {
  const by = Math.floor(y / 3);
  const bx = Math.floor((x + (by % 2) * 2) / 4);
  const h = ((bx * 73856093) ^ (by * 19349663)) >>> 0;
  const i = Math.max(0, Math.min(4, base + (h % 3) - 1));
  const joint = ((x + (by % 2) * 2) % 4 === 3) || (y % 3 === 2);
  return lit(PAL.BLOCK[joint ? Math.max(0, i - 2) : i], u);
}

export function drawRoom(scr, view) {
  const { warmth = 0, fuel = 0, found = [], away = false, t = 0, still = false } = view;

  const flick = still ? 0 : (Math.sin(t * 11.3) * 0.5 + Math.sin(t * 7.1) * 0.5);

  // THE FIVE BANDS. A day holds five small things, so the camp has six states:
  // coals, and one for each thing kept. The static light snaps to the band while
  // the FIRE eases continuously through it — the flame visibly climbs as you tick
  // something off, and then the world arrives at a new state rather than drifting
  // through a hundred indistinguishable ones.
  //
  // The bonfire sheet names these five as UNLIT RING → LOW EMBERS → MEDIUM →
  // FULL → SPARKS, with the stone ring constant through all of them.
  const band = Math.max(0, Math.min(5, Math.round(warmth * 5)));
  const q = band / 5;
  const sky = view.sky ?? SKY.night;
  scr.cached(`${band}|${Math.min(9, fuel)}|${found.length}|${away ? 1 : 0}|${sky.key ?? ''}`, () => {
    staticCamp(scr, q, fuel, found, sky);
  });

  // ── the live layer ──
  // The sheet's shared animation principles ask for secondary motion everywhere,
  // and none of it may cost a repaint of the camp, so everything that moves is
  // drawn here on top of the blit.
  castleWindows(scr, t, still, sky);
  banner(scr, 26, 44, q, t, still);
  hangingLantern(scr, t, still);

  // `flame` is the live height — breathing drives it continuously, and it must
  // not touch the cache key, so it is a separate field from the day's warmth
  bonfire(scr, view.flame == null ? warmth : view.flame, flick, still, t);
  motes(scr, q, t, still);
  grass(scr, q, t, still);

  if (away) awayLantern(scr, t, still);
  else {
    const px = view.petX == null ? PET_X : view.petX;
    drawPet(scr, px, FLOOR_Y, {
      stage: view.stage, t, pose: view.pose, hop: view.hop, still,
      face: view.face ?? -1, look: view.look ?? 0,
      lit: Math.min(1, lightAt(px, FLOOR_Y - 8, q) * 1.6),
    });
  }
  if (view.sparks) for (const s of view.sparks) {
    scr.px(s.x, s.y, 1, 1, s.life > 0.5 ? PAL.SPARK : PAL.EMBER);
  }
}

// ── the part that holds still ────────────────────────────────────────
function staticCamp(scr, w, fuel, found, sky) {
  scr.clear(PAL.VOID);
  skyPlane(scr, sky);
  farPlane(scr, sky, w);
  ruinPlane(scr, w, found);
  gate(scr, w);
  groundPlane(scr, w);
  props(scr, w);
  branchPile(scr, w, fuel);
  bigTree(scr, w, sky);
  foreground(scr, w);
}

// ── plane 1: the sky, which the fire never touches ──
function skyPlane(scr, sky) {
  const H = 68;
  for (let y = 0; y < H; y++) {
    scr.px(0, y, scr.w, 1, mix(sky.top, sky.low, (y / H) ** 1.6));
  }
  // the ember band low on the horizon, behind the castle. Every night scene has
  // one — it is what stops the sky being a flat wash and gives the castle a
  // value to be a silhouette against.
  for (let y = 52; y < H; y++) {
    const k = (y - 52) / (H - 52);
    for (let x = 96; x < scr.w; x++) {
      const across = Math.min(1, (x - 96) / 60);
      if (bayer(x >> 1, y >> 1) < k * across * 0.75) {
        scr.px(x, y, 1, 1, mix(sky.low, PAL.SKY_WARM, k * 0.7));
      }
    }
  }
  for (let i = 0; i < sky.stars; i++) {
    const h = (i * 2654435761 + sky.seed * 40503) >>> 0;
    scr.px(3 + (h % (scr.w - 6)), 2 + ((h >>> 8) % (H - 30)), 1, 1,
      (h >>> 16) % 5 === 0 ? PAL.MOON : PAL.STAR);
  }
  // flat cloud bars — the reference clouds are horizontal slabs with hard tops,
  // which is the only kind of cloud that survives at this size
  for (const [cx, cy, cw] of [[112, 24, 34], [64, 12, 26], [150, 40, 30]]) {
    for (let i = 0; i < 3; i++) {
      const iw = Math.round(cw * (1 - i * 0.22));
      scr.px(cx - iw / 2 + i, cy + i * 2, iw, 2, mix(PAL.CLOUD, sky.low, 0.15 + i * 0.25));
    }
  }
  // The moon, high and to the right — the one cold light, opposite the fire, so
  // the two of them split the picture between them.
  if (sky.moon) {
    scr.softDisc(150, 18, 15, mix(sky.low, PAL.MOON, 0.22), 12);
    scr.disc(150, 18, 7, mix(PAL.MOON, sky.low, 0.12));
    scr.disc(147, 15, 2, shade(PAL.MOON, 0.86));      // a crater, so it is a body
    scr.disc(152, 21, 1, shade(PAL.MOON, 0.9));
  }
}

// ── plane 2: what is far away, and cold ──
// Hills, then the castle on one of them, then the conifers. Three value steps
// and nothing else — this is where "depth is value, not perspective" is either
// obeyed or not.
function farPlane(scr, sky, w) {
  // THE DISTANCE IS PAINTED FIRST AND ACROSS THE WHOLE WIDTH. This is not
  // decoration — it is what stands behind the arches. The first cut painted it
  // only where the ruin was not, so the arch openings showed raw VOID and the
  // scene had two black holes punched in the middle of it. Anything with a hole
  // in it needs something behind the hole.
  for (let y = 62; y < FLOOR_Y; y++) {
    scr.px(0, y, scr.w, 1, mix(PAL.TREE_NEAR, PAL.COLD[1], 0.2 + (y - 62) / 90));
  }
  const hill = mix(sky.trees, PAL.COLD[2], 0.5);
  for (let x = 88; x < scr.w; x++) {
    const y = 58 - Math.round(Math.sin((x - 88) * 0.04) * 8 + 2);
    scr.px(x, y, 1, 68 - y, hill);
  }
  castle(scr, 118, 24, sky);
  // the conifer line: a row of triangles, near-black, closing the horizon
  const conifer = (x0, base, h) => {
    for (let i = 0; i < h; i++) {
      const half = Math.max(1, Math.round((i / h) * h * 0.42));
      scr.px(x0 - half, base - h + i, half * 2 + 1, 1, PAL.TREE_NEAR);
    }
  };
  for (let x = 56; x < 116; x += 7) conifer(x, 68, 9 + (x % 3) * 4);
  for (let x = 150; x < scr.w + 8; x += 6) conifer(x, 70, 12 + (x % 4) * 4);
}

// The castle on its hill: a silhouette with lit windows, and it is the one warm
// thing in the picture the player's fire did NOT light. That is deliberate —
// somebody else is up, a long way off.
// A SILHOUETTE, and that word is doing work: the first cut painted the tall
// tower in the light stone tone, which at this distance read as a bright column
// hanging under the moon rather than as a building. A far object is a shape cut
// out of the sky — one value, and only its moonward edge lifted.
function castle(scr, x, y, sky) {
  const body = mix(PAL.CASTLE, sky.low, 0.12);
  const edge = mix(PAL.CASTLE_LIT, sky.low, 0.35);
  scr.px(x, y + 16, 26, 20, body);                 // the keep
  scr.px(x + 3, y + 10, 8, 8, body);               // a tower
  scr.px(x + 18, y + 4, 7, 14, body);              // the tall tower
  scr.px(x + 24, y + 4, 1, 14, edge);              // its moonward edge, and only that
  for (let i = 0; i < 4; i++) scr.px(x + 18 + i * 2, y + 2, 1, 3, body);
  for (let i = 0; i < 6; i++) scr.px(x + 1 + i * 4, y + 14, 2, 2, body);
  scr.px(x - 7, y + 26, 8, 10, mix(body, sky.low, 0.35));  // an outbuilding, further off
}

// The lit windows are LIVE: they flicker slowly, on their own uneven clock, so
// the horizon is never quite still. Three of them, which is enough to say
// somebody is home and few enough to stay out of the fire's job.
const WINDOWS = [[139, 32], [124, 46], [133, 50]];
function castleWindows(scr, t, still, sky) {
  if (!sky.moon && sky.key?.startsWith?.('day')) return;
  WINDOWS.forEach(([x, y], i) => {
    const k = still ? 0.7 : 0.55 + Math.sin(t * (0.7 + i * 0.23) + i * 2) * 0.45;
    scr.px(x, y, 1, 2, mix(PAL.CASTLE_LIT, PAL.EMBER, k));
  });
}

// ── plane 3: the ruin itself — cold stone, warmed where the fire reaches ──
//
// A whole arch, a broken one behind it, and crumbled stacks running off to the
// right. The arch is what the first pass got worst: it was drawn as two 2px
// lines and a curve, which reads as a wire hoop rather than as masonry. The
// reference arch is a THICK ring of blocks with visible mass and moss on top,
// and mass at this size means five pixels, not two.
function ruinPlane(scr, w, found) {
  ruinArch(scr, 45, 62, 17, 5, FLOOR_Y, w, 0.94);  // the whole one, behind the fire
  ruinArch(scr, 78, 66, 13, 4, FLOOR_Y, w, 0.72);  // the broken one, further back
  wallStack(scr, w);
  ledge(scr, w, found);
}

// An arch standing free: an outer curve, an inner curve, and blocks between
// them. The opening is NOT painted — whatever is behind shows straight through,
// which is the only thing that makes it read as an arch instead of a doorway
// with a dark door in it.
//
// `bite` is how ruined it is: blocks are dropped from the crown outward, so the
// two arches in the scene are the same construction at different ages.
function ruinArch(scr, cx, springY, rOut, thick, footY, w, solid) {
  const rIn = rOut - thick;
  for (let y = springY - rOut - 1; y <= footY; y++) {
    let outer, inner;
    if (y < springY) {
      const dy = springY - y;
      outer = Math.sqrt(Math.max(0, rOut * rOut - dy * dy));
      inner = dy <= rIn ? Math.sqrt(Math.max(0, rIn * rIn - dy * dy)) : 0;
      if (outer <= 0.5) continue;
    } else { outer = rOut; inner = rIn; }
    for (const side of [-1, 1]) {
      const a = Math.round(inner), b = Math.round(outer);
      for (let d = a; d < b; d++) {
        const px = cx + side * d;
        // the ruin: a block is missing if this bit of the arch has fallen. The
        // hash is stable, so the same stones are gone every repaint.
        const gone = (((px * 374761393) ^ (y * 668265263)) >>> 8) % 100;
        if (gone > solid * 100 + (y > springY ? 22 : 0)) continue;
        scr.px(px, y, 1, 1, stone(px, y, lightAt(px, y, w), 2));
      }
    }
  }
  // MOSS along the top, which every stone in the reference carries — but only
  // along the TOP. Run it round the whole arc and the arch stops being masonry
  // and becomes a hoop of vine, which is what the first cut did: moss is a
  // horizontal-surface plant and the sides of an arch are not horizontal.
  for (let a = -0.95; a <= 0.95; a += 0.05) {
    const px = Math.round(cx + Math.sin(a) * (rOut - 1));
    const py = Math.round(springY - Math.cos(a) * (rOut - 1));
    if (((px * 9176) ^ py) % 3 === 0) continue;
    const u = lightAt(px, py, w);
    scr.px(px, py, 1, 2, lit(mix(PAL.COLD[2], PAL.MOSS_TOP, 0.55 + ((px * 7) % 4) / 9), u * 0.4));
  }
  // the keystone, one step brighter — an arch with no keystone has no centre
  scr.px(cx - 1, springY - rOut - 1, 3, 3,
    lit(PAL.BLOCK[4], lightAt(cx, springY - rOut, w)));
}

// The crumbled wall stacks running off to the right: five blocks of masonry
// stepping down, with rubble at their feet. This is the "wall caps and corners"
// row of the ruins sheet, and it is what the found objects stand on.
// STACKS, not a wall. The first cut ran them nearly edge to edge at one height
// in the middle of the stone ramp, and the whole right half of the picture went
// to a flat pale slab that hid the castle and read as poured concrete. What
// fixes it is what makes a ruin a ruin: they are SEPARATE, at DIFFERENT heights,
// with the distance visible in the gaps between them, and they sit low in the
// value ramp because they are a long way from the fire.
const STACK = [[92, 74, 24], [120, 80, 16], [140, 76, 14], [158, 84, 16]];
function wallStack(scr, w) {
  for (const [x0, top, wd] of STACK) {
    for (let y = top; y < FLOOR_Y; y++) {
      for (let x = x0; x < x0 + wd; x++) {
        // the top course crumbles: a ragged edge, never a straight one
        const bite = Math.round(Math.abs(Math.sin(x * 0.37 + x0)) * 4);
        if (y < top + bite) continue;
        scr.px(x, y, 1, 1, stone(x, y, lightAt(x, y, w), 1));
      }
    }
    // moss on the top edge — dim, and broken, so it is growth rather than paint
    for (let x = x0; x < x0 + wd; x++) {
      const bite = Math.round(Math.abs(Math.sin(x * 0.37 + x0)) * 4);
      if ((x * 3) % 5 === 0) continue;
      scr.px(x, top + bite, 1, 2,
        lit(mix(PAL.COLD[2], PAL.MOSS_TOP, 0.6), lightAt(x, top, w) * 0.4));
    }
  }
  // rubble at the foot of the stacks
  for (let i = 0; i < 14; i++) {
    const x = 92 + i * 7 + (i % 3), y = FLOOR_Y - 2 - (i % 2) * 2;
    scr.px(x, y, 3, 2, stone(x, y, lightAt(x, y, w), 1));
  }
}

// The ledge, and everything ever carried home — now the two courses of the
// crumbled wall rather than a shelf, because the camp has no cupboards in it.
// An object is only drawn where the light actually reaches it: that is still
// the trick of this screen, the wall fills up permanently and a bad day simply
// cannot see the far end of it.
function ledge(scr, w, found) {
  const BOARDS = [82, 93];
  const x0 = 96, x1 = 150;
  BOARDS.forEach((y, board) => {
    for (let x = x0; x < x1; x += 2) {
      const u = lightAt(x, y, w);
      if (u <= 0.05) continue;
      scr.px(x, y, 2, 2, lit(PAL.BLOCK[3], u * 1.15));
      scr.px(x, y + 2, 2, 1, shade(PAL.BLOCK[0], 0.7));
    }
    found.slice(-12).forEach((id, i) => {
      if (Math.floor(i / 6) !== board) return;
      const thing = THINGS[id];
      if (!thing) return;
      const x = x0 + 3 + (i % 6) * 9;
      const u = lightAt(x, y, w);
      if (u <= 0.12) return;
      thing.draw(scr, x, y - 1);
      if (u < 0.42) for (let dy = -6; dy <= 1; dy++) {
        for (let dx = 0; dx < 6; dx++) {
          if (bayer(x + dx, y + dy) > u * 2.3) scr.px(x + dx, y + dy, 1, 1, PAL.VOID);
        }
      }
    });
  });
}

// THE GATE. It takes a full fire to see it, and that is the one piece of staging
// in this picture that is also a design statement: what a good day reveals is the
// way out. Nothing asks you to use it and it does not open.
function gate(scr, w) {
  const x = 158, y = 68, dw = 24, dh = FLOOR_Y - y;
  const u = lightAt(x + dw / 2, y + dh * 0.6, w);
  if (u <= 0.04) return;
  // The gate has to be SEEN on a full fire, or "a good day shows you the way out"
  // is a claim the picture never keeps. Rusted iron takes firelight well, so it
  // is mixed warm hard at the top of the range.
  const iron = lit(PAL.IRON, Math.min(1, u * 2.4), PAL.EMBER);
  // an arched surround, per the sheet's gate-and-portcullis row
  for (let iy = y - 6; iy < FLOOR_Y; iy++) {
    const dy = y - iy;
    const half = iy < y ? Math.sqrt(Math.max(0, 144 - dy * dy)) : 12;
    if (half <= 0) continue;
    for (const side of [-1, 1]) {
      for (let d = Math.round(half) - 3; d < Math.round(half); d++) {
        const px = Math.round(x + dw / 2) + side * d;
        scr.px(px, iy, 1, 1, stone(px, iy, u, 3));
      }
    }
  }
  scr.rect(x, y, dw, dh, mix(PAL.COLD[0], PAL.NIGHT, 0.4));
  // The bars are IRON, and iron in the dark is nearly black with a lit edge.
  // Painting the whole bar in warm rust turned the gate into a white picket
  // fence — the brightest thing in the right half of a picture whose brightest
  // thing is supposed to be the fire.
  for (let i = 0; i < 5; i++) scr.px(x + 2 + i * 5, y, 3, dh, shade(iron, 0.55));
  for (const iy of [y + 6, y + dh - 8]) scr.px(x + 2, iy, dw - 4, 2, shade(iron, 0.7));
  for (let i = 0; i < 5; i++) {
    scr.px(x + 2 + i * 5, y, 1, dh, lit(shade(PAL.RUST, 0.8), Math.min(1, u * 2.2), PAL.EMBER));
  }
}

// ── the big tree, cropped by the top-left corner ──
// It is drawn late, over the ruin, because it is nearer than the ruin is. The
// reference crops it by two edges at once; a tree that fits inside the frame is
// a shrub in the middle distance.
function bigTree(scr, w, sky) {
  // the trunk, leaning very slightly, with roots spreading into the ground
  for (let y = 0; y < FLOOR_Y + 4; y++) {
    const lean = Math.round(Math.sin(y * 0.012) * 3);
    const wd = 13 + Math.round((y / FLOOR_Y) ** 3 * 9);
    const x0 = 2 + lean;
    for (let x = x0; x < x0 + wd; x++) {
      const u = lightAt(x, y, w);
      // bark is vertical value banding — the one place a "line" is right,
      // because bark IS lines
      const k = ((x * 5) ^ (y >> 3)) % 4;
      scr.px(x, y, 1, 1, lit(mix(PAL.BARK, PAL.BARK_LIT, k / 5), u * 0.8));
    }
  }
  for (const [rx, ry, rw2] of [[14, 98, 14], [10, 102, 18], [16, 104, 20]]) {
    scr.px(rx, ry, rw2, 3, lit(PAL.BARK, lightAt(rx + rw2 / 2, ry, w) * 0.9));
  }
  // The canopy: a BAND across the top, not a curtain down the side. The first
  // cut hung discs to y=54 and the left third of the picture became a green
  // cliff with the trunk buried in it — a tree is a trunk you can see with
  // leaves above it, and the moment the leaves reach the ground it is a hedge.
  for (const [cx, cy, cr, near] of [
    [8, 4, 17, 0], [30, 1, 15, 1], [48, 5, 11, 0], [18, 15, 12, 1], [40, 14, 9, 0],
  ]) {
    scr.disc(cx, cy, cr, near ? PAL.LEAF : PAL.LEAF_DARK);
  }
  // a few leaves catching the moon along the lower edge of the canopy, which is
  // the edge you actually see against the sky
  for (let i = 0; i < 20; i++) {
    const h = (i * 2654435761) >>> 0;
    const lx = 2 + (h % 56), ly = 2 + ((h >>> 9) % 24);
    scr.px(lx, ly, 2, 1, mix(PAL.LEAF, sky.low, 0.4));
  }
  // the lantern's bracket — the flame itself is live
  scr.px(16, 52, 8, 2, PAL.IRON);
  scr.px(22, 53, 1, 5, PAL.IRON);
  scr.rect(20, 58, 6, 7, shade(PAL.IRON, 1.2), PAL.INK);
  // and the beam the banner hangs from
  scr.px(24, 42, 16, 2, lit(PAL.BARK_LIT, 0.35));
  scr.px(38, 42, 2, 4, lit(PAL.BARK, 0.3));
}

// The lantern on the tree: the second warm light in the camp, and the only one
// that is not the bonfire. It flickers on its own clock — two lights breathing
// in step read as one light.
function hangingLantern(scr, t, still) {
  const k = still ? 0.6 : 0.55 + Math.sin(t * 5.7) * 0.25 + Math.sin(t * 13.1) * 0.2;
  scr.softDisc(23, 61, 9, mix(PAL.COAL_HOT, PAL.EMBER, 0.3 + k * 0.4), 7);
  scr.px(21, 60, 4, 4, mix(PAL.EMBER, PAL.FLAME, k));
  scr.px(22, 61, 2, 2, mix(PAL.FLAME, PAL.FLAME_CORE, k));
}

// A banner that has been hanging too long: dark cloth, a gold sigil, a torn
// hem. It SWAYS — cloth is the sheet's own example of follow-through, and a
// banner that holds perfectly still is a painted wall.
function banner(scr, x, y, w, t, still) {
  const u = lightAt(x + 5, y + 14, w);
  const cloth = lit(shade(PAL.BANNER_DIM, 0.75), u * 0.6, PAL.BANNER);
  const gold = lit(shade(PAL.BANNER_GOLD, 0.6), u * 0.9, PAL.BANNER_GOLD);
  for (let iy = 0; iy < 26; iy++) {
    // the sway runs down the cloth as a travelling wave, biggest at the hem
    const k = iy / 26;
    const sway = still ? 0 : Math.sin(t * 1.6 - k * 2.1) * (k * k * 2.2);
    const tear = iy > 19 ? (iy - 19) : 0;              // it is torn at the bottom
    const bx = Math.round(x + sway);
    scr.px(bx, y + iy, 11 - tear * 2, 1, iy % 6 === 5 ? shade(cloth, 0.8) : cloth);
    // the sigil: a cross, in the reference's gold, three rows of it
    if (iy > 7 && iy < 17) {
      const mid = iy > 10 && iy < 13;
      scr.px(bx + (mid ? 3 : 5), y + iy, mid ? 5 : 1, 1, gold);
    }
  }
}

// ── the warm plane: the ground the fire actually lights ──
function groundPlane(scr, w) {
  for (let y = FLOOR_Y; y < scr.h; y += 2) {
    for (let x = 0; x < scr.w; x += 2) {
      const u = lightAt(x, y, w);
      const cold = mix(rampDither(PAL.COLD, 0.22 + (y - FLOOR_Y) / 60, x >> 1, y >> 1), PAL.EARTH, 0.4);
      scr.px(x, y, 2, 2, lit(cold, u * 1.3, PAL.EARTH_LIT));
    }
  }
  // the path: flat stones set into the earth, running off to the right — the
  // way out, drawn as the ground rather than as a thing
  for (let i = 0; i < 26; i++) {
    const h = (i * 2246822519) >>> 0;
    const x = 96 + (h % 92), y = FLOOR_Y + 2 + ((h >>> 7) % 22);
    const u = lightAt(x, y, w);
    scr.px(x, y, 4 + (h % 3), 3, lit(PAL.BLOCK[2], u * 1.5, PAL.EARTH_LIT));
    scr.px(x, y, 4 + (h % 3), 1, lit(PAL.BLOCK[3], u * 1.7, PAL.EARTH_LIT));
  }
  // where the wall stacks meet the ground — and only there. A hard line all the
  // way across read as the lip of a stage.
  for (const [x0, , wd] of STACK) scr.px(x0, FLOOR_Y - 1, wd, 1, PAL.VOID);
}

// The gear on the ground beside the fire — sword, shield, helmet — which every
// reference scene has and which is what says somebody stopped here rather than
// lives here. Plus the rug the companion sits on.
function props(scr, w) {
  const U = x => lightAt(x, FLOOR_Y + 2, w);
  // the rug, under the companion's usual place
  for (let x = PET_X - 11; x < PET_X + 11; x++) {
    const u = U(x);
    scr.px(x, FLOOR_Y, 1, 4, lit(shade(PAL.CAP, 0.45), u * 0.9, PAL.CAP));
    if ((x - PET_X) % 4 === 0) scr.px(x, FLOOR_Y + 1, 1, 2, lit(PAL.BANNER_GOLD, u * 0.6));
  }
  // a sword, point down in the earth
  scr.px(64, FLOOR_Y - 13, 2, 13, lit(PAL.BLADE, U(64) * 1.4));
  scr.px(62, FLOOR_Y - 13, 6, 2, lit(PAL.IRON_LIT, U(64) * 1.2));
  scr.px(64, FLOOR_Y - 16, 2, 3, lit(PAL.BANNER_GOLD, U(64)));
  // a shield, leaning
  scr.disc(90, FLOOR_Y - 6, 5, lit(shade(PAL.SHIELD, 0.7), U(90) * 0.8), PAL.INK);
  scr.px(89, FLOOR_Y - 10, 2, 8, lit(shade(PAL.BANNER_GOLD, 0.8), U(90) * 0.7));
  scr.px(86, FLOOR_Y - 8, 8, 2, lit(shade(PAL.BANNER_GOLD, 0.8), U(90) * 0.7));
  // a helmet, set down on its side
  scr.disc(104, FLOOR_Y - 3, 4, lit(PAL.IRON_LIT, U(104)));
  scr.px(100, FLOOR_Y - 3, 9, 4, lit(PAL.IRON, U(104)));
  scr.px(103, FLOOR_Y - 5, 2, 3, PAL.VOID);

  // mushrooms and small flowers along the lit ground. Every reference scene has
  // them and they do one job: they are the only saturated colour down here that
  // is not the fire, so the ground stops being a brown field.
  for (const [mx, my, cap] of [[30, 112, PAL.CAP], [22, 120, PAL.CAP], [118, 106, PAL.BLOOM],
    [96, 116, PAL.BANNER_GOLD], [58, 118, PAL.BLOOM], [136, 110, PAL.CAP]]) {
    const u = lightAt(mx, my, w);
    if (u < 0.08) continue;
    scr.px(mx, my - 1, 1, 2, lit(PAL.BONE, u * 0.9));
    scr.px(mx - 1, my - 2, 3, 1, lit(cap, Math.min(1, u * 1.6), PAL.FLAME));
  }
}

// the unspent kindling, as a stack of cut branches beside the fire
function branchPile(scr, w, fuel) {
  const n = Math.min(9, fuel);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const x = 116 + col * 7 + (row % 2 ? 2 : 0);
    const y = FLOOR_Y - 4 - row * 4;
    const u = Math.min(1, lightAt(x, y, w) * 1.3);
    if (u <= 0.05) continue;
    scr.rect(x, y, 7, 4, lit(shade(PAL.WOOD, 0.7), u, PAL.WOOD_LIT), PAL.VOID);
    scr.px(x + 1, y + 1, 2, 1, lit(PAL.WOOD, u * 0.8, PAL.BONE));
  }
}

// ── the front plane: near-black, cropped by the frame ──
// This is what makes it layered rather than flat. Both pieces are cut off by the
// edge of the picture on purpose.
function foreground(scr, w) {
  // A ROCK CLUSTER cropped by the bottom-left corner. What was here was a fallen
  // column drawn as a 44px black bar with one lit line on it, and at this size
  // that is not a cylinder — it is a band of black across the bottom of the
  // picture. Rocks are the reference's own foreground furniture and they have
  // the one thing the bar did not: a top edge that goes up and down, which is
  // the only way a silhouette says "solid object" rather than "letterbox".
  for (const [rx, ry, rr] of [[-2, 122, 13], [14, 126, 11], [28, 124, 8], [38, 127, 6]]) {
    scr.disc(rx, ry, rr, '#070a10');
    // one lit rim along the fire-facing upper edge, and nothing else — a
    // foreground mass has no interior detail
    for (let a = -1.1; a <= 0.5; a += 0.08) {
      const px = Math.round(rx + Math.sin(a) * rr), py = Math.round(ry - Math.cos(a) * rr);
      scr.px(px, py, 1, 1, lit('#1e2836', lightAt(px, py, w) * 0.8));
    }
  }
  // brambles either side, in silhouette, running off both edges
  for (let i = 0; i < 11; i++) {
    const bx = 140 + i * 5, h = 9 + (i % 3) * 6;
    for (let k = 0; k < h; k++) {
      scr.px(bx + Math.round(Math.sin(k * 0.5 + i) * 2), scr.h - k, 2, 1, '#05070b');
    }
  }
  for (let i = 0; i < 5; i++) {
    const bx = i * 6, h = 12 + (i % 3) * 7;
    for (let k = 0; k < h; k++) {
      scr.px(bx + Math.round(Math.sin(k * 0.42 + i) * 3), scr.h - k, 2, 1, '#05070b');
    }
  }
  // and the dark closing in at the very corners
  for (let y = 0; y < scr.h; y += 2) {
    for (let x = 0; x < scr.w; x += 2) {
      const dx = Math.max(0, Math.abs(x - 96) - 82) / 16;
      const dy = Math.max(0, Math.abs(y - 62) - 56) / 12;
      const v = Math.min(1, Math.hypot(dx, dy));
      if (v > 0.15 && bayer(x >> 1, y >> 1) < v * 0.55) scr.px(x, y, 2, 2, PAL.VOID);
    }
  }
}

// ── the part that moves ──────────────────────────────────────────────
// One tongue of flame: a stack of 1px bars, one colour change per row, the way a
// 2600 builds a sky. Several of them at different heights is what stops a fire
// reading as a cone — a single tapered stack is a shape, and fire is not a shape,
// it is several arguing.
function tongue(scr, x, base, h, wide, t, still, phase) {
  const rows = Math.max(1, Math.round(h));
  for (let i = 0; i < rows; i++) {
    const k = i / rows;
    const sway = still ? 0 : Math.sin(t * 7 + phase + k * 5) * (0.8 + k * 3.4);
    const bw = Math.max(1, Math.round(wide * (1 - k * k * 0.95) * (1 - k * 0.35)));
    const col = k < 0.16 ? PAL.FLAME_CORE : k < 0.44 ? PAL.FLAME
      : k < 0.76 ? PAL.EMBER : PAL.COAL_HOT;
    scr.px(x - bw / 2 + sway * k, base - 1 - i, bw, 1, col);
  }
}

function bonfire(scr, w, flick, still, t) {
  const base = FLOOR_Y - 3;
  const h = 4 + w * 22 + flick * (0.8 + w * 2);

  // the ring of stones it is built in — cold rock lit from inside, which is the
  // whole scheme in one object, and the one constant across all five fire states
  for (let i = -5; i <= 5; i++) {
    const sx = FIRE_X + i * 4, sy = base + 2 + Math.abs(i) % 2;
    scr.disc(sx, sy, 3, lit(PAL.BLOCK[3], 0.5 + (1 - Math.abs(i) / 6) * 0.5));
    scr.px(sx - 1, sy - 3, 3, 1, mix(PAL.BLOCK[4], PAL.FLAME, 0.35 + w * 0.4));
  }
  // logs, leaning in
  for (const [lx, ly, lw, lh] of [[-9, -2, 9, 3], [4, -2, 9, 3], [-4, -5, 8, 3]]) {
    scr.rect(FIRE_X + lx, base + ly, lw, lh, mix(shade(PAL.WOOD, 0.8), PAL.COAL_HOT, 0.3 + w * 0.4), PAL.VOID);
  }

  // the glow, kept tight: the reach of the light is the scene's job, this is only
  // the bloom at the source
  scr.softDisc(FIRE_X, base - Math.round(h * 0.35), Math.round(8 + w * 11 + flick),
    mix(PAL.COAL_HOT, PAL.EMBER, 0.28 + w * 0.5), Math.round(7 + w * 9));

  for (let i = 0; i < 5; i++) {
    const cx = FIRE_X - 6 + i * 3;
    const hot = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.7 + i));
    scr.px(cx, base, 3, 2, mix(PAL.COAL, PAL.COAL_HOT, still ? 0.5 : hot));
  }

  // ONE FEATURE PER BAND, so the five steps of a day are five different fires
  if (w <= 0.02) return;                                  // banked: coals only
  tongue(scr, FIRE_X, base, h, 5 + w * 7, t, still, 0);
  if (w > 0.3) tongue(scr, FIRE_X + 5, base, h * 0.62, 2 + w * 3, t, still, 2.1);
  if (w > 0.7) tongue(scr, FIRE_X - 6, base, h * 0.48, 2 + w * 2, t, still, 4.3);

  // a full fire throws embers, and they are the one thing that only happens on a
  // day that filled it
  if (!still && w > 0.9) for (let i = 0; i < 3; i++) {
    const p = ((t * 0.5 + i * 0.34) % 1);
    scr.px(FIRE_X - 4 + Math.sin(p * 7 + i * 2) * 9, base - h - p * 22, 1, 1,
      p < 0.6 ? PAL.SPARK : PAL.EMBER);
  }
  // smoke, drifting up past the arch once there is a real fire to make it
  if (!still && w > 0.5) for (let i = 0; i < 3; i++) {
    const p = ((t * 0.3 + i * 0.33) % 1);
    const sy = base - h - 3 - p * 34;
    if (sy < 4) continue;
    scr.px(FIRE_X + Math.sin(p * 4 + i) * 7, sy, 2, 2, mix(PAL.SMOKE, PAL.VOID, p * 0.85));
  }
}

// Ember motes drifting in the air around the camp — the loose orange dots the
// reference scenes are full of. They are the cheapest possible atmosphere: six
// pixels on slow independent paths, and they only exist once the fire does.
function motes(scr, w, t, still) {
  if (still || w < 0.2) return;
  for (let i = 0; i < 6; i++) {
    const p = ((t * 0.11 + i * 0.17) % 1);
    const x = Math.round(FIRE_X - 16 + i * 13 + Math.sin(t * 0.6 + i * 2) * 7);
    const y = Math.round(FLOOR_Y - 6 - p * 54);
    if (lightAt(x, y, w) < 0.06) continue;
    scr.px(x, y, 1, 1, mix(PAL.EMBER, PAL.VOID, p * 0.8));
  }
}

// Grass along the foot of the picture, leaning in a wind that never quite
// stops. The reference has tufts everywhere; here they are what keeps the
// bottom edge from being a flat band of earth.
function grass(scr, w, t, still) {
  for (let i = 0; i < 22; i++) {
    const h = (i * 2654435761) >>> 0;
    const x = 2 + (h % 188), y = FLOOR_Y + 1 + ((h >>> 8) % 24);
    const u = lightAt(x, y, w);
    if (u < 0.05) continue;
    const tall = 3 + (h >>> 4) % 4;
    const lean = still ? 0 : Math.sin(t * 1.3 + i) * 1.4;
    const col = lit(mix(PAL.GRASS, PAL.GRASS_LIT, ((h >>> 12) % 4) / 4), u * 0.8, PAL.EARTH_LIT);
    for (let k = 0; k < tall; k++) {
      scr.px(Math.round(x + lean * (k / tall)), y - k, 1, 1, col);
    }
  }
}

// While it is out, the camp does the work: a small light moving among the trees
// beyond the ruin, which is the only honest way to draw something that is
// elsewhere.
function awayLantern(scr, t, still) {
  const p = still ? 0.5 : (t * 0.05) % 1;
  const lx = 84 + p * 56;
  const ly = 64 + (still ? 0 : Math.sin(t * 2.2) * 1.5);
  scr.softDisc(Math.round(lx), Math.round(ly), 5, mix(PAL.EMBER, PAL.COLD[1], 0.4), 4);
  scr.px(Math.round(lx), Math.round(ly), 2, 2, PAL.FLAME_CORE);
  // and the empty place by the fire, so you can see who is missing
  scr.px(PET_X - 5, FLOOR_Y - 3, 11, 3, mix(PAL.VOID, PAL.WOOD, 0.45));
  scr.px(PET_X - 4, FLOOR_Y - 4, 9, 1, mix(PAL.WOOD, PAL.WOOD_LIT, 0.4));
}

export { lightAt, PET_X, FIRE_X };
