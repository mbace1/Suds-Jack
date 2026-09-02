const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const [src, out] = process.argv.slice(2);
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');
  const b64 = fs.readFileSync(src).toString('base64');
  const u = await pg.evaluate(async ({ url }) => {
    const i = new Image(); i.src = url; await i.decode();
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.translate(i.width, 0); g.scale(-1, 1); g.drawImage(i, 0, 0);
    return c.toDataURL('image/png');
  }, { url: `data:image/png;base64,${b64}` });
  fs.writeFileSync(out, Buffer.from(u.split(',')[1], 'base64')); await br.close(); console.log('→ ' + out);
})();
