// Does the sprite touch the edge of its cell?
//   node edge.cjs <dir-or-file>...
//
// This check should have existed from the first commit. Ink on the border of
// the cell means the figure was cropped by the frame — a knife tip cut off, a
// boot flattened against the bottom — and NOTHING else in this toolchain looks
// for it. phase.cjs compares silhouettes to each other, so two frames clipped
// the same way agree perfectly; drift.cjs measures the ink it can see, and
// cropped ink still has a bounding box. A clipped sprite passes every gate.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');

const TOL = 0;   // any ink on the border row/column counts

(async () => {
  const args = process.argv.slice(2);
  const files = [];
  for (const a of args) {
    if (fs.statSync(a).isDirectory()) for (const f of fs.readdirSync(a).sort())
      { if (f.endsWith('.png') && !f.startsWith('_')) files.push(path.join(a, f)); }
    else files.push(a);
  }
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');

  let bad = 0;
  for (const f of files) {
    const b64 = fs.readFileSync(f).toString('base64');
    const r = await pg.evaluate(async ({ url }) => {
      const i = new Image(); i.src = url; await i.decode();
      const W = i.width, H = i.height;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(i, 0, 0);
      const d = g.getImageData(0, 0, W, H).data;
      const on = (x, y) => d[(y * W + x) * 4 + 3] > 127;
      let top = 0, bottom = 0, left = 0, right = 0;
      for (let x = 0; x < W; x++) { if (on(x, 0)) top++; if (on(x, H - 1)) bottom++; }
      for (let y = 0; y < H; y++) { if (on(0, y)) left++; if (on(W - 1, y)) right++; }
      return { top, bottom, left, right, W, H };
    }, { url: `data:image/png;base64,${b64}` });
    const hits = Object.entries({ top: r.top, bottom: r.bottom, left: r.left, right: r.right })
      .filter(([, n]) => n > TOL);
    if (hits.length) {
      bad++;
      console.log(`CLIPPED  ${path.relative(process.cwd(), f).padEnd(62)} ${hits.map(([k, n]) => `${k}:${n}px`).join('  ')}`);
    }
  }
  await br.close();
  console.log(`\n${files.length} frames, ${bad} clipped`);
  process.exit(bad ? 1 : 0);
})();
