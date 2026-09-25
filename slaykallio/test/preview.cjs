// Slay Kallio — the VISUAL PREVIEW. Not a gate; it makes pictures for a person.
//
//   NODE_PATH=$(npm root -g) node slaykallio/test/preview.cjs [outDir]
//
// Why it exists: this project's own rule is that "a gate that certifies works
// cannot see looks", and every look change since v10 found its real faults in a
// screenshot rather than in a green suite. CI could run the suites and never
// the screenshot, so a pull request showed pass counts and nobody the picture.
// This renders the pictures a reviewer needs — the drawn cast on one sheet, and
// one fight in both formats, smooth and pixel — and the preview workflow
// uploads them with the run.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.resolve(process.argv[2] || 'preview');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0].replace(/^\/Suds-Jack(?=\/|$)/, '') || '/';
  const f = path.join(ROOT, url.endsWith('/') ? url + 'index.html' : url);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] ?? 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});

(async () => {
  // the drawn cast, through the contact sheet this repo already has
  execFileSync(process.execPath, [path.join(__dirname, 'castsheet.cjs'), path.join(OUT, 'cast-animals.png')], { stdio: 'inherit' });
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/slaykallio/`;
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const shots = [];
  // an act-three fight at night: the torch, the rank light, a person and animals
  for (const [tag, w, h] of [['landscape', 1280, 720], ['portrait', 390, 844]]) {
    for (const frame of ['smooth', 'pixel']) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(`${base}?seed=7&frame=${frame}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__sk?.arena, null, { timeout: 30000 });
      await page.evaluate(() => { __sk.setSpeed(0); __sk.start('cart', 4); __sk.debug.jumpTo(35); __sk.flush(); });
      await page.waitForTimeout(2500);
      const file = `fight-${tag}-${frame}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      shots.push(file);
      await page.close();
    }
  }
  await browser.close(); server.close();
  // a summary a CI job can print as-is
  fs.writeFileSync(path.join(OUT, 'README.md'), [
    '# Slay Kallio preview', '',
    '- `cast-animals.png` — the ten drawn animals at world scale', ...shots.map(f => `- \`${f}\``), '',
  ].join('\n'));
  console.log(`wrote ${shots.length + 1} pictures to ${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });
