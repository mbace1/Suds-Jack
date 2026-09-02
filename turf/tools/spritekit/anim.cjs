// Animated preview export. A cycle can pass every static metric and still
// look wrong in motion — jitter, a limp, a hitch at the loop seam — so the
// pipeline ends in something you can actually watch, not another contact sheet.
//   node anim.cjs <out.gif> <dir> <scale> <delayMs> <frame...>
const { chromium } = require('playwright');
// gifenc is a CAPTURE-ONLY dependency and is deliberately not vendored into
// the game tree (same rule CLAUDE.md sets for scripts/enemy-loop.mjs): install
// it in scratch and expose it with NODE_PATH.
//   npm install --no-save --prefix /tmp/spritekit gifenc
//   NODE_PATH=/tmp/spritekit/node_modules node anim.cjs ...
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const fs = require('fs'); const path = require('path');

const BG = [34, 34, 38];   // neutral dark; sprites are binary-alpha so they need a ground

(async () => {
  const [out, dir, scaleArg, delayArg, ...files] = process.argv.slice(2);
  const scale = Number(scaleArg) || 2, delay = Number(delayArg) || 110;
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');

  const frames = [];
  for (const f of files) {
    const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
    const r = await pg.evaluate(async ({ url, scale, bg }) => {
      const i = new Image(); i.src = url; await i.decode();
      const W = i.width * scale, H = i.height * scale;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;                 // keep the pixel grid
      g.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
      g.fillRect(0, 0, W, H);
      g.drawImage(i, 0, 0, W, H);
      return { W, H, data: Array.from(g.getImageData(0, 0, W, H).data) };
    }, { url: `data:image/png;base64,${b64}`, scale, bg: BG });
    frames.push(r);
  }
  await br.close();

  const { W, H } = frames[0];
  // one palette for the whole clip: per-frame quantisation makes the colours
  // crawl between frames, which reads as noise on top of the animation
  const all = new Uint8Array(frames.length * W * H * 4);
  frames.forEach((f, i) => all.set(Uint8Array.from(f.data), i * W * H * 4));
  const palette = quantize(all, 255);

  const gif = GIFEncoder();
  for (const f of frames) {
    const idx = applyPalette(Uint8Array.from(f.data), palette);
    gif.writeFrame(idx, W, H, { palette, delay });
  }
  gif.finish();
  fs.writeFileSync(out, Buffer.from(gif.bytes()));
  console.log(`→ ${out}  ${W}x${H}  ${frames.length} frames @ ${delay}ms  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
})();
