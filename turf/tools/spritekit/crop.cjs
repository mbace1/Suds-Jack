// node crop.cjs <src.png> <out.png> <x> <y> <w> <h>   (fractions 0..1 of the source)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [src, out, x, y, w, h] = process.argv.slice(2);
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');
  const b64 = fs.readFileSync(src).toString('base64');
  const r = await pg.evaluate(async ({ url, f }) => {
    const i = new Image(); i.src = url; await i.decode();
    const W = i.width, H = i.height;
    const cx = Math.round(f[0]*W), cy = Math.round(f[1]*H), cw = Math.round(f[2]*W), ch = Math.round(f[3]*H);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(i, cx, cy, cw, ch, 0, 0, cw, ch);
    return { url: c.toDataURL('image/png'), W, H, cw, ch };
  }, { url: `data:image/png;base64,${b64}`, f: [x, y, w, h].map(Number) });
  fs.writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
  await br.close();
  console.log(`${out}  src ${r.W}x${r.H} -> ${r.cw}x${r.ch}`);
})();
