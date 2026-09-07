// Does the sprite touch the edge of its cell?
//   node edge.cjs <dir-or-file>...
//
// This check should have existed from the first commit. Ink on the border of
// the cell means the figure was cropped by the frame — a knife tip cut off, a
// boot flattened against the bottom — and NOTHING else in this toolchain looks
// for it. phase.cjs compares silhouettes to each other, so two frames clipped
// the same way agree perfectly; drift.cjs measures the ink it can see, and
// cropped ink still has a bounding box. A clipped sprite passes every gate.
const fs = require('fs'); const path = require('path');
const { load, pixels, edgeInk } = require(path.join(__dirname, 'img.cjs'));

(async () => {
  const args = process.argv.slice(2);
  const files = [];
  for (const a of args) {
    if (fs.statSync(a).isDirectory()) for (const f of fs.readdirSync(a).sort())
      { if (f.endsWith('.png') && !f.startsWith('_')) files.push(path.join(a, f)); }
    else files.push(a);
  }
  let bad = 0;
  for (const f of files) {
    const o = await load(f);
    const r = edgeInk(pixels(o), o.W, o.H);
    const hits = Object.entries({ top: r.top, bottom: r.bottom, left: r.left, right: r.right })
      .filter(([, n]) => n > 0);
    if (hits.length) {
      bad++;
      console.log(`CLIPPED  ${path.relative(process.cwd(), f).padEnd(62)} ${hits.map(([k, n]) => `${k}:${n}px`).join('  ')}`);
    }
  }
  console.log(`\n${files.length} frames, ${bad} clipped`);
  process.exit(bad ? 1 : 0);
})();
