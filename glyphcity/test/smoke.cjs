// GLYPH//CITY smoke gate — NODE_PATH=$(npm root -g) node glyphcity/test/smoke.cjs
//
// Driven off the game's own clock (?capture=1 + __gc.step), never the wall
// clock: under SwiftShader a frame is slow and timing off it is a coin flip.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m); } else { fail++; console.log('  FAIL ' + m); } };

(async () => {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    fs.readFile(p.endsWith('/') ? p + 'index.html' : p, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      const type = { '.html': 'text/html', '.js': 'text/javascript' }[path.extname(p)] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': type }); res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errors.push(m.text()); });

  await page.goto(`http://localhost:${port}/glyphcity/index.html?capture=1&w=960&h=540`);
  await page.waitForFunction(() => window.__gc, null, { timeout: 30000 });
  ok(true, 'boots and exposes __gc');

  const g = await page.evaluate(() => ({ cols: __gc.ascii.cols, rows: __gc.ascii.rows }));
  ok(g.cols >= 60 && g.rows >= 20, `a character grid of ${g.cols}x${g.rows}`);

  // the frame is painted, and it is not one flat colour
  const stats = await page.evaluate(() => {
    __gc.frame(1 / 30);
    const gl = __gc.renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let lit = 0; const seen = new Set();
    for (let i = 0; i < px.length; i += 4 * 7) {
      if (px[i] + px[i + 1] + px[i + 2] > 120) lit++;
      seen.add((px[i] >> 5) * 64 + (px[i + 1] >> 5) * 8 + (px[i + 2] >> 5));
    }
    return { lit, colours: seen.size };
  });
  ok(stats.lit > 500, `glyphs are drawn (${stats.lit} lit samples)`);
  ok(stats.colours > 12, `more than one colour in the frame (${stats.colours} buckets)`);

  // the HUD lives in the overlay grid
  const hudChars = await page.evaluate(() => {
    __gc.setMode('play', true); __gc.frame(1 / 30);
    const d = __gc.ascii.overlayData; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 32 && d[i] < 127) n++;
    return n;
  });
  ok(hudChars > 30, `the HUD is written into the grid (${hudChars} chars)`);

  // the autopilot plays: it picks up a shard and, given time, delivers
  const run = await page.evaluate(() => {
    let picked = false, delivered = false, sunk = 0;
    for (let i = 0; i < 30 * 90 && !delivered; i++) {
      __gc.step(1 / 30);
      sunk = Math.max(sunk, __gc.city.buildings.filter((b) => b.k < 0.5).length);
      if (__gc.S.carried > 0) picked = true;
      if (__gc.S.score > 0) delivered = true;
    }
    return { picked, delivered, sunk, score: __gc.S.score };
  });
  ok(run.picked, 'the autopilot picks up a shard');
  ok(run.delivered, `the autopilot delivers to an uplink (score ${run.score})`);

  // the runner never ends up inside a building
  const inside = await page.evaluate(() => {
    const { x, z } = __gc.S.pos;
    return __gc.city.boxes.some((b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ);
  });
  ok(!inside, 'the runner is on open ground');

  // the cutaway: whatever stands between the runner and the camera is sunk
  ok(run.sunk >= 1, `the cutaway sinks buildings in front of the runner (up to ${run.sunk} at once)`);

  // a searchlight raises the trace
  const trace = await page.evaluate(() => {
    __gc.setMode('play', false);           // hands off: nobody steers the runner out
    const d = __gc.drones[0];
    __gc.S.trace = 0; __gc.S.dash = 0; __gc.S.flat = 0; __gc.S.stun = 0;
    for (let i = 0; i < 20; i++) {
      __gc.S.pos.set(d.g.position.x, 0, d.g.position.z);
      __gc.step(1 / 30);
    }
    return __gc.S.trace;
  });
  ok(trace > 5, `standing in a searchlight raises the trace (${trace.toFixed(1)})`);

  // every palette renders a different picture
  const sums = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < __gc.PALETTES.length; i++) {
      __gc.setPalette(i); __gc.render();
      const gl = __gc.renderer.getContext();
      const px = new Uint8Array(4 * 64 * 64);
      gl.readPixels(200, 200, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let r = 0, gg = 0, b = 0;
      for (let k = 0; k < px.length; k += 4) { r += px[k]; gg += px[k + 1]; b += px[k + 2]; }
      out.push(`${r >> 8},${gg >> 8},${b >> 8}`);
    }
    return out;
  });
  ok(new Set(sums).size === sums.length, `${sums.length} palettes, ${new Set(sums).size} distinct pictures`);

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
