// Radio Free Helsinki — fixed-grid distant city layer.
// Skyline only: no ground, water, reflections, labels, weather, or baked effects.
// Designed to sit behind independently animated street/harbour/roof scenes.

const W = 128;

const FAR = '#0b151b';
const MID = '#101d24';
const LIT = '#183039';

function building(scr, x, baseY, w, h, tone, roof = 0) {
  const y = baseY - h;
  scr.px(x, y, w, h, tone);
  if (roof === 1) {
    const half = Math.floor(w / 2);
    for (let i = 0; i < half; i++) scr.px(x + i, y - Math.floor(i * 0.35), 1, 1, tone);
    for (let i = half; i < w; i++) scr.px(x + i, y - Math.floor((w - i) * 0.35), 1, 1, tone);
  } else if (roof === 2) {
    scr.px(x + 3, y - 3, Math.max(2, w - 6), 3, tone);
  }
}

function windows(scr, x, y, w, h, phase, tone) {
  for (let yy = y + 5, row = 0; yy < y + h - 3; yy += 8, row++) {
    for (let xx = x + 4, col = 0; xx < x + w - 3; xx += 8, col++) {
      if (((row * 3 + col * 5 + phase) % 7) === 0) scr.px(xx, yy, 2, 2, tone);
    }
  }
}

export function drawFarCity(scr, t = 0, baseY = 66) {
  const drift = Math.floor((t * 0.22) % 96);
  const far = [
    {x:-12,w:25,h:24,r:1}, {x:17,w:18,h:30,r:0}, {x:43,w:23,h:22,r:2},
    {x:72,w:17,h:34,r:0}, {x:96,w:28,h:27,r:1}, {x:132,w:20,h:31,r:0},
  ];
  const near = [
    {x:-28,w:35,h:17,r:0}, {x:10,w:29,h:21,r:1}, {x:52,w:31,h:19,r:0},
    {x:88,w:36,h:23,r:2}, {x:137,w:29,h:18,r:1},
  ];

  for (const wrap of [0, 192]) {
    for (let i = 0; i < far.length; i++) {
      const b = far[i];
      const x = b.x - Math.floor(drift * 0.45) + wrap;
      building(scr, x, baseY, b.w, b.h, FAR, b.r);
      windows(scr, x, baseY - b.h, b.w, b.h, i, LIT);
    }
    for (let i = 0; i < near.length; i++) {
      const b = near[i];
      const x = b.x - drift + wrap;
      building(scr, x, baseY + 5, b.w, b.h, MID, b.r);
      windows(scr, x, baseY + 5 - b.h, b.w, b.h, i + 3, LIT);
    }
  }

  // Sparse Helsinki-style roof punctuation: chimneys and one small utility mast.
  const c = 31 - drift;
  for (const wrap of [0, 192]) {
    scr.px(c + wrap, baseY - 26, 3, 7, FAR);
    scr.px(c - 1 + wrap, baseY - 27, 5, 2, FAR);
    const m = 116 - drift + wrap;
    scr.px(m, baseY - 35, 1, 14, FAR);
    scr.px(m - 4, baseY - 31, 9, 1, FAR);
  }
}
