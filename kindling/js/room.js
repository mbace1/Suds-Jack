// Kindling — the bonfire in the ruin, which is the whole reward.
//
// (Owner direction, 2026-08-16: the cozy hut is retired. The world is a layered
// 2D dark-fantasy ruin — forest and broken stone around a bonfire, moonlit and
// cold, with a small friendly monster keeping you company. What did NOT change is
// the thing underneath: there is still no score, and what you get for looking
// after yourself is LIGHT.)
//
// The fire stands as high as the day you have had, and the light it throws is
// what decides how much of the ruin exists. On a day with nothing in it the
// picture is coals, something dozing beside them and a few feet of cold flagstone.
// On a full one the light reaches the ledge, the arches, the gate in the far wall
// and every small thing that has ever been carried home.
//
// TWO RAMPS, ONE SUBTRACTION. Everything is painted from the COLD ramp first and
// then warmed toward the fire by `lightAt` — the environment is moonlit, the fire
// is the only warm thing in it, and mixing cold→warm by distance is what makes a
// small pool of light read as shelter rather than as decoration. Paint the stone
// warm to begin with and the whole picture goes flat.
//
// THREE PLANES, back to front, because that is what "layered 2D" means here:
//   sky + far treeline + broken tower   — cold, untouched by the fire
//   the ruin: wall, arches, gate, ledge — cold stone, warmed where the fire reaches
//   the floor, the fire, the companion  — the warm plane, and the only lit one
//   a cropped column and bracken        — near-black, in front of everything
//
// Cost discipline is unchanged: the whole static scene is one fillRect per 2px
// cell, painted inside `cached()` and keyed on the light BAND (six states, not a
// slider), so it repaints six times across a day rather than sixty times a
// second. Flame, embers, smoke, the companion and the lantern are drawn live.

import { PAL, mix, shade } from './palette.js?v=5';
import { bayer, rampDither } from './pixel.js?v=5';
import { THINGS } from './errand.js?v=5';
import { drawPet } from './pet.js?v=5';

export const FLOOR_Y = 100;
// The bonfire sits left of centre and the companion beside it, so the ruin has
// somewhere to recede TO. Both keep the coordinates idle.js already walks to
// (SPOT.hearth 58 · home 74 · pile 96 · shelf 108 · window 120), because the
// creature's behaviours are about this place and should not need rewriting when
// the place changes its clothes.
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
export const SKY = {
  night: { key: 'night', top: '#070c16', low: '#141e30', trees: '#080d14', stars: 16, moon: true },
  small: { key: 'small', top: '#0a1020', low: '#1b2740', trees: '#080d14', stars: 11, moon: true },
  dawn:  { key: 'dawn',  top: '#141d33', low: '#6b4f52', trees: '#0d0f16', stars: 4,  moon: false },
  day:   { key: 'day',   top: '#3a5570', low: '#8ba3ad', trees: '#18202a', stars: 0,  moon: false },
  dusk:  { key: 'dusk',  top: '#111730', low: '#4a2f44', trees: '#0a0d16', stars: 7,  moon: true },
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

// cold stone warmed by the fire. Every surface in the ruin goes through this, so
// the whole picture agrees about where the heat is coming from.
function lit(cold, u, warm = PAL.EMBER) {
  return mix(cold, warm, Math.min(0.85, u * u * 1.15));
}

export function drawRoom(scr, view) {
  const { warmth = 0, fuel = 0, found = [], away = false, t = 0, still = false } = view;

  const flick = still ? 0 : (Math.sin(t * 11.3) * 0.5 + Math.sin(t * 7.1) * 0.5);

  // THE FIVE BANDS. A day holds five small things, so the ruin has six states:
  // coals, and one for each thing kept. The static light snaps to the band while
  // the FIRE eases continuously through it — the flame visibly climbs as you tick
  // something off, and then the world arrives at a new state rather than drifting
  // through a hundred indistinguishable ones.
  const band = Math.max(0, Math.min(5, Math.round(warmth * 5)));
  const q = band / 5;
  scr.cached(`${band}|${Math.min(9, fuel)}|${found.length}|${away ? 1 : 0}|${view.sky?.key ?? ''}`, () => {
    staticRuin(scr, q, fuel, found, view.sky ?? SKY.night);
  });

  // `flame` is the live height — breathing drives it continuously, and it must
  // not touch the cache key, so it is a separate field from the day's warmth
  bonfire(scr, view.flame == null ? warmth : view.flame, flick, still, t);
  if (away) lantern(scr, t, still);
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
function staticRuin(scr, w, fuel, found, sky) {
  scr.clear(PAL.VOID);
  skyPlane(scr, sky);
  farPlane(scr, sky);
  ruinPlane(scr, w, found);
  gate(scr, w);
  groundPlane(scr, w);
  branchPile(scr, w, fuel);
  foreground(scr, w);
}

// ── plane 1: the sky, which the fire never touches ──
function skyPlane(scr, sky) {
  const H = 66;
  for (let y = 0; y < H; y++) {
    scr.px(0, y, scr.w, 1, mix(sky.top, sky.low, (y / H) ** 1.6));
  }
  for (let i = 0; i < sky.stars; i++) {
    const h = (i * 2654435761 + sky.seed * 40503) >>> 0;
    scr.px(3 + (h % (scr.w - 6)), 2 + ((h >>> 8) % (H - 22)), 1, 1,
      (h >>> 16) % 5 === 0 ? PAL.MOON : PAL.STAR);
  }
  // The moon, high and to the right — the one cold light, opposite the fire, so
  // the two of them split the picture between them.
  if (sky.moon) {
    scr.disc(150, 18, 7, mix(PAL.MOON, sky.low, 0.15));
    scr.disc(147, 15, 2, shade(PAL.MOON, 0.86));      // a crater, so it is a body
    scr.softDisc(150, 18, 15, mix(sky.low, PAL.MOON, 0.22), 12);
  }
}

// ── plane 2: what is far away, and cold ──
function farPlane(scr, sky) {
  // a broken tower on the horizon: the ruin goes on past this room
  const tx = 26;
  scr.px(tx, 30, 13, 36, mix(sky.trees, PAL.COLD[2], 0.5));
  scr.px(tx + 2, 26, 9, 4, mix(sky.trees, PAL.COLD[2], 0.4));
  scr.px(tx + 3, 34, 3, 5, sky.trees);                // a window with nothing lit
  for (let i = 0; i < 5; i++) scr.px(tx + i * 3, 26 - (i % 2) * 2, 2, 2, mix(sky.trees, PAL.COLD[1], 0.6));

  // the treeline: two rows, the far one lighter, because depth at this size is
  // made of value steps and nothing else
  for (let x = 0; x < scr.w; x++) {
    const far = 52 + Math.sin(x * 0.19) * 5 + Math.sin(x * 0.061) * 6;
    scr.px(x, far, 1, 66 - far, mix(sky.trees, PAL.COLD[2], 0.35));
  }
  for (let x = 0; x < scr.w; x++) {
    const near = 58 + Math.abs(Math.sin(x * 0.13 + 1.2)) * 7 + Math.sin(x * 0.41) * 2;
    scr.px(x, near, 1, 68 - near, PAL.TREE_NEAR);
    if (x % 11 === 0) scr.px(x, near - 4, 1, 4, PAL.TREE_NEAR);   // a spire
  }
}

// ── plane 3: the ruin itself — cold stone, warmed where the fire reaches ──
//
// The wall is in SECTIONS with a collapse between them, and that is the whole
// difference between a ruin and a fence. The first pass ran one continuous wall
// from edge to edge and read as "a wall with things on it": nothing had fallen
// down, so nothing was ruined. Now the forest comes through the gap at ground
// level, a single arch stands free in it with the sky behind, and the fire has
// somewhere to throw light INTO.
const WALL = [[0, 74], [96, 66]];        // [x, top] — left section, right section
const WALL_ENDS = [66, 152];             // where each section stops
const GAP = [66, 96];                    // the collapse

function ruinPlane(scr, w, found) {
  WALL.forEach(([x0, top], i) => {
    const x1 = WALL_ENDS[i];
    for (let y = top; y < FLOOR_Y; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const u = lightAt(x, y, w);
        const cold = rampDither(PAL.COLD, 0.1 + (y - top) / 150, x >> 1, y >> 1);
        scr.px(x, y, 2, 2, lit(cold, u * 0.5));
      }
    }
    // No courses, no mortar, no moss. The third pass took all of it out: the
    // direction asks for large shapes and readable silhouettes over detail
    // noise, and every line I cut into this wall was one more thing competing
    // with the fire. What is left is the mass, its broken top, and a lit lower
    // edge where the firelight actually lands.
    for (let x = x0; x < x1; x += 2) {
      const u = lightAt(x, FLOOR_Y - 3, w);
      if (u < 0.12) continue;
      scr.px(x, FLOOR_Y - 4, 2, 3, lit(PAL.COLD[2], u * 1.25));
    }
    // a broken top edge — a wall that stops in a straight line is a fence — and
    // the ends crumble toward the collapse
    for (let x = x0; x < x1; x += 2) {
      const toEnd = Math.min(x - x0, x1 - x) / 18;
      const bite = Math.round(2 + Math.abs(Math.sin(x * 0.21)) * 5
        + Math.max(0, 1 - toEnd) * 14);
      for (let y = top; y < top + bite; y += 2) scr.px(x, y, 2, 2, PAL.VOID);
    }
  });

  // THE FREE-STANDING ARCH, in the gap, with the night through it. In the first
  // pass the arches were cut into the wall behind the ledge, so the objects on
  // the ledge read as things in a cupboard.
  archAlone(scr, (GAP[0] + GAP[1]) / 2 - 10, 40, 20, FLOOR_Y - 40, w);

  banner(scr, 138, WALL[1][1] + 6, w);
  ledge(scr, w, found);

}

// An arch standing on its own in the collapse: two legs, a curved head, and
// nothing either side of it. It is drawn as STONE with the night left showing
// between the legs, which is the opposite of the hole-in-a-wall version.
function archAlone(scr, x, y, w2, h2, w) {
  const r = Math.floor(w2 / 2), openTop = y + r;
  for (let iy = y; iy < y + h2; iy++) {
    let half = r;
    if (iy < openTop) {
      const dy = openTop - iy;
      half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      if (half <= 0) continue;
    }
    // The opening is NOT painted: whatever is behind the arch — sky, treeline,
    // the far tower — shows straight through it, which is the only thing that
    // makes it read as an arch rather than as a postbox with a dark door.
    for (const side of [-1, 1]) {
      const px = x + r + side * half;
      const u = lightAt(px, iy, w);
      scr.px(px - (side < 0 ? 2 : 0), iy, 2, 1, lit(shade(PAL.STONE_COLD, 0.62), u * 0.7));
      scr.px(px - (side < 0 ? 0 : 1), iy, 1, 1, lit(PAL.STONE_COLD, u * 1.1));
    }
  }
  // it has lost a stone or two near the top
  scr.px(x + r + 4, y + 2, 4, 3, PAL.VOID);
}

// (kept for reference: an opening cut INTO a wall, which is what the first pass
// used and what made the ledge read as a cupboard)
function archInWall(scr, x, y, w2, h2, w) {
  const r = Math.floor(w2 / 2);
  const openTop = y + r;
  // the void of the opening, arched at the top
  for (let iy = y; iy < y + h2; iy++) {
    let half = r;
    if (iy < openTop) {
      const dy = openTop - iy;
      half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    }
    if (half <= 0) continue;
    scr.px(x + r - half, iy, half * 2, 1, mix(PAL.COLD[0], PAL.NIGHT, 0.5));
  }
  // and the stones of the arch, which catch the fire on their inner faces
  for (let iy = y - 1; iy < y + h2; iy++) {
    let half = r;
    if (iy < openTop) {
      const dy = openTop - iy;
      half = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
      if (half <= 0) continue;
    }
    for (const side of [-1, 1]) {
      const px = x + r + side * half;
      const u = lightAt(px, iy, w);
      scr.px(px - (side < 0 ? 2 : 0), iy, 2, 1, lit(PAL.STONE_COLD, u * 1.1));
    }
  }
}

// A banner that has been hanging too long: the one colour in the world that is
// neither fire nor moon, and it is deliberately dim so it never competes.
function banner(scr, x, y, w) {
  const u = lightAt(x + 4, y + 12, w);
  const cloth = lit(shade(PAL.BANNER_DIM, 0.7), u * 0.6, PAL.BANNER);
  scr.px(x - 1, y, 11, 2, lit(PAL.STONE_COLD, u));      // the rail
  for (let iy = 0; iy < 22; iy++) {
    const wob = Math.round(Math.sin(iy * 0.4) * 0.8);
    const tear = iy > 15 ? (iy - 15) : 0;               // it is torn at the bottom
    scr.px(x + wob, y + 2 + iy, 6 - tear, 1, iy % 5 === 4 ? shade(cloth, 0.8) : cloth);
  }
}

// The ledge, and everything ever carried home. An object is only drawn where the
// light actually reaches it — that is still the trick of this screen: the ledge
// fills up permanently, and a bad day simply cannot see the far end of it.
function ledge(scr, w, found) {
  const BOARDS = [72, 88];
  const x0 = 96, x1 = 150;
  BOARDS.forEach((y, board) => {
    for (let x = x0; x < x1; x += 2) {
      const u = lightAt(x, y, w);
      if (u <= 0.05) continue;
      scr.px(x, y, 2, 3, lit(PAL.STONE_COLD, u * 1.15));
      scr.px(x, y + 3, 2, 1, PAL.VOID);
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
  const x = 158, y = 66, dw = 26, dh = FLOOR_Y - y;
  const u = lightAt(x + dw / 2, y + dh * 0.6, w);
  if (u <= 0.04) return;
  // The gate has to be SEEN on a full fire, or "a good day shows you the way out"
  // is a claim the picture never keeps — the first pass lit it so faintly that the
  // gate area held eight warm pixels and the promise was invisible. Rusted iron
  // takes firelight well, so it is mixed warm hard at the top of the range.
  const iron = lit('#3a2f26', Math.min(1, u * 2.4), PAL.EMBER);
  scr.rect(x - 3, y - 2, dw + 6, dh + 2, lit(PAL.STONE_COLD, u * 1.6), PAL.VOID);
  scr.rect(x, y, dw, dh, mix(PAL.COLD[0], PAL.NIGHT, 0.4));
  // bars, and a hoop to pull it by
  for (let i = 0; i < 5; i++) scr.px(x + 2 + i * 5, y + 2, 2, dh - 2, iron);
  for (const iy of [y + 8, y + dh - 10]) scr.px(x + 2, iy, dw - 4, 2, iron);
  // the near edge of every bar catches the fire, which is what makes it iron
  for (let i = 0; i < 5; i++) scr.px(x + 2 + i * 5, y + 2, 1, dh - 2, lit(PAL.RUST, Math.min(1, u * 2.8), PAL.FLAME));
  scr.px(x + dw - 7, y + 16, 4, 2, lit(PAL.RUST, Math.min(1, u * 3), PAL.SPARK));
}

// ── the warm plane: flagstones the fire actually lights ──
function groundPlane(scr, w) {
  for (let y = FLOOR_Y; y < scr.h; y += 2) {
    for (let x = 0; x < scr.w; x += 2) {
      const u = lightAt(x, y, w);
      const cold = rampDither(PAL.COLD, 0.18 + (y - FLOOR_Y) / 60, x >> 1, y >> 1);
      scr.px(x, y, 2, 2, lit(cold, u * 1.15, PAL.WOOD_LIT));
    }
  }
  // where wall meets floor — and ONLY there. A hard line all the way across read
  // as the lip of a stage, and it is the collapse that has to look walkable.
  WALL.forEach(([x0], i) => scr.px(x0, FLOOR_Y - 1, WALL_ENDS[i] - x0, 1, PAL.VOID));
}

// the unspent kindling, as a stack of cut branches beside the fire
function branchPile(scr, w, fuel) {
  const n = Math.min(9, fuel);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const x = 94 + col * 7 + (row % 2 ? 2 : 0);
    const y = FLOOR_Y - 4 - row * 4;
    const u = Math.min(1, lightAt(x, y, w) * 1.3);
    if (u <= 0.05) continue;
    scr.rect(x, y, 7, 4, lit(shade(PAL.WOOD, 0.7), u, PAL.WOOD_LIT), PAL.VOID);
    scr.px(x + 1, y + 1, 2, 1, lit(PAL.WOOD, u * 0.8, PAL.BONE));
  }
}

// ── the front plane: near-black, cropped by the frame ──
// This is what makes it layered rather than flat. Both pieces are cut off by the
// edge of the picture on purpose: a foreground that fits inside the frame is just
// a small object standing in the middle distance.
function foreground(scr, w) {
  // A fallen column across the bottom-left corner, drawn as a CYLINDER: a body,
  // a broken end you can see the circle of, and one lit edge along the top. The
  // first pass was a 46px strip of dark with a bright line on it, which reads as
  // a band across the picture rather than as a thing lying in front of you.
  const cy = 120, cr = 7;
  for (let x = 0; x < 52; x++) {
    const lean = Math.round(Math.sin(x * 0.05) * 1.5);
    scr.px(x, cy - cr + lean, 1, cr * 2, '#05070b');
    scr.px(x, cy - cr + lean, 1, 1, lit('#1b2432', lightAt(x, cy - cr, w) * 0.9));
  }
  // the broken end, and the drum that came off it
  scr.disc(52, cy, cr, '#0b111a');
  scr.disc(52, cy, cr - 3, lit('#20293a', lightAt(52, cy, w)));
  // bracken at the bottom-right, in silhouette
  for (let i = 0; i < 9; i++) {
    const bx = 150 + i * 5, h = 8 + (i % 3) * 5;
    for (let k = 0; k < h; k++) {
      scr.px(bx + Math.round(Math.sin(k * 0.5 + i) * 2), scr.h - k, 2, 1, '#05070b');
    }
  }
  // and the dark closing in at the very corners
  for (let y = 0; y < scr.h; y += 2) {
    for (let x = 0; x < scr.w; x += 2) {
      const dx = Math.max(0, Math.abs(x - 96) - 76) / 20;
      const dy = Math.max(0, Math.abs(y - 62) - 52) / 14;
      const v = Math.min(1, Math.hypot(dx, dy));
      if (v > 0.1 && bayer(x >> 1, y >> 1) < v * 0.85) scr.px(x, y, 2, 2, PAL.VOID);
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
  // whole scheme in one object
  for (let i = -5; i <= 5; i++) {
    const sx = FIRE_X + i * 4, sy = base + 2 + Math.abs(i) % 2;
    scr.disc(sx, sy, 3, lit(PAL.STONE_COLD, 0.5 + (1 - Math.abs(i) / 6) * 0.5));
    scr.px(sx - 1, sy - 3, 3, 1, mix(PAL.STONE_COLD, PAL.FLAME, 0.35 + w * 0.4));
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
  // smoke, drifting up past the wall once there is a real fire to make it
  if (!still && w > 0.5) for (let i = 0; i < 3; i++) {
    const p = ((t * 0.3 + i * 0.33) % 1);
    const sy = base - h - 3 - p * 34;
    if (sy < 4) continue;
    scr.px(FIRE_X + Math.sin(p * 4 + i) * 7, sy, 2, 2, mix(PAL.SMOKE, PAL.VOID, p * 0.85));
  }
}

// While it is out, the ruin does the work: a small light moving among the trees
// beyond the arches, which is the only honest way to draw something that is
// elsewhere.
function lantern(scr, t, still) {
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
