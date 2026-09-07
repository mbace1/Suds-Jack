// What is behind him, and how it stops being a jungle.
//
// Another World's backgrounds are flat polygons — a horizon is four points, a
// tree is a trunk quad and six frond fans, and the whole read comes from big
// simple masses at three depths with nothing textured anywhere. So that is what
// this draws. What it does NOT do is cross-fade between biomes: a 16-colour
// screen cannot dissolve, and the original never tried. The blend happens in
// two places instead —
//
//   the palette walks continuously (palette.js), so the greens drain out of the
//   rock over four screens whether or not the shapes change; and
//
//   the LAYERS overlap. Every element type has a window of t it exists in, and
//   the windows are wide. Fronds are still hanging in the first tomb. The first
//   columns are already standing in the last jungle. You cross over somewhere
//   in the middle without ever being shown a door.

import { C } from './palette.js';
import { RW, RH, TILE, ROOM_W as W, ROOM_H as H } from './rooms.js';

const rand = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const clamp = v => Math.max(0, Math.min(1, v));
// how present a layer is at this point on the journey: up over `inW`, along for
// a while, then away over `outW`. Overlapping these is the whole trick.
const win = (t, a, b, inW = 0.7, outW = 0.9) => clamp((t - a) / inW) * clamp((b - t) / outW);

export function weights(t) {
  return {
    jungle: clamp((1.6 - t) / 1.0),
    ruin: win(t, 0.7, 3.8, 0.8, 1.0),
    glyph: win(t, 1.7, 3.9, 0.7, 0.8),
    machine: win(t, 2.7, 4.5, 0.6, 0.9),
    palace: clamp((t - 3.3) / 0.9),
    vine: clamp((t - 4.3) / 0.7),
  };
}

// ── the static backdrop, painted once a room ───────────────────────
export function paintBack(scr, room, index) {
  const t = room.t, w = weights(t), r = rand(index * 2654435 + 17);

  // Sky as flat bands with hard seams. A 2600 changed colour once a scanline
  // and an Amiga could have done better; Another World mostly did not, because
  // banded skies read as painted rather than as rendered.
  const bands = 7;
  for (let i = 0; i < bands; i++) {
    const y = Math.round(i * (H * 0.62) / bands);
    const y2 = Math.round((i + 1) * (H * 0.62) / bands);
    scr.rect(0, y, W, y2 - y, i < 2 ? C.SKY_HI : i < 5 ? C.SKY_LO : C.FAR);
  }
  scr.rect(0, Math.round(H * 0.62), W, H, C.FAR);

  // two suns, low and close together, on the jungle side of the journey
  if (w.jungle > 0.15) {
    scr.disc(232, 34, 13 * w.jungle + 3, C.SKY_LO);
    scr.disc(232, 34, 9 * w.jungle + 2, C.LUX2);
    scr.disc(262, 46, 5 * w.jungle + 2, C.LUX2);
  }
  if (w.palace > 0.3) {                                  // one moon instead
    scr.disc(64, 30, 11, C.LUX);
    scr.disc(60, 27, 9, C.SKY_HI);
  }

  // FAR — the shape of the land, one silhouette
  const horizon = 108;
  if (w.jungle > 0.05 || w.ruin > 0.05) {
    const pts = [0, H];
    for (let x = 0; x <= W; x += 20) {
      const j = Math.sin(x * 0.031 + index) * 16 + Math.sin(x * 0.077) * 7;
      pts.push(x, horizon - 14 + j * (0.4 + w.jungle * 0.8));
    }
    pts.push(W, H);
    scr.poly(pts, C.MID);
  }
  if (w.palace > 0.25) {                                 // a city of towers
    for (let i = 0; i < 7; i++) {
      const x = ((i * 53 + index * 29) % (W + 60)) - 30;
      const hh = 26 + r() * 40, ww = 12 + r() * 12;
      scr.rect(x, horizon - hh, ww, hh + 20, C.MID);
      scr.poly([x - 2, horizon - hh, x + ww + 2, horizon - hh, x + ww / 2, horizon - hh - 12], C.MID);
    }
  }

  // MID — the middle distance: trunks, columns, machine, arches
  //
  // The jungle used to draw the same five-trunks-and-two-suns arrangement on
  // every screen it covered, and laid out side by side the whole first act read
  // as one long screen. So a room can name a SCENE (see rooms.js) and the
  // trunks answer to it: down in the understory they are close, few and
  // enormous; up in the canopy they are far, many and thin, with the mist sea
  // under them. Same biome, same sixteen colours, different place to be.
  const scene = room.scene;
  if (w.jungle > 0.08) {
    const spec = {
      understory: { n: 4, base: 40, h: 190, wd: 11, lean: 8 },
      canopy: { n: 9, base: -6, h: 130, wd: 4, lean: 26 },
      chasm: { n: 3, base: 10, h: 150, wd: 7, lean: 14 },
      firstStone: { n: 3, base: 24, h: 104, wd: 5, lean: 20 },
    }[scene] ?? { n: Math.round(3 + w.jungle * 4), base: 24, h: 96, wd: 5, lean: 22 };
    for (let i = 0; i < spec.n; i++) {
      const x = 16 + r() * (W - 32), lean = (r() - 0.5) * spec.lean;
      trunk(scr, x, horizon + spec.base, spec.h + r() * 46, spec.wd + r() * 5, lean, C.NEAR);
    }
  }
  if (w.ruin > 0.1) {
    const n = Math.round(1 + w.ruin * 3);
    for (let i = 0; i < n; i++) {
      const x = 20 + r() * (W - 50), hh = 50 + r() * 50;
      const ww = 13 + r() * 7;
      // a column, tapered, with a slab across the top of it
      scr.poly([x, horizon + 30, x + ww, horizon + 30, x + ww - 2, horizon + 30 - hh, x + 2, horizon + 30 - hh], C.NEAR);
      scr.rect(x - 4, horizon + 26 - hh, ww + 8, 6, C.NEAR);
      if (r() < 0.5) scr.rect(x - 10, horizon + 20 - hh, ww + 26, 5, C.NEAR);
    }
  }
  if (w.machine > 0.15) {
    // the thing under the temple: concentric arcs and a core, dead flat
    const cx = 160 + (r() - 0.5) * 90, cy = 74;
    for (let k = 5; k >= 1; k--) {
      scr.disc(cx, cy, k * 11 * w.machine + 6, k % 2 ? C.NEAR : C.MID);
    }
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      scr.limb(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20,
        cx + Math.cos(a) * 78, cy + Math.sin(a) * 78, 3, 1.5, C.MID);
    }
    for (let i = 0; i < 5; i++) scr.rect(0, 26 + i * 26, W, 2, C.NEAR);
  }
  if (w.palace > 0.2) {
    // a colonnade of round arches — the one shape that says renaissance at
    // twenty pixels tall
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = 8 + i * 64, top = 58, ww = 46;
      scr.rect(x, top, ww, H - top, C.NEAR);
      arch(scr, x + 6, top + 16, ww - 12, 58, C.MID);
      scr.rect(x - 3, top - 5, ww + 6, 7, C.NEAR);
    }
  }

  // ── the one thing this screen has that no other screen has ─────────
  // A composition needs a subject, and five screens of undifferentiated jungle
  // have four. These are cheap — a dozen polygons each — and they are what
  // makes a screen a place you can name afterwards.
  if (scene === 'pod') {
    // The capsule that put him here, half-buried, still steaming, with the
    // furrow it cut running back to the horizon behind it.
    const px = 214, py = horizon + 30;
    scr.poly([60, py + 4, 178, py - 12, 196, py + 2, 96, py + 10], C.DARK);   // the scar
    scr.poly([px - 30, py, px - 8, py - 26, px + 26, py - 22, px + 34, py + 2], C.SOLID);
    scr.poly([px - 30, py, px - 8, py - 26, px - 2, py - 24, px - 20, py + 1], C.EDGE);
    scr.poly([px - 4, py - 22, px + 14, py - 20, px + 12, py - 8, px - 6, py - 10], C.VOID);
    scr.poly([px - 2, py - 20, px + 10, py - 18, px + 9, py - 11, px - 4, py - 12], C.LUX);
    scr.rect(px + 26, py - 18, 12, 4, C.DARK);                                // the hatch, off
    scr.poly([px + 30, py - 16, px + 46, py - 22, px + 48, py - 12, px + 32, py - 8], C.SOLID);
    for (let i = 0; i < 5; i++) {                                            // and it is still venting
      scr.disc(px + 2 + i * 5, py - 32 - i * 6 + Math.sin(i) * 3, 5 - i * 0.7, C.NEAR);
    }
  }
  if (scene === 'chasm') {
    // There is no far side. The mist goes all the way down and something is
    // lit at the bottom of it, which is the only reason you can tell it is far.
    for (let i = 0; i < 6; i++) {
      const y = horizon + 6 + i * 13;
      scr.veil([0, y, W, y - 5, W, y + 11, 0, y + 15], C.NEAR, 0.42);
    }
    scr.poly([0, H - 14, 88, H - 22, 150, H - 10, 232, H - 24, W, H - 16, W, H, 0, H], C.DARK);
    scr.poly([104, H - 9, 168, H - 15, 214, H - 7, 150, H - 3], C.LUX);
  }
  if (scene === 'understory') {
    // Down among it: a ceiling of leaves overhead, so the sky is only a rumour.
    for (let i = 0; i < 16; i++) {
      const x = -10 + i * 22 + (r() - 0.5) * 14;
      frond(scr, x, -6 + r() * 10, 0.45 + r() * 0.5, 34 + r() * 24, C.NEAR, 0.7, 5.5);
    }
    scr.rect(0, 0, W, 10, C.NEAR);
    for (let i = 0; i < 22; i++) {                                           // undergrowth
      const x = r() * W, hh = 10 + r() * 16;
      frond(scr, x, horizon + 62, -1.35 + (r() - 0.5) * 0.7, hh, C.DARK, 0.25, 2.2);
    }
  }
  if (scene === 'canopy') {
    // Above it. The mist you were standing under two screens ago is now a sea
    // below you, and the tops of the trees come up through it.
    for (let i = 0; i < 4; i++) {
      scr.veil([0, horizon + 20 + i * 9, W, horizon + 12 + i * 9, W, H, 0, H], C.NEAR, 0.4);
    }
    for (let i = 0; i < 9; i++) {
      const x = 8 + i * 36 + (r() - 0.5) * 18, y = horizon + 22 + r() * 16;
      scr.disc(x, y, 7 + r() * 6, C.MID);
    }
  }
  if (scene === 'firstStone') {
    // The first thing anybody built, seen through the last of the trees.
    for (const [x, hh, ww] of [[36, 96, 20], [206, 118, 24], [264, 74, 16]]) {
      scr.poly([x, horizon + 34, x + ww, horizon + 34, x + ww - 3, horizon + 34 - hh, x + 3, horizon + 34 - hh], C.SOLID);
      scr.poly([x, horizon + 34, x + 5, horizon + 34, x + 6, horizon + 34 - hh, x + 3, horizon + 34 - hh], C.EDGE);
      scr.rect(x - 6, horizon + 28 - hh, ww + 12, 7, C.SOLID);
      scr.rect(x - 6, horizon + 28 - hh, ww + 12, 2, C.EDGE);
      for (let k = 0; k < 3; k++) scr.rect(x + 4, horizon + 16 - hh + k * 22, ww - 8, 2, C.DARK);
    }
    scr.poly([148, horizon + 34, 196, horizon + 34, 192, horizon + 18, 152, horizon + 20], C.SOLID);
  }

  // NEAR-ish ground haze: one flat veil that pushes everything behind it back
  if (scene !== 'chasm') scr.veil([0, horizon - 6, W, horizon - 22, W, H, 0, H], C.NEAR, 0.35);
}

// Marks cut into the wall. Called by the tile painter rather than the backdrop
// one, because the wall is painted after the backdrop and would bury them.
//
// They are the same four marks the whole way through, and that is the point of
// them: a spiral, a bar, an eye, a triangle. In the tomb they are writing. Two
// rooms later the same four are etched on a bulkhead and they are a circuit
// diagram, and nothing anywhere tells you which reading was the right one.
export function glyphs(scr, room, index) {
  const w = weights(room.t);
  if (w.glyph <= 0.2) return;
  const r = rand(index * 33613 + 91);
  for (let ty = 0; ty < RH; ty++) {
    for (let tx = 0; tx < RW; tx++) {
      if (room.map[ty][tx] !== '-') continue;
      if (r() > 0.16 * w.glyph + 0.04) continue;
      const x = tx * TILE + 4, y = ty * TILE + 4;
      const k = (r() * 4) | 0, ci = w.machine > 0.5 ? C.LUX : C.SOLID;
      if (k === 0) { scr.rect(x, y, 2, 8, ci); scr.rect(x, y, 6, 2, ci); scr.rect(x + 4, y, 2, 4, ci); }
      else if (k === 1) { scr.rect(x, y + 3, 8, 2, ci); scr.rect(x + 3, y, 2, 8, ci); }
      else if (k === 2) { scr.disc(x + 3, y + 3, 3, ci); scr.disc(x + 3, y + 3, 1, C.NEAR); }
      else { scr.poly([x - 1, y + 7, x + 3, y, x + 7, y + 7], ci); }
    }
  }
}

// One frond: a tapered blade laid along a curve that falls away under its own
// weight. Straight wedges were the first attempt and they read as girders — a
// leaf is only a leaf if it is heavier at the far end than the near one.
export function frond(scr, x, y, ang, len, ci, droop = 0.55, wide = 4.4) {
  const n = 6, top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = x + Math.cos(ang) * len * t;
    const py = y + Math.sin(ang) * len * t + droop * len * t * t;
    const w = (1 - t * t) * wide + 0.5;
    top.push(px, py - w);
    bot.unshift(px, py + w * 0.45);
  }
  scr.poly([...top, ...bot], ci);
}

function trunk(scr, x, base, h, w, lean, ci) {
  const tx = x + lean;
  scr.poly([x - w, base, x + w, base, tx + w * 0.5, base - h, tx - w * 0.5, base - h], ci);
  // the crown: seven blades from left to right, every one of them falling
  const top = base - h + 4;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.95 + i * (Math.PI * 0.9) / 6;
    frond(scr, tx, top, a, 25 + (i % 3) * 13, ci, 0.55, 3.4);
  }
  scr.disc(tx, top + 2, w * 1.2, ci);
}

function arch(scr, x, y, w, h, ci) {
  const r = w / 2, cx = x + r;
  const pts = [x, y + h];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + i * Math.PI / 12;
    pts.push(cx + Math.cos(a) * r, y + r + Math.sin(a) * r);
  }
  pts.push(x + w, y + h);
  scr.poly(pts, ci);
}

// ── what moves, and what is in front of him ────────────────────────
export function drawAir(scr, room, clock) {
  const t = room.t, w = weights(t);
  if (w.jungle > 0.1 || w.vine > 0.2) {
    // spores. Another World's one concession to particles was small and slow.
    const n = 14;
    for (let i = 0; i < n; i++) {
      const sd = i * 97.3;
      const x = (sd * 3.1 + clock * (0.12 + (i % 3) * 0.05)) % (W + 20) - 10;
      const y = (Math.sin(clock * 0.008 + sd) * 22) + 30 + (sd % 130);
      scr.rect(x | 0, y | 0, 1, 1, i % 4 ? C.LUX : C.LUX2);
    }
  }
  if (w.machine > 0.3) {
    const p = (clock * 1.4) % (H + 40) - 20;
    scr.veil([0, p, W, p, W, p + 10, 0, p + 10], C.LUX, 0.18);
  }
  if (w.palace > 0.4) {
    // candle light: two flat shapes swapping, never a gradient
    for (const [x, y] of [[24, 96], [296, 96]]) {
      const f = (clock >> 3) % 2;
      scr.rect(x - 2, y, 5, 12, C.SOLID);
      scr.poly([x, y, x + 2, y, x + 1 + f, y - 7 - f * 2, x - f, y - 4], C.LUX2);
    }
  }
}

// The foreground: pure black shapes at the edges of the frame. This is the most
// Another World thing in the file — half its famous screens are a lit middle
// distance seen past something enormous and unlit in the corner.
export function drawFore(scr, room, index) {
  const t = room.t, w = weights(t), r = rand(index * 7481 + 3);
  if (room.scene === 'colonnade') {
    // Two columns standing between you and the room. The hall and the gate
    // screen either side of it are both cut block with glyphs on it, and at a
    // glance they were the same picture; putting the near colonnade in front
    // of this one is what tells them apart before you have read anything.
    for (const x of [52, 268]) {
      scr.poly([x - 13, H, x + 13, H, x + 10, 26, x - 10, 26], C.VOID);
      scr.poly([x - 18, 26, x + 18, 26, x + 18, 34, x - 18, 34], C.VOID);
      scr.poly([x - 16, 12, x + 16, 12, x + 13, 26, x - 13, 26], C.VOID);
    }
    scr.rect(0, 0, W, 14, C.VOID);
  }
  if (w.jungle > 0.25) {
    for (const side of [0, 1]) {
      const x = side ? W + 10 : -10, s = side ? -1 : 1;
      scr.poly([x - s * 8, 0, x + s * 15, 0, x + s * 9, H, x - s * 8, H], C.VOID);
      for (let i = 0; i < 5; i++) {
        const y = 2 + i * 34 + r() * 14;
        const a = (side ? Math.PI : 0) + (s * (-0.5 + r() * 0.7));
        frond(scr, x + s * 8, y, a, 46 + r() * 40, C.VOID, 0.42, 6.5);
      }
    }
  }
  if (w.palace > 0.35 || w.machine > 0.5) {
    scr.rect(0, 0, 10, H, C.VOID);
    scr.rect(W - 10, 0, 10, H, C.VOID);
    scr.poly([0, 0, 54, 0, 26, 22, 0, 26], C.VOID);
    scr.poly([W, 0, W - 54, 0, W - 26, 22, W, 26], C.VOID);
  }
  if (w.vine > 0.3) {
    // what is pulling the ceiling down. Thin, many, and hanging — the moment
    // they read as thick they read as bars, and the room stops being a ruin.
    for (let i = 0; i < 11; i++) {
      const x = 6 + r() * (W - 12), L = 26 + r() * 62, sway = (r() - 0.5) * 26;
      const n = 5;
      const a = [], b = [];
      for (let k = 0; k <= n; k++) {
        const t = k / n, px = x + sway * t * t, py = L * t;
        const ww = 1.7 * (1 - t * 0.7);
        a.push(px - ww, py); b.unshift(px + ww, py);
      }
      scr.poly([...a, ...b], C.VOID);
      for (let k = 1; k <= 3; k++) {
        const t = k / 3.4;
        frond(scr, x + sway * t * t, L * t, (k % 2 ? 0.5 : Math.PI - 0.5), 8 + r() * 7, C.VOID, 0.5, 2.6);
      }
    }
  }
}
