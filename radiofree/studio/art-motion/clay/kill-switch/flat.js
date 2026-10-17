// KILL SWITCH v3 — the FLAT look (owner, 17 Oct: "I liked the earlier flat look more"). The v1 composition — a flat
// vector leaflet on a dark worktop, a soft drop shadow, captions in the dark band above, the hazard tag below — with
// v2's artwork (artwork.js: ten languages, Finnish first, the masked instruction man, the manual's furniture) drawn
// in flat colour, and the kill switch as a flat sticky note. No paper texture, no print simulation, no 3D.
import { AW, AH, INK } from './print.js';
import { front, back } from './artwork.js';

const W = 1080, H = 1920, SAFE_B = 1630, TAU = Math.PI * 2;
const FONT_DIR = '../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file, desc] of [['RobotoCondensed', 'RobotoCondensed-var.woff', { weight: '100 900' }], ['Kalam', 'Kalam-700.woff', {}], ['Poppins-800', 'Poppins-800.woff', {}]]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, desc); document.fonts.add(await f.load());
}
// Japanese: IPA P Gothic (fonts-ipafont-gothic, IPA Font License) — a gothic, as Japanese manuals are set
{ const f = new FontFace('IPAPGothic', 'url(../fonts/ipagp.ttf)'); document.fonts.add(await f.load()); }
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// the flat palette: the v1 colours, one per ink
const PAPER = '#f1eee5';
const FLAT = { [INK.K]: '#1a1a1a', [INK.Y]: '#f2c200', [INK.R]: '#d22b2b', [INK.B]: '#1f5aa6', [INK.T10]: '#e2ded2', [INK.T22]: '#c9c6bd', [INK.T40]: '#a9a69d', [INK.W]: '#fbfaf6' };
/** a context that swaps each ink for its flat colour as it is set */
const flatContext = (real) => new Proxy(real, {
  get(t, k) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; },
  set(t, k, v) { t[k] = (k === 'fillStyle' || k === 'strokeStyle') && FLAT[v] ? FLAT[v] : v; return true; },
});
/** one side of the leaflet, flat, at SC× for a crisp downscale */
function side(draw, SC = 2) {
  const c = mk(AW * SC, AH * SC), g = c.getContext('2d');
  g.fillStyle = PAPER; g.fillRect(0, 0, c.width, c.height);
  const r = rng(41); for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.03)' : 'rgba(255,255,255,.45)'; g.fillRect(r() * c.width, r() * c.height, 1 + r() * 2, 1); }
  for (const fy of [AH / 3, (2 * AH) / 3]) {   // the two creases of the fold, as v1 drew them
    const y = fy * SC, sh = g.createLinearGradient(0, y - 26 * SC, 0, y + 26 * SC);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.48, 'rgba(0,0,0,.07)'); sh.addColorStop(0.5, 'rgba(255,255,255,.55)'); sh.addColorStop(0.56, 'rgba(0,0,0,.045)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(0, y - 26 * SC, c.width, 52 * SC);
  }
  g.scale(SC, SC); draw(flatContext(g));
  return c;
}
const FRONT = side(front), BACK = side(back);

/** the kill switch: a flat sticky note, a red button drawn in marker, a lifted corner */
function note(c, x, y, s, rot) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const N = 300, r = rng(12);
  c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 26; c.shadowOffsetX = 10; c.shadowOffsetY = 16; c.fillStyle = '#fbe55c'; c.fillRect(-N / 2, -N / 2, N, N); c.restore();
  c.fillStyle = '#f2d84a'; c.fillRect(-N / 2, -N / 2, N, 46);                                           // the glue strip
  // the near corner lifts: a fold of shadow and a lighter underside
  c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.moveTo(N / 2, N / 2 - 70); c.lineTo(N / 2, N / 2); c.lineTo(N / 2 - 70, N / 2); c.fill();
  c.fillStyle = '#fff3a6'; c.beginPath(); c.moveTo(N / 2, N / 2 - 64); c.lineTo(N / 2 - 64, N / 2); c.lineTo(N / 2 - 58, N / 2 - 58); c.closePath(); c.fill();
  // the button: hatched red marker inside a wobbly outline gone round twice, its base drawn underneath
  const cx = 0, cy = 8, R = 72;
  c.save(); c.beginPath(); c.ellipse(cx, cy, R, R * 0.62, 0, 0, TAU); c.clip();
  c.lineCap = 'round'; for (let k = -R * 2; k < R * 2; k += 8) { c.strokeStyle = `rgba(214,30,40,${0.6 + r() * 0.2})`; c.lineWidth = 8 + r() * 2; c.beginPath(); c.moveTo(cx + k - 46, cy - R); c.lineTo(cx + k + 46, cy + R); c.stroke(); }
  c.restore();
  c.strokeStyle = 'rgba(30,24,30,.92)'; c.lineWidth = 4; c.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) { c.beginPath(); for (let a = 0; a <= TAU + 0.3; a += 0.05) { const w = 1 + (r() - 0.5) * 0.03; c.lineTo(cx + Math.cos(a) * R * w + pass * 2, cy + Math.sin(a) * R * 0.62 * w); } c.stroke(); }
  c.beginPath(); c.moveTo(cx - R, cy + 3); c.bezierCurveTo(cx - R + 2, cy + 58, cx + R - 2, cy + 58, cx + R, cy + 2); c.stroke();
  c.beginPath(); c.moveTo(cx - R + 2, cy + 34); c.lineTo(cx - R + 2, cy + 54); c.moveTo(cx + R - 2, cy + 34); c.lineTo(cx + R - 2, cy + 53); c.stroke();
  c.fillStyle = 'rgba(30,24,30,.92)'; c.textAlign = 'center';
  c.font = '700 44px Kalam'; c.save(); c.translate(0, -78); c.rotate(-0.03); c.fillText('KILL SWITCH', 0, 0); c.restore();
  c.font = '700 33px Kalam'; c.save(); c.translate(0, 124); c.rotate(0.02); c.fillText('study — due 16 Nov', 0, 0); c.restore();
  c.restore();
}

/** the worktop and the leaflet lying on it (v1's lay(), unchanged in spirit) */
const TOP = '#1c1d1f', LS = 0.8, LX = 540, LY = 452 + AH * LS / 2, ROT = -0.02;
function lay(c, sheet, t = 0) {
  c.fillStyle = TOP; c.fillRect(0, 0, W, H);
  const r = rng(3); for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.18)'; c.fillRect(r() * W, r() * H, 2 + r() * 3, 1 + r() * 2); }
  const v = c.createRadialGradient(540, 860, 200, 540, 960, 1150); v.addColorStop(0, 'rgba(255,240,215,.10)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  c.save(); c.translate(LX, LY + Math.sin(t * 0.6) * 4); c.rotate(ROT); c.scale(LS, LS);
  c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 40; c.shadowOffsetX = 18; c.shadowOffsetY = 26; c.fillStyle = PAPER; c.fillRect(-AW / 2, -AH / 2, AW, AH); c.restore();
  c.drawImage(sheet, -AW / 2, -AH / 2, AW, AH);
  c.restore();
}
/** a point in leaflet artwork space → the frame */
function onLeaf(ax, ay) { const x = (ax - AW / 2) * LS, y = (ay - AH / 2) * LS; return [LX + x * Math.cos(ROT) - y * Math.sin(ROT), LY + x * Math.sin(ROT) + y * Math.cos(ROT)]; }

// MOCK captions, bug and tag (the films burn these with rfcaps.py)
function caption(c, lines, y) {
  c.save(); c.font = '82px "Poppins-800"'; c.lineJoin = 'round'; c.textBaseline = 'alphabetic';
  lines.forEach((s, i) => {
    const parts = s.split(/(\[[^\]]+\])/).filter(Boolean), clean = parts.map((p) => p.replace(/[[\]]/g, ''));
    let x = 540 - c.measureText(clean.join('')).width / 2; const yy = y + i * 98;
    parts.forEach((p, j) => { const t = clean[j]; c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowOffsetX = 3; c.shadowOffsetY = 3; c.lineWidth = 14; c.strokeStyle = '#000'; c.strokeText(t, x, yy); c.shadowColor = 'transparent'; c.fillStyle = p.startsWith('[') ? '#f2b83a' : '#fff'; c.fillText(t, x, yy); x += c.measureText(t).width; });
  });
  c.font = '30px "Poppins-800"'; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.5)'; c.strokeText('● RADIO FREE HELSINKI', 92, 118);
  c.fillStyle = '#f0027f'; c.fillText('●', 92, 118); c.fillStyle = 'rgba(255,255,255,.82)'; c.fillText(' RADIO FREE HELSINKI', 92 + c.measureText('●').width, 118);
  c.restore();
}
function tag(c, text, x = 110, yb = 1700) {
  yb = Math.min(yb, SAFE_B); c.save(); c.font = '700 34px "RobotoCondensed"';
  const w = c.measureText(text).width + 80, h = 62, y = yb - h;
  c.fillStyle = '#1a1a1a'; c.fillRect(x, y, w, h);
  c.save(); c.beginPath(); c.rect(x, y, 30, h); c.clip(); c.fillStyle = '#f2c200'; for (let k = -2; k < 6; k++) { c.beginPath(); c.moveTo(x + k * 18, y + h); c.lineTo(x + k * 18 + 9, y + h); c.lineTo(x + k * 18 + 9 + h, y); c.lineTo(x + k * 18 + h, y); c.fill(); } c.restore();
  c.fillStyle = '#f2c200'; c.textBaseline = 'middle'; c.fillText(text, x + 50, y + h / 2 + 2); c.restore();
}

const out = mk(W, H), g = out.getContext('2d');
const LOOKS = [
  { name: 'ks3-1-toaster', sheet: FRONT, caption: ['Its safety standard', 'asks for a [second]', 'off switch.'], tag: 'UL 1026 · TOASTERS' },
  { name: 'ks3-2-model', sheet: BACK, note: true, caption: ['Its kill switch:', 'a [study],', 'due 16 November.'], tag: 'SACRAMENTO · ORDER N-9-26' },
];
function look(i) {
  const L = LOOKS[i];
  lay(g, L.sheet, 2);
  if (L.note) { const [x, y] = onLeaf(560, 900); note(g, x, y, 0.95, 0.09); }
  caption(g, L.caption, 222); tag(g, L.tag);
  return out.toDataURL('image/png');
}
window.__film = { looks: LOOKS.map((l) => ({ name: l.name })), look };
window.__ready = true;
