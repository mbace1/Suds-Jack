// Crop a region out of a source image, by fractions of its size.
//   node crop.cjs <src.png> <out.png> <x> <y> <w> <h>
//
// How character references are taken off the owner's casting sheets. The sheet
// IS the design; a re-generation of it is a copy with drift already in it.
const path = require('path');
const { load, blank, save } = require(path.join(__dirname, 'img.cjs'));
(async () => {
  const [src, out, x, y, w, h] = process.argv.slice(2);
  const o = await load(src);
  const f = [x, y, w, h].map(Number);
  const cx = Math.round(f[0] * o.W), cy = Math.round(f[1] * o.H);
  const cw = Math.round(f[2] * o.W), ch = Math.round(f[3] * o.H);
  const c = blank(cw, ch);
  c.ctx.drawImage(o.canvas, cx, cy, cw, ch, 0, 0, cw, ch);
  save(c, out);
  console.log(`${out}  src ${o.W}x${o.H} -> ${cw}x${ch}`);
})();
