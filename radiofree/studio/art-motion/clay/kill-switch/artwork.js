// KILL SWITCH v2 — the two sides of one leaflet, as artwork in INK colours (print.js separates and prints them).
// Front: a toaster's IMPORTANT SAFEGUARDS — full. Back: a frontier AI model's — the same page with nothing on it.
// The manual's little instruction man wears a Toko mask (no face is ever drawn; the mask is the face).
import { INK as I, AW, AH } from './print.js';

const TAU = Math.PI * 2, LW = 6;
const F = (wt, px) => `${wt} ${px}px "RobotoCondensed", "IPAPGothic"`;   // Japanese falls through to IPA P Gothic
const ln = (g, w = LW, col = I.K) => { g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = col; };
const poly = (g, pts, close = true) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); };
const text = (g, s, x, y, font, { col = I.K, align = 'left', base = 'alphabetic' } = {}) => { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = base; g.fillText(s, x, y); };

// ------------------------------------------------------------------ pictograms (ISO 7010 grammar)
function triangle(g, x, y, s, inner) {
  g.save(); g.translate(x, y);
  poly(g, [[0, -s * 0.55], [s * 0.6, s * 0.48], [-s * 0.6, s * 0.48]]); g.fillStyle = I.Y; g.fill(); ln(g, s * 0.07); g.stroke();
  g.save(); g.translate(0, s * 0.14); inner(g, s * 0.5); g.restore(); g.restore();
}
function forbid(g, x, y, s, inner) {
  g.save(); g.translate(x, y); g.fillStyle = I.W; g.beginPath(); g.arc(0, 0, s * 0.5, 0, TAU); g.fill();
  inner(g, s * 0.6);
  g.strokeStyle = I.R; g.lineWidth = s * 0.09; g.beginPath(); g.arc(0, 0, s * 0.45, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(-s * 0.32, -s * 0.32); g.lineTo(s * 0.32, s * 0.32); g.stroke(); g.restore();
}
function must(g, x, y, s, inner) { g.save(); g.translate(x, y); g.fillStyle = I.B; g.beginPath(); g.arc(0, 0, s * 0.5, 0, TAU); g.fill(); inner(g, s * 0.6); g.restore(); }
const SYM = {
  heat(g, s) { g.strokeStyle = I.K; g.lineWidth = s * 0.11; g.lineCap = 'round';
    for (const dx of [-0.32, 0, 0.32]) { g.beginPath(); for (let k = 0; k <= 12; k++) { const u = k / 12; g.lineTo(dx * s + Math.sin(u * TAU * 1.2) * s * 0.08, -s * 0.38 + u * s * 0.55); } g.stroke(); }
    g.fillStyle = I.K; g.fillRect(-s * 0.55, s * 0.24, s * 1.1, s * 0.13); },
  shock(g, s) { g.fillStyle = I.K; poly(g, [[s * 0.1, -s * 0.5], [-s * 0.22, s * 0.05], [0, s * 0.05], [-s * 0.12, s * 0.5], [s * 0.24, -s * 0.08], [s * 0.02, -s * 0.08]]); g.fill(); },
  child(g, s) { g.fillStyle = I.K; g.beginPath(); g.arc(0, -s * 0.34, s * 0.13, 0, TAU); g.fill();
    g.strokeStyle = I.K; g.lineWidth = s * 0.12; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -s * 0.18); g.lineTo(0, s * 0.12); g.moveTo(-s * 0.24, -s * 0.06); g.lineTo(s * 0.24, -s * 0.06);
    g.moveTo(0, s * 0.12); g.lineTo(-s * 0.16, s * 0.42); g.moveTo(0, s * 0.12); g.lineTo(s * 0.16, s * 0.42); g.stroke(); },
  water(g, s) { g.fillStyle = I.K; g.beginPath(); g.roundRect(-s * 0.3, -s * 0.48, s * 0.6, s * 0.4, s * 0.08); g.fill();
    g.strokeStyle = I.K; g.lineWidth = s * 0.09; for (const dy of [0.12, 0.32]) { g.beginPath(); for (let k = 0; k <= 16; k++) { const u = k / 16; g.lineTo(-s * 0.48 + u * s * 0.96, s * dy + Math.sin(u * TAU * 2) * s * 0.05); } g.stroke(); } },
  fork(g, s) { g.fillStyle = I.K; g.beginPath(); g.roundRect(-s * 0.36, -s * 0.05, s * 0.72, s * 0.42, s * 0.08); g.fill();
    g.fillStyle = I.W; g.fillRect(-s * 0.2, -s * 0.05, s * 0.1, s * 0.12); g.fillRect(s * 0.1, -s * 0.05, s * 0.1, s * 0.12);
    g.strokeStyle = I.K; g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(-s * 0.15, s * 0.05); g.lineTo(-s * 0.15, -s * 0.52);
    for (const dx of [-0.24, -0.15, -0.06]) { g.moveTo(dx * s, -s * 0.36); g.lineTo(dx * s, -s * 0.56); } g.stroke(); },
  rain(g, s) { g.fillStyle = I.K; g.beginPath(); g.arc(-s * 0.15, -s * 0.2, s * 0.2, Math.PI, 0); g.arc(s * 0.15, -s * 0.22, s * 0.24, Math.PI, 0); g.lineTo(s * 0.39, -s * 0.05); g.lineTo(-s * 0.35, -s * 0.05); g.fill();
    g.strokeStyle = I.K; g.lineWidth = s * 0.07; g.lineCap = 'round'; for (const dx of [-0.24, 0, 0.24]) { g.beginPath(); g.moveTo(dx * s, s * 0.05); g.lineTo(dx * s - s * 0.08, s * 0.32); g.stroke(); } },
  plug(g, s) { g.fillStyle = I.W; g.beginPath(); g.roundRect(-s * 0.26, -s * 0.18, s * 0.52, s * 0.36, s * 0.06); g.fill();
    g.fillRect(-s * 0.16, -s * 0.44, s * 0.08, s * 0.28); g.fillRect(s * 0.08, -s * 0.44, s * 0.08, s * 0.28);
    g.strokeStyle = I.W; g.lineWidth = s * 0.09; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, s * 0.18); g.quadraticCurveTo(0, s * 0.44, s * 0.3, s * 0.44); g.stroke(); },
  book(g, s) { g.fillStyle = I.W; poly(g, [[0, -s * 0.28], [-s * 0.42, -s * 0.38], [-s * 0.42, s * 0.3], [0, s * 0.4], [s * 0.42, s * 0.3], [s * 0.42, -s * 0.38]]); g.fill();
    g.strokeStyle = I.B; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(0, -s * 0.26); g.lineTo(0, s * 0.38); g.stroke(); },
};

// ------------------------------------------------------------------ the instruction man, in a Toko mask
/** a line-drawn manual figure, origin at his feet; pose: 'pull' (hauling a plug out of the wall) or 'shrug' */
function man(g, x, y, s, pose) {
  g.save(); g.translate(x, y); g.scale(s, s); ln(g, 5.5);
  const head = [0, -214];
  // legs and body: outlined shapes with a paper fill, the manual way
  g.fillStyle = I.W;
  const lean = pose === 'pull' ? -14 : 0;
  poly(g, [[-26 + lean, -170], [26 + lean, -170], [30, -96], [-30, -96]]); g.fill(); g.stroke();           // torso
  for (const sx of [-1, 1]) { poly(g, [[sx * 6, -98], [sx * 26, -98], [sx * (pose === 'pull' && sx < 0 ? 40 : 24), 0], [sx * (pose === 'pull' && sx < 0 ? 22 : 8), 0]]); g.fill(); g.stroke(); }
  g.beginPath(); for (const sx of [-1, 1]) { g.moveTo(sx * (pose === 'pull' && sx < 0 ? 31 : 16) - 14, 1); g.lineTo(sx * (pose === 'pull' && sx < 0 ? 31 : 16) + 16, 1); } g.stroke();  // shoes
  // arms
  g.beginPath();
  if (pose === 'pull') { g.moveTo(-20 + lean, -160); g.lineTo(-62, -132); g.lineTo(-96, -136); g.moveTo(20 + lean, -160); g.lineTo(-30, -126); g.lineTo(-92, -128); }
  else { g.moveTo(-24, -160); g.lineTo(-52, -120); g.lineTo(-30, -96); g.moveTo(24, -160); g.lineTo(46, -196); g.lineTo(30, -226); }
  g.stroke();
  // the head IS the mask: a disc, two arches for eyes, a smile with a second smile inside it
  g.fillStyle = I.W; g.beginPath(); g.arc(head[0] + lean * 0.6, head[1], 42, 0, TAU); g.fill(); g.stroke();
  g.save(); g.translate(head[0] + lean * 0.6, head[1]); ln(g, 5.5);
  for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 15, -2, 9, Math.PI, 0); g.moveTo(sx * 15, -11); g.lineTo(sx * 15, -3); g.stroke(); }
  g.beginPath(); g.arc(0, 8, 20, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.beginPath(); g.arc(0, 8, 9, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  g.restore();
  if (pose === 'pull') { ln(g, 3.5); for (const k of [0, 1, 2]) { g.beginPath(); g.moveTo(-118 - k * 4, -150 + k * 16); g.lineTo(-138 - k * 4, -150 + k * 16); g.stroke(); } }
  if (pose === 'shrug') { g.fillStyle = I.K; g.font = F(800, 64); g.textAlign = 'center'; g.fillText('?', 64, -300); }
  g.restore();
}

// ------------------------------------------------------------------ hero drawings
function toaster(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const D = [70, -60];
  poly(g, [[140, -110], [140 + D[0], -110 + D[1]], [140 + D[0], 150 + D[1]], [140, 150]]); g.fillStyle = I.T22; g.fill(); ln(g); g.stroke();
  poly(g, [[-200, -110], [-200 + D[0], -110 + D[1]], [140 + D[0], -110 + D[1]], [140, -110]]); g.fillStyle = I.T10; g.fill(); ln(g); g.stroke();
  g.beginPath(); g.roundRect(-200, -110, 340, 260, 26); g.fillStyle = I.W; g.fill(); ln(g); g.stroke();
  for (const off of [0.32, 0.62]) { const ax = -200 + 340 * 0.12 + D[0] * off, ay = -110 + D[1] * off; g.beginPath(); g.roundRect(ax, ay - 7, 340 * 0.76, 14, 7); g.fillStyle = I.K; g.fill(); }
  ln(g, 4); g.beginPath(); g.moveTo(-178, 84); g.lineTo(118, 84); g.stroke();
  g.fillStyle = I.K; g.beginPath(); g.roundRect(144 + D[0] * 0.4, -40 + D[1] * 0.4, 46, 22, 8); g.fill();
  ln(g, 4); g.beginPath(); g.moveTo(140 + D[0] * 0.4, -86 + D[1] * 0.4); g.lineTo(140 + D[0] * 0.4, 60 + D[1] * 0.4); g.stroke();
  g.beginPath(); g.arc(-110, 20, 30, 0, TAU); g.fillStyle = I.T22; g.fill(); ln(g, 5); g.stroke();
  g.beginPath(); g.moveTo(-110, 20); g.lineTo(-92, -2); g.stroke();
  for (let k = 0; k < 7; k++) { const a = -Math.PI * 0.9 + k * 0.3; g.beginPath(); g.moveTo(-110 + Math.cos(a) * 40, 20 + Math.sin(a) * 40); g.lineTo(-110 + Math.cos(a) * 48, 20 + Math.sin(a) * 48); g.stroke(); }
  g.fillStyle = I.K; for (const fx of [-170, 110]) { g.beginPath(); g.roundRect(fx, 150, 30, 14, 4); g.fill(); }
  g.restore();
}
function server(g, x, y, s) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const D = [60, -50];
  poly(g, [[60, -200], [60 + D[0], -200 + D[1]], [60 + D[0], 190 + D[1]], [60, 190]]); g.fillStyle = I.T22; g.fill(); ln(g); g.stroke();
  poly(g, [[-120, -200], [-120 + D[0], -200 + D[1]], [60 + D[0], -200 + D[1]], [60, -200]]); g.fillStyle = I.T10; g.fill(); ln(g); g.stroke();
  g.beginPath(); g.rect(-120, -200, 180, 390); g.fillStyle = I.W; g.fill(); ln(g); g.stroke();
  for (let i = 0; i < 9; i++) { const yy = -176 + i * 40; ln(g, 4); g.strokeRect(-104, yy, 148, 28); g.fillStyle = I.K; g.beginPath(); g.arc(-88, yy + 14, 4, 0, TAU); g.fill(); g.fillRect(-40, yy + 11, 70, 6); }
  g.beginPath(); g.roundRect(-330, -140, 170, 120, 18); g.fillStyle = I.W; g.fill(); ln(g); g.stroke();
  poly(g, [[-200, -20], [-182, 12], [-176, -20]], false); g.fillStyle = I.W; g.fill(); ln(g); g.stroke();
  g.fillStyle = I.K; [[-306, -110, 120], [-306, -84, 96], [-306, -58, 110]].forEach(([bx, by, bw]) => g.fillRect(bx, by, bw, 8));
  // its cable runs off the page: there is nothing here to unplug
  ln(g, 5); g.beginPath(); g.moveTo(60 + D[0] * 0.5, 160 + D[1] * 0.5); g.bezierCurveTo(200, 200, 300, 230, 470, 210); g.stroke();
  g.restore();
}
function callout(g, n, x, y, tx, ty) {
  ln(g, 3); g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.stroke();
  g.fillStyle = I.W; g.beginPath(); g.arc(x, y, 24, 0, TAU); g.fill(); ln(g, 4); g.stroke();
  text(g, String(n), x, y + 1, F(700, 30), { align: 'center', base: 'middle' });
  g.fillStyle = I.K; g.beginPath(); g.arc(tx, ty, 6, 0, TAU); g.fill();
}
function header(g, left) {
  g.fillStyle = I.K; g.fillRect(40, 40, AW - 80, 92);
  text(g, left, 64, 102, F(800, 46), { col: I.W });
  text(g, 'IMPORTANT SAFEGUARDS', AW - 64, 90, F(700, 25), { col: I.W, align: 'right' });
  text(g, '安全上のご注意', AW - 64, 120, F(400, 19), { col: I.W, align: 'right' });   // a Japanese manual's own heading
  text(g, 'EN · FI · JA · SV · DA · NO · DE · FR · ES · IT · NL', 44, 166, F(600, 20));
}
function sectionHead(g, y, right) {
  // the triangle-with-! in the heading, then the heading in three languages
  g.save(); g.translate(62, y - 11); poly(g, [[0, -17], [19, 15], [-19, 15]]); g.fillStyle = I.Y; g.fill(); ln(g, 3); g.stroke(); text(g, '!', 0, 12, F(800, 22), { align: 'center' }); g.restore();
  text(g, 'WARNINGS', 92, y, F(800, 34)); text(g, 'VAROITUKSET · 警告 · VARNINGAR', 252, y, F(500, 19));
  text(g, right, AW - 46, y, F(600, 24), { align: 'right' });
  ln(g, 3); g.beginPath(); g.moveTo(44, y + 16); g.lineTo(AW - 44, y + 16); g.stroke();
}
const CELL = (i) => [140 + (i % 4) * 207, 806 + ((i / 4) | 0) * 166];
function barcode(g, x, y, w, h, seed) { let bx = x, s = seed; g.fillStyle = I.K; while (bx < x + w) { s = (s * 9301 + 49297) % 233280; const bw = 2 + ((s / 233280) * 4 | 0); g.fillRect(bx, y, bw, h); bx += bw + 2 + ((s * 7 % 4) | 0); } }

// ------------------------------------------------------------------ the toaster side
const LINES = [
  ['Do not immerse in water.', 'FI Älä upota laitetta veteen.  JA 本体を水につけないでください。  SV Sänk inte ned apparaten i vatten.'],
  ['Never insert metal objects.', 'FI Älä työnnä laitteeseen metalliesineitä.  JA 金属製のものを入れないでください。  SV För aldrig in metallföremål.'],
  ['Unplug before cleaning.', 'FI Irrota pistoke ennen puhdistusta.  JA お手入れの前に電源プラグを抜いてください。  SV Dra ur kontakten före rengöring.'],
  ['Keep out of reach of children.', 'FI Pidä poissa lasten ulottuvilta.  JA お子様の手の届かない所に置いてください。  SV Förvaras utom räckhåll för barn.'],
  ['Never leave unattended while in use.', 'FI Älä jätä laitetta päälle ilman valvontaa.  JA 使用中はそばを離れないでください。  SV Lämna aldrig apparaten utan uppsikt.'],
];
const PICTS = [
  [triangle, 'heat', 'Hot surface', 'Kuuma pinta', '高温注意'], [triangle, 'shock', 'Electric shock', 'Sähköisku', '感電注意'], [triangle, 'child', 'Children', 'Lapset', '子供に注意'], [forbid, 'water', 'No water', 'Ei vettä', '水につけない'],
  [forbid, 'fork', 'No metal', 'Ei metallia', '金属を入れない'], [forbid, 'rain', 'Indoors only', 'Vain sisällä', '屋内専用'], [must, 'plug', 'Unplug', 'Irrota pistoke', 'プラグを抜く'], [must, 'book', 'Read manual', 'Lue ohjeet', '取扱説明書を読む'],
];
export function front(g) {
  header(g, 'TOASTER T-2');
  text(g, '230 V~  50 Hz  850 W', AW - 44, 166, F(600, 20), { align: 'right' });
  toaster(g, 330, 420, 0.98);
  // the cord, out of the back of the toaster, to the plug in the instruction man's hands; the wall socket beside him
  ln(g, 5); g.beginPath(); g.moveTo(470, 470); g.bezierCurveTo(560, 600, 600, 540, 648, 536); g.stroke();
  g.beginPath(); g.roundRect(644, 522, 40, 28, 6); g.fillStyle = I.T22; g.fill(); ln(g, 4); g.stroke();
  g.beginPath(); g.roundRect(812, 400, 56, 88, 10); g.fillStyle = I.W; g.fill(); ln(g, 4); g.stroke();
  g.fillStyle = I.K; g.beginPath(); g.arc(830, 444, 5, 0, TAU); g.arc(850, 444, 5, 0, TAU); g.fill();
  man(g, 760, 640, 0.78, 'pull');
  callout(g, 1, 120, 230, 205, 300); callout(g, 2, 560, 236, 486, 330); callout(g, 3, 110, 560, 222, 440); callout(g, 4, 600, 630, 656, 548);
  text(g, '1  Bread slots      2  Lever      3  Browning control      4  Plug', 44, 676, F(500, 19));
  sectionHead(g, 724, '3 / 48');
  PICTS.forEach(([shape, sym, en, fi, ja], i) => { const [x, y] = CELL(i); shape(g, x, y, 104, SYM[sym]); text(g, en, x, y + 70, F(700, 16), { align: 'center' }); text(g, fi, x, y + 87, F(400, 14), { align: 'center' }); text(g, ja, x, y + 104, F(400, 13), { align: 'center' }); });
  LINES.forEach(([en, tr], i) => { const y = 1102 + i * 32; text(g, `${i + 1}.`, 44, y, F(800, 20)); text(g, en, 70, y, F(700, 20)); text(g, tr, 70, y + 16, F(400, 12)); });
  // the footer: what it was tested to, the bin, the barcode, the instruction to keep all of this
  ln(g, 3.5); g.beginPath(); g.ellipse(132, 1312, 86, 30, 0, 0, TAU); g.stroke(); text(g, 'IEC 60335-2-9', 132, 1313, F(700, 21), { align: 'center', base: 'middle' });
  g.beginPath(); g.roundRect(240, 1284, 128, 56, 9); g.stroke(); text(g, 'UL 1026', 304, 1313, F(700, 21), { align: 'center', base: 'middle' });
  text(g, 'CE', 418, 1314, F(800, 42), { align: 'center', base: 'middle' });
  g.save(); g.translate(492, 1312); ln(g, 3.5); poly(g, [[-17, -22], [17, -22], [13, 23], [-13, 23]]); g.stroke(); g.beginPath(); g.moveTo(-26, -29); g.lineTo(26, 32); g.moveTo(26, -29); g.lineTo(-26, 32); g.stroke(); g.restore();
  barcode(g, 560, 1286, 190, 46, 11); text(g, '6 412345 678906', 655, 1350, F(500, 15), { align: 'center' });
  text(g, '3', AW - 52, 1324, F(800, 30), { align: 'right' });
  text(g, 'SAVE THESE INSTRUCTIONS · SÄILYTÄ NÄMÄ OHJEET · 大切に保管してください', AW / 2, 1274, F(700, 15), { align: 'center' });
}

// ------------------------------------------------------------------ the frontier model side: the same page, empty
export function back(g) {
  header(g, 'FRONTIER AI MODEL');
  text(g, 'Rating: —', AW - 44, 166, F(600, 20), { align: 'right' });
  server(g, 470, 450, 0.95);
  man(g, 770, 650, 0.78, 'shrug');
  callout(g, 1, 120, 236, 205, 330);
  text(g, '1  Model', 44, 676, F(500, 19));
  sectionHead(g, 724, '4 / 48');
  g.setLineDash([9, 9]); ln(g, 2.5);
  for (let i = 0; i < 8; i++) { const [x, y] = CELL(i); g.beginPath(); g.arc(x, y, 52, 0, TAU); g.stroke(); }
  g.setLineDash([]);
  for (let i = 0; i < 8; i++) { const [x, y] = CELL(i); text(g, '—', x, y + 80, F(700, 17), { align: 'center' }); }
  text(g, '1.', 44, 1104, F(800, 20)); text(g, 'Release.', 70, 1104, F(700, 20)); text(g, 'FI Julkaise.  JA 公開する。  SV Släpp.', 70, 1120, F(400, 12));
  g.setLineDash([3, 7]); ln(g, 2);
  for (let i = 1; i < 5; i++) { const y = 1102 + i * 32; text(g, `${i + 1}.`, 44, y, F(800, 20)); g.beginPath(); g.moveTo(70, y); g.lineTo(560, y); g.stroke(); g.beginPath(); g.moveTo(70, y + 14); g.lineTo(820, y + 14); g.stroke(); }
  g.setLineDash([8, 8]); ln(g, 3);
  g.beginPath(); g.ellipse(132, 1312, 86, 30, 0, 0, TAU); g.stroke(); g.beginPath(); g.roundRect(240, 1284, 128, 56, 9); g.stroke();
  g.setLineDash([]);
  text(g, '—', 132, 1313, F(700, 21), { align: 'center', base: 'middle' }); text(g, '—', 304, 1313, F(700, 21), { align: 'center', base: 'middle' });
  text(g, 'TESTED TO: —', 400, 1314, F(700, 21), { base: 'middle' });
  barcode(g, 600, 1286, 150, 46, 29);
  text(g, '4', AW - 52, 1324, F(800, 30), { align: 'right' });
  text(g, 'SAVE THESE INSTRUCTIONS · SÄILYTÄ NÄMÄ OHJEET · 大切に保管してください', AW / 2, 1274, F(700, 15), { align: 'center' });
}
