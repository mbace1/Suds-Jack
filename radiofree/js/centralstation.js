// Radio Free Helsinki — Helsinki Central Station / Kaivokatu fixed-grid scene layer.
// Based on the real Eliel Saarinen station frontage: broad granite mass,
// dominant arched entry, clock tower, Kaivokatu tram corridor and crossing.
// It is intentionally simplified to read at 128x152 without becoming a collage.

import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
import { drawTram } from './tram.js?v=38';

const W = 128, H = 152;
const lo = d => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d);
const hi = d => mix(PAL.GREEN, PAL.AMBER, d);

function stationMass(scr, d) {
  // Main granite frontage.
  scr.px(7, 32, 99, 52, mix('#172126', '#2b1f12', d));
  scr.px(13, 27, 82, 6, mix('#11191e', '#21170d', d));

  // Clock tower: narrow and tall, set to the right like the real facade.
  scr.px(94, 7, 17, 77, mix('#131d22', '#281c10', d));
  scr.px(97, 4, 11, 5, mix('#0f171b', '#1f160c', d));
  scr.disc(102, 18, 5, shade(hi(d), 0.66));
  scr.disc(102, 18, 3, mix('#091014', '#171007', d));
  scr.px(102, 15, 1, 4, shade(hi(d), 0.9));
  scr.px(102, 18, 3, 1, shade(hi(d), 0.75));

  // Central arch. The nested rectangles approximate the glowing barrel arch
  // without baking animated light into the building itself.
  scr.px(33, 41, 41, 43, mix('#0d1519', '#21170d', d));
  for (let i = 0; i < 6; i++) {
    const inset = i * 2;
    const c = shade(hi(d), 0.18 + i * 0.055);
    scr.px(36 + inset, 44 + inset, 35 - inset * 2, 1, c);
    scr.px(36 + inset, 44 + inset, 1, 28 - inset, c);
    scr.px(70 - inset, 44 + inset, 1, 28 - inset, c);
  }
  scr.px(42, 67, 24, 17, mix('#121b1f', '#2a1d0f', d));

  // Restrained vertical bays either side of arch.
  for (const x of [16, 24, 80, 88]) {
    scr.px(x, 43, 5, 31, shade(lo(d), 0.28));
    scr.px(x + 1, 47, 3, 21, shade(lo(d), 0.5));
  }
}

function kaivokatu(scr, t, d) {
  // Street plane and zebra crossing directly in front of the station.
  scr.px(0, 84, W, H - 84, mix('#0a1014', '#1d160d', d));
  for (let x = 8; x < 118; x += 13) {
    const pulse = 0.18 + 0.04 * Math.sin(t * 0.5 + x);
    scr.px(x, 88, 7, 17, shade(lo(d), pulse));
  }

  // Two tram tracks, broad and nearly horizontal in this viewpoint.
  const phase = Math.floor((t * 6) % 18);
  for (let y = 111 - phase; y < H; y += 18) scr.px(0, y, W, 1, shade(lo(d), 0.16));
  scr.line(0, 106, W, 117, shade(lo(d), 0.62));
  scr.line(0, 113, W, 124, shade(lo(d), 0.62));
  scr.line(0, 109, W, 120, shade(lo(d), 0.24));
}

function catenary(scr, t, d) {
  const bob = Math.round(Math.sin(t * 0.65));
  scr.line(0, 29 + bob, W, 34 - bob, shade(lo(d), 0.33));
  scr.line(0, 38 - bob, W, 41 + bob, shade(lo(d), 0.22));
  for (const x of [8, 71, 123]) {
    scr.px(x, 23, 2, 68, shade(lo(d), 0.42));
    scr.px(x - 4, 34, 10, 1, shade(lo(d), 0.3));
  }
}

function commuters(scr, t, d) {
  // Tiny 2-frame commuter silhouettes crossing Kaivokatu. Individual motion,
  // no crowd blob, so the station keeps its calm civic scale.
  const frame = Math.floor(t * 4) & 1;
  for (let i = 0; i < 8; i++) {
    const x = ((i * 21 + Math.floor(t * (3 + (i % 3)))) % 156) - 14;
    const y = 93 + (i % 3) * 4;
    scr.disc(x, y, 1, shade(lo(d), 0.72));
    scr.px(x, y + 2, 2, 5, shade(lo(d), 0.62));
    scr.px(x - frame, y + 7, 1, 3, shade(lo(d), 0.5));
    scr.px(x + 1 + frame, y + 7, 1, 3, shade(lo(d), 0.5));
  }
}

function reflections(scr, t, d) {
  // Independent vertical wet-light fragments; not painted into the road.
  for (let i = 0; i < 7; i++) {
    const x = 5 + i * 19;
    const pulse = 0.18 + 0.34 * (0.5 + Math.sin(t * 1.1 + i) * 0.5);
    for (let y = 119 + (i & 1) * 3; y < 147; y += 4) {
      scr.px(x + ((y + i) & 1), y, 2, 1, shade(hi(d), pulse));
    }
  }
}

function foreground(scr, t, d) {
  // Fast shelter / signal edges give the Kaivokatu shot parallax depth.
  const x = 145 - ((t * 8) % 180);
  scr.px(x, 62, 4, 83, shade(lo(d), 0.68));
  scr.px(x - 8, 66, 20, 2, shade(lo(d), 0.45));
  scr.rect(x - 7, 70, 17, 30, mix('#0d171c', '#22180d', d), shade(lo(d), 0.32));
}

export function drawCentralStation(scr, t, d = 0) {
  // Background night sky.
  scr.bands(0, 0, W, H, [mix('#07101a', '#171006', d), mix('#102433', '#2a1c0a', d)]);
  stationMass(scr, d);       // L1 fixed architecture
  catenary(scr, t, d);       // L2 infrastructure
  kaivokatu(scr, t, d);      // L3 ground / rails

  // Reuse the same tram asset as the rain-tram scene. Two slower passes create
  // the real Kaivokatu feeling without requiring new vehicle art.
  const tramA = ((t * 11) % 210) - 72;
  drawTram(scr, tramA, 83, t, d);
  const tramB = 158 - ((t * 7.5) % 240);
  if (tramB > -70 && tramB < 135) drawTram(scr, tramB, 92, t + 2.7, d * 0.8);

  commuters(scr, t, d);      // L5 people
  reflections(scr, t, d);    // L7 wet masks
  foreground(scr, t, d);     // L8 occlusion
}
