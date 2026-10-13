// LINO-NOIR A · The last tram. Hopper's lit window band across a dark street — the
// only warm thing in the frame — with the passengers as dark shapes against it and
// its light lying broken on the wet road. One person waits at the stop in front of
// it, head against the light: the magenta mask is the only colour that isn't autumn.
// Painted flat (test 1), then carved over (test 2) — see LN.cut.
SCENES['ln_tram'] = (() => {
  const { C, W, H, TAU, gouge, leaf, cut, face, glints } = LN, { clamp, lerp } = U;
  const WY0 = 880, WY1 = 1060, MULL = 170, FX = 290, FY = 1070;
  const P_ = { sky0: '#33443b', sky1: '#7c8668', flats: '#6b604a', flatsD: '#4f4636', lit: '#f4b848', tram: '#5d8466', roof: '#a49f80', street: '#5c4c3a', reflect: '#c8913c', coat: '#3a2f25', dark: '#20190f' };
  const passengers = [[140, 0], [420, 1], [520, 0], [760, 1], [1000, 0]];
  const inCoat = (x, y) => y > FY && Math.abs(x - FX) < 170 + (y - FY) * 0.04;
  return {
    draw(c, lt) {
      const slide = -lt * 26, wrap = (x) => ((x % (W + 200)) + W + 200) % (W + 200) - 100;
      cut(c, lt, {
        seed: 3,
        angle: (x, y) => (inCoat(x, y) ? Math.PI / 2 + 0.06 : y > 1220 ? 0.02 * Math.sin(x * 0.02) : 0.05 * Math.sin(x * 0.008 + y * 0.03)),
        paint: (g) => {
          const sk = g.createLinearGradient(0, 0, 0, 820); sk.addColorStop(0, P_.sky0); sk.addColorStop(1, P_.sky1); g.fillStyle = sk; g.fillRect(0, 0, W, 820);
          // the flats: two blocks, the lit windows few and bright
          g.fillStyle = P_.flatsD; g.fillRect(0, 180, 470, 640); g.fillStyle = P_.flats; g.fillRect(470, 300, 610, 520);
          const r = U.rng(4); g.fillStyle = P_.lit; for (let i = 0; i < 30; i++) { const x = 40 + (i % 8) * 130, y = 240 + Math.floor(i / 8) * 140; if (r() < 0.32 && !(x > 820 && y < 600)) g.fillRect(x, y, 46, 64); }
          // the lamp and the halo it makes in the drizzle
          const lh = g.createRadialGradient(880, 520, 0, 880, 520, 260); lh.addColorStop(0, 'rgba(250,210,130,.9)'); lh.addColorStop(1, 'rgba(250,210,130,0)'); g.fillStyle = lh; g.fillRect(620, 260, 520, 520);
          g.fillStyle = P_.dark; g.fillRect(872, 540, 16, 300);
          // the tram: roof, the lit band with passengers and mullions, the green body, the destination board
          g.fillStyle = P_.roof; g.fillRect(0, 822, W, 52);
          g.fillStyle = P_.lit; g.fillRect(0, WY0, W, WY1 - WY0);
          g.fillStyle = P_.dark; for (let x = slide % MULL - MULL; x < W + MULL; x += MULL) g.fillRect(x, WY0, 26, WY1 - WY0);
          for (const [px, k] of passengers) { const x = wrap(px + slide); g.beginPath(); g.arc(x, WY1 - 120 - k * 14, 34, 0, TAU); g.fill(); g.beginPath(); g.roundRect(x - 62, WY1 - 84 - k * 14, 124, 120, 30); g.fill(); }
          g.fillStyle = P_.tram; g.fillRect(0, WY1, W, 150);
          g.fillStyle = P_.lit; g.fillRect(700 + slide * 0.2, 1100, 240, 60); g.fillStyle = P_.dark; g.font = '44px "ArchivoBlack-400"'; g.fillText('KALLIO 3', 716 + slide * 0.2, 1146);
          g.fillStyle = P_.dark; g.fillRect(0, 1210, W, 18);
          // the wet street, and the band's light lying on it in columns
          g.fillStyle = P_.street; g.fillRect(0, 1228, W, H - 1228);
          for (let x = slide % MULL - MULL; x < W + MULL; x += MULL) { const gr = g.createLinearGradient(0, 1230, 0, 1800); gr.addColorStop(0, P_.reflect); gr.addColorStop(1, 'rgba(200,145,60,0)'); g.fillStyle = gr; g.fillRect(x + 36, 1230, MULL - 72, 570); }
          // the wet road breaks them: dark streaks across, wider further down
          g.fillStyle = P_.street; const rs = U.rng(12); for (let y = 1250; y < 1820; y += 18) for (let x = -20; x < W; x += 60 + rs() * 80) g.fillRect(x, y + Math.sin(lt * 6 + x) * 2, 30 + rs() * 50, 3 + (y - 1250) / 90);
          // the waiting figure: a dark coat, its edge on the light side caught by the tram
          // the waiting figure: collar, sloping shoulders, arms down, a coat that widens to the hem
          g.fillStyle = P_.coat; g.beginPath(); g.moveTo(FX - 46, FY + 10); g.lineTo(FX + 46, FY + 10); g.quadraticCurveTo(FX + 130, FY + 40, FX + 156, FY + 110); g.lineTo(FX + 176, H); g.lineTo(FX - 176, H); g.lineTo(FX - 156, FY + 110); g.quadraticCurveTo(FX - 130, FY + 40, FX - 46, FY + 10); g.closePath(); g.fill();
          g.fillStyle = '#7a3a22'; g.beginPath(); g.moveTo(FX - 60, FY + 4); g.quadraticCurveTo(FX, FY + 44, FX + 60, FY + 4); g.lineTo(FX + 64, FY + 40); g.quadraticCurveTo(FX, FY + 84, FX - 64, FY + 40); g.closePath(); g.fill();   // a rust scarf
          g.fillStyle = '#a07e46'; g.beginPath(); g.moveTo(FX + 120, FY + 52); g.quadraticCurveTo(FX + 150, FY + 80, FX + 158, FY + 130); g.lineTo(FX + 178, H); g.lineTo(FX + 160, H); g.lineTo(FX + 140, FY + 140); g.closePath(); g.fill();   // the tram's light on its edge
          g.strokeStyle = '#2a2219'; g.lineWidth = 6; g.beginPath(); g.moveTo(FX + 100, FY + 150); g.lineTo(FX + 112, H); g.moveTo(FX - 100, FY + 150); g.lineTo(FX - 112, H); g.stroke();   // the arms against the coat
        },
        top: (c, lt) => {
          // leaves in rust, falling and fallen; the mask; the drizzle as glints
          c.fillStyle = C.rust; c.beginPath(); const r = U.rng(9);
          for (let i = 0; i < 18; i++) leaf(c, r() * W, 1800 + r() * 90, 1 + r(), r() * 6);
          for (let i = 0; i < 8; i++) { const x = r() * W + Math.sin(lt * 1.5 + i) * 50, y = ((lt * 120 + r() * 2000) % 2000) - 50; leaf(c, x, y, 1.3, lt * 2 + i); }
          c.fill();
          face(c, FX, FY - 50 + Math.sin(lt * 1.7) * 3, 82, Math.sin(lt * 0.8) * 0.04);
          glints(c, lt, 120, 0.16, 1500, 31);
          c.fillStyle = 'rgba(230,215,180,.5)'; c.font = '30px "Caveat-600"'; c.fillText('A · 4/30   "Viimeinen ratikka"', 70, H - 30);
        },
      });
    },
  };
})();
