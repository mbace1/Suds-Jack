// DUE 13 NOV (RFH, Coxon 17 · the House letter to OpenAI), 2D v1 stills, 21 Nov. Owner, 21 Nov: "Move to next video" (after
// rating Stable 5/10). Pitch C of plan/PITCHES-19-11.md; plan/films/49-due-13-nov.md.
// DEVICE: a BORROWED FORMAT, an email client's Sent view, flat and crisp (2D canvas: no WebGL, fast to render).
// Five beats, one thing happening in each:
//   1 · SENT      a new message slides into Sent: 20 House Democrats → Sam Altman, OpenAI; "11 questions"; it ticks DELIVERED
//   2 · OPENED    the message: the demand, quoted; three staff badges go grey, ACCESS REVOKED; OpenAI's line and the
//                 researchers' beside it
//   3 · DUE       the calendar widget: the days run from 29 Oct to 13 Nov, which is circled
//   4 · OVERDUE   the days keep running to 21 Nov; OVERDUE counts up; Replies: 0
//   5 · STATUS    the thread: Delivered. An empty reply box, a cursor blinking in it
// No logos, no faces, no invented question text (the eleven lines are shown as unread placeholders). 1080×1920, 30 fps.

import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, FPS = 30, TAU = Math.PI * 2;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['RobotoCondensed', 'RobotoCondensed-var.woff'], ['Anton-400', 'Anton-400.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, fam === 'Anton-400' ? {} : { weight: '100 900' }); document.fonts.add(await f.load()); }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const s = 1.6; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.2], ['s3', 9.6], ['s4', 13.6], ['s5', 17.8], ['end', 22.2]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const popT = (id) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { slide: T.s1 + 0.5, delivered: popT('asked'), open: T.s2 + 0.05, revoke: popT('fired'), cal: T.s3 + 0.2, circle: popT('due'),
  over: T.s4 + 0.3, zero: popT('none'), thread: T.s5 + 0.1, status: popT('status') };
for (let i = 0; i < 3; i++) EV['badge' + i] = +(EV.revoke - 0.2 + i * 0.18).toFixed(3);
const cueNames = ['slide', 'delivered', 'badge0', 'badge1', 'badge2', 'circle', 'zero', 'status'];

const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out); out.style.width = '100%';
const g = out.getContext('2d');
const C = { bg: '#0b0f17', panel: '#121926', panel2: '#182131', line: '#243045', ink: '#e8edf5', dim: '#8b97ab', faint: '#4b5872',
  blue: '#5b8cff', green: '#3ccf8e', red: '#ff5a4e', amber: '#f2b83a' };
const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const text = (s, x, y, font, col, align = 'left', base = 'alphabetic') => { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y); };
function wrap(s, x, y, w, lh, font, col) { g.font = font; g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; let line = ''; for (const wd of s.split(' ')) { const t2 = line ? line + ' ' + wd : wd; if (g.measureText(t2).width > w && line) { g.fillText(line, x, y); y += lh; line = wd; } else line = t2; } g.fillText(line, x, y); return y; }

// the date run: 29 Oct → 13 Nov in beat 3, → 21 Nov in beat 4
const DAYS = [['OCT', 29], ['OCT', 30], ['OCT', 31], ...Array.from({ length: 21 }, (_, i) => ['NOV', i + 1])];
function dayAt(t) { if (t < EV.cal) return 0; const k1 = clamp((t - EV.cal) / (EV.circle - EV.cal)); if (t < T.s4) return Math.round(ease.io(k1) * 15);   // index 15 = 13 Nov
  const k2 = clamp((t - EV.over) / (EV.zero - EV.over)); return 15 + Math.round(ease.out(k2) * 8); }   // index 23 = 21 Nov

// ------------------------------------------------------------------ the app chrome, the same in every shot
function chrome(t) {
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  rr(40, 660, W - 80, 1010, 34); g.fillStyle = C.panel; g.fill();
  g.save(); rr(40, 660, W - 80, 1010, 34); g.clip();
  g.fillStyle = C.panel2; g.fillRect(40, 660, W - 80, 96);
  for (const [x, c] of [[86, '#ff5f57'], [118, '#febc2e'], [150, '#28c840']]) { g.fillStyle = c; g.beginPath(); g.arc(x, 708, 9, 0, TAU); g.fill(); }
  text(UI.app, W / 2, 718, '700 32px Inter', C.ink, 'center');
  g.restore();
}
function folderTabs(sel) { const tabs = ['Inbox', UI.sent, 'Drafts']; tabs.forEach((n, i) => { const x = 96 + i * 190, on = n === sel; rr(x - 22, 778, 172, 56, 28); g.fillStyle = on ? '#22314b' : 'transparent'; g.fill(); text(n, x + 64, 816, `${on ? 700 : 500} 28px Inter`, on ? C.ink : C.dim, 'center'); }); }

// ------------------------------------------------------------------ the shots
function shotSent(t) {
  chrome(t); folderTabs(UI.sent);
  const k = ease.out((t - EV.slide) / 0.5), y0 = 860;
  // older rows, dimmed: earlier letters
  [['Rep. Greg Casar', '(earlier) a follow-up to OpenAI’s reply', '2 Sep'], ['Rep. Greg Casar + colleagues', '(earlier) a letter on AI-agent incidents', '10 Aug']].forEach(([f, s, d], i) => {
    const y = y0 + 190 * (i + 1) * (0.6 + 0.4 * k); g.globalAlpha = 0.45; text(f, 96, y + 50, '600 28px Inter', C.ink); text(s, 96, y + 92, '400 26px Inter', C.dim); text(d, W - 96, y + 50, '500 24px Inter', C.dim, 'right'); g.globalAlpha = 1;
    g.fillStyle = C.line; g.fillRect(80, y + 128, W - 160, 2); });
  if (t < EV.slide) return;
  const y = y0 + (1 - k) * -60; g.globalAlpha = k;
  rr(64, y + 6, W - 128, 168, 20); g.fillStyle = '#1a2539'; g.fill(); g.strokeStyle = C.blue; g.lineWidth = 3; g.stroke();
  text(UI.from, 96, y + 56, '700 28px Inter', C.ink); text(UI.date, W - 96, y + 56, '500 24px Inter', C.dim, 'right');
  text('To: ' + UI.to, 96, y + 96, '500 26px Inter', C.dim);
  wrap(UI.subj, 96, y + 138, W - 330, 34, '600 26px Inter', C.ink);
  // the send bar, then DELIVERED
  const s = clamp((t - EV.slide) / (EV.delivered - EV.slide));
  if (t < EV.delivered) { rr(96, y + 160, W - 192, 6, 3); g.fillStyle = C.line; g.fill(); rr(96, y + 160, (W - 192) * s, 6, 3); g.fillStyle = C.blue; g.fill(); }
  else { const p = ease.back((t - EV.delivered) / 0.35); g.save(); g.translate(W - 170, y + 128); g.scale(p, p); rr(-90, -26, 180, 52, 26); g.fillStyle = 'rgba(60,207,142,.16)'; g.fill(); g.strokeStyle = C.green; g.lineWidth = 2; g.stroke();
    text('✓ ' + UI.delivered, 0, 1, '700 24px Inter', C.green, 'center', 'middle'); g.restore(); }
  g.globalAlpha = 1;
}
function shotOpen(t) {
  chrome(t);
  text('‹ ' + UI.sent, 96, 820, '600 28px Inter', C.blue);
  text(UI.from, 96, 890, '700 30px Inter', C.ink); text('To: ' + UI.to, 96, 934, '500 26px Inter', C.dim); text(UI.date, W - 96, 890, '500 24px Inter', C.dim, 'right');
  wrap(UI.subj, 96, 994, W - 192, 40, '700 32px Inter', C.ink);
  g.fillStyle = C.line; g.fillRect(80, 1036, W - 160, 2);
  wrap(UI.ask, 96, 1096, W - 192, 44, 'italic 500 32px Inter', '#cdd6e6'); text(UI.askWho, 96, 1236, '500 22px Inter', C.dim);
  // three staff badges: they go grey, one by one, and take a red ACCESS REVOKED bar
  for (let i = 0; i < 3; i++) { const x = 96 + i * 302, y = 1280, k = clamp((t - EV['badge' + i]) / 0.25);
    rr(x, y, 284, 170, 18); g.fillStyle = k > 0 ? `rgb(${lerp(34, 40, k)},${lerp(50, 42, k)},${lerp(78, 46, k)})` : '#22324e'; g.fill();
    g.fillStyle = k > 0 ? '#3a3f48' : '#5b8cff'; g.beginPath(); g.arc(x + 62, y + 70, 34, 0, TAU); g.fill(); g.fillRect(x + 28, y + 112, 68, 34);
    g.fillStyle = k > 0 ? '#4a505a' : '#8fb0ff'; g.fillRect(x + 118, y + 50, 130, 14); g.fillRect(x + 118, y + 80, 96, 12); g.fillRect(x + 118, y + 106, 116, 12);
    text('SAFETY · RESEARCH', x + 118, y + 150, '700 16px RobotoCondensed', k > 0 ? '#6a707a' : '#a9c0ff');
    if (k > 0) { const s2 = ease.back(k); g.save(); g.translate(x + 142, y + 88); g.rotate(-0.12); g.scale(s2, s2); rr(-132, -26, 264, 52, 6); g.fillStyle = 'rgba(255,90,78,.92)'; g.fill();
      text('ACCESS REVOKED', 0, 2, '800 26px RobotoCondensed', '#fff', 'center', 'middle'); g.restore(); } }
  // both sides
  const a = clamp((t - EV.revoke - 0.6) / 0.4); g.globalAlpha = a;
  wrap(UI.oai, 96, 1508, W - 192, 32, '700 24px RobotoCondensed', '#cfd8e8'); text(UI.res, 96, 1600, '700 24px RobotoCondensed', '#cfd8e8'); g.globalAlpha = 1;
}
function shotCal(t, over) {
  chrome(t);
  const di = dayAt(t), [mon, day] = DAYS[di], due = di >= 15;
  text(UI.due, W / 2, 836, '700 32px Inter', over ? C.red : C.ink, 'center');
  // a month grid: November 2026 (1 Nov is a Sunday), weekday heads Mon..Sun
  const gx = 110, gy = 890, cw = (W - 220) / 7, ch = 92;
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, i) => text(d, gx + cw * i + cw / 2, gy, '600 24px Inter', C.dim, 'center'));
  const start = 6;   // Sunday column
  for (let n = 1; n <= 30; n++) { const c = (start + n - 1) % 7, r = Math.floor((start + n - 1) / 7), x = gx + cw * c + cw / 2, y = gy + 40 + r * ch + ch / 2;
    const past = mon === 'NOV' && n <= day, isDue = n === 13, isToday = mon === 'NOV' && n === day;
    if (past && n > 13) { rr(x - cw / 2 + 6, y - ch / 2 + 6, cw - 12, ch - 12, 14); g.fillStyle = 'rgba(255,90,78,.14)'; g.fill(); }
    if (isToday) { g.beginPath(); g.arc(x, y, 40, 0, TAU); g.fillStyle = past && n > 13 ? C.red : C.blue; g.fill(); }
    text(String(n), x, y + 2, `${isToday ? 800 : 500} 34px Inter`, isToday ? '#fff' : past ? C.ink : C.faint, 'center', 'middle');
    if (isDue && t > EV.circle) { const k = ease.out((t - EV.circle) / 0.45); g.save(); g.strokeStyle = C.amber; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.ellipse(x, y, 52, 44, -0.2, -1.2, -1.2 + TAU * 1.08 * k); g.stroke(); g.restore(); } }
  // before November: an OCT line
  if (mon === 'OCT') text(`${day} OCT · SENT`, W / 2, gy + 40 + 6 * ch, '700 30px Inter', C.blue, 'center');
  // beat 4: OVERDUE counts up and Replies: 0
  if (over) { const od = Math.max(0, di - 15); rr(96, 1520, W - 192, 110, 22); g.fillStyle = 'rgba(255,90,78,.12)'; g.fill(); g.strokeStyle = 'rgba(255,90,78,.6)'; g.lineWidth = 2; g.stroke();
    text(`OVERDUE: ${od} DAY${od === 1 ? '' : 'S'}`, 130, 1588, '800 38px RobotoCondensed', C.red);
    const z = t > EV.zero ? ease.back((t - EV.zero) / 0.3) : 0; g.save(); g.translate(W - 230, 1575); g.scale(lerp(0.6, 1, z), lerp(0.6, 1, z)); g.globalAlpha = clamp(z * 2);
    text(`${UI.replies}: 0`, 0, 0, '800 38px RobotoCondensed', C.ink, 'center', 'middle'); g.restore(); }
}
function shotStatus(t) {
  chrome(t);
  text('‹ ' + UI.sent, 96, 820, '600 28px Inter', C.blue);
  // the thread: one message, one status, an empty reply
  rr(80, 860, W - 160, 340, 22); g.fillStyle = C.panel2; g.fill();
  text(UI.from, 116, 916, '700 28px Inter', C.ink); text(UI.date, W - 116, 916, '500 24px Inter', C.dim, 'right');
  wrap(UI.subj, 116, 966, W - 232, 36, '600 28px Inter', '#cdd6e6');
  g.fillStyle = C.faint; for (let i = 0; i < 4; i++) g.fillRect(116, 1050 + i * 26, (W - 300) * (0.55 + 0.4 * ((i * 37) % 10) / 10), 10);
  text(UI.qNote, 116, 1180, '500 22px Inter', C.dim);
  const p = t > EV.status ? ease.back((t - EV.status) / 0.4) : 0;
  g.save(); g.translate(W / 2, 1262); g.scale(lerp(0.7, 1.15, p), lerp(0.7, 1.15, p)); g.globalAlpha = 0.5 + 0.5 * clamp(p * 2);
  rr(-170, -34, 340, 68, 34); g.fillStyle = 'rgba(60,207,142,.16)'; g.fill(); g.strokeStyle = C.green; g.lineWidth = 3; g.stroke();
  text('✓ ' + UI.delivered, 0, 2, '800 32px Inter', C.green, 'center', 'middle'); g.restore();
  rr(80, 1330, W - 160, 250, 22); g.strokeStyle = C.line; g.lineWidth = 3; g.stroke(); text(UI.reply + '…', 116, 1374, '500 28px Inter', C.faint);
  if (Math.floor(t * 1.8) % 2 === 0) { g.fillStyle = C.blue; g.fillRect(116, 1400, 4, 44); }
  text(`${UI.replies}: 0`, W - 116, 1630, '700 26px Inter', C.dim, 'right');
}

function tag(text_, a, y = 1690) {
  if (a <= 0 || !text_) return; g.save(); g.globalAlpha = a; g.font = '800 28px Inter'; let w = g.measureText(text_).width; const maxW = 860; if (w > maxW) { g.font = `800 ${Math.floor(28 * maxW / w)}px Inter`; w = g.measureText(text_).width; }
  const x = (W - w - 44) / 2; rr(x, y, w + 44, 58, 8); g.fillStyle = 'rgba(8,11,17,.92)'; g.fill(); g.strokeStyle = 'rgba(91,140,255,.6)'; g.lineWidth = 2; g.stroke();
  text(text_, x + 22, y + 31, g.font, '#dfe6f3', 'left', 'middle'); g.restore();
}
const TAGS = [['tag1', T.s1 + 1.6, T.s2 - 0.1], ['tag2', EV.revoke + 1.0, T.s3 - 0.1], ['tag3', EV.circle + 0.5, T.s4 - 0.1], ['tag4', EV.zero + 0.4, T.s5 - 0.1], ['tag5', EV.status + 0.8, T.end + 1]];
function grain(t) { const R = rng(Math.floor(t * FPS) + 3); g.save(); g.globalAlpha = 0.05; for (let i = 0; i < 900; i++) { g.fillStyle = R() < 0.5 ? '#fff' : '#000'; g.fillRect(R() * W, R() * H, 2, 2); } g.restore();
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = v; g.fillRect(0, 0, W, H); }

const SHOTS = [{ t0: () => T.s1, f: shotSent }, { t0: () => T.s2, f: shotOpen }, { t0: () => T.s3, f: (t) => shotCal(t, false) }, { t0: () => T.s4, f: (t) => shotCal(t, true) }, { t0: () => T.s5, f: shotStatus }];
const shotAt = (t) => { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].t0()) return i; return 0; };
function frame(t, captions = true) {
  g.setTransform(1, 0, 0, 1, 0, 0); const i = shotAt(t), lt = t - SHOTS[i].t0();
  // each shot pushes in a little (a slow zoom on the screen), and cuts on a short slide
  const z = 1 + 0.025 * clamp(lt / 4), sl = i > 0 ? (1 - ease.out(lt / 0.22)) * 60 : 0;
  g.save(); g.translate(W / 2, H * 0.6 + sl); g.scale(z, z); g.translate(-W / 2, -H * 0.6); SHOTS[i].f(t); g.restore();
  grain(t); CAP.bug(g);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3); for (const [k, a0, a1] of TAGS) tag(UI[k], tg(a0, a1));
  if (captions) CAP.draw(g, P, t, { busy: BUSY || {} });
  return out;
}
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g, P, (t) => frame(t, false));
const LOOKS = [{ name: '1-sent', t: EV.delivered + 0.5 }, { name: '2-fired', t: T.s3 - 0.5 }, { name: '3-due', t: EV.circle + 0.6 }, { name: '4-overdue', t: T.s5 - 0.4 }, { name: '5-status', t: EV.status + 0.8 }];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, cueNames, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g, P, { keep: () => [], busy: BUSY || {} }) },
  looks: LOOKS.map((l) => ({ name: l.name })), look(i) { return frame(LOOKS[i].t).toDataURL('image/png'); },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
