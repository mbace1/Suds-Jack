// Detect frame boundaries in a sprite strip by finding columns that are pure
// background, instead of assuming a uniform frame pitch. ART_REQUEST §2.2
// already measured that generated sheets do NOT hold a uniform pitch
// (129-222px within one row), so a fixed --cell slice cannot cut them.
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const [src, outPrefix] = process.argv.slice(2);
  const br = await chromium.launch();
  const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');
  const b64 = fs.readFileSync(src).toString('base64');
  const res = await pg.evaluate(async (url) => {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const W = c.width, H = c.height;
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
    return { W, H, spans, url: c.toDataURL('image/png') };
  }, `data:image/png;base64,${b64}`);

  console.log(`${src}: ${res.W}x${res.H}, ${res.spans.length} span(s) detected`);
  for (let i = 0; i < res.spans.length; i++) {
    const [x0, x1] = res.spans[i];
    console.log(`  frame ${i + 1}: x ${x0}..${x1}  (w ${x1 - x0 + 1})`);
    const out = `${outPrefix}${i + 1}.png`;
    const dataUrl = await pg.evaluate(async ({ url, x0, x1, H }) => {
      const img = new Image(); img.src = url; await img.decode();
      const w = x1 - x0 + 1;
      const c = document.createElement('canvas'); c.width = w; c.height = H;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      g.drawImage(img, x0, 0, w, H, 0, 0, w, H);
      return c.toDataURL('image/png');
    }, { url: res.url, x0, x1, H: res.H });
    fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  }
  await br.close();
})();
