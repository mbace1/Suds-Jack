// FOUND IN PASILA (RFH, Helsinki 1) v4, 7 Nov 2026 — v2's look restored (owner: "previous was better"; v3's upper-third
// bars "don't work"; "zoom into YLE logo that is not clear is bad"). v4 rules: no push-in on the Yle sign anywhere; no
// crop beyond 1:1 native pixels (every window s ≥ 1); the sign appears only in photo 1, where it is in focus (photos 4
// and 5 were focused on the jug, so their sign is soft), held wide with the logo clear of every caption and card.
// v2 notes follow.
// FOUND IN PASILA (RFH, Helsinki 1) v2, 7 Nov 2026. An RFH photo film: the owner's five photos of a Roundup Piha jug
// found in a flowerbed in front of the Yle campus in Pasila that morning. v1 was the FOUND OBJECT (a crime scene that
// isn't); v2 adds the TIP-OFF: the pirate station hands the public broadcaster a story found on its own doorstep. Yle
// is the addressee, never the accused: the film says found, never used; "who left it: unknown" stays; Yle has covered
// glyphosate for a decade, so the turn says "you cover this; now it's on your doorstep".
//   1 · wide, the Yle sign behind the jug: a slow push; an aqua evidence tag drops on a pin, a dashed ring finds the jug
//   2 · the label fills the frame: a rack onto its own claim; a white quote card carries the label's line
//   3 · the jug small at the foot of the tree by the path: a drift; the ring tracks it, a WHO? tag hangs beside it
//   4 · the jug in low sun under the tree: a tilt down; an EU · 2033 calendar card lands when the year is said
//   5 · v4: back to photo 1, the same doorstep, a slow pull back; an envelope addressed to Yle slides in at the top left,
//       the RFH stamp lands on the pop (v2 tilted up to photo 4's soft sign)
// The 2D layers are cut paper in Yle's aqua (#03b1d1, measured off the sign in photo 1), white paper, and the RFH gold
// (#f2b83a) as the one warm complement, which is also the pop colour. A torn paper frame irises open on every cut and
// a thin torn edge stays. The layers decorate and point; they never cover the jug, and the Yle logo is never redrawn
// (it appears only as photographed). Photo 5's distant passer-by (top right) never enters a crop. 1080×1920, 30 fps.
// film.html?lang=en|fi

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
const AQUA = '#03b1d1', GOLD = '#f2b83a', PAPER = '#f7f3ec', INK = '#1e1c1a', AQUA_DEEP = '#03899f';
const POP = 'Poppins-800';

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
  tagDrop: T.s1 + 0.8, ring1: T.s1 + 1.4, card2: T.s2 + 0.5, who3: T.s3 + 0.7, cal4: T.s4 + 0.5, year4: wordT('eu', /2033/), env5: T.s5 + 0.3, stamp5: popT('doorstep'),
  push1: T.s1 + 0.2, rack2: T.s2 + 0.6, drift3: T.s3, tilt4: T.s4, tilt5: T.s5, tram: T.s3 + 1.2, breath: T.s5 };

// ------------------------------------------------------------------ the five shots: a crop window on a photo, moving
// a window is (cx, cy) in image fractions and s = the window's width as a fraction of the frame's (1 = native 1080 px,
// 2.1 = the whole photo). It is clamped inside the photo, so a move can never show an edge. `jug` is where the jug (or
// the label) sits in that photo, in image fractions, so a layer can find it under the move.
const win = (im, cx, cy, s) => { const w = W * s, h = H * s; const x = clamp(cx * PW - w / 2, 0, PW - w), y = clamp(cy * PHT - h / 2, 0, PHT - h); return { im, x, y, w, h }; };
const SHOT = [
  { // 1 · the whole first photo, held wide (v4): a barely-there push, so the in-focus Yle sign stays whole, sharp and
    //     clear of the caption (it sits between the logo and the jug)
    t0: () => T.s1, ph: PH[0], a: [0.5, 0.5, 2.1], b: [0.5, 0.505, 2.0], e: ease.io, jug: [0.375, 0.735] },
  { // 2 · photo 5, the label: a rack down onto ROUNDUP and its own claim (its lower-left two thirds only: the distant
    //     passer-by at the top right never enters the frame)
    //     v4: never past 1:1 (v2 ended at 0.84, an upscale that went soft)
    t0: () => T.s2, ph: PH[4], a: [0.42, 0.74, 1.3], b: [0.44, 0.82, 1.0], e: ease.io, jug: [0.46, 0.80] },
  { // 3 · photo 3, the jug small at the foot of the tree, the path beside it: a slow drift across the leaf litter
    t0: () => T.s3, ph: PH[2], a: [0.52, 0.5, 2.1], b: [0.46, 0.57, 1.84], e: (k) => smooth(k), jug: [0.46, 0.57] },
  { // 4 · photo 2, the jug in low sun: a tilt down from the lit twigs onto it
    //     v4: ends further right, so the jug stays left of the 2033 card (v2's tilt slid it under the card)
    t0: () => T.s4, ph: PH[1], a: [0.52, 0.44, 1.75], b: [0.48, 0.58, 1.5], e: ease.io, jug: [0.34, 0.63] },
  { // 5 · v4: photo 1 again, the doorstep itself: a slow pull back to the whole picture, the sign in focus and clear
    t0: () => T.s5, ph: PH[0], a: [0.5, 0.505, 2.0], b: [0.5, 0.5, 2.1], e: ease.io, jug: [0.375, 0.735] },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };
const SHOT_END = (i) => i + 1 < SHOT.length ? SHOT[i + 1].t0() : T.end;
function windowAt(t) {
  const i = shotAt(t), S = SHOT[i], d = SHOT_END(i) - S.t0(), k = S.e((t - S.t0()) / d);
  const [cx, cy, s] = [0, 1, 2].map((j) => lerp(S.a[j], S.b[j], k));
  return { i, S, w: win(S.ph, cx, cy, s), k };
}
/** a point in a photo (fractions) → the frame */
const toFrame = (w, ax, ay) => [(ax * PW - w.x) / w.w * W, (ay * PHT - w.y) / w.h * H];
/** how far the picture has moved since the shot began, in frame px: the paper layers lag it a little (parallax) */
function drift(t) { const { S, w } = windowAt(t); const w0 = win(S.ph, ...S.a); return [((w0.x - w.x) / w.w) * W, ((w0.y - w.y) / w.h) * H]; }

// ------------------------------------------------------------------ grain, paper fibre, a seeded jitter
const noiseCanvas = (n, seed, lo, span) => { const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), d = g.createImageData(n, n); let s = seed;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = lo + ((s >> 8) & span); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); return c; };
const GRAIN = noiseCanvas(512, 7, 96, 127), FIBRE = noiseCanvas(256, 31, 200, 55);
const jit = (seed, i) => { let s = (seed * 1103515245 + i * 12345 + 7) >>> 0; s = (s ^ (s >>> 13)) * 1274126177 >>> 0; return ((s >>> 8) & 1023) / 1023 - 0.5; };
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');
document.body.appendChild(out); out.style.width = '100%';

/** a torn-edged rectangle path: straight-ish sides with small deckle jitter, seeded so it never crawls */
function tornPath(g, x, y, w, h, seed, amp = 6, step = 26) {
  g.beginPath(); let n = 0; const pt = (px, py) => (n++ === 0 ? g.moveTo(px, py) : g.lineTo(px, py));
  for (let i = 0; i <= w; i += step) pt(x + i, y + jit(seed, i) * amp);
  for (let i = 0; i <= h; i += step) pt(x + w + jit(seed + 1, i) * amp, y + i);
  for (let i = w; i >= 0; i -= step) pt(x + i, y + h + jit(seed + 2, i) * amp);
  for (let i = h; i >= 0; i -= step) pt(x + jit(seed + 3, i) * amp, y + i);
  g.closePath();
}
/** a white paper card: torn edge, a soft shadow, a little fibre; `rot` in radians; draws `body(g)` inside in card space */
function card(g, x, y, w, h, { rot = 0, seed = 1, shadow = 0.34, color = PAPER, amp = 6, alpha = 1 } = {}, body) {
  if (alpha <= 0) return; g.save(); g.globalAlpha = alpha; g.translate(x + w / 2, y + h / 2); g.rotate(rot); g.translate(-w / 2, -h / 2);
  g.shadowColor = `rgba(0,0,0,${shadow})`; g.shadowBlur = 22; g.shadowOffsetX = 6; g.shadowOffsetY = 12;
  tornPath(g, 0, 0, w, h, seed, amp); g.fillStyle = color; g.fill(); g.shadowColor = 'transparent';
  g.save(); tornPath(g, 0, 0, w, h, seed, amp); g.clip(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = alpha * 0.16;
  for (let yy = 0; yy < h; yy += 256) for (let xx = 0; xx < w; xx += 256) g.drawImage(FIBRE, xx, yy); g.restore();
  if (body) { g.save(); tornPath(g, 0, 0, w, h, seed, amp); g.clip(); body(g); g.restore(); }
  g.restore();
}
/** the torn paper frame: a white surround whose inner window irises open on each cut, then stays as a thin deckle edge */
function paperFrame(g, t) {
  const { S } = windowAt(t), since = t - S.t0(), k = ease.out(since / 0.7);
  const open = lerp(0.62, 1.0, k), inset = lerp(0, 14, k);                 // the window's scale, then the resting edge
  const iw = (W - 2 * inset) * open, ih = (H - 2 * inset) * open, ix = (W - iw) / 2, iy = (H - ih) / 2;
  g.save(); g.fillStyle = PAPER; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 30;
  g.beginPath(); g.rect(-40, -40, W + 80, H + 80);                         // the surround, with the torn window cut out
  let n = 0; const pt = (px, py) => (n++ === 0 ? g.moveTo(px, py) : g.lineTo(px, py)); const amp = 7, step = 24, seed = 91;
  for (let i = 0; i <= iw; i += step) pt(ix + i, iy + jit(seed, i) * amp);
  for (let i = 0; i <= ih; i += step) pt(ix + iw + jit(seed + 1, i) * amp, iy + i);
  for (let i = iw; i >= 0; i -= step) pt(ix + i, iy + ih + jit(seed + 2, i) * amp);
  for (let i = ih; i >= 0; i -= step) pt(ix + jit(seed + 3, i) * amp, iy + i);
  g.closePath(); g.fill('evenodd'); g.restore();
}

// ------------------------------------------------------------------ the layers
function text(g, s, x, y, { size = 30, fam = POP, color = INK, align = 'left', max = 0, base = 'alphabetic', weight = '' } = {}) {
  g.save(); g.font = `${weight ? weight + ' ' : ''}${size}px ${fam === POP ? '"Poppins-800"' : fam}`; g.textAlign = align; g.textBaseline = base; g.fillStyle = color;
  if (max) { const w = g.measureText(s).width; if (w > max) g.font = `${weight ? weight + ' ' : ''}${Math.floor(size * max / w)}px ${fam === POP ? '"Poppins-800"' : fam}`; }
  g.fillText(s, x, y); g.restore();
}
/** the aqua evidence tag on a gold pin and a string: drops in and swings to rest */
function evidenceTag(g, t, dx, dy) {
  const k = t - EV.tagDrop; if (k < 0) return;
  const px = 196 + dx * 0.25, py = 660 + dy * 0.25;                          // the pin
  const fall = ease.out(k / 0.45), swing = Math.exp(-k * 2.2) * Math.sin(k * 9) * 0.35, L = 96 * fall;
  g.save(); g.translate(px, py); g.rotate(swing);
  g.strokeStyle = GOLD; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, L); g.stroke();
  g.translate(0, L); g.rotate(-swing * 0.4);
  const w = 400, h = 94;
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 18; g.shadowOffsetX = 5; g.shadowOffsetY = 9;
  tornPath(g, -36, 0, w, h, 17, 4, 18); g.fillStyle = AQUA; g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = PAPER; g.beginPath(); g.arc(-10, 24, 8, 0, Math.PI * 2); g.fill();          // the punched hole
  text(g, UI.evidence, 14, 62, { size: 44, color: '#fff', max: w - 66 });
  g.restore();
  // the pin itself
  g.save(); g.translate(px, py); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 8; g.shadowOffsetY = 4;
  g.fillStyle = GOLD; g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(3, 3, 5, 0, Math.PI * 2); g.fill(); g.restore();
}
/** a dashed aqua ring that finds the jug and tracks it under the move; `r` in px, drawn on from `t0` */
function ring(g, t, t0, cx, cy, r, { until = 1e9 } = {}) {
  const k = clamp((t - t0) / 0.55), a = k * clamp((until - t) / 0.3); if (k <= 0 || a <= 0) return;
  g.save(); g.globalAlpha = a; g.strokeStyle = AQUA; g.lineWidth = 8; g.lineCap = 'round'; g.setLineDash([26, 18]); g.lineDashOffset = -t * 40;
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10;
  g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ease.out(k)); g.stroke(); g.restore();
}
/** the quote card: the label's own line as a white cut-out, an aqua head, a gold underline on the pop */
function quoteCard(g, t, dx, dy) {
  const k = t - EV.card2; if (k < 0) return; const slide = ease.back(k / 0.6);
  const w = 560, h = 196, x = lerp(W + 40, 400, slide) + dx * 0.25, y = 660 + dy * 0.25;
  card(g, x, y, w, h, { rot: -0.035, seed: 5 }, (c) => {
    c.fillStyle = AQUA; c.fillRect(0, 0, w, 44); text(c, UI.quoteHead, 22, 32, { size: 24, color: '#fff' });
    text(c, UI.quote, 22, 108, { size: 34, max: w - 44 });
    text(c, UI.quoteSub, 22, 160, { size: 26, fam: 'Inter', weight: '600', color: '#4a4640', max: w - 44 });
    const u = clamp((t - EV.claim) / 0.35); if (u > 0) { c.fillStyle = GOLD; c.fillRect(22, 118, (w - 44) * ease.out(u), 7); }
  });
}
/** the WHO? tag beside the small jug: a little aqua label with a gold question mark, bobbing */
function whoTag(g, t, jx, jy) {
  const k = t - EV.who3; if (k < 0) return; const s = 0.7 + 0.3 * spring(k / 0.5), bob = Math.sin(t * 2.4) * 5;
  g.save(); g.translate(jx + 150, jy - 170 + bob); g.scale(s, s); g.rotate(0.06);
  g.strokeStyle = AQUA; g.lineWidth = 5; g.setLineDash([12, 10]); g.beginPath(); g.moveTo(-10, 70); g.lineTo(-96, 134); g.stroke(); g.setLineDash([]);
  g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 16; g.shadowOffsetY = 8;
  tornPath(g, -20, 0, 250, 98, 23, 4, 20); g.fillStyle = AQUA; g.fill(); g.shadowColor = 'transparent';
  text(g, UI.who, 105, 68, { size: 48, color: '#fff', align: 'center' });
  g.fillStyle = GOLD; g.beginPath(); g.arc(-20, 0, 16, 0, Math.PI * 2); g.fill();
  g.restore();
}
/** the calendar card: EU · ALLOWED UNTIL over a big gold 2033 that lands when the year is said */
function calendarCard(g, t, dx, dy) {
  const k = t - EV.cal4; if (k < 0) return; const drop = ease.back(k / 0.55);
  const w = 340, h = 260, x = 706 + dx * 0.1, y = lerp(-320, 690, drop) + dy * 0.1;   // clear of a four-line caption and of the jug (v4: the jug ends left of x≈660)
  card(g, x, y, w, h, { rot: 0.03, seed: 9 }, (c) => {
    c.fillStyle = AQUA; c.fillRect(0, 0, w, 54); text(c, UI.calHead, w / 2, 38, { size: 26, color: '#fff', align: 'center', max: w - 30 });
    for (let i = 0; i < 2; i++) { c.fillStyle = PAPER; c.beginPath(); c.arc(56 + i * 228, 0, 12, 0, Math.PI * 2); c.fill(); c.fillStyle = AQUA_DEEP; c.fillRect(52 + i * 228, -16, 8, 34); }
    const y4 = clamp((t - EV.year4) / 0.4), s = 0.6 + 0.4 * spring(y4 / 0.6);
    if (y4 > 0) { c.save(); c.translate(w / 2, 178); c.scale(s, s); text(c, UI.calYear, 0, 40, { size: 112, color: GOLD, align: 'center', max: w - 40 }); c.restore(); }
    else text(c, '20__', w / 2, 218, { size: 112, color: 'rgba(30,28,26,.18)', align: 'center', max: w - 40 });
  });
}
/** the envelope to Yle: slides up in the silence, the RFH stamp thumps on the pop */
function envelope(g, t, dx, dy) {
  const k = t - EV.env5; if (k < 0) return; const slide = ease.out(k / 0.7);
  const w = 440, h = 226, x = lerp(-520, 64, slide) + dx * 0.12, y = 168 + dy * 0.08;   // v4: top left, over the sky and the
  // building's left side: clear of the Yle logo (x ≥ 540), of the caption below it and of the station bug above it
  card(g, x, y, w, h, { rot: -0.025, seed: 13, color: '#f4efe4', amp: 3 }, (c) => {
    c.strokeStyle = 'rgba(30,28,26,.22)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(w / 2, h * 0.52); c.lineTo(w, 0); c.stroke();   // the flap
    c.fillStyle = AQUA; c.fillRect(0, h * 0.52 + 2, w, 6);
    text(c, UI.envTo, 30, h - 66, { size: 40, color: AQUA, max: w - 170 });
    text(c, UI.envLine, 30, h - 28, { size: 20, fam: 'Inter', weight: '600', color: '#4a4640', max: w - 170 });
    text(c, UI.envFrom, 30, 34, { size: 16, fam: 'Inter', weight: '700', color: '#7a746a', max: w - 60 });
    // the stamp: a gold round RFH stamp that lands hard on the pop word
    const sk = t - EV.stamp5; if (sk >= 0) { const s = 1 + 0.9 * Math.exp(-sk * 9) * Math.max(0, 1 - sk * 2), a = clamp(sk / 0.06);
      c.save(); c.globalAlpha = a; c.translate(w - 80, 74); c.rotate(-0.22); c.scale(s, s);
      c.strokeStyle = GOLD; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 50, 0, Math.PI * 2); c.stroke(); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 39, 0, Math.PI * 2); c.stroke();
      text(c, UI.stamp, 0, 12, { size: 34, color: GOLD, align: 'center' }); c.restore(); }
  });
}

/** a tag, bottom left: dark ink on bone, clear of the right-hand rail (as the other RFH films) */
function tag(g, s, a, y = 1520) {
  if (a <= 0 || !s) return;
  g.save(); g.globalAlpha = a; g.font = '800 30px Inter';
  let w = g.measureText(s).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = `800 ${Math.floor(30 * maxW / w)}px Inter`; w = g.measureText(s).width; }
  const x = 110; g.fillStyle = 'rgba(236,230,214,.94)'; g.beginPath(); g.roundRect(x, y, w + 44, 62, 6); g.fill();
  g.fillStyle = INK; g.textBaseline = 'middle'; g.fillText(s, x + 22, y + 32); g.restore();
}

function picture(t) {
  const { i, S, w } = windowAt(t);
  g2d.setTransform(1, 0, 0, 1, 0, 0);
  g2d.drawImage(w.im, w.x, w.y, w.w, w.h, 0, 0, W, H);
  // the grade: a warm, slightly lifted, lower-contrast print; a corner vignette; the grain
  g2d.save();
  g2d.globalCompositeOperation = 'multiply'; g2d.fillStyle = 'rgba(248,236,214,0.18)'; g2d.fillRect(0, 0, W, H);
  g2d.globalCompositeOperation = 'screen'; g2d.fillStyle = 'rgba(16,14,22,0.14)'; g2d.fillRect(0, 0, W, H);
  g2d.globalCompositeOperation = 'source-over';
  const v = g2d.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,8,6,0.42)'); g2d.fillStyle = v; g2d.fillRect(0, 0, W, H);
  g2d.globalCompositeOperation = 'overlay'; g2d.globalAlpha = 0.085; const seed = Math.floor(t * FPS);
  const ox = (seed * 97) % 512, oy = (seed * 193) % 512;
  for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) g2d.drawImage(GRAIN, x, y);
  g2d.restore();
  // the layers, by beat: the ring tracks the jug under the move; the cards lag the picture a little
  const [jx, jy] = toFrame(w, ...S.jug), [dx, dy] = drift(t);
  if (i === 0) { ring(g2d, t, EV.ring1, jx, jy - 20, 250, { until: T.s2 }); evidenceTag(g2d, t, dx, dy); }
  if (i === 1) quoteCard(g2d, t, dx, dy);
  if (i === 2) { ring(g2d, t, T.s3 + 0.35, jx, jy, 170, { until: T.s4 }); whoTag(g2d, t, jx, jy); }
  if (i === 3) calendarCard(g2d, t, dx, dy);
  if (i === 4) envelope(g2d, t, dx, dy);
  paperFrame(g2d, t);
}

function frame(t, captions = true) {
  picture(t);
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  const UP = 912;   // v4: beats 1 and 5 are photo 1, whose jug runs to the bottom: their tags sit above it
  tag(g2d, UI.tag1, tg(T.s1 + 1.3, T.s2 - 0.1), UP);
  tag(g2d, UI.tag2, tg(T.s2 + 1.0, T.s2 + 2.4));
  tag(g2d, UI.tag2b, tg(T.s2 + 2.5, T.s3 - 0.1));
  tag(g2d, UI.tag3, tg(T.s3 + 0.9, T.s4 - 0.1));
  tag(g2d, UI.tag4, tg(T.s4 + 0.9, T.s4 + 2.4));
  tag(g2d, UI.tag4b, tg(T.s4 + 2.5, T.s5 - 0.1));
  tag(g2d, UI.tag5, tg(T.s5 + 1.2, T.s5 + 3.6), UP);   // v4: two tags (the parks goal is in the plan doc), so each reads
  tag(g2d, UI.tag5c, tg(T.s5 + 3.7, T.end + 1), UP);
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
