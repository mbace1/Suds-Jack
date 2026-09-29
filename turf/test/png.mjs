// A minimal PNG reader for the gates — 8-bit, non-interlaced, RGBA or RGB —
// so the MST cut is asserted on the REAL plates in bare node, not on a
// synthetic square that proves nothing about a jacket. zlib does the
// inflating; this undoes the five per-row filters. Anything else throws, and
// the gate says which file.
import fs from 'node:fs';
import zlib from 'node:zlib';

export function readPng(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file}: not a PNG`);
  let pos = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === 'IHDR') { w = body.readUInt32BE(0); h = body.readUInt32BE(4); depth = body[8]; type = body[9]; interlace = body[12]; }
    else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8 || interlace || (type !== 6 && type !== 2)) throw new Error(`${file}: unsupported PNG (depth ${depth}, type ${type})`);
  const bpp = type === 6 ? 4 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let v = row[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[y * stride + x] = v & 255;
    }
  }
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = px[i * bpp]; data[i * 4 + 1] = px[i * bpp + 1]; data[i * 4 + 2] = px[i * bpp + 2];
    data[i * 4 + 3] = bpp === 4 ? px[i * bpp + 3] : 255;
  }
  return { data, w, h };
}

export function inkBounds({ data, w, h }, alpha = 40) {
  let top = null, bottom = 0, left = w, right = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > alpha) {
      if (top === null) top = y;
      bottom = y; if (x < left) left = x; if (x > right) right = x;
    }
  }
  return { top, bottom, left, right };
}
