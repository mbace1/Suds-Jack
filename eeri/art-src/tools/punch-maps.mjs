#!/usr/bin/env node
// EERI — give the detail maps enough contrast to survive being multiplied.
//
//   node art-src/tools/punch-maps.mjs <outDir> [--apply]
//
// THE ARITHMETIC THAT MAKES THIS NECESSARY. craft.js's whole scheme is that a
// detail map is greyscale and MULTIPLIES the palette colour (§3.2 — the map
// never supplies a colour). Multiplication scales variance by the surface's
// own brightness: the earth's browns sit near luminance 55, and the shipped
// maps measure std/mean ≈ 0.09-0.12, so the texture that reaches the screen
// is 55 × 0.10 ≈ 5 luminance levels of variation. The eye needs roughly three
// times that to read a MATERIAL rather than a tint — measured off the same
// build: the sky and midground read at std ≈ 21, the earth at 8.6. The maps
// were authored on white, judged on white, and quietly died on brown.
//
// So: a mean-anchored contrast stretch, clamped to [0,255]. Mean-anchored
// because the mean IS the surface's brightness under multiply — stretching
// around anything else repaints every material a shade darker or lighter and
// that is the palette's job, not the map's. Highs clamp at 255 (a multiply
// map cannot brighten past the colour), so in practice the stretch deepens
// the grooves, which is exactly what card flutes and packed earth want.
//
// Factors are per material, not one number: the earth sections carry the
// story ("the earth is not textured" — owner, 2026-08-19) and get the full
// push; felt stays quietest because a loud felt reads as terry cloth.
//
// The output must still TILE — a stretch is per-pixel so it cannot break
// tiling, but LOOK anyway: the tool emits a 3x3 tiled contact sheet beside
// the maps, because "tile it 3x3 and LOOK" is the only test that shows it.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = process.argv[2] || path.join(ROOT, 'assets', '2d');
mkdirSync(OUT, { recursive: true });

// name → [source file, stretch factor]
const MAPS = {
  topsoil:     ['topsoil_detail_v1.png', 2.6],
  strata:      ['mid_detail_v1.png',     2.6],
  packed:      ['packed_detail_v1.png',  2.6],
  gritty:      ['gritty_detail_v1.png',  2.6],
  flute:       ['flute_detail_v1.png',   2.2],
  card:        ['card_detail_v1.png',    2.2],
  balsa:       ['balsa_detail_v1.png',   2.4],   // std/mean 0.045 — near-blank
  felt:        ['felt_detail_v1.png',    1.8],
};

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await br.newPage();
await pg.goto('data:text/html,<body>');

for (const [name, [src, k]] of Object.entries(MAPS)) {
  const b64 = readFileSync(path.join(ROOT, 'assets', '2d', src)).toString('base64');
  const res = await pg.evaluate(async ({ b64, k }) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    let s = 0, n = 0;
    for (let i = 0; i < p.length; i += 4) { s += 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; n++; }
    const mean = s / n;
    let s2 = 0;
    for (let i = 0; i < p.length; i += 4) {
      for (let ch = 0; ch < 3; ch++) {
        p[i + ch] = Math.max(0, Math.min(255, mean + (p[i + ch] - mean) * k));
      }
      const L = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2];
      s2 += (L - mean) * (L - mean);
    }
    g.putImageData(d, 0, 0);
    // WRAP-BLEND the edges: crossfade the last N pixels into the first N on
    // both axes. The stretch amplifies everything, including the faint seam a
    // source map already had — `packed` showed a vertical line every repeat
    // once stretched. A multiply map may not have a seam at any strength, and
    // blending in wrap space fixes it without touching the interior.
    {
      const N = 10;
      const d2 = g.getImageData(0, 0, c.width, c.height), q = d2.data;
      const W = c.width, H = c.height;
      const px = (x, y) => (y * W + x) * 4;
      for (let y = 0; y < H; y++) for (let e = 0; e < N; e++) {
        const t = (e + 1) / (N + 1), a = px(e, y), b = px(W - N + e, y);
        for (let ch = 0; ch < 3; ch++) {
          const va = q[a + ch], vb = q[b + ch];
          q[a + ch] = va * (0.5 + t / 2) + vb * (0.5 - t / 2);
          q[b + ch] = vb * (0.5 + t / 2) + va * (0.5 - t / 2);
        }
      }
      for (let x = 0; x < W; x++) for (let e = 0; e < N; e++) {
        const t = (e + 1) / (N + 1), a = px(x, e), b = px(x, H - N + e);
        for (let ch = 0; ch < 3; ch++) {
          const va = q[a + ch], vb = q[b + ch];
          q[a + ch] = va * (0.5 + t / 2) + vb * (0.5 - t / 2);
          q[b + ch] = vb * (0.5 + t / 2) + va * (0.5 - t / 2);
        }
      }
      g.putImageData(d2, 0, 0);
    }
    // the 3x3 tile sheet, because tiling is the property most worth an eye
    const t = document.createElement('canvas'); t.width = c.width * 3 / 2; t.height = c.height * 3 / 2;
    const tg = t.getContext('2d');
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      tg.drawImage(c, x * c.width / 2, y * c.height / 2, c.width / 2, c.height / 2);
    }
    return { url: c.toDataURL('image/png'), tile: t.toDataURL('image/png'),
             mean: +mean.toFixed(0), std: +Math.sqrt(s2 / n).toFixed(1) };
  }, { b64, k });
  const out = src.replace('_v1', '_v2').replace('mid_detail_v1', 'mid_detail_v2');
  writeFileSync(path.join(OUT, out), Buffer.from(res.url.split(',')[1], 'base64'));
  writeFileSync(path.join(OUT, name + '_tiled.png'), Buffer.from(res.tile.split(',')[1], 'base64'));
  console.log(`${name.padEnd(9)} ×${k}  mean ${res.mean}  std → ${res.std}  (${(res.std / res.mean).toFixed(3)})  → ${out}`);
}
await br.close();
