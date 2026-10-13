// LINO-NOIR C · The bakery window. Test 4's scene turned round: we stand in the dark
// street and the shop is the light — Hopper's Nighthawks window — cakes standing on
// the shelf as dark shapes against the glow, the shop's light spilled on the wet
// pavement. One figure stands at the window and has turned round to us — the magenta
// mask against the light. Leaves blow along the pavement. Painted flat, then carved.
SCENES['ln_window'] = (() => {
  const { C, W, H, TAU, leaf, cut, face, glints } = LN, { clamp, lerp } = U;
  const X0 = 110, X1 = 970, Y0 = 560, Y1 = 1300, FX = 560, FY = 1330;
  const P_ = { wall: '#6e5644', wallD: '#4f3e31', lit: '#f4b848', litD: '#d89a3a', dark: '#20190f', pave: '#5a4a38', spill: '#c9953f', coat: '#3a2f25', rim: '#c79a4c', awning: '#6b2c1a' };
  const cake = (g, x, y, s) => { g.fillRect(x - 70 * s, y - 60 * s, 140 * s, 60 * s); g.fillRect(x - 46 * s, y - 104 * s, 92 * s, 46 * s); g.beginPath(); g.arc(x, y - 116 * s, 13 * s, 0, TAU); g.fill(); g.fillRect(x - 6 * s, y, 12 * s, 26 * s); g.fillRect(x - 52 * s, y + 24 * s, 104 * s, 8 * s); };
  const inCoat = (x, y) => y > FY && Math.abs(x - FX) < 240;
  return {
    draw(c, lt) {
      cut(c, lt, {
        seed: 7,
        angle: (x, y) => (inCoat(x, y) ? Math.PI / 2 + 0.05 : 0.03 * Math.sin(x * 0.01 + y * 0.04)),
        paint: (g) => {
          // the facade, lighter near the window where its glow reaches
          g.fillStyle = P_.wallD; g.fillRect(0, 0, W, 1420);
          const wg = g.createRadialGradient(540, 930, 100, 540, 930, 900); wg.addColorStop(0, P_.wall); wg.addColorStop(1, 'rgba(110,86,68,0)'); g.fillStyle = wg; g.fillRect(0, 0, W, 1420);
          g.fillStyle = P_.awning; g.fillRect(X0 - 60, Y0 - 120, X1 - X0 + 120, 80);
          // the sign over the window
          g.fillStyle = P_.lit; g.fillRect(380, 200, 320, 110); g.fillStyle = P_.dark; g.font = '58px "PlayfairDisplay-700"'; g.textAlign = 'center'; g.fillText('LEIPOMO', 540, 276); g.textAlign = 'left';
          // the window: light, falling off toward the bottom; shelves, cakes, loaves, mullion, frame
          const lg = g.createLinearGradient(0, Y0, 0, Y1); lg.addColorStop(0, P_.lit); lg.addColorStop(1, P_.litD); g.fillStyle = lg; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
          g.fillStyle = P_.dark; g.fillRect(X0, 1040, X1 - X0, 20);
          for (const [x, s] of [[230, 0.9], [400, 1.1], [690, 1.0], [860, 0.85]]) cake(g, x, 1040, s);
          g.fillRect(X0, 1180, X1 - X0, 14); for (const x of [180, 300, 760, 900]) { g.beginPath(); g.ellipse(x, 1172, 44, 16, 0, 0, TAU); g.fill(); }
          g.fillRect(535, Y0, 14, Y1 - Y0); g.fillRect(X0 - 20, Y0, 20, Y1 - Y0); g.fillRect(X1, Y0, 20, Y1 - Y0); g.fillRect(X0 - 20, Y1, X1 - X0 + 40, 30);
          g.fillStyle = '#f6ecd4'; g.fillRect(620, 1110, 120, 50); g.fillStyle = P_.dark; g.font = '34px "Anton-400"'; g.fillText('€249', 632, 1148);
          // the pavement, and the window's light spilled across it
          g.fillStyle = P_.pave; g.fillRect(0, 1330, W, H - 1330);
          const sp = g.createLinearGradient(0, 1330, 0, 1800); sp.addColorStop(0, P_.spill); sp.addColorStop(1, 'rgba(201,149,63,0)'); g.fillStyle = sp; g.beginPath(); g.moveTo(X0, 1330); g.lineTo(X1, 1330); g.lineTo(X1 + 160, 1800); g.lineTo(X0 - 160, 1800); g.closePath(); g.fill();
          const rs = U.rng(12); g.fillStyle = P_.pave; for (let y = 1350; y < 1820; y += 18) for (let x = -20; x < W; x += 60 + rs() * 80) g.fillRect(x, y + Math.sin(lt * 6 + x) * 2, 30 + rs() * 50, 3 + (y - 1350) / 90);
          // the figure at the window, turned to us: dark against the light, rimmed on both shoulders
          g.fillStyle = P_.coat; g.beginPath(); g.moveTo(FX - 50, FY + 10); g.lineTo(FX + 50, FY + 10); g.quadraticCurveTo(FX + 170, FY + 50, FX + 200, FY + 140); g.lineTo(FX + 226, H); g.lineTo(FX - 226, H); g.lineTo(FX - 200, FY + 140); g.quadraticCurveTo(FX - 170, FY + 50, FX - 50, FY + 10); g.closePath(); g.fill();
          g.strokeStyle = P_.rim; g.lineWidth = 12; g.lineCap = 'round'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(FX + sd * 60, FY + 14); g.quadraticCurveTo(FX + sd * 168, FY + 52, FX + sd * 196, FY + 140); g.lineTo(FX + sd * 222, H - 40); g.stroke(); }
          g.fillStyle = '#7a3a22'; g.beginPath(); g.moveTo(FX - 64, FY + 4); g.quadraticCurveTo(FX, FY + 44, FX + 64, FY + 4); g.lineTo(FX + 68, FY + 40); g.quadraticCurveTo(FX, FY + 86, FX - 68, FY + 40); g.closePath(); g.fill();
        },
        top: (c, lt) => {
          c.fillStyle = C.rust; c.beginPath(); const r = U.rng(13);
          for (let i = 0; i < 14; i++) { const x = ((r() * W + lt * 160 * (0.6 + r())) % (W + 200)) - 100, y = 1560 + r() * 300 + Math.sin(lt * 4 + i) * 10; leaf(c, x, y, 1.1 + r() * 0.8, lt * 3 + i); }
          c.fill();
          face(c, FX, FY - 70 + Math.sin(lt * 1.5) * 3, 100, Math.sin(lt * 0.7) * 0.04);
          glints(c, lt, 110, 0.15, 1400, 51);
          c.fillStyle = 'rgba(230,215,180,.5)'; c.font = '30px "Caveat-600"'; c.fillText('C · 2/30   "Ikkuna"', 70, H - 30);
        },
      });
    },
  };
})();
