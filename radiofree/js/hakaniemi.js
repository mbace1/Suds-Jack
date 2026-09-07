// Radio Free Helsinki — Hakaniemi / south Hämeentie.
// Fixed-grid scene based on the real transit geometry: broad tram corridor,
// dense catenary, sparse platforms, modernist blocks and the round Arena-talo
// tower as the recognisable anchor. Weather and broadcast FX stay external.

import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';
import { drawTram } from './tram.js?v=38';

const W = 128, H = 152;
const inkLo = d => mix(PAL.GREEN_DIM, PAL.AMBER_DIM, d);
const hot = d => mix(PAL.GREEN_HOT, PAL.AMBER_HOT, d);

function sky(scr, d) {
  scr.bands(0, 0, W, 66, [mix('#071019', '#171006', d), mix('#10212b', '#291c0a', d)]);
}

function blocks(scr, t, d) {
  const drift = Math.floor((t * .55) % 160);
  for (const wrap of [0, 160]) {
    const x = -22 - drift + wrap;
    // Long modernist Hakaniemi office slab: horizontal rhythm, no decorative noise.
    scr.px(x, 35, 54, 43, mix('#17232a', '#2b2011', d));
    for (let y = 42; y < 72; y += 8) {
      scr.px(x + 5, y, 43, 2, shade(inkLo(d), .28));
    }

    // Lower street wall toward Hämeentie.
    scr.px(x + 83, 43, 50, 36, mix('#142027', '#291d0e', d));
    for (let wx = x + 88; wx < x + 128; wx += 9) {
      scr.px(wx, 50, 4, 4, shade(inkLo(d), .22));
      scr.px(wx, 62, 4, 4, shade(inkLo(d), .32));
    }
  }
}

function arenaTower(scr, t, d) {
  // Arena-talo's round corner tower is compressed into a readable stepped silhouette.
  const x = 82 - Math.floor((t * .28) % 160);
  for (const wrap of [0, 160]) {
    const xx = x + wrap;
    scr.px(xx + 5, 24, 27, 53, mix('#263038', '#3a2814', d));
    scr.px(xx + 2, 30, 33, 43, mix('#2b3439', '#402b15', d));
    scr.px(xx + 8, 18, 21, 7, mix('#1a252c', '#30200f', d));
    scr.px(xx + 11, 14, 15, 4, shade(inkLo(d), .5));
    scr.px(xx + 17, 9, 2, 5, shade(inkLo(d), .58));
    for (let y = 36; y < 67; y += 8) {
      for (let wx = xx + 7; wx < xx + 30; wx += 7) scr.px(wx, y, 3, 3, shade(inkLo(d), .34));
    }
  }
}

function corridor(scr, t, d) {
  scr.px(0, 78, W, H - 78, mix('#0b1217', '#1d160d', d));
  // Broad perspective tracks, characteristic of the open Hakaniemi stop geometry.
  scr.line(22, 78, 4, H, shade(inkLo(d), .58));
  scr.line(43, 78, 36, H, shade(inkLo(d), .78));
  scr.line(76, 78, 89, H, shade(inkLo(d), .78));
  scr.line(97, 78, 124, H, shade(inkLo(d), .58));

  // Platform islands and restrained paving movement.
  scr.px(49, 82, 21, 2, shade(inkLo(d), .35));
  scr.line(49, 84, 41, H, shade(inkLo(d), .25));
  scr.line(70, 84, 79, H, shade(inkLo(d), .25));
  const seam = Math.floor((t * 6) % 13);
  for (let y = 94 - seam; y < H; y += 13) scr.px(0, y, W, 1, shade(inkLo(d), .12));
}

function catenary(scr, t, d) {
  const sway = Math.round(Math.sin(t * .55));
  for (const x of [15, 53, 105]) {
    scr.px(x, 30, 2, 62, shade(inkLo(d), .52));
    scr.px(x - 7, 40, 16, 1, shade(inkLo(d), .35));
  }
  scr.line(0, 32 + sway, W, 39 - sway, shade(inkLo(d), .38));
  scr.line(0, 46 - sway, W, 42 + sway, shade(inkLo(d), .28));
  scr.line(30, 0, 54, 79, shade(inkLo(d), .18));
  scr.line(111, 0, 78, 79, shade(inkLo(d), .18));
}

function metroSign(scr, t, d) {
  const x = 59 + Math.round(Math.sin(t * .22));
  scr.px(x, 69, 2, 17, shade(inkLo(d), .52));
  scr.rect(x - 4, 65, 10, 8, mix('#0d1a20', '#22170b', d), shade(inkLo(d), .58));
  // Abstracted M glyph at native resolution; no full-size UI text baked into scene.
  scr.px(x - 2, 67, 1, 4, hot(d));
  scr.px(x + 2, 67, 1, 4, hot(d));
  scr.px(x - 1, 68, 3, 1, hot(d));
}

function stopLife(scr, t, d) {
  const c = shade(inkLo(d), .72);
  // A few static waiting figures contrast with the shared moving passerby layer.
  for (const [x, y, phase] of [[55, 89, 0], [64, 91, 2], [72, 88, 4]]) {
    const bob = (Math.floor(t * 1.4 + phase) % 6 === 0) ? 1 : 0;
    scr.px(x, y + bob, 2, 3, c);
    scr.px(x - 1, y + 3 + bob, 4, 7, c);
    scr.px(x, y + 10 + bob, 1, 4, c);
    scr.px(x + 2, y + 10 + bob, 1, 4, c);
  }
}

function foreground(scr, t, d) {
  // Fast shelter edge / pole: cheap depth cue, never baked into architecture.
  const x = 143 - ((t * 8.5) % 190);
  scr.px(x, 52, 3, 87, shade(inkLo(d), .72));
  scr.px(x - 9, 54, 21, 2, shade(inkLo(d), .48));
}

export function drawHakaniemi(scr, t, d = 0) {
  sky(scr, d);
  blocks(scr, t, d);
  arenaTower(scr, t, d);
  corridor(scr, t, d);
  catenary(scr, t, d);
  metroSign(scr, t, d);
  // Shared tram module: one close pass and a smaller-feeling distant pass via position.
  drawTram(scr, ((t * 12) % (W + 82)) - 66, 75, t, d);
  stopLife(scr, t, d);
  foreground(scr, t, d);
}
