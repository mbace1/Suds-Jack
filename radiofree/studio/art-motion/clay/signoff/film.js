// THE STATION'S SIGN-OFF, v2 (9 Nov). Owner, 9 Nov: "can we update our end slate a bit. Everything works but it feels
// slightly dated. Good general layout and all." So the layout and the clock are the papercut ident's (scenes/so_ident.js):
// the Cathedral over the rooftops, the pirate mast on the right, ON AIR on the left, Toko at the mic below, the lettering
// in the dark top band; the jingle's timing (ON AIR at 0.4 s, three notes at 0.5 / 0.77 / 1.04, the chord at 1.05).
// What changes is the finish:
//   - no brown frame, no sepia: a deep night sky (navy into violet, a magenta city glow on the horizon), a faint aurora
//   - the Cathedral floodlit and clean-edged, flat shapes with a lit side and a shadow side, no paper texture
//   - full signal rings out of the mast on each note (not two arcs), magenta with a white core
//   - ON AIR as a neon sign that strikes on with a flicker
//   - the lettering set, not subtitled: no outline, a line-by-line mask reveal, a pulsing LIVE dot, the tagline larger
//     and tracked in a pill
//   - grain, a vignette and a slow push-in
// 1080×1920, 30 fps, 3.0 s. Rendered by pipeline/render.mjs with --mount toko=<repo>/toko; the jingle is the old one's.
const { drawMasterBadge } = await import('/toko/js/master.js');
const W = 1080, H = 1920, FPS = 30, DUR = 3.0, TAU = Math.PI * 2;
const Q = new URLSearchParams(location.search), FONT_DIR = Q.get('fonts') || '/_fonts/';
for (const [fam, file] of [['Poppins-800', 'Poppins-800.woff'], ['Anton-400', 'Anton-400.woff']]) { const f = new FontFace(fam, `url(${FONT_DIR}${file})`); document.fonts.add(await f.load()); }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const T_ON = 0.4, RINGS = [0.5, 0.77, 1.04], T_CHORD = 1.05, T_L1 = 0.45, T_L2 = 0.58;
const MAG = '#F0027F', AMBER = '#f2b83a', MX = 850, MTOP = 712, TOKO = [440, 1545];

const out = document.createElement('canvas'); out.width = W; out.height = H; document.body.appendChild(out); out.style.width = '270px';
const g = out.getContext('2d');
const layer = (draw) => { const c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d')); return c; };

// ------------------------------------------------------------------ the still layers, drawn once
const SKY = layer((c) => {
  const gr = c.createLinearGradient(0, 0, 0, 1500); gr.addColorStop(0, '#05081a'); gr.addColorStop(0.38, '#0b1233'); gr.addColorStop(0.7, '#221848'); gr.addColorStop(0.86, '#4a1d5a'); gr.addColorStop(1, '#6a2160');
  c.fillStyle = gr; c.fillRect(0, 0, W, H);
  const hz = c.createRadialGradient(540, 1250, 40, 540, 1250, 760); hz.addColorStop(0, 'rgba(240,2,127,.30)'); hz.addColorStop(0.5, 'rgba(160,30,140,.12)'); hz.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hz; c.fillRect(0, 0, W, H);
});
const STARS = (() => { const R = rng(7); return Array.from({ length: 70 }, () => [R() * W, 80 + R() * 900, Math.pow(R(), 4) * 2.6 + 0.8, R() * TAU]); })();
const FAR = layer((c) => {   // the far city: dark blocks, a magenta rim from the haze, sparse warm windows
  const B = [[-90, 160, 1190], [140, 300, 1150], [760, 900, 1170], [880, 1170, 1210], [290, 340, 1235], [740, 790, 1240]];
  for (const [a, b, top] of B) { c.fillStyle = '#121735'; c.fillRect(a, top, b - a, 700); c.fillStyle = 'rgba(240,80,170,.35)'; c.fillRect(a, top, b - a, 3); }
  const R = rng(11); c.fillStyle = 'rgba(255,190,110,.75)';
  for (const [a, b, top] of B) for (let y = top + 26; y < 1420; y += 30) for (let x = a + 14; x < b - 10; x += 24) if (R() < 0.13) c.fillRect(x, y, 8, 11);
});
const CATHEDRAL = layer((c) => {   // floodlit: a lit face, a shadow side, crisp edges, no texture
  const lit = c.createLinearGradient(0, 700, 0, 1290); lit.addColorStop(0, '#f6f3ea'); lit.addColorStop(1, '#d8d6e4');
  const shade = '#a9a8c4', GR = '#2fa58a', GRD = '#1d6e5c', GOLD = '#e8b84a';
  c.shadowColor = 'rgba(255,240,220,.35)'; c.shadowBlur = 40;
  c.fillStyle = lit; c.fillRect(330, 1010, 420, 262); c.shadowBlur = 0;
  c.fillStyle = shade; c.fillRect(640, 1010, 110, 262);
  c.fillStyle = lit; c.beginPath(); c.moveTo(398, 1032); c.lineTo(540, 968); c.lineTo(682, 1032); c.closePath(); c.fill();
  c.fillStyle = 'rgba(120,118,150,.55)'; for (let i = 0; i < 6; i++) c.fillRect(414 + i * 52, 1046, 10, 196);
  c.fillStyle = lit; c.fillRect(470, 830, 140, 152); c.fillStyle = shade; c.fillRect(570, 830, 40, 152);
  c.fillStyle = 'rgba(120,118,150,.5)'; for (let i = 0; i < 6; i++) c.fillRect(480 + i * 24, 848, 6, 118);
  c.fillStyle = GR; c.beginPath(); c.ellipse(540, 832, 82, 96, 0, Math.PI, TAU); c.fill();
  c.fillStyle = GRD; c.beginPath(); c.ellipse(560, 832, 46, 94, 0, Math.PI * 1.5, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(512, 790, 14, 40, -0.35, 0, TAU); c.fill();
  c.fillStyle = lit; c.fillRect(532, 708, 16, 34); c.fillStyle = GOLD; c.fillRect(538, 672, 4, 38); c.beginPath(); c.arc(540, 670, 6, 0, TAU); c.fill();
  for (const x of [350, 730]) { c.fillStyle = lit; c.fillRect(x - 26, 960, 52, 72); c.fillStyle = GR; c.beginPath(); c.ellipse(x, 962, 30, 34, 0, Math.PI, TAU); c.fill(); c.fillStyle = GOLD; c.fillRect(x - 2, 916, 4, 16); }
  for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#8e8db0' : '#b4b3cc'; c.fillRect(330 - k * 34, 1272 + k * 20, 420 + k * 68, 20); }
  const up = c.createLinearGradient(0, 1272, 0, 1010); up.addColorStop(0, 'rgba(255,200,140,.28)'); up.addColorStop(1, 'rgba(255,200,140,0)');
  c.fillStyle = up; c.fillRect(330, 1010, 420, 262);
});
const NEAR = layer((c) => {
  const B = [[-90, 120, 1390], [110, 260, 1420], [250, 400, 1440], [390, 710, 1466], [700, 860, 1430], [850, 1000, 1400], [990, 1170, 1420]];
  for (const [a, b, top] of B) { c.fillStyle = '#0b0f26'; c.fillRect(a, top, b - a, 500); c.beginPath(); c.moveTo(a - 6, top); c.lineTo((a + b) / 2, top - 40); c.lineTo(b + 6, top); c.closePath(); c.fill(); }
  const R = rng(5); c.fillStyle = 'rgba(255,184,107,.8)';
  for (const [a, b, top] of B) for (let y = top + 24; y < 1580; y += 34) for (let x = a + 16; x < b - 12; x += 30) if (R() < 0.18) c.fillRect(x, y, 9, 13);
});
const ROOF = layer((c) => {
  const gr = c.createLinearGradient(0, 1500, 0, H); gr.addColorStop(0, '#16142a'); gr.addColorStop(1, '#07060f');
  c.fillStyle = gr; c.beginPath(); c.moveTo(-90, 1560); c.lineTo(W + 90, 1500); c.lineTo(W + 90, H + 90); c.lineTo(-90, H + 90); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(140,120,200,.10)'; c.lineWidth = 3; for (let x = -60; x < W + 90; x += 70) { c.beginPath(); c.moveTo(x, 1560 - (x + 90) * 0.05); c.lineTo(x - 40, H + 90); c.stroke(); }
  c.strokeStyle = 'rgba(240,2,127,.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-90, 1560); c.lineTo(W + 90, 1500); c.stroke();   // the magenta rim of the city on the roof's edge
  c.fillStyle = '#12101f'; c.fillRect(120, 1382, 110, 172); c.fillStyle = '#1b1830'; c.fillRect(110, 1368, 130, 20);
});
const MAST = layer((c) => {
  c.strokeStyle = '#9aa0c8'; c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(MX - 70, 1530); c.lineTo(MX - 6, MTOP); c.moveTo(MX + 70, 1530); c.lineTo(MX + 6, MTOP); c.stroke();
  c.lineWidth = 3; c.strokeStyle = 'rgba(154,160,200,.75)';
  for (let k = 0; k < 9; k++) { const y0 = 1530 - k * 90, y1 = 1530 - (k + 1) * 90, w0 = 70 - k * 7, w1 = 70 - (k + 1) * 7;
    c.beginPath(); c.moveTo(MX - w0, y0); c.lineTo(MX + w1, y1); c.moveTo(MX + w0, y0); c.lineTo(MX - w1, y1); c.moveTo(MX - w1, y1); c.lineTo(MX + w1, y1); c.stroke(); }
  c.fillStyle = '#2a2c48'; c.fillRect(MX - 90, 1522, 180, 18);
});
const GRAIN = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'), im = x.createImageData(512, 512), R = rng(3);
  for (let i = 0; i < 512 * 512; i++) { const v = 128 + (R() - 0.5) * 110; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } x.putImageData(im, 0, 0); return c; })();

function glow(x, y, r, rgb, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function aurora(t) {   // faint teal curtains behind the city, moving slowly; kept below the lettering band
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) { const x = -40 + i * 17, wob = Math.sin(i * 0.23 + t * 0.6) * 60 + Math.sin(i * 0.07 - t * 0.3) * 90, top = 640 + wob, h = 300 + Math.sin(i * 0.31 + t) * 80;
    const gr = g.createLinearGradient(0, top, 0, top + h); gr.addColorStop(0, 'rgba(60,255,190,0)'); gr.addColorStop(0.35, `rgba(60,255,190,${0.05 + 0.03 * Math.sin(i * 0.5 + t * 2)})`); gr.addColorStop(1, 'rgba(120,80,255,0)');
    g.fillStyle = gr; g.fillRect(x, top, 18, h); }
  g.restore();
}
function rings(t) {   // kept below the lettering band
  g.save(); g.beginPath(); g.rect(-200, 600, W + 400, H); g.clip();
  for (const [i, t0] of RINGS.entries()) { const k = clamp((t - t0) / 1.5); if (k <= 0 || k >= 1) continue; const r = lerp(24, 620, ease.out(k));
    g.save(); g.globalAlpha = (1 - k) * (i === 2 ? 1 : 0.85);
    g.strokeStyle = MAG; g.lineWidth = lerp(18, 4, k); g.shadowColor = MAG; g.shadowBlur = 30; g.beginPath(); g.arc(MX, MTOP, r, 0, TAU); g.stroke();
    g.shadowBlur = 0; g.strokeStyle = 'rgba(255,230,245,.9)'; g.lineWidth = lerp(4, 1, k); g.beginPath(); g.arc(MX, MTOP, r, 0, TAU); g.stroke(); g.restore(); }
  g.restore();
}
function onair(t) {
  const x = 175, y = 1320, on = t >= T_ON, fl = on ? (t < T_ON + 0.18 ? (Math.sin(t * 90) > 0 ? 1 : 0.25) : 0.9 + 0.1 * Math.sin(t * 11)) : 0;
  g.save(); g.fillStyle = 'rgba(12,10,24,.92)'; g.strokeStyle = 'rgba(255,90,80,.35)'; g.lineWidth = 3; g.beginPath(); g.roundRect(x - 112, y - 44, 224, 88, 16); g.fill(); g.stroke();
  g.font = '46px "Anton-400"'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (fl > 0) { g.shadowColor = 'rgba(255,60,50,1)'; g.shadowBlur = 28 * fl; g.fillStyle = `rgba(255,${Math.round(lerp(70, 110, fl))},90,${fl})`; g.fillText('ON AIR', x, y + 2); g.shadowBlur = 0; glow(x, y, 190, '255,60,50', 0.22 * fl); }
  else { g.fillStyle = 'rgba(120,30,30,.8)'; g.fillText('ON AIR', x, y + 2); }
  g.restore();
}
function toko(t) {
  const [cx, cy] = TOKO, chord = clamp((t - T_CHORD) / 0.25), bob = Math.sin(t * 2.4) * 4, R = 74;
  // the coat and the scarf: flat, clean shapes
  g.save(); g.fillStyle = '#1a1f38'; g.beginPath(); g.moveTo(cx - 150, H + 20); g.quadraticCurveTo(cx - 150, cy + 120, cx - 60, cy + 92); g.lineTo(cx + 60, cy + 92); g.quadraticCurveTo(cx + 150, cy + 120, cx + 150, H + 20); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(160,140,255,.25)'; g.lineWidth = 3; g.stroke();
  // the scarf: a wrapped band under the chin, its end thrown over the left shoulder (9 Nov: a straight tail read as a 'T')
  const sb = cy + 74 + bob * 0.3; g.fillStyle = AMBER; g.beginPath(); g.ellipse(cx, sb, 82, 24, 0, 0, TAU); g.fill();
  g.fillStyle = '#d99a2b'; g.beginPath(); g.ellipse(cx, sb + 6, 74, 14, 0, 0, Math.PI); g.fill();
  g.fillStyle = AMBER; g.beginPath(); g.moveTo(cx - 52, sb + 8); g.quadraticCurveTo(cx - 98, sb + 70, cx - 84, sb + 150); g.lineTo(cx - 52, sb + 146); g.quadraticCurveTo(cx - 62, sb + 70, cx - 22, sb + 16); g.closePath(); g.fill();
  if (chord > 0) glow(cx, cy + bob, 230, '240,2,127', 0.32 * chord);
  drawMasterBadge(g, cx, cy + bob, R, { ground: MAG, ink: '#ffffff', squash: (t > 2.2 && t < 2.32) ? 0.15 : 1 });
  // the mic on its stand
  g.strokeStyle = '#3c3f5a'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + 130, H + 10); g.lineTo(cx + 105, 1650); g.lineTo(cx + 70, 1612); g.stroke();
  g.fillStyle = '#2a2d44'; g.beginPath(); g.ellipse(cx + 62, 1604, 18, 27, -0.6, 0, TAU); g.fill(); g.fillStyle = '#4b4f70'; g.beginPath(); g.ellipse(cx + 58, 1597, 9, 14, -0.6, 0, TAU); g.fill();
  g.restore();
}
function lettering(t) {
  g.save(); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '108px "Poppins-800"'; if ('letterSpacing' in g) g.letterSpacing = '-1px';
  const l1 = 'RADIO FREE', l2 = 'HELSINKI', dotR = 26, gap = 22, w1 = g.measureText(l1).width, w2 = g.measureText(l2).width;
  const x1 = (W - (w1 + dotR * 2 + gap)) / 2 + dotR * 2 + gap, x2 = (W - w2) / 2, y1 = 300, y2 = 420;
  const line = (txt, x, y, t0) => { const k = ease.out((t - t0) / 0.42); if (k <= 0) return;
    g.save(); g.beginPath(); g.rect(0, y - 110, W, 132); g.clip(); g.shadowColor = 'rgba(0,0,10,.55)'; g.shadowBlur = 24; g.fillStyle = '#ffffff'; g.fillText(txt, x, y + (1 - k) * 120); g.restore(); };
  line(l1, x1, y1, T_L1); line(l2, x2, y2, T_L2);
  // the LIVE dot: in with the first line, pulsing on the notes
  const kd = ease.back((t - T_L1) / 0.35); if (kd > 0) { const cx = x1 - gap - dotR, cy = y1 - 38;
    const p = Math.max(0, ...RINGS.map((r) => (t >= r ? Math.exp(-(t - r) * 5) : 0)));
    g.save(); g.shadowColor = MAG; g.shadowBlur = 24 + 30 * p; g.fillStyle = MAG; g.beginPath(); g.arc(cx, cy, dotR * kd * (1 + 0.12 * p), 0, TAU); g.fill(); g.shadowBlur = 0;
    const rk = (t % 0.9) / 0.9; if (t > T_ON) { g.strokeStyle = `rgba(240,2,127,${0.6 * (1 - rk)})`; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, dotR + rk * 26, 0, TAU); g.stroke(); }
    g.restore(); }
  // the tagline, tracked, in a pill, on the chord
  const kt = ease.out((t - T_CHORD) / 0.35); if (kt > 0) { g.font = '44px "Poppins-800"'; if ('letterSpacing' in g) g.letterSpacing = '9px';
    const tag = 'LOCAL · GLOBAL · FREE RADIO', tw = g.measureText(tag).width, px = (W - tw) / 2, py = 540;
    g.globalAlpha = kt; g.strokeStyle = 'rgba(242,184,58,.55)'; g.lineWidth = 3; g.beginPath(); g.roundRect(px - 34, py - 52 + (1 - kt) * 20, tw + 58, 76, 38); g.stroke();
    g.fillStyle = AMBER; g.fillText(tag, px, py + (1 - kt) * 20); }
  g.restore();
}

function frame(t) {
  const z = lerp(1.0, 1.045, ease.io(t / DUR)), sway = Math.sin(t * 0.7) * 6;
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(SKY, 0, 0);
  const cam = (depth) => { g.setTransform(1, 0, 0, 1, 0, 0); g.translate(540 + sway * depth, 1250); g.scale(1 + (z - 1) * (0.4 + depth), 1 + (z - 1) * (0.4 + depth)); g.translate(-540, -1250); };
  cam(0.1); for (const [x, y, s, ph] of STARS) { g.fillStyle = `rgba(235,235,255,${0.25 + 0.3 * (0.5 + 0.5 * Math.sin(t * 3 + ph))})`; g.fillRect(x, y, s, s); }
  aurora(t);
  cam(0.25); g.drawImage(FAR, 0, 0); glow(540, 900, 280, '150,255,220', 0.06); g.drawImage(CATHEDRAL, 0, 0);
  cam(0.45); g.drawImage(NEAR, 0, 0);
  cam(0.7); g.drawImage(ROOF, 0, 0); rings(t); g.drawImage(MAST, 0, 0);
  const on = t >= T_ON; if (on) { const p = 0.7 + 0.3 * Math.sin(t * 7); glow(MX, MTOP - 10, 110, '255,50,40', 0.55 * p); g.fillStyle = '#ff5544'; g.beginPath(); g.arc(MX, MTOP - 10, 11, 0, TAU); g.fill(); }
  else { g.fillStyle = '#5a1a1a'; g.beginPath(); g.arc(MX, MTOP - 10, 10, 0, TAU); g.fill(); }
  onair(t); cam(0.9); toko(t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  // the finish: a vignette and grain (the lettering sits over the vignette, under the grain)
  const vg = g.createRadialGradient(540, 1100, 500, 540, 1000, 1350); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.55)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  lettering(t);
  g.save(); g.globalAlpha = 0.045; g.globalCompositeOperation = 'overlay'; const ox = Math.floor(t * 97) % 512, oy = Math.floor(t * 61) % 512;
  for (let x = -ox; x < W; x += 512) for (let y = -oy; y < H; y += 512) g.drawImage(GRAIN, x, y); g.restore();
  // the first frames come up out of black, as the old ident did
  const fin = clamp(t / 0.25); if (fin < 1) { g.fillStyle = `rgba(0,0,0,${1 - fin})`; g.fillRect(0, 0, W, H); }
  return out;
}
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { end: DUR, on: T_ON, rings: RINGS, chord: T_CHORD }, report: { look: 'signoff v2' },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); }, still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
