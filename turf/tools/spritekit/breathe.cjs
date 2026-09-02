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
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');

const WAIST = 0.55;   // fraction of ink height, measured from the top: the lift line

(async () => {
  const [src, outDir, ampArg, nArg] = process.argv.slice(2);
  const amp = Number(ampArg || 2), n = Number(nArg || 4);
  fs.mkdirSync(outDir, { recursive: true });
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');
  const b64 = fs.readFileSync(src).toString('base64');

  // a full breath: up and back down, sampled so the loop closes without a
  // repeated frame at the seam
  const offsets = Array.from({ length: n }, (_, i) =>
    Math.round(amp * (1 - Math.cos(2 * Math.PI * i / n)) / 2));

  const out = await pg.evaluate(async ({ url, offsets, waist }) => {
    const im = new Image(); im.src = url; await im.decode();
    const W = im.width, H = im.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, W, H).data;
    let y0 = H, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
      if (d[(y * W + x) * 4 + 3] > 127) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const seam = Math.round(y0 + (y1 - y0) * waist);

    return offsets.map(k => {
      const o = document.createElement('canvas'); o.width = W; o.height = H;
      const og = o.getContext('2d'); og.imageSmoothingEnabled = false;
      // legs and feet: untouched, so the ground contact never moves
      og.drawImage(c, 0, seam, W, H - seam, 0, seam, W, H - seam);
      // everything above the waist: lifted by k
      og.drawImage(c, 0, 0, W, seam, 0, -k, W, seam);
      // the hole the lift opened: fill it by repeating the seam row
      for (let i = 0; i < k; i++) og.drawImage(c, 0, seam - 1, W, 1, 0, seam - 1 - i, W, 1);
      return o.toDataURL('image/png');
    });
  }, { url: `data:image/png;base64,${b64}`, offsets, waist: WAIST });

  out.forEach((u, i) => fs.writeFileSync(path.join(outDir, `${String(i + 1).padStart(2, '0')}.png`),
    Buffer.from(u.split(',')[1], 'base64')));
  await br.close();
  console.log(`→ ${outDir}  ${out.length} frames, lift ${offsets.join('/')}px above ${Math.round(WAIST*100)}% of ink height`);
})();
