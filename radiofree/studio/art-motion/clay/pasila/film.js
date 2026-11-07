// FOUND IN PASILA (RFH, Helsinki 1) v3, 7 Nov 2026. An RFH photo film: the owner's five photos of a Roundup Piha jug
// found in a flowerbed in front of the Yle campus in Pasila that morning. The device is the TIP-OFF on top of the found
// object: the pirate station hands the public broadcaster a story found on its own doorstep. Yle is the addressee,
// never the accused: found, never used; who left it unknown; Yle has covered glyphosate for a decade.
// v3 is the owner's art direction, in its final form ("no window, just lower and upper 3rds", "basic after effects
// layers like YLE or others might use", "no need for dandelion"): a clean, GENERIC broadcast news package made of flat
// shape layers, and the photo untouched in the middle third.
//   UPPER third · a flat white caption bar with a thin aqua rule slides in from the left; the words are revealed by a
//                 mask a few frames after it, dark type (the house face and size, so every caption check still holds),
//                 the pop word on a gold highlight that wipes on with it.
//   LOWER third · a two-tier lower third: an aqua label chip over a white bar carrying the tag, wiping on from the left
//                 with a 5-frame stagger and off at the cut; flat white cards in the same system for the label's quote,
//                 the 2033 date and the tip-off to Yle (with a simple gold RFH roundel on the pop).
//   cuts        · a white bar sweeps across and the next photo is revealed behind it.
//   MIDDLE third· the photo. Every shot is framed so its subject sits there: the Yle sign (beat 1, then tilt down to the
//                 jug), the label (2), the small jug by the path (3), the jug in low sun (4), and a tilt up from the jug to
//                 the sign (5).
// News grammar, NOT a copy of Yle's own package or typeface, and the Yle logo is never drawn (only photographed), so
// nobody can take an RFH film for a Yle broadcast. Aqua #03b1d1 (measured off the sign in photo 1) is a nod, white
// dominant, RFH gold #f2b83a for the pop. Photo 5's distant passer-by (x≈0.88, y≈0.40) never enters a crop.
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
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  out: (k) => 1 - Math.pow(1 - clamp(k), 3), out5: (k) => 1 - Math.pow(1 - clamp(k), 5) };
const AQUA = '#03b1d1', AQUA_CHIP = '#0398b4', AQUA_DEEP = '#027d93', GOLD = '#f2b83a', WHITE = '#ffffff', INK = '#16191c', GREY = '#5b6168';
const F = 1 / FPS;

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
const SB = ['s1', 's2', 's3', 's4', 's5'];
const EV = { hook: popT('found'), claim: popT('label'), kid: popT('kid'), eu: popT('eu'), turn: popT('doorstep'),
  chip1: T.s1 + 1.2, chip2: T.s2 + 0.9, chip3: T.s3 + 0.8, chip4: T.s4 + 0.8, chip5: T.s5 + 0.8,
  card2: T.s2 + 0.45, card4: T.s4 + 0.45, year4: wordT('eu', /2033/), card5: T.s5 + 0.5, stamp5: popT('doorstep'),
  tilt1: T.s1 + 1.45, rack2: T.s2 + 0.3, drift3: T.s3, tilt4: T.s4, tilt5: T.s5, tram: T.s3 + 1.2, breath: T.s5 };
const SWEEP = 0.36;                                  // the white bar's sweep across a cut

// ------------------------------------------------------------------ the five shots: a crop window on a photo, moving
// (cx, cy) = the point the window centres on, in image fractions; s = the window's width as a fraction of the frame's
// (1 = native 1080 px, 2.1 = the whole photo). Clamped inside the photo, so a move never shows an edge. Each shot puts
// its subject in the middle third.
const win = (im, cx, cy, s) => { const w = W * s, h = H * s; const x = clamp(cx * PW - w / 2, 0, PW - w), y = clamp(cy * PHT - h / 2, 0, PHT - h); return { im, x, y, w, h }; };
const hold = (h, e) => (k) => (k <= h ? 0 : e((k - h) / (1 - h)));
const SHOT = [
  { // 1 · photo 1: the Yle sign in the middle third, held through "Yle", then a tilt down to the jug in the flowerbed
    t0: () => T.s1, ph: PH[0], a: [0.553, 0.165, 0.7], b: [0.4, 0.705, 1.12], e: hold(0.42, ease.io) },
  { // 2 · photo 4: the label in low sun, a slow push onto ROUNDUP and its own claim
    t0: () => T.s2, ph: PH[3], a: [0.34, 0.8, 0.86], b: [0.33, 0.855, 0.62], e: ease.io },
  { // 3 · photo 3: the jug small at the foot of the tree, the path beside it: a slow drift across the leaf litter
    t0: () => T.s3, ph: PH[2], a: [0.52, 0.5, 2.1], b: [0.46, 0.57, 1.84], e: (k) => smooth(k) },
  { // 4 · photo 2: the jug in low sun under the tree, held in the middle third: a slow push in on it
    t0: () => T.s4, ph: PH[1], a: [0.4, 0.62, 1.6], b: [0.34, 0.63, 1.25], e: ease.io },
  { // 5 · photo 5: the turn, a tilt up from the jug to the Yle sign (the addressee), done by the pop, then it rests.
    //     The window's right edge stays left of x≈0.83 and its top half above y≈0.33: the passer-by never enters.
    t0: () => T.s5, ph: PH[4], a: [0.3, 0.8, 1.0], b: [0.665, 0.13, 0.68], e: (k) => ease.io(Math.min(1, k * 1.9)) },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };
const SHOT_END = (i) => i + 1 < SHOT.length ? SHOT[i + 1].t0() : T.end;
function windowOf(i, t) { const S = SHOT[i], d = SHOT_END(i) - S.t0(), k = S.e(clamp((t - S.t0()) / d)); const [cx, cy, s] = [0, 1, 2].map((j) => lerp(S.a[j], S.b[j], k)); return win(S.ph, cx, cy, s); }

// ------------------------------------------------------------------ the grade (light) and the film grain
const GRAIN = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), d = g.createImageData(512, 512); let s = 7;
  for (let i = 0; i < d.data.length; i += 4) { s = (s * 16807) % 2147483647; const v = 96 + ((s >> 8) & 127); d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } g.putImageData(d, 0, 0); return c; })();
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');
document.body.appendChild(out); out.style.width = '100%';
function drawPhoto(g, w) { g.drawImage(w.im, w.x, w.y, w.w, w.h, 0, 0, W, H); }
function grade(g, t) {
  g.save();
  g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(248,238,222,0.14)'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(8,8,10,0.34)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.06; const seed = Math.floor(t * FPS);
  const ox = (seed * 97) % 512, oy = (seed * 193) % 512;
  for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) g.drawImage(GRAIN, x, y);
  g.restore();
}
/** the cut: a white bar sweeps left to right, the next photo revealed behind it */
function sweep(g, t, i) {
  const since = t - SHOT[i].t0(), k = ease.io(since / SWEEP), bw = 150, lead = lerp(-bw, W + bw, k);
  drawPhoto(g, windowOf(i - 1, SHOT[i].t0() - 0.001));
  g.save(); g.beginPath(); g.rect(-1, 0, Math.max(0, lead + 1), H); g.clip(); drawPhoto(g, windowOf(i, t)); g.restore();
  g.save(); g.fillStyle = WHITE; g.fillRect(lead, 0, bw, H); g.fillStyle = AQUA; g.fillRect(lead + bw, 0, 10, H); g.restore();
}

// ------------------------------------------------------------------ type helpers
const font = (w, px, fam = 'Inter') => `${w} ${px}px ${fam === 'Inter' ? 'Inter' : `"${fam}"`}`;
function fitText(g, s, x, y, { size, weight = 800, fam = 'Inter', color = INK, align = 'left', max = 0, base = 'alphabetic', track = 0 } = {}) {
  g.save(); g.font = font(weight, size, fam); g.textAlign = align; g.textBaseline = base; g.fillStyle = color;
  if (track) g.letterSpacing = `${track}px`;
  if (max) { const w = g.measureText(s).width; if (w > max) g.font = font(weight, Math.floor(size * max / w), fam); }
  g.fillText(s, x, y); g.restore();
}
/** a horizontal wipe-on/off envelope: 0..1 in from `t0` over `d`, out over `od` ending at `t1` */
const wipeK = (t, t0, t1, d = 8 * F, od = 6 * F) => Math.min(ease.out5((t - t0) / d), ease.out5((t1 - t) / od));

// ------------------------------------------------------------------ UPPER third: the caption bar and the words
const ST = CAP.STYLES.big.latin;                    // the house face and size, so the caption checks still hold
function captionBar(g, t) {
  for (const c of P.captions) {
    const tIn = c.t0 - 0.24, tOut = c.t1 + 0.12;
    const kIn = ease.out5((t - tIn) / 0.32), kOut = ease.out5((t - tOut) / 0.24);
    if (kIn <= 0 || kOut >= 1) continue;
    const L = CAP.layout(g, c), b = L.box, y0 = Math.max(140, b.y - 26), y1 = b.y + b.h + 26;
    const x1 = W * kIn, x0 = W * kOut;               // in from the left, out to the right
    g.save(); g.fillStyle = WHITE; g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
    g.fillRect(x0, y0, x1 - x0, y1 - y0); g.shadowColor = 'transparent';
    g.fillStyle = AQUA; g.fillRect(x0, y1, x1 - x0, 8);
    g.restore();
    // the words: dark type revealed by a mask that rises with each word; the pop word on a gold highlight
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    g.font = `${ST.size}px "${ST.family}"`; g.textBaseline = 'alphabetic';
    c.words.forEach((w, i) => {
      const k = t - w.t, p = L.words[i]; if (k <= 0 || kOut >= 1) return;
      const r = ease.out5(k / 0.26), lh = ST.lead, top = p.y - ST.size * 0.92;
      g.save(); g.beginPath(); g.rect(p.x - 14, top - 6, p.width + 28, lh + 4); g.clip();
      if (w.pop) { const hk = ease.out5((k - 0.06) / 0.22); if (hk > 0) { g.fillStyle = GOLD; g.fillRect(p.x - 10, p.y - ST.size * 0.66, (p.width + 20) * hk, ST.size * 0.86); } }
      g.fillStyle = INK; g.fillText(w.w, p.x, p.y + (1 - r) * lh * 0.9); g.restore();
    });
    g.restore();
  }
}

// ------------------------------------------------------------------ LOWER third: the two-tier lower third and the cards
const LX = 64, CHIP_H = 52, BAR_BOT = 1594, RAIL = 905, TAG_PX = 30, TAG_LH = 38, TAG_MAX = RAIL - LX - 52;
/** a tag that will not sit on one line at TAG_PX is broken in two: at a " · " if one balances it, else after a colon,
 *  else at a comma (never inside a list when a heading can go on its own line), a trailing " ·" dropped */
function tagLines(g, s) {
  g.save(); g.font = font(800, TAG_PX); const wide = (x) => g.measureText(x).width; const w = wide(s);
  let best = null;
  if (w > TAG_MAX * 1.08) for (const sep of [' · ', ': ', ', ']) {
    const cuts = [...s.matchAll(new RegExp(sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))].map((m) => m.index + sep.length);
    const opts = cuts.map((at) => [s.slice(0, at).replace(/ ·\s*$/, '').trim(), s.slice(at).trim()]).map((l) => ({ l, m: Math.max(...l.map(wide)) }));
    const ok = opts.filter((o) => o.m <= TAG_MAX * 1.1).sort((a, b) => a.m - b.m);
    if (ok.length) { best = ok[0].l; break; }
  }
  g.restore(); return best || [s];
}
function lowerThird(g, t, chip, tags, tOn, tOff) {
  const kc = wipeK(t, tOn, tOff), kb = wipeK(t, tOn + 5 * F, tOff - 2 * F); if (kc <= 0 && kb <= 0) return;
  const lines = tags.map(([s]) => tagLines(g, s)), two = lines.some((l) => l.length > 1);
  const BAR_H = two ? 70 + TAG_LH : 70, BAR_Y = BAR_BOT - BAR_H, CHIP_Y = BAR_Y - CHIP_H - 2;
  // the chip: aqua (a shade deeper than the sign's, so white caps on it clear 3:1), white caps
  g.save(); g.font = font(800, 30); g.letterSpacing = '2px'; const cw = g.measureText(chip).width + 44; g.restore();
  if (kc > 0) { g.save(); g.beginPath(); g.rect(LX, CHIP_Y, cw * kc, CHIP_H); g.clip(); g.fillStyle = AQUA_CHIP; g.fillRect(LX, CHIP_Y, cw, CHIP_H);
    fitText(g, chip, LX + 22, CHIP_Y + 37, { size: 30, color: WHITE, track: 2 }); g.restore(); }
  // the bar: white, the current tag in dark type; tags change with a short upward mask
  if (kb > 0) {
    let j = 0; tags.forEach(([, a], i) => { if (t >= a) j = i; });
    const ch = clamp((t - tags[j][1]) / 0.25), e = ease.out5(ch);
    const draw = (ls, dy) => { const y0 = BAR_Y + 46 + (BAR_H - 70 - (ls.length - 1) * TAG_LH) / 2;
      ls.forEach((l, k) => fitText(g, l, LX + 30, y0 + k * TAG_LH + dy, { size: TAG_PX, max: TAG_MAX })); };
    g.save(); g.beginPath(); g.rect(LX, BAR_Y, (RAIL - LX) * kb, BAR_H); g.clip();
    g.fillStyle = WHITE; g.fillRect(LX, BAR_Y, RAIL - LX, BAR_H); g.fillStyle = AQUA; g.fillRect(LX, BAR_Y, 8, BAR_H);
    g.beginPath(); g.rect(LX + 8, BAR_Y, RAIL - LX - 8, BAR_H); g.clip();
    if (j > 0 && ch < 1) draw(lines[j - 1], -e * BAR_H);
    draw(lines[j], (1 - e) * BAR_H);
    g.restore();
  }
}
/** a flat white card in the lower third, wiping on from the left; `body(g, w, h)` in card space */
function card(g, t, x, y, w, h, tOn, tOff, body) {
  const k = wipeK(t, tOn, tOff, 9 * F, 6 * F); if (k <= 0) return;
  g.save(); g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 22; g.shadowOffsetY = 8; g.fillStyle = WHITE;
  g.beginPath(); g.rect(x, y, w * k, h); g.fill(); g.shadowColor = 'transparent';
  g.beginPath(); g.rect(x, y, w * k, h); g.clip(); g.fillStyle = AQUA; g.fillRect(x, y, w, 8);
  g.translate(x, y); body(g, w, h); g.restore();
}
function quoteCard(g, t) {
  card(g, t, LX, 1236, RAIL - LX, 196, EV.card2, T.s3, (c, w) => {
    fitText(c, UI.quoteHead, 30, 54, { size: 24, color: AQUA_DEEP, track: 2 });
    fitText(c, UI.quote, 30, 116, { size: 44, fam: 'Poppins-800', weight: 400, max: w - 60 });
    fitText(c, UI.quoteSub, 30, 166, { size: 28, weight: 600, color: GREY, max: w - 60 });
    const u = ease.out5((t - EV.claim) / 0.3); if (u > 0) { c.fillStyle = GOLD; c.fillRect(30, 126, (w - 60) * u, 8); }
  });
}
function dateCard(g, t) {
  card(g, t, LX, 1196, 470, 236, EV.card4, T.s5, (c, w) => {
    fitText(c, UI.calHead, 30, 56, { size: 24, color: AQUA_DEEP, track: 2, max: w - 60 });
    const y = ease.out5((t - EV.year4) / 0.3);
    c.save(); c.beginPath(); c.rect(0, 70, w, 160); c.clip();
    fitText(c, UI.calYear, 30, 196 + (1 - y) * 150, { size: 128, fam: 'Poppins-800', weight: 400 });
    c.restore();
    if (y > 0) { c.fillStyle = GOLD; c.fillRect(30, 212, (w - 60) * y, 10); }
  });
}
function tipCard(g, t) {
  card(g, t, LX, 1236, RAIL - LX, 196, EV.card5, T.end + 1, (c, w) => {
    fitText(c, UI.envFrom, 30, 52, { size: 22, color: GREY, track: 1, max: w - 260 });
    fitText(c, UI.envTo, 30, 120, { size: 56, fam: 'Poppins-800', weight: 400, color: AQUA_DEEP, max: w - 260 });
    fitText(c, UI.envLine, 30, 168, { size: 28, weight: 600, color: GREY, max: w - 260 });
    const sk = t - EV.stamp5; if (sk >= 0) {                  // the RFH roundel: a simple gold ring that pops on the pop word
      const s = 1 + 0.5 * Math.exp(-sk * 10) * Math.max(0, 1 - sk * 3), a = clamp(sk / 0.05);
      c.save(); c.globalAlpha = a; c.translate(w - 116, 100); c.rotate(-0.16); c.scale(s, s);
      c.strokeStyle = GOLD; c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 66, 0, Math.PI * 2); c.stroke(); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 51, 0, Math.PI * 2); c.stroke();
      fitText(c, UI.stamp, 0, 16, { size: 44, fam: 'Poppins-800', weight: 400, color: GOLD, align: 'center' }); c.restore(); }
  });
}

// ------------------------------------------------------------------ the frame
function picture(t) {
  const i = shotAt(t), since = t - SHOT[i].t0(); g2d.setTransform(1, 0, 0, 1, 0, 0);
  if (i > 0 && since < SWEEP) sweep(g2d, t, i); else drawPhoto(g2d, windowOf(i, t));
  grade(g2d, t);
}
const tagsOf = (i) => [
  [[UI.tag1, T.s1]],
  [[UI.tag2, T.s2], [UI.tag2b, T.s2 + 2.3]],
  [[UI.tag3, T.s3]],
  [[UI.tag4, T.s4], [UI.tag4b, T.s4 + 2.2]],
  [[UI.tag5, T.s5], [UI.tag5c, T.s5 + 3.4]],
][i];
function graphics(t) {
  const i = shotAt(t), on = EV[`chip${i + 1}`], off = i + 1 < SHOT.length ? SHOT[i + 1].t0() : T.end + 1;
  if (i === 1) quoteCard(g2d, t);
  if (i === 3) dateCard(g2d, t);
  if (i === 4) tipCard(g2d, t);
  lowerThird(g2d, t, UI[`chip${i + 1}`], tagsOf(i).map(([s, a], j) => [s, j === 0 ? on : a]), on, off);
}

function frame(t, captions = true) {
  picture(t);
  graphics(t);
  CAP.bug(g2d);
  if (captions) captionBar(g2d, t);
  return out;
}
frame(0, false);
const BUSY = {};                                    // the captions sit on a solid white bar: no scrim is ever needed
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, ...CAP.events(P), quiet: [{ t0: +T.s5.toFixed(3), t1: +(T.s5 + 0.6).toFixed(3) }] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY }) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
