// Kindling — the room, which is the whole reward.
//
// There is no score here and no win. What you get for looking after yourself is
// LIGHT: the fire stands as high as the day you have had, and the light it
// throws is what decides how much of the room exists. On a day with nothing in
// it the picture is coals, a creature dozing and about forty pixels of floor. On
// a full one the light reaches the shelf, the window, the far corner, and every
// small thing the creature has ever carried home is visible at once.
//
// That is why the light is a measured ramp rather than a mood: the distance the
// ember steps travel across the floor IS the day's tally, drawn. Nothing has to
// be labelled.
//
// Cost discipline (the same one gameoflife's dithered scenes needed): the room
// is one fillRect per 2px cell, so all of it is painted into `cached()` and
// keyed on the handful of things that actually change it — the light level
// quantised to sixteen steps, the woodpile, the shelf, whether the creature is
// out. Everything that moves — flame, sparks, smoke, the creature, the lantern
// in the window — is drawn live, on top, every frame.

import { PAL, mix, shade } from './palette.js?v=2';
import { bayer, rampDither } from './pixel.js?v=2';
import { THINGS } from './errand.js?v=2';
import { drawPet } from './pet.js?v=2';

export const FLOOR_Y = 100;
const FIRE_X = 38, FIRE_Y = 96;          // the light comes from here, always
// It sits close to the hearth ON PURPOSE. An earlier pass had it out at x=116,
// where a dark day left it outside its own light: a green shape floating in
// black with no floor under it. Everything that grows must grow INSIDE the pool
// of light that is always there, and what the day buys is the room behind it.
const PET_X = 74;

// how far the light reaches, in pixels, from coals to a full fire. The floor of
// 46 is what keeps the creature and its patch of floor readable on a day with
// nothing in it at all.
const REACH = w => 46 + w * 124;

// ── what is outside ──────────────────────────────────────────────────
// The window is the only cold thing in the picture and the only thing that
// changes on its own. It is read off the LOCAL CLOCK and nothing else: no
// forecast is fetched, nothing is claimed about the real weather where you are,
// and none of it touches what anything is worth. It is a picture of an evening.
export const SKY = {
  night: { key: 'night', top: '#0c1322', low: '#16233a', trees: '#080506', stars: 14 },
  small: { key: 'small', top: '#101a2e', low: '#2a3550', trees: '#080506', stars: 9 },
  dawn:  { key: 'dawn',  top: '#1b2540', low: '#7a5a54', trees: '#0d0a0c', stars: 4 },
  day:   { key: 'day',   top: '#3f5a72', low: '#8fa6ac', trees: '#1a2018', stars: 0 },
  dusk:  { key: 'dusk',  top: '#161c33', low: '#5c3b46', trees: '#0a0709', stars: 6 },
};

// the hour decides the tone; the DATE decides the stars, so tonight's sky is
// not last night's and is still the same sky all evening
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

export function drawRoom(scr, view) {
  const { warmth = 0, fuel = 0, found = [], away = false, t = 0, still = false } = view;

  // the flame's own flicker, which must NOT reach the cache key or the whole
  // room repaints sixty times a second
  const flick = still ? 0 : (Math.sin(t * 11.3) * 0.5 + Math.sin(t * 7.1) * 0.5);

  // THE FIVE BANDS. A day holds five small things, so the room has six states:
  // coals, and one for each thing kept. The static light snaps to the band while
  // the FIRE eases continuously through it, which is the whole trick — the flame
  // visibly climbs as you tick something off, and then the room arrives at a new
  // state rather than drifting through a hundred indistinguishable ones. It also
  // halves the repaints: six keys instead of twelve.
  const band = Math.max(0, Math.min(5, Math.round(warmth * 5)));
  const q = band / 5;
  scr.cached(`${band}|${Math.min(9, fuel)}|${found.length}|${away ? 1 : 0}|${view.sky?.key ?? ''}`, () => {
    staticRoom(scr, q, fuel, found, view.sky);
  });

  // `flame` is the live height — the breathing exercise drives it continuously,
  // and it must not touch the cache key, so it is a separate field from the
  // day's own warmth
  fire(scr, view.flame == null ? warmth : view.flame, flick, still, t);
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
function staticRoom(scr, w, fuel, found, sky) {
  scr.clear(PAL.VOID);

  // wall and floor, lit by distance. Two ramps, one light: the seam between
  // them is the only straight line in the picture that is allowed to be hard.
  for (let y = 0; y < scr.h; y += 2) {
    for (let x = 0; x < scr.w; x += 2) {
      const u = lightAt(x, y, w);
      if (u <= 0) continue;
      const ramp = y >= FLOOR_Y ? PAL.FLOOR : PAL.ROOM;
      // squared falloff reads as a real light; linear reads as a spotlight
      scr.px(x, y, 2, 2, rampDither(ramp, u * u * 1.35, x >> 1, y >> 1));
    }
  }
  // the floor line, and the skirting that tells you it is a room and not a void
  for (let x = 0; x < scr.w; x += 2) {
    const u = lightAt(x, FLOOR_Y, w);
    if (u <= 0.04) continue;
    scr.px(x, FLOOR_Y - 1, 2, 1, mix(PAL.INK, PAL.WOOD_LIT, Math.min(1, u * 1.2)));
  }

  // The dark pressing in on the corners — and it happens HERE, before anything
  // is furnished, because a vignette laid over the top punches dotted holes in
  // whatever it crosses. It ate half the window frame on the first pass and read
  // as a dashed orange border. The corners of a room are empty; that is all this
  // needs to darken.
  for (let y = 0; y < scr.h; y += 2) {
    for (let x = 0; x < scr.w; x += 2) {
      const dx = Math.max(0, Math.abs(x - 94) - 68) / 28;
      const dy = Math.max(0, Math.abs(y - 62) - 44) / 22;
      const v = Math.min(1, Math.hypot(dx, dy));
      if (v > 0.08 && bayer(x >> 1, y >> 1) < v * 0.9) scr.px(x, y, 2, 2, PAL.VOID);
    }
  }

  hearth(scr, w);
  woodpile(scr, w, fuel);
  shelf(scr, w, found);
  door(scr, w);
  window_(scr, w, sky);
}

function hearth(scr, w) {
  const lit = u => Math.min(1, lightAt(28, 74, w) * u);
  // the stone is TINTED toward the fire before it is lit by it. Left at its own
  // cool grey it was the only cold mass on the warm side of the room, and forty
  // pixels of it read as poured concrete.
  const stone = mix(PAL.INK, mix(PAL.STONE, PAL.EMBER, 0.45), 0.2 + lit(1.05) * 0.6);
  const mortar = shade(stone, 0.5);

  // Masonry, drawn as one mass with mortar lines cut into it. Filling block by
  // block in two alternating shades looked like a chequerboard, which is the
  // difference between stonework and gingham.
  scr.rect(14, 56, 48, FLOOR_Y - 56, stone, mortar);
  for (let y = 63; y < FLOOR_Y; y += 7) scr.px(14, y, 48, 1, mortar);
  for (let y = 56; y < FLOOR_Y; y += 7) {
    // staggered courses: one vertical joint per course, offset every other one
    const off = ((y / 7) | 0) % 2 ? 6 : 0;
    for (let x = 14 + off; x < 62; x += 12) scr.px(x, y, 1, 7, mortar);
  }
  // one or two blocks catch more light than their neighbours — the only thing
  // that stops flat fill reading as wallpaper
  for (const [bx, by] of [[16, 70], [50, 63], [16, 84], [54, 91]]) {
    scr.px(bx, by + 1, 10, 5, shade(stone, 1.09));
  }

  // the mouth: black, and deeper than the wall behind it
  scr.rect(20, 66, 36, FLOOR_Y - 66, PAL.VOID);
  scr.px(20, 66, 36, 1, PAL.INK);
  scr.px(20, 67, 1, FLOOR_Y - 67, shade(stone, 0.7));
  scr.px(55, 67, 1, FLOOR_Y - 67, shade(stone, 0.7));

  // the mantel: a beam, and unmistakably wood. It was the brightest thing in the
  // picture when it was stone-coloured, and it read as a concrete lintel.
  scr.rect(11, 50, 54, 6, mix(PAL.WOOD, PAL.WOOD_LIT, 0.3 + lit(1.3) * 0.7), PAL.INK);
  scr.px(13, 52, 50, 1, mix(PAL.WOOD, PAL.BONE, lit(0.8) * 0.35));   // the grain
}

// The unspent kindling, as a stack of sticks on the floor to the right of the
// creature. It is the currency an errand spends, and it is drawn rather than
// only printed because a number in a HUD is a number and a pile beside the fire
// is a promise.
function woodpile(scr, w, fuel) {
  const n = Math.min(9, fuel);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3), col = i % 3;
    const x = 94 + col * 7 + (row % 2 ? 2 : 0);
    const y = FLOOR_Y - 4 - row * 4;
    const u = Math.min(1, lightAt(x, y, w) * 1.3);
    if (u <= 0.05) continue;
    scr.rect(x, y, 7, 4, mix(PAL.INK, PAL.WOOD_LIT, 0.18 + u * 0.82), PAL.INK);
    scr.px(x + 1, y + 1, 2, 1, mix(PAL.WOOD, PAL.BONE, u * 0.55));
  }
}

// The shelf, and everything ever carried home. An object is only drawn where the
// light actually reaches it — which is the whole trick of this screen: the shelf
// fills up permanently, and a bad day simply cannot see the far end of it.
function shelf(scr, w, found) {
  const BOARDS = [58, 76];                 // six things to a board, twelve in all
  const x0 = 88, x1 = 150;
  BOARDS.forEach((y, board) => {
    for (let x = x0; x < x1; x += 2) {
      const u = lightAt(x, y, w);
      if (u <= 0.05) continue;
      scr.px(x, y, 2, 3, mix(PAL.INK, PAL.WOOD_LIT, Math.min(1, u * 1.25)));
      scr.px(x, y + 3, 2, 1, PAL.INK);
    }
    // twelve fit on the two boards, so what is shown is the twelve most recent.
    // The rest are not lost — the journal has every one of them, dated.
    found.slice(-12).forEach((id, i) => {
      if (Math.floor(i / 6) !== board) return;
      const thing = THINGS[id];
      if (!thing) return;
      const x = x0 + 3 + (i % 6) * 10;
      const u = lightAt(x, y, w);
      if (u <= 0.12) return;                             // out there in the dark
      thing.draw(scr, x, y - 1);
      // the dimmer the light, the further it sinks back toward the wall
      if (u < 0.42) for (let dy = -6; dy <= 1; dy++) {
        for (let dx = 0; dx < 6; dx++) {
          if (bayer(x + dx, y + dy) > u * 2.3) scr.px(x + dx, y + dy, 1, 1, PAL.VOID);
        }
      }
    });
  });
}

// The door, on the far wall — and it takes a FULL fire to see it, which is the
// one piece of composition in this room that is also a design statement: the
// thing a good day reveals is the way out of the room. Nothing in the app asks
// you to use it and it does not open. It is simply there on the days it is there.
function door(scr, w) {
  const x = 156, y = 52, dw = 28, dh = FLOOR_Y - y;
  const u = lightAt(x + dw / 2, y + dh * 0.6, w);
  if (u <= 0.04) return;
  const wood = mix(PAL.INK, PAL.WOOD_LIT, Math.min(1, 0.15 + u * 1.5));
  scr.rect(x - 2, y - 2, dw + 4, dh + 2, mix(PAL.INK, PAL.WOOD, Math.min(1, u * 1.6)), PAL.INK);
  scr.rect(x, y, dw, dh, wood, PAL.INK);
  // two panels, cut in with the same ink line the rest of the room is drawn with
  scr.rect(x + 4, y + 5, dw - 8, 16, shade(wood, 0.86), shade(wood, 0.6));
  scr.rect(x + 4, y + 25, dw - 8, dh - 32, shade(wood, 0.86), shade(wood, 0.6));
  // the handle, the brightest small thing on that side of the room
  scr.px(x + 3, y + 22, 2, 2, mix(PAL.RUST, PAL.SPARK, Math.min(1, u * 2)));
}

// The window: the only cold thing in the picture, and the reason the room reads
// as warm at all. Its frame is LIGHTER than the night behind it — a framing
// device darker than what it frames is just an outline floating in the void.
function window_(scr, w, sky = SKY.night) {
  const x = 118, y = 12, ww = 42, wh = 34;
  const u = Math.min(1, lightAt(x + ww / 2, y + wh / 2, w) * 1.2);
  const frame = mix(PAL.WOOD, PAL.WOOD_LIT, 0.35 + u * 0.65);

  // the frame first, as one lit mass, then the night cut into it
  scr.rect(x - 2, y - 2, ww + 4, wh + 4, frame, PAL.INK);
  scr.rect(x, y, ww, wh, sky.top);
  // sky: a cold ramp, darkest at the top
  for (let iy = 1; iy < wh - 1; iy++) {
    const k = iy / wh;
    scr.px(x + 1, y + iy, ww - 2, 1, mix(sky.top, sky.low, k * k));
  }
  // The stars, laid out from the day's own seed — so tonight's sky is not last
  // night's sky, and it is still the SAME sky all evening rather than swimming
  // between repaints. Nothing about it is fetched and nothing about it claims to
  // be the real weather; it is a picture of a night, generated on your machine.
  for (let i = 0; i < sky.stars; i++) {
    const h = (i * 2654435761 + sky.seed * 40503) >>> 0;
    const sx = x + 3 + (h % (ww - 6));
    const sy = y + 3 + ((h >>> 8) % (wh - 12));
    scr.px(sx, sy, 1, 1, (h >>> 16) % 4 === 0 ? PAL.MOON : PAL.STAR);
  }
  // the treeline, black against the sky
  for (let tx = x + 1; tx < x + ww - 1; tx++) {
    const h = 4 + Math.abs(Math.sin(tx * 0.7)) * 5;
    scr.px(tx, y + wh - 1 - h, 1, h, sky.trees);
  }
  // the glazing bars, over the glass
  scr.px(x + ww / 2 - 1, y, 2, wh, frame);
  scr.px(x, y + wh / 2 - 1, ww, 2, frame);
  // the reflection of the room in the glass, which is what makes it glass
  scr.px(x + 2, y + wh - 8, 6, 1, mix(PAL.NIGHT_LOW, PAL.EMBER, 0.35 * u));
  scr.px(x + 3, y + wh - 7, 4, 1, mix(PAL.NIGHT_LOW, PAL.EMBER, 0.22 * u));
}

// ── the part that moves ──────────────────────────────────────────────
// One tongue of flame: a stack of 1px bars, one colour change per row, the way
// a 2600 builds a sky. Two of these at different heights is what stops the fire
// reading as a lamp cone — a single tapered stack is a shape, and fire is not a
// shape, it is several arguing.
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

function fire(scr, w, flick, still, t) {
  const base = FLOOR_Y - 2;
  const h = 3 + w * 19 + flick * (0.8 + w * 2);

  // The glow, kept TIGHT. It was a 40px disc, which double-counted the room's
  // own falloff and read as a spotlight painted on the wall; the reach of the
  // light is the wall ramp's job, and this is only the bloom at the source.
  scr.softDisc(FIRE_X, base - Math.round(h * 0.35), Math.round(8 + w * 12 + flick),
    mix(PAL.COAL_HOT, PAL.EMBER, 0.28 + w * 0.5), Math.round(6 + w * 8));

  // coals: always there, always the hottest thing at the bottom
  for (let i = 0; i < 5; i++) {
    const cx = FIRE_X - 6 + i * 3;
    const hot = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.7 + i));
    scr.px(cx, base, 3, 2, mix(PAL.COAL, PAL.COAL_HOT, still ? 0.5 : hot));
  }

  // ONE FEATURE PER BAND, so the five steps of a day are five different fires
  // rather than one slider: a lick, a second tongue, smoke, a third tongue, and
  // at a full fire the embers lifting off it. The heights in between still ease,
  // so ticking something off is a climb that arrives somewhere.
  if (w <= 0.02) return;                                    // banked: coals only

  tongue(scr, FIRE_X, base, h, 4 + w * 6, t, still, 0);
  if (w > 0.3) tongue(scr, FIRE_X + 4, base, h * 0.62, 2 + w * 3, t, still, 2.1);
  if (w > 0.7) tongue(scr, FIRE_X - 5, base, h * 0.48, 2 + w * 2, t, still, 4.3);

  // at a full fire it throws embers, which is the one thing that only ever
  // happens on a day that filled the hearth
  if (!still && w > 0.9) for (let i = 0; i < 2; i++) {
    const p = ((t * 0.6 + i * 0.5) % 1);
    scr.px(FIRE_X - 3 + Math.sin(p * 7 + i * 2) * 6, base - h - p * 12, 1, 1,
      p < 0.6 ? PAL.SPARK : PAL.EMBER);
  }

  // Smoke, only once there is a real fire to make it — and it goes UP THE FLUE.
  // Drawn without the clip it rose past the mantel and drifted across the wall,
  // which is a chimney nobody would live with.
  if (!still && w > 0.5) for (let i = 0; i < 3; i++) {
    const p = ((t * 0.35 + i * 0.33) % 1);
    const sy = base - h - 2 - p * 26;
    if (sy < 69) continue;
    scr.px(FIRE_X + Math.sin(p * 5 + i) * 5, sy, 2, 2,
      mix(PAL.SMOKE, PAL.VOID, p * 0.9));
  }
}

// While it is out, the window does the work: a small light crossing the dark,
// which is the only honest way to show something that is elsewhere.
function lantern(scr, t, still) {
  const x = 118, y = 12, ww = 42, wh = 34;
  const p = still ? 0.5 : (t * 0.06) % 1;
  const lx = x + 2 + p * (ww - 6);
  const ly = y + wh - 12 + (still ? 0 : Math.sin(t * 2.2) * 1.5);
  scr.softDisc(Math.round(lx), Math.round(ly), 5, mix(PAL.EMBER, PAL.NIGHT_LOW, 0.35), 4);
  scr.px(Math.round(lx), Math.round(ly), 2, 2, PAL.FLAME_CORE);
  // and the empty place by the fire, so you can see who is missing
  scr.px(PET_X - 5, FLOOR_Y - 3, 11, 3, mix(PAL.INK, PAL.WOOD, 0.5));
  scr.px(PET_X - 4, FLOOR_Y - 4, 9, 1, mix(PAL.WOOD, PAL.WOOD_LIT, 0.5));
}

export { lightAt, PET_X, FIRE_X };
