// FOUND IN PASILA (RFH, Helsinki 1) v3, 7 Nov 2026. An RFH photo film: the owner's five photos of a Roundup Piha jug
// found in a flowerbed in front of the Yle campus in Pasila that morning. v1 was the FOUND OBJECT (a crime scene that
// isn't); v2 added the TIP-OFF (the pirate station hands the public broadcaster a story found on its own doorstep: Yle
// is the addressee, never the accused; found, never used; who left it unknown; Yle has covered glyphosate for a decade).
// v3 is the ART PASS the owner asked for: "cut out and ripped white paper large 2d tiles", "basic shapes and a single
// dandelion". The compositing grammar is LARGE WHITE PAPER — cut-out and ripped-edge sheets with fibre edges and soft
// shadows: the opening photo seen through a ripped window that tears wider on the push; every caption on its own torn
// tile (the house caption drawn on top, unchanged); the label's quote on a torn sheet that drops in; 2033 on a ripped
// calendar page; torn-tile wipes between the photos instead of fades; a ripped strip along the bottom carrying the
// tags; and the turn as a large white envelope whose ripped flap opens so the letter slides out, with the RFH stamp on
// the pop. Yle's aqua (#03b1d1, measured off the sign in photo 1) and the RFH gold (#f2b83a, also the pop colour) are
// accents on the paper only. The one figurative element is a cut-paper DANDELION: standing by the jug in beat 1; its
// seed head beside the small jug in beat 3, a few seeds lifting off ("any kid could pick it up"); the seeds crossing the
// wipe into beat 4; one seed landing on the envelope in beat 5. The tiles never cover the jug's label or a pop word; the
// Yle logo is never redrawn (it appears only as photographed); photo 5's distant passer-by never enters a crop.
// 1080×1920, 30 fps. film.html?lang=en|fi

import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, FPS = 30;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, { weight: '100 900' }); document.fonts.add(await f.load()); }
await CAP.loadFonts(FONT_DIR);

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3),
  back: (k) => { k = clamp(k); const s = 1.6; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
const spring = (k) => { k = Math.max(0, k); return 1 - Math.exp(-6 * k) * Math.cos(9 * k); };
const AQUA = '#03b1d1', GOLD = '#f2b83a', PAPER = '#f8f5ee', INK = '#1e1c1a', AQUA_DEEP = '#03899f';

// ------------------------------------------------------------------ the photos
const SRC = '../../ref/roundup-pasila/07-11-roundup-yle-pasila-';
const load = (i) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('photo ' + i)); im.src = `${SRC}${i}.jpg`; });
const PH = await Promise.all([1, 2, 3, 4, 5].map(load));
const PW = PH[0].naturalWidth, PHT = PH[0].naturalHeight;   // 2268 × 4032: exactly 9:16, 2.1× the frame

// ------------------------------------------------------------------ the copy, the beats, the events
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 3.4], ['s3', 7.2], ['s4', 10.6], ['s5', 14.6], ['end', 19.6]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const cap = (id) => P.captions.find((c) => c.id === id);
const popT = (id) => { const c = cap(id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const wordT = (id, re) => { const c = cap(id), w = c.words.find((w) => re.test(w.w)); return w ? w.t : popT(id); };
const EV = { hook: popT('found'), claim: popT('label'), kid: popT('kid'), eu: popT('eu'), turn: popT('doorstep'),
  window: T.s1, tagDrop: T.s1 + 0.9, ring1: T.s1 + 1.5, card2: T.s2 + 0.55, who3: T.s3 + 0.7, seedsUp: T.s3 + 0.9, cal4: T.s4 + 0.55, year4: wordT('eu', /2033/),
  env5: T.s5 + 0.3, flap: T.s5 + 1.15, letter: T.s5 + 1.45, stamp5: popT('doorstep'), seedLand: popT('doorstep') + 1.7,
  wipe2: T.s2, wipe3: T.s3, wipe4: T.s4, wipe5: T.s5,
  push1: T.s1 + 0.2, rack2: T.s2 + 0.6, drift3: T.s3, tilt4: T.s4, tilt5: T.s5, tram: T.s3 + 1.2, breath: T.s5 };
const WIPE = 0.5;                                    // a torn-tile wipe takes this long, from the cut

// ------------------------------------------------------------------ the five shots: a crop window on a photo, moving
const win = (im, cx, cy, s) => { const w = W * s, h = H * s; const x = clamp(cx * PW - w / 2, 0, PW - w), y = clamp(cy * PHT - h / 2, 0, PHT - h); return { im, x, y, w, h }; };
const SHOT = [
  { // 1 · the whole first photo, pushing gently toward the jug; the Yle sign stays in
    t0: () => T.s1, ph: PH[0], a: [0.5, 0.48, 2.1], b: [0.47, 0.54, 1.86], e: ease.io, jug: [0.375, 0.735], dir: 'r' },
  { // 2 · photo 5, the label: a rack down onto ROUNDUP and its own claim (lower-left two thirds only: the passer-by stays out)
    t0: () => T.s2, ph: PH[4], a: [0.42, 0.76, 1.15], b: [0.44, 0.83, 0.84], e: ease.io, jug: [0.46, 0.80], dir: 'r' },
  { // 3 · photo 3, the jug small at the foot of the tree, the path beside it: a slow drift across the leaf litter
    t0: () => T.s3, ph: PH[2], a: [0.52, 0.5, 2.1], b: [0.46, 0.57, 1.84], e: (k) => smooth(k), jug: [0.46, 0.57], dir: 'l' },
  { // 4 · photo 2, the jug in low sun: a tilt down from the lit twigs onto it
    t0: () => T.s4, ph: PH[1], a: [0.5, 0.44, 1.75], b: [0.42, 0.6, 1.48], e: ease.io, jug: [0.34, 0.63], dir: 'r' },
  { // 5 · photo 4, the turn: a fast tilt UP from the jug to the Yle sign (the addressee), then it rests
    t0: () => T.s5, ph: PH[3], a: [0.47, 0.78, 1.3], b: [0.55, 0.3, 1.5], e: (k) => ease.out(Math.min(1, k * 2.1)), jug: [0.47, 0.8], dir: 'd' },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };
const SHOT_END = (i) => i + 1 < SHOT.length ? SHOT[i + 1].t0() : T.end;
function windowOf(i, t) { const S = SHOT[i], d = SHOT_END(i) - S.t0(), k = S.e((t - S.t0()) / d); const [cx, cy, s] = [0, 1, 2].map((j) => lerp(S.a[j], S.b[j], k)); return win(S.ph, cx, cy, s); }
function windowAt(t) { const i = shotAt(t); return { i, S: SHOT[i], w: windowOf(i, t) }; }
const toFrame = (w, ax, ay) => [(ax * PW - w.x) / w.w * W, (ay * PHT - w.y) / w.h * H];
/** how far the picture has moved since the shot began, in frame px: the paper lags it a little */
function drift(t) { const { S, w } = windowAt(t); const w0 = win(S.ph, ...S.a); return [((w0.x - w.x) / w.w) * W, ((w0.y - w.y) / w.h) * H]; }

// ------------------------------------------------------------------ grain, paper fibre, a seeded jitter
const noiseCanvas = (n, seed, lo, span) => { const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), d = g.createImageData(n, n); let s = seed;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = lo + ((s >> 8) & span); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); return c; };
const GRAIN = noiseCanvas(512, 7, 96, 127), FIBRE = noiseCanvas(256, 31, 200, 55);
const jit = (seed, i) => { let s = (seed * 1103515245 + i * 12345 + 7) >>> 0; s = (s ^ (s >>> 13)) * 1274126177 >>> 0; return ((s >>> 8) & 1023) / 1023 - 0.5; };
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');
document.body.appendChild(out); out.style.width = '100%';
const SCRATCH = document.createElement('canvas'); SCRATCH.width = W; SCRATCH.height = H; const gs = SCRATCH.getContext('2d');

/** a torn-edged rectangle path: deckle jitter per side (amps: top, right, bottom, left), seeded so it never crawls */
function tornPath(g, x, y, w, h, seed, amps = 6, step = 26) {
  const A = Array.isArray(amps) ? amps : [amps, amps, amps, amps];
  g.beginPath(); let n = 0; const pt = (px, py) => (n++ === 0 ? g.moveTo(px, py) : g.lineTo(px, py));
  for (let i = 0; i <= w; i += step) pt(x + i, y + jit(seed, i) * A[0] + (A[0] > 12 ? jit(seed + 9, i >> 2) * A[0] * 0.8 : 0));
  for (let i = 0; i <= h; i += step) pt(x + w + jit(seed + 1, i) * A[1], y + i);
  for (let i = w; i >= 0; i -= step) pt(x + i, y + h + jit(seed + 2, i) * A[2]);
  for (let i = h; i >= 0; i -= step) pt(x + jit(seed + 3, i) * A[3], y + i);
  g.closePath();
}
/** a white paper tile: torn edges, a soft shadow, a little fibre; `rot` in radians; draws `body(g)` inside in tile space */
function tile(g, x, y, w, h, { rot = 0, seed = 1, shadow = 0.34, color = PAPER, amp = 6, alpha = 1, blur = 24 } = {}, body) {
  if (alpha <= 0) return; g.save(); g.globalAlpha = alpha; g.translate(x + w / 2, y + h / 2); g.rotate(rot); g.translate(-w / 2, -h / 2);
  g.shadowColor = `rgba(0,0,0,${shadow})`; g.shadowBlur = blur; g.shadowOffsetX = 6; g.shadowOffsetY = 12;
  tornPath(g, 0, 0, w, h, seed, amp); g.fillStyle = color; g.fill(); g.shadowColor = 'transparent';
  g.save(); tornPath(g, 0, 0, w, h, seed, amp); g.clip(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = alpha * 0.14;
  for (let yy = 0; yy < h; yy += 256) for (let xx = 0; xx < w; xx += 256) g.drawImage(FIBRE, xx, yy); g.restore();
  if (body) { g.save(); tornPath(g, 0, 0, w, h, seed, amp); g.clip(); body(g); g.restore(); }
  g.restore();
}
function text(g, s, x, y, { size = 30, fam = 'Poppins-800', color = INK, align = 'left', max = 0, base = 'alphabetic', weight = '' } = {}) {
  const font = (px) => `${weight ? weight + ' ' : ''}${px}px ${fam === 'Inter' ? 'Inter' : `"${fam}"`}`;
  g.save(); g.font = font(size); g.textAlign = align; g.textBaseline = base; g.fillStyle = color;
  if (max) { const w = g.measureText(s).width; if (w > max) g.font = font(Math.floor(size * max / w)); }
  g.fillText(s, x, y); g.restore();
}

// ------------------------------------------------------------------ the picture: photos, the opening window, the torn-tile wipes
function drawPhoto(g, w) { g.drawImage(w.im, w.x, w.y, w.w, w.h, 0, 0, W, H); }
function grade(g, t) {
  g.save();
  g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(248,236,214,0.18)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(16,14,22,0.14)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,8,6,0.42)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.085; const seed = Math.floor(t * FPS);
  const ox = (seed * 97) % 512, oy = (seed * 193) % 512;
  for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) g.drawImage(GRAIN, x, y);
  g.restore();
}
/** the torn-tile wipe: a big white paper tile sweeps across; the new photo is revealed on the side it has passed */
function wipe(g, t, i, w) {
  const since = t - SHOT[i].t0(), k = ease.io(since / WIPE), dir = SHOT[i].dir, old = windowOf(i - 1, SHOT[i].t0() - 0.001);
  const band = 560, seed = 40 + i * 7;
  drawPhoto(g, old);
  g.save(); g.beginPath();
  if (dir === 'd') { const lead = lerp(-band, H + band, k); g.rect(0, -10, W, Math.max(0, lead + 10)); g.clip(); drawPhoto(g, w); g.restore();
    tile(g, -60, lead - band, W + 120, band, { seed, amp: [8, 6, 16, 6], shadow: 0.4, blur: 30 }); }
  else if (dir === 'r') { const lead = lerp(-band, W + band, k); g.rect(-10, 0, Math.max(0, lead + 10), H); g.clip(); drawPhoto(g, w); g.restore();
    tile(g, lead - band, -60, band, H + 120, { seed, amp: [6, 16, 6, 8], shadow: 0.4, blur: 30 }); }
  else { const lead = lerp(W + band, -band, k); g.rect(lead, 0, W + 10 - lead, H); g.clip(); drawPhoto(g, w); g.restore();
    tile(g, lead, -60, band, H + 120, { seed, amp: [6, 8, 6, 16], shadow: 0.4, blur: 30 }); }
}
/** the opening: photo 1 seen through a ripped window in a big white sheet, which tears wider on the push */
function openingWindow(g, t) {
  const k = ease.io((t - EV.window) / 2.4); if (k >= 1) return;
  const x0 = lerp(W * 0.2, -40, k), y0 = lerp(H * 0.17, -40, k), x1 = lerp(W * 0.82, W + 40, k), y1 = lerp(H * 0.84, H + 40, k);
  g.save(); g.fillStyle = PAPER; g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 34;
  g.beginPath(); g.rect(-80, -80, W + 160, H + 160);
  let n = 0; const pt = (px, py) => (n++ === 0 ? g.moveTo(px, py) : g.lineTo(px, py)); const amp = 16, step = 22, seed = 91, iw = x1 - x0, ih = y1 - y0;
  for (let i = 0; i <= iw; i += step) pt(x0 + i, y0 + jit(seed, i) * amp + jit(seed + 9, i >> 2) * amp);
  for (let i = 0; i <= ih; i += step) pt(x1 + jit(seed + 1, i) * amp + jit(seed + 8, i >> 2) * amp, y0 + i);
  for (let i = iw; i >= 0; i -= step) pt(x0 + i, y1 + jit(seed + 2, i) * amp + jit(seed + 7, i >> 2) * amp);
  for (let i = ih; i >= 0; i -= step) pt(x0 + jit(seed + 3, i) * amp + jit(seed + 6, i >> 2) * amp, y0 + i);
  g.closePath(); g.fill('evenodd'); g.restore();
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.12; for (let yy = 0; yy < H; yy += 256) for (let xx = 0; xx < W; xx += 256) g.drawImage(FIBRE, xx, yy); g.restore();
}
/** the resting deckle: a thin torn white edge round the whole frame, always */
function deckle(g) {
  g.save(); g.fillStyle = PAPER; g.beginPath(); g.rect(-40, -40, W + 80, H + 80);
  let n = 0; const pt = (px, py) => (n++ === 0 ? g.moveTo(px, py) : g.lineTo(px, py)); const amp = 7, step = 24, seed = 91, ins = 14;
  for (let i = 0; i <= W - 2 * ins; i += step) pt(ins + i, ins + jit(seed, i) * amp);
  for (let i = 0; i <= H - 2 * ins; i += step) pt(W - ins + jit(seed + 1, i) * amp, ins + i);
  for (let i = W - 2 * ins; i >= 0; i -= step) pt(ins + i, H - ins + jit(seed + 2, i) * amp);
  for (let i = H - 2 * ins; i >= 0; i -= step) pt(ins + jit(seed + 3, i) * amp, ins + i);
  g.closePath(); g.fill('evenodd'); g.restore();
}

// ------------------------------------------------------------------ the dandelion, the only figure: cut paper
/** a dandelion standing at (x, baseY), `h` tall; `gone` = the fraction of its seeds already lifted off */
function dandelion(g, t, x, baseY, h, { gone = 0, sway = 1 } = {}) {
  const sw = Math.sin(t * 1.3) * 0.035 * sway, R = h * 0.2, hx = x + Math.sin(sw) * h * 0.6, hy = baseY - h * 0.8;
  g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetX = 4; g.shadowOffsetY = 7;
  g.strokeStyle = PAPER; g.lineCap = 'round';
  g.lineWidth = 9; g.beginPath(); g.moveTo(x, baseY); g.quadraticCurveTo(x + Math.sin(sw) * h * 0.25, baseY - h * 0.45, hx, hy + R * 0.3); g.stroke();   // the stem
  for (const s of [-1, 1]) { g.fillStyle = PAPER; g.beginPath(); g.ellipse(x + s * 34, baseY - 14, 40, 11, s * 0.55, 0, Math.PI * 2); g.fill(); }        // two leaf blades
  const N = 30; g.lineWidth = 3;
  for (let i = 0; i < N; i++) {                      // the rays, each ending in a paper dot; the ones that lifted off are missing
    if (i / N < gone && (i % 3 === 0 || gone > 0.6)) continue;
    const a = (i / N) * Math.PI * 2 + 0.1 * jit(3, i), r = R * (0.85 + 0.3 * Math.abs(jit(5, i)));
    g.strokeStyle = i % 7 === 0 ? AQUA : PAPER; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r); g.stroke();
    g.fillStyle = PAPER; g.beginPath(); g.arc(hx + Math.cos(a) * r, hy + Math.sin(a) * r, 4.5, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = GOLD; g.beginPath(); g.arc(hx, hy, R * 0.16, 0, Math.PI * 2); g.fill();                                                         // the gold heart
  g.restore();
  return [hx, hy, R];
}
/** one seed: a little paper parachute on a gold achene, at (x, y), `rot` radians */
function seed(g, x, y, rot, a = 1, sc = 1) {
  g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 6; g.shadowOffsetY = 4;
  g.strokeStyle = PAPER; g.lineWidth = 2.6; g.lineCap = 'round';
  for (let i = 0; i < 11; i++) { const an = -Math.PI / 2 + (i - 5) * 0.21; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(an) * 30, Math.sin(an) * 30); g.stroke(); }
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 30); g.stroke(); g.fillStyle = GOLD; g.beginPath(); g.ellipse(0, 34, 4, 7, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}
let HEAD3 = null;                                   // the beat-3 head's last position, so the seeds know where they lifted from
function seedsInFlight(g, t) {
  if (t < EV.seedsUp || !HEAD3) return; const [hx, hy, R] = HEAD3;
  for (let k = 0; k < 5; k++) {
    const t0 = EV.seedsUp + 0.18 * k, u = t - t0; if (u < 0) continue;
    const a0 = -1.2 + k * 0.5, x = hx + Math.cos(a0) * R + 70 * u + 26 * Math.sin(2.6 * u + k), y = hy + Math.sin(a0) * R - 120 * u * (0.8 + 0.1 * k) + 10 * Math.sin(3.1 * u + k);
    if (y < -60 || x > W + 60) continue;
    seed(g, x, y, 0.3 * Math.sin(1.7 * u + k), clamp(u / 0.3), 0.9 + 0.1 * (k % 2));
  }
}
/** the beat-5 seed: drifts in from the top left after the stamp and settles on the envelope */
function seedLanding(g, t, lx, ly) {
  const t0 = EV.stamp5 + 0.3, u = t - t0; if (u < 0) return;
  const d = EV.seedLand - t0, k = ease.out(u / d), x = lerp(-50, lx, k) + 40 * Math.sin(2.2 * u) * (1 - k), y = lerp(260, ly, smooth(k)) + 18 * Math.sin(3.3 * u) * (1 - k);
  seed(g, x, y, 0.25 * Math.sin(2 * u) * (1 - k) - 0.15 * k, 1, 1);
}

// ------------------------------------------------------------------ the paper layers, by beat
/** the caption tiles: a large torn white sheet behind each caption, in before the words, out after them */
function captionTiles(g, t) {
  for (const c of P.captions) {
    const a = clamp((t - (c.t0 - 0.3)) / 0.25) * clamp((c.t1 + 0.3 - t) / 0.25); if (a <= 0) continue;
    const L = CAP.layout(g, c), b = L.box, pad = 34, k = ease.back(clamp((t - (c.t0 - 0.3)) / 0.35));
    const seed = 60 + P.captions.indexOf(c) * 3, rot = (jit(seed, 1)) * 0.03;
    tile(g, b.x - pad, b.y - pad + (1 - k) * -50, b.w + pad * 2, b.h + pad * 2, { seed, rot, amp: 9, alpha: a, shadow: 0.36 });
  }
}
/** the ripped strip along the bottom that carries the tags */
function tagStrip(g, t) {
  const a = clamp((t - (T.s1 + 1.0)) / 0.35); if (a <= 0) return;
  tile(g, 36, 1486 + (1 - ease.out(a)) * 60, W - 72, 112, { seed: 77, amp: [10, 6, 8, 6], alpha: a, shadow: 0.38, rot: 0.004 });
}
function tagText(g, s, a, y = 1542) {
  if (a <= 0 || !s) return;
  g.save(); g.globalAlpha = a; g.font = '800 30px Inter'; let w = g.measureText(s).width; const maxW = 900; if (w > maxW) g.font = `800 ${Math.floor(30 * maxW / w)}px Inter`;
  g.fillStyle = INK; g.textBaseline = 'middle'; g.fillText(s, 96, y); g.fillStyle = AQUA; g.fillRect(70, y - 14, 10, 28); g.restore();
}
/** the aqua evidence tag on a gold pin and a string: drops in and swings to rest */
function evidenceTag(g, t, dx, dy) {
  const k = t - EV.tagDrop; if (k < 0) return;
  const px = 200 + dx * 0.25, py = 700 + dy * 0.25;
  const fall = ease.out(k / 0.45), swing = Math.exp(-k * 2.2) * Math.sin(k * 9) * 0.35, L = 96 * fall;
  g.save(); g.translate(px, py); g.rotate(swing);
  g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, L); g.stroke();
  g.translate(0, L); g.rotate(-swing * 0.4);
  const w = 400, h = 94;
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 18; g.shadowOffsetX = 5; g.shadowOffsetY = 9;
  tornPath(g, -36, 0, w, h, 17, 4, 18); g.fillStyle = PAPER; g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = AQUA; g.fillRect(-36, 0, 14, h);
  g.fillStyle = PAPER; g.beginPath(); g.arc(-10, 24, 8, 0, Math.PI * 2); g.fill();
  text(g, UI.evidence, 14, 62, { size: 44, color: AQUA_DEEP, max: w - 66 });
  g.restore();
  g.save(); g.translate(px, py); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
  g.fillStyle = GOLD; g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(3, 3, 5, 0, Math.PI * 2); g.fill(); g.restore();
}
/** a dashed aqua ring that finds the jug and tracks it under the move */
function ring(g, t, t0, cx, cy, r, { until = 1e9 } = {}) {
  const k = clamp((t - t0) / 0.55), a = k * clamp((until - t) / 0.3); if (k <= 0 || a <= 0) return;
  g.save(); g.globalAlpha = a; g.strokeStyle = AQUA; g.lineWidth = 8; g.lineCap = 'round'; g.setLineDash([26, 18]); g.lineDashOffset = -t * 40;
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10;
  g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ease.out(k)); g.stroke(); g.restore();
}
/** the quote sheet: a large torn sheet that drops in with the label's own line, an aqua head, a gold underline on the pop */
function quoteSheet(g, t, dx, dy) {
  const k = t - EV.card2; if (k < 0) return; const drop = ease.back(k / 0.55);
  const w = 800, h = 250, x = 140 + dx * 0.15, y = lerp(-300, 640, drop) + dy * 0.15;
  tile(g, x, y, w, h, { rot: -0.02, seed: 5, amp: [14, 8, 10, 8] }, (c) => {
    c.fillStyle = AQUA; c.fillRect(0, 0, w, 52); text(c, UI.quoteHead, 26, 38, { size: 28, color: '#fff' });
    text(c, UI.quote, 26, 136, { size: 46, max: w - 52 });
    text(c, UI.quoteSub, 26, 206, { size: 30, fam: 'Inter', weight: '600', color: '#4a4640', max: w - 52 });
    const u = clamp((t - EV.claim) / 0.35); if (u > 0) { c.fillStyle = GOLD; c.fillRect(26, 148, (w - 52) * ease.out(u), 9); }
  });
}
/** the WHO? tile beside the small jug: a small torn tile, a gold dot, bobbing */
function whoTile(g, t, jx, jy) {
  const k = t - EV.who3; if (k < 0) return; const s = 0.7 + 0.3 * spring(k / 0.5), bob = Math.sin(t * 2.4) * 5;
  g.save(); g.translate(jx + 150, jy - 210 + bob); g.scale(s, s); g.rotate(0.05);
  tile(g, -20, 0, 250, 98, { seed: 23, amp: 6, shadow: 0.35 }, (c) => { c.fillStyle = AQUA; c.fillRect(0, 0, 12, 98); text(c, UI.who, 132, 68, { size: 48, color: AQUA_DEEP, align: 'center' }); });
  g.fillStyle = GOLD; g.beginPath(); g.arc(-20, 0, 15, 0, Math.PI * 2); g.fill();
  g.restore();
}
/** the calendar page: ripped off its pad along the top; EU · ALLOWED UNTIL, then the gold 2033 lands when the year is said */
function calendarPage(g, t, dx, dy) {
  const k = t - EV.cal4; if (k < 0) return; const drop = ease.back(k / 0.55);
  const w = 440, h = 330, x = 620 + dx * 0.1, y = lerp(-360, 690, drop) + dy * 0.1;
  tile(g, x, y, w, h, { rot: 0.03, seed: 9, amp: [22, 6, 8, 6] }, (c) => {
    c.fillStyle = AQUA; c.fillRect(0, 26, w, 54); text(c, UI.calHead, w / 2, 64, { size: 26, color: '#fff', align: 'center', max: w - 30 });
    for (let i = 0; i < 2; i++) { c.fillStyle = 'rgba(30,28,26,.55)'; c.beginPath(); c.arc(90 + i * 260, 40, 11, 0, Math.PI * 2); c.fill(); }
    const y4 = clamp((t - EV.year4) / 0.4), s = 0.6 + 0.4 * spring(y4 / 0.6);
    if (y4 > 0) { c.save(); c.translate(w / 2, 225); c.scale(s, s); text(c, UI.calYear, 0, 44, { size: 136, color: GOLD, align: 'center' }); c.restore(); }
    else text(c, '20__', w / 2, 269, { size: 136, color: 'rgba(30,28,26,.16)', align: 'center' });
  });
}
/** the turn: a large white envelope slides in through the silence; its ripped flap opens, the letter slides out, the stamp lands */
function envelope(g, t, dx, dy) {
  const k = t - EV.env5; if (k < 0) return null; const slide = ease.out(k / 0.7);
  const w = 820, h = 400, x = 130 + dx * 0.1, y = lerp(H + 80, 480, slide) + dy * 0.06;
  const open = ease.out((t - EV.flap) / 0.5), outK = ease.out((t - EV.letter) / 0.6);
  // the letter, behind the envelope's front, sliding up out of it
  if (outK > 0) tile(g, x + 50, y + 40 - 190 * outK, w - 100, 300, { seed: 15, amp: 5, rot: -0.01, shadow: 0.3 }, (c) => {
    c.fillStyle = AQUA; c.fillRect(0, 0, 10, 300); text(c, UI.envTo, 40, 92, { size: 54, color: AQUA_DEEP, max: w - 180 });
    text(c, UI.envLine, 40, 148, { size: 30, fam: 'Inter', weight: '600', color: '#4a4640', max: w - 180 });
    for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(30,28,26,.18)'; c.fillRect(40, 196 + i * 30, (w - 180) * (0.9 - i * 0.22), 6); } });
  // the envelope's front (the pocket)
  tile(g, x, y + h * 0.42, w, h * 0.58, { seed: 13, amp: 4, rot: -0.012, shadow: 0.34, color: '#f4efe4' }, (c) => {
    c.strokeStyle = 'rgba(30,28,26,.2)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(w * 0.5, h * 0.3); c.lineTo(w, 0); c.stroke();
    text(c, UI.envFrom, 36, h * 0.58 - 28, { size: 22, fam: 'Inter', weight: '700', color: '#7a746a', max: w - 72 });
    const sk = t - EV.stamp5; if (sk >= 0) { const s = 1 + 0.9 * Math.exp(-sk * 9) * Math.max(0, 1 - sk * 2), a = clamp(sk / 0.06);
      c.save(); c.globalAlpha = a; c.translate(w - 120, 92); c.rotate(-0.22); c.scale(s, s);
      c.strokeStyle = GOLD; c.lineWidth = 7; c.beginPath(); c.arc(0, 0, 66, 0, Math.PI * 2); c.stroke(); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 52, 0, Math.PI * 2); c.stroke();
      text(c, UI.stamp, 0, 16, { size: 44, color: GOLD, align: 'center' }); c.restore(); }
  });
  // the ripped flap: a torn triangle hinged on the pocket's top edge, folding up and over as it opens
  g.save(); g.translate(x + w / 2, y + h * 0.42); g.scale(1, 1 - 1.55 * open); g.translate(-w / 2, 0);
  g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 14; g.shadowOffsetY = 6; g.fillStyle = open > 0.5 ? '#ebe5d8' : '#f4efe4';
  g.beginPath(); g.moveTo(0, 0); for (let i = 0; i <= w; i += 24) { const p = i / w, yy = Math.abs(p - 0.5) * 2 * h * 0.33 - h * 0.33 + jit(19, i) * 9; g.lineTo(i, -yy); } g.lineTo(w, 0); g.closePath(); g.fill(); g.restore();
  return [x + w - 300, y + h * 0.42 + 30];
}

// ------------------------------------------------------------------ the frame
function picture(t) {
  const { i, S, w } = windowAt(t); g2d.setTransform(1, 0, 0, 1, 0, 0);
  const since = t - S.t0();
  if (i > 0 && since < WIPE) wipe(g2d, t, i, w); else drawPhoto(g2d, w);
  grade(g2d, t);
  const [jx, jy] = toFrame(w, ...S.jug), [dx, dy] = drift(t);
  if (i === 0) { ring(g2d, t, EV.ring1, jx, jy - 20, 250, { until: T.s2 }); dandelion(g2d, t, jx + 300, jy + 150, 230); evidenceTag(g2d, t, dx, dy); }
  if (i === 1) quoteSheet(g2d, t, dx, dy);
  if (i === 2) { ring(g2d, t, T.s3 + 0.35, jx, jy, 170, { until: T.s4 }); const gone = clamp((t - EV.seedsUp) / 0.9) * 0.5; HEAD3 = dandelion(g2d, t, jx + 190, jy + 130, 300, { gone }); whoTile(g2d, t, jx, jy); }
  if (i === 3) calendarPage(g2d, t, dx, dy);
  if (i === 2 || i === 3) seedsInFlight(g2d, t);
  if (i === 4) { const land = envelope(g2d, t, dx, dy); if (land) seedLanding(g2d, t, land[0], land[1]); }
  if (i === 0) openingWindow(g2d, t);
  deckle(g2d);
  // a fine paper grain over everything, light
  g2d.save(); g2d.globalCompositeOperation = 'multiply'; g2d.globalAlpha = 0.06; for (let yy = 0; yy < H; yy += 256) for (let xx = 0; xx < W; xx += 256) g2d.drawImage(FIBRE, xx, yy); g2d.restore();
  captionTiles(g2d, t);
  tagStrip(g2d, t);
}

function frame(t, captions = true) {
  picture(t);
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  tagText(g2d, UI.tag1, tg(T.s1 + 1.3, T.s2 - 0.1));
  tagText(g2d, UI.tag2, tg(T.s2 + 1.0, T.s2 + 2.4));
  tagText(g2d, UI.tag2b, tg(T.s2 + 2.5, T.s3 - 0.1));
  tagText(g2d, UI.tag3, tg(T.s3 + 0.9, T.s4 - 0.1));
  tagText(g2d, UI.tag4, tg(T.s4 + 0.9, T.s4 + 2.4));
  tagText(g2d, UI.tag4b, tg(T.s4 + 2.5, T.s5 - 0.1));
  tagText(g2d, UI.tag5, tg(T.s5 + 1.3, T.s5 + 3.0));
  tagText(g2d, UI.tag5b, tg(T.s5 + 3.1, T.s5 + 4.4));
  tagText(g2d, UI.tag5c, tg(T.s5 + 4.5, T.end + 1));
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out;
}
frame(0, false);
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, ...CAP.events(P), quiet: [{ t0: +T.s5.toFixed(3), t1: +(T.s5 + 0.6).toFixed(3) }] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
