// Radio Free Helsinki — fixed-grid tram sprite.
// The body is rigid. Animation comes from separate wheel, suspension and light
// layers so the scene can move without redrawing a whole vehicle every frame.

import { PAL } from './palette.js?v=37';
import { mix, shade } from './screen.js?v=37';

export const TRAM_W = 60;
export const TRAM_H = 36;

export function drawTram(scr, x, y, t, decode = 0) {
  const body = mix('#2a393f', '#443119', decode);
  const bodyHi = mix('#38515a', '#65451e', decode);
  const glass = mix('#09171d', '#21170c', decode);
  const trim = mix(PAL.GREEN_DIM, PAL.AMBER_DIM, decode);
  const hot = mix(PAL.GREEN_HOT, PAL.AMBER_HOT, decode);

  // tiny suspension cycle: whole rigid shell only shifts by one native pixel
  const bob = (Math.floor(t * 5) & 1);
  const yy = y + bob;

  // roof / pantograph base
  scr.px(x + 9, yy - 3, 42, 3, shade(bodyHi, 0.78));
  scr.px(x + 22, yy - 6, 17, 2, shade(trim, 0.66));
  scr.line(x + 29, yy - 6, x + 35, yy - 12, shade(trim, 0.52));

  // rigid shell silhouette
  scr.px(x + 3, yy + 1, 54, 30, body);
  scr.px(x + 0, yy + 7, 3, 20, shade(body, 0.86));
  scr.px(x + 57, yy + 6, 3, 21, shade(body, 0.86));
  scr.px(x + 5, yy + 2, 50, 4, bodyHi);
  scr.px(x + 4, yy + 28, 52, 3, shade(body, 0.66));

  // windows and door breaks sit on a strict 1 px grid
  for (let i = 0; i < 4; i++) {
    const wx = x + 7 + i * 12;
    scr.px(wx, yy + 8, 9, 11, glass);
    scr.px(wx, yy + 8, 9, 1, shade(trim, 0.42));
  }
  scr.px(x + 30, yy + 7, 1, 21, shade(trim, 0.42));
  scr.px(x + 43, yy + 7, 1, 21, shade(trim, 0.42));

  // lower trim and route panel
  scr.px(x + 5, yy + 22, 50, 2, trim);
  scr.px(x + 6, yy + 3, 11, 3, shade(trim, 0.74));

  // wheel animation is independent of the shell
  const phase = Math.floor(t * 10) & 1;
  const wheel = shade(PAL.INK, 1.35);
  for (const cx of [x + 14, x + 46]) {
    scr.disc(cx, yy + 32, 4, wheel);
    scr.px(cx - 2 + phase, yy + 31, 4, 1, shade(trim, 0.55));
    scr.px(cx - phase, yy + 29, 1, 4, shade(trim, 0.45));
  }

  // light layer is deliberately separate and pulse-driven
  const pulse = 0.58 + 0.42 * (0.5 + Math.sin(t * 3.1) * 0.5);
  scr.px(x + 54, yy + 23, 4, 3, shade(hot, pulse));
  scr.px(x + 2, yy + 23, 2, 2, shade(PAL.DEFENCE, 0.58));
}
