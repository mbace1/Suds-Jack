// Toko Move — a marketing film from the REAL game (owner goal, 2026-09-26:
// "export cool MP4s that work as marketing for Toko and the games").
//
// Nothing here is staged art: it boots the shipping page on a phone-shaped
// viewport, takes a job, stands the courier at Hakaniemi (setup), boards a
// real tram 12 heading for the Crown Bridge through the game's own catch, and
// captures a frame every two game ticks while it crosses to Kruunuvuori. A title
// card and an end card are drawn with the brand's own modules (toko/js), and
// ffmpeg stitches it all into an H.264 MP4 that plays on any phone.
//
// TOKO IS THE CURRENT TOKO (owner, 2026-09-27: "the toko faces and logos
// should use the recent Toko", as in Helsinki Free Radio and Toko Live): the
// face traced from the owner's master (toko/js/master.js), and on the cards the
// CLAY badge Radio Free's films use (toko/js/toko3d.js, style 'clay', on twos —
// posed at 12 fps and re-lumped each hold). The logo is that traced face beside
// the logotype; lockup.js's drawLockup still draws the retired GEO face, so it
// is not used. The clay style has shipped on the SITE (gh-pages) and not yet on
// main, so render against the site tree — SITE_ROOT=/path/to/gh-pages — or the
// badge falls back to the enamel pin (and to the flat traced badge without
// WebGL). The run says which it got.
//
// Headless Chromium here has no H.264 encoder (WebCodecs offers VP9/AV1 only,
// which not every phone plays in an MP4), so encoding is ffmpeg's job. It is a
// capture-only dependency, never vendored — point FFMPEG at a binary:
//
//   SITE_ROOT=/path/to/gh-pages FFMPEG=/path/to/ffmpeg NODE_PATH=$(npm root -g) node toko-move/tools/film.cjs out.mp4
//
// Output: 1080×1920, 30 fps, ~18 s.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');

const ROOT = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '..', '..'));
const OUT = path.resolve(process.argv[2] || 'toko-move-crown-bridges.mp4');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30, TITLE_S = 2.2, END_S = 3.2, FADE = 0.4, TICKS_PER_FRAME = 2, MAX_FRAMES = 420;
const W = 405, H = 720, SCALE = 1080 / 405;   // a 9:16 phone, captured at 1080×1920

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const CARD = () => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  html,body{margin:0;width:${W}px;height:${H}px;background:#22282d;overflow:hidden}
  canvas{display:block;width:${W}px;height:${H}px}</style></head><body><canvas id="c"></canvas>
<script type="module">
import { drawMasterBadge, fillMaster, masterBounds } from '/toko/js/master.js';
import { drawLogotype } from '/toko/js/lockup.js';
import { TOKO, WAYS } from '/toko/js/palette.js';
const c = document.getElementById('c'), d = ${SCALE}; c.width = ${W} * d; c.height = ${H} * d;
const x = c.getContext('2d'), w = c.width, h = c.height, M = TOKO.MAGENTA, PAPER = TOKO.PAPER;
let t3d = null;
try { const { makeToko3D } = await import('/toko/js/toko3d.js?v=2'); t3d = await makeToko3D(720, { style: 'clay' }); } catch (e) { console.warn('toko3d unavailable', e); }
window.__toko = t3d ? t3d.style : 'flat';
const ease = k => { k = Math.min(1, Math.max(0, k)); const s = 1.7; return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2; };  // ease-out-back
// Toko, at (cx, cy) with disc radius R, at film time tt — on twos when clay
function toko(cx, cy, R, tt, grin = 1) {
  const held = Math.floor(tt * 12) / 12, pop = Math.max(0.01, ease(held / 0.45));
  const blink = (held % 2.2) > 1.9 ? 0.12 : 1;                          // a blink every couple of seconds
  const pose = { squash: blink, grin, pop, yaw: Math.sin(held * 1.7) * 0.22, pitch: Math.sin(held * 1.1) * 0.08, boil: Math.floor(tt * 12) };
  if (t3d) { const img = t3d.render(pose), size = R * 2 * t3d.half * pop; x.drawImage(img, cx - size / 2, cy - size / 2, size, size); }
  else drawMasterBadge(x, cx, cy, R * pop, { ground: WAYS.SIGN.ground, ink: WAYS.SIGN.ink, squash: blink, grin });
}
// the logo: the traced face beside the three-line logotype, both the same height
function logo(cx, y, fh, col) {
  const b = masterBounds(), fw = fh * b.w / b.h, size = fh / 3.12, gap = fh * 0.22;
  const tw = drawLogotype(new OffscreenCanvas(8, 8).getContext('2d'), 0, 0, size).w, x0 = cx - (fw + gap + tw) / 2;
  fillMaster(x, x0, y, fw, { color: col });
  drawLogotype(x, x0 + fw + gap, y, size, { color: col });
}
const T = (s, px, y, col = PAPER, weight = 900) => { x.font = weight + ' ' + px * d + 'px ui-monospace, monospace'; x.fillStyle = col; x.textAlign = 'center'; x.fillText(s, w / 2, y * d); };
window.paint = (kind, tt) => {
  x.fillStyle = '#22282d'; x.fillRect(0, 0, w, h);
  // the night map's water, and tram 12's teal over it — the Crown Bridge in one stroke
  x.fillStyle = '#1f3a52'; x.beginPath(); x.moveTo(0, h * .62); x.bezierCurveTo(w * .3, h * .56, w * .6, h * .7, w, h * .6); x.lineTo(w, h); x.lineTo(0, h); x.fill();
  x.strokeStyle = '#1c9595'; x.lineWidth = 7 * d; x.lineCap = 'round'; x.beginPath(); x.moveTo(-10, h * .66); x.bezierCurveTo(w * .35, h * .6, w * .6, h * .72, w + 10, h * .64); x.stroke();
  if (kind === 'title') {
    toko(w / 2, 140 * d, 52 * d, tt);
    T('TOKO MOVE', 44, 262);
    T('THE CROWN BRIDGES', 22, 310, M);
    T('ARE OPEN', 22, 340, M);
    T('Real Helsinki trams.', 15, 396, '#c9d3d6', 600);
    T('Tram 12, over the water,', 15, 420, '#c9d3d6', 600);
    T('to Kruunuvuori and Laajasalo.', 15, 444, '#c9d3d6', 600);
  } else {
    toko(w / 2, 165 * d, 64 * d, tt, 1.25);
    T('TOKO MOVE', 38, 296);
    T('Play free in the', 16, 344, '#c9d3d6', 600);
    T('Toko arcade', 22, 374, M);
    T('mbace1.github.io/Suds-Jack', 14, 408, PAPER, 700);
    logo(w / 2, 500 * d, 46 * d, PAPER);
    T('Transit data: HSL (CC BY 4.0)', 10, 640, '#8c979b', 500);
    T('Map: © OpenStreetMap contributors (ODbL)', 10, 656, '#8c979b', 500);
  }
};
window.__ready = true;
</script></body></html>`;

const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/__card') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(CARD()); }
  let p = path.join(ROOT, decodeURIComponent(u));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'toko-film-'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  try {
    // the cards are FILMED too, frame by frame, so the clay Toko moves on them
    await page.goto(`${base}/__card`); await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
    const tokoIs = await page.evaluate(() => window.__toko);
    for (const [k, secs] of [['title', TITLE_S], ['end', END_S]]) {
      for (let i = 0; i < Math.round(secs * FPS); i++) {
        await page.evaluate(([kk, tt]) => window.paint(kk, tt), [k, i / FPS]);
        await page.screenshot({ path: path.join(dir, `${k}${String(i).padStart(4, '0')}.png`) });
      }
    }
    // the real game, entered the way a thumb enters it
    await page.goto(`${base}/toko-move/?shift=3&day=none`);
    await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
    await page.tap('#play'); await page.waitForTimeout(400);
    await page.tap('#jobBoard .jobOffer:not([disabled])'); await page.waitForTimeout(300);
    // setup: stand at Hakaniemi bound for Kruunuvuori, and wait for a 12 heading over the bridge
    const boarded = await page.evaluate(() => {
      const tm = window.__tm, ch = tm.challenge, line = tm.city.lines.find(l => l.label === '12');
      const layer = tm.transit.layers.find(x => x.id === line.sourceId);
      tm.mobility.location = 'hakaniemi'; ch.currentTo = () => 'kruunuvuori';
      ch.active.limit = ch.elapsed() + 1500;   // a parcel with time for the crossing, so the film is not a lateness warning
      const idx = id => { const n = tm.city.resolved[id]; let bi = 0, bd = 1e9; layer.path.forEach((q, i) => { const d = (q[0] - n.lat) ** 2 + (q[1] - n.lon) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };
      const a = idx('hakaniemi'), dir = idx('kruunuvuori') > a ? 1 : -1;
      const plan = globalThis.__tmRouteChoiceCore.routeChoices(tm.city, 'hakaniemi', 'kruunuvuori', 3).find(c => c.legs[0].line.label === '12');
      for (let t = 0; t < 900; t++) { const near = tm.liveNetwork.nearestTo(layer, a, tm.flow.clock.tick, 2.2, dir);
        if (near) { const r = tm.mobility.catchChoice(plan, near.vehicle); return { ok: !r.error, error: r.error || null }; }
        tm.flow.runTicks(1); }
      return { ok: false, error: 'no tram 12 came' };
    });
    if (!boarded.ok) throw new Error(`could not board tram 12: ${boarded.error}`);
    // the film's clock is the only clock: one tick per frame, however long a
    // frame takes to capture (the game's own loop would otherwise run the ride
    // in real time between screenshots)
    await page.evaluate(() => window.__tm.flow.clock.setPaused(true));
    // close in, so the camera rides with the tram over the water
    await page.evaluate(() => window.__tm.camera.snapTo('stop')); await page.waitForTimeout(800);
    // one frame per tick until the courier is at Kruunuvuori; an event card is
    // left on screen for a second, then answered the generous way
    let n = 0, eventSince = null;
    for (let f = 0; f < MAX_FRAMES; f++) {
      const st = await page.evaluate(k => { const tm = window.__tm; tm.flow.runTicks(k); return { kind: tm.mobility.status().kind, ev: !!tm.events?.pending }; }, TICKS_PER_FRAME);
      if (st.ev) { eventSince ??= n; if (n - eventSince > FPS * 1.2) { await page.evaluate(() => window.__tm.events.choose(0)); eventSince = null; } }
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: path.join(dir, `f${String(n++).padStart(4, '0')}.png`) });
      if (st.kind === 'getoff') { for (let k = 0; k < FPS * 0.8; k++) { await page.waitForTimeout(30); await page.screenshot({ path: path.join(dir, `f${String(n++).padStart(4, '0')}.png`) }); } break; }
    }
    if (errs.length) throw new Error(`page errors: ${errs.join(' | ')}`);
    const playS = n / FPS;
    // title → ride → end, crossfaded; yuv420p + faststart so every phone plays it
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error',
      '-framerate', String(FPS), '-i', path.join(dir, 'title%04d.png'),
      '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.png'),
      '-framerate', String(FPS), '-i', path.join(dir, 'end%04d.png'),
      '-filter_complex',
      `[0:v]scale=1080:1920,setsar=1,format=yuv420p[a];[1:v]scale=1080:1920,setsar=1,format=yuv420p[b];[2:v]scale=1080:1920,setsar=1,format=yuv420p[c];` +
      `[a][b]xfade=transition=fade:duration=${FADE}:offset=${TITLE_S - FADE}[ab];[ab][c]xfade=transition=fade:duration=${FADE}:offset=${(TITLE_S + playS - 2 * FADE).toFixed(3)}[v]`,
      '-map', '[v]', '-c:v', 'libx264', '-profile:v', 'high', '-crf', '20', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', OUT]);
    console.log(`film: ${OUT} · ${n} gameplay frames (${playS.toFixed(1)} s) + cards · Toko: ${tokoIs} · ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB`);
  } catch (e) { console.error(`film failed: ${e.message}`); process.exitCode = 1; }
  await browser.close(); server.close(); fs.rmSync(dir, { recursive: true, force: true });
});
