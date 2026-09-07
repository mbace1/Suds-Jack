// Mirror an image horizontally.
//   node flip.cjs <in.png> <out.png>
//
// Used on an attack clip's REFERENCE, not on its frames. Facing is set by the
// reference image, not by the prompt: a weapon carried on the character's
// screen-left drags the whole body round with it, and an explicit facing lock
// in words failed twice where mirroring the reference worked first try.
const path = require('path');
const { load, blank, save } = require(path.join(__dirname, 'img.cjs'));
(async () => {
  const [src, out] = process.argv.slice(2);
  const o = await load(src);
  const c = blank(o.W, o.H);
  c.ctx.translate(o.W, 0); c.ctx.scale(-1, 1); c.ctx.drawImage(o.canvas, 0, 0);
  save(c, out);
  console.log('→ ' + out);
})();
