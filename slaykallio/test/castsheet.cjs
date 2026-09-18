// Slay Kallio — the CONTACT SHEET. Not a gate; it makes a picture for a person.
//
//   NODE_PATH=$(npm root -g) node slaykallio/test/castsheet.cjs [out.png] [ids...]
//
// WHY THIS EXISTS. This project has paid four times for the same thing: a
// figure that is fine in a fight and wrong at full size. The glowing
// chickenpox, the rat whose ear read as its eye, the boar-fur, the blob with
// two literal rectangles — every one of them passed a green suite and was
// obvious the moment somebody rendered the cast at 1:1 side by side.
// `__sk.debug.look()` paints one cutout at full size; this lays the whole row
// out on one sheet so they can be compared against each other, which is the
// only way to see that a set is in TWO registers rather than one.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0].replace(/^\/Suds-Jack(?=\/|$)/, '') || '/';
  const f = path.join(ROOT, url.endsWith('/') ? url + 'index.html' : url);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
const OUT = process.argv[2] || 'castsheet.png';
// The ten that are NOT people — ART_REQUEST §5, "the biggest remaining seam".
const DEFAULT = ['rat', 'bin_rat', 'boss_rat', 'blob', 'blob_spawn', 'tar_blob', 'pigeon', 'gull', 'gull_king', 'the_bear'];
const IDS = process.argv.length > 3 ? process.argv.slice(3) : DEFAULT;

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/slaykallio/`;
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__sk?.debug?.look, null, { timeout: 30000 });
  const data = await page.evaluate(async ids => {
    const shots = [];
    for (const id of ids) {
      let c = null;
      try { c = window.__sk.debug.look(id); } catch (e) { shots.push({ id, err: String(e) }); continue; }
      if (!c) { shots.push({ id, err: 'no canvas' }); continue; }
      // measure the INK, not the canvas - every one of these is 256x512 and the
      // question is how big the drawing inside it came out.
      const g2 = c.getContext('2d'); const d = g2.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++)
        if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      // THE WORLD SCALE, or this sheet lies. `look()` paints a TEXTURE, and the
      // size hierarchy between these figures lives on the puppet's world plane
      // (ENEMIES[id].scale). A sheet of raw textures shows ten same-sized
      // drawings and invites a "size fix" that then doubles the hierarchy and
      // makes the boss shorter than the hero. It is applied here instead.
      const world = (window.__sk.debug.enemyScale?.(id)) ?? 1;
      shots.push({ id, w: c.width, h: c.height, url: c.toDataURL('image/png'), world,
        ink: x1 < 0 ? null : { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, x1, y0, y1 } });
    }
    // lay them out on one sheet, on the dark the game actually shows them on
    const pad = 22, label = 18;
    const maxH = Math.max(...shots.map(s => (s.h || 60) * (s.world ?? 1)));
    const sheet = document.createElement('canvas');
    sheet.width = shots.reduce((a, s) => a + (s.w || 60) + pad, pad);
    sheet.height = maxH + pad * 2 + label;
    const g = sheet.getContext('2d');
    g.fillStyle = '#14181c'; g.fillRect(0, 0, sheet.width, sheet.height);
    let x = pad;
    for (const s of shots) {
      if (s.url) {
        const img = new Image(); img.src = s.url;
        await img.decode();
        const k = s.world ?? 1;                              // as it stands on the bridge
        g.drawImage(img, 0, 0, s.w, s.h, x + (s.w - s.w * k) / 2, pad + maxH - s.h * k, s.w * k, s.h * k);
      }
      g.fillStyle = '#c8d4dc'; g.font = '13px monospace'; g.textAlign = 'center';
      g.fillText(s.err ? `${s.id}: ${s.err}` : s.id, x + (s.w || 60) / 2, maxH + pad + 14);
      x += (s.w || 60) + pad;
    }
    return { sheet: sheet.toDataURL('image/png'), shots: shots.map(s => ({ id: s.id, w: s.w, h: s.h, err: s.err, ink: s.ink })) };
  }, IDS);
  fs.writeFileSync(OUT, Buffer.from(data.sheet.split(',')[1], 'base64'));
  for (const s of data.shots) {
    if (s.err) { console.log(`  ${s.id.padEnd(12)} ERROR ${s.err}`); continue; }
    const i = s.ink;
    const clip = i && (i.x0 <= 0 || i.x1 >= s.w - 1 || i.y0 <= 0) ? '  ** TOUCHES THE EDGE **' : '';
    console.log(`  ${s.id.padEnd(12)} ink ${String(i ? i.w : 0).padStart(3)}x${String(i ? i.h : 0).padStart(3)}${clip}`);
  }
  console.log(`\nwrote ${OUT}`);
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
