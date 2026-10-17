// KILL SWITCH — POLISH TEST in motion (owner, 17 Oct: the modern media environment, all kinds of polish, "some
// more fitting per style"). For the flat leaflet the fitting ones are SLICK 2D MOTION DESIGN and a CREATOR-NATIVE
// EDIT: springs not drifts, a camera that punches in where the eye should go, elements that pop in staggered, UI
// chips over the print, word-by-word captions, and a sound on every move (EVENTS below drive the score).
// 12 s, 30 fps, 1080×1920. The flat v3 look (flat.js) and its artwork (artwork.js) underneath, unchanged.
import { AW, AH, INK } from './print.js';
import { front, back } from './artwork.js';

const W = 1080, H = 1920, FPS = 30, DUR = 11, SAFE_B = 1630, TAU = Math.PI * 2;
const FONT_DIR = '../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file, desc] of [['RobotoCondensed', 'RobotoCondensed-var.woff', { weight: '100 900' }], ['Kalam', 'Kalam-700.woff', {}], ['Poppins-800', 'Poppins-800.woff', {}]]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, desc); document.fonts.add(await f.load());
}
{ const f = new FontFace('IPAPGothic', 'url(../fonts/ipagp.ttf)'); document.fonts.add(await f.load()); }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
  spring: (k) => { k = Math.max(0, k); return 1 - Math.exp(-7 * k) * Math.cos(11 * k); } };

// ------------------------------------------------------------------ the two sides, flat (as flat.js), at 2× for crisp punch-ins
const PAPER = '#f1eee5';
const FLAT = { [INK.K]: '#1a1a1a', [INK.Y]: '#f2c200', [INK.R]: '#d22b2b', [INK.B]: '#1f5aa6', [INK.T10]: '#e2ded2', [INK.T22]: '#c9c6bd', [INK.T40]: '#a9a69d', [INK.W]: '#fbfaf6' };
const flatContext = (real) => new Proxy(real, { get(t, k) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; }, set(t, k, v) { t[k] = (k === 'fillStyle' || k === 'strokeStyle') && FLAT[v] ? FLAT[v] : v; return true; } });
const SC = 2.4;
function side(draw) {
  const c = mk(AW * SC, AH * SC), g = c.getContext('2d'); g.fillStyle = PAPER; g.fillRect(0, 0, c.width, c.height);
  for (const fy of [AH / 3, (2 * AH) / 3]) { const y = fy * SC, sh = g.createLinearGradient(0, y - 26 * SC, 0, y + 26 * SC); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.48, 'rgba(0,0,0,.05)'); sh.addColorStop(0.5, 'rgba(255,255,255,.5)'); sh.addColorStop(0.56, 'rgba(0,0,0,.03)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(0, y - 26 * SC, c.width, 52 * SC); }
  g.scale(SC, SC); draw(flatContext(g)); return c;
}
const FRONT = side(front), BACK = side(back);
const CELL = (i) => [140 + (i % 4) * 207, 806 + ((i / 4) | 0) * 166];   // artwork.js's pictogram grid

// ------------------------------------------------------------------ the timeline (seconds) — the score reads EVENTS
const T = { enter: 0.0, land: 0.5, punch1: 0.65, toToaster: 1.25, jam: 2.15, flip2: 2.65, toGrid: 3.05, picts: 3.15, flipA: 4.45, flipB: 4.95, roll: 5.25, rollEnd: 6.05, slap: 6.5, tap: 7.45, pull: 8.6, tagIn: 8.85, end: 11 };
const CAP1 = [['Its', 0.7], ['safety', 0.84], ['standard', 0.98], ['\n', 0], ['asks', 1.38], ['for', 1.5], ['a', 1.6], ['[second]', 1.74], ['\n', 0], ['off', 2.08], ['switch.', 2.2]];
const CAP2 = [['Its', 5.05], ['kill', 5.19], ['switch:', 5.35], ['\n', 0], ['a', 5.8], ['[study],', 5.94], ['\n', 0], ['due', 6.6], ['16', 6.74], ['November.', 6.9]];
const EVENTS = { ...T, pictTimes: Array.from({ length: 8 }, (_, i) => T.picts + i * 0.085), rollTicks: Array.from({ length: 8 }, (_, i) => lerp(T.roll, T.rollEnd, (i + 1) / 8)),
  words: [...CAP1, ...CAP2].filter(([w]) => w !== '\n').map(([w, t]) => ({ w, t, pop: w.startsWith('[') })) };

// ------------------------------------------------------------------ the camera: where the eye should be, in artwork space → a zoom about it
// [time, focus x, focus y (artwork), zoom]
const CAM = [[0, 450, 680, 1.0], [T.punch1, 450, 680, 1.0], [T.punch1 + 0.45, 450, 330, 1.42], [T.toToaster, 450, 330, 1.42], [T.toToaster + 0.5, 420, 430, 1.62], [T.toGrid - 0.05, 420, 430, 1.62],
  [T.toGrid + 0.5, 450, 900, 1.3], [T.flipA - 0.1, 450, 900, 1.3], [T.flipA + 0.45, 450, 680, 1.0], [T.flipB + 0.2, 450, 680, 1.0], [T.flipB + 0.6, 450, 860, 1.32], [T.slap + 0.1, 470, 880, 1.32], [T.tap + 0.25, 520, 900, 1.48], [T.pull, 520, 900, 1.48], [T.pull + 0.6, 450, 680, 1.0], [99, 450, 680, 1.0]];
function camAt(t) { let i = 0; while (i < CAM.length - 2 && CAM[i + 1][0] <= t) i++; const a = CAM[i], b = CAM[i + 1], k = ease.io((t - a[0]) / Math.max(1e-6, b[0] - a[0])); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k)]; }

const LS = 0.8, LX = 540, LY = 452 + AH * LS / 2, ROT = -0.02;
/** artwork point → frame point, for the leaflet at rest with the camera at (fx, fy, z) */
function toFrame(ax, ay, cam) {
  const [fx, fy, z] = cam, x0 = (ax - AW / 2) * LS, y0 = (ay - AH / 2) * LS;
  const px = LX + x0 * Math.cos(ROT) - y0 * Math.sin(ROT), py = LY + x0 * Math.sin(ROT) + y0 * Math.cos(ROT);
  const [qx, qy] = [LX + ((fx - AW / 2) * LS), LY + ((fy - AH / 2) * LS)];
  return [W / 2 + (px - qx) * z, 960 + (py - qy) * z];
}

// ------------------------------------------------------------------ pieces
const TOP = '#1c1d1f';
const worktop = (() => { const c = mk(W, H), g = c.getContext('2d'); g.fillStyle = TOP; g.fillRect(0, 0, W, H);
  const r = rng(3); for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.022)' : 'rgba(0,0,0,.16)'; g.fillRect(r() * W, r() * H, 2 + r() * 3, 1 + r() * 2); }
  const v = g.createRadialGradient(540, 860, 200, 540, 960, 1150); v.addColorStop(0, 'rgba(255,240,215,.10)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = v; g.fillRect(0, 0, W, H); return c; })();
/** a modern UI chip floating over the print: a pill, an icon disc, a label */
function chip(c, x, y, label, col, glyph, s = 1, a = 1) {
  if (s <= 0.01 || a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s); c.font = '700 34px "RobotoCondensed"';
  const w = c.measureText(label).width + 96, h = 66;
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 24; c.shadowOffsetY = 10; c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h / 2); c.fill(); c.shadowColor = 'transparent';
  c.fillStyle = col; c.beginPath(); c.arc(-w / 2 + 34, 0, 22, 0, TAU); c.fill();
  c.strokeStyle = '#fff'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath();
  if (glyph === 'x') { c.moveTo(-w / 2 + 25, -9); c.lineTo(-w / 2 + 43, 9); c.moveTo(-w / 2 + 43, -9); c.lineTo(-w / 2 + 25, 9); } else { c.moveTo(-w / 2 + 24, 1); c.lineTo(-w / 2 + 31, 9); c.lineTo(-w / 2 + 45, -8); }
  c.stroke(); c.fillStyle = '#1a1a1a'; c.textBaseline = 'middle'; c.fillText(label, -w / 2 + 66, 2); c.restore();
}
function counterChip(c, x, y, n, s, a) {
  if (s <= 0.01) return; c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s);
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 24; c.shadowOffsetY = 10; c.fillStyle = '#f2c200'; c.beginPath(); c.roundRect(-150, -46, 300, 92, 46); c.fill(); c.shadowColor = 'transparent';
  c.fillStyle = '#1a1a1a'; c.font = '800 60px "RobotoCondensed"'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(String(n), -48, 4);
  c.font = '700 30px "RobotoCondensed"'; c.textAlign = 'left'; c.fillText('WARNINGS', -36, 4); c.restore();
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
/** captions in the house style, word by word: each word springs in on its own clock; [word] pops amber */
function caption(c, words, t, y, out = 99) {
  const lines = [[]]; for (const [w, t0] of words) { if (w === '\n') lines.push([]); else lines[lines.length - 1].push([w, t0]); }
  c.save(); c.font = '82px "Poppins-800"'; c.lineJoin = 'round'; c.textBaseline = 'alphabetic';
  const fade = clamp(1 - (t - out) / 0.25);
  lines.forEach((ln, i) => {
    const clean = ln.map(([w]) => w.replace(/[[\]]/g, '')), space = c.measureText(' ').width, total = clean.reduce((s, w) => s + c.measureText(w).width, 0) + space * (clean.length - 1);
    let x = 540 - total / 2; const yy = y + i * 98;
    ln.forEach(([w, t0], j) => {
      const word = clean[j], ww = c.measureText(word).width, k = t - t0, pop = w.startsWith('[');
      if (k > 0 && fade > 0) {
        const s = pop ? (0.55 + 0.45 * ease.spring(k / 0.5)) * (1 + 0.12 * Math.exp(-k * 6) * Math.sin(k * 30)) : 0.7 + 0.3 * ease.back(k / 0.22);
        c.save(); c.globalAlpha = clamp(k / 0.08) * fade; c.translate(x + ww / 2, yy - 30); c.scale(s, s); c.translate(-ww / 2, 30 - 10 * (1 - clamp(k / 0.2)));
        c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowOffsetX = 3; c.shadowOffsetY = 3; c.lineWidth = 14; c.strokeStyle = '#000'; c.strokeText(word, 0, 0); c.shadowColor = 'transparent';
        c.fillStyle = pop ? '#f2b83a' : '#fff'; c.fillText(word, 0, 0); c.restore();
      }
      x += ww + space;
    });
  });
  c.restore();
}
function bug(c) {
  c.save(); c.font = '30px "Poppins-800"'; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.5)'; c.strokeText('● RADIO FREE HELSINKI', 92, 118);
  c.fillStyle = '#f0027f'; c.fillText('●', 92, 118); c.fillStyle = 'rgba(255,255,255,.82)'; c.fillText(' RADIO FREE HELSINKI', 92 + c.measureText('●').width, 118); c.restore();
}
function tag(c, text, k) {
  if (k <= 0) return; const x = lerp(-700, 110, ease.out(k)), yb = SAFE_B; c.save(); c.font = '700 34px "RobotoCondensed"';
  const w = c.measureText(text).width + 80, h = 62, y = yb - h;
  c.fillStyle = '#1a1a1a'; c.fillRect(x, y, w, h);
  c.save(); c.beginPath(); c.rect(x, y, 30, h); c.clip(); c.fillStyle = '#f2c200'; for (let q = -2; q < 6; q++) { c.beginPath(); c.moveTo(x + q * 18, y + h); c.lineTo(x + q * 18 + 9, y + h); c.lineTo(x + q * 18 + 9 + h, y); c.lineTo(x + q * 18 + h, y); c.fill(); } c.restore();
  c.fillStyle = '#f2c200'; c.textBaseline = 'middle'; c.fillText(text, x + 50, y + h / 2 + 2); c.restore();
}

// ------------------------------------------------------------------ one frame
const out = mk(W, H), g = out.getContext('2d');
function frame(t) {
  const cam = camAt(t), [fx, fy, z] = cam;
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(worktop, 0, 0);
  // the leaflet: springs up from below; flips (a squash on x, a lift, a shade) from the toaster side to the model side
  const enter = ease.spring((t - T.enter) / 0.9), lift = (1 - clamp(enter)) * 1400;
  const fk = clamp((t - T.flipA) / (T.flipB - T.flipA)), flipAng = ease.io(fk) * Math.PI, sx = Math.cos(flipAng), sheet = flipAng < Math.PI / 2 ? FRONT : BACK;
  const flipLift = Math.sin(flipAng) * 60;
  const qx = LX + (fx - AW / 2) * LS, qy = LY + (fy - AH / 2) * LS;
  g.save(); g.translate(W / 2, 960); g.scale(z, z); g.translate(-qx, -qy);
  g.translate(LX, LY + lift - flipLift); g.rotate(ROT + (1 - clamp(enter)) * -0.12); g.scale(LS * Math.abs(sx) * (1 + flipLift / 900), LS * (1 + flipLift / 900));
  g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 40 + flipLift * 0.6; g.shadowOffsetX = 18; g.shadowOffsetY = 26 + flipLift; g.fillStyle = PAPER; g.fillRect(-AW / 2, -AH / 2, AW, AH); g.restore();
  g.drawImage(sheet, -AW / 2, -AH / 2, AW, AH);
  if (Math.abs(sx) < 0.98) { g.fillStyle = `rgba(0,0,0,${(1 - Math.abs(sx)) * 0.35})`; g.fillRect(-AW / 2, -AH / 2, AW, AH); }
  // the pictograms pop in one by one (toaster side); until then their cells are blank paper
  g.translate(-AW / 2, -AH / 2);
  if (sheet === FRONT) for (let i = 0; i < 8; i++) {
    const [cx, cy] = CELL(i), k = t - EVENTS.pictTimes[i], cw = 196, top = cy - 70, bot = cy + 112;
    if (k < 0.6) { g.fillStyle = PAPER; g.fillRect(cx - cw / 2, top, cw, bot - top); }
    if (k > 0 && k < 0.6) { const s = ease.back(k / 0.32); g.save(); g.translate(cx, cy); g.scale(s, s); g.drawImage(sheet, (cx - cw / 2) * SC, top * SC, cw * SC, (bot - top) * SC, -cw / 2, top - cy, cw, bot - top); g.restore(); }
  }
  g.restore();
  // the UI chips over the print: switch 1 jams, switch 2 takes over
  const [c1x, c1y] = toFrame(250, 540, cam), [c2x, c2y] = toFrame(560, 600, cam);
  const k1 = t - T.jam, k2 = t - T.flip2, out1 = clamp((t - T.toGrid) / 0.3);
  const shake = k1 > 0 && k1 < 0.4 ? Math.sin(k1 * 80) * 10 * (1 - k1 / 0.4) : 0;
  chip(g, c1x + shake, c1y, 'SWITCH 1  JAMS', '#d22b2b', 'x', ease.back(k1 / 0.3) * (1 - out1), 1 - out1);
  chip(g, c2x, c2y, 'SWITCH 2  OFF', '#2f9a52', 'v', ease.back(k2 / 0.3) * (1 - out1), 1 - out1);
  // the warnings counter: 8 on the toaster's side; rolls to 0 on the model's
  const [kx, ky] = toFrame(700, 700, cam), cIn = t - (T.picts + 0.75), rollK = clamp((t - T.roll) / (T.rollEnd - T.roll));
  const n = t < T.flipA ? 8 : t < T.roll ? 8 : Math.round(8 * (1 - rollK));
  const cOut = t > T.flipA && t < T.flipB ? 1 - Math.sin(fk * Math.PI) : 1;
  counterChip(g, kx, ky, n, ease.back(cIn / 0.3) * cOut * (t > T.slap + 0.4 ? 1 - clamp((t - T.slap - 0.4) / 0.25) : 1), 1);
  // the sticky note: slaps on from above, settles; a tap on the button does nothing at all
  if (t > T.slap - 0.25) {
    const k = clamp((t - (T.slap - 0.25)) / 0.25), [nx, ny] = toFrame(560, 900, cam), s = lerp(1.6, 1, ease.out(k)) * z * 0.95 * 0.8;
    const wob = t > T.tap ? Math.sin((t - T.tap) * 26) * 0.05 * Math.exp(-(t - T.tap) * 4) : 0, settle = t > T.slap ? Math.sin((t - T.slap) * 20) * 0.03 * Math.exp(-(t - T.slap) * 6) : 0;
    g.save(); g.globalAlpha = k; note(g, nx, ny - (1 - k) * 200, s, 0.09 + (1 - k) * 0.25 + wob + settle, 1 - k); g.restore();
    if (t > T.tap && t < T.tap + 0.7) { const kk = (t - T.tap) / 0.7, [bx, by] = toFrame(562, 908, cam); g.save(); g.strokeStyle = `rgba(255,255,255,${0.9 * (1 - kk)})`; g.lineWidth = 6; g.beginPath(); g.arc(bx, by, 30 + kk * 120, 0, TAU); g.stroke();
      g.fillStyle = `rgba(255,255,255,${0.5 * (1 - kk)})`; g.beginPath(); g.arc(bx, by, 26 * (1 - kk * 0.5), 0, TAU); g.fill(); g.restore(); }
  }
  // screen-fixed: a scrim behind the captions when the camera is in close, the bug, the captions, the tag
  { const a = clamp((z - 1) / 0.35) * 0.7; if (a > 0) { const sg = g.createLinearGradient(0, 0, 0, 560); sg.addColorStop(0, `rgba(10,10,12,${a})`); sg.addColorStop(0.75, `rgba(10,10,12,${a * 0.6})`); sg.addColorStop(1, 'rgba(10,10,12,0)'); g.fillStyle = sg; g.fillRect(0, 0, W, 560); } }
  bug(g);
  caption(g, CAP1, t, 222, T.flipA - 0.1);
  caption(g, CAP2, t, 222);
  tag(g, 'SACRAMENTO · ORDER N-9-26', (t - T.tagIn) / 0.45);
  return out;
}
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: EVENTS, frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); }, still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
