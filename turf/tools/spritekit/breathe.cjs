// Synthesise a breathing idle from ONE frame, in code.
//   node breathe.cjs <in.png> <outDir> [amplitudePx] [frames]
//
// WHY THIS IS NOT GENERATED. Four idle phases were generated and measured
// against a control: the SAME phase rolled twice. Same-phase pairs scored
// 0.956 and 0.887; opposite-phase pairs scored 0.903, 0.928 and 0.949. The
// ranges overlap completely — two rolls of one prompt can differ MORE than two
// rolls of opposite prompts. A breath is smaller than the generator's own
// roll-to-roll noise, so there is no threshold that tells a correct idle from
// four random rolls, and no amount of prompt work changes that: the signal is
// below the noise floor.
//
// So the breath is made deterministically instead. This is also just how
// hand-drawn sprite idles work: everything above the hips lifts a pixel or two
// and settles, the feet never move. Deterministic means zero drift, zero
// identity risk, zero cost, and a loop that closes exactly.
//
// The seam is the only subtlety. Lifting the top block leaves a 1px hole at
// the waist, so the row at the seam is repeated to fill it — a stretch of the
// waist, which is what a torso does when it fills with air.
const fs = require('fs'); const path = require('path');
const { load, blank, pixels, save, ink } = require(path.join(__dirname, 'img.cjs'));

const WAIST = 0.55;   // fraction of ink height, measured from the top: the lift line

(async () => {
  const [src, outDir, ampArg, nArg] = process.argv.slice(2);
  const amp = Number(ampArg || 2), n = Number(nArg || 4);
  fs.mkdirSync(outDir, { recursive: true });

  const o = await load(src);
  const b = ink(pixels(o), o.W, o.H);
  const seam = Math.round(b.y0 + (b.y1 - b.y0) * WAIST);

  // a full breath: up and back down, sampled so the loop closes without a
  // repeated frame at the seam
  const offsets = Array.from({ length: n }, (_, i) =>
    Math.round(amp * (1 - Math.cos(2 * Math.PI * i / n)) / 2));

  offsets.forEach((k, i) => {
    const out = blank(o.W, o.H);
    // legs and feet: untouched, so the ground contact never moves
    out.ctx.drawImage(o.canvas, 0, seam, o.W, o.H - seam, 0, seam, o.W, o.H - seam);
    // everything above the waist: lifted by k
    out.ctx.drawImage(o.canvas, 0, 0, o.W, seam, 0, -k, o.W, seam);
    // the hole the lift opened: fill it by repeating the seam row
    for (let j = 0; j < k; j++) out.ctx.drawImage(o.canvas, 0, seam - 1, o.W, 1, 0, seam - 1 - j, o.W, 1);
    save(out, path.join(outDir, `${String(i + 1).padStart(2, '0')}.png`));
  });
  console.log(`→ ${outDir}  ${offsets.length} frames, lift ${offsets.join('/')}px above ${Math.round(WAIST*100)}% of ink height`);
})();
