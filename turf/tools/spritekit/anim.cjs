// Animated preview export. A cycle can pass every static metric and still
// look wrong in motion — jitter, a limp, a hitch at the loop seam — so the
// pipeline ends in something you can actually watch, not another contact sheet.
//   node anim.cjs <out.gif> <dir> <scale> <delayMs> <frame...>
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const fs = require('fs'); const path = require('path');
const { load, blank, pixels, createCanvas } = require(path.join(__dirname, 'img.cjs'));

const BG = [34, 34, 38];   // neutral dark; sprites are binary-alpha so they need a ground

(async () => {
  const [out, dir, scaleArg, delayArg, ...files] = process.argv.slice(2);
  const scale = Number(scaleArg) || 2, delay = Number(delayArg) || 110;

  const frames = [];
  for (const f of files) {
    const src = await load(path.join(dir, f));
    const W = src.W * scale, H = src.H * scale;
    const c = blank(W, H);                       // imageSmoothingEnabled is off in blank()
    c.ctx.fillStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`;
    c.ctx.fillRect(0, 0, W, H);
    c.ctx.drawImage(src.canvas, 0, 0, W, H);     // keep the pixel grid
    frames.push({ W, H, data: pixels(c) });
  }

  const { W, H } = frames[0];
  // one palette for the whole clip: per-frame quantisation makes the colours
  // crawl between frames, which reads as noise on top of the animation
  const all = new Uint8Array(frames.length * W * H * 4);
  frames.forEach((f, i) => all.set(f.data, i * W * H * 4));
  const palette = quantize(all, 255);

  const gif = GIFEncoder();
  for (const f of frames) {
    gif.writeFrame(applyPalette(f.data, palette), W, H, { palette, delay });
  }
  gif.finish();
  fs.writeFileSync(out, Buffer.from(gif.bytes()));
  console.log(`→ ${out}  ${W}x${H}  ${frames.length} frames @ ${delay}ms  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
})();
