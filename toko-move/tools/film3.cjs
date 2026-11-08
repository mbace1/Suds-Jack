// Toko Move — the TRAILER, from the v3 journey (v3.8). tools/film.cjs filmed
// the real-time game; this films the card journey a stranger now meets first,
// the way stills3.cjs shoots its stills: the STORE BUILD (package-itch.mjs,
// unzipped alone), a phone, every screen reached by a tap, a pinned seed per
// scene and the save a player would have by then. Nothing is mocked up. The
// title, the captions and the end card are drawn here, from the game's own
// scene layers and the brand's own lockup; the only thing laid over the game
// is a fading ring where a thumb taps.
//
// THE FILM'S CLOCK IS THE ONLY CLOCK. A frame costs a second or more to
// capture under SwiftShader, and the journey moves on timers,
// requestAnimationFrame, CSS keyframes, transitions and el.animate(). So the
// page runs on VIRTUAL TIME: an init script swaps performance.now, Date.now,
// setTimeout, setInterval and requestAnimationFrame for a clock that moves only
// when the film steps it, and the DevTools animation timeline is held at rate 0
// while every animation's currentTime is set from that clock each frame — so a
// transition ends, and its promise resolves, on the frame it should. Nothing in
// the game knows; a frame is exactly 1/30 s of the game however long it took.
//
// THE SOUND IS THE GAME'S OWN. Every cue and weather bed the journey plays is
// logged at its film time, then js/audio.js itself is run into an
// OfflineAudioContext that suspends at each cue's moment and plays it there:
// the same synthesis and the same master gain, rendered faster than real time.
// The title rings a tram in, a caption deals a card, the end card is the act's
// fanfare — all of them cues the game already has.
//
// Headless Chromium has no H.264 encoder, so ffmpeg stitches it (a capture-only
// dependency, never vendored):
//
//   FFMPEG=ffmpeg NODE_PATH=$(npm root -g) node toko-move/tools/film3.cjs [out.mp4] [--landscape] [--draft] [--url=…] [--progress]
//
// Portrait is 1080×1920 (405×720 CSS), --landscape 1920×1080 (960×540 CSS);
// both 30 fps, ~40 s, H.264 + AAC, faststart. --draft captures at 1× as JPEG
// to check the cut quickly. --url sets the end card's address (the itch page,
// once it exists). --progress stamps the build and what is new in it (VERSIONS.md).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');

const args = process.argv.slice(2), flag = f => args.includes(f), opt = (k, d) => (args.find(a => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=') || d;
const LAND = flag('--landscape'), DRAFT = flag('--draft');
const OUT = path.resolve(args.find(a => !a.startsWith('--')) || (LAND ? 'toko-move-trailer-169.mp4' : 'toko-move-trailer.mp4'));
const URL_TEXT = opt('url', 'mbace1.github.io/Suds-Jack/toko-move');
// --progress: the cut that SHOWS PROGRESS (owner, 2026-11-06: "The trailer is
// great way to communicate progress"). The title wears the build's number and
// the end card says what is new in it — both read from VERSIONS.md's top
// entry, its `## vX` heading and its bold headline, so the film cannot claim a
// release the log does not.
const PROGRESS = flag('--progress') ? (() => { const log = fs.readFileSync(path.join(__dirname, '..', 'VERSIONS.md'), 'utf8');
  const m = log.match(/^## v([0-9.]+)[^\n]*\n+\*\*([^*]+)\*\*/m); if (!m) throw new Error('--progress: no "## vX" + **HEADLINE** at the top of VERSIONS.md');
  const head = m[2].trim().toLowerCase().replace(/^\w/, c => c.toUpperCase()); return { v: m[1], what: head }; })() : null;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30, FADE = 0.3, DT = 1000 / FPS;
const W = LAND ? 960 : 405, H = LAND ? 540 : 720, DPR = DRAFT ? 1 : (LAND ? 2 : 1080 / 405);
const even = v => 2 * Math.round(v / 2);                                   // yuv420p wants even sides (a 1× portrait is 405 wide)
const VW = even(W * DPR), VH = even(H * DPR), EXT = DRAFT ? 'jpg' : 'png';
const ONLY = opt('only', '') ? opt('only', '').split(',') : null, wanted = name => !ONLY || ONLY.some(o => name.includes(o)), DEBUG = !!process.env.DEBUG;

const REPO = path.resolve(__dirname, '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'toko-film3-'));
execFileSync('node', [path.join(REPO, 'toko-move/tools/package-itch.mjs'), path.join(TMP, 'pkg.zip'), '--dir', path.join(TMP, 'site')], { cwd: REPO, stdio: 'inherit' });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };

// ── the virtual clock (installed before any page script) ───────────────────
function SHIM() {
  const R = { st: setTimeout.bind(window), raf: requestAnimationFrame.bind(window), now: performance.now.bind(performance), dnow: Date.now };
  let now = R.now(); const off = R.dnow() - now;
  let seq = 1; const timers = new Map(), rafs = new Map();
  performance.now = () => now; Date.now = () => Math.floor(now + off);
  window.setTimeout = (fn, ms, ...a) => { const id = seq++; timers.set(id, { at: now + Math.max(0, Number(ms) || 0), fn, a, id }); return id; };
  window.setInterval = (fn, ms, ...a) => { const e = Math.max(4, Number(ms) || 0), id = seq++; timers.set(id, { at: now + e, fn, a, every: e, id }); return id; };
  window.clearTimeout = window.clearInterval = id => { timers.delete(id); };
  window.requestAnimationFrame = fn => { const id = seq++; rafs.set(id, fn); return id; };
  window.cancelAnimationFrame = id => { rafs.delete(id); };
  // every running animation's time, from the virtual clock: born when first
  // seen (minus whatever it had already played), re-born if the page rewinds it
  const seen = new WeakMap();
  function anims() {
    for (const an of document.getAnimations()) {
      if (an.playState === 'paused' || an.playState === 'idle') continue;
      const rate = an.playbackRate || 1, ct = an.currentTime ?? 0;
      let s = seen.get(an);
      if (!s || Math.abs(ct - s.set) > 0.5) { s = { born: now - ct / rate, set: ct }; seen.set(an, s); }
      an.currentTime = (now - s.born) * rate; s.set = an.currentTime ?? 0;
    }
  }
  const yieldReal = () => new Promise(r => R.st(r, 0));
  async function step(ms) {
    const end = now + ms;
    for (let guard = 0; guard < 400; guard++) {
      let next = null;
      for (const t of timers.values()) if (t.at <= end && (!next || t.at < next.at || (t.at === next.at && t.id < next.id))) next = t;
      if (!next) break;
      now = Math.max(now, next.at);
      if (next.every) next.at += next.every; else timers.delete(next.id);
      try { if (typeof next.fn === 'function') next.fn(...next.a); } catch (e) { console.error(e); }
      anims(); await yieldReal();
    }
    now = end;
    const cbs = [...rafs.values()]; rafs.clear();
    for (const f of cbs) { try { f(now); } catch (e) { console.error(e); } }
    anims(); await yieldReal(); anims();
    await new Promise(r => R.raf(() => R.raf(r)));           // a real frame painted before the shot
  }
  window.__vt = { step, now: () => now };
}

// ── the cards: title, captions, end — drawn, not shot ──────────────────────
const LAYERS = ['01-backdrop', '01b-land-kauppatori', '01c-wheel', '02-street', '03-tram-nr2', '04-shelter', '05-people', '06-courier'];
const DEPTH = [0.15, 0.25, 0.3, 0.55, 0.7, 0.8, 0.9, 1];
const CARDS = () => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;width:${W}px;height:${H}px;background:#f4f1e8;overflow:hidden}canvas{display:block;width:${W}px;height:${H}px}</style></head><body><canvas id="c"></canvas>
<script type="module">
import { drawLockup } from '/toko/js/lockup.js';
const W = ${W}, H = ${H}, d = ${DPR}, LAND = ${LAND}, PROGRESS = ${JSON.stringify(PROGRESS)};
const c = document.getElementById('c'); c.width = Math.round(W * d); c.height = Math.round(H * d);
const x = c.getContext('2d'), w = c.width, h = c.height;
const INK = '#15262b', SOFT = '#3a474c', PAPER = '#f4f1e8', CYAN = '#33b2d2';
const FONT = "Inter,system-ui,-apple-system,'Segoe UI',sans-serif", MONO = 'ui-monospace, monospace';
const load = async src => { const i = new Image(); i.src = src; await i.decode(); return i; };
const layers = await Promise.all(${JSON.stringify(LAYERS)}.map(l => load('/toko-move/scenes/stop/' + (LAND ? '169' : '916') + '/' + l + '.webp')));
const DEPTH = ${JSON.stringify(DEPTH)};
const clamp = k => Math.min(1, Math.max(0, k)), out3 = k => 1 - (1 - clamp(k)) ** 3;
const back = k => { k = clamp(k); const s = 1.6; return 1 + (s + 1) * (k - 1) ** 3 + s * (k - 1) ** 2; };
function text(s, px, X, Y, col, { weight = 900, font = MONO, align = 'left', ls = 0, alpha = 1, rise = 0 } = {}) {
  x.save(); x.globalAlpha = alpha; x.font = weight + ' ' + px * d + 'px ' + font; x.fillStyle = col; x.textAlign = align; x.letterSpacing = ls * d + 'px';
  x.fillText(s, X * d, (Y + rise) * d); const m = x.measureText(s).width / d; x.restore(); return m;
}
// the stop, drifting: each layer at its own depth, so the street slides past the sky
function stop(t, zoom = 1.08) {
  const im = layers[0], s = Math.max(w / im.width, h / im.height) * (zoom + 0.012 * t);
  layers.forEach((L, i) => { const dx = -t * 7 * d * DEPTH[i]; const sw = L.width * s, sh = L.height * s;
    x.drawImage(L, (w - sw) / 2 + dx + 6 * d, (h - sh) / 2, sw, sh); });
}
function wordmark(X, Y, px, t, t0) {
  const k = clamp((t - t0) / 0.35), a = out3(k);
  const tw = text('TOKO MOVE', px, X, Y, INK, { ls: 2, alpha: a, rise: (1 - a) * 10 });
  const p = back((t - t0 - 0.3) / 0.35);
  if (p > 0) { x.fillStyle = CYAN; x.beginPath(); x.arc((X + tw + px * 0.17) * d, (Y - px * 0.12) * d, px * 0.12 * d * p, 0, Math.PI * 2); x.fill(); }
  return tw;
}
window.paint = (kind, t, line = '') => {
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = PAPER; x.fillRect(0, 0, w, h);
  if (kind === 'title') {
    stop(t);
    const top = LAND ? 0.66 : 0.7, g = x.createLinearGradient(0, h * (top - 0.08), 0, h);
    g.addColorStop(0, 'rgba(244,241,232,0)'); g.addColorStop(0.35, 'rgba(244,241,232,.93)'); g.addColorStop(1, 'rgba(244,241,232,.99)');
    x.fillStyle = g; x.fillRect(0, h * (top - 0.08), w, h);
    const X = LAND ? 48 : 26, Y = H * (LAND ? 0.83 : 0.84), px = LAND ? 64 : 48;
    wordmark(X, Y, px, t, 0.35);
    const a = out3((t - 0.95) / 0.4);
    text('Act 1 · Helsinki', LAND ? 22 : 18, X, Y + (LAND ? 38 : 32), INK, { weight: 800, font: FONT, alpha: a, rise: (1 - a) * 8 });
    const b = out3((t - 1.3) / 0.4);
    text("A courier's shift, one card at a time.", LAND ? 17 : 14.5, X, Y + (LAND ? 66 : 56), SOFT, { weight: 600, font: FONT, alpha: b, rise: (1 - b) * 8 });
    if (PROGRESS) { const a2 = out3((t - 0.6) / 0.35), lbl = 'v' + PROGRESS.v, px2 = LAND ? 18 : 15; x.font = '800 ' + px2 * d + 'px ' + MONO; const tw2 = x.measureText(lbl).width / d;
      const cy = Y - px * 0.95 - (px2 + 14) - 10;   // above the wordmark's cap height, clear of it
      x.globalAlpha = a2; x.fillStyle = INK; x.beginPath(); x.roundRect(X * d, cy * d, (tw2 + 20) * d, (px2 + 14) * d, 8 * d); x.fill(); x.globalAlpha = 1;
      text(lbl, px2, X + 10, cy + px2 + 3, PAPER, { weight: 800, alpha: a2 }); }
  } else if (kind === 'cap') {
    const a = out3(t / 0.32), px = LAND ? 40 : 27, words = line.split(' '), lines = [];
    x.font = '800 ' + px * d + 'px ' + FONT;
    let cur = ''; for (const wd of words) { const tr = cur ? cur + ' ' + wd : wd; if (x.measureText(tr).width / d > W - 64 && cur) { lines.push(cur); cur = wd; } else cur = tr; } lines.push(cur);
    const lh = px * 1.2, y0 = H / 2 - (lines.length - 1) * lh / 2 + px * 0.35;
    lines.forEach((l, i) => text(l, px, W / 2, y0 + i * lh, INK, { weight: 800, font: FONT, align: 'center', alpha: clamp(a * 1.2 - i * 0.12), rise: (1 - a) * 14 }));
    const p = back((t - 0.25) / 0.3); if (p > 0) { x.fillStyle = CYAN; x.beginPath(); x.arc(w / 2, (y0 + (lines.length - 1) * lh + px * 0.9) * d, 5 * d * p, 0, Math.PI * 2); x.fill(); }
  } else {
    const X = W / 2, mid = LAND ? H * 0.36 : H * 0.36, px = LAND ? 72 : 50;
    x.font = '900 ' + px * d + 'px ' + MONO; x.letterSpacing = 2 * d + 'px'; const tw = x.measureText('TOKO MOVE').width / d; x.letterSpacing = '0px';
    wordmark(X - tw / 2 - px * 0.15, mid, px, t, 0.1);
    const a = out3((t - 0.55) / 0.4), b = out3((t - 0.85) / 0.4), e = out3((t - 1.15) / 0.4);
    text('Act 1 · Helsinki', LAND ? 24 : 19, X, mid + (LAND ? 46 : 38), INK, { weight: 800, font: FONT, align: 'center', alpha: a });
    if (PROGRESS) { const p2 = out3((t - 0.7) / 0.4); text('NEW IN v' + PROGRESS.v, LAND ? 15 : 12.5, X, mid + (LAND ? 82 : 68), CYAN, { weight: 800, font: MONO, align: 'center', alpha: p2, ls: 1.5 });
      text(PROGRESS.what, LAND ? 22 : 17, X, mid + (LAND ? 110 : 92), INK, { weight: 800, font: FONT, align: 'center', alpha: p2 }); }
    const shift = PROGRESS ? (LAND ? 52 : 46) : 0;
    text('Play free', LAND ? 20 : 16, X, mid + (LAND ? 110 : 96) + shift, SOFT, { weight: 600, font: FONT, align: 'center', alpha: b });
    text(${JSON.stringify(URL_TEXT)}, LAND ? 22 : 15, X, mid + (LAND ? 140 : 122) + shift, CYAN, { weight: 800, font: MONO, align: 'center', alpha: b });
    const fh = LAND ? 64 : 54, lw = drawLockup(new OffscreenCanvas(8, 8).getContext('2d'), 0, 0, fh * d).w;
    x.globalAlpha = e; drawLockup(x, w / 2 - lw / 2, (H - (LAND ? 160 : 210)) * d, fh * d, { color: INK }); x.globalAlpha = 1;
    text('Transit data: HSL (CC BY 4.0) · Map: © OpenStreetMap contributors (ODbL)', LAND ? 12 : 9.5, X, H - (LAND ? 34 : 30), '#7b8589', { weight: 500, font: FONT, align: 'center', alpha: e });
  }
};
window.__ready = true;
</script></body></html>`;

// ── offline sound: the game's own kit, rendered at the film's times ────────
const AUDIO = () => `<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module">
window.render = async (cues, dur) => {
  const SR = 44100, off = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  globalThis.AudioContext = function () { return off; };
  // one queue of moments, in render quanta: the cues, and any timer the kit
  // sets while playing one (applyBed stops a faded bed 0.7 s later — the
  // snow and fog beds' LFO would otherwise hum on under the next scene), so
  // a timer fires at its FILM time, not the wall clock's
  const Q = t => Math.max(1, Math.round(t * SR / 128)), events = [];
  let cur = 0;
  window.setTimeout = (fn, ms) => { events.push({ q: Math.max(cur + 1, Q(off.currentTime + (Number(ms) || 0) / 1000)), run: fn }); return 0; };
  const { mountAudio } = await import('/toko-move/js/audio.js');
  const a = mountAudio({}, { button: '__none' });
  for (const cue of cues) events.push({ q: Q(cue.t), run: () => cue.n.startsWith('bed:') ? a.bed(cue.n.slice(4) || null) : a.play(cue.n) });
  const last = Math.floor(off.length / 128) - 1;
  function next() {
    const q = Math.min(...events.map(e => e.q).filter(v => v > cur && v <= last)); if (!isFinite(q)) return;
    // in the order they were laid down: a bed stopped and the next one started
    // in the same quantum must not run the other way round (fading out a bed
    // that has not rendered yet fades it from its default gain, 1 — a burst)
    off.suspend(q * 128 / SR).then(() => { cur = q; const due = events.filter(e => e.q <= q); for (const e of due) events.splice(events.indexOf(e), 1); for (const e of due) { try { e.run(); } catch {} } next(); off.resume(); });
  }
  next();
  const buf = await off.startRendering(), L = buf.getChannelData(0), Rt = buf.getChannelData(1), n = L.length;
  const wav = new DataView(new ArrayBuffer(44 + n * 4)), S = (o, s) => [...s].forEach((ch, i) => wav.setUint8(o + i, ch.charCodeAt(0)));
  S(0, 'RIFF'); wav.setUint32(4, 36 + n * 4, true); S(8, 'WAVEfmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true); wav.setUint16(22, 2, true);
  wav.setUint32(24, SR, true); wav.setUint32(28, SR * 4, true); wav.setUint16(32, 4, true); wav.setUint16(34, 16, true); S(36, 'data'); wav.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { wav.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); wav.setInt16(46 + i * 4, Math.max(-1, Math.min(1, Rt[i])) * 32767, true); }
  const bytes = new Uint8Array(wav.buffer); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rt[i]));
  return { b64: btoa(s), peak };
};
window.__ready = true;
</script></body></html>`;

const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/__cards') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(CARDS()); }
  if (u === '/__audio') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(AUDIO()); }
  // the store build has no brand folder; the lockup comes from the repo
  let p = u.startsWith('/toko/') ? path.join(REPO, decodeURIComponent(u)) : path.join(TMP, 'site', decodeURIComponent(u));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

const DEVICE = { viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: !LAND, locale: 'en-US' };
const clips = [];
let shots = 0;
const snap = async (page, dir, i) => { await page.screenshot({ path: path.join(dir, `${String(i).padStart(5, '0')}.${EXT}`), ...(DRAFT ? { type: 'jpeg', quality: 88 } : {}) }); shots++; };

// a drawn card: `secs` of it, and the cues it rings
async function card(browser, kind, secs, cues, line = '') {
  if (!wanted(kind === 'cap' ? line : kind)) return;
  const page = await browser.newPage(DEVICE);
  await page.goto(`${BASE}/__cards`); await page.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  const dir = path.join(TMP, `clip${clips.length}`); fs.mkdirSync(dir);
  const n = Math.round(secs * FPS);
  for (let i = 0; i < n; i++) { await page.evaluate(([k, t, l]) => window.paint(k, t, l), [kind, i / FPS, line]); await snap(page, dir, i); }
  await page.close();
  clips.push({ name: kind === 'cap' ? `“${line}”` : kind, dir, frames: n, cues, bed: null });
  console.log(`  ${kind}${line ? ' · ' + line : ''} · ${(n / FPS).toFixed(1)} s`);
}

// a take of the real game. `ff` plays (unfilmed) until the moment the take
// starts; then it films, holding each card long enough to read before the
// thumb comes down; `tail` seconds after `done` is true, the take ends.
const look = () => { const g = window.__tm3, q = s => document.querySelector(s);
  return { busy: g.busy(), scene: g.scene(), line: q('.evLine')?.textContent || '', card: q('#v3panel .eventCard')?.dataset.card || '',
    btn: !!q('#v3panel .eventOpt:not([disabled])'), stamp: q('.v3stamp')?.textContent || '', end: !q('#end').hidden,
    car: [...document.querySelectorAll('#v3frame .L')].map(e => (getComputedStyle(e).backgroundImage.match(/02-car(-[a-z]+)?\.webp/) || [])[0]).find(Boolean) || '',
    glow: !!q('#v3tram.glow'), board: q('#v3board').classList.contains('on'), land: q('#v3frame .L.land')?.dataset.land || '', m: q('#v3frame .L.moment')?.dataset.moment || '', tram: q('#v3tram')?.hidden === false ? q('#v3tram').dataset.model || '' : '' }; };
const choice = (pick = null) => { const bs = [...document.querySelectorAll('#v3panel .eventOpt:not([disabled])')]; const b = (pick != null && bs[pick]) || bs.find(e => e.querySelector('.evStk em')) || bs[0];
  if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
const ring = ([X, Y]) => { const el = document.createElement('div'); el.className = '__tap'; el.style.left = X + 'px'; el.style.top = Y + 'px';
  el.addEventListener('animationend', () => el.remove()); document.body.appendChild(el); };
const TAPCSS = '.__tap{position:fixed;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:rgba(255,255,255,.5);box-shadow:0 0 0 2.5px rgba(21,38,43,.45);pointer-events:none;z-index:2147483647;animation:__tap .45s ease-out forwards}@keyframes __tap{from{transform:scale(.45);opacity:.95}to{transform:scale(1.3);opacity:0}}';
const holdFor = line => Math.min(2.8, Math.max(1.5, 0.9 + line.length * 0.028));

async function take(browser, name, url, { save = null, ff = () => false, done, tail = 1.5, max = 24, pick = null }) {
  if (!wanted(name)) return;
  const ctx = await browser.newContext(DEVICE);
  await ctx.addInitScript(SHIM);
  if (save) await ctx.addInitScript(kv => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, JSON.stringify(v)); }, save);
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/toko-move/index.html${url}`, { waitUntil: 'load' });
  const cdp = await ctx.newCDPSession(page); await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  await page.addStyleTag({ content: TAPCSS });
  const step = ms => page.evaluate(m => window.__vt.step(m), ms);
  for (let i = 0; i < 600 && !(await page.evaluate(() => !!window.__tm3 && !document.getElementById('play').disabled)); i++) await step(100);
  // the sound, as the film hears it: every cue and bed, on the virtual clock
  await page.evaluate(() => { const a = window.__tm3.audio, P = a.play, B = a.bed; window.__cues = []; window.__bed = null;
    a.play = n => { window.__cues.push({ n, t: performance.now() }); return P(n); };
    a.bed = n => { if ((n || null) !== window.__bed) { window.__bed = n || null; window.__cues.push({ n: 'bed:' + (n || ''), t: performance.now() }); } return B(n); }; });
  await page.tap('#play');
  const tap = async () => { const at = await page.evaluate(choice, pick); if (!at) return false; await page.evaluate(ring, [at.x, at.y]); await page.touchscreen.tap(at.x, at.y); return true; };
  // unfilmed, until the take begins: cards answered as soon as they arm
  let since = null, guard = 0;
  for (; guard < 3000; guard++) {
    const s = await page.evaluate(look); if (ff === true || ff(s)) break;
    if (s.end) throw new Error(`${name}: the run ended before the take began`);
    if (s.btn && !s.busy) { since ??= 0; if ((since += 100) >= 400) { await tap(); since = null; } } else since = null;
    await step(100);
  }
  if (guard >= 3000) throw new Error(`${name}: never reached its take`);
  const dir = path.join(TMP, `clip${clips.length}`); fs.mkdirSync(dir);
  const t0 = await page.evaluate(() => performance.now()), bed0 = await page.evaluate(() => window.__bed);
  let n = 0, hold = 0, holdLine = '', endAt = null, taps = 0;
  while (n < max * FPS) {
    const s = await page.evaluate(look);
    if (s.btn && !s.busy) { if (s.line !== holdLine) { holdLine = s.line; hold = 0; } if ((hold += 1 / FPS) >= holdFor(s.line)) { if (await tap()) taps++; holdLine = ''; hold = 0; } } else { holdLine = ''; hold = 0; }
    if (endAt == null && done(s, taps)) endAt = n + Math.round(tail * FPS);
    if (DEBUG) console.log(n, JSON.stringify({ ...s, hold: +hold.toFixed(2), taps }));
    await step(DT); await snap(page, dir, n++);
    if (endAt != null && n >= endAt) break;
  }
  // a cue up to a quarter second before the take began is what triggered it
  // (the museum bell as it drives in): it is kept, at the take's first frame
  const cues = (await page.evaluate(() => window.__cues)).filter(c => c.t >= t0 || (c.t >= t0 - 250 && c.n !== 'tap')).map(c => ({ n: c.n, t: Math.max(0, (c.t - t0) / 1000) }));
  if (errs.length) throw new Error(`${name}: page errors: ${errs.join(' | ')}`);
  await ctx.close();
  clips.push({ name, dir, frames: n, cues, bed: bed0 });
  console.log(`  ${name} · ${(n / FPS).toFixed(1)} s · ${taps} taps · ${cues.length} cues${bed0 ? ' · bed ' + bed0 : ''}${endAt == null ? ' · CAPPED' : ''}`);
}

let BASE = '';
server.listen(0, '127.0.0.1', async () => {
  BASE = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const ladder = { easy: { done: true, stars: 2, plays: 2 }, medium: { done: true, plays: 1 }, hard: { done: true, plays: 1 } };
  try {
    console.log(`film3: ${VW}×${VH}${DRAFT ? ' (draft)' : ''}`);
    await card(browser, 'title', 2.6, [{ n: 'bell', t: 0.15 }]);
    // the loop, whole: Dispatch, a tram, a risk in words, the ride, the board, the stamp
    await take(browser, 'first job', '?run=easy&seed=1002', { ff: s => s.btn, done: s => /DELIVERED/.test(s.stamp), tail: 2.2, max: 30 });
    // v3.9: who you meet at the stop, and what you walk past
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'Who you meet at the stop.');
    await take(browser, 'the student', '?run=easy&seed=1000', { ff: s => s.card === 'vappu' && s.btn, done: (s, taps) => taps >= 1, tail: 2.0, max: 8 });
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'What you walk past.');
    await take(browser, 'on foot', '?run=medium&seed=1009', { save: { tokoMoveRuns: { easy: { done: true, stars: 2, plays: 1 } } },
      ff: s => ['fence', 'fog', 'iceswim', 'karaoke', 'reindeer', 'roadworks', 'slip', 'sofa', 'wet'].includes(s.card) && s.btn, done: (s, taps) => taps >= 1, tail: 1.4, max: 8 });
    // v3.10: every stop is somewhere, and the weather lies on it
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'Every stop is somewhere.');
    await take(browser, 'Katajanokka in the snow', '?run=medium&seed=1031', { save: { tokoMoveRuns: { easy: { done: true, stars: 2, plays: 1 } } },
      ff: s => s.scene === 'stop' && s.land === 'katajanokka' && s.btn, done: () => true, tail: 2.6, max: 6 });
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'Real trams. Some of them very old.');
    await take(browser, 'museum tram', '?run=easy&seed=1197', { ff: s => s.scene === 'stop' && s.tram === 'museum', done: (s, taps) => s.scene === 'tram' && taps >= 1, tail: 2.0, max: 12 });
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'On the night shift, a tram with no number.');
    await take(browser, 'night', '?run=night&seed=60', { save: { tokoMoveRuns: ladder }, ff: s => s.glow && s.scene === 'stop', done: (s, taps) => taps >= 1, tail: 2.0, max: 8 });
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'Another courier wants your jobs.');
    await take(browser, 'race', '?run=medium&seed=1002', { save: { tokoMoveRuns: { easy: { done: true, stars: 2, plays: 2 }, medium: { plays: 1 } } },
      ff: s => s.btn && !s.busy && /other courier wants it too/.test(s.line), done: (s, taps) => taps >= 1, tail: 1.3, max: 8 });
    // v3.12–v3.15: the job in the owner's illustrations, and the missions
    const easyDone = { tokoMoveRuns: { easy: { done: true, stars: 2, plays: 1 } } };
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'Every handover, drawn.');
    await take(browser, 'pickup', '?run=easy&seed=1003', { ff: s => ['kiosk', 'bench', 'stop-handoff', 'station', 'park'].includes(s.m), done: () => true, tail: 2.0, max: 4 });
    await take(browser, 'delivery', '?run=easy&seed=1003', { ff: s => ['doorway', 'cyclist', 'ferry', 'quay'].includes(s.m), done: () => true, tail: 2.2, max: 4 });
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'Some mornings, Mannerheimintie marches.');
    await take(browser, 'the march', '?run=medium&seed=15', { save: easyDone, ff: s => s.m === 'demonstration' && s.btn, done: (s, taps) => taps >= 1, tail: 2.4, max: 10 });
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'Missions. A different errand every run.');
    await take(browser, 'the wallet', '?mission=wallet&seed=11', { save: easyDone, pick: 0, ff: s => s.card === 'wallet' && s.btn, done: s => s.m === 'wallet', tail: 2.6, max: 10 });
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'Pick what you carry.');
    await take(browser, 'the perk', '?mission=wallet&seed=11', { save: easyDone, pick: 0, ff: s => /Pick one for the rest/.test(s.line) && s.btn, done: (s, taps) => taps >= 1, tail: 2.0, max: 8 });
    await take(browser, 'the fork', '?mission=east&seed=4', { save: easyDone, pick: 0, ff: s => /Two errands/.test(s.line) && s.btn, done: (s, taps) => taps >= 1, tail: 1.6, max: 8 });
    await card(browser, 'cap', 1.6, [{ n: 'deal', t: 0 }], 'And the city remembers you.');
    await take(browser, 'the lady again', '?run=easy&seed=1152', { ff: s => s.card === 'granny2' && s.btn, done: (s, taps) => taps >= 1, tail: 2.0, max: 9 });
    await card(browser, 'end', 3.8, [{ n: 'act', t: 0.15 }]);

    // ── the cut: clips crossfaded, the cues laid on the same timeline ──
    let at = 0; const cues = [];
    clips.forEach((c, k) => {
      const dur = c.frames / FPS; c.start = at;
      if (c.bed) cues.push({ n: 'bed:' + c.bed, t: at });
      for (const q of c.cues) cues.push({ n: q.n, t: at + q.t });
      if (c.bed || c.cues.some(q => q.n.startsWith('bed:'))) cues.push({ n: 'bed:', t: at + dur - FADE });
      at += dur - FADE;
    });
    const total = at + FADE;
    cues.sort((a, b) => a.t - b.t);
    if (DEBUG) console.log('cues', JSON.stringify(cues.map(c => [c.n, +c.t.toFixed(2)])));
    const ap = await browser.newPage(); await ap.goto(`${BASE}/__audio`); await ap.waitForFunction(() => window.__ready, null, { timeout: 30000 });
    const snd = await ap.evaluate(([c, d]) => window.render(c, d), [cues, total + 0.4]);
    const wav = path.join(TMP, 'sound.wav'); fs.writeFileSync(wav, Buffer.from(snd.b64, 'base64'));
    const inputs = [], chain = [];
    clips.forEach((c, k) => { inputs.push('-framerate', String(FPS), '-i', path.join(c.dir, `%05d.${EXT}`)); chain.push(`[${k}:v]scale=${VW}:${VH},setsar=1,format=yuv420p[v${k}]`); });
    let last = 'v0';
    for (let k = 1; k < clips.length; k++) { const o = k === clips.length - 1 ? 'v' : `x${k}`; chain.push(`[${last}][v${k}]xfade=transition=fade:duration=${FADE}:offset=${clips[k].start.toFixed(3)}[${o}]`); last = o; }
    // one fixed gain, so the kit's own balance (a tap quieter than a stamp, a
    // bed under both) survives — a loudness filter would pump it — set 6 dB
    // past a −3 dB peak, with a limiter taking only the bells' first strike
    const gain = Math.min(30, 3 - 20 * Math.log10(Math.max(1e-4, snd.peak)));
    chain.push(`[${clips.length}:a]volume=${gain.toFixed(1)}dB,alimiter=limit=0.89:attack=4:release=60:level=false,aresample=48000[a]`);
    execFileSync(FFMPEG, ['-y', '-loglevel', 'error', ...inputs, '-i', wav, '-filter_complex', chain.join(';'), '-map', clips.length === 1 ? '[v0]' : '[v]', '-map', '[a]',
      '-c:v', 'libx264', '-profile:v', 'high', '-crf', DRAFT ? '26' : '19', '-preset', DRAFT ? 'veryfast' : 'slow', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT]);
    const sheet = clips.map(c => `${c.name} ${c.start.toFixed(1)}s`).join(' · ');
    console.log(`film3: ${OUT} · ${total.toFixed(1)} s · ${shots} frames · ${cues.length} cues (peak ${snd.peak.toFixed(2)}) · ${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB\n  ${sheet}`);
  } catch (e) { console.error('film3 failed:', e.message || e); process.exitCode = 1; }
  await browser.close(); server.close(); if (flag('--keep')) console.log(`frames kept in ${TMP}`); else fs.rmSync(TMP, { recursive: true, force: true });
});
