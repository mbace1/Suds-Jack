// Kindling — the home-screen icons, drawn in code.
//
//   node kindling/tools/make-icons.mjs
//
// A PWA manifest needs real PNGs, which is the one place this repo's "no image
// assets" rule has to bend. So it bends the way the brand's SVGs do: the file is
// GENERATED from the drawing below, at both sizes, from the app's own palette —
// so a handed-over icon can never drift from what the app looks like. Re-run this
// after changing the palette and commit what it writes.
//
// No dependencies: a PNG is a zlib stream in four chunks, and node ships zlib.

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..');

// the app's own colours (kindling/art-src/palette.js), stated once
const C = {
  bg: [15, 11, 8],
  stone: [110, 92, 72],
  stoneDark: [66, 55, 42],
  mouth: [5, 6, 11],
  coal: [122, 47, 22],
  coalHot: [178, 72, 28],
  ember: [240, 162, 74],
  flame: [255, 199, 104],
  core: [255, 246, 226],
};

// ── the smallest correct PNG writer ────────────────────────────────────
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;        // 8 bits per channel
  ihdr[9] = 2;        // truecolour RGB
  // rows are filter byte 0 followed by RGB triplets
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixels[y * size + x];
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── the mark: a hearth, and the one bright thing in it ─────────────────
// Drawn on a 24×24 grid and scaled up in whole pixels, so it stays a pixel
// drawing at 192 and at 512 rather than becoming a smooth illustration.
const G = 24;

function mark() {
  const px = Array.from({ length: G * G }, () => C.bg);
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= G || y >= G) return;
    px[Math.round(y) * G + Math.round(x)] = c;
  };
  const rect = (x, y, w, h, c) => {
    for (let iy = 0; iy < h; iy++) for (let ix = 0; ix < w; ix++) set(x + ix, y + iy, c);
  };

  // the hearth: an arch, cut off by the bottom of the frame
  rect(3, 5, 18, 2, C.stone);                      // the mantel
  rect(3, 7, 3, 14, C.stone);                      // the jambs
  rect(18, 7, 3, 14, C.stone);
  rect(3, 7, 18, 1, C.stoneDark);
  for (let y = 10; y < 21; y += 4) { rect(3, y, 3, 1, C.stoneDark); rect(18, y, 3, 1, C.stoneDark); }
  rect(6, 7, 12, 14, C.mouth);                     // the mouth

  // the fire: a stack of flat bars, widest and whitest at the bottom — the same
  // one-colour-change-per-row idiom the game and the cabinet art both use
  const base = 19;
  // Widest and warmest at the bottom, a narrow tip at the top, and the white
  // heart is SMALL: a wide pale base read as a bowl of custard on the first cut.
  const ROWS = [
    [7, C.ember], [7, C.flame], [6, C.flame], [5, C.flame],
    [4, C.ember], [3, C.ember], [2, C.coalHot], [1, C.coalHot],
  ];
  ROWS.forEach(([w, c], i) => {
    const lean = i > 4 ? 1 : 0;                    // the tip leans, as a flame does
    rect(12 - Math.floor(w / 2) + lean, base - i, w, 1, c);
  });
  rect(11, base - 3, 2, 3, C.core);                // the heart of it
  rect(8, base + 1, 8, 1, C.coal);                 // the coals under it
  rect(9, base + 1, 2, 1, C.coalHot);
  rect(13, base + 1, 2, 1, C.coalHot);

  return px;
}

function scaled(size) {
  const src = mark();
  const k = size / G;
  const out = new Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      out[y * size + x] = src[Math.floor(y / k) * G + Math.floor(x / k)];
    }
  }
  return out;
}

for (const size of [192, 512]) {
  const file = path.join(OUT, `icon-${size}.png`);
  writeFileSync(file, png(size, scaled(size)));
  console.log(`wrote ${path.relative(process.cwd(), file)} (${size}×${size})`);
}
