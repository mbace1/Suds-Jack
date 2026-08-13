#!/usr/bin/env node
// EERI layer compositor: generated segment → the game's exact layer PNG.
//
// The asset contract (eeri/assets/README.md) wants ONE painting per layer
// covering a fixed world rect at PPU px/unit, with the depth tint already
// baked in. A generator makes a wide segment, not a 4096×180 strip, so this
// keys out the magenta backing, scales the segment by HEIGHT (never width —
// scaling by width would make a 16:9 segment 90 world units tall), tiles it
// across the rect, and mixes toward SKY_PALE by the layer's tint.
import { chromium } from '/tmp/claude-0/-home-user-Suds-Jack/8c6f8b94-82be-5dd4-8983-4375ef54b08e/scratchpad/node_modules/playwright/index.mjs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'

const PPU = 30;
const SKY_PALE = [0xc2, 0xe2, 0xf4];

// rect + tint from eeri/js/layers.js + palette.js; artH/groundY are the
// composition choices — how tall the art stands and where its feet land.
const LAYERS = [
  // `gap` is the multiplier on tile pitch: >1 leaves air between clusters.
  // The first pass butted every tile against the last and the near/fore lanes
  // became a solid wall of cones — the code placeholders were sparse on
  // purpose (bank at 2, pipes at 26, bank at 38…), and the art has to be too
  // or it competes with the playfield instead of sitting behind it.
  { name: 'skyline', src: 'L-skyline', x0: -30, x1: 130, y0: 0, y1: 30, tint: 0.58, artH: 19, groundY: 3.2, gap: 1.15 },
  { name: 'far',     src: 'L-far',     x0: -20, x1: 120, y0: 0, y1: 20, tint: 0.38, artH: 13, groundY: 2.2, gap: 1.35 },
  { name: 'mid',     src: 'L-mid',     x0: -12, x1: 110, y0: 0, y1: 14, tint: 0.20, artH: 7.5, groundY: 2.4, gap: 1.9 },
  { name: 'near',    src: 'L-near',    x0: -8,  x1: 104, y0: 0, y1: 8,  tint: 0.07, artH: 3.4, groundY: 2.7, gap: 2.6 },
  { name: 'fore',    src: 'L-fore',    x0: -8,  x1: 104, y0: -1, y1: 5, tint: 0.00, artH: 3.2, groundY: -1, gap: 3.4 },
];

await mkdir('out/layers', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();

for (const L of LAYERS) {
  const b64 = (await readFile(`out/eeri/${L.src}.jpg`)).toString('base64');
  const out = await page.evaluate(async ({ src, L, PPU, SKY_PALE }) => {
    const img = new Image(); img.src = src; await img.decode();

    // 1. key the magenta backing out of the segment
    const seg = document.createElement('canvas');
    seg.width = img.width; seg.height = img.height;
    const sg = seg.getContext('2d');
    sg.drawImage(img, 0, 0);
    const d = sg.getImageData(0, 0, seg.width, seg.height), px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      // magenta: red and blue high, green low
      if (r > 140 && b > 140 && g < 110 && Math.abs(r - b) < 90) { px[i + 3] = 0; continue; }
      // soften the fringe where the key is partial
      if (r > 120 && b > 120 && g < 150 && r + b - 2 * g > 120) px[i + 3] = 120;
    }
    sg.putImageData(d, 0, 0);

    // 2. lay it into the world rect, tiled by height-derived width
    const wU = L.x1 - L.x0, hU = L.y1 - L.y0;
    const cw = Math.min(4096, Math.round(wU * PPU)), ch = Math.round(hU * PPU);
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const g2 = cv.getContext('2d');
    const sx = cw / wU, sy = ch / hU;      // px per world unit after the 4096 cap

    const tileWU = L.artH * (seg.width / seg.height);
    const tilePxW = tileWU * sx, tilePxH = L.artH * sy;
    // y: world groundY is the BOTTOM of the art; canvas y grows downward
    const topPx = (L.y1 - (L.groundY + L.artH)) * sy;
    const pitch = tilePxW * (L.gap ?? 1);
    for (let x = 0, i = 0; x < cw; x += pitch, i++) {
      g2.save();
      if (i % 2 === 1) {                   // mirror alternate tiles: no obvious repeat
        g2.translate(x + tilePxW, topPx);
        g2.scale(-1, 1);
        g2.drawImage(seg, 0, 0, tilePxW, tilePxH);
      } else {
        g2.drawImage(seg, x, topPx, tilePxW, tilePxH);
      }
      g2.restore();
    }

    // 3. bake the depth tint: mix toward SKY_PALE, alpha untouched
    if (L.tint > 0) {
      const t = g2.getImageData(0, 0, cw, ch), tp = t.data;
      for (let i = 0; i < tp.length; i += 4) {
        if (!tp[i + 3]) continue;
        tp[i]     = tp[i]     + (SKY_PALE[0] - tp[i])     * L.tint;
        tp[i + 1] = tp[i + 1] + (SKY_PALE[1] - tp[i + 1]) * L.tint;
        tp[i + 2] = tp[i + 2] + (SKY_PALE[2] - tp[i + 2]) * L.tint;
      }
      g2.putImageData(t, 0, 0);
    }
    return { url: cv.toDataURL('image/png'), w: cw, h: ch };
  }, { src: `data:image/jpeg;base64,${b64}`, L, PPU, SKY_PALE });

  const dest = `out/layers/groundworks_${L.name}_v1.png`;
  await writeFile(dest, Buffer.from(out.url.split(',')[1], 'base64'));
  console.log(`${L.name.padEnd(8)} ${out.w}×${out.h}  tint ${L.tint}`);
}
await browser.close();
