// RELEASE NOTES (RFH, Helsinki 5 · ICEYE, a sequel to Sleep Tight), 2D v1 stills, 22 Nov. Owner, 22 Nov: "More into ICEYE",
// then "Combine 2 and 1" — the Gen5 radar satellite (16 Nov) and the €2B bid for the rocket maker Avio (17 Nov).
// DEVICE: a BORROWED FORMAT, a tech company's own release notes ("Version history"), flat and crisp (2D canvas, fast to render).
// Five beats, one thing happening in each:
//   1 · 2012     the version history opens on its first entry: a course project at Aalto University
//   2 · 16 NOV   a new entry: Gen5; a radar picture of a parking lot sharpens from coarse blocks to 11 cm on "11 cm"
//   3 · 17 NOV   a new entry: a bid for Avio, an Italian rocket maker; a rocket outline draws itself
//   4 · PRICE    a counter rolls to €2,000,000,000
//   5 · STATUS   the update's status: PENDING APPROVAL — Rome ◌, Washington ◌, two spinners that never finish
// No logos, no faces, no real imagery (the radar picture is drawn). 1080×1920, 30 fps.

import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, FPS = 30, TAU = Math.PI * 2;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['RobotoCondensed', 'RobotoCondensed-var.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, { weight: '100 900' }); document.fonts.add(await f.load()); }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const s = 1.6; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.0], ['s3', 9.0], ['s4', 13.4], ['s5', 16.8], ['end', 21.6]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const popT = (id) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { v0: T.s1 + 0.5, v2: T.s2 + 0.2, sharp: popT('sees'), v3: T.s3 + 0.2, rocket: popT('rocket'), count0: T.s4 + 0.25, price: popT('price'), status: T.s5 + 0.2, ok: popT('ok') };
const cueNames = ['v0', 'v2', 'sharp', 'v3', 'rocket', 'price', 'status', 'ok'];

const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out); out.style.width = '100%';
const g = out.getContext('2d');
const C = { bg: '#07100d', panel: '#0e1a16', panel2: '#13241e', line: '#1f3a30', ink: '#e4f5ec', dim: '#86a89a', faint: '#3d5c50',
  green: '#52f2a0', amber: '#f2b83a', red: '#ff5a4e' };
const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const text = (s, x, y, font, col, align = 'left', base = 'alphabetic') => { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y); };

// a drawn radar picture: a parking lot from above, SAR-style (speckle, bright corners, dark tarmac); rendered once at full detail
const SAR = (() => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d'), R = rng(7);
  const im = x.createImageData(400, 300); for (let i = 0; i < 400 * 300; i++) { const v = 22 + R() * R() * 60; im.data.set([v, v, v, 255], i * 4); } x.putImageData(im, 0, 0);
  x.strokeStyle = 'rgba(200,200,200,.35)'; x.lineWidth = 2; for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) { x.strokeRect(24 + k * 40, 30 + r * 90, 36, 70); }
  for (let r = 0; r < 3; r++) for (let k = 0; k < 9; k++) { if (R() < 0.25) continue; const cx = 42 + k * 40, cy = 65 + r * 90;
    x.fillStyle = 'rgba(140,140,140,.9)'; x.fillRect(cx - 12, cy - 26, 24, 52); x.fillStyle = 'rgba(255,255,255,.95)'; x.fillRect(cx - 12, cy - 26, 3, 3); x.fillRect(cx + 9, cy - 26, 3, 3); x.fillRect(cx - 12, cy + 23, 3, 3); x.fillRect(cx + 9, cy + 23, 3, 3);
    x.fillStyle = 'rgba(40,40,40,.9)'; x.fillRect(cx - 9, cy - 10, 18, 16); }
  return c; })();
const pix = document.createElement('canvas'); const pg = pix.getContext('2d');
function sar(x, y, w, h, block) {   // block = the pixel size in source pixels: big = a coarse radar, 1 = 11 cm
  const bw = Math.max(2, Math.round(400 / block)), bh = Math.max(2, Math.round(300 / block)); pix.width = bw; pix.height = bh; pg.imageSmoothingEnabled = true; pg.drawImage(SAR, 0, 0, bw, bh);
  g.save(); g.imageSmoothingEnabled = false; g.drawImage(pix, x, y, w, h); g.restore();
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgba(110,255,170,1)'; g.fillRect(x, y, w, h); g.restore();
}
const ROCKET = [[0, -1], [0.16, -0.62], [0.18, 0.6], [0.36, 0.85], [0.36, 1], [-0.36, 1], [-0.36, 0.85], [-0.18, 0.6], [-0.16, -0.62]];

function chrome() {
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  rr(40, 640, W - 80, 1030, 30); g.fillStyle = C.panel; g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
  text(UI.app, 80, 712, '700 30px Inter', C.ink); text(UI.vh, W - 80, 712, '500 24px Inter', C.dim, 'right');
  g.fillStyle = C.line; g.fillRect(64, 740, W - 128, 2);
}
function entry(y, ver, title, sub, a = 1, hi = false) {
  g.save(); g.globalAlpha = a;
  g.fillStyle = hi ? C.green : C.faint; g.beginPath(); g.arc(96, y - 10, 9, 0, TAU); g.fill();
  text(ver, 124, y, '700 26px RobotoCondensed', hi ? C.green : C.dim); text(title, 124, y + 42, `${hi ? 700 : 500} 30px Inter`, hi ? C.ink : C.dim);
  if (sub) text(sub, 124, y + 80, '500 22px Inter', C.dim); g.restore();
}
function rail(y0, y1) { g.fillStyle = C.line; g.fillRect(94, y0, 4, y1 - y0); }

function shot1(t) { chrome(); const a = ease.out((t - EV.v0) / 0.5); rail(800, 1600); entry(820, UI.v0, UI.v0t, '', a, true); entry(960, UI.v1, UI.v1t, '', clamp((t - EV.v0 - 1.2) / 0.5) * 0.7); }
function shot2(t) {
  chrome(); rail(800, 1620); entry(820, UI.v0, UI.v0t, '', 0.5); entry(920, UI.v1, UI.v1t, '', 0.5);
  const a = ease.out((t - EV.v2) / 0.45); entry(1040, UI.v2, UI.v2t, UI.v2s, a, true);
  // the radar picture: coarse blocks until "11 cm", then it sharpens
  const k = clamp((t - EV.sharp + 0.25) / 0.6), block = Math.round(lerp(24, 1, ease.io(k))), x = 124, y = 1160, w = W - 124 - 80, h = w * 0.75 * 0.62;
  g.save(); g.globalAlpha = a; rr(x - 4, y - 4, w + 8, h + 8, 10); g.fillStyle = '#000'; g.fill(); g.beginPath(); g.rect(x, y, w, h); g.clip(); sar(x, y, w, h * 1.2, block); g.restore();
  g.save(); g.globalAlpha = a; text(block <= 1 ? '11 CM (GOVERNMENT CUSTOMERS)' : 'SHARPENING…', x + 16, y + h - 18, '800 26px RobotoCondensed', block <= 1 ? C.green : C.amber); text('ILLUSTRATION', x + w - 16, y + 34, '700 20px RobotoCondensed', 'rgba(220,240,230,.7)', 'right'); g.restore();
}
function shot3(t) {
  chrome(); rail(800, 1620); entry(820, UI.v0, UI.v0t, '', 0.4); entry(910, UI.v1, UI.v1t, '', 0.4); entry(1000, UI.v2, UI.v2t, '', 0.55);
  const a = ease.out((t - EV.v3) / 0.45); entry(1110, UI.v3, UI.v3t, UI.v3s, a, true);
  // a rocket outline draws itself, then lifts a little
  const k = clamp((t - EV.rocket + 0.4) / 0.6), up = ease.out((t - EV.rocket) / 1.2) * 40, cx = W / 2, cy = 1420 - up, s = 160;
  g.save(); g.globalAlpha = a; g.strokeStyle = C.green; g.lineWidth = 5; g.lineJoin = 'round'; g.setLineDash([2000]); g.lineDashOffset = 2000 * (1 - k);
  g.beginPath(); ROCKET.forEach(([px, py], i) => { const X = cx + px * s * 0.6, Y = cy + py * s; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.stroke(); g.setLineDash([]);
  if (t > EV.rocket) { const f = 0.7 + 0.3 * Math.sin(t * 9); g.fillStyle = `rgba(242,184,58,${0.7 * f})`; g.beginPath(); g.moveTo(cx - 30, cy + s); g.lineTo(cx, cy + s + 70 * f); g.lineTo(cx + 30, cy + s); g.fill(); }
  g.restore();
}
function shot4(t) {
  chrome(); rail(800, 1000); entry(820, UI.v3, UI.v3t, UI.v3s, 0.6);
  const k = ease.out((t - EV.count0) / (EV.price - EV.count0)), v = 2e9 * k;
  g.save(); g.textAlign = 'center'; text('€' + Math.floor(v).toLocaleString('en-US'), W / 2, 1300, '800 104px RobotoCondensed', t >= EV.price ? C.ink : C.green, 'center');
  text('OFFER FOR AVIO', W / 2, 1380, '700 30px RobotoCondensed', C.dim, 'center'); g.restore();
}
function shot5(t) {
  chrome(); rail(800, 940); entry(820, UI.v3, UI.v3t, '', 0.5);
  const a = ease.out((t - EV.status) / 0.4); g.save(); g.globalAlpha = a;
  rr(80, 980, W - 160, 600, 24); g.fillStyle = C.panel2; g.fill();
  text(UI.status, 120, 1050, '600 26px Inter', C.dim); text(UI.pending.toUpperCase(), 120, 1120, '800 56px RobotoCondensed', C.amber);
  [[UI.rome, 1250], [UI.wash, 1400]].forEach(([n, y], i) => { text(n, 120, y, '700 46px Inter', C.ink);
    const cx = W - 170, cy = y - 16, a0 = t * 4 + i; g.strokeStyle = C.faint; g.lineWidth = 7; g.beginPath(); g.arc(cx, cy, 30, 0, TAU); g.stroke();
    g.strokeStyle = C.amber; g.beginPath(); g.arc(cx, cy, 30, a0, a0 + 1.6); g.stroke(); g.fillStyle = C.line; g.fillRect(120, y + 46, W - 240, 2); });
  const p = t > EV.ok ? ease.back((t - EV.ok) / 0.35) : 0; g.restore();
  if (p > 0) { g.save(); g.translate(W / 2, 1530); g.scale(p, p); rr(-230, -40, 460, 80, 40); g.fillStyle = 'rgba(242,184,58,.16)'; g.fill(); g.strokeStyle = C.amber; g.lineWidth = 3; g.stroke();
    text('AWAITING 2 APPROVALS', 0, 2, '800 32px RobotoCondensed', C.amber, 'center', 'middle'); g.restore(); }
}

function tag(s, a, y = 1700) {
  if (a <= 0 || !s) return; g.save(); g.globalAlpha = a; g.font = '800 26px Inter'; let w = g.measureText(s).width; const maxW = 900; if (w > maxW) { g.font = `800 ${Math.floor(26 * maxW / w)}px Inter`; w = g.measureText(s).width; }
  const x = (W - w - 44) / 2; rr(x, y, w + 44, 56, 8); g.fillStyle = 'rgba(5,12,10,.92)'; g.fill(); g.strokeStyle = 'rgba(82,242,160,.55)'; g.lineWidth = 2; g.stroke();
  text(s, x + 22, y + 30, g.font, '#d6f3e4', 'left', 'middle'); g.restore();
}
const TAGS = [['tag1', T.s1 + 1.4, T.s2 - 0.1], ['tag2', EV.sharp + 0.6, T.s3 - 0.1], ['tag3', EV.rocket + 0.5, T.s4 - 0.1], ['tag4', EV.price + 0.3, T.s5 - 0.1], ['tag5', EV.ok + 0.6, T.end + 1]];
function grain(t) { const R = rng(Math.floor(t * FPS) + 3); g.save(); g.globalAlpha = 0.05; for (let i = 0; i < 900; i++) { g.fillStyle = R() < 0.5 ? '#fff' : '#000'; g.fillRect(R() * W, R() * H, 2, 2); } g.restore();
  g.save(); g.globalAlpha = 0.07; g.fillStyle = '#000'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1.5); g.restore();
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = v; g.fillRect(0, 0, W, H); }

const SHOTS = [{ t0: () => T.s1, f: shot1 }, { t0: () => T.s2, f: shot2 }, { t0: () => T.s3, f: shot3 }, { t0: () => T.s4, f: shot4 }, { t0: () => T.s5, f: shot5 }];
const shotAt = (t) => { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].t0()) return i; return 0; };
function frame(t, captions = true) {
  g.setTransform(1, 0, 0, 1, 0, 0); const i = shotAt(t), lt = t - SHOTS[i].t0();
  const z = 1 + 0.025 * clamp(lt / 4), sl = i > 0 ? (1 - ease.out(lt / 0.22)) * 60 : 0;
  g.save(); g.translate(W / 2, H * 0.6 + sl); g.scale(z, z); g.translate(-W / 2, -H * 0.6); SHOTS[i].f(t); g.restore();
  grain(t); CAP.bug(g);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3); for (const [k, a0, a1] of TAGS) tag(UI[k], tg(a0, a1));
  if (captions) CAP.draw(g, P, t, { busy: BUSY || {} });
  return out;
}
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g, P, (t) => frame(t, false));
const LOOKS = [{ name: '1-2012', t: T.s2 - 0.5 }, { name: '2-11cm', t: EV.sharp + 0.8 }, { name: '3-rocket', t: EV.rocket + 0.8 }, { name: '4-price', t: EV.price + 0.5 }, { name: '5-status', t: EV.ok + 0.8 }];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, cueNames, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g, P, { keep: () => [], busy: BUSY || {} }) },
  looks: LOOKS.map((l) => ({ name: l.name })), look(i) { return frame(LOOKS[i].t).toDataURL('image/png'); },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
