// STYLE 3 — pressed-clay relief.
//
// Plasticine smeared flat onto a board with the thumb, built up thicker where
// the figures are, and photographed straight on under one low raking lamp so
// every drag of the finger throws a ridge of shadow. A bold, flat, graphic
// picture — the only real light in it is the bot's LED, an actual bulb pushed
// through the clay.

import { Relief, hex, mixc, tokoPath, fbm } from './lib/relief.js';

const P = {
  wall: '#17221b', wall2: '#1f2e25', frame: '#c8ad74', frameD: '#a88c55',
  sky0: '#0f1a36', sky1: '#1e2a4c', sky2: '#3a3a58', sky3: '#8a6038',
  city: '#101814', city2: '#18231e', lit: '#e9a536', lit2: '#f4c869',
  dome: '#23423a', domeHi: '#3f6b5c', rain: '#9cb2d4',
  sill: '#c8ad74', cushion: '#4c211b', cushion2: '#5e2a22', rad: '#222c25',
  jumper: '#a8782c', jumperD: '#80591f', trousers: '#3a3a44', socks: '#a5672c',
  hair: '#3a2519', hat: '#264233', hatCuff: '#a8782c', pompom: '#e2d2ac',
  mask: '#e2037f', face: '#f6eedb', strap: '#121010',
  toy: '#e4dac4', toyD: '#c9bc9f', eye: '#15100d', cheek: '#d98a7c', ledRing: '#494542', cyan: '#7ff0ff',
  skin: '#d39c80', lampShade: '#e8b24a', lampBase: '#2a2622',
};

function boot2d(build) {
  (async () => {
    try {
      const q = new URLSearchParams(location.search), ss = Number(q.get('ss') || 1);
      const t0 = performance.now();
      const img = await build(ss);
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').putImageData(img, 0, 0);
      document.body.appendChild(c); c.style.width = '100%';
      console.log(`relief ${((performance.now() - t0) / 1000).toFixed(1)}s`);
      window.__png = c.toDataURL('image/png'); window.__done = true;
    } catch (e) { window.__err = (e && e.stack) || String(e); }
  })();
}

const lerpStops = (stops, t) => {
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i], [b, cb] = stops[i + 1];
    if (t <= b) return mixc(hex(ca), hex(cb), Math.max(0, (t - a) / (b - a)));
  }
  return hex(stops[stops.length - 1][1]);
};

boot2d(async (ss) => {
  const R = new Relief(ss);
  const TAU = Math.PI * 2;
  const arch = (g, x0, x1, ySpring, yBot, inset = 0, fresh = true) => {
    const cx = (x0 + x1) / 2, r = (x1 - x0) / 2 - inset;
    if (fresh) g.beginPath();
    g.moveTo(x0 + inset, yBot - inset); g.lineTo(x0 + inset, ySpring); g.arc(cx, ySpring, r, Math.PI, 0); g.lineTo(x1 - inset, yBot - inset); g.closePath();
  };
  const WX0 = 140, WX1 = 940, SPR = 610, WB = 1270, WC = 540;

  // ---- the board: the wall, smeared on the diagonal
  R.press({ draw: g => g.fillRect(0, 0, 1080, 1920), bbox: [0, 0, 1080, 1920], color: P.wall, base: 0, relief: 0, noiseVar: 0.18, noiseF: 0.006, seed: 1,
    colorAt: (x, y) => mixc(hex(P.wall), hex(P.wall2), 0.5 + 0.5 * fbm(x * 0.004, y * 0.004, 4)),
    strokes: { len: 210, w: 30, amp: 1.1, dir: (x, y) => -0.5 + 0.18 * Math.sin(y * 0.004 + x * 0.003), both: true, jitter: 0.08, colorVar: 0.14, ridges: 7, density: 1.4 } });
  // the lamp's warmth on the wall, as the clay would show it: ochre worked into the green
  R.glow(1040, 1060, 430, '#7a5a26', 0.55);

  // ---- outside: sky in horizontal drags, graded by hand from night to the sodium horizon
  const skyAt = (x, y) => lerpStops([[200, P.sky0], [560, P.sky1], [860, P.sky2], [1060, P.sky3], [1200, '#6a4a32']], y);
  R.press({ draw: g => { arch(g, WX0, WX1, SPR, WB); g.fill(); }, bbox: [WX0, 200, WX1, WB], colorAt: skyAt, base: 2, relief: 2, round: 6, noiseVar: 0.06, seed: 2,
    strokes: { len: 150, w: 18, amp: 2.4, dir: (x, y) => 0.06 * Math.sin(y * 0.02 + x * 0.004), both: true, jitter: 0.08, colorVar: 0.07, ridges: 5, density: 1.5, tint: (x, y, r) => skyAt(x, y + (r() - 0.5) * 60) } });
  // far roofs and the near block, with the cathedral rising between them
  R.press({ draw: g => {
      g.beginPath(); g.moveTo(WX0, WB);
      const tops = [[140, 1010], [200, 1010], [200, 985], [262, 985], [262, 1020], [330, 1020], [330, 970], [350, 950], [370, 970], [420, 970], [420, 1000], [560, 1000], [560, 990], [600, 990], [600, 1012], [700, 1012], [940, 1012]];
      for (const [x, y] of tops) g.lineTo(x, y);
      g.lineTo(WX1, WB); g.closePath(); g.fill();
    }, bbox: [WX0, 940, WX1, WB], color: P.city2, base: 5, relief: 2, round: 4, seed: 3,
    strokes: { len: 50, w: 12, amp: 2, dir: () => Math.PI / 2, both: true, colorVar: 0.12, density: 1.2 } });
  // the dome: drum, colonnade, copper, lantern
  const DX = 780, DY = 960;
  R.press({ draw: g => {
      g.fillRect(DX - 74, DY - 70, 148, 90);                         // drum
      g.beginPath(); g.ellipse(DX, DY - 70, 82, 92, 0, Math.PI, 0); g.fill();   // dome
      g.fillRect(DX - 14, DY - 186, 28, 30); g.beginPath(); g.ellipse(DX, DY - 186, 17, 18, 0, Math.PI, 0); g.fill();
      g.fillRect(DX - 2.5, DY - 228, 5, 26); g.fillRect(DX - 9, DY - 220, 18, 4);
      for (const sx of [-1, 1]) { g.fillRect(DX + sx * 150 - 26, DY - 20, 52, 50); g.beginPath(); g.ellipse(DX + sx * 150, DY - 20, 27, 34, 0, Math.PI, 0); g.fill(); }
      g.fillRect(DX - 190, DY + 10, 380, 60);
    }, bbox: [DX - 190, DY - 230, DX + 190, DY + 80], color: P.dome, base: 7, relief: 6, round: 14, seed: 4,
    colorAt: (x, y) => (y < DY - 72 || (Math.abs(x - DX) > 120 && y < DY)) ? mixc(hex(P.dome), hex(P.domeHi), 0.35 + 0.4 * Math.max(0, (DX - x) / 90)) : hex('#1f2b29'),
    strokes: { len: 60, w: 12, amp: 2.4, dir: (x, y) => y < DY - 70 ? Math.atan2(y - (DY - 70), x - DX) + Math.PI / 2 : Math.PI / 2, colorVar: 0.1, density: 1.6 } });
  // the drum's columns: vertical ridges of lighter clay
  for (let i = 0; i < 9; i++) { const x = DX - 64 + i * 16; R.press({ draw: g => g.fillRect(x - 3, DY - 66, 6, 70), bbox: [x - 4, DY - 70, x + 4, DY + 6], color: '#2f4640', base: 12, relief: 2, round: 2, seed: 40 + i }); }
  // the near block across the street
  R.press({ draw: g => {
      g.beginPath(); g.moveTo(WX0, WB);
      const tops = [[140, 1090], [250, 1090], [250, 1060], [270, 1040], [290, 1060], [470, 1060], [470, 1085], [610, 1085], [610, 1075], [660, 1075], [660, 1100], [940, 1100]];
      for (const [x, y] of tops) g.lineTo(x, y);
      g.lineTo(WX1, WB); g.closePath(); g.fill();
    }, bbox: [WX0, 1030, WX1, WB], color: P.city, base: 9, relief: 3, round: 5, seed: 5,
    strokes: { len: 44, w: 12, amp: 2.2, dir: () => Math.PI / 2, both: true, colorVar: 0.1, density: 1.2 } });
  // lit windows: thumb dabs of ochre, a few lamps on, most off
  {
    const r = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (const [x0, x1, y0, y1, base] of [[150, 930, 1105, 1260, 12], [210, 330, 1000, 1080, 8], [430, 560, 1012, 1080, 8]]) {
      for (let y = y0; y < y1; y += 34) for (let x = x0; x < x1; x += 30) {
        if (r() > 0.3) continue;
        const c = r() < 0.6 ? P.lit : P.lit2, xx = x + r() * 6, yy = y + r() * 4;
        R.press({ draw: g => { g.beginPath(); g.roundRect(xx, yy, 13, 19, 4); g.fill(); }, bbox: [xx - 2, yy - 2, xx + 15, yy + 21], color: c, base: base + 2, relief: 2.5, round: 3, seed: 100 + (x * 7 + y) % 997,
          emit: hex(c).map(v => v * 0.35) });
      }
    }
  }
  // tram wires, pressed thin
  for (const [y0, y1] of [[900, 840], [930, 872]]) R.press({ draw: g => { g.lineWidth = 3.5; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(WX0, y0); g.lineTo(WX1, y1); g.stroke(); }, bbox: [WX0, Math.min(y0, y1) - 6, WX1, Math.max(y0, y1) + 6], color: '#0d1210', base: 12, relief: 1.5, round: 2, seed: 7 });
  // rain: steep thin drags of pale blue across the whole view
  R.press({ draw: g => { arch(g, WX0, WX1, SPR, WB); g.fill(); }, bbox: [WX0, 200, WX1, WB], color: P.rain, fill: false, seed: 8, noiseVar: 0,
    strokes: { len: 52, w: 2.4, amp: 2.2, dir: () => 1.83, jitter: 0.03, colorVar: 0.15, ridges: 1, n: 330, press: 0.9, opacity: 0.5 } });
  // the drops sitting on the glass: beads of clear-ish clay
  {
    let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40; i++) {
      const x = WX0 + 30 + r() * (WX1 - WX0 - 60), y = 260 + r() * 960, rad = 3 + r() * r() * 9;
      if (y < SPR && Math.hypot(x - WC, y - SPR) > 380) continue;
      R.press({ draw: g => { g.beginPath(); g.ellipse(x, y, rad, rad * 1.15, 0, 0, TAU); g.fill(); }, bbox: [x - rad - 2, y - rad * 1.2 - 2, x + rad + 2, y + rad * 1.2 + 2], colorAt: (xx, yy) => mixc(skyAt(xx, yy - 80), [1, 1, 1], 0.25), base: 14, relief: rad * 0.6, round: rad, seed: 200 + i, spec: 3 });
    }
  }

  // ---- the window frame: an arch with a sunburst fanlight, rolled ochre clay
  const frameDir = (x, y) => (y < SPR ? Math.atan2(y - SPR, x - WC) + Math.PI / 2 : Math.PI / 2);
  R.press({ draw: g => { arch(g, WX0 - 36, WX1 + 36, SPR, WB + 30); arch(g, WX0, WX1, SPR, WB, 0, false); g.fill('evenodd'); }, bbox: [WX0 - 40, 160, WX1 + 40, WB + 34],
    color: P.frame, base: 6, relief: 16, round: 18, seed: 9, noiseVar: 0.1,
    strokes: { len: 80, w: 16, amp: 3, dir: frameDir, both: true, colorVar: 0.1, ridges: 5, density: 1.7, tint: (x, y, r, c) => (r() < 0.3 ? hex(P.frameD) : c) } });
  // transom, mullion and the fanlight's spokes
  let bw = 3; const wob = () => ((bw = (bw * 16807) % 2147483647) / 2147483647 - 0.5);
  const bar = (x0, y0, x1, y1, w) => R.press({ draw: g => { g.lineWidth = w; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(x0, y0);
      const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1; let px = x0, py = y0;
      for (let k = 1; k <= 4; k++) { const t = k / 4, o = k < 4 ? wob() * w * 0.5 : 0; const qx = x0 + (x1 - x0) * t + nx / nl * o, qy = y0 + (y1 - y0) * t + ny / nl * o; g.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2); px = qx; py = qy; }
      g.lineTo(x1, y1); g.stroke(); },
    bbox: [Math.min(x0, x1) - w, Math.min(y0, y1) - w, Math.max(x0, x1) + w, Math.max(y0, y1) + w], color: P.frame, base: 6, relief: 13, round: w * 0.5, seed: 10 + x0 + y0,
    strokes: { len: 70, w: w * 0.45, amp: 2.4, dir: () => Math.atan2(y1 - y0, x1 - x0), both: true, colorVar: 0.1, density: 2 } });
  bar(WX0, SPR, WX1, SPR, 26);
  bar(WC, SPR, WC, WB, 22);
  for (const a of [-0.2, -0.6, -1.0, -1.5708, -2.14, -2.54, -2.94]) bar(WC, SPR, WC + Math.cos(a) * 395, SPR + Math.sin(a) * 395, 16);
  R.press({ draw: g => { g.beginPath(); g.arc(WC, SPR, 62, Math.PI, 0); g.closePath(); g.fill(); }, bbox: [WC - 64, SPR - 64, WC + 64, SPR + 2], color: P.frame, base: 8, relief: 13, round: 16, seed: 11,
    strokes: { len: 40, w: 10, amp: 2.5, dir: (x, y) => Math.atan2(y - SPR, x - WC) + Math.PI / 2, colorVar: 0.1, density: 2 } });

  // ---- the sill, the cushion, the radiator under them
  R.press({ draw: g => { g.beginPath(); g.roundRect(90, WB + 6, 900, 54, 10); g.fill(); }, bbox: [86, WB, 994, WB + 64], color: P.sill, base: 8, relief: 16, round: 16, seed: 12,
    strokes: { len: 110, w: 14, amp: 2.6, dir: () => 0, both: true, colorVar: 0.1, density: 1.6 } });
  R.press({ draw: g => { g.beginPath(); g.roundRect(104, WB + 54, 872, 128, 40); g.fill(); }, bbox: [100, WB + 50, 980, WB + 186], color: P.cushion, base: 10, relief: 22, round: 36, seed: 13,
    strokes: { len: 100, w: 18, amp: 3, dir: (x, y) => 0.12 * Math.sin(x * 0.01), both: true, colorVar: 0.1, density: 1.6, tint: (x, y, r, c) => (r() < 0.35 ? hex(P.cushion2) : c) } });
  for (let i = 0; i < 12; i++) { const x = 170 + i * 64; R.press({ draw: g => { g.beginPath(); g.roundRect(x, 1500, 40, 330, 18); g.fill(); }, bbox: [x - 2, 1496, x + 42, 1834], color: P.rad, base: 4, relief: 14, round: 18, seed: 300 + i,
    strokes: { len: 90, w: 10, amp: 2, dir: () => Math.PI / 2, both: true, colorVar: 0.12, density: 1.4 } }); }

  // ---- the lamp at the right edge: shade glowing, a halo dragged out of it
  R.press({ draw: g => { g.fillRect(1010, 1100, 16, 180); g.beginPath(); g.ellipse(1018, 1278, 60, 12, 0, 0, TAU); g.fill(); }, bbox: [950, 1095, 1080, 1295], color: P.lampBase, base: 10, relief: 12, round: 8, seed: 14 });
  R.press({ draw: g => { g.beginPath(); g.moveTo(930, 1120); g.lineTo(1100, 1120); g.lineTo(1100, 960); g.lineTo(980, 960); g.closePath(); g.fill(); }, bbox: [925, 955, 1080, 1125],
    color: P.lampShade, base: 10, relief: 20, round: 22, seed: 15, emit: [0.55, 0.32, 0.08],
    strokes: { len: 70, w: 12, amp: 2.6, dir: () => Math.PI / 2 + 0.2, both: true, colorVar: 0.12, density: 1.8, tint: (x, y, r) => mixc(hex('#f7d27a'), hex(P.lampShade), r()) } });

  // ---- the child: legs over the cushion edge
  for (const [x0, x1] of [[425, 404], [522, 540]]) {
    R.press({ draw: g => { g.lineWidth = 64; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(x0, 1400); g.quadraticCurveTo((x0 + x1) / 2, 1480, x1, 1600); g.stroke(); }, bbox: [Math.min(x0, x1) - 40, 1360, Math.max(x0, x1) + 40, 1640],
      color: P.trousers, base: 22, relief: 18, round: 30, seed: 16 + x0, strokes: { len: 60, w: 12, amp: 2.4, dir: () => Math.PI / 2, both: true, colorVar: 0.12, density: 1.6 } });
    R.press({ draw: g => { g.beginPath(); g.ellipse(x1 + (x1 < 480 ? -8 : 8), 1640, 42, 50, x1 < 480 ? 0.3 : -0.3, 0, TAU); g.fill(); }, bbox: [x1 - 60, 1580, x1 + 60, 1700],
      color: P.socks, base: 24, relief: 18, round: 26, seed: 18 + x0, strokes: { len: 40, w: 10, amp: 2.4, dir: (x, y) => Math.atan2(y - 1640, x - x1) + Math.PI / 2, colorVar: 0.1, density: 2 } });
  }
  // the slumped body in its jumper
  const HX = 458, HY = 1062;
  R.press({ draw: g => {
      g.beginPath(); g.moveTo(296, 1442); g.bezierCurveTo(262, 1360, 268, 1262, 318, 1222); g.bezierCurveTo(360, 1172, 420, 1150, 470, 1150);
      g.bezierCurveTo(540, 1150, 600, 1180, 630, 1236); g.bezierCurveTo(664, 1290, 670, 1370, 646, 1444); g.closePath(); g.fill();
    }, bbox: [260, 1130, 680, 1450], color: P.jumper, base: 24, relief: 30, round: 60, seed: 19,
    strokes: { len: 70, w: 14, amp: 3, dir: (x) => Math.PI / 2 + (x - 466) * 0.0025, both: true, colorVar: 0.1, density: 1.8, tint: (x, y, r, c) => (r() < 0.25 ? hex(P.jumperD) : c) } });
  // the toy, leaning out cheerily
  const TX = 506, TY = 1282, TRX = 116, TRY = 106, TROT = 0.2;
  R.press({ draw: g => {
      g.beginPath(); g.ellipse(TX, TY, TRX, TRY, TROT, 0, TAU); g.fill();
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(TX + sx * 62 + 18, TY - 92 + sx * 10, 26, 34, TROT + sx * 0.5, 0, TAU); g.fill(); }
    }, bbox: [TX - TRX - 20, TY - TRY - 50, TX + TRX + 20, TY + TRY + 10], color: P.toy, base: 34, relief: 26, round: 70, seed: 20,
    colorAt: (x, y) => mixc(hex(P.toy), hex(P.toyD), Math.max(0, Math.min(1, (Math.hypot(x - TX, y - TY) - 60) / 70)) * 0.6),
    strokes: { len: 50, w: 12, amp: 2.6, dir: (x, y) => Math.atan2(y - TY, x - TX) + Math.PI / 2, colorVar: 0.06, density: 2 } });
  // antenna and bobble, out to the right
  R.press({ draw: g => { g.lineWidth = 7; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(TX + 80, TY - 60); g.quadraticCurveTo(TX + 120, TY - 100, TX + 158, TY - 98); g.stroke(); }, bbox: [TX + 70, TY - 112, TX + 166, TY - 50], color: '#2a2624', base: 50, relief: 4, round: 4, seed: 21 });
  R.press({ draw: g => { g.beginPath(); g.arc(TX + 162, TY - 98, 15, 0, TAU); g.fill(); }, bbox: [TX + 145, TY - 115, TX + 180, TY - 80], color: '#d0662e', base: 50, relief: 10, round: 14, seed: 22 });
  // face: bead eyes, a pressed smile, cheeks
  const rot = (x, y) => [TX + (x - TX) * Math.cos(TROT) - (y - TY) * Math.sin(TROT), TY + (x - TX) * Math.sin(TROT) + (y - TY) * Math.cos(TROT)];
  for (const ex of [-34, 34]) { const [x, y] = rot(TX + ex, TY - 36); R.press({ draw: g => { g.beginPath(); g.ellipse(x, y, 11, 14, TROT, 0, TAU); g.fill(); }, bbox: [x - 16, y - 18, x + 16, y + 18], color: P.eye, base: 60, relief: 6, round: 8, seed: 23 + ex, spec: 4 }); }
  for (const ex of [-58, 58]) { const [x, y] = rot(TX + ex, TY - 12); R.press({ draw: g => { g.beginPath(); g.ellipse(x, y, 13, 8, TROT, 0, TAU); g.fill(); }, bbox: [x - 16, y - 12, x + 16, y + 12], color: P.cheek, base: 58, relief: 2, round: 6, seed: 25 + ex }); }
  R.press({ draw: g => { g.lineWidth = 6; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.save(); g.translate(TX, TY); g.rotate(TROT); g.beginPath(); g.arc(0, -22, 30, 0.35, Math.PI - 0.35); g.stroke(); g.restore(); }, bbox: [TX - 50, TY - 20, TX + 50, TY + 30], color: '#2a1c16', base: 59, relief: 2, round: 3, seed: 27 });
  // the LED: a ring of grey clay, and the real bulb in it
  const [LX, LY] = rot(TX, TY + 32);
  R.glow(LX / 1, LY / 1, 120, '#9cf6ff', 0.55);
  R.press({ draw: g => { g.beginPath(); g.arc(LX, LY, 25, 0, TAU); g.arc(LX, LY, 14, 0, TAU, true); g.fill(); }, bbox: [LX - 28, LY - 28, LX + 28, LY + 28], color: P.ledRing, base: 60, relief: 6, round: 5, seed: 28 });
  R.press({ draw: g => { g.beginPath(); g.arc(LX, LY, 14, 0, TAU); g.fill(); }, bbox: [LX - 16, LY - 16, LX + 16, LY + 16], color: '#dffcff', base: 62, relief: 7, round: 12, seed: 29, emit: [2.4, 6.5, 7.5], spec: 3 });

  // the arms wrapping round it, mitts on its tummy
  for (const sx of [-1, 1]) {
    R.press({ draw: g => { g.lineWidth = 60; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.beginPath();
        if (sx < 0) { g.moveTo(336, 1205); g.quadraticCurveTo(318, 1330, 400, 1366); } else { g.moveTo(612, 1215); g.quadraticCurveTo(642, 1340, 580, 1372); }
        g.stroke(); }, bbox: sx < 0 ? [270, 1170, 440, 1400] : [540, 1180, 680, 1410], color: P.jumper, base: 40, relief: 18, round: 30, seed: 30 + sx,
      strokes: { len: 50, w: 10, amp: 2.5, dir: (x, y) => Math.atan2(y - TY, x - TX) + Math.PI / 2, both: true, colorVar: 0.1, density: 2, tint: (x, y, r, c) => (r() < 0.25 ? hex(P.jumperD) : c) } });
    const [mx, my] = sx < 0 ? [420, 1366] : [566, 1374];
    R.press({ draw: g => { g.beginPath(); g.ellipse(mx, my, 32, 26, sx * 0.4, 0, TAU); g.fill(); }, bbox: [mx - 36, my - 30, mx + 36, my + 30], color: P.skin, base: 52, relief: 12, round: 22, seed: 33 + sx,
      colorAt: (x, y) => mixc(hex(P.skin), hex('#bfeaf0'), 0.25),
      strokes: { len: 24, w: 8, amp: 2, dir: () => 0.3 * sx, colorVar: 0.08, density: 2 } });
  }

  // ---- the head, drooped and tilted: hair, a beanie, the mask
  const HR = 124, HROT = -0.34;
  R.press({ draw: g => { g.beginPath(); g.ellipse(HX, HY, HR, HR * 1.02, HROT, 0, TAU); g.fill(); }, bbox: [HX - HR - 6, HY - HR - 6, HX + HR + 6, HY + HR + 6], color: P.hair, base: 34, relief: 26, round: 60, seed: 34,
    strokes: { len: 70, w: 8, amp: 3, dir: (x, y) => Math.atan2(y - (HY - 150), x - HX), colorVar: 0.18, ridges: 3, density: 2.2 } });
  // beanie: cap, ribbed cuff, pompom
  R.press({ draw: g => { g.save(); g.translate(HX, HY); g.rotate(HROT); g.beginPath(); g.ellipse(0, -62, 132, 112, 0, Math.PI, 0); g.closePath(); g.fill(); g.restore(); }, bbox: [HX - 160, HY - 200, HX + 160, HY - 30],
    color: P.hat, base: 42, relief: 20, round: 50, seed: 35, strokes: { len: 60, w: 10, amp: 2.8, dir: (x, y) => Math.atan2(y - (HY - 60), x - HX) + Math.PI / 2, both: true, colorVar: 0.12, density: 2 } });
  R.press({ draw: g => { g.save(); g.translate(HX, HY); g.rotate(HROT); g.beginPath(); g.roundRect(-140, -82, 280, 48, 22); g.fill(); g.restore(); }, bbox: [HX - 160, HY - 140, HX + 160, HY - 10],
    color: P.hatCuff, base: 50, relief: 12, round: 18, seed: 36,
    strokes: { len: 30, w: 5, amp: 3.4, dir: () => Math.PI / 2 + HROT, both: true, colorVar: 0.1, ridges: 2, density: 2.4 } });
  const [PX, PY] = [HX + Math.sin(-HROT) * 0 + 20, HY - 196];
  R.press({ draw: g => { g.beginPath(); g.arc(PX, PY, 40, 0, TAU); g.fill(); }, bbox: [PX - 44, PY - 44, PX + 44, PY + 44], color: P.pompom, base: 52, relief: 18, round: 36, seed: 37,
    strokes: { len: 22, w: 5, amp: 3, dir: (x, y, r) => r() * TAU, colorVar: 0.12, ridges: 2, density: 3 } });
  // the strap, the small red LED on it
  R.press({ draw: g => { g.save(); g.translate(HX, HY); g.rotate(HROT); g.lineWidth = 9; g.strokeStyle = '#fff'; g.beginPath(); g.ellipse(0, 22, 126, 30, 0, Math.PI * 0.08, Math.PI * 0.92, true); g.stroke(); g.restore(); },
    bbox: [HX - 150, HY - 30, HX + 150, HY + 90], color: P.strap, base: 60, relief: 3, round: 4, seed: 38 });
  const [RLX, RLY] = [HX + Math.cos(HROT) * 118 - Math.sin(HROT) * 18, HY + Math.sin(HROT) * 118 + Math.cos(HROT) * 18];
  R.press({ draw: g => { g.beginPath(); g.arc(RLX, RLY, 8, 0, TAU); g.fill(); }, bbox: [RLX - 10, RLY - 10, RLX + 10, RLY + 10], color: '#ff5040', base: 64, relief: 4, round: 6, seed: 39, emit: [4, 0.3, 0.2] });
  // the mask: a disc smoothed round and round with the thumb
  const MX = HX - 4, MY = HY + 26, MR = 104;
  R.press({ draw: g => { g.beginPath(); g.arc(MX, MY, MR, 0, TAU); g.fill(); }, bbox: [MX - MR - 4, MY - MR - 4, MX + MR + 4, MY + MR + 4], color: P.mask, base: 58, relief: 9, round: 26, seed: 40,
    colorAt: (x, y) => mixc(hex(P.mask), hex('#ff6fb8'), 0.12 * Math.max(0, 1 - Math.hypot(x - MX + 30, y - MY + 30) / 80)),
    strokes: { len: 44, w: 9, amp: 2.2, dir: (x, y) => Math.atan2(y - MY, x - MX) + Math.PI / 2, colorVar: 0.06, ridges: 4, density: 2.2 } });
  // the face: the master's outlines, pressed on in white
  const FROT = HROT * 1.1;
  const eyeC = [[MX - 38, MY - 30], [MX + 38, MY - 30]].map(([x, y]) => [MX + (x - MX) * Math.cos(FROT) - (y - MY) * Math.sin(FROT), MY + (x - MX) * Math.sin(FROT) + (y - MY) * Math.cos(FROT)]);
  R.press({ draw: g => tokoPath(g, MX, MY + 4, MR, FROT), bbox: [MX - MR, MY - MR, MX + MR, MY + MR], color: P.face, base: 66, relief: 7, round: 7, seed: 41,
    strokes: { len: 26, w: 6, amp: 1.0, press: 0.35, opacity: 0.3, dir: (x, y) => { const d0 = Math.hypot(x - eyeC[0][0], y - eyeC[0][1]), d1 = Math.hypot(x - eyeC[1][0], y - eyeC[1][1]); const [cx, cy] = y < MY - 4 ? (d0 < d1 ? eyeC[0] : eyeC[1]) : [MX, MY - 10]; return Math.atan2(y - cy, x - cx) + Math.PI / 2; }, colorVar: 0.03, ridges: 3, density: 3 } });

  return R.shade({ az: Math.PI * 1.12, el: 0.40, key: [1.35, 1.24, 1.08], amb: [0.16, 0.19, 0.27], spec: 0.13, shininess: 20, shadowLen: 180, aoRad: 26, aoAmt: 0.02, bloom: 1.0, exposure: 1.05, vignette: 0.42, grain: 0.028, fillDir: -0.3, fill: [0.06, 0.05, 0.03] });
});
