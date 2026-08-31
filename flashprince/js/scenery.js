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

import { C } from './palette.js?v=52';
import { RW, RH, TILE, ROOM_W as W, ROOM_H as H } from './rooms.js?v=53';

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
  if (room.scene === 'floodedHub') { paintFloodedHub(scr); return; }
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

  // stars, and more than one moon. It is not Earth and the sky is the cheapest
  // place to say so — the reference hangs five up there.
  for (let i = 0; i < 30; i++) {
    const sx = (i * 61 + index * 17) % W, sy = (i * 29) % 62;
    scr.rect(sx, sy, 1, 1, i % 5 ? C.FAR : C.EDGE);
  }
  if (w.jungle > 0.15 || w.machine > 0.2) {
    scr.disc(232, 34, 13 * Math.max(w.jungle, 0.5) + 3, C.SKY_LO);
    scr.disc(232, 34, 9 * Math.max(w.jungle, 0.5) + 2, C.LUX2);
    scr.disc(232, 31, 6, C.EDGE);                        // the lit limb of it
    scr.disc(262, 46, 5 * Math.max(w.jungle, 0.4) + 2, C.LUX2);
    scr.disc(196, 20, 7, C.FAR);                         // a third, further off
    scr.disc(194, 18, 5, C.MID);
  }
  if (w.palace > 0.3) {
    scr.disc(64, 30, 11, C.LUX);
    scr.disc(60, 27, 9, C.SKY_HI);
    scr.disc(258, 22, 6, C.FAR);
    scr.disc(256, 21, 4, C.MID);
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
    // A BANK of it at the horizon, in the middle-distance value. The references
    // never show one row of plants — there is always a mass of them receding,
    // and it is the mass that makes the few near ones read as near.
    for (let i = 0; i < 26; i++) {
      const x = -8 + (i * 13 + (i % 3) * 5) % (W + 16);
      leaves(scr, x, horizon + 6 + (i % 3) * 4, 7 + (i % 4) * 4, C.MID, C.NEAR, 6, Math.PI * 0.75);
    }
    // creeper coming down out of the canopy, everywhere, at two depths
    for (let i = 0; i < 12; i++) {
      const x = 6 + r() * (W - 12), L = 20 + r() * 60;
      const ci = i % 2 ? C.MID : C.NEAR;
      const sway = (r() - 0.5) * 14;
      for (let k = 0; k <= 8; k++) {
        const tt = k / 8;
        scr.rect(x + sway * tt * tt, tt * L, 2, L / 8 + 1, ci);
      }
      leaves(scr, x + sway, L, 5 + r() * 4, ci, ci, 5, Math.PI * 0.8, Math.PI / 2);
    }
  }
  if (w.ruin > 0.1) {
    const n = Math.round(1 + w.ruin * 3);
    for (let i = 0; i < n; i++) {
      const x = 20 + r() * (W - 50), hh = 50 + r() * 50;
      const ww = 13 + r() * 7;
      // A COLUMN, not a post: base, tapered shaft with a lit edge and flutes,
      // capital, and a lintel across the top. Three values on one shape is what
      // separates a ruin from a rectangle.
      const b0 = horizon + 30, top = b0 - hh;
      scr.poly([x, b0, x + ww, b0, x + ww - 2, top, x + 2, top], C.NEAR);
      scr.poly([x, b0, x + 3, b0, x + 5, top, x + 2, top], C.MID);       // the lit edge
      for (let k = 1; k < 3; k++) scr.rect(x + 3 + k * (ww / 3.4), top + 4, 1, hh - 8, C.FAR);
      scr.rect(x - 3, top - 5, ww + 6, 5, C.NEAR);                        // capital
      scr.rect(x - 3, top - 5, ww + 6, 1, C.MID);
      scr.rect(x - 2, b0 - 4, ww + 4, 4, C.NEAR);                         // base
      if (r() < 0.55) {
        scr.rect(x - 11, top - 12, ww + 26, 7, C.NEAR);                   // lintel
        scr.rect(x - 11, top - 12, ww + 26, 1, C.MID);
        // a meander cut into it — the one carved motif the references all have
        for (let k = 0; k < 5; k++) {
          const mx = x - 8 + k * ((ww + 20) / 5);
          scr.rect(mx, top - 10, 4, 1, C.FAR);
          scr.rect(mx + 3, top - 10, 1, 3, C.FAR);
        }
      }
      if (w.vine > 0.15 || w.jungle > 0.2) drape(scr, x - 2, top - 4, ww + 4, C.MID, r, 12);
    }
  }
  if (w.machine > 0.15) {
    // THE MACHINE. Dark armoured plate, cyan light strips, hot orange vents and
    // cable runs slung between them — the reference's whole right-hand side is
    // that, and a flat wheel was reading as a cog in a mill.
    const cx = 160 + (r() - 0.5) * 70, cy = 72;
    for (let k = 5; k >= 1; k--) scr.disc(cx, cy, k * 10 * w.machine + 6, k % 2 ? C.NEAR : C.MID);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      scr.limb(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20,
        cx + Math.cos(a) * 74, cy + Math.sin(a) * 74, 3, 1.5, C.MID);
    }
    // plated bulkheads down both sides, each with its own strip and vent
    for (const side of [0, 1]) {
      const bx = side ? W - 62 : 6;
      for (let k = 0; k < 5; k++) {
        const py = 8 + k * 22, ph = 18;
        scr.rect(bx, py, 56, ph, C.NEAR);
        scr.rect(bx, py, 56, 1, C.MID);
        scr.rect(bx, py + ph - 2, 56, 2, C.DARK);
        if (k % 2 === 0) scr.rect(bx + (side ? 4 : 44), py + 4, 8, 3, C.LUX);
        else {
          scr.rect(bx + (side ? 6 : 40), py + 4, 12, 9, C.DARK);
          scr.rect(bx + (side ? 8 : 42), py + 6, 8, 5, C.LUX2);
        }
      }
      // a cable run, slack between two anchors
      const ax = side ? W - 66 : 62;
      for (let i = 0; i <= 16; i++) {
        const tt = i / 16, px = ax + (side ? -1 : 1) * tt * 34;
        scr.rect(px, 30 + Math.sin(tt * Math.PI) * 26, 2, 2, C.DARK);
      }
    }
    for (let i = 0; i < 5; i++) scr.rect(0, 26 + i * 26, W, 1, C.NEAR);
  }
  if (w.palace > 0.2) {
    // a colonnade of round arches — the one shape that says renaissance at
    // twenty pixels tall
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = 8 + i * 64, top = 58, ww = 46;
      scr.rect(x, top, ww, H - top, C.NEAR);
      arch(scr, x + 4, top + 14, ww - 8, 62, C.FAR);      // the void inside it
      arch(scr, x + 6, top + 16, ww - 12, 58, C.MID);
      scr.rect(x + ww / 2 - 3, top + 14, 6, 7, C.EDGE);   // the keystone
      scr.rect(x - 3, top - 5, ww + 6, 7, C.NEAR);
      scr.rect(x - 3, top - 5, ww + 6, 1, C.EDGE);
      scr.rect(x - 1, top + 12, ww + 2, 2, C.MID);        // impost course
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
    for (let i = 0; i < 16; i++) {                                           // undergrowth
      const x = r() * W;
      leaves(scr, x, horizon + 62, 9 + r() * 9, C.DARK, C.SOLID, 6, Math.PI * 0.9);
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

  // ATMOSPHERE. One veil flattened everything behind it into a single plane;
  // the references get their depth from each layer being one step hazier than
  // the one in front, so this is three, stacked and shallow.
  // Two BANDS in the middle distance and one veil at the foot, not three washes
  // down to the floor. Stacked all the way to the bottom of the frame they add
  // to half an alpha over everything the player is standing on, and the whole
  // picture went pale — recession has to happen BEHIND the action, not on it.
  if (scene !== 'chasm') {
    scr.veil([0, horizon - 48, W, horizon - 58, W, horizon - 12, 0, horizon - 4], C.NEAR, 0.15);
    scr.veil([0, horizon - 4, W, horizon - 20, W, H, 0, H], C.NEAR, 0.3);
  }

  // ── the foreground, and what grows in it ─────────────────────────
  // Bioluminescence clustered along the bottom of the frame, which is where
  // both references put it: cold light low down, against whatever the sky is
  // doing. Drawn last so it sits in front of everything.
  if (w.jungle > 0.25 || w.vine > 0.25) {
    for (let i = 0; i < 9; i++) {
      const gx = (i * 41 + index * 23) % W, gy = H - 4 - (i % 3) * 3;
      const hh = 4 + (i % 4) * 2;
      halo(scr, gx + 1, gy - hh - 1, 9);
      scr.rect(gx, gy - hh, 2, hh, C.DARK);              // stem
      scr.poly([gx - 4, gy - hh, gx + 6, gy - hh, gx + 4, gy - hh - 4, gx - 2, gy - hh - 4], C.LUX);
      scr.rect(gx - 1, gy - hh - 3, 4, 1, C.LUX2);       // the lit cap
    }
    for (let i = 0; i < 5; i++) {                        // and a few crystals
      const gx = 12 + ((i * 73 + index * 31) % (W - 24));
      const hh = 6 + (i % 3) * 4;
      scr.poly([gx, H, gx + 5, H, gx + 4, H - hh, gx + 2, H - hh - 3, gx + 1, H - hh], C.LUX);
      scr.poly([gx + 1, H, gx + 2, H, gx + 2, H - hh + 1, gx + 1, H - hh + 1], C.LUX2);
    }
  }
  // petroglyphs cut into the rock, where the stone starts and the jungle ends
  if (w.ruin > 0.3 && w.glyph < 0.55) {
    const gr = rand(index * 613 + 5);
    for (let i = 0; i < 4; i++) {
      const gx = 10 + gr() * 40, gy = 96 + gr() * 50;
      scr.rect(gx + 2, gy, 2, 9, C.DARK);                // a figure: body,
      scr.rect(gx, gy + 3, 6, 1, C.DARK);                // arms,
      scr.rect(gx + 1, gy + 9, 2, 4, C.DARK);            // legs
      scr.rect(gx + 4, gy + 9, 2, 4, C.DARK);
      scr.disc(gx + 3, gy - 2, 2, C.DARK);               // and a head
    }
  }
}

// The flooded-city showcase is deliberately its own composition rather than
// another stop on the old jungle-to-palace blend. It still obeys the same
// three-depth, sixteen-colour grammar: drowned city silhouette, transport-hub
// structure, then the pale bio-machine that has grown through it.
function paintFloodedHub(scr) {
  scr.rect(0, 0, W, 44, C.SKY_HI);
  scr.rect(0, 44, W, 42, C.SKY_LO);
  scr.rect(0, 86, W, H - 86, C.FAR);

  // Distant drowned towers: broken roofs and just a few lit windows.
  const towers = [[-8, 56, 42], [30, 70, 30], [63, 48, 52], [236, 62, 38], [270, 42, 58], [304, 76, 24]];
  for (let i = 0; i < towers.length; i++) {
    const [x, y, h] = towers[i];
    scr.poly([x, y + h, x, y + 8, x + 7, y + 3, x + 15, y + 7, x + 24, y, x + 31, y + 5, x + 31, y + h], C.MID);
    for (let wy = y + 14; wy < y + h - 5; wy += 9) {
      if ((i + wy) % 3) scr.rect(x + 7 + ((wy / 3) % 2) * 10, wy, 4, 2, C.LUX);
    }
  }

  // The old transport hub: canopy, signal gantry, dead timetable and rails.
  scr.poly([0, 104, 79, 92, 126, 99, 204, 90, W, 104, W, 119, 0, 119], C.NEAR);
  scr.rect(0, 103, W, 3, C.SOLID);
  for (const x of [18, 66, 252, 300]) {
    scr.rect(x, 104, 5, 66, C.DARK);
    scr.rect(x + 1, 105, 2, 64, C.SOLID);
  }
  scr.rect(32, 114, 58, 24, C.DARK);
  scr.rect(36, 118, 50, 15, C.VOID);
  for (let i = 0; i < 4; i++) scr.rect(40 + i * 11, 122 + (i % 2) * 4, 7, 2, i === 2 ? C.LUX2 : C.LUX);
  scr.rect(226, 113, 42, 4, C.DARK);
  for (let x = 228; x < 268; x += 8) scr.rect(x, 117, 2, 24, C.SOLID);
  // Platform furniture: a numbered enamel sign, cable loops, conduit and the
  // parallel rails still visible below the flood line.
  scr.rect(92, 109, 25, 12, C.DARK);
  scr.rect(95, 112, 19, 6, C.SOLID);
  scr.text('P6', 99, 112, C.LUX2, 6);
  for (const x of [112, 132, 210]) {
    scr.rect(x, 103, 1, 17, C.DARK);
    scr.disc(x + 3, 121, 3, C.SOLID);
  }
  scr.rect(0, 143, W, 2, C.DARK);
  scr.rect(0, 147, W, 1, C.EDGE);
  for (let x = 4; x < W; x += 14) scr.rect(x, 141, 7, 2, C.SOLID);

  // The grand facility: grown lobes around an old circular machine, beautiful
  // rather than horrific. Fine luminous seams make it read as alive.
  const cx = 166, cy = 69;
  scr.disc(cx, cy, 45, C.NEAR);
  scr.disc(cx, cy, 34, C.SOLID);
  scr.disc(cx, cy, 22, C.DARK);
  scr.disc(cx, cy, 14, C.FAR);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 - 0.8;
    const x1 = cx + Math.cos(a) * 30, y1 = cy + Math.sin(a) * 30;
    const x2 = cx + Math.cos(a) * 62, y2 = cy + Math.sin(a) * 48;
    scr.limb(x1, y1, x2, y2, 7, 2, C.SOLID);
    scr.limb(x1, y1, x2, y2, 1, 1, i % 2 ? C.LUX : C.EDGE);
    scr.disc(x2, y2, 5, C.NEAR);
    scr.rect(x2 - 1, y2 - 2, 2, 4, i % 2 ? C.LUX2 : C.LUX);
  }
  scr.disc(cx, cy, 5, C.LUX2);
  scr.rect(cx - 1, cy - 16, 2, 32, C.LUX);

  // Water behind the playable masses.
  scr.rect(0, 148, W, H - 148, C.NEAR);
  for (let y = 151; y < H; y += 7) {
    const off = ((y / 7) | 0) % 2 ? 12 : 0;
    for (let x = -off; x < W; x += 34) scr.rect(x, y, 18, 1, y % 3 ? C.MID : C.LUX);
  }
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

// A CLUSTER of pointed leaves radiating off one base, drawn dark first and then
// a smaller lighter fan over it. This is the single biggest thing the reference
// art does that a frond-on-a-stick does not: real foliage is many small blades
// overlapping at two values, and the overlap is what reads as a plant rather
// than as a feather.
export function leaves(scr, x, y, r, dark, lit, n = 7, spread = Math.PI * 0.8, tilt = -Math.PI / 2) {
  // A LEAF, not a spine. The first cut made each blade a thin triangle over a
  // 270-degree fan and every cluster came out a black starburst — a sea urchin.
  // Real foliage is broad blades over a NARROW fan, widest about halfway along,
  // sitting on a filled base so the shape has body between the points.
  const blade = (a, L, wd, ci) => {
    const cx = Math.cos(a), cy = Math.sin(a), nx = -cy * wd, ny = cx * wd;
    scr.poly([
      x, y,
      x + cx * L * 0.42 + nx, y + cy * L * 0.42 + ny,
      x + cx * L, y + cy * L,
      x + cx * L * 0.42 - nx, y + cy * L * 0.42 - ny,
    ], ci);
  };
  for (let pass = 0; pass < 2; pass++) {
    const ci = pass ? lit : dark;
    const k = pass ? 0.66 : 1;
    const cnt = pass ? Math.max(3, n - 3) : n;
    for (let i = 0; i < cnt; i++) {
      const a = tilt - spread / 2 + (spread * i) / Math.max(1, cnt - 1);
      const L = r * k * (0.78 + ((i * 37) % 10) / 34);
      blade(a, L, Math.max(1.6, r * 0.3 * k), ci);
    }
    // the base the blades come out of, so the middle is mass and not gaps
    scr.disc(x + Math.cos(tilt) * r * 0.16 * k, y + Math.sin(tilt) * r * 0.16 * k,
      Math.max(1.5, r * 0.26 * k), ci);
  }
}

// A light that reads as a light. With sixteen flat colours there is no bloom to
// reach for, so glow is a HALO: one wide soft ring that the quantiser lands on
// whatever is nearest, a solid ring of the light's own colour, and a hot core.
// It is the same three-step trick a 1991 artist would have painted by hand.
export function halo(scr, x, y, r, ci = C.LUX, hot = C.LUX2) {
  scr.veil([x - r, y - r * 0.8, x + r, y - r * 0.8, x + r * 0.8, y + r, x - r * 0.8, y + r], ci, 0.2);
  scr.disc(x, y, r * 0.5, ci, 0.45);
  scr.disc(x, y, r * 0.24, hot);
}

// Moss and creeper hanging off a lip. Lighter than what it hangs from, because
// in every one of the references the growth is the light thing and the stone is
// the dark thing — the other way round and it reads as damage.
export function drape(scr, x, y, w, ci, r, len = 9) {
  for (let i = 0; i < w; i += 2 + ((i * 3) % 3)) {
    const L = 2 + r() * len;
    scr.rect(x + i, y, 2, L, ci);
    if (L > len * 0.6) scr.rect(x + i - 1, y + L - 2, 3, 2, ci);
  }
}

function trunk(scr, x, base, h, w, lean, ci) {
  const tx = x + lean;
  scr.poly([x - w, base, x + w, base, tx + w * 0.5, base - h, tx - w * 0.5, base - h], ci);
  // one lit edge down the trunk, so it is a cylinder and not a plank
  scr.poly([x - w, base, x - w + 2, base, tx - w * 0.5 + 1.5, base - h, tx - w * 0.5, base - h],
    ci === C.NEAR ? C.MID : C.NEAR);
  // the crown: blades, and then a cluster of leaves over the join
  const top = base - h + 4;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.95 + i * (Math.PI * 0.9) / 6;
    frond(scr, tx, top, a, 25 + (i % 3) * 13, ci, 0.55, 3.4);
  }
  leaves(scr, tx, top + 2, 16, ci, ci === C.NEAR ? C.MID : C.FAR, 9, Math.PI * 1.25);
  // things growing ON it — the references never leave a trunk bare
  for (let k = 0; k < 3; k++) {
    const ty2 = base - h * (0.25 + k * 0.22);
    const sx = x + lean * ((base - ty2) / h) + (k % 2 ? w : -w);
    leaves(scr, sx, ty2, 7 + (k % 2) * 3, ci, ci === C.NEAR ? C.MID : C.FAR,
      5, Math.PI * 0.7, k % 2 ? -0.4 : Math.PI + 0.4);
  }
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
  if (room.scene === 'floodedHub') {
    // Rain changes density with the weather cycle. A periodic pale sky flash
    // changes the whole room without introducing a seventeenth colour.
    const storm = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(clock * 0.003));
    const n = 18 + Math.round(storm * 22);
    for (let i = 0; i < n; i++) {
      const x = (i * 47 + clock * (1.5 + (i % 3) * 0.25)) % (W + 32) - 16;
      const y = (i * 31 + clock * 2.7) % (H + 24) - 12;
      scr.limb(x, y, x - 3, y + 8, 1, 1, i % 4 ? C.EDGE : C.LUX);
    }
    if ((clock % 620) < 4) scr.veil([0, 0, W, 0, W, H, 0, H], C.LUX2, 0.22);

    // Small machine life uses the drowned rail as a migration route.
    for (let i = 0; i < 3; i++) {
      const x = ((clock * (0.18 + i * 0.03) + i * 113) % (W + 40)) - 20;
      const y = 126 + Math.sin(clock * 0.025 + i * 2) * 3;
      scr.rect(x - 4, y, 8, 3, C.DARK);
      scr.rect(x - 1, y - 2, 3, 2, C.LUX);
      scr.rect(x - 6, y + 3, 12, 1, C.MID);
    }
    // The facility is alive, but quiet: light travels from lobe to lobe like
    // a slow thought. These are the same joints as the static structure.
    for (let i = 0; i < 7; i++) {
      if (((clock >> 4) + i) % 7 !== 0) continue;
      const a = i / 7 * Math.PI * 2 - 0.8;
      scr.disc(166 + Math.cos(a) * 62, 69 + Math.sin(a) * 48, 3, C.LUX2);
    }
    // Its central iris breathes on a much slower four-step rhythm. Keeping it
    // to hard pixel sizes makes it feel authored rather than smoothly scaled.
    const breath = [0, 1, 2, 1][(clock >> 5) & 3];
    scr.disc(166, 69, 5 + breath, C.LUX);
    scr.disc(166, 69, 2 + (breath > 1 ? 1 : 0), C.LUX2);
    scr.rect(165, 57 - breath, 2, 7 + breath, C.LUX2);
    scr.rect(165, 75, 2, 7 + breath, C.LUX2);

    // A few distant windows change independently. This is habitation, not a
    // synchronized light show: most stay dark and none blink quickly.
    const windows = [[15, 76], [46, 91], [77, 70], [251, 84], [282, 66], [309, 94]];
    for (let i = 0; i < windows.length; i++) {
      const phase = ((clock >> 7) + i * 3) % 11;
      if (phase === 0 || phase === 1) scr.rect(windows[i][0], windows[i][1], 3, 2, phase ? C.LUX : C.LUX2);
    }
    // Old rail signals answer on a different, mechanical rhythm.
    const signal = (clock >> 5) % 3;
    for (let i = 0; i < 3; i++) scr.rect(284 + i * 7, 108, 4, 4, i === signal ? C.LUX2 : C.DARK);
    return;
  }
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

// Drawn after the hero, so the water cuts across his boots and the same exact
// land animation becomes a shallow-water wade without inventing replacement
// body frames. Swimming stays out until a matching authored reference exists.
export function drawFloodWater(scr, room, clock, hero) {
  if (room.scene !== 'floodedHub') return;
  const y = room.waterY ?? 166;
  scr.veil([0, y, W, y, W, H, 0, H], C.NEAR, 0.34);
  for (let i = 0; i < 8; i++) {
    const x = (i * 53 + clock * (0.18 + (i % 2) * 0.05)) % (W + 24) - 12;
    scr.rect(x, y + 2 + (i % 3) * 6, 12 + (i % 4) * 3, 1, i % 3 ? C.MID : C.LUX);
  }
  // Rain answers the water with tiny, brief crowns instead of disappearing at
  // the surface. Their phases are staggered so only one or two exist at once.
  for (let i = 0; i < 7; i++) {
    const phase = (clock + i * 19) % 43;
    if (phase > 3) continue;
    const x = 13 + ((i * 47 + (clock >> 5) * 11) % (W - 26));
    scr.rect(x - phase, y, phase * 2 + 1, 1, phase < 2 ? C.LUX2 : C.LUX);
    if (phase < 2) scr.rect(x, y - 2, 1, 2, C.EDGE);
  }
  // Two small luminous swimmers make the flood feel inhabited. They stay
  // below the playable silhouette and turn at opposite edges of the screen.
  for (let i = 0; i < 2; i++) {
    const span = W + 28, p = (clock * (0.10 + i * 0.025) + i * 151) % span;
    const face = i ? -1 : 1;
    const x = face > 0 ? p - 14 : W + 14 - p;
    const fy = y + 11 + i * 8 + Math.sin(clock * 0.022 + i * 2.4) * 2;
    scr.rect(x - 3, fy, 7, 2, C.MID);
    scr.rect(x + face * 2, fy, 2, 1, C.LUX);
    scr.rect(x - face * 5, fy + 1, 2, 1, C.EDGE);
  }
  if (hero && hero.y > y - 4) {
    const moving = ['step', 'inch', 'windUp', 'run', 'skid', 'runTurn', 'roll'].includes(hero.state);
    const spread = moving ? 19 : 10;
    scr.rect(hero.x - spread, y - 1, spread * 2, 1, C.LUX);
    scr.rect(hero.x - Math.round(spread * 0.6), y + 3, Math.round(spread * 1.2), 1, C.MID);
    if (moving) {
      const tail = hero.face > 0 ? hero.x - spread - 9 : hero.x + spread;
      scr.rect(tail, y + 6, 9, 1, C.EDGE);
    }
  }
}

// The foreground: pure black shapes at the edges of the frame. This is the most
// Another World thing in the file — half its famous screens are a lit middle
// distance seen past something enormous and unlit in the corner.
export function drawFore(scr, room, index) {
  if (room.scene === 'floodedHub') {
    // Broken station roof and reeds frame the playable water like a window.
    scr.poly([0, 0, 52, 0, 35, 18, 20, 52, 0, 58], C.VOID);
    scr.poly([W, 0, W - 45, 0, W - 27, 17, W - 17, 52, W, 60], C.VOID);
    for (const x of [4, 12, W - 13, W - 5]) {
      scr.rect(x, 148, 2, H - 148, C.VOID);
      scr.poly([x, 156, x + (x < W / 2 ? 7 : -7), 146, x + 1, 160], C.VOID);
    }
    return;
  }
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
        const L = 46 + r() * 40;
        frond(scr, x + s * 8, y, a, L, C.VOID, 0.42, 6.5);
        // A LEAF CLUSTER at the end of each one. Bare arcs read as wire; the
        // reference's foreground is a dense unlit MASS of foliage, and mass is
        // what makes the lit middle distance sit back behind it.
        leaves(scr, x + s * 8 + Math.cos(a) * L * 0.82,
          y + Math.sin(a) * L * 0.82 + 0.42 * L * 0.67,
          15 + r() * 8, C.VOID, C.VOID, 7, Math.PI * 0.85, a);
      }
      // and a bank of it along the very bottom corner
      for (let i = 0; i < 4; i++) {
        leaves(scr, x + s * (10 + i * 22), H + 6, 19 + r() * 10, C.VOID, C.VOID, 7, Math.PI * 0.9);
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
