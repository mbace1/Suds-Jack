// KILL SWITCH — the full film (slate 17 Oct, pitch 2; scheduled Thu 22 Oct 00:50, plan/RFH-NEXT.md). The approved flat
// leaflet look (v3) with the pilot's 2D motion polish (clay/kill-switch/film.js), grown to the pitched story:
//   1 the toaster's leaflet, its warnings popping in          5 the kill switch is a sticky note: a study; the tap does nothing
//   2 switch 1 jams, switch 2 takes over                       6 a third leaflet slides in — Microsoft's president's washing
//   3 a DEFECT envelope into the postbox, a stopwatch to 24 h    machine — and fills itself in
//   4 the leaflet turns: a frontier AI model, nothing on it;   7 the three side by side; the AI's folds shut, empty
//     the counter rolls to 0, VOLUNTARY slaps across it
// Every word on screen comes from copy.json through pipeline/text/captions.js; the beats below are the base cut and the
// copy may hold any of them for a slower language. 1080×1920, 30 fps. film.html?lang=en|fi|ja
import { AW, AH, INK } from '../../clay/kill-switch/print.js';
import { front, back, washer } from '../../clay/kill-switch/artwork.js';
import * as CAP from '../../pipeline/text/captions.js';

const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const W = 1080, H = 1920, FPS = 30, SAFE_B = 1630, TAU = Math.PI * 2;
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file, desc] of [['RobotoCondensed', 'RobotoCondensed-var.woff', { weight: '100 900' }], ['Kalam', 'Kalam-700.woff', {}]]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, desc); document.fonts.add(await f.load());
}
await CAP.loadFonts(FONT_DIR);
{ const f = new FontFace('IPAPGothic', `url(${FONT_DIR}IPAPGothic.ttf)`); document.fonts.add(await f.load()); }
const COPY = await CAP.loadCopy('copy.json');
const UIF = (w, px) => `${w} ${px}px "RobotoCondensed", "NotoSansJP-800"`;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
  spring: (k) => { k = Math.max(0, k); return 1 - Math.exp(-7 * k) * Math.cos(11 * k); } };

// ------------------------------------------------------------------ the sheets, flat, at 2.4× for crisp punch-ins
const PAPER = '#f1eee5';
const FLAT = { [INK.K]: '#1a1a1a', [INK.Y]: '#f2c200', [INK.R]: '#d22b2b', [INK.B]: '#1f5aa6', [INK.T10]: '#e2ded2', [INK.T22]: '#c9c6bd', [INK.T40]: '#a9a69d', [INK.W]: '#fbfaf6' };
const flatContext = (real) => new Proxy(real, { get(t, k) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; }, set(t, k, v) { t[k] = (k === 'fillStyle' || k === 'strokeStyle') && FLAT[v] ? FLAT[v] : v; return true; } });
const SC = 2.4;
function side(draw) {
  const c = mk(AW * SC, AH * SC), g = c.getContext('2d'); g.fillStyle = PAPER; g.fillRect(0, 0, c.width, c.height);
  for (const fy of [AH / 3, (2 * AH) / 3]) { const y = fy * SC, sh = g.createLinearGradient(0, y - 26 * SC, 0, y + 26 * SC); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.48, 'rgba(0,0,0,.05)'); sh.addColorStop(0.5, 'rgba(255,255,255,.5)'); sh.addColorStop(0.56, 'rgba(0,0,0,.03)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, y - 26 * SC, c.width, 52 * SC); }
  g.scale(SC, SC); draw(flatContext(g)); return c;
}
const FRONT = side(front), BACK = side(back), WASH = side((g) => washer(g, 8));
const CELL = (i) => [140 + (i % 4) * 207, 806 + ((i / 4) | 0) * 166];

// ------------------------------------------------------------------ the timeline: base beats, retimed by the copy for this language
const BEATS = [['enter', 0.0], ['land', 0.5], ['picts', 0.9], ['toToaster', 3.5], ['jam', 4.4], ['flip2', 4.9], ['toPost', 7.0], ['drop', 7.5], ['clock', 8.0],
  ['flipA', 11.6], ['flipB', 12.1], ['roll', 12.4], ['rollEnd', 13.2], ['toNote', 16.7], ['slap', 17.1], ['tap', 18.7], ['toWasher', 22.3], ['back', 29.1], ['end', 34.0]];
const P = CAP.plan(COPY, LANG, BEATS), T = P.T, DUR = T.end;
const popOf = (id) => { const c = P.captions.find((x) => x.id === id); return c ? (c.words.find((w) => w.pop) || c.words[0]).t : 0; };
const tVol = popOf('voluntary'), tWash = T.toWasher + 0.6, tFold = popOf('last') + 0.1;
const EVENTS = { ...T, lang: LANG, holds: P.holds, vol: tVol, fold: tFold,
  pictTimes: Array.from({ length: 8 }, (_, i) => T.picts + i * 0.085), rollTicks: Array.from({ length: 8 }, (_, i) => lerp(T.roll, T.rollEnd, (i + 1) / 8)),
  clockTicks: Array.from({ length: 12 }, (_, i) => T.clock + i * 0.12), washTimes: Array.from({ length: 8 }, (_, i) => tWash + 0.5 + i * 0.16),
  ...CAP.events(P), quiet: [{ t0: T.tap + 0.02, t1: T.tap + 1.1, why: 'the joke: the tap stops the music' }] };

// ------------------------------------------------------------------ where the leaflets are on the desk (desk = frame coordinates at zoom 1)
const LS = 0.8, HERO = { x: 540, y: 452 + (AH * LS) / 2, s: LS, rot: -0.02 };
/** each leaflet's pose at t: the hero spot until the tableau; the washer slides in over the AI page; then three side by side */
function poses(t) {
  const enter = ease.spring((t - T.enter) / 0.9), kb = ease.io((t - T.back) / 1.1);
  const fk = clamp((t - T.flipA) / (T.flipB - T.flipA)), flip = ease.io(fk) * Math.PI;
  const wk = ease.out((t - T.toWasher) / 0.8);
  const hero = { x: HERO.x, y: HERO.y + (1 - clamp(enter)) * 1400, s: LS, rot: HERO.rot + (1 - clamp(enter)) * -0.12, flip };
  const ai = { ...hero, x: lerp(hero.x, lerp(540, 300, wk * 0), kb), y: lerp(hero.y, 1270, kb), s: lerp(LS, 0.36, kb), rot: lerp(hero.rot, 0.03, kb) };
  const toast = { sheet: FRONT, x: lerp(-700, 300, kb), y: lerp(760, 735, kb), s: 0.36, rot: -0.05, flip: 0 };
  const wash = { sheet: WASH, x: lerp(lerp(1700, HERO.x + 10, wk), 780, kb), y: lerp(HERO.y - 10, 735, kb), s: lerp(LS, 0.36, kb), rot: lerp(0.03, 0.04, kb), flip: 0 };
  const fold = ease.io((t - tFold) / 0.6);
  return { hero: { ...ai, sheet: flip < Math.PI / 2 ? FRONT : BACK, fold }, toast, wash, wk, kb };
}
/** an artwork point on a posed leaflet → desk */
function toDesk(L, ax, ay) { const x0 = (ax - AW / 2) * L.s, y0 = (ay - AH / 2) * L.s; return [L.x + x0 * Math.cos(L.rot) - y0 * Math.sin(L.rot), L.y + x0 * Math.sin(L.rot) + y0 * Math.cos(L.rot)]; }

// ------------------------------------------------------------------ the camera: [time, focus x, focus y (in the HERO leaflet's artwork), zoom]
const CAM = [[0, 450, 680, 1.0], [T.toToaster - 0.2, 450, 680, 1.0], [T.toToaster + 0.35, 420, 430, 1.62], [T.toPost - 0.05, 420, 430, 1.62], [T.toPost + 0.45, 470, 1180, 1.38], [T.flipA - 0.1, 470, 1180, 1.38],
  [T.flipA + 0.45, 450, 680, 1.0], [T.flipB + 0.15, 450, 680, 1.0], [T.flipB + 0.55, 450, 830, 1.36], [T.toNote - 0.05, 450, 830, 1.36], [T.toNote + 0.4, 470, 880, 1.46], [T.tap + 0.25, 520, 900, 1.5],
  [T.toWasher - 0.1, 520, 900, 1.5], [T.toWasher + 0.5, 450, 680, 1.0], [tWash + 0.3, 450, 900, 1.3], [T.back - 0.1, 450, 900, 1.3], [T.back + 1.0, 450, 680, 1.0], [999, 450, 680, 1.0]];
function camAt(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1][0] <= t) i++; const a = CAM[i], b = CAM[i + 1], k = ease.io((t - a[0]) / Math.max(1e-6, b[0] - a[0]));
  const fx = lerp(a[1], b[1], k) + Math.sin(t * 0.9) * 4, fy = lerp(a[2], b[2], k) + Math.sin(t * 0.7 + 1) * 5, z = lerp(a[3], b[3], k) * (1 + 0.008 * Math.sin(t * 1.1));
  const [dx, dy] = toDesk(HERO, fx, fy); return { x: dx, y: dy, z };   // the camera centres that desk point
}
const toFrame = (cam, [x, y]) => [W / 2 + (x - cam.x) * cam.z, H / 2 + (y - cam.y) * cam.z];

// ------------------------------------------------------------------ pieces (as the pilot, plus the new ones)
const TOP = '#1c1d1f';
const worktop = (() => { const c = mk(W, H), g = c.getContext('2d'); g.fillStyle = TOP; g.fillRect(0, 0, W, H);
  const r = rng(3); for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.022)' : 'rgba(0,0,0,.16)'; g.fillRect(r() * W, r() * H, 2 + r() * 3, 1 + r() * 2); }
  const v = g.createRadialGradient(540, 860, 200, 540, 960, 1150); v.addColorStop(0, 'rgba(255,240,215,.10)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = v; g.fillRect(0, 0, W, H); return c; })();
function pill(c, x, y, w, h, fill, s, a) { c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s); c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 24; c.shadowOffsetY = 10; c.fillStyle = fill; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h / 2); c.fill(); c.shadowColor = 'transparent'; }
function chip(c, x, y, label, col, glyph, s = 1, a = 1) {
  if (s <= 0.01 || a <= 0) return;
  c.save(); c.font = UIF(700, 34); const w = c.measureText(label).width + 96; c.restore();
  pill(c, x, y, w, 66, '#ffffff', s, a);
  c.fillStyle = col; c.beginPath(); c.arc(-w / 2 + 34, 0, 22, 0, TAU); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
  if (glyph === 'x') { c.moveTo(-w / 2 + 25, -9); c.lineTo(-w / 2 + 43, 9); c.moveTo(-w / 2 + 43, -9); c.lineTo(-w / 2 + 25, 9); } else { c.moveTo(-w / 2 + 24, 1); c.lineTo(-w / 2 + 31, 9); c.lineTo(-w / 2 + 45, -8); }
  c.stroke(); c.fillStyle = '#1a1a1a'; c.font = UIF(700, 34); c.textBaseline = 'middle'; c.fillText(label, -w / 2 + 66, 2); c.restore();
}
function counterChip(c, x, y, n, s, a) {
  if (s <= 0.01) return; pill(c, x, y, 300, 92, '#f2c200', s, a);
  c.fillStyle = '#1a1a1a'; c.font = UIF(800, 60); c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(String(n), -48, 4);
  c.font = UIF(700, 30); c.textAlign = 'left'; c.fillText(P.ui.warnings, -36, 4); c.restore();
}
/** the postbox: a modern UI tile with a slot; the DEFECT envelope drops into it */
function postbox(c, x, y, s, a, slotGlow) {
  if (s <= 0.01) return; pill(c, x, y, 230, 230, '#1f5aa6', s, a); c.restore();
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#fbfaf6'; c.font = UIF(800, 30); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CPSC', 0, 62);
  c.fillStyle = '#0d2c55'; c.beginPath(); c.roundRect(-70, -40, 140, 22, 11); c.fill();
  if (slotGlow > 0) { c.fillStyle = `rgba(242,194,0,${slotGlow})`; c.beginPath(); c.roundRect(-70, -40, 140, 22, 11); c.fill(); }
  c.restore();
}
function envelope(c, x, y, s, rot, a) {
  if (a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 18; c.shadowOffsetY = 8; c.fillStyle = '#fbfaf6'; c.fillRect(-110, -70, 220, 140); c.shadowColor = 'transparent';
  c.strokeStyle = '#c9c6bd'; c.lineWidth = 4; c.beginPath(); c.moveTo(-110, -70); c.lineTo(0, 10); c.lineTo(110, -70); c.stroke();
  c.fillStyle = '#d22b2b'; c.fillRect(-80, 22, 160, 36); c.fillStyle = '#fff'; c.font = UIF(800, 26); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(P.ui.defect, 0, 41); c.restore();
}
/** the stopwatch: a dial that sweeps a day — 24 hours — and stops on it */
function stopwatch(c, x, y, s, a, k) {
  if (s <= 0.01) return; pill(c, x, y, 220, 220, '#ffffff', s, a); c.restore();
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#1a1a1a'; c.fillRect(-16, -124, 32, 18); c.beginPath(); c.arc(0, 0, 84, 0, TAU); c.lineWidth = 8; c.strokeStyle = '#1a1a1a'; c.stroke();
  c.fillStyle = 'rgba(242,194,0,.45)'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 76, -Math.PI / 2, -Math.PI / 2 + k * TAU); c.closePath(); c.fill();
  c.strokeStyle = '#d22b2b'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(-Math.PI / 2 + k * TAU) * 70, Math.sin(-Math.PI / 2 + k * TAU) * 70); c.stroke();
  c.fillStyle = '#1a1a1a'; c.font = UIF(800, 30); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`${String(Math.round(k * 24)).padStart(2, '0')}:00`, 0, 34); c.restore();
}
/** VOLUNTARY: a red rubber-stamped sticker across the empty warnings */
function sticker(c, x, y, s, rot, a) {
  if (s <= 0.01 || a <= 0) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); c.scale(s, s); c.font = UIF(800, 64); const w = c.measureText(P.ui.voluntary).width + 80;
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 22; c.shadowOffsetY = 10; c.fillStyle = '#fbfaf6'; c.beginPath(); c.roundRect(-w / 2, -60, w, 120, 14); c.fill(); c.shadowColor = 'transparent';
  c.strokeStyle = '#d22b2b'; c.lineWidth = 8; c.beginPath(); c.roundRect(-w / 2 + 12, -48, w - 24, 96, 10); c.stroke(); c.fillStyle = '#d22b2b'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(P.ui.voluntary, 0, 4); c.restore();
}
function note(c, x, y, s, rot, lift = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const N = 300, r = rng(12);
  c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 26 + lift * 40; c.shadowOffsetX = 10 + lift * 30; c.shadowOffsetY = 16 + lift * 40; c.fillStyle = '#fbe55c'; c.fillRect(-N / 2, -N / 2, N, N); c.restore();
  c.fillStyle = '#f2d84a'; c.fillRect(-N / 2, -N / 2, N, 46);
  c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.moveTo(N / 2, N / 2 - 70); c.lineTo(N / 2, N / 2); c.lineTo(N / 2 - 70, N / 2); c.fill();
  c.fillStyle = '#fff3a6'; c.beginPath(); c.moveTo(N / 2, N / 2 - 64); c.lineTo(N / 2 - 64, N / 2); c.lineTo(N / 2 - 58, N / 2 - 58); c.closePath(); c.fill();
  const cx = 0, cy = 8, R = 72;
  c.save(); c.beginPath(); c.ellipse(cx, cy, R, R * 0.62, 0, 0, TAU); c.clip(); c.lineCap = 'round';
  for (let k = -R * 2; k < R * 2; k += 8) { c.strokeStyle = `rgba(214,30,40,${0.6 + r() * 0.2})`; c.lineWidth = 8 + r() * 2; c.beginPath(); c.moveTo(cx + k - 46, cy - R); c.lineTo(cx + k + 46, cy + R); c.stroke(); }
  c.restore(); c.strokeStyle = 'rgba(30,24,30,.92)'; c.lineWidth = 4; c.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) { c.beginPath(); for (let a = 0; a <= TAU + 0.3; a += 0.05) { const w = 1 + (r() - 0.5) * 0.03; c.lineTo(cx + Math.cos(a) * R * w + pass * 2, cy + Math.sin(a) * R * 0.62 * w); } c.stroke(); }
  c.beginPath(); c.moveTo(cx - R, cy + 3); c.bezierCurveTo(cx - R + 2, cy + 58, cx + R - 2, cy + 58, cx + R, cy + 2); c.stroke();
  c.beginPath(); c.moveTo(cx - R + 2, cy + 34); c.lineTo(cx - R + 2, cy + 54); c.moveTo(cx + R - 2, cy + 34); c.lineTo(cx + R - 2, cy + 53); c.stroke();
  c.fillStyle = 'rgba(30,24,30,.92)'; c.textAlign = 'center';
  c.font = '700 44px Kalam'; c.save(); c.translate(0, -78); c.rotate(-0.03); c.fillText('KILL SWITCH', 0, 0); c.restore();
  c.font = '700 33px Kalam'; c.save(); c.translate(0, 124); c.rotate(0.02); c.fillText('study — due 16 Nov', 0, 0); c.restore();
  c.restore();
}
function tag(c, text, k) {
  if (k <= 0) return; const x = lerp(-700, 110, ease.out(k)), yb = SAFE_B; c.save(); c.font = UIF(700, 34);
  const w = c.measureText(text).width + 80, h = 62, y = yb - h;
  c.fillStyle = '#1a1a1a'; c.fillRect(x, y, w, h);
  c.save(); c.beginPath(); c.rect(x, y, 30, h); c.clip(); c.fillStyle = '#f2c200'; for (let q = -2; q < 6; q++) { c.beginPath(); c.moveTo(x + q * 18, y + h); c.lineTo(x + q * 18 + 9, y + h); c.lineTo(x + q * 18 + 9 + h, y); c.lineTo(x + q * 18 + h, y); c.fill(); } c.restore();
  c.fillStyle = '#f2c200'; c.textBaseline = 'middle'; c.fillText(text, x + 50, y + h / 2 + 2); c.restore();
}
/** one leaflet on the desk: its shadow, the paper, a flip (a squash and a lift), a fold shut (it closes toward its middle) */
function leaflet(g, L, t, hideCells = null) {
  const sx = Math.cos(L.flip || 0), lift = Math.sin(L.flip || 0) * 60, fold = L.fold || 0;
  g.save(); g.translate(L.x, L.y - lift); g.rotate(L.rot); g.scale(L.s * Math.abs(sx) * (1 + lift / 900), L.s * (1 + lift / 900) * (1 - 0.94 * fold));
  g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 40 + lift * 0.6; g.shadowOffsetX = 18; g.shadowOffsetY = 26 + lift; g.fillStyle = PAPER; g.fillRect(-AW / 2, -AH / 2, AW, AH); g.restore();
  g.drawImage(L.sheet, -AW / 2, -AH / 2, AW, AH);
  if (Math.abs(sx) < 0.98) { g.fillStyle = `rgba(0,0,0,${(1 - Math.abs(sx)) * 0.35})`; g.fillRect(-AW / 2, -AH / 2, AW, AH); }
  if (fold > 0) { g.fillStyle = `rgba(0,0,0,${fold * 0.4})`; g.fillRect(-AW / 2, -AH / 2, AW, AH); }
  if (hideCells) { g.translate(-AW / 2, -AH / 2); for (let i = 0; i < 8; i++) {
    const [cx, cy] = CELL(i), k = t - hideCells[i], cw = 196, top = cy - 70, bot = cy + 112;
    if (k < 0.6) { g.fillStyle = PAPER; g.fillRect(cx - cw / 2, top, cw, bot - top); }
    if (k > 0 && k < 0.6) { const s = ease.back(k / 0.32); g.save(); g.translate(cx, cy); g.scale(s, s); g.drawImage(L.sheet, (cx - cw / 2) * SC, top * SC, cw * SC, (bot - top) * SC, -cw / 2, top - cy, cw, bot - top); g.restore(); }
  } }
  g.restore();
}

// ------------------------------------------------------------------ one frame
const out = mk(W, H), g = out.getContext('2d');
function frame(t, captions = true) {
  const cam = camAt(t), L = poses(t), F = (p) => toFrame(cam, p);
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(worktop, 0, 0);
  g.save(); g.translate(W / 2, H / 2); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
  if (t > T.back - 0.1) leaflet(g, L.toast, t);
  if (L.wk > 0 && t > T.back - 0.1) leaflet(g, L.wash, t, EVENTS.washTimes);
  leaflet(g, L.hero, t, L.hero.sheet === FRONT ? EVENTS.pictTimes : null);
  if (L.wk > 0 && t <= T.back - 0.1) leaflet(g, L.wash, t, EVENTS.washTimes);
  g.restore();
  const H0 = L.hero;
  // 2 · the switches
  const k1 = t - T.jam, k2 = t - T.flip2, out1 = clamp((t - T.toPost) / 0.3), shake = k1 > 0 && k1 < 0.4 ? Math.sin(k1 * 80) * 10 * (1 - k1 / 0.4) : 0;
  { const [x1, y1] = F(toDesk(H0, 250, 540)), [x2, y2] = F(toDesk(H0, 560, 600));
    chip(g, x1 + shake, y1, P.ui.switch1, '#d22b2b', 'x', ease.back(k1 / 0.3) * (1 - out1), 1 - out1); chip(g, x2, y2, P.ui.switch2, '#2f9a52', 'v', ease.back(k2 / 0.3) * (1 - out1), 1 - out1); }
  // 3 · the defect: an envelope drops into the postbox; the stopwatch sweeps to 24 hours
  { const inK = ease.back((t - T.toPost - 0.2) / 0.3) * (1 - clamp((t - T.flipA + 0.3) / 0.3)), a = 1 - clamp((t - T.flipA + 0.3) / 0.3);
    const [px, py] = F(toDesk(H0, 640, 1080)), [sx, sy] = F(toDesk(H0, 270, 1080));
    postbox(g, px, py, inK, a, t > T.drop + 0.35 && t < T.drop + 0.8 ? 1 - (t - T.drop - 0.35) / 0.45 : 0);
    const ek = clamp((t - T.drop) / 0.4); if (t > T.drop - 0.3 && ek < 1) envelope(g, px, lerp(py - 520, py - 30, ease.out(ek)), 0.62 * (1 - ek * 0.4), lerp(-0.4, 0, ek), 1 - clamp((ek - 0.85) / 0.15));
    stopwatch(g, sx, sy, ease.back((t - T.toPost - 0.35) / 0.3) * (1 - clamp((t - T.flipA + 0.3) / 0.3)), a, ease.io((t - T.clock) / 1.4)); }
  // 4 · the counter rolls to nothing; VOLUNTARY slaps across the empty warnings
  { const [kx, ky] = F(toDesk(H0, 700, 700)), cIn = t - (T.picts + 0.75), rollK = clamp((t - T.roll) / (T.rollEnd - T.roll)), fk = clamp((t - T.flipA) / (T.flipB - T.flipA));
    const n = t < T.roll ? 8 : Math.round(8 * (1 - rollK)), cOut = t > T.flipA && t < T.flipB ? 1 - Math.sin(fk * Math.PI) : 1;
    counterChip(g, kx, ky, n, ease.back(cIn / 0.3) * cOut * (t > T.toNote ? 1 - clamp((t - T.toNote) / 0.25) : 1) * (t < T.toPost - 0.1 || t > T.flipA ? 1 : 1 - clamp((t - T.toPost + 0.1) / 0.25)), 1);
    const sk = t - tVol, [vx, vy] = F(toDesk(H0, 450, 900));
    if (sk > -0.2 && t < T.toNote + 0.3) sticker(g, vx, vy, lerp(1.7, 1, ease.out((sk + 0.2) / 0.2)) * cam.z * 0.62, -0.12, clamp((sk + 0.2) / 0.1) * (1 - clamp((t - T.toNote) / 0.3))); }
  // 5 · the sticky note, and the tap that does nothing
  if (t > T.slap - 0.25 && t < T.toWasher + 0.6) {
    const k = clamp((t - (T.slap - 0.25)) / 0.25), [nx, ny] = F(toDesk(H0, 560, 900)), s = lerp(1.6, 1, ease.out(k)) * cam.z * 0.76, gone = clamp((t - T.toWasher) / 0.5);
    const wob = t > T.tap ? Math.sin((t - T.tap) * 26) * 0.05 * Math.exp(-(t - T.tap) * 4) : 0, settle = t > T.slap ? Math.sin((t - T.slap) * 20) * 0.03 * Math.exp(-(t - T.slap) * 6) : 0;
    g.save(); g.globalAlpha = k * (1 - gone); note(g, nx - gone * 900, ny - (1 - k) * 200, s, 0.09 + (1 - k) * 0.25 + wob + settle, 1 - k); g.restore();
    if (t > T.tap && t < T.tap + 0.7) { const kk = (t - T.tap) / 0.7, [bx, by] = F(toDesk(H0, 562, 908)); g.save(); g.strokeStyle = `rgba(255,255,255,${0.9 * (1 - kk)})`; g.lineWidth = 6; g.beginPath(); g.arc(bx, by, 30 + kk * 120, 0, TAU); g.stroke();
      g.fillStyle = `rgba(255,255,255,${0.5 * (1 - kk)})`; g.beginPath(); g.arc(bx, by, 26 * (1 - kk * 0.5), 0, TAU); g.fill(); g.restore(); }
  }
  // the washer's counter, once its warnings have filled in
  if (t > EVENTS.washTimes[7] + 0.2 && t < T.back) { const [wx, wy] = F(toDesk(L.wash, 700, 700)); counterChip(g, wx, wy, 8, ease.back((t - EVENTS.washTimes[7] - 0.2) / 0.3) * (1 - clamp((t - T.back + 0.3) / 0.3)), 1); }
  // screen-fixed: the bug, the where/what tags, and last the captions
  CAP.bug(g, 'RADIO FREE HELSINKI', 'house');
  const seg = (a, b) => (t - a) / 0.45 * (t < b ? 1 : 0);
  tag(g, P.ui.tagReport, seg(T.toPost + 0.3, T.flipA)); tag(g, P.ui.tagFederal, seg(T.flipB + 0.3, T.toNote)); tag(g, P.ui.tagState, seg(T.toNote + 0.3, T.toWasher)); tag(g, P.ui.tagBBC, seg(T.toWasher + 0.4, T.back));
  if (captions) CAP.draw(g, P, t, { busy: BUSY });
  return out;
}
const keep = () => [];
const BUSY = CAP.measureBusy(g, P, (t) => frame(t, false));
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: EVENTS, lang: LANG,
  report: { ...CAP.report(g, P, { keep, busy: BUSY }), ui: Object.fromEntries(['tagReport', 'tagFederal', 'tagState', 'tagBBC'].map((k) => { g.save(); g.font = UIF(700, 34); const w = Math.round(g.measureText(P.ui[k]).width + 80); g.restore(); return [k, { text: P.ui[k], x0: 110, x1: 110 + w, ok: 110 + w <= 940 }]; })) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); }, still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
