// KILL SWITCH — v2 (owner, 18 Oct: "messaging too unclear"). One comparison, set up in the first line and answered
// in the last: a toaster's safety standard requires a backup off switch; the most powerful AI models have no such
// rule in the US, and California's "kill switch" is still a study. Both leaflets are on the desk from the first frame
// — 8 WARNINGS against 0 — so the comparison is visible before a word is read:
//   1 the question, over both          3 the AI's page: nothing on it; VOLUNTARY slaps across it
//   2 the toaster: switch 1 jams,      4 its kill switch is a sticky note — a study; the tap does nothing
//     switch 2 takes over              5 both again: "The AI's is a sticky note."
// v1 (six regulations in 35 s: the 24-hour defect report, a 2024 veto, a washing machine) is in git history.
// Every word on screen comes from copy.json through pipeline/text/captions.js. 1080×1920, 30 fps. film.html?lang=en|fi|ja
import { AW, AH, INK } from '../../clay/kill-switch/print.js';
import { front, back } from '../../clay/kill-switch/artwork.js';
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

// ------------------------------------------------------------------ the two leaflets, flat, at 2.4× for crisp punch-ins
const PAPER = '#f1eee5';
const FLAT = { [INK.K]: '#1a1a1a', [INK.Y]: '#f2c200', [INK.R]: '#d22b2b', [INK.B]: '#1f5aa6', [INK.T10]: '#e2ded2', [INK.T22]: '#c9c6bd', [INK.T40]: '#a9a69d', [INK.W]: '#fbfaf6' };
const flatContext = (real) => new Proxy(real, { get(t, k) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; }, set(t, k, v) { t[k] = (k === 'fillStyle' || k === 'strokeStyle') && FLAT[v] ? FLAT[v] : v; return true; } });
const SC = 2.4;
function side(draw) {
  const c = mk(AW * SC, AH * SC), g = c.getContext('2d'); g.fillStyle = PAPER; g.fillRect(0, 0, c.width, c.height);
  for (const fy of [AH / 3, (2 * AH) / 3]) { const y = fy * SC, sh = g.createLinearGradient(0, y - 26 * SC, 0, y + 26 * SC); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.48, 'rgba(0,0,0,.05)'); sh.addColorStop(0.5, 'rgba(255,255,255,.5)'); sh.addColorStop(0.56, 'rgba(0,0,0,.03)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, y - 26 * SC, c.width, 52 * SC); }
  g.scale(SC, SC); draw(flatContext(g)); return c;
}
const TOAST = side(front), AI = side(back);
const CELL = (i) => [140 + (i % 4) * 207, 806 + ((i / 4) | 0) * 166];

// ------------------------------------------------------------------ the timeline: base beats, retimed by the copy for this language
const BEATS = [['enter', 0.0], ['land', 0.5], ['picts', 0.8], ['toToaster', 5.4], ['jam', 6.3], ['flip2', 6.8], ['toAI', 10.0], ['toNote', 14.3], ['slap', 14.7], ['tap', 16.4], ['back', 18.9], ['end', 23.7]];
const P = CAP.plan(COPY, LANG, BEATS), T = P.T, DUR = T.end;
const popOf = (id) => { const c = P.captions.find((x) => x.id === id); return c ? (c.words.find((w) => w.pop) || c.words[0]).t : 0; };
const tVol = popOf('ai'), tLast = popOf('last');
const EVENTS = { ...T, lang: LANG, holds: P.holds, vol: tVol, lastPop: tLast,
  pictTimes: Array.from({ length: 8 }, (_, i) => T.picts + i * 0.085),
  ...CAP.events(P), quiet: [{ t0: T.tap + 0.02, t1: T.tap + 1.1, why: 'the joke: the tap stops the music' }] };

// ------------------------------------------------------------------ the desk: two leaflets side by side, the toaster's on the left
const LS = 0.56;
function poses(t) {
  const e1 = ease.spring((t - T.enter) / 0.9), e2 = ease.spring((t - T.enter - 0.15) / 0.9);
  return { toast: { sheet: TOAST, x: 276, y: 1010 + (1 - clamp(e1)) * 1400, s: LS, rot: -0.03 + (1 - clamp(e1)) * -0.12 },
    ai: { sheet: AI, x: 804, y: 1010 + (1 - clamp(e2)) * 1400, s: LS, rot: 0.025 + (1 - clamp(e2)) * 0.12 } };
}
const REST = { toast: { x: 276, y: 1010, s: LS, rot: -0.03 }, ai: { x: 804, y: 1010, s: LS, rot: 0.025 } };
/** an artwork point on a posed leaflet → desk */
function toDesk(L, ax, ay) { const x0 = (ax - AW / 2) * L.s, y0 = (ay - AH / 2) * L.s; return [L.x + x0 * Math.cos(L.rot) - y0 * Math.sin(L.rot), L.y + x0 * Math.sin(L.rot) + y0 * Math.cos(L.rot)]; }

// ------------------------------------------------------------------ the camera: [time, which leaflet ('' = the desk), artwork x, y, zoom]
// the ending is the opening again, but the two answers are big: the toaster's backup switch, the AI's sticky note
const CAM = [[0, '', 540, 985, 1.0], [T.toToaster - 0.2, '', 540, 985, 1.0], [T.toToaster + 0.45, 'toast', 420, 440, 2.2], [T.toAI - 0.1, 'toast', 420, 440, 2.2],
  [T.toAI + 0.55, 'ai', 450, 540, 1.8], [T.toNote - 0.05, 'ai', 450, 560, 1.8], [T.toNote + 0.4, 'ai', 560, 880, 2.05], [T.tap + 0.25, 'ai', 600, 910, 2.2],
  [T.back - 0.1, 'ai', 600, 910, 2.2], [T.back + 0.9, '', 540, 985, 1.0], [999, '', 540, 985, 1.0]];
const camPt = ([, who, x, y]) => (who ? toDesk(REST[who], x, y) : [x, y]);
function camAt(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1][0] <= t) i++; const a = CAM[i], b = CAM[i + 1], k = ease.io((t - a[0]) / Math.max(1e-6, b[0] - a[0]));
  const [ax, ay] = camPt(a), [bx, by] = camPt(b);
  return { x: lerp(ax, bx, k) + Math.sin(t * 0.9) * 3, y: lerp(ay, by, k) + Math.sin(t * 0.7 + 1) * 4, z: lerp(a[4], b[4], k) * (1 + 0.008 * Math.sin(t * 1.1)) };
}
const toFrame = (cam, [x, y]) => [W / 2 + (x - cam.x) * cam.z, H / 2 + (y - cam.y) * cam.z];

// ------------------------------------------------------------------ pieces
const TOP = '#1c1d1f';
const worktop = (() => { const c = mk(W, H), g = c.getContext('2d'); g.fillStyle = TOP; g.fillRect(0, 0, W, H);
  const r = rng(3); for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.022)' : 'rgba(0,0,0,.16)'; g.fillRect(r() * W, r() * H, 2 + r() * 3, 1 + r() * 2); }
  const v = g.createRadialGradient(540, 960, 200, 540, 960, 1150); v.addColorStop(0, 'rgba(255,240,215,.10)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = v; g.fillRect(0, 0, W, H); return c; })();
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
/** the warnings counter: yellow when there are some, grey when there are none */
function counterChip(c, x, y, n, s, a) {
  if (s <= 0.01) return; pill(c, x, y, 300, 92, n > 0 ? '#f2c200' : '#d9d6cc', s, a);
  c.fillStyle = '#1a1a1a'; c.font = UIF(800, 60); c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(String(n), -48, 4);
  c.font = UIF(700, 30); c.textAlign = 'left'; c.fillText(P.ui.warnings, -36, 4); c.restore();
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
/** one leaflet on the desk: its shadow, the paper, the warnings that pop in */
function leaflet(g, L, t, hideCells = null) {
  g.save(); g.translate(L.x, L.y); g.rotate(L.rot); g.scale(L.s, L.s);
  g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 40; g.shadowOffsetX = 18; g.shadowOffsetY = 26; g.fillStyle = PAPER; g.fillRect(-AW / 2, -AH / 2, AW, AH); g.restore();
  g.drawImage(L.sheet, -AW / 2, -AH / 2, AW, AH);
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
  const cam = camAt(t), L = poses(t), F = (p) => toFrame(cam, p), Z = cam.z;
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(worktop, 0, 0);
  g.save(); g.translate(W / 2, H / 2); g.scale(Z, Z); g.translate(-cam.x, -cam.y);
  leaflet(g, L.toast, t, EVENTS.pictTimes); leaflet(g, L.ai, t);
  g.restore();
  // the counters: 8 against 0, readable from the first wide frame
  { const [tx, ty] = F(toDesk(L.toast, 700, 700)), [ax, ay] = F(toDesk(L.ai, 700, 700)), cs = clamp(0.62 + Z * 0.16, 0.78, 1);
    counterChip(g, tx, ty, 8, ease.back((t - T.picts - 0.75) / 0.3) * cs, 1); counterChip(g, ax, ay, 0, ease.back((t - T.picts - 0.95) / 0.3) * cs, 1); }
  // 2 · the toaster's switches
  // (switch 2, the backup, comes back for the last line, next to the AI's sticky note)
  { const k1 = t - T.jam, k2 = t - T.flip2, out1 = clamp((t - T.toAI) / 0.3), shake = k1 > 0 && k1 < 0.4 ? Math.sin(k1 * 80) * 10 * (1 - k1 / 0.4) : 0;
    const again = clamp((t - T.back - 0.6) / 0.3), cz = 1;
    const [x1, y1] = F(toDesk(L.toast, 250, 540)), [x2, y2] = F(toDesk(L.toast, 560, 600));
    const s1 = ease.back(k1 / 0.3) * (1 - out1), s2 = Math.max(ease.back(k2 / 0.3) * (1 - out1), ease.back((t - T.back - 0.6) / 0.3) * cz);   // the ending brings back only the backup
    chip(g, x1 + shake, y1, P.ui.switch1, '#d22b2b', 'x', s1, 1 - out1); chip(g, x2, y2, P.ui.switch2, '#2f9a52', 'v', s2, Math.max(1 - out1, again)); }
  // 3 · VOLUNTARY slaps across the AI's empty warnings, on the word
  { const sk = t - tVol, [vx, vy] = F(toDesk(L.ai, 300, 880));
    if (sk > -0.2) sticker(g, vx, vy, lerp(1.7, 1, ease.out((sk + 0.2) / 0.2)) * Z * 0.36, -0.12, clamp((sk + 0.2) / 0.1)); }
  // 4 · the kill switch is a sticky note; the tap does nothing — and it stays to the end, the last line's answer
  if (t > T.slap - 0.25) {
    const big = ease.out((t - T.back - 0.5) / 0.5) * 0.55;                          // for the last line the note comes forward, big enough to read
    const k = clamp((t - (T.slap - 0.25)) / 0.25), [nx, ny] = F(toDesk(L.ai, 650 - big * 40, 940 + big * 150)), s = lerp(1.6, 1, ease.out(k)) * Z * 0.5 * (1 + big);
    const wob = t > T.tap ? Math.sin((t - T.tap) * 26) * 0.05 * Math.exp(-(t - T.tap) * 4) : 0, settle = t > T.slap ? Math.sin((t - T.slap) * 20) * 0.03 * Math.exp(-(t - T.slap) * 6) : 0;
    const nod = t > tLast ? Math.sin((t - tLast) * 18) * 0.06 * Math.exp(-(t - tLast) * 4) : 0, pulse = t > tLast ? 1 + 0.12 * Math.exp(-(t - tLast) * 5) : 1;
    g.save(); g.globalAlpha = k; note(g, nx, ny - (1 - k) * 200, s * pulse, 0.09 + (1 - k) * 0.25 + wob + settle + nod, 1 - k); g.restore();
    if (t > T.tap && t < T.tap + 0.7) { const kk = (t - T.tap) / 0.7, [bx, by] = F(toDesk(L.ai, 652, 950)); g.save(); g.strokeStyle = `rgba(255,255,255,${0.9 * (1 - kk)})`; g.lineWidth = 6; g.beginPath(); g.arc(bx, by, 30 + kk * 120, 0, TAU); g.stroke();
      g.fillStyle = `rgba(255,255,255,${0.5 * (1 - kk)})`; g.beginPath(); g.arc(bx, by, 26 * (1 - kk * 0.5), 0, TAU); g.fill(); g.restore(); }
  }
  // screen-fixed: the bug, the where/what tags, and last the captions
  CAP.bug(g, 'RADIO FREE HELSINKI', 'house');
  const seg = (a, b) => (t - a) / 0.45 * (t < b ? 1 : 0);
  tag(g, P.ui.tagToaster, seg(T.toToaster + 0.4, T.toAI)); tag(g, P.ui.tagFederal, seg(T.toAI + 0.5, T.toNote)); tag(g, P.ui.tagState, seg(T.toNote + 0.4, T.back));
  if (captions) CAP.draw(g, P, t, { busy: BUSY });
  return out;
}
const keep = () => [];
const BUSY = CAP.measureBusy(g, P, (t) => frame(t, false));
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: EVENTS, lang: LANG,
  report: { ...CAP.report(g, P, { keep, busy: BUSY }), ui: Object.fromEntries(['tagToaster', 'tagFederal', 'tagState'].map((k) => { g.save(); g.font = UIF(700, 34); const w = Math.round(g.measureText(P.ui[k]).width + 80); g.restore(); return [k, { text: P.ui[k], x0: 110, x1: 110 + w, ok: 110 + w <= 940 }]; })) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); }, still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
