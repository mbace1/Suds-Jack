// FOUND IN PASILA (RFH, Helsinki 1), 7 Nov 2026. An RFH photo film: the owner's five photos of a Roundup Piha jug found in
// a flowerbed in front of the Yle campus in Pasila that morning (owner: "Original photos" — no 3D). The device is the
// FOUND OBJECT: a crime scene that isn't. Slow, deliberate moves over the full-resolution photos (2268×4032, so every
// crop is at least native 1080×1920), a light grain and a quiet grade, cuts on the beats, the house captions.
//   1 · wide, the Yle signpost behind the jug: a slow push                            "Found today. Pasila. Roundup."
//   2 · the label fills the frame: a rack down onto its own claim                      "'Kills weeds, roots and all.'"
//   3 · the jug small at the foot of the tree, a drift across the leaf litter          "Who left it? Unknown."
//   4 · the jug in low sun under the tree, a slow tilt down from the light             "Who allowed it? The EU, until 2033."
//   5 · tight into the label, where a warning would go                                 "On the label, here too: no cancer warning."
// The film says found, never used; nothing is attached to Yle beyond "in front of"; photo 5's distant passer-by (top
// right) never enters a crop. 1080×1920, 30 fps. film.html?lang=en

import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, FPS = 30;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, { weight: '100 900' }); document.fonts.add(await f.load()); }
await CAP.loadFonts(FONT_DIR);

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3) };

// ------------------------------------------------------------------ the photos
const SRC = '../../ref/roundup-pasila/07-11-roundup-yle-pasila-';
const load = (i) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('photo ' + i)); im.src = `${SRC}${i}.jpg`; });
const PH = await Promise.all([1, 2, 3, 4, 5].map(load));
const PW = PH[0].naturalWidth, PHT = PH[0].naturalHeight;   // 2268 × 4032: exactly 9:16, 2.1× the frame

// ------------------------------------------------------------------ the copy, the beats, the events
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.0], ['s3', 8.0], ['s4', 11.4], ['s5', 15.4], ['end', 20.0]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const popT = (id) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { hook: popT('found'), claim: popT('label'), unknown: popT('unknown'), eu: popT('eu'), turn: popT('warning'),
  push1: T.s1 + 0.2, rack2: T.s2 + 0.9, drift3: T.s3, tilt4: T.s4, push5: T.s5, tram: T.s3 + 1.2, breath: T.s5 };

// ------------------------------------------------------------------ the five shots: a crop window on a photo, moving
// a window is (cx, cy) in image fractions and s = the window's width as a fraction of the frame's (1 = native 1080 px,
// 2.1 = the whole photo). It is clamped inside the photo, so a move can never show an edge.
const win = (im, cx, cy, s) => { const w = W * s, h = H * s; const x = clamp(cx * PW - w / 2, 0, PW - w), y = clamp(cy * PHT - h / 2, 0, PHT - h); return { im, x, y, w, h }; };
const SHOT = [
  { // 1 · the whole first photo, pushing gently toward the jug; the Yle sign stays in
    t0: () => T.s1, ph: PH[0], a: [0.5, 0.5, 2.1], b: [0.46, 0.56, 1.78], e: ease.io },
  { // 2 · photo 4, the jug among the nettles with the tower and the low sun behind: a push down onto ROUNDUP and its claim
    t0: () => T.s2, ph: PH[3], a: [0.5, 0.62, 1.6], b: [0.47, 0.78, 1.0], e: ease.io },
  { // 3 · photo 3, the jug small at the foot of the tree: a slow drift across the leaf litter
    t0: () => T.s3, ph: PH[2], a: [0.52, 0.5, 2.1], b: [0.46, 0.58, 1.9], e: (k) => smooth(k) },
  { // 4 · photo 2, the jug in low sun: a tilt down from the lit twigs onto it
    t0: () => T.s4, ph: PH[1], a: [0.5, 0.42, 1.7], b: [0.42, 0.6, 1.45], e: ease.io },
  { // 5 · photo 5, tight into the label's small print, where a warning would go: the slow push of the turn
    //     (its lower-left two thirds only: the distant passer-by at the top right never enters the frame)
    t0: () => T.s5, ph: PH[4], a: [0.45, 0.72, 0.95], b: [0.44, 0.84, 0.6], e: (k) => ease.out(k) },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };
const SHOT_END = (i) => i + 1 < SHOT.length ? SHOT[i + 1].t0() : T.end;

// ------------------------------------------------------------------ grain and grade
const GRAIN = document.createElement('canvas'); GRAIN.width = 512; GRAIN.height = 512;
{ const g = GRAIN.getContext('2d'), d = g.createImageData(512, 512); let s = 7;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = 96 + ((s >> 8) & 127); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); }
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');
document.body.appendChild(out); out.style.width = '100%';

/** a tag, bottom left: dark ink on bone, clear of the right-hand rail (as the other RFH films) */
function tag(g, text, a) {
  if (a <= 0 || !text) return;
  g.save(); g.globalAlpha = a; g.font = '800 30px Inter';
  let w = g.measureText(text).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = `800 ${Math.floor(30 * maxW / w)}px Inter`; w = g.measureText(text).width; }
  const x = 110, y = 1520; g.fillStyle = 'rgba(236,230,214,.94)'; g.beginPath(); g.roundRect(x, y, w + 44, 62, 6); g.fill();
  g.fillStyle = '#1e1c1a'; g.textBaseline = 'middle'; g.fillText(text, x + 22, y + 32); g.restore();
}

function picture(t) {
  const i = shotAt(t), S = SHOT[i], d = SHOT_END(i) - S.t0(), k = S.e((t - S.t0()) / d);
  const [cx, cy, s] = [0, 1, 2].map((j) => lerp(S.a[j], S.b[j], k));
  const w = win(S.ph, cx, cy, s);
  g2d.setTransform(1, 0, 0, 1, 0, 0);
  // a cut: 4 frames up from black, so the photos change on the beat rather than jumping
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
  const since = t - S.t0(); if (since < 0.14 && i > 0) { g2d.fillStyle = `rgba(0,0,0,${1 - since / 0.14})`; g2d.fillRect(0, 0, W, H); }
}

function frame(t, captions = true) {
  picture(t);
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  tag(g2d, UI.tag1, tg(T.s1 + 1.2, T.s2 - 0.1));
  tag(g2d, UI.tag2, tg(T.s2 + 1.0, T.s2 + 2.6));
  tag(g2d, UI.tag2b, tg(T.s2 + 2.7, T.s3 - 0.1));
  tag(g2d, UI.tag3, tg(T.s3 + 0.9, T.s4 - 0.1));
  tag(g2d, UI.tag4, tg(T.s4 + 0.9, T.s4 + 2.5));
  tag(g2d, UI.tag4b, tg(T.s4 + 2.6, T.s5 - 0.1));
  tag(g2d, UI.tag5, tg(T.s5 + 1.2, T.s5 + 3.0));
  tag(g2d, UI.tag5b, tg(T.s5 + 3.1, T.end + 1));
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
