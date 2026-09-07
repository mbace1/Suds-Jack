// Detect frame boundaries in a sprite strip by finding columns that are pure
// background, instead of assuming a uniform frame pitch. ART_REQUEST §2.2
// already measured that generated sheets do NOT hold a uniform pitch
// (129-222px within one row), so a fixed --cell slice cannot cut them.
const fs = require('fs'); const path = require('path');
const { load, blank, pixels, save } = require(path.join(__dirname, 'img.cjs'));

(async () => {
  const [src, outPrefix] = process.argv.slice(2);
  const o = await load(src);
  const d = pixels(o), W = o.W, H = o.H;

  const isBg = (r, gg, b) => { const m = (r + b) / 2; return m > 60 && gg < m * 0.55; };
  // a column is "empty" if every pixel in it is background
  const empty = [];
  for (let x = 0; x < W; x++) {
    let e = true;
    for (let y = 0; y < H; y++) {
      const i = (y * W + x) * 4;
      if (!isBg(d[i], d[i + 1], d[i + 2])) { e = false; break; }
    }
    empty.push(e);
  }
  // runs of non-empty columns = frames
  const spans = []; let start = -1;
  for (let x = 0; x < W; x++) {
    if (!empty[x] && start < 0) start = x;
    if ((empty[x] || x === W - 1) && start >= 0) {
      const end = empty[x] ? x - 1 : x;
      if (end - start > W * 0.03) spans.push([start, end]);
      start = -1;
    }
  }

  console.log(`${src}: ${W}x${H}, ${spans.length} span(s) detected`);
  spans.forEach(([x0, x1], i) => {
    const w = x1 - x0 + 1;
    console.log(`  frame ${i + 1}: x ${x0}..${x1}  (w ${w})`);
    const c = blank(w, H);
    c.ctx.drawImage(o.canvas, x0, 0, w, H, 0, 0, w, H);
    save(c, `${outPrefix}${i + 1}.png`);
  });
})();
