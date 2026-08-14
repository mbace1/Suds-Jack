#!/usr/bin/env node
// A crafted surface as a DETAIL MAP, not a picture.
//
// ART_BRIEF §3.2 is "one palette — no asset invents a colour", so a generated
// card photo cannot be dropped on the playfield as-is: it would bring its own
// browns and fight the palette. Stripped to luminance and normalised into a
// narrow band around 1.0, it becomes a multiplier — the material keeps its
// exact palette colour and gains the card's creases, fluting and torn peels.
//
//   node detailmap.mjs <src.jpg> <out.png> [strength] [size] [highpass]
//
// strength is the map's full swing: 0.5 => 0.75…1.25 whatever the source's
// own contrast was. Above ~0.7 it reads as dirt rather than craft.
//
// highpass is a blur radius in source pixels; the blurred image is SUBTRACTED,
// so everything larger than the radius goes flat and only the material's own
// weave survives. It exists because **a detail map must not carry an object
// you can point at**: the earth's strata sources came back with brass split
// pins and masking-tape patches in them — correct for a piece, fatal for a
// map, because a map TILES. At a 3-unit repeat across 136 world units you
// could count the same pin forty-five times, and the ground read as printed
// wallpaper. The features are large and the fluting is fine, so one number
// separates them. 0 disables it.
const WORK = process.env.MESHY_WORK || '/tmp/meshy-work';
const { chromium } = await import(WORK + '/node_modules/playwright/index.mjs');
import { readFile, writeFile } from 'node:fs/promises'

const [src, out, strengthArg, sizeArg, hpArg] = process.argv.slice(2);
const STRENGTH = Number(strengthArg ?? 0.35), SIZE = Number(sizeArg ?? 512);
const HIGHPASS = Number(hpArg ?? 0);
const b64 = (await readFile(src)).toString('base64');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
const url = await page.evaluate(async ({ src, STRENGTH, SIZE, HIGHPASS }) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = SIZE;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, SIZE, SIZE);
  const d = g.getImageData(0, 0, SIZE, SIZE), p = d.data;
  // Luminance, then a HISTOGRAM STRETCH — not a scale about the mean.
  //
  // Scaling deviations about the mean preserves the SOURCE's contrast, which
  // is fine for a photo of corrugated card (luminance 40…230) and useless for
  // a photo of a white-painted board (230…250): the painted balsa map came
  // out ±4% however high the strength went, and the machines stayed smooth
  // plastic in a crafted world. Stretching the 5th–95th percentile to a fixed
  // band makes the map's contrast a property of the REQUEST, not of how well
  // lit the source happened to be.
  const lum = new Float32Array(SIZE * SIZE);
  for (let i = 0, j = 0; i < p.length; i += 4, j++) {
    lum[j] = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
  }
  // HIGH PASS — subtract everything coarser than the radius, so a pin, a
  // tape patch or an uneven light falloff cannot survive into a tiling map.
  // Two separable box passes approximate a gaussian closely enough here.
  if (HIGHPASS > 0) {
    const r = Math.max(1, Math.round(HIGHPASS));
    const blur = Float32Array.from(lum), tmp = new Float32Array(SIZE * SIZE);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < SIZE; y++) {            // horizontal
        let sum = 0, n = 0;
        for (let x = -r; x <= r; x++) { const q = Math.min(SIZE - 1, Math.max(0, x)); sum += blur[y * SIZE + q]; n++; }
        for (let x = 0; x < SIZE; x++) {
          tmp[y * SIZE + x] = sum / n;
          const add = Math.min(SIZE - 1, x + r + 1), sub = Math.max(0, x - r);
          sum += blur[y * SIZE + add] - blur[y * SIZE + sub];
        }
      }
      for (let x = 0; x < SIZE; x++) {            // vertical
        let sum = 0, n = 0;
        for (let y = -r; y <= r; y++) { const q = Math.min(SIZE - 1, Math.max(0, y)); sum += tmp[q * SIZE + x]; n++; }
        for (let y = 0; y < SIZE; y++) {
          blur[y * SIZE + x] = sum / n;
          const add = Math.min(SIZE - 1, y + r + 1), sub = Math.max(0, y - r);
          sum += tmp[add * SIZE + x] - tmp[sub * SIZE + x];
        }
      }
    }
    let mean = 0;
    for (let j = 0; j < lum.length; j++) mean += lum[j];
    mean /= lum.length;
    for (let j = 0; j < lum.length; j++) lum[j] = lum[j] - blur[j] + mean;
  }

  const sorted = Float32Array.from(lum).sort();
  const lo = sorted[Math.floor(sorted.length * 0.05)];
  const hi = sorted[Math.floor(sorted.length * 0.95)];
  const span = Math.max(1, hi - lo);
  for (let i = 0, j = 0; i < p.length; i += 4, j++) {
    // 0…1 across the stretched range, then centred on 1.0 ± STRENGTH/2
    const t = Math.max(0, Math.min(1, (lum[j] - lo) / span));
    const v = 255 * Math.max(0, Math.min(1, 1 - STRENGTH / 2 + t * STRENGTH));
    p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}, { src: `data:image/jpeg;base64,${b64}`, STRENGTH, SIZE, HIGHPASS });
await writeFile(out, Buffer.from(url.split(',')[1], 'base64'));
console.log(`→ ${out}`);
await browser.close();
